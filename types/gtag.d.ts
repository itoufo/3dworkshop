// gtag.js グローバルの型宣言。app/layout.tsx が挿入する window.gtag / dataLayer。
export {}

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void
    dataLayer: unknown[]
  }
}
