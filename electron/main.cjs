'use strict'

const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const http = require('http')
const https = require('https')
const fs = require('fs')

// ── Single instance lock ──────────────────────────────────────────────────────

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

// ── Config ────────────────────────────────────────────────────────────────────

const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json')
const DEFAULT_CONFIG = { immichServerUrl: 'http://localhost:2283' }

function readConfig() {
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

function writeConfig(data) {
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true })
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2))
}

// ── MIME types ────────────────────────────────────────────────────────────────

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
}

function getMime(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
}

// ── HTTP proxy to Immich ──────────────────────────────────────────────────────

function proxyToImmich(req, res, immichBaseUrl) {
  let base
  try {
    base = new URL(immichBaseUrl)
  } catch {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Invalid immichServerUrl in config' }))
    return
  }

  const isHttps = base.protocol === 'https:'
  const lib = isHttps ? https : http
  const port = base.port ? parseInt(base.port, 10) : (isHttps ? 443 : 80)

  const opts = {
    hostname: base.hostname,
    port,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: base.host },
    timeout: 30000,
  }

  const proxyReq = lib.request(opts, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers)
    proxyRes.pipe(res, { end: true })
  })

  proxyReq.on('timeout', () => {
    proxyReq.destroy()
    if (!res.headersSent) {
      res.writeHead(504, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Gateway timeout reaching Immich server' }))
    }
  })

  proxyReq.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Proxy error', detail: err.message }))
    }
  })

  req.pipe(proxyReq, { end: true })
}

// ── Local static + proxy server ───────────────────────────────────────────────

const DIST_DIR = path.join(app.getAppPath(), 'dist')
const INDEX_HTML = path.join(DIST_DIR, 'index.html')

let localServer = null
let currentConfig = readConfig()

function startLocalServer() {
  return new Promise((resolve, reject) => {
    localServer = http.createServer((req, res) => {
      const reqPath = req.url.split('?')[0]

      // Proxy all /api/* requests to the configured Immich server
      if (reqPath.startsWith('/api')) {
        proxyToImmich(req, res, currentConfig.immichServerUrl)
        return
      }

      // Resolve file path from dist/
      const filePath = reqPath === '/' ? INDEX_HTML : path.join(DIST_DIR, reqPath)

      fs.stat(filePath, (statErr, stat) => {
        if (statErr || !stat.isFile()) {
          // SPA fallback — serve index.html for any non-file route
          fs.readFile(INDEX_HTML, (readErr, data) => {
            if (readErr) {
              res.writeHead(500)
              res.end('Internal server error')
              return
            }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
            res.end(data)
          })
          return
        }

        res.writeHead(200, { 'Content-Type': getMime(filePath) })
        fs.createReadStream(filePath).pipe(res, { end: true })
      })
    })

    localServer.on('error', reject)

    // Listen on a random available port, loopback only
    localServer.listen(0, '127.0.0.1', () => {
      resolve(localServer.address().port)
    })
  })
}

// ── Setup window (first run) ──────────────────────────────────────────────────

let setupWindow = null

function createSetupWindow(onSubmit) {
  setupWindow = new BrowserWindow({
    width: 520,
    height: 300,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: 'ImmichExt — Setup',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  setupWindow.loadFile(path.join(__dirname, 'setup.html'))

  ipcMain.once('setup:submit', (_event, serverUrl) => {
    const sanitized = serverUrl.trim().replace(/\/+$/, '')
    currentConfig = { ...currentConfig, immichServerUrl: sanitized }
    writeConfig(currentConfig)
    if (setupWindow && !setupWindow.isDestroyed()) setupWindow.close()
    onSubmit()
  })

  setupWindow.on('closed', () => { setupWindow = null })
}

// ── Main window ───────────────────────────────────────────────────────────────

let mainWindow = null

async function createMainWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'ImmichExt',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const isDev = !fs.existsSync(INDEX_HTML)
  const loadUrl = isDev ? 'http://localhost:5173' : `http://127.0.0.1:${port}`

  mainWindow.loadURL(loadUrl)

  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  // Open external links in the system browser instead of a new Electron window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

// ── IPC handlers ──────────────────────────────────────────────────────────────

ipcMain.handle('config:get', () => currentConfig)

ipcMain.handle('config:set', (_event, updates) => {
  if (updates && typeof updates === 'object') {
    currentConfig = { ...currentConfig, ...updates }
    writeConfig(currentConfig)
  }
  return currentConfig
})

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  const isDev = !fs.existsSync(INDEX_HTML)
  let port = null

  if (!isDev) {
    port = await startLocalServer()
  }

  const firstRun = !fs.existsSync(CONFIG_FILE)

  if (firstRun && !isDev) {
    createSetupWindow(() => createMainWindow(port))
  } else {
    await createMainWindow(port)
  }
})

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (localServer) localServer.close()
    app.quit()
  }
})

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const isDev = !fs.existsSync(INDEX_HTML)
    const port = (!isDev && localServer) ? localServer.address().port : null
    await createMainWindow(port)
  }
})
