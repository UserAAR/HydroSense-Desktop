import { useState } from 'react'
// import { useMockStore } from '../store/mock'
import { Bot } from 'lucide-react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const systemPrompt = `You are a helpful hydropower turbine monitoring assistant. Keep answers concise, technical, and actionable. When relevant, reference sensor metrics (RPM, vibrations, temperatures, water pressure/speed) and provide clear next steps. If the user asks follow-up questions, leverage the conversation history to maintain context.`

const templates = [
  'Summarize the current turbine status and highlight any anomalies.',
  'Recommend maintenance actions for the next shift (8–12 hours).',
  'Assess blade wear risk and imbalance likelihood based on recent trends.',
  'Estimate remaining useful life (RUL) for the blades with key assumptions.',
  'Advise how to reduce vibration while maintaining output.',
  'Detect early signs of cavitation and recommend mitigations.',
  'Evaluate thermal performance and cooling adequacy.',
  'Explain efficiency losses and propose optimization steps.',
  'Identify safety concerns and urgent checks for operators.',
  'Suggest a daily checklist for operators based on current data.',
  'Provide a daily performance analysis with key metrics.',
  'Assess blade wear and imbalance likelihood.',
  'Estimate remaining useful life of the blades.',
  'Suggest maintenance actions for the next 24 hours.'
]

const MAX_MEMORY = 8

// Improve line breaks in markdown
marked.setOptions({ breaks: true })

type UiMessage = { role: 'user'|'assistant'; content: string }

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

function renderAssistant(content: string) {
  const html = marked.parse(content || '') as string
  const enhanced = html
    .replace(/<ul>/g, '<ul class="list-disc list-inside ml-4 space-y-1">')
    .replace(/<ol>/g, '<ol class="list-decimal list-inside ml-4 space-y-1">')
    .replace(/<p>/g, '<p class="mb-2">')
  const clean = DOMPurify.sanitize(enhanced)
  return { __html: clean }
}

export default function Chat() {
  // const { latestWindow } = useMockStore()
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function buildContext() {
    // Fetch like AiAnalysis: last ~10 minutes and summarize
    const rows: Row[] = await window.api.fetchWindow(600)
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
    const avg = (arr: number[]) => Number((arr.reduce((a,b)=>a+b,0)/Math.max(arr.length,1)).toFixed(2))
    const summary = {
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
    return { window: 'last_10_minutes_30s_interval', count: data.length, summary, data }
  }

  async function send(text: string) {
    const t = text.trim()
    if (!t || loading) return
    setError('')
    const nextUser: UiMessage = { role: 'user', content: t }
    const newState = [...messages, nextUser]
    // Keep only the last MAX_MEMORY messages in UI state
    const trimmedUi = newState.slice(-MAX_MEMORY)
    setMessages(trimmedUi)

    try {
      setLoading(true)
      // Build lightweight data context
      const payload = await buildContext()

      // Map UI messages to API roles; assistant -> model
      const history = trimmedUi.map(m => ({ role: m.role === 'assistant' ? 'model' as const : 'user' as const, content: m.content }))

      // Prepend a compact context message
      const contextText = `Context: Use the following recent sensor snapshot to ground your answer. Keep responses concise. Snapshot: ${JSON.stringify(payload)}`
      const apiMessages: { role: 'user'|'model'; content: string }[] = [
        { role: 'user', content: contextText },
        ...history
      ]

      const reply = await window.api.aiGenerate({ system: systemPrompt, messages: apiMessages })
      setMessages(prev => {
        const latest = [...prev, { role: 'assistant' as const, content: reply || 'No response' }]
        return latest.slice(-MAX_MEMORY)
      })
    } catch (e) {
      setError('AI service error')
      setMessages(prev => [...prev, { role: 'assistant' as const, content: 'Sorry, I encountered an error while generating a response.' }].slice(-MAX_MEMORY))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex">
        <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto p-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-700/40 bg-emerald-600/10 px-3 h-8 text-emerald-300 text-xs"><Bot className="w-4 h-4" /> HydroSense AI</div>
              <h2 className="mt-3 text-[22px] font-semibold">Welcome to AI Chat</h2>
              <p className="text-sm text-neutral-400 max-w-xl">Ask about performance, vibration, safety, or efficiency. Your recent telemetry helps tailor answers.</p>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-w-2xl w-full">
                {templates.slice(0, 6).map(t => (
                  <button key={t} onClick={() => send(t)} className="text-left text-sm rounded-md bg-neutral-800 hover:bg-neutral-700 px-3 py-2">{t}</button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m, i) => (
                m.role==='user' ? (
                  <div key={i} className="max-w-3xl rounded-xl px-4 py-2 bg-emerald-600/20 text-emerald-200 self-end ml-auto">{m.content}</div>
                ) : (
                  <div key={i} className="max-w-3xl rounded-xl px-4 py-2 bg-neutral-800 text-neutral-100 border border-neutral-700">
                    <div dangerouslySetInnerHTML={renderAssistant(m.content)} />
                  </div>
                )
              ))}
              {loading && <div className="max-w-3xl rounded-xl px-4 py-2 bg-neutral-800 text-neutral-400">Thinking…</div>}
              {error && <div className="text-sm text-red-400">{error}</div>}
            </div>
          )}
        </div>
        <div className="p-4 flex gap-2 border-t border-neutral-800">
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') { send(input); setInput('') } }} placeholder="Ask something..." className="flex-1 h-11 rounded-md bg-neutral-800 px-3 outline-none" />
          <button disabled={loading} onClick={()=>{send(input);setInput('')}} className="h-11 px-4 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60">Send</button>
        </div>
      </div>
    </div>
  )
} 