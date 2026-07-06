// Works around electron-builder's "Cannot create symbolic link : A required
// privilege is not held by the client" failure on Windows.
//
// electron-builder downloads a code-signing toolkit (winCodeSign) and extracts
// it with 7-Zip. That archive contains two macOS symlinks (libcrypto/libssl
// .dylib) which Windows refuses to create unless you have Developer Mode or run
// as Administrator — and that one failure aborts the whole build, even though
// those macOS files are never used on Windows.
//
// This script pre-extracts the toolkit into electron-builder's cache, tolerating
// those two symlink entries (7-Zip leaves them as empty placeholders). Once the
// cache folder exists, electron-builder uses it as-is and never runs the
// extraction that would fail. No admin rights or Developer Mode required.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import process from 'node:process'

if (process.platform !== 'win32') {
  process.exit(0) // the symlink issue is Windows-only
}

const VERSION = 'winCodeSign-2.6.0'
const cacheRoot = path.join(
  process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'),
  'electron-builder',
  'Cache',
  'winCodeSign',
)
const targetDir = path.join(cacheRoot, VERSION)
const signtool = path.join(targetDir, 'windows-10', 'x64', 'signtool.exe')
const sevenZa = path.resolve('node_modules', '7zip-bin', 'win', 'x64', '7za.exe')

if (existsSync(signtool)) {
  console.log('✓ winCodeSign toolkit already prepared — nothing to do.')
  process.exit(0)
}

mkdirSync(cacheRoot, { recursive: true })

// Reuse a previously downloaded archive if electron-builder left one; else fetch.
let archive = null
for (const f of existsSync(cacheRoot) ? readdirSync(cacheRoot) : []) {
  if (f.endsWith('.7z')) {
    archive = path.join(cacheRoot, f)
    break
  }
}
if (!archive) {
  archive = path.join(cacheRoot, `${VERSION}.7z`)
  const url = `https://github.com/electron-userland/electron-builder-binaries/releases/download/${VERSION}/${VERSION}.7z`
  console.log('› Downloading winCodeSign toolkit…')
  const dl = spawnSync('curl', ['-L', '--fail', '-o', archive, url], { stdio: 'inherit' })
  if (dl.status !== 0 || !existsSync(archive)) {
    console.error('✗ Could not download winCodeSign. Check your internet connection.')
    process.exit(1)
  }
}

if (!existsSync(sevenZa)) {
  console.error('✗ Bundled 7za.exe not found — run `npm install` first.')
  process.exit(1)
}

console.log('› Extracting winCodeSign into the electron-builder cache…')
// Exit code 2 is expected: 7-Zip reports the two macOS symlinks it couldn't
// create, but extracts everything else (and leaves empty placeholders). That's
// fine — Windows never uses those files.
spawnSync(sevenZa, ['x', archive, `-o${targetDir}`, '-y'], { stdio: 'ignore' })

if (!existsSync(signtool)) {
  console.error('✗ Extraction incomplete — signtool.exe is missing.')
  process.exit(1)
}
console.log('✓ winCodeSign toolkit ready. The installer build can now run.')
