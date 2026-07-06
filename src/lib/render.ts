import * as pdfjs from 'pdfjs-dist'
// Vite resolves this to a hashed URL for the worker module.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export type LoadedPdf = pdfjs.PDFDocumentProxy

export async function loadPdf(data: ArrayBuffer): Promise<LoadedPdf> {
  // pdfjs transfers/detaches the buffer, so hand it a copy.
  return pdfjs.getDocument({ data: data.slice(0) }).promise
}

export type RenderedPage = {
  canvas: HTMLCanvasElement
  width: number // CSS pixels at the given scale
  height: number
}

/** Render a single page (1-indexed) to an offscreen canvas at `scale`. */
export async function renderPage(
  pdf: LoadedPdf,
  pageNumber: number,
  scale: number,
): Promise<RenderedPage> {
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  await page.render({ canvasContext: ctx, viewport }).promise
  return { canvas, width: viewport.width, height: viewport.height }
}
