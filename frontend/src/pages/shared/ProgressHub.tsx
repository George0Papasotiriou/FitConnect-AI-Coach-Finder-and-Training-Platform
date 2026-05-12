import { motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { 
  Camera, Brain, Heart, Sun, Search, 
<<<<<<< HEAD
  ArrowRight, Sparkles, TrendingUp, ShieldCheck, Box
=======
  ArrowRight, Sparkles, TrendingUp, ShieldCheck 
>>>>>>> 28ad2278a7bf82835d1bd4cd03e2cc8facff4fff
} from 'lucide-react'
import Card from '../../components/common/Card'

export default function ProgressHub() {
  const navigate = useNavigate()

  const items = [
    { 
      to: '/progress', 
      icon: <Camera size={28} />, 
      label: 'Progress Vault', 
      desc: 'Visualize your physical transformation over time.',
      color: 'text-accent-teal',
      bg: 'bg-accent-teal/10',
      gradient: 'from-accent-teal/20 to-transparent'
    },
    { 
      to: '/form-critic', 
      icon: <Brain size={28} />, 
      label: 'Form Critic', 
      desc: 'AI-powered analysis of your exercise execution.',
      color: 'text-accent-purple',
      bg: 'bg-accent-purple/10',
      gradient: 'from-accent-purple/20 to-transparent'
    },
    { 
      to: '/recovery', 
      icon: <Heart size={28} />, 
      label: 'Recovery Hub', 
      desc: 'Monitor sleep, strain, and readiness scores.',
      color: 'text-red-400',
      bg: 'bg-red-400/10',
      gradient: 'from-red-400/20 to-transparent'
    },
    { 
      to: '/circadian', 
      icon: <Sun size={28} />, 
      label: 'Body Rhythm', 
      desc: 'Optimize your metabolic window and sleep cycles.',
      color: 'text-accent-orange',
      bg: 'bg-accent-orange/10',
      gradient: 'from-accent-orange/20 to-transparent'
    },
    { 
      to: '/search', 
      icon: <Search size={28} />, 
      label: 'Find a Coach', 
      desc: 'Connect with elite trainers around the world.',
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
      gradient: 'from-blue-400/20 to-transparent'
    },
    { 
      to: '/achievements', 
      icon: <TrendingUp size={28} />, 
      label: 'Performance', 
      desc: 'View your milestones and ranking progress.',
      color: 'text-accent-purple',
      bg: 'bg-accent-purple/10',
      gradient: 'from-accent-purple/20 to-transparent'
<<<<<<< HEAD
    },
    { 
      to: '/virtual-gym', 
      icon: <Box size={28} />, 
      label: 'Solo Trainer', 
      desc: 'Train virtually in an advanced AI-powered gym environment.',
      color: 'text-indigo-400',
      bg: 'bg-indigo-400/10',
      gradient: 'from-indigo-400/20 to-transparent'
=======
>>>>>>> 28ad2278a7bf82835d1bd4cd03e2cc8facff4fff
    }
  ]

  return (
    <>
      <Helmet><title>My Progress — Insta Coach</title></Helmet>
      
      <div className="max-w-5xl mx-auto space-y-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-purple/10 border border-accent-purple/20 text-accent-purple text-xs font-bold uppercase tracking-widest mb-2">
            <Sparkles size={12} /> Performance Center
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-text-primary tracking-tight">
            My <span className="gradient-text">Progress Hub</span>
          </h1>
          <p className="text-text-secondary max-w-xl mx-auto font-medium">
            Everything you need to track, analyze, and optimize your fitness journey in one powerful dashboard.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, i) => (
            <motion.div
              key={item.to}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5 }}
              onClick={() => navigate(item.to)}
              className="group cursor-pointer"
            >
              <div className="h-full bg-bg-card border border-border-color rounded-[2.5rem] p-8 relative overflow-hidden transition-all duration-300 group-hover:border-white/10 group-hover:shadow-2xl group-hover:shadow-black/50">
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className={`w-14 h-14 ${item.bg} ${item.color} rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                    {item.icon}
                  </div>
                  
                  <h3 className="text-xl font-black text-text-primary mb-2 flex items-center gap-2">
                    {item.label}
                    <ArrowRight size={16} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-accent-purple" />
                  </h3>
                  
                  <p className="text-sm text-text-secondary font-medium leading-relaxed mb-6">
                    {item.desc}
                  </p>

                  <div className="mt-auto flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-50 group-hover:opacity-100 group-hover:text-accent-purple transition-all">
                    <ShieldCheck size={12} /> Live Metrics Active
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/5 blur-3xl rounded-full" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Floating Background Glow */}
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-purple/5 blur-[120px] rounded-full -z-10 pointer-events-none" />
      </div>
    </>
  )
}
