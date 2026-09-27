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
export const CODE_GOLD = "#ffd700", CODE_DIM = "#7a8699", CODE_LINE = "#ffffff11";
// The world map stays a night scene in light mode: its locked nodes, room dots, node fills, label shadows and the
// glow of the chapter in progress.
export const MAP_EDGE_LOCKED = "#333333", MAP_LOCKED = "#555555", MAP_DOT = "#444444";
export const MAP_ACTIVE = "#1a2a1a", MAP_DONE = "#0d2818", MAP_SHADOW = "#000000", MAP_GLOW = "#64ffda";
// The dim layer behind an NPC's dialogue box, the same in both modes.
export const DIALOGUE_SCRIM = "#000000bf";
// The celebration pop-ups (room cleared, badge, trophy) stay dark in both modes: their scrims and gradient ends.
// BOSS_PURPLE is also the glow of a boss room in dark mode.
export const POP_SCRIM = "rgba(0,0,0,0.85)", POP_SCRIM_DEEP = "rgba(0,0,0,0.9)";
export const BOSS_PURPLE = "#1a0d2a", POP_CLEAR = "#0a1a14", POP_TROPHY = "#2a1a0a", POP_TROPHY_END = "#1a0d0a";
// The glow at the centre of a boss room: purple in dark mode, and in light mode a pale amber, lighter than the
// page, so it warms the room without dimming any text over it. (A gold tint of the page, the first try, took
// VDIM, the BOSS pill and ACCENT's tints under 4.5:1.)
export const bossGlow = theme => theme === "light" ? "#fff2cc" : BOSS_PURPLE;
export const MONO = "'Courier New', monospace";

// Darker versions of the NPC and chapter colours, for names and headings drawn as text in light mode. Dark
// enough to stay readable on their own colour's 11 tint laid straight on the page (the Codex header), not just
// on plain surfaces.
export const LIGHT_INK = {
  "#64ffda": PALETTES.light.ACCENT, "#ffd700": PALETTES.light.GOLD,
  "#9b59b6": "#8e44ad", "#2ecc71": "#1a7541", "#3498db": "#1c6a9e", "#1abc9c": "#10735f",
  "#e74c3c": "#b0301f", "#f39c12": "#905c07", "#e91e63": "#bf185a", "#ff5722": "#be2f00",
  "#ff9800": "#945800", "#00e676": "#00783e",
};
export const inkFor = (theme, c) => (theme === "light" && LIGHT_INK[String(c).toLowerCase()]) || c;

// The dark palette under the old names, for code that doesn't read the theme (content.js, tests, the
// crash screen).
export const { DARK, PANEL, PANEL2, TEXT, DIM, VDIM, ACCENT, GOLD, ERR, ORANGE, OK, LINE_FAINT, LINE, LINE_STRONG } = PALETTES.dark;

// The player's choice on this device. Anything but "light" (nothing saved, or storage blocked) is dark.
// localStorage is looked up inside the try, not as a default parameter: blocked storage throws on the lookup itself.
export const THEME_KEY = "cq:theme";
export function loadTheme(storage) {
  try { return (storage ?? globalThis.localStorage)?.getItem(THEME_KEY) === "light" ? "light" : "dark"; } catch { return "dark"; }
}
export function saveTheme(theme, storage) {
  try { (storage ?? globalThis.localStorage)?.setItem(THEME_KEY, theme === "light" ? "light" : "dark"); } catch {}
}

const ThemeContext = createContext("dark");
// The current palette, plus `theme` ("dark" or "light") and `ink(c)` for NPC and chapter colours drawn as text.
export function useTheme() {
  const theme = useContext(ThemeContext);
  return { ...PALETTES[theme], theme, ink: c => inkFor(theme, c) };
}
// Gives its children a palette: App provides the player's choice, and ThemeScope name="dark" keeps the
// celebration pop-ups (room cleared, badge, trophy) dark in light mode. Nothing else sits in one: the map reads
// PALETTES.dark and the MAP_ colours itself, and the avatar tiles use ART_WELL, so useTheme() there gives the
// player's theme.
export const ThemeScope = ({ name, children }) => createElement(ThemeContext.Provider, { value: name === "light" ? "light" : "dark" }, children);
