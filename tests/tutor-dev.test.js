// tests/tutor-dev.test.js
// `npm run dev` serves /api/tutor (server/dev.js): the pretend Byte with the one code "dev" when there's no key,
// never "dev" otherwise, and the real HTTP path (streaming, states) through the same handler as Vercel.
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { devSetup, tutorMiddleware, DEV_CODE } from "../server/dev.js";
import { checkCode } from "../server/tutor.js";
import config from "../vite.config.js";

test("with no key in the shell, the dev server's Byte is pretend and its only code is 'dev'", () => {
  const s = devSetup({ TUTOR_DAILY_LIMIT: "2" });
  assert.equal(s.fake, true); assert.equal(DEV_CODE, "dev");
  assert.equal(s.env.TUTOR_CODES, "dev"); assert.equal(s.env.TUTOR_DAILY_LIMIT, "2");
  assert.equal(typeof s.deps.fetch.calls, "object", "the fake OpenRouter"); assert.equal(typeof s.deps.counter.incr, "function");
});

test("with a real key in the shell, the shell's own codes apply and 'dev' is not one", () => {
  const env = { OPENROUTER_API_KEY: "sk-or-shell", TUTOR_CODES: "maple-42" }, s = devSetup(env);
  assert.equal(s.fake, false); assert.equal(s.env, env); assert.equal(s.deps.fetch, undefined, "the real fetch");
  assert.equal(s.deps.counter, null, "no Upstash settings, no cap");
  assert.equal(checkCode("dev", s.env.TUTOR_CODES), false);
});

test("vite.config.js adds the dev hook, for `vite` (serve) only, never the build", () => {
  const p = config.plugins.flat(Infinity).find(x => x?.name === "tutor-dev");
  assert.ok(p, "the tutor-dev plugin"); assert.equal(p.apply, "serve"); assert.equal(typeof p.configureServer, "function");
});

test("over HTTP: GET is ready, 'dev' streams the pretend reply with the questions left, a wrong code is locked, then recharging", async () => {
  const mw = tutorMiddleware(devSetup({ TUTOR_DAILY_LIMIT: "2" }));
  const server = http.createServer((req, res) => mw(req, res, () => { res.statusCode = 404; res.end(); }));
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}/api/tutor`;
  const post = body => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const ask = { tutorCode: "dev", mode: "hint", task: "Print Hello, World!", program: 'prnt("hi")', question: "why?" };
  try {
    assert.deepEqual(await (await fetch(url)).json(), { state: "ready", dailyCap: true });
    assert.deepEqual(await (await post({ tutorCode: "dev", check: true })).json(), { state: "ready" });
    const res = await post(ask);
    assert.equal(res.status, 200); assert.equal(res.headers.get("x-tutor-remaining"), "1");
    const pieces = []; const dec = new TextDecoder();
    for await (const c of res.body) pieces.push(dec.decode(c, { stream: true }));
    assert.match(pieces.join(""), /^Pretend Byte here!/); assert.ok(pieces.length > 1, "it streams in pieces");
    assert.equal((await post({ ...ask, tutorCode: "maple-42" })).status, 401);
    assert.equal((await post({ ...ask, question: "please fail" })).status, 502);   // the fake's "fail": busy (and it counted)
    assert.deepEqual(await (await post(ask)).json(), { state: "recharging" });
    assert.equal((await fetch(url, { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" })).status, 415);
  } finally { server.close(); }
});
