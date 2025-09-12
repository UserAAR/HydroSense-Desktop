import { useMemo, useState } from 'react'
import { useMockStore } from '../store/mock'
import { AlertTriangle, CheckCircle2, Download } from 'lucide-react'

export default function Logs() {
  const { data } = useMockStore()
  const [status, setStatus] = useState<'all'|'ok'|'warn'|'alert'>('all')

  const base = useMemo(() => data.slice(-300), [data])

  const counts = useMemo(() => {
    const ok = base.filter(d => d.status === 'ok').length
    const warn = base.filter(d => d.status === 'warn').length
    const alert = base.filter(d => d.status === 'alert').length
    return { all: base.length, ok, warn, alert }
  }, [base])

  const rows = useMemo(() => {
    return base.filter(d => (status==='all'||d.status===status)).map(d => ({
      ts: new Date(d.ts).toLocaleString(),
      rpm: d.rpm,
      vibration_piezo: d.vibration_piezo.toFixed(2),
      vibration_sw420: d.vibration_sw420.toFixed(2),
      weight: d.weight.toFixed(2),
      speed: d.speed.toFixed(2),
      acceleration: d.acceleration.toFixed(2),
      temperature: d.temperature.toFixed(1),
      water_pressure: d.water_pressure.toFixed(2),
      water_speed: d.water_speed.toFixed(2),
      water_temperature: d.water_temperature.toFixed(1),
      status: d.status
    }))
  }, [base, status])

  async function exportCsv() {
    const header = ['Timestamp','RPM','Vib piezo','Vib SW-420','Weight','Speed','Accel','Temp','Water P','Water V','Water T','Status']
    const lines = [
      header.join(','),
      ...rows.map(r => [r.ts, r.rpm, r.vibration_piezo, r.vibration_sw420, r.weight, r.speed, r.acceleration, r.temperature, r.water_pressure, r.water_speed, r.water_temperature, r.status].join(','))
    ].join('\n')
    await window.api.saveFile({ text: lines })
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Logs</h2>
          <div className="text-xs text-neutral-500">Last 300 samples • {counts.all} total</div>
        </div>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={()=>setStatus('all')} className={`h-9 px-3 rounded-md text-sm ${status==='all'?'bg-emerald-600/30 text-emerald-300':'bg-neutral-800 hover:bg-neutral-700'}`}>All ({counts.all})</button>
        <button onClick={()=>setStatus('ok')} className={`h-9 px-3 rounded-md text-sm ${status==='ok'?'bg-emerald-600/30 text-emerald-300':'bg-neutral-800 hover:bg-neutral-700'}`}>OK ({counts.ok})</button>
        <button onClick={()=>setStatus('warn')} className={`h-9 px-3 rounded-md text-sm ${status==='warn'?'bg-amber-600/30 text-amber-300':'bg-neutral-800 hover:bg-neutral-700'}`}>Warn ({counts.warn})</button>
        <button onClick={()=>setStatus('alert')} className={`h-9 px-3 rounded-md text-sm ${status==='alert'?'bg-red-600/30 text-red-300':'bg-neutral-800 hover:bg-neutral-700'}`}>Alert ({counts.alert})</button>
      </div>

      <div className="overflow-auto border border-neutral-800 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 sticky top-0 z-10">
            <tr>
              <th className="text-left p-2">Timestamp</th>
              <th className="text-left p-2">RPM</th>
              <th className="text-left p-2">Vib piezo</th>
              <th className="text-left p-2">Vib SW-420</th>
              <th className="text-left p-2">Weight</th>
              <th className="text-left p-2">Speed</th>
              <th className="text-left p-2">Accel</th>
              <th className="text-left p-2">Temp</th>
              <th className="text-left p-2">Water P</th>
              <th className="text-left p-2">Water V</th>
              <th className="text-left p-2">Water T</th>
              <th className="text-left p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={12} className="p-8 text-center text-neutral-500">No logs match this filter</td>
              </tr>
            ) : (
              rows.map((r,i)=> (
                <tr key={i} className="odd:bg-neutral-900/50">
                  <td className="p-2 whitespace-nowrap">{r.ts}</td>
                  <td className="p-2">{r.rpm}</td>
                  <td className="p-2">{r.vibration_piezo}</td>
                  <td className="p-2">{r.vibration_sw420}</td>
                  <td className="p-2">{r.weight}</td>
                  <td className="p-2">{r.speed}</td>
                  <td className="p-2">{r.acceleration}</td>
                  <td className="p-2">{r.temperature}</td>
                  <td className="p-2">{r.water_pressure}</td>
                  <td className="p-2">{r.water_speed}</td>
                  <td className="p-2">{r.water_temperature}</td>
                  <td className="p-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs capitalize ${r.status==='ok'?'bg-emerald-600/20 text-emerald-300': r.status==='warn'?'bg-amber-600/20 text-amber-300':'bg-red-600/20 text-red-300'}`}>
                      {r.status==='ok' && <CheckCircle2 className="w-3 h-3" />}
                      {r.status==='warn' && <AlertTriangle className="w-3 h-3" />}
                      {r.status==='alert' && <AlertTriangle className="w-3 h-3" />}
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
} 