import { useState } from 'react'
import ExportDialog from '../components/ExportDialog'

export default function Reports() {
  const [open, setOpen] = useState(true)
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Reports</h2>
        <button onClick={()=>setOpen(true)} className="h-9 px-3 rounded-md bg-emerald-600 hover:bg-emerald-500 text-sm">Open Export</button>
      </div>
      {open && <ExportDialog open={open} onClose={()=>setOpen(false)} />}
    </div>
  )
} 