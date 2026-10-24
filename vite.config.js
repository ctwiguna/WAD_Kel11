import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Ambil origin dari URL supaya CSP hanya mengizinkan alamat yang benar benar dipakai.
function asal(url) {
  try {
    return new URL(url).origin
  } catch {
    return ''
  }
}

// CSP hanya dipasang saat build. Mode dev tidak memakai CSP ketat karena Vite
// menyuntikkan skrip inline dan websocket untuk hot reload.
function pluginCsp(env) {
  const api = asal(env.VITE_API_URL)
  const supabase = asal(env.VITE_SUPABASE_URL)
  const connect = ["'self'", api, supabase, 'https://*.supabase.co', 'wss://*.supabase.co'].filter(Boolean)

  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connect.join(' ')}`,
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ')

  return {
    name: 'csp-produksi',
    apply: 'build',
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: csp },
            injectTo: 'head-prepend',
          },
          {
            tag: 'meta',
            attrs: { name: 'referrer', content: 'strict-origin-when-cross-origin' },
            injectTo: 'head-prepend',
          },
        ],
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), pluginCsp(env)],
    server: { port: 5173 },
  }
})
