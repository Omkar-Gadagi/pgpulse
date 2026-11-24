import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // The monorepo keeps a single .env at the repo root; read VITE_* and WEB_PORT from there.
  const envDir = path.resolve(import.meta.dirname, '../..')
  const env = loadEnv(mode, envDir, '')

  return {
    envDir,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      port: Number(env.WEB_PORT) || 5173,
      strictPort: true,
      // Listen on all interfaces so the dev server also works inside Docker
      host: true,
    },
    build: {
      // Highcharts alone is ~500 kB minified (~170 kB gzipped). It's only in the
      // lazily-loaded page chunks, so the default 500 kB warning is just noise here.
      chunkSizeWarningLimit: 650,
    },
    preview: {
      port: Number(env.WEB_PORT) || 5173,
      strictPort: true,
    },
  }
})
