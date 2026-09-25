// tests/hints.test.js
// Kids copy the room hints, and the code in a task, into the editor, so code written there must be code
// Python accepts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { CHAPTERS, GRIND_CHALLENGES } from "../src/content.js";

const python = spawnSync("python3", ["--version"]).status === 0 ? "python3" : null;
const challenges = [...CHAPTERS.flatMap(c => [...c.rooms, c.boss].filter(Boolean)), ...GRIND_CHALLENGES.map((g, i) => ({ ...g, id: `grind_${i}` }))];
// Each hint whole, and each line of each task: a task's code sits on lines of its own among its prose.
const texts = challenges.flatMap(c => [
  ...(c.hints || []).map((text, i) => ({ key: `${c.id} hint ${i}`, text })),
  ...(c.task || "").split("\n").map((text, i) => ({ key: `${c.id} task line ${i + 1}`, text })),
]);

// A block squeezed onto one line, which Python rejects: `if x: a() else: b()`, `def f(g): if ...`,
// `for ...: if ...:`, or a block after a semicolon.
const ONE_LINE_BLOCK = [/:\s*\S.*\b(else|elif)\b\s*[:\w]/, /\bdef\b[^\n]*\):\s*(if|for|while)\b/, /:\s*(if|for|while|def)\b[^\n]*:/,
  /;\s*(if|for|while|def|elif|else)\b/];
// Prose that only looks like one: grind_4's grade scale, "90+: A, 80+: B, 70+: C, 60+: D, else: F".
const PROSE = new Set(["grind_4 task line 2"]);

test("no hint or task line puts a block on one line, so a kid who copies it gets working code", { skip: !python && "python3 not installed" }, () => {
  const suspects = texts.filter(t => !PROSE.has(t.key) && ONE_LINE_BLOCK.some(re => re.test(t.text)));
  const r = spawnSync(python, ["-c", "import json, sys\nfor t in json.load(sys.stdin):\n    try:\n        compile(t['text'], 'hint', 'exec')\n    except SyntaxError:\n        print(t['key'])"],
    { input: JSON.stringify(suspects), encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.stdout.split("\n").filter(Boolean), []);
});

test("the prose exception is still prose that the check would flag, so it can't hide a real one", () => {
  for (const key of PROSE) {
    const t = texts.find(x => x.key === key);
    assert.ok(t, `${key} no longer exists`);
    assert.ok(ONE_LINE_BLOCK.some(re => re.test(t.text)), `${key} no longer needs the exception`);
    assert.doesNotMatch(t.text, /print\(|=/, `${key} looks like code now`);
  }
});
