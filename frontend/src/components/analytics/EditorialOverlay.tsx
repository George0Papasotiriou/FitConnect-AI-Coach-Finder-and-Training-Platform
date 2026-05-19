/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * Editorial briefing overlay. Renders the LLM-generated narrative document
 * across the canvas. Each section is paired with the original chart so the
 * reader can validate the prose against the data.
 */

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Download, AlertCircle, Mail } from 'lucide-react'
import type { EditorialResponse } from '../../api/analytics'
import { AnalyticsChart } from './AnalyticsChart'
import type { ChartSpec } from '../../api/analytics'

export interface EditorialChartData {
  id: string
  spec: ChartSpec
  data: Array<Record<string, unknown>>
}

interface Props {
  open: boolean
  loading: boolean
  error: string | null
  editorial: EditorialResponse | null
  charts: EditorialChartData[]
  onClose: () => void
  onDownloadPdf?: () => void
  onEmailPdf?: (email: string, message: string) => Promise<boolean>
}

export function EditorialOverlay({
  open, loading, error, editorial, charts, onClose, onDownloadPdf, onEmailPdf,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [sending, setSending] = useState(false)

  // Lock body scroll while the overlay is open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Reset scroll on each new render.
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [open, editorial?.metadata.requestId])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[80] bg-[#0a0a0b]/95 backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-label="Editorial briefing"
        >
          {/* Top chrome */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0a0a0b]/80 px-6 py-4 backdrop-blur-xl">
            <div className="text-[10px] uppercase tracking-widest font-mono text-white/55">
              {editorial?.kicker ?? 'EDITORIAL BRIEFING'}
            </div>
            <div className="flex items-center gap-2">
              {onDownloadPdf && editorial && (
                <button
                  type="button"
                  onClick={onDownloadPdf}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Download size={12} /> Download PDF
                </button>
              )}
              {onEmailPdf && editorial && (
                <button
                  type="button"
                  onClick={() => setShowEmailModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-accent-purple/40 bg-accent-purple/15 px-3 py-1.5 text-[11px] text-accent-purple hover:bg-accent-purple/25 hover:text-white transition-colors"
                >
                  <Mail size={12} /> Email PDF
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close briefing"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div ref={scrollRef} className="absolute inset-0 overflow-y-auto pt-[64px]">
            {loading && (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-white/70">
                  <Loader2 size={28} className="animate-spin" />
                  <div className="text-sm">Composing the briefing…</div>
                  <div className="text-[11px] text-white/40">~20 seconds</div>
                </div>
              </div>
            )}

            {!loading && error && (
              <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-amber-400/40 bg-amber-500/10 p-6 text-amber-200">
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-bold">Couldn't compile the briefing.</div>
                    <div className="mt-1 text-[12px] opacity-90">{error}</div>
                  </div>
                </div>
              </div>
            )}

            {!loading && !error && editorial && (
              <article className="mx-auto max-w-5xl px-6 py-12 text-white">
                {/* Masthead */}
                <header className="mb-12 border-b border-white/10 pb-10">
                  <div className="text-[10px] uppercase tracking-[0.25em] font-mono text-accent-teal">
                    {editorial.kicker}
                  </div>
                  <h1 className="mt-3 font-serif text-5xl leading-[1.05] tracking-tight md:text-6xl">
                    {editorial.title}
                  </h1>
                  {editorial.dek && (
                    <p className="mt-5 max-w-2xl font-serif text-lg leading-relaxed text-white/80">
                      {editorial.dek}
                    </p>
                  )}
                </header>

                {/* Sections */}
                <div className="space-y-16">
                  {editorial.sections.map((s) => {
                    const chart = charts.find((c) => c.id === s.chartId)
                    return (
                      <section key={`${s.number}-${s.chartId}`} className="grid gap-8 md:grid-cols-2">
                        {/* Left column: prose */}
                        <div>
                          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-accent-purple">
                            §{String(s.number).padStart(2, '0')} · {s.sectionKicker}
                          </div>
                          <h2 className="mt-2 font-serif text-3xl leading-tight tracking-tight md:text-4xl">
                            {s.headline}
                          </h2>
                          {s.lede && (
                            <p className="mt-4 font-serif text-base leading-relaxed text-white/90">
                              {s.lede}
                            </p>
                          )}
                          {s.body && (
                            <p className="mt-3 font-serif text-base leading-relaxed text-white/80">
                              {s.body}
                            </p>
                          )}
                          {s.insight && (
                            <aside className="mt-5 rounded-xl border-l-2 border-accent-teal bg-white/[0.03] px-4 py-3">
                              <div className="text-[10px] font-mono uppercase tracking-widest text-accent-teal">
                                Insight
                              </div>
                              <p className="mt-1 font-serif text-sm leading-relaxed text-white/85">
                                {s.insight}
                              </p>
                            </aside>
                          )}
                        </div>

                        {/* Right column: KPI + chart preview */}
                        <div className="flex flex-col">
                          <div className="mb-4">
                            <div className="text-[10px] font-mono uppercase tracking-widest text-white/55">
                              {s.kpiLabel}
                            </div>
                            <div className="mt-1 font-serif text-5xl font-black leading-none text-white">
                              {s.kpiValue}
                            </div>
                          </div>
                          {chart ? (
                            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3" data-chart-id={chart.id}>
                              <div className="mb-2 text-[11px] uppercase tracking-wider font-bold text-white/55">
                                {chart.spec.title}
                              </div>
                              <AnalyticsChart chartId={chart.id} spec={chart.spec} data={chart.data} />
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-dashed border-white/10 p-4 text-[11px] text-white/40">
                              Source chart no longer on the canvas.
                            </div>
                          )}
                        </div>
                      </section>
                    )
                  })}
                </div>

                {/* Methodology + colophon */}
                <footer className="mt-16 border-t border-white/10 pt-8 text-white/55">
                  {editorial.methodologyNote && (
                    <p className="max-w-2xl font-serif text-sm leading-relaxed">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-white/45">
                        Methodology ·{' '}
                      </span>
                      {editorial.methodologyNote}
                    </p>
                  )}
                  <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-white/35">
                    {editorial.colophonStamp}
                  </p>
                </footer>
              </article>
            )}
          </div>

          {/* Email Modal Overlay */}
          <AnimatePresence>
            {showEmailModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 backdrop-blur-sm"
                onClick={() => {
                  if (!sending) setShowEmailModal(false)
                }}
              >
                <motion.div
                  initial={{ scale: 0.95, y: 15 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 15 }}
                  className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c0c0f] p-6 shadow-2xl backdrop-blur-md"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Mail size={14} className="text-accent-purple" />
                      Email Briefing Report
                    </h3>
                    <button
                      onClick={() => {
                        if (!sending) {
                          setShowEmailModal(false)
                          setEmailInput('')
                          setEmailMessage('')
                        }
                      }}
                      className="text-white/45 hover:text-white transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-white/55 mb-1.5">
                        Recipient Email Address
                      </label>
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="recipient@example.com"
                        disabled={sending}
                        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-accent-purple/50 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-white/55 mb-1.5">
                        Custom message / note (optional)
                      </label>
                      <textarea
                        value={emailMessage}
                        onChange={(e) => setEmailMessage(e.target.value)}
                        placeholder="Hi, here is the editorial analysis briefing from AbiliFit..."
                        disabled={sending}
                        rows={3}
                        className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-accent-purple/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEmailModal(false)
                        setEmailInput('')
                        setEmailMessage('')
                      }}
                      disabled={sending}
                      className="rounded-lg border border-white/10 px-3.5 py-1.5 text-xs text-white/70 hover:bg-white/[0.04] hover:text-white transition-colors disabled:opacity-40"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!emailInput.trim()) return
                        setSending(true)
                        try {
                          const success = await onEmailPdf?.(emailInput.trim(), emailMessage.trim())
                          if (success) {
                            setShowEmailModal(false)
                            setEmailInput('')
                            setEmailMessage('')
                          }
                        } catch {
                          // Handled in handler
                        } finally {
                          setSending(false)
                        }
                      }}
                      disabled={!emailInput.trim() || sending}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-accent-purple px-4 py-1.5 text-xs font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-40"
                    >
                      {sending ? (
                        <>
                          <Loader2 size={12} className="animate-spin" /> Sending…
                        </>
                      ) : (
                        'Send Briefing'
                      )}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
