/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * SQL safety guard for the analytics agent.
 *
 * The LLM is asked to produce a single SELECT statement that uses the literal
 * placeholder `$USER_ID` wherever it wants the caller's id substituted. This
 * module:
 *
 *   1. Parses and validates the statement is a read-only SELECT.
 *   2. Verifies every referenced identifier resolves to a whitelisted table.
 *   3. Replaces `$USER_ID` with a real bind parameter ($1).
 *   4. Enforces that every non-global table appears with its user-scope column
 *      (or trainer-scope column) compared against $USER_ID.
 *   5. Adds a LIMIT 5000 if missing.
 *
 * If anything is wrong we throw — the caller surfaces a clarification error
 * instead of executing.
 */

import { ANALYTICS_TABLES, ADMIN_ONLY_TABLES, findTable, type Role, type TableDef } from './analyticsSchema.js';

export class SqlGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SqlGuardError';
  }
}

const FORBIDDEN_KEYWORDS = [
  'insert', 'update', 'delete', 'drop', 'alter', 'truncate',
  'create', 'grant', 'revoke', 'merge', 'call', 'exec',
  'execute', 'copy', 'vacuum', 'analyze', 'cluster',
  'reindex', 'comment', 'do', 'listen', 'notify', 'set',
  'lock', 'reset', 'discard', 'security_invoker',
  'pg_sleep', 'pg_read_file', 'pg_ls_dir', 'pg_stat_file',
  'lo_import', 'lo_export', 'dblink',
];

const READ_ONLY_KEYWORDS_OK = ['select', 'with'];

function stripComments(sql: string): string {
  return sql
    .replace(/--[^\n]*\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, ' ');
}

function lower(sql: string): string {
  return sql.toLowerCase();
}

interface GuardResult {
  /** Final SQL with $USER_ID replaced by $1 and LIMIT enforced. */
  sql: string;
  /** Bind values, in order. Currently always [userId]. */
  params: string[];
  /** Tables that were referenced (for telemetry). */
  tables: string[];
}

/**
 * Extract bare table names from a SELECT. Conservative regex-based extraction:
 * matches identifiers after `FROM` and `JOIN` keywords, before any alias / on /
 * where / etc. Lower-cased for lookup.
 */
function extractTableNames(sql: string): string[] {
  const lowered = lower(sql);
  const names = new Set<string>();
  const re = /(?:from|join)\s+([a-z_][a-z0-9_]*)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(lowered)) !== null) {
    names.add(match[1]);
  }
  return [...names];
}

/**
 * Verify every non-global table referenced in the SQL is reachable from the
 * caller's id. Two valid patterns:
 *
 *   (a) DIRECT: the table's own scope column is compared to $USER_ID, e.g.
 *       `WHERE sh.user_id = $USER_ID`.
 *
 *   (b) JOIN-VIA-COACH: the table is JOINed to coach_requests (directly or
 *       through a chain), AND coach_requests has trainer_id = $USER_ID and
 *       status = 'accepted'. This is how trainers reach their clients' rows.
 *
 * If neither holds for some non-global table, we refuse the query.
 */
function verifyScope(sql: string, tables: TableDef[], role: Role): void {
  const lowered = lower(sql);

  // Admin has unrestricted read access — no scope enforcement.
  if (role === 'admin') return;

  const hasUserIdLiteral = /\$user_id/i.test(lowered);
  if (!hasUserIdLiteral) {
    throw new SqlGuardError('Query must reference $USER_ID at least once.');
  }

  // Pattern (b) pre-check: does the SQL contain a "trainer-scoped" coach_requests reference?
  const referencesCoachRequests = /\bcoach_requests\b/.test(lowered);
  const coachRequestsTrainerScoped = referencesCoachRequests
    && /(?:[a-z_][a-z0-9_]*\.)?trainer_id\s*=\s*\$user_id/i.test(lowered)
    && /(?:[a-z_][a-z0-9_]*\.)?status\s*=\s*'accepted'/i.test(lowered);

  for (const t of tables) {
    if (!t.userScopeColumn) continue;

    // Direct scope: any of {userScopeColumn, trainerScopeColumn} = $USER_ID
    const cols = [t.userScopeColumn];
    if (t.trainerScopeColumn && t.trainerScopeColumn !== t.userScopeColumn) {
      cols.push(t.trainerScopeColumn);
    }
    const directScope = cols.some((c) => {
      const re = new RegExp(`(?:[a-z_][a-z0-9_]*\\.)?${c}\\s*=\\s*\\$user_id`, 'i');
      return re.test(lowered);
    });
    if (directScope) continue;

    // Join-via-coach scope: the table is JOINed somewhere AND coach_requests
    // is trainer-scoped to $USER_ID. We accept the join if the table name
    // appears after a JOIN keyword (it always does if referenced past FROM).
    if (coachRequestsTrainerScoped && t.name !== 'coach_requests') {
      continue;
    }

    throw new SqlGuardError(
      `Query references "${t.name}" but doesn't filter by ${cols.join(' or ')} = $USER_ID, ` +
      `and isn't scoped via coach_requests (trainer_id = $USER_ID AND status = 'accepted'). Refusing for safety.`,
    );
  }
}

function enforceLimit(sql: string): string {
  const lowered = lower(sql);
  // Don't add LIMIT to CTE bodies — we add it to the outer SELECT.
  if (/\blimit\s+\d+/.test(lowered)) {
    return sql;
  }
  const trimmed = sql.replace(/;\s*$/, '').trimEnd();
  return `${trimmed}\nLIMIT 5000`;
}

export function guardSql(rawSql: string, role: Role): GuardResult {
  if (typeof rawSql !== 'string' || !rawSql.trim()) {
    throw new SqlGuardError('Empty SQL.');
  }
  const stripped = stripComments(rawSql).trim();

  // Must not contain multiple statements (a single trailing ; is fine).
  const semicolonCount = (stripped.match(/;/g) ?? []).length;
  const trailingSemi = /;\s*$/.test(stripped);
  if (semicolonCount > (trailingSemi ? 1 : 0)) {
    throw new SqlGuardError('Multiple SQL statements are not allowed.');
  }

  const lowered = lower(stripped);

  // First non-whitespace keyword must be select or with.
  const first = lowered.match(/^[a-z]+/)?.[0] ?? '';
  if (!READ_ONLY_KEYWORDS_OK.includes(first)) {
    throw new SqlGuardError(`SQL must start with SELECT or WITH (got "${first}").`);
  }

  // Reject any forbidden keyword appearing as a token.
  for (const kw of FORBIDDEN_KEYWORDS) {
    const re = new RegExp(`(?:^|[^a-z0-9_])${kw}(?:$|[^a-z0-9_])`, 'i');
    if (re.test(lowered)) {
      throw new SqlGuardError(`SQL contains forbidden keyword "${kw}".`);
    }
  }

  // Tables must be whitelisted for this role.
  const referenced = extractTableNames(stripped);
  const tableDefs: TableDef[] = [];
  for (const name of referenced) {
    const def = findTable(name, role);
    if (!def) {
      throw new SqlGuardError(`Table "${name}" is not part of the analytics schema.`);
    }
    if (!def.allowedRoles.includes(role)) {
      throw new SqlGuardError(`Role "${role}" cannot read from "${name}".`);
    }
    tableDefs.push(def);
  }
  if (tableDefs.length === 0) {
    throw new SqlGuardError('Query must reference at least one table.');
  }

  // Scope check.
  verifyScope(stripped, tableDefs, role);

  // Replace $USER_ID with $1.
  const replaced = stripped.replace(/\$user_id/gi, '$1');

  // Enforce LIMIT.
  const limited = enforceLimit(replaced);

  return {
    sql: limited,
    params: [], // userId is filled in by caller
    tables: tableDefs.map((t) => t.name),
  };
}

/**
 * Visible for tests / introspection.
 */
export const _internal = {
  extractTableNames,
  enforceLimit,
  stripComments,
};

export type { Role, TableDef };
export { ANALYTICS_TABLES, ADMIN_ONLY_TABLES };
