import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { initDb, fetchWindow } from './db'
import { appendFileSync } from 'node:fs'

app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-gpu-vsync')

// Ensure proper taskbar grouping and notifications on Windows
if (process.platform === 'win32') {
  app.setAppUserModelId('az.deepsense.hydrosense')
}

function log(message: string) {
  try {
    const p = join(app.getPath('userData'), 'app.log')
    appendFileSync(p, `[${new Date().toISOString()}] ${message}\n`)
  } catch (_) {}
}

let win: BrowserWindow | null = null

function resolveIconPath(): string | undefined {
  try {
    if (process.env.VITE_DEV_SERVER) {
      return join(process.cwd(), 'build', 'icon.png')
    }
    return join(process.resourcesPath, 'icon.png')
  } catch {
    return undefined
  }
}

// Single instance lock to prevent multiple windows when double-clicking the installer
const singleInstanceLockAcquired = app.requestSingleInstanceLock()
if (!singleInstanceLockAcquired) {
  log('Second instance detected - quitting')
  app.quit()
  process.exit(0)
} else {
  app.on('second-instance', () => {
    log('Second instance event - focusing existing window')
    if (win) {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
  })
}

async function createWindow() {
  try {
    log('Initializing DB')
    initDb()
  } catch (e) {
    log('DB init error: ' + (e as Error).message)
  }

  log('Creating BrowserWindow')
  win = new BrowserWindow({
    width: 1360,
    height: 860,
    backgroundColor: '#0b1311',
    titleBarStyle: 'hiddenInset',
    autoHideMenuBar: true,
    show: false,
    icon: resolveIconPath(),
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  win.on('ready-to-show', () => {
    log('Window ready-to-show -> showing')
    win?.show()
    win?.focus()
  })
  win.on('unresponsive', () => log('Window unresponsive'))
  win.webContents.on('render-process-gone', (_e, details) => log(`Renderer gone: ${details.reason}`))

  try {
    if (process.env.VITE_DEV_SERVER) {
      log('Loading dev URL')
      await win.loadURL('http://localhost:5173')
    } else {
      const file = join(__dirname, '../renderer/index.html')
      log('Loading file: ' + file)
      await win.loadFile(file)
    }
    log('Content loaded')
  } catch (e) {
    log('Load error: ' + (e as Error).message)
  }
}

app.whenReady().then(() => {
  log('App ready')
  createWindow()
}).catch(e => log('App ready error: ' + (e as Error).message))

app.on('window-all-closed', () => {
  log('All windows closed')
  if (process.platform !== 'darwin') app.quit()
})
app.on('activate', () => {
  log('App activate')
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

process.on('uncaughtException', (e) => log('Uncaught exception: ' + (e as Error).message))
process.on('unhandledRejection', (reason) => log('Unhandled rejection: ' + String(reason)))

ipcMain.handle('dialog:open', async () => {
  const res = await dialog.showOpenDialog(win!, { properties: ['openFile'] })
  if (res.canceled || res.filePaths.length === 0) return null
  const path = res.filePaths[0]
  const text = await readFile(path, 'utf-8')
  return { path, text }
})

ipcMain.handle('dialog:save', async (_e, payload: { path?: string; text: string }) => {
  const p = payload.path || (await dialog.showSaveDialog(win!, { defaultPath: 'hydrosense.json' })).filePath
  if (!p) return null
  await writeFile(p, payload.text, 'utf-8')
  return p
})

ipcMain.handle('db:window', async (_e, seconds: number) => {
  return fetchWindow(seconds)
})

ipcMain.handle('ai:generate', async (_e, payload: { system: string; messages: { role: 'user'|'model'; content: string }[] }) => {
  const DEFAULT_API_KEY = 'AIzaSyBqvaOiqEx8W58Ytkfadu6FSvxVvRid7Q4'
  const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
  const body = {
    systemInstruction: { parts: [{ text: payload.system }] },
    contents: payload.messages.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
    generationConfig: { temperature: 0.4, topP: 0.9, topK: 40, maxOutputTokens: 2048 }
  }
  const res = await fetch(`${BASE_URL}?key=${DEFAULT_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error('AI request failed')
  const json = await res.json()
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return text
}) 