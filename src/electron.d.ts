export {}

declare global {
  interface Window {
    electronAPI?: {
      onUpdateAvailable: (cb: (info: { version: string }) => void) => void
      onUpdateDownloaded: (cb: (info: { version: string }) => void) => void
      onUpdateError: (cb: (message: string) => void) => void
      installUpdate: () => void
    }
  }
}
