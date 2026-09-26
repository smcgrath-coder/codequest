// tests/theme.test.js
// The two palettes: the same names, hex that takes a glued alpha, and text colours readable on every surface.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PALETTES, LIGHT_INK, inkFor, loadTheme, saveTheme, THEME_KEY, CODE_BG, CODE_TEXT, CODE_ACCENT, CODE_EXAMPLE, CODE_GOLD, BOSS_PURPLE, bossGlow } from "../src/theme.js";
import { CODEX, NPCS } from "../src/content.js";

const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const lum = c => { const f = v => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
// WCAG contrast ratio of two [r, g, b] colours.
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// A colour at `alpha` laid over `base`, as the browser blends a glued hex alpha.
const over = (hex, alpha, base) => rgb(hex).map((c, i) => Math.round(c * alpha + base[i] * (1 - alpha)));
const SURFACES = ["DARK", "PANEL", "PANEL2"];
const TEXT_TOKENS = ["TEXT", "DIM", "VDIM", "ACCENT", "GOLD", "ERR", "ORANGE", "OK"];
// The alphas used for tinted pills and buttons: `${c}11`, Btn's `${c}18` and `${c}22`.
const TINTS = [0x11, 0x18, 0x22];

test("both palettes have the same names", () => {
  assert.deepEqual(Object.keys(PALETTES.light).sort(), Object.keys(PALETTES.dark).sort());
});

test("palette colours are 6-digit hex, so an alpha can be glued on; the LINE hairlines carry their own", () => {
  for (const [name, p] of Object.entries(PALETTES)) for (const [k, v] of Object.entries(p))
    assert.match(v, k.startsWith("LINE") ? /^#[0-9a-f]{8}$/ : /^#[0-9a-f]{6}$/, `${name}.${k}`);
});

for (const [name, p] of Object.entries(PALETTES)) test(`${name}: every text colour is readable (4.5:1) on every surface and on its own tints`, () => {
  const low = [];
  for (const t of TEXT_TOKENS) for (const s of SURFACES) {
    const r = ratio(rgb(p[t]), rgb(p[s])); if (r < 4.5) low.push(`${t} on ${s}: ${r.toFixed(2)}`);
    if (t !== "VDIM") for (const a of TINTS) {   // VDIM is never a button or pill colour
      const r2 = ratio(rgb(p[t]), over(p[t], a / 255, rgb(p[s]))); if (r2 < 4.5) low.push(`${t} on its ${a.toString(16)} tint over ${s}: ${r2.toFixed(2)}`);
    }
  }
  assert.deepEqual(low, []);
});

test("code panels stay readable: their text colours on the code background", () => {
  for (const c of [CODE_TEXT, CODE_ACCENT, CODE_EXAMPLE, CODE_GOLD]) assert.ok(ratio(rgb(c), rgb(CODE_BG)) >= 4.5, c);
});

test("every NPC and Codex colour has a light-mode ink that is readable on the light surfaces", () => {
  const colours = new Set([...CODEX.map(c => c.color), ...Object.values(NPCS).map(n => n.color)].map(c => c.toLowerCase()));
  for (const c of colours) {
    assert.ok(LIGHT_INK[c], `no light ink for ${c}`);
    for (const s of SURFACES) assert.ok(ratio(rgb(LIGHT_INK[c]), rgb(PALETTES.light[s])) >= 4.5, `${c} -> ${LIGHT_INK[c]} on ${s}`);
  }
});

test("ink() changes colours only in light mode, and leaves unknown ones alone", () => {
  assert.equal(inkFor("dark", "#9b59b6"), "#9b59b6");
  assert.equal(inkFor("light", "#9B59B6"), "#8e44ad");
  assert.equal(inkFor("light", "#123456"), "#123456");
});

test("the saved choice: light only when 'light' is saved; anything else, or blocked storage, is dark", () => {
  const store = m => ({ getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) });
  const m = new Map(), s = store(m);
  assert.equal(loadTheme(s), "dark");
  saveTheme("light", s); assert.equal(m.get(THEME_KEY), "light"); assert.equal(loadTheme(s), "light");
  saveTheme("purple", s); assert.equal(loadTheme(s), "dark");
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  assert.equal(loadTheme(blocked), "dark"); assert.doesNotThrow(() => saveTheme("light", blocked));
  assert.equal(loadTheme(undefined), "dark");
});

test("index.html sets the saved theme before the app loads, with the same key", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const script = html.indexOf(THEME_KEY), app = html.indexOf('src="/src/main.jsx"');
  assert.ok(script !== -1 && script < app, "the inline theme script comes before the app's module script");
  assert.match(html, /dataset\.theme\s*=\s*"light"/);
});

test("a boss room's glow: purple in dark mode, and in light mode one that keeps every text colour readable at its centre", () => {
  assert.equal(bossGlow("dark"), BOSS_PURPLE);
  const glow = bossGlow("light"), p = PALETTES.light;
  assert.match(glow, /^#[0-9a-f]{6}([0-9a-f]{2})?$/);
  const centre = over(glow.slice(0, 7), glow.length > 7 ? parseInt(glow.slice(7), 16) / 255 : 1, rgb(p.DARK));
  const low = [];
  for (const t of TEXT_TOKENS) {
    const r = ratio(rgb(p[t]), centre); if (r < 4.5) low.push(`${t}: ${r.toFixed(2)}`);
    if (t !== "VDIM") for (const a of TINTS) {   // the boss room's pills and buttons, on their own tint over the glow
      const r2 = ratio(rgb(p[t]), over(p[t], a / 255, centre)); if (r2 < 4.5) low.push(`${t} on its ${a.toString(16)} tint: ${r2.toFixed(2)}`);
    }
  }
  assert.deepEqual(low, []);
});
