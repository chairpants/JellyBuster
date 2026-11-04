// ---------------- the employee: Dana, on the register ----------------
// Same TV-head build as the customers, in the store polo. By default she works
// the register: rings up whoever's waiting and silences the gates. E on her
// switches her to processing returns — take an armful from the tote, rewind any
// that need it on the counter rewinder, reshelve each in its own slot — and
// back to the register once the bin's empty (or when you tell her).
const EMP_POST = { x: -5.45, z: 3.2, ry: 0 };                      // behind the register, facing the customer side
const EMP_TOTE = { x: -3.05, z: 4 - 0.35 - 1.05, ry: Math.PI / 2 }; // behind the returns slot, at the tote
const EMP_REWIND = EMP_TOTE;                                         // the rewinders sit on the counter right over the tote
const EMP_ARMFUL = 10;                                              // returns she takes out per trip
// ---------------- skills: six classic stats, levelled by doing the work ----------------
// You and every employee have the same six. Doing a task earns XP in its stat (more for the longer
// or harder ones), XP fills a level, and each level makes that kind of work go better (see lv())
// rate: XP multiplier, so the rarer kinds of work level about as fast as the constant ones (every sale is DEX;
// a shoplifter is a once-a-night thing at best)
const SKILLS = {
  dex: { name: "DEX", long: "Dexterity", what: "the register, desensitizing, the rewinders", rate: 0.6 },
  int: { name: "INT", long: "Intelligence", what: "shelving, misshelves, finding requests, holds", rate: 1.2 },
  cha: { name: "CHA", long: "Charisma", what: "upsells, recommendations, sign-ups, the phone", rate: 1 },
  str: { name: "STR", long: "Strength", what: "restocking the racks, unpacking deliveries", rate: 1.4 },
  con: { name: "CON", long: "Constitution", what: "cleaning up, being on your feet all day", rate: 1.5 },
  wis: { name: "WIS", long: "Wisdom", what: "reading customers, spotting shoplifters, the gate alarm", rate: 2.5 },
};
const SKILL_IDS = Object.keys(SKILLS), SKILL_MAX = 20;
const xpToNext = L => Math.round(60 * 1.5 ** (L - 1));   // XP from level L to L+1: 60, 90, 135, 203... x1.5 each (~4.5k total to 10, ~260k to 20)
const skillsOf = levels => Object.fromEntries(SKILL_IDS.map(k => [k, { lvl: levels?.[k] ?? 1, xp: 0 }]));
const you = { first: "You", skills: { ...skillsOf(), ...SAVE?.you?.skills } };
const DEBUG_LVL = +new URLSearchParams(location.search).get("lvl");   // debug: index.html?lvl=10 sets all your stats, misshelves a few tapes, and never saves
if (DEBUG_LVL) for (const k of SKILL_IDS) you.skills[k] = { lvl: Math.min(SKILL_MAX, DEBUG_LVL), xp: 0 };
const whoIs = who => who === "you" || who === "player" ? you : who === "dana" ? emp : who;   // "dana": whichever employee is acting (emp)
const lv = (who, k) => whoIs(who)?.skills?.[k]?.lvl ?? 1;
// milestone unlocks on top of the per-level nudges: [name, what it does, staff get it too]
const MILESTONES = {
  dex: { 5: ["Quick Thread", "rewinders you load run 30% faster", true], 10: ["Lucky Spool", "1 in 5 rewinds is done in a blink", true] },
  int: { 5: ["Shelf Sense", "the slot for the tape in your hand glows"], 10: ["Keen Eye", "misshelved tapes glow"] },
  cha: { 5: ["Smooth Talker", "charging late fees costs half the goodwill", true], 10: ["Store Favorite", "customers wait 30% longer in line"] },
  str: { 5: ["Strong Grip", "carry a third trash bag"], 10: ["Pack Mule", "carry two more boxes"] },
  con: { 5: ["Second Wind", "sprint 15% faster"], 10: ["Neat Freak", "cleaning a mess sweeps up others within 3m"] },
  wis: { 5: ["Sixth Sense", "shoplifters glow red"], 10: ["Stern Look", "a shoplifter you stare down gives up 85% of the time"] },
};
const has = (who, k, L) => lv(who, k) >= L;
const linePatience = () => has("you", "cha", 10) ? 1.3 : 1;   // Store Favorite
// glowing markers for the "see it" unlocks (Shelf Sense, Keen Eye, Sixth Sense): a small pool, re-placed every frame
const beacons = [];
function beaconAt(i, pos, ry, color, w = TAPE.w, h = TAPE.h, d = TAPE.d) {
  const b = beacons[i] ||= (() => {
    const m = glow(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false })));
    scene.add(m); return m;
  })();
  b.visible = true; b.position.copy(pos); b.rotation.set(0, ry, 0); b.scale.set(w, h, d); b.material.color.set(color);
  b.material.opacity = 0.35 + 0.25 * Math.sin(performance.now() / 180);   // a slow pulse
}
// ---- light spill through the back-of-house doorways ----
// Each room's lighting stops dead at its walls (see ROOM_FRAG), so a lit room next to a dark one met it in a hard seam.
// Instead, each doorway lets light through both ways: a lit room glows out into the dark hall (and the lit hall into a
// dark room), fading over a few meters, as far as the door is open. [from a zone, to a box, through (x, y, z), reach]
const SPILLS = (() => {
  const HZ = BOH.hallZ, Z = STORE.z, X = STORE.x, hall = [BOH.x0, CLOSET.x0, Z, HZ];
  const rrM = [BOH.rrX, BOH.splitX, HZ, BOH.z1], rrF = [BOH.x0, BOH.rrX, HZ, BOH.z1], brk = [BOH.splitX, X, HZ, BOH.z1], cl = [CLOSET.x0, X, Z, HZ], floor = [BOH_DOORS.store - 3, BOH_DOORS.store + 3, Z - 6, Z];
  // a doorway: in a wall along x (z = at) or along z (x = at), centered c, half width hw; the lit side (+1/-1 across the
  // wall), and how far back in there (depth) and how high (y) its light is. The door itself (if any) is found by position
  const dw = (alongX, at, c, hw, side, depth, y, door = true) => ({ alongX, at, c, hw, door,
    src: alongX ? [c, y, at + side * depth] : [at + side * depth, y, c] });
  const brkD = s => dw(true, HZ, BOH_DOORS.breakroom, DOOR_W / 2, s, s > 0 ? 1.3 : 0.9, s > 0 ? 2.4 : 2.55);
  const rrD = (s, c = BOH_DOORS.restroom) => dw(true, HZ, c, DOOR_W / 2, s, s > 0 ? 1.3 : 0.9, s > 0 ? 2.4 : 2.55);
  const clD = s => dw(false, CLOSET.x0, BOH_DOORS.closet, CLOSET.doorW / 2, s, s > 0 ? 0.6 : 0.9, s > 0 ? 2.28 : 2.55);
  const opD = s => dw(true, Z, BOH_DOORS.store, BOH_OPENING_W / 2, s, s < 0 ? 3 : 0.9, s < 0 ? 3.4 : 2.55, false);
  return [
    { from: "breakroom", into: "hall", to: hall, ...brkD(1) },
    { from: "restroom", into: "hall", to: hall, ...rrD(1) },
    { from: "restroom", into: "hall", to: hall, ...rrD(1, BOH_DOORS.restroomF) },
    { from: "closet", into: "hall", to: hall, ...clD(1), warm: true, reach: 2.6 },
    { from: "lounge", into: "hall", to: hall, ...opD(-1), reach: 4.5 },                  // the sales floor through its wide opening
    { from: "hall", into: "breakroom", to: brk, ...brkD(-1) },
    { from: "hall", into: "restroom", to: rrM, ...rrD(-1) },
    { from: "hall", into: "restroom", to: rrF, ...rrD(-1, BOH_DOORS.restroomF) },
    { from: "hall", into: "closet", to: cl, ...clD(-1), reach: 2 },
    { from: "hall", into: "lounge", to: floor, ...opD(1), reach: 4.5 },
  ];
})();
function spillTick() {                            // the live spills (a lit room, its door open, a darker one through it) into the shader
  const U = TVU, lvl = z => (z === "closet" ? 0.8 : 1) * zoneLvl[z];
  let n = 0;
  for (const s of SPILLS) {
    if (s.door && s.d === undefined) s.d = doors.find(d => d.alongX === s.alongX && Math.abs(d.at - s.at) < 0.01 && Math.abs(d.c - s.c) < 0.01) || null;
    const open = !s.door ? 1 : s.d ? Math.min(1, Math.abs(s.d.a / s.d.openA)) : 0;   // how far its door's swung (a doorway: always open)
    const src = lvl(s.from), k = src > lvl(s.into) + 0.01 ? 0.75 * open * src : 0;
    if (k < 0.005) continue;
    U.uSpillP.value[n].set(...s.src, s.reach || 3.5); U.uSpillB.value[n].set(...s.to);
    U.uSpillD.value[n].set(s.alongX ? 0 : 1, s.at, s.c, s.hw);
    U.uSpillC.value[n].set(k * (s.warm ? 1.12 : 1), k * (s.warm ? 0.95 : 1), k * (s.warm ? 0.74 : 1), 0);
    n++;
  }
  U.uSpillN.value = n;
}
function milestoneTick() {
  let n = 0;
  if (held?.offShelf && held.pos && has("you", "int", 5)) beaconAt(n++, held.pos, held.ry, 0x66ffcc, TAPE.w * 1.4, TAPE.h * 1.1, TAPE.d * 1.1);
  if (has("you", "int", 10)) for (const s of strays) beaconAt(n++, s.mesh.position, s.mesh.rotation.y, 0xffcc33, TAPE.w * 1.3, TAPE.h * 1.2, TAPE.d * 1.3);
  if (has("you", "wis", 5)) for (const k of custs) if (k.sneaking && !k.alarmed && k.c) beaconAt(n++, k.c.group.position.clone().setY(k.c.group.position.y + 2.05), 0, 0xff3030, 0.18, 0.18, 0.18);
  for (let i = n; i < beacons.length; i++) beacons[i].visible = false;
}
function gainXp(who, k, amt) {
  const w = whoIs(who), sk = w?.skills?.[k]; if (!sk || sk.lvl >= SKILL_MAX || !amt) return;
  sk.xp += amt * SKILLS[k].rate * (w !== you && upg.dana ? 1.5 : 1);   // (staff training: they learn faster)
  while (sk.lvl < SKILL_MAX && sk.xp >= xpToNext(sk.lvl)) {
    sk.xp -= xpToNext(sk.lvl); sk.lvl++;
    logAct(`${w === you ? "Your" : `${w.first}'s`} ${SKILLS[k].long} is up to ${sk.lvl}`, "good");
    const m = MILESTONES[k][sk.lvl];
    if (m && (w === you || m[2])) logAct(`${w === you ? "Unlocked" : `${w.first} unlocked`} ${m[0]}: ${m[1]}`, "good");
    if (w === you) toast(m ? `${SKILLS[k].name} ${sk.lvl}! Unlocked ${m[0]}: ${m[1]}` : `${SKILLS[k].name} up! Level ${sk.lvl}`, true);
  }
  sheetHud();
}
const empSummary = e => SKILL_IDS.map(k => `${SKILLS[k].name} ${e.skills[k].lvl}`).join(" · ");
const avgLevel = e => SKILL_IDS.reduce((a, k) => a + e.skills[k].lvl, 0) / SKILL_IDS.length;
const empWage = e => 35 + 3 * Math.round(avgLevel(e) - 2.5);   // a little more for the better ones
const empRate = e => +(empWage(e) / 5).toFixed(2);   // by the hour: $7 for an average hand
// the schedule: each employee's week, hour by hour from 9 AM (before opening) to midnight, as
// 7 bitmasks (bit n = 9+n o'clock), part-time: up to 25 hours. On the clock they come in the
// front door; off it they finish what they're doing and head out the same way. After close,
// whoever's still in stays till you send them home
const SCHED_H0 = 9, SCHED_SLOTS = 15, SCHED_MAX = 25;
const bits = m => { let n = 0; for (; m; m &= m - 1) n++; return n; };
const schedHours = e => e.sched.reduce((a, m) => a + bits(m), 0);
function defaultSched(i) {                       // five 5-hour shifts, staggered: evenings (the rush), every other hire afternoons
  const sc = Array(7).fill(0), from = i % 2 ? 3 : 8;   // 12-5 PM / 5-10 PM
  for (let k = 0; k < 5; k++) sc[(3 + i * 2 + k) % 7] |= ((1 << 5) - 1) << from;
  return sc;
}

// applicants: a name, a look (gender, height, build, their TV) and stats that always add up to the
// same total, so each one's as good as the others, just good at different things
const FIRST_F = ["Dana", "Tina", "Kim", "Stacy", "Jen", "Lisa", "Amy", "Becky", "Tanya", "Rhonda", "Gina", "Missy", "Carla", "Wendy", "Trish", "Nikki", "Shawna", "Heather"];
const FIRST_M = ["Kevin", "Troy", "Duane", "Chad", "Marcus", "Todd", "Ray", "Eddie", "Jason", "Luis", "Derek", "Kyle", "Brian", "Andre", "Shane", "Gary", "Manny", "Rob"];
const LASTS = ["Reyes", "Kowalski", "Nguyen", "Brennan", "Okafor", "Delgado", "Murphy", "Patel", "Hendricks", "Lund", "Castillo", "Baker", "Ortiz", "Sato", "Fitzgerald", "Novak", "Harlan", "Pruitt"];
const STAT_TOTAL = 15, STAFF_MAX = 4;
function rollApplicant(rnd = Math.random) {
  const pickR = a => a[Math.floor(rnd() * a.length)], female = rnd() < 0.5, first = pickR(female ? FIRST_F : FIRST_M);
  const levels = Object.fromEntries(SKILL_IDS.map(k => [k, 1]));
  for (let left = STAT_TOTAL - SKILL_IDS.length; left > 0;) { const k = pickR(SKILL_IDS); if (levels[k] < 6) { levels[k]++; left--; } }
  const outfit = { ...StoreCustomers.randomOutfit(rnd, female), top: "uniform", topA: "#1b3fa0", topB: "#ffd400", longSleeves: false, nameTag: first.toUpperCase(),
    pants: female ? "jeans" : "khaki", pantsColor: "#b9a27a", shoes: "#1e1e1e", hat: null, sleeve: female ? "cap" : "short", hightop: false, tights: null };   // (hers: the same khakis in a slimmer cut, the fitted polo)
  return { first, last: pickR(LASTS), female, outfit, levels };
}
const DANA_APP = { first: "Dana", last: "Reyes", female: true, levels: { dex: 3, int: 3, cha: 3, str: 2, con: 2, wis: 2 },
  outfit: { ...StoreCustomers.randomOutfit(seeded(417), true), top: "uniform", topA: "#1b3fa0", topB: "#ffd400", longSleeves: false, nameTag: "DANA",
    pants: "jeans", pantsColor: "#b9a27a", shoes: "#1e1e1e", hat: null, sleeve: "cap", tights: null, tv: { kind: "black", color: "#1c1c1e", w: 0.46, h: 0.36, d: 0.36, antenna: false, knobs: true }, phosphor: "#c9a8ff" } };
function looksOf(o) {                             // "tall, broad build, a silver TV with an antenna"
  return [o.height > 1.035 ? "tall" : o.height < 0.965 ? "short" : "average height", o.build > 1.07 ? "broad build" : o.build < 0.96 ? "slim" : "average build",
    `a ${o.tv.kind} TV${o.tv.antenna ? " with antennas" : ""}`].join(", ");
}

// the staff: everyone hired, each with their own state (what used to be Dana's alone), skills and job
// priorities. The employee code below runs once a frame per employee with `emp` set to whoever it's
// about; anything that needs a particular employee from outside goes through withEmp
const empState = () => ({ coT: 0, coReached: false, c: null, task: "register", state: "", path: [], ry: 0, face: 0, t: 0, ringT: 0, alarmT: 0, carry: [], rewinding: [], openedFlap: false, stuck: 0,
  box: { x0: 0, x1: 0, z0: 0, z1: 0, shadow: false, staff: true } });
const staff = [];
const NOBODY = { ...empState(), first: "", jobs: [], skills: {}, home: { x: -5.45, z: 3.2, ry: 0 } };   // `emp` between turns
let emp = NOBODY;
function withEmp(e, f) { const prev = emp; emp = e; try { return f(); } finally { emp = prev; } }
const empAt = i => ({ x: EMP_POST.x + 0.72 * i, z: EMP_POST.z, ry: 0 });   // each one's spot behind the counter when there's nothing on
function makeEmployee(a, i, saved) {
  return { ...empState(), id: saved?.id ?? `${Date.now()}-${i}`, first: a.first, last: a.last, female: a.female, outfit: a.outfit,
    skills: saved?.skills ? { ...skillsOf(), ...saved.skills } : skillsOf(a.levels), jobs: defaultJobs(saved?.jobs), home: empAt(i),
    sched: Array.isArray(saved?.sched) && saved.sched.length === 7 ? saved.sched.slice() : defaultSched(i) };
}
function empCoTarget(at) {                     // where Dana's hand goes for each checkout step
  if (at === "pad") return new THREE.Vector3(DESENS_AT.x, 1.12, DESENS_AT.z - 0.02);
  if (at === "printer") return new THREE.Vector3(PRN_AT.x, 1.3, PRN_AT.z - 0.05);
  if (at === "register") return co?.kind !== "signup" && co?.i >= CO_STEPS.findIndex(q => q.id === "ring") ? cashDrawer.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.08, -0.3)) : new THREE.Vector3(-5.45, 1.12, 3.8);   // the drawer / the keyboard
  const q = co.cust.c.group.position; return new THREE.Vector3(q.x, 1.2, 3.95);   // over the counter, where their hand meets hers
}
function empSpawn(arrive = false) {              // into the store in the uniform: at their spot behind the counter, or (arrive) in the front door and over to it
  const c = emp.c = StoreCustomers.build(emp.outfit);
  c.parts.forEach(m => { m.userData.employee = emp; aimables.push(m); });
  c.glows.forEach(glow); scene.add(c.group); colliders.push(emp.box);
  c.group.position.set(emp.home.x, 0, emp.home.z); emp.ry = emp.face = emp.home.ry;
  c.setMood("neutral"); emp.state = "post"; emp.leaving = false;
  if (arrive) { c.group.position.set(CUST_DOOR.x, 0, CUST_DOOR.z); emp.ry = Math.PI; empGo("toPost", emp.home); }
}
function empDespawn() {                          // out the door: gone for the day
  const c = emp.c; if (!c) return;
  empLeaveStool(); empFetchDrop(); danaRestockAbort();   // let go of whatever they had going: the stool, a fetch, the stock in hand
  if (emp.carry.length) { returnBin.push(...emp.carry); emp.carry = []; refreshReturnsBin(); }   // returns in hand: back in the tote
  if (emp.trash) {                                // a trash run: free the bin for whoever's next, and the bag's left where they stood
    if (emp.trash.t.claim === emp) emp.trash.t.claim = null;
    if (emp.trash.bag) { const p = c.group.position; bagPlace(emp.trash.bag.bin, emp.trash.bag.n, p.x, p.z); }
  }
  c.holdItem(null); c.parts.forEach(m => { const i = aimables.indexOf(m); if (i >= 0) aimables.splice(i, 1); });
  c.group.removeFromParent(); c.dispose?.();
  const ci = colliders.indexOf(emp.box); if (ci >= 0) colliders.splice(ci, 1);
  if (stool.by === emp) stool.by = null;
  Object.assign(emp, empState(), { sentHome: emp.sentHome, leaving: false, paused: false, mess: null, restock: null, fetch: null, trash: null, stray: null, seat: null });   // (empState doesn't list these: clear them, or the next shift starts out already heading home)
}
const weekday = () => shiftDate().getDay();
function onDuty(e) {                             // should they be in the store right now?
  if (e.sentHome) return false;
  if (shift.h >= SHIFT.close) return !!e.c && !!(e.sched[weekday()] >> (SCHED_SLOTS - 1) & 1);   // after close: whoever worked till close stays till you send them home (not someone just finishing up a late sale)
  const n = Math.floor(shift.h) - SCHED_H0;
  return n >= 0 && n < SCHED_SLOTS && !!(e.sched[weekday()] >> n & 1);
}
function sendHome(e) {                           // after close: E on them
  e.sentHome = true; e.leaving = true;
  if (["watching", "sitDown"].includes(e.state)) { e.state = "standUp"; e.t = 0.6; e.c.setPose("idle"); }
  logAct(`Sent ${e.first} home for the night`);
}
function setSched(id, day, n, on) {              // the POS's schedule screen -> an error, or null
  const e = staff.find(x => x.id === id); if (!e || day < 0 || day > 6 || n < 0 || n >= SCHED_SLOTS) return "NO SUCH SHIFT.";
  const has = !!(e.sched[day] >> n & 1); if (has === on) return null;
  if (on && schedHours(e) >= SCHED_MAX) return `${e.first.toUpperCase()} IS AT ${SCHED_MAX} HOURS (PART TIME).`;
  e.sched[day] ^= 1 << n; saveState(); return null;
}
function empGo(state, spot, avoidPlayer = false) {
  if (emp.fetch && !["fetchGo", "fetchBack", "repath"].includes(state)) empFetchDrop();   // called away mid-fetch: the tape goes back
  if (emp.restock && !["stockGo", "stockTo", "repath"].includes(state)) danaRestockAbort();   // ...or the stock she's carrying
  if (STOOL_STATES.includes(emp.state) && !STOOL_STATES.includes(state)) empLeaveStool();
  const p = emp.c.group.position, r = 0.35;
  const you = avoidPlayer ? [{ x0: player.x - r, x1: player.x + r, z0: player.z - r, z1: player.z + r }] : [];
  const grid = navGrid([emp.box, flapCollider], you); spot = spotBesideYou(spot, grid);
  const path = navPath(grid, p.x, p.z, spot.x, spot.z)   // she can lift the pass-through
    || navPath(navGrid([emp.box, flapCollider, ...custs.map(k => k.box)]), p.x, p.z, spot.x, spot.z);   // through whoever's in the way
  if (!path) { emp.path = []; emp.repath = { state, spot }; emp.state = "repath"; emp.t = 1; emp.spot = spot; return; }
  emp.path = path;
  if (!avoidPlayer) emp.detour = false;
  emp.state = state; emp.spot = spot; emp.stuck = 0;
}
const shelfSpot = copy => ({ x: copy.pos.x + Math.cos(copy.ry) * 0.8, z: copy.pos.z - Math.sin(copy.ry) * 0.8, ry: Math.atan2(-Math.cos(copy.ry), Math.sin(copy.ry)) });
function empNext() {                              // processing returns: what's next with what she's carrying
  if (emp.leaving) return empBackToRegister();     // shift's over: what's in hand goes back in the tote, and off to clock out
  const c = emp.c;
  c.reachTo(null);
  c.holdTape(Math.min(3, emp.carry.length)); c.setPose(emp.carry.length ? "hold" : "idle");
  if (emp.carry.some(t => !isRewound(t))) return empGo("toRewinder", rewinderSpot());
  const alerted = emp.carry.find(holdAlertFor);
  if (alerted) { emp.target = alerted; return empGo("toHolds", { x: HOLDS_AT.x, z: HOLDS_AT.z + 0.6, ry: Math.PI }); }   // flagged on the POS: someone's waiting on this one
  if (emp.carry.length) {                         // nearest slot next: one loop through the floor, not a trip per tape
    const p = c.group.position, d = t => Math.hypot(t.pos.x - p.x, t.pos.z - p.z);
    emp.target = emp.carry.reduce((a, b) => d(b) < d(a) ? b : a);   // ponytail: greedy nearest-neighbor, fine for a handful of tapes
    return empGo("toShelf", shelfSpot(emp.target));
  }
  if (!returnBin.length && strays.length) {       // bin's done: straighten up what customers shoved in anywhere
    const p = c.group.position, s = strays.reduce((a, b) => Math.hypot(b.at.pos.x - p.x, b.at.pos.z - p.z) < Math.hypot(a.at.pos.x - p.x, a.at.pos.z - p.z) ? b : a);
    emp.stray = s; return empGo("toStray", shelfSpot(s.at));
  }
  empGo("toTote", EMP_TOTE);
}
function empToggle() {                            // E on Dana: returns <-> register
  const c = emp.c;
  if (emp.state === "watching") { c.setMood("happy"); emp.watch.hold = 1.5; return; }   // just a smile; she's off the clock
  if (emp.task === "register") {
    if (!returnBin.length && !strays.length) { toast(`${emp.first}: returns bin's empty, and the shelves are straight!`, true); c.setMood("happy"); emp.t = 1; return; }
    emp.task = "returns"; c.setMood("happy"); returnBin.length ? empGo("toTote", EMP_TOTE) : empNext();
  } else empBackToRegister();
}
function empFetch(cust) {                         // off to the shelves for them: the title they asked for, or a pick from their kind of thing
  const w = cust.want, cats = cust.who.persona.taste.cats;
  if (w.kind === "hold" && w.hold.copy) {         // right behind her on the holds shelf
    const t = w.hold.copy; w.hold.pulled = t; emp.c.reachTo(HOLDS_AT.clone().setY(HOLDS_AT.y + 0.1)); emp.t = 1.2;
    custHandHold(cust, t, "dana"); return;
  }
  let copy = w.kind !== "rec" ? onShelfCopy(w.title) : null;
  if (w.kind === "hold" && !copy) { custHoldOut(cust, "dana"); emp.t = 1; return; }
  if (w.kind === "title" && !copy) { custAllOut(cust, "dana"); emp.t = 1; return; }   // she checks the screen: all out
  if (!copy) {
    const pool = catalog.filter(t => t.pos && (Math.random() < Math.min(0.95, 0.45 + 0.05 * lv("dana", "int")) ? cats.includes(t.category) : true)).map(onShelfCopy).filter(Boolean);   // (INT: knows the stock)
    copy = pool[Math.floor(Math.random() * pool.length)]; if (!copy) return;
  }
  cust.danaOn = true; emp.fetch = { cust, copy };
  emp.c.setMood("happy"); logAct(`${emp.first} went to find ${w.kind === "title" ? tapeName(w.title) : "something"} for ${memberName(cust.member)}`);
  empGo("fetchGo", shelfSpot(copy));
}
function empFetchDrop() {                          // whatever she was fetching goes back where it came from
  const f = emp.fetch; if (!f) return;
  if (f.got) { setOnShelf(f.copy, true); emp.c.holdTape(0); }
  if (f.cust) f.cust.danaOn = false;
  if (f.hold && !f.hold.copy) f.hold.by = "you";   // (a hold she didn't get to is yours to do)
  emp.fetch = null;
}
// ---- Dana's job board, RimWorld style: each job gets a priority, 1 (first)
// to 4, or off. Whenever she's free she takes the job with work at the best
// priority (ties go in the board's order); a customer-facing job at a better
// priority than what she's on pulls her off background work ----
const JOBS = {
  register: { name: "REGISTER", desc: "ring up customers, sign people up" },
  phone: { name: "PHONES", desc: "answer calls, put holds aside" },
  floor: { name: "FLOOR HELP", desc: "fetch what people ask for at the counter" },
  returns: { name: "RETURNS", desc: "rewind and reshelve, fix misshelved tapes" },
  restock: { name: "RESTOCK", desc: "fill the snack and drink racks from stock" },
  cleanup: { name: "CLEANUP", desc: "litter, spills, theater cups, taking out the trash" },
};
const JOB_DEFAULT = { register: 1, phone: 2, floor: 2, returns: 3, restock: 3, cleanup: 4 };
const defaultJobs = saved => Object.keys(JOBS).map(id => ({ id, pri: saved?.find?.(j => j.id === id)?.pri ?? JOB_DEFAULT[id] }));   // (the board's order is fixed; the priorities are yours)
const jobPri = id => emp.jobs.find(j => j.id === id)?.pri || 9;   // off counts as never
const jobOrder = () => emp.jobs.filter(j => j.pri).sort((a, b) => a.pri - b.pri || emp.jobs.indexOf(a) - emp.jobs.indexOf(b)).map(j => j.id);
// who's on staff: the save's, or (sandbox, or a save from when Dana was the only hire) Dana
if (SAVE?.staff) SAVE.staff.forEach((x, i) => staff.push(makeEmployee(x, i, x)));
else if (!SIM || upg.hireDana) staff.push(makeEmployee(DANA_APP, 0, { jobs: SAVE?.jobs }));

const FRONT_JOBS = ["register", "phone", "floor"];   // the customer-facing ones: these pull her off background work
function jobHasWork(id) {
  switch (id) {
    case "register": return !!custWaiting() && (!co || co.emp === emp);
    case "phone": return !!phone.ring && phone.ring.t > 6;
    case "floor": return custAsks.some(k => k.state === "asking" && !k.danaOn && clockT - k.askAt > 20);
    case "returns": return returnBin.length > 0 || strays.length > 0;
    case "restock": return emptySpots().some(u => (backstock[u.userData.snack.name] || 0) > 0);
    case "cleanup": return messes.length > 0 || !!trashJob();
  }
  return false;
}
const danaBestJob = (above = null) => { for (const id of jobOrder()) { if (above && jobPri(id) >= jobPri(above)) return null; if (jobHasWork(id)) return id; } return null; };   // above: only jobs at a strictly better priority
const danaJobNow = () => emp.task === "returns" && !emp.paused ? "returns" : emp.restock ? "restock" : emp.mess || emp.trash ? "cleanup" : emp.fetch?.cust ? "floor" : emp.fetch?.hold ? "phone" : co?.emp === emp ? "register" : null;
function danaStartJob(id) {                       // from her post: off to do it
  const c = emp.c, p = c.group.position;
  if (id === "floor") { const k = custAsks.find(k => k.state === "asking" && !k.danaOn && clockT - k.askAt > 20); if (k) empFetch(k); return; }
  if (id === "returns") { emp.task = "returns"; c.setMood("happy"); returnBin.length ? empGo("toTote", EMP_TOTE) : empNext(); return; }
  if (id === "restock") { danaRestockStart(); return; }
  if (id === "cleanup") {
    const t = trashJob();                         // a bag on the floor or a nearly-full bin before litter; otherwise litter first
    if (t && (!messes.length || t.mesh || t.n >= t.cap * 0.85)) { empTrashStart(t); return; }
    if (!messes.length) return;
    const m = messes.reduce((a, b) => Math.hypot(b.x - p.x, b.z - p.z) < Math.hypot(a.x - p.x, a.z - p.z) ? b : a);
    emp.mess = m; c.setMood("neutral"); empGo("toMess", { x: m.x + 0.45, z: m.z, ry: -Math.PI / 2 });
  }
}
function danaPreempt() {                          // something customer-facing (and ranked above what she's on) needs her
  const now = danaJobNow(); if (!now || FRONT_JOBS.includes(now)) return;
  for (const id of jobOrder()) {
    if (jobPri(id) >= jobPri(now)) return;
    if (!FRONT_JOBS.includes(id) || !jobHasWork(id)) continue;
    if (now === "returns") empSummon(true);
    else if (now === "restock") { danaRestockAbort(); empGo("toPost", emp.home); }
    return;                                       // (cleanup is quick: she finishes it)
  }
}
// ---- restock: from the cupboard to the racks, up to 6 at a time ----
function danaRestockStart() {
  const need = emptySpots().filter(u => (backstock[u.userData.snack.name] || 0) > 0); if (!need.length) return;
  const drinks = need.filter(u => isDrink(u.userData.snack)), food = need.filter(u => !isDrink(u.userData.snack)), kind = drinks.length >= food.length ? "drinks" : "food";
  const units = (kind === "drinks" ? drinks : food).slice(0, Math.min(10, 4 + lv("dana", "str")));   // (STR: a bigger armful)
  emp.restock = { kind, units, got: [], n: 0 }; emp.c.setMood("neutral");
  empGo("stockGo", cupboardSpot(kind));
}
function cupboardSpot(kind) {                     // in front of that kind's cupboard doors, on the staff side
  const doorsOf = aimables.filter(m => m.userData.stock === kind && m.geometry?.parameters?.width > 0.4), v = new THREE.Vector3(), n = new THREE.Vector3();
  const d = doorsOf[Math.floor(doorsOf.length / 2)] || doorsOf[0];
  d.getWorldPosition(v); n.set(0, 0, -1).applyQuaternion(d.getWorldQuaternion(new THREE.Quaternion()));
  return { x: v.x + n.x * 0.6, z: v.z + n.z * 0.6, ry: Math.atan2(-n.x, -n.z), door: v.clone() };
}
function unitSpot(u) {                            // standing in front of a rack spot, facing it
  const v = u.getWorldPosition(new THREE.Vector3()), n = new THREE.Vector3(); u.parent.getWorldDirection(n);
  return { x: v.x + n.x * 0.75, z: v.z + n.z * 0.75, ry: Math.atan2(-n.x, -n.z), at: v };
}
function danaRestockNext() {
  const r = emp.restock, u = r.got[0];
  if (!u) {                                       // all out
    if (emp.openedCooler) { coolerOpen = false; emp.openedCooler = false; }
    emp.c.holdItem(null); emp.c.setPose("idle");
    if (r.n) logAct(`${emp.first} restocked ${r.n} item${r.n > 1 ? "s" : ""} on the racks`, "good", null, 3 * r.n);
    emp.restock = null; empGo("toPost", emp.home); return;
  }
  emp.c.holdItem(snackProxy(u)); emp.c.setPose("hold");
  if (!isDrink(u.userData.snack) && emp.openedCooler) { coolerOpen = false; emp.openedCooler = false; }
  empGo("stockTo", unitSpot(u));
}
function danaRestockAbort() {                     // called away: what she's carrying goes back in the cupboard
  const r = emp.restock; if (!r) return;
  for (const u of r.got) backstock[u.userData.snack.name] = (backstock[u.userData.snack.name] || 0) + 1;
  if (emp.openedCooler) { coolerOpen = false; emp.openedCooler = false; }
  emp.c.holdItem(null); emp.c.reachTo(null); emp.c.setPose("idle");
  if (r.n) logAct(`${emp.first} restocked ${r.n} item${r.n > 1 ? "s" : ""} before being needed elsewhere`, "good", null, 3 * r.n);
  emp.restock = null;
}
// ---- the board itself: a grid, employees down the side and jobs across. E on it; ↑↓←→ pick a
// square, 1-4 its priority (Space steps through), 0 or X: that employee doesn't do that job. E closes ----
const board = { open: false, r: 0, c: 0 };
const JOB_SHORT = { register: "REGISTER", phone: "PHONES", floor: "FLOOR", returns: "RETURNS", restock: "RESTOCK", cleanup: "CLEANUP" };
function boardOpen() { board.open = true; keys.clear(); $("hoverTip").style.display = "none"; board.r = Math.min(board.r, Math.max(0, staff.length - 1)); boardHud(); }
function boardClose() { board.open = false; boardHud(); }
function boardKey(e) {
  const k = e.code, J = Object.keys(JOBS);
  if (k === "KeyE" || k === "Escape" || k === "Enter") { if (!e.repeat) boardClose(); return; }
  if (!staff.length) return;
  const cell = () => staff[board.r].jobs.find(j => j.id === J[board.c]);
  if (k === "ArrowUp" || k === "KeyW") board.r = (board.r + staff.length - 1) % staff.length;
  else if (k === "ArrowDown" || k === "KeyS") board.r = (board.r + 1) % staff.length;
  else if (k === "ArrowLeft" || k === "KeyA") board.c = (board.c + J.length - 1) % J.length;
  else if (k === "ArrowRight" || k === "KeyD") board.c = (board.c + 1) % J.length;
  else if (/^Digit[0-4]$/.test(k)) cell().pri = +k[5];
  else if (k === "KeyX" || k === "Backspace" || k === "Delete") cell().pri = 0;
  else if (k === "Space") { const j = cell(); j.pri = j.pri && j.pri < 4 ? j.pri + 1 : j.pri ? 0 : 1; }   // 1, 2, 3, 4, X, 1...
  else return;
  e.preventDefault(); boardHud();
}
function boardHud() {
  const el = $("jobBoard"); if (!board.open) { el.style.display = "none"; return; }
  const J = Object.keys(JOBS);
  el.innerHTML = `<div class="h">STAFF JOBS · 1 FIRST → 4 LAST · ✕ NEVER</div>` + (staff.length ? `<table class="grid"><tr><th></th>${J.map((id, c) => `<th class="${c === board.c ? "on" : ""}" title="${JOBS[id].desc}">${JOB_SHORT[id]}</th>`).join("")}</tr>` +
    staff.map((e, r) => { const now = withEmp(e, danaJobNow);
      return `<tr><td class="who${r === board.r ? " on" : ""}">${e.first} ${e.last}<small>${empSummary(e)}</small></td>` +
        J.map((id, c) => { const p = e.jobs.find(j => j.id === id).pri; return `<td class="cell p${p}${r === board.r && c === board.c ? " sel" : ""}${now === id ? " now" : ""}">${p || "✕"}</td>`; }).join("") + "</tr>"; }).join("") + "</table>"
    : `<div class="warn">Nobody on staff yet: hire someone on the register (U)</div>`) +
    `<div class="keys">↑↓←→ pick a square · 1–4 priority · 0 / X never · SPACE steps through · ▸ = doing it now · E close</div>`;
  el.style.display = "block";
}
// ---- the character sheet: K. You and each of the staff, level and progress in all six ----
const sheet = { open: false };
function sheetToggle() { sheet.open = !sheet.open; sheetHud(); }
function sheetHud() {
  const el = $("charSheet"); if (!el) return; if (!sheet.open) { el.style.display = "none"; return; }
  const row = (w, name) => `<tr><td class="who">${name}</td>${SKILL_IDS.map(k => { const sk = w.skills[k], f = sk.lvl >= SKILL_MAX ? 1 : sk.xp / xpToNext(sk.lvl);
    return `<td><b>${sk.lvl}</b><div class="bar"><i style="width:${Math.round(f * 100)}%"></i></div></td>`; }).join("")}</tr>`;
  el.innerHTML = `<div class="h">SKILLS · K to close</div><table><tr><th></th>${SKILL_IDS.map(k => `<th title="${SKILLS[k].what}">${SKILLS[k].name}</th>`).join("")}</tr>` +
    row(you, "You") + staff.map(e => row(e, e.first)).join("") + `</table>` +
    `<div class="legend">${SKILL_IDS.map(k => `<span><b>${SKILLS[k].name}</b> ${SKILLS[k].what}${Object.entries(MILESTONES[k]).map(([L, m]) =>
      `<br><span style="opacity:${has("you", k, +L) ? 1 : 0.5}">${has("you", k, +L) ? "★" : "☆"} ${L} ${m[0]}: ${m[1]}</span>`).join("")}</span>`).join("")}</div>`;
  el.style.display = "block";
}
// ---- hiring: buying "hire an employee" brings up three applicants to pick from ----
const hiring = { open: false, apps: [], refund: 0 };
const hireCost = () => Math.round(250 * 1.55 ** (upg.hires || 0) / 5) * 5;   // each hire costs more than the last
function hireOpen(paid) {
  hiring.open = true; hiring.refund = paid; hiring.apps = []; while (hiring.apps.length < 3) { const a = rollApplicant(); if (!hiring.apps.some(o => o.first === a.first && o.last === a.last)) hiring.apps.push(a); }   // (three different people)
  const el = $("hireScreen"), shots = portraits(hiring.apps.map(a => a.outfit));
  el.innerHTML = `<div class="h">THREE APPLICANTS · PICK ONE</div><div class="apps">` + hiring.apps.map((a, i) => `<div class="app">
      <img src="${shots[i]}" alt=""><div class="nm">${a.first} ${a.last}</div><div class="lk">${a.female ? "Woman" : "Man"} · ${looksOf(a.outfit)}</div>
      <table>${SKILL_IDS.map(k => `<tr><td title="${SKILLS[k].what}">${SKILLS[k].name}</td><td><div class="pips">${"<i></i>".repeat(a.levels[k])}</div></td><td>${a.levels[k]}</td></tr>`).join("")}</table>
      <div class="wage">$${empRate({ skills: skillsOf(a.levels) }).toFixed(2)} an hour · up to 25 hrs a week</div><button data-i="${i}">HIRE ${a.first.toUpperCase()}</button></div>`).join("") + `</div>
    <button class="none">NOT NOW (REFUND $${paid.toFixed(2)})</button>`;
  el.querySelectorAll("button[data-i]").forEach(b => b.onclick = () => hirePick(+b.dataset.i));
  el.querySelector("button.none").onclick = () => { posTerm.sale(hiring.refund); hireClose(); logAct("Decided not to hire anyone for now (refunded)"); };
  el.style.display = "flex";
}
function hirePick(i) {
  const a = hiring.apps[i]; if (!a) return;
  const e = makeEmployee(a, staff.length); staff.push(e); upg.hires = (upg.hires || 0) + 1;
  amenities(); hireClose(); logAct(`Hired ${a.first} ${a.last}: starting right now`, "good"); saveState();
}
function hireClose() {
  hiring.open = false; $("hireScreen").style.display = "none";
  if (started && !posTerm?.isOpen() && document.pointerLockElement !== canvas) lockMouse()?.catch?.(() => {});   // the register was closed underneath: back into the store
}
function portraits(outfits) {                     // a head-and-shoulders render of each applicant (their own little renderer, then thrown away)
  const W = 180, H = 220, out = [];
  try {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setSize(W, H); r.setPixelRatio(1);
    const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x445566, 2.2)); const d = new THREE.DirectionalLight(0xffffff, 1.6); d.position.set(1, 2, 3); sc.add(d);
    const cam = new THREE.PerspectiveCamera(28, W / H, 0.1, 10);
    for (const o of outfits) {
      const c = StoreCustomers.build(o); c.setMood("happy"); c.tick(0.016, 0); sc.add(c.group);
      const top = 1.62 * o.height; cam.position.set(0.55, top + 0.05, 2.7); cam.lookAt(0, top - 0.2, 0);
      r.render(sc, cam); out.push(r.domElement.toDataURL()); sc.remove(c.group); c.dispose();
    }
    r.dispose(); r.forceContextLoss();
  } catch { while (out.length < outfits.length) out.push(""); }
  return out;
}
function empSummon(force = false) {              // the bell: drop what she's doing (tapes stay in hand), ring them up, then back to it
  if (emp.task !== "returns" || emp.paused) return;
  if (!force && jobPri("register") >= jobPri("returns")) return;   // the board says the returns matter as much or more
  emp.paused = true; emp.c.setMood("happy"); empGo("toPost", emp.home);
}
function empBackToRegister(msg) {
  emp.paused = false;
  const c = emp.c;
  returnBin.push(...emp.carry); emp.carry = []; refreshReturnsBin();   // anything still in hand goes back in the tote
  emp.rewinding = [];                              // (a tape in a rewinder stays there for whoever's next)
  c.holdTape(0); c.setPose("idle"); c.reachTo(null); c.setMood(msg ? "happy" : "neutral");
  emp.task = "register"; empGo("toPost", emp.home);
  if (msg) toast(msg, true);
}
// ---- off the clock: with the doors locked and the store empty, Dana joins you
// on the couch. She reacts to what the TV actually sounds like — its audio is
// routed through an analyser (the stream is CORS-loaded, so the samples are
// readable): a sudden jump over the recent level startles her, a long loud
// stretch has her into it, near-silence puts her to sleep ----
let tvAudio = null;
function tvLevel() {                              // RMS of the TV's audio right now, 0..~0.5 (null if unreadable)
  if (!playing || video.paused) return 0;
  if (!tvAudioBuild()) return null;
  tvAudio.an.getFloatTimeDomainData(tvAudio.buf);
  let sum = 0; for (const v of tvAudio.buf) sum += v * v;
  return Math.sqrt(sum / tvAudio.buf.length);
}
function tvAudioBuild() {                         // built once, the first time a tape plays: after this the tape's sound runs through it. The analyser's first (what the tape sounds like, wherever you are), then what you're hearing it through (see tvHearTick). -> false if it can't be
  if (!tvAudio) try {
    const ac = StoreAudio.ctx(), an = ac.createAnalyser(), lp = ac.createBiquadFilter(), pan = ac.createStereoPanner(), gain = ac.createGain(); an.fftSize = 1024;
    lp.type = "lowpass"; lp.frequency.value = 20000; lp.Q.value = 0.5; gain.gain.value = 0;
    ac.createMediaElementSource(video).connect(an); an.connect(lp); lp.connect(pan); pan.connect(gain); gain.connect(fullVid.on ? ac.destination : StoreAudio.out());
    tvAudio = { ac, an, lp, pan, gain, buf: new Float32Array(1024) };
  } catch { tvAudio = { fail: true }; }
  if (tvAudio.fail) return false;
  if (tvAudio.ac.state === "suspended") tvAudio.ac.resume();
  return true;
}
function tvAudioRoute() {                         // zoomed all the way in, the tape's sound as it is: past the store's compressor
  if (!tvAudio || tvAudio.fail) return;
  tvAudio.gain.disconnect(); tvAudio.gain.connect(fullVid.on ? tvAudio.ac.destination : StoreAudio.out());
}
const empCanWatch = () => frontLock.locked && !custs.length && emp.task === "register" && seated && !seatAt?.toilet && !seatAt?.roof;   // what brings her over (the couch, not the restroom)
const inLounge = () => Math.hypot(player.x - TV.x, player.z - (TV.z - 2.5)) < 5.5;
const empKeepWatching = () => frontLock.locked && !custs.length && emp.task === "register" && ((seated && !seatAt?.toilet && !seatAt?.roof) || inLounge()) && !gateAlarm.on;   // what keeps her there (the alarm gets her up)
function empWatch(dt) {                           // on the couch: pick a face from the sound
  const c = emp.c, w = emp.watch, lvl = tvLevel();
  w.cool -= dt;
  // you look over at her -> she looks back (and after a scare, she checks on you)
  const hp = c.group.position, cam = camera.position, to = c.screen.getWorldPosition(new THREE.Vector3()).sub(cam).normalize();   // toward her face
  const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
  w.eye = fwd.dot(to) > 0.8 ? (w.eye || 0) + dt : 0;
  const glance = w.eye > 0.35 || (w.hold > 0 && w.hold < 0.9);
  const rel = Math.atan2(cam.x - hp.x, cam.z - hp.z) - emp.face;
  c.lookAt(glance ? Math.atan2(Math.sin(rel), Math.cos(rel)) : null);   // wrapped: her body angle can be a full turn (2π) off
  if (w.eye > 0.35 && w.hold <= 0) { c.setMood("happy"); return; }
  if (lvl === null) { c.setMood("watch"); return; }   // can't hear it: just watches
  w.fast += (lvl - w.fast) * Math.min(1, dt / 0.12);
  w.avg += (lvl - w.avg) * Math.min(1, dt / 4);
  w.quiet = lvl < 0.004 ? w.quiet + dt : 0;
  w.loud = w.avg > 0.12 ? w.loud + dt : 0;
  if (w.cool <= 0 && w.fast > 0.06 && w.fast > w.avg * 2.4) { c.setMood("shock"); w.cool = 3; w.hold = 1.3; }   // BANG
  if ((w.hold -= dt) > 0) return;
  c.setMood(!playing ? (w.idle = (w.idle || 0) + dt) > 8 ? "sleep" : "meh"   // nothing on: bored, then out
    : w.quiet > 6 ? "sleep" : w.loud > 3 ? "happy" : "watch");
  if (playing) w.idle = 0;
}
// ---- Dana and the stool: when nothing's going on at the register for a bit,
// she fetches the stool (wherever you left it, if she can walk there), parks
// it beside the register and sits. Up there she does as she likes: a lazy
// spin now and then, a look around, and she scoots back to face the counter
// once it stops. Sit long enough and she gets bored: a sigh, then a real
// spin, a run of quick shoves like you tapping E. Anything happening — a customer, the bell, a sale, the gate
// alarm, you asking her to do returns, you on the couch — and she's up.
// While she has it, it's hers: you can't sit on it or pick it up ----
const EMP_STOOL = { x: -4.75, z: 2.7 };          // where she parks it: beside the register, clear of her shuffle to the pad
const EMP_STOOL_WAIT = 8;                        // seconds of nothing going on before she goes for it
const EMP_BORED_AT = 25;                         // seconds up there before she's bored enough to really spin
const STOOL_STATES = ["toStool", "stoolGrab", "stoolCarry", "stoolSitDown", "stoolSit", "stoolStandUp"];
const empIdle = () => emp.task === "register" && !emp.paused && !custs.length && !co && !gateAlarm.on && !empCanWatch() && !danaBestJob() && !empLunchDue();   // (lunchtime gets her off it too)   // (work on the board gets her off the stool)
const stoolFree = () => !stool.carried && !onStool && !stool.by && !eHoldStool;
const clearFor = (x, z, r, skip) => !colliders.some(c => !skip.includes(c) && x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r);
function stoolSide(fx, fz) {                      // a clear spot to stand beside the stool, on the side nearest (fx, fz), facing it
  const a0 = Math.atan2(fx - stool.x, fz - stool.z);
  for (const da of [0, 0.8, -0.8, 1.6, -1.6, 2.4, -2.4, Math.PI]) {
    const a = a0 + da, x = stool.x + Math.sin(a) * 0.6, z = stool.z + Math.cos(a) * 0.6;
    if (clearFor(x, z, 0.22, [emp.box, stool.box])) return { x, z, ry: a + Math.PI };
  }
  return null;
}
function empFetchStool() {
  const p = emp.c.group.position, home = Math.hypot(stool.x - EMP_STOOL.x, stool.z - EMP_STOOL.z) < 0.3;
  if (!home) {                                    // its parking spot has to be free, and somewhere to stand behind it
    const b = stoolFit(EMP_STOOL.x, EMP_STOOL.z, {});
    if (colliders.some(c => c !== stool.box && c !== emp.box && c.x0 < b.x1 && c.x1 > b.x0 && c.z0 < b.z1 && c.z1 > b.z0) || playerIn(b)) return;
    if (!clearFor(EMP_STOOL.x, EMP_STOOL.z - 0.5, 0.22, [emp.box, stool.box])) return;
  }
  const side = stoolSide(p.x, p.z);
  if (!side || !navPath(navGrid([emp.box, flapCollider]), p.x, p.z, side.x, side.z)) return;   // can't get to it (a closed door, boxed in)
  stool.by = emp; emp.stoolPlan = home ? "sit" : "carry";
  emp.c.setMood("happy"); empGo("toStool", side);
}
function empStoolSit() {                         // back onto the seat from wherever she's standing
  const c = emp.c, p = c.group.position;
  c.reachTo(null); c.setPose("sit", STOOL_SIT);
  emp.state = "stoolSitDown"; emp.t = 0.7; emp.from = { x: p.x, z: p.z };
}
function empLeaveStool() {                       // dropped mid-whatever (you called her away): let go of it right now
  if (stool.by !== emp) return;
  const c = emp.c, p = c.group.position;
  if (stool.danaCarry) {                          // set it down where it is if it fits, else back where she got it
    const q = stool.g.position, b = stoolFit(q.x, q.z, {});
    const fits = !colliders.some(k => k !== emp.box && k.x0 < b.x1 && k.x1 > b.x0 && k.z0 < b.z1 && k.z1 > b.z0) && !playerIn(b);
    if (fits) { stool.x = q.x; stool.z = q.z; }
    stool.danaCarry = false; stool.g.position.set(stool.x, 0, stool.z);
    colliders.push(stoolFit(stool.x, stool.z, stool.box));
  } else if (["stoolSitDown", "stoolSit", "stoolStandUp"].includes(emp.state)) {
    const side = stoolSide(EMP_POST.x, EMP_POST.z); if (side) { p.x = side.x; p.z = side.z; }   // off the seat
  }
  c.setPose("idle"); c.reachTo(null); c.lookAt(null);
  stool.by = null;
}
function empTick(dt) { for (const e of staff) withEmp(e, () => empTickOne(dt)); staffChatTick(dt); }   // each of them in turn
// ---- the staff between customers: leaning on the counter, checking the time, an eye on the lounge TV, a chat with
// whoever else is on, and lunch in the break room (a half hour, sometime around midday, on a long enough shift) ----
const LUNCH_CHAIRS = [{ x: 7.2, z: 31.05, ry: 0 }, { x: 7.8, z: 31.1, ry: 0.15 }, { x: 7.5, z: 32.45, ry: Math.PI }, { x: 8.42, z: 31.8, ry: -Math.PI / 2 + 0.2 }];
const CHAT_TOPICS = ["last night's X-Files", "a guy who returned a tape full of sand", "the new Pearl Jam album", "weekend plans", "whether Titanic's ever coming out on tape",
  "car trouble", "the Bulls game", "which of the regulars rewinds", "a weird dream", "the best pizza in town", "Friends", "the district manager's tie"];
function empIdleTick(dt) {                        // at their post with nothing to do: the small stuff (see "post")
  const c = emp.c, f = emp.fid;
  if (f) {
    if ((f.t -= dt) > 0) return;
    c.setPose("idle"); c.lookAt(null); emp.fid = null; return;
  }
  if (emp.chatWith) return;
  if ((emp.fidT = (emp.fidT ?? 3 + Math.random() * 4) - dt) > 0) return;
  emp.fidT = 4 + Math.random() * 7;
  const r = Math.random(), p = c.group.position;
  if (r < 0.4) { emp.fid = { t: 4 + Math.random() * 6 }; c.setPose("lean"); c.setMood(Math.random() < 0.5 ? "neutral" : "meh"); }   // forearms on the counter
  else if (r < 0.6) { emp.fid = { t: 1.3 }; c.setPose("watch"); }                                       // how long till...
  else if (r < 0.85 && playing) { const a = Math.atan2(TV.x - p.x, TV.z - p.z) - emp.face; emp.fid = { t: 2.5 + Math.random() * 3 }; c.lookAt(Math.atan2(Math.sin(a), Math.cos(a))); c.setMood("watch"); }   // what's on
  else { emp.fid = { t: 1.5 + Math.random() * 2 }; c.lookAt((Math.random() * 2 - 1) * 1.2); c.setMood("browse"); }   // keeping an eye on the floor
}
function empFidgetStop() { if (emp.fid) { emp.fid = null; emp.c.setPose("idle"); emp.c.lookAt(null); } }
function staffChatTick(dt) {                      // two of them idle and near each other: a chat
  for (const e of staff) if (e.chatWith) {
    const o = e.chatWith, busy = x => !x.c || !["post", "stoolSit"].includes(x.state) || co?.emp === x || custWaiting();
    if ((e.chatT -= dt) <= 0 || busy(e) || busy(o)) { e.chatWith = null; if (e.c) { e.c.talk(false); e.c.lookAt(null); } continue; }
    const p = e.c.group.position, q = o.c.group.position, a = Math.atan2(q.x - p.x, q.z - p.z) - e.face;
    e.c.lookAt(Math.max(-1.3, Math.min(1.3, Math.atan2(Math.sin(a), Math.cos(a))))); e.c.talk(true);
    if ((e.moodT = (e.moodT || 0) - dt) <= 0) { e.moodT = 1.5 + Math.random() * 2.5; e.c.setMood(["happy", "happy", "neutral", "love", "shock"][Math.floor(Math.random() * 5)]); }
  }
  if ((staffChatTick.t = (staffChatTick.t || 0) - dt) > 0) return; staffChatTick.t = 3;
  const idle = staff.filter(e => e.c && !e.chatWith && ["post", "stoolSit"].includes(e.state) && co?.emp !== e && !e.leaving && clockT - (e.chatAt || -999) > 60);
  if (idle.length < 2 || custWaiting() || Math.random() < 0.5) return;
  const [a, b] = idle, pa = a.c.group.position, pb = b.c.group.position;
  if (Math.hypot(pa.x - pb.x, pa.z - pb.z) > 4) return;
  const t = 6 + Math.random() * 8;
  for (const [e, o] of [[a, b], [b, a]]) { e.chatWith = o; e.chatT = t; e.chatAt = clockT; withEmp(e, empFidgetStop); }
  if (clockT - (staffChatTick.said || -999) > 240) { staffChatTick.said = clockT; logAct(`${a.first} and ${b.first} are chatting about ${CHAT_TOPICS[Math.floor(Math.random() * CHAT_TOPICS.length)]}`); }
}
function empLunchDue() {                          // time for their lunch? (only on a 5-hour shift, around midday, when it's not busy)
  if (emp.lunchDay === shift.day || emp.leaving || shift.h < 11.5 || shift.h > 14.5 || bits(emp.sched[weekday()]) < 5) return false;
  if (co || custWaiting() || custs.length > 3) return false;
  const covered = staff.some(e => e !== emp && e.c && e.state === "post");   // someone else on the register, or it's quiet
  return covered || rushLevel() < 0.9 || shift.h > 14;
}
function empLunchStart() {
  const taken = new Set(staff.map(e => e.lunchChair).filter(Boolean)), ch = LUNCH_CHAIRS.find(c => !taken.has(c)); if (!ch) return;
  emp.lunchDay = shift.day; emp.lunchChair = ch; empFidgetStop(); emp.chatWith = null; emp.c.talk(false);
  const fx = Math.sin(ch.ry), fz = Math.cos(ch.ry);   // the way the chair faces (to the table): come at it from behind
  empGo("toLunch", { x: ch.x - fx * 0.5, z: ch.z - fz * 0.5, ry: ch.ry });
  logAct(`${emp.first}'s on lunch`);
}
const sandwichMesh = () => {                      // a sandwich in its wax paper
  const g = new THREE.Group(), m = (w, h, d, col, y) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: col })); o.position.y = y; g.add(o); };
  m(0.11, 0.015, 0.09, 0xe0b878, 0); m(0.115, 0.008, 0.095, 0x5aa83a, 0.011); m(0.11, 0.008, 0.09, 0xd65a4a, 0.018); m(0.11, 0.015, 0.09, 0xe0b878, 0.03);
  return g;
};
function empTickOne(dt) {
  if (!emp.c) {                                   // off the clock: in when their shift starts (already at their post if the store's just loaded)
    if (!window.StoreCustomers || !posTerm || shift.report || !onDuty(emp)) return;
    const arrive = clockT > 3; empSpawn(arrive); if (arrive) logAct(`${emp.first} clocked in`);
  }
  if (!emp.leaving && !onDuty(emp)) emp.leaving = true;   // their shift's over (or you sent them home): they finish up, then go
  else if (emp.leaving && onDuty(emp)) { emp.leaving = false; if (emp.state === "toExit") empGo("toPost", emp.home); }   // on again before they got out the door (a gap in the schedule, or it changed): they stay
  if (emp.leaving && (emp.state === "post" || STOOL_STATES.includes(emp.state)) && co?.emp !== emp && !emp.paused && emp.task === "register" && !emp.trash && !emp.mess && !emp.restock && !emp.fetch && emp.t <= 0) {
    empGo("toExit", CUST_DOOR); emp.state = "toExit"; emp.c.setMood("happy");
    if (!emp.sentHome) logAct(`${emp.first} clocked out`);
  }
  const c = emp.c, p = c.group.position;
  danaPreempt();
  // she gets dizzy too: same build-up as yours (twice as fast, so one big bored spin can do it), and it staggers her walk
  emp.dizzy = stool.by === emp && emp.state === "stoolSit" && stool.vel > 5 ? Math.min(1, (emp.dizzy || 0) + dt * stool.vel / STOOL.MAX / 4) : Math.max(0, (emp.dizzy || 0) - dt / 20);
  const dk = Math.max(0, (emp.dizzy - 0.3) / 0.7);
  if (dk > 0.3 && !emp.dizzySaid) { emp.dizzySaid = true; logAct(`${emp.first}'s dizzy from all that spinning`); }
  if (!dk) emp.dizzySaid = false;
  if (gateAlarm.on && gateAlarm.t > 5 && emp.task === "returns" && !emp.paused) {   // you've let it ring: she drops the returns and goes to shut it off
    empSummon(); logAct(`${emp.first}'s leaving the returns to shut off the gate alarm`);
  }
  let speed = 0;
  if (emp.path.length) {                          // walking (same manners as the customers)
    const [tx, tz] = emp.path[0], dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
    if (d < 0.05) emp.path.shift();
    else if (yieldTo(emp, p, dx, dz, dt, av => empGo(emp.state, emp.spot, av))) {}
    else {
      speed = 1.45 * (1 + 0.03 * (lv("dana", "con") - 1)) * (1 - 0.45 * dk);   // (CON: quicker on their feet)
      if ((emp.walkD = (emp.walkD || 0) + speed * dt) > 25) { emp.walkD = 0; gainXp("dana", "con", 1); }
      const step = Math.min(d, speed * dt), sw = dk * 0.2 * Math.cos(clockT * 1.7) * dt;   // sw: weaving side to side (it evens out)
      p.x += dx / d * step + dz / d * sw; p.z += dz / d * step - dx / d * sw;
      emp.ry = Math.atan2(dx, dz);
      if ((emp.stepD = (emp.stepD || 0) + step) > 0.72) { emp.stepD = 0; ambStep(p.x, p.z, 1); }
    }
    if (!emp.path.length && emp.spot) emp.ry = emp.spot.ry;
  } else {
    emp.t -= dt;
    switch (emp.state) {
      case "repath": if (emp.t <= 0) empGo(emp.repath.state, emp.repath.spot); break;
      case "fetchGo": c.reachTo(emp.fetch.copy.pos); emp.state = "fetchTake"; emp.t = 0.8; break;
      case "fetchTake": if (emp.t <= 0) {
        const f = emp.fetch; c.reachTo(null);
        if (f.copy.offShelf || (f.cust && f.cust.state !== "asking")) { if (f.hold) f.hold.by = "you"; empFetchDrop(); empGo("toPost", emp.home); break; }   // somebody beat her to it / they've gone (a hold's on you now)
        setOnShelf(f.copy, false); f.got = true; c.holdTape(1); c.setPose("hold");
        if (f.hold) { empGo("fetchBack", { x: HOLDS_AT.x, z: HOLDS_AT.z + 0.6, ry: Math.PI }); break; }   // to the holds shelf
        const a = f.cust.c.group.position; empGo("fetchBack", { x: a.x, z: EMP_POST.z, ry: 0 });   // back behind the counter, across from them
      } break;
      case "fetchBack": {
        const f = emp.fetch;
        if (f.hold) { c.reachTo(HOLDS_AT.clone().setY(HOLDS_AT.y + 0.1)); emp.state = "fetchGive"; emp.t = 0.9; break; }
        if (f.cust.state !== "asking" || !f.cust.c) { empFetchDrop(); empGo("toPost", emp.home); break; }
        c.reachTo(f.cust.c.group.position.clone().setY(1.2)); emp.state = "fetchGive"; emp.t = 0.9; break;
      }
      case "fetchGive": if (emp.t <= 0) {
        const f = emp.fetch; c.reachTo(null); c.holdTape(0); c.setPose("idle");
        if (f.hold) { f.hold.copy = f.copy; f.got = false; holdsRender(); shiftScore(15, "dana"); gainXp("dana", "int", 5); gainXp("dana", "cha", 3); logAct(`${emp.first} put ${f.copy.title} on the holds shelf for ${memberName(f.hold.member)}`, "good", null, 15); }
        else if (f.cust.state === "asking" && custHandTape(f.cust, f.copy, "dana")) { f.got = false; }   // they took it
        empFetchDrop(); empGo("toPost", emp.home);
      } break;
      case "toPost": emp.state = "post"; c.setPose("idle"); c.setMood("neutral"); break;
      case "toExit": empDespawn(); return;      // out the front door
      case "post": {                              // ring up whoever's waiting (if that's her job right now); shut the gates up
        const best = co?.emp === emp ? "register" : emp.leaving ? null : danaBestJob();   // (shift's over: nothing new, just finish the sale in hand)
        if (custWaiting() && best === "register") {
          c.setMood("happy");
          if (!co && (emp.ringT += dt) > 1.5) { emp.ringT = 0; coStart("dana"); if (co) co.emp = emp; }   // their turn: start ringing them up
        } else emp.ringT = 0;
        const mine = co?.emp === emp && co.cust.c;
        // she shuffles over to the pad for the desensitize step and back after — never leans across for it
        const wantX = mine && coStep()?.at === "pad" && onNorthRun(DESENS_AT) ? Math.min(DESENS_AT.x, COUNTER.tops[1].staff - 0.1) : mine && coStep()?.at === "printer" && onNorthRun(PRN_AT) ? Math.min(PRN_AT.x, COUNTER.tops[1].staff - 0.1) : emp.spot?.x ?? EMP_POST.x, gap = wantX - p.x;   // (set down round on the east run: she reaches from her post)   // home = wherever she parked (beside you, if you're on her spot)
        if (Math.abs(gap) > 0.02) { const st = Math.sign(gap) * Math.min(Math.abs(gap), 1.0 * dt); p.x += st; speed = 1.0; }
        if (mine) {                                // chatting while she works: faces them, nods, smiles
          c.talk(true);
          const q = co.cust.c.group.position, rel = Math.atan2(q.x - p.x, q.z - p.z) - emp.face;
          c.lookAt(coStep()?.at === "customer" ? Math.atan2(Math.sin(rel), Math.cos(rel)) : null);
          if ((emp.chatT = (emp.chatT || 0) - dt) <= 0) { emp.chatT = 1.5 + Math.random() * 2; c.setMood(["happy", "happy", "neutral", "love"][Math.floor(Math.random() * 4)]); }
        } else { if (!emp.chatWith) c.talk(false); if (emp.coWas) c.lookAt(null); }
        emp.coWas = mine;
        if (mine || custWaiting()) { empFidgetStop(); emp.chatWith = null; }
        else if (!best && emp.t <= 0) empIdleTick(dt);
        if (!mine && emp.t <= 0 && empLunchDue()) { empLunchStart(); break; }
        if (mine && Math.abs(gap) <= 0.02 && (emp.coT -= dt) <= 0) {   // one step at a time: hand out, then the step happens
          const s = coStep();
          if (emp.coReached) { emp.coReached = false; coAct(s.at); c.reachTo(null); emp.coT = 0.35; }
          else { emp.coReached = true; c.reachTo(empCoTarget(s.at), 1, { lean: false }); emp.coT = (s.at === "customer" ? 0.9 : 0.7) * Math.max(0.45, 1 - 0.04 * (lv("dana", "dex") - 1)); }   // (DEX: quick hands at the register)
        }
        if (co?.by === "dana" && !co.cust.c) { co = null; coHud(); drawerOpen = 0; }
        const tw = !co && emp.t <= 0 && custs.find(k => k.state === "tagWait" && k.t < 30 * k.who.persona.patience - 3);   // (a few seconds: yours if you want it)
        if (tw) { tagFix(tw, "dana"); c.reachTo(new THREE.Vector3(TAG_FIX_SPOT.x, 1.0, TAG_FIX_SPOT.z - 0.4)); emp.t = 0.8; }
        if (gateAlarm.on) { if ((emp.alarmT += dt) > 4) { emp.alarmT = 0; silenceGateAlarm(); gainXp("dana", "wis", 3); logAct(`${emp.first} shut off the gate alarm`); } } else emp.alarmT = 0;   // a few seconds' grace: yours if you want it
        if (emp.t <= 0 && co?.emp !== emp) c.reachTo(null);
        if (emp.t <= 0 && !co && c.mood === "happy" && !custWaiting()) { c.setPose("idle"); c.setMood("neutral"); }
        if (emp.paused && emp.t <= 0 && !co && !gateAlarm.on && !danaBestJob("returns")) { emp.paused = false; empNext(); break; }   // nothing above the returns needs her: back to them
        if (!co && !emp.leaving && empCanWatch()) {                       // closed up and you're on the couch: take the next cushion over
          const side = seatAt.x > 0 ? -1 : seatAt.x < 0 ? 1 : (Math.random() < 0.5 ? -1 : 1);   // the end cushion farthest from you
          emp.seat = { x: side * (Math.abs(SEATS[0].x) - 0.04), z: TV.z - 3.3 }; c.setMood("happy");   // on it, a hair inboard so elbows clear the arm
          empGo("toCouch", { x: emp.seat.x, z: TV.z - 2.425, ry: 0 });   // the strip between the couch and the coffee table
        }
        if (emp.state === "post" && co?.emp !== emp && !emp.paused && emp.t <= 0 && best && !["register", "phone"].includes(best)) {   // the next job on the board (phones: she takes those right here)
          if ((emp.jobT = (emp.jobT || 0) + dt) > 2) { emp.jobT = 0; danaStartJob(best); break; }
        } else emp.jobT = 0;
        if (emp.state === "post" && !best && empIdle() && emp.t <= 0 && stoolFree()) { if ((emp.idleT = (emp.idleT || 0) + dt) > EMP_STOOL_WAIT) { emp.idleT = 0; empFetchStool(); } }
        else emp.idleT = 0;
        break;
      }
      case "toStool":
        if (!empIdle()) { empGo("toPost", emp.home); break; }
        if (emp.stoolPlan === "sit") { empStoolSit(); break; }
        c.reachTo(new THREE.Vector3(stool.x, STOOL.SEAT, stool.z), 1, { lean: true }); emp.state = "stoolGrab"; emp.t = 0.7; break;   // a hand on the seat
      case "stoolGrab":
        if (emp.t > 0) break;
        colliders.splice(colliders.indexOf(stool.box), 1); stool.danaCarry = true; stool.vel = 0;
        c.setPose("hold"); empGo("stoolCarry", { x: EMP_STOOL.x, z: EMP_STOOL.z - 0.5, ry: 0 });   // behind its spot, facing the counter
        break;
      case "stoolCarry":                          // there: down it goes, and she's straight onto it
        stool.danaCarry = false; stool.x = EMP_STOOL.x; stool.z = EMP_STOOL.z;
        stool.g.position.set(stool.x, 0, stool.z); colliders.push(stoolFit(stool.x, stool.z, stool.box));
        empStoolSit(); break;
      case "stoolSitDown": {
        const k = 1 - Math.max(0, emp.t) / 0.7;
        p.x = emp.from.x + (stool.x - emp.from.x) * k; p.z = emp.from.z + (stool.z - emp.from.z) * k;
        if (emp.t <= 0) { stool.angle = emp.face - Math.PI; emp.stoolHome = emp.face; emp.state = "stoolSit"; emp.t = 3 + Math.random() * 5; emp.bored = 0; emp.spins = 0; c.setMood("neutral"); }
        break;
      }
      case "stoolSit": {
        if (!empIdle() || onStool) {               // something's up: off she gets
          emp.side = stoolSide(EMP_POST.x, EMP_POST.z) || { x: p.x, z: p.z - 0.6 };
          emp.from = { x: p.x, z: p.z }; emp.state = "stoolStandUp"; emp.t = 0.5;
          c.setPose("idle"); c.lookAt(null); c.setMood("neutral"); break;
        }
        emp.bored += dt;
        if (emp.spins > 0) {                       // bored stiff: shove after shove, same as you tapping E
          if ((emp.spinT -= dt) <= 0) { emp.spins--; emp.spinT = 0.22 + Math.random() * 0.12; stool.vel = Math.min(STOOL.MAX, stool.vel + STOOL.PUSH); }
          if (!emp.spins) c.setMood("love");       // wheeeee
        }
        if (!stool.vel) {                          // stopped facing who-knows-where: scoot back round to the counter
          const d = Math.atan2(Math.sin(emp.stoolHome - Math.PI - stool.angle), Math.cos(emp.stoolHome - Math.PI - stool.angle));
          stool.angle += Math.sign(d) * Math.min(Math.abs(d), 0.9 * dt);
        }
        emp.ry = emp.face = stool.angle + Math.PI;
        if (emp.t <= 0 && !stool.vel && !emp.chatWith) {   // a whim — the longer nothing happens, the more bored she gets
          const r = Math.random();
          if (emp.bored > EMP_BORED_AT) {          // that's it: a real spin
            emp.bored = 0; emp.spins = 4 + Math.floor(Math.random() * 4); emp.spinT = 0; c.lookAt(null); c.setMood("happy");
          }
          else if (r < 0.2) { stool.vel = Math.min(STOOL.MAX, 1.5 + Math.random() * 1.5); c.setMood("happy"); c.lookAt(null); }   // a lazy half turn
          else if (r < 0.5) { c.lookAt((Math.random() * 2 - 1) * 1.1); c.setMood("browse"); }                                     // what's going on over there
          else { c.lookAt(null); c.setMood(emp.bored > EMP_BORED_AT / 2 ? "meh" : "neutral"); }                                  // sigh
          emp.t = 4 + Math.random() * 8;
        }
        break;
      }
      case "stoolStandUp": {
        const k = 1 - Math.max(0, emp.t) / 0.5;
        p.x = emp.from.x + (emp.side.x - emp.from.x) * k; p.z = emp.from.z + (emp.side.z - emp.from.z) * k;
        if (emp.t <= 0) { stool.by = null; empGo("toPost", emp.home); }
        break;
      }
      case "toLunch": emp.state = "lunchSit"; emp.t = 0.7; emp.from = { x: p.x, z: p.z }; c.setPose("sit", { hipY: 0.47 }); break;
      case "lunchSit": {                          // into the chair, then a sandwich
        const ch = emp.lunchChair, k = 1 - Math.max(0, emp.t) / 0.7;
        p.x = emp.from.x + (ch.x - emp.from.x) * k; p.z = emp.from.z + (ch.z - emp.from.z) * k; emp.ry = emp.face = ch.ry;
        if (emp.t <= 0) { emp.state = "lunch"; emp.t = SHIFT.hour * 0.5; c.holdItem(sandwichMesh()); c.setMood("happy"); emp.biteT = 0; }
        break;
      }
      case "lunch":                               // eating, looking about, the odd glance at the clock
        if ((emp.biteT -= dt) <= 0) { emp.biteT = 3 + Math.random() * 5; const r = Math.random(); c.setMood(r < 0.4 ? "happy" : r < 0.7 ? "neutral" : r < 0.85 ? "love" : "sleep"); c.lookAt(r > 0.6 ? (Math.random() * 2 - 1) * 0.8 : null); }
        if (emp.t <= 0 || emp.leaving) { c.holdItem(null); c.setPose("idle"); c.lookAt(null); c.setMood("neutral"); emp.state = "lunchUp"; emp.t = 0.5; }
        break;
      case "lunchUp": if (emp.t <= 0) { const ch = emp.lunchChair; p.x = ch.x - Math.sin(ch.ry) * 0.5; p.z = ch.z - Math.cos(ch.ry) * 0.5; emp.lunchChair = null; logAct(`${emp.first}'s back from lunch`); empGo("toPost", emp.home); } break;
      case "toCouch": emp.state = "sitDown"; emp.t = 0.7; emp.from = { x: p.x, z: p.z }; c.setPose("sit"); break;
      case "sitDown": {                            // back onto the cushion, facing the TV
        const k = 1 - Math.max(0, emp.t) / 0.7;
        p.x = emp.from.x + (emp.seat.x - emp.from.x) * k; p.z = emp.from.z + (emp.seat.z - emp.from.z) * k; emp.ry = 0;
        if (emp.t <= 0) { emp.state = "watching"; emp.watch = { fast: 0, avg: 0, quiet: 0, loud: 0, cool: 2, hold: 0 }; emp.leaveT = 0; }
        break;
      }
      case "watching":
        empWatch(dt);
        if (!empKeepWatching()) {                  // you wandered off (she gives it a bit) / the store opened up (back to work now)
          if ((emp.leaveT += dt) > (frontLock.locked && !custs.length ? 8 : 1.5)) { emp.state = "standUp"; emp.t = 0.6; c.setPose("idle"); c.setMood("neutral"); }
        }
        else emp.leaveT = 0;
        break;
      case "standUp": if (emp.t <= 0) { p.z = TV.z - 2.425; c.lookAt(null); empGo("toPost", emp.home); } break;
      case "toStray": c.reachTo(emp.stray.mesh.position); emp.state = "strayTake"; emp.t = 0.8; break;
      case "strayTake": if (emp.t <= 0) {
        const s = emp.stray; emp.stray = null;
        if (strays.includes(s)) { strayTake(s); emp.carry.push(s.copy); shiftScore(5, "dana"); }
        empNext();
      } break;
      case "stockGo": c.reachTo(cupboardSpot(emp.restock.kind).door); emp.state = "stockGrab"; emp.t = 1; break;
      case "stockGrab": if (emp.t <= 0) {         // into the cupboard for what the racks need
        const r = emp.restock; c.reachTo(null);
        const units = r.units; r.units = [];     // (her own plan off the books, so emptySpots sees those spots again)
        const free = new Set(emptySpots());
        for (const u of units) { const nm = u.userData.snack.name; if (free.has(u) && (backstock[nm] || 0) > 0) { backstock[nm]--; r.got.push(u); } }
        danaRestockNext();
      } break;
      case "stockTo": {
        const u = emp.restock.got[0];
        if (isDrink(u.userData.snack) && !coolerOpen) { coolerOpen = true; emp.openedCooler = true; }
        c.reachTo(u.getWorldPosition(new THREE.Vector3())); emp.state = "stockPut"; emp.t = 0.8; break;
      }
      case "stockPut": if (emp.t <= 0) {
        const r = emp.restock, u = r.got.shift(); c.reachTo(null);
        if (!u.visible) { u.visible = true; if (isDrink(u.userData.snack)) u.userData.temp = ROOM_F; shiftScore(3, "dana"); r.n++; gainXp("dana", "str", 2); }
        else backstock[u.userData.snack.name] = (backstock[u.userData.snack.name] || 0) + 1;   // somebody beat her to it
        danaRestockNext();
      } break;
      case "toBin": { const b = emp.trash.t; c.reachTo(new THREE.Vector3(b.x, (b.rimY || 0.9) + 0.05, b.z)); emp.state = "bagging"; emp.t = 2.2 * Math.max(0.5, 1 - 0.03 * (lv("dana", "dex") - 1)); break; }
      case "bagging": if (emp.t <= 0) {
        const b = emp.trash.t; b.claim = null; c.reachTo(null);
        if (!b.n) { emp.trash = null; empGo("toPost", emp.home); break; }   // somebody beat them to it
        emp.trash.bag = bagTie(b); gainXp("dana", "con", 3); empToChute();
      } break;
      case "toBag": c.setPose("crouch"); c.reachTo(new THREE.Vector3(emp.trash.t.x, 0.25, emp.trash.t.z)); emp.state = "bagLift"; emp.t = 0.8; break;
      case "bagLift": if (emp.t <= 0) {
        const g = emp.trash.t; g.claim = null; c.setPose("idle"); c.reachTo(null);
        if (!bagsDown.includes(g)) { emp.trash = null; empGo("toPost", emp.home); break; }
        bagsDown.splice(bagsDown.indexOf(g), 1); g.mesh.removeFromParent(); unaim(g.mesh); g.mesh = makeBag(g.bin, g.n); emp.trash.bag = g; empToChute();
      } break;
      case "toChute": c.reachTo(new THREE.Vector3(...chute.at)); emp.state = "chuting"; emp.t = 1.3; chuteUse(1); break;
      case "chuting":
        if (emp.trash.bag && emp.t < 0.9) {      // in it goes
          c.holdItem(null); emp.trash.bag = null; shiftScore(10, "dana"); gainXp("dana", "str", 3); gainXp("dana", "con", 2);
          logAct(`${emp.first} took a bag of trash down the chute`, "good", null, 10);
        }
        if (emp.t <= 0) { c.reachTo(null); emp.trash = null; empGo("toPost", emp.home); }
        break;
      case "toMess": c.setPose("crouch"); c.reachTo(new THREE.Vector3(emp.mess.x, emp.mess.y + 0.05, emp.mess.z)); emp.state = "cleaning"; emp.t = 1.4; break;
      case "cleaning": if (emp.t <= 0) {
        const m = emp.mess; emp.mess = null; c.reachTo(null); c.setPose("idle");
        if (messes.includes(m)) messClean(m, "dana");
        empGo("toPost", emp.home);
      } break;
      case "toTote":
        if (!returnBin.length) { if (strays.length) { empNext(); break; } empBackToRegister(); logAct(`${emp.first} finished the returns`); break; }
        c.reachTo(new THREE.Vector3(EMP_TOTE.x + 0.55, 0.8, EMP_TOTE.z)); emp.state = "grab"; emp.t = 0.9; break;   // down into the tote
      case "grab": if (emp.t <= 0) { emp.carry = returnBin.splice(-Math.min(20, 6 + 2 * lv("dana", "str"))); refreshReturnsBin(); c.setMood("neutral"); empNext(); } break;
      case "toRewinder": emp.state = "rewind"; break;
      case "rewind": {                              // both machines at once if she's got the tapes for it
        for (const t of [...emp.rewinding]) if (!rewinders.some(rw => rw.tape === t)) {   // someone else took it out: it's theirs now
          emp.carry.splice(emp.carry.indexOf(t), 1); emp.rewinding.splice(emp.rewinding.indexOf(t), 1);
        }
        if (emp.t > 0) break;                      // one hand, one tape at a time
        const out = rewinders.find(rw => rw.done && emp.rewinding.includes(rw.tape));
        if (out) {                                 // out it comes, rewound
          emp.rewinding.splice(emp.rewinding.indexOf(out.tape), 1); c.reachTo(out.tapeMesh.getWorldPosition(new THREE.Vector3()));
          rewinderEmpty(out); emp.t = 0.5; c.setMood("neutral");
          c.holdTape(Math.min(3, emp.carry.length - emp.rewinding.length)); break;
        }
        const t = emp.carry.find(x => !isRewound(x) && !emp.rewinding.includes(x)), free = rewinders.find(rw => rw.on && !rw.tape);
        if (t && free) {                           // in it goes
          rewinderLoad(free, t, "dana"); emp.rewinding.push(t); c.reachTo(free.tapeMesh.getWorldPosition(new THREE.Vector3())); emp.t = 0.8; c.setMood("wait");
          c.holdTape(Math.min(3, emp.carry.length - emp.rewinding.length)); break;
        }
        if (!emp.rewinding.length) { if (t) c.setMood("impatient"); else { c.reachTo(null); empNext(); } break; }   // nothing of hers running: done, or both machines taken by someone else
        c.reachTo(null); c.setPose("hold");        // waiting on the machines
        break;
      }
      case "toHolds": c.reachTo(HOLDS_AT.clone().setY(HOLDS_AT.y + 0.1)); emp.state = "holdPut"; emp.t = 0.9; break;
      case "holdPut": if (emp.t <= 0) {
        const t = emp.target, h = holdAlertFor(t);   // (still wanted? they may have come and gone while she walked over)
        if (h) {
          emp.carry.splice(emp.carry.indexOf(t), 1); t.fromReturns = t.strayFix = false; h.copy = t; holdsRender(); shiftScore(15, "dana");
          logAct(`${emp.first} spotted the alert and put ${t.title} on the holds shelf for ${memberName(h.member)}`, "good", null, 15);
        }
        empNext();
      } break;
      case "toShelf": c.reachTo(emp.target.pos); emp.state = "shelve"; emp.t = 0.9 * Math.max(0.5, 1 - 0.03 * (lv("dana", "int") - 1)); break;   // into its own slot (INT: knows right where it goes)
      case "shelve": if (emp.t <= 0) {            // back in its slot, tag re-armed
        const t = emp.target; emp.carry.splice(emp.carry.indexOf(t), 1); t.desens = false; t.fromReturns = false; setOnShelf(t, true);
        shiftScore(5, "dana"); emp.shelved = (emp.shelved || 0) + 1; gainXp("dana", "int", 4);
        if (!emp.carry.length) { logAct(`${emp.first} reshelved ${emp.shelved === 1 ? "a return" : emp.shelved + " returns"}`, "good", null, 5 * emp.shelved); emp.shelved = 0; }
        empNext();
      } break;
    }
  }
  if (stool.danaCarry) {                         // the stool rides just ahead of her, a hand on the seat
    const sx = p.x + Math.sin(emp.face) * 0.5, sz = p.z + Math.cos(emp.face) * 0.5;
    stool.g.position.set(sx, 0.12, sz);
    c.reachTo(new THREE.Vector3(sx - Math.sin(emp.face) * 0.15, STOOL.SEAT + 0.12, sz - Math.cos(emp.face) * 0.15), 1, { lean: false });
  }
  // the counter pass-through: lift it to get by, drop it again behind her
  const fx = (flapCollider.x0 + flapCollider.x1) / 2, fz = (flapCollider.z0 + flapCollider.z1) / 2, fd = Math.hypot(p.x - fx, p.z - fz);
  const goal = emp.path[emp.path.length - 1];
  if (!flapOpen && fd < 1.2 && goal && (p.z - fz) * (goal[1] - fz) < 0) { toggleFlap(); emp.openedFlap = true; }
  else if (emp.openedFlap && flapOpen && fd > 1.4 && !(goal && (p.z - fz) * (goal[1] - fz) < 0)) { toggleFlap(); if (!flapOpen) emp.openedFlap = false; }   // through and clear (her post is ~1.6 m off)
  emp.face += Math.atan2(Math.sin(emp.ry - emp.face), Math.cos(emp.ry - emp.face)) * Math.min(1, dt * 8);
  c.group.rotation.y = emp.face + dk * 0.35 * Math.sin(clockT * 2.3);
  c.group.rotation.z = dk * 0.12 * Math.sin(clockT * 1.7);   // swaying on her feet
  const er = emp.squeeze > 0 ? 0 : 0.22;
  Object.assign(emp.box, { x0: p.x - er, x1: p.x + er, z0: p.z - er, z1: p.z + er });
  c.tick(dt, speed);
}
function setFrontLock(on) {
  frontLock.locked = on;
  frontLock.turn.rotation.z = on ? Math.PI / 2 : 0;
  frontLock.signs.forEach(sg => sg.visible = sg.userData.open !== on);
}
