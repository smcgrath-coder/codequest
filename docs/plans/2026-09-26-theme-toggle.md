# Dark/Light Mode Toggle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add a round ☀️/🌙 button beside the 🎵 button that switches CodeQuest's screens between today's dark look and a cool grey-blue light look, and remember both buttons' settings on the device.

**Architecture:** `src/theme.js` gets two palettes with the same token names, a React context (`ThemeScope`, `useTheme()`), `ink()` for NPC and chapter colours drawn as text, `loadTheme()`/`saveTheme()`, and fixed colour sets for what stays dark: the pixel art, the code panels, the world map and the celebration pop-ups. App holds the theme in state and provides it, and each colour-using component adds one `const {…}=useTheme();` line whose names shadow the old theme.js imports, so the component bodies barely change. An inline script in `index.html` applies the saved choice before the first paint, and a source-scan test keeps hand-written colours out of the screens and switching colours out of the fenced pixel art.

**Tech Stack:** React 18 (context), Vite 6, Tailwind 3 (layout only; the colours are inline styles), `node:test` with `node:assert/strict`.

---

## Before you start

**Design:** `docs/plans/2026-09-26-theme-toggle-design.md` (approved). Read it first.

**Rehearsed:** every task below was run in order on a scratch copy of 7b6b3af. Each red step failed as written, each green step passed, every task built, and a Babel scope check found no undefined names and no misplaced hooks after any task. `npm test` goes from 2,849 to 2,864 passing.

**Amended after Task 2's review (2026-09-26):** as written, the storage helpers in Tasks 1 and 2 (`loadTheme`, `saveTheme`, `loadMusicMuted`, `saveMusicMuted`) read `storage = globalThis.localStorage` as a default parameter, and a default parameter is evaluated outside the `try`. A browser that blocks storage throws a SecurityError from that lookup, so Task 4's first render would have crashed to a blank screen. A fix commit after Task 2, "Look up localStorage inside the storage helpers' try", moves the lookup inside the `try` in all four helpers (`(storage ?? globalThis.localStorage)?.…`) and adds `tests/blocked-storage.test.js`, which has one test. The helpers are called the same way as before and the Task 1 and 2 tests are unchanged. No later edit table moves: `src/theme.js` gained one comment line below line 41, and no later task edits `src/theme.js` below line 32. The new test makes every `npm test` count from Task 3 on one higher than rehearsed: 2,862 after Tasks 3 and 4, and 2,865 from Task 5 on. The branch ends with 12 commits. The counts below are already updated.

**Conventions:**
- Branch `theme-toggle`, already checked out in `/Users/smcgrath/Downloads/codequest` at 7b6b3af (main 9f10ece plus the design doc). Commit after every task, never on `main`. Push only when Task 13 says so.
- Every commit message ends with a blank line and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. The commit steps do this with a second `-m`.
- Code style follows the surrounding code: compact JSX in `App.jsx`, the spaced style of `CodePanel.jsx`, and short comments that say why. Use the code and comments below exactly as written.
- Tests use `node:test` with `node:assert/strict`. `npm test` runs `node --test tests/*.test.js`. `npm run build` writes `dist/`, which git ignores.
- Never use `git stash`: the stash is shared with every worktree of this repo. Set work aside with a temporary commit instead.

**Edit tables.** The changes to `src/App.jsx` and `src/python/CodePanel.jsx` come as edit tables:

```text
@ 85
- background:"#0d1117"
+ background:DARK
```

- `@ N` is the line number as the file stands at the start of that task, with the earlier tasks done exactly as written.
- `-` is the old text and `+` the new. The text starts after the two-character marker, so leading spaces count. The old text is a piece of the line that occurs exactly once on it: replace just that piece. Several `+` lines mean the new text spans several lines, and a bare `+` is an empty line.
- `@ N insert after: …` and `@ N insert before: …` add the `+` lines as new lines after or before line N. The text after the colon is how line N starts.
- `@ N delete the line` removes line N, whose whole text is the `-` line.
- Apply the rows from the bottom of the table up, so the numbers above stay right. If you go top down instead, find each line by its old text, because the numbers drift.

**Line numbers elsewhere.** The design doc and the colour inventory cite lines of main 9f10ece. Earlier tasks shift them, so use the numbers in this plan.

## Tasks

### Task 1: Palettes, ink() and the saved theme

**Files:**
- Create: `tests/theme.test.js`
- Modify: `src/theme.js` (replace the whole file)
- Modify: `src/content.js:1`, and add the NPCS table at the end
- Modify: `src/App.jsx:6`, `:1944`, `:1947-1961` (NPCS moves out)

The NPCS table moves to `content.js` so the tests can import it: `App.jsx` is JSX, which node can't load.

**Step 1: Write the failing test**

Create `tests/theme.test.js`:

```js
// tests/theme.test.js
// The two palettes: the same names, hex that takes a glued alpha, and text colours readable on every surface.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PALETTES, LIGHT_INK, inkFor, loadTheme, saveTheme, THEME_KEY, CODE_BG, CODE_TEXT, CODE_ACCENT, CODE_EXAMPLE } from "../src/theme.js";
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
  for (const c of [CODE_TEXT, CODE_ACCENT, CODE_EXAMPLE]) assert.ok(ratio(rgb(c), rgb(CODE_BG)) >= 4.5, c);
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
```

**Step 2: Run it to see it fail**

Run: `node --test tests/theme.test.js`
Expected: FAIL with `SyntaxError: The requested module '../src/theme.js' does not provide an export named …` (Node names one of the missing exports, for example `CODE_ACCENT`).

**Step 3: Replace `src/theme.js`**

Replace the whole file with:

```js
// ═══════════════════════════════════════════════════════════════════
// THEME — colour and font tokens for the dark and the light mode
// ═══════════════════════════════════════════════════════════════════
import { createContext, createElement, useContext } from "react";

// The two palettes, with the same names. Every colour is 6-digit hex, so a hex alpha can be glued on
// (`${GOLD}33`), except the LINE hairlines, which carry their own alpha and are always used whole.
export const PALETTES = {
  dark: {
    DARK: "#0a0a14", PANEL: "#0d1b2a", PANEL2: "#1a1a2e",
    TEXT: "#ccd6f6", DIM: "#8892b0", VDIM: "#7a8699",
    ACCENT: "#64ffda", GOLD: "#ffd700", ERR: "#ff6b6b", ORANGE: "#e67e22", OK: "#00bfa5",
    LINE_FAINT: "#ffffff08", LINE: "#ffffff11", LINE_STRONG: "#ffffff22",
  },
  light: {
    DARK: "#e8edf4", PANEL: "#f5f7fb", PANEL2: "#ffffff",
    TEXT: "#1b2436", DIM: "#4a5570", VDIM: "#5b6780",
    ACCENT: "#00695c", GOLD: "#7c5400", ERR: "#b01a1a", ORANGE: "#9a3d00", OK: "#00664f",
    LINE_FAINT: "#1b243614", LINE: "#1b24361f", LINE_STRONG: "#1b243633",
  },
};

// Colours that never switch: the pixel art keeps its own, and code panels stay dark like a terminal.
export const ART_ACCENT = "#64ffda", ART_GOLD = "#ffd700", ART_WELL = "#1a1a2e";
export const CODE_BG = "#0a0a14", CODE_TEXT = "#e6e6e6", CODE_ACCENT = "#64ffda", CODE_EXAMPLE = "#a8d8a8";
export const MONO = "'Courier New', monospace";

// Darker versions of the NPC and chapter colours, for names and headings drawn as text in light mode.
export const LIGHT_INK = {
  "#64ffda": PALETTES.light.ACCENT, "#ffd700": PALETTES.light.GOLD,
  "#9b59b6": "#8e44ad", "#2ecc71": "#1b7943", "#3498db": "#1d6fa5", "#1abc9c": "#107762",
  "#e74c3c": "#b0301f", "#f39c12": "#925d07", "#e91e63": "#c2185b", "#ff5722": "#c43000",
  "#ff9800": "#995b00", "#00e676": "#00783e",
};
export const inkFor = (theme, c) => (theme === "light" && LIGHT_INK[String(c).toLowerCase()]) || c;

// The dark palette under the old names, for code that doesn't read the theme (content.js, tests, the
// crash screen).
export const { DARK, PANEL, PANEL2, TEXT, DIM, VDIM, ACCENT, GOLD, ERR, ORANGE, OK, LINE_FAINT, LINE, LINE_STRONG } = PALETTES.dark;

// The player's choice on this device. Anything but "light" (nothing saved, or storage blocked) is dark.
export const THEME_KEY = "cq:theme";
export function loadTheme(storage = globalThis.localStorage) {
  try { return storage?.getItem(THEME_KEY) === "light" ? "light" : "dark"; } catch { return "dark"; }
}
export function saveTheme(theme, storage = globalThis.localStorage) {
  try { storage?.setItem(THEME_KEY, theme === "light" ? "light" : "dark"); } catch {}
}

const ThemeContext = createContext("dark");
// The current palette, plus `theme` ("dark" or "light") and `ink(c)` for NPC and chapter colours drawn as text.
export function useTheme() {
  const theme = useContext(ThemeContext);
  return { ...PALETTES[theme], theme, ink: c => inkFor(theme, c) };
}
// Gives its children a palette: App provides the player's choice, and ThemeScope name="dark" keeps the
// celebration pop-ups, the map and the art tiles dark in light mode.
export const ThemeScope = ({ name, children }) => createElement(ThemeContext.Provider, { value: name === "light" ? "light" : "dark" }, children);
```

The old named exports (`DARK`, `ACCENT`, …) are now the dark palette. They are unchanged except VDIM, which goes from `#4a5568` to `#7a8699` (the design's dark-mode contrast fix).

**Step 4: Run the test again**

Run: `node --test tests/theme.test.js`
Expected: FAIL with `SyntaxError: The requested module '../src/content.js' does not provide an export named 'NPCS'`.

**Step 5: Move NPCS to `src/content.js`**

In `src/content.js`, change line 1 from `import { ACCENT } from "./theme.js";` to:

```js
import { ACCENT, GOLD } from "./theme.js";
```

and add a blank line and this at the end of the file, after the closing `];` of `GRIND_CHALLENGES`. The table is the one this step cuts from App.jsx, now exported:

```js
// ═══════════════════════════════════════════════════════════════════
// NPCS — the characters who talk in the dialogue boxes
// ═══════════════════════════════════════════════════════════════════

// Their colours are the dark-mode ones; NPCDialogue draws their names with ink(), which darkens them in light mode.
export const NPCS = {
  byte:{name:"Byte",type:"byte",title:"Robot Companion",color:ACCENT},
  professor:{name:"Professor Loop",type:"professor",title:"The Eccentric Scientist",color:"#9b59b6"},
  guardian:{name:"The Guardian",type:"guardian",title:"Keeper of the Gates",color:GOLD},
  cipher:{name:"Cipher",type:"cipher",title:"The Mysterious One",color:"#e74c3c"},
  iterator:{name:"Iterator",type:"iterator",title:"The Clockwork Keeper",color:"#3498db"},
  index:{name:"Index",type:"index",title:"The Archivist Owl",color:"#1abc9c"},
  forge:{name:"Forge",type:"forge",title:"The Fire Smith",color:"#e74c3c"},
  cartographer:{name:"Cartographer",type:"cartographer",title:"The Map Keeper",color:"#f39c12"},
  pixel:{name:"Pixel",type:"pixel",title:"The Game Sprite",color:"#e91e63"},
  champion:{name:"The Champion",type:"champion",title:"Arena Master",color:"#ff5722"},
  wrench:{name:"Wrench",type:"wrench",title:"The Dockmaster",color:"#ff9800"},
  navigator:{name:"Navigator",type:"navigator",title:"Mission Control",color:"#00e676"},
};
```

Then apply this edit table to `src/App.jsx`. It imports NPCS, renames the banner that sat over the table and NPCDialogue, and deletes the table:

```text
@ 6
- import { CHAPTERS, TROPHIES, CODEX, GRIND_CHALLENGES } from "./content.js";
+ import { CHAPTERS, TROPHIES, CODEX, GRIND_CHALLENGES, NPCS } from "./content.js";

@ 1944
- // NPC DATA & DIALOGUE
+ // NPC DIALOGUE

@ 1947-1961 delete these 15 lines: const NPCS = { … (the whole NPCS table and the blank line after it)
```

**Step 6: Run the test to see it pass**

Run: `node --test tests/theme.test.js`
Expected: PASS, `ℹ tests 8`, `ℹ pass 8`.

**Step 7: Run the whole suite and build**

Run: `npm test`
Expected: `ℹ pass 2857` and `ℹ fail 0`.

Run: `npm run build`
Expected: it builds. The only warnings are the ones main already has: pyodide's `node:` modules being externalized for the browser, and a chunk over 500 kB.

**Step 8: Commit**

```bash
git add src/theme.js src/content.js src/App.jsx tests/theme.test.js
git commit -m "Add the dark and light palettes, ink() and the saved theme" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: `git show --stat HEAD` ends with `4 files changed, 143 insertions(+), 28 deletions(-)`.

### Task 2: Remember the music on/off choice

**Files:**
- Create: `tests/music.test.js`
- Modify: `src/music.js:55` (insert before), `:150-156` (`toggleMute()`)

**Step 1: Write the failing test**

Create `tests/music.test.js`:

```js
// tests/music.test.js
// The music on/off switch and its saved choice.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Music, loadMusicMuted, saveMusicMuted, MUTED_KEY } from "../src/music.js";

test("setMuted sets the state and returns it, and toggleMute flips it", () => {
  assert.equal(Music.setMuted(true), true); assert.equal(Music.muted, true);
  assert.equal(Music.toggleMute(), false); assert.equal(Music.muted, false);
  assert.equal(Music.setMuted(0), false);
});

test("setMuted silences the track that is playing, and unmuting brings back its volume", () => {
  const track = { volume: 0.3 };
  Music._current = track;
  try {
    Music.setMuted(true); assert.equal(track.volume, 0);
    Music.setMuted(false); assert.equal(track.volume, Music.volume);
  } finally { Music._current = null; Music.setMuted(false); }
});

test("the saved choice: muted only when '1' is saved; anything else, or blocked storage, is not", () => {
  const m = new Map(), s = { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  assert.equal(loadMusicMuted(s), false);
  saveMusicMuted(true, s); assert.equal(m.get(MUTED_KEY), "1"); assert.equal(loadMusicMuted(s), true);
  saveMusicMuted(false, s); assert.equal(loadMusicMuted(s), false);
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  assert.equal(loadMusicMuted(blocked), false); assert.doesNotThrow(() => saveMusicMuted(true, blocked));
});
```

**Step 2: Run it to see it fail**

Run: `node --test tests/music.test.js`
Expected: FAIL with `SyntaxError: The requested module '../src/music.js' does not provide an export named …` (for example `MUTED_KEY`).

**Step 3: Add the saved-choice helpers**

In `src/music.js`, insert this before line 55 (`// Singleton music player`), followed by one blank line:

```js
// The music on/off choice on this device. "1" is muted; anything else, or blocked storage, is not.
export const MUTED_KEY = "cq:music-muted";
export function loadMusicMuted(storage = globalThis.localStorage) {
  try { return storage?.getItem(MUTED_KEY) === "1"; } catch { return false; }
}
export function saveMusicMuted(muted, storage = globalThis.localStorage) {
  try { storage?.setItem(MUTED_KEY, muted ? "1" : "0"); } catch {}
}
```

**Step 4: Add `setMuted()`**

Replace `toggleMute()` (lines 150-156 before Step 3, 159-165 after it), which is:

```js
  toggleMute() {
    this._muted = !this._muted;
    if (this._current) {
      this._current.volume = this._muted ? 0 : this._volume;
    }
    return this._muted;
  }
```

with:

```js
  // Mutes or unmutes, including the track playing now; tracks started later read _muted. Returns the new state.
  setMuted(muted) {
    this._muted = !!muted;
    if (this._current) {
      this._current.volume = this._muted ? 0 : this._volume;
    }
    return this._muted;
  }

  toggleMute() {
    return this.setMuted(!this._muted);
  }
```

`Music.play` already reads `_muted` when a new track starts, so nothing else changes.

**Step 5: Run the test to see it pass**

Run: `node --test tests/music.test.js`
Expected: PASS, `ℹ tests 3`, `ℹ pass 3`.

**Step 6: Run the whole suite**

Run: `npm test`
Expected: `ℹ pass 2860` and `ℹ fail 0`.

**Step 7: Commit**

```bash
git add src/music.js tests/music.test.js
git commit -m "Remember the music on/off choice on this device" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: `git show --stat HEAD` ends with `2 files changed, 45 insertions(+), 2 deletions(-)`.

### Task 3: Apply the saved theme before the first paint

**Files:**
- Modify: `tests/theme.test.js` (one import, one test)
- Modify: `index.html:8` (insert after)
- Modify: `src/index.css` (add at the end)

**Step 1: Write the failing test**

In `tests/theme.test.js`, add this line after `import assert from "node:assert/strict";`:

```js
import fs from "node:fs";
```

and add this test at the end of the file:

```js
test("index.html sets the saved theme before the app loads, with the same key", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const script = html.indexOf(THEME_KEY), app = html.indexOf('src="/src/main.jsx"');
  assert.ok(script !== -1 && script < app, "the inline theme script comes before the app's module script");
  assert.match(html, /dataset\.theme\s*=\s*"light"/);
});
```

**Step 2: Run it to see it fail**

Run: `node --test tests/theme.test.js`
Expected: FAIL, 1 of 9: `AssertionError [ERR_ASSERTION]: the inline theme script comes before the app's module script`.

**Step 3: Add the inline script**

In `index.html`, insert these lines after line 8 (the `<link rel="icon" …>` line), inside `<head>`:

```html
    <!-- The saved light/dark choice, applied before anything is drawn so a light-mode player sees no dark flash. -->
    <script>try{if(localStorage.getItem("cq:theme")==="light")document.documentElement.dataset.theme="light"}catch(e){}</script>
```

`vercel.json` sends no Content-Security-Policy, so an inline script is allowed.

**Step 4: Add the light page background**

At the end of `src/index.css`, after the `body { … }` rule, add a blank line and:

```css
/* Light mode (html data-theme="light", set by index.html and App): the page behind every screen, and the
   browser's own controls and scrollbars. */
html { color-scheme: dark; }
html[data-theme="light"] { color-scheme: light; }
html[data-theme="light"] body { background: #e8edf4; }
```

**Step 5: Run the test to see it pass**

Run: `node --test tests/theme.test.js`
Expected: PASS, `ℹ tests 9`, `ℹ pass 9`.

**Step 6: Run the whole suite and build**

Run: `npm test`
Expected: `ℹ pass 2862` and `ℹ fail 0`.

Run: `npm run build`
Expected: it builds. The only warnings are the ones main already has: pyodide's `node:` modules being externalized for the browser, and a chunk over 500 kB.
Then run `grep -c 'cq:theme' dist/index.html`. Expected: `1`.

**Step 7: Commit**

```bash
git add index.html src/index.css tests/theme.test.js
git commit -m "Apply the saved theme before the first paint" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: `git show --stat HEAD` ends with `3 files changed, 16 insertions(+)`.

### Task 4: Wire App: the provider, the pop-up scopes, the corner buttons and the saved music

**Files:**
- Modify: `src/App.jsx:3-4` (imports) and `:2871-2977` (`export default function App()`)

No unit test can load `App.jsx` (JSX, and it touches the DOM when it loads), and the source scan that covers App arrives in Task 5. This task is checked by the build and a two-minute look in the browser.

What the edits do:
- App keeps `theme` in state, starting from `<html data-theme>` (set by Task 3's script) or `loadTheme()`, and an effect keeps the attribute and the saved choice in sync.
- App provides the theme, so it doesn't call `useTheme()` (the scan's `NO_HOOK` set has it). It reads its own colours from `PALETTES[theme]`: `DARK` and `ACCENT` for the loading screen (an early return outside the provider), and `PANEL2`, `ACCENT`, `DIM`, `TEXT` and `LINE_STRONG` for the corner buttons.
- Everything inside `<ErrorBoundary>` sits in `<ThemeScope name={theme}>`. TrophyUnlock and BadgeUnlock sit in `<ThemeScope name="dark">`, because their sparkles need a dark backdrop.
- The ☀️/🌙 button goes before 🎵 in the same `zIndex:100` corner container (above the `z-50` pop-ups), in the same round style, with a `title` and `aria-label`. Both buttons now have an `aria-label`.
- The music mute starts from `loadMusicMuted()`, is applied once through `Music.setMuted()`, and is saved on every click.
- ChallengeRoom's key is the challenge id, so switching mid-room doesn't remount it and the typed code survives.

**Step 1: Apply the edit table to `src/App.jsx`**

```text
@ 3
- import { Music, getTrackForContext } from "./music.js";
+ import { Music, getTrackForContext, loadMusicMuted, saveMusicMuted } from "./music.js";

@ 4
- import { DARK, PANEL, PANEL2, ACCENT, GOLD, TEXT, DIM, VDIM, MONO, ERR } from "./theme.js";
+ import { DARK, PANEL, PANEL2, ACCENT, GOLD, TEXT, DIM, VDIM, MONO, ERR, PALETTES, ThemeScope, loadTheme, saveTheme } from "./theme.js";

@ 2871
-   const [musicMuted,setMusicMuted]=useState(false);
+   const [musicMuted,setMusicMuted]=useState(()=>Music.setMuted(loadMusicMuted()));
+   // Light or dark: index.html has already set <html data-theme> from the saved choice, so the first paint matches.
+   const [theme,setTheme]=useState(()=>document.documentElement.dataset.theme==="light"?"light":loadTheme());
+   useEffect(()=>{document.documentElement.dataset.theme=theme;saveTheme(theme)},[theme]);
+   // App provides the theme, so it reads its own colours from the palette rather than useTheme().
+   const {DARK,PANEL2,ACCENT,DIM,TEXT,LINE_STRONG}=PALETTES[theme];

@ 2950
-   return <ErrorBoundary><div style={{fontFamily:MONO,minHeight:"100vh"}}>
+   return <ErrorBoundary><ThemeScope name={theme}><div style={{fontFamily:MONO,minHeight:"100vh"}}>

@ 2966
-     {pendingTrophies.length>0&&<TrophyUnlock key={pendingTrophies[0].id} trophy={pendingTrophies[0]} onContinue={dismissTrophy}/>}
+     {/* The celebration pop-ups stay dark in both modes: their sparkles need a dark backdrop */}
+     <ThemeScope name="dark">
+     {pendingTrophies.length>0&&<TrophyUnlock key={pendingTrophies[0].id} trophy={pendingTrophies[0]} onContinue={dismissTrophy}/>}

@ 2967
-     {pendingBadge&&<BadgeUnlock badge={pendingBadge} onContinue={()=>{setPendingBadge(null);setScreen("chapter")}}/>}
+     {pendingBadge&&<BadgeUnlock badge={pendingBadge} onContinue={()=>{setPendingBadge(null);setScreen("chapter")}}/>}
+     </ThemeScope>

@ 2968
-     {/* Music controls */}
+     {/* Corner controls: light/dark and music, each remembered on this device */}

@ 2969
-     <div className="fixed bottom-4 right-4 flex gap-2" style={{zIndex:100}}>
+     <div className="fixed bottom-4 right-4 flex gap-2" style={{zIndex:100}}>
+       <button onClick={()=>setTheme(t=>t==="light"?"dark":"light")}
+         className="w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all"
+         style={{background:PANEL2,border:`1px solid ${LINE_STRONG}`,color:TEXT,opacity:0.8}}
+         title={theme==="light"?"Switch to dark mode":"Switch to light mode"} aria-label={theme==="light"?"Switch to dark mode":"Switch to light mode"}>
+         {theme==="light"?"🌙":"☀️"}
+       </button>

@ 2970
- const m=Music.toggleMute();setMusicMuted(m)}}
+ const m=Music.toggleMute();setMusicMuted(m);saveMusicMuted(m)}}

@ 2972
- musicMuted?"#ffffff22":ACCENT+"44"
+ musicMuted?LINE_STRONG:ACCENT+"44"

@ 2973
- title={musicMuted?"Unmute music":"Mute music"}>
+ title={musicMuted?"Unmute music":"Mute music"} aria-label={musicMuted?"Unmute music":"Mute music"}>

@ 2977
-   </div></ErrorBoundary>;
+   </div></ThemeScope></ErrorBoundary>;
```

**Step 2: Run the whole suite and build**

Run: `npm test`
Expected: `ℹ pass 2862` and `ℹ fail 0`.

Run: `npm run build`
Expected: it builds. The only warnings are the ones main already has: pyodide's `node:` modules being externalized for the browser, and a chunk over 500 kB.

**Step 3: Look at it in the browser**

Run: `npm run dev`, open the URL it prints, and check:
- A ☀️ button sits left of 🎵 in the bottom-right corner. Clicking it turns it into 🌙, and in the DevTools console `document.documentElement.dataset.theme` and `localStorage["cq:theme"]` are both `"light"`.
- The screens themselves are still dark (their components are converted in Tasks 6-10). Only the page edge (visible when you overscroll), the loading screen and the corner buttons switch.
- Mute with 🎵, then reload: the button still shows 🔇, no music starts, and the theme button still shows 🌙.
- Tab reaches both buttons, and the theme button's accessible name reads "Switch to dark mode" in light mode.
- The console shows no errors.

**Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "Add the light/dark button and remember both corner buttons" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: `git show --stat HEAD` ends with `1 file changed, 23 insertions(+), 9 deletions(-)`.

### Task 5: Fence the pixel art, pin its colours, and add the source scan

**Files:**
- Create: `tests/no-raw-colours.test.js`
- Modify: `src/App.jsx:4`, and the art: Particles' palettes `:126-130`, COLORS/PixelAvatar/NPCAvatar `:196-1390`, SceneBanner `:1392-1941`, MapBackground `:2162-2261`

The art keeps its own colours in both modes. Its 19 uses of ACCENT and GOLD become the fixed `ART_ACCENT` and `ART_GOLD`, so light mode can't repaint a character's eyes or the map's river. The `// art:begin` and `// art:end` lines fence the art off from the scan. Inside a fence no switching token may appear, not even in a `{/* */}` JSX comment, because the scan strips only `//` comments.

`STILL_TO_CONVERT` lists the components whose colours Tasks 6-10 convert; the scan skips them until their task takes them off. App was converted in Task 4, and the art needs nothing beyond this task's fences and pins.

**Step 1: Write the failing test**

Create `tests/no-raw-colours.test.js`:

```js
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
  "ErrorBoundary", "GlobalStyles", "FloatingXP",
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
```

**Step 2: Run it to see it fail**

Run: `node --test tests/no-raw-colours.test.js`
Expected: FAIL, 3 of 3:
- the colour test lists the 879 lines of art that isn't fenced yet: NPCAvatar 506, SceneBanner 265, MapBackground 59, PixelAvatar 43, COLORS 3 and Particles 3;
- the art test fails with `App.jsx's art is fenced`;
- the hook test lists `App.jsx: PixelAvatar`, `App.jsx: NPCAvatar`, `App.jsx: SceneBanner` and `App.jsx: MapBackground`.

**Step 3: Apply the edit table to `src/App.jsx`**

Four fences, the 19 pins, and `ART_ACCENT` and `ART_GOLD` in the theme.js import:

```text
@ 4
- import { DARK, PANEL, PANEL2, ACCENT, GOLD, TEXT, DIM, VDIM, MONO, ERR, PALETTES, ThemeScope, loadTheme, saveTheme } from "./theme.js";
+ import { DARK, PANEL, PANEL2, ACCENT, GOLD, TEXT, DIM, VDIM, MONO, ERR, PALETTES, ThemeScope, loadTheme, saveTheme, ART_ACCENT, ART_GOLD } from "./theme.js";

@ 126 insert before: const colors = type === "boss"
+     // art:begin — the sparkle colours; the pop-ups that show them stay dark in both modes

@ 130 insert after: : ["#64ffda","#00bfa5","#80f0ff","#fff","#a8d8a8"];
+     // art:end

@ 196 insert before: const COLORS = {
+ // art:begin — the characters keep their own colours in both modes (ACCENT and GOLD pinned as ART_ACCENT and ART_GOLD)

@ 433
- fill={ACCENT}
+ fill={ART_ACCENT}

@ 456
- fill={ACCENT}
+ fill={ART_ACCENT}

@ 474
- fill={ACCENT}
+ fill={ART_ACCENT}

@ 475
- fill={ACCENT}
+ fill={ART_ACCENT}

@ 481
- fill={ACCENT}
+ fill={ART_ACCENT}

@ 482
- fill={ACCENT}
+ fill={ART_ACCENT}

@ 483
- fill={ACCENT}
+ fill={ART_ACCENT}

@ 498
- fill={ACCENT}
+ fill={ART_ACCENT}

@ 499
- fill={ACCENT}
+ fill={ART_ACCENT}

@ 500
- fill={ACCENT}
+ fill={ART_ACCENT}

@ 647
- fill={GOLD}
+ fill={ART_GOLD}

@ 648
- fill={GOLD}
+ fill={ART_GOLD}

@ 1390 insert after: }   (the end of NPCAvatar)
+ // art:end

@ 1392 insert before: function SceneBanner({ scene }) {
+ // art:begin — SceneBanner paints its own night sky, so it keeps its colours in both modes

@ 1394
- ac:ACCENT
+ ac:ART_ACCENT

@ 1636
- fill={GOLD}
+ fill={ART_GOLD}

@ 1941 insert after: }   (the end of SceneBanner)
+ // art:end

@ 2162 insert before: function MapBackground() {
+ // art:begin — MapBackground: the night scene behind the world map keeps its own colours in both modes

@ 2175
- fill={i%3===0?ACCENT:
+ fill={i%3===0?ART_ACCENT:

@ 2182
- stroke={ACCENT} strokeWidth="3"
+ stroke={ART_ACCENT} strokeWidth="3"

@ 2183
- stroke={ACCENT} strokeWidth="1.5"
+ stroke={ART_ACCENT} strokeWidth="1.5"

@ 2204
- fill={ACCENT} opacity="0.2"
+ fill={ART_ACCENT} opacity="0.2"

@ 2205
- fill={ACCENT} opacity="0.15"
+ fill={ART_ACCENT} opacity="0.15"

@ 2261 insert after: }   (the end of MapBackground)
+ // art:end
```

**Step 4: Run the test to see it pass**

Run: `node --test tests/no-raw-colours.test.js`
Expected: PASS, `ℹ tests 3`, `ℹ pass 3`.

**Step 5: Run the whole suite and build**

Run: `npm test`
Expected: `ℹ pass 2865` and `ℹ fail 0`.

Run: `npm run build`
Expected: it builds. The only warnings are the ones main already has: pyodide's `node:` modules being externalized for the browser, and a chunk over 500 kB.

**Step 6: Commit**

```bash
git add src/App.jsx tests/no-raw-colours.test.js
git commit -m "Fence the pixel art, pin its colours, and scan for raw colours" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: `git show --stat HEAD` ends with `2 files changed, 111 insertions(+), 20 deletions(-)`.

### Task 6: Convert group 1: the crash screen, the map glow and FloatingXP

**Files:**
- Modify: `src/App.jsx:4` and `:79-166` (ErrorBoundary, GlobalStyles, FloatingXP)
- Modify: `src/theme.js` (new fixed colours)
- Modify: `tests/no-raw-colours.test.js` (`STILL_TO_CONVERT`)

What the edits do:
- ErrorBoundary stays dark in both modes and has no hook (the scan's `NO_HOOK` set has it): it reads the plain theme.js imports, which are the dark palette. That's why App.jsx keeps importing `DARK`, `ACCENT`, `DIM` and `ERR`. `#0d1117` becomes `DARK` (#0a0a14, the nearest) and `#8b949e` becomes `DIM`.
- The `cq-glow-pulse` keyframes light the map's in-progress node, and the map stays dark, so `rgba(100,255,218,0.1/0.3)` becomes the fixed `${MAP_GLOW}1a`/`${MAP_GLOW}4d`.
- FloatingXP's hook goes above its `if (!visible) return null;` (hooks can't follow an early return). FloatingXP is never rendered anywhere, but it uses ACCENT, so the scan wants the hook. Deleting it would be a separate cleanup.

**Step 1: Take the group off `STILL_TO_CONVERT`**

In `tests/no-raw-colours.test.js`, delete this line from the list:

```js
  "ErrorBoundary", "GlobalStyles", "FloatingXP",
```

**Step 2: Run the scan to see it fail**

Run: `node --test tests/no-raw-colours.test.js`
Expected: FAIL, 2 of 3. The colour test lists App.jsx lines 85, 88, 89, 91 (ErrorBoundary) and 106 (GlobalStyles). The hook test lists `App.jsx: FloatingXP`.

**Step 3: Add the fixed colours to `src/theme.js`**

Insert after line 25 (`export const CODE_BG = "#0a0a14", CODE_TEXT = "#e6e6e6", CO…`):

```js
// The world map stays a night scene in light mode, so the glow of the chapter in progress keeps the dark-mode teal.
export const MAP_GLOW = "#64ffda";
```

**Step 4: Apply the edit table to `src/App.jsx`**

It includes the hook lines (each the first line of its component's body) and the theme.js import on line 4.

```text
@ 4
- import { DARK, PANEL, PANEL2, ACCENT, GOLD, TEXT, DIM, VDIM, MONO, ERR, PALETTES, ThemeScope, loadTheme, saveTheme, ART_ACCENT, ART_GOLD } from "./theme.js";
+ import { DARK, PANEL, PANEL2, ACCENT, GOLD, TEXT, DIM, VDIM, MONO, ERR, PALETTES, ThemeScope, useTheme, loadTheme, saveTheme, ART_ACCENT, ART_GOLD, MAP_GLOW } from "./theme.js";

@ 79
- // Error boundary — catches runtime crashes and shows message instead of white screen
+ // Error boundary — catches runtime crashes and shows message instead of white screen. It stays dark in both
+ // modes: it reads the plain theme.js imports (the dark palette), not useTheme().

@ 85
- background:"#0d1117"
+ background:DARK

@ 88
- color:"#ff6b6b"
+ color:ERR

@ 89
- color:"#8b949e"
+ color:DIM

@ 91
- background:"#64ffda18",border:"1px solid #64ffda66",color:"#64ffda"
+ background:`${ACCENT}18`,border:`1px solid ${ACCENT}66`,color:ACCENT

@ 100
- // Global CSS keyframes — always rendered
+ // Global CSS keyframes — always rendered. cq-glow-pulse lights the map's in-progress node, and the map stays dark
+ // in both modes, so its glow is the fixed MAP_GLOW.

@ 106
-     @keyframes cq-glow-pulse { 0%,100%{box-shadow:0 0 20px rgba(100,255,218,0.1)} 50%{box-shadow:0 0 40px rgba(100,255,218,0.3)} }
+     @keyframes cq-glow-pulse { 0%,100%{box-shadow:0 0 20px ${MAP_GLOW}1a} 50%{box-shadow:0 0 40px ${MAP_GLOW}4d} }

@ 166 insert after: function FloatingXP({ amount, visible }) {
+   const {ACCENT}=useTheme();
```

**Step 5: Run the scan to see it pass**

Run: `node --test tests/no-raw-colours.test.js`
Expected: PASS, `ℹ tests 3`, `ℹ pass 3`.

**Step 6: Run the whole suite and build**

Run: `npm test`
Expected: `ℹ pass 2865` and `ℹ fail 0`.

Run: `npm run build`
Expected: it builds. The only warnings are the ones main already has: pyodide's `node:` modules being externalized for the browser, and a chunk over 500 kB.

**Step 7: Commit**

```bash
git add src/App.jsx src/theme.js tests/no-raw-colours.test.js
git commit -m "Theme the crash screen, the map glow and FloatingXP" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: `git show --stat HEAD` ends with `3 files changed, 13 insertions(+), 9 deletions(-)`.

### Task 7: Convert group 2: NPC dialogue, buttons and the start screens

**Files:**
- Modify: `src/App.jsx:4` and `:1956-2148` (NPCDialogue, Btn, XpBar, SessionTimer, TitleScreen, CharacterCreate, ProfileSelect, SessionSetup)
- Modify: `src/theme.js` (new fixed colours)
- Modify: `tests/no-raw-colours.test.js` (`STILL_TO_CONVERT`)

What the edits do:
- Btn: the default parameter `color=ACCENT` would read the dark import before the hook runs, so it becomes `color??=ACCENT` after the hook. Don't take `MONO` from `useTheme()`: the hook returns only the palette, `theme` and `ink`.
- SessionTimer's hook goes before its early `return null`.
- NPCDialogue: the scrim stays black (`DIALOGUE_SCRIM`, the same 0.75 alpha), so the light box stands out. The NPC's name and the typing cursor use `ink()`. The avatar tile becomes `ART_WELL`, its only dark-mode change (it loses a 6.7% NPC tint). Tints such as `${n.color}44` keep the raw colour.
- The avatars in CharacterCreate, ProfileSelect and SessionSetup sit on an `inline-flex rounded-lg` `ART_WELL` tile. `ART_WELL` equals dark PANEL2, so dark mode looks and lays out as before.
- CharacterCreate in light mode: unselected swatches get a `LINE_STRONG` ring (the pale ones vanish on white), and the hero-name input gets a solid `DIM` border (its `${ACCENT}33` edge is 1.36:1 in light). Dark mode is unchanged. CP, the swatch picker, is an inner component and uses CharacterCreate's hook values.

**Step 1: Take the group off `STILL_TO_CONVERT`**

In `tests/no-raw-colours.test.js`, delete this line from the list:

```js
  "NPCDialogue", "Btn", "XpBar", "SessionTimer", "TitleScreen", "CharacterCreate", "ProfileSelect", "SessionSetup",
```

**Step 2: Run the scan to see it fail**

Run: `node --test tests/no-raw-colours.test.js`
Expected: FAIL, 2 of 3. The colour test lists App.jsx lines 1980, 1982 (NPCDialogue), 2034 (XpBar) and 2043 (SessionTimer). The hook test lists `App.jsx: NPCDialogue`, `App.jsx: Btn`, `App.jsx: XpBar`, `App.jsx: SessionTimer`, `App.jsx: TitleScreen`, `App.jsx: CharacterCreate`, `App.jsx: ProfileSelect` and `App.jsx: SessionSetup`.

**Step 3: Add the fixed colours to `src/theme.js`**

Insert after line 27 (`export const MAP_GLOW = "#64ffda";`):

```js
// The dim layer behind an NPC's dialogue box, the same in both modes.
export const DIALOGUE_SCRIM = "#000000bf";
```

**Step 4: Apply the edit table to `src/App.jsx`**

It includes the hook lines (each the first line of its component's body) and the theme.js import on line 4.

```text
@ 4
- import { DARK, PANEL, PANEL2, ACCENT, GOLD, TEXT, DIM, VDIM, MONO, ERR, PALETTES, ThemeScope, useTheme, loadTheme, saveTheme, ART_ACCENT, ART_GOLD, MAP_GLOW } from "./theme.js";
+ import { DARK, PANEL, PANEL2, ACCENT, GOLD, TEXT, DIM, VDIM, MONO, ERR, PALETTES, ThemeScope, useTheme, loadTheme, saveTheme, ART_ACCENT, ART_GOLD, ART_WELL, MAP_GLOW, DIALOGUE_SCRIM } from "./theme.js";

@ 1956 insert after: function NPCDialogue({ npc, lines, onComplete }) {
+   const { PANEL, PANEL2, TEXT, VDIM, LINE_FAINT, ink } = useTheme();

@ 1980
- style={{background:"rgba(0,0,0,0.75)"}}
+ style={{background:DIALOGUE_SCRIM}}

@ 1982
- inset 0 1px 0 #ffffff08
+ inset 0 1px 0 ${LINE_FAINT}

@ 1985
- background:`${n.color}11`
+ background:ART_WELL

@ 1988
- style={{color:n.color}}
+ style={{color:ink(n.color)}}

@ 1993
- color:n.color,animation
+ color:ink(n.color),animation

@ 2020
- color=ACCENT,
+ color,

@ 2020 insert after: function Btn({children,onClick,color=ACCENT,disabled,autoFocus,classN…
+   const {ACCENT}=useTheme();color??=ACCENT;   // here, not as a default parameter, which would read the dark ACCENT before the hook

@ 2029 insert after: function XpBar({current,next,label}){
+   const {PANEL2,DIM,ACCENT,OK}=useTheme();

@ 2034
- linear-gradient(90deg,${ACCENT},#00bfa5)
+ linear-gradient(90deg,${ACCENT},${OK})

@ 2039 insert after: function SessionTimer({time,active}){
+   const {ACCENT,ERR}=useTheme();

@ 2043
- background:low?"#ff6b6b22":`${ACCENT}11`
+ background:low?`${ERR}22`:`${ACCENT}11`

@ 2043
- ${low?"#ff6b6b44":`${ACCENT}33`}
+ ${low?`${ERR}44`:`${ACCENT}33`}

@ 2052 insert after: function TitleScreen({onStart}){
+   const {DARK,PANEL,DIM,VDIM,ACCENT}=useTheme();

@ 2066 insert after: function CharacterCreate({onComplete,existingProfiles}){
+   const {DARK,PANEL,PANEL2,TEXT,DIM,ACCENT,LINE_STRONG,theme}=useTheme();

@ 2084
- ${i===value?ACCENT:"transparent"}
+ ${i===value?ACCENT:theme==="light"?LINE_STRONG:"transparent"}

@ 2096
- border:`1px solid ${ACCENT}33`
+ border:`1px solid ${theme==="light"?DIM:`${ACCENT}33`}`

@ 2102
- <PixelAvatar hair={hair} skin={skin} shirt={shirt} accessory={accessory} size={128}/>
+ <div className="inline-flex rounded-lg" style={{background:ART_WELL}}><PixelAvatar hair={hair} skin={skin} shirt={shirt} accessory={accessory} size={128}/></div>

@ 2119 insert after: function ProfileSelect({profiles,onSelect,onCreate}){
+   const {DARK,PANEL,PANEL2,TEXT,DIM,ACCENT,GOLD}=useTheme();

@ 2128
- <PixelAvatar {...p.avatar} size={56}/>
+ <div className="inline-flex rounded-lg" style={{background:ART_WELL}}><PixelAvatar {...p.avatar} size={56}/></div>

@ 2143 insert after: function SessionSetup({onSelect,profile}){
+   const {DARK,PANEL,PANEL2,TEXT,DIM,ACCENT,GOLD}=useTheme();

@ 2148
- <PixelAvatar {...profile.avatar} size={64}/>
+ <div className="inline-flex rounded-lg" style={{background:ART_WELL}}><PixelAvatar {...profile.avatar} size={64}/></div>
```

**Step 5: Run the scan to see it pass**

Run: `node --test tests/no-raw-colours.test.js`
Expected: PASS, `ℹ tests 3`, `ℹ pass 3`.

**Step 6: Run the whole suite and build**

Run: `npm test`
Expected: `ℹ pass 2865` and `ℹ fail 0`.

Run: `npm run build`
Expected: it builds. The only warnings are the ones main already has: pyodide's `node:` modules being externalized for the browser, and a chunk over 500 kB.

**Step 7: Look at it in both modes**

With `npm run dev`, check the title, hero list, hero creation (pale swatches, the name box) and session screens, an NPC dialogue, and the XP bar and timer, in dark and then in light. Dark mode should look as it did before, apart from the changes listed above; light mode should be readable everywhere. The console shows no errors.

**Step 8: Commit**

```bash
git add src/App.jsx src/theme.js tests/no-raw-colours.test.js
git commit -m "Theme the NPC dialogue, buttons and the start screens" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: `git show --stat HEAD` ends with `3 files changed, 24 insertions(+), 15 deletions(-)`.

### Task 8: Convert group 3: the world map's top bar, the chapter page and the character sheet

**Files:**
- Modify: `src/App.jsx:4` and `:2286-2459` (WorldMap, ChapterOverview, CharacterSheet)
- Modify: `src/theme.js` (new fixed colours)
- Modify: `tests/no-raw-colours.test.js` (`STILL_TO_CONVERT`)

What the edits do:
- The map stays a night scene. WorldMap reads `M=PALETTES.dark` for the nodes, paths, labels and room dots, plus six `MAP_` constants for its greys, fills and shadows, while the top bar above the map uses the hook. The boss dot is `M.GOLD` on purpose: WorldMap's hook has no GOLD, and Task 10 drops GOLD from the imports.
- The top bar's avatar button is the character's tile, so it takes `ART_WELL`. The map frame's own 1px border is drawn on the page, so it takes the switching `LINE_FAINT`.
- The Practice button's hover handlers write `element.style`. The mouse-leave must restore exactly the resting `${ORANGE}33`.
- ChapterOverview: `SIDE_COLOR` becomes `ORANGE`, a per-render local after the hook. RoomBtn is an inner component and uses ChapterOverview's hook values. The defeated boss card's `#2a1a0022` becomes `${GOLD}08`: the brown tint would look like a grey, locked card in light mode.
- CharacterSheet: the avatar gets its own `rounded-lg p-2` `ART_WELL` tile. It is invisible in dark mode, where the card grows 16px taller.
- Known and left alone: an available node's hover builds `#64ffda6644` (10 hex digits), which the browser drops. It does the same on main.

**Step 1: Take the group off `STILL_TO_CONVERT`**

In `tests/no-raw-colours.test.js`, delete this line from the list:

```js
  "WorldMap", "ChapterOverview", "CharacterSheet",
```

**Step 2: Run the scan to see it fail**

Run: `node --test tests/no-raw-colours.test.js`
Expected: FAIL, 2 of 3. The colour test lists App.jsx lines 2296, 2298, 2299, 2304, 2321, 2322, 2323, 2330, 2336, 2348, 2349, 2351, 2352, 2353 (WorldMap), 2366, 2373, 2375, 2416 (ChapterOverview) and 2448, 2451, 2452, 2459 (CharacterSheet). The hook test lists `App.jsx: WorldMap`, `App.jsx: ChapterOverview` and `App.jsx: CharacterSheet`.

**Step 3: Add the fixed colours to `src/theme.js`**

Replace lines 26-27, which Task 6 added:

```js
// The world map stays a night scene in light mode, so the glow of the chapter in progress keeps the dark-mode teal.
export const MAP_GLOW = "#64ffda";
```

with:

```js
// The world map stays a night scene in light mode: its locked nodes, room dots, node fills, label shadows and the
// glow of the chapter in progress.
export const MAP_EDGE_LOCKED = "#333333", MAP_LOCKED = "#555555", MAP_DOT = "#444444";
export const MAP_ACTIVE = "#1a2a1a", MAP_DONE = "#0d2818", MAP_SHADOW = "#000000", MAP_GLOW = "#64ffda";
```

**Step 4: Apply the edit table to `src/App.jsx`**

It includes the hook lines (each the first line of its component's body) and the theme.js import on line 4.

```text
@ 4
- import { DARK, PANEL, PANEL2, ACCENT, GOLD, TEXT, DIM, VDIM, MONO, ERR, PALETTES, ThemeScope, useTheme, loadTheme, saveTheme, ART_ACCENT, ART_GOLD, ART_WELL, MAP_GLOW, DIALOGUE_SCRIM } from "./theme.js";
+ import { DARK, PANEL, PANEL2, ACCENT, GOLD, TEXT, DIM, VDIM, MONO, ERR, PALETTES, ThemeScope, useTheme, loadTheme, saveTheme, ART_ACCENT, ART_GOLD, ART_WELL, MAP_GLOW, MAP_EDGE_LOCKED, MAP_LOCKED, MAP_DOT, MAP_ACTIVE, MAP_DONE, MAP_SHADOW, DIALOGUE_SCRIM } from "./theme.js";

@ 2286 insert after: function WorldMap({chapters,profile,onSelectChapter,onCharSheet,onCod…
+   const {DARK,PANEL,PANEL2,TEXT,DIM,ACCENT,ORANGE,LINE_FAINT}=useTheme();

@ 2295
-   const cls={
+   // The map is a night scene that stays dark in light mode, so its nodes, paths and labels take the dark palette (M).
+   const M=PALETTES.dark;
+   const cls={

@ 2296
-     locked:{bg:`${PANEL2}cc`,bd:"#333",tx:"#555",glow:"none"},
+     locked:{bg:`${M.PANEL2}cc`,bd:MAP_EDGE_LOCKED,tx:MAP_LOCKED,glow:"none"},

@ 2297
-     available:{bg:`${PANEL2}ee`,bd:`${ACCENT}66`,tx:TEXT,glow:`0 0 12px ${ACCENT}22`},
+     available:{bg:`${M.PANEL2}ee`,bd:`${M.ACCENT}66`,tx:M.TEXT,glow:`0 0 12px ${M.ACCENT}22`},

@ 2298
-     "in-progress":{bg:"#1a2a1add",bd:ACCENT,tx:ACCENT,glow:`0 0 20px ${ACCENT}44`},
+     "in-progress":{bg:`${MAP_ACTIVE}dd`,bd:M.ACCENT,tx:M.ACCENT,glow:`0 0 20px ${M.ACCENT}44`},

@ 2299
-     completed:{bg:"#0d2818dd",bd:"#00bfa5",tx:ACCENT,glow:`0 0 12px #00bfa522`}
+     completed:{bg:`${MAP_DONE}dd`,bd:M.OK,tx:M.ACCENT,glow:`0 0 12px ${M.OK}22`}

@ 2304
- borderColor:"#ffffff08"
+ borderColor:LINE_FAINT

@ 2306
- style={{background:PANEL2,border:
+ style={{background:ART_WELL,border:

@ 2321
- border:`1px solid #e67e2233`,color:"#e67e22"
+ border:`1px solid ${ORANGE}33`,color:ORANGE

@ 2322
- e.currentTarget.style.borderColor="#e67e22";e.currentTarget.style.boxShadow=`0 0 12px #e67e2222`
+ e.currentTarget.style.borderColor=ORANGE;e.currentTarget.style.boxShadow=`0 0 12px ${ORANGE}22`

@ 2323
- e.currentTarget.style.borderColor="#e67e2233"
+ e.currentTarget.style.borderColor=`${ORANGE}33`

@ 2330
- border:"1px solid #ffffff08"
+ border:`1px solid ${LINE_FAINT}`

@ 2336
- stroke={st!=="locked"?ACCENT:"#555"}
+ stroke={st!=="locked"?M.ACCENT:MAP_LOCKED}

@ 2348
- textShadow:"0 1px 3px rgba(0,0,0,0.8)"
+ textShadow:`0 1px 3px ${MAP_SHADOW}cc`

@ 2349
- style={{color:DIM,fontSize:"8px",textShadow:"0 1px 2px rgba(0,0,0,0.9)"}}
+ style={{color:M.DIM,fontSize:"8px",textShadow:`0 1px 2px ${MAP_SHADOW}e6`}}

@ 2351
- style={{background:cr.has(r.id)?ACCENT:"#444",border:`1px solid ${cr.has(r.id)?ACCENT:"#555"}`,boxShadow:cr.has(r.id)?`0 0 4px ${ACCENT}66`:"none"}}
+ style={{background:cr.has(r.id)?M.ACCENT:MAP_DOT,border:`1px solid ${cr.has(r.id)?M.ACCENT:MAP_LOCKED}`,boxShadow:cr.has(r.id)?`0 0 4px ${M.ACCENT}66`:"none"}}

@ 2352
- style={{background:cr.has(r.id)?"#e67e22":"#444",border:`1px solid ${cr.has(r.id)?"#e67e22":"#555"}`,transform:"rotate(45deg)",boxShadow:cr.has(r.id)?`0 0 4px #e67e2266`:"none"}}
+ style={{background:cr.has(r.id)?M.ORANGE:MAP_DOT,border:`1px solid ${cr.has(r.id)?M.ORANGE:MAP_LOCKED}`,transform:"rotate(45deg)",boxShadow:cr.has(r.id)?`0 0 4px ${M.ORANGE}66`:"none"}}

@ 2353
- style={{background:cb.has(ch.boss.id)?GOLD:"#444",border:`1px solid ${cb.has(ch.boss.id)?GOLD:`${GOLD}44`}`}}
+ style={{background:cb.has(ch.boss.id)?M.GOLD:MAP_DOT,border:`1px solid ${cb.has(ch.boss.id)?M.GOLD:`${M.GOLD}44`}`}}

@ 2362 insert after: function ChapterOverview({chapter,profile,onSelectRoom,onSelectBoss,o…
+   const {DARK,PANEL,PANEL2,TEXT,DIM,VDIM,ACCENT,GOLD,ORANGE,LINE_FAINT,LINE,LINE_STRONG}=useTheme();

@ 2366
- const SIDE_COLOR="#e67e22";
+ const SIDE_COLOR=ORANGE;

@ 2373
- avail?"#ffffff22":"#ffffff08"}
+ avail?LINE_STRONG:LINE_FAINT}

@ 2375
- :"#ffffff11"}`
+ :LINE}`

@ 2416
- background:bDone?"#2a1a0022":allMainDone?PANEL2:DARK
+ background:bDone?`${GOLD}08`:allMainDone?PANEL2:DARK

@ 2416
- :"#ffffff08"}`
+ :LINE_FAINT}`

@ 2426 insert after: function CharacterSheet({profile,onBack}){
+   const {DARK,PANEL,PANEL2,TEXT,DIM,VDIM,ACCENT,GOLD,ORANGE,LINE_FAINT,LINE}=useTheme();

@ 2432
- <PixelAvatar {...profile.avatar} size={128}/>
+ <div className="rounded-lg p-2" style={{background:ART_WELL}}><PixelAvatar {...profile.avatar} size={128}/></div>

@ 2448
- style={{color:"#e67e22"}}
+ style={{color:ORANGE}}

@ 2451
- style={{background:e?"#e67e2215":`${DARK}88`,border:`1px solid ${e?"#e67e2244":"#ffffff08"}`
+ style={{background:e?`${ORANGE}15`:`${DARK}88`,border:`1px solid ${e?`${ORANGE}44`:LINE_FAINT}`

@ 2452
- color:e?"#e67e22":DIM
+ color:e?ORANGE:DIM

@ 2459
- border:"1px solid #ffffff11"
+ border:`1px solid ${LINE}`
```

**Step 5: Run the scan to see it pass**

Run: `node --test tests/no-raw-colours.test.js`
Expected: PASS, `ℹ tests 3`, `ℹ pass 3`.

**Step 6: Run the whole suite and build**

Run: `npm test`
Expected: `ℹ pass 2865` and `ℹ fail 0`.

Run: `npm run build`
Expected: it builds. The only warnings are the ones main already has: pyodide's `node:` modules being externalized for the browser, and a chunk over 500 kB.

**Step 7: Look at it in both modes**

With `npm run dev`, check the world map (the map itself unchanged, the top bar switching), a chapter page with locked, open and done rooms, and the character sheet, in dark and then in light. Dark mode should look as it did before, apart from the changes listed above; light mode should be readable everywhere. The console shows no errors.

**Step 8: Commit**

```bash
git add src/App.jsx src/theme.js tests/no-raw-colours.test.js
git commit -m "Theme the world map's top bar, the chapter page and the character sheet" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: `git show --stat HEAD` ends with `3 files changed, 35 insertions(+), 29 deletions(-)`.

### Task 9: Convert group 4: the Codex and the Practice Arena

**Files:**
- Modify: `src/App.jsx:4` and `:2475-2657` (Codex, GrindingZone)
- Modify: `tests/no-raw-colours.test.js` (`STILL_TO_CONVERT`)

What the edits do:
- Chapter titles, headings and concept names drawn as text use `ink()`. Tints and borders keep the raw chapter colour.
- The SYNTAX and EXAMPLE `<pre>` blocks are code surfaces and stay dark: `CODE_BG` with `CODE_ACCENT` (teal, as today) and `CODE_EXAMPLE`.
- `#ffffff05`, fainter than 08, becomes `LINE_FAINT`.
- GrindingZone's hook goes before its early `if(!challenge) return`. Its hover handlers restore `LINE` on mouse-leave.

**Step 1: Take the group off `STILL_TO_CONVERT`**

In `tests/no-raw-colours.test.js`, delete this line from the list:

```js
  "Codex", "GrindingZone",
```

**Step 2: Run the scan to see it fail**

Run: `node --test tests/no-raw-colours.test.js`
Expected: FAIL, 2 of 3. The colour test lists App.jsx lines 2506, 2531, 2535, 2538, 2546 (Codex) and 2614, 2619, 2621, 2629, 2630, 2631, 2642, 2646, 2647, 2648, 2651, 2655, 2656, 2657 (GrindingZone). The hook test lists `App.jsx: Codex` and `App.jsx: GrindingZone`.

**Step 3: Apply the edit table to `src/App.jsx`**

It includes the hook lines (each the first line of its component's body) and the theme.js import on line 4.

```text
@ 4
- import { DARK, PANEL, PANEL2, ACCENT, GOLD, TEXT, DIM, VDIM, MONO, ERR, PALETTES, ThemeScope, useTheme, loadTheme, saveTheme, ART_ACCENT, ART_GOLD, ART_WELL, MAP_GLOW, MAP_EDGE_LOCKED, MAP_LOCKED, MAP_DOT, MAP_ACTIVE, MAP_DONE, MAP_SHADOW, DIALOGUE_SCRIM } from "./theme.js";
+ import { DARK, PANEL, PANEL2, ACCENT, GOLD, TEXT, DIM, VDIM, MONO, ERR, PALETTES, ThemeScope, useTheme, loadTheme, saveTheme, ART_ACCENT, ART_GOLD, ART_WELL, CODE_BG, CODE_ACCENT, CODE_EXAMPLE, MAP_GLOW, MAP_EDGE_LOCKED, MAP_LOCKED, MAP_DOT, MAP_ACTIVE, MAP_DONE, MAP_SHADOW, DIALOGUE_SCRIM } from "./theme.js";

@ 2475 insert after: function Codex({profile,onBack}){
+   const {DARK,PANEL,PANEL2,TEXT,DIM,VDIM,ACCENT,LINE_FAINT,LINE,ink}=useTheme();

@ 2506
- unlocked?"#ffffff11":"#ffffff05"}
+ unlocked?LINE:LINE_FAINT}

@ 2509
- color:unlocked?ch.color:DIM
+ color:unlocked?ink(ch.color):DIM

@ 2524
- style={{color:active.color}}
+ style={{color:ink(active.color)}}

@ 2531
- :"#ffffff0a"}`
+ :LINE}`

@ 2534
- color:isOpen?active.color:TEXT
+ color:isOpen?ink(active.color):TEXT

@ 2535
- background:"#ffffff08",color:DIM
+ background:LINE_FAINT,color:DIM

@ 2538
- borderColor:"#ffffff08"
+ borderColor:LINE_FAINT

@ 2542
- background:DARK,color:ACCENT,
+ background:CODE_BG,color:CODE_ACCENT,

@ 2546
- background:DARK,color:"#a8d8a8",
+ background:CODE_BG,color:CODE_EXAMPLE,

@ 2562 insert after: function GrindingZone({profile,onBack}){
+   const {DARK,PANEL,PANEL2,TEXT,DIM,ACCENT,ERR,ORANGE,LINE_FAINT,LINE}=useTheme();

@ 2614
- color:"#e67e22"}}>⚔️ Practice Arena
+ color:ORANGE}}>⚔️ Practice Arena

@ 2619
- border:`1px solid #e67e2233`
+ border:`1px solid ${ORANGE}33`

@ 2621
- color="#e67e22"
+ color={ORANGE}

@ 2629
- border:"1px solid #ffffff0a"
+ border:`1px solid ${LINE}`

@ 2630
- borderColor="#e67e2266"
+ borderColor=`${ORANGE}66`

@ 2631
- borderColor="#ffffff0a"
+ borderColor=LINE

@ 2642
- borderColor:"#ffffff11"
+ borderColor:LINE

@ 2646
- color:"#e67e22"}}>{challenge.name}
+ color:ORANGE}}>{challenge.name}

@ 2647
- background:"#e67e2218",color:"#e67e22"
+ background:`${ORANGE}18`,color:ORANGE

@ 2648
- background:"#ffffff08",color:DIM
+ background:LINE_FAINT,color:DIM

@ 2651
- color="#e67e22"
+ color={ORANGE}

@ 2655
- borderColor:"#ffffff11"
+ borderColor:LINE

@ 2656
- style={{background:`#e67e2210`,border:`1px solid #e67e2233`}}
+ style={{background:`${ORANGE}10`,border:`1px solid ${ORANGE}33`}}

@ 2657
- color:"#e67e22"
+ color:ORANGE
```

**Step 4: Run the scan to see it pass**

Run: `node --test tests/no-raw-colours.test.js`
Expected: PASS, `ℹ tests 3`, `ℹ pass 3`.

**Step 5: Run the whole suite and build**

Run: `npm test`
Expected: `ℹ pass 2865` and `ℹ fail 0`.

Run: `npm run build`
Expected: it builds. The only warnings are the ones main already has: pyodide's `node:` modules being externalized for the browser, and a chunk over 500 kB.

**Step 6: Look at it in both modes**

With `npm run dev`, check the Codex (locked and unlocked chapters, an open concept with its dark SYNTAX and EXAMPLE blocks) and the Practice Arena, in dark and then in light. Dark mode should look as it did before, apart from the changes listed above; light mode should be readable everywhere. The console shows no errors.

**Step 7: Commit**

```bash
git add src/App.jsx tests/no-raw-colours.test.js
git commit -m "Theme the Codex and the Practice Arena" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: `git show --stat HEAD` ends with `2 files changed, 26 insertions(+), 25 deletions(-)`.

### Task 10: Convert group 5: the challenge room, the pop-ups and the code panel

**Files:**
- Modify: `src/App.jsx:4` and `:2685-2867` (ChallengeRoom, Victory, BadgeUnlock, TrophyUnlock)
- Modify: `src/python/CodePanel.jsx:4` and `:29-63` (CodeEditor, OutputPanel)
- Modify: `src/theme.js` (new fixed colours)
- Modify: `tests/theme.test.js:6`, `:41` (`CODE_GOLD`)
- Modify: `tests/no-raw-colours.test.js` (`STILL_TO_CONVERT`)

What the edits do:
- The room-cleared overlay becomes its own component, `Victory`, right after ChallengeRoom, rendered as `<ThemeScope name="dark"><Victory …/></ThemeScope>`. A ThemeScope alone would not do, because the overlay's colours were ChallengeRoom's own (light) hook values. Its CONTINUE handler moves out of the JSX into ChallengeRoom as `finish`, unchanged. Victory's hook line is part of the edit that opens it: don't add it again.
- A boss room keeps its purple glow (`BOSS_PURPLE`) in dark mode. In light mode the centre is a faint `${GOLD}11`, since a dark purple blot would sit under dark text.
- The hint text becomes solid GOLD: `${GOLD}cc` is 3.79:1 in light.
- The Concept Guide stays a dark code panel: `CODE_BG`, with `CODE_GOLD` for its heading, name and border and `CODE_TEXT` for its lines. In dark mode its lines shift from #ccd6f6 to the editor's #e6e6e6.
- BadgeUnlock and TrophyUnlock already sit in App's `<ThemeScope name="dark">` (Task 4), so their hooks read the dark palette.
- CodePanel.jsx: CodeEditor and the output `<pre>` use only `CODE_*`, plus `colorScheme:"dark"` so their scrollbars stay dark; CodeEditor needs no hook. The gutter's line numbers use `CODE_DIM`. OutputPanel's status lines, error box, feedback and notes sit on the page and switch.
- The theme.js import drops `PANEL`, `PANEL2`, `GOLD`, `TEXT` and `VDIM`, which nothing reads any more. `DARK`, `ACCENT`, `DIM` and `ERR` stay for ErrorBoundary.
- The code-panel contrast test gains `CODE_GOLD` (14.04:1 on `CODE_BG`).

**Step 1: Make the code-panel test cover `CODE_GOLD`**

In `tests/theme.test.js`:

```text
@ 6
- import { PALETTES, LIGHT_INK, inkFor, loadTheme, saveTheme, THEME_KEY, CODE_BG, CODE_TEXT, CODE_ACCENT, CODE_EXAMPLE } from "../src/theme.js";
+ import { PALETTES, LIGHT_INK, inkFor, loadTheme, saveTheme, THEME_KEY, CODE_BG, CODE_TEXT, CODE_ACCENT, CODE_EXAMPLE, CODE_GOLD } from "../src/theme.js";

@ 41
-   for (const c of [CODE_TEXT, CODE_ACCENT, CODE_EXAMPLE]) assert.ok
+   for (const c of [CODE_TEXT, CODE_ACCENT, CODE_EXAMPLE, CODE_GOLD]) assert.ok
```

**Step 2: Run it to see it fail**

Run: `node --test tests/theme.test.js`
Expected: FAIL with `SyntaxError: The requested module '../src/theme.js' does not provide an export named 'CODE_GOLD'`.

**Step 3: Take the group off `STILL_TO_CONVERT`**

In `tests/no-raw-colours.test.js`, the list now holds only this line:

```js
  "ChallengeRoom", "BadgeUnlock", "TrophyUnlock", "CodeEditor", "OutputPanel",
```

Replace the whole `const STILL_TO_CONVERT = new Set([ … ]);` statement with:

```js
const STILL_TO_CONVERT = new Set();
```

**Step 4: Run the scan to see it fail**

Run: `node --test tests/no-raw-colours.test.js`
Expected: FAIL, 2 of 3. The colour test lists App.jsx lines 2743, 2745, 2758, 2809, 2812, 2825, 2827 (ChallengeRoom), 2847, 2849 (BadgeUnlock) and 2860, 2862, 2864, 2865, 2867 (TrophyUnlock); python/CodePanel.jsx lines 29, 38 (CodeEditor) and 54, 63 (OutputPanel). The hook test lists `App.jsx: ChallengeRoom`, `App.jsx: BadgeUnlock`, `App.jsx: TrophyUnlock`, `python/CodePanel.jsx: CodeEditor` and `python/CodePanel.jsx: OutputPanel`.

**Step 5: Add the fixed colours to `src/theme.js`**

Insert after line 25 (`export const CODE_BG = "#0a0a14", CODE_TEXT = "#e6e6e6", CO…`):

```js
export const CODE_GOLD = "#ffd700", CODE_DIM = "#7a8699", CODE_LINE = "#ffffff11";
```

Then insert after line 32 (`export const DIALOGUE_SCRIM = "#000000bf";`):

```js
// The celebration pop-ups (room cleared, badge, trophy) stay dark in both modes: their scrims and gradient ends.
// BOSS_PURPLE is also the glow of a boss room in dark mode.
export const POP_SCRIM = "rgba(0,0,0,0.85)", POP_SCRIM_DEEP = "rgba(0,0,0,0.9)";
export const BOSS_PURPLE = "#1a0d2a", POP_CLEAR = "#0a1a14", POP_TROPHY = "#2a1a0a", POP_TROPHY_END = "#1a0d0a";
```

**Step 6: Run the theme test to see it pass**

Run: `node --test tests/theme.test.js`
Expected: PASS, `ℹ tests 9`, `ℹ pass 9`.

**Step 7: Apply the edit table to `src/App.jsx`**

It includes the hook lines (each the first line of its component's body) and the theme.js import on line 4.

```text
@ 4
- import { DARK, PANEL, PANEL2, ACCENT, GOLD, TEXT, DIM, VDIM, MONO, ERR, PALETTES, ThemeScope, useTheme, loadTheme, saveTheme, ART_ACCENT, ART_GOLD, ART_WELL, CODE_BG, CODE_ACCENT, CODE_EXAMPLE, MAP_GLOW, MAP_EDGE_LOCKED, MAP_LOCKED, MAP_DOT, MAP_ACTIVE, MAP_DONE, MAP_SHADOW, DIALOGUE_SCRIM } from "./theme.js";
+ import { DARK, ACCENT, DIM, MONO, ERR, PALETTES, ThemeScope, useTheme, loadTheme, saveTheme, ART_ACCENT, ART_GOLD, ART_WELL, CODE_BG, CODE_TEXT, CODE_ACCENT, CODE_EXAMPLE, CODE_GOLD, MAP_GLOW, MAP_EDGE_LOCKED, MAP_LOCKED, MAP_DOT, MAP_ACTIVE, MAP_DONE, MAP_SHADOW, DIALOGUE_SCRIM, BOSS_PURPLE, POP_SCRIM, POP_SCRIM_DEEP, POP_CLEAR, POP_TROPHY, POP_TROPHY_END } from "./theme.js";

@ 2685 insert after: function ChallengeRoom({challenge,isBoss,replaying,onComplete,onBack,…
+   const {DARK,PANEL,PANEL2,TEXT,DIM,VDIM,ACCENT,GOLD,ERR,OK,LINE,theme}=useTheme();

@ 2736
-   const earnedXp=replaying?0:Math.round(challenge.xpReward*xpMultiplier);
+   const earnedXp=replaying?0:Math.round(challenge.xpReward*xpMultiplier);
+   // CONTINUE on the victory screen. Once only: the overlay closes so a second Enter/Space can't award XP again
+   const finish=()=>{if(completedRef.current)return;completedRef.current=true;setShowVictory(false);
+     try{isBoss?SFX.bossDefeat():SFX.roomClear()}catch(e){};onComplete(earnedXp,!usedHints,{markedDone})};

@ 2743
-   return <div className="min-h-screen flex flex-col" style={{background:isBoss?`radial-gradient(ellipse at center,#1a0d2a 0%,${DARK} 70%)`:`radial-gradient(ellipse at center,${PANEL} 0%,${DARK} 70%)`}}>
+   // A boss room glows purple in dark mode; in light mode the purple would be a dark blot, so it glows faintly gold.
+   return <div className="min-h-screen flex flex-col" style={{background:isBoss?`radial-gradient(ellipse at center,${theme==="light"?`${GOLD}11`:BOSS_PURPLE} 0%,${DARK} 70%)`:`radial-gradient(ellipse at center,${PANEL} 0%,${DARK} 70%)`}}>

@ 2745
- style={{borderColor:"#ffffff11"}}
+ style={{borderColor:LINE}}

@ 2758
- style={{borderColor:"#ffffff11"}}
+ style={{borderColor:LINE}}

@ 2772
- color:`${GOLD}cc`
+ color:GOLD

@ 2786
-         {/* Concept guide */}
+         {/* Concept guide: a dark code panel in both modes, like the editor (CODE_* never switch) */}

@ 2788
- style={{background:DARK,border:`1px solid ${GOLD}33`}}
+ style={{background:CODE_BG,border:`1px solid ${CODE_GOLD}33`}}

@ 2789
- style={{background:`${GOLD}11`,color:GOLD}}
+ style={{background:`${CODE_GOLD}11`,color:CODE_GOLD}}

@ 2793
- style={{color:GOLD}}
+ style={{color:CODE_GOLD}}

@ 2794
- style={{color:TEXT,fontFamily:MONO,lineHeight:"1.5"}}
+ style={{color:CODE_TEXT,fontFamily:MONO,lineHeight:"1.5"}}

@ 2809
- passed?"#00bfa5":ACCENT
+ passed?OK:ACCENT

@ 2812
- style={{borderColor:"#ffffff11",minHeight:"100px"}}
+ style={{borderColor:LINE,minHeight:"100px"}}

@ 2824
-     {/* Victory */}
+     {/* Victory: stays dark in both modes, like the other celebration pop-ups */}
+     {showVictory&&<ThemeScope name="dark"><Victory isBoss={isBoss} replaying={replaying} markedDone={markedDone} usedHints={usedHints} earnedXp={earnedXp} onContinue={finish}/></ThemeScope>}
+   </div>;
+ }
+
+ // Room cleared. ChallengeRoom shows it inside ThemeScope name="dark", so it keeps the dark palette in light mode.
+ function Victory({isBoss,replaying,markedDone,usedHints,earnedXp,onContinue}){
+   const {PANEL,GOLD,ACCENT,DIM}=useTheme();

@ 2825
-     {showVictory&&<div className="fixed inset-0 flex items-center justify-center z-50" style={{background:"rgba(0,0,0,0.85)"}}>
+   return <div className="fixed inset-0 flex items-center justify-center z-50" style={{background:POP_SCRIM}}>

@ 2826
-       <Particles active={showVictory} type={isBoss?"boss":"victory"} count={isBoss?36:24}/>
+     <Particles active={true} type={isBoss?"boss":"victory"} count={isBoss?36:24}/>

@ 2827
-       <div className="text-center p-8 rounded-xl max-w-sm mx-4" style={{background:isBoss?"linear-gradient(135deg,#1a0d2a,#0d1b2a)":`linear-gradient(135deg,${PANEL},#0a1a14)`,border:`2px solid ${isBoss?GOLD:ACCENT}`,boxShadow:`0 0 40px ${isBoss?`${GOLD}33`:`${ACCENT}33`}`,animation:"cq-scale-in 0.4s ease-out"}}>
+     <div className="text-center p-8 rounded-xl max-w-sm mx-4" style={{background:isBoss?`linear-gradient(135deg,${BOSS_PURPLE},${PANEL})`:`linear-gradient(135deg,${PANEL},${POP_CLEAR})`,border:`2px solid ${isBoss?GOLD:ACCENT}`,boxShadow:`0 0 40px ${isBoss?`${GOLD}33`:`${ACCENT}33`}`,animation:"cq-scale-in 0.4s ease-out"}}>

@ 2828
-         <div className="text-5xl mb-3">{isBoss?"👑":"⭐"}</div>
+       <div className="text-5xl mb-3">{isBoss?"👑":"⭐"}</div>

@ 2829
-         <h3 className="text-xl font-bold mb-2" style={{color:isBoss?GOLD:ACCENT}}>{isBoss?"BOSS DEFEATED!":"ROOM CLEARED!"}</h3>
+       <h3 className="text-xl font-bold mb-2" style={{color:isBoss?GOLD:ACCENT}}>{isBoss?"BOSS DEFEATED!":"ROOM CLEARED!"}</h3>

@ 2830
-         {replaying
+       {replaying

@ 2831
-           ?<div className="text-sm mb-3" style={{color:DIM}}>Practice replay — no XP this time</div>
+         ?<div className="text-sm mb-3" style={{color:DIM}}>Practice replay — no XP this time</div>

@ 2832
-           :markedDone?<div className="text-lg font-bold font-mono mb-3" style={{color:ACCENT}}>Marked done — half XP</div>
+         :markedDone?<div className="text-lg font-bold font-mono mb-3" style={{color:ACCENT}}>Marked done — half XP</div>

@ 2833
-           :<div className="text-3xl font-bold font-mono mb-1" style={{color:ACCENT,animation:"cq-pulse 1.5s ease-in-out infinite"}}>+{earnedXp} XP</div>}
+         :<div className="text-3xl font-bold font-mono mb-1" style={{color:ACCENT,animation:"cq-pulse 1.5s ease-in-out infinite"}}>+{earnedXp} XP</div>}

@ 2834
-         {!usedHints&&!markedDone&&<div className="text-xs mb-3" style={{color:GOLD}}>🙈 No hints used!</div>}
+       {!usedHints&&!markedDone&&<div className="text-xs mb-3" style={{color:GOLD}}>🙈 No hints used!</div>}

@ 2835
-         <Btn onClick={()=>{
+       <Btn onClick={onContinue} color={isBoss?GOLD:ACCENT}

@ 2836 delete the line
-           // Once only: the overlay closes so a second Enter/Space can't award XP again

@ 2837 delete the line
-           if(completedRef.current)return;completedRef.current=true;setShowVictory(false);

@ 2838 delete the line
-           try{isBoss?SFX.bossDefeat():SFX.roomClear()}catch(e){};onComplete(earnedXp,!usedHints,{markedDone})}} color={isBoss?GOLD:ACCENT}

@ 2839
-           autoFocus={markedDone}>CONTINUE →</Btn>
+         autoFocus={markedDone}>CONTINUE →</Btn>

@ 2840
-       </div>
+     </div>

@ 2841 delete the line
-     </div>}

@ 2845 insert after: function BadgeUnlock({badge,onContinue}){
+   const {PANEL,GOLD}=useTheme();

@ 2847
- style={{background:"rgba(0,0,0,0.9)"}}
+ style={{background:POP_SCRIM_DEEP}}

@ 2849
- background:"linear-gradient(135deg,#1a0d2a,#0d1b2a)"
+ background:`linear-gradient(135deg,${BOSS_PURPLE},${PANEL})`

@ 2858 insert after: function TrophyUnlock({trophy,onContinue}){
+   const {DIM,ORANGE}=useTheme();

@ 2860
- style={{background:"rgba(0,0,0,0.9)"}}
+ style={{background:POP_SCRIM_DEEP}}

@ 2862
- background:"linear-gradient(135deg,#2a1a0a,#1a0d0a)",border:"2px solid #e67e22",boxShadow:"0 0 40px #e67e2233"
+ background:`linear-gradient(135deg,${POP_TROPHY},${POP_TROPHY_END})`,border:`2px solid ${ORANGE}`,boxShadow:`0 0 40px ${ORANGE}33`

@ 2864
- style={{color:"#e67e22"}}
+ style={{color:ORANGE}}

@ 2865
- style={{color:"#e67e22",fontFamily:MONO}}
+ style={{color:ORANGE,fontFamily:MONO}}

@ 2867
- color="#e67e22"
+ color={ORANGE}
```

**Step 8: Apply the edit table to `src/python/CodePanel.jsx`**

```text
@ 4
- import { DARK, ACCENT, GOLD, TEXT, DIM, VDIM, ERR, MONO } from "../theme.js";
+ import { useTheme, CODE_BG, CODE_TEXT, CODE_ACCENT, CODE_DIM, CODE_LINE, MONO } from "../theme.js";

@ 29
-   return <div className="flex-1 flex rounded-lg overflow-hidden" style={{ background: DARK, border: "1px solid #ffffff11", minHeight }}>
+   // The editor stays dark in both modes, like a terminal (CODE_* never switch); colorScheme keeps its scrollbars dark too.
+   return <div className="flex-1 flex rounded-lg overflow-hidden" style={{ background: CODE_BG, border: `1px solid ${CODE_LINE}`, minHeight, colorScheme: "dark" }}>

@ 31
- color: `${VDIM}88`
+ color: `${CODE_DIM}88`

@ 38
- background: DARK, color: "#e6e6e6"
+ background: CODE_BG, color: CODE_TEXT

@ 38
- caretColor: ACCENT
+ caretColor: CODE_ACCENT

@ 45 insert after: export function OutputPanel({ status, parts, waitingForInput, onAnswe…
+   const { ACCENT, GOLD, TEXT, DIM, ERR } = useTheme();

@ 53
-     {(printed || waitingForInput) && <pre className="p-3 rounded text-sm whitespace-pre-wrap mb-2"
+     {/* The printed output stays dark in both modes, like the editor, so the echoed answer and the input box use CODE_ACCENT */}
+     {(printed || waitingForInput) && <pre className="p-3 rounded text-sm whitespace-pre-wrap mb-2"

@ 54
- background: DARK, color: "#e6e6e6", border: "1px solid #ffffff11", fontFamily: MONO, maxHeight: 260, overflow: "auto"
+ background: CODE_BG, color: CODE_TEXT, border: `1px solid ${CODE_LINE}`, fontFamily: MONO, maxHeight: 260, overflow: "auto", colorScheme: "dark"

@ 55
- p.kind === "input" ? ACCENT : undefined
+ p.kind === "input" ? CODE_ACCENT : undefined

@ 59
- style={{ color: ACCENT, fontFamily: MONO, borderBottom: `1px solid ${ACCENT}66`, minWidth: "8ch" }}
+ style={{ color: CODE_ACCENT, fontFamily: MONO, borderBottom: `1px solid ${CODE_ACCENT}66`, minWidth: "8ch" }}

@ 63
- style={{ background: "#ff6b6b11", color: ERR, border: "1px solid #ff6b6b33" }}
+ style={{ background: `${ERR}11`, color: ERR, border: `1px solid ${ERR}33` }}
```

**Step 9: Run the scan to see it pass**

Run: `node --test tests/no-raw-colours.test.js`
Expected: PASS, `ℹ tests 3`, `ℹ pass 3`.

**Step 10: Run the whole suite and build**

Run: `npm test`
Expected: `ℹ pass 2865` and `ℹ fail 0`.

Run: `npm run build`
Expected: it builds. The only warnings are the ones main already has: pyodide's `node:` modules being externalized for the browser, and a chunk over 500 kB.

**Step 11: Look at it in both modes**

With `npm run dev`, check a normal room and a boss room, a hint, the Concept Guide, output with an error and with `input()`, and the room-cleared pop-up, in dark and then in light. Dark mode should look as it did before, apart from the changes listed above; light mode should be readable everywhere. The console shows no errors.

**Step 12: Commit**

```bash
git add src/App.jsx src/python/CodePanel.jsx src/theme.js tests/theme.test.js tests/no-raw-colours.test.js
git commit -m "Theme the challenge room and the output panel; keep the pop-ups and code panels dark" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: `git show --stat HEAD` ends with `5 files changed, 66 insertions(+), 50 deletions(-)`.

### Task 11: Docs

**Files:**
- Modify: `README.md:17` (feature list), `:140` (music section; 141 after Step 1)
- Modify: `docs/plans/2026-09-26-theme-toggle-design.md:70`, `:75`, and a short section before `## 4. Testing`

**Step 1: Add the README feature bullet**

In `README.md`, after line 17 (`- **Background Music** — 11 tracks with per-screen context switching`), add:

```markdown
- **Light and dark mode** — the ☀️/🌙 button beside 🎵 switches the screens to a cool grey-blue light look and back; the pixel art, the world map and the code editor stay dark. Both buttons are remembered on the device
```

**Step 2: Update the music section**

Replace the line `Players can mute/unmute music with the 🎵 button in the bottom-right corner.` (line 140 before Step 1, 141 after it) with:

```markdown
Players can mute/unmute music with the 🎵 button in the bottom-right corner, and the device remembers the choice.
```

**Step 3: Correct light ERR in the design doc**

In `docs/plans/2026-09-26-theme-toggle-design.md`:
- line 70: `| ERR | #ff6b6b | #b71c1c |` becomes `| ERR | #ff6b6b | #b01a1a |`;
- line 75: `ERR 5.6–6.6` becomes `ERR 5.9–7.0`, and add this sentence at the end of that paragraph: `Light ERR was first #b71c1c, which scores 4.47:1 on its own 22 tint over DARK, under the 4.5 the test asks for, so it became #b01a1a (4.75:1 there).`

**Step 4: Record what changed during planning**

In the same file, add this section just before `## 4. Testing`:

```markdown
## Changes made while planning (2026-09-26)

- Light ERR is #b01a1a (see section 2).
- More fixed colours sit next to ART and CODE in `theme.js`: `CODE_GOLD`, `CODE_DIM` and `CODE_LINE` (the Concept Guide, the editor's line numbers, the code panels' borders); the `MAP_` colours and `MAP_GLOW` (the map's nodes, dots, label shadows and in-progress glow); `DIALOGUE_SCRIM`; and the pop-ups' `POP_` colours and `BOSS_PURPLE`.
- App provides the theme, so it reads its own colours from `PALETTES[theme]` rather than calling `useTheme()`. CodeEditor uses only `CODE_` colours and needs no hook.
- The room-cleared overlay became its own component, `Victory`, so it can sit inside `ThemeScope name="dark"`.
- The NPCS table moved from `App.jsx` to `content.js`, so the tests can import it.
- In light mode a boss room glows faintly gold instead of purple.
```

**Step 5: Check nothing else moved**

Run: `npm test`
Expected: `ℹ pass 2865` and `ℹ fail 0`.

**Step 6: Commit**

```bash
git add README.md docs/plans/2026-09-26-theme-toggle-design.md
git commit -m "Document light mode, and the light ERR change" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: `git show --stat HEAD` ends with `2 files changed, 13 insertions(+), 3 deletions(-)`.

### Task 12: Browser check in both modes

**Files:** none, unless a check fails.

**Step 1: Start the app**

Run: `npm run dev` and open the URL it prints. Open DevTools with the console visible, and run `localStorage.removeItem("cq:theme"); localStorage.removeItem("cq:music-muted")` so the first visit starts dark with music on. (Don't clear all of `localStorage`: the heroes are saved there too.)

**Step 2: Walk the screens, first in dark and then in light**

For each item, check it in dark mode, switch with ☀️, check it again in light mode, and switch back with 🌙. Dark mode should look as it did on main, apart from the small changes listed in Tasks 6-10 (for example VDIM lifted, the solid gold hint text and the avatar tiles). Light mode should be readable everywhere.

1. Title screen, hero list, hero creation (the pale shirt and skin swatches have a ring in light mode, and the name box has a visible border), session setup.
2. World map: the map stays a night scene in both modes (nodes, paths, labels, room dots, the teal glow on the chapter in progress), while the top bar above it switches.
3. Chapter page: locked, open and done rooms, the side quests in orange, and the boss card (a faint gold tint once defeated).
4. A normal room and a boss room (light mode: a faint gold glow, not purple).
5. NPC dialogue (a light box on a black scrim, the NPC's name in its darker ink), a hint (solid gold text), the Concept Guide (a dark panel with gold headings), and output with an error (a readable red box) and with `input()` (the answer box inside the dark output).
6. The pop-ups stay dark in light mode: room cleared, boss defeated, a new ability (BadgeUnlock) and a trophy (TrophyUnlock).
7. The Codex (locked and unlocked chapters, the dark SYNTAX and EXAMPLE blocks), the Practice Arena (orange accents) and the Character Sheet (the avatar on its dark tile, the trophies).

**Step 3: Check the behaviours**

- Toggling mid-room keeps the typed code, and the room doesn't reset.
- In light mode, reload: the page is light from the first frame, with no dark flash (repeat with the CPU throttled 6x in the Performance panel), and both buttons keep their state (🌙, and 🔇 if muted).
- Overscrolling (a trackpad rubber-band, or an iPad) shows a light page edge in light mode.
- At phone width (the DevTools device toolbar, 375px) the layout works and the corner buttons don't cover Run or Stop.
- Tab reaches ☀️/🌙 and 🎵, the focus ring is visible in both modes, and Enter or Space toggles them.
- The console shows no errors or React warnings.

**Step 4: Fix what fails**

For each failure, use superpowers:systematic-debugging, add a test first where a test can catch it (the scan and theme tests cover most colour mistakes), fix it, and commit it on its own with the Co-Authored-By line. If everything passes, there is nothing to commit.

### Task 13: Final review, then ask Scott

**Files:** none.

**Step 1: Check the branch**

Run: `npm test`, then `npm run build`, then `git log --oneline 7b6b3af..HEAD`.
Expected: `ℹ pass 2865` and `ℹ fail 0`; the build succeeds with only the pre-existing warnings; 12 commits (Tasks 1-11 and the fix after Task 2), plus any fixes from Task 12. `git status` is clean.

**Step 2: Whole-branch review**

Use superpowers:requesting-code-review on `7b6b3af..HEAD`, against the design doc and this plan. Handle the findings with superpowers:receiving-code-review, re-run Step 1 after any fix, and commit each fix with the Co-Authored-By line.

**Step 3: Ask Scott before pushing**

Stop and ask, with the facts: the commit count, 2,865 of 2,865 tests passing, the build result, and what the browser check covered. Pushing makes Vercel build a preview; the public site at codequest-pi.vercel.app is unchanged until the merge. Only after a clear yes, run `git push -u origin theme-toggle`.

**Step 4: Ask Scott before opening the PR**

Ask separately. Only after a clear yes, open it with superpowers:finishing-a-development-branch or:

```bash
gh pr create --base main --head theme-toggle --title "Add a dark/light mode toggle" --body "$(cat <<'EOF'
## Summary
- A ☀️/🌙 button beside 🎵 switches the screens between dark and a cool grey-blue light mode; the pixel art, the world map, the code editor and the pop-ups stay dark.
- Both the theme and the music mute are remembered on the device, and an inline script applies the saved theme before the first paint.
- `tests/theme.test.js` checks both palettes' contrast; `tests/no-raw-colours.test.js` keeps hand-written colours out of the screens.

## Test plan
- [x] `npm test`: 2,865 of 2,865 pass
- [x] `npm run build`
- [x] Browser check in both modes (Task 12 of the plan)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
