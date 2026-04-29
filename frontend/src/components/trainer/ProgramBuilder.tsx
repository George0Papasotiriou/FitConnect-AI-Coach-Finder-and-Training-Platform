import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, X, Save, Sparkles, Calendar, Trash2, ChevronDown, 
  ChevronUp, Play, GripVertical, Check, Info, Search, Send, User
} from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { toast } from 'sonner';
import apiClient from '../../api/client';

interface Exercise {
  id: string;
  exerciseName: string;
  exerciseCategory: string;
  sets: number;
  reps: number;
  weight?: number;
  duration?: number;
  notes: string;
  videoUrl?: string;
  sortOrder: number;
}

interface Day {
  id: string;
  dayDate: string;
  notes: string;
  exercises: Exercise[];
}

interface Program {
  id?: string;
  name: string;
  description: string;
  days: Day[];
}

const CATEGORIES = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Sport', 'Flexibility'];

export default function ProgramBuilder({ onSave, program: initialProgram }: { onSave?: () => void, program?: any }) {
  const [program, setProgram] = useState<Program>(initialProgram || {
    name: 'New Workout Program',
    description: 'Custom training plan created for you',
    days: []
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    apiClient.get('/trainer/clients').then(res => setClients(res.data)).catch(() => {});
  }, []);

  const addDay = () => {
    const newDay: Day = {
      id: Math.random().toString(36).substr(2, 9),
      dayDate: `Day ${program.days.length + 1}`,
      notes: '',
      exercises: []
    };
    setProgram({ ...program, days: [...program.days, newDay] });
    setExpandedDay(program.days.length);
  };

  const removeDay = (index: number) => {
    const newDays = [...program.days];
    newDays.splice(index, 1);
    setProgram({ ...program, days: newDays });
  };

  const addExercise = (dayIndex: number) => {
    const newExercise: Exercise = {
      id: Math.random().toString(36).substr(2, 9),
      exerciseName: 'New Exercise',
      exerciseCategory: 'Chest',
      sets: 3,
      reps: 10,
      notes: '',
      sortOrder: program.days[dayIndex].exercises.length
    };
    const newDays = [...program.days];
    newDays[dayIndex].exercises.push(newExercise);
    setProgram({ ...program, days: newDays });
  };

  const updateExercise = (dayIndex: number, exerciseIndex: number, updates: Partial<Exercise>) => {
    const newDays = [...program.days];
    newDays[dayIndex].exercises[exerciseIndex] = { 
      ...newDays[dayIndex].exercises[exerciseIndex], 
      ...updates 
    };
    setProgram({ ...program, days: newDays });
  };

  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    const newDays = [...program.days];
    newDays[dayIndex].exercises.splice(exerciseIndex, 1);
    setProgram({ ...program, days: newDays });
  };

  const generateWithAI = async () => {
    setIsGenerating(true);
    try {
      const response = await apiClient.post('/ai/generate-program', {
        goals: ['Muscle growth', 'Strength'],
        fitnessLevel: 'Advanced',
        daysPerWeek: 4
      });
      
      const aiProgram = response.data;
      const formattedDays = aiProgram.days.map((d: any, i: number) => ({
        id: Math.random().toString(36).substr(2, 9),
        dayDate: d.dayOfWeek,
        notes: '',
        exercises: d.exercises.map((ex: any, j: number) => ({
          id: Math.random().toString(36).substr(2, 9),
          exerciseName: ex.name,
          exerciseCategory: ex.category,
          sets: ex.sets || 3,
          reps: ex.reps || 10,
          notes: ex.notes || '',
          videoUrl: ex.videoUrl,
          sortOrder: j
        }))
      }));

      setProgram({
        ...program,
        name: aiProgram.name,
        description: aiProgram.description,
        days: formattedDays
      });
      setExpandedDay(0);
      toast.success('AI Program Generated!');
    } catch (err) {
      toast.error('Failed to generate program');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveProgram = async () => {
    try {
      if (program.id) {
        await apiClient.put(`/programs/${program.id}`, program);
      } else {
        const res = await apiClient.post('/programs', { name: program.name, description: program.description });
        await apiClient.put(`/programs/${res.data.id}`, { ...program, id: res.data.id });
      }
      toast.success('Program saved successfully!');
      if (onSave) onSave();
    } catch (err) {
      toast.error('Failed to save program');
    }
  };

  const shareProgram = async (clientId: string) => {
    if (!program.id) {
        toast.error('Please save the program first');
        return;
    }
    setIsSharing(true);
    try {
      await apiClient.post(`/programs/${program.id}/share`, { recipientId: clientId });
      toast.success('Program shared successfully!');
      setShowShareModal(false);
    } catch (err) {
      toast.error('Failed to share program');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <input 
            value={program.name} 
            onChange={e => setProgram({ ...program, name: e.target.value })}
            className="text-2xl font-black text-text-primary bg-transparent border-none focus:ring-0 w-full p-0 mb-1"
          />
          <input 
            value={program.description} 
            onChange={e => setProgram({ ...program, description: e.target.value })}
            className="text-sm text-text-secondary bg-transparent border-none focus:ring-0 w-full p-0"
            placeholder="Describe this program..."
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            onClick={generateWithAI} 
            disabled={isGenerating}
            className="!text-accent-purple"
          >
            {isGenerating ? <Sparkles className="animate-spin mr-2" size={16} /> : <Sparkles className="mr-2" size={16} />}
            AI Builder
          </Button>
          <Button variant="ghost" onClick={() => setShowShareModal(true)} disabled={!program.id} className="text-accent-teal">
            <Send className="mr-2" size={16} /> Share
          </Button>
          <Button onClick={saveProgram}>
            <Save className="mr-2" size={16} /> Save Program
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-bg-card w-full max-w-md rounded-3xl border border-line-color shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-text-primary">Share Program</h3>
                <button onClick={() => setShowShareModal(false)} className="text-text-secondary hover:text-text-primary"><X size={20} /></button>
              </div>
              <p className="text-sm text-text-secondary mb-4">Select a client to share "{program.name}" with:</p>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {clients.filter(c => c.status === 'accepted').map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-bg-primary rounded-2xl border border-line-color hover:border-accent-purple/30 transition-all cursor-pointer group" onClick={() => shareProgram(c.trainee.id)}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent-purple/20 flex items-center justify-center text-accent-purple font-bold">
                        {c.trainee.name?.[0] || <User size={20} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text-primary group-hover:text-accent-purple transition-colors">{c.trainee.name}</p>
                        <p className="text-[10px] text-text-secondary">{c.trainee.fitnessLevel}</p>
                      </div>
                    </div>
                    <Send size={14} className="text-text-secondary group-hover:text-accent-purple" />
                  </div>
                ))}
                {clients.filter(c => c.status === 'accepted').length === 0 && (
                  <p className="text-xs text-text-secondary text-center py-8">No active clients found.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid gap-4">
        {program.days.map((day, dIndex) => (
          <Card key={day.id} className="p-0 overflow-hidden border-2 border-transparent hover:border-bg-secondary transition-colors">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer bg-bg-secondary/30"
              onClick={() => setExpandedDay(expandedDay === dIndex ? null : dIndex)}
            >
              <div className="flex items-center gap-3">
                <Calendar className="text-accent-purple" size={20} />
                <div>
                  <input 
                    value={day.dayDate} 
                    onChange={e => {
                      const newDays = [...program.days];
                      newDays[dIndex].dayDate = e.target.value;
                      setProgram({ ...program, days: newDays });
                    }}
                    onClick={e => e.stopPropagation()}
                    className="font-bold text-text-primary bg-transparent border-none focus:ring-0 p-0 text-sm"
                  />
                  <p className="text-xs text-text-secondary">{day.exercises.length} exercises</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="!p-1 text-red-500 hover:bg-red-500/10"
                  onClick={(e) => { e.stopPropagation(); removeDay(dIndex); }}
                >
                  <Trash2 size={16} />
                </Button>
                {expandedDay === dIndex ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>

            <AnimatePresence>
              {expandedDay === dIndex && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 space-y-4 border-t border-line-color bg-bg-primary/50">
                    <textarea 
                      placeholder="Add notes for this day (e.g. Warmup instructions...)"
                      value={day.notes}
                      onChange={e => {
                        const newDays = [...program.days];
                        newDays[dIndex].notes = e.target.value;
                        setProgram({ ...program, days: newDays });
                      }}
                      className="w-full text-xs text-text-secondary bg-bg-secondary/50 rounded-xl p-3 border-line-color focus:border-accent-purple resize-none"
                    />

                    <div className="space-y-3">
                      {day.exercises.map((ex, eIndex) => (
                        <div key={ex.id} className="relative group p-4 bg-bg-secondary/50 rounded-2xl border border-line-color hover:border-accent-purple/30 transition-all">
                          <div className="grid md:grid-cols-4 gap-4">
                            <div className="col-span-2 space-y-2">
                              <label className="text-[10px] uppercase font-bold text-text-secondary tracking-widest">Exercise Name</label>
                              <div className="flex items-center gap-2">
                                <Search size={14} className="text-text-secondary" />
                                <input 
                                  value={ex.exerciseName}
                                  onChange={e => updateExercise(dIndex, eIndex, { exerciseName: e.target.value })}
                                  className="w-full text-sm font-bold text-text-primary bg-transparent border-none focus:ring-0 p-0"
                                  placeholder="e.g. Bench Press"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] uppercase font-bold text-text-secondary tracking-widest">Category</label>
                              <select 
                                value={ex.exerciseCategory}
                                onChange={e => updateExercise(dIndex, eIndex, { exerciseCategory: e.target.value })}
                                className="w-full text-xs bg-bg-primary rounded-lg border-line-color p-2 focus:ring-1 ring-accent-purple outline-none"
                              >
                                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                              </select>
                            </div>
                            <div className="flex items-start justify-end gap-2">
                               <Button 
                                size="sm" 
                                variant="ghost" 
                                className="!p-1 text-red-500/50 hover:text-red-500 hover:bg-red-500/10"
                                onClick={() => removeExercise(dIndex, eIndex)}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mt-4">
                            <div className="space-y-1">
                              <span className="text-[10px] text-text-secondary">Sets</span>
                              <input type="number" value={ex.sets} onChange={e => updateExercise(dIndex, eIndex, { sets: parseInt(e.target.value) })} className="w-full bg-bg-primary rounded-lg p-2 text-sm font-black border-line-color" />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] text-text-secondary">Reps</span>
                              <input type="number" value={ex.reps} onChange={e => updateExercise(dIndex, eIndex, { reps: parseInt(e.target.value) })} className="w-full bg-bg-primary rounded-lg p-2 text-sm font-black border-line-color" />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] text-text-secondary">Weight (kg)</span>
                              <input type="number" value={ex.weight || ''} onChange={e => updateExercise(dIndex, eIndex, { weight: parseFloat(e.target.value) })} className="w-full bg-bg-primary rounded-lg p-2 text-sm font-black border-line-color" />
                            </div>
                            <div className="col-span-3 space-y-1">
                              <span className="text-[10px] text-text-secondary">YouTube Video URL</span>
                              <div className="flex items-center gap-2 bg-bg-primary rounded-lg px-2 border border-line-color">
                                <Play size={12} className="text-red-500" />
                                <input 
                                  value={ex.videoUrl || ''} 
                                  onChange={e => updateExercise(dIndex, eIndex, { videoUrl: e.target.value })} 
                                  className="w-full bg-transparent border-none focus:ring-0 p-2 text-[10px] text-accent-teal" 
                                  placeholder="https://youtube.com/..."
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button 
                      variant="ghost" 
                      className="w-full border-2 border-dashed border-line-color hover:border-accent-purple/50 !rounded-2xl py-6"
                      onClick={() => addExercise(dIndex)}
                    >
                      <Plus className="mr-2" size={18} /> Add Exercise
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        ))}

        <Button 
          variant="ghost" 
          className="w-full py-8 !rounded-3xl border-2 border-dashed"
          onClick={addDay}
        >
          <Calendar className="mr-2" size={20} /> Add New Training Day
        </Button>
      </div>
    </div>
  );
}
