// tests/grading.test.js
// Regression suite: every challenge graded for real in Pyodide.
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { makeCore } from "./helpers/python.js";
import { CHECKS } from "../src/checks.js";
import { CHAPTERS, GRIND_CHALLENGES } from "../src/content.js";

const challenges = [...CHAPTERS.flatMap(c => [...c.rooms, c.boss]), ...GRIND_CHALLENGES.map((g, i) => ({ ...g, id: `grind_${i}` }))];
const fixture = (dir, f) => fs.readFileSync(new URL(`./fixtures/${dir}/${f}`, import.meta.url), "utf8");
const list = dir => fs.readdirSync(new URL(`./fixtures/${dir}/`, import.meta.url)).filter(f => f.endsWith(".py"));

let t;
before(async () => { t = await makeCore(); });
// The page sends the rule and inputs as JSON text (see runner.js's gradeCode), so do the same here.
// A crash inside grading also reports passed: false, so it must not count as catching a wrong answer.
const grade = (c, code) => {
  t.messages.length = 0;
  t.core.grade({ id: "g", code, rule: JSON.stringify(CHECKS[c.id]), starter: c.starterCode || "", inputs: "[]", attempt: 1 });
  const g = t.messages.find(m => m.type === "graded");
  assert.equal(g.internal, undefined, `grading crashed: ${g.internal}`);
  return g;
};

describe("every challenge", () => {
  for (const c of challenges) {
    test(`${c.id}: the reference solution passes`, () => {
      const g = grade(c, fixture("solutions", `${c.id}.py`)); assert.equal(g.passed, true, g.feedback);
    });
    test(`${c.id}: the untouched starter fails`, () => assert.equal(grade(c, c.starterCode || "").passed, false));
    test(`${c.id}: print("hello") fails`, () => assert.equal(grade(c, 'print("hello")').passed, false));
  }
});

describe("alternative correct answers pass", () => {
  for (const f of list("alternatives")) test(f, () => {
    const c = challenges.find(x => x.id === f.split("__")[0]);
    const g = grade(c, fixture("alternatives", f)); assert.equal(g.passed, true, g.feedback);
  });
});

describe("wrong answers fail", () => {
  for (const f of list("wrong")) test(f, () => {
    const c = challenges.find(x => x.id === f.split("__")[0]);
    assert.equal(grade(c, fixture("wrong", f)).passed, false);
  });
});
