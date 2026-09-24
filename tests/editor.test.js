import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { indentEdit, handleCodeKeyDown } from "../src/editor.js";

// Applies an edit the way the textarea will, returning the new text and selection.
function apply(value, selStart, selEnd, opts) {
  const e = indentEdit(value, selStart, selEnd, opts);
  const text = value.slice(0, e.start) + e.text + value.slice(e.end);
  return { text, sel: text.slice(e.selStart, e.selEnd), caret: [e.selStart, e.selEnd] };
}

describe("Tab key in the code editor", () => {
  test("with no selection, Tab inserts four spaces at the caret", () => {
    const r = apply("if x:\nprint(x)", 6, 6);
    assert.equal(r.text, "if x:\n    print(x)");
    assert.deepEqual(r.caret, [10, 10]);
  });

  test("with lines selected, Tab indents every line and keeps the text", () => {
    const code = 'print("a")\nprint("b")\nprint("c")';
    const r = apply(code, 0, code.length);
    assert.equal(r.text, '    print("a")\n    print("b")\n    print("c")');
    assert.equal(r.sel, r.text, "the indented block stays selected");
  });

  test("a selection inside one line indents that line and keeps the same text selected", () => {
    const r = apply('print("hello")', 7, 12);
    assert.equal(r.text, '    print("hello")');
    assert.equal(r.sel, "hello");
  });

  test("a selection from the middle of one line to the middle of another stays on the same text", () => {
    const code = "aaaa\nbbbb\ncccc";
    const r = apply(code, 2, 12);            // "aa\nbbbb\ncc"
    assert.equal(r.text, "    aaaa\n    bbbb\n    cccc");
    assert.equal(r.sel, "aa\n    bbbb\n    cc");
  });

  test("Shift+Tab on a partial selection keeps the same text selected", () => {
    const r = apply('    print("hello")', 11, 16, { dedent: true });
    assert.equal(r.text, 'print("hello")');
    assert.equal(r.sel, "hello");
  });

  test("a blank first line is its own line", () => {
    assert.equal(apply("\n    print(1)", 0, 0, { dedent: true }).text, "\n    print(1)");
    assert.equal(apply("\nprint(1)", 0, 1).text, "    \nprint(1)");
  });

  test("a selection ending at the start of a line does not indent that next line", () => {
    const code = "a = 1\nb = 2\nc = 3";
    const r = apply(code, 0, 6); // "a = 1\n" selected, caret at start of line 2
    assert.equal(r.text, "    a = 1\nb = 2\nc = 3");
  });

  test("Shift+Tab removes up to four leading spaces from each selected line", () => {
    const code = "if x:\n        deep()\n    one()\n  two()\nnone()";
    const r = apply(code, 6, code.length, { dedent: true });
    assert.equal(r.text, "if x:\n    deep()\none()\ntwo()\nnone()");
  });

  test("Shift+Tab with no selection dedents the caret's line", () => {
    const r = apply("if x:\n    print(x)", 12, 12, { dedent: true });
    assert.equal(r.text, "if x:\nprint(x)");
    assert.deepEqual(r.caret, [8, 8]);
  });

  test("Shift+Tab removes a leading tab character", () => {
    const r = apply("\tprint(x)", 3, 3, { dedent: true });
    assert.equal(r.text, "print(x)");
  });
});

// A stand-in for the textarea, enough for handleCodeKeyDown's fallback path
// (node has no document.execCommand).
function fakeTextarea(value, selStart, selEnd = selStart) {
  const el = {
    value, selectionStart: selStart, selectionEnd: selEnd, edits: 0, inputs: 0,
    focus() {},
    setSelectionRange(a, b) { el.selectionStart = a; el.selectionEnd = b; },
    setRangeText(text, a, b) { el.value = el.value.slice(0, a) + text + el.value.slice(b); el.edits++; },
    dispatchEvent(ev) { if (ev.type === "input") el.inputs++; },
  };
  return el;
}
const key = (el, k, extra = {}) => ({ key: k, shiftKey: false, ctrlKey: false, metaKey: false, preventDefault() {}, currentTarget: el, ...extra });

describe("handleCodeKeyDown", () => {
  test("Tab edits the textarea and tells React about it", () => {
    const el = fakeTextarea("if x:\nprint(x)", 6);
    handleCodeKeyDown(key(el, "Tab"), () => {});
    assert.equal(el.value, "if x:\n    print(x)");
    assert.equal(el.inputs, 1);
    assert.deepEqual([el.selectionStart, el.selectionEnd], [10, 10]);
  });

  test("Shift+Tab with nothing to remove makes no edit (no empty undo step)", () => {
    const el = fakeTextarea("print(1)", 3);
    handleCodeKeyDown(key(el, "Tab", { shiftKey: true }), () => {});
    assert.equal(el.edits, 0);
    assert.equal(el.inputs, 0);
    assert.equal(el.value, "print(1)");
  });

  test("Ctrl+Enter and Cmd+Enter run the code", () => {
    let runs = 0;
    const el = fakeTextarea("print(1)", 0);
    handleCodeKeyDown(key(el, "Enter", { ctrlKey: true }), () => runs++);
    handleCodeKeyDown(key(el, "Enter", { metaKey: true }), () => runs++);
    handleCodeKeyDown(key(el, "Enter"), () => runs++);
    assert.equal(runs, 2);
  });
});
