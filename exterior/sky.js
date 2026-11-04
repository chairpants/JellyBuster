// ---------------- weather ----------------
// Each day has its own (worked out from the date, so a reload doesn't change it): mostly clear, sometimes a spell of
// rain (more in spring and fall, a summer afternoon storm), snow in the winter months. Rain streaks down outside,
// the lot goes dark and wet (and dries slowly after), drops run down the storefront glass, people come in under
// umbrellas and track water in by the door (a puddle for the mop), and you hear it on the roof. Snow drifts down
// and settles on the lot and the grass. It changes the day, too: a wet afternoon is slow, a wet evening's a movie night
function wxPlan() {
  if (WX.plan?.day === shift.day) return WX.plan;
  let seed = 7907 * shift.day + 101; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  rnd(); rnd();
  const mo = shiftDate().getMonth(), winter = mo === 11 || mo <= 1, summer = mo >= 5 && mo <= 7;
  const plan = { day: shift.day, kind: "clear", from: 0, to: 0, k: 0 };
  if (rnd() < (winter ? 0.4 : summer ? 0.25 : 0.33)) {
    plan.kind = winter && rnd() < 0.65 ? "snow" : "rain";
    const allDay = rnd() < 0.25;
    plan.from = allDay ? 0 : summer && plan.kind === "rain" ? 14 + rnd() * 4 : 8 + rnd() * 13;
    plan.to = allDay ? 25 : plan.from + (summer ? 1 + rnd() * 2 : 2 + rnd() * 6);
    plan.k = 0.45 + rnd() * 0.55;
  }
  let s2 = 4111 * shift.day + 977; const r2 = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647; r2();
  const shoulder = !winter && !summer, c = r2();
  plan.clouds = c < 0.3 ? r2() * 0.15 : c < 0.7 ? 0.2 + r2() * 0.4 : 0.6 + r2() * 0.35;   // clear, a few about, mostly cloudy
  plan.wind = 0.06 + r2() ** 1.6 * 0.6 + (shoulder || winter ? 0.08 : 0) + (plan.kind !== "clear" ? 0.15 : 0);
  plan.windDir = (r2() - 0.5) * 1.6;              // mostly out of the west (blowing toward +x), give or take
  plan.cloudV = 0.4 + r2() * 1.4;                 // m/s up there, before the wind
  plan.fogAM = r2() < (shoulder ? 0.25 : winter ? 0.15 : 0.08) ? 0.45 + r2() * 0.55 : 0; plan.fogEnd = 8.5 + r2() * 2.5;   // morning fog, burning off by mid-morning
  plan.fogPM = r2() < 0.07 ? 0.3 + r2() * 0.4 : 0; plan.fogFrom = 20.5 + r2() * 2;   // now and then it comes in at night
  plan.glowAM = r2() < 0.35 ? 0.4 + r2() * 0.6 : r2() * 0.25; plan.glowPM = r2() < 0.4 ? 0.4 + r2() * 0.6 : r2() * 0.25; plan.glowHue = Math.floor(r2() * 3);
  return WX.plan = plan;
}
const wxRush = () => !WX.k ? 1 : WX.kind === "snow" ? (shift.h < 17 ? 1 - 0.4 * WX.k : 1) : shift.h < 17 ? 1 - 0.3 * WX.k : 1 + 0.25 * WX.k;   // (see rushLevel)
const WX_GROUND = [[mat.pavement, 0x55595e, 0x2e3237, 1], [mat.road, 0x2b2d31, 0x1b1d20, 0.6], [mat.sidewalk, 0x9a9d9f, 0x6a6e72, 1], [mat.curb, 0xb9bcc0, 0x8c9094, 1], [mat.grass, 0x3f7d3a, 0x2f5f2c, 1]]   // [material, dry, wet, how much snow settles]
  .map(([m, dry, wet, snow]) => ({ m, dry: new THREE.Color(dry), wet: new THREE.Color(wet), snow }));
const WX_SNOW = new THREE.Color(0xe6ebf0);
const wxFall = (() => {                           // the rain (streaks) and the snow (flakes), falling in the shader
  // Each is a box of particles that wraps round on itself: one fixed over the lot and the road (what you see out the
  // front, to the trees), one carried round with you (so it's coming down wherever you look from, the roof too). The
  // wind blows them along and slants the streaks, and nothing falls inside the building (under its roof)
  const mk = (n, lines) => {                      // positions 0..1 in the box (z stored negative: it files under "out", see roomSort)
    const pos = new Float32Array(n * (lines ? 6 : 3)), end = new Float32Array(n * (lines ? 2 : 1)), seed = new Float32Array(n * (lines ? 2 : 1));
    for (let i = 0; i < n; i++) {
      const x = Math.random(), y = Math.random(), z = -Math.random(), r = Math.random();
      for (let v = 0; v < (lines ? 2 : 1); v++) { const j = i * (lines ? 2 : 1) + v; pos.set([x, y, z], j * 3); end[j] = v; seed[j] = r; }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("end", new THREE.BufferAttribute(end, 1)); g.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
    return g;
  };
  const uni = { uT: { value: 0 }, uK: { value: 0 }, uNight: { value: 0 }, uWind: { value: new THREE.Vector2() }, uDrift: { value: new THREE.Vector2() } };   // wind: m/s now; drift: how far it's carried things
  const box = (cx, cz, sx, sz, h, y0, follow) => ({ ...uni, uC: { value: new THREE.Vector2(cx, cz) }, uS: { value: new THREE.Vector2(sx, sz) }, uH: { value: h }, uY0: { value: y0 }, uFollow: { value: follow } });
  const FAR = [4, -16.2, 68, 31.5, 12, 0, 0], NEAR = [0, 0, 26, 26, 9.5, -0.5, 1];
  const foot = ROOF.decks.map(({ r: [a, b, c, d], y }) => `(p.y < ${(y + 0.05).toFixed(2)} && p.x > ${a.toFixed(2)} && p.x < ${b.toFixed(2)} && p.z > ${c.toFixed(2)} && p.z < ${d.toFixed(2)})`).join(" || ");
  const head = `attribute float end; attribute float seed; uniform float uT, uH, uY0, uFollow; uniform vec2 uC, uS, uWind, uDrift;
    vec3 place(vec3 q, float fall, vec2 drift) {     // world position: held in the world, wrapped into the box round its center
      vec2 c0 = mix(uC, cameraPosition.xz, uFollow) - uS * 0.5;
      float y0 = mix(uY0, max(uY0, cameraPosition.y - 5.5), uFollow);
      vec3 p; p.y = y0 + mod(q.y * uH - fall, uH); p.xz = c0 + mod(vec2(q.x, -q.z) * uS + drift - c0, uS);
      return p;
    }
    bool indoors(vec3 p) { return ${foot}; }
    // where it's coming down heavier or lighter right now: curtains drifting across, thickening and thinning, the whole lot easing in and out over minutes
    float veil(vec2 p) { float a = sin(p.x * 0.17 + uT * 0.23 + 1.7 * sin(p.y * 0.09 - uT * 0.11)), b = sin(p.y * 0.31 - uT * 0.37 + 1.3 * sin(p.x * 0.23 + uT * 0.19));
      return clamp(0.5 + 0.32 * a + 0.22 * b, 0.0, 1.0) * (0.68 + 0.32 * sin(uT * 0.083 + 1.0) * sin(uT * 0.047)) + 0.1; }
    float rc(vec2 p, vec4 r) { return smoothstep(0.0, 1.2, min(min(p.x - r.x, r.y - p.x), min(p.y - r.z, r.w - p.y))); }
    float lee(vec3 p) {                              // how shut in by buildings: the gap and the alley between the store and Tony's, the crook behind the store. Up over the roofs, the wind has it again
      return max(max(rc(p.xz, vec4(11.1, 18.0, 14.0, 35.0)), rc(p.xz, vec4(11.1, 13.0, -0.5, 14.5))), rc(p.xz, vec4(2.1, 11.1, 35.1, 41.0))) * (1.0 - smoothstep(4.5, 6.5, p.y)); }
    `;
  const OFF = "gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return;";
  const rainMat = u => new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false,
    vertexShader: head + `varying float vE, vA;
      void main() { float sp = 9.0 + seed * 3.0; vec3 p = place(position, uT * sp, uDrift); if (indoors(p)) { ${OFF} }
        float v = veil(p.xz), wind = clamp(length(uWind) / 4.0, 0.0, 1.0);
        if (seed > v * (1.0 - 0.5 * wind * lee(p)) + 0.05) { ${OFF} }   // (what isn't falling here costs nothing to draw)
        p += end * (0.28 + 0.34 * seed) * vec3(-uWind.x / sp, 1.0, -uWind.y / sp); vE = end; vA = 0.5 + 0.5 * v;   // the tail: where it was a moment ago, up and upwind
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `uniform float uK, uNight; varying float vE, vA; void main() { gl_FragColor = vec4(vec3(0.78, 0.82, 0.9) * (1.0 - 0.55 * uNight), (0.045 + 0.17 * vE) * uK * vA); }` });
  const snowMat = u => new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false,
    vertexShader: head + `varying float vS, vA;
      void main() { float t = uT * (0.7 + seed * 0.5), wind = clamp(length(uWind) / 4.0, 0.0, 1.0); vec3 p; float a;
        if (seed < 0.3) {                              // a third of it only ever falls in the shelter of the buildings: slow, nearly straight down, wandering, whatever it's doing out in the open
          p = place(position, t * 0.8, uDrift * 0.05 + vec2(sin(uT * 0.13 + seed * 90.0), cos(uT * 0.11 + seed * 50.0)) * 0.7); a = lee(p); if (a < 0.02) { ${OFF} }
        } else {                                       // the rest is out in the wind, which doesn't turn the corner: the harder it blows the less of it gets in
          p = place(position, t, uDrift * (0.8 + seed * 0.4)); float v = veil(p.xz); a = (1.0 - lee(p) * (0.45 + 0.53 * wind)) * (0.4 + 0.6 * v); if (fract(seed * 7.3) > a + 0.08) { ${OFF} }
        }
        p.x += sin(t * 0.9 + seed * 40.0) * 0.35; p.z += cos(t * 0.7 + seed * 30.0) * 0.25; vS = seed; vA = min(1.0, a * 1.4);
        if (indoors(p)) { ${OFF} }
        vec4 mv = viewMatrix * vec4(p, 1.0); gl_PointSize = clamp((2.0 + seed * 3.0) * (fract(seed * 13.7) > 0.93 ? 1.7 : 1.0) * 40.0 / -mv.z, 1.0, 9.0); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uK, uNight; varying float vS, vA; void main() { vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.2, length(d)); gl_FragColor = vec4(vec3(1.0) * (1.0 - 0.5 * uNight), a * 0.85 * uK * vA); }` });
  const rain = new THREE.LineSegments(mk(2800, true), rainMat(box(...FAR))), rainNear = new THREE.LineSegments(mk(9500, true), rainMat(box(...NEAR)));
  const snow = new THREE.Points(mk(2600, false), snowMat(box(...FAR))), snowNear = new THREE.Points(mk(7000, false), snowMat(box(...NEAR)));
  for (const o of [rain, rainNear, snow, snowNear]) { o.layers.set(EXTERIOR_LAYER); o.frustumCulled = false; o.renderOrder = -1; o.visible = false;   // (-1: always drawn before the storefront glass, which writes depth; sorted by their origin they lost to it looking along the windows)
    scene.add(o); }
  return { rain, rainNear, snow, snowNear, uni };
})();
const wxGlass = (() => {                          // rain on the outside of the storefront glass (either side of the doors):
  // drops clinging all over it (as wet as the glass is), and drops that grow heavy and run down, leaving a trail
  // and a few beads behind them; two sets of those, running at different speeds, so they don't move as one sheet
  const W = 256, H = 512, tex = draw => {
    const c = document.createElement("canvas"); c.width = W; c.height = H; draw(c.getContext("2d"));
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
  };
  const bead = (g, x, y, r) => {                  // a drop as a lens: the bright sky above shows in its bottom, the dark ground below in its top, a glint
    for (const dy of [-H, 0, H]) {
      const yy = y + dy; if (yy < -r * 2 || yy > H + r * 2) continue;
      const gr = g.createLinearGradient(0, yy - r, 0, yy + r * 1.2);
      gr.addColorStop(0, "rgba(40,48,58,0.45)"); gr.addColorStop(0.55, "rgba(170,185,205,0.3)"); gr.addColorStop(1, "rgba(235,242,255,0.65)");
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, yy, r, r * 1.12, 0, 0, 7); g.fill();
      g.strokeStyle = "rgba(25,30,38,0.3)"; g.lineWidth = Math.max(0.5, r * 0.18); g.stroke();
      if (r > 1.2) { g.fillStyle = "rgba(255,255,255,0.9)"; g.beginPath(); g.arc(x - r * 0.35, yy - r * 0.4, Math.max(0.5, r * 0.22), 0, 7); g.fill(); }
    }
  };
  const beads = tex(g => {
    for (let i = 0; i < 900; i++) bead(g, Math.random() * W, Math.random() * H, 0.6 + 4.2 * Math.random() ** 3.5);   // mostly mist-fine, a few fat ones
  });
  const runners = n => tex(g => {
    for (let i = 0; i < n; i++) {
      const x = 8 + Math.random() * (W - 16), y = Math.random() * H, r = 2.2 + Math.random() * 1.8, len = 60 + Math.random() * 240, ph = Math.random() * 6, wob = 1 + Math.random() * 3;
      const at = k => [x + Math.sin(ph + k * 0.05) * wob + Math.sin(ph * 3 + k * 0.17) * 0.6, y - k];   // the trail above the head, wandering a little
      for (const dy of [-H, 0, H]) {
        g.lineCap = "round";
        for (let k = 0; k < len; k += 2) {        // tapering, fading streak: the glass wiped clearer where it ran
          const f = 1 - k / len, [px, py] = at(k), [qx, qy] = at(k + 2);
          g.strokeStyle = `rgba(200,215,235,${0.28 * f})`; g.lineWidth = r * (0.35 + 0.5 * f);
          g.beginPath(); g.moveTo(px, py + dy); g.lineTo(qx, qy + dy); g.stroke();
        }
      }
      for (let k = 12; k < len; k += 18 + Math.random() * 30) { const [px, py] = at(k); bead(g, px + (Math.random() - 0.5) * 2, py, 0.6 + Math.random() * 1.2); }   // left behind on the way down
      bead(g, at(0)[0], y + r * 0.3, r);         // the head, heavy at the front
    }
  });
  const layers = [[beads, 0], [runners(9), 0.05], [runners(6), 0.11]].map(([t, speed], i) => ({ t, speed, m: new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false }), dz: i * 0.002 }));
  for (const [x0, x1] of [[WALL_L + 0.1, -1.95], [1.95, STORE.x - 0.1]]) {
    const w = x1 - x0;
    const geo = new THREE.PlaneGeometry(w, 2.24), uv = geo.attributes.uv;   // a tile is 1.6 x 3.2 m of glass, whatever the pane's width
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 1.6, uv.getY(i) * 2.24 / 3.2);
    for (const L of layers) { const p = new THREE.Mesh(geo, L.m); p.position.set((x0 + x1) / 2, 1.55, -0.045 - L.dz); scene.add(p); }
  }
  return {
    tick(dt, wet, raining) {                       // beads: as wet as the glass is; runners: while it's actually coming down. Running down = offset up
      layers[0].m.opacity = Math.min(0.95, wet);
      for (const L of layers.slice(1)) { L.m.opacity = Math.min(1, raining * 1.6); L.t.offset.y += dt * L.speed * (0.5 + raining); }
    },
  };
})();
// Snow drifting where it would: banked against both sides of the lot's curb, along the far edge of the road, at the
// foot of the storefront and round the lamp footings. Lumps, not a strip: each starts at its own point (the shelter
// gets it first) and they grow over hours of snowing, then slump away slowly once it stops (faster in rain)
const wxDrifts = (() => {
  const spots = [], rnd = Math.random, add = (x, z, rx, rz, h, y = -0.01, ry = 0) => spots.push({ x, y, z, rx, rz, h, at: rnd() * 0.55, ry: ry + (rnd() - 0.5) * 0.3 });
  const run = (xa, xb, z, side, rz, h) => { for (let x = xa; x < xb; x += 0.35 + rnd() * 0.5) add(x, z + side * rz * 0.5 * rnd(), 0.35 + rnd() * 0.45, rz * (0.6 + rnd() * 0.6), h * (0.4 + rnd() * 0.6)); };
  const X0 = WALL_L - 20, X1 = STORE.x + 20, CURB = LOT.curb, ROAD_FAR = LOT.roadFar;   // (as the lot's laid out: see the exterior)
  run(X0, X1, CURB + 0.09, 1, 0.22, 0.1);          // the lot side of the curb
  run(X0, X1, CURB - 0.09, -1, 0.18, 0.07);        // the road side, in the gutter
  run(X0, X1, ROAD_FAR + 0.05, 1, 0.3, 0.06);      // the road's far edge, against the grass
  run(WALL_L, -2.1, -0.06, -1, 0.2, 0.09); run(2.1, STORE.x, -0.06, -1, 0.2, 0.09);   // the foot of the storefront, not across the doors
  for (const lx of LOT.lampX) for (let a = 0; a < 7; a++) { const t = a / 7 * 6.28 + rnd() * 0.4; add(lx + Math.cos(t) * 0.36, (CURB + LOT.roadNear) / 2 + Math.sin(t) * 0.36, 0.16 + rnd() * 0.08, 0.12, 0.08 + rnd() * 0.06); }   // round the lamp footings
  for (const sp of spots) if (pavedAt(sp.x, sp.z)) sp.y += LOT.y;   // (in the gutter and against the lot side of the curb: down on the paving)
  for (const { r: [a, b, c, d], y } of ROOF.decks)   // up on the roof, against the inside of the parapet or the tall block's wall (not where one part of the roof runs on into the next)
    for (const [xa, za, xb, zb, nx, nz] of [[a, c, b, c, 0, 1], [a, d, b, d, 0, -1], [a, c, a, d, 1, 0], [b, c, b, d, -1, 0]]) {   // each side, (nx, nz) pointing in
      const len = Math.hypot(xb - xa, zb - za);
      for (let t = 0.35; t < len - 0.35; t += 0.35 + rnd() * 0.5) {
        const x = xa + (xb - xa) * t / len, z = za + (zb - za) * t / len;
        if (deckY(x - nx * 0.05, z - nz * 0.05) === y) continue;
        add(x + nx * 0.26, z + nz * 0.26, 0.3 + rnd() * 0.45, 0.14 + rnd() * 0.1, 0.05 + rnd() * 0.07, y - 0.01, nx ? Math.PI / 2 : 0);
      }
    }
  const geo = new THREE.SphereGeometry(1, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0xe9eef3 }), spots.length);
  mesh.layers.set(EXTERIOR_LAYER); mesh.frustumCulled = false; scene.add(mesh);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), sc = new THREE.Vector3();
  let amt = 0, shown = -1;
  const draw = () => {
    spots.forEach((s, i) => {
      const g = Math.max(0, Math.min(1, (amt - s.at) / (1 - s.at)));   // this lump's own share: none until the snow's been at it a while
      q.setFromAxisAngle(up, s.ry); p.set(s.x, s.y, s.z); sc.set(s.rx * (0.3 + 0.7 * Math.sqrt(g)), s.h * g + 1e-4, s.rz * (0.3 + 0.7 * Math.sqrt(g)));
      mesh.setMatrixAt(i, m4.compose(p, q, sc));
    });
    mesh.instanceMatrix.needsUpdate = true; mesh.visible = amt > 0; shown = amt;
  };
  draw();
  return {
    tick(dt, snowing) {                           // ~3 hours of hard snow to full; a day or so to go (a few hours in rain)
      const hrs = dt / SHIFT.hour;
      amt = Math.max(0, Math.min(1, amt + (snowing > 0.15 ? hrs * 0.33 * snowing : -hrs * (WX.kind === "rain" && WX.k > 0.1 ? 0.5 : 0.06))));
      if (Math.abs(amt - shown) > 0.004 || (amt === 0 && shown > 0)) draw();
    },
    get amt() { return amt; }, set amt(v) { amt = v; draw(); },
  };
})();
// ---------------- the sky ----------------
// A dome round the camera (drawn last of the solid things, so it only shades what's still open sky): the day's
// colors from the clock (see todTick), deeper overhead and paler toward the horizon, the sun's disc and its glare,
// a moon at night and the stars coming out, twinkling (fewer down low, gone behind cloud and fog). Some mornings
// and evenings the low sky goes pink or orange: best with a few clouds about to catch it, nothing under overcast
const wxBump = (h, a, b, c, d) => Math.max(0, Math.min(1, (h - a) / (b - a), (d - h) / (d - c)));   // 0 up to a, 1 from b to c, 0 again by d
const wxSky = (() => {
  const u = { uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunC: { value: new THREE.Color() }, uSunUp: { value: 0 },
    uMoon: { value: new THREE.Vector3(-0.5, 0.3, -0.8).normalize() }, uMoonK: { value: 0 }, uStar: { value: 0 }, uT: { value: 0 },
    uGlowC: { value: new THREE.Color() }, uGlow: { value: 0 }, uFogC: TVU.uFogC, uFog: { value: 0 } };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.ShaderMaterial({ uniforms: u, side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * viewMatrix * vec4(position * 110.0 + cameraPosition, 1.0); }`,
    fragmentShader: `uniform vec3 uZen, uHor, uSun, uSunC, uMoon, uGlowC, uFogC; uniform float uSunUp, uMoonK, uStar, uT, uGlow, uFog; varying vec3 vDir;
      float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      void main() {
        vec3 d = normalize(vDir); float e = d.y;
        vec3 col = mix(uHor, uZen, smoothstep(0.0, 0.55, max(e, 0.0)));
        col = mix(col, uHor * 0.8, smoothstep(0.0, -0.2, e));                       // under the horizon (from up on the roof, past the trees)
        vec2 sh = normalize(uSun.xz + vec2(1e-4)); float side = 0.5 + 0.5 * dot(normalize(d.xz + vec2(1e-4)), sh);
        col += uGlowC * uGlow * exp(-max(e, 0.0) * 4.5) * smoothstep(-0.25, 0.0, e) * (0.2 + 0.8 * side * side);   // the glow: low, and strongest toward the sun
        float sd = dot(d, uSun);
        col += uSunC * uSunUp * (smoothstep(0.99955, 0.99975, sd) * 8.0 + pow(max(sd, 0.0), 350.0) * 0.9 + pow(max(sd, 0.0), 10.0) * 0.12);
        if (uStar > 0.003) {
          vec3 sc = vec3(0.0), gal = normalize(vec3(0.38, 0.5, 0.78));              // the band of the galaxy, a slant across the sky
          float gd = dot(d, gal), band = exp(-gd * gd * 22.0), gm = 0.55 + 0.25 * sin(d.x * 19.0 + d.y * 7.0 + 1.3) * sin(d.z * 23.0 - d.y * 11.0) + 0.2 * sin(d.x * 47.0 - d.z * 41.0);
          col += vec3(0.1, 0.115, 0.17) * band * gm * uStar * smoothstep(0.02, 0.4, e);
          for (int l = 0; l < 3; l++) {                                            // star dust, thicker in the band; a fine field; a few bright ones
            float fl = float(l), sz = l == 0 ? 270.0 : l == 1 ? 160.0 : 64.0, thr = l == 0 ? 0.992 - 0.05 * band * gm : l == 1 ? 0.986 : 0.994;
            vec3 p = d * sz, c = floor(p); float hh = h3(c + fl * 17.0);
            if (hh > thr) {
              vec3 o = vec3(h3(c + 1.3), h3(c + 2.7), h3(c + 5.1)) - 0.5;
              float pick = h3(c + 7.7), mag = (hh - thr) / (1.0 - thr), b = smoothstep(l == 0 ? 0.2 : l == 1 ? 0.24 : 0.3, 0.0, length(p - c - 0.5 - o * 0.45)) * (0.3 + 0.7 * mag * mag) * (l == 0 ? 0.4 : l == 1 ? 0.9 : 2.3);
              bool planet = l == 2 && pick > 0.965;                                // the odd one that doesn't twinkle: bigger, steady, warm
              if (!planet) b *= 0.58 + 0.42 * sin(uT * (0.8 + 5.0 * h3(c + 9.2)) + 6.283 * h3(c + 3.3));   // twinkling, each at its own rate
              else b *= 1.5;
              vec3 tint = planet ? vec3(1.0, 0.92, 0.74) : pick < 0.28 ? vec3(0.66, 0.78, 1.0) : pick < 0.62 ? vec3(0.95, 0.96, 1.0) : pick < 0.82 ? vec3(1.0, 0.93, 0.78) : pick < 0.95 ? vec3(1.0, 0.76, 0.52) : vec3(1.0, 0.56, 0.42);   // blue-white, white, yellow, orange, the odd red giant
              sc += b * tint;
            }
          }
          col += sc * 1.7 * uStar * smoothstep(0.02, 0.3, e);
        }
        float md = dot(d, uMoon);
        if (uMoonK > 0.0) {
          float disc = smoothstep(0.99972, 0.99978, md), mare = 0.78 + 0.22 * smoothstep(-0.3, 0.6, sin(d.x * 140.0 + 1.3) * sin(d.y * 110.0 + d.z * 90.0 + 0.7));
          col = mix(col, vec3(0.86, 0.85, 0.78) * mare * (0.75 + 0.25 * smoothstep(0.99972, 0.99995, md)), disc * uMoonK) + vec3(0.45, 0.52, 0.68) * (pow(max(md, 0.0), 2500.0) * 0.35 + pow(max(md, 0.0), 120.0) * 0.06) * uMoonK;
        }
        col = mix(col, uFogC, uFog * (0.55 + 0.45 * (1.0 - smoothstep(0.0, 0.6, e))));
        gl_FragColor = vec4(col, 1.0);
      }` }));
  dome.layers.set(EXTERIOR_LAYER); dome.frustumCulled = false; dome.renderOrder = 1e6; dome.position.set(0, 0, -50); scene.add(dome);   // (placed out front: it files under "out", see roomSort)
  const zen = new THREE.Color(), grey = new THREE.Color(), white = new THREE.Color(1, 1, 1), city = new THREE.Color(0.035, 0.024, 0.012), glows = [0xff6f9a, 0xff8a3c, 0xff7466].map(c => new THREE.Color(c));
  const cloudGrey = new THREE.Color(), cloudLow = new THREE.Color(0.5, 0.52, 0.56), cloudEm = new THREE.Color();
  return {
    tick(dt, plan) {
      const h = shift.h % 24, L = tod.level, c = WX.clouds, over = Math.max(Math.min(1, WX.k * 1.6), Math.max(0, c - 0.65) / 0.35);
      const a = (h - 5.9) / 14.2 * Math.PI, up = Math.max(0, Math.sin(a));   // the sun on its light's arc, carried on below the horizon at night
      u.uSun.value.set(-16 * Math.cos(a), 30 * Math.sin(a), -8).normalize();
      u.uSunUp.value = Math.max(0, Math.min(1, u.uSun.value.y * 14 + 0.25)) * (1 - over) * (1 - WX.fog * 0.85);
      u.uSunC.value.copy(SUN_C).lerp(SUN_LOW, (1 - up) ** 3);
      grey.setRGB(0.36 * L + 0.02, 0.38 * L + 0.025, 0.42 * L + 0.04);
      u.uHor.value.copy(tod.sky).lerp(white, 0.2 * L).lerp(grey, c * 0.3).add(zen.copy(city).multiplyScalar(1 - L));   // paler down low by day; the town's glow on it at night
      u.uZen.value.copy(tod.sky).multiplyScalar(0.55 + 0.3 * (1 - L)).lerp(grey, over * 0.85);
      const g = Math.max(plan.glowAM * wxBump(h, 5.2, 6.0, 6.7, 7.6), plan.glowPM * wxBump(h, 18.6, 19.4, 20.0, 20.8));
      u.uGlow.value = g * (0.45 + 2.2 * c * (1 - c)) * (1 - over) * (1 - WX.fog * 0.8);
      u.uGlowC.value.copy(glows[plan.glowHue || 0]).multiplyScalar(0.55);
      u.uStar.value = (1 - L) ** 2 * (1 - Math.min(1, c * 1.1 + over)) * (1 - WX.fog);
      u.uMoonK.value = (1 - L) ** 1.5 * (1 - over * 0.9) * (1 - WX.fog * 0.85);
      u.uT.value += dt; u.uFog.value = Math.min(1, WX.fog + WX.k * 0.3);
      TVU.uFogC.value.setRGB(0.5 * L + 0.035, 0.53 * L + 0.04, 0.56 * L + 0.05).lerp(u.uHor.value, 0.25);
      TVU.uFogD.value = WX.fog ** 1.3 * 0.11 + WX.k * (WX.kind === "snow" ? 0.025 : 0.01);
      cloudGrey.setRGB(1, 1, 1).lerp(cloudLow, over * 0.8).lerp(u.uGlowC.value, Math.min(0.6, u.uGlow.value * 0.8));   // greyer under overcast; catching the glow
      mat.cloud.color.copy(cloudGrey);
      const gk = Math.min(1, u.uGlow.value * 1.4);   // their own light: the sky's, all round them (not the grass's green from under), and the glow when there is one
      cloudEm.setRGB(0.3 * L + 0.03, 0.31 * L + 0.035, 0.34 * L + 0.05).multiplyScalar(1 - 0.35 * over);
      mat.cloud.emissive.copy(cloudEm).lerp(glows[plan.glowHue || 0], gk * 0.6); mat.cloud.emissiveIntensity = 1;
    },
    dome, u,
  };
})();
// The clouds: a few to a sky full, as the day has them (overcast in the rain), drifting with the wind up there. One
// draw: every puff's an instance, and only today's clouds are drawn
const wxClouds = (() => {
  const N = 56, X0 = -110, X1 = 120, Z0 = -95, Z1 = 135, clouds = [], puffs = [];
  for (let i = 0; i < N; i++) {
    const n = 5 + Math.floor(Math.random() * 3), cl = { x: X0 + Math.random() * (X1 - X0), y: 15 + Math.random() * 9, z: Z0 + Math.random() * (Z1 - Z0), s: 3.5 + Math.random() * 4.5, p0: puffs.length, n };
    for (let j = 0; j < n; j++) { const t = j / n * 6.28 + Math.random(), r = j ? 0.5 + Math.random() * 0.6 : 0; puffs.push({ ox: Math.cos(t) * r * 1.2, oy: Math.random() * 0.3, oz: Math.sin(t) * r * 0.8, r: j ? 0.45 + Math.random() * 0.35 : 0.9 }); }
    clouds.push(cl);
  }
  mat.cloud.fog = false;                          // (the scene's navy distance haze would ink them in up there; the weather's fog still takes them)
  const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), mat.cloud, puffs.length);
  mesh.layers.set(EXTERIOR_LAYER); mesh.frustumCulled = false; scene.add(mesh);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  return {
    tick(dt, plan) {
      const over = Math.max(Math.min(1, WX.k * 1.6), Math.max(0, WX.clouds - 0.65) / 0.35), v = plan.cloudV * (0.4 + 1.8 * WX.wind) * dt;
      const dx = Math.cos(plan.windDir) * v, dz = Math.sin(plan.windDir) * v, show = Math.round(N * Math.min(1, 0.04 + WX.clouds * 0.96)), grow = 1 + 0.35 * over;
      let k = 0;
      for (let i = 0; i < show; i++) {
        const cl = clouds[i]; cl.x += dx; cl.z += dz;
        if (cl.x > X1) cl.x -= X1 - X0; else if (cl.x < X0) cl.x += X1 - X0;
        if (cl.z > Z1) cl.z -= Z1 - Z0; else if (cl.z < Z0) cl.z += Z1 - Z0;
        for (let j = 0; j < cl.n; j++) {
          const f = puffs[cl.p0 + j], r = f.r * cl.s * grow;
          p.set(cl.x + f.ox * cl.s * grow, cl.y - 1.5 * over + f.oy * cl.s, cl.z + f.oz * cl.s * grow); sc.set(r, r * (0.55 - 0.15 * over), r);
          mesh.setMatrixAt(k++, m4.compose(p, q, sc));
        }
      }
      mesh.count = k; mesh.instanceMatrix.needsUpdate = true;
    },
  };
})();
// ponytail: temporary weather test kit, off for now (WX_KIT_ON = true brings it back); delete this block, its two key hooks (WX_KIT) and the bar goes with it.
// A bar of weathers over the inventory: with nothing in your hands, 1-9 picks one and E sets it for the rest of the day,
// straight to full (the ground already soaked / snowed over, as it would be a few hours in)
const WX_KIT_ON = false;
const WX_KIT = [["☀️", "Clear", "clear", 0, 0, 0, { clouds: 0.05, wind: 0.1 }], ["🌦️", "Drizzle", "rain", 0.3, 0.6, 0, { clouds: 0.85 }], ["🌧️", "Downpour", "rain", 1, 1, 0, { clouds: 1, wind: 0.6 }],
  ["🌨️", "Flurries", "snow", 0.3, 0.2, 0.3, { clouds: 0.8 }], ["❄️", "Blizzard", "snow", 1, 0, 1, { clouds: 1, wind: 0.9 }], ["🌫️", "Fog", "clear", 0, 0.3, 0, { fogAll: 1, clouds: 0.6, wind: 0.05 }],
  ["💨", "Windy", "clear", 0, 0, 0, { wind: 1, clouds: 0.45 }], ["☁️", "Overcast", "clear", 0, 0, 0, { clouds: 1, wind: 0.3 }], ["🌅", "Pink sky", "clear", 0, 0, 0, { clouds: 0.45, glowAM: 1, glowPM: 1, glowHue: 0 }]];
const wxKit = { sel: -1, el: document.body.appendChild(Object.assign(document.createElement("div"), { style: "position:fixed;z-index:11;left:50%;bottom:84px;transform:translateX(-50%);display:flex;gap:6px;pointer-events:none" })) };
function wxKitRender() {
  wxKit.el.innerHTML = WX_KIT.map(([icon, name], i) => `<div style="width:66px;height:58px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#00000060;border:3px solid ${i === wxKit.sel ? "var(--bb-yellow)" : "#ffffff40"};border-radius:4px;transform:translateY(${i === wxKit.sel ? -4 : 0}px);font:bold 10px Arial;color:#fff"><span style="font-size:24px">${icon}</span>${i + 1} ${name}</div>`).join("");
}
function wxKitSelect(i) { wxKit.sel = wxKit.sel === i ? -1 : i; wxKitRender(); }
function wxKitUse() { const [, name, kind, k, wet, cover, sky] = WX_KIT[wxKit.sel]; wxSetNow(name, kind, k, wet, cover, sky); }
function wxSetNow(name, kind, k, wet, cover, sky) {   // this weather for the rest of the day, straight to full (the ground already soaked / snowed over: see the wheel)
  const plan = WX.plan = { ...wxPlan(), kind, from: 0, to: 25, k, fogAll: 0, ...sky };
  Object.assign(WX, { kind: kind === "clear" ? WX.kind : kind, k, wet, cover, fog: plan.fogAll, clouds: plan.clouds, wind: plan.wind });
  SERVICE_ROAD.fx.pond.value = wet;
  toast(`Weather: ${name}`, true);
}
if (WX_KIT_ON) wxKitRender();
function weatherTick(dt) {
  const plan = wxPlan(), h = shift.h, ramp = 0.4;
  const want = plan.kind === "clear" ? 0 : plan.k * Math.max(0, Math.min(1, (h - plan.from) / ramp, (plan.to - h) / ramp));
  if (WX.kind !== plan.kind && WX.k < 0.02) WX.kind = plan.kind === "clear" ? WX.kind : plan.kind;
  WX.k += (want - WX.k) * Math.min(1, dt / 6);
  if (WX.k < 0.001) WX.k = 0;
  const hrs = dt / SHIFT.hour, raining = WX.kind === "rain" ? WX.k : 0, snowing = WX.kind === "snow" ? WX.k : 0;
  WX.wet = Math.max(0, Math.min(1, WX.wet + (raining > 0.15 ? hrs * 2.5 : -hrs * 0.25) + (snowing > 0.15 && WX.cover < 0.1 ? hrs * 0.5 : 0)));   // soaks in fast, dries over hours
  WX.cover = Math.max(0, Math.min(1, WX.cover + (snowing > 0.15 ? hrs * 0.6 * snowing : -hrs * (WX.kind === "rain" ? 0.6 : 0.12))));
  for (const g of WX_GROUND) g.m.color.copy(g.dry).lerp(g.wet, WX.wet).lerp(WX_SNOW, WX.cover * g.snow * 0.85);
  { const fx = SERVICE_ROAD.fx; fx.snow.value = WX.cover; fx.pond.value = Math.max(WX.wet, fx.pond.value - hrs * 0.12); }   // (the service road's potholes hold water long after the rest has dried)
  // the rest of the sky: fog (mornings, some nights, a little with rain), clouds (building ahead of a spell of rain or
  // snow), and the wind, drifting through the day with gusts on top
  const fogWant = plan.fogAll ?? Math.max(h < 12 ? plan.fogAM * Math.max(0, Math.min(1, (plan.fogEnd + 1.2 - h) / 1.2)) : 0, plan.fogPM * Math.max(0, Math.min(1, (h - plan.fogFrom) / 1.5)));
  if (!WX.settled) { WX.settled = true; Object.assign(WX, { fog: fogWant, clouds: plan.clouds, wind: plan.wind }); }   // (coming in: the sky's already the day's, not filling in)
  WX.fog += (Math.min(1, fogWant + 0.12 * raining) - WX.fog) * Math.min(1, dt / 20);
  WX.clouds += (Math.max(plan.clouds, plan.kind !== "clear" && h > plan.from - 1.5 && h < plan.to + 1 ? 0.97 : 0) - WX.clouds) * Math.min(1, dt / 30);
  const F = wxFall; F.uni.uT.value += dt; F.uni.uK.value = WX.k; F.uni.uNight.value = 1 - tod.level;
  WX.wind += (plan.wind * (0.75 + 0.25 * Math.sin(h * 0.9 + plan.day)) + 0.2 * WX.k - WX.wind) * Math.min(1, dt / 8);
  const gt = F.uni.uT.value, gn = 0.5 + 0.25 * Math.sin(gt * 0.31) + 0.15 * Math.sin(gt * 0.83 + 1.3) + 0.1 * Math.sin(gt * 2.1 + 2.1);
  WX.gust = Math.min(1, WX.wind * Math.max(0, gn - 0.35) * 2.2);
  const wv = WX.wind * 5 + WX.gust * 4; F.uni.uWind.value.set(Math.cos(plan.windDir) * wv, Math.sin(plan.windDir) * wv); F.uni.uDrift.value.addScaledVector(F.uni.uWind.value, dt);
  { const c = camera.position, outside = player.onRoof || (roomAt(c.x, c.z) === "out" && !tonyIn(c.x, c.z)), nearOn = outside || c.z < 6 || fireExit.a > 0 || storeExit.a > 0, farOn = c.z < 24 || player.onRoof;   // (deep inside, there's nothing to see it through; behind the buildings, the far box is out of sight)
    TVU.uFogCam.value = outside ? 1 : 0;
    F.rain.visible = raining > 0.01 && farOn; F.rainNear.visible = raining > 0.01 && nearOn; F.snow.visible = snowing > 0.01 && farOn; F.snowNear.visible = snowing > 0.01 && nearOn; }
  wxSky.tick(dt, plan); wxClouds.tick(dt, plan);
  wxGlass.tick(dt, WX.kind === "rain" || WX.wet > 0.3 ? WX.wet : 0, raining); wxDrifts.tick(dt, snowing);
  const now = WX.k > 0.15 ? WX.kind : "clear";     // what to say about it
  if (now !== WX.said && now !== "clear" && WX.said !== null) for (const k of [...custs, ...walkers]) if (k.c && k.c.group.visible && k.c.group.position.z < 0.25 && Math.random() < 0.7) k.c.feelRain();   // is that rain? (snow!) a palm out, a look up
  if (now !== WX.said && WX.said !== null && !(WX.said === "clear" && now === "clear")) logAct(now === "rain" ? "It's started raining" : now === "snow" ? "It's snowing!" : WX.said === "rain" ? "The rain's let up" : "It's stopped snowing");
  WX.said = now;
  for (const k of custs) {                         // umbrellas up out front in the rain, down once they're inside
    if (!k.c || k.kid) continue;
    const z = k.c.group.position.z, out = z < 0.25 && raining > 0.2;
    if (out && !k.umb && !k.c.prop && k.c.outfit.umbOwn) { k.umb = true; k.c.holdProp("umbrella"); }
    else if (!out && k.umb) { k.umb = false; if (k.c.prop === "umbrella") k.c.holdProp(null); }
    if (z > 0.9 && !k.tracked && k.state !== "outside") {   // just in the door: dripping, tracking it in
      k.tracked = true;
      if (k.snow > 0.12 || k.soaked) { k.c.shake(); k.snow *= 0.35; k.soaked = false; }   // brushing the snow off, shaking off the wet
      if ((WX.wet > 0.4 || WX.cover > 0.2) && Math.random() < 0.22) { const p = k.c.group.position; messAdd("puddle", p.x + (Math.random() - 0.5) * 0.8, 1.4 + Math.random() * 1.6); }
    }
  }
}
