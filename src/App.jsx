import React, { useState, useEffect, useCallback, useRef, Component } from "react";
import * as Tone from "tone";
import { Music, getTrackForContext } from "./music.js";
import { DARK, PANEL, PANEL2, ACCENT, GOLD, TEXT, DIM, VDIM, MONO, ERR } from "./theme.js";
import { validateOffline, CONCEPT_HELP, getConceptsForChallenge } from "./grader.js";
import { CHAPTERS, TROPHIES, CODEX, GRIND_CHALLENGES } from "./content.js";
import { availablePractice, normalizeProfile, afterClear } from "./progress.js";
import { CodeEditor, OutputPanel, PYTHON_RUNNER, appendPart } from "./python/CodePanel.jsx";
import { runAndGrade } from "./python/flow.js";
import { stopCode, answerInput, onPythonStatus, pythonStatus, warmUp } from "./python/runner.js";
import { CHECKS } from "./checks.js";

// ═══════════════════════════════════════════════════════════════════
// SOUND FX SYSTEM (Chiptune via Tone.js)
// ═══════════════════════════════════════════════════════════════════

const SFX = {
  _ready: false,
  _blip: null,     // mono synth for single-note blips (click, dialogueBlip, menuNav, xpGain)
  _melody: null,   // poly synth for multi-note melodies (fanfares, success, fail)
  _noise: null,    // noise synth for hover
  async init() {
    if (this._ready) return;
    try {
      await Tone.start();
      // Mono synth for blips — one voice only, fast release, never piles up
      this._blip = new Tone.Synth({
        oscillator: { type: "square" },
        envelope: { attack: 0.003, decay: 0.06, sustain: 0, release: 0.05 },
        volume: -22
      }).toDestination();
      // Poly synth for melodies — 6 voices max, auto-steals oldest
      this._melody = new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 6,
        oscillator: { type: "square" },
        envelope: { attack: 0.005, decay: 0.12, sustain: 0.03, release: 0.08 },
        volume: -18
      }).toDestination();
      // Noise for hover
      this._noise = new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: { attack: 0.005, decay: 0.06, sustain: 0 },
        volume: -30
      }).toDestination();
      this._ready = true;
    } catch(e) {}
  },
  // Single blip — uses mono synth, naturally cuts previous note
  _blipNote(note, dur) {
    if (!this._ready || !this._blip) return;
    try { this._blip.triggerAttackRelease(note, dur || "32n"); } catch(e) {}
  },
  // Multi-note melody — releases all voices first, then plays sequence
  _playMelody(notes, durations, delays) {
    if (!this._ready || !this._melody) return;
    try {
      this._melody.releaseAll();
      const now = Tone.now();
      notes.forEach((n, i) => {
        this._melody.triggerAttackRelease(n, durations[i] || "16n", now + (delays[i] || 0));
      });
    } catch(e) {}
  },
  click()        { this._blipNote("C5", "32n"); },
  dialogueBlip() { this._blipNote("C5", "64n"); },
  menuNav()      { this._blipNote("G5", "32n"); },
  xpGain()       { this._blipNote("E6", "32n"); },
  hover()        { if(this._ready && this._noise) try{this._noise.triggerAttackRelease("32n")}catch(e){} },
  codeSuccess()  { this._playMelody(["C5","E5","G5","C6"], ["16n","16n","16n","8n"], [0,0.08,0.16,0.24]); },
  codeFail()     { this._playMelody(["E4","C4"], ["8n","4n"], [0,0.12]); },
  roomClear()    { this._playMelody(["G4","C5","E5","G5","C6"], ["16n","16n","16n","16n","4n"], [0,0.1,0.2,0.3,0.45]); },
  bossDefeat()   { this._playMelody(["C4","E4","G4","C5","E5","G5","C6"], ["16n","16n","16n","16n","16n","8n","2n"], [0,0.1,0.2,0.35,0.45,0.55,0.75]); },
  badgeUnlock()  { this._playMelody(["E5","G5","B5","E6"], ["16n","16n","16n","4n"], [0,0.12,0.24,0.4]); },
  trophyUnlock() { this._playMelody(["D5","F#5","A5","D6"], ["16n","16n","16n","4n"], [0,0.1,0.2,0.35]); },
  roomEnter()    { this._playMelody(["E4","G4","C5"], ["16n","16n","8n"], [0,0.1,0.2]); },
};

// Error boundary — catches runtime crashes and shows message instead of white screen
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0d1117",padding:"2rem"}}>
        <div style={{maxWidth:"500px",textAlign:"center",fontFamily:"'Courier New',monospace"}}>
          <div style={{fontSize:"48px",marginBottom:"16px"}}>💥</div>
          <h2 style={{color:"#ff6b6b",marginBottom:"12px"}}>Something crashed!</h2>
          <p style={{color:"#8b949e",fontSize:"14px",marginBottom:"16px"}}>{this.state.error?.message || "Unknown error"}</p>
          <button onClick={()=>{this.setState({hasError:false,error:null})}}
            style={{background:"#64ffda18",border:"1px solid #64ffda66",color:"#64ffda",padding:"8px 24px",borderRadius:"6px",cursor:"pointer",fontFamily:"'Courier New',monospace"}}>
            Try Again</button>
        </div>
      </div>;
    }
    return this.props.children;
  }
}

// Global CSS keyframes — always rendered
function GlobalStyles() {
  return <style>{`
    @keyframes cq-float-up { 0%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-60px)} }
    @keyframes cq-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
    @keyframes cq-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-4px)} 40%{transform:translateX(4px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(2px)} }
    @keyframes cq-glow-pulse { 0%,100%{box-shadow:0 0 20px rgba(100,255,218,0.1)} 50%{box-shadow:0 0 40px rgba(100,255,218,0.3)} }
    @keyframes cq-slide-in { 0%{opacity:0;transform:translateX(-20px)} 100%{opacity:1;transform:translateX(0)} }
    @keyframes cq-fade-in { 0%{opacity:0} 100%{opacity:1} }
    @keyframes cq-scale-in { 0%{opacity:0;transform:scale(0.8)} 100%{opacity:1;transform:scale(1)} }
    @keyframes cq-bounce-in { 0%{opacity:0;transform:scale(0.3)} 50%{transform:scale(1.05)} 70%{transform:scale(0.95)} 100%{opacity:1;transform:scale(1)} }
    @keyframes blink { 0%,50%{opacity:1} 51%,100%{opacity:0} }
    @keyframes cq-particle { 0%{opacity:1;transform:translate(0,0) scale(1) rotate(0deg)} 100%{opacity:0;transform:translate(var(--vx),var(--vy)) scale(0.3) rotate(360deg)} }
  `}</style>;
}

// ═══════════════════════════════════════════════════════════════════
// PARTICLE SYSTEM
// ═══════════════════════════════════════════════════════════════════

function Particles({ active, type="victory", count=24 }) {
  const [particles, setParticles] = useState([]);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => {
    if (!active) { setParticles([]); return; }
    const colors = type === "boss"
      ? ["#ffd700","#ffeb3b","#ff9800","#fff","#ffc107"]
      : type === "badge"
      ? ["#ffd700","#ffeb3b","#fff"]
      : ["#64ffda","#00bfa5","#80f0ff","#fff","#a8d8a8"];
    const p = Array.from({length: count}, (_, i) => ({
      id: i,
      x: 50 + (Math.random() - 0.5) * 30,
      y: 50 + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 60,
      vy: -Math.random() * 40 - 20,
      size: 2 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.3,
      shape: Math.random() > 0.6 ? "star" : "circle",
    }));
    setParticles(p);
    const t = setTimeout(() => { if (mountedRef.current) setParticles([]); }, 1800);
    return () => clearTimeout(t);
  }, [active, type, count]);

  if (particles.length === 0) return null;
  return <div className="fixed inset-0 pointer-events-none z-50" style={{overflow:"hidden"}}>
    {particles.map(p => <div key={p.id} style={{
      position:"absolute",
      left:`${p.x}%`, top:`${p.y}%`,
      width: p.size, height: p.size,
      background: p.color,
      borderRadius: p.shape === "circle" ? "50%" : "0",
      transform: p.shape === "star" ? "rotate(45deg)" : "none",
      "--vx": `${p.vx}px`, "--vy": `${p.vy}px`,
      animation: `cq-particle 1.5s ${p.delay}s ease-out forwards`,
      boxShadow: `0 0 ${p.size * 2}px ${p.color}88`,
    }} />)}
  </div>;
}

// Floating XP indicator
function FloatingXP({ amount, visible }) {
  if (!visible) return null;
  return <div style={{
    position: "fixed", top: "40%", left: "50%", transform: "translateX(-50%)",
    color: ACCENT, fontFamily: "'Courier New',monospace", fontSize: "28px", fontWeight: "bold",
    textShadow: `0 0 20px ${ACCENT}66`, pointerEvents: "none", zIndex: 60,
    animation: "cq-float-up 1.2s ease-out forwards"
  }}>+{amount} XP</div>;
}

// Screen transition wrapper
function ScreenWrap({ children, screenKey }) {
  const [vis, setVis] = useState(true);
  const prevKey = useRef(screenKey);
  useEffect(() => {
    if (prevKey.current !== screenKey) {
      prevKey.current = screenKey;
      setVis(false);
      const t = setTimeout(() => setVis(true), 50);
      return () => clearTimeout(t);
    }
  }, [screenKey]);
  return <div style={{
    transition: "opacity 0.2s ease",
    opacity: vis ? 1 : 0,
  }}>{children}</div>;
}

// ═══════════════════════════════════════════════════════════════════
// PIXEL ART SYSTEM
// ═══════════════════════════════════════════════════════════════════

const COLORS = {
  hair: ["#2d1b00","#8b4513","#daa520","#ff4500","#1a1a2e","#4a90d9","#9b59b6","#2ecc71"],
  skin: ["#fdbcb4","#f1c27d","#e0ac69","#c68642","#8d5524","#5c3d2e"],
  shirt: ["#e74c3c","#3498db","#2ecc71","#f39c12","#9b59b6","#1abc9c","#e67e22","#ecf0f1"],
  accessory: ["none","glasses","headband","cap","antenna","horns"],
};

function PixelAvatar({ hair=0, skin=0, shirt=0, accessory=0, size=64 }) {
  const hc = COLORS.hair[hair%COLORS.hair.length];
  const sc = COLORS.skin[skin%COLORS.skin.length];
  const tc = COLORS.shirt[shirt%COLORS.shirt.length];
  const acc = COLORS.accessory[accessory%COLORS.accessory.length];
  // FF6-style shade helpers — dark outlines, highlight/shadow layers
  const darken=(c,a=0.4)=>{const m=c.match(/\w\w/g);if(!m)return"#000";return"#"+m.map(h=>{const v=Math.max(0,Math.round(parseInt(h,16)*(1-a)));return v.toString(16).padStart(2,"0")}).join("")};
  const lighten=(c,a=0.35)=>{const m=c.match(/\w\w/g);if(!m)return"#fff";return"#"+m.map(h=>{const v=Math.min(255,Math.round(parseInt(h,16)+(255-parseInt(h,16))*a));return v.toString(16).padStart(2,"0")}).join("")};
  const OL="#0a0812"; // master outline color
  const hcD=darken(hc); const hcL=lighten(hc); const hcS=darken(hc,0.2);
  const scD=darken(sc,0.25); const scL=lighten(sc,0.2);
  const tcD=darken(tc); const tcM=darken(tc,0.15); const tcL=lighten(tc,0.25);
  const eyeW="#e8eef6"; const eyeC=sc==="#5c3d2e"||sc==="#8d5524"?"#4488cc":"#1a3a6e"; const eyeH="#fff";
  const lipC=darken(sc,0.1);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{imageRendering:"pixelated"}}>
      <rect width="48" height="48" fill="transparent"/>
      {/* ══ FF6-STYLE SPRITE — 48x48 with outlines ══ */}

      {/* ── HAIR (voluminous, swept style) ── */}
      {/* Hair outline */}
      <rect x="15" y="2" width="18" height="1" fill={OL}/>
      <rect x="13" y="3" width="3" height="1" fill={OL}/>
      <rect x="32" y="3" width="3" height="1" fill={OL}/>
      <rect x="12" y="4" width="2" height="1" fill={OL}/>
      <rect x="33" y="4" width="2" height="1" fill={OL}/>
      <rect x="11" y="5" width="2" height="2" fill={OL}/>
      <rect x="34" y="5" width="2" height="3" fill={OL}/>
      <rect x="11" y="7" width="1" height="5" fill={OL}/>
      <rect x="35" y="8" width="1" height="5" fill={OL}/>
      <rect x="11" y="12" width="1" height="4" fill={OL}/>
      <rect x="35" y="13" width="1" height="3" fill={OL}/>
      {/* Hair fill */}
      <rect x="15" y="3" width="17" height="1" fill={hcL}/>
      <rect x="14" y="4" width="19" height="1" fill={hcL}/>
      <rect x="13" y="5" width="21" height="2" fill={hc}/>
      <rect x="12" y="7" width="23" height="2" fill={hc}/>
      <rect x="12" y="9" width="3" height="4" fill={hc}/>
      <rect x="33" y="9" width="2" height="4" fill={hc}/>
      {/* Hair highlight streak */}
      <rect x="17" y="4" width="5" height="1" fill={hcL}/>
      <rect x="16" y="5" width="3" height="1" fill={hcL}/>
      <rect x="19" y="5" width="2" height="1" fill={hcL}/>
      {/* Hair shadow */}
      <rect x="13" y="7" width="2" height="2" fill={hcS}/>
      <rect x="33" y="7" width="1" height="2" fill={hcD}/>
      {/* Side hair tufts */}
      <rect x="11" y="13" width="2" height="3" fill={hcS}/>
      <rect x="35" y="14" width="1" height="2" fill={hcD}/>
      {/* Hair spikes on top */}
      <rect x="18" y="1" width="3" height="2" fill={hc}/>
      <rect x="23" y="1" width="4" height="2" fill={hc}/>
      <rect x="29" y="2" width="3" height="1" fill={hcS}/>
      <rect x="19" y="0" width="2" height="2" fill={hcL}/>
      <rect x="24" y="0" width="2" height="2" fill={hc}/>

      {/* ── HEAD / FACE ── */}
      {/* Face outline */}
      <rect x="14" y="9" width="1" height="12" fill={OL}/>
      <rect x="33" y="9" width="1" height="12" fill={OL}/>
      <rect x="15" y="21" width="18" height="1" fill={OL}/>
      {/* Face fill */}
      <rect x="15" y="9" width="18" height="12" fill={sc}/>
      {/* Forehead highlight */}
      <rect x="18" y="9" width="8" height="1" fill={scL}/>
      {/* Ears */}
      <rect x="13" y="12" width="2" height="4" fill={sc}/>
      <rect x="33" y="12" width="2" height="4" fill={sc}/>
      <rect x="12" y="13" width="1" height="2" fill={OL}/>
      <rect x="35" y="13" width="1" height="2" fill={OL}/>
      <rect x="13" y="13" width="1" height="2" fill={scD}/>
      <rect x="34" y="13" width="1" height="2" fill={scD}/>

      {/* ── EYES (big, anime FF6-style) ── */}
      {/* Eye outline */}
      <rect x="16" y="12" width="6" height="1" fill={OL}/>
      <rect x="26" y="12" width="6" height="1" fill={OL}/>
      {/* Eye whites */}
      <rect x="16" y="13" width="6" height="4" fill={eyeW}/>
      <rect x="26" y="13" width="6" height="4" fill={eyeW}/>
      {/* Iris */}
      <rect x="18" y="13" width="4" height="4" fill={eyeC}/>
      <rect x="28" y="13" width="4" height="4" fill={eyeC}/>
      {/* Pupil */}
      <rect x="19" y="14" width="2" height="2" fill={OL}/>
      <rect x="29" y="14" width="2" height="2" fill={OL}/>
      {/* Eye highlight */}
      <rect x="20" y="13" width="1" height="1" fill={eyeH}/>
      <rect x="30" y="13" width="1" height="1" fill={eyeH}/>
      <rect x="18" y="16" width="1" height="1" fill={eyeH} opacity="0.5"/>
      <rect x="28" y="16" width="1" height="1" fill={eyeH} opacity="0.5"/>
      {/* Under-eye line */}
      <rect x="16" y="17" width="6" height="1" fill={scD}/>
      <rect x="26" y="17" width="6" height="1" fill={scD}/>
      {/* Eyebrows */}
      <rect x="16" y="11" width="6" height="1" fill={darken(hc,0.3)}/>
      <rect x="26" y="11" width="6" height="1" fill={darken(hc,0.3)}/>

      {/* Nose */}
      <rect x="23" y="17" width="2" height="2" fill={scD}/>
      <rect x="23" y="18" width="1" height="1" fill={darken(sc,0.15)}/>
      {/* Mouth */}
      <rect x="21" y="19" width="6" height="1" fill={lipC}/>
      <rect x="22" y="20" width="4" height="1" fill={lighten(lipC,0.15)}/>
      {/* Chin shadow */}
      <rect x="17" y="20" width="14" height="1" fill={scD} opacity="0.3"/>

      {/* ── NECK ── */}
      <rect x="20" y="22" width="8" height="3" fill={sc}/>
      <rect x="19" y="22" width="1" height="2" fill={OL}/>
      <rect x="28" y="22" width="1" height="2" fill={OL}/>
      <rect x="22" y="22" width="4" height="1" fill={scD}/>

      {/* ── BODY (slim, FF6-style tunic) ── */}
      {/* Body outline */}
      <rect x="13" y="24" width="1" height="12" fill={OL}/>
      <rect x="34" y="24" width="1" height="12" fill={OL}/>
      <rect x="14" y="24" width="20" height="1" fill={OL}/>
      {/* Shoulder pads — small, not huge */}
      <rect x="14" y="24" width="4" height="2" fill={tcM}/>
      <rect x="30" y="24" width="4" height="2" fill={tcM}/>
      <rect x="14" y="24" width="4" height="1" fill={tcL}/>
      <rect x="30" y="24" width="4" height="1" fill={tcL}/>
      {/* Torso */}
      <rect x="18" y="24" width="12" height="11" fill={tc}/>
      <rect x="16" y="25" width="2" height="10" fill={tc}/>
      <rect x="30" y="25" width="2" height="10" fill={tc}/>
      {/* Collar / neckline V */}
      <rect x="21" y="24" width="1" height="2" fill={tcD}/>
      <rect x="26" y="24" width="1" height="2" fill={tcD}/>
      <rect x="22" y="25" width="4" height="1" fill={scD}/>
      {/* Shirt center seam */}
      <rect x="23" y="26" width="2" height="6" fill={tcM}/>
      {/* Shirt highlights */}
      <rect x="19" y="26" width="2" height="3" fill={tcL} opacity="0.4"/>
      <rect x="27" y="27" width="2" height="2" fill={tcL} opacity="0.3"/>
      {/* Shirt shadow (right side, bottom) */}
      <rect x="28" y="28" width="3" height="5" fill={tcM} opacity="0.4"/>
      <rect x="18" y="33" width="12" height="2" fill={tcM} opacity="0.3"/>

      {/* ── ARMS ── */}
      {/* Left arm outline */}
      <rect x="11" y="25" width="1" height="10" fill={OL}/>
      <rect x="12" y="25" width="4" height="9" fill={tc}/>
      <rect x="12" y="25" width="1" height="8" fill={tcL} opacity="0.3"/>
      <rect x="15" y="26" width="1" height="7" fill={tcM}/>
      {/* Right arm outline */}
      <rect x="36" y="25" width="1" height="10" fill={OL}/>
      <rect x="32" y="25" width="4" height="9" fill={tc}/>
      <rect x="35" y="26" width="1" height="7" fill={tcM}/>
      {/* Left hand */}
      <rect x="11" y="34" width="1" height="3" fill={OL}/>
      <rect x="12" y="34" width="4" height="3" fill={sc}/>
      <rect x="12" y="34" width="1" height="2" fill={scL}/>
      <rect x="15" y="35" width="1" height="1" fill={scD}/>
      <rect x="12" y="37" width="4" height="1" fill={OL}/>
      {/* Right hand */}
      <rect x="36" y="34" width="1" height="3" fill={OL}/>
      <rect x="32" y="34" width="4" height="3" fill={sc}/>
      <rect x="35" y="35" width="1" height="1" fill={scD}/>
      <rect x="32" y="37" width="4" height="1" fill={OL}/>

      {/* ── BELT ── */}
      <rect x="16" y="34" width="16" height="2" fill={darken(tc,0.5)}/>
      <rect x="16" y="34" width="16" height="1" fill={darken(tc,0.35)}/>
      {/* Belt buckle */}
      <rect x="22" y="34" width="4" height="2" fill="#c0a030"/>
      <rect x="23" y="34" width="2" height="1" fill="#e8c840"/>

      {/* ── LEGS ── */}
      {/* Leg outline */}
      <rect x="15" y="36" width="1" height="8" fill={OL}/>
      <rect x="32" y="36" width="1" height="8" fill={OL}/>
      {/* Left leg */}
      <rect x="16" y="36" width="6" height="8" fill="#3a4a60"/>
      <rect x="16" y="36" width="2" height="6" fill="#465878" opacity="0.5"/>
      {/* Right leg */}
      <rect x="26" y="36" width="6" height="8" fill="#3a4a60"/>
      <rect x="26" y="36" width="2" height="6" fill="#465878" opacity="0.5"/>
      {/* Leg gap */}
      <rect x="22" y="37" width="4" height="7" fill={OL} opacity="0.6"/>
      {/* Knee shading */}
      <rect x="18" y="40" width="3" height="1" fill="#2e3e52"/>
      <rect x="28" y="40" width="3" height="1" fill="#2e3e52"/>

      {/* ── BOOTS ── */}
      {/* Boot outline */}
      <rect x="14" y="43" width="9" height="1" fill={OL}/>
      <rect x="25" y="43" width="9" height="1" fill={OL}/>
      <rect x="14" y="44" width="1" height="4" fill={OL}/>
      <rect x="33" y="44" width="1" height="4" fill={OL}/>
      <rect x="14" y="47" width="9" height="1" fill={OL}/>
      <rect x="25" y="47" width="9" height="1" fill={OL}/>
      {/* Boot fill */}
      <rect x="15" y="44" width="8" height="3" fill="#3a2820"/>
      <rect x="26" y="44" width="7" height="3" fill="#3a2820"/>
      {/* Boot top band */}
      <rect x="15" y="44" width="8" height="1" fill="#5a4030"/>
      <rect x="26" y="44" width="7" height="1" fill="#5a4030"/>
      {/* Boot sole highlight */}
      <rect x="15" y="46" width="8" height="1" fill="#2a1c14"/>
      <rect x="26" y="46" width="7" height="1" fill="#2a1c14"/>
      {/* Boot toe cap */}
      <rect x="15" y="45" width="2" height="1" fill="#4a3428"/>
      <rect x="26" y="45" width="2" height="1" fill="#4a3428"/>

      {/* ══ ACCESSORIES ══ */}
      {acc==="glasses"&&<g>
        <rect x="15" y="12" width="8" height="6" fill="none" stroke="#c0a030" strokeWidth="1"/>
        <rect x="25" y="12" width="8" height="6" fill="none" stroke="#c0a030" strokeWidth="1"/>
        <rect x="23" y="14" width="2" height="1" fill="#c0a030"/>
        <rect x="12" y="14" width="3" height="1" fill="#c0a030"/>
        <rect x="33" y="14" width="3" height="1" fill="#c0a030"/>
      </g>}
      {acc==="headband"&&<g>
        <rect x="12" y="8" width="24" height="2" fill="#c0392b"/>
        <rect x="12" y="8" width="24" height="1" fill="#e74c3c"/>
        <rect x="35" y="9" width="4" height="2" fill="#c0392b"/>
        <rect x="37" y="10" width="3" height="2" fill="#e74c3c" opacity="0.7"/>
        <rect x="38" y="12" width="2" height="2" fill="#c0392b" opacity="0.5"/>
      </g>}
      {acc==="cap"&&<g>
        <rect x="11" y="1" width="24" height="5" fill="#2c3e50"/>
        <rect x="9" y="5" width="28" height="3" fill="#2c3e50"/>
        <rect x="9" y="5" width="28" height="1" fill="#3d566e"/>
        <rect x="15" y="2" width="8" height="3" fill="#3d566e"/>
        <rect x="9" y="7" width="28" height="1" fill={OL}/>
      </g>}
      {acc==="antenna"&&<g>
        <rect x="22" y="0" width="2" height="2" fill="#888"/>
        <rect x="21" y="0" width="4" height="1" fill={ACCENT}/>
        <rect x="22" y="0" width="2" height="1" fill="#aaffee"/>
        <rect x="23" y="1" width="1" height="1" fill="#888"/>
      </g>}
      {acc==="horns"&&<g>
        <rect x="10" y="2" width="3" height="5" fill="#c0392b"/>
        <rect x="11" y="0" width="2" height="3" fill="#e74c3c"/>
        <rect x="11" y="0" width="1" height="1" fill="#ff8888"/>
        <rect x="35" y="2" width="3" height="5" fill="#c0392b"/>
        <rect x="35" y="0" width="2" height="3" fill="#e74c3c"/>
        <rect x="36" y="0" width="1" height="1" fill="#ff8888"/>
      </g>}
    </svg>
  );
}

function NPCAvatar({ type, size=64 }) {
  const OL="#0a0812";
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{imageRendering:"pixelated"}}>
      {type==="byte"?<g>
        {/* ══ BYTE — Friendly Robot ══ */}
        {/* Antenna */}
        <rect x="22" y="0" width="4" height="2" fill={ACCENT}/>
        <rect x="23" y="0" width="2" height="1" fill="#aaffee"/>
        <rect x="23" y="2" width="2" height="3" fill="#8899aa"/>
        <rect x="22" y="2" width="1" height="2" fill={OL}/>
        <rect x="25" y="2" width="1" height="2" fill={OL}/>
        {/* Head outline */}
        <rect x="11" y="5" width="1" height="12" fill={OL}/>
        <rect x="36" y="5" width="1" height="12" fill={OL}/>
        <rect x="12" y="4" width="24" height="1" fill={OL}/>
        <rect x="12" y="17" width="24" height="1" fill={OL}/>
        {/* Head — monitor casing */}
        <rect x="12" y="5" width="24" height="12" fill="#b0bec5"/>
        <rect x="13" y="5" width="22" height="2" fill="#cfd8dc"/>
        <rect x="12" y="14" width="24" height="3" fill="#90a4ae"/>
        {/* Screen */}
        <rect x="14" y="7" width="20" height="8" fill="#0a1a2a"/>
        <rect x="14" y="7" width="20" height="1" fill="#0d2038"/>
        {/* Eyes — LED */}
        <rect x="17" y="9" width="4" height="4" fill={ACCENT}/>
        <rect x="27" y="9" width="4" height="4" fill={ACCENT}/>
        <rect x="18" y="9" width="2" height="2" fill="#aaffee"/>
        <rect x="28" y="9" width="2" height="2" fill="#aaffee"/>
        <rect x="19" y="10" width="1" height="1" fill="#fff"/>
        <rect x="29" y="10" width="1" height="1" fill="#fff"/>
        {/* Smile */}
        <rect x="20" y="13" width="8" height="1" fill={ACCENT} opacity="0.6"/>
        <rect x="19" y="12" width="1" height="1" fill={ACCENT} opacity="0.4"/>
        <rect x="28" y="12" width="1" height="1" fill={ACCENT} opacity="0.4"/>
        {/* Neck */}
        <rect x="21" y="18" width="6" height="3" fill="#78909c"/>
        <rect x="20" y="18" width="1" height="2" fill={OL}/>
        <rect x="27" y="18" width="1" height="2" fill={OL}/>
        {/* Body outline */}
        <rect x="13" y="21" width="1" height="14" fill={OL}/>
        <rect x="34" y="21" width="1" height="14" fill={OL}/>
        <rect x="14" y="21" width="20" height="1" fill={OL}/>
        {/* Body — chassis */}
        <rect x="14" y="22" width="20" height="12" fill="#b0bec5"/>
        <rect x="15" y="22" width="18" height="2" fill="#cfd8dc"/>
        <rect x="14" y="31" width="20" height="3" fill="#90a4ae"/>
        {/* Chest panel */}
        <rect x="18" y="24" width="12" height="6" fill="#0a1a2a"/>
        <rect x="20" y="25" width="3" height="2" fill={ACCENT} opacity="0.3"/>
        <rect x="25" y="25" width="3" height="2" fill={ACCENT} opacity="0.2"/>
        <rect x="22" y="28" width="4" height="1" fill={ACCENT} opacity="0.15"/>
        {/* Arms */}
        <rect x="10" y="22" width="1" height="10" fill={OL}/>
        <rect x="37" y="22" width="1" height="10" fill={OL}/>
        <rect x="11" y="22" width="3" height="9" fill="#90a4ae"/>
        <rect x="34" y="22" width="3" height="9" fill="#90a4ae"/>
        <rect x="11" y="22" width="3" height="2" fill="#b0bec5"/>
        <rect x="34" y="22" width="3" height="2" fill="#b0bec5"/>
        {/* Hands */}
        <rect x="10" y="31" width="4" height="4" fill="#78909c"/>
        <rect x="34" y="31" width="4" height="4" fill="#78909c"/>
        <rect x="10" y="31" width="4" height="1" fill="#90a4ae"/>
        <rect x="34" y="31" width="4" height="1" fill="#90a4ae"/>
        <rect x="10" y="35" width="4" height="1" fill={OL}/>
        <rect x="34" y="35" width="4" height="1" fill={OL}/>
        {/* Legs */}
        <rect x="16" y="34" width="6" height="7" fill="#78909c"/>
        <rect x="26" y="34" width="6" height="7" fill="#78909c"/>
        <rect x="15" y="34" width="1" height="7" fill={OL}/>
        <rect x="32" y="34" width="1" height="7" fill={OL}/>
        <rect x="22" y="35" width="4" height="6" fill={OL} opacity="0.5"/>
        {/* Feet */}
        <rect x="14" y="41" width="9" height="3" fill="#607d8b"/>
        <rect x="25" y="41" width="9" height="3" fill="#607d8b"/>
        <rect x="14" y="41" width="9" height="1" fill="#78909c"/>
        <rect x="25" y="41" width="9" height="1" fill="#78909c"/>
        <rect x="14" y="44" width="9" height="1" fill={OL}/>
        <rect x="25" y="44" width="9" height="1" fill={OL}/>
        <rect x="13" y="41" width="1" height="4" fill={OL}/>
        <rect x="34" y="41" width="1" height="4" fill={OL}/>
      </g>:type==="professor"?<g>
        {/* ══ PROFESSOR LOOP — Eccentric Scientist ══ */}
        {/* Wild hair */}
        <rect x="12" y="1" width="22" height="1" fill={OL}/>
        <rect x="11" y="2" width="2" height="1" fill={OL}/>
        <rect x="33" y="2" width="2" height="1" fill={OL}/>
        <rect x="10" y="3" width="2" height="2" fill={OL}/>
        <rect x="34" y="3" width="2" height="3" fill={OL}/>
        <rect x="13" y="2" width="20" height="2" fill="#d0d0d8"/>
        <rect x="12" y="4" width="22" height="3" fill="#c0c0cc"/>
        <rect x="12" y="3" width="4" height="2" fill="#e0e0e8"/>
        {/* Wild tufts sticking up */}
        <rect x="15" y="0" width="3" height="2" fill="#d0d0d8"/>
        <rect x="22" y="0" width="4" height="2" fill="#c0c0cc"/>
        <rect x="29" y="0" width="3" height="2" fill="#d0d0d8"/>
        <rect x="16" y="0" width="1" height="1" fill="#e8e8ee"/>
        {/* Side hair */}
        <rect x="10" y="5" width="3" height="8" fill="#b0b0bc"/>
        <rect x="34" y="6" width="2" height="7" fill="#b0b0bc"/>
        <rect x="9" y="7" width="1" height="6" fill={OL}/>
        <rect x="36" y="7" width="1" height="5" fill={OL}/>
        {/* Head outline */}
        <rect x="13" y="7" width="1" height="14" fill={OL}/>
        <rect x="34" y="7" width="1" height="14" fill={OL}/>
        {/* Face */}
        <rect x="14" y="7" width="20" height="14" fill="#f8d8b4"/>
        <rect x="17" y="7" width="10" height="1" fill="#fce4c8"/>
        {/* Goggles on forehead */}
        <rect x="15" y="8" width="7" height="3" fill="#4a3520"/>
        <rect x="26" y="8" width="7" height="3" fill="#4a3520"/>
        <rect x="16" y="9" width="5" height="2" fill="#88ccff"/>
        <rect x="27" y="9" width="5" height="2" fill="#88ccff"/>
        <rect x="17" y="9" width="2" height="1" fill="#aaddff"/>
        <rect x="28" y="9" width="2" height="1" fill="#aaddff"/>
        <rect x="22" y="9" width="4" height="1" fill="#4a3520"/>
        {/* Eyes */}
        <rect x="17" y="13" width="4" height="3" fill="#fff"/>
        <rect x="27" y="13" width="4" height="3" fill="#fff"/>
        <rect x="18" y="13" width="3" height="3" fill="#2c1a6e"/>
        <rect x="28" y="13" width="3" height="3" fill="#2c1a6e"/>
        <rect x="19" y="14" width="1" height="1" fill={OL}/>
        <rect x="29" y="14" width="1" height="1" fill={OL}/>
        <rect x="20" y="13" width="1" height="1" fill="#fff"/>
        <rect x="30" y="13" width="1" height="1" fill="#fff"/>
        {/* Bushy eyebrows */}
        <rect x="16" y="12" width="6" height="1" fill="#a0a0ac"/>
        <rect x="26" y="12" width="6" height="1" fill="#a0a0ac"/>
        {/* Nose */}
        <rect x="23" y="16" width="3" height="2" fill="#e8c8a0"/>
        {/* Mustache */}
        <rect x="17" y="18" width="14" height="2" fill="#b0b0bc"/>
        <rect x="18" y="19" width="12" height="1" fill="#c0c0cc"/>
        <rect x="23" y="18" width="2" height="1" fill="#f8d8b4"/>
        {/* Chin */}
        <rect x="15" y="20" width="18" height="1" fill="#e8c8a0"/>
        {/* Neck */}
        <rect x="20" y="21" width="8" height="2" fill="#f8d8b4"/>
        {/* Body outline */}
        <rect x="12" y="23" width="1" height="14" fill={OL}/>
        <rect x="35" y="23" width="1" height="14" fill={OL}/>
        {/* Lab coat */}
        <rect x="13" y="23" width="22" height="14" fill="#e8e8f0"/>
        <rect x="14" y="23" width="20" height="2" fill="#f0f0f8"/>
        <rect x="13" y="34" width="22" height="3" fill="#d0d0dc"/>
        {/* Coat lapels */}
        <rect x="19" y="23" width="4" height="8" fill="#d0d0dc"/>
        <rect x="25" y="23" width="4" height="8" fill="#d0d0dc"/>
        {/* Shirt underneath */}
        <rect x="21" y="24" width="6" height="6" fill="#7b48a8"/>
        <rect x="23" y="24" width="2" height="5" fill="#6a3898"/>
        {/* Bow tie */}
        <rect x="22" y="23" width="4" height="2" fill="#9b59b6"/>
        <rect x="23" y="23" width="2" height="1" fill="#b06cc8"/>
        {/* Arms */}
        <rect x="9" y="24" width="1" height="10" fill={OL}/>
        <rect x="38" y="24" width="1" height="10" fill={OL}/>
        <rect x="10" y="24" width="3" height="9" fill="#e8e8f0"/>
        <rect x="35" y="24" width="3" height="9" fill="#e8e8f0"/>
        <rect x="10" y="30" width="3" height="3" fill="#d0d0dc"/>
        <rect x="35" y="30" width="3" height="3" fill="#d0d0dc"/>
        {/* Hands */}
        <rect x="9" y="33" width="4" height="3" fill="#f8d8b4"/>
        <rect x="35" y="33" width="4" height="3" fill="#f8d8b4"/>
        <rect x="9" y="36" width="4" height="1" fill={OL}/>
        <rect x="35" y="36" width="4" height="1" fill={OL}/>
        {/* Legs */}
        <rect x="16" y="37" width="6" height="6" fill="#3a3050"/>
        <rect x="26" y="37" width="6" height="6" fill="#3a3050"/>
        <rect x="15" y="37" width="1" height="7" fill={OL}/>
        <rect x="32" y="37" width="1" height="7" fill={OL}/>
        <rect x="22" y="37" width="4" height="6" fill={OL} opacity="0.5"/>
        {/* Shoes */}
        <rect x="14" y="43" width="8" height="3" fill="#3a2820"/>
        <rect x="26" y="43" width="8" height="3" fill="#3a2820"/>
        <rect x="14" y="43" width="8" height="1" fill="#5a4030"/>
        <rect x="26" y="43" width="8" height="1" fill="#5a4030"/>
        <rect x="14" y="46" width="8" height="1" fill={OL}/>
        <rect x="26" y="46" width="8" height="1" fill={OL}/>
        <rect x="13" y="43" width="1" height="4" fill={OL}/>
        <rect x="34" y="43" width="1" height="4" fill={OL}/>
      </g>:type==="guardian"?<g>
        {/* ══ GUARDIAN — Armored Gate Keeper ══ */}
        {/* Helmet outline */}
        <rect x="12" y="1" width="24" height="1" fill={OL}/>
        <rect x="11" y="2" width="1" height="14" fill={OL}/>
        <rect x="36" y="2" width="1" height="14" fill={OL}/>
        {/* Helmet */}
        <rect x="12" y="2" width="24" height="6" fill="#c0a030"/>
        <rect x="13" y="2" width="22" height="2" fill="#e8c840"/>
        <rect x="12" y="7" width="24" height="2" fill="#a08828"/>
        {/* Helmet crest */}
        <rect x="21" y="0" width="6" height="3" fill="#e8c840"/>
        <rect x="22" y="0" width="4" height="1" fill="#fff8c0"/>
        {/* Visor */}
        <rect x="14" y="9" width="20" height="7" fill="#1a1a2e"/>
        <rect x="14" y="9" width="20" height="1" fill="#c0a030"/>
        {/* Eyes behind visor */}
        <rect x="17" y="11" width="4" height="3" fill={GOLD}/>
        <rect x="27" y="11" width="4" height="3" fill={GOLD}/>
        <rect x="18" y="12" width="2" height="1" fill="#fff8c0"/>
        <rect x="28" y="12" width="2" height="1" fill="#fff8c0"/>
        <rect x="19" y="11" width="1" height="1" fill="#fff"/>
        <rect x="29" y="11" width="1" height="1" fill="#fff"/>
        {/* Chin guard */}
        <rect x="16" y="16" width="16" height="2" fill="#a08828"/>
        <rect x="18" y="16" width="12" height="1" fill="#c0a030"/>
        {/* Neck */}
        <rect x="20" y="18" width="8" height="3" fill="#555"/>
        {/* Body outline */}
        <rect x="10" y="21" width="1" height="16" fill={OL}/>
        <rect x="37" y="21" width="1" height="16" fill={OL}/>
        {/* Armor body */}
        <rect x="11" y="21" width="26" height="16" fill="#8b7020"/>
        <rect x="12" y="21" width="24" height="3" fill="#c0a030"/>
        <rect x="11" y="33" width="26" height="4" fill="#7a6018"/>
        {/* Chest plate */}
        <rect x="16" y="24" width="16" height="8" fill="#c0a030"/>
        <rect x="18" y="25" width="12" height="1" fill="#e8c840"/>
        {/* Chest emblem */}
        <rect x="22" y="26" width="4" height="4" fill="#e8c840"/>
        <rect x="23" y="27" width="2" height="2" fill="#fff8c0"/>
        {/* Pauldrons — modest, not giant */}
        <rect x="8" y="21" width="5" height="5" fill="#c0a030"/>
        <rect x="35" y="21" width="5" height="5" fill="#c0a030"/>
        <rect x="9" y="21" width="4" height="2" fill="#e8c840"/>
        <rect x="35" y="21" width="4" height="2" fill="#e8c840"/>
        <rect x="8" y="21" width="1" height="5" fill={OL}/>
        <rect x="40" y="21" width="1" height="5" fill={OL}/>
        <rect x="8" y="26" width="5" height="1" fill={OL}/>
        <rect x="35" y="26" width="5" height="1" fill={OL}/>
        {/* Arms */}
        <rect x="7" y="26" width="1" height="9" fill={OL}/>
        <rect x="40" y="26" width="1" height="9" fill={OL}/>
        <rect x="8" y="26" width="3" height="8" fill="#8b7020"/>
        <rect x="37" y="26" width="3" height="8" fill="#8b7020"/>
        {/* Gauntlets */}
        <rect x="7" y="34" width="4" height="4" fill="#a08828"/>
        <rect x="37" y="34" width="4" height="4" fill="#a08828"/>
        <rect x="7" y="34" width="4" height="1" fill="#c0a030"/>
        <rect x="37" y="34" width="4" height="1" fill="#c0a030"/>
        <rect x="7" y="38" width="4" height="1" fill={OL}/>
        <rect x="37" y="38" width="4" height="1" fill={OL}/>
        {/* Belt */}
        <rect x="11" y="35" width="26" height="2" fill="#5a4010"/>
        <rect x="22" y="35" width="4" height="2" fill="#e8c840"/>
        {/* Legs */}
        <rect x="14" y="37" width="8" height="6" fill="#6a5818"/>
        <rect x="26" y="37" width="8" height="6" fill="#6a5818"/>
        <rect x="13" y="37" width="1" height="7" fill={OL}/>
        <rect x="34" y="37" width="1" height="7" fill={OL}/>
        <rect x="22" y="37" width="4" height="6" fill={OL} opacity="0.5"/>
        {/* Armored boots */}
        <rect x="12" y="43" width="10" height="3" fill="#8b7020"/>
        <rect x="26" y="43" width="10" height="3" fill="#8b7020"/>
        <rect x="12" y="43" width="10" height="1" fill="#a08828"/>
        <rect x="26" y="43" width="10" height="1" fill="#a08828"/>
        <rect x="12" y="46" width="10" height="1" fill={OL}/>
        <rect x="26" y="46" width="10" height="1" fill={OL}/>
        <rect x="11" y="43" width="1" height="4" fill={OL}/>
        <rect x="36" y="43" width="1" height="4" fill={OL}/>
      </g>:type==="cipher"?<g>
        {/* ══ CIPHER — Mysterious Hooded Figure ══ */}
        {/* Hood outline */}
        <rect x="12" y="1" width="24" height="1" fill={OL}/>
        <rect x="10" y="2" width="3" height="1" fill={OL}/>
        <rect x="35" y="2" width="3" height="1" fill={OL}/>
        <rect x="9" y="3" width="2" height="3" fill={OL}/>
        <rect x="36" y="3" width="2" height="4" fill={OL}/>
        <rect x="8" y="6" width="2" height="10" fill={OL}/>
        <rect x="37" y="7" width="2" height="9" fill={OL}/>
        {/* Hood fill */}
        <rect x="12" y="2" width="23" height="4" fill="#34495e"/>
        <rect x="14" y="2" width="18" height="2" fill="#3d5570"/>
        <rect x="11" y="4" width="25" height="4" fill="#2c3e50"/>
        <rect x="10" y="8" width="27" height="8" fill="#2c3e50"/>
        <rect x="10" y="6" width="3" height="6" fill="#243342"/>
        <rect x="34" y="7" width="3" height="6" fill="#243342"/>
        {/* Shadowed face */}
        <rect x="14" y="8" width="20" height="10" fill="#0d0d1a"/>
        {/* Glowing red eyes */}
        <rect x="17" y="11" width="5" height="3" fill="#c0392b"/>
        <rect x="26" y="11" width="5" height="3" fill="#c0392b"/>
        <rect x="18" y="11" width="3" height="2" fill="#e74c3c"/>
        <rect x="27" y="11" width="3" height="2" fill="#e74c3c"/>
        <rect x="19" y="11" width="1" height="1" fill="#ff8888"/>
        <rect x="28" y="11" width="1" height="1" fill="#ff8888"/>
        {/* Mouth slit */}
        <rect x="20" y="15" width="8" height="1" fill="#e74c3c" opacity="0.3"/>
        {/* Cloak body */}
        <rect x="8" y="16" width="1" height="22" fill={OL}/>
        <rect x="39" y="16" width="1" height="22" fill={OL}/>
        <rect x="9" y="16" width="30" height="22" fill="#2c3e50"/>
        <rect x="10" y="17" width="28" height="3" fill="#34495e"/>
        <rect x="9" y="34" width="30" height="4" fill="#243342"/>
        {/* Inner robe */}
        <rect x="19" y="18" width="10" height="16" fill="#1a252f"/>
        <rect x="22" y="18" width="4" height="2" fill="#2c3e50"/>
        {/* Rune on chest */}
        <rect x="22" y="23" width="4" height="4" fill="#c0392b" opacity="0.4"/>
        <rect x="23" y="24" width="2" height="2" fill="#e74c3c" opacity="0.5"/>
        <rect x="21" y="25" width="1" height="1" fill="#c0392b" opacity="0.2"/>
        <rect x="26" y="25" width="1" height="1" fill="#c0392b" opacity="0.2"/>
        {/* Cloak edge trim */}
        <rect x="9" y="16" width="1" height="22" fill="#c0392b" opacity="0.2"/>
        <rect x="38" y="16" width="1" height="22" fill="#c0392b" opacity="0.2"/>
        {/* Hands peeking out */}
        <rect x="7" y="28" width="3" height="3" fill="#d4a574"/>
        <rect x="38" y="28" width="3" height="3" fill="#d4a574"/>
        <rect x="7" y="28" width="3" height="1" fill="#e0b888"/>
        <rect x="38" y="28" width="3" height="1" fill="#e0b888"/>
        {/* Cloak bottom / feet barely visible */}
        <rect x="9" y="38" width="30" height="2" fill="#1a252f"/>
        <rect x="16" y="40" width="6" height="4" fill="#1a252f"/>
        <rect x="26" y="40" width="6" height="4" fill="#1a252f"/>
        <rect x="17" y="43" width="5" height="2" fill="#2c3e50"/>
        <rect x="27" y="43" width="5" height="2" fill="#2c3e50"/>
        <rect x="9" y="38" width="30" height="1" fill={OL}/>
      </g>:type==="iterator"?<g>
        {/* ══ ITERATOR — Clockwork Mechanical Being ══ */}
        {/* Gear head outline */}
        <rect x="12" y="3" width="24" height="1" fill={OL}/>
        <rect x="11" y="4" width="1" height="14" fill={OL}/>
        <rect x="36" y="4" width="1" height="14" fill={OL}/>
        <rect x="12" y="18" width="24" height="1" fill={OL}/>
        {/* Gear teeth */}
        <rect x="16" y="1" width="4" height="3" fill="#5b8faf"/>
        <rect x="28" y="1" width="4" height="3" fill="#5b8faf"/>
        <rect x="16" y="18" width="4" height="3" fill="#4a7090"/>
        <rect x="28" y="18" width="4" height="3" fill="#4a7090"/>
        <rect x="9" y="8" width="3" height="4" fill="#5b8faf"/>
        <rect x="36" y="8" width="3" height="4" fill="#5b8faf"/>
        <rect x="17" y="0" width="2" height="2" fill="#6ba0c0"/>
        <rect x="29" y="0" width="2" height="2" fill="#6ba0c0"/>
        {/* Head fill */}
        <rect x="12" y="4" width="24" height="14" fill="#5b8faf"/>
        <rect x="13" y="4" width="22" height="3" fill="#6ba0c0"/>
        <rect x="12" y="14" width="24" height="4" fill="#4a7090"/>
        {/* Face plate */}
        <rect x="15" y="7" width="18" height="9" fill="#1a2a3a"/>
        {/* Eyes — spinning gear motif */}
        <rect x="17" y="9" width="5" height="5" fill="#3498db"/>
        <rect x="26" y="9" width="5" height="5" fill="#3498db"/>
        <rect x="18" y="10" width="3" height="3" fill="#5dade2"/>
        <rect x="27" y="10" width="3" height="3" fill="#5dade2"/>
        <rect x="19" y="11" width="1" height="1" fill="#aed6f1"/>
        <rect x="28" y="11" width="1" height="1" fill="#aed6f1"/>
        {/* Clock hand lines in eyes */}
        <rect x="19" y="9" width="1" height="3" fill="#1a2a3a" opacity="0.4"/>
        <rect x="28" y="10" width="2" height="1" fill="#1a2a3a" opacity="0.4"/>
        {/* Mouth — ticker */}
        <rect x="20" y="14" width="8" height="1" fill="#3498db" opacity="0.5"/>
        {/* Neck piston */}
        <rect x="21" y="19" width="6" height="3" fill="#4a7090"/>
        <rect x="20" y="19" width="1" height="2" fill={OL}/>
        <rect x="27" y="19" width="1" height="2" fill={OL}/>
        {/* Body outline */}
        <rect x="12" y="22" width="1" height="14" fill={OL}/>
        <rect x="35" y="22" width="1" height="14" fill={OL}/>
        {/* Body — mechanical torso */}
        <rect x="13" y="22" width="22" height="14" fill="#4a7090"/>
        <rect x="14" y="22" width="20" height="3" fill="#5b8faf"/>
        <rect x="13" y="33" width="22" height="3" fill="#3a6080"/>
        {/* Internal gears */}
        <circle cx="19" cy="29" r="3" fill="none" stroke="#3498db" strokeWidth="1" opacity="0.4"/>
        <circle cx="29" cy="29" r="3" fill="none" stroke="#3498db" strokeWidth="1" opacity="0.4"/>
        {/* Center display */}
        <rect x="22" y="27" width="4" height="3" fill="#3498db" opacity="0.3"/>
        <rect x="23" y="28" width="2" height="1" fill="#5dade2" opacity="0.4"/>
        {/* Arms */}
        <rect x="9" y="23" width="1" height="10" fill={OL}/>
        <rect x="38" y="23" width="1" height="10" fill={OL}/>
        <rect x="10" y="23" width="3" height="9" fill="#4a7090"/>
        <rect x="35" y="23" width="3" height="9" fill="#4a7090"/>
        <rect x="10" y="23" width="3" height="2" fill="#5b8faf"/>
        <rect x="35" y="23" width="3" height="2" fill="#5b8faf"/>
        {/* Wrench hands */}
        <rect x="8" y="32" width="4" height="4" fill="#5dade2"/>
        <rect x="36" y="32" width="4" height="4" fill="#5dade2"/>
        <rect x="8" y="36" width="4" height="1" fill={OL}/>
        <rect x="36" y="36" width="4" height="1" fill={OL}/>
        {/* Legs */}
        <rect x="15" y="36" width="7" height="6" fill="#3a6080"/>
        <rect x="26" y="36" width="7" height="6" fill="#3a6080"/>
        <rect x="14" y="36" width="1" height="7" fill={OL}/>
        <rect x="33" y="36" width="1" height="7" fill={OL}/>
        <rect x="22" y="36" width="4" height="6" fill={OL} opacity="0.5"/>
        {/* Feet */}
        <rect x="13" y="42" width="9" height="4" fill="#2c5270"/>
        <rect x="26" y="42" width="9" height="4" fill="#2c5270"/>
        <rect x="13" y="42" width="9" height="1" fill="#3a6888"/>
        <rect x="26" y="42" width="9" height="1" fill="#3a6888"/>
        <rect x="13" y="46" width="9" height="1" fill={OL}/>
        <rect x="26" y="46" width="9" height="1" fill={OL}/>
        <rect x="12" y="42" width="1" height="5" fill={OL}/>
        <rect x="35" y="42" width="1" height="5" fill={OL}/>
      </g>:type==="index"?<g>
        {/* ══ INDEX — Owl Archivist ══ */}
        {/* Ear tufts */}
        <rect x="10" y="0" width="4" height="6" fill="#1abc9c"/>
        <rect x="11" y="0" width="2" height="3" fill="#2ed8b6"/>
        <rect x="34" y="0" width="4" height="6" fill="#1abc9c"/>
        <rect x="35" y="0" width="2" height="3" fill="#2ed8b6"/>
        <rect x="9" y="0" width="1" height="6" fill={OL}/>
        <rect x="14" y="0" width="1" height="4" fill={OL}/>
        <rect x="33" y="0" width="1" height="4" fill={OL}/>
        <rect x="38" y="0" width="1" height="6" fill={OL}/>
        {/* Head outline */}
        <rect x="11" y="5" width="1" height="16" fill={OL}/>
        <rect x="36" y="5" width="1" height="16" fill={OL}/>
        <rect x="12" y="4" width="24" height="1" fill={OL}/>
        <rect x="12" y="21" width="24" height="1" fill={OL}/>
        {/* Head */}
        <rect x="12" y="5" width="24" height="16" fill="#16a085"/>
        <rect x="13" y="5" width="22" height="3" fill="#1abc9c"/>
        {/* Facial disc */}
        <rect x="14" y="8" width="20" height="10" fill="#2ed8b6"/>
        <rect x="15" y="9" width="18" height="8" fill="#48e8cc"/>
        {/* Big owl eyes */}
        <rect x="15" y="9" width="7" height="7" fill="#0a1a2a"/>
        <rect x="26" y="9" width="7" height="7" fill="#0a1a2a"/>
        <rect x="16" y="10" width="5" height="5" fill="#f1c40f"/>
        <rect x="27" y="10" width="5" height="5" fill="#f1c40f"/>
        <rect x="17" y="11" width="3" height="3" fill="#f39c12"/>
        <rect x="28" y="11" width="3" height="3" fill="#f39c12"/>
        <rect x="18" y="11" width="1" height="1" fill={OL}/>
        <rect x="29" y="11" width="1" height="1" fill={OL}/>
        <rect x="17" y="10" width="1" height="1" fill="#fff"/>
        <rect x="28" y="10" width="1" height="1" fill="#fff"/>
        {/* Spectacles */}
        <rect x="15" y="9" width="7" height="7" fill="none" stroke="#c0a030" strokeWidth="1" opacity="0.6"/>
        <rect x="26" y="9" width="7" height="7" fill="none" stroke="#c0a030" strokeWidth="1" opacity="0.6"/>
        <rect x="22" y="12" width="4" height="1" fill="#c0a030" opacity="0.5"/>
        {/* Beak */}
        <rect x="22" y="16" width="4" height="3" fill="#e67e22"/>
        <rect x="23" y="17" width="2" height="2" fill="#d35400"/>
        <rect x="22" y="16" width="4" height="1" fill="#f0a030"/>
        {/* Body */}
        <rect x="13" y="22" width="1" height="14" fill={OL}/>
        <rect x="34" y="22" width="1" height="14" fill={OL}/>
        <rect x="14" y="22" width="20" height="14" fill="#16a085"/>
        <rect x="16" y="23" width="16" height="10" fill="#1abc9c"/>
        {/* Belly feather pattern */}
        <rect x="19" y="25" width="10" height="1" fill="#2ed8b6" opacity="0.4"/>
        <rect x="18" y="28" width="12" height="1" fill="#2ed8b6" opacity="0.3"/>
        <rect x="19" y="31" width="10" height="1" fill="#2ed8b6" opacity="0.2"/>
        {/* Wings folded */}
        <rect x="8" y="22" width="6" height="12" fill="#0e8c6e"/>
        <rect x="34" y="22" width="6" height="12" fill="#0e8c6e"/>
        <rect x="9" y="23" width="4" height="9" fill="#16a085"/>
        <rect x="35" y="23" width="4" height="9" fill="#16a085"/>
        <rect x="7" y="22" width="1" height="13" fill={OL}/>
        <rect x="40" y="22" width="1" height="13" fill={OL}/>
        {/* Wing tips */}
        <rect x="7" y="33" width="6" height="3" fill="#0a7a5e"/>
        <rect x="35" y="33" width="6" height="3" fill="#0a7a5e"/>
        <rect x="7" y="35" width="6" height="1" fill={OL}/>
        <rect x="35" y="35" width="6" height="1" fill={OL}/>
        {/* Talons */}
        <rect x="15" y="36" width="6" height="4" fill="#e67e22"/>
        <rect x="27" y="36" width="6" height="4" fill="#e67e22"/>
        <rect x="14" y="39" width="3" height="3" fill="#d35400"/>
        <rect x="19" y="39" width="3" height="3" fill="#d35400"/>
        <rect x="26" y="39" width="3" height="3" fill="#d35400"/>
        <rect x="31" y="39" width="3" height="3" fill="#d35400"/>
        <rect x="22" y="37" width="4" height="3" fill={OL} opacity="0.4"/>
      </g>:type==="forge"?<g>
        {/* ══ FORGE — Fire Elemental Blacksmith ══ */}
        {/* Flame crown */}
        <rect x="17" y="0" width="3" height="4" fill="#ff6b35"/>
        <rect x="21" y="0" width="4" height="6" fill="#ff4500"/>
        <rect x="27" y="0" width="3" height="3" fill="#ff6b35"/>
        <rect x="18" y="0" width="1" height="2" fill="#ffd700"/>
        <rect x="22" y="0" width="2" height="3" fill="#ffd700"/>
        <rect x="28" y="0" width="1" height="1" fill="#ffd700"/>
        {/* Head outline */}
        <rect x="13" y="5" width="1" height="13" fill={OL}/>
        <rect x="34" y="5" width="1" height="13" fill={OL}/>
        <rect x="14" y="4" width="20" height="1" fill={OL}/>
        <rect x="14" y="18" width="20" height="1" fill={OL}/>
        {/* Head — molten */}
        <rect x="14" y="5" width="20" height="13" fill="#c0392b"/>
        <rect x="15" y="5" width="18" height="4" fill="#e74c3c"/>
        <rect x="14" y="15" width="20" height="3" fill="#922b21"/>
        {/* Eyes — fiery */}
        <rect x="17" y="9" width="5" height="4" fill="#ff6b35"/>
        <rect x="26" y="9" width="5" height="4" fill="#ff6b35"/>
        <rect x="18" y="10" width="3" height="2" fill="#ffd700"/>
        <rect x="27" y="10" width="3" height="2" fill="#ffd700"/>
        <rect x="19" y="10" width="1" height="1" fill="#fff"/>
        <rect x="28" y="10" width="1" height="1" fill="#fff"/>
        {/* Mouth — furnace */}
        <rect x="20" y="14" width="8" height="2" fill="#ff4500"/>
        <rect x="21" y="14" width="6" height="1" fill="#ffd700"/>
        {/* Neck */}
        <rect x="20" y="19" width="8" height="2" fill="#922b21"/>
        {/* Body outline */}
        <rect x="11" y="21" width="1" height="16" fill={OL}/>
        <rect x="36" y="21" width="1" height="16" fill={OL}/>
        {/* Leather apron over body */}
        <rect x="12" y="21" width="24" height="16" fill="#3d2215"/>
        <rect x="13" y="21" width="22" height="3" fill="#4a3020"/>
        <rect x="12" y="34" width="24" height="3" fill="#2c1810"/>
        {/* Apron front */}
        <rect x="17" y="22" width="14" height="12" fill="#1a0e08"/>
        <rect x="17" y="22" width="14" height="1" fill="#ff4500" opacity="0.25"/>
        {/* Forge glow on apron */}
        <rect x="22" y="27" width="4" height="3" fill="#ff4500" opacity="0.15"/>
        <rect x="23" y="28" width="2" height="1" fill="#ffd700" opacity="0.2"/>
        {/* Arms — muscular, glowing cracks */}
        <rect x="8" y="22" width="1" height="10" fill={OL}/>
        <rect x="39" y="22" width="1" height="10" fill={OL}/>
        <rect x="9" y="22" width="3" height="9" fill="#c0392b"/>
        <rect x="36" y="22" width="3" height="9" fill="#c0392b"/>
        <rect x="10" y="25" width="1" height="4" fill="#ff6b35" opacity="0.3"/>
        <rect x="37" y="25" width="1" height="4" fill="#ff6b35" opacity="0.3"/>
        {/* Hands */}
        <rect x="8" y="31" width="4" height="4" fill="#e74c3c"/>
        <rect x="36" y="31" width="4" height="4" fill="#e74c3c"/>
        <rect x="8" y="31" width="4" height="1" fill="#ff6b35"/>
        <rect x="36" y="31" width="4" height="1" fill="#ff6b35"/>
        <rect x="8" y="35" width="4" height="1" fill={OL}/>
        <rect x="36" y="35" width="4" height="1" fill={OL}/>
        {/* Hammer in left hand */}
        <rect x="5" y="28" width="3" height="8" fill="#8B8000"/>
        <rect x="3" y="26" width="7" height="4" fill="#aaa"/>
        <rect x="4" y="27" width="5" height="2" fill="#ccc"/>
        {/* Legs */}
        <rect x="15" y="37" width="7" height="6" fill="#2c1810"/>
        <rect x="26" y="37" width="7" height="6" fill="#2c1810"/>
        <rect x="14" y="37" width="1" height="7" fill={OL}/>
        <rect x="33" y="37" width="1" height="7" fill={OL}/>
        <rect x="22" y="37" width="4" height="6" fill={OL} opacity="0.5"/>
        {/* Iron boots */}
        <rect x="13" y="43" width="9" height="3" fill="#555"/>
        <rect x="26" y="43" width="9" height="3" fill="#555"/>
        <rect x="13" y="43" width="9" height="1" fill="#777"/>
        <rect x="26" y="43" width="9" height="1" fill="#777"/>
        <rect x="13" y="46" width="9" height="1" fill={OL}/>
        <rect x="26" y="46" width="9" height="1" fill={OL}/>
        <rect x="12" y="43" width="1" height="4" fill={OL}/>
        <rect x="35" y="43" width="1" height="4" fill={OL}/>
      </g>:type==="cartographer"?<g>
        {/* ══ CARTOGRAPHER — Wise Turtle ══ */}
        {/* Shell outline */}
        <rect x="9" y="8" width="1" height="18" fill={OL}/>
        <rect x="38" y="8" width="1" height="18" fill={OL}/>
        <rect x="10" y="7" width="28" height="1" fill={OL}/>
        <rect x="10" y="26" width="28" height="1" fill={OL}/>
        {/* Shell dome */}
        <rect x="10" y="8" width="28" height="18" fill="#8b6914"/>
        <rect x="11" y="8" width="26" height="4" fill="#a07818"/>
        <rect x="10" y="22" width="28" height="4" fill="#6d4c2a"/>
        {/* Shell pattern — map lines */}
        <rect x="14" y="11" width="20" height="1" fill="#6d4c2a" opacity="0.6"/>
        <rect x="12" y="15" width="24" height="1" fill="#6d4c2a" opacity="0.5"/>
        <rect x="14" y="19" width="20" height="1" fill="#6d4c2a" opacity="0.4"/>
        <rect x="22" y="10" width="1" height="12" fill="#6d4c2a" opacity="0.4"/>
        <rect x="17" y="12" width="1" height="8" fill="#6d4c2a" opacity="0.3"/>
        <rect x="28" y="12" width="1" height="8" fill="#6d4c2a" opacity="0.3"/>
        {/* Map markers on shell */}
        <rect x="19" y="12" width="2" height="2" fill="#e74c3c" opacity="0.5"/>
        <rect x="25" y="16" width="2" height="2" fill="#3498db" opacity="0.4"/>
        <rect x="14" y="18" width="2" height="2" fill="#f39c12" opacity="0.5"/>
        {/* Head */}
        <rect x="16" y="1" width="12" height="8" fill="#6b9b6b"/>
        <rect x="17" y="1" width="10" height="2" fill="#7bab7b"/>
        <rect x="15" y="3" width="14" height="5" fill="#5a8a5a"/>
        <rect x="15" y="1" width="1" height="7" fill={OL}/>
        <rect x="28" y="1" width="1" height="7" fill={OL}/>
        <rect x="16" y="0" width="12" height="1" fill={OL}/>
        {/* Eyes */}
        <rect x="17" y="3" width="4" height="3" fill="#0a1a2a"/>
        <rect x="24" y="3" width="4" height="3" fill="#0a1a2a"/>
        <rect x="18" y="3" width="2" height="2" fill="#f39c12"/>
        <rect x="25" y="3" width="2" height="2" fill="#f39c12"/>
        <rect x="18" y="3" width="1" height="1" fill="#ffd700"/>
        <rect x="25" y="3" width="1" height="1" fill="#ffd700"/>
        {/* Spectacles */}
        <rect x="17" y="3" width="4" height="3" fill="none" stroke="#c0a030" strokeWidth="0.7" opacity="0.5"/>
        <rect x="24" y="3" width="4" height="3" fill="none" stroke="#c0a030" strokeWidth="0.7" opacity="0.5"/>
        {/* Mouth */}
        <rect x="21" y="7" width="4" height="1" fill="#4a7a4a"/>
        {/* Legs */}
        <rect x="8" y="24" width="6" height="8" fill="#5a8a5a"/>
        <rect x="34" y="24" width="6" height="8" fill="#5a8a5a"/>
        <rect x="9" y="25" width="4" height="5" fill="#6b9b6b"/>
        <rect x="35" y="25" width="4" height="5" fill="#6b9b6b"/>
        <rect x="7" y="24" width="1" height="9" fill={OL}/>
        <rect x="40" y="24" width="1" height="9" fill={OL}/>
        {/* Front feet */}
        <rect x="7" y="32" width="7" height="3" fill="#4a7a4a"/>
        <rect x="34" y="32" width="7" height="3" fill="#4a7a4a"/>
        <rect x="7" y="35" width="7" height="1" fill={OL}/>
        <rect x="34" y="35" width="7" height="1" fill={OL}/>
        {/* Back legs */}
        <rect x="12" y="27" width="5" height="10" fill="#5a8a5a"/>
        <rect x="31" y="27" width="5" height="10" fill="#5a8a5a"/>
        <rect x="10" y="36" width="8" height="4" fill="#4a7a4a"/>
        <rect x="30" y="36" width="8" height="4" fill="#4a7a4a"/>
        <rect x="10" y="40" width="8" height="1" fill={OL}/>
        <rect x="30" y="40" width="8" height="1" fill={OL}/>
        {/* Tail */}
        <rect x="37" y="20" width="5" height="3" fill="#5a8a5a"/>
        <rect x="40" y="19" width="3" height="2" fill="#6b9b6b"/>
        {/* Carrying scroll */}
        <rect x="4" y="22" width="5" height="10" fill="#f0e6d2"/>
        <rect x="4" y="22" width="5" height="1" fill="#d4c4a8"/>
        <rect x="4" y="31" width="5" height="1" fill="#d4c4a8"/>
        <rect x="3" y="22" width="1" height="10" fill={OL}/>
        <rect x="9" y="23" width="1" height="8" fill={OL}/>
      </g>:type==="pixel"?<g>
        {/* ══ PIXEL — Retro Arcade Character ══ */}
        {/* Square head outline */}
        <rect x="12" y="2" width="24" height="1" fill={OL}/>
        <rect x="11" y="3" width="1" height="18" fill={OL}/>
        <rect x="36" y="3" width="1" height="18" fill={OL}/>
        <rect x="12" y="21" width="24" height="1" fill={OL}/>
        {/* Head — CRT monitor style */}
        <rect x="12" y="3" width="24" height="18" fill="#e91e63"/>
        <rect x="13" y="3" width="22" height="4" fill="#f06292"/>
        <rect x="12" y="17" width="24" height="4" fill="#c2185b"/>
        {/* Screen face */}
        <rect x="14" y="6" width="20" height="12" fill="#1a0020"/>
        <rect x="14" y="6" width="20" height="1" fill="#2a0040"/>
        {/* Eyes — big pixel blocks */}
        <rect x="16" y="9" width="5" height="4" fill="#00e5ff"/>
        <rect x="27" y="9" width="5" height="4" fill="#00e5ff"/>
        <rect x="17" y="10" width="3" height="2" fill="#80f0ff"/>
        <rect x="28" y="10" width="3" height="2" fill="#80f0ff"/>
        <rect x="18" y="10" width="1" height="1" fill="#fff"/>
        <rect x="29" y="10" width="1" height="1" fill="#fff"/>
        {/* Pixel smile */}
        <rect x="19" y="14" width="2" height="1" fill="#00e5ff" opacity="0.6"/>
        <rect x="21" y="15" width="6" height="1" fill="#00e5ff" opacity="0.5"/>
        <rect x="27" y="14" width="2" height="1" fill="#00e5ff" opacity="0.6"/>
        {/* Antenna with joystick */}
        <rect x="23" y="0" width="2" height="3" fill="#aaa"/>
        <rect x="21" y="0" width="6" height="2" fill="#e91e63"/>
        <rect x="22" y="0" width="4" height="1" fill="#f06292"/>
        {/* Body */}
        <rect x="15" y="22" width="1" height="14" fill={OL}/>
        <rect x="32" y="22" width="1" height="14" fill={OL}/>
        <rect x="16" y="22" width="16" height="14" fill="#7b1fa2"/>
        <rect x="17" y="22" width="14" height="3" fill="#9c27b0"/>
        <rect x="16" y="32" width="16" height="4" fill="#6a1b9a"/>
        {/* Jacket detail */}
        <rect x="22" y="22" width="4" height="8" fill="#6a1b9a"/>
        <rect x="23" y="23" width="2" height="6" fill="#4a148c"/>
        {/* D-pad on chest */}
        <rect x="20" y="26" width="3" height="1" fill="#00e5ff" opacity="0.3"/>
        <rect x="21" y="25" width="1" height="3" fill="#00e5ff" opacity="0.3"/>
        <rect x="25" y="25" width="2" height="2" fill="#e91e63" opacity="0.4"/>
        <rect x="28" y="26" width="2" height="2" fill="#e91e63" opacity="0.3"/>
        {/* Arms */}
        <rect x="10" y="23" width="1" height="10" fill={OL}/>
        <rect x="37" y="23" width="1" height="10" fill={OL}/>
        <rect x="11" y="23" width="4" height="9" fill="#7b1fa2"/>
        <rect x="33" y="23" width="4" height="9" fill="#7b1fa2"/>
        <rect x="11" y="23" width="4" height="2" fill="#9c27b0"/>
        <rect x="33" y="23" width="4" height="2" fill="#9c27b0"/>
        {/* Hands — white gloves */}
        <rect x="10" y="32" width="4" height="3" fill="#e0e0e0"/>
        <rect x="34" y="32" width="4" height="3" fill="#e0e0e0"/>
        <rect x="10" y="32" width="4" height="1" fill="#f5f5f5"/>
        <rect x="34" y="32" width="4" height="1" fill="#f5f5f5"/>
        <rect x="10" y="35" width="4" height="1" fill={OL}/>
        <rect x="34" y="35" width="4" height="1" fill={OL}/>
        {/* Legs */}
        <rect x="17" y="36" width="6" height="6" fill="#4a148c"/>
        <rect x="25" y="36" width="6" height="6" fill="#4a148c"/>
        <rect x="16" y="36" width="1" height="7" fill={OL}/>
        <rect x="31" y="36" width="1" height="7" fill={OL}/>
        <rect x="23" y="36" width="2" height="6" fill={OL} opacity="0.5"/>
        {/* Sneakers */}
        <rect x="15" y="42" width="8" height="4" fill="#e91e63"/>
        <rect x="25" y="42" width="8" height="4" fill="#e91e63"/>
        <rect x="15" y="42" width="8" height="1" fill="#f06292"/>
        <rect x="25" y="42" width="8" height="1" fill="#f06292"/>
        <rect x="15" y="45" width="1" height="1" fill="#f06292"/>
        <rect x="25" y="45" width="1" height="1" fill="#f06292"/>
        <rect x="15" y="46" width="8" height="1" fill={OL}/>
        <rect x="25" y="46" width="8" height="1" fill={OL}/>
        <rect x="14" y="42" width="1" height="5" fill={OL}/>
        <rect x="33" y="42" width="1" height="5" fill={OL}/>
      </g>:type==="champion"?<g>
        {/* ══ CHAMPION — Arena Master ══ */}
        {/* Crown */}
        <rect x="14" y="0" width="20" height="5" fill="#ffd700"/>
        <rect x="15" y="0" width="18" height="2" fill="#ffeb3b"/>
        <rect x="16" y="0" width="3" height="1" fill="#fff"/>
        <rect x="29" y="0" width="3" height="1" fill="#fff"/>
        {/* Crown points */}
        <rect x="15" y="0" width="2" height="1" fill="#ffc107"/>
        <rect x="22" y="0" width="4" height="1" fill="#ffc107"/>
        <rect x="31" y="0" width="2" height="1" fill="#ffc107"/>
        {/* Crown gems */}
        <rect x="19" y="2" width="2" height="2" fill="#e74c3c"/>
        <rect x="27" y="2" width="2" height="2" fill="#3498db"/>
        <rect x="23" y="1" width="2" height="2" fill="#2ecc71"/>
        {/* Head outline */}
        <rect x="13" y="5" width="1" height="14" fill={OL}/>
        <rect x="34" y="5" width="1" height="14" fill={OL}/>
        <rect x="14" y="4" width="20" height="1" fill={OL}/>
        <rect x="14" y="19" width="20" height="1" fill={OL}/>
        {/* Face */}
        <rect x="14" y="5" width="20" height="14" fill="#d4a06a"/>
        <rect x="16" y="5" width="16" height="3" fill="#e0b87a"/>
        <rect x="14" y="16" width="20" height="3" fill="#c09060"/>
        {/* Eyes — determined */}
        <rect x="16" y="9" width="5" height="4" fill="#fff"/>
        <rect x="27" y="9" width="5" height="4" fill="#fff"/>
        <rect x="18" y="9" width="3" height="4" fill="#4a2800"/>
        <rect x="29" y="9" width="3" height="4" fill="#4a2800"/>
        <rect x="19" y="10" width="1" height="2" fill={OL}/>
        <rect x="30" y="10" width="1" height="2" fill={OL}/>
        <rect x="18" y="9" width="1" height="1" fill="#fff"/>
        <rect x="29" y="9" width="1" height="1" fill="#fff"/>
        {/* Strong eyebrows */}
        <rect x="16" y="8" width="6" height="1" fill="#3a1a00"/>
        <rect x="26" y="8" width="6" height="1" fill="#3a1a00"/>
        {/* Jaw / chin */}
        <rect x="22" y="15" width="4" height="2" fill="#c09060"/>
        <rect x="20" y="17" width="8" height="1" fill="#b08050"/>
        {/* Scar */}
        <rect x="28" y="12" width="1" height="4" fill="#aa7050"/>
        {/* Confident smile */}
        <rect x="21" y="15" width="6" height="1" fill="#8b5e3c"/>
        {/* Neck */}
        <rect x="20" y="20" width="8" height="2" fill="#d4a06a"/>
        {/* Cape behind body */}
        <rect x="7" y="22" width="6" height="18" fill="#b71c1c"/>
        <rect x="35" y="22" width="6" height="18" fill="#b71c1c"/>
        <rect x="8" y="23" width="4" height="14" fill="#d32f2f"/>
        <rect x="36" y="23" width="4" height="14" fill="#d32f2f"/>
        <rect x="7" y="40" width="6" height="3" fill="#8b0000"/>
        <rect x="35" y="40" width="6" height="3" fill="#8b0000"/>
        <rect x="6" y="22" width="1" height="21" fill={OL}/>
        <rect x="41" y="22" width="1" height="21" fill={OL}/>
        {/* Body outline */}
        <rect x="12" y="22" width="1" height="16" fill={OL}/>
        <rect x="35" y="22" width="1" height="16" fill={OL}/>
        {/* Armor body */}
        <rect x="13" y="22" width="22" height="16" fill="#455a64"/>
        <rect x="14" y="22" width="20" height="3" fill="#546e7a"/>
        <rect x="13" y="35" width="22" height="3" fill="#37474f"/>
        {/* Chest plate */}
        <rect x="17" y="25" width="14" height="8" fill="#546e7a"/>
        <rect x="19" y="26" width="10" height="6" fill="#607d8b"/>
        {/* Champion emblem */}
        <rect x="22" y="27" width="4" height="4" fill="#ffd700"/>
        <rect x="23" y="28" width="2" height="2" fill="#ffeb3b"/>
        <rect x="21" y="28" width="1" height="2" fill="#ffc107" opacity="0.5"/>
        <rect x="26" y="28" width="1" height="2" fill="#ffc107" opacity="0.5"/>
        <rect x="23" y="26" width="2" height="1" fill="#ffc107" opacity="0.5"/>
        <rect x="23" y="31" width="2" height="1" fill="#ffc107" opacity="0.5"/>
        {/* Belt */}
        <rect x="13" y="36" width="22" height="2" fill="#3e2723"/>
        <rect x="22" y="36" width="4" height="2" fill="#ffd700"/>
        <rect x="23" y="36" width="2" height="1" fill="#ffeb3b"/>
        {/* Legs */}
        <rect x="15" y="38" width="7" height="6" fill="#37474f"/>
        <rect x="26" y="38" width="7" height="6" fill="#37474f"/>
        <rect x="14" y="38" width="1" height="7" fill={OL}/>
        <rect x="33" y="38" width="1" height="7" fill={OL}/>
        <rect x="22" y="38" width="4" height="6" fill={OL} opacity="0.5"/>
        {/* Armored boots */}
        <rect x="13" y="44" width="9" height="3" fill="#455a64"/>
        <rect x="26" y="44" width="9" height="3" fill="#455a64"/>
        <rect x="13" y="44" width="9" height="1" fill="#546e7a"/>
        <rect x="26" y="44" width="9" height="1" fill="#546e7a"/>
        <rect x="13" y="47" width="9" height="1" fill={OL}/>
        <rect x="26" y="47" width="9" height="1" fill={OL}/>
        <rect x="12" y="44" width="1" height="4" fill={OL}/>
        <rect x="35" y="44" width="1" height="4" fill={OL}/>
      </g>:type==="wrench"?<g>
        {/* ══ WRENCH — The Dockmaster ══ */}
        {/* Hard hat */}
        <rect x="13" y="2" width="22" height="8" fill="#ff9800"/>
        <rect x="14" y="2" width="20" height="3" fill="#ffb74d"/>
        <rect x="11" y="9" width="26" height="2" fill="#f57c00"/>
        <rect x="12" y="1" width="24" height="1" fill={OL}/>
        <rect x="11" y="9" width="26" height="1" fill={OL} opacity="0.6"/>
        {/* Lamp on hat */}
        <rect x="22" y="0" width="4" height="3" fill="#e0e0e0"/>
        <rect x="23" y="0" width="2" height="1" fill="#ffeb3b"/>
        {/* Head */}
        <rect x="13" y="10" width="22" height="12" fill="#8d6e63"/>
        <rect x="14" y="10" width="20" height="3" fill="#a1887f"/>
        <rect x="13" y="19" width="22" height="3" fill="#795548"/>
        <rect x="12" y="10" width="1" height="12" fill={OL}/>
        <rect x="35" y="10" width="1" height="12" fill={OL}/>
        {/* Eyes — goggles */}
        <rect x="15" y="12" width="7" height="5" fill="#37474f"/>
        <rect x="26" y="12" width="7" height="5" fill="#37474f"/>
        <rect x="16" y="13" width="5" height="3" fill="#80cbc4"/>
        <rect x="27" y="13" width="5" height="3" fill="#80cbc4"/>
        <rect x="18" y="14" width="1" height="1" fill="#fff"/>
        <rect x="29" y="14" width="1" height="1" fill="#fff"/>
        <rect x="22" y="13" width="4" height="2" fill="#546e7a"/>
        {/* Smile */}
        <rect x="20" y="18" width="8" height="1" fill="#5d4037"/>
        <rect x="21" y="19" width="6" height="1" fill="#4e342e"/>
        {/* Neck */}
        <rect x="20" y="22" width="8" height="2" fill="#8d6e63"/>
        {/* Overalls body */}
        <rect x="13" y="24" width="22" height="14" fill="#1565c0"/>
        <rect x="14" y="24" width="20" height="3" fill="#1976d2"/>
        <rect x="13" y="35" width="22" height="3" fill="#0d47a1"/>
        <rect x="12" y="24" width="1" height="14" fill={OL}/>
        <rect x="35" y="24" width="1" height="14" fill={OL}/>
        {/* Overall straps */}
        <rect x="17" y="24" width="3" height="6" fill="#1976d2"/>
        <rect x="28" y="24" width="3" height="6" fill="#1976d2"/>
        <rect x="18" y="24" width="1" height="4" fill="#42a5f5"/>
        <rect x="29" y="24" width="1" height="4" fill="#42a5f5"/>
        {/* Pocket */}
        <rect x="20" y="30" width="8" height="5" fill="#0d47a1"/>
        <rect x="21" y="31" width="6" height="3" fill="#1565c0"/>
        <rect x="22" y="31" width="2" height="3" fill="#ff9800" opacity="0.5"/>
        {/* Arms */}
        <rect x="8" y="25" width="4" height="9" fill="#1565c0"/>
        <rect x="36" y="25" width="4" height="9" fill="#1565c0"/>
        <rect x="7" y="25" width="1" height="10" fill={OL}/>
        <rect x="40" y="25" width="1" height="10" fill={OL}/>
        {/* Gloves */}
        <rect x="7" y="34" width="5" height="4" fill="#ff9800"/>
        <rect x="36" y="34" width="5" height="4" fill="#ff9800"/>
        <rect x="7" y="34" width="5" height="1" fill="#ffb74d"/>
        <rect x="36" y="34" width="5" height="1" fill="#ffb74d"/>
        {/* Wrench in hand */}
        <rect x="37" y="30" width="2" height="10" fill="#90a4ae"/>
        <rect x="36" y="28" width="4" height="3" fill="#78909c"/>
        <rect x="37" y="29" width="2" height="1" fill="#b0bec5"/>
        {/* Legs */}
        <rect x="15" y="38" width="7" height="6" fill="#0d47a1"/>
        <rect x="26" y="38" width="7" height="6" fill="#0d47a1"/>
        <rect x="14" y="38" width="1" height="7" fill={OL}/>
        <rect x="33" y="38" width="1" height="7" fill={OL}/>
        <rect x="22" y="38" width="4" height="6" fill={OL} opacity="0.5"/>
        {/* Work boots */}
        <rect x="13" y="44" width="9" height="3" fill="#5d4037"/>
        <rect x="26" y="44" width="9" height="3" fill="#5d4037"/>
        <rect x="13" y="44" width="9" height="1" fill="#6d4c41"/>
        <rect x="26" y="44" width="9" height="1" fill="#6d4c41"/>
        <rect x="13" y="47" width="9" height="1" fill={OL}/>
        <rect x="26" y="47" width="9" height="1" fill={OL}/>
        <rect x="12" y="44" width="1" height="4" fill={OL}/>
        <rect x="35" y="44" width="1" height="4" fill={OL}/>
      </g>:type==="navigator"?<g>
        {/* ══ NAVIGATOR — Mission Control ══ */}
        {/* Headset */}
        <rect x="10" y="5" width="28" height="2" fill="#37474f"/>
        <rect x="10" y="5" width="3" height="10" fill="#37474f"/>
        <rect x="35" y="5" width="3" height="10" fill="#37474f"/>
        <rect x="8" y="12" width="5" height="5" fill="#455a64"/>
        <rect x="9" y="13" width="3" height="3" fill="#00e676"/>
        <rect x="35" y="12" width="5" height="5" fill="#455a64"/>
        <rect x="36" y="13" width="3" height="3" fill="#00e676"/>
        {/* Hair — short dark */}
        <rect x="13" y="3" width="22" height="5" fill="#263238"/>
        <rect x="14" y="2" width="20" height="3" fill="#37474f"/>
        {/* Head */}
        <rect x="13" y="7" width="22" height="14" fill="#d4a06a"/>
        <rect x="14" y="7" width="20" height="3" fill="#e0b87a"/>
        <rect x="13" y="18" width="22" height="3" fill="#c09060"/>
        <rect x="12" y="7" width="1" height="14" fill={OL}/>
        <rect x="35" y="7" width="1" height="14" fill={OL}/>
        {/* Eyes — focused */}
        <rect x="16" y="11" width="5" height="4" fill="#fff"/>
        <rect x="27" y="11" width="5" height="4" fill="#fff"/>
        <rect x="18" y="11" width="3" height="4" fill="#1b5e20"/>
        <rect x="29" y="11" width="3" height="4" fill="#1b5e20"/>
        <rect x="19" y="12" width="1" height="2" fill={OL}/>
        <rect x="30" y="12" width="1" height="2" fill={OL}/>
        <rect x="18" y="11" width="1" height="1" fill="#fff"/>
        <rect x="29" y="11" width="1" height="1" fill="#fff"/>
        {/* Eyebrows */}
        <rect x="16" y="10" width="5" height="1" fill="#263238"/>
        <rect x="27" y="10" width="5" height="1" fill="#263238"/>
        {/* Mouth — determined */}
        <rect x="21" y="17" width="6" height="1" fill="#a07050"/>
        {/* Mic boom */}
        <rect x="8" y="16" width="12" height="1" fill="#455a64"/>
        <rect x="8" y="16" width="2" height="2" fill="#00e676"/>
        {/* Neck */}
        <rect x="20" y="21" width="8" height="2" fill="#d4a06a"/>
        {/* Flight suit body */}
        <rect x="13" y="23" width="22" height="15" fill="#263238"/>
        <rect x="14" y="23" width="20" height="3" fill="#37474f"/>
        <rect x="13" y="35" width="22" height="3" fill="#1a1a2e"/>
        <rect x="12" y="23" width="1" height="15" fill={OL}/>
        <rect x="35" y="23" width="1" height="15" fill={OL}/>
        {/* Suit details — patches and zippers */}
        <rect x="23" y="23" width="2" height="10" fill="#455a64"/>
        <rect x="16" y="25" width="6" height="4" fill="#00e676" opacity="0.15"/>
        <rect x="17" y="26" width="4" height="2" fill="#00e676" opacity="0.3"/>
        <rect x="28" y="26" width="5" height="4" fill="#ff9800" opacity="0.15"/>
        {/* Belt */}
        <rect x="13" y="36" width="22" height="2" fill="#455a64"/>
        <rect x="22" y="36" width="4" height="2" fill="#00e676"/>
        {/* Arms */}
        <rect x="8" y="24" width="4" height="10" fill="#263238"/>
        <rect x="36" y="24" width="4" height="10" fill="#263238"/>
        <rect x="7" y="24" width="1" height="11" fill={OL}/>
        <rect x="40" y="24" width="1" height="11" fill={OL}/>
        <rect x="8" y="24" width="4" height="2" fill="#37474f"/>
        <rect x="36" y="24" width="4" height="2" fill="#37474f"/>
        {/* Hands */}
        <rect x="7" y="34" width="5" height="3" fill="#d4a06a"/>
        <rect x="36" y="34" width="5" height="3" fill="#d4a06a"/>
        {/* Legs */}
        <rect x="15" y="38" width="7" height="6" fill="#1a1a2e"/>
        <rect x="26" y="38" width="7" height="6" fill="#1a1a2e"/>
        <rect x="14" y="38" width="1" height="7" fill={OL}/>
        <rect x="33" y="38" width="1" height="7" fill={OL}/>
        <rect x="22" y="38" width="4" height="6" fill={OL} opacity="0.5"/>
        {/* Boots */}
        <rect x="13" y="44" width="9" height="3" fill="#37474f"/>
        <rect x="26" y="44" width="9" height="3" fill="#37474f"/>
        <rect x="13" y="44" width="9" height="1" fill="#455a64"/>
        <rect x="26" y="44" width="9" height="1" fill="#455a64"/>
        <rect x="13" y="47" width="9" height="1" fill={OL}/>
        <rect x="26" y="47" width="9" height="1" fill={OL}/>
        <rect x="12" y="44" width="1" height="4" fill={OL}/>
        <rect x="35" y="44" width="1" height="4" fill={OL}/>
      </g>:<g>
        {/* ══ GENERIC FALLBACK ══ */}
        <rect x="14" y="5" width="20" height="14" fill="#999"/>
        <rect x="13" y="5" width="1" height="14" fill={OL}/>
        <rect x="34" y="5" width="1" height="14" fill={OL}/>
        <rect x="17" y="10" width="4" height="3" fill="#333"/>
        <rect x="27" y="10" width="4" height="3" fill="#333"/>
        <rect x="12" y="22" width="24" height="14" fill="#777"/>
        <rect x="11" y="22" width="1" height="14" fill={OL}/>
        <rect x="36" y="22" width="1" height="14" fill={OL}/>
        <rect x="16" y="36" width="6" height="8" fill="#555"/>
        <rect x="26" y="36" width="6" height="8" fill="#555"/>
      </g>}
    </svg>
  );
}

function SceneBanner({ scene }) {
  const themes = {
    terminal:{bg:"#0d1117",ac:ACCENT,ground:"#0a1a2a",wall:"#121d2e"},
    vault:{bg:"#1a0d2a",ac:"#9b59b6",ground:"#12081e",wall:"#231040"},
    crossroads:{bg:"#0d1b0d",ac:"#2ecc71",ground:"#0a150a",wall:"#1a2e1a"},
    boss:{bg:"#2a0d0d",ac:"#ff4500",ground:"#1a0808",wall:"#301515"},
    tower:{bg:"#0d1520",ac:"#3498db",ground:"#0a1018",wall:"#152535"},
    archives:{bg:"#0d1a1a",ac:"#1abc9c",ground:"#081414",wall:"#122828"},
    forge:{bg:"#1a0808",ac:"#ff4500",ground:"#120505",wall:"#2a1010"},
    maproom:{bg:"#1a1508",ac:"#f39c12",ground:"#14100a",wall:"#2a2010"},
    summit:{bg:"#0a0a1a",ac:"#9b59b6",ground:"#08081a",wall:"#151530"},
    workshop:{bg:"#1a0820",ac:"#e91e63",ground:"#120518",wall:"#2a1030"},
    colosseum:{bg:"#1a1008",ac:"#ff5722",ground:"#14100a",wall:"#2a1a10"},
    drydock:{bg:"#0d1518",ac:"#ff9800",ground:"#0a1010",wall:"#1a2520"},
    launchpad:{bg:"#080d1a",ac:"#00e676",ground:"#060a14",wall:"#101a30"}
  };
  const t = themes[scene]||themes.terminal;
  return (
    <svg width="100%" height="140" viewBox="0 0 320 140" preserveAspectRatio="xMidYMid slice" style={{imageRendering:"pixelated",borderRadius:"12px",display:"block"}}>
      <defs>
        <linearGradient id={`sky_${scene}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.bg}/>
          <stop offset="100%" stopColor={t.wall}/>
        </linearGradient>
      </defs>
      {/* Sky */}
      <rect width="320" height="140" fill={`url(#sky_${scene})`}/>
      {/* Stars */}
      {[...Array(25)].map((_,i)=> <rect key={`s${i}`} x={7+i*13+(i%5)*3} y={3+(i*17)%50} width={i%4===0?"2":"1"} height={i%4===0?"2":"1"} fill={t.ac} opacity={0.1+((i%4)*0.1)}/>)}

      {scene==="terminal"&&<g>
        {/* Back wall with circuit patterns */}
        <rect x="0" y="40" width="320" height="60" fill={t.wall}/>
        {/* Circuit traces on wall */}
        {[20,60,100,140,200,240,280].map((x,i)=> <rect key={`c${i}`} x={x} y={45+((i*7)%20)} width={15+i*3%20} height="1" fill={t.ac} opacity="0.15"/>)}
        {[30,80,160,220,270].map((x,i)=> <rect key={`cv${i}`} x={x} y={44} width="1" height={8+i*2%12} fill={t.ac} opacity="0.12"/>)}
        {/* Main terminal — large CRT monitor */}
        <rect x="112" y="30" width="96" height="62" fill="#1a2a3a" rx="2"/>
        <rect x="116" y="34" width="88" height="50" fill="#0a0a14" rx="1"/>
        {/* Screen content — code lines */}
        <rect x="122" y="40" width="40" height="3" fill={t.ac} opacity="0.8"/>
        <rect x="122" y="47" width="55" height="3" fill={t.ac} opacity="0.5"/>
        <rect x="122" y="54" width="30" height="3" fill={t.ac} opacity="0.6"/>
        <rect x="122" y="61" width="48" height="3" fill={t.ac} opacity="0.4"/>
        <rect x="122" y="68" width="20" height="3" fill={t.ac}/>
        {/* Cursor blink */}
        <rect x="144" y="68" width="6" height="3" fill={t.ac} opacity="0.9"/>
        {/* Monitor stand */}
        <rect x="145" y="92" width="30" height="6" fill="#1a2a3a"/>
        <rect x="138" y="98" width="44" height="4" fill="#1a2a3a"/>
        {/* Side monitors */}
        <rect x="30" y="44" width="50" height="38" fill="#162636"/>
        <rect x="33" y="47" width="44" height="30" fill="#0a0a14"/>
        <rect x="37" y="51" width="20" height="2" fill={t.ac} opacity="0.3"/>
        <rect x="37" y="56" width="30" height="2" fill={t.ac} opacity="0.2"/>
        <rect x="240" y="44" width="50" height="38" fill="#162636"/>
        <rect x="243" y="47" width="44" height="30" fill="#0a0a14"/>
        <rect x="247" y="51" width="25" height="2" fill={t.ac} opacity="0.25"/>
        {/* Floor */}
        <rect x="0" y="100" width="320" height="40" fill={t.ground}/>
        {/* Floor tiles */}
        {[0,40,80,120,160,200,240,280].map((x,i)=> <rect key={`ft${i}`} x={x} y="100" width="40" height="40" fill="none" stroke={t.ac} strokeWidth="0.3" opacity="0.15"/>)}
        {/* Keyboard on desk */}
        <rect x="128" y="104" width="64" height="8" fill="#2a3a4a" rx="1"/>
        {[0,1,2,3,4,5,6,7,8].map((k,i)=> <rect key={`k${i}`} x={132+i*6} y="106" width="4" height="4" fill="#3a4a5a" rx="0.5"/>)}
      </g>}

      {scene==="vault"&&<g>
        {/* Stone walls */}
        <rect x="0" y="20" width="320" height="80" fill={t.wall}/>
        {/* Stone blocks pattern */}
        {[...Array(8)].map((_,r)=>[...Array(8)].map((_,c)=> <rect key={`b${r}${c}`} x={c*42-((r%2)*21)} y={22+r*10} width="40" height="9" fill="none" stroke="#ffffff" strokeWidth="0.3" opacity="0.08"/>))}
        {/* Vault door — large circular */}
        <rect x="110" y="18" width="100" height="84" fill="#231040" stroke={t.ac} strokeWidth="2" rx="4"/>
        {/* Door inner frame */}
        <rect x="118" y="26" width="84" height="68" fill="#1a0830"/>
        {/* Vault wheel */}
        <circle cx="160" cy="58" r="20" fill="none" stroke={t.ac} strokeWidth="2.5"/>
        <circle cx="160" cy="58" r="14" fill="none" stroke={t.ac} strokeWidth="1" opacity="0.5"/>
        <circle cx="160" cy="58" r="4" fill={t.ac} opacity="0.7"/>
        {/* Wheel spokes */}
        <rect x="159" y="38" width="2" height="40" fill={t.ac} opacity="0.4"/>
        <rect x="140" y="57" width="40" height="2" fill={t.ac} opacity="0.4"/>
        {/* Lock bolts */}
        {[30,46,70,86].map((y,i)=> <g key={`lb${i}`}><rect x="114" y={y} width="8" height="6" fill="#3a1a5a" rx="1"/><rect x="198" y={y} width="8" height="6" fill="#3a1a5a" rx="1"/></g>)}
        {/* Glowing runes on walls */}
        {[30,70,240,270].map((x,i)=> <rect key={`r${i}`} x={x} y={35+i*8} width="6" height="8" fill={t.ac} opacity={0.1+i*0.05}/>)}
        {/* Torch left */}
        <rect x="40" y="30" width="6" height="20" fill="#5a3a1a"/>
        <rect x="38" y="24" width="10" height="8" fill="#ff8c00" opacity="0.6"/>
        <rect x="40" y="22" width="6" height="4" fill="#ffcc00" opacity="0.5"/>
        {/* Torch right */}
        <rect x="274" y="30" width="6" height="20" fill="#5a3a1a"/>
        <rect x="272" y="24" width="10" height="8" fill="#ff8c00" opacity="0.6"/>
        <rect x="274" y="22" width="6" height="4" fill="#ffcc00" opacity="0.5"/>
        {/* Floor */}
        <rect x="0" y="100" width="320" height="40" fill={t.ground}/>
        {[0,32,64,96,128,160,192,224,256,288].map((x,i)=> <rect key={`vf${i}`} x={x} y="100" width="32" height="40" fill="none" stroke="#ffffff" strokeWidth="0.3" opacity="0.06"/>)}
      </g>}

      {scene==="crossroads"&&<g>
        {/* Tree canopy background */}
        {[10,50,90,220,260,300].map((x,i)=> <g key={`tree${i}`}>
          <rect x={x-8} y={10+i*3%15} width="20" height="25" fill="#1a3a1a" rx="3"/>
          <rect x={x-4} y={8+i*3%15} width="12" height="15" fill="#1f4520" rx="2"/>
          <rect x={x} y={35+i*3%15} width="4" height="20" fill="#3a2a1a"/>
        </g>)}
        {/* Central signpost */}
        <rect x="155" y="20" width="10" height="70" fill="#5a4030"/>
        <rect x="156" y="22" width="3" height="66" fill="#6b5040"/>
        {/* Sign boards pointing different directions */}
        <rect x="120" y="25" width="45" height="12" fill="#6b5040" rx="1"/>
        <rect x="155" y="25" width="45" height="12" fill="#6b5040" rx="1"/>
        <rect x="130" y="45" width="35" height="12" fill="#5a4030" rx="1"/>
        {/* Sign text indicators */}
        <rect x="126" y="29" width="30" height="3" fill={t.ac} opacity="0.4"/>
        <rect x="163" y="29" width="28" height="3" fill="#9b59b6" opacity="0.4"/>
        <rect x="136" y="49" width="20" height="3" fill="#e74c3c" opacity="0.3"/>
        {/* Ground — dirt path */}
        <rect x="0" y="90" width="320" height="50" fill={t.ground}/>
        {/* Paths forking */}
        <rect x="60" y="90" width="50" height="50" fill="#1a2a1a" opacity="0.3"/>
        <rect x="135" y="90" width="50" height="50" fill="#1a2a1a" opacity="0.3"/>
        <rect x="210" y="90" width="50" height="50" fill="#1a2a1a" opacity="0.3"/>
        {/* Path details */}
        {[80,110,160,190,230,260].map((x,i)=> <rect key={`pd${i}`} x={x} y={95+i*3%15} width="3" height="2" fill="#3a4a3a" opacity="0.3"/>)}
        {/* Grass tufts */}
        {[15,55,95,145,195,245,285,310].map((x,i)=> <rect key={`g${i}`} x={x} y={88+i%3} width="4" height="4" fill="#2ecc71" opacity={0.15+i*0.02}/>)}
        {/* Mushrooms */}
        <rect x="25" y="96" width="6" height="4" fill="#e74c3c" opacity="0.5"/>
        <rect x="26" y="100" width="4" height="4" fill="#ddd" opacity="0.3"/>
        <rect x="280" y="94" width="5" height="3" fill="#9b59b6" opacity="0.4"/>
        <rect x="281" y="97" width="3" height="4" fill="#ddd" opacity="0.3"/>
      </g>}

      {scene==="boss"&&<g>
        {/* Dramatic columns */}
        {[20,60,240,280].map((x,i)=> <g key={`col${i}`}>
          <rect x={x} y="10" width="16" height="90" fill="#301515"/>
          <rect x={x+2} y="10" width="4" height="90" fill="#401a1a"/>
          <rect x={x-2} y="8" width="20" height="6" fill="#3a1212"/>
          <rect x={x-2} y="96" width="20" height="6" fill="#3a1212"/>
        </g>)}
        {/* Boss arena floor — cracked stone */}
        <rect x="0" y="100" width="320" height="40" fill={t.ground}/>
        {/* Cracks */}
        <rect x="140" y="105" width="40" height="1" fill={t.ac} opacity="0.15"/>
        <rect x="155" y="105" width="1" height="20" fill={t.ac} opacity="0.1"/>
        <rect x="100" y="115" width="30" height="1" fill={t.ac} opacity="0.1"/>
        {/* Center: ominous glow */}
        <rect x="130" y="30" width="60" height="70" fill={t.ac} opacity="0.06" rx="4"/>
        <rect x="140" y="40" width="40" height="50" fill={t.ac} opacity="0.04" rx="2"/>
        {/* Boss silhouette */}
        <rect x="148" y="28" width="24" height="6" fill={t.ac} opacity="0.2"/>
        <rect x="144" y="34" width="32" height="40" fill="#1a0808"/>
        <rect x="140" y="36" width="40" height="36" fill="#200a0a"/>
        {/* Glowing eyes */}
        <rect x="150" y="42" width="6" height="4" fill={t.ac}/>
        <rect x="164" y="42" width="6" height="4" fill={t.ac}/>
        <rect x="151" y="42" width="2" height="2" fill="#ff8c00"/>
        <rect x="165" y="42" width="2" height="2" fill="#ff8c00"/>
        {/* Lava/energy on ground */}
        {[40,90,140,190,240,290].map((x,i)=> <rect key={`lv${i}`} x={x} y={108+i*2%8} width={8+i*2%6} height="3" fill={t.ac} opacity={0.08+i*0.02}/>)}
        {/* Floating particles */}
        {[...Array(10)].map((_,i)=> <rect key={`p${i}`} x={80+i*18} y={20+i*7%60} width="2" height="2" fill={t.ac} opacity={0.15+i*0.03}/>)}
      </g>}

      {scene==="tower"&&<g>
        {/* Spiraling tower interior — clockwork theme */}
        {/* Stone walls */}
        <rect x="0" y="0" width="320" height="140" fill={t.wall}/>
        {/* Arched windows */}
        {[40,140,240].map((x,i)=> <g key={`tw${i}`}>
          <rect x={x} y="15" width="40" height="50" fill="#0a1a2a" rx="20"/>
          <rect x={x+4} y="20" width="32" height="40" fill="#050d18"/>
          {/* Starlight through windows */}
          <rect x={x+15} y="25" width="2" height="2" fill={t.ac} opacity="0.4"/>
          <rect x={x+22} y="32" width="1" height="1" fill="#fff" opacity="0.3"/>
        </g>)}
        {/* Massive central gear */}
        <circle cx="160" cy="70" r="35" fill="none" stroke={t.ac} strokeWidth="3" opacity="0.2"/>
        <circle cx="160" cy="70" r="25" fill="none" stroke={t.ac} strokeWidth="2" opacity="0.15"/>
        <circle cx="160" cy="70" r="8" fill={t.ac} opacity="0.1"/>
        {/* Gear teeth on large gear */}
        {[0,45,90,135,180,225,270,315].map((a,i)=>{
          const r=35,cx=160,cy=70;
          const rad=a*Math.PI/180;
          const x=cx+r*Math.cos(rad)-2,y=cy+r*Math.sin(rad)-2;
          return <rect key={`gt${i}`} x={x} y={y} width="4" height="4" fill={t.ac} opacity="0.25"/>;
        })}
        {/* Smaller gears */}
        <circle cx="80" cy="50" r="15" fill="none" stroke={t.ac} strokeWidth="1.5" opacity="0.15"/>
        <circle cx="240" cy="90" r="12" fill="none" stroke={t.ac} strokeWidth="1.5" opacity="0.12"/>
        {/* Spiral staircase suggestion */}
        {[100,108,116,124].map((y,i)=> <g key={`st${i}`}>
          <rect x={60+i*20} y={y} width={200-i*40} height="6" fill={t.ground} rx="1"/>
          <rect x={60+i*20} y={y} width={200-i*40} height="2" fill={t.ac} opacity={0.05+i*0.02}/>
        </g>)}
        {/* Floor */}
        <rect x="0" y="110" width="320" height="30" fill={t.ground}/>
        {/* Pendulum */}
        <rect x="158" y="10" width="4" height="50" fill="#2a3a4a" opacity="0.4"/>
        <circle cx="160" cy="58" r="6" fill={t.ac} opacity="0.15"/>
        {/* Floating numbers (loop theme) */}
        {[20,70,120,200,260,300].map((x,i)=> <text key={`n${i}`} x={x} y={15+i*10%40} fill={t.ac} opacity={0.08+i*0.02} fontSize="8" fontFamily="monospace">{i}</text>)}
      </g>}

      {scene==="archives"&&<g>
        {/* Grand library interior */}
        <rect x="0" y="0" width="320" height="140" fill={t.wall}/>
        {/* Towering bookshelves — left */}
        {[0,1,2].map((s,si)=> <g key={`sl${si}`}>
          <rect x={10+si*28} y="5" width="24" height="100" fill="#1a2828"/>
          {[...Array(8)].map((_,r)=> <g key={`b${si}${r}`}>
            <rect x={12+si*28} y={8+r*12} width="20" height="10" fill={["#8b4513","#a0522d","#6b3a2a","#654321","#4a2d1e","#5c3d2e","#7b4b2a","#3d2b1f"][r%8]} rx="1"/>
            <rect x={13+si*28} y={10+r*12} width="8" height="1" fill={t.ac} opacity={0.1+r*0.02}/>
          </g>)}
        </g>)}
        {/* Right bookshelves */}
        {[0,1,2].map((s,si)=> <g key={`sr${si}`}>
          <rect x={226+si*28} y="5" width="24" height="100" fill="#1a2828"/>
          {[...Array(8)].map((_,r)=> <g key={`b${si}${r}`}>
            <rect x={228+si*28} y={8+r*12} width="20" height="10" fill={["#654321","#8b4513","#5c3d2e","#a0522d","#3d2b1f","#7b4b2a","#4a2d1e","#6b3a2a"][r%8]} rx="1"/>
          </g>)}
        </g>)}
        {/* Central reading area */}
        <rect x="94" y="20" width="132" height="80" fill="#0a1414"/>
        {/* Reading desk */}
        <rect x="110" y="70" width="100" height="8" fill="#3d2b1f"/>
        <rect x="115" y="62" width="40" height="10" fill="#4a3520"/>
        <rect x="118" y="64" width="34" height="6" fill="#0a1414"/>
        {/* Open book on desk */}
        <rect x="120" y="65" width="14" height="4" fill="#f0e6d2"/>
        <rect x="136" y="65" width="14" height="4" fill="#e8dcc8"/>
        <rect x="122" y="66" width="10" height="1" fill="#888" opacity="0.3"/>
        <rect x="138" y="66" width="10" height="1" fill="#888" opacity="0.3"/>
        {/* Floating catalog cards */}
        {[110,140,170,200].map((x,i)=> <g key={`cc${i}`}>
          <rect x={x} y={30+i*5%20} width="16" height="10" fill="#f0e6d2" opacity={0.15+i*0.05} rx="1"/>
          <rect x={x+2} y={33+i*5%20} width="8" height="1" fill={t.ac} opacity="0.15"/>
        </g>)}
        {/* Chandelier */}
        <rect x="155" y="5" width="10" height="3" fill="#2a3a3a"/>
        <rect x="158" y="8" width="4" height="10" fill="#1a2a2a"/>
        {[150,155,160,165,170].map((x,i)=> <rect key={`cl${i}`} x={x} y="18" width="2" height="4" fill={GOLD} opacity={0.3+i*0.05}/>)}
        {/* Floor */}
        <rect x="0" y="105" width="320" height="35" fill={t.ground}/>
        {/* Floor pattern — herringbone */}
        {[...Array(16)].map((_,i)=> <rect key={`hb${i}`} x={i*20} y="105" width="18" height="35" fill="none" stroke="#ffffff" strokeWidth="0.3" opacity="0.04"/>)}
        {/* Dust motes */}
        {[...Array(8)].map((_,i)=> <rect key={`dm${i}`} x={100+i*15} y={25+i*8%50} width="1" height="1" fill={t.ac} opacity={0.1+i*0.02}/>)}
      </g>}

      {scene==="forge"&&<g>
        {/* Blacksmith's forge interior */}
        <rect x="0" y="0" width="320" height="140" fill={t.wall}/>
        {/* Stone brick pattern */}
        {[...Array(7)].map((_,r)=> <g key={`fb${r}`}>
          {[...Array(8)].map((_,c)=> <rect key={`fbc${c}`} x={c*42+(r%2)*21-5} y={r*20} width="40" height="18" fill="none" stroke="#3a1515" strokeWidth="0.5" opacity="0.3"/>)}
        </g>)}
        {/* Central forge — large furnace */}
        <rect x="120" y="30" width="80" height="70" fill="#1a0505"/>
        <rect x="125" y="35" width="70" height="55" fill="#0d0202"/>
        {/* Fire inside furnace */}
        <rect x="135" y="50" width="50" height="30" fill="#ff4500" opacity="0.15"/>
        <rect x="140" y="55" width="15" height="20" fill="#ff6b35" opacity="0.3"/>
        <rect x="158" y="52" width="12" height="22" fill="#ff4500" opacity="0.25"/>
        <rect x="173" y="58" width="8" height="15" fill="#ff6b35" opacity="0.2"/>
        {/* Flames */}
        <rect x="145" y="45" width="6" height="12" fill="#ffd700" opacity="0.3"/>
        <rect x="155" y="42" width="8" height="16" fill="#ff4500" opacity="0.35"/>
        <rect x="167" y="47" width="5" height="10" fill="#ffd700" opacity="0.25"/>
        {/* Chimney */}
        <rect x="148" y="5" width="24" height="30" fill="#1a0a0a"/>
        <rect x="150" y="0" width="20" height="8" fill="#2a1010"/>
        {/* Anvil — right side */}
        <rect x="230" y="75" width="40" height="8" fill="#555"/>
        <rect x="235" y="68" width="30" height="8" fill="#666"/>
        <rect x="240" y="83" width="8" height="15" fill="#444"/>
        <rect x="262" y="83" width="8" height="15" fill="#444"/>
        {/* Hammer on anvil */}
        <rect x="242" y="64" width="4" height="16" fill="#8B7000"/>
        <rect x="238" y="62" width="12" height="4" fill="#888"/>
        {/* Weapon rack — left side */}
        <rect x="20" y="25" width="6" height="70" fill="#3d2215"/>
        <rect x="70" y="25" width="6" height="70" fill="#3d2215"/>
        <rect x="20" y="25" width="56" height="4" fill="#3d2215"/>
        {/* Weapons on rack */}
        <rect x="30" y="29" width="3" height="40" fill="#888"/>
        <rect x="28" y="29" width="7" height="6" fill="#aaa"/>
        <rect x="45" y="29" width="2" height="35" fill="#8B7000"/>
        <rect x="42" y="29" width="8" height="3" fill="#666"/>
        <rect x="58" y="29" width="3" height="38" fill="#888"/>
        <rect x="56" y="32" width="7" height="4" fill="#aaa"/>
        {/* Glowing embers on floor */}
        {[30,80,180,250,290].map((x,i)=> <rect key={`em${i}`} x={x} y={108+i%3*2} width={3+i%2*2} height="2" fill="#ff4500" opacity={0.08+i*0.02}/>)}
        {/* Floor */}
        <rect x="0" y="105" width="320" height="35" fill={t.ground}/>
        {/* Sparks floating */}
        {[...Array(12)].map((_,i)=> <rect key={`sp${i}`} x={120+Math.sin(i*0.8)*60} y={20+i*6} width="1" height="1" fill={i%2?"#ffd700":"#ff4500"} opacity={0.2+i*0.03}/>)}
      </g>}

      {scene==="maproom"&&<g>
        {/* Cartography chamber */}
        <rect x="0" y="0" width="320" height="140" fill={t.wall}/>
        {/* Large central map table */}
        <rect x="60" y="55" width="200" height="50" fill="#3d2b1f"/>
        <rect x="65" y="50" width="190" height="50" fill="#4a3520"/>
        {/* Map spread on table */}
        <rect x="70" y="53" width="180" height="42" fill="#f0e6d2"/>
        <rect x="72" y="55" width="176" height="38" fill="#e8dcc8"/>
        {/* Map details — continents */}
        <rect x="85" y="62" width="30" height="20" fill="#6b9b6b" opacity="0.4" rx="3"/>
        <rect x="130" y="58" width="40" height="28" fill="#6b9b6b" opacity="0.35" rx="4"/>
        <rect x="190" y="65" width="25" height="15" fill="#6b9b6b" opacity="0.3" rx="2"/>
        {/* Water on map */}
        <rect x="118" y="60" width="10" height="24" fill="#3498db" opacity="0.15"/>
        <rect x="175" y="58" width="12" height="30" fill="#3498db" opacity="0.12"/>
        {/* Map markers */}
        <rect x="95" y="68" width="3" height="3" fill="#e74c3c" opacity="0.7"/>
        <rect x="150" y="72" width="3" height="3" fill="#f39c12" opacity="0.7"/>
        <rect x="200" y="70" width="3" height="3" fill="#e74c3c" opacity="0.6"/>
        {/* Compass rose on map */}
        <rect x="218" y="78" width="8" height="1" fill="#8B7000" opacity="0.5"/>
        <rect x="221" y="75" width="1" height="8" fill="#8B7000" opacity="0.5"/>
        {/* Scrolls on shelves */}
        {[10,20,30,270,280,290].map((x,i)=> <g key={`sc${i}`}>
          <rect x={x} y={15+i*8%30} width="18" height="6" fill="#f0e6d2" rx="3"/>
          <rect x={x} y={15+i*8%30} width="2" height="6" fill="#d4c4a8"/>
          <rect x={x+16} y={15+i*8%30} width="2" height="6" fill="#d4c4a8"/>
        </g>)}
        {/* Wall shelves */}
        <rect x="5" y="12" width="50" height="3" fill="#3d2b1f"/>
        <rect x="5" y="32" width="50" height="3" fill="#3d2b1f"/>
        <rect x="265" y="12" width="50" height="3" fill="#3d2b1f"/>
        <rect x="265" y="32" width="50" height="3" fill="#3d2b1f"/>
        {/* Hanging lanterns */}
        {[80,160,240].map((x,i)=> <g key={`ln${i}`}>
          <rect x={x} y="5" width="1" height="12" fill="#555"/>
          <rect x={x-3} y="17" width="7" height="8" fill="#2a2010" rx="1"/>
          <rect x={x-1} y="19" width="3" height="4" fill={t.ac} opacity="0.3"/>
        </g>)}
        {/* Table legs */}
        <rect x="75" y="100" width="6" height="10" fill="#3d2b1f"/>
        <rect x="239" y="100" width="6" height="10" fill="#3d2b1f"/>
        {/* Floor */}
        <rect x="0" y="108" width="320" height="32" fill={t.ground}/>
        {/* Quill and ink */}
        <rect x="220" y="48" width="1" height="8" fill="#fff" opacity="0.3"/>
        <rect x="216" y="50" width="6" height="4" fill="#1a1a2e" rx="1"/>
      </g>}

      {scene==="summit"&&<g>
        {/* The Summit — cosmic peak */}
        <rect x="0" y="0" width="320" height="140" fill={t.wall}/>
        {/* Starfield */}
        {[...Array(30)].map((_,i)=> <rect key={`ss${i}`} x={(i*37+13)%318} y={(i*23+7)%100} width={i%3===0?2:1} height={i%3===0?2:1} fill={["#e8d5f5","#d4b5e8","#fff"][i%3]} opacity={0.1+i*0.015}/>)}
        {/* Distant mountain peaks */}
        <polygon points="0,100 40,50 80,100" fill="#151530" opacity="0.6"/>
        <polygon points="60,100 120,35 180,100" fill="#1a1a40" opacity="0.5"/>
        <polygon points="140,100 200,45 260,100" fill="#151530" opacity="0.55"/>
        <polygon points="220,100 280,40 320,80 320,100" fill="#1a1a40" opacity="0.45"/>
        {/* Central platform — crystal formation */}
        <rect x="110" y="70" width="100" height="40" fill="#1a1a30"/>
        <rect x="120" y="65" width="80" height="5" fill="#252545"/>
        {/* Large crystal */}
        <polygon points="155,25 160,20 170,20 175,25 175,55 155,55" fill="#9b59b6" opacity="0.2"/>
        <polygon points="158,28 162,22 168,22 172,28 172,52 158,52" fill="#8e44ad" opacity="0.15"/>
        <rect x="163" y="30" width="2" height="18" fill="#fff" opacity="0.06"/>
        {/* Smaller crystals */}
        <polygon points="130,50 135,40 140,50" fill="#9b59b6" opacity="0.15"/>
        <polygon points="185,48 190,38 195,48" fill="#8e44ad" opacity="0.12"/>
        {/* Portal glow at center */}
        <circle cx="160" cy="55" r="15" fill={t.ac} opacity="0.06"/>
        <circle cx="160" cy="55" r="8" fill={t.ac} opacity="0.1"/>
        {/* Floating code runes */}
        {["def","for","if","[ ]","{ }","+"].map((r,i)=> <text key={`rn${i}`} x={40+i*48} y={20+i*12%40} fill={t.ac} opacity={0.06+i*0.015} fontSize="7" fontFamily="monospace">{r}</text>)}
        {/* Ground */}
        <rect x="0" y="105" width="320" height="35" fill={t.ground}/>
        {/* Glowing path to summit */}
        <rect x="0" y="107" width="320" height="2" fill={t.ac} opacity="0.05"/>
        {/* Aurora effect */}
        <rect x="20" y="8" width="280" height="3" fill="#9b59b6" opacity="0.04"/>
        <rect x="40" y="14" width="240" height="2" fill="#3498db" opacity="0.03"/>
        <rect x="60" y="5" width="200" height="2" fill="#1abc9c" opacity="0.03"/>
      </g>}
      {scene==="workshop"&&<g>
        {/* Arcade cabinet left */}
        <rect x="20" y="35" width="40" height="70" fill="#2a1030"/>
        <rect x="22" y="38" width="36" height="30" fill="#1a0020"/>
        <rect x="25" y="42" width="30" height="22" fill="#e91e63" opacity="0.15"/>
        <rect x="30" y="48" width="8" height="8" fill="#e91e63" opacity="0.3"/>
        <rect x="42" y="45" width="6" height="6" fill="#00e5ff" opacity="0.25"/>
        <rect x="24" y="72" width="12" height="4" fill="#e91e63" opacity="0.2"/>
        <rect x="40" y="72" width="12" height="4" fill="#e91e63" opacity="0.15"/>
        {/* Arcade cabinet right */}
        <rect x="260" y="30" width="40" height="75" fill="#2a1030"/>
        <rect x="262" y="33" width="36" height="30" fill="#1a0020"/>
        <rect x="265" y="37" width="30" height="22" fill="#9c27b0" opacity="0.15"/>
        <rect x="270" y="42" width="10" height="10" fill="#9c27b0" opacity="0.3"/>
        <rect x="284" y="44" width="6" height="6" fill="#e91e63" opacity="0.2"/>
        {/* Workbench center */}
        <rect x="100" y="60" width="120" height="8" fill="#3e2723"/>
        <rect x="100" y="60" width="120" height="2" fill="#5d4037"/>
        <rect x="115" y="68" width="6" height="37" fill="#3e2723"/>
        <rect x="199" y="68" width="6" height="37" fill="#3e2723"/>
        {/* Tools on bench */}
        <rect x="110" y="55" width="20" height="5" fill="#607d8b" opacity="0.4"/>
        <rect x="140" y="52" width="4" height="8" fill="#ffd700" opacity="0.3"/>
        <rect x="160" y="54" width="18" height="6" fill="#e91e63" opacity="0.25"/>
        <rect x="190" y="55" width="12" height="5" fill="#00e5ff" opacity="0.3"/>
        {/* Floating game sprites */}
        <rect x="80" y="20" width="8" height="8" fill="#e91e63" opacity="0.12"/>
        <rect x="150" y="15" width="10" height="10" fill="#00e5ff" opacity="0.08"/>
        <rect x="230" y="22" width="8" height="8" fill="#9c27b0" opacity="0.1"/>
        <rect x="180" y="25" width="6" height="6" fill="#ffd700" opacity="0.07"/>
        {/* Neon sign */}
        <text x="130" y="22" fill="#e91e63" opacity="0.12" fontSize="10" fontFamily="monospace">WORKSHOP</text>
        {/* Ground */}
        <rect x="0" y="105" width="320" height="35" fill={t.ground}/>
        <rect x="0" y="105" width="320" height="2" fill="#e91e63" opacity="0.06"/>
        {/* Tile pattern */}
        {[0,40,80,120,160,200,240,280].map((x,i)=> <rect key={`wt${i}`} x={x} y={106} width="38" height="34" fill={i%2===0?"#ffffff":"#000"} opacity="0.02"/>)}
      </g>}
      {scene==="colosseum"&&<g>
        {/* Arena walls — stone tiers */}
        <rect x="0" y="25" width="320" height="15" fill="#3e2723" opacity="0.5"/>
        <rect x="0" y="35" width="320" height="15" fill="#4e342e" opacity="0.4"/>
        <rect x="0" y="45" width="320" height="15" fill="#5d4037" opacity="0.3"/>
        {/* Pillars left */}
        <rect x="20" y="20" width="16" height="85" fill="#5d4037"/>
        <rect x="22" y="20" width="12" height="85" fill="#6d4c41"/>
        <rect x="22" y="20" width="3" height="85" fill="#795548" opacity="0.4"/>
        <rect x="20" y="18" width="16" height="4" fill="#795548"/>
        {/* Pillars right */}
        <rect x="284" y="20" width="16" height="85" fill="#5d4037"/>
        <rect x="286" y="20" width="12" height="85" fill="#6d4c41"/>
        <rect x="286" y="20" width="3" height="85" fill="#795548" opacity="0.4"/>
        <rect x="284" y="18" width="16" height="4" fill="#795548"/>
        {/* Center arena floor */}
        <ellipse cx="160" cy="95" rx="100" ry="20" fill="#8d6e63" opacity="0.15"/>
        <ellipse cx="160" cy="95" rx="80" ry="15" fill="#a1887f" opacity="0.1"/>
        {/* Banners */}
        <rect x="55" y="22" width="20" height="35" fill="#b71c1c" opacity="0.25"/>
        <rect x="60" y="22" width="10" height="32" fill="#d32f2f" opacity="0.2"/>
        <rect x="245" y="22" width="20" height="35" fill="#1a237e" opacity="0.25"/>
        <rect x="250" y="22" width="10" height="32" fill="#283593" opacity="0.2"/>
        {/* Trophy in center */}
        <rect x="152" y="55" width="16" height="4" fill="#ffd700" opacity="0.3"/>
        <rect x="155" y="45" width="10" height="12" fill="#ffd700" opacity="0.25"/>
        <rect x="157" y="40" width="6" height="8" fill="#ffeb3b" opacity="0.2"/>
        <rect x="154" y="42" width="4" height="3" fill="#ffd700" opacity="0.15"/>
        <rect x="162" y="42" width="4" height="3" fill="#ffd700" opacity="0.15"/>
        {/* Torch flames */}
        <rect x="48" y="28" width="6" height="8" fill="#ff5722" opacity="0.15"/>
        <rect x="49" y="25" width="4" height="6" fill="#ff9800" opacity="0.12"/>
        <rect x="266" y="28" width="6" height="8" fill="#ff5722" opacity="0.15"/>
        <rect x="267" y="25" width="4" height="6" fill="#ff9800" opacity="0.12"/>
        {/* Ground */}
        <rect x="0" y="105" width="320" height="35" fill={t.ground}/>
        <rect x="0" y="105" width="320" height="2" fill="#ff5722" opacity="0.05"/>
        {/* Sand texture */}
        {[0,1,2,3,4,5,6,7,8].map(i=> <rect key={`sd${i}`} x={30+i*30} y={108+i%3*4} width={12+i%2*6} height="1" fill="#a1887f" opacity="0.04"/>)}
      </g>}
      {scene==="drydock"&&<g>
        {/* Scaffolding */}
        <rect x="20" y="20" width="4" height="85" fill="#5d4037" opacity="0.4"/>
        <rect x="60" y="30" width="4" height="75" fill="#5d4037" opacity="0.3"/>
        <rect x="256" y="25" width="4" height="80" fill="#5d4037" opacity="0.4"/>
        <rect x="296" y="35" width="4" height="70" fill="#5d4037" opacity="0.3"/>
        {/* Cross beams */}
        <rect x="20" y="50" width="44" height="2" fill="#4e342e" opacity="0.3"/>
        <rect x="256" y="55" width="44" height="2" fill="#4e342e" opacity="0.3"/>
        {/* Robot on work platform */}
        <rect x="120" y="55" width="80" height="8" fill="#37474f"/>
        <rect x="120" y="55" width="80" height="2" fill="#455a64"/>
        {/* Robot body (being built) */}
        <rect x="145" y="35" width="30" height="20" fill="#546e7a"/>
        <rect x="150" y="38" width="20" height="14" fill="#607d8b"/>
        <rect x="155" y="42" width="4" height="4" fill="#ff9800" opacity="0.3"/>
        <rect x="163" y="42" width="4" height="4" fill="#ff9800" opacity="0.3"/>
        <rect x="140" y="45" width="6" height="8" fill="#455a64" opacity="0.5"/>
        <rect x="174" y="45" width="6" height="8" fill="#455a64" opacity="0.5"/>
        {/* Wheels */}
        <circle cx="152" cy="62" r="6" fill="#333" opacity="0.4"/>
        <circle cx="168" cy="62" r="6" fill="#333" opacity="0.4"/>
        <circle cx="152" cy="62" r="3" fill="#555" opacity="0.3"/>
        <circle cx="168" cy="62" r="3" fill="#555" opacity="0.3"/>
        {/* Tool rack */}
        <rect x="30" y="70" width="50" height="30" fill="#3e2723" opacity="0.3"/>
        <rect x="35" y="74" width="4" height="20" fill="#90a4ae" opacity="0.3"/>
        <rect x="44" y="76" width="4" height="18" fill="#ff9800" opacity="0.25"/>
        <rect x="53" y="72" width="4" height="22" fill="#78909c" opacity="0.3"/>
        <rect x="62" y="78" width="4" height="16" fill="#ffb74d" opacity="0.2"/>
        {/* LEGO pieces scattered */}
        <rect x="240" y="80" width="8" height="5" fill="#ff9800" opacity="0.15"/>
        <rect x="260" y="85" width="10" height="4" fill="#1565c0" opacity="0.12"/>
        <rect x="280" y="78" width="6" height="6" fill="#ff9800" opacity="0.1"/>
        {/* Warning stripes on floor */}
        {[0,1,2,3,4,5,6,7].map(i=> <rect key={`ws${i}`} x={i*40} y={103} width="20" height="2" fill="#ff9800" opacity={0.06+i%2*0.04}/>)}
        {/* Ground */}
        <rect x="0" y="105" width="320" height="35" fill={t.ground}/>
        <rect x="0" y="105" width="320" height="2" fill="#ff9800" opacity="0.06"/>
      </g>}
      {scene==="launchpad"&&<g>
        {/* Star field */}
        {[...Array(20)].map((_,i)=> <rect key={`lps${i}`} x={10+i*15+i%5*3} y={5+i*4%60} width="1" height="1" fill="#fff" opacity={0.04+i%4*0.02}/>)}
        {/* Mission control screens */}
        <rect x="20" y="20" width="60" height="40" fill="#0a1a0a"/>
        <rect x="22" y="22" width="56" height="36" fill="#001a00"/>
        <rect x="25" y="25" width="20" height="12" fill="#00e676" opacity="0.08"/>
        <rect x="50" y="25" width="25" height="12" fill="#00e676" opacity="0.06"/>
        <rect x="25" y="40" width="50" height="3" fill="#00e676" opacity="0.12"/>
        <rect x="25" y="45" width="30" height="3" fill="#00e676" opacity="0.08"/>
        {/* Screen 2 */}
        <rect x="240" y="20" width="60" height="40" fill="#0a1a0a"/>
        <rect x="242" y="22" width="56" height="36" fill="#001a00"/>
        <rect x="245" y="25" width="50" height="15" fill="#00e676" opacity="0.06"/>
        {/* Radar blip */}
        <circle cx="270" cy="35" r="10" fill="none" stroke="#00e676" strokeWidth="0.5" opacity="0.15"/>
        <circle cx="270" cy="35" r="5" fill="none" stroke="#00e676" strokeWidth="0.5" opacity="0.1"/>
        <rect x="270" y="34" width="2" height="2" fill="#00e676" opacity="0.3"/>
        {/* Launch platform center */}
        <rect x="110" y="65" width="100" height="6" fill="#37474f"/>
        <rect x="110" y="65" width="100" height="2" fill="#455a64"/>
        {/* Rocket / robot on pad */}
        <rect x="148" y="30" width="24" height="35" fill="#546e7a"/>
        <rect x="150" y="32" width="20" height="10" fill="#607d8b"/>
        <rect x="155" y="35" width="4" height="4" fill="#00e676" opacity="0.3"/>
        <rect x="163" y="35" width="4" height="4" fill="#00e676" opacity="0.3"/>
        <polygon points="148,30 160,18 172,30" fill="#455a64"/>
        <polygon points="152,30 160,22 168,30" fill="#546e7a"/>
        <rect x="158" y="22" width="4" height="3" fill="#00e676" opacity="0.2"/>
        {/* Exhaust vents */}
        <rect x="150" y="65" width="6" height="8" fill="#ff9800" opacity="0.08"/>
        <rect x="164" y="65" width="6" height="8" fill="#ff9800" opacity="0.08"/>
        {/* Countdown display */}
        <rect x="130" y="80" width="60" height="15" fill="#0a0a1a"/>
        <rect x="132" y="82" width="56" height="11" fill="#001a00"/>
        <text x="160" y="91" fill="#00e676" opacity="0.2" fontSize="8" fontFamily="monospace" textAnchor="middle">READY</text>
        {/* Ground */}
        <rect x="0" y="105" width="320" height="35" fill={t.ground}/>
        <rect x="0" y="105" width="320" height="2" fill="#00e676" opacity="0.05"/>
        {/* Launch pad markings */}
        <rect x="130" y="106" width="60" height="1" fill="#00e676" opacity="0.08"/>
        <rect x="140" y="108" width="40" height="1" fill="#00e676" opacity="0.05"/>
      </g>}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════
// NPC DATA & DIALOGUE
// ═══════════════════════════════════════════════════════════════════

const NPCS = {
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

function NPCDialogue({ npc, lines, onComplete }) {
  const [li, setLi] = useState(0);
  const [ci, setCi] = useState(0);
  const [txt, setTxt] = useState("");
  const [typing, setTyping] = useState(true);
  const line = lines[li];

  useEffect(() => {
    if (!typing) return;
    if (ci >= line.length) { setTyping(false); return; }
    const t = setTimeout(() => { setTxt(line.substring(0, ci+1)); setCi(c=>c+1); if(ci%8===0)try{SFX.dialogueBlip()}catch(e){} }, 18);
    return () => clearTimeout(t);
  }, [ci, typing, line]);

  const click = () => {
    if (typing) { setTxt(line); setCi(line.length); setTyping(false); try{SFX.dialogueBlip()}catch(e){}; }
    else if (li < lines.length-1) { setLi(l=>l+1); setCi(0); setTxt(""); setTyping(true); try{SFX.dialogueBlip()}catch(e){}; }
    else { try{SFX.click()}catch(e){}; onComplete(); }
  };

  const n = NPCS[npc]||NPCS.byte;
  const isLast = !typing && li===lines.length-1;

  return (
    <div className="fixed inset-0 flex items-end justify-center z-40 p-4" style={{background:"rgba(0,0,0,0.75)"}} onClick={click}>
      <div className="w-full max-w-2xl rounded-xl p-5 mb-4 cursor-pointer select-none"
        style={{background:`linear-gradient(135deg,${PANEL},${PANEL2})`,border:`2px solid ${n.color}44`,boxShadow:`0 0 40px ${n.color}22, inset 0 1px 0 #ffffff08`}}>
        <div className="flex items-start gap-5">
          <div className="flex-shrink-0 flex flex-col items-center">
            <div className="rounded-xl p-2" style={{background:`${n.color}11`,border:`2px solid ${n.color}33`,boxShadow:`0 0 20px ${n.color}15`}}>
              <NPCAvatar type={n.type} size={80}/>
            </div>
            <span className="text-xs font-bold mt-2 tracking-wide" style={{color:n.color}}>{n.name}</span>
            <span style={{color:VDIM,fontSize:"9px"}}>{n.title}</span>
          </div>
          <div className="flex-1 min-h-[80px] flex items-center">
            <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{color:TEXT,fontFamily:MONO,lineHeight:"1.7"}}>
              {txt}{typing && <span style={{color:n.color,animation:"blink 0.8s infinite"}}>▊</span>}
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center mt-3 pt-2" style={{borderTop:`1px solid ${n.color}15`}}>
          <span className="text-xs" style={{color:VDIM}}>{li+1} / {lines.length}</span>
          <span className="text-xs" style={{color:VDIM}}>{isLast?"Click to continue →":typing?"Click to skip ▸":"Click for next ▸"}</span>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════════

async function saveProfile(id,data){try{localStorage.setItem(`cq:profile:${id}`,JSON.stringify(data));return true}catch{return false}}
async function loadProfile(id){try{const r=localStorage.getItem(`cq:profile:${id}`);return r?JSON.parse(r):null}catch{return null}}
async function loadProfileList(){try{const r=localStorage.getItem("cq:profiles");return r?JSON.parse(r):[]}catch{return[]}}
async function saveProfileList(l){try{localStorage.setItem("cq:profiles",JSON.stringify(l))}catch{}}

// ═══════════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function Btn({children,onClick,color=ACCENT,disabled,className="",style={}}){
  const handleClick=()=>{try{SFX.init().then(()=>SFX.click())}catch(e){}if(onClick)onClick();};
  return <button onClick={handleClick} disabled={disabled}
    className={`px-5 py-2 rounded font-bold text-sm tracking-wider transition-all duration-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    style={{background:`${color}18`,border:`1px solid ${color}66`,color,fontFamily:MONO,...style}}
    onMouseEnter={e=>{if(!disabled)e.currentTarget.style.boxShadow=`0 0 20px ${color}33`}}
    onMouseLeave={e=>{e.currentTarget.style.boxShadow="none"}}>{children}</button>;
}

function XpBar({current,next,label}){
  const pct=next>0?Math.min((current/next)*100,100):100;
  return <div className="w-full">
    {label&&<div className="flex justify-between text-xs mb-1" style={{color:DIM}}><span>{label}</span><span>{current}/{next} XP</span></div>}
    <div className="w-full h-2 rounded-full overflow-hidden" style={{background:PANEL2}}>
      <div className="h-full rounded-full transition-all duration-1000" style={{width:`${pct}%`,background:`linear-gradient(90deg,${ACCENT},#00bfa5)`,boxShadow:`0 0 8px ${ACCENT}55`}}/>
    </div>
  </div>;
}

function SessionTimer({time,active}){
  if(!active||time===null)return null;
  const m=Math.floor(time/60),s=time%60,low=time<120;
  return <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-mono"
    style={{background:low?"#ff6b6b22":`${ACCENT}11`,color:low?ERR:ACCENT,border:`1px solid ${low?"#ff6b6b44":`${ACCENT}33`}`}}>
    ⏱ {m}:{s.toString().padStart(2,"0")}
  </div>;
}

// ═══════════════════════════════════════════════════════════════════
// SCREENS
// ═══════════════════════════════════════════════════════════════════

function TitleScreen({onStart}){
  const [fade,setFade]=useState(false);
  useEffect(()=>{setTimeout(()=>setFade(true),100)},[]);
  return <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{background:`radial-gradient(ellipse at center,${PANEL} 0%,${DARK} 70%)`}}>
    <div className="text-center transition-all duration-1000" style={{opacity:fade?1:0,transform:fade?"translateY(0)":"translateY(20px)"}}>
      <div className="text-6xl mb-4">⚔️</div>
      <h1 className="text-5xl font-bold mb-2 tracking-widest" style={{fontFamily:MONO,color:ACCENT,textShadow:`0 0 30px ${ACCENT}44`}}>CODEQUEST</h1>
      <p className="text-lg mb-8 tracking-wide" style={{color:DIM}}>A Python Adventure</p>
      <Btn onClick={()=>{SFX.init();onStart()}} style={{fontSize:"16px",padding:"12px 32px"}}>BEGIN QUEST</Btn>
      <div className="mt-12 text-xs" style={{color:VDIM}}>Learn Python. Defeat Bosses. Become a Coder.</div>
    </div>
  </div>;
}

function CharacterCreate({onComplete,existingProfiles}){
  const [name,setName]=useState("");
  const [hair,setHair]=useState(0);
  const [skin,setSkin]=useState(0);
  const [shirt,setShirt]=useState(0);
  const [accessory,setAccessory]=useState(0);
  const [step,setStep]=useState("name");

  const finish=()=>{
    if(!name.trim())return;
    onComplete({name:name.trim(),avatar:{hair,skin,shirt,accessory},xp:0,completedRooms:[],completedBosses:[],badges:[],trophies:[],equipment:[],createdAt:new Date().toISOString()});
  };

  const CP=({label,options,value,onChange})=>(
    <div className="mb-4">
      <div className="text-xs mb-2 tracking-wider" style={{color:DIM}}>{label}</div>
      <div className="flex gap-2 flex-wrap">
        {options.map((c,i)=><button key={i} onClick={()=>onChange(i)} className="w-8 h-8 rounded cursor-pointer"
          style={{background:typeof c==="string"&&c!=="none"?c:PANEL2,border:`2px solid ${i===value?ACCENT:"transparent"}`,fontSize:"11px",color:TEXT}}>
          {typeof c==="string"&&c!=="none"?"":COLORS.accessory[i]?.[0]?.toUpperCase()||"∅"}</button>)}
      </div>
    </div>
  );

  return <div className="min-h-screen flex items-center justify-center p-6" style={{background:`radial-gradient(ellipse at center,${PANEL} 0%,${DARK} 70%)`}}>
    <div className="max-w-md w-full">
      <h2 className="text-2xl font-bold text-center mb-6" style={{fontFamily:MONO,color:TEXT}}>Create Your Hero</h2>
      {step==="name"?<div className="text-center">
        <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Enter hero name..."
          maxLength={16} className="w-full p-3 rounded-lg text-center text-lg focus:outline-none"
          style={{background:PANEL2,color:TEXT,border:`1px solid ${ACCENT}33`,fontFamily:MONO,caretColor:ACCENT}}
          onKeyDown={e=>e.key==="Enter"&&name.trim()&&setStep("avatar")}/>
        <div className="mt-4"><Btn onClick={()=>name.trim()&&setStep("avatar")} disabled={!name.trim()}>NEXT →</Btn></div>
      </div>:<div>
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-xl" style={{background:PANEL2,border:`1px solid ${ACCENT}33`}}>
            <PixelAvatar hair={hair} skin={skin} shirt={shirt} accessory={accessory} size={128}/>
            <div className="text-center mt-2 text-sm font-bold" style={{color:ACCENT}}>{name}</div>
          </div>
        </div>
        <CP label="HAIR" options={COLORS.hair} value={hair} onChange={setHair}/>
        <CP label="SKIN" options={COLORS.skin} value={skin} onChange={setSkin}/>
        <CP label="SHIRT" options={COLORS.shirt} value={shirt} onChange={setShirt}/>
        <CP label="ACCESSORY" options={COLORS.accessory} value={accessory} onChange={setAccessory}/>
        <div className="flex gap-3 mt-6">
          <Btn onClick={()=>setStep("name")} color={DIM}>← BACK</Btn>
          <Btn onClick={finish} className="flex-1">CREATE HERO ⚔️</Btn>
        </div>
      </div>}
    </div>
  </div>;
}

function ProfileSelect({profiles,onSelect,onCreate}){
  return <div className="min-h-screen flex items-center justify-center p-6" style={{background:`radial-gradient(ellipse at center,${PANEL} 0%,${DARK} 70%)`}}>
    <div className="max-w-md w-full">
      <div className="text-center mb-8"><div className="text-4xl mb-2">⚔️</div><h2 className="text-2xl font-bold" style={{fontFamily:MONO,color:TEXT}}>Choose Your Hero</h2></div>
      <div className="flex flex-col gap-3 mb-6">
        {profiles.map(p=><button key={p.id} onClick={()=>onSelect(p.id)}
          className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-300 text-left"
          style={{background:PANEL2,border:`1px solid ${ACCENT}33`}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=ACCENT}} onMouseLeave={e=>{e.currentTarget.style.borderColor=`${ACCENT}33`}}>
          <PixelAvatar {...p.avatar} size={56}/>
          <div className="flex-1">
            <div className="font-bold" style={{color:TEXT}}>{p.name}</div>
            <div className="text-xs" style={{color:DIM}}>
              {p.xp} XP • {(p.badges||[]).length} badges
            </div>
          </div>
          <div className="flex gap-1">{(p.badges||[]).slice(0,3).map((b,i)=><span key={i} className="text-lg">{b.icon}</span>)}</div>
        </button>)}
      </div>
      {profiles.length<4&&<Btn onClick={onCreate} className="w-full" color={GOLD}>+ CREATE NEW HERO</Btn>}
    </div>
  </div>;
}

function SessionSetup({onSelect,profile}){
  const times=[10,15,20,30];
  return <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{background:`radial-gradient(ellipse at center,${PANEL} 0%,${DARK} 70%)`}}>
    <div className="text-center max-w-md w-full">
      <div className="flex items-center justify-center gap-4 mb-8 p-4 rounded-xl" style={{background:PANEL2,border:`1px solid ${ACCENT}22`}}>
        <PixelAvatar {...profile.avatar} size={64}/>
        <div className="text-left">
          <div className="font-bold" style={{color:TEXT}}>{profile.name}</div>
          <div className="text-xs" style={{color:DIM}}>{profile.xp} XP</div>
        </div>
      </div>
      <h2 className="text-2xl font-bold mb-6" style={{fontFamily:MONO,color:TEXT}}>Choose Session Length</h2>
      <div className="grid grid-cols-2 gap-3">
        {times.map(t=>{
          const mult=t<=10?"1×":t<=15?"1.2×":t<=20?"1.5×":"2×";
          return <button key={t} onClick={()=>onSelect(t)} className="p-4 rounded-lg cursor-pointer transition-all duration-300"
            style={{background:PANEL2,border:`1px solid ${ACCENT}33`,color:TEXT}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=`${ACCENT}88`}} onMouseLeave={e=>{e.currentTarget.style.borderColor=`${ACCENT}33`}}>
            <div className="text-2xl font-bold" style={{color:ACCENT}}>{t}</div>
            <div className="text-xs" style={{color:DIM}}>minutes</div>
            <div className="text-xs mt-1 font-mono" style={{color:GOLD}}>{mult} XP</div>
          </button>;
        })}
      </div>
    </div>
  </div>;
}

function MapBackground() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" style={{imageRendering:"pixelated"}}>
      <defs>
        <linearGradient id="mapSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#050510"/>
          <stop offset="50%" stopColor="#0a0a20"/>
          <stop offset="100%" stopColor="#0d1b2a"/>
        </linearGradient>
      </defs>
      {/* Sky */}
      <rect width="400" height="300" fill="url(#mapSky)"/>
      {/* Stars */}
      {[...Array(40)].map((_,i)=> <rect key={`ms${i}`} x={5+i*10+(i%7)*3} y={3+(i*13)%80} width={i%5===0?"2":"1"} height={i%5===0?"2":"1"} fill={i%3===0?ACCENT:i%3===1?"#9b59b6":"#fff"} opacity={0.08+((i%5)*0.06)}/>)}
      {/* Distant mountains */}
      <polygon points="0,180 40,120 80,150 120,100 160,140 200,90 240,130 280,105 320,145 360,110 400,160 400,200 0,200" fill="#0a0f1a"/>
      <polygon points="0,190 50,140 100,170 150,130 200,160 250,120 300,150 350,130 400,170 400,210 0,210" fill="#0d1520"/>
      {/* Midground terrain */}
      <polygon points="0,210 30,190 70,200 120,185 170,195 220,180 270,195 320,185 370,200 400,190 400,300 0,300" fill="#0d1b0d"/>
      {/* Water/river */}
      <path d="M0,260 Q50,255 100,262 Q150,268 200,258 Q250,250 300,260 Q350,270 400,258" fill="none" stroke={ACCENT} strokeWidth="3" opacity="0.15"/>
      <path d="M0,264 Q50,259 100,266 Q150,272 200,262 Q250,254 300,264 Q350,274 400,262" fill="none" stroke={ACCENT} strokeWidth="1.5" opacity="0.08"/>
      {/* Trees scattered */}
      {[[30,195],[60,205],[90,198],[310,190],[340,200],[370,195],[150,188],[190,192],[260,188]].map(([x,y],i)=> <g key={`mt${i}`}>
        <rect x={x-3} y={y-12} width="8" height="14" fill="#1a3a1a" rx="2"/>
        <rect x={x-1} y={y-8} width="4" height="8" fill="#1f4520" rx="1"/>
        <rect x={x} y={y} width="2" height="6" fill="#3a2a1a"/>
      </g>)}
      {/* Path connecting locations — stone road (Act 1: top zigzag) */}
      <path d="M48,120 Q88,90 128,66 Q174,90 220,114 Q266,90 312,66 Q340,90 360,126" fill="none" stroke="#2a2a1a" strokeWidth="7" opacity="0.35"/>
      <path d="M48,120 Q88,90 128,66 Q174,90 220,114 Q266,90 312,66 Q340,90 360,126" fill="none" stroke="#3a3a2a" strokeWidth="3.5" opacity="0.25" strokeDasharray="6,4"/>
      {/* Path Act 2 (middle band) */}
      <path d="M360,126 Q320,155 304,174 Q248,190 192,204 Q140,195 88,186" fill="none" stroke="#2a2a1a" strokeWidth="6" opacity="0.3"/>
      <path d="M360,126 Q320,155 304,174 Q248,190 192,204 Q140,195 88,186" fill="none" stroke="#3a3a2a" strokeWidth="3" opacity="0.2" strokeDasharray="5,3"/>
      {/* Path Act 3 (lower left) */}
      <path d="M88,186 Q80,216 72,246 Q120,256 168,264" fill="none" stroke="#2a1a1a" strokeWidth="5" opacity="0.28"/>
      <path d="M88,186 Q80,216 72,246 Q120,256 168,264" fill="none" stroke="#3a2a1a" strokeWidth="2.5" opacity="0.18" strokeDasharray="5,3"/>
      {/* Path Act 4 (lower right) */}
      <path d="M168,264 Q220,256 272,246 Q316,230 360,216" fill="none" stroke="#1a2a1a" strokeWidth="5" opacity="0.25"/>
      <path d="M168,264 Q220,256 272,246 Q316,230 360,216" fill="none" stroke="#2a3a2a" strokeWidth="2.5" opacity="0.18" strokeDasharray="5,3"/>
      {/* Terminal building */}
      <rect x="38" y="114" width="20" height="14" fill="#0d1117" rx="1"/>
      <rect x="40" y="116" width="7" height="5" fill={ACCENT} opacity="0.2"/>
      <rect x="49" y="116" width="7" height="5" fill={ACCENT} opacity="0.15"/>
      {/* Vault entrance */}
      <rect x="120" y="58" width="16" height="18" fill="#1a0d2a" rx="2"/>
      <rect x="124" y="60" width="8" height="10" fill="#231040"/>
      <circle cx="128" cy="65" r="3" fill="none" stroke="#9b59b6" strokeWidth="0.8" opacity="0.4"/>
      {/* Crossroads signpost */}
      <rect x="218" y="106" width="4" height="14" fill="#5a4030"/>
      <rect x="211" y="107" width="18" height="4" fill="#6b5040" rx="1"/>
      {/* Loop Tower */}
      <rect x="306" y="50" width="12" height="24" fill="#152535" rx="1"/>
      <rect x="304" y="48" width="16" height="4" fill="#1a3050"/>
      <rect x="309" y="54" width="4" height="3" fill="#3498db" opacity="0.15"/>
      <rect x="309" y="60" width="4" height="3" fill="#3498db" opacity="0.1"/>
      <circle cx="312" cy="50" r="4" fill="none" stroke="#3498db" strokeWidth="0.5" opacity="0.2"/>
      {/* Archives */}
      <rect x="352" y="120" width="16" height="12" fill="#122828" rx="1"/>
      <rect x="354" y="122" width="5" height="6" fill="#1abc9c" opacity="0.08"/>
      <rect x="361" y="122" width="5" height="6" fill="#1abc9c" opacity="0.06"/>
      {/* The Forge */}
      <rect x="80" y="180" width="16" height="12" fill="#2a1010" rx="1"/>
      <rect x="83" y="176" width="10" height="5" fill="#1a0505"/>
      <rect x="86" y="174" width="4" height="4" fill="#ff4500" opacity="0.2"/>
      <rect x="84" y="183" width="6" height="4" fill="#ff4500" opacity="0.1"/>
      {/* The Map Room */}
      <rect x="184" y="198" width="16" height="12" fill="#2a2010" rx="1"/>
      <rect x="186" y="200" width="12" height="7" fill="#f0e6d2" opacity="0.1"/>
      <rect x="188" y="201" width="8" height="4" fill="#f39c12" opacity="0.08"/>
      {/* The Summit */}
      <polygon points="296,174 312,174 304,160" fill="#151530" opacity="0.8"/>
      <polygon points="299,174 309,174 304,163" fill="#1a1a40" opacity="0.6"/>
      <rect x="302" y="165" width="4" height="2" fill="#9b59b6" opacity="0.2"/>
      {/* The Workshop — arcade cabinet */}
      <rect x="64" y="240" width="16" height="12" fill="#2a1030" rx="1"/>
      <rect x="66" y="241" width="12" height="5" fill="#1a0020"/>
      <rect x="68" y="242" width="4" height="3" fill="#e91e63" opacity="0.2"/>
      <rect x="73" y="242" width="3" height="3" fill="#00e5ff" opacity="0.15"/>
      {/* The Colosseum — columns and arena */}
      <rect x="160" y="258" width="16" height="12" fill="#3e2723" rx="1"/>
      <rect x="160" y="256" width="3" height="14" fill="#5d4037" opacity="0.6"/>
      <rect x="173" y="256" width="3" height="14" fill="#5d4037" opacity="0.6"/>
      <rect x="163" y="260" width="10" height="6" fill="#ff5722" opacity="0.08"/>
      {/* The Dry Dock — scaffolding */}
      <rect x="264" y="240" width="16" height="12" fill="#1a2520" rx="1"/>
      <rect x="266" y="236" width="2" height="16" fill="#5d4037" opacity="0.5"/>
      <rect x="276" y="236" width="2" height="16" fill="#5d4037" opacity="0.5"/>
      <rect x="268" y="242" width="8" height="6" fill="#ff9800" opacity="0.1"/>
      {/* The Launch Pad — rocket */}
      <rect x="354" y="210" width="12" height="14" fill="#101a30" rx="1"/>
      <polygon points="356,210 360,202 364,210" fill="#263238" opacity="0.7"/>
      <rect x="358" y="204" width="2" height="2" fill="#00e676" opacity="0.2"/>
      <rect x="357" y="218" width="4" height="3" fill="#00e676" opacity="0.08"/>
      <rect x="363" y="218" width="4" height="3" fill="#00e676" opacity="0.08"/>
      {/* Fog at edges */}
      <rect x="0" y="0" width="400" height="300" fill="url(#mapSky)" opacity="0.15"/>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SETTINGS MODAL (API key management)
// ═══════════════════════════════════════════════════════════════════

function WorldMap({chapters,profile,onSelectChapter,onCharSheet,onCodex,onGrind,timeRemaining,sessionActive}){
  useEffect(()=>{warmUp().catch(()=>{})},[]);   // load Python in the background; a failure means the keyword grader
  const xp=profile.xp,cr=new Set(profile.completedRooms||[]),cb=new Set(profile.completedBosses||[]);
  const status=ch=>{
    if(ch.comingSoon)return "locked";if(xp<ch.requiredXp)return "locked";
    if(cb.has(ch.boss?.id))return "completed";
    if(ch.rooms?.some(r=>cr.has(r.id)))return "in-progress";return "available";
  };
  const nextLock=chapters.find(ch=>!ch.comingSoon&&xp<ch.requiredXp);
  const cls={
    locked:{bg:`${PANEL2}cc`,bd:"#333",tx:"#555",glow:"none"},
    available:{bg:`${PANEL2}ee`,bd:`${ACCENT}66`,tx:TEXT,glow:`0 0 12px ${ACCENT}22`},
    "in-progress":{bg:"#1a2a1add",bd:ACCENT,tx:ACCENT,glow:`0 0 20px ${ACCENT}44`},
    completed:{bg:"#0d2818dd",bd:"#00bfa5",tx:ACCENT,glow:`0 0 12px #00bfa522`}
  };

  return <div className="min-h-screen flex flex-col" style={{background:DARK}}>
    {/* HUD bar */}
    <div className="flex justify-between items-center p-4 border-b" style={{borderColor:"#ffffff08",background:`${PANEL}ee`,backdropFilter:"blur(8px)"}}>
      <div className="flex items-center gap-3">
        <button onClick={onCharSheet} className="cursor-pointer rounded-lg p-1 transition-all duration-300" style={{background:PANEL2,border:`1px solid ${ACCENT}33`}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=ACCENT}} onMouseLeave={e=>{e.currentTarget.style.borderColor=`${ACCENT}33`}}>
          <PixelAvatar {...profile.avatar} size={40}/></button>
        <div>
          <div className="text-sm font-bold" style={{color:TEXT}}>{profile.name}</div>
          <div className="text-xs" style={{color:DIM}}>Level {Math.floor(xp/100)+1} • {xp} XP</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <SessionTimer time={timeRemaining} active={sessionActive}/>
        <button onClick={onCodex} className="px-2 py-1.5 rounded-lg cursor-pointer text-xs font-bold transition-all duration-200"
          style={{background:PANEL2,border:`1px solid ${ACCENT}33`,color:ACCENT,fontFamily:MONO}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=ACCENT;e.currentTarget.style.boxShadow=`0 0 12px ${ACCENT}22`}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=`${ACCENT}33`;e.currentTarget.style.boxShadow="none"}}>📖 Codex</button>
        <button onClick={onGrind} className="px-2 py-1.5 rounded-lg cursor-pointer text-xs font-bold transition-all duration-200"
          style={{background:PANEL2,border:`1px solid #e67e2233`,color:"#e67e22",fontFamily:MONO}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="#e67e22";e.currentTarget.style.boxShadow=`0 0 12px #e67e2222`}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="#e67e2233";e.currentTarget.style.boxShadow="none"}}>⚔️ Practice</button>
        <div className="flex gap-1">{(profile.badges||[]).map((b,i)=><span key={i} title={b.name} className="text-lg">{b.icon}</span>)}</div>
      </div>
    </div>
    <div className="px-4 pt-2 max-w-sm"><XpBar current={xp} next={nextLock?.requiredXp||xp} label={nextLock?`Next: ${nextLock.name}`:"All unlocked!"}/></div>
    {/* Map area */}
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl rounded-xl overflow-hidden" style={{minHeight:"380px",border:"1px solid #ffffff08"}}>
        <MapBackground/>
        {/* Path lines overlay */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" style={{zIndex:1}}>
          {chapters.slice(0,-1).map((ch,i)=>{const n=chapters[i+1],st=status(n);return <line key={i}
            x1={ch.mapPosition.x} y1={ch.mapPosition.y} x2={n.mapPosition.x} y2={n.mapPosition.y}
            stroke={st!=="locked"?ACCENT:"#555"} strokeWidth={st!=="locked"?"0.6":"0.3"}
            strokeDasharray={st==="locked"?"2,2":"none"} opacity={st!=="locked"?0.5:0.3}/>})}
        </svg>
        {/* Chapter nodes */}
        {chapters.map(ch=>{const s=status(ch),c=cls[s];return <div key={ch.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2" style={{left:`${ch.mapPosition.x}%`,top:`${ch.mapPosition.y}%`,zIndex:2}}>
          <button onClick={()=>s!=="locked"&&onSelectChapter(ch)} disabled={s==="locked"}
            className="flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-300 cursor-pointer disabled:cursor-not-allowed"
            style={{background:c.bg,border:`2px solid ${c.bd}`,minWidth:"90px",maxWidth:"110px",boxShadow:c.glow,backdropFilter:"blur(8px)",animation:s==="in-progress"?"cq-glow-pulse 3s ease-in-out infinite":s==="available"?"cq-pulse 4s ease-in-out infinite":"none"}}
            onMouseEnter={e=>{if(s!=="locked"){e.currentTarget.style.transform="scale(1.08)";e.currentTarget.style.boxShadow=`0 0 30px ${c.bd}44`}}}
            onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow=c.glow}}>
            <span className="text-xl">{s==="locked"?"🔒":s==="completed"?"✅":ch.icon}</span>
            <span className="text-xs font-bold tracking-wide text-center leading-tight" style={{color:c.tx,textShadow:"0 1px 3px rgba(0,0,0,0.8)"}}>{ch.name}</span>
            <span className="text-center leading-tight" style={{color:DIM,fontSize:"8px",textShadow:"0 1px 2px rgba(0,0,0,0.9)"}}>{s==="locked"?`${ch.requiredXp} XP`:s==="completed"?"Complete!":ch.comingSoon?"Coming Soon":ch.subtitle}</span>
            {s==="in-progress"&&<div className="flex gap-1 mt-1">
              {ch.rooms.filter(r=>!r.optional).map(r=><div key={r.id} className="w-2 h-2 rounded-full" style={{background:cr.has(r.id)?ACCENT:"#444",border:`1px solid ${cr.has(r.id)?ACCENT:"#555"}`,boxShadow:cr.has(r.id)?`0 0 4px ${ACCENT}66`:"none"}}/>)}
              {ch.rooms.filter(r=>r.optional).map(r=><div key={r.id} className="w-2 h-2" style={{background:cr.has(r.id)?"#e67e22":"#444",border:`1px solid ${cr.has(r.id)?"#e67e22":"#555"}`,transform:"rotate(45deg)",boxShadow:cr.has(r.id)?`0 0 4px #e67e2266`:"none"}}/>)}
              {ch.boss&&<div className="w-2 h-2 rounded-full" style={{background:cb.has(ch.boss.id)?GOLD:"#444",border:`1px solid ${cb.has(ch.boss.id)?GOLD:`${GOLD}44`}`}}/>}
            </div>}
          </button>
        </div>})}
      </div>
    </div>
  </div>;
}

function ChapterOverview({chapter,profile,onSelectRoom,onSelectBoss,onBack}){
  const cr=new Set(profile.completedRooms||[]),cb=new Set(profile.completedBosses||[]);
  const mainRooms=chapter.rooms.filter(r=>!r.optional);
  const sideQuests=chapter.rooms.filter(r=>r.optional);
  const SIDE_COLOR="#e67e22";

  const RoomBtn=({room,i,avail,isSide})=>{
    const done=cr.has(room.id);
    const accent=isSide?SIDE_COLOR:ACCENT;
    return <button key={room.id} onClick={()=>avail&&onSelectRoom(room,!isSide&&i===0)} disabled={!avail}
      className="flex items-center gap-4 p-4 rounded-lg text-left transition-all duration-300 cursor-pointer disabled:cursor-not-allowed"
      style={{background:done?`${accent}08`:avail?PANEL2:DARK,border:`1px solid ${done?`${accent}44`:avail?"#ffffff22":"#ffffff08"}`,opacity:avail?1:0.4}}>
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{background:done?`${accent}22`:PANEL2,color:done?accent:DIM,border:`1px solid ${done?`${accent}44`:"#ffffff11"}`}}>
        {done?"✓":isSide?"⭐":i+1}</div>
      <div className="flex-1"><div className="font-bold text-sm" style={{color:done?accent:TEXT}}>{room.name}</div>
        <div className="text-xs" style={{color:DIM}}>{done?"Complete":isSide?"Side Quest":"Main Track"} • {room.xpReward} XP</div></div>
      {isSide&&!done&&<span className="text-xs px-2 py-1 rounded" style={{background:`${SIDE_COLOR}15`,color:SIDE_COLOR,border:`1px solid ${SIDE_COLOR}33`}}>Optional</span>}
    </button>;
  };

  return <div className="min-h-screen p-6" style={{background:`radial-gradient(ellipse at center,${PANEL} 0%,${DARK} 70%)`}}>
    <Btn onClick={onBack} color={DIM} className="mb-6">← Map</Btn>
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-4"><div className="text-4xl mb-2">{chapter.icon}</div>
        <h2 className="text-2xl font-bold mb-1" style={{fontFamily:MONO,color:TEXT}}>{chapter.name}</h2>
        <p style={{color:DIM}}>{chapter.subtitle}</p>
      </div>
      {chapter.scene&&<div className="mb-4"><SceneBanner scene={chapter.scene}/></div>}

      {/* Main Track */}
      <div className="mb-2">
        <h3 className="text-xs font-bold tracking-widest mb-3 flex items-center gap-2" style={{color:ACCENT}}>
          <span style={{display:"inline-block",width:"12px",height:"2px",background:ACCENT}}/>MAIN TRACK</h3>
      </div>
      <div className="flex flex-col gap-3">
        {mainRooms.map((room,i)=>{const avail=i===0||cr.has(mainRooms[i-1].id);
          return <RoomBtn key={room.id} room={room} i={i} avail={avail} isSide={false}/>;})}
      </div>

      {/* Side Quests */}
      {sideQuests.length>0&&<div className="mt-6 mb-2">
        <h3 className="text-xs font-bold tracking-widest mb-1 flex items-center gap-2" style={{color:SIDE_COLOR}}>
          <span style={{display:"inline-block",width:"12px",height:"2px",background:SIDE_COLOR}}/>SIDE QUESTS</h3>
        <p className="text-xs mb-3" style={{color:VDIM}}>Optional challenges — earn bonus XP and learn extra tricks!</p>
      </div>}
      <div className="flex flex-col gap-3">
        {sideQuests.map((room,i)=> <RoomBtn key={room.id} room={room} i={i} avail={true} isSide={true}/>)}
      </div>

      {/* Boss */}
      {chapter.boss&&(()=>{const allMainDone=mainRooms.every(r=>cr.has(r.id)),bDone=cb.has(chapter.boss.id);
        return <div className="mt-6"><button onClick={()=>allMainDone&&onSelectBoss(chapter.boss)} disabled={!allMainDone}
          className="flex items-center gap-4 p-4 rounded-lg text-left w-full cursor-pointer disabled:cursor-not-allowed"
          style={{background:bDone?"#2a1a0022":allMainDone?PANEL2:DARK,border:`2px solid ${bDone?`${GOLD}44`:allMainDone?`${GOLD}66`:"#ffffff08"}`,opacity:allMainDone?1:0.4}}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
            style={{background:bDone?`${GOLD}22`:PANEL2,border:`1px solid ${GOLD}66`}}>{bDone?"👑":"⚔️"}</div>
          <div className="flex-1"><div className="font-bold text-sm" style={{color:GOLD}}>BOSS: {chapter.boss.name}</div>
            <div className="text-xs" style={{color:DIM}}>{bDone?"Defeated!":allMainDone?"Ready to fight!":"Complete all main track rooms first"} • {chapter.boss.xpReward} XP</div></div>
        </button></div>})()}
    </div>
  </div>;
}

function CharacterSheet({profile,onBack}){
  return <div className="min-h-screen p-6" style={{background:`radial-gradient(ellipse at center,${PANEL} 0%,${DARK} 70%)`}}>
    <Btn onClick={onBack} color={DIM} className="mb-6">← Map</Btn>
    <div className="max-w-lg mx-auto">
      <div className="flex flex-col items-center mb-6 p-6 rounded-xl" style={{background:PANEL2,border:`1px solid ${ACCENT}33`}}>
        <PixelAvatar {...profile.avatar} size={128}/>
        <h2 className="text-xl font-bold mt-3" style={{color:TEXT,fontFamily:MONO}}>{profile.name}</h2>
        <div className="text-sm" style={{color:DIM}}>Level {Math.floor(profile.xp/100)+1}</div>
        <div className="w-full mt-3"><XpBar current={profile.xp%100} next={100} label="Next Level"/></div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[{l:"Total XP",v:profile.xp,i:"⭐"},{l:"Rooms",v:(profile.completedRooms||[]).length,i:"🚪"},{l:"Bosses",v:(profile.completedBosses||[]).length,i:"⚔️"}].map((s,i)=>
          <div key={i} className="p-3 rounded-lg text-center" style={{background:PANEL2}}>
            <div className="text-lg">{s.i}</div><div className="text-lg font-bold" style={{color:ACCENT}}>{s.v}</div><div className="text-xs" style={{color:DIM}}>{s.l}</div>
          </div>)}
      </div>
      <h3 className="text-sm font-bold mb-3 tracking-wider" style={{color:GOLD}}>🏅 BADGES</h3>
      <div className="flex flex-wrap gap-2 mb-6">
        {(profile.badges||[]).length===0&&<span className="text-xs" style={{color:VDIM}}>Defeat bosses to earn badges!</span>}
        {(profile.badges||[]).map((b,i)=><span key={i} className="px-3 py-2 rounded-lg text-sm" style={{background:`${GOLD}15`,border:`1px solid ${GOLD}44`,color:GOLD}}>{b.icon} {b.name}</span>)}
      </div>
      <h3 className="text-sm font-bold mb-3 tracking-wider" style={{color:"#e67e22"}}>🏆 TROPHIES</h3>
      <div className="grid grid-cols-2 gap-2">
        {TROPHIES.map(t=>{const e=(profile.trophies||[]).includes(t.id);return <div key={t.id} className="p-2 rounded-lg flex items-center gap-2"
          style={{background:e?"#e67e2215":`${DARK}88`,border:`1px solid ${e?"#e67e2244":"#ffffff08"}`,opacity:e?1:0.4}}>
          <span className="text-lg">{t.icon}</span><div><div className="text-xs font-bold" style={{color:e?"#e67e22":DIM}}>{t.name}</div><div className="text-xs" style={{color:VDIM}}>{t.desc}</div></div>
        </div>})}
      </div>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════
// CODEX — Concept Reference (Pokédex)
// ═══════════════════════════════════════════════════════════════════

function Codex({profile,onBack}){
  const [selectedChapter,setSelectedChapter]=useState(null);
  const [expandedConcept,setExpandedConcept]=useState(null);
  const cr=new Set(profile.completedRooms||[]);
  const cb=new Set(profile.completedBosses||[]);

  // Determine which chapters are "discovered" (at least one room completed)
  const discovered=ch=>CHAPTERS.findIndex(c=>c.id===ch)===0||CHAPTERS.find(c=>c.id===ch)?.rooms?.some(r=>cr.has(r.id))||cb.has(CHAPTERS.find(c=>c.id===ch)?.boss?.id);

  const categories=[...new Set(CODEX.flatMap(c=>c.concepts.map(x=>x.cat)))];
  const catIcons={output:"📤",data:"💾",types:"🔢",operators:"➕",strings:"📝",logic:"🔀",loops:"🔄",collections:"📦",functions:"⚙️",modules:"📦",errors:"🛡️"};

  const chaptersData=CODEX.filter(c=>discovered(c.chapter));
  const active=selectedChapter?CODEX.find(c=>c.chapter===selectedChapter):null;

  return <div className="min-h-screen p-6" style={{background:`radial-gradient(ellipse at center,${PANEL} 0%,${DARK} 70%)`}}>
    <div className="flex items-center gap-4 mb-6">
      <Btn onClick={onBack} color={DIM}>← Map</Btn>
      <div>
        <h2 className="text-xl font-bold" style={{fontFamily:MONO,color:ACCENT}}>📖 Code Codex</h2>
        <p className="text-xs" style={{color:DIM}}>Every concept you've unlocked — your Python knowledge base</p>
      </div>
    </div>
    <div className="max-w-3xl mx-auto flex gap-4" style={{minHeight:"70vh"}}>
      {/* Chapter sidebar */}
      <div className="flex flex-col gap-2" style={{minWidth:"140px"}}>
        {CODEX.map(ch=>{const unlocked=discovered(ch.chapter);return <button key={ch.chapter}
          onClick={()=>{if(unlocked){setSelectedChapter(ch.chapter);setExpandedConcept(null)}}}
          disabled={!unlocked}
          className="p-3 rounded-lg text-left cursor-pointer transition-all duration-200 disabled:cursor-not-allowed"
          style={{background:selectedChapter===ch.chapter?`${ch.color}22`:unlocked?PANEL2:`${DARK}88`,
            border:`1px solid ${selectedChapter===ch.chapter?ch.color:unlocked?"#ffffff11":"#ffffff05"}`,
            opacity:unlocked?1:0.35}}>
          <div className="text-lg mb-1">{unlocked?ch.icon:"🔒"}</div>
          <div className="text-xs font-bold" style={{color:unlocked?ch.color:DIM}}>{ch.title}</div>
          <div className="text-xs" style={{color:VDIM}}>{unlocked?`${ch.concepts.length} concepts`:"Locked"}</div>
        </button>})}
      </div>
      {/* Concept detail area */}
      <div className="flex-1">
        {!active?<div className="flex items-center justify-center h-full" style={{color:VDIM}}>
          <div className="text-center">
            <div className="text-4xl mb-3">📖</div>
            <div className="text-sm">Select a chapter to browse concepts</div>
            <div className="text-xs mt-2">{chaptersData.length} of {CODEX.length} chapters discovered</div>
          </div>
        </div>:<div>
          <div className="mb-4 p-3 rounded-lg" style={{background:`${active.color}11`,border:`1px solid ${active.color}33`}}>
            <span className="text-lg mr-2">{active.icon}</span>
            <span className="font-bold" style={{color:active.color}}>{active.title}</span>
            <span className="text-xs ml-3" style={{color:DIM}}>{active.concepts.length} concepts</span>
          </div>
          <div className="flex flex-col gap-2">
            {active.concepts.map((concept,i)=>{
              const isOpen=expandedConcept===i;
              return <div key={i} className="rounded-lg overflow-hidden transition-all duration-200"
                style={{background:isOpen?`${active.color}11`:PANEL2,border:`1px solid ${isOpen?active.color+"66":"#ffffff0a"}`}}>
                <button onClick={()=>setExpandedConcept(isOpen?null:i)} className="w-full p-3 text-left flex items-center gap-3 cursor-pointer">
                  <span className="text-sm">{catIcons[concept.cat]||"📌"}</span>
                  <span className="text-sm font-bold flex-1" style={{color:isOpen?active.color:TEXT}}>{concept.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded" style={{background:"#ffffff08",color:DIM}}>{concept.cat}</span>
                  <span style={{color:DIM,fontSize:"10px"}}>{isOpen?"▼":"▶"}</span>
                </button>
                {isOpen&&<div className="px-3 pb-3 border-t" style={{borderColor:"#ffffff08"}}>
                  <p className="text-sm mt-2 mb-3" style={{color:TEXT}}>{concept.desc}</p>
                  <div className="mb-2">
                    <div className="text-xs font-bold mb-1" style={{color:DIM}}>SYNTAX</div>
                    <pre className="p-2 rounded text-xs overflow-x-auto" style={{background:DARK,color:ACCENT,fontFamily:MONO,whiteSpace:"pre-wrap"}}>{concept.syntax}</pre>
                  </div>
                  <div>
                    <div className="text-xs font-bold mb-1" style={{color:DIM}}>EXAMPLE</div>
                    <pre className="p-2 rounded text-xs overflow-x-auto" style={{background:DARK,color:"#a8d8a8",fontFamily:MONO,whiteSpace:"pre-wrap"}}>{concept.ex}</pre>
                  </div>
                </div>}
              </div>;
            })}
          </div>
        </div>}
      </div>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════
// GRINDING ZONE — Practice Arena
// ═══════════════════════════════════════════════════════════════════

function GrindingZone({profile,onBack}){
  const [challenge,setChallenge]=useState(null);
  const [code,setCode]=useState("");
  const [parts,setParts]=useState([]);
  const [waiting,setWaiting]=useState(false);
  const [result,setResult]=useState(null);
  const [isRunning,setIsRunning]=useState(false);
  const [attempts,setAttempts]=useState([]);
  const [pyStatus,setPyStatus]=useState(pythonStatus);
  useEffect(()=>{setPyStatus(pythonStatus());return onPythonStatus(setPyStatus)},[]);   // re-read: it may have changed since the first render
  // Leaving a challenge mid-run stops the program (it may be waiting at input()) and drops its late output and result.
  const runSeq=useRef(0);
  const dropRun=()=>{runSeq.current++;stopCode();setIsRunning(false);setWaiting(false);setParts([]);setResult(null)};
  useEffect(()=>()=>{runSeq.current++;stopCode()},[]);

  // Challenges unlock as the player reaches each chapter
  const available=availablePractice(profile.completedRooms);

  const categories=[...new Set(available.map(g=>g.cat))];
  const catIcons={output:"📤",data:"💾",types:"🔢",operators:"➕",logic:"🔀",loops:"🔄",collections:"📦",functions:"⚙️",modules:"📦",errors:"🛡️"};

  const pickRandom=(cat)=>{
    const pool=cat?available.filter(g=>g.cat===cat):available;
    if(pool.length===0)return;
    const pick=pool[Math.floor(Math.random()*pool.length)];
    // Practice challenges have no id; their grading rules are keyed by their place in GRIND_CHALLENGES.
    dropRun();setChallenge({...pick,id:`grind_${GRIND_CHALLENGES.indexOf(pick)}`});setCode(pick.starterCode);setAttempts([]);
  };

  const handleRun=async()=>{
    if(isRunning)return;
    const seq=++runSeq.current,live=()=>seq===runSeq.current;
    setIsRunning(true);setParts([]);setResult(null);setWaiting(false);
    try{
      const r=await runAndGrade({code,challenge,rule:CHECKS[challenge.id],attempt:attempts.length+1,
        fallbackGrade:validateOffline,runner:PYTHON_RUNNER,
        onOutput:(text,kind)=>{if(live())setParts(p=>appendPart(p,text,kind))},
        onInputRequest:()=>{if(live())setWaiting(true)}});
      if(!live())return;
      setWaiting(false);setResult(r);
      setAttempts(prev=>[...prev,{code,feedback:r.feedback,passed:r.passes}]);
    }finally{if(live())setIsRunning(false)}
  };

  if(!challenge) return <div className="min-h-screen p-6" style={{background:`radial-gradient(ellipse at center,${PANEL} 0%,${DARK} 70%)`}}>
    <div className="flex items-center gap-4 mb-6">
      <Btn onClick={onBack} color={DIM}>← Map</Btn>
      <div>
        <h2 className="text-xl font-bold" style={{fontFamily:MONO,color:"#e67e22"}}>⚔️ Practice Arena</h2>
        <p className="text-xs" style={{color:DIM}}>Sharpen your skills with random challenges — no XP, just practice</p>
      </div>
    </div>
    <div className="max-w-lg mx-auto">
      <div className="mb-6 p-4 rounded-xl text-center" style={{background:PANEL2,border:`1px solid #e67e2233`}}>
        <div className="text-3xl mb-2">🎲</div>
        <Btn onClick={()=>pickRandom(null)} color="#e67e22" disabled={available.length===0}>Random Challenge</Btn>
        <div className="text-xs mt-2" style={{color:DIM}}>{available.length>0?`${available.length} challenges available`:"Clear your first room to unlock practice challenges"}</div>
      </div>
      {categories.length>0&&<h3 className="text-sm font-bold mb-3 tracking-wider" style={{color:DIM}}>BY CATEGORY</h3>}
      <div className="grid grid-cols-2 gap-3">
        {categories.map(cat=>{const count=available.filter(g=>g.cat===cat).length;return <button key={cat}
          onClick={()=>pickRandom(cat)}
          className="p-4 rounded-lg text-left cursor-pointer transition-all duration-200"
          style={{background:PANEL2,border:"1px solid #ffffff0a"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="#e67e2266"}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="#ffffff0a"}}>
          <div className="text-lg mb-1">{catIcons[cat]||"📌"}</div>
          <div className="text-sm font-bold" style={{color:TEXT}}>{cat}</div>
          <div className="text-xs" style={{color:DIM}}>{count} challenge{count!==1?"s":""}</div>
        </button>})}
      </div>
    </div>
  </div>;

  return <div className="min-h-screen flex flex-col" style={{background:`radial-gradient(ellipse at center,${PANEL} 0%,${DARK} 70%)`}}>
    {/* Top bar */}
    <div className="flex items-center justify-between p-3 border-b" style={{borderColor:"#ffffff11"}}>
      <div className="flex items-center gap-3">
        <Btn onClick={()=>{dropRun();setChallenge(null)}} color={DIM}>← Back</Btn>
        <div>
          <span className="text-sm font-bold" style={{color:"#e67e22"}}>{challenge.name}</span>
          <span className="text-xs ml-2 px-2 py-0.5 rounded" style={{background:"#e67e2218",color:"#e67e22"}}>{challenge.cat}</span>
          <span className="text-xs ml-2 px-2 py-0.5 rounded" style={{background:"#ffffff08",color:DIM}}>Practice — No XP</span>
        </div>
      </div>
      <Btn onClick={()=>pickRandom(challenge.cat)} color="#e67e22">🎲 New Challenge</Btn>
    </div>
    <div className="flex-1 flex flex-col lg:flex-row">
      {/* Task panel */}
      <div className="lg:w-2/5 p-4 border-b lg:border-b-0 lg:border-r overflow-y-auto" style={{borderColor:"#ffffff11",maxHeight:"calc(100vh - 56px)"}}>
        <div className="p-3 rounded-lg mb-4" style={{background:`#e67e2210`,border:`1px solid #e67e2233`}}>
          <h3 className="text-sm font-bold mb-2" style={{color:"#e67e22"}}>📋 Challenge</h3>
          <pre className="text-sm whitespace-pre-wrap" style={{color:TEXT,fontFamily:MONO}}>{challenge.task}</pre>
        </div>
      </div>
      {/* Code panel */}
      <div className="flex-1 flex flex-col p-4" style={{maxHeight:"calc(100vh - 56px)"}}>
        <CodeEditor code={code} setCode={setCode} onRun={handleRun} minHeight={200}/>
        <div className="flex flex-wrap items-center gap-3 my-3">
          <Btn onClick={isRunning?stopCode:handleRun} color={isRunning?ERR:ACCENT}>{isRunning?"■ Stop":"▶ Run (Ctrl+Enter)"}</Btn>
          {result&&<div className="flex items-center gap-2">
            <span>{result.passes?"✅":"❌"}</span>
            <span className="text-sm font-bold" style={{color:result.passes?ACCENT:ERR}}>{result.passes?"Great work!":"Not quite — keep trying!"}</span>
          </div>}
        </div>
        <OutputPanel status={pyStatus} parts={parts} waitingForInput={waiting} onAnswer={t=>{answerInput(t);setWaiting(false)}}
          error={result?.error||(result?.mode==="fallback"&&result.keywordError?{headline:result.keywordError}:null)}
          feedback={result?.feedback} passed={result?.passes} fallbackNote={result?.mode==="fallback"}/>
      </div>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════
// CHALLENGE ROOM — The core gameplay loop
// ═══════════════════════════════════════════════════════════════════

function ChallengeRoom({challenge,isBoss,replaying,onComplete,onBack,xpMultiplier,chapterIntroNpc,chapterIntroDialogue}){
  const [code,setCode]=useState(challenge.starterCode||"");
  const [parts,setParts]=useState([]);
  const [waiting,setWaiting]=useState(false);
  const [result,setResult]=useState(null);
  const [isRunning,setIsRunning]=useState(false);
  const [hintLevel,setHintLevel]=useState(0);
  const [passed,setPassed]=useState(false);
  const [showVictory,setShowVictory]=useState(false);
  const [usedHints,setUsedHints]=useState(false);
  const [attempts,setAttempts]=useState([]);
  const [dialoguePhase,setDialoguePhase]=useState(chapterIntroDialogue?"chapter-intro":challenge.npcDialogue?"room-intro":"play");

  const [showGuideHelp,setShowGuideHelp]=useState(false);
  const completedRef=useRef(false);
  const [pyStatus,setPyStatus]=useState(pythonStatus);
  useEffect(()=>{setPyStatus(pythonStatus());return onPythonStatus(setPyStatus)},[]);   // re-read: it may have changed since the first render
  // Leaving the room mid-run stops the program (it may be waiting at input()), and its result gets no sound or victory.
  const runSeq=useRef(0);
  useEffect(()=>()=>{runSeq.current++;stopCode()},[]);

  const handleRun=async()=>{
    if(isRunning||passed)return;
    const seq=++runSeq.current;
    setIsRunning(true);setParts([]);setResult(null);setWaiting(false);
    try{
      const r=await runAndGrade({code,challenge,rule:CHECKS[challenge.id],attempt:attempts.length+1,
        fallbackGrade:validateOffline,runner:PYTHON_RUNNER,
        onOutput:(text,kind)=>setParts(p=>appendPart(p,text,kind)),
        onInputRequest:()=>setWaiting(true)});
      if(seq!==runSeq.current)return;   // the kid left the room
      setWaiting(false);setResult(r);
      setAttempts(prev=>[...prev,{code,feedback:r.feedback,passed:r.passes}]);
      if(r.passes){setPassed(true);try{SFX.codeSuccess()}catch(e){};try{Music.playVictory()}catch(e){};setTimeout(()=>setShowVictory(true),500);}
      else{try{SFX.codeFail()}catch(e){}}
    }finally{setIsRunning(false)}
  };

  const earnedXp=replaying?0:Math.round(challenge.xpReward*xpMultiplier);
  const concepts=getConceptsForChallenge(challenge);

  // Dialogue phases
  if(dialoguePhase==="chapter-intro")return <NPCDialogue key="chapter-intro" npc={chapterIntroNpc} lines={chapterIntroDialogue} onComplete={()=>setDialoguePhase(challenge.npcDialogue?"room-intro":"play")}/>;
  if(dialoguePhase==="room-intro")return <NPCDialogue key="room-intro" npc={challenge.npc||"byte"} lines={challenge.npcDialogue} onComplete={()=>setDialoguePhase("play")}/>;

  return <div className="min-h-screen flex flex-col" style={{background:isBoss?`radial-gradient(ellipse at center,#1a0d2a 0%,${DARK} 70%)`:`radial-gradient(ellipse at center,${PANEL} 0%,${DARK} 70%)`}}>
    {/* Top bar */}
    <div className="flex items-center justify-between p-3 border-b" style={{borderColor:"#ffffff11"}}>
      <Btn onClick={onBack} color={DIM} style={{padding:"4px 12px",fontSize:"12px"}}>← Back</Btn>
      <div className="flex items-center gap-2">
        {isBoss&&<span className="text-xs px-2 py-1 rounded" style={{background:`${GOLD}22`,color:GOLD}}>⚔️ BOSS</span>}
        <span className="text-sm font-bold" style={{color:TEXT}}>{challenge.name}</span>
      </div>
      <div className="text-xs font-mono" style={{color:replaying?DIM:ACCENT}}>{replaying?"Replay · no XP":`+${earnedXp} XP`}</div>
    </div>

    {challenge.scene&&<div className="px-4 pt-2"><SceneBanner scene={challenge.scene}/></div>}

    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      {/* Left: narrative + task + help */}
      <div className="lg:w-2/5 p-4 overflow-y-auto border-b lg:border-b-0 lg:border-r" style={{borderColor:"#ffffff11"}}>
        <div className="text-sm mb-3 leading-relaxed whitespace-pre-wrap" style={{color:DIM,fontStyle:"italic"}}>{challenge.narrative}</div>
        <div className="p-3 rounded-lg mb-3" style={{background:PANEL2,border:`1px solid ${ACCENT}33`}}>
          <div className="text-xs font-bold mb-2 tracking-wider" style={{color:ACCENT}}>YOUR TASK</div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed" style={{color:TEXT}}>{challenge.task}</div>
        </div>

        {/* Hints */}
        <div className="mb-3">
          {hintLevel<challenge.hints.length&&<button onClick={()=>{setHintLevel(h=>h+1);setUsedHints(true)}}
            className="text-xs px-3 py-1 rounded cursor-pointer" style={{color:GOLD,background:`${GOLD}11`,border:`1px solid ${GOLD}33`}}>
            💡 Hint ({challenge.hints.length-hintLevel} left)</button>}
          {challenge.hints.slice(0,hintLevel).map((h,i)=><div key={i} className="mt-2 p-3 rounded text-xs whitespace-pre-wrap"
            style={{background:`${GOLD}11`,color:`${GOLD}cc`,border:`1px solid ${GOLD}22`}}>💡 {h}</div>)}
        </div>

        {/* Help buttons */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={()=>setShowGuideHelp(!showGuideHelp)}
            className="text-xs px-3 py-1.5 rounded cursor-pointer transition-all duration-200"
            style={{color:GOLD,background:showGuideHelp?`${GOLD}22`:`${GOLD}11`,border:`1px solid ${showGuideHelp?GOLD:`${GOLD}33`}`}}>
            📖 {showGuideHelp?"Hide Guide":"Concept Guide"}
          </button>
          {attempts.length>0&&<span className="text-xs py-1.5" style={{color:VDIM}}>Attempt #{attempts.length}</span>}
        </div>

        {/* Concept guide */}
        {showGuideHelp&&(
          <div className="mt-3 rounded-lg overflow-hidden" style={{background:DARK,border:`1px solid ${GOLD}33`}}>
            <div className="p-2 text-xs font-bold tracking-wider" style={{background:`${GOLD}11`,color:GOLD}}>📖 CONCEPT GUIDE</div>
            <div className="p-3 max-h-64 overflow-y-auto">
              {concepts.map(c=>{const help=CONCEPT_HELP[c];if(!help)return null;
                return <div key={c} className="mb-4">
                  <div className="text-xs font-bold mb-1 uppercase tracking-wider" style={{color:GOLD}}>{c.replace("-"," ")}</div>
                  {help.map((line,i)=><div key={i} className="text-xs mb-1 whitespace-pre-wrap" style={{color:TEXT,fontFamily:MONO,lineHeight:"1.5"}}>{line}</div>)}
                </div>})}
            </div>
          </div>
        )}
      </div>

      {/* Right: editor + output */}
      <div className="lg:w-3/5 flex flex-col">
        <div className="flex-1 flex flex-col p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono tracking-wider" style={{color:DIM}}>PYTHON EDITOR</span>
            <span className="text-xs" style={{color:VDIM}}>Ctrl+Enter to run</span>
          </div>
          <CodeEditor code={code} setCode={setCode} onRun={handleRun}/>
          <Btn onClick={isRunning?stopCode:handleRun} disabled={passed} className="mt-3" color={isRunning?ERR:passed?"#00bfa5":ACCENT}>
            {isRunning?"■ Stop":passed?"✓ Passed!":"▶ Run Code"}</Btn>
        </div>
        <div className="p-4 border-t" style={{borderColor:"#ffffff11",minHeight:"100px"}}>
          <div className="text-xs font-mono tracking-wider mb-2" style={{color:DIM}}>OUTPUT</div>
          <div style={result?{animation:result.passes?"cq-slide-in 0.3s ease-out":"cq-shake 0.4s ease-out"}:undefined}>
            <OutputPanel status={pyStatus} parts={parts} waitingForInput={waiting} onAnswer={t=>{answerInput(t);setWaiting(false)}}
              error={result?.error||(result?.mode==="fallback"&&result.keywordError?{headline:result.keywordError}:null)}
              feedback={result?.feedback} passed={result?.passes} fallbackNote={result?.mode==="fallback"}/>
          </div>
        </div>
      </div>
    </div>

    {/* Victory */}
    {showVictory&&<div className="fixed inset-0 flex items-center justify-center z-50" style={{background:"rgba(0,0,0,0.85)"}}>
      <Particles active={showVictory} type={isBoss?"boss":"victory"} count={isBoss?36:24}/>
      <div className="text-center p-8 rounded-xl max-w-sm mx-4" style={{background:isBoss?"linear-gradient(135deg,#1a0d2a,#0d1b2a)":`linear-gradient(135deg,${PANEL},#0a1a14)`,border:`2px solid ${isBoss?GOLD:ACCENT}`,boxShadow:`0 0 40px ${isBoss?`${GOLD}33`:`${ACCENT}33`}`,animation:"cq-scale-in 0.4s ease-out"}}>
        <div className="text-5xl mb-3">{isBoss?"👑":"⭐"}</div>
        <h3 className="text-xl font-bold mb-2" style={{color:isBoss?GOLD:ACCENT}}>{isBoss?"BOSS DEFEATED!":"ROOM CLEARED!"}</h3>
        {replaying
          ?<div className="text-sm mb-3" style={{color:DIM}}>Practice replay — no XP this time</div>
          :<div className="text-3xl font-bold font-mono mb-1" style={{color:ACCENT,animation:"cq-pulse 1.5s ease-in-out infinite"}}>+{earnedXp} XP</div>}
        {!usedHints&&<div className="text-xs mb-3" style={{color:GOLD}}>🙈 No hints used!</div>}
        <Btn onClick={()=>{
          // Once only: the overlay closes so a second Enter/Space can't award XP again
          if(completedRef.current)return;completedRef.current=true;setShowVictory(false);
          try{isBoss?SFX.bossDefeat():SFX.roomClear()}catch(e){};onComplete(earnedXp,!usedHints)}} color={isBoss?GOLD:ACCENT}>CONTINUE →</Btn>
      </div>
    </div>}
  </div>;
}

function BadgeUnlock({badge,onContinue}){
  useEffect(()=>{try{SFX.badgeUnlock()}catch(e){}},[]);
  return <div className="fixed inset-0 flex items-center justify-center z-50" style={{background:"rgba(0,0,0,0.9)"}}>
    <Particles active={true} type="badge" count={28}/>
    <div className="text-center p-10 rounded-xl max-w-sm mx-4" style={{background:"linear-gradient(135deg,#1a0d2a,#0d1b2a)",border:`2px solid ${GOLD}`,boxShadow:`0 0 60px ${GOLD}33`,animation:"cq-scale-in 0.5s ease-out"}}>
      <div className="text-6xl mb-4" style={{animation:"cq-pulse 2s ease-in-out infinite"}}>{badge.icon}</div>
      <div className="text-xs tracking-widest mb-2" style={{color:GOLD}}>NEW ABILITY UNLOCKED</div>
      <h3 className="text-2xl font-bold mb-6" style={{color:GOLD,fontFamily:MONO}}>{badge.name}</h3>
      <Btn onClick={onContinue} color={GOLD}>CONTINUE</Btn>
    </div>
  </div>;
}

function TrophyUnlock({trophy,onContinue}){
  useEffect(()=>{try{SFX.trophyUnlock()}catch(e){}},[]);
  return <div className="fixed inset-0 flex items-center justify-center z-50" style={{background:"rgba(0,0,0,0.9)"}}>
    <Particles active={true} type="boss" count={30}/>
    <div className="text-center p-8 rounded-xl max-w-sm mx-4" style={{background:"linear-gradient(135deg,#2a1a0a,#1a0d0a)",border:"2px solid #e67e22",boxShadow:"0 0 40px #e67e2233",animation:"cq-scale-in 0.5s ease-out"}}>
      <div className="text-5xl mb-3" style={{animation:"cq-pulse 2s ease-in-out infinite"}}>{trophy.icon}</div>
      <div className="text-xs tracking-widest mb-2" style={{color:"#e67e22"}}>TROPHY EARNED</div>
      <h3 className="text-xl font-bold mb-2" style={{color:"#e67e22",fontFamily:MONO}}>{trophy.name}</h3>
      <p className="text-sm mb-4" style={{color:DIM}}>{trophy.desc}</p>
      <Btn onClick={onContinue} color="#e67e22">CONTINUE</Btn>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════

export default function App(){
  const [screen,setScreen]=useState("loading");
  const [profiles,setProfiles]=useState([]);
  const [activeProfileId,setActiveProfileId]=useState(null);
  const [profile,setProfile]=useState(null);

  const [currentChapter,setCurrentChapter]=useState(null);
  const [currentChallenge,setCurrentChallenge]=useState(null);
  const [isBossChallenge,setIsBossChallenge]=useState(false);
  const [chapterIntroNpc,setChapterIntroNpc]=useState(null);
  const [chapterIntroDialogue,setChapterIntroDialogue]=useState(null);

  const [timeRemaining,setTimeRemaining]=useState(null);
  const [sessionActive,setSessionActive]=useState(false);
  const [xpMultiplier,setXpMultiplier]=useState(1);
  const [roomsThisSession,setRoomsThisSession]=useState(0);

  const [replaying,setReplaying]=useState(false);
  const [pendingBadge,setPendingBadge]=useState(null);
  const [pendingTrophies,setPendingTrophies]=useState([]);
  const [queuedBadge,setQueuedBadge]=useState(null);
  const [musicMuted,setMusicMuted]=useState(false);

  // Music: play the right track when screen/context changes
  useEffect(()=>{
    if(screen==="loading")return;
    const track=getTrackForContext({screen,chapterId:currentChapter?.id,isBoss:isBossChallenge});
    Music.play(track);
  },[screen,currentChapter?.id,isBossChallenge]);

  useEffect(()=>{(async()=>{
    // Older versions kept an Anthropic API key here for Tutor mode; it is no longer used.
    try{localStorage.removeItem("cq:api-key")}catch{}
    const list=await loadProfileList();
    if(list.length>0){const loaded=[];for(const p of list){const d=await loadProfile(p.id);if(d)loaded.push({...normalizeProfile(d),id:p.id})}
      setProfiles(loaded);setScreen("profiles");
    }else setScreen("title");
  })()},[]);

  useEffect(()=>{
    if(!sessionActive||timeRemaining===null||timeRemaining<=0)return;
    const t=setInterval(()=>setTimeRemaining(v=>v-1),1000);return()=>clearInterval(t);
  },[sessionActive,timeRemaining]);

  const persistProfile=useCallback(async p=>{
    if(!activeProfileId)return;
    await saveProfile(activeProfileId,p);setProfile(p);
    setProfiles(prev=>prev.map(x=>x.id===activeProfileId?{...p,id:activeProfileId}:x));
  },[activeProfileId]);

  const handleCharacterCreated=async data=>{
    const id=`hero_${Date.now()}`;
    await saveProfile(id,data);
    const list=await loadProfileList();list.push({id,name:data.name});await saveProfileList(list);
    setProfiles(prev=>[...prev,{...data,id}]);setActiveProfileId(id);setProfile(data);
    setScreen("session");
  };

  const handleSelectProfile=async id=>{const d=await loadProfile(id);if(d){setActiveProfileId(id);setProfile(normalizeProfile(d));setScreen("session")}};

  const startSession=minutes=>{
    setXpMultiplier(minutes<=10?1:minutes<=15?1.2:minutes<=20?1.5:2);
    setTimeRemaining(minutes*60);setSessionActive(true);setRoomsThisSession(0);setScreen("map");
  };

  const selectChapter=ch=>{try{SFX.menuNav()}catch(e){}setCurrentChapter(ch);setScreen("chapter");};
  const selectRoom=(room,isFirst)=>{
    try{SFX.roomEnter()}catch(e){}
    setCurrentChallenge(room);setIsBossChallenge(false);
    const cr=new Set(profile.completedRooms||[]);
    setReplaying(cr.has(room.id));
    if(isFirst&&!cr.has(room.id)&&currentChapter.introDialogue){
      setChapterIntroNpc(currentChapter.introNpc);setChapterIntroDialogue(currentChapter.introDialogue);
    }else{setChapterIntroNpc(null);setChapterIntroDialogue(null)}
    setScreen("challenge");
  };
  const selectBoss=boss=>{try{SFX.roomEnter()}catch(e){}setCurrentChallenge(boss);setIsBossChallenge(true);setReplaying((profile.completedBosses||[]).includes(boss.id));setChapterIntroNpc(null);setChapterIntroDialogue(null);setScreen("challenge")};

  const completeChallenge=async(earnedXp,noHints)=>{
    const r=afterClear(profile,{id:currentChallenge.id,isBoss:isBossChallenge,xp:earnedXp,noHints,roomsThisSession:roomsThisSession+1});
    if(r.firstClear)try{SFX.xpGain()}catch(e){}
    if(r.changed)await persistProfile(r.profile);
    setRoomsThisSession(n=>n+1);
    if(r.newTrophies.length>0){setPendingTrophies(r.newTrophies);setQueuedBadge(r.badge)}
    else if(r.badge)setPendingBadge(r.badge);
    else setScreen("chapter");
  };

  // Show every trophy earned at once, then the boss badge, then the chapter
  const dismissTrophy=()=>{
    const rest=pendingTrophies.slice(1);
    setPendingTrophies(rest);
    if(rest.length>0)return;
    if(queuedBadge){setPendingBadge(queuedBadge);setQueuedBadge(null);return}
    setScreen("chapter");
  };

  if(screen==="loading")return <div className="min-h-screen flex items-center justify-center" style={{background:DARK}}><div style={{color:ACCENT,fontFamily:MONO}}>Loading...</div></div>;

  return <ErrorBoundary><div style={{fontFamily:MONO,minHeight:"100vh"}}>
    <GlobalStyles/>
    <ScreenWrap screenKey={screen}>
    {screen==="title"&&<TitleScreen onStart={()=>setScreen("create")}/>}
    {screen==="profiles"&&<ProfileSelect profiles={profiles} onSelect={handleSelectProfile} onCreate={()=>setScreen("create")}/>}
    {screen==="create"&&<CharacterCreate onComplete={handleCharacterCreated} existingProfiles={profiles}/>}
    {screen==="session"&&profile&&<SessionSetup onSelect={startSession} profile={profile}/>}
    {screen==="map"&&profile&&<WorldMap chapters={CHAPTERS} profile={profile} onSelectChapter={selectChapter} onCharSheet={()=>setScreen("charsheet")} onCodex={()=>setScreen("codex")} onGrind={()=>setScreen("grind")} timeRemaining={timeRemaining} sessionActive={sessionActive}/>}
    {screen==="charsheet"&&profile&&<CharacterSheet profile={profile} onBack={()=>setScreen("map")}/>}
    {screen==="codex"&&profile&&<Codex profile={profile} onBack={()=>setScreen("map")}/>}
    {screen==="grind"&&profile&&<GrindingZone profile={profile} onBack={()=>setScreen("map")}/>}
    {screen==="chapter"&&currentChapter&&profile&&<ChapterOverview chapter={currentChapter} profile={profile} onSelectRoom={selectRoom} onSelectBoss={selectBoss} onBack={()=>setScreen("map")}/>}
    {screen==="challenge"&&currentChallenge&&<ChallengeRoom key={currentChallenge.id} challenge={currentChallenge} isBoss={isBossChallenge} replaying={replaying}
      onComplete={completeChallenge} onBack={()=>setScreen("chapter")} xpMultiplier={xpMultiplier}
      chapterIntroNpc={chapterIntroNpc} chapterIntroDialogue={chapterIntroDialogue}/>}
    </ScreenWrap>
    {pendingTrophies.length>0&&<TrophyUnlock key={pendingTrophies[0].id} trophy={pendingTrophies[0]} onContinue={dismissTrophy}/>}
    {pendingBadge&&<BadgeUnlock badge={pendingBadge} onContinue={()=>{setPendingBadge(null);setScreen("chapter")}}/>}
    {/* Music controls */}
    <div className="fixed bottom-4 right-4 flex gap-2" style={{zIndex:100}}>
      <button onClick={()=>{const m=Music.toggleMute();setMusicMuted(m)}}
        className="w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all"
        style={{background:PANEL2,border:`1px solid ${musicMuted?"#ffffff22":ACCENT+"44"}`,color:musicMuted?DIM:ACCENT,opacity:0.8}}
        title={musicMuted?"Unmute music":"Mute music"}>
        {musicMuted?"🔇":"🎵"}
      </button>
    </div>
  </div></ErrorBoundary>;
}
