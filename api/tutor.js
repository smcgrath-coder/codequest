// api/tutor.js
// Byte, the tutor, as a Vercel Function (Vercel runs every file in api/ as one, at the same path). The work is in
// server/handler.js; this only hands it the real world: Vercel's environment variables, fetch and Upstash.
// maxDuration and supportsCancellation are in vercel.json.
import { handleTutor } from "../server/handler.js";
import { upstashCounter } from "../server/counter.js";

export default {
  fetch(request) {
    return handleTutor(request, process.env, { counter: upstashCounter(process.env) });
  },
};
