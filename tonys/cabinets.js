// ---- the game corner's cabinets: built like the real thing. A side panel in the classic profile (kicked-in foot, control panel
// out on its shelf, monitor leaning back in a printed bezel, marquee overhanging, lit from behind), T-molding round the edge,
// a steel coin door, each game's own controls: Invaders' two-way buttons, Asteroids' five, Missile Command's trackball.
// The art's drawn here, one sheet per game: side, marquee, control panel, bezel ----
const CAB_ART = {
  "SPACE INVADERS": { body: 0x0e0e12, trim: 0x2a2a2a, draw(ctx, S) {
    const pix = (rows, x, y, k, c) => { ctx.fillStyle = c; rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === "1") ctx.fillRect(x + i * k, y + j * k, k, k); }); };
    S.side(() => { ctx.fillStyle = "#0a0a10"; ctx.fillRect(0, 0, 512, 1024); for (let k = 0; k < 260; k++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.8})`; ctx.fillRect(Math.random() * 512, Math.random() * 1024, 2, 2); }
      const gr = ctx.createLinearGradient(0, 560, 0, 1024); gr.addColorStop(0, "rgba(40,200,90,0)"); gr.addColorStop(1, "rgba(40,200,90,.6)"); ctx.fillStyle = gr; ctx.fillRect(0, 560, 512, 464);
      pix(INVADER.octo[0], 120, 150, 22, "#ff5a3c"); pix(INVADER.crab[0], 90, 380, 16, "#39ff5a"); pix(INVADER.squid[1], 320, 340, 14, "#46c8ff"); pix(INVADER.crab[1], 280, 600, 10, "#ffd400"); pix(INVADER.squid[0], 80, 660, 10, "#ff5a3c"); });
    S.marquee(() => { ctx.fillStyle = "#07070c"; ctx.fillRect(0, 0, 512, 128); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.shadowBlur = 14; ctx.shadowColor = "#39ff5a"; ctx.fillStyle = "#c8ffd0"; ctx.font = "italic 900 58px Arial Black, Arial"; ctx.fillText("SPACE INVADERS", 256, 66, 480); ctx.shadowBlur = 0; pix(INVADER.crab[0], 10, 8, 2, "#ff5a3c"); pix(INVADER.crab[1], 480, 8, 2, "#ff5a3c"); });
    S.panel(() => { ctx.fillStyle = "#14171c"; ctx.fillRect(0, 0, 512, 256); ctx.fillStyle = "#39ff5a"; ctx.fillRect(0, 0, 512, 8); ctx.font = "bold 20px Arial"; ctx.textAlign = "center"; ctx.fillStyle = "#cfd"; ctx.fillText("MOVE", 118, 214); ctx.fillText("FIRE", 396, 214); ctx.font = "bold 14px Arial"; ctx.fillText("1P    2P", 256, 236); });
    S.bezel(() => { ctx.fillStyle = "#050507"; ctx.fillRect(0, 0, 512, 384); ctx.fillStyle = "#1a1032"; ctx.beginPath(); ctx.moveTo(0, 384); for (let x = 0; x <= 512; x += 32) ctx.lineTo(x, 330 + Math.sin(x * 0.09) * 18 + Math.cos(x * 0.03) * 12); ctx.lineTo(512, 384); ctx.fill(); ctx.font = "bold 13px Arial"; ctx.fillStyle = "#57a"; ctx.textAlign = "center"; ctx.fillText("INSERT COIN  ·  1 OR 2 PLAYERS", 256, 372); });
    } },
  "ASTEROIDS": { body: 0x161c34, trim: 0x8a8d90, draw(ctx, S) {
    const rock = (x, y, r) => { ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28, q = r * (0.72 + ((k * 37) % 7) * 0.05); k ? ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q) : ctx.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } ctx.closePath(); ctx.fill(); ctx.stroke(); };
    S.side(() => { const gr = ctx.createLinearGradient(0, 0, 0, 1024); gr.addColorStop(0, "#1a1f55"); gr.addColorStop(0.6, "#3a1a66"); gr.addColorStop(1, "#7a2a50"); ctx.fillStyle = gr; ctx.fillRect(0, 0, 512, 1024); for (let k = 0; k < 200; k++) { ctx.fillStyle = `rgba(255,255,255,${Math.random()})`; ctx.fillRect(Math.random() * 512, Math.random() * 1024, 2, 2); }
      ctx.lineWidth = 4; ctx.strokeStyle = "#e8d8b0"; ctx.fillStyle = "#6a5a50"; rock(170, 250, 110); ctx.fillStyle = "#54463f"; rock(380, 480, 70); ctx.fillStyle = "#6a5a50"; rock(120, 640, 60); ctx.fillStyle = "#54463f"; rock(350, 830, 90);
      ctx.fillStyle = "#e8f0ff"; ctx.beginPath(); ctx.moveTo(300, 150); ctx.lineTo(340, 260); ctx.lineTo(300, 235); ctx.lineTo(260, 260); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#ffb040"; ctx.beginPath(); ctx.moveTo(285, 248); ctx.lineTo(300, 320); ctx.lineTo(315, 248); ctx.fill(); });
    S.marquee(() => { const gr = ctx.createLinearGradient(0, 0, 512, 0); gr.addColorStop(0, "#2a1f66"); gr.addColorStop(1, "#6a2a66"); ctx.fillStyle = gr; ctx.fillRect(0, 0, 512, 128); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.shadowBlur = 12; ctx.shadowColor = "#fff"; ctx.fillStyle = "#fff"; ctx.font = "italic 900 66px Arial Black, Arial"; ctx.fillText("ASTEROIDS", 256, 66, 490); ctx.shadowBlur = 0; });
    S.panel(() => { ctx.fillStyle = "#1a2040"; ctx.fillRect(0, 0, 512, 256); ctx.strokeStyle = "#8a90c0"; ctx.lineWidth = 3; ctx.strokeRect(10, 10, 492, 236); ctx.fillStyle = "#cdd"; ctx.textAlign = "center"; ctx.font = "bold 16px Arial"; ctx.fillText("ROTATE", 108, 214); ctx.fillText("HYPERSPACE", 256, 90); ctx.fillText("THRUST   FIRE", 400, 214); });
    S.bezel(() => { ctx.fillStyle = "#04040c"; ctx.fillRect(0, 0, 512, 384); ctx.lineWidth = 2; ctx.strokeStyle = "#567"; ctx.fillStyle = "#04040c"; rock(30, 50, 26); rock(480, 340, 34); rock(36, 340, 18); rock(470, 40, 16); });
    } },
  "MISSILE COMMAND": { body: 0x1a2a52, trim: 0xc8c8c8, draw(ctx, S) {
    const trail = (x0, y0, x1, y1, c) => { ctx.strokeStyle = c; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.fillStyle = "#fff"; ctx.fillRect(x1 - 4, y1 - 4, 8, 8); };
    S.side(() => { const gr = ctx.createLinearGradient(0, 0, 0, 1024); gr.addColorStop(0, "#0a0a32"); gr.addColorStop(0.55, "#4a1a48"); gr.addColorStop(0.85, "#e0602a"); gr.addColorStop(1, "#ffc040"); ctx.fillStyle = gr; ctx.fillRect(0, 0, 512, 1024);
      for (let k = 0; k < 7; k++) trail(40 + k * 70, -10, 60 + k * 60 + (k % 2 ? 120 : -100), 300 + (k * 137) % 400, ["#ff5040", "#ffd040", "#50c0ff"][k % 3]);
      for (const [x, y, r] of [[160, 610, 90], [370, 440, 60]]) { const q = ctx.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, "#fff"); q.addColorStop(0.5, "#ffc040"); q.addColorStop(1, "rgba(255,80,40,0)"); ctx.fillStyle = q; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
      ctx.fillStyle = "#0a0814"; for (let x = 0; x < 512; x += 44) { const h = 40 + (x * 13 % 90); ctx.fillRect(x, 1024 - 60 - h, 38, h + 60); } });
    S.marquee(() => { ctx.fillStyle = "#101040"; ctx.fillRect(0, 0, 512, 128); const gr = ctx.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "#ffe060"); gr.addColorStop(1, "#ff6030"); ctx.fillStyle = gr; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.shadowBlur = 12; ctx.shadowColor = "#ff8030"; ctx.font = "italic 900 50px Arial Black, Arial"; ctx.fillText("MISSILE COMMAND", 256, 66, 490); ctx.shadowBlur = 0; });
    S.panel(() => { ctx.fillStyle = "#1c2030"; ctx.fillRect(0, 0, 512, 256); ctx.fillStyle = "#b03020"; ctx.fillRect(0, 196, 512, 60); ctx.fillStyle = "#ffe0a0"; ctx.textAlign = "center"; ctx.font = "bold 16px Arial"; ctx.fillText("ALPHA", 90, 228); ctx.fillText("DELTA", 256, 228); ctx.fillText("OMEGA", 422, 228); });
    S.bezel(() => { ctx.fillStyle = "#06061a"; ctx.fillRect(0, 0, 512, 384); ctx.fillStyle = "#1a1a50"; ctx.fillRect(0, 340, 512, 44); ctx.fillStyle = "#ffc040"; ctx.font = "bold 13px Arial"; ctx.textAlign = "center"; ctx.fillText("DEFEND  YOUR  CITIES", 256, 366); });
    } },
};
const CAB_PROFILE = [[-0.36, 0], [0.24, 0], [0.24, 0.76], [0.38, 0.9], [0.38, 0.98], [0.12, 1.1], [0.02, 1.58], [0.2, 1.66], [0.2, 1.9], [-0.22, 1.9], [-0.36, 1.7]];
const crtGlass = () => crtGlass.m ||= new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, map: makeTexture((ctx, W, H) => {   // the tube's own glass: its corners falling dark
  ctx.clearRect(0, 0, W, H); const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.6, W / 2, H / 2, H * 0.92); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.8)"); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H); }, 256, 192) });
function tonyCabinet(g, game, i, X, Z, hitBox, solidAt, wallX) {
  const [name, glow] = game, art = CAB_ART[name], cab = new THREE.Group(); cab.position.set(X, 0, Z); cab.rotation.y = Math.PI / 2; g.add(cab);
  const K = tonyKit(), A = tonyKit(), R = (x, y, w, h) => [x / 1024, 1 - (y + h) / 1024, (x + w) / 1024, 1 - y / 1024];
  const sheet = makeTexture((ctx) => { const S = {}; const clip = (x, y, w, h) => fn => { ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.translate(x, y); fn(); ctx.restore(); };
    S.side = clip(0, 0, 512, 1024); S.marquee = clip(512, 0, 512, 128); S.panel = clip(512, 128, 512, 256); S.bezel = clip(512, 384, 512, 384); art.draw(ctx, S); }, 1024, 1024);
  sheet.anisotropy = 4;
  const uvSide = R(0, 0, 512, 1024), uvMq = R(512, 0, 512, 128), uvCP = R(512, 128, 512, 256), uvBz = R(512, 384, 512, 384);
  const STEEL = 0x9a9ea2, BLACK = 0x121212, W2 = 0.31;
  // the two side panels: T-molding round the edge (the panel's own color shows there), the art inset on the outside face
  const outline = sign => { const s = new THREE.Shape(); CAB_PROFILE.forEach(([z, y], k) => k ? s.lineTo(sign * z, y) : s.moveTo(sign * z, y)); s.closePath(); return s; };
  const panelG = new THREE.ExtrudeGeometry(outline(1), { depth: 0.024, bevelEnabled: false }); panelG.rotateY(-Math.PI / 2);
  for (const sx of [-1, 1]) K.geo(panelG.clone(), art.trim, sx * (W2 + 0.02) + (sx < 0 ? 0.024 : 0), 0, 0, { g: 0.35 });
  for (const sx of [-1, 1]) { const inset = CAB_PROFILE.map(([z, y]) => [-0.01 + (z + 0.01) * 0.965, 0.95 + (y - 0.95) * 0.975]), s = new THREE.Shape(); inset.forEach(([z, y], k) => k ? s.lineTo(-sx * z, y) : s.moveTo(-sx * z, y));
    const sg = new THREE.ShapeGeometry(s); sg.rotateY(sx > 0 ? Math.PI / 2 : -Math.PI / 2); sg.translate(sx * (W2 + 0.0215), 0, 0);
    const P = sg.attributes.position, U = sg.attributes.uv; for (let k = 0; k < P.count; k++) { const u = (P.getZ(k) + 0.36) / 0.74, v = P.getY(k) / 1.9; U.setXY(k, uvSide[0] + (uvSide[2] - uvSide[0]) * u, uvSide[1] + (uvSide[3] - uvSide[1]) * v); }
    A.geo(sg, 0xffffff, 0, 0, 0, { g: 0.12 }); }
  // the front of it, top to bottom
  const B = art.body;
  K.box(B, W2 * 2, 0.03, 0.42, 0, 1.885, -0.01, { g: 0.2 }); K.box(B, W2 * 2, 1.7, 0.02, 0, 0.85, -0.35);            // top, back
  // the marquee: a box of light behind its plastic, an aluminum retainer top and bottom
  A.plane(0xffffff, W2 * 2, 0.22, 0, 1.78, 0.2, { uv: uvMq, e: 0.92 }); for (const y of [1.665, 1.895]) K.box(0xb8bcc0, W2 * 2, 0.012, 0.015, 0, y, 0.2, { g: 0.8 });
  // the speaker board under it, angled down at you
  K.box(0x0c0c0c, W2 * 2, 0.2, 0.012, 0, 1.62, 0.11, { rx: 1.14 }); for (let k = 0; k < 9; k++) K.box(0x2a2a2a, 0.3, 0.004, 0.006, 0, 1.585 + k * 0.009, 0.035 + k * 0.0195);
  // the monitor shelf: the printed bezel leaning back, the tube set in it
  const b = 0.205; A.plane(0xffffff, W2 * 2, 0.49, 0, 1.34, 0.07, { rx: -b, uv: uvBz, g: 0.45 });
  K.box(0x050505, 0.455, 0.345, 0.004, 0, 1.35, 0.074, { rx: -b });
  const cv = document.createElement("canvas"); cv.width = 256; cv.height = 192; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.43, 0.32), new THREE.MeshBasicMaterial({ map: tex })); screen.position.set(0, 1.35, 0.08); screen.rotation.x = -b; cab.add(screen);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.43, 0.32), crtGlass()); glass.position.set(0, 1.351, 0.085); glass.rotation.x = -b; glass.renderOrder = 2; cab.add(glass);
  // the control panel, on its slope, the shelf under it
  K.box(BLACK, W2 * 2, 0.08, 0.016, 0, 0.94, 0.374, { g: 0.35 });
  K.box(B, W2 * 2, 0.2, 0.012, 0, 0.83, 0.31, { rx: 0.785 });
  K.box(B, W2 * 2, 0.76, 0.012, 0, 0.38, 0.235, { g: 0.15 });
  K.box(BLACK, W2 * 2, 0.08, 0.016, 0, 0.04, 0.242);
  // the coin door: pressed steel, two lit coin mechs, a lock, the cash door under them
  K.box(0x5a5e62, 0.34, 0.44, 0.012, 0, 0.46, 0.246, { g: 0.55 }); K.box(0x6a6e72, 0.3, 0.14, 0.008, 0, 0.32, 0.254, { g: 0.5 });
  for (const sx of [-0.075, 0.075]) { K.box(0x1a1a1a, 0.11, 0.17, 0.008, sx, 0.56, 0.254); K.box(0xff3020, 0.05, 0.07, 0.004, sx, 0.58, 0.26, { e: 1 }); K.box(0xd8d8d8, 0.008, 0.035, 0.002, sx, 0.58, 0.263); K.cyl(0xc8c8c8, 0.016, 0.016, 0.01, sx, 0.505, 0.259, { rx: Math.PI / 2, seg: 8, g: 0.8 }); }
  K.cyl(0xc8c8c8, 0.015, 0.015, 0.006, 0.13, 0.46, 0.255, { rx: Math.PI / 2, seg: 8, g: 0.9 }); K.box(0x1a1a1a, 0.08, 0.01, 0.006, 0, 0.32, 0.259);
  K.at(0, 1.04, 0.25, 0, () => {                         // the panel, in its own frame: +y out of it, +z toward you
    K.box(0x0f0f0f, W2 * 2, 0.012, 0.29, 0, -0.008, 0, { g: 0.35 }); A.at(0, 1.04, 0.25, 0, () => A.plane(0xffffff, W2 * 2, 0.285, 0, 0.001, 0, { rx: -Math.PI / 2, uv: uvCP, g: 0.5 }), 0.432);
    const btn = (x, z, c, r = 0.021) => { K.cyl(0x202020, r + 0.006, r + 0.006, 0.006, x, 0.003, z, { seg: 12 }); K.cyl(c, r, r, 0.014, x, 0.012, z, { seg: 12, g: 0.7 }); };
    if (name === "SPACE INVADERS") { btn(-0.14, 0.02, 0xe8e8e8); btn(-0.07, 0.02, 0xe8e8e8); btn(0.2, 0.02, 0xd02020, 0.028); btn(0.02, -0.09, 0xf0d020, 0.014); btn(0.075, -0.09, 0xf0d020, 0.014); }
    else if (name === "ASTEROIDS") { btn(-0.22, 0.025, 0xe8e8e8); btn(-0.145, 0.025, 0xe8e8e8); btn(0, -0.03, 0x3080e0); btn(0.145, 0.025, 0xd02020); btn(0.22, 0.025, 0xe8e8e8); btn(-0.04, -0.105, 0xf0d020, 0.012); btn(0.04, -0.105, 0xf0d020, 0.012); }
    else { K.cyl(0x303030, 0.058, 0.058, 0.008, 0, 0.002, -0.015, { seg: 20, g: 0.7 }); K.sph(0xd8b050, 0.047, 0, 0.012, -0.015, { seg: 16, seg2: 10, g: 0.7, sy: 0.72 });   // the trackball, in its ring
      btn(-0.21, 0.015, 0xe02020, 0.029); btn(0.21, 0.015, 0xe02020, 0.029); btn(0.105, 0.09, 0xe02020, 0.024); btn(-0.105, 0.09, 0xf0d020, 0.012); }
  }, 0.432);
  // its feet, the wall cord
  for (const sx of [-0.27, 0.27]) for (const sz of [-0.3, 0.2]) K.cyl(0x1a1a1a, 0.022, 0.026, 0.012, sx, 0.006, sz, { seg: 8 });
  K.flush(cab); A.flush(cab, tonyLit({ map: sheet }));
  hitBox(0.82, 1.9, 0.72, X + 0.02, 0.95, Z, `game${i}`);
  solidAt(wallX, X + 0.4, Z - 0.35, Z + 0.35);
  return { cv, tex, name, glow, stars: Array.from({ length: 40 }, () => [Math.random() * 256, Math.random() * 192, 0.5 + Math.random() * 2]), t: i * 0.033 };
}
