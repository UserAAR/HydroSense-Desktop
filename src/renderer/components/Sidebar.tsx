import { memo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Activity, BarChart2, Brain, MessageSquare, Bell, FileText, Settings, Info, Import, Download, CheckCircle2, Play, Square } from 'lucide-react'
import logo from '../assets/logo.svg'
import ExportDialog from './ExportDialog'
import { useMockStore } from '../store/mock'

type Props = { theme: 'dark'|'light'; setTheme: (t: 'dark'|'light') => void }

const nav = [
  { to: '/', label: 'Dashboard', icon: Activity },
  { to: '/analysis', label: 'Analysis', icon: BarChart2 },
  { to: '/ai', label: 'AI Analysis', icon: Brain },
  { to: '/chat', label: 'AI Chat', icon: MessageSquare },
  { to: '/logs', label: 'Logs', icon: FileText },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/about', label: 'About', icon: Info }
]

function SidebarImpl({ theme, setTheme }: Props) {
  const [exportOpen, setExportOpen] = useState(false)
  const [toast, setToast] = useState<string>('')
  const { running, start, stop } = useMockStore()

  async function onImport() {
    const res = await window.api.openFile()
    if (res) {
      setToast('File imported successfully')
      setTimeout(()=>setToast(''), 2000)
    }
  }

  return (
    <div className="relative h-full">
      <aside className="h-full w-[260px] border-r border-neutral-800 bg-neutral-900/60 backdrop-blur">
        <div className="h-16 flex items-center gap-3 px-4">
          <img src={logo} alt="HydroSense" className="w-9 h-9 rounded-md shadow-sm ring-1 ring-emerald-500/20" draggable={false} />
          <div className="text-[18px] font-semibold whitespace-nowrap flex-1">HydroSense</div>
          {!running ? (
            <button onClick={start} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white h-8 px-3 text-[12px]">
              <Play className="w-3.5 h-3.5" /> Start
            </button>
          ) : (
            <button onClick={stop} className="inline-flex items-center gap-1 rounded-md bg-red-600 hover:bg-red-500 text-white h-8 px-3 text-[12px]">
              <Square className="w-3.5 h-3.5" /> Stop
            </button>
          )}
        </div>
        <nav className="px-2 space-y-1">
          {nav.map(i => {
            const Icon = i.icon
            return (
              <NavLink key={i.to} to={i.to} end className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-2 text-[14px] transition-colors ${isActive ? 'bg-emerald-600/20 text-emerald-300' : 'hover:bg-neutral-800/60'}`}>
                <Icon className="w-5 h-5" />
                <span className="whitespace-nowrap">{i.label}</span>
              </NavLink>
            )
          })}
        </nav>
        <div className="absolute bottom-4 w-full px-2">
          <div className="flex gap-2">
            <button onClick={()=>setExportOpen(true)} className="flex-1 inline-flex items-center justify-center rounded-md bg-neutral-800 hover:bg-neutral-700 h-9 text-[13px] gap-2"><Download className="w-4 h-4" /><span>Export</span></button>
            <button onClick={onImport} className="flex-1 inline-flex items-center justify-center rounded-md bg-neutral-800 hover:bg-neutral-700 h-9 text-[13px] gap-2"><Import className="w-4 h-4" /><span>Import</span></button>
          </div>
          <div className="mt-3 flex items-center justify-between text-[12px] px-1">
            <span>Theme</span>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="rounded-md bg-neutral-800 hover:bg-neutral-700 h-8 px-3 text-[12px]">{theme === 'dark' ? 'Dark' : 'Light'}</button>
          </div>
        </div>
      </aside>
      {exportOpen && <ExportDialog open={exportOpen} onClose={()=>setExportOpen(false)} />}
      {toast && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-20 z-50 inline-flex items-center gap-2 rounded-md bg-emerald-600 text-white px-3 h-9 text-sm">
          <CheckCircle2 className="w-4 h-4" /> {toast}
        </div>
      )}
    </div>
  )
}

const Sidebar = memo(SidebarImpl)
export default Sidebar 