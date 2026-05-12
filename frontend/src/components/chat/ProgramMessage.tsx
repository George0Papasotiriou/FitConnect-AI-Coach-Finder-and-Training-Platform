import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Calendar, ChevronRight, ChevronLeft, 
<<<<<<< HEAD
  Dumbbell, Clock, Info, ExternalLink, Map, X
=======
  Dumbbell, Clock, Info, ExternalLink, Map
>>>>>>> 28ad2278a7bf82835d1bd4cd03e2cc8facff4fff
} from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import Badge from '../common/Badge';
import apiClient from '../../api/client';
<<<<<<< HEAD
import ProgramBuilder from '../trainer/ProgramBuilder';
=======
>>>>>>> 28ad2278a7bf82835d1bd4cd03e2cc8facff4fff

export default function ProgramMessage({ content }: { content: string }) {
  const [programData, setProgramData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0);
<<<<<<< HEAD
  const [isEditingProgram, setIsEditingProgram] = useState(false);
=======
  const [showDetails, setShowDetails] = useState(false);
>>>>>>> 28ad2278a7bf82835d1bd4cd03e2cc8facff4fff

  useEffect(() => {
    try {
      const { programId } = JSON.parse(content);
      apiClient.get(`/programs/${programId}`)
        .then(res => {
          setProgramData(res.data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } catch {
      setLoading(false);
    }
  }, [content]);

  if (loading) return <div className="p-4 bg-bg-secondary/50 rounded-2xl animate-pulse">Loading program...</div>;
  if (!programData) return <div className="p-4 bg-red-500/10 text-red-500 rounded-2xl">Program data unavailable</div>;

  const currentDay = programData.days[selectedDay];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md w-full overflow-hidden rounded-3xl border border-line-color bg-bg-primary shadow-2xl"
    >
      {/* Header */}
      <div className="relative h-32 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-6 flex flex-col justify-end">
        <div className="absolute top-4 right-4">
          <Badge variant="teal">
            <Dumbbell size={10} className="mr-1" /> Training Program
          </Badge>
        </div>
        <h3 className="text-xl font-black text-white leading-tight">{programData.name}</h3>
        <p className="text-white/70 text-xs truncate">{programData.description}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Day Selector */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
          {programData.days.map((day: any, i: number) => (
            <button
              key={day.id}
              onClick={() => setSelectedDay(i)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                selectedDay === i 
                  ? 'bg-accent-purple text-white shadow-lg shadow-accent-purple/30' 
                  : 'bg-bg-secondary text-text-secondary hover:bg-line-color'
              }`}
            >
              {day.dayDate}
            </button>
          ))}
        </div>

        {/* Exercises List */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={selectedDay}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-2"
          >
            {currentDay?.exercises.length > 0 ? (
              currentDay.exercises.map((ex: any, i: number) => (
                <div 
                  key={ex.id}
                  className="flex items-center justify-between p-3 bg-bg-secondary/40 rounded-2xl border border-transparent hover:border-accent-purple/20 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-bg-primary flex items-center justify-center text-accent-purple font-black text-xs border border-line-color">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-text-primary group-hover:text-accent-purple transition-colors">
                        {ex.exerciseName}
                      </p>
                      <p className="text-[10px] text-text-secondary">
                        {ex.sets} × {ex.reps} {ex.weight ? ` @ ${ex.weight}kg` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {ex.videoUrl && (
                      <a 
                        href={ex.videoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                        title="Watch Tutorial"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Play size={12} fill="currentColor" />
                      </a>
                    )}
                    <button 
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-bg-primary text-text-secondary hover:text-accent-teal transition-all"
                      title="Show Details"
                    >
                      <Info size={12} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-text-secondary text-center py-4 italic">No exercises planned for this day.</p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-line-color flex items-center justify-between">
          <div className="flex items-center gap-1 text-[10px] text-text-secondary">
            <Map size={12} className="text-accent-teal" />
            <span>Comprehensive Map View</span>
          </div>
          <Button 
            size="sm" 
            variant="ghost" 
            className="!py-1 !px-2 !text-[10px] !rounded-full"
<<<<<<< HEAD
            onClick={() => setIsEditingProgram(true)}
=======
            onClick={() => window.open(`/programs/${programData.id}`, '_blank')}
>>>>>>> 28ad2278a7bf82835d1bd4cd03e2cc8facff4fff
          >
            Open Full View <ExternalLink size={10} className="ml-1" />
          </Button>
        </div>
      </div>
<<<<<<< HEAD

      <AnimatePresence>
        {isEditingProgram && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-card w-full max-w-4xl rounded-3xl border border-line-color p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-text-primary">Program Builder</h2>
                <Button variant="ghost" onClick={() => setIsEditingProgram(false)}>
                  <X size={20} />
                </Button>
              </div>
              <ProgramBuilder program={programData} onSave={() => setIsEditingProgram(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
=======
>>>>>>> 28ad2278a7bf82835d1bd4cd03e2cc8facff4fff
    </motion.div>
  );
}
