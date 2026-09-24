// tests/checks.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { CHECKS } from "../src/checks.js";
import { BATCH_A } from "../src/checks/batch-a.js";
import { BATCH_B } from "../src/checks/batch-b.js";
import { BATCH_C } from "../src/checks/batch-c.js";
import { CHAPTERS, GRIND_CHALLENGES } from "../src/content.js";

const ids = [...CHAPTERS.flatMap(c => [...c.rooms.map(r => r.id), c.boss.id]), ...GRIND_CHALLENGES.map((_, i) => `grind_${i}`)];
const KEYS = new Set(["output", "concepts", "probes", "inputs", "seed"]);

test("every challenge has a rule", () => assert.deepEqual(ids.filter(id => !CHECKS[id]), []));
test("no rule for an unknown challenge", () => assert.deepEqual(Object.keys(CHECKS).filter(id => !ids.includes(id)), []));
// checks.js spreads the batches together, so a rule in two batches would silently replace the other.
test("no challenge has a rule in two batches", () => {
  const all = [BATCH_A, BATCH_B, BATCH_C].flatMap(Object.keys);
  assert.deepEqual(all.filter((id, i) => all.indexOf(id) !== i), []);
});
for (const [id, rule] of Object.entries(CHECKS)) test(`${id}: rule shape`, () => {
  for (const k of Object.keys(rule)) assert.ok(KEYS.has(k), `unknown key ${k}`);
  assert.ok(rule.output?.length, "at least one output check");
  for (const group of ["output", "concepts", "probes"]) for (const c of rule[group] || []) {
    assert.equal(typeof c.expr, "string");
    if (group !== "output") assert.ok(c.hint && c.hint.length > 10, `${group} checks need a kid-facing hint`);
  }
});
