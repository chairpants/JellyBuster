// ---------------- the roof's kit: stamped hardware ----------------
// Everything the roof's made of that repeats: a box, a strap, a coupling, a block. Each stamp lays its parts into bins, one a
// material, in whatever frame it's standing in (at / frame), and flush() makes one mesh a bin: however much hardware's up
// there, it's a handful of draws. Nothing stamped can move or be aimed at; what does (fan blades, the turbine) stays its own mesh.
function roofKit() {
  const bins = new Map(), mats = new Map(), stack = [new THREE.Matrix4()];
  const tmpM = new THREE.Matrix4(), tmpE = new THREE.Euler(), tmpQ = new THREE.Quaternion(), tmpP = new THREE.Vector3(), tmpS = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  const tpl = new Map(), proto = (key, make) => { if (!tpl.has(key)) tpl.set(key, make()); return tpl.get(key).clone(); };   // a shape's made once, stamped from there
  const lay = (geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    tmpM.compose(tmpP.set(x, y, z), tmpQ.setFromEuler(tmpE.set(rx, ry, rz, "YXZ")), tmpS.set(sx, sy, sz)).premultiply(stack.at(-1));
    const g = geo.index ? geo.toNonIndexed() : geo; g.applyMatrix4(tmpM);
    if (!bins.has(m)) bins.set(m, []); bins.get(m).push(g);
  };
  const K = {
    // materials, shared by color, so like goes with like
    lam: c => { const k = `l${c}`; if (!mats.has(k)) mats.set(k, new THREE.MeshLambertMaterial({ color: c })); return mats.get(k); },
    met: (c, s = 50) => { const k = `p${c}:${s}`; if (!mats.has(k)) mats.set(k, new THREE.MeshPhongMaterial({ color: c, specular: 0x666666, shininess: s })); return mats.get(k); },
    at(x, y, z, ry, fn) { tmpM.makeRotationY(ry).setPosition(x, y, z); stack.push(stack.at(-1).clone().multiply(tmpM)); fn(); stack.pop(); },
    frame(matrix, fn) { stack.push(stack.at(-1).clone().multiply(matrix)); fn(); stack.pop(); },
    box: (m, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) => lay(proto("box", () => new THREE.BoxGeometry(1, 1, 1)), m, x, y, z, rx, ry, rz, w, h, d),
    cyl: (m, rt, rb, h, x, y, z, seg = 10, rx = 0, rz = 0, open = false) => { const R = Math.max(rt, rb) || 1; lay(proto(`c${(rt / R).toFixed(3)}:${(rb / R).toFixed(3)}:${seg}:${open}`, () => new THREE.CylinderGeometry(rt / R, rb / R, 1, seg, 1, open)), m, x, y, z, rx, 0, rz, R, h, R); },
    rod(m, r, a, b, seg = 8) {                     // a to b, [x, y, z] each
      const A = new THREE.Vector3(...a), d = new THREE.Vector3(...b).sub(A), L = d.length(); if (L < 1e-5) return;
      const g = proto(`r${seg}`, () => new THREE.CylinderGeometry(1, 1, 1, seg)); tmpQ.setFromUnitVectors(UP, d.clone().normalize());
      tmpM.compose(tmpP.copy(A).addScaledVector(d, 0.5), tmpQ, tmpS.set(r, L, r)).premultiply(stack.at(-1));
      const n = g.toNonIndexed(); n.applyMatrix4(tmpM); if (!bins.has(m)) bins.set(m, []); bins.get(m).push(n);
    },
    ring: (m, R, r, x, y, z, rx = Math.PI / 2, ry = 0, seg = 28, sy = 1) => lay(proto(`t${(r / R).toFixed(3)}:${seg}`, () => new THREE.TorusGeometry(1, r / R, 6, seg)), m, x, y, z, rx, ry, 0, R, R * sy, R),
    tube: (m, r, pts, seg = 10, rad = 5) => lay(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), seg, r, rad), m),
    lathe: (m, pts, x, y, z, seg = 16, sx = 1, sy = 1, sz = 1, ry = 0) => lay(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg), m, x, y, z, 0, ry, 0, sx, sy, sz),
    plane: (m, w, h, x, y, z, ry = 0, rx = 0) => lay(new THREE.PlaneGeometry(w, h), m, x, y, z, rx, ry),
    flush(parent) { for (const [m, geos] of bins) { const o = new THREE.Mesh(mergeGeometries(geos), m); parent.add(o); } bins.clear(); },
  };
  const galv = K.met(0xa9aeb3, 40), alum = K.met(0xd3d6da, 70), steel = K.met(0x7e858c, 35), iron = K.lam(0x2c2d2e), rubber = K.lam(0x26282a), rust = K.lam(0x6a3f24), conc = K.lam(0x96938b);
  K.mats = { galv, alum, steel, iron, rubber, rust, conc };

  // ---- fastenings ----
  K.bolt = (x, y, z, r = 0.009, m = galv) => K.cyl(m, r, r, 0.008, x, y, z, 6);                                   // a hex head, standing up
  K.screws = (x0, x1, y0, y1, z, nx, ny, m = galv) => {                                                           // a row round a panel, looking +z
    for (let i = 0; i < nx; i++) for (const y of [y0, y1]) K.cyl(m, 0.006, 0.006, 0.004, x0 + (x1 - x0) * (nx > 1 ? i / (nx - 1) : 0.5), y, z, 6, Math.PI / 2);
    for (let j = 1; j < ny - 1; j++) for (const x of [x0, x1]) K.cyl(m, 0.006, 0.006, 0.004, x, y0 + (y1 - y0) * j / (ny - 1), z, 6, Math.PI / 2);
  };
  // ---- electrical ----
  K.jbox = (x, y, z, ry, w = 0.14, h = 0.14, d = 0.06) => K.at(x, y, z, ry, () => {                               // a weatherproof box: cast body, gasketed cover, four screws, a hub underneath
    K.box(steel, w, h, d, 0, 0, 0); K.box(galv, w + 0.012, h + 0.012, 0.008, 0, 0, d / 2 + 0.004);
    K.screws(-w / 2 + 0.012, w / 2 - 0.012, -h / 2 + 0.012, h / 2 - 0.012, d / 2 + 0.009, 2, 2);
    K.cyl(galv, 0.018, 0.018, 0.03, 0, -h / 2 - 0.015, 0, 8);
  });
  K.disconnect = (x, y, z, ry) => K.at(x, y, z, ry, () => {                                                       // a fused disconnect: grey can, hinged door, a big lever at its side, the warning sticker
    K.box(K.lam(0x7e858c), 0.26, 0.36, 0.12, 0, 0, 0); K.box(K.lam(0x8b9298), 0.27, 0.37, 0.012, 0, 0, 0.066); K.box(K.lam(0x6c7278), 0.3, 0.02, 0.13, 0, 0.19, 0.005);   // can, door, rain lip
    K.screws(-0.115, 0.115, -0.165, 0.165, 0.074, 2, 2);
    for (const y of [-0.12, 0.12]) K.box(galv, 0.016, 0.04, 0.012, -0.135, y, 0.066);                             // door hinges
    K.box(galv, 0.012, 0.09, 0.04, 0.142, 0.05, 0.02); K.box(K.lam(0xb3211d), 0.02, 0.1, 0.03, 0.162, 0.095, 0.02, 0, 0, -0.5);   // the lever, red
    K.box(K.lam(0xe3b52a), 0.11, 0.06, 0.002, -0.03, 0.09, 0.073); K.box(iron, 0.09, 0.012, 0.002, -0.03, 0.09, 0.0745);   // the sticker
    K.cyl(galv, 0.02, 0.02, 0.03, 0, -0.195, 0, 8);
  });
  K.strut = (x, y0, y1, z, ry = 0) => K.at(x, 0, z, ry, () => {                                                   // a length of strut channel stood up: C section, slotted, on a base plate
    K.box(galv, 0.04, y1 - y0, 0.02, 0, (y0 + y1) / 2, -0.01); for (const s of [-1, 1]) K.box(galv, 0.005, y1 - y0, 0.04, s * 0.02, (y0 + y1) / 2, 0);
    for (let y = y0 + 0.08; y < y1 - 0.04; y += 0.1) K.box(iron, 0.012, 0.035, 0.001, 0, y, 0.0005);
    K.box(galv, 0.14, 0.008, 0.14, 0, y0 + 0.004, 0); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.bolt(a * 0.052, y0 + 0.012, b * 0.052);
  });
  K.lb = (x, y, z, ry = 0) => K.at(x, y, z, ry, () => {                                                           // a conduit body at a bend: the cast "LB", its cover, two screws
    K.box(steel, 0.05, 0.12, 0.05, 0, 0, 0); K.box(galv, 0.056, 0.1, 0.006, 0, 0, 0.028);
    for (const s of [-1, 1]) K.cyl(galv, 0.005, 0.005, 0.003, 0, s * 0.04, 0.032, 6, Math.PI / 2);
  });
  K.support = (x, y, z, h, ry = 0) => K.at(x, y, z, ry, () => {                                                   // a pipe support: a recycled-rubber foot on the gravel, a strut crosspiece, a strap over the pipe
    K.box(rubber, 0.16, 0.05, 0.24, 0, 0.025, 0); K.box(galv, 0.025, h - 0.05, 0.03, 0, 0.05 + (h - 0.05) / 2, 0);
    K.box(galv, 0.05, 0.012, 0.14, 0, h, 0); K.bolt(0, h + 0.008, -0.05); K.bolt(0, h + 0.008, 0.05);
  });
  // a run of EMT or pipe, by its corners, flat runs carried on supports at their spacing, a coupling every length (3 m), an elbow's sleeve at each corner
  K.conduit = (pts, { r = 0.018, m = galv, couple = 3, spacing = 1.6, base = null, joint = null } = {}) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = new THREE.Vector3(...pts[i]), b = new THREE.Vector3(...pts[i + 1]), L = a.distanceTo(b); K.rod(m, r, pts[i], pts[i + 1]);
      if (couple) for (let d = couple; d < L; d += couple) { const p = a.clone().lerp(b, d / L), q = b.clone().sub(a).normalize().multiplyScalar(0.03); K.rod(m, r * 1.35, [p.x - q.x, p.y - q.y, p.z - q.z], [p.x + q.x, p.y + q.y, p.z + q.z]); }
      if (base != null && Math.abs(a.y - b.y) < 0.02) { const n = Math.floor(L / spacing), ry = Math.atan2(b.z - a.z, a.x - b.x) + Math.PI / 2; for (let k = 1; k <= n; k++) { const p = a.clone().lerp(b, k / (n + 1)); K.support(p.x, base, p.z, p.y - r - base, ry); } }
      if (i && i < pts.length) { const c = new THREE.Vector3(...pts[i]); K.cyl(joint || m, r * 1.4, r * 1.4, r * 2.8, c.x, c.y, c.z, 8); }
    }
  };
  // ---- the deck ----
  K.boot = (x, y, z, r0, r1, h) => { K.cyl(K.lam(0x4d4f50), r0, r0, 0.008, x, y + 0.004, z, 14); K.cyl(rubber, r1, r0 * 0.72, h, x, y + 0.008 + h / 2, z, 14); K.ring(galv, r1 + 0.002, 0.004, x, y + 0.008 + h - 0.005, z); };   // flashing: a flange, a cone, a clamp
  K.stack = (x, y, z) => {                                                                                        // a plumbing vent, its boot, open at the top
    K.boot(x, y, z, 0.2, 0.06, 0.16); K.cyl(K.lam(0x8e9092), 0.05, 0.05, 0.52, x, y + 0.26, z, 12, 0, 0, true); K.ring(K.lam(0x77797b), 0.05, 0.005, x, y + 0.52, z);
    K.cyl(K.lam(0x121212), 0.046, 0.046, 0.004, x, y + 0.49, z, 12);
  };
  K.pitchPocket = (x, y, z, r = 0.018) => {                                                                       // where a pipe goes through: a sheet-metal pan, black sealant mounded in it
    K.box(galv, 0.34, 0.012, 0.34, x, y + 0.006, z); for (const [dx, dz, w, d] of [[0, -1, 0.26, 0.008], [0, 1, 0.26, 0.008], [-1, 0, 0.008, 0.26], [1, 0, 0.008, 0.26]]) K.box(galv, w, 0.09, d, x + dx * 0.13, y + 0.05, z + dz * 0.13);
    K.lathe(K.lam(0x1c1c1c), [[0.126, 0], [0.124, 0.065], [0.06, 0.082], [r + 0.002, 0.095]], x, y + 0.012, z, 14);
  };
  K.drain = (x, y, z) => {                                                                                        // a roof drain: a cast flange with its clamp bolts, a dark sump, a cage strainer of iron ribs
    K.cyl(rust, 0.27, 0.285, 0.014, x, y + 0.007, z, 20); K.ring(K.lam(0x4a3522), 0.205, 0.012, x, y + 0.016, z, Math.PI / 2, 0, 28);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; K.bolt(x + Math.cos(a) * 0.24, y + 0.018, z + Math.sin(a) * 0.24, 0.012, K.lam(0x3a2c20)); }
    K.cyl(K.lam(0x0c0c0c), 0.17, 0.17, 0.003, x, y + 0.016, z, 20);
    const top = y + 0.15, bot = y + 0.018;
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); K.rod(iron, 0.0065, [x + c * 0.175, bot, z + s * 0.175], [x + c * 0.075, top, z + s * 0.075], 5); }
    K.ring(iron, 0.175, 0.009, x, bot + 0.004, z, Math.PI / 2, 0, 24); K.ring(iron, 0.125, 0.006, x, y + 0.085, z, Math.PI / 2, 0, 24); K.cyl(iron, 0.078, 0.082, 0.014, x, top + 0.004, z, 14);
    for (const [dx, dz] of [[0.32, 0.08], [-0.3, 0.18], [0.1, -0.33]]) K.cyl(K.lam(0x5f5247), 0.03, 0.04, 0.02, x + dx, y + 0.01, z + dz, 7);   // silt and a few leaves' worth of muck, caught round it
  };
  K.cinder = (x, y, z, ry = 0) => K.at(x, y, z, ry, () => {                                                       // a cinder block: 40 x 20 x 20, two square holes through it, seen as one
    const m = K.lam(0x8a8880), W = 0.39, H = 0.19, D = 0.19, t = 0.032;
    for (const s of [-1, 1]) { K.box(m, W, H, t, 0, H / 2, s * (D / 2 - t / 2)); K.box(m, t, H, D - 2 * t, s * (W / 2 - t / 2), H / 2, 0); }
    K.box(m, t, H, D - 2 * t, 0, H / 2, 0); for (const s of [-1, 1]) K.box(K.lam(0x2f2e2a), W / 2 - t * 1.5, 0.004, D - 2 * t, s * (W / 4), 0.03, 0);   // the web, the holes' dark floors
  });
  K.tape = (x, y, z, ry = 0, rx = 0, rz = 0, label = 0xefeee6) => {                                               // a VHS tape: black shell, a paper label down its spine and on its face
    K.box(K.lam(0x151517), 0.187, 0.025, 0.103, x, y, z, ry, rx, rz);
    const c = Math.cos(ry), s = Math.sin(ry); K.box(K.lam(label), 0.14, 0.018, 0.002, x + s * 0.052, y, z + c * 0.052, ry, rx, rz);
  };
  K.binder = (x, y, z) => {                                                                                       // a binder clip, its two wire handles folded up
    K.box(K.lam(0x101010), 0.032, 0.03, 0.022, x, y, z); K.box(K.lam(0x202020), 0.032, 0.006, 0.026, x, y + 0.014, z);
    for (const s of [-1, 1]) K.rod(alum, 0.0014, [x - 0.01, y + 0.015, z + s * 0.012], [x, y + 0.04, z + s * 0.006], 4), K.rod(alum, 0.0014, [x + 0.01, y + 0.015, z + s * 0.012], [x, y + 0.04, z + s * 0.006], 4);
  };
  K.ductTape = (x, y, z, r, turns = 4, h = 0.05, tail = true) => {                                                 // duct tape wound round a pole: a few turns, not quite square, a torn tail hanging
    const m = K.met(0xb9bcc0, 40);
    for (let i = 0; i < turns; i++) K.cyl(m, r + 0.0015 + i * 0.0006, r + 0.0015 + i * 0.0006, h, x, y + (i - turns / 2) * h * 0.55, z, 10, (i % 2 ? 1 : -1) * 0.14, (i % 3 - 1) * 0.1, true);
    if (tail) K.box(m, 0.04, 0.09, 0.0015, x + r + 0.002, y - h * turns * 0.3 - 0.04, z, 0.3, 0.12, 0.08);
  };
  return K;
}
