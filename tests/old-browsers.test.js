// tests/old-browsers.test.js
// On a browser too old for Pyodide the game still works, with the keyword checker (README). That holds down to
// what the build targets: Vite 6's default, Chrome 87 and Safari 14 (vite.config.js sets no build.target). The
// build rewrites newer syntax for them, but it never adds missing built-ins, and a regex lookbehind or d/v flag
// can't be rewritten at all. One newer call on the render path shows "Something crashed!" in every room on those
// devices, so this reads every file in src/ and fails on the built-ins and regex features they lack.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import babelTraverse from "@babel/traverse";

const traverse = babelTraverse.default ?? babelTraverse;   // a CommonJS module: its function is on .default

// Methods any object might carry, by name: all newer than Chrome 87 or Safari 14.
const METHODS = new Set(["at", "findLast", "findLastIndex", "toSorted", "toReversed", "toSpliced", "throwIfAborted", "isWellFormed", "toWellFormed"]);
// Static functions, as Object.name.
const STATICS = new Set(["Object.hasOwn", "Object.groupBy", "Map.groupBy", "Array.fromAsync", "Promise.withResolvers",
  "AbortSignal.timeout", "AbortSignal.any", "crypto.randomUUID"]);
// Globals, when nothing in the file declares the name. (hasBinding(name, true): Babel counts built-in globals as
// declared unless told not to.)
const GLOBALS = new Set(["structuredClone", "WeakRef", "FinalizationRegistry", "TextDecoderStream", "TextEncoderStream"]);
const LOOKBEHIND = /\(\?<[=!]/;

// Each newer feature a piece of code uses, as "line: what".
export function newerFeatures(source) {
  const found = [], at = n => n.loc?.start.line ?? "?";
  const regex = (node, pattern, flags = "") => {
    if (LOOKBEHIND.test(pattern)) found.push(`${at(node)}: regex lookbehind`);
    if (/[dv]/.test(flags)) found.push(`${at(node)}: regex flag ${flags.match(/[dv]/)[0]}`);
  };
  const member = n => (n.type === "MemberExpression" || n.type === "OptionalMemberExpression") && !n.computed ? n : null;
  traverse(parse(source, { sourceType: "module", plugins: ["jsx"] }), {
    // One visitor per node type: Babel keeps only the last of two visitors for the same type.
    "CallExpression|OptionalCallExpression|NewExpression"(p) {
      const m = member(p.node.callee), [pattern, flags] = p.node.arguments;
      if (m && METHODS.has(m.property.name)) found.push(`${at(p.node)}: .${m.property.name}()`);
      if (p.node.callee.type === "Identifier" && p.node.callee.name === "RegExp" && pattern?.type === "StringLiteral")
        regex(p.node, pattern.value, flags?.type === "StringLiteral" ? flags.value : "");
    },
    "MemberExpression|OptionalMemberExpression"(p) {
      const m = member(p.node);
      if (m && m.object.type === "Identifier" && STATICS.has(`${m.object.name}.${m.property.name}`) && !p.scope.hasBinding(m.object.name, true))
        found.push(`${at(p.node)}: ${m.object.name}.${m.property.name}`);
    },
    Identifier(p) {
      if (GLOBALS.has(p.node.name) && p.isReferencedIdentifier() && !p.scope.hasBinding(p.node.name, true)) found.push(`${at(p.node)}: ${p.node.name}`);
    },
    RegExpLiteral(p) { regex(p.node, p.node.pattern, p.node.flags); },
  });
  return found;
}

const SRC = new URL("../src/", import.meta.url);
const files = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? files(p) : /\.(js|jsx)$/.test(e.name) ? [p] : [];
});

test("the scan knows each newer feature, and leaves older look-alikes alone", () => {
  assert.equal(newerFeatures(`a.at(-1); a?.at(0); b.findLast(f); Object.hasOwn(o, "x"); structuredClone(x); new WeakRef(o);
    /(?<=a)b/; /(?<!a)b/; /x/d; /x/v; new RegExp("(?<=a)b"); RegExp("x", "d"); AbortSignal.timeout(5); crypto.randomUUID();`).length, 14);
  assert.deepEqual(newerFeatures(`a[a.length - 1]; a.slice(-1)[0]; a.find(f); Object.keys(o); s.replaceAll("a", "b"); Promise.any(ps);
    /(?<name>a)b/; /x/gimsuy; new RegExp("(?<n>a)"); const structuredClone = v => v; structuredClone(1);
    function f(Object) { return Object.hasOwn(1); } const o = { at: 1 }; o.at; x["at"](1);`), []);
});

test("nothing in src/ uses a built-in or regex feature that Chrome 87 or Safari 14 lacks", () => {
  const all = files(SRC.pathname);
  assert.ok(all.some(f => f.endsWith("App.jsx")) && all.some(f => f.endsWith("py.worker.js")), "src/ was read");
  const found = all.flatMap(f => newerFeatures(fs.readFileSync(f, "utf8")).map(x => `${path.relative(SRC.pathname, f)}:${x}`));
  assert.deepEqual(found, []);
});
