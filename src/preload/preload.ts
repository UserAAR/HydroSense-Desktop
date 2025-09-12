import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  openFile: () => ipcRenderer.invoke('dialog:open'),
  saveFile: (payload: { path?: string; text: string }) => ipcRenderer.invoke('dialog:save', payload),
  fetchWindow: (seconds: number) => ipcRenderer.invoke('db:window', seconds),
  dbDiag: () => ipcRenderer.invoke('db:diag'),
  dbReseed: () => ipcRenderer.invoke('db:reseed'),
  aiGenerate: (payload: { system: string; messages: { role: 'user'|'model'; content: string }[] }) => ipcRenderer.invoke('ai:generate', payload)
}) 