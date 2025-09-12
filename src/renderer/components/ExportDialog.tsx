import { useEffect, useMemo, useRef, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, AreaChart, Area } from 'recharts'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type Props = { open: boolean; onClose: () => void }

const ranges = [
  { label: 'Last 1h', seconds: 3600 },
  { label: 'Last 3h', seconds: 10800 },
  { label: 'Last 6h', seconds: 21600 },
  { label: 'Last 1d', seconds: 86400 }
]

export default function ExportDialog({ open, onClose }: Props) {
  const [seconds, setSeconds] = useState(3600)
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    window.api.fetchWindow(seconds).then(rows => {
      setData(rows)
      setLoading(false)
    })
  }, [open, seconds])

  const chartData = useMemo(() => data.map(d => ({
    ts: new Date(d.ts).toLocaleTimeString(),
    rpm: d.rpm,
    vibration_piezo: d.vibration_piezo,
    temperature: d.temperature,
    water_temperature: d.water_temperature
  })), [data])

  const stats = useMemo(() => {
    if (data.length === 0) return null
    const avg = (arr: number[]) => (arr.reduce((a,b)=>a+b,0)/arr.length)
    const min = (arr: number[]) => Math.min(...arr)
    const max = (arr: number[]) => Math.max(...arr)
    return {
      rpm_avg: Math.round(avg(data.map(d=>d.rpm))),
      rpm_min: Math.min(...data.map(d=>d.rpm)),
      rpm_max: Math.max(...data.map(d=>d.rpm)),
      vib_avg: Number(avg(data.map(d=>d.vibration_piezo)).toFixed(2)),
      vib_min: Number(min(data.map(d=>d.vibration_piezo)).toFixed(2)),
      vib_max: Number(max(data.map(d=>d.vibration_piezo)).toFixed(2)),
      temp_avg: Number(avg(data.map(d=>d.temperature)).toFixed(1)),
      temp_min: Number(min(data.map(d=>d.temperature)).toFixed(1)),
      temp_max: Number(max(data.map(d=>d.temperature)).toFixed(1))
    }
  }, [data])

  async function exportPDF() {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(18)
    pdf.text('HydroSense Report', 40, 50)
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Time range: ${ranges.find(r=>r.seconds===seconds)?.label}`, 40, 70)

    autoTable(pdf, {
      startY: 90,
      head: [['Metric', 'Average', 'Min', 'Max']],
      body: [
        ['RPM', String(stats?.rpm_avg ?? '-'), String(stats?.rpm_min ?? '-'), String(stats?.rpm_max ?? '-')],
        ['Vibration (piezo)', String(stats?.vib_avg ?? '-'), String(stats?.vib_min ?? '-'), String(stats?.vib_max ?? '-')],
        ['Temperature', String(stats?.temp_avg ?? '-'), String(stats?.temp_min ?? '-'), String(stats?.temp_max ?? '-')]
      ]
    })

    const afterSummaryY = (pdf as any).lastAutoTable.finalY + 20

    const charts: Array<{ el: HTMLElement | null; title: string }> = []
    const overviewEl = document.createElement('div')
    overviewEl.style.width = '800px'
    overviewEl.style.height = '260px'
    const tempEl = document.createElement('div')
    tempEl.style.width = '380px'
    tempEl.style.height = '220px'
    const wtempEl = document.createElement('div')
    wtempEl.style.width = '380px'
    wtempEl.style.height = '220px'

    const overviewCanvas = await html2canvas(ref.current!.querySelector('div.h-56') as HTMLElement, { backgroundColor: '#0b1311', scale: 2 })
    const overviewImg = overviewCanvas.toDataURL('image/png')
    pdf.addImage(overviewImg, 'PNG', 40, afterSummaryY, 515, 200)

    pdf.addPage()
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(14)
    pdf.text('Detailed Logs', 40, 50)

    const rows = data.slice(-1000).map(d => [
      new Date(d.ts).toLocaleString(),
      d.rpm,
      d.vibration_piezo.toFixed(2),
      d.vibration_sw420.toFixed(2),
      d.weight.toFixed(2),
      d.speed.toFixed(2),
      d.acceleration.toFixed(2),
      d.temperature.toFixed(1),
      d.water_pressure.toFixed(2),
      d.water_speed.toFixed(2),
      d.water_temperature.toFixed(1)
    ])

    autoTable(pdf, {
      startY: 70,
      head: [['Timestamp','RPM','Vib piezo','Vib SW-420','Weight','Speed','Accel','Temp','Water P','Water V','Water T']],
      body: rows,
      styles: { fontSize: 7 }
    })

    pdf.save('hydrosense-report.pdf')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[1000px] max-h-[90vh] overflow-auto rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">Export report</div>
          <button onClick={onClose} className="h-9 px-3 rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm">Close</button>
        </div>
        <div className="flex items-center gap-2 mb-3">
          {ranges.map(r => (
            <button key={r.seconds} onClick={()=>setSeconds(r.seconds)} className={`px-3 h-9 rounded-md text-sm ${seconds===r.seconds?'bg-emerald-600/30 text-emerald-300':'bg-neutral-800 hover:bg-neutral-700'}`}>{r.label}</button>
          ))}
          <button onClick={exportPDF} disabled={loading} className="ml-auto h-9 px-3 rounded-md bg-emerald-600 hover:bg-emerald-500 text-sm disabled:opacity-50">Export PDF</button>
        </div>
        <div ref={ref} className="space-y-4">
          <div className="rounded-lg border border-neutral-800 p-3">
            <div className="text-sm text-neutral-400 mb-1">Signals overview</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="#262b29" />
                  <XAxis dataKey="ts" hide />
                  <YAxis yAxisId="l" stroke="#6b7280" />
                  <YAxis yAxisId="r" orientation="right" stroke="#a78bfa" />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1f2937' }} />
                  <Legend wrapperStyle={{ color: '#9ca3af' }} verticalAlign="top" height={24} />
                  <Line yAxisId="r" type="monotone" dataKey="rpm" stroke="#a78bfa" dot={false} strokeWidth={2} isAnimationActive={false} />
                  <Line yAxisId="l" type="monotone" dataKey="vibration_piezo" stroke="#22c55e" dot={false} strokeWidth={2} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-neutral-800 p-3">
              <div className="text-sm text-neutral-400 mb-1">Temperature profile</div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="gtemp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="ts" hide />
                    <YAxis stroke="#6b7280" />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1f2937' }} />
                    <Area type="monotone" dataKey="temperature" stroke="#f59e0b" fill="url(#gtemp)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-lg border border-neutral-800 p-3">
              <div className="text-sm text-neutral-400 mb-1">Water temperature</div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="gwtemp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="ts" hide />
                    <YAxis stroke="#6b7280" />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1f2937' }} />
                    <Area type="monotone" dataKey="water_temperature" stroke="#ef4444" fill="url(#gwtemp)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-neutral-800 p-3">
            <div className="text-sm text-neutral-400 mb-2">Summary</div>
            {stats && (
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-md bg-neutral-800 p-2">RPM avg: {stats.rpm_avg} (min {stats.rpm_min}, max {stats.rpm_max})</div>
                <div className="rounded-md bg-neutral-800 p-2">Vibration avg: {stats.vib_avg} g (min {stats.vib_min}, max {stats.vib_max})</div>
                <div className="rounded-md bg-neutral-800 p-2">Temperature avg: {stats.temp_avg} °C (min {stats.temp_min}, max {stats.temp_max})</div>
              </div>
            )}
          </div>
          <div className="text-xs text-neutral-500">Generated by HydroSense</div>
        </div>
      </div>
    </div>
  )
} 