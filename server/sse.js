// server/sse.js
// Reads OpenRouter's streamed chat completion (server-sent events) as plain text pieces. Handles lines and UTF-8
// characters split across chunks, \r\n, ": OPENROUTER PROCESSING" keep-alive comments, [DONE], and errors sent
// inside a 200 stream.

// Bytes to event payloads: the text after "data:", one string per event, until [DONE].
export async function* readSSE(body) {
  const reader = body.getReader(), decoder = new TextDecoder();
  let buf = "", data = [];
  const take = () => { if (!data.length) return null; const p = data.join("\n"); data = []; return p; };
  const feed = line => {
    if (line.endsWith("\r")) line = line.slice(0, -1);
    if (line === "") return take();               // a blank line ends an event
    if (line.startsWith(":")) return null;        // a comment: keep-alive
    if (line.startsWith("data:")) data.push(line.slice(line.startsWith("data: ") ? 6 : 5));
    return null;                                  // event:, id: and retry: aren't used
  };
  try {
    for (;;) {
      const { done, value } = await reader.read();
      buf += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const payload = feed(buf.slice(0, nl));
        buf = buf.slice(nl + 1);
        if (payload === "[DONE]") return;
        if (payload !== null) yield payload;
      }
      if (done) {                                 // a last event with no blank line after it
        if (buf) feed(buf);
        const payload = take();
        if (payload !== null && payload !== "[DONE]") yield payload;
        return;
      }
    }
  } finally {
    reader.cancel().catch(() => {});              // also when the reader stops early: frees the upstream connection
  }
}

// An OpenRouter failure. code follows HTTP (402, 429, 502…); type is error.metadata.error_type, or "empty" and
// "length" for a stream that ended with no text. The message isn't kept: a provider's message could quote the prompt.
export class UpstreamError extends Error {
  constructor(error) {
    super("upstream error");
    this.code = error?.code;
    this.type = error?.metadata?.error_type ?? error?.type;
  }
}

// Event payloads to the reply's text pieces (choices[0].delta.content). Hidden reasoning, the empty first chunk and
// the usage chunk give no text. Throws UpstreamError for an error event, and when the stream ends with no text at
// all (it can end with "length" when reasoning used up max_tokens).
export async function* streamText(body) {
  let gotText = false, finish = null;
  for await (const payload of readSSE(body)) {
    let chunk;
    try { chunk = JSON.parse(payload); } catch { continue; }
    if (chunk.error) throw new UpstreamError(chunk.error);
    const choice = chunk.choices?.[0], text = choice?.delta?.content;
    if (text) { gotText = true; yield text; }
    if (choice?.finish_reason) finish = choice.finish_reason;
  }
  if (!gotText) throw new UpstreamError({ code: 502, type: finish === "length" ? "length" : "empty" });
}

// The error object of a failed (non-200) response, which is plain JSON: { error: { code, message, metadata } }.
export async function readErrorBody(res) {
  const body = await res.json().catch(() => null);
  return body?.error ?? { code: res.status };
}
