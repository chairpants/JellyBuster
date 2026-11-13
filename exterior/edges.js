// ---- the edges of the world out front (EDGE, store/core.js): what's standing where you can't go any further. West, the county's road yard behind
// chain-link: gravel, rows of stored jersey barriers, salt and stone piles, barrels, pipe, a shed. East and across the road it's woods (exterior/trees.js),
// and along the road's far side the power line runs on out of sight both ways with the road. Nothing here is in the way of anything: EDGE.off stops you ----
// Called from buildGrounds (exterior/grounds.js).

// a bin of plain coloured parts, merged into one mesh (one draw): boxes, cylinders, pipes between two points, any geometry at a place
function outdoorKit() {
  const geos = [], M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(0, 0, 0, "YXZ"), P = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1), c = new THREE.Color(), UP = new THREE.Vector3(0, 1, 0), D = new THREE.Vector3();
  let base = null;                                 // (a frame everything's placed in: see K.at)
  const bake = (geo, color, m) => {
    const g = geo.index ? geo.toNonIndexed() : geo; g.applyMatrix4(m); if (base) g.applyMatrix4(base);
    for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k);
    c.set(color); const n = g.attributes.position.count, col = new Float32Array(n * 3); for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(col, 3)); geos.push(g); return g;
  };
  const K = {
    add: (geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => bake(geo, color, M.compose(P.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S)),
    box: (color, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => K.add(new THREE.BoxGeometry(w, h, d), color, x, y, z, rx, ry, rz),
    cyl: (color, rt, rb, h, x, y, z, seg = 10, rx = 0, ry = 0, rz = 0) => K.add(new THREE.CylinderGeometry(rt, rb, h, seg), color, x, y, z, rx, ry, rz),
    pipe: (color, a, b, r, seg = 6) => {            // a round bar from a to b ([x, y, z] each)
      D.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const L = D.length(); if (L < 1e-5) return;
      return bake(new THREE.CylinderGeometry(r, r, L, seg, 1, true), color, M.compose(P.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), Q.setFromUnitVectors(UP, D.normalize()), S));
    },
    at: (x, y, z, ry, fn) => { const was = base; base = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1)); if (was) base.premultiply(was); fn(); base = was; },
    mesh: (opts = {}) => { const m = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshLambertMaterial({ vertexColors: true, ...opts })); geos.length = 0; return m; },
  };
  return K;
}

function buildEdges({ lam, ext }) {
  const g = new THREE.Group(); scene.add(g);
  const K = outdoorKit(), R = seeded(7741), FX = EDGE.W - 0.35, FZ = EDGE.front + 0.35, BACKX = -58.6, FRONT = SERVICE_ROAD.FRONT;
  const galv = 0x9aa0a3, galvD = 0x7f8588;

  // ---- the yard's fence: 1.85 m of chain-link on galvanised posts, a top rail, three strands of wire leaning out over it. Down the lot's side, along the road, and back up to the stockade ----
  { const H = 1.85, runs = [[FX, FRONT - 0.05, FX, FZ], [FX, FZ, BACKX, FZ], [BACKX, FZ, BACKX, FRONT - 0.05]];
    const tex = makeTexture((ctx, W, Ht) => { ctx.clearRect(0, 0, W, Ht); ctx.strokeStyle = "#c3c8cb"; ctx.lineWidth = 2.6; ctx.lineCap = "square";
      const n = 4, s = W / n; for (let i = -n; i <= n * 2; i++) { ctx.beginPath(); ctx.moveTo(i * s, 0); ctx.lineTo(i * s + W, Ht); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i * s, 0); ctx.lineTo(i * s - W, Ht); ctx.stroke(); } }, 128, 128);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    const meshM = new THREE.MeshLambertMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
    for (const [ax, az, bx, bz] of runs) {
      const L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L, ry = Math.atan2(-uz, ux);
      const pg = new THREE.PlaneGeometry(L, H - 0.06); { const uv = pg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * L / 0.42, uv.getY(i) * (H - 0.06) / 0.42); }
      const m = new THREE.Mesh(pg, meshM); m.position.set((ax + bx) / 2, (H - 0.06) / 2 + 0.05, (az + bz) / 2); m.rotation.y = ry; m.renderOrder = 2; g.add(m);
      K.pipe(galv, [ax, H, az], [bx, H, bz], 0.021); K.pipe(galvD, [ax, 0.07, az], [bx, 0.07, bz], 0.006, 4);   // top rail, the tension wire along the bottom
      const n = Math.max(1, Math.round(L / 3.05));
      for (let i = 0; i <= n; i++) { const x = ax + ux * L * i / n, z = az + uz * L * i / n, end = i === 0 || i === n, lean = (R() - 0.5) * 0.02;
        K.cyl(galv, end ? 0.038 : 0.028, end ? 0.038 : 0.028, H + 0.06, x, (H + 0.06) / 2, z, 8, lean, 0, lean); K.cyl(galvD, 0.045, 0.03, 0.03, x, H + 0.075, z, 8);
        const ox = -uz * 0.2, oz = ux * 0.2, out = ax === FX && bx === FX ? 1 : bz === FZ && az === FZ ? 1 : -1;   // the arm for the wire, leaning out toward whoever's outside
        K.pipe(galv, [x, H + 0.05, z], [x + ox * out, H + 0.36, z + oz * out], 0.012, 5); }
      for (let k = 0; k < 3; k++) { const f = (k + 1) / 3, out = bz === FZ && az === FZ || ax === FX && bx === FX ? 1 : -1, ox = -uz * 0.2 * f * out, oz = ux * 0.2 * f * out;
        K.pipe(0x6d6f70, [ax + ox, H + 0.05 + 0.31 * f, az + oz], [bx + ox, H + 0.05 + 0.31 * f, bz + oz], 0.004, 4); }
    }
    // its signs: the county's own, and what everybody hangs on a fence like this
    const sign = (text, w, h, x, y, z, ry, o) => { const s = weatheredSign(text, w, h, o); s.position.set(x, y, z); s.rotation.y = ry; g.add(s);
      const b = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lam(0x7d8184)); b.position.set(x - Math.sin(ry) * 0.012, y, z - Math.cos(ry) * 0.012); b.rotation.y = ry + Math.PI; g.add(b); };
    sign("COUNTY ROADS\nYARD 4", 1.5, 0.75, FX + 0.03, 1.3, -6.2, Math.PI / 2, { fg: "#e8e6da", bg: "#2c5a3c", seed: 12, bent: 0.012 });
    sign("NO TRESPASSING", 0.9, 0.3, FX + 0.03, 1.35, -10.4, Math.PI / 2, { seed: 44, bent: 0.02 });
    sign("NO TRESPASSING", 0.9, 0.3, FX + 0.03, 1.35, -2.4, Math.PI / 2, { seed: 45, bent: 0.006 });
    sign("KEEP OUT", 0.7, 0.3, -36.5, 1.35, FZ - 0.03, Math.PI, { seed: 46, bent: 0.02 });
    sign("COUNTY ROADS\nYARD 4", 1.5, 0.75, -43, 1.3, FZ - 0.03, Math.PI, { fg: "#e8e6da", bg: "#2c5a3c", seed: 13, bent: 0.02 });
  }

  // ---- the yard: crushed stone over everything, and what the road crew keeps on it ----
  { const stone = groundFx(lam(0x8b8880), "stone"), gr = new THREE.Mesh(new THREE.PlaneGeometry(FX - BACKX, FRONT - FZ), stone); gr.rotation.x = -Math.PI / 2; gr.position.set((FX + BACKX) / 2, 0.006, (FRONT + FZ) / 2); g.add(gr);
    WX_GROUND.push({ m: stone, dry: new THREE.Color(0x8b8880), wet: new THREE.Color(0x5f5d58), snow: 1 });
    const J = SERVICE_ROAD.jersey;                 // barriers, stored: two rows nose to tail, a few more stood on top, one left askew where the loader dropped it
    if (J) { const at = []; for (const [x, n] of [[-34.2, 4], [-35.1, 4], [-36.0, 3]]) for (let k = 0; k < n; k++) at.push([x + (R() - 0.5) * 0.06, 0.004, -10.6 + k * (J.BL + 0.08), (R() - 0.5) * 0.03]);
      at.push([-34.65, 0.815, -10.5, 0.02], [-34.65, 0.815, -7.8, -0.03], [-35.5, 0.815, -9.2, 0.04], [-38.4, 0.004, -4.6, 0.7], [-39.6, 0.004, -8.4, Math.PI / 2 + 0.1]);
      const bars = new THREE.InstancedMesh(J.geo, J.mat, at.length), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E3 = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1), c = new THREE.Color();
      at.forEach(([x, y, z, ry], i) => { bars.setMatrixAt(i, M.compose(V.set(x, y, z), Q.setFromEuler(E3.set(0, ry, 0)), S)); bars.setColorAt(i, c.setScalar(0.74 + R() * 0.26)); });
      bars.instanceMatrix.needsUpdate = true; bars.instanceColor.needsUpdate = true; g.add(bars); }
    // the piles: stone, sand, and the salt under its tarp
    const pile = (color, x, z, r, h, seg = 11) => { const geo = new THREE.ConeGeometry(r, h, seg, 3), p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = 1 - (y + h / 2) / h; p.setXYZ(i, p.getX(i) * (1 + (R() - 0.5) * 0.16 * k) , y - (1 - k) * (1 - k) * h * 0.14 + (R() - 0.5) * 0.05 * k, p.getZ(i) * (1 + (R() - 0.5) * 0.16 * k)); }
      geo.computeVertexNormals(); K.add(geo, color, x, h / 2, z, 0, R() * 6); };
    pile(0x85837c, -46.5, -4.6, 3.3, 2.1); pile(0x7b7972, -44.2, -2.6, 1.9, 1.2); pile(0xb9a779, -52.2, -7.6, 3.0, 1.9); pile(0x3d5f8f, -51.5, -2.2, 2.4, 1.6, 7);
    for (const [x, z] of [[-53.2, -1.2], [-49.9, -1.0], [-50.2, -3.6], [-52.9, -3.7]]) K.cyl(0x2b2b2b, 0.2, 0.2, 0.14, x, 0.2, z, 10, Math.PI / 2, R() * 3);   // tyres holding the tarp down
    // barrels for the next job, a few cones, a run of concrete pipe
    for (let i = 0; i < 9; i++) { const x = -41.2 - (i % 3) * 0.72 + (R() - 0.5) * 0.12, z = -11.3 + Math.floor(i / 3) * 0.72 + (R() - 0.5) * 0.12;
      K.cyl(0xe2701c, 0.24, 0.3, 0.98, x, 0.49, z, 12); K.cyl(0xeeeae0, 0.262, 0.277, 0.1, x, 0.72, z, 12); K.cyl(0xeeeae0, 0.279, 0.292, 0.1, x, 0.42, z, 12); K.cyl(0x1c1c1c, 0.33, 0.35, 0.07, x, 0.035, z, 12); }
    for (const [x, z] of [[-39.4, -11.4], [-39.1, -10.9], [-39.7, -10.7], [-33.2, -2.2], [-33.5, -1.8]]) { K.cyl(0xe8661a, 0.03, 0.14, 0.62, x, 0.34, z, 10); K.box(0xe8661a, 0.36, 0.03, 0.36, x, 0.02, z); K.cyl(0xf0ece0, 0.062, 0.092, 0.12, x, 0.42, z, 10); }
    { const pg = new THREE.CylinderGeometry(0.46, 0.46, 2.4, 14, 1, true); for (const [dx, y] of [[0, 0.46], [0.94, 0.46], [1.88, 0.46], [0.47, 1.26], [1.41, 1.26]]) { K.add(pg.clone(), 0xa5a39b, -48.5 + dx, y, -10.6, Math.PI / 2, 0.02); K.add(new THREE.CylinderGeometry(0.4, 0.4, 2.38, 14, 1, true).scale(-1, 1, 1), 0x4d4c48, -48.5 + dx, y, -10.6, Math.PI / 2, 0.02); }
      K.box(0x6b5334, 0.1, 0.1, 2.4, -48.9, 0.05, -10.6, 0, Math.PI / 2); }
    // the shed at the back: block walls, a tin roof, a roller door that's always down
    K.at(-54.6, 0, -4.4, 0, () => { K.box(0xb7b3a6, 5.2, 3.0, 6.4, 0, 1.5, 0); K.box(0x6e7a80, 5.6, 0.12, 6.9, 0, 3.12, 0, 0, 0, 0.05); K.box(0x56626a, 0.05, 2.5, 3.2, 2.62, 1.25, 0.6);
      for (let k = 0; k < 9; k++) K.box(0x48535a, 0.07, 0.03, 3.2, 2.63, 0.3 + k * 0.27, 0.6); K.box(0x3c4a3e, 0.05, 2.0, 0.85, 2.62, 1.0, -2.3); });
    K.cyl(0x6a4a2a, 0.11, 0.13, 6.5, -57.4, 3.25, -11.2, 8); K.box(0x6f7378, 0.5, 0.16, 0.24, -57.05, 6.3, -11.2);   // the yard light on its pole
  }

  // ---- the power line along the far side of the road, pole to pole till it's out of sight ----
  { const PZ = EDGE.far - 0.25, GAP = 34, wood = 0x4f3d2c, xs = []; for (let x = -180; x <= 187; x += GAP) xs.push(x);
    xs.forEach((x, i) => { const lean = (R() - 0.5) * 0.03;
      K.cyl(wood, 0.1, 0.15, 8.6, x, 4.3, PZ, 8, lean, 0, lean * 0.6); K.box(wood, 0.11, 0.11, 2.2, x, 7.9, PZ); K.box(wood, 0.09, 0.09, 1.3, x, 7.2, PZ);
      for (const dz of [-1.0, -0.45, 0.45, 1.0]) K.cyl(0x8fa3a0, 0.035, 0.045, 0.14, x, 8.02, PZ + dz, 6);
      if (i % 3 === 1) K.cyl(0x7c8084, 0.2, 0.2, 0.62, x + 0.3, 6.6, PZ, 10);                                          // a transformer can, every third pole
      if (EDGE.inside(x, PZ)) colliders.push({ x0: x - 0.16, x1: x + 0.16, z0: PZ - 0.16, z1: PZ + 0.16 });
      if (i) { const x0 = xs[i - 1], N = 6; for (const [dz, y, sag] of [[-1.0, 8.09, 0.55], [-0.45, 8.09, 0.5], [0.45, 8.09, 0.6], [1.0, 8.09, 0.52], [0.55, 7.25, 0.75]])
        for (let k = 0; k < N; k++) { const f0 = k / N, f1 = (k + 1) / N, yy = f => y - sag * 4 * f * (1 - f); K.pipe(0x1a1a1c, [x0 + (x - x0) * f0, yy(f0), PZ + dz], [x0 + (x - x0) * f1, yy(f1), PZ + dz], dz === 0.55 ? 0.014 : 0.008, 3); } }
    });
  }
  g.add(K.mesh());
  ext(g);
}
