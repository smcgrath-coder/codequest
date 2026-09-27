# ⚔️ CodeQuest — A Python Learning Adventure

An RPG-style game that teaches Python programming through 12 chapters of challenges, boss battles, and robotics missions. Built for kids ages 9-12.

## 🎮 Features

- **4 Acts, 12 Chapters, 108 Rooms** — progressive Python curriculum from `print()` to Pybricks robotics
- **Real Python in the browser** — kids' code actually runs (Python 3.14 via [Pyodide](https://pyodide.org)), with real output, `input()`, a Stop button and kid-friendly error messages. It's graded by what it does, not by keywords.
- **Mark it done** — rooms unlock in order and the grader still turns down a few correct programs, so after 3 clean runs that don't pass, a kid can mark the room done for half XP instead of staying stuck
- **Boss Battles** — test mastery at the end of each chapter
- **Side Quests** — optional challenges for bonus XP
- **Built-in Guide** — progressive, context-aware hints with no API needed
- **Byte the tutor (optional)** — once every hint in a room is out, a kid with a tutor code from a grown-up can ask Byte, who helps them find the problem without giving the answer away. It's off until the site is set up (see [Byte the tutor](#-byte-the-tutor-optional))
- **Code Codex** — 58-entry reference guide
- **Practice Arena** — 24 standalone challenges
- **Multi-Profile Saves** — multiple players on one device
- **Chiptune SFX** — 12 sound effects via Tone.js
- **Background Music** — 11 tracks with per-screen context switching
- **Light and dark mode** — the ☀️/🌙 button beside 🎵 switches the screens to a cool grey-blue light look and back; the pixel art, the world map and the code editor stay dark. Both buttons are remembered on the device

## 🚀 Quick Start

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/codequest.git
cd codequest
npm install
```

### 2. Add your music files

Rename your Suno MP3 downloads and place them in `public/music/`:

| Your Suno File | Rename To |
|---|---|
| Title Theme.mp3 | `title-theme.mp3` |
| World Map.mp3 | `world-map.mp3` |
| The Code Depths.mp3 | `code-depths.mp3` |
| The Architect's Path.mp3 | `architects-path.mp3` |
| The Arena.mp3 | `arena.mp3` |
| The Rover Bay.mp3 | `rover-bay.mp3` |
| Boss battle 1.mp3 | `boss-battle-1.mp3` |
| Boss battle 2.mp3 | `boss-battle-2.mp3` |
| Victory Fanfare.mp3 | `victory-fanfare.mp3` |
| Codex Menu.mp3 | `codex-menu.mp3` |
| NPC Dialogue.mp3 | `npc-dialogue.mp3` |

### 3. Run locally

```bash
npm run dev
```

Open http://localhost:5173

The dev server sends the cross-origin isolation headers Python needs, so code runs for real locally too.

### 4. Build for production

```bash
npm run build
```

Output goes to `dist/`, including Python itself in `dist/pyodide/` (about 13.5 MB, about 6 MB compressed, downloaded once per device and cached). Deploy to any static host that can send two headers on every response:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

`vercel.json` already does this on Vercel. Without the headers, or on a browser too old for Pyodide (before Chrome 96, Firefox 114 or Safari 16.4), the game still works: it falls back to a keyword checker that reads the code without running it, and says so under the output.

### 5. Run the tests

```bash
npm test
```

The suite runs real Python: it loads Pyodide from the `pyodide` npm package, so it needs no network. For every challenge it checks that the reference solution (`tests/fixtures/solutions/`) and the other correct answers (`tests/fixtures/alternatives/`) pass, and that the starter code, `print("hello")` and the wrong answers (`tests/fixtures/wrong/`) don't. It also tests the runner (Stop, time limits, `input()`, a clean slate between runs), the friendly error messages and the keyword checker, and runs the reference solutions in real Python when `python3` is installed. Byte's tests use a pretend OpenRouter, so they need no key. CI runs the tests on Python 3.14 and a build on every push. Node 22 or 24+ is needed.

## 🌐 Deploy to Vercel (Free)

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com), sign in with GitHub
3. Click "New Project" → import your repo
4. Framework preset: **Vite** (auto-detected)
5. Click **Deploy**

Your game will be live at `https://codequest.vercel.app` (or similar). `vercel.json` sends the headers that let Python run.

## 🤖 Byte the tutor (optional)

Byte answers a kid's questions about the room they're in: after the last hint, and on the victory screen ("Any questions about this room?"). In a room it gives nudges, never the fix, and asking costs No Peeking like a hint. After a real pass it can explain the kid's own code and show another way. A small Vercel Function, `api/tutor.js`, talks to Claude through [OpenRouter](https://openrouter.ai), so no key ever reaches the browser. Until the setup below is done, the game hides Ask Byte.

### Setting it up (Scott)

1. **OpenRouter: a key just for CodeQuest.**
   - At [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys), create a key named `CodeQuest` with a **credit limit** that resets monthly. That limit is the backstop if anything else fails. The key spends the account's credits, so the account needs some. Copy the key when OpenRouter shows it and paste it straight into Vercel (step 2), not into a file, note, email or chat. If you lose it before then, delete it and make a new one.
   - Cost with Sonnet 5: a question costs at most about 3.4¢, usually far less. The reply, thinking included, stops at 2,000 output tokens ($10 per million), and the biggest question the function accepts is roughly 6,000–7,000 input tokens of English and code ($2 per million; Sonnet 5's tokenizer counts about 30% more tokens than older Claude models, and emoji or other scripts can take more). OpenRouter's pricier regional endpoints aren't used while a standard-priced one is available. So $10 a month covers at least about 290 questions, and one code at the daily limit of 40 costs at most about $1.40 a day. OpenRouter's Logs page shows each request's real tokens and cost, even with logging off.
   - Privacy: in the **Observability** settings of the workspace that holds the key, leave **Input & Output Logging** off (it's off by default), or add the CodeQuest key to its **Excluded API Keys**. If you use **Broadcast**, exclude the key there too. In **Privacy** settings, leave "OpenRouter use of inputs/outputs" off. The function asks for zero data retention on every request, so no account-wide switch is needed. But if your account or workspace settings rule out both Amazon Bedrock and Google Vertex (the only zero-retention providers for Claude), every question fails as busy.
2. **Vercel environment variables.** First make up the codes (see [Codes](#codes)) and save them in your password manager: once they're saved as a Secret, Vercel won't show them again, and changing one means pasting the whole list again. Then, in the project's Settings → Environment Variables, add these for **Production** and **Preview**. Vercel asks for each variable's **Type** (older dashboards had a **Sensitive** switch instead):

   | Name | Type | Value |
   |---|---|---|
   | `OPENROUTER_API_KEY` | Secret | the key from step 1 |
   | `TUTOR_CODES` | Secret | the codes you hand out, comma-separated, shaped like `word-word-word-00,word-word-word-00`. Case, and spaces around each code, don't matter |
   | `TUTOR_DAILY_LIMIT` | Config | optional: questions per code per day (UTC); leave it out for `40` |
   | `TUTOR_MODEL` | Config | optional: default `anthropic/claude-sonnet-5`; `anthropic/claude-haiku-4.5` costs half as much |

   You can limit the Preview variables to one Git branch; otherwise every preview gets the key.
3. **Upstash Redis for the daily limit.**
   - In the Vercel dashboard, open the project's Storage tab → Create Database → **Upstash for Redis** (a Marketplace integration), free plan. (No button there? Integrations → Browse Marketplace → Upstash.)
   - Connect it to this project for Production and Preview, leave **Custom Prefix** blank, and don't restrict it to Production only.
   - It adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`, which the function uses, plus a few it ignores, such as `KV_REST_API_READ_ONLY_TOKEN` and `KV_URL`. The function also reads `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` if you set Upstash up yourself; if both pairs are there, those win.
   - Upstash's free plan has one database per account. If you already have one, don't pick a paid plan: connect that database to this project instead (Byte's counts all start with `tutor:`, so they won't clash). Preview and Production share the database, so a code's daily count is shared between them too.
   - Without Upstash there's no daily limit, only the credit limit.
4. **Redeploy.** Environment variable changes only apply to new deployments: after any change, Deployments → ⋯ on the branch's newest deployment → Redeploy (or push a commit to the branch). Then reload the game: it asks whether Byte is set up once per page load.

   Only a deployment built from code that has `api/tutor.js` has Byte. Until that code is merged into `main`, only the previews of its branch (for example `tutor-mode`) have it, and redeploying production does nothing for Byte. The merge itself makes a new production deployment with the Production variables, so after it just do step 5 on the production site.
5. **Check.**
   - `https://<your site>/api/tutor` should show `{"state":"ready","dailyCap":true}`: Byte is ready, and the Upstash settings for the daily limit are there. A preview needs you signed in to Vercel.
     - `{"state":"not-configured"}` means this deployment has no `OPENROUTER_API_KEY` or `TUTOR_CODES`: check they're set for this environment (and branch, if you limited Preview to one), then redeploy.
     - `"dailyCap":false` means Upstash isn't connected (step 3), or was connected after this deployment was built: redeploy.
     - Vercel's own 404 NOT_FOUND page means this deployment was built without Byte's code (step 4).
   - This check can't tell whether the key works, and neither can Unlock: only a question reaches OpenRouter. So open a room on your own profile (asking costs that room's No Peeking), reveal every hint, choose Ask Byte, enter one of your codes, Unlock, and ask one question. If Unlock says "That code doesn't work", the code isn't in this deployment's `TUTOR_CODES`: compare it with your copy, paste the whole list again if needed, and redeploy.
   - When Byte answers, its panel should show how many questions the code has left today ("39 left today" after the first question of the day). If it doesn't, nothing is capped: the project's **Logs** will say `tutor: counter unavailable`, which means the Upstash URL or token is wrong (step 3).
   - If Byte says its circuits are busy, search the project's **Logs** for `tutor:` (Hobby keeps them about an hour):
     - `tutor: upstream 401` means the key is wrong;
     - `tutor: upstream 404` (sometimes `503`) means no zero-retention provider could take it: see step 1, and check that `TUTOR_MODEL` has a zero-retention endpoint.
   - "I need to recharge" before the daily limit is OpenRouter's 402. The log line (`tutor: upstream 402 …`) ends with OpenRouter's reason: the key's credit limit ran out, the account is out of credits, or, on a low balance, a short-lived spending check (try again shortly).

### Codes

Nothing limits how many codes someone can try, so use long, random codes (up to 64 characters): three random words and a number, like `otter-lantern-quilt-58`, but make up your own, since anyone can read this one on GitHub. To take a code away, or replace one that got around, edit `TUTOR_CODES` and redeploy. A device that saved the old code is asked for a new one.

To switch Byte off, remove `OPENROUTER_API_KEY` or `TUTOR_CODES` and redeploy (`TUTOR_DAILY_LIMIT=0` just means the default, 40). If the key might have leaked, or spending looks wrong, first delete or disable the CodeQuest key at [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys). That stops spending at once, and kids see "busy". Then make a new key, paste it into `OPENROUTER_API_KEY` for Production and Preview, and redeploy.

The daily limit resets at midnight UTC, which is 5 pm Pacific daylight time (8 pm Eastern), not local midnight. So one code can ask 40 questions before it and 40 after in the same evening: about $2.70 at worst, not $1.40. A question that fails still counts.

A code at its daily limit still costs something: each question past it is still counted, which is two Upstash commands (INCR and EXPIRE, in one request). So someone with a code can use up Upstash's free plan, and then there's no daily limit. The OpenRouter credit limit stays the backstop.

### What it sends, and what it keeps

Only the room's task, the kid's code, what it printed, the error, the checker's words, the hints shown and the chat go to the model: no hero name, no profile. Requests only go to providers that keep no data (OpenRouter's zero data retention; for Claude that's Amazon Bedrock and Google Vertex). OpenRouter itself keeps each request's metadata, such as its tokens and cost. It doesn't store the prompt or reply unless Input & Output Logging is on, or forward them unless Broadcast is on (step 1), though it does categorize a small sample of prompts, stored anonymously and not tied to the account. The function never logs a code, the key, or anything the kid wrote or Byte said, and the daily counter stores a hash of the code, never the code. The tutor code is remembered on the device as `cq:tutor-code`.

### Locally

`npm run dev` serves `/api/tutor` from the same handler, with a **pretend Byte** and no key: the tutor code is `dev`. A question with the word `leak` makes the pretend Byte send your own code back (so you can watch the leak guard replace a passing answer), and `fail` makes it act as if OpenRouter were down. `TUTOR_DAILY_LIMIT=3 npm run dev` shows "I need to recharge". The dev server never reads `.env`, and it only answers `/api/tutor` for hosts Vite itself allows (localhost, IP addresses, `server.allowedHosts`).

If `OPENROUTER_API_KEY` is exported in your shell, `npm run dev` uses the real OpenRouter instead, with your shell's `TUTOR_CODES` and Upstash settings. Then the code `dev` stops working, and without Upstash settings there's no daily limit.

### Evals against the real model

`tests/fixtures/tutor-evals.json` holds 23 stuck-kid situations, such as typos, a missing colon, bad indentation, off-topic questions, asking for the answer, and questions after a pass. `npm test` runs them against the pretend Byte. To try the real model (23 questions, billed to the key you use, so at most about 55¢ with Sonnet 5, usually less; a separate key with a small limit keeps them off CodeQuest's):

```bash
read -rs OPENROUTER_API_KEY && export OPENROUTER_API_KEY    # paste the key, then press Return (nothing is shown, and it isn't kept in your shell history)
npm run tutor:eval                                          # add -- --show to print the replies
```

It checks each reply for code that would pass the room in hint mode (with the room's real grader), length, and staying on topic, and says what the leak guard caught.

Run it with `-- --show` the first time and look for replies that stop mid-sentence: the checks don't catch a reply cut off at the 2,000-token limit. If every line says `no reply (busy)`, the key is wrong; `no reply (recharging)` means its limit or the account's credits ran out. While the key is exported, `npm run dev` in that terminal uses the real OpenRouter (see Locally), so run `unset OPENROUTER_API_KEY` or close the terminal when you're done.

It reads `TUTOR_MODEL` from your own shell, not from Vercel. To try a model before you switch Vercel to it:

```bash
TUTOR_MODEL=anthropic/claude-haiku-4.5 npm run tutor:eval
```

## 🏗️ Project Structure

```
codequest/
├── public/
│   └── music/           ← Your MP3 files go here
├── api/
│   └── tutor.js         ← Vercel Function for Byte: wires server/handler.js to Vercel's env, fetch and Upstash
├── server/              ← Byte's server side (not routes; bundled into the function)
│   ├── handler.js       ← /api/tutor: states, the daily cap, the OpenRouter call, the streamed reply
│   ├── tutor.js         ← Request checks, code check, the prompt and the OpenRouter body
│   ├── counter.js       ← The daily question count (Upstash REST, or in memory)
│   ├── sse.js           ← Reads OpenRouter's stream
│   ├── dev.js           ← /api/tutor on `npm run dev`, with the pretend Byte
│   └── fake-openrouter.js ← The pretend OpenRouter for tests and dev
├── scripts/             ← The Byte evals (`npm run tutor:eval`)
├── src/
│   ├── App.jsx          ← Screens, pixel art and game flow
│   ├── content.js       ← Chapters, challenges, trophies, Codex, practice
│   ├── python/          ← Runs kids' code in real Python (Pyodide)
│   │   ├── runner.js        ← Page-side API: run, stop, answer input(), grade, restart, fallback detection
│   │   ├── py.worker.js     ← Web Worker that loads Pyodide once for the whole app
│   │   ├── worker-core.js   ← Runs and grades inside the worker (testable in Node)
│   │   ├── harness.py       ← Runs kid code as main.py, with a clean slate every run
│   │   ├── grading.py       ← Applies a challenge's rule: output, concept (ast) and probe checks
│   │   ├── input-channel.js ← input() over SharedArrayBuffer + Atomics.wait
│   │   ├── friendly.js      ← Python errors → kid-friendly headlines with the line
│   │   ├── flow.js          ← One Run: run, then grade, or fall back to the keyword checker
│   │   ├── CodePanel.jsx    ← Code editor (line numbers) and OUTPUT panel
│   │   └── config.js        ← Pinned Pyodide version, path and headers
│   ├── checks.js        ← The grading rule for each challenge, from checks/
│   ├── checks/          ← Rules by chapter (batch-a.js, batch-b.js, batch-c.js)
│   ├── grader.js        ← Keyword checker: the fallback when Python can't run
│   ├── progress.js      ← XP, trophies, practice unlocks, save repair
│   ├── tutor.js         ← Byte in the game: when it's offered, the saved code, the request, the leak guard
│   ├── tutor-limits.js  ← Field limits shared by the game and the server
│   ├── editor.js        ← Code editor keys (Tab / Shift+Tab / Ctrl+Enter)
│   ├── theme.js         ← Colours and fonts
│   ├── music.js         ← Music player system
│   ├── main.jsx         ← React entry point
│   └── index.css        ← Tailwind + base styles
├── tests/               ← `npm test` (runner, grading rules, errors, grader, progress, editor, theme and saved settings, music, colour scan, Byte)
│   └── fixtures/        ← Reference, alternative and wrong answers for every challenge
├── index.html
├── package.json
├── vercel.json          ← Cross-origin isolation headers, Pyodide caching, Byte's function settings
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## 🎵 Music System

The music system (`src/music.js`) automatically plays the right track based on game context:

- **Title/Create/Profiles** → Title Theme
- **World Map** → World Map
- **Chapter rooms** → Act 1-4 themes (based on chapter number)
- **Boss fights** → Boss Battle (randomly picks 1 or 2)
- **Victory** → Victory Fanfare (plays once, then resumes previous track)
- **Codex/Character Sheet/Practice** → Codex Menu

Players can mute/unmute music with the 🎵 button in the bottom-right corner, and the device remembers the choice.

## 📝 Curriculum

| Act | Chapters | Topics |
|-----|----------|--------|
| 1: The Code Depths | Ch 1-5 | print, variables, types, conditions, loops, lists |
| 2: The Architect's Path | Ch 6-8 | functions, dictionaries, integration |
| 3: The Arena | Ch 9-10 | game building patterns |
| 4: The Rover Bay | Ch 11-12 | Pybricks robotics (FLL) |

## License

MIT
