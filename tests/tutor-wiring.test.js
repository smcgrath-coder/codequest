// tests/tutor-wiring.test.js
// Where Byte appears in App.jsx, read from the source (node can't render React): in a room only after the last
// hint, where asking costs No Peeking; on the victory screen, where it doesn't and the mode follows a real pass or
// "Mark it done"; never in the Practice Arena. TutorPanel's colours are checked by no-raw-colours.test.js.
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
