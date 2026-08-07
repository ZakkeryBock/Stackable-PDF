import { useEffect, useState } from 'react'
import pkg from '../package.json'
import { Converter } from './components/Converter'
import { Combiner } from './components/Combiner'
import { Editor } from './components/Editor'
import { checkForUpdate, type UpdateInfo } from './lib/updateCheck'

type Tool = 'convert' | 'combine' | 'edit'

const TABS: { id: Tool; label: string; icon: string }[] = [
  { id: 'convert', label: 'Convert', icon: '🖼️' },
  { id: 'combine', label: 'Combine', icon: '🧩' },
  { id: 'edit', label: 'Edit', icon: '✍️' },
]

const DISMISSED_KEY = 'pdf-suite-dismissed-update'

type AppUpdateState =
  | { status: 'idle' }
  | { status: 'downloading'; version: string }
  | { status: 'ready'; version: string }

export function App() {
  const [tool, setTool] = useState<Tool>('convert')
  const [update, setUpdate] = useState<UpdateInfo | null>(null)
  const [appUpdate, setAppUpdate] = useState<AppUpdateState>({ status: 'idle' })
  const [appUpdateDismissed, setAppUpdateDismissed] = useState(false)

  useEffect(() => {
    // Desktop app: main process downloads in the background via electron-updater;
    // this just reflects that state so the Restart & Update button can fire when ready.
    if (window.electronAPI) {
      window.electronAPI.onUpdateAvailable((info) => setAppUpdate({ status: 'downloading', version: info.version }))
      window.electronAPI.onUpdateDownloaded((info) => setAppUpdate({ status: 'ready', version: info.version }))
      return
    }
    // Browser / dev fallback: no electron-updater, just point at the release page.
    checkForUpdate(pkg.version).then((info) => {
      if (info && localStorage.getItem(DISMISSED_KEY) !== info.version) setUpdate(info)
    })
  }, [])

  function dismissUpdate() {
    if (update) localStorage.setItem(DISMISSED_KEY, update.version)
    setUpdate(null)
  }

  return (
    <div className="app">
      {appUpdate.status !== 'idle' && !appUpdateDismissed && (
        <div className="update-banner row">
          {appUpdate.status === 'downloading' && <span>⬇️ Downloading version {appUpdate.version}…</span>}
          {appUpdate.status === 'ready' && (
            <>
              <span>🚀 Version {appUpdate.version} is ready.</span>
              <button className="btn primary" onClick={() => window.electronAPI!.installUpdate()}>
                Restart & Update
              </button>
            </>
          )}
          <div className="spacer" />
          <button className="iconbtn" title="Dismiss" onClick={() => setAppUpdateDismissed(true)}>
            ✕
          </button>
        </div>
      )}
      {update && (
        <div className="update-banner row">
          <span>🚀 Version {update.version} is available.</span>
          <a href={update.url} target="_blank" rel="noreferrer">
            View release
          </a>
          <div className="spacer" />
          <button className="iconbtn" title="Dismiss" onClick={dismissUpdate}>
            ✕
          </button>
        </div>
      )}
      <header className="topbar">
        <div className="brand">
          <div className="logo">PDF</div>
          <div>
            Stackable
            <small>Convert · Combine · Edit — all in your browser</small>
          </div>
        </div>
        <nav className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab ${tool === t.id ? 'active' : ''}`}
              onClick={() => setTool(t.id)}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {tool === 'convert' && <Converter />}
        {tool === 'combine' && <Combiner />}
        {tool === 'edit' && <Editor />}
      </main>

      <p className="footer">
        Your files never leave this device — everything runs locally in your browser.
      </p>
    </div>
  )
}
