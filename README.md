# ⚔️ CodeQuest — A Python Learning Adventure

An RPG-style game that teaches Python programming through 12 chapters of challenges, boss battles, and robotics missions. Built for kids ages 9-12.

## 🎮 Features

- **4 Acts, 12 Chapters, 108 Rooms** — progressive Python curriculum from `print()` to Pybricks robotics
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

### 4. Build for production

```bash
npm run build
```

Output goes to `dist/` — deploy anywhere that serves static files.

### 5. Run the tests

```bash
npm test
```

The suite checks the code grader against a hand-written reference solution for every challenge (`tests/fixtures/solutions/`), and runs those solutions in real Python when `python3` is installed. CI runs the tests and a build on every push.

## 🌐 Deploy to Vercel (Free)

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com), sign in with GitHub
3. Click "New Project" → import your repo
4. Framework preset: **Vite** (auto-detected)
5. Click **Deploy**

Your game will be live at `https://codequest.vercel.app` (or similar).

## 🏗️ Project Structure

```
codequest/
├── public/
│   └── music/           ← Your MP3 files go here
├── src/
│   ├── App.jsx          ← Screens, pixel art and game flow
│   ├── content.js       ← Chapters, challenges, trophies, Codex, practice
│   ├── grader.js        ← Checks a kid's code (without running it)
│   ├── progress.js      ← XP, trophies, practice unlocks, save repair
│   ├── editor.js        ← Code editor keys (Tab / Shift+Tab / Ctrl+Enter)
│   ├── theme.js         ← Colours and fonts
│   ├── music.js         ← Music player system
│   ├── main.jsx         ← React entry point
│   └── index.css        ← Tailwind + base styles
├── tests/               ← `npm test` (grader, progress, editor, solutions)
├── index.html
├── package.json
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
