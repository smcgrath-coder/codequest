// src/tutor.js
// Byte, the tutor, on the game's side: when Byte is offered, the tutor code remembered on this device, talking to
// /api/tutor, and how replies are shown. Plain JS, so node can test it; TutorPanel in App.jsx draws it.
import { LIMITS, TUTOR_STATES } from "./tutor-limits.js";
export { LIMITS };

export const TUTOR_URL = "/api/tutor";

// ── When Byte is offered ─────────────────────────────────────────────
// where: "room" (a chapter room or boss) or "victory" (its victory screen). Anything else, like the Practice Arena,
// never gets Byte. In a room Byte comes after the last hint.
export function shouldOfferTutor(where, hintLevel, hintsTotal) {
  if (where === "victory") return true;
  return where === "room" && hintsTotal > 0 && hintLevel >= hintsTotal;
}
// Hint mode never gives the fix. Open mode, only on the victory screen after a real pass (not "Mark it done"),
// talks about the kid's own solution.
export const tutorMode = (where, passed, markedDone) => (where === "victory" && passed && !markedDone ? "open" : "hint");

// ── The tutor code, remembered on this device ────────────────────────
// localStorage is looked up inside the try, as in theme.js: blocked storage throws on the lookup itself.
export const TUTOR_CODE_KEY = "cq:tutor-code";
export function loadTutorCode(storage) {
  try { return String((storage ?? globalThis.localStorage)?.getItem(TUTOR_CODE_KEY) ?? "").trim(); } catch { return ""; }
}
export function saveTutorCode(code, storage) {
  try { (storage ?? globalThis.localStorage)?.setItem(TUTOR_CODE_KEY, String(code).trim()); } catch {}
}
export function forgetTutorCode(storage) {
  try { (storage ?? globalThis.localStorage)?.removeItem(TUTOR_CODE_KEY); } catch {}
}

// ── What Byte says when it can't answer ──────────────────────────────
export const TUTOR_SAYS = {
  locked: "That code doesn't work — ask your grown-up for one.",
  recharging: "I need to recharge — let's try again tomorrow!",
  busy: "My circuits are busy. Try again in a minute!",
  offline: "I can't reach Byte right now. Your room works just the same — try again later.",
  "not-configured": "Byte isn't switched on here yet.",
  "bad-request": "That question got scrambled on the way. Try asking again!",
};
// What the panel does with an answer that isn't a reply: the words, their tone, and whether to ask for the code
// again. A locked answer means the saved code no longer works, so it's forgotten.
export function onTutorState(state, storage) {
  if (state === "locked") forgetTutorCode(storage);
  return { say: TUTOR_SAYS[state] ?? TUTOR_SAYS.busy, tone: state === "locked" ? "err" : state === "recharging" ? "gold" : "dim", needCode: state === "locked" };
}

// ── The request ──────────────────────────────────────────────────────
const clip = (s, n) => { s = String(s ?? ""); return s.length > n ? `${s.slice(0, n - 1)}…` : s; };

// Earlier chat for the next question, as the server wants it: whole pairs of a question and its answer (a question
// whose answer failed or hasn't come is left out), the last LIMITS.history messages.
export function historyFor(chat) {
  const done = chat.filter(m => !m.failed && !m.pending), pairs = [];
  for (let i = 0; i + 1 < done.length; i++) if (done[i].role === "user" && done[i + 1].role === "assistant") pairs.push(done[i], done[++i]);
  return pairs.slice(-LIMITS.history).map(m => ({ role: m.role, content: clip(m.content, LIMITS.turn) }));
}

// Everything Byte gets, clipped to what the server accepts: the task, the code, what the last run printed, its
// error and the checker's words, the hints shown, the chat and the question. No hero name, no profile.
// lastRunCode: the code of the last run (undefined before any), so Byte knows when the output is older than the code.
export function tutorPayload({ tutorCode, mode, challenge, program, lastRunCode, result, parts = [], hintLevel = 0, chat = [], question }) {
  const error = result?.error ? [result.error.headline, result.error.python].filter(Boolean).join("\n") : result?.keywordError || "";
  return {
    tutorCode: clip(String(tutorCode ?? "").trim(), LIMITS.tutorCode), mode,
    task: clip(challenge.task, LIMITS.task),
    program: clip(program, LIMITS.program),
    edited: lastRunCode !== undefined && program !== lastRunCode,
    output: clip(parts.map(p => p.text).join(""), LIMITS.output),
    error: clip(error, LIMITS.error),
    feedback: clip(result?.feedback, LIMITS.feedback),
    hints: (challenge.hints ?? []).slice(0, Math.min(hintLevel, LIMITS.hints)).map(h => clip(h, LIMITS.hint)),
    history: historyFor(chat),
    question: clip(String(question ?? "").trim(), LIMITS.question),
  };
}

// ── Talking to /api/tutor ────────────────────────────────────────────
const post = async (body, { fetch = globalThis.fetch, signal } = {}) => {
  try { return await fetch(TUTOR_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal }); }
  catch { return null; }
};
// A JSON answer's state. With no JSON: a 5xx (a platform error page) is busy; anything else (a 404, or a host
// that answers every path with the game's page) means there's no Byte here.
async function stateOf(res) {
  const json = (res.headers.get("content-type") ?? "").includes("application/json") ? await res.json().catch(() => null) : null;
  if (TUTOR_STATES.includes(json?.state)) return json.state;
  return json || res.status >= 500 ? "busy" : "not-configured";
}

// Is Byte set up on this site? "ready", "not-configured", or "offline" (couldn't tell).
export async function probeTutor({ fetch = globalThis.fetch } = {}) {
  let res;
  try { res = await fetch(TUTOR_URL, { method: "GET" }); } catch { return "offline"; }
  const state = await stateOf(res);
  return state === "ready" || state === "not-configured" ? state : "offline";
}
// Whether to show Ask Byte at all, asked once per page load. "offline" isn't kept, so the next room asks again.
let probed = null;
export function tutorReady() {
  probed ??= probeTutor().then(s => { if (s === "offline") probed = null; return s === "ready"; });
  return probed;
}

// Checks a tutor code without spending a question: "ready", "locked", or another state; "stopped" if aborted.
export async function checkTutorCode(tutorCode, { fetch, signal } = {}) {
  const res = await post({ tutorCode: clip(String(tutorCode ?? "").trim(), LIMITS.tutorCode), check: true }, { fetch, signal });
  if (!res) return signal?.aborted ? "stopped" : "offline";
  return stateOf(res);
}

// Asks Byte. onText(textSoFar) runs as the reply streams in. Resolves to { state: "ok", text, remaining } (remaining:
// questions left today, or null when uncapped), or { state } for anything else: locked, recharging, busy, offline,
// not-configured, bad-request, or stopped (the signal aborted: the kid left).
export async function askTutor(payload, { fetch, onText = () => {}, signal } = {}) {
  const res = await post(payload, { fetch, signal });
  if (!res) return { state: signal?.aborted ? "stopped" : "offline" };
  if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("text/plain")) return { state: await stateOf(res) };
  const left = res.headers.get("x-tutor-remaining"), remaining = /^\d+$/.test(left ?? "") ? Number(left) : null;
  const reader = res.body.getReader(), decoder = new TextDecoder();
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      onText(text);
    }
    text += decoder.decode();
  } catch { return { state: signal?.aborted ? "stopped" : "busy" }; }   // the reply broke off
  return text.trim() ? { state: "ok", text, remaining } : { state: "busy" };
}

// ── Showing a reply ──────────────────────────────────────────────────
// A code block: ``` with an optional language, up to the closing ``` (or the end, if the reply was cut off).
const FENCE = /```(?:[\w+-]*\n)?([\s\S]*?)(?:```|$)/g;
// A reply as pieces to draw: [{ kind: "text" | "code", text }].
export function replyParts(text) {
  const out = [], add = (kind, t) => { if (t) out.push({ kind, text: t }); };
  let at = 0;
  for (const m of text.matchAll(FENCE)) {
    add("text", text.slice(at, m.index).replace(/^\n+|\n+$/g, ""));
    add("code", m[1].replace(/\n+$/, ""));
    at = m.index + m[0].length;
  }
  add("text", text.slice(at).replace(/^\n+|\n+$/g, ""));
  return out;
}
// While a hint-mode reply streams in, its code (blocks and `inline`, finished or not) shows as ⌛ until the leak
// guard has checked it.
export const hideCode = text => text.replace(FENCE, "\n⌛\n").replace(/`[^`\n]*(?:`|$)/g, "⌛");
