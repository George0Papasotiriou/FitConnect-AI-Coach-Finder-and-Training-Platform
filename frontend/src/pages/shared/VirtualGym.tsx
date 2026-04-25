import { motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { Box, Sparkles, User, Play, ChevronRight, Monitor, Zap } from 'lucide-react'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'

export default function VirtualGym() {
  return (
    <>
      <Helmet><title>Virtual Gym Studio — Insta Coach</title></Helmet>
      
      <div className="max-w-6xl mx-auto h-[calc(100vh-120px)] flex flex-col">
        <header className="mb-8">
           <h1 className="text-3xl font-black text-text-primary flex items-center gap-3 italic uppercase tracking-tighter">
              <Box className="text-accent-purple" /> Virtual Gym Studio
           </h1>
           <p className="text-text-secondary mt-1 tracking-wide">Immersive XR-ready training environments for elite performance.</p>
        </header>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8">
           {/* Immersive Viewport */}
           <Card className="lg:col-span-3 h-full relative overflow-hidden bg-black p-0 group border-none shadow-2xl">
              <div 
                className="absolute inset-0 z-0 bg-[url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-40 grayscale group-hover:scale-105 transition-transform duration-[10s]"
              />
              
              {/* Virtual HUD Overlays */}
              <div className="absolute inset-0 z-10 flex flex-col justify-between p-8 pointer-events-none">
                 <div className="flex justify-between items-start">
                    <div className="space-y-1">
                       <div className="px-3 py-1 bg-accent-purple/20 backdrop-blur-md rounded-full border border-accent-purple/30 inline-flex items-center gap-2">
                          <span className="w-2 h-2 bg-accent-purple rounded-full animate-pulse" />
                          <span className="text-[10px] font-black text-accent-purple uppercase tracking-widest">XR Studio Alpha</span>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-xl font-black text-white italic">0:00:00</p>
                       <p className="text-[9px] font-black text-white/40 uppercase">Environment Latency: 4ms</p>
                    </div>
                 </div>

                 <div className="flex items-end justify-between">
                    <div className="max-w-xs space-y-4 pointer-events-auto">
                       <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none shadow-black drop-shadow-2xl">Hyper-Realistic Performance Hall</h2>
                       <p className="text-sm text-white/60 font-medium leading-relaxed">
                         Optimized for Quest 3 & Apple Vision Pro. Experience 1:1 spatial audio and ultra-low latency form correction.
                       </p>
                       <div className="flex gap-4">
                          <Button size="lg" variant="primary" leftIcon={<Play size={20} />}>Enter VR Portal</Button>
                          <Button size="lg" variant="ghost" className="bg-white/10 hover:bg-white/20 border-white/20 text-white">Join as Spectator</Button>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pointer-events-auto">
                       <div className="p-4 bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 text-center">
                          <p className="text-[9px] font-black text-white/40 uppercase mb-1">Participants</p>
                          <div className="flex -space-x-2 justify-center">
                             {[1, 2, 3].map(i => (
                               <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-accent-teal flex items-center justify-center text-xs font-black text-white">
                                 <User size={14} />
                               </div>
                             ))}
                          </div>
                       </div>
                       <Card className="!p-4 bg-accent-teal/10 backdrop-blur-xl border-accent-teal/30 text-center">
                          <p className="text-[9px] font-black text-accent-teal uppercase mb-1">Server Status</p>
                          <p className="text-lg font-black text-white">Online</p>
                       </Card>
                    </div>
                 </div>
              </div>

              {/* Perspective Shadows for 3D depth */}
              <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_200px_rgba(0,0,0,0.8)]" />
           </Card>

           {/* Settings / Selection Sidebar */}
           <div className="space-y-6">
              <Card className="h-full">
                 <h3 className="font-black text-text-primary text-xs uppercase italic tracking-widest mb-6 flex items-center gap-2">
                    <Monitor size={18} className="text-accent-teal" /> Render Settings
                 </h3>

                 <div className="space-y-6">
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black text-text-secondary uppercase">Active Environment</h4>
                       <div className="space-y-2">
                          {[
                            { name: 'Neon Powerhouse', status: 'Peaking', active: true },
                            { name: 'Zen Sky-Garden', status: 'Restful', active: false },
                            { name: 'The Void Studio', status: 'Focused', active: false }
                          ].map(env => (
                             <div key={env.name} className={`p-4 rounded-2xl border transition-all cursor-pointer group ${env.active ? 'bg-accent-teal/5 border-accent-teal/40 shadow-lg shadow-accent-teal/5' : 'bg-bg-primary border-border-color hover:border-text-secondary'}`}>
                                <div className="flex justify-between items-center">
                                   <p className={`text-sm font-black ${env.active ? 'text-accent-teal' : 'text-text-primary'}`}>{env.name}</p>
                                   <ChevronRight size={14} className={env.active ? 'text-accent-teal' : 'text-text-secondary'} />
                                </div>
                                <p className="text-[9px] font-bold text-text-secondary uppercase mt-1">Vibe: {env.status}</p>
                             </div>
                          ))}
                       </div>
                    </div>

                    <div className="pt-6 border-t border-border-color space-y-4">
                       <div className="p-4 bg-orange-400/5 border border-orange-400/20 rounded-2xl flex items-start gap-3">
                          <Zap size={18} className="text-orange-400 flex-shrink-0" />
                          <p className="text-[11px] text-orange-400 font-medium leading-normal italic">
                            Performance Boost: Using native XR rendering increases metabolic tracking accuracy by 14%.
                          </p>
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
