import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

// Cross-origin isolation, so SharedArrayBuffer (and Pyodide's interrupt buffer) exists.
const ISOLATION = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

export default defineConfig({
  optimizeDeps: { exclude: ["pyodide"] },
  worker: { format: "es" },
  server: { headers: ISOLATION },
  preview: { headers: ISOLATION }, // Vite 6 falls back to server.headers anyway
  plugins: [
    viteStaticCopy({
      targets: [{
        src: "node_modules/pyodide/{pyodide.asm.mjs,pyodide.asm.wasm,python_stdlib.zip,pyodide-lock.json}",
        dest: "pyodide",
        rename: { stripBase: true },
      }],
    }),
  ],
});
