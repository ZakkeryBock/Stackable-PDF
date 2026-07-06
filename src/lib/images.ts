// Helpers for turning arbitrary image files into bytes that pdf-lib can embed.
// pdf-lib can only embed JPG and PNG, so anything else is rasterized via canvas.

export type EmbeddableImage = { bytes: Uint8Array; kind: 'jpg' | 'png' }

export const IMAGE_MIME_PREFIX = 'image/'

export function isImageFile(file: File): boolean {
  if (file.type.startsWith(IMAGE_MIME_PREFIX)) return true
  return /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif|tiff?)$/i.test(file.name)
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
}

async function rasterizeToPng(file: File): Promise<Uint8Array> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadHtmlImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || img.width
    canvas.height = img.naturalHeight || img.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get a 2D canvas context')
    ctx.drawImage(img, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png'),
    )
    if (!blob) throw new Error('Failed to rasterize image')
    return new Uint8Array(await blob.arrayBuffer())
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not decode image'))
    img.src = src
  })
}

export async function toEmbeddableImage(file: File): Promise<EmbeddableImage> {
  const type = file.type.toLowerCase()
  if (type === 'image/jpeg' || type === 'image/jpg') {
    return { bytes: new Uint8Array(await file.arrayBuffer()), kind: 'jpg' }
  }
  if (type === 'image/png') {
    return { bytes: new Uint8Array(await file.arrayBuffer()), kind: 'png' }
  }
  // webp / gif / bmp / avif / heic / tiff, or unknown — go through canvas.
  return { bytes: await rasterizeToPng(file), kind: 'png' }
}
