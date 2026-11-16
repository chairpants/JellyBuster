// ---- the bus (BUS, store/core.js): its bay past the shops, east of the lot, pulled in off the store side's lane so it stops out of the traffic;
// the stop behind its curb (a shelter on a pad: glass, a bench, a lit ad, the sign on its pole, a bin) and a path from it up to the end of the
// store's walk. And the bus itself, on the hour at a quarter past, first to last: along the road eastbound, in off the lane into the bay, the doors
// open, off get its riders and on get whoever's waiting, then out into the lane when there's a gap behind it, and away. Who rides it: people
// going by on the walk, next door's on foot, and the store's regulars who don't drive (m.bus, kept on their record like m.car: store/shoppers.js).
// Waiting, they sit on the bench or stand about the pad. Built from buildGrounds (exterior/grounds.js); busTick runs from the main loop ----
const busStop = { spots: [], glow: [], g: null };   // the waiting spots (bench seats first), what lights up after dark
function buildBusStop({ lam, ext }) {
  const g = busStop.g = new THREE.Group(); scene.add(g);
  const K = outdoorKit(), B = BUS, [px0, px1, pz0, pz1] = B.pad;
  const flat = (geo, m, y) => { const o = new THREE.Mesh(geo, m); o.rotation.x = -Math.PI / 2; o.position.y = y; g.add(o); return o; };
  const shape = pts => { const s = new THREE.Shape(); pts.forEach(([x, z], i) => i ? s.lineTo(x, -z) : s.moveTo(x, -z)); return new THREE.ShapeGeometry(s); };   // (shape space: x, -z)
  const rect = (x0, x1, z0, z1) => shape([[x0, z0], [x1, z0], [x1, z1], [x0, z1]]);
  // the bay: paved down at the road's level; grass in the corners its tapers leave; a curb round its back; a broken white line where it leaves the lane
  flat(shape([[B.in, LOT.roadNear], [B.x0, B.back], [B.x1, B.back], [B.out, LOT.roadNear]]), mat.road, LOT.y + 0.002);
  flat(shape([[B.in, LOT.roadNear], [B.in, B.back], [B.x0, B.back]]), mat.grass, 0);
  flat(shape([[B.out, LOT.roadNear], [B.x1, B.back], [B.out, B.back]]), mat.grass, 0);
  for (const [[ax, az], [bx, bz]] of [[[B.in, LOT.roadNear], [B.x0, B.back]], [[B.x0, B.back], [B.x1, B.back]], [[B.x1, B.back], [B.out, LOT.roadNear]]]) {
    const L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L, c = new THREE.Mesh(new THREE.BoxGeometry(L + 0.1, CURB_H, 0.15), mat.curb);
    c.position.set((ax + bx) / 2 - uz * 0.075, CURB_Y, (az + bz) / 2 + ux * 0.075); c.rotation.y = Math.atan2(-uz, ux); g.add(c);   // (on the grass side of the line)
  }
  { const dg = new THREE.PlaneGeometry(0.9, 0.12); for (let x = B.in + 0.6; x < B.out - 0.6; x += 1.8) { const d = flat(dg, mat.lineWhite, LOT.y + 0.004); d.position.set(x, LOT.y + 0.004, LOT.roadNear + 0.12); } }
  { const c = document.createElement("canvas"); c.width = 256; c.height = 96; const x2 = c.getContext("2d"); x2.fillStyle = "#e8e8e8"; x2.font = "bold 80px Arial"; x2.textAlign = "center"; x2.textBaseline = "middle"; x2.fillText("BUS", 128, 52);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    const w = flat(new THREE.PlaneGeometry(2.6, 0.97), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.85, depthWrite: false }), LOT.y + 0.005); w.position.set(B.x0 + 2.2, LOT.y + 0.005, B.z); w.rotation.z = Math.PI / 2; }   // (reading the way the bus comes in)
  // the pad, the path up to the walk, and the walk carried on past the lot's end to meet it
  flat(rect(px0, px1, pz0, pz1), mat.sidewalk, 0.008);
  flat(rect(B.path[0], B.path[1], pz1 - 0.05, -1.8), mat.sidewalk, 0.008);
  flat(rect(B.walkTo, B.path[1], -1.8, 0), mat.sidewalk, 0.008);
  // the shelter: posts, a roof, glass across the back and the west end, a lit ad at the east end, a bench, a strip light under the roof
  const SX0 = B.stop - 5.7, SX1 = B.stop - 1.1, back = pz1 - 0.22, front = pz1 - 1.55, FRAME = 0x3a4650;
  for (const x of [SX0, SX1]) for (const z of [back, front]) K.box(FRAME, 0.08, 2.4, 0.08, x, 1.2, z);
  K.box(0x2f3a42, SX1 - SX0 + 0.5, 0.08, back - front + 0.6, (SX0 + SX1) / 2, 2.44, (back + front) / 2 - 0.05, -0.05, 0, 0);   // the roof, falling to the front
  K.box(FRAME, SX1 - SX0, 0.06, 0.06, (SX0 + SX1) / 2, 2.35, back); K.box(FRAME, SX1 - SX0, 0.06, 0.06, (SX0 + SX1) / 2, 0.12, back);
  const BENCH = { x0: SX0 + 0.5, x1: SX1 - 0.5, z: back - 0.32, y: 0.46 };
  K.box(0x6b4a2c, BENCH.x1 - BENCH.x0, 0.05, 0.38, (BENCH.x0 + BENCH.x1) / 2, BENCH.y - 0.025, BENCH.z);
  for (const x of [BENCH.x0 + 0.15, (BENCH.x0 + BENCH.x1) / 2, BENCH.x1 - 0.15]) K.box(FRAME, 0.05, BENCH.y - 0.05, 0.32, x, (BENCH.y - 0.05) / 2, BENCH.z);
  K.cyl(0x2d4f3a, 0.26, 0.24, 0.9, SX0 - 0.6, 0.45, back - 0.3, 14); K.cyl(0x1d2a22, 0.27, 0.27, 0.05, SX0 - 0.6, 0.92, back - 0.3, 14);   // the bin
  // the sign: a pole at the curb by where the door stops, and the plate on it, both sides
  const signX = B.door[0] + 1.6, signZ = B.back + 0.35;
  K.cyl(0x8e9398, 0.035, 0.035, 2.9, signX, 1.45, signZ, 8);
  const plate = (() => { const c = document.createElement("canvas"); c.width = 192; c.height = 256; const x2 = c.getContext("2d");
    x2.fillStyle = "#f2f2ee"; x2.fillRect(0, 0, 192, 256); x2.fillStyle = "#1b5aa6"; x2.fillRect(8, 8, 176, 120);
    x2.fillStyle = "#fff"; x2.font = "bold 46px Arial"; x2.textAlign = "center"; x2.fillText("BUS", 96, 62); x2.fillText("STOP", 96, 112);
    x2.fillStyle = "#1b1b1b"; x2.font = "bold 64px Arial"; x2.fillText("7", 96, 196); x2.font = "bold 22px Arial"; x2.fillText("DOWNTOWN", 96, 236);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshLambertMaterial({ map: t }); })();
  for (const ry of [Math.PI / 2, -Math.PI / 2]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.6), plate); p.position.set(signX + (ry > 0 ? 0.04 : -0.04), 2.55, signZ); p.rotation.y = ry; g.add(p); }
  g.add(K.mesh());
  const glass = new THREE.MeshLambertMaterial({ color: 0xa9cad6, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
  { const p = new THREE.Mesh(new THREE.PlaneGeometry(SX1 - SX0, 2.1), glass); p.position.set((SX0 + SX1) / 2, 1.23, back); g.add(p); }
  { const p = new THREE.Mesh(new THREE.PlaneGeometry(back - front, 2.1), glass); p.position.set(SX0, 1.23, (back + front) / 2); p.rotation.y = Math.PI / 2; g.add(p); }
  { const c = document.createElement("canvas"); c.width = 256; c.height = 384; const x2 = c.getContext("2d");   // the ad: the store, of course
    const gr = x2.createLinearGradient(0, 0, 0, 384); gr.addColorStop(0, "#0f226b"); gr.addColorStop(1, "#1b3fa0"); x2.fillStyle = gr; x2.fillRect(0, 0, 256, 384);
    x2.fillStyle = "#ffd400"; x2.font = "bold 40px Arial"; x2.textAlign = "center"; x2.fillText("JELLY", 128, 90); x2.fillText("BUSTER", 128, 136);
    x2.fillStyle = "#fff"; x2.font = "bold 26px Arial"; x2.fillText("NEW RELEASES", 128, 210); x2.fillText("EVERY TUESDAY", 128, 244);
    x2.font = "20px Arial"; x2.fillText("right up the walk", 128, 330);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.MeshLambertMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0 }); busStop.glow.push({ m, on: 0.9 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.0, back - front - 0.1), [m, m, lam(FRAME), lam(FRAME), lam(FRAME), lam(FRAME)]);   // (the poster on both faces)
    box.position.set(SX1, 1.25, (back + front) / 2); g.add(box); }
  { const m = new THREE.MeshLambertMaterial({ color: 0xdedcd2, emissive: 0xfff2d0, emissiveIntensity: 0 }); busStop.glow.push({ m, on: 1.4 });
    const s = new THREE.Mesh(new THREE.BoxGeometry(SX1 - SX0 - 0.6, 0.03, 0.12), m); s.position.set((SX0 + SX1) / 2, 2.38, (back + front) / 2); g.add(s); }
  ext(g);
  // in the way: the glass, the ad, the bench (low: you can get up on it, or trip over it at a run), the bin, the pole
  colliders.push({ x0: SX0, x1: SX1, z0: back - 0.06, z1: back + 0.06 }, { x0: SX0 - 0.06, x1: SX0 + 0.06, z0: front, z1: back },
    { x0: SX1 - 0.08, x1: SX1 + 0.08, z0: front + 0.05, z1: back - 0.05 }, { x0: BENCH.x0, x1: BENCH.x1, z0: BENCH.z - 0.19, z1: BENCH.z + 0.19, y1: BENCH.y },
    { x0: SX0 - 0.88, x1: SX0 - 0.32, z0: back - 0.58, z1: back - 0.02, y1: 0.95 }, { x0: signX - 0.06, x1: signX + 0.06, z0: signZ - 0.06, z1: signZ + 0.06 });
  // where people wait: the bench's three seats, then about the pad (standing, facing the road)
  for (let i = 0; i < 3; i++) busStop.spots.push({ x: BENCH.x0 + 0.55 + i * ((BENCH.x1 - BENCH.x0 - 1.1) / 2), z: BENCH.z, sit: BENCH.y });
  for (const [x, z] of [[SX0 - 1.4, pz0 + 1.2], [SX1 + 0.6, pz0 + 1.0], [SX1 + 1.4, pz0 + 1.5], [SX0 - 2.4, pz0 + 0.9], [SX1 + 0.4, pz0 + 1.8], [SX0 - 1.0, pz0 + 1.9]]) busStop.spots.push({ x, z });
  bus.g = busMesh(); bus.g.visible = false; scene.add(bus.g); ext(bus.g);
}
// ---- the bus itself: an old transit bus, cream with a blue and red stripe, its route on the sign over the windshield. Built nose along +x
// (like the cars: exterior/lot.js), the doors on its right (+z), the curb side going east ----
const BUS_AXLE = { front: 3.6, rear: -3.1 };    // where its axles are, from its middle along it (the wheelbase between them)
const bus = { g: null, front: new THREE.Vector2(), rear: new THREE.Vector2(), phase: "off", slot: null, path: null, len: 1, u: 0, v: 0, t: 0, doors: 0, doorsTo: 0, parts: null, col: null, off: [], drops: 0, boarding: new Set() };
function busMesh() {
  const g = new THREE.Group(), K = outdoorKit(), L = BUS.len, W = BUS.wid, H = 3.0, CREAM = 0xe9e2c6;
  K.box(CREAM, L, 1.0, W, 0, 0.85, 0); K.box(CREAM, L, 0.6, W, 0, 2.65, 0); K.box(0xdcd5b9, L - 0.3, 0.06, W - 0.3, 0, H - 0.02, 0);
  K.box(0x1f5fa8, L + 0.02, 0.12, W + 0.02, 0, 1.28, 0); K.box(0xb3322a, L + 0.02, 0.08, W + 0.02, 0, 1.12, 0);
  for (const s of [-1, 1]) K.box(0x16181b, 0.18, 0.28, W + 0.04, s * (L / 2 + 0.02), 0.42, 0);   // the bumpers
  for (const [x, ry] of [[L / 2 - 0.12, 0], [-L / 2 + 0.12, Math.PI]]) for (const z of [-0.85, 0.85]) K.box(0xd8d4c4, 0.06, 0.2, 0.34, x + Math.cos(ry) * 0.12, 0.75, z);   // lamp housings
  for (const s of [-1, 1]) { K.cyl(0x141414, 0.5, 0.5, 0.3, BUS_AXLE.rear, 0.5, s * (W / 2 - 0.12), 18, Math.PI / 2); K.cyl(0x9a9ea2, 0.26, 0.26, 0.32, BUS_AXLE.rear, 0.5, s * (W / 2 - 0.11), 12, Math.PI / 2); }   // (the back wheels: fixed)
  K.box(0x0d0f12, 0.4, 0.25, W - 0.2, 0, 0.32, 0);   // (under it, dark)
  g.add(K.mesh());
  // the glass all round, its own material: lit from inside after dark
  const glass = new THREE.MeshLambertMaterial({ color: 0x24323c, emissive: 0xfff0c8, emissiveIntensity: 0 });
  { const band = new THREE.Mesh(new THREE.BoxGeometry(L - 0.04, 1.0, W - 0.02), glass); band.position.y = 1.85; g.add(band); }
  for (const x of [-L / 2 + 0.9, -1.8, 1.2]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, W + 0.01), new THREE.MeshLambertMaterial({ color: CREAM })); p.position.set(x, 1.85, 0); g.add(p); }   // (pillars between the windows)
  // the route over the windshield and down the side, and the lamps: their own materials, lit (or not) in busTick
  const sign = (() => { const c = document.createElement("canvas"); c.width = 512; c.height = 64; const x2 = c.getContext("2d"); x2.fillStyle = "#0b0b0b"; x2.fillRect(0, 0, 512, 64);
    x2.fillStyle = "#ffb627"; x2.font = "bold 46px monospace"; x2.textBaseline = "middle"; x2.fillText(" 7  DOWNTOWN", 8, 34);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshBasicMaterial({ map: t }); })();
  { const s = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.4, 0.3), sign); s.position.set(L / 2 + 0.012, 2.62, 0); s.rotation.y = Math.PI / 2; g.add(s); }
  { const s = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.28), sign); s.position.set(L / 2 - 2.6, 2.62, W / 2 + 0.012); g.add(s); }
  const head = new THREE.MeshBasicMaterial({ color: 0x8a8670 }), tail = new THREE.MeshBasicMaterial({ color: 0x4a0f0f });
  for (const z of [-0.85, 0.85]) { const h = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.16), head); h.position.set(L / 2 + 0.16, 0.75, z); h.rotation.y = Math.PI / 2; g.add(h);
    const t = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.3), tail); t.position.set(-L / 2 - 0.16, 0.95, z); t.rotation.y = -Math.PI / 2; g.add(t); }
  // the doors, on the curb side: each two leaves that fold away, front (by the driver) and middle
  const leafM = new THREE.MeshLambertMaterial({ color: 0x2b3a44 }), leaves = [];
  for (const cx of [L / 2 - 1.35, -0.6]) for (const s of [-1, 1]) {
    const lf = new THREE.Mesh(new THREE.BoxGeometry(0.52, 2.35, 0.05), leafM); lf.position.set(cx + s * 0.27, 1.5, W / 2 + 0.01); lf.userData = { x: cx + s * 0.27, s }; g.add(lf); leaves.push(lf);
  }
  const steer = [];                                // the front wheels: each on its own kingpin, turned by busPlace
  for (const s of [-1, 1]) { const kp = new THREE.Group(); kp.position.set(BUS_AXLE.front, 0.5, s * (W / 2 - 0.12)); g.add(kp); steer.push(kp);
    const KW = outdoorKit(); KW.cyl(0x141414, 0.5, 0.5, 0.3, 0, 0, 0, 18, Math.PI / 2); KW.cyl(0x9a9ea2, 0.26, 0.26, 0.32, 0, 0, s * 0.01, 12, Math.PI / 2); kp.add(KW.mesh()); }
  bus.parts = { glass, head, tail, leaves, steer };
  return g;
}
// ---- the run ----
const busBay = () => BUS.stop - BUS.len / 2;     // where its middle stops, in the bay
const busComing = (within = 1.2) => { const h = shift.h % 24; return bus.phase !== "off" || (h > BUS.first - within && h < BUS.last + 0.05); };   // will there be a bus, within that many hours?
function busTraffic() { return bus.phase === "approach" || bus.phase === "leave" ? [{ g: bus.g, id: 1e9, back: false }] : []; }   // (in the lot's traffic: cars behind it slow for it)
function busRide(fn) { bus.off.push(fn); }       // somebody on the next one: fn() at the door when it's in (-> false if they're not, after all)
function busWaitWith(c, box = false) {             // (store/shoppers.js) somebody done here and off to wait for it: a walker, now, walking to a spot. -> true if there's a bus to wait for
  if (!busComing(1.5)) return false;
  const w = { c, path: [], speed: 1.1 + Math.random() * 0.3, then: null, box }; walkers.push(w); busToSpot(w); return true;
}
function busToSpot(w) {                            // to the first free spot, and wait there: sat on the bench, or stood facing the road
  const taken = new Set(walkers.map(o => o.spot).filter(Boolean)), s = busStop.spots.find(p => !taken.has(p)) || busStop.spots.at(-1);
  w.spot = s; const p = w.c.group.position;
  w.path = [...(p.z > BUS.pad[3] ? [[BUS.path[0] + 0.7, BUS.pad[3] + 0.3]] : []), [s.x, s.z + (s.sit ? -0.45 : 0)], [s.x, s.z]];   // (in under the roof from the front)
  w.then = w => { w.waiting = true; w.c.group.rotation.y = Math.PI; if (s.sit && !w.box) { w.c.setPose("sit", { hipY: 0.45 }); w.c.group.position.y = s.sit + 0.03 - 0.45; } };
}
const BUS_UP = () => [[BUS.door[0], BUS.back + 1.0], [BUS.path[0] + 0.7, BUS.back + 1.0], [BUS.path[0] + 0.7, SIDEWALK_Z], [BUS.walkTo, SIDEWALK_Z]];   // from the door, up the path to the walk
const busOutsidePath = () => [BUS.door, ...BUS_UP(), OUTSIDE_IN];   // (store/shoppers.js) off the bus and up to the store's door
// How it drives: the path is where its front axle goes, and the front wheels steer it there; the back axle just follows, dragged along behind
// at the wheelbase (so the back cuts in on a turn, and the body swings round from the back wheels, not its middle). Pulling in, a long easy
// S off the lane into the bay, then straight on up it to straighten out; pulling out, the same back into the lane
const busCurve = pts => new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, "centripetal");
const busS = (x0, z0, x1, z1, n = 14) => Array.from({ length: n + 1 }, (_, i) => { const k = i / n; return [x0 + (x1 - x0) * k, z0 + (z1 - z0) * k * k * (3 - 2 * k)]; });   // an even S from one line to another
const busStopF = () => busBay() + BUS_AXLE.front;   // where the front axle stops
function busStart() {
  const Ln = BUS.lane, f0 = -110;
  bus.path = busCurve([[f0, Ln], [BUS.in - 30, Ln], ...busS(BUS.in - 3, Ln, BUS.x0 + 1, BUS.z), [busStopF(), BUS.z]]);
  bus.len = bus.path.getLength(); bus.u = 0; bus.v = 11; bus.phase = "approach"; bus.g.visible = true; bus.drops = 0; busRiders();
  bus.front.set(f0, Ln); bus.rear.set(f0 - (BUS_AXLE.front - BUS_AXLE.rear), Ln);
  busPlace(); window.StoreAmbience?.drive?.(1, 13);
}
function busPlace() {                              // the front axle to its point on the path at u; the back one trails it; the body between them
  const p = bus.path.getPointAt(bus.u), WB = BUS_AXLE.front - BUS_AXLE.rear;
  bus.front.set(p.x, p.z);
  const d = bus.front.clone().sub(bus.rear), L = d.length() || 1; d.multiplyScalar(1 / L); bus.rear.copy(bus.front).addScaledVector(d, -WB);   // (dragged along behind)
  const ry = Math.atan2(-d.y, d.x), cx = bus.rear.x + d.x * -BUS_AXLE.rear, cz = bus.rear.y + d.y * -BUS_AXLE.rear;
  bus.g.position.set(cx, LOT.y, cz); bus.g.rotation.y = ry;
  const t = bus.path.getTangentAt(Math.min(0.999, bus.u)), steer = Math.atan2(Math.sin(Math.atan2(-t.z, t.x) - ry), Math.cos(Math.atan2(-t.z, t.x) - ry));   // the front wheels: the way the path goes, against the way the bus points
  for (const kp of bus.parts.steer) kp.rotation.y += (Math.max(-0.6, Math.min(0.6, steer)) - kp.rotation.y) * 0.35;
  const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry)), hx = BUS.len / 2 * c + BUS.wid / 2 * s, hz = BUS.len / 2 * s + BUS.wid / 2 * c;
  if (!bus.col) { bus.col = { x0: 0, x1: 0, z0: 0, z1: 0 }; colliders.push(bus.col); }
  Object.assign(bus.col, { x0: cx - hx, x1: cx + hx, z0: cz - hz, z1: cz + hz, y1: LOT.y + 3.0 });   // (it's in the way: nobody walks through a bus)
  if (bus.v > 2) { const fx = d.x, fz = d.y, dx = player.x - cx, dz = player.z - cz, r = player.r + 0.05;   // driven into you: knocked flying (store/player.js)
    if (Math.abs(dx * fx + dz * fz) < BUS.len / 2 + r && Math.abs(dx * fz - dz * fx) < BUS.wid / 2 + r) carHit(fx * bus.v, fz * bus.v, cx, cz, BUS.wid / 2, "Hit by the bus"); }
}
function busGone() { bus.phase = "off"; bus.g.visible = false; if (bus.col) { colliders.splice(colliders.indexOf(bus.col), 1); bus.col = null; } }
function busTick(dt) {
  if (!bus.g) return;
  const h = shift.h % 24, night = tod.level < 0.5;
  for (const { m, on } of busStop.glow) m.emissiveIntensity = night ? on : 0;
  const P = bus.parts; P.glass.emissiveIntensity = night ? 0.55 : 0; P.head.color.setHex(night ? 0xfff6d8 : 0x8a8670);
  // the timetable: a quarter past every hour, first to last. (Skip the clock past one, and it's the next one that comes)
  const slot = Math.floor(h - 0.25);
  if (bus.slot == null) bus.slot = slot;
  if (slot !== bus.slot && bus.phase === "off" && h >= BUS.first - 0.01 && h <= BUS.last + 0.3) {
    if (!(carsOut?.lane?.(1) || []).some(p => p.x < -80)) { bus.slot = slot; busStart(); }   // (not on top of a car just starting out along the road)
  } else if (slot !== bus.slot && bus.phase === "off") bus.slot = slot;
  // nobody left to wait for: off they go, back up the path and away along the walk
  if (!busComing(0.6)) for (const w of walkers) if (w.spot) { w.spot = null; w.waiting = false; w.c.setPose(w.box ? "carry" : "idle"); w.c.group.position.y = 0; w.path = [...BUS_UP().slice(1), [-24, SIDEWALK_Z - Math.random() * 0.3]]; w.then = walkerGone; }
  if (bus.phase === "off") return;
  const sc = busBay();
  bus.doors += Math.sign(bus.doorsTo - bus.doors) * Math.min(Math.abs(bus.doorsTo - bus.doors), dt / 0.7);   // the doors folding open, or shut
  for (const lf of P.leaves) { const k = bus.doors; lf.scale.x = 1 - 0.75 * k; lf.position.x = lf.userData.x + lf.userData.s * 0.2 * k; lf.position.z = BUS.wid / 2 + 0.01 - 0.14 * k; }   // (folding in, back against the door's frame)
  P.tail.color.setHex(bus.phase === "dwell" || bus.v < 3 ? 0xff2a1a : night ? 0x9a1a14 : 0x4a0f0f);   // (on the brake, or just the running lamps)
  if (bus.phase === "approach") {                  // along the lane and in: slowing to stop with its nose at the sign
    const rem = (1 - bus.u) * bus.len, want = Math.min(11, Math.sqrt(2 * 1.3 * rem) + 0.15);
    bus.v = carsOut?.ahead?.(bus.g, bus.v) ? Math.max(0, bus.v - 8 * dt) : Math.min(want, bus.v + 2 * dt);
    { const d = CROSS.x - bus.g.position.x - BUS.len / 2 - CROSS.w / 2 - 0.8; if (d > -0.3 && d < 35 && crossBusy()) bus.v = Math.min(bus.v, Math.sqrt(Math.max(0, 2 * 4 * d))); }   // somebody on the crosswalk (exterior/parkgoers.js)
    bus.u = Math.min(1, bus.u + bus.v * dt / bus.len); busPlace();
    if (rem < 0.05) { bus.phase = "dwell"; bus.t = 0; bus.v = 0; bus.doorsTo = 1; bus.next = 1.4; }
  } else if (bus.phase === "dwell") {              // doors open: off they get, one at a time, then on get whoever's waiting
    bus.t += dt;
    if (bus.doors >= 1 && bus.t >= bus.next && bus.off.length) {
      bus.next = bus.t + 0.9 + Math.random() * 0.5;
      while (bus.off.length && !bus.off.shift()()) {}   // (somebody who isn't coming after all: the next)
      bus.drops++;
    }
    if (bus.doors >= 1 && !bus.off.length && bus.t > bus.next) for (const w of walkers) if (w.waiting && !bus.boarding.has(w)) {   // their turn: up and to the door
      bus.boarding.add(w); w.waiting = false; w.spot = null; w.c.setPose(w.box ? "carry" : "idle"); w.c.group.position.y = 0;
      w.path = [[BUS.door[0], BUS.door[1] + 0.6], BUS.door]; w.then = w => { bus.boarding.delete(w); walkerGone(w); };
    }
    for (const w of bus.boarding) if (!walkers.includes(w)) bus.boarding.delete(w);
    const waitingOn = bus.off.length || bus.boarding.size || walkers.some(w => w.waiting);
    if (!waitingOn && bus.t > Math.max(6, bus.next + 1.5)) { bus.doorsTo = 0; if (bus.doors <= 0) bus.phase = "gap"; }
    if (bus.t > 60) { bus.off.length = 0; bus.doorsTo = 0; if (bus.doors <= 0) bus.phase = "gap"; }   // (it won't wait forever)
  } else if (bus.phase === "gap") {                // a look back down the lane for a gap, then out
    if ((carsOut?.lane?.(1) || []).some(p => p.x > sc - 40 && p.x < sc + 8)) return;
    bus.path = busCurve([[busStopF(), BUS.z], ...busS(BUS.x1 - 1.5, BUS.z, BUS.out + 3, BUS.lane), [BUS.out + 30, BUS.lane], [110, BUS.lane]]);
    bus.len = bus.path.getLength(); bus.u = 0; bus.v = 0; bus.phase = "leave"; window.StoreAmbience?.drive?.(1, 9);
  } else if (bus.phase === "leave") {
    bus.v = carsOut?.ahead?.(bus.g, bus.v) ? Math.max(0, bus.v - 8 * dt) : Math.min(11, bus.v + 1.3 * dt);
    bus.u = Math.min(1, bus.u + bus.v * dt / bus.len); busPlace();
    if (bus.u >= 1) busGone();
  }
}
// ---- who's on it: dropped off at each stop, people going by (on along the walk, west) and, waiting for it, people come down the walk to catch it ----
function busRiders() {                             // (when it sets out) a couple of strangers on board, getting off here
  for (let n = Math.floor(Math.random() * 3); n > 0; n--) busRide(() => { if (walkers.length >= 8) return false;
    walkerMake([BUS.door, ...BUS_UP().slice(0, 3), [-24, SIDEWALK_Z - Math.random() * 0.4]], walkerGone); return true; });
}
function busCatcher() {                            // (walkerTick) somebody going by, off down the walk to the stop instead
  if (!busComing(0.8)) return false;
  const from = Math.random() < 0.7 ? -24 : 24, w = walkerMake([[from, SIDEWALK_Z - Math.random() * 0.4], [BUS.walkTo, SIDEWALK_Z], [BUS.path[0] + 0.7, SIDEWALK_Z]], null);
  w.then = w => busToSpot(w); return true;
}
