import { useEffect, useState } from 'react'
import JSZip from 'jszip'
import { FileDrop } from './FileDrop'
import { imageToPdf, toPdfName, downloadBytes, triggerDownload, type PageMode } from '../lib/pdf'
import { isImageFile } from '../lib/images'
import { formatSize, uid } from '../lib/util'

type Item = { id: string; file: File; url: string }

export function Converter() {
  const [items, setItems] = useState<Item[]>([])
  const [mode, setMode] = useState<PageMode>('match')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ text: string; kind?: 'ok' | 'err' } | null>(null)

  // Clean up object URLs when items are removed / on unmount.
  useEffect(() => {
    return () => items.forEach((it) => URL.revokeObjectURL(it.url))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function addFiles(files: File[]) {
    const images = files.filter(isImageFile)
    const rejected = files.length - images.length
    const next = images.map((file) => ({ id: uid('img'), file, url: URL.createObjectURL(file) }))
    setItems((prev) => [...prev, ...next])
    setStatus(
      rejected > 0
        ? { text: `Skipped ${rejected} non-image file${rejected > 1 ? 's' : ''}.`, kind: 'err' }
        : null,
    )
  }

  function remove(id: string) {
    setItems((prev) => {
      const it = prev.find((p) => p.id === id)
      if (it) URL.revokeObjectURL(it.url)
      return prev.filter((p) => p.id !== id)
    })
  }

  function clearAll() {
    items.forEach((it) => URL.revokeObjectURL(it.url))
    setItems([])
    setStatus(null)
  }

  async function convertAll() {
    if (!items.length) return
    setBusy(true)
    setStatus({ text: 'Converting…' })
    try {
      if (items.length === 1) {
        const bytes = await imageToPdf(items[0].file, mode)
        downloadBytes(bytes, toPdfName(items[0].file.name))
      } else {
        // Bundle every converted PDF into a single zip download.
        const zip = new JSZip()
        const used = new Set<string>()
        for (const it of items) {
          const bytes = await imageToPdf(it.file, mode)
          let name = toPdfName(it.file.name)
          let n = 2
          while (used.has(name.toLowerCase())) {
            name = toPdfName(it.file.name).replace(/\.pdf$/i, `-${n++}.pdf`)
          }
          used.add(name.toLowerCase())
          zip.file(name, bytes)
        }
        const blob = await zip.generateAsync({ type: 'blob' })
        triggerDownload(blob, 'converted-pdfs.zip')
      }
      setStatus({ text: `Converted ${items.length} image${items.length > 1 ? 's' : ''}.`, kind: 'ok' })
    } catch (err) {
      console.error(err)
      setStatus({ text: `Conversion failed: ${(err as Error).message}`, kind: 'err' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel">
      <h2>Images → PDF</h2>
      <p className="sub">
        Drop in JPG, PNG, WebP, GIF, BMP, AVIF or HEIC files. Each image becomes its own PDF —
        upload as many as you like and download them all at once.
      </p>

      <FileDrop
        accept="image/*"
        title="Drop images here or click to browse"
        hint="JPG · PNG · WebP · GIF · BMP · AVIF · HEIC — multiple at once"
        icon="🖼️"
        onFiles={addFiles}
      />

      {items.length > 0 && (
        <ul className="filelist">
          {items.map((it) => (
            <li className="fileitem" key={it.id}>
              <img className="thumb" src={it.url} alt="" />
              <div className="meta">
                <div className="name">{it.file.name}</div>
                <div className="size">{formatSize(it.file.size)}</div>
              </div>
              <button className="iconbtn" title="Remove" onClick={() => remove(it.id)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="toolbar row">
        <span className="label">Page size</span>
        <div className="seg" role="group" aria-label="Page size">
          <button className={mode === 'match' ? 'on' : ''} onClick={() => setMode('match')}>
            Match image
          </button>
          <button className={mode === 'a4' ? 'on' : ''} onClick={() => setMode('a4')}>
            Fit to A4
          </button>
        </div>
        <div className="spacer" />
        {status && <span className={`status ${status.kind ?? ''}`}>{status.text}</span>}
        <button className="btn" onClick={clearAll} disabled={busy || !items.length}>
          Clear
        </button>
        <button className="btn primary" onClick={convertAll} disabled={busy || !items.length}>
          {busy
            ? 'Working…'
            : items.length > 1
              ? `Convert ${items.length} → ZIP`
              : 'Convert to PDF'}
        </button>
      </div>
    </section>
  )
}
