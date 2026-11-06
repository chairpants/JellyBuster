// ---------------- potted plants ----------------
// buildFig: the weeping fig from VaultBusterGodot (tools/remodel.gd: _ficus, _pot), by the TV: three trunks braided
// round each other, a dozen branches, 520 small leaves hanging every way, in a flared terracotta pot on its saucer,
// lumpy soil and a few pebbles (all merged into one mesh). buildDracaena: a Dracaena marginata, the dragon tree every lobby had: a few bare canes,
// curving, ringed with old leaf scars, each topped with a starburst of long thin leaves edged in red. Each comes back
// as one group at the scene's root (room culling files it by where it stands)

// The fig is all one mesh, one material (vertex colours): built as ~40 parts it put hitches in the frame rate
const plantColor = (geo, color) => {               // a geometry ready to merge: one colour throughout (or keep its own), no uvs
  geo.deleteAttribute("uv");
  if (color != null) { const c = new THREE.Color(color), n = geo.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) c.toArray(a, i * 3); geo.setAttribute("color", new THREE.BufferAttribute(a, 3)); }
  return geo;
};
function plantLathe(profile, colors, segs = 28) {    // a lathe whose profile points each carry a colour: pot and saucer, shaded down their height
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segs);
  const n = profile.length, col = new Float32Array(g.attributes.position.count * 3), c = new THREE.Color();
  for (let i = 0; i <= segs; i++) for (let j = 0; j < n; j++) c.set(colors[j]).toArray(col, (i * n + j) * 3);
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return plantColor(g);
}
const plantRod = (a, b, r, color) => {             // a round stick from a to b
  const d = new THREE.Vector3().subVectors(b, a), g = new THREE.CylinderGeometry(r * 0.85, r, d.length(), 6, 1, true);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
  return plantColor(g, color);
};

function buildFig(x, z) {
  const geos = [];
  const clay = "#9a5232", bloom = "#c4ab92", wet = "#6a3823", lip = "#a65c3a";
  const mix = (a, b, k) => "#" + new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString(), dark = (a, k) => "#" + new THREE.Color(a).multiplyScalar(1 - k).getHexString();
  // the saucer, its rim turned up; the pot: foot, flaring body, the rolled band and lip, and down its inner wall under the soil
  geos.push(plantLathe([[0, 0.002], [0.19, 0.002], [0.212, 0.008], [0.226, 0.03], [0.22, 0.034], [0.208, 0.014], [0, 0.014]], [wet, wet, clay, lip, lip, clay, wet], 20));
  const y0 = 0.014;
  geos.push(plantLathe([[0, y0], [0.158, y0], [0.168, y0 + 0.008], [0.172, y0 + 0.03], [0.168, y0 + 0.036],
    [0.172, 0.06], [0.196, 0.24], [0.214, 0.37], [0.218, 0.385],
    [0.232, 0.39], [0.239, 0.4], [0.24, 0.45], [0.236, 0.462], [0.226, 0.468], [0.214, 0.466], [0.207, 0.455],
    [0.2, 0.42], [0.19, 0.36]],
    [wet, wet, wet, wet, wet, mix(wet, clay, 0.7), clay, mix(bloom, clay, 0.45), mix(bloom, clay, 0.3), clay, lip, lip, lip, lip, lip, clay, dark(clay, 0.25), dark(clay, 0.4)]));
  const rng = seeded(8), rr = (a, b) => a + (b - a) * rng();
  // the soil: a lumpy disc, darker and lighter by turns; pebbles on it, clear of the trunks
  { const RINGS = 6, SEGS = 28, pos = [0, 0.413, 0], col = [], c = new THREE.Color(), idx = [];
    c.set("#2e2219").toArray(col, 0);
    for (let r = 0; r < RINGS; r++) for (let s = 0; s < SEGS; s++) {
      const a = (s + (r % 2) * 0.5) * Math.PI * 2 / SEGS, rad = 0.205 * (r + 1) / RINGS;
      pos.push(Math.cos(a) * rad, 0.41 + 0.004 * (1 - (r + 1) / RINGS) + rr(-0.003, 0.003) * (r < RINGS - 1 ? 1 : 0.3), Math.sin(a) * rad);
      c.set("#2b2018").lerp(new THREE.Color("#4a3626"), rng() * 0.6); col.push(c.r, c.g, c.b);
    }
    const at = (r, s) => r < 0 ? 0 : 1 + r * SEGS + ((s % SEGS) + SEGS) % SEGS;
    for (let s = 0; s < SEGS; s++) idx.push(0, at(0, s + 1), at(0, s));
    for (let r = 0; r < RINGS - 1; r++) for (let s = 0; s < SEGS; s++) { const o = r % 2; idx.push(at(r, s), at(r + 1, s + o), at(r + 1, s - 1 + o), at(r, s), at(r, s + 1), at(r + 1, s + o)); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    geos.push(geo);
    const o = new THREE.Object3D();
    for (let laid = 0; laid < 16;) {
      const px = rr(-0.19, 0.19), pz = rr(-0.19, 0.19), L = Math.hypot(px, pz); if (L > 0.19 || L < 0.07) continue;
      const sz = rr(0.008, 0.016); o.position.set(px, 0.411 + sz * 0.25, pz); o.rotation.set(0, rng() * Math.PI * 2, 0); o.scale.set(sz, sz * 0.55, sz * rr(0.7, 1)); o.updateMatrix();
      geos.push(plantColor(new THREE.SphereGeometry(1, 6, 3).applyMatrix4(o.matrix), 0x8d8779)); laid++;
    }
  }
  // three trunks twisting round each other, each with four branches up and out
  const bark = 0x6b5640, base = new THREE.Vector3(0, 0.41, 0), tips = [];
  for (let k = 0; k < 3; k++) {
    let prev = base.clone().add(new THREE.Vector3(Math.cos(k * Math.PI * 2 / 3), 0, Math.sin(k * Math.PI * 2 / 3)).multiplyScalar(0.02));
    for (let s = 0; s < 6; s++) {
      const t = (s + 1) / 6, a = k * Math.PI * 2 / 3 + t * 3, p = base.clone().add(new THREE.Vector3(Math.cos(a) * 0.025 + t * 0.04, t * 0.95, Math.sin(a) * 0.025));
      geos.push(plantRod(prev, p, 0.011 * (1 - t * 0.4), bark)); prev = p;
    }
    for (let b = 0; b < 4; b++) {
      const from = base.clone().add(new THREE.Vector3(0.04, rr(0.6, 0.95), 0)), h = rng() * Math.PI * 2;
      const to = from.clone().add(new THREE.Vector3(Math.cos(h), 0, Math.sin(h)).multiplyScalar(rr(0.18, 0.32))).add(new THREE.Vector3(0, rr(0.15, 0.4), 0));
      geos.push(plantRod(from, to, 0.005, bark)); tips.push(to);
    }
  }
  // the leaves: little flattened ellipsoids round the branch tips, pointing out from the trunk more or less, most
  // drooping, some hanging straight down, some tipped up, rolled about their midribs (two greens)
  const leaf = new THREE.SphereGeometry(1, 5, 2).scale(0.034, 0.005, 0.06); leaf.computeVertexNormals();
  const greens = [plantColor(leaf.clone(), 0x2f5a2a), plantColor(leaf.clone(), 0x3f7234)];
  const ax = { y: new THREE.Vector3(0, 1, 0), x: new THREE.Vector3(1, 0, 0), z: new THREE.Vector3(0, 0, 1) }, rot = (v, a) => new THREE.Matrix4().makeRotationAxis(v, a);
  for (let i = 0; i < 520; i++) {
    const tip = tips[i % tips.length], at = tip.clone().add(new THREE.Vector3(rr(-0.26, 0.26), rr(-0.2, 0.16), rr(-0.26, 0.26))), away = at.clone().sub(base);
    const heading = Math.atan2(away.x, away.z) + rr(-1.1, 1.1), pick = rng();
    const droop = pick < 0.3 ? rr(1.0, 1.45) : pick < 0.45 ? rr(-0.35, 0.3) : rr(0.3, 1.0), roll = rr(-1, 1), twist = rr(-0.4, 0.4);
    const R = rot(ax.y, heading).multiply(rot(ax.x, droop)).multiply(rot(ax.z, roll)).multiply(rot(ax.y, twist)).setPosition(at);
    geos.push(greens[i % 2].clone().applyMatrix4(R));
  }
  const mesh = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  geos.forEach(g => g.dispose());
  mesh.position.set(x, 0, z); scene.add(mesh);
  colliders.push({ x0: x - 0.25, x1: x + 0.25, z0: z - 0.25, z1: z + 0.25, y1: 0.47 });
  return mesh;
}

// the dracaena's leaf: a strap, dark green, a cream line down its middle, its edges red going to purple
const dracaenaLeafTex = makeTexture((c, W, H) => {
  const gr = c.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, "#6a1626"); gr.addColorStop(0.1, "#8a2433"); gr.addColorStop(0.16, "#2a5a2c"); gr.addColorStop(0.46, "#3c7034"); gr.addColorStop(0.49, "#b9c48a");
  gr.addColorStop(0.51, "#b9c48a"); gr.addColorStop(0.54, "#3c7034"); gr.addColorStop(0.84, "#2a5a2c"); gr.addColorStop(0.9, "#8a2433"); gr.addColorStop(1, "#6a1626");
  c.fillStyle = gr; c.fillRect(0, 0, W, H);
}, 16, 64);
// the cane: grey-brown, ringed with the scars old leaves left, closer together toward the top
const dracaenaBarkTex = makeTexture((c, W, H) => {
  c.fillStyle = "#7a6c5a"; c.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 4) { c.fillStyle = x % 8 ? "#5e5244" : "#8d806c"; c.fillRect(x, 0, 1, H); for (let y = 0; y < H; y += 8) { c.fillStyle = "#4c4236"; c.fillRect(x, y + (x % 8 ? 0 : 4), 2, 4); } }   // (rings across u: the tube's length)
}, 64, 32);
dracaenaBarkTex.wrapS = dracaenaBarkTex.wrapT = THREE.RepeatWrapping;

// canes standing in soil at (x, soilY, z): each [height above the soil, lean, heading], their tops' rosettes
function buildDracaena(x, soilY, z, canes = [[1.0, 0.16, 0.4], [1.32, 0.12, 2.6], [1.62, 0.07, 4.6]], seed = 23) {
  const g = new THREE.Group(); g.position.set(x, soilY, z); scene.add(g);
  const rng = seeded(seed), rr = (a, b) => a + (b - a) * rng();
  const leafM = new THREE.MeshLambertMaterial({ map: dracaenaLeafTex, side: THREE.DoubleSide });
  const pos = [], uv = [], idx = [];
  for (const [h, lean, hd] of canes) {
    // the cane: up out of the soil, a slow S as it reached for the light
    const dx = Math.cos(hd), dz = Math.sin(hd), pts = [];
    for (let i = 0; i <= 6; i++) { const t = i / 6, off = lean * h * (t * t) + 0.04 * Math.sin(t * Math.PI * 1.6 + hd); pts.push(new THREE.Vector3(dx * (off + 0.035), t * h, dz * (off + 0.035))); }   // (each from its own spot in the soil)
    const curve = new THREE.CatmullRomCurve3(pts), tube = new THREE.TubeGeometry(curve, 24, 0.016, 7);
    { const r = tube.attributes.position, n = tube.parameters.radialSegments + 1;   // (tapered: thicker at the foot)
      for (let i = 0; i < r.count; i++) { const t = Math.floor(i / n) / 24, c = curve.getPointAt(t), k = 1.15 - 0.4 * t; r.setXYZ(i, c.x + (r.getX(i) - c.x) * k, r.getY(i), c.z + (r.getZ(i) - c.z) * k); }
      tube.computeVertexNormals(); }
    g.add(new THREE.Mesh(tube, barkTile(h)));
    const top = curve.getPointAt(1), up = curve.getTangentAt(1);
    // the rosette: 70-odd long thin leaves, the young ones up the middle, the old ones arching out and down
    const N = 72 + Math.floor(rng() * 16);
    for (let i = 0; i < N; i++) {
      const age = i / N, L = rr(0.32, 0.5) * (0.75 + 0.35 * age), W = rr(0.026, 0.034), head = i * 2.39996 + rr(-0.2, 0.2);
      let tilt = 0.1 + age * 1.45 + rr(-0.12, 0.12);                       // from straight up, out toward level and past it
      const bend = 0.6 + age * 1.6, segs = 9, hx = Math.cos(head), hz = Math.sin(head), sx = -hz, sz = hx;
      let px = top.x + up.x * 0.01, py = top.y - age * 0.07, pz = top.z + up.z * 0.01;   // (older leaves lower on the cane)
      const v0 = pos.length / 3;
      for (let s = 0; s <= segs; s++) {
        const t = s / segs, w = W * (t < 0.15 ? 0.6 + t / 0.15 * 0.4 : 1 - Math.pow((t - 0.15) / 0.85, 2.5) * 0.95) / 2;
        pos.push(px + sx * w, py, pz + sz * w, px - sx * w, py, pz - sz * w); uv.push(t, 0, t, 1);
        const a = tilt + bend * t * t, step = L / segs;                    // (it arches over more toward its tip)
        px += hx * Math.sin(a) * step; pz += hz * Math.sin(a) * step; py += Math.cos(a) * step;
        if (s < segs) { const k = v0 + s * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      }
    }
  }
  const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); lg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); lg.setIndex(idx); lg.computeVertexNormals();
  g.add(new THREE.Mesh(lg, leafM));
  return g;
  function barkTile(h) { const t = dracaenaBarkTex.clone(); t.needsUpdate = true; t.repeat.set(h / 0.12, 1); return new THREE.MeshLambertMaterial({ map: t }); }
}
