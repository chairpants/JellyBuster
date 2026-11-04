// ---- inside Tony's (customer mode: in through its door): a worn black-and-white checkered floor under a pressed tin
// ceiling, a pendant over each little table and the rest left to fall off, the game corner dark but for its screens, the
// counter across the room with the register and pies under glass, and behind it the wall with the pass through to the
// kitchen (make table, deck ovens under the hood, sinks, dry store, the freezer) and out the steel door at the back. All of it
// lit by tonys/light.js. E at the counter for a slice, E at a cabinet for a game ----
const TONY_CAB_Z = i => 3.2 + i * 0.95;
function tonyInside(x0, x1, z0, z1) {
  const g = new THREE.Group(); scene.add(g);
  const T = tonyKit(), solidAt = (bx0, bx1, bz0, bz1, y1) => colliders.push({ x0: bx0, x1: bx1, z0: bz0, z1: bz1, y1 });
  const H = 3.0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, I = TONY_IN, WZ = I.wallZ, [h0, h1] = I.hole, [d0, d1] = I.doorX;
  const hitBox = (w, h, d, x, y, z, tag) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial()); o.visible = false; o.position.set(x, y, z); o.userData.tony = tag; g.add(o); aimables.push(o); return o; };
  const STEEL = 0xaeb3b8, CHROME = 0xcfd3d6, BLACK = 0x161616, CREAM = 0xe9dfc6, RED = 0x8e1a20;
  // ---- the room's shell ----
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), tonyLit({ kind: "FLOOR" })); fl.rotation.x = -Math.PI / 2; fl.position.set(cx, 0.02, cz); g.add(fl);   // (2 cm up: the grass runs on under the building)
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), tonyLit({ kind: "CEIL" })); ceil.rotation.x = Math.PI / 2; ceil.position.set(cx, H, cz); g.add(ceil);
  // the wall across the room: the doorway at its east end, the pass through to the kitchen
  { const W = new THREE.Group(), wall = tonyLit({ kind: "WALL" }); g.add(W);
    for (const [a, b, y0, y1] of [[x0, h0, 0, H], [h1, d0, 0, H], [d1, x1, 0, H], [h0, h1, 0, 1.1], [h0, h1, 2.15, H], [d0, d1, 2.2, H]]) { const o = new THREE.Mesh(new THREE.BoxGeometry(b - a, y1 - y0, 0.12), wall); o.position.set((a + b) / 2, (y0 + y1) / 2, WZ); W.add(o); } }
  for (const [a, b] of [[x0, h0], [h1, d0], [d1, x1]]) solidAt(a, b, WZ - 0.06, WZ + 0.06);
  solidAt(h0, h1, WZ - 0.06, WZ + 0.06, 1.1);
  // the dado rail, the baseboard, round the dining room but for the game corner's paneling
  for (const [a, b, z] of [[x0 + 0.25, h0, WZ - 0.07], [h1, d0, WZ - 0.07], [d1, x1, WZ - 0.07]]) T.box(CREAM, b - a, 0.045, 0.03, (a + b) / 2, 1.02, z);
  T.box(CREAM, 0.03, 0.045, WZ - z0, x1 - 0.015, 1.02, (z0 + WZ) / 2); T.box(CREAM, x1 - 16.3, 0.045, 0.03, (16.3 + x1) / 2, 1.02, z0 + 0.015);
  // ---- two ceiling fans over the tables (they turn: see tonyTick) ----
  tony.fans = [[16.9, 2.9], [19.1, 2.9]].map(([fx, fz]) => { const f = new THREE.Group(); f.position.set(fx, H - 0.38, fz); g.add(f);
    T.cyl(0x3a2a1c, 0.012, 0.012, 0.3, fx, H - 0.17, fz); T.cyl(0x3a2a1c, 0.06, 0.06, 0.03, fx, H - 0.015, fz, { seg: 14 });
    const K = tonyKit(); K.cyl(0x4a3322, 0.08, 0.08, 0.1, 0, 0, 0, { seg: 14 });
    for (let k = 0; k < 4; k++) K.box(0x6e4526, 0.62, 0.012, 0.13, Math.cos(k * Math.PI / 2) * 0.36, -0.02, Math.sin(k * Math.PI / 2) * 0.36, { ry: -k * Math.PI / 2, rx: 0.08 });
    K.flush(f); return f; });
  // ---- neon in the windows, facing the walk (lit while they're open: see tonyTick) ----
  const neon = (draw, w, h, x, y) => { const t = makeTexture(draw, 256, Math.round(256 * h / w)); const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide, depthWrite: false });
    const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); o.position.set(x, y, z0 + 0.12); o.rotation.y = Math.PI; o.renderOrder = 3; g.add(o); return m; };
  tony.neon = [
    neon((ctx, w, h) => { ctx.clearRect(0, 0, w, h); ctx.lineWidth = 6; ctx.strokeStyle = "#ff3b5c"; ctx.shadowColor = "#ff3b5c"; ctx.shadowBlur = 16; ctx.strokeRect(8, 8, w - 16, h - 16);
      ctx.font = "bold 70px Arial Rounded MT Bold, Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#6fd3ff"; ctx.shadowColor = "#6fd3ff"; ctx.fillText("OPEN", w / 2, h / 2 + 4); }, 0.9, 0.42, 17.1, 1.8),
    neon((ctx, w, h) => { ctx.clearRect(0, 0, w, h); ctx.lineWidth = 7; ctx.lineJoin = "round"; ctx.shadowBlur = 18;
      ctx.strokeStyle = "#ffb02e"; ctx.shadowColor = "#ffb02e"; ctx.beginPath(); ctx.moveTo(w * 0.2, h * 0.2); ctx.lineTo(w * 0.8, h * 0.2); ctx.lineTo(w * 0.5, h * 0.88); ctx.closePath(); ctx.stroke();
      ctx.strokeStyle = "#ff3b30"; ctx.shadowColor = "#ff3b30"; for (const [px, py] of [[0.4, 0.35], [0.58, 0.38], [0.5, 0.58]]) { ctx.beginPath(); ctx.arc(w * px, h * py, w * 0.05, 0, 7); ctx.stroke(); } }, 0.6, 0.6, 14.2, 1.75),
  ];
  // ---- the tables: a checked cloth, a pendant low over each, bentwood chairs, the shakers and a Chianti bottle with a candle stuck in it ----
  const clothTex = makeTexture((ctx, W2) => { const q = W2 / 10; for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) { ctx.fillStyle = (i + j) % 2 ? "#e9e4d4" : "#a71f26"; ctx.fillRect(i * q, j * q, q, q); }
    ctx.globalAlpha = 0.14; for (let k = 0; k < 7; k++) { ctx.fillStyle = "#5a3a1a"; ctx.beginPath(); ctx.arc(Math.random() * W2, Math.random() * W2, 6 + Math.random() * 16, 0, 7); ctx.fill(); } }, 256, 256);
  const CL = tonyKit();
  for (const [tx, tz] of [[16.9, 1.6], [19.1, 1.6], [16.9, 4.2], [19.1, 4.2]]) {
    CL.plane(0xffffff, 0.86, 0.86, tx, 0.778, tz, { rx: -Math.PI / 2, g: 0.08 }); for (const [dx, dz, ry] of [[0, 0.43, 0], [0, -0.43, Math.PI], [0.43, 0, Math.PI / 2], [-0.43, 0, -Math.PI / 2]]) CL.plane(0xffffff, 0.86, 0.14, tx + dx, 0.708, tz + dz, { ry, uv: [0, 0, 1, 0.16] });
    T.box(0x2a1b10, 0.82, 0.03, 0.82, tx, 0.76, tz); T.cyl(BLACK, 0.035, 0.035, 0.72, tx, 0.38, tz); T.cyl(BLACK, 0.26, 0.28, 0.025, tx, 0.015, tz, { seg: 18, g: 0.2 });
    T.cyl(CHROME, 0.022, 0.026, 0.11, tx + 0.2, 0.835, tz - 0.14, { g: 0.7 }); T.cyl(0xe8e0c8, 0.021, 0.021, 0.07, tx + 0.2, 0.82, tz - 0.14); T.cyl(CHROME, 0.022, 0.026, 0.11, tx + 0.27, 0.835, tz - 0.14, { g: 0.7 }); T.cyl(0xb02a1a, 0.021, 0.021, 0.07, tx + 0.27, 0.82, tz - 0.14);   // parmesan, pepper flakes
    T.box(CHROME, 0.1, 0.13, 0.08, tx - 0.24, 0.845, tz - 0.2, { g: 0.7 }); T.box(0xf4f1e6, 0.07, 0.015, 0.09, tx - 0.24, 0.915, tz - 0.2);                  // the napkins
    T.lathe(0x2c3a1c, [[0, 0], [0.05, 0], [0.055, 0.07], [0.05, 0.13], [0.02, 0.18], [0.016, 0.25], [0, 0.25]], tx + 0.04, 0.78, tz + 0.12, { g: 0.6 }); T.lathe(0xa8854a, [[0.058, 0], [0.058, 0.08], [0.03, 0.1], [0, 0.1]], tx + 0.04, 0.78, tz + 0.12);   // the bottle, its straw
    T.cyl(0xe8dcc0, 0.011, 0.012, 0.07, tx + 0.04, 1.065, tz + 0.12); T.cyl(0xc8b080, 0.022, 0.03, 0.022, tx + 0.04, 1.03, tz + 0.12); T.sph(0xffc060, 0.011, tx + 0.04, 1.115, tz + 0.12, { sy: 1.8, e: -1 });
    for (const s2 of [-1, 1]) { const sx = tx + s2 * 0.62;   // a chair: bentwood back, vinyl seat
      T.cyl(0x7a1c20, 0.2, 0.19, 0.045, sx, 0.46, tz, { seg: 14, g: 0.3 });
      for (const [lx, lz] of [[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.13], [0.13, 0.13]]) T.rod(0x2a1b10, 0.012, [sx + lx, 0.44, tz + lz], [sx + lx * 1.2, 0.02, tz + lz * 1.2]);
      T.torus(0x2a1b10, 0.17, 0.011, sx + s2 * 0.15, 0.72, tz, { ry: Math.PI / 2, arc: Math.PI, seg: 12 }); T.rod(0x2a1b10, 0.011, [sx + s2 * 0.15, 0.72, tz - 0.17], [sx + s2 * 0.15, 0.45, tz - 0.17]); T.rod(0x2a1b10, 0.011, [sx + s2 * 0.15, 0.72, tz + 0.17], [sx + s2 * 0.15, 0.45, tz + 0.17]); T.rod(0x2a1b10, 0.01, [sx + s2 * 0.15, 0.68, tz], [sx + s2 * 0.15, 0.47, tz]); }
    // the pendant: a cord off the tin, a stained glass shade, the lamp up inside it
    T.rod(BLACK, 0.005, [tx, 2.15, tz], [tx, H, tz]); T.cyl(0x4a3522, 0.03, 0.03, 0.03, tx, H - 0.015, tz, { seg: 10 });
    T.lathe(0x7a2a12, [[0.015, 0.2], [0.05, 0.19], [0.13, 0.12], [0.2, 0.01], [0.21, 0]], tx, 2.0, tz, { e: -0.55, seg: 12 }); T.torus(0x3a2a14, 0.21, 0.006, tx, 2.0, tz, { rx: Math.PI / 2, seg: 14 });
    T.sph(0xffe2b0, 0.05, tx, 2.06, tz, { e: -1 });
    solidAt(tx - 0.42, tx + 0.42, tz - 0.42, tz + 0.42, 0.78);
  }
  CL.flush(g, tonyLit({ map: clothTex }));
  // ---- the east wall's brick: photos, each in its frame ----
  const frame = (draw, w, h, z) => { T.box(0x24170d, 0.025, h + 0.07, w + 0.07, x1 - 0.015, 1.85, z); tonyPicture(g, draw, 128, Math.round(128 * h / w), w, h, x1 - 0.031, 1.85, z, { ry: -Math.PI / 2 }); };
  frame((ctx, w, h) => { ctx.fillStyle = "#c9b48a"; ctx.fillRect(0, 0, w, h); ctx.fillStyle = "#5a4630"; ctx.fillRect(10, 10, w - 20, h * 0.62); ctx.fillStyle = "#3a2a1a"; ctx.font = "bold 13px Georgia"; ctx.textAlign = "center"; ctx.fillText("GRAND OPENING", w / 2, h * 0.8); ctx.fillText("1979", w / 2, h * 0.93); }, 0.45, 0.55, 3.0);
  frame((ctx, w, h) => { for (const [i, c] of ["#1f8a3a", "#f4f1e6", "#c8282f"].entries()) { ctx.fillStyle = c; ctx.fillRect(i * w / 3, 0, w / 3 + 1, h); } }, 0.6, 0.4, 3.8);
  frame((ctx, w, h) => { ctx.fillStyle = "#6b4a2a"; ctx.fillRect(0, 0, w, h); ctx.fillStyle = "#d9b44a"; ctx.fillRect(8, 8, w - 16, h - 16); ctx.fillStyle = "#3a2a1a"; ctx.textAlign = "center"; ctx.font = "bold 14px Georgia"; ctx.fillText("BEST SLICE", w / 2, h * 0.42); ctx.fillText("IN TOWN", w / 2, h * 0.6); ctx.font = "12px Georgia"; ctx.fillText("1994", w / 2, h * 0.8); }, 0.42, 0.5, 4.6);
  // ---- the game corner: three cabinets against the paneling, a gumball machine past them ----
  tony.screens = TONY_GAMES.map((game, i) => tonyCabinet(g, game, i, x0 + 0.42, TONY_CAB_Z(i), hitBox, solidAt, x0));
  { const gx = x0 + 0.3, gz = 6.15; T.cyl(0x8e1a20, 0.12, 0.17, 0.7, gx, 0.35, gz, { seg: 12, g: 0.4 }); T.box(STEEL, 0.1, 0.09, 0.03, gx + 0.12, 0.66, gz, { ry: Math.PI / 2, g: 0.6 }); T.cyl(CHROME, 0.13, 0.15, 0.1, gx, 0.76, gz, { seg: 14, g: 0.7 }); T.cyl(0x8e1a20, 0.05, 0.11, 0.07, gx, 1.2, gz, { seg: 12, g: 0.4 });
    const glob = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), new THREE.MeshBasicMaterial({ color: 0xdfeff7, transparent: true, opacity: 0.16, depthWrite: false })); glob.position.set(gx, 0.98, gz); glob.renderOrder = 2; g.add(glob);
    for (let k = 0; k < 34; k++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * 0.13); if (v.y > 0.05) v.y *= 0.3; T.sph([0xff3b30, 0xffd400, 0x2ee6ff, 0x4cd964, 0xffffff][k % 5], 0.022, gx + v.x, 0.93 + v.y, gz + v.z, { seg: 6, seg2: 4, g: 0.5 }); }
    solidAt(gx - 0.18, gx + 0.18, gz - 0.18, gz + 0.18); }
  // ---- the counter: oxblood panels between chrome, a laminate top with a steel lip; register, fountain, pies under glass, the boxes ready ----
  const CW = I.gapX - x0, CX = (x0 + I.gapX) / 2, FZ = I.counterZ, TOPM = 1.05;
  T.box(RED, CW, 0.9, 0.56, CX, 0.53, FZ + 0.3, { g: 0.25 }); T.box(BLACK, CW, 0.08, 0.5, CX, 0.04, FZ + 0.32);
  for (let x = x0 + 0.4; x < I.gapX; x += 0.8) T.box(CHROME, 0.035, 0.9, 0.02, x, 0.53, FZ + 0.012, { g: 0.8 });
  for (const y of [0.16, 0.98]) T.box(CHROME, CW, 0.03, 0.02, CX, y, FZ + 0.012, { g: 0.8 });
  T.box(0xe6e0cf, CW + 0.04, 0.045, 0.72, CX, 1.0275, FZ + 0.3, { g: 0.45 }); T.box(CHROME, CW + 0.05, 0.05, 0.018, CX, 1.0275, FZ - 0.066, { g: 0.85 });
  hitBox(CW, 0.5, 0.7, CX, 1.1, FZ + 0.3, "order");
  solidAt(x0, I.gapX, FZ, FZ + 0.64, TOPM);
  T.at(15.2, 1.05, FZ + 0.4, Math.PI, () => {            // the register: a heavy old NCR, its keys, its green figures, its drawer
    T.box(0x38322a, 0.38, 0.12, 0.38, 0, 0.06, 0, { g: 0.3 }); T.box(0x2c2822, 0.34, 0.14, 0.22, 0, 0.19, -0.06, { g: 0.2, rx: 0 }); T.box(0x1a1a18, 0.28, 0.018, 0.14, 0, 0.13, 0.11, { rx: 0.35 });
    for (let a = 0; a < 3; a++) for (let b = 0; b < 6; b++) T.box(b === 5 ? 0xa83030 : 0xd8d0b8, 0.03, 0.012, 0.022, -0.1 + b * 0.04, 0.144 + a * 0.016, 0.07 + (2 - a) * 0.03, { rx: 0.35 });
    T.box(0x041a08, 0.2, 0.05, 0.005, 0, 0.23, 0.052); T.box(0x5cff7a, 0.14, 0.018, 0.002, 0, 0.23, 0.056, { e: 1 });
  });
  { const X = 18.75, Z = FZ + 0.4;                        // the soda fountain: a steel tower, a lit badge and a lever each, the drip tray
    T.box(STEEL, 0.62, 0.5, 0.36, X, 1.32, Z, { g: 0.7 }); T.box(STEEL, 0.62, 0.05, 0.42, X, 1.58, Z - 0.02, { g: 0.7 }); T.box(0x444648, 0.62, 0.05, 0.3, X, 1.075, Z - 0.1, { g: 0.5 });
    for (const [k, c] of [0xc8282f, 0x2b5bd6, 0x3a9f4a, 0xd98a2b].entries()) { const bx = X - 0.22 + k * 0.147; T.box(c, 0.11, 0.09, 0.006, bx, 1.47, Z - 0.183, { e: 0.8 }); T.box(BLACK, 0.024, 0.11, 0.024, bx, 1.3, Z - 0.2); T.cyl(0x202020, 0.014, 0.018, 0.05, bx, 1.21, Z - 0.2); } }
  // the pie case: glass over a lit steel floor, two shelves, a whole pie and a part of one
  { const X = 17.3, Z = FZ + 0.32, W2 = 1.0;
    T.box(STEEL, W2, 0.025, 0.56, X, 1.065, Z, { g: 0.7 }); for (const sx of [-1, 1]) for (const sz of [-1, 1]) T.box(CHROME, 0.018, 0.5, 0.018, X + sx * W2 / 2, 1.3, Z + sz * 0.27, { g: 0.8 });
    T.box(STEEL, W2 + 0.02, 0.02, 0.58, X, 1.56, Z, { g: 0.7 }); T.box(0xfff0d0, W2 - 0.1, 0.008, 0.03, X, 1.545, Z, { e: -1 });
    const pie = (px, py, part) => { T.cyl(0x8a8d90, 0.2, 0.2, 0.008, px, py, Z, { seg: 22, g: 0.6 }); T.cyl(0xb06a22, 0.185, 0.185, 0.025, px, py + 0.012, Z, { seg: 22 }); T.cyl(0xc98a2a, 0.165, 0.165, 0.004, px, py + 0.027, Z, { seg: 22, g: 0.3 });
      for (let k = 0; k < 11; k++) { const a = k * 2.4, r = 0.035 + (k % 4) * 0.035; if (part && Math.cos(a) > 0.1) continue; T.cyl(0x8c1a1c, 0.021, 0.021, 0.005, px + Math.cos(a) * r, py + 0.031, Z + Math.sin(a) * r, { seg: 8, g: 0.3 }); } };
    pie(X - 0.24, 1.08, false); pie(X + 0.24, 1.08, true); T.box(0xd0d4d8, W2 - 0.04, 0.012, 0.5, X, 1.32, Z, { g: 0.5 }); pie(X, 1.33, false);
    const glassM = new THREE.MeshBasicMaterial({ color: 0xcfe8f0, transparent: true, opacity: 0.09, depthWrite: false, side: THREE.DoubleSide }); const warm = new THREE.Mesh(new THREE.BoxGeometry(W2, 0.48, 0.54), glassM); warm.position.set(X, 1.31, Z); warm.renderOrder = 2; g.add(warm); }
  { const X = 13.9, Z = FZ + 0.34;                        // a tower of flat boxes at the end, the tip jar
    for (let k = 0; k < 16; k++) T.box(k % 2 ? 0xe2d2ae : 0xdccba6, 0.42, 0.038, 0.42, X, 1.07 + k * 0.038, Z, { ry: (k % 3 - 1) * 0.02 });
    T.box(0xa71f26, 0.28, 0.003, 0.2, X, 1.07 + 16 * 0.038 - 0.017, Z); T.lathe(0xdff0f4, [[0.05, 0], [0.055, 0.12], [0.04, 0.14]], 14.6, 1.05, FZ + 0.1, { e: 0.12, g: 0.8 }); T.box(0x5a8050, 0.05, 0.05, 0.002, 14.6, 1.09, FZ + 0.05); }
  // ---- the pass: a steel shelf, a red valance, the wheel of tickets, the heat lamps on their arms ----
  T.box(RED, h1 - h0, 1.05, 0.015, (h0 + h1) / 2, 0.55, WZ - 0.068, { g: 0.2 });
  T.box(STEEL, h1 - h0 + 0.1, 0.04, 0.42, (h0 + h1) / 2, 1.12, WZ, { g: 0.75 }); T.box(RED, h1 - h0 + 0.1, 0.18, 0.03, (h0 + h1) / 2, 2.06, WZ - 0.09, { g: 0.2 });
  T.box(CHROME, h1 - h0, 0.03, 0.03, (h0 + h1) / 2, 2.0, WZ + 0.1, { g: 0.8 }); for (let k = 0; k < 7; k++) { const tx = h0 + 0.4 + k * 0.17 + Math.sin(k * 7) * 0.03; T.plane(0xf0ecd8, 0.075, 0.13, tx, 1.92, WZ + 0.115, { ry: 0, e: 0.04 }); T.plane(0xf0ecd8, 0.075, 0.13, tx, 1.92, WZ + 0.114, { ry: Math.PI }); }
  for (let k = 0; k < 3; k++) { const lx = h0 + 0.8 + k * 1.2; T.cyl(0x8e4a1a, 0.04, 0.11, 0.11, lx, 1.82, WZ, { e: -0.5, seg: 12 }); T.cyl(0xffa030, 0.09, 0.09, 0.005, lx, 1.765, WZ, { e: -1, seg: 12 }); T.rod(CHROME, 0.008, [lx, 1.87, WZ], [lx, 2.15, WZ], { g: 0.8 }); }
  { const bx = 15.2; T.box(0x8a8d90, 0.36, 0.008, 0.36, bx, 1.145, WZ - 0.02, { g: 0.6 }); T.cyl(0xb06a22, 0.17, 0.17, 0.02, bx, 1.16, WZ - 0.02, { seg: 18 }); T.cyl(0xc98a2a, 0.155, 0.155, 0.004, bx, 1.172, WZ - 0.02, { seg: 18 }); }   // up, order waiting
  // the menu, lit from behind in its frame
  T.box(0x241810, 2.5, 0.88, 0.05, (h0 + h1) / 2, 2.58, WZ - 0.085);
  tonyPicture(g, (ctx, W2, H2) => { ctx.fillStyle = "#151515"; ctx.fillRect(0, 0, W2, H2); ctx.fillStyle = "#ffd400"; ctx.textAlign = "center"; ctx.font = "italic 900 34px Arial Black, Arial"; ctx.fillText("TONY'S", W2 / 2, 38);
    ctx.textAlign = "left"; ctx.fillStyle = "#ffffff"; ctx.font = "bold 22px Arial";
    [["CHEESE SLICE", "1.25"], ["PEPPERONI SLICE", "1.50"], ["WHOLE PIE", "8.00"], ["GARLIC KNOTS", "2.00"], ["FOUNTAIN SODA", ".75"]].forEach(([n, pr], k) => { ctx.fillText(n, 24, 76 + k * 26); ctx.textAlign = "right"; ctx.fillText(pr, W2 - 24, 76 + k * 26); ctx.textAlign = "left"; }); }, 512, 216, 2.4, 0.78, (h0 + h1) / 2, 2.58, WZ - 0.112, { ry: Math.PI, e: -0.82 });

  tonyKitchen(g, T, solidAt, x0, x1, z1, H);
  for (const lx of [15.0, 17.5]) { const lz = 7.45; T.rod(BLACK, 0.005, [lx, 2.42, lz], [lx, H, lz]); T.cyl(0x4a3522, 0.03, 0.03, 0.03, lx, H - 0.015, lz, { seg: 10 });
    T.lathe(0x1f3a2a, [[0.02, 0.2], [0.05, 0.19], [0.1, 0.1], [0.19, 0.01], [0.2, 0]], lx, 2.23, lz, { seg: 14, g: 0.4 }); T.lathe(0xffe6bc, [[0.185, 0.012], [0.09, 0.1], [0.04, 0.17]], lx, 2.227, lz, { seg: 14, e: -0.9 }); T.sph(0xfff0d0, 0.045, lx, 2.28, lz, { e: -1 }); }
  T.flush(g);
  // Tony himself, behind the counter
  const c = tony.clerk = StoreCustomers.build({ ...StoreCustomers.randomOutfit(seeded(4417), false), hat: null });
  c.group.position.set(16.2, 0, I.counterZ + 1.0); c.group.rotation.y = Math.PI; c.setMood("neutral"); scene.add(c.group);
  c.parts.forEach(m => { m.userData.tony = "order"; aimables.push(m); });
}
// ---- the kitchen: it works for a living. The make table under the pass with its rail of toppings, the double deck oven and
// the hood over it, the three-bay sink and the hand sink, the floor mixer, a speed rack of dough, dry store, the reach-in
// and the upright freezer, and the way out back left clear ----
function tonyKitchen(g, T, solidAt, x0, x1, z1, H) {
  const STEEL = 0xaeb3b8, CHROME = 0xcfd3d6, DARK = 0x4c4f52, BLACK = 0x161616, WZ = TONY_IN.wallZ;
  // the tubes, in their wrap fixtures
  for (const [lx, lz] of [[15.9, 11.1], [19.0, 11.8]]) { T.box(0xd8d8d0, 1.28, 0.05, 0.3, lx, H - 0.03, lz); T.box(0xf6faff, 1.2, 0.02, 0.24, lx, H - 0.065, lz, { e: -1 }); }
  // ---- the make table, along the back of the pass ----
  { const X0 = 14.4, X1 = 17.4, Z0 = WZ + 0.08, Z1 = Z0 + 0.74, CX = (X0 + X1) / 2, CZ = (Z0 + Z1) / 2;
    T.box(STEEL, X1 - X0, 0.76, Z1 - Z0, CX, 0.5, CZ, { g: 0.6 }); T.box(BLACK, X1 - X0 - 0.1, 0.12, Z1 - Z0 - 0.08, CX, 0.06, CZ);
    for (const dx of [-1, 0, 1]) { T.box(0xb9bec2, 0.86, 0.6, 0.014, CX + dx * 0.96, 0.5, Z1 + 0.005, { g: 0.7 }); T.box(DARK, 0.5, 0.025, 0.03, CX + dx * 0.96, 0.74, Z1 + 0.02, { g: 0.5 }); }   // its cooler doors
    T.box(0xe3dfd2, X1 - X0, 0.045, 0.44, CX, 0.905, Z1 - 0.22, { g: 0.12 });                                   // the cutting board, sliced by ten thousand pies
    for (let k = 0; k < 12; k++) T.box(0xbcb8aa, 0.25 + (k % 3) * 0.1, 0.002, 0.003, X0 + 0.3 + k * 0.22, 0.929, Z1 - 0.1 - (k * 7 % 5) * 0.06, { ry: k * 1.1 });
    T.box(STEEL, X1 - X0, 0.09, 0.3, CX, 0.96, Z0 + 0.15, { g: 0.6 });                                         // the rail
    const tops = [0xa81d12, 0xeae2c0, 0x8c1a1c, 0x3f7a2c, 0xc8b89a, 0x1c1c1c, 0xd8d0b0, 0xd9a02a];   // sauce, cheese, pepperoni, peppers, mushrooms, olives, onions, ham
    tops.forEach((c, k) => { const bx = X0 + 0.22 + k * 0.365; T.box(0x888c90, 0.33, 0.012, 0.24, bx, 1.006, Z0 + 0.15, { g: 0.6 }); T.box(c, 0.3, 0.01, 0.21, bx, 1.012, Z0 + 0.15, { g: 0.25 });
      for (let j = 0; j < 9; j++) T.box(c, 0.025, 0.012, 0.025, bx - 0.11 + (j * 37 % 22) * 0.01, 1.021, Z0 + 0.07 + (j * 53 % 16) * 0.01, { ry: j }); });
    T.box(STEEL, X1 - X0, 0.012, 0.32, CX, 1.15, Z0 + 0.15, { g: 0.6 }); for (const sx of [X0 + 0.04, X1 - 0.04]) T.box(STEEL, 0.015, 0.2, 0.3, sx, 1.05, Z0 + 0.15);   // its lid, propped
    // a pie being built, dough balls in a tray, the ladle, the cutter, flour everywhere
    { const px = 15.2, pz = Z1 - 0.21; T.cyl(0xe2cc96, 0.17, 0.175, 0.012, px, 0.934, pz, { seg: 20 }); T.cyl(0xa81d12, 0.145, 0.145, 0.003, px, 0.941, pz, { seg: 20, g: 0.25 }); T.cyl(STEEL, 0.05, 0.03, 0.03, px + 0.32, 0.945, pz, { seg: 10, g: 0.7 }); T.rod(STEEL, 0.006, [px + 0.32, 0.96, pz], [px + 0.5, 1.03, pz + 0.06]); }
    { const bx = 16.5, bz = Z1 - 0.21; T.box(0x6a8a9a, 0.4, 0.04, 0.3, bx, 0.945, bz); for (const [dx, dz] of [[-0.11, -0.07], [0.11, -0.07], [-0.11, 0.07], [0.11, 0.07], [0, 0]]) T.sph(0xeadcb8, 0.055, bx + dx, 0.975, bz + dz, { sy: 0.72 }); }
    T.cyl(CHROME, 0.04, 0.04, 0.008, 14.7, 0.935, Z1 - 0.12, { seg: 14, rx: 0.5, g: 0.8 }); T.rod(BLACK, 0.011, [14.72, 0.94, Z1 - 0.13], [14.86, 0.94, Z1 - 0.25]);
    for (let k = 0; k < 14; k++) T.cyl(0xf4f0e6, 0.03 + (k % 3) * 0.02, 0.03 + (k % 3) * 0.02, 0.001, 14.9 + (k * 37 % 19) * 0.11, 0.9285, Z1 - 0.05 - (k * 13 % 7) * 0.05, { seg: 8 });
    solidAt(X0, X1, WZ + 0.06, Z1 + 0.02);
    // over it: the pot rail, hung with what they reach for
    T.rod(CHROME, 0.012, [14.5, 1.94, Z0 + 0.5], [17.3, 1.94, Z0 + 0.5], { g: 0.8 }); for (const x of [14.7, 17.1]) T.rod(CHROME, 0.008, [x, 1.94, Z0 + 0.5], [x, H, Z0 + 0.5], { g: 0.8 });
    [[14.85, "pan"], [15.2, "ladle"], [15.45, "ladle"], [15.7, "pan"], [16.1, "whisk"], [16.4, "pan"], [16.8, "ladle"]].forEach(([x, k]) => {
      T.rod(DARK, 0.004, [x, 1.94, Z0 + 0.5], [x, 1.85, Z0 + 0.5]);
      if (k === "pan") { T.cyl(0x8a8d90, 0.13, 0.11, 0.05, x, 1.58, Z0 + 0.5, { seg: 16, rx: Math.PI / 2, g: 0.6 }); T.rod(BLACK, 0.012, [x, 1.72, Z0 + 0.5], [x, 1.85, Z0 + 0.5]); }
      else if (k === "ladle") { T.rod(STEEL, 0.006, [x, 1.85, Z0 + 0.5], [x, 1.58, Z0 + 0.5]); T.sph(STEEL, 0.04, x, 1.55, Z0 + 0.5, { g: 0.7, sy: 0.6 }); }
      else { T.rod(STEEL, 0.008, [x, 1.85, Z0 + 0.5], [x, 1.7, Z0 + 0.5]); T.sph(STEEL, 0.035, x, 1.64, Z0 + 0.5, { g: 0.4, sy: 1.6 }); } });
    T.box(0x232323, 2.1, 0.012, 0.6, 15.9, 0.026, Z1 + 0.32); }                                                   // a rubber mat to stand on
  // ---- the oven: two steel decks on legs, their slot doors glowing (see tonyTick), the dials, the peels ----
  { const X = 15.9, W = 2.4, Z0 = z1 - 1.0, CZ = z1 - 0.5, dk = (y, i) => { T.box(0x8c8f92, W, 0.44, 1.0, X, y, CZ, { g: 0.45 }); T.box(0x72767a, W + 0.02, 0.03, 1.02, X, y - 0.22, CZ, { g: 0.5 }); T.box(0x93979a, W - 0.2, 0.3, 0.02, X, y + 0.02, Z0 - 0.008, { g: 0.6 }); T.box(BLACK, W - 0.3, 0.025, 0.03, X, y + 0.12, Z0 - 0.03, { g: 0.4 });
      for (const sx of [-1, 1]) T.box(BLACK, 0.03, 0.03, 0.05, X + sx * (W / 2 - 0.25), y + 0.12, Z0 - 0.018);
      for (let k = 0; k < 2; k++) { T.cyl(0xe6e2d0, 0.032, 0.032, 0.012, X + W / 2 - 0.13, y + 0.07 - k * 0.1, Z0 - 0.006, { rx: Math.PI / 2, seg: 14 }); T.cyl(BLACK, 0.012, 0.012, 0.016, X + W / 2 - 0.13, y + 0.07 - k * 0.1, Z0 - 0.012, { rx: Math.PI / 2, seg: 8 }); }
      const mouth = new THREE.Mesh(new THREE.BoxGeometry(W - 0.5, 0.05, 0.006), tony.mouthM); mouth.position.set(X, y - 0.04, Z0 - 0.021); g.add(mouth); };
    tony.mouthM = new THREE.MeshBasicMaterial({ color: 0xff8a2a }); dk(0.82, 0); dk(1.27, 1); tony.mouth = { material: tony.mouthM };
    for (const sx of [-1, 1]) for (const sz of [-0.4, 0.4]) T.box(DARK, 0.07, 0.6, 0.07, X + sx * (W / 2 - 0.1), 0.3, CZ + sz);
    T.box(DARK, W, 0.03, 0.9, X, 0.18, CZ); for (let k = 0; k < 5; k++) T.box(0x7a7a70, 0.42, 0.03, 0.42, X - 0.9 + k * 0.45, 0.21, CZ - 0.05, { ry: k * 0.05 });   // spare stones, under
    solidAt(X - W / 2, X + W / 2, Z0 - 0.03, z1);
    // the hood over it: stainless, filters along its throat, its two caged lights, the duct up through the ceiling
    T.box(STEEL, W + 0.5, 0.52, 1.3, X, 2.4, z1 - 0.65, { g: 0.55 }); T.box(STEEL, W + 0.5, H - 2.66, 1.3, X, (H + 2.66) / 2, z1 - 0.65, { g: 0.5 }); T.box(0x35352f, W + 0.3, 0.012, 1.1, X, 2.135, z1 - 0.65);
    for (let k = 0; k < 6; k++) T.box(0x6c6a60, 0.42, 0.012, 0.6, X - 1.1 + k * 0.44, 2.13, z1 - 0.45, { rz: 0.03, g: 0.3 });
    for (const sx of [-0.7, 0.7]) { T.box(0xfff4d8, 0.26, 0.012, 0.1, X + sx, 2.125, z1 - 1.05, { e: -1 }); T.box(CHROME, 0.3, 0.01, 0.14, X + sx, 2.133, z1 - 1.05); }
    // grease run down the front lip
    for (let k = 0; k < 9; k++) T.box(0x6a4a1c, 0.03, 0.06 + (k % 3) * 0.06, 0.002, X - 1.3 + k * 0.33, 2.15 + (k % 3) * 0.03, z1 - 1.302);
    // the peels: leaned in the gap by the oven, a brush
    for (const [i, c] of [0xb48a52, 0x9a7442].entries()) { const lean = 0.1 + i * 0.08, px = 17.32 + i * 0.13, pz = z1 - 0.1; T.rod(c, 0.014, [px, 0.5, pz - lean * 0.05], [px, 2.0, pz]); T.box(c, 0.32, 0.5, 0.012, px, 0.25, pz - 0.05, { rx: -0.05 }); }
    T.box(0x232323, 2.0, 0.012, 0.62, X, 0.026, Z0 - 0.32); }
  // ---- the west wall: the three-bay sink under its shelf of pots, the hand sink with its sign, the mixer in the corner ----
  { const X = 13.52, Z0 = 10.05, Z1 = 11.95, CZ = (Z0 + Z1) / 2;
    for (const [sx, sz] of [[-0.3, Z0 + 0.05], [0.3, Z0 + 0.05], [-0.3, Z1 - 0.05], [0.3, Z1 - 0.05]]) T.box(STEEL, 0.04, 0.85, 0.04, X + sx, 0.43, sz, { g: 0.5 });
    T.box(STEEL, 0.68, 0.03, Z1 - Z0, X, 0.89, CZ, { g: 0.7 }); T.box(STEEL, 0.02, 0.28, Z1 - Z0, x0 + 0.015, 1.04, CZ, { g: 0.7 }); T.box(STEEL, 0.62, 0.015, Z1 - Z0 - 0.1, X, 0.3, CZ, { g: 0.4 });
    for (let k = 0; k < 3; k++) { const bz = Z0 + 0.42 + k * 0.54; T.box(0x555759, 0.5, 0.012, 0.46, X, 0.906, bz); for (const dz of [-0.24, 0.24]) T.box(STEEL, 0.56, 0.05, 0.02, X, 0.925, bz + dz, { g: 0.8 }); T.box(STEEL, 0.02, 0.05, 0.5, X + 0.27, 0.925, bz, { g: 0.8 });
      if (k < 2) T.box(k ? 0x8a9aa0 : 0xa8b4a0, 0.46, 0.006, 0.42, X, 0.915, bz, { g: 0.9 }); }                           // gray water, soapier water
    T.rod(CHROME, 0.012, [x0 + 0.06, 1.15, CZ - 0.25], [X + 0.05, 1.3, CZ - 0.25], { g: 0.8 }); T.rod(CHROME, 0.01, [X + 0.05, 1.3, CZ - 0.25], [X + 0.1, 1.18, CZ - 0.25], { g: 0.8 });
    T.rod(CHROME, 0.012, [x0 + 0.05, 1.5, CZ + 0.4], [x0 + 0.45, 1.5, CZ + 0.4], { g: 0.8 }); T.rod(0x3a3a3a, 0.006, [x0 + 0.45, 1.5, CZ + 0.4], [x0 + 0.45, 1.1, CZ + 0.45]); T.cyl(CHROME, 0.022, 0.018, 0.1, x0 + 0.45, 1.05, CZ + 0.45, { g: 0.8 });   // the pre-rinse sprayer, on its spring
    T.box(STEEL, 0.3, 0.02, Z1 - Z0, x0 + 0.18, 1.72, CZ, { g: 0.6 }); for (const z of [Z0 + 0.1, Z1 - 0.1]) T.box(DARK, 0.28, 0.14, 0.015, x0 + 0.15, 1.65, z);
    [[10.3, 0.13, 0.22, 0x8a8d90], [10.72, 0.15, 0.18, 0x9a9da0], [11.1, 0.11, 0.26, 0x7e8184], [11.5, 0.13, 0.15, 0x8a8d90]].forEach(([z, r, h, c]) => { T.cyl(c, r, r * 0.9, h, x0 + 0.18, 1.73 + h / 2, z, { seg: 16, g: 0.6 }); T.torus(BLACK, 0.04, 0.008, x0 + 0.18 + r, 1.73 + h * 0.7, z, { seg: 8, ry: Math.PI / 2 }); });
    solidAt(x0, X + 0.34, Z0, Z1);
    const HZ = 12.28; T.box(0xdedad0, 0.32, 0.2, 0.42, x0 + 0.2, 0.84, HZ, { g: 0.5 }); T.cyl(CHROME, 0.012, 0.012, 0.12, x0 + 0.06, 1.0, HZ, { g: 0.8 }); T.rod(CHROME, 0.01, [x0 + 0.06, 1.05, HZ], [x0 + 0.2, 1.03, HZ], { g: 0.8 });
    T.box(0xe8e4d8, 0.08, 0.14, 0.1, x0 + 0.05, 1.25, HZ - 0.15); T.box(STEEL, 0.1, 0.25, 0.26, x0 + 0.05, 1.3, HZ + 0.2, { g: 0.6 }); T.cyl(DARK, 0.03, 0.03, 0.42, x0 + 0.22, 0.42, HZ, { seg: 8 });   // soap, towels, its waste
    tonyPicture(g, (ctx, W, H2) => { ctx.fillStyle = "#f2efe0"; ctx.fillRect(0, 0, W, H2); ctx.fillStyle = "#a71f26"; ctx.fillRect(0, 0, W, H2 * 0.28); ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "bold 18px Arial"; ctx.fillText("NOTICE", W / 2, H2 * 0.2); ctx.fillStyle = "#222"; ctx.font = "bold 16px Arial"; ctx.fillText("EMPLOYEES", W / 2, H2 * 0.5); ctx.fillText("MUST WASH", W / 2, H2 * 0.68); ctx.fillText("HANDS", W / 2, H2 * 0.86); }, 128, 128, 0.2, 0.2, x0 + 0.006, 1.42, HZ, { ry: Math.PI / 2 });
    solidAt(x0, x0 + 0.38, HZ - 0.24, HZ + 0.24);
    // the mixer: forty quarts of Hobart, older than the place
    const MX = x0 + 0.44, MZ = 13.3, gray = 0x7c8688; T.box(gray, 0.5, 0.05, 0.6, MX, 0.025, MZ, { g: 0.3 }); T.box(gray, 0.26, 1.15, 0.3, MX - 0.08, 0.6, MZ + 0.08, { g: 0.3 }); T.box(gray, 0.44, 0.26, 0.42, MX + 0.02, 1.26, MZ + 0.02, { g: 0.3 });
    T.cyl(gray, 0.09, 0.13, 0.17, MX + 0.12, 1.08, MZ - 0.05, { seg: 12, g: 0.3 }); T.lathe(STEEL, [[0.09, 0], [0.2, 0.08], [0.22, 0.3], [0.21, 0.32], [0.19, 0.3], [0.17, 0.08], [0, 0.03]], MX + 0.14, 0.52, MZ - 0.1, { seg: 18, g: 0.7 });
    T.rod(STEEL, 0.012, [MX + 0.14, 1.0, MZ - 0.1], [MX + 0.14, 0.66, MZ - 0.1]); T.torus(STEEL, 0.05, 0.01, MX + 0.14, 0.64, MZ - 0.1, { arc: 3.6, seg: 10 }); T.cyl(0xeadcb8, 0.17, 0.15, 0.12, MX + 0.14, 0.62, MZ - 0.1, { seg: 16 });
    T.box(0xa02020, 0.06, 0.06, 0.02, MX - 0.2, 1.26, MZ - 0.19, { g: 0.4 }); T.box(0x20a020, 0.06, 0.06, 0.02, MX - 0.12, 1.26, MZ - 0.19, { g: 0.4 });
    solidAt(x0, MX + 0.35, MZ - 0.42, z1); }
  // ---- the back wall's east end: the speed rack of dough, the upright freezer, a clipboard ----
  { const X = 19.25, Z = z1 - 0.34; for (const [sx, sz] of [[-0.25, -0.3], [0.25, -0.3], [-0.25, 0.3], [0.25, 0.3]]) { T.box(STEEL, 0.03, 1.7, 0.03, X + sx, 0.88, Z + sz, { g: 0.5 }); T.cyl(BLACK, 0.035, 0.035, 0.03, X + sx, 0.03, Z + sz, { seg: 8 }); }
    for (let k = 0; k < 9; k++) { const y = 0.22 + k * 0.17; T.box(k % 4 === 3 ? 0x6a8a9a : 0x8a9aa0, 0.48, 0.03, 0.62, X, y, Z); if (k % 4 !== 3) for (let d = 0; d < 6; d++) T.sph(0xeadcb8, 0.062, X - 0.14 + (d % 2) * 0.28, y + 0.05, Z - 0.2 + Math.floor(d / 2) * 0.2, { sy: 0.65, seg: 7, seg2: 5 }); }
    solidAt(X - 0.28, X + 0.28, Z - 0.34, z1);
    // the freezer: a stainless upright, two doors, its compressor up top under a box somebody meant to move
    const WX = 20.2, FZ = z1 - 0.72; T.box(0xbcc0c2, 1.24, 1.92, 0.72, WX, 1.04, z1 - 0.36, { g: 0.55 }); T.box(BLACK, 1.2, 0.08, 0.66, WX, 0.04, z1 - 0.36);
    for (const s of [-1, 1]) { const dx = WX + s * 0.31; T.box(0xc8ccce, 0.6, 1.62, 0.03, dx, 1.08, FZ - 0.015, { g: 0.65 }); T.box(0x202224, 0.61, 0.012, 0.032, dx, 1.895, FZ - 0.015); T.box(0x202224, 0.61, 0.012, 0.032, dx, 0.265, FZ - 0.015); T.box(DARK, 0.03, 0.46, 0.04, dx - s * 0.25, 1.12, FZ - 0.05, { g: 0.5 }); for (const y of [0.5, 1.68]) T.box(0x707478, 0.09, 0.05, 0.035, dx + s * 0.27, y, FZ - 0.018, { g: 0.6 }); }
    T.box(0x3a4048, 1.2, 0.09, 0.012, WX, 1.95, FZ - 0.006); T.box(0xff5030, 0.07, 0.03, 0.004, WX - 0.42, 1.95, FZ - 0.014, { e: 1 });
    T.box(0x60646a, 0.86, 0.24, 0.5, WX, 2.12, z1 - 0.36, { g: 0.2 }); for (let k = 0; k < 6; k++) T.box(0x24262a, 0.76, 0.012, 0.004, WX, 2.03 + k * 0.035, z1 - 0.612); T.box(0xc8b48a, 0.5, 0.26, 0.42, WX - 0.1, 2.37, z1 - 0.38, { ry: 0.08 });
    tonyPicture(g, (ctx, W, H2) => { ctx.fillStyle = "#f3f0e2"; ctx.fillRect(0, 0, W, H2); ctx.fillStyle = "#222"; ctx.font = "bold 13px Arial"; ctx.fillText("TEMP LOG", 12, 18); ctx.font = "11px Courier New"; for (let i = 0; i < 9; i++) { ctx.fillText(`${["M", "T", "W", "T", "F", "S", "S", "M", "T"][i]}  ${(i * 7) % 5 - 12}°  ${"AJRAJRTAJ"[i]}.`, 12, 36 + i * 14); } }, 128, 180, 0.2, 0.28, WX + 0.31, 1.4, FZ - 0.032, { ry: Math.PI });
    solidAt(WX - 0.62, WX + 0.62, FZ - 0.06, z1); }
  // ---- the east wall: wire shelves of the dry store, the reach-in with whatever's on top of it, the radio ----
  { const X = 20.56, Z0 = 10.72, Z1 = 11.62, CZ = (Z0 + Z1) / 2; for (const [sx, sz] of [[-0.25, Z0], [0.25, Z0], [-0.25, Z1], [0.25, Z1]]) T.box(0x9a9a92, 0.025, 1.9, 0.025, X + sx, 0.95, sz);
    [0.25, 0.75, 1.25, 1.75].forEach((y, k) => { T.box(0x9a9a92, 0.55, 0.02, Z1 - Z0, X, y, CZ);
      if (k < 3) for (let j = 0; j < 6; j++) { const c = [0xb3202a, 0xd9c23a, 0x3a7a3a][k], cz2 = Z0 + 0.1 + j * 0.14; T.cyl(0xc8ccd0, 0.075, 0.075, 0.18, X - 0.1, y + 0.1, cz2, { seg: 12, g: 0.4 }); T.cyl(c, 0.076, 0.076, 0.12, X - 0.1, y + 0.1, cz2, { seg: 12 }); if (k === 0) { T.cyl(0xc8ccd0, 0.075, 0.075, 0.18, X + 0.1, y + 0.1, cz2, { seg: 12, g: 0.4 }); T.cyl(c, 0.076, 0.076, 0.12, X + 0.1, y + 0.1, cz2, { seg: 12 }); } }
      else { T.box(0xdcd0b0, 0.42, 0.3, 0.42, X, y + 0.16, Z0 + 0.25); T.box(0xc8b48a, 0.4, 0.24, 0.4, X, y + 0.13, Z1 - 0.25); } });
    for (let k = 0; k < 3; k++) T.box(k === 1 ? 0xe2d6b8 : 0xe9dfc4, 0.42, 0.14, 0.72, X, 0.08 + k * 0.13, CZ, { ry: 0.02 * k }); T.box(0xa71f26, 0.26, 0.003, 0.5, X, 0.335, CZ);   // flour, the bottom shelf's clearance
    solidAt(X - 0.28, x1, Z0 - 0.02, Z1 + 0.02);
    const RX = 20.48, RZ0 = 11.74, RZ1 = 12.62, RCZ = (RZ0 + RZ1) / 2; T.box(STEEL, 0.75, 1.95, RZ1 - RZ0, RX, 1.0, RCZ, { g: 0.55 }); T.box(BLACK, 0.7, 0.12, RZ1 - RZ0 - 0.04, RX, 0.06, RCZ); for (const [dz, s] of [[-0.215, 1], [0.215, -1]]) { T.box(0xb9bec2, 0.03, 1.62, 0.41, RX - 0.385, 1.06, RCZ + dz, { g: 0.65 }); T.box(DARK, 0.04, 0.5, 0.03, RX - 0.41, 1.1, RCZ + dz + s * 0.16, { g: 0.5 }); }
    T.box(0x3a4048, 0.015, 0.12, 0.8, RX - 0.385, 1.91, RCZ); T.box(0x60ff90, 0.003, 0.03, 0.06, RX - 0.394, 1.91, RCZ - 0.25, { e: 1 });
    T.box(0xdcd0b0, 0.5, 0.25, 0.5, RX, 2.11, RZ0 + 0.28, { ry: 0.05 }); T.box(0x3a3a3a, 0.14, 0.14, 0.36, RX - 0.1, 2.05, RZ1 - 0.22);   // cardboard; the kitchen radio, in flour and sauce
    T.cyl(0x8a8a8a, 0.003, 0.003, 0.4, RX - 0.1, 2.33, RZ1 - 0.06, { rz: 0.3 }); T.cyl(0x1a1a1a, 0.05, 0.05, 0.01, RX - 0.175, 2.05, RZ1 - 0.32, { rz: Math.PI / 2 }); T.cyl(0x1a1a1a, 0.05, 0.05, 0.01, RX - 0.175, 2.05, RZ1 - 0.12, { rz: Math.PI / 2 });
    solidAt(RX - 0.4, x1, RZ0, RZ1); }
  // ---- what's left: boxes waiting to be folded, a shelf over them; the trash, the mop and bucket by the door, the drain, the extinguisher ----
  { const X = 18.8; for (let k = 0; k < 2; k++) T.box(0xc8b48a, 0.72, 0.5, 0.36, X + k * 0.04, 0.25 + k * 0.5, WZ + 0.26, { ry: k * 0.04 }); T.box(0xa71f26, 0.3, 0.003, 0.2, X, 0.502, WZ + 0.3); solidAt(X - 0.38, X + 0.42, WZ + 0.06, WZ + 0.46);
    T.box(STEEL, 1.3, 0.02, 0.3, X + 0.0, 1.55, WZ + 0.2, { g: 0.6 }); for (const dx of [-0.5, 0.5]) T.box(DARK, 0.02, 0.12, 0.28, X + dx, 1.49, WZ + 0.2);
    for (let k = 0; k < 7; k++) { T.cyl(0xc8ccd0, 0.06, 0.06, 0.14, X - 0.5 + k * 0.17, 1.63, WZ + 0.2, { seg: 10, g: 0.5 }); T.cyl(k % 2 ? 0xb3202a : 0x3a7a3a, 0.061, 0.061, 0.08, X - 0.5 + k * 0.17, 1.63, WZ + 0.2, { seg: 10 }); }
    const BX = 19.5, BZ = 12.9; T.cyl(0x47494b, 0.24, 0.2, 0.72, BX, 0.36, BZ, { seg: 12 }); T.cyl(0x202224, 0.245, 0.245, 0.04, BX, 0.74, BZ, { seg: 12 }); T.sph(0x1c1c1c, 0.22, BX, 0.74, BZ, { sy: 0.4 }); solidAt(BX - 0.24, BX + 0.24, BZ - 0.24, BZ + 0.24);
    const MX = 17.46, MZ = 13.5; T.box(0xd8b820, 0.34, 0.26, 0.3, MX, 0.19, MZ, { g: 0.3 }); T.box(0x7a7f62, 0.28, 0.01, 0.24, MX, 0.3, MZ); for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) T.cyl(BLACK, 0.025, 0.025, 0.05, MX + sx * 0.13, 0.03, MZ + sz * 0.11, { seg: 8 });
    T.rod(0xb48a52, 0.012, [MX, 0.3, MZ + 0.06], [MX + 0.1, 1.5, MZ + 0.29]); T.cyl(0xc0bca8, 0.09, 0.06, 0.1, MX, 0.31, MZ + 0.05, { seg: 8 });
    T.box(0x2c2c2c, 0.3, 0.01, 0.3, 18.6, 0.026, 11.7); for (let k = 0; k < 5; k++) T.box(BLACK, 0.27, 0.012, 0.018, 18.6, 0.028, 11.6 + k * 0.05);
    T.cyl(0xc02020, 0.06, 0.06, 0.34, 18.9, 1.2, z1 - 0.1, { seg: 12, g: 0.5 }); T.cyl(BLACK, 0.015, 0.03, 0.05, 18.9, 1.4, z1 - 0.1, { seg: 8 }); T.box(BLACK, 0.11, 0.02, 0.02, 18.93, 1.43, z1 - 0.1); T.box(DARK, 0.1, 0.03, 0.05, 18.9, 1.05, z1 - 0.03); }
}
// Space Invaders' attract mode on the cabinet: five rows of them (squid, crab, octopus), stepping across a pixel at a
// time with their legs flipping, down a row at each edge, over four green bunkers and the cannon; the score along the top
const INVADER = {
  squid: [["00011000", "00111100", "01111110", "11011011", "11111111", "00100100", "01011010", "10100101"], ["00011000", "00111100", "01111110", "11011011", "11111111", "01011010", "10000001", "01000010"]],
  crab: [["00100000100", "00010001000", "00111111100", "01101110110", "11111111111", "10111111101", "10100000101", "00011011000"], ["00100000100", "10010001001", "10111111101", "11101110111", "11111111111", "01111111110", "00100000100", "01000000010"]],
  octo: [["000011110000", "011111111110", "111111111111", "111001100111", "111111111111", "000110011000", "001101101100", "110000000011"], ["000011110000", "011111111110", "111111111111", "111001100111", "111111111111", "001110011100", "011001100110", "001100001100"]],
};
