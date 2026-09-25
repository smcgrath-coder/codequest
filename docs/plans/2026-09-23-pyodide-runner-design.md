# Design: running real Python with Pyodide

Date: 2026-09-23. Status: approved.

## Goal

Today the grader (`src/grader.js`) never runs the kid's code. It pattern-matches the source against keywords, so kids never see what their program prints, and 24 of 133 challenges still accept `print("hello")`. This change runs real Python in the browser, shows the real output and errors, and grades by what the program actually does.

**In scope for the first release:**
- real output and friendly errors
- grading by real output
- interactive `input()`

**Later:**
- a pybricks robot simulator for chapters 11-12
- a content pass that rewrites the 8 challenges that fake `input()` with lists (ch4_s3, ch8_boss, ch9_r1, ch9_r4, ch9_s3, ch10_r4, ch12_r5, grind_17)
- offline support through a service worker
- the content bugs listed below

## Decisions

| Topic | Decision |
|---|---|
| Hosting | Vercel, with cross-origin isolation headers |
| Strictness | Near miss: ignore invisible differences. If only capitals or punctuation differ, don't pass, but give a "so close" hint that names the line |
| Anti-hardcoding | Output checks, plus concept checks, plus hidden re-runs and function probes |
| Old or unsupported devices | Fall back silently to the keyword grader, with a small note |
| Faked-`input()` challenges | Left as they are; `input()` simply works everywhere |
| Architecture | Grading happens inside Python (a harness in the worker applies the rules for each challenge) |

## Measured facts (research, 2026-09-23)

These come from measurement, not memory: npm, Node 24, Chrome 153 and Firefox 155 headless.

- **Pyodide 314.0.7** (Python 3.14.2, MPL-2.0).
  - Core plus stdlib is 5 files, 13.5 MB raw.
  - A first visit downloads about 5.5-6.3 MB compressed.
  - `loadPyodide` takes about 0.9 s cold on an M4 Pro.
  - Chromebooks were not measured.
- **Fidelity.** All 133 reference solutions run.
  - With a seed, all 133 are byte-identical to CPython.
  - Unseeded, 128 match; the other 5 differ only because they use unseeded random.
  - Seeded `random` sequences are identical to CPython's.
- **Browser floor:** Chrome 96, Firefox 114, Safari/iPadOS 16.4. Module workers are required. This excludes the iPad Air 2, the iPad mini 4 and Chromebooks past their update expiry.
- **Stopping code:**
  - `setInterruptBuffer` with a SharedArrayBuffer stops a `while True` loop in about 4 ms.
  - It cannot stop `time.sleep` or a single long C-level call, and it does not stop a bare `except:` that swallows `KeyboardInterrupt`.
  - `worker.terminate()` plus a respawn is the backstop: about 0.9 s in Chrome and about 1.1 s in Firefox.
- **Headers.** The headers are COOP `same-origin` and COEP `require-corp`, on every response including the worker script. Serving only the page with them breaks the worker. `credentialless` is not supported in Safari. Cross-origin isolation breaks nothing in this app: the same-origin MP3s and Tone.js's blob worker keep working.
- **Pitfalls found:**
  - Use synchronous `runPython`, not `runPythonAsync`, because interrupts escape the async version.
  - Use the `write` stdout handler, not `batched`.
  - Pass `dedent: false`, or IndentationError is hidden.
  - Give each run a fresh globals dict with `__name__ = "__main__"`.
  - `sys.modules`, `random` state and the virtual FS persist between runs.
- **Curriculum:** 101 challenges are deterministic, 21 depend on the kid's free choice, 6 use seeded random and 5 use unseeded random. None uses `input()`, `time` or `pybricks` today.
- **Hardcoding.** With output rules alone, printing the expected text beats 117/133 challenges. Adding runtime probes brings that down to 18, and adding `ast` concept checks brings it to 0 across the tested wrong answers, with no wrong rejections of 9 alternative correct answers.

## 1. Engine and loading

- **Pinned version.** Pin Pyodide to exactly 314.0.7, because the friendly error translations depend on Python's wording.
- **Self-hosting.** Serve the files from a versioned folder, `/pyodide/314.0.7/`, not a CDN, so school firewalls only need our origin.
- **Vite build:**
  - `optimizeDeps.exclude: ['pyodide']`
  - `worker.format: 'es'`
  - copy the Pyodide files into the versioned folder
  - send the COOP/COEP headers from the dev server (`server.headers`)
- **`vercel.json`:**
  - COOP and COEP on every path
  - long-lived `immutable` caching for `/pyodide/<version>/`
- **`src/python/`:**
  - `runner.js` is the main-thread API, e.g. `run(code, { onOutput, onInput, onDone })`, `grade(code, challenge, recordedInputs)`, `stop()`, and a status of loading, ready or unavailable.
  - `py.worker.js` is a module worker that loads Pyodide once for the whole app.
  - `harness.py` runs kid code as `main.py`, so traceback line numbers match the editor.
- **When loading happens.** Loading starts in the background when the world map first appears. A Run pressed while loading shows "Waking up Python…" and runs as soon as Python is ready. Stop works while it waits. If Python is still loading 45 s after loading started (`LOAD_TIME_LIMIT_MS`), as on a stalled download, a Run waiting for it gives up and uses the keyword grader, and so does every Run until Python is ready. Loading carries on, so a slow load never makes Python unavailable.
- **Fallback.** Feature detection covers module workers, WebAssembly and SharedArrayBuffer (via `crossOriginIsolated`). If detection fails or loading fails, the game uses the keyword grader (`validateOffline`) with a small "output isn't available on this device" note.
- **Limits:**
  - Stop button: sets the interrupt buffer.
  - Wall-clock limit: 10 s for a visible Run, 2 s per hidden grading run.
  - Output cap: about 2,000 lines.
  - `time.sleep`: replaced with an interruptible version, which is instant during grading.
  - Last resort, e.g. when a bare `except:` swallows the interrupt: terminate the worker and respawn it.
- **Clean slate.** Every run gets:
  - a fresh namespace with `__name__ = "__main__"`
  - the kid's modules cleared from `sys.modules`
  - `random` re-seeded or reset
  - a per-run id, so a late result from a stopped or earlier run is never taken for this run's
- **Tampering.** Kid code shares one interpreter with grading, so it can reach grading's globals (for example through `time.sleep.__globals__` or `sys._getframe`) and, through `import js`, replace the worker's message handler to fake a grade that carries the right id. The per-run id doesn't stop that. What does stop the easy, copy-paste kind is a guard on the page, where kid code can't reach: code that names a way into Python's insides (`reachesIntoPython` in `flow.js`: `__globals__`, frame attributes, `import js`, `pyodide`, `gc`, `ctypes` and the like) still runs, but isn't graded, and the worker is restarted after it. A determined kid can always fake their own progress on their own device, and that's acceptable.

## 2. Running, input and output

- **Run** executes the code and streams stdout into the OUTPUT panel, replacing "(Output preview not available in Guide mode)". During a visible Run, `random` is unseeded, so dice rolls vary.
- **`input()`.**
  - The prompt appears in the output panel with an inline text box. Enter submits the answer, which is echoed as a terminal would. This works through SharedArrayBuffer and `Atomics.wait` in the worker.
  - The typed answers are recorded and replayed during grading.
- **Stop.** While code runs, the Run button becomes ■ Stop.
- **Friendly errors.** When a program crashes, the panel shows, in order:
  1. whatever it printed
  2. a kid-friendly headline with the line number, e.g. "Line 3: Python expected a colon `:` at the end of this line"
  3. that line's code
  4. a collapsed "What Python said" section with the real error text
- **Errors covered:**
  - missing colon
  - unclosed string or bracket
  - unexpected indent, and a missing indented block
  - NameError, including Python's "Did you mean…?" and a "put words in quotes" hint
  - str plus int
  - ZeroDivisionError, IndexError, KeyError
  - ValueError from `int("abc")`
  - AttributeError
  - RecursionError
  - timeout ("still running after 10 seconds — is a loop missing a way to stop?")
  - output cap
- **Editor.** Add a line-number gutter; this is the only editor change.
- **Practice Arena.** It gets the same output panel, input box and Stop button.
- **Order of a Run:**
  1. the visible run
  2. if it finishes without an error, the hidden grading
  3. pass, near-miss or hint feedback

  If the program errors, the kid sees the friendly error and no grading happens.

## 3. Grading

The rules live in `src/checks.js`, one per challenge, keyed by id and kept separate from the lesson text. The first draft comes from the research inventory. A rule combines three kinds of check.

1. **Output.** Kinds: `exact`, `lines` in order, a per-line `pattern` (for free choices such as "any food"), `values` that must appear, and a line `count`.
   - Normalization ignores trailing whitespace and trailing blank lines.
   - Characters kids can't easily type count as equal: `—`/`-`, curly/straight quotes, `°`, and a missing emoji.
   - A difference only in capitals or punctuation is a near miss. It does not pass, and the hint names the line: "Line 1 of your output says `hello, world` — so close! Check capital letters and punctuation."
   - A difference only in spacing is a near miss too, and its hint says "Check the spaces." A line made only of punctuation or symbols, such as `###` for `####`, is not a near miss, because nothing is left to compare once the punctuation is dropped.
2. **Concepts** (checked with `ast`): requires and forbids, e.g. a `for` loop, an f-string, no f-strings, a function with 2 parameters. Only constructs the task text tells the kid about are enforced (36 challenges); constructs named only in `expectedBehavior` are not.
3. **Probes** (hidden re-runs):
   - re-run with different starter values
   - call the kid's functions with test inputs (on copied globals, with the same limits)
   - check final variable values
   - patch or seed `random`

   A failure message is gentle, e.g. "Your answer didn't change when the numbers did — try calculating it instead of typing it."

**Determinism.** Grading runs control `random`, replay the recorded input (or scripted input from the rule), and make `time.sleep` instant.

**Feedback order:** error, then output, then concept, then probe. Hints get more specific on later attempts. The full expected output is never shown.

**Fallback.** The keyword grader is used only when Python can't run.

**Known content bugs.** grind_17 (seed 42 makes "Correct!" unreachable), ch12_boss (Run2 never launches) and grind_23 (all runs fit, so the time limit is never tested) get rules that accept the reference solution. The content fixes are a follow-up.

## 4. Testing and rollout

- **`node:test` with real Pyodide.** The tests load the pinned `pyodide` npm package, with no network. For every challenge:
  - the reference passes
  - the starter fails
  - `print("hello")` fails
  - alternative correct answers pass
  - the wrong-answer corpus fails, with the counts pinned by ratchets
- **Runner tests:** interrupt, timeout, output cap, scripted `input()`, the clean slate between runs, and the result-id guard.
- **Friendly-error tests:** each error type gives the right message and line.
- **Existing tests.** The keyword-grader tests stay (it remains the fallback). CI's Python moves from 3.12 to 3.14.
- **Browser checks.** Verify in Chrome in the in-app browser with the real headers. Safari/iPad and a school Chromebook are checked by Scott on the Vercel preview before merge.
- **Rollout.** Work happens on the `pyodide-runner` branch. Vercel builds a preview, and `main` is untouched until merge. There are four stages:
  1. engine
  2. output panel, input, Stop, errors and fallback
  3. rules for all 133 challenges, written in parallel by chapter and verified independently
  4. end-to-end browser checks and docs, then a PR
- **Size.** About 13.5 MB of Pyodide files, downloaded once per device (about 6 MB compressed) and cached.

## Risks

- Hidden probes may reject unusual correct programs at first. The wording stays gentle, and the rules get tuned from real submissions.
- Load time and memory on low-end Chromebooks are unmeasured.
- Headers set on only some responses silently break the worker; the fallback covers this, and a test checks `vercel.json`.
- A Pyodide upgrade can change error wording; the version is pinned and the error tests catch it.
