# Design: dark/light mode toggle

Date: 2026-09-26. Status: approved.

## Goal

CodeQuest is dark everywhere. Add a light mode that the player can switch on with a round button next to the music button, and remember both buttons' settings on the device.

## Decisions (Scott, 2026-09-26)

| Topic | Decision |
|---|---|
| Scope | The screens turn light; the pixel art stays as it is, framed like pictures |
| Code editor and OUTPUT | Stay dark, like a terminal, in both modes |
| First visit | Dark, as today; a saved choice wins |
| Light look | Cool grey-blue |
| Remember | Both the theme and the music mute, per device |
| Approach | A React theme context with a dark and a light palette |
| Dark-mode fix | Lift VDIM so it passes contrast in dark mode too |

## Where colour lives today (inventory, main at 9f10ece)

- **Theme tokens.** `src/theme.js` has 9 colour tokens, as plain constants, used about 245 times in UI code. 58 of those uses glue a hex alpha onto the token (`${GOLD}33`). There are also 21 dynamic ones (`${n.color}44`) and 8 hover handlers that write `element.style`.
- **Hard-coded colours.** `src/App.jsx` has about 1,065 hex literals.
  - About 971 are art: NPCAvatar, SceneBanner, MapBackground, PixelAvatar, the COLORS palette and the Particles palettes.
  - About 94 are UI: orange `#e67e22…` 29, white-alpha hairlines 23, dark gradient stops 12, NPC colours 10, greys 8, `#00bfa5` 4, and hand-copied ERR/ACCENT values 7.
  - There are 8 `rgba()` literals.
- **Art that uses theme tokens (19 places).** ACCENT at App.jsx 433, 456, 474, 475, 481-483, 498-500, 1394, 2190, 2197, 2198, 2219, 2220; GOLD at 647, 648, 1636. If light mode darkened those tokens, characters would repaint.
- **Other files.**
  - `src/python/CodePanel.jsx` has 6 literals and 7 token-plus-alpha uses.
  - `src/content.js` has 11 chapter colours.
  - `src/index.css` sets the body to `#0d1117`.
- **No `React.memo`/`useMemo`.** An App state change re-renders the whole tree.
- **Music mute isn't saved.** It lives in `useState(false)` in App and `_muted` in `src/music.js`.

## 1. What changes and what stays

**Turns light:**
- every screen, card, button, pill, menu and the top bar;
- the task and hint boxes;
- the NPC dialogue box.

**Stays dark in both modes:**
- **Pixel-art characters.** Each sits on its own small dark tile (`ART_WELL`). Their backgrounds are transparent, and pale unoutlined parts (lab coat, crowns) and the semi-transparent leg shadows need a dark backing.
- **Scene banners** (SceneBanner), which paint their own night sky.
- **The world map frame** (MapBackground, nodes, paths, labels). The top bar above it switches.
- **The code editor and the OUTPUT `<pre>`**, plus the Codex `<pre>` examples and the Concept Guide panel.
- **The celebration pop-ups** (room cleared, BadgeUnlock, TrophyUnlock). Their gold-and-white sparkles need a dark backdrop.
- **The crash screen** (ErrorBoundary).

**Small fixes that come with this change:**
- The hint text is drawn at `${GOLD}cc`, which gives 3.79:1 in light. It becomes solid GOLD.
- Inputs whose only border is `${ACCENT}33` (for example the hero-name input) get a visible border in light mode.
- In dark mode, VDIM goes from `#4a5568` to `#7a8699`, lifting it from about 2.3:1 to about 4.6:1 on PANEL2.

## 2. Palettes

Every palette value is 6-digit hex, so glued alpha (`${TOKEN}33`) keeps working. The LINE tokens are the exception: they are 8-digit values that are always used whole, never with glued alpha.

| Token | Dark | Light |
|---|---|---|
| DARK (page edge, locked cards) | #0a0a14 | #e8edf4 |
| PANEL (gradient centre, HUD) | #0d1b2a | #f5f7fb |
| PANEL2 (cards) | #1a1a2e | #ffffff |
| TEXT | #ccd6f6 | #1b2436 |
| DIM | #8892b0 | #4a5570 |
| VDIM | #7a8699 (was #4a5568) | #5b6780 |
| ACCENT | #64ffda | #00695c |
| GOLD | #ffd700 | #7c5400 |
| ERR | #ff6b6b | #b71c1c |
| ORANGE (new, from `#e67e22`) | #e67e22 | #9a3d00 |
| OK (new, from `#00bfa5`) | #00bfa5 | #00664f |
| LINE_FAINT / LINE / LINE_STRONG (new) | #ffffff08 / #ffffff11 / #ffffff22 | #1b243614 / #1b24361f / #1b243633 |

The light text tokens score at least 4.5:1 on DARK, PANEL and PANEL2, and on their own tint (11, 18 or 22 alpha) over those surfaces. The synthesis computed TEXT 13.2–15.5, DIM 6.3–7.4, ACCENT 5.6–6.6, GOLD 5.7–6.7, ERR 5.6–6.6 and ORANGE 5.9–6.9.

**Fixed sets (never switch):**
- **ART:** `ART_ACCENT #64ffda`, `ART_GOLD #ffd700`, `ART_WELL #1a1a2e`.
- **CODE:** `CODE_BG #0a0a14`, `CODE_TEXT #e6e6e6`, `CODE_ACCENT #64ffda`, `CODE_EXAMPLE #a8d8a8`. Each scores at least 12:1 on CODE_BG.

**Light "ink" for NPC and chapter colours:** `ink(c)` returns `LIGHT_INK[c] ?? c` in light mode, and `c` in dark mode. It is used only where a name or heading is drawn as text.

| Dark | Light |
|---|---|
| #9b59b6 | #8e44ad |
| #2ecc71 | #1b7943 |
| #3498db | #1d6fa5 |
| #1abc9c | #107762 |
| #e74c3c | #b0301f |
| #f39c12 | #925d07 |
| #e91e63 | #c2185b |
| #ff5722 | #c43000 |
| #ff9800 | #995b00 |
| #00e676 | #00783e |
| #64ffda | light ACCENT |
| #ffd700 | light GOLD |

## 3. How it works

**`src/theme.js`**
- exports `PALETTES = { dark, light }`, the ART and CODE sets, `LIGHT_INK` and `ink(theme, c)`;
- exports `loadTheme()`/`saveTheme()` for `localStorage["cq:theme"]`, wrapped in try/catch; anything but `"light"` means dark;
- keeps the old named exports as the dark values, so tests and any unconverted import keep working.

**`ThemeContext` and `useTheme()`**
- App holds `theme` in state, starting from `document.documentElement.dataset.theme` (set by the inline script) or `loadTheme()`.
- App provides `{ ...PALETTES[theme], theme, ink }`.
- Each colour-using component adds one line at the top: `const { DARK, PANEL, …, ORANGE, OK, LINE } = useTheme();`. It uses the same names as the imports, so the existing references in its body are untouched.
- The components that need the line: Btn, XpBar, SessionTimer, NPCDialogue, TitleScreen, CharacterCreate, ProfileSelect, SessionSetup, WorldMap, ChapterOverview, CharacterSheet, Codex, GrindingZone, ChallengeRoom, BadgeUnlock, TrophyUnlock, App, and CodeEditor/OutputPanel.
- Btn's default parameter `color = ACCENT` is evaluated before the hook runs, so it moves after the hook as `color ??= ACCENT`.

**`ThemeScope name="dark"`** re-provides the dark palette. It wraps the celebration pop-ups, the map frame and the avatar tiles.

**Art pinning.** The 19 art token uses become `ART_ACCENT` or `ART_GOLD`. The art sections are fenced with `// art:begin` and `// art:end` comments.

**Hard-coded UI colours** become named tokens with their suffixes kept: `#e67e2233` → `${ORANGE}33`, `#ffffff11` → `LINE`, `#00bfa5` → `OK`, and the copied ERR/ACCENT values become the tokens.

**`index.html`**
- An inline script before the module script sets `<html data-theme>` from `cq:theme`, so there is no flash.
- `index.css` switches the body background and `color-scheme` on `html[data-theme=light]`.
- App keeps the attribute in sync when the theme changes.

**The toggle** goes in the existing `fixed bottom-4 right-4` container, beside 🎵, in the same round style:
- ☀️ in dark mode, 🌙 in light mode;
- `aria-label`/`title` of "Switch to light mode" or "Switch to dark mode";
- keyboard-focusable.

**Music mute is saved** as `localStorage["cq:music-muted"]`. `Music.setMuted(m)` sets `_muted`, pauses or resumes, and returns the new value. App starts `musicMuted` from storage and applies it once on load.

**Browser support.** Nothing needs a newer browser than the app already needs: no `color-mix()`, no container queries. So devices on the keyword fallback get light mode too.

## 4. Testing

**`tests/theme.test.js`** checks that:
- both palettes have the same keys;
- the values are 6-digit hex (LINE tokens excepted);
- each text token scores at least 4.5:1 on every surface, and on its own tints at 11, 18 and 22 over each surface, in both modes;
- the CODE pairs score at least 4.5:1 on CODE_BG;
- `LIGHT_INK` covers every CODEX colour, every NPC colour and every chapter colour, and each scores at least 4.5:1 on PANEL in light mode;
- `loadTheme()`/`saveTheme()` treat a missing, broken or unavailable storage as dark.

**`tests/no-raw-colours.test.js`** reads App.jsx and CodePanel.jsx as text, drops the art-fenced regions, and checks that:
- no hex literal or `rgba(` remains outside `theme.js`;
- no switchable token name appears inside an art region;
- each component that uses a token calls `useTheme()` (a simple per-function scan).

**The existing suite** stays green: 2,849 tests.

**Browser, in both modes:**
- title, heroes, create (the pale swatches), session, map (dark, while the HUD switches);
- chapter pages (locked, open and done), a normal room and a boss;
- NPC dialogue, hints, the Concept Guide, and output with an error and with `input()`;
- the pop-ups, the Codex, Practice and the Character Sheet.

Also check that:
- toggling mid-room keeps the code;
- a reload keeps both settings, with no dark flash;
- the layout works at phone width;
- the toggle can be focused from the keyboard;
- there are no console errors.

## 5. Rollout

- Work happens on branch `theme-toggle`, with each task built test-first and reviewed for spec and code quality, and a final whole-branch review.
- Ask Scott before pushing. Vercel then builds a preview, and the public site at codequest-pi.vercel.app is unchanged until merge.
- Ask before opening the PR.

## Risks

- **A component that misses its `useTheme()` line stays dark.** That is visible, not silent, and the source-scan test catches it.
- **Art borrowing a switchable token would repaint when toggled.** The art fences and the scan prevent it.
- **Light mode shows more of the page edge.** The inline script and body rule cover the background, including overscroll on iPads.
