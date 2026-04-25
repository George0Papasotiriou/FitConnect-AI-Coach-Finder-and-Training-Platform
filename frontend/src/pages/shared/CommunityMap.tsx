import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { Globe, Users, Zap, MapPin, Activity, Sparkles, TrendingUp } from 'lucide-react'
import Card from '../../components/common/Card'

interface LivePoint {
  id: number
  x: number
  y: number
  type: 'trainee' | 'coach'
  label: string
}

export default function CommunityMap() {
  const [points, setPoints] = useState<LivePoint[]>([])
  const [globalCalories, setGlobalCalories] = useState(1402830)
  const [activeNow, setActiveNow] = useState(1284)

  useEffect(() => {
    // Initial points
    const initialPoints: LivePoint[] = [
      { id: 1, x: 25, y: 35, type: 'trainee', label: 'Lifting in NY' },
      { id: 2, x: 75, y: 45, type: 'coach', label: 'Coaching in London' },
      { id: 3, x: 45, y: 70, type: 'trainee', label: 'Yoga in Rio' },
      { id: 4, x: 80, y: 30, type: 'trainee', label: 'Running in Tokyo' },
      { id: 5, x: 15, y: 50, type: 'trainee', label: 'Cycling in LA' },
    ]
    setPoints(initialPoints)

    // Tick stats
    const interval = setInterval(() => {
      setGlobalCalories(prev => prev + Math.floor(Math.random() * 50))
      setActiveNow(prev => prev + (Math.random() > 0.5 ? 1 : -1))
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <Helmet><title>Social Sweat Map — Insta Coach</title></Helmet>
      
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div>
              <h1 className="text-3xl font-black text-text-primary flex items-center gap-3">
                 <Globe className="text-accent-teal" /> Social Sweat Map
              </h1>
              <p className="text-text-secondary mt-1">Real-time visualization of the global Insta Coach workout network.</p>
           </div>
           
           <div className="flex gap-4">
              <Card className="!py-2 !px-4 border-accent-teal/20 bg-accent-teal/5">
                 <p className="text-[9px] font-black uppercase text-accent-teal tracking-widest">Global Energy Expended</p>
                 <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-accent-teal" />
                    <span className="text-lg font-black text-text-primary">{globalCalories.toLocaleString()} KCAL</span>
                 </div>
              </Card>
              <Card className="!py-2 !px-4">
                 <p className="text-[9px] font-black uppercase text-text-secondary tracking-widest">Active Members Now</p>
                 <div className="flex items-center gap-2">
                    <Users size={14} className="text-accent-purple" />
                    <span className="text-lg font-black text-text-primary">{activeNow}</span>
                 </div>
              </Card>
           </div>
        </header>

        <Card className="relative aspect-[21/9] overflow-hidden bg-bg-primary border-none shadow-[inset_0_0_100px_rgba(16,185,129,0.05)] flex items-center justify-center p-0">
           {/* Animated Grid Background */}
           <div className="absolute inset-0 opacity-[0.03]" 
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #10b981 1px, transparent 0)', backgroundSize: '40px 40px' }} 
           />

           {/* Simple World Map Illustration */}
           <svg viewBox="0 0 100 50" className="w-full h-full opacity-10">
              <path d="M 10 20 Q 20 15 30 20 T 50 15 T 70 20 T 90 25 V 40 H 10 Z" fill="currentColor" />
           </svg>

           {/* Live Pulsing Points */}
           {points.map((p) => (
             <div key={p.id} className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                <div className="relative">
                   <motion.div 
                     initial={{ scale: 0.5, opacity: 0 }}
                     animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                     transition={{ duration: 2, repeat: Infinity }}
                     className={`absolute -inset-4 rounded-full ${p.type === 'coach' ? 'bg-accent-purple' : 'bg-accent-teal'}`}
                   />
                   <div className={`w-3 h-3 rounded-full border-2 border-white shadow-lg ${p.type === 'coach' ? 'bg-accent-purple' : 'bg-accent-teal'} relative z-10`} />
                   
                   <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-2 py-1 rounded text-[8px] font-black text-white whitespace-nowrap shadow-xl border border-white/10 pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
                      {p.label}
                   </div>
                </div>
             </div>
           ))}

           {/* AI Global Stats HUD */}
           <div className="absolute bottom-6 left-6 space-y-2">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-accent-teal animate-pulse" />
                 <span className="text-[10px] font-black text-text-primary uppercase tracking-tighter">Europe Sector: High Intensity</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-yellow-400" />
                 <span className="text-[10px] font-black text-text-primary uppercase tracking-tighter">Asia Sector: Recovering</span>
              </div>
           </div>

           <div className="absolute top-6 right-8 text-right space-y-1">
              <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Community Pulse AI</p>
              <p className="text-[10px] font-bold text-accent-teal italic">"Collective momentum is at 94%"</p>
           </div>
        </Card>

        {/* Live Activity Feed */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {[
             { user: 'Alex M.', action: 'Unleased Iron Vanguard Tier', icon: <Zap className="text-yellow-400" /> },
             { user: 'Sarah K.', action: 'Started Chest Day with Coach Jen', icon: <Activity className="text-accent-teal" /> },
             { user: 'Team Insta', action: 'Global Goal 1M KCAL achieved!', icon: <Sparkles className="text-accent-purple" /> }
           ].map((item, idx) => (
             <Card key={idx} className="flex items-center gap-4 group hover:border-accent-teal transition-all">
                <div className="w-10 h-10 rounded-xl bg-bg-primary border border-border-color flex items-center justify-center group-hover:scale-110 transition-transform">
                   {item.icon}
                </div>
                <div>
                   <p className="text-xs font-black text-text-primary">{item.user}</p>
                   <p className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">{item.action}</p>
                </div>
             </Card>
           ))}
        </div>
      </div>
    </>
  )
}
