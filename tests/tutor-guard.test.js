// tests/tutor-guard.test.js
// The leak guard (guardReply and leakCheck in src/tutor.js) with real grading in Pyodide: in hint mode code that
// would pass the room is replaced, even split into pieces, dressed up (>>> prompts, indents, its output), typed as
// plain lines, spread over two answers or added to the kid's program; a one-line syntax example, the kid's own wrong
// code and the starter aren't. Long blocks are cut, and when the grader can't say it fails closed. Open mode is left
// alone.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { makeCore } from "./helpers/python.js";
import { CHECKS } from "../src/checks.js";
import { CHAPTERS } from "../src/content.js";
import { guardReply, leakCheck, earlierCode, graderFor, codeIn, replyParts, hideCode, LEAK_LINE, UNCHECKED_LINE, HINT_BLOCK_LINES, MAX_PIECES } from "../src/tutor.js";

const ROOMS = new Map(CHAPTERS.flatMap(c => [...c.rooms, c.boss]).map(c => [c.id, c]));
const fixture = p => fs.readFileSync(new URL(`./fixtures/${p}`, import.meta.url), "utf8");
const solution = id => fixture(`solutions/${id}.py`);
const block = code => "```python\n" + code.trimEnd() + "\n```";
// A solution's lines of code, without comments or blank lines.
const codeLinesOf = id => solution(id).split("\n").filter(l => l.trim() && !l.trim().startsWith("#"));

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

test("earlierCode: the code Byte showed in earlier answers, oldest first, as the kid saw it", () => {
  const chat = [
    { role: "user", content: "help" },
    { role: "assistant", content: "Try `x = 1`. Then:\n```python\na = 1\nb = 2\n# …\n```\ntotal = a + b\nWhat does it print?" },
    { role: "assistant", content: `Like \`…\` here.\n\n${LEAK_LINE}` },
    { role: "assistant", content: `${UNCHECKED_LINE}\n>>> print(total)` },
    { role: "assistant", content: "```python\nlate = 1\n```", pending: true },
    { role: "assistant", content: "```python\nlost = 1\n```", failed: true },
    { role: "user", content: "```python\nmine = 1\n```" },
  ];
  assert.deepEqual(earlierCode(chat), ["x = 1", "a = 1\nb = 2", "total = a + b", "print(total)"]);
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
});

test("code shown without its indents is caught too: the guard tries the indents a kid would add", async () => {
  const ls = codeLinesOf("ch4_r4").map(l => l.trim());   // a while loop, its body, and a line after it
  const shown = await guardReply(`One line at a time: ${ls.map(l => "`" + l + "`").join(", then ")}.`, { mode: "hint", grade: graderOf("ch4_r4") });
  assert.equal(shown, `One line at a time: ${ls.map(() => "`…`").join(", then ")}.\n\n${LEAK_LINE}`);
  // The loop's body, after the kid's loop line.
  const body = await guardReply('Inside it, put `print(f"Step {i}")`.', { mode: "hint", grade: graderOf("ch4_r1"), program: "for i in range(5):" });
  assert.equal(body, `Inside it, put \`…\`.\n\n${LEAK_LINE}`);
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
  assert.equal(hideCode("print(x (the box\nThis is words.\n    Still words."), "⌛\nThis is words.\n    Still words.", "an open bracket doesn't swallow prose");
});

test("while a hint streams in, plain lines that look like code are hidden too, and prose isn't", () => {
  assert.equal(hideCode("Look at line 2: what does it print?\nTry print on the last line\nIf you add a colon…\ntotal = 5\n>>> print(total)\n1. x += 1\nfor i in range(3):\n    print(i)\nelse:\nimport math"),
    "Look at line 2: what does it print?\nTry print on the last line\nIf you add a colon…\n⌛\n⌛\n⌛\n⌛\n⌛\n⌛\n⌛");
  assert.equal(hideCode("x == 5 is a question\nnums[0] is the first\nname.upper() shouts\nprint(x)?"), "x == 5 is a question\n⌛\n⌛\nprint(x)?");
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
