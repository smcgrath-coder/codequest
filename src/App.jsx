import React, { useState, useEffect, useCallback, useRef, Component } from "react";
import * as Tone from "tone";
import { Music, getTrackForContext } from "./music.js";

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
// CONSTANTS & THEME
// ═══════════════════════════════════════════════════════════════════

const DARK = "#0a0a14";
const PANEL = "#0d1b2a";
const PANEL2 = "#1a1a2e";
const ACCENT = "#64ffda";
const GOLD = "#ffd700";
const TEXT = "#ccd6f6";
const DIM = "#8892b0";
const VDIM = "#4a5568";
const MONO = "'Courier New', monospace";
const ERR = "#ff6b6b";

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
            <div className="text-sm leading-relaxed" style={{color:TEXT,fontFamily:MONO,lineHeight:"1.7"}}>
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
// NON-LLM VALIDATION ENGINE (Built-in Guide mode)
// ═══════════════════════════════════════════════════════════════════

const COMMON_ERRORS = [
  { pattern: /print\s+[^(]/, msg: "It looks like you forgot the parentheses after print. In Python 3, it's print(\"text\"), not print \"text\"." },
  { pattern: /print\([^"'][a-zA-Z]/, check: (code, ch) => {
    // Only flag if it looks like they're printing an undefined variable
    if (code.match(/print\(\s*[a-zA-Z_]+\s*\)/) && !code.match(/\w+\s*=/)) return true;
    return false;
  }, msg: "Are you trying to print a variable? Make sure you've created the variable first with = before printing it." },
  { pattern: /[^=!<>]=[^=]/, check: (code) => {
    // Check for = where == was probably meant inside an if
    const ifLines = code.split('\n').filter(l => l.trim().startsWith('if') || l.trim().startsWith('elif'));
    return ifLines.some(l => l.match(/[^=!<>]=[^=]/) && !l.includes('==') && !l.includes('!=') && !l.includes('<=') && !l.includes('>='));
  }, msg: "Inside an if statement, use == (double equals) to compare values. Single = is for assigning variables." },
  { pattern: /if.*[^:]$/, check: (code) => code.split('\n').some(l => (l.trim().startsWith('if ')||l.trim().startsWith('elif ')) && !l.trim().endsWith(':')), msg: "Don't forget the colon (:) at the end of your if/elif/else line!" },
  { pattern: /else[^:]/, check: (code) => code.split('\n').some(l => l.trim().startsWith('else') && !l.trim().endsWith(':')), msg: "Don't forget the colon (:) after else!" },
  { pattern: /print\(.*\+.*\)/, check: (code) => {
    // Check for type mismatch in concatenation
    return code.match(/print\(.*".*"\s*\+\s*\d/) || code.match(/print\(.*\d\s*\+\s*".*"/);
  }, msg: "You can't add strings and numbers directly. Use an f-string like f\"text {variable}\" or convert the number with str()." },
];

function validateOffline(code, challenge, attemptCount) {
  const trimmed = code.trim();
  const lines = trimmed.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));

  // Empty code
  if (lines.length === 0) {
    return {
      output: "", error: null, passes: false,
      feedback: attemptCount > 1
        ? "Your code is empty or just comments. Try writing some Python! Start with what the task asks for."
        : "Nothing to run yet — write some code and click Run!"
    };
  }

  // Check common errors
  for (const err of COMMON_ERRORS) {
    if (err.check) {
      if (err.check(trimmed, challenge)) return { output: "", error: err.msg, passes: false, feedback: "Fix this error and try again! You're getting closer." };
    } else if (trimmed.match(err.pattern)) {
      return { output: "", error: err.msg, passes: false, feedback: "Fix this error and try again!" };
    }
  }

  // Challenge-specific validation using keywords and patterns
  const expected = (challenge.expectedBehavior || "").toLowerCase();
  const task = (challenge.task || "").toLowerCase();
  let score = 0;
  let maxScore = 0;
  const issues = [];

  // Check for required keywords/constructs
  const checks = [];

  if (expected.includes("print")) {
    checks.push({ test: trimmed.includes("print("), label: "use print()", weight: 3 });
  }
  if (expected.includes("variable") || expected.includes("create") || expected.includes("must create")) {
    checks.push({ test: trimmed.includes("=") && !trimmed.match(/^[^=]*==[^=]*$/), label: "create a variable with =", weight: 2 });
  }
  if (expected.includes("f-string") || expected.includes("f\"") || task.includes("f-string")) {
    checks.push({ test: trimmed.includes('f"') || trimmed.includes("f'"), label: "use an f-string (start with f before the quotes)", weight: 3 });
  }
  if (expected.includes("if") || expected.includes("conditional")) {
    checks.push({ test: trimmed.includes("if "), label: "use an if statement", weight: 3 });
  }
  if (expected.includes("elif")) {
    checks.push({ test: trimmed.includes("elif "), label: "use elif for additional conditions", weight: 2 });
  }
  if (expected.includes("else")) {
    checks.push({ test: trimmed.includes("else"), label: "include an else clause", weight: 2 });
  }
  if (expected.includes(".upper()")) {
    checks.push({ test: trimmed.includes(".upper()"), label: "use .upper()", weight: 2 });
  }
  if (expected.includes(".replace(")) {
    checks.push({ test: trimmed.includes(".replace("), label: "use .replace()", weight: 2 });
  }
  if (expected.includes("len(")) {
    checks.push({ test: trimmed.includes("len("), label: "use len()", weight: 2 });
  }
  if (expected.includes("type(")) {
    checks.push({ test: trimmed.includes("type("), label: "use type()", weight: 2 });
  }
  if (expected.includes("or") && expected.includes("condition")) {
    checks.push({ test: trimmed.includes(" or "), label: "use 'or' to combine conditions", weight: 2 });
  }
  if (expected.includes("and") && expected.includes("condition")) {
    checks.push({ test: trimmed.includes(" and "), label: "use 'and' to combine conditions", weight: 2 });
  }
  if (expected.includes("nested")) {
    const indentLevels = lines.map(l => l.match(/^(\s*)/)[1].length);
    const hasNesting = indentLevels.some(l => l >= 8);
    checks.push({ test: hasNesting, label: "use nested if statements (indented inside another if)", weight: 3 });
  }

  // Specific value checks from expected behavior
  const numMatches = expected.match(/(?:print|output|display|should be|gives? (?:you )?|= )(\d+(?:\.\d+)?)/g);
  if (numMatches) {
    for (const m of numMatches) {
      const num = m.match(/(\d+(?:\.\d+)?)/)[1];
      checks.push({ test: trimmed.includes(num) || lines.some(l => l.includes(num)), label: `produce the value ${num}`, weight: 1 });
    }
  }

  // Score
  for (const c of checks) {
    maxScore += c.weight;
    if (c.test) score += c.weight;
    else issues.push(c.label);
  }

  // If no specific checks could be generated, be lenient
  if (maxScore === 0) {
    return {
      output: "(Output preview not available in Guide mode)",
      error: null,
      passes: lines.length >= 1 && trimmed.includes("print("),
      feedback: trimmed.includes("print(")
        ? "Your code looks reasonable! In Guide mode I can't fully verify the output, but it looks like you're on the right track. Check that your output matches what the task asks for."
        : "Make sure you're using print() to display your results!"
    };
  }

  const pct = score / maxScore;
  const passes = pct >= 0.8 && issues.length <= 1;

  if (passes) {
    return {
      output: "(Output preview not available in Guide mode)",
      error: null, passes: true,
      feedback: "Great work! Your code has all the right pieces. You've got this! 🎉"
    };
  }

  // Progressive feedback based on attempt count
  let feedback;
  if (attemptCount <= 1) {
    feedback = issues.length > 0
      ? `Almost! Make sure you ${issues[0]}.`
      : "Not quite — re-read the task and check your code carefully.";
  } else if (attemptCount <= 3) {
    feedback = issues.length > 0
      ? `You're missing a few things. Try to: ${issues.slice(0, 2).join(" and ")}. You can do this!`
      : "Getting closer! Compare what you wrote to what the task is asking for, step by step.";
  } else {
    feedback = issues.length > 0
      ? `Here's exactly what's needed: ${issues.join(", ")}. Try the hints if you're stuck — they'll walk you through it!`
      : "Try using the hints — they'll give you a clearer picture of what the code should look like.";
  }

  return { output: "", error: null, passes: false, feedback };
}

// ═══════════════════════════════════════════════════════════════════
// NON-LLM CONCEPT EXPLAINER (for "Help" button in Guide mode)
// ═══════════════════════════════════════════════════════════════════

const CONCEPT_HELP = {
  "print": [
    "print() is a function that makes Python display text on screen.",
    "You put your message INSIDE the parentheses, wrapped in quotes:\n  print(\"Hello!\")",
    "Single quotes work too:\n  print('Hello!')",
    "Each print() starts a new line automatically.",
  ],
  "variable": [
    "A variable is like a labeled box that stores information.",
    "Create one with the = sign:\n  name = \"Alex\"\n  age = 12",
    "The name goes on the LEFT, the value on the RIGHT.",
    "To see what's inside, use print():\n  print(name)  ← no quotes around the variable name!",
    "IMPORTANT: print(name) shows the VALUE inside the box. print(\"name\") shows the literal word 'name'.",
  ],
  "f-string": [
    "An f-string lets you mix variables into text.",
    "Start with f before the quotes:\n  f\"Hello {name}!\"",
    "Anything inside {curly braces} gets replaced with the variable's value.",
    "Example:\n  name = \"Alex\"\n  print(f\"Hi {name}!\")  →  Hi Alex!",
  ],
  "data-types": [
    "Python has different TYPES of data:",
    "STRING (str) = text, always in quotes:\n  \"hello\"  '42'  \"true\"",
    "INTEGER (int) = whole numbers:\n  42  -7  0  1000",
    "FLOAT = decimal numbers:\n  3.14  -0.5  100.0",
    "BOOLEAN (bool) = True or False\n  (Capitalized! true won't work)",
    "Check any value's type with type():\n  print(type(42))  →  <class 'int'>",
  ],
  "if-else": [
    "if/else lets your code make decisions.",
    "Structure:\n  if condition:\n      do_something()\n  else:\n      do_other_thing()",
    "The COLON (:) at the end of if/else is required!",
    "The INDENTATION (4 spaces) tells Python which code belongs to each branch.",
    "Conditions use comparisons:\n  == equal  != not equal\n  > greater  < less\n  >= greater or equal  <= less or equal",
  ],
  "elif": [
    "elif (short for 'else if') adds more branches:",
    "  if x > 90:\n      print(\"A\")\n  elif x > 80:\n      print(\"B\")\n  elif x > 70:\n      print(\"C\")\n  else:\n      print(\"F\")",
    "Python checks from TOP to BOTTOM and runs the FIRST match.",
    "else is the catch-all — it runs if nothing above matched.",
  ],
  "logic": [
    "Combine conditions with and, or, not:",
    "AND — both must be true:\n  if age >= 13 and has_ticket:\n      print(\"Enter!\")",
    "OR — at least one must be true:\n  if is_member or has_pass:\n      print(\"Welcome!\")",
    "NOT — flips true to false:\n  if not is_locked:\n      print(\"Open!\")",
  ],
  "math": [
    "Python math operators:",
    "  +  add        10 + 3 = 13\n  -  subtract   10 - 3 = 7\n  *  multiply   10 * 3 = 30\n  /  divide     10 / 3 = 3.333...\n  // int divide  10 // 3 = 3\n  ** power      2 ** 3 = 8\n  %  remainder  10 % 3 = 1",
    "/ always gives a float. // drops the decimal.",
    "** means 'to the power of' — 2**3 = 2×2×2 = 8",
  ],
  "strings": [
    "String methods — special actions for text:",
    "  .upper()    → ALL CAPS\n  .lower()    → all lowercase\n  .replace(old, new) → swap text\n  len(text)   → count characters",
    "Call methods with a DOT:\n  message = \"hello\"\n  print(message.upper())  →  HELLO",
  ],
};

function getConceptsForChallenge(challenge) {
  const expected = ((challenge.expectedBehavior||"") + " " + (challenge.task||"")).toLowerCase();
  const concepts = [];
  if (expected.includes("print")) concepts.push("print");
  if (expected.includes("variable") || expected.includes("create")) concepts.push("variable");
  if (expected.includes("f-string") || expected.includes('f"') || expected.includes("f'")) concepts.push("f-string");
  if (expected.includes("type(") || expected.includes("data type") || expected.includes("str") || expected.includes("int") || expected.includes("float")) concepts.push("data-types");
  if (expected.includes("if") || expected.includes("conditional")) concepts.push("if-else");
  if (expected.includes("elif")) concepts.push("elif");
  if (expected.includes(" or ") || expected.includes(" and ") || expected.includes("not ")) concepts.push("logic");
  if (expected.includes("math") || expected.includes("*") || expected.includes("//") || expected.includes("**")) concepts.push("math");
  if (expected.includes("upper") || expected.includes("replace") || expected.includes("len(") || expected.includes("string method")) concepts.push("strings");
  if (concepts.length === 0) concepts.push("print", "variable");
  return concepts;
}

// ═══════════════════════════════════════════════════════════════════
// CHALLENGE DATA
// ═══════════════════════════════════════════════════════════════════

const CHAPTERS = [
  {
    id:"ch1", name:"The Terminal", subtitle:"Learn to speak the language of machines",
    icon:"⌨️", scene:"terminal", requiredXp:0,
    badge:{name:"Terminal Voice",icon:"🗣️"}, equipment:{id:"terminal_badge",name:"Terminal Badge",slot:"badge",icon:"🗣️"},
    mapPosition:{x:12,y:40},
    introNpc:"byte",
    introDialogue:[
      "Hey there! I'm Byte. I'm a robot — well, I used to be just a pile of metal and wires.",
      "Then someone wrote code that brought me to life. Python code, actually. That's what you're about to learn.",
      "Python is a language that lets humans talk to computers. You type instructions, and the computer follows them.",
      "But here's the thing — computers are very literal. They do EXACTLY what you say, nothing more.",
      "If you tell a computer to print something, it prints it. If you forget to tell it, the screen stays blank.",
      "The most important command you'll learn is print(). It tells the computer: \"Hey, display this text on screen!\"",
      "You write it like this: print(\"Hello!\") — the text you want to show goes inside quotes, inside the parentheses.",
      "See this old terminal? It's been silent for years. Nobody's told it what to say. Let's change that.",
    ],
    rooms: [
      {id:"ch1_r1",name:"First Words",scene:"terminal",npc:"byte",
        npcDialogue:[
          "This terminal hasn't heard a voice in a long time. It's waiting for a command.",
          "In Python, print() is how you make the computer display words on the screen. Think of it like a speaker for text.",
          "The text you want to display goes inside the parentheses, wrapped in quote marks — like putting a letter in an envelope.",
          "So print(\"Hello, World!\") tells Python: display the exact words Hello, World! on screen.",
          "The quotes tell Python \"this is text, not code\" — don't forget them! Try waking this terminal up with exactly those words.",
        ],
        narrative:"A dusty terminal flickers to life. Ancient text scrolls across the screen:\n\n\"To open the gate, make the machine speak the old greeting.\"",
        task:"Use print() to display exactly:\nHello, World!",
        hints:["print() is a function that displays text on screen","Text goes inside quotes: print(\"Hello, World!\")"],
        starterCode:"# Type your code below\n",
        expectedBehavior:"Must print exactly 'Hello, World!'",xpReward:10},
      {id:"ch1_r2",name:"Multiple Messages",scene:"terminal",npc:"byte",
        npcDialogue:[
          "You made the terminal speak! But one line isn't always enough.",
          "Here's something cool — you can use print() as many times as you want. Each one shows text on a NEW line.",
          "It's like sending three separate text messages instead of one long one.",
          "print(\"First\")\nprint(\"Second\")\nprint(\"Third\")",
          "Each print() gets its own line. Three statements, three lines of output. The walls ahead have three phrases carved into them — can you make the terminal repeat all three?",
        ],
        narrative:"The first gate opens. A hall of echoes stretches into shadow. Three phrases are carved deep into the stone walls, glowing faintly.",
        task:"Print these three lines:\nI am a coder\nI am brave\nI am ready",
        hints:["Use three separate print() statements","print(\"I am a coder\")\nprint(\"I am brave\")\nprint(\"I am ready\")"],
        starterCode:"# Print three lines\n",
        expectedBehavior:"Must print three lines: 'I am a coder', 'I am brave', 'I am ready'",xpReward:10},
      {id:"ch1_r3",name:"Leaving Notes",scene:"terminal",npc:"byte",
        npcDialogue:[
          "Before we go deeper, I want to show you something useful. See those markings on the wall? Notes from coders who came before you.",
          "In Python, you can leave notes in your code using COMMENTS. A comment starts with the # symbol.",
          "Python completely ignores comments — they're notes for humans, not instructions for the computer.",
          "# This is a comment — Python skips this line\nprint(\"This runs!\")  # You can also add comments after code",
          "Good programmers leave comments explaining WHAT their code does and WHY. It's like leaving a map for the next person — or for future you!",
          "Try writing a comment above your print statement. The comment is your note, the print is your command.",
        ],
        narrative:"A wall of ancient code scrolls past. Some lines are marked with a special symbol — # — notes from previous coders who passed through here.",
        task:"Write a program with:\n1. A comment explaining what your code does\n2. print(\"Comments help me remember\")",
        hints:["Start a comment with #: # This is my explanation","# My program prints a message\nprint(\"Comments help me remember\")"],
        starterCode:"# Write a comment above your print statement\n",
        expectedBehavior:"Must have a comment line starting with # and print 'Comments help me remember'",xpReward:10},
      {id:"ch1_r4",name:"Memory Crystals",scene:"terminal",npc:"byte",
        npcDialogue:[
          "Now for something really powerful. See those glowing crystals? Each one stores a piece of information. In Python, we call these VARIABLES.",
          "A variable is like a labeled box. You give it a name, and you put something inside it.",
          "hero_name = \"Alex\" — this creates a box called hero_name and puts the text \"Alex\" inside.",
          "The = sign doesn't mean \"equals\" like in math. It means \"store this value in this box.\"",
          "Here's the tricky part: when you want to USE what's inside the box, you write the name WITHOUT quotes.",
          "print(hero_name) — no quotes! — tells Python: \"look in the box called hero_name and print whatever's inside.\"",
          "But print(\"hero_name\") WITH quotes would just print the literal words hero_name. See the difference?",
          "Try it — create a box called hero_name, put any name inside, and then print what's in the box.",
        ],
        narrative:"A chamber of glowing crystals. Each one pulses with stored energy — memories from a lost civilization. A pedestal reads: \"Name yourself to proceed.\"",
        task:"Create a variable called hero_name set to any name.\nThen print it.",
        hints:["A variable stores a value: hero_name = \"Alex\"","Print without quotes: print(hero_name)"],
        starterCode:"# Create hero_name and print it\n",
        expectedBehavior:"Must create variable hero_name with a string value, then print it",xpReward:15},
      {id:"ch1_r5",name:"The Calculator",scene:"terminal",npc:"byte",
        npcDialogue:[
          "Variables don't just hold words — they can hold numbers too!",
          "When you store a number, you DON'T use quotes. a = 15 puts the number 15 in a box called a.",
          "If you accidentally wrote a = \"15\" with quotes, Python would think it's text, not a number — and math wouldn't work!",
          "The cool part: Python can do math with number variables. a + b adds them, a - b subtracts, a * b multiplies, a / b divides.",
          "There's an old calculator ahead that needs two numbers — 15 and 27. Store them in variables called a and b, then print what happens when you add them together.",
        ],
        narrative:"An ancient calculating device sits on a pedestal, gears frozen mid-turn. A dial reads: \"Feed me numbers and I shall wake.\"",
        task:"Create: a = 15 and b = 27\nPrint their sum.",
        hints:["Set variables: a = 15 and b = 27","print(a + b) — displays 42"],
        starterCode:"# Create a and b, print their sum\n",
        expectedBehavior:"Must create a=15, b=27, print sum which is 42",xpReward:15},
      {id:"ch1_r6",name:"String Stitching",scene:"terminal",npc:"byte",
        npcDialogue:[
          "You know print() and you know variables. Now here's the magic — what if you could mix them TOGETHER?",
          "F-strings let you drop variables right into the middle of text. It's like a fill-in-the-blank sentence.",
          "You write an f before the opening quote, then put variable names in {curly braces} inside the text.",
          "food = \"pizza\"\nprint(f\"I love {food} so much!\")",
          "Python sees the {food} and says: \"Oh, let me look in the food box and plug in whatever's there.\" So it prints: I love pizza so much!",
          "The f at the start is what makes it work — without it, Python would print the literal words {food} instead of looking up the variable.",
          "There's a message board ahead with a template. Pick your favorite food, store it in a variable, and use an f-string to complete the sentence.",
        ],
        narrative:"A message board glows with a template sentence. Blanks pulse where words should be, waiting to be filled.",
        task:"Create food = your favorite food.\nPrint: I love [food] so much!\nUse an f-string.",
        hints:["Create: food = \"pizza\"","print(f\"I love {food} so much!\")"],
        starterCode:"# Create food variable and use an f-string\n",
        expectedBehavior:"Must create food variable and use f-string to print 'I love [value] so much!'",xpReward:15},
      // ── Side Quests ──
      {id:"ch1_s1",name:"Secret Symbols",scene:"terminal",npc:"byte",optional:true,
        npcDialogue:[
          "Psst — want to learn a secret? There are hidden symbols you can put INSIDE strings that do special things.",
          "\\n is a newline — it tells Python to jump to the next line, even inside a single print()!",
          "print(\"Line one\\nLine two\") — that one print() shows TWO lines. The \\n is invisible, it just means 'press Enter here.'",
          "There's also \\t for a tab (a big space), and if you ever need a quote INSIDE your string, use \\\" so Python doesn't get confused.",
          "Try using \\n to print a mini poem — three lines, but with just ONE print() statement. One print, three lines!",
        ],
        narrative:"A hidden alcove off the main path. Strange symbols glow on the walls — they look like code, but different.",
        task:"Using only ONE print() statement, display:\nRoses are red\nViolets are blue\nPython is fun",
        hints:["Use \\n inside the string to create new lines","print(\"Roses are red\\nViolets are blue\\nPython is fun\")"],
        starterCode:"# One print, three lines — use \\n\n",
        expectedBehavior:"Must use single print() with \\n to display three lines",xpReward:12},
      {id:"ch1_s2",name:"The Echo Chamber",scene:"terminal",npc:"byte",optional:true,
        npcDialogue:[
          "Before f-strings existed, programmers had another way to combine text — the + operator!",
          "When you use + between two strings, Python glues them together. \"Hello\" + \" \" + \"World\" gives \"Hello World\".",
          "This is called CONCATENATION — a fancy word that just means 'joining strings end-to-end.'",
          "But be careful: you can only + strings with other strings. \"Age: \" + 15 would crash! You'd need \"Age: \" + str(15) to convert the number first.",
          "The echo chamber ahead needs you to build a sentence by joining pieces together with +. No f-strings allowed this time!",
        ],
        narrative:"A chamber where sounds bounce and combine. Fragments of words echo from the walls, waiting to be joined.",
        task:"Create: greeting = \"Hello\", name = any name\nPrint greeting + \", \" + name + \"! Welcome to CodeQuest.\"\nUsing + concatenation (no f-strings!)",
        hints:["Use + to join strings: \"Hello\" + \", \" + \"Alex\"","print(greeting + \", \" + name + \"! Welcome to CodeQuest.\")"],
        starterCode:"# Join strings with + (no f-strings!)\n",
        expectedBehavior:"Must use string concatenation with + to build and print greeting. Must not use f-string.",xpReward:12},
      {id:"ch1_s3",name:"The Chain Reaction",scene:"terminal",npc:"byte",optional:true,
        npcDialogue:[
          "Here's a fun trick — you can use the RESULT of one calculation as the input to another!",
          "hours = 3\nminutes = hours * 60  # 180\nseconds = minutes * 60  # 10800",
          "Each variable builds on the last one. It's like a chain — change the first link and everything after it changes too.",
          "If you set hours = 5 instead, minutes would automatically be 300, and seconds would be 18000. The chain recalculates!",
          "The terminal ahead has a time converter. Start with a number of days and chain-calculate hours, minutes, and seconds from it.",
        ],
        narrative:"Gears connect to gears connect to gears. Turn one and the whole chain follows.",
        task:"Create days = 3\nCalculate hours, minutes, and seconds from it.\nPrint all four values with labels using f-strings.",
        hints:["hours = days * 24, minutes = hours * 60, seconds = minutes * 60","print(f\"{days} days = {hours} hours = {minutes} minutes = {seconds} seconds\")"],
        starterCode:"days = 3\n\n# Chain your calculations\n\n# Print the results\n",
        expectedBehavior:"Must chain calculations: days=3, hours=72, minutes=4320, seconds=259200. Print labeled values.",xpReward:15},
    ],
    boss:{id:"ch1_boss",name:"The Terminal Guardian",scene:"boss",npc:"guardian",
      npcDialogue:[
        "So. Another young coder seeks passage through my gate.",
        "I've watched you learn print(), variables, and f-strings. Not bad. But can you use them all at once?",
        "Here's your trial: create three variables — your name, your age, and your favorite game. Then introduce yourself to me in a single sentence using an f-string.",
        "The sentence must follow this pattern: My name is ___, I am ___, and I love ___",
        "Show me you can combine everything you've learned, and I'll let you pass.",
      ],
      narrative:"A figure of flickering light blocks the passage. Its voice echoes through the chamber:\n\n\"Words alone won't open this gate. Show me you truly understand.\"",
      task:"Create variables for name, age, and favorite game.\nPrint: My name is [name], I am [age], and I love [game]\nUse an f-string!",
      hints:["Create three variables: name, age, game","print(f\"My name is {name}, I am {age}, and I love {game}\")"],
      starterCode:"# Create three variables\n\n\n# Print your introduction using an f-string\n",
      expectedBehavior:"Must create 3 variables and use f-string to print introduction combining all three",xpReward:50},
  },
  {
    id:"ch2", name:"The Vault", subtitle:"Master data types and operations",
    icon:"🔐", scene:"vault", requiredXp:100,
    badge:{name:"Vault Cracker",icon:"🔓"}, equipment:{id:"vault_key",name:"Vault Key",slot:"item",icon:"🔑"},
    mapPosition:{x:32,y:22},
    introNpc:"professor",
    introDialogue:[
      "Ah, a student! Excellent! I'm Professor Loop. I've been studying this vault for decades.",
      "In the last chapter, you stored words and numbers in variables. But here's something interesting — Python treats them very differently!",
      "Words in quotes are called STRINGS (short for 'string of characters'). \"hello\" and \"42\" are both strings — even \"42\" because it's in quotes!",
      "Numbers without quotes are INTEGERS (whole numbers like 42) or FLOATS (decimal numbers like 3.14).",
      "Why does this matter? Because \"5\" + \"3\" gives you \"53\" — Python glues the text together. But 5 + 3 gives you 8 — Python does math!",
      "Same plus sign, totally different results, depending on the TYPE. The vault's locks are picky about types — you'll need to understand the difference to crack them.",
      "You can always check what type something is using type(). Let's begin!",
    ],
    rooms: [
      {id:"ch2_r1",name:"Type Scanner",scene:"vault",npc:"professor",
        npcDialogue:[
          "The first vault lock has three keyholes. Each one only accepts a specific TYPE of data.",
          "type() is a function — like print() — that tells you what kind of data you're looking at.",
          "print(type(\"hello\")) shows <class 'str'> — that means it's a string (text).",
          "print(type(42)) shows <class 'int'> — integer, a whole number.",
          "print(type(3.14)) shows <class 'float'> — a decimal number, called a float because the decimal point can 'float' to different positions.",
          "Create three variables — one of each type — and use type() to prove they're different. The scanner needs one string, one integer, and one float.",
        ],
        narrative:"Three locks gleam on the vault wall. Each keyhole has a different shape — one for words, one for whole numbers, one for decimals.",
        task:"Create: word = any string, whole = any integer, decimal = any float\nPrint type() of each.",
        hints:["word = \"hello\", whole = 42, decimal = 3.14","print(type(word)) shows <class 'str'>"],
        starterCode:"# Create three typed variables and print their types\n",
        expectedBehavior:"Must create string, integer, float variables and print type() of each showing str, int, float",xpReward:15},
      {id:"ch2_r2",name:"Number Power",scene:"vault",npc:"professor",
        npcDialogue:[
          "The vault's gears run on math — and Python has some operators you might not have seen before.",
          "You know + - * / for basic math. But there are two special ones:",
          "// is INTEGER DIVISION — it divides but drops the decimal part. 10 // 3 gives 3, not 3.33. Think of it as 'how many whole times does 3 fit into 10?'",
          "** is POWER — like an exponent. 2 ** 4 means 2 × 2 × 2 × 2, which is 16.",
          "The gear mechanism needs six calculations to align. Print each result on its own line using print(): addition, subtraction, multiplication, regular division, integer division, and power.",
        ],
        narrative:"Mechanical gears of different sizes line the wall, frozen mid-turn. A formula plate reads: \"Six calculations shall set the gears in motion.\"",
        task:"Print all of these, each on its own line:\n10 + 5\n10 - 5\n10 * 5\n10 / 3\n10 // 3\n2 ** 4",
        hints:["Use print() for each: print(10 + 5)","Expected: 15, 5, 50, 3.333..., 3, 16"],
        starterCode:"# Calculate and print each operation\n",
        expectedBehavior:"Must print 6 math results: 15, 5, 50, 3.333..., 3, 16",xpReward:15},
      {id:"ch2_r3",name:"String Secrets",scene:"vault",npc:"professor",
        npcDialogue:[
          "Strings aren't just text — they have special powers called METHODS. Think of methods as actions you can ask a string to do.",
          "You call a method using a dot: message.upper() tells the string in 'message' to transform itself to ALL CAPS.",
          ".replace(old, new) swaps one piece of text for another. message.replace(\"vault\", \"quest\") would swap the word 'vault' for 'quest'.",
          "And len() — which is a function, not a method — counts how many characters are in a string. Spaces count too!",
          "There's a scrambled scroll ahead. You'll need to start with the phrase \"the vault awaits\" and use all three of these to decode it.",
        ],
        narrative:"Scrambled scrolls hang from the ceiling, their messages twisted. A plaque reads: \"Transform the words to reveal the truth.\"",
        task:"Create message = \"the vault awaits\"\nPrint: .upper() result, .replace(\"vault\",\"quest\") result, and len(message)",
        hints:[".upper() converts, .replace() swaps, len() counts","print(message.upper())\nprint(message.replace(\"vault\",\"quest\"))\nprint(len(message))"],
        starterCode:"message = \"the vault awaits\"\n\n",
        expectedBehavior:"Must print THE VAULT AWAITS, 'the quest awaits', and 16",xpReward:15},
      {id:"ch2_r4",name:"The Combination",scene:"vault",npc:"professor",
        npcDialogue:[
          "The inner vault door needs a numerical code. The formula is etched into the stone — but you'll need to calculate it, not guess.",
          "Here's a chance to combine math operators and f-strings. Store your calculation in a variable, then present it nicely.",
          "Remember: Python follows order of operations — parentheses first, then ** power, then * / //, then + -. Just like math class.",
          "The formula on the wall says: (17 × 3) + (42 // 5) - 2. Calculate that, store it in a variable called code, and use an f-string to print: The code is [code]",
        ],
        narrative:"A vault door with heavy bolts. A formula is etched into the stone:\n\n(17 × 3) + (42 ÷÷ 5) − 2",
        task:"Calculate: (17 * 3) + (42 // 5) - 2\nStore in code, print with f-string:\nThe code is [code]",
        hints:["42 // 5 = 8 (integer division)","code = (17 * 3) + (42 // 5) - 2  # = 57\nprint(f\"The code is {code}\")"],
        starterCode:"# Calculate the combination\n",
        expectedBehavior:"Must calculate code = 57 and print 'The code is 57' using f-string",xpReward:15},
      {id:"ch2_r5",name:"Variable Updates",scene:"vault",npc:"professor",
        npcDialogue:[
          "Here's something that trips people up at first: you can CHANGE what's inside a variable after you create it.",
          "price = 10 puts 10 in the box. Then price = price + 5 takes whatever's in the box, adds 5, and puts the new value back. Now price is 15!",
          "It looks weird in math — how can price equal price + 5? But remember, = means 'store this' not 'these are equal.'",
          "Python also has a shortcut: price += 5 does the same thing as price = price + 5. Same for -=, *=, /=.",
          "The final vault mechanism is a multi-step calculation — a shop calculator. You'll build each value from the last, using variables that chain together. Start with price and quantity, calculate a subtotal, then tax, then the total. Print each one with a label.",
        ],
        narrative:"The deepest chamber. Multiple mechanisms interlock — each lever depends on the one before it.",
        task:"Build a shop calculator:\nprice = 25, quantity = 4\nsubtotal = price * quantity\ntax = subtotal * 0.1\ntotal = subtotal + tax\nPrint each labeled value.",
        hints:["Create each variable building on the last","print(f\"Subtotal: {subtotal}\")\nprint(f\"Tax: {tax}\")\nprint(f\"Total: {total}\")"],
        starterCode:"price = 25\nquantity = 4\n\n",
        expectedBehavior:"Must calculate subtotal=100, tax=10.0, total=110.0, print all with labels",xpReward:20},
      // ── Side Quests ──
      {id:"ch2_s1",name:"The Remainder Lock",scene:"vault",npc:"professor",optional:true,
        npcDialogue:[
          "There's one more math operator I saved for the curious — the MODULO operator, written as %.",
          "% gives you the REMAINDER after division. 10 % 3 = 1, because 10 ÷ 3 = 3 remainder 1.",
          "Why is this useful? The most common trick: checking if a number is EVEN or ODD!",
          "If number % 2 equals 0, it's even (divides evenly by 2). If it equals 1, it's odd. Programmers use this ALL the time.",
          "The vault has a lock that only opens for even numbers. Test a few numbers with % and print whether each is even or odd.",
        ],
        narrative:"A hidden lock behind a loose stone. It clicks for some numbers but not others — there's a pattern.",
        task:"Test three numbers: 15, 42, 7\nFor each, print the number and whether it's even or odd.\n(Hint: use % 2 — if result is 0, it's even!)",
        hints:["15 % 2 = 1 (odd), 42 % 2 = 0 (even), 7 % 2 = 1 (odd)","print(f\"15 is {'even' if 15 % 2 == 0 else 'odd'}\") — or just print 15 % 2 and explain"],
        starterCode:"# Check if each number is even or odd using %\n",
        expectedBehavior:"Must use modulo % operator on at least 3 numbers and indicate if each is even or odd",xpReward:12},
      {id:"ch2_s2",name:"The Mirror Room",scene:"vault",npc:"professor",optional:true,
        npcDialogue:[
          "Here's something delightful — you can MULTIPLY strings! Not with math, but with repetition.",
          "\"ha\" * 3 gives you \"hahaha\". Python repeats the string that many times. Great for making patterns!",
          "And here's another trick: you can peek at individual characters inside a string using INDEXING.",
          "word = \"Python\"\nword[0] is \"P\" — the FIRST character. Counting starts at 0, not 1! That trips everyone up.",
          "word[-1] is \"n\" — the LAST character. Negative numbers count from the end.",
          "The mirror room reflects patterns. Use string multiplication and indexing to decode the message.",
        ],
        narrative:"A room of mirrors, each reflecting the same symbol over and over. A puzzle box asks for patterns.",
        task:"Create: word = \"Code\"\nPrint word * 3 (repeat it)\nPrint the first character: word[0]\nPrint the last character: word[-1]\nPrint a divider line: print(\"-\" * 20)",
        hints:["word * 3 repeats: \"CodeCodeCode\"","word[0] is 'C', word[-1] is 'e', \"-\" * 20 makes --------------------"],
        starterCode:"word = \"Code\"\n\n",
        expectedBehavior:"Must demonstrate string multiplication and indexing. Print word*3, word[0], word[-1], and a divider line.",xpReward:12},
      {id:"ch2_s3",name:"The Converter",scene:"vault",npc:"professor",optional:true,
        npcDialogue:[
          "Sometimes Python gives you the wrong TYPE for what you need, and you have to CONVERT it.",
          "str(42) turns the number 42 into the text \"42\". int(\"42\") turns the text \"42\" into the number 42. float(\"3.14\") gives you 3.14 as a decimal.",
          "Why does this matter? Try this: \"Age: \" + 25 — CRASH! You can't add a string to a number. But \"Age: \" + str(25) works!",
          "The converter ahead has a tricky problem: you'll get some data that's the WRONG type and need to fix it before doing calculations.",
          "Think of type conversion as translating between languages — the value is the same, but the format changes.",
        ],
        narrative:"An alchemical station. Substances in the wrong container need to be poured into the right one.",
        task:"price_text = \"49\" (a string!)\nConvert to integer, multiply by 3, store as total.\nPrint: 3 items at $49 = $[total]\nAlso print type(price_text) and type(total) to prove they're different.",
        hints:["total = int(price_text) * 3","print(type(price_text))  # str\nprint(type(total))  # int"],
        starterCode:"price_text = \"49\"\n\n# Convert and calculate\n\n# Print result and types\n",
        expectedBehavior:"Must convert string to int, calculate total=147, print result and show type() of both variables",xpReward:15},
    ],
    boss:{id:"ch2_boss",name:"The Vault Keeper",scene:"boss",npc:"guardian",
      npcDialogue:[
        "The Vault Keeper awakens. Its mechanical voice echoes:",
        "You understand types, operators, and string methods. But can you BUILD something with them?",
        "Create a game character sheet. I want a name (text), a level (whole number), and a health value (decimal).",
        "Then CALCULATE two stats from the level: attack = level × 3.5, and defense = level × 2 + 10.",
        "Print a full report showing every value, plus a Power Rating which is attack + defense combined.",
        "Use f-strings to make it look clean. A true coder writes code that's easy to read.",
      ],
      narrative:"A mechanical guardian rises from the floor, gears grinding. Its eyes scan you:\n\n\"I've heard the vault's whispers about you. But hearing and seeing are different things.\"",
      task:"Create: name (string), level (int), health (float)\nCalculate: attack = level * 3.5, defense = level * 2 + 10\nPrint formatted report with all 5 values plus Power Rating (attack + defense).",
      hints:["Create variables, do math, use f-strings","print(f\"Hero: {name}\")\nprint(f\"Attack: {attack}\")\netc."],
      starterCode:"# Create character\n\n# Calculate stats\n\n# Print report\n",
      expectedBehavior:"Must create name, level, health, calculate attack=level*3.5, defense=level*2+10, print all values plus power rating",xpReward:60},
  },
  {
    id:"ch3", name:"The Crossroads", subtitle:"Master decisions with if/else",
    icon:"🔀", scene:"crossroads", requiredXp:220,
    badge:{name:"Path Finder",icon:"🧭"}, equipment:{id:"compass",name:"Compass",slot:"item",icon:"🧭"},
    mapPosition:{x:55,y:38},
    introNpc:"cipher",
    introDialogue:[
      "I've been watching you, coder. You've learned to speak and calculate. But your code still runs in a straight line, top to bottom, every time.",
      "I'm Cipher. I know a different way — the way of DECISIONS.",
      "What if your code could look at a situation and CHOOSE what to do? Like standing at a fork in the road and picking a path?",
      "That's what if/else does. You give Python a question — a condition — and it picks one path or the other based on the answer.",
      "if temperature > 30:\n    print(\"It's hot!\")\nelse:\n    print(\"It's fine.\")",
      "See how the code under 'if' is indented? That indentation isn't decoration — it tells Python which code BELONGS to which branch. Without it, Python gets confused.",
      "Four spaces of indentation. That's the rule. Everything indented under 'if' runs when the condition is True. Everything under 'else' runs when it's False.",
      "The Crossroads ahead are full of choices. Let's teach your code to make them.",
    ],
    rooms: [
      {id:"ch3_r1",name:"True or False",scene:"crossroads",npc:"cipher",
        npcDialogue:[
          "Before you can write if statements, you need to understand what they're checking — BOOLEANS.",
          "A boolean is the simplest type: it's either True or False. That's it. Two possible values. Like a light switch — on or off.",
          "You create booleans by COMPARING things: Is 5 greater than 3? Python says True. Is 5 less than 3? Python says False.",
          "The comparison operators are: > (greater than), < (less than), == (equal to — TWO equals signs!), != (not equal), >= (greater or equal), <= (less or equal).",
          "Watch out: == with two equals checks if things are equal. One = is for storing values in variables — completely different!",
          "The path ahead has two number pillars. Compare them in different ways and print what Python thinks about each comparison.",
        ],
        narrative:"Two paths diverge, each marked with riddles of truth and falsehood. Stone pillars display the numbers 10 and 5.",
        task:"Set a = 10, b = 5\nPrint: a > b, a < b, a == 10, a != b, b >= 5",
        hints:["print(a > b) displays True or False","Should print: True, False, True, True, True"],
        starterCode:"a = 10\nb = 5\n\n# Print each comparison\n",
        expectedBehavior:"Must print 5 booleans: True, False, True, True, True",xpReward:15},
      {id:"ch3_r2",name:"The First Fork",scene:"crossroads",npc:"cipher",
        npcDialogue:[
          "Now for the real thing — making your code CHOOSE a path.",
          "An if/else statement checks a condition. If it's True, it runs the indented code below 'if'. If it's False, it runs the code below 'else'.",
          "if score >= 70:\n    print(\"You passed!\")\nelse:\n    print(\"Try again!\")",
          "Three things to remember: the colon (:) at the end of the if and else lines, the four spaces of indentation for the code under each branch, and that Python only runs ONE of the two branches — never both.",
          "The fork ahead tests a score twice. First with 85, then with 50. Write the same if/else check both times and see how Python picks different paths depending on the value.",
        ],
        narrative:"A fork in the path. Words shimmer above each branch:\n\nLeft: \"The worthy pass.\" Right: \"The unworthy return.\"",
        task:"Set score = 85, write if score >= 70 print \"You passed!\", else \"Try again!\"\nThen set score = 50 and do same check.",
        hints:["if score >= 70:\n    print(\"You passed!\")\nelse:\n    print(\"Try again!\")","Do it twice: once with 85, once with 50"],
        starterCode:"score = 85\n\n\nscore = 50\n\n",
        expectedBehavior:"Must use if/else twice. Score 85 prints 'You passed!', score 50 prints 'Try again!'",xpReward:15},
      {id:"ch3_r3",name:"Multiple Paths",scene:"crossroads",npc:"cipher",
        npcDialogue:[
          "if/else gives you two paths. But what about three? Or four? That's where elif comes in — short for 'else if.'",
          "elif lets you add more conditions between if and else. Python checks them from top to bottom and takes the FIRST one that's True.",
          "if temp >= 90:\n    print(\"Hot\")\nelif temp >= 70:\n    print(\"Warm\")\nelif temp >= 50:\n    print(\"Cool\")\nelse:\n    print(\"Cold\")",
          "Important: once Python finds a True condition, it SKIPS everything below it. If temp is 95, it matches >= 90 and prints \"Hot\" — it never even checks the others.",
          "That's why you go from highest to lowest. If you checked >= 50 first, a temperature of 95 would match it and print \"Cool\" — wrong!",
          "Three doors ahead, three temperature ranges. Use elif to route a temperature of 75 to the right door.",
        ],
        narrative:"Three doors, each a different color — red, amber, blue. An inscription reads: \"The temperature decides your path.\"",
        task:"Set temp = 75\nIf >= 90: print \"Hot\"\nElif >= 70: print \"Warm\"\nElif >= 50: print \"Cool\"\nElse: print \"Cold\"",
        hints:["Use if/elif/elif/else with colons and indentation","temp=75 should print 'Warm'"],
        starterCode:"temp = 75\n\n",
        expectedBehavior:"Must use if/elif/else to print 'Warm' for temp=75",xpReward:15},
      {id:"ch3_r4",name:"Logic Gates",scene:"crossroads",npc:"cipher",
        npcDialogue:[
          "Sometimes one condition isn't enough. What if you need to check TWO things at once?",
          "Python gives you three logic words: and, or, and not.",
          "and means BOTH must be true: if age >= 13 and has_ticket: — only works if BOTH age is 13+ AND they have a ticket.",
          "or means AT LEAST ONE must be true: if age >= 13 or has_permission: — works if EITHER condition is true (or both).",
          "not flips a value: not True becomes False, not False becomes True.",
          "The gate ahead checks two things: age and permission. The age is 12 — under the limit of 13. But there IS permission. Use 'or' to write a condition that grants access if either check passes.",
        ],
        narrative:"A heavy gate with two switches on either side. Both glow faintly. Above: \"One truth shall suffice.\"",
        task:"age = 12, has_permission = True\nIf age >= 13 OR has_permission: print \"Access granted\"\nElse: \"Access denied\"",
        hints:["if age >= 13 or has_permission:","Should print 'Access granted'"],
        starterCode:"age = 12\nhas_permission = True\n\n",
        expectedBehavior:"Must use 'or' in condition. Should print 'Access granted'",xpReward:20},
      {id:"ch3_r5",name:"Nested Decisions",scene:"crossroads",npc:"cipher",
        npcDialogue:[
          "Here's where it gets really interesting — you can put if statements INSIDE other if statements. It's called NESTING.",
          "Think of it like a decision tree. First you check one thing, and THEN — inside that branch — you check something else.",
          "if has_sword:\n    if monster_health > 50:\n        print(\"Tough fight!\")\n    else:\n        print(\"Easy win!\")\nelse:\n    print(\"You need a weapon!\")",
          "Notice the indentation: the outer if is at the edge, the inner if is indented 4 spaces, and the code inside THAT is indented 8 spaces. Each level deeper = 4 more spaces.",
          "The maze ahead checks two things: do you have a sword, and how much health does the monster have? has_sword is True and monster_health is 30 — work through the logic to figure out which message should print, then code it.",
        ],
        narrative:"A maze of branching corridors. Each junction forks based on a different question, choices leading to more choices.",
        task:"has_sword = True, monster_health = 30\nIf has_sword:\n  If monster_health > 50: print \"Tough fight!\"\n  Else: print \"Easy win!\"\nElse: print \"You need a weapon!\"",
        hints:["Nest if inside if with more indentation","Should print 'Easy win!'"],
        starterCode:"has_sword = True\nmonster_health = 30\n\n",
        expectedBehavior:"Must use nested if/else. Should print 'Easy win!'",xpReward:20},
      // ── Side Quests ──
      {id:"ch3_s1",name:"Shadow Values",scene:"crossroads",npc:"cipher",optional:true,
        npcDialogue:[
          "Here's a secret that many programmers don't learn until later — in Python, EVERY value has a hidden truth.",
          "Some values are 'truthy' and some are 'falsy.' When Python checks a condition, it doesn't NEED a comparison — it can test any value directly.",
          "These values are FALSY (Python treats them as False): 0, 0.0, \"\" (empty string), and the special word None.",
          "Everything else is TRUTHY: any non-zero number, any non-empty string, True itself.",
          "So you can write: if name: print(\"Has a name!\") — if name is \"\" (empty), Python treats it as False. If name is \"Alex\", it's True.",
          "Test it: create variables with falsy values and check what Python thinks of them.",
        ],
        narrative:"A chamber of shadows. Some torches glow, others are dark. Truth and emptiness intertwine.",
        task:"Test these values with if/else:\nprint whether each is truthy or falsy:\n0, \"\", \"hello\", 42, None\n(Use: if value: print(\"truthy\") else: print(\"falsy\"))",
        hints:["if 0: print('truthy') else: print('falsy') → falsy","0, \"\", None are falsy. \"hello\", 42 are truthy."],
        starterCode:"# Test each value\nvalues_to_test = [0, \"\", \"hello\", 42, None]\n\n",
        expectedBehavior:"Must test multiple values and correctly identify truthy vs falsy. 0, empty string, None are falsy; 'hello', 42 are truthy.",xpReward:12},
      {id:"ch3_s2",name:"The Quick Path",scene:"crossroads",npc:"cipher",optional:true,
        npcDialogue:[
          "Sometimes you need a quick decision — one line, not four. Python has a shortcut for simple if/else choices.",
          "It's called an INLINE IF (or ternary expression). It looks like this:",
          "result = \"yes\" if score >= 70 else \"no\"",
          "Read it like English: result IS \"yes\" IF score is >= 70, ELSE \"no\". It's a whole if/else in one line!",
          "You can even put it inside a print(): print(\"Pass\" if score >= 70 else \"Fail\")",
          "It's perfect for simple either/or decisions. The quick path ahead has three such decisions to make.",
        ],
        narrative:"A narrow shortcut between two main paths. Quick decisions must be made without stopping.",
        task:"Use inline if/else for each:\n1. age = 15 → print \"adult\" if >= 18, else \"minor\"\n2. temp = 100 → print \"boiling\" if >= 100, else \"not yet\"\n3. lives = 0 → print \"game over\" if lives == 0, else \"keep going\"",
        hints:["print(\"adult\" if age >= 18 else \"minor\")","All three should be one-line print statements with inline if/else"],
        starterCode:"age = 15\ntemp = 100\nlives = 0\n\n# Use inline if/else for each\n",
        expectedBehavior:"Must use inline/ternary if expressions. Should print 'minor', 'boiling', 'game over'",xpReward:12},
      {id:"ch3_s3",name:"Chained Riddles",scene:"crossroads",npc:"cipher",optional:true,
        npcDialogue:[
          "Most languages make you write: if x > 1 and x < 10. Python has an elegant shortcut — CHAINED COMPARISONS.",
          "You can write: if 1 < x < 10 — and Python understands! It checks both conditions at once.",
          "It works with any comparisons: 0 <= score <= 100 checks if score is between 0 and 100 inclusive.",
          "You can even chain more: 1 < x < y < 100 checks all three comparisons at once.",
          "It reads just like math notation — one of Python's nicest features. The riddles ahead need range checks. Try chaining!",
        ],
        narrative:"Three stone riddles on the wall, each asking about ranges and boundaries.",
        task:"x = 25\nUse chained comparisons to print:\n1. Is x between 1 and 50? (True)\n2. Is x between 30 and 100? (False)\n3. Is 10 < x < 50? (True)",
        hints:["print(1 <= x <= 50) → True","Chained comparisons: print(30 <= x <= 100) → False"],
        starterCode:"x = 25\n\n# Use chained comparisons\n",
        expectedBehavior:"Must use chained comparisons (e.g., 1 <= x <= 50). Should print True, False, True.",xpReward:15},
    ],
    boss:{id:"ch3_boss",name:"The Crossroads Sphinx",scene:"boss",npc:"guardian",
      npcDialogue:[
        "I am the Sphinx of the Crossroads. I have guarded these paths since before your terminal first flickered.",
        "You understand comparisons, if/else, elif, logic operators, and nesting. But can you use them all to build something USEFUL?",
        "Here is my riddle: build a grade calculator. Given a score of 87, tell me the letter grade AND a message.",
        "90 and above is an A — \"Excellent!\" 80 to 89 is B — \"Great job!\" 70 to 79 is C — \"Not bad!\" 60 to 69 is D — \"Needs work.\" Below 60 is F — \"Try harder!\"",
        "Use if and elif to check from highest to lowest. Print both the grade letter and its message. Get this right and all three paths open to you.",
      ],
      narrative:"A stone sphinx blocks all three paths forward. Its eyes glow as it speaks:\n\n\"Decisions define us. Show me yours.\"",
      task:"score = 87\nPrint letter grade AND message:\n90-100: A — \"Excellent!\"\n80-89: B — \"Great job!\"\n70-79: C — \"Not bad!\"\n60-69: D — \"Needs work\"\nBelow 60: F — \"Try harder!\"",
      hints:["Use if/elif/elif/elif/else from highest to lowest","score=87 should print Grade: B and Great job!"],
      starterCode:"score = 87\n\n",
      expectedBehavior:"Must use if/elif/else to grade score=87 as B, printing 'Grade: B' and 'Great job!'",xpReward:60},
  },
  {
    id:"ch4", name:"The Loop Tower", subtitle:"Harness the power of repetition",
    icon:"🔄", scene:"tower", requiredXp:380,
    badge:{name:"Loop Master",icon:"🔁"}, equipment:{id:"loop_ring",name:"Ring of Iteration",slot:"item",icon:"💍"},
    mapPosition:{x:78,y:22},
    introNpc:"iterator",
    introDialogue:[
      "Welcome to the Loop Tower. I am Iterator — I was built to count, and I have been counting since before the first programmer drew breath.",
      "Until now, every time you wanted to do something five times, you had to write it five times. That's tedious, and real programmers are efficiently lazy.",
      "LOOPS let you tell Python: 'do this thing over and over.' You write the instruction ONCE, and Python repeats it as many times as you need.",
      "The simplest loop uses 'for' and 'range()'. Think of range(5) as a list of numbers: 0, 1, 2, 3, 4. The loop runs your code once for EACH number.",
      "for i in range(5):\n    print(i)",
      "That prints 0, 1, 2, 3, 4 — five lines from two lines of code! The variable 'i' takes each number in turn.",
      "Notice range(5) gives you 5 numbers but starts at 0 and stops BEFORE 5. That surprises everyone at first, but you'll get used to it.",
      "Each floor of this tower is a loop. Climb with me — but watch out for infinite loops. Those who loop forever... never leave.",
    ],
    rooms: [
      {id:"ch4_r1",name:"The Counting Stairs",scene:"tower",npc:"iterator",
        npcDialogue:[
          "The staircase has numbered steps. Let's count them with a loop!",
          "for i in range(5): means 'for each number i from 0 to 4.' The colon and indentation work just like if/else — everything indented under the for runs each time.",
          "Inside the loop, i changes each time: first it's 0, then 1, then 2, and so on. You can USE i in your print statement.",
          "print(f\"Step {i}\") inside the loop would print Step 0, Step 1, Step 2... automatically. No copy-pasting!",
          "Climb the stairs: use a for loop with range(5) to print 'Step 0' through 'Step 4'.",
        ],
        narrative:"A spiral staircase stretches upward. Each step glows as you count it.",
        task:"Use a for loop to print:\nStep 0\nStep 1\nStep 2\nStep 3\nStep 4",
        hints:["for i in range(5):","    print(f\"Step {i}\")"],
        starterCode:"# Use a for loop with range(5)\n",
        expectedBehavior:"Must use for loop with range(5) to print 'Step 0' through 'Step 4'",xpReward:15},
      {id:"ch4_r2",name:"Adjusting the Gears",scene:"tower",npc:"iterator",
        npcDialogue:[
          "range() is more flexible than you think. It can take up to THREE arguments: range(start, stop, step).",
          "range(1, 6) gives 1, 2, 3, 4, 5 — starts at 1 instead of 0, still stops BEFORE 6.",
          "range(0, 10, 2) gives 0, 2, 4, 6, 8 — counts by 2s! The third number is the STEP size.",
          "You can even count BACKWARDS: range(5, 0, -1) gives 5, 4, 3, 2, 1. The step is -1, so it goes down.",
          "The gears on this floor run at different speeds. Print the even numbers from 2 to 10, then count down from 5 to 1.",
        ],
        narrative:"Gears of different sizes interlock. Some spin fast, some slow, some in reverse.",
        task:"Print even numbers 2 through 10 using range(2, 11, 2)\nThen print countdown: 5, 4, 3, 2, 1 using range(5, 0, -1)",
        hints:["for i in range(2, 11, 2): print(i) → 2,4,6,8,10","for i in range(5, 0, -1): print(i) → 5,4,3,2,1"],
        starterCode:"# Even numbers 2-10\n\n# Countdown 5 to 1\n",
        expectedBehavior:"Must print even numbers 2,4,6,8,10 and countdown 5,4,3,2,1 using range with start/stop/step",xpReward:15},
      {id:"ch4_r3",name:"Word Walker",scene:"tower",npc:"iterator",
        npcDialogue:[
          "Here's something beautiful — you don't just loop through numbers. You can loop through the CHARACTERS in a string!",
          "for char in \"hello\":\n    print(char)",
          "That prints h, e, l, l, o — one character per line. The variable 'char' takes each letter in turn, just like 'i' took each number.",
          "You can name that variable anything: 'letter', 'c', 'x' — whatever makes sense to you. 'char' is just a common choice for characters.",
          "The inscription on this floor is a word. Walk through it letter by letter, and for each letter, print it along with whether it's a vowel or consonant.",
        ],
        narrative:"Ancient text spirals around the tower wall. Each letter glows as you pass it.",
        task:"word = \"python\"\nLoop through each character.\nPrint each letter and whether it's a vowel or consonant.\n(Vowels: a, e, i, o, u)",
        hints:["for char in word:","if char in \"aeiou\": print(f\"{char} - vowel\") else: print(f\"{char} - consonant\")"],
        starterCode:"word = \"python\"\n\nfor char in word:\n",
        expectedBehavior:"Must loop through string 'python' and classify each character as vowel or consonant",xpReward:18},
      {id:"ch4_r4",name:"The Spinning Room",scene:"tower",npc:"iterator",
        npcDialogue:[
          "for loops run a fixed number of times. But sometimes you don't KNOW how many times — you just want to keep going until something changes.",
          "That's a WHILE loop. It keeps running AS LONG AS a condition is True.",
          "count = 0\nwhile count < 5:\n    print(count)\n    count += 1",
          "This does the same as range(5), but you control the counting yourself. The key: you MUST change something inside the loop so the condition eventually becomes False.",
          "If you forget count += 1, the condition is ALWAYS True, and Python loops forever — an INFINITE LOOP. The tower shakes when that happens.",
          "The spinning room has energy that drains each turn. Use a while loop to count down energy from 10 to 0.",
        ],
        narrative:"A room that spins endlessly. A crystal pulses with energy — 10 charges remaining. Each pulse drains one.",
        task:"energy = 10\nUse a while loop to print:\nEnergy: 10\nEnergy: 9\n...\nEnergy: 0\nThen print \"Shutdown!\"",
        hints:["while energy >= 0:\n    print(f\"Energy: {energy}\")\n    energy -= 1","Don't forget to decrease energy inside the loop!"],
        starterCode:"energy = 10\n\n# While loop countdown\n\n",
        expectedBehavior:"Must use while loop to count energy from 10 down to 0, then print 'Shutdown!'",xpReward:18},
      {id:"ch4_r5",name:"Emergency Stop",scene:"tower",npc:"iterator",
        npcDialogue:[
          "Sometimes you need to escape a loop early, or skip certain steps. Python gives you two special commands for this.",
          "break — immediately EXITS the loop entirely. Like pulling an emergency stop lever. No more iterations happen.",
          "continue — SKIPS the rest of this iteration and jumps to the next one. Like saying 'nevermind this step, move on.'",
          "for i in range(10):\n    if i == 5:\n        break  # Stop at 5, don't print 5 or anything after\n    print(i)  # Prints 0,1,2,3,4",
          "for i in range(6):\n    if i == 3:\n        continue  # Skip 3, but keep going\n    print(i)  # Prints 0,1,2,4,5",
          "The tower alarm is going off. Search through numbers 1-20, skip all even numbers with continue, and break when you find the first one divisible by 7.",
        ],
        narrative:"Alarms blare! Emergency lights flash. The tower shakes — you need to find the right number to stop it.",
        task:"Loop through range(1, 21):\n- Use 'continue' to SKIP even numbers\n- Print each odd number\n- Use 'break' when you find one divisible by 7\n(Should print: 1, 3, 5, 7 then stop)",
        hints:["if i % 2 == 0: continue  # skip evens","if i % 7 == 0: print(i) then break"],
        starterCode:"for i in range(1, 21):\n",
        expectedBehavior:"Must use continue to skip even numbers and break when finding number divisible by 7. Should print 1,3,5,7",xpReward:20},
      // ── Side Quests ──
      {id:"ch4_s1",name:"The Pattern Weaver",scene:"tower",npc:"iterator",optional:true,
        npcDialogue:[
          "You can put a loop INSIDE another loop — a nested loop! The inner loop runs completely for EACH step of the outer loop.",
          "for row in range(3):\n    for col in range(4):\n        print(\"*\", end=\"\")\n    print()  # New line after each row",
          "That prints a 3×4 rectangle of stars. The end=\"\" trick makes print() stay on the same line instead of jumping to a new one.",
          "print() with no arguments just adds a newline — perfect for ending a row.",
          "Try making a right triangle of stars: row 1 has 1 star, row 2 has 2, row 3 has 3, up to 5.",
        ],
        narrative:"A loom weaves patterns from starlight. Each pattern is built row by row, stitch by stitch.",
        task:"Print a right triangle:\n*\n**\n***\n****\n*****\n(Hint: the row number controls how many stars!)",
        hints:["for row in range(1, 6): — row goes 1,2,3,4,5","print(\"*\" * row) — or use an inner loop"],
        starterCode:"# Print a triangle of stars\n",
        expectedBehavior:"Must print right triangle with 1 to 5 stars per row, using loops",xpReward:12},
      {id:"ch4_s2",name:"The Accumulator",scene:"tower",npc:"iterator",optional:true,
        npcDialogue:[
          "One of the most powerful loop patterns is the ACCUMULATOR — a variable that builds up a value as the loop runs.",
          "total = 0\nfor i in range(1, 6):\n    total += i\nprint(total)  # 15 (1+2+3+4+5)",
          "You start with a variable (usually 0 for sums, or \"\" for strings), then ADD to it each time through the loop.",
          "You can also COUNT things: count = 0, then count += 1 inside an if statement to count how many items match a condition.",
          "Sum all numbers from 1 to 100 using an accumulator. Then count how many of them are divisible by 3.",
        ],
        narrative:"A vault of coins. Each loop adds to the pile. How high will it go?",
        task:"Sum all numbers from 1 to 100.\nAlso count how many are divisible by 3.\nPrint both results.",
        hints:["total = 0, count = 0, then loop range(1, 101)","if i % 3 == 0: count += 1. Sum should be 5050."],
        starterCode:"total = 0\ncount = 0\n\nfor i in range(1, 101):\n",
        expectedBehavior:"Must use accumulator pattern. Sum should be 5050, count of multiples of 3 should be 33.",xpReward:12},
      {id:"ch4_s3",name:"Loop the Loop",scene:"tower",npc:"iterator",optional:true,
        npcDialogue:[
          "Here's a common real-world pattern: while True creates a loop that runs FOREVER... until you break out of it.",
          "while True:\n    answer = \"yes\"\n    if answer == \"yes\":\n        break",
          "In real programs, this is used for menus and input validation — keep asking until you get a good answer.",
          "Since we can't use input() in CodeQuest, let's simulate it: loop through a list of guesses and break when you find the right one.",
          "The password is \"python\". Loop through a list of guesses and stop when you find the match.",
        ],
        narrative:"A locked door with a password panel. Wrong guesses are rejected, but it never stops accepting tries.",
        task:"guesses = [\"java\", \"ruby\", \"python\", \"rust\"]\npassword = \"python\"\nLoop through guesses.\nFor each, print \"Trying: [guess]\"\nWhen it matches password, print \"Access granted!\" and break.",
        hints:["for guess in guesses:","if guess == password: print(\"Access granted!\") then break"],
        starterCode:"guesses = [\"java\", \"ruby\", \"python\", \"rust\"]\npassword = \"python\"\n\n",
        expectedBehavior:"Must loop through guesses, print each attempt, break when finding 'python'. Should not print 'rust'.",xpReward:15},
    ],
    boss:{id:"ch4_boss",name:"The Infinite Loop",scene:"boss",npc:"guardian",
      npcDialogue:[
        "I am the keeper of the tower's peak. Many have climbed here. Few have escaped my challenge.",
        "You've mastered for loops, while loops, range(), break, and continue. Now combine them all.",
        "Build me a launch sequence countdown. Start from 10, count down to 1, but SKIP unlucky number 7.",
        "After the countdown, print 'LIFTOFF!' Then use a for loop to print the first 5 altitudes: Altitude: 100, Altitude: 200, up to 500.",
        "Show me you can control repetition — and I'll open the tower peak.",
      ],
      narrative:"At the tower's peak, gears lock into position. A massive countdown display awaits activation.",
      task:"1. Countdown from 10 to 1 (skip 7!)\n2. Print \"LIFTOFF!\"\n3. Print Altitude: 100 through Altitude: 500 (by 100s)\nUse loops for everything!",
      hints:["for i in range(10, 0, -1): if i == 7: continue","for alt in range(100, 501, 100): print(f\"Altitude: {alt}\")"],
      starterCode:"# Countdown (skip 7)\n\n# Liftoff\n\n# Altitude\n",
      expectedBehavior:"Must countdown 10-1 skipping 7 using continue, print LIFTOFF!, then print altitudes 100-500 by 100s",xpReward:60},
  },
  {
    id:"ch5", name:"The Archives", subtitle:"Master collections of data",
    icon:"📚", scene:"archives", requiredXp:520,
    badge:{name:"Archivist",icon:"📖"}, equipment:{id:"quill",name:"Archivist's Quill",slot:"item",icon:"🪶"},
    mapPosition:{x:90,y:42},
    introNpc:"index",
    introDialogue:[
      "Hoo! A visitor! I am Index, keeper of the Archives. I catalog everything — and I do mean EVERYTHING.",
      "Until now, each variable held ONE value. But what if you need to store a whole collection? A list of names, a deck of cards, a set of scores?",
      "That's what LISTS are for. A list is a single variable that holds MULTIPLE values, in order.",
      "my_list = [\"apple\", \"banana\", \"cherry\"]",
      "Square brackets create the list. Commas separate the items. You can put strings, numbers, even a mix of types inside.",
      "Each item has a position number called an INDEX — and just like range(), it starts at 0, not 1!",
      "my_list[0] is \"apple\", my_list[1] is \"banana\", my_list[2] is \"cherry\". And my_list[-1] is the LAST item — \"cherry\".",
      "Lists are the backbone of programming. Almost every real program uses them. The Archives are organized by lists — let me show you how.",
    ],
    rooms: [
      {id:"ch5_r1",name:"The Bookshelf",scene:"archives",npc:"index",
        npcDialogue:[
          "A bookshelf is just a list with a specific order. Let's create one!",
          "books = [\"Python Basics\", \"Loop Mastery\", \"Data Quest\"]",
          "To access a specific book, use its INDEX in square brackets. books[0] is the first, books[1] is the second.",
          "Remember: Python counts from 0! The first item is index 0, the second is index 1. books[2] is the THIRD item.",
          "Negative indices count from the end: books[-1] is the last item, books[-2] is second to last.",
          "Create a list of 4 favorite things and print the first, last, and second items using indexing.",
        ],
        narrative:"A tall bookshelf with numbered slots. Each book sits in a precise position — first, second, third...",
        task:"Create: favorites = [4 items of your choice]\nPrint favorites[0] (first)\nPrint favorites[-1] (last)\nPrint favorites[1] (second)\nAlso print how many items: len(favorites)",
        hints:["favorites = [\"pizza\", \"gaming\", \"dogs\", \"music\"]","print(favorites[0]), print(favorites[-1]), print(len(favorites))"],
        starterCode:"# Create a list of 4 favorites\n\n# Print first, last, second, and length\n",
        expectedBehavior:"Must create list with 4 items, access by index [0], [-1], [1], and print len()",xpReward:15},
      {id:"ch5_r2",name:"Rearranging",scene:"archives",npc:"index",
        npcDialogue:[
          "Lists aren't frozen — you can change them! Python has several methods for modifying lists.",
          ".append(item) adds something to the END. Like putting a new book on the right side of the shelf.",
          ".insert(index, item) puts something at a SPECIFIC position. Everything after it shifts right.",
          ".remove(item) finds and removes the FIRST match. .pop() removes the LAST item (and gives it back to you).",
          ".sort() puts everything in order — alphabetically for strings, numerically for numbers.",
          "Rearrange the archive: start with a list, add items, remove one, sort what's left, and show the result.",
        ],
        narrative:"Books scattered everywhere! The shelf needs reorganizing — add some, remove others, sort the rest.",
        task:"Start: books = [\"Dragon\", \"Arch\", \"Code\"]\n1. Append \"Beta\"\n2. Insert \"Alpha\" at position 0\n3. Remove \"Dragon\"\n4. Sort the list\n5. Print the final list",
        hints:["books.append(\"Beta\"), books.insert(0, \"Alpha\")","books.remove(\"Dragon\"), books.sort(), print(books)"],
        starterCode:"books = [\"Dragon\", \"Arch\", \"Code\"]\n\n",
        expectedBehavior:"Must use append, insert, remove, sort. Final list should be ['Alpha', 'Arch', 'Beta', 'Code']",xpReward:15},
      {id:"ch5_r3",name:"Reading the Collection",scene:"archives",npc:"index",
        npcDialogue:[
          "Remember for loops? They work PERFECTLY with lists. In fact, this is probably the most common thing programmers do.",
          "for book in books:\n    print(book)",
          "That prints every item in the list, one at a time. The variable 'book' takes each value in turn — just like how 'i' took each number from range().",
          "You can do anything inside the loop — calculations, if/else checks, f-strings. The loop runs once for EACH item.",
          "Loop through a list of scores and for each one, print whether it's a pass (>= 70) or fail.",
        ],
        narrative:"The reading room. Each book must be opened, examined, and cataloged individually.",
        task:"scores = [85, 42, 91, 67, 73, 55]\nLoop through and print each score\nwith \"Pass\" if >= 70, \"Fail\" otherwise.",
        hints:["for score in scores:","if score >= 70: print(f\"{score}: Pass\") else: print(f\"{score}: Fail\")"],
        starterCode:"scores = [85, 42, 91, 67, 73, 55]\n\n",
        expectedBehavior:"Must loop through scores list and print each with Pass/Fail based on >= 70 threshold",xpReward:18},
      {id:"ch5_r4",name:"The Card Catalog",scene:"archives",npc:"index",
        npcDialogue:[
          "SLICING lets you grab a PORTION of a list — like pulling a few books off a shelf without taking them all.",
          "The syntax is list[start:stop] — it gives you items from start up to (but NOT including) stop. Sound familiar? It works like range()!",
          "colors = [\"red\", \"orange\", \"yellow\", \"green\", \"blue\"]\ncolors[1:4] gives [\"orange\", \"yellow\", \"green\"] — items at index 1, 2, 3.",
          "Shortcuts: colors[:3] means 'from the beginning to index 3'. colors[2:] means 'from index 2 to the end'.",
          "You can also use len(list) to get the total count. The card catalog needs you to slice and dice a list of items.",
        ],
        narrative:"The card catalog has drawers of indexed cards. Pull just the section you need — not too many, not too few.",
        task:"items = [\"map\", \"torch\", \"key\", \"gem\", \"scroll\", \"ring\"]\nPrint: first 3 items, last 2 items,\nmiddle items (index 2 to 4),\nand the total count.",
        hints:["items[:3] = first 3, items[-2:] = last 2","items[2:4] = middle, len(items) = count"],
        starterCode:"items = [\"map\", \"torch\", \"key\", \"gem\", \"scroll\", \"ring\"]\n\n",
        expectedBehavior:"Must use list slicing [:3], [-2:], [2:4], and len(). Show correct subsets.",xpReward:18},
      {id:"ch5_r5",name:"Building the Index",scene:"archives",npc:"index",
        npcDialogue:[
          "The most powerful pattern combines LOOPS and LISTS: building a new list dynamically.",
          "You start with an empty list, then use a loop to add items one at a time with .append().",
          "squares = []\nfor i in range(1, 6):\n    squares.append(i ** 2)\nprint(squares)  # [1, 4, 9, 16, 25]",
          "This is the BUILD pattern: empty list → loop → append → done. You'll use it constantly in real programming.",
          "Build an index of all words longer than 3 letters from a sentence.",
        ],
        narrative:"An empty catalog awaits. Fill it by examining each item and deciding what belongs.",
        task:"words = [\"the\", \"quick\", \"fox\", \"jumps\", \"over\", \"a\", \"lazy\", \"dog\"]\nBuild a new list of ONLY words longer than 3 letters.\nPrint the new list and its length.",
        hints:["long_words = [], then loop and check len(word) > 3","if len(word) > 3: long_words.append(word)"],
        starterCode:"words = [\"the\", \"quick\", \"fox\", \"jumps\", \"over\", \"a\", \"lazy\", \"dog\"]\n\n# Build a list of long words\nlong_words = []\n\n",
        expectedBehavior:"Must build list using loop+append pattern. long_words should be ['quick', 'jumps', 'over', 'lazy']. Print list and len.",xpReward:20},
      // ── Side Quests ──
      {id:"ch5_s1",name:"Quick Search",scene:"archives",npc:"index",optional:true,
        npcDialogue:[
          "How do you check if something is IN a list? Python makes it beautifully simple with the 'in' keyword.",
          "if \"apple\" in fruits:\n    print(\"Found it!\")",
          "'in' returns True or False — it searches the whole list for you. No loop needed!",
          "'not in' does the opposite: if \"grape\" not in fruits: means 'if grape is NOT in the list.'",
          "The search desk needs you to check membership for several items. Use 'in' and 'not in' to test them.",
        ],
        narrative:"The search desk. Visitors ask if certain books exist in the collection.",
        task:"library = [\"Python\", \"Data\", \"Loops\", \"Lists\", \"Games\"]\nCheck and print whether each exists:\n\"Python\", \"Ruby\", \"Games\", \"Math\"",
        hints:["if \"Python\" in library: print(\"Python: Found!\")","else: print(\"Python: Not found\")"],
        starterCode:"library = [\"Python\", \"Data\", \"Loops\", \"Lists\", \"Games\"]\n\n",
        expectedBehavior:"Must use 'in' operator to check membership. Python and Games found, Ruby and Math not found.",xpReward:12},
      {id:"ch5_s2",name:"The Numbered Shelves",scene:"archives",npc:"index",optional:true,
        npcDialogue:[
          "When looping through a list, sometimes you need both the item AND its position number. That's what enumerate() does.",
          "for i, item in enumerate(fruits):\n    print(f\"{i}: {item}\")",
          "enumerate() gives you TWO variables each time: the index number and the item itself. You need two variable names before 'in'.",
          "It's like getting a numbered receipt — you see both the position and the value at once.",
          "Number the archive shelves: loop through a list with enumerate and print each item with its index.",
        ],
        narrative:"Unnumbered shelves! Every book needs a position label. enumerate() to the rescue.",
        task:"heroes = [\"Link\", \"Mario\", \"Samus\", \"Kirby\"]\nUse enumerate() to print:\n0: Link\n1: Mario\n2: Samus\n3: Kirby",
        hints:["for i, hero in enumerate(heroes):","print(f\"{i}: {hero}\")"],
        starterCode:"heroes = [\"Link\", \"Mario\", \"Samus\", \"Kirby\"]\n\n",
        expectedBehavior:"Must use enumerate() to loop with index. Print each hero with its index number.",xpReward:12},
      {id:"ch5_s3",name:"The Shorthand",scene:"archives",npc:"index",optional:true,
        npcDialogue:[
          "Python has a shortcut for the build pattern called a LIST COMPREHENSION. It's the same loop, but compressed into one line.",
          "The long way:\nsquares = []\nfor i in range(5):\n    squares.append(i**2)",
          "The shorthand:\nsquares = [i**2 for i in range(5)]",
          "Same result! Read it as: 'make a list of i squared, for each i in range 5.'",
          "You can even add a condition: evens = [i for i in range(20) if i % 2 == 0] — only includes even numbers.",
          "Try building a couple lists the shorthand way.",
        ],
        narrative:"A master archivist's shorthand — do in one line what takes others four.",
        task:"Create using list comprehensions:\n1. doubles = [i*2 for i in range(1,6)] (should be [2,4,6,8,10])\n2. long = [w for w in words if len(w)>3]\n   where words = [\"hi\",\"hello\",\"hey\",\"howdy\"]\nPrint both.",
        hints:["doubles = [i*2 for i in range(1,6)]","long = [w for w in [\"hi\",\"hello\",\"hey\",\"howdy\"] if len(w)>3]"],
        starterCode:"# List comprehensions\n",
        expectedBehavior:"Must use list comprehension syntax. doubles=[2,4,6,8,10], long=['hello','howdy']. Print both.",xpReward:15},
    ],
    boss:{id:"ch5_boss",name:"The Archive Keeper",scene:"boss",npc:"guardian",
      npcDialogue:[
        "I am the Archive Keeper. The knowledge in this library is infinite — but only the organized survive.",
        "You've learned lists: creation, indexing, methods, loops, slicing, and building. Time to use it ALL.",
        "Build me an inventory system. Start with items and their quantities. Add a new item, remove one, then loop through and print a formatted report.",
        "Finally, calculate and print the total number of items across all categories.",
        "Organization is power. Show me yours.",
      ],
      narrative:"The Archive Keeper emerges from between towering shelves. Scrolls float around its head:\n\n\"Knowledge without organization is just noise.\"",
      task:"inventory = [\"Sword\", \"Shield\", \"Potion\", \"Arrow\"]\ncounts = [1, 1, 5, 20]\n1. Append \"Gem\" to inventory, 3 to counts\n2. Remove \"Shield\" (find its index, remove from BOTH lists)\n3. Loop through and print: \"[item] x[count]\"\n4. Print total items (sum of all counts)",
      hints:["idx = inventory.index(\"Shield\") to find position","total = 0, then loop: total += count"],
      starterCode:"inventory = [\"Sword\", \"Shield\", \"Potion\", \"Arrow\"]\ncounts = [1, 1, 5, 20]\n\n# 1. Add Gem\n\n# 2. Remove Shield from both lists\n\n# 3. Print formatted inventory\n\n# 4. Print total\n",
      expectedBehavior:"Must manage parallel lists: append to both, remove from both using index(), loop to print formatted inventory, sum counts for total",xpReward:60},
  },
  {
    id:"ch6", name:"The Forge", subtitle:"Craft reusable tools with functions",
    icon:"🔥", scene:"forge", requiredXp:700,
    badge:{name:"Tool Smith",icon:"🔨"}, equipment:{id:"hammer",name:"Smith's Hammer",slot:"item",icon:"🔨"},
    mapPosition:{x:22,y:62},
    introNpc:"forge",
    introDialogue:[
      "I am Forge. I build tools — and that's exactly what you're about to learn.",
      "Think about everything you've done so far. Every time you wanted to do the same task, you wrote the code again from scratch. That's like building a new hammer every time you need to hit a nail.",
      "FUNCTIONS let you write a piece of code ONCE, give it a name, and then USE it whenever you need it. You're building a tool you can reach for again and again.",
      "def greet():\n    print(\"Hello!\")\n\ngreet()  # Runs the code inside the function",
      "'def' means 'define a function.' You give it a name, add parentheses and a colon, then indent the code that belongs to it — just like if/else and loops.",
      "But here's the key: the code inside DOESN'T run when you define it. It only runs when you CALL the function by writing its name with parentheses: greet()",
      "Think of def as writing a recipe, and calling it as actually cooking the dish. You can cook it as many times as you want from one recipe.",
      "The forge awaits. Let's build your first tools.",
    ],
    rooms: [
      {id:"ch6_r1",name:"Your First Tool",scene:"forge",npc:"forge",
        npcDialogue:[
          "Every tool starts simple. Let's define a function that does one thing — prints a greeting.",
          "def say_hello():\n    print(\"Hello, adventurer!\")",
          "That creates the function. But nothing happens yet! The code is stored, waiting to be called.",
          "To actually RUN it, write: say_hello() — the name followed by parentheses. You can call it as many times as you want.",
          "Define a function called battle_cry that prints your own battle cry. Then call it three times.",
        ],
        narrative:"The forge's first anvil. Simple tools first — a blade, a handle, a purpose.",
        task:"Define a function called battle_cry() that prints a war cry.\nCall it 3 times.",
        hints:["def battle_cry():\n    print(\"Charge!\")","Call it three times:\nbattle_cry()\nbattle_cry()\nbattle_cry()"],
        starterCode:"# Define your function\n\n# Call it 3 times\n",
        expectedBehavior:"Must define a function battle_cry() and call it 3 times, printing 3 lines",xpReward:15},
      {id:"ch6_r2",name:"Adding Ingredients",scene:"forge",npc:"forge",
        npcDialogue:[
          "A hammer that only hits one thing isn't very useful. PARAMETERS let you pass information INTO a function so it can work with different data each time.",
          "def greet(name):\n    print(f\"Hello, {name}!\")\n\ngreet(\"Alex\")  # Hello, Alex!\ngreet(\"Sam\")   # Hello, Sam!",
          "The variable 'name' inside the parentheses is a PARAMETER — it's a placeholder that gets filled in when you call the function.",
          "The value you pass in when calling — like \"Alex\" — is called an ARGUMENT. Parameter is the slot, argument is what fills it.",
          "You can have multiple parameters: def add(a, b): — then call with add(3, 5). Each argument fills the next parameter in order.",
          "Build a function that takes a hero name and a level, and prints a formatted status line.",
        ],
        narrative:"The forge heats up. This tool needs to accept different materials — one shape, many uses.",
        task:"Define hero_status(name, level) that prints:\n[name] — Level [level]\nCall it with 3 different heroes.",
        hints:["def hero_status(name, level):\n    print(f\"{name} — Level {level}\")","hero_status(\"Knight\", 5)\nhero_status(\"Mage\", 3)"],
        starterCode:"# Define hero_status with two parameters\n\n# Call with 3 different heroes\n",
        expectedBehavior:"Must define function with 2 parameters and call it 3 times with different arguments",xpReward:15},
      {id:"ch6_r3",name:"The Anvil's Output",scene:"forge",npc:"forge",
        npcDialogue:[
          "So far, our functions only PRINT things. But what if you want the function to GIVE BACK a value you can use later?",
          "That's what RETURN does. Instead of printing, the function sends a value back to whoever called it.",
          "def double(n):\n    return n * 2\n\nresult = double(5)  # result is now 10\nprint(result)  # 10",
          "See the difference? print() shows text on screen. return sends a value BACK to your code silently. You choose what to do with it.",
          "This is HUGE. With return, functions become building blocks. The output of one function can be the input to another.",
          "Build a function that calculates and RETURNS attack power, then use the returned value in a print statement.",
        ],
        narrative:"The anvil rings. The tool takes raw material in and sends finished work OUT.",
        task:"Define calculate_damage(base, multiplier)\nthat RETURNS base * multiplier.\nStore the result and print it:\n\"Damage dealt: [result]\"",
        hints:["def calculate_damage(base, multiplier):\n    return base * multiplier","damage = calculate_damage(10, 3)\nprint(f\"Damage dealt: {damage}\")"],
        starterCode:"# Define function that RETURNS a value\n\n# Call it and use the result\n",
        expectedBehavior:"Must define function with return statement, call it, store result in variable, and print it",xpReward:18},
      {id:"ch6_r4",name:"Default Settings",scene:"forge",npc:"forge",
        npcDialogue:[
          "Sometimes a parameter has a common value that you use MOST of the time. DEFAULT PARAMETERS let you set that.",
          "def greet(name, greeting=\"Hello\"):\n    print(f\"{greeting}, {name}!\")\n\ngreet(\"Alex\")           # Hello, Alex!\ngreet(\"Alex\", \"Hey\")    # Hey, Alex!",
          "If you don't provide a value for 'greeting', it uses \"Hello\". But you CAN override it.",
          "Rule: default parameters must come AFTER required ones. def f(a, b=5): is fine. def f(a=5, b): is NOT.",
          "Build a power-up function where the power amount defaults to 10 but can be overridden.",
        ],
        narrative:"A tool with adjustable settings. Turn the dial or leave it at the default — your choice.",
        task:"Define power_up(name, amount=10) that returns:\n\"[name] gained [amount] power!\"\nCall with just a name (uses default 10)\nCall with name AND custom amount.",
        hints:["def power_up(name, amount=10):\n    return f\"{name} gained {amount} power!\"","print(power_up(\"Knight\"))\nprint(power_up(\"Mage\", 25))"],
        starterCode:"# Define function with default parameter\n\n# Call with default and with override\n",
        expectedBehavior:"Must define function with default parameter value, call with and without the optional argument",xpReward:18},
      {id:"ch6_r5",name:"Multiple Returns",scene:"forge",npc:"forge",
        npcDialogue:[
          "A function can return MORE THAN ONE value! You just separate them with commas.",
          "def min_max(numbers):\n    return min(numbers), max(numbers)\n\nlow, high = min_max([3, 7, 1, 9])\nprint(low)   # 1\nprint(high)  # 9",
          "When the function returns two values, you 'catch' them with two variables on the left side of the equals sign. This is called UNPACKING.",
          "Python actually returns them as a TUPLE — a fixed group of values. You'll explore tuples more later, but for now just know you can unpack them.",
          "Build a function that takes a list of scores and returns both the average and the highest score.",
        ],
        narrative:"The master forge produces twin blades — two outputs from one process.",
        task:"Define analyze_scores(scores) that returns:\naverage (sum/len) AND highest (max).\nscores = [85, 92, 78, 95, 88]\nUnpack both values and print them.",
        hints:["return sum(scores)/len(scores), max(scores)","avg, highest = analyze_scores(scores)"],
        starterCode:"scores = [85, 92, 78, 95, 88]\n\n# Define function that returns two values\n\n# Call and unpack\n",
        expectedBehavior:"Must define function returning two values, unpack them into separate variables, print both",xpReward:20},
      // ── Side Quests ──
      {id:"ch6_s1",name:"The Assembly Line",scene:"forge",npc:"forge",optional:true,
        npcDialogue:[
          "The real power of functions is that they can CALL EACH OTHER. Function A can use function B's result as its input.",
          "def double(n):\n    return n * 2\n\ndef double_and_add(a, b):\n    return double(a) + double(b)\n\nprint(double_and_add(3, 5))  # 16",
          "double_and_add calls double twice internally. You build small functions, then combine them into bigger ones. This is how real programs are built.",
          "Build three small functions that work together: one calculates attack, one defense, one combines them into a power rating.",
        ],
        narrative:"Gears connect to gears. Each tool feeds into the next — an assembly line of logic.",
        task:"def calc_attack(level): return level * 3\ndef calc_defense(level): return level * 2 + 5\ndef power_rating(level):\n    return calc_attack(level) + calc_defense(level)\nPrint power_rating for levels 1, 5, 10.",
        hints:["Define three functions, the third calls the other two","power_rating(5) = 15 + 15 = 30"],
        starterCode:"# Three functions that work together\n",
        expectedBehavior:"Must define 3 functions where one calls the others. Print ratings for multiple levels.",xpReward:12},
      {id:"ch6_s2",name:"Documenting Blueprints",scene:"forge",npc:"forge",optional:true,
        npcDialogue:[
          "Good code isn't just code that works — it's code that EXPLAINS itself. DOCSTRINGS are how you document functions.",
          "A docstring is a string on the first line inside the function. Use triple quotes:",
          "def greet(name):\n    \"\"\"Print a personalized greeting.\"\"\"\n    print(f\"Hello, {name}!\")",
          "The docstring describes what the function does, what it takes, and what it returns. Future-you (and teammates) will thank you.",
          "Write three functions with proper docstrings, then use help() to display them.",
        ],
        narrative:"The blueprint wall. Every great tool has documentation — so the next smith can understand it.",
        task:"Write a function calculate_area(width, height)\nwith a docstring explaining what it does.\nReturn width * height.\nThen call help(calculate_area) to display the docs.",
        hints:["\"\"\"Calculate area of a rectangle.\"\"\"","help(calculate_area) prints the docstring"],
        starterCode:"# Write a function with a docstring\n\n# Use help() to display it\n",
        expectedBehavior:"Must define function with docstring and call help() on it",xpReward:12},
      {id:"ch6_s3",name:"Variable Scope",scene:"forge",npc:"forge",optional:true,
        npcDialogue:[
          "Here's something that catches people: variables created INSIDE a function are LOCAL — they only exist inside that function.",
          "def test():\n    x = 10  # local variable\n    print(x)  # works!\n\ntest()\nprint(x)  # ERROR! x doesn't exist out here",
          "Variables created OUTSIDE functions are GLOBAL — accessible everywhere. But if you create one with the same name inside a function, it's a new, separate local variable.",
          "x = 5  # global\ndef show():\n    x = 10  # new local x, doesn't change the global!\n    print(x)  # 10\nshow()\nprint(x)  # still 5!",
          "This is called SCOPE. It keeps functions self-contained so they don't accidentally break each other's variables.",
        ],
        narrative:"Two forges side by side. Each has its own tools — what's inside one doesn't affect the other.",
        task:"Create a global variable score = 100.\nDefine a function that creates a LOCAL score = 50 and prints it.\nCall the function, then print the global score.\nShow they're independent!",
        hints:["score = 100\ndef local_test():\n    score = 50\n    print(f\"Local: {score}\")","local_test()\nprint(f\"Global: {score}\")  # still 100"],
        starterCode:"# Show that local and global variables are separate\n",
        expectedBehavior:"Must demonstrate local vs global scope. Local prints 50, global still prints 100.",xpReward:15},
    ],
    boss:{id:"ch6_boss",name:"The Master Smith",scene:"boss",npc:"guardian",
      npcDialogue:[
        "You've forged simple tools. Now forge a SYSTEM — multiple functions working together.",
        "Build a character stat calculator with THREE functions: one for attack, one for defense, one for a full report.",
        "The report function should CALL the other two and combine their results. This is how real programmers build — small pieces assembled into something greater.",
        "Show me your craft, apprentice.",
      ],
      narrative:"The Master Smith stands before the greatest anvil. Molten metal flows, waiting to be shaped:\n\n\"One tool is nothing. A toolkit is everything.\"",
      task:"Build 3 functions:\n1. calc_attack(strength, weapon) → returns strength * 2 + weapon\n2. calc_defense(armor, shield) → returns armor + shield * 1.5\n3. hero_report(name, str, wpn, arm, shd) → calls the others,\n   prints name, attack, defense, and total power.\nCall hero_report with sample values.",
      hints:["def hero_report calls calc_attack and calc_defense internally","hero_report(\"Knight\", 10, 5, 8, 4)"],
      starterCode:"# Function 1: calc_attack\n\n# Function 2: calc_defense\n\n# Function 3: hero_report (calls the other two)\n\n# Call hero_report\n",
      expectedBehavior:"Must define 3 functions, hero_report calls the other 2. Print formatted character report with attack, defense, total.",xpReward:60},
  },
  {
    id:"ch7", name:"The Map Room", subtitle:"Navigate data with dictionaries",
    icon:"🗺️", scene:"maproom", requiredXp:880,
    badge:{name:"Cartographer",icon:"🧭"}, equipment:{id:"compass2",name:"Master Compass",slot:"item",icon:"🧭"},
    mapPosition:{x:48,y:68},
    introNpc:"cartographer",
    introDialogue:[
      "Slow down, young one. I am Cartographer. I've mapped every inch of this realm — and I organize my maps with LABELS, not numbers.",
      "Lists are great, but they use number positions: list[0], list[1]. What if you want to look something up by NAME instead?",
      "That's a DICTIONARY. Instead of numbered slots, it has KEYS and VALUES — like a real dictionary where you look up a word to find its definition.",
      "player = {\"name\": \"Alex\", \"level\": 5, \"health\": 100}",
      "Curly braces create the dict. Each entry is a key: value pair, separated by commas.",
      "To access a value, use the key in square brackets: player[\"name\"] gives \"Alex\". player[\"level\"] gives 5.",
      "Think of it as a labeled filing cabinet. Instead of 'give me drawer #3,' you say 'give me the drawer labeled health.'",
      "The Map Room is organized by dictionaries. Let's explore.",
    ],
    rooms: [
      {id:"ch7_r1",name:"Key and Value",scene:"maproom",npc:"cartographer",
        npcDialogue:[
          "Let's start simple. A dictionary maps KEYS to VALUES. Keys are usually strings, values can be anything.",
          "pet = {\"name\": \"Pixel\", \"type\": \"cat\", \"age\": 3}",
          "Access values by key: pet[\"name\"] gives \"Pixel\". pet[\"age\"] gives 3.",
          "Keys must be unique — you can't have two entries with the same key. But values can repeat.",
          "Create a dictionary for a game character and access its properties individually.",
        ],
        narrative:"A filing cabinet with labeled drawers. Each label leads to exactly one piece of information.",
        task:"Create a dict: character = {\"name\": any, \"class\": any, \"level\": any number, \"health\": any number}\nPrint each value by key with a label.",
        hints:["character = {\"name\": \"Aria\", \"class\": \"Mage\", \"level\": 5, \"health\": 80}","print(f\"Name: {character['name']}\")"],
        starterCode:"# Create a character dictionary\n\n# Print each value\n",
        expectedBehavior:"Must create dict with 4 key-value pairs and access each by key to print",xpReward:15},
      {id:"ch7_r2",name:"Updating the Map",scene:"maproom",npc:"cartographer",
        npcDialogue:[
          "Maps change. Dictionaries can be UPDATED — add new entries, change existing ones, or remove them.",
          "pet[\"color\"] = \"orange\" — adds a NEW key if it doesn't exist, or changes the value if it does.",
          "del pet[\"age\"] — removes that key and its value entirely.",
          "player[\"level\"] = player[\"level\"] + 1 — levels up! You can update a value based on its current value.",
          "The map ahead needs updating: add new territories, change existing names, remove outdated entries.",
        ],
        narrative:"The old map needs updating. New territories discovered, borders redrawn, dead ends removed.",
        task:"Start: player = {\"name\": \"Hero\", \"xp\": 0, \"gold\": 50}\n1. Add \"level\" with value 1\n2. Increase gold by 25\n3. Set xp to 100\n4. Add \"title\" as \"Adventurer\"\n5. Print the final dict",
        hints:["player[\"level\"] = 1","player[\"gold\"] += 25 or player[\"gold\"] = player[\"gold\"] + 25"],
        starterCode:"player = {\"name\": \"Hero\", \"xp\": 0, \"gold\": 50}\n\n",
        expectedBehavior:"Must add, update, and modify dict entries. Final dict has name, xp=100, gold=75, level=1, title=Adventurer",xpReward:15},
      {id:"ch7_r3",name:"Reading Every Entry",scene:"maproom",npc:"cartographer",
        npcDialogue:[
          "How do you loop through a dictionary? There are three ways, depending on what you need:",
          "for key in player: — loops through just the KEYS. Same as player.keys().",
          "for value in player.values(): — loops through just the VALUES.",
          "for key, value in player.items(): — loops through BOTH at once! This is the most common and most useful.",
          "for key, value in player.items():\n    print(f\"{key}: {value}\")",
          "The catalog ahead needs a full reading. Use .items() to loop through and print every entry.",
        ],
        narrative:"Every map must be inventoried. Read each label and its contents — miss nothing.",
        task:"stats = {\"strength\": 15, \"speed\": 12, \"magic\": 8, \"luck\": 20}\nLoop with .items() and print each as:\n[key]: [value]\nAlso print the total of all values.",
        hints:["for key, value in stats.items():\n    print(f\"{key}: {value}\")","total = sum(stats.values())"],
        starterCode:"stats = {\"strength\": 15, \"speed\": 12, \"magic\": 8, \"luck\": 20}\n\n",
        expectedBehavior:"Must loop through dict with .items(), print each key-value pair, and sum all values",xpReward:18},
      {id:"ch7_r4",name:"Nested Maps",scene:"maproom",npc:"cartographer",
        npcDialogue:[
          "Here's where it gets powerful: you can put a DICTIONARY inside another dictionary. Maps within maps!",
          "game = {\n    \"player\": {\"name\": \"Alex\", \"hp\": 100},\n    \"enemy\": {\"name\": \"Dragon\", \"hp\": 500}\n}",
          "To access nested values, chain the brackets: game[\"player\"][\"name\"] gives \"Alex\".",
          "First bracket gets the inner dict, second bracket gets the value inside that dict. Think of it as: open the 'player' drawer, then find the 'name' card inside.",
          "Build a nested dictionary representing a game world with multiple locations, each having their own properties.",
        ],
        narrative:"Maps of maps. Zoom into a region and find another map inside, with even finer detail.",
        task:"Create a nested dict:\nworld = {\n  \"forest\": {\"danger\": 3, \"treasure\": 5},\n  \"cave\": {\"danger\": 8, \"treasure\": 10},\n  \"village\": {\"danger\": 1, \"treasure\": 2}\n}\nLoop through and print each location with its properties.\nFind the location with highest treasure.",
        hints:["for place, info in world.items():","print(f\"{place}: danger={info['danger']}, treasure={info['treasure']}\")"],
        starterCode:"# Create nested dictionary\n\n# Loop and display\n\n# Find highest treasure\n",
        expectedBehavior:"Must create nested dict, loop through with items(), and find max treasure location",xpReward:18},
      {id:"ch7_r5",name:"Dict + List Combo",scene:"maproom",npc:"cartographer",
        npcDialogue:[
          "The real magic happens when you combine dicts and lists. A list of dicts is one of the most common data structures in all of programming.",
          "party = [\n    {\"name\": \"Knight\", \"hp\": 100},\n    {\"name\": \"Mage\", \"hp\": 60},\n    {\"name\": \"Rogue\", \"hp\": 80}\n]",
          "party[0] is the first dict. party[0][\"name\"] is \"Knight\". You can loop through the list and access each dict's keys.",
          "for member in party:\n    print(member[\"name\"])",
          "This is how databases work, how game inventories work, how almost everything that stores multiple records works.",
          "Build a party of characters as a list of dicts and write code to find the strongest member.",
        ],
        narrative:"The expedition roster — a list of maps, each describing a different adventurer.",
        task:"party = [\n  {\"name\": \"Knight\", \"attack\": 15, \"defense\": 12},\n  {\"name\": \"Mage\", \"attack\": 20, \"defense\": 5},\n  {\"name\": \"Rogue\", \"attack\": 12, \"defense\": 8}\n]\nPrint each member's stats.\nFind and print who has the highest attack.",
        hints:["for member in party:\n    print(f\"{member['name']}: ATK={member['attack']}\")","Track best with a variable, compare in loop"],
        starterCode:"party = [\n  {\"name\": \"Knight\", \"attack\": 15, \"defense\": 12},\n  {\"name\": \"Mage\", \"attack\": 20, \"defense\": 5},\n  {\"name\": \"Rogue\", \"attack\": 12, \"defense\": 8}\n]\n\n",
        expectedBehavior:"Must loop through list of dicts, print each member's stats, find member with highest attack",xpReward:20},
      // ── Side Quests ──
      {id:"ch7_s1",name:"Safe Access",scene:"maproom",npc:"cartographer",optional:true,
        npcDialogue:[
          "What happens if you try to access a key that doesn't EXIST? player[\"wings\"] — CRASH! KeyError!",
          "The .get() method is the safe way: player.get(\"wings\") returns None instead of crashing.",
          "Even better: player.get(\"wings\", \"none\") returns \"none\" as a default. You choose what to get back if the key is missing.",
          "This is critical in real programs where you can't always guarantee the data has every key.",
          "Test .get() with keys that exist and keys that don't, using custom defaults.",
        ],
        narrative:"Some drawers are empty. A wise cartographer checks before reaching in blindly.",
        task:"hero = {\"name\": \"Aria\", \"level\": 5}\nPrint hero.get(\"name\") (exists)\nPrint hero.get(\"weapon\", \"unarmed\") (doesn't exist, use default)\nPrint hero.get(\"shield\") (doesn't exist, no default — shows None)",
        hints:["hero.get(\"name\") returns \"Aria\"","hero.get(\"weapon\", \"unarmed\") returns \"unarmed\""],
        starterCode:"hero = {\"name\": \"Aria\", \"level\": 5}\n\n",
        expectedBehavior:"Must use .get() with existing key, missing key with default, and missing key without default (None)",xpReward:12},
      {id:"ch7_s2",name:"Counting Words",scene:"maproom",npc:"cartographer",optional:true,
        npcDialogue:[
          "One of the most useful dict patterns: using a dictionary to COUNT things.",
          "Start with an empty dict. For each item, if it's already a key, add 1. If not, set it to 1.",
          "counts = {}\nfor word in words:\n    if word in counts:\n        counts[word] += 1\n    else:\n        counts[word] = 1",
          "There's a shortcut too: counts[word] = counts.get(word, 0) + 1 — get returns 0 if the key doesn't exist, then you add 1.",
          "Count the letters in a word and show the frequency of each.",
        ],
        narrative:"The librarian's tally — counting every occurrence, one by one.",
        task:"word = \"mississippi\"\nBuild a dict counting each letter.\nPrint each letter and its count.",
        hints:["counts = {}\nfor char in word:\n    counts[char] = counts.get(char, 0) + 1","Should find: m=1, i=4, s=4, p=2"],
        starterCode:"word = \"mississippi\"\n\n# Count each letter\n\n# Print results\n",
        expectedBehavior:"Must use dict as counter. Count letters in 'mississippi' and print each letter's frequency.",xpReward:12},
      {id:"ch7_s3",name:"Dict Comprehensions",scene:"maproom",npc:"cartographer",optional:true,
        npcDialogue:[
          "Remember list comprehensions? Dicts have them too! Build a dictionary in one line.",
          "squares = {n: n**2 for n in range(1, 6)}\n# {1: 1, 2: 4, 3: 9, 4: 16, 5: 25}",
          "The pattern: {key_expression: value_expression for variable in iterable}",
          "You can add conditions too: {n: n**2 for n in range(10) if n % 2 == 0} — only even numbers.",
          "Build a couple dicts the fast way.",
        ],
        narrative:"The master cartographer's shorthand — entire maps in a single stroke.",
        task:"Create using dict comprehensions:\n1. cubes = {n: n**3 for n in range(1,6)}\n2. lengths = {w: len(w) for w in [\"cat\",\"elephant\",\"dog\"]}\nPrint both.",
        hints:["{n: n**3 for n in range(1,6)} → {1:1, 2:8, 3:27, 4:64, 5:125}","{w: len(w) for w in words}"],
        starterCode:"# Dict comprehensions\n",
        expectedBehavior:"Must use dict comprehension syntax for both. Print cubes and word lengths.",xpReward:15},
    ],
    boss:{id:"ch7_boss",name:"The World Builder",scene:"boss",npc:"guardian",
      npcDialogue:[
        "You have mapped keys to values, nested dicts within dicts, and combined lists with dicts. Now BUILD a world.",
        "Create a complete RPG character using a nested dictionary — name, class, stats as a sub-dict, and an inventory as a list.",
        "Then write a function that takes the character dict and prints a beautiful formatted report.",
        "Dictionaries ARE the data model of games. Show me you understand that.",
      ],
      narrative:"The World Builder rises from the map table, scrolls orbiting its head:\n\n\"Data shapes worlds. Shape yours.\"",
      task:"Build a character dict with:\n- name, char_class (strings)\n- stats: {strength, speed, magic} (nested dict)\n- inventory: list of item strings\nWrite display_character(char) that prints everything nicely.\nCall it.",
      hints:["character = {\"name\":..., \"stats\":{...}, \"inventory\":[...]}","def display_character(c): loop through c[\"stats\"].items(), c[\"inventory\"]"],
      starterCode:"# Build character dictionary\n\n# Write display function\n\n# Call it\n",
      expectedBehavior:"Must create nested dict with stats sub-dict and inventory list, write function that formats and prints all fields",xpReward:60},
  },
  {
    id:"ch8", name:"The Summit", subtitle:"Combine everything you've learned",
    icon:"⛰️", scene:"summit", requiredXp:1060,
    badge:{name:"Summit Climber",icon:"🏔️"}, equipment:{id:"crown",name:"Coder's Crown",slot:"badge",icon:"👑"},
    mapPosition:{x:76,y:58},
    introNpc:"byte",
    introDialogue:[
      "We meet again, coder. You've come so far — from your first print() to functions and dictionaries. I'm proud of you.",
      "This is the Summit — the final chapter. Here, we don't learn just one new thing. We learn to combine EVERYTHING.",
      "Real programs aren't about one concept. They're about print AND variables AND loops AND lists AND functions AND dicts all working together.",
      "You'll learn a few more tools up here: the random module, string methods, error handling, and data processing.",
      "But the real lesson is COMPOSITION — building bigger things from smaller pieces. That's what separates someone who knows code from someone who can BUILD with code.",
      "Professor Loop, Cipher, Iterator, Index, Forge, Cartographer — they all taught you pieces. Now you put the puzzle together.",
      "Ready for the peak? Let's go.",
    ],
    rooms: [
      {id:"ch8_r1",name:"Import Power",scene:"summit",npc:"byte",
        npcDialogue:[
          "Python has THOUSANDS of pre-built tools called MODULES. Instead of building everything from scratch, you can IMPORT what others have already made.",
          "import random — this loads Python's random number module. Now you can use its functions!",
          "random.randint(1, 10) — gives a random integer between 1 and 10 (inclusive).",
          "random.choice([\"a\", \"b\", \"c\"]) — picks a random item from a list.",
          "random.shuffle(my_list) — randomly reorders the list in place.",
          "The randomizer ahead needs you to generate random values for a simple dice game. Import random and roll some dice!",
        ],
        narrative:"A crystal prism refracts light into colors. Each color represents a different capability, waiting to be imported.",
        task:"import random\n1. Print a random number 1-6 (dice roll)\n2. Pick a random item from [\"sword\",\"shield\",\"potion\"]\n3. Create a list [1,2,3,4,5], shuffle it, print it",
        hints:["random.randint(1, 6)","random.choice([\"sword\",\"shield\",\"potion\"])\nrandom.shuffle(my_list)"],
        starterCode:"import random\n\n# Roll a die\n\n# Random choice\n\n# Shuffle a list\n",
        expectedBehavior:"Must import random and use randint, choice, and shuffle correctly",xpReward:15},
      {id:"ch8_r2",name:"String Toolkit",scene:"summit",npc:"professor",
        npcDialogue:[
          "Ah, you've made it to the Summit! I, Professor Loop, have one more lesson — advanced string methods.",
          ".split() breaks a string into a LIST by a separator. \"hello world\".split() gives [\"hello\", \"world\"]. Split on spaces by default.",
          "\" \".join(my_list) does the OPPOSITE — takes a list and joins items into one string with a separator between each.",
          ".strip() removes extra whitespace from the beginning and end. \"  hello  \".strip() gives \"hello\".",
          ".startswith() and .endswith() check if a string begins or ends with something — returns True or False.",
          "These are the tools professional programmers use to process text data every day.",
        ],
        narrative:"The Professor's workshop, high on the mountain. String-shaped crystals hang from the ceiling, waiting to be split and joined.",
        task:"sentence = \"  the quick brown fox jumps over  \"\n1. Strip whitespace\n2. Split into a word list\n3. Print how many words\n4. Join with \" - \" between each\n5. Check if it starts with \"the\"",
        hints:[".strip() then .split()","\" - \".join(words), sentence.strip().startswith(\"the\")"],
        starterCode:"sentence = \"  the quick brown fox jumps over  \"\n\n",
        expectedBehavior:"Must use strip, split, len, join, startswith on the sentence. Print results of each.",xpReward:15},
      {id:"ch8_r3",name:"Error Handling",scene:"summit",npc:"cipher",
        npcDialogue:[
          "I told you I deal in secrets. Here's one: errors aren't always bad. Sometimes they're EXPECTED.",
          "What if a user types 'abc' when you need a number? int(\"abc\") crashes with a ValueError. Without protection, your whole program dies.",
          "try/except CATCHES errors instead of crashing:\ntry:\n    number = int(\"abc\")\nexcept ValueError:\n    print(\"That's not a number!\")",
          "The code in 'try' runs normally. If an error happens, Python jumps to 'except' instead of crashing. Your program survives!",
          "You can catch specific error types: ValueError for bad conversions, ZeroDivisionError for dividing by zero, KeyError for missing dict keys.",
          "Build code that gracefully handles errors instead of crashing.",
        ],
        narrative:"A tightrope over a chasm. The net below catches you if you fall — try walks the rope, except is the net.",
        task:"Write three try/except blocks:\n1. Try int(\"hello\") — catch ValueError\n2. Try 10 / 0 — catch ZeroDivisionError\n3. Try {\"a\":1}[\"b\"] — catch KeyError\nPrint a helpful message in each except.",
        hints:["try:\n    int(\"hello\")\nexcept ValueError:\n    print(\"Can't convert!\")","Each try/except catches a different error type"],
        starterCode:"# Handle ValueError\n\n# Handle ZeroDivisionError\n\n# Handle KeyError\n",
        expectedBehavior:"Must use try/except with 3 different error types. Each should catch and print helpful message.",xpReward:18},
      {id:"ch8_r4",name:"Data Processing",scene:"summit",npc:"index",
        npcDialogue:[
          "Hoo! Welcome back! Real programs work with DATA — often messy data that needs cleaning and organizing.",
          "A common pattern: start with raw text data, split it into pieces, process each piece, and build structured results.",
          "Here's a mini-dataset as a multi-line string. Each line is a record. You'll split by lines, split each line by commas, and build a list of dicts.",
          "data = \"\"\"name,score\\nAlex,85\\nSam,92\\nJo,78\"\"\"\nlines = data.strip().split(\"\\n\")",
          "First line is headers, rest is data. Split each data line by comma, zip with headers, build dicts. This is how CSV files work!",
          "Process the data, build records, and find the highest scorer.",
        ],
        narrative:"Raw scrolls arrive at the Archives — unprocessed, messy. Transform them into organized knowledge.",
        task:"data = \"Alex,85\\nSam,92\\nJo,78\\nMax,88\"\nSplit into lines, then for each:\n  split by comma, store as dict {\"name\":..., \"score\":int(...)}\nPrint all records.\nFind and print the highest scorer.",
        hints:["lines = data.split(\"\\n\")\nfor line in lines:\n    parts = line.split(\",\")","record = {\"name\": parts[0], \"score\": int(parts[1])}"],
        starterCode:"data = \"Alex,85\\nSam,92\\nJo,78\\nMax,88\"\n\n# Parse into list of dicts\nrecords = []\n\n# Print all and find highest\n",
        expectedBehavior:"Must split string data into records, build list of dicts, find max score. Sam has highest at 92.",xpReward:18},
      {id:"ch8_r5",name:"Putting It Together",scene:"summit",npc:"byte",
        npcDialogue:[
          "This is it — the final skill room before the boss. Everything comes together here.",
          "You'll build a multi-function program that uses: variables, lists, dicts, loops, conditionals, functions, and string formatting.",
          "The program is a simple inventory manager. Define functions to add items, remove items, display the inventory, and search for items.",
          "Each function does ONE thing well. The main program calls them in sequence. This is how real software is structured.",
          "You've learned every tool. Now show me you can build something REAL with them.",
        ],
        narrative:"The final workshop. All tools hang on the wall — every technique from every chapter. Time to use them all.",
        task:"Build an inventory system with functions:\n1. add_item(inv, name, qty) — appends dict to list\n2. display(inv) — loops and prints all items\n3. find_item(inv, name) — returns item or None\nCreate inventory, add 3 items, display, search for one.",
        hints:["def add_item(inv, name, qty):\n    inv.append({\"name\": name, \"qty\": qty})","def find_item(inv, name):\n    for item in inv:\n        if item[\"name\"] == name: return item\n    return None"],
        starterCode:"# Define functions\n\n# Create inventory and use them\ninventory = []\n\n",
        expectedBehavior:"Must define 3+ functions operating on list of dicts. Add items, display formatted, search by name.",xpReward:20},
      // ── Side Quests ──
      {id:"ch8_s1",name:"Formatted Output",scene:"summit",npc:"professor",optional:true,
        npcDialogue:[
          "F-strings have secret powers! You can control exactly HOW values display inside the curly braces.",
          ":.2f formats a float to 2 decimal places: f\"{3.14159:.2f}\" gives \"3.14\"",
          ":>10 right-aligns in 10 characters: f\"{\"hi\":>10}\" gives \"        hi\"",
          ":<10 left-aligns, :^10 centers. You can combine: f\"{price:>8.2f}\" right-aligns a price with 2 decimals.",
          "Make a beautifully formatted price table using f-string formatting.",
        ],
        narrative:"The calligrapher's corner. Precision formatting — every character in its perfect place.",
        task:"items = [(\"Sword\", 29.99), (\"Shield\", 15.5), (\"Potion\", 3.0)]\nPrint a table:\nItem       Price\n-----------------\nSword      $29.99\nShield     $15.50\nPotion      $3.00",
        hints:["f\"{name:<10} ${price:>6.2f}\"","Loop through items, use format specifiers"],
        starterCode:"items = [(\"Sword\", 29.99), (\"Shield\", 15.5), (\"Potion\", 3.0)]\n\n# Print formatted table\n",
        expectedBehavior:"Must use f-string formatting with alignment and decimal specifiers to create aligned table",xpReward:12},
      {id:"ch8_s2",name:"Lambda Express",scene:"summit",npc:"cipher",optional:true,
        npcDialogue:[
          "Sometimes you need a tiny function — so small that def feels like overkill. LAMBDA is a one-line function.",
          "double = lambda x: x * 2\nprint(double(5))  # 10",
          "lambda x: x * 2 means: 'a function that takes x and returns x * 2.' No name, no def, no return — just the expression.",
          "Lambdas are most useful with functions like sorted(), map(), and filter() that take a function as an argument.",
          "sorted(names, key=lambda n: len(n)) — sorts names by length! The key parameter says 'use this function to get the comparison value.'",
        ],
        narrative:"A shortcut through the mountain — faster, but only for simple journeys.",
        task:"1. Create: double = lambda x: x * 2. Test it.\n2. Sort words = [\"cherry\",\"apple\",\"banana\"] alphabetically AND by length.\nUse lambda with sorted() for the length sort.",
        hints:["sorted(words) for alphabetical","sorted(words, key=lambda w: len(w)) for by length"],
        starterCode:"# Lambda basics\n\n# Sort by length using lambda\nwords = [\"cherry\", \"apple\", \"banana\"]\n",
        expectedBehavior:"Must create lambda, use sorted() with key=lambda for custom sorting",xpReward:12},
      {id:"ch8_s3",name:"The Sorting Hat",scene:"summit",npc:"index",optional:true,
        npcDialogue:[
          "sorted() is more powerful than you think. With the key parameter, you can sort ANYTHING by any criterion.",
          "Sort a list of dicts by a specific key:\nsorted(students, key=lambda s: s[\"grade\"])",
          "Add reverse=True to sort descending (highest first): sorted(scores, reverse=True)",
          "You can sort by computed values too: sorted(words, key=lambda w: w[-1]) sorts by the LAST character!",
          "Sort the adventurers in multiple ways using sorted() with different keys.",
        ],
        narrative:"The Archive's sorting room. Everything in its right place — but 'right' depends on what you're looking for.",
        task:"heroes = [\n  {\"name\":\"Knight\",\"power\":15,\"speed\":8},\n  {\"name\":\"Mage\",\"power\":20,\"speed\":5},\n  {\"name\":\"Rogue\",\"power\":10,\"speed\":18}\n]\nPrint sorted by: power (desc), speed (asc), name (alpha).",
        hints:["sorted(heroes, key=lambda h: h[\"power\"], reverse=True)","Print each sorted version with a label"],
        starterCode:"heroes = [\n  {\"name\":\"Knight\",\"power\":15,\"speed\":8},\n  {\"name\":\"Mage\",\"power\":20,\"speed\":5},\n  {\"name\":\"Rogue\",\"power\":10,\"speed\":18}\n]\n\n",
        expectedBehavior:"Must use sorted with key=lambda and reverse for multiple sort orders on list of dicts",xpReward:15},
    ],
    boss:{id:"ch8_boss",name:"The Final Trial",scene:"boss",npc:"guardian",
      npcDialogue:[
        "This is the summit. The final trial. Everything you've ever learned — in one program.",
        "Build a number guessing game. The computer picks a random number, the player makes guesses from a list, and the game tracks statistics.",
        "You'll need: import random, a function to check guesses, a loop to process attempts, a dict to track stats, and formatted output for the results.",
        "Variables, strings, lists, dicts, loops, conditionals, functions, imports — ALL of it. This is your masterpiece.",
        "Show me what you've become, coder.",
      ],
      narrative:"The Guardian waits at the summit's peak, silhouetted against a sky full of stars:\n\n\"Every line of code you've written has led to this moment.\"",
      task:"Build a guessing game:\n1. secret = random.randint(1, 20)\n2. guesses = [10, 15, 7, 13] (simulated)\n3. Function check_guess(guess, secret) returns \"high\",\"low\",or \"correct\"\n4. Loop through guesses, track attempts in a dict\n5. Print formatted results with stats",
      hints:["def check_guess(g, s): if g > s: return \"high\" elif g < s: return \"low\" else: return \"correct\"","stats = {\"attempts\": 0, \"guesses\": []}"],
      starterCode:"import random\n\n# Set secret number (use random.randint(1, 20))\n\n# Simulated guesses\nguesses = [10, 15, 7, 13]\n\n# check_guess function\n\n# Game loop\n\n# Print stats\n",
      expectedBehavior:"Must use random, define check_guess function, loop through guesses, track stats in dict, print formatted results",xpReward:70},
  },
  // ═══════════════════════════════════════════════════════════════
  // ACT 3: THE ARENA — Game Building
  // ═══════════════════════════════════════════════════════════════
  { id:"ch9", name:"The Workshop", subtitle:"Build playable games",
    icon:"🎮", requiredXp:1060, scene:"workshop",
    mapPosition:{x:18,y:82},
    rooms:[
      { id:"ch9_r1", name:"The Game Loop", xpReward:18,
        npc:"pixel", npcDialogue:[
          "Welcome to The Workshop! I'm Pixel — I've lived inside games my whole life.",
          "Every game has a heartbeat — a LOOP that keeps running until the game ends.",
          "The pattern is: while True → do stuff → check if done → break if yes.",
          "Let's build your first game loop!"
        ],
        task:"Write a game loop that:\n1. Prints \"⚔️ Round [number]!\" (starting at 1)\n2. Asks \"Continue? (y/n): \"\n3. If 'n', print \"Game Over!\" and break\n4. Otherwise increment the round\n\nSimulate with: responses = [\"y\", \"y\", \"y\", \"n\"]\nUse an index variable to step through responses.",
        hints:["while True: ... if answer == 'n': break","Use responses[i] instead of input(), increment i each round"],
        starterCode:"responses = [\"y\", \"y\", \"y\", \"n\"]\ni = 0\nround_num = 1\n\n# Game loop\n",
        expectedBehavior:"Must use while True, print round numbers, break on n, print Game Over"
      },
      { id:"ch9_r2", name:"Random Events", xpReward:17,
        npc:"pixel", npcDialogue:[
          "Games need surprises! That's where random comes in.",
          "random.choice() picks from a list. random.randint(a,b) picks a number.",
          "These turn predictable code into unpredictable games!"
        ],
        task:"Build a coin flip game:\n1. Import random\n2. Create a function flip_coin() that returns random.choice([\"Heads\", \"Tails\"])\n3. Flip 10 times in a loop\n4. Count heads and tails\n5. Print each flip and the final tally",
        hints:["def flip_coin(): return random.choice(['Heads', 'Tails'])","Track with heads = 0, tails = 0 and increment in the loop"],
        starterCode:"import random\n\n# flip_coin function\n\n# Flip 10 times and count\n",
        expectedBehavior:"Must import random, define flip_coin with random.choice, loop 10 times, count and print results"
      },
      { id:"ch9_r3", name:"Score Tracking", xpReward:17,
        npc:"pixel", npcDialogue:[
          "A game without a score is like a race without a finish line.",
          "We track score with variables that update each round.",
          "The pattern: start at 0, add points for wins, subtract for losses."
        ],
        task:"Build a dice battle game:\n1. Import random\n2. Simulate 5 rounds: player rolls randint(1,6), enemy rolls randint(1,6)\n3. Higher roll wins the round (ties go to nobody)\n4. Track player_wins, enemy_wins, ties\n5. Print each round's rolls and who won\n6. Print final score and overall winner",
        hints:["player = random.randint(1,6) in a for loop","if player > enemy: player_wins += 1 elif ..."],
        starterCode:"import random\n\nplayer_wins = 0\nenemy_wins = 0\nties = 0\n\n# 5 rounds of dice battle\n",
        expectedBehavior:"Must use random.randint, loop 5 rounds, track 3 counters, print per-round and final results"
      },
      { id:"ch9_r4", name:"Input Validation", xpReward:17,
        npc:"pixel", npcDialogue:[
          "Players will type ANYTHING. Trust me, I've seen things...",
          "Good games handle bad input gracefully with validation loops.",
          "The pattern: ask → check → if bad, ask again. Loop until valid!"
        ],
        task:"Write a validate_guess(guesses) function that:\n1. Takes a list of guesses (simulating input)\n2. For each guess, check if it's between 1 and 10\n3. If valid, print \"Guess [guess] accepted!\"\n4. If invalid, print \"[guess] is out of range! Must be 1-10.\"\n5. Return only the valid guesses as a list\n\nTest with: guesses = [5, 15, 0, 8, 3, -1, 10]",
        hints:["def validate_guess(guesses): valid = [] ... return valid","if 1 <= g <= 10: valid.append(g)"],
        starterCode:"# Validate guesses between 1 and 10\nguesses = [5, 15, 0, 8, 3, -1, 10]\n\n",
        expectedBehavior:"Must define function, check range 1-10, print status for each, return list of valid guesses only"
      },
      { id:"ch9_r5", name:"Game Assembly", xpReward:17,
        npc:"pixel", npcDialogue:[
          "Time to put it ALL together — loop, random, score, validation.",
          "A real game combines every piece you've learned.",
          "This is what separates coders from game designers!"
        ],
        task:"Build a High-Low card game:\n1. Import random\n2. Function draw_card() returns randint(1, 13)\n3. Draw a card, show it. Draw another — player guesses 'high' or 'low'\n4. Track score over 5 rounds using simulated guesses\n5. Print round results and final score\n\nSimulate: guesses = [\"high\", \"low\", \"high\", \"high\", \"low\"]\nUse random.seed(42) for reproducible results.",
        hints:["random.seed(42) at the start for consistent output","first = draw_card() then second = draw_card(), compare based on guess"],
        starterCode:"import random\nrandom.seed(42)\n\nguesses = [\"high\", \"low\", \"high\", \"high\", \"low\"]\n\n# draw_card function\n\n# Play 5 rounds\n",
        expectedBehavior:"Must define draw_card, use seed, loop 5 rounds, compare cards against guess, track and print score"
      },
      // --- Side Quests ---
      { id:"ch9_s1", name:"ASCII Title Screen", xpReward:13, optional:true,
        npc:"pixel", npcDialogue:["Every great game starts with a great title screen! Let's make one with print()."],
        task:"Create a function show_title(game_name) that prints:\n- A border line of 30 '=' characters\n- The game name centered with spaces\n- \"Press ENTER to start\"\n- Another border line\n\nCall it with \"DRAGON QUEST\"",
        hints:["Use '=' * 30 for the border","game_name.center(30) centers text in 30 chars"],
        starterCode:"# Title screen function\n\n",
        expectedBehavior:"Must define function with parameter, print borders, centered title, and prompt"
      },
      { id:"ch9_s2", name:"Countdown Timer", xpReward:13, optional:true,
        npc:"pixel", npcDialogue:["Sometimes games need dramatic pauses. Let's build a countdown!"],
        task:"Write countdown(n) that:\n1. Prints numbers from n down to 1, each on its own line\n2. Prints \"🚀 BLAST OFF!\" at the end\n3. Return the string \"launched\"\n\nCall countdown(5) and print the return value.",
        hints:["for i in range(n, 0, -1): print(i)","Return after the loop ends"],
        starterCode:"# Countdown function\n\n",
        expectedBehavior:"Must define function, count down from n to 1, print BLAST OFF, return string"
      },
      { id:"ch9_s3", name:"Menu System", xpReward:13, optional:true,
        npc:"pixel", npcDialogue:["Game menus let players choose what to do. They're just while loops with choices!"],
        task:"Build a menu system:\n1. choices = [\"1\", \"2\", \"1\", \"3\"]\n2. Loop through choices, for each one:\n   - If \"1\": print \"⚔️ Fight!\"\n   - If \"2\": print \"🎒 Inventory\"\n   - If \"3\": print \"👋 Goodbye!\" and break\n   - Else: print \"Unknown choice\"",
        hints:["for choice in choices: if choice == '1': ...","Don't forget the break on choice '3'"],
        starterCode:"choices = [\"1\", \"2\", \"1\", \"3\"]\n\n# Menu loop\n",
        expectedBehavior:"Must loop through choices, handle each option with if/elif, break on 3"
      },
    ],
    boss:{
      id:"ch9_boss", name:"Rock Paper Scissors", xpReward:60,
      npc:"pixel",
      npcDialogue:[
        "This is it — your first REAL game!",
        "Rock Paper Scissors. The classic. Simple rules, but building it uses EVERYTHING.",
        "Game loop, random AI, win logic, score tracking — all in one program.",
        "Show me you can build a game, not just write code!"
      ],
      narrative:"Pixel's screen flickers with excitement:\n\n\"A coder who can build games? Now THAT'S power.\"",
      task:"Build Rock Paper Scissors:\n1. import random\n2. Function get_winner(player, computer) that returns \"player\", \"computer\", or \"tie\"\n3. Simulate 5 rounds: player_moves = [\"rock\",\"paper\",\"scissors\",\"rock\",\"paper\"]\n4. Computer picks random.choice([\"rock\",\"paper\",\"scissors\"]) each round\n5. Track wins for each side\n6. Print each round: moves and who won\n7. Print final score and overall champion\n\nUse random.seed(42)",
      hints:["Rock beats scissors, scissors beats paper, paper beats rock","if player == computer: return 'tie' elif (player=='rock' and computer=='scissors') or ..."],
      starterCode:"import random\nrandom.seed(42)\n\nplayer_moves = [\"rock\", \"paper\", \"scissors\", \"rock\", \"paper\"]\n\n# get_winner function\n\n# Play 5 rounds\n\n# Final results\n",
      expectedBehavior:"Must import random, use seed, define get_winner with full RPS logic, loop 5 rounds, track scores, print per-round and final results"
    },
  },
  { id:"ch10", name:"The Colosseum", subtitle:"Architect complex games",
    icon:"🏟️", requiredXp:1240, scene:"colosseum",
    mapPosition:{x:42,y:88},
    rooms:[
      { id:"ch10_r1", name:"Function Architecture", xpReward:18,
        npc:"champion", npcDialogue:[
          "Welcome to The Colosseum, young architect. I am the Champion.",
          "Small games can be one function. Real games need ARCHITECTURE.",
          "We break games into pieces: setup(), play_round(), show_results().",
          "Each function does ONE job. Together, they build something great."
        ],
        task:"Refactor this flat quiz into functions:\n1. setup_quiz() — returns a list of 3 question dicts: {\"q\":..., \"a\":...}\n2. ask_question(question) — prints the question, returns the correct answer\n3. run_quiz(questions) — loops through questions, tracks score, returns it\n4. show_results(score, total) — prints score and percentage\n\nCall them in order to run the quiz.",
        hints:["def setup_quiz(): return [{\"q\": \"2+2?\", \"a\": \"4\"}, ...]","run_quiz loops, calls ask_question for each, compares with stored answer"],
        starterCode:"# Quiz Game — broken into functions\n\n# 1. setup_quiz()\n\n# 2. ask_question(question)\n\n# 3. run_quiz(questions)\n\n# 4. show_results(score, total)\n\n# Run the game\n",
        expectedBehavior:"Must define 4 functions, setup returns list of dicts, ask_question prints and returns answer, run_quiz loops and scores, show_results prints stats"
      },
      { id:"ch10_r2", name:"Data-Driven Design", xpReward:17,
        npc:"champion", npcDialogue:[
          "Hard-coding game content makes brittle games.",
          "Smart designers store content in DATA STRUCTURES.",
          "A list of dicts can hold questions, items, enemies — anything!",
          "Change the data, change the game. The code stays the same."
        ],
        task:"Create a trivia game engine:\n1. Define questions as a list of dicts:\n   [{\"q\":\"Capital of France?\",\"choices\":[\"London\",\"Paris\",\"Berlin\"],\"answer\":1}, ...] (3 questions)\n2. Function display_question(q, num) prints the question and numbered choices\n3. Function check_answer(q, player_choice) returns True/False\n4. Loop through questions with simulated answers = [1, 0, 2]\n5. Print results for each and final score",
        hints:["Each dict has 'q', 'choices' list, and 'answer' (index of correct)","for i, choice in enumerate(q['choices']): print(f'{i}. {choice}')"],
        starterCode:"# Trivia engine\nquestions = [\n    # Add 3 question dicts\n]\n\nsimulated_answers = [1, 0, 2]\n\n# display_question and check_answer functions\n\n# Run the game\n",
        expectedBehavior:"Must create list of 3 question dicts with choices, define display and check functions, loop with simulated answers, print per-question and final results"
      },
      { id:"ch10_r3", name:"Inventory Systems", xpReward:17,
        npc:"champion", npcDialogue:[
          "Every RPG hero has a backpack. In code, that's a DICTIONARY.",
          "Keys are item names, values are quantities.",
          "add_item, remove_item, show_inventory — three functions, infinite adventures."
        ],
        task:"Build an inventory system:\n1. inventory = {} (empty dict)\n2. add_item(inv, item, qty=1) — adds item, stacks if exists\n3. remove_item(inv, item, qty=1) — removes qty, deletes key if 0\n4. show_inventory(inv) — prints each item and count, or \"Empty!\" \n5. Test:\n   - Add 3 potions, 1 sword, 2 arrows\n   - Show inventory\n   - Remove 1 potion, remove 2 arrows\n   - Show inventory again",
        hints:["if item in inv: inv[item] += qty else: inv[item] = qty","After removing, check if inv[item] <= 0: del inv[item]"],
        starterCode:"# Inventory system\ninventory = {}\n\n# add_item, remove_item, show_inventory\n\n# Test it\n",
        expectedBehavior:"Must define 3 functions, add stacks correctly, remove decrements and deletes at 0, show formats nicely, test sequence produces correct output"
      },
      { id:"ch10_r4", name:"Choice Trees", xpReward:17,
        npc:"champion", npcDialogue:[
          "The best games give players CHOICES that matter.",
          "Each choice leads to different outcomes — branching paths!",
          "In code, that's nested if/elif blocks or function calls based on choice."
        ],
        task:"Write a mini adventure scene:\n1. Function scene_start() — print a description, return player's choice (\"left\" or \"right\")\n2. Function scene_left() — print cave description, return choice (\"fight\" or \"sneak\")\n3. Function scene_right() — print forest description, return \"treasure found!\"\n4. Run the adventure using simulated choices = [\"left\", \"fight\"]\n\nPrint the story text and final outcome.",
        hints:["Each function prints the scene text and returns the next choice","Use choices.pop(0) to simulate getting the next input"],
        starterCode:"choices = [\"left\", \"fight\"]\n\n# Scene functions\n\n# Run the adventure\n",
        expectedBehavior:"Must define scene functions that print descriptions, chain choices together, produce narrative output based on simulated choices"
      },
      { id:"ch10_r5", name:"Game State", xpReward:17,
        npc:"champion", npcDialogue:[
          "Complex games track EVERYTHING in one state dict.",
          "HP, inventory, location, score — all in one place.",
          "Functions read and update the state. The dict IS the game."
        ],
        task:"Build an RPG state system:\n1. Create player state: {\"name\":\"Hero\",\"hp\":100,\"attack\":15,\"inventory\":[],\"gold\":0}\n2. Function take_damage(state, amount) — reduce hp, print result, return True if alive\n3. Function find_loot(state, item, gold) — append item, add gold, print what was found\n4. Function show_status(state) — print all stats formatted\n5. Simulate: take 30 damage, find \"Iron Sword\" + 50 gold, take 25 damage, show status",
        hints:["state['hp'] -= amount, then check state['hp'] > 0","state['inventory'].append(item), state['gold'] += gold"],
        starterCode:"# RPG State System\nplayer = {\n    \"name\": \"Hero\",\n    \"hp\": 100,\n    \"attack\": 15,\n    \"inventory\": [],\n    \"gold\": 0\n}\n\n# Functions\n\n# Simulate gameplay\n",
        expectedBehavior:"Must create state dict, define 3 functions that modify state correctly, run simulation sequence, show_status prints formatted output"
      },
      // --- Side Quests ---
      { id:"ch10_s1", name:"Loot Tables", xpReward:13, optional:true,
        npc:"champion", npcDialogue:["Rare loot makes games addictive. Let's build a drop system with weighted randomness!"],
        task:"Build a loot system:\n1. loot_table = [{\"name\":\"Gold Coin\",\"rarity\":\"common\"}, {\"name\":\"Health Potion\",\"rarity\":\"common\"}, {\"name\":\"Magic Ring\",\"rarity\":\"rare\"}, {\"name\":\"Dragon Scale\",\"rarity\":\"legendary\"}]\n2. Function get_drop(table) — common=60%, rare=30%, legendary=10% chance. Use random.randint(1,100)\n3. Simulate 10 drops with random.seed(42), print each and count by rarity",
        hints:["roll = random.randint(1,100); if roll <= 60: pick from common items","Filter table by rarity, then random.choice from that filtered list"],
        starterCode:"import random\nrandom.seed(42)\n\nloot_table = [\n    # Add items with rarity\n]\n\n# get_drop function\n\n# Simulate 10 drops\n",
        expectedBehavior:"Must define loot table with rarities, function uses randint for weighted selection, simulate 10 drops, count and print results"
      },
      { id:"ch10_s2", name:"Enemy Generator", xpReward:13, optional:true,
        npc:"champion", npcDialogue:["Random enemies keep games fresh. Let's build a generator that creates unique foes!"],
        task:"Build a random enemy generator:\n1. Names: [\"Goblin\",\"Skeleton\",\"Troll\",\"Ghost\"]\n2. Function generate_enemy(level) returns a dict: random name, hp=level*20+randint(1,10), attack=level*3+randint(1,5)\n3. Generate 5 enemies at level 3 with random.seed(42)\n4. Print each enemy's stats formatted",
        hints:["return {\"name\": random.choice(names), \"hp\": level*20+random.randint(1,10), ...}"],
        starterCode:"import random\nrandom.seed(42)\n\nnames = [\"Goblin\", \"Skeleton\", \"Troll\", \"Ghost\"]\n\n# generate_enemy function\n\n# Generate and print 5 enemies\n",
        expectedBehavior:"Must define generate_enemy returning dict with random name and level-scaled stats, generate 5 and print"
      },
      { id:"ch10_s3", name:"High Score Table", xpReward:13, optional:true,
        npc:"champion", npcDialogue:["What's a game without a leaderboard? Let's build a high score system!"],
        task:"Build a high score system:\n1. scores = [] (list of dicts: {\"name\":..., \"score\":...})\n2. Function add_score(table, name, score) — adds and sorts by score descending\n3. Function show_top(table, n=3) — prints top n scores formatted as a leaderboard\n4. Add: (\"Alice\",850), (\"Bob\",1200), (\"Carol\",650), (\"Dave\",950), (\"Eve\",1100)\n5. Show top 3",
        hints:["table.sort(key=lambda x: x['score'], reverse=True)","Print with enumerate for ranking: 1st, 2nd, 3rd"],
        starterCode:"# High Score System\nscores = []\n\n# add_score and show_top functions\n\n# Add scores and show leaderboard\n",
        expectedBehavior:"Must define add_score that appends and sorts, show_top prints top n formatted, demonstrate with 5 entries"
      },
    ],
    boss:{
      id:"ch10_boss", name:"The Text Adventure", xpReward:70,
      npc:"champion",
      npcDialogue:[
        "You've mastered every tool in the game builder's arsenal.",
        "Functions. Data structures. State management. Branching paths.",
        "Now build a COMPLETE TEXT ADVENTURE. Multiple rooms, inventory, combat, and a win condition.",
        "This is the ultimate test. Build a game that someone else would actually want to play.",
        "Show me a CHAMPION."
      ],
      narrative:"The Champion stands in the center of the Colosseum, arms raised:\n\n\"Build something worthy of this arena.\"",
      task:"Build a text adventure:\n1. rooms = {\"start\":{\"desc\":\"A dark cave entrance...\",\"exits\":{\"north\":\"hall\"}}, \"hall\":{...}, \"treasure\":{...}} (3+ rooms)\n2. player = {\"location\":\"start\", \"inventory\":[], \"hp\":50}\n3. Function look(rooms, player) — print current room description\n4. Function move(rooms, player, direction) — move player if exit exists\n5. Function pickup(player, item) — add item to inventory\n6. Simulate a playthrough: actions = [\"look\",\"north\",\"look\",\"pickup sword\",\"north\",\"look\"]\n7. Print the story as it unfolds",
      hints:["rooms is a dict of dicts. Each room has 'desc' and 'exits' dict","For move: direction in rooms[player['location']]['exits'] checks if exit exists"],
      starterCode:"# Text Adventure\nrooms = {\n    # Define 3+ rooms with desc and exits\n}\n\nplayer = {\"location\": \"start\", \"inventory\": [], \"hp\": 50}\n\n# look, move, pickup functions\n\n# Simulate playthrough\nactions = [\"look\", \"north\", \"look\", \"pickup sword\", \"north\", \"look\"]\n",
      expectedBehavior:"Must define rooms dict with 3+ rooms, player state dict, look/move/pickup functions, simulate actions sequence, print narrative output"
    },
  },
  // ═══════════════════════════════════════════════════════════════
  // ACT 4: THE ROVER BAY — Robotics & Pybricks
  // ═══════════════════════════════════════════════════════════════
  { id:"ch11", name:"The Dry Dock", subtitle:"Robot programming fundamentals",
    icon:"🔧", requiredXp:1400, scene:"drydock",
    mapPosition:{x:68,y:82},
    rooms:[
      { id:"ch11_r1", name:"Hardware Blueprint", xpReward:18,
        npc:"wrench", npcDialogue:[
          "Welcome to The Dry Dock! I'm Wrench — I build robots from code.",
          "Before a robot moves, it needs a BLUEPRINT — we tell Python exactly what's plugged in where.",
          "Motors, sensors, hub — each gets a name and a port. Just like variables!",
          "We can't run real Pybricks here, but we'll SIMULATE it. Same patterns, same thinking."
        ],
        task:"Create a robot hardware blueprint using classes and dicts:\n1. Create a dict hub = {\"name\": \"PrimeHub\", \"top_side\": \"Z\", \"front_side\": \"Y\"}\n2. Create motor dicts: left_motor = {\"port\": \"D\", \"direction\": \"counterclockwise\"} and right_motor = {\"port\": \"C\", \"direction\": \"clockwise\"}\n3. Create drive_base = {\"left\": left_motor, \"right\": right_motor, \"wheel_diameter\": 62.4, \"axle_track\": 80}\n4. Print each component's name and port/settings",
        hints:["Each hardware piece is a dict with its configuration","drive_base references the motor dicts: drive_base['left']['port'] gives 'D'"],
        starterCode:"# Robot Hardware Blueprint\n# (Simulating Pybricks setup with dicts)\n\n# 1. Hub\n\n# 2. Motors\n\n# 3. Drive Base\n\n# 4. Print the blueprint\n",
        expectedBehavior:"Must create hub dict, two motor dicts with port and direction, drive_base dict referencing motors with wheel_diameter and axle_track, print all settings"
      },
      { id:"ch11_r2", name:"Basic Movement", xpReward:17,
        npc:"wrench", npcDialogue:[
          "A robot needs to MOVE! The two key commands are straight() and turn().",
          "straight(distance) drives forward in millimeters. Negative = backwards.",
          "turn(angle) rotates in degrees. Positive = right, negative = left.",
          "Let's simulate a robot navigating a course!"
        ],
        task:"Simulate a robot navigating an L-shaped course:\n1. Create a function robot_straight(distance) that prints \"Driving [distance]mm [forward/backward]\"\n2. Create a function robot_turn(angle) that prints \"Turning [angle]° [right/left]\"\n3. Navigate: forward 200mm, turn right 90°, forward 150mm, turn left 45°, backward 100mm\n4. Track total_distance (absolute values) and print it at the end",
        hints:["'forward' if distance > 0 else 'backward'","total_distance += abs(distance) for each straight call"],
        starterCode:"# Robot Movement Simulator\ntotal_distance = 0\n\n# Movement functions\n\n# Navigate the course\n",
        expectedBehavior:"Must define robot_straight and robot_turn functions with correct direction labels, execute the 5-move sequence, track and print total distance"
      },
      { id:"ch11_r3", name:"Arm Control", xpReward:17,
        npc:"wrench", npcDialogue:[
          "Robots don't just drive — they have ARMS for grabbing, lifting, pushing!",
          "An arm motor spins a set number of degrees at a set speed.",
          "Just like your Donut Sharks code: right_arm(degrees, speed=600).",
          "Default parameters make these helpers super clean."
        ],
        task:"Build arm control functions:\n1. right_arm(degrees, speed=600) — prints \"Right arm: [degrees]° at speed [speed]\"\n2. left_arm(degrees, speed=600) — prints \"Left arm: [degrees]° at speed [speed]\"\n3. Execute this sequence:\n   - right_arm(-240) (grab grass)\n   - left_arm(110, speed=250) (lift minecart slowly)\n   - left_arm(40, speed=100) (nudge it up)\n   - right_arm(195, speed=800) (drop off flag fast)\n4. Print how many arm movements were made",
        hints:["def right_arm(degrees, speed=600): — the speed=600 is the default","Count movements with a variable that increments each call"],
        starterCode:"# Arm Control Functions\nmovements = 0\n\n# Define arm functions\n\n# Execute the mission sequence\n",
        expectedBehavior:"Must define both arm functions with default speed parameter, execute all 4 movements with correct overrides, count and print total movements"
      },
      { id:"ch11_r4", name:"Speed Profiles", xpReward:17,
        npc:"wrench", npcDialogue:[
          "Robots need different speeds for different situations.",
          "Pushing a heavy object? Go SLOW. Crossing open field? Go FAST.",
          "We store speed settings in DICTIONARIES — just like your team's SPEED_NORMAL and SPEED_FAST!",
          "One function applies any profile. Clean and reusable."
        ],
        task:"Build a speed profile system:\n1. Define 4 speed profiles as dicts:\n   SPEED_NORMAL = {\"straight\": 400, \"turn\": 250}\n   SPEED_FAST = {\"straight\": 600, \"turn\": 350}\n   SPEED_SLOW = {\"straight\": 150, \"turn\": 100}\n   SPEED_PUSHING = {\"straight\": 250, \"turn\": 150}\n2. Function apply_speed(profile) that prints \"Speed set: straight=[x], turn=[y]\"\n3. Function drive_segment(distance, turn, profile) that applies the speed, then prints the drive and turn\n4. Execute: fast 500mm, normal turn 45°, pushing 110mm, slow turn -90°",
        hints:["apply_speed(profile): print(f\"Speed set: straight={profile['straight']}, turn={profile['turn']}\")","drive_segment calls apply_speed first, then simulates the movement"],
        starterCode:"# Speed Profile System\n\n# Define profiles\n\n# Functions\n\n# Execute mission segments\n",
        expectedBehavior:"Must define 4 speed profile dicts, apply_speed function, drive_segment that applies then moves, execute 4-segment mission with different profiles"
      },
      { id:"ch11_r5", name:"Mission Structure", xpReward:17,
        npc:"wrench", npcDialogue:[
          "In competition, you have LAUNCH and END_RUN every time.",
          "launch() resets the gyro, resets arms, beeps to confirm ready.",
          "end_run() stops driving and signals success.",
          "Every Run follows the pattern: launch → do stuff → end_run. Clean and reliable."
        ],
        task:"Build a complete mission framework:\n1. launch() — prints reset gyro, reset arms, prints \"🟡 Ready!\"\n2. end_run() — prints \"🟢 Run complete!\" \n3. A mission function Run1() that:\n   - Calls launch()\n   - Drives forward 690mm (fast)\n   - Turns right 45°\n   - Drives forward 130mm\n   - Turns left 90°\n   - Drives forward 90mm\n   - Grabs with right arm (-240°)\n   - Calls end_run()\n4. Call Run1()",
        hints:["launch() and end_run() are simple print functions that wrap setup/teardown","Run1 calls launch(), then a sequence of drives/turns/arms, then end_run()"],
        starterCode:"# Mission Framework\n# (Simulating the Donut Sharks Run1 structure)\n\n# Helper functions\n\n# Run1 mission\n\n# Execute!\n",
        expectedBehavior:"Must define launch and end_run helpers, define Run1 with correct sequence of drives/turns/arm, call launch at start and end_run at end"
      },
      // --- Side Quests ---
      { id:"ch11_s1", name:"Unit Converter", xpReward:13, optional:true,
        npc:"wrench", npcDialogue:["Pybricks uses millimeters, but we think in centimeters. Let's build a converter!"],
        task:"Write functions:\n1. cm_to_mm(cm) — returns cm * 10\n2. inches_to_mm(inches) — returns round(inches * 25.4)\n3. Convert and print: 55cm, 14cm, 3.5cm, 6 inches\n4. Print a formatted table of all conversions",
        hints:["round() rounds to nearest integer","Print with f-string alignment: f'{val:>8}'"],
        starterCode:"# Unit converter for robotics\n\n",
        expectedBehavior:"Must define both converter functions, convert all values, print formatted table"
      },
      { id:"ch11_s2", name:"Motor Logger", xpReward:13, optional:true,
        npc:"wrench", npcDialogue:["Good teams log every motor command. Let's build a command logger!"],
        task:"Build a motor logger:\n1. log = [] (list of dicts)\n2. Function log_command(log, motor, action, value) — appends {\"motor\":motor, \"action\":action, \"value\":value} to log\n3. Log these: left_motor straight 400, right_motor straight 400, left_arm rotate -240, right_arm rotate 195\n4. Print each log entry formatted, and total commands",
        hints:["log.append({'motor': motor, 'action': action, 'value': value})"],
        starterCode:"# Motor Command Logger\nlog = []\n\n",
        expectedBehavior:"Must define log_command, log 4 commands as dicts, print formatted log and count"
      },
      { id:"ch11_s3", name:"Angle Calculator", xpReward:13, optional:true,
        npc:"wrench", npcDialogue:["Robots need to end up facing the right direction. Let's track heading!"],
        task:"Build a heading tracker:\n1. heading = 0 (starting direction in degrees)\n2. Function turn(heading, angle) — adds angle, wraps to 0-359 range using % 360, returns new heading\n3. Execute: turn right 90, turn right 90, turn left 45, turn right 180, turn left 270\n4. Print heading after each turn and final heading",
        hints:["new_heading = (heading + angle) % 360","Use % 360 to wrap — e.g. -45 % 360 = 315"],
        starterCode:"# Heading Tracker\nheading = 0\n\n",
        expectedBehavior:"Must define turn function with modulo wrapping, execute all 5 turns, print heading after each, show final heading"
      },
    ],
    boss:{
      id:"ch11_boss", name:"The First Run", xpReward:60,
      npc:"wrench",
      npcDialogue:[
        "Time to build a COMPLETE competition run. Everything together.",
        "Hardware setup. Speed profiles. launch() and end_run(). Arm helpers. A full mission.",
        "This is exactly what your Donut Sharks code looks like — but now YOU understand every line.",
        "Build it from scratch. Show me a run worthy of the mat."
      ],
      narrative:"Wrench clangs a wrench against the dry dock railing:\n\n\"A robot is only as good as the code in its brain. Let's see yours.\"",
      task:"Build a complete competition run:\n1. Define speed profiles: SPEED_FAST and SPEED_NORMAL (dicts with 'straight' and 'turn' keys)\n2. Define apply_speed(profile) that prints the speeds being set\n3. Define launch() and end_run() with status prints\n4. Define right_arm(degrees, speed=600) and left_arm(degrees, speed=600) helpers\n5. Define Run1():\n   - launch()\n   - apply fast speed, drive forward 690mm\n   - turn right 45°, drive 130mm\n   - turn left 90°, drive 90mm\n   - right_arm(-240) to grab\n   - apply normal speed, drive backward 350mm\n   - end_run()\n6. Call Run1()",
      hints:["Define all helpers first, then Run1 calls them in order","apply_speed just prints — in real Pybricks it would call drive_base.settings()"],
      starterCode:"# Competition Run — Full Mission\n\n# Speed profiles\n\n# Helper functions\n\n# Run1 — Full mission\n\n# Go!\n",
      expectedBehavior:"Must define 2 speed profiles as dicts, apply_speed/launch/end_run/right_arm/left_arm helpers, Run1 function with full sequence using all helpers, call Run1"
    },
  },
  { id:"ch12", name:"The Launch Pad", subtitle:"Sensors and competition code",
    icon:"🚀", requiredXp:1580, scene:"launchpad",
    mapPosition:{x:90,y:72},
    rooms:[
      { id:"ch12_r1", name:"Sensor Reading", xpReward:18,
        npc:"navigator", npcDialogue:[
          "Welcome to The Launch Pad. I'm Navigator — I guide robots through missions.",
          "A robot without sensors is BLIND. Color sensors see lines, edges, colors.",
          "The key reading is REFLECTION — a number from 0 (black) to 100 (white).",
          "We use a threshold: below 22 means 'on the black line'. Above means 'white mat'."
        ],
        task:"Build a sensor simulator:\n1. BLACK_LINE = 22 (threshold constant)\n2. Function read_sensor(value) that returns \"black\" if value < BLACK_LINE, else \"white\"\n3. Function check_sensors(left_val, right_val) that prints the status of both sensors\n4. Test with these readings:\n   (15, 60) → left on line, right off\n   (55, 18) → left off, right on line\n   (12, 10) → both on line\n   (70, 80) → both off line",
        hints:["read_sensor returns 'black' or 'white' based on the threshold","check_sensors calls read_sensor for each side and prints results"],
        starterCode:"# Sensor Simulator\nBLACK_LINE = 22\n\n# Functions\n\n# Test with sample readings\nreadings = [(15, 60), (55, 18), (12, 10), (70, 80)]\n",
        expectedBehavior:"Must define BLACK_LINE constant, read_sensor with threshold check, check_sensors printing both sides, test all 4 reading pairs with correct results"
      },
      { id:"ch12_r2", name:"Drive Until Line", xpReward:17,
        npc:"navigator", npcDialogue:[
          "The most basic sensor move: drive forward until you SEE a line.",
          "It's a while loop! Keep driving while the sensor reads white.",
          "The moment it reads black — STOP. You've found your line.",
          "This is the building block of all line-based navigation."
        ],
        task:"Simulate 'drive until line detected':\n1. sensor_readings = [80, 75, 60, 55, 40, 18, 10] (simulating approach to a line)\n2. BLACK_LINE = 22\n3. Function drive_until_line(readings, threshold) that:\n   - Loops through readings (each is one 'tick' of driving)\n   - Prints \"Driving... sensor: [value] (white)\" for each white reading\n   - When it finds black: prints \"LINE DETECTED! sensor: [value] — Stopping!\"\n   - Returns the number of ticks it drove\n4. Call it and print how many ticks it took",
        hints:["for i, val in enumerate(readings): ... if val < threshold: stop","Return the count when you hit black, not the total list length"],
        starterCode:"# Drive Until Line\nBLACK_LINE = 22\nsensor_readings = [80, 75, 60, 55, 40, 18, 10]\n\n",
        expectedBehavior:"Must define function that loops through readings, prints driving status for white, detects and stops at black, returns tick count"
      },
      { id:"ch12_r3", name:"Two-Sensor Logic", xpReward:17,
        npc:"navigator", npcDialogue:[
          "One sensor finds lines. TWO sensors let you ALIGN to them.",
          "Think about it: if left sees black but right sees white, you're crooked!",
          "Four cases: both black (aligned!), left only (turn right), right only (turn left), both white (keep going).",
          "This is the CORE of your team's square_on_line() function!"
        ],
        task:"Build a two-sensor alignment analyzer:\n1. BLACK_LINE = 22\n2. Function analyze_alignment(left_val, right_val) that returns:\n   - \"aligned\" if both < BLACK_LINE\n   - \"turn_right\" if only left < BLACK_LINE\n   - \"turn_left\" if only right < BLACK_LINE\n   - \"drive_forward\" if both >= BLACK_LINE\n3. Function print_action(action) that prints what the robot should do\n4. Test with: (10,12), (15,60), (55,18), (70,80), (20,8), (45,50)\n5. Count how many readings were \"aligned\"",
        hints:["if left < BLACK and right < BLACK: return 'aligned'","Track aligned_count, increment when action is 'aligned'"],
        starterCode:"# Two-Sensor Alignment Analyzer\nBLACK_LINE = 22\n\nreadings = [(10,12), (15,60), (55,18), (70,80), (20,8), (45,50)]\n\n# Functions\n\n# Test all readings\n",
        expectedBehavior:"Must define analyze_alignment with all 4 cases correct, print_action for display, test all 6 readings, count and print aligned total"
      },
      { id:"ch12_r4", name:"Square On Line", xpReward:17,
        npc:"navigator", npcDialogue:[
          "Now the BIG one. square_on_line() — the function your team borrowed.",
          "After this room, you'll understand every line of it. Maybe even improve it!",
          "Phase 1: Drive forward until ONE sensor hits the line.",
          "Phase 2: Wiggle — turn toward the lagging sensor until BOTH see black.",
          "It's a while loop with cases inside. Let's build it step by step."
        ],
        task:"Simulate square_on_line():\n1. Sensor data (list of tuples simulating the approach + alignment):\n   approach = [(80,80),(70,75),(50,60),(18,55)] — Phase 1: drive until one hits\n   alignment = [(18,55),(18,40),(18,25),(15,12)] — Phase 2: wiggle until both hit\n2. Phase 1: Loop through approach. Print \"Driving...\" for each. Stop when ANY sensor < 22.\n3. Phase 2: Loop through alignment. For each reading, determine action (turn_right/turn_left/aligned). Print the action. Stop when BOTH < 22.\n4. Print \"✅ Squared on line!\" when aligned.\n5. Print total ticks for each phase.",
        hints:["Phase 1: while left >= BLACK and right >= BLACK (both white, keep going)","Phase 2: while True, check all 4 cases, break when both are black"],
        starterCode:"# Square On Line — Simulated\nBLACK_LINE = 22\n\napproach = [(80,80), (70,75), (50,60), (18,55)]\nalignment = [(18,55), (18,40), (18,25), (15,12)]\n\n# Phase 1: Drive until one sensor finds line\n\n# Phase 2: Wiggle until both sensors on line\n\n",
        expectedBehavior:"Must implement both phases correctly, Phase 1 stops when any sensor < 22, Phase 2 stops when both < 22, print actions and tick counts for each phase"
      },
      { id:"ch12_r5", name:"Multi-Run Menu", xpReward:17,
        npc:"navigator", npcDialogue:[
          "Competition robots have MULTIPLE runs — each launched from a menu.",
          "The menu is a while True loop: display the current run number, wait for button press, execute.",
          "Left/Right to switch programs. Center to launch. Auto-advance after each run.",
          "Your team's menu handles 4 runs. Let's build one!"
        ],
        task:"Build a competition menu system:\n1. current_program = 1, max_programs = 4\n2. Function show_menu(num) — prints \"=== Program [num] ===\"\n3. Function run_program(num) — prints \"🚀 Launching Run [num]...\" then \"✅ Run [num] complete!\"\n4. Simulate button presses: buttons = [\"right\",\"right\",\"center\",\"center\",\"left\",\"center\",\"center\"]\n5. For each button:\n   - \"left\": decrement (wrap 1→4)\n   - \"right\": increment (wrap 4→1)\n   - \"center\": launch current run, then auto-advance\n6. Show menu after each button press",
        hints:["Wrap: if current < 1: current = max; if current > max: current = 1","After center: run the program, THEN increment with wrap"],
        starterCode:"# Competition Menu System\ncurrent_program = 1\nmax_programs = 4\n\nbuttons = [\"right\", \"right\", \"center\", \"center\", \"left\", \"center\", \"center\"]\n\n# Functions\n\n# Process button presses\n",
        expectedBehavior:"Must define show_menu and run_program functions, process all button presses with correct increment/decrement/wrap logic, auto-advance after center, show menu each step"
      },
      // --- Side Quests ---
      { id:"ch12_s1", name:"Gyro Tracker", xpReward:13, optional:true,
        npc:"navigator", npcDialogue:["The gyro tracks your robot's heading. Let's simulate gyro-based turning!"],
        task:"Build a gyro turn simulator:\n1. gyro_angle = 0\n2. Function gyro_turn(target, readings) that simulates turning:\n   - readings is a list of gyro values as the robot turns\n   - Print each reading\n   - Stop when reading reaches or passes target\n   - Return final angle\n3. Test: gyro_turn(90, [0, 15, 32, 48, 65, 78, 91, 95])\n   and gyro_turn(-45, [0, -10, -22, -38, -46, -50])",
        hints:["For positive targets: stop when reading >= target. For negative: stop when reading <= target"],
        starterCode:"# Gyro Turn Simulator\n\n",
        expectedBehavior:"Must define gyro_turn that handles both positive and negative targets, stops at correct reading, returns final angle"
      },
      { id:"ch12_s2", name:"Mission Timer", xpReward:13, optional:true,
        npc:"navigator", npcDialogue:["Competition runs have a 2:30 time limit. Let's build a mission timer!"],
        task:"Build a mission timer:\n1. MATCH_TIME = 150 (seconds = 2:30)\n2. run_times = [28, 35, 42, 31] (seconds per run)\n3. Function format_time(seconds) — returns \"M:SS\" format\n4. Function can_fit_run(time_left, run_time, buffer=5) — returns True if run fits with buffer\n5. Simulate: for each run, check if it fits, print status, subtract time\n6. Print total time used and remaining",
        hints:["format_time: f'{seconds//60}:{seconds%60:02d}'","can_fit_run: time_left >= run_time + buffer"],
        starterCode:"# Mission Timer\nMATCH_TIME = 150\nrun_times = [28, 35, 42, 31]\n\n",
        expectedBehavior:"Must define format_time with M:SS format, can_fit_run with buffer check, simulate all runs tracking time, print summary"
      },
      { id:"ch12_s3", name:"Calibration Tool", xpReward:13, optional:true,
        npc:"navigator", npcDialogue:["Sensor values change with lighting! Good teams calibrate. Let's build a calibrator!"],
        task:"Build a sensor calibrator:\n1. white_samples = [78, 82, 80, 79, 81] (readings on white mat)\n2. black_samples = [12, 15, 10, 14, 11] (readings on black line)\n3. Function average(samples) — returns the mean\n4. Function calibrate(white, black) — returns threshold as midpoint between averages\n5. Print white avg, black avg, and recommended threshold\n6. Test: check if readings [20, 45, 8, 60] are \"black\" or \"white\" using your threshold",
        hints:["average: sum(samples) / len(samples)","threshold = (white_avg + black_avg) / 2"],
        starterCode:"# Sensor Calibration Tool\nwhite_samples = [78, 82, 80, 79, 81]\nblack_samples = [12, 15, 10, 14, 11]\n\n",
        expectedBehavior:"Must define average and calibrate functions, compute correct threshold from midpoint, test 4 readings against threshold"
      },
    ],
    boss:{
      id:"ch12_boss", name:"Competition Ready", xpReward:70,
      npc:"navigator",
      npcDialogue:[
        "This is the ultimate test. Build a COMPLETE competition program.",
        "Hardware blueprint. Speed profiles. Helper functions. Sensor logic. A full run. A menu.",
        "Every pattern your Donut Sharks use — but now YOU wrote it all from scratch.",
        "When you finish this, you won't need to borrow code anymore.",
        "Launch when ready, pilot."
      ],
      narrative:"Navigator's control screens glow with mission telemetry:\n\n\"Every line of code is a decision. Make them count.\"",
      task:"Build a complete competition framework:\n1. BLACK_LINE = 22, speed profiles SPEED_FAST and SPEED_SLOW as dicts\n2. apply_speed(profile), launch(), end_run() helpers\n3. right_arm(deg, speed=600), left_arm(deg, speed=600) helpers\n4. square_on_line(approach_data, align_data) — Phase 1: drive until one sensor < BLACK_LINE, Phase 2: wiggle until both < BLACK_LINE. Print each phase.\n5. Run1() — uses launch, apply_speed, at least 3 drive/turn moves, one arm move, end_run\n6. Run2() — uses launch, square_on_line with test data, at least 2 moves after, end_run\n7. Menu: process buttons = [\"center\", \"right\", \"center\"] — launch Run1, advance, skip, launch Run3 (print \"Run 3 not implemented\")\n\nTest data for square_on_line:\napproach = [(80,80),(60,70),(18,50)]\nalign = [(18,50),(18,20),(14,12)]",
      hints:["Build all helpers first, then the runs, then the menu last","square_on_line has two while-style loops: one for approach, one for alignment"],
      starterCode:"# Complete Competition Program\nBLACK_LINE = 22\n\n# Speed profiles\n\n# Helper functions\n\n# square_on_line\n\n# Runs\n\n# Menu\nbuttons = [\"center\", \"right\", \"center\"]\ncurrent_program = 1\n\napproach = [(80,80),(60,70),(18,50)]\nalign = [(18,50),(18,20),(14,12)]\n",
      expectedBehavior:"Must define speed profiles, all helper functions including square_on_line with both phases, Run1 and Run2 with full structure, menu processing buttons with wrap and auto-advance"
    },
  },
];

const TROPHIES = [
  {id:"first_clear",name:"First Steps",icon:"👣",desc:"Complete your first room"},
  {id:"boss_slayer",name:"Boss Slayer",icon:"⚔️",desc:"Defeat your first boss"},
  {id:"no_hints",name:"No Peeking",icon:"🙈",desc:"Clear a room without hints"},
  {id:"streak_3",name:"On Fire",icon:"🔥",desc:"Clear 3 rooms in one session"},
  {id:"xp_100",name:"Century",icon:"💯",desc:"Earn 100 XP total"},
  {id:"xp_500",name:"Half Thousand",icon:"🏆",desc:"Earn 500 XP total"},
  {id:"act1_complete",name:"Act 1 Graduate",icon:"🎓",desc:"Complete all 5 Act 1 chapters"},
  {id:"side_quest_fan",name:"Explorer",icon:"🗺️",desc:"Complete 5 side quests"},
  {id:"xp_1000",name:"Grand Thousand",icon:"💎",desc:"Earn 1000 XP total"},
  {id:"summit",name:"Summit Climber",icon:"🏔️",desc:"Reach The Summit"},
  {id:"final_boss",name:"Code Master",icon:"👑",desc:"Defeat The Final Trial"},
  {id:"game_builder",name:"Game Builder",icon:"🎮",desc:"Defeat Rock Paper Scissors"},
  {id:"arena_champion",name:"Arena Champion",icon:"🏟️",desc:"Defeat The Text Adventure"},
  {id:"act3_grad",name:"Act 3 Graduate",icon:"🎓",desc:"Complete both Arena chapters"},
  {id:"dockmaster",name:"Dockmaster",icon:"🔧",desc:"Defeat The First Run"},
  {id:"mission_control",name:"Mission Control",icon:"🚀",desc:"Defeat Competition Ready"},
  {id:"rover_complete",name:"Rover Complete",icon:"🤖",desc:"Complete both Rover Bay chapters"},
];

// ═══════════════════════════════════════════════════════════════════
// CODEX — Concept reference (Pokédex)
// ═══════════════════════════════════════════════════════════════════

const CODEX = [
  {chapter:"ch1",title:"The Terminal",icon:"🖥️",color:ACCENT,concepts:[
    {name:"print()",cat:"output",syntax:"print(\"text\")",desc:"Display text on screen. Put strings in quotes inside the parentheses.",ex:"print(\"Hello, world!\")"},
    {name:"Variables",cat:"data",syntax:"name = value",desc:"Store data with a name. The = sign assigns the right side to the left.",ex:"score = 100\nplayer = \"Alex\""},
    {name:"f-strings",cat:"output",syntax:"f\"text {variable}\"",desc:"Embed variables directly inside strings. Put f before the quote and wrap variable names in curly braces.",ex:"name = \"Alex\"\nprint(f\"Hello, {name}!\")"},
    {name:"Expressions in f-strings",cat:"output",syntax:"f\"{expression}\"",desc:"You can put math or any expression inside the curly braces, not just variable names.",ex:"print(f\"Total: {5 + 3}\")"},
    {name:"String concatenation",cat:"strings",syntax:"str1 + str2",desc:"Join strings together using the + operator.",ex:"greeting = \"Hello\" + \" \" + \"world\""},
    {name:"Input",cat:"data",syntax:"input(\"prompt\")",desc:"Ask the user to type something. Always returns a string.",ex:"name = input(\"Your name? \")"},
  ]},
  {chapter:"ch2",title:"The Vault",icon:"🔮",color:"#9b59b6",concepts:[
    {name:"int / float / str",cat:"types",syntax:"int(x), float(x), str(x)",desc:"Convert between types. int for whole numbers, float for decimals, str for text.",ex:"age = int(\"25\")  # 25\nprice = float(\"9.99\")  # 9.99"},
    {name:"Type checking",cat:"types",syntax:"type(value)",desc:"Find out what type a value is. Returns int, float, str, etc.",ex:"print(type(42))  # <class 'int'>"},
    {name:"Math operators",cat:"operators",syntax:"+ - * / // % **",desc:"Addition, subtraction, multiply, divide, floor divide, modulo (remainder), power.",ex:"print(10 // 3)  # 3\nprint(10 % 3)   # 1\nprint(2 ** 4)   # 16"},
    {name:"String methods",cat:"strings",syntax:".upper() .lower() .replace()",desc:"Built-in operations on strings. Call with a dot after the string.",ex:"\"hello\".upper()  # \"HELLO\"\n\"Hello\".replace(\"H\",\"J\")  # \"Jello\""},
    {name:".count() / .find()",cat:"strings",syntax:".count(sub), .find(sub)",desc:"Count occurrences or find position of a substring. find() returns -1 if not found.",ex:"\"banana\".count(\"a\")  # 3\n\"hello\".find(\"ll\")  # 2"},
    {name:"len()",cat:"strings",syntax:"len(value)",desc:"Get the length of a string, list, or other collection.",ex:"print(len(\"Python\"))  # 6"},
  ]},
  {chapter:"ch3",title:"The Crossroads",icon:"🔀",color:"#2ecc71",concepts:[
    {name:"Booleans",cat:"logic",syntax:"True / False",desc:"Two special values for yes/no, on/off. Result of comparisons.",ex:"is_ready = True\nprint(5 > 3)  # True"},
    {name:"Comparison operators",cat:"logic",syntax:"== != < > <= >=",desc:"Compare values. Returns True or False. Use == for equals (not =).",ex:"print(5 == 5)  # True\nprint(3 > 7)   # False"},
    {name:"if / elif / else",cat:"logic",syntax:"if cond:\n    ...\nelif cond:\n    ...\nelse:\n    ...",desc:"Run different code based on conditions. Only the first True branch runs.",ex:"score = 85\nif score >= 90:\n    print(\"A\")\nelif score >= 80:\n    print(\"B\")\nelse:\n    print(\"C\")"},
    {name:"and / or / not",cat:"logic",syntax:"cond1 and cond2\ncond1 or cond2\nnot cond",desc:"Combine conditions. 'and' needs both True, 'or' needs either, 'not' flips.",ex:"if age >= 13 and age < 20:\n    print(\"Teenager\")"},
    {name:"Nested if",cat:"logic",syntax:"if outer:\n    if inner:\n        ...",desc:"Put an if inside another if for multi-level decisions.",ex:"if has_ticket:\n    if age < 12:\n        print(\"Child rate\")"},
  ]},
  {chapter:"ch4",title:"The Loop Tower",icon:"🔄",color:"#3498db",concepts:[
    {name:"for loop",cat:"loops",syntax:"for i in range(n):",desc:"Repeat code n times. Variable i counts from 0 to n-1.",ex:"for i in range(5):\n    print(i)  # 0,1,2,3,4"},
    {name:"range()",cat:"loops",syntax:"range(stop)\nrange(start,stop)\nrange(start,stop,step)",desc:"Generate number sequences. Stops BEFORE the stop value.",ex:"range(5)       # 0,1,2,3,4\nrange(2,6)     # 2,3,4,5\nrange(0,10,2)  # 0,2,4,6,8"},
    {name:"for char in string",cat:"loops",syntax:"for char in \"text\":",desc:"Loop through each character in a string, one at a time.",ex:"for c in \"hello\":\n    print(c)"},
    {name:"while loop",cat:"loops",syntax:"while condition:\n    ...",desc:"Repeat as long as condition is True. Make sure it eventually becomes False!",ex:"energy = 5\nwhile energy > 0:\n    print(energy)\n    energy -= 1"},
    {name:"break / continue",cat:"loops",syntax:"break  # exit loop\ncontinue  # skip to next",desc:"break exits the loop entirely. continue skips the rest of this iteration.",ex:"for i in range(10):\n    if i == 5: break\n    if i % 2 == 0: continue\n    print(i)  # 1, 3"},
    {name:"Nested loops",cat:"loops",syntax:"for i in ...:\n    for j in ...:",desc:"A loop inside a loop. The inner loop runs completely for each outer iteration.",ex:"for row in range(3):\n    for col in range(4):\n        print(\"*\",end=\"\")\n    print()"},
  ]},
  {chapter:"ch5",title:"The Archives",icon:"📚",color:"#1abc9c",concepts:[
    {name:"Lists",cat:"collections",syntax:"[item1, item2, ...]",desc:"Ordered collection of items. Can hold any type, can be changed.",ex:"scores = [85, 92, 78, 95]"},
    {name:"Indexing",cat:"collections",syntax:"list[i]  # 0-based\nlist[-1] # last",desc:"Access items by position. First is [0]. Negative counts from end.",ex:"fruits = [\"a\",\"b\",\"c\"]\nprint(fruits[0])   # a\nprint(fruits[-1])  # c"},
    {name:"List methods",cat:"collections",syntax:".append() .remove()\n.insert() .sort()",desc:"Modify lists. append adds to end, insert at position, remove by value.",ex:"nums = [3,1,2]\nnums.append(4)  # [3,1,2,4]\nnums.sort()     # [1,2,3,4]"},
    {name:"Slicing",cat:"collections",syntax:"list[start:stop]",desc:"Get a sub-list. Stops BEFORE stop index. Omit start or stop for beginning/end.",ex:"items = [10,20,30,40,50]\nprint(items[1:3])  # [20,30]\nprint(items[:2])   # [10,20]"},
    {name:"List + Loop",cat:"collections",syntax:"for item in list:",desc:"Loop through each item in a list. The most common pattern in programming.",ex:"for score in [85,92,78]:\n    print(score)"},
    {name:"Build pattern",cat:"collections",syntax:"result = []\nfor ...:\n    result.append(x)",desc:"Start empty, loop, append matches. The #1 way to build lists.",ex:"evens = []\nfor i in range(10):\n    if i % 2 == 0:\n        evens.append(i)"},
  ]},
  {chapter:"ch6",title:"The Forge",icon:"🔥",color:"#e74c3c",concepts:[
    {name:"def (functions)",cat:"functions",syntax:"def name():\n    ...",desc:"Define a reusable block of code. Like writing a recipe you can cook anytime.",ex:"def greet():\n    print(\"Hello!\")\n\ngreet()  # Hello!"},
    {name:"Parameters",cat:"functions",syntax:"def name(param1, param2):",desc:"Variables that receive values when the function is called.",ex:"def greet(name):\n    print(f\"Hi {name}!\")\ngreet(\"Alex\")"},
    {name:"return",cat:"functions",syntax:"return value",desc:"Send a value back from a function. Unlike print, return gives you data to use.",ex:"def double(n):\n    return n * 2\nresult = double(5)  # 10"},
    {name:"Default parameters",cat:"functions",syntax:"def f(x, y=default):",desc:"Parameters with fallback values. Can be omitted when calling.",ex:"def greet(name, msg=\"Hello\"):\n    print(f\"{msg}, {name}!\")\ngreet(\"Alex\")  # Hello, Alex!"},
    {name:"Multiple return",cat:"functions",syntax:"return val1, val2",desc:"Return multiple values at once. Unpack with multiple variables.",ex:"def stats(nums):\n    return min(nums), max(nums)\nlo, hi = stats([3,7,1])"},
    {name:"Scope",cat:"functions",syntax:"local vs global",desc:"Variables inside a function are local — they only exist inside it.",ex:"x = 10  # global\ndef f():\n    x = 5  # local, separate!\nf()\nprint(x)  # still 10"},
  ]},
  {chapter:"ch7",title:"The Map Room",icon:"🗺️",color:"#f39c12",concepts:[
    {name:"Dictionaries",cat:"collections",syntax:"{\"key\": value, ...}",desc:"Store data as labeled pairs. Look up by name instead of position.",ex:"player = {\"name\": \"Alex\",\n          \"level\": 5}"},
    {name:"Dict access",cat:"collections",syntax:"dict[\"key\"]\ndict.get(\"key\", default)",desc:"Get values by key. Use .get() to avoid crashes on missing keys.",ex:"player[\"name\"]  # Alex\nplayer.get(\"hp\", 100)  # 100"},
    {name:"Dict update",cat:"collections",syntax:"dict[\"key\"] = value\ndel dict[\"key\"]",desc:"Add or change entries with []. Delete with del.",ex:"player[\"level\"] = 6\ndel player[\"temp\"]"},
    {name:".items() loop",cat:"collections",syntax:"for key, val in d.items():",desc:"Loop through all key-value pairs. The most useful dict loop.",ex:"for k, v in player.items():\n    print(f\"{k}: {v}\")"},
    {name:"Nested dicts",cat:"collections",syntax:"{\"a\": {\"b\": val}}",desc:"Dicts inside dicts. Chain brackets to access: d[\"a\"][\"b\"].",ex:"game = {\"player\": {\"hp\": 100}}\nprint(game[\"player\"][\"hp\"])"},
    {name:"List of dicts",cat:"collections",syntax:"[{...}, {...}]",desc:"The universal data pattern. Each dict is a record, the list holds them all.",ex:"party = [\n  {\"name\":\"Knight\",\"hp\":100},\n  {\"name\":\"Mage\",\"hp\":60}\n]"},
  ]},
  {chapter:"ch8",title:"The Summit",icon:"⛰️",color:"#9b59b6",concepts:[
    {name:"import",cat:"modules",syntax:"import module_name",desc:"Load external tools. Python has thousands of pre-built modules.",ex:"import random\nprint(random.randint(1,10))"},
    {name:"random module",cat:"modules",syntax:"random.randint(a,b)\nrandom.choice(list)",desc:"Generate random values. randint for numbers, choice for picking from a list.",ex:"import random\ndie = random.randint(1,6)\npick = random.choice([\"a\",\"b\"])"},
    {name:".split() / .join()",cat:"strings",syntax:"str.split(sep)\nsep.join(list)",desc:"split breaks string into list, join combines list into string.",ex:"\"a,b,c\".split(\",\")  # [\"a\",\"b\",\"c\"]\n\"-\".join([\"x\",\"y\"])  # \"x-y\""},
    {name:"try / except",cat:"errors",syntax:"try:\n    risky_code\nexcept ErrorType:\n    handle_it",desc:"Catch errors instead of crashing. Like a safety net for your code.",ex:"try:\n    n = int(\"abc\")\nexcept ValueError:\n    print(\"Not a number!\")"},
    {name:"f-string formatting",cat:"output",syntax:"f\"{val:.2f}\"\nf\"{val:>10}\"",desc:"Control decimal places, alignment, and padding inside f-strings.",ex:"f\"{3.14159:.2f}\"  # 3.14\nf\"{'hi':>10}\"     #         hi"},
    {name:"lambda",cat:"functions",syntax:"lambda x: expression",desc:"One-line mini-function. Most useful as a key= argument to sorted().",ex:"double = lambda x: x * 2\nsorted(words, key=lambda w: len(w))"},
  ]},
  {chapter:"ch9",title:"The Workshop",icon:"🎮",color:"#e91e63",concepts:[
    {name:"Game loop",cat:"patterns",syntax:"while True:\n    ...\n    if done: break",desc:"The heartbeat of every game. Runs forever until the player quits or wins.",ex:"while True:\n    action = input(\"Move? \")\n    if action == \"quit\":\n        print(\"Goodbye!\")\n        break"},
    {name:"random.choice()",cat:"modules",syntax:"random.choice(list)",desc:"Pick a random item from a list. Perfect for AI moves, loot drops, random events.",ex:"import random\nmove = random.choice([\"rock\",\"paper\",\"scissors\"])"},
    {name:"Score tracking",cat:"patterns",syntax:"score = 0\nscore += points",desc:"Use variables to count wins, losses, points. Update each round.",ex:"wins = 0\nfor round in range(5):\n    if player_won:\n        wins += 1\nprint(f\"Won {wins}/5\")"},
    {name:"Input validation",cat:"patterns",syntax:"while not valid:\n    try again",desc:"Keep asking until the player gives good input. Loop + condition.",ex:"while True:\n    n = int(input(\"1-10: \"))\n    if 1 <= n <= 10:\n        break\n    print(\"Try again!\")"},
    {name:"random.seed()",cat:"modules",syntax:"random.seed(n)",desc:"Make random numbers reproducible. Same seed = same sequence every time.",ex:"random.seed(42)\nprint(random.randint(1,10))  # Always 2"},
  ]},
  {chapter:"ch10",title:"The Colosseum",icon:"🏟️",color:"#ff5722",concepts:[
    {name:"Function architecture",cat:"patterns",syntax:"setup() → play() → results()",desc:"Break games into functions. Each does one job. Call them in order.",ex:"def setup():\n    return {\"hp\": 100}\ndef play(state):\n    # game logic\ndef results(state):\n    print(f\"Score: {state['score']}\")"},
    {name:"Data-driven design",cat:"patterns",syntax:"[{\"q\":...,\"a\":...}, ...]",desc:"Store game content in data structures. Change data, not code, to add content.",ex:"questions = [\n  {\"q\":\"2+2?\",\"a\":4},\n  {\"q\":\"Capital of France?\",\"a\":\"Paris\"}\n]"},
    {name:"Inventory system",cat:"patterns",syntax:"inv = {}\ninv[item] = qty",desc:"Dict where keys are item names, values are quantities. Add, remove, display.",ex:"inv = {}\ninv[\"potion\"] = 3\ninv[\"potion\"] -= 1\nif inv[\"potion\"] <= 0:\n    del inv[\"potion\"]"},
    {name:"Choice trees",cat:"patterns",syntax:"if choice == \"left\":\n    scene_cave()\nelif choice == \"right\":\n    scene_forest()",desc:"Branch the story based on player choices. Functions for each scene.",ex:"def scene_cave():\n    print(\"A dark cave...\")\n    choice = input(\"fight/sneak? \")\n    if choice==\"fight\": combat()"},
    {name:"Game state dict",cat:"patterns",syntax:"{\"hp\":100,\"inv\":[],\"loc\":\"start\"}",desc:"One dict tracks everything about the player. Functions read and modify it.",ex:"state = {\"hp\":100,\"gold\":0}\ndef take_damage(s, n):\n    s[\"hp\"] -= n\n    return s[\"hp\"] > 0"},
  ]},
  {chapter:"ch11",title:"The Dry Dock",icon:"🔧",color:"#ff9800",concepts:[
    {name:"Hardware setup",cat:"robotics",syntax:"Motor(Port.D)\nDriveBase(left, right, ...)",desc:"Define every motor, sensor, and the drive base. Like variables for robot parts.",ex:"left_motor = Motor(Port.D, CCW)\nright_motor = Motor(Port.C, CW)\ndrive = DriveBase(left_motor,\n  right_motor, 62.4, 80)"},
    {name:"straight() / turn()",cat:"robotics",syntax:"drive_base.straight(mm)\ndrive_base.turn(degrees)",desc:"Basic movement. Distance in millimeters, angles in degrees. Negative = reverse.",ex:"drive_base.straight(400)\ndrive_base.turn(90)\ndrive_base.straight(-200)"},
    {name:"Arm helpers",cat:"robotics",syntax:"def right_arm(deg, spd=600):",desc:"Wrap motor commands in named functions with default speeds for clean code.",ex:"def right_arm(deg, spd=600):\n    right_motor.run_angle(\n        spd, deg, Stop.HOLD)\nright_arm(-240)  # grab\nright_arm(195, 800)  # fast"},
    {name:"Speed profiles",cat:"robotics",syntax:"SPEED_FAST = {\"straight\":600,...}",desc:"Dicts of speed settings. One function applies any profile to the drive base.",ex:"SPEED_FAST = {\"straight\":600,\n  \"turn\":350}\ndef apply_speed(p):\n    drive_base.settings(\n        straight_speed=p['straight'])"},
    {name:"launch() / end_run()",cat:"robotics",syntax:"def launch():\n    reset + beep\ndef end_run():\n    stop + signal",desc:"Standard mission wrappers. Every run starts with launch() and ends with end_run().",ex:"def launch():\n    hub.light.on(Color.YELLOW)\n    drive_base.reset()\ndef end_run():\n    drive_base.stop()\n    hub.light.on(Color.GREEN)"},
  ]},
  {chapter:"ch12",title:"The Launch Pad",icon:"🚀",color:"#00e676",concepts:[
    {name:"Sensor reflection",cat:"robotics",syntax:"sensor.reflection()\n→ 0 (black) to 100 (white)",desc:"Color sensors return a number. Low = dark surface, high = light surface.",ex:"val = left_color.reflection()\nif val < 22:\n    print(\"On the line!\")"},
    {name:"Drive until line",cat:"robotics",syntax:"while sensor.reflection() > THRESHOLD:\n    drive_base.drive(speed, 0)",desc:"Keep driving until the sensor sees a line. The simplest sensor move.",ex:"drive_base.drive(150, 0)\nwhile left_color.reflection() > 22:\n    wait(5)\ndrive_base.stop()"},
    {name:"Two-sensor alignment",cat:"robotics",syntax:"left < T and right < T → aligned\nleft < T only → turn right\nright < T only → turn left",desc:"Use two sensors to square up on a line. Four cases to handle.",ex:"if L < BL and R < BL:\n    stop()  # aligned!\nelif L < BL:\n    turn_right()  # drag right\nelif R < BL:\n    turn_left()  # drag left"},
    {name:"Run architecture",cat:"robotics",syntax:"def Run1():\n    launch()\n    # mission steps\n    end_run()",desc:"Each competition run is a function. launch() at start, end_run() at end, steps in between.",ex:"def Run1():\n    launch()\n    apply_speed(SPEED_FAST)\n    drive_base.straight(690)\n    right_arm(-240)\n    end_run()"},
    {name:"Menu system",cat:"robotics",syntax:"while True:\n    show(current)\n    if center: run(current)\n    auto_advance()",desc:"Competition menu: display number, buttons to navigate, center to launch, auto-advance.",ex:"while True:\n    hub.display.number(prog)\n    if Button.CENTER pressed:\n        run(prog)\n        prog += 1\n        if prog > 4: prog = 1"},
  ]},
];

// ═══════════════════════════════════════════════════════════════════
// GRINDING ZONE — Random practice challenges
// ═══════════════════════════════════════════════════════════════════

const GRIND_CHALLENGES = [
  {cat:"output",minCh:"ch1",name:"Print Art",task:"Print a box made of # characters:\n####\n#  #\n#  #\n####",expectedBehavior:"Print a 4x4 box pattern using print statements",starterCode:"# Print a box pattern\n"},
  {cat:"data",minCh:"ch1",name:"Mad Libs",task:"Create 3 variables (animal, food, number) and print:\n\"The [animal] ate [number] [food]s\"",expectedBehavior:"Create variables and use f-string to combine them",starterCode:"# Create variables and combine them\n"},
  {cat:"types",minCh:"ch2",name:"Type Converter",task:"Convert \"42\" to int, \"3.14\" to float, and 100 to string.\nPrint each with its type.",expectedBehavior:"Convert between types and verify with type()",starterCode:"# Convert between types\n"},
  {cat:"operators",minCh:"ch2",name:"Remainder Finder",task:"Print the remainder when 97 is divided by each of: 2, 3, 5, 7.\nUse the % operator.",expectedBehavior:"Use modulo operator to find remainders",starterCode:"# Find remainders\n"},
  {cat:"logic",minCh:"ch3",name:"Grade Calculator",task:"Given score = 73, print the letter grade:\n90+: A, 80+: B, 70+: C, 60+: D, else: F",expectedBehavior:"Use if/elif/else to determine grade from score",starterCode:"score = 73\n\n"},
  {cat:"logic",minCh:"ch3",name:"Leap Year",task:"Given year = 2024, check if it's a leap year.\nRule: divisible by 4 AND (not by 100 OR by 400).",expectedBehavior:"Use boolean logic to check leap year rules",starterCode:"year = 2024\n\n"},
  {cat:"loops",minCh:"ch4",name:"Multiplication Table",task:"Print the multiplication table for 7:\n7 x 1 = 7\n7 x 2 = 14\n... through 7 x 10 = 70",expectedBehavior:"Use for loop with range to print multiplication table",starterCode:"# Multiplication table for 7\n"},
  {cat:"loops",minCh:"ch4",name:"FizzBuzz",task:"Print numbers 1-20. But:\n- multiples of 3: print \"Fizz\"\n- multiples of 5: print \"Buzz\"\n- multiples of both: print \"FizzBuzz\"",expectedBehavior:"Classic FizzBuzz with loop and conditionals",starterCode:"# FizzBuzz 1-20\n"},
  {cat:"collections",minCh:"ch5",name:"List Filter",task:"From numbers = [12, 5, 23, 8, 17, 3, 21, 9]\nBuild a new list of only numbers > 10.\nPrint the filtered list and its length.",expectedBehavior:"Filter list using loop and append or list comprehension",starterCode:"numbers = [12, 5, 23, 8, 17, 3, 21, 9]\n\n"},
  {cat:"collections",minCh:"ch5",name:"Reverse It",task:"Reverse the list [1,2,3,4,5] WITHOUT using .reverse().\nBuild a new reversed list using a loop.",expectedBehavior:"Build reversed list using loop, not built-in reverse",starterCode:"original = [1, 2, 3, 4, 5]\n\n"},
  {cat:"functions",minCh:"ch6",name:"Temperature Converter",task:"Write two functions:\ncelsius_to_fahrenheit(c) → c * 9/5 + 32\nfahrenheit_to_celsius(f) → (f - 32) * 5/9\nTest with 0°C and 212°F.",expectedBehavior:"Define two converter functions with return values",starterCode:"# Define converter functions\n\n# Test them\n"},
  {cat:"functions",minCh:"ch6",name:"Password Checker",task:"Write is_strong(password) that returns True if:\n- length >= 8\n- contains a digit\nTest with \"hello\" (weak) and \"secret42\" (strong).",expectedBehavior:"Define function with multiple conditions, test both cases",starterCode:"# Password strength checker\n\n"},
  {cat:"collections",minCh:"ch7",name:"Word Counter",task:"Count each word in: \"the cat sat on the mat the cat\"\nStore in a dict and print each word with its count.",expectedBehavior:"Split string, use dict to count word frequencies",starterCode:"text = \"the cat sat on the mat the cat\"\n\n"},
  {cat:"collections",minCh:"ch7",name:"Contacts Book",task:"Create a dict of 3 contacts (name → phone).\nAdd one, delete one, print all remaining with .items().",expectedBehavior:"Create, modify, and iterate through a dictionary",starterCode:"# Contacts book\n\n"},
  {cat:"errors",minCh:"ch8",name:"Safe Calculator",task:"Write safe_divide(a, b) that:\n- Returns a/b if b != 0\n- Uses try/except to handle errors\n- Test with (10,3) and (10,0)",expectedBehavior:"Function with try/except for division, handle ZeroDivisionError",starterCode:"# Safe division function\n\n"},
  {cat:"modules",minCh:"ch8",name:"Dice Roller",task:"import random. Simulate rolling 2 dice 10 times.\nPrint each roll and keep track of how many times\nyou rolled doubles (same number on both).",expectedBehavior:"Use random.randint in a loop, track doubles count",starterCode:"import random\n\n# Roll 2 dice 10 times\n"},
  {cat:"patterns",minCh:"ch9",name:"Magic 8-Ball",task:"Build a Magic 8-Ball:\n1. responses = ['Yes!','No!','Maybe','Ask again']\n2. questions = ['Will I win?','Is it sunny?','Should I go?']\n3. For each question, print it and a random.choice response\nUse random.seed(42)",expectedBehavior:"Loop through questions, print each with random response",starterCode:"import random\nrandom.seed(42)\n\n"},
  {cat:"patterns",minCh:"ch9",name:"Number Guesser",task:"The computer picks random.randint(1,20) (seed=42).\nSimulate guesses = [10, 5, 15, 12, 8].\nFor each, print 'Too high', 'Too low', or 'Correct!'\nStop when correct.",expectedBehavior:"Compare each guess to secret, print hints, break on correct",starterCode:"import random\nrandom.seed(42)\n\nguesses = [10, 5, 15, 12, 8]\n"},
  {cat:"patterns",minCh:"ch10",name:"Shop System",task:"Build a shop:\nitems = [{\"name\":\"Sword\",\"price\":50},{\"name\":\"Shield\",\"price\":30},{\"name\":\"Potion\",\"price\":10}]\nplayer_gold = 100\nFunction buy(items, name, gold) returns remaining gold or -1 if can't afford.\nBuy Sword, Potion, Shield. Print balance after each.",expectedBehavior:"Define buy function, check affordability, track gold",starterCode:"# Shop system\nitems = [\n    {\"name\":\"Sword\",\"price\":50},\n    {\"name\":\"Shield\",\"price\":30},\n    {\"name\":\"Potion\",\"price\":10}\n]\nplayer_gold = 100\n\n"},
  {cat:"patterns",minCh:"ch10",name:"Battle Sim",task:"Build a simple battle:\nplayer = {\"name\":\"Hero\",\"hp\":100,\"attack\":20}\nenemy = {\"name\":\"Dragon\",\"hp\":80,\"attack\":15}\nLoop: player attacks enemy, enemy attacks player.\nPrint each attack and remaining HP.\nStop when someone reaches 0 HP.",expectedBehavior:"Loop with alternating attacks, track HP, detect defeat",starterCode:"# Battle simulator\nplayer = {\"name\":\"Hero\",\"hp\":100,\"attack\":20}\nenemy = {\"name\":\"Dragon\",\"hp\":80,\"attack\":15}\n\n"},
  {cat:"robotics",minCh:"ch11",name:"Distance Planner",task:"A robot needs to visit 3 waypoints:\nwaypoints = [(0,0),(300,0),(300,400),(0,400)]\nCalculate and print the distance between consecutive waypoints.\nUse: distance = sqrt((x2-x1)^2 + (y2-y1)^2)\nPrint total distance in mm.",expectedBehavior:"Calculate distances between consecutive points, use sqrt, print total",starterCode:"import math\nwaypoints = [(0,0),(300,0),(300,400),(0,400)]\n\n"},
  {cat:"robotics",minCh:"ch11",name:"Speed Time Calc",task:"A robot drives 3 segments:\nsegments = [{\"dist\":400,\"speed\":600},{\"dist\":200,\"speed\":150},{\"dist\":300,\"speed\":400}]\nFor each, calculate time = distance / speed.\nPrint each segment's time and the total time in seconds.",expectedBehavior:"Calculate time for each segment, print formatted results and total",starterCode:"# Speed and time calculator\nsegments = [\n    {\"dist\":400,\"speed\":600},\n    {\"dist\":200,\"speed\":150},\n    {\"dist\":300,\"speed\":400}\n]\n\n"},
  {cat:"robotics",minCh:"ch12",name:"Sensor Analyzer",task:"Given 20 sensor readings:\nreadings = [80,75,70,65,58,50,42,35,28,22,18,15,12,10,15,20,35,55,72,80]\nFind: minimum, maximum, average.\nCount how many are below BLACK_LINE=22.\nFind the index of the first black reading.",expectedBehavior:"Analyze sensor data: min, max, avg, count below threshold, first detection index",starterCode:"BLACK_LINE = 22\nreadings = [80,75,70,65,58,50,42,35,28,22,18,15,12,10,15,20,35,55,72,80]\n\n"},
  {cat:"robotics",minCh:"ch12",name:"Run Optimizer",task:"4 runs with times and points:\nruns = [{\"name\":\"Run1\",\"time\":28,\"points\":120},{\"name\":\"Run2\",\"time\":35,\"points\":80},{\"name\":\"Run3\",\"time\":42,\"points\":160},{\"name\":\"Run4\",\"time\":31,\"points\":95}]\nMatch time = 150s. Find the best combo that fits.\nSort by points/time ratio. Print the optimal order.",expectedBehavior:"Calculate efficiency ratio, sort runs, fit within time limit, print optimal order",starterCode:"# Run optimization\nruns = [\n    {\"name\":\"Run1\",\"time\":28,\"points\":120},\n    {\"name\":\"Run2\",\"time\":35,\"points\":80},\n    {\"name\":\"Run3\",\"time\":42,\"points\":160},\n    {\"name\":\"Run4\",\"time\":31,\"points\":95}\n]\nMATCH_TIME = 150\n\n"},
];

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
  const [output,setOutput]=useState(null);
  const [isRunning,setIsRunning]=useState(false);
  const [attempts,setAttempts]=useState([]);

  // Determine which challenges are available based on completed chapters
  const cr=new Set(profile.completedRooms||[]);
  const chOrder=["ch1","ch2","ch3","ch4","ch5","ch6","ch7","ch8"];
  const maxCh=chOrder.findLastIndex(ch=>CHAPTERS.find(c=>c.id===ch)?.rooms?.some(r=>cr.has(r.id)));
  const available=GRIND_CHALLENGES.filter(g=>{const idx=chOrder.indexOf(g.minCh);return idx<=maxCh;});

  const categories=[...new Set(available.map(g=>g.cat))];
  const catIcons={output:"📤",data:"💾",types:"🔢",operators:"➕",logic:"🔀",loops:"🔄",collections:"📦",functions:"⚙️",modules:"📦",errors:"🛡️"};

  const pickRandom=(cat)=>{
    const pool=cat?available.filter(g=>g.cat===cat):available;
    if(pool.length===0)return;
    const pick=pool[Math.floor(Math.random()*pool.length)];
    setChallenge(pick);setCode(pick.starterCode);setOutput(null);setAttempts([]);
  };

  const handleRun=async()=>{
    if(isRunning)return;
    setIsRunning(true);setOutput(null);
    const result=validateOffline(code,challenge,attempts.length);
    setOutput(result);
    setAttempts(prev=>[...prev,{code,feedback:result.feedback,passed:result.passes}]);
    setIsRunning(false);
  };

  const handleKeyDown=e=>{
    if(e.key==="Tab"){e.preventDefault();const s=e.target.selectionStart,end=e.target.selectionEnd;
      setCode(code.substring(0,s)+"    "+code.substring(end));setTimeout(()=>{e.target.selectionStart=e.target.selectionEnd=s+4},0);}
    if((e.ctrlKey||e.metaKey)&&e.key==="Enter")handleRun();
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
        <Btn onClick={()=>pickRandom(null)} color="#e67e22">Random Challenge</Btn>
        <div className="text-xs mt-2" style={{color:DIM}}>{available.length} challenges available</div>
      </div>
      <h3 className="text-sm font-bold mb-3 tracking-wider" style={{color:DIM}}>BY CATEGORY</h3>
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
        <Btn onClick={()=>setChallenge(null)} color={DIM}>← Back</Btn>
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
        <textarea value={code} onChange={e=>setCode(e.target.value)} onKeyDown={handleKeyDown}
          spellCheck={false} className="flex-1 p-4 rounded-lg text-sm resize-none outline-none mb-3"
          style={{background:DARK,color:TEXT,fontFamily:MONO,border:`1px solid ${ACCENT}33`,minHeight:"200px"}}/>
        <div className="flex gap-3 mb-3">
          <Btn onClick={handleRun} disabled={isRunning}>{isRunning?"Running...":"▶ Run (Ctrl+Enter)"}</Btn>
        </div>
        {output&&<div className="p-3 rounded-lg" style={{background:output.passes?"#0d281822":"#28101822",border:`1px solid ${output.passes?`${ACCENT}44`:`${ERR}44`}`}}>
          <div className="flex items-center gap-2 mb-1">
            <span>{output.passes?"✅":"❌"}</span>
            <span className="text-sm font-bold" style={{color:output.passes?ACCENT:ERR}}>{output.passes?"Great work!":"Not quite — keep trying!"}</span>
          </div>
          <pre className="text-xs whitespace-pre-wrap" style={{color:DIM,fontFamily:MONO}}>{output.feedback}</pre>
        </div>}
      </div>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════
// CHALLENGE ROOM — The core gameplay loop
// ═══════════════════════════════════════════════════════════════════

function ChallengeRoom({challenge,isBoss,onComplete,onBack,xpMultiplier,chapterIntroNpc,chapterIntroDialogue}){
  const [code,setCode]=useState(challenge.starterCode||"");
  const [output,setOutput]=useState(null);
  const [isRunning,setIsRunning]=useState(false);
  const [hintLevel,setHintLevel]=useState(0);
  const [passed,setPassed]=useState(false);
  const [showVictory,setShowVictory]=useState(false);
  const [usedHints,setUsedHints]=useState(false);
  const [attempts,setAttempts]=useState([]);
  const [dialoguePhase,setDialoguePhase]=useState(chapterIntroDialogue?"chapter-intro":challenge.npcDialogue?"room-intro":"play");

  const [showGuideHelp,setShowGuideHelp]=useState(false);

  const handleRun=async()=>{
    if(isRunning||passed)return;
    setIsRunning(true);setOutput(null);

    const result=validateOffline(code,challenge,attempts.length);

    setOutput(result);
    setAttempts(prev=>[...prev,{code,feedback:result.feedback,passed:result.passes}]);

    if(result.passes){setPassed(true);try{SFX.codeSuccess()}catch(e){};try{Music.playVictory()}catch(e){};setTimeout(()=>setShowVictory(true),500);}
    else{try{SFX.codeFail()}catch(e){}}
    setIsRunning(false);
  };

  const handleKeyDown=e=>{
    if(e.key==="Tab"){e.preventDefault();const s=e.target.selectionStart,end=e.target.selectionEnd;
      setCode(code.substring(0,s)+"    "+code.substring(end));setTimeout(()=>{e.target.selectionStart=e.target.selectionEnd=s+4},0);}
    if((e.ctrlKey||e.metaKey)&&e.key==="Enter")handleRun();
  };

  const earnedXp=Math.round(challenge.xpReward*xpMultiplier);
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
      <div className="text-xs font-mono" style={{color:ACCENT}}>+{earnedXp} XP</div>
    </div>

    {challenge.scene&&<div className="px-4 pt-2"><SceneBanner scene={challenge.scene}/></div>}

    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      {/* Left: narrative + task + help */}
      <div className="lg:w-2/5 p-4 overflow-y-auto border-b lg:border-b-0 lg:border-r" style={{borderColor:"#ffffff11"}}>
        <div className="text-sm mb-3 leading-relaxed whitespace-pre-line" style={{color:DIM,fontStyle:"italic"}}>{challenge.narrative}</div>
        <div className="p-3 rounded-lg mb-3" style={{background:PANEL2,border:`1px solid ${ACCENT}33`}}>
          <div className="text-xs font-bold mb-2 tracking-wider" style={{color:ACCENT}}>YOUR TASK</div>
          <div className="text-sm whitespace-pre-line leading-relaxed" style={{color:TEXT}}>{challenge.task}</div>
        </div>

        {/* Hints */}
        <div className="mb-3">
          {hintLevel<challenge.hints.length&&<button onClick={()=>{setHintLevel(h=>h+1);setUsedHints(true)}}
            className="text-xs px-3 py-1 rounded cursor-pointer" style={{color:GOLD,background:`${GOLD}11`,border:`1px solid ${GOLD}33`}}>
            💡 Hint ({challenge.hints.length-hintLevel} left)</button>}
          {challenge.hints.slice(0,hintLevel).map((h,i)=><div key={i} className="mt-2 p-3 rounded text-xs whitespace-pre-line"
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
                  {help.map((line,i)=><div key={i} className="text-xs mb-1 whitespace-pre-line" style={{color:TEXT,fontFamily:MONO,lineHeight:"1.5"}}>{line}</div>)}
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
          <textarea value={code} onChange={e=>setCode(e.target.value)} onKeyDown={handleKeyDown}
            className="flex-1 w-full p-4 rounded-lg resize-none focus:outline-none"
            style={{background:DARK,color:"#e6e6e6",border:`1px solid #ffffff11`,fontFamily:MONO,fontSize:"13px",lineHeight:"1.6",minHeight:"140px",caretColor:ACCENT}}
            spellCheck={false} placeholder="# Write your Python code here..."/>
          <Btn onClick={handleRun} disabled={isRunning||passed} className="mt-3" color={passed?"#00bfa5":ACCENT}>
            {isRunning?"⟳ Running...":passed?"✓ Passed!":"▶ Run Code"}</Btn>
        </div>
        <div className="p-4 border-t" style={{borderColor:"#ffffff11",minHeight:"100px"}}>
          <div className="text-xs font-mono tracking-wider mb-2" style={{color:DIM}}>OUTPUT</div>
          {isRunning&&<div className="text-sm" style={{color:ACCENT}}>⟳ Checking your code...</div>}
          {output&&<div style={{animation:output.passes?"cq-slide-in 0.3s ease-out":"cq-shake 0.4s ease-out"}}>
            {output.error?<div className="p-3 rounded text-sm font-mono whitespace-pre-line" style={{background:"#ff6b6b11",color:ERR,border:"1px solid #ff6b6b33"}}>❌ {output.error}</div>
            :output.output?<div className="p-3 rounded text-sm font-mono whitespace-pre-line mb-2" style={{background:DARK,color:"#e6e6e6",border:`1px solid #ffffff11`}}>{output.output}</div>:null}
            {output.feedback&&<div className="p-3 rounded text-sm" style={{background:output.passes?`${ACCENT}11`:`${GOLD}11`,color:output.passes?ACCENT:GOLD,border:`1px solid ${output.passes?`${ACCENT}33`:`${GOLD}33`}`}}>
              {output.passes?"🎉":"💭"} {output.feedback}</div>}
          </div>}
        </div>
      </div>
    </div>

    {/* Victory */}
    {showVictory&&<div className="fixed inset-0 flex items-center justify-center z-50" style={{background:"rgba(0,0,0,0.85)"}}>
      <Particles active={showVictory} type={isBoss?"boss":"victory"} count={isBoss?36:24}/>
      <div className="text-center p-8 rounded-xl max-w-sm mx-4" style={{background:isBoss?"linear-gradient(135deg,#1a0d2a,#0d1b2a)":`linear-gradient(135deg,${PANEL},#0a1a14)`,border:`2px solid ${isBoss?GOLD:ACCENT}`,boxShadow:`0 0 40px ${isBoss?`${GOLD}33`:`${ACCENT}33`}`,animation:"cq-scale-in 0.4s ease-out"}}>
        <div className="text-5xl mb-3">{isBoss?"👑":"⭐"}</div>
        <h3 className="text-xl font-bold mb-2" style={{color:isBoss?GOLD:ACCENT}}>{isBoss?"BOSS DEFEATED!":"ROOM CLEARED!"}</h3>
        <div className="text-3xl font-bold font-mono mb-1" style={{color:ACCENT,animation:"cq-pulse 1.5s ease-in-out infinite"}}>+{earnedXp} XP</div>
        {!usedHints&&<div className="text-xs mb-3" style={{color:GOLD}}>🙈 No hints used!</div>}
        <Btn onClick={()=>{try{isBoss?SFX.bossDefeat():SFX.roomClear()}catch(e){};onComplete(earnedXp,!usedHints)}} color={isBoss?GOLD:ACCENT}>CONTINUE →</Btn>
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

  const [pendingBadge,setPendingBadge]=useState(null);
  const [pendingTrophy,setPendingTrophy]=useState(null);
  const [musicMuted,setMusicMuted]=useState(false);

  // Music: play the right track when screen/context changes
  useEffect(()=>{
    if(screen==="loading")return;
    const track=getTrackForContext({screen,chapterId:currentChapter?.id,isBoss:isBossChallenge});
    Music.play(track);
  },[screen,currentChapter?.id,isBossChallenge]);

  useEffect(()=>{(async()=>{
    const list=await loadProfileList();
    if(list.length>0){const loaded=[];for(const p of list){const d=await loadProfile(p.id);if(d)loaded.push({...d,id:p.id})}
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

  const checkTrophies=(p,noHints)=>{
    const earned=[...(p.trophies||[])],newT=[];
    const add=(id)=>{if(!earned.includes(id)){earned.push(id);const t=TROPHIES.find(t=>t.id===id);if(t)newT.push(t)}};
    const cr=new Set(p.completedRooms||[]),cb=new Set(p.completedBosses||[]);
    if(cr.size>=1)add("first_clear");
    if(cb.size>=1)add("boss_slayer");
    if(noHints)add("no_hints");
    if(roomsThisSession+1>=3)add("streak_3");
    if(p.xp>=100)add("xp_100");
    if(p.xp>=500)add("xp_500");
    if(p.xp>=1000)add("xp_1000");
    // Act 1 graduate — all 5 Act 1 bosses
    if(["ch1_boss","ch2_boss","ch3_boss","ch4_boss","ch5_boss"].every(b=>cb.has(b)))add("act1_grad");
    // Explorer — 5 side quests
    if([...cr].filter(r=>r.includes("_s")).length>=5)add("explorer");
    // Summit — reached ch8
    if(CHAPTERS.find(c=>c.id==="ch8")?.rooms?.some(r=>cr.has(r.id))||cb.has("ch8_boss"))add("summit");
    // Final boss
    if(cb.has("ch8_boss"))add("final_boss");
    // Arena trophies
    if(cb.has("ch9_boss"))add("game_builder");
    if(cb.has("ch10_boss"))add("arena_champion");
    if(cb.has("ch9_boss")&&cb.has("ch10_boss"))add("act3_grad");
    // Rover Bay trophies
    if(cb.has("ch11_boss"))add("dockmaster");
    if(cb.has("ch12_boss"))add("mission_control");
    if(cb.has("ch11_boss")&&cb.has("ch12_boss"))add("rover_complete");
    return{trophies:earned,newTrophies:newT};
  };

  const handleCharacterCreated=async data=>{
    const id=`hero_${Date.now()}`;
    await saveProfile(id,data);
    const list=await loadProfileList();list.push({id,name:data.name});await saveProfileList(list);
    setProfiles(prev=>[...prev,{...data,id}]);setActiveProfileId(id);setProfile(data);
    setScreen("session");
  };

  const handleSelectProfile=async id=>{const d=await loadProfile(id);if(d){setActiveProfileId(id);setProfile(d);setScreen("session")}};

  const startSession=minutes=>{
    setXpMultiplier(minutes<=10?1:minutes<=15?1.2:minutes<=20?1.5:2);
    setTimeRemaining(minutes*60);setSessionActive(true);setRoomsThisSession(0);setScreen("map");
  };

  const selectChapter=ch=>{try{SFX.menuNav()}catch(e){}setCurrentChapter(ch);setScreen("chapter");};
  const selectRoom=(room,isFirst)=>{
    try{SFX.roomEnter()}catch(e){}
    setCurrentChallenge(room);setIsBossChallenge(false);
    const cr=new Set(profile.completedRooms||[]);
    if(isFirst&&!cr.has(room.id)&&currentChapter.introDialogue){
      setChapterIntroNpc(currentChapter.introNpc);setChapterIntroDialogue(currentChapter.introDialogue);
    }else{setChapterIntroNpc(null);setChapterIntroDialogue(null)}
    setScreen("challenge");
  };
  const selectBoss=boss=>{try{SFX.roomEnter()}catch(e){}setCurrentChallenge(boss);setIsBossChallenge(true);setChapterIntroNpc(null);setChapterIntroDialogue(null);setScreen("challenge")};

  const completeChallenge=async(earnedXp,noHints)=>{
    try{SFX.xpGain()}catch(e){}
    let u={...profile,xp:profile.xp+earnedXp};
    if(isBossChallenge){
      u.completedBosses=[...(u.completedBosses||[]),currentChallenge.id];
      const ch=CHAPTERS.find(c=>c.boss?.id===currentChallenge.id);
      if(ch?.badge&&!(u.badges||[]).find(b=>b.name===ch.badge.name)){
        u.badges=[...(u.badges||[]),ch.badge];
        if(ch.equipment)u.equipment=[...(u.equipment||[]),ch.equipment];
        const{trophies,newTrophies}=checkTrophies(u,noHints);u.trophies=trophies;
        await persistProfile(u);setRoomsThisSession(r=>r+1);
        if(newTrophies.length>0)setPendingTrophy(newTrophies[0]);else setPendingBadge(ch.badge);return;
      }
    }else u.completedRooms=[...(u.completedRooms||[]),currentChallenge.id];
    const{trophies,newTrophies}=checkTrophies(u,noHints);u.trophies=trophies;
    await persistProfile(u);setRoomsThisSession(r=>r+1);
    if(newTrophies.length>0)setPendingTrophy(newTrophies[0]);else setScreen("chapter");
  };

  const dismissTrophy=()=>{
    setPendingTrophy(null);
    if(isBossChallenge){const ch=CHAPTERS.find(c=>c.boss?.id===currentChallenge.id);
      if(ch?.badge&&!pendingBadge){setPendingBadge(ch.badge);return}}
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
    {screen==="challenge"&&currentChallenge&&<ChallengeRoom key={currentChallenge.id} challenge={currentChallenge} isBoss={isBossChallenge}
      onComplete={completeChallenge} onBack={()=>setScreen("chapter")} xpMultiplier={xpMultiplier}
      chapterIntroNpc={chapterIntroNpc} chapterIntroDialogue={chapterIntroDialogue}/>}
    </ScreenWrap>
    {pendingTrophy&&<TrophyUnlock trophy={pendingTrophy} onContinue={dismissTrophy}/>}
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
