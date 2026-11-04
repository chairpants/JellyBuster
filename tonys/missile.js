// ---- Missile Command: six cities along the bottom, three batteries of ten. Their missiles come in from the top along straight
// lines, more and faster each wave, some splitting on the way down. Roll the crosshair (the mouse is the trackball; WASD and the arrows
// work too), SPACE or click fires from the nearest battery with anything left: your shot flies to where the crosshair was and blooms,
// and whatever's in the bloom goes up, setting off blooms of its own. A wave's over when the sky's clear, the bonus counted up for
// what's left, the batteries refilled. Lose the last city and it's THE END ----
const MC = { W: 256, H: 192, ground: 174, cities: [48, 72, 96, 160, 184, 208], silos: [20, 128, 236] };
const mcBeep = (g, ...a) => { if (!g.attract) siBeep(...a); };
function mcNew(attract = false) {
  const g = { score: 0, wave: 0, cities: MC.cities.map(() => true), nextCity: 10000, spare: 0, cx: MC.W / 2, cy: 90, mis: [], shots: [], blooms: [], ammo: [10, 10, 10], silo: [true, true, true], over: 0, pause: 0, tally: null, flash: 0, attract, aiT: 0 };
  mcWave(g); return g;
}
const mcPal = w => [["#ff4030", "#4060ff", "#ffe040"], ["#40ff60", "#ff4030", "#40c0ff"], ["#ffe040", "#40ff60", "#ff40c0"], ["#40c0ff", "#ffe040", "#ff6030"]][(w - 1 >> 1) % 4];
function mcWave(g) {
  g.wave++; g.ammo = [10, 10, 10]; g.silo = [true, true, true];
  g.left = Math.min(34, 8 + g.wave * 2); g.spawn = 1.2; g.speed = Math.min(62, 11 + g.wave * 3.4); g.mult = Math.min(6, 1 + (g.wave - 1 >> 1)); g.pause = 1.6; g.mis = []; g.shots = []; g.blooms = []; g.tally = null;
  mcBeep(g, 300, 0.4, "square", 0.04, 400);
}
function mcTargets(g) {
  const t = []; MC.cities.forEach((x, i) => { if (g.cities[i]) t.push({ x, city: i }); }); MC.silos.forEach((x, i) => { if (g.silo[i]) t.push({ x, silo: i }); });
  return t;
}
function mcLaunch(g, x0, y0, tgt) {
  const dx = tgt.x - x0, dy = MC.ground + 2 - y0, L = Math.hypot(dx, dy);
  g.mis.push({ x0, y0, x: x0, y: y0, vx: dx / L * g.speed, vy: dy / L * g.speed, tgt, split: g.wave > 1 && y0 < 10 && Math.random() < Math.min(0.5, 0.12 + g.wave * 0.05) ? 45 + Math.random() * 50 : 0 });
}
function mcFire(g) {
  if (g.over || g.pause > 0 || g.tally) return;
  let best = -1, bd = 1e9; g.ammo.forEach((n, i) => { const d = Math.abs(MC.silos[i] - g.cx); if (g.silo[i] && n > 0 && d < bd) { bd = d; best = i; } });
  if (best < 0) return mcBeep(g, 90, 0.08, "square", 0.03);
  g.ammo[best]--; const x0 = MC.silos[best], y0 = MC.ground - 10, L = Math.hypot(g.cx - x0, g.cy - y0), sp = best === 1 ? 210 : 150;
  g.shots.push({ x0, y0, x: x0, y: y0, tx: g.cx, ty: g.cy, vx: (g.cx - x0) / L * sp, vy: (g.cy - y0) / L * sp, L, gone: 0, sp });
  mcBeep(g, 900, 0.14, "sawtooth", 0.03, -600);
}
const mcBloom = (g, x, y, mine) => { g.blooms.push({ x, y, t: 0, mine }); mcBeep(g, mine ? 140 : 90, 0.3, "sawtooth", 0.05, -60); };
function mcStep(g, dt) {
  if (g.over) { g.over -= dt; return; }
  if (g.flash > 0) g.flash -= dt;
  if (g.pause > 0) { g.pause -= dt; return; }
  // the sky
  if (g.left > 0 && (g.spawn -= dt) <= 0) {
    const t = mcTargets(g); g.spawn = Math.max(0.35, 2.2 - g.wave * 0.14) * (0.5 + Math.random());
    for (let n = 1 + (Math.random() < 0.35 ? 1 : 0); n > 0 && g.left > 0 && t.length; n--, g.left--) mcLaunch(g, Math.random() * MC.W, 0, t[Math.floor(Math.random() * t.length)]);
  }
  for (const s of [...g.shots]) { s.x += s.vx * dt; s.y += s.vy * dt; s.gone += s.sp * dt; if (s.gone >= s.L) { g.shots.splice(g.shots.indexOf(s), 1); mcBloom(g, s.tx, s.ty, true); } }
  for (const b of [...g.blooms]) { b.t += dt; if (b.t > 1.6) g.blooms.splice(g.blooms.indexOf(b), 1); }
  const bloomR = b => 16 * (b.t < 0.55 ? b.t / 0.55 : b.t < 0.9 ? 1 : 1 - (b.t - 0.9) / 0.7);
  for (const m of [...g.mis]) {
    m.x += m.vx * dt; m.y += m.vy * dt;
    if (m.split && m.y > m.split) { const t = mcTargets(g); m.split = 0; for (let k = 0; k < 2 && t.length; k++) { mcLaunch(g, m.x, m.y, t[Math.floor(Math.random() * t.length)]); g.mis.at(-1).x0 = m.x; g.mis.at(-1).y0 = m.y; g.mis.at(-1).split = 0; } }
    if (g.blooms.some(b => Math.hypot(b.x - m.x, b.y - m.y) < bloomR(b))) { g.mis.splice(g.mis.indexOf(m), 1); g.score += 25 * g.mult; mcBloom(g, m.x, m.y, true); continue; }
    if (m.y >= MC.ground) {                       // down: whatever it was aimed at's gone
      g.mis.splice(g.mis.indexOf(m), 1); mcBloom(g, m.x, MC.ground - 3, false); g.flash = 0.12;
      if (m.tgt.city != null && g.cities[m.tgt.city]) { g.cities[m.tgt.city] = false; mcBeep(g, 70, 0.7, "sawtooth", 0.07, -40); }
      if (m.tgt.silo != null && g.silo[m.tgt.silo]) { g.silo[m.tgt.silo] = false; g.ammo[m.tgt.silo] = 0; mcBeep(g, 110, 0.5, "square", 0.06, -70); }
    }
  }
  if (g.score >= g.nextCity) { g.nextCity += 10000; g.spare++; mcBeep(g, 880, 0.4, "square", 0.04, 440); }
  if (!g.left && !g.mis.length && !g.blooms.length && !g.shots.length && !g.tally) {
    if (!g.cities.some(Boolean) && !g.spare) { g.over = g.attract ? 2 : 4; mcBeep(g, 200, 1.4, "sawtooth", 0.06, -170); return; }
    const am = g.ammo.reduce((a, b) => a + b, 0), ci = g.cities.filter(Boolean).length;
    g.tally = { am, ci, t: 2.6 }; g.score += (am * 5 + ci * 100) * g.mult; mcBeep(g, 660, 0.3, "triangle", 0.05, 220);
  }
  if (g.tally && (g.tally.t -= dt) <= 0) {
    if (g.spare) { const i = g.cities.indexOf(false); if (i >= 0) { g.cities[i] = true; g.spare--; } }
    mcWave(g);
  }
}
function mcTick(dt) {
  const g = arcade.g;
  if (g.over && g.over - dt <= 0) { arcadeStop(); return; }
  const sp = 150, mx = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0), my = (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) - (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
  g.cx = Math.max(2, Math.min(MC.W - 2, g.cx + mx * sp * dt)); g.cy = Math.max(14, Math.min(MC.ground - 16, g.cy + my * sp * dt));
  mcStep(g, dt); mcDraw(g);
}
function mcAttract(g, dt) {                       // nobody's playing: it plays itself, not very well
  g.attract = true; mcStep(g, dt);
  if (g.over <= 0 && !g.cities.some(Boolean) && !g.spare && !g.mis.length) Object.assign(g, mcNew(true));
  if ((g.aiT -= dt) <= 0 && g.mis.length) { g.aiT = 0.5 + Math.random() * 0.9; const m = g.mis[Math.floor(Math.random() * g.mis.length)]; g.cx = m.x + m.vx * 0.9; g.cy = Math.max(14, m.y + m.vy * 0.9); mcFire(g); }
  mcDraw(g, true);
}
function mcDraw(g, attract) {
  const sc = tony.screens?.[2]; if (!sc) return;
  const ctx = sc.cv.getContext("2d"), W = MC.W, H = MC.H, [mc, sky, land] = mcPal(g.wave);
  ctx.fillStyle = g.flash > 0 ? "#fff" : "#000"; if (g.flash > 0 && !attract) ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H); if (g.flash <= 0) { ctx.fillStyle = "#000014"; ctx.fillRect(0, 0, W, H); }
  // the ground, its three mounds, what's left of the cities
  ctx.fillStyle = land; ctx.fillRect(0, MC.ground, W, H - MC.ground);
  MC.silos.forEach((x, i) => { ctx.beginPath(); ctx.moveTo(x - 20, MC.ground + 1); ctx.lineTo(x - 11, MC.ground - 8); ctx.lineTo(x + 11, MC.ground - 8); ctx.lineTo(x + 20, MC.ground + 1); ctx.fill();
    if (g.silo[i]) { ctx.fillStyle = "#101040"; let n = 0; for (let r = 0; r < 4 && n < g.ammo[i]; r++) for (let c = 0; c <= r && n < g.ammo[i]; c++, n++) ctx.fillRect(x - r * 2 + c * 4 - 1, MC.ground - 6 + r * 2, 2, 2); ctx.fillStyle = land; } });
  MC.cities.forEach((x, i) => { if (g.cities[i]) { ctx.fillStyle = sky; ctx.fillRect(x - 8, MC.ground - 5, 16, 5); ctx.fillRect(x - 6, MC.ground - 8, 4, 3); ctx.fillRect(x + 1, MC.ground - 10, 3, 5); ctx.fillStyle = land; ctx.fillRect(x - 5, MC.ground - 3, 2, 2); ctx.fillRect(x + 3, MC.ground - 3, 2, 2); } else { ctx.fillStyle = "#505050"; ctx.fillRect(x - 7, MC.ground - 2, 14, 2); } });
  ctx.lineWidth = 1;
  for (const m of g.mis) { ctx.strokeStyle = mc; ctx.beginPath(); ctx.moveTo(m.x0, m.y0); ctx.lineTo(m.x, m.y); ctx.stroke(); ctx.fillStyle = Math.floor(tony.t * 12) % 2 ? "#fff" : mc; ctx.fillRect(Math.round(m.x) - 1, Math.round(m.y) - 1, 2, 2); }
  for (const s of g.shots) { ctx.strokeStyle = "#50a0ff"; ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.lineTo(s.x, s.y); ctx.stroke(); ctx.fillStyle = "#fff"; ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1); ctx.strokeStyle = "#fff"; ctx.beginPath(); ctx.moveTo(s.tx - 2, s.ty - 2); ctx.lineTo(s.tx + 2, s.ty + 2); ctx.moveTo(s.tx + 2, s.ty - 2); ctx.lineTo(s.tx - 2, s.ty + 2); ctx.stroke(); }
  for (const b of g.blooms) { const r = 16 * (b.t < 0.55 ? b.t / 0.55 : b.t < 0.9 ? 1 : 1 - (b.t - 0.9) / 0.7); if (r <= 0) continue; ctx.fillStyle = ["#ffffff", "#ffe040", "#ff6030", "#ff40c0", "#40c0ff"][Math.floor(b.t * 20) % 5]; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, 7); ctx.fill(); }
  // the crosshair
  ctx.strokeStyle = "#40e0ff"; ctx.beginPath(); ctx.moveTo(g.cx - 5, g.cy); ctx.lineTo(g.cx - 1, g.cy); ctx.moveTo(g.cx + 1, g.cy); ctx.lineTo(g.cx + 5, g.cy); ctx.moveTo(g.cx, g.cy - 5); ctx.lineTo(g.cx, g.cy - 1); ctx.moveTo(g.cx, g.cy + 1); ctx.lineTo(g.cx, g.cy + 5); ctx.stroke();
  // the score, the hi
  ctx.font = "bold 10px Courier New"; ctx.fillStyle = mc; ctx.textAlign = "left"; ctx.fillText(String(g.score).padStart(6, " "), 8, 10); ctx.textAlign = "right"; ctx.fillText(String(Math.max(tony.scores[2] || 0, g.score, 7500)).padStart(6, "0"), W - 8, 10);
  ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.font = "bold 11px Courier New";
  if (g.pause > 0) { ctx.fillText(`WAVE ${g.wave}  ·  ${g.mult} X POINTS`, W / 2, H * 0.42); ctx.font = "bold 12px Courier New"; ctx.fillText("DEFEND CITIES", W / 2, H * 0.52); }
  if (g.tally) { ctx.fillText("BONUS POINTS", W / 2, H * 0.32); ctx.font = "bold 10px Courier New"; ctx.fillText(`${g.tally.am} x ${5 * g.mult}   MISSILES`, W / 2, H * 0.42); ctx.fillText(`${g.tally.ci} x ${100 * g.mult}   CITIES`, W / 2, H * 0.5); }
  if (g.over) { ctx.fillStyle = "#ff4030"; ctx.font = "bold 26px Courier New"; ctx.fillText("THE END", W / 2, H * 0.48); }
  if (attract && !g.pause && !g.tally && !g.over && Math.floor(tony.t * 2) % 2) { ctx.fillStyle = "#fff"; ctx.font = "bold 12px Courier New"; ctx.fillText("INSERT COIN", W / 2, H * 0.3); }
  sc.tex.needsUpdate = true;
}
// the trackball's the mouse
const mcOn = () => arcade.on && arcade.g?.cities;
addEventListener("mousemove", e => { if (mcOn() && document.pointerLockElement === canvas && Math.abs(e.movementX) < 250 && Math.abs(e.movementY) < 250) { const g = arcade.g; g.cx = Math.max(2, Math.min(MC.W - 2, g.cx + e.movementX * 0.45)); g.cy = Math.max(14, Math.min(MC.ground - 16, g.cy + e.movementY * 0.45)); } });
addEventListener("mousedown", e => { if (mcOn() && document.pointerLockElement === canvas && e.button === 0) mcFire(arcade.g); });
