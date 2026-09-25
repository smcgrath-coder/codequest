// src/python/CodePanel.jsx
// The code editor (with line numbers) and the OUTPUT panel (real output, input box, errors, feedback).
import React, { useRef, useState, useEffect } from "react";
import { DARK, ACCENT, GOLD, TEXT, DIM, VDIM, ERR, MONO } from "../theme.js";
import { handleCodeKeyDown, CODE_TEXTAREA_PROPS } from "../editor.js";
import { pythonSupported, pythonStatus, runCode, gradeCode, restartPython } from "./runner.js";

export const PYTHON_RUNNER = {
  available: () => pythonSupported() && pythonStatus() !== "unavailable",
  run: runCode,
  grade: gradeCode,
  restart: restartPython,
};

// Output parts: [{ kind: "stdout" | "input", text }]; consecutive parts of one kind are merged.
export function appendPart(parts, text, kind) {
  const last = parts[parts.length - 1];
  return last && last.kind === kind ? [...parts.slice(0, -1), { kind, text: last.text + text }] : [...parts, { kind, text }];
}

export function CodeEditor({ code, setCode, onRun, minHeight = 140 }) {
  const gutter = useRef(null);
  const count = Math.max(1, code.split("\n").length);
  // wrap="off" keeps one numbered row per line. The gutter's extra bottom padding lets it scroll as far as
  // the textarea, whose horizontal scrollbar (for a long line) takes some of its height.
  // contain: size keeps the numbers from setting the editor's height, so a long program scrolls inside the
  // editor instead of growing it and pushing Run and OUTPUT off screen. Its width is then set by hand:
  // the digits of the last line number, plus pl-3 and pr-2.
  return <div className="flex-1 flex rounded-lg overflow-hidden" style={{ background: DARK, border: "1px solid #ffffff11", minHeight }}>
    <div ref={gutter} aria-hidden="true" className="shrink-0 select-none text-right pt-4 pb-12 pl-3 pr-2 overflow-hidden"
      style={{ contain: "size", width: `calc(${String(count).length}ch + 1.25rem)`, color: `${VDIM}88`, fontFamily: MONO, fontSize: "13px", lineHeight: "1.6" }}>
      {Array.from({ length: count }, (_, i) => <div key={i}>{i + 1}</div>)}
    </div>
    <textarea value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => handleCodeKeyDown(e, onRun)}
      onScroll={e => { if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop; }}
      {...CODE_TEXTAREA_PROPS} wrap="off" aria-label="Python code"
      className="flex-1 w-full py-4 pr-4 resize-none focus:outline-none"
      style={{ background: DARK, color: "#e6e6e6", fontFamily: MONO, fontSize: "13px", lineHeight: "1.6", caretColor: ACCENT }}
      placeholder="# Write your Python code here..." />
  </div>;
}

// onMarkDone, when given, shows the "mark it done" button. ChallengeRoom passes it after 3 clean runs that didn't pass.
// fallbackNote, for a result from the keyword grader: "late" if Python was still loading, else any truthy value.
export function OutputPanel({ status, parts, waitingForInput, onAnswer, checking, error, feedback, passed, fallbackNote, onMarkDone }) {
  const [answer, setAnswer] = useState("");
  const inputRef = useRef(null);
  // A fresh prompt starts empty: text typed but never sent (the kid pressed Stop) doesn't carry over.
  useEffect(() => { if (waitingForInput) { setAnswer(""); inputRef.current?.focus(); } }, [waitingForInput]);
  const printed = parts.length > 0 && !error?.hideOutput;   // see friendly.js's internalMessage()
  return <div>
    {status === "loading" && !printed && <div className="text-sm" style={{ color: ACCENT }}>⟳ Waking up Python…</div>}
    {(printed || waitingForInput) && <pre className="p-3 rounded text-sm whitespace-pre-wrap mb-2"
      style={{ background: DARK, color: "#e6e6e6", border: "1px solid #ffffff11", fontFamily: MONO, maxHeight: 260, overflow: "auto" }}>
      {parts.map((p, i) => <span key={i} style={{ color: p.kind === "input" ? ACCENT : undefined }}>{p.text}</span>)}
      {waitingForInput && <form className="inline" onSubmit={e => { e.preventDefault(); onAnswer(answer); setAnswer(""); }}>
        <input ref={inputRef} value={answer} onChange={e => setAnswer(e.target.value)} aria-label="Type your answer, then press Enter"
          {...CODE_TEXTAREA_PROPS}
          className="bg-transparent outline-none" style={{ color: ACCENT, fontFamily: MONO, borderBottom: `1px solid ${ACCENT}66`, minWidth: "8ch" }} />
      </form>}
    </pre>}
    {checking && <div className="text-sm mb-2" style={{ color: ACCENT }}>⟳ Checking your code…</div>}
    {error && <div className="p-3 rounded text-sm mb-2" style={{ background: "#ff6b6b11", color: ERR, border: "1px solid #ff6b6b33" }}>
      <div>❌ {error.headline}</div>
      {error.code && <pre className="mt-2 text-xs whitespace-pre-wrap" style={{ fontFamily: MONO, color: TEXT }}>{error.line ? `${error.line} | ` : ""}{error.code}</pre>}
      {error.python && <details className="mt-2 text-xs"><summary className="cursor-pointer" style={{ color: DIM }}>What Python said</summary>
        <pre className="mt-1 whitespace-pre-wrap" style={{ fontFamily: MONO, color: DIM }}>{error.python}</pre></details>}
    </div>}
    {feedback && <div className="p-3 rounded text-sm" style={{ background: passed ? `${ACCENT}11` : `${GOLD}11`, color: passed ? ACCENT : GOLD,
      border: `1px solid ${passed ? `${ACCENT}33` : `${GOLD}33`}` }}>{passed ? "🎉" : "💭"} {feedback}</div>}
    {fallbackNote && <div className="text-xs mt-2" style={{ color: DIM }}>{fallbackNote === "late"   // a slow download; see runner.js's untilReady()
      ? "Python is still loading, so this time I checked your code without running it."
      : "This device can't run Python here, so I checked your code without running it."}</div>}
    {onMarkDone && <div className="flex flex-wrap items-center gap-2 mt-3">
      <button type="button" onClick={onMarkDone} aria-label="I think my answer is right — mark it done, for half XP"
        className="text-xs px-3 py-1.5 rounded cursor-pointer" style={{ color: DIM, background: "transparent", border: `1px solid ${DIM}44` }}>
        I think my answer is right — mark it done</button>
      <span className="text-xs" style={{ color: DIM }}>You'll get half XP for this room.</span>
    </div>}
  </div>;
}
