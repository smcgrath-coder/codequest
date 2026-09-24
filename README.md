# ⚔️ CodeQuest — A Python Learning Adventure

An RPG-style game that teaches Python programming through 12 chapters of challenges, boss battles, and robotics missions. Built for kids ages 9-12.

## 🎮 Features

- **4 Acts, 12 Chapters, 108 Rooms** — progressive Python curriculum from `print()` to Pybricks robotics
- **Real Python in the browser** — kids' code actually runs (Python 3.14 via [Pyodide](https://pyodide.org)), with real output, `input()`, a Stop button and kid-friendly error messages. It's graded by what it does, not by keywords.
- **Boss Battles** — test mastery at the end of each chapter
- **Side Quests** — optional challenges for bonus XP
- **Built-in Guide** — progressive, context-aware hints with no API needed
- **Code Codex** — 58-entry reference guide
- **Practice Arena** — 24 standalone challenges
- **Multi-Profile Saves** — multiple players on one device
- **Chiptune SFX** — 12 sound effects via Tone.js
- **Background Music** — 11 tracks with per-screen context switching

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

The suite runs real Python: it loads Pyodide from the `pyodide` npm package, so it needs no network. For every challenge it checks that the reference solution (`tests/fixtures/solutions/`) and the other correct answers (`tests/fixtures/alternatives/`) pass, and that the starter code, `print("hello")` and the wrong answers (`tests/fixtures/wrong/`) don't. It also tests the runner (Stop, time limits, `input()`, a clean slate between runs), the friendly error messages and the keyword checker, and runs the reference solutions in real Python when `python3` is installed. CI runs the tests on Python 3.14 and a build on every push. Node 22 or 24+ is needed.

## 🌐 Deploy to Vercel (Free)

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com), sign in with GitHub
3. Click "New Project" → import your repo
4. Framework preset: **Vite** (auto-detected)
5. Click **Deploy**

Your game will be live at `https://codequest.vercel.app` (or similar). `vercel.json` sends the headers that let Python run.

## 🏗️ Project Structure

```
codequest/
├── public/
│   └── music/           ← Your MP3 files go here
├── src/
│   ├── App.jsx          ← Screens, pixel art and game flow
│   ├── content.js       ← Chapters, challenges, trophies, Codex, practice
│   ├── python/          ← Runs kids' code in real Python (Pyodide)
│   │   ├── runner.js        ← Page-side API: run, stop, answer input(), grade, fallback detection
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
│   ├── editor.js        ← Code editor keys (Tab / Shift+Tab / Ctrl+Enter)
│   ├── theme.js         ← Colours and fonts
│   ├── music.js         ← Music player system
│   ├── main.jsx         ← React entry point
│   └── index.css        ← Tailwind + base styles
├── tests/               ← `npm test` (runner, grading rules, errors, grader, progress, editor)
│   └── fixtures/        ← Reference, alternative and wrong answers for every challenge
├── index.html
├── package.json
├── vercel.json          ← Cross-origin isolation headers, Pyodide caching
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

Players can mute/unmute music with the 🎵 button in the bottom-right corner.

## 📝 Curriculum

| Act | Chapters | Topics |
|-----|----------|--------|
| 1: The Code Depths | Ch 1-5 | print, variables, types, conditions, loops, lists |
| 2: The Architect's Path | Ch 6-8 | functions, dictionaries, integration |
| 3: The Arena | Ch 9-10 | game building patterns |
| 4: The Rover Bay | Ch 11-12 | Pybricks robotics (FLL) |

## License

MIT
