// JellyBuster smoke tests: load the game headless from file:// and drive its
// systems through the window.__t hooks, checking each still works. Run with
//   npm test                   (after: npm install; npx playwright install chromium)
// or point it at any Chromium: PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome npm test
// Software rendering is slow, so this takes a few minutes; it exits non-zero on any failure.
import { URL, launch, linkedContext } from "./browser.mjs";

let failed = 0;
const check = (name, ok, detail = "") => { console.log(`${ok ? "  ✓" : "  ✗"} ${name}${detail ? `  (${detail})` : ""}`); if (!ok) failed++; };
const browser = await launch();
const page = await (await linkedContext(browser, { viewport: { width: 1000, height: 600 } })).newPage();
const errors = []; page.on("pageerror", e => errors.push(String(e)));
const ev = (f, a) => page.evaluate(f, a);
const ready = () => page.waitForFunction(() => !document.getElementById("mainMenu").hidden, null, { timeout: 300000 });
async function freshStore(mode) {                // a new store in slot 1, into the game
  await ev(m => { window.__t?.stopSaving(); localStorage.clear(); localStorage.setItem("jellybuster-save", JSON.stringify({ v: 3, mode: m, fresh: true })); }, mode);   // (stop the current store saving over the new one on the way out, as the menu does)
  await page.reload({ timeout: 300000 }); await ready();
  await page.click("#mmFiles .acts .go"); await page.waitForFunction(() => document.pointerLockElement, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

console.log("JellyBuster smoke tests");
await page.goto(URL, { timeout: 300000 });

console.log("\nstartup + menu");
await ev(() => localStorage.clear()); await page.reload({ timeout: 300000 }); await ready();
check("loads with no errors", errors.length === 0, errors[0]);
check("first visit: three empty store files", (await page.$$("#mmFiles .file.empty")).length === 3);
await page.click('#mmFiles [data-file="2"]');
check("an empty file offers the three modes", (await page.$$("#mmFiles [data-mode]")).length === 3);
await page.click("#mmSettingsBtn");
await page.fill("#setSens", "150").catch(() => {}); await ev(() => { const e = document.getElementById("setSens"); e.value = 150; e.dispatchEvent(new Event("input")); });
check("settings save (sensitivity)", (await ev(() => JSON.parse(localStorage.getItem("jellybuster-settings")).sens)) === 150);

console.log("\nsandbox: the counter");
await freshStore("sandbox");
check("in the store, no errors", errors.length === 0, errors[0]);
const hop = await ev(() => { const J = __t.jump, P = __t.player, was = { x: P.x, z: P.z }; const run = (vx, vz) => { Object.assign(P, { x: 0, z: -3, airH: 0 }); J.vx = vx; J.vz = vz; J.recover = 0; const started = __t.jumpStart(), again = __t.jumpStart(); let peak = 0, t = 0; while (J.air && t < 3) { __t.jumpTick(1 / 60); t += 1 / 60; peak = Math.max(peak, P.airH); } return { started, again, peak: +peak.toFixed(2), air: +t.toFixed(2), dist: +Math.hypot(P.x, P.z + 3).toFixed(2), ground: P.airH }; };
  const standing = run(0, 0), running = run(-5.2, 0), walking = run(-3.1, 0); J.recover = 0; J.vx = J.vz = 0; Object.assign(P, was, { airH: 0 }); return { standing, walking, running }; });
check("a jump's a person's: about 42 cm up, 0.6 s in the air, no jumping off thin air, back down on the ground; a walk carries about 1.8 m, a run about 3", hop.standing.started && !hop.standing.again && hop.standing.peak > 0.38 && hop.standing.peak < 0.48 && hop.standing.air > 0.5 && hop.standing.air < 0.68 && hop.standing.dist < 0.01 && hop.standing.ground === 0 && hop.walking.dist > 1.5 && hop.walking.dist < 2.1 && hop.running.dist > 2.6 && hop.running.dist < 3.5, JSON.stringify(hop));
const wheel = await ev(() => { const W = __t.WHEEL, h0 = __t.shift.h, pick = (i, n = 11) => { __t.wheelOpen(); const a = -Math.PI / 2 + i * Math.PI * 2 / n; __t.wheelMouse(Math.cos(a) * 200, Math.sin(a) * 200); return __t.wheelClick(0); };
  const noon = (pick(1), __t.shift.h), snow = (pick(8), { kind: __t.WX.kind, cover: __t.WX.cover }), clear = (pick(5), { k: __t.WX.k, cover: __t.WX.cover }); __t.wheelOpen(); __t.wheelMouse(0, -200); __t.wheelClick(2); const cancelled = __t.shift.h === noon && !W.open; __t.shift.h = h0; return { noon, snow, clear, cancelled, open: W.open }; });
check("the time and weather wheel: pick an hour and it's that hour; pick snow and it's snowed; clear clears it; right-click changes nothing", wheel.noon === 12 && wheel.snow.kind === "snow" && wheel.snow.cover > 0.5 && wheel.clear.k === 0 && wheel.clear.cover === 0 && wheel.cancelled && !wheel.open, JSON.stringify(wheel));
const storeExit = await ev(() => { const E = __t.storeExit, P = __t.player, zc = (E.shut.z0 + E.shut.z1) / 2, was = { x: P.x, z: P.z }, run = (t, near) => { for (let i = 0; i < t * 60; i++) __t.exitDoorTick(E, 1 / 60, near); };   // (stepped by hand: in software the frames are too slow to wait on)
  P.x = 10.5; P.z = zc; const shut = blocked(10.75, zc); __t.fireExitUse("out", E); const outside = E.open; __t.fireExitUse("in", E); run(1, true); const open = E.a > 0.6, through = !blocked(10.75, zc);
  run(5, false); const closed = E.a === 0 && !E.open && colliders.includes(E.shut); Object.assign(P, was); return { shut, outside, open, through, closed }; });
check("the store's emergency exit: shut, it's a wall; no opening it from outside; the bar opens it; it pulls itself shut behind you", storeExit.shut && !storeExit.outside && storeExit.open && storeExit.through && storeExit.closed, JSON.stringify(storeExit));
const heard = await ev(() => { const at = (x, z, room) => +__t.tvHear(x, z, room ?? __t.hearRoomAt(x, z)).k.toFixed(3), fx = __t.fireExit.a, C = roof.cine, on = C.on;
  const r = { couch: at(0, 23), storeFront: at(-5, 2), hall: at(5, 29), lobbyShut: at(-3, 32), theater: at(-3, 40), lot: at(0, -8), road: at(0, -17), alley: at(15, 30), backRoad: at(0, 51), tony: at(17, 6), roofOff: at(5, 15, "roof") };
  __t.fireExit.a = 1; r.byExitOpen = at(-10, 45.4); r.farFromExitOpen = at(-14, 20); __t.fireExit.a = fx;
  C.on = true; const s = C.sound.getWorldPosition(new THREE.Vector3()); r.roofBySet = at(s.x + 1, s.z, "roof"); r.groundBelowRoof = at(s.x > 2 ? 12 : -9, s.z); r.lotRoofOn = at(0, -17); C.on = on; return r; });
check("a tape's sound carries like sound: all through the store and the theater, up on the roof with the projector on, a little out the open exit, next to nothing anywhere else",
  heard.couch > 0.7 && heard.storeFront > 0.1 && heard.hall > 0.08 && heard.theater > 0.7 && heard.lobbyShut < 0.15 && heard.lot < 0.01 && heard.road < 0.01 && heard.alley < 0.02 && heard.backRoad < 0.02 && heard.tony < 0.005 && heard.roofOff < 0.01 && heard.byExitOpen > 0.1 && heard.farFromExitOpen < 0.05 && heard.roofBySet > 0.5 && heard.groundBelowRoof < 0.3 && heard.lotRoofOn < 0.1, JSON.stringify(heard));
check("the back ladder: out of reach from the ground till it's kicked down from the roof, then a way up", await ev(() => {
  const B = __t.roof.back, P = __t.player, was = { x: P.x, z: P.z };
  P.onRoof = false; __t.backLadderE(); const no = !__t.roof.climb && !B.down;
  P.onRoof = true; __t.backLadderE(); const down = B.down; P.onRoof = false;
  B.slide.position.y = 0; __t.backLadderE(); const up = !!__t.roof.climb; __t.roof.climb = null; Object.assign(P, was);
  return no && down && up; }));
const co = await ev(async () => {
  __t.shift.h = 13; __t.setFrontLock(true); for (const e of __t.staff) e.state = "test"; for (const k of [...__t.custs]) __t.custGone(k);
  __t.custSpawn(); const k = __t.custs.at(-1), tape = __t.catalog.find(t => !t.offShelf && !t.lost && t.pos);
  __t.setOnShelf(tape, false); k.tapes = [tape]; k.holding = 1; k.member.owed = 2; k.tickets = 0;
  k.c.group.position.set(__t.CUST_COUNTER.x, 0, __t.CUST_COUNTER.z); k.path = []; k.state = "wait"; k.t = 99; __t.custLine.push(k);
  __t.custInteract(k); for (const at of ["register", "customer", "customer", "customer", "pad", "customer", "register"]) __t.coAct(at);
  window.__k = k; return { step: __t.coStep()?.id, total: __t.co()?.total };
});
check("checkout reaches the receipt (fees charged)", co.step === "tear" && co.total > 1.99, JSON.stringify(co));
await page.waitForFunction(() => __t.printer.job?.done, null, { timeout: 300000 }).catch(() => {});
await ev(() => { __t.coAct("printer"); for (let i = 0; i < 4 && __t.co(); i++) __t.coAct("customer"); });
check("checkout completes and scores", await ev(() => !__t.co() && __t.shift.stats.served === 1 && __t.shift.stats.score > 0));

console.log("\nsandbox: stock, phone, counter gear");
check("restock fills a lane from the back, even pointing at the pack in front", await ev(() => {
  const lane = __t.snackLane(__t.snackUnits().find(u => !__t.snackLane(u).every(k => k === u) && __t.snackLane(u).length >= 2 && !u.userData.snack.kind));
  lane.forEach(u => u.visible = true); const back = lane.at(-1); back.visible = false; __t.stockTake("food");
  const slot = __t.stockSlotIn(lane[0]); __t.stockPlace(slot); return slot === back && back.visible; }));
check("shoppers take the front pack of a lane", await ev(() => {
  for (const k of [...__t.custs]) __t.custGone(k); __t.custSpawn(); const k = __t.custs.at(-1);
  const spot = __t.snackSpots().find(s => !s.drinks); spot.units.forEach(u => u.visible = true);
  Object.assign(k, { spot, state: "snack", t: 0, path: [] }); k.c.group.position.set(spot.x, 0, spot.z); __t.custTick(0.05);
  const u = k.snackUnit, ok = !!u && __t.snackLane(u)[0] === u; __t.custGone(k); return ok; }));
check("restock from the cupboard", await ev(() => { const u = __t.snackUnits().find(u => !u.userData.snack.r); u.visible = false; __t.stockTake("food"); __t.stockPlace(u); return u.visible && __t.stockCarry.size === 0; }));
const hold = await ev(() => { __t.phone.next = null; __t.phone.ring = { member: __t.posTerm.members.find(m => m.active), title: __t.catalog.find(t => t.pos && !t.offShelf), t: 0, rang: 99 };
  __t.phoneAnswer(); __t.callAnswer(1); const h = __t.holds.at(-1); const c = [h.title, ...(h.title.copies || [])].find(c => !c.offShelf && c.pos); __t.pickup(c); __t.holdPlace(c); return !!h.copy; });
check("phone call -> hold put aside", hold);
const calls = await ev(() => {                   // the other calls: the right answer scores, a waived fee clears the account
  const m = __t.posTerm.members.find(m => m.active); m.owed = 6;
  const ring = r => { __t.phone.ring = { ...r, t: 0, rang: 99 }; __t.phoneAnswer(); return document.getElementById("callPanel").textContent; };
  const s0 = __t.shift.stats.score, q = ring({ kind: "hours", member: m }); __t.callAnswer(1);
  ring({ kind: "fee", member: m }); __t.callAnswer(1);
  return q.includes("close") && __t.shift.stats.score > s0 && __t.posTerm.owed(m) === 0; });
check("other calls: closing time answered, late fee waived", calls);
const inbox = await ev(() => {                   // a tape a week late: a call to make in the message center; a missed call leaves a note
  const m = __t.posTerm.members.find(m => m.rentals.length); if (!m) return "no rentals";
  const n0 = __t.posTerm.inbox();
  m.rentals[0].due = new Date(+__t.shiftDate() - 7 * 864e5);
  const n1 = __t.posTerm.inbox(); __t.phone.ring = { kind: "hours", member: m, t: 30, rang: 99 }; __t.phoneTick(0.1);
  return n1 > n0 && __t.posTerm.inbox() > n1 && __t.posTerm.messagesAll().at(-1).text.includes("MISSED CALL"); });
check("message center: overdue call to make, missed call noted", inbox === true, String(inbox));
const cal = await ev(() => {                     // day 1 is Mon Sept 30 1996; day 32 is Halloween: busier, and horror's in season
  const d0 = __t.shift.day, out = [__t.shiftDate().getDay() === 1 || d0 !== 1];
  __t.shift.day = 32; const s = __t.season(); out.push(s.rush > 1, s.today[0]?.label === "HALLOWEEN", s.lean.includes("Horror"));
  __t.shift.day = 40; out.push(!__t.season().lean.length); __t.shift.day = d0; __t.season(); return out.join(); });
check("calendar: day 1 a Monday, Halloween busier with horror in season", cal === "true,true,true,true,true", cal);
const drive = await ev(() => {                   // a member with a car: it comes by, parks, they get out and walk up; gone, it backs out and leaves
  const m = __t.posTerm.members.find(m => m.active && !__t.custs.some(k => k.member === m)); m.car = { s: 1, c: 0x1f4a36 };
  const k = __t.custSpawn(m), out = [k.state, !!k.car];
  for (let i = 0; i < 400 && k.state === "drivingIn"; i++) __t.exteriorTick(0.05);
  out.push(k.car.phase, k.state, k.c.group.visible, Math.abs(k.c.group.position.x - k.car.door.x) < 0.01);
  const car = k.car; __t.custGone(k); for (let i = 0; i < 400 && car.phase !== "gone"; i++) __t.exteriorTick(0.05);
  out.push(car.phase, JSON.stringify(__t.posTerm.recordsAll()[m.num]?.car)); return out.join(); });
check("a customer's own car: drives in, parks, they get out; leaving, it drives off; the car's on their record", drive === 'drivingIn,true,parked,arrive,true,true,gone,{"s":1,"c":2050614}', drive);
check("sound effects follow mute (M) and the volume setting", await ev(() => {
  const ac = StoreAudio.ctx(), was = StoreAmbience.muted(); StoreAmbience.setMuted(true); const off = __t.sfxOut(ac).gain.value;
  StoreAmbience.setMuted(false); const on = __t.sfxOut(ac).gain.value; StoreAmbience.setMuted(was); return off === 0 && on > 0; }));
check("move the desensitizer along the counter", await ev(() => { __t.player.x = -4.9; __t.player.z = 3; const it = __t.counterItemsList().find(i => i.id === "desens");
  __t.moveStart(it); __t.cmove.spot = { x: -3.4, z: 3.85 }; __t.cmove.ok = true; __t.movePlace(); return Math.abs(__t.DESENS_AT.x + 3.4) < 0.01 && !__t.cmove.item; }));
await page.waitForTimeout(2500);
await page.reload({ timeout: 300000 }); await ready(); await page.click("#mmFiles .acts .go"); await page.waitForTimeout(1000);
check("save/reload keeps the counter layout and the hold", await ev(() => Math.abs(__t.DESENS_AT.x + 3.4) < 0.01 && __t.holds.length === 1));
await ev(() => {                                 // a store saved in 2026 (before the game was set in 1996): its dates move back
  __t.stopSaving(); const k = Object.keys(localStorage).find(k => k.startsWith("jellybuster-save") && JSON.parse(localStorage.getItem(k))?.shift);
  const s = JSON.parse(localStorage.getItem(k)), dt = +new Date(2026, 9, 5, 12) - s.shift.date0; s.shift.date0 += dt;
  for (const r of Object.values(s.rentals || {})) if (r) r[1] += dt;
  localStorage.setItem(k, JSON.stringify(s)); });
await page.reload({ timeout: 300000 }); await ready(); await page.click("#mmFiles .acts .go"); await page.waitForTimeout(1000);
check("an old 2026 save moves to 1996, rentals with it", await ev(() => __t.shiftDate().getFullYear() === 1996 && __t.posTerm.members.flatMap(m => m.rentals).every(r => r.due.getFullYear() < 1998)));

check("calling: weekday afternoons get the machine, past bedtime gets you yelled at", await ev(() => {
  const m = __t.posTerm.members.find(m => { const h = __t.memberHabits(m); return h.works && !h.nightOwl; }), N = 400, run = (h, d) => Array.from({ length: N }, () => __t.callOutcome(m, h, d));
  const work = run(13, 3).filter(o => o.pick !== "answer").length / N, night = run(23.8, 3), angry = night.filter(o => o.mood === "angry").length / N;
  const noon = run(12.5, 6).filter(o => o.mood === "ok").length, eve = run(13 + 6.5, 3).filter(o => o.pick === "answer").length / N;
  return work > 0.7 && angry > 0.3 && eve > 0.6 && noon > 0; }));
check("calling: a post-it by the phone, the call, the result on it, peeled off and tossed", await ev(() => {
  __t.phone.ring = __t.phone.call = __t.phone.out = null;
  const m = __t.posTerm.members.find(m => m.rentals.length && !__t.posTerm.calledToday(m) && !m.promise), calls = m.calls || 0;
  m.rentals[0].due = new Date(+m.rentals[0].due - 12 * 86400000);   // (12 days later than it was: overdue enough to call)
  const n = __t.postitAdd(m, true); __t.postitCall(n); const ringing = !!__t.phone.out;
  for (let i = 0; i < 80 && __t.phone.out; i++) __t.phoneOutTick(0.5);
  const done = !!n.result && m.calls === calls + 1 && __t.posTerm.calledToday(m) && !!m.lastResult;
  const b = __t.trashBins.counter, b0 = b.n; __t.postitPickUp(n); const held = __t.postitHeld() === n; __t.postitToss(b);
  return ringing && done && held && !__t.postits.includes(n) && b.n === b0 + 1; }));
check("calling: a promise alone brings nothing back (they have to come in)", await ev(() => {
  const m = __t.posTerm.members.find(m => m.rentals.length && !m.promise), r = m.rentals[0], copy = r.copy, bin0 = __t.returnBin.length;
  r.due = new Date(+r.due - 9 * 86400000); __t.posTerm.recordCall(m, { promise: true, result: "test" }); __t.posTerm.setStatus(m, "banned", 30);
  __t.beginShift();
  const still = m.rentals.includes(r) && copy.rental === r && !__t.returnBin.includes(copy) && __t.returnBin.length === bin0;
  __t.posTerm.setStatus(m, null); return still; }));
check("trash: a full bin spills, bag it, down the chute", await ev(() => { const b = __t.trashBins.lobby, m0 = __t.messes.length; __t.trashAdd(b, b.cap + 1);
  const spilled = __t.messes.length > m0; __t.binBag(b); const bagged = __t.bagCarry.length === 1 && b.n === 0; const s0 = __t.shift.stats.score; __t.chuteDrop();
  return spilled && bagged && !__t.bagCarry.length && __t.shift.stats.score === s0 + 10; }));

console.log("\nsandbox: the restroom");
await ev(() => { for (const c of [5.0, 5.25]) { const d = __t.doors.find(d => !d.push && Math.abs(d.c - c) < 0.1); if (d && !d.open) __t.toggleDoor(d); }
  __t.player.x = 5.25; __t.player.z = 33.2; const dx = 0, dy = 0.41 - 1.65, dz = 34.3 - 33.2; __t.player.yaw = Math.atan2(-dx, -dz); __t.player.pitch = Math.atan2(dy, Math.hypot(dx, dz)); });
await page.waitForFunction(() => document.getElementById("tvHint").textContent.includes("toilet"), null, { timeout: 120000 }).catch(() => {});
await page.keyboard.press("KeyE"); await page.waitForTimeout(1500);
check("sit on the toilet: seated, pants down", await ev(() => { const hip = __t.meBody().rig.legs[0].hip.children.find(m => m.isMesh); return __t.seated() && !!__t.seatAt()?.toilet && hip.material !== hip.userData.pantsM; }));
await page.keyboard.press("KeyE");
await page.waitForFunction(() => { const hip = __t.meBody().rig.legs[0].hip.children.find(m => m.isMesh); return !__t.seated() && hip.material === hip.userData.pantsM; }, null, { timeout: 10000 }).catch(() => {});   // (a frame or two: slow on the software renderer)
check("stand back up: pants up", await ev(() => { const hip = __t.meBody().rig.legs[0].hip.children.find(m => m.isMesh); return !__t.seated() && hip.material === hip.userData.pantsM; }));

console.log("\nsimulation: starts bare");
await freshStore("simulation");
const sim = await ev(() => { const all = __t.catalog.flatMap(t => [t, ...(t.copies || [])]), hall = __t.doors.find(d => d.push && !d.alongX);
  return { dana: __t.staff.length, board: __t.jobBoardMesh().g.visible, theater: hall.locked, lib: all.filter(c => c.libLocked).length, members: __t.posTerm.members.filter(m => m.active).length }; });
check("no Dana, no job board", !sim.dana && !sim.board);
check("theater locked, library tiers off the shelves", sim.theater && sim.lib > 0, `${sim.lib} tapes`);
check("a small member base", sim.members === 40, `${sim.members}`);
await ev(() => __t.upgBuy("hire")); await page.waitForTimeout(1500);
const apps = await ev(() => ({ open: __t.hiring.open, n: __t.hiring.apps.length, totals: __t.hiring.apps.map(a => Object.values(a.levels).reduce((x, y) => x + y, 0)), names: new Set(__t.hiring.apps.map(a => a.first + a.last)).size }));
check("hiring: three applicants, every one's stats add up the same", apps.open && apps.n === 3 && apps.totals.every(t => t === apps.totals[0]) && apps.names === 3, JSON.stringify(apps));
await ev(() => { __t.hirePick(1); __t.staff[0].sched[__t.weekday()] = (1 << 15) - 1; }); await page.waitForTimeout(1500);   // (on the clock all day today)
check("the hire shows up and the board goes up", await ev(() => __t.staff.length === 1 && !!__t.staff[0].c && __t.jobBoardMesh().g.visible && !__t.hiring.open));
const cost = await ev(async () => { const c0 = __t.hireCost(); __t.upgBuy("hire"); await new Promise(r => setTimeout(r, 3000)); __t.hirePick(0); return { c0, c1: __t.hireCost(), n: __t.staff.length }; });
check("a second hire, and the next one costs more", cost.n === 2 && cost.c1 > cost.c0, JSON.stringify(cost));
check("the schedule: 25 hours max, and off the clock they head out the door", await ev(() => {
  const e = __t.staff[0], d = __t.weekday(); e.sched = Array(7).fill(0);
  const err0 = __t.setSched(e.id, d, 5, true);
  e.sched = Array(7).fill(0); for (let k = 0; k < 25; k++) e.sched[Math.floor(k / 5)] |= 1 << (10 + k % 5);   // 25 hours, all evenings (not now)
  const full = __t.setSched(e.id, 6, 3, true);
  e.state = "post"; e.t = 0; __t.empTick(0.05);
  return !err0 && /25 HOURS/.test(full || "") && e.leaving && e.state === "toExit"; }));
check("a gap in the schedule: out the door, back in, and not still heading home", await ev(() => {
  const e = __t.staff[0], d = __t.weekday(), h0 = __t.shift.h; e.sched = Array(7).fill(0); e.sched[d] = (0b11 << 3) | (0b111 << 6);   // 12-2, 3-6
  const run = (h, n) => { __t.shift.h = h; for (let i = 0; i < n; i++) __t.empTick(0.05); };
  run(12.2, 400); const on = !!e.c; run(14.2, 3000); const gone = !e.c; run(15.2, 400); const back = !!e.c && !e.leaving;
  __t.shift.h = h0; return on && gone && back; }));
check("skills level up with XP (you and staff)", await ev(() => { const e = __t.staff[0], l0 = __t.lv(e, "dex"); __t.gainXp(e, "dex", (__t.xpToNext(l0) + 1) / __t.SKILLS.dex.rate); __t.gainXp("you", "str", (__t.xpToNext(1) + 1) / __t.SKILLS.str.rate);   /* (each stat earns at its own rate) */ return __t.lv(e, "dex") === l0 + 1 && __t.lv("you", "str") >= 2; }));

console.log("\nsimulation: unlocks, upgrades, staff, the closet, the register");
check("milestones: DEX 5 unlocks Quick Thread", await ev(() => {
  const sk = __t.you.skills.dex; sk.lvl = 4; sk.xp = 0; const before = __t.has("you", "dex", 5);
  __t.gainXp("you", "dex", (__t.xpToNext(4) + 1) / __t.SKILLS.dex.rate);
  return !before && __t.has("you", "dex", 5) && /Unlocked Quick Thread/.test(document.getElementById("actLog").textContent); }));
const rw = await ev(() => { const st = () => __t.rewinders.map(r => r.on ? (r.car ? "car" : "box") : "-").join("+");
  const out = [st(), __t.upgBuy("rewinders")]; __t.upgBuy("rewinder2"); out.push(st()); __t.upgBuy("rewinders"); out.push(st()); return out; });
check("rewinders: one box, a second, then the cars (in that order)", rw.join() === "box+-,SECOND REWINDER FIRST.,box+box,car+car", rw.join(" | "));
check("staff: once the shift's over, no new jobs, and returns go back in the tote", await ev(() => {
  const e = __t.staff[1], tapes = __t.catalog.filter(t => t.pos && !t.offShelf).slice(0, 3);
  e.sched = Array(7).fill((1 << 15) - 1); if (!e.c) __t.empTick(0.05);
  for (const t of tapes) { __t.setOnShelf(t, false); __t.returnBin.push(t); }
  e.jobs.forEach(j => j.pri = j.id === "returns" ? 1 : 0); e.sched = Array(7).fill(0);
  Object.assign(e, { state: "post", t: 0, paused: false, task: "register" }); __t.empTick(0.05);   // shift over, work waiting: they leave anyway
  const left = e.state === "toExit";
  const t = __t.returnBin.pop();                    // (and mid-returns, carrying one:)
  e.task = "returns"; e.carry = [t]; __t.withEmp(e, () => __t.empNext());
  return left && e.task === "register" && !e.carry.length && __t.returnBin.includes(t); }));
check("members come on their own rhythm (nobody who was just in)", await ev(() => {
  const ms = __t.posTerm.members.filter(m => m.active), now = __t.shift.day + __t.shift.h / 24, was = ms.map(m => m.lastVisit);
  ms.forEach(m => m.lastVisit = now); const none = [0, 1, 2, 3, 4].every(() => !__t.custPickMember());
  ms.forEach((m, i) => m.lastVisit = was[i]); return none && !!__t.custPickMember(true); }));
check("day goals: two of them", await ev(() => __t.shift.goals?.length === 2));
check("the trees' year: bare in winter, budding in April, full in summer, turned in late Oct, bare again by December", await ev(() => {
  const s = d => StoreTrees.leafState(d);
  return s(30).L === 0 && s(115).L > 0.1 && s(115).L < 0.9 && s(200).L === 1 && s(200).turn === 0 && s(300).turn === 1 && s(300).L > 0.3 && s(340).L === 0; }));
check("the closet: carry the ladder out, set it up under a dead light, climb, swap the tube, put it back", await ev(() => {
  const L = __t.ladder, p = __t.player, tr = __t.TROFFERS[0];
  __t.lightDie(0, 0); const dead = __t.deadLights.length === 1;
  __t.ladderPickUp(); const carried = L.state === "carried";
  L.spot = { x: tr.x, z: tr.z + 0.2, ry: 0, ok: true }; __t.ladderPutDown();   // (as if set down right under it)
  const placed = L.state === "placed" && __t.colliders.includes(L.box);
  p.x = tr.x; p.z = tr.z + 1.4; __t.ladderClimb(); for (let i = 0; i < 40; i++) __t.ladderTick(0.05);
  const up = L.on && L.lift === 1;
  L.fix = { d: __t.deadLights[0], t: 0 }; for (let i = 0; i < 40; i++) __t.ladderTick(0.05);
  const fixed = !__t.deadLights.length;
  __t.ladderDown(); const down = !L.on && Math.hypot(p.x - L.x, p.z - L.z) > 0.6;
  __t.ladderPickUp(); __t.ladderStore();
  return dead && carried && placed && up && fixed && down && L.state === "stored" && !__t.colliders.includes(L.box) && __t.colliders.includes(L.stowBox); }));
check("the closet: the mop goes to the floor, works a spill over and cleans it", await ev(() => {
  __t.toolTake("mop"); const g = __t.TOOLS.mop.held, p = __t.player;
  __t.toolTick(0.016); const onFloor = g.parent === __t.scene && Math.abs(g.position.y - 0) < 0.05;
  __t.messAdd("spill", p.x - Math.sin(p.yaw) * 1.2, p.z - Math.cos(p.yaw) * 1.2); const m = __t.messes.at(-1);
  __t.scrubStart(m); const xs = [];
  for (let i = 0; i < 200 && __t.scrub(); i++) { __t.toolTick(0.02); xs.push(g.position.x + g.position.z); }
  const swept = Math.max(...xs) - Math.min(...xs) > 0.2;   // it went back and forth over it
  const cleaned = !__t.messes.includes(m); __t.toolReturn();
  return onFloor && swept && cleaned && !__t.toolHeld() && !g.parent && __t.TOOLS.mop.g.visible; }));
check("the register shows the sale once the card's tapped", await ev(() => {
  __t.setFrontLock(true); for (const e of __t.staff) e.state = "test"; for (const k of [...__t.custs]) __t.custGone(k);
  __t.custSpawn(); const k = __t.custs.at(-1), tape = __t.catalog.find(t => !t.offShelf && !t.lost && t.pos && !t.libLocked);
  __t.setOnShelf(tape, false); k.tapes = [tape]; k.holding = 1; k.tickets = 0;
  k.c.group.position.set(__t.CUST_COUNTER.x, 0, __t.CUST_COUNTER.z); k.path = []; k.state = "wait"; k.t = 99; __t.custLine.push(k);
  __t.custInteract(k); const before = __t.posTerm.ringing();
  __t.coAct("register"); const s = __t.posTerm.ringing();
  return before && !before.carded && s?.carded && s.member === k.member && s.items.length === 1; }));

console.log("\ncustomer mode");
await freshStore("customer");
check("out on the lot in your own clothes, a full crew, the doors locked till 10", await ev(() =>
  __t.CUSTOMER && __t.player.z < 0 && __t.staff.length >= 3 && __t.blocked(0.9, -0.3) && __t.staff.every(e => e.sched.every(m => m)) && __t.KEYED.every(k => k.door())));
check("open at 10: in through the right-hand door, not through the glass or a wall; round the sides and across the road", await ev(() => {
  __t.shift.h = 10.01; __t.setFrontLock(false); Object.assign(__t.player, { x: 3, z: -3 });
  return !__t.blocked(0.9, -0.3) && !__t.blocked(0.9, 0.2) && __t.blocked(-3, 0) && __t.blocked(-6, 5) && !__t.blocked(-9.5, 5) && !__t.blocked(0, -16); }));
check("pay at the register: wallet down, the tape's yours (desensitized), the store's up", await ev(() => {
  Object.assign(__t.player, { x: 0.9, z: 6 }); const t = __t.catalog.find(t => !t.offShelf && t.pos && !t.libLocked); __t.pickup(t); __t.invSync();
  const e = __t.staff[0], w = __t.cm.wallet, b = __t.posTerm.budget(); __t.cmPay(e);
  return __t.cm.rented.has(t) && t.desens && __t.cm.wallet < w && __t.posTerm.budget() > b; }));
check("caught taking something: it's taken back and you're out for the day", await ev(() => {
  const t = __t.catalog.find(t => !t.offShelf && t.pos && !t.libLocked); __t.pickup(t); __t.invSync(); __t.cm.today = 1;
  __t.cmCaught("theft", __t.staff[0]); return __t.cm.banned === __t.shift.day && __t.returnBin.includes(t) && !__t.inv().some(e => e.ref === t); }));
const keySpot = `const id = __t.cmTrail.keyAt; if (id.startsWith("bin:")) __t.cmSearchBin(__t.trashBins[id.slice(4)]); else __t.cmSearch(__t.PICKUPS.find(p => p.id === id));`;
check("the break room key's hidden in this save's spot (searching the rest turns up nothing)", await ev(k => {
  const decoy = __t.PICKUPS.find(p => p.area === "public" && p.id !== __t.cmTrail.keyAt); __t.cmSearch(decoy); const none = !__t.inv().some(e => e.ref.id === "breakKey");
  eval(k); return none && __t.inv().some(e => e.ref.id === "breakKey"); }, keySpot));
await page.waitForTimeout(2500); await page.reload({ timeout: 300000 }); await ready(); await page.click("#mmFiles .acts .go"); await page.waitForTimeout(1000);
const trailOf = () => ev(() => [__t.cm.seed, __t.COMBOS.locker.code, __t.COMBOS.hatch.code, __t.cmTrail.pin, __t.cmTrail.keyAt, __t.cmTrail.noteAt, __t.cmTrail.pinAt]);
check("...the key survives the reload, and so does this save's trail (codes and hiding spots)", await ev(() => __t.CUSTOMER && __t.inv().some(e => e.ref.id === "breakKey") && __t.cm.found.has(__t.cmTrail.keyAt)));
const trail = await trailOf(); await page.waitForTimeout(2500); await page.reload({ timeout: 300000 }); await ready(); await page.click("#mmFiles .acts .go"); await page.waitForTimeout(1000);
check("...(the same trail after another reload)", JSON.stringify(trail) === JSON.stringify(await trailOf()));
await ev(() => { __t.shift.h = 13; for (let i = 0; i < 30; i++) __t.empTick(0.1); });   // (after a reload nobody's in yet: midday, and the crew on the clock come in)
check("the trail: half the locker code in a note, the rest on Ray's time card -> his badge -> his PIN, behind the counter -> logged in -> NO SALE: the janitor's key -> the printout -> the hatch", await ev(() => {
  __t.cmSearch(__t.PICKUPS.find(p => p.id === __t.cmTrail.noteAt)); __t.cmSearch(__t.PICKUPS.find(p => p.id === "timecard"));
  const L = __t.COMBOS.locker.code, halves = __t.ITEMS.comboNote.note.includes(`${L[0]} - ${L[1]} - ?`) && document.getElementById("toast").innerText.endsWith(L[2]);
  __t.cm.comboOf = __t.COMBOS.locker; L.split("").forEach(__t.cmComboKey); __t.cm.comboOf = null; __t.cmTakeFrom(__t.COMBOS.locker);
  const badge = __t.inv().some(e => e.ref.id === "badge");
  Object.assign(__t.player, { x: -5, z: 5 }); __t.cmPickUp(__t.PICKUPS.find(p => p.id === __t.cmTrail.pinAt)); const fromFront = __t.inv().some(e => e.ref.id === "pinNote");
  Object.assign(__t.player, { x: -5, z: 2.8 }); __t.cmPickUp(__t.PICKUPS.find(p => p.id === __t.cmTrail.pinAt));
  __t.cmTermOpen(); for (const d of __t.cmTrail.pin) __t.cmTermKey({ code: "Digit" + d });
  for (const code of ["Digit4", "KeyK", "KeyB", "Digit1", "KeyP", "KeyE"]) __t.cmTermKey({ code });
  __t.cmSpentTick(); const keyed = __t.inv().some(e => e.ref.id === "closetKey"), printed = __t.inv().some(e => e.ref.id === "printout"), pinTossed = !__t.inv().some(e => e.ref.id === "pinNote");
  __t.cm.comboOf = __t.COMBOS.hatch; __t.COMBOS.hatch.code.split("").forEach(__t.cmComboKey); __t.cm.comboOf = null;
  return halves && badge && !fromFront && __t.cm.loggedIn && pinTossed && keyed && printed && __t.cm.hatch && !__t.cm.term; }));
check("three wrong PINs: the register's locked for the day", await ev(() => {
  __t.cm.loggedIn = false; __t.cmTermOpen(); for (let i = 0; i < 3; i++) for (const d of "0000") __t.cmTermKey({ code: "Digit" + d });
  __t.cmTermOpen(); const locked = __t.cm.termLock === __t.shift.day && !__t.cm.term; __t.cm.loggedIn = true; __t.cm.termLock = 0; return locked; }));
check("full pockets never lose anything: the badge waits in the open locker; used-up notes toss themselves", await ev(() => {
  for (const id of ["badge", "combo:locker", __t.cmTrail.noteAt]) __t.cm.found.delete(id);
  for (const e of [...__t.inv()]) if (e.kind === "item" && ["badge", "comboNote", "printout"].includes(e.ref.id)) __t.invRemove(e);
  while (__t.inv().length < __t.INV_MAX) { const t = __t.catalog.find(t => !t.offShelf && t.pos && !t.libLocked); __t.invMakeRoom(); __t.pickup(t); __t.invSync(); }
  __t.cm.comboOf = __t.COMBOS.locker; __t.COMBOS.locker.code.split("").forEach(__t.cmComboKey); __t.cm.comboOf = null; __t.cmTakeFrom(__t.COMBOS.locker);
  const waited = !__t.cm.found.has("badge");
  for (const e of __t.inv().filter(e => e.kind === "tape").slice(0, 2)) { __t.invRemove(e); __t.returnBin.push(e.ref); }
  __t.cmTakeFrom(__t.COMBOS.locker); const took = __t.inv().some(e => e.ref.id === "badge");
  __t.cmSearch(__t.PICKUPS.find(p => p.id === __t.cmTrail.noteAt)); __t.cmSpentTick();
  return waited && took && !__t.inv().some(e => e.ref.id === "comboNote"); }));
check("the movies: tonight's feature picked in the morning, a ticket at the register (once)", await ev(() => {
  __t.shift.h = 15; const w = __t.cm.wallet, n = __t.show.sold; __t.cmTicket(__t.staff[0]); __t.cmTicket(__t.staff[0]);
  return !!__t.show.title && __t.show.day === __t.shift.day && __t.show.sold === n + 1 && __t.cm.ticket === __t.shift.day && Math.abs(w - __t.cm.wallet - __t.SHOW.ticket * (__t.cm.trust >= 60 ? 0.9 : 1)) < 0.01; }));
check("ask what's good: their pick, rented, is remembered; and the first rental gets you a card", await ev(() => {
  __t.cmRecommend(__t.staff[0]); const c = __t.onShelfCopy(__t.cm.rec.title); __t.pickup(c); __t.invSync(); __t.cmPay(__t.staff[0]);
  return __t.cm.rec.done && __t.cm.card && __t.inv().some(e => e.ref.id === "card"); }));
check("whoever catches you keeps an eye on you the rest of the day", await ev(() => { __t.cm.today = 0; __t.cmCaught("staff", __t.staff[0]); return __t.cm.wary.has(__t.staff[0].id); }));
check("a regular gets 10% off; getting caught costs you that", await ev(() => {
  __t.cm.trust = 70; const t = __t.catalog.find(t => !t.offShelf && t.pos && !t.libLocked); __t.pickup(t); __t.invSync();
  const full = __t.posTerm.rentPrice(t), w = __t.cm.wallet; __t.cmPay(__t.staff[0]); const paid = +(w - __t.cm.wallet).toFixed(2);
  const before = __t.cm.trust; __t.cmCaught("staff", __t.staff[0]); return Math.abs(paid - full * 0.9) < 0.01 && __t.cm.trust < before; }));
// customers and days (customer mode)
check("a list for the day: three things to do, up in the corner; done, they're checked off (and the staff like you better)", await ev(() => {
  for (const e of [...__t.inv()]) if (e.kind === "tape") __t.invRemove(e);
  delete __t.cm.day.goals; __t.cmDayCheck(); const rolled = __t.cm.day.goals.length === 3 && __t.cmDayHud().every(l => __t.cmHud()[2].includes(l));
  const t = __t.catalog.find(t => !t.offShelf && t.pos && !t.libLocked);
  __t.cm.day.goals = [{ id: "cat", cat: t.category }, { id: "money" }, { id: "clean" }]; __t.cm.day.caught = 0; __t.cm.day.in = true; __t.cm.trust = 10;
  Object.assign(__t.player, { x: 0.9, z: 6 }); __t.pickup(t); __t.invSync(); __t.cmPay(__t.staff[0]); __t.cm.day.found += 1; __t.cmDayCheck();
  const [cat, money, clean] = __t.cm.day.goals;
  return rolled && cat.done && money.done && !clean.done && !clean.miss && __t.cm.trust >= 10 + 6 + 4; }));
check("...the slip: the list (staying clean checked off at close) and your record, counted once a day", await ev(() => {
  const r = __t.cm.dayRecord, days = r.days; __t.cmSlip(); const txt = document.getElementById("shiftSlip").textContent;
  __t.cmDayEnd(); __t.shift.report = false; document.getElementById("shiftReport").style.display = "none";
  return __t.cm.day.goals[2].done && txt.includes("TODAY'S LIST") && txt.includes("YOUR RECORD") && txt.includes("BEST DAY") && r.days === days + 1 && r.perfect >= 1 && r.best?.day === __t.shift.day && JSON.parse(JSON.stringify(__t.cm.dayRecord)).days === r.days; }));
check("a shopper asks you what's good: a tape in their section, handed over, goes up to the counter with them", await ev(() => {
  __t.cm.inside = true; Object.assign(__t.player, { x: 0.9, z: 6 });
  const t = __t.catalog.find(t => !t.offShelf && t.pos && !t.libLocked);
  __t.custSpawn(); const k = __t.custs.at(-1); k.c.group.position.set(0.9, 0, 7.5); k.path = []; k.state = "browse"; k.thief = false; k.holding = 0; k.tapes = [];
  k.who.persona.taste = { name: "test", cats: [t.category] }; k.who.persona.maxTapes = 2;
  __t.cmCustAsk(k); const asked = k.state === "cmAsk" && __t.cmCust.ask?.k === k;
  __t.invStash?.(); __t.cmCustE(k); const waited = k.state === "cmAsk";
  const helped = __t.cm.day.helped || 0, rnd = Math.random; Math.random = () => 0;
  try { __t.pickup(t); __t.invSync(); __t.cmCustE(k); } finally { Math.random = rnd; }
  const ok = asked && waited && k.tapes.includes(t) && !__t.inv().some(e => e.ref === t) && __t.cm.day.helped === helped + 1 && !__t.cmCust.ask && k.state !== "cmAsk";
  if (k.c) __t.custGone(k); return ok; }));
check("a shoplifter in plain sight: point them out to the staff and the tape comes back", await ev(() => {
  __t.cm.inside = true; Object.assign(__t.player, { x: 0.9, z: 6 }); __t.player.onRoof = false;
  const t = __t.catalog.find(t => !t.offShelf && t.pos && !t.libLocked); __t.setOnShelf(t, false);
  __t.custSpawn(); const k = __t.custs.at(-1); k.c.group.position.set(0.9, 0, 7); k.path = []; k.state = "browse"; k.tapes = [t]; k.holding = 1; k.thief = true; __t.custSneak(k);
  __t.cmCust.thief = null; __t.cmCustThiefTick(); const spotted = __t.cmCust.thief === k;
  const trust = __t.cm.trust; __t.cmCustTell(__t.staff[0]);
  const ok = spotted && __t.returnBin.includes(t) && !k.sneaking && !k.tapes.length && __t.cm.trust > trust && !__t.cmCust.thief;
  if (k.c) __t.custGone(k); return ok; }));
// rentals (customer mode)
const rentOne = `const t = __t.catalog.find(t => !t.offShelf && t.pos && !t.libLocked && t.seasons[0].episodes.length === 1); __t.pickup(t); __t.showTape(t); __t.invSync(); __t.cm.wallet = 200; __t.cmPay(__t.staff[0]);`;
await ev(() => { for (const e of [...__t.inv()]) if (e.kind === "tape") __t.invRemove(e); __t.cm.rented.clear(); __t.shift.h = 15; __t.shift.day = Math.max(__t.shift.day, 5);   // (far enough in for a tape to be days late)
  Object.assign(__t.player, { x: __t.CM_RENT.drop.x, z: __t.CM_RENT.drop.z - 1.1, yaw: Math.PI, pitch: -0.35 }); });
if (await ev(() => !!document.pointerLockElement)) check("a night drop out front, on the walk by the doors: there to aim at", await page.waitForFunction(() => __t.cmRentAiming(), null, { timeout: 20000 }).then(() => true, () => false));
check("taken home, watched overnight: wound to its end, on the morning's greeting and the day's slip", await ev(r => {
  eval(r); __t.cmMorning(); const c = __t.inv().find(e => e.kind === "tape").ref;
  __t.cmSlip(); const slip = document.getElementById("shiftSlip").textContent; __t.shift.report = false; document.getElementById("shiftReport").style.display = "none";
  return __t.windFrac(c) > 0.97 && __t.cm.day.watched.includes(c.title) && /Last night/.test(__t.shift.greet) && slip.includes("WATCHED LAST NIGHT"); }, rentOne));
check("...down the night drop it's returned; not rewound, it's a rewind fee", await ev(() => {
  const c = __t.inv().find(e => e.kind === "tape" && __t.cm.rented.has(e.ref)).ref; __t.showTape(c); __t.invSync();
  __t.cm.owed = 0; __t.shift.h = 15; __t.cmRentDrop(); __t.invSync();
  return !__t.cm.rented.has(c) && __t.returnBin.includes(c) && Math.abs(__t.cm.owed - __t.CM_RENT.rewind) < 1e-9 && __t.cm.rent.rw === 1 && !__t.inv().some(e => e.ref === c); }));
check("...rewound and a day late, dropped before they open: no fees (it counts as yesterday)", await ev(r => {
  eval(r); const c = __t.held(); __t.setWindFrac(c, 0); __t.cm.rented.set(c, __t.shift.day - 1); __t.shift.h = 9.8; const o = __t.cm.owed; __t.cmRentDrop(); __t.shift.h = 15;
  return !__t.cm.rented.has(c) && __t.cm.owed === o; }, rentOne));
check("overdue: the store calls the house, and the clerk brings up the rewind fee as you pay it", await ev(r => {
  eval(r); __t.cm.rented.set(__t.held(), __t.shift.day - 2); __t.cmMorning(); return /machine/.test(__t.shift.greet); }, rentOne)
  && await ev(() => { __t.cm.owed = __t.CM_RENT.rewind; __t.cm.rent.rw = 1; __t.cm.wallet = 50; __t.cmPay(__t.staff[0]); return __t.cm.owed === 0 && __t.cm.rent.rw === 0; })
  && await page.waitForFunction(() => /for rewinding/.test(document.getElementById("toast").textContent) && /still out/.test(document.getElementById("toast").textContent), null, { timeout: 15000 }).then(() => true, () => false));
// the staff (customer mode)
const said = () => ev(() => document.getElementById("toast").textContent);
check("the staff get to know you a day at a time: once a day each, your name by the second day, then a word about their day", await ev(() => {
  __t.cm.wary.clear(); __t.cm.alert = 0; __t.cm.crew = {}; const e = __t.staff[1], day = __t.shift.day, me = __t.cmStaffYou();
  __t.cmStaffTalk(e); __t.cmStaffTalk(e); const once = __t.cmStaffOf(e).k === 1;
  __t.shift.day = day + 1; __t.cmStaffTalk(e); const named = __t.cmStaffOf(e).k === 2 && document.getElementById("toast").textContent.includes(me);
  __t.cmStaffTalk(e); const pick = __t.cm.rec.day === __t.shift.day; __t.cmStaffTalk(e); const chat = document.getElementById("toast").textContent.startsWith(`${e.first}: "`);
  __t.shift.day = day; return once && named && pick && chat && __t.cmStaffTip(e) === "knows your name"; }));
await ev(() => { __t.shift.h = 15; for (let i = 0; i < 30; i++) __t.empTick(0.1); });   // (the overdue check above left it at the morning, with one on the clock and the clock not running: mid-afternoon, and the crew come in)
await page.waitForFunction(() => __t.staff.filter(e => e.c && !e.leaving).length >= 2, null, { timeout: 60000 }).catch(() => {});
check("a favor for one you're friendly with: a message passed on to the other, and a tip about the trail for it", await ev(() => {
  const day = __t.shift.day, [a] = __t.staff.filter(e => e.c && !e.leaving); __t.shift.day = day | 1;
  Object.assign(__t.cmStaffOf(a), { k: 3, named: true, day: __t.shift.day }); __t.cm.rec.day = __t.shift.day; __t.cm.fav = null; __t.cm.favDay = 0;
  __t.cmStaffTalk(a); const f = __t.cm.fav, b = __t.staff.find(x => x.id === f?.to); if (!b) { __t.shift.day = day; return false; }
  const tipB = __t.cmStaffTip(b); __t.cmStaffTalk(b); const tipA = __t.cmStaffTip(a), k = __t.cmStaffOf(a).k; __t.cmStaffTalk(a);
  const ok = f.kind === "msg" && tipB.includes("message") && f.done && tipA === "E — tell them it's done" && f.paid && __t.cmStaffOf(a).k === k + 1 && document.getElementById("toast").textContent.includes("I owe you one");
  __t.shift.day = day; return ok; }));
check("...or a misshelved tape put back (any one will do)", await ev(() => {
  const day = __t.shift.day, [a] = __t.staff.filter(e => e.c && !e.leaving); __t.shift.day = day + (day % 2 ? 1 : 0);
  __t.cm.rec.day = __t.shift.day; __t.cm.fav = null; __t.cm.favDay = 0; __t.cmStaffTalk(a); const f = __t.cm.fav, st = __t.strays[0];
  if (st) __t.cmHelped(st.copy); __t.cmStaffTalk(a); __t.shift.day = day; return f?.kind === "shelf" && f.done && f.paid; }));
check("gossip: who caught you tells the other one (who's wary now too), overheard close by; a good word warms the other one up", await ev(() => {
  const [a, b] = __t.staff.filter(e => e.c && !e.leaving), p = a.c.group.position, at = { x: __t.player.x, z: __t.player.z }, chat = t => { a.chatWith = b; b.chatWith = a; a.chatAt = b.chatAt = t; };
  __t.cm.wary.clear(); __t.cm.wary.add(a.id); __t.cm.day.caught = 1; __t.cm.inside = true; Object.assign(__t.player, { x: p.x + 1, z: p.z });
  chat(-1001); __t.cmStaffTick(0.01); const heard = document.getElementById("toast").textContent.startsWith(`Overheard, ${a.first} to ${b.first}`), spread = __t.cm.wary.has(b.id);
  __t.cm.wary.clear(); __t.cm.day.caught = 0; __t.cm.fav = { kind: "shelf", by: a.id, byName: a.first, done: true, paid: true, day: __t.shift.day };
  const k = __t.cmStaffOf(b).k; chat(-1002); __t.cmStaffTick(0.01); const warmer = __t.cmStaffOf(b).k === k + 1;
  Object.assign(__t.player, { x: 30, z: 30 }); chat(-1003); __t.cmStaffTick(0.01); const far = !a.gossip?.heard;
  a.chatWith = b.chatWith = null; Object.assign(__t.player, at); return heard && spread && warmer && far; }));
check("a regular they know well can ask for an application; the answer's there the next morning", await ev(() => {
  const [a] = __t.staff.filter(e => e.c && !e.leaving); __t.cm.found.delete("badge"); __t.cm.trust = 70; __t.cm.wary.clear(); __t.cm.app = null; __t.cm.short = 0;
  Object.assign(__t.cmStaffOf(a), { k: 4, named: true }); __t.cm.rec.day = __t.shift.day; __t.cmStaffTalk(a); const applied = !!__t.cm.app && !__t.cm.app.ans;
  __t.shift.day++; __t.cmStaffMorning(); const yes = __t.cm.app.ans === "yes"; __t.cmStaffTalk(a);
  return applied && yes && __t.cm.app.told && __t.cmStaffTip(a) === "E — take the job"; }));
await page.waitForTimeout(2500); await page.reload({ timeout: 300000 }); await ready(); await page.click("#mmFiles .acts .go"); await page.waitForTimeout(1000);
check("...it all survives a reload (how well they know you, the offer)", await ev(() => __t.CUSTOMER && __t.cm.app?.ans === "yes" && __t.staff.some(e => __t.cmStaffOf(e).k >= 4)));
await ev(() => { setTimeout(() => __t.cmStaffJoin(), 0); }); await page.waitForTimeout(1000); await page.waitForLoadState(); await ready();
check("take the job: on staff in the same store (and still, a reload later)", await ev(() => !__t.CUSTOMER && __t.staff.length >= 3));
await page.waitForTimeout(2500); await page.reload({ timeout: 300000 }); await ready(); await page.click("#mmFiles .acts .go"); await page.waitForTimeout(1000);
check("...(still on staff after another reload)", await ev(() => !__t.CUSTOMER && JSON.parse(localStorage.getItem("jellybuster-save")).role === "staff"));

console.log("\nsimulation: fired");
await freshStore("simulation");
await ev(() => { __t.setRedNights(2); __t.posTerm.sale(-__t.posTerm.budget() - 50); __t.shift.h = 24.1; for (const k of [...__t.custs]) __t.custGone(k); __t.clockOut(); });
check("three nights in the red: fired on the slip", await ev(() => document.getElementById("shiftSlip").textContent.includes("FIRED")));
await page.click("#shiftNext"); await page.waitForTimeout(1000); await page.waitForLoadState(); await ready();
check("...and the next morning you're a customer of the same store, out on the lot", await ev(() => __t.CUSTOMER && __t.player.z < 0 && __t.staff.length >= 3));

console.log(`\nerrors on the page: ${errors.length}`); errors.slice(0, 3).forEach(e => console.log("   " + e));
check("no page errors overall", errors.length === 0);
await browser.close();
console.log(failed ? `\n${failed} FAILED` : "\nall passed");
process.exit(failed ? 1 : 0);
