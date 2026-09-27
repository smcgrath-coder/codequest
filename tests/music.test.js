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

// iPad and iPhone Safari treat `volume` as read-only, so mute must set `muted` as well.
test("setMuted sets and clears the playing track's muted flag", () => {
  const track = { volume: 0.3, muted: false };
  Music._current = track;
  try {
    Music.setMuted(true); assert.equal(track.muted, true);
    Music.setMuted(false); assert.equal(track.muted, false);
  } finally { Music._current = null; Music.setMuted(false); }
});

// A fake track for play() and playVictory(): they take it from the cache instead of building an Audio.
const fakeTrack = (muted = false) => ({ volume: 1, muted, paused: true, currentTime: 0, play() { this.paused = false; return Promise.resolve(); }, pause() { this.paused = true; } });

test("a track or the victory fanfare started while muted starts muted, and one started unmuted doesn't", () => {
  const loaded = Music._loaded;
  Music._loaded = { map: fakeTrack(), codex: fakeTrack(true), victory: fakeTrack() };   // codex was left muted earlier
  try {
    Music.setMuted(true);
    Music.play("map"); assert.equal(Music._loaded.map.muted, true); assert.equal(Music._loaded.map.volume, 0);
    Music.playVictory(); assert.equal(Music._loaded.victory.muted, true);
    Music.setMuted(false);
    Music.play("codex"); assert.equal(Music._loaded.codex.muted, false); assert.equal(Music._loaded.codex.volume, Music.volume);
  } finally { Music._loaded = loaded; Music._current = null; Music._currentTrack = null; Music.setMuted(false); }
});

test("the saved choice: muted only when '1' is saved; anything else, or blocked storage, is not", () => {
  const m = new Map(), s = { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  assert.equal(loadMusicMuted(s), false);
  saveMusicMuted(true, s); assert.equal(m.get(MUTED_KEY), "1"); assert.equal(loadMusicMuted(s), true);
  saveMusicMuted(false, s); assert.equal(loadMusicMuted(s), false);
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  assert.equal(loadMusicMuted(blocked), false); assert.doesNotThrow(() => saveMusicMuted(true, blocked));
});
