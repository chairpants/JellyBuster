// ---- the service road: one sheet of old asphalt round both buildings, laid out by SERVICE_ROAD (store/core.js). What's happened to it is
// drawn to two canvases over its whole plan, in metres: what colour it is (patches, oil, tire polish, faded paint, the shade along walls), and
// where it's broken (R: cracks, G: alligatoring, B: potholes). The shader reads the second like a distance field, so a crack stays a
// crisp, ragged line however close you stand, and looks into a pothole with a little parallax. Then the stockade fence that shuts
// it in, jersey barriers where trucks have been hitting things, bollards, the turning island's curb, weeds, and what gets left round the back of a business.
// Called from buildGrounds (exterior/grounds.js) ----
// ---- the lettering out back: drawn stroke by stroke, narrow and square-shouldered like a sign shop's or a road crew's stencil, so it's the same on every machine (no installed font) ----
const SIGN_GLYPHS = (() => {
  const OC = [[1, 0.2], [0.75, 0], [0.25, 0], [0, 0.25], [0, 0.75], [0.25, 1], [0.75, 1], [1, 0.8]];
  return { A: [[[0, 1], [0.5, 0], [1, 1]], [[0.18, 0.68], [0.82, 0.68]]], C: [["~", ...OC]], D: [[[0, 0], [0, 1]], ["~", [0, 0], [0.55, 0], [1, 0.22], [1, 0.78], [0.55, 1], [0, 1]]],
    E: [[[1, 0], [0, 0], [0, 1], [1, 1]], [[0, 0.48], [0.78, 0.48]]], F: [[[1, 0], [0, 0], [0, 1]], [[0, 0.48], [0.78, 0.48]]], G: [["~", ...OC.slice(0, -1), [1, 0.75], [1, 0.56]], [[0.55, 0.56], [1, 0.56]]],
    H: [[[0, 0], [0, 1]], [[1, 0], [1, 1]], [[0, 0.48], [1, 0.48]]], I: [[[0.5, 0], [0.5, 1]]], K: [[[0, 0], [0, 1]], [[1, 0], [0, 0.6]], [[0.32, 0.4], [1, 1]]], L: [[[0, 0], [0, 1], [1, 1]]],
    M: [[[0, 1], [0, 0], [0.5, 0.7], [1, 0], [1, 1]]], N: [[[0, 1], [0, 0], [1, 1], [1, 0]]], O: [["~", [0.5, 0], [1, 0.02], [1, 0.98], [0.5, 1], [0, 0.98], [0, 0.02], [0.5, 0]]], P: [[[0, 1], [0, 0]], ["~", [0, 0], [0.7, 0], [1, 0.14], [1, 0.42], [0.7, 0.56], [0, 0.56]]],
    R: [[[0, 1], [0, 0]], ["~", [0, 0], [0.7, 0], [1, 0.13], [1, 0.4], [0.7, 0.52], [0, 0.52]], [[0.5, 0.52], [1, 1]]], S: [["~", [1, 0.18], [0.72, 0], [0.25, 0], [0, 0.22], [0.25, 0.46], [0.75, 0.54], [1, 0.78], [0.75, 1], [0.25, 1], [0, 0.82]]],
    T: [[[0, 0], [1, 0]], [[0.5, 0], [0.5, 1]]], U: [["~", [0, 0], [0, 0.8], [0.3, 1], [0.7, 1], [1, 0.8], [1, 0]]], V: [[[0, 0], [0.5, 1], [1, 0]]], W: [[[0, 0], [0.25, 1], [0.5, 0.3], [0.75, 1], [1, 0]]], X: [[[0, 0], [1, 1]], [[1, 0], [0, 1]]], Y: [[[0, 0], [0.5, 0.5], [1, 0]], [[0.5, 0.5], [0.5, 1]]], Z: [[[0, 0], [1, 0], [0, 1], [1, 1]]],
    4: [[[0.75, 1], [0.75, 0], [0, 0.68], [1, 0.68]]], 9: [["~", [1, 0.35], [0.7, 0.56], [0.25, 0.56], [0, 0.3], [0.25, 0], [0.75, 0], [1, 0.3], [1, 0.72], [0.7, 1], [0.2, 1]]], "'": [[[0.5, 0], [0.4, 0.28]]] };
})();
const signWide = c => c === "I" || c === "'" ? 0.2 : c === "M" || c === "W" ? 0.86 : 0.62;   // how wide a letter is, for its height
function signTextWidth(text, h) { let w = 0; for (const c of text) w += (c === " " ? 0.42 : signWide(c) + 0.17) * h; return w - 0.17 * h; }
// draws text centred on x, y (h: cap height; weight: the stroke, for that height; jit: a shaky hand). In whatever units ctx is scaled to
function signText(ctx, text, x, y, h, { weight = 0.15, jit = 0, round = false, r = Math.random } = {}) {
  let cx = x - signTextWidth(text, h) / 2; ctx.lineWidth = h * weight; ctx.lineCap = round ? "round" : "butt"; ctx.lineJoin = round ? "round" : "miter"; ctx.miterLimit = 2.5;
  const j = () => (r() - 0.5) * jit * h;
  for (const c of text) {
    if (c === " ") { cx += 0.42 * h; continue; }
    const w = signWide(c) * h, top = y - h / 2 + (jit ? j() : 0);
    for (const st of SIGN_GLYPHS[c] || []) {
      const smooth = st[0] === "~", pts = (smooth ? st.slice(1) : st).map(([a, b]) => [cx + a * w + (jit ? j() : 0), top + b * h + (jit ? j() : 0)]);
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      if (smooth) { for (let i = 1; i < pts.length - 1; i++) ctx.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2); ctx.lineTo(...pts[pts.length - 1]); }
      else for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    }
    cx += w + 0.17 * h;
  }
}
// a sheet-metal sign that's been outside since it went up, lit by whatever's lighting that spot like everything else (no glow): paint chalked by the sun, chips down to bare steel, rust bleeding from its bolts, road grime up from the bottom edge, one corner bent
function weatheredSign(text, w, h, { fg = "#8e2018", bg = "#d6d0bd", seed = 1, bent = 0.03 } = {}) {
  const r = seeded(seed), W = 512, H = Math.round(W * h / w);
  const tex = makeTexture(ctx => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = fg; ctx.lineWidth = 5; ctx.strokeRect(13, 13, W - 26, H - 26);
    ctx.strokeStyle = fg; const lines = text.split("\n"), avail = W - 76, rows = lines.length; let cap = Math.min((H - 54) / (rows * 1.32), 200); for (const l of lines) cap = Math.min(cap, avail / (signTextWidth(l, 1)));
    lines.forEach((l, i) => signText(ctx, l, W / 2, H / 2 + (i - (rows - 1) / 2) * cap * 1.32, cap, { weight: 0.2 }));
    const blot = (x, y, rad, c, a) => { const g = ctx.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, `rgba(${c},${a})`); g.addColorStop(1, `rgba(${c},0)`); ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2); };
    { const g = ctx.createLinearGradient(r() * W, 0, r() * W, H); g.addColorStop(0, `rgba(238,232,214,${0.22 + r() * 0.2})`); g.addColorStop(1, "rgba(238,232,214,0.04)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }   // chalked by the sun, worse toward the top
    for (let i = 0; i < 26; i++) blot(r() * W, r() * H, 26 + r() * 90, r() < 0.5 ? "232,226,206" : "70,60,44", 0.04 + r() * 0.1);   // blotched
    for (let i = 0; i < 26; i++) { ctx.strokeStyle = `rgba(${r() < 0.6 ? "226,220,202" : "40,34,28"},${0.12 + r() * 0.26})`; ctx.lineWidth = 0.7 + r() * 1.3; const x = r() * W, y = r() * H; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 120, y + (r() - 0.5) * 34); ctx.stroke(); }   // scratched
    { const g = ctx.createLinearGradient(0, H, 0, H * 0.55); g.addColorStop(0, "rgba(50,40,28,0.5)"); g.addColorStop(1, "rgba(50,40,28,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }   // road grime up from the bottom
    for (let i = 0; i < 14; i++) {                  // chips, to bare steel, each with its halo of rust
      const edge = r() < 0.6, x = edge ? (r() < 0.5 ? r() * 28 : W - r() * 28) : r() * W, y = edge ? r() * H : r() * H, sz = 3 + r() * r() * 16;
      blot(x, y, sz * 2.6, "112,58,24", 0.5); ctx.fillStyle = r() < 0.5 ? "#6d4426" : "#74767a"; ctx.beginPath(); for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28, d = sz * (0.55 + r() * 0.65); ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7); } ctx.closePath(); ctx.fill();
    }
    for (const [x, y] of [[30, 30], [W - 30, 30], [30, H - 30], [W - 30, H - 30]]) {   // its bolts, and the rust running down from them
      for (let k = 0; k < 5; k++) { const dx = x + (r() - 0.5) * 10, L = 18 + r() * H * 0.45, g = ctx.createLinearGradient(0, y, 0, y + L); g.addColorStop(0, `rgba(104,52,20,${0.3 + r() * 0.34})`); g.addColorStop(1, "rgba(104,52,20,0)"); ctx.fillStyle = g; ctx.fillRect(dx - 1, y, 2 + r() * 5, L); }
      blot(x, y, 14, "92,44,16", 0.75); ctx.fillStyle = "#2c2622"; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); ctx.fillStyle = "rgba(170,160,146,0.6)"; ctx.beginPath(); ctx.arc(x - 1, y - 1, 2, 0, 7); ctx.fill();
    }
  }, W, H);
  const geo = new THREE.PlaneGeometry(w, h, 6, 3), pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const dx = (pos.getX(i) / (w / 2) + 1) / 2, dy = (1 - pos.getY(i) / (h / 2)) / 2; pos.setZ(i, bent * Math.max(0, dx - 0.72) / 0.28 * Math.max(0, dy - 0.45) / 0.55 + 0.003 * Math.sin(dx * 7 + seed)); }   // (a corner bent out where something clipped it, a ripple in the sheet)
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex }));
}
function buildServiceRoad({ lam, ext }) {
  const SR = SERVICE_ROAD, X0 = -18, X1 = 29, Z0 = -0.5, Z1 = 55, TW = 2048, TH = Math.round(TW * (Z1 - Z0) / (X1 - X0)), K = TW / (X1 - X0);   // the plan's edges; the canvases (about 2.3 cm a pixel)
  const R = seeded(19941), rr = (a, b) => a + R() * (b - a), pick = a => a[Math.floor(R() * a.length)];
  const g = new THREE.Group(); scene.add(g);
  const trace = (ctx, pts, close) => { ctx.beginPath(); pts.forEach(([x, z], i) => i ? ctx.lineTo(x, z) : ctx.moveTo(x, z)); if (close) ctx.closePath(); };
  const paved = SR.ring(0), { ISLAND: IS, arc } = SR, LN = SR.LINE, CZ = SR.CZ;

  // ---- where the trucks go: their wheels' lines polish the asphalt, and where a loaded axle turns or stops, it breaks ----
  const LANE = (SR.BACK + 48.6) / 2;               // down the middle of the run behind the theater
  const LOOP = [[-14, 0], [-14, CZ], ...arc(-10, CZ, 4, Math.PI, Math.PI / 2, 8), [IS.x, LANE], ...arc(IS.x, IS.z, LANE - IS.z, Math.PI / 2, 0, 14), [13, 30.2]],
    HAMMER = [[12.9, 41], [10, 38.6], [6, 37.6], [3.4, 37.5]],
    OUT = [[6, 37.6], [12, 38], [20, 38], [24, 35], [25.2, 30], [25.2, 0]],   // backed out of the hammerhead, east across the apron and away down the east lane
    TONYS = [[7, LANE], [11, 49.2], [14, 46], [15.45, 42], [15.45, 19.5]], BACKOUT = [[15.45, 22], [15.6, 33], [18, 38]];
  const offset = (pts, d) => pts.map(([x, z], i) => { const [ax, az] = pts[Math.max(0, i - 1)], [bx, bz] = pts[Math.min(pts.length - 1, i + 1)], L = Math.hypot(bx - ax, bz - az) || 1; return [x - (bz - az) / L * d, z + (bx - ax) / L * d]; });
  const wheelLines = [LOOP, OUT, TONYS, BACKOUT, HAMMER];

  // ---- what's broken, worked out once: the same list draws both canvases ----
  const cracks = [], seals = [];
  const crack = (x, z, a, len, w = 0.03, branch = 2, wiggle = 0.4) => {
    const pts = [[x, z]]; let L = 0;
    while (L < len) { const st = rr(0.16, 0.42); a += (R() - 0.5) * wiggle; x += Math.cos(a) * st; z += Math.sin(a) * st; pts.push([x, z]); L += st;
      if (branch > 0 && R() < 0.05) crack(x, z, a + (R() < 0.5 ? -1 : 1) * rr(0.6, 1.3), len * rr(0.15, 0.4), w * 0.65, branch - 1, wiggle * 1.2); }
    cracks.push({ pts, w }); return pts;
  };
  for (let z = 3; z < 44; z += rr(5, 8.5)) crack(-16.2, z, rr(-0.14, 0.14), 4.6, rr(0.022, 0.04));          // across the west lane, every few metres: the road shrinks
  for (let z = 2.5; z < 46; z += rr(5, 8.5)) crack(27.4, z, Math.PI + rr(-0.14, 0.14), 4.6, rr(0.022, 0.04));   // the east lane
  for (let x = -8; x < 8; x += rr(4.5, 8)) crack(x, SR.BACK, -Math.PI / 2 + rr(-0.12, 0.12), 4.2, rr(0.022, 0.04));   // the back
  for (let z = 20; z < 41; z += rr(3.5, 6.5)) crack(11.1, z, rr(-0.1, 0.1), rr(8, 16.5), rr(0.022, 0.036));         // the alley, and on across the apron behind Tony's
  { const s1 = crack(-13.9, 0.2, Math.PI / 2, 46, 0.034, 3, 0.16), s2 = crack(25.3, 0.2, Math.PI / 2, 46, 0.034, 3, 0.16); crack(-10, LANE, 0, 14, 0.032, 3, 0.15); crack(14.5, 19, Math.PI / 2, 24, 0.03, 3, 0.2); crack(18, 18.6, Math.PI / 2, 22, 0.03, 2, 0.14);   // the paver's seams, down the middle of each run, opened up
    seals.push({ pts: s1.slice(30, 96), w: 0.075 }, { pts: s2.slice(60, 120), w: 0.07 }); }
  for (let i = 0; i < 34; i++) crack(rr(3, 26), rr(30, 50), rr(0, 6.28), rr(1, 3.8), rr(0.016, 0.032), 2, 0.6);   // the junction behind the buildings, where everything turns
  for (let i = 0; i < 12; i++) crack(rr(2.5, 11), rr(35.5, 40.7), rr(0, 6.28), rr(0.8, 2.6), rr(0.016, 0.03), 2, 0.7);   // the hammerhead
  for (let i = 0; i < 20; i++) { const west = R() < 0.5; crack(west ? rr(-16, -12) : rr(23.2, 27.2), rr(1, 47), rr(0, 6.28), rr(0.6, 2.4), rr(0.014, 0.026), 1, 0.7); }   // and the odd wandering one
  for (let k = 0; k < 7; k++) { const c = pick(cracks.filter(c => c.pts.length > 10 && c.w > 0.022)), i = Math.floor(R() * (c.pts.length - 8)); seals.push({ pts: c.pts.slice(i, i + 8 + Math.floor(R() * 10)), w: rr(0.05, 0.09) }); }   // tar poured down the worst of them, one summer
  const ALLIGATOR = [[12.9, 36.9, 2.5], [16.1, 30, 1.9], [15.4, 20.8, 1.9], [9.7, 47.6, 2.6], [-14.2, 44.6, 2], [-13.2, 10, 1.6], [25, 33, 1.9], [25.6, 8, 1.4], [-2, 51, 2.1], [14.2, 46.4, 1.8], [5, 38.1, 1.8], [21, 37.8, 1.6]];   // under the wheels: x, z, how far
  const POTHOLES = [[12.2, 37.2, 0.33], [13.6, 36.3, 0.21], [9.8, 47.3, 0.44], [10.6, 46.6, 0.2], [15.8, 21.2, 0.29], [15, 22, 0.16], [-14.7, 44.1, 0.37], [-13.6, 43.2, 0.2], [-2.3, 50.6, 0.39], [-1.7, 51.4, 0.18], [25.4, 32.6, 0.35], [14.4, 46.2, 0.3], [25, 7.5, 0.24], [-13.2, 10.2, 0.2], [5.2, 38.2, 0.26], [21.2, 37.7, 0.25]];
  const PATCHES = [[-14.6, 28, 3.2, 1.8, 0.02, 0], [-13, 14, 2, 1.3, -0.03, 1], [1, 51, 2.4, 2.2, 0, 0], [22, 33.5, 3, 1.6, 0.04, 1], [25.2, 20, 2.2, 3, 0, 0], [13.5, 42.5, 3.4, 2.2, -0.05, 1], [16, 26, 1.8, 2.8, 0.02, 0], [7, 37.5, 2.6, 1.6, 0.03, 1],
    [-1.5, 52, 20, 0.55, 0, 1], [-14.05, 36, 4.3, 0.62, 0, 0], [-5.8, 51.8, 1.7, 1.25, 0, 0]];   // saw-cut and filled, some long since (last: 1, gone pale): x, z, w, d, turned, old. A long utility trench along the back; one over the west lane
  const PAD = { x0: 11.1, x1: 14.95, z0: 29.3, z1: 35.3 };   // poured concrete where the truck's front wheels take the dumpster's weight: asphalt doesn't last there
  const rectPath = (ctx, x, z, w, d, a) => { ctx.save(); ctx.translate(x, z); ctx.rotate(a); ctx.beginPath(); ctx.rect(-w / 2, -d / 2, w, d); ctx.restore(); };
  const toWorld = ctx => { ctx.scale(K, K); ctx.translate(-X0, -Z0); };

  // ---- what colour it is ----
  const blot = (ctx, x, z, r, c, a, sx = 1, sz = 1, turn = 0) => { const gd = ctx.createRadialGradient(0, 0, 0, 0, 0, r); gd.addColorStop(0, `rgba(${c},${a})`); gd.addColorStop(0.55, `rgba(${c},${a * 0.72})`); gd.addColorStop(1, `rgba(${c},0)`);
    ctx.save(); ctx.translate(x, z); ctx.rotate(turn); ctx.scale(sx, sz); ctx.fillStyle = gd; ctx.fillRect(-r, -r, 2 * r, 2 * r); ctx.restore(); };
  const shade = (ctx, pts, w, a = 0.2) => { ctx.lineCap = "round"; ctx.lineJoin = "round"; for (const k of [1, 0.7, 0.45, 0.22]) { ctx.strokeStyle = `rgba(8,8,10,${a / 4})`; ctx.lineWidth = w * k; trace(ctx, pts); ctx.stroke(); } };
  const paint = (ctx, x0, z0, x1, z1) => { for (let i = 0, n = (x1 - x0) * (z1 - z0) * 26; i < n; i++) { ctx.fillStyle = `rgba(${pick(["72,74,77", "64,66,69", "78,79,80"])},${rr(0.3, 0.9)})`; ctx.beginPath(); ctx.ellipse(rr(x0, x1), rr(z0, z1), rr(0.015, 0.1), rr(0.012, 0.05), R() * 3, 0, 7); ctx.fill(); } };   // and the paint's worn off in flecks: asphalt showing through
  const stencil = (ctx, text, x, z, turn, h, col = "rgba(216,178,48,0.62)") => { ctx.save(); ctx.translate(x, z); ctx.rotate(turn); ctx.strokeStyle = col; signText(ctx, text, 0, 0, h, { weight: 0.2, r: R }); ctx.restore(); const w = signTextWidth(text, h), e = Math.max(w, h) / 2 + 0.05; paint(ctx, x - e, z - e, x + e, z + e); };
  const albedo = makeTexture((ctx) => {
    toWorld(ctx);
    ctx.fillStyle = "#6e675a"; ctx.fillRect(X0, Z0, X1 - X0, Z1 - Z0);   // the shoulder, to the fence: dirt and road grit, then gravel
    for (let i = 0; i < 9000; i++) { ctx.fillStyle = `rgba(${pick(["142,134,118", "92,86,74", "60,55,47", "170,160,142", "105,110,92"])},${rr(0.2, 0.75)})`; ctx.beginPath(); ctx.ellipse(rr(X0, X1), rr(Z0, Z1), rr(0.012, 0.05), rr(0.01, 0.035), R() * 3, 0, 7); ctx.fill(); }
    ctx.save(); trace(ctx, paved, true); ctx.fillStyle = "#505256"; ctx.fill(); ctx.clip();
    for (const [x0, x1, z0, z1, c] of [[-16.2, -13.9, 0, 54, "83,85,88"], [-13.9, -11, 0, 54, "76,78,81"], [-16, 28, 50.6, 54, "75,77,79"], [-10, 18, 48, 50.6, "84,85,88"], [25.3, 28, 0, 54, "80,81,84"], [11, 14.5, 14, 48, "85,86,88"], [14.5, 18, 14, 48, "76,78,81"], [18, 25.3, 18, 48, "66,67,70"], [2, 11, 35, 41, "88,88,88"]]) { ctx.fillStyle = `rgba(${c},0.75)`; ctx.fillRect(x0, z0, x1 - x0, z1 - z0); }   // laid a pass at a time, and not all in the same year
    for (let i = 0; i < 300; i++) blot(ctx, rr(X0, X1), rr(Z0, Z1), rr(0.6, 3.6), pick(["42,42,44", "108,108,104", "60,60,58", "118,114,104"]), rr(0.05, 0.16), 1, rr(0.5, 1), R() * 3);   // years of sun and whatever's dripped
    for (const line of wheelLines) for (const s of [-0.95, 0.95]) { const p = offset(line, s); ctx.lineCap = "round"; ctx.lineJoin = "round"; for (const [w, a] of [[0.9, 0.05], [0.55, 0.07], [0.3, 0.07]]) { ctx.strokeStyle = `rgba(26,26,28,${a})`; ctx.lineWidth = w; trace(ctx, p); ctx.stroke(); } }   // the wheel lines, polished dark
    for (const [x, z, w, d, a, old] of PATCHES) { rectPath(ctx, x, z, w, d, a); ctx.fillStyle = old ? "#5d5c58" : "#2f3032"; ctx.fill(); for (let k = 0; k < w * d * 10; k++) blot(ctx, x + rr(-w / 2, w / 2) * Math.cos(a), z + rr(-d / 2, d / 2), rr(0.1, 0.45), old ? "78,77,72" : "62,62,62", 0.2);
      ctx.strokeStyle = "rgba(14,14,14,0.65)"; ctx.lineWidth = 0.035; rectPath(ctx, x, z, w, d, a); ctx.stroke(); }
    { const { x0, x1, z0, z1 } = PAD; ctx.fillStyle = "#8c8a83"; ctx.fillRect(x0, z0, x1 - x0, z1 - z0); for (let i = 0; i < 90; i++) blot(ctx, rr(x0, x1), rr(z0, z1), rr(0.1, 0.9), pick(["58,54,48", "120,116,106", "150,146,136"]), rr(0.08, 0.26)); ctx.strokeStyle = "rgba(30,30,28,0.6)"; ctx.lineWidth = 0.03; ctx.strokeRect(x0, z0, x1 - x0, z1 - z0); }
    // what's leaked: the dumpster's juice, running off its pad to the drain; oil where things sat; a trail of hydraulic fluid behind the truck
    for (const [w, a] of [[0.85, 0.1], [0.5, 0.18], [0.22, 0.3]]) { ctx.strokeStyle = `rgba(30,24,14,${a})`; ctx.lineWidth = w; ctx.lineCap = "round"; trace(ctx, [[12.7, 29.5], [12.9, 30.5], [13.4, 31.3], [13.3, 32.3], [14, 33.2], [14.45, 34.2], [14.6, 35.9]]); ctx.stroke(); }
    for (const [x, z, r, a] of [[12.7, 30, 1, 0.55], [13.3, 30.8, 0.65, 0.42], [11.8, 30.4, 0.55, 0.4], [15.6, 19.9, 0.75, 0.5], [16.4, 19, 0.5, 0.42], [-14.3, 20.5, 0.72, 0.55], [-13.7, 21.4, 0.36, 0.5], [25.1, 33, 0.6, 0.48], [8.6, 38.3, 0.68, 0.5], [0, 50.9, 0.5, 0.45], [18.8, 41, 0.8, 0.42], [-5.6, 49.9, 0.45, 0.48], [26.1, 14.3, 0.42, 0.42]]) { blot(ctx, x, z, r, "14,12,10", a, 1, rr(0.65, 1), R() * 3); blot(ctx, x + rr(-0.2, 0.2), z + rr(-0.2, 0.2), r * 0.45, "6,6,6", a * 0.8); }
    for (const line of [LOOP, OUT, TONYS]) for (let i = 1; i < line.length; i++) { const [ax, az] = line[i - 1], [bx, bz] = line[i], L = Math.hypot(bx - ax, bz - az); for (let t = rr(0, 1); t < L; t += rr(0.5, 2.2)) if (R() < 0.8) blot(ctx, ax + (bx - ax) * t / L + rr(-0.16, 0.16), az + (bz - az) * t / L + rr(-0.16, 0.16), rr(0.025, 0.09), "10,9,8", rr(0.4, 0.85)); }
    blot(ctx, 16.4, 18.9, 0.9, "42,30,12", 0.24, 1.2, 0.8, 0.4); blot(ctx, -15.8, 33.2, 0.8, "92,50,22", 0.4); blot(ctx, 22.8, 39.4, 0.5, "206,206,196", 0.55, 1.4, 0.7, 0.7); blot(ctx, 22.2, 39.8, 0.2, "206,206,196", 0.6);   // grease down from Tony's; a drum that rusted where it stood; somebody's dropped paint
    for (let k = 0; k < 8; k++) { const x = rr(9, 22), z = rr(31, 44), a = R() * 6.28; ctx.strokeStyle = `rgba(14,14,14,${rr(0.12, 0.3)})`; ctx.lineWidth = rr(0.12, 0.2); ctx.beginPath(); ctx.arc(x, z, rr(2, 6), a, a + rr(0.2, 0.7)); ctx.stroke(); }   // rubber: tires scrubbed round on full lock
    // tar poured along the worst of the cracks
    ctx.lineCap = "round"; ctx.lineJoin = "round"; for (const { pts, w } of seals) { ctx.strokeStyle = "rgba(10,10,11,0.9)"; ctx.lineWidth = w; trace(ctx, pts); ctx.stroke(); }
    // paint, what's left of it: fire lane down the west side past the emergency exit, which way the loop runs, the hammerhead kept clear, a stop bar where it lets out to the lot
    ctx.strokeStyle = "rgba(216,178,48,0.52)"; ctx.lineWidth = 0.1; ctx.lineCap = "butt"; ctx.beginPath(); ctx.moveTo(-15.9, 36.9); ctx.lineTo(-15.9, 46.2); ctx.stroke(); paint(ctx, -16.1, 36.8, -15.7, 46.3);
    stencil(ctx, "FIRE LANE", -14, 40.7, Math.PI / 2, 0.72);
    { ctx.save(); ctx.fillStyle = "rgba(216,178,48,0.48)"; ctx.beginPath(); ctx.rect(2.9, 35.5, 7.6, 2.1); ctx.clip(); for (let x = 2.5; x < 13; x += 0.75) { ctx.save(); ctx.translate(x, 36.55); ctx.rotate(0.72); ctx.fillRect(-0.09, -2, 0.18, 4); ctx.restore(); } ctx.restore(); ctx.strokeStyle = "rgba(216,178,48,0.48)"; ctx.lineWidth = 0.1; ctx.strokeRect(2.9, 35.5, 7.6, 2.1); paint(ctx, 2.8, 35.4, 10.6, 37.7); }
    const arrow = (x, z, turn, col = "rgba(216,216,206,0.5)") => { ctx.save(); ctx.translate(x, z); ctx.rotate(turn); ctx.fillStyle = col; ctx.beginPath(); for (const [a, b] of [[-1.2, -0.11], [0.25, -0.11], [0.25, -0.38], [1.2, 0], [0.25, 0.38], [0.25, 0.11], [-1.2, 0.11]]) ctx.lineTo(a, b); ctx.closePath(); ctx.fill(); ctx.restore(); paint(ctx, x - 1.3, z - 1.3, x + 1.3, z + 1.3); };
    arrow(-14, 28.7, Math.PI / 2); arrow(-14, 7, Math.PI / 2); arrow(5, LANE, 0); arrow(10.4, 47.8, -0.82); arrow(12.8, 39.1, -Math.PI / 2); arrow(19.5, 38, 0); arrow(25.2, 27, -Math.PI / 2); arrow(25.2, 11, -Math.PI / 2);
    { ctx.fillStyle = "rgba(222,222,212,0.5)"; ctx.fillRect(23.3, 1.1, 3.8, 0.34); paint(ctx, 23.2, 1, 27.2, 1.5); stencil(ctx, "STOP", 25.2, 2.3, 0, 0.72, "rgba(222,222,212,0.46)"); }
    stencil(ctx, "NO PARKING", 16.4, 32.7, -Math.PI / 2, 0.42);
    stencil(ctx, "TRUCKS", -6.2, LANE, Math.PI / 2, 0.58, "rgba(222,222,212,0.34)");
    ctx.restore();   // (out of the asphalt's clip)
    // the shoulder's edge, where the asphalt's raveled away, and the shade: dark along every wall and fence, under whatever stands there, so nothing floats
    ctx.save(); ctx.strokeStyle = "rgba(38,34,28,0.3)"; ctx.lineWidth = 0.2; trace(ctx, paved.slice(0, paved.findIndex(([x, z]) => x === 23 && z === 0))); ctx.stroke(); ctx.restore();
    for (const f of SR.fences) shade(ctx, f, 0.85, 0.38);
    for (const w of [[[-9.4, 48.6], [-7.84, 48.6], [2.1, 48.6], [2.1, 35.1], [11.1, 35.1], [11.1, 0]], [[13, 0], [13, 14], [21, 14]]]) shade(ctx, w, 1.05, 0.5);
    blot(ctx, 12.72, 28.72, 1.75, "6,6,8", 0.7, 1.02, 0.72); blot(ctx, 15.45, 15, 1.7, "6,6,8", 0.55, 1.02, 0.72);
    blot(ctx, 12.05, 24.6, 1.4, "16,14,12", 0.35, 0.82, 1.22);   // (years of somebody lying here)
    // grit and rotted leaves against the fence and walls, drifted where the trucks don't sweep them
    for (const f of SR.fences) for (let i = 1; i < f.length; i++) { const [ax, az] = f[i - 1], [bx, bz] = f[i], L = Math.hypot(bx - ax, bz - az); for (let t = 0; t < L; t += rr(0.1, 0.5)) { ctx.fillStyle = `rgba(${pick(["64,50,32", "92,76,48", "44,36,24"])},${rr(0.2, 0.55)})`; ctx.beginPath(); ctx.ellipse(ax + (bx - ax) * t / L + rr(-0.42, 0.42), az + (bz - az) * t / L + rr(-0.42, 0.42), rr(0.02, 0.12), rr(0.015, 0.07), R() * 3, 0, 7); ctx.fill(); } }
  }, TW, TH);
  albedo.wrapS = albedo.wrapT = THREE.ClampToEdgeWrapping;

  // ---- where it's broken ----
  const breaks = makeTexture((ctx) => {
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, TW, TH); toWorld(ctx); ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.save(); trace(ctx, paved, true); ctx.clip(); ctx.globalCompositeOperation = "lighter";
    for (const { pts, w } of cracks) for (const [wd, a] of [[w + 0.1, 0.16], [w + 0.04, 0.24], [w * 0.72, 0.68]]) { ctx.strokeStyle = `rgba(255,0,0,${a})`; ctx.lineWidth = wd; trace(ctx, pts); ctx.stroke(); }
    for (const [x, z, r] of ALLIGATOR) { for (let i = 0; i < 4; i++) blot(ctx, x + rr(-r, r) * 0.45, z + rr(-r, r) * 0.45, r * rr(0.6, 1), "0,255,0", 0.72, 1, rr(0.62, 1), R() * 3); }
    ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = "rgb(0,0,255)";   // (what's been patched or poured is sound again: only its edges have opened up, below)
    for (const [x, z, w, d, a] of PATCHES) { rectPath(ctx, x, z, w, d, a); ctx.fill(); }
    ctx.fillRect(PAD.x0, PAD.z0, PAD.x1 - PAD.x0, PAD.z1 - PAD.z0);
    ctx.globalCompositeOperation = "lighter";
    for (const [x, z, w, d, a] of PATCHES) { ctx.strokeStyle = "rgba(255,0,0,0.52)"; ctx.lineWidth = 0.05; rectPath(ctx, x, z, w, d, a); ctx.stroke(); }
    ctx.strokeStyle = "rgba(255,0,0,0.75)"; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(PAD.x0, 32.3); ctx.lineTo(PAD.x1, 32.3); ctx.moveTo(13, PAD.z0); ctx.lineTo(13, PAD.z1); ctx.stroke();   // the pad's scored joints,
    ctx.strokeStyle = "rgba(255,0,0,0.62)"; ctx.lineWidth = 0.022; trace(ctx, [[13, 30.7], [13.4, 31.3], [13.6, 32.2], [14.3, 33.1], [14.2, 34.2]]); ctx.stroke();   // and the one crack it couldn't help
    for (const [x, z, r] of POTHOLES) { for (let i = 0; i < 5; i++) { const a = R() * 6.28, d = i ? r * rr(0.25, 0.55) : 0, cx = x + Math.cos(a) * d, cz = z + Math.sin(a) * d, rd = r * (i ? rr(0.6, 0.9) : 1.05); const gd = ctx.createRadialGradient(cx, cz, 0, cx, cz, rd * 1.45); gd.addColorStop(0, "rgba(0,0,255,0.95)"); gd.addColorStop(0.55, "rgba(0,0,255,0.78)"); gd.addColorStop(1, "rgba(0,0,255,0)"); ctx.fillStyle = gd; ctx.beginPath(); ctx.arc(cx, cz, rd * 1.45, 0, 7); ctx.fill(); } }
    ctx.restore();
  }, TW, TH);
  breaks.wrapS = breaks.wrapT = THREE.ClampToEdgeWrapping; breaks.colorSpace = THREE.NoColorSpace;

  // ---- the sheet itself, and how it's read ----
  const roadMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: albedo });
  const box = new THREE.Vector4(X0, Z0, 1 / (X1 - X0), 1 / (Z1 - Z0));
  roadMat.onBeforeCompile = function (sh) {
    wallBaseCompile.call(this, sh);                 // (the room's lighting first: see wallSurface)
    Object.assign(sh.uniforms, { uRoadBreaks: { value: breaks }, uRoadBox: { value: box }, uRoadSnow: SR.fx.snow, uRoadPond: SR.fx.pond });
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
      uniform sampler2D uRoadBreaks; uniform vec4 uRoadBox; uniform float uRoadSnow, uRoadPond;
      float rdH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float rdN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(rdH(i), rdH(i + vec2(1, 0)), f.x), mix(rdH(i + vec2(0, 1)), rdH(i + vec2(1, 1)), f.x), f.y); }
      vec2 rdUv(vec2 p) { vec2 u = (p - uRoadBox.xy) * uRoadBox.zw; u.y = 1.0 - u.y; return u; }`)
      .replace("#include <map_fragment>", `{
        vec2 P = vTvPos.xz; float pw = length(fwidth(P));   // (how many metres a pixel covers: nothing finer than that gets drawn)
        float near = 1.0 - smoothstep(0.012, 0.09, pw), n1 = rdN(P * 8.5), n2 = rdN(P * 29.0), n3 = rdN(P * 2.1 + 40.0);
        vec2 wob = (vec2(rdN(P * 13.0 + 7.0), rdN(P * 13.0 - 11.0)) - 0.5) * 0.05;   // every edge ragged, not ruled
        vec2 U = rdUv(P + wob); vec3 col = texture2D(map, U).rgb, b = texture2D(uRoadBreaks, U).rgb;
        // the aggregate: stones in the tar, showing more where it's worn
        float g1 = rdH(floor(P * 115.0)), g2 = rdH(floor(P * 54.0) + 5.0);
        col *= 1.0 + near * ((g1 - 0.5) * 0.24 + (g2 - 0.5) * 0.15 + smoothstep(0.8, 0.86, rdN(P * 66.0)) * 0.12) + (n1 - 0.5) * 0.09 + (n3 - 0.5) * 0.08;
        // alligatoring: a net of cracks and little plates, tighter where it's worst
        float gat = smoothstep(0.16, 0.72, b.g + (n3 - 0.5) * 0.42);
        if (gat > 0.002 && near > 0.002) {
          vec2 q = (P + wob * 1.3) * 5.6, ip = floor(q); float F1 = 9.0, F2 = 9.0, cellH = 0.0;
          for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 c = ip + vec2(float(i), float(j)), o = c + 0.16 + 0.68 * vec2(rdH(c), rdH(c + 37.0)); float d = length(q - o); if (d < F1) { F2 = F1; F1 = d; cellH = rdH(c + 3.0); } else if (d < F2) F2 = d; }
          float e = F2 - F1, line = 1.0 - smoothstep(0.012 + 0.028 * gat, 0.032 + 0.055 * gat, e);
          col = mix(col * (1.0 + (cellH - 0.5) * 0.2 * gat), col * 0.2, line * gat * near);
        }
        col *= 1.0 - 0.22 * gat * (1.0 - near * 0.65);      // (from further off it's just a bad dark patch)
        // cracks: the blurred line read as a distance, its edges chewed
        float cn = b.r + (n2 - 0.5) * 0.2, cw = max(0.03, fwidth(b.r) * 1.2), crack = smoothstep(0.58 - cw, 0.58 + cw, cn);
        col *= 1.0 - 0.2 * smoothstep(0.2, 0.5, cn);
        col = mix(col, col * 0.16, crack);
        // potholes: down through the surface to broken base. A rim of loose stone; past it you look in, the floor shifted by how deep it is, the near wall in the dark
        float hl = b.b + (n2 - 0.5) * 0.12 + (n1 - 0.5) * 0.24, hole = smoothstep(0.48, 0.53, hl), floorM = 0.0;
        if (hl > 0.18) {
          vec3 V = normalize(cameraPosition - vTvPos); vec2 F = P + wob - V.xz / max(V.y, 0.24) * 0.075;
          floorM = smoothstep(0.5, 0.56, texture2D(uRoadBreaks, rdUv(F)).b + (rdN(F * 29.0) - 0.5) * 0.12 + (rdN(F * 8.5) - 0.5) * 0.24);
          float stone = smoothstep(0.6, 0.72, rdN(F * 58.0)), rock = rdN(F * 21.0);
          vec3 base = vec3(0.03, 0.028, 0.025) * (0.6 + rock) + stone * vec3(0.06, 0.056, 0.05) * near;
          float rim = smoothstep(0.24, 0.48, hl) * (1.0 - hole);
          col = mix(col, col * 0.62 + step(0.72, g2) * 0.1 * near, rim);
          col = mix(col, mix(vec3(0.016, 0.015, 0.014), base, floorM), hole);
        }
        // standing water, in the holes and where the base has sunk under the alligatoring: it stays a good while after the rain
        float pond = smoothstep(0.08, 0.5, uRoadPond);
        if (pond > 0.001) { float low = max(floorM * hole, smoothstep(0.8, 0.86, b.g * 0.58 + n3 * 0.5 + (n1 - 0.5) * 0.06)); col = mix(col, vec3(0.1, 0.125, 0.16) + 0.08 * (1.0 - n3), low * pond * 0.8); }
        // snow, in the holes and cracks last
        float sn = smoothstep(0.03, 0.78, uRoadSnow * 1.25 + (n3 - 0.5) * 0.28 + (n1 - 0.5) * 0.14 - crack * 0.14);
        col = mix(col, vec3(0.86, 0.89, 0.93) * (0.92 + 0.08 * n2), sn * (1.0 - 0.45 * hole));
        diffuseColor.rgb *= col;
      }`);
  };
  roadMat.customProgramCacheKey = () => "serviceRoad";
  { const geo = new THREE.ShapeGeometry(new THREE.Shape(SR.ring(SR.SHOULDER).map(([x, z]) => new THREE.Vector2(x, -z)))); geo.rotateX(-Math.PI / 2);
    const road = new THREE.Mesh(geo, roadMat); road.position.y = 0.004; g.add(road); }
  WX_GROUND.push({ m: roadMat, dry: new THREE.Color(0xffffff), wet: new THREE.Color(0x8d9196), snow: 0 });   // (the snow's in its shader)

  // ---- colliders along a line, stepped if it runs on an angle ----
  const wallAlong = (ax, az, bx, bz, t, y1) => {
    const L = Math.hypot(bx - ax, bz - az), n = (ax === bx || az === bz) ? 1 : Math.max(1, Math.ceil(L / 0.45));
    for (let i = 0; i < n; i++) { const x0 = ax + (bx - ax) * i / n, z0 = az + (bz - az) * i / n, x1 = ax + (bx - ax) * (i + 1) / n, z1 = az + (bz - az) * (i + 1) / n; colliders.push({ x0: Math.min(x0, x1) - t, x1: Math.max(x0, x1) + t, z0: Math.min(z0, z1) - t, z1: Math.max(z0, z1) + t, y1 }); }
  };

  // ---- the fence: old stockade, 2.4 m so nobody sees over it, with its back to the road. Silvered boards, the odd run replaced in newer wood that's never been stained, a few gone or sprung. Boards, rails and posts: one instanced mesh, one draw ----
  { const fenceTex = makeTexture((ctx, W, H) => {
      ctx.fillStyle = "#f0ece2"; ctx.fillRect(0, 0, W, H); const r2 = seeded(77);
      for (let i = 0; i < 70; i++) { const x = r2() * W; ctx.fillStyle = `rgba(${r2() < 0.6 ? "60,52,44" : "255,252,244"},${0.05 + r2() * 0.15})`; ctx.fillRect(x, 0, 0.8 + r2() * 2.2, H); }   // the grain
      let gd = ctx.createLinearGradient(0, H, 0, 0); gd.addColorStop(0, "rgba(18,20,10,0.85)"); gd.addColorStop(0.08, "rgba(28,34,16,0.55)"); gd.addColorStop(0.24, "rgba(40,36,24,0.14)"); gd.addColorStop(0.42, "rgba(0,0,0,0)"); ctx.fillStyle = gd; ctx.fillRect(0, 0, W, H);   // rotting and green at the bottom, where the wet sits
      gd = ctx.createLinearGradient(0, 0, 0, H * 0.3); gd.addColorStop(0, "rgba(26,22,18,0.5)"); gd.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = gd; ctx.fillRect(0, 0, W, H);   // streaked from the top
    }, 64, 256);
    const parts = [], r3 = seeded(4242), A = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), E2 = new THREE.Euler(0, 0, 0, "YXZ"), M = new THREE.Matrix4();
    const OLD = [0xbcb09e, 0xaea392, 0xc6b9a7, 0xa19684, 0xb4a998], NEW = [0xe0b67a, 0xd2a86e, 0xe8c084];
    const walk = (pts, fn) => { for (let i = 1; i < pts.length; i++) { const [ax, az] = pts[i - 1], [bx, bz] = pts[i]; fn(ax, az, bx, bz, Math.hypot(bx - ax, bz - az)); } };
    SR.fences.forEach(pts => {
      let dist = 0, nextNew = 8 + r3() * 18, runNew = 0, nextSag = 12 + r3() * 16, sag = 0, sagSign = 1;
      walk(pts, (ax, az, bx, bz, L) => {
        const ux = (bx - ax) / L, uz = (bz - az) / L, side = az === SR.FRONT && bz === SR.FRONT ? 1 : -1, nx = -uz * side, nz = ux * side, ry = Math.atan2(-uz, ux);   // (n: toward the rails, the fence's back: the road's side all round, but the good side to the street along the walk)
        for (let t = 0.0725; t < L; t += 0.145, dist += 0.145) {
          if (dist > nextNew) { runNew = 1.2 + r3() * 3; nextNew = dist + 14 + r3() * 26; }
          if (dist > nextSag) { sag = 1.8 + r3() * 2.6; sagSign = r3() < 0.5 ? -1 : 1; nextSag = dist + 15 + r3() * 26; }
          const fresh = runNew > 0, hurt = sag > 0, h = 2.32 + r3() * 0.12 - (hurt ? 0.05 : 0), lean = hurt ? sagSign * 0.05 : 0;
          runNew -= 0.145; sag -= 0.145;
          if (!fresh && r3() < (hurt ? 0.09 : 0.012)) continue;   // gone
          const sprung = !fresh && r3() < 0.02;
          const dp = 0.05 + r3() * 0.008; parts.push({ x: ax + ux * t - nx * dp, y: h / 2 - (r3() * 0.03), z: az + uz * t - nz * dp, sx: 0.15, sy: h, sz: 0.02, ry, rx: lean + (sprung ? (r3() - 0.5) * 0.1 : 0), rz: sprung ? (r3() - 0.5) * 0.09 : 0, c: fresh ? NEW[Math.floor(r3() * NEW.length)] : OLD[Math.floor(r3() * OLD.length)], v: 0.86 + r3() * 0.26 });
        }
        for (let b = 0, nB = Math.max(1, Math.round(L / 2.4)), bL = L / nB; b < nB; b++) {   // the posts, and three rails between them, on the road's side
          const mid = (b + 0.5) * bL, pAt = (b + 1) * bL;
          for (const y of [0.42, 1.25, 2.1]) parts.push({ x: ax + ux * mid, y: y + (r3() - 0.5) * 0.01, z: az + uz * mid, sx: bL + 0.02, sy: 0.085, sz: 0.04, ry, rx: 0, rz: 0, c: 0x9a8e7c, v: 0.8 + r3() * 0.25 });
          parts.push({ x: ax + ux * pAt + nx * 0.015, y: 1.2, z: az + uz * pAt + nz * 0.015, sx: 0.09, sy: 2.4, sz: 0.09, ry, rx: (r3() - 0.5) * 0.012, rz: (r3() - 0.5) * 0.012, c: 0x8a7f6c, v: 0.8 + r3() * 0.25 });
        }
        wallAlong(ax, az, bx, bz, 0.06, 2.5);
      });
    });
    const unit = new THREE.BoxGeometry(1, 1, 1), fence = new THREE.InstancedMesh(unit, new THREE.MeshLambertMaterial({ map: fenceTex }), parts.length), col = new THREE.Color();
    parts.forEach((p, i) => { E2.set(p.rx, p.ry, p.rz); fence.setMatrixAt(i, M.compose(A.set(p.x, p.y, p.z), Q.setFromEuler(E2), S.set(p.sx, p.sy, p.sz))); fence.setColorAt(i, col.set(p.c).multiplyScalar(p.v)); });
    fence.instanceMatrix.needsUpdate = true; fence.instanceColor.needsUpdate = true; g.add(fence);
  }

  // ---- jersey barriers: where something's been hit, or nearly. Round the emergency exit's stairwell, on the island's crown where trailers cut in, along the back line and at its corners where tails swing, and a few parked in front of holes in the fence ----
  { const BL = 2.6, H = 0.81, prof = [[-0.3, 0], [0.3, 0], [0.3, 0.075], [0.19, 0.25], [0.085, 0.81], [-0.085, 0.81], [-0.19, 0.25], [-0.3, 0.075]];
    const sh = new THREE.Shape(prof.map(([a, b]) => new THREE.Vector2(a, b)));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: BL, bevelEnabled: false, steps: 1 }); geo.translate(0, 0, -BL / 2);
    { const p = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getZ(i) + BL / 2) / BL + p.getX(i) * 0.15, p.getY(i) / H); }
    const tex = makeTexture((ctx, W, Ht) => { const r4 = seeded(31); ctx.fillStyle = "#b0ada4"; ctx.fillRect(0, 0, W, Ht);
      for (let i = 0; i < 260; i++) { ctx.fillStyle = `rgba(${r4() < 0.5 ? "40,38,34" : "226,222,212"},${r4() * 0.13})`; ctx.beginPath(); ctx.ellipse(r4() * W, r4() * Ht, 2 + r4() * 28, 1 + r4() * 10, r4() * 3, 0, 7); ctx.fill(); }
      const gd = ctx.createLinearGradient(0, Ht, 0, Ht * 0.3); gd.addColorStop(0, "rgba(22,20,16,0.75)"); gd.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = gd; ctx.fillRect(0, 0, W, Ht);
      ctx.fillStyle = "rgba(10,10,10,0.8)"; for (const x of [0.2, 0.8]) ctx.fillRect(W * x - 22, Ht - 18, 44, 18);    // the slots for lifting them
      for (let i = 0; i < 14; i++) { ctx.strokeStyle = `rgba(${r4() < 0.5 ? "18,18,18" : "178,52,28"},${0.15 + r4() * 0.3})`; ctx.lineWidth = 1 + r4() * 3; const x = r4() * W, y = Ht * (0.25 + r4() * 0.5); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 20 + r4() * 90, y + (r4() - 0.5) * 16); ctx.stroke(); }   // scrapes, some with paint in them
      for (let i = 0; i < 4; i++) { ctx.fillStyle = "rgba(60,48,36,0.8)"; const x = r4() * W; ctx.fillRect(x, 0, 6 + r4() * 30, 4 + r4() * 12); }   // chipped along the top
    }, 512, 128);
    tex.wrapS = THREE.RepeatWrapping;
    const place = [[-10.25, 44.2, 0], [-10.3, 46.9, 0.03], [-16.65, 21.2, 0], [-16.62, 23.9, -0.02], [27.75, 28, 0.015], [-3.6, SR.BACK + 0.45, Math.PI / 2], [-0.9, SR.BACK + 0.48, Math.PI / 2 + 0.03]];
    const onArc = (cx, cz, r, deg, wob = 0) => { const a = deg * Math.PI / 180; return [cx + Math.cos(a) * r, cz + Math.sin(a) * r, -a + wob]; };
    place.push(onArc(IS.x, IS.z, IS.r - 0.45, 30), onArc(IS.x, IS.z, IS.r - 0.45, 60, 0.04));
    { const nx = Math.cos(LN), nz = Math.sin(LN), ry = Math.atan2(nz, -nx), T = SR.TURN + 0.45; for (const [d, w] of [[8, 0], [10.7, 0.03]]) place.push([IS.x + nx * T + nz * d, IS.z + nz * T - nx * d, ry + w]); }   // (along the back line)
    place.push(onArc(SR.CW, SR.CZ, SR.RC + 0.36, 118), onArc(SR.CW, SR.CZ, SR.RC + 0.36, 149, 0.03));
    place.push(onArc(SR.CE, SR.CS, SR.RC + 0.36, 22), onArc(SR.CE, SR.CS, SR.RC + 0.36, 48, -0.03));
    const bars = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ map: tex }), place.length), M = new THREE.Matrix4(), E3 = new THREE.Euler(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1), c = new THREE.Color(), rc = seeded(9);
    place.forEach(([x, z, ry], i) => { bars.setMatrixAt(i, M.compose(V.set(x, 0.004, z), Q.setFromEuler(E3.set(0, ry, 0)), S)); bars.setColorAt(i, c.setScalar(0.72 + rc() * 0.3).multiply(c.clone().set(i % 5 === 2 ? 0xe8dcc0 : 0xffffff)));
      const dx = Math.sin(ry) * BL / 2, dz = Math.cos(ry) * BL / 2; wallAlong(x - dx, z - dz, x + dx, z + dz, 0.2, 0.85); });
    bars.instanceMatrix.needsUpdate = true; bars.instanceColor.needsUpdate = true; g.add(bars);
  }

  // ---- the island's curb, chipped where it's been driven over; a pair of yellow pipe bollards on each building corner a truck could clip; a drain and a manhole ----
  { const geos = [], seg = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az), o = new THREE.BoxGeometry(L + 0.012, 0.13, 0.15); o.rotateY(Math.atan2(-(bz - az), bx - ax)); o.translate((ax + bx) / 2, 0.065, (az + bz) / 2); geos.push(o); };
    const edge = [...arc(IS.x, IS.z, IS.r - 0.07, 0, Math.PI / 2, 22)];
    for (let i = 1; i < edge.length; i++) { if (i === 9 || i === 15) continue; seg(edge[i - 1][0], edge[i - 1][1], edge[i][0], edge[i][1]); }
    seg(2.1, IS.z + 0.075, IS.x + IS.r, IS.z + 0.075); seg(2.1, 48.53, IS.x, 48.53);
    const curb = new THREE.Mesh(mergeGeometries(geos), mat.curb); g.add(curb);
    const yellow = new THREE.MeshLambertMaterial({ color: 0xd1a51f }), B = [[11.34, 35.34], [11.34, 34.5], [2.36, 48.84], [3.1, 48.92], [10.36, 40.8], [14.05, 28.52], [14.05, 29.5]];
    const pipe = new THREE.CylinderGeometry(0.058, 0.058, 1.05, 10); pipe.translate(0, 0.525, 0);
    const bol = new THREE.InstancedMesh(pipe, yellow, B.length), M = new THREE.Matrix4(), c = new THREE.Color();
    B.forEach(([x, z], i) => { bol.setMatrixAt(i, M.makeTranslation(x, 0, z)); bol.setColorAt(i, c.setScalar(0.72 + (i % 3) * 0.13)); colliders.push({ x0: x - 0.09, x1: x + 0.09, z0: z - 0.09, z1: z + 0.09, y1: 1.05 }); });
    bol.instanceMatrix.needsUpdate = true; bol.instanceColor.needsUpdate = true; g.add(bol);
    const iron = new THREE.MeshLambertMaterial({ color: 0x2f2c28 }), rust = new THREE.MeshLambertMaterial({ color: 0x4d3322 }), add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };
    add(new THREE.CylinderGeometry(0.36, 0.38, 0.018, 24), iron, -3.2, 0.012, 51.9); add(new THREE.CylinderGeometry(0.42, 0.44, 0.012, 24), new THREE.MeshLambertMaterial({ color: 0x4c4b48 }), -3.2, 0.008, 51.9);   // the trench's manhole
    add(new THREE.CylinderGeometry(0.33, 0.35, 0.018, 20), rust, 25.9, 0.012, 22.8);
    for (const [x, z] of [[14.65, 36.1], [-11.95, 39.1]]) {                             // storm drains: a dark box, a grate, the dirt silted in
      add(new THREE.BoxGeometry(0.76, 0.012, 0.56), new THREE.MeshBasicMaterial({ color: 0x050504 }), x, 0.01, z);
      const bars2 = []; for (let k = 0; k < 9; k++) { const o = new THREE.BoxGeometry(0.05, 0.014, 0.5); o.translate(x - 0.32 + k * 0.08, 0.019, z); bars2.push(o); } for (const s of [-0.28, 0.28]) { const o = new THREE.BoxGeometry(0.76, 0.015, 0.045); o.translate(x, 0.019, z + s); bars2.push(o); } for (const s of [-0.38, 0.38]) { const o = new THREE.BoxGeometry(0.05, 0.015, 0.56); o.translate(x + s, 0.019, z); bars2.push(o); }
      g.add(new THREE.Mesh(mergeGeometries(bars2), rust));
    }
  }

  // ---- weeds: up the fence, along the shoulder, out of the seams and off the island's edge. A few blades each, the grass's own colour through the year ----
  { const blade = (a, h, lean) => [Math.cos(a) * 0.045, 0, Math.sin(a) * 0.045, -Math.cos(a) * 0.045, 0, -Math.sin(a) * 0.045, Math.cos(a + 1) * lean, h, Math.sin(a + 1) * lean];
    const verts = []; for (const [a, h, l] of [[0, 1, 0.1], [1.1, 0.7, 0.14], [2.2, 0.85, 0.06], [3.3, 0.55, 0.16], [4.4, 0.95, 0.1], [5.3, 0.6, 0.08]]) verts.push(...blade(a, h, l));
    const tgeo = new THREE.BufferGeometry(); tgeo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3)); tgeo.setAttribute("normal", new THREE.Float32BufferAttribute(verts.map((_, i) => i % 3 === 1 ? 1 : 0), 3));
    const grassG = WX_GROUND.find(w => w.m === mat.grass), tuftM = mat.grass.clone(); tuftM.side = THREE.DoubleSide; WX_GROUND.push({ m: tuftM, dry: grassG.dry, wet: grassG.wet, snow: 0.3 });
    const spots = [], r5 = seeded(555), jit = v => (r5() - 0.5) * v;
    for (const f of SR.fences) for (let i = 1; i < f.length; i++) { const [ax, az] = f[i - 1], [bx, bz] = f[i], L = Math.hypot(bx - ax, bz - az); for (let t = 0; t < L; t += 0.2 + r5() * 1.1) spots.push([ax + (bx - ax) * t / L + jit(0.55), az + (bz - az) * t / L + jit(0.55), 0.14 + r5() * 0.32]); }   // up the fence
    for (const { pts } of cracks) if (r5() < 0.5) for (let k = 0; k < 3; k++) { const p = pts[Math.floor(r5() * pts.length)]; spots.push([p[0], p[1], 0.09 + r5() * 0.18]); }   // out of the cracks
    for (let i = 0; i < 90; i++) { const a = r5() * Math.PI / 2, d = IS.r + jit(0.32); spots.push([IS.x + Math.cos(a) * d, IS.z + Math.sin(a) * d, 0.1 + r5() * 0.26]); }   // the island's edge
    for (let i = 0; i < 90; i++) spots.push([-11.84 + jit(0.4), r5() * 41, 0.1 + r5() * 0.2]);   // along the west lane's soft side
    for (let i = 0; i < 60; i++) spots.push([23 + jit(0.4), r5() * 18, 0.1 + r5() * 0.2]);     // and the east's
    for (let i = 0; i < 26; i++) spots.push([11.2 + r5() * 2.2, 22.9 + r5() * 3.2, 0.1 + r5() * 0.18]);   // round the bed
    const outdoors = spots.filter(([x, z]) => !inBuilding(x, z, 0.1) && !(x > 12.9 && x < 21.1 && z > -0.1 && z < 14.1));   // (the cracks wander past the road's edge on paper: nothing grows up through a floor)
    const tufts = new THREE.InstancedMesh(tgeo, tuftM, outdoors.length), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
    outdoors.forEach(([x, z, s], i) => { tufts.setMatrixAt(i, M.compose(V.set(x, 0.004, z), Q.setFromAxisAngle(Y, r5() * 6.28), S.set(s * 0.8, s, s * 0.8))); tufts.setColorAt(i, c.setRGB(0.82 + r5() * 0.5, 0.86 + r5() * 0.4, 0.62 + r5() * 0.42)); });
    tufts.instanceMatrix.needsUpdate = true; tufts.instanceColor.needsUpdate = true; g.add(tufts);
  }

  // ---- what gets left: a stack of pallets, a heap of dead tires, a cone nobody came back for, a rusted drum, a sign or two on the fence, somebody's initials ----
  { const K2 = tonyKit(), wood = 0x8a7a5e, wood2 = 0x6f6248, solid = (x0, x1, z0, z1, y1) => colliders.push({ x0, x1, z0, z1, y1 });
    const pallet = (x, y, z, ry, c) => K2.at(x, y, z, ry, () => { for (let k = 0; k < 7; k++) K2.box(c, 1.1, 0.022, 0.095, 0, 0.13, -0.5 + k * 0.167); for (const s of [-0.48, 0, 0.48]) K2.box(wood2, 0.09, 0.1, 1.1, s, 0.07, 0); for (const s of [-0.45, 0, 0.45]) K2.box(c, 1.1, 0.022, 0.095, 0, 0.012, s); });
    for (const [i, a] of [[0, 0.04], [1, -0.08], [2, 0.12], [3, -0.02]]) pallet(-16.1, i * 0.145, 31, Math.PI / 2 + a, i % 2 ? wood2 : wood); solid(-16.68, -15.52, 30.42, 31.58, 0.65);
    K2.at(27.45, 0, 33.1, 0.1, () => { pallet(0, 0, 0, 0, wood2); pallet(0.03, 0.145, 0.02, 0.09, wood); }); solid(26.9, 28.05, 32.45, 33.75, 0.35);
    {                                               // dead tires, all in one heap against the back of the smokers' fence, where nobody out front has to look at them: two stacks, one thrown on its side, two leaned up on the stacks
      // a tire's section, turned: bead, out along the sidewall's bulge, a square shoulder, flat across the tread, and back. [radius, up, how far through the texture]
      const SEC = [[0.19, -0.07, 0.005], [0.205, -0.08, 0.02], [0.25, -0.1, 0.12], [0.3, -0.1, 0.24], [0.325, -0.09, 0.295], [0.34, -0.072, 0.33], [0.34, -0.036, 0.41], [0.34, 0, 0.5], [0.34, 0.036, 0.59], [0.34, 0.072, 0.67], [0.325, 0.09, 0.705], [0.3, 0.1, 0.76], [0.25, 0.1, 0.88], [0.205, 0.08, 0.98], [0.19, 0.07, 0.995], [0.19, -0.07, 0.995]];
      const SEGS = 40, geo = new THREE.LatheGeometry(SEC.map(([a, b]) => new THREE.Vector2(a, b)), SEGS), uv = geo.attributes.uv;
      for (let i = 0; i <= SEGS; i++) SEC.forEach(([, , v], j) => uv.setY(i * SEC.length + j, v));
      const tex = makeTexture((ctx, W, H) => {
        const r = seeded(1971), RUB = "#232324", TOP = 154, BOT = H - 154;   // canvas rows: a sidewall, the tread, the other sidewall (it wraps round the tire: straight writing here runs round its edge)
        ctx.fillStyle = RUB; ctx.fillRect(0, 0, W, H);
        // ---- the tread: blocks between three grooves round the tire, cut across on the slant, the shoulders notched, worn smooth down the middle ----
        const GR = [TOP + 58, TOP + 102, TOP + 146], PITCH = 34;
        ctx.fillStyle = "#2c2c2d"; ctx.fillRect(0, TOP, W, BOT - TOP);
        ctx.lineCap = "butt"; ctx.strokeStyle = "#070707"; ctx.lineWidth = 5;
        for (let x = -PITCH; x < W + PITCH; x += PITCH) for (let k = 0; k < 4; k++) { const y0 = k ? GR[k - 1] : TOP + 6, y1 = k < 3 ? GR[k] : BOT - 6, off = k % 2 ? 0 : PITCH / 2, sl = k % 2 ? 9 : -9; ctx.beginPath(); ctx.moveTo(x + off, y0); ctx.lineTo(x + off + sl, (y0 + y1) / 2); ctx.lineTo(x + off, y1); ctx.stroke(); }   // the blocks, zigzag
        ctx.strokeStyle = "rgba(6,6,6,0.75)"; ctx.lineWidth = 1.5;
        for (let x = 0; x < W; x += PITCH / 2) for (const y of [TOP + 30, TOP + 80, TOP + 124, TOP + 170]) { ctx.beginPath(); ctx.moveTo(x + 8, y - 12); ctx.lineTo(x + 11, y); ctx.lineTo(x + 8, y + 12); ctx.stroke(); }   // the fine cuts in each block
        ctx.fillStyle = "#050505"; for (const y of GR) ctx.fillRect(0, y - 6, W, 12);                                // the grooves
        for (let i = 0; i < 120; i++) { ctx.fillStyle = `rgba(150,146,136,${r() * 0.1})`; ctx.beginPath(); ctx.ellipse(r() * W, TOP + r() * (BOT - TOP), 12 + r() * 70, 5 + r() * 24, 0, 0, 7); ctx.fill(); }   // worn pale in patches
        { const g = ctx.createLinearGradient(0, TOP + 60, 0, BOT - 60); g.addColorStop(0, "rgba(120,118,112,0)"); g.addColorStop(0.5, "rgba(120,118,112,0.13)"); g.addColorStop(1, "rgba(120,118,112,0)"); ctx.fillStyle = g; ctx.fillRect(0, TOP + 60, W, BOT - TOP - 120); }
        // ---- the sidewalls: a raised ring or two, and what's moulded into the rubber round the rim: the maker, the size and ratings in a little line of squiggles ----
        const LET = "#6c6a64", side = (flip, y0, y1) => { ctx.save(); if (flip) { ctx.translate(W, 0); ctx.scale(-1, 1); }
          const mid = (y0 + y1) / 2;
          ctx.fillStyle = "rgba(92,90,86,0.55)"; ctx.fillRect(0, y0 + 16, W, 3); ctx.fillRect(0, y1 - 19, W, 3);
          ctx.strokeStyle = LET;
          for (const [t, x, h, wt] of [["ROADKING", 400, 54, 0.2], ["STEEL RADIAL", 1250, 34, 0.16], ["ROADKING", 1640, 54, 0.2]]) signText(ctx, t, x, mid, h, { weight: wt, r });
          const squig = (x0, L, y, amp, wave) => { ctx.lineWidth = 3; ctx.strokeStyle = "rgba(108,106,100,0.92)"; ctx.lineCap = "round"; ctx.beginPath(); for (let x = 0; x <= L; x += 3) { const q = y + Math.sin(x / wave + x0) * amp + (Math.sin(x / (wave * 3.1)) > 0.7 ? -amp : 0); if (Math.floor(x / 37) % 5 === 4) { ctx.moveTo(x0 + x, q); continue; } ctx.lineTo(x0 + x, q); } ctx.stroke(); };   // (too small to read: words broken up with gaps)
          squig(700, 300, mid - 17, 7, 3.2); squig(700, 300, mid + 17, 7, 2.6); squig(30, 110, mid - 12, 6, 2.8); squig(30, 110, mid + 16, 6, 3.1); squig(1880, 150, mid, 7, 2.9); squig(1000, 90, mid, 6, 3);
          ctx.restore(); };
        side(false, 8, TOP - 8); side(true, BOT + 8, H - 8);
        // ---- years outdoors: chalky dust, scuffs along the kerb line, a crack or two ----
        for (let i = 0; i < 260; i++) { ctx.fillStyle = `rgba(${r() < 0.6 ? "132,120,98" : "16,16,16"},${r() * 0.1})`; ctx.beginPath(); ctx.ellipse(r() * W, r() * H, 6 + r() * 60, 2 + r() * 12, 0, 0, 7); ctx.fill(); }
        for (let i = 0; i < 50; i++) { ctx.strokeStyle = `rgba(150,146,136,${0.1 + r() * 0.26})`; ctx.lineWidth = 1 + r() * 2; const x = r() * W, y = r() < 0.5 ? 30 + r() * 90 : BOT + 30 + r() * 90; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 20 + r() * 110, y + (r() - 0.5) * 7); ctx.stroke(); }
        for (let i = 0; i < 16; i++) { ctx.strokeStyle = "rgba(2,2,2,0.8)"; ctx.lineWidth = 1.5; let x = r() * W, y = r() < 0.5 ? r() * TOP : BOT + r() * TOP; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += 7 + r() * 16; y += (r() - 0.5) * 9; ctx.lineTo(x, y); } ctx.stroke(); }
      }, 2048, 512);
      // where they lie: x, y, z, leaned over (rx), tipped (rz), turned (each shows a different bit of its writing)
      const HEAP = [[19.7, 0.1, 18.95, 0, 0, 0.3], [19.72, 0.305, 18.96, 0, 0.02, 2.1], [19.68, 0.51, 18.93, 0.015, -0.025, 4.6], [20.45, 0.1, 19.02, 0, 0, 1.2], [20.47, 0.305, 19, 0.03, 0, 3.4], [21.17, 0.1, 19.05, 0, 0.012, 5.3], [19.72, 0.314, 19.6, 0.8, 0, 0.9], [20.48, 0.278, 19.66, 0.62, 0.04, 2.8]];
      const tires = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ map: tex }), HEAP.length), M = new THREE.Matrix4(), Qt = new THREE.Quaternion(), Et = new THREE.Euler(0, 0, 0, "XZY"), Vt = new THREE.Vector3(), St = new THREE.Vector3(1, 1, 1), ct = new THREE.Color();
      HEAP.forEach(([x, y, z, rx, rz, ry], i) => { tires.setMatrixAt(i, M.compose(Vt.set(x, y, z), Qt.setFromEuler(Et.set(rx, ry, rz)), St)); tires.setColorAt(i, ct.setScalar(0.86 + (i % 4) * 0.08)); });
      tires.instanceMatrix.needsUpdate = true; tires.instanceColor.needsUpdate = true; g.add(tires);
      solid(19.3, 21.55, 18.55, 19.98, 0.6); }
    K2.cyl(0x3c2614, 0.29, 0.29, 0.88, -15.75, 0.44, 33.3, { seg: 14, g: 0.15 }); for (const y0 of [0.2, 0.44, 0.68]) K2.torus(0x2a1a0e, 0.292, 0.008, -15.75, y0, 33.3, { rx: Math.PI / 2, seg: 14 }); solid(-16.05, -15.45, 33, 33.6, 0.9);
    const cone = (x, z, ry, tip) => K2.at(x, 0, z, ry, () => { if (tip) { K2.cyl(0xc8501a, 0.04, 0.13, 0.42, 0, 0.13, 0, { rx: Math.PI / 2 - 0.1, seg: 10 }); K2.box(0x241a12, 0.3, 0.03, 0.3, 0, 0.14, -0.2, { rx: 1.45 }); } else { K2.cyl(0xc8501a, 0.04, 0.13, 0.46, 0, 0.26, 0, { seg: 10 }); K2.cyl(0xd8d4c8, 0.075, 0.095, 0.08, 0, 0.27, 0, { seg: 10 }); K2.box(0x241a12, 0.32, 0.03, 0.32, 0, 0.015, 0); } });
    cone(10.3, 42.55, 0.2); cone(-15.4, 6.3, 0.7, true); cone(22.7, 41.6, 0.4); cone(18.5, 19, 1);
    K2.flush(g);
    const SB = SR.BACK + SR.SHOULDER - 0.08;
    for (const [txt, x, y, z, ry, w, h, seed, tilt, fg, bg] of [
      ["NO\nDUMPING", -16.92, 1.74, 26.2, Math.PI / 2, 0.72, 0.5, 11, 0.018], ["NO\nDUMPING", 28.12, 1.7, 22, -Math.PI / 2, 0.72, 0.5, 23, -0.05],
      ["TOW AWAY\nZONE", -5.6, 1.72, SB, Math.PI, 0.8, 0.54, 37, 0.012, "#e4dec8", "#8c2a1e"]]) {
      const o = weatheredSign(txt, w, h, { seed, ...(fg ? { fg, bg } : {}) }); o.position.set(x, y, z); o.rotation.set(0, ry, tilt); g.add(o); }
    const tags = makeTexture((ctx, W, H) => { ctx.clearRect(0, 0, W, H); const r6 = seeded(808), tag = (t, x, y, h, c, turn = 0, weight = 0.13) => { ctx.save(); ctx.translate(x, y); ctx.rotate(turn); ctx.transform(1, 0, -0.16, 1, 0, 0); ctx.strokeStyle = c; signText(ctx, t, 0, 0, h, { weight, jit: 0.05, round: true, r: r6 }); ctx.restore(); };
      tag("RAYZ", 130, 62, 74, "#1b1b20", -0.03); tag("KNOX '94", 440, 60, 72, "#a02a7a", -0.05); ctx.strokeStyle = "#1f4fa0"; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(30, 178); ctx.bezierCurveTo(100, 120, 170, 240, 250, 174); ctx.bezierCurveTo(300, 140, 400, 215, 480, 170); ctx.stroke(); tag("HI TONY", 650, 172, 54, "#16161a", 0.03);
      ctx.globalCompositeOperation = "destination-out"; for (let i = 0; i < 40; i++) { ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.fillRect(i * 20.5, 0, 2.5, H); } }, 820, 240);
    const tagMat = new THREE.MeshLambertMaterial({ map: tags, transparent: true, depthWrite: false, opacity: 0.8 });
    for (const [x, z, ry, ox, ow] of [[-16.94, 11, Math.PI / 2, 0, 0.285], [1.4, SR.BACK + SR.SHOULDER - 0.06, Math.PI, 0.31, 0.46], [28.14, 25, -Math.PI / 2, 0.62, 0.38]]) { const geo = new THREE.PlaneGeometry(ow * 8.2, 2.4); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, ox + uv.getX(i) * ow); const o = new THREE.Mesh(geo, tagMat); o.position.set(x, 1.72, z); o.rotation.y = ry; o.scale.setScalar(0.3); g.add(o); }
  }
  ext(g);
}
