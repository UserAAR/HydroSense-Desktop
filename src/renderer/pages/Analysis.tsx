import { useState, useMemo } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { useMockStore } from '../store/mock'
import { format } from 'date-fns'
import * as Papa from 'papaparse'
import * as XLSX from 'xlsx'

const ranges = [
  { k: '1h', s: 60 * 60 * 1000 },
  { k: '3h', s: 3 * 60 * 60 * 1000 },
  { k: '6h', s: 6 * 60 * 60 * 1000 },
  { k: '1d', s: 24 * 60 * 60 * 1000 },
  { k: '1w', s: 7 * 24 * 60 * 60 * 1000 },
  { k: 'all', s: Infinity }
] as const

type K = 'rpm' | 'vibration_piezo' | 'vibration_sw420' | 'weight' | 'speed' | 'acceleration' | 'temperature' | 'water_pressure' | 'water_speed' | 'water_temperature'

function downsample<T>(arr: T[], step: number) {
  if (arr.length <= 1000) return arr
  const out: T[] = []
  for (let i = 0; i < arr.length; i += step) out.push(arr[i])
  return out
}

export default function Analysis() {
  const { data } = useMockStore()
  const [key, setKey] = useState<K>('rpm')
  const [range, setRange] = useState<typeof ranges[number]['k']>('1h')

  const filtered = useMemo(() => {
    const cutoff = range === 'all' ? 0 : Date.now() - ranges.find(r => r.k === range)!.s
    const base = data.filter(d => d.ts >= cutoff).map(d => ({ ...d, time: format(d.ts, 'HH:mm') }))
    return downsample(base, Math.ceil(base.length / 1000))
  }, [data, range])

  const latest = filtered[filtered.length - 1]

  function exportCSV() {
    const csv = Papa.unparse(filtered as any)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'hydrosense.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportXLSX() {
    const ws = XLSX.utils.json_to_sheet(filtered as any)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Data')
    XLSX.writeFile(wb, 'hydrosense.xlsx')
  }

  async function exportJSON() {
    const text = JSON.stringify(filtered)
    await window.api.saveFile({ text })
  }

  async function importJSON() {
    const res = await window.api.openFile()
    if (!res) return
    try {
      JSON.parse(res.text)
      alert('Imported')
    } catch {}
  }

  const keys: { k: K; label: string }[] = [
    { k: 'rpm', label: 'RPM' },
    { k: 'vibration_piezo', label: 'Vibration (piezo)' },
    { k: 'vibration_sw420', label: 'Vibration (SW-420)' },
    { k: 'weight', label: 'Weight' },
    { k: 'speed', label: 'Speed' },
    { k: 'acceleration', label: 'Acceleration' },
    { k: 'temperature', label: 'Temperature' },
    { k: 'water_pressure', label: 'Water pressure' },
    { k: 'water_speed', label: 'Water speed' },
    { k: 'water_temperature', label: 'Water temperature' }
  ]

  return (
    <div className="h-full flex flex-col p-6 gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        {keys.map(({ k, label }) => (
          <button key={k} onClick={() => setKey(k)} className={`px-3 h-9 rounded-md text-sm ${key===k?'bg-emerald-600/30 text-emerald-300':'bg-neutral-800 hover:bg-neutral-700'}`}>{label}</button>
        ))}
        <div className="ml-auto flex gap-2">
          {ranges.map(r => (
            <button key={r.k} onClick={() => setRange(r.k)} className={`px-3 h-9 rounded-md text-sm ${range===r.k?'bg-emerald-600/30 text-emerald-300':'bg-neutral-800 hover:bg-neutral-700'}`}>{r.k}</button>
          ))}
          <div className="ml-4 inline-flex items-center gap-2">
            <button onClick={exportCSV} className="px-3 h-9 rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm">Export CSV</button>
            <button onClick={exportXLSX} className="px-3 h-9 rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm">Export Excel</button>
            <button onClick={exportJSON} className="px-3 h-9 rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm">Export JSON</button>
            <button onClick={importJSON} className="px-3 h-9 rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm">Import</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
          <div className="text-xs text-neutral-400">Current RPM</div>
          <div className="text-2xl font-semibold">{latest ? Math.round(latest.rpm) : '-'}</div>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
          <div className="text-xs text-neutral-400">Current Vibration</div>
          <div className="text-2xl font-semibold">{latest ? (latest.vibration_piezo).toFixed(2) : '-'} g</div>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
          <div className="text-xs text-neutral-400">Current Temperature</div>
          <div className="text-2xl font-semibold">{latest ? (latest.temperature).toFixed(1) : '-'} °C</div>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
          <div className="text-xs text-neutral-400">Water Temperature</div>
          <div className="text-2xl font-semibold">{latest ? (latest.water_temperature).toFixed(1) : '-'} °C</div>
        </div>
      </div>

      <div className="flex-1 min-h-[520px] rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
        <div className="text-sm text-neutral-400 mb-2">Time series</div>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filtered}>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#262b29" />
            <XAxis dataKey="time" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1f2937' }} />
            <Area type="monotone" dataKey={key} stroke="#22c55e" fillOpacity={1} fill="url(#g1)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
} 