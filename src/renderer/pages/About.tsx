export default function About() {
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold">About</h2>
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 space-y-2">
        <div className="text-sm text-neutral-400">HydroSense — Smart Turbine Blade Monitoring</div>
        <p className="leading-relaxed">Presented by DeepSense. Real-time sensing, analytics and insights for hydropower turbines.</p>
        <div className="text-sm">Website: <a className="text-emerald-400" href="https://example.com" target="_blank">hydrosense</a></div>
        <div className="text-sm">Version: 1.0.0</div>
        <div className="text-sm">License: MIT</div>
      </div>
    </div>
  )
} 