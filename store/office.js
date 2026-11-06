// ---- the manager's office (interior x BOH.splitX+0.1..STORE.x-0.1, z BOH.officeZ+0.1..BOH.z1-0.1), behind the break room ----
// Nobody's spent a dime on it since it was fitted out, some ten or twenty years back: walnut-look paneling on the walls
// (the wall shader: "paint" in store/core.js) and on the ceiling, stained avocado shag, a yellowed fixture. A two-pane
// window onto the break room with working venetian blinds; the narrow door beside it. Along the back, a small desk, a ratty
// chair you can sit in, a crappy old computer, a filing cabinet, the wastebasket; on the east wall, the security desk:
// seven CRTs live on the cameras round the building, a big spot monitor, and the switcher that picks what it shows.
// Loaded after store/roof: a save keeps the doors by their order, and this one comes last ----
const officeFx = {
  blinds: [],                                    // each pane's { g, k (0 shut .. 1 open), open, slats }
  sec: { power: true, spot: 0, seq: false, seqT: 0, cams: [], btns: [], next: 0 },
};
const SEC_CAMS = [                               // where each camera hangs (a dome in the ceiling, its lens at `at`), what it's aimed at, which rooms it can see
  { name: "FRONT DOOR", ceil: 3.6, at: [10.55, 3.51, 0.55], look: [-2.5, 0.7, 5.5], rooms: ["store", "out"] },
  { name: "AISLES", ceil: 3.6, at: [-7.3, 3.51, 9.5], look: [6.5, 0.6, 15.5], rooms: ["store"] },
  { name: "LOUNGE", ceil: 3.6, at: [10.55, 3.51, 27.5], look: [-2, 0.6, 20], rooms: ["store", "hall"] },
  { name: "BACK HALL", ceil: 2.7, at: [2.3, 2.61, 28.3], look: [9.2, 0.9, 29.3], rooms: ["hall", "store"] },
  { name: "REGISTER", ceil: 3.6, at: [-5.45, 3.51, 1.75], look: [-5.45, 1.0, 3.9], rooms: ["store"] },   // over the clerk's shoulder, down on the till
  { name: "CONCESSIONS", ceil: 2.7, at: [-5.3, 2.61, 31.6], look: [-7.0, 0.95, 30.2], rooms: ["lobby"] },   // down on the theater lobby's register, from the customers' side
  { name: "THEATER", ceil: 6.0, at: [1.5, 5.91, 36], look: [-3.2, 0.9, 43.5], rooms: ["theater"] },   // the house and the screen, from the back corner
];
const SEC_W = 256, SEC_H = 192;
{
  const x0 = BOH.splitX + 0.1, x1 = STORE.x - 0.1, z0 = BOH.officeZ + 0.1, z1 = BOH.z1 - 0.1, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, H = BOH.h;
  const rnd = seeded(7741);                       // (the same stains in everybody's store)
  const put = (geo, m, x, y, z, ry = 0, par = scene) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; par.add(o); return o; };
  const bx = (w, h, d, m, x, y, z, par) => put(new THREE.BoxGeometry(w, h, d), m, x, y, z, 0, par);
  const cyl = (rt, rb, h, m, x, y, z, seg = 14, par) => put(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z, 0, par);
  const grp = (x, y, z, ry = 0, par = scene) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; par.add(g); return g; };
  const lam = c => new THREE.MeshLambertMaterial({ color: c }), phong = (c, s = 40, sp = 0x444444) => new THREE.MeshPhongMaterial({ color: c, specular: sp, shininess: s });
  const pic = (draw, w, h) => new THREE.MeshLambertMaterial({ map: makeTexture(draw, w, h), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const sheet = (m, w, h, x, y, z, ry = 0, par) => put(new THREE.PlaneGeometry(w, h), m, x, y, z, ry, par);
  const flat = o => { o.rotation.x = -Math.PI / 2; return o; };
  const chrome = phong(0xb9bcc0, 70, 0xcccccc), blackP = phong(0x1b1b1d, 30), beige = phong(0xc7b991, 20, 0x333333), yellowed = phong(0xd2c49a, 18, 0x332e20);
  const walnut = lam(0x4a2d18), walnutDk = lam(0x2a190d);

  // ---- the shag: stains and burns in the base texture, thousands of tufts standing up off it ----
  const STAINS = [[8.15, 33.2, 0.42, "#2b2412", 0.72], [9.65, 33.75, 0.3, "#20200e", 0.75], [6.6, 34.3, 0.5, "#3a3216", 0.55], [10.2, 33.05, 0.2, "#17120a", 0.8], [7.3, 33.65, 0.24, "#4a2c12", 0.62], [9.05, 34.1, 0.18, "#15110b", 0.72]];
  const inStain = (x, z) => { for (const [sx, sz, r] of STAINS) if (Math.hypot(x - sx, (z - sz) * 1.25) < r) return true; return false; };
  const worn = (x, z) => Math.abs(z - (32.6 + (x - 6.85) * 0.42)) < 0.32 && x > 6.4 && x < 9.8;   // the trodden path, door to desk
  const W = x1 - x0 + 0.2, D = z1 - z0 + 0.2, wc = (x0 + x1) / 2, dc = (z0 + z1) / 2;
  const shagTex = makeTexture((ctx, tw, th) => {
    ctx.fillStyle = "#39441b"; ctx.fillRect(0, 0, tw, th);
    for (let i = 0; i < 30000; i++) { const g = 46 + rnd() * 40; ctx.fillStyle = `rgba(${g * 0.78 | 0},${g | 0},${g * 0.32 | 0},${0.35 + rnd() * 0.5})`; ctx.fillRect(rnd() * tw, rnd() * th, 1 + rnd() * 3, 1 + rnd() * 3); }
    const toUv = (x, z) => [(x - wc + W / 2) / W * tw, (z - dc + D / 2) / D * th];
    for (const [x, z, r, c, a] of STAINS) { const [u, v] = toUv(x, z); ctx.save(); ctx.translate(u, v); ctx.scale(r / W * tw, r / D * th * 0.8); ctx.globalAlpha = a; ctx.fillStyle = c; ctx.beginPath(); for (let k = 0; k <= 24; k++) { const t = k / 24 * Math.PI * 2, q = 0.85 + 0.22 * Math.sin(t * 5 + x * 3) + 0.08 * Math.sin(t * 13 + z); ctx.lineTo(Math.cos(t) * q, Math.sin(t) * q); } ctx.fill(); ctx.restore(); }
    for (let i = 0; i < 14; i++) { const [u, v] = toUv(8.6 + (rnd() - 0.5) * 2.4, 33.6 + (rnd() - 0.5) * 1.5); ctx.fillStyle = "#0d0b07"; ctx.beginPath(); ctx.arc(u, v, 2 + rnd() * 2, 0, 7); ctx.fill(); }   // cigarette burns, round where he sits
  }, 1024, 512);
  const shag = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshLambertMaterial({ map: shagTex }));
  shag.rotation.x = -Math.PI / 2; shag.position.set(wc, 0.004, dc); scene.add(shag);
  {                                               // the pile: flat-lit tufts (their normals straight up: shag has no shading of its own to speak of)
    const N = 30000, pos = new Float32Array(N * 9), col = new Float32Array(N * 9), nor = new Float32Array(N * 9);
    for (let i = 0; i < N; i++) {
      const x = wc + (rnd() - 0.5) * W, z = dc + (rnd() - 0.5) * D, a = rnd() * 6.283, w = 0.004 + rnd() * 0.005, flop = 0.006 + rnd() * 0.02, fa = rnd() * 6.283;
      const stain = inStain(x, z), low = worn(x, z), h = (low ? 0.006 : 0.012) + rnd() * (low ? 0.006 : 0.018);
      const g = (stain ? 0.08 : low ? 0.2 : 0.2) + rnd() * (stain ? 0.05 : 0.09), r = g * (stain ? 0.98 : low ? 0.92 : 0.8), b = g * (stain ? 0.55 : 0.3);
      const P = [x + Math.cos(a) * w, 0.004, z + Math.sin(a) * w, x - Math.cos(a) * w, 0.004, z - Math.sin(a) * w, x + Math.cos(fa) * flop, 0.004 + h, z + Math.sin(fa) * flop];
      pos.set(P, i * 9);
      for (let v = 0; v < 3; v++) { const k = v === 2 ? 1.1 : 0.72; col.set([r * k, g * k, b * k], i * 9 + v * 3); nor.set([0, 1, 0], i * 9 + v * 3); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    scene.add(officeFx.pile = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
  }

  // ---- the ceiling: the same paneling, on battens, a water stain over the filing cabinet ----
  const panelTex = makeTexture((ctx, tw, th) => {
    ctx.fillStyle = "#54351d"; ctx.fillRect(0, 0, tw, th);
    for (let i = 0; i < 180; i++) { const y = rnd() * th, a = 0.08 + rnd() * 0.22; ctx.strokeStyle = rnd() < 0.5 ? `rgba(28,15,6,${a})` : `rgba(125,84,46,${a})`; ctx.lineWidth = 0.6 + rnd() * 2.4; ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x <= tw; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.012 + i) * 5); ctx.stroke(); }
    for (const y of [0.06, 0.26, 0.5, 0.62, 0.84]) { ctx.fillStyle = "rgba(14,8,4,0.8)"; ctx.fillRect(0, y * th, tw, 3); }
    const u = (9.4 - x0) / (x1 - x0) * tw, v = (34.2 - z0) / (z1 - z0) * th, st = ctx.createRadialGradient(u, v, 8, u, v, 92);   // the water stain: a brown tide line
    st.addColorStop(0, "rgba(20,12,5,0.16)"); st.addColorStop(0.72, "rgba(22,13,5,0.28)"); st.addColorStop(0.8, "rgba(10,6,2,0.68)"); st.addColorStop(0.86, "rgba(10,6,2,0)"); ctx.fillStyle = st; ctx.fillRect(0, 0, tw, th);
  }, 1024, 512);
  const panelCeil = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 + 0.2, z1 - z0 + 0.2), new THREE.MeshLambertMaterial({ map: panelTex }));
  panelCeil.rotation.x = Math.PI / 2; panelCeil.position.set(cx, H - 0.012, cz); scene.add(panelCeil);
  for (const x of [x0 + 1.22, x0 + 2.44, x0 + 3.66]) bx(0.05, 0.016, z1 - z0, walnutDk, x, H - 0.02, cz);   // the seams' cover strips
  // the light: a wraparound fixture off the ceiling, its plastic gone the color of weak tea, a few dead flies in the bottom
  {
    const m = new THREE.MeshBasicMaterial({ color: 0xf8fbff, map: makeTexture((ctx, tw, th) => {
      ctx.fillStyle = "#d6c07e"; ctx.fillRect(0, 0, tw, th);
      for (const y of [th * 0.32, th * 0.68]) { const g = ctx.createLinearGradient(0, y - 22, 0, y + 22); g.addColorStop(0, "rgba(255,240,190,0)"); g.addColorStop(0.5, "rgba(255,244,205,1)"); g.addColorStop(1, "rgba(255,240,190,0)"); ctx.fillStyle = g; ctx.fillRect(0, y - 22, tw, 44); }
      ctx.fillStyle = "rgba(25,18,8,0.65)"; for (let i = 0; i < 26; i++) ctx.fillRect(40 + rnd() * (tw - 80), th * 0.32 + rnd() * th * 0.42, 2 + rnd() * 5, 2 + rnd() * 3);
      ctx.fillStyle = "rgba(90,66,20,0.4)"; ctx.fillRect(0, 0, 44, th); ctx.fillRect(tw - 44, 0, 44, th);
    }, 512, 128) });
    m.userData.zone = "office"; panelMats.push(m);
    const lens = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.09, 0.32), m); lens.position.set(8.4, H - 0.075, cz + 0.05); glow(lens); scene.add(lens);
    bx(1.29, 0.025, 0.36, lam(0x9c8f6f), 8.4, H - 0.022, cz + 0.05);
  }
  // baseboard, and a strip of quarter-round along the top where the paneling meets the ceiling
  {
    const dx0 = BOH_DOORS.office - OFFICE_DOOR_W / 2 - 0.07, dx1 = BOH_DOORS.office + OFFICE_DOOR_W / 2 + 0.07;
    const run = (w, d, c, zz, h = 0.09, y = h / 2) => bx(w, h, d, walnutDk, c, y, zz);
    run(0.016, z1 - z0, x0 + 0.008, cz); run(0.016, z1 - z0, x1 - 0.008, cz); run(x1 - x0, 0.016, cx, z1 - 0.008);
    run(dx0 - x0, 0.016, (x0 + dx0) / 2, z0 + 0.008); run(x1 - dx1, 0.016, (dx1 + x1) / 2, z0 + 0.008);
    for (const y of [H - 0.04]) { run(0.03, z1 - z0, x0 + 0.015, cz, 0.05, y); run(0.03, z1 - z0, x1 - 0.015, cz, 0.05, y); run(x1 - x0, 0.03, cx, z1 - 0.015, 0.05, y); run(x1 - x0, 0.03, cx, z0 + 0.015, 0.05, y); }
  }

  // ---- the door: hollow-core walnut veneer, gone dull, a nameplate someone took the name out of ----
  const veneer = new THREE.MeshLambertMaterial({ map: makeTexture((ctx, tw, th) => {
    ctx.fillStyle = "#5c3a20"; ctx.fillRect(0, 0, tw, th);
    for (let i = 0; i < 90; i++) { const x = rnd() * tw; ctx.strokeStyle = rnd() < 0.5 ? `rgba(30,15,6,${0.1 + rnd() * 0.22})` : `rgba(130,88,50,${0.08 + rnd() * 0.18})`; ctx.lineWidth = 0.7 + rnd() * 2; ctx.beginPath(); ctx.moveTo(x, 0); for (let y = 0; y <= th; y += 24) ctx.lineTo(x + Math.sin(y * 0.02 + i) * 3, y); ctx.stroke(); }
  }, 128, 256) });
  officeFx.door = makeDoor({ at: BOH.officeZ, c: BOH_DOORS.office, alongX: true, hinge: -1, swing: 1, w: OFFICE_DOOR_W, leafMat: veneer, signs: [{ text: "MANAGER", side: -1 }] });
  {                                               // walnut casing over the white on this side (a face over makeDoor's, which stands 2 cm proud of the wall)
    const c = BOH_DOORS.office, W2 = OFFICE_DOOR_W / 2, zf = BOH.officeZ + WALL_T / 2 + 0.028, t = 0.018;
    for (const s of [-1, 1]) bx(0.09, DOOR_H + 0.09, t, walnut, c + s * (W2 + 0.03), (DOOR_H + 0.09) / 2, zf);
    bx(OFFICE_DOOR_W + 0.15, 0.09, t, walnut, c, DOOR_H + 0.03, zf);
  }

  // ---- the window: a wood frame, a center mullion between the two panes, a sill on each side ----
  {
    const w = OFFICE_WIN, wx = (w.x0 + w.x1) / 2, wy = (w.sill + w.head) / 2, len = w.x1 - w.x0, Z = BOH.officeZ, D2 = WALL_T + 0.04, fr = 0.035, wh = w.head - w.sill;
    bx(len, fr, D2, walnut, wx, w.sill + fr / 2, Z); bx(len, fr, D2, walnut, wx, w.head - fr / 2, Z);
    bx(fr, wh, D2, walnut, w.x0 + fr / 2, wy, Z); bx(fr, wh, D2, walnut, w.x1 - fr / 2, wy, Z); bx(0.05, wh, D2, walnut, wx, wy, Z);
    bx(len + 0.1, 0.03, 0.06, walnut, wx, w.sill - 0.006, Z - WALL_T / 2 - 0.03); bx(len + 0.1, 0.03, 0.06, walnut, wx, w.sill - 0.006, Z + WALL_T / 2 + 0.03);
    officeFx.shutter = put(new THREE.PlaneGeometry(len + 0.04, wh + 0.04), lam(0x8d8062), wx, wy, Z + WALL_T / 2 + 0.05, Math.PI);   // just past the slats, seen only from the break room: while they're all shut it closes the window off, the room behind it not drawn
    const paneW = (len - 2 * fr - 0.05) / 2, paneH = wh - 2 * fr;
    for (const s of [-1, 1]) {
      const px = wx + s * (paneW / 2 + 0.025), glass = new THREE.Mesh(new THREE.PlaneGeometry(paneW, paneH), new THREE.MeshPhongMaterial({ color: 0x9aa89a, specular: 0xcccccc, shininess: 90, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
      glass.position.set(px, wy, Z); glass.renderOrder = 2; scene.add(glass); aimBlockers.push(glass);
      // the blinds, on the office side: a headrail, slats on their ladder tapes, a bottom rail, the tilt wand. E on them tilts them, open or shut
      const b = { g: grp(px, w.head - fr, Z + WALL_T / 2 + 0.035), k: 0, open: false, inst: null, n: 26, side: s, wand: null };
      const slatM = new THREE.MeshLambertMaterial({ color: 0xd7c9a0 }), tape = lam(0xbcae88), bH = paneH - 0.03;
      bx(paneW + 0.02, 0.03, 0.04, lam(0xc9b98e), 0, -0.012, 0, b.g);
      bx(paneW, 0.02, 0.03, lam(0xc3b388), 0, -bH - 0.01, 0, b.g);
      for (const tx of [-paneW * 0.32, paneW * 0.32]) for (const tz of [-0.012, 0.012]) bx(0.009, bH, 0.002, tape, tx, -bH / 2, tz, b.g);
      b.inst = new THREE.InstancedMesh(new THREE.BoxGeometry(paneW - 0.01, 0.0018, 0.046), slatM, b.n); b.inst.frustumCulled = false; b.g.add(b.inst);
      b.slatY = i => -0.04 - i * (bH - 0.05) / (b.n - 1);
      // one slat's stuck half-bent, in the corner where everybody tugs at them
      b.bent = Math.floor(b.n * (s < 0 ? 0.55 : 0.3));
      b.wand = cyl(0.005, 0.005, 0.46, new THREE.MeshPhongMaterial({ color: 0xe6e0cc, specular: 0x888888, shininess: 60, transparent: true, opacity: 0.8 }), s * (paneW / 2 - 0.05), -0.25, 0.022, 8, b.g);
      const pad = new THREE.Mesh(new THREE.BoxGeometry(paneW, bH, 0.05), new THREE.MeshBasicMaterial({ visible: false })); pad.position.set(0, -bH / 2, 0); b.g.add(pad);
      pad.userData.blinds = b; aimables.push(pad);
      blindsPose(b);
      officeFx.blinds.push(b);
    }
  }

  // ---- the desk: small, walnut veneer peeling at the corners, one drawer that doesn't shut ----
  const DX = 9.2, DW = 1.25, DD = 0.62, DH = 0.74, dz = z1 - DD / 2, deskFront = z1 - DD;
  {
    const topM = new THREE.MeshPhongMaterial({ map: makeTexture((ctx, tw, th) => {
      ctx.fillStyle = "#5e3d22"; ctx.fillRect(0, 0, tw, th);
      for (let i = 0; i < 100; i++) { const y = rnd() * th; ctx.strokeStyle = rnd() < 0.5 ? `rgba(28,14,5,${0.1 + rnd() * 0.25})` : `rgba(135,92,52,${0.08 + rnd() * 0.2})`; ctx.lineWidth = 0.6 + rnd() * 2; ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x <= tw; x += 26) ctx.lineTo(x, y + Math.sin(x * 0.015 + i) * 4); ctx.stroke(); }
      for (const [x, y, r] of [[0.2, 0.7, 26], [0.27, 0.42, 26], [0.62, 0.75, 24], [0.78, 0.28, 26]]) { ctx.strokeStyle = "rgba(216,202,172,0.38)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(tw * x, th * y, r, 0.4, 5.8); ctx.stroke(); }   // coffee rings
      ctx.fillStyle = "#c6b48a"; ctx.beginPath(); ctx.moveTo(tw, th); ctx.lineTo(tw - 60, th); ctx.lineTo(tw - 28, th - 22); ctx.lineTo(tw, th - 46); ctx.fill();   // the veneer's lifted at the corner
      ctx.fillStyle = "rgba(10,7,4,0.7)"; for (let i = 0; i < 7; i++) ctx.fillRect(tw * (0.04 + rnd() * 0.16), th * (0.2 + rnd() * 0.5), 9 + rnd() * 18, 3);   // burns along the edge
    }, 1024, 512), specular: 0x332211, shininess: 18 });
    bx(DW, 0.03, DD, topM, DX, DH - 0.015, dz);
    bx(0.4, DH - 0.03, DD - 0.02, walnut, DX - DW / 2 + 0.2, (DH - 0.03) / 2, dz);                   // the pedestal
    bx(0.02, DH - 0.03, DD - 0.02, walnut, DX + DW / 2 - 0.02, (DH - 0.03) / 2, dz);                 // the panel end
    bx(DW - 0.42, 0.34, 0.015, walnutDk, DX + 0.2, DH - 0.2, z1 - 0.03);                             // the modesty panel
    [0, 1, 2].forEach(i => {
      const y = 0.15 + i * 0.2, ajar = i === 1 ? 0.07 : 0, fz = deskFront - ajar;
      bx(0.36, 0.17, 0.015, lam(0x56361d), DX - DW / 2 + 0.2, y, fz - 0.002);
      bx(0.1, 0.015, 0.022, chrome, DX - DW / 2 + 0.2, y + 0.03, fz - 0.018);                         // its pull
      if (ajar) { bx(0.34, 0.02, 0.09, lam(0x4e3019), DX - DW / 2 + 0.2, y - 0.07, fz + 0.04); bx(0.28, 0.05, 0.1, lam(0xe8e0c8), DX - DW / 2 + 0.2, y - 0.02, fz + 0.045); }   // papers sticking out
    });
    colliders.push({ x0: DX - DW / 2, x1: DX + DW / 2, z0: deskFront, z1, y1: DH });
    const y = DH;
    // the computer: a beige box, two floppy drives, a little amber monitor on it, a keyboard the color of old teeth
    const pc = grp(DX - 0.27, y, dz + 0.08);
    bx(0.42, 0.14, 0.38, beige, 0, 0.07, 0, pc); bx(0.42, 0.012, 0.012, lam(0x8c805f), 0, 0.02, -0.19, pc);
    for (const k of [-1, 1]) { bx(0.15, 0.05, 0.004, lam(0x322d24), k * 0.09, 0.09, -0.192, pc); bx(0.1, 0.004, 0.003, blackP, k * 0.09, 0.09, -0.195, pc); }
    const led = new THREE.MeshBasicMaterial({ color: 0x46ff3a }); glow(bx(0.012, 0.008, 0.004, led, 0.17, 0.04, -0.193, pc));
    bx(0.33, 0.28, 0.32, yellowed, 0, 0.14 + 0.15, 0.01, pc);
    bx(0.3, 0.25, 0.012, lam(0x8f8460), 0, 0.14 + 0.155, -0.15, pc);
    const amber = document.createElement("canvas"); amber.width = 256; amber.height = 192;
    const ac = amber.getContext("2d"); officeFx.amber = { canvas: amber, ctx: ac, tex: new THREE.CanvasTexture(amber), on: null };
    officeFx.amber.tex.colorSpace = THREE.SRGBColorSpace;
    glow(sheet(new THREE.MeshBasicMaterial({ map: officeFx.amber.tex }), 0.235, 0.18, 0, 0.14 + 0.155, -0.158, Math.PI, pc));
    const kb = grp(DX - 0.27, y, deskFront + 0.09); bx(0.44, 0.03, 0.16, yellowed, 0, 0.018, 0, kb); for (let r = 0; r < 4; r++) for (let c = 0; c < 13; c++) { if (r === 3 && c % 12) continue; bx(r === 3 && !c ? 0.4 : 0.026, 0.012, 0.028, r === 3 ? yellowed : lam(rnd() < 0.15 ? 0x7c6f50 : 0xa49876), r === 3 ? 0 : -0.18 + c * 0.03, 0.038, 0.05 - r * 0.034, kb); }
    // the phone: a rotary, harvest gold, its cord in knots
    const ph = grp(DX + 0.18, y, dz + 0.14, 0.3), gold = phong(0xb68e2d, 30, 0x665522);
    bx(0.2, 0.06, 0.22, gold, 0, 0.03, 0, ph); bx(0.15, 0.03, 0.11, gold, 0, 0.075, 0.01, ph);
    const dial = cyl(0.046, 0.046, 0.005, lam(0xddd3b3), 0, 0.064, -0.07, 18, ph); dial.rotation.x = -0.35; const fw = cyl(0.016, 0.016, 0.006, lam(0xb0a585), 0, 0.066, -0.07, 12, ph); fw.rotation.x = -0.35;
    bx(0.22, 0.03, 0.05, gold, 0, 0.11, 0.012, ph); for (const s of [-1, 1]) bx(0.05, 0.035, 0.06, gold, s * 0.09, 0.095, 0.012, ph);
    const cord = put(new THREE.TorusGeometry(0.075, 0.004, 5, 22), blackP, -0.16, 0.012, 0.03, 0, ph); cord.rotation.x = Math.PI / 2;
    // the paperwork: a heap of it, a Rolodex, an adding machine with its tape, the ashtray nobody's emptied, the mug
    for (let k = 0; k < 7; k++) { const s = bx(0.22, 0.012, 0.29, lam([0xe7e0cc, 0xe0d7bd, 0xf0e8d3, 0xd5c8ad][k % 4]), DX + 0.33 + (rnd() - 0.5) * 0.02, y + 0.008 + k * 0.012, deskFront + 0.2); s.rotation.y = (rnd() - 0.5) * 0.28; }
    const memo = sheet(pic((ctx, tw, th) => { ctx.fillStyle = "#f1e9d3"; ctx.fillRect(0, 0, tw, th); ctx.fillStyle = "#222"; ctx.textAlign = "center"; ctx.font = "bold 19px Courier New, monospace"; ctx.fillText("OVERDUE ACCOUNTS", tw / 2, 28); ctx.font = "13px Courier New, monospace"; ctx.textAlign = "left"; for (let i = 0; i < 13; i++) { ctx.fillText(`#${1040 + i * 37}  ........  $${(3 + i * 1.75).toFixed(2)}`, 18, 58 + i * 20); } ctx.fillStyle = "#b3202a"; ctx.font = "italic 22px Arial"; ctx.save(); ctx.translate(tw * 0.6, th * 0.6); ctx.rotate(-0.25); ctx.fillText("CALL THEM!!", -60, 0); ctx.restore(); }, 256, 340), 0.2, 0.27, DX + 0.33, y + 0.096, deskFront + 0.2); memo.rotation.x = -Math.PI / 2;
    const rx = grp(DX + 0.12, y, dz + 0.14 - 0.26); cyl(0.05, 0.05, 0.1, lam(0x35322c), 0, 0.06, 0, 12, rx).rotation.z = Math.PI / 2; for (let k = 0; k < 16; k++) { const c = bx(0.09, 0.07, 0.002, lam(0xece6cf), 0, 0.09, 0, rx); c.rotation.x = -1 + k * 0.13; c.position.set(0, 0.06 + Math.cos(-1 + k * 0.13) * 0.075, Math.sin(-1 + k * 0.13) * 0.075); }
    const tray = put(new THREE.CylinderGeometry(0.075, 0.06, 0.03, 8), phong(0x8a4a22, 60, 0x776655), DX - 0.56, y + 0.015, deskFront + 0.12);
    cyl(0.06, 0.06, 0.002, lam(0x5a5a58), DX - 0.56, y + 0.032, deskFront + 0.12);
    for (let k = 0; k < 6; k++) { const bt = cyl(0.0042, 0.0042, 0.05, lam(k % 2 ? 0xd8c080 : 0xe9e2ca), DX - 0.56 + Math.cos(k * 2.1) * 0.035, y + 0.037, deskFront + 0.12 + Math.sin(k * 2.1) * 0.035, 6); bt.rotation.set(Math.PI / 2 - 0.15, 0, k * 1.1); }
    const mug = cyl(0.04, 0.036, 0.095, phong(0xe9e2cc, 40), DX + 0.05, y + 0.048, deskFront + 0.12, 14); sheet(new THREE.MeshLambertMaterial({ map: makeTexture((ctx, tw, th) => { ctx.fillStyle = "#e9e2cc"; ctx.fillRect(0, 0, tw, th); ctx.fillStyle = "#222"; ctx.textAlign = "center"; ctx.font = "bold 13px Arial"; ctx.fillText("WORLD'S", tw / 2, 18); ctx.fillText("OKAYEST", tw / 2, 33); ctx.fillText("BOSS", tw / 2, 48); }, 64, 56) }), 0.05, 0.044, DX + 0.05, y + 0.05, deskFront + 0.079, Math.PI);
    cyl(0.036, 0.036, 0.002, lam(0x24150a), DX + 0.05, y + 0.087, deskFront + 0.12, 14);
    const am = grp(DX + 0.42, y, dz + 0.17); bx(0.17, 0.05, 0.22, lam(0x75706a), 0, 0.025, 0, am); bx(0.11, 0.012, 0.13, lam(0x2c2b29), 0, 0.055, -0.03, am); bx(0.06, 0.15, 0.002, lam(0xf5f0df), 0.03, 0.1, 0.1, am);   // the adding machine and its tape
  }
  // the chair: a swivel chair on casters, the orange vinyl split, the foam coming out, silver tape over the worst of it. Sit in it: it's turned to the security desk
  {
    const c = grp(9.55, 0, 33.75, Math.PI * 0.5 - 0.3), vinyl = phong(0x7a3c1a, 22, 0x2a1a10), foam = lam(0xd8c26f), tape = phong(0x8f9294, 60, 0x999999), metal = phong(0x35373a, 50);
    cyl(0.018, 0.022, 0.32, chrome, 0, 0.24, 0, 10, c);
    for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283 + 0.3, leg = bx(0.3, 0.02, 0.032, metal, Math.cos(a) * 0.15, 0.09, Math.sin(a) * 0.15, c); leg.rotation.y = -a; cyl(0.025, 0.025, 0.03, blackP, Math.cos(a) * 0.3, 0.04, Math.sin(a) * 0.3, 8, c).rotation.x = Math.PI / 2; }
    bx(0.48, 0.09, 0.46, vinyl, 0, 0.45, 0, c);                                                       // the seat, sagging in the middle
    bx(0.3, 0.012, 0.28, lam(0x552812), 0, 0.497, 0.02, c);
    bx(0.14, 0.02, 0.05, foam, 0.13, 0.491, 0.2, c); bx(0.05, 0.022, 0.1, foam, -0.2, 0.49, 0.11, c);   // the foam, through the splits
    bx(0.2, 0.004, 0.06, tape, -0.04, 0.497, 0.18, c).rotation.y = 0.2;                              // the duct tape
    bx(0.44, 0.52, 0.07, vinyl, 0, 0.84, -0.22, c).rotation.x = -0.14;                                // the back, leaning a bit too far
    bx(0.06, 0.26, 0.012, tape, 0.12, 0.92, -0.179, c).rotation.x = -0.14; bx(0.09, 0.04, 0.012, foam, -0.14, 0.72, -0.183, c).rotation.x = -0.14;
    bx(0.03, 0.34, 0.03, chrome, 0, 0.56, -0.25, c);
    for (const s of [-1, 1]) { bx(0.04, 0.02, 0.3, blackP, s * 0.26, 0.66, 0, c); bx(0.024, 0.16, 0.024, chrome, s * 0.26, 0.58, -0.08, c); }
    colliders.push({ x0: 9.27, x1: 9.83, z0: 33.47, z1: 34.03, y1: 0.55 });
    const seat = { x: 9.55, y: 0, z: 33.75, ry: Math.PI * 0.5 - 0.3, hipY: 0.5, roof: true, office: true };   // (roof: Dana doesn't take this for the couch; office: the switcher's in reach from it)
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.5), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(0, 0.65, 0); c.add(hit);
    hit.userData.sit = true; hit.userData.seatPos = seat; aimables.push(hit);
  }
  // the filing cabinet: four drawers, army green, a dent in it, the label cards in the holders gone blank, a dead plant up top
  {
    const FX = 8.13, FW = 0.46, FD = 0.62, FH = 1.32, g = grp(FX, 0, z1 - FD / 2), olive = phong(0x59603f, 28, 0x444433), dk = lam(0x31351f);
    bx(FW, FH, FD, olive, 0, FH / 2, 0, g);
    [0, 1, 2, 3].forEach(i => {
      const y = 0.17 + i * 0.32, a = i === 2 ? 0.1 : 0;                                                // the third one won't close: it's too full
      bx(FW - 0.03, 0.29, 0.016, olive, 0, y, -FD / 2 - 0.008 - a, g); bx(FW - 0.03, 0.006, 0.016, dk, 0, y + 0.15, -FD / 2 - 0.006, g);
      bx(0.1, 0.02, 0.03, chrome, 0, y + 0.02, -FD / 2 - 0.025 - a, g); bx(0.11, 0.05, 0.006, chrome, 0, y + 0.08, -FD / 2 - 0.018 - a, g);
      bx(0.09, 0.034, 0.002, lam(i === 1 ? 0xe2d7ae : 0xeee7cf), 0, y + 0.08, -FD / 2 - 0.022 - a, g);
      if (a) { bx(FW - 0.06, 0.2, a, olive, 0, y - 0.02, -FD / 2 - a / 2, g); for (let k = 0; k < 7; k++) bx(FW - 0.1, 0.22 + rnd() * 0.04, 0.006, lam(k % 2 ? 0xc8b48a : 0xe5dcc0), 0, y + 0.03, -FD / 2 - 0.02 - k * 0.012, g); }   // manila folders
    });
    const dent = sheet(pic((ctx, tw, th) => { const d = ctx.createRadialGradient(tw / 2, th / 2, 4, tw / 2, th / 2, tw / 2); d.addColorStop(0, "rgba(18,20,8,0.55)"); d.addColorStop(1, "rgba(18,20,8,0)"); ctx.fillStyle = d; ctx.fillRect(0, 0, tw, th); }, 64, 64), 0.2, 0.16, 0.11, 0.42, -FD / 2 - 0.018, Math.PI, g); dent.material.transparent = true; dent.material.depthWrite = false;   // somebody kicked it
    // the plant: a rubber tree that gave up, in a macrame hanger's old pot
    cyl(0.085, 0.065, 0.13, lam(0x8a4a22), 0, FH + 0.065, -0.05, 12, g); cyl(0.08, 0.08, 0.006, lam(0x241a10), 0, FH + 0.122, -0.05, 12, g);
    const stem = cyl(0.007, 0.007, 0.3, lam(0x4a3a20), 0, FH + 0.27, -0.05, 6, g); stem.rotation.z = 0.08;
    for (const [dx, dy, r, c] of [[0.09, 0.08, 0.7, 0x4a4a1e], [-0.08, 0.16, -0.9, 0x5a4a1c], [0.05, 0.22, 1.2, 0x3e431b]]) { const lf = put(new THREE.SphereGeometry(0.06, 8, 5), lam(c), dx, FH + 0.14 + dy, -0.05, 0, g); lf.scale.set(1, 0.14, 0.45); lf.rotation.z = r; }
    colliders.push({ x0: FX - FW / 2, x1: FX + FW / 2, z0: z1 - FD - 0.1, z1, y1: FH });
  }
  // the wastebasket: dented steel with a fake wood wrap; crumpled paper in it (see trashBins)
  {
    const cx2 = 10.12, cz2 = z1 - 0.2;
    const can = put(new THREE.LatheGeometry([[0.12, 0], [0.145, 0.36], [0.137, 0.36], [0.115, 0.012], [0.001, 0.012]].map(([r, y]) => new THREE.Vector2(r, y)), 18), new THREE.MeshPhongMaterial({ color: 0x5a3a20, specular: 0x332211, shininess: 18, side: THREE.DoubleSide }), cx2, 0, cz2);
    const liner = put(new THREE.TorusGeometry(0.142, 0.005, 6, 22), lam(0x8c6a42), cx2, 0.36, cz2); liner.rotation.x = Math.PI / 2;
    trashBins.office = { id: "office", name: "manager's wastebasket", cap: 6, x: cx2, z: cz2, rimY: 0.34, r: 0.12, liner: 0xd8d2bc, parts: [can, liner], stand: { x: cx2, z: cz2 - 0.62, ry: 0 } };
    colliders.push({ x0: cx2 - 0.15, x1: cx2 + 0.15, z0: cz2 - 0.15, z1: cz2 + 0.15, y1: 0.36 });
    for (const [dx, dz2] of [[-0.25, 0.04], [0.2, -0.17], [-0.12, -0.22]]) { const p = put(new THREE.IcosahedronGeometry(0.035, 0), lam(0xe8e2d0), cx2 + dx, 0.03, cz2 + dz2); p.rotation.set(rnd() * 3, rnd() * 3, 0); }   // the ones that missed
  }
  // the west end: a visitor's chair nobody's ever sat in, bankers' boxes of old receipts, a stack of dead tapes
  {
    const m = phong(0xa45a1e, 30, 0x332211), g = grp(6.5, 0, 34.42, Math.PI - 0.35);
    bx(0.42, 0.06, 0.42, m, 0, 0.42, 0, g); bx(0.42, 0.42, 0.05, m, 0, 0.72, -0.2, g);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = cyl(0.009, 0.009, 0.42, chrome, sx * 0.18, 0.21, sz * 0.18, 8, g); l.rotation.z = -sx * 0.05; }
    const seat = { x: 6.5, y: 0, z: 34.42, ry: Math.PI - 0.35, hipY: 0.46, roof: true };
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.9, 0.45), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(0, 0.5, 0); g.add(hit); hit.userData.sit = true; hit.userData.seatPos = seat; aimables.push(hit);
    colliders.push({ x0: 6.28, x1: 6.72, z0: 34.2, z1, y1: 0.5 });
    const label = t => sheet(pic((ctx, tw, th) => { ctx.fillStyle = "#b7a27a"; ctx.fillRect(0, 0, tw, th); ctx.fillStyle = "#f2ecd9"; ctx.fillRect(16, 12, tw - 32, th - 24); ctx.fillStyle = "#222"; ctx.textAlign = "center"; ctx.font = "bold 24px Arial"; ctx.fillText(t, tw / 2, th / 2 + 8); }, 256, 110), 0.28, 0.12, 0, 0, 0);
    [[7.2, 0.15, "RECEIPTS '84-'87", 0.06], [7.2, 0.45, "TAXES??", -0.04], [7.55, 0.15, "OLD MEMBERS", -0.09]].forEach(([x, y, t, ry]) => { const b = bx(0.32, 0.3, 0.42, lam(0xb7a27a), x, y, z1 - 0.22); b.rotation.y = ry; const l = label(t); l.position.set(x + Math.sin(ry + Math.PI) * 0.215, y + 0.02, z1 - 0.22 + Math.cos(ry + Math.PI) * 0.215); l.rotation.y = ry + Math.PI; });
    colliders.push({ x0: 7.02, x1: 7.72, z0: z1 - 0.44, z1, y1: 0.6 });
  }
  // ---- on the walls: a 1979 calendar never turned, a stopped clock, a framed print of a sailboat gone orange, a corkboard of memos, the thermostat, a store map ----
  {
    const rw = z1 - 0.008, cal = sheet(pic((ctx, tw, th) => {
      ctx.fillStyle = "#e9e0c6"; ctx.fillRect(0, 0, tw, th); ctx.fillStyle = "#b5602a"; ctx.fillRect(10, 10, tw - 20, th * 0.42); ctx.fillStyle = "#e5b65c"; ctx.beginPath(); ctx.arc(tw * 0.7, th * 0.22, 26, 0, 7); ctx.fill(); ctx.fillStyle = "#5c3512"; ctx.beginPath(); ctx.moveTo(10, th * 0.44); ctx.lineTo(tw * 0.35, th * 0.2); ctx.lineTo(tw * 0.6, th * 0.44); ctx.fill();
      ctx.fillStyle = "#3a2410"; ctx.textAlign = "center"; ctx.font = "bold 27px Georgia, serif"; ctx.fillText("AUGUST 1979", tw / 2, th * 0.53); ctx.font = "14px Arial"; ctx.fillText("Ed's Tire & Muffler · Since 1952", tw / 2, th * 0.96);
      ctx.font = "16px Arial"; for (let i = 0; i < 31; i++) ctx.fillText(String(i + 1), 28 + ((i + 3) % 7) * 34, th * 0.62 + Math.floor((i + 3) / 7) * 32);
    }, 256, 340), 0.3, 0.4, 8.75, 1.52, rw, Math.PI); cal.rotation.z = 0.02;
    bx(0.48, 0.36, 0.016, lam(0x7d6f50), 9.65, 1.62, rw); sheet(pic((ctx, tw, th) => {
      const sky = ctx.createLinearGradient(0, 0, 0, th); sky.addColorStop(0, "#c98a3f"); sky.addColorStop(0.6, "#e0b071"); sky.addColorStop(0.61, "#6b5a3f"); sky.addColorStop(1, "#3e3424"); ctx.fillStyle = sky; ctx.fillRect(0, 0, tw, th);
      ctx.fillStyle = "#e7d5ad"; ctx.beginPath(); ctx.moveTo(tw * 0.47, th * 0.14); ctx.lineTo(tw * 0.47, th * 0.56); ctx.lineTo(tw * 0.68, th * 0.56); ctx.fill(); ctx.beginPath(); ctx.moveTo(tw * 0.44, th * 0.22); ctx.lineTo(tw * 0.44, th * 0.56); ctx.lineTo(tw * 0.3, th * 0.56); ctx.fill(); ctx.fillStyle = "#3c2412"; ctx.fillRect(tw * 0.3, th * 0.57, tw * 0.4, th * 0.04);
    }, 256, 192), 0.42, 0.3, 9.65, 1.62, rw - 0.012, Math.PI);
    // the stopped clock: a wooden starburst, stopped at some long-ago quarter past four
    const clk = grp(7.15, 2.0, rw, Math.PI); put(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 20), lam(0x3e2412), 0, 0, 0.012, 0, clk).rotation.x = Math.PI / 2;
    for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283, r = bx(0.012, 0.09, 0.012, lam(0xb9942f), Math.sin(a) * 0.17, Math.cos(a) * 0.17, 0.01, clk); r.rotation.z = -a; }
    put(new THREE.CircleGeometry(0.1, 22), lam(0xe0d6ba), 0, 0, 0.028, 0, clk); bx(0.01, 0.06, 0.002, lam(0x1a1a1a), 0.018, 0.022, 0.03, clk).rotation.z = -1.1; bx(0.007, 0.085, 0.002, lam(0x1a1a1a), 0.03, 0.03, 0.031, clk).rotation.z = -0.8;
    // on the east wall over the security desk, memos on a corkboard. West wall: the store's floor plan, faded, and the thermostat
    const cb = grp(x0 + 0.008, 1.6, 33.5, Math.PI / 2); bx(0.84, 0.6, 0.012, lam(0x7c5a32), 0, 0, 0.004, cb); sheet(pic((ctx, tw, th) => {
      ctx.fillStyle = "#e7dcc0"; ctx.fillRect(0, 0, tw, th); ctx.strokeStyle = "#3a4f7c"; ctx.lineWidth = 3; ctx.strokeRect(24, 40, tw - 48, th - 70); ctx.fillStyle = "#3a4f7c"; ctx.font = "bold 22px Arial"; ctx.textAlign = "center"; ctx.fillText("FLOOR PLAN - REVISED 1981", tw / 2, 28); ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) ctx.strokeRect(70 + i * 62, 80, 34, th - 170); ctx.fillStyle = "#c33"; for (const [x, y] of [[0.9, 0.2], [0.1, 0.4], [0.9, 0.82], [0.5, 0.9], [0.2, 0.2], [0.1, 0.9], [0.6, 0.12]]) { ctx.beginPath(); ctx.arc(tw * x, th * y, 8, 0, 7); ctx.fill(); }   // the cameras, in red pen
    }, 512, 340), 0.78, 0.54, 0, 0, 0.012, 0, cb);
    const therm = grp(x0 + 0.008, 1.42, 34.35, Math.PI / 2); cyl(0.058, 0.058, 0.03, phong(0xc9bc97, 50), 0, 0, 0.015, 20, therm).rotation.x = Math.PI / 2; cyl(0.04, 0.04, 0.005, lam(0x7c6f50), 0, 0, 0.032, 18, therm).rotation.x = Math.PI / 2;
    bx(0.09, 0.005, 0.003, lam(0xa9221f), 0, 0, 0.036, therm).rotation.z = 0.6;
  }

  // ---- the security desk, on the east wall: a steel shelf unit, four CRTs on the cameras, the spot monitor, the switcher, a time-lapse VCR ----
  {
    const SX = x1 - 0.31, SZ = 33.55, SL = 1.62, shelfM = phong(0x6c6a60, 30), S = officeFx.sec;
    bx(0.56, 0.03, SL, phong(0x8e8a78, 22, 0x333333), x1 - 0.28, 0.74, SZ);                          // the bench
    for (const sz of [-1, 1]) { bx(0.5, 0.74, 0.03, shelfM, x1 - 0.28, 0.37, SZ + sz * (SL / 2 - 0.02)); bx(0.03, 2.05, 0.03, shelfM, x1 - 0.04, 1.02, SZ + sz * (SL / 2 - 0.02)); }
    bx(0.42, 0.02, SL - 0.02, shelfM, x1 - 0.24, 1.38, SZ); bx(0.42, 0.02, SL - 0.02, shelfM, x1 - 0.24, 1.72, SZ);   // two shelves of monitors, on their uprights
    colliders.push({ x0: x1 - 0.56, x1, z0: SZ - SL / 2, z1: SZ + SL / 2, y1: 0.74 });
    // the screens: each shows its camera's picture through a scanline shader, in the room's own light level (they're lit, not lit by)
    const feedMat = (map, label) => new THREE.ShaderMaterial({
      uniforms: { uMap: { value: map }, uLabel: { value: label }, uOn: { value: 1 }, uT: { value: 0 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `varying vec2 vUv; uniform sampler2D uMap, uLabel; uniform float uOn, uT;
        void main() {
          vec2 q = vUv - 0.5; q *= 1.0 + 0.09 * dot(q, q); vec2 uv = q + 0.5;             // the tube's bulge
          float roll = fract(uT * 0.09), bar = smoothstep(0.0, 0.05, abs(uv.y - roll));   // the bar that rolls slowly down a cheap set
          vec3 c = texture2D(uMap, uv + vec2(0.002 * sin(uv.y * 150.0 + uT * 9.0), 0.0)).rgb;
          float L = dot(c, vec3(0.3, 0.59, 0.11));
          L = pow(max(L, 0.0), 1.05) * 0.5 + 0.015;                                         // (a tired set: no real whites or blacks)
          float scan = 0.92 + 0.08 * sin(uv.y * 240.0 * 3.14159);
          float n = fract(sin(dot(uv * 91.0 + uT, vec2(12.9898, 78.233))) * 43758.5);
          vec4 lb = texture2D(uLabel, uv);
          L = (L * scan * (0.9 + 0.1 * bar) + (n - 0.5) * 0.025) * (1.0 - 0.45 * dot(q, q) * 2.0);
          L = mix(L, 1.1, lb.a);
          vec3 tube = vec3(0.86, 1.0, 0.92) * max(L, 0.0) * 0.82;
          gl_FragColor = vec4(mix(vec3(0.012, 0.016, 0.014), tube + 0.008, uOn), 1.0);
        }`,
    });
    const crtM = phong(0x24262a, 26), crtFace = phong(0x34373b, 30);
    const crt = (gx, gy, gz, w, h, d, map, label, ry = Math.PI / 2) => {       // a boxy little monitor facing the room, its body back toward the wall; -> its picture's material
      const g = grp(gx, gy, gz, ry);
      bx(w, h, d, crtM, 0, 0, d / 2, g); bx(w - 0.04, h - 0.05, 0.03, crtM, 0, 0, d + 0.012, g);
      bx(w, h, 0.012, crtFace, 0, 0, -0.002, g);
      const m = feedMat(map, label); glow(put(new THREE.PlaneGeometry(w * 0.82, h * 0.78), m, 0, 0.005, -0.012, Math.PI, g));
      return m;
    };
    const domeGlass = new THREE.MeshPhongMaterial({ color: 0x1a1a1e, specular: 0x666666, shininess: 60, transparent: true, opacity: 0.85 }), domeBase = lam(0xe8e8e8);
    SEC_CAMS.forEach((cam, i) => {
      const rt = new THREE.WebGLRenderTarget(SEC_W, SEC_H, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
      const camera3 = new THREE.PerspectiveCamera(66, SEC_W / SEC_H, 0.05, 60), lookAt = new THREE.Vector3(...cam.look), from = new THREE.Vector3(...cam.at);
      camera3.position.copy(from).addScaledVector(lookAt.clone().sub(from).normalize(), 0.24); camera3.lookAt(lookAt); camera3.updateMatrixWorld();   // (just past its own lens)
      camera3.layers.enable(EXTERIOR_LAYER);          // (the same layers as the main camera: the lot through the glass, and its lights counted the same, or every lit shader's compiled over again for this camera)
      const canvas2 = document.createElement("canvas"); canvas2.width = SEC_W; canvas2.height = SEC_H;
      const lab = new THREE.CanvasTexture(canvas2); lab.minFilter = THREE.LinearFilter; lab.generateMipmaps = false;
      S.cams.push({ ...cam, i, rt, camera: camera3, canvas: canvas2, lab, mins: -1 });
      S.cams[i].mat = i < 4 ? crt(x1 - 0.42, 1.535, SZ - 0.51 + i * 0.34, 0.31, 0.29, 0.3, rt.texture, lab) : crt(x1 - 0.42, 1.875, SZ - 0.34 + (i - 4) * 0.34, 0.31, 0.29, 0.3, rt.texture, lab);
      // the camera itself, out in the store: a smoked dome in the ceiling, a red tally light on its trim ring when it's up on the spot monitor
      const C = cam.ceil;
      cyl(0.1, 0.1, 0.03, domeBase, from.x, C - 0.016, from.z, 16);
      put(new THREE.SphereGeometry(0.08, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), domeGlass, from.x, C - 0.03, from.z);
      S.cams[i].tally = new THREE.MeshBasicMaterial({ color: 0x301010 });
      const tx = from.x + Math.sign(lookAt.x - from.x || 1) * 0.088; glow(put(new THREE.SphereGeometry(0.008, 8, 6), S.cams[i].tally, tx, C - 0.034, from.z));
    });
    const spotLab = document.createElement("canvas"); spotLab.width = SEC_W; spotLab.height = SEC_H;
    S.spotLabel = { canvas: spotLab, tex: new THREE.CanvasTexture(spotLab), key: "" }; S.spotLabel.tex.minFilter = THREE.LinearFilter; S.spotLabel.tex.generateMipmaps = false;
    bx(0.4, 0.09, 0.44, shelfM, x1 - 0.2, 0.8, SZ + 0.03);                                            // a riser, to lift it over the switcher
    S.spot_m = crt(x1 - 0.38, 1.05, SZ + 0.03, 0.5, 0.42, 0.34, S.cams[0].rt.texture, S.spotLabel.tex);   // the big one, on the bench, in the middle
    // the time-lapse VCR on the bench, its counter glowing
    {
      const v = grp(x1 - 0.3, 0.755, SZ - 0.54, Math.PI / 2); bx(0.36, 0.09, 0.27, blackP, 0, 0.045, 0.12, v); bx(0.2, 0.024, 0.004, lam(0x070707), -0.05, 0.06, -0.016, v);
      const c = makeTexture((ctx, tw, th) => { ctx.fillStyle = "#031006"; ctx.fillRect(0, 0, tw, th); ctx.fillStyle = "#59ff8a"; ctx.font = "bold 28px monospace"; ctx.textAlign = "center"; ctx.fillText("T-120 · REC", tw / 2, th * 0.72); }, 192, 40);
      glow(sheet(new THREE.MeshBasicMaterial({ map: c }), 0.09, 0.02, 0.1, 0.06, -0.018, Math.PI, v));
      S.recLed = new THREE.MeshBasicMaterial({ color: 0xff2020 }); glow(bx(0.009, 0.009, 0.003, S.recLed, -0.15, 0.03, -0.017, v));
      const tray = bx(0.2, 0.09, 0.14, lam(0x1b1e24), 0, 0.14, 0.13, v); for (let k = 0; k < 2; k++) bx(0.19, 0.025, 0.11, lam(0x302f2b), 0, 0.2 + k * 0.028, 0.12, v);   // tapes stacked on top
    }
    // the switcher: a steel console on the bench in front of the spot monitor, a row of square push buttons: 1 2 3 4, SEQ, POWER
    {
      const sw = grp(x1 - 0.47, 0.815, SZ + 0.03, Math.PI / 2), tilt = grp(0, 0, 0, 0, sw), face = phong(0x3b3d41, 24); tilt.rotation.x = 1.2;   // (its top leaning back toward the wall)
      bx(0.72, 0.17, 0.03, face, 0, 0, 0.016, tilt); bx(0.7, 0.06, 0.15, face, 0, -0.03, 0.02, sw);
      const label = makeTexture((ctx, tw, th) => {
        ctx.fillStyle = "#30343a"; ctx.fillRect(0, 0, tw, th); ctx.fillStyle = "#d6d6c9"; ctx.font = "bold 22px Arial"; ctx.textAlign = "center"; ctx.fillText("VIDEO SWITCHER  VS-4", tw / 2, 26);
        ctx.font = "bold 14px Arial"; ["1 DOOR", "2 AISLE", "3 LOUNGE", "4 HALL", "5 REG", "6 CONC", "7 THTR", "SEQ", "POWER"].forEach((t, i) => ctx.fillText(t, tw * (i + 0.5) / 9, th - 12));
      }, 768, 148);
      sheet(new THREE.MeshLambertMaterial({ map: label }), 0.7, 0.135, 0, 0, -0.002, Math.PI, tilt);
      const nc = SEC_CAMS.length;
      for (let i = 0; i < nc + 2; i++) {
        const lit = new THREE.MeshBasicMaterial({ color: 0x180808 }), kind = i < nc ? i : i === nc ? "seq" : "power", dx = 0.7 * (0.5 - (i + 0.5) / (nc + 2));   // (reading left to right, as you stand at it, each over its label)
        const b = bx(0.058, 0.045, 0.018, new THREE.MeshPhongMaterial({ color: i < nc ? 0xc8c5b8 : i === nc ? 0xc99a1f : 0xaa2222, specular: 0x777777, shininess: 40 }), dx, 0.002, -0.011, tilt);
        glow(bx(0.012, 0.01, 0.004, lit, dx, 0.044, -0.004, tilt));
        const pad = bx(0.074, 0.1, 0.05, new THREE.MeshBasicMaterial({ visible: false }), dx, 0.005, -0.01, tilt);
        const entry = { kind, led: lit, btn: b, z: b.position.z, press: 0 }; S.btns.push(entry);
        for (const o of [b, pad]) { o.userData.secBtn = entry; aimables.push(o); }
      }
    }
  }
}
// ---- the blinds and the switcher working ----
function blindsPose(b) {                          // the slats, tilted k (0 shut: nearly on edge .. 1 open: flat)
  const m = blindsPose.m ||= new THREE.Matrix4(), e = blindsPose.e ||= new THREE.Euler(), q = blindsPose.q ||= new THREE.Quaternion(), P = blindsPose.P ||= new THREE.Vector3(), S = blindsPose.S ||= new THREE.Vector3(1, 1, 1);
  const a = (1 - b.k) * 1.46;
  for (let i = 0; i < b.n; i++) {
    const bent = i === b.bent ? 0.35 : 0;
    q.setFromEuler(e.set(a + bent, 0, bent * 0.1)); P.set(0, b.slatY(i), 0); m.compose(P, q, S); b.inst.setMatrixAt(i, m);
  }
  b.inst.instanceMatrix.needsUpdate = true;
  b.wand.rotation.z = (b.k - 0.5) * 0.12;
}
function blindsToggle(b) { b.open = !b.open; switchSnap(b.open); }
function secTip(btn) {
  const S = officeFx.sec;
  if (btn.kind === "power") return `E — turn the monitors ${S.power ? "off" : "on"}`;
  if (!S.power) return "The monitors are off";
  if (btn.kind === "seq") return `E — ${S.seq ? "stop cycling" : "cycle"} the spot monitor through the cameras`;
  return `E — put camera ${btn.kind + 1} up on the spot monitor<div class="cat">${SEC_CAMS[btn.kind].name}</div>`;
}
function secPress(btn) {
  const S = officeFx.sec; btn.press = 0.16; switchSnap(true);
  if (btn.kind === "power") S.power = !S.power;
  else if (!S.power) return;
  else if (btn.kind === "seq") { S.seq = !S.seq; S.seqT = 0; }
  else { S.spot = btn.kind; S.seq = false; }
}
const officeSave = () => ({ blinds: officeFx.blinds.map(b => b.open), spot: officeFx.sec.spot, seq: officeFx.sec.seq, power: officeFx.sec.power });
function officeLoad(s) {
  if (!s) return;
  officeFx.blinds.forEach((b, i) => { b.open = !!s.blinds?.[i]; b.k = +b.open; blindsPose(b); });
  Object.assign(officeFx.sec, { spot: s.spot ?? 0, seq: !!s.seq, power: s.power !== false });
}
function officeDrawLabel(canvas, tex, top, clock, rec) {
  const c = canvas.getContext("2d"); c.clearRect(0, 0, canvas.width, canvas.height);
  c.font = "bold 15px monospace"; c.textBaseline = "top"; c.fillStyle = "#fff"; c.strokeStyle = "rgba(0,0,0,0.8)"; c.lineWidth = 3;
  const t = (s, x, y, a = "left") => { c.textAlign = a; c.strokeText(s, x, y); c.fillText(s, x, y); };
  t(top, 12, 12); t(clock, canvas.width - 12, canvas.height - 26, "right"); if (rec) t("REC", canvas.width - 12, 12, "right");
  tex.needsUpdate = true;
}
const secClock = () => { const h = Math.floor(shift.h), m = Math.floor((shift.h % 1) * 60); return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`; };
function officeTick(dt) {
  for (const b of officeFx.blinds) {
    const want = +b.open; if (b.k === want) continue;
    b.k = Math.abs(want - b.k) < 0.01 ? want : b.k + (want - b.k) * Math.min(1, dt * 7); blindsPose(b);
  }
  officeFx.shutter.visible = !officeFx.blinds.some(b => b.k > 0.03);
  const S = officeFx.sec, t = performance.now() / 1000;
  if (S.seq && S.power && (S.seqT += dt) > 5) { S.seqT = 0; S.spot = (S.spot + 1) % SEC_CAMS.length; }
  for (const b of S.btns) {                       // the buttons push in, the live one's lamp is lit
    b.press = Math.max(0, b.press - dt); b.btn.position.z = b.z + (b.press > 0 ? 0.007 : 0);
    const on = !S.power ? b.kind === "power" ? 0x301008 : 0x080808 : b.kind === "power" ? 0x35ff4a : b.kind === "seq" ? (S.seq ? 0xffb020 : 0x201505) : b.kind === S.spot ? 0xff3a2a : 0x180808;
    b.led.color.setHex(on);
  }
  if (!roomGroups.office.visible) return;         // nobody's looking: the rest is just the picture
  const clock = secClock(), on = S.power ? 1 : 0;
  S.recLed.color.setHex(on && Math.floor(t * 1.4) % 2 ? 0xff2020 : 0x301010);
  for (const c of S.cams) {
    c.mat.uniforms.uT.value = t + c.i * 2.1; c.mat.uniforms.uOn.value = on; c.tally.color.setHex(on && S.spot === c.i ? 0xff2020 : 0x301010);
    if (c.mins !== clock) { c.mins = clock; officeDrawLabel(c.canvas, c.lab, `CAM ${c.i + 1} ${c.name}`, clock, false); }
  }
  const sm = S.spot_m, cam = S.cams[S.spot], key = `${S.spot}|${clock}|${S.seq}`;
  sm.uniforms.uMap.value = cam.rt.texture; sm.uniforms.uT.value = t; sm.uniforms.uOn.value = on;
  if (S.spotLabel.key !== key) { S.spotLabel.key = key; officeDrawLabel(S.spotLabel.canvas, S.spotLabel.tex, `CAM ${S.spot + 1} ${cam.name}${S.seq ? " SEQ" : ""}`, clock, true); }
  const ac = officeFx.amber; if (ac) {            // the computer's amber screen: a green-bar report nobody finished, its cursor blinking
    const blink = Math.floor(t * 1.8) % 2 === 0; if (ac.on !== blink) { ac.on = blink;
      const c = ac.ctx, w = ac.canvas.width, h = ac.canvas.height; c.fillStyle = "#120900"; c.fillRect(0, 0, w, h); c.fillStyle = "#ffae2a"; c.font = "13px monospace"; c.textAlign = "left";
      ["VISICALC-II  STORE.DAT  A:", "", "   WEEK   RENTALS    LATE", "    31      2,140    $188", "    32      2,288    $204", "    33      2,071    $176", "    34      ####     ####", "", "*** DISK FULL ***", "", "A>"].forEach((l, i) => c.fillText(l, 12, 20 + i * 15));
      if (blink) c.fillRect(32, 20 + 10 * 15 - 11, 9, 13);
      ac.tex.needsUpdate = true; }
  }
}
// One camera's picture five times a second between them (the spot's camera gets two turns in the round), and only while the
// monitors are on screen: one look at the store is thousands of draws, and a cheap time-lapse rig is choppy anyway
const SEC_EVERY = 200, secRack = new THREE.Box3(new THREE.Vector3(STORE.x - 0.7, 0.7, 32.7), new THREE.Vector3(STORE.x - 0.1, 2.05, 34.4));
function secFeedRender(c) {
  const S = officeFx.sec, was = ROOMS.map(r => roomGroups[r].visible), booth = BOOTH.g.visible, r0 = roof.g.visible;
  for (const r of ROOMS) roomGroups[r].visible = c.rooms.includes(r);
  BOOTH.g.visible = false; roof.g.visible = false;
  renderer.setRenderTarget(c.rt); renderer.render(scene, c.camera); renderer.setRenderTarget(null);
  ROOMS.forEach((r, i) => { roomGroups[r].visible = was[i]; }); BOOTH.g.visible = booth; roof.g.visible = r0;
  S.drawn = (S.drawn || 0) + 1;
}
function secFeedsTick() {
  const S = officeFx.sec, now = performance.now();
  if (!S.power || !roomGroups.office.visible || player.onRoof || now - (S.at || 0) < SEC_EVERY || !roomFrustum.intersectsBox(secRack)) return;
  if (roomAt(camera.position.x, camera.position.z) !== "office" && Math.abs(officeFx.door.a) < 0.01 && !officeFx.blinds.some(b => b.k > 0.03)) return;   // (out in the break room, the door and the blinds shut: no view of them)
  S.at = now; S.next = (S.next + 1) % (S.cams.length + 1);    // the last slot in the round: the spot's camera again
  secFeedRender(S.cams[S.next === S.cams.length ? S.spot : S.next]);
}
