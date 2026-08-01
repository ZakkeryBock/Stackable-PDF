import { uid } from './util'

type LibraryBase = { id: string; name: string; createdAt: number }

export type LibraryItem = LibraryBase &
  (
    | { kind: 'text'; text: string; size: number; color: string }
    | { kind: 'date'; text: string; value: string; size: number; color: string }
    | { kind: 'sig'; dataUrl: string; natW: number; natH: number }
  )

type DistributiveOmit<T, K extends keyof any> = T extends unknown ? Omit<T, K> : never

const KEY = 'pdf-suite-library'

export function loadLibrary(): LibraryItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveLibraryItem(item: DistributiveOmit<LibraryItem, 'id' | 'createdAt'>): void {
  const items = loadLibrary()
  items.push({ ...item, id: uid('lib'), createdAt: Date.now() } as LibraryItem)
  localStorage.setItem(KEY, JSON.stringify(items))
}

export function removeLibraryItem(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(loadLibrary().filter((i) => i.id !== id)))
}
