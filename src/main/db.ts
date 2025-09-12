import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'node:path'
import { mkdirSync, existsSync } from 'node:fs'

export type Row = {
  second_of_day: number
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

let db: Database.Database

export function getDbPath() {
  const dir = join(app.getPath('userData'), 'data')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'appdata.db')
}

export function initDb() {
  db = new Database(getDbPath())
  db.exec(`
    PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS template_samples (
      second_of_day INTEGER PRIMARY KEY,
      rpm REAL,
      vibration_piezo REAL,
      vibration_sw420 REAL,
      weight REAL,
      speed REAL,
      acceleration REAL,
      temperature REAL,
      water_pressure REAL,
      water_speed REAL,
      water_temperature REAL
    );
  `)
  const cnt = db.prepare('SELECT COUNT(1) as c FROM template_samples').get() as { c: number }
  if (cnt.c === 0) seed24h()
}

function seed24h() {
  const insert = db.prepare(`INSERT INTO template_samples VALUES (@second_of_day,@rpm,@vibration_piezo,@vibration_sw420,@weight,@speed,@acceleration,@temperature,@water_pressure,@water_speed,@water_temperature)`) 

  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  const lerp = (lo: number, hi: number, t: number) => lo + (hi - lo) * t
  const smooth01 = (s: number, p1: number, p2: number, phase: number = 0) => {
    // 0..1 smooth signal from combined slow sine waves
    const x = 0.5 + 0.3 * Math.sin((s + phase) / p1) + 0.2 * Math.sin((s + phase) / p2)
    return clamp(x, 0, 1)
  }

  // Predefine rare event windows (seconds within day)
  const accelPulses = [1 * 3600, 7 * 3600, 13 * 3600, 19 * 3600] // start/stop events
  const accelPulseLen = 120 // seconds
  const vibSpikeAt = 11 * 3600 // rare vibration spike window center
  const vibSpikeLen = 20 // seconds

  const tx = db.transaction(() => {
    for (let s = 0; s < 86400; s++) {
      // rpm: 200 - 1000, smooth
      const rpmBase = lerp(200, 1000, smooth01(s, 900, 1800))
      const rpmSlow = 20 * Math.sin(s / 2400)
      const rpm = clamp(rpmBase + rpmSlow, 200, 1000)

      // vibration (mm/s RMS): typical 1 - 4, rarely > 5 (problem)
      const vibBase = lerp(1.2, 3.6, smooth01(s, 700, 1500))
      const vibOffset = 0.1 * Math.sin(s / 300)
      let vibration_piezo = clamp(vibBase + vibOffset, 1, 4)
      let vibration_sw420 = clamp(vibBase + 0.05 * Math.sin((s + 100) / 260), 1, 4)
      // rare spike window
      if (Math.abs(s - vibSpikeAt) <= vibSpikeLen / 2) {
        const spike = 5.6 + 0.4 * Math.sin((s - vibSpikeAt) / 3)
        vibration_piezo = spike
        vibration_sw420 = spike - 0.2
      }

      // weight: 400 - 700 tons, very slow change
      const weightTrend = lerp(400, 700, smooth01(s, 7200, 10800))
      const weight = clamp(weightTrend + 2.0 * Math.sin(s / 3600), 400, 700)

      // speed: 20 - 70 m/s, smooth
      const speed = clamp(lerp(20, 70, smooth01(s, 800, 1900)) + 0.6 * Math.sin(s / 500), 20, 70)

      // acceleration: normal 0.1 - 0.5, with rare start/stop pulses 2 - 10
      const accelNormal = clamp(lerp(0.1, 0.5, smooth01(s, 600, 1600)), 0.1, 0.5)
      let acceleration = accelNormal
      for (const c of accelPulses) {
        const dist = Math.abs(s - c)
        if (dist <= accelPulseLen) {
          // triangular pulse 0..1..0 over pulse window
          const t = 1 - dist / accelPulseLen
          acceleration = lerp(2, 10, t)
          break
        }
      }

      // temperature (equipment): keep previous realistic band ~ 30 - 38 C
      const temperature = clamp(34 + 2.5 * Math.sin(s / 200) + 0.8 * Math.sin(s / 900), 30, 38)

      // water pressure: 1 - 100 bar, smooth
      const water_pressure = clamp(lerp(25, 85, smooth01(s, 1200, 3600)) + 5 * Math.sin(s / 1800), 1, 100)

      // water speed: choose medium-head turbine band 5 - 15 m/s
      const water_speed = clamp(lerp(5, 15, smooth01(s, 950, 2100)) + 0.4 * Math.sin(s / 650), 5, 15)

      // water temperature: 0 - 25 C, smooth, mostly 6 - 20
      const water_temperature = clamp(lerp(6, 20, smooth01(s, 3000, 9000)) + 0.8 * Math.sin(s / 1200), 0, 25)

      insert.run({ second_of_day: s, rpm, vibration_piezo, vibration_sw420, weight, speed, acceleration, temperature, water_pressure, water_speed, water_temperature })
    }
  })
  tx()
}

export function getSecondOfDay(ts: number) {
  const d = new Date(ts)
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()
}

export function fetchWindow(seconds: number) {
  const now = Date.now()
  const end = getSecondOfDay(now)
  const start = (end - seconds + 86400) % 86400
  let rows: Row[] = []
  if (start <= end) {
    const stmt = db.prepare('SELECT * FROM template_samples WHERE second_of_day BETWEEN ? AND ? ORDER BY second_of_day ASC')
    rows.push(...(stmt.all(start, end) as Row[]))
  } else {
    const stmt1 = db.prepare('SELECT * FROM template_samples WHERE second_of_day BETWEEN ? AND 86399 ORDER BY second_of_day ASC')
    const stmt2 = db.prepare('SELECT * FROM template_samples WHERE second_of_day BETWEEN 0 AND ? ORDER BY second_of_day ASC')
    rows.push(...(stmt1.all(start) as Row[]), ...(stmt2.all(end) as Row[]))
  }
  // If table is empty in this profile (e.g., elevated Administrator), reseed once
  if (rows.length === 0) {
    const cnt = db.prepare('SELECT COUNT(1) as c FROM template_samples').get() as { c: number }
    if (cnt.c === 0) {
      seed24h()
      rows = []
      if (start <= end) {
        const stmt = db.prepare('SELECT * FROM template_samples WHERE second_of_day BETWEEN ? AND ? ORDER BY second_of_day ASC')
        rows.push(...(stmt.all(start, end) as Row[]))
      } else {
        const stmt1 = db.prepare('SELECT * FROM template_samples WHERE second_of_day BETWEEN ? AND 86399 ORDER BY second_of_day ASC')
        const stmt2 = db.prepare('SELECT * FROM template_samples WHERE second_of_day BETWEEN 0 AND ? ORDER BY second_of_day ASC')
        rows.push(...(stmt1.all(start) as Row[]), ...(stmt2.all(end) as Row[]))
      }
    }
  }
  const baseTs = now - (rows.length - 1) * 1000
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  return rows.map((r, i) => ({
    id: 'B01',
    ts: baseTs + i * 1000,
    rpm: Math.round(clamp(r.rpm + (Math.random() - 0.5) * 10, 200, 1000)),
    vibration_piezo: clamp(r.vibration_piezo + (Math.random() - 0.5) * 0.08, 0.5, 6.5),
    vibration_sw420: clamp(r.vibration_sw420 + (Math.random() - 0.5) * 0.06, 0.5, 6.5),
    weight: clamp(r.weight + (Math.random() - 0.5) * 0.8, 400, 700),
    speed: clamp(r.speed + (Math.random() - 0.5) * 0.3, 20, 70),
    acceleration: clamp(r.acceleration + (Math.random() - 0.5) * 0.1, 0.05, 10),
    temperature: clamp(r.temperature + (Math.random() - 0.5) * 0.8, 0, 100),
    water_pressure: clamp(r.water_pressure + (Math.random() - 0.5) * 0.4, 1, 100),
    water_speed: clamp(r.water_speed + (Math.random() - 0.5) * 0.12, 2, 30),
    water_temperature: clamp(r.water_temperature + (Math.random() - 0.5) * 0.5, 0, 25)
  }))
}

export function fetchRange(seconds: number) {
  return fetchWindow(seconds)
}

export function getRowCount(): { path: string; rows: number } {
  const cnt = db.prepare('SELECT COUNT(1) as c FROM template_samples').get() as { c: number }
  return { path: getDbPath(), rows: cnt.c }
}

export function reseedDb() {
  db.exec('DELETE FROM template_samples;')
  seed24h()
} 