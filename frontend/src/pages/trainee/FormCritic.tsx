import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { Upload, Camera, Play, CheckCircle, AlertCircle, Sparkles, ChevronRight, Brain } from 'lucide-react'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import { toast } from 'sonner'
import apiClient from '../../api/client'

export default function FormCritic() {
  const [video, setVideo] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [results, setResults] = useState<{ score: number, feedback: string[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setVideo(file)
      setPreview(URL.createObjectURL(file))
      setResults(null)
    }
  }

  const startAnalysis = async () => {
    if (!video) return
    setAnalyzing(true)
    
    try {
      // In a real app we'd upload the video first
      const { data } = await apiClient.post('/strength/analyze-form', { type: 'squat' })
      
      // Simulate analysis time
      await new Promise(r => setTimeout(r, 3500))
      
      setResults(data)
      toast.success('Analysis complete!')
    } catch (err) {
      toast.error('AI Analysis failed. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <>
      <Helmet><title>AI Form Critic — Insta Coach</title></Helmet>
      
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-text-primary flex items-center gap-3">
              <Brain className="text-accent-purple" /> AI Form Critic
            </h1>
            <p className="text-text-secondary mt-1">Harness pose-detection AI to refine your technique and prevent injuries.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { setPreview(null); setVideo(null); setResults(null); }}>Reset</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Upload / Player Area */}
          <div className="lg:col-span-2 space-y-6">
            {!preview ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-video bg-bg-card border-2 border-dashed border-border-color rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-accent-purple/50 hover:bg-accent-purple/5 transition-all group"
              >
                <div className="w-16 h-16 rounded-2xl bg-bg-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <Upload className="text-accent-purple" />
                </div>
                <p className="font-bold text-text-primary">Click to upload workout video</p>
                <p className="text-xs text-text-secondary mt-2">MP4, MOV supported · Max 100MB</p>
                <input type="file" ref={fileInputRef} onChange={handleFile} accept="video/*" className="hidden" />
              </div>
            ) : (
              <div className="relative rounded-3xl overflow-hidden bg-black aspect-video group shadow-2xl border border-border-color">
                <video ref={videoRef} src={preview} className="w-full h-full object-contain" />
                
                {/* AI Analysis Overlay Effects */}
                <AnimatePresence>
                  {analyzing && (
                    <motion.div 
                      initial={{ top: '-100%' }}
                      animate={{ top: '100%' }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute left-0 right-0 h-1 bg-accent-purple shadow-[0_0_15px_rgba(16,185,129,0.8)] z-10"
                    />
                  )}
                </AnimatePresence>

                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => videoRef.current?.play()} className="p-5 bg-white/20 backdrop-blur-md rounded-full text-white hover:scale-110 transition-transform">
                      <Play fill="white" size={32} />
                   </button>
                </div>
                
                {analyzing && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-6">
                    <Sparkles className="animate-spin mb-4 text-accent-purple" size={48} />
                    <h3 className="text-xl font-black mb-2">Analyzing Pose Data...</h3>
                    <p className="text-sm opacity-80 text-center max-w-xs">Our AI is tracking 17 key body points to assess your joint angles and movement path.</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4">
               <Button 
                fullWidth 
                size="lg" 
                disabled={!video || analyzing} 
                onClick={startAnalysis}
                leftIcon={<Brain size={20} />}
               >
                 {analyzing ? 'Processing...' : 'Run AI Form Analysis'}
               </Button>
            </div>
          </div>

          {/* Results Sidebar */}
          <div className="space-y-6">
            <Card className="h-full flex flex-col">
              <h2 className="font-black text-text-primary flex items-center gap-2 mb-6">
                <CheckCircle className="text-accent-teal" size={20} /> Analysis Report
              </h2>
              
              {!results && !analyzing && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-40">
                  <Camera size={48} className="mb-4" />
                  <p className="text-sm font-medium">Upload a video to see your form score and feedback</p>
                </div>
              )}

              {analyzing && (
                 <div className="flex-1 space-y-6 py-4">
                   {[1, 2, 3].map(i => (
                     <div key={i} className="space-y-2 animate-pulse">
                       <div className="h-4 bg-bg-card-hover rounded w-3/4" />
                       <div className="h-3 bg-bg-card-hover rounded w-full" />
                     </div>
                   ))}
                 </div>
              )}

              {results && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 space-y-8">
                  <div className="text-center p-6 bg-accent-teal/10 rounded-3xl border border-accent-teal/20">
                    <p className="text-xs font-black text-accent-teal uppercase tracking-widest mb-1">Form Score</p>
                    <div className="text-5xl font-black text-text-primary">{results.score.toFixed(1)}<span className="text-lg opacity-40">/10</span></div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-text-secondary uppercase tracking-widest">Key Observations</h3>
                    {results.feedback.map((tip, idx) => (
                      <div key={idx} className="flex gap-3 p-3 bg-bg-primary rounded-xl border border-border-color group hover:border-accent-teal transition-colors">
                        <div className="w-6 h-6 rounded-lg bg-accent-teal/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                           <CheckCircle size={14} className="text-accent-teal" />
                        </div>
                        <p className="text-sm leading-relaxed text-text-primary">{tip}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-orange-400/5 rounded-2xl border border-orange-400/20 flex gap-3">
                     <AlertCircle size={18} className="text-orange-400 flex-shrink-0" />
                     <p className="text-[11px] text-orange-400 font-medium leading-normal italic">
                       Pro Tip: Film from a 45-degree angle for the best AI joint tracking results.
                     </p>
                  </div>
                </motion.div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
