import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { availablePractice, earnTrophies, normalizeProfile, recordClear, afterClear } from "../src/progress.js";
import { CHAPTERS, TROPHIES, GRIND_CHALLENGES } from "../src/content.js";

const chapter = id => CHAPTERS.find(c => c.id === id);
const sideQuestIds = CHAPTERS.flatMap(c => c.rooms.filter(r => r.optional).map(r => r.id));

describe("Practice Arena unlocks by chapter progress", () => {
  test("a brand-new player has nothing unlocked (not the chapter 9-12 challenges)", () => {
    assert.deepEqual(availablePractice([]), []);
  });

  test("clearing a chapter 1 room unlocks only chapter 1 practice", () => {
    const got = availablePractice(["ch1_r1"]);
    assert.ok(got.length > 0);
    assert.ok(got.every(g => g.minCh === "ch1"), got.map(g => g.minCh).join(","));
  });

  test("reaching chapter 9 unlocks ch1-ch9 practice but not ch10-ch12", () => {
    const got = new Set(availablePractice(["ch1_r1", "ch9_r1"]).map(g => g.minCh));
    assert.ok(got.has("ch9"));
    for (const late of ["ch10", "ch11", "ch12"]) assert.ok(!got.has(late), `${late} should be locked`);
  });

  test("every practice challenge unlocks once all chapters are reached", () => {
    const all = CHAPTERS.map(c => c.rooms[0].id);
    assert.equal(availablePractice(all).length, GRIND_CHALLENGES.length);
  });
});

describe("trophies", () => {
  const everything = {
    xp: 5000,
    completedRooms: CHAPTERS.flatMap(c => c.rooms.map(r => r.id)),
    completedBosses: CHAPTERS.map(c => c.boss.id),
    trophies: [],
  };

  test("every trophy in the catalogue can be earned", () => {
    const { trophies } = earnTrophies(everything, { noHints: true, roomsThisSession: 3 });
    assert.deepEqual([...trophies].sort(), TROPHIES.map(t => t.id).sort());
  });

  test("only catalogue ids are ever awarded", () => {
    const ids = new Set(TROPHIES.map(t => t.id));
    const { trophies, newTrophies } = earnTrophies(everything, { noHints: true, roomsThisSession: 3 });
    assert.ok(trophies.every(id => ids.has(id)));
    assert.equal(newTrophies.length, trophies.length);
  });

  test("Act 1 Graduate needs all five Act 1 bosses", () => {
    const four = { xp: 0, completedBosses: ["ch1_boss", "ch2_boss", "ch3_boss", "ch4_boss"] };
    assert.ok(!earnTrophies(four, {}).trophies.includes("act1_complete"));
    const five = { ...four, completedBosses: [...four.completedBosses, "ch5_boss"] };
    assert.ok(earnTrophies(five, {}).trophies.includes("act1_complete"));
  });

  test("Explorer counts side quests, not other rooms", () => {
    const mains = CHAPTERS.flatMap(c => c.rooms.filter(r => !r.optional).map(r => r.id)).slice(0, 10);
    assert.ok(!earnTrophies({ xp: 0, completedRooms: mains }, {}).trophies.includes("side_quest_fan"));
    const sides = { xp: 0, completedRooms: sideQuestIds.slice(0, 5) };
    assert.ok(earnTrophies(sides, {}).trophies.includes("side_quest_fan"));
  });

  test("already-earned trophies are not announced again", () => {
    const p = { xp: 150, completedRooms: ["ch1_r1"], trophies: ["first_clear"] };
    const { newTrophies } = earnTrophies(p, {});
    assert.deepEqual(newTrophies.map(t => t.id), ["xp_100"]);
  });
});

describe("loading old saves", () => {
  test("legacy trophy ids from the old bug are mapped to the catalogue ids", () => {
    const p = normalizeProfile({ xp: 10, trophies: ["first_clear", "act1_grad", "explorer"] });
    assert.deepEqual(p.trophies, ["first_clear", "act1_complete", "side_quest_fan"]);
  });

  test("duplicate room, boss and trophy records are removed", () => {
    const p = normalizeProfile({
      xp: 10,
      completedRooms: ["ch1_r1", "ch1_r1", "ch1_r2"],
      completedBosses: ["ch1_boss", "ch1_boss"],
      trophies: ["explorer", "side_quest_fan"],
    });
    assert.deepEqual(p.completedRooms, ["ch1_r1", "ch1_r2"]);
    assert.deepEqual(p.completedBosses, ["ch1_boss"]);
    assert.deepEqual(p.trophies, ["side_quest_fan"]);
  });

  test("a profile with missing fields gets safe defaults", () => {
    const p = normalizeProfile({ name: "Kid" });
    assert.equal(p.xp, 0);
    assert.deepEqual(p.completedRooms, []);
    assert.deepEqual(p.completedBosses, []);
    assert.deepEqual(p.trophies, []);
  });
});

describe("clearing rooms and bosses", () => {
  const fresh = { xp: 0, completedRooms: [], completedBosses: [], badges: [], equipment: [] };

  test("a first clear adds the XP and records the room", () => {
    const { profile, firstClear } = recordClear(fresh, { id: "ch1_r1", isBoss: false, xp: 10 });
    assert.equal(firstClear, true);
    assert.equal(profile.xp, 10);
    assert.deepEqual(profile.completedRooms, ["ch1_r1"]);
  });

  test("replaying a cleared room gives no XP and no duplicate record", () => {
    const once = recordClear(fresh, { id: "ch1_r1", isBoss: false, xp: 10 }).profile;
    const { profile, firstClear } = recordClear(once, { id: "ch1_r1", isBoss: false, xp: 10 });
    assert.equal(firstClear, false);
    assert.equal(profile.xp, 10);
    assert.deepEqual(profile.completedRooms, ["ch1_r1"]);
  });

  test("a first boss clear awards the chapter badge and equipment", () => {
    const ch1 = chapter("ch1");
    const { profile, badge } = recordClear(fresh, { id: "ch1_boss", isBoss: true, xp: 50 });
    assert.deepEqual(badge, ch1.badge);
    assert.deepEqual(profile.badges, [ch1.badge]);
    assert.deepEqual(profile.equipment, [ch1.equipment]);
    assert.deepEqual(profile.completedBosses, ["ch1_boss"]);
  });

  test("replaying a beaten boss gives no XP and no badge", () => {
    const once = recordClear(fresh, { id: "ch1_boss", isBoss: true, xp: 50 }).profile;
    const again = recordClear(once, { id: "ch1_boss", isBoss: true, xp: 50 });
    assert.equal(again.firstClear, false);
    assert.equal(again.badge, null);
    assert.equal(again.profile.xp, 50);
    assert.deepEqual(again.profile.badges, [chapter("ch1").badge]);
  });

  test("recordClear does not mutate the profile it is given", () => {
    const before = JSON.stringify(fresh);
    recordClear(fresh, { id: "ch1_boss", isBoss: true, xp: 50 });
    assert.equal(JSON.stringify(fresh), before);
  });
});

describe("what happens after a clear (the popup queue)", () => {
  const fresh = { xp: 0, completedRooms: [], completedBosses: [], badges: [], equipment: [], trophies: [] };
  const clear = (p, id, isBoss, xp, noHints = false, roomsThisSession = 1) =>
    afterClear(p, { id, isBoss, xp, noHints, roomsThisSession });

  test("a first boss clear queues every new trophy, then the badge", () => {
    const p = { ...fresh, xp: 60, completedRooms: ["ch1_r1"], trophies: ["first_clear"] };
    const r = clear(p, "ch1_boss", true, 50);
    assert.deepEqual(r.newTrophies.map(t => t.id), ["boss_slayer", "xp_100"]);
    assert.deepEqual(r.badge, chapter("ch1").badge);
    assert.equal(r.profile.xp, 110);
    assert.equal(r.changed, true);
  });

  test("a first room clear with nothing new just records the room", () => {
    const p = { ...fresh, completedRooms: ["ch1_r1"], trophies: ["first_clear"] };
    const r = clear(p, "ch1_r2", false, 10);
    assert.deepEqual(r.newTrophies, []);
    assert.equal(r.badge, null);
    assert.deepEqual(r.profile.completedRooms, ["ch1_r1", "ch1_r2"]);
  });

  test("a replay gives no XP or badge, but can still earn a play-style trophy", () => {
    const p = recordClear(fresh, { id: "ch1_r1", isBoss: false, xp: 10 }).profile;
    const r = clear({ ...p, trophies: ["first_clear"] }, "ch1_r1", false, 10, true);
    assert.equal(r.firstClear, false);
    assert.equal(r.profile.xp, 10);
    assert.deepEqual(r.profile.completedRooms, ["ch1_r1"]);
    assert.deepEqual(r.newTrophies.map(t => t.id), ["no_hints"]);
    assert.equal(r.badge, null);
    assert.equal(r.changed, true);
  });

  test("a replay that earns nothing leaves the profile untouched", () => {
    const p = { ...recordClear(fresh, { id: "ch1_r1", isBoss: false, xp: 10 }).profile, trophies: ["first_clear", "no_hints"] };
    const r = clear(p, "ch1_r1", false, 10, true);
    assert.equal(r.changed, false);
    assert.equal(r.profile, p);
    assert.deepEqual(r.newTrophies, []);
  });
});
