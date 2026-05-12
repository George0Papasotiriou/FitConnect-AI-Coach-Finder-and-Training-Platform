import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Moon, Volume2, Eye, Type, Bell, Shield, LogOut, Camera, User as UserIcon, Heart, Activity } from 'lucide-react'
import apiClient from '../../api/client'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Avatar from '../../components/common/Avatar'
import { useAuthStore } from '../../store/authStore'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

export default function Settings() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [settings, setSettings] = useState({
    highContrast: localStorage.getItem('fc_highContrast') === 'true',
    fontSize: parseInt(localStorage.getItem('fc_fontSize') || '16'),
    reduceMotion: localStorage.getItem('fc_reduceMotion') === 'true',
    voiceNavigation: localStorage.getItem('fc_voiceNav') === 'true',
    notificationsEnabled: localStorage.getItem('fc_notificationsEnabled') !== 'false',
    soundEnabled: true,
    wearableConnected: localStorage.getItem('fc_wearable') === 'true',
  })
  const [syncing, setSyncing] = useState(false)

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    localStorage.setItem(`fc_${key}`, String(value))

    if (key === 'highContrast') document.documentElement.classList.toggle('high-contrast', value)
    if (key === 'fontSize') document.documentElement.style.fontSize = `${value}px`
    if (key === 'reduceMotion') document.documentElement.classList.toggle('reduce-motion', value)
    toast.success('Setting updated')
  }

  const handleLogout = () => { logout(); navigate('/') }

  const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
    <button role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={`w-12 h-6 rounded-full transition-colors relative ${checked ? 'bg-accent-purple' : 'bg-border-color'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  )

  return (
    <>
      <Helmet><title>Settings — Insta Coach</title></Helmet>
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-black text-text-primary flex items-center gap-2"><SettingsIcon size={24} className="text-accent-purple" /> Settings</h1>
        </motion.div>

        <Card>
          <h2 className="font-bold text-text-primary mb-6 flex items-center gap-2"><UserIcon size={18} className="text-accent-purple" /> Profile Picture</h2>
          <div className="flex flex-col items-center gap-6 py-4">
            <div className="relative group">
              <Avatar 
                src={user?.avatar ? (user.avatar.startsWith('http') ? user.avatar : `http://localhost:3001${user.avatar}`) : undefined} 
                name={user?.name} 
                size="xl2" 
                showStatus={false}
              />
              <label 
                className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer rounded-full backdrop-blur-[2px]"
                title="Change profile picture"
              >
                <Camera size={28} className="text-white mb-2" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Change Photo</span>
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  
                  const formData = new FormData()
                  formData.append('avatar', file)
                  
                  try {
                    const res = await apiClient.post('/upload/avatar', formData, {
                      headers: { 'Content-Type': 'multipart/form-data' }
                    })
                    toast.success('Profile picture updated')
                    useAuthStore.getState().setUser({ ...user!, avatar: res.data.avatar })
                  } catch (err) {
                    toast.error('Failed to upload image')
                  }
                }} />
              </label>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-text-primary">{user?.name}</p>
              <p className="text-xs text-text-secondary mt-1 max-w-[200px]">JPG, PNG or GIF. Recommended size 400x400px.</p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-bold text-text-primary mb-4 flex items-center gap-2"><Eye size={18} className="text-accent-teal" /> Accessibility</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-text-primary">High Contrast Mode</p><p className="text-xs text-text-secondary">Increase contrast for better visibility</p></div>
              <Toggle checked={settings.highContrast} onChange={v => updateSetting('highContrast', v)} label="High contrast" />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-text-primary">Reduce Motion</p><p className="text-xs text-text-secondary">Minimize animations throughout the app</p></div>
              <Toggle checked={settings.reduceMotion} onChange={v => updateSetting('reduceMotion', v)} label="Reduce motion" />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-text-primary">Voice Navigation</p><p className="text-xs text-text-secondary">Enable voice commands for hands-free use</p></div>
              <Toggle checked={settings.voiceNavigation} onChange={v => updateSetting('voiceNavigation', v)} label="Voice navigation" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-text-primary flex items-center gap-2"><Type size={14} /> Font Size: {settings.fontSize}px</p>
              </div>
              <input type="range" min="12" max="24" value={settings.fontSize} onChange={e => updateSetting('fontSize', parseInt(e.target.value))}
                className="w-full accent-accent-purple" aria-label="Font size" />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-bold text-text-primary mb-4 flex items-center gap-2"><Bell size={18} className="text-accent-orange" /> Notifications</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-text-primary">Push Notifications</p><p className="text-xs text-text-secondary">Receive notifications for messages and sessions</p></div>
              <Toggle checked={settings.notificationsEnabled} onChange={v => updateSetting('notificationsEnabled', v)} label="Notifications" />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-text-primary">Sound Effects</p><p className="text-xs text-text-secondary">Play sounds for messages and alerts</p></div>
              <Toggle checked={settings.soundEnabled} onChange={v => updateSetting('soundEnabled', v)} label="Sound" />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-bold text-text-primary mb-4 flex items-center gap-2"><Heart size={18} className="text-red-400" /> Wearable Integration</h2>
          <div className="space-y-4">
             <div className="flex items-center justify-between p-4 bg-bg-primary rounded-2xl border border-border-color">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-bg-card flex items-center justify-center">
                      <Activity className={settings.wearableConnected ? 'text-accent-teal' : 'text-text-secondary'} size={20} />
                   </div>
                   <div>
                      <p className="text-sm font-bold text-text-primary">Apple Health / Google Fit</p>
                      <p className="text-xs text-text-secondary">{settings.wearableConnected ? 'Status: Synced' : 'Not connected'}</p>
                   </div>
                </div>
                <Button 
                  size="sm" 
                  variant={settings.wearableConnected ? 'ghost' : 'primary'}
                  disabled={syncing}
                  onClick={async () => {
                    if (settings.wearableConnected) {
                       updateSetting('wearableConnected', false)
                       return
                    }
                    setSyncing(true)
                    await new Promise(r => setTimeout(r, 2000))
                    updateSetting('wearableConnected', true)
                    setSyncing(false)
                    toast.success('Successfully connected to health provider')
                  }}
                >
                  {syncing ? 'Linking...' : settings.wearableConnected ? 'Disconnect' : 'Connect'}
                </Button>
             </div>
             
             {settings.wearableConnected && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-2 gap-3 pt-2">
                   <div className="p-3 bg-bg-primary rounded-xl border border-border-color text-center">
                      <p className="text-[10px] font-black text-text-secondary uppercase">Resting HR</p>
                      <p className="text-lg font-black text-text-primary">64 BPM</p>
                   </div>
                   <div className="p-3 bg-bg-primary rounded-xl border border-border-color text-center">
                      <p className="text-[10px] font-black text-text-secondary uppercase">Active Calories</p>
                      <p className="text-lg font-black text-text-primary">482 kcal</p>
                   </div>
                </motion.div>
             )}
          </div>
        </Card>

        <Card>
          <h2 className="font-bold text-text-primary mb-4 flex items-center gap-2"><Shield size={18} className="text-red-400" /> Account</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-bg-primary rounded-xl">
              <div><p className="text-sm font-medium text-text-primary">Email</p><p className="text-xs text-text-secondary">{user?.email}</p></div>
            </div>
            <div className="flex items-center justify-between p-3 bg-bg-primary rounded-xl">
              <div><p className="text-sm font-medium text-text-primary">Role</p><p className="text-xs text-text-secondary capitalize">{user?.role}</p></div>
            </div>
            <Button variant="ghost" fullWidth onClick={handleLogout} leftIcon={<LogOut size={16} />} className="!text-red-400 hover:!bg-red-400/10">Sign Out</Button>
          </div>
        </Card>
      </div>
    </>
  )
}
