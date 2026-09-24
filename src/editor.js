// ═══════════════════════════════════════════════════════════════════
// CODE EDITOR HELPERS — shared by ChallengeRoom and GrindingZone
// ═══════════════════════════════════════════════════════════════════

const INDENT = "    ";

// Works out what Tab / Shift+Tab should do. Returns the range [start, end) to
// replace, the replacement text, and the selection to restore afterwards.
// Tab never deletes selected text: a selection indents the lines it touches,
// and stays on the same text.
export function indentEdit(value, selStart, selEnd, { dedent = false } = {}) {
  if (!dedent && selStart === selEnd) {
    return { start: selStart, end: selEnd, text: INDENT, selStart: selStart + INDENT.length, selEnd: selStart + INDENT.length };
  }
  const start = selStart === 0 ? 0 : value.lastIndexOf("\n", selStart - 1) + 1;
  // A selection that ends at the very start of a line does not include that line.
  const last = selEnd > selStart && value[selEnd - 1] === "\n" ? selEnd - 1 : selEnd;
  const nl = value.indexOf("\n", last);
  const end = nl === -1 ? value.length : nl;
  const lines = value.slice(start, end).split("\n");
  const shifts = lines.map(line => !dedent ? INDENT.length
    : -(line.startsWith("\t") ? 1 : line.match(/^ {0,4}/)[0].length));
  const text = lines.map((line, k) => dedent ? line.slice(-shifts[k]) : INDENT + line).join("\n");

  // Where an old position ends up in the new text. A selection that starts at
  // the beginning of a line keeps that line's new indent inside it.
  const moved = (pos, keepLineStart) => {
    let lineStart = start, delta = 0;
    for (let k = 0; k < lines.length; k++) {
      const lineEnd = lineStart + lines[k].length;
      if (pos <= lineEnd) {
        const col = pos - lineStart;
        return lineStart + delta + (keepLineStart && col === 0 ? 0 : Math.max(0, col + shifts[k]));
      }
      delta += shifts[k];
      lineStart = lineEnd + 1;
    }
    return pos + delta;
  };
  const hasSelection = selStart !== selEnd;
  return { start, end, text, selStart: moved(selStart, hasSelection), selEnd: moved(selEnd, false) };
}

// Replaces a range of the textarea through the browser's editing commands so
// the change lands on the native undo stack and React sees a normal input event.
// Edits that change nothing only move the selection, so undo has no empty steps.
function replaceRange(el, { start, end, text, selStart, selEnd }) {
  if (el.value.slice(start, end) !== text) {
    el.focus();
    el.setSelectionRange(start, end);
    const done = typeof document !== "undefined" && typeof document.execCommand === "function"
      && document.execCommand("insertText", false, text);
    if (!done) {
      el.setRangeText(text, start, end, "end");
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
  el.setSelectionRange(selStart, selEnd);
}

// onKeyDown handler for the code textareas: Tab / Shift+Tab indent and
// dedent, Ctrl/Cmd+Enter runs the code.
export function handleCodeKeyDown(e, onRun) {
  if (e.key === "Tab") {
    e.preventDefault();
    const el = e.currentTarget;
    replaceRange(el, indentEdit(el.value, el.selectionStart, el.selectionEnd, { dedent: e.shiftKey }));
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") onRun();
}

// Stops tablet keyboards from capitalising "print" or auto-correcting code.
export const CODE_TEXTAREA_PROPS = {
  spellCheck: false,
  autoCapitalize: "off",
  autoCorrect: "off",
  autoComplete: "off",
};
