import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { Camera, Image as ImageIcon, Plus, Trash2, ArrowRight } from 'lucide-react'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import { toast } from 'sonner'

export default function ProgressVisualizer() {
  const [photos, setPhotos] = useState<string[]>([])
  const [sliderPosition, setSliderPosition] = useState(50)

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPhotos(prev => [...prev, url].slice(-2))
    toast.success('Photo added to comparison vault')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Helmet><title>Progress Visualizer — Insta Coach</title></Helmet>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight">Progress Visualizer</h1>
          <p className="text-text-secondary mt-1">Compare your transformation side-by-side</p>
        </div>
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <div className="inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 cursor-pointer bg-transparent border border-accent-purple text-accent-purple hover:bg-accent-purple hover:text-white px-5 py-2.5 text-sm rounded-xl">
              <Camera size={18} />
              Add Photo
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </div>
          </label>
        </div>
      </div>

      {photos.length < 2 ? (
        <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed border-2">
          <div className="w-20 h-20 bg-accent-purple/10 rounded-full flex items-center justify-center mb-4">
            <ImageIcon size={32} className="text-accent-purple" />
          </div>
          <h3 className="text-lg font-bold text-text-primary">Unlock Transformation View</h3>
          <p className="text-text-secondary mt-2 max-w-sm">Upload at least two photos to see your transformation slider. We recommend using the same pose and lighting.</p>
          <div className="mt-8 flex gap-4">
            {photos.map((p, i) => (
              <div key={i} className="w-24 h-24 rounded-xl overflow-hidden border border-border-color">
                <img src={p} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            {[...Array(2 - photos.length)].map((_, i) => (
              <div key={i} className="w-24 h-24 rounded-xl border border-dashed border-border-color bg-bg-primary/50 flex items-center justify-center">
                <Plus size={20} className="text-text-secondary" />
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="relative aspect-[4/5] md:aspect-video rounded-3xl overflow-hidden shadow-2xl bg-bg-card border border-border-color group">
            {/* Before */}
            <div className="absolute inset-0">
              <img src={photos[0]} alt="Before" className="w-full h-full object-cover" />
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest">Before</div>
            </div>

            {/* After */}
            <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}>
              <img src={photos[1]} alt="After" className="w-full h-full object-cover" />
              <div className="absolute top-4 right-4 bg-accent-purple/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest">After</div>
            </div>

            {/* Slider Handle */}
            <div className="absolute inset-y-0 w-1 bg-white shadow-[0_0_15px_rgba(0,0,0,0.5)] z-10" style={{ left: `${sliderPosition}%` }}>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing">
                <div className="flex gap-1">
                  <div className="w-0.5 h-4 bg-gray-300" />
                  <div className="w-0.5 h-4 bg-gray-300" />
                </div>
              </div>
            </div>

            <input 
              type="range" min="0" max="100" value={sliderPosition} 
              onChange={e => setSliderPosition(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            />
          </div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setPhotos([])} className="text-red-400 hover:text-red-300" leftIcon={<Trash2 size={18} />}>Clear Gallery</Button>
            <div className="flex items-center gap-3 text-sm text-text-secondary bg-bg-card px-4 py-2 rounded-xl border border-border-color">
              <span>Swipe to compare</span>
              <ArrowRight size={14} className="animate-pulse" />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-12">
        <Card className="space-y-3">
          <h4 className="font-bold text-text-primary">Transformation Tips</h4>
          <ul className="text-sm text-text-secondary space-y-2">
            <li className="flex gap-2"><span>📸</span> Consistency is key—try to take photos at the same time of day.</li>
            <li className="flex gap-2"><span>💡</span> Use natural side lighting to highlight muscle definition.</li>
            <li className="flex gap-2"><span>📏</span> Stand at the same distance from the camera every time.</li>
          </ul>
        </Card>
        <Card className="bg-gradient-to-br from-accent-purple/10 to-transparent border-accent-purple/20 space-y-3">
          <h4 className="font-bold text-text-primary">Share with Coach</h4>
          <p className="text-sm text-text-secondary">Your coach can see your transformation vault to provide better feedback on your training and nutrition progress.</p>
          <Button fullWidth variant="secondary" size="sm">Notify Coach</Button>
        </Card>
      </div>
    </div>
  )
}
