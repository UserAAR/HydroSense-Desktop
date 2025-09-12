import { useEffect, useState } from 'react'
import { useMockStore } from '../store/mock'

type Props = { theme: 'dark'|'light'; setTheme: (t: 'dark'|'light') => void }

export default function SettingsPage({ theme, setTheme }: Props) {
  const { intervalMs, setIntervalMs, start, stop } = useMockStore()
  const [alerts, setAlerts] = useState(true)

  useEffect(()=>{
    start()
    return () => stop()
  },[start, stop])

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold">Settings</h2>
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
          <div>
            <div className="text-sm">Refresh interval</div>
            <div className="text-xs text-neutral-400">Update frequency for mock data</div>
          </div>
          <select value={intervalMs} onChange={e=>setIntervalMs(Number(e.target.value))} className="h-9 bg-neutral-800 rounded-md px-2 text-sm">
            <option value={1000}>1s</option>
            <option value={2000}>2s</option>
            <option value={5000}>5s</option>
          </select>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
          <div>
            <div className="text-sm">Notifications</div>
            <div className="text-xs text-neutral-400">Show alerts when thresholds are crossed</div>
          </div>
          <input type="checkbox" checked={alerts} onChange={e=>setAlerts(e.target.checked)} />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
          <div>
            <div className="text-sm">Theme</div>
            <div className="text-xs text-neutral-400">Switch between dark and light</div>
          </div>
          <button onClick={()=>setTheme(theme==='dark'?'light':'dark')} className="h-9 px-3 rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm">{theme==='dark'?'Dark':'Light'}</button>
        </div>
      </div>
    </div>
  )
} 