import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { Sun, Moon, Zap, Clock, Activity, Sparkles, Brain, Info } from 'lucide-react'
import Card from '../../components/common/Card'

export default function CircadianOptimizer() {
  // Mock metabolic data based on a standard 7 AM wake up
  const dataPoints = Array.from({ length: 24 }, (_, i) => {
    const hour = (i + 7) % 24
    // Simple sine wave for metabolic peak around 4-6 PM
    const metabolicRate = Math.sin((hour - 10) * Math.PI / 12) * 50 + 50
    return { hour, metabolicRate }
  })

  const peakWindow = useMemo(() => {
    return { start: '16:00', end: '19:30' }
  }, [])

  return (
    <>
      <Helmet><title>Circadian Optimizer — Insta Coach</title></Helmet>
      
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div>
              <h1 className="text-3xl font-black text-text-primary flex items-center gap-3 italic">
                 <Sun className="text-orange-400" /> Circadian Optimizer
              </h1>
              <p className="text-text-secondary mt-1">AI analysis of your endocrine rhythm to identify metabolic strength peaks.</p>
           </div>
           <div className="px-4 py-2 bg-accent-teal/5 border border-accent-teal/20 rounded-full flex items-center gap-2">
              <Sparkles size={16} className="text-accent-teal" />
              <span className="text-xs font-black text-accent-teal uppercase tracking-widest">AI Sync Active</span>
           </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Main Chart Area */}
           <div className="lg:col-span-2 space-y-6">
              <Card className="h-[400px] flex flex-col pt-12 relative overflow-hidden">
                 <div className="absolute top-6 left-8 flex items-center gap-2">
                    <Activity size={18} className="text-accent-purple" />
                    <h2 className="font-black text-text-primary uppercase text-sm">Metabolic Intensity Curve</h2>
                 </div>

                 <div className="flex-1 flex items-end justify-between gap-1 px-8 pb-12">
                    {dataPoints.map((d, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center group relative">
                         <motion.div 
                           initial={{ height: 0 }}
                           animate={{ height: `${d.metabolicRate}%` }}
                           transition={{ delay: i * 0.02, duration: 1 }}
                           className={`w-full rounded-t-lg transition-all duration-300 ${d.hour >= 16 && d.hour <= 19 ? 'bg-accent-teal shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-bg-card-hover'}`}
                         />
                         {i % 4 === 0 && (
                           <span className="absolute -bottom-8 text-[10px] font-bold text-text-secondary">
                              {d.hour}:00
                           </span>
                         )}
                         <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-bg-primary border border-border-color p-2 rounded-lg text-[10px] font-black z-20 whitespace-nowrap">
                            Intensity: {Math.round(d.metabolicRate)}%
                         </div>
                      </div>
                    ))}
                 </div>

                 {/* Focus Highlight */}
                 <div className="absolute inset-y-0 left-[66%] right-[12%] bg-accent-teal/5 pointer-events-none border-x border-accent-teal/20" />
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Card className="p-6 border-accent-teal/20 bg-accent-teal/5 relative overflow-hidden">
                    <div className="flex items-start gap-4">
                       <div className="p-3 bg-accent-teal rounded-2xl shadow-lg">
                          <Zap className="text-white" size={24} />
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-accent-teal uppercase tracking-widest mb-1">Peak Strength Window</p>
                          <h3 className="text-2xl font-black text-text-primary">{peakWindow.start} — {peakWindow.end}</h3>
                          <p className="text-xs text-text-secondary mt-1">Core body temperature and testosterone peak detected.</p>
                       </div>
                    </div>
                    <Sparkles className="absolute -bottom-4 -right-4 opacity-5" size={100} />
                 </Card>
                 <Card className="p-6">
                    <div className="flex items-start gap-4">
                       <div className="p-3 bg-bg-card-hover rounded-2xl">
                          <Moon className="text-accent-purple" size={24} />
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1">Adrenal Recovery Start</p>
                          <h3 className="text-2xl font-black text-text-primary">22:45</h3>
                          <p className="text-xs text-text-secondary mt-1">Phase out stimulants for optimal CNS resetting.</p>
                       </div>
                    </div>
                 </Card>
              </div>
           </div>

           {/* Insights Sidebar */}
           <div className="space-y-6">
              <Card className="h-full">
                 <h2 className="font-black text-text-primary flex items-center gap-2 mb-6">
                    <Brain className="text-accent-teal" size={20} /> AI Rhythm Insights
                 </h2>

                 <div className="space-y-6">
                    <div className="space-y-3">
                       <div className="p-4 bg-bg-primary rounded-2xl border border-border-color space-y-2 group hover:border-accent-teal transition-colors">
                          <div className="flex items-center gap-2 text-xs font-black text-text-primary">
                             <Clock size={14} className="text-accent-teal" /> PRIME HYPERTROPHY
                          </div>
                          <p className="text-xs text-text-secondary leading-relaxed">
                            Your protein synthesis markers are highest between <strong>17:00 and 19:00</strong>. Save your heavy compound lifts for this window.
                          </p>
                       </div>
                       
                       <div className="p-4 bg-bg-primary rounded-2xl border border-border-color space-y-2 group hover:border-accent-teal transition-colors">
                          <div className="flex items-center gap-2 text-xs font-black text-text-primary">
                             <Info size={14} className="text-orange-400" /> CORTISOL SPIKE
                          </div>
                          <p className="text-xs text-text-secondary leading-relaxed">
                            Morning cortisol is slightly elevated. Avoid heavy CNS loading before 09:00 to reduce oxidative stress.
                          </p>
                       </div>
                    </div>

                    <div className="pt-6 border-t border-border-color">
                       <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-4">Recommended Protocol</h3>
                       <div className="flex items-center gap-3 p-3 bg-accent-purple/5 rounded-xl border border-accent-purple/20">
                          <div className="w-8 h-8 rounded-lg bg-accent-purple/10 flex items-center justify-center">
                             <Zap className="text-accent-purple" size={16} />
                          </div>
                          <p className="text-[11px] font-bold text-text-primary">Post-Window Cooling Session (15m)</p>
                       </div>
                    </div>
                 </div>
              </Card>
           </div>
        </div>
      </div>
    </>
  )
}
