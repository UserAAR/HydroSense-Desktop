import { useEffect, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Dashboard from './Dashboard'
import Analysis from './Analysis'
import AiAnalysis from './AiAnalysis'
import Chat from './Chat'
import Logs from './Logs'
import Notifications from './Notifications'
import Reports from './Reports'
import SettingsPage from './SettingsPage'
import About from './About'
import Sidebar from '../components/Sidebar'

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const location = useLocation()

  useEffect(() => {
    const saved = localStorage.getItem('hs_theme') as 'dark'|'light'|null
    if (saved === 'dark' || saved === 'light') {
      setTheme(saved)
      document.documentElement.classList.toggle('dark', saved === 'dark')
    } else {
      document.documentElement.classList.toggle('dark', theme === 'dark')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('hs_theme', theme)
  }, [theme])

  return (
    <div className={`h-full w-full flex ${theme==='dark' ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-50 text-neutral-900'}`}>
      <Sidebar theme={theme} setTheme={setTheme} />
      <div className="flex-1 h-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.main key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="h-full overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/analysis" element={<Analysis />} />
              <Route path="/ai" element={<AiAnalysis />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<SettingsPage theme={theme} setTheme={setTheme} />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  )
} 