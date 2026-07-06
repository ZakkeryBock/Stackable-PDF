# Stackable — PDF Tools

A client-side PDF SaaS. Everything runs in the browser — files never leave the device, so there are no server or storage costs.

## 💾 Download the app (easiest — nothing to install)

There's a real desktop program. Your friend **doesn't need Node.js, a browser, or anything else**.

**Send them the installer:** `release/Stackable PDF Tools Setup 0.1.0.exe`

They double-click it → it installs (they can pick the folder) and adds a **Start Menu + desktop shortcut**. Done.

> First launch, Windows SmartScreen may say "Windows protected your PC" (because the app isn't code-signed by a paid certificate). Click **More info → Run anyway**. This is normal for apps shared outside the Microsoft Store.

Prefer no installer? `npm run app:pack` builds a **portable** `release/Stackable-PDF-Tools-Windows.zip` instead — they just unzip and run `Stackable PDF Tools.exe`.

### Rebuild the installer yourself

```bash
npm install
npm run app:build      # → release/Stackable PDF Tools Setup 0.1.0.exe
```

This works on a normal Windows account — **no admin rights or Developer Mode needed.**

> **Why the extra step exists:** electron-builder downloads a code-signing toolkit whose archive contains two macOS symlinks that Windows refuses to create without special privileges — and that one failure normally aborts the whole build (`Cannot create symbolic link : A required privilege is not held by the client`). `app:build` runs [`scripts/prepare-wincodesign.mjs`](scripts/prepare-wincodesign.mjs) first, which pre-extracts that toolkit into electron-builder's cache while tolerating those two irrelevant files. After that the build just works.

To try the app instantly without building an installer: `npm run app:preview` opens it in its own desktop window.

For **Mac** (`.dmg`) or **Linux** (`.AppImage`), run `npm run app:build` on that platform.

## 🚀 Or run the web version

1. Make sure **Node.js** is installed (free, one-time): https://nodejs.org — download the **LTS** version and install it.
2. **Double-click the launcher:**
   - **Windows:** `start.bat`
   - **Mac / Linux:** `start.command`

That's it. The first run installs everything automatically, then your browser opens the app. Keep the little black window open while you use it; close it when you're done. Next time, just double-click the launcher again — it starts in seconds.

> Mac note: if double-clicking `start.command` is blocked, right-click it → **Open** → **Open** the first time.

## Tools

- **Convert** — turn photos (JPG, PNG, WebP, GIF, BMP, AVIF, HEIC) into PDFs. Upload as many as you like; each becomes its own PDF and they download together as a ZIP. Choose "Match image" (1:1) or "Fit to A4".
- **Combine** — merge any mix of PDFs and images into a single PDF. Reorder with the arrows; PDFs are appended page-by-page and each image becomes one page.
- **Edit** — open a PDF, drop on **text** or a **signature** (draw it or type it), drag to position and resize, then download the edited PDF.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
```

## Build & deploy

```bash
npm run build    # outputs static files to dist/
npm run preview  # preview the production build
```

`dist/` is fully static — deploy it to Netlify, Vercel, Cloudflare Pages, GitHub Pages, or any static host. No backend required.

## Stack

- **React + TypeScript + Vite**
- **pdf-lib** — create / merge PDFs, embed images, draw text & signatures
- **pdfjs-dist** — render PDF pages to canvas in the editor
- **jszip** — bundle multiple converted PDFs into one download
