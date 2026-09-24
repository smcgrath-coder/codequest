// src/checks.js
// Per-challenge grading rules, applied inside Python by src/python/grading.py.
// A rule: { output: [check], concepts?: [check], probes?: [check], inputs?: [str], seed?: int }
// A check: { expr: "<Python expression>", hint?: "<what to tell the kid if it fails>" }
// The rules live in three batches under src/checks/, one per group of chapters.
import { BATCH_A } from "./checks/batch-a.js";
import { BATCH_B } from "./checks/batch-b.js";
import { BATCH_C } from "./checks/batch-c.js";

export const CHECKS = { ...BATCH_A, ...BATCH_B, ...BATCH_C };
