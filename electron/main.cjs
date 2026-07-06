// Electron main process. Serves the built app over a local loopback HTTP server
// (so PDF.js web workers, ES modules, and blob downloads all behave exactly like
// they do in a browser) and shows it in a native window.
const { app, BrowserWindow, shell, dialog } = require('electron')
const path = require('path')
const { startServer } = require('./server.cjs')

const isDev = !!process.env.ELECTRON_DEV
const DIST = path.join(__dirname, '..', 'dist')

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
    },
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

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
