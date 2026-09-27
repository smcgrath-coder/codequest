// tests/tutor-wiring.test.js
// Where Byte appears in App.jsx, read from the source (node can't render React): in a room only after the last
// hint, where asking costs No Peeking; on the victory screen, where it doesn't and the mode follows a real pass or
// "Mark it done"; never in the Practice Arena. A question on its way is in the room's shared chat: every panel and
// Run wait for it, and it never outlives its question. TutorPanel's colours are checked by no-raw-colours.test.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
// One top-level function's source, up to the next top-level declaration.
function piece(name) {
  const start = app.search(new RegExp(`^function ${name}\\(`, "m"));
  assert.ok(start !== -1, `function ${name}`);
  const next = app.slice(start + 1).search(/^(?:function|class|const|let|export|\/\/ ═)/m);
  return app.slice(start, next === -1 ? undefined : start + 1 + next);
}
const panels = src => [...src.matchAll(/<TutorPanel\b[\s\S]*?\/>/g)].map(m => m[0]);

test("in a room, Ask Byte is offered through shouldOfferTutor after the last hint, in hint mode, and asking costs No Peeking", () => {
  const room = piece("ChallengeRoom");
  assert.match(room, /shouldOfferTutor\("room",hintLevel,challenge\.hints\.length\)/);
  const [inRoom] = panels(room).filter(p => p.includes('tutorMode("room"'));
  assert.ok(inRoom, "a TutorPanel in the room");
  assert.match(inRoom, /onAsk=\{\(\)=>setUsedHints\(true\)\}/);
  assert.match(inRoom, /busy=\{isRunning\}/);
});

test("on the victory screen, Byte's mode follows passed and markedDone, and asking leaves No Peeking alone", () => {
  const room = piece("ChallengeRoom"), victory = piece("Victory");
  const [onVictory] = panels(room).filter(p => p.includes('tutorMode("victory",passed,markedDone)'));
  assert.ok(onVictory, "a TutorPanel for the victory screen");
  assert.doesNotMatch(onVictory, /onAsk/);
  assert.equal(panels(room).length, 2);
  assert.doesNotMatch(victory, /setUsedHints|usedHints\s*=/);
  assert.match(victory, /Any questions about this room\?/);
  assert.match(victory, /autoFocus=\{markedDone\}/, "CONTINUE still takes the focus after Mark it done");
});

test("the room and its victory screen share one chat, which ends with the room", () => {
  const room = piece("ChallengeRoom");
  assert.match(room, /const \[chat,setChat\]=useState\(\[\]\)/);
  for (const p of panels(room)) assert.match(p, /chat=\{chat\} setChat=\{setChat\}/);
});

test("the Practice Arena never gets Byte", () => {
  assert.doesNotMatch(piece("GrindingZone"), /Tutor|tutor/);
});

test("TutorPanel checks hint replies with the leak guard, hides their code while streaming, forgets a locked code, and stops when closed", () => {
  const panel = piece("TutorPanel");
  // The guard joins the reply with Byte's earlier code in this chat (before the new question) and the kid's program.
  assert.match(panel, /guardReply\(r\.text,\{mode,grade,earlier:earlierCode\(chat\),program:context\.program\}\)/);
  assert.match(panel, /mode==="hint"\?hideCode\(t\):t/);
  assert.match(panel, /onTutorState\(r\.state\)/);
  assert.match(panel, /useEffect\(\(\)=>\(\)=>abortRef\.current\?\.abort\(\),\[\]\)/);
  assert.match(panel, /useTheme\(\)/);
});

test("a question on its way is in the shared chat, so every panel for the room waits for it; the code check waits on its own", () => {
  const panel = piece("TutorPanel");
  assert.match(panel, /const waiting=replyPending\(chat\)/);
  assert.doesNotMatch(panel, /setWaiting/, "no waiting of its own, which the other panel wouldn't see");
  assert.match(panel, /const ask=async\(\)=>\{const q=draft\.trim\(\);if\(!q\|\|waiting\|\|busy\)return;/);
  assert.match(panel, /<Btn onClick=\{ask\} disabled=\{!draft\.trim\(\)\|\|waiting\|\|busy\}/);
  assert.match(panel, /const \[checking,setChecking\]=useState\(false\)/);
  assert.match(panel, /const unlock=async\(\)=>\{const c=code\.trim\(\);if\(!c\|\|checking\)return;/);
  assert.match(panel, /<Btn onClick=\{unlock\} disabled=\{!code\.trim\(\)\|\|checking\}/);
});

test("however a question ends, its reply stops waiting: one that doesn't come goes, and its question is marked failed", () => {
  const panel = piece("TutorPanel"), ask = panel.slice(panel.indexOf("const ask="), panel.indexOf("const field="));
  assert.match(ask, /setChat\(c=>asked\(c,id,q\)\)/);
  // Failed, stopped (Hide Byte or leaving, while it streams or while the guard checks it) or broken: finally drops it
  assert.match(ask, /try\{[\s\S]*\}catch\{if\(!ac\.signal\.aborted\)[^}]*onTutorState\("busy"\)[^}]*\}(?:\s*\/\/.*)?\s*finally\{if\(!answered\)setChat\(c=>dropReply\(c,id\)\)\}\s*\};\s*$/);
  const tryAt = ask.indexOf("try{"), aborted = [...ask.matchAll(/if\(ac\.signal\.aborted\)return/g)];
  assert.equal(aborted.length, 2, "after the stream and after the guard");
  for (const m of aborted) assert.ok(m.index > tryAt, "a stop returns inside the try");
  // Only a finished reply keeps its place
  assert.match(ask, /put\(\{content:text,pending:false\}\);answered=true/);
  assert.equal(ask.match(/answered=true/g).length, 1);
});

test("Run waits while Byte answers, Ctrl+Enter too, but Stop still stops a program that's already running", () => {
  const room = piece("ChallengeRoom");
  assert.match(room, /const byteAnswering=replyPending\(chat\)/);
  assert.match(room, /const handleRun=async\(\)=>\{\s*if\(isRunning\|\|passed\|\|byteAnswering\)return;/);
  assert.match(room, /<CodeEditor code=\{code\} setCode=\{setCode\} onRun=\{handleRun\}\/>/, "Ctrl+Enter goes through handleRun");
  const [run] = room.match(/<Btn onClick=\{\(\)=>\{if\(runStop\.click\(\)\)\(isRunning\?stopCode:handleRun\)\(\)\}\}[\s\S]*?<\/Btn>/);
  assert.match(run, /disabled=\{passed\|\|\(byteAnswering&&!isRunning\)\}/);
  assert.match(run, /\{isRunning\?"■ Stop":passed\?\(markedDone\?"✓ Marked done":"✓ Passed!"\):byteAnswering\?"⌛ Byte is answering…":"▶ Run Code"\}/);
});

test("a screen reader hears the question go out, then the whole checked reply, not each piece as it streams", () => {
  const panel = piece("TutorPanel"), ask = panel.slice(panel.indexOf("const ask="), panel.indexOf("const field="));
  assert.doesNotMatch(panel.match(/<div ref=\{logRef\}[^>]*>/)[0], /aria-live|role=/, "the log isn't a live region");
  assert.match(panel, /const \[said,setSaid\]=useState\(""\)/);
  assert.match(panel, /<div className="sr-only" aria-live="polite">\{said\}<\/div>/);
  assert.match(ask, /setSaid\("Byte is thinking…"\)/);
  assert.match(ask, /put\(\{content:text,pending:false\}\);answered=true;[^\n]*setSaid\(spoken\(text\)\)/, "the guarded reply, as plain text");
  assert.doesNotMatch(ask, /onText:[^\n]*setSaid/, "never the pieces as they stream");
  // A note is read out by the status line, which is always there (so a reader catches it) and the hidden line goes quiet
  assert.match(panel, /const tell=s=>\{setSaid\(""\);setNote\(s\)\}/);
  assert.equal(ask.match(/tell\(/g).length, 2, "a failed answer and a broken one");
  assert.doesNotMatch(panel, /setNote\(onTutorState/, "every note goes through tell");
  assert.match(panel, /<div role="status"[^>]*>\{note\?\.say\}<\/div>/);
  assert.doesNotMatch(panel, /note&&<div role="status"/);
  assert.match(panel, /<span aria-hidden="true"[^>]*>▊<\/span>/, "the cursor isn't read out");
  assert.doesNotMatch(panel, /aria-label="Byte is thinking"/);
});
