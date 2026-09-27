// tests/tutor-dev.test.js
// `npm run dev` serves /api/tutor (server/dev.js): the pretend Byte with the one code "dev" when there's no key,
// never "dev" otherwise, the real HTTP path (streaming, states) through the same handler as Vercel, and only for a
// Host that Vite itself would answer.
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { devSetup, tutorMiddleware, tutorDev, hostAllowed, DEV_CODE } from "../server/dev.js";
import { checkCode } from "../server/tutor.js";
import config from "../vite.config.js";

// A server for a middleware, on a free port. The 404 stands for Vite's own middlewares.
async function serve(mw) {
  const server = http.createServer((req, res) => mw(req, res, () => { res.statusCode = 404; res.end(); }));
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  return { server, port: server.address().port };
}
// A request with its own Host header, as a DNS-rebinding page's would have (fetch can't set Host).
const send = (port, host, { method = "GET", path = "/api/tutor", body } = {}) => new Promise((resolve, reject) => {
  const req = http.request({ host: "127.0.0.1", port, path, method, headers: { host, ...(body && { "content-type": "application/json" }) } }, res => {
    let text = ""; res.setEncoding("utf8"); res.on("data", c => { text += c; }); res.on("end", () => resolve({ status: res.statusCode, text }));
  });
  req.on("error", reject); req.end(body);
});

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

test("hostAllowed is Vite's own host check: localhost, *.localhost, IP literals, and server.allowedHosts", () => {
  for (const h of ["localhost", "localhost:5173", "byte.localhost:5173", "127.0.0.1:5173", "192.168.1.20:5173", "[::1]:5173", "[fe80::1]"]) assert.equal(hostAllowed(h), true, h);
  for (const h of ["evil.example", "evil.example:5173", "localhost.evil.example", "127.0.0.1.evil.example", "[::1", "[evil.example]:80", "", undefined])
    assert.equal(hostAllowed(h), false, String(h));
  const allowedHosts = [".example.com", "mybox.lan"];
  for (const h of ["example.com", "a.example.com:5173", "a.b.example.com", "mybox.lan:5173"]) assert.equal(hostAllowed(h, { allowedHosts }), true, h);
  for (const h of ["notexample.com", "sub.mybox.lan", "example.com.evil.example"]) assert.equal(hostAllowed(h, { allowedHosts }), false, h);
  assert.equal(hostAllowed("mybox.local:5173", { extraHosts: ["mybox.local"] }), true, "a name Vite adds itself, like server.host");
  assert.equal(hostAllowed("evil.example", { allowedHosts: true }), true, "true allows every host");
});

test("over HTTP: a Host Vite wouldn't answer (a DNS-rebinding page) gets 403 bad-request, and nothing is counted or asked", async () => {
  const setup = devSetup({}), { server, port } = await serve(tutorMiddleware(setup));
  const ask = JSON.stringify({ tutorCode: "dev", mode: "hint", task: "Print Hello, World!", program: 'prnt("hi")', question: "why?" });
  try {
    for (const method of ["GET", "POST"])
      assert.deepEqual(await send(port, "evil.example:5173", { method, body: method === "POST" ? ask : undefined }), { status: 403, text: '{"state":"bad-request"}' }, method);
    assert.equal(setup.deps.fetch.calls.length, 0); assert.equal(setup.deps.counter.counts.size, 0);
    assert.equal((await send(port, `localhost:${port}`, { method: "POST", body: ask })).status, 200);
  } finally { server.close(); }
});

test("the Vite plugin checks hosts as Vite is set up: server.allowedHosts, the names Vite adds itself, true, and https", async () => {
  // A stand-in for Vite's dev server, with the plugin's middleware added to it
  const plugin = server => { let mw; tutorDev().configureServer({ config: { logger: { info() {} }, server, additionalAllowedHosts: ["mybox.local"] }, middlewares: { use: f => { mw = f; } } }); return serve(mw); };
  const listed = await plugin({ allowedHosts: [".example.com"] }), any = await plugin({ allowedHosts: true }), tls = await plugin({ allowedHosts: [], https: {} });
  try {
    for (const [host, status] of [["a.example.com:5173", 200], ["mybox.local:5173", 200], ["127.0.0.1", 200], ["evil.example", 403]]) assert.equal((await send(listed.port, host)).status, status, host);
    assert.equal((await send(listed.port, "evil.example", { path: "/" })).status, 404, "other paths are left to Vite, whose own check answers them");
    assert.equal((await send(any.port, "evil.example")).status, 200, "allowedHosts: true");
    assert.equal((await send(tls.port, "evil.example")).status, 200, "Vite skips its host check over https, so this does too");
  } finally { for (const { server } of [listed, any, tls]) server.close(); }
});
