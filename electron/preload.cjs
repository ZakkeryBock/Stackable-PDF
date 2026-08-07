const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (_e, info) => cb(info)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', (_e, info) => cb(info)),
  onUpdateError: (cb) => ipcRenderer.on('update-error', (_e, message) => cb(message)),
  installUpdate: () => ipcRenderer.send('install-update'),
})
