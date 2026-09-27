// server/counter.js
// Counts each code's questions per day. On Vercel: Upstash Redis through its REST API, with fetch (no SDK). In
// tests and on `npm run dev`: a Map.
export const COUNTER_TTL_SECONDS = 2 * 24 * 60 * 60;   // the key has the date in it; two days covers every time zone

// The Upstash URL and token, as a pair: Upstash's own names first, then the ones the Vercel Marketplace sets
// (KV_*), as @upstash/redis's Redis.fromEnv() does. Never the read-only token: INCR and EXPIRE are writes.
export function upstashConfig(env) {
  const pairs = [[env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN], [env.KV_REST_API_URL, env.KV_REST_API_TOKEN]];
  const hit = pairs.find(([url, token]) => url && token);
  return hit ? { url: hit[0].replace(/\/+$/, ""), token: hit[1] } : null;
}

// { incr(key) } resolving to the key's new count, or null when Upstash isn't set up (then nothing is capped).
// INCR and EXPIRE go in one /pipeline request. It throws on any failure, and its errors never hold the key, the
// token, the URL or the request body.
export function upstashCounter(env, { fetch = globalThis.fetch, timeoutMs = 2000, log = console.warn } = {}) {
  const cfg = upstashConfig(env);
  if (!cfg) return null;
  const said = e => (typeof e === "string" ? e.slice(0, 80) : "no message");
  return {
    async incr(key) {
      // fetch's own errors can quote the whole header (a token with a line break in it) or the URL, so only their
      // name goes on, and no cause.
      let res, body;
      try {
        res = await fetch(`${cfg.url}/pipeline`, {
          method: "POST",
          headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
          body: JSON.stringify([["INCR", key], ["EXPIRE", key, COUNTER_TTL_SECONDS]]),
          signal: AbortSignal.timeout(timeoutMs),
        });
        body = await res.json().catch(() => null);
      } catch (e) { throw new Error(`upstash request failed: ${e?.name ?? "error"}`); }
      if (!res.ok) throw new Error(`upstash http ${res.status}: ${said(body?.error)}`);
      // [{"result": <new count>}, {"result": 1}]; either item can be {"error": "ERR …"} instead
      if (!Array.isArray(body) || body.length !== 2) throw new Error("upstash: unexpected reply");
      const [incr, expire] = body;
      if (incr?.error) throw new Error(`upstash INCR failed: ${said(incr.error)}`);
      if (!Number.isSafeInteger(incr?.result)) throw new Error("upstash: INCR gave no count");
      if (expire?.error) log("tutor: upstash EXPIRE failed, so today's count has no expiry");
      return incr.result;
    },
  };
}

// The same counter in memory, for tests and `npm run dev`.
export function memoryCounter() {
  const counts = new Map();
  return { counts, async incr(key) { const n = (counts.get(key) ?? 0) + 1; counts.set(key, n); return n; } };
}
