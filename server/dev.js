// server/dev.js
// /api/tutor on `npm run dev`, from the same handler as the Vercel Function. With no OPENROUTER_API_KEY in the
// shell (the usual case), Byte is pretend: the fake OpenRouter answers, a Map counts, and the only code is "dev".
// This is the only place "dev" is ever a code, and nothing on Vercel imports this file: vite.config.js does, for
// `vite` only (apply: "serve"). It never reads .env.
import { isIP } from "node:net";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { handleTutor } from "./handler.js";
import { memoryCounter, upstashCounter } from "./counter.js";
import { fakeOpenRouter } from "./fake-openrouter.js";

export const DEV_CODE = "dev";

// Would Vite answer this Host header? The middleware runs before Vite's own host check, so it makes the same one
// (Vite 6.4's), or a DNS-rebinding page could reach Byte: the real OpenRouter, when the shell has a key. Allowed:
// localhost and *.localhost, any IPv4 or [IPv6] literal (so `--host` on a LAN IP works), the names Vite adds itself
// (server.host and the like), and server.allowedHosts, where ".example.com" allows its subdomains too, and true
// allows every host.
export function hostAllowed(host, { allowedHosts = [], extraHosts = [] } = {}) {
  if (allowedHosts === true) return true;
  if (!host) return false;
  const h = host.trim();
  if (h[0] === "[") { const end = h.indexOf("]"); return end > 0 && isIP(h.slice(1, end)) === 6; }
  const name = h.split(":")[0];
  if (isIP(name) === 4 || name === "localhost" || name.endsWith(".localhost") || extraHosts.includes(name)) return true;
  return allowedHosts.some(a => a === name || (a[0] === "." && (a.slice(1) === name || name.endsWith(a))));
}

// The environment and outside world for the dev server. A real key in the shell (Scott checking the real Byte
// locally) uses the shell's own TUTOR_CODES and Upstash settings, and the real OpenRouter.
export function devSetup(env = process.env) {
  if (env.OPENROUTER_API_KEY) return { fake: false, env, deps: { counter: upstashCounter(env) } };
  return {
    fake: true,
    env: { OPENROUTER_API_KEY: "fake-key-for-local-dev", TUTOR_CODES: DEV_CODE, TUTOR_DAILY_LIMIT: env.TUTOR_DAILY_LIMIT },
    deps: { fetch: fakeOpenRouter(undefined, { size: 96, gapMs: 15 }), counter: memoryCounter() },
  };
}

// A Node request as a Web Request, with a signal that aborts when the browser goes away (as Vercel's does with
// supportsCancellation).
function toRequest(req, signal) {
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (v !== undefined) for (const x of [].concat(v)) headers.append(k, x);
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : Readable.toWeb(req);
  return new Request(new URL(req.originalUrl ?? req.url, `http://${req.headers.host ?? "localhost"}`), { method: req.method, headers, body, duplex: "half", signal });
}

// Connect middleware (Vite's server.middlewares) that answers with handleTutor, streaming the body as it comes. A Host
// Vite wouldn't answer gets 403, and nothing is counted or asked. `hosts` is hostAllowed's { allowedHosts, extraHosts }.
export function tutorMiddleware({ env, deps }, hosts = {}) {
  return async (req, res, next) => {
    const ac = new AbortController();
    res.on("close", () => { if (!res.writableFinished) ac.abort(); });
    try {
      const response = hostAllowed(req.headers.host, hosts) ? await handleTutor(toRequest(req, ac.signal), env, deps)
        : Response.json({ state: "bad-request" }, { status: 403, headers: { "cache-control": "no-store" } });
      res.statusCode = response.status;
      response.headers.forEach((v, k) => res.setHeader(k, v));
      if (!response.body) return res.end();
      res.flushHeaders();
      await pipeline(Readable.fromWeb(response.body), res);
    } catch (e) {
      if (ac.signal.aborted) return;             // the browser went away
      if (!res.headersSent) return next(e);
      res.destroy(e);                            // the reply broke off: the browser sees the stream fail
    }
  };
}

// The Vite plugin. Added straight to server.middlewares, so it runs before Vite's own (and its HTML fallback).
export function tutorDev() {
  return {
    name: "tutor-dev",
    apply: "serve",
    configureServer(server) {
      // Vite's own host check is off with allowedHosts true or over https, so this one is too. additionalAllowedHosts
      // is where Vite keeps server.host, hmr.host, preview.host and origin's hostname.
      const { allowedHosts, https } = server.config.server;
      const hosts = { allowedHosts: https ? true : allowedHosts, extraHosts: server.config.additionalAllowedHosts ?? [] };
      const setup = devSetup(), handle = tutorMiddleware(setup, hosts);
      server.config.logger.info(setup.fake ? '  ➜  Byte: pretend (no OPENROUTER_API_KEY in this shell); the tutor code is "dev"' : "  ➜  Byte: the real OpenRouter (OPENROUTER_API_KEY is set in this shell)");
      server.middlewares.use((req, res, next) => ((req.url ?? "").split("?")[0] === "/api/tutor" ? handle(req, res, next) : next()));
    },
  };
}
