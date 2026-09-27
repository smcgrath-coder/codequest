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
- **Pricing.** OpenRouter lists `anthropic/claude-sonnet-5` at $2/M input and $10/M output, with reasoning supported, and `anthropic/claude-haiku-4.5` at $1/$5. The planning notes set `max_tokens: 2000`, thinking included, so a tutor turn is at most 2,000 tokens out (2¢) plus at most roughly 6,000–7,000 in (the biggest request the server's field limits allow is about 18,500 characters of English and code, and Sonnet 5's tokenizer counts about 30% more tokens than older Claude models: about 1.2–1.4¢). That is at most about 3.4¢ with Sonnet 5, usually far less. Regional zero-retention endpoints cost 10% more, but OpenRouter's default routing skips them while a standard-priced endpoint exists. (Checked 2026-09-27; the first estimate here, before the planning notes, was about 1¢.)
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
  - A screen reader hears "Byte is thinking…", then the whole checked reply (not each piece as it streams), and why Byte couldn't answer.
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
- **Leak guard.** In hint mode, each finished reply is checked before it's shown, with the room's real grader in the page's Python (`leakCheck` and `guardReply` in `src/tutor.js`). One rule decides what is code, for showing it and for checking it: a block opens with three or more backticks and any language line, and closes with the same backticks (or the end of a cut-off reply); inline code is `…` within a line.
  - **Each piece on its own.** A block that would pass is replaced with "I almost gave that away — try changing just the part we talked about!", and inline code with `…`. A long block is cut to two lines, and the cut must not pass either. A piece also fails closed when its grade doesn't finish, or when it reaches into Python's insides.
  - **Trivial edits.** What a kid could paste after a small edit of what they see: `>>>` prompts dropped (with the output between them), dedented, a leftover language line dropped, and its first lines alone (code with its output after it).
  - **Joins.** The pieces joined in order: as shown and tidied. A lone name or symbol mentioned in passing (`==`, `:`) would break a join, so the joins also try only the pieces that could be lines of a program. Byte's earlier code in the chat goes first, so a solution spread over two answers is caught in the last one. One stray item in an earlier answer (an `else:` mentioned, an example) would break those joins too, so they also try cleaner earlier code: none of it, only the latest answer's, or all but one item. One such item in the reply itself (`else:`, `x == 5`, an `if x > 5:` block, an example line) would too, so they also leave out each of its pieces, and each of its plain lines, in turn. The kid's program goes first too, so the lines it's missing are caught (and those joins also leave out each piece and plain line in turn); not when the program already passes, or crashes or loops before its end.
  - **Guesses.** The indents a kid could add to code shown without them (at most 12 a reply, not counting the ones that stop at a SyntaxError or an error in their first run, which cost next to nothing; and none after one that never finishes, so a loop can't keep the kid waiting), and the first piece moved last ("put this after that").
  - **Plain lines.** Lines without backticks that look like code (`total = 0`, `for …:`, `>>> print(x)`, `1. x += 1`), with the lines that carry them on (a dict over several lines, a loop's body), are graded together. A line that reads as a sentence isn't code: it ends like one (`?`, `!`, or `.` after a word), or has a word right after the code ("print() shows the sum"). While a reply streams in, code lines show as ⌛ too.
  - **Time.** Each run of a guard grade stops after 1 s, not the 2 s a kid's grade gets, since every join that loops forever (the kid's own endless loop quoted back, say) keeps the code ⌛ that long. In node the slowest run of any reference solution takes 90 ms (ch6_s2's `help()`, which imports pydoc afresh every run) and every other run under 1 ms, so none grades differently. Each piece on its own keeps the kid's 2 s: stopped sooner, a grade can't say the piece wouldn't pass. Measured in node, a typical hint is checked in about 5 ms (95% of 4,727 replies under 30 ms). A hint quoting the kid's endless loop takes 2 s for each piece that loops on its own and 1 s for each join that loops: 2-6 s in the replies measured (4-8 s before, 12 s with the leave-one-out joins at 2 s a run), and about 3 s for a looping program quoted whole in one block (4 s before). The most grades measured, 142 for a made-up reply of 8 openers and lines, take about 0.3 s. A school Chromebook may be several times slower for everything but those loops.
  - Edits and joins count only a real pass. The guesses and the joins after the kid's program skip code that is only the kid's own lines quoted back, since a guess might just fix their program. A lone symbol, like the `)` a hint points at, is never added to their program. A reply with more than 8 pieces isn't graded at all: all of it is hidden.
  - **No Python.** When the grader can't answer (no Python on this device), code, plain code lines included, gives way to "(I can't check code on this device, so I'll explain in words — ask me what it means!)". The same happens when it stops answering partway, for code it hadn't finished checking. A lone name or symbol (`print`, `==`) still shows. While the kid's own program runs, the guard's grader waits for it, and grades again if the kid's Run stopped a grade.
  - **Limits.** A fixed version of one line in the middle of the kid's program isn't caught (only code that passes, alone, joined or added to the end, is). Prose that describes code ("print a plus b"), or code inside a sentence, isn't graded. Pieces are joined only in the order shown, or with the first one moved last. A missing line that's a copy of one the kid already has doesn't count, unless their program doesn't parse yet (2 rooms of 105 measured). Two stray examples in earlier answers, or more than 8 earlier pieces of code, can still hide a solution spread over them, and so can two stray mentions in one reply (`else:` and `x == 5`: 46 of 48 rooms measured), or one among more than 12 plain lines. A join that needs more than 1 s a run to pass isn't caught. Loops needing more than 12 guesses at their indents, or a guess after one that never finishes, aren't caught, and an example that runs, before code shown without its indents, can use up those 12 (2 of 24 rooms measured). Sometimes an unrelated example really does finish the kid's program (`print(3 + 4)` prints the 7 a room wants), and then it's caught: 4 of 3,297 ordinary replies measured. A last review's probes (its re-check stalled before reporting; re-run on 2026-09-27) found more that get through: the kid's two missing last lines given one per reply before they've typed the first (46 of 49 rooms; the kid's program isn't joined with earlier answers), the missing lines named last one first (28 of 49), inline pieces with a plain last line and one stray mention (27 of 27, or 41 of 49 finishing the kid's program), and a missing loop body shown without its indents (6 of 20).
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
- the leak guard with real Pyodide grading: a passing solution is replaced, even split up, dressed up, typed as plain lines, spread over answers (with stray mentions around it) or added to the kid's program, and hidden when the grader stops partway; a one-line syntax example, a hint pointing at a missing `)`, the kid's own wrong code and the starter aren't.

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
- **Cost.** With zero data retention, Sonnet 5 is served by Amazon Bedrock and Google Vertex only, and stopping a stream doesn't stop billing there. So `max_tokens: 2000` is the real bound, thinking included. Sonnet 5 thinks adaptively: effort `low` sets how hard it thinks, not a budget, so nothing is set aside for the reply (older models such as Haiku 4.5 get a budget of 20% of `max_tokens`, at least 1,024). A reply cut off at the limit after some text isn't flagged, so the first real eval run should check for cut-off replies. No attribution headers are sent: they would list the game on OpenRouter's public rankings.
- **The leak guard** also checks `inline` code, grades the visible lines of a cut block as well as the whole, and fails closed when a grade doesn't finish. The final review found that grading each piece on its own let a whole solution through when it was split up (one line per block got through in 107 of 109 rooms), dressed up (shell prompts, indents, its output, a language line with a space, four backticks), typed as plain lines, spread over two answers, or given as the last line of the kid's program. The edits, joins and plain lines above close those, measured with real graders on every room with a reference solution. A second review found that one stray mention (`==`, `else:`), a sentence that starts like code, a wrong attempt that already has every line of the solution, or the grader stopping partway still let a split solution through, and that a hint pointing at a missing `)` was blamed. The cleaner joins, the sentence rule, counting the kid's own lines in the plain joins and failing closed partway close those, measured the same way. A third review found that one stray mention in the reply itself (`else:`, `x == 5`, an `if x > 5:` block, a `print(3 + 4)` example) still hid a split solution (in up to 52 of 54 rooms), and that every join looping forever cost the kid a full 2 s. Leaving each piece and plain line out in turn closes the first; the guard's 1 s limit a run halves the second. A fourth review found that one mention still hid the lines the kid's program was missing (in up to 81 of 85 rooms), and that the joins a mention breaks used up all 12 indent guesses, so code shown without its indents got through with one `else:` (in 18 of 24 rooms). The joins after the kid's program now leave each piece and plain line out too, and a guess that stops at once doesn't count. The evals' `checkReply` uses the same `leakCheck`, so the two can't drift apart. When the grader can't answer, the kid gets an honest line instead of "I almost gave that away". While a hint-mode reply streams in, its code shows as ⌛ until it's checked. Byte waits while the kid's program runs, because grading then would stop it, and so does the guard's grader. Run waits while Byte answers (it shows "⌛ Byte is answering…", and Ctrl+Enter does nothing), because a run would stop the guard's grades too. Stop still stops a program that's already running.
- **One chat per room**, shared by the room and its victory screen. A question on its way is in that chat, so no panel can ask another until it's answered. A reply that doesn't come (it failed, the kid hid Byte or left, or something broke) goes, and its question stays on screen but out of the history. When the kid hides Byte while the guard is still checking a reply, the guard stops after the grade it's on, so Run doesn't wait for checks nobody will see.
- **Vercel**: `maxDuration` 60 s and `supportsCancellation` for `api/tutor.js` in `vercel.json`. Only `api/tutor.js` lives in `api/`; the rest is in `server/`, which never becomes a route.
