// ---- people at the park across the road (exterior/playground.js), dawn to dark: a grown-up, often with a kid or two. They come by car (parked
// in the lot as near the crosswalk as there's room), on the bus (up the path from the stop, along the store's walk) or on foot along the
// far walk; over the crosswalk (waiting at the curb for a gap; once they're on it, the cars stop for them) and in at the gate. In the park
// the grown-up sits on a bench or at the picnic table, or stands and watches; the kids run from thing to thing and get on the swings
// (an empty seat: they pump it along themselves). Then they all go back the way they came. They're walkers (store/shoppers.js) on a
// path, like everybody else out front; parkgoerTick runs from the main loop ----
const parkgoers = { groups: [], t: 25 };
const PARK_IN = () => [CROSS.x, CROSS.fenceZ - 1.4];   // just inside the gate
const PARK_SEATS = () => {                         // where a grown-up sits: [x, z, facing (ry), seat height]: the benches (facing into the park), the picnic table (facing it)
  const s = []; for (const [bx, bz] of PLAYGROUND.benches) for (const dx of [-0.4, 0.4]) s.push([bx + dx, bz - 0.02, Math.PI, 0.44]);
  const [tx, tz] = PLAYGROUND.table, ry = 0.35; for (const lz of [-0.69, 0.69]) for (const lx of [-0.5, 0.5]) { const [x, z] = parkWorld(lx, lz, tx, tz, ry); s.push([x, z, lz > 0 ? ry + Math.PI : ry, 0.45]); }
  return s;
};
const PARK_WATCH = [[18.4, -27.2], [22.6, -27.4], [5.2, -26.2], [11.6, -30.4], [-2.2, -29.6], [7.8, -34.6]];   // stood watching: the swings, the merry-go-round, the rocket, the seesaw
// ---- the crosswalk: somebody on it (cars stop), and is there a gap to step out into ----
function crossBusy() {
  const on = (x, z) => Math.abs(x - CROSS.x) < CROSS.w / 2 + 0.3 && z < LOT.roadNear + 0.4 && z > LOT.roadFar - 0.4;
  if (on(player.x, player.z) && !PARK.ride) return true;
  return walkers.some(w => w.crossing || (w.c.group.visible && on(w.c.group.position.x, w.c.group.position.z)));
}
function crossClear() {                            // nothing coming too close to stop for it
  const near = d => (carsOut?.lane?.(d) || []).some(p => { const ahead = (CROSS.x - p.x) * d; return ahead > -3 && ahead < 26; });
  return !near(1) && !near(-1) && !(bus.phase === "approach" && bus.g.position.x < CROSS.x + 3 && bus.g.position.x > CROSS.x - 30);
}
// a leg of the way, then over the road when it's clear (either way), then on: -> a path of legs, run one after another by parkGo
const lotSide = () => [CROSS.x, LOT.curb - 0.25], parkSide = () => [CROSS.x, LOT.roadFar - 0.75];
function parkGo(w, legs, done) {                   // legs: arrays of points, or "cross": wait at the curb for a gap, then over
  if (!legs.length) { w.path = []; w.then = done; return; }
  const [leg, ...rest] = legs;
  if (leg === "cross") {
    const p = w.c.group.position, toPark = p.z > (LOT.roadNear + LOT.roadFar) / 2, to = toPark ? parkSide() : lotSide();
    const go = w => { if (!w.lead?.crossing && !crossClear() && !w.crossing) { w.path = []; w.then = go; return; }   // (a kid goes when their grown-up does)
      w.crossing = true; w.path = [to]; w.then = w => { w.crossing = false; parkGo(w, rest, done); }; };
    w.path = []; w.then = go; return;
  }
  w.path = leg.map(p => [p[0] + (w.dx || 0), p[1] + (w.dz || 0)]); w.then = w => parkGo(w, rest, done);
}
const fromStoreWalk = () => [[CROSS.x, SIDEWALK_Z], lotSide()];   // down from the store's walk, through the lot by the hatched stall
// ---- a group: arriving, then the visit, then home ----
function parkgoerGroup(how) {
  const adult = walkerMake([[0, 0], [0, 0]], null), G = { adult, kids: [], how, car: null, left: 0 };
  adult.c.group.visible = false; adult.path = []; adult.group = G;
  for (let n = Math.random() < 0.65 ? 1 + (Math.random() < 0.35 ? 1 : 0) : 0; n > 0; n--) {
    const o = kidFor({ who: { persona: { speed: 1 } } }).outfit, c = StoreCustomers.build(o); scene.add(c.group); c.setMood("happy"); c.group.visible = false;
    const k = { c, path: [], speed: 1.4 + Math.random() * 0.3, then: null, box: false, kid: true, lead: adult, group: G, dx: (G.kids.length ? 0.55 : -0.55), dz: 0.4 }; walkers.push(k); G.kids.push(k);
  }
  parkgoers.groups.push(G); return G;
}
const parkAll = G => [G.adult, ...G.kids];
function parkArrive(G, start, legs) {              // out of the car or off the bus at start, and over to the park
  for (const w of parkAll(G)) { w.c.group.visible = true; w.c.group.position.set(start[0] + (w.dx || 0), 0, start[1] + (w.dz || 0)); w.c.group.rotation.y = 0; }
  for (const w of parkAll(G)) parkGo(w, [...legs, "cross", [PARK_IN()]], w => parkVisit(w));
}
function parkgoerCome() {                          // somebody headed for the park: in the car, on the bus, or walking along the far walk
  const r = Math.random();
  if (r < 0.5) {
    const G = parkgoerGroup("car"), car = driveIn(carNew(), car => {
      const d = car.door; parkArrive(G, [d.x, d.z], [[[d.x, -5.0], [CROSS.x, -5.0], lotSide()]]);
    }, CROSS.x);
    if (car) { G.car = car; return; }
    parkgoerGone(G); return;
  }
  if (r < 0.7 && busComing(1)) { const G = parkgoerGroup("bus"); busRide(() => { parkArrive(G, BUS.door, [BUS_UP().slice(0, 4), fromStoreWalk()]); return true; }); return; }
  const G = parkgoerGroup("foot"), from = (Math.random() < 0.5 ? -1 : 1) * 40; G.from = from;
  parkArrive(G, [from, LOT.roadFar - 0.75], [[parkSide()]]);   // (along the far walk: already on the park's side, no crossing)
  for (const w of parkAll(G)) parkGo(w, [[parkSide(), PARK_IN()]], w => parkVisit(w));
}
// ---- in the park: a few things each, then back to the gate and home together ----
function parkVisit(w) {
  if (w.stops == null) w.stops = w.kid ? 3 + Math.floor(Math.random() * 3) : 2 + Math.floor(Math.random() * 2);
  if (w.stops-- <= 0 || (w.kid && w.lead.leaving)) return parkGather(w);
  if (w.kid) {                                    // a swing, if one's free; otherwise off to look at something
    const i = SWING.seats.findIndex((S, i) => !S.npc && !(PARK.ride?.kind === "swing" && PARK.ride.i === i) && together.peer?.swing?.i !== i);
    if (i >= 0 && Math.random() < 0.6) { const S = SWING.seats[i], [x, z] = parkWorld(S.lx, 0.9, SWING.x, SWING.z, SWING.ry); S.npc = w;
      w.path = [[x, z]]; w.then = w => { w.swing = i; w.swingT = 12 + Math.random() * 20; w.c.setPose("sit", { hipY: 0.5, tuck: 0.4 }); }; return; }
    const [x, z] = PARK_WATCH[Math.floor(Math.random() * PARK_WATCH.length)];
    w.path = [[x + (Math.random() - 0.5) * 1.5, z + (Math.random() - 0.5) * 1.5]]; w.then = w => { w.dwell = 3 + Math.random() * 6; }; return;
  }
  const taken = new Set(walkers.map(o => o.seat).filter(Boolean)), seats = PARK_SEATS().filter(s => !taken.has(s.join())), sit = seats.length && Math.random() < 0.6;
  if (sit) { const s = seats[Math.floor(Math.random() * seats.length)]; w.seat = s.join();
    w.path = [[s[0] - Math.sin(s[2]) * 0.5, s[1] - Math.cos(s[2]) * 0.5], [s[0], s[1]]];
    w.then = w => { w.c.group.rotation.y = s[2]; w.c.setPose("sit", { hipY: 0.45 }); w.c.group.position.y = s[3] + 0.03 - 0.45; w.dwell = 15 + Math.random() * 25; }; return; }
  const [x, z] = PARK_WATCH[Math.floor(Math.random() * PARK_WATCH.length)];
  w.path = [[x, z]]; w.then = w => { const kid = w.group.kids[0]; if (kid) w.c.group.rotation.y = Math.atan2(kid.c.group.position.x - x, kid.c.group.position.z - z); w.dwell = 8 + Math.random() * 12; };
}
function parkStand(w) { w.seat = null; w.c.setPose("idle"); w.c.group.position.y = 0; }
function parkGather(w) {                           // at the gate, waiting for the rest of them; then home
  const G = w.group; if (!w.kid) G.leaving = true;
  w.path = [PARK_IN()]; w.then = w => { w.atGate = true; if (parkAll(G).every(o => o.atGate)) parkHome(G); };
}
function parkHome(G) {
  for (const w of parkAll(G)) w.atGate = false;
  const each = (legs, done) => parkAll(G).forEach(w => parkGo(w, legs, done));
  if (G.how === "foot") return each([[parkSide(), [G.from, LOT.roadFar - 0.75]]], w => parkgoerOne(w));
  if (G.how === "bus") return each([[parkSide()], "cross", [[CROSS.x, SIDEWALK_Z], [BUS.walkTo, SIDEWALK_Z], [BUS.path[0] + 0.7, SIDEWALK_Z]]], w => {
    if (busWaitWith(w.c)) return parkgoerOne(w, true);   // (down to the stop to wait: the stop has them now)
    w.path = [[-24, SIDEWALK_Z]]; w.then = w => parkgoerOne(w); });   // (missed the last one: they walk)
  const d = G.car.door; each([[parkSide()], "cross", [lotSide(), [CROSS.x, -5.0], [d.x, -5.0], [d.x, d.z]]], w => parkgoerOne(w));
}
function parkgoerOne(w, handed = false) {          // home: in the car (it goes once they're all in), or off the end of the walk (handed: to the bus stop, body and all)
  const G = w.group; if (handed) walkers.splice(walkers.indexOf(w), 1); else walkerGone(w); G.left++;
  if (G.left >= parkAll(G).length) { if (G.car) driveOut(G.car); parkgoers.groups.splice(parkgoers.groups.indexOf(G), 1); }
}
function parkgoerGone(G) { for (const w of parkAll(G)) if (walkers.includes(w)) walkerGone(w); parkgoers.groups.splice(parkgoers.groups.indexOf(G), 1); }
// ---- every frame (store/main.js): who comes, how long they sit, and the kids on the swings ----
function parkgoerTick(dt) {
  const h = shift.h % 24, day = h > 7 && h < 20 && tod.level > 0.45, wet = WX.k > 0.35 && (WX.kind === "rain" || WX.kind === "snow");
  if (started && (parkgoers.t -= dt) <= 0) {
    parkgoers.t = (wet ? 140 : 45) + Math.random() * (wet ? 160 : 70);
    if (day && parkgoers.groups.length < (wet ? 1 : 3)) parkgoerCome();
  }
  for (const w of [...walkers]) {
    if (!w.group || !walkers.includes(w)) continue;
    if (w.dwell != null) { w.dwell -= dt; if (w.group.leaving && !w.kid) w.dwell = Math.min(w.dwell, 0);
      if (w.dwell <= 0) { w.dwell = null; parkStand(w); parkVisit(w); } }
    if (w.swing != null) {                         // on a swing: pumping it along, gently, and sat on it wherever it is
      const S = SWING.seats[w.swing], P = swingAt(S), hip = 0.06, hipY = 0.5, g = w.c.group;
      g.position.set(P.x + P.ux * hip - P.ux * hipY, P.y + P.uy * hip - P.uy * hipY, P.z + P.uz * hip - P.uz * hipY); g.rotation.y = SWING.ry; g.rotation.x = -S.th;
      if (Math.abs(S.th) < 0.08 && swingAmp(S) < 0.75 && PARK.t - (S.npcPump || 0) > 0.6) { S.w += (Math.sign(S.w) || 1) * 0.35; S.npcPump = PARK.t; }
      w.c.reachTo?.(swingHands(S)[0], 0, { lean: false }); w.c.reachAlso?.(swingHands(S)[1], 1);
      if ((w.swingT -= dt) <= 0 || w.lead.leaving || (PARK.ride?.kind === "swing" && PARK.ride.i === w.swing)) {   // done (or the swing's slowed enough to hop off)
        if (Math.abs(S.w) > 0.6 && !w.lead.leaving) S.w *= 1 - Math.min(1, dt * 1.5);
        else { const [x, z] = parkWorld(S.lx, 0.7, SWING.x, SWING.z, SWING.ry); S.npc = null; w.swing = null; g.rotation.x = 0; g.position.set(x, 0, z); w.c.reachTo?.(null); w.c.reachAlso?.(null); parkStand(w); parkVisit(w); }
      }
    }
  }
}
