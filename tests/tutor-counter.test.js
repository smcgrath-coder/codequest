// tests/tutor-counter.test.js
// The daily question counter (server/counter.js): which Upstash settings it reads, the exact /pipeline request,
// how it fails, and the in-memory counter used by tests and `npm run dev`. No network: fetch is faked.
import { test } from "node:test";
import assert from "node:assert/strict";
import { upstashConfig, upstashCounter, memoryCounter, COUNTER_TTL_SECONDS } from "../server/counter.js";

const KEY = "tutor:abc123:2026-09-26", TOKEN = "upstash-token-not-real";
const ENV = { UPSTASH_REDIS_REST_URL: "https://db.upstash.io/", UPSTASH_REDIS_REST_TOKEN: TOKEN };
// A fetch that records its calls and answers with `status` and `body` (a string is sent as it is).
const fakeFetch = (status, body) => { const calls = []; const f = async (url, init) => { calls.push({ url, init });
  return new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers: { "content-type": "application/json" } }); };
  f.calls = calls; return f; };

test("Upstash settings: its own names first, then the Vercel Marketplace's KV_ names, always as a URL and token pair", () => {
  assert.deepEqual(upstashConfig(ENV), { url: "https://db.upstash.io", token: TOKEN });
  const kv = { KV_REST_API_URL: "https://kv.upstash.io", KV_REST_API_TOKEN: "kv-token" };
  assert.deepEqual(upstashConfig(kv), { url: "https://kv.upstash.io", token: "kv-token" });
  assert.deepEqual(upstashConfig({ ...kv, ...ENV }).token, TOKEN, "Upstash's own names win");
  assert.deepEqual(upstashConfig({ ...kv, UPSTASH_REDIS_REST_URL: "https://half.upstash.io" }).url, "https://kv.upstash.io", "half a pair is skipped");
  assert.equal(upstashConfig({ KV_REST_API_URL: "https://kv.upstash.io", KV_REST_API_READ_ONLY_TOKEN: "ro" }), null, "never the read-only token");
  assert.equal(upstashConfig({}), null);
  assert.equal(upstashCounter({}), null, "no Upstash, no counter: nothing is capped");
});

test("one question is one /pipeline request: INCR, then EXPIRE of two days, with the token in the header", async () => {
  const fetch = fakeFetch(200, [{ result: 3 }, { result: 1 }]);
  assert.equal(await upstashCounter(ENV, { fetch }).incr(KEY), 3);
  const { url, init } = fetch.calls[0];
  assert.equal(url, "https://db.upstash.io/pipeline"); assert.equal(init.method, "POST");
  assert.equal(init.headers.Authorization, `Bearer ${TOKEN}`); assert.equal(init.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(init.body), [["INCR", KEY], ["EXPIRE", KEY, 172800]]);
  assert.equal(COUNTER_TTL_SECONDS, 172800); assert.ok(init.signal instanceof AbortSignal, "a timeout, so a slow Upstash can't stall Byte");
});

test("failures throw, and the error never holds the key or the token", async () => {
  const cases = [fakeFetch(401, { error: "WRONGPASS invalid password" }), fakeFetch(200, [{ error: "ERR max requests limit exceeded" }, { result: 1 }]),
    fakeFetch(502, "<html>Bad gateway</html>"), fakeFetch(200, { result: 3 }), fakeFetch(200, [{ result: "3" }, { result: 1 }])];
  for (const fetch of cases) await assert.rejects(upstashCounter(ENV, { fetch }).incr(KEY), e => !e.message.includes(KEY) && !e.message.includes(TOKEN) && !e.message.includes("abc123"));
});

test("a request that can't go out (a pasted token that starts with a line break, a bad URL, a timeout) throws with no token, URL or key", async () => {
  // Builds the Request as the real fetch does, so undici throws its own error, which quotes the bad header or URL
  const strict = async (url, init) => { new Request(url, init); return new Response("[]"); };
  const bad = [{ ...ENV, UPSTASH_REDIS_REST_TOKEN: `\n${TOKEN}` }, { ...ENV, UPSTASH_REDIS_REST_URL: "https://db .upstash.io" }];
  for (const env of bad) await assert.rejects(upstashCounter(env, { fetch: strict }).incr(KEY), e => e.message === "upstash request failed: TypeError" && !("cause" in e));
  const slow = async () => { throw new DOMException(`${TOKEN} ${KEY} took too long`, "TimeoutError"); };
  await assert.rejects(upstashCounter(ENV, { fetch: slow }).incr(KEY), e => e.message === "upstash request failed: TimeoutError");
});

test("a failed EXPIRE still counts, and is logged without the key", async () => {
  const logs = [], fetch = fakeFetch(200, [{ result: 1 }, { error: "ERR something" }]);
  assert.equal(await upstashCounter(ENV, { fetch, log: m => logs.push(m) }).incr(KEY), 1);
  assert.equal(logs.length, 1); assert.ok(!logs[0].includes(KEY));
});

test("the in-memory counter counts each key on its own", async () => {
  const c = memoryCounter();
  assert.equal(await c.incr("a"), 1); assert.equal(await c.incr("a"), 2); assert.equal(await c.incr("b"), 1);
});
