// Builds a shareable Windows app WITHOUT needing admin rights or Developer Mode.
//
// electron-builder's `nsis`/`zip`/`portable` targets extract a code-signing
// toolkit that contains symlinks; creating those symlinks on Windows requires a
// privilege most machines don't grant, which aborts the build. The `--dir`
// target skips that step and produces a fully working unpacked app, so we build
// with `--dir` and then zip the result ourselves.
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const unpacked = path.join(root, 'release', 'win-unpacked')
const exe = path.join(unpacked, 'Stackable PDF Tools.exe')
const zip = path.join(root, 'release', 'Stackable-PDF-Tools-Windows.zip')

console.log('› Packaging unpacked app (electron-builder --dir)…')
// This may exit non-zero because of the signing-toolkit symlink issue above;
// that's expected and harmless — the unpacked app is produced regardless.
spawnSync('npx', ['electron-builder', '--dir'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
})

if (!existsSync(exe)) {
  console.error('✗ Build did not produce the app executable. See the log above.')
  process.exit(1)
}

console.log('› Zipping into a shareable archive…')
// Use .NET compression via PowerShell so the archive has a friendly root folder
// ("Stackable PDF Tools/…") no matter what the build folder is called.
const ps = `
$ErrorActionPreference = 'Stop'
$src = '${unpacked.replace(/'/g, "''")}'
$zip = '${zip.replace(/'/g, "''")}'
$root = 'Stackable PDF Tools'
if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$fs = [System.IO.File]::Open($zip, [System.IO.FileMode]::Create)
$archive = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create)
foreach ($f in Get-ChildItem -LiteralPath $src -Recurse -File) {
  $rel = $f.FullName.Substring($src.Length + 1).Replace([char]92, [char]47)
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $f.FullName, ($root + '/' + $rel), [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
}
$archive.Dispose(); $fs.Dispose()
$mb = [math]::Round((Get-Item -LiteralPath $zip).Length / 1MB, 1)
Write-Output ("done: " + $zip + " (" + $mb + " MB)")
`

const res = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], {
  stdio: 'inherit',
})
if (res.status !== 0) {
  console.error('✗ Zipping failed.')
  process.exit(1)
}
console.log('\n✓ Share this file with anyone:')
console.log('   ' + zip)
console.log('   They unzip it, open the folder, and double-click "Stackable PDF Tools.exe".')
