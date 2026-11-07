// ---------------- save / restore (localStorage) ----------------
// The store remembers itself between visits: where you're standing, lights
// and lamps, doors / flap / cooler, your inventory (and which slot is in
// hand, bites left, popcorn fill), the returns bin, which copies are out on
// rental, the tape in the VCR and the last episode watched per title. (TV
// picture settings already persist on their own — see applyTv.) Saved every
// couple of seconds and on the way out; a tape that was playing sits in the
// VCR and starts its episode again on your first click into the store (a
// browser won't autoplay sound before that), from where it was wound to.
let resumePlay = null, saveOff = !!DEBUG_LVL || !!GUEST;
const snackUnits = () => [...new Set(aimables.map(o => o.userData.unit || (o.userData.snack ? o : null)).filter(Boolean))];
// a lane: one product's column on a rack or cooler shelf, front to back (and each stack top to bottom). Shoppers
// take from the front and the top; restocking fills from the back and the bottom, so a gap is never stuck behind a pack
let snackLaneMap = null;
function snackLane(u) {                           // -> the lane's units, frontmost (then topmost) first
  if (!snackLaneMap) {
    const by = new Map();
    for (const k of snackUnits()) { const key = `${k.parent.uuid}|${k.userData.snack.name}|${Math.round(k.position.x * 100)}`; (by.get(key) || by.set(key, []).get(key)).push(k); }
    snackLaneMap = new Map();
    for (const lane of by.values()) { lane.sort((a, b) => b.position.z - a.position.z || b.position.y - a.position.y); for (const k of lane) snackLaneMap.set(k, lane); }   // (fixtures face their local +z)
  }
  return snackLaneMap.get(u) || [u];
}
const laneFront = (lane, ok) => lane.find(ok);    // what a shopper would grab
const laneBack = (lane, ok) => lane.findLast(ok); // where restock goes
function saveState() {
  if (saveOff || !started) return;           // nothing worth keeping until you've been in the store
  const units = snackUnits();
  const item = (e, i) => e.kind === "tape" ? { kind: "tape", key: copyKey(e.ref) }
    : e.kind === "snack" ? { kind: "snack", i: units.indexOf(e.ref), left: i === invSel ? snackLeft : e.left, total: i === invSel ? snackTotal : e.total }
    : e.kind === "item" ? { kind: "item", id: e.ref.id } : { kind: "popcorn", pop: e.ref };
  const data = {
    v: SAVE_V, mode: MODE, redNights: redNights || undefined, role: CUSTOMER ? "customer" : MODE === "customer" ? "staff" : undefined, cm: CUSTOMER ? cmSave() : undefined, log: logData.slice(-60), player: { x: onStool ? stoodAt.x : player.onRoof ? ROOF_DOWN.x : player.inBooth ? (SHAFT.x0 + SHAFT.split) / 2 : player.x, z: onStool ? stoodAt.z : player.onRoof ? ROOF_DOWN.z : player.inBooth ? (TALL.z0 + SHAFT.top) / 2 : player.z, yaw: player.yaw, pitch: player.pitch },   // off the stool: its spot is inside a collider
    phone: { next: phone.next }, postits: postits.map(n => ({ m: n.m.num, result: n.result, at: n.at, rz: +n.rz.toFixed(3) })), holds: holds.map(h => ({ member: h.member.num, title: copyKey(h.title), at: h.at, day: h.day, copy: h.copy && copyKey(h.copy), by: h.by, alert: h.alert })),
    staff: staff.map(e => ({ id: e.id, first: e.first, last: e.last, female: e.female, outfit: e.outfit, skills: e.skills, jobs: e.jobs.map(j => ({ id: j.id, pri: j.pri })), sched: e.sched })),
    you: { skills: you.skills }, rep: rep.v, upg, drunk: { gut: +drunk.gut.toFixed(3), blood: +drunk.blood.toFixed(3), hang: drunk.hang, owe: drunk.owe },
    counterItems: Object.fromEntries(counterItemsList().map(it => { const f = cmove.item === it ? cmove.from : null; return [it.id, f ? [f.x, f.z, f.ry] : [+it.g.position.x.toFixed(3), +it.g.position.z.toFixed(3), +it.g.rotation.y.toFixed(3)]]; })), members: SIM ? posTerm.activeNums() : undefined, signups: growth.pending, prospects: growth.prospects, show: show.title && { title: copyKey(show.title), day: show.day, sold: show.sold, status: show.status, spawned: show.spawned },
    office: officeSave(), lights: zoneOn, shift: { day: shift.day, h: shift.h, date0: shift.date0, stats: shift.stats, goals: shift.goals }, gatesArmed: gateAlarm.armed, frontLocked: frontLock.locked, lamps: lamps.map(l => !!l.userData.on), doors: doors.map(d => d.open), flap: flapOpen, cooler: coolerOpen,
    desens: catalog.flatMap(t => [t, ...(t.copies || [])]).filter(c => c.desens).map(copyKey),
    rented: rentedCopies.map(copyKey), rentals: Object.fromEntries(rentedCopies.map(c => [copyKey(c), posTerm.rentalOf(c)])),
    lost: catalog.flatMap(t => [t, ...(t.copies || [])]).filter(c => c.lost).map(copyKey), budget: posTerm.budget(), owed: posTerm.owedAll(), records: posTerm.recordsAll(), messages: posTerm.messagesAll(),
    stock: { back: backstock, deliveries, boxes: boxes.map(b => ({ name: b.name, qty: b.qty })), empty: snackUnits().map((u, i) => !u.visible && !stockCarry.has(u) && !inv.some(e => e.ref === u) ? i : -1).filter(i => i >= 0),
      carry: inv.map((e, i) => stockCarry.has(e.ref) ? i : -1).filter(i => i >= 0),
      air: +coolerThermo.temp.toFixed(1), warm: snackUnits().map((u, i) => isDrink(u.userData.snack) && drinkTemp(u) > 37 ? [i, +drinkTemp(u).toFixed(1)] : null).filter(Boolean) },
    trash: { bins: Object.fromEntries(binList().map(b => [b.id, b.n])),   // bags in anyone's hands are saved where they're standing
      bags: [...bagsDown.map(g => [g.bin.id, g.n, g.x, g.z]), ...bagCarry.map(g => [g.bin.id, g.n, player.x, player.z]),
        ...staff.filter(e => e.trash?.bag && e.c).map(e => [e.trash.bag.bin.id, e.trash.bag.n, e.c.group.position.x, e.c.group.position.z])].map(([id, n, x, z]) => [id, n, +x.toFixed(2), +z.toFixed(2)]) },
    strays: strays.map(s => [copyKey(s.copy), copyKey(s.at)]), messes: messes.map(m => [m.kind, +m.x.toFixed(2), +m.z.toFixed(2), +m.y.toFixed(2)]), deadLights: deadLights.map(d => d.i), returns: returnBin.map(copyKey), rewinders: rewinders.map(rw => rw.tape && copyKey(rw.tape)),
    inv: inv.map(item), invSel, invEmpty,
    playing: playing && { key: copyKey(playing.tape), idx: playing.idx }, payLedger,
    cutout: { x: cutout.x, z: cutout.z, ry: cutout.ry },   // where it was last set down (one still in your arms goes back there)
    stool: { x: stool.x, z: stool.z },                      // likewise
    backLadder: roof.back.down || undefined,       // kicked down off the roof: it stays down
    ladder: ladder.state === "placed" ? { x: ladder.x, z: ladder.z, ry: ladder.ry } : ladder.state === "carried" ? ladder.last : null,   // null: back in the closet
    wound: Object.fromEntries(catalog.flatMap(t => [t, ...(t.copies || [])]).filter(c => !isRewound(c)).map(c => [copyKey(c), c.tapePos])),
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch {}
}
function loadState(S) {
  if (S?.v !== SAVE_V) return;
  try {
    if (S.player) Object.assign(player, S.player);
    if (S.lights) for (const z of LIGHT_ZONES) { if (S.lights[z] === false) setZone(z, false); else if (S.lights[z] && !zoneOn[z]) setZone(z, true); }
    else if (S.lightsOut) for (const z of ["front", "aisles", "lounge"]) setZone(z, false);   // an older save: lights out = the sales floor dark...
    if (S.gatesArmed === false) armGates(false);
    if (S.frontLocked) setFrontLock(true);
    S.lamps?.forEach((on, i) => lamps[i] && setLamp(lamps[i], on));
    S.doors?.forEach((open, i) => { if (doors[i] && open !== doors[i].open) toggleDoor(doors[i]); });
    officeLoad(S.office);
    if (S.flap && !flapOpen) toggleFlap();
    coolerOpen = !!S.cooler;
    if (S.cutout) { Object.assign(cutout, S.cutout); cutoutFit(cutout.x, cutout.z, cutout.ry, cutout.box); cutout.g?.position.set(cutout.x, 0, cutout.z); cutout.g?.rotation.set(0, cutout.ry, 0); }
    if (S.backLadder) backLadderDrop(true);
    if (S.ladder) { colliders.splice(colliders.indexOf(ladder.stowBox), 1); Object.assign(ladder, S.ladder, { state: "placed" }); colliders.push(ladderFit(ladder.x, ladder.z, ladder.ry, ladder.box)); ladderPose(); }
    if (S.stool) { Object.assign(stool, S.stool); stoolFit(stool.x, stool.z, stool.box); stool.g.position.set(stool.x, 0, stool.z); }
    payLedger.push(...(S.payLedger || []));
    for (const [k, pos] of Object.entries(S.wound || {})) { const c = copyByKey(k); if (c) c.tapePos = pos; }
    for (const k of S.desens || []) { const c = copyByKey(k); if (c) c.desens = true; }
    for (const k of S.lost || []) { const c = copyByKey(k); if (c) { c.lost = true; setOnShelf(c, false); } }
    for (const c of (S.returns || []).map(copyByKey).filter(Boolean)) { setOnShelf(c, false); returnBin.push(c); }
    refreshReturnsBin();
    (S.rewinders || [S.rewinder]).forEach((k, i) => {   // (older saves had the one)
      const c = k && copyByKey(k);
      if (c && rewinders[i] && (i === 0 || owned("rewinder2"))) { setOnShelf(c, false); rewinderLoad(rewinders[i], c, "load"); }   // picks up rewinding from wherever it had got to
    });
    const units = snackUnits();
    for (const it of S.inv || []) {          // re-pick each item up in order, exactly as if you'd grabbed it
      const c = it.kind === "tape" && copyByKey(it.key), u = it.kind === "snack" && units[it.i];
      if ((it.kind === "tape" && !c) || (it.kind === "snack" && !u) || (it.kind === "item" && !ITEMS[it.id]) || !invMakeRoom()) continue;
      if (c) { setOnShelf(c, false); showTape(c); }
      else if (it.kind === "item") heldItem = ITEMS[it.id];
      else if (u) { u.visible = false; showSnack(u); snackLeft = it.left; snackTotal = it.total; snackTag(); }
      else { heldPopcorn = it.pop; popcornVisual(); }
      invSync();
    }
    const st = S.stock;
    if (st) {
      Object.assign(backstock, st.back); deliveries.push(...(st.deliveries || []));
      for (const b of st.boxes || []) { boxes.push(b); boxMake(b); } boxesLayout();
      for (const i of st.empty || []) if (units[i]) units[i].visible = false;
      for (const i of st.carry || []) if (inv[i]?.kind === "snack") stockCarry.add(inv[i].ref);   // (re-picked above: still stock)
      if (st.air != null) { coolerThermo.temp = st.air; coolerThermo.tick(0); }
      for (const [i, t] of st.warm || []) if (units[i]) units[i].userData.temp = t;
    }
    if (S.show) { const t = copyByKey(S.show.title); if (t) Object.assign(show, S.show, { title: t }); }
    upgVisuals();
    for (const it of counterItemsList()) { const c = S.counterItems?.[it.id]; if (c) { it.g.position.set(c[0], COUNTER.y, c[1]); it.g.rotation.y = c[2]; counterMoved(it); } }   // where you'd put the counter things
    for (const h of S.holds || []) {             // promised holds (and what's on the shelf for them)
      const m = posTerm.members.find(m => m.num === h.member), t = copyByKey(h.title), c = h.copy && copyByKey(h.copy);
      if (m && t) { if (c) setOnShelf(c, false); holds.push({ member: m, title: t, at: h.at, day: h.day, copy: c || null, by: h.by, alert: h.alert }); }
    }
    holdsRender();
    for (const p of S.postits || []) { const m = posTerm.members.find(m => m.num === p.m); if (m) { const n = { m, result: p.result, at: p.at, rz: p.rz }; postitMesh(n); postits.push(n); } }
    postitsLayout();
    for (const [k, at] of S.strays || []) { const c = copyByKey(k), a = copyByKey(at); if (c && a?.pos) { setOnShelf(c, false); misshelve(c, null, a); } }
    for (const [kind, x, z, y] of S.messes || []) if (MESS[kind]) messAdd(kind, x, z, y);
    for (const i of S.deadLights || []) lightDie(i, 0);
    for (const [id, n, x, z] of S.trash?.bags || []) if (trashBins[id]) bagPlace(trashBins[id], n, x, z);
    if (inv.length) invSelect(S.invSel >= 0 ? S.invSel : S.invEmpty >= 0 ? S.invEmpty : inv.length - 1);
    const pt = S.playing && copyByKey(S.playing.key);
    if (pt) {                                 // back in the VCR, case on the coffee table; rolls on your first click in
      setOnShelf(pt, false);
      playing = { tape: pt, idx: S.playing.idx, eps: pt.seasons[0].episodes };
      showTableBox(pt); resumePlay = playing;
    }
  } catch (err) { console.warn("JellyBuster: couldn't restore the saved store", err); }
}
function resetSave() { saveOff = true; try { localStorage.removeItem(SAVE_KEY); } catch {} location.reload(); }
loadState(SAVE);
if (CUSTOMER) cmLoad(SAVE?.cm);
if (!SAVE?.stock) for (const e of stockProducts()) backstock[e.name] ??= CASE_QTY;   // a new store: a case of everything in the cupboards
if (!SAVE?.shift) beginShift();              // a new store (or one saved before the shift clock): day 1, first thing
if (GUEST) guestSetup();
gateLastZ = player.z;                        // restored position isn't a walk through the gates
counterItemsList();                          // (marks the rewinders, pad and printer as movable)
libLock(); amenities();                     // simulation: what the store hasn't got yet
applySettings();
if (SAVE?.log) { const fresh = logData.splice(0); for (const r of SAVE.log) logAct(r[1], r[2], r[3], r[4], r[0]); for (const r of fresh) logAct(r[1], r[2], r[3], r[4], r[0]); }   // the log picks up where it left off
titleMenu();
setInterval(saveState, 2000);
addEventListener("beforeunload", saveState);
document.addEventListener("visibilitychange", () => { if (document.hidden) saveState(); });

// ---------------- main loop ----------------
const clock = new THREE.Clock();
// ---------------- room culling ----------------
// three.js only culls what's outside the camera's view, not what's behind a
// wall, so from the lobby it still drew the whole store. Every static object
// sits in one room (by its bounding box; anything straddling two stays
// always-on) under that room's group, and a room is drawn only if you're in
// it or can see into it: the hall is open to the store, the store to the
// street, and the lobby and auditorium only while their push doors swing open.
// Lights and anything that moves (you, Dana, customers, the stool, the
// standee) are left alone
const ROOMS = ["out", "store", "hall", "closet", "restroom", "breakroom", "office", "lobby", "theater", "hatch"];   // (hatch: the roof hatch, its shaft and ladder, seen from the closet and from up top)
const HATCH_PEEK = 2.5;                        // on the roof, this close to the hatch you can see down past its shaft into the closet; any further and the shaft's all there is
const hatchParts = new Set(roof.hatchParts);
const roomGroups = Object.fromEntries(ROOMS.map(r => { const g = new THREE.Group(); scene.add(g); return [r, g]; }));
function roomAt(x, z) {
  if (z < 0 || x < WALL_L || x > STORE.x || !inBuilding(x, z)) return "out";   // (round the back too)
  if (z < STORE.z) return "store";
  if (z < BOH.z1) return x < BOH.x0 ? "lobby" : z < BOH.hallZ ? (x > CLOSET.x0 ? "closet" : "hall") : x < BOH.splitX ? "restroom" : z > BOH.officeZ ? "office" : "breakroom";
  return "theater";
}
const roomBox = new THREE.Box3(), roomSeen = new WeakSet(), roomGroupSet = new Set(Object.values(roomGroups));
function roomOf(o) {
  roomBox.setFromObject(o); if (roomBox.isEmpty()) return null;
  const { min, max } = roomBox, e = 0.05;
  const rs = new Set([roomAt(min.x + e, min.z + e), roomAt(max.x - e, min.z + e), roomAt(min.x + e, max.z - e), roomAt(max.x - e, max.z - e)]);
  return rs.size === 1 ? [...rs][0] : null;
}
function roomSort() {                          // file new top-level objects into their rooms (posters load late, so this runs a few times)
  const movers = new Set([   // (a door's left out: it swings between two rooms, and filed in the one it stood open into at load, it vanished from its doorway once shut with that room culled)
    ...officeFx.blinds.map(b => b.g), officeFx.shutter, ...doors.filter(d => !d.stall).map(d => d.pivot), me.group, together.g, stool.g, cutout.g, BOOTH.g, fireExit.leaf, storeExit.leaf, ...staff.map(e => e.c?.group), ...custs.map(k => k.c?.group)]);
  for (const o of [...scene.children]) {
    if (roomSeen.has(o) || roomGroupSet.has(o)) continue;
    roomSeen.add(o);
    if (movers.has(o)) continue;
    if (hatchParts.has(o)) { roomGroups.hatch.add(o); continue; }
    if (o.isLight || o.isCamera) continue;       // (a light inside a fixture is fine: lightsTick goes by the light, hidden or not)
    const r = roomOf(o); if (r) roomGroups[r].add(o);   // the room groups sit at the origin: world transforms don't change
  }
}
const roomFrustum = new THREE.Frustum(), roomProj = new THREE.Matrix4(), roomPort = new THREE.Vector3(), roomGate = new THREE.Box3(), roomGateA = new THREE.Vector3(), roomGateB = new THREE.Vector3();
const roomSortAt = [0.5, 2, 5, 10, 20];       // seconds in
let hallDoor, cinemaDoor, stairDoor, restDoor, restFDoor, breakDoor, closetDoor;
function regionTick() {
  if (roomSortAt.length && clockT >= roomSortAt[0]) { roomSortAt.shift(); roomSort(); }
  hallDoor ??= doors.find(d => d.push && !d.alongX); cinemaDoor ??= doors.find(d => d.push && d.alongX);
  const open = d => !d || Math.abs(d.a) > 0.01;
  camera.updateMatrixWorld(); roomFrustum.setFromProjectionMatrix(roomProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  const { x: camX, z: camZ } = camera.position;
  // the store's two ways out, only when they're on screen: the storefront, and the opening to the hall
  const behindFront = camZ > 0.6 && roomAt(camX, camZ) === "out";   // (out past the side or back walls, or in Tony's: solid walls between you and it)
  const front = !behindFront && roomFrustum.intersectsBox(roomGate.set(roomGateA.set(WALL_L, 0, -0.5), roomGateB.set(STORE.x, 4, 0.5)));
  const hallWay = roomFrustum.intersectsBox(roomGate.set(roomGateA.set(BOH_DOORS.store - BOH_OPENING_W / 2, 0, STORE.z - 0.4), roomGateB.set(BOH_DOORS.store + BOH_OPENING_W / 2, BOH.h, STORE.z + 0.4)));
  let nearPort = false;                          // the hall door's porthole is a window, shut or not: it counts as open while it's on screen down the hall, or lined up through the opening from the store
  if (hallDoor && Math.hypot(camX - hallDoor.at, camZ - hallDoor.c) < STORE.x - BOH.x0 + 1 && roomFrustum.containsPoint(roomPort.set(hallDoor.at, PORT.y, hallDoor.c))) {
    if (camZ >= STORE.z) nearPort = true;
    else { const atOpening = camX + (hallDoor.at - camX) * (STORE.z - camZ) / (hallDoor.c - camZ); nearPort = Math.abs(atOpening - BOH_DOORS.store) < BOH_OPENING_W / 2; }
  }
  restDoor ??= doors.find(d => d.alongX && Math.abs(d.c - BOH_DOORS.restroom) < 0.01); restFDoor ??= doors.find(d => d.alongX && Math.abs(d.c - BOH_DOORS.restroomF) < 0.01); breakDoor ??= doors.find(d => d.alongX && Math.abs(d.c - BOH_DOORS.breakroom) < 0.01); closetDoor ??= doors.find(d => !d.alongX && Math.abs(d.at - CLOSET.x0) < 0.01);
  // (the office's window, its blinds shut: they and the panel behind them stand in for the room, so it isn't drawn for nothing. See officeFx.shutter)
  const links = [["store", "out", front], ["store", "hall", hallWay], ["hall", "restroom", open(restDoor) || open(restFDoor)], ["hall", "breakroom", open(breakDoor)], ["hall", "closet", open(closetDoor)], ["breakroom", "office", Math.abs(officeFx.door.a) > 0.01 || officeFx.blinds.some(b => b.k > 0.03)], ["hall", "lobby", open(hallDoor) || nearPort], ["lobby", "theater", open(cinemaDoor) || player.inBooth], ["theater", "out", fireExit.a > 0], ["store", "out", storeExit.a > 0]];   // (the emergency exit, open: out to its stairwell)   // (the booth's window looks out over the house)
  const seen = new Set([player.onRoof ? "out" : roomAt(camera.position.x, camera.position.z)]);   // (on the roof: just the outdoors, and the closet down the hatch)
  roof.g.visible = player.onRoof || !!roof.climb;
  if (!player.onRoof) for (let grew = true; grew;) { grew = false; for (const [a, b, on] of links) if (on && seen.has(a) !== seen.has(b)) { seen.add(a); seen.add(b); grew = true; } }
  else if (Math.hypot(camera.position.x - ROOF_LADDER.x, camera.position.z - ROOF_LADDER.z) < HATCH_PEEK) seen.add("closet");
  if (player.onRoof || seen.has("closet")) seen.add("hatch");
  for (const r of ROOMS) roomGroups[r].visible = seen.has(r);
  // the booth and its stairs (BOOTH.g): from in there, from the auditorium (through its window), or through the stairs' open door
  stairDoor ??= doors.find(d => !d.push && d.alongX && Math.abs(d.c - SHAFT.door) < 0.01);
  const { x: cx, z: cz } = camera.position, inShaft = cx > SHAFT.x0 && cx < BOH.x0 && cz > SHAFT.z0 && cz < BOH.z1;
  BOOTH.g.visible = !player.onRoof && (player.inBooth || inShaft || (seen.has("theater") && cz > BOH.z1) || (seen.has("lobby") && open(stairDoor)));
}
let clockT = 0;
const ambFwd = new THREE.Vector3(), coolerSndAt = new THREE.Vector3();
let coolerWas = false;
const AMB_ZONES = [["front", 0, 3.45, 3.5], ["aisles", -4, 3.45, 13], ["aisles", 5, 3.45, 16], ["lounge", 0, 3.45, 22.5], ["hall", 5.7, 2.6, 29], ["breakroom", 8.1, 2.6, 31.05], ["office", 8.4, 2.6, 33.7],
  ["restroom", 3.9, 2.6, 32.4], ["lobby", -2.5, 3, 31.5], ["theater", -3, 5, 40]].map(([zone, x, y, z]) => ({ zone, x, y, z, level: 0 }));   // a hum over each light zone
let paused = false, pausedTape = false;          // the pause screen's up: nothing moves
function ambTick(dt) {
  if (!window.StoreAmbience) return;             // the store's sound: where you're listening from, which lights are humming
  camera.getWorldDirection(ambFwd);
  AMB_ZONES.forEach(z => z.level = zoneLvl[z.zone] ?? 0);
  StoreAmbience.tick({ dt, cam: { x: camera.position.x, y: camera.position.y, z: camera.position.z, fx: ambFwd.x, fy: ambFwd.y, fz: ambFwd.z }, zones: AMB_ZONES,
    night: 1 - tod.level, rain: WX.kind === "rain" ? WX.k : 0, snow: WX.kind === "snow" ? WX.k : 0, wind: WX.wind, gust: WX.gust, outdoors: !!player.onRoof || camera.position.y > (deckY(camera.position.x, camera.position.z) ?? ROOF.y), talk: ambTalkers(), units: roof.units, active: !paused && started && !shift.report && (document.pointerLockElement === canvas || posTerm.isOpen()) });
}
function ambTalkers() {                         // who's talking right now, for the murmur (positions, at most six; the nearest ones)
  const t = [];
  for (const k of custs) if (k.c && (k.chatting || (k.state === "tagAlong" && k.party) || co?.cust === k)) t.push(k.c.group.position);
  for (const e of staff) if (e.c && (e.chatWith || co?.emp === e)) t.push(e.c.group.position);
  t.sort((a, b) => Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z));
  return { at: t.slice(0, 6).map(p => ({ x: p.x, z: p.z })), crowd: custs.filter(k => k.c && k.c.group.position.z > 0.3).length };
}
let pausedDrawAt = 0, onFeetT = 0;
// ---- loading: nothing's drawn till the store's ready. The covers come in first, unseen (each lands in a shared
// atlas, and an atlas goes to the GPU whole every time one does: drawn as they trickled in, that was a run of slow
// frames). Then every shader's compiled and every texture's sent up, with every
// room shown for it and a couple of customers stood in, and one frame's drawn through the bloom. Then the menu.
// (Before, all that happened in your first seconds in the store) ----
let booted = false;
async function boot() {
  const hint = $("enterHint"), frame = () => new Promise(r => requestAnimationFrame(r));
  const bar = (p, what = "LOADING") => { hint.firstChild.textContent = `${what}… ${Math.round(p * 100)}%`; hint.style.setProperty("--p", `${(p * 100).toFixed(1)}%`); };
  const t0 = performance.now();
  while ((loads.done < loads.n || performance.now() - t0 < 1500) && performance.now() - t0 < 20000) { bar(0.8 * loads.done / Math.max(1, loads.n)); await frame(); }   // (capped: a slow or missing image doesn't keep the doors shut)
  bar(0.8, "WARMING UP"); await frame();
  const showAll = () => { const s = [...Object.values(roomGroups), roof.g].filter(g => !g.visible); s.forEach(g => g.visible = true); scene.updateMatrixWorld(); return () => s.forEach(g => g.visible = false); };   // (regionTick puts it back each frame anyway)
  const stand = [true, false].map((f, i) => { const c = StoreCustomers.build(StoreCustomers.randomOutfit(seeded(7 + i), f)); c.group.position.set(player.x + i - 0.5, 0, player.z - 2); c.tick(0.016, 0); scene.add(c.group); return c; });
  scene.updateMatrixWorld(); lightsTick(1);     // (the fixed set of lights, in place before anything's compiled against them)
  let hide = showAll(); const compiled = renderer.compileAsync(scene, camera); hide();   // (it picks its objects up straight away; the waiting's the GPU's)
  await compiled;
  const texs = new Set(); scene.traverse(o => { if (o.material) for (const m of [o.material].flat()) for (const v of Object.values(m)) if (v?.isTexture) texs.add(v); });
  let i = 0; for (const t of texs) { renderer.initTexture(t); if (++i % 16 === 0) { bar(0.85 + 0.13 * i / texs.size, "WARMING UP"); await frame(); } }
  hide = showAll(); renderWithBloom(); hide();
  for (const c of officeFx.sec.cams) { secFeedRender(c); await frame(); }   // (a first look from each security camera, so the monitors have a picture when you walk in)
  stand.forEach(c => { c.group.removeFromParent(); c.dispose(); });   // (not scene.remove: roomSort may have filed them in a room by now, and they stood there for good)
  booted = true; hint.style.display = "none"; $("mainMenu").hidden = false;
}
boot();
renderer.setAnimationLoop(() => {
  if (paused) {                                 // (the store sounds fade out; the frame just sits there, so it's redrawn 4 times a second, not 60)
    clock.getDelta(); ambTick(0);
    const now = performance.now(); if (now - (pausedDrawAt || 0) > 250) { pausedDrawAt = now; renderWithBloom(); }
    return;
  }
  const dt = Math.min(clock.getDelta(), 0.05);
  if (keys.size) lastActive = performance.now();                          // walking counts as moving
  if (trashFlapT > 0) { trashFlapT = Math.max(0, trashFlapT - dt); trashFlap.rotation.x = trashFlapRest + 1.1 * Math.sin((1 - trashFlapT / 0.5) * Math.PI); }    // push flap swings in (bottom edge into the bin) and back
  if (biteGroup) {                                                          // bite / sip: up to the mouth and back
    biteAnim = Math.max(0, biteAnim - dt);
    const k = Math.sin((1 - biteAnim / 0.4) * Math.PI), drink = biteDrink;
    biteGroup.position.set(handGroup.position.x - 0.22 * k, handGroup.position.y + 0.2 * k, handGroup.position.z + 0.12 * k);
    biteGroup.rotation.set(handGroup.rotation.x + (drink ? 1.0 : 0.35) * k, handGroup.rotation.y, handGroup.rotation.z);
    if (!biteAnim) biteGroup = null;
  }
  document.body.classList.toggle("idle", performance.now() - lastActive > 2500);
  clockT += dt;
  if (!seated && shiftOpen() && (onFeetT += dt) > 60) { onFeetT = 0; gainXp("you", "con", 2); }   // (CON: a minute on your feet, open hours)
  for (const m of marquee) {              // marquee chase around the posters
    if (!m.mesh.parent?.parent?.visible) continue;   // its room's culled (see regionTick)
    m.phases.forEach((ph, j) => {
      const v = 0.5 + 0.5 * Math.sin(clockT * 7 + ph);
      m.mesh.setColorAt(j, bulbTmp.setRGB(0.3 + 0.7 * v, 0.27 + 0.62 * v, 0.03 + 0.09 * v));
    });
    m.mesh.instanceColor.needsUpdate = true;
  }
  exteriorTick(dt); weatherTick(dt); walkerTick(dt); decorTick(dt);
  if (!playing) updateScreensaver(dt);
  if (!playing && !video.paused) video.pause();   // (no tape in, nothing to hear: whatever got the video going after it came out, it stops here)
  if (playing || tvMenu) updateVideoFrame();
  rewinderTick(dt);
  StoreTrees.tick(dt, { date: shiftDate(), h: shift.h, wind: WX.wind || 0, gust: WX.gust || 0, cover: WX.cover, night: 1 - tod.level, grass: WX_GROUND.find(g => g.m === mat.grass) });   // the trees outside: sway, season, leaves
  tvPowerLed.material.color.set(tvLight.base ? 0x3dff6a : 0x551008);   // green while a tape plays, dim red standby
  {                                            // VCR clock: blinking 12:00 (nobody ever set it), PLAY while a tape runs
    const txt = playing ? (media.on ? (media.dir < 0 ? "REW" : "FF") : video.paused ? "PAUSE" : "PLAY") : (Math.floor(clockT * 1.6) % 2 ? "12:00" : "");
    if (txt !== vcrDisplay.shown) {
      const c = vcrDisplay.ctx; vcrDisplay.shown = txt;
      c.fillStyle = "#050807"; c.fillRect(0, 0, 128, 40);
      c.fillStyle = "#6dffb0"; c.font = "bold 28px 'Courier New', monospace"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(txt, 64, 21);
      vcrDisplay.tex.needsUpdate = true;
    }
  }
  if (desensFlash > 0) { desensFlash -= dt; desensLed.material.color.set(desensFlash > 0 ? 0x2bff6a : 0xff3020); }
  if (playing && video.currentTime > 0 && !video.paused)   // the tape winds on
    playing.tape.tapePos = { ep: playing.idx, t: video.currentTime, d: isFinite(video.duration) ? video.duration : undefined };
  if (!playing) {
    screenMesh.material = tvMenu ? videoMat : screensaverMat;
    if (theaterScreenMesh) theaterScreenMesh.material = tvMenu ? videoMat : screensaverMat;
  }                                               // menu over a blank screen when no tape's in
  if (tvMenu) {                                   // what the crosshair (the remote) is pointing at on the menu
    const hit = tvScreenHit();
    tvHover = hit ? tvMenuHit(hit.x, hit.y) : null;
  }   // pauses while a tape's actually in, like a real screensaver would
  lightingTick(dt);
  shiftTick(dt);
  printerTick(dt);
  if (cashDrawer) cashDrawer.position.z += ((4 - 0.35 - 0.01 - drawerOpen * 0.26) - cashDrawer.position.z) * Math.min(1, dt * 12);   // till slides out toward the clerk
  for (const t of switchToggles) t.mesh.rotation.x += ((zoneOn[t.zone] ? -0.32 : 0.32) - t.mesh.rotation.x) * Math.min(1, dt * 25);   // rocker snaps up/down
  // the TV(s) read as real light sources reaching the couch/floor/shelves
  // nearby — not just bloom's screen-only glow, which doesn't light anything
  // kept fairly short: this is what lights the table's near/top faces up
  // close, not what lights the floor — the floor's falloff (and the table's
  // and couch's shadows) is owned by the decals below, which can actually
  // respect where the furniture blocks it; a real point light can't
  {                                        // TV light: ease the zone colors toward the latest sample, scale for lights on/out
    const k = 1 - Math.exp(-dt / 0.08), zc = TVU.uTvZoneC.value;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < 27; i += 3) {
      zc[i] += (tvZoneTarget[i] - zc[i]) * k; zc[i + 1] += (tvZoneTarget[i + 1] - zc[i + 1]) * k; zc[i + 2] += (tvZoneTarget[i + 2] - zc[i + 2]) * k;
      r += zc[i]; g += zc[i + 1]; b += zc[i + 2];
    }
    tvLight.avg.setRGB(r / 9, g / 9, b / 9);
    const tc = TVU.uThZoneC.value;                 // the theater screen's patches, eased the same way
    for (let i = 0; i < tc.length; i++) tc[i] += (thZoneTarget[i] - tc[i]) * k;
    TVU.uThGain.value = tvLight.base;
    const on = tvLight.base * (lightsOut ? 1 : 0.35);    // the fluorescents wash most of it out
    TVU.uTvGain.value = on * TV_GAIN;
    TVU.uTvAmb.value.copy(tvLight.avg).multiplyScalar(on * TV_AMB);
    tvBackGlow.color.copy(tvLight.avg); tvBackGlow.intensity = tvLight.base * (lightsOut ? 0.8 : 0.3);   // a hint of bleed, not a second light
    const crtBase = tvLight.base ? 0.9 : 0;   // ceiling CRTs tint/dim with whatever's actually playing
    crtGlows.forEach(cg => { cg.color.copy(tvLight.avg); cg.intensity = crtBase * (lightsOut ? 1.8 : 1); });
    {                                              // theater sconces: up while nothing's showing, a slow fade out once a film runs
      const want = playing && !video.paused ? 0 : 1, u = TVU.uThSconce;
      u.value += Math.sign(want - u.value) * Math.min(Math.abs(want - u.value), dt / (want ? 2 : 6));   // 2 s up, 6 s down
      if (thSconceMat) thSconceMat.emissiveIntensity = 0.85 * u.value;
    }
    thDeck?.tick(dt);
    if (projBeamMat) {
      beamU.uBeamOn.value = tvLight.base ? 1 : 0;              // playing: the shader tints by picture section
      projBeamMat.color.setHex(tvLight.base ? 0xffffff : 0xd8e8ff);
      const lookBack = Math.max(0, (Math.cos(player.yaw) + 0.05) / 1.05);     // 0 when facing the screen, >0 when turning back
      const lookUp = Math.max(0, (player.pitch - 0.20) / 0.45);               // 0 at normal viewing pitch, >0 when looking up
      const attention = Math.min(1, Math.max(lookBack, lookUp));
      const darkRoom = 0.45 + 0.55 * (1 - (zoneLvl.theater ?? 1));
      const flicker = 0.95 + 0.05 * Math.sin(clockT * 44) * Math.cos(clockT * 19);
      projBeamMat.opacity = (0.004 + 0.09 * attention * attention) * darkRoom * flicker;
    }
    if (tvBake) { const t0 = performance.now(); while (performance.now() - t0 < 6) if (tvBake.next().done) { tvBake = null; break; } }   // startup shadow bake, a slice per frame
  }
  for (const p of lampPools) p.material.opacity = lightsOut ? 1 : 0;   // overhead fluorescents drown the lamps' own floor pools out entirely
  flapPivot.rotation.z += ((flapOpen ? flapOpenA : 0) - flapPivot.rotation.z) * Math.min(1, dt * 6);   // leaf lifts up against the wall
  flapGate.rotation.y += ((flapOpen ? Math.PI / 2 : 0) - flapGate.rotation.y) * Math.min(1, dt * 5);          // gate swings in behind the counter
  coolerDoor.rotation.y += ((coolerOpen ? 1.75 : 0) - coolerDoor.rotation.y) * Math.min(1, dt * 5);        // cooler door swings out ~100°
  coolerThermo.tick(dt); drinkTempTick(dt); phoneLook(performance.now());
  if (window.StoreAmbience && coolerDoor) {        // its door, and the compressor working (pulling the temperature down, or its idle cycle)
    const at = coolerDoor.getWorldPosition(coolerSndAt);
    if (coolerOpen !== coolerWas) { coolerWas = coolerOpen; StoreAmbience.door("cooler", coolerOpen ? "open" : "close", at.x, 1.1, at.z); }
    StoreAmbience.compressor(at.x, 0.3, at.z, coolerThermo.temp > 36.4 || clockT % 150 < 45);
  }
  for (const d of doors) {                   // doors ease open/closed; a locked one rattles briefly when tried
    if (d.push) { pushDoorTick(d, dt); continue; }
    if (d.closer) doorCloserTick(d, dt);
    if (doorStep?.d === d && doorStep.t <= DOOR_DANCE.swing[1]) d.a = doorDanceA(doorStep, d.open ? d.openA : 0);   // (in step with you backing out of its way: see doorStepTick)
    else d.a += ((d.open ? d.openA : 0) - d.a) * Math.min(1, dt * (d.selfShut ? 2.2 : 5));   // (the closer's swing is slower than a hand's)
    if (d.closing && Math.abs(d.a) < 0.04) { d.closing = false; d.selfShut = false; doorSnd(d, "wood", "close"); }
    if (d.open) d.selfShut = false;
    d.rattle = Math.max(0, d.rattle - dt);
    d.pivot.rotation.y = d.base + d.a + (d.rattle ? 0.012 * Math.sin(d.rattle * 70) : 0);
  }
  move(dt); moveTick(); bathTick(dt); breakroomTick(dt); officeTick(dt);
  if (!player.onRoof && inv.some(e => e.kind === "tape" && !e.ref.desens) && Math.abs(player.x) < 2 && (gateLastZ - GATE_Z) * (player.z - GATE_Z) < 0) startGateAlarm();   // carried a tape through the gates
  gateLastZ = player.z;
  if (gateAlarm.on) { gateAlarm.t += dt; gateLed.color.set(Math.floor(gateAlarm.t * 5) % 2 ? 0x2a0000 : 0xff1a1a); }
  stoolTick(dt);
  thSeatTick(dt);
  toolTick(dt);
  ladderTick(dt);
  roofTick(dt); golfTick(dt);
  meTick(dt); bagTick(dt);
  if (roof.climb) camera.position.copy(roof.cam);
  else if (golf.on) camera.position.copy(golf.cam);
  else if (onStool) camera.position.copy(me.rig.head.getWorldPosition(meEye)).add(meEye.set(-Math.sin(stool.angle) * 0.06, 0.03, -Math.cos(stool.angle) * 0.06));   // over the collar, a touch forward of it
  else if (ladder.on) {                          // up the steps: the eye where it always is, 21 cm ahead of your body (toward the ladder)
    const k = ladder.lift, e = k * k * (3 - 2 * k);
    camera.position.set(player.x - Math.sin(ladder.ry) * 0.21, floorHeightAt(player.x, player.z) + 1.65 + LADDER.STEP * e, player.z - Math.cos(ladder.ry) * 0.21);
  }
  else if (seated) camera.position.copy(me.rig.head.getWorldPosition(meEye)).add(meEye.set(Math.sin(seatAt.ry || 0) * 0.06, 0.03, Math.cos(seatAt.ry || 0) * 0.06));   // eyes just above the collar, a touch forward
  else {
    eyeY = fall ? fallEye() : eyeY + (Math.min(keys.has("KeyC") ? 1.06 : 1.65, eyeRoom()) - eyeY) * Math.min(1, dt * 10);   // crouched: just above the squatting body's collar
    camera.position.set(player.x, eyeY - jump.dip + playerFloor(), player.z);
  }
  if (!seated) seatFov = 70;                     // walking resets the couch zoom
  const fovTarget = arcade.on ? 50 : seated ? seatFov : 70;   // (at the arcade machine: in close on its screen)
  if (Math.abs(camera.fov - fovTarget) > 0.01) { // eased so it feels like leaning in/out
    camera.fov += (fovTarget - camera.fov) * Math.min(1, dt * 10);
    camera.updateProjectionMatrix();
  }
  const dk = dizzyTick(dt);
  camera.rotation.y = player.yaw; camera.rotation.x = player.pitch + dk * 0.04 * Math.sin(dizzy.t * 2.1);
  camera.rotation.z = dk * 0.09 * Math.sin(dizzy.t * 1.3) + (fall ? fall.roll * 0.3 * fall.tilt : 0);   // the world tipping side to side; down, your head on one side
  invSync();
  cutoutCarryTick();
  stoolCarryTick();
  togetherTick(dt);
  custTick(dt); frontDoorTick(dt); fireExitTick(dt); fullVidTick(); tonyTick(dt); if (CUSTOMER) cmTick(dt);
  empTick(dt);
  trashTick(dt);
  deadLightTick(dt);
  milestoneTick();
  spillTick();
  pickHover();
  tapeBoxTick(dt);
  nowPlayingTick(); mediaTick();
  if (held) {
    handGroup.visible = !inspecting && !coHand.visible;   // 3D box only for the carried-at-your-side pose; hands full with a sale: your own tape waits
    handGroup.position.set(0.3, -0.28, -0.55); handGroup.rotation.set(0.05, -0.4, 0.06); handGroup.scale.setScalar(1);
  }
  $("inspect").style.display = inspecting ? "flex" : "none";

  const showTvHint = started && !inspecting
    && (seated || onStool || aimTV || aimCouch)
    && document.pointerLockElement === canvas;
  $("tvHint").style.display = showTvHint ? "block" : "none";
  if (showTvHint) $("tvHint").textContent = onStool
    ? "Press E to spin · tap it fast to spin harder · WASD to get up"
    : tvMenu
    ? "Click to choose · wheel adjusts a slider · right-click closes"
    : seated
    ? (seatAt?.toilet ? "Press E to stand up (and pull your pants up)" : seatAt?.roof ? "Press E to stand up" : "Press E to stand up · right-click the screen for picture settings")
    : aimCouch
      ? (aimSeatObj?.toilet ? "Press E to sit on the toilet" : aimSeatObj ? "Press E to take a seat" : "Press E to sit on the couch")
      : held
        ? `Press E to insert “${held.title}” into the TV`
        : (playing ? "Press E to eject the tape · right-click for picture settings" : "Pick up a tape from the shelves to play it here · right-click for picture settings");
  regionTick();
  lightsTick(dt);
  ambTick(dt);
  if (booted) { const handBack = meHandFollow(); secFeedsTick(); renderWithBloom(); handBack?.(); }   // (the store ticks along from the start; it's drawn once boot's ready)
});
window.__t = { fallStart, fallNow: () => fall, fallTick, fallPlan, fallSurface, fallClear: () => { fall = null; me.setBend(); player.airH = 0; }, FALL, lowBlocker, spillTick, officeFx, officeSave, officeLoad, blindsToggle, secPress, together, togetherOpen, arcade, arcadeStart, arcadeStop, mcFire, shift, bulb, tonyLightsTick, siKey, siTick, asTick, LOT, cmSleep, roomAt, lotCars: () => carsOut?.all(), tony, tonyE, TONY_IN, cm, CUSTOMER, invSync, cmTrail, SEARCHES, cmSearch, cmNoSale, invRemove, cmTakeFrom, cmSpentTick, INV_MAX, cmTrailSet, pickupMesh, TV, cmRecommend, onShelfCopy, cmTeeOff, cmHelped, cmMorning, putBack, strays, misshelve, cmTicket, cmShowTick, show, SHOW, cmComboKey, COMBOS, cmTermOpen, cmTermKey, cmSpill, cmSearchBin, cmSlip, cmMoneyDrop, pickupMeshes, redNights: () => redNights, setRedNights: n => { redNights = n; }, cmPay, cmCaught, cmSees, cmStaffOnly, cmPickUp, PICKUPS, KEYED, ITEMS, becomeCustomer, cmNextDay, outBlocked, blocked, carsOut: () => carsOut, golfLost, roof, roofClimb, backLadderE, backLadderDrop, decorDraw, decor, postersSwap, posterFor, WX, wxDrifts, weatherTick, wxPlan, walkers, walkerTick, walkerMake, pizzaRun, npcStyle, custTick: dt => custTick(dt), exteriorTick: dt => exteriorTick(dt), parkLot: (d, b) => parkLot(d, b), passCar: c => passCar(c), driveIn: (l, f) => driveIn(l, f), driveOut: c => driveOut(c), carNew: () => carNew(), sfxOut, shiftDate, season, calendarDraw, corkDraw,
  catalog, pickup, onE, player, playEpisode, eject, boxState, tapeBox, media, mediaDown, mediaUp, togglePause, tvHear, hearRoomAt, fireExit, storeExit, fireExitUse, exitDoorTick, frontDoor, jump, jumpStart, jumpTick, WHEEL, wheelOpen, wheelMouse, wheelClick, WX,
  held: () => held, playing: () => playing, returnBin,
  setAim: v => { aimTV = v; },
  flapOpen: () => flapOpen, toggleFlap, flapOpenA: () => flapOpenA, aimFlap: () => !!aimFlap, pickHover,
  doors, toggleDoor, colliders, cutout, cutoutPickUp, cutoutPutDown, cutoutCarryTick, cutoutSpot: () => cutoutSpot,
  setFrontLock, me, stool, stoolPickUp, stoolPutDown, stoolSit, stoolPush, stoolStand, onStool: () => onStool, sitOn: i => { seatAt = SEATS[i]; seated = true; player.yaw = Math.PI; player.pitch = 0; },
  stopSaving: () => { saveOff = true; }, setZone, zoneOn, bath, seatAt: () => seatAt, seated: () => seated, meBody: () => me, cmove, counterItemsList, moveStart, movePlace, roomSort, scene, DESENS_AT, PRN_AT, player, camera, holdPull, jobBoardMesh: () => jobBoardMesh, aimables, JOBS, board, boardOpen, boardKey, danaBestJob, danaJobNow, phone, holds, phoneAnswer, callAnswer, holdPlace, phoneTick, growth, doors, colliders, show, rep, upg, upgBuy, showSet, coStart, coolerThermo: () => coolerThermo, drinkTempTick, drinkTemp, stockTake, stockPlace, emptySpots, backstock, boxes, boxCarry, boxPick, boxUnpack, stockOrder, strays, misshelve, messes, messAdd, messClean, TOOLS, toolTake, toolReturn, toolTick, scrubStart, scrub: () => scrub, withEmp, empNext, has, custPickMember, toolHeld: () => toolHeld, TROFFERS, deadLights, lightDie, lightFix, ladder, LADDER, ladderPickUp, ladderPutDown, ladderStore, ladderClimb, ladderDown, ladderTick, ladderStep, snackUnits, grabSnack, consumeSnack, invMakeRoom, drunk, drunkFumble, drunkPuke, drunkOut, golf, golfStart, golfEnd, golfMouse, golfStrike, golfTee, inv: () => inv, stockCarry, custAsks, custWant, custAskGo, custHandTape, custAllOut, rushLevel, custMax, catchDecide, catchCall: () => catchCall, navGrid, navPath, shift, clockOut, beginShift, gateAlarm, startGateAlarm, co: () => co, coAct, coOffer, coFees, coStep: () => coStep(), printer, custSneak, custCatch, custs, custLine, empTick, custTick, empToggle, custSpawn, custGo, CUST_COUNTER, setOnShelf, refreshReturnsBin, returnBin, rewinders, posTerm, rentedCopies, custInteract, custGone, snackSpots, custDone,
  staffChatTick, empLunchDue, LUNCH_CHAIRS, snackLane, stockSlotIn, snackSpots, custBringAlong, custTagAlong, custChatTick, kidFor, postits, postitAdd, postitCall, postitPickUp, postitToss, postitPutBack, postitHeld: () => postitHeld, callOutcome, memberHabits, phoneOutTick,
  staff, you, gainXp, lv, xpToNext, SKILLS, onDuty, sendHome, setSched, schedHours, weekday, SHIFT, trashBins, trashAdd, binBag, bagCarry, bagsDown, bagsSetDown, bagPickUp, chuteDrop, chute, trashTick, trashJob, hiring, hireOpen, hirePick, hireCost, sheet, sheetToggle, rollApplicant, STAT_TOTAL,
  cmStaffTalk, cmStaffTick, cmStaffMorning, cmStaffJoin, cmStaffOf, cmStaffYou, cmStaffHint, cmStaffTip, cmStaffMet, CM_KNOW, CM_GOSSIP_R, messes,
  cmRentReturn, cmRentDrop, cmRentMorning, cmRentAtRegister, cmRentSlip, cmRentAiming, CM_RENT, cmRent, windFrac, setWindFrac, isRewound, releaseFromHand, showTape,
  cmDayGoals, cmDayCheck, cmDayEnd, CM_DAY_GOALS, cmCust, cmCustTick, cmCustAsk, cmCustE, cmCustTell, cmCustThiefTick, cmDayHud, cmHud,
};