import { useEffect, useMemo, useState } from 'react'
import { useMockStore } from '../store/mock'
import { motion } from 'framer-motion'
import { Bot, Activity, Gauge, Thermometer, Waves } from 'lucide-react'

const systemPrompt = `You are an expert hydropower turbine monitoring analyst. Always respond ONLY with compact JSON matching this schema and nothing else (no markdown):
{
  "performance": { "summary": string, "findings": string[], "conclusion": string },
  "blade": { "summary": string, "findings": string[], "conclusion": string },
  "energy": { "summary": string, "findings": string[], "conclusion": string },
  "safety": { "summary": string, "findings": string[], "conclusion": string }
}`

type Section = { summary: string; findings: string[]; conclusion: string }

type AiResult = { performance: Section; blade: Section; energy: Section; safety: Section }

type Row = {
  ts: number
  rpm: number
  vibration_piezo: number
  vibration_sw420: number
  weight: number
  speed: number
  acceleration: number
  temperature: number
  water_pressure: number
  water_speed: number
  water_temperature: number
}

export default function AiAnalysis() {
  const { latestWindow } = useMockStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [result, setResult] = useState<AiResult | null>(null)

  const kpis = useMemo(() => {
    const last = latestWindow
    const avg = (k: keyof typeof last[number]) => Number((last.reduce((a,b)=> a + (b[k] as number), 0)/ last.length).toFixed(2))
    const min = (k: keyof typeof last[number]) => Number(Math.min(...last.map(d => d[k] as number)).toFixed(2))
    const max = (k: keyof typeof last[number]) => Number(Math.max(...last.map(d => d[k] as number)).toFixed(2))
    return {
      rpm: Math.round(avg('rpm')),
      rpm_min: Math.round(min('rpm')),
      rpm_max: Math.round(max('rpm')),
      vib_piezo: avg('vibration_piezo'),
      temp: avg('temperature'),
      water_t: avg('water_temperature')
    }
  }, [latestWindow])

  useEffect(() => {
    let active = true
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const rows = await window.api.fetchWindow(600)
        const data: Row[] = []
        for (let i = 0; i < rows.length; i += 30) {
          const r = rows[i]
          data.push({
            ts: r.ts,
            rpm: r.rpm,
            vibration_piezo: r.vibration_piezo,
            vibration_sw420: r.vibration_sw420,
            weight: r.weight,
            speed: r.speed,
            acceleration: r.acceleration,
            temperature: r.temperature,
            water_pressure: r.water_pressure,
            water_speed: r.water_speed,
            water_temperature: r.water_temperature
          })
        }
        const avg = (arr: number[]) => Number((arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(2))
        const s = {
          rpm: Math.round(avg(data.map(d=>d.rpm))),
          vib_piezo: avg(data.map(d=>d.vibration_piezo)),
          vib_sw420: avg(data.map(d=>d.vibration_sw420)),
          weight: avg(data.map(d=>d.weight)),
          speed: avg(data.map(d=>d.speed)),
          accel: avg(data.map(d=>d.acceleration)),
          temp: avg(data.map(d=>d.temperature)),
          water_p: avg(data.map(d=>d.water_pressure)),
          water_v: avg(data.map(d=>d.water_speed)),
          water_t: avg(data.map(d=>d.water_temperature))
        }
        const payload = {
          window: 'last_10_minutes_30s_interval',
          count: data.length,
          summary: s,
          data
        }
        const instruction = `Analyze the provided time series and summary. Use the data array for trends and anomalies. Produce the four sections in JSON schema. Input: ${JSON.stringify(payload)}`
        const text = await window.api.aiGenerate({ system: systemPrompt, messages: [{ role: 'user', content: instruction }] })
        if (!active) return
        let jsonText = text.trim()
        const fenced = /```(?:json)?\n([\s\S]*?)\n```/i.exec(jsonText)
        if (fenced) jsonText = fenced[1]
        const parsed = JSON.parse(jsonText) as AiResult
        setResult(parsed)
      } catch (e: any) {
        if (!active) return
        setError('AI service error')
      } finally {
        if (!active) return
        setLoading(false)
      }
    }
    run()
    return () => { active = false }
  }, [])

  const Card = ({ title, section }: { title: string; section: Section }) => (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
      <div className="text-[15px] font-semibold text-neutral-200 mb-2">{title}</div>
      <div className="text-sm mb-2">{section.summary}</div>
      <ul className="list-disc list-inside text-sm space-y-1">
        {section.findings?.slice(0,6).map((f, i) => (<li key={i}>{f}</li>))}
      </ul>
      <div className="mt-3 pt-2 border-t border-neutral-800 text-sm text-emerald-300">{section.conclusion}</div>
    </motion.div>
  )

  const recs = useMemo(() => {
    if (!result) return [] as string[]
    const list = [result.performance.conclusion, result.blade.conclusion, result.energy.conclusion, result.safety.conclusion].filter(Boolean)
    return Array.from(new Set(list)).slice(0, 6)
  }, [result])

  return (
    <div className="h-full flex flex-col p-6 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-700/40 bg-emerald-600/10 px-3 h-8 text-emerald-300 text-xs"><Bot className="w-4 h-4" /> AI insights powered by HydroSense</div>
          <h2 className="mt-2 text-[22px] font-semibold">AI Analysis</h2>
          <p className="text-sm text-neutral-400">Insights are generated from the last 10 minutes of data sampled every 30 seconds.</p>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 text-sm"><div className="flex items-center gap-2 text-neutral-400"><Activity className="w-4 h-4" /> RPM</div><div className="text-base">{kpis.rpm} <span className="text-xs text-neutral-500">({kpis.rpm_min}–{kpis.rpm_max})</span></div></div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 text-sm"><div className="flex items-center gap-2 text-neutral-400"><Gauge className="w-4 h-4" /> Vibration</div><div className="text-base">{kpis.vib_piezo} g</div></div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 text-sm"><div className="flex items-center gap-2 text-neutral-400"><Thermometer className="w-4 h-4" /> Temperature</div><div className="text-base">{kpis.temp} °C</div></div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 text-sm"><div className="flex items-center gap-2 text-neutral-400"><Waves className="w-4 h-4" /> Water T</div><div className="text-base">{kpis.water_t} °C</div></div>
        </div>
      </div>

      {loading && <div className="text-neutral-400">Analyzing...</div>}
      {error && <div className="text-red-400 text-sm">{error}</div>}

      {result && (
        <div className="grid grid-cols-3 gap-4 flex-1 min-h-[520px]">
          <div className="col-span-2 grid grid-cols-2 gap-4">
            <Card title="Performance Overview" section={result.performance} />
            <Card title="Blade Health" section={result.blade} />
            <Card title="Energy & Efficiency" section={result.energy} />
            <Card title="Environmental & Safety" section={result.safety} />
          </div>
          <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
            <div className="text-[15px] font-semibold text-neutral-200 mb-2">Key recommendations</div>
            <ul className="space-y-2 text-sm">
              {recs.length === 0 && <li className="text-neutral-500">No critical actions suggested</li>}
              {recs.map((r, i) => (<li key={i} className="rounded-md bg-neutral-800 px-2 py-2">{r}</li>))}
            </ul>
          </motion.div>
        </div>
      )}
    </div>
  )
}