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
