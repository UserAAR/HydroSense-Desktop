import { useMemo, useState } from 'react'
import { useMockStore } from '../store/mock'
import { Bell, AlertTriangle, CircleAlert, X, Trash2 } from 'lucide-react'

export default function Notifications() {
  const { latestWindow } = useMockStore()
  const [filter, setFilter] = useState<'all'|'warn'|'alert'>('all')
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())

  const allItems = useMemo(() => {
    return latestWindow
      .filter(d => d.status !== 'ok')
      .slice(-60)
      .reverse()
      .map(d => ({
        ts: d.ts,
        when: new Date(d.ts).toLocaleString(),
        status: d.status,
        rpm: d.rpm,
        vib: Number(d.vibration_piezo.toFixed(2)),
        temp: Number(d.temperature.toFixed(1)),
        waterP: Number(d.water_pressure.toFixed(2))
      }))
  }, [latestWindow])

  const counts = useMemo(() => {
    const visible = allItems.filter(i => !dismissed.has(i.ts))
    const warn = visible.filter(i => i.status === 'warn').length
    const alert = visible.filter(i => i.status === 'alert').length
    return { all: visible.length, warn, alert }
  }, [allItems, dismissed])

  const items = useMemo(() => {
    return allItems.filter(i => !dismissed.has(i.ts)).filter(i => filter==='all' || i.status===filter)
  }, [allItems, dismissed, filter])

  function dismissOne(ts: number) {
    setDismissed(prev => new Set(prev).add(ts))
  }

  function dismissShown() {
    setDismissed(prev => {
      const next = new Set(prev)
      items.forEach(i => next.add(i.ts))
      return next
    })
  }

  function resetDismissed() {
    setDismissed(new Set())
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Notifications</h2>
          <div className="text-xs text-neutral-500">Last events from recent telemetry</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={dismissShown} disabled={items.length===0} className="h-9 px-3 rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm disabled:opacity-50 inline-flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Dismiss shown
          </button>
          <button onClick={resetDismissed} className="h-9 px-3 rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm">Reset</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={()=>setFilter('all')} className={`h-9 px-3 rounded-md text-sm ${filter==='all'?'bg-emerald-600/30 text-emerald-300':'bg-neutral-800 hover:bg-neutral-700'}`}>All ({counts.all})</button>
        <button onClick={()=>setFilter('warn')} className={`h-9 px-3 rounded-md text-sm ${filter==='warn'?'bg-amber-600/30 text-amber-300':'bg-neutral-800 hover:bg-neutral-700'}`}>Warn ({counts.warn})</button>
        <button onClick={()=>setFilter('alert')} className={`h-9 px-3 rounded-md text-sm ${filter==='alert'?'bg-red-600/30 text-red-300':'bg-neutral-800 hover:bg-neutral-700'}`}>Alert ({counts.alert})</button>
      </div>

      <div className="space-y-2">
        {items.length === 0 && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-700/40 bg-emerald-600/10 px-3 h-8 text-emerald-300 text-xs"><Bell className="w-4 h-4" /> HydroSense</div>
            <div className="mt-2 text-sm text-neutral-400">No notifications to show</div>
          </div>
        )}
        {items.map(n => (
          <div key={n.ts} className="rounded-lg border border-neutral-800 bg-neutral-900/60 overflow-hidden">
            <div className={`h-1 ${n.status==='alert'?'bg-red-500':'bg-amber-500'}`} />
            <div className="p-3 flex items-start gap-3">
              <div className={`mt-0.5 rounded-md p-1.5 ${n.status==='alert'?'bg-red-600/20 text-red-300':'bg-amber-600/20 text-amber-300'}`}>
                {n.status==='alert' ? <CircleAlert className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    {n.status==='alert' ? 'High vibration detected' : 'Vibration approaching threshold'}
                  </div>
                  <div className="text-xs text-neutral-500">{n.when}</div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 rounded bg-neutral-800">RPM: {n.rpm}</span>
                  <span className="px-2 py-1 rounded bg-neutral-800">Vibration: {n.vib} g</span>
                  <span className="px-2 py-1 rounded bg-neutral-800">Temp: {n.temp} °C</span>
                  <span className="px-2 py-1 rounded bg-neutral-800">Water P: {n.waterP} bar</span>
                </div>
              </div>
              <button onClick={()=>dismissOne(n.ts)} className="ml-2 rounded-md hover:bg-neutral-800 p-1.5 text-neutral-400"><X className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 