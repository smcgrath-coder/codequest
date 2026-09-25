import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PYODIDE_VERSION, PYODIDE_PATH, ISOLATION_HEADERS } from "../src/python/config.js";

const json = f => JSON.parse(fs.readFileSync(new URL(`../${f}`, import.meta.url), "utf8"));

test("pyodide is pinned to exactly the configured version", () => {
  assert.equal(json("package.json").dependencies.pyodide, PYODIDE_VERSION);
  assert.equal(json("node_modules/pyodide/package.json").version, PYODIDE_VERSION);
});

test("the Pyodide files are served from a versioned path", () => {
  assert.equal(PYODIDE_PATH, `/pyodide/${PYODIDE_VERSION}/`);
});

test("vercel.json isolates every response (needed for Stop and input())", () => {
  const all = json("vercel.json").headers.find(h => h.source === "/(.*)");
  assert.ok(all, "a headers rule for /(.*)");
  const got = Object.fromEntries(all.headers.map(h => [h.key, h.value]));
  for (const [k, v] of Object.entries(ISOLATION_HEADERS)) assert.equal(got[k], v, k);
});

test("vercel.json caches the versioned Pyodide files forever", () => {
  const rule = json("vercel.json").headers.find(h => h.source === "/pyodide/(.*)");
  assert.ok(rule, "a headers rule for /pyodide/(.*)");
  assert.match(rule.headers.find(h => h.key === "Cache-Control").value, /immutable/);
});
