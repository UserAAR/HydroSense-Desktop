import { create } from 'zustand'

export type Sample = {
  id: string
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
  status: 'ok' | 'warn' | 'alert'
}

type Summary = {
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

type State = {
  data: Sample[]
  latestWindow: Sample[]
  summary: Summary
  intervalMs: number
  start: () => void
  stop: () => void
  setIntervalMs: (ms: number) => void
}

let timer: any = null

function computeStatus(s: Omit<Sample, 'status'>): 'ok' | 'warn' | 'alert' {
  if (s.vibration_piezo > 0.8 || s.temperature > 80 || s.water_pressure > 3) return 'alert'
  if (s.vibration_piezo > 0.6) return 'warn'
  return 'ok'
}

function computeSummary(window: Sample[]): Summary {
  const mean = (fn: (s: Sample) => number) => Number((window.reduce((a, b) => a + fn(b), 0) / window.length).toFixed(2))
  return {
    rpm: Math.round(mean(s => s.rpm)),
    vibration_piezo: mean(s => s.vibration_piezo),
    vibration_sw420: mean(s => s.vibration_sw420),
    weight: mean(s => s.weight),
    speed: mean(s => s.speed),
    acceleration: mean(s => s.acceleration),
    temperature: mean(s => s.temperature),
    water_pressure: mean(s => s.water_pressure),
    water_speed: mean(s => s.water_speed),
    water_temperature: mean(s => s.water_temperature)
  }
}

function seed(): Sample[] {
  const now = Date.now()
  return Array.from({ length: 300 }, (_, i) => ({
    id: 'B01',
    ts: now - (300 - i) * 1000,
    rpm: 1100,
    vibration_piezo: 0.4,
    vibration_sw420: 0.3,
    weight: 12,
    speed: 6,
    acceleration: 0.9,
    temperature: 34,
    water_pressure: 2.1,
    water_speed: 1.8,
    water_temperature: 22,
    status: 'ok'
  }))
}

export const useMockStore = create<State>((set, get) => {
  const data = seed()
  const latestWindow = data.slice(-300)
  return {
    data,
    latestWindow,
    summary: computeSummary(latestWindow),
    intervalMs: 1000,
    start: () => {
      if (timer) return
      timer = setInterval(async () => {
        const rows = await window.api.fetchWindow(300)
        const withStatus: Sample[] = rows.map((r: any) => ({ ...r, status: computeStatus(r) }))
        const st = get()
        set({ data: withStatus, latestWindow: withStatus.slice(-300), summary: computeSummary(withStatus.slice(-300)) })
      }, get().intervalMs)
    },
    stop: () => {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    },
    setIntervalMs: (ms: number) => {
      set({ intervalMs: ms })
      if (timer) {
        get().stop()
        get().start()
      }
    }
  }
}) 