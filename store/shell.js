// ---------------- store shell ----------------
function box(w, h, d, m, x, y, z) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y, z); scene.add(b); return b;
}
function solid(w, h, d, m, x, y, z) { colliders.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, y0: y - h / 2, y1: y + h / 2 }); return box(w, h, d, m, x, y, z); }
// a straight wall from a0 to a1 along x (alongX) or z, centered on `at`, with
// DOOR_H-tall openings at each of `gaps` — a center (door-wide) or { c, w }. Walls are real colliders,
// padded so the player stops 0.5 m from a wall's centerline
const WALL_T = 0.2, WALL_PAD = 0.08;
function wall(a0, a1, at, alongX, h, m, gaps = []) {
  const seg = (b0, b1, y0, y1) => {
    const len = b1 - b0, c = (b0 + b1) / 2, y = (y0 + y1) / 2;
    aimBlockers.push(alongX ? box(len, y1 - y0, WALL_T, m, c, y, at) : box(WALL_T, y1 - y0, len, m, at, y, c));
    if (y0 > 0) return;                       // headers over doors don't block the floor
    const t = WALL_T / 2 + WALL_PAD;
    colliders.push(alongX ? { x0: b0, x1: b1, z0: at - t, z1: at + t, y1: h } : { x0: at - t, x1: at + t, z0: b0, z1: b1, y1: h });
  };
  let a = a0;
  for (const { c, w } of gaps.map(g => typeof g === "number" ? { c: g, w: DOOR_W } : g).sort((p, q) => p.c - q.c)) {
    seg(a, c - w / 2, 0, h);
    seg(c - w / 2, c + w / 2, DOOR_H, h);
    a = c + w / 2;
  }
  seg(a, a1, 0, h);
}
// jamb + head trim around a wall() opening of width W, both faces
// Each piece reaches 5 mm into the opening, so none of its faces sits in the
// same plane as the wall's own cut faces (coplanar faces flicker)
function casing(at, c, alongX, W) {
  const trim = (w, h, x, y) => { if (alongX) box(w, h, WALL_T + 0.04, mat.frame, c + x, y, at); else box(WALL_T + 0.04, h, w, mat.frame, at, y, c + x); };
  const IN = 0.005;
  trim(0.06 + IN, DOOR_H + 0.06, -W / 2 - 0.03 + IN / 2, (DOOR_H + 0.06) / 2);
  trim(0.06 + IN, DOOR_H + 0.06, W / 2 + 0.03 - IN / 2, (DOOR_H + 0.06) / 2);
  trim(W + 0.12, 0.06 + IN, 0, DOOR_H + 0.03 - IN / 2);
}
// A hinged door in a wall() opening. hinge: which end of the opening (-1/+1,
// along the wall) it hangs from; swing: which side (world -1/+1 on the axis
// across the wall) it opens toward; signs: [{ text, side }] plates, side = the
// world side of the wall the plate faces. Closed, it blocks the opening;
// open, it stands ~90° into the room and blocks just its own leaf
// push: a regal double-acting cinema door — no latch, no E: it swings away
// from whoever walks into it and springs shut behind them (pushDoorTick).
// porthole: a round window at head height, ringed in gold
const doorGold = new THREE.MeshPhongMaterial({ color: 0xc9a227, specular: 0xffe2a0, shininess: 80 });
const doorGlass = new THREE.MeshLambertMaterial({ color: 0x8a9aae, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
const PORT = { y: 1.6, r: 0.17 };
const theaterDoorMat = new THREE.MeshLambertMaterial({ color: 0x5a1020 });   // maroon
function makeDoor({ at, c, alongX, hinge, swing, locked = false, leafMat, signs = [], push = false, porthole = false, w = DOOR_W, h = DOOR_H, y0 = 0, stall = false, closer = false }) {   // closer: one on a closer, it swings itself shut once nobody's in its way (doorCloserTick)   // stall: a toilet stall's, off the floor, no frame, in a thin partition
  const W = w, base = alongX ? 0 : -Math.PI / 2;   // leaf is built along local x; local +z is world +z (alongX) or world -x
  const toLocal = side => alongX ? side : -side;
  const pivot = new THREE.Group();
  if (alongX) pivot.position.set(c + hinge * W / 2, 0, at); else pivot.position.set(at, 0, c + hinge * W / 2);
  pivot.rotation.y = base; scene.add(pivot);
  const lx = -hinge * W / 2;                    // leaf center, pivot-local
  let leaf;
  if (porthole) {                               // the window's a real hole: the leaf is an extruded slab with a round cut
    const LW = W - 0.03, LH = DOOR_H - 0.02, sh = new THREE.Shape();
    sh.moveTo(-LW / 2, 0); sh.lineTo(LW / 2, 0); sh.lineTo(LW / 2, LH); sh.lineTo(-LW / 2, LH); sh.lineTo(-LW / 2, 0);
    const hole = new THREE.Path(); hole.absarc(0, PORT.y - 0.01, PORT.r, 0, Math.PI * 2, true); sh.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.045, bevelEnabled: false, curveSegments: 24 }); g.translate(0, 0, -0.0225);
    leaf = new THREE.Mesh(g, leafMat); leaf.position.set(lx, 0.01, 0); pivot.add(leaf);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(PORT.r, 32), doorGlass); glass.position.set(lx, PORT.y, 0); pivot.add(glass);
    if (push) aimBlockers.push(glass);          // you can see through it, not reach through it
  } else {
    leaf = new THREE.Mesh(new THREE.BoxGeometry(W - 0.03, h - 0.02, stall ? 0.03 : 0.045), leafMat);
    leaf.position.set(lx, y0 + h / 2, 0); pivot.add(leaf);
  }
  const hx = -hinge * (W - 0.12);               // hardware sits at the latch edge
  if (push) for (const f of [-1, 1]) {          // both faces: gold border inset from the edge, brass kick plate, a push plate where the lever would be
    const g = (w, h, d, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), doorGold); m.position.set(x, y, f * (0.0225 + d / 2)); pivot.add(m); };
    const bw = W - 0.03 - 0.14, bh = DOOR_H - 0.02 - 0.14;
    g(bw, 0.022, 0.006, lx, 0.08); g(bw, 0.022, 0.006, lx, 0.08 + bh);
    g(0.022, bh, 0.006, lx - bw / 2, 0.08 + bh / 2); g(0.022, bh, 0.006, lx + bw / 2, 0.08 + bh / 2);
    g(W - 0.03 - 0.1, 0.22, 0.004, lx, 0.15);    // kick plate
    g(0.1, 0.3, 0.004, hx, 1.1);                  // push plate
    if (porthole) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(PORT.r + 0.01, 0.016, 10, 40), doorGold);
      ring.position.set(lx, PORT.y, f * 0.024); pivot.add(ring);
    }
  }
  else for (const f of [-1, 1]) {
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 14), mat.aluminum);
    rose.rotation.x = Math.PI / 2; rose.position.set(hx, 0.98, f * 0.028); pivot.add(rose);
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.022), mat.aluminum);
    lever.position.set(hx + hinge * 0.05, 0.98, f * 0.045); pivot.add(lever);
  }
  for (const { text, side } of signs) {
    const sg = textPlane(text, 0.42, 0.12, "#fff", "#2a2e35", "Arial", 70);
    sg.material = new THREE.MeshLambertMaterial({ map: sg.material.map });   // lit by the room like the other signs
    const f = toLocal(side);
    sg.position.set(lx, porthole ? 1.24 : 1.52, f * 0.028); if (f < 0) sg.rotation.y = Math.PI; pivot.add(sg);   // 5 mm proud of the leaf face (under the window, if it has one)
  }
  if (!stall) casing(at, c, alongX, W);
  const t = stall ? 0.03 : WALL_T / 2 + WALL_PAD, hp = c + hinge * W / 2, sw = swing * W;
  const shut = alongX ? { x0: c - W / 2, x1: c + W / 2, z0: at - t, z1: at + t } : { x0: at - t, x1: at + t, z0: c - W / 2, z1: c + W / 2 };
  const openBox = alongX ? { x0: hp - 0.03, x1: hp + 0.03, z0: Math.min(at, at + sw), z1: Math.max(at, at + sw) }
                         : { x0: Math.min(at, at + sw), x1: Math.max(at, at + sw), z0: hp - 0.03, z1: hp + 0.03 };
  // local z the leaf's free edge heads toward = toLocal(swing); rotating by a
  // moves it to local z = hinge * sin(a) * W/2, so the sign of a follows
  const d = { pivot, base, a: 0, openA: Math.PI / 2 * hinge * toLocal(swing), open: false, locked, rattle: 0, shut, openBox,
    push, at, c, alongX, hinge, stall, closer, W, swing, v: 0, side: 0 };
  if (!push) { colliders.push(shut); leaf.userData.door = d; aimables.push(leaf); }   // a push door never blocks: it gets out of your way
  else aimBlockers.push(leaf);                  // ...but you can't reach through it (it goes wherever the leaf swings)
  doors.push(d);
  return d;
}
// interior footprint is asymmetric: movies' side wall (XL) is pulled in from
// the original -STORE.x; the right/back/front-right stay at the original scale
const XL = WALL_L, XR = STORE.x, XC = (XL + XR) / 2, XW = XR - XL;
const floor = new THREE.Mesh(new THREE.PlaneGeometry(XW, STORE.z), mat.carpet);
floor.rotation.x = -Math.PI / 2; floor.position.set(XC, 0, STORE.z / 2); scene.add(floor);
ceilGrid(ceilTex, XL, XR, 0, STORE.z);
const ceil = new THREE.Mesh(new THREE.PlaneGeometry(XW, STORE.z), mat.ceil);
ceil.rotation.x = Math.PI / 2; ceil.position.set(XC, STORE.h, STORE.z / 2); scene.add(ceil);

// walls (front wall is mostly glass on either side of the doors, like a
// real video-store front — low bulkhead, tall storefront glass, header band)
const Z = STORE.z, H = STORE.h, T = 0.2, KICK = 0.4, HEAD = 2.7;
const storefront = (x0, x1, z) => {
  const w = x1 - x0, cx = (x0 + x1) / 2;
  box(w, KICK, T, mat.wall, cx, KICK / 2, z);                             // bulkhead
  box(w - 0.06, HEAD - KICK - 0.06, 0.05, mat.storefront, cx, (KICK + HEAD) / 2, z);
  box(w, H - HEAD, T, mat.wall, cx, HEAD + (H - HEAD) / 2, z);            // header
  const segs = Math.max(1, Math.round(w / 2.6));                          // mullions every ~2.6m
  for (let i = 1; i < segs; i++) box(0.06, HEAD - KICK, 0.08, mat.mullion, x0 + i * (w / segs), (KICK + HEAD) / 2, z);
};
storefront(XL - T / 2, -1.8, 0);                                          // front-left: out to the wall's outer face (the side's skin covers the corner from there)
storefront(1.8, XR, 0);                                                   // front-right
box(3.6, H - 2.6, T, mat.wall, 0, 2.6 + (H - 2.6) / 2, 0);                 // above doors
wall(XL - T / 2, XR + T / 2, Z, true, H, mat.wall, [{ c: BOH_DOORS.store, w: BOH_OPENING_W }]);   // back, with the open way through to the back hall
wall(0, Z, XL, false, H, mat.wall);                                       // left
wall(0, Z, XR, false, H, mat.wall, [{ c: (STORE_EXIT.z0 + STORE_EXIT.z1) / 2, w: STORE_EXIT.z1 - STORE_EXIT.z0 }]);   // right, with the emergency exit in it (the door: store/theater.js)
colliders.push(frontWallBox = { x0: XL, x1: XR, z0: -T / 2, z1: T / 2 + WALL_PAD });     // front: glass + closed doors, all solid (a customer goes through the right-hand door: see blocked)
// blue stripe around the walls at eye height — back and sides only; the
// front is glass now, and a stripe there ran straight across the windows
[[XC, 2.25, Z - T / 2 - 0.012, XW, 0],
 [XL + T + 0.01, 2.25, Z / 2, T, Z], [XR - T - 0.01, 2.25, Z / 2, T, Z]]
  .forEach(([x, y, z, w, d]) => box(w, 0.22, d, mat.stripe, x, y, z));
wallStripe = { inL: XL + T + 0.01 + T / 2, y0: 2.25 - 0.11 };

// entrance: aluminum-framed double door, closed — large top & bottom
// glass lites split by a mid rail, vertical push/pull bars on the
// meeting edge (real storefront doors swing open there, hinged outboard)
box(0.12, 2.7, 0.35, mat.frame, -1.86, 1.35, 0.1); box(0.12, 2.7, 0.35, mat.frame, 1.86, 1.35, 0.1); // outer jambs
box(3.84, 0.12, 0.35, mat.frame, 0, 2.66, 0.1);                                                      // header
{
  const DW = 1.7, DH = 2.56, DZ = 0.1, DD = 0.06;      // leaf width/height, wall-relative z, rail depth
  const STILE = 0.22, TOPR = 0.12, BOTR = 0.26, MIDR = 0.1, MIDY = DH * 0.54;
  box(0.1, DH, 0.3, mat.aluminum, 0, DH / 2, DZ);      // center astragal, where the two leaves meet
  const door = (cx, handleIn) => {                     // handleIn: which edge (toward center) gets the pull bar
    const gx0 = cx - DW / 2, gx1 = cx + DW / 2;
    box(DW, TOPR, DD, mat.aluminum, cx, DH - TOPR / 2, DZ);           // top rail
    box(DW, MIDR, DD, mat.aluminum, cx, MIDY, DZ);                    // mid rail
    box(DW, BOTR, DD, mat.aluminum, cx, BOTR / 2, DZ);                // bottom (kick) rail
    box(STILE, DH, DD, mat.aluminum, gx0 + STILE / 2, DH / 2, DZ);    // stiles
    box(STILE, DH, DD, mat.aluminum, gx1 - STILE / 2, DH / 2, DZ);
    const lw = DW - STILE * 2;
    const topY0 = MIDY + MIDR / 2, topY1 = DH - TOPR, botY0 = BOTR, botY1 = MIDY - MIDR / 2;
    box(lw, topY1 - topY0, 0.04, mat.storefront, cx, (topY0 + topY1) / 2, DZ);   // large top lite
    box(lw, botY1 - botY0, 0.04, mat.storefront, cx, (botY0 + botY1) / 2, DZ);   // large bottom lite
    const barLen = 0.9, barY = DH * 0.42, barX = handleIn > 0 ? gx1 - 0.16 : gx0 + 0.16, barZ = DZ + DD / 2 + 0.05;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, barLen, 10), mat.aluminum);
    bar.position.set(barX, barY, barZ); scene.add(bar);
    for (const dy of [-barLen / 2 + 0.1, barLen / 2 - 0.1]) {          // standoff brackets, bar → door face
      const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 8), mat.aluminum);
      bracket.rotation.x = Math.PI / 2;
      bracket.position.set(barX, barY + dy, DZ + DD / 2 + 0.025); scene.add(bracket);
    }
  };
  const leaf = (cx, handleIn, hingeX) => {           // a leaf on its outboard hinge (they swing out, toward the lot)
    const n0 = scene.children.length; door(cx, handleIn);
    const piv = new THREE.Group(); piv.position.set(hingeX, 0, DZ); scene.add(piv);
    for (const m of scene.children.slice(n0, -1)) piv.attach(m);
    return piv;
  };
  frontDoor.leaves = [leaf(-0.9, 1, -1.8), leaf(0.9, -1, 1.8)];
  // deadbolt on the inside of the astragal: a brass plate and a thumb turn
  // (upright = unlocked, flat = locked), and a flip sign hung in the right leaf's glass
  const plate = box(0.07, 0.17, 0.014, mat.aluminum, 0, 1.12, DZ + 0.157);
  const turn = frontLock.turn = box(0.022, 0.075, 0.03, mat.frame, 0, 1.15, DZ + 0.178);
  for (const m of [plate, turn]) { m.userData.frontLock = true; aimables.push(m); }
  for (const [text, fg, bg, open] of [["COME IN — WE'RE OPEN", "#fff", "#1c7c3c", true], ["SORRY — WE'RE CLOSED", "#fff", "#b3202a", false]])
    for (const face of [1, -1]) {                  // both faces: in toward the store, out toward the lot
      const sg = textPlane(text, 0.5, 0.2, fg, bg, "Arial Black", 70);
      sg.position.set(0.9, 1.95, DZ + face * 0.025); if (face < 0) sg.rotation.y = Math.PI;
      sg.visible = open; sg.userData.open = open; scene.add(sg); frontLock.signs.push(sg); frontDoor.leaves[1].attach(sg);   // (hung in the right leaf: it swings with it)
    }
  // the doorway itself, for clocking out (an unseen pane: rays still find it)
  const exit = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.5), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  exit.visible = false; exit.position.set(0, 1.25, DZ + 0.06); exit.userData.exitDoor = true; scene.add(exit); aimables.push(exit);
}

// back of house: hallway along the back wall, restroom + break room off it, the janitor's closet at its end.
// Lower drop ceiling than the sales floor, plain walls, no stripe
const BX0 = BOH.x0, BZ0 = Z, BZ1 = BOH.z1, BH = BOH.h, HZ = BOH.hallZ, SX = BOH.splitX;
wall(HZ, BZ1 + T / 2, BX0, false, BH, mat.wall);                          // west, rooms part
wall(BZ0, HZ, BX0, false, BH, mat.wall, [BOH_DOORS.future]);              // west, hall part: the future door
wall(BZ0, BZ1 + T / 2, XR, false, BH, mat.wall);                          // east
wall(BX0, XR, BZ1, true, BH, mat.wall);                                   // rear
wall(BX0, XR, HZ, true, BH, mat.wall, [BOH_DOORS.restroomF, BOH_DOORS.restroom, BOH_DOORS.breakroom]);   // hall | rooms
wall(HZ, BZ1, SX, false, BH, mat.wall);                                   // restrooms | break room
wall(HZ, BZ1, BOH.rrX, false, BH, mat.wall);                              // women's | men's
// break room | manager's office: the door (made in store/office.js), then the window, its sill and head solid wall, the opening glazed there too
wall(SX, OFFICE_WIN.x0, BOH.officeZ, true, BH, mat.wall, [{ c: BOH_DOORS.office, w: OFFICE_DOOR_W }]);
wall(OFFICE_WIN.x1, XR, BOH.officeZ, true, BH, mat.wall);
{
  const w = OFFICE_WIN, c = (w.x0 + w.x1) / 2, len = w.x1 - w.x0, t = WALL_T / 2 + WALL_PAD;
  aimBlockers.push(box(len, w.sill, WALL_T, mat.wall, c, w.sill / 2, BOH.officeZ), box(len, BH - w.head, WALL_T, mat.wall, c, (w.head + BH) / 2, BOH.officeZ));
  colliders.push({ x0: w.x0, x1: w.x1, z0: BOH.officeZ - t, z1: BOH.officeZ + t, y1: BH });
}
wall(BZ0, HZ, CLOSET.x0, false, BH, mat.wall, [{ c: BOH_DOORS.closet, w: CLOSET.doorW }]);   // across the hall's end: the janitor's closet door
const vctTex = makeTexture((ctx, W, H) => {   // speckled vinyl composition tile, 8 x 8 30 cm squares per repeat
  const n = 8, s = W / n, cols = ["#d8d2c3", "#cec7b5", "#e1dccf", "#c9c3b4"];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { ctx.fillStyle = cols[Math.floor(Math.random() * cols.length)]; ctx.fillRect(x * s, y * s, s, s); }
  for (let i = 0; i < 2200; i++) { ctx.fillStyle = Math.random() < 0.5 ? "rgba(90,80,60,.35)" : "rgba(255,255,255,.4)"; ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
  ctx.strokeStyle = "rgba(0,0,0,.12)"; ctx.lineWidth = 2;
  for (let i = 0; i <= n; i++) { ctx.beginPath(); ctx.moveTo(i * s, 0); ctx.lineTo(i * s, H); ctx.moveTo(0, i * s); ctx.lineTo(W, i * s); ctx.stroke(); }
}, 512, 512);
const bathTex = makeTexture((ctx, W, H) => {  // small white square tile, grey grout, 16 x 16 5 cm tiles per repeat
  const n = 16, s = W / n;
  ctx.fillStyle = "#9ea3a8"; ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { ctx.fillStyle = Math.random() < 0.06 ? "#e4e8ec" : "#f3f5f7"; ctx.fillRect(x * s + 2, y * s + 2, s - 4, s - 4); }
}, 512, 512);
const floorPatch = (tex, tileM, x0, x1, z0, z1) => {
  const t = tex.clone(); t.needsUpdate = true; t.repeat.set((x1 - x0) / tileM, (z1 - z0) / tileM);
  const f = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshLambertMaterial({ map: t }));
  f.rotation.x = -Math.PI / 2; f.position.set((x0 + x1) / 2, 0.002, (z0 + z1) / 2); scene.add(f);
};
floorPatch(vctTex, 2.4, BX0, CLOSET.x0, BZ0, HZ);                         // hall — starts right where the store's carpet ends, mid-opening
floorPatch(bathTex, 0.8, BX0, SX, HZ, BZ1);                               // restroom
floorPatch(vctTex, 2.4, SX, XR, HZ, BOH.officeZ);                         // break room (the office has its carpet: store/office.js)
// ceilings: the hall gets its own, its grid shifted so a row of tiles runs down the middle between
// the walls (the hall lights sit in it) with a sliver of tile either side; the rooms keep the store's grid
const hallMid = (BZ0 + WALL_T / 2 + HZ - WALL_T / 2) / 2, rowStart = hallMid - CEIL_TILE.z / 2;
const hallCeilTex = ceilGrid(ceilTex.clone(), BX0, CLOSET.x0, BZ0, HZ); hallCeilTex.offset.y = (BZ0 - (rowStart % CEIL_TILE.z)) / CEIL_REP; hallCeilTex.needsUpdate = true;
const hallCeil = new THREE.Mesh(new THREE.PlaneGeometry(CLOSET.x0 - BX0, HZ - BZ0), new THREE.MeshLambertMaterial({ map: hallCeilTex }));
hallCeil.rotation.x = Math.PI / 2; hallCeil.position.set((BX0 + CLOSET.x0) / 2, BH, (BZ0 + HZ) / 2); scene.add(hallCeil);
const bohCeilTex = ceilGrid(ceilTex.clone(), BX0, XR, HZ, BZ1); bohCeilTex.needsUpdate = true;
const bohCeil = new THREE.Mesh(new THREE.PlaneGeometry(XR - BX0, BZ1 - HZ), new THREE.MeshLambertMaterial({ map: bohCeilTex }));
bohCeil.rotation.x = Math.PI / 2; bohCeil.position.set((BX0 + XR) / 2, BH, (HZ + BZ1) / 2); scene.add(bohCeil);

// the sales floor opens straight into the hall; the rooms get painted doors, the theater a maroon push door
casing(Z, BOH_DOORS.store, true, BOH_OPENING_W);
const painted = new THREE.MeshLambertMaterial({ color: 0xd9d4c7 });
makeDoor({ at: HZ, c: BOH_DOORS.breakroom, alongX: true, hinge: 1, swing: 1, leafMat: painted,   // (made in this order: a save keeps the doors by it)
  signs: [{ text: "BREAK ROOM", side: -1 }] });
makeDoor({ at: HZ, c: BOH_DOORS.restroom, alongX: true, hinge: 1, swing: 1, leafMat: painted, closer: true,
  signs: [{ text: "MEN", side: -1 }] });
makeDoor({ at: BX0, c: BOH_DOORS.future, alongX: false, hinge: 1, swing: -1, leafMat: theaterDoorMat, push: true, porthole: true,
  signs: [{ text: "THEATER", side: 1 }] });
makeDoor({ at: CLOSET.x0, c: BOH_DOORS.closet, alongX: false, hinge: -1, swing: -1, w: CLOSET.doorW, leafMat: painted,   // narrow; hinged on the store's side, swings out into the hall
  signs: [{ text: "JANITOR", side: -1 }] });
makeDoor({ at: HZ, c: BOH_DOORS.restroomF, alongX: true, hinge: 1, swing: 1, leafMat: painted, closer: true,
  signs: [{ text: "WOMEN", side: -1 }] });

