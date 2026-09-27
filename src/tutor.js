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
// Plain lines of a reply that look like code. A >>> or ... prompt from the Python shell, or a list marker ("- ",
// "1. "), is dropped first. Then: a name followed by (, [, .name, = or +=, names = (a, b = …), a Capital name = or
// call, a # comment, or a statement like for, if, else, def, return, del or import. A line ending in "?" is a
// question, not code.
const PROMPT = /^[ \t]*(?:>>>|\.\.\.) ?/, BULLET = /^[ \t]*(?:[-*•]|\d+[.)])[ \t]/;
const CODE_LINE = /^(?:[a-z_]\w*\s*(?:\(|\[|\.[a-z_]|[-+*/%]?=(?!=))|[a-z_]\w*(?:\s*,\s*[a-z_]\w*)+\s*=(?!=)|[A-Z]\w*(?:\s*[-+*/%]?=(?!=)|\()|#|(?:for|while|if|elif|def|class|with|except)\b.*:|(?:else|try|finally)\s*:|(?:return|break|continue|pass|raise|del|global|nonlocal|assert|yield)\b|import\s+\w|from\s+\w+\s+import\b)/;
const looksLikeCode = line => { const l = line.replace(PROMPT, "").replace(BULLET, "").trim(); return CODE_LINE.test(l) && !l.endsWith("?"); };
// A line of code that opens a block (ends in ":", maybe with a comment).
const opens = line => /:[ \t]*(?:#.*)?$/.test(line);
// The brackets and """ string a line of code leaves open, from those open before it (strings and comments skipped).
function carry(line, depth, triple) {
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (triple) { if (line.startsWith(triple, i)) { triple = ""; i += 2; } continue; }
    if (c === "#") break;
    if (line.startsWith('"""', i) || line.startsWith("'''", i)) { triple = line.slice(i, i + 3); i += 2; continue; }
    if (c === '"' || c === "'") { i++; while (i < line.length && line[i] !== c) i += line[i] === "\\" ? 2 : 1; continue; }
    if ("([{".includes(c)) depth++; else if (")]}".includes(c)) depth = Math.max(0, depth - 1);
  }
  return [depth, triple];
}
// Those lines, outside the reply's code pieces: { at, end, code, run }. code is the line without its prompt or marker
// (its indent kept, for a loop's body); run numbers lines that follow one another. A line that carries on the code
// above it counts too: inside its open brackets or """ string (indented, or closing them), or deeper than a block
// it opened (a body line like 10 / 0).
function codeLines(text, pieces = piecesOf(text)) {
  const out = [], gaps = [];
  let from = 0, run = 0;
  for (const p of pieces) { gaps.push([from, p.at]); from = p.end; }
  gaps.push([from, text.length]);
  for (const [a, b] of gaps) {
    let at = a, depth = 0, triple = "", body = -1;
    for (const line of text.slice(a, b).split("\n")) {
      const code = line.replace(PROMPT, "").replace(BULLET, ""), bare = code.trim(), ind = code.length - code.trimStart().length;
      const inside = (depth || triple) && (ind > 0 || /^[)\]}]/.test(bare) || (triple && bare.includes(triple)));
      const more = bare && (inside || (body >= 0 && ind > body));
      if (more || looksLikeCode(line)) {
        if (!out.length || out[out.length - 1].end !== at - 1) run++;
        out.push({ at, end: at + line.length, code, run });
        [depth, triple] = carry(code, depth, triple);
        if (opens(code) && !depth && !triple && (body < 0 || ind < body)) body = ind;
      } else if (bare) { depth = 0; triple = ""; body = -1; }
      at += line.length + 1;
    }
  }
  return out;
}
// While a hint-mode reply streams in, everything the leak guard will check shows as ⌛ until it has: blocks, `inline`
// code (finished or not) and plain lines that look like code.
export function hideCode(text) {
  const pieces = piecesOf(text), spots = [...pieces, ...codeLines(text, pieces)].sort((a, b) => a.at - b.at);
  let out = "", at = 0;
  for (const p of spots) { out += text.slice(at, p.at) + (p.inline === false ? "\n⌛\n" : "⌛"); at = p.end; }
  return out + text.slice(at).replace(/`[^`\n]*$/, "⌛");
}
// A code block around code, with more backticks than any run inside it, so it shows as exactly that code.
const fenced = code => {
  const ticks = "`".repeat(Math.max(3, ...(code.match(/`+/g) ?? []).map(r => r.length + 1)));
  return `${ticks}python\n${code}\n${ticks}`;
};

// ── The leak guard ───────────────────────────────────────────────────
export const LEAK_LINE = "I almost gave that away — try changing just the part we talked about!";
// Instead of code the guard couldn't check at all, because this device can't run Python.
export const UNCHECKED_LINE = "(I can't check code on this device, so I'll explain in words — ask me what it means!)";
// In hint mode a code example is at most this many lines; a longer block is cut to them, with a "# …" line.
export const HINT_BLOCK_LINES = 2;
// A reply with more pieces of code than this isn't graded at all (every piece is hidden): it bounds the work.
export const MAX_PIECES = 8;
// At most this many ways of indenting code shown without its indents are graded per reply.
const REINDENTS = 12;
// Every piece of code in a reply, as the guard grades it: blocks and `inline` code.
export const codeIn = text => piecesOf(text).map(p => p.code);
// The part of a piece the kid sees: a long block's first lines.
const visibleOf = p => (p.inline ? p.code : p.code.split("\n").slice(0, HINT_BLOCK_LINES).join("\n"));

// What a kid could paste after a trivial edit of code they can see: >>> prompts removed (with the output lines
// between them), dedented, and a leftover language line dropped.
function tidy(code) {
  let ls = code.split("\n");
  if (ls.some(l => PROMPT.test(l))) ls = ls.filter(l => PROMPT.test(l)).map(l => l.replace(PROMPT, ""));
  const cut = Math.min(...ls.filter(l => l.trim()).map(l => l.match(/^[ \t]*/)[0].length));
  if (cut < Infinity) ls = ls.map(l => l.slice(cut));
  if (ls.length > 1 && /^(?:python3?|py)$/i.test(ls[0].trim())) ls = ls.slice(1);
  return ls.join("\n");
}
// Those edits of a piece, and its first lines alone (code with its output pasted after it).
function edits(code) {
  const ls = tidy(code).split("\n"), out = new Set([ls.join("\n")]);
  for (let k = 1; k < ls.length; k++) out.add(ls.slice(0, k).join("\n"));
  out.delete(code);
  return [...out];
}
// Ways a kid could indent lines shown without their indents (`for i in range(3):` then `print(i)`), after head (kept
// as it is): a line after one that opens a block goes one step in, a line after return, break, continue, pass or
// raise steps out, and any other stays in line or steps out. The likeliest first, at most max of them.
function reindents(head, lines, max) {
  const out = [], hs = head.split("\n").filter(l => l.trim()), ends = l => /^\s*(?:return|break|continue|pass|raise)\b/.test(l);
  const walk = (i, level, prev, acc) => {
    if (out.length >= max) return;
    if (i === lines.length) { out.push([...hs, ...acc].join("\n")); return; }
    const open = opens(prev), top = open ? level + 1 : ends(prev) ? level - 1 : level;
    for (let l = top; l >= (open ? top : 0); l--) walk(i + 1, l, lines[i], [...acc, "    ".repeat(l) + lines[i]]);
  };
  const last = hs[hs.length - 1] ?? "";
  walk(0, Math.floor(last.match(/^ */)[0].length / 4), last, []);
  return out;
}
// Code that could be a statement of a program, not a lone name or a line of output.
const statementy = code => /[(=:]/.test(code) || /^\s*(?:return|break|continue|pass|import|from)\b/.test(code);
// A lone name or symbol, like `print` or `==`: it can't be a program that passes a room.
const LONE = /^\s*(?:\w+|[^\w\s]{1,3})\s*$/;
// Why a piece gives the room away: it passes on its own (or cut short), after a trivial edit, joined with Byte's other
// code (in this reply or earlier ones), or added to the kid's program.
const GIVES_AWAY = new Set(["passes", "edited", "joined", "program"]);

// Would this reply give the room away? One analysis for the guard and the evals (scripts/tutor-evals.js).
// grade(code) resolves to the room grader's { passed, stopped?, timedOut?, internal? }, and may reject.
// earlier: the code Byte showed earlier in this chat (earlierCode). program: the kid's code now.
// Resolves to { pieces, lines, passes, grades }: each code piece ({ inline, at, end, code, shown }) and each plain line
// that looks like code ({ at, end, code }), with caught: "" or why. Each piece fails closed on its own: caught when it
// passes ("passes"), when its grade didn't finish ("unsure") or when it reaches into Python ("unsafe": not safe to
// grade, since kid code and grading share one Python; see reachesIntoPython). "unchecked": the grader couldn't
// answer at all. Edits and joins count only a real pass, so they add no false alarms. passes: something passes.
export async function leakCheck(text, { grade, earlier = [], program = "" }) {
  const cache = new Map();
  let blind = false, grades = 0;
  // One grade per code string; null when the grader can't answer. After that nothing more is graded.
  const graded = async code => {
    if (!cache.has(code)) {
      if (blind) return null;
      grades++;
      cache.set(code, (async () => { try { return (await grade(code)) || null; } catch { return null; } })());
    }
    const r = await cache.get(code);
    if (!r) blind = true;
    return r;
  };
  const closed = async code => {
    if (!code.trim()) return "";
    if (reachesIntoPython(code)) return "unsafe";
    const r = await graded(code);
    return !r ? "unchecked" : r.passed ? "passes" : r.stopped || r.timedOut || r.internal ? "unsure" : "";
  };
  const passes = async code => !blind && !!code.trim() && !reachesIntoPython(code) && !!(await graded(code))?.passed;

  const pieces = piecesOf(text).filter(p => p.code !== "…").map(p => {   // `…` is the guard's own
    const long = !p.inline && p.code.split("\n").length > HINT_BLOCK_LINES, visible = visibleOf(p);
    return { ...p, visible, shown: long ? `${visible}\n# …` : p.code, long, caught: "" };
  });
  const lines = codeLines(text).map(l => ({ ...l, plain: true, visible: l.code, caught: "" }));
  const items = [...pieces, ...lines].sort((a, b) => a.at - b.at), live = () => items.filter(x => !x.caught);
  const result = () => ({ pieces, lines, passes: items.some(x => GIVES_AWAY.has(x.caught)), grades });
  if (pieces.length + new Set(lines.map(l => l.run)).size > MAX_PIECES) { for (const x of items) x.caught = "too many"; return result(); }

  // Each piece on its own (a long block whole and as cut), then what a trivial edit of what the kid sees makes.
  for (const p of pieces) {
    p.caught = (await closed(p.code)) || (p.long ? await closed(p.shown) : "");
    if (p.caught === "unchecked" && p.inline && LONE.test(p.code)) p.caught = "";
  }
  for (const p of pieces) if (!p.caught) for (const e of edits(p.visible)) if (await passes(e)) { p.caught = "edited"; break; }

  // Joined, in order: as shown (a loop body keeps its indent), with each piece tidied, and, when a line opens a block,
  // indented the ways a kid could (at most REINDENTS of those per reply). Earlier answers come first, unless their
  // code passes alone (the kid had it already). A join needs some code the kid doesn't have: quoting their own lines
  // back gives nothing away (and indenting them might just fix their program). If a join passes, every piece of this
  // reply in it is caught, and the rest is tried again.
  const have = new Set(program.split("\n").map(l => l.trim()));
  const fresh = set => set.filter(x => x.visible.split("\n").some(l => l.trim() && !have.has(l.replace(PROMPT, "").trim())));
  let budget = REINDENTS;
  const join = async (set, before) => {
    if (!(before === mine && unfinished) && !fresh(set).length) return false;
    const why = before === mine ? "program" : !before.length && set.every(x => x.plain) ? "passes" : "joined";
    const tidied = set.map(x => tidy(x.visible)), bare = tidied.join("\n").split("\n").map(l => l.trim()).filter(Boolean);
    const tries = [[...before, ...set.map(x => x.visible)].join("\n"), [...before.map(tidy), ...tidied].join("\n")];
    if (bare.slice(0, -1).some(opens) || opens(before.join("\n").trimEnd())) tries.push(...reindents(before.join("\n"), bare, budget));
    for (const [i, code] of tries.entries()) {
      if (i > 1 && !tries.slice(0, 2).includes(code)) budget--;
      if (await passes(code)) { for (const x of set) x.caught ||= why; return true; }
    }
    return false;
  };
  if (!blind && live().length && earlier.length && await passes(earlier.join("\n"))) earlier = [];
  // The kid's program comes first in the last joins: the line it's missing, say. Not when it already passes (the kid
  // has the answer), or doesn't reach its end (a crash, or a loop that never stops: lines added after it never run).
  // An unfinished program (it doesn't parse, like an else: with nothing under it) may be finished by a copy of one of
  // the kid's own lines, so there their own code counts too.
  const early = earlier.filter(statementy), own = !blind && live().length && program.trim() && !reachesIntoPython(program) ? await graded(program) : null;
  const unfinished = /SyntaxError/.test(own?.feedback), toEnd = own && (unfinished || own.failures?.[0]?.group !== "run");
  const mine = toEnd && !own.passed && !own.stopped && !own.timedOut && !own.internal ? [program] : null;
  for (let again = true; again && !blind;) {
    const now = live(), ps = now.filter(x => !x.plain), ls = now.filter(x => x.plain);
    const runs = [...new Set(ls.map(l => l.run))], blocks = ps.filter(p => !p.inline), stmts = ps.filter(p => statementy(p.visible));
    const sets = [[ps, earlier], [blocks, early], [stmts, early]].filter(([set, before]) => set.length && set.length + before.length > 1);
    if (ls.length) sets.push([ls, []], ...(runs.length > 1 ? runs.map(r => [ls.filter(l => l.run === r), []]) : []));
    if (ls.length && (ps.length || earlier.length)) sets.push([now, earlier]);
    if (mine) sets.push(...[ps, ...(ps.length > 1 ? ps.map(p => [p]) : []), ls, now].map(unfinished ? set => set : fresh).filter(set => set.length).map(set => [set, mine]));
    again = false;
    for (const [set, before] of sets) if (await join(set, before)) { again = true; break; }
  }
  return result();
}

// Checks a finished hint-mode reply before the kid sees it (open mode is returned as it is), with leakCheck. A caught
// code block becomes LEAK_LINE (or UNCHECKED_LINE when it couldn't be checked; a second one becomes …), and a long
// block is cut to HINT_BLOCK_LINES. Caught `inline` code becomes `…` and a caught plain line …, with LEAK_LINE (or
// UNCHECKED_LINE, if nothing was caught for real) added once at the end.
export async function guardReply(text, { mode, grade, earlier = [], program = "" }) {
  if (mode !== "hint") return text;
  const { pieces, lines } = await leakCheck(text, { grade, earlier, program }), spots = [...pieces, ...lines].sort((a, b) => a.at - b.at);
  const real = spots.some(x => x.caught && x.caught !== "unchecked");
  let out = "", at = 0, tail = false;
  for (const x of spots) {
    out += text.slice(at, x.at); at = x.end;
    const line = x.caught === "unchecked" ? UNCHECKED_LINE : LEAK_LINE;
    if (!x.plain && !x.inline) out += !x.caught ? fenced(x.shown) : out.includes(line) ? "…" : line;
    else if (!x.caught) out += text.slice(x.at, x.end);
    else { out += x.inline ? "`…`" : "…"; tail = true; }
  }
  out += text.slice(at);
  const end = real ? LEAK_LINE : UNCHECKED_LINE;
  return tail && !out.includes(end) ? `${out.trimEnd()}\n\n${end}` : out;
}

// The code Byte showed earlier in a chat, oldest first, for the guard's joins: each finished answer's code as the kid
// saw it (a cut block's first lines) and its plain lines that look like code. The guard's own `…` and lines aren't code.
export function earlierCode(chat) {
  return chat.filter(m => m.role === "assistant" && !m.pending && !m.failed && m.content).flatMap(m => {
    const ps = piecesOf(m.content);
    return [...ps.filter(p => p.code.trim() && p.code !== "…").map(p => ({ at: p.at, code: visibleOf(p) })), ...codeLines(m.content, ps)]
      .sort((a, b) => a.at - b.at).map(x => x.code);
  });
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
