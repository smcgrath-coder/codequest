# Design: Byte the tutor (code-gated LLM help)

Date: 2026-09-26. Status: approved.

## Goal

Bring back a tutor that kids can ask when they're stuck. It comes after the hints and helps them understand what isn't working without solving the room for them. It returns as "Byte", the robot companion, powered by OpenRouter through a small server function, so no API key reaches the browser.

The old Tutor mode called Anthropic straight from the browser with the key in the client bundle. `e90c0c4` removed it for public hosting. This design replaces it.

## Decisions (Scott, 2026-09-26)

| Topic | Decision |
|---|---|
| Access | A code Scott hands out unlocks the tutor. Codes live on the server. |
| When it appears | In a room once every hint has been revealed, and on the victory screen ("Any questions about this room?") |
| No Peeking | Asking in a room costs No Peeking, like a hint. Asking on the victory screen doesn't. |
| After a real pass | Byte is open about the kid's own code: explains it, and may show another way. After "Mark it done", Byte stays in hint mode. |
| Limits | Codes plus a daily question cap per code, counted in Upstash. The OpenRouter key's credit limit is the backstop. |
| Model | Claude Sonnet 5 via OpenRouter, thinking at low effort. The model is a Vercel setting, so it can switch to Haiku 4.5 later. |
| Hosting | A Vercel Function in this repo, on the same site as the game |
| Practice Arena | No Byte. Its 24 challenges have no hints, and there's no progression. |

## Facts this rests on (2026-09-26)

- **Hints.** Every room and boss has hints: 106 have 2, and 3 have 1. So "after the last hint" is always a clear moment.
- **Pricing.** OpenRouter lists `anthropic/claude-sonnet-5` at $2/M input and $10/M output, with reasoning supported, and `anthropic/claude-haiku-4.5` at $1/$5. A tutor turn is about 2K tokens in and a few hundred out, so roughly 1¢ with Sonnet 5.
- **OpenRouter request options.** `provider.data_collection: "deny"` and `provider.zdr: true` (only providers that don't retain prompts), `reasoning.effort` (`"low"` and others), and `max_tokens`.
- **Vercel.** A Vite project can have an `api/` folder whose files run as functions on the same origin. `vercel.json`'s COOP/COEP headers also apply to them, which is harmless for same-origin fetches.

## 1. What kids see

- **In a room:** once the last hint is revealed, a **💬 Ask Byte** button appears. Asking sets the room's "used hints" flag, so No Peeking is lost.
- **On the victory screen:** "Any questions about this room? Ask Byte." Asking there doesn't touch No Peeking.
- **First use:** a small box asks for the tutor code. The server checks it, and it's remembered on the device (`cq:tutor-code`). A wrong code gets "That code doesn't work — ask your grown-up for one."
- **The chat panel:**
  - Byte's portrait, and replies that stream in.
  - Replies are short: 2–4 sentences in kid language.
  - The kid types a question of up to about 300 characters. Byte already has the task, the current code, the real output or error, and the grader's hint.
  - The chat lasts for the room.
  - The panel works in both light and dark mode.
- **How Byte behaves, by mode:**
  - **Hint mode** (in a room, and the victory screen after "Mark it done"): guiding questions, pointing at the line or kind of mistake, and explaining the idea behind the syntax. Never the fix.
  - **Open mode** (the victory screen after a real pass): explains the kid's own code and why it works, and may show another way to write it.
  - **Off-topic** questions are steered politely back to the code.
- **Limits:** when a code's daily cap is reached, Byte says "I need to recharge — let's try again tomorrow!" If the service is down or the device is offline, the room works exactly as today.
- **Privacy:** only the task, code, output, hint text and chat are sent. No hero name, no profile. The tutor code goes to our server only.

## 2. How it works

**Server: `api/tutor.js` (Vercel Function)**
1. **Configuration.** If `OPENROUTER_API_KEY` or `TUTOR_CODES` is missing, it answers `not-configured`, and the game hides Ask Byte.
2. **Code check.** It checks the code against `TUTOR_CODES` (comma-separated), comparing each entry in constant time. Codes are never logged. A failure answers `locked`.
3. **Daily cap.** It increments `tutor:<sha256(code)>:<UTC date>` in Upstash, with an expiry of about 2 days. Over `TUTOR_DAILY_LIMIT` (default 40), it answers `recharging`. If Upstash isn't configured, it doesn't cap, and the OpenRouter credit limit stays the backstop.
4. **Prompt.** The system prompt is built on the server from validated fields: mode (`hint` or `open`), task, code, output, error, grader feedback, hints shown, the last few chat turns and the question.
   - Each field has a size limit.
   - The kid's text only ever appears as user content, never in the system prompt.
   - Mode rules: hint mode never writes the fix and keeps code examples to a line; open mode may explain and show alternatives; everything else is steered back to coding.
5. **OpenRouter call.** POST to `https://openrouter.ai/api/v1/chat/completions` with:
   - `model` from `TUTOR_MODEL` (default `anthropic/claude-sonnet-5`);
   - `reasoning: { effort: "low", exclude: true }`;
   - `max_tokens` capped;
   - `provider: { data_collection: "deny", zdr: true }`;
   - `stream: true`.
6. **Response.** It streams text back to the game, with the questions left today in a header. An upstream failure answers `busy`.

**Game: `src/tutor.js` and `TutorPanel`**
- **Gating.** Pure functions decide when Byte shows. In a room: every hint revealed. On the victory screen: always. Never in the Practice Arena. No Peeking is marked on the first question in a room.
- **Leak guard.** In hint mode, each finished reply is checked before it's shown. Code blocks run through the room's real grader in the page's Python. A block that would pass is replaced with "I almost gave that away — try changing just the part we talked about!", and long code blocks are trimmed.
- **Client.** It stores the code, reads the stream, and handles the states: locked (forget the code, ask again), recharging, busy, offline and not-configured.
- **Theme.** `TutorPanel` uses `useTheme()`, so the colour scan and contrast tests cover it.

**Local development and tests.** A hook in `vite.config.js` serves the same handler on `npm run dev`. A fake OpenRouter (scripted replies) and an in-memory counter mean no key or Upstash is needed locally or in CI. A real key only ever lives in Vercel.

## 3. Testing and rollout

**Server tests:**
- locked, recharging, not-configured and busy;
- field limits;
- the request shape: model, reasoning, ZDR, `max_tokens`;
- the mode rules are in the server-built system prompt, and kid text never is;
- no codes or content in logs.

**Game tests:**
- gating: after the last hint, and on the victory screen; never in practice;
- No Peeking;
- a "Mark it done" victory screen stays in hint mode;
- a locked answer forgets the code;
- the leak guard with real Pyodide grading: a passing solution is replaced, a one-line syntax example isn't.

**Stuck-kid evals:** about 15 scripted situations: a typo, a missing colon, bad indentation, off-topic, three versions of "just give me the answer", and explaining after a pass.
- CI runs them against the fake.
- `npm run tutor:eval` runs them against the real model. Scott runs it with his own key, because I never handle it. It checks for no passing code in hint mode (via the grader), short replies, and staying on topic.

**Browser check** (local, with the fake OpenRouter):
- code entry, the room chat after hints, and both kinds of victory screen;
- the recharging, wrong-code and offline states;
- both themes, phone width and the keyboard.

**Scott's setup:**
1. A dedicated OpenRouter key for CodeQuest, with a monthly credit limit.
2. Vercel environment variables for Preview and Production: `OPENROUTER_API_KEY`, `TUTOR_CODES`, `TUTOR_DAILY_LIMIT` and, optionally, `TUTOR_MODEL`. Changes apply on the next deploy.
3. Upstash Redis from the Vercel Marketplace, connected to the project.

**Rollout:**
- Branch `tutor-mode`, built on `theme-toggle`, because PR #3 isn't merged and the panel needs the theme system. If PR #3 merges first, rebase onto `main`.
- Plan, subagent tasks with reviews, the browser check, then a final review.
- Ask before pushing, and again before the PR.
- Until the Production variables exist, the live game doesn't show Ask Byte.

## Risks

- **A clever kid gets a solution through repeated asking.** The server-built prompt, hint-mode rules and the grader-based leak guard make it hard, and every question costs No Peeking.
- **Cost.** Per-code daily caps and the key's credit limit bound it.
- **Model drift.** The model is a setting, and the eval script can be re-run after any change.
- **Kids' data.** It's minimised (no names or profiles), and requests are routed to zero-retention providers only.

## Notes from planning (2026-09-26)

Details the research and the plan settled, within the decisions above:

- **Setup check and code check.** `GET /api/tutor` answers `ready` or `not-configured`, so the game hides Ask Byte until the server has a key and codes. A code is checked with `{ tutorCode, check: true }`, which spends no question.
- **Codes** are compared without case or surrounding spaces, each entry in constant time.
- **The system prompt is only the fixed rules.** Every request field, even the task and hints, goes in the user message, since the server can't tell them from anything else a browser sends.
- **Answers.** Upstream failures are `busy`, except OpenRouter's 402 (the key's credit limit, or no credits), which is `recharging`. The server waits for the first words before answering, because an error can be the first event of a 200 stream. A reply that breaks off after that ends the stream with an error, and the game shows `busy`.
- **Upstash failing at runtime** doesn't stop Byte: it's logged and nothing is capped, with the credit limit as the backstop.
- **Cost.** With zero data retention, Sonnet 5 is served by Amazon Bedrock and Google Vertex only, and stopping a stream doesn't stop billing there. So `max_tokens: 2000` is the real bound (low-effort reasoning takes at least 1024 of it). No attribution headers are sent: they would list the game on OpenRouter's public rankings.
- **The leak guard** also checks `inline` code, grades the visible lines of a cut block as well as the whole, and fails closed when the grader can't answer. While a hint-mode reply streams in, its code shows as ⌛ until it's checked. Byte waits while the kid's program runs, because grading then would stop it.
- **One chat per room**, shared by the room and its victory screen.
- **Vercel**: `maxDuration` 60 s and `supportsCancellation` for `api/tutor.js` in `vercel.json`. Only `api/tutor.js` lives in `api/`; the rest is in `server/`, which never becomes a route.
