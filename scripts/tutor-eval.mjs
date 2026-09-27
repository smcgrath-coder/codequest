// scripts/tutor-eval.mjs: `npm run tutor:eval`
// The stuck-kid evals against the real model, for Scott to run with his own key:
//   read -rs OPENROUTER_API_KEY && export OPENROUTER_API_KEY   (paste the key; it stays out of shell history)
//   npm run tutor:eval                                         (add -- --show to print each reply)
// TUTOR_MODEL picks another model. Each scenario goes through the game's own handler, then the checks: no code that
// passes the room in hint mode (however it's split or dressed up), a short reply, staying on topic, and not saying
// what a scenario's mustNotSay lists. Each line is what a kid would see (after the leak guard), with what the guard
// caught from the model's raw reply. Exits 1 if a kid would see a problem.
// Without OPENROUTER_API_KEY it sends nothing.
import { SCENARIOS, evalPython, scenarioPayload, askScenario, checkReply, guardedFor } from "./tutor-evals.js";
import { DEFAULT_MODEL } from "../server/tutor.js";

if (!process.env.OPENROUTER_API_KEY) {
  console.log("Set OPENROUTER_API_KEY to run the evals against the real model (the questions are billed to that key):\n  read -rs OPENROUTER_API_KEY && export OPENROUTER_API_KEY\n  npm run tutor:eval\nNothing was sent.");
  process.exit(1);
}
const py = await evalPython();
console.log(`Byte evals: ${SCENARIOS.length} scenarios on ${process.env.TUTOR_MODEL?.trim() || DEFAULT_MODEL}\n`);
let failed = 0;
for (const s of SCENARIOS) {
  const { room, payload } = scenarioPayload(s, py);
  const r = await askScenario(payload, { env: process.env, fetch: globalThis.fetch });
  if (r.state !== "ok") { failed++; console.log(`✗ ${s.id}: no reply (${r.state})`); continue; }
  const raw = await checkReply(s, room, r.text, py), kid = await checkReply(s, room, await guardedFor(s, room, r.text, py), py);
  if (kid.length) failed++;
  console.log(`${kid.length ? "✗" : "✓"} ${s.id}${kid.length ? `: ${kid.join("; ")}` : ""}${raw.length && !kid.length ? ` (the guard caught: ${raw.join("; ")})` : ""}`);
  if (process.argv.includes("--show")) console.log(r.text.replace(/^/gm, "    "), "\n");
}
console.log(`\n${SCENARIOS.length - failed} of ${SCENARIOS.length} passed`);
process.exit(failed ? 1 : 0);
