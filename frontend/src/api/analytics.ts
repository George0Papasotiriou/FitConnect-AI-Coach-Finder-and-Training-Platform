/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 */

import apiClient from './client'

export type ChartType =
  | 'bar'
  | 'bar-stacked'
  | 'line'
  | 'area'
  | 'area-stacked'
  | 'pie'
  | 'donut'
  | 'kpi'
  | 'table'
  | 'scatter'
  | 'multi-panel'

export interface SeriesFormat {
  dataKey: string
  label: string
  format?: 'number' | 'currency' | 'percentage' | 'duration' | 'datetime'
}

export interface ChartSpec {
  chartType: ChartType
  title: string
  description?: string
  config: {
    xAxisKey?: string
    series: SeriesFormat[]
    panels?: ChartSpec[]
  }
  sql: string
}

export interface LockedContext {
  chartId: string
  field: string
  value: string | number
  label?: string
}

export interface AnalyticsResponse {
  spec: ChartSpec
  data: Array<Record<string, unknown>>
  explanation: string
  followUpSuggestions: string[]
  clarificationQuestion?: string
  chat_response?: string
  metadata: {
    latencyMs: number
    sqlRetries: number
    conversationId: string
    requestId: string
    chartId: string
    tables: string[]
  }
}

export interface EditorialSection {
  number: number
  chartId: string
  sectionKicker: string
  headline: string
  kpiValue: string
  kpiLabel: string
  lede: string
  body: string
  insight: string
}

export interface EditorialResponse {
  title: string
  dek: string
  kicker: string
  sections: EditorialSection[]
  methodologyNote: string
  colophonStamp: string
  metadata: {
    requestId: string
    conversationId: string
    chartCount: number
    latencyMs: number
  }
}

export interface EditorialResult {
  status: 'ok' | 'needs_more_charts' | 'error'
  editorial: EditorialResponse | null
  chartCount: number
  message?: string
}

export const analyticsApi = {
  query: (question: string, conversationId: string, lockedContext?: LockedContext | null) =>
    apiClient
      .post<AnalyticsResponse>('/analytics/query', { question, conversationId, lockedContext })
      .then((r) => r.data),

  suggestions: (conversationId: string, lockedContext?: LockedContext | null) =>
    apiClient
      .get<{ suggestions: string[] }>('/analytics/suggestions', {
        params: {
          conversationId,
          lockedContext: lockedContext ? JSON.stringify(lockedContext) : undefined,
        },
      })
      .then((r) => r.data.suggestions),

  resetConversation: (conversationId: string) =>
    apiClient
      .post<{ ok: boolean }>(`/analytics/conversations/${conversationId}/reset`)
      .then((r) => r.data),

  editorial: (conversationId: string) =>
    apiClient
      .post<EditorialResult>('/analytics/editorial', { conversationId })
      .then((r) => r.data),
}
