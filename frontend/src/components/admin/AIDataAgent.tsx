/**
 * AbiliFit AI Data Agent (Admin) — full-screen analytics canvas.
 *
 * Admin-only NL→SQL→chart on the AbiliFit Postgres database via /api/analytics.
 *
 * Features:
 *  - Endless canvas (pan with click-drag empty space, Ctrl/Cmd+wheel zoom)
 *  - Drag charts anywhere; positions persist to localStorage
 *  - Click a pie slice / bar to lock that filter for follow-up questions
 *  - Contextual suggestion pills regenerate after every chart and lock change
 *  - Multi-select charts → batch PDF export / email
 *  - Voice mode with live subtitles
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, motionValue, animate } from 'framer-motion'
import {
  ArrowUp, Plus, Minus, Sparkles, Trash2, Mail, Download,
  CheckCircle, RotateCcw, X, Loader2, BarChart3, FileText, Sun, Moon,
  Maximize2, Minimize2, TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'

import { adminApi } from '../../api/admin'
import { aiApi } from '../../api/ai'
import type {
  AnalyticsResponse, ChartSpec, EditorialResponse, LockedContext,
} from '../../api/analytics'
import { InfiniteCanvas, type InfiniteCanvasHandle } from '../analytics/InfiniteCanvas'
import { AnalyticsChart } from '../analytics/AnalyticsChart'
import { SuggestionPills } from '../analytics/SuggestionPills'
import { EditorialOverlay } from '../analytics/EditorialOverlay'
import { SQLThinkingPanel, type SQLPanelState } from '../analytics/SQLThinkingPanel'
import { VoiceSubtitles } from '../voice/VoiceSubtitles'
import { useAnalyticsVoice } from '../../hooks/useAnalyticsVoice'
import { useThemeStore } from '../../store/themeStore'
import { generateSelectedChartsPDF } from '../../lib/pdf-export'

/* ── Types ────────────────────────────────────────────────────────────── */
interface CanvasChart {
  id: string
  spec: ChartSpec
  data: Array<Record<string, unknown>>
  explanation: string
  question: string
  x: number
  y: number
  zIndex: number
}

const STORAGE_KEY = 'abilifit_admin_analytics_v2'
const CARD_WIDTH = 600
const CARD_HEIGHT = 480
const CHAR_INTERVAL_MS = 12

interface PersistedState {
  charts: CanvasChart[]
  conversationId: string
  lockedContext: LockedContext | null
}

function loadPersisted(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/* ── Props ────────────────────────────────────────────────────────────── */
interface AIDataAgentProps {
  onExit?: () => void
}

/* ── Component ────────────────────────────────────────────────────────── */
export default function AIDataAgent({ onExit }: AIDataAgentProps) {
  const persisted = useMemo(() => loadPersisted(), [])
  const [charts, setCharts] = useState<CanvasChart[]>(persisted?.charts ?? [])
  const [conversationId, setConversationId] = useState<string>(persisted?.conversationId ?? crypto.randomUUID())
  const [lockedContext, setLockedContext] = useState<LockedContext | null>(persisted?.lockedContext ?? null)
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showEmailPrompt, setShowEmailPrompt] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [exportTitle, setExportTitle] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [highestZ, setHighestZ] = useState(() =>
    persisted?.charts?.length ? Math.max(...persisted.charts.map((c) => c.zIndex)) : 10,
  )

  /* SQL Thinking Panel state */
  const [sqlPanel, setSqlPanel] = useState<SQLPanelState>({ sql: null, status: 'idle' })

  /* Expanded chart (maximize) */
  const [expandedChartId, setExpandedChartId] = useState<string | null>(null)

  /* Editorial overlay state */
  const [editorialOpen, setEditorialOpen] = useState(false)
  const [editorialLoading, setEditorialLoading] = useState(false)
  const [editorialError, setEditorialError] = useState<string | null>(null)
  const [editorial, setEditorial] = useState<EditorialResponse | null>(null)

  /* Theme — picks up the global theme store, toggleable here too. */
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const isDark = theme === 'dark'

  const canvasRef = useRef<InfiniteCanvasHandle>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  // Caching MotionValues to prevent violent snapping and layout jitter during dragging
  const chartPositionsRef = useRef<Record<string, { x: any; y: any }>>({})
  const draggingChartIdRef = useRef<string | null>(null)

  // Keep motion values in sync when state updates externally
  useEffect(() => {
    charts.forEach((c) => {
      if (!chartPositionsRef.current[c.id]) {
        chartPositionsRef.current[c.id] = {
          x: motionValue(c.x),
          y: motionValue(c.y),
        }
      } else if (draggingChartIdRef.current !== c.id) {
        chartPositionsRef.current[c.id].x.set(c.x)
        chartPositionsRef.current[c.id].y.set(c.y)
      }
    })

    // Clean up deleted charts
    const chartIds = new Set(charts.map((c) => c.id))
    Object.keys(chartPositionsRef.current).forEach((id) => {
      if (!chartIds.has(id)) {
        delete chartPositionsRef.current[id]
      }
    })
  }, [charts])

  /* Persist whenever critical state changes */
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ charts, conversationId, lockedContext }))
    } catch {
      /* quota — silent */
    }
  }, [charts, conversationId, lockedContext])

  /* Refresh contextual suggestions */
  const refreshSuggestions = useCallback(async () => {
    setSuggestionsLoading(true)
    try {
      const next = await adminApi.analyticsSuggestions(conversationId, lockedContext)
      setSuggestions(next)
    } catch {
      // keep stale
    } finally {
      setSuggestionsLoading(false)
    }
  }, [conversationId, lockedContext])

  useEffect(() => {
    void refreshSuggestions()
  }, [refreshSuggestions])

  /* Auto-focus input */
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  /* ── Place a chart in the canvas in the next free slot ────────────── */
  const placeChartOnCanvas = useCallback(
    (id: string, spec: ChartSpec, data: AnalyticsResponse['data'], explanation: string, question: string) => {
      setHighestZ((z) => z + 1)

      let targetX = 80
      let targetY = 100

      const viewport = canvasRef.current?.getViewport()
      if (viewport) {
        const width = window.innerWidth
        const height = window.innerHeight
        // Place the center of the card at the center of the current wrapper viewport
        targetX = (width / 2 - viewport.pan.x) / viewport.scale - CARD_WIDTH / 2
        targetY = (height / 2 - viewport.pan.y) / viewport.scale - CARD_HEIGHT / 2
      }

      // Snap initial coordinates to our 20px grid
      const GRID_SIZE = 20
      const snappedX = Math.round(targetX / GRID_SIZE) * GRID_SIZE
      const snappedY = Math.round(targetY / GRID_SIZE) * GRID_SIZE

      setCharts((prev) => {
        let finalX = snappedX
        let finalY = snappedY

        if (!viewport) {
          // Grid fallback if ref viewport is not yet available
          const cols = 2
          const idx = prev.length
          finalX = Math.round(((idx % cols) * (CARD_WIDTH + 32) + 80) / GRID_SIZE) * GRID_SIZE
          finalY = Math.round((Math.floor(idx / cols) * (CARD_HEIGHT + 32) + 100) / GRID_SIZE) * GRID_SIZE
        }

        // Avoid direct stacking: offset cascadingly if there is already a card at this position
        while (prev.some((cc) => Math.abs(cc.x - finalX) < 10 && Math.abs(cc.y - finalY) < 10)) {
          finalX += 40
          finalY += 40
        }

        return [...prev, { id, spec, data, explanation, question, x: finalX, y: finalY, zIndex: highestZ + 1 }]
      })
    },
    [highestZ],
  )

  /* ── Voice (declared first so submitQuery can read voice.active) ── */
  const voice = useAnalyticsVoice({
    onUtterance: async (text) => {
      await submitQuery(text)
    },
    onCanvasCommand: (cmd) => {
      switch (cmd.type) {
        case 'clear_canvas':
          setCharts([])
          toast.success('Canvas cleared.')
          break
        case 'new_conversation':
          void handleReset()
          break
        case 'zoom_in':
          canvasRef.current?.zoomIn()
          break
        case 'zoom_out':
          canvasRef.current?.zoomOut()
          break
        case 'zoom_reset':
          canvasRef.current?.zoomReset()
          break
        case 'export_pdf':
          if (charts.length > 0) {
            // Select all charts for export
            setSelectedIds(charts.map((c) => c.id))
            toast.info('All charts selected — tap PDF to download.')
          } else {
            toast('No charts on the canvas to export.')
          }
          break
        case 'generate_briefing':
          void handleGenerateBriefing()
          break
      }
    },
  })

  /* ── Submit query ─────────────────────────────────────────────────── */
  const submitQuery = useCallback(
    async (question: string) => {
      if (!question.trim() || pending) return
      setPending(true)
      setNotice(null)
      setSqlPanel({ sql: null, status: 'thinking' })
      try {
        const res = await adminApi.queryAnalytics(question.trim(), conversationId, lockedContext)
        
        if (!res) {
          throw new Error('Received empty response from analytics service.')
        }

        if (res.clarificationQuestion) {
          setNotice(res.clarificationQuestion)
          setSqlPanel({ sql: null, status: 'idle' })
          if (voice.active) voice.speakAI(res.clarificationQuestion)
        } else if (res.chat_response) {
          setNotice(res.chat_response)
          setSqlPanel({ sql: null, status: 'idle' })
          if (voice.active) voice.speakAI(res.chat_response)
        } else if (res.spec) {
          const chartId = res.metadata?.chartId || `chart_${crypto.randomUUID()}`
          const sqlQuery = res.spec.sql || null
          const latencyMs = res.metadata?.latencyMs
          const retries = res.metadata?.sqlRetries

          setSqlPanel({
            sql: sqlQuery,
            status: 'rendering',
            latencyMs,
            retries,
          })
          
          placeChartOnCanvas(chartId, res.spec, res.data || [], res.explanation || '', question.trim())
          
          // Delay 'done' to let the SQL stream animation finish
          const streamDelay = Math.min((sqlQuery?.length ?? 0) * CHAR_INTERVAL_MS, 2000)
          setTimeout(() => setSqlPanel((p) => ({ ...p, status: 'done' })), streamDelay)
          
          if (voice.active) {
            voice.speakAI(res.explanation || `Here is the chart for: ${question.trim()}.`)
          }
        } else {
          // Fallback if neither spec, clarification, nor chat response is present
          const fallbackMsg = res.explanation || 'No data chart could be generated for this query.'
          setNotice(fallbackMsg)
          setSqlPanel({ sql: null, status: 'idle' })
          if (voice.active) voice.speakAI(fallbackMsg)
        }

        if (res.followUpSuggestions?.length) {
          setSuggestions(res.followUpSuggestions)
        } else {
          void refreshSuggestions()
        }
      } catch (err: any) {
        console.error('Analytics query failed:', err)
        const msg = err?.response?.data?.message ?? err?.message ?? 'Something went wrong with that query.'
        setNotice(msg)
        setSqlPanel({ sql: null, status: 'idle' })
        toast.error(msg)
      } finally {
        setPending(false)
        setQuery('')
      }
    },
    [conversationId, lockedContext, pending, placeChartOnCanvas, refreshSuggestions, voice],
  )

  /* ── Lock context ─────────────────────────────────────────────────── */
  const handleLockContext = useCallback((locked: LockedContext) => {
    setLockedContext((prev) => {
      if (prev && prev.chartId === locked.chartId && String(prev.value) === String(locked.value)) {
        return null
      }
      return locked
    })
  }, [])

  /* ── Reset conversation ───────────────────────────────────────────── */
  const handleReset = useCallback(async () => {
    if (voice.active) voice.stop()
    try {
      await adminApi.resetAnalyticsConversation(conversationId)
    } catch {
      // non-fatal
    }
    setCharts([])
    setConversationId(crypto.randomUUID())
    setLockedContext(null)
    setNotice(null)
    setSelectedIds([])
    canvasRef.current?.zoomReset()
    setShowResetConfirm(false)
    toast.success('Canvas reset.')
    void refreshSuggestions()
  }, [conversationId, refreshSuggestions, voice])

  /* ── Editorial briefing ───────────────────────────────────────────── */
  const handleGenerateBriefing = useCallback(async () => {
    if (editorialLoading) return
    if (charts.length < 2) {
      toast.error('Run at least two queries first.')
      return
    }
    setEditorialOpen(true)
    setEditorialLoading(true)
    setEditorialError(null)
    setEditorial(null)
    try {
      const res = await adminApi.editorial(conversationId)
      if (res.status === 'ok' && res.editorial) {
        setEditorial(res.editorial)
      } else if (res.status === 'needs_more_charts') {
        setEditorialError(res.message ?? 'Run a couple more queries first.')
      } else {
        setEditorialError(res.message ?? 'Editorial generation failed.')
      }
    } catch (err: any) {
      setEditorialError(err?.response?.data?.message ?? 'Editorial generation failed.')
    } finally {
      setEditorialLoading(false)
    }
  }, [charts.length, conversationId, editorialLoading])

  const handleDownloadEditorial = useCallback(async () => {
    if (!editorial) return
    const chartsForBriefing = editorial.sections
      .map((s) => {
        const c = charts.find((cc) => cc.id === s.chartId)
        if (!c) return null
        return { id: c.id, title: c.spec.title }
      })
      .filter((x): x is { id: string; title: string } => x !== null)
    const title = editorial.title || 'AbiliFit_Briefing'
    toast.loading('Compiling briefing PDF…', { id: 'editorial-pdf' })
    try {
      const pdf = await generateSelectedChartsPDF(chartsForBriefing, title)
      pdf.save(`${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`)
      toast.success('Briefing downloaded.', { id: 'editorial-pdf' })
    } catch {
      toast.error('Couldn\'t compile the briefing PDF.', { id: 'editorial-pdf' })
    }
  }, [editorial, charts])

  const handleEmailEditorial = useCallback(async (email: string, message: string): Promise<boolean> => {
    if (!editorial) return false
    const chartsForBriefing = editorial.sections
      .map((s) => {
        const c = charts.find((cc) => cc.id === s.chartId)
        if (!c) return null
        return { id: c.id, title: c.spec.title }
      })
      .filter((x): x is { id: string; title: string } => x !== null)
    const title = editorial.title || 'AbiliFit Analytics Briefing'
    toast.loading('Compiling and sending briefing PDF…', { id: 'editorial-email' })
    try {
      const pdf = await generateSelectedChartsPDF(chartsForBriefing, title)
      const dataUri = pdf.output('datauristring')
      
      const customMessage = message.trim()
        ? `\n\nCustom message from sender:\n"${message.trim()}"`
        : '';
        
      const result = await aiApi.sendEmailReport({
        email: email.trim(),
        chartsCount: chartsForBriefing.length,
        narrative: `Editorial Briefing: "${title}" — ${chartsForBriefing.length} chart(s).${customMessage}`,
        pdfDataUri: dataUri,
      })
      
      if (result.success) {
        toast.success(`Briefing emailed to ${email.trim()}`, { id: 'editorial-email' })
        return true
      } else {
        toast.error('Email delivery failed.', { id: 'editorial-email' })
        return false
      }
    } catch (err) {
      console.error(err)
      toast.error('Email delivery failed.', { id: 'editorial-email' })
      return false
    }
  }, [editorial, charts])

  /* ── Selection / export ───────────────────────────────────────────── */
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const handleDownloadPDF = async () => {
    if (selectedIds.length === 0) return
    const chartsToExport = charts
      .filter((c) => selectedIds.includes(c.id))
      .map((c) => ({ id: c.id, title: c.spec.title }))
    const reportTitle = exportTitle.trim() || 'AbiliFit_Analytics_Report'
    toast.loading('Compiling PDF…', { id: 'pdf-export' })
    try {
      const pdf = await generateSelectedChartsPDF(chartsToExport, reportTitle)
      pdf.save(`${reportTitle.replace(/\s+/g, '_')}_${Date.now()}.pdf`)
      toast.success('PDF downloaded.', { id: 'pdf-export' })
      setSelectedIds([])
      setExportTitle('')
    } catch {
      toast.error('PDF export failed.', { id: 'pdf-export' })
    }
  }

  const handleEmailPDF = async () => {
    if (!emailInput.trim() || selectedIds.length === 0) return
    setSendingEmail(true)
    const chartsToExport = charts
      .filter((c) => selectedIds.includes(c.id))
      .map((c) => ({ id: c.id, title: c.spec.title }))
    const reportTitle = exportTitle.trim() || 'AbiliFit Analytics Report'
    try {
      const pdf = await generateSelectedChartsPDF(chartsToExport, reportTitle)
      const dataUri = pdf.output('datauristring')
      
      const customMessage = emailMessage.trim()
        ? `\n\nCustom message from admin:\n"${emailMessage.trim()}"`
        : '';
        
      const result = await aiApi.sendEmailReport({
        email: emailInput.trim(),
        chartsCount: selectedIds.length,
        narrative: `Report "${reportTitle}" — ${selectedIds.length} chart(s).${customMessage}`,
        pdfDataUri: dataUri,
      })
      if (result.success) {
        toast.success(`Report sent to ${emailInput.trim()}`)
        setShowEmailPrompt(false)
        setEmailInput('')
        setEmailMessage('')
        setExportTitle('')
        setSelectedIds([])
      } else {
        toast.error('Email delivery failed.')
      }
    } catch {
      toast.error('Email delivery failed.')
    } finally {
      setSendingEmail(false)
    }
  }

  const downloadCSV = (chart: CanvasChart) => {
    if (!chart.data || chart.data.length === 0) {
      toast.error('No data to export.')
      return
    }
    try {
      const headers = Object.keys(chart.data[0])
      const csvRows = [
        headers.join(','),
        ...chart.data.map(row => 
          headers.map(header => {
            const val = row[header]
            const escaped = ('' + (val ?? '')).replace(/"/g, '""')
            return `"${escaped}"`
          }).join(',')
        )
      ]
      const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n")
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `${chart.spec.title.replace(/\s+/g, '_')}_data.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('CSV downloaded successfully.')
    } catch {
      toast.error('CSV export failed.')
    }
  }

  /* ── Render ───────────────────────────────────────────────────────── */
  // Token shorthands so the JSX stays readable.
  const cardBg = isDark
    ? 'bg-[rgba(10,10,11,0.85)] border-white/10'
    : 'bg-white/85 border-black/10'
  const cardBgSolid = isDark ? 'bg-[rgba(10,10,11,0.95)]' : 'bg-white/95'
  const cardBorder = isDark ? 'border-white/10' : 'border-black/10'
  const chipBg = isDark ? 'bg-white/[0.06]' : 'bg-black/[0.04]'
  const chipBgHover = isDark ? 'hover:bg-white/10' : 'hover:bg-black/[0.06]'
  const textMuted = isDark ? 'text-white/60' : 'text-black/55'
  const textBody = isDark ? 'text-white' : 'text-black'
  const gridLine = isDark
    ? 'bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)]'
    : 'bg-[linear-gradient(to_right,rgba(0,0,0,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.035)_1px,transparent_1px)]'
  const pageBg = isDark ? 'bg-[#06060c]' : 'bg-[#f3f4f8]'

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden ${pageBg}`}>
      {/* Ambient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className={`absolute inset-0 ${gridLine} bg-[size:40px_40px]`} />
        <div className="absolute top-[10%] left-[20%] h-[420px] w-[420px] rounded-full bg-accent-purple/[0.07] blur-[120px]" />
        <div className="absolute bottom-[15%] right-[12%] h-[420px] w-[420px] rounded-full bg-accent-teal/[0.07] blur-[120px]" />
      </div>

      {/* Header */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 z-30 flex items-start justify-between p-5">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${cardBorder} ${chipBg} shadow-2xl backdrop-blur-xl`}>
            <BarChart3 size={20} className="text-accent-teal" />
          </div>
          <div>
            <h1 className={`text-xl font-black italic uppercase tracking-tighter ${textBody} drop-shadow-md`}>
              AI Data Agent
            </h1>
            <p className={`text-[10px] uppercase tracking-widest font-bold ${textMuted}`}>
              Admin · Platform-wide insights
            </p>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <div className={`hidden md:flex items-center gap-1 rounded-full border ${cardBorder} ${chipBg} p-1 backdrop-blur-xl`}>
            <button
              type="button"
              onClick={() => canvasRef.current?.zoomOut()}
              className={`flex h-7 w-7 items-center justify-center rounded-full ${textMuted} ${chipBgHover} hover:${textBody} transition-colors`}
              aria-label="Zoom out"
            >
              <Minus size={12} />
            </button>
            <button
              type="button"
              onClick={() => canvasRef.current?.zoomReset()}
              className={`px-2 text-[10px] font-mono uppercase tracking-wider ${textMuted} transition-colors`}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => canvasRef.current?.zoomIn()}
              className={`flex h-7 w-7 items-center justify-center rounded-full ${textMuted} ${chipBgHover} transition-colors`}
              aria-label="Zoom in"
            >
              <Plus size={12} />
            </button>
          </div>
          <div className={`hidden lg:flex items-center gap-1 text-[10px] uppercase tracking-widest ${textMuted}`}>
            <kbd className={`rounded-md border ${cardBorder} ${chipBg} px-1.5 py-0.5 font-mono`}>Ctrl</kbd>
            <span>+</span>
            <kbd className={`rounded-md border ${cardBorder} ${chipBg} px-1.5 py-0.5 font-mono`}>scroll</kbd>
            <span>zoom</span>
          </div>
          <button
            type="button"
            onClick={() => void handleGenerateBriefing()}
            disabled={charts.length < 2 || editorialLoading}
            className="inline-flex items-center gap-1.5 rounded-full border border-accent-purple/40 bg-accent-purple/15 px-3 py-1.5 text-[11px] font-mono text-accent-purple hover:bg-accent-purple/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={charts.length < 2 ? 'Run at least two queries first' : 'Generate editorial briefing'}
          >
            {editorialLoading ? <Loader2 size={11} className="animate-spin" /> : <FileText size={11} />}
            Briefing
          </button>
          <button
            type="button"
            onClick={() => {
              if (charts.length < 1) { toast.error('Add at least one chart first.'); return }
              const summary = charts.map((c) => `• ${c.spec.title}: ${c.explanation}`).join('\n')
              void submitQuery(`Based on the following data insights from the platform, provide 5 actionable strategic recommendations for the CEO. What should the platform focus on next? What are the growth opportunities and risks?\n\nCurrent insights:\n${summary}`)
            }}
            disabled={charts.length < 1 || pending}
            className="inline-flex items-center gap-1.5 rounded-full border border-accent-teal/40 bg-accent-teal/15 px-3 py-1.5 text-[11px] font-mono text-accent-teal hover:bg-accent-teal/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={charts.length < 1 ? 'Add at least one chart first' : 'Generate CEO strategic insights'}
          >
            <TrendingUp size={11} />
            Insights
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${cardBorder} ${chipBg} ${textMuted} ${chipBgHover} transition-colors`}
            aria-label="Toggle light / dark mode"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={13} /> : <Moon size={13} />}
          </button>
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className={`inline-flex items-center gap-1.5 rounded-full border ${cardBorder} ${chipBg} px-3 py-1.5 text-[11px] font-mono ${textMuted} ${chipBgHover} transition-colors`}
            title="Reset canvas & conversation"
          >
            <RotateCcw size={11} />
            New
          </button>
          <button
            type="button"
            onClick={onExit}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${cardBorder} ${chipBg} ${textMuted} ${chipBgHover} transition-colors`}
            aria-label="Close analytics"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <InfiniteCanvas ref={canvasRef} className="h-full w-full" style={{ background: 'transparent' }}>
        <AnimatePresence>
          {charts.map((c) => {
            const isLocked = lockedContext?.chartId === c.id
            const isSelected = selectedIds.includes(c.id)

            // Ensure this chart has MotionValues initialized in the ref cache
            if (!chartPositionsRef.current[c.id]) {
              chartPositionsRef.current[c.id] = {
                x: motionValue(c.x),
                y: motionValue(c.y),
              }
            }
            const pos = chartPositionsRef.current[c.id]

            return (
              <motion.div
                key={c.id}
                drag
                dragMomentum={false}
                dragElastic={0.05}
                onDragStart={() => {
                  draggingChartIdRef.current = c.id
                  setHighestZ((z) => z + 1)
                  setCharts((prev) => prev.map((cc) => (cc.id === c.id ? { ...cc, zIndex: highestZ + 1 } : cc)))
                }}
                onDrag={(_, info) => {
                  const scale = canvasRef.current?.getViewport().scale ?? 1
                  if (scale !== 1 && pos) {
                    const extraX = info.delta.x / scale - info.delta.x
                    const extraY = info.delta.y / scale - info.delta.y
                    pos.x.set(pos.x.get() + extraX)
                    pos.y.set(pos.y.get() + extraY)
                  }
                }}
                onDragEnd={() => {
                  draggingChartIdRef.current = null
                  if (!pos) return

                  const currentX = pos.x.get()
                  const currentY = pos.y.get()

                  // Snap to grid
                  const GRID_SIZE = 20
                  const snappedX = Math.round(currentX / GRID_SIZE) * GRID_SIZE
                  const snappedY = Math.round(currentY / GRID_SIZE) * GRID_SIZE

                  // Smooth spring animation to snap location
                  animate(pos.x, snappedX, { type: 'spring', stiffness: 350, damping: 30 })
                  animate(pos.y, snappedY, { type: 'spring', stiffness: 350, damping: 30 })

                  setCharts((prev) =>
                    prev.map((cc) => {
                      if (cc.id === c.id) {
                        return { ...cc, x: snappedX, y: snappedY }
                      }
                      return cc
                    }),
                  )
                }}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  x: pos.x,
                  y: pos.y,
                  width: CARD_WIDTH,
                  zIndex: c.zIndex,
                }}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                className={`overflow-hidden rounded-2xl border ${cardBg} shadow-2xl backdrop-blur-2xl ${
                  isSelected ? '!border-accent-purple/60 shadow-accent-purple/20' : ''
                }`}
              >
                {/* Drag handle */}
                <div
                  className={`flex items-center justify-between px-4 py-2.5 border-b cursor-move active:cursor-grabbing select-none ${cardBorder}`}
                  style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.025)' }}
                >
                  <div className="flex items-center gap-2 pointer-events-none min-w-0">
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => toggleSelect(c.id)}
                      className={`flex h-4 w-4 items-center justify-center rounded-full border transition-all ${
                        isSelected
                          ? 'border-accent-purple bg-accent-purple shadow-[0_0_8px_var(--accent-purple)]'
                          : isDark ? 'border-white/30 bg-white/[0.04]' : 'border-black/25 bg-black/[0.04]'
                      } pointer-events-auto`}
                      aria-label="Select chart"
                    >
                      {isSelected && <CheckCircle size={10} className="text-white" />}
                    </button>
                    <span className={`text-[11px] uppercase tracking-wider font-bold ${textMuted} truncate`}>
                      {c.spec.title}
                    </span>
                    {isLocked && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent-purple/20 px-2 py-0.5 text-[9px] font-bold text-accent-purple">
                        filter
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => downloadCSV(c)}
                      className={`rounded-md p-1 ${textMuted} ${chipBgHover} transition-colors`}
                      title="Download CSV"
                      aria-label="Download CSV"
                    >
                      <Download size={11} />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => setExpandedChartId(c.id)}
                      className={`rounded-md p-1 ${textMuted} ${chipBgHover} transition-colors`}
                      title="Maximize"
                      aria-label="Maximize chart"
                    >
                      <Maximize2 size={11} />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => setCharts((prev) => prev.filter((cc) => cc.id !== c.id))}
                      className={`rounded-md p-1 ${textMuted} ${chipBgHover} transition-colors`}
                      aria-label="Remove chart"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4" onPointerDownCapture={(e) => e.stopPropagation()}>
                  <div className="mb-3">
                    <h3 className={`text-sm font-bold ${textBody}`}>{c.spec.title}</h3>
                    {c.spec.description && (
                      <p className={`mt-0.5 text-[11px] ${textMuted}`}>{c.spec.description}</p>
                    )}
                  </div>
                  <AnalyticsChart
                    chartId={c.id}
                    spec={c.spec}
                    data={c.data}
                    lockedContext={lockedContext}
                    onLockContext={handleLockContext}
                  />
                  {c.explanation && (
                    <p className={`mt-3 border-t pt-3 text-[11px] leading-relaxed ${textMuted} ${cardBorder}`}>
                      {c.explanation}
                    </p>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {charts.length === 0 && (
          <div
            style={{ position: 'absolute', left: 100, top: 160, width: 720 }}
            className={textMuted}
          >
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest font-bold">
              <Sparkles size={12} className="text-accent-teal" />
              Admin canvas ready
            </div>
            <p className={`mt-3 max-w-md text-sm leading-relaxed ${textBody}`}>
              Ask anything about the AbiliFit platform — users, sessions, applications, revenue. Click a slice or bar
              to <span className="text-accent-purple font-bold">lock</span> that filter for follow-up questions.
            </p>
            <div className={`mt-6 text-[11px] ${textMuted}`}>
              Drag empty space to pan · Ctrl+wheel to zoom
            </div>
          </div>
        )}
      </InfiniteCanvas>

      {/* SQL Thinking Panel */}
      <SQLThinkingPanel panel={sqlPanel} />

      {/* Suggestion pills — left side vertical column */}
      <div className="pointer-events-none fixed bottom-24 left-5 z-40 max-w-xs">
        <div className="pointer-events-auto">
          <SuggestionPills
            suggestions={suggestions}
            onSelect={(s) => void submitQuery(s)}
            loading={suggestionsLoading && suggestions.length === 0}
          />
        </div>
      </div>

      {/* Voice subtitles — centered above chatbox */}
      <div className="pointer-events-none fixed bottom-[120px] left-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2">
        <VoiceSubtitles
          userTranscript={voice.userInterim || voice.userFinal}
          aiTranscript={voice.aiCaption}
          aiSpeaking={voice.aiSpeaking}
          listening={voice.listening}
          position="inline"
        />
      </div>

      {/* Chatbox */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="pointer-events-auto fixed bottom-6 left-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2"
      >
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-3 rounded-2xl border ${cardBorder} ${cardBgSolid} px-4 py-3 text-sm ${textBody} backdrop-blur-xl cursor-pointer`}
            onClick={() => setNotice(null)}
          >
            {notice}
          </motion.div>
        )}
        <div className={`flex items-end gap-2 rounded-3xl border ${cardBorder} ${cardBgSolid} px-4 py-3 shadow-2xl backdrop-blur-xl`}>
          {lockedContext && (
            <div className="flex items-center gap-1.5 rounded-full border border-accent-purple/40 bg-accent-purple/15 px-2.5 py-1 text-[10px] text-accent-purple shrink-0">
              <span className="font-bold uppercase tracking-widest">Filter</span>
              <span className="font-bold max-w-[100px] truncate">{String(lockedContext.value)}</span>
              <button
                type="button"
                onClick={() => setLockedContext(null)}
                className="ml-0.5 rounded-full hover:bg-accent-purple/20 px-1 font-bold"
              >
                ✕
              </button>
            </div>
          )}
          <textarea
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void submitQuery(query)
              }
            }}
            rows={1}
            disabled={pending}
            placeholder={lockedContext ? `Ask about ${lockedContext.value}…` : 'Ask anything about the platform…'}
            className={`flex-1 resize-none bg-transparent text-sm ${textBody} focus:outline-none disabled:opacity-50 ${
              isDark ? 'placeholder-white/40' : 'placeholder-black/35'
            }`}
          />
          <button
            type="button"
            onClick={() => (voice.active ? voice.stop() : void voice.start())}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
              voice.active
                ? 'bg-gradient-to-br from-accent-purple to-accent-teal text-white shadow-lg shadow-accent-purple/40'
                : `${textMuted} ${chipBgHover}`
            }`}
            title={voice.active ? 'Stop voice' : 'Start voice'}
            aria-label="Toggle voice"
          >
            <Sparkles size={14} />
          </button>
          <button
            type="button"
            onClick={() => void submitQuery(query)}
            disabled={!query.trim() || pending}
            aria-label="Send"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-purple text-white shadow-lg shadow-accent-purple/30 transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={14} />}
          </button>
        </div>
      </motion.div>

      {/* Selection toolbar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className={`fixed bottom-6 right-6 z-[60] w-[320px] rounded-2xl border border-accent-purple/40 ${cardBgSolid} p-4 shadow-2xl backdrop-blur-2xl`}
          >
            <div className={`flex items-center justify-between border-b pb-2 ${cardBorder}`}>
              <span className={`text-xs font-bold ${textBody} flex items-center gap-1.5`}>
                <CheckCircle size={14} className="text-accent-purple" />
                {selectedIds.length} selected
              </span>
              <button
                onClick={() => setSelectedIds([])}
                className={`text-xs ${textMuted} hover:${textBody}`}
              >
                ✕
              </button>
            </div>
            <input
              type="text"
              value={exportTitle}
              onChange={(e) => setExportTitle(e.target.value)}
              placeholder="Report title (optional)"
              className={`mt-3 w-full rounded-lg border ${cardBorder} ${chipBg} px-2.5 py-1.5 text-xs ${textBody} focus:outline-none focus:border-accent-purple/40 ${
                isDark ? 'placeholder-white/30' : 'placeholder-black/35'
              }`}
            />
            {!showEmailPrompt ? (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleDownloadPDF}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent-purple px-3 py-2 text-xs font-bold text-white hover:opacity-90 transition-opacity"
                >
                  <Download size={12} /> PDF
                </button>
                <button
                  onClick={() => setShowEmailPrompt(true)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border ${cardBorder} px-3 py-2 text-xs font-bold ${textBody} ${chipBgHover} transition-colors`}
                >
                  <Mail size={12} /> Email
                </button>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter recipient email…"
                  disabled={sendingEmail}
                  className={`w-full rounded-lg border ${cardBorder} ${chipBg} px-2.5 py-1.5 text-xs ${textBody} focus:outline-none focus:border-accent-purple/40 ${
                    isDark ? 'placeholder-white/30' : 'placeholder-black/35'
                  }`}
                />
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="Formatted message (optional)…"
                  disabled={sendingEmail}
                  rows={3}
                  className={`w-full resize-none rounded-lg border ${cardBorder} ${chipBg} px-2.5 py-1.5 text-xs ${textBody} focus:outline-none focus:border-accent-purple/40 ${
                    isDark ? 'placeholder-white/30' : 'placeholder-black/35'
                  }`}
                />
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => {
                      setShowEmailPrompt(false)
                      setEmailMessage('')
                    }}
                    className={`text-[10px] ${textMuted} hover:${textBody} transition-colors`}
                  >
                    ← back
                  </button>
                  <button
                    onClick={handleEmailPDF}
                    disabled={!emailInput.trim() || sendingEmail}
                    className="rounded-lg bg-accent-purple px-4 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
                  >
                    {sendingEmail ? 'Sending…' : 'Send Email'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editorial overlay */}
      <EditorialOverlay
        open={editorialOpen}
        loading={editorialLoading}
        error={editorialError}
        editorial={editorial}
        charts={charts.map((c) => ({ id: c.id, spec: c.spec, data: c.data }))}
        onClose={() => setEditorialOpen(false)}
        onDownloadPdf={handleDownloadEditorial}
        onEmailPdf={handleEmailEditorial}
      />

      {/* Expanded chart overlay (maximize) */}
      <AnimatePresence>
        {expandedChartId && (() => {
          const ec = charts.find((c) => c.id === expandedChartId)
          if (!ec) return null
          return (
            <motion.div
              key="expanded-chart"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`fixed inset-0 z-[100] flex items-center justify-center p-8 backdrop-blur-md ${
                isDark ? 'bg-black/80' : 'bg-black/50'
              }`}
              onClick={() => setExpandedChartId(null)}
            >
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                className={`relative w-full max-w-5xl max-h-[85vh] overflow-y-auto rounded-3xl border ${cardBorder} ${cardBgSolid} p-8 shadow-2xl backdrop-blur-2xl`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className={`text-lg font-bold ${textBody}`}>{ec.spec.title}</h2>
                    {ec.spec.description && (
                      <p className={`mt-1 text-sm ${textMuted}`}>{ec.spec.description}</p>
                    )}
                    <p className={`mt-1 text-[11px] ${textMuted}`}>
                      Question: "{ec.question}"
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => downloadCSV(ec)}
                      className={`flex items-center gap-1.5 rounded-lg border ${cardBorder} px-3 py-1.5 text-xs font-semibold ${textBody} ${chipBg} hover:${chipBgHover} transition-all`}
                      title="Download raw data as CSV"
                    >
                      <Download size={12} />
                      Export CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedChartId(null)}
                      className={`rounded-full p-2 ${chipBg} ${chipBgHover} ${textMuted} transition-colors`}
                    >
                      <Minimize2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Chart at larger size */}
                <div className="h-[420px]">
                  <AnalyticsChart
                    chartId={ec.id}
                    spec={ec.spec}
                    data={ec.data}
                    lockedContext={lockedContext}
                    onLockContext={handleLockContext}
                  />
                </div>

                {/* Explanation */}
                {ec.explanation && (
                  <div className={`mt-6 border-t pt-4 ${cardBorder}`}>
                    <p className={`text-sm leading-relaxed ${textBody}`}>{ec.explanation}</p>
                  </div>
                )}

                {/* Data preview */}
                {ec.data.length > 0 && (
                  <div className={`mt-4 border-t pt-4 ${cardBorder}`}>
                    <h4 className={`text-[11px] uppercase tracking-wider font-bold ${textMuted} mb-2`}>
                      Data preview ({ec.data.length} rows)
                    </h4>
                    <div className="max-h-[180px] overflow-auto rounded-xl">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className={`border-b ${cardBorder}`}>
                            {Object.keys(ec.data[0]).map((k) => (
                              <th key={k} className={`text-left px-2 py-1.5 font-semibold ${textMuted}`}>
                                {k}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ec.data.slice(0, 20).map((row, ri) => (
                            <tr key={ri} className={`border-b ${cardBorder} hover:${chipBg}`}>
                              {Object.values(row).map((v, vi) => (
                                <td key={vi} className={`px-2 py-1.5 ${textBody}`}>
                                  {v === null ? '—' : String(v)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SQL */}
                {ec.spec.sql && (
                  <details className={`mt-4 border-t pt-4 ${cardBorder}`}>
                    <summary className={`text-[11px] uppercase tracking-wider font-bold ${textMuted} cursor-pointer select-none`}>
                      SQL Query
                    </summary>
                    <pre className={`mt-2 text-[11px] font-mono whitespace-pre-wrap break-words ${textMuted} rounded-xl p-3 ${chipBg}`}>
                      {ec.spec.sql}
                    </pre>
                  </details>
                )}
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* Reset confirmation */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className={`fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-sm ${
            isDark ? 'bg-black/70' : 'bg-black/40'
          }`}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={`w-full max-w-md rounded-2xl border ${cardBorder} ${cardBgSolid} p-6 shadow-2xl backdrop-blur-2xl text-center`}
            >
              <Trash2 className="h-9 w-9 text-red-500 mx-auto mb-4" />
              <h3 className={`text-base font-bold ${textBody}`}>Reset the canvas?</h3>
              <p className={`mt-2 text-xs leading-relaxed ${textMuted}`}>
                This deletes every chart on the canvas and starts a new conversation. The action can&apos;t be undone.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className={`rounded-lg border ${cardBorder} px-4 py-2 text-xs font-semibold ${textBody} ${chipBgHover} transition-colors`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleReset()}
                  className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 transition-colors"
                >
                  Yes, reset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
