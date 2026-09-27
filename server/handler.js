// server/handler.js
// /api/tutor. GET: is Byte set up here ("ready" or "not-configured")? POST: check a tutor code, or ask Byte a
// question, whose reply streams back as plain text. Every other answer is JSON { state }. It takes the environment
// and the outside world as arguments, so api/tutor.js (Vercel), server/dev.js (npm run dev) and the tests each hand
// in their own. It never logs a code, a key, the counter's key, or anything the kid sent or Byte said.
import { validateRequest, checkCode, codeList, dailyKey, dailyLimit, buildMessages, openRouterBody } from "./tutor.js";
import { streamText, readErrorBody, UpstreamError } from "./sse.js";

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const UPSTREAM_TIMEOUT_MS = 45_000;   // under the function's maxDuration of 60 s (vercel.json)
const STATUS = { ready: 200, "not-configured": 503, locked: 401, recharging: 429, busy: 502, "bad-request": 400 };
const NO_STORE = { "cache-control": "no-store" };
const answer = (state, status = STATUS[state]) => Response.json({ state }, { status, headers: NO_STORE });
const problem = e => (e instanceof UpstreamError ? `${e.code ?? "?"} ${e.type ?? ""}`.trim() : e?.name ?? "error");

export async function handleTutor(request, env, { fetch = globalThis.fetch, counter = null, now = () => new Date(), log = console.warn } = {}) {
  const configured = !!env.OPENROUTER_API_KEY && codeList(env.TUTOR_CODES).length > 0;
  if (request.method === "GET") return answer(configured ? "ready" : "not-configured", 200);
  if (request.method !== "POST") return answer("bad-request", 405);
  // JSON only: another site can't send JSON here without a CORS preflight, and the preflight (OPTIONS) gets the 405.
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return answer("bad-request", 415);
  if (!configured) return answer("not-configured");
  let req = null;
  try { req = validateRequest(await request.json()); } catch {}
  if (!req) return answer("bad-request");
  if (!checkCode(req.tutorCode, env.TUTOR_CODES)) return answer("locked");
  if (req.check) return answer("ready");

  // The daily cap. Counted before the question goes out, and after the code check, so a wrong code costs nothing.
  // If Upstash fails, Byte still answers: the OpenRouter key's credit limit is the backstop.
  let remaining = null;
  if (counter) {
    try {
      const count = await counter.incr(dailyKey(req.tutorCode, now())), limit = dailyLimit(env);
      if (count > limit) return answer("recharging");
      remaining = limit - count;
    } catch (e) { log(`tutor: counter unavailable (${e?.message ?? "error"}), not capping`); }
  }

  let upstream;
  try {
    upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(openRouterBody(buildMessages(req), env)),
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)]),
    });
  } catch (e) { log(`tutor: upstream unreachable (${problem(e)})`); return answer("busy"); }
  if (!upstream.ok) {
    const err = await readErrorBody(upstream);
    log(`tutor: upstream ${upstream.status}${err?.metadata?.limit_source ? ` ${err.metadata.limit_source}` : ""}`);
    return answer(upstream.status === 402 ? "recharging" : "busy");   // 402: the key's credit limit, or no credits
  }

  // Wait for Byte's first words before answering: an error can still be the first (and only) event of a 200
  // stream, and until then it can be a proper "busy". After that, a failure breaks off the text stream.
  const texts = streamText(upstream.body)[Symbol.asyncIterator]();
  let first;
  try { first = await texts.next(); } catch (e) { log(`tutor: upstream stream failed (${problem(e)})`); return answer("busy"); }
  const enc = new TextEncoder();
  const body = new ReadableStream({
    start(c) { if (!first.done) c.enqueue(enc.encode(first.value)); },
    async pull(c) {
      try { const { done, value } = await texts.next(); if (done) c.close(); else c.enqueue(enc.encode(value)); }
      catch (e) { if (!request.signal.aborted) log(`tutor: upstream stream failed (${problem(e)})`); c.error(new Error("the reply broke off")); }
    },
    cancel() { texts.return(); },
  });
  const headers = { "content-type": "text/plain; charset=utf-8", "x-content-type-options": "nosniff", ...NO_STORE };
  if (remaining !== null) headers["x-tutor-remaining"] = String(remaining);
  return new Response(body, { headers });
}
