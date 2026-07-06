import { useEffect, useState } from 'react'
import { FileDrop } from './FileDrop'
import { combineToPdf, downloadBytes, type PageMode } from '../lib/pdf'
import { isImageFile, isPdfFile } from '../lib/images'
import { formatSize, uid } from '../lib/util'

type Item = { id: string; file: File; url?: string; kind: 'pdf' | 'image' }

export function Combiner() {
  const [items, setItems] = useState<Item[]>([])
  const [mode, setMode] = useState<PageMode>('a4')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ text: string; kind?: 'ok' | 'err' } | null>(null)

  useEffect(() => {
    return () => items.forEach((it) => it.url && URL.revokeObjectURL(it.url))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function addFiles(files: File[]) {
    const accepted: Item[] = []
    let rejected = 0
    for (const file of files) {
      if (isPdfFile(file)) {
        accepted.push({ id: uid('f'), file, kind: 'pdf' })
      } else if (isImageFile(file)) {
        accepted.push({ id: uid('f'), file, kind: 'image', url: URL.createObjectURL(file) })
      } else {
        rejected += 1
      }
    }
    setItems((prev) => [...prev, ...accepted])
    setStatus(
      rejected > 0
        ? { text: `Skipped ${rejected} unsupported file${rejected > 1 ? 's' : ''}.`, kind: 'err' }
        : null,
    )
  }

  function move(index: number, dir: -1 | 1) {
    setItems((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function remove(id: string) {
    setItems((prev) => {
      const it = prev.find((p) => p.id === id)
      if (it?.url) URL.revokeObjectURL(it.url)
      return prev.filter((p) => p.id !== id)
    })
  }

  function clearAll() {
    items.forEach((it) => it.url && URL.revokeObjectURL(it.url))
    setItems([])
    setStatus(null)
  }

  async function combine() {
    if (items.length < 1) return
    setBusy(true)
    setStatus({ text: 'Combining…' })
    try {
      const bytes = await combineToPdf(
        items.map((it) => it.file),
        mode,
        (done, total) => setStatus({ text: `Combining… ${done}/${total}` }),
      )
      downloadBytes(bytes, 'combined.pdf')
      setStatus({ text: `Combined ${items.length} file${items.length > 1 ? 's' : ''} into one PDF.`, kind: 'ok' })
    } catch (err) {
      console.error(err)
      setStatus({ text: `Combine failed: ${(err as Error).message}`, kind: 'err' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel">
      <h2>Combine into one PDF</h2>
      <p className="sub">
        Add any mix of PDFs and images. Drag order with the arrows, then merge everything into a
        single PDF in the order shown.
      </p>

      <FileDrop
        accept="application/pdf,image/*"
        title="Drop PDFs and images here or click to browse"
        hint="PDFs are appended page-by-page; each image becomes one page"
        icon="🧩"
        onFiles={addFiles}
      />

      {items.length > 0 && (
        <ul className="filelist">
          {items.map((it, i) => (
            <li className="fileitem" key={it.id}>
              <span className="order">{i + 1}</span>
              {it.kind === 'image' ? (
                <img className="thumb" src={it.url} alt="" />
              ) : (
                <span className="thumb">📕</span>
              )}
              <div className="meta">
                <div className="name">{it.file.name}</div>
                <div className="size">
                  {it.kind === 'pdf' ? 'PDF' : 'Image'} · {formatSize(it.file.size)}
                </div>
              </div>
              <button
                className="iconbtn"
                title="Move up"
                onClick={() => move(i, -1)}
                disabled={i === 0}
              >
                ↑
              </button>
              <button
                className="iconbtn"
                title="Move down"
                onClick={() => move(i, 1)}
                disabled={i === items.length - 1}
              >
                ↓
              </button>
              <button className="iconbtn" title="Remove" onClick={() => remove(it.id)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="toolbar row">
        <span className="label">Image pages</span>
        <div className="seg" role="group" aria-label="Image page size">
          <button className={mode === 'a4' ? 'on' : ''} onClick={() => setMode('a4')}>
            Fit to A4
          </button>
          <button className={mode === 'match' ? 'on' : ''} onClick={() => setMode('match')}>
            Match image
          </button>
        </div>
        <div className="spacer" />
        {status && <span className={`status ${status.kind ?? ''}`}>{status.text}</span>}
        <button className="btn" onClick={clearAll} disabled={busy || !items.length}>
          Clear
        </button>
        <button className="btn primary" onClick={combine} disabled={busy || items.length < 1}>
          {busy ? 'Working…' : `Combine ${items.length || ''} → PDF`}
        </button>
      </div>
    </section>
  )
}
