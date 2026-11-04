// ---------------- the theater's lobby, dressed ----------------
// A small-town cinema's: dark panelled walls and fan sconces over the carpet; the concession stand at its west end (a candy
// case you can see the boxes in, the register, a hot dog roller, the soda fountain and the menu board behind) with the popcorn
// machine beside it (built with the snack center: store/lobby.js); the ropes and the ticket stand on the way to the door, a trash bin for the way out; a bench;
// and across from the way in, under its own marquee bulbs, the NOW PLAYING poster: whatever's in the VCR, its name below it.
const nowPlaying = { shown: undefined, poster: null, plate: null, ctx: null };
{
  const X0 = WALL_L + WALL_T / 2, Z0 = STORE.z + WALL_T / 2, Z1 = BOH.z1 - WALL_T / 2, XS = SHAFT.x0, H = BOH.h;   // its inside faces; the stairwell's wall; the ceiling
  const lam = (color, o = {}) => new THREE.MeshLambertMaterial({ color, ...o });
  const phong = (color, shininess = 60, specular = 0x888888) => new THREE.MeshPhongMaterial({ color, shininess, specular });
  const bx = (w, h, d, m, x, y, z, par = scene) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); par.add(o); return o; };
  const cy = (r0, r1, h, m, x, y, z, n = 16, par = scene) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, n), m); o.position.set(x, y, z); par.add(o); return o; };
  const plane = (w, h, m, x, y, z, ry = 0, par = scene) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); o.position.set(x, y, z); o.rotation.y = ry; par.add(o); return o; };
  const canvasMat = (w, h, draw, Mat = THREE.MeshLambertMaterial) => new Mat({ map: makeTexture(draw, w, h) });
  const gold = phong(0xc9a227, 80, 0xffe2a0), walnut = wallSurface(lam(0x4a2f1c), "wood"), walnutLight = wallSurface(lam(0x6a4628), "wood"), burgundy = wallSurface(lam(0x4e121b), "damask"), black = lam(0x141416), chrome = phong(0xc9cdd2, 90, 0xffffff);

  // ---- the walls: walnut to the rail, burgundy over it, a slim gilt pilaster every so often, a fan sconce on every other one ----
  const fan = lam(0xffd9a0, { emissive: 0xffa24a, emissiveIntensity: 0.85 });
  const panel = (a0, a1, at0, alongX, face, sconces = true, off0 = 0) => {     // a run of wall: along x (at = z) or along z (at = x), looking +/-; off0: how far its wall's face stands proud
    const at = at0 + face * off0;
    const len = a1 - a0, c = (a0 + a1) / 2, off = face * 0.006, ry = alongX ? (face > 0 ? 0 : Math.PI) : (face > 0 ? Math.PI / 2 : -Math.PI / 2);
    const pt = (u, d) => alongX ? [u, at + face * d] : [at + face * d, u];
    const put = (m, w, h, y, u, d) => { const [x, z] = pt(u, d); return plane(w, h, m, x, y, z, ry); };
    put(walnut, len, 1.0, 0.5, c, 0.006); put(burgundy, len, H - 1.0 - 0.14, 1.0 + (H - 1.14) / 2, c, 0.006);
    { const [x, z] = pt(c, 0.012); bx(alongX ? len : 0.024, 0.035, alongX ? 0.024 : len, gold, x, 1.0, z); }                // the chair rail
    { const [x, z] = pt(c, 0.02); bx(alongX ? len : 0.04, 0.14, alongX ? 0.04 : len, walnutLight, x, H - 0.07, z); }        // the cornice
    { const [x, z] = pt(c, 0.012); bx(alongX ? len : 0.024, 0.1, alongX ? 0.024 : len, walnutLight, x, 0.05, z); }          // the baseboard
    const n = Math.max(1, Math.round(len / 1.5));
    for (let i = 0; i <= n; i++) {
      const u = a0 + i * len / n; put(gold, 0.03, H - 1.14, 1.0 + (H - 1.14) / 2, u, 0.009);
      if (sconces && i % 2 === 1) {                                 // a fan of frosted glass on a brass bracket
        const [x, z] = pt(u, 0.06); bx(alongX ? 0.06 : 0.1, 0.06, alongX ? 0.1 : 0.06, gold, x, 1.62, z);
        const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.05, 0.24, 14, 1, false, 0, Math.PI), fan); const [sx, sz] = pt(u, 0.012); shade.position.set(sx, 1.8, sz); shade.rotation.y = ry - Math.PI / 2; scene.add(shade);
      }
    }
  };
  panel(X0, 1.9, Z0, true, 1, false); panel(Z0, Z1, X0, false, 1);   // the north wall (out to the hall's door; the menu board and the machine are on it), the west wall
  panel(CINEMA_DOOR + DOOR_W / 2 + 0.06, XS, Z1, true, -1, false);   // the south wall, from the auditorium's door (the coming attractions' lights do for sconces)
  panel(X0, CINEMA_DOOR - DOOR_W / 2 - 0.06, Z1, true, -1, false);
  panel(SHAFT.z0, Z1, XS, false, -1, true, 0.03);                   // the stairwell's side
  panel(XS, SHAFT.door - DOOR_W / 2 - 0.05, SHAFT.z0, true, -1, false, 0.03);   // the stairwell's front, up to its door

  bx(DOOR_W + 0.1, 0.012, TALL.z0 - SHAFT.z0 + 0.06, black, SHAFT.door, 0.006, (SHAFT.z0 + TALL.z0) / 2);   // the stairwell door's threshold (the floors either side stopped short: there was sky under it)

  // ---- the concession stand: the counter, its candy case ----
  const CX0 = X0, CX1 = -4.5, CZ = 30.2, CD = 0.62, CH = 0.96, CC = (CX0 + CX1) / 2, FRONT = CZ + CD / 2;
  const CASE0 = -6.45, CASE1 = -4.72;                               // the candy case's run along the counter
  bx(CASE0 - CX0, CH, CD, walnut, (CX0 + CASE0) / 2, CH / 2, CZ);    // the solid part
  bx(CX1 - CASE1, CH, CD, walnut, (CASE1 + CX1) / 2, CH / 2, CZ);
  bx(CASE1 - CASE0, 0.14, CD, walnut, (CASE0 + CASE1) / 2, 0.07, CZ); bx(CASE1 - CASE0, 0.04, CD, walnut, (CASE0 + CASE1) / 2, CH - 0.02, CZ);   // under and over the case
  bx(CASE1 - CASE0, CH, 0.02, black, (CASE0 + CASE1) / 2, CH / 2, CZ - CD / 2 + 0.03);   // the back of the case
  bx(CX1 - CX0 + 0.05, 0.035, CD + 0.06, gold, CC, CH + 0.018, CZ);  // the brass top
  bx(CX1 - CX0 + 0.02, 0.012, CD + 0.03, black, CC, CH + 0.04, CZ);
  bx(CX1 - CX0, 0.08, 0.012, gold, CC, 0.04, FRONT + 0.004);         // the kick
  for (const [a, b] of [[CX0 + 0.1, CASE0 - 0.1]]) { plane(b - a, 0.62, burgundy, (a + b) / 2, 0.5, FRONT + 0.002); bx(b - a + 0.03, 0.02, 0.012, gold, (a + b) / 2, 0.82, FRONT + 0.006); bx(b - a + 0.03, 0.02, 0.012, gold, (a + b) / 2, 0.19, FRONT + 0.006); }
  colliders.push({ x0: CX0, x1: CX1, z0: CZ - CD / 2, z1: CZ + CD / 2, y1: 1.05 });
  // inside the case: two glass shelves of boxed candy, lit, the boxes faces out (each one printed)
  const CANDY = [["CARAMEL", "CHEWS", "#c8741e", "#fff3d0"], ["MINT", "PATTIES", "#0f6e50", "#ffffff"], ["GUMMY", "BEARS", "#e23a6e", "#fff24a"], ["CHERRY", "ROPES", "#b3121d", "#ffffff"], ["CHOCO", "BITS", "#3b1f10", "#ffd9a0"], ["SOUR", "DROPS", "#7ac400", "#10300a"], ["PEANUT", "CLUSTERS", "#e3b32a", "#3b1f10"], ["MALT", "BALLS", "#6a2f9a", "#ffffff"]];
  const candyMats = CANDY.map(([a, b, bg, fg]) => canvasMat(128, 192, (g, W, Hh) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, Hh); g.fillStyle = "#ffffff30"; g.beginPath(); g.arc(W * 0.5, Hh * 0.72, W * 0.36, 0, 7); g.fill();
    g.strokeStyle = fg; g.lineWidth = 5; g.strokeRect(6, 6, W - 12, Hh - 12);
    g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
    for (const [t, y] of [[a, 0.3], [b, 0.5]]) { let px = 30; g.font = `900 ${px}px "Arial Black", Arial`; while (g.measureText(t).width > W - 22) { px -= 2; g.font = `900 ${px}px "Arial Black", Arial`; } g.fillText(t, W / 2, Hh * y); }
  }));
  const candySide = CANDY.map(c => lam(new THREE.Color(c[2]).getHex()));
  const shelfM = lam(0xcfe9f7, { transparent: true, opacity: 0.35, depthWrite: false });
  bx(CASE1 - CASE0 - 0.02, 0.01, CD - 0.06, lam(0x2a1d14), (CASE0 + CASE1) / 2, 0.15, CZ);
  [0.16, 0.54].forEach((sy, row) => {
    if (row) bx(CASE1 - CASE0 - 0.02, 0.008, CD - 0.1, shelfM, (CASE0 + CASE1) / 2, sy - 0.006, CZ + 0.02);
    const n = 8, step = (CASE1 - CASE0 - 0.1) / n;
    for (let i = 0; i < n; i++) {
      const kind = (i + row * 3) % CANDY.length, x = CASE0 + 0.05 + step * (i + 0.5);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.2, 0.05), [candySide[kind], candySide[kind], candySide[kind], candySide[kind], candyMats[kind], candySide[kind]]);
      m.position.set(x, sy + 0.1, FRONT - 0.09); m.rotation.x = -0.14; scene.add(m);
      bx(0.135, 0.2, 0.05, candySide[kind], x, sy + 0.1, FRONT - 0.18).rotation.x = -0.14;   // (another behind it)
    }
  });
  bx(CASE1 - CASE0 - 0.03, 0.012, 0.03, new THREE.MeshBasicMaterial({ color: 0xfff2c8 }), (CASE0 + CASE1) / 2, CH - 0.05, CZ);   // the case's strip light
  bx(CASE1 - CASE0, CH - 0.18, 0.008, lam(0xcfe9f7, { transparent: true, opacity: 0.16, depthWrite: false }), (CASE0 + CASE1) / 2, (CH + 0.14 - 0.04) / 2 + 0.02, FRONT);   // its glass
  for (const x of [CASE0, CASE1]) bx(0.02, CH - 0.14, 0.02, gold, x, 0.14 + (CH - 0.14) / 2, FRONT);
  // on the counter: the register, a hot dog roller, the napkins and straws, sleeves of cups
  const TOP = CH + 0.046;
  { const g = new THREE.Group(); g.position.set(-7.0, TOP, CZ); g.rotation.y = Math.PI + 0.25 + Math.PI; scene.add(g);   // the register, turned to whoever's behind it... and to you
    const beige = lam(0xc9c2ad), dark = lam(0x2b2d30);
    bx(0.38, 0.11, 0.4, beige, 0, 0.055, 0, g); bx(0.36, 0.015, 0.3, dark, 0, 0.115, 0.02, g);     // the drawer, its keytop
    const slope = bx(0.34, 0.19, 0.03, beige, 0, 0.19, -0.11, g); slope.rotation.x = 0.5;
    const keys = canvasMat(128, 96, (c, W, Hh) => { c.fillStyle = "#3a3d40"; c.fillRect(0, 0, W, Hh); for (let y = 0; y < 4; y++) for (let x = 0; x < 5; x++) { c.fillStyle = x > 3 ? "#d04a2a" : "#e6e2d4"; c.fillRect(8 + x * 23, 8 + y * 21, 18, 16); } });
    const kp = plane(0.28, 0.14, keys, 0, 0.19, -0.092, 0, g); kp.rotation.x = 0.5 - Math.PI / 2 + Math.PI / 2;
    bx(0.2, 0.06, 0.07, dark, 0, 0.32, -0.15, g);                                                  // the display, over the keys
    plane(0.17, 0.035, new THREE.MeshBasicMaterial({ color: 0x4dff7a }), 0, 0.32, -0.114, 0, g);
    bx(0.08, 0.03, 0.09, lam(0xefefe6), 0.12, 0.13, 0.13, g);                                      // the paper roll
  }
  { const R = -5.05, g = new THREE.Group(); g.position.set(R, TOP, CZ - 0.04); scene.add(g);       // the hot dog roller: steel, a row of rollers, dogs on them, a sneeze guard
    const steel = phong(0xb4b9be, 70, 0xffffff), dog = phong(0xa64a26, 40, 0x553322);
    bx(0.56, 0.1, 0.34, steel, 0, 0.05, 0, g); bx(0.5, 0.012, 0.3, lam(0x2a2a2c), 0, 0.104, 0, g);
    for (let i = 0; i < 7; i++) { const z = -0.12 + i * 0.04, r = cy(0.012, 0.012, 0.48, chrome, 0, 0.122, z, 10, g); r.rotation.z = Math.PI / 2; }
    for (let i = 0; i < 4; i++) { const d = cy(0.017, 0.017, 0.16, dog, -0.14 + (i % 2) * 0.24, 0.15, -0.09 + i * 0.06, 12, g); d.rotation.z = Math.PI / 2; for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 8), dog); e.position.set(d.position.x + s * 0.08, 0.15, d.position.z); g.add(e); } }
    const gl = bx(0.56, 0.22, 0.006, lam(0xcfe9f7, { transparent: true, opacity: 0.22, depthWrite: false }), 0, 0.24, 0.19, g); gl.rotation.x = -0.35;
    bx(0.56, 0.012, 0.012, chrome, 0, 0.35, 0.15, g);
    const lbl = canvasMat(256, 48, (c, W, Hh) => { c.fillStyle = "#b3121d"; c.fillRect(0, 0, W, Hh); c.fillStyle = "#ffd400"; c.font = `900 italic 30px "Arial Black", Arial`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("HOT DOGS", W / 2, Hh / 2 + 1); });
    plane(0.5, 0.08, lbl, 0, 0.05, 0.172, 0, g);
  }
  { const dx = -5.95;                                               // napkins, a tumbler of straws
    bx(0.13, 0.13, 0.11, chrome, dx, TOP + 0.065, CZ + 0.06); bx(0.1, 0.05, 0.004, lam(0xfaf8f0), dx, TOP + 0.07, CZ + 0.117);
    cy(0.04, 0.035, 0.12, lam(0xd7dde0, { transparent: true, opacity: 0.45, depthWrite: false }), dx + 0.2, TOP + 0.06, CZ + 0.06, 14);
    for (let i = 0; i < 9; i++) { const a = i * 0.7, s = cy(0.003, 0.003, 0.24, lam(i % 2 ? 0xd81e2c : 0xf4f4f4), dx + 0.2 + Math.cos(a) * 0.018, TOP + 0.14, CZ + 0.06 + Math.sin(a) * 0.018, 6); s.rotation.set(Math.sin(a) * 0.14, 0, Math.cos(a) * 0.14); }
  }

  // ---- behind it: the back bar, the soda fountain, the menu board ----
  const BZ = Z0 + 0.27;
  bx(CX1 - CX0, 0.9, 0.52, walnutLight, CC, 0.45, BZ); bx(CX1 - CX0 + 0.02, 0.03, 0.54, black, CC, 0.915, BZ);
  colliders.push({ x0: CX0, x1: CX1, z0: Z0, z1: BZ + 0.26, y1: 1.1 });
  const COLAS = [["COLA", "#b3121d"], ["ORANGE", "#ef7f12"], ["LEMON-LIME", "#2f9e3a"], ["ROOT BEER", "#5a3216"], ["ICED TEA", "#a8641c"], ["WATER", "#3f86c7"]];
  { const FX = -6.1, FW = 1.5, FY = 0.93, g = new THREE.Group(); g.position.set(FX, FY, BZ); scene.add(g);   // the fountain
    const steel = phong(0xb4b9be, 70, 0xffffff);
    bx(FW, 0.06, 0.42, steel, 0, 0.03, 0.02, g);                     // the drip tray
    plane(FW - 0.06, 0.34, lam(0x8d9499), 0, 0.06 + 0.02, 0.232, 0, g).rotation.x = -Math.PI / 2;
    bx(FW, 0.52, 0.22, steel, 0, 0.42, -0.1, g);                     // the tower
    const header = canvasMat(512, 64, (c, W, Hh) => { c.fillStyle = "#101014"; c.fillRect(0, 0, W, Hh); c.fillStyle = "#ffd400"; c.font = `900 italic 40px "Arial Black", Arial`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("ICE COLD SODA", W / 2, Hh / 2 + 2); }, THREE.MeshBasicMaterial);
    bx(FW, 0.14, 0.22, black, 0, 0.75, -0.1, g); plane(FW - 0.05, 0.12, header, 0, 0.75, 0.012, 0, g);
    COLAS.forEach(([name, col], i) => {
      const x = -FW / 2 + (i + 0.5) * FW / COLAS.length;
      plane(0.2, 0.26, canvasMat(96, 128, (c, W, Hh) => { c.fillStyle = col; c.fillRect(0, 0, W, Hh); c.strokeStyle = "#fff"; c.lineWidth = 4; c.strokeRect(5, 5, W - 10, Hh - 10); c.fillStyle = "#fff"; c.textAlign = "center"; c.textBaseline = "middle"; let px = 22; c.font = `900 ${px}px "Arial Black", Arial`; for (const [k, part] of name.split(/[ -]/).entries()) { let f = px; while (c.measureText(part).width > W - 16 && f > 8) { f -= 1; c.font = `900 ${f}px "Arial Black", Arial`; } c.fillText(part, W / 2, Hh * (0.4 + k * 0.22)); c.font = `900 ${px}px "Arial Black", Arial`; } }, THREE.MeshBasicMaterial), x, 0.5, 0.012, 0, g);
      bx(0.05, 0.05, 0.08, chrome, x, 0.28, 0.03, g); cy(0.012, 0.016, 0.05, black, x, 0.235, 0.05, 10, g);   // valve, nozzle
      bx(0.03, 0.05, 0.012, black, x, 0.27, 0.075, g);               // its push lever
    });
    // cups: sleeves of them, nested, three sizes
    for (const [cx, r, n] of [[0.92, 0.042, 14], [1.1, 0.05, 11], [1.3, 0.058, 9]]) for (let i = 0; i < n; i++) cy(r, r * 0.74, 0.13, lam(i % 3 === 0 ? 0xd81e2c : 0xf5f1e6), cx, 0.065 + i * 0.022, 0.03, 16, g);
  }
  // the board: lit from behind, what's what
  { const BW = CX1 - CX0 - 0.1, BH = 0.78, BY = 2.14, BX = CC;
    bx(BW + 0.08, BH + 0.08, 0.1, black, BX, BY, Z0 + 0.06);
    const board = canvasMat(1536, Math.round(1536 * BH / BW), (c, W, Hh) => {
      c.fillStyle = "#1a1412"; c.fillRect(0, 0, W, Hh); c.strokeStyle = "#ffd400"; c.lineWidth = 6; c.strokeRect(10, 10, W - 20, Hh - 20);
      const cols = [["POPCORN", [["SMALL", "1.50"], ["MEDIUM", "2.00"], ["LARGE", "2.50"], ["BUTTER", "FREE"]]], ["COLD DRINKS", [["SMALL", "1.00"], ["MEDIUM", "1.50"], ["LARGE", "2.00"], ["ICEE", "1.75"]]], ["SNACKS", [["CANDY", "1.25"], ["HOT DOG", "1.75"], ["NACHOS", "2.25"], ["PRETZEL", "1.50"]]]];
      cols.forEach(([head, rows], i) => {
        const x = 30 + i * (W - 60) / 3, w = (W - 60) / 3 - 20; c.textBaseline = "middle";
        c.fillStyle = "#b3121d"; c.fillRect(x, 28, w, 60); c.fillStyle = "#ffd400"; c.textAlign = "center"; c.font = `900 italic 42px "Arial Black", Arial`; c.fillText(head, x + w / 2, 60);
        rows.forEach(([a, b], r) => { const y = 118 + r * 50; c.textAlign = "left"; c.fillStyle = "#fff4d0"; c.font = `bold 38px Arial`; c.fillText(a, x + 12, y); c.textAlign = "right"; c.fillStyle = "#ffd400"; c.fillText(b, x + w - 12, y); });
      });
      c.fillStyle = "#7a1420"; c.fillRect(30, Hh - 92, W - 60, 62); c.fillStyle = "#fff4d0"; c.textAlign = "center"; c.font = `bold 38px Arial`; c.fillText("ADMISSION $3.50  ·  MATINEE $2.00  ·  ALL SEATS, ALL SHOWS", W / 2, Hh - 60);
    }, THREE.MeshBasicMaterial);
    board.color.setHex(0xcfcfcf);
    plane(BW, BH, board, BX, BY, Z0 + 0.112);
  }

  // ---- the way in: a ticket stand and the ropes, down to the auditorium's door ----
  const velvet = lam(0x8f111c), ROPE_X = -5.75;
  const posts = [[ROPE_X, 32.5], [ROPE_X, 33.35], [ROPE_X, 34.2]];
  for (const [x, z] of posts) { cy(0.025, 0.025, 0.9, gold, x, 0.45, z, 12); cy(0.13, 0.14, 0.03, gold, x, 0.015, z, 16); const b = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), gold); b.position.set(x, 0.92, z); scene.add(b); }
  for (let i = 0; i < posts.length - 1; i++) { const a = posts[i], b = posts[i + 1], d = b[1] - a[1]; const rope = new THREE.Mesh(new THREE.TorusGeometry(d / 2, 0.02, 8, 24, Math.PI), velvet); rope.position.set(a[0], 0.86, (a[1] + b[1]) / 2); rope.rotation.set(0, Math.PI / 2, Math.PI); rope.scale.y = 0.55; scene.add(rope); }
  colliders.push({ x0: ROPE_X - 0.1, x1: ROPE_X + 0.1, z0: 32.4, z1: 34.3, y1: 0.95 });
  { const SX = ROPE_X, SZ = 31.82, g = new THREE.Group(); g.position.set(SX, 0, SZ); g.rotation.y = -Math.PI / 2 + Math.PI; scene.add(g);   // the ticket stand: a walnut lectern, a roll of tickets, a brass plate
    bx(0.5, 0.05, 0.4, walnut, 0, 0.025, 0, g); bx(0.42, 1.0, 0.32, walnut, 0, 0.55, 0, g); const t = bx(0.5, 0.03, 0.42, walnutLight, 0, 1.07, 0.02, g); t.rotation.x = 0.1;
    bx(0.3, 0.012, 0.012, gold, 0, 0.82, 0.163, g); bx(0.3, 0.012, 0.012, gold, 0, 0.3, 0.163, g);
    plane(0.34, 0.14, canvasMat(256, 106, (c, W, Hh) => { c.fillStyle = "#c9a227"; c.fillRect(0, 0, W, Hh); c.strokeStyle = "#5a4310"; c.lineWidth = 5; c.strokeRect(6, 6, W - 12, Hh - 12); c.fillStyle = "#2a1c08"; c.font = `900 40px "Arial Black", Arial`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("TICKETS", W / 2, Hh / 2 + 2); }), 0, 0.56, 0.163, 0, g);
    const roll = cy(0.055, 0.055, 0.07, lam(0xd8344a), -0.1, 1.16, 0.02, 18, g); roll.rotation.z = Math.PI / 2;
    bx(0.07, 0.002, 0.12, lam(0xd8344a), -0.1, 1.098, 0.13, g);
    colliders.push({ x0: SX - 0.25, x1: SX + 0.25, z0: SZ - 0.28, z1: SZ + 0.28, y1: 1.15 });
  }

  // ---- on the way out of the auditorium: a trash bin, a real one (see trashBins): open-topped, walnut and brass, THANK YOU on its front ----
  { const TX = X0 + 0.32, TZ = 33.0, TR = 0.25, TH = 0.86, g = new THREE.Group(); g.position.set(TX, 0, TZ); scene.add(g);
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(TR, TR * 0.9, TH, 28, 1, true), new THREE.MeshLambertMaterial({ color: 0x3a2416, side: THREE.DoubleSide })); shell.position.y = TH / 2; g.add(shell);
    const base = cy(TR * 0.97, TR * 0.97, 0.04, gold, 0, 0.02, 0, 28, g);
    const liner = new THREE.Mesh(new THREE.TorusGeometry(TR - 0.004, 0.014, 8, 36), lam(0x1c1c1e)); liner.rotation.x = Math.PI / 2; liner.position.y = TH; g.add(liner);
    const parts = [shell, base, liner];
    for (const y of [0.14, TH - 0.1]) { const r = TR * (0.9 + 0.1 * y / TH) + 0.006, band = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.028, 28, 1, true), gold); band.position.y = y; g.add(band); parts.push(band); }   // (open-ended: a cap would be a lid)
    const tag = plane(0.26, 0.09, canvasMat(260, 90, (c, W, Hh) => { c.fillStyle = "#c9a227"; c.fillRect(0, 0, W, Hh); c.strokeStyle = "#5a4310"; c.lineWidth = 4; c.strokeRect(5, 5, W - 10, Hh - 10); c.fillStyle = "#2a1c08"; c.font = `900 34px "Arial Black", Arial`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("THANK YOU", W / 2, Hh / 2 + 2); }), TR + 0.002, 0.55, 0, Math.PI / 2, g); parts.push(tag);
    trashBins.theater = { id: "theater", name: "theater lobby trash", cap: 14, x: TX, z: TZ, rimY: TH, r: TR - 0.02, liner: 0x1c1c1e, parts, stand: { x: TX + 0.75, z: TZ, ry: -Math.PI / 2 } };
    colliders.push({ x0: TX - TR, x1: TX + TR, z0: TZ - TR, z1: TZ + TR, y1: TH });
  }

  // ---- along the stairwell's wall: a tufted bench to wait on, a palm in a brass pot ----
  { const BX = XS - 0.3, BZ0 = 31.0, BZ1 = 33.2, BC = (BZ0 + BZ1) / 2, LEN = BZ1 - BZ0, red = lam(0x7d1420);
    const seats = [];
    seats.push(bx(0.5, 0.16, LEN, red, BX, 0.4, BC)); seats.push(bx(0.12, 0.5, LEN, red, BX + 0.2, 0.68, BC));
    bx(0.46, 0.3, LEN - 0.04, walnut, BX, 0.16, BC);
    for (let i = 0; i < 7; i++) for (const [y] of [[0.6], [0.78]]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), gold); b.position.set(BX + 0.138, y, BZ0 + 0.2 + i * (LEN - 0.4) / 6); scene.add(b); }
    colliders.push({ x0: BX - 0.25, x1: XS, z0: BZ0, z1: BZ1, y1: 0.95 });
    for (const m of seats) { m.userData.sit = true; m.userData.seatPos = { x: BX - 0.04, y: 0, z: BC, ry: -Math.PI / 2, hipY: 0.5 }; aimables.push(m); }
    const PZ = 29.95, PX = XS - 0.42; cy(0.2, 0.15, 0.42, gold, PX, 0.21, PZ, 20); cy(0.18, 0.18, 0.02, lam(0x2b1d12), PX, 0.415, PZ, 20); cy(0.022, 0.03, 0.85, lam(0x4d3a22), PX, 0.83, PZ, 8);
    const leaf = lam(0x24602e, { side: THREE.DoubleSide });
    for (let i = 0; i < 11; i++) { const a = i * 2.4, tip = 0.6 + (i % 3) * 0.14, g = new THREE.Group(); g.position.set(PX, 1.22 + (i % 3) * 0.05, PZ); g.rotation.y = a; scene.add(g);
      const blade = new THREE.Mesh(new THREE.PlaneGeometry(tip, 0.13, 6, 1), leaf), pa = blade.geometry.attributes.position; for (let k = 0; k < pa.count; k++) { const u = pa.getX(k) / tip + 0.5; pa.setY(k, pa.getY(k) * (1 - u * 0.75) - u * u * 0.34); pa.setZ(k, pa.getZ(k)); } blade.geometry.computeVertexNormals(); blade.position.x = tip / 2; blade.rotation.x = 1.25; g.add(blade); }
    colliders.push({ x0: PX - 0.22, x1: PX + 0.22, z0: PZ - 0.22, z1: PZ + 0.22, y1: 1 });
  }

  // ---- the south wall: NOW PLAYING under its bulbs, a coming attraction either side ----
  const NX = -3.05, NZ = Z1 - 0.05, PY = 1.5;
  { const g = new THREE.Group(); g.position.set(NX, PY, NZ); g.rotation.y = Math.PI; scene.add(g);   // (as the store's posters: a group, faces +z; marquee[] runs its bulbs)
    bx(1.1, 1.52, 0.04, black, 0, 0, -0.02, g);
    bx(1.14, 0.02, 0.05, gold, 0, 0.77, -0.018, g); bx(1.14, 0.02, 0.05, gold, 0, -0.77, -0.018, g); bx(0.02, 1.54, 0.05, gold, -0.56, 0, -0.018, g); bx(0.02, 1.54, 0.05, gold, 0.56, 0, -0.018, g);
    const blank = makeTexture((c, W, Hh) => {
      c.fillStyle = "#14090b"; c.fillRect(0, 0, W, Hh); c.strokeStyle = "#c9a227"; c.lineWidth = 8; c.strokeRect(20, 20, W - 40, Hh - 40);
      c.fillStyle = "#c9a227"; c.textAlign = "center"; c.textBaseline = "middle"; c.font = `900 italic 58px "Arial Black", Arial`; c.fillText("CINEMA 1", W / 2, Hh * 0.42);
      c.font = `bold 30px Arial`; c.fillStyle = "#e8d9a8"; c.fillText("PUT A TAPE IN", W / 2, Hh * 0.54); c.fillText("THE THEATER'S VCR", W / 2, Hh * 0.6);
    }, 512, 744);
    blank.colorSpace = THREE.SRGBColorSpace;
    const pm = new THREE.MeshBasicMaterial({ map: blank, color: 0xe4e4e4 }); nowPlaying.blank = blank; nowPlaying.poster = pm;
    plane(0.9, 1.31, pm, 0, 0, 0.004, 0, g);
    const bulbs = glow(new THREE.InstancedMesh(new THREE.SphereGeometry(0.022, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff }), MARQUEE_PTS.length)), o = new THREE.Object3D();
    MARQUEE_PTS.forEach(([px, py], j) => { o.position.set(px, py, 0.04); o.updateMatrix(); bulbs.setMatrixAt(j, o.matrix); bulbs.setColorAt(j, bulbTmp.set(0xffd400)); });
    g.add(bulbs); marquee.push({ mesh: bulbs, phases: MARQUEE_PTS.map((_, j) => j * 0.55) });
    const halo = plane(HALO.w, HALO.h, haloMat, 0, 0, -0.046 + 0.004, 0, g); halo.renderOrder = -1;
    // over it, the words; under it, the name
    const head = glow(new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.2), canvasMat(660, 120, (c, W, Hh) => { c.fillStyle = "#3a0a10"; c.fillRect(0, 0, W, Hh); c.strokeStyle = "#ffd400"; c.lineWidth = 5; c.strokeRect(6, 6, W - 12, Hh - 12); c.fillStyle = "#ffd400"; c.font = `900 italic 72px "Arial Black", Arial`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("NOW PLAYING", W / 2, Hh / 2 + 3); }, THREE.MeshBasicMaterial)));
    head.position.set(0, 0.92, 0.002); g.add(head);
    const c = document.createElement("canvas"); c.width = 720; c.height = 110; nowPlaying.ctx = c.getContext("2d", { willReadFrequently: true });
    nowPlaying.plate = new THREE.CanvasTexture(c); nowPlaying.plate.colorSpace = THREE.SRGBColorSpace;
    const name = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.183), new THREE.MeshBasicMaterial({ map: nowPlaying.plate, color: 0xe6e6e6 })); name.position.set(0, -0.9, 0.002); g.add(name);
  }
  // the two either side: one-sheets in a brass frame, the library's own best (they change by the week with the store's)
  [[-4.72, 2], [-1.42, 3]].forEach(([x, i]) => {
    const g = new THREE.Group(); g.position.set(x, PY, NZ); g.rotation.y = Math.PI; scene.add(g);
    bx(0.86, 1.22, 0.035, black, 0, 0, -0.016, g); for (const [w, h, px, py] of [[0.88, 0.02, 0, 0.61], [0.88, 0.02, 0, -0.61], [0.02, 1.24, -0.43, 0], [0.02, 1.24, 0.43, 0]]) bx(w, h, 0.045, gold, px, py, -0.014, g);
    const m = new THREE.MeshBasicMaterial({ color: 0xbdbdbd }); plane(0.78, 1.14, m, 0, 0, 0.004, 0, g);
    const url = (window.STORE_POSTERS || [])[i];
    if (url) new THREE.TextureLoader().load(url, t => { t.colorSpace = THREE.SRGBColorSpace; m.map = t; m.needsUpdate = true; }, undefined, () => {});
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.09), canvasMat(390, 45, (c, W, Hh) => { c.fillStyle = "#14090b"; c.fillRect(0, 0, W, Hh); c.fillStyle = "#c9a227"; c.font = `bold 22px Arial`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("COMING ATTRACTIONS", W / 2, Hh / 2 + 1); }));
    tag.position.set(0, 0.68, 0.002); g.add(tag);
  });
}
function nowPlayingDraw(text, small) {           // the name under the poster, as big as it'll go
  const g = nowPlaying.ctx, W = 720, H = 110;
  g.fillStyle = "#14090b"; g.fillRect(0, 0, W, H); g.strokeStyle = "#ffd400"; g.lineWidth = 4; g.strokeRect(4, 4, W - 8, H - 8);
  g.fillStyle = "#fff4d0"; g.textAlign = "center"; g.textBaseline = "middle";
  let px = 56; const set = () => { g.font = `900 ${px}px "Arial Black", Arial`; }; set();
  const t = text.toUpperCase(); while (g.measureText(t).width > W - 36 && px > 18) { px -= 2; set(); }
  g.fillText(t, W / 2, small ? H * 0.38 : H / 2 + 2);
  if (small) { g.fillStyle = "#ffd400"; g.font = `bold 26px Arial`; g.fillText(small.toUpperCase(), W / 2, H * 0.74); }
  nowPlaying.plate.needsUpdate = true;
}
function nowPlayingTick() {                      // the poster and the name follow whatever's in the VCR
  const t = playing?.tape || null, key = t ? tapeKey(t) : null;
  if (key === nowPlaying.shown) return;
  nowPlaying.shown = key;
  const m = nowPlaying.poster;
  if (!t) { if (m.map !== nowPlaying.blank) m.map?.dispose(); m.map = nowPlaying.blank; m.needsUpdate = true; nowPlayingDraw("Nothing tonight"); return; }
  const season = t.seasons?.[0]?.label; nowPlayingDraw(t.title, /^Season/.test(season || "") ? season : "");
  const url = t.artHi || t.art;
  new THREE.TextureLoader().load(url, tex => {
    if (nowPlaying.shown !== key) { tex.dispose(); return; }   // (it's changed since)
    tex.colorSpace = THREE.SRGBColorSpace; if (m.map !== nowPlaying.blank) m.map?.dispose(); m.map = tex; m.needsUpdate = true;
  }, undefined, () => {});
}
