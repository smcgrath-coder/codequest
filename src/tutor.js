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

// ── The chat ─────────────────────────────────────────────────────────
// One chat per room, shared by its panels: [{ id, role: "user" | "assistant", content, pending?, failed? }].
// A question goes out with its reply on the way (pending, until it's finished); the question's id is the reply's + "q".
export const asked = (chat, id, question) => [...chat, { id: `${id}q`, role: "user", content: question }, { id, role: "assistant", content: "", pending: true }];
// A reply on its way: every panel for the room waits for it, and so does Run (see ChallengeRoom).
export const replyPending = chat => chat.some(m => m.role === "assistant" && m.pending);
// A reply that didn't come (it failed, the kid left, or something broke) goes; its question stays on screen, marked
// failed, so it's out of the history.
export const dropReply = (chat, id) => chat.filter(m => m.id !== id).map(m => (m.id === `${id}q` ? { ...m, failed: true } : m));

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
// The keyword checker's words are the error only with no Python, as OUTPUT shows them: after a clean run the grader
// rejected, flow.js fills keywordError too.
export function tutorPayload({ tutorCode, mode, challenge, program, lastRunCode, result, parts = [], hintLevel = 0, chat = [], question }) {
  const error = result?.error ? [result.error.headline, result.error.python].filter(Boolean).join("\n")
    : (result?.mode === "fallback" && result.keywordError) || "";
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
  const decoder = new TextDecoder();
  let text = "";
  try {
    const reader = res.body.getReader();   // in here: a reply with no body, or one already read, is busy too
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
// A finished reply as a screen reader hears it: its words and code as plain text, without the backticks.
export const spoken = text => replyParts(text).map(p => p.text.replace(/`/g, "")).join("\n");
// Plain lines of a reply that look like code. A >>> or ... prompt from the Python shell, or a list marker ("- ",
// "1. "), is dropped first. Then: a name followed by (, [, .name, = or +=, names = (a, b = …), a Capital name = or
// call, a # comment, or a statement like for, if, else, def, return, del or import. A line that reads as a sentence
// isn't code (see prose).
const PROMPT = /^[ \t]*(?:>>>|\.\.\.) ?/, BULLET = /^[ \t]*(?:[-*•]|\d+[.)])[ \t]/;
const CODE_LINE = /^(?:[a-z_]\w*\s*(?:\(|\[|\.[a-z_]|[-+*/%]?=(?!=))|[a-z_]\w*(?:\s*,\s*[a-z_]\w*)+\s*=(?!=)|[A-Z]\w*(?:\s*[-+*/%]?=(?!=)|\()|#|(?:for|while|if|elif|def|class|with|except)\b.*:|(?:else|try|finally)\s*:|(?:return|break|continue|pass|raise|del|global|nonlocal|assert|yield)\b|import\s+\w|from\s+\w+\s+import\b)/;
// Python's own words: only these may follow a name or a closing bracket (x in y, a if b else c).
const KEYWORDS = new Set("and as assert async await break case class continue def del elif else except finally for from global if import in is lambda match nonlocal not or pass raise return try while with yield".split(" "));
// A line of code without its # comment (a # in quotes stays).
const uncomment = line => line.replace(/^((?:[^#"']|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')*)#.*$/, "$1");
// A line that reads as a sentence, not code: it ends in "?", "!" or a word's ".", or has a word right after a name,
// number or bracket ("print() shows the sum", "return the total"). A comment at its end doesn't count; a comment
// line is a sentence only if it asks something.
function prose(line) {
  const l = uncomment(line).trim();
  if (!l) return line.trim().endsWith("?");
  if (/[?!]$|[^\d.]\.$/.test(l)) return true;
  let value = false;   // the last token ends a value: a name, number, string or closing bracket
  for (const [tok] of l.matchAll(/"(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?|[A-Za-z_]\w*|\d[\w.]*|\S/g)) {
    const word = /^[A-Za-z_]/.test(tok) && !KEYWORDS.has(tok);
    if (word && value) return true;
    value = word || /^["'\d)\]}]/.test(tok);
  }
  return false;
}
const looksLikeCode = line => { const l = line.replace(PROMPT, "").replace(BULLET, "").trim(); return CODE_LINE.test(l) && !prose(l); };
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
// above it counts too: inside its open brackets or """ string (indented, or closing them), or deeper than a block it
// opened (a body line like 10 / 0). Not a sentence, though, unless it's inside a """ string.
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
      const more = bare && (inside || (body >= 0 && ind > body)) && (triple || !prose(code));
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
// A lone name or symbol, like `print` or `==`: it can't be a program that passes a room. A lone symbol, like the `)`
// a hint points at, is never joined with the kid's program either.
const LONE = /^\s*(?:\w+|[^\w\s]{1,3})\s*$/, SYMBOL = /^\s*[^\w\s]{1,3}\s*$/;
// Code that could be a line of a program (a comment or a docstring too): not a lone name or symbol (unless it's
// return, break, continue or pass), and not a line of output. A mention like `==` or `:` would break every join it's in.
const statementy = code => (LONE.test(code) ? /^\s*(?:return|break|continue|pass)\s*$/.test(code)
  : /[(=:]/.test(code) || /^\s*(?:(?:return|break|continue|pass|import|from)\b|[#"'])/.test(code));
// Why a piece gives the room away: it passes on its own (or cut short), after a trivial edit, joined with Byte's other
// code (in this reply or earlier ones), or added to the kid's program.
const GIVES_AWAY = new Set(["passes", "edited", "joined", "program"]);

// Would this reply give the room away? One analysis for the guard and the evals (scripts/tutor-evals.js).
// grade(code) resolves to the room grader's { passed, stopped?, timedOut?, internal? }, and may reject.
// earlier: the code Byte showed in its earlier answers in this chat, one entry an answer (earlierCode), each a list of
// { code, plain } (a string is a piece, and a lone string an answer of one piece). program: the kid's code now.
// Resolves to { pieces, lines, passes, grades }: each code piece ({ inline, at, end, code, shown }) and each plain line
// that looks like code ({ at, end, code }), with caught: "" or why, and passes: whether anything gives it away.
// Each piece fails closed on its own: "passes" (alone, or cut short), "unsure" (its grade didn't finish) or "unsafe"
// (it reaches into Python, so it isn't safe to grade: kid code and grading share one Python; see reachesIntoPython).
// Edits and joins count only a real pass, so they add no false alarms: "edited", "joined" (with Byte's other code),
// "program" (after the kid's program), and "passes" for plain lines. "unchecked": the grader couldn't answer, at all
// or partway, so the code wasn't fully checked (a lone name or symbol in `inline` code still shows).
// "too many": more than MAX_PIECES pieces, so nothing was graded. grades: how many grades it took.
export async function leakCheck(text, { grade, earlier = [], program = "" }) {
  const cache = new Map();
  let blind = false, grades = 0, slow = false;
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
  // Only a real pass counts. A grade that was stopped (the kid pressed Run) or broke is no answer, like none at all.
  // A guess at indents that never finishes (grading.py's "never finished") ends the guessing: the rest may loop too.
  const passes = async (code, guess = false) => {
    if (blind || (guess && slow) || !code.trim() || reachesIntoPython(code)) return false;
    const r = await graded(code);
    if (r?.stopped || r?.internal) blind = true;
    if (guess && /never finished/.test(r?.feedback)) slow = true;
    return !!r?.passed;
  };

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

  // Joined, in order: as shown (a loop body keeps its indent) and with each piece tidied. Guesses too, but not for a
  // set of nothing but the kid's own lines quoted back (a guess might just fix their program): when a line opens a
  // block, the indents a kid could add (at most REINDENTS of those per reply), and the first piece moved last ("put
  // this after that"). If a join passes, every piece of this reply in it is caught, and the rest is tried again.
  const have = new Set(program.split("\n").map(l => l.trim()));
  const fresh = set => set.filter(x => x.visible.split("\n").some(l => l.trim() && !have.has(l.replace(PROMPT, "").trim())));
  let budget = REINDENTS;
  const join = async (set, before, guess = false) => {
    const own = !(before === mine && unfinished) && !fresh(set).length;
    if (own && (guess || before === mine)) return false;
    const why = before === mine ? "program" : !before.length && set.every(x => x.plain) ? "passes" : "joined";
    const tidied = set.map(x => tidy(x.visible)), bare = tidied.join("\n").split("\n").map(l => l.trim()).filter(Boolean);
    const tries = [[...before, ...set.map(x => x.visible)].join("\n"), [...before.map(tidy), ...tidied].join("\n")];
    if (!own && (bare.slice(0, -1).some(opens) || opens(before.join("\n").trimEnd()))) tries.push(...reindents(before.join("\n"), bare, budget));
    for (const [i, code] of tries.entries()) {
      const indents = i > 1 && !tries.slice(0, 2).includes(code);
      if (indents) budget--;
      if (await passes(code, indents)) { for (const x of set) x.caught ||= why; return true; }
    }
    return false;
  };
  // Byte's earlier answers come first, unless their code passes alone (the kid had it already). One item there that
  // isn't part of the answer (an `else:` mentioned, an example, a line of prose that looks like code) would break
  // every join it's in, so the joins also try cleaner earlier code: only its statements, and of those none, only the
  // latest answer's, only its pieces, all but the lines that open a block with nothing under them, and all but one
  // (each in turn).
  const answers = earlier.map(a => (Array.isArray(a) ? a : [a]).map(x => (typeof x === "string" ? { code: x, plain: false } : x)).filter(x => x.code.trim()));
  let all = answers.flat().map(x => x.code);
  if (!blind && live().length && all.length && await passes(all.join("\n"))) { all = []; answers.length = 0; }
  const kept = answers.map(a => a.filter(x => statementy(x.code))), said = kept.flat(), early = said.map(x => x.code), key = b => b.join("\n");
  const hangs = (x, next) => !x.code.includes("\n") && opens(x.code) && !/^\s/.test(next?.code ?? "");
  const befores = [[], kept[kept.length - 1] ?? [], said.filter(x => !x.plain), kept.flatMap(a => a.filter((x, i) => !hangs(x, a[i + 1]))),
    ...(said.length > 1 && said.length <= MAX_PIECES ? said.map((_, i) => said.filter((_, j) => j !== i)) : [])]
    .map(b => b.map(x => x.code)).filter((b, i, bs) => early.length && key(b) !== key(early) && bs.findIndex(c => key(c) === key(b)) === i);
  // The kid's program comes first in the last joins: the line it's missing, say. Not when it already passes (the kid
  // has the answer), or doesn't reach its end (a crash, or a loop that never stops: lines added after it never run).
  // An unfinished program (it doesn't parse, like an else: with nothing under it) may be finished by a copy of one of
  // the kid's own lines, so there their own code counts too. A lone symbol isn't joined to it: a hint may well point
  // at the `)` a line is missing.
  const own = !blind && live().length && program.trim() && !reachesIntoPython(program) ? await graded(program) : null;
  const unfinished = /SyntaxError/.test(own?.feedback), toEnd = own && (unfinished || own.failures?.[0]?.group !== "run");
  const mine = toEnd && !own.passed && !own.stopped && !own.timedOut && !own.internal ? [program] : null;
  for (let again = true; again && !blind;) {
    const now = live(), ps = now.filter(x => !x.plain), ls = now.filter(x => x.plain);
    const runs = [...new Set(ls.map(l => l.run))], blocks = ps.filter(p => !p.inline), stmts = ps.filter(p => statementy(p.visible));
    const sets = [[ps, all], [blocks, early], [stmts, early]].filter(([set, before]) => set.length && set.length + before.length > 1);
    if (stmts.length > 1) sets.push([[...stmts.slice(1), stmts[0]], early, true]);
    if (ls.length) sets.push([ls, []], ...(runs.length > 1 ? runs.map(r => [ls.filter(l => l.run === r), []]) : []));
    if (ls.length && (ps.length || all.length)) sets.push([now, all]);
    const clean = now.filter(x => x.plain || statementy(x.visible));
    sets.push(...befores.filter(b => clean.length + b.length > 1).map(b => [clean, b]));
    if (mine) {
      const mps = ps.filter(p => !SYMBOL.test(p.visible));
      sets.push(...[mps, ...(mps.length > 1 ? mps.map(p => [p]) : []), ls, now.filter(x => !SYMBOL.test(x.visible))]
        .map(unfinished ? set => set : fresh).filter(set => set.length).map(set => [set, mine]));
    }
    again = false;
    for (const [set, before, guess] of sets) if (await join(set, before, guess)) { again = true; break; }
  }
  // The grader stopped answering before every check was done: nothing it didn't finish checking is shown.
  if (blind) for (const x of items) if (!x.caught && !(x.inline && LONE.test(x.code))) x.caught = "unchecked";
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

// The code Byte showed earlier in a chat, for the guard's joins: one list for each finished answer, oldest first, of
// its code as the kid saw it (a cut block's first lines) and its plain lines that look like code ({ code, plain }).
// The guard's own `…` and lines aren't code.
export function earlierCode(chat) {
  return chat.filter(m => m.role === "assistant" && !m.pending && !m.failed && m.content).map(m => {
    const ps = piecesOf(m.content);
    return [...ps.filter(p => p.code.trim() && p.code !== "…").map(p => ({ at: p.at, code: visibleOf(p), plain: false })),
      ...codeLines(m.content, ps).map(l => ({ at: l.at, code: l.code, plain: true }))].sort((a, b) => a.at - b.at).map(({ code, plain }) => ({ code, plain }));
  }).filter(a => a.length);
}

// How long the guard's grader waits for the kid's own program to finish (it may be waiting at an input()).
export const GRADER_WAIT_MS = 60_000;
// The guard's grade(code) for one room: the page's Python with the room's rule. A grade would stop the kid's own
// program, so while that runs (busy()) it waits, and a grade the kid's Run stopped is tried again once it's done. It
// rejects, so the guard fails closed, when there's no Python or no rule, or the kid's program runs longer than wait.
export function graderFor({ runner, rule, starter = "", busy = () => false, wait = GRADER_WAIT_MS }) {
  const idle = async () => {
    for (const t0 = Date.now(); busy(); await new Promise(r => setTimeout(r, 100))) if (Date.now() - t0 > wait) throw new Error("can't grade now");
  };
  return async code => {
    for (let tries = 0; ; tries++) {
      await idle();
      if (!rule || !runner.available()) throw new Error("can't grade now");
      const r = await runner.grade(code, { rule, starter, inputs: [], attempt: 1 });
      if (!r?.stopped || !busy() || tries >= 2) return r;
    }
  };
}
