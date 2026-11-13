// The trees outside, through the year and in the wind. Instanced (a handful of draws for hundreds of trees):
// trunks, the bare branches, pine tiers and the broadleaf canopies' lumpy puffs, each with a per-tree sway in
// the vertex shader (stronger toward the top, leaning with the wind, rocking with the gusts) and snow settling
// on whatever faces up. The broadleaf trees go by the game's date: fresh green in spring, deep green all
// summer, turning red, orange and yellow through October (each tree on its own clock, the outsides first),
// thinning and dropping through November, bare from December till the buds come in April. Leaves come down
// at the season's rate (more in a gust), tumbling and blown, and pile up as litter on the grass, against the
// curb and along the storefront until the snow covers them or they're cleared by mid-December.
// window.StoreTrees = { build({ scene, layer, rows, x0, x1, avoid }), tick(dt, { date, h, wind, gust, cover, night, grass }), refresh() }
window.StoreTrees = (() => {
  const U = { uT: { value: 0 }, uWind: { value: 0 }, uGust: { value: 0 }, uTreeSnow: { value: 0 } };
  const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  // a broadleaf tree's year (d: day of the year, shifted by the tree's own lateness): how much canopy (L), how
  // fresh a green, how far turned, how far gone brown
  function leafState(d) {
    if (d < 200) return { L: ss(100, 135, d), fresh: 1 - ss(125, 170, d), turn: 0, brown: 0 };
    const drop = ss(288, 328, d);
    return { L: 1 - drop, fresh: 0, turn: ss(262, 300, d), brown: drop };
  }
  const GRASS = [[0, 0x7b7550], [75, 0x767650], [105, 0x5f9440], [150, 0x3f7d3a], [230, 0x477a37], [275, 0x5a7a3a], [305, 0x74773f], [335, 0x7b7550], [366, 0x7b7550]];
  let T = null, timer = 99, last = null;

  // the sway (and snow) patch, chained after the store's own Lambert patch (the room lighting)
  const swayMat = (opts, leaf) => {
    const m = new THREE.MeshLambertMaterial(opts);
    m.onBeforeCompile = (sh, r) => {
      THREE.MeshLambertMaterial.prototype.onBeforeCompile.call(m, sh, r);
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nattribute vec4 aTree; uniform float uT, uWind, uGust;")
        .replace("#include <begin_vertex>", `#include <begin_vertex>
          #ifdef USE_INSTANCING
          {
            vec3 wp = (instanceMatrix * vec4(transformed, 1.0)).xyz;   // aTree: base x, base z, phase, height
            float k = clamp(wp.y / aTree.w, 0.0, 1.4); k *= k;
            float w = 0.1 + uWind;
            float sway = sin(uT * (1.1 + 0.3 * w) + aTree.z) * (0.04 + 0.1 * w) + sin(uT * 2.7 + aTree.z * 1.7) * 0.025 * w;
            float lean = 0.08 * w + 0.16 * uGust * (0.6 + 0.4 * sin(uT * 0.9 + aTree.z));
            vec3 off = vec3(lean + sway, 0.0, sway * 0.35 + 0.03 * w * sin(uT * 1.9 + aTree.x)) * k;
            ${leaf ? "off += vec3(sin(uT * 7.0 + wp.y * 3.0 + aTree.z), 0.0, cos(uT * 6.0 + wp.x * 2.0)) * 0.012 * w * k;   // the leaves flutter" : ""}
            mat3 im = mat3(instanceMatrix); transformed += (transpose(im) * off) / vec3(dot(im[0], im[0]), dot(im[1], im[1]), dot(im[2], im[2]));   // into the instance's own frame (rotation x scale, no shear)
          }
          #endif`);
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float uTreeSnow;")
        .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
          { vec3 tN = inverseTransformDirection(normal, viewMatrix); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.93, 0.97), uTreeSnow * smoothstep(0.2, 0.7, tN.y)); }`);
    };
    m.customProgramCacheKey = () => "tree" + (leaf ? "L" : "");
    return m;
  };

  function build({ scene, layer, rows, x0, x1, avoid, road = [-14.8, -8.8], lot = [-32, 36, -12.3], lotY = 0 }) {   // road: its far and near z (with the verge); lot: its x span and curb z
    const R = Math.random, trees = [];
    const add = (x, z, s, pine) => trees.push({ x, z, s, pine, phase: R() * 6.28, off: (R() - 0.5) * 18, type: Math.floor(R() * 4) });
    // the treeline across the road, as it always was: three staggered rows
    for (const rz of rows) {
      const n = Math.round((x1 - x0) / (1.9 + R() * 0.4));
      for (let i = 0; i < n; i++) add(x0 + (i + 0.5) * ((x1 - x0) / n) + (R() - 0.5) * 0.7, rz + (R() - 0.5) * 1.6, 0.8 + R() * 0.6, R() < 0.6);
    }
    // and now the rest of the world, seen from the roof: a treeline round the edge, groves, the odd tree on its own
    const clear = (x, z) => {
      for (const [a, b, c, d] of avoid) if (x > a - 4 && x < b + 4 && z > c - 4 && z < d + 4) return false;   // the building
      if (z > road[0] - 1 && z < road[1]) return false;                // the road (cars come and go along it, well past the lot)
      if (z > road[0] - 1 && z < 1 && x > lot[0] && x < lot[1]) return false;   // the lot and the walk
      if (x > 12 && x < 24 && z > -2 && z < 16) return false;           // next door
      if (SERVICE_ROAD.inside(x, z) || SERVICE_ROAD.inside(x - 1.4, z) || SERVICE_ROAD.inside(x + 1.4, z) || SERVICE_ROAD.inside(x, z - 1.4)) return false;   // inside the service road's fence (and none growing through it)
      if (Math.abs(z - SERVICE_ROAD.FRONT) < 1.4) return false;       // the fence's two runs along the back of the walk
      if (EDGE.open.some(([a, b, c, d]) => x > a && x < b && z > c && z < d)) return false;   // the park across the road, the county's yard
      return !trees.some(t => Math.abs(t.x - x) < 1.3 && Math.abs(t.z - z) < 1.3);
    };
    const try1 = (x, z, s, pine) => { if (x > -60 && x < 70 && z > -24 && z < 88 && clear(x, z)) add(x, z, s, pine); };
    for (let x = -60; x < 70; x += 2.2 + R() * 1.2) for (const z of [86, 82.5]) try1(x + R() * 0.8, z + (R() - 0.5) * 1.6, 1 + R() * 0.8, R() < 0.55);   // the back
    for (let z = -24; z < 80; z += 2.2 + R() * 1.2) for (const x of [-57.5, 66.5]) try1(x + (R() - 0.5) * 1.4, z + R() * 0.8, 1 + R() * 0.8, R() < 0.55);   // the sides
    for (let g = 0; g < 12; g++) {                     // groves
      const cx = -50 + R() * 110, cz = -20 + R() * 95, r = 2.5 + R() * 4, n = 5 + Math.floor(R() * 10), pine = R() < 0.4;
      for (let i = 0; i < n; i++) { const a = R() * 6.28, d = Math.sqrt(R()) * r; try1(cx + Math.cos(a) * d, cz + Math.sin(a) * d, 0.9 + R() * 0.8, R() < (pine ? 0.8 : 0.2)); }
    }
    for (let i = 0; i < 40; i++) try1(-55 + R() * 120, -22 + R() * 105, 1 + R() * 0.7, R() < 0.4);   // on their own
    // the woods (EDGE, store/core.js): planted thick enough that there's no way through, bigger trees further in, right along the road as far as it can be seen
    for (const [fx0, fx1, fz0, fz1, step] of EDGE.woods)
      for (let x = fx0 + step / 2; x < fx1; x += step) for (let z = fz1 - step * 0.35; z > fz0; z -= step) {
        const tx = x + (R() - 0.5) * step * 0.8, tz = z + (R() - 0.5) * step * 0.7; if (Math.abs(tz - SERVICE_ROAD.FRONT) < 1.4 || tz > fz1 - 0.3) continue;
        const deep = Math.min(1, (fz1 - tz) / 7), s = R() < 0.35 + 0.3 * deep ? 1.8 + R() * 1.5 : 1 + R() * 0.8, pine = R() < 0.5;
        add(tx, tz, s, pine); if (!pine && s > 2.3) trees[trees.length - 1].big = true;
      }
    // and the brush along their edge: what actually stops you. Two rows, the back one taller
    const bushAt = [];
    for (const [ax, az, bx, bz] of EDGE.brush) {
      const L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
      let nx = -uz, nz = ux; { const mx = (ax + bx) / 2 + nx, mz = (az + bz) / 2 + nz; if (EDGE.open2(mx, mz)) { nx = -nx; nz = -nz; } }   // (n: away from the open side: never out onto the road or its walk)
      for (let row = 0; row < 3; row++) for (let t = R() * 0.5; t < L; t += 0.8 + R() * 0.45) {
        const x = ax + ux * t, z = az + uz * t; if (row && Math.abs(x) > 125) continue;   // (way down the road: one row does)
        const d = row * 0.8 + R() * 0.35, h = 0.55 + R() * 0.4 + row * 0.38;
        bushAt.push({ x: x + nx * d, z: z + nz * d, w: 0.7 + R() * 0.45 + row * 0.25, h, phase: R() * 6.28 });
      }
    }
    for (const [x, z, s, pine] of [...SERVICE_ROAD.trees, ...EDGE.park.trees]) { add(x, z, s, !!pine); trees[trees.length - 1].big = true; }   // the big ones just past the service road's fence, their tops over it

    // the parts, counted up front
    const pines = trees.filter(t => t.pine), rounds = trees.filter(t => !t.pine);
    const PUFFS = [[0, 1.4, 0.62], [0.34, 1.2, 0.5], [-0.32, 1.25, 0.48], [0.04, 1.68, 0.46]];   // (sat down onto the trunk: the low-poly puffs read smaller than their radius)
    const BIG_PUFFS = [[0, 1.5, 0.62, 0], [0.62, 1.32, 0.46, 0.1], [-0.6, 1.36, 0.48, -0.12], [0.1, 1.34, 0.46, 0.62], [-0.12, 1.3, 0.46, -0.62], [0.42, 1.72, 0.42, 0.36], [-0.4, 1.76, 0.42, 0.3], [0.34, 1.7, 0.4, -0.4], [-0.3, 1.74, 0.4, -0.38], [0, 2.02, 0.42, 0]];   // (a big tree's a fuller crown: x, up, radius, z)
    const puffsOf = t => t.big ? BIG_PUFFS : PUFFS, nPuffs = rounds.reduce((n, t) => n + puffsOf(t).length, 0);
    const inst = (geo, m, n) => {
      geo.setAttribute("aTree", new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4));
      const o = new THREE.InstancedMesh(geo, m, n); o.layers.set(layer); o.frustumCulled = false; scene.add(o); return o;
    };
    const trunkM = swayMat({ color: 0x5b4327 }), pineM = swayMat({ color: 0xffffff }), puffM = swayMat({ color: 0xffffff }, true);
    const trunkGeo = new THREE.CylinderGeometry(0.07, 0.12, 1, 6, 1, true);   // (no caps: one end's in the ground, the other in the canopy)
    trunkGeo.translate(0, 0.5, 0);
    const branchGeo = new THREE.CylinderGeometry(0.6, 1, 1, 4, 1, true); branchGeo.translate(0, 0.5, 0);
    const trunks = inst(trunkGeo, trunkM, trees.length), branches = inst(branchGeo, trunkM, rounds.length * 8);
    const cones = inst(new THREE.ConeGeometry(1, 1, 8), pineM, pines.length * 3), puffs = inst(new THREE.IcosahedronGeometry(1, 0), puffM, nPuffs);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), c = new THREE.Color();
    const put = (mesh, i, t, x, y, z, sx, sy, sz, quat = q.identity()) => {
      mesh.setMatrixAt(i, m4.compose(p.set(x, y, z), quat, sc.set(sx, sy, sz)));
      mesh.geometry.attributes.aTree.setXYZW(i, t.x, t.z, t.phase, (t.pine ? 3 : 2.45) * t.s);
    };
    trees.forEach((t, i) => { const k = t.pine ? 1 : 1.1; put(trunks, i, t, t.x, 0, t.z, t.s * k, t.s * (t.pine ? 1 : 1.1), t.s * k); });
    pines.forEach((t, i) => {
      const g = new THREE.Color([0x2e6b34, 0x3a7d3f, 0x2a5e30][i % 3]).offsetHSL(0, 0, (R() - 0.5) * 0.04);
      [[0.8, 1.3, 0.8], [1.55, 1.05, 0.62], [2.2, 0.8, 0.44]].forEach(([y0, h, r], j) => { put(cones, i * 3 + j, t, t.x, (y0 + h / 2) * t.s, t.z, r * t.s, h * t.s, r * t.s); cones.setColorAt(i * 3 + j, g); });
    });
    const FALL = [0xd8401a, 0xf08a1e, 0xc8702a, 0xf0c832];   // maple red, sugar-maple orange, oak, aspen yellow
    const SPRING = new THREE.Color(0x9acd5a), BROWN = new THREE.Color(0x7a5230), puffData = [];
    let puffI = 0;
    rounds.forEach((t, i) => {
      for (let j = 0; j < 4; j++) {                 // bare branches up out of the trunk, and a twig off each
        const a = t.phase + j * 1.57 + (R() - 0.5) * 0.5, bx = Math.cos(a) * 0.55, bz = Math.sin(a) * 0.55;
        dir.set(bx, 0.8, bz).normalize(); const qb = new THREE.Quaternion().setFromUnitVectors(up, dir), L = 0.75 * t.s;
        put(branches, i * 8 + j * 2, t, t.x, t.s * 1.0, t.z, 0.035 * t.s, L, 0.035 * t.s, qb);
        const mx = t.x + dir.x * L * 0.6, my = t.s * 1.0 + dir.y * L * 0.6, mz = t.z + dir.z * L * 0.6;
        dir.set(bx * 1.6 + (R() - 0.5) * 0.4, 0.7, bz * 1.6 + (R() - 0.5) * 0.4).normalize();
        put(branches, i * 8 + j * 2 + 1, t, mx, my, mz, 0.018 * t.s, 0.42 * t.s, 0.018 * t.s, new THREE.Quaternion().setFromUnitVectors(up, dir));
      }
      const green = new THREE.Color([0x2e6b34, 0x3a7d3f, 0x356f2e, 0x447a35][i % 4]), fall = new THREE.Color(FALL[t.type]), alt = new THREE.Color(FALL[(t.type + 1 + (i % 2)) % 4]);
      puffsOf(t).forEach(([ox, y, r, oz], j) => {
        const pi = puffI++;
        puffData.push({ i: pi, t, x: t.x + ox * t.s, y: y * t.s, z: t.z + (oz ?? (R() - 0.5) * 0.3) * t.s, r: r * t.s,
          th: 0.15 + R() * 0.85, early: j === 0 || j === 3 ? 0 : 0.12 + R() * 0.1,   // the outer puffs turn first
          green: green.clone().offsetHSL((R() - 0.5) * 0.02, 0, (R() - 0.5) * 0.05), fall: fall.clone().lerp(alt, R() * 0.35) });
        puffs.geometry.attributes.aTree.setXYZW(pi, t.x, t.z, t.phase, 2.45 * t.s);
      });
    });
    for (const o of [trunks, branches, cones]) o.instanceMatrix.needsUpdate = true;
    { const bushes = inst(new THREE.IcosahedronGeometry(0.6, 0), swayMat({ color: 0xffffff }), bushAt.length), e = new THREE.Euler(), GREENS = [0x2f5a2c, 0x3a6a30, 0x2a4f2a, 0x46702f, 0x38592a];
      bushAt.forEach((b, i) => {
        put(bushes, i, { x: b.x, z: b.z, phase: b.phase, pine: true, s: 1.1 }, b.x, b.h * 0.42, b.z, b.w, b.h, b.w, new THREE.Quaternion().setFromEuler(e.set((R() - 0.5) * 0.5, R() * 6.28, (R() - 0.5) * 0.5)));
        bushes.setColorAt(i, c.set(GREENS[i % GREENS.length]).offsetHSL((R() - 0.5) * 0.03, 0, (R() - 0.5) * 0.06));
      });
      bushes.instanceMatrix.needsUpdate = true; if (bushes.instanceColor) bushes.instanceColor.needsUpdate = true; }

    // leaves coming down: from the broadleaf canopies (and a share blown in high over the lot), tumbling, carried on the wind
    const NL = 2400, lp = new Float32Array(NL * 3), lc = new Float32Array(NL * 3), ls = new Float32Array(NL * 4), cols = [0xc23a1c, 0xe07a1e, 0xd8a12a, 0xb8642a, 0x8a4b22, 0xe0b52a].map(h => new THREE.Color(h));
    for (let i = 0; i < NL; i++) {
      let x, y, z;
      if (i % 7 === 0 || !rounds.length) { x = -30 + R() * 66; z = -16 + R() * 14; y = 3 + R() * 3.5; }   // strays, blown over the road and the lot
      else { const t = rounds[Math.floor(R() * rounds.length)], a = R() * 6.28, d = R() * 0.6 * t.s; x = t.x + Math.cos(a) * d; z = t.z + Math.sin(a) * d; y = (1.1 + R() * 0.6) * t.s; }
      lp.set([x, y, z], i * 3); lc.set(cols[Math.floor(R() * cols.length)].toArray(), i * 3);
      ls.set([R(), 0.55 + R() * 0.6, R(), 1.5 + R() * 3], i * 4);   // phase, fall speed, when it shows (vs the rate), tumble
    }
    const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.BufferAttribute(lp, 3)); lg.setAttribute("aCol", new THREE.BufferAttribute(lc, 3)); lg.setAttribute("aS", new THREE.BufferAttribute(ls, 4));
    const LU = { uT: U.uT, uWind: U.uWind, uGust: U.uGust, uRate: { value: 0 }, uNight: { value: 0 } };
    const falling = new THREE.Points(lg, new THREE.ShaderMaterial({ uniforms: LU, transparent: true, depthWrite: false,
      vertexShader: `attribute vec3 aCol; attribute vec4 aS; uniform float uT, uRate, uWind, uGust, uNight; varying vec3 vC; varying float vA, vR;
        void main() {
          float H = position.y, down = H / aS.y, dur = down + 2.0, t = mod(uT + aS.x * dur, dur), tt = min(t, down);
          vec3 p = position; p.y = H - tt * aS.y + 0.02;
          float blow = 0.2 + 1.8 * uWind + 1.4 * uGust;
          p.x += tt * blow + sin(tt * 2.3 + aS.x * 30.0) * 0.35;
          p.z += tt * blow * 0.45 + cos(tt * 1.9 + aS.x * 20.0) * 0.3;
          vA = step(aS.z, uRate) * (1.0 - smoothstep(down + 0.8, dur, t));   // as many as the season's dropping; gone a moment after they land
          vC = aCol * (1.0 - 0.75 * uNight); vR = (tt < down ? uT : 0.0) * aS.w + aS.x * 6.28;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = clamp(70.0 / -mv.z, 1.0, 16.0); gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying vec3 vC; varying float vA, vR;
        void main() {
          if (vA < 0.01) discard;
          vec2 d = gl_PointCoord - 0.5; float c = cos(vR), s = sin(vR); d = vec2(c * d.x - s * d.y, s * d.x + c * d.y);
          d.x /= 0.25 + 0.75 * abs(sin(vR * 0.6));                     // turning edge-on as it tumbles
          if (d.x * d.x + d.y * d.y * 3.2 > 0.2) discard;
          gl_FragColor = vec4(vC, vA);
        }` }));
    falling.layers.set(layer); falling.frustumCulled = false; scene.add(falling);

    // what's come down: on the grass under the trees, banked against the curb, blown up along the storefront, a few across the lot
    const NG = 3200, litterGeo = new THREE.PlaneGeometry(0.11, 0.07); litterGeo.rotateX(-Math.PI / 2);
    const litter = new THREE.InstancedMesh(litterGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), NG); litter.layers.set(layer); litter.frustumCulled = false; scene.add(litter);
    const lcols = [0xb5651d, 0xc8902a, 0x8a4b22, 0xa83a1e, 0xd9a83a, 0x6e4a2a].map(h => new THREE.Color(h)), e = new THREE.Euler();
    for (let i = 0; i < NG; i++) {
      const r = R(); let x, z;
      if (r < 0.6 && rounds.length) { const t = rounds[Math.floor(R() * rounds.length)], a = R() * 6.28, d = Math.sqrt(R()) * 2.6 * Math.min(t.s, 2.6); x = t.x + Math.cos(a) * d + 0.6; z = t.z + Math.sin(a) * d; if (avoid.some(([a0, b0, c0, d0]) => x > a0 && x < b0 && z > c0 && z < d0)) x = t.x + 0.6, z = t.z; }   // (not indoors)
      else if (r < 0.75) { x = lot[0] + 8 + R() * (lot[1] - lot[0] - 13); z = lot[2] + 0.12 + R() * 0.15; }   // against the lot side of the curb
      else if (r < 0.9) { x = (R() < 0.5 ? -7.6 + R() * 5.6 : 2 + R() * 8.8); z = -0.06 - R() * R() * 0.5; }   // up along the storefront
      else { x = lot[0] + 8 + R() * (lot[1] - lot[0] - 13); z = lot[2] + 0.2 + R() * (-1.8 - lot[2]); }   // loose on the lot and the walk
      litter.setMatrixAt(i, m4.compose(p.set(x, (z < -1.8 && z > lot[2] ? lotY : 0) + 0.006 + R() * 0.004, z), q.setFromEuler(e.set((R() - 0.5) * 0.3, R() * 6.28, (R() - 0.5) * 0.3)), sc.set(0.7 + R() * 0.6, 1, 0.7 + R() * 0.6)));
      litter.setColorAt(i, c.copy(lcols[Math.floor(R() * lcols.length)]).multiplyScalar(0.8 + R() * 0.3));
    }
    litter.count = 0;
    T = { trees, rounds, puffs, branches, puffData, falling, LU, litter, NG, c, m4, q, p, sc, SPRING, BROWN };
  }

  function season(doy, cover, gust, grass) {
    const { rounds, puffs, branches, puffData, LU, litter, NG, c, m4, q, p, sc, SPRING, BROWN } = T;
    let drop = 0, fallen = 0, leaf = 0;
    for (const t of rounds) {
      t.st = leafState(doy - t.off);
      drop += Math.max(0, leafState(doy - t.off - 0.5).L - leafState(doy - t.off + 0.5).L);   // canopy lost today
      fallen += t.st.brown; leaf += t.st.L;
    }
    const n = Math.max(1, rounds.length);
    for (const d of puffData) {
      const s = d.t.st, a = ss(d.th - 0.25, d.th + 0.05, s.L), k = a > 0.02 ? d.r * (0.3 + 0.7 * a) : 0;
      puffs.setMatrixAt(d.i, m4.compose(p.set(d.x, d.y, d.z), q.identity(), sc.setScalar(k)));
      c.copy(d.green).lerp(SPRING, s.fresh * 0.8).lerp(d.fall, Math.min(1, s.turn * 1.15 + d.early * s.turn * 2)).lerp(BROWN, s.brown * 0.55);
      puffs.setColorAt(d.i, c);
    }
    puffs.instanceMatrix.needsUpdate = true; puffs.instanceColor.needsUpdate = true;
    puffs.visible = leaf / n > 0.005; branches.visible = leaf / n < 0.92;   // (in full leaf the branches are all inside the canopy; bare, there's no canopy to draw)
    LU.uRate.value = Math.min(1, drop / n * 26 * (1 + 1.5 * gust));
    litter.count = Math.floor(NG * (fallen / n) * (1 - ss(335, 352, doy)) * (doy < 200 ? 0 : 1) * (1 - ss(0.1, 0.5, cover)));
    if (grass) {                                   // the grass: dormant tan, greening in April, summer green, olive and tan again by November
      let i = 0; while (i < GRASS.length - 2 && GRASS[i + 1][0] <= doy) i++;
      grass.dry.set(GRASS[i][1]).lerp(c.set(GRASS[i + 1][1]), (doy - GRASS[i][0]) / (GRASS[i + 1][0] - GRASS[i][0]));
    }
  }

  function tick(dt, { date, h = 12, wind = 0, gust = 0, cover = 0, night = 0, grass = null }) {
    if (!T) return;
    U.uT.value += dt; U.uWind.value = wind; U.uGust.value = gust;
    U.uTreeSnow.value += (Math.min(1, cover * 1.3) - U.uTreeSnow.value) * Math.min(1, dt * 0.5);
    T.LU.uNight.value = night;
    const doy = (date - new Date(date.getFullYear(), 0, 1)) / 864e5 - 0.5 + h / 24;   // (the shift date's at noon)
    if ((timer += dt) < 1.5 && Math.abs(doy - last) < 1) return;   // a fresh look every second and a half (or straight away, a day on)
    timer = 0; last = doy; season(doy, cover, gust, grass);
  }
  return { build, tick, refresh: () => { timer = 99; }, leafState };
})();
