// ---- out back of Tony's, through the kitchen's steel door: a cracked slab under one caged bulb gone the color of old teeth, the
// dumpster and the grease drum on the left, and on the right where the crew goes to not be in there: a chair with half its webbing, an
// office chair with no base on a milk crate, a bench out of somebody's van, a cable spool for a table, a can full of butts. A fence
// that gave up. None of it fit to sit on; all of it sat on (E) ----
function tonyYard(ext) {
  const y = new THREE.Group(); scene.add(y);
  const T = tonyKit(), seats = [], solid = (x0, x1, z0, z1, y1) => colliders.push({ x0, x1, z0, z1, y1 });
  const seat = (w, h, d, x, cy, z, pos) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial()); o.visible = false; o.position.set(x, cy, z); o.userData.sit = true; o.userData.seatPos = pos; y.add(o); aimables.push(o); seats.push(o); };
  const RUST = 0x5a3016, BLACK = 0x161616, STEEL = 0x8a8e92, BX = 18.2;
  // the slab
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 4.3), tonyLit({ kind: "PAD" })); pad.rotation.x = -Math.PI / 2; pad.position.set(18.2, 0.014, 16.15); y.add(pad);
  { const jag = (x, z, a, n) => { for (let k = 0; k < n; k++) { const L = 0.16 + ((k * 37) % 7) * 0.05; a += ((k * 53) % 9 - 4) * 0.16; const nx = x + Math.cos(a) * L, nz = z + Math.sin(a) * L; T.box(0x1c1a18, L + 0.012, 0.002, 0.004 + (k % 3) * 0.003, (x + nx) / 2, 0.0165, (z + nz) / 2, { ry: -a }); x = nx; z = nz; } };   // the cracks in it
    jag(17.2, 17.9, -0.9, 16); jag(20.8, 14.2, 2.0, 12); jag(19.6, 17.8, -2.4, 9); jag(15.2, 17.6, 0.3, 11); }
  // the back wall, face on, so the bulb can land on it: the brick, the steel lintel over the door, the exhaust
  const brick = tonyLit({ kind: "BRICK" }); for (const [x0, x1, y0, y1] of [[13, 17.68, 0, 4.3], [18.72, 21, 0, 4.3], [17.68, 18.72, 2.16, 4.3]]) { const o = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), brick); o.position.set((x0 + x1) / 2, (y0 + y1) / 2, 14.004); y.add(o); }
  T.box(0x3c3028, 1.3, 0.1, 0.03, BX, 2.25, 14.02); T.box(0x24201c, 1.08, 0.07, 0.05, BX, 0.035, 14.05);
  { const hx = 15.8, hy = 3.0; T.box(0x6a6c6c, 0.7, 0.6, 0.14, hx, hy, 14.08, { g: 0.2 }); for (let k = 0; k < 5; k++) T.box(0x3a3a38, 0.64, 0.05, 0.1, hx, hy - 0.22 + k * 0.11, 14.15, { rx: 0.6 }); T.box(0x2a241c, 0.72, 0.1, 0.02, hx, hy - 0.33, 14.13); }
  T.box(0x8a8e92, 0.06, 2.0, 0.03, 20.7, 2.6, 14.03); T.box(0x6a6e70, 0.22, 0.32, 0.08, 20.7, 1.5, 14.05, { g: 0.2 });   // the service, its meter box
  // ---- the bulb: conduit up the wall, an arm, a jelly jar in a rusted cage, the lamp itself gone yellow ----
  T.rod(0x5a5c5c, 0.012, [BX, 3.1, 14.02], [BX, 2.72, 14.02], { seg: 6 }); T.box(0x4a4c4c, 0.12, 0.12, 0.05, BX, 2.68, 14.03); T.rod(0x5a5c5c, 0.012, [BX, 2.68, 14.04], [BX, 2.68, 14.24], { seg: 6 });
  T.cyl(RUST, 0.055, 0.06, 0.05, BX, 2.65, 14.26, { seg: 10 }); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; T.rod(RUST, 0.003, [BX + Math.cos(a) * 0.058, 2.63, 14.26 + Math.sin(a) * 0.058], [BX + Math.cos(a) * 0.062, 2.49, 14.26 + Math.sin(a) * 0.062], { seg: 4 }); } T.torus(RUST, 0.06, 0.004, BX, 2.54, 14.26, { rx: Math.PI / 2, seg: 12 }); T.torus(RUST, 0.062, 0.004, BX, 2.49, 14.26, { rx: Math.PI / 2, seg: 12 });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 9), new THREE.MeshBasicMaterial({ color: 0xffb648 })); lamp.scale.y = 1.25; lamp.position.set(BX, 2.565, 14.26); y.add(lamp); bulb.mesh = lamp;
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.14, 12), new THREE.MeshBasicMaterial({ color: 0xc8a050, transparent: true, opacity: 0.18, depthWrite: false })); jar.position.set(BX, 2.56, 14.26); jar.renderOrder = 2; y.add(jar);
  const mothM = new THREE.MeshBasicMaterial({ color: 0x38302a }); bulb.moths = [0.09, 0.14, 0.2].map((r, i) => { const o = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.002, 0.01), mothM); y.add(o); return { o, r, w: 3 + i * 1.7, ph: i * 2 }; });
  // ---- the dumpster: rust through its green, lids that don't shut on what's in it, flattened boxes and a leak ----
  T.at(15.45, 0, 15.0, 0.03, () => {
    const G = 0x233f2c; T.box(G, 1.95, 1.05, 1.14, 0, 0.6, 0, { g: 0.08 }); for (const s of [-0.9, 0.9]) T.box(0x1c3426, 0.1, 1.1, 1.2, s, 0.6, 0); for (const sz of [-0.58, 0.58]) { T.box(0x1c3426, 2.0, 0.08, 0.05, 0, 1.12, sz); T.box(0x1c3426, 2.0, 0.08, 0.05, 0, 0.14, sz); }
    for (let k = 0; k < 16; k++) { const a = k * 2.4; T.box(k % 3 ? 0x3e2a18 : 0x2c1c10, 0.03 + (k % 4) * 0.035, 0.1 + ((k * 7) % 5) * 0.09, 0.003, Math.sin(a) * 0.85, 0.5 + ((k * 13) % 9) * 0.06, 0.572, { rz: Math.sin(k) * 0.3 }); }
    T.box(0x101210, 0.3, 0.12, 1.2, -0.55, 0.06, 0); T.box(0x101210, 0.3, 0.12, 1.2, 0.55, 0.06, 0); T.box(0xd0c8a0, 0.45, 0.25, 0.002, 0.2, 0.68, 0.575); T.box(0x8a1a1a, 0.3, 0.05, 0.002, 0.2, 0.73, 0.576);
    for (const s of [-1, 1]) { T.box(0x2a2c2c, 0.07, 0.14, 1.1, s * 1.0, 0.74, 0, { g: 0.2 }); T.box(0x161818, 0.05, 0.08, 0.02, s * 1.0, 0.74, 0.555); }   // the sleeves, down each end: where the truck's forks go
    T.box(0x141618, 0.95, 0.05, 1.25, 0.48, 1.17, 0.04, { rx: -0.1, rz: -0.02 }); const open = -0.95; T.box(0x141618, 0.95, 0.05, 1.25, -0.48, 1.62, -0.72, { rx: open });   // a lid thrown back on the wall
    for (const [x, yy, z, r] of [[-0.6, 1.14, 0.1, 0.34], [-0.2, 1.2, -0.2, 0.38], [-0.5, 1.26, -0.28, 0.26], [0.05, 1.22, 0.18, 0.28]]) T.sph(0x0c0c0e, r, x, yy, z, { sy: 0.8, g: 0.45, seg: 8, seg2: 6 });
    T.box(0xc8b48a, 0.56, 0.02, 0.6, -0.12, 1.42, 0.06, { rx: 0.4, rz: 0.3 }); T.box(0xc8b48a, 0.56, 0.02, 0.5, 0.3, 1.32, 0.1, { rx: -0.2, rz: -0.5 }); T.box(0xb8a57f, 0.5, 0.02, 0.5, -0.45, 1.48, -0.2, { rx: 0.6, rz: -0.2 });
  });
  solid(14.4, 16.52, 14.0, 15.62, 1.5);
  T.sph(0x0c0c0e, 0.27, 16.85, 0.22, 15.6, { sy: 0.85, g: 0.45, seg: 8, seg2: 6 }); T.sph(0x0c0c0e, 0.26, 14.25, 0.22, 15.0, { sy: 0.8, g: 0.45, seg: 8, seg2: 6 });
  { const X = 16.9, Z = 14.42; T.cyl(0x2c4a70, 0.29, 0.29, 0.88, X, 0.44, Z, { seg: 14, g: 0.2 }); for (const y0 of [0.2, 0.44, 0.68]) T.torus(0x223a58, 0.292, 0.008, X, y0, Z, { rx: Math.PI / 2, seg: 14 }); T.cyl(0x18140c, 0.27, 0.27, 0.01, X, 0.885, Z, { seg: 14, g: 0.6 }); T.lathe(0x3a3428, [[0.03, 0], [0.04, 0.06], [0.2, 0.22], [0.2, 0.25]], X + 0.05, 0.88, Z, { seg: 12 }); T.box(0xd8d0b0, 0.28, 0.16, 0.003, X, 0.5, Z + 0.285); solid(X - 0.28, X + 0.28, Z - 0.28, Z + 0.28, 0.9);   // the grease drum, its funnel
    for (let k = 0; k < 4; k++) T.box(0x1a140c, 0.08 + k * 0.06, 0.004, 0.2 + k * 0.05, X + 0.1 + k * 0.1, 0.018, Z + 0.28 + k * 0.05, { ry: k }); }
  // a pile of milk crates, flattened boxes against the wall
  for (const [x, yy, z, c, ry] of [[17.3, 0.16, 14.3, 0x2050a0, 0.1], [17.3, 0.48, 14.3, 0xa02830, -0.15]]) crate(T, x, yy, z, c, ry);
  T.box(0x2a2a26, 0.012, 0.8, 0.1, 13.68, 0.45, 14.15); T.box(0x2a2a26, 0.012, 0.8, 0.1, 13.98, 0.45, 14.15);   // the twine round them
  for (let k = 0; k < 6; k++) { const w = 0.8 + (k % 3) * 0.09, hh = 0.85 + ((k * 5) % 4) * 0.11; T.box(k % 2 ? 0xa8834c : 0xc09a60, w, hh, 0.012, 13.58 + ((k * 3) % 5) * 0.035, hh / 2 + 0.01, 14.09 + k * 0.016, { rx: -0.05 - k * 0.012 }); T.box(0x7a5c34, w, 0.008, 0.013, 13.58 + ((k * 3) % 5) * 0.035, hh * 0.6, 14.09 + k * 0.016, { rx: -0.05 - k * 0.012 }); }   // (against the wall: the truck comes at the dumpster's front)
  // ---- the smokers' corner. First the bench, out of a van: split vinyl, foam, springs, on two cinder blocks; backed up to the fence ----
  T.at(20.55, 0, 17.1, Math.PI, () => {
    for (const s of [-0.48, 0.48]) { T.box(0x63605a, 0.2, 0.2, 0.4, s, 0.1, 0.02); T.box(0x1c1c1c, 0.17, 0.12, 0.3, s, 0.1, 0.02); }
    T.box(0x34281f, 1.24, 0.12, 0.54, 0, 0.3, 0, { rx: 0.05, g: 0.1 }); T.box(0x3a2c22, 1.24, 0.58, 0.14, 0, 0.62, -0.26, { rx: -0.2, g: 0.1 });
    for (let k = 0; k < 6; k++) T.box(0x2c2219, 0.015, 0.008, 0.46, -0.5 + k * 0.2, 0.365, 0, { rx: 0.05 });
    T.box(0xb8a050, 0.42, 0.018, 0.3, -0.26, 0.355, 0.04, { rx: 0.04 }); T.box(0xcdb868, 0.22, 0.03, 0.18, -0.3, 0.363, 0.06, { ry: 0.3 }); T.box(0xb8a050, 0.3, 0.22, 0.02, 0.28, 0.72, -0.17, { rx: -0.2 });   // where the vinyl's gone
    for (let k = 0; k < 5; k++) T.torus(0x6a6658, 0.024, 0.0025, -0.46 + k * 0.05, 0.36, 0.1, { rx: Math.PI / 2 + 0.3, seg: 7, ry: k * 0.3 });
    T.box(0x8a8880, 0.3, 0.05, 0.002, 0.2, 0.58, -0.185, { rx: -0.2, rz: 0.2 }); T.box(0x8a8880, 0.05, 0.3, 0.002, 0.42, 0.68, -0.18, { rx: -0.2 });   // duct tape, a couple of tries at it
  });
  solid(19.92, 21.18, 16.84, 17.42, 0.4);
  seat(1.24, 0.75, 0.6, 20.55, 0.4, 17.1, { x: 20.85, y: 0, z: 17.08, ry: Math.PI, hipY: 0.42 });   // (the east end: the smoker has the other)
  // the lawn chair: aluminum, bent; half its webbing gone, the rest hanging. It sits lower on one side
  { const X = 19.15, Z = 15.85, ry = 0.5; T.at(X, 0, Z, ry, () => { const AL = 0x9ca0a2;
      for (const s of [-0.24, 0.24]) { T.rod(AL, 0.011, [s, 0.02, 0.22], [s, 0.36, 0.2], { g: 0.5 }); T.rod(AL, 0.011, [s, 0.36, 0.2], [s, 0.3, -0.22], { g: 0.5 }); T.rod(AL, 0.011, [s, 0.02, -0.26], [s, s < 0 ? 0.3 : 0.33, -0.22], { g: 0.5 }); T.rod(AL, 0.011, [s, 0.3, -0.22], [s, 0.78, -0.42], { g: 0.5 }); T.rod(AL, 0.01, [s, 0.5, 0.18], [s, 0.54, -0.3], { g: 0.5 }); }
      T.rod(AL, 0.011, [-0.24, 0.36, 0.2], [0.24, 0.36, 0.2], { g: 0.5 }); T.rod(AL, 0.011, [-0.24, 0.78, -0.42], [0.24, 0.78, -0.42], { g: 0.5 }); T.rod(AL, 0.011, [-0.24, 0.3, -0.22], [0.24, 0.32, -0.22], { g: 0.5 });
      const W1 = 0x4a6a2a, W2 = 0xb8a860; for (const [i, zz, slack] of [[0, 0.14, 0.04], [1, 0.05, 0.0], [2, -0.1, 0.05]]) T.box(i % 2 ? W2 : W1, 0.48, 0.006, 0.06, 0, 0.33 - slack, zz, { rz: 0.03 });
      for (const [i, hh] of [[0, 0.65], [1, 0.46]]) T.box(i ? W2 : W1, 0.48, 0.006, 0.06, 0, hh, -0.29 - (hh - 0.46) * 0.41, { rx: 1.15 });
      T.box(W1, 0.06, 0.26, 0.006, -0.1, 0.17, 0.02, { rx: 0.12, rz: 0.1 }); T.box(W2, 0.06, 0.2, 0.006, 0.12, 0.2, -0.14, { rx: -0.1, rz: -0.08 });   // and the ones that let go
    }); seat(0.56, 0.5, 0.56, X, 0.3, Z, { x: X, y: 0, z: Z, ry, hipY: 0.33 }); solid(X - 0.22, X + 0.22, Z - 0.22, Z + 0.22, 0.4); }
  // the office chair: its base is long gone, so it's a seat and half a back on a milk crate, the foam coming out, a lean to it
  { const X = 20.75, Z = 15.2, ry = -0.75; crate(T, X, 0.16, Z, 0x2a2a2a, 0.4); T.at(X, 0.32, Z, ry, () => {
      T.box(0x2a2c30, 0.44, 0.09, 0.44, 0, 0.05, 0, { rz: 0.08, rx: -0.05 }); T.box(0xc0a850, 0.22, 0.03, 0.16, 0.08, 0.1, 0.05, { rz: 0.08, ry: 0.2 }); T.box(0x1c1c1c, 0.2, 0.04, 0.2, 0, -0.01, 0);
      T.rod(0x202020, 0.018, [0.02, 0.0, -0.2], [0.05, 0.42, -0.25], { seg: 6 }); T.box(0x2a2c30, 0.4, 0.42, 0.07, 0.05, 0.56, -0.27, { rz: 0.08, rx: -0.12 }); T.box(0xc0a850, 0.14, 0.2, 0.02, -0.08, 0.6, -0.23, { rz: 0.08, rx: -0.12 });
      T.rod(0x202020, 0.009, [0.24, 0.1, 0.1], [0.3, 0.27, 0.05], { seg: 6 }); T.box(0x1a1a1a, 0.06, 0.03, 0.26, 0.3, 0.28, 0.05); }); seat(0.5, 0.75, 0.5, X, 0.4, Z, { x: X, y: 0, z: Z, ry, hipY: 0.42 }); solid(X - 0.2, X + 0.2, Z - 0.2, Z + 0.2, 0.42); }
  // a cable spool for a table: the coffee can of butts, bottles, a dead hand of cards
  { const X = 20.0, Z = 16.3, W = 0x7c6242; T.cyl(W, 0.42, 0.42, 0.04, X, 0.58, Z, { seg: 18 }); T.cyl(W, 0.4, 0.42, 0.04, X, 0.04, Z, { seg: 18 }); T.cyl(0x5a4830, 0.18, 0.18, 0.52, X, 0.32, Z, { seg: 12 }); for (let k = 0; k < 7; k++) T.box(0x4a3a24, 0.003, 0.002, 0.8, X - 0.3 + k * 0.1, 0.601, Z);
    for (let k = 0; k < 9; k++) T.box(k % 2 ? 0x8a7a50 : 0x6a5a3a, 0.05 + (k % 3) * 0.05, 0.002, 0.03, X + Math.sin(k * 3) * 0.28, 0.602, Z + Math.cos(k * 5) * 0.28, { ry: k });   // rings, burns
    T.cyl(0x8a8e8a, 0.055, 0.055, 0.13, X + 0.12, 0.665, Z - 0.1, { seg: 12, g: 0.3 }); T.cyl(0x3a3a3a, 0.05, 0.05, 0.004, X + 0.12, 0.72, Z - 0.1, { seg: 12 }); for (let k = 0; k < 9; k++) T.cyl(0xe0d4b0, 0.004, 0.004, 0.05, X + 0.12 + Math.sin(k) * 0.03, 0.73, Z - 0.1 + Math.cos(k * 2) * 0.03, { seg: 5, rz: (k - 4) * 0.25, rx: k * 0.2 });
    T.lathe(0x4a2c10, [[0, 0], [0.03, 0], [0.032, 0.1], [0.012, 0.15], [0.012, 0.2], [0, 0.2]], X - 0.18, 0.6, Z + 0.06, { seg: 8, g: 0.7 }); T.lathe(0x2c4a22, [[0, 0], [0.03, 0], [0.032, 0.1], [0.012, 0.15], [0.012, 0.2], [0, 0.2]], X - 0.02, 0.6, Z + 0.2, { seg: 8, g: 0.7 });
    for (let k = 0; k < 5; k++) T.box(k === 2 ? 0xa02020 : 0xe8e4d8, 0.05, 0.002, 0.075, X + 0.1 + k * 0.03, 0.603, Z + 0.14 + (k % 2) * 0.02, { ry: k * 0.5 - 0.8 });
    solid(X - 0.3, X + 0.3, Z - 0.3, Z + 0.3, 0.62); }
  // the sand bucket by the door, the rest on the ground where they fell
  { const X = 19.15, Z = 14.3; T.cyl(0xa02020, 0.13, 0.11, 0.26, X, 0.13, Z, { seg: 12, g: 0.2 }); T.cyl(0x8a8068, 0.122, 0.122, 0.005, X, 0.245, Z, { seg: 12 }); for (let k = 0; k < 18; k++) T.cyl(0xe0d4b0, 0.004, 0.004, 0.045, X + Math.sin(k * 1.7) * 0.09, 0.262, Z + Math.cos(k * 2.3) * 0.09, { seg: 5, rz: (k % 5 - 2) * 0.3 }); solid(X - 0.12, X + 0.12, Z - 0.12, Z + 0.12, 0.28); }
  for (let k = 0; k < 90; k++) { const a = k * 2.399, r = 0.35 + (k % 17) * 0.11, x = 19.75 + Math.cos(a) * r * 1.2, z = 15.75 + Math.sin(a) * r; T.cyl(k % 7 === 0 ? 0xa86a30 : 0xd8ccac, 0.0035, 0.0035, 0.03, x, 0.022, z, { seg: 4, rz: Math.PI / 2, ry: a * 3 }); }
  // a fence that's seen better days: gray stockade boards, a few gone, one leaning
  const fenceRun = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.round(L / 0.145), ry = Math.atan2(-(z1 - z0), x1 - x0); for (let k = 0; k < n; k++) { const t = (k + 0.5) / n, h = 1.75 + ((k * 37) % 11) * 0.012; if (k % 19 === 7) continue; const c = [0x5c5448, 0x524a40, 0x62594c, 0x4a4238][k % 4]; T.box(c, 0.135, h, 0.02, x0 + (x1 - x0) * t, h / 2, z0 + (z1 - z0) * t, { ry, rz: k % 23 === 11 ? 0.06 : 0 }); } for (const hh of [0.45, 1.45]) T.box(0x3a342c, L, 0.08, 0.04, (x0 + x1) / 2 + Math.sin(ry) * 0.03, hh, (z0 + z1) / 2 + Math.cos(ry) * 0.03, { ry }); };
  fenceRun(17.6, 18.25, 21.95, 18.25); fenceRun(21.95, 14, 21.95, 18.25); solid(17.6, 22.05, 18.2, 18.3); solid(21.9, 22.0, 14, 18.3);
  T.flush(y);
  ext(y); for (const s of seats) s.layers.set(0);   // (what you aim at: the aiming ray doesn't see the exterior layer)
  // the crew on their break: someone on the bench, a while out of every few hours, their cigarette and its smoke
  const c = tony.smoker = StoreCustomers.build({ ...StoreCustomers.randomOutfit(seeded(7713), false), hat: null });
  c.group.position.set(20.2, 0, 17.08); c.group.rotation.y = Math.PI; c.setPose("sit", { hipY: 0.42 }); c.setMood("neutral"); scene.add(c.group); c.group.visible = false;
  const ember = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff5a1c })); ember.position.set(19.87, 0.72, 16.82); y.add(ember); ember.visible = false; tony.ember = ember;
  const pt = makeTexture((ctx, W) => { const q = ctx.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); q.addColorStop(0, "rgba(255,255,255,.5)"); q.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = q; ctx.fillRect(0, 0, W, W); }, 64, 64);
  tony.puffs = [0, 1, 2, 3, 4, 5].map(i => { const o = new THREE.Sprite(new THREE.SpriteMaterial({ map: pt, color: 0xc4c0b8, transparent: true, depthWrite: false })); o.visible = false; y.add(o); return { o, t: i * 0.6 }; });
}
function crate(T, x, y, z, c, ry = 0) {            // a milk crate, stamped with its lattice
  T.at(x, y, z, ry, () => { for (const s of [-1, 1]) { T.box(c, 0.32, 0.02, 0.02, 0, 0.14, s * 0.15); T.box(c, 0.32, 0.02, 0.02, 0, -0.14, s * 0.15); T.box(c, 0.02, 0.02, 0.32, s * 0.15, 0.14, 0); T.box(c, 0.02, 0.02, 0.32, s * 0.15, -0.14, 0);
      for (const d of [-1, 0, 1]) { T.box(c, 0.015, 0.3, 0.015, d * 0.11, 0, s * 0.15); T.box(c, 0.015, 0.3, 0.015, s * 0.15, 0, d * 0.11); } T.box(c, 0.32, 0.015, 0.015, 0, 0, s * 0.15); T.box(c, 0.015, 0.015, 0.32, s * 0.15, 0, 0); }
    T.box(c, 0.3, 0.012, 0.3, 0, -0.145, 0); });
}
function tonyYardTick(dt) {
  const c = tony.smoker; if (!c) return;
  const near = Math.hypot(player.x - 20.4, player.z - 17) < 22 || player.onRoof, on = tonyOpen() && (shift.h % 3) < 1.1;
  c.group.visible = on && near; tony.ember.visible = on && near;
  if (on && near) { c.tick(dt, 0);
    const t = tony.t2 || 0; tony.ember.material.color.setRGB(1, 0.3 + 0.25 * Math.sin(t * 0.9), 0.08);
    for (const p of tony.puffs) { p.t = (p.t + dt) % 3.6; p.o.visible = true; const k = p.t / 3.6; p.o.position.set(19.87 - k * 0.22 + Math.sin(t * 0.7 + k * 4) * 0.05 * k, 0.74 + k * 0.95, 16.82 - k * 0.1); p.o.scale.setScalar(0.03 + k * 0.34); p.o.material.opacity = 0.28 * (1 - k) * Math.min(1, k * 6); }
  } else for (const p of tony.puffs) p.o.visible = false;
}
