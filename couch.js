// Vintage ornate three-seater parlor sofa (orange upholstery, black piping /
// fascia / carved apron / cabriole legs), built procedurally.
// Classic script: THREE and mergeGeometries are only touched when buildCouch()
// runs (from store.js), by which point index.html has put them on window.
//
// buildCouch() -> THREE.Group, origin at the floor under the sofa's center,
// front facing +z. Two merged meshes (orange body, black trim) so it stays
// cheap. group.userData.sign = { y, z, tilt } is where a sign can hang on the
// back; group.userData.footprint = { w, d } for a collider.
window.buildCouch = function buildCouch() {
  const V2 = THREE.Vector2, V3 = THREE.Vector3;
  const orange = [], black = [];
  const add = (list, geo, m) => {                 // bake a transform, normalize attributes for merging
    if (m) geo.applyMatrix4(m);
    if (geo.index) geo = geo.toNonIndexed();
    if (m && m.determinant() < 0) {               // mirrored: flip triangle winding back to front-facing
      for (const k of ["position", "normal", "uv"]) {
        const a = geo.attributes[k]; if (!a) continue;
        for (let i = 0; i < a.count; i += 3) for (let c = 0; c < a.itemSize; c++) {
          const t = a.array[(i + 1) * a.itemSize + c];
          a.array[(i + 1) * a.itemSize + c] = a.array[(i + 2) * a.itemSize + c]; a.array[(i + 2) * a.itemSize + c] = t;
        }
      }
    }
    for (const k of Object.keys(geo.attributes)) if (!["position", "normal", "uv"].includes(k)) geo.deleteAttribute(k);
    geo.clearGroups(); list.push(geo);
  };
  const T = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
  const M = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(
    new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new V3(sx, sy, sz));
  const PIPE = 0.009;                             // piping radius
  const pipe = (pts, closed = false, segs = 48) => add(black,
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed, "catmullrom", 0.1), segs, PIPE, 5, closed));

  // ---- key dimensions (meters) ----
  const IN = 0.90;           // inner face of each arm (seat spans -IN..IN)
  const OUT = 1.12;          // outer edge of arm  -> overall width 2.24
  const ZF = 0.40, ZB = -0.46;   // front of deck / back of frame
  const BOW = 0.03;          // center section bows forward
  const APRON_TOP = 0.215, DECK_TOP = 0.335, SEAT_TOP = 0.45;
  const segX = [-IN, -IN / 3, IN / 3, IN];       // three seat / back sections

  // ---- rounded-rect helper (outline points in a plane) ----
  function rrect(w, h, r, n = 4) {
    const pts = [], cs = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, Math.PI / 2],
                          [-w / 2 + r, -h / 2 + r, Math.PI], [w / 2 - r, -h / 2 + r, Math.PI * 1.5]];
    for (const [cx, cy, a0] of cs) for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * Math.PI / 2; pts.push(new V2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
    }
    return pts;
  }

  // ---- lower deck: three boxed blocks with piped front faces ----
  for (let i = 0; i < 3; i++) {
    const x0 = segX[i] + 0.004, x1 = segX[i + 1] - 0.004, w = x1 - x0, cx = (x0 + x1) / 2;
    const zf = ZF + (i === 1 ? BOW : 0), h = DECK_TOP - APRON_TOP, d = zf - (ZB + 0.05);
    add(orange, new THREE.BoxGeometry(w, h, d), T(cx, APRON_TOP + h / 2, zf - d / 2));
    const y0 = APRON_TOP + 0.008, y1 = DECK_TOP - 0.004, z = zf + 0.002;
    pipe([new V3(x0, y0, z), new V3(x1, y0, z), new V3(x1, y1, z), new V3(x0, y1, z)].flatMap((p, k, a) => {
      const q = a[(k + 1) % 4]; return [p, p.clone().lerp(q, 0.02), p.clone().lerp(q, 0.98)];
    }), true, 64);
  }

  // ---- seat cushions: three rounded boxed cushions, piped around the top ----
  {
    const cw = IN * 2 / 3 - 0.012, cd = 0.60, depth = 0.075, bev = 0.022;
    const shape = new THREE.Shape(rrect(cw - 2 * bev, cd - 2 * bev, 0.04));
    for (let i = 0; i < 3; i++) {
      const cx = (segX[i] + segX[i + 1]) / 2, zc = ZF + (i === 1 ? BOW : 0) - cd / 2 + 0.01;
      const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bev,
        bevelSize: bev, bevelSegments: 3, curveSegments: 4 });
      // shape lies in XY, extrude along +z -> rotate so extrusion goes up (+y)
      add(orange, g, M(cx, DECK_TOP + bev, zc, -Math.PI / 2));
      const top = DECK_TOP + bev + depth + bev * 0.35;
      pipe(rrect(cw - 0.01, cd - 0.01, 0.05).map(p => new V3(cx + p.x, top, zc - p.y)), true, 72);
    }
  }

  // ---- backrest: three convex camelback segments with black seam piping ----
  const BACK_Z = ZB + 0.04, BACK_T = 0.12, BB = 0.045;       // rear face z, core thickness, bevel
  const BACK_TILT = -0.10;                                   // top leans back a little
  const crest = x => {                                       // top edge height at x (tri-crested)
    const ax = Math.abs(x);
    if (ax <= IN / 3) return 0.905 - 0.10 * (ax / (IN / 3)) ** 2;       // tall rounded center arch
    const t = (ax - IN / 3) / (IN - IN / 3);                              // 0 inner -> 1 outer
    return 0.80 + 0.035 * Math.sin(Math.PI * Math.min(1, t * 1.25)) - 0.13 * t * t;
  };
  const backGroup = [];                                      // geometries that get the tilt
  const backBase = SEAT_TOP - 0.10;
  for (let i = 0; i < 3; i++) {
    const x0 = (i === 0 ? -IN - 0.03 : segX[i]) + 0.012 + BB, x1 = (i === 2 ? IN + 0.03 : segX[i + 1]) - 0.012 - BB;
    const s = new THREE.Shape();
    s.moveTo(x0, backBase); s.lineTo(x1, backBase);
    const N = 16;
    for (let k = 0; k <= N; k++) { const x = x1 + (x0 - x1) * k / N; s.lineTo(x, crest(x) - BB); }
    s.lineTo(x0, backBase);
    const g = new THREE.ExtrudeGeometry(s, { depth: BACK_T, bevelEnabled: true, bevelThickness: BB,
      bevelSize: BB, bevelSegments: 4, curveSegments: 6 });
    g.translate(0, 0, BACK_Z + BB);
    backGroup.push(["o", g]);
  }
  // piping: vertical seams between segments + a line tracing each crest on the front face
  const zFrontBack = BACK_Z + BB + BACK_T + BB * 0.55;
  for (const sx of [-IN / 3, IN / 3]) {
    const pts = []; for (let k = 0; k <= 8; k++) { const y = SEAT_TOP - 0.02 + (crest(sx) - 0.02 - SEAT_TOP + 0.02) * k / 8; pts.push(new V3(sx, y, zFrontBack + 0.01)); }
    backGroup.push(["b", new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, PIPE * 1.3, 6)]);
  }
  for (let i = 0; i < 3; i++) {
    const x0 = (i === 0 ? -IN : segX[i]) + 0.03, x1 = (i === 2 ? IN : segX[i + 1]) - 0.03, pts = [];
    for (let k = 0; k <= 16; k++) { const x = x0 + (x1 - x0) * k / 16; pts.push(new V3(x, crest(x) - 0.012, BACK_Z + 2 * BB + BACK_T - 0.012)); }   // along the front edge of the crest
    backGroup.push(["b", new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, PIPE, 5)]);
  }
  const tilt = new THREE.Matrix4().makeTranslation(0, backBase, BACK_Z)
    .multiply(new THREE.Matrix4().makeRotationX(BACK_TILT)).multiply(new THREE.Matrix4().makeTranslation(0, -backBase, -BACK_Z));
  for (const [c, g] of backGroup) add(c === "o" ? orange : black, g, tilt);

  // ---- rolled arms: profile (front view) extruded front-to-back ----
  // local u: 0 at the arm's inner face, + outward. Scrolls out and down at the top.
  const armTop = 0.635, AZ0 = ZB + 0.02, AZ1 = ZF + 0.02;
  function armProfile(extraBottom = 0, grow = 0) {
    const s = new THREE.Shape(), g = grow;
    s.moveTo(-g, APRON_TOP - extraBottom);
    s.lineTo(-g, 0.50);
    s.bezierCurveTo(-g, 0.56, -0.02 - g, armTop + g, 0.07, armTop + g);          // flare out over the top
    s.bezierCurveTo(0.17, armTop + g, 0.225 + g, 0.60, 0.215 + g, 0.54);      // roll over
    s.bezierCurveTo(0.205 + g, 0.49, 0.15 - g, 0.49, 0.155 - g, 0.53);        // curl back in under the roll
    s.bezierCurveTo(0.16, 0.50, 0.19 + g, 0.47, 0.19 + g, 0.40);              // tuck, then outer side
    if (extraBottom) {                                                         // S-curve down into the leg
      s.bezierCurveTo(0.19 + g, 0.30, 0.10, 0.28, 0.13 + g, APRON_TOP - extraBottom + 0.03);
      s.lineTo(0.13 + g, APRON_TOP - extraBottom);
    } else s.lineTo(0.19, APRON_TOP);
    s.lineTo(-g, APRON_TOP - extraBottom);
    return s;
  }
  for (const side of [-1, 1]) {
    const flip = side < 0 ? new THREE.Matrix4().makeScale(-1, 1, 1) : new THREE.Matrix4();
    const body = new THREE.ExtrudeGeometry(armProfile(), { depth: AZ1 - AZ0 - 0.04, bevelEnabled: true,
      bevelThickness: 0.02, bevelSize: 0.012, bevelSegments: 3, curveSegments: 10 });
    add(orange, body, flip.clone().multiply(T(IN - 0.005, 0, AZ0 + 0.02)));
    // black front fascia: slightly larger S-profile plate flowing down to the leg
    const fas = new THREE.ExtrudeGeometry(armProfile(0.09, 0.012), { depth: 0.03, bevelEnabled: true,
      bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 2, curveSegments: 10 });
    add(black, fas, flip.clone().multiply(T(IN - 0.005, 0, AZ1 + 0.005)));
    // carved scroll rosette on the fascia's curl
    add(black, new THREE.TorusGeometry(0.03, 0.009, 6, 16), flip.clone().multiply(T(IN + 0.185, 0.555, AZ1 + 0.048)));
    add(black, new THREE.SphereGeometry(0.018, 10, 6), flip.clone().multiply(M(IN + 0.185, 0.555, AZ1 + 0.045, 0, 0, 0, 1, 1, 0.6)));
    // seam piping along the top of the roll, front to back
    pipe([new V3(side * (IN + 0.07), armTop + 0.012, AZ1 + 0.005), new V3(side * (IN + 0.07), armTop + 0.012, AZ0)], false, 4);
  }

  // ---- carved black apron: scalloped bottom edge + raised scroll bumps ----
  function apronShape(w, pendant) {
    const s = new THREE.Shape(), top = APRON_TOP + 0.005, base = 0.10;
    s.moveTo(-w / 2, top); s.lineTo(w / 2, top); s.lineTo(w / 2, base);
    const N = 120;
    for (let k = 1; k <= N; k++) {
      const x = w / 2 - w * k / N, u = Math.abs(x) / (w / 2);
      let y = base + 0.028 * (1 - Math.abs(Math.sin(x * Math.PI / 0.14)) ** 0.6);   // repeating scallops
      if (pendant) y -= 0.035 * Math.max(0, 1 - Math.abs(x) / 0.18) ** 1.5;        // center drop pendant
      y -= 0.012 * (u > 0.9 ? (u - 0.9) / 0.1 : 0);                                 // run into the corner legs
      s.lineTo(x, y);
    }
    return s;
  }
  const apronOpts = { depth: 0.03, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.005, bevelSegments: 1, curveSegments: 4 };
  const frontW = 2 * OUT - 0.04;
  add(black, new THREE.ExtrudeGeometry(apronShape(frontW, true), apronOpts), T(0, 0, ZF - 0.02));
  // center bow: a short raised panel on the middle section
  add(black, new THREE.ExtrudeGeometry(apronShape(IN * 2 / 3, true), { ...apronOpts, depth: 0.02 }), T(0, 0.004, ZF + 0.012));
  const sideD = ZF - ZB - 0.02;
  for (const side of [-1, 1])
    add(black, new THREE.ExtrudeGeometry(apronShape(sideD, false), apronOpts),
      M(side * (OUT - 0.035), 0, (ZF + ZB) / 2, 0, side * Math.PI / 2, 0));
  add(black, new THREE.BoxGeometry(2 * OUT - 0.08, 0.10, 0.03), T(0, 0.165, ZB + 0.02));   // plain back rail
  // raised scroll/leaf bumps along the front apron
  const bump = new THREE.SphereGeometry(1, 8, 6);
  for (const x of [-0.84, -0.56, -0.2, 0.2, 0.56, 0.84]) {
    add(black, bump.clone(), M(x, 0.165, ZF + 0.03, 0, 0, 0.5 * Math.sign(x), 0.05, 0.022, 0.012));
    add(black, new THREE.TorusGeometry(0.016, 0.005, 5, 12, Math.PI * 1.4), M(x + Math.sign(x) * 0.055, 0.16, ZF + 0.028, 0, 0, 0));
  }
  add(black, new THREE.TorusGeometry(0.03, 0.007, 6, 16), T(0, 0.15, ZF + 0.058));        // center cartouche
  add(black, bump.clone(), M(0, 0.15, ZF + 0.052, 0, 0, 0, 0.018, 0.018, 0.01));

  // ---- cabriole legs: bulging knee tapering to a pad foot ----
  const legProf = [[0, 0], [0.024, 0.002], [0.028, 0.012], [0.017, 0.028], [0.019, 0.055],
                   [0.03, 0.09], [0.036, 0.11], [0.034, 0.125], [0, 0.125]].map(([r, y]) => new V2(r, y));
  const legGeo = new THREE.LatheGeometry(legProf, 10);
  {
    const p = legGeo.attributes.position;                                 // knee kicks out, foot tucks in
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, p.getZ(i) + 0.018 * Math.sin(Math.PI * y / 0.125) - 0.006); }
    legGeo.computeVertexNormals();
  }
  const legSpots = [[-OUT + 0.06, ZF - 0.01, 1], [OUT - 0.06, ZF - 0.01, 1],       // front corners
                    [-IN / 3, ZF + BOW - 0.01, 1], [IN / 3, ZF + BOW - 0.01, 1],    // central supports
                    [-OUT + 0.06, ZB + 0.05, -1], [OUT - 0.06, ZB + 0.05, -1]];     // back corners
  for (const [x, z, f] of legSpots) add(black, legGeo.clone(), M(x, 0, z, 0, f > 0 ? 0 : Math.PI, 0));

  // ---- assemble ----
  const group = new THREE.Group();
  const mk = (list, color) => {
    const m = new THREE.Mesh(mergeGeometries(list, false), new THREE.MeshLambertMaterial({ color }));
    m.userData.sit = true; group.add(m); return m;
  };
  mk(orange, 0xe8621c);
  mk(black, 0x121212);
  // sign spot: centered on the backrest's rear face, following its tilt
  const signY = 0.60, rearZ = BACK_Z - 0.006 + (signY - backBase) * Math.sin(BACK_TILT);
  group.userData.sign = { y: signY, z: rearZ, tilt: BACK_TILT };
  group.userData.footprint = { w: 2 * OUT, d: ZF + BOW + 0.06 - ZB };
  group.userData.zRange = [ZB, ZF + BOW + 0.06];
  return group;
};
