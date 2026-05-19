"""Chart-spec generation pipeline.

Extracted from /api/query so both the HTTP route and the voice tool can
share one path: LLM emit → SQL validate → execute → result. Same retry
loop, same multi-panel handling, same conversation-store side effects.
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass
from typing import Any, Literal

from app.conversation import Turn, get_store
from app.llm.anthropic_client import call_llm
from app.logger import get_logger
from app.models import ChartConfig, ChartSpec, SeriesConfig
from app.sql.validator import SQLValidationError, validate_and_execute

log = get_logger("services.chart_pipeline")

MAX_RETRIES = 3


def _build_chart_spec_from_dict(raw: dict[str, Any]) -> ChartSpec:
    config_raw = raw.get("config") or {}
    series_raw = config_raw.get("series") or []
    series = [SeriesConfig(**s) for s in series_raw]
    panels_raw = config_raw.get("panels")
    panels = [_build_chart_spec_from_dict(p) for p in panels_raw] if panels_raw else None
    config = ChartConfig(
        xAxisKey=config_raw.get("xAxisKey"),
        series=series,
        panels=panels,
    )
    return ChartSpec(
        chartType=raw["chartType"],
        title=raw["title"],
        description=raw.get("description"),
        config=config,
        sql=raw.get("sql") or "",
    )


def _placeholder_spec() -> ChartSpec:
    return ChartSpec(
        chartType="kpi",
        title="",
        config=ChartConfig(series=[]),
        sql="",
    )


def _compute_token_cost(
    input_tokens: int,
    cache_creation: int,
    cache_read: int,
    output_tokens: int,
) -> float:
    """USD cost for Opus 4.7. $5/M input, $25/M output.
    Cache read = 10% of input. Cache write = 125% of input.
    """
    input_rate = 5.0 / 1_000_000
    output_rate = 25.0 / 1_000_000
    cache_read_rate = input_rate * 0.10
    cache_write_rate = input_rate * 1.25
    return round(
        input_tokens * input_rate
        + cache_creation * cache_write_rate
        + cache_read * cache_read_rate
        + output_tokens * output_rate,
        6,
    )


@dataclass
class ChartGenerationResult:
    """Unified return type for both HTTP and voice paths."""

    status: Literal["ok", "clarification", "error"]
    spec: ChartSpec
    data: list[dict[str, Any]]
    panel_data: list[list[dict[str, Any]]] | None
    explanation: str
    follow_up_hint: str | None
    clarification_question: str | None
    chart_id: str | None
    conversation_id: str
    request_id: str
    latency_ms: int
    token_cost: float
    sql_retries: int
    error: str | None = None


async def generate_chart_for_question(
    question: str,
    *,
    conversation_id: str | None,
    request_id: str | None = None,
) -> ChartGenerationResult:
    """Run the LLM emission + SQL validation + execution pipeline.

    Idempotent w.r.t. retries: on transient SQL errors the LLM is re-prompted
    with prior failure context up to MAX_RETRIES times.

    The conversation store is updated only on real success — clarification
    paths and zero-row executions do not pollute future-turn context.
    """
    started = time.perf_counter()
    req_id = request_id or str(uuid.uuid4())
    effective_convo_id = conversation_id or str(uuid.uuid4())
    store = get_store()
    history = store.get_history(conversation_id) if conversation_id else []

    log.info(
        "Pipeline started",
        extra={
            "request_id": req_id,
            "conversation_id": effective_convo_id,
            "question_chars": len(question),
            "history_turns": len(history),
        },
    )

    prior_attempts: list[dict[str, str]] = []
    accumulated_cost = 0.0

    for attempt in range(MAX_RETRIES):
        try:
            llm = call_llm(
                question,
                request_id=req_id,
                prior_attempts=prior_attempts if prior_attempts else None,
                history=history if history else None,
            )
        except Exception as e:
            log.error(
                "LLM call failed",
                extra={"request_id": req_id, "attempt": attempt + 1, "error": str(e)},
            )
            return ChartGenerationResult(
                status="error",
                spec=_placeholder_spec(),
                data=[],
                panel_data=None,
                explanation="",
                follow_up_hint=None,
                clarification_question=None,
                chart_id=None,
                conversation_id=effective_convo_id,
                request_id=req_id,
                latency_ms=int((time.perf_counter() - started) * 1000),
                token_cost=accumulated_cost,
                sql_retries=attempt,
                error=str(e),
            )

        accumulated_cost += _compute_token_cost(
            llm.input_tokens,
            llm.cache_creation_tokens,
            llm.cache_read_tokens,
            llm.output_tokens,
        )

        chart_spec_raw = llm.parsed.get("chart_spec") or {}
        chart_type = chart_spec_raw.get("chartType") if isinstance(chart_spec_raw, dict) else None
        sql_emitted = llm.parsed.get("sql") or ""

        # --- Multi-panel: each panel carries its own SQL ---
        if chart_type == "multi-panel":
            panels_raw = (chart_spec_raw.get("config") or {}).get("panels") or []
            if not panels_raw:
                log.warning(
                    "Multi-panel emitted with no panels",
                    extra={"request_id": req_id, "attempt": attempt + 1},
                )
                prior_attempts.append({
                    "sql": "",
                    "error": "multi-panel chart_spec had no panels[] entries",
                })
                continue

            panel_data: list[list[dict[str, Any]]] = []
            failed_panel: tuple[int, str, str, str] | None = None
            total_rows = 0

            for i, panel_raw in enumerate(panels_raw):
                panel_sql = panel_raw.get("sql") or ""
                panel_title = panel_raw.get("title") or f"panel_{i}"
                panel_ctype = panel_raw.get("chartType", "?")
                if not panel_sql:
                    failed_panel = (i, panel_title, panel_sql, "missing sql field on panel")
                    break
                try:
                    panel_started = time.perf_counter()
                    exec_result = validate_and_execute(panel_sql, request_id=req_id)
                except SQLValidationError as e:
                    failed_panel = (i, panel_title, panel_sql, str(e))
                    break
                panel_data.append(exec_result.rows)
                total_rows += exec_result.row_count
                log.info(
                    "Multi-panel: panel executed",
                    extra={
                        "request_id": req_id,
                        "panel_index": i,
                        "panel_title": panel_title,
                        "panel_chartType": panel_ctype,
                        "row_count": exec_result.row_count,
                        "latency_ms": int((time.perf_counter() - panel_started) * 1000),
                    },
                )

            if failed_panel is not None:
                idx, title, p_sql, err = failed_panel
                log.warning(
                    "Multi-panel: panel failed",
                    extra={
                        "request_id": req_id,
                        "attempt": attempt + 1,
                        "panel_index": idx,
                        "panel_title": title,
                        "error": err,
                    },
                )
                prior_attempts.append({
                    "sql": p_sql,
                    "error": f"Panel {idx} ('{title}'): {err}",
                })
                continue

            spec = _build_chart_spec_from_dict({**chart_spec_raw, "sql": ""})
            chart_id = str(uuid.uuid4())

            if conversation_id and llm.tool_use_id and total_rows > 0:
                aggregated: list[dict[str, Any]] = []
                for i, (panel_raw, rows) in enumerate(zip(panels_raw, panel_data, strict=False)):
                    panel_title = panel_raw.get("title") or f"panel_{i}"
                    for row in rows[:20]:
                        aggregated.append({"_panel": panel_title, **row})
                store.append_turn(
                    conversation_id,
                    Turn(
                        question=question,
                        tool_use_id=llm.tool_use_id,
                        tool_input=llm.parsed,
                        row_count=total_rows,
                        chart_id=chart_id,
                        aggregated_results=aggregated,
                    ),
                )

            log.info(
                "Multi-panel pipeline completed",
                extra={
                    "request_id": req_id,
                    "attempts": attempt + 1,
                    "panel_count": len(panel_data),
                    "total_rows": total_rows,
                    "total_cost_usd": accumulated_cost,
                    "latency_ms": int((time.perf_counter() - started) * 1000),
                },
            )

            return ChartGenerationResult(
                status="ok",
                spec=spec,
                data=[],
                panel_data=panel_data,
                explanation=llm.parsed.get("explanation", ""),
                follow_up_hint=llm.parsed.get("follow_up_hint"),
                clarification_question=llm.parsed.get("clarification_question"),
                chart_id=chart_id,
                conversation_id=effective_convo_id,
                request_id=req_id,
                latency_ms=int((time.perf_counter() - started) * 1000),
                token_cost=accumulated_cost,
                sql_retries=attempt,
            )

        # --- Single-panel: LLM declined OR has SQL to run ---
        if not sql_emitted:
            log.info(
                "LLM declined to emit SQL (clarification or unanswerable)",
                extra={
                    "request_id": req_id,
                    "has_clarification": bool(llm.parsed.get("clarification_question")),
                },
            )
            return ChartGenerationResult(
                status="clarification",
                spec=_placeholder_spec(),
                data=[],
                panel_data=None,
                explanation=llm.parsed.get("explanation", ""),
                follow_up_hint=llm.parsed.get("follow_up_hint"),
                clarification_question=llm.parsed.get("clarification_question"),
                chart_id=None,
                conversation_id=effective_convo_id,
                request_id=req_id,
                latency_ms=int((time.perf_counter() - started) * 1000),
                token_cost=accumulated_cost,
                sql_retries=attempt,
            )

        try:
            exec_result = validate_and_execute(sql_emitted, request_id=req_id)
        except SQLValidationError as e:
            log.warning(
                "SQL attempt failed",
                extra={"request_id": req_id, "attempt": attempt + 1, "error": str(e)},
            )
            prior_attempts.append({"sql": sql_emitted, "error": str(e)})
            continue

        spec = _build_chart_spec_from_dict({**llm.parsed["chart_spec"], "sql": sql_emitted})
        chart_id = str(uuid.uuid4())

        if conversation_id and llm.tool_use_id and exec_result.row_count > 0:
            store.append_turn(
                conversation_id,
                Turn(
                    question=question,
                    tool_use_id=llm.tool_use_id,
                    tool_input=llm.parsed,
                    row_count=exec_result.row_count,
                    chart_id=chart_id,
                    aggregated_results=exec_result.rows[:100],
                ),
            )

        log.info(
            "Pipeline completed",
            extra={
                "request_id": req_id,
                "attempts": attempt + 1,
                "row_count": exec_result.row_count,
                "total_cost_usd": accumulated_cost,
                "latency_ms": int((time.perf_counter() - started) * 1000),
            },
        )

        return ChartGenerationResult(
            status="ok",
            spec=spec,
            data=exec_result.rows,
            panel_data=None,
            explanation=llm.parsed.get("explanation", ""),
            follow_up_hint=llm.parsed.get("follow_up_hint"),
            clarification_question=llm.parsed.get("clarification_question"),
            chart_id=chart_id,
            conversation_id=effective_convo_id,
            request_id=req_id,
            latency_ms=int((time.perf_counter() - started) * 1000),
            token_cost=accumulated_cost,
            sql_retries=attempt,
        )

    log.error(
        "Pipeline exhausted retries",
        extra={
            "request_id": req_id,
            "attempts": MAX_RETRIES,
            "last_errors": [a["error"] for a in prior_attempts],
        },
    )
    return ChartGenerationResult(
        status="clarification",
        spec=_placeholder_spec(),
        data=[],
        panel_data=None,
        explanation=(
            "I couldn't generate a working SQL query for that question. "
            "Could you rephrase or be more specific about the timeframe or dimension?"
        ),
        follow_up_hint=None,
        clarification_question=(
            "Could you rephrase the question — perhaps specifying the "
            "timeframe (e.g., last 30 days) or the dimension (e.g., by intent, by region)?"
        ),
        chart_id=None,
        conversation_id=effective_convo_id,
        request_id=req_id,
        latency_ms=int((time.perf_counter() - started) * 1000),
        token_cost=accumulated_cost,
        sql_retries=MAX_RETRIES,
    )
