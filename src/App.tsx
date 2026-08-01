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

export function App() {
  const [tool, setTool] = useState<Tool>('convert')
  const [update, setUpdate] = useState<UpdateInfo | null>(null)

  useEffect(() => {
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
