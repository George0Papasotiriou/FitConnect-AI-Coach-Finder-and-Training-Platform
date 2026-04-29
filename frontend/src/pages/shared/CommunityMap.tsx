import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { Activity, TrendingUp, Sparkles, Zap, Heart } from 'lucide-react'
import Card from '../../components/common/Card'

interface LivePoint {
  id: number
  x: number
  y: number
  type: 'trainee' | 'coach'
  label: string
  region: string
}

interface HeartParticle {
  id: number
  size: number
  color: string
  duration: number
  tx: number
  ty: number
}

// --- Optimized Sub-components to prevent main-thread lag ---

const HeartBurst = ({ hearts }: { hearts: HeartParticle[] }) => (
  <AnimatePresence>
    {hearts.map((h) => (
      <motion.div
        key={h.id}
        className="absolute left-1/2 top-1/2 pointer-events-none z-50 select-none"
        initial={{ x: '-50%', y: '-50%', scale: 0, opacity: 1 }}
        animate={{ 
          x: h.tx,
          y: h.ty,
          scale: [0, 1.4, 0.8],
          opacity: [1, 1, 0]
        }}
        transition={{ 
          duration: h.duration, 
          ease: [0.23, 1, 0.32, 1],
        }}
        style={{ 
          fontSize: `${h.size}px`, 
          color: h.color,
          willChange: 'transform, opacity'
        }}
      >
        ❤️
      </motion.div>
    ))}
  </AnimatePresence>
)

const KudosButton = () => {
  const [kudosSent, setKudosSent] = useState(false)
  const [hearts, setHearts] = useState<HeartParticle[]>([])

  const sendKudos = useCallback(() => {
    if (kudosSent) return
    setKudosSent(true)
    const newHearts: HeartParticle[] = Array.from({ length: 14 }, (_, i) => ({
      id: Date.now() + i,
      size: Math.random() * 30 + 18,
      color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
      duration: Math.random() * 0.8 + 1,
      tx: (Math.random() - 0.5) * (window.innerWidth < 1000 ? 250 : 400),
      ty: -300 - Math.random() * 200,
    }))
    setHearts(newHearts)
    setTimeout(() => {
      setHearts([])
      setKudosSent(false)
    }, 3000)
  }, [kudosSent])


  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={sendKudos}
        disabled={kudosSent}
        className={`
          relative px-12 py-5 rounded-3xl font-black text-sm uppercase tracking-widest
          transition-all duration-500 cursor-pointer overflow-hidden z-10
          flex items-center justify-center min-w-[320px]
          ${kudosSent
            ? 'bg-pink-500/20 text-pink-300 border border-pink-400/50 shadow-2xl'
            : 'bg-bg-primary text-pink-500 border border-pink-500/30 hover:shadow-2xl shadow-xl'
          }
        `}
      >
        <div className="flex items-center gap-3 relative z-10">
          <Heart size={20} className={kudosSent ? 'fill-pink-400 text-pink-400' : ''} />
          <span>{kudosSent ? 'Energy Dispatched' : 'Energize Global Members'}</span>
        </div>
      </motion.button>
      <HeartBurst hearts={hearts} />
    </div>
  )
}


const HEART_COLORS = ['#ff6b8a', '#ff4757', '#ff6b81', '#ee5a6f', '#fc5c7d', '#f78ca0', '#e84393', '#fd79a8']

// Dynamic Global Hubs — Coordinates computed from 1024x1024 map.png pixel positions
// with object-cover vertical crop offset of (1184-850)/2 = 167px
// tagDir controls where the label card appears relative to the dot
const HUBS = [
  { id: 'nyc', x: 27.3, y: 37.5, name: 'New York', color: '#0ea5e9', val: '1,420,380', icon: '🏙️', tagDir: 'top' as const },
  { id: 'london', x: 44.9, y: 28.7, name: 'London', color: '#64748b', val: '980,240', icon: '🎡', tagDir: 'topRight' as const },
  { id: 'paris', x: 45.9, y: 30.6, name: 'Paris', color: '#a78bfa', val: '1,120,400', icon: '🥐', tagDir: 'bottomRight' as const },
  { id: 'athens', x: 50.8, y: 35.5, name: 'Athens', color: '#38bdf8', val: '320,450', icon: '🏛️', tagDir: 'bottom' as const },
  { id: 'tokyo', x: 87.9, y: 36.8, name: 'Tokyo', color: '#f43f5e', val: '2,100,500', icon: '🗼', tagDir: 'left' as const },
  { id: 'sao-paulo', x: 31.7, y: 74.2, name: 'São Paulo', color: '#10b981', val: '640,110', icon: '🌳', tagDir: 'top' as const },
  { id: 'sydney', x: 89.4, y: 81.1, name: 'Sydney', color: '#f59e0b', val: '420,830', icon: '🌊', tagDir: 'left' as const },
]

const CONNECTIONS = [
  { from: 'nyc', to: 'london' },
  { from: 'london', to: 'tokyo' },
  { from: 'nyc', to: 'sao-paulo' },
  { from: 'tokyo', to: 'sydney' },
  { from: 'london', to: 'paris' },
]

export default function CommunityMap() {
  const [globalCalories, setGlobalCalories] = useState(1402830)
  const [activeNow, setActiveNow] = useState(1284)
  const [activeView, setActiveView] = useState('Live Status')

  const navItems = ['Live Status', 'Map Topology', 'Pulse Analytics', 'Network Hubs']

  useEffect(() => {
    const interval = setInterval(() => {
      setGlobalCalories(prev => prev + Math.floor(Math.random() * 80 + 20))
      setActiveNow(prev => {
        const delta = Math.random() > 0.4 ? Math.floor(Math.random() * 3 + 1) : -Math.floor(Math.random() * 2 + 1)
        return Math.max(1200, prev + delta)
      })
    }, 2500)
    return () => clearInterval(interval)
  }, [])


  return (
    <>
      <Helmet><title>Social Sweat Map — Insta Coach</title></Helmet>

      <div className="max-w-[1600px] mx-auto min-h-screen flex flex-col p-6 space-y-8 bg-bg-primary/30">
        {/* AAA Navigation Bar */}
        <header className="flex items-center justify-between w-full border-b border-border-color pb-6 px-4">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-black text-text-primary tracking-tighter uppercase italic">Insta<span className="text-accent-teal">Global</span></h1>
            <nav className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                <button 
                  key={item} 
                  onClick={() => setActiveView(item)}
                  className={`
                    relative text-[10px] font-black uppercase transition-all tracking-widest py-2 px-1
                    ${activeView === item ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary/70'}
                  `}
                >
                  {item}
                  {activeView === item && (
                    <motion.div 
                      layoutId="navIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-teal"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-bg-primary bg-bg-card flex items-center justify-center overflow-hidden">
                  <img src={`https://i.pravatar.cc/100?img=${i+20}`} alt="user" />
                </div>
              ))}
            </div>
            <span className="text-xs font-black text-text-primary">+{activeNow.toLocaleString()} Live</span>
          </div>
        </header>

        {/* Global Dashboard Layout */}
        <div className="flex flex-col lg:flex-row gap-6 h-[850px]">
          {/* Main Map Core */}
          <div className="flex-grow bg-[#f8f9fa] dark:bg-[#0f1117] border border-border-color rounded-[40px] relative overflow-hidden group shadow-2xl">
            
            {/* The Elegant Map Layer */}
            <div className="absolute inset-0 z-0">
              <motion.img 
                src="/map.png" 
                alt="Global Network"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.95 }}
                transition={{ duration: 1.5 }}
                className={`
                  w-full h-full object-cover transition-all duration-700
                  ${activeView === 'Map Topology' ? 'grayscale-0' : 'grayscale'}
                  invert-[0.88] brightness-[1.45] contrast-[0.95] saturate-0
                  dark:invert-0 dark:brightness-[0.55] dark:contrast-[1.2] dark:saturate-0
                `}
              />
              
              {/* Functional Topology Grid Overlay */}
              <AnimatePresence>
                {activeView === 'Map Topology' && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.15 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '30px 30px' }}
                  />
                )}
              </AnimatePresence>

              <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-white/10 dark:from-bg-primary/20 dark:to-bg-primary/20 pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,white_80%)] dark:bg-[radial-gradient(circle_at_center,transparent_0%,var(--bg-primary)_80%)] opacity-30" />
            </div>

            {/* Subtle Pencil Scanner */}
            <motion.div 
              className="absolute inset-0 z-10 pointer-events-none overflow-hidden"
              initial={{ x: '-100%' }}
              animate={{ 
                x: '100%',
                opacity: activeView === 'Map Topology' ? 0.3 : 0.1
              }}
              transition={{ duration: activeView === 'Map Topology' ? 6 : 12, repeat: Infinity, ease: 'linear' }}
            >
              <div className="h-full w-[2px] bg-gradient-to-b from-transparent via-text-primary/60 to-transparent blur-[2px]" />
            </motion.div>
            
            {/* SVG Telemetry Layer */}
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full z-10 pointer-events-none">
              {/* Connection Arcs */}
              {CONNECTIONS.map((conn, i) => {
                const head = HUBS.find(h => h.id === conn.from);
                const tail = HUBS.find(h => h.id === conn.to);
                if (!head || !tail) return null;
                const midX = (head.x + tail.x) / 2;
                const midY = Math.min(head.y, tail.y) - 15;
                return (
                  <g key={i}>
                      <motion.path
                      d={`M ${head.x} ${head.y} Q ${midX} ${midY} ${tail.x} ${tail.y}`}
                      fill="none"
                      stroke={`url(#gradient-${i})`}
                      strokeWidth={activeView === 'Live Status' ? "0.4" : "0.2"}
                      strokeDasharray="1, 4"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ 
                        pathLength: 1, 
                        opacity: activeView === 'Live Status' ? 0.6 : 0.25 
                      }}
                      transition={{ 
                        duration: activeView === 'Live Status' ? 4 : 8, 
                        delay: i * 0.5, 
                        repeat: Infinity, 
                        repeatType: 'loop', 
                        repeatDelay: 1 
                      }}
                    />
                    <defs>
                      <linearGradient id={`gradient-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={head.color} stopOpacity="0" />
                        <stop offset="50%" stopColor={head.color} stopOpacity="0.6" />
                        <stop offset="100%" stopColor={tail.color} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </g>
                );
              })}


            </svg>

            {/* Floating Glass Data Cards — Per-hub directional positioning */}
            {HUBS.map((hub) => {
              // Tag offset classes based on tagDir
              const tagClasses = {
                top: '-translate-x-1/2 -translate-y-[120%]',
                right: 'translate-x-3 -translate-y-1/2',
                bottomRight: 'translate-x-3 translate-y-3',
                bottom: '-translate-x-1/2 translate-y-3',
                left: '-translate-x-[calc(100%+12px)] -translate-y-1/2',
                topRight: 'translate-x-3 -translate-y-[100%]',
                topLeft: '-translate-x-[calc(100%+12px)] -translate-y-[100%]',
              }[hub.tagDir as string] || '-translate-x-1/2 -translate-y-[120%]'

              return (
                <motion.div
                  key={hub.id}
                  className="absolute z-20 cursor-pointer"
                  style={{ left: `${hub.x}%`, top: `${hub.y}%` }}
                  whileHover={{ scale: 1.1, zIndex: 50 }}
                >
                  <motion.div 
                    className={`
                      bg-bg-primary/95 backdrop-blur-3xl border border-border-color p-2 px-4 rounded-2xl shadow-xl flex items-center gap-3 ${tagClasses} transition-all hover:bg-bg-primary group/hub
                      ${activeView === 'Network Hubs' ? 'ring-2 ring-accent-teal/30 shadow-[0_0_20px_rgba(20,184,166,0.2)]' : ''}
                    `}
                  >
                    <div className="w-8 h-8 rounded-xl bg-bg-card border border-border-color flex items-center justify-center text-lg">{hub.icon}</div>
                    <div>
                      <h4 className="text-[10px] font-black text-text-primary uppercase tracking-tighter mb-0.5">{hub.name}</h4>
                      <p className="text-[12px] font-black text-text-secondary leading-none">{hub.val}</p>
                    </div>
                  </motion.div>
                </motion.div>
              )
            })}

            {/* Floating HUD Pods */}
            <div className="absolute top-8 left-8 space-y-4">
              <Card className="!bg-bg-primary/90 backdrop-blur-2xl !p-6 !rounded-[32px] border-border-color/50 min-w-[220px] shadow-2xl">
                <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.3em] mb-4">Network Status</p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-text-primary">Sync Logic</span>
                    <span className="text-xs font-black text-accent-teal">Online</span>
                  </div>
                  <div className="h-1.5 bg-text-primary/10 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-accent-teal" animate={{ width: ['40%', '90%', '75%'] }} transition={{ duration: 4, repeat: Infinity }} />
                  </div>
                  <p className="text-[9px] text-text-secondary font-bold uppercase italic">Global parity established.</p>
                </div>
              </Card>
            </div>
            
            <div className="absolute bottom-8 left-8">
               <div className="bg-bg-primary/90 backdrop-blur-2xl p-6 rounded-[32px] border border-border-color shadow-2xl">
                  <div className="flex gap-10">
                    <div>
                      <p className="text-[9px] font-black uppercase text-text-secondary tracking-widest mb-1">Global Energy</p>
                      <p className="text-2xl font-black text-text-primary italic tabular-nums">{globalCalories.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-text-secondary tracking-widest mb-1">Live Momentum</p>
                      <p className="text-2xl font-black text-accent-teal italic tabular-nums">{activeNow.toLocaleString()}</p>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* AAA Footer Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-20">
          <div className="bg-accent-purple/10 dark:bg-accent-purple p-8 rounded-[35px] border border-accent-purple/20 dark:border-none text-accent-purple dark:text-white relative overflow-hidden group hover:-translate-y-2 transition-transform shadow-2xl shadow-accent-purple/10">
            <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:rotate-12 transition-transform"><Activity size={100} /></div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-80">Sync Efficiency</p>
            <h4 className="text-4xl font-black italic mb-2 tracking-tighter">98.2%</h4>
            <p className="text-xs opacity-60">Global Network Alignment</p>
          </div>

          <div className="bg-accent-teal/10 dark:bg-accent-teal p-8 rounded-[35px] border border-accent-teal/20 dark:border-none text-accent-teal dark:text-white relative overflow-hidden group hover:-translate-y-2 transition-transform shadow-2xl shadow-accent-teal/10">
            <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:rotate-12 transition-transform"><Zap size={100} /></div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-80">Daily Hub Growth</p>
            <h4 className="text-4xl font-black italic mb-2 tracking-tighter">+12.4%</h4>
            <p className="text-xs opacity-60">Expanding Global Footprint</p>
          </div>

          <div className="bg-accent-orange/10 dark:bg-accent-orange p-8 rounded-[35px] border border-accent-orange/20 dark:border-none text-accent-orange dark:text-white relative overflow-hidden group hover:-translate-y-2 transition-transform shadow-2xl shadow-accent-orange/10">
            <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:rotate-12 transition-transform"><Sparkles size={100} /></div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-80">Burst Capacity</p>
            <h4 className="text-4xl font-black italic mb-2 tracking-tighter">LVL 09</h4>
            <p className="text-xs opacity-60">Tier Peak Performance</p>
          </div>

          <div className="p-6 rounded-[35px] border border-border-color bg-bg-card relative overflow-hidden">
            <p className="text-[10px] font-black uppercase text-text-secondary tracking-[0.2em] mb-4">Pulse Insights</p>
            <div className="relative h-24 flex items-center justify-center">
               <motion.div className="w-16 h-16 rounded-full bg-accent-purple/30 blur-xl absolute" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 4, repeat: Infinity }} />
               <motion.div 
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="w-12 h-12 rounded-full bg-bg-primary border-4 border-accent-purple flex items-center justify-center text-accent-purple z-10"
               >
                  <TrendingUp size={24} />
               </motion.div>
            </div>
          </div>
        </div>

        {/* Global Kudos Control */}
        <div className="flex justify-center my-8">
          <KudosButton />
        </div>
      </div>
    </>
  )
}
