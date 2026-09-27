// tests/tutor-api.test.js
// The Vercel side of Byte: api/tutor.js wires the handler to process.env, vercel.json gives it time and
// cancellation, and the function's code stays apart from the game's bundle (and the game's from it).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const read = f => fs.readFileSync(new URL(f, root), "utf8");
const jsIn = dir => fs.readdirSync(new URL(dir, root), { recursive: true }).filter(f => /\.(jsx?|mjs)$/.test(f)).map(f => `${dir}${f}`);
const imports = f => [...read(f).matchAll(/^\s*import\s[^;]*?from\s+["']([^"']+)["']/gm)].map(m => m[1]);

test("api/tutor.js is Vercel's fetch handler, reading Vercel's environment (with no key here: not-configured)", async () => {
  const names = ["OPENROUTER_API_KEY", "TUTOR_CODES", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL", "KV_REST_API_TOKEN"];
  const saved = names.map(k => [k, process.env[k]]);
  for (const k of names) delete process.env[k];
  try {
    const { default: fn } = await import("../api/tutor.js");
    assert.equal(typeof fn.fetch, "function");
    const res = await fn.fetch(new Request("http://localhost/api/tutor"));
    assert.deepEqual(await res.json(), { state: "not-configured" });
    const post = await fn.fetch(new Request("http://localhost/api/tutor", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tutorCode: "x", check: true }) }));
    assert.equal(post.status, 503);
  } finally { for (const [k, v] of saved) if (v !== undefined) process.env[k] = v; }
});

test("api/ holds only tutor.js: Vercel would deploy any other file there as a function too", () => {
  assert.deepEqual(fs.readdirSync(new URL("api/", root)).filter(f => !f.startsWith(".")), ["tutor.js"]);   // Vercel skips dot files
});

test("vercel.json gives the tutor a minute, and stops it when the kid leaves", () => {
  const { functions } = JSON.parse(read("vercel.json"));
  assert.deepEqual(functions["api/tutor.js"], { maxDuration: 60, supportsCancellation: true });
});

test("the game never imports the server, and the server takes only the shared limits from the game", () => {
  for (const f of jsIn("src/")) for (const i of imports(f)) assert.doesNotMatch(i, /(^|\/)(api|server)\//, `${f} imports ${i}`);
  for (const f of [...jsIn("server/"), ...jsIn("api/")]) for (const i of imports(f).filter(i => i.includes("/src/")))
    assert.match(i, /\/src\/tutor-limits\.js$/, `${f} imports ${i}`);
});

test("the pretend Byte and its 'dev' code never reach Vercel: api/ and the handler don't import them", () => {
  const reach = new Set(), walk = f => { if (reach.has(f)) return; reach.add(f);
    for (const i of imports(f)) if (i.startsWith(".")) walk(new URL(i, new URL(f, root)).pathname.slice(new URL(root).pathname.length)); };
  walk("api/tutor.js");
  assert.deepEqual([...reach].sort(), ["api/tutor.js", "server/counter.js", "server/handler.js", "server/sse.js", "server/tutor.js", "src/tutor-limits.js"]);
});
