import { PDFDocument, type PDFImage } from 'pdf-lib'
import { isPdfFile, toEmbeddableImage } from './images'

// A4 in PostScript points (72 dpi). Used as the target for "fit to page" mode.
const A4 = { width: 595.28, height: 841.89 }
const PAGE_MARGIN = 24

async function embedImage(doc: PDFDocument, file: File): Promise<PDFImage> {
  const { bytes, kind } = await toEmbeddableImage(file)
  return kind === 'jpg' ? doc.embedJpg(bytes) : doc.embedPng(bytes)
}

export type PageMode = 'match' | 'a4'

/** Add one image as a single page to an existing document. */
async function addImagePage(
  doc: PDFDocument,
  file: File,
  mode: PageMode,
): Promise<void> {
  const image = await embedImage(doc, file)
  if (mode === 'match') {
    // Page is exactly the image size — a faithful 1:1 photo → PDF.
    const page = doc.addPage([image.width, image.height])
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
    return
  }
  // Fit the image onto an A4 page, centered, preserving aspect ratio.
  const page = doc.addPage([A4.width, A4.height])
  const maxW = A4.width - PAGE_MARGIN * 2
  const maxH = A4.height - PAGE_MARGIN * 2
  const scale = Math.min(maxW / image.width, maxH / image.height, 1)
  const w = image.width * scale
  const h = image.height * scale
  page.drawImage(image, {
    x: (A4.width - w) / 2,
    y: (A4.height - h) / 2,
    width: w,
    height: h,
  })
}

/** Convert a single image file into its own PDF (one page). */
export async function imageToPdf(file: File, mode: PageMode = 'match'): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  await addImagePage(doc, file, mode)
  return doc.save()
}

/**
 * Combine any mix of PDFs and images into a single PDF, in the given order.
 * PDF pages are copied through; images each become one page.
 */
export async function combineToPdf(
  files: File[],
  mode: PageMode = 'match',
  onProgress?: (done: number, total: number) => void,
): Promise<Uint8Array> {
  const out = await PDFDocument.create()
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (isPdfFile(file)) {
      const src = await PDFDocument.load(await file.arrayBuffer(), {
        ignoreEncryption: true,
      })
      const pages = await out.copyPages(src, src.getPageIndices())
      pages.forEach((p) => out.addPage(p))
    } else {
      await addImagePage(out, file, mode)
    }
    onProgress?.(i + 1, files.length)
  }
  return out.save()
}

export function downloadBytes(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
  triggerDownload(blob, filename)
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Swap a file's extension for `.pdf`. */
export function toPdfName(name: string): string {
  return name.replace(/\.[^./\\]+$/, '') + '.pdf'
}
