// ═══════════════════════════════════════════════════════════════════
// MUSIC PLAYER — manages background music with crossfade
// ═══════════════════════════════════════════════════════════════════

// Track definitions — map logical names to files in /public/music/
const TRACKS = {
  title:      '/music/title-theme.mp3',
  map:        '/music/world-map.mp3',
  act1:       '/music/code-depths.mp3',
  act2:       '/music/architects-path.mp3',
  act3:       '/music/arena.mp3',
  act4:       '/music/rover-bay.mp3',
  boss1:      '/music/boss-battle-1.mp3',
  boss2:      '/music/boss-battle-2.mp3',
  victory:    '/music/victory-fanfare.mp3',
  codex:      '/music/codex-menu.mp3',
  npc:        '/music/npc-dialogue.mp3',
};

// Map chapter IDs to act tracks
function getActTrack(chapterId) {
  if (!chapterId) return 'act1';
  const num = parseInt(chapterId.replace('ch', ''));
  if (num <= 5) return 'act1';
  if (num <= 8) return 'act2';
  if (num <= 10) return 'act3';
  return 'act4';
}

// Map screen + context to which track should play
export function getTrackForContext({ screen, chapterId, isBoss }) {
  switch (screen) {
    case 'title':
    case 'create':
    case 'profiles':
    case 'helper-mode':
    case 'session':
      return 'title';
    case 'map':
      return 'map';
    case 'charsheet':
    case 'codex':
    case 'grind':
      return 'codex';
    case 'chapter':
      return getActTrack(chapterId);
    case 'challenge':
      if (isBoss) return Math.random() > 0.5 ? 'boss1' : 'boss2';
      return getActTrack(chapterId);
    default:
      return 'title';
  }
}

// Singleton music player
class MusicPlayer {
  constructor() {
    this._current = null;      // current Audio element
    this._currentTrack = null;  // current track key
    this._volume = 0.3;         // 0-1
    this._muted = false;
    this._enabled = true;
    this._loaded = {};          // cache of Audio elements
  }

  _getAudio(trackKey) {
    if (!this._loaded[trackKey]) {
      const url = TRACKS[trackKey];
      if (!url) return null;
      const audio = new Audio(url);
      audio.loop = trackKey !== 'victory'; // victory fanfare doesn't loop
      audio.volume = this._volume;
      audio.preload = 'auto';
      this._loaded[trackKey] = audio;
    }
    return this._loaded[trackKey];
  }

  play(trackKey) {
    if (!this._enabled || !TRACKS[trackKey]) return;
    
    // Already playing this track
    if (this._currentTrack === trackKey && this._current && !this._current.paused) return;

    // Stop current
    if (this._current) {
      this._current.pause();
      this._current.currentTime = 0;
    }

    const audio = this._getAudio(trackKey);
    if (!audio) return;

    audio.volume = this._muted ? 0 : this._volume;
    audio.currentTime = 0;
    
    // Browser requires user interaction before playing audio
    const playPromise = audio.play();
    if (playPromise) playPromise.catch(() => {}); // silent fail

    this._current = audio;
    this._currentTrack = trackKey;
  }

  // Play victory fanfare, then resume previous track
  playVictory(callback) {
    if (!this._enabled) { if (callback) callback(); return; }
    
    const prevTrack = this._currentTrack;
    
    if (this._current) {
      this._current.pause();
    }

    const victory = this._getAudio('victory');
    if (!victory) { if (callback) callback(); return; }

    victory.volume = this._muted ? 0 : this._volume;
    victory.currentTime = 0;
    
    victory.onended = () => {
      victory.onended = null;
      if (prevTrack && prevTrack !== 'victory') {
        this.play(prevTrack);
      }
      if (callback) callback();
    };

    const p = victory.play();
    if (p) p.catch(() => {});
    this._current = victory;
    this._currentTrack = 'victory';
  }

  stop() {
    if (this._current) {
      this._current.pause();
      this._current.currentTime = 0;
    }
    this._currentTrack = null;
  }

  setVolume(v) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this._current && !this._muted) {
      this._current.volume = this._volume;
    }
  }

  toggleMute() {
    this._muted = !this._muted;
    if (this._current) {
      this._current.volume = this._muted ? 0 : this._volume;
    }
    return this._muted;
  }

  get muted() { return this._muted; }
  get volume() { return this._volume; }
  get enabled() { return this._enabled; }

  setEnabled(val) {
    this._enabled = val;
    if (!val) this.stop();
  }
}

// Export singleton
export const Music = new MusicPlayer();
