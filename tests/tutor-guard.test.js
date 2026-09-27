// tests/tutor-guard.test.js
// The leak guard (guardReply in src/tutor.js) with real grading in Pyodide: in hint mode a code block that would
// pass the room is replaced, a one-line syntax example isn't, long blocks are cut, and when the grader can't say
// it fails closed. Open mode is left alone.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { makeCore } from "./helpers/python.js";
import { CHECKS } from "../src/checks.js";
import { CHAPTERS } from "../src/content.js";
import { guardReply, graderFor, codeIn, replyParts, LEAK_LINE, HINT_BLOCK_LINES } from "../src/tutor.js";

const ROOMS = new Map(CHAPTERS.flatMap(c => [...c.rooms, c.boss]).map(c => [c.id, c]));
const solution = id => fs.readFileSync(new URL(`./fixtures/solutions/${id}.py`, import.meta.url), "utf8");
const block = code => "```python\n" + code.trimEnd() + "\n```";

let t;
before(async () => { t = await makeCore(); });
// The room's real grader, as the page runs it (see tests/grading.test.js), counting its calls.
function graderOf(id) {
  const c = ROOMS.get(id);
  const grade = async code => { grade.calls++; t.messages.length = 0;
    t.core.grade({ id: "g", code, rule: JSON.stringify(CHECKS[c.id]), starter: c.starterCode || "", inputs: "[]", attempt: 1 });
    return t.messages.find(m => m.type === "graded"); };
  grade.calls = 0;
  return grade;
}

test("a reference solution in a code block is replaced, whether it's one line or several", async () => {
  for (const id of ["ch1_r1", "ch1_r5"]) {
    const out = await guardReply(`Sure! Here it is:\n\n${block(solution(id))}\n\nRun it!`, { mode: "hint", grade: graderOf(id) });
    assert.equal(out, `Sure! Here it is:\n\n${LEAK_LINE}\n\nRun it!`, id);
  }
});

test("a one-line syntax example that doesn't solve the room is kept as it is", async () => {
  const text = "Numbers can be added right inside print:\n\n```python\nprint(3 + 4)\n```";
  const grade = graderOf("ch1_r5");
  assert.equal(await guardReply(text, { mode: "hint", grade }), text);
  assert.equal(grade.calls, 1);
});

test("a long block is cut to its first lines; if those pass on their own, it's replaced", async () => {
  const long = "Something like:\n" + block("x = 1\ny = 2\nz = 3\nprint(x)") + "\nok?";
  assert.equal(await guardReply(long, { mode: "hint", grade: graderOf("ch1_r5") }), "Something like:\n```python\nx = 1\ny = 2\n# …\n```\nok?");
  assert.equal(HINT_BLOCK_LINES, 2);
  // The whole block crashes (so it fails), but its first two lines are the answer.
  const sneaky = block('print("Hello, World!")\nx = 1\ny = 1 / 0');
  assert.equal(await guardReply(sneaky, { mode: "hint", grade: graderOf("ch1_r1") }), LEAK_LINE);
});

test("inline code that would pass becomes `…`, with the line added once at the end", async () => {
  const out = await guardReply('Just type `print("Hello, World!")` and press Run. Use `print` for words.', { mode: "hint", grade: graderOf("ch1_r1") });
  assert.equal(out, `Just type \`…\` and press Run. Use \`print\` for words.\n\n${LEAK_LINE}`);
});

test("when the grader can't say, the guard fails closed; code that reaches into Python isn't even graded", async () => {
  const text = block("print(3 + 4)");
  for (const grade of [async () => { throw new Error("no python"); }, async () => ({ passed: false, stopped: true }), async () => ({ passed: false, timedOut: true }),
    async () => ({ passed: false, internal: "boom" }), async () => undefined])
    assert.equal(await guardReply(text, { mode: "hint", grade }), LEAK_LINE);
  const grade = graderOf("ch1_r1");
  assert.equal(await guardReply(block("import js\nprint(1)"), { mode: "hint", grade }), LEAK_LINE);
  assert.equal(grade.calls, 0);
});

test("open mode, and a reply with no code, are left alone (and nothing is graded)", async () => {
  const grade = graderOf("ch1_r5"), open = `Another way:\n\n${block(solution("ch1_r5"))}`;
  assert.equal(await guardReply(open, { mode: "open", grade }), open);
  assert.equal(await guardReply("What does line 2 do?", { mode: "hint", grade }), "What does line 2 do?");
  assert.equal(grade.calls, 0);
});

test("codeIn finds every block and inline piece", () => {
  assert.deepEqual(codeIn("a `x` b\n```python\nprint(1)\n```\nc ```y```"), ["x", "print(1)", "y"]);
});

// Replies whose code is easy to miscount: odd language lines, four backticks, a cut-off block, inline code.
const TRICKY = ["Look:\n```python\nprint(1)\n```\nok", "Look:\n```python \nprint(2)\n```", "``` py\nx = 3\n```", "```Python3\nx = 4\n```",
  "```\nx = 5\n```", "````python\nprint(6)\n````", "````\n```\nprint(7)\n```\n````", "```print(8)```", "Cut off:\n```python\nx = 9\ny = 10",
  "Use `print` and `x = 11` here.\n```python\nprint(12)\n```\nthen `y`", "Two:\n```python\na = 13\n```\nand\n```\nb = 14\n```",
  "Long:\n```python\na = 1\nb = 2\nc = 3\n```", "Four then three: ````python\nprint(15)\n```\nprint(16)"];

test("one rule for code: the guard grades exactly what the kid sees as code, and shows only what it graded", async () => {
  for (const text of TRICKY) {
    const graded = new Set(), grade = async code => { graded.add(code); return { passed: false }; };
    const shown = await guardReply(text, { mode: "hint", grade });
    const parts = replyParts(text), blocks = parts.filter(p => p.kind === "code").map(p => p.text);
    const inline = parts.filter(p => p.kind === "text").flatMap(p => [...p.text.matchAll(/`([^`\n]+)`/g)].map(m => m[1]));
    assert.deepEqual([...codeIn(text)].sort(), [...blocks, ...inline].sort(), text);
    for (const code of codeIn(text)) assert.ok(graded.has(code), `${text}: ${code}`);
    for (const p of replyParts(shown).filter(p => p.kind === "code")) assert.ok(graded.has(p.text), `${text}: shows ${p.text}`);
  }
});

test("a solution behind a language line with a space, or four backticks, is still caught", async () => {
  const grade = graderOf("ch1_r5"), code = solution("ch1_r5").trimEnd();
  for (const text of ["```python \n" + code + "\n```", "``` python\n" + code + "\n```", "````python\n" + code + "\n````"])
    assert.equal(await guardReply(`Here:\n${text}\nRun it!`, { mode: "hint", grade }), `Here:\n${LEAK_LINE}\nRun it!`, text);
});

test("graderFor uses the page's Python with the room's rule, and refuses when it can't grade safely", async () => {
  const calls = [], runner = { available: () => true, grade: async (code, opts) => { calls.push([code, opts]); return { passed: false }; } };
  await graderFor({ runner, rule: { out: 1 }, starter: "# hi" })("print(1)");
  assert.deepEqual(calls, [["print(1)", { rule: { out: 1 }, starter: "# hi", inputs: [], attempt: 1 }]]);
  await assert.rejects(graderFor({ runner, rule: { out: 1 }, busy: () => true })("x"), "not while the kid's program runs");
  await assert.rejects(graderFor({ runner, rule: undefined })("x"));
  await assert.rejects(graderFor({ runner: { ...runner, available: () => false }, rule: { out: 1 } })("x"));
  assert.equal(calls.length, 1);
});
