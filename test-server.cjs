// Verifies the desktop app's static server serves the real built app correctly:
// index.html, the hashed JS bundle, the PDF.js worker (.mjs) with a JS MIME
// type, and SPA fallback for unknown routes.
const http = require('http')
const fs = require('fs')
const path = require('path')
const { startServer } = require('./electron/server.cjs')

const DIST = path.join(__dirname, 'dist')

function get(port, urlPath) {
  return new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port, path: urlPath }, (res) => {
        let body = ''
        res.on('data', (c) => (body += c))
        res.on('end', () =>
          resolve({ status: res.statusCode, type: res.headers['content-type'], body }),
        )
      })
      .on('error', reject)
  })
}

function assert(cond, msg) {
  if (!cond) {
    console.error('  FAIL -', msg)
    process.exitCode = 1
  } else {
    console.log('  ok   -', msg)
  }
}

;(async () => {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    console.error('dist/ not built — run `npm run build` first')
    process.exit(1)
  }

  const { server, port } = await startServer(DIST)
  console.log(`server listening on 127.0.0.1:${port}\n`)

  // Root serves index.html
  const root = await get(port, '/')
  assert(root.status === 200, 'GET / returns 200')
  assert(/text\/html/.test(root.type), '/ is text/html')
  assert(/<div id="root">/.test(root.body), '/ contains the React root div')

  // Discover the hashed asset names from index.html
  const js = (root.body.match(/\/assets\/[\w.-]+\.js/) || [])[0]
  const css = (root.body.match(/\/assets\/[\w.-]+\.css/) || [])[0]
  assert(!!js, `index references a JS bundle (${js})`)
  assert(!!css, `index references a CSS file (${css})`)

  const jsRes = await get(port, js)
  assert(jsRes.status === 200, `GET ${js} returns 200`)
  assert(/javascript/.test(jsRes.type), 'JS bundle served with a JavaScript MIME type')

  // The PDF.js worker must exist and be served as JS (module workers are strict about MIME)
  const files = fs.readdirSync(path.join(DIST, 'assets'))
  const worker = files.find((f) => f.includes('pdf.worker') && f.endsWith('.mjs'))
  assert(!!worker, `PDF.js worker present (${worker})`)
  if (worker) {
    const wRes = await get(port, `/assets/${worker}`)
    assert(wRes.status === 200, 'worker returns 200')
    assert(/javascript/.test(wRes.type), 'worker (.mjs) served with a JavaScript MIME type')
  }

  // SPA fallback
  const fallback = await get(port, '/does-not-exist')
  assert(fallback.status === 200 && /<div id="root">/.test(fallback.body), 'unknown route falls back to index.html')

  // Path traversal is blocked
  const evil = await get(port, '/../package.json')
  assert(evil.status === 200 && !/"electron-builder"/.test(evil.body), 'path traversal cannot escape dist/')

  server.close()
  console.log(process.exitCode ? '\nSERVER TEST FAILED' : '\nAll desktop-server checks passed.')
})()
