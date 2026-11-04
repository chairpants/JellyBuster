// ---- the time and weather wheel (hold F): a ring of choices round the middle of the screen, the mouse moving a pointer of its own round it (the real one
// stays locked), and the way it points is what's picked. Click one and it's so: the clock jumps to that hour, the weather's that, now, the ground already
// soaked or snowed over. Right-click or Esc: gone, nothing changed ----
const WHEEL_OPTS = [["8 AM", "time", 8], ["NOON", "time", 12], ["4 PM", "time", 16], ["8 PM", "time", 20], ["MIDNIGHT", "time", 24],
  ["CLEAR", "sky", "clear", 0, 0, 0, { clouds: 0.05, wind: 0.1 }], ["RAIN", "sky", "rain", 0.6, 1, 0, { clouds: 0.92, wind: 0.3 }], ["STORM", "sky", "rain", 1, 1, 0, { clouds: 1, wind: 0.85 }],
  ["SNOW", "sky", "snow", 0.8, 0, 0.75, { clouds: 0.88, wind: 0.25 }], ["BLIZZARD", "sky", "snow", 1, 0, 1, { clouds: 1, wind: 0.95 }], ["FOG", "sky", "clear", 0, 0.3, 0, { fogAll: 1, clouds: 0.6, wind: 0.05 }]];
const WHEEL_SKY = { 8: "#f4a259", 12: "#5aa9e6", 16: "#e9c46a", 20: "#6d4c8f", 24: "#1b2a4a" };   // each hour's sky, behind its picture
const WHEEL = { open: false, x: 0, y: 0, hover: -1, hold: null, IN: 80, OUT: 250, el: null };
function wheelOpen() {
  if (!WHEEL.el) { WHEEL.el = document.createElement("canvas"); WHEEL.el.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;z-index:40;pointer-events:none"; document.body.appendChild(WHEEL.el); }
  Object.assign(WHEEL, { open: true, x: 0, y: 0, hover: -1 }); keys.clear();
  WHEEL.el.style.display = "block"; wheelDraw();
}
function wheelClose() { WHEEL.open = false; if (WHEEL.el) WHEEL.el.style.display = "none"; }
function wheelMouse(dx, dy) {                    // the pointer, held to the ring's edge; past a little dead zone, it's the direction that picks
  WHEEL.x += dx; WHEEL.y += dy;
  const d = Math.hypot(WHEEL.x, WHEEL.y), step = Math.PI * 2 / WHEEL_OPTS.length;
  if (d > WHEEL.OUT) { WHEEL.x *= WHEEL.OUT / d; WHEEL.y *= WHEEL.OUT / d; }
  WHEEL.hover = d < WHEEL.IN * 0.5 ? -1 : Math.floor((((Math.atan2(WHEEL.y, WHEEL.x) + Math.PI / 2 + step / 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / step);
  wheelDraw();
}
function wheelPick(o) {
  if (o[1] === "time") {
    const was = shift.h; shift.warp = 0; shift.h = o[2];
    if (CUSTOMER) cmClock(at => was < at && shift.h >= at);   // (past opening or closing: what happens then still happens)
  } else wxSetNow(o[0], o[2], o[3], o[4], o[5], o[6]);
  window.StoreTrees?.refresh();
}
function wheelClick(button) {                    // -> it took the click
  if (!WHEEL.open) return false;
  if (button === 0 && WHEEL.hover >= 0) wheelPick(WHEEL_OPTS[WHEEL.hover]);
  wheelClose(); return true;
}
function wheelDraw() {
  const c = WHEEL.el, S = devicePixelRatio || 1, W = innerWidth, H = innerHeight; c.width = W * S; c.height = H * S;
  const g = c.getContext("2d"); g.scale(S, S); g.translate(W / 2, H / 2);
  const k = Math.min(1, Math.min(W, H) / (WHEEL.OUT * 2 + 30)); g.scale(k, k);   // (a small window: the ring fits)
  const n = WHEEL_OPTS.length, step = Math.PI * 2 / n, line = (x0, y0, x1, y1, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }, dot = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
  g.lineCap = "round"; g.textAlign = "center"; g.textBaseline = "middle";
  WHEEL_OPTS.forEach((o, i) => {
    const a0 = -Math.PI / 2 + (i - 0.5) * step, a1 = a0 + step, on = i === WHEEL.hover, mid = (a0 + a1) / 2, r = (WHEEL.IN + WHEEL.OUT) / 2, mx = Math.cos(mid) * r, my = Math.sin(mid) * r;
    g.beginPath(); g.arc(0, 0, WHEEL.OUT, a0, a1); g.arc(0, 0, WHEEL.IN, a1, a0, true); g.closePath();
    g.fillStyle = o[1] === "time" ? (on ? "rgba(62,70,92,.92)" : "rgba(20,26,41,.82)") : (on ? "rgba(92,70,58,.92)" : "rgba(31,20,15,.82)"); g.fill();
    g.strokeStyle = on ? "rgba(255,212,0,.9)" : "rgba(255,255,255,.25)"; g.lineWidth = on ? 3 : 1.5; g.stroke();
    g.save(); g.translate(mx, my - 14); const s = on ? 1.25 : 1; g.scale(s, s); wheelIcon(g, o, line, dot); g.restore();
  });
  g.font = "bold 15px Arial, sans-serif"; g.lineJoin = "round";
  WHEEL_OPTS.forEach((o, i) => {                 // (their names over the lot, so no wedge covers its neighbour's)
    const mid = -Math.PI / 2 + i * step, r = (WHEEL.IN + WHEEL.OUT) / 2, mx = Math.cos(mid) * r, my = Math.sin(mid) * r;
    g.lineWidth = 4; g.strokeStyle = "#000"; g.strokeText(o[0], mx, my + 46); g.fillStyle = i === WHEEL.hover ? "#ffd400" : "#fff"; g.fillText(o[0], mx, my + 46);
  });
  g.lineWidth = 4; g.strokeStyle = "#000"; g.strokeText("TIME · WEATHER", 0, 0); g.fillStyle = "#ffd400"; g.fillText("TIME · WEATHER", 0, 0);
  dot(WHEEL.x, WHEEL.y, 7, "#ffd400"); g.strokeStyle = "#000"; g.lineWidth = 2; g.beginPath(); g.arc(WHEEL.x, WHEEL.y, 7, 0, 7); g.stroke();
}
function wheelIcon(g, o, line, dot) {            // each option's picture: the hour's sky with the sun or moon where it'd be; the weather's own
  const SUN = "#ffd23f", CLOUD = "#dfe6ee", name = o[0];
  if (o[1] === "time") {
    const h = o[2], sky = WHEEL_SKY[h], day = h >= 6 && h <= 18, t = ((day ? h - 6 : h - 18) / 12) * Math.PI, up = Math.sin(t), across = Math.cos(t), px = -across * 18, py = 10 - up * 24;
    dot(0, 0, 30, sky); g.strokeStyle = "rgba(255,255,255,.5)"; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 30, 0, 7); g.stroke(); line(-30, 10, 30, 10, "rgba(0,0,0,.35)", 2);
    if (day) { for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; line(px + Math.cos(a) * 10, py + Math.sin(a) * 10, px + Math.cos(a) * 15, py + Math.sin(a) * 15, SUN, 2); } dot(px, py, 8, SUN); }
    else { dot(px, py, 9, "#f1f0e0"); dot(px + 4, py - 3, 8, sky); for (const [x, y] of [[-14, -14], [12, -18], [16, -2], [-20, 0]]) dot(x, y, 1.4, "#fff"); }
    return;
  }
  if (name === "CLEAR") { for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; line(Math.cos(a) * 16, Math.sin(a) * 16, Math.cos(a) * 25, Math.sin(a) * 25, SUN, 3); } dot(0, 0, 13, SUN); return; }
  if (name === "FOG") { for (let k = 0; k < 4; k++) { const y = -14 + k * 9, off = k % 2 ? 6 : -6; line(-22 + off, y, 22 + off, y, `rgba(217,224,235,${0.9 - k * 0.12})`, 4); } return; }
  const dark = name === "STORM" || name === "BLIZZARD", snow = name === "SNOW" || name === "BLIZZARD", cc = dark ? "#7a7f83" : CLOUD;
  for (const [x, y, r] of [[-12, -4, 10], [0, -10, 13], [13, -4, 10], [0, 0, 11]]) dot(x, y, r, cc);
  g.fillStyle = cc; g.fillRect(-22, -4, 44, 12);
  if (snow) {
    const flakes = [[-14, 18], [0, 24], [14, 18], [-7, 30], [8, 32], ...(dark ? [[-20, 28], [20, 26], [-2, 36], [16, 36]] : [])];
    if (dark) for (const y of [16, 26]) line(-26, y, -10, y - 3, "rgba(255,255,255,.7)", 2);
    for (const [x, y] of flakes) for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; line(x - Math.cos(a) * 4, y - Math.sin(a) * 4, x + Math.cos(a) * 4, y + Math.sin(a) * 4, "#fff", 1.5); }
  } else for (const x of [-14, -4, 6, 16]) line(x, 14, x - 5, 28, "#6fb7ff", 2.5);
  if (dark && !snow) { g.fillStyle = SUN; g.beginPath(); for (const [x, y] of [[2, 8], [-6, 22], [0, 22], [-4, 34], [9, 17], [2, 17], [7, 8]]) g.lineTo(x, y); g.closePath(); g.fill(); }
}
addEventListener("mousedown", e => { if (wheelClick(e.button)) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);   // (first: while it's up, the click's only for it)
document.addEventListener("pointerlockchange", () => { if (document.pointerLockElement !== canvas) wheelClose(); });
