// ---------------- the roof ----------------
// Up the fixed ladder in the janitor's closet (beside the chute) and out through a hatch: a flat gravel roof behind a
// 3 ft parapet all the way round, with the building's kit on it. Two rooftop AC units (their condenser fans going in
// the warm months), a whirlybird vent turning in the wind, mushroom exhaust fans over the restroom and the break
// room, a satellite dish, an old TV antenna, vent stacks, drains, walkway pads out to the units. Up here is its own
// level: its own colliders (the parapets and the kit), the inside of the store isn't drawn, the camera's on the deck.
// And now that you can see it from up there, the world around the building: the stucco outside of its walls, a
// paved apron round the sides and back with the dumpster, grass beyond, and the pizza place next door
const roof = { g: new THREE.Group(), cols: [], ladderParts: [], hatchParts: [], climb: null, cam: new THREE.Vector3(), fans: [], units: [], turbine: null, lid: null, lidA: 0, bulb: null, sign: null, puddles: null, grime: null, shades: null, smoke: null, seats: [], back: null };
scene.add(roof.g); roof.g.visible = false;
const ROOF_LADDER = { x: 10.6, z: 28.28 };                 // the rungs' line: against the closet's north wall (the store's back wall), beside the chute
const ROOF_HATCH = { x0: 10.28, x1: 10.88, z0: 28.12, z1: 28.87 };
const ROOF_UP = { x: 9.8, z: 29.3 }, ROOF_DOWN = { x: 10.08, z: 28.8 };   // where you step off at the top / at the bottom
// the ladder out back, on the back of house's back wall, in the hammerhead behind the store (the tall block's walls are too tall for it). Its
// bottom half rides latched up out of reach of the ground till somebody on the roof kicks it down (once: it stays down, and
// it's saved); then it's a way up from outside
const BACK_LADDER = { x: 6.0, z: 35.39, wall: 35.25, mid: 2.3, raise: 2.0, up: { x: 6.0, z: 34.32 }, down: { x: 6.0, z: 35.92 } };   // z: the rungs' line, 14 cm off the wall's stucco (wall: its face); up / down: where you step off
const CLIMBS = {                                // where the camera goes on each ladder: the rungs' line (stood off it), which way you face, where you step off
  hatch: { x: ROOF_LADDER.x, z: ROOF_LADDER.z + 0.42, yaw: 0, up: ROOF_UP, down: ROOF_DOWN },
  back: { x: BACK_LADDER.x, z: BACK_LADDER.z + 0.42, yaw: 0, up: BACK_LADDER.up, down: BACK_LADDER.down },
};
const onDeck = (x, z) => deckY(x, z) != null;
function roofY(x, z) {                          // underfoot up top: the store's roof, the tall block's, or the iron stair between them (a ramp up its treads)
  const foot = IRON.x0 + IRON.n * IRON.run;
  if (x > IRON.land && x < foot && z > IRON.z0 && z < ROOF.tall.z0) return x <= IRON.x0 ? ROOF.tall.y : ROOF.y + (foot - x) / (foot - IRON.x0) * (ROOF.tall.y - ROOF.y);
  return deckY(x, z) ?? ROOF.y;
}
const playerFloor = () => player.onRoof ? roofY(player.x, player.z) : player.inBooth ? TALL.booth : floorHeightAt(player.x, player.z);
const roofHandsFull = () => stool.carried || cutout.carried || ladder.state === "carried" || boxCarry.length || bagCarry.length || toolHeld || cmove.item;
{
  const Y = ROOF.y, G = roof.g, T = 0.2, PH = ROOF.wall;
  const lam = c => new THREE.MeshLambertMaterial({ color: c }), phong = (c, s = 60) => new THREE.MeshPhongMaterial({ color: c, specular: 0x555555, shininess: s });
  const put = (geo, m, x, y, z, par = G) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); par.add(o); return o; };
  const bx = (w, h, d, m, x, y, z, par) => put(new THREE.BoxGeometry(w, h, d), m, x, y, z, par);
  const cy = (rt, rb, h, m, x, y, z, seg = 16, par) => put(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z, par);
  const col = (x0, x1, z0, z1) => roof.cols.push({ x0, x1, z0, z1 });
  const ext = o => { o.traverse(k => k.layers.set(EXTERIOR_LAYER)); return o; };   // (the world outside: lit by the sun / moon rig only)
  const stick = (a, b, r, m, par = G) => { const d = new THREE.Vector3().subVectors(b, a), o = put(new THREE.CylinderGeometry(r, r, d.length(), 8), m, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, par); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return o; };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const galv = phong(0xa9aeb3, 40), alum = phong(0xd3d6da, 80), dark = lam(0x2a2c2f), beige = phong(0xd9d3c3, 20), cement = lam(0x9d9a92);
  const K = roofKit();                             // the stamped hardware (store/roofkit.js): laid out as the roof's built, one mesh a material at the end

  // ---- the decks: gravel ballast over the membrane, one sheet over each (a hole in the store's for the hatch): the store's
  // and the back of house's at 4 m, the tall block's (the auditorium and the booth) at 6.4 ----
  const TY = ROOF.tall.y, { x0: TX0, x1: TX1, z0: TZ0, z1: TZ1 } = ROOF.tall;
  const P = [[-7.84, -0.1], [11.1, -0.1], [11.1, 35.1], [TX1, 35.1], [TX1, TZ0], [-7.84, TZ0]], PT = [[TX0, TZ0], [TX1, TZ0], [TX1, TZ1], [TX0, TZ1]];
  const gravelTex = makeTexture((ctx, W, H) => {   // 1.2 m of pea gravel: thousands of rounded stones, each lit from the top left
    ctx.fillStyle = "#77736c"; ctx.fillRect(0, 0, W, H);
    const cols = ["#a8a49b", "#6f6b64", "#bdb6a8", "#5d5a55", "#9a8f7d", "#c9c2b3", "#837d72", "#b1a48d"];
    for (let i = 0; i < 9000; i++) {
      const x = Math.random() * W, y = Math.random() * H, r = 2 + Math.random() * 3.5, a = Math.random() * 3;
      for (const [dx, dy] of [[0, 0], [W, 0], [-W, 0], [0, H], [0, -H]]) {   // (tiles seamlessly)
        if (dx || dy) { if (x + dx < -8 || x + dx > W + 8 || y + dy < -8 || y + dy > H + 8) continue; }
        ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(x + dx + 1.2, y + dy + 1.2, r, r * 0.75, a, 0, 7); ctx.fill();
        ctx.fillStyle = cols[i % cols.length]; ctx.beginPath(); ctx.ellipse(x + dx, y + dy, r, r * 0.75, a, 0, 7); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.beginPath(); ctx.ellipse(x + dx - r * 0.3, y + dy - r * 0.25, r * 0.4, r * 0.3, a, 0, 7); ctx.fill();
      }
    }
  }, 512, 512);
  gravelTex.wrapS = gravelTex.wrapT = THREE.RepeatWrapping; gravelTex.repeat.set(1 / 1.2, 1 / 1.2); gravelTex.anisotropy = 8;
  const gravel = new THREE.MeshLambertMaterial({ map: gravelTex });
  WX_GROUND.push({ m: gravel, dry: new THREE.Color(0xffffff), wet: new THREE.Color(0x8a8f96), snow: 1 });   // gets wet and snowed on like the lot
  {
    const sh = new THREE.Shape(P.map(([x, z]) => new THREE.Vector2(x, -z))), hole = new THREE.Path();
    const { x0, x1, z0, z1 } = ROOF_HATCH; hole.moveTo(x0, -z0); hole.lineTo(x0, -z1); hole.lineTo(x1, -z1); hole.lineTo(x1, -z0); hole.lineTo(x0, -z0); sh.holes.push(hole);
    const deck = put(new THREE.ShapeGeometry(sh), gravel, 0, Y, 0); deck.rotation.x = -Math.PI / 2;   // (shape y = -world z; its uvs are world metres)
    put(new THREE.ShapeGeometry(new THREE.Shape(PT.map(([x, z]) => new THREE.Vector2(x, -z)))), gravel, 0, TY, 0).rotation.x = -Math.PI / 2;
  }

  // ---- parapets: a wall just inside every edge, the stucco skin outside it all the way down (or down to the store's roof,
  // round the tall block over it), aluminium coping on top. The tall block's front is open over the iron stair's landing ----
  const stucco = wallSurface(lam(0xcdbf9f), "stucco"), base = lam(0x8f8573), coping = phong(0xc2c6cb, 50), fasciaBlue = lam(0x00349c), fasciaY = lam(0xf2c200);
  const membrane = new THREE.MeshLambertMaterial({ map: makeTexture((ctx, W, H) => {   // 3 m of the parapet's inside: the roof's white sheet run up it, weathered
    ctx.fillStyle = "#c4c5bf"; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 2500; i++) { ctx.fillStyle = `rgba(${Math.random() < 0.5 ? "60,58,52" : "255,255,250"},${0.03 + Math.random() * 0.05})`; ctx.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 3, 1 + Math.random() * 2); }
    for (let i = 0; i < 26; i++) {                 // grime streaks run down from under the coping
      const x = Math.random() * W, w = 2 + Math.random() * 7, h = H * (0.25 + Math.random() * 0.6), g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, `rgba(70,64,55,${0.12 + Math.random() * 0.15})`); g.addColorStop(1, "rgba(70,64,55,0)"); ctx.fillStyle = g; ctx.fillRect(x, 18, w, h);
    }
    const d = ctx.createLinearGradient(0, H, 0, H * 0.65); d.addColorStop(0, "rgba(78,70,58,0.6)"); d.addColorStop(1, "rgba(78,70,58,0)"); ctx.fillStyle = d; ctx.fillRect(0, H * 0.65, W, H * 0.35);   // splash from the gravel
    ctx.fillStyle = "#8f9397"; ctx.fillRect(0, 10, W, 6); ctx.fillStyle = "#3d3b37"; ctx.fillRect(0, 8, W, 2);   // the termination bar and its bead of caulk
    for (let x = 12; x < W; x += 38) { ctx.fillStyle = "#55585b"; ctx.fillRect(x, 12, 2, 2); }
    ctx.fillStyle = "rgba(0,0,0,0.16)"; ctx.fillRect(4, 16, 3, H); ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(7, 16, 1, H);   // the welded lap between sheets
  }, 512, 160) });
  const tileU = (o, k) => { const uv = o.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (i >= 16 ? k : i < 8 ? 0.07 : 1)); return o; };   // (a box face's u runs 0..1 across its length: repeat it every 3 m along the long faces, the ends a sliver of it)
  const joints = [];                               // where the coping's 10 ft lengths meet, a cover plate over each joint
  const skin = new THREE.Group(); scene.add(skin);   // (the building's outside, in the scene not the roof group: seen from up here over the edge, and from anywhere out there)
  // each edge: from, to, its deck's height, how far down its skin goes (to the ground, or the store's roof under the tall
  // block's front and side), and whether it has a parapet (the tall front's gap over the stair: just the wall under it)
  const EDGES = [[-7.84, -0.1, 11.1, -0.1, Y, 0], [11.1, -0.1, 11.1, 35.1, Y, 0], [11.1, 35.1, TX1, 35.1, Y, 0], [-7.84, TZ0, -7.84, -0.1, Y, 0],
    [TX0, TZ0, IRON.land, TZ0, TY, Y], [IRON.land, TZ0, IRON.x0, TZ0, TY, Y, false], [IRON.x0, TZ0, TX1, TZ0, TY, Y], [TX1, TZ0, TX1, 35.1, TY, Y],
    [TX1, 35.1, TX1, TZ1, TY, 0], [TX1, TZ1, TX0, TZ1, TY, 0],
    [TX0, TZ1, TX0, FIRE_EXIT.z1, TY, 0, true, "b"], [TX0, FIRE_EXIT.z1, TX0, FIRE_EXIT.z0, TY, FIRE_EXIT.head], [TX0, FIRE_EXIT.z0, TX0, TZ0, TY, 0, true, "a"]];   // (over the emergency exit: from its head up; either side of it, the skin stops at its opening)
  for (const [ax, az, bx_, bz, EY, from, parapet = true, flush] of EDGES) {   // flush: that end (a, b) doesn't lap past it (an opening's there)
    const len = Math.hypot(bx_ - ax, bz - az), dx = (bx_ - ax) / len, dz = (bz - az) / len;
    let nx = -dz, nz = dx; const mx = (ax + bx_) / 2, mz = (az + bz) / 2;
    if (deckY(mx + nx * 0.05, mz + nz * 0.05) !== EY) { nx = -nx; nz = -nz; }   // n: inward, onto its deck
    const along = Math.abs(dx) > 0.5, ry = along ? 0 : Math.PI / 2;
    const wall = (inset, th, y0, y1, m, extra = 0, par = G, cut = null) => {   // (extra: lapped past both ends, but at a cut end)
      const ea = cut === "a" ? 0 : extra / 2, eb = cut === "b" ? 0 : extra / 2, sh = (eb - ea) / 2;
      const o = bx(len + ea + eb, y1 - y0, th, m, mx + nx * inset + dx * sh, (y0 + y1) / 2, mz + nz * inset + dz * sh, par); o.rotation.y = ry; return o;
    };
    const front = Math.abs(az + 0.1) < 0.01 && Math.abs(bz + 0.1) < 0.01;  // the storefront: above the glass only, a blue fascia with a yellow stripe
    if (front) {                                   // (2 cm thicker and longer than the sides' skin: it laps over their ends at the corners, no faces in the same plane)
      wall(-0.085, 0.17, 2.75, EY + PH, fasciaBlue, 0.34, skin); wall(-0.1, 0.2, 3.45, 3.6, fasciaY, 0.4, skin);
    } else {
      wall(-0.075, 0.15, from, parapet ? EY + PH : EY, stucco, 0.3, skin, flush);
      if (!from) wall(-0.1, 0.16, 0, 0.5, base, 0.36, skin, flush);   // a darker band at the foot: 3 cm proud of the stucco at its face and ends, its back 2 cm inside it (flush, its back fought the stucco's in the return beside the storefront glass)
    }
    if (!parapet) continue;
    tileU(wall(T / 2, T, EY, EY + PH, membrane), len / 3);                   // the parapet, its inside face in the roof's membrane
    wall(0.02, 0.4, EY + PH, EY + PH + 0.05, coping, 0.32);                  // coping over wall and skin
    for (let s = 3.05; s < len - 0.3; s += 3.05) joints.push([ax + dx * s + nx * 0.02, az + dz * s + nz * 0.02, ry, EY]);
    if (along) col(Math.min(ax, bx_), Math.max(ax, bx_), Math.min(az, az + nz * T), Math.max(az, az + nz * T));
    else col(Math.min(ax, ax + nx * T), Math.max(ax, ax + nx * T), Math.min(az, bz), Math.max(az, bz));
  }
  // the iron stair up the tall block's front, from the store's roof: open treads on two stringers, the landing at the top on
  // its legs, a rail up the open side and round the landing
  {
    const iron = lam(0x2a2c2f), r = (TY - Y) / IRON.n, foot = IRON.x0 + IRON.n * IRON.run, zc = (IRON.z0 + IRON.z1) / 2, st = new THREE.Group(); G.add(st);   // (up top only: down below, room culling would take it for the lobby's)
    const beam = (a, b, w) => stick(a, b, w / 2, iron, st);
    for (let i = 0; i < IRON.n; i++) { const x1 = IRON.x0 + (IRON.n - i) * IRON.run; bx(IRON.run, 0.03, IRON.z1 - IRON.z0, iron, x1 - IRON.run / 2, Y + (i + 1) * r - 0.015, zc, st); }
    for (const z of [IRON.z0 + 0.02, IRON.z1 - 0.02]) beam(V(foot + 0.1, Y, z), V(IRON.x0, TY - 0.03, z), 0.06);
    bx(IRON.x0 - IRON.land, 0.05, TZ0 - IRON.z0, iron, (IRON.land + IRON.x0) / 2, TY - 0.025, (IRON.z0 + TZ0) / 2, st);
    for (const x of [IRON.land + 0.03, IRON.x0 - 0.03]) beam(V(x, Y, IRON.z0 + 0.03), V(x, TY - 0.05, IRON.z0 + 0.03), 0.06);
    const rz = IRON.z0 + 0.02;
    beam(V(foot - 0.1, Y + r + 0.9, rz), V(IRON.x0, TY + 0.9, rz), 0.04); beam(V(IRON.x0, TY + 0.9, rz), V(IRON.land + 0.02, TY + 0.9, rz), 0.04);
    beam(V(IRON.land + 0.02, TY + 0.9, rz), V(IRON.land + 0.02, TY + 0.9, TZ0 - 0.15), 0.04);
    for (const [x, y] of [[foot - 0.1, Y + r], [(foot + IRON.x0) / 2, (Y + TY) / 2], [IRON.x0, TY], [IRON.land + 0.02, TY]]) beam(V(x, y, rz), V(x, y + 0.9, rz), 0.04);
    ext(st);
  }
  {
    const jm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.012, 0.44), phong(0xd4d8dc, 70), joints.length), o = new THREE.Object3D();
    joints.forEach(([x, z, ry, y], i) => { o.position.set(x, y + PH + 0.056, z); o.rotation.set(0, ry, 0); o.updateMatrix(); jm.setMatrixAt(i, o.matrix); });
    skin.add(jm);
  }
  ext(skin);

  // ---- the hatch: a curb round the opening, a lid that props open while you're up here, the ladder's rails through it ----
  {
    const { x0, x1, z0, z1 } = ROOF_HATCH, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, CH = 0.35, steel = phong(0x8b9096, 30), CLOSET_Z0 = STORE.z + WALL_T / 2;   // (the closet's south wall face)
    const hatch = new THREE.Group(); scene.add(hatch);              // (out in the scene: the shut lid is what you see looking up from the closet)
    const add = (w, h, d, m, x, y, z, par = hatch) => bx(w, h, d, m, x, y, z, par);
    add(x1 - x0 + 0.12, CH, 0.06, steel, cx, Y + CH / 2, z0 - 0.03); add(x1 - x0 + 0.12, CH, 0.06, steel, cx, Y + CH / 2, z1 + 0.03);
    add(0.06, CH, z1 - z0, steel, x0 - 0.03, Y + CH / 2, cz); add(0.06, CH, z1 - z0, steel, x1 + 0.03, Y + CH / 2, cz);
    const lid = new THREE.Group(); lid.position.set(cx, Y + CH, z1 + 0.06); hatch.add(lid); roof.lid = lid;   // hinged along its north edge, the far side from the ladder: it opens away from the rails
    const LX0 = x0 - 0.02, LX1 = STORE.x + 0.1 - T - 0.025;          // its width: over the opening, stopping short of the parapet's coping, which it would go through standing open
    add(LX1 - LX0, 0.05, z1 - z0 + 0.14, steel, (LX0 + LX1) / 2 - cx, 0.025, -(z1 - z0 + 0.14) / 2, lid);
    add(0.04, 0.03, 0.2, dark, 0, 0.065, -(z1 - z0 - 0.05), lid);     // its handle
    ext(hatch); col(x0 - 0.06, x1 + 0.06, z0 - 0.06, z1 + 0.06);
    // the shaft through the plenum, closet ceiling to deck (unlit: it's dark in there, and the room lighting would take it for outdoors)
    const shaftM = new THREE.MeshBasicMaterial({ color: 0x34322e }), sy0 = BOH.h, sh = Y - sy0;
    const keep = o => { roof.hatchParts.push(o); return o; };   // (seen from the roof as well as the closet: see roomSort)
    keep(hatch);
    for (const [w, d, x, z] of [[x1 - x0, 0.02, cx, z0 - 0.01], [x1 - x0, 0.02, cx, z1 + 0.01], [0.02, z1 - z0, x0 - 0.01, cz], [0.02, z1 - z0, x1 + 0.01, cz]]) keep(box(w, sh, d, shaftM, x, sy0 + sh / 2, z));
    for (const [w, d, x, z] of [[x1 - x0 + 0.1, 0.05, cx, z0 - 0.025], [x1 - x0 + 0.1, 0.05, cx, z1 + 0.025], [0.05, z1 - z0, x0 - 0.025, cz], [0.05, z1 - z0, x1 + 0.025, cz]]) keep(box(w, 0.03, d, mat.frame, x, sy0 - 0.015, z));   // trim round it, under the ceiling
    // the ladder: galvanised rails standing off the wall on brackets, round rungs every 30 cm, the rails just past the hatch's
    // curb and curling over its lip, so there's something to hold stepping off
    const { x: lx, z: lz } = ROOF_LADDER, top = Y + CH + 0.02;
    for (const sx of [-1, 1]) {
      roof.ladderParts.push(box(0.05, top, 0.016, galv, lx + sx * 0.22, top / 2, lz));
      for (const y of [0.4, 1.6, 2.6]) keep(box(0.04, 0.03, lz - CLOSET_Z0, galv, lx + sx * 0.22, y, (lz + CLOSET_Z0) / 2));   // wall brackets
      const g = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.016, 6, 12, Math.PI), galv); g.position.set(lx + sx * 0.22, top, lz - 0.12); g.rotation.y = Math.PI / 2; scene.add(g); roof.ladderParts.push(g);   // the rails curl over at the top
    }
    for (let y = 0.3; y < Y - 0.05; y += 0.3) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.44, 8), galv); r.rotation.z = Math.PI / 2; r.position.set(lx, y, lz); scene.add(r); roof.ladderParts.push(r); }
    roof.hatchParts.push(...roof.ladderParts);
    for (const o of [...roof.ladderParts, ...hatch.children, ...lid.children]) if (o.isMesh) { o.userData.roofLadder = true; aimables.push(o); }
    colliders.push({ x0: lx - 0.26, x1: lx + 0.26, z0: CLOSET_Z0, z1: lz + 0.03, y1: Y });
    // a caged bulb on the parapet by the hatch, on at night (see roofTick)
    roof.bulb = new THREE.MeshBasicMaterial({ color: 0x4a4a44 });
    const bxp = STORE.x + 0.1 - T, bz = 29.2;      // (the side parapet's inside face, just past the hatch)
    glow(put(new THREE.SphereGeometry(0.045, 10, 8), roof.bulb, bxp - 0.08, Y + PH - 0.18, bz));
    bx(0.05, 0.14, 0.14, dark, bxp - 0.025, Y + PH - 0.18, bz);
    for (const a of [0, 1, 2]) { const w = put(new THREE.TorusGeometry(0.06, 0.004, 4, 12), dark, bxp - 0.08, Y + PH - 0.18, bz); w.rotation.y = Math.PI / 2 + a * Math.PI / 3; }
  }

  // ---- rooftop AC units: packaged units on curbs, louvred coil grilles down the long sides, two condenser fans on top ----
  const louvre = makeTexture((ctx, W, H) => {
    ctx.fillStyle = "#cfc9b8"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#3b3a36"; ctx.fillRect(12, 12, W - 24, H - 24);
    for (let y = 16; y < H - 14; y += 7) { ctx.fillStyle = "#8e8a80"; ctx.fillRect(14, y, W - 28, 3); ctx.fillStyle = "#bdb7a6"; ctx.fillRect(14, y, W - 28, 1); }
  }, 256, 128);
  const louvreM = new THREE.MeshLambertMaterial({ map: louvre });
  const RTU_FANS = [0.02, 0.76];                   // along the lid: the rings (0.36 across) clear of its end (1.15), of each other, and of what's sat on the other half
  const rtu = (x, z, ry, phase) => {
    const u = new THREE.Group(); u.position.set(x, Y, z); u.rotation.y = ry; G.add(u);   // (just what moves or is printed: all else is stamped)
    const L = 2.3, W = 1.35, H = 1.05, B = 0.3, skin = K.met(0xd9d3c3, 20), skin2 = K.met(0xcec7b5, 20), band = K.lam(0x8c8778);
    K.at(x, Y, z, ry, () => {
      // the curb and base rail it sits on, flashed to the deck
      K.box(K.lam(0x77746c), L + 0.14, B - 0.05, W + 0.14, 0, (B - 0.05) / 2, 0); K.box(K.mats.galv, L + 0.2, 0.03, W + 0.2, 0, B - 0.05, 0); K.box(band, L + 0.02, 0.06, W + 0.02, 0, B - 0.0, 0);
      // the cabinet: a body, its seams, screws round its panels
      K.box(skin, L, H, W, 0, B + H / 2, 0);
      for (const px of [-L / 2 + 0.46, -0.28, 0.28 + 0.12]) for (const s of [-1, 1]) K.box(band, 0.014, H - 0.04, 0.006, px, B + H / 2, s * (W / 2 + 0.002));   // the panels' seams
      K.box(band, L + 0.012, 0.018, W + 0.012, 0, B + H, 0);                                                     // the lid's drip edge
      for (const s of [-1, 1]) K.at(0, 0, s * (W / 2 + 0.004), s < 0 ? Math.PI : 0, () => {
        K.plane(louvreM, L * 0.62, H * 0.75, s * -L * 0.17 * -1, B + H * 0.48, 0);                               // the condenser coil's louvres
        K.screws(-L / 2 + 0.05, -L / 2 + 0.4, B + 0.08, B + H - 0.08, 0.002, 2, 4);
      });
      // the service end: two doors with quarter-turn latches, the flue hood, the gas cock
      for (const s of [-1, 1]) K.at(-L / 2 - 0.002, 0, s * 0.33, -Math.PI / 2, () => {
        K.box(skin2, 0.56, H * 0.82, 0.012, 0, B + H / 2, 0); K.screws(-0.25, 0.25, B + 0.13, B + H - 0.13, 0.008, 2, 3);
        K.box(K.lam(0x24262a), 0.1, 0.05, 0.022, 0, B + H * 0.5, 0.012); K.box(K.mats.galv, 0.012, 0.03, 0.03, 0, B + H * 0.5, 0.024);
      });
      K.at(-L / 2 - 0.09, B + 0.76, -0.36, -Math.PI / 2, () => {                                                 // the flue: a hooded box with slots
        K.box(K.mats.steel, 0.22, 0.2, 0.16, 0, 0, 0); K.box(K.mats.steel, 0.25, 0.012, 0.2, 0, 0.105, 0.012);
        for (let k = 0; k < 3; k++) K.box(K.lam(0x141414), 0.16, 0.012, 0.002, 0, -0.05 + k * 0.045, 0.081);
      });
      // the fans: a venturi ring standing proud of the lid, a wire guard over it, the motor's strut under the guard
      for (const fx of RTU_FANS) {
        const TOP = B + H;
        K.cyl(K.mats.iron, 0.34, 0.36, 0.1, fx, TOP + 0.05, 0, 28, 0, 0, true); K.ring(K.mats.iron, 0.34, 0.01, fx, TOP + 0.1, 0, Math.PI / 2, 0, 32);
        K.cyl(K.lam(0x1a1a1b), 0.33, 0.33, 0.004, fx, TOP + 0.012, 0, 28);                                       // the dark inside
        for (let r = 0.09; r < 0.33; r += 0.05) K.ring(K.mats.galv, r, 0.0028, fx, TOP + 0.122, 0, Math.PI / 2, 0, 28);
        for (let a = 0; a < 8; a++) K.rod(K.mats.galv, 0.0028, [fx, TOP + 0.124, 0], [fx + Math.cos(a * 0.785) * 0.335, TOP + 0.104, Math.sin(a * 0.785) * 0.335], 4);
        K.cyl(K.lam(0x1d1d1e), 0.06, 0.06, 0.05, fx, TOP + 0.118, 0, 12);                                         // the motor's end
      }
      // the disconnect on its strut, the feed up into the cabinet: a whip of flex
      const sx = -L / 2 - 0.45;
      K.strut(sx, 0, 0.92, 0.5); K.disconnect(sx, 0.75, 0.53, 0);
      K.tube(K.lam(0x3a3c3e), 0.012, [[sx + 0.03, 0.56, 0.53], [sx + 0.2, 0.48, 0.55], [-L / 2 - 0.08, 0.52, 0.52], [-L / 2 - 0.01, 0.62, 0.5]], 14, 6);
      K.ring(K.mats.galv, 0.016, 0.005, -L / 2 - 0.012, 0.62, 0.5, 0, Math.PI / 2, 10);
      // the gas: up out of the deck on its blocks, a drip leg, a cock, a union, in the side
      const gas = K.lam(0xe0b400), gx = -L / 2 + 0.3;
      K.rod(gas, 0.018, [gx, 0.12, -W / 2 - 0.25], [gx, 0.12, -W / 2 - 2.6]); K.rod(gas, 0.018, [gx, 0.12, -W / 2 - 0.25], [gx, 0.45, -W / 2 - 0.25]); K.rod(gas, 0.018, [gx, 0.45, -W / 2 - 0.25], [gx, 0.45, -W / 2]);
      K.rod(gas, 0.022, [gx, 0.12, -W / 2 - 0.25], [gx, 0.05, -W / 2 - 0.25]);                                   // the drip leg
      K.cyl(K.mats.galv, 0.03, 0.03, 0.05, gx, 0.45, -W / 2 - 0.14, 8, Math.PI / 2); K.box(K.lam(0xc4301f), 0.1, 0.012, 0.02, gx, 0.5, -W / 2 - 0.14);   // the union; the cock's red handle
      for (let k = 0; k < 3; k++) K.support(gx, 0, -W / 2 - 0.7 - k * 0.8, 0.1, Math.PI / 2);
    });
    const plate = textPlane("CARRIER", 0.32, 0.07, "#ffffff", "#1d4f9c", "Arial Black", 60); plate.material = new THREE.MeshLambertMaterial({ map: plate.material.map });
    plate.position.set(-L / 2 - 0.012, B + H - 0.12, 0); plate.rotation.y = -Math.PI / 2; u.add(plate);
    const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry)), hx = (L / 2 + 0.55) * c + (W / 2 + 0.1) * s, hz = (L / 2 + 0.55) * s + (W / 2 + 0.1) * c;
    col(x - hx, x + hx, z - hz, z + hz);
    // the blades: their own mesh, they turn
    for (const fx of RTU_FANS) {
      const geos = []; for (let b = 0; b < 4; b++) { const g = new THREE.BoxGeometry(0.28, 0.008, 0.11); g.translate(0.17, 0, 0); g.rotateX(0.35); g.rotateY(b * Math.PI / 2); geos.push(g); }
      const blades = new THREE.Mesh(mergeGeometries(geos), lam(0x1c1c1c)); blades.position.set(fx, B + H + 0.085, 0); u.add(blades);
      roof.fans.push({ g: blades, v: 0, phase });
    }
    roof.units.push({ x, z, phase, on: false });
  };
    rtu(-2.6, 9.5, 0, 0); rtu(4.6, 19.5, 0, 120);

  // ---- the whirlybird over the lobby: a turbine vent that turns with the wind ----
  {
    const tx = -3.2, tz = 30.4, t = new THREE.Group(); t.position.set(tx, roofY(tx, tz), tz); G.add(t);
    cy(0.2, 0.24, 0.25, alum, 0, 0.125, 0, 16, t);                               // the throat on its flashing
    cy(0.34, 0.34, 0.015, alum, 0, 0.01, 0, 20, t);
    for (let i = 0; i < 8; i++) { const a = i * 0.785; bx(0.022, 0.008, 0.022, galv, Math.cos(a) * 0.3, 0.021, Math.sin(a) * 0.3, t); }   // the flange's fasteners
    const head = new THREE.Group(); head.position.y = 0.28; t.add(head); roof.turbine = head;
    const n = 20, R = 0.24, HH = 0.32;
    for (let i = 0; i < n; i++) {                                                // curved vanes: each sweeps a quarter turn as it bulges out and back in
      const a0 = i / n * Math.PI * 2, pts = [];
      for (let k = 0; k <= 8; k++) { const f = k / 8, r = R * (0.62 + 0.38 * Math.sin(f * Math.PI)), a = a0 + f * 0.9; pts.push(V(Math.cos(a) * r, f * HH, Math.sin(a) * r)); }
      put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.012, 3), alum, 0, 0, 0, head);
    }
    cy(R * 0.64, R * 0.64, 0.025, alum, 0, 0, 0, 20, head);                      // bottom ring
    cy(R * 0.2, R * 0.66, 0.05, alum, 0, HH + 0.025, 0, 20, head);                // the crown: a shallow spun cone, ribbed, a bearing cap on top
    cy(0.022, 0.03, 0.03, galv, 0, HH + 0.065, 0, 10, head);
    for (let i = 0; i < 10; i++) { const a = i * 0.628; stick(V(Math.cos(a) * R * 0.2, HH + 0.052, Math.sin(a) * R * 0.2), V(Math.cos(a) * R * 0.66, HH + 0.002, Math.sin(a) * R * 0.66), 0.004, galv, head); }
    col(tx - 0.36, tx + 0.36, tz - 0.36, tz + 0.36);
  }
  // ---- upblast exhaust fans over the restrooms and the break room: a square curb, a flared neck, an open windband, a guard over the blades, the motor's whip ----
  for (const [ex, ez] of [[9.6, 31.4], [5.2, 31.6]]) K.at(ex, Y, ez, 0, () => {
    const body = K.met(0xbfc3c6, 45);
    K.box(K.lam(0x77746c), 0.62, 0.24, 0.62, 0, 0.12, 0); K.box(K.mats.galv, 0.68, 0.016, 0.68, 0, 0.245, 0);   // the curb, its cap flashing
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) K.bolt(a * 0.3, 0.256, b * 0.3);
    K.lathe(body, [[0.3, 0], [0.27, 0.015], [0.19, 0.09], [0.19, 0.2], [0.27, 0.27], [0.27, 0.46]], 0, 0.253, 0, 24);   // the flared neck, opening into the band
    K.ring(body, 0.27, 0.008, 0, 0.713, 0, Math.PI / 2, 0, 28);
    K.cyl(K.lam(0x141414), 0.26, 0.26, 0.004, 0, 0.56, 0, 24);                                                   // the dark throat
    for (let r = 0.08; r < 0.27; r += 0.045) K.ring(K.mats.galv, r, 0.003, 0, 0.7, 0, Math.PI / 2, 0, 24);
    for (let a = 0; a < 6; a++) K.rod(K.mats.galv, 0.003, [0, 0.702, 0], [Math.cos(a * 1.047) * 0.265, 0.7, Math.sin(a * 1.047) * 0.265], 4);
    for (let b = 0; b < 6; b++) { const a = b * 1.047; K.box(K.lam(0x2b2d30), 0.2, 0.006, 0.07, Math.cos(a) * 0.13, 0.6, -Math.sin(a) * 0.13, a, 0, 0.3); }   // the wheel, under the guard
    K.cyl(K.lam(0x24262a), 0.05, 0.05, 0.1, 0, 0.62, 0, 12);
    K.jbox(0.32, 0.17, 0.12, Math.PI / 2, 0.1, 0.1, 0.05);                                                       // its junction box, on the curb, a whip up the neck
    K.tube(K.lam(0x3a3c3e), 0.009, [[0.35, 0.22, 0.12], [0.32, 0.34, 0.1], [0.2, 0.42, 0.06], [0.19, 0.46, 0.03]], 8, 5);
    col(ex - 0.36, ex + 0.36, ez - 0.36, ez + 0.36);
  });
  // ---- the satellite dish: a 1 m offset dish on a ballasted sled, aimed south and up at the satellites ----
  {
    const dx = 8.4, dz = 3.2, d = new THREE.Group(); d.position.set(dx, Y, dz); G.add(d);
    bx(1.1, 0.06, 0.1, galv, 0, 0.05, 0.4, d); bx(1.1, 0.06, 0.1, galv, 0, 0.05, -0.4, d); bx(0.1, 0.06, 0.9, galv, 0, 0.08, 0, d);   // the sled
    for (const [sx, sz] of [[-0.3, 0.4], [0.3, 0.4], [-0.3, -0.4], [0.3, -0.4]]) K.cinder(dx + sx, Y + 0.08, dz + sz);   // the blocks holding it down
    cy(0.035, 0.035, 1.1, galv, 0, 0.6, 0, 10, d);
    for (const [sx, sz] of [[0.5, 0], [-0.5, 0], [0, 0.4]]) stick(V(sx, 0.1, sz), V(0, 0.75, 0), 0.012, galv, d);   // braces
    const aim = new THREE.Group(); aim.position.set(0, 1.12, 0); aim.rotation.set(0.68, 0, 0); d.add(aim);   // tipped up toward -z (south)
    const prof = []; for (let k = 0; k <= 10; k++) { const r = k / 10 * 0.5; prof.push(new THREE.Vector2(r, r * r * 0.45)); }
    const dish = put(new THREE.LatheGeometry(prof, 28), new THREE.MeshPhongMaterial({ color: 0xdedfe0, specular: 0x888888, shininess: 30, side: THREE.DoubleSide }), 0, 0, 0, aim);
    dish.rotation.x = -Math.PI / 2;                                             // (opening toward local -z)
    cy(0.06, 0.06, 0.1, dark, 0, 0, 0.04, 10, aim).rotation.x = Math.PI / 2;
    stick(V(0, -0.45, 0.02), V(0, -0.05, -0.55), 0.014, galv, aim);              // the feed arm
    bx(0.07, 0.07, 0.13, dark, 0, -0.03, -0.58, aim);                             // the LNB
    stick(V(0, -0.05, -0.55), V(0, -0.9, -0.1), 0.007, dark, aim);                // its cable, down the mast
    col(dx - 0.65, dx + 0.65, dz - 0.6, dz + 0.6);
  }
  // ---- an old TV antenna on a tripod (from before the dish), a little bent ----
  {
    const ax = -6.4, az = 24, a = new THREE.Group(); a.position.set(ax, Y, az); G.add(a);
    for (let k = 0; k < 3; k++) { const t = k * 2.09; stick(V(Math.cos(t) * 0.45, 0.02, Math.sin(t) * 0.45), V(0, 0.9, 0), 0.015, galv, a); }
    cy(0.022, 0.022, 3.0, galv, 0, 1.5, 0, 8, a);
    const boom = new THREE.Group(); boom.position.y = 2.85; boom.rotation.set(0.04, 0.6, 0.05); a.add(boom);
    bx(0.03, 0.03, 1.6, galv, 0, 0, 0, boom);
    for (let k = 0; k < 9; k++) { const w = 1.0 - k * 0.07; bx(w, 0.012, 0.012, alum, 0, 0, -0.75 + k * 0.18, boom); }
    stick(V(0, 0.2, 0), V(-0.1, 2.85, 0), 0.006, dark, a);
    col(ax - 0.5, ax + 0.5, az - 0.5, az + 0.5);
  }
  // ---- vent stacks with their boots, drains, and walkway pads out to the units ----
  for (const [vx, vz] of [[9.2, 34.4], [5.8, 34.6], [-1.2, 31.6], [-4.8, 42.5]]) K.stack(vx, roofY(vx, vz), vz);
  for (const [dx, dz] of [[1.5, 8], [1.5, 22], [-2.9, 42], [-6.5, 15]]) K.drain(dx, roofY(dx, dz), dz);
  const padM = lam(0x8f908c);
  const pads = (pts) => { for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx2, bz] = pts[i + 1], n = Math.ceil(Math.hypot(bx2 - ax, bz - az) / 0.75);
    for (let k = 0; k < n; k++) { const f = (k + 0.5) / n, p = bx(0.6, 0.025, 0.6, padM, ax + (bx2 - ax) * f, Y + 0.012, az + (bz - az) * f); p.rotation.y = Math.atan2(bx2 - ax, bz - az); } } };
  pads([[10.6, 29.2], [6.6, 26], [6.6, 21.2]]); pads([[6.6, 21.2], [-0.4, 14], [-0.4, 10.9]]);

  buildGrounds({ lam, put, bx, cy, ext, dark });   // around the building: the grass, the service road and its fence, the dumpster, the cardboard bed (exterior/grounds.js, exterior/serviceroad.js)
  tonyOutside({ lam, put, ext, beige, cement, coping });   // Tony's, next door (tonys/outside.js)

  // ---- the sign over the storefront: an internally lit cabinet on the fascia, standing up past the coping. From the lot
  // it's the store's name, lit at night (see roofTick); from up here it's the back of a sheet-metal box on three kickers ----
  {
    const SX = 0.8, SW = 7.2, y0 = 3.75, y1 = 5.55, zb = -0.3, zf = -0.66, s = new THREE.Group(); scene.add(s);
    const face = makeTexture((ctx, W, H) => {
      ctx.fillStyle = "#00349c"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#f2c200"; ctx.fillRect(0, H * 0.7, W, H * 0.3);
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 6; ctx.strokeRect(10, 10, W - 20, H - 20);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      let fs = 132; ctx.font = `italic 900 ${fs}px Arial Black, Arial`; while (ctx.measureText("JELLYBUSTER").width > W - 90) ctx.font = `italic 900 ${fs -= 4}px Arial Black, Arial`;
      ctx.lineWidth = 10; ctx.strokeStyle = "#0b1f5c"; ctx.strokeText("JELLYBUSTER", W / 2 + 6, H * 0.37 + 6);
      ctx.fillStyle = "#f2c200"; ctx.fillText("JELLYBUSTER", W / 2, H * 0.37);
      ctx.font = "900 52px Arial Black, Arial"; ctx.fillStyle = "#00349c"; ctx.fillText("V  I  D  E  O", W / 2, H * 0.85);
    }, 1024, 256);
    const frame = phong(0x2b2a2c, 30);
    bx(SW, y1 - y0, zb - zf, frame, SX, (y0 + y1) / 2, (zb + zf) / 2, s);
    const day = put(new THREE.PlaneGeometry(SW - 0.16, y1 - y0 - 0.16), new THREE.MeshLambertMaterial({ map: face, emissiveMap: face, emissive: 0xffffff, emissiveIntensity: 0.3 }), SX, (y0 + y1) / 2, zf - 0.004, s); day.rotation.y = Math.PI;
    const lit = put(new THREE.PlaneGeometry(SW - 0.16, y1 - y0 - 0.16), new THREE.MeshBasicMaterial({ map: face, color: 0xffffff }), SX, (y0 + y1) / 2, zf - 0.006, s); lit.rotation.y = Math.PI; lit.visible = false; glow(lit);
    for (const x of [SX - SW / 2 + 0.6, SX + SW / 2 - 0.6]) bx(0.08, 0.32, 0.36, frame, x, y0 - 0.12, (zb + zf) / 2 + 0.04, s);   // its hangers off the fascia
    ext(s); roof.sign = { day, lit };
    // the back, above the coping: an access panel, the kickers down to the deck, its power coming over the top
    const back = lam(0x55575a);
    bx(SW - 0.4, 0.42, 0.01, back, SX, y1 - 0.3, zb + 0.005);
    for (const x of [SX - 1.8, SX + 1.8]) bx(0.5, 0.36, 0.012, lam(0x6a6c70), x, y1 - 0.3, zb + 0.012);
    for (const x of [SX - 3.1, SX, SX + 3.1]) {
      stick(V(x, y1 - 0.1, zb + 0.02), V(x, Y + 0.05, 1.55), 0.022, galv);
      bx(0.22, 0.03, 0.22, galv, x, Y + 0.015, 1.55); bx(0.26, 0.05, 0.26, lam(0x5a5852), x, Y + 0.025, 1.55);   // its base plate set in a pitch pocket
      col(x - 0.12, x + 0.12, 0.1, 1.7);
    }
    const flex = new THREE.CatmullRomCurve3([V(SX + 2.4, y1 - 0.55, zb + 0.02), V(SX + 2.4, Y + PH + 0.22, 0.05), V(SX + 2.4, Y + 0.45, 0.55), V(SX + 2.4, Y + 0.12, 1.0)]);
    put(new THREE.TubeGeometry(flex, 16, 0.016, 6), dark, 0, 0, 0);
    K.strut(SX + 2.4, Y, Y + 0.32, 1.06); K.jbox(SX + 2.4, Y + 0.2, 1.1, 0, 0.2, 0.22, 0.09); K.cyl(K.lam(0x2a2c2f), 0.028, 0.028, 0.05, SX + 2.4, Y + 0.345, 1.1, 10);   // the junction box on its strut, a photocell on top
    col(SX + 2.25, SX + 2.55, 0.1, 1.2);
  }

  // ---- shade under the kit: soft dark footprints, so nothing floats on the gravel ----
  const aoTex = (() => {
    const c = document.createElement("canvas"), N = 64; c.width = c.height = N; const g = c.getContext("2d"), im = g.createImageData(N, N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const qx = Math.abs((i + 0.5) / N * 2 - 1), qy = Math.abs((j + 0.5) / N * 2 - 1), d = Math.hypot(Math.max(qx - 0.45, 0), Math.max(qy - 0.45, 0)) / 0.55;
      const a = Math.max(0, 1 - d); im.data[(j * N + i) * 4 + 3] = Math.round(255 * a * a * (3 - 2 * a));
    }
    g.putImageData(im, 0, 0); return new THREE.CanvasTexture(c);
  })();
  const aoGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), aoM = new THREE.MeshBasicMaterial({ color: 0x000000, map: aoTex, transparent: true, opacity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  roof.shades = aoM;
  const shade = (x, z, w, d, ry = 0, par = G, y = Y) => { const o = put(aoGeo, aoM, x, y + 0.006, z, par); o.scale.set(w, 1, d); o.rotation.y = ry; o.renderOrder = 1; return o; };
  for (const u of roof.units) { shade(u.x, u.z, 3.1, 2.1); shade(u.x - 1.6, u.z + 0.5, 0.5, 0.5); }
  shade(-3.2, 30.4, 0.95, 0.95, 0, G, TY); for (const [ex, ez] of [[9.6, 31.4], [5.2, 31.6]]) shade(ex, ez, 1.05, 1.05);
  shade(8.4, 3.2, 1.6, 1.4); shade(-6.4, 24, 1.1, 1.1);
  for (const [vx, vz] of [[9.2, 34.4], [5.8, 34.6], [-1.2, 31.6], [-4.8, 42.5]]) shade(vx, vz, 0.55, 0.55, 0, G, roofY(vx, vz));

  // ---- the gravel's weathering: blown thin and bare in the windy corners, dark rings of silt round the drains where
  // the water sits, rust under the gas line, a green slick where the condensate dribbles, grime along the parapets.
  // One sheet over the deck, its picture laid over the whole building ----
  const DX0 = -7.84, DXW = 18.94, DZ0 = -0.1, DZD = 48.7, DRAINS = [[1.5, 8], [1.5, 22], [-2.9, 42], [-6.5, 15]];
  {
    const W = 512, H = 1024, px = x => (x - DX0) / DXW * W, py = z => (z - DZ0) / DZD * H, m = W / DXW;   // m: pixels per metre (near enough both ways)
    const tex = makeTexture((ctx, W, H) => {
      ctx.clearRect(0, 0, W, H);
      const blot = (x, z, r, rgba) => { const g = ctx.createRadialGradient(px(x), py(z), 0, px(x), py(z), r * m); g.addColorStop(0, rgba); g.addColorStop(1, rgba.replace(/[\d.]+\)$/, "0)")); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px(x), py(z), r * m, 0, 7); ctx.fill(); };
      let sd = 7; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 90; i++) blot(DX0 + r() * DXW, DZ0 + r() * DZD, 1 + r() * 3.5, i % 3 ? `rgba(34,30,26,${0.1 + r() * 0.14})` : `rgba(236,230,214,${0.08 + r() * 0.1})`);
      ctx.strokeStyle = "rgba(30,27,24,0.28)"; ctx.lineWidth = 0.9 * m; ctx.lineJoin = "round"; ctx.beginPath();   // swept up against the parapets
      for (const Q of [P, PT]) { ctx.beginPath(); Q.forEach(([x, z], i) => i ? ctx.lineTo(px(x), py(z)) : ctx.moveTo(px(x), py(z))); ctx.closePath(); ctx.stroke(); }
      for (const [x, z] of DRAINS) { blot(x, z, 2.2, "rgba(18,20,22,0.42)"); blot(x, z, 1.1, "rgba(120,106,82,0.35)"); }
      for (const [x, z] of [[-4.6, 26], [5.6, 13.5], [-1.5, 45]]) blot(x, z, 1.6, "rgba(18,20,22,0.3)");   // the low spots that pond
      for (const u of roof.units) for (let k = 0; k < 3; k++) blot(u.x - 0.85, u.z - 1.6 - k * 0.8, 0.28, "rgba(122,62,24,0.45)");
      blot(6.4, 18.6, 0.7, "rgba(46,70,38,0.5)");
      for (const [x, z, s] of [[-7.0, 0.9, 1.4], [10.2, 0.8, 1.1], [-6.2, 47.7, 1.2], [10.3, 34.4, 0.8]]) {   // scoured to the bare sheet
        ctx.fillStyle = "rgba(186,187,181,0.92)"; ctx.beginPath();
        for (let a = 0; a < 18; a++) { const t = a / 18 * Math.PI * 2, rr = s * m * (0.55 + r() * 0.45); ctx.lineTo(px(x) + Math.cos(t) * rr * 1.3, py(z) + Math.sin(t) * rr * 0.8); }
        ctx.fill();
        for (let k = 0; k < 160; k++) { const t = r() * 7, rr = s * m * (0.3 + r() * 0.9); ctx.fillStyle = r() < 0.5 ? "#6f6b64" : "#a8a49b"; ctx.fillRect(px(x) + Math.cos(t) * rr * 1.3, py(z) + Math.sin(t) * rr * 0.8, 1.5, 1.5); }
      }
    }, W, H);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.repeat.set(1 / DXW, 1 / DZD); tex.offset.set(-DX0 / DXW, (DZD + DZ0) / DZD);   // (the deck's uvs are world metres, v = -z)
    const sh = new THREE.Shape(P.map(([x, z]) => new THREE.Vector2(x, -z))), hole = new THREE.Path(), { x0, x1, z0, z1 } = ROOF_HATCH;
    hole.moveTo(x0, -z0); hole.lineTo(x0, -z1); hole.lineTo(x1, -z1); hole.lineTo(x1, -z0); hole.lineTo(x0, -z0); sh.holes.push(hole);
    const o = put(new THREE.ShapeGeometry(sh), new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), 0, Y + 0.003, 0);
    o.rotation.x = -Math.PI / 2; roof.grime = o.material;
    put(new THREE.ShapeGeometry(new THREE.Shape(PT.map(([x, z]) => new THREE.Vector2(x, -z)))), o.material, 0, TY + 0.003, 0).rotation.x = -Math.PI / 2;   // (the tall block's, the same picture)
  }
  // puddles: standing water in the low spots and round the drains after rain, the sky shining in them; they outlast the
  // wet on the lot (see roofTick)
  {
    const blob = (() => {
      const c = document.createElement("canvas"), N = 128; c.width = c.height = N; const g = c.getContext("2d");
      g.fillStyle = "#000"; g.fillRect(0, 0, N, N); g.filter = "blur(3px)"; g.fillStyle = "#fff"; g.beginPath();
      for (let a = 0; a < 24; a++) { const t = a / 24 * Math.PI * 2, rr = N * (0.34 + 0.05 * Math.sin(t * 2 + 1) + 0.035 * Math.sin(t * 5 + 2) + 0.02 * Math.sin(t * 9)); g.lineTo(N / 2 + Math.cos(t) * rr, N / 2 + Math.sin(t) * rr); }
      g.fill(); return new THREE.CanvasTexture(c);
    })();
    const pm = new THREE.MeshBasicMaterial({ color: 0x8a96a6, alphaMap: blob, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    const pg = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    for (const [x, z, w, d, ry] of [[1.5, 8, 3.2, 2.4, 0.3], [1.6, 22.2, 2.6, 2.2, 1.1], [-2.9, 42, 2.8, 2.0, 0.2], [-6.4, 15, 1.6, 2.6, 0], [-4.6, 26, 2.6, 1.7, 0.7], [5.6, 13.5, 2.2, 1.6, 2.0], [-1.5, 45, 2.0, 1.4, 0.4]]) {
      const o = put(pg, pm, x, roofY(x, z) + 0.008, z); o.scale.set(w, 1, d); o.rotation.y = ry; o.renderOrder = 2;
    }
    roof.puddles = pm;
  }

  // ---- overflow scuppers through the parapet, each with a collector head and a downspout down the outside ----
  {
    const sm = lam(0xb7b2a4), hole = new THREE.MeshBasicMaterial({ color: 0x141414 });
    for (const [x, z, nx, nz] of SCUPPERS) {
      const Y = deckY(x + nx * 0.3, z + nz * 0.3);                         // (the tall block's are up on its roof)
      const ry = nx ? Math.PI / 2 : 0, at = (k, y, w, h, d, m, par) => { const o = bx(w, h, d, m, x + nx * k, y, z + nz * k, par); o.rotation.y = ry; return o; };
      at(T + 0.004, Y + 0.09, 0.42, 0.2, 0.012, galv); at(T + 0.012, Y + 0.09, 0.34, 0.13, 0.006, hole);   // the opening's sheet-metal lining, from the deck
      const o = -0.24;                                                    // outside the skin
      at(-0.16, Y + 0.09, 0.3, 0.12, 0.2, galv, skin);                    // the scupper's lip
      at(o, Y - 0.12, 0.42, 0.34, 0.22, sm, skin);                        // the collector head
      at(o, (Y - 0.3 + 0.32) / 2, 0.1, Y - 0.62, 0.08, sm, skin);           // the downspout
      at(o - 0.12, 0.26, 0.1, 0.08, 0.28, sm, skin);                      // its kick-out at the foot
      for (let y = 1.0; y < Y - 0.5; y += 1.15) at(-0.18, y, 0.14, 0.03, 0.06, sm, skin);   // straps
    }
  }

  // ---- conduit and condensate: EMT from each disconnect on rubber-footed supports to a pitch pocket where it goes down through the
  // roof; the condensate in white PVC, through a trap, along the deck to a drain or a splash block ----
  {
    const pvc = K.lam(0xe6e4dc), y = Y + 0.13, FEEDS = [[[-4.2, Y + 0.56, 10.0], [-4.2, y, 10.0], [-4.2, y, 13.5], [-6.9, y, 13.5], [-6.9, Y + 0.09, 13.5]], [[3.0, Y + 0.56, 20.0], [3.0, y, 20.0], [3.0, y, 24.6], [3.0, Y + 0.09, 24.6]]];
    for (const pts of FEEDS) {
      K.conduit(pts, { r: 0.018, m: K.mats.galv, base: Y });
      const [c0, c1] = pts; K.lb(c0[0], (c1[1] + 0.06), c0[2] + 0.002, 0);
      const e = pts.at(-1); K.pitchPocket(e[0], Y, e[2], 0.018); col(e[0] - 0.2, e[0] + 0.2, e[2] - 0.2, e[2] + 0.2);
    }
    const trap = (x, yy, z, dx) => {             // a P-trap off the drain pan's stub: down, round, up and out
      K.rod(pvc, 0.014, [x, yy, z], [x + dx * 0.06, yy, z]); K.rod(pvc, 0.014, [x + dx * 0.06, yy, z], [x + dx * 0.06, yy - 0.12, z]); K.ring(pvc, 0.045, 0.014, x + dx * 0.105, yy - 0.12, z, 0, 0, 12);
      K.rod(pvc, 0.014, [x + dx * 0.15, yy - 0.12, z], [x + dx * 0.15, yy - 0.03, z]);
    };
    const flat = Y + 0.07;
    trap(-1.42, Y + 0.36, 9.0, 1); K.conduit([[-1.27, Y + 0.33, 9.0], [-1.27, flat, 9.0], [1.15, flat, 8.15]], { r: 0.013, m: pvc, couple: 3, spacing: 1.2, base: Y });
    trap(5.72, Y + 0.36, 19.2, 1); K.conduit([[5.87, Y + 0.33, 19.2], [6.05, Y + 0.33, 19.2], [6.05, flat, 19.2], [6.3, flat, 18.75]], { r: 0.013, m: pvc, couple: 0 });
    K.at(6.4, Y, 18.6, 0.5, () => {              // the splash block: concrete, a channel down its middle
      for (const s of [-1, 1]) K.box(K.mats.conc, 0.09, 0.05, 0.6, s * 0.105, 0.025, 0);
      K.box(K.lam(0x7f7c75), 0.12, 0.02, 0.6, 0, 0.01, 0); K.box(K.mats.conc, 0.3, 0.05, 0.05, 0, 0.025, -0.28);
    });
  }

  // ---- where the staff come up for a smoke: a webbed lawn chair facing the lot, a coffee can of butts, a milk crate
  // for a table ----
  {
    const lawnChair = (x, z, ry, web) => {
    const c = new THREE.Group(); c.position.set(x, Y, z); c.rotation.y = ry; G.add(c);
    const tube = phong(0xc8ccd0, 70), R = 0.011;
    const L = (a, b) => stick(V(...a), V(...b), R, tube, c);
    for (const s of [-1, 1]) {
      const x = s * 0.27;
      L([x, 0, -0.26], [x, 0.4, 0.2]); L([x, 0, 0.26], [x, 0.4, -0.2]);                // the X legs
      L([x, 0.38, -0.22], [x, 0.38, 0.22]);                                              // seat rail
      L([x, 0.4, 0.22], [x, 0.95, 0.38]);                                                // back upright
      L([x, 0.6, -0.2], [x, 0.6, 0.27]); L([x, 0.38, -0.2], [x, 0.6, -0.2]);             // arm and its post
      bx(0.05, 0.025, 0.46, lam(0xd8d2c2), x, 0.62, 0.03, c);                            // armrest
    }
    L([-0.27, 0.38, -0.22], [0.27, 0.38, -0.22]); L([-0.27, 0.95, 0.38], [0.27, 0.95, 0.38]); L([-0.27, 0, -0.26], [0.27, 0, -0.26]); L([-0.27, 0, 0.26], [0.27, 0, 0.26]);
    for (let k = 0; k < 6; k++) bx(0.075, 0.004, 0.44, web[k % 2], -0.22 + k * 0.088, 0.37, 0, c);   // seat webbing, front to back, sagging a bit
    for (let k = 0; k < 6; k++) { const b = bx(0.54, 0.004, 0.07, web[(k + 1) % 2], 0, 0.36, -0.17 + k * 0.07, c); }
    for (let k = 0; k < 6; k++) { const t = (k + 0.5) / 6, b = bx(0.54, 0.07, 0.004, web[k % 2], 0, 0.42 + t * 0.5, 0.235 + t * 0.14, c); b.rotation.x = -0.29; }
    // to sit in: E on it (see onE). The sitter faces the way the chair does (-z, its back to +z), hips down in the sag of the webbing
    const hit = bx(0.58, 0.62, 0.56, new THREE.MeshBasicMaterial({ visible: false }), 0, 0.5, 0.06, c);
    hit.userData.sit = true; hit.userData.seatPos = { x, y: Y, z, ry: ry + Math.PI, hipY: 0.43, roof: true }; roof.seats.push(hit);
    };
    lawnChair(9.9, 26.4, 0.55, [lam(0x2f8a58), lam(0xe8e4d4)]);
    // the can, by the right arm: an old coffee can, lid long gone, half full of sand gone grey with ash, the butts
    // stubbed out standing up in it, and a few that missed it. (Open tube, its own inside wall and floor: no two
    // surfaces in the same place to fight)
    const can = new THREE.Group(); can.position.set(10.5, Y, 26.1); can.rotation.y = 2.2; G.add(can);
    const canTex = makeTexture((ctx, W, H) => {
      ctx.fillStyle = "#a3302a"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#e9dfc4"; ctx.fillRect(0, H * 0.38, W, H * 0.26);
      ctx.fillStyle = "#a3302a"; ctx.font = `bold ${H * 0.2}px Georgia, serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (const x of [0.25, 0.75]) ctx.fillText("COFFEE", W * x, H * 0.52);
      ctx.fillStyle = "#e9dfc4"; ctx.font = `bold ${H * 0.1}px Arial`; for (const x of [0.25, 0.75]) ctx.fillText("ROASTED · GROUND", W * x, H * 0.24);
      ctx.fillStyle = "#00000030"; for (let i = 0; i < 40; i++) ctx.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 6, 1 + Math.random() * 3);   // scuffs
    }, 256, 64);
    const CR = 0.078, CH = 0.16, tin = phong(0xb9bcc0, 50);
    put(new THREE.CylinderGeometry(CR, CR, 0.124, 24, 1, true), new THREE.MeshLambertMaterial({ map: canTex }), 0, 0.08, 0, can);       // the label
    for (const [y0, h] of [[0, 0.018], [0.142, 0.018]]) put(new THREE.CylinderGeometry(CR, CR, h, 24, 1, true), tin, 0, y0 + h / 2, 0, can);   // bare tin above and below it
    put(new THREE.CylinderGeometry(CR - 0.002, CR - 0.002, CH, 24, 1, true), new THREE.MeshLambertMaterial({ color: 0x5e5a55, side: THREE.BackSide }), 0, CH / 2, 0, can);   // the inside, sooty
    const rim = new THREE.TorusGeometry(CR - 0.001, 0.0025, 6, 24); rim.rotateX(Math.PI / 2);
    put(rim, tin, 0, CH, 0, can); put(rim, tin, 0, 0.003, 0, can);                                                     // rolled lip, rolled base
    for (const y of [0.025, 0.137]) { const b = new THREE.TorusGeometry(CR + 0.0005, 0.0015, 4, 24); b.rotateX(Math.PI / 2); put(b, tin, 0, y, 0, can); }   // the beads
    const disc = (r, y, c) => { const g = new THREE.CircleGeometry(r, 20); g.rotateX(-Math.PI / 2); return put(g, lam(c), 0, y, 0, can); };
    disc(CR - 0.002, 0.004, 0x3a3835);                                                                                // the floor (seen only from above, past the sand)
    const SY = 0.112, sand = new THREE.CircleGeometry(CR - 0.002, 24); sand.rotateX(-Math.PI / 2);
    const sp = sand.attributes.position; for (let i = 1; i < sp.count; i++) sp.setY(i, (Math.random() - 0.5) * 0.006);   // lumpy, not a lid
    sand.computeVertexNormals(); put(sand, lam(0x8f8a80), 0, SY, 0, can);
    for (let k = 0; k < 4; k++) { const a = Math.random() * 6.28, d = Math.random() * 0.04, ash = new THREE.CircleGeometry(0.012 + Math.random() * 0.012, 8); ash.rotateX(-Math.PI / 2);
      put(ash, lam(0x5c5955), Math.cos(a) * d, SY + 0.0045, Math.sin(a) * d, can); }                                    // grey ash heaps, sat on the lumps
    const butt = new THREE.CylinderGeometry(0.0045, 0.0045, 0.026, 6), filt = new THREE.CylinderGeometry(0.0046, 0.0046, 0.012, 6), bm = lam(0xe9e2cf), fm = lam(0xc9883e), burnt = lam(0x3b3633);
    const stub = (x, y, z, rx, rz, par, lying) => {                                                                     // a filter and what's left of the cigarette, the end charred
      const s = new THREE.Group(); s.position.set(x, y, z); s.rotation.set(rx, Math.random() * 6.28, rz); par.add(s);
      put(filt, fm, 0, 0.006, 0, s); put(butt, bm, 0, 0.012 + 0.013 * (lying ? 1 : 0.6), 0, s).scale.y = lying ? 1 : 0.6;
      cy(0.0044, 0.0046, 0.003, burnt, 0, lying ? 0.0395 : 0.029, 0, 6, s); return s;
    };
    for (let k = 0; k < 11; k++) { const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * 0.06;            // stubbed in, filter up, leaning every which way
      stub(Math.cos(a) * d, SY + 0.016, Math.sin(a) * d, Math.PI + (Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.9, can); }
    for (let k = 0; k < 5; k++) { const a = Math.random() * 6.28, d = 0.12 + Math.random() * 0.25;                  // the ones that missed, lying on the gravel
      stub(Math.cos(a) * d, 0.0046, Math.sin(a) * d, Math.PI / 2, 0, can, true); }
    // the crate, upside down, a can of soda and a paperback left on it
    const crateTex = makeTexture((ctx, W, H) => {
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#24479a"; ctx.fillRect(0, 0, W, 18); ctx.fillRect(0, H - 14, W, 14); ctx.fillRect(0, 0, 14, H); ctx.fillRect(W - 14, 0, 14, H);
      for (let x = 14; x < W; x += 30) ctx.fillRect(x, 0, 8, H); for (let y = 18; y < H; y += 28) ctx.fillRect(0, y, W, 7);
    }, 128, 128);
    const crate = bx(0.33, 0.28, 0.33, new THREE.MeshLambertMaterial({ map: crateTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }), 9.45, Y + 0.14, 25.95); crate.rotation.y = 0.3;
    cy(0.033, 0.033, 0.12, lam(0x3d8a3b), 9.42, Y + 0.34, 25.9, 12); cy(0.03, 0.03, 0.006, alum, 9.42, Y + 0.403, 25.9, 12);
    bx(0.11, 0.018, 0.17, lam(0x8a2f6a), 9.52, Y + 0.289, 26.02).rotation.y = 0.8;
    // ---- a movie up here: a second lawn chair beside the first, and a projector propped on a VCR
    // on the AC unit behind the screen, turned to aim at the back of a bedsheet clipped to a length of conduit between
    // a broom and a mop stood up in crates of tapes, a few metres off: rear projection, so the beam's out of your eyes,
    // back there for anyone who walks round. Whatever's in a VCR plays on it (see cineTick): washed out to almost nothing
    // in the day, the picture after dark, its edges soft and ragged, the sheet's weave and folds through it ----
    lawnChair(9.9 - Math.cos(0.55) * 0.8, 26.4 + Math.sin(0.55) * 0.8, 0.62, [lam(0x2a5fa8), lam(0xf0d34a)]);   // the second: blue and yellow, the same vintage
    {
      const k = new THREE.Group(); k.position.set(9.9 - Math.cos(0.55) * 0.4 + Math.sin(0.55) * 0.95, Y, 26.4 + Math.sin(0.55) * 0.4 + Math.cos(0.55) * 0.95); k.rotation.y = 0.58; G.add(k); k.updateMatrixWorld(true);
      const crateM = new THREE.MeshLambertMaterial({ map: crateTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }), tapeM = lam(0x161616);
      // the projector, a 90s LCD one, a school's, from somebody's garage: on top of the AC unit behind the screen, clear of its fans, propped up on the VCR, the pair turned to aim at the sheet
      const screenAt = k.localToWorld(V(-0.06, 0, -4.6)), UNIT_TOP = Y + 1.35, PX = 4.0, PZ = 19.6, VCR_H = 0.085;
      const proj = new THREE.Group(); proj.position.set(PX, UNIT_TOP + VCR_H, PZ); proj.rotation.y = Math.atan2(PX - screenAt.x, PZ - screenAt.z); G.add(proj); proj.updateMatrixWorld(true);
      const shell = phong(0xcfcabf, 30);
      bx(0.31, 0.1, 0.25, shell, 0, 0.05, 0, proj); bx(0.29, 0.015, 0.23, lam(0x9a968e), 0, 0.105, 0, proj);
      for (let i = 0; i < 6; i++) bx(0.004, 0.06, 0.12, dark, 0.157, 0.05, -0.05 + i * 0.02, proj);   // its fan grille
      cy(0.042, 0.042, 0.05, dark, 0.07, 0.055, -0.14, 16, proj).rotation.x = Math.PI / 2;               // the lens barrel
      const lens = put(new THREE.CircleGeometry(0.03, 16), new THREE.MeshBasicMaterial({ color: 0x223040 }), 0.07, 0.055, -0.1655, proj); lens.rotation.y = Math.PI;
      const led = put(new THREE.PlaneGeometry(0.012, 0.012), new THREE.MeshBasicMaterial({ color: 0x331a00 }), -0.1, 0.1135, 0.06, proj); led.rotation.x = -Math.PI / 2;
      const vcr = new THREE.Group(); vcr.position.set(PX, UNIT_TOP, PZ); vcr.rotation.y = proj.rotation.y; G.add(vcr);
      bx(0.25, VCR_H, 0.3, lam(0x1d1d1f), 0, 0.0425, 0, vcr);
      bx(0.17, 0.022, 0.004, lam(0x050505), -0.02, 0.05, -0.151, vcr);                              // the tape door
      const vled = put(new THREE.PlaneGeometry(0.05, 0.016), new THREE.MeshBasicMaterial({ color: 0x0a1a10 }), 0.08, 0.05, -0.1515, vcr); vled.rotation.y = Math.PI;
      const cord = lam(0xd8641c), blk = lam(0x111111);                                                 // the cables: below, the video from the VCR up to the projector, and the projector's power
      roof.cine = { proj: proj.children.slice(), vcr: vcr.children.slice(), led, vled, lens, sound: k, on: false };   // (the sound's by the chairs: the projector and VCR are way off behind the screen)
      const P = proj.localToWorld(V(0.07, 0.055, -0.17));                                              // the lens, in the world
      // the projector's plugged in by the AC unit: a weatherproof outlet on the disconnect's strut, a short run of orange cord out over the unit's edge and down its end
      const OX = 3.0, OZ = 20.0; bx(0.09, 0.13, 0.07, lam(0x7e858c), OX + 0.05, Y + 0.42, OZ); bx(0.012, 0.09, 0.05, lam(0x9a9fa4), OX + 0.1, Y + 0.42, OZ);
      { const pts = [proj.localToWorld(V(-0.1, 0.05, 0.13)), proj.localToWorld(V(-0.1, -0.02, 0.19)), V(3.6, UNIT_TOP + 0.03, 19.95), V(3.36, UNIT_TOP + 0.025, 20.0), V(3.33, UNIT_TOP - 0.1, 20.02), V(3.3, Y + 0.46, 20.02), V(OX + 0.11, Y + 0.4, OZ)]; for (let i = 0; i < pts.length - 1; i++) stick(pts[i], pts[i + 1], 0.007, cord); }
      // the video cable: out the VCR's back, up to the projector's
      { const pts = [proj.localToWorld(V(0.1, -0.03, 0.15)), proj.localToWorld(V(0.11, -0.01, 0.2)), proj.localToWorld(V(0.1, 0.05, 0.13))]; for (let i = 0; i < pts.length - 1; i++) stick(pts[i], pts[i + 1], 0.006, blk); }
      const box = (o, x0, x1, z0, z1) => { const p = [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].map(([x, z]) => o.localToWorld(V(x, 0, z))), xs = p.map(q => q.x), zs = p.map(q => q.z); col(Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)); };
      // the screen, 4.6 m out in front
      const sc = new THREE.Group(); sc.position.copy(k.localToWorld(V(-0.06, 0, -4.6))).setY(Y); sc.rotation.y = 0.58; G.add(sc); sc.updateMatrixWorld(true);
      const SW = 1.9, SH = 1.32, TOP = 1.98, wood = K.lam(0x9a7448), woodD = K.lam(0x6e4f2e), rope = K.lam(0xd8cfa8);
      // Two handles stood up in milk crates packed tight with tapes, a stick of conduit taped across them, a guy rope off each to a cinder
      // block: the rig. On the left, a corn broom, head up, stitched and flared. On the right, a string mop, its strands flopped over. Taped
      // and re-taped by someone who wanted to see a movie.
      K.frame(sc.matrixWorld, () => {
        for (const s of [-1, 1]) {
          const X = s * 1.02, tilt = s * 0.006;    // (not quite plumb)
          for (const [dx, dz, ry] of [[0, 0.165, 0], [0, -0.165, Math.PI], [0.165, 0, Math.PI / 2], [-0.165, 0, -Math.PI / 2]]) K.plane(crateM, 0.33, 0.28, X + dx, 0.14, dz, ry);   // the crate: four sides, open at the top
          for (const [dx, dz, w, d] of [[0, 0.165, 0.34, 0.012], [0, -0.165, 0.34, 0.012], [0.165, 0, 0.012, 0.34], [-0.165, 0, 0.012, 0.34]]) K.box(K.lam(0x24479a), w, 0.018, d, X + dx, 0.275, dz);   // its rim
          K.box(K.lam(0x101012), 0.31, 0.012, 0.31, X, 0.012, 0);                        // ...its floor, dark past the slats
          // packed with tapes, round the handle, spines up: a double row either side, one or two jammed in on the skew
          const LAB = [0xefeee6, 0xd9c26a, 0xc7dbe8, 0xe3b6a6];
          for (const zs of [-0.115, 0.115]) for (let i = 0; i < 5; i++) { const px = X - 0.12 + i * 0.06; K.at(px, 0.115, zs, Math.PI / 2, () => K.tape(0, 0, 0, 0, 0, Math.PI / 2, LAB[(i + (zs > 0 ? 1 : 0)) % 4])); }
          K.at(X - 0.1, 0.19, 0.012, 0.3, () => K.tape(0, 0, 0, 0, 0.5, 0.1, LAB[1]));
          K.at(X + 0.095, 0.2, -0.02, -0.5, () => K.tape(0, 0, 0, 0, -0.35, -0.2, LAB[2]));
          // the handle: wood, a darker stain where hands go, a band of duct tape down at the crate and another round the conduit
          K.rod(wood, 0.014, [X, 0.03, 0], [X + tilt, TOP + 0.12, 0], 10);
          K.rod(woodD, 0.0146, [X + tilt * 0.5, 0.95, 0], [X + tilt * 0.6, 1.3, 0], 10);
          K.ductTape(X, 0.3, 0, 0.014, 5, 0.05);
          K.box(K.met(0xb9bcc0, 40), 0.05, 0.003, 0.345, X, 0.287, 0); K.box(K.met(0xb9bcc0, 40), 0.05, 0.1, 0.003, X, 0.24, 0.172); K.box(K.met(0xb9bcc0, 40), 0.05, 0.1, 0.003, X, 0.24, -0.172);   // a strip over the tapes and down the crate, holding them in
          K.ductTape(X + tilt, TOP, 0, 0.018, 6, 0.045, s > 0);                          // the joint: round and round, over the conduit
          K.rod(K.met(0xb9bcc0, 40), 0.003, [X - 0.05, TOP + 0.045, 0.021], [X + 0.05, TOP - 0.045, 0.021], 5); K.rod(K.met(0xb9bcc0, 40), 0.003, [X - 0.05, TOP - 0.045, 0.021], [X + 0.05, TOP + 0.045, 0.021], 5);
          // the guy rope: a clove hitch up by the joint, down and out to a cinder block, slack enough to sag, a knot at the block
          const BX = s * 1.85, BZ = -0.55;
          K.ring(rope, 0.019, 0.005, X, TOP - 0.1, 0, Math.PI / 2, 0, 10); K.ring(rope, 0.019, 0.005, X, TOP - 0.112, 0, Math.PI / 2, 0, 10);
          K.tube(rope, 0.0045, [[X, TOP - 0.1, 0], [X + s * 0.26, TOP - 0.62, BZ * 0.32], [X + s * 0.56, 0.72, BZ * 0.66], [BX, 0.24, BZ]], 14, 5);
          K.cinder(BX, 0, BZ, s * 0.5);
          K.ring(rope, 0.024, 0.006, BX, 0.2, BZ, 0.5, 0, 10);
          { const w = new THREE.Vector3(BX, 0, BZ).applyMatrix4(sc.matrixWorld); col(w.x - 0.24, w.x + 0.24, w.z - 0.24, w.z + 0.24); }
        }
        // the broom: a tin ferrule, the corn flared and flattened, three rows of red stitching, the tips splayed
        { const X = -1.02 - 0.006, B0 = TOP + 0.1, straw = K.lam(0xc89a3c), strawD = K.lam(0xa77c2a), red = K.lam(0xb3211d), tin = K.met(0xa9aeb3, 50);
          K.cyl(tin, 0.02, 0.016, 0.05, X, B0 + 0.015, 0, 12); K.ring(tin, 0.02, 0.0025, X, B0 + 0.04, 0);
          K.lathe(straw, [[0.018, 0], [0.05, 0.03], [0.1, 0.1], [0.135, 0.19], [0.155, 0.27], [0.13, 0.285], [0, 0.285]], X, B0 + 0.04, 0, 18, 1, 1, 0.3);   // the head, flattened
          for (const [y, r] of [[0.1, 0.103], [0.14, 0.12], [0.18, 0.137]]) K.lathe(red, [[r - 0.002, y - 0.004], [r + 0.0035, y - 0.002], [r + 0.0035, y + 0.002], [r - 0.002, y + 0.004]], X, B0 + 0.04, 0, 18, 1, 1, 0.31);
          for (let i = 0; i < 46; i++) { const f = i / 45, sp = (f - 0.5) * 2, off = (i % 5 - 2) * 0.008; K.rod(i % 3 ? straw : strawD, 0.0028, [X + sp * 0.14, B0 + 0.28, off], [X + sp * (0.17 + (i % 4) * 0.008), B0 + 0.345 + ((i * 7) % 5) * 0.009, off * 1.6], 4); }   // the tips, past the shoulder
          for (const s of [-1, 1]) K.rod(K.lam(0x8a2a1c), 0.002, [X + s * 0.03, B0 + 0.1, 0.048], [X + s * 0.06, B0 + 0.21, 0.052], 4);
        }
        // the mop: a sheet-metal clamp with its wing bolt, cotton strings up over it and down its outer side, clear of the picture
        { const X = 1.02 + 0.006, M0 = TOP + 0.12, clamp = K.met(0x9aa0a6, 40), cot = K.lam(0xeee8d6), cotD = K.lam(0xb9b5a4);
          K.cyl(clamp, 0.019, 0.019, 0.06, X, M0, 0, 10); K.box(clamp, 0.2, 0.022, 0.05, X + 0.05, M0 + 0.035, 0); K.box(clamp, 0.2, 0.006, 0.058, X + 0.05, M0 + 0.05, 0);
          K.bolt(X, M0 + 0.056, 0, 0.012, K.mats.steel); K.box(K.mats.steel, 0.05, 0.004, 0.012, X, M0 + 0.064, 0);   // its wing nut
          for (let i = 0; i < 44; i++) {
            const a = (i / 43 - 0.5) * Math.PI * 0.94, cx = Math.cos(a), cz = Math.sin(a),   /* (a half circle, the side away from the screen) */ j = (i * 13) % 7 / 7, sag = 0.26 + j * 0.2;
            const x0 = X + cx * 0.02, z0 = cz * 0.022, r1 = 0.11 + cx * 0.06 + j * 0.05;
            K.tube(i % 5 === 0 ? cotD : cot, 0.0078, [[x0, M0 + 0.05, z0], [X + cx * 0.13, M0 + 0.085, cz * 0.06], [X + cx * r1, M0 + 0.03, cz * (0.09 + j * 0.03)], [X + cx * (r1 + 0.03), M0 - sag * 0.5, cz * (0.11 + j * 0.03)], [X + cx * (r1 + 0.01 + j * 0.03), M0 - sag, cz * (0.1 + j * 0.05)]], 9, 4);
          }
        }
        // the crossbar: a stick of half-inch EMT, past the handles either side, a coupling in it, a cut end
        K.conduit([[-1.1, TOP, 0.015], [1.1, TOP, 0.015]], { r: 0.011, couple: 1.3 });
        for (const x of [-1.1, 1.1]) K.ring(K.lam(0x62666a), 0.0095, 0.0015, x, TOP, 0.015, 0, Math.PI / 2, 10);
      });
      // the sheet: an old twin flat sheet, cream with a faded stripe, clipped up along the bar, sagging between the clips,
      // creased from the linen closet, its bottom hem hanging free
      const sheetTex = makeTexture((c, W, H) => {
        c.fillStyle = "#e6dfcd"; c.fillRect(0, 0, W, H);
        for (let x = 0; x < W; x += 2) { c.fillStyle = `rgba(120,110,90,${0.04 + Math.random() * 0.05})`; c.fillRect(x, 0, 1, H); }   // the weave
        for (let y = 0; y < H; y += 2) { c.fillStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.04})`; c.fillRect(0, y, W, 1); }
        for (let x = 18; x < W; x += 64) { c.fillStyle = "rgba(150,170,200,0.13)"; c.fillRect(x, 0, 14, H); c.fillStyle = "rgba(200,150,160,0.1)"; c.fillRect(x + 20, 0, 4, H); }   // the stripe, washed out
        const st = c.createRadialGradient(W * 0.72, H * 0.3, 0, W * 0.72, H * 0.3, 26); st.addColorStop(0, "rgba(160,130,70,0.16)"); st.addColorStop(1, "rgba(160,130,70,0)"); c.fillStyle = st; c.fillRect(0, 0, W, H);   // a stain
        c.fillStyle = "rgba(0,0,0,0.08)"; c.fillRect(0, H - 10, W, 3);                                 // the hem's stitching
      }, 512, 512);
      const geo = new THREE.PlaneGeometry(SW, SH, 48, 34), pa = geo.attributes.position, CLIPS = [-0.93, -0.47, 0, 0.47, 0.93];
      for (let i = 0; i < pa.count; i++) {
        const x = pa.getX(i), y = pa.getY(i), down = (SH / 2 - y) / SH;                                // 0 at the bar, 1 at the hem
        let gap = 1; for (let j = 0; j < CLIPS.length - 1; j++) if (x >= CLIPS[j] && x <= CLIPS[j + 1]) gap = Math.sin(Math.PI * (x - CLIPS[j]) / (CLIPS[j + 1] - CLIPS[j]));
        if (x < CLIPS[0] || x > CLIPS.at(-1)) gap = 0.4;
        const sag = 0.035 * gap * Math.max(0, 1 - down * 5);                                           // droops between the clips, near the top
        const fold = 0.012 * Math.sin(x * 9 + y * 2.3) + 0.008 * Math.sin(x * 23 - y * 5) + 0.02 * Math.sin(y * 4.4) * Math.sin(x * 2.2 + 0.7)   // creases, a couple of the folds it was stored in
          + 0.018 * Math.max(0, 1 - Math.abs(y + 0.05) * 30) + 0.014 * Math.max(0, 1 - Math.abs(x - 0.32) * 25);
        pa.setXYZ(i, x * (1 - 0.01 * down), y - sag, fold + 0.04 * down * down * Math.sin(x * 3.1));   // (the hem lifts a little in the air)
      }
      geo.computeVertexNormals();
      const sheetM = new THREE.MeshLambertMaterial({ map: sheetTex, side: THREE.DoubleSide });
      const PIC_W = 1.84, PIC_H = PIC_W / 1.5, IMG = { y: 0.01, w: PIC_W / SW, h: PIC_H / SH };        // the picture on it: nearly edge to edge (the 3:2 frame)
      const cu = roof.cineU = { uVid: { value: videoTex }, uProj: { value: 0 }, uBlue: { value: 1 }, uImg: { value: new THREE.Vector4(0.5, 0.5 + IMG.y / SH, IMG.w, IMG.h) } };
      sheetM.onBeforeCompile = sh => {
        THREE.MeshLambertMaterial.prototype.onBeforeCompile(sh);                                   // (the lighting everything gets: see the top of the file)
        Object.assign(sh.uniforms, cu);
        sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D uVid; uniform float uProj, uBlue; uniform vec4 uImg;")
          .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
          {
            vec2 pu = (vMapUv - uImg.xy) / uImg.zw + 0.5;                                  // where on the picture this bit of sheet is
            pu.x = (pu.x - 0.5) / (1.0 + 0.035 * (pu.y - 0.5)) + 0.5;                      // a touch of keystone: it's aimed up a little
            float n = 0.006 * sin(pu.y * 41.0) + 0.004 * sin(pu.y * 97.0 + 1.7) + 0.005 * sin(pu.x * 57.0 + 0.4);   // the frame's edge, ragged where it lands on the folds
            float m = smoothstep(-0.012, 0.025, pu.x + n) * (1.0 - smoothstep(0.975, 1.012, pu.x - n)) * smoothstep(-0.012, 0.03, pu.y - n) * (1.0 - smoothstep(0.97, 1.012, pu.y + n));
            vec2 q = pu - 0.5; float hot = 1.04 - 0.85 * dot(q, q);                     // brighter in the middle, the outer edges a little darker
            vec3 img = mix(texture2D(uVid, clamp(pu, 0.0, 1.0), 0.6).rgb, vec3(0.06, 0.16, 0.78), uBlue);   // (a little soft: the focus); no tape: the VCR's blue
            float halo = (1.0 - m) * 0.06 * (1.0 - smoothstep(0.0, 0.12, max(max(-pu.x, pu.x - 1.0), max(-pu.y, pu.y - 1.0))));   // spill past the frame
            totalEmissiveRadiance += (img * m * hot + vec3(halo)) * uProj * diffuseColor.rgb * 1.15;   // lit on the sheet: its weave and stripe through it
          }`);
      };
      const sheet = put(geo, sheetM, 0, TOP - SH / 2 - 0.01, 0, sc);
      K.frame(sc.matrixWorld, () => { for (const x of CLIPS) K.binder(x, TOP - 0.014, 0.014); });   // binder clips
      shade(sc.position.x, sc.position.z, 2.6, 0.5, 0.58);
      for (let x = -0.96; x < 1; x += 0.24) box(sc, x - 0.12, x + 0.12, -0.02, 0.02);                  // the sheet, a short box at a time: it's at an angle, and one box round it took up 2.2 x 1.6 m of nothing
      for (const s of [-1, 1]) box(sc, s * 1.02 - 0.165, s * 1.02 + 0.165, -0.165, 0.165);             // the crates
      shade(sc.localToWorld(V(-1.85, 0, -0.55)).x, sc.localToWorld(V(-1.85, 0, -0.55)).z, 0.55, 0.38, 0.58 - 0.5); shade(sc.localToWorld(V(1.85, 0, -0.55)).x, sc.localToWorld(V(1.85, 0, -0.55)).z, 0.55, 0.38, 0.58 + 0.5);
      for (const s of [-1, 1]) { const w = sc.localToWorld(V(s * 1.02, 0, 0)); shade(w.x, w.z, 0.56, 0.56, 0.58); }
      // the beam: the frustum from the lens to the frame's corners, a faint haze, brightest by the lens; only shows after dark
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => sc.localToWorld(V(sx * PIC_W / 2, TOP - SH / 2 - 0.01 + IMG.y + sy * PIC_H / 2, 0.02)));
      const lensPts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => V(P.x + sx * 0.02, P.y + sy * 0.015, P.z));
      const pos = [], along = [], across = [];
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4, a = lensPts[i], b = lensPts[j], c = corners[j], d = corners[i];
        for (const [p, al, ac] of [[a, 0, 0], [b, 0, 1], [c, 1, 1], [a, 0, 0], [c, 1, 1], [d, 1, 0]]) { pos.push(p.x, p.y, p.z); along.push(al); across.push(ac); }
      }
      const bg = new THREE.BufferGeometry(); bg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute("aAlong", new THREE.Float32BufferAttribute(along, 1)); bg.setAttribute("aAcross", new THREE.Float32BufferAttribute(across, 1));
      const bu = roof.cineBeamU = { uK: { value: 0 }, uCol: { value: new THREE.Color(1, 1, 1) }, uT: { value: 0 } };
      const beam = new THREE.Mesh(bg, new THREE.ShaderMaterial({ uniforms: bu, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        vertexShader: `attribute float aAlong, aAcross; varying float vA, vX; void main() { vA = aAlong; vX = aAcross; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform float uK, uT; uniform vec3 uCol; varying float vA, vX;
          void main() { float rays = 0.75 + 0.25 * sin(vX * 47.0 + sin(vX * 13.0) * 2.0) * sin(vX * 19.0 + uT * 0.3);
            float a = uK * rays * (0.15 + 0.85 * pow(1.0 - vA, 2.2)) * smoothstep(0.0, 0.04, vA) * (1.0 - smoothstep(0.9, 1.0, vA));
            gl_FragColor = vec4(uCol * a, 1.0); }` }));
      beam.frustumCulled = false; G.add(beam); roof.cine.beam = beam; roof.cine.sheet = sheet;
    }
    shade(9.9, 26.4, 0.8, 0.8, 0.55); shade(9.45, 25.95, 0.5, 0.5, 0.3); shade(9.9 - Math.cos(0.55) * 0.8, 26.4 + Math.sin(0.55) * 0.8, 0.8, 0.8, 0.62);
    col(9.35, 10.65, 25.7, 26.85); col(8.95, 9.65, 26.5, 27.25);
  }
  // things that ended up up here over the years and nobody came for, each one something: a frisbee, tennis balls, a kickball; what the
  // roofers and the AC guys left (a tar pail with its brush, spent filters, a coil of hose, a stack of pavers); what the staff left (a
  // Tony's box, a crushed can, a bottle)
  {
    // the frisbee, on its back: a dished disc, a rolled lip
    K.at(-7.25, Y + 0.012, 18.3, 0, () => { K.lathe(K.lam(0xd8743a), [[0, 0.012], [0.09, 0.008], [0.122, 0], [0.135, -0.012], [0.128, -0.012], [0.115, 0.002], [0, 0.004]], 0, 0.01, 0, 22); });
    for (const [x, z] of [[1.95, 8.45], [-6.25, 15.5], [-7.4, 31.2]]) { put(new THREE.SphereGeometry(0.033, 10, 8), lam(0xc8dc48), x, Y + 0.033, z); K.ring(K.lam(0xeeeadd), 0.0335, 0.0018, x, Y + 0.033, z, 0.7, 0.4, 14); }
    // the kickball: pumped up, red, its seams
    { const kx = -5.4, kz = 48.05, kr = 0.105; put(new THREE.SphereGeometry(kr, 18, 12), lam(0xa8302c), kx, TY + kr, kz); for (const [rx, ry] of [[Math.PI / 2, 0], [0, 0], [0, Math.PI / 2]]) K.ring(K.lam(0x7d1f1c), kr + 0.0006, 0.0015, kx, TY + kr, kz, rx, ry, 24); K.cyl(K.lam(0x1a1a1a), 0.006, 0.006, 0.003, kx + kr * 0.7, TY + kr * 1.7, kz, 8, 0, 0.8); }
    // the tar pail, by the east unit's gas line: black drips down it, a wire bail, a roofing brush stood in it
    { const px = 2.35, pz = 16.6, H = 0.36, pail = K.lam(0x1a1a1b), tar = K.lam(0x0d0d0d);
      K.lathe(pail, [[0.135, 0], [0.15, H], [0.158, H], [0.158, H + 0.018], [0.146, H + 0.018], [0.135, H - 0.05], [0, H - 0.05]], px, Y, pz, 22);
      for (const a of [0.4, 1.6, 2.4, 3.6, 5.1]) K.box(tar, 0.022, 0.09 + a * 0.03, 0.006, px + Math.cos(a) * 0.15, Y + H - 0.05 - a * 0.015, pz + Math.sin(a) * 0.15, -a + Math.PI / 2);
      K.tube(K.mats.galv, 0.003, [[px - 0.155, Y + H, pz], [px - 0.1, Y + H + 0.14, pz + 0.04], [px + 0.1, Y + H + 0.14, pz + 0.04], [px + 0.155, Y + H, pz]], 10, 4);
      K.rod(K.lam(0x7a6242), 0.012, [px + 0.02, Y + H - 0.1, pz], [px + 0.11, Y + H + 0.5, pz - 0.09]); K.box(K.lam(0x2b2118), 0.12, 0.05, 0.05, px + 0.02, Y + H - 0.08, pz, 0, -0.14, -0.14);
      col(px - 0.2, px + 0.2, pz - 0.2, pz + 0.2); }
    // spent filters from the units, leaned against the east one: cardboard frames, grey pleats
    { const pleat = new THREE.MeshLambertMaterial({ map: makeTexture((c, W, H) => { for (let x = 0; x < W; x += 8) { c.fillStyle = x % 16 ? "#7b7870" : "#5d5b55"; c.fillRect(x, 0, 8, H); } for (let i = 0; i < 300; i++) { c.fillStyle = "#3a3833a0"; c.fillRect(Math.random() * W, Math.random() * H, 4, 2 + Math.random() * 10); } }, 128, 128) }), card = K.lam(0xa78a5e);
      for (const [fx, rx] of [[5.12, 0.3], [5.32, 0.36]]) K.at(fx, Y, 20.5, 0.06, () => { const o = new THREE.Matrix4().makeRotationX(rx).setPosition(0, 0.31, 0.09); K.frame(o, () => { K.plane(pleat, 0.48, 0.58, 0, 0, 0.012); K.plane(pleat, 0.48, 0.58, 0, 0, -0.012, Math.PI); for (const s of [-1, 1]) { K.box(card, 0.04, 0.62, 0.026, s * 0.25, 0, 0); K.box(card, 0.52, 0.04, 0.026, 0, s * 0.3, 0); } }); });
      shade(5.25, 20.55, 0.8, 0.35); }
    // a garden hose, coiled and forgotten, the brass end poking out
    { const hx = 8.15, hz = 32.45, g = K.lam(0x2c6a3a); for (let i = 0; i < 6; i++) K.ring(g, 0.23 + (i % 2) * 0.012, 0.0135, hx + (i % 3 - 1) * 0.008, Y + 0.015 + i * 0.024, hz, Math.PI / 2, 0, 28);
      K.tube(g, 0.0135, [[hx + 0.24, Y + 0.13, hz], [hx + 0.34, Y + 0.05, hz + 0.08], [hx + 0.44, Y + 0.016, hz + 0.05]], 8, 6); K.cyl(K.met(0xc09a4a, 70), 0.019, 0.019, 0.05, hx + 0.46, Y + 0.018, hz + 0.045, 8, 0, Math.PI / 2 - 0.2); shade(hx, hz, 0.7, 0.7); col(hx - 0.27, hx + 0.27, hz - 0.27, hz + 0.27); }
    // spare ballast: concrete pavers, stacked by someone meaning to come back; a cinder block beside them
    { const sx = 9.7, sz = 15.8; for (let i = 0; i < 4; i++) K.box(K.mats.conc, 0.6, 0.05, 0.6, sx + (i % 2 ? 0.015 : -0.01), Y + 0.025 + i * 0.05, sz + (i === 3 ? 0.03 : 0), i * 0.03); K.cinder(sx + 0.02, Y, sz + 0.56, 0.4); shade(sx, sz + 0.2, 1.0, 1.2); col(sx - 0.33, sx + 0.33, sz - 0.33, sz + 0.75); }
    // by the chairs: a Tony's box (the lid weathered, grease coming through), a crushed can, a brown bottle on its side
    { const pizza = new THREE.MeshLambertMaterial({ map: makeTexture((c, W, H) => {
        c.fillStyle = "#c6b28f"; c.fillRect(0, 0, W, H); c.fillStyle = "#b3211d"; c.font = `italic 900 50px Georgia, serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("Tony's", W / 2, H * 0.42); c.font = "bold 18px Arial"; c.fillText("HOT · FRESH · TO YOUR DOOR", W / 2, H * 0.62);
        c.strokeStyle = "#b3211d"; c.lineWidth = 5; c.strokeRect(14, 14, W - 28, H - 28); const g = c.createRadialGradient(W * 0.66, H * 0.72, 4, W * 0.66, H * 0.72, 70); g.addColorStop(0, "#6b4a2488"); g.addColorStop(1, "#6b4a2400"); c.fillStyle = g; c.fillRect(0, 0, W, H);
      }, 256, 256) }), card = K.lam(0xa79472);
      K.at(8.72, Y, 25.32, 0.5, () => { K.box(card, 0.36, 0.042, 0.36, 0, 0.021, 0); K.plane(pizza, 0.355, 0.355, 0, 0.0425, 0, 0, -Math.PI / 2); });
      K.at(8.7, Y, 26.05, 1.3, () => { const m = K.met(0xb33a2e, 60); K.cyl(m, 0.033, 0.033, 0.03, 0, 0.022, 0, 10, 0.25, 0.1); K.cyl(K.mats.alum, 0.03, 0.03, 0.004, 0.006, 0.042, 0, 10, 0.28, 0.1); K.box(m, 0.05, 0.018, 0.09, 0, 0.012, 0.015, 0.4, 0, 0.1); });
      K.at(10.62, Y, 27.28, 0.8, () => { const m = new THREE.MeshPhongMaterial({ color: 0x4a2a10, specular: 0xaaaaaa, shininess: 90 }); K.frame(new THREE.Matrix4().makeRotationZ(Math.PI / 2).setPosition(0.11, 0.03, 0), () => K.lathe(m, [[0, 0], [0.03, 0], [0.031, 0.13], [0.012, 0.18], [0.012, 0.22], [0, 0.22]], 0, 0, 0, 12)); }); shade(8.72, 25.32, 0.5, 0.5, 0.5); }
  }

  // ---- the back ladder (see BACK_LADDER): galvanised like the hatch's, its rails carried up over the parapet. The top
  // half's fixed to the wall; the bottom half slides in it, and sits pulled up till it's kicked loose. Built out from the wall
  // along x (lx: out to the rungs, lz across them), turned to stand out from the back wall ----
  {
    const { mid, raise } = BACK_LADDER, lx = BACK_LADDER.z, lz = 0, WX = BACK_LADDER.wall, top = Y + PH + 1.0, OVER = 0.2, fixed = new THREE.Group(), slide = new THREE.Group();
    const turn = new THREE.Group(); turn.position.x = BACK_LADDER.x; turn.rotation.y = -Math.PI / 2; scene.add(turn);   // (local x is world z; local z, world -x)
    turn.add(fixed, slide); slide.position.y = raise;
    const rung = (y, len, par, x = lx) => { put(new THREE.CylinderGeometry(0.016, 0.016, len, 8), galv, x, y, lz, par).rotation.x = Math.PI / 2; };
    for (const s of [-1, 1]) {
      bx(0.016, top - mid, 0.05, galv, lx, (mid + top) / 2, lz + s * 0.22, fixed);
      for (const y of [2.5, 3.7, Y + PH - 0.1]) bx(lx - WX, 0.03, 0.04, galv, (lx + WX) / 2, y, lz + s * 0.22, fixed);   // wall brackets
      put(new THREE.TorusGeometry(OVER, 0.016, 6, 14, Math.PI), galv, lx - OVER, top, lz + s * 0.22, fixed);            // the rails curl over at the top...
      bx(0.016, 0.95, 0.05, galv, lx - 2 * OVER, Y + PH + 0.525, lz + s * 0.22, fixed);                                         // ...and come down onto the parapet
      bx(0.016, mid + 0.1, 0.05, galv, lx + 0.03, (mid + 0.1) / 2 + 0.05, lz + s * 0.26, slide);                         // the sliding half: a little wider, outside the fixed rails
      bx(0.05, 0.06, 0.03, dark, lx + 0.015, mid + 0.02, lz + s * 0.24, slide);                                          // its guide shoes
    }
    for (let y = mid + 0.3; y < Y + PH; y += 0.3) rung(y, 0.44, fixed);
    for (let y = 0.3; y < mid; y += 0.3) rung(y, 0.52, slide, lx + 0.03);
    ext(fixed); ext(slide);
    // what you aim at (the ladder itself is on the exterior layer, which the aiming ray doesn't see): the rails over the parapet from up top, the foot from the ground
    const hit = (w, h, d, x, y) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false })); o.position.set(x, y, lz); turn.add(o); return o; };
    const bxw = BACK_LADDER.x;
    roof.back = { down: false, v: 0, slide, top: hit(0.6, 1.2, 0.6, lx - OVER, Y + PH + 0.5), foot: hit(0.3, 2.7, 0.6, lx, 1.45),
      col: { x0: bxw - 0.28, x1: bxw + 0.28, z0: WX, z1: lx + 0.06, y1: 3 }, at: new THREE.Vector3(bxw, 1, lx) };   // col: in the way once it's down
  }
  K.flush(G);                                      // everything stamped, into its meshes
  tonyRoof({ lam, phong, put, bx, cy, ext, V, alum, gravel, coping, shade });   // Tony's roof, seen from ours (tonys/outside.js)
}
let aimRoofLadder = false, aimGolf = false, aimCine = null, aimBack = false;   // aimCine: "vcr" | "proj", the movie setup up top
// ---------------- golf on the roof ----------------
// A chipped square of fake turf out on the deck with a tee in it and a club lying beside it. E on either: golf. You're
// at address (the camera behind the ball, looking down the line); A/D walk you round the ball to aim, W/S slide the club
// face along it (toe ... heel). The swing's three clicks: hold to wind the power up and let go at the power you want; a
// line runs back down the meter from there, and the last click wants to land on the mark just above the bottom. On it:
// pure, and straight. A touch early it's pulled and draws left; a touch late it's pushed and fades right; let the line
// run out and it's a mishit, low and sliced, worse off the heel. Off the toe or heel costs distance and bends it too.
// The ball flies (gravity, drag, backspin's lift, sidespin bending it), bounces off the parapets and the deck, comes
// down out in the world and rolls out, and you get the yardage; then there's another ball on the tee. E or right-click: done
const GOLF = { x: 5.5, z: 12, R: 0.0214, SWEET: 0.08, PURE: 0.015, CLUB: 1.0, MAX: 48 };   // the tee; ball radius; the meter's mark and how close is pure; club length; how far out it can get (just past the treeline over the road)
const golf = { on: false, aim: 0, c: 0, st: "idle", pow: 0, peak: 0, line: 0, theta: 0, th0: 0, t: 0, hit: null, v: new THREE.Vector3(), spin: 0, lift: 0,
  carry: null, rolled: false, cam: new THREE.Vector3(), parts: [], ball: null, club: null, lie: null, trail: null, n: 0 };
const golfTee = new THREE.Vector3(GOLF.x, ROOF.y + 0.055 + GOLF.R, GOLF.z);   // the ball, sat on the tee
{
  const Y = ROOF.y, { x, z } = GOLF, lam = c => new THREE.MeshLambertMaterial({ color: c });
  const turf = makeTexture((ctx, W, H) => {        // short green blades, every which shade
    ctx.fillStyle = "#2f8a3a"; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 6000; i++) { ctx.fillStyle = `hsl(${112 + Math.random() * 20} ${40 + Math.random() * 30}% ${20 + Math.random() * 24}%)`; ctx.fillRect(Math.random() * W, Math.random() * H, 1, 2 + Math.random() * 3); }
  }, 256, 256);
  turf.wrapS = turf.wrapT = THREE.RepeatWrapping; turf.repeat.set(1.4, 1.4);
  const pts = [];                                   // a square, its corners and edges chipped off here and there
  for (let i = 0; i < 32; i++) { const a = (i + 0.5) / 32 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), r = 0.6 / Math.max(Math.abs(c), Math.abs(s)) * (Math.random() < 0.35 ? 0.86 + Math.random() * 0.1 : 1); pts.push(new THREE.Vector2(c * r, s * r)); }
  const mat = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 0.018, bevelEnabled: false }), new THREE.MeshLambertMaterial({ map: turf }));
  mat.rotation.x = -Math.PI / 2; mat.rotation.z = 0.12; mat.position.set(x, Y, z); roof.g.add(mat);
  const tee = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.003, 0.05, 10), lam(0xf4f1e8)); tee.position.set(x, Y + 0.035, z); roof.g.add(tee);
  golf.ball = new THREE.Mesh(new THREE.SphereGeometry(GOLF.R, 16, 12), new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x333333, shininess: 60 }));
  golf.ball.position.copy(golfTee); roof.g.add(golf.ball); golf.ball.visible = false;   // (only up top: see golfTick; in roof.g, or roomSort files it with the store under it and hides it)
  const club = () => {                              // the grip at the origin, the shaft down -y, the head at its foot toeing out along +x
    const g = new THREE.Group(), L = GOLF.CLUB;
    const add = (geo, m, px, py, pz) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); g.add(o); return o; };
    add(new THREE.CylinderGeometry(0.012, 0.01, 0.26, 10), lam(0x1c1c1e), 0, -0.13, 0);                               // grip
    add(new THREE.CylinderGeometry(0.006, 0.0045, L - 0.24, 8), new THREE.MeshPhongMaterial({ color: 0xc9cdd2, specular: 0xffffff, shininess: 90 }), 0, -0.26 - (L - 0.26) / 2, 0);   // shaft
    add(new THREE.BoxGeometry(0.105, 0.035, 0.03), new THREE.MeshPhongMaterial({ color: 0x3a3d42, specular: 0xaaaaaa, shininess: 70 }), 0.04, -L, 0);   // the head
    return g;
  };
  golf.lie = club(); golf.lie.rotation.set(0, 0.4, Math.PI / 2); golf.lie.position.set(x + 0.75, Y + 0.012, z - 0.45); roof.g.add(golf.lie);   // on the deck beside the mat
  golf.club = club(); golf.club.visible = false; roof.g.add(golf.club);
  for (const o of [mat, tee, ...golf.lie.children]) golf.parts.push(o);
  const tg = new THREE.BufferGeometry(); tg.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(120 * 3), 3)); tg.setDrawRange(0, 0);
  golf.trail = new THREE.Line(tg, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })); golf.trail.frustumCulled = false; roof.g.add(golf.trail);
}
const golfF = () => new THREE.Vector3(-Math.sin(golf.aim), 0, -Math.cos(golf.aim));   // down the line
const golfRt = () => new THREE.Vector3(Math.cos(golf.aim), 0, -Math.sin(golf.aim));   // to its right
const golfStance = () => golfTee.clone().addScaledVector(golfRt(), -0.72).setY(ROOF.y);   // a right-hander: on the left of the line, facing the ball
function golfStart() {
  if (roofHandsFull()) { toast("Your hands are full"); return; }
  invStash(); invRender(); keys.clear();
  Object.assign(golf, { on: true, c: 0, st: "idle", pow: 0, theta: 0 });
  golfReTee();
  me.rig.head.visible = me.rig.neck.visible = true;   // (you can see yourself from back here)
  golf.lie.visible = false; golf.club.visible = true; $("golfHud").hidden = false;
}
function golfEnd() {
  golf.on = false; me.reachTo(null); me.reachAlso(null); me.rig.head.visible = me.rig.neck.visible = false;
  golf.club.visible = false; golf.lie.visible = true; $("golfHud").hidden = true;
  const p = golfStance(); player.x = p.x; player.z = p.z; player.yaw = golf.aim - Math.PI / 2; player.pitch = -0.45;   // left where you stood, looking at the ball
}
function golfReTee() {
  golf.ball.position.copy(golfTee); golf.v.set(0, 0, 0); golf.st = "idle"; golf.carry = null; golf.trail.geometry.setDrawRange(0, 0);
}
function golfMouse(down, button) {
  if (button === 2) { if (down && golf.st === "idle") golfEnd(); return; }
  if (button !== 0) return;
  if (down && golf.st === "idle") { golf.st = "power"; golf.pow = 0; }
  else if (!down && golf.st === "power") { if (golf.pow < 0.04) golf.st = "idle"; else { golf.peak = golf.line = golf.pow; golf.st = "back"; } }
  else if (down && golf.st === "back") golfStrike(golf.line);
}
function golfStrike(at) {                          // the last click (at = where the line was), or null: it ran out. Full power, pure: carries ~38 m, ~6 m over the deck. The strike point lofts it: W (toe) up to ~9 m and shorter, S (heel) a low runner (still clearing the parapet)
  if (CUSTOMER) cmTeeOff();
  const e0 = at == null ? null : at - GOLF.SWEET, e = e0 != null && Math.abs(e0) <= GOLF.PURE ? 0 : e0, c = golf.c;
  let ang = 0, spin = -c * 1.5, speed = 18 * golf.peak * (1 - 0.15 * Math.abs(c)), elev = 0.6 + c * (c > 0 ? 0.4 : 0.25), what = [];
  if (e == null) { speed *= 0.6; elev = 0.3 + c * 0.1; ang = 0.06; spin = 7 + Math.max(0, -c) * 4 - Math.max(0, c) * 3; what.push("mishit", "sliced it"); }
  else if (e > 0) { speed *= 1 - Math.min(0.3, e * 0.8); ang = -Math.min(0.12, e * 0.25); spin += -Math.min(3, e * 6); what.push(e > 0.12 ? "way early: hooked it" : "a touch early: pulled left"); }
  else if (e < 0) { speed *= 1 - Math.min(0.3, -e * 0.8); ang = Math.min(0.12, -e * 0.4); spin += Math.min(3, -e * 20); what.push("a touch late: pushed right"); }
  else if (!c || Math.abs(c) < 0.15) what.push("pure");
  if (Math.abs(c) >= 0.15) what.push(`off the ${c > 0 ? "toe" : "heel"}`);
  const dir = golfF().multiplyScalar(Math.cos(ang)).addScaledVector(golfRt(), Math.sin(ang));
  golf.hit = { v: dir.multiplyScalar(speed * Math.cos(elev)).setY(speed * Math.sin(elev)), spin, what }; golf.seen = new Set();   // (who it's given a scare this shot)
  golf.st = "down"; golf.t = 0; golf.th0 = golf.theta;
}
function golfTick(dt) {
  golf.ball.visible = (player.onRoof || golf.on) && golf.st !== "spout";   // (down the downspout: out of sight till it drops out the foot)
  if (!golf.on) return;
  const F = golfF(), Rt = golfRt(), stance = golfStance();
  if (golf.st === "idle") {                        // aim (A/D: round the ball), the strike point (W/S: along the face)
    const turn = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
    golf.aim -= turn * dt * 0.9;
    const slide = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
    golf.c = Math.max(-1, Math.min(1, golf.c + slide * dt * 1.2));
  }
  if (golf.st === "power") golf.pow = Math.min(1, golf.pow + dt / 1.1);
  if (golf.st === "back" && (golf.line -= dt * 0.85) <= 0) { golf.line = 0; golfStrike(null); }
  // the club: arms and shaft one lever from between the shoulders, swung in the plane of the line and the ball
  const pivot = stance.clone().setY(ROOF.y + 1.38), d0 = golfTee.clone().sub(pivot).normalize(), n = new THREE.Vector3().crossVectors(d0, F).normalize();
  const want = golf.st === "power" || golf.st === "back" ? -2.6 * (golf.st === "power" ? golf.pow : golf.peak) : golf.st === "idle" ? 0 : golf.st === "flight" || golf.st === "done" ? 2.3 : null;   // (after the strike: on up to the finish, and held)
  if (want != null) golf.theta += (want - golf.theta) * Math.min(1, dt * 10);
  if (golf.st === "down") {                        // the downswing: through the ball and up to the finish
    golf.t += dt; const k = Math.min(1, golf.t / 0.32), was = golf.theta;
    golf.theta = golf.th0 + (2.3 - golf.th0) * k * k;
    if (was < 0 && golf.theta >= 0) { golf.v.copy(golf.hit.v); golf.spin = golf.hit.spin; golf.lift = 0.09; golf.n = 0; golf.rolled = false; golf.st = "flight"; golf.t = 0; }
  }
  const d = d0.clone().applyAxisAngle(n, golf.theta), L = golfTee.distanceTo(pivot);
  const grip = pivot.clone().addScaledVector(d, L - GOLF.CLUB), yA = d.clone().negate(), xA = Rt.clone().addScaledVector(yA, -Rt.dot(yA)).normalize();
  golf.club.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xA, yA, new THREE.Vector3().crossVectors(xA, yA)));
  golf.club.position.copy(grip).addScaledVector(xA, -0.04 - golf.c * 0.035);   // (the head toes out 4 cm: centred on the ball, less the strike point)
  me.reachTo(grip, 0, { lean: false }); me.reachAlso(grip, 1);
  if (golf.st === "flight") golfFly(dt);
  else if (golf.st === "spout" && (golf.t += dt) > 1.4) {   // out the foot of the downspout and off along the ground
    const [x, z, sx, sz] = golf.spout; golf.ball.position.set(x - sx * 0.52, 0.2, z - sz * 0.52); golf.v.set(-sx * 2.4, 0, -sz * 2.4);
    golf.st = "flight"; golf.rolled = false; golf.carry = null; toast("Down the scupper, rattling down the downspout... and out the bottom", true);
  }
  else if (golf.st === "done" && (golf.t += dt) > 2.4) { golfReTee(); }
  // the camera: behind the ball at address; in flight it chases the ball, a few metres back along the way it's gone
  const home = golfTee.clone().addScaledVector(F, -2.4).addScaledVector(Rt, 0.55).setY(ROOF.y + 1.55);   // (off to the right of the line: you're on the left of the picture)
  player.x = stance.x; player.z = stance.z;
  if (golf.st === "flight" || golf.st === "done" || golf.st === "spout") {
    const b = golf.ball.position, out = new THREE.Vector3(b.x - golfTee.x, 0, b.z - golfTee.z), far = out.length();
    const back = far > 0.5 ? out.divideScalar(far) : F, chase = b.clone().addScaledVector(back, -Math.min(4, 2.4 + far * 0.05));
    chase.y = Math.max(b.y + 1.3, (onDeck(chase.x, chase.z) ? roofY(chase.x, chase.z) : 0) + 0.6);   // (ponytail: no wall/tree collision: it can pass through the parapet or a tree)
    if (golf.st === "flight") golf.cam.addScaledVector(golf.v, dt);   // (carried along with it, so the easing below is only the swing round behind it, not a lag)
    golf.cam.lerp(chase, Math.min(1, dt * 3));
    const over = onDeck(golf.cam.x, golf.cam.z) ? roofY(golf.cam.x, golf.cam.z) + 0.6 : onTony(golf.cam.x, golf.cam.z) ? TONY.wall + 0.3 : 0;   // (never down inside a building: over its roof, looking down)
    if (golf.cam.y < over) golf.cam.y = over;
  } else golf.cam.copy(home);
  if (golf.st === "flight" || golf.st === "done" || golf.st === "spout") {
    const to = golf.ball.position.clone().sub(golf.cam), yaw = Math.atan2(-to.x, -to.z), pitch = Math.atan2(to.y, Math.hypot(to.x, to.z));
    let dy = yaw - player.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    player.yaw += dy * Math.min(1, dt * 6); player.pitch += (Math.max(-0.6, pitch) - player.pitch) * Math.min(1, dt * 6);
  } else { player.yaw = golf.aim; player.pitch += (-0.3 - player.pitch) * Math.min(1, dt * 6); }
  golfHud();
}
function golfFly(dt) {
  const b = golf.ball.position, v = golf.v, cars = (carsOut?.all() || []).filter(c => Math.hypot(c.g.position.x - b.x, c.g.position.z - b.z) < 9);
  golf.t += dt;
  for (const c of cars) c.g.updateMatrixWorld();
  golfScares(b);
  for (let i = 0; i < 4; i++) {
    const h = dt / 4, sp = v.length(), air = !golf.rolled;
    if (air) {
      v.addScaledVector(v, -0.0025 * sp * h);       // drag
      const hl = Math.hypot(v.x, v.z) || 1, side = golf.spin * sp / 40;   // sidespin: off to the right of the way it's going (+: a fade / slice)
      const ax = -v.z / hl * side, az = v.x / hl * side; v.x += ax * h; v.z += az * h;
      v.y += (golf.lift * sp - 9.8) * h;            // backspin holds it up
    }
    const nx = b.x + v.x * h, ny = b.y + v.y * h, nz = b.z + v.z * h;
    if (ny < 2.4 && cars.some(c => golfCarHit(c, b, nx, ny, nz))) continue;   // off a car (see golfCarHit)
    if (onDeck(b.x, b.z) && !onDeck(nx, nz) && ny < deckY(b.x, b.z) + 0.15) {   // through a scupper, if it's rolled right into one
      const sc = SCUPPERS.find(([x, z, sx]) => sx ? Math.abs(nz - z) < 0.15 && Math.abs(nx - x) < 0.3 : Math.abs(nx - x) < 0.15 && Math.abs(nz - z) < 0.3);
      if (sc) { golfSpout(sc); return; }
    }
    if (onTony(b.x, b.z) !== onTony(nx, nz) && ny < TONY.wall) {   // next door's walls (from outside), its coping (from on its roof)
      if (onTony(nx, b.z) !== onTony(b.x, b.z)) v.x *= -0.4;
      if (onTony(b.x, nz) !== onTony(b.x, b.z)) v.z *= -0.4;
      v.y *= 0.7; continue;
    }
    const dy0 = deckY(b.x, b.z), dy1 = deckY(nx, nz);
    if (dy1 != null && dy1 > (dy0 ?? 0) + 0.1 && ny < dy1 + (dy0 == null ? ROOF.wall : 0)) {   // the building's wall, or the tall block's from the store's roof: off it and back
      if (deckY(nx, b.z) !== dy0) v.x *= -0.4;
      if (deckY(b.x, nz) !== dy0) v.z *= -0.4;
      v.y *= 0.7; continue;
    }
    if (dy0 != null && (dy1 == null || dy1 < dy0 - 0.1) && ny < dy0 + ROOF.wall + GOLF.R) {   // the parapet: off it and back
      if (!onDeck(nx, b.z)) v.x *= -0.4;
      if (!onDeck(b.x, nz)) v.z *= -0.4;
      v.y *= 0.7; continue;
    }
    if (Math.hypot(nx - golfTee.x, nz - golfTee.z) > GOLF.MAX) { v.x *= -0.15; v.z *= -0.15; continue; }   // into the trees: it drops out of them (ponytail: a ring round the tee, not the real treeline)
    const fl = (onDeck(nx, nz) ? deckY(nx, nz) : onTony(nx, nz) ? TONY.y : pavedAt(nx, nz) ? LOT.y : 0) + GOLF.R;
    b.set(nx, ny, nz);
    if (golf.rolled || b.y < fl) {
      b.y = fl;
      if (golf.carry == null) golf.carry = Math.hypot(b.x - golfTee.x, b.z - golfTee.z);
      golf.spin = 0; golf.lift = 0;
      if (!golf.rolled && v.y < -1.5) { v.y *= -0.3; v.x *= 0.45; v.z *= 0.45; }   // a bounce: it bites
      else {                                         // rolling out
        v.y = 0; golf.rolled = true;
        const hs = Math.hypot(v.x, v.z), k = Math.max(0, hs - 5 * h) / (hs || 1); v.x *= k; v.z *= k;
      }
    }
  }
  const tp = golf.trail.geometry.attributes.position;   // the trail, a point every so often
  if (golf.n < 120 && !golf.rolled) { tp.setXYZ(golf.n++, b.x, b.y, b.z); tp.needsUpdate = true; golf.trail.geometry.setDrawRange(0, golf.n); }
  if ((golf.rolled && Math.hypot(v.x, v.z) < 0.05) || golf.t > 25) {   // it's stopped: how far
    const yd = Math.hypot(b.x - golfTee.x, b.z - golfTee.z) / 0.9144, carry = (golf.carry ?? 0) / 0.9144;
    if (onTony(b.x, b.z)) {                          // up on Tony's roof: it stays there (the ball on the tee's a new one)
      const lost = golf.ball.clone(); scene.add(lost); golfLost.push(lost); if (golfLost.length > 20) golfLost.shift().removeFromParent();
      toast(`${Math.round(yd)} yards, onto Tony's roof. That one's not coming back`);
    } else toast(`${Math.round(yd)} yards${carry > 1 ? ` (${Math.round(carry)} in the air)` : ""} · ${golf.hit.what.join(", ")}`, golf.hit.what[0] === "pure");
    golf.st = "done"; golf.t = 0;
  }
}
// ---- what the ball can get into out there: the cars in the lot and going by on the road, people on the walk, the
// scuppers (down the downspout and out the foot), Tony's roof next door (and that's the end of that ball) ----
const TONY = { x0: 13, x1: 21, z0: 0, z1: 14, y: 4.385, wall: 4.65 };   // next door: its walls' footprint, its roof's gravel, the top of its coping
const onTony = (x, z) => x > TONY.x0 && x < TONY.x1 && z > TONY.z0 && z < TONY.z1;
const golfLost = [];
function golfSpout(sc) {                          // into a scupper: gone, a rattle down the pipe, then out the bottom (see golfTick)
  golf.st = "spout"; golf.t = 0; golf.spout = sc; golf.v.set(0, 0, 0); golf.ball.position.set(sc[0] - sc[2] * 0.36, 1.5, sc[1] - sc[3] * 0.36);   // (in the pipe: the camera looks down to the foot)
  golfSnd("rattle", golf.ball.position);
}
// the car's top line, nose to tail, in its own frame (+x the nose, y up: see car()), and where the ball is against it
const carTop = s => [[s.L / 2, s.noseY], [s.cowlX, s.hoodY], [s.wsTopX, s.roofY], [s.rTopX, s.roofY], [s.rBotX, s.rBotY], [-s.L / 2, s.bedTop ?? s.rearY]];
function carTopAt(s, x) {                         // -> { y, nx, ny (the surface's normal), seg (1: the windshield, 3: the rear glass) }
  const p = carTop(s); let i = 0; while (i < p.length - 2 && x < p[i + 1][0]) i++;
  const [x0, y0] = p[i], [x1, y1] = p[i + 1], f = Math.max(0, Math.min(1, (x - x0) / (x1 - x0 || 1))), l = Math.hypot(x1 - x0, y1 - y0) || 1;
  return { y: y0 + (y1 - y0) * f, nx: (y1 - y0) / l, ny: (x0 - x1) / l, seg: i };
}
const golfQ = new THREE.Vector3(), golfQp = new THREE.Vector3();
function golfCarHit({ g, m, lot }, b, nx, ny, nz) {   // the ball into a car this step: off it, and what it did -> true (it bounced: the step's done)
  const s = g.userData.car, R = GOLF.R + 0.04, q = g.worldToLocal(golfQ.set(nx, ny, nz));   // (the body's bevel stands 4 cm proud of its outline)
  if (Math.abs(q.x) > s.L / 2 + 0.14 + R || Math.abs(q.z) > s.W / 2 + R || q.y < 0.12) return false;
  const top = carTopAt(s, q.x); if (q.y > top.y + R) return false;
  const qp = g.worldToLocal(golfQp.copy(b)), was = carTopAt(s, qp.x), at = q.clone();
  let n, glass;
  if (qp.y > was.y + R - 0.03) {                  // came down on it
    n = new THREE.Vector3(top.nx, top.ny, 0); glass = top.seg === 1 || top.seg === 3;
    at.y = top.y; at.addScaledVector(n, glass ? 0.06 : 0.045);
  } else if (Math.abs(qp.z) > s.W / 2 + R - 0.03) {   // into its side (above the beltline: a window)
    n = new THREE.Vector3(0, 0, Math.sign(qp.z)); glass = q.y > s.hoodY + 0.05;
    at.z = n.z * (s.W / 2 + (glass ? 0.012 : 0.004));
  } else {                                        // its nose or its tail
    n = new THREE.Vector3(Math.sign(qp.x), 0, 0); glass = false;
    at.x = n.x * (s.L / 2 + 0.145);
  }
  const face = n.clone().transformDirection(g.matrixWorld);
  const cv = new THREE.Vector3(m ? m.vx : 0, 0, 0), rel = golf.v.clone().sub(cv), vn = rel.dot(face);
  if (vn >= 0) return false;
  rel.addScaledVector(face, -vn).multiplyScalar(0.7).addScaledVector(face, -vn * 0.3); golf.v.copy(rel.add(cv));   // off it: a dull bounce, some speed scrubbed off
  const hard = -vn;
  if (hard < 2.5) return true;                   // just a tap
  golfMark(g, at, n, glass);
  const where = m ? "a car on the road" : lot ? "a customer's car" : "a car in the lot";
  golfSnd(glass ? "glass" : "clank", b);
  if (m) {                                        // one going by: it swerves, or (through the windshield, or hard) off the road it goes
    if (m.hitBy === golf.hit) return true; m.hitBy = golf.hit;   // (once a shot: a near miss first doesn't count, see golfScares)
    golfSnd("screech", b);
    if (glass || hard > 9) { carsOut.crash(m); golfSnd("thud", g.position, 0.9); toast(`Hit ${where}! It's run off the road`); shiftScore(-10, "you"); logAct("Ran a car off the road with a golf ball", "bad", null, -10); }
    else { carsOut.swerve(m, Math.sign(g.position.z - b.z) || 1); golfSnd("horn", g.position); toast(`Bounced it off ${where}. It swerved, and leaned on the horn`); }
    return true;
  }
  if (!g.userData.alarm || g.userData.alarm.t > 10) { carsOut.alarm(g); golfSnd("alarm", g.position); }
  if (!golf.seen.has(g)) {
    golf.seen.add(g);
    toast(glass ? `Cracked the glass on ${where}. There goes the alarm` : `Dented ${where}. There goes the alarm`);
    if (lot) { shiftScore(-5, "you"); logAct("Dinged a customer's car with a golf ball", "bad", null, -5); }
  }
  return true;
}
let golfDentM = null, golfCrackM = null;
function golfMark(g, at, n, glass) {              // a ding in the paint, or a star in the glass, where it hit
  if ((g.userData.marks = (g.userData.marks || 0) + 1) > 8) return;
  const decal = (draw, size) => new THREE.MeshLambertMaterial({ map: makeTexture(draw, size, size), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
  golfDentM ??= decal((c, W) => {                 // a shallow dimple: shadowed on one side, a glint on the other
    c.clearRect(0, 0, W, W);
    const d = c.createRadialGradient(W * 0.56, W * 0.56, 0, W / 2, W / 2, W / 2); d.addColorStop(0, "rgba(0,0,0,0.5)"); d.addColorStop(0.55, "rgba(0,0,0,0.22)"); d.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = d; c.fillRect(0, 0, W, W);
    const l = c.createRadialGradient(W * 0.38, W * 0.38, 0, W * 0.38, W * 0.38, W * 0.2); l.addColorStop(0, "rgba(255,255,255,0.45)"); l.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = l; c.fillRect(0, 0, W, W);
  }, 64);
  golfCrackM ??= decal((c, W) => {                // a star break: a crushed spot, cracks running out of it, a few rings across them
    c.clearRect(0, 0, W, W); c.strokeStyle = "rgba(225,235,245,0.85)"; c.lineCap = "round";
    const arms = [];
    for (let i = 0; i < 11; i++) {
      let a = i / 11 * Math.PI * 2 + Math.random() * 0.4, r = 0; const pts = [[W / 2, W / 2]];
      while (r < W * (0.3 + Math.random() * 0.18)) { a += (Math.random() - 0.5) * 0.35; r += 6 + Math.random() * 10; pts.push([W / 2 + Math.cos(a) * r, W / 2 + Math.sin(a) * r]); }
      c.lineWidth = 1.2 + Math.random(); c.beginPath(); pts.forEach(([x, y], k) => k ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); arms.push(pts);
    }
    c.lineWidth = 0.8;
    for (const ring of [0.25, 0.5, 0.8]) { c.beginPath(); arms.forEach((p, k) => { const [x, y] = p[Math.min(p.length - 1, Math.floor(p.length * ring))]; k ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath(); c.stroke(); }
    const s = c.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W * 0.06); s.addColorStop(0, "rgba(235,240,250,0.9)"); s.addColorStop(1, "rgba(235,240,250,0)"); c.fillStyle = s; c.fillRect(0, 0, W, W);
  }, 256);
  const size = glass ? 0.32 + Math.random() * 0.12 : 0.07 + Math.random() * 0.04;
  const d = new THREE.Mesh(new THREE.PlaneGeometry(size, size), glass ? golfCrackM : golfDentM);
  d.position.copy(at); d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n.clone().normalize()); d.rotateZ(Math.random() * 6.28);
  d.layers.set(EXTERIOR_LAYER); g.add(d);
}
function golfScares(b) {                          // close calls: a car coming up on it in the road swerves; people on the walk jump (and if it hits one...)
  for (const { g, m } of carsOut?.all() || []) {
    if (!m || golf.seen.has(m) || b.y > 2) continue;
    const ahead = (b.x - g.position.x) * Math.sign(m.v0);
    if (ahead > -1 && ahead < 8 && Math.abs(b.z - g.position.z) < 2.2) {
      golf.seen.add(m); carsOut.swerve(m, Math.sign(g.position.z - b.z) || 1); golfSnd("screech", g.position, 0.6); golfSnd("horn", g.position);
      toast("A car swerved round it, leaning on the horn");
    }
  }
  for (const c of [...walkers.map(w => w.c), ...custs.map(k => k.c)]) {
    const p = c?.group.position; if (!p || !c.group.visible || golf.seen.has(c) || b.y > 2.4) continue;
    const d = Math.hypot(b.x - p.x, b.z - p.z); if (d > 1.4) continue;
    golf.seen.add(c); c.setMood("shock"); c.stagger?.(Math.sign((b.x - p.x) || 1));
    if (d < 0.35 && b.y < 1.9) { golf.v.x *= -0.3; golf.v.z *= -0.3; golfSnd("thud", b, 0.4); toast("Beaned somebody with it. \"OW! Hey!\""); shiftScore(-10, "you"); logAct("Hit a passer-by with a golf ball", "bad", null, -10); }
    else toast("\"Hey! Watch it!\"");
  }
}
function golfSnd(kind, at, vol = 1) {             // the noises it makes out there: fainter the further off they are
  try {
    const ac = StoreAudio.ctx(); ac.resume();
    const t = ac.currentTime, out = ac.createGain(), d = camera.position.distanceTo(at);
    out.gain.value = vol / (1 + (d / 14) ** 2); out.connect(sfxOut(ac));
    const noise = len => { const b = ac.createBuffer(1, ac.sampleRate * len, ac.sampleRate), x = b.getChannelData(0); for (let i = 0; i < x.length; i++) x[i] = Math.random() * 2 - 1; const s = ac.createBufferSource(); s.buffer = b; return s; };
    const env = (node, a, t0, t1) => { const g = ac.createGain(); g.gain.setValueAtTime(a, t0); g.gain.exponentialRampToValueAtTime(0.0005, t1); node.connect(g).connect(out); return g; };
    const tone = (type, f, a, t0, t1) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; env(o, a, t0, t1); o.start(t0); o.stop(t1); };
    if (kind === "clank") { for (const [f, a] of [[1150, 0.12], [1720, 0.08], [2630, 0.05], [420, 0.1]]) tone("sine", f, a, t, t + 0.35); const n = noise(0.05); env(n, 0.2, t, t + 0.05); n.start(t); }
    else if (kind === "glass") { const n = noise(0.4), f = ac.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 2500; n.connect(f); env(f, 0.25, t, t + 0.35); n.start(t); tone("sine", 3900, 0.05, t, t + 0.6); tone("sine", 5200, 0.03, t + 0.02, t + 0.5); }
    else if (kind === "thud") { tone("sine", 70, 0.4, t, t + 0.4); const n = noise(0.2), f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 500; n.connect(f); env(f, 0.4, t, t + 0.25); n.start(t); }
    else if (kind === "screech") { const n = noise(1.3), f = ac.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 9; f.frequency.setValueAtTime(2300, t); f.frequency.linearRampToValueAtTime(1500, t + 1.2); n.connect(f); env(f, 0.5, t, t + 1.3); n.start(t); }
    else if (kind === "horn") { for (const f of [392, 494]) { const o = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain(); o.type = "square"; o.frequency.value = f; lp.type = "lowpass"; lp.frequency.value = 1400;
      g.gain.setValueAtTime(0, t); for (const [a, b] of [[0.05, 0.3], [0.42, 1.3]]) { g.gain.setValueAtTime(0.06, t + a); g.gain.setValueAtTime(0, t + b); } o.connect(lp).connect(g).connect(out); o.start(t); o.stop(t + 1.4); } }
    else if (kind === "rattle") { for (let k = 0, tt = t; k < 16; k++, tt += 0.05 + k * 0.006) tone("triangle", 900 + Math.random() * 900, 0.07 * (1 - k / 20), tt, tt + 0.04); tone("sine", 160, 0.12, t + 1.3, t + 1.5); }
    else if (kind === "alarm") {                  // the classic: a whoop, chirps, the two-tone, round again for ten seconds
      const o = ac.createOscillator(), g = ac.createGain(); o.type = "sawtooth"; g.gain.value = 0.05; o.connect(g).connect(out); o.start(t); o.stop(t + 10);
      for (let c = 0; c < 10; c += 3.3) { o.frequency.setValueAtTime(600, t + c); o.frequency.linearRampToValueAtTime(1500, t + c + 0.9);
        for (let k = 0; k < 6; k++) o.frequency.setValueAtTime(k % 2 ? 900 : 1300, t + c + 1 + k * 0.16); for (let k = 0; k < 6; k++) o.frequency.setValueAtTime(k % 2 ? 700 : 1000, t + c + 2 + k * 0.22); }
    }
    setTimeout(() => out.disconnect(), 11000);
  } catch {}
}
function golfHud() {
  const m = $("golfHud"), fill = golf.st === "power" ? golf.pow : golf.st === "back" ? golf.peak : 0;
  m.style.setProperty("--pow", `${(fill * 100).toFixed(1)}%`);
  m.style.setProperty("--line", `${((golf.st === "back" ? golf.line : 0) * 100).toFixed(1)}%`);
  m.classList.toggle("back", golf.st === "back");
  const c = golf.c, face = Math.abs(c) < 0.15 ? "center" : `${c > 0 ? "toe" : "heel"} ${Math.round(Math.abs(c) * 100)}%, ${c > 0 ? "higher" : "lower"}`;
  $("golfInfo").innerHTML = golf.st === "idle" ? `A / D — aim · W / S — strike: <b>${face}</b><br>Hold click — power · let go · click on the mark<br>E / right-click — done`
    : golf.st === "power" ? "Let go at the power you want" : golf.st === "back" ? "Click on the mark!" : "";
}
function roofClimb(dir, L = CLIMBS.hatch) {         // up (1) or down (-1) a ladder: the closet's, unless it's the one out back
  if (dir > 0 && roofHandsFull()) { toast("Hands full: you need them both for the ladder"); return; }
  roof.climb = { dir, L, t: 0, y0: camera.position.y, x0: camera.position.x, z0: camera.position.z };
  player.yaw = L.yaw;                               // facing the rungs, up or down
}
function backLadderDrop(quiet) {                   // kicked loose (quiet: already down, from a save)
  const B = roof.back; if (B.down) return;
  B.down = true; B.v = 0; colliders.push(B.col);
  if (quiet) { B.slide.position.y = 0; return; }
  golfSnd("clank", B.at, 2.5);
  toast("You kick the latch loose. The ladder rattles down: a way back up from outside", true);
  if (CUSTOMER) cmLog("Kicked the back ladder down off the roof. That's a way up from outside now", "good");
}
function backLadderE() {                           // E on it: from up top, kick it down, then climb down; from the ground, up (once it's down)
  const B = roof.back;
  if (player.onRoof) { if (B.down) roofClimb(-1, CLIMBS.back); else backLadderDrop(); }
  else if (B.down && B.slide.position.y === 0) roofClimb(1, CLIMBS.back);
}
{ const under = floorHeightAt; floorHeightAt = (x, z) => pavedAt(x, z) ? LOT.y : under(x, z); }   // (the lot and the road sit a curb lower than the walk)
const PUDDLE_DARK = new THREE.Color(0x24282e), PUDDLE_GREY = new THREE.Color(0xb4b8bc);   // (a puddle: the sky, darkened by the water and what's under it)
function cineTick(dt) {                           // the movie on the roof: the projector's picture on the sheet, washed out by daylight, and its beam after dark
  const C = roof.cine; if (!C) return;
  tvHearTick();                                    // (the tape's sound: where you're standing, see store/tv.js)
  if (!roof.g.visible) return;
  const on = C.on, day = Math.max(0, Math.min(1, tod.level));
  roof.cineU.uProj.value = on ? 0.06 + 0.9 * (1 - day) ** 1.5 : 0;   // (in the sun it's barely there; after dark it's the picture)
  roof.cineU.uBlue.value = playing ? 0 : 1;
  const z = TVU.uTvZoneC.value, col = roof.cineBeamU.uCol.value;   // the beam takes the picture's colour (the TV light's 3x3 average)
  if (playing) { let r = 0, g = 0, b = 0; for (let i = 0; i < 27; i += 3) { r += z[i]; g += z[i + 1]; b += z[i + 2]; } const m = Math.max(r, g, b, 0.01); col.setRGB(0.55 + 0.45 * r / m, 0.55 + 0.45 * g / m, 0.55 + 0.45 * b / m); }
  else col.setRGB(0.5, 0.6, 1);
  roof.cineBeamU.uK.value = on ? 0.035 * (1 - day) ** 2 : 0; roof.cineBeamU.uT.value += dt; C.beam.visible = on && day < 0.9;
  C.lens.material.color.setHex(on ? (playing ? 0xfff6e0 : 0x8fa8ff) : 0x223040); C.led.material.color.setHex(on ? 0x2bff6a : 0xff7a1a);
  C.vled.material.color.setHex(playing ? (video.paused ? 0xffb020 : 0x3dff8a) : 0x0a1a10);
}
function roofTick(dt) {
  cineTick(dt);
  const R = roof, mo = shiftDate().getMonth(), h = shift.h;
  R.lidA += ((player.onRoof || R.climb ? 1.62 : 0) - R.lidA) * Math.min(1, dt * 2.5); R.lid.rotation.x = R.lidA;
  if (R.bulb) R.bulb.color.setHex(tod.level < 0.5 ? 0xffe2a8 : 0x4a4a44);
  if (R.pizzaWin) R.pizzaWin.color.setHex(tod.level < 0.6 && h > 10 && h < 23.5 ? 0xffc77a : tod.level < 0.6 ? 0x1a1d22 : 0x3a4048);
  if (R.turbine) R.turbine.rotation.y += dt * (0.4 + 7 * (WX.wind || 0) + 4 * (WX.gust || 0));
  const cooling = mo >= 4 && mo <= 8 ? 1 : (mo === 3 || mo === 9) && h > 12 && h < 18 ? 1 : 0;
  for (const f of R.fans) {                          // the condensers cycle on and off, spinning up and coasting down
    const on = cooling && (clockT + f.phase) % 300 < 200;
    f.v += ((on ? 28 : 0) - f.v) * Math.min(1, dt * (on ? 0.8 : 0.35)); f.g.rotation.y += f.v * dt;
  }
  for (const u of R.units) { u.on = !!cooling && (clockT + u.phase) % 300 < 200; u.y = ROOF.y + 1.2; }
  if (R.sign) { const lit = tod.level < 0.55; R.sign.lit.visible = lit; R.sign.day.visible = !lit; }   // the sign comes on at dusk
  const snowed = WX.cover;
  if (R.puddles) { R.pond = Math.max(WX.wet, (R.pond || 0) - dt * 0.004); R.puddles.opacity = 0.7 * Math.min(1, R.pond * 1.4) * (1 - snowed); R.puddles.color.copy(tod.sky).lerp(PUDDLE_GREY, 0.45).multiplyScalar(0.62).lerp(PUDDLE_DARK, 0.3); }   // (they dry slower than the lot)
  if (R.grime) R.grime.opacity = 1 - 0.85 * snowed;
  if (R.shades) R.shades.opacity = 0.6 * (1 - 0.5 * snowed);
  const S = R.smoke;
  if (S) {                                           // Tony's oven, going while they're open (and banked overnight, a thin wisp)
    const open = h > 10 && h < 23.5, wind = wxFall.uni.uWind.value;
    S.acc += dt * (open ? 5 + 6 * Math.min(1, wind.length() / 4) : 0.8);   // (more of them in a wind, or the plume pulls apart into beads)
    while (S.acc >= 1) { S.acc--; if (S.p.length < 96) S.p.push({ x: S.at.x + (Math.random() - 0.5) * 0.1, y: S.at.y, z: S.at.z + (Math.random() - 0.5) * 0.1, age: 0, life: 6 + Math.random() * 5, s: 0.3 + Math.random() * 0.2, k: open ? 1 : 0.4, sx: (Math.random() - 0.5) * 0.2, sz: (Math.random() - 0.5) * 0.2 }); }
    const pos = S.geo.attributes.position.array, aA = S.geo.attributes.aA.array, aS = S.geo.attributes.aS.array;
    S.p = S.p.filter(p => (p.age += dt) < p.life);
    for (let i = 0; i < 96; i++) {
      const p = S.p[i];
      if (!p) { aA[i] = 0; continue; }
      const f = p.age / p.life, lift = 0.5 / (1 + p.age * 0.5);
      p.x += (wind.x * 0.6 + p.sx) * dt; p.z += (wind.y * 0.6 + p.sz) * dt; p.y += lift * dt;
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
      aS[i] = p.s + Math.sqrt(f) * 3.2; aA[i] = 0.32 * p.k * Math.min(1, p.age * 2.5) * (1 - f) * (1 - f);
    }
    S.geo.attributes.position.needsUpdate = S.geo.attributes.aA.needsUpdate = S.geo.attributes.aS.needsUpdate = true;
    const lv = tod.level; S.sm.uniforms.uCol.value.setRGB(0.18 + 0.62 * lv, 0.18 + 0.61 * lv, 0.19 + 0.6 * lv);
    S.sm.uniforms.uScale.value = renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360));
  }
  { const B = R.back, s = B.slide.position;      // the back ladder coming down: it falls, and rings when it hits its stops
    if (B.down && s.y > 0) { B.v += 14 * dt; s.y = Math.max(0, s.y - B.v * dt); if (!s.y) { golfSnd("clank", B.at, 3); golfSnd("thud", B.at, 1.5); } } }
  if (!R.climb) return;
  const c = R.climb, DUR = 3.4; c.t = Math.min(DUR, c.t + dt);
  const k = c.t / DUR, e = k * k * (3 - 2 * k), step = 0.04 * Math.sin(k * Math.PI * 12);   // a rung at a time
  const { x: lx, z: lz, up, down } = c.L, yLo = 1.65, yHi = ROOF.y + 1.65;
  if (c.dir > 0) {                                   // walk the step to the foot, then up and out
    const a = Math.min(1, k * 5); R.cam.set(c.x0 + (lx - c.x0) * a, yLo + (yHi + 0.15 - yLo) * e + step, c.z0 + (lz - c.z0) * a);
    if (k > 0.92) R.cam.lerp(new THREE.Vector3(up.x, yHi, up.z), (k - 0.92) / 0.08);
  } else {
    const a = Math.min(1, k * 5); R.cam.set(c.x0 + (lx - c.x0) * a, yHi + 0.15 + (yLo - yHi - 0.15) * e + step, c.z0 + (lz - c.z0) * a);
    if (k > 0.92) R.cam.lerp(new THREE.Vector3(down.x, yLo, down.z), (k - 0.92) / 0.08);
  }
  if (c.t >= DUR) {
    R.climb = null; player.onRoof = c.dir > 0;
    Object.assign(player, c.dir > 0 ? up : down);
    if (player.onRoof && c.L === CLIMBS.hatch) toast("On the roof · E at the hatch to climb back down", true);
  }
}

