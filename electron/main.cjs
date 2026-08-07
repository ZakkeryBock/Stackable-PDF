// Electron main process. Serves the built app over a local loopback HTTP server
// (so PDF.js web workers, ES modules, and blob downloads all behave exactly like
// they do in a browser) and shows it in a native window.
const { app, BrowserWindow, shell, dialog, ipcMain } = require('electron')
const path = require('path')
const { autoUpdater } = require('electron-updater')
const { startServer } = require('./server.cjs')

const isDev = !!process.env.ELECTRON_DEV
const DIST = path.join(__dirname, '..', 'dist')

let mainWindow = null

async function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 860,
    minWidth: 820,
    minHeight: 600,
    autoHideMenuBar: true,
    backgroundColor: '#0f1117',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })
  mainWindow = win
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null
  })

  win.once('ready-to-show', () => win.show())

  // Open any external links (e.g. footer links) in the system browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  try {
    if (isDev) {
      await win.loadURL('http://localhost:5173')
      win.webContents.openDevTools({ mode: 'detach' })
    } else {
      const { port } = await startServer(DIST)
      await win.loadURL(`http://127.0.0.1:${port}/`)
    }
  } catch (err) {
    dialog.showErrorBox('Failed to start', String(err))
  }
}

// Per-user NSIS install (perMachine: false) means quitAndInstall never needs
// admin approval — the update just overwrites files under the user's own
// AppData, same as the original install did.
function setupAutoUpdate() {
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update-available', { version: info.version })
  })
  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update-downloaded', { version: info.version })
  })
  autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('update-error', String(err))
  })

  autoUpdater.checkForUpdates().catch(() => {
    // No network / no published release yet — silently skip, the in-app banner covers this.
  })
}

// Silent + forceRunAfter: same no-admin-needed install as the update check itself
// (per-user NSIS), just triggered by the in-app button instead of app quit.
ipcMain.on('install-update', () => autoUpdater.quitAndInstall(false, true))

app.whenReady().then(() => {
  createWindow()
  setupAutoUpdate()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
