// Pinned: the friendly error messages depend on this Python's exact wording.
export const PYODIDE_VERSION = "314.0.7";
export const PYODIDE_PATH = `/pyodide/${PYODIDE_VERSION}/`;
// Cross-origin isolation gives the page SharedArrayBuffer (instant Stop, live input()).
export const ISOLATION_HEADERS = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};
