# HydroSense Desktop

HydroSense Desktop is a cross-platform Electron application for real-time monitoring, analysis, and reporting of hydro systems. It provides rich charts, AI-driven insights, and offline-first storage with SQLite.


## Features

- Real-time dashboards with multi-signal charts (RPM, vibration, temperature, water pressure/speed/temperature, etc.)
- AI-powered analysis (Gemini 2.0 Flash) with concise, actionable insights
- Export data: CSV, Excel (XLSX), JSON; Import JSON
- Offline-first: Local SQLite database with WAL mode
- Secure IPC bridge between renderer and main process (contextIsolation enabled)
- Cross-platform packaging (Linux deb/AppImage, Windows portable)


## Architecture

HydroSense Desktop follows a typical Electron architecture: main process, preload bridge, and React-based renderer.

```mermaid
graph TD
  subgraph Electron Main
    A[App lifecycle] --> B[DB (better-sqlite3)]
    A --> C[BrowserWindow]
    A --> D[AI request (Gemini)]
    E[IPC handlers] -->|dialog:open/save| C
    E -->|db:window| B
    E -->|ai:generate| D
  end
  subgraph Preload
    F[contextBridge exposeInMainWorld]
  end
  subgraph Renderer (React)
    G[Pages & Components] --> H[Charts, Gauges]
    G --> I[Export/Import]
    G --> J[AI Analysis]
  end
  B <--> E
  F <--> G
  C <--> G
```

- Main: initializes DB, creates window, handles IPC for file dialogs, data windows, AI requests
- Preload: exposes safe `window.api` to the renderer (no Node in renderer)
- Renderer: React/Tailwind UI for dashboards, analysis, AI insights, logs/reports/settings


## Tech Stack

- Electron 37, TypeScript 5, Vite 7, tsup
- React 19, React Router 7, Tailwind CSS, Framer Motion, Recharts
- SQLite via `better-sqlite3` (WAL enabled)
- Data processing & export: `date-fns`, `papaparse`, `xlsx`
- Icons: `lucide-react`
- Packaging: `electron-builder`


## Directory Structure

```
HydroSense-Desktop/
  index.html
  package.json
  src/
    main/           # Electron main process (DB, IPC, AI)
      db.ts
      main.ts
    preload/        # Secure bridge (contextBridge)
      preload.ts
    renderer/       # React app (UI)
      assets/
      components/
      lib/
      pages/
      store/
      types/
      ui/
```


## Getting Started

### Prerequisites
- Node.js 18+ (recommended 20 LTS)
- npm 9+

### Install
```bash
npm install
```

### Development
```bash
# starts Vite dev server, tsup watcher, and Electron
echo "Set your Gemini API key before running:" && \
  export HYDROSENSE_GEMINI_API_KEY="<YOUR_GEMINI_API_KEY>" && \
  npm run dev
```

- Dev server: `http://localhost:5173`
- Electron main/preload are built by `tsup` (CJS) on watch mode


## Build & Package

```bash
# Production build
npm run build

# Linux packages (deb, AppImage)
npm run package:linux

# Windows portable
npm run package:win
```

Artifacts are produced by `electron-builder` with product name `HydroSense`.


## Configuration

Environment variables (read in Electron main process):

- `HYDROSENSE_GEMINI_API_KEY` – Google Generative Language (Gemini) API key
- `HYDROSENSE_MQTT_URL` – optional, MQTT broker URL for LoRaWAN (e.g., `mqtts://eu1.cloud.thethings.network`)
- `HYDROSENSE_MQTT_USERNAME` – optional, MQTT username (TTN application id)
- `HYDROSENSE_MQTT_PASSWORD` – optional, MQTT password (TTN API key)
- `HYDROSENSE_SERIAL_PATH` – optional, serial port path for direct LoRa/Modem (e.g., `/dev/ttyUSB0`)
- `HYDROSENSE_SERIAL_BAUD` – optional, baud rate (default: `9600`)

Note: The sample code includes hard-coded API keys for development. Move all keys to environment variables for security.


## Database

- Engine: SQLite via `better-sqlite3`
- Location: `${app.getPath('userData')}/data/appdata.db`
- Current table: `template_samples` (simulated 24h seed data)
- Recommended for production: create a `telemetry` table keyed by timestamp for real device data.

Example production schema:
```sql
CREATE TABLE IF NOT EXISTS telemetry (
  ts INTEGER PRIMARY KEY,
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
```

Sample insert function (main process):
```ts
export function insertSample(s: {
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
}) {
  db.prepare(`INSERT OR REPLACE INTO telemetry
    (ts,rpm,vibration_piezo,vibration_sw420,weight,speed,acceleration,temperature,water_pressure,water_speed,water_temperature)
    VALUES (@ts,@rpm,@vibration_piezo,@vibration_sw420,@weight,@speed,@acceleration,@temperature,@water_pressure,@water_speed,@water_temperature)`)
    .run(s)
}
```


## Telemetry Ingestion (LoRaWAN)

HydroSense ships with simulated data. For real telemetry via LoRaWAN, pick one of the options below.

### A) LoRaWAN Network Server via MQTT (TTN/The Things Stack or ChirpStack)

1. Enable payload decoder in your network server so uplinks provide a `decoded_payload` JSON.
2. Add dependency:
   ```bash
   npm i mqtt
   ```
3. Connect and subscribe from Electron main process:
   ```ts
   import mqtt from 'mqtt'
   import { insertSample } from './db'

   export function startMqtt() {
     const url = process.env.HYDROSENSE_MQTT_URL || 'mqtts://eu1.cloud.thethings.network'
     const client = mqtt.connect(url, {
       username: process.env.HYDROSENSE_MQTT_USERNAME,
       password: process.env.HYDROSENSE_MQTT_PASSWORD,
       protocolVersion: 4
     })

     client.on('connect', () => {
       const appId = process.env.HYDROSENSE_MQTT_USERNAME
       client.subscribe(`v3/${appId}@ttn/devices/+/up`)
     })

     client.on('message', (_topic, msg) => {
       const json = JSON.parse(msg.toString())
       const p = json.uplink_message?.decoded_payload
       if (!p) return
       insertSample({
         ts: Date.now(),
         rpm: p.rpm,
         vibration_piezo: p.vib_piezo,
         vibration_sw420: p.vib_sw420,
         weight: p.weight,
         speed: p.speed,
         acceleration: p.accel,
         temperature: p.temp,
         water_pressure: p.water_p,
         water_speed: p.water_v,
         water_temperature: p.water_t
       })
     })
   }
   ```

### B) Direct Serial Modem/Gateway

1. Add dependency:
   ```bash
   npm i serialport
   ```
2. Read line-delimited JSON from serial (Electron main):
   ```ts
   import { SerialPort } from 'serialport'
   import { insertSample } from './db'

   export function startSerial() {
     const path = process.env.HYDROSENSE_SERIAL_PATH || '/dev/ttyUSB0'
     const baudRate = Number(process.env.HYDROSENSE_SERIAL_BAUD || 9600)
     const port = new SerialPort({ path, baudRate })

     let buffer = ''
     port.on('data', data => {
       buffer += data.toString()
       let idx
       while ((idx = buffer.indexOf('\n')) >= 0) {
         const line = buffer.slice(0, idx).trim()
         buffer = buffer.slice(idx + 1)
         try {
           const p = JSON.parse(line)
           insertSample({
             ts: Date.now(),
             rpm: p.rpm,
             vibration_piezo: p.vib_piezo,
             vibration_sw420: p.vib_sw420,
             weight: p.weight,
             speed: p.speed,
             acceleration: p.accel,
             temperature: p.temp,
             water_pressure: p.water_p,
             water_speed: p.water_v,
             water_temperature: p.water_t
           })
         } catch {}
       }
     })
   }
   ```

After adding ingestion, update your query function to read from `telemetry` by timestamp.


## IPC API (Preload → Main)

Exposed on `window.api`:

- `openFile(): Promise<{ path: string; text: string } | null>` – open file dialog and read file text
- `saveFile(payload: { path?: string; text: string }): Promise<string | null>` – save dialog or write to provided path
- `fetchWindow(seconds: number): Promise<Row[]>` – return a rolling time window of samples
- `aiGenerate(payload: { system: string; messages: { role: 'user'|'model'; content: string }[] }): Promise<string>` – call Gemini and return model text

`Row` shape in renderer:
```ts
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
```


## AI Analysis

- Model: Gemini 2.0 Flash via REST API
- System prompt forces compact JSON only
- Data: downsampled window (e.g., last 10 minutes, 30s interval)

Example call from renderer (proxied via main):
```ts
const text = await window.api.aiGenerate({
  system: systemPrompt,
  messages: [{ role: 'user', content: instruction }]
})
```

Security:
- Keep the API key only in the main process via env var; never expose to renderer/bundled code.


## Scripts

- `npm run dev` – Dev mode (Vite + tsup + Electron)
- `npm run build` – Production build (tsup main/preload, vite renderer)
- `npm run package:linux` – Linux packages (deb, AppImage)
- `npm run package:win` – Windows portable
- `npm start` – Run packaged app in development context


## Troubleshooting

- Blank window in dev: ensure `wait-on tcp:5173` resolves; check Vite port.
- GPU-related flicker: GPU vsync is disabled via `app.commandLine.appendSwitch('disable-gpu-vsync')` and `disableHardwareAcceleration()`.
- SQLite locked: ensure single instance and no external process holding the DB; WAL is enabled.
- Missing AI key: set `HYDROSENSE_GEMINI_API_KEY` before `npm run dev`/`npm start`.


## Security Notes

- Do not hard-code API keys. Use environment variables and only read them in Electron main.
- Keep `contextIsolation: true` and `nodeIntegration: false` (already configured).
- Sanitize any user-provided content if rendering HTML; use libraries like `dompurify` when needed.


## Roadmap

- First-class telemetry ingestion (MQTT + Serial) with configurable decoders
- Long-term storage and retention policies, indexing for analytics windows
- Alerting/notifications with thresholds and rules engine
- Improved AI prompts and model selection
- Role-based export permissions and audit logs


## License

ISC License. See the `license` field in `package.json`.


## Maintainers

HydroSense <support@hydrosense.local> 