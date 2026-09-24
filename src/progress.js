import { CHAPTERS, TROPHIES, GRIND_CHALLENGES } from "./content.js";

const SIDE_QUEST_IDS = new Set(CHAPTERS.flatMap(c => c.rooms.filter(r => r.optional).map(r => r.id)));

// Trophy ids that older versions saved by mistake, mapped to the catalogue ids.
const LEGACY_TROPHY_IDS = { act1_grad: "act1_complete", explorer: "side_quest_fan" };

const unique = list => [...new Set(list || [])];

// A room the player marks done themselves (after the grader keeps saying no to code that runs) is worth
// this share of its XP.
export const MARK_DONE_XP_FACTOR = 0.5;

// Every main room, side quest and boss by id, for turning saved ids back into names.
const CHALLENGES_BY_ID = new Map(CHAPTERS.flatMap(c => [
  ...c.rooms.map(r => [r.id, { id: r.id, name: r.name, isBoss: false }]),
  ...(c.boss ? [[c.boss.id, { id: c.boss.id, name: c.boss.name, isBoss: true }]] : []),
]));

// Practice challenges unlock once the player has cleared a room in their
// chapter or any later one.
export function availablePractice(completedRooms) {
  const cr = new Set(completedRooms || []);
  const order = CHAPTERS.map(c => c.id);
  let reached = -1;
  CHAPTERS.forEach((c, i) => { if (c.rooms.some(r => cr.has(r.id))) reached = i; });
  return GRIND_CHALLENGES.filter(g => {
    const idx = order.indexOf(g.minCh);
    return idx !== -1 && idx <= reached;
  });
}

// roomsThisSession counts the clear being recorded now.
export function earnTrophies(p, { noHints, roomsThisSession = 0 }) {
  const earned = [...(p.trophies || [])], newT = [];
  const add = (id) => { if (!earned.includes(id)) { earned.push(id); const t = TROPHIES.find(t => t.id === id); if (t) newT.push(t) } };
  const cr = new Set(p.completedRooms || []), cb = new Set(p.completedBosses || []);
  if (cr.size >= 1) add("first_clear");
  if (cb.size >= 1) add("boss_slayer");
  if (noHints) add("no_hints");
  if (roomsThisSession >= 3) add("streak_3");
  if (p.xp >= 100) add("xp_100");
  if (p.xp >= 500) add("xp_500");
  if (p.xp >= 1000) add("xp_1000");
  // Act 1 graduate — all 5 Act 1 bosses
  if (["ch1_boss", "ch2_boss", "ch3_boss", "ch4_boss", "ch5_boss"].every(b => cb.has(b))) add("act1_complete");
  // Explorer — 5 side quests
  if ([...cr].filter(r => SIDE_QUEST_IDS.has(r)).length >= 5) add("side_quest_fan");
  // Summit — reached ch8
  if (CHAPTERS.find(c => c.id === "ch8")?.rooms?.some(r => cr.has(r.id)) || cb.has("ch8_boss")) add("summit");
  // Final boss
  if (cb.has("ch8_boss")) add("final_boss");
  // Arena trophies
  if (cb.has("ch9_boss")) add("game_builder");
  if (cb.has("ch10_boss")) add("arena_champion");
  if (cb.has("ch9_boss") && cb.has("ch10_boss")) add("act3_grad");
  // Rover Bay trophies
  if (cb.has("ch11_boss")) add("dockmaster");
  if (cb.has("ch12_boss")) add("mission_control");
  if (cb.has("ch11_boss") && cb.has("ch12_boss")) add("rover_complete");
  return { trophies: earned, newTrophies: newT };
}

// Repairs saves written by older versions: legacy trophy ids, duplicate
// records from replays, and missing fields.
export function normalizeProfile(p) {
  return {
    ...p,
    xp: p.xp || 0,
    completedRooms: unique(p.completedRooms),
    completedBosses: unique(p.completedBosses),
    trophies: unique((p.trophies || []).map(id => LEGACY_TROPHY_IDS[id] || id)),
    markedDone: unique(p.markedDone),
  };
}

// The rooms and bosses the player marked done, in the order they did it: [{ id, name, isBoss }].
export function markedDoneChallenges(profile) {
  return unique(profile.markedDone).map(id => CHALLENGES_BY_ID.get(id)).filter(Boolean);
}

// XP, badges and records are only awarded the first time a room or boss is
// cleared; replays leave the profile unchanged.
export function recordClear(profile, { id, isBoss, xp }) {
  const key = isBoss ? "completedBosses" : "completedRooms";
  const done = profile[key] || [];
  if (done.includes(id)) return { profile, firstClear: false, badge: null };
  const u = { ...profile, xp: (profile.xp || 0) + xp, [key]: [...done, id] };
  let badge = null;
  if (isBoss) {
    const ch = CHAPTERS.find(c => c.boss?.id === id);
    if (ch?.badge && !(u.badges || []).find(b => b.name === ch.badge.name)) {
      u.badges = [...(u.badges || []), ch.badge];
      if (ch.equipment) u.equipment = [...(u.equipment || []), ch.equipment];
      badge = ch.badge;
    }
  }
  return { profile: u, firstClear: true, badge };
}

// Everything a clear changes, and what to show next: the new trophies (one
// popup each), then the boss badge. `changed` says whether to save. Replays
// give no XP, records or badge, but can still earn play-style trophies such as
// No Peeking.
// markedDone: the player marked the room done themselves. It gives half XP and
// never No Peeking, and is remembered in profile.markedDone. A boss still gives
// its badge, so the next chapter opens. Marking done a room already cleared
// changes nothing.
export function afterClear(profile, { id, isBoss, xp, noHints, roomsThisSession, markedDone = false }) {
  const gained = markedDone ? Math.round(xp * MARK_DONE_XP_FACTOR) : xp;
  const { profile: recorded, firstClear, badge } = recordClear(profile, { id, isBoss, xp: gained });
  if (markedDone && !firstClear) return { profile, firstClear, badge: null, newTrophies: [], changed: false };
  const cleared = markedDone ? { ...recorded, markedDone: unique([...(recorded.markedDone || []), id]) } : recorded;
  const { trophies, newTrophies } = earnTrophies(cleared, { noHints: noHints && !markedDone, roomsThisSession });
  if (!firstClear && newTrophies.length === 0) return { profile, firstClear, badge: null, newTrophies, changed: false };
  return { profile: { ...cleared, trophies }, firstClear, badge, newTrophies, changed: true };
}
