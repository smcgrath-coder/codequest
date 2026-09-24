import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { PYODIDE_PATH, ISOLATION_HEADERS } from './src/python/config.js'

export default defineConfig({
  plugins: [
    react(),
    // The Pyodide runtime files, served from our own origin (school filters) in a versioned folder.
    viteStaticCopy({
      targets: [{
        src: 'node_modules/pyodide/{pyodide.asm.mjs,pyodide.asm.wasm,python_stdlib.zip,pyodide-lock.json}',
        dest: PYODIDE_PATH.slice(1, -1),
        rename: { stripBase: true },
      }],
    }),
  ],
  optimizeDeps: { exclude: ['pyodide'] },
  worker: { format: 'es' },
  server: { headers: ISOLATION_HEADERS },
  preview: { headers: ISOLATION_HEADERS },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
