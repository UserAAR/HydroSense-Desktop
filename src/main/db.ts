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
  const tx = db.transaction(() => {
    for (let s = 0; s < 86400; s++) {
      const rpm = 1100 + Math.sin(s / 40) * 25
      const vibration_piezo = Math.max(0, 0.35 + Math.sin(s / 55) * 0.22)
      const vibration_sw420 = Math.max(0, 0.2 + Math.sin(s / 65) * 0.18)
      const weight = 12 + Math.sin(s / 120) * 2.2
      const speed = 6 + Math.sin(s / 90) * 0.9
      const acceleration = 0.8 + Math.sin(s / 70) * 0.25
      const temperature = 34 + Math.sin(s / 200) * 2.5
      const water_pressure = 2.1 + Math.sin(s / 130) * 0.3
      const water_speed = 1.8 + Math.sin(s / 110) * 0.35
      const water_temperature = 22 + Math.sin(s / 300) * 1.5
      insert.run({ second_of_day: s, rpm, vibration_piezo, vibration_sw420, weight, speed, acceleration, temperature, water_pressure, water_speed, water_temperature })
    }
  })
  tx()
}

function getSecondOfDay(ts: number) {
  const d = new Date(ts)
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()
}

export function fetchWindow(seconds: number) {
  const now = Date.now()
  const end = getSecondOfDay(now)
  const start = (end - seconds + 86400) % 86400
  const rows: Row[] = []
  if (start <= end) {
    const stmt = db.prepare('SELECT * FROM template_samples WHERE second_of_day BETWEEN ? AND ? ORDER BY second_of_day ASC')
    rows.push(...(stmt.all(start, end) as Row[]))
  } else {
    const stmt1 = db.prepare('SELECT * FROM template_samples WHERE second_of_day BETWEEN ? AND 86399 ORDER BY second_of_day ASC')
    const stmt2 = db.prepare('SELECT * FROM template_samples WHERE second_of_day BETWEEN 0 AND ? ORDER BY second_of_day ASC')
    rows.push(...(stmt1.all(start) as Row[]), ...(stmt2.all(end) as Row[]))
  }
  const baseTs = now - (rows.length - 1) * 1000
  return rows.map((r, i) => ({
    id: 'B01',
    ts: baseTs + i * 1000,
    rpm: Math.round(r.rpm + (Math.random() - 0.5) * 10),
    vibration_piezo: Math.max(0, r.vibration_piezo + (Math.random() - 0.5) * 0.08),
    vibration_sw420: Math.max(0, r.vibration_sw420 + (Math.random() - 0.5) * 0.06),
    weight: r.weight + (Math.random() - 0.5) * 0.8,
    speed: r.speed + (Math.random() - 0.5) * 0.3,
    acceleration: r.acceleration + (Math.random() - 0.5) * 0.1,
    temperature: r.temperature + (Math.random() - 0.5) * 0.8,
    water_pressure: r.water_pressure + (Math.random() - 0.5) * 0.1,
    water_speed: r.water_speed + (Math.random() - 0.5) * 0.12,
    water_temperature: r.water_temperature + (Math.random() - 0.5) * 0.5
  }))
}

export function fetchRange(seconds: number) {
  return fetchWindow(seconds)
} 