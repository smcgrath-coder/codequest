// tests/tutor-sse.test.js
// Reading OpenRouter's stream (server/sse.js), fed by the fake OpenRouter (server/fake-openrouter.js): text pieces
// out of SSE split at every byte, keep-alive comments skipped, and errors inside a 200 stream.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readSSE, streamText, UpstreamError, readErrorBody } from "../server/sse.js";
import { sseFor, sseError, streamOf, fakeOpenRouter, devReply } from "../server/fake-openrouter.js";

const REPLY = "Look at line 1 👀 — what does print need?\n\n```python\nprint(\"hi\")\n```";
const collect = async body => { let out = ""; for await (const t of streamText(body)) out += t; return out; };
const bytes = s => new TextEncoder().encode(s).length;

test("the reply comes out whole wherever the stream is cut, even inside an emoji or a \\r\\n", async () => {
  const sse = sseFor(REPLY).replace("data: [DONE]\n\n", "data: [DONE]\r\n\r\n");
  for (let size = 1; size <= 23; size++) assert.equal(await collect(streamOf(sse, { size })), REPLY, `pieces of ${size}`);
  assert.equal(await collect(streamOf(sseFor(REPLY), { size: bytes(sseFor(REPLY)) })), REPLY, "all in one piece");
});

test("keep-alive comments, the empty first chunk and the usage chunk give no text; [DONE] ends it", async () => {
  const payloads = []; for await (const p of readSSE(streamOf(sseFor("hi there")))) payloads.push(JSON.parse(p));
  assert.equal(payloads.length, 5, "empty first, two words, stop, usage");
  assert.ok(payloads.at(-1).usage); assert.equal(await collect(streamOf(sseFor("hi there") + "data: {\"late\":1}\n\n")), "hi there", "nothing after [DONE]");
  assert.equal(await collect(streamOf(`data:${JSON.stringify({ choices: [{ delta: { content: "no space" } }] })}`)), "no space", "data: with no space, and no blank line at the end");
});

test("an error event throws, before any text or after some", async () => {
  await assert.rejects(collect(streamOf(sseError(502, "provider_unavailable"))), e => e instanceof UpstreamError && e.code === 502 && e.type === "provider_unavailable");
  const got = [];
  await assert.rejects(async () => { for await (const t of streamText(streamOf(sseFor("Let me see").replace(/data: \{[^\n]*"stop"[\s\S]*$/, "") + sseError(429, "rate_limit_exceeded")))) got.push(t); },
    e => e.code === 429 && e.type === "rate_limit_exceeded");
  assert.equal(got.join(""), "Let me see");
});

test("a stream with no text at all is an error: 'length' when reasoning used up the tokens, else 'empty'", async () => {
  const lengthOnly = `data: ${JSON.stringify({ choices: [{ delta: { content: "" }, finish_reason: "length" }] })}\n\ndata: [DONE]\n\n`;
  await assert.rejects(collect(streamOf(lengthOnly)), e => e.type === "length");
  await assert.rejects(collect(streamOf(": OPENROUTER PROCESSING\n\ndata: [DONE]\n\n")), e => e.type === "empty");
});

test("an error's message isn't kept (a provider's could quote the prompt); a failed response's error body is read", async () => {
  assert.equal(new UpstreamError({ code: 403, message: "flagged: <the kid's question>" }).message, "upstream error");
  assert.deepEqual(await readErrorBody(Response.json({ error: { code: 402, message: "no credits" } }, { status: 402 })), { code: 402, message: "no credits" });
  assert.deepEqual(await readErrorBody(new Response("<html>", { status: 504 })), { code: 504 });
});

test("stopping early cancels the upstream body", async () => {
  let cancelled = false;
  const body = new ReadableStream({ pull(c) { c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: { content: "x" } }] })}\n\n`)); }, cancel() { cancelled = true; } });
  for await (const t of streamText(body)) break;
  assert.equal(cancelled, true);
});

test("the fake OpenRouter: scripted replies, failures before streaming, and the pretend Byte's magic words", async () => {
  const fetch = fakeOpenRouter(b => b.messages.at(-1).content === "fail" ? { status: 503 } : "ok then");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }) });
  assert.equal(res.headers.get("content-type"), "text/event-stream"); assert.equal(await collect(res.body), "ok then");
  assert.equal(fetch.calls.length, 1); assert.equal(fetch.calls[0].body.messages[0].content, "hi");
  assert.equal((await fetch("x", { body: JSON.stringify({ messages: [{ role: "user", content: "fail" }] }) })).status, 503);
  const ask = (q, mode = "HINT") => devReply({ messages: [{ role: "system", content: `Mode: ${mode}.` }, { role: "user", content: "MY CODE:\n```python\nprint(1)\n```\n\nMY QUESTION:\n" + q }] });
  assert.match(ask("why?"), /Pretend Byte/); assert.match(ask("why?", "OPEN"), /another/);
  assert.match(ask("leak it"), /```python\nprint\(1\)\n```/); assert.deepEqual(ask("make it fail"), { status: 503 });
});
