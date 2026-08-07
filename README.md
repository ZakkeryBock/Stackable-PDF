# Stackable — PDF Tools

A client-side PDF SaaS. Everything runs in the browser — files never leave the device, so there are no server or storage costs.

## 💾 Download (no install, no admin needed)

Grab the latest zip from [Releases](../../releases/latest): `Stackable-PDF-Tools-Windows.zip`.

Unzip it anywhere and double-click **`Stackable PDF Tools.exe`** inside. That's it — no installer runs, nothing writes outside that folder, so it works on locked-down/admin-restricted Windows accounts.

> First launch, Windows SmartScreen may say "Windows protected your PC" (because the app isn't code-signed by a paid certificate). Click **More info → Run anyway**. This is normal for apps shared outside the Microsoft Store.

### Building the zip yourself

```bash
npm install
npm run app:pack   # → release/Stackable-PDF-Tools-Windows.zip
```

This works on a normal Windows account — **no admin rights or Developer Mode needed.** (`app:pack` builds the unpacked app with `electron-builder --dir` and zips it; see [`scripts/pack-win.mjs`](scripts/pack-win.mjs).)

Want a traditional installer instead (adds Start Menu/desktop shortcuts)? `npm run app:build` produces `release/Stackable PDF Tools Setup 0.1.0.exe`. It's also non-admin (`perMachine: false`), but it does require running an install step, which the zip avoids.

To try the app instantly without packaging anything: `npm run app:preview` opens it in its own desktop window.

For **Mac** (`.dmg`) or **Linux** (`.AppImage`), run `npm run app:build` on that platform.

## Tools

- **Convert** — turn photos (JPG, PNG, WebP, GIF, BMP, AVIF, HEIC) into PDFs. Upload as many as you like; each becomes its own PDF and they download together as a ZIP. Choose "Match image" (1:1) or "Fit to A4".
- **Combine** — merge any mix of PDFs and images into a single PDF. Reorder with the arrows; PDFs are appended page-by-page and each image becomes one page.
- **Edit** — open a PDF, drop on **text** or a **signature** (draw it or type it), drag to position and resize, then download the edited PDF.

## Development

```bash
npm install
npm run dev      # http://localhost:5173, hot reload
npm run build    # type-checks and outputs static files to dist/
```

The desktop app (`app:preview`, `app:pack`, `app:build`) is the supported distribution path — see [Download](#-download-no-install-no-admin-needed) above. `dist/` is also plain static output if you ever need a browser-hosted build, but that path isn't packaged or shipped by this repo.

## Stack

- **React + TypeScript + Vite**
- **pdf-lib** — create / merge PDFs, embed images, draw text & signatures
- **pdfjs-dist** — render PDF pages to canvas in the editor
- **jszip** — bundle multiple converted PDFs into one download
