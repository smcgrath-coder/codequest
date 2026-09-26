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
// celebration pop-ups, the map and the art tiles dark in light mode.
export const ThemeScope = ({ name, children }) => createElement(ThemeContext.Provider, { value: name === "light" ? "light" : "dark" }, children);
