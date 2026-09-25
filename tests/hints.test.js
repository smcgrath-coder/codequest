// tests/hints.test.js
// Kids copy the room hints into the editor, so a hint written as code must be code Python accepts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { CHAPTERS, GRIND_CHALLENGES } from "../src/content.js";

const python = spawnSync("python3", ["--version"]).status === 0 ? "python3" : null;
const challenges = [...CHAPTERS.flatMap(c => [...c.rooms, c.boss].filter(Boolean)), ...GRIND_CHALLENGES.map((g, i) => ({ ...g, id: `grind_${i}` }))];
const hints = challenges.flatMap(c => (c.hints || []).map((text, i) => ({ key: `${c.id}#${i}`, text })));

// A block squeezed onto one line, which Python rejects: `if x: a() else: b()`, `def f(g): if ...`, `for ...: if ...:`.
const ONE_LINE_BLOCK = [/:\s*\S.*\b(else|elif)\b\s*[:\w]/, /\bdef\b[^\n]*\):\s*(if|for|while)\b/, /:\s*(if|for|while|def)\b[^\n]*:/];
// Hints still written that way. Take one off the list when it is fixed; the last test makes sure of it.
const STILL_TO_FIX = new Set(["ch3_s1#0", "ch4_r3#1", "ch4_boss#0", "ch9_s3#0", "ch10_r3#0", "ch12_r5#0"]);

// The keys of the hints that look like a one-line block and that Python won't compile.
function broken() {
  const suspects = hints.filter(h => ONE_LINE_BLOCK.some(re => re.test(h.text)));
  const r = spawnSync(python, ["-c", "import json, sys\nfor h in json.load(sys.stdin):\n    try:\n        compile(h['text'], 'hint', 'exec')\n    except SyntaxError:\n        print(h['key'])"],
    { input: JSON.stringify(suspects), encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.split("\n").filter(Boolean);
}

test("no hint puts a block on one line, so a kid who copies it gets working code", { skip: !python && "python3 not installed" }, () => {
  assert.deepEqual(broken().filter(k => !STILL_TO_FIX.has(k)), []);
});

test("every hint on the still-to-fix list is still broken, so the list stays true", { skip: !python && "python3 not installed" }, () => {
  const now = new Set(broken());
  assert.deepEqual([...STILL_TO_FIX].filter(k => !now.has(k)), []);
});
