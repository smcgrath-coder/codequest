// tests/no-raw-colours.test.js
// Light mode only works if every screen colour comes from the theme. This reads the source and checks:
// - no colour is written out by hand, outside src/theme.js and the pixel-art sections (fenced by
//   `// art:begin` and `// art:end` lines);
// - the art never uses a colour that switches with the theme;
// - every component that uses a switching colour reads it with useTheme(), and names each one it uses there
//   (a name left out would quietly keep its dark value in light mode);
// - the art fences pair up.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const SRC = new URL("../src/", import.meta.url);
const read = f => fs.readFileSync(new URL(f, SRC), "utf8");
const FILES = ["App.jsx", "python/CodePanel.jsx"];
const COLOUR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(/;
const SWITCHING = ["DARK", "PANEL", "PANEL2", "TEXT", "DIM", "VDIM", "ACCENT", "GOLD", "ERR", "ORANGE", "OK", "LINE_FAINT", "LINE", "LINE_STRONG"];
const USES_SWITCHING = new RegExp(`\\b(${SWITCHING.join("|")})\\b`);
// Components that don't read the theme on purpose: App provides it (PALETTES[theme]), and the crash screen
// stays dark.
const NO_HOOK = new Set(["App", "ErrorBoundary"]);

// Each line outside the art fences, numbered, with the art lines blanked; and the art lines.
function split(text) {
  let art = false; const code = [], artLines = [];
  text.split("\n").forEach((line, i) => {
    if (/^\s*\/\/ art:begin/.test(line)) art = true;
    (art ? artLines : code).push({ n: i + 1, line: art ? "" : line, raw: line });
    if (art) code.push({ n: i + 1, line: "" });
    if (/^\s*\/\/ art:end/.test(line)) art = false;
  });
  return { code, artLines };
}

// The top-level pieces of a file: each starts at a line beginning with function, class, const or export.
function pieces(code) {
  const out = []; let cur = { name: null, lines: [] };
  for (const l of code) {
    const m = l.line.match(/^(?:export\s+(?:default\s+)?)?(?:async\s+)?(?:function|class|const|let)\s+(\w+)/);
    if (m) { out.push(cur); cur = { name: m[1], lines: [] }; }
    cur.lines.push(l);
  }
  out.push(cur);
  return out;
}

const scan = FILES.map(f => ({ f, ...split(read(f)) }));

test("no screen colour is written out by hand: they all come from src/theme.js", () => {
  const found = [];
  for (const { f, code } of scan) for (const p of pieces(code)) {
    for (const { n, line } of p.lines) {
      const text = line.replace(/\/\/.*$/, "");   // a colour named in a comment is fine
      if (COLOUR.test(text)) found.push(`${f}:${n} (${p.name ?? "top"}): ${text.trim().slice(0, 100)}`);
    }
  }
  assert.deepEqual(found, []);
});

test("the pixel art never uses a colour that switches with the theme", () => {
  const found = [];
  for (const { f, artLines } of scan) for (const { n, raw } of artLines) if (USES_SWITCHING.test(raw.replace(/\/\/.*$/, ""))) found.push(`${f}:${n}: ${raw.trim().slice(0, 100)}`);
  assert.deepEqual(found, []);
  assert.ok(scan[0].artLines.length > 1000, "App.jsx's art is fenced");
});

test("every component that uses a switching colour reads it with useTheme()", () => {
  const missing = [];
  for (const { f, code } of scan) for (const p of pieces(code)) {
    if (!p.name || !/^[A-Z]/.test(p.name) || NO_HOOK.has(p.name)) continue;
    const body = p.lines.map(l => l.line.replace(/\/\/.*$/, "")).join("\n");
    if (!/^(function|class)|=>|function/.test(body.split("\n")[0])) continue;   // data, not a component
    if (USES_SWITCHING.test(body) && !/useTheme\(\)/.test(body)) missing.push(`${f}: ${p.name}`);
  }
  assert.deepEqual(missing, []);
});

// The names a component takes from the theme: its `const {…}=useTheme()` line, or App's `=PALETTES[theme]`.
const TAKES = /const\s*\{([^}]*)\}\s*=\s*(?:useTheme\(\)|PALETTES\[theme\])/g;
// Code with its string text taken out, so a word like "OK" in a label isn't read as the colour. A template
// keeps what's inside ${…}.
const withoutStrings = code => code
  .replace(/`[^`]*`/g, t => (t.match(/\$\{[^}]*\}/g) || []).join(" "))
  .replace(/"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g, '""');
// The switching colours code uses as values: not a property (M.DIM) or an object key ({DIM: …}).
function usedColours(code) {
  const used = new Set();
  for (const m of code.matchAll(new RegExp(`(?<![.\\w])(${SWITCHING.join("|")})\\b`, "g"))) {
    const before = code.slice(0, m.index).trimEnd().slice(-1), after = code.slice(m.index + m[0].length).trimStart()[0];
    if (!((before === "{" || before === ",") && after === ":")) used.add(m[1]);
  }
  return used;
}

test("each component names, where it takes the theme, every switching colour it uses", () => {
  const gaps = [];
  for (const { f, code } of scan) for (const p of pieces(code)) {
    const body = p.lines.map(l => l.line.replace(/\/\/.*$/, "")).join("\n");
    const takes = [...body.matchAll(TAKES)];
    if (!takes.length) continue;
    const named = new Set(takes.flatMap(t => t[1].split(",").map(s => s.trim().split(/\s*[:=]\s*/)[0])));
    const missing = [...usedColours(withoutStrings(body.replace(TAKES, "")))].filter(c => !named.has(c));
    if (missing.length) gaps.push(`${f}: ${p.name} uses ${missing.join(", ")}`);
  }
  assert.deepEqual(gaps, []);
});

test("the art fences pair up: each // art:begin is closed by an // art:end before the next one", () => {
  for (const f of FILES) {
    const marks = read(f).split("\n").map((l, i) => [i + 1, /^\s*\/\/ art:begin/.test(l) ? "begin" : /^\s*\/\/ art:end/.test(l) ? "end" : null]).filter(m => m[1]);
    marks.forEach(([n, kind], i) => assert.equal(kind, i % 2 ? "end" : "begin", `${f}:${n}`));
    assert.equal(marks.length % 2, 0, `${f}: the last art:begin is never closed`);
  }
});
