// ---------------- customers: up to three TV-head shoppers at a time ----------------
// customers.js builds them; this walks each through a visit: in the door,
// browse a shelf, pick a tape, wait at the register getting steadily less
// patient, then leave — rung up (E on them at the counter) or not, in which
// case the tape they walk out with sets the gates off. Paths come from a grid
// A* over the colliders, rebuilt per trip, so doors and the moved standee count.
const NAV = { cell: 0.25, x0: WALL_L, z0: 0, x1: STORE.x, z1: 48.5, pad: 0.3 };
function navGrid(skip, extra = []) {                // extra: temporary obstacles (you, standing in the way)
  const { cell, x0, z0, pad } = NAV, nx = Math.ceil((NAV.x1 - x0) / cell), nz = Math.ceil((NAV.z1 - z0) / cell);
  const g = new Uint8Array(nx * nz), hard = new Uint8Array(nx * nz);   // g: blocked with walking room around things; hard: the things themselves
  const skips = [].concat(skip, doors.filter(d => !d.locked).flatMap(d => [d.shut, d.openBox]));   // path through unlocked doors
  for (const c of colliders.concat(extra)) {
    if (skips.includes(c)) continue;
    const i0 = Math.max(0, Math.ceil((c.x0 - pad - x0) / cell - 0.5)), i1 = Math.min(nx - 1, Math.floor((c.x1 + pad - x0) / cell - 0.5));
    const k0 = Math.max(0, Math.ceil((c.z0 - pad - z0) / cell - 0.5)), k1 = Math.min(nz - 1, Math.floor((c.z1 + pad - z0) / cell - 0.5));
    for (let k = k0; k <= k1; k++) if (i1 >= i0) g.fill(1, k * nx + i0, k * nx + i1 + 1);
    const h0 = Math.max(0, Math.floor((c.x0 - x0) / cell)), h1 = Math.min(nx - 1, Math.floor((c.x1 - x0) / cell));   // every cell it touches: a wall is never skipped over
    const q0 = Math.max(0, Math.floor((c.z0 - z0) / cell)), q1 = Math.min(nz - 1, Math.floor((c.z1 - z0) / cell));
    for (let k = q0; k <= q1; k++) if (h1 >= h0) hard.fill(1, k * nx + h0, k * nx + h1 + 1);
  }
  const at = (x, z) => { const i = Math.floor((x - x0) / cell), k = Math.floor((z - z0) / cell); return i < 0 || k < 0 || i >= nx || k >= nz ? -1 : k * nx + i; };
  const free = (x, z) => { const n = at(x, z); return n >= 0 && !g[n]; };
  return { nx, nz, g, hard, at, free, xy: n => [x0 + (n % nx + 0.5) * cell, z0 + ((n / nx | 0) + 0.5) * cell] };
}
function navPath(grid, ax, az, bx, bz) {         // A* (8-way, binary heap), then string-pulled to straight runs
  const { nx, nz, g, hard, at, free, xy } = grid, near = (x, z) => {   // snap a blocked start/goal to the nearest open cell you could step to:
    const i = Math.min(nx - 1, Math.max(0, Math.floor((x - NAV.x0) / NAV.cell))), k = Math.min(nz - 1, Math.max(0, Math.floor((z - NAV.z0) / NAV.cell)));
    const n0 = k * nx + i; if (!g[n0]) return n0;
    const seen = new Set([n0]), q = [n0];              // flood out from where they stand, never through anything solid (so never out the far side of a wall)
    for (let h = 0; h < q.length && h < 400; h++) {
      const n = q[h], ni = n % nx;
      for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (ni + di < 0 || ni + di >= nx) continue;
        const m = n + dk * nx + di; if (m < 0 || m >= g.length || seen.has(m) || (hard[m] && !hard[n])) continue;   // (already inside something: work out of it, but never into the next thing)
        if (!g[m]) return m;
        seen.add(m); q.push(m);
      }
    }
    return -1;
  };
  const s = near(ax, az), e = near(bx, bz); if (s < 0 || e < 0) return null;
  const cost = new Float64Array(g.length).fill(Infinity), from = new Int32Array(g.length).fill(-1), closed = new Uint8Array(g.length), heap = [[0, s]];
  const h = n => { const dx = Math.abs(n % nx - e % nx), dz = Math.abs((n / nx | 0) - (e / nx | 0)); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
  const push = it => { heap.push(it); for (let i = heap.length - 1; i && heap[i - 1 >> 1][0] > heap[i][0]; i = i - 1 >> 1) [heap[i], heap[i - 1 >> 1]] = [heap[i - 1 >> 1], heap[i]]; };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; for (let i = 0; ;) { let m = i; for (const c of [2 * i + 1, 2 * i + 2]) if (c < heap.length && heap[c][0] < heap[m][0]) m = c; if (m === i) break; [heap[i], heap[m]] = [heap[m], heap[i]]; i = m; } } return top; };
  cost[s] = 0;
  while (heap.length) {
    const [, n] = pop();
    if (closed[n]) continue;
    closed[n] = 1;
    if (n === e) break;
    const i = n % nx;
    for (const [di, dk, w] of [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]]) {
      if (i + di < 0 || i + di >= nx) continue;
      const m = n + dk * nx + di; if (m < 0 || m >= g.length || g[m] || closed[m]) continue;
      if (di && dk && (g[n + di] || g[n + dk * nx])) continue;   // no cutting a corner
      const c = cost[n] + w; if (c + 1e-9 < cost[m]) { cost[m] = c; from[m] = n; push([c + h(m), m]); }
    }
  }
  if (from[e] < 0 && e !== s) return null;
  const cells = []; for (let n = e; n >= 0; n = from[n]) cells.unshift(xy(n));
  const clear = ([ax, az], [bx, bz]) => { const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.1); for (let i = 1; i < n; i++) if (!free(ax + (bx - ax) * i / n, az + (bz - az) * i / n)) return false; return true; };
  const out = [cells[0]];
  for (let i = 1; i < cells.length; i++) if (!clear(out[out.length - 1], cells[i])) out.push(cells[i - 1]);
  out.push([bx, bz]); if (!free(bx, bz)) out[out.length - 1] = cells[cells.length - 1];
  return out;
}
const CUST_DOOR = { x: 0.7, z: 0.9 };
// out front: customers walk up from the lot (from beside a parked car, or along the sidewalk), pull the
// right-hand door open and come in; leaving, they push it open and go back the way they came
const OUTSIDE_IN = [0.9, -0.9], INSIDE_DOOR = [0.75, 0.35];   // just outside the right leaf / just inside it
const outsidePath = () => [[(Math.random() < 0.5 ? -1 : 1) * (14 + Math.random() * 6), -0.9], OUTSIDE_IN];   // [where they start, ..., the door]: up the sidewalk
const carPath = car => [[car.door.x, car.door.z], [car.door.x, -3.2], OUTSIDE_IN];   // from their car's door
// who drives: decided the first time they come in, and kept on their record (m.car: { s: style, c: color }, or false)
function custArriveByCar(cust) {
  const m = cust.member; if (m.car === undefined) m.car = Math.random() < 0.55 ? carNew() : false;
  if (!m.car) return false;
  const car = driveIn(m.car, car => {             // parked: out they all get (the driver's side, then the passengers', the kids' out the back)
    const riders = [...car.riders].filter(k => k.c);
    if (!riders.length) { car.riders.clear(); return driveOut(car); }
    riders.forEach((k, i) => {
      const door = i === 0 ? car.door : { x: car.sx + 1.2, z: car.door.z + (k.kid ? 0.7 : 0) };   // (east: the passenger side)
      const out = k.outside = carPath({ door }); k.c.group.visible = true;
      k.c.group.position.set(out[0][0], 0, out[0][1]); k.path = [...out.slice(1), INSIDE_DOOR, [CUST_DOOR.x, CUST_DOOR.z]]; k.state = "arrive"; k.spot = CUST_DOOR;
    });
  });
  if (!car) return false;                         // the lot's full: they parked down the street (and walk up)
  car.riders = new Set([cust]);
  car.idling = Math.random() < 0.12;              // somebody's waiting in the car with the engine running: they won't be long
  cust.car = car; cust.c.group.visible = false; cust.c.group.position.set(0, 0, -40); cust.state = "drivingIn";
  return true;
}
// arriving with someone: in the same car, or up the sidewalk a step behind them
function custRideWith(cust, lead) {
  if (lead.car && lead.state === "drivingIn") {
    lead.car.riders.add(cust); cust.car = lead.car;
    cust.c.group.visible = false; cust.c.group.position.set(0, 0, -40); cust.state = "drivingIn"; return;
  }
  const lp = lead.c.group.position, side = lp.x > 0 ? 1 : -1;   // (a step further out along the sidewalk than them)
  cust.outside = lead.outside; cust.c.group.position.set(lp.x + side * 0.8, 0, lp.z - 0.35);
  cust.path = [...lead.path.slice(0, -2).map(([x, z]) => [x, z]), INSIDE_DOOR, [CUST_DOOR.x, CUST_DOOR.z]]; cust.state = "arrive"; cust.spot = CUST_DOOR;
}
function frontDoorTick(dt) {                      // anyone right at the door: it swings open (the chime rings); then the closer pulls it shut
  const d = frontDoor, near = custs.some(k => k.c && Math.hypot(k.c.group.position.x - 0.9, k.c.group.position.z + 0.2) < 1.3)
    || (!player.onRoof && Math.hypot(player.x - 0.9, player.z + 0.2) < 1.3 && (!CUSTOMER || cmDoorOpen(player.z > 0)));
  if (near && !d.open) { d.open = true; window.StoreAmbience?.door("push", "open", 0.9, 1.1, 0.1); window.StoreAmbience?.chime(CUST_DOOR.x, 2.3, 0.2, heardFrom(CUST_DOOR.x, 0.2, false)); }
  if (near) d.hold = 0.7; else if (d.open && (d.hold -= dt) <= 0) d.open = false;
  const was = d.k; d.k = Math.max(0, Math.min(1, d.k + (d.open ? 2.2 : -1.3) * dt));
  if (was > 0 && d.k === 0) window.StoreAmbience?.door("push", "settle", 0.9, 1.1, 0.1);
  if (d.leaves[1]) d.leaves[1].rotation.y = -1.35 * (1 - (1 - d.k) ** 2);
}
const CUST_COUNTER = { x: -5.45, z: 4.95, ry: Math.PI };           // across the register from the clerk
// where customers browse: every shelf face in the store, found from the tapes
// themselves (each knows its slot and which way its shelf faces). Tapes are
// grouped into ~1.5 m stretches per facing; each stretch becomes a spot 0.8 m
// out in the aisle, tagged with the sections it holds. Built on first use
let custSpots = null, custSnackSpots = null;
const snackPrice = p => p.kind ? 1.25 : 0.99;       // drinks carry a kind (Soda, Water...), candy doesn't
function snackSpots() {                           // in front of each snack fixture (the cooler, the candy racks), where a shopper can reach it
  if (custSnackSpots) return custSnackSpots;
  const grid = navGrid(custs.map(k => k.box)), spots = new Map(), v = new THREE.Vector3(), n = new THREE.Vector3();
  for (const u of snackUnits()) {
    u.parent.getWorldDirection(n); u.getWorldPosition(v);   // fixtures face their local +z
    const x = v.x + n.x * 0.75, z = v.z + n.z * 0.75;
    if (x < -2.25 && z < 4.5) continue;           // behind the counter is staff only
    const key = `${Math.round(x / 1.5)},${Math.round(z / 1.5)}`;
    let s = spots.get(key); if (!s) spots.set(key, s = { x: 0, z: 0, n: 0, ry: Math.atan2(-n.x, -n.z), units: [], drinks: false });
    s.x += x; s.z += z; s.n++; s.units.push(u); s.drinks ||= !!u.userData.snack.kind;
  }
  return custSnackSpots = [...spots.values()].map(s => Object.assign(s, { x: s.x / s.n, z: s.z / s.n }))
    .filter(s => navPath(grid, CUST_DOOR.x, CUST_DOOR.z, s.x, s.z));
}
function browseSpots() {
  if (custSpots) return custSpots;
  const grid = navGrid(custs.map(k => k.box)), groups = new Map();   // not counting the customers: they're standing in the doorway the flood fill starts from
  for (const t of catalog) for (const c of [t, ...(t.copies || [])]) {
    if (!c.pos || c.libLocked) continue;       // (a section that isn't in yet is just empty shelf)
    const nx = Math.cos(c.ry), nz = -Math.sin(c.ry), sx = c.pos.x + nx * 0.8, sz = c.pos.z + nz * 0.8;   // shelves face their local +x
    if (sx < -2.25 && sz < 4.5) continue;        // behind the counter is staff only
    const key = `${Math.round(sx / 1.5)},${Math.round(sz / 1.5)},${Math.round(c.ry / (Math.PI / 2))}`;
    let g = groups.get(key); if (!g) groups.set(key, g = { x: 0, z: 0, nx, nz, n: 0, cats: {}, copies: [] });
    g.x += sx; g.z += sz; g.n++; g.copies.push(c); g.cats[c.category] = (g.cats[c.category] || 0) + 1;
  }
  const reach = new Uint8Array(grid.g.length), q = [grid.at(CUST_DOOR.x, CUST_DOOR.z)];   // flood fill from the door: what can actually be walked to
  reach[q[0]] = 1;
  while (q.length) { const n = q.pop(), i = n % grid.nx; for (const m of [i + 1 < grid.nx && n + 1, i > 0 && n - 1, n + grid.nx, n - grid.nx]) if (m !== false && m >= 0 && m < reach.length && !reach[m] && !grid.g[m]) { reach[m] = 1; q.push(m); } }
  return custSpots = [...groups.values()].filter(g => g.n >= 4)
    .map(g => ({ x: g.x / g.n, z: g.z / g.n, ry: Math.atan2(-g.nx, -g.nz), n: g.n, cats: g.cats, copies: g.copies }))   // facing the shelf
    .filter(g => reach[grid.at(g.x, g.z)] === 1);
}
// who's walking in: a seed drives both the look and the personality, so the
// same seed always rebuilds the same person (outfit, taste, patience)
const TASTES = [
  { name: "horror fan", cats: ["Horror", "Horror & Anthology", "Classic Horror"] },
  { name: "parent", cats: ["Family & Kids", "Kids & Educational", "Animation", "Holiday"] },
  { name: "couch potato", cats: ["Sitcoms", "Classic Sitcoms", "Drama & Adventure", "Sketch Comedy & Late Night", "Reality TV"] },
  { name: "action junkie", cats: ["Action & Adventure", "Sci-Fi & Fantasy"] },
  { name: "date night", cats: ["Comedy", "Drama"] },
  { name: "anime kid", cats: ["Anime", "Animation", "Sci-Fi & Fantasy"] },
  { name: "wanderer", cats: [] },                                 // no favorites: grabs whatever catches their eye
];
// how they move, also from the seed (its own stream, so the look and the persona above roll as they always did): a
// gait, and whether they carry an umbrella (the rest get caught out, and run for it with a hand over their head)
const GAIT_ODDS = [["plain", 30], ["brisk", 14], ["stroll", 10], ["bouncy", 10], ["shuffle", 10], ["swagger", 10], ["sway", 8], ["stomp", 8]];
function npcStyle(seed, female) {
  const rnd = seeded(seed ^ 0x5bd1e995), odds = GAIT_ODDS.map(([g, n]) => [g, n * (g === "swagger" ? (female ? 0.4 : 1.6) : g === "sway" ? (female ? 1.8 : 0.3) : 1)]);
  let x = rnd() * odds.reduce((a, [, n]) => a + n, 0), gait = "plain";
  for (const [g, n] of odds) if ((x -= n) < 0) { gait = g; break; }
  return { gait, umbOwn: rnd() < 0.55 };
}
function customerFor(seed, female) {
  const rnd = seeded(seed), outfit = StoreCustomers.randomOutfit(rnd, female);
  const who = { seed, rnd, outfit, persona: {
    taste: TASTES[Math.floor(rnd() * TASTES.length)],
    patience: 0.6 + rnd() * 1.2,                  // scales how long they'll wait at the counter
    speed: 1.0 + rnd() * 0.55,                    // m/s
    picky: 0.25 + rnd() * 0.5,                    // chance a shelf they like has something for them
    stops: (r => r < 0.05 ? 7 + Math.floor(rnd() * 4) : r < 0.2 ? 4 + Math.floor(rnd() * 3) : 1 + Math.floor(rnd() * 3))(rnd()),   // shelves they'll look at: 1-3 mostly, a proper browse now and then, rarely 7-10
    maxTapes: 1 + (rnd() < 0.35) + (rnd() < 0.12),   // most rent one; some make a night of it
    dwell: 0.6 + rnd() * 0.9,                     // how long they tend to stand at a shelf
    sweet: rnd(),                                 // sweet tooth: how easily a snack's talked up at the counter
  } };
  who.persona.stops = Math.min(10, who.persona.stops + who.persona.maxTapes - 1);   // a bigger haul means more shelves to look at
  Object.assign(outfit, npcStyle(seed, outfit.female));
  return who;
}
// everyone in the store: up to CUST_MAX at once, each with their own visit.
// One at a time at the register; the rest line up behind them (custLine[0] is
// the one at the counter). Someone new wanders in every so often while there's room
// how busy it is: slow mornings, a lunch bump, the after-school wave, the
// evening rush (bigger Friday and Saturday nights), a trickle before close
function rushLevel() {
  const h = shift.h, d = shiftDate().getDay(), weekend = d === 5 || d === 6;
  let r = h < 12 ? 0.5 : h < 14 ? 0.9 : h < 15 ? 0.7 : h < 17.5 ? 1.2 : h < 18.5 ? 0.9 : h < 21.5 ? 1.5 : h < 23 ? 0.9 : 0.5;
  if (weekend && h >= 18) r *= 1.35;
  if (d === 2) r *= 1.15;                         // new release Tuesday
  r *= season().rush;                             // a holiday (see the calendar)
  r *= wxRush();                                  // the weather
  const members = SIM ? (rushLevel.n ??= posTerm.members.filter(m => m.active).length) : 150;   // (simulation: a small member base is a quiet store)
  const easeIn = SIM ? Math.min(1, 0.25 + 0.15 * shift.day) : 1;   // (simulation: a gentle first week, 40% busy on day 1 up to full on day 5)
  return r * repMult() * (0.45 + 0.55 * Math.min(1, members / 150)) * easeIn;
}
const custMax = () => Math.min(6, Math.round(2 + 2 * rushLevel()));
const custs = [], custLine = [];
const custArrivals = { t: 3, lastMember: null };
const custLikes = (cust, spot) => {               // 0..1: how much of this shelf is their kind of thing
  if (!spot?.cats) return 0;
  const lean = season().lean, extra = lean.length ? 0.5 * lean.reduce((a, k) => a + (spot.cats[k] || 0), 0) / spot.n : 0;   // the season pulls everyone toward a section
  const cats = cust.who.persona.taste.cats; if (!cats.length) return Math.min(1, 0.3 + extra);
  return Math.min(1, cats.reduce((a, k) => a + (spot.cats[k] || 0), 0) / spot.n + extra);
};
const custWaiting = () => custLine[0] && ["wait", "impatient", "angry"].includes(custLine[0].state) ? custLine[0] : null;   // at the counter, waiting to be rung up
// who comes in: every walk-in is one of the POS's members, and their member
// number is their seed, so the same member always looks and acts the same.
// About half the time it's someone with tapes out, bringing them back — most
// likely whoever's due today or late
function custPickMember(anyone = false) {      // anyone: skip the visiting rhythm (ticket holders for the show)
  const ms = posTerm.members.filter(m => m.active && m !== custArrivals.lastMember && !custs.some(k => k.member === m) && posTerm.canVisit(m) && (m.loyalty || 0) > -60);   // not someone who's already in here, banned, or fed up with the place
  const soonest = m => Math.min(...m.rentals.map(r => posTerm.dueIn(r)));
  const now = shift.day + shift.h / 24, since = m => now - (m.lastVisit ?? -9);   // game days since they were last in
  const promised = ms.find(m => m.promise && soonest(m) < 0 && since(m) > 0.25);   // called about an overdue tape: they said they'd bring it in
  if (promised && Math.random() < 0.3) return promised;
  const due = ms.filter(m => m.rentals.length && soonest(m) <= 1 && since(m) > 0.25);   // bringing tapes back (just not twice in a few hours)
  if (due.length && Math.random() < 0.5) {
    const w = due.map(m => soonest(m) <= 0 ? 3 : 1);
    let r = Math.random() * w.reduce((a, b) => a + b, 0), i = 0; while (i < due.length - 1 && (r -= w[i]) > 0) i++;
    return due[i];
  }
  // everyone else has their own rhythm: most come in every couple of days or so, regulars more, the fed-up less.
  // Whoever's picked might not be due yet; then nobody comes this time (a small base can't fill a busy night)
  const cadence = m => 2.5 / Math.max(0.4, 1 + (m.loyalty || 0) / 50);
  const ok = anyone ? ms : ms.filter(m => since(m) >= 0.4); if (!ok.length) return null;
  const w = ok.map(m => Math.max(0.2, 1 + (m.loyalty || 0) / 40));   // regulars come in more often
  let r = Math.random() * w.reduce((a, b) => a + b, 0), i = 0; while (i < ok.length - 1 && (r -= w[i]) > 0) i++;
  return anyone || Math.random() < Math.min(1, since(ok[i]) / cadence(ok[i])) ** 2 ? ok[i] : null;   // (seen yesterday: unlikely today)
}
const memberName = m => `${m.first[0]}${m.first.slice(1).toLowerCase()} ${m.last[0]}${m.last.slice(1).toLowerCase()}`;
const SHEEPISH = ["I'm so sorry. It was under the couch the whole time.", "My brother-in-law had it. Don't ask.", "I swear I thought I returned this.",
  "It got packed in a moving box.", "The dog... look, it still plays.", "Please don't make me look at the fee."];
function custSpawn(member = custPickMember(true), opts = {}) {   // opts.kid: a parent's kid tagging along (not a member); opts.ride: arriving with someone (see custBringAlong)
  const kid = opts.kid || null;
  const who = kid ? kidFor(kid) : customerFor(Math.imul(member.num, 2654435761) >>> 0, member.female);   // member # -> the same person every time
  const cust = { who, member, kid: !!kid, ry: 0, face: 0, hi: 0, box: { x0: CUST_DOOR.x - 0.22, x1: CUST_DOOR.x + 0.22, z0: CUST_DOOR.z - 0.22, z1: CUST_DOOR.z + 0.22, shadow: false } };
  if (!kid) { custArrivals.lastMember = member; member.lastVisit = shift.day + shift.h / 24; shift.stats.visitors++; }
  const loyal = member.loyalty || 0;
  who.persona.patience *= 1 + loyal / 200;        // regulars will wait a bit longer; the fed-up, less
  if (!kid) member.likes = who.persona.taste.name;   // (for the POS: now somebody's noticed)
  if (shift.h >= 23 && Math.random() < 0.5) { who.persona.stops = 7 + Math.floor(Math.random() * 4); who.persona.dwell *= 1.5; }   // the 11:30 walk-in, in no hurry at all
  if (loyal >= 40 && !kid) logAct(`${memberName(member)}, one of the regulars, came in`);
  cust.litterT = Math.random() < 0.15 ? 15 + Math.random() * 60 : Infinity;   // now and then somebody drops something
  const grot = messes.length + binList().filter(binFull).length + bagsDown.length + deadLights.length;   // litter, overflowing bins, bags left lying about, dead lights
  if (grot >= 3 && !kid) { posTerm.loyal(member, -2); if (clockT - (custSpawn.messNote || -999) > 120) { custSpawn.messNote = clockT; logAct(`Customers are noticing the mess (${messes.length} spots to clean${binList().some(binFull) ? ", the trash overflowing" : ""})`, "bad"); } }
  cust.thief = !kid && Math.random() < 0.06 * (upg.cameras ? 0.6 : 1) * (upg.sign ? 0.7 : 1);   // now and then somebody means to walk out with it (less, with cameras and signs up)
  cust.returning = kid ? [] : member.rentals.filter(r => posTerm.dueIn(r) <= 0 || (posTerm.dueIn(r) === 1 && Math.random() < 0.5)).map(r => r.copy);   // what's due (or late) comes back; the rest stays out
  who.persona.maxTapes = Math.min(who.persona.maxTapes, Math.max(0, posTerm.rentMax - (member.rentals.length - cust.returning.length)));   // 3 out at a time, counting what they're keeping
  const c = cust.c = StoreCustomers.build(who.outfit);
  c.parts.forEach(m => { m.userData.customer = cust; aimables.push(m); });
  c.glows.forEach(glow);
  c.group.position.set(CUST_DOOR.x, 0, CUST_DOOR.z); c.group.rotation.y = 0;
  scene.add(c.group); colliders.push(cust.box);
  c.setMood("on"); c.setPose(cust.returning.length ? "hold" : "idle"); c.holdTape(Math.min(3, cust.returning.length));
  Object.assign(cust, { tagged: false, alarmed: false, holding: 0, tapes: [], snacks: [], snackDone: false, seen: new Set(), stopsLeft: who.persona.stops, path: [], spot: null, state: "boot", t: 0.6 });   // screen warms up, then in they come
  if (opts.ride) custRideWith(cust, opts.ride);   // with someone: in their car, or walking up beside them
  else if (!custArriveByCar(cust)) {              // ...from out front: their car, or up the sidewalk; to the door and in
    const out = cust.outside = outsidePath();
    c.group.position.set(out[0][0], 0, out[0][1]); cust.path = [...out.slice(1), INSIDE_DOOR, [CUST_DOOR.x, CUST_DOOR.z]]; cust.state = "arrive"; cust.spot = CUST_DOOR;
  }
  custs.push(cust);
  return cust;
}
// ---- the little things people do while they stand there ----
// Browsing: pull a tape out and turn it over to read the back (and put it back), glance up at the lounge TV when
// something's on, check the time. In line or waiting at the counter: check the time, sigh, look around
function custFidget(cust, dt) {
  const c = cust.c, f = cust.fid;
  if (f && (f.state !== cust.state || co?.cust === cust)) {   // something came up (it's their turn, they're off): drop it
    c.reachTo(null); c.lookAt(null); if (f.kind === "read") c.holdTape(cust.holding); cust.fid = null; return;
  }
  if (co?.cust === cust || cust.chatting) return;
  if (f) {                                         // in the middle of one
    f.t -= dt;
    if (f.t > 0) return;
    if (f.kind === "read") {
      if (f.phase === 0) { c.reachTo(null); c.holdTape(Math.min(3, cust.holding + 1)); c.setPose("read"); c.setMood(Math.random() < 0.3 ? "love" : "neutral"); f.phase = 1; f.t = 2 + Math.random() * 2.5; return; }
      if (f.phase === 1) { c.setPose(cust.holding ? "hold" : "idle"); c.reachTo(f.at); f.phase = 2; f.t = 0.6; return; }   // back where it came from
      c.reachTo(null); c.holdTape(cust.holding); c.setMood("browse");
    } else { c.setPose(f.pose0 || (cust.holding ? "hold" : "idle")); c.lookAt(null); if (cust.state === "browse") c.setMood("browse"); }
    cust.fid = null; return;
  }
  if ((cust.fidT = (cust.fidT ?? 2 + Math.random() * 4) - dt) > 0) return;
  cust.fidT = 3 + Math.random() * 6;
  const r = Math.random(), p = c.group.position;
  const tvRel = playing && Math.hypot(p.x - TV.x, p.z - TV.z) < 14 ? Math.atan2(TV.x - p.x, TV.z - p.z) - cust.face : null;
  if (cust.state === "browse" && cust.t > 2.5 && !cust.kid) {
    if (r < 0.45 && cust.spot?.copies) {           // a tape off the shelf, turned over
      const copy = cust.spot.copies.find(k => !k.offShelf && Math.random() < 0.15) || cust.spot.copies.find(k => !k.offShelf);
      if (!copy?.pos) return;
      cust.fid = { state: cust.state, kind: "read", phase: 0, t: 0.6, at: copy.pos.clone() }; c.reachTo(copy.pos); cust.t += 4; return;
    }
    if (r < 0.65 && tvRel !== null) { cust.fid = { state: cust.state, kind: "look", t: 2 + Math.random() * 2 }; c.lookAt(Math.atan2(Math.sin(tvRel), Math.cos(tvRel))); c.setMood("watch"); return; }   // what's on?
    if (r < 0.75) { cust.fid = { state: cust.state, kind: "watch", t: 1.3, pose0: cust.holding ? "hold" : "idle" }; c.setPose("watch"); return; }   // is it that late already?
  }
  if (["inLine", "wait", "impatient", "tagAlong"].includes(cust.state)) {
    const pose0 = cust.state === "tagAlong" ? (cust.holding ? "hold" : "idle") : "wait";
    if (r < 0.3) { cust.fid = { state: cust.state, kind: "watch", t: 1.3, pose0 }; c.setPose("watch"); }
    else if (r < 0.5 && cust.state !== "tagAlong") { c.sigh(); }
    else if (r < 0.75) { cust.fid = { state: cust.state, kind: "look", t: 1.5 + Math.random() * 1.5, pose0 }; c.lookAt(tvRel !== null && Math.random() < 0.6 ? Math.atan2(Math.sin(tvRel), Math.cos(tvRel)) : (Math.random() * 2 - 1) * 1.1); }
  }
}
// ---- people who come in together ----
// Now and then a member brings someone: a friend or their partner (another member, with their own visit: they split
// up to browse, and whoever's done first waits on the other, then out they go together), or, for a parent, a kid
// (not a member: straight to the kids' shelves, maybe back with a tape for the parent, and called back when it's time
// to go). They come in the same car, or up the sidewalk side by side, and leave the same way
const KID_TASTE = { name: "kid", cats: ["Family & Kids", "Kids & Educational", "Animation"] };
function kidFor(parent) {                          // a kid: small, a little TV, their own clothes; a fresh face each visit
  const seed = (Math.random() * 2 ** 31) | 0, who = customerFor(seed, Math.random() < 0.5), o = who.outfit;
  Object.assign(o, { height: 0.6 + Math.random() * 0.08, build: 0.82, bust: 0, hat: Math.random() < 0.3 ? o.hat : null, umbrella: null, umbOwn: false, gait: Math.random() < 0.6 ? "skip" : "bouncy" });
  Object.assign(o.tv, { w: 0.33, h: 0.26, d: 0.25, antenna: Math.random() < 0.5 });
  Object.assign(who.persona, { taste: KID_TASTE, stops: 1 + Math.floor(Math.random() * 3), speed: parent.who.persona.speed, picky: 0.8, maxTapes: 1, dwell: 0.8 });
  return who;
}
function custBringAlong(lead) {                   // a regular arrival might not be alone
  if (!lead || lead.prospect || lead.pickup || lead.moviegoer || custs.length >= custMax()) return lead;
  const parent = lead.who.persona.taste.name === "parent", r = Math.random();
  if (r < (parent ? 0.5 : 0.05)) {
    const k = custSpawn(lead.member, { kid: lead, ride: lead }); lead.party = k.party = [lead, k];
    if (lead.member.loyalty >= 40) logAct(`${memberName(lead.member)} brought their kid`);
  } else if (r < (parent ? 0.62 : 0.24)) {
    const ms = posTerm.members.filter(m => m.active && m !== lead.member && !custs.some(k => k.member === m) && posTerm.canVisit(m) && (m.loyalty || 0) > -60);
    const m = ms[Math.floor(Math.random() * ms.length)]; if (!m) return lead;
    const k = custSpawn(m, { ride: lead }); k.thief = lead.thief = false;   // (nobody shoplifts with a friend watching)
    lead.party = k.party = [lead, k]; k.who.persona.speed = lead.who.persona.speed;
  }
  return lead;
}
const LEAVING = ["leave", "outside", "out", "gone"];
const custPartners = cust => (cust.party || []).filter(k => k !== cust && k.c && !LEAVING.includes(k.state) && k.state !== "tagAlong");   // still busy in the store
function custTagAlong(cust) {                      // done: go wait by whoever they came with
  const kid = (cust.party || []).find(k => k.kid && k !== cust && k.c && k.state !== "tagAlong" && !LEAVING.includes(k.state));
  if (!cust.kid && kid) {                          // a parent: "come on, we're going"
    cust.c.setMood("impatient"); cust.hi = 2; kid.stopsLeft = 0; kid.c.setMood("meh"); kid.hi = 1.5;
    if (["stop", "browse", "reach", "chat"].includes(kid.state) || kid.path.length) custTagAlong(kid);
    if (!kid.hurried) { kid.hurried = true; kid.who.persona.speed *= 1.35; }   // (and they hurry)
  }
  cust.state = "tagAlong"; cust.t = 0; cust.path = []; cust.tagT = 0; cust.c.setPose(cust.holding ? "hold" : "idle");
}
function custTagAlongTick(cust) {                 // standing by: near whoever's still going; when nobody is, out together
  const c = cust.c, busy = custPartners(cust);
  if (cust.kid && cust.tapes.length) {            // a kid with a tape: "can we get this one?"
    const par = cust.party[0];
    if (par.c && ["stop", "browse", "reach", "tagAlong", "chat"].includes(par.state) && Math.hypot(par.c.group.position.x - c.group.position.x, par.c.group.position.z - c.group.position.z) < 1.6) {
      const t = cust.tapes.pop(); cust.holding = 0; c.holdTape(0); c.setMood("ask"); cust.hi = 2;
      par.tapes.push(t); par.holding++; par.c.holdTape(Math.min(3, par.holding)); par.c.setPose("hold"); par.c.setMood("meh"); par.hi = 1.5;   // (they cave)
      if (par.state === "tagAlong") { par.state = "browse"; par.t = 0.5; par.stopsLeft = 0; }   // that's one more to pay for
    } else if (!par.c || LEAVING.includes(par.state) || ["queue", "inLine", "counter", "wait", "impatient", "angry", "checkout", "coBack", "paid"].includes(par.state)) {   // too late (they're paying, or going): it gets stuck on the nearest shelf
      const t = cust.tapes.pop(); cust.holding = 0; c.holdTape(0); if (cust.spot?.copies) misshelve(t, cust.spot); else setOnShelf(t, true);
    }
  }
  if (!busy.length) {                              // everyone's done: out the door together
    const par = (cust.party || []).find(k => k !== cust && k.c && !LEAVING.includes(k.state));   // (someone's still at the counter or the door: walk out with them)
    if (!par || par.state === "tagAlong" || cust.kid) { c.setMood(cust.holding || cust.paid ? "happy" : "neutral"); return custGo(cust, "leave", CUST_DOOR); }
  }
  if (cust.t > 0) return;
  const k = busy[0] || (cust.party || []).find(q => q !== cust && q.c), p = c.group.position;
  if (!k) return custGo(cust, "leave", CUST_DOOR);
  const q = k.c.group.position, d = Math.hypot(q.x - p.x, q.z - p.z);
  cust.tagT += 2;
  if (cust.tagT > 90 && busy.length && !k.kid) { k.stopsLeft = Math.min(k.stopsLeft, 0); k.c.setMood("meh"); k.hi = 1; }   // "come on..."
  if (d > 1.8) {                                   // go stand beside them (by the line, not in it)
    const a = Math.random() * Math.PI * 2, spot = { x: q.x + Math.cos(a) * 0.9, z: q.z + Math.sin(a) * 0.9 + (["inLine", "queue", "counter", "wait", "checkout"].includes(k.state) ? 0.6 : 0) };
    spot.ry = Math.atan2(q.x - spot.x, q.z - spot.z);
    custGo(cust, "tagAlong", spot); cust.t = 2.5; return;
  }
  cust.ry = Math.atan2(q.x - p.x, q.z - p.z); c.talk(Math.random() < 0.5); c.setMood(Math.random() < 0.3 ? "browse" : "neutral");
  cust.state = "tagAlong"; cust.t = 2 + Math.random() * 2;
}
// two regulars (or two who came in together) end up at the same shelf: they stop and catch up for a bit
function custChatTick(dt) {
  if ((custChatTick.t = (custChatTick.t || 0) - dt) > 0) return; custChatTick.t = 1;
  const free = custs.filter(k => k.c && !k.kid && k.state === "browse" && !k.chatting);
  for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) {
    const a = free[i], b = free[j], pa = a.c.group.position, pb = b.c.group.position;
    if (Math.hypot(pa.x - pb.x, pa.z - pb.z) > 2.6 || (a.chatted ||= new Set()).has(b)) continue;
    const together = a.party && a.party.includes(b), regulars = (a.member.loyalty || 0) >= 30 && (b.member.loyalty || 0) >= 30;
    if (!together && !regulars) continue;
    if (!together && Math.random() < 0.5) { a.chatted.add(b); continue; }   // (a nod is enough sometimes)
    a.chatted.add(b); (b.chatted ||= new Set()).add(a);
    const t = 4 + Math.random() * 5;
    for (const [k, o] of [[a, pb], [b, pa]]) {
      const p = k.c.group.position; k.ry = Math.atan2(o.x - p.x, o.z - p.z); k.state = "chat"; k.t = t; k.chatting = true;
      k.c.talk(true); k.c.setMood(Math.random() < 0.3 ? "love" : "happy"); k.hi = t;
    }
    if (!together && clockT - (custChatTick.said || -999) > 90) { custChatTick.said = clockT; logAct(`${memberName(a.member)} and ${memberName(b.member)}, a couple of regulars, are catching up in the aisle`); }
    return;
  }
}
// ---- out front: people going by, and the pizza place next door ----
// Folks walk past on the sidewalk without coming in (umbrellas up in the rain). Next door, east of us, is a pizza
// place we never see: only its people. They park (or walk up) and head in empty-handed, and a while later come back
// out with a pizza box and go home; busy at lunch and dinner. After dark its storefront lights the walk and the lot
// in front of it. None of them are our customers: they're not in custs, just people on a path
const PIZZA_DOOR = [15.6, -0.75], SIDEWALK_Z = -0.95;
const TONY_IN = { x0: 13.15, x1: 20.85, z0: 0.15, z1: 13.85, counterZ: 7.3, wallZ: 9.6, gapX: 19.6, doorX: [19.9, 20.75], hole: [14.2, 18.2] };
const tony = { clerk: null, scores: [0, 0, 0] };
const TONY_GAMES = [["SPACE INVADERS", "#39ff5a", "#121212"], ["ASTEROIDS", "#ffffff", "#15162a"], ["MISSILE COMMAND", "#ffb02e", "#1a2748"]];   // [name, glow, cabinet]
const tonyOpen = () => shift.h >= 11 && shift.h < 23;
const tonyIn = (x, z) => x > TONY_IN.x0 + 0.3 && x < TONY_IN.x1 - 0.3 && z > TONY_IN.z0 + 0.3 && z < TONY_IN.z1 - 0.3;   // (inside Tony's: see tonyInside)
const tonyDoorway = (x, z) => Math.abs(x - PIZZA_DOOR[0]) < 0.28 && z > -0.4 && z < 0.5;
const TONY_BACK = { x: 18.2, w: 1.0 };                // the kitchen's steel door, out to the back
const tonyBackWay = (x, z) => Math.abs(x - TONY_BACK.x) < 0.34 && z > 13.3 && z < 14.75;
// The weather on anyone out there (customers in the lot, people going by): snow settles on their head and shoulders
// (melting off once they're inside), the wind leans on them and they lean into it, a gust shoves them a step (or
// turns an umbrella inside out), the cold and the wet hunch them up, and with no umbrella in the rain a hand goes up
// over their head. k: their record (cust or walker), out: are they outdoors
function npcEnv(k, c, out, dt) {
  const w = wxFall.uni.uWind.value, rain = WX.kind === "rain" ? WX.k : 0, snow = WX.kind === "snow" ? WX.k : 0, umb = c.prop === "umbrella";
  k.snow = Math.max(0, Math.min(1, (k.snow || 0) + (out ? (umb ? 0 : dt * snow * 0.045) : -dt * 0.03)));   // ~25 s of heavy snow to cover them; ~30 s indoors to melt
  c.setSnow(k.snow); c.setWind(out ? w.x : 0, out ? w.y : 0);
  const wet = out && rain > 0.25 && !umb;
  k.soakT = wet ? (k.soakT || 0) + dt : out ? 0 : k.soakT; if (k.soakT > 1.5) k.soaked = true;
  const cold = out ? Math.max(snow * 0.9, wet ? 0.6 : 0, Math.min(1, Math.max(0, w.length() - 3) / 6) * 0.7) : 0;
  k.hunch = (k.hunch || 0) + (cold - (k.hunch || 0)) * Math.min(1, dt * 2); c.setHunch(k.hunch);
  c.setShield(wet && !k.box);
  const gust = WX.gust || 0;
  if (out && gust > 0.6 && w.length() > 5 && !k.gusted) {   // a gust: a stumble sideways, maybe the umbrella goes
    k.gusted = true;
    const ry = c.group.rotation.y, wl = w.x * Math.cos(ry) - w.y * Math.sin(ry);
    if (Math.random() < 0.6) c.stagger(wl >= 0 ? 1 : -1);
    if (umb && Math.random() < 0.35) c.umbrellaFlip();
  } else if (gust < 0.3) k.gusted = false;
}
function npcPace(k, c, speed, ux, uz, dt) {      // their speed through the weather, walking (ux, uz); the wind carries them sideways a little
  const w = wxFall.uni.uWind.value, along = w.x * ux + w.y * uz, p = c.group.position;
  speed *= Math.max(0.55, Math.min(1.3, 1 + along * 0.04));   // fighting a headwind, helped along by a tailwind
  p.x += (w.x - along * ux) * 0.025 * dt; p.z += (w.y - along * uz) * 0.025 * dt;   // (the path steers them back)
  if (WX.kind === "rain" && WX.k > 0.25 && c.prop !== "umbrella") speed = Math.max(speed * 1.9, k.box ? 2.3 : 2.9);   // caught out: run for it (carefully, with a pizza)
  else if (WX.cover > 0.3) speed *= 0.85;        // short careful steps on the snow
  return speed;
}
const walkers = [];                               // { c, path: [[x, z]...], speed, then, box }
const walkerAt = { t: 4, pizzaT: 20 };
function walkerMake(path, then, box = false) {
  const seed = (Math.random() * 2 ** 31) | 0, o = customerFor(seed, Math.random() < 0.5).outfit;
  const c = StoreCustomers.build(o); c.group.position.set(path[0][0], 0, path[0][1]); scene.add(c.group); c.setMood("neutral");
  const w = { c, path: path.slice(1), speed: 1.1 + Math.random() * 0.5, then, box: null };
  if (box) walkerBox(w, true);
  walkers.push(w); return w;
}
function pizzaBox() {                            // a pizza box, carried flat
  const g = new THREE.Group(), box = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.4), [0xe8dcc4, 0xe8dcc4, 0xf2ead8, 0xe8dcc4, 0xe8dcc4, 0xe8dcc4].map((c, i) => new THREE.MeshLambertMaterial({ color: c })));
  const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.12), new THREE.MeshBasicMaterial({ color: 0xc8312a })); lbl.rotation.x = -Math.PI / 2; lbl.position.y = 0.026; g.add(box, lbl); return g;
}
function walkerBox(w, on) { w.c.holdItem(on ? pizzaBox() : null); w.c.setPose(on ? "hold" : "idle"); w.box = on; }
// next door, now there's an inside to it: in through the door, up the aisle past the tables to a spot at the counter,
// waiting there for the order (facing Tony), then back out the way they came with the box
const TONY_SPOTS = [14.4, 15.3, 16.2, 17.1, 18.0], tonyTaken = new Set();
function walkerInTonys(w, secs, out) {
  const free = TONY_SPOTS.filter(x => !tonyTaken.has(x)); if (!free.length) return walkerInside(w, secs, out);   // (a crowd at the counter: they wait off out of sight)
  const x = free[Math.floor(Math.random() * free.length)], a = PIZZA_DOOR[0], cz = TONY_IN.counterZ - 0.55; tonyTaken.add(x);
  w.path = [[a, 0.6], [a, 6.0], [x, cz]];
  w.then = w => { w.c.group.rotation.y = 0; w.wait = secs; w.after = () => {
    tonyTaken.delete(x); walkerBox(w, true); tony.clerk?.setMood("happy");
    w.path = [[a, 6.0], [a, 0.6], PIZZA_DOOR]; w.then = () => out(); }; };
}
function walkerInside(w, secs, out) { w.c.group.visible = false; w.inside = secs; w.out = () => { w.c.group.visible = true; walkerBox(w, true); out(); }; }   // in next door for a while (game time)
function walkerGone(w) { w.c.group.removeFromParent(); w.c.dispose(); walkers.splice(walkers.indexOf(w), 1); }
function pizzaRun() {                             // someone getting a pizza: by car (parked near it) or on foot
  const wait = SHIFT.hour * (0.12 + Math.random() * 0.15);
  if (Math.random() < 0.6) {
    const look = carNew(), car = driveIn(look, car => {
      const d = car.door;
      walkerMake([[d.x, d.z], [d.x, -3.2], [PIZZA_DOOR[0], SIDEWALK_Z], PIZZA_DOOR], w => walkerInTonys(w, wait, () => {   // in they go, and back out with it
        w.path = [[PIZZA_DOOR[0], SIDEWALK_Z], [d.x, -3.2], [d.x, d.z]]; w.then = w => { walkerGone(w); driveOut(car); };
      }));
    }, PIZZA_DOOR[0]);
    if (car) { car.idling = Math.random() < 0.2; window.StoreAmbience?.drive?.(car.dir, 13); return; }
  }
  const from = (Math.random() < 0.5 ? -1 : 1) * 24;   // on foot, up the sidewalk
  walkerMake([[from, SIDEWALK_Z - Math.random() * 0.3], [PIZZA_DOOR[0], SIDEWALK_Z], PIZZA_DOOR], w => walkerInTonys(w, wait, () => {
    w.path = [[PIZZA_DOOR[0], SIDEWALK_Z], [from > 0 ? -24 : 24, SIDEWALK_Z]]; w.then = walkerGone;
  }));
}
function walkerTick(dt) {
  const h = shift.h, night = h < 7 || h > 21.5;
  if (started && (walkerAt.t -= dt) <= 0) {        // somebody going by
    walkerAt.t = (night ? 70 + Math.random() * 120 : 18 + Math.random() * 40) * (WX.k > 0.3 ? 1.8 : 1);
    if (walkers.length < 4 && h > 6.5) { const dir = Math.random() < 0.5 ? 1 : -1, z = SIDEWALK_Z - Math.random() * 0.4; walkerMake([[-dir * 24, z], [dir * 24, z]], walkerGone); }
  }
  const open = h >= 11 && h < 23, busy = (h > 11.5 && h < 13.5) || (h > 17 && h < 20.5);
  if (started && open && (walkerAt.pizzaT -= dt) <= 0) { walkerAt.pizzaT = (busy ? 25 : 70) + Math.random() * (busy ? 40 : 110); if (walkers.length < 5) pizzaRun(); }
  pizzaGlow.material.opacity = open ? 0.85 * Math.max(0, 1 - tod.level * 1.4) : 0; pizzaGlow.visible = pizzaGlow.material.opacity > 0.01;
  for (const w of [...walkers]) {
    const c = w.c, p = c.group.position;
    if (!c.group.visible) { if (w.inside != null && (w.inside -= dt) <= 0) { w.inside = null; w.out(); } continue; }
    let speed = 0;
    if (w.wait != null && (w.wait -= dt) <= 0) { w.wait = null; w.after(); }   // (waiting at Tony's counter for the order)
    if (w.path.length) {
      const [tx, tz] = w.path[0], dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
      if (d < 0.05) w.path.shift();
      else if (!c.busy) { speed = npcPace(w, c, w.speed * (night ? 1.12 : 1), dx / d, dz / d, dt); const st = Math.min(d, speed * dt); p.x += dx / d * st; p.z += dz / d * st; p.y = floorHeightAt(p.x, p.z); c.group.rotation.y = Math.atan2(dx, dz); }   // (a quicker step after dark)
    } else { const f = w.then; w.then = null; f?.(w); if (!walkers.includes(w) || !c.group.visible) continue; }
    const rain = WX.kind === "rain" && WX.k > 0.2 && c.outfit.umbOwn; if (rain !== !!w.umb && !w.box) { w.umb = rain; c.holdProp(rain ? "umbrella" : null); }
    npcEnv(w, c, true, dt);
    c.tick(dt, speed);
  }
}
const pizzaGlow = (() => {                        // next door's lit front, on the walk and the lot in front of it
  const W = 9, D = 6, c = document.createElement("canvas"); c.width = 256; c.height = 192; const g = c.getContext("2d"), img = g.createImageData(256, 192);
  for (let y = 0; y < 192; y++) for (let x = 0; x < 256; x++) {
    const u = (x + 0.5) / 256 * 2 - 1, v = (y + 0.5) / 192, a = Math.max(0, 1 - Math.abs(u) ** 2.5) * Math.exp(-v * 2.6) * Math.min(1, v * 20), i = (y * 256 + x) * 4;
    img.data[i] = 255; img.data[i + 1] = 180 + 40 * (1 - v); img.data[i + 2] = 110; img.data[i + 3] = 255 * a;
  }
  g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.rotation.x = -Math.PI / 2; m.position.set(PIZZA_DOOR[0] + 0.5, 0.03, -D / 2); m.layers.set(EXTERIOR_LAYER); scene.add(m); return m;
})();
// ---- getting past you (shared by customers and Dana) ----
// you're standing on where they're headed: use a spot beside it (sideways to
// the way they'd face there), whichever side is open
function spotBesideYou(spot, grid) {
  if (Math.hypot(player.x - spot.x, player.z - spot.z) > 0.6) return spot;
  const ry = spot.ry ?? 0, sx = Math.cos(ry), sz = -Math.sin(ry);
  for (const k of [0.75, -0.75, 1.1, -1.1]) {
    const q = { ...spot, x: spot.x + sx * k, z: spot.z + sz * k };
    if (grid.free(q.x, q.z) && Math.hypot(player.x - q.x, player.z - q.z) > 0.6) return q;
  }
  return spot;
}
// one step of "are you in my way": yields while you're right ahead; detours
// around you after a moment (and, on a detour, only yields when actually about
// to bump you); squeezes past if there's truly no way round. w: the walker's
// state ({ stuck, detour, squeeze }), redo(avoid): re-plan the path
function yieldTo(w, p, dx, dz, dt, redo) {
  if (w.squeeze > 0) { w.squeeze -= dt; return false; }            // excuse me...
  const near = Math.hypot(player.x - p.x, player.z - p.z) < (w.detour ? 0.5 : 0.75);
  if (!(near && (player.x - p.x) * dx + (player.z - p.z) * dz > 0)) return false;
  w.stuck = (w.stuck || 0) + dt;
  if (w.stuck > 0.6 && !w.detour) { w.detour = true; redo(true); w.stuck = 0.01; }   // go around
  else if (w.stuck > 3.5) { w.squeeze = 1.4; w.stuck = 0; }                         // no way round: slip past
  return true;
}
// the same manners with the other shoppers (and Dana): wait a beat for whoever's
// right ahead, then re-plan around them (they're colliders), and slip past if
// that doesn't do it. Two meeting head-on don't both wait: whoever's already
// waiting on the other one gets the right of way
function custBumps(cust, p, dx, dz, dt) {
  if (cust.squeeze > 0) return false;
  const d = Math.hypot(dx, dz), ahead = q => { const ox = q.x - p.x, oz = q.z - p.z, r = Math.hypot(ox, oz); return r < 0.7 && (ox * dx + oz * dz) / d > r * 0.5; };
  const o = custs.find(k => k !== cust && k.waitFor !== cust && ahead(k.c.group.position)) || staff.find(e => e.c && ahead(e.c.group.position)) || null;
  cust.waitFor = o;
  if (!o) { cust.bumpT = 0; return false; }
  cust.bumpT = (cust.bumpT || 0) + dt;
  if (cust.bumpT > 0.7 && !cust.bumpDetour) { custGo(cust, cust.state, cust.spot); cust.bumpDetour = true; cust.bumpT = 0.01; }   // go around
  else if (cust.bumpT > 3) { cust.squeeze = 1.4; cust.bumpT = 0; }                                                            // pardon me
  return true;
}
function custGo(cust, state, spot, avoidPlayer = false) {   // head for a spot; state is what to do on arrival
  if (cust.state === "drivingIn" || cust.c.group.position.z < 0.3) {   // still in the car, or out front: no finding a way out there. Sent off, they just turn back
    if (state !== "leave" || cust.state === "outside") return;
    if (cust.state === "drivingIn") return custGone(cust);
    cust.path = (cust.outside || [OUTSIDE_IN]).slice(0, -1).reverse(); cust.state = "outside"; return;
  }
  if (state === "leave") custLeaveLine(cust);
  const p = cust.c.group.position, r = 0.35;
  const you = avoidPlayer ? [{ x0: player.x - r, x1: player.x + r, z0: player.z - r, z1: player.z + r }] : [];
  const grid = navGrid(cust.box, you); spot = spotBesideYou(spot, grid);
  const path = navPath(grid, p.x, p.z, spot.x, spot.z)
    || navPath(navGrid([cust.box, ...staff.map(e => e.box), ...custs.map(k => k.box)]), p.x, p.z, spot.x, spot.z);   // someone's standing in the doorway: plan through them (the walk waits them out)
  if (!path) { cust.path = []; cust.repath = { state, spot }; cust.state = "repath"; cust.t = 1; cust.spot = spot; return; }   // no way there right now: try again in a sec (never straight through a wall)
  cust.path = path;
  if (!avoidPlayer) cust.detour = false;
  cust.stuck = 0; cust.bumpDetour = false;
  cust.state = state; cust.spot = spot;
}
// the checkout line: the front of it stands at the counter, the rest queue
// back into the store behind them, facing the register
const TAG_FIX_SPOT = { x: CUST_COUNTER.x + 0.9, z: CUST_COUNTER.z, ry: Math.PI };   // beside the line: back with a tag that set the gates off
function tagFix(cust, by) {                        // run their tapes over the desensitizer and send them on their way
  for (const t of cust.tapes) if (!t.desens) desensitize(t);
  silenceGateAlarm(); cust.tagged = false; cust.c.setMood("meh"); cust.hi = 1.5;
  logAct(`${by === "dana" ? emp.first : "You"} fixed ${memberName(cust.member)}'s tag: they're on their way`); gainXp(by, "dex", 3);
  custGo(cust, "leave", CUST_DOOR);
}
const custLineSpot = i => i ? { x: CUST_COUNTER.x, z: CUST_COUNTER.z + 0.85 * i, ry: Math.PI } : CUST_COUNTER;
function custToLine(cust) { const i = custLine.indexOf(cust); custGo(cust, i ? "queue" : "counter", custLineSpot(i)); }
function custLeaveLine(cust) {                    // out of the line: everyone behind shuffles up a spot
  const i = custLine.indexOf(cust); if (i < 0) return;
  custLine.splice(i, 1);
  for (const k of custLine.slice(i)) if (["queue", "inLine", "counter"].includes(k.state)) custToLine(k);
}
function custReturnsSpot() {                      // in the lane, facing the drop slot
  const s = returnSlotMesh.position;
  return { x: s.x + 0.6, z: s.z, ry: -Math.PI / 2 };
}
function custNextStop(cust) {                     // a shelf they haven't looked at yet (and nobody else is at), favoring their kind of thing
  let spots = browseSpots().filter(s => !cust.seen.has(s) && !custs.some(k => k !== cust && k.spot === s));
  if (cust.stopsLeft === 1 && !cust.holding && cust.who.persona.taste.cats.length) {   // last stop, still empty-handed: one more try at their favorite section
    const favs = spots.filter(s => custLikes(cust, s) > 0.5); if (favs.length) spots = favs;
  }
  const w = spots.map(s => 1 + 8 * custLikes(cust, s)), total = w.reduce((a, b) => a + b, 0);
  let r = cust.who.rnd() * total, i = 0; while (i < spots.length - 1 && (r -= w[i]) > 0) i++;
  const spot = spots[i]; if (!spot) return custDone(cust);
  cust.seen.add(spot); custGo(cust, "stop", spot);
}
function custDwell(cust) {                        // how long they look at a shelf: a few seconds mostly; now and then something really grabs them
  const r = cust.who.rnd;
  return (2 + r() * 5) * cust.who.persona.dwell * (r() < 0.1 ? 2.5 : 1);
}
function custPickTheaterSeat(cust) {              // pick an open stadium seat and walk to its row on the center ramp
  if (!owned("theater")) return false;
  const free = theaterSeats.filter(s =>
    !custs.some(k => k !== cust && k.thSeat === s) &&
    !(seated && seatAt && Math.hypot(seatAt.x - s.x, seatAt.z - s.z) < 0.3)
  );
  if (!free.length) return false;
  const s = free[Math.floor(cust.who.rnd() * free.length)];
  cust.thSeat = s;
  custGo(cust, "thAisle", { x: -2.87, z: s.rowZ, ry: 0 });
  return true;
}
function custDone(cust) {                         // out of shelves to look at: grab a snack, catch a movie, or head out
  if (cust.kid) return custTagAlong(cust);         // (kids don't pay: they go find their parent)
  if (cust.thief && cust.holding && !(cust.known && Math.random() < 0.35)) return custSneak(cust);   // you've had an eye on them: maybe not today
  if (!cust.snackDone) {
    cust.snackDone = true;
    const spots = snackSpots();
    if (spots.length && Math.random() < (cust.holding ? 0.4 : 0.25)) return custGo(cust, "snack", spots[Math.floor(Math.random() * spots.length)]);
  }
  if (!cust.holding && !cust.watchedTheater && Math.random() < (playing ? 0.75 : 0.35) && custPickTheaterSeat(cust)) return;
  if (cust.holding || cust.snacks.length) { cust.c.setMood("happy"); custLine.push(cust); custToLine(cust); }
  else if (custPartners(cust).length) custTagAlong(cust);   // nothing for them: they wait on whoever they came with
  else { cust.c.setMood("meh"); custGo(cust, "leave", CUST_DOOR); }
}
function custDecide(cust) {                       // done browsing this shelf: take one, put one back, or move on
  const { rnd, persona } = cust.who, likes = custLikes(cust, cust.spot), last = cust.stopsLeft <= 1;
  cust.stopsLeft--;
  const take = ((persona.taste.cats.length ? persona.picky * likes * 1.2 : 0.25) + (last && !cust.holding ? 0.3 : 0.03)) * 0.7 ** cust.holding;   // each extra tape is a harder sell
  if (cust.holding < persona.maxTapes && rnd() < take) cust.reach = "take";
  else if (cust.holding && rnd() < 0.2) cust.reach = "swap";      // saw something better: put theirs back, take this
  else if (cust.holding && rnd() < 0.12) cust.reach = "return";   // second thoughts
  else cust.reach = null;
  if (cust.reach) {
    cust.reachCopy = cust.reach === "return" ? null : custPickCopy(cust);   // decided now, so the hand goes to the copy they'll take
    const aim = cust.reachCopy || cust.tapes[cust.tapes.length - 1];   // ...or the slot theirs goes back into
    if (aim?.pos) cust.c.reachTo(aim.pos); else cust.c.setPose("reach");
    cust.c.setMood(cust.reach === "return" ? "meh" : likes > 0.4 ? "love" : "happy"); cust.state = "reach"; cust.t = 1.3;
  }
  else { cust.c.setMood(cust.holding ? "happy" : "neutral"); cust.stopsLeft > 0 ? custNextStop(cust) : custDone(cust); }
}
function custPickCopy(cust) {                     // a copy still on this shelf, favoring their kind of thing
  const cs = cust.spot.copies.filter(c => !c.offShelf), cats = cust.who.persona.taste.cats;
  if (!cs.length) return null;
  const w = cs.map(c => cats.includes(c.category) ? 6 : 1);
  let r = cust.who.rnd() * w.reduce((a, b) => a + b, 0), i = 0; while (i < cs.length - 1 && (r -= w[i]) > 0) i++;
  return cs[i];
}
const registerStaffed = () => staff.some(e => e.state === "post") || !player.onRoof && Math.hypot(player.x - EMP_POST.x, player.z - EMP_POST.z) < 1.5;   // Dana at her post, or you behind the register
function custGone(cust) {
  custLeaveLine(cust);
  if (co?.cust === cust) { co = null; coHud(); drawerOpen = 0; }
  if (cust.tagged && !cust.paid && cust.tapes.length) {   // walked out with them unpaid: gone for good (order a replacement on the POS). A paid one with a missed tag is still just a rental
    for (const c of cust.tapes) c.lost = true;
    shift.stats.stolen += cust.tapes.length; shiftScore(-75 * cust.tapes.length);
    const what = cust.tapes.length === 1 ? cust.tapes[0].title : cust.tapes.length + " tapes";
    if (upg.cameras) cust.known = true;          // it's all on tape
    if (cust.known) posTerm.incident(cust.member, `${cust.sneaking ? "SHOPLIFTED" : "LEFT WITHOUT PAYING FOR"} ${what}`);   // you know who it was: it goes on their account
    logAct(`${cust.known ? memberName(cust.member) : "Someone"} walked out with ${what}: stolen`, "bad", null, -75 * cust.tapes.length);
  }   // walked out with them: gone for good (order a replacement on the POS)
  if (cust.car) { cust.car.riders?.delete(cust); if (!cust.car.riders?.size) driveOut(cust.car); }   // back in the car, and off once everyone's in (or, not parked yet: just gone)
  const c = cust.c;
  c.group.removeFromParent(); c.dispose();
  for (const m of c.parts) { const i = aimables.indexOf(m); if (i >= 0) aimables.splice(i, 1); }
  colliders.splice(colliders.indexOf(cust.box), 1);
  custs.splice(custs.indexOf(cust), 1);
  cust.c = null; cust.state = "gone";
  custArrivals.t = Math.max(custArrivals.t, (6 + Math.random() * 14) / rushLevel());   // not a revolving door
  const a = custAsks.indexOf(cust); if (a >= 0) custAsks.splice(a, 1);
}
function custInteract(cust) {                     // E on a customer: ring them up at the counter, or just say hi
  const c = cust.c;
  if (cust.sneaking) return custCatch(cust);
  if (cust.state === "asking") return custAskInteract(cust);
  if (cust.state === "tagWait") return tagFix(cust, "you");
  if (["wait", "impatient", "angry"].includes(cust.state) && !co) { coStart("player", cust); coAct("customer"); }   // start ringing them up
  else if (co?.cust === cust && co.by === "player") coAct("customer");
  else if (cust.state !== "out") {
    cust.hi = 1.4; c.setMood("happy");
    if (!cust.greeted && !cust.kid) regularSays(cust, "hi");
    if (cust.thief && !cust.greeted && Math.random() < 0.7) cust.thief = false;   // a friendly hello: suddenly they'd rather just rent it
    if (!cust.greeted) gainXp("you", "wis", 2);   // (sizing people up)
    cust.greeted = true;
  }
}
// someone sneaking out notices you watching (aimed at them a moment): half the
// time they lose their nerve and bring it to the counter
function wisTick(dt) {                          // WIS: who notices a shoplifter heading out
  for (const k of custs) {
    if (!k.sneaking || k.alarmed || !k.c) continue;
    const p = k.c.group.position;
    if (!k.wisSaid && lv("you", "wis") >= 3 && Math.hypot(player.x - p.x, player.z - p.z) < 6 + lv("you", "wis")) {   // you: the tells jump out at you
      k.wisSaid = true; k.known = true; gainXp("you", "wis", 5); logAct(`Something's off about ${memberName(k.member)}: watch the door`, "bad");
    }
    for (const e of staff) {                      // staff: a chance each second, better with WIS, to stop them on the way past
      if (!e.c || Math.hypot(e.c.group.position.x - p.x, e.c.group.position.z - p.z) > 3.5) continue;
      if (Math.random() < dt * 0.03 * lv(e, "wis")) { withEmp(e, () => empCatch(k)); break; }
    }
  }
}
function empCatch(cust) {                         // an employee stops a shoplifter: tapes back, a warning on their record
  const n = cust.tapes.length, what = n === 1 ? cust.tapes[0].title : `${n} tapes`;
  returnBin.push(...cust.tapes); refreshReturnsBin();
  cust.tapes = []; cust.holding = 0; cust.tagged = false; cust.sneaking = false; cust.known = true;
  cust.c.holdTape(0); cust.c.setMood("shock"); cust.hi = 1.5;
  shift.stats.caught++; shiftScore(150, "dana"); gainXp("dana", "wis", 20);
  posTerm.incident(cust.member, `CAUGHT SHOPLIFTING ${what}`); posTerm.incident(cust.member, "WARNED");
  logAct(`${emp.first} caught ${memberName(cust.member)} sneaking out with ${what} (back in the returns bin, a warning)`, "good", null, 150);
  custGo(cust, "leave", CUST_DOOR);
}
function custWatched(cust, dt) {
  if (!cust.sneaking || cust.alarmed || cust.fessRolled) return;
  if (aimCustomer !== cust) { cust.watchT = 0; return; }
  if ((cust.watchT = (cust.watchT || 0) + dt) < 0.8) return;
  cust.fessRolled = true; gainXp("you", "wis", 4);
  if (Math.random() >= (has("you", "wis", 10) ? 0.85 : 0.5)) return;   // ...or they keep going (Stern Look: they mostly don't)
  gainXp("you", "wis", 8);
  const c = cust.c;
  cust.sneaking = false; cust.tagged = false; cust.thief = false;
  c.holdTape(cust.tapes.length); c.setPose("hold"); c.setMood("meh"); cust.hi = 2;
  logAct(`${memberName(cust.member)} saw you watching and brought ${cust.tapes.length === 1 ? cust.tapes[0].title : "the tapes"} to the counter`, "good");
  custLine.push(cust); custToLine(cust);
}
// ---- wanting something: a title they came in for, or "got anything good?" ----
// They wait at the counter (beside the line) until someone helps. Hand them a
// tape from your hand (E); Q tells them a title's all out. Leave them long
// enough and Dana goes and gets it; longer still and they give up and look
// for themselves
const TASTE_ASK = { "horror fan": "something scary", parent: "something for the kids", "couch potato": "a show to binge",
  "action junkie": "something with some action", "date night": "something for date night", "anime kid": "some anime" };
// regulars know the place, and you: a word when you say hi, and at the counter (once a visit each). The more
// often they're in, the more they've got to say; the unhappy ones keep it short
const REG_LINES = {
  hi: ["Hey! How's it going?", "Back again, I know.", "Look who's working today.", "Hey, you're here! Good.", "Busy one today?"],
  hiTaste: t => [`Get anything new in ${t}?`, `What's good in ${t} lately?`, `I'm out of ${t} I haven't seen. Help me out.`],
  counter: ["The usual, I think.", "Anything good come in this week?", "What would you watch tonight?", "Long day?", "I'll have these back on time. Probably.", "Every Friday, right?"],
  ofYou: name => [`Tell ${name} I said hi.`, `${name} told me to rent this one.`],
  unhappy: ["Just these.", "Can we hurry this up?"],
};
const TASTE_WORDS = { "horror fan": "horror", parent: "the kids' section", "couch potato": "TV shows", "action junkie": "action", "date night": "romance", "anime kid": "anime" };
function regularSays(cust, when, by = "you") {
  if (!cust?.member || cust.kid || (cust.said ||= {})[when]) return;
  const loy = cust.member.loyalty || 0, pick = a => a[Math.floor(Math.random() * a.length)];
  let line;
  if (loy <= -30 && when === "counter") line = pick(REG_LINES.unhappy);
  else if (loy < 35) return;
  else if (when === "hi") { const t = TASTE_WORDS[cust.who.persona.taste.name]; line = pick(t && Math.random() < 0.5 ? REG_LINES.hiTaste(t) : REG_LINES.hi); }
  else { const e = staff.find(e => e.c && by === "dana" ? false : e.c); line = pick(e && Math.random() < 0.2 ? REG_LINES.ofYou(e.first) : REG_LINES.counter); }
  cust.said[when] = true; cust.hi = 2; cust.c?.setMood(loy <= -30 ? "meh" : "happy");
  if (by === "you") logAct(`${memberName(cust.member)}: "${line}"`);
}
const custAsks = [];                              // who's waiting at the counter for help, in order
const ASK_SPOT = i => ({ x: CUST_COUNTER.x + 1.2 + 0.7 * i, z: CUST_COUNTER.z + 0.1, ry: Math.PI });
const titleCopies = t => [t, ...(t.copies || [])];
const onShelfCopy = t => titleCopies(t).find(c => !c.offShelf && !c.lost && c.pos);
function custWant(cust) {
  if (custAsks.length >= 3 || cust.who.persona.maxTapes <= cust.holding) return false;   // (at their limit: nothing to ask for)
  const cats = cust.who.persona.taste.cats, r = Math.random();
  if (r < 0.16) {                                 // a title in mind: usually one that's in; now and then one that's all out
    const pool = catalog.filter(t => t.pos && !t.libLocked && (!cats.length || cats.includes(t.category)));
    const inNow = pool.filter(onShelfCopy), out = pool.filter(t => !onShelfCopy(t));
    const from = Math.random() < 0.75 || !out.length ? inNow : out; if (!from.length) return false;
    cust.want = { kind: "title", title: from[Math.floor(Math.random() * from.length)] };
  } else if (r < 0.28 && cats.length) cust.want = { kind: "rec" };
  else return false;
  cust.tries = 0; return true;
}
function custAskGo(cust) { custAsks.push(cust); custGo(cust, "toAsk", ASK_SPOT(custAsks.indexOf(cust))); }
function custAskDone(cust, then) {                // helped (or gave up): off the counter, and on with it
  const i = custAsks.indexOf(cust); if (i >= 0) custAsks.splice(i, 1);
  if (then === "pay") { custLine.push(cust); custToLine(cust); }
  else if (then === "leave") custGo(cust, "leave", CUST_DOOR);
  else if (cust.stopsLeft > 0) custNextStop(cust); else custDone(cust);
}
function custAskInteract(cust) {                  // E: hand over what's in your hand, or just "be right with you"
  if (held && !inspecting) return custHandTape(cust, held, "you");
  if (!cust.acked) { cust.acked = true; cust.t += 30; }   // "I'll go look": they'll wait a bit longer
  cust.hi = 1.2; cust.c.setMood("happy");
}
function custHandTape(cust, tape, by) {           // -> true if they took it
  if (cust.want.kind === "hold") return custHandHold(cust, tape, by);
  const c = cust.c, w = cust.want, cats = cust.who.persona.taste.cats, likes = cats.includes(tape.category), name = memberName(cust.member);
  const exact = w.kind === "title" && titleOfCopy(tape) === w.title;
  const charm = 0.02 * (lv(by, "cha") - 1);         // (CHA: a better pitch)
  const ok = exact || Math.random() < (w.kind === "title" ? (tape.category === w.title.category ? 0.6 : likes ? 0.4 : 0.12) : likes ? 0.85 : 0.2) + charm;
  const who = by === "dana" ? "dana" : "you", Who = by === "dana" ? emp.first : "You";
  if (!ok) {
    cust.tries++; c.setMood("meh"); cust.hi = 1.6;
    logAct(`${Who} offered ${name} ${tape.title}: \u201cNah, not really my thing\u201d`);
    if (cust.tries >= 2) { posTerm.loyal(cust.member, -3); custAskDone(cust); }   // they'll find something themselves
    return false;
  }
  if (by === "you") { tape.fromReturns = tape.strayFix = false; releaseFromHand(); }
  cust.tapes.push(tape); cust.holding = cust.tapes.length;
  c.holdTape(Math.min(3, cust.holding)); c.setPose("hold"); c.setMood("love"); cust.hi = 1.8;
  const fast = Math.max(0, Math.round(60 - (clockT - cust.askAt))), pts = exact ? 80 + fast : w.kind === "title" ? 40 : likes ? 80 + fast : 30;
  shiftScore(pts, who); posTerm.loyal(cust.member, exact ? 10 : w.kind === "title" ? 4 : likes ? 8 : 2);
  gainXp(by, exact ? "int" : "cha", exact ? 10 : likes ? 10 : 5);
  logAct(exact ? `${Who} found ${name} ${tape.title}` : w.kind === "title" ? `${name} took ${tape.title} instead of ${tapeName(w.title)}` : `${Who} recommended ${tape.title} to ${name}${likes ? ": right up their alley" : ""}`, "good", null, pts);
  custAskDone(cust, "pay");
  return true;
}
function holdEnd(h) {                            // a hold's done with (picked up, or it fell through): off the books; an unclaimed copy goes back out
  const i = holds.indexOf(h); if (i >= 0) holds.splice(i, 1);
  if (h.copy) { setOnShelf(h.copy, true); h.copy = null; }
  holdsRender();
}
function custHandHold(cust, tape, by) {           // their hold: only that title will do
  const c = cust.c, w = cust.want, h = w.hold, name = memberName(cust.member), who = by === "dana" ? "dana" : "you", Who = by === "dana" ? emp.first : "You";
  if (titleOfCopy(tape) !== w.title) { c.setMood("meh"); cust.hi = 1.4; logAct(`${name}: “That's not what I had on hold. It's ${tapeName(w.title)}”`); return false; }
  const setAside = tape === h.pulled || tape === h.copy;
  if (by === "you") { tape.fromReturns = tape.strayFix = false; releaseFromHand(); }
  if (tape === h.copy) h.copy = null;
  holdEnd(h);
  cust.tapes.push(tape); cust.holding = cust.tapes.length; c.holdTape(Math.min(3, cust.holding)); c.setPose("hold");
  if (setAside) {
    c.setMood("love"); cust.hi = 1.8; shiftScore(40, h.by === "dana" ? "dana" : who); posTerm.loyal(cust.member, 8); gainXp(who, "int", 6);
    logAct(`${Who} handed ${name} their hold: ${tape.title}`, "good", null, 40);
  } else {                                        // it wasn't set aside: you scrambled and found one on the floor
    c.setMood("meh"); cust.hi = 1.6; shiftScore(5, who); posTerm.loyal(cust.member, -2);
    logAct(`${name}'s hold wasn't set aside. ${Who} found a copy of ${tape.title} on the shelf: awkward, but they got it`, "", null, 5);
  }
  custAskDone(cust, "pay");
  return true;
}
function custHoldOut(cust, by = "you") {          // "you said you'd hold it!"
  const w = cust.want, name = memberName(cust.member), who = by === "dana" ? "dana" : "you";
  const had = w.hold.copy || w.hold.pulled || onShelfCopy(w.title);
  shiftScore(had ? -50 : -30, who); posTerm.loyal(cust.member, had ? -12 : -8); cust.c.setMood("angry"); cust.hi = 3;
  logAct(had ? `Told ${name} their hold for ${tapeName(w.title)} wasn't there. There was a copy right there. They were not happy`
    : `${name} came in for ${tapeName(w.title)} on hold, and there wasn't one. “You SAID you'd hold it!”`, "bad", null, had ? -50 : -30);
  holdEnd(w.hold);
  custAskDone(cust, Math.random() < 0.6 ? "leave" : null);
}
function custAllOut(cust, by = "you") {          // "sorry, all our copies are out"
  if (cust.want.kind === "hold") return custHoldOut(cust, by);
  const copy = onShelfCopy(cust.want.title), name = memberName(cust.member), who = by === "dana" ? "dana" : "you";
  if (copy) {                                     // ...it was right there
    shiftScore(-30, who); posTerm.loyal(cust.member, -5); cust.c.setMood("meh"); cust.hi = 1.5;
    logAct(`Told ${name} ${tapeName(cust.want.title)} was out, but there's one on the shelf`, "bad", null, -30);
    return custAskDone(cust);                     // they'll have a look themselves
  }
  shiftScore(10, who); posTerm.loyal(cust.member, 2); cust.c.setMood("meh"); cust.hi = 1.5; gainXp(who, "int", 3);
  logAct(`${by === "dana" ? `${emp.first} told` : "Told"} ${name} ${tapeName(cust.want.title)} is all out`, "", null, 10);
  custAskDone(cust, Math.random() < 0.5 ? "leave" : null);
}
function custAskGiveUp(cust) {
  if (cust.want.kind === "hold") return custHoldOut(cust, "you");   // (standing at the counter that long for a hold: same scene)
  shiftScore(-20); posTerm.loyal(cust.member, -8); cust.c.setMood("meh");
  logAct(`${memberName(cust.member)} gave up waiting for help at the counter`, "bad", null, -20);
  custAskDone(cust);
}
function custSneak(cust) {                        // a shoplifter: tapes under the jacket, eyes everywhere, straight for the door
  const c = cust.c;
  cust.sneaking = true; cust.tagged = cust.tapes.some(t => !t.desens); cust.alarmed = false;
  c.holdTape(0); c.setPose("idle"); c.setMood("shifty");
  custGo(cust, "leave", CUST_DOOR);
}
function custCatch(cust) {                        // E on one before they're out the door: the tapes come back
  const c = cust.c, n = cust.tapes.length, what = n === 1 ? cust.tapes[0].title : `${n} tapes`;
  returnBin.push(...cust.tapes); refreshReturnsBin();
  cust.tapes = []; cust.holding = 0; cust.tagged = false; cust.sneaking = false;
  c.holdTape(0); c.setMood("shock"); cust.hi = 1.5;
  shift.stats.caught++; shiftScore(150, "you"); gainXp("you", "wis", 20);
  logAct(`Caught ${memberName(cust.member)} sneaking out with ${what} (back in the returns bin)`, "good", null, 150);
  posTerm.incident(cust.member, `CAUGHT SHOPLIFTING ${what}`);
  if (catchCall) catchDecide(5);                  // one at a time: the last one gets a warning
  cust.path = []; cust.state = "caught"; cust.t = 20; cust.caughtWhat = what;
  catchCall = cust; catchHud();
}
// what happens to them: you decide (1-5), or after 20 s they get a warning
let catchCall = null;
const CATCH_CALLS = [
  { key: 1, label: "Ban 1 week", log: "banned for a week", rec: "BANNED 1 WEEK", act: m => posTerm.setStatus(m, "banned", 7) },
  { key: 2, label: "Ban 1 month", log: "banned for a month", rec: "BANNED 1 MONTH", act: m => posTerm.setStatus(m, "banned", 30) },
  { key: 3, label: "Cancel membership", log: "membership cancelled", rec: "MEMBERSHIP CANCELLED", act: m => posTerm.setStatus(m, "cancelled") },
  { key: 4, label: "Call the police", log: "arrested", rec: "ARRESTED", act: m => posTerm.setStatus(m, "arrested") },
  { key: 5, label: "Let them go with a warning", log: "let off with a warning", rec: "WARNED", act: () => {} },
];
function catchDecide(key) {
  const cust = catchCall, k = CATCH_CALLS.find(q => q.key === key); if (!cust || !k) return;
  catchCall = null; catchHud();
  k.act(cust.member); posTerm.incident(cust.member, k.rec);
  logAct(`${memberName(cust.member)}: ${k.log}`, key === 5 ? "" : "good");
  if (cust.c) { cust.c.setMood(key === 4 ? "alarm" : "meh"); cust.hi = 0; custGo(cust, "leave", CUST_DOOR); }   // ...and out
}
function catchHud() {
  const el = $("catchCall"); if (!catchCall) { el.style.display = "none"; return; }
  el.innerHTML = `<div class="h">CAUGHT \u00b7 ${memberName(catchCall.member)} #${catchCall.member.num} \u00b7 ${catchCall.caughtWhat}</div>` +
    CATCH_CALLS.map(q => `<span><b>${q.key}</b> ${q.label}</span>`).join("");
  el.style.display = "block";
}
// a snack from the rack, rebuilt as a plain copy for a customer's hand (the
// rack's own unit stays put, hidden until it restocks)
function snackProxy(u) {
  const g = new THREE.Group(), inv = new THREE.Matrix4();
  u.updateWorldMatrix(true, true); inv.copy(u.matrixWorld).invert();
  u.traverse(m => { if (m.isMesh) { const k = new THREE.Mesh(m.geometry, m.material); k.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld)); g.add(k); } });
  u.getWorldScale(g.scale);
  return g;
}
function custTick(dt) {
  if (custs.length < custMax() && !frontLock.locked && shiftOpen() && (custArrivals.t -= dt) <= 0) {   // locked: whoever's inside finishes up; nobody new
    if (custs.some(k => Math.hypot(k.c.group.position.x - CUST_DOOR.x, k.c.group.position.z - CUST_DOOR.z) < 1.2)) custArrivals.t = 1;   // someone's in the doorway: give them a sec
    else { const m = custPickMember(); if (m) custBringAlong(custSpawn(m)); custArrivals.t = (6 + Math.random() * 20) / rushLevel(); }   // (nobody due in: a quiet spell)
  }
  if (growth.prospects > 0 && !frontLock.locked && shiftOpen() && custs.length < custMax() + 1 && (growth.pT -= dt) <= 0) {   // somebody new, here to sign up
    growth.pT = (40 + Math.random() * 80) / rushLevel();
    const m = posTerm.prospect(custs.map(k => k.member));
    if (!m) growth.prospects = 0;
    else { const k = custSpawn(m); k.prospect = true; k.thief = false; k.returning = []; k.tickets = 0; growth.prospects--; }
  }
  wisTick(dt); custChatTick(dt);
  for (const k of [...custs]) {
    custHearAlarm(k, dt); custWatched(k, dt);
    if ((k.litterT -= dt) <= 0 && k.path.length && k.state !== "leave") { k.litterT = Infinity; const p = k.c.group.position; const r = Math.random(); messAdd(r < 0.5 ? "wrapper" : r < 0.8 ? "popcorn" : "spill", p.x, p.z); }
    custStep(k, dt);
  }
}
// the gate alarm going off: everyone's head snaps round to the gates for a
// moment; let it keep ringing and they get fed up — anyone waiting to pay
// loses patience faster
function custHearAlarm(cust, dt) {
  const c = cust.c; if (!c || cust.state === "out") return;
  if (!gateAlarm.on) { if (cust.heardAlarm) { cust.heardAlarm = cust.fedUp = false; if (cust.alarmLook > 0) { cust.alarmLook = 0; c.lookAt(null); } } return; }
  if (!cust.heardAlarm) {
    cust.heardAlarm = true; cust.alarmLook = 1.4 + Math.random() * 0.6;
    if (!cust.alarmed) { c.setMood("shock"); cust.hi = 1.2; }   // (whoever set it off has their own face on)
  }
  if (cust.alarmLook > 0) {
    const p = c.group.position, rel = Math.atan2(0 - p.x, GATE_Z - p.z) - cust.face, a = Math.atan2(Math.sin(rel), Math.cos(rel));
    c.lookAt(Math.max(-1.3, Math.min(1.3, a)));    // over the shoulder, as far as a neck goes
    if ((cust.alarmLook -= dt) <= 0) c.lookAt(null);
  }
  if (gateAlarm.t > 4 && !cust.fedUp && !cust.alarmed) { cust.fedUp = true; c.setMood("meh"); cust.hi = 2.5; }
  if (["wait", "impatient", "inLine"].includes(cust.state)) cust.t -= dt * 0.5;   // standing there listening to that
}
function custStep(cust, dt) {
  const c = cust.c, p = c.group.position, P = cust.who.persona;
  let speed = 0;
  if (cust.path.length) {                         // walking: follow the path, waiting politely if you (or someone else) is in the way
    const [tx, tz] = cust.path[0], dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
    if (d < 0.05) cust.path.shift();
    else if (yieldTo(cust, p, dx, dz, dt, av => custGo(cust, cust.state, cust.spot, av))) {}   // you're in the way
    else if (custBumps(cust, p, dx, dz, dt)) {}                                                 // another shopper is
    else if (c.busy) {}                                                                         // mid-slip, shaking off at the door
    else {
      speed = P.speed * (cust.state === "leave" && cust.tagged ? (cust.sneaking ? (cust.alarmed ? 2.4 : 1.15) : 1.4) : 1);   // storming out; a shoplifter walks briskly, and runs once the gates go off
      if (p.z < 0.25) speed = npcPace(cust, c, speed, dx / d, dz / d, dt);
      else if ((cust.slipCd = (cust.slipCd || 0) - dt) <= 0) {   // a wet floor: a puddle tracked in, nobody's mopped it
        const m = messes.find(m => m.kind === "puddle" && Math.hypot(m.x - p.x, m.z - p.z) < 0.4);
        if (m) {
          cust.slipCd = 25;
          if (Math.random() < (speed > 1.6 ? 0.7 : 0.4)) {
            c.slip(); c.setMood("shock"); cust.hi = 1.6; shiftScore(-10);
            logAct(`${cust.kid ? "A kid" : memberName(cust.member)} slipped on the wet floor: mop that puddle`, "bad", null, -10);
          }
        }
      }
      const step = Math.min(d, speed * dt); p.x += dx / d * step; p.z += dz / d * step;
      p.y = floorHeightAt(p.x, p.z);
      cust.ry = Math.atan2(dx, dz);
      if ((cust.stepD = (cust.stepD || 0) + step) > 0.7) { cust.stepD = 0; ambStep(p.x, p.z, 1); }   // footsteps
      // open any unlocked closed door right in front of them
      for (const door of doors) if (!door.open && !door.locked && !door.push) {
        const dcx = (door.shut.x0 + door.shut.x1) / 2, dcz = (door.shut.z0 + door.shut.z1) / 2;
        if (Math.hypot(p.x - dcx, p.z - dcz) < 1.1) toggleDoor(door);
      }
    }
    if (cust.tagged && !cust.alarmed && Math.abs(p.x) < 2 && cust.lastZ >= GATE_Z && p.z < GATE_Z) {   // out through the gates with a tagged tape
      cust.alarmed = true; startGateAlarm(); c.setMood("alarm");
      if (cust.paid && !cust.sneaking) {          // a paying customer: you missed a tag. Back to the counter, not happy about it
        shiftScore(-25); posTerm.loyal(cust.member, -4); cust.hi = 2.5;
        logAct(`${memberName(cust.member)} set off the gates: a tag wasn't desensitized. They're coming back to have it fixed`, "bad", null, -25);
        custGo(cust, "tagBack", TAG_FIX_SPOT);
      }
    }
    if (!cust.path.length && cust.spot?.ry !== undefined) cust.ry = cust.spot.ry;
  } else {                                        // arrived: do this stop's thing
    cust.t -= dt; cust.waitFor = null;
    custFidget(cust, dt);
    switch (cust.state) {
      case "repath": if (cust.t <= 0) custGo(cust, cust.repath.state, cust.repath.spot); break;
      case "arrive": cust.state = "boot"; cust.t = 0; break;   // in the door
      case "drivingIn": break;                    // (on their way, in the car)
      case "outside": c.setMood("off"); custGone(cust); return;   // back to their car (or off up the sidewalk)
      case "signedUp": if (cust.t <= 0) { c.holdProp(null); c.setPose("idle"); cust.stopsLeft > 0 ? custNextStop(cust) : custGo(cust, "leave", CUST_DOOR); } break;   // card in hand: now to look around
      case "caught": {                            // caught red-handed: facing you, waiting to hear what happens
        cust.ry = Math.atan2(player.x - p.x, player.z - p.z);
        if (cust.t <= 0 && catchCall === cust) catchDecide(5);
        break;
      }
      case "boot": if (cust.t <= 0) {
        c.setMood("neutral");
        if (cust.moviegoer) { if (!custPickTheaterSeat(cust)) { cust.moviegoer = false; custNextStop(cust); } break; }   // ticket in hand: straight in
        if (cust.prospect) { custLine.push(cust); custToLine(cust); }   // straight to the counter, form in hand
        else if (cust.pickup) { cust.want = { kind: "hold", title: cust.pickup.title, hold: cust.pickup }; custAskGo(cust); }   // here for their hold: they ask at the counter
        else if (cust.returning.length) custGo(cust, "dropoff", custReturnsSpot());
        else if (!cust.kid && custWant(cust)) custAskGo(cust);
        else if (!cust.kid && !cust.party && Math.random() < (playing ? 0.5 : 0.25) && custPickTheaterSeat(cust)) {}
        else custNextStop(cust);
      } break;
      case "toAsk":                               // at the counter: "excuse me..."
        cust.state = "asking"; cust.t = 75 * P.patience; cust.askAt = clockT; c.setMood("ask"); c.setPose("idle");
        logAct(cust.want.kind === "hold" ? `${memberName(cust.member)} is at the counter to pick up ${tapeName(cust.want.title)}: it's on hold for them`
          : cust.want.kind === "title" ? `${memberName(cust.member)} is at the counter looking for ${tapeName(cust.want.title)}` : `${memberName(cust.member)} is at the counter wanting ${TASTE_ASK[cust.who.persona.taste.name] || "something good"}`);
        break;
      case "asking":
        if (cust.hi <= 0 && c.mood !== "ask") c.setMood("ask");
        if (cust.t <= 0) custAskGiveUp(cust);
        break;
      case "dropoff": c.reachTo(returnSlotMesh.getWorldPosition(new THREE.Vector3())); cust.state = "dropping"; cust.t = 1.2; break;
      case "dropping": if (cust.t <= 0) {
        const owedWas = posTerm.owed(cust.member), nBack = cust.returning.length;
        for (const copy of cust.returning) {
          posTerm.checkIn(copy);
          if (Math.random() < 0.4) setWindFrac(copy, 0.15 + Math.random() * 0.85);
          const k = rentedCopies.indexOf(copy); if (k >= 0) rentedCopies.splice(k, 1);
          returnBin.push(copy);
        }
        shift.stats.returns += cust.returning.length;
        if (returnBin.length + cust.returning.length >= 15 && returnBin.length < 15) logAct(`Returns are piling up: ${returnBin.length + cust.returning.length} in the bin`, "bad");
        if (cust.member.promise) { delete cust.member.promise; logAct(`${memberName(cust.member)} slinks in with the overdue tape${nBack > 1 ? "s" : ""}: "${SHEEPISH[Math.floor(Math.random() * SHEEPISH.length)]}"`); }
        { const fee = posTerm.owed(cust.member) - owedWas;
          logAct(`${memberName(cust.member)} returned ${nBack === 1 ? cust.returning[0].title : nBack + " tapes"}${fee > 0 ? `, late: ${money(fee)} fee on their account` : ""}`, fee > 0 ? "bad" : ""); }
        refreshReturnsBin(); cust.returning = []; c.holdTape(0); c.setPose("idle"); c.reachTo(null); c.setMood("happy");
        if (Math.random() < (playing ? 0.45 : 0.2) && custPickTheaterSeat(cust)) {}
        else if (Math.random() < 0.5) custNextStop(cust);
        else custGo(cust, "leave", CUST_DOOR);
      } break;
      case "thAisle": cust.state = "thRow"; break;
      case "thRow": {                             // sidestep from the center ramp into their stadium row
        const s = cust.thSeat, dx = s.x - p.x, dz = s.rowZ - p.z, d = Math.hypot(dx, dz);
        if (d < 0.04) {
          c.setPose("sit"); cust.from = { x: p.x, y: p.y, z: p.z };
          cust.state = "thSitDown"; cust.t = 0.6; cust.ry = 0;
        } else {
          speed = P.speed * 0.85;
          const step = Math.min(d, speed * dt); p.x += dx / d * step; p.z += dz / d * step; p.y = s.y;
          cust.ry = Math.atan2(dx, dz);
        }
        break;
      }
      case "thSitDown": {
        const s = cust.thSeat, k = 1 - Math.max(0, cust.t) / 0.6;
        p.x = cust.from.x + (s.x - cust.from.x) * k;
        p.y = cust.from.y + (s.y - cust.from.y) * k;
        p.z = cust.from.z + (s.z - cust.from.z) * k;
        cust.ry = 0;
        if (cust.t <= 0) {
          cust.state = "thWatch"; cust.t = cust.moviegoer && ["arriving", "late", "on"].includes(show.status) ? Infinity : 40 + cust.who.rnd() * 80; cust.moodT = 4;   // here for the show: till it lets out
          c.setMood(playing ? "watch" : "neutral");
        }
        break;
      }
      case "thWatch": {
        const s = cust.thSeat;
        // if the player sits right in their seat, or their watch timer finishes, stand up
        if (cust.t <= 0 || (seated && seatAt && Math.hypot(seatAt.x - s.x, seatAt.z - s.z) < 0.25)) {
          c.setPose("idle"); c.setMood(playing ? "happy" : "neutral");
          cust.state = "thRowOut"; break;
        }
        if ((cust.moodT -= dt) <= 0) {
          cust.moodT = 5 + cust.who.rnd() * 8;
          c.setMood(playing ? ["watch", "watch", "happy", "love"][Math.floor(cust.who.rnd() * 4)] : ["neutral", "meh", "sleep"][Math.floor(cust.who.rnd() * 3)]);
        }
        break;
      }
      case "thRowOut": {                          // step out of the row back onto the center ramp
        const s = cust.thSeat, tx = -2.87, tz = s.rowZ, dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
        if (d < 0.05) {
          if (Math.random() < 0.4) messAdd("cup", s.x, s.z, s.y);   // left their cup under the seat
          cust.thSeat = null; cust.watchedTheater = true;
          p.y = floorHeightAt(p.x, p.z);
          if (!cust.holding && !cust.snacks.length && cust.stopsLeft > 0 && Math.random() < 0.5) custNextStop(cust);
          else if (cust.holding || cust.snacks.length) { custLine.push(cust); custToLine(cust); }
          else custGo(cust, "leave", CUST_DOOR);
        } else {
          speed = P.speed * 0.85;
          const step = Math.min(d, speed * dt); p.x += dx / d * step; p.z += dz / d * step; p.y = s.y;
          cust.ry = Math.atan2(dx, dz);
        }
        break;
      }
      case "stop": c.setMood("browse"); cust.state = "browse"; cust.t = custDwell(cust); break;
      case "browse": if (cust.fid) break; if (cust.t <= 0) custDecide(cust); break;   // (finishing a little something first: see custFidget)
      case "snack":
        { const left = cust.spot.units.filter(u => u.visible && u !== heldSnack), cold = left.filter(u => !isDrink(u.userData.snack) || drinkTemp(u) <= DRINK_WARM);
          const from = cold.length ? cold : left, names = [...new Set(from.map(u => u.userData.snack.name))], want = names[Math.floor(Math.random() * names.length)];   // anyone would reach past a warm can for a cold one
          const of = new Set(from.filter(u => u.userData.snack.name === want)), lanes = [...new Set([...of].map(snackLane))];
          const lane = lanes[Math.floor(Math.random() * lanes.length)]; cust.snackUnit = lane ? laneFront(lane, u => of.has(u)) : null; }   // pick a product, then a lane of it, and take the front one
        if (cust.snackUnit) c.reachTo(cust.snackUnit.getWorldPosition(new THREE.Vector3())); else c.setPose("reach");
        c.setMood("happy"); cust.state = "snacking"; cust.t = 1.4;
        if (cust.spot.drinks && !coolerOpen) { coolerOpen = true; cust.openedCooler = true; }
        break;
      case "snacking": if (cust.t <= 0) {
        const u = cust.snackUnit?.visible && cust.snackUnit !== heldSnack ? cust.snackUnit : null;
        if (u) { c.holdItem(snackProxy(u)); u.visible = false; cust.snacks.push(u); if (isDrink(u.userData.snack) && drinkTemp(u) > DRINK_WARM && !(drinkUnits || []).some(k => k.visible && drinkTemp(k) <= DRINK_WARM)) custWarmDrink(cust, u); }   // in hand, for real. (Warm only counts against you if there wasn't a cold one to be had)
        c.reachTo(null);
        if (cust.openedCooler) { coolerOpen = false; cust.openedCooler = false; }
        c.setPose(cust.holding ? "hold" : "idle");
        if (cust.upsell) { cust.upsell = false; cust.upsellGot = !!u; custGo(cust, "coBack", CUST_COUNTER); }   // talked into it at the register: back to finish paying
        else custDone(cust);
      } break;
      case "reach": if (cust.t <= 0) {
        if (cust.reach !== "take") { const t = cust.tapes.pop(); if (Math.random() < 0.25) misshelve(t, cust.spot); else setOnShelf(t, true); }   // put back: into its slot, or (a quarter of the time) just shoved in anywhere
        const got = cust.reachCopy && !cust.reachCopy.offShelf ? cust.reachCopy : cust.reach !== "return" && custPickCopy(cust);
        if (cust.reach !== "return" && got) { setOnShelf(got, false); cust.tapes.push(got); }
        c.reachTo(null);
        cust.holding = cust.tapes.length;
        c.holdTape(cust.holding); c.setPose(cust.holding ? "hold" : "idle");
        cust.stopsLeft > 0 ? custNextStop(cust) : custDone(cust);
      } break;
      case "coBack":                              // back at the register with the snack
        cust.state = "checkout"; c.setPose("wait"); c.setMood("happy");
        if (co?.cust === cust) {
          co.away = false; co.idle = 0;
          if (cust.upsellGot) { co.pts += 40; co.upsold = true; } else logAct(`${memberName(cust.member)} came back empty-handed: that rack's cleaned out`);
          coRebill(); coProps(); coHud();
        }
        break;
      case "checkout":
        if (co && (co.idle = (co.idle || 0) + dt) > 30) {
          const fill = co.by === "player" && staff.find(e => e.state === "post" && withEmp(e, () => jobPri("register")) < 9);
          if (fill) { co.by = "dana"; co.emp = fill; co.idle = 0; coHud(); }
          else if (co.idle > 45) {
            shift.stats.walkouts++; shiftScore(-100); posTerm.loyal(cust.member, -15); logAct(`${memberName(cust.member)} gave up on the checkout and walked out`, "bad", -co.total, -100);
            c.holdTape(cust.tapes.length);
            cust.tagged = cust.tapes.some(t => !t.desens); drawerOpen = 0; co = null; coHud();
            c.setMood("angry"); c.holdProp(null); c.setPose(cust.tapes.length ? "hold" : "idle"); custGo(cust, "leave", CUST_DOOR);
          }
        }
        break;
      case "queue": c.setPose("wait"); c.setMood("wait"); cust.state = "inLine"; cust.t = 45 * P.patience * linePatience(); break;
      case "inLine": if (cust.t <= 0 && c.mood !== "impatient") c.setMood("impatient"); break;
      case "counter": if (!registerStaffed()) { dingBell(); for (const e of staff) withEmp(e, () => empSummon()); } c.setPose("wait"); c.holdProp(cust.prospect ? "form" : cust.tapes.length ? "card" : "cash");
        c.setMood("wait"); cust.state = "wait"; cust.t = 25 * P.patience * linePatience(); break;
      case "wait": if (cust.t <= 0) { dingBell(); for (const e of staff) withEmp(e, () => empSummon()); c.setMood("impatient"); cust.state = "impatient"; cust.t = 15 * P.patience * linePatience(); } break;
      case "impatient": if (cust.t <= 0) { c.setMood("angry"); cust.state = "angry"; cust.t = 6; } break;
      case "angry": if (cust.t <= 0) { shift.stats.walkouts++; shiftScore(-100); posTerm.loyal(cust.member, -15); logAct(`${memberName(cust.member)} got tired of waiting and walked out`, "bad", null, -100); cust.tagged = cust.tapes.length > 0; cust.alarmed = false; c.setPose("hold"); custGo(cust, "leave", CUST_DOOR); } break;
      case "tagBack": c.setPose("hold"); c.setMood("impatient"); cust.state = "tagWait"; cust.t = 30 * P.patience; break;   // at the end of the counter, tape held out
      case "tagWait": if (cust.t <= 0) {          // nobody fixed it: out they go anyway, alarm or no
        shiftScore(-50); posTerm.loyal(cust.member, -8); c.setMood("angry"); cust.tagged = false;
        logAct(`${memberName(cust.member)} gave up waiting to have their tag fixed and left`, "bad", null, -50);
        custGo(cust, "leave", CUST_DOOR);
      } break;
      case "paid": if (cust.t <= 0) { c.setMood("happy"); if (custPartners(cust).length) custTagAlong(cust); else custGo(cust, "leave", CUST_DOOR); } break;   // (paid up, but the others aren't done)
      case "tagAlong": custTagAlongTick(cust); break;
      case "chat": if (cust.t <= 0) { c.talk(false); c.lookAt(null); cust.chatting = null; cust.state = "browse"; cust.t = 0.5 + Math.random(); } break;
      case "leave": cust.path = [INSIDE_DOOR, ...(cust.outside || [OUTSIDE_IN]).slice().reverse()]; cust.state = "outside"; break;   // out the door, back the way they came
      case "out": if (cust.t <= 0) { window.StoreAmbience?.chime(CUST_DOOR.x, 2.3, 0.2, heardFrom(CUST_DOOR.x, 0.2, false)); custGone(cust); } return;
    }
  }
  if (cust.hi > 0 && (cust.hi -= dt) <= 0) c.setMood({ browse: "browse", thWatch: playing ? "watch" : "neutral", wait: "wait", inLine: "wait", impatient: "impatient", angry: "angry" }[cust.state] || (cust.holding ? "happy" : "neutral"));
  cust.lastZ = p.z;
  cust.face += Math.atan2(Math.sin(cust.ry - cust.face), Math.cos(cust.ry - cust.face)) * Math.min(1, dt * 8);
  c.group.rotation.y = cust.face;
  const cr = cust.squeeze > 0 ? 0 : 0.22;
  Object.assign(cust.box, { x0: p.x - cr, x1: p.x + cr, z0: p.z - cr, z1: p.z + cr });
  npcEnv(cust, c, p.z < 0.25, dt);
  c.tick(dt, speed);
}
