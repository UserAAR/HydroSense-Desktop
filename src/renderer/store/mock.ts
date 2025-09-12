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
  running: boolean
  start: () => void
  stop: () => void
  setIntervalMs: (ms: number) => void
}

let timer: any = null
const PULSE_SECONDS = 8
let pulseUntilTs = 0
let stopping = false

function computeStatus(s: Omit<Sample, 'status'>): 'ok' | 'warn' | 'alert' {
  // vibration thresholds aligned with 1-4 normal, >5 problematic
  if (s.vibration_piezo > 5 || s.vibration_sw420 > 5) return 'alert'
  if (s.vibration_piezo > 4 || s.vibration_sw420 > 4) return 'warn'

  // water pressure: wide range up to 100 bar; alert on extreme
  if (s.water_pressure < 1 || s.water_pressure > 95) return 'warn'

  return 'ok'
}

function computeSummary(window: Sample[]): Summary {
  const mean = (fn: (s: Sample) => number) => Number((window.reduce((a, b) => a + fn(b), 0) / Math.max(window.length, 1)).toFixed(2))
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

function zeroSample(ts: number): Sample {
  return {
    id: 'B01',
    ts,
    rpm: 0,
    vibration_piezo: 0,
    vibration_sw420: 0,
    weight: 0,
    speed: 0,
    acceleration: 0,
    temperature: 0,
    water_pressure: 0,
    water_speed: 0,
    water_temperature: 0,
    status: 'ok'
  }
}

function zeroWindow(count = 300): Sample[] {
  const now = Date.now()
  return Array.from({ length: count }, (_, i) => zeroSample(now - (count - i) * 1000))
}

function seed(): Sample[] {
  // Zero-state until user presses Start
  return zeroWindow(300)
}

export const useMockStore = create<State>((set, get) => {
  const data = seed()
  const latestWindow = data.slice(-300)
  return {
    data,
    latestWindow,
    summary: computeSummary(latestWindow),
    intervalMs: 1000,
    running: false,
    start: () => {
      if (timer) return
      pulseUntilTs = Date.now() + PULSE_SECONDS * 1000
      stopping = false
      set({ running: true })
      timer = setInterval(async () => {
        const rows = await window.api.fetchWindow(300)
        const now = Date.now()
        const pulseStartTs = pulseUntilTs - PULSE_SECONDS * 1000
        const withStatus: Sample[] = rows.map((r: any) => {
          // Apply start/stop acceleration pulse over the last PULSE_SECONDS window
          let acceleration = r.acceleration
          if (now <= pulseUntilTs && r.ts >= pulseStartTs && r.ts <= pulseUntilTs) {
            const t = (r.ts - pulseStartTs) / (PULSE_SECONDS * 1000) // 0..1
            const tri = 1 - Math.abs(2 * t - 1) // triangle 0..1..0
            acceleration = 2 + tri * (10 - 2)
          }
          const sample = {
            id: 'B01',
            ts: r.ts,
            rpm: r.rpm,
            vibration_piezo: r.vibration_piezo,
            vibration_sw420: r.vibration_sw420,
            weight: r.weight,
            speed: r.speed,
            acceleration,
            temperature: r.temperature,
            water_pressure: r.water_pressure,
            water_speed: r.water_speed,
            water_temperature: r.water_temperature
          }
          return { ...sample, status: computeStatus(sample) }
        })
        const st = get()
        set({ data: withStatus, latestWindow: withStatus.slice(-300), summary: computeSummary(withStatus.slice(-300)) })

        // finalize stop after pulse
        if (stopping && now >= pulseUntilTs) {
          if (timer) {
            clearInterval(timer)
            timer = null
          }
          stopping = false
          set({ running: false })
          const zeros = zeroWindow(300)
          set({ data: zeros, latestWindow: zeros, summary: computeSummary(zeros) })
        }
      }, get().intervalMs)
    },
    stop: () => {
      if (!timer) return
      // Trigger stop pulse window, then transition to zero-state
      pulseUntilTs = Date.now() + PULSE_SECONDS * 1000
      stopping = true
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