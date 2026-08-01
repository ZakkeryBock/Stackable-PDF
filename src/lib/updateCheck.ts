export type UpdateInfo = { version: string; url: string }

const REPO = 'ZakkeryBock/Stackable-PDF'

export async function checkForUpdate(currentVersion: string): Promise<UpdateInfo | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
    if (!res.ok) return null
    const data = await res.json()
    const latest = String(data.tag_name ?? '').replace(/^v/, '')
    if (!latest || !isNewer(latest, currentVersion)) return null
    return { version: latest, url: String(data.html_url ?? `https://github.com/${REPO}/releases/latest`) }
  } catch {
    return null
  }
}

function isNewer(a: string, b: string): boolean {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0
    const y = pb[i] ?? 0
    if (x !== y) return x > y
  }
  return false
}
