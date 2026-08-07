# Stackable — PDF Tools

A client-side PDF SaaS. Everything runs in the browser — files never leave the device, so there are no server or storage costs.

## 💾 Download (no admin needed)

Grab the latest release from [Releases](../../releases/latest). Two options, both install with a **regular Windows account — no admin rights, no IT approval**:

- **`Stackable PDF Tools Setup <version>.exe`** (recommended) — installs to your own user profile (`perMachine: false`, no UAC prompt) and **updates itself automatically**: it checks GitHub Releases on launch, downloads new versions in the background, and offers to restart into them. No admin approval needed for updates either — it's writing to the same per-user folder it installed into.
- **`Stackable-PDF-Tools-Windows.zip`** — for environments that won't let you run *any* installer. Unzip anywhere and double-click `Stackable PDF Tools.exe` inside; nothing writes outside that folder. Trade-off: no auto-update — the in-app banner still tells you when a new version is out, but you redownload the zip yourself.

> First launch, Windows SmartScreen may say "Windows protected your PC" (because the app isn't code-signed by a paid certificate). Click **More info → Run anyway**. This is normal for apps shared outside the Microsoft Store.

### Building it yourself

```bash
npm install
npm run app:build   # → release/Stackable PDF Tools Setup <version>.exe (+ latest.yml for auto-update)
npm run app:pack    # → release/Stackable-PDF-Tools-Windows.zip (portable, no auto-update)
```

Both work on a normal Windows account — **no admin rights or Developer Mode needed.** `app:build` also needs `scripts/prepare-wincodesign.mjs` to run first (handled automatically by the script) to work around a Windows symlink-privilege quirk in electron-builder's code-signing toolkit download.

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
