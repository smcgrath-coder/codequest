// tests/tutor-guard.test.js
// The leak guard (guardReply and leakCheck in src/tutor.js) with real grading in Pyodide: in hint mode code that
// would pass the room is replaced, even split into pieces, dressed up (>>> prompts, indents, its output), typed as
// plain lines, spread over answers (with stray mentions around it), named out of order or added to the kid's program;
// a one-line syntax example, a hint pointing at a missing `)`, the kid's own wrong code and the starter aren't. Long
// blocks are cut, and when the grader can't say (at all, or partway) it fails closed. A stopped question's grades
// stop too, and every guard grade but a piece's own stops a loop sooner than a kid's does. Open mode is left alone.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { makeCore } from "./helpers/python.js";
import { CHECKS } from "../src/checks.js";
import { CHAPTERS } from "../src/content.js";
import { guardReply, leakCheck, earlierCode, graderFor, untilStopped, codeIn, replyParts, hideCode, LEAK_LINE, UNCHECKED_LINE, HINT_BLOCK_LINES, MAX_PIECES, GUARD_RUN_SECONDS } from "../src/tutor.js";

const ROOMS = new Map(CHAPTERS.flatMap(c => [...c.rooms, c.boss]).map(c => [c.id, c]));
const fixture = p => fs.readFileSync(new URL(`./fixtures/${p}`, import.meta.url), "utf8");
const solution = id => fixture(`solutions/${id}.py`);
const block = code => "```python\n" + code.trimEnd() + "\n```";
// A solution's lines of code, without comments or blank lines.
const codeLinesOf = id => solution(id).split("\n").filter(l => l.trim() && !l.trim().startsWith("#"));
// A solution's lines, less the starter's comments (a kid has those already).
const linesOf = id => solution(id).split("\n").filter(l => l.trim() && !(ROOMS.get(id).starterCode || "").includes(l));
// Every line of a solution is on screen, in order: the kid could copy them all.
const allSeen = (shown, lines) => { let at = 0; for (const l of lines) { const i = shown.indexOf(l.trim(), at); if (i < 0) return false; at = i + l.trim().length; } return true; };

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

test("when a grade doesn't finish, the guard fails closed; code that reaches into Python isn't even graded", async () => {
  const text = block("print(3 + 4)");
  for (const grade of [async () => ({ passed: false, stopped: true }), async () => ({ passed: false, timedOut: true }), async () => ({ passed: false, internal: "boom" })])
    assert.equal(await guardReply(text, { mode: "hint", grade }), LEAK_LINE);
  const grade = graderOf("ch1_r1");
  assert.equal(await guardReply(block("import js\nprint(1)"), { mode: "hint", grade }), LEAK_LINE);
  assert.equal(grade.calls, 0);
});

test("when the grader can't answer at all (no Python here), code is swapped for an honest line, not LEAK_LINE", async () => {
  const none = [async () => { throw new Error("no python"); }, async () => undefined];
  for (const grade of none) {
    assert.equal(await guardReply(`Like this:\n${block("print(3 + 4)")}`, { mode: "hint", grade }), `Like this:\n${UNCHECKED_LINE}`);
    assert.equal(await guardReply("Try `x = 5` and `print` or `==`.", { mode: "hint", grade }), `Try \`…\` and \`print\` or \`==\`.\n\n${UNCHECKED_LINE}`, "a lone word or symbol still shows");
  }
  // A real catch in the same reply: LEAK_LINE wins.
  assert.equal(await guardReply("Not `import js`, but `x = 5`.", { mode: "hint", grade: none[0] }), `Not \`…\`, but \`…\`.\n\n${LEAK_LINE}`);
  // Once the grader can't answer, nothing more is tried: no edits, joins or other pieces.
  let calls = 0; const grade = async () => { calls++; throw new Error("no python"); };
  const out = await guardReply(`${block(">>> a = 1")}\nthen\n${block("b = 2")}`, { mode: "hint", grade, program: "c = 3", earlier: ["d = 4"] });
  assert.equal(out, `${UNCHECKED_LINE}\nthen\n…`); assert.equal(calls, 1);
  assert.match(UNCHECKED_LINE, /can't check code/); assert.ok(UNCHECKED_LINE.length < 100);
  // Plain lines that look like code can't be checked either, so they're hidden too.
  assert.equal(await guardReply("No boxes:\na = 15\nprint(a)\nRun it!", { mode: "hint", grade: none[0] }), `No boxes:\n…\n…\nRun it!\n\n${UNCHECKED_LINE}`);
});

test("when the grader stops answering partway, code it hasn't finished checking is hidden, not shown", async () => {
  const ls = codeLinesOf("ch1_r5");
  for (const text of [ls.map(block).join("\nthen\n"), ls.map(l => "`" + l + "`").join(", then "), `No boxes:\n${ls.join("\n")}\nRun it!`])
    for (const n of [1, 2, 3, 5]) {
      let calls = 0; const real = graderOf("ch1_r5"), grade = async code => { if (++calls > n) throw new Error("can't grade now"); return real(code); };
      const shown = await guardReply(text, { mode: "hint", grade });
      assert.ok(shown.includes(UNCHECKED_LINE) || shown.includes(LEAK_LINE), `after ${n}: ${shown}`);
      for (const l of ls) assert.ok(!shown.includes(l), `after ${n} grades, ${l} is still shown: ${shown}`);
    }
  // A join the kid's Run stopped is no answer either.
  let calls = 0; const real = graderOf("ch1_r5"), grade = async code => (++calls > 3 ? { passed: false, stopped: true } : real(code));
  assert.equal(await guardReply(`${ls.map(block).join("\nthen\n")}`, { mode: "hint", grade }), `${UNCHECKED_LINE}\nthen\n…\nthen\n…`);
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

test("graderFor uses the page's Python with the room's rule and the guard's quicker time limit (or the kid's own), and refuses when it can't grade safely", async () => {
  const calls = [], runner = { available: () => true, grade: async (code, opts) => { calls.push([code, opts]); return { passed: false }; } };
  const grade = graderFor({ runner, rule: { out: 1 }, starter: "# hi" });
  await grade("print(1)"); await grade("print(2)", { full: true });
  assert.deepEqual(calls, [["print(1)", { rule: { out: 1 }, starter: "# hi", inputs: [], attempt: 1, runSeconds: GUARD_RUN_SECONDS }],
    ["print(2)", { rule: { out: 1 }, starter: "# hi", inputs: [], attempt: 1 }]]);
  assert.ok(GUARD_RUN_SECONDS >= 0.3 && GUARD_RUN_SECONDS <= 1, "much less than grading's own 2 s, but not too little");
  await assert.rejects(graderFor({ runner, rule: { out: 1 }, busy: () => true, wait: 50 })("x"), "not while the kid's program runs, however long");
  await assert.rejects(graderFor({ runner, rule: undefined })("x"));
  await assert.rejects(graderFor({ runner: { ...runner, available: () => false }, rule: { out: 1 } })("x"));
  assert.equal(calls.length, 2);
});

// The page's runner, over this test's Python: runSeconds goes to grading.py (see runner.js's gradeCode).
const pageRunner = { available: () => true, grade: async (code, { rule, starter, inputs, attempt, runSeconds }) => {
  t.messages.length = 0; t.core.grade({ id: "g", code, rule: JSON.stringify(rule), starter, inputs: JSON.stringify(inputs), attempt, runSeconds });
  return t.messages.find(m => m.type === "graded"); } };

test("a guard grade stops a loop that never ends after GUARD_RUN_SECONDS, not the 2 s a kid's grade gets", async () => {
  const room = ROOMS.get("ch4_r4"), grade = graderFor({ runner: pageRunner, rule: CHECKS[room.id], starter: room.starterCode });
  const t0 = performance.now(), r = await grade('energy = 10\nwhile energy >= 0:\n    energy - 1\nprint("Shutdown!")'), ms = performance.now() - t0;
  assert.match(r.feedback, /never finished/);
  assert.ok(ms >= GUARD_RUN_SECONDS * 1000 && ms < GUARD_RUN_SECONDS * 1000 + 500, `${ms} ms`);
});

// A grade stopped sooner can't say that code wouldn't pass given the kid's 2 s, and a piece that doesn't pass is shown.
test("each piece on its own is graded with the kid's own time limits; edits, joins and the kid's program with the guard's", async () => {
  const real = graderOf("ch1_r5"), seen = [];
  const grade = async (code, { full } = {}) => { seen.push([code, !!full]); return real(code); };
  await leakCheck("Type `a = 15`, then `b = 27`, then `print(a + b)`.", { grade, program: "a = 1\nb = 2" });
  assert.deepEqual(seen.filter(([, full]) => full).map(([code]) => code), ["a = 15", "b = 27", "print(a + b)"]);
  assert.ok(seen.some(([code, full]) => code === "a = 1\nb = 2" && !full) && seen.some(([code, full]) => code === "a = 15\nb = 27\nprint(a + b)" && !full));
  // Code that passes only given longer than the guard's limit is still caught.
  const slow = async (code, { full } = {}) => (full ? { passed: true } : { passed: false, feedback: "When I checked your program, it never finished. Check your loops." });
  assert.equal(await guardReply(block("print(sum(range(10 ** 7)))"), { mode: "hint", grade: slow }), LEAK_LINE);
});

test("graderFor waits for the kid's program to finish, and grades again when their Run stopped a grade", async () => {
  let running = true, calls = 0;
  const later = ms => setTimeout(() => { running = false; }, ms);
  const runner = { available: () => true, grade: async () => {
    if (++calls > 1) return { passed: true };
    running = true; later(60);   // the kid pressed Run mid-grade, which stops the grade
    return { passed: false, stopped: true };
  } };
  later(60);
  const t0 = Date.now(), r = await graderFor({ runner, rule: { out: 1 }, busy: () => running })("x");
  assert.deepEqual(r, { passed: true }); assert.equal(calls, 2); assert.ok(Date.now() - t0 >= 100, "it waited both times");
  // A grade stopped some other way (not by the kid's Run) is returned as it is, so the guard fails closed.
  const stopped = { available: () => true, grade: async () => ({ passed: false, stopped: true }) };
  assert.deepEqual(await graderFor({ runner: stopped, rule: { out: 1 } })("x"), { passed: false, stopped: true });
});

test("untilStopped grades until the question stops, then the guard skips every grade after the one in flight", async () => {
  const text = `First:\n${block("x = 1")}\nthen:\n${block("print(x)")}\nRun it!`;
  const slow = ac => { const grade = async () => { grade.calls++; ac?.abort(); await new Promise(r => setTimeout(r, 20)); return { passed: false }; }; grade.calls = 0; return grade; };
  const on = slow(), ac = new AbortController(), off = slow(ac);
  await guardReply(text, { mode: "hint", grade: untilStopped(on, new AbortController().signal) });
  assert.ok(on.calls > 1, "a reply takes several grades");
  // The kid hid Byte during the first grade: its answer is thrown away, so nothing more is graded (and it fails closed).
  assert.equal(await guardReply(text, { mode: "hint", grade: untilStopped(off, ac.signal) }), `First:\n${UNCHECKED_LINE}\nthen:\n…\nRun it!`);
  assert.equal(off.calls, 1);
  // Until then it passes on what the guard asks for: a piece's grade with the kid's own time limits.
  const asked = []; await untilStopped(async (code, opts) => { asked.push([code, opts]); }, new AbortController().signal)("x", { full: true });
  assert.deepEqual(asked, [["x", { full: true }]]);
});

// The shapes a whole solution can take in a reply, each a trivial edit away from pasting: split into blocks or inline
// pieces, as the Python shell shows it (>>> and its output), indented, followed by its output, or as plain lines.
function shapes(id) {
  const ls = codeLinesOf(id), code = ls.join("\n"), out = t.run(code).filter(m => m.type === "stdout").map(m => m.text).join("").trimEnd();
  const chunks = k => ls.reduce((cs, l, i) => (i % k ? cs[cs.length - 1].push(l) : cs.push([l]), cs), []).map(c => c.join("\n"));
  return {
    "one line per block": chunks(1).map(block).join("\nthen\n"),
    "two lines per block": chunks(2).map(block).join("\nthen\n"),
    "inline pieces": ls.map(l => "`" + l + "`").join(", then "),
    ">>> with output": block(ls.map(l => (/^\s/.test(l) ? "... " : ">>> ") + l).join("\n") + (out ? `\n${out}` : "")),
    "indented": block(ls.map(l => "    " + l).join("\n")),
    "followed by its output": block(`${code}\n${out}`),
    "plain lines": code,
    "plain numbered lines": ls.map((l, i) => `${i + 1}. ${l}`).join("\n"),
  };
}
// Rooms whose solution fits in the two lines a block shows (so every shape shows all of it), and longer ones where
// only the split shapes do.
const SHORT = ["ch1_r1", "ch4_r1"], SPLIT = ["one line per block", "two lines per block", "inline pieces", "plain lines", "plain numbered lines"];

test("a solution split up or dressed up is still caught, and none of its lines are left for the kid", async () => {
  for (const [id, names] of [...SHORT.map(id => [id, Object.keys(shapes(id))]), ["ch1_r5", SPLIT], ["ch5_r1", SPLIT]])
    for (const name of names) {
      const shown = await guardReply(`Here you go:\n\n${shapes(id)[name]}\n\nRun it!`, { mode: "hint", grade: graderOf(id) });
      assert.ok(shown.startsWith("Here you go:") && shown.includes(LEAK_LINE), `${id}, ${name}: ${shown}`);
      assert.equal(shown.split(LEAK_LINE).length, 2, `${id}, ${name}: LEAK_LINE once`);
      for (const l of codeLinesOf(id)) assert.ok(!shown.includes(l.trim()), `${id}, ${name}: ${l.trim()} is still shown`);
    }
});

test("one stray mention like `==`, `=` or `:` doesn't hide a split solution from the joins (comments and docstrings count)", async () => {
  for (const id of ["ch1_r5", "ch1_r3", "ch6_s2"]) {
    const ls = linesOf(id), inline = ls.map(l => "`" + l + "`").join(", then ");
    for (const text of [`Type ${inline}. Remember \`=\` is not \`==\`.`, `Type ${inline}. No \`:\` needed.`, `Mind the \`=\`:\n${ls.map(block).join("\nthen\n")}`]) {
      const shown = await guardReply(text, { mode: "hint", grade: graderOf(id) });
      assert.ok(shown.includes(LEAK_LINE) && !allSeen(shown, ls), `${id}: ${shown}`);
      assert.match(shown, /`=`|`:`/, "the mention itself still shows");
    }
  }
});

// A mention that could be a line of code breaks every join it's in, so the joins also leave out each piece in turn.
test("one stray mention that could be code (`else:`, `x == 5`, an `if x > 5:` block) or an example line just before plain lines doesn't hide a split solution, in one answer or the second of two", async () => {
  for (const id of ["ch1_r5", "ch1_r3", "ch2_r1"]) {
    const ls = linesOf(id), inline = ls.map(l => "`" + l + "`").join(", then ");
    for (const [text, mention] of [[`You don't need an \`else:\` here. Type ${inline}.`, "`else:`"], [`Remember \`x == 5\` asks, it doesn't store. Type ${inline}.`, "`x == 5`"],
      [`An if line looks like:\n${block("if x > 5:")}\nNow yours:\n${ls.map(block).join("\nthen\n")}`, block("if x > 5:")]]) {
      const shown = await guardReply(text, { mode: "hint", grade: graderOf(id) });
      assert.ok(shown.includes(LEAK_LINE) && !allSeen(shown, ls), `${id}: ${shown}`);
      assert.ok(shown.includes(mention), `${id}: the mention itself still shows: ${shown}`);
    }
  }
  for (const id of ["ch1_r1", "ch2_r2", "ch4_r5"]) {
    const ls = codeLinesOf(id), shown = await guardReply(`Type these:\nprint(3 + 4)\n${ls.join("\n")}`, { mode: "hint", grade: graderOf(id) });
    assert.ok(shown.includes(LEAK_LINE) && !allSeen(shown, ls), `${id}: ${shown}`);
    assert.ok(shown.startsWith("Type these:\nprint(3 + 4)\n"), `${id}: the example still shows: ${shown}`);
  }
  // The same in the second of two answers, the first with the rest of the solution.
  for (const [id, say] of [["ch1_r5", l => `You don't need an \`else:\` here. Add \`${l}\`.`], ["ch1_r3", l => `Remember \`x == 5\` asks. Add \`${l}\`.`],
    ["ch4_s1", l => `Then:\nprint(3 + 4)\n${l}`]]) {
    const ls = linesOf(id), first = await guardReply(`Start with:\n${block(ls.slice(0, -1).join("\n"))}`, { mode: "hint", grade: graderOf(id) });
    const shown = await guardReply(say(ls[ls.length - 1]), { mode: "hint", grade: graderOf(id), earlier: earlierCode([{ role: "assistant", content: first }]) });
    assert.ok(shown.includes(LEAK_LINE) && !allSeen(`${first}\n${shown}`, ls), `${id}: ${first}\n${shown}`);
  }
});

test("a long block cut to two lines that can't pass is kept, even dressed up", async () => {
  for (const name of [">>> with output", "indented"]) {
    const reply = shapes("ch1_r5")[name], shown = await guardReply(reply, { mode: "hint", grade: graderOf("ch1_r5") });
    assert.equal(shown, "```python\n" + reply.split("\n").slice(1, 3).join("\n") + "\n# …\n```", name);
  }
});

test("a solution spread over two answers is caught in the second, joined with the first", async () => {
  for (const id of ["ch1_r5", "ch4_r1"]) {
    const ls = codeLinesOf(id), half = Math.ceil(ls.length / 2), grade = graderOf(id);
    const first = await guardReply(`Start with:\n${block(ls.slice(0, half).join("\n"))}`, { mode: "hint", grade });
    assert.ok(!first.includes(LEAK_LINE), `${id}: half a solution is fine`);
    const chat = [{ role: "user", content: "and then?" }, { role: "assistant", content: first }, { role: "user", content: "next" }];
    const second = await guardReply(`Then:\n${block(ls.slice(half).join("\n"))}`, { mode: "hint", grade, earlier: earlierCode(chat) });
    assert.equal(second, `Then:\n${LEAK_LINE}`, id);
  }
  // If the earlier code passes on its own (the kid has it already), the new code isn't blamed for it.
  const grade = graderOf("ch1_r5"), idea = `Adding works in print too:\n${block("print(3 + 4)")}`;
  assert.equal(await guardReply(idea, { mode: "hint", grade, earlier: [codeLinesOf("ch1_r5").join("\n")] }), idea);
});

// Each turn guarded as TutorPanel does, with the code of the turns before it. Returns what the kid saw.
async function chatOf(id, turns) {
  const chat = [], shown = [];
  for (const text of turns) {
    const out = await guardReply(text, { mode: "hint", grade: graderOf(id), earlier: earlierCode(chat) });
    chat.push({ role: "user", content: "and then?" }, { role: "assistant", content: out }); shown.push(out);
  }
  return shown;
}

test("noise in earlier answers (a lone `:`, an `else:`, an example, a prose line) doesn't hide a solution spread over them", async () => {
  for (const id of ["ch1_r5", "ch4_r4"]) {
    // The solution two lines an answer (all a block shows), after some noise.
    const ls = codeLinesOf(id), parts = [];
    for (let i = 0; i < ls.length; i += 2) parts.push(block(ls.slice(i, i + 2).join("\n")));
    const [first, ...rest] = parts;
    for (const turns of [
      ["What happens in the `else:` part?", ...parts],
      ["An if line ends with a `:`. Does yours?", ...parts],
      [`Adding works like \`print(3 + 4)\`. Start with:\n${first}`, ...rest],
      [`print() shows things.\nStart with:\n${first}`, ...rest],
      [`Remember each \`:\`! Start with:\n${first}`, ...rest],
    ]) {
      const shown = await chatOf(id, turns);
      assert.ok(!allSeen(shown.join("\n"), ls), `${id}: ${JSON.stringify(shown)}`);
      assert.ok(shown[shown.length - 1].includes(LEAK_LINE), `${id}: caught in the last answer`);
    }
  }
});

test("earlierCode: the code Byte showed in earlier answers, oldest first, one list an answer, as the kid saw it", () => {
  const chat = [
    { role: "user", content: "help" },
    { role: "assistant", content: "Try `x = 1`. Then:\n```python\na = 1\nb = 2\n# …\n```\ntotal = a + b\nWhat does it print?" },
    { role: "assistant", content: `Like \`…\` here.\n\n${LEAK_LINE}` },
    { role: "assistant", content: `${UNCHECKED_LINE}\n>>> print(total)` },
    { role: "assistant", content: "```python\nlate = 1\n```", pending: true },
    { role: "assistant", content: "```python\nlost = 1\n```", failed: true },
    { role: "user", content: "```python\nmine = 1\n```" },
  ];
  const piece = code => ({ code, plain: false }), line = code => ({ code, plain: true });
  assert.deepEqual(earlierCode(chat), [[piece("x = 1"), piece("a = 1\nb = 2"), line("total = a + b")], [line("print(total)")]]);
  assert.deepEqual(earlierCode([]), []);
});

test("the missing last line of the kid's program is caught; if their program already passes, it isn't checked", async () => {
  for (const id of ["ch1_r5", "ch4_r1"]) {
    const ls = codeLinesOf(id), last = ls[ls.length - 1], program = ls.slice(0, -1).join("\n") + "\n";
    for (const reply of [`Add this at the end:\n${block(last)}`, `Add \`${last}\` at the end.`]) {
      const shown = await guardReply(reply, { mode: "hint", grade: graderOf(id), program });
      assert.ok(shown.includes(LEAK_LINE) && !shown.includes(last.trim()), `${id}: ${shown}`);
    }
  }
  const grade = graderOf("ch1_r5"), reply = `The last line is:\n${block("print(a + b)")}`;
  assert.equal(await guardReply(reply, { mode: "hint", grade, program: solution("ch1_r5") }), reply);
  assert.equal(grade.calls, 2, "the line itself, and the program alone");
  // A program that crashes before its end, or never finishes, isn't joined: lines added after it never run.
  const g2 = graderOf("ch4_r4");
  assert.equal(await guardReply("Try `x = 1`.", { mode: "hint", grade: g2, program: "energy = 10\nwhile energy >= 0:\n    print(energy)" }), "Try `x = 1`.");
  assert.equal(g2.calls, 2, "x = 1, and the program alone");
});

// A mention that could be code breaks the joins after the kid's program too, so they also leave out each piece and
// each plain line in turn.
test("one stray mention (`else:`, `x == 5`, an `if x > 5:` block, an example line) doesn't hide the lines the kid's program is missing", async () => {
  const inline = ls => ls.map(l => "`" + l + "`").join(", then ");
  const cases = [["ch1_r5", 2, ls => `You don't need an \`else:\` here. At the end add ${inline(ls)}.`, "`else:`"],
    ...["ch1_r2", "ch2_r1"].flatMap(id => [[id, 2, ls => `Remember \`x == 5\` asks, it doesn't store. At the end add ${inline(ls)}.`, "`x == 5`"],
      [id, 2, ls => `An if line looks like:\n${block("if x > 5:")}\nAt the end add:\n${ls.map(block).join("\nthen\n")}`, block("if x > 5:")]]),
    ...["ch2_r2", "ch3_r1"].map(id => [id, 1, ls => `Adding works like this:\nprint(3 + 4)\nSo at the end add:\n${ls.join("\n")}`, "\nprint(3 + 4)\n"])];
  for (const [id, k, say, mention] of cases) {
    const ls = codeLinesOf(id), rest = ls.slice(-k), program = ls.slice(0, -k).join("\n") + "\n";
    const shown = await guardReply(say(rest), { mode: "hint", grade: graderOf(id), program });
    assert.ok(shown.includes(LEAK_LINE) && !allSeen(shown, rest), `${id}: ${shown}`);
    assert.ok(shown.includes(mention), `${id}: the mention itself still shows: ${shown}`);
  }
});

test("a wrong attempt that already has every line of the solution doesn't let Byte show the fixed program, split up", async () => {
  for (const [id, wrong] of [["ch1_r2", "wrong_order"], ["ch4_s3", "granted_after_loop"], ["ch6_r1", "loop_inside"]]) {
    const program = fixture(`wrong/${id}__${wrong}.py`), ls = codeLinesOf(id), two = [];
    for (let i = 0; i < ls.length; i += 2) two.push(ls.slice(i, i + 2).join("\n"));
    for (const text of [ls.map(block).join("\nthen\n"), two.map(block).join("\nthen\n"), ls.map(l => "`" + l + "`").join(", then ")]) {
      const shown = await guardReply(`Here:\n${text}`, { mode: "hint", grade: graderOf(id), program });
      assert.ok(shown.includes(LEAK_LINE) && !allSeen(shown, ls), `${id}: ${shown}`);
    }
  }
});

test("pointing at a missing `)` isn't a leak, even though adding one would finish the kid's program", async () => {
  for (const [id, program] of [["ch1_r1", 'print("Hello, World!"'], ["ch1_r5", "a = 15\nb = 27\nprint(a + b"]])
    for (const text of ["Every `(` needs a `)` to close it. Is yours there?", "Count your brackets: every `(` needs a `)`.", "Look at the end of that line. Is a `)` missing?"])
      assert.equal(await guardReply(text, { mode: "hint", grade: graderOf(id), program }), text, `${id}: ${text}`);
});

test("plain lines that look like code are graded; if they pass they become … and prose is left alone", async () => {
  const grade = graderOf("ch1_r5");
  assert.equal(await guardReply("No boxes, okay:\na = 15\nb = 27\nprint(a + b)\nThat's it!", { mode: "hint", grade }),
    `No boxes, okay:\n…\n…\n…\nThat's it!\n\n${LEAK_LINE}`);
  assert.equal(await guardReply("Type:\n>>> a = 15\n>>> b = 27\n>>> print(a + b)\n42", { mode: "hint", grade }), `Type:\n…\n…\n…\n42\n\n${LEAK_LINE}`);
  const prose = "Look at line 2: what does it print?\nTry print on the last line\nIf you add a colon…\nWhat does total = a + b do?";
  const g2 = graderOf("ch1_r5");
  assert.equal(await guardReply(prose, { mode: "hint", grade: g2 }), prose); assert.equal(g2.calls, 0, "prose isn't graded");
  // A plain line that doesn't pass stays, and one idea line is graded once.
  const g3 = graderOf("ch1_r5"), idea = "Numbers add like this:\nprint(3 + 4)\nNow your turn!";
  assert.equal(await guardReply(idea, { mode: "hint", grade: g3 }), idea); assert.equal(g3.calls, 1);
  // A sentence that starts like code, right after the lines, is prose: it doesn't join them and hide the answer.
  assert.equal(await guardReply("Type these:\na = 15\nb = 27\nprint(a + b)\nprint() shows the sum.", { mode: "hint", grade }),
    `Type these:\n…\n…\n…\nprint() shows the sum.\n\n${LEAK_LINE}`);
  // A comment ending in "?" doesn't make a line of code a question.
  assert.equal(await guardReply("Here:\na = 15  # first?\nb = 27  # second?\nprint(a + b)  # sum?\nDone!", { mode: "hint", grade }),
    `Here:\n…\n…\n…\nDone!\n\n${LEAK_LINE}`);
});

test("code shown without its indents is caught too: the guard tries the indents a kid would add", async () => {
  const ls = codeLinesOf("ch4_r4").map(l => l.trim());   // a while loop, its body, and a line after it
  const shown = await guardReply(`One line at a time: ${ls.map(l => "`" + l + "`").join(", then ")}.`, { mode: "hint", grade: graderOf("ch4_r4") });
  assert.equal(shown, `One line at a time: ${ls.map(() => "`…`").join(", then ")}.\n\n${LEAK_LINE}`);
  // The loop's body, after the kid's loop line.
  const body = await guardReply('Inside it, put `print(f"Step {i}")`.', { mode: "hint", grade: graderOf("ch4_r1"), program: "for i in range(5):" });
  assert.equal(body, `Inside it, put \`…\`.\n\n${LEAK_LINE}`);
});

test("indent guesses stop once one never finishes, so a loop reply can't keep the kid waiting", async () => {
  const real = graderOf("ch4_r4"); let slow = 0;
  const grade = async code => { const r = await real(code); if (/never finished/.test(r.feedback)) slow++; return r; };
  const pieces = ["n = 0", "while n < 3:", "a = n", "b = a", "c = b", "d = c", "n = d + 1"];
  await guardReply(`Try ${pieces.map(p => "`" + p + "`").join(", ")}.`, { mode: "hint", grade });
  assert.equal(slow, 1);
});

test("pieces named in another order (the last line first) are caught too", async () => {
  const grade = graderOf("ch1_r5");
  assert.equal(await guardReply("Last line: `print(a + b)`. Above it: `a = 15` and `b = 27`.", { mode: "hint", grade }), `Last line: \`…\`. Above it: \`…\` and \`…\`.\n\n${LEAK_LINE}`);
  assert.equal(await guardReply(`Put this:\n${block("print(a + b)")}\nafter this:\n${block("a = 15\nb = 27")}`, { mode: "hint", grade }), `Put this:\n${LEAK_LINE}\nafter this:\n…`);
});

test("the kid's own lines quoted back aren't blamed, even when indenting them another way would fix the program", async () => {
  const program = fixture("wrong/ch4_s2__adv_print_inside_loop.py"), ls = program.split("\n").filter(l => l.trim()).map(l => l.trim());
  const text = `Look at ${ls.map(l => "`" + l + "`").join(", ")}. Which line runs too often?`;
  assert.equal(await guardReply(text, { mode: "hint", grade: graderOf("ch4_s2"), program }), text);
  // But an unfinished program (an else: with nothing under it) finished by a copy of one of its own lines is caught.
  const sol = codeLinesOf("ch3_r2"), last = sol[sol.length - 1];
  assert.equal(await guardReply(`Under the else:\n${block(last)}`, { mode: "hint", grade: graderOf("ch3_r2"), program: sol.slice(0, -1).join("\n") }), `Under the else:\n${LEAK_LINE}`);
});

test("plain lines that carry on the code above them count too: a dict over several lines, a body line, a comment", async () => {
  for (const id of ["ch7_r4", "ch1_r3"]) {
    const shown = await guardReply(`Type this:\n${solution(id).trim()}\nDone!`, { mode: "hint", grade: graderOf(id) });
    assert.ok(shown.includes(LEAK_LINE), id);
    for (const l of solution(id).split("\n").filter(l => l.trim())) assert.ok(!shown.includes(l.trim()), `${id}: ${l.trim()} is still shown`);
  }
  assert.equal(hideCode('world = {\n    "cave": 8,\n}\ntry:\n    10 / 0\nexcept ZeroDivisionError:\n    pass\n# the end\nThat\'s it.'), "⌛\n⌛\n⌛\n⌛\n⌛\n⌛\n⌛\n⌛\nThat's it.");
  assert.equal(hideCode("print(x,\nThis is words.\n    Still words."), "⌛\nThis is words.\n    Still words.", "an open bracket doesn't swallow prose");
});

test("while a hint streams in, plain lines that look like code are hidden too, and prose isn't", () => {
  assert.equal(hideCode("Look at line 2: what does it print?\nTry print on the last line\nIf you add a colon…\ntotal = 5\n>>> print(total)\n1. x += 1\nfor i in range(3):\n    print(i)\nelse:\nimport math"),
    "Look at line 2: what does it print?\nTry print on the last line\nIf you add a colon…\n⌛\n⌛\n⌛\n⌛\n⌛\n⌛\n⌛");
  assert.equal(hideCode("x == 5 is a question\nnums[0] = 1\nname.upper()\nprint(x)?\nx = 5  # why?"), "x == 5 is a question\n⌛\n⌛\nprint(x)?\n⌛");
  // Code followed by words, or ending like a sentence, is prose.
  const prose = "nums[0] is the first\nname.upper() shouts\nprint() shows the sum.\nreturn the total\nfor loops: they repeat\nx = 5 means x holds 5\nprint(x)!";
  assert.equal(hideCode(prose), prose);
});

test(`a reply with more than ${MAX_PIECES} pieces of code isn't graded: every piece is hidden, with LEAK_LINE once`, async () => {
  const many = n => Array.from({ length: n }, (_, i) => `\`x${i} = ${i}\``).join(" ");
  const grade = graderOf("ch1_r5");
  assert.equal(await guardReply(`Look: ${many(MAX_PIECES + 1)}`, { mode: "hint", grade }), `Look: ${Array(MAX_PIECES + 1).fill("`…`").join(" ")}\n\n${LEAK_LINE}`);
  assert.equal(await guardReply(`${block("a = 1")}\n${block("b = 2")}\n${many(MAX_PIECES - 1)}`, { mode: "hint", grade }).then(s => s.split("\n").slice(0, 2).join("\n")), `${LEAK_LINE}\n…`);
  assert.equal(grade.calls, 0);
  assert.equal(await guardReply(`Look: ${many(MAX_PIECES)}`, { mode: "hint", grade }), `Look: ${many(MAX_PIECES)}`);
  assert.ok(grade.calls > 0 && grade.calls < 30, `${grade.calls} grades`);
});

test("leakCheck says which pieces and lines are caught, and why", async () => {
  const grade = graderOf("ch1_r5");
  const a = await leakCheck("`print(3 + 4)` or\n```python\n    a = 15\n    b = 27\n    print(a + b)\n```", { grade });
  assert.deepEqual(a.pieces.map(p => [p.code, p.caught]), [["print(3 + 4)", ""], ["    a = 15\n    b = 27\n    print(a + b)", ""]]);
  assert.equal(a.passes, false);
  const reasons = async (text, opts = {}, id = "ch1_r5") => { const r = await leakCheck(text, { grade: graderOf(id), ...opts }); return [...r.pieces, ...r.lines].map(x => x.caught); };
  assert.deepEqual(await reasons(block(solution("ch1_r5"))), ["passes"]);
  assert.deepEqual(await reasons(block('>>> print("Hello, World!")\nHello, World!'), {}, "ch1_r1"), ["edited"]);
  assert.deepEqual(await reasons("`a = 15` `b = 27` `print(a + b)`"), ["joined", "joined", "joined"]);
  assert.deepEqual(await reasons("`print(a + b)`", { program: "a = 15\nb = 27" }), ["program"]);
  assert.deepEqual(await reasons('print("Hello, World!")', {}, "ch1_r1"), ["passes"]);
  assert.deepEqual(await reasons("`import js`"), ["unsafe"]);
  const r = await leakCheck("`a = 15` `b = 27` `print(a + b)`", { grade });
  assert.equal(r.passes, true); assert.ok(r.grades > 0);
});

// Ordinary hint replies: they quote the kid's own wrong code (whole, and line by line), the starter, or a one-line
// idea. None of them gives the room away, so none may be touched.
test("replies that quote the kid's wrong code, the starter or a one-line idea are left alone", async () => {
  const wrongs = fs.readdirSync(new URL("./fixtures/wrong/", import.meta.url));
  for (const id of ["ch1_r5", "ch3_r2", "ch4_r1", "ch4_r4", "ch5_r1"]) {
    const programs = [...wrongs.filter(f => f.startsWith(`${id}__`)).slice(0, 4).map(f => fixture(`wrong/${f}`)), ROOMS.get(id).starterCode];
    for (const program of programs) {
      const ls = program.split("\n").filter(l => l.trim() && !l.includes("`"));
      for (const text of [`Here's your code:\n\n${block(program)}\n\nLook at line 2. What does it print?`,
        `Look at ${ls.slice(0, 4).map(l => "`" + l.trim() + "`").join(" and ")}. What happens there?`,
        `Adding works like this:\n\n${block("print(3 + 4)")}\n\nWhere could that go?`]) {
        const shown = await guardReply(text, { mode: "hint", grade: graderOf(id), program });
        assert.equal(shown, text.replace(/```python\n([\s\S]*?)\n```/g, (m, c) => { const x = c.split("\n"); return x.length > 2 ? block(x.slice(0, 2).join("\n") + "\n# …") : m; }), `${id}: ${text}`);
      }
    }
  }
});
