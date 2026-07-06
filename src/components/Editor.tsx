import { useCallback, useEffect, useRef, useState } from 'react'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { FileDrop } from './FileDrop'
import { SignaturePad, type SignatureResult } from './SignaturePad'
import { loadPdf, renderPage, type LoadedPdf } from '../lib/render'
import { downloadBytes } from '../lib/pdf'
import { uid } from '../lib/util'

type TextAnno = {
  id: string
  type: 'text'
  page: number
  x: number
  y: number
  text: string
  size: number // css px
  color: string // #rrggbb
}
type SigAnno = {
  id: string
  type: 'sig'
  page: number
  x: number
  y: number
  w: number
  h: number
  dataUrl: string
  natW: number
  natH: number
}
type Anno = TextAnno | SigAnno

export function Editor() {
  const [bytes, setBytes] = useState<ArrayBuffer | null>(null)
  const [fileName, setFileName] = useState('document.pdf')
  const [pdf, setPdf] = useState<LoadedPdf | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [page, setPage] = useState(1)
  const [scale, setScale] = useState(1)
  const [pageSize, setPageSize] = useState({ w: 0, h: 0 })
  const [annos, setAnnos] = useState<Anno[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [showSig, setShowSig] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  async function onFile(files: File[]) {
    const file = files[0]
    if (!file) return
    const buf = await file.arrayBuffer()
    setBytes(buf)
    setFileName(file.name)
    setAnnos([])
    setSelected(null)
    setPage(1)
    const doc = await loadPdf(buf)
    setPdf(doc)
    setNumPages(doc.numPages)
    // Choose a scale that fits the first page into the viewer width.
    const first = await doc.getPage(1)
    const unit = first.getViewport({ scale: 1 })
    const avail = (containerRef.current?.clientWidth ?? 820) - 32
    setScale(Math.min(Math.max(avail / unit.width, 0.4), 2))
  }

  // Render the current page whenever page/scale/pdf changes.
  useEffect(() => {
    let cancelled = false
    if (!pdf || !canvasRef.current) return
    ;(async () => {
      const rendered = await renderPage(pdf, page, scale)
      if (cancelled || !canvasRef.current) return
      const dest = canvasRef.current
      dest.width = rendered.canvas.width
      dest.height = rendered.canvas.height
      dest.getContext('2d')!.drawImage(rendered.canvas, 0, 0)
      setPageSize({ w: rendered.width, h: rendered.height })
    })()
    return () => {
      cancelled = true
    }
  }, [pdf, page, scale])

  const update = useCallback((id: string, patch: Partial<Anno>) => {
    setAnnos((prev) => prev.map((a) => (a.id === id ? ({ ...a, ...patch } as Anno) : a)))
  }, [])

  function addText() {
    if (!pdf) return
    const size = Math.max(16, pageSize.h * 0.028)
    const a: TextAnno = {
      id: uid('t'),
      type: 'text',
      page,
      x: pageSize.w * 0.5 - 60,
      y: pageSize.h * 0.5,
      text: 'Text',
      size,
      color: '#111827',
    }
    setAnnos((prev) => [...prev, a])
    setSelected(a.id)
  }

  function addSignature(r: SignatureResult) {
    setShowSig(false)
    if (!pdf) return
    const w = Math.min(pageSize.w * 0.35, r.natW)
    const h = w * (r.natH / r.natW)
    const a: SigAnno = {
      id: uid('s'),
      type: 'sig',
      page,
      x: pageSize.w * 0.5 - w / 2,
      y: pageSize.h * 0.5 - h / 2,
      w,
      h,
      dataUrl: r.dataUrl,
      natW: r.natW,
      natH: r.natH,
    }
    setAnnos((prev) => [...prev, a])
    setSelected(a.id)
  }

  function removeAnno(id: string) {
    setAnnos((prev) => prev.filter((a) => a.id !== id))
    if (selected === id) setSelected(null)
  }

  // --- Drag & resize on the overlay ---
  function startDrag(e: React.PointerEvent, a: Anno, kind: 'move' | 'resize') {
    e.stopPropagation()
    setSelected(a.id)
    const startX = e.clientX
    const startY = e.clientY
    const orig = { x: a.x, y: a.y, w: (a as SigAnno).w, h: (a as SigAnno).h, size: (a as TextAnno).size }
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)

    function move(ev: PointerEvent) {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      if (kind === 'move') {
        update(a.id, {
          x: clamp(orig.x + dx, 0, pageSize.w - 4),
          y: clamp(orig.y + dy, 0, pageSize.h - 4),
        } as Partial<Anno>)
      } else if (a.type === 'sig') {
        const ratio = orig.h / orig.w
        const w = clamp(orig.w + dx, 20, pageSize.w)
        update(a.id, { w, h: w * ratio } as Partial<Anno>)
      } else {
        update(a.id, { size: clamp(orig.size + dy * 0.5, 6, 400) } as Partial<Anno>)
      }
    }
    function up() {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  async function exportPdf() {
    if (!bytes) return
    setBusy(true)
    setStatus('Rendering…')
    try {
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
      const font = await doc.embedFont(StandardFonts.Helvetica)
      const pages = doc.getPages()
      // Embed each unique signature image once.
      const imgCache = new Map<string, Awaited<ReturnType<typeof doc.embedPng>>>()
      for (const a of annos) {
        if (a.type !== 'sig') continue
        if (!imgCache.has(a.dataUrl)) {
          imgCache.set(a.dataUrl, await doc.embedPng(a.dataUrl))
        }
      }

      for (const a of annos) {
        const p = pages[a.page - 1]
        if (!p) continue
        const ph = p.getHeight()
        if (a.type === 'text') {
          const sizePt = a.size / scale
          const xPt = a.x / scale
          const c = hexToRgb(a.color)
          // CSS box top → PDF baseline of the first line (approx ascent 0.8em).
          const baselineFromTop = a.y / scale + sizePt * 0.8
          p.drawText(a.text, {
            x: xPt,
            y: ph - baselineFromTop,
            size: sizePt,
            font,
            color: rgb(c.r, c.g, c.b),
            lineHeight: sizePt,
          })
        } else {
          const img = imgCache.get(a.dataUrl)!
          const wPt = a.w / scale
          const hPt = a.h / scale
          const xPt = a.x / scale
          const yPt = ph - (a.y + a.h) / scale
          p.drawImage(img, { x: xPt, y: yPt, width: wPt, height: hPt })
        }
      }

      const out = await doc.save()
      downloadBytes(out, fileName.replace(/\.pdf$/i, '') + '-edited.pdf')
      setStatus('Saved ✓')
    } catch (err) {
      console.error(err)
      setStatus(`Export failed: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const sel = annos.find((a) => a.id === selected) ?? null
  const pageAnnos = annos.filter((a) => a.page === page)

  if (!pdf) {
    return (
      <section className="panel">
        <h2>Edit a PDF</h2>
        <p className="sub">
          Open a PDF, then drop on text or a signature anywhere on the page and drag it into place.
        </p>
        <FileDrop
          accept="application/pdf"
          multiple={false}
          title="Drop a PDF here or click to browse"
          hint="Add text and signatures, then download the edited file"
          icon="✍️"
          onFiles={onFile}
        />
      </section>
    )
  }

  return (
    <section className="panel">
      <div className="row">
        <h2 style={{ margin: 0 }}>Edit · {fileName}</h2>
        <div className="spacer" />
        <button className="btn" onClick={() => { setPdf(null); setBytes(null) }}>
          Open another
        </button>
      </div>

      <div className="editor-stage">
        <div className="pageview" ref={containerRef}>
          <div
            className="page-wrap"
            style={{ width: pageSize.w, height: pageSize.h }}
          >
            <canvas ref={canvasRef} />
            <div className="overlay" onPointerDown={() => setSelected(null)}>
              {pageAnnos.map((a) =>
                a.type === 'text' ? (
                  <div
                    key={a.id}
                    className={`anno ${selected === a.id ? 'selected' : ''}`}
                    style={{
                      left: a.x,
                      top: a.y,
                      fontSize: a.size,
                      color: a.color,
                      fontFamily: 'Helvetica, Arial, sans-serif',
                    }}
                    onPointerDown={(e) => startDrag(e, a, 'move')}
                  >
                    {a.text || ' '}
                    <span
                      className="handle"
                      onPointerDown={(e) => startDrag(e, a, 'resize')}
                    />
                    <span className="del" onPointerDown={(e) => { e.stopPropagation(); removeAnno(a.id) }}>
                      ✕
                    </span>
                  </div>
                ) : (
                  <div
                    key={a.id}
                    className={`anno ${selected === a.id ? 'selected' : ''}`}
                    style={{ left: a.x, top: a.y, width: a.w, height: a.h }}
                    onPointerDown={(e) => startDrag(e, a, 'move')}
                  >
                    <img src={a.dataUrl} alt="signature" />
                    <span
                      className="handle"
                      onPointerDown={(e) => startDrag(e, a, 'resize')}
                    />
                    <span className="del" onPointerDown={(e) => { e.stopPropagation(); removeAnno(a.id) }}>
                      ✕
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>

        <aside className="sidebar">
          <h3>Add</h3>
          <div className="row" style={{ marginBottom: 16 }}>
            <button className="btn" onClick={addText}>＋ Text</button>
            <button className="btn" onClick={() => setShowSig(true)}>✍️ Signature</button>
          </div>

          {sel?.type === 'text' && (
            <>
              <h3>Text</h3>
              <div className="field">
                <label>Content</label>
                <textarea
                  rows={3}
                  value={sel.text}
                  onChange={(e) => update(sel.id, { text: e.target.value } as Partial<Anno>)}
                />
              </div>
              <div className="row">
                <div className="field" style={{ flex: 1 }}>
                  <label>Size</label>
                  <input
                    type="number"
                    min={6}
                    max={400}
                    value={Math.round(sel.size)}
                    onChange={(e) => update(sel.id, { size: Number(e.target.value) } as Partial<Anno>)}
                  />
                </div>
                <div className="field">
                  <label>Color</label>
                  <input
                    type="color"
                    value={sel.color}
                    onChange={(e) => update(sel.id, { color: e.target.value } as Partial<Anno>)}
                  />
                </div>
              </div>
            </>
          )}

          {sel?.type === 'sig' && (
            <>
              <h3>Signature</h3>
              <p className="status">Drag to move, or use the corner handle to resize.</p>
            </>
          )}

          {!sel && <p className="status">Add text or a signature, then drag it onto the page.</p>}
        </aside>
      </div>

      {numPages > 1 && (
        <div className="pager">
          <button className="iconbtn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            ‹
          </button>
          Page {page} / {numPages}
          <button
            className="iconbtn"
            onClick={() => setPage((p) => Math.min(numPages, p + 1))}
            disabled={page === numPages}
          >
            ›
          </button>
        </div>
      )}

      <div className="toolbar row">
        <span className="status">
          {annos.length} annotation{annos.length === 1 ? '' : 's'} across the document
        </span>
        <div className="spacer" />
        {status && <span className="status ok">{status}</span>}
        <button className="btn primary" onClick={exportPdf} disabled={busy}>
          {busy ? 'Saving…' : '⬇ Download edited PDF'}
        </button>
      </div>

      {showSig && <SignaturePad onCancel={() => setShowSig(false)} onConfirm={addSignature} />}
    </section>
  )
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return { r: 0, g: 0, b: 0 }
  const n = parseInt(m[1], 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}
