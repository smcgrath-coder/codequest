// src/tutor.js
// Byte, the tutor, on the game's side: when Byte is offered, the tutor code remembered on this device, talking to
// /api/tutor, how replies are shown, and the leak guard that checks Byte's code before a kid sees it. Plain JS, so
// node can test it; TutorPanel in App.jsx draws it.
import { LIMITS, TUTOR_STATES } from "./tutor-limits.js";
import { reachesIntoPython } from "./python/flow.js";
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
// Code in a reply, one rule for showing it and for the leak guard. A block: a run of 3 or more backticks, anything
// else on that line (a language: "python", " py", "Python3" or nothing), then the code up to the same run of
// backticks, or the end if the reply was cut off. Inline code: `…` within one line.
const PIECE = /(`{3,})(?:[^`\n]*\n)?([\s\S]*?)(?:\1|$)|`([^`\n]+)`/g;
// Every piece of code in a reply, in order: { inline, at, end, code } (a block's code without its last newlines).
const piecesOf = text => [...text.matchAll(PIECE)].map(m => ({ inline: m[3] !== undefined, at: m.index, end: m.index + m[0].length,
  code: m[3] ?? m[2].replace(/\n+$/, "") }));
// A reply as pieces to draw: [{ kind: "text" | "code", text }]. Inline code stays in the words.
export function replyParts(text) {
  const out = [], add = (kind, t) => { if (t) out.push({ kind, text: t }); };
  let at = 0;
  for (const p of piecesOf(text)) if (!p.inline) {
    add("text", text.slice(at, p.at).replace(/^\n+|\n+$/g, ""));
    add("code", p.code);
    at = p.end;
  }
  add("text", text.slice(at).replace(/^\n+|\n+$/g, ""));
  return out;
}
// While a hint-mode reply streams in, its code (blocks and `inline`, finished or not) shows as ⌛ until the leak
// guard has checked it.
export function hideCode(text) {
  let out = "", at = 0;
  for (const p of piecesOf(text)) { out += text.slice(at, p.at) + (p.inline ? "⌛" : "\n⌛\n"); at = p.end; }
  return out + text.slice(at).replace(/`[^`\n]*$/, "⌛");
}
// A code block around code, with more backticks than any run inside it, so it shows as exactly that code.
const fenced = code => {
  const ticks = "`".repeat(Math.max(3, ...(code.match(/`+/g) ?? []).map(r => r.length + 1)));
  return `${ticks}python\n${code}\n${ticks}`;
};

// ── The leak guard ───────────────────────────────────────────────────
export const LEAK_LINE = "I almost gave that away — try changing just the part we talked about!";
// In hint mode a code example is at most this many lines; a longer block is cut to them, with a "# …" line.
export const HINT_BLOCK_LINES = 2;
// Every piece of code in a reply, as the guard grades it: blocks and `inline` code.
export const codeIn = text => piecesOf(text).map(p => p.code);

// Would this code give the room away? Yes if it passes the room's grader. Also yes when the grader can't say
// (no Python, stopped, too slow, crashed) and when the code reaches into Python's insides, which isn't safe to
// grade (kid code and grading share one Python; see reachesIntoPython): the guard fails closed.
async function wouldLeak(code, grade) {
  if (!code.trim()) return false;
  if (reachesIntoPython(code)) return true;
  try { const g = await grade(code); return !g || !!(g.passed || g.stopped || g.timedOut || g.internal); } catch { return true; }
}

// Checks a finished hint-mode reply before the kid sees it. A code block that would pass the room becomes
// LEAK_LINE, and a long block is cut to HINT_BLOCK_LINES (its cut version must not pass either). `Inline` code that
// would pass becomes `…`, with LEAK_LINE added at the end. Open mode is returned as it is.
// grade(code) resolves to the room grader's { passed, stopped?, timedOut?, internal? }, and may reject.
export async function guardReply(text, { mode, grade }) {
  if (mode !== "hint") return text;
  const verdicts = new Map(), leaks = code => { if (!verdicts.has(code)) verdicts.set(code, wouldLeak(code, grade)); return verdicts.get(code); };
  let out = "", at = 0, caught = false;
  for (const p of piecesOf(text)) {
    out += text.slice(at, p.at); at = p.end;
    if (p.inline) { if (await leaks(p.code)) { out += "`…`"; caught = true; } else out += text.slice(p.at, p.end); continue; }
    const lines = p.code.split("\n"), long = lines.length > HINT_BLOCK_LINES;
    const shown = long ? [...lines.slice(0, HINT_BLOCK_LINES), "# …"].join("\n") : p.code;
    out += (await leaks(p.code)) || (long && (await leaks(shown))) ? LEAK_LINE : fenced(shown);
  }
  out += text.slice(at);
  return caught && !out.includes(LEAK_LINE) ? `${out.trimEnd()}\n\n${LEAK_LINE}` : out;
}

// The guard's grade(code) for one room: the page's Python with the room's rule. It rejects, so the guard fails
// closed, when there's no Python or no rule, and while the kid's own program runs (busy()), because a grade then
// would stop that program.
export function graderFor({ runner, rule, starter = "", busy = () => false }) {
  return async code => {
    if (!rule || busy() || !runner.available()) throw new Error("can't grade now");
    return runner.grade(code, { rule, starter, inputs: [], attempt: 1 });
  };
}
