/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * Single chart renderer for the analytics canvas.
 * Recharts-based, supports click-to-lock context on pie slices and bar cells.
 */

import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell,
  ScatterChart, Scatter, ZAxis,
} from 'recharts'
import type { ChartSpec, LockedContext } from '../../api/analytics'
import { useThemeStore } from '../../store/themeStore'
import { CHART_PALETTE, formatValue } from './formatValue'

function useChartChrome() {
  const theme = useThemeStore((s) => s.theme)
  // Read CSS variables on first render and on theme change, so axes and
  // strokes adapt without us hardcoding hex codes.
  const [chrome, setChrome] = useState({
    axisText: 'rgba(255,255,255,0.55)',
    gridLine: 'rgba(255,255,255,0.05)',
    cursorFill: 'rgba(255,255,255,0.04)',
    cursorStroke: 'rgba(255,255,255,0.15)',
    cardStroke: '#0a0a0b',
  })
  useEffect(() => {
    if (typeof window === 'undefined') return
    const cs = getComputedStyle(document.documentElement)
    const secondary = cs.getPropertyValue('--text-secondary').trim() || '#94a3b8'
    const card = cs.getPropertyValue('--bg-card').trim() || '#0a0a0b'
    setChrome({
      axisText: secondary,
      gridLine: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      cursorFill: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.035)',
      cursorStroke: theme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
      cardStroke: card,
    })
  }, [theme])
  return chrome
}

interface Props {
  chartId: string
  spec: ChartSpec
  data: Array<Record<string, unknown>>
  lockedContext?: LockedContext | null
  onLockContext?: (locked: LockedContext) => void
}

function CustomTooltip({ active, payload, label, spec }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl px-3 py-2 shadow-xl backdrop-blur-md"
      style={{
        background: 'var(--glass-bg-heavy)',
        border: '1px solid var(--glass-border)',
        color: 'var(--text-primary)',
      }}
    >
      {label !== undefined && (
        <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>{String(label)}</div>
      )}
      {payload.map((p: any, i: number) => {
        const seriesCfg = spec.config.series.find((s: any) => s.dataKey === p.dataKey)
        return (
          <div key={i} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
              <span style={{ color: 'var(--text-secondary)' }}>{seriesCfg?.label ?? p.name}</span>
            </span>
            <span className="font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {formatValue(p.value, seriesCfg?.format)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function AnalyticsChart({ chartId, spec, data, lockedContext, onLockContext }: Props) {
  const chrome = useChartChrome()

  if (!spec) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm" style={{ color: 'var(--text-secondary)' }}>
        No chart specification available.
      </div>
    )
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-center px-4" style={{ color: 'var(--text-secondary)' }}>
        No data rows returned or empty dataset.
      </div>
    )
  }

  const { config, chartType } = spec
  if (!config || !Array.isArray(config.series)) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm" style={{ color: 'var(--text-secondary)' }}>
        Invalid chart configuration structure.
      </div>
    )
  }

  const xKey = config.xAxisKey ?? 'name'
  const firstSeries = config.series[0]
  const valueKey = firstSeries?.dataKey ?? 'value'

  const handleSliceClick = (row: Record<string, unknown>) => {
    if (!onLockContext) return
    const xVal = row[xKey]
    if (xVal === undefined || xVal === null) return
    onLockContext({
      chartId,
      field: xKey,
      value: xVal as string | number,
      label: spec.config.series[0]?.label ?? spec.title,
    })
  }

  const isLockedRow = (row: Record<string, unknown>) =>
    lockedContext &&
    lockedContext.chartId === chartId &&
    String(row[xKey]) === String(lockedContext.value)

  // KPI
  if (chartType === 'kpi') {
    let value = firstSeries ? data[0]?.[firstSeries.dataKey] : Object.values(data[0] ?? {})[0]
    // For number/currency/percentage KPIs, treat null/undefined as zero so the
    // card doesn't render an empty dash on an empty dataset.
    const numericFormats = ['number', 'currency', 'percentage', 'duration']
    if ((value === null || value === undefined) && (!firstSeries?.format || numericFormats.includes(firstSeries.format))) {
      value = 0
    }
    return (
      <div className="flex h-[260px] flex-col items-center justify-center">
        <div className="text-5xl font-black tabular-nums" style={{ color: 'var(--text-primary)' }}>
          {formatValue(value, firstSeries?.format)}
        </div>
        {firstSeries?.label && (
          <div className="mt-3 text-xs uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
            {firstSeries.label}
          </div>
        )}
      </div>
    )
  }

  // Table
  if (chartType === 'table') {
    const cols = [xKey, ...config.series.map((s) => s.dataKey)].filter((v, i, a) => a.indexOf(v) === i)
    return (
      <div
        className="max-h-[320px] overflow-auto rounded-lg"
        style={{ border: '1px solid var(--border-color)' }}
      >
        <table className="w-full text-xs">
          <thead
            className="sticky top-0 backdrop-blur-md"
            style={{ background: 'var(--glass-bg)' }}
          >
            <tr>
              {cols.map((c) => (
                <th
                  key={c}
                  className="px-3 py-2 text-left font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {config.series.find((s) => s.dataKey === c)?.label ?? c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--border-color)' }}>
                {cols.map((c) => {
                  const seriesCfg = config.series.find((s) => s.dataKey === c)
                  return (
                    <td
                      key={c}
                      className="px-3 py-2 tabular-nums"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {formatValue(row[c], seriesCfg?.format)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Pie / Donut
  if (chartType === 'pie' || chartType === 'donut') {
    return (
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomTooltip spec={spec} />} />
            <Pie
              data={data}
              dataKey={valueKey}
              nameKey={xKey}
              innerRadius={chartType === 'donut' ? 55 : 0}
              outerRadius={95}
              strokeWidth={2}
              stroke={chrome.cardStroke}
              animationDuration={500}
              onClick={(_: any, idx: number) => handleSliceClick(data[idx])}
              style={{ cursor: onLockContext ? 'pointer' : 'default' }}
            >
              {data.map((row, i) => {
                const locked = isLockedRow(row)
                return (
                  <Cell
                    key={i}
                    fill={CHART_PALETTE[i % CHART_PALETTE.length]}
                    opacity={lockedContext && lockedContext.chartId === chartId ? (locked ? 1 : 0.35) : 1}
                    stroke={locked ? 'var(--accent-purple, #a78bfa)' : chrome.cardStroke}
                    strokeWidth={locked ? 3 : 2}
                  />
                )
              })}
            </Pie>
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // Bar / Bar-Stacked
  if (chartType === 'bar' || chartType === 'bar-stacked') {
    return (
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 4 }}>
            <CartesianGrid stroke={chrome.gridLine} vertical={false} />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: chrome.axisText }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: chrome.axisText }} tickLine={false} axisLine={false} width={40} />
            <Tooltip content={<CustomTooltip spec={spec} />} cursor={{ fill: chrome.cursorFill }} />
            {config.series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {config.series.map((s, idx) => (
              <Bar
                key={s.dataKey}
                dataKey={s.dataKey}
                stackId={chartType === 'bar-stacked' ? 'a' : undefined}
                fill={CHART_PALETTE[idx % CHART_PALETTE.length]}
                radius={[4, 4, 0, 0]}
                onClick={(_, i) => handleSliceClick(data[i])}
                style={{ cursor: onLockContext ? 'pointer' : 'default' }}
              >
                {data.map((row, i) => {
                  const locked = isLockedRow(row)
                  return (
                    <Cell
                      key={i}
                      fill={CHART_PALETTE[idx % CHART_PALETTE.length]}
                      opacity={lockedContext && lockedContext.chartId === chartId ? (locked ? 1 : 0.4) : 1}
                    />
                  )
                })}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // Line / Area
  if (chartType === 'line' || chartType === 'area') {
    const ChartCmp = chartType === 'line' ? LineChart : AreaChart
    return (
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ChartCmp data={data} margin={{ top: 8, right: 8, bottom: 8, left: 4 }}>
            <CartesianGrid stroke={chrome.gridLine} vertical={false} />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: chrome.axisText }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: chrome.axisText }} tickLine={false} axisLine={false} width={40} />
            <Tooltip content={<CustomTooltip spec={spec} />} cursor={{ stroke: chrome.cursorStroke }} />
            {config.series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {config.series.map((s, idx) =>
              chartType === 'line' ? (
                <Line
                  key={s.dataKey}
                  type="monotone"
                  dataKey={s.dataKey}
                  stroke={CHART_PALETTE[idx % CHART_PALETTE.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5, onClick: (_, p: any) => handleSliceClick(data[p?.index ?? 0]) }}
                />
              ) : (
                <Area
                  key={s.dataKey}
                  type="monotone"
                  dataKey={s.dataKey}
                  stroke={CHART_PALETTE[idx % CHART_PALETTE.length]}
                  fill={CHART_PALETTE[idx % CHART_PALETTE.length]}
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
              ),
            )}
          </ChartCmp>
        </ResponsiveContainer>
      </div>
    )
  }

  // Area-Stacked
  if (chartType === 'area-stacked') {
    return (
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 4 }}>
            <CartesianGrid stroke={chrome.gridLine} vertical={false} />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: chrome.axisText }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: chrome.axisText }} tickLine={false} axisLine={false} width={40} />
            <Tooltip content={<CustomTooltip spec={spec} />} cursor={{ stroke: chrome.cursorStroke }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {config.series.map((s, idx) => (
              <Area
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                stackId="a"
                stroke={CHART_PALETTE[idx % CHART_PALETTE.length]}
                fill={CHART_PALETTE[idx % CHART_PALETTE.length]}
                fillOpacity={0.4}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // Scatter
  if (chartType === 'scatter') {
    const yKey = config.series[0]?.dataKey ?? 'value'
    const zKey = config.series[1]?.dataKey
    return (
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 4 }}>
            <CartesianGrid stroke={chrome.gridLine} />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: chrome.axisText }} tickLine={false} axisLine={false} name={xKey} />
            <YAxis dataKey={yKey} tick={{ fontSize: 11, fill: chrome.axisText }} tickLine={false} axisLine={false} width={40} name={yKey} />
            {zKey && <ZAxis dataKey={zKey} range={[40, 400]} name={zKey} />}
            <Tooltip content={<CustomTooltip spec={spec} />} cursor={{ strokeDasharray: '3 3', stroke: chrome.cursorStroke }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Scatter data={data} fill={CHART_PALETTE[0]} onClick={(entry: any) => handleSliceClick(entry)} style={{ cursor: onLockContext ? 'pointer' : 'default' }} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // Multi-panel
  if (chartType === 'multi-panel') {
    const panels = config.panels ?? []
    if (panels.length === 0) {
      return (
        <div className="flex h-[260px] items-center justify-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          Empty multi-panel.
        </div>
      )
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {panels.map((panel, i) => (
          <div key={i} className="rounded-lg border border-white/[0.06] p-4" style={{ background: 'var(--glass-bg)' }}>
            <div className="mb-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{panel.title}</div>
            <AnalyticsChart chartId={`${chartId}-panel-${i}`} spec={panel} data={data} lockedContext={lockedContext} onLockContext={onLockContext} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="h-[260px] flex items-center justify-center text-sm" style={{ color: 'var(--text-secondary)' }}>
      Unsupported chart type: {chartType}
    </div>
  )
}
