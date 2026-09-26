// tests/blocked-storage.test.js
// Blocked storage: a browser that refuses storage throws from the `localStorage` lookup itself, and the
// saved-choice helpers run during App's first render, so they must answer instead of throwing.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTheme, saveTheme } from "../src/theme.js";
import { loadMusicMuted, saveMusicMuted } from "../src/music.js";

test("when reading localStorage itself throws, the saved choices fall back to dark and not muted", () => {
  const before = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new DOMException("Access is denied for this document.", "SecurityError"); } });
  try {
    assert.equal(loadTheme(), "dark"); assert.doesNotThrow(() => saveTheme("light"));
    assert.equal(loadMusicMuted(), false); assert.doesNotThrow(() => saveMusicMuted(true));
  } finally {
    if (before) Object.defineProperty(globalThis, "localStorage", before); else delete globalThis.localStorage;
  }
});
