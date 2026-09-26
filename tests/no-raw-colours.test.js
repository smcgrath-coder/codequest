// tests/no-raw-colours.test.js
// Light mode only works if every screen colour comes from the theme. This reads the source and checks:
// - no colour is written out by hand, outside src/theme.js and the pixel-art sections (fenced by
//   `// art:begin` and `// art:end` lines);
// - the art never uses a colour that switches with the theme;
// - every component that uses a switching colour reads it with useTheme().
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const SRC = new URL("../src/", import.meta.url);
const read = f => fs.readFileSync(new URL(f, SRC), "utf8");
const FILES = ["App.jsx", "python/CodePanel.jsx"];
const COLOUR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(/;
const SWITCHING = ["DARK", "PANEL", "PANEL2", "TEXT", "DIM", "VDIM", "ACCENT", "GOLD", "ERR", "ORANGE", "OK", "LINE_FAINT", "LINE", "LINE_STRONG"];
const USES_SWITCHING = new RegExp(`\\b(${SWITCHING.join("|")})\\b`);
// Components not converted yet. Each conversion task takes its own off this list; it is empty at the end.
const STILL_TO_CONVERT = new Set([
  "NPCDialogue", "Btn", "XpBar", "SessionTimer", "TitleScreen", "CharacterCreate", "ProfileSelect", "SessionSetup",
  "WorldMap", "ChapterOverview", "CharacterSheet",
  "Codex", "GrindingZone",
  "ChallengeRoom", "BadgeUnlock", "TrophyUnlock", "CodeEditor", "OutputPanel",
]);
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
    if (STILL_TO_CONVERT.has(p.name)) continue;
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
    if (!p.name || !/^[A-Z]/.test(p.name) || NO_HOOK.has(p.name) || STILL_TO_CONVERT.has(p.name)) continue;
    const body = p.lines.map(l => l.line.replace(/\/\/.*$/, "")).join("\n");
    if (!/^(function|class)|=>|function/.test(body.split("\n")[0])) continue;   // data, not a component
    if (USES_SWITCHING.test(body) && !/useTheme\(\)/.test(body)) missing.push(`${f}: ${p.name}`);
  }
  assert.deepEqual(missing, []);
});
