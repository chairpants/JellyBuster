// ---- Tony's from outside: the building next door, and its roof as seen from ours. Both are called from the roof's
// block (store/roof.js), with the helpers of its they use ----
function tonyOutside({ lam, put, ext, beige, cement, coping }) {                                                // Tony's, next door: brick, a striped awning, a glass front you can see in through, its own little AC unit
  const px0 = 13, px1 = 21, pz1 = 14, ph = 4.3, brick = wallSurface(lam(0xb0553f), "brick"), p = new THREE.Group(); scene.add(p);
  roof.pizzaWin = new THREE.MeshBasicMaterial({ color: 0x2a2f36 });   // (roofTick still sets it: nothing wears it now the windows are glass)
  const W = 0.15, dl = PIZZA_DOOR[0] - 0.6, dr = PIZZA_DOOR[0] + 0.6, DH = 2.3, WY = [0.5, 2.4], WIN = [[13.4, 15.0], [16.3, 20.6]];
  // hollow (see tonyInside): the walls' inside faces are painted in the shader (tonys/light.js), so nothing's laid over them to flicker
  const inner = tonyLit({ kind: "WALL" }), face = (m, i) => { const ms = Array(6).fill(brick); ms[i] = m; return ms; };
  const wallBox = (x0, x1, y0, y1, z0, z1, mats) => put(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mats, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, p);
  for (const [x0, x1, y0, y1] of [[px0, WIN[0][0], 0, ph], [WIN[0][0], WIN[0][1], 0, WY[0]], [WIN[0][0], WIN[0][1], WY[1], ph], [dl, dr, DH, ph],
    [dr, WIN[1][0], 0, ph], [WIN[1][0], WIN[1][1], 0, WY[0]], [WIN[1][0], WIN[1][1], WY[1], ph], [WIN[1][1], px1, 0, ph]]) wallBox(x0, x1, y0, y1, 0, W, face(inner, 4));
  wallBox(px0, px0 + W, 0, ph, W, pz1 - W, face(inner, 0)); wallBox(px1 - W, px1, 0, ph, W, pz1 - W, face(inner, 1));   // (the sides stop short of the front and back: no doubled faces at the corners)
  { const a = TONY_BACK.x - TONY_BACK.w / 2, b = TONY_BACK.x + TONY_BACK.w / 2;   // the back wall, with the door to the yard in it
    wallBox(px0, a, 0, ph, pz1 - W, pz1, face(inner, 5)); wallBox(b, px1, 0, ph, pz1 - W, pz1, face(inner, 5)); wallBox(a, b, DOOR_H, ph, pz1 - W, pz1, face(inner, 5)); }
  put(new THREE.BoxGeometry(px1 - px0 - 2 * W, 0.05, pz1 - 2 * W), brick, (px0 + px1) / 2, ph - 0.025, pz1 / 2, p);
  put(new THREE.BoxGeometry(px1 - px0 + 0.1, 0.08, pz1 + 0.1), coping, (px0 + px1) / 2, ph + 0.04, pz1 / 2, p);
  // the glass, in aluminum frames (a mullion or two), and a sill outside
  const glass = new THREE.MeshBasicMaterial({ color: 0xbcd6e6, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }), alu = lam(0xb8bdc2); tony.glass = glass;
  for (const [x0, x1] of WIN) {
    const gl = put(new THREE.PlaneGeometry(x1 - x0, WY[1] - WY[0]), glass, (x0 + x1) / 2, (WY[0] + WY[1]) / 2, 0.075, p); gl.renderOrder = 2;
    const n = Math.round((x1 - x0) / 1.4);
    for (let k = 0; k <= n; k++) put(new THREE.BoxGeometry(0.05, WY[1] - WY[0], 0.07), alu, x0 + 0.025 + (x1 - x0 - 0.05) * k / n, (WY[0] + WY[1]) / 2, 0.075, p);
    for (const y of WY) put(new THREE.BoxGeometry(x1 - x0, 0.05, 0.07), alu, (x0 + x1) / 2, y + (y === WY[0] ? 0.025 : -0.025), 0.075, p);
    put(new THREE.BoxGeometry(x1 - x0 + 0.1, 0.05, 0.12), cement, (x0 + x1) / 2, WY[0] - 0.025, -0.06, p);
  }
  { const hinge = new THREE.Group(); hinge.position.set(dl, 0, 0.17); hinge.rotation.y = -1.35; p.add(hinge);   // the door: glass in an aluminum frame, propped open while they're open (see tonyDayTick)
    for (const [w2, h2, x, y] of [[0.07, 2.25, 0.035, 1.125], [0.07, 2.25, 1.115, 1.125], [1.15, 0.07, 0.575, 2.215], [1.15, 0.22, 0.575, 0.11], [1.0, 0.04, 0.575, 1.05]]) put(new THREE.BoxGeometry(w2, h2, 0.04), alu, x, y, 0, hinge);
    const dg = put(new THREE.PlaneGeometry(1.01, 1.93), glass, 0.575, 1.185, 0, hinge); dg.renderOrder = 2;
    const shut = textPlane("CLOSED", 0.5, 0.2, "#ffffff", "#a01818", "Arial Black", 220); shut.position.set(0.575, 1.42, -0.025); shut.rotation.y = Math.PI; shut.visible = false; hinge.add(shut); tony.door = hinge; tony.closedSign = shut; }
  // the awning: red and white stripes, sloping out over the walk, a scalloped edge hanging off the front
  const stripes = makeTexture((ctx, w2, h2) => { for (let i = 0; i < 16; i++) { ctx.fillStyle = i % 2 ? "#f4f1e6" : "#b3202a"; ctx.fillRect(i * w2 / 16, 0, w2 / 16, h2); } }, 256, 32);
  const awnM = new THREE.MeshLambertMaterial({ map: stripes, side: THREE.DoubleSide });
  const awn = put(new THREE.PlaneGeometry(px1 - px0 + 0.2, 1.19), awnM, (px0 + px1) / 2, 2.825, -0.55, p); awn.rotation.x = 1.18;
  const val = makeTexture((ctx, w2, h2) => { for (let i = 0; i < 16; i++) { ctx.fillStyle = i % 2 ? "#f4f1e6" : "#b3202a"; ctx.beginPath(); ctx.moveTo(i * w2 / 16, 0); ctx.lineTo((i + 1) * w2 / 16, 0); ctx.lineTo((i + 1) * w2 / 16, h2 * 0.6); ctx.arc((i + 0.5) * w2 / 16, h2 * 0.6, w2 / 32, 0, Math.PI); ctx.fill(); } }, 256, 32);
  const vm = new THREE.MeshLambertMaterial({ map: val, side: THREE.DoubleSide, transparent: true, alphaTest: 0.5 });
  put(new THREE.PlaneGeometry(px1 - px0 + 0.2, 0.28), vm, (px0 + px1) / 2, 2.46, -1.1, p);
  const sign = textPlane("TONY'S PIZZA", 4.2, 0.7, "#ffffff", "#b3202a", "Arial Black", 90); sign.position.set((px0 + px1) / 2, 3.6, -0.012); sign.rotation.y = Math.PI; p.add(sign);
  put(new THREE.BoxGeometry(1.6, 0.9, 1.1), beige, 18, ph + 0.45, 8, p);
  ext(p);
  tonyInside(px0 + W, px1 - W, W, pz1 - W);
  tony.backDoor = makeDoor({ at: pz1 - W / 2, c: TONY_BACK.x, alongX: true, hinge: 1, swing: 1, leafMat: tonyLit({ kind: "LEAF", color: 0x37322d }), w: TONY_BACK.w, signs: [{ text: "DELIVERIES", side: 1 }, { text: "KEEP SHUT", side: -1 }] });
  tonyYard(ext);
}
// ---- Tony's roof, seen from ours: gravel inside a low parapet, the pizza oven's flue (smoking while they're open: see
// roofTick) and the kitchen hood's exhaust fan ----
function tonyRoof({ lam, phong, put, bx, cy, ext, V, alum, gravel, coping, shade }) {
    const px0 = 13, px1 = 21, pz1 = 14, ph = 4.3, t = new THREE.Group(); scene.add(t);
    const sh = new THREE.Shape([[px0 + 0.15, -0.15], [px1 - 0.15, -0.15], [px1 - 0.15, -pz1 + 0.15], [px0 + 0.15, -pz1 + 0.15]].map(([x, z]) => new THREE.Vector2(x, z)));
    const top = put(new THREE.ShapeGeometry(sh), gravel, 0, ph + 0.085, 0, t); top.rotation.x = -Math.PI / 2;
    for (const [w, d, x, z] of [[px1 - px0, 0.15, (px0 + px1) / 2, 0.075], [px1 - px0, 0.15, (px0 + px1) / 2, pz1 - 0.075], [0.15, pz1, px0 + 0.075, pz1 / 2], [0.15, pz1, px1 - 0.075, pz1 / 2]]) bx(w, 0.3, d, coping, x, ph + 0.2, z, t);
    const black = phong(0x1e1e1f, 40), fx = 19.6, fz = 11.5;
    cy(0.17, 0.17, 1.9, black, fx, ph + 0.95, fz, 14, t); cy(0.3, 0.3, 0.05, black, fx, ph + 0.12, fz, 16, t);   // the flue and its storm collar
    for (let k = 0; k < 3; k++) { const a = k * 2.09; bx(0.02, 0.18, 0.02, black, fx + Math.cos(a) * 0.15, ph + 1.98, fz + Math.sin(a) * 0.15, t); }
    const capG = new THREE.ConeGeometry(0.32, 0.18, 16); put(capG, black, fx, ph + 2.16, fz, t);   // its rain cap on standoffs
    put(new THREE.CylinderGeometry(0.35, 0.35, 0.03, 16), lam(0x2a2422), fx, ph + 0.09, fz, t);
    const hx = 15.8, hz = 11.2;                                           // the hood fan: curb, housing, the flared spun-aluminium top
    bx(0.8, 0.3, 0.8, lam(0x8a877f), hx, ph + 0.15, hz, t); cy(0.26, 0.3, 0.35, alum, hx, ph + 0.47, hz, 18, t); cy(0.42, 0.26, 0.16, alum, hx, ph + 0.72, hz, 18, t);
    put(new THREE.CircleGeometry(0.75, 20), new THREE.MeshBasicMaterial({ color: 0x1a1612, transparent: true, opacity: 0.35, depthWrite: false }), hx, ph + 0.1, hz, t).rotation.x = -Math.PI / 2;   // years of grease round it
    shade(18, 8, 2.1, 1.6, 0, t, ph + 0.085);
    ext(t);
    // the smoke: soft puffs out of the cap, rising and spreading, carried off with the wind
    const N = 96, pos = new Float32Array(N * 3), aA = new Float32Array(N), aS = new Float32Array(N), geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("aA", new THREE.BufferAttribute(aA, 1)); geo.setAttribute("aS", new THREE.BufferAttribute(aS, 1));
    const sm = new THREE.ShaderMaterial({ uniforms: { uCol: { value: new THREE.Color(0xbbbbbb) }, uScale: { value: 400 } }, transparent: true, depthWrite: false,
      vertexShader: `attribute float aA; attribute float aS; varying float vA; uniform float uScale;
        void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aS * uScale / max(0.5, -mv.z); vA = aA; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uCol; varying float vA; void main() { float r = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.05, r); gl_FragColor = vec4(uCol, a * a * vA); }` });
    const pts = new THREE.Points(geo, sm); pts.frustumCulled = false; pts.layers.set(EXTERIOR_LAYER); scene.add(pts);
    roof.smoke = { pts, geo, sm, p: [], acc: 0, at: V(fx, ph + 2.2, fz) };
}
