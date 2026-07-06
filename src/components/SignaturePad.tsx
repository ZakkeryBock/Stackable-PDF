import { useEffect, useRef, useState } from 'react'

export type SignatureResult = { dataUrl: string; natW: number; natH: number }

type Props = {
  onCancel: () => void
  onConfirm: (r: SignatureResult) => void
}

const SCRIPT_FONTS = [
  { label: 'Signature', css: "'Segoe Script', 'Brush Script MT', cursive" },
  { label: 'Formal', css: "Georgia, 'Times New Roman', serif" },
  { label: 'Print', css: "'Segoe UI', Helvetica, Arial, sans-serif" },
]

export function SignaturePad({ onCancel, onConfirm }: Props) {
  const [mode, setMode] = useState<'draw' | 'type'>('draw')
  const [typed, setTyped] = useState('')
  const [font, setFont] = useState(SCRIPT_FONTS[0].css)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const dirty = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)

  // Size the drawing canvas to its rendered box once mounted.
  useEffect(() => {
    if (mode !== 'draw') return
    const c = canvasRef.current
    if (!c) return
    c.width = c.clientWidth
    c.height = c.clientHeight
    const ctx = c.getContext('2d')!
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [mode])

  function pos(e: React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function start(e: React.PointerEvent) {
    drawing.current = true
    last.current = pos(e)
    canvasRef.current!.setPointerCapture(e.pointerId)
  }

  function draw(e: React.PointerEvent) {
    if (!drawing.current) return
    const ctx = canvasRef.current!.getContext('2d')!
    const p = pos(e)
    ctx.beginPath()
    ctx.moveTo(last.current!.x, last.current!.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = p
    dirty.current = true
  }

  function end() {
    drawing.current = false
    last.current = null
  }

  function clearCanvas() {
    const c = canvasRef.current
    if (!c) return
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
    dirty.current = false
  }

  function confirm() {
    if (mode === 'draw') {
      if (!dirty.current) return
      const c = canvasRef.current!
      onConfirm({ dataUrl: c.toDataURL('image/png'), natW: c.width, natH: c.height })
      return
    }
    // Typed signature → render to a transparent canvas.
    const text = typed.trim()
    if (!text) return
    const fontSize = 64
    const measure = document.createElement('canvas').getContext('2d')!
    measure.font = `${fontSize}px ${font}`
    const w = Math.ceil(measure.measureText(text).width) + 40
    const h = Math.ceil(fontSize * 1.6)
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')!
    ctx.font = `${fontSize}px ${font}`
    ctx.fillStyle = '#111827'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 20, h / 2)
    onConfirm({ dataUrl: c.toDataURL('image/png'), natW: w, natH: h })
  }

  return (
    <div className="modal-back" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Add a signature</h3>
        <div className="tabline">
          <button className={mode === 'draw' ? 'on' : ''} onClick={() => setMode('draw')}>
            ✍️ Draw
          </button>
          <button className={mode === 'type' ? 'on' : ''} onClick={() => setMode('type')}>
            ⌨️ Type
          </button>
        </div>

        {mode === 'draw' ? (
          <canvas
            ref={canvasRef}
            className="sig-canvas"
            onPointerDown={start}
            onPointerMove={draw}
            onPointerUp={end}
            onPointerLeave={end}
          />
        ) : (
          <>
            <div className="field">
              <label>Your name</label>
              <input
                type="text"
                autoFocus
                value={typed}
                placeholder="Jane Doe"
                onChange={(e) => setTyped(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Style</label>
              <select value={font} onChange={(e) => setFont(e.target.value)}>
                {SCRIPT_FONTS.map((f) => (
                  <option key={f.label} value={f.css}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div
              style={{
                background: 'white',
                borderRadius: 8,
                padding: '14px 16px',
                minHeight: 60,
                color: '#111827',
                fontSize: 40,
                fontFamily: font,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              {typed || <span style={{ color: '#9ca3af' }}>Preview</span>}
            </div>
          </>
        )}

        <div className="row" style={{ marginTop: 18 }}>
          {mode === 'draw' && (
            <button className="btn" onClick={clearCanvas}>
              Clear
            </button>
          )}
          <div className="spacer" />
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn primary" onClick={confirm}>
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
