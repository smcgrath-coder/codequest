// tests/no-raw-colours.test.js
// Light mode only works if every screen colour comes from the theme. This reads the source and checks:
// - no colour is written out by hand, outside src/theme.js and the pixel-art sections (fenced by
//   `// art:begin` and `// art:end` lines);
// - the art never uses a colour that switches with the theme;
// - every component that uses a switching colour reads it with useTheme(), and names each one it uses there
//   (a name left out would quietly keep its dark value in light mode);
// - exactly, by Babel's scope analysis: only the crash screen reads a switching colour imported from theme.js;
// - the art fences pair up.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parse } from "@babel/parser";
import babelTraverse from "@babel/traverse";

const traverse = babelTraverse.default ?? babelTraverse;   // a CommonJS module: its function is on .default

const SRC = new URL("../src/", import.meta.url);
const read = f => fs.readFileSync(new URL(f, SRC), "utf8");
const FILES = ["App.jsx", "python/CodePanel.jsx"];
// A colour written out: hex, a CSS colour function (in any case, as CSS allows), or a Tailwind colour class.
// Tailwind's transparent, current and inherit are fine: they have no colour of their own.
const TAILWIND = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const COLOUR = new RegExp("#[0-9a-f]{3,8}\\b|\\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix)\\(" +
  `|\\b(?:bg|text|border(?:-[xytrbse])?|ring(?:-offset)?|fill|stroke|from|via|to|outline|divide|decoration|placeholder|caret|accent|shadow)-(?:(?:${TAILWIND})-\\d{2,3}|white|black)\\b`, "i");
// A line without its // comment. Only a // that starts the line or follows whitespace is one, so a URL's
// https:// doesn't hide the rest of the line.
const stripComment = line => line.replace(/(^|\s)\/\/.*$/, "$1");
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

test("the colour pattern knows every way to write a colour, and the comment strip leaves URLs alone", () => {
  for (const c of ["#FFF", "#64ffda44", "RGB(0,0,0)", "rgba(0,0,0,.5)", "hsl(0 0% 100%)", "HSLA(0,0%,0%,.5)", "hwb(0 0% 0%)",
    "lab(50% 0 0)", "lch(50% 0 0)", "oklab(0.5 0 0)", "oklch(0.7 0.1 200)", "color-mix(in srgb, red, blue)",
    "bg-white", "text-gray-900", "bg-black/50", "border-slate-200", "ring-sky-500", "fill-rose-600", "stroke-emerald-400",
    "from-indigo-500", "via-purple-500", "to-pink-500", "hover:bg-white"]) assert.match(c, COLOUR, c);
  for (const c of ["bg-transparent", "text-current", "border-inherit", "text-xs", "text-center", "border-t", "#1", "lab", "rgb"])
    assert.doesNotMatch(c, COLOUR, c);
  assert.equal(stripComment('<a href="https://example.org" style={{color:"#123456"}}>'), '<a href="https://example.org" style={{color:"#123456"}}>');
  assert.equal(stripComment("x = 1; // #fff is fine here").trim(), "x = 1;");
  assert.equal(stripComment("// #fff").trim(), "");
});

test("no screen colour is written out by hand: they all come from src/theme.js", () => {
  const found = [];
  for (const { f, code } of scan) for (const p of pieces(code)) {
    for (const { n, line } of p.lines) {
      const text = stripComment(line);   // a colour named in a comment is fine
      if (COLOUR.test(text)) found.push(`${f}:${n} (${p.name ?? "top"}): ${text.trim().slice(0, 100)}`);
    }
  }
  assert.deepEqual(found, []);
});

test("the pixel art never uses a colour that switches with the theme", () => {
  const found = [];
  for (const { f, artLines } of scan) for (const { n, raw } of artLines) if (USES_SWITCHING.test(stripComment(raw))) found.push(`${f}:${n}: ${raw.trim().slice(0, 100)}`);
  assert.deepEqual(found, []);
  assert.ok(scan[0].artLines.length > 1000, "App.jsx's art is fenced");
});

test("every component that uses a switching colour reads it with useTheme()", () => {
  const missing = [];
  for (const { f, code } of scan) for (const p of pieces(code)) {
    if (!p.name || !/^[A-Z]/.test(p.name) || NO_HOOK.has(p.name)) continue;
    const body = p.lines.map(l => stripComment(l.line)).join("\n");
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
    const body = p.lines.map(l => stripComment(l.line)).join("\n");
    const takes = [...body.matchAll(TAKES)];
    if (!takes.length) continue;
    const named = new Set(takes.flatMap(t => t[1].split(",").map(s => s.trim().split(/\s*[:=]\s*/)[0])));
    const missing = [...usedColours(withoutStrings(body.replace(TAKES, "")))].filter(c => !named.has(c));
    if (missing.length) gaps.push(`${f}: ${p.name} uses ${missing.join(", ")}`);
  }
  assert.deepEqual(gaps, []);
});

// The exact check. A switching colour imported from theme.js holds its dark value, so only the crash screen
// (ErrorBoundary, which stays dark) may read one. Scope analysis follows each name to the declaration it reads,
// so it sees what the text checks above can miss: nested templates, `const t=useTheme()`, a component whose =>
// is on a later line, lowercase render helpers, and default parameters (`{color=ACCENT}` reads the import even
// when the body takes ACCENT from useTheme()).
test("only the crash screen reads a switching colour imported from theme.js", () => {
  const leaks = [], importers = new Set();
  for (const f of FILES) traverse(parse(read(f), { sourceType: "module", plugins: ["jsx"] }), {
    ImportDeclaration(path) {
      if (!/(^|\/)theme(\.js)?$/.test(path.node.source.value)) return;
      importers.add(f);
      for (const s of path.node.specifiers) {
        if (s.type === "ImportNamespaceSpecifier") { leaks.push(`${f}: import * as ${s.local.name}`); continue; }
        if (!SWITCHING.includes(s.imported?.name ?? s.imported?.value)) continue;
        for (const ref of path.scope.getBinding(s.local.name).referencePaths)
          if (!ref.findParent(p => p.isClassDeclaration() && p.node.id?.name === "ErrorBoundary")) leaks.push(`${f}:${ref.node.loc.start.line} reads ${s.local.name}`);
      }
    },
  });
  assert.deepEqual([...importers], FILES, "each file's theme.js import was found");
  assert.deepEqual(leaks, []);
});

test("the art fences pair up: each // art:begin is closed by an // art:end before the next one", () => {
  for (const f of FILES) {
    const marks = read(f).split("\n").map((l, i) => [i + 1, /^\s*\/\/ art:begin/.test(l) ? "begin" : /^\s*\/\/ art:end/.test(l) ? "end" : null]).filter(m => m[1]);
    marks.forEach(([n, kind], i) => assert.equal(kind, i % 2 ? "end" : "begin", `${f}:${n}`));
    assert.equal(marks.length % 2, 0, `${f}: the last art:begin is never closed`);
  }
});
