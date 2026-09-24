// Grader regression suite: every challenge has a natural reference solution
// (tests/fixtures/solutions/<id>.py, written from the starter code the way a
// kid following the task would). The grader must accept it and must not
// accept the untouched starter code.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateOffline } from "../src/grader.js";
import { CHAPTERS, GRIND_CHALLENGES } from "../src/content.js";

const DIR = new URL("./fixtures/solutions/", import.meta.url);

const challenges = [
  ...CHAPTERS.flatMap(ch => [
    ...ch.rooms.map(r => ({ ...r, kind: r.optional ? "side quest" : "main room" })),
    { ...ch.boss, kind: "boss" },
  ]),
  ...GRIND_CHALLENGES.map((g, i) => ({ ...g, id: `grind_${i}`, kind: "practice" })),
];

// Natural solutions the keyword grader still rejects, for reasons outside the
// fixes made so far. Each entry must keep failing; when a later fix makes one
// pass, the test below says so and the entry should be deleted.
const KNOWN_REJECTED = {};

// Starter code the keyword grader accepts because its only generated check is
// already satisfied. Same rule: keep failing until fixed, then delete.
const KNOWN_STARTER_PASSES = {};

// Exactly how many challenges still accept print("hello"). The keyword grader
// cannot catch every wrong answer; when a fix lowers this, lower the number.
const PRINT_HELLO_COUNT = 24;

const solution = id => fs.readFileSync(new URL(`${id}.py`, DIR), "utf8");
const stdinFor = id => {
  const f = new URL(`${id}.stdin`, DIR);
  return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "";
};

describe("reference solutions", () => {
  for (const c of challenges) {
    test(`${c.id} (${c.kind}): fixture keeps every starter line, in order`, () => {
      const lines = solution(c.id).split("\n").map(l => l.trimEnd());
      let at = 0;
      for (const want of (c.starterCode || "").split("\n").map(l => l.trimEnd()).filter(Boolean)) {
        at = lines.indexOf(want, at);
        assert.notEqual(at, -1, `starter line missing or out of order: ${want}`);
        at++;
      }
    });

    if (KNOWN_REJECTED[c.id]) {
      test(`${c.id}: still rejected (known: ${KNOWN_REJECTED[c.id]})`, () => {
        assert.equal(validateOffline(solution(c.id), c, 0).passes, false,
          `${c.id} now passes — remove it from KNOWN_REJECTED`);
      });
      continue;
    }

    test(`${c.id} (${c.kind}): grader accepts the reference solution`, () => {
      for (const attempt of [0, 2]) {
        const r = validateOffline(solution(c.id), c, attempt);
        assert.equal(r.error, null, `error shown to the kid: ${r.error}`);
        assert.equal(r.passes, true, `feedback shown to the kid: ${r.feedback}`);
      }
    });
  }

  test("every main-track room and boss is solvable (none may be listed as known-rejected)", () => {
    const blocked = challenges.filter(c => (c.kind === "main room" || c.kind === "boss") && KNOWN_REJECTED[c.id]);
    assert.deepEqual(blocked.map(c => c.id), []);
  });
});

describe("starter code alone does not pass", () => {
  for (const c of challenges) {
    if (KNOWN_STARTER_PASSES[c.id]) {
      test(`${c.id}: starter still passes (known: ${KNOWN_STARTER_PASSES[c.id]})`, () => {
        assert.equal(validateOffline(c.starterCode || "", c, 0).passes, true,
          `${c.id} starter is now rejected — remove it from KNOWN_STARTER_PASSES`);
      });
      continue;
    }
    test(`${c.id}`, () => {
      assert.equal(validateOffline(c.starterCode || "", c, 0).passes, false);
    });
  }

  test("no main-track room or boss is listed as a known starter pass", () => {
    const listed = challenges.filter(c => (c.kind === "main room" || c.kind === "boss") && KNOWN_STARTER_PASSES[c.id]);
    assert.deepEqual(listed.map(c => c.id), []);
  });
});

test(`print("hello") passes exactly ${PRINT_HELLO_COUNT} challenges`, () => {
  const accepted = challenges.filter(c => validateOffline('print("hello")', c, 0).passes).length;
  assert.equal(accepted, PRINT_HELLO_COUNT,
    accepted < PRINT_HELLO_COUNT ? `now ${accepted}: lower PRINT_HELLO_COUNT` : `${accepted} challenges accept print("hello")`);
});

const python = spawnSync("python3", ["--version"]).status === 0 ? "python3" : null;

describe("reference solutions run in real Python", { skip: !python && "python3 not installed" }, () => {
  for (const c of challenges) {
    test(`${c.id}`, () => {
      const file = fileURLToPath(new URL(`${c.id}.py`, DIR));
      const r = spawnSync(python, [file], {
        input: stdinFor(c.id), timeout: 10000, encoding: "utf8",
        env: { ...process.env, PYTHONUTF8: "1" },
      });
      assert.equal(r.status, 0, `python3 exited ${r.status}\n${r.stderr}`);
    });
  }
});
