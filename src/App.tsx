import { useState } from 'react'
import { Converter } from './components/Converter'
import { Combiner } from './components/Combiner'
import { Editor } from './components/Editor'

type Tool = 'convert' | 'combine' | 'edit'

const TABS: { id: Tool; label: string; icon: string }[] = [
  { id: 'convert', label: 'Convert', icon: '🖼️' },
  { id: 'combine', label: 'Combine', icon: '🧩' },
  { id: 'edit', label: 'Edit', icon: '✍️' },
]

export function App() {
  const [tool, setTool] = useState<Tool>('convert')

  return (
    <div className="app">
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
