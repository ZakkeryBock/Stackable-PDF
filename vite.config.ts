import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `base: './'` makes built asset paths relative so they work when the app is
// packaged into a desktop program (loaded from a local static server), while
// the dev server keeps an absolute base for correct HMR.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
}))
