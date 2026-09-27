// server/fake-openrouter.js
// A pretend OpenRouter for the tests and `npm run dev`, so no key is ever needed off Vercel. It is a fetch that
// answers chat completions with SSE shaped like the real stream (keep-alive comments, an empty first chunk, a
// usage chunk, [DONE]), sent in small uneven pieces so lines and characters arrive split.
const enc = new TextEncoder();
const chunk = (content, finish = null, extra = {}) => JSON.stringify({ id: "gen-fake", object: "chat.completion.chunk", created: 0,
  model: "fake/byte", choices: [{ index: 0, delta: { role: "assistant", content }, finish_reason: finish, native_finish_reason: finish }], ...extra });

// The SSE text of a reply: its words as content pieces, then the usual ending.
export function sseFor(reply) {
  return [": OPENROUTER PROCESSING\n\n", `data: ${chunk("")}\n\n`, ": OPENROUTER PROCESSING\n\n",
    ...(reply.match(/\S+\s*|\s+/g) ?? []).map(w => `data: ${chunk(w)}\n\n`),
    `data: ${chunk("", "stop")}\n\n`,
    `data: ${chunk("", "stop", { usage: { prompt_tokens: 900, completion_tokens: 150, completion_tokens_details: { reasoning_tokens: 90 }, cost: 0 } })}\n\n`,
    "data: [DONE]\n\n"].join("");
}
// An error event inside a 200 stream, as OpenRouter sends one after the headers are out.
export const sseError = (code = 502, type = "provider_unavailable") =>
  `data: ${JSON.stringify({ id: "gen-fake", object: "chat.completion.chunk", error: { code, message: "Provider returned error", metadata: { error_type: type } },
    choices: [{ index: 0, delta: { content: "" }, finish_reason: "error" }] })}\n\n`;

// A body that sends `text` `size` bytes at a time, `gapMs` apart, and errors if `signal` aborts.
export function streamOf(text, { size = 7, gapMs = 0, signal } = {}) {
  const bytes = enc.encode(text); let at = 0;
  return new ReadableStream({
    async pull(ctrl) {
      if (gapMs) await new Promise(r => setTimeout(r, gapMs));
      if (signal?.aborted) return ctrl.error(signal.reason);
      if (at >= bytes.length) return ctrl.close();
      ctrl.enqueue(bytes.slice(at, at += size));
    },
  });
}

// The pretend Byte on `npm run dev`. A question with "leak" in it gets the kid's own code back in a code block
// (to watch the leak guard), and "fail" makes OpenRouter look down.
export function devReply(body) {
  const last = body.messages.at(-1).content, question = last.slice(last.lastIndexOf("MY QUESTION:\n") + 13);
  if (/\bfail\b/i.test(question)) return { status: 503 };
  if (/\bleak\b/i.test(question)) return "Pretend Byte here! Here's your code back, to test the leak guard:\n\n```python\n" + (last.match(/```python\n([\s\S]*?)\n```/)?.[1] ?? "") + "\n```";
  if (body.messages[0].content.includes("Mode: OPEN")) return "Pretend Byte here! You did it: each line runs in order, top to bottom. Another way to write a line:\n\n```python\nprint(\"another\", \"way\")\n```";
  return "Pretend Byte here! Look at the line the error points at. What does Python need around the words it prints? Like this:\n\n```python\nprint(\"hi\")\n```";
}

// A fetch standing in for OpenRouter. `script(body)` (or a fixed value) says what to answer: a string is a reply;
// { status, error } is a failed response before streaming; { sse } is a raw stream. fetch.calls records each request.
export function fakeOpenRouter(script = devReply, { size = 7, gapMs = 0 } = {}) {
  const calls = [];
  async function fetch(url, init = {}) {
    const body = JSON.parse(init.body);
    calls.push({ url: String(url), init, body });
    const r = typeof script === "function" ? script(body) : script;
    if (r?.status) return Response.json({ error: r.error ?? { code: r.status, message: "Service temporarily unavailable" } }, { status: r.status });
    return new Response(streamOf(typeof r === "string" ? sseFor(r) : r.sse, { size, gapMs, signal: init.signal }), { headers: { "content-type": "text/event-stream" } });
  }
  fetch.calls = calls;
  return fetch;
}
