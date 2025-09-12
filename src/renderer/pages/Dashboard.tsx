import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, AreaChart, Area } from 'recharts'
import { useMockStore } from '../store/mock'
import { Gauge } from '../ui/Gauge'

function downsample<T>(arr: T[], step: number) {
  if (arr.length <= 400) return arr
  const out: T[] = []
  for (let i = 0; i < arr.length; i += step) out.push(arr[i])
  return out
}

export default function Dashboard() {
  const { latestWindow, summary } = useMockStore()

  const chartData = useMemo(() => {
    const base = latestWindow.map(d => ({
      ts: new Date(d.ts).toLocaleTimeString(),
      rpm: d.rpm,
      vibration_piezo: d.vibration_piezo,
      vibration_sw420: d.vibration_sw420,
      weight: d.weight,
      speed: d.speed,
      acceleration: d.acceleration,
      temperature: d.temperature,
      water_pressure: d.water_pressure,
      water_speed: d.water_speed,
      water_temperature: d.water_temperature
    }))
    return downsample(base, Math.ceil(base.length / 400))
  }, [latestWindow])

  const counts = useMemo(() => {
    let alert = 0, warn = 0, ok = 0
    latestWindow.forEach(d => { if (d.status === 'alert') alert++; else if (d.status === 'warn') warn++; else ok++; })
    return { alert, warn, ok }
  }, [latestWindow])

  const lastUpdate = latestWindow.length ? new Date(latestWindow[latestWindow.length - 1].ts).toLocaleTimeString() : '-'

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 pt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="text-sm text-neutral-400">Real-time monitoring and insights</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-neutral-400">Last update:</span>
          <span className="text-neutral-200">{lastUpdate}</span>
          <span className="ml-4 inline-flex items-center rounded-md bg-red-500/20 text-red-300 px-2 h-7">Alerts {counts.alert}</span>
          <span className="inline-flex items-center rounded-md bg-yellow-500/20 text-yellow-300 px-2 h-7">Warn {counts.warn}</span>
          <span className="inline-flex items-center rounded-md bg-emerald-500/20 text-emerald-300 px-2 h-7">OK {counts.ok}</span>
        </div>
      </div>
      <div className="p-5 grid grid-cols-12 gap-4">
        <div className="col-span-12 bg-neutral-900/60 border border-neutral-800 rounded-xl p-3">
          <div className="flex items-center justify-between pb-1">
            <div className="text-sm text-neutral-400">Real-time signals</div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="#262b29" />
                <XAxis dataKey="ts" hide />
                <YAxis yAxisId="l" stroke="#6b7280" domain={[0, 100]} ticks={[0,20,40,60,80,100]} allowDecimals={false} />
                <YAxis yAxisId="r" orientation="right" stroke="#a78bfa" domain={[200, 1000]} ticks={[200,400,600,800,1000]} allowDecimals={false} />
                <YAxis yAxisId="w" hide domain={[400, 700]} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1f2937' }} />
                <Legend wrapperStyle={{ color: '#9ca3af' }} verticalAlign="top" height={20} />
                <Line yAxisId="r" type="monotone" dataKey="rpm" stroke="#a78bfa" dot={false} strokeWidth={2} isAnimationActive={false} />
                <Line yAxisId="l" type="monotone" dataKey="vibration_piezo" stroke="#22c55e" dot={false} strokeWidth={2} isAnimationActive={false} />
                <Line yAxisId="l" type="monotone" dataKey="vibration_sw420" stroke="#10b981" dot={false} strokeWidth={2} isAnimationActive={false} />
                <Line yAxisId="w" type="monotone" dataKey="weight" stroke="#60a5fa" dot={false} strokeWidth={2} isAnimationActive={false} />
                <Line yAxisId="l" type="monotone" dataKey="speed" stroke="#06b6d4" dot={false} strokeWidth={2} isAnimationActive={false} />
                <Line yAxisId="l" type="monotone" dataKey="acceleration" stroke="#f472b6" dot={false} strokeWidth={2} isAnimationActive={false} />
                <Line yAxisId="l" type="monotone" dataKey="temperature" stroke="#f59e0b" dot={false} strokeWidth={2} isAnimationActive={false} />
                <Line yAxisId="l" type="monotone" dataKey="water_pressure" stroke="#94a3b8" dot={false} strokeWidth={2} isAnimationActive={false} />
                <Line yAxisId="l" type="monotone" dataKey="water_speed" stroke="#0ea5e9" dot={false} strokeWidth={2} isAnimationActive={false} />
                <Line yAxisId="l" type="monotone" dataKey="water_temperature" stroke="#ef4444" dot={false} strokeWidth={2} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="col-span-12 grid grid-cols-4 gap-4">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
            <div className="text-xs text-neutral-400">RPM trend</div>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="rpmg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="ts" hide />
                  <YAxis hide />
                  <Area type="monotone" dataKey="rpm" stroke="#a78bfa" fill="url(#rpmg)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
            <div className="text-xs text-neutral-400">Vibration</div>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="vibg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="ts" hide />
                  <YAxis hide />
                  <Area type="monotone" dataKey="vibration_piezo" stroke="#22c55e" fill="url(#vibg)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
            <div className="text-xs text-neutral-400">Temperature</div>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="tempg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="ts" hide />
                  <YAxis hide />
                  <Area type="monotone" dataKey="temperature" stroke="#f59e0b" fill="url(#tempg)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
            <div className="text-xs text-neutral-400">Water temperature</div>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="wtempg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="ts" hide />
                  <YAxis hide />
                  <Area type="monotone" dataKey="water_temperature" stroke="#ef4444" fill="url(#wtempg)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <motion.div whileHover={{ y: -2 }} className="col-span-3 bg-neutral-900/60 border border-neutral-800 rounded-xl p-3">
          <div className="text-sm text-neutral-400">RPM</div>
          <div className="pt-2"><Gauge value={summary.rpm} unit="rpm" color="#a78bfa" /></div>
        </motion.div>
        <motion.div whileHover={{ y: -2 }} className="col-span-3 bg-neutral-900/60 border border-neutral-800 rounded-xl p-3">
          <div className="text-sm text-neutral-400">Vibration (piezo)</div>
          <div className="pt-2"><Gauge value={summary.vibration_piezo} unit="g" color="#22c55e" /></div>
        </motion.div>
        <motion.div whileHover={{ y: -2 }} className="col-span-3 bg-neutral-900/60 border border-neutral-800 rounded-xl p-3">
          <div className="text-sm text-neutral-400">Vibration (SW-420)</div>
          <div className="pt-2"><Gauge value={summary.vibration_sw420} unit="g" color="#10b981" /></div>
        </motion.div>
        <motion.div whileHover={{ y: -2 }} className="col-span-3 bg-neutral-900/60 border border-neutral-800 rounded-xl p-3">
          <div className="text-sm text-neutral-400">Speed</div>
          <div className="pt-2"><Gauge value={summary.speed} unit="m/s" color="#06b6d4" /></div>
        </motion.div>
        <motion.div whileHover={{ y: -2 }} className="col-span-3 bg-neutral-900/60 border border-neutral-800 rounded-xl p-3">
          <div className="text-sm text-neutral-400">Acceleration</div>
          <div className="pt-2"><Gauge value={summary.acceleration} unit="m/s²" color="#f472b6" /></div>
        </motion.div>
        <motion.div whileHover={{ y: -2 }} className="col-span-3 bg-neutral-900/60 border border-neutral-800 rounded-xl p-3">
          <div className="text-sm text-neutral-400">Temperature</div>
          <div className="pt-2"><Gauge value={summary.temperature} unit="°C" color="#f59e0b" /></div>
        </motion.div>
        <motion.div whileHover={{ y: -2 }} className="col-span-3 bg-neutral-900/60 border border-neutral-800 rounded-xl p-3">
          <div className="text-sm text-neutral-400">Water speed</div>
          <div className="pt-2"><Gauge value={summary.water_speed} unit="m/s" color="#0ea5e9" /></div>
        </motion.div>
        <motion.div whileHover={{ y: -2 }} className="col-span-3 bg-neutral-900/60 border border-neutral-800 rounded-xl p-3">
          <div className="text-sm text-neutral-400">Water temperature</div>
          <div className="pt-2"><Gauge value={summary.water_temperature} unit="°C" color="#ef4444" /></div>
        </motion.div>
      </div>
    </div>
  )
} 