// ---------------- TV lounge (living room, center of the back half) ----------------
const TV = { x: 0, z: 26.8 };   // whole lounge (rug, table, couch, lamps, TV lights) is placed relative to this
const LAMP_ON = 0.32;               // mood lighting only — barely reaches past its own pool
const SHADE_GLOW = 0.45;                   // lit-fabric glow on the lamp shades — higher blows them out to a white blob under bloom
// TV light, scene side (shader side is TVU/TV_FRAG up top). Zone k = row*3 + col
// of the picture; the screen faces -z, so picture column 0 (the viewer's left) is world +x
const tvLight = { base: 0, avg: new THREE.Color(0x8899bb) };   // base: set by playEpisode/eject; avg: linear screen average
const TV_GAIN = 6.5, TV_AMB = 0.875;                           // direct throw / bounce fill, at full lights-out strength
const TV_SCREEN_Z = TV.z - 0.558 - 0.01;                       // just in front of the glass
for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) TVU.uTvZoneP.value.set([0.6 - 0.6 * c, 1.35 - 0.4 * r, TV_SCREEN_Z], (r * 3 + c) * 3);
TVU.uTvRoom.value.set(WALL_L, STORE.x, STORE.h + 0.05, TV_SCREEN_Z);   // +5cm: the ceiling sits exactly at STORE.h, and a hard cutoff there flickers in and out
const thZoneTarget = new Float32Array(TH_COLS * TH_ROWS * 3).fill(0.3);   // the same for the theater screen's patches
const tvZoneTarget = new Float32Array(27).fill(0.3);           // latest screen sample (linear); uTvZoneC eases toward it every frame
// a real TV throws light behind itself too — the screen patches above only
// light what's in front of the glass, so a short point light covers the
// wash on the wall and floor behind the cabinet
const tvBackGlow = new THREE.PointLight(0x8899bb, 0, 6, 2); tvBackGlow.position.set(TV.x, 1.3, TV.z + 0.6); scene.add(tvBackGlow);
// shadow casters the colliders don't describe well: the table as its top +
// TV-side panel (so the floor under it is shaded, not buried in one solid
// box), the couch as base/back/arms, and the two lamp shades. Everything
// else casts from its collider (y0..y1, default shelf height)
const TV_PROXIES = [
  { x0: -0.53, x1: 0.53, y0: 0.3, y1: 0.35, z0: TV.z - 2.08, z1: TV.z - 1.55 },    // table top
  { x0: -0.5, x1: 0.5, y0: 0, y1: 0.315, z0: TV.z - 1.58, z1: TV.z - 1.55 },       // table's TV-side panel
  { x0: -1.254, x1: 1.254, y0: 0.11, y1: 0.5, z0: TV.z - 3.89, z1: TV.z - 2.83 },  // couch base
  { x0: -1.05, x1: 1.05, y0: 0.39, y1: 1.0, z0: TV.z - 3.89, z1: TV.z - 3.6 },     // couch back
  ...[-1, 1].map(s => ({ x0: s < 0 ? -1.254 : 1.01, x1: s < 0 ? -1.01 : 1.254, y0: 0.11, y1: 0.71, z0: TV.z - 3.87, z1: TV.z - 2.9 })),   // arms
  ...[-1, 1].map(s => ({ x0: s * 1.6 - 0.2, x1: s * 1.6 + 0.2, y0: 1.3, y1: 1.64, z0: TV.z - 3.56, z1: TV.z - 3.16 })),              // lamp shades
];
const TV_VOL = { x0: WALL_L, z0: 4, cell: 0.3 };               // front of the store past the counter is far enough out to go unshadowed
const tvVolN = [Math.ceil((STORE.x - WALL_L) / TV_VOL.cell), Math.ceil(STORE.h / TV_VOL.cell), Math.ceil((TV_SCREEN_Z - TV_VOL.z0) / TV_VOL.cell)];
const tvVisTex = new THREE.Data3DTexture(new Uint8Array(tvVolN[0] * tvVolN[1] * tvVolN[2] * 4).fill(255), ...tvVolN);
tvVisTex.minFilter = tvVisTex.magFilter = THREE.LinearFilter; tvVisTex.unpackAlignment = 1; tvVisTex.needsUpdate = true;
TVU.uTvVis.value = tvVisTex;
TVU.uTvVolMin.value.set(TV_VOL.x0, 0, TV_VOL.z0);
TVU.uTvVolSize.value.set(tvVolN[0] * TV_VOL.cell, tvVolN[1] * TV_VOL.cell, tvVolN[2] * TV_VOL.cell);
TVU.uTvCell.value = TV_VOL.cell * 0.6;
// segment o→o+d (t in 0..1) vs axis-aligned box, slab test
function segHitsBox(ox, oy, oz, dx, dy, dz, b) {
  let t0 = 0, t1 = 1;
  const axis = (o, d, lo, hi) => {
    if (Math.abs(d) < 1e-9) return o >= lo && o <= hi;
    let ta = (lo - o) / d, tb = (hi - o) / d; if (ta > tb) { const t = ta; ta = tb; tb = t; }
    if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; return t0 <= t1;
  };
  return axis(ox, dx, b.x0, b.x1) && axis(oy, dy, b.y0, b.y1) && axis(oz, dz, b.z0, b.z1);
}
// Bake: per voxel, the fraction of each screen third (6 sample points apiece)
// with a clear line of sight. A box containing the voxel itself is skipped, so
// a surface's own lighting reads right instead of every voxel touching a
// wall or shelf going black. Runs as a generator, a slice per frame, from
// the main loop — colliders are all in place by the first frame.
// ponytail: brute-force boxes filtered per voxel column, ~1s spread over frames; a BVH if the store grows a lot
function* bakeTvVis() {
  const boxes = colliders.filter(c => c.shadow !== false)
    .map(c => ({ x0: c.x0, x1: c.x1, y0: c.y0 ?? 0, y1: c.y1 ?? BAY.h, z0: c.z0, z1: c.z1 })).concat(TV_PROXIES);
  const P = TVU.uTvZoneP.value, [nx, ny, nz] = tvVolN, { x0, z0, cell } = TV_VOL, data = tvVisTex.image.data;
  const S = [0, 1, 2].map(c => [-0.15, 0.15].flatMap(dx => [1.35, 0.95, 0.55].map(y => [P[c * 3] + dx, y, TV_SCREEN_Z])));
  for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
    const vx = x0 + (i + 0.5) * cell, vz = z0 + (k + 0.5) * cell;
    const near = boxes.filter(b => b.x1 > Math.min(vx, -0.9) && b.x0 < Math.max(vx, 0.9) && b.z1 > vz && b.z0 < TV_SCREEN_Z);
    for (let j = 0; j < ny; j++) {
      const vy = (j + 0.5) * cell, o = ((k * ny + j) * nx + i) * 4;
      const cand = near.filter(b => !(vx > b.x0 && vx < b.x1 && vy > b.y0 && vy < b.y1 && vz > b.z0 && vz < b.z1));
      for (let c = 0; c < 3; c++) {
        let lit = 0;
        for (const [sx, sy, sz] of S[c]) if (!cand.some(b => segHitsBox(vx, vy, vz, sx - vx, sy - vy, sz - vz, b))) lit++;
        data[o + c] = lit * 255 / S[c].length | 0;
      }
    }
    yield;
  }
  tvVisTex.needsUpdate = true;
}
let tvBake = bakeTvVis();
const screenGeo = new THREE.PlaneGeometry(1.8, 1.2);   // big-screen TV, ~4:3

// video is drawn into this canvas fit to its own native aspect (never
// stretched), black bars filling whatever's left — see updateVideoFrame,
// called once per frame from the main loop while a tape is playing
const videoCanvas = document.createElement("canvas"); videoCanvas.width = 480; videoCanvas.height = 320;
const videoCtx = videoCanvas.getContext("2d");
// Per show-season crops, { "itemId:season": { crop: {x,y,w,h} } } as fractions of the full frame, for a rip with its
// picture baked into a black surround; none needed for a library's own files, but the screen still knows how.
const TAPE_FIXES = {};
const tapeFix = tape => TAPE_FIXES[`${tape.id}:${tape.season}`] || {};
const BW_SHOWS = new Set();                  // item ids to force back to black & white (a garish colorized rip)

// ---------------- TV picture settings: a SETTINGS menu, on the TV ----------------
// The usual player controls (minus captions — no caption tracks
// here): OVERLAY (the VCR on-screen display), SCANLINES, PIXELATED, B&W,
// BRIGHTNESS / CONTRAST / COLOR / TINT / SHARPEN, RESET, CLOSE. The crosshair
// is the remote: right-click the TV (or anywhere while seated) opens it, left-
// click picks a row — toggles flip, a slider jumps to where you clicked on its
// bar, the wheel nudges whichever slider you're pointing at. Saved per browser.
const TV_DEFAULTS = { overlay: true, scanlines: true, pixelated: false, bw: false,
  brightness: 100, contrast: 100, saturate: 100, hue: 0, sharpen: 0, volume: 100 };
let tvSet = { ...TV_DEFAULTS };
try { Object.assign(tvSet, JSON.parse(localStorage.getItem("jellybuster-tv") || "{}")); } catch {}
const TV_ROWS = [
  { k: "overlay", label: "OVERLAY" }, { k: "scanlines", label: "SCANLINES" },
  { k: "pixelated", label: "PIXELATED" }, { k: "bw", label: "B&W" },
  { k: "brightness", label: "BRIGHTNESS", min: 50, max: 150, step: 5 },
  { k: "contrast", label: "CONTRAST", min: 50, max: 150, step: 5 },
  { k: "saturate", label: "COLOR", min: 0, max: 200, step: 5 },
  { k: "hue", label: "TINT", min: 0, max: 360, step: 10 },
  { k: "sharpen", label: "SHARPEN", min: 0, max: 100, step: 5 },
  { k: "volume", label: "VOLUME", min: 0, max: 100, step: 5 },   // the tape's sound only (M is the store's)
];
// menu layout on the 480x320 screen canvas
const TVM = { rowY: 58, rowH: 21, labelX: 44, barX: 214, barW: 190, chkX: 214, chkW: 26, btnY: 272, btnH: 30,
  buttons: [{ k: "reset", label: "RESET", x: 128, w: 100 }, { k: "close", label: "CLOSE", x: 252, w: 100 }] };
let tvMenu = false, tvHover = null;          // hover: a TV_ROWS index, "reset" or "close"
const osd = { text: "", until: 0 };          // VCR on-screen display (the OVERLAY setting)
function tvOsd(text, secs = 3) { osd.text = text; osd.until = secs ? performance.now() + secs * 1000 : Infinity; }
function applyTv() {
  try { localStorage.setItem("jellybuster-tv", JSON.stringify(tvSet)); } catch {}
  video.volume = tvSet.volume / 100;
  // unsharp-mask kernel: lerp identity -> classic sharpen by SHARPEN
  const a = tvSet.sharpen / 100 * 1.5;
  document.getElementById("tvSharpenMatrix")?.setAttribute("kernelMatrix", `0 ${-a} 0 ${-a} ${1 + 4 * a} ${-a} 0 ${-a} 0`);
  const f = tvSet.pixelated ? THREE.NearestFilter : THREE.LinearFilter;
  if (videoTex && videoTex.magFilter !== f) { videoTex.magFilter = videoTex.minFilter = f; videoTex.needsUpdate = true; }
}
function pictureFilter(tape, withSharpen = true) {
  const t = tvSet, f = [];
  if (t.brightness !== 100) f.push(`brightness(${t.brightness}%)`);
  if (t.contrast !== 100) f.push(`contrast(${t.contrast}%)`);
  if (t.bw || (tape && BW_SHOWS.has(tape.id))) f.push("grayscale(1)");   // B&W overrides COLOR without losing it
  else if (t.saturate !== 100) f.push(`saturate(${t.saturate}%)`);
  if (t.hue) f.push(`hue-rotate(${t.hue}deg)`);
  if (withSharpen && t.sharpen > 0) f.push("url(#tvSharpen)");
  return f.join(" ") || "none";
}
const scanFx = document.createElement("canvas"); scanFx.width = 480; scanFx.height = 320;   // scanlines + glass vignette, drawn once
{
  const c = scanFx.getContext("2d");
  // every other row dimmed, with a faint cool tint (like the gap between phosphor lines), the lit rows a hair brighter
  for (let y = 0; y < 320; y += 2) { c.fillStyle = "rgba(4,8,20,.34)"; c.fillRect(0, y + 1, 480, 1); c.fillStyle = "rgba(255,255,255,.035)"; c.fillRect(0, y, 480, 1); }
  const g = c.createRadialGradient(240, 160, 110, 240, 160, 300); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.45)");
  c.fillStyle = g; c.fillRect(0, 0, 480, 320);
}
function drawTvMenu(ctx) {
  // OVERLAY checked: no panel, just the text (drop-shadowed to stay readable)
  // over the picture, so you can see the changes behind it. Unchecked: the dark panel
  if (!tvSet.overlay) { ctx.fillStyle = "rgba(0,8,30,.82)"; ctx.fillRect(20, 12, 440, 296); }
  ctx.shadowColor = tvSet.overlay ? "rgba(0,0,0,.9)" : "transparent"; ctx.shadowBlur = 3; ctx.shadowOffsetX = ctx.shadowOffsetY = 1;
  ctx.strokeStyle = "#7dff9a"; ctx.lineWidth = 2; ctx.strokeRect(20, 12, 440, 296);
  ctx.fillStyle = "#7dff9a"; ctx.textBaseline = "middle"; ctx.textAlign = "center";
  ctx.font = "bold 22px 'Courier New', monospace"; ctx.fillText("SETTINGS", 240, 34);
  ctx.font = "bold 15px 'Courier New', monospace";
  TV_ROWS.forEach((r, i) => {
    const y = TVM.rowY + i * TVM.rowH, v = tvSet[r.k];
    if (tvHover === i) { ctx.fillStyle = "rgba(125,255,154,.18)"; ctx.fillRect(34, y - 10, 412, 21); }
    ctx.fillStyle = "#7dff9a"; ctx.textAlign = "left"; ctx.fillText(r.label, TVM.labelX, y + 1);
    ctx.strokeStyle = "#7dff9a"; ctx.lineWidth = 1.5;
    if (r.min == null) {
      ctx.strokeRect(TVM.chkX, y - 8, TVM.chkW, 16);
      if (v) ctx.fillRect(TVM.chkX + 4, y - 4, TVM.chkW - 8, 8);
    } else {
      ctx.strokeRect(TVM.barX, y - 7, TVM.barW, 14);
      ctx.fillRect(TVM.barX, y - 7, (v - r.min) / (r.max - r.min) * TVM.barW, 14);
      ctx.textAlign = "right"; ctx.fillText(String(v), 444, y + 1);
    }
  });
  ctx.textAlign = "center"; ctx.font = "bold 16px 'Courier New', monospace";
  for (const b of TVM.buttons) {
    if (tvHover === b.k) { ctx.fillStyle = "rgba(125,255,154,.25)"; ctx.fillRect(b.x, TVM.btnY, b.w, TVM.btnH); }
    ctx.strokeStyle = "#7dff9a"; ctx.lineWidth = 2; ctx.strokeRect(b.x, TVM.btnY, b.w, TVM.btnH);
    ctx.fillStyle = "#7dff9a"; ctx.fillText(b.label, b.x + b.w / 2, TVM.btnY + TVM.btnH / 2 + 1);
  }
  ctx.shadowColor = "transparent"; ctx.shadowBlur = ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
}
// what's under screen-canvas point (x, y): a row index, "reset"/"close", or null
function tvMenuHit(x, y) {
  for (const b of TVM.buttons) if (x >= b.x && x <= b.x + b.w && y >= TVM.btnY && y <= TVM.btnY + TVM.btnH) return b.k;
  const i = Math.round((y - TVM.rowY) / TVM.rowH);
  return i >= 0 && i < TV_ROWS.length && Math.abs(y - (TVM.rowY + i * TVM.rowH)) <= 11 && x >= 34 && x <= 446 ? i : null;
}
function tvMenuClick(x, y) {
  const h = tvMenuHit(x, y);
  if (h === "close") { tvMenu = false; return; }
  if (h === "reset") tvSet = { ...TV_DEFAULTS };
  else if (h != null) {
    const r = TV_ROWS[h];
    if (r.min == null) tvSet[r.k] = !tvSet[r.k];
    else if (x >= TVM.barX - 8) {            // clicked on (or just off) the bar: jump there, snapped to the step
      const t = Math.max(0, Math.min(1, (x - TVM.barX) / TVM.barW));
      tvSet[r.k] = Math.round((r.min + t * (r.max - r.min)) / r.step) * r.step;
    }
  }
  applyTv();
}
function tvMenuWheel(dir) {                  // wheel over a slider row nudges it one step
  const r = TV_ROWS[tvHover];
  if (!r || r.min == null) return false;
  tvSet[r.k] = Math.max(r.min, Math.min(r.max, tvSet[r.k] + dir * r.step)); applyTv(); return true;
}
function drawCaptions(ctx, text) {            // the current caption, low on the picture: white on a dark band, wrapped to fit
  if (!text) return;
  const W = 480, H = 320, lh = 19, lines = [];
  ctx.font = "bold 15px Arial, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const para of text.split("\n")) {
    let line = "";
    for (const w of para.split(" ")) { const next = line ? `${line} ${w}` : w; if (ctx.measureText(next).width > W - 40 && line) { lines.push(line); line = w; } else line = next; }
    if (line) lines.push(line);
  }
  lines.slice(-3).forEach((l, i, a) => {
    const y = H - 14 - (a.length - 1 - i) * lh, w = ctx.measureText(l).width + 12;
    ctx.fillStyle = "rgba(0,0,0,.72)"; ctx.fillRect((W - w) / 2, y - lh / 2, w, lh);
    ctx.fillStyle = "#fff"; ctx.fillText(l, W / 2, y + 1);
  });
}
const osdText = () => playing && tvSet.overlay && !tvMenu && (video.paused || performance.now() < osd.until) ? (video.paused && !media.on ? "PAUSE ❚❚" : osd.text) : "";
function drawOsd(ctx, t) {                     // VCR-style OSD, top left
  if (!t) return;
  ctx.font = "bold 20px 'Courier New', monospace"; ctx.textAlign = "left"; ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillText(t, 26, 22);
  ctx.fillStyle = "#e8ffe8"; ctx.fillText(t, 24, 20);
}
// The theater's screen is film, not a TV, and 480x320 stretched over 6.84 m showed its pixel grid. So while a tape's on, a plane
// just in front of it shows the video itself as a texture: full resolution, no scanlines, sent up only when there's a new frame
// (a big canvas sent up every frame cost more than everything else in the room). What's written on the picture goes on a
// layer of its own, redrawn only when it changes. The screen under it keeps the shared canvas, for the TV's menu
let filmPlane = null, filmText = null, filmKey = "";
const filmBackMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
const filmTextCtx = (() => { const c = document.createElement("canvas"); c.width = 960; c.height = 640; const g = c.getContext("2d", { willReadFrequently: true }); g.scale(2, 2); return g; })();
const filmPic = { value: new THREE.Vector4(1, 1, 1, 0) };   // the TV's picture settings: brightness, contrast, color, tint
function filmTick() {
  const on = !!filmPlane && !!playing && !tvMenu && video.videoWidth > 0;
  if (!filmPlane) return;
  filmPlane.visible = on;
  // the screen behind: plain black while the film's on it. Its own picture (the TV's canvas, scanlines and all) a hair behind the
  // film fought it for the glow pass's depth test and came through as moire that changed with every step
  if (on) theaterScreenMesh.material = filmBackMat; else if (playing) theaterScreenMesh.material = videoMat;   // (no tape: the main loop's)
  if (!on) { filmText.visible = false; return; }
  const { width: SW, height: SH } = theaterScreenMesh.geometry.parameters, a = video.videoWidth / video.videoHeight;
  filmPlane.scale.set(a > SW / SH ? SW : SH * a, a > SW / SH ? SW / a : SH, 1);
  filmPic.value.set(tvSet.brightness / 100, tvSet.contrast / 100, tvSet.bw || BW_SHOWS.has(playing.tape.id) ? 0 : tvSet.saturate / 100, tvSet.hue * Math.PI / 180);
  const t = osdText(), cap = Jelly.captionText(), key = `${t}|${cap}`;
  if (key !== filmKey) {
    filmKey = key; filmTextCtx.clearRect(0, 0, 480, 320); drawOsd(filmTextCtx, t); drawCaptions(filmTextCtx, cap);
    filmText.material.map.needsUpdate = true; filmText.visible = !!(t || cap);
  }
}
function updateVideoFrame() {
  const W = videoCanvas.width, H = videoCanvas.height;
  videoCtx.fillStyle = "#000"; videoCtx.fillRect(0, 0, W, H);
  if (playing && video.videoWidth) {
    const c = tapeFix(playing.tape).crop || { x: 0, y: 0, w: 1, h: 1 };
    const sx = c.x * video.videoWidth, sy = c.y * video.videoHeight;
    const sw = c.w * video.videoWidth, sh = c.h * video.videoHeight;
    const scale = Math.min(W / sw, H / sh);
    const dw = sw * scale, dh = sh * scale;
    videoCtx.filter = pictureFilter(playing.tape);
    videoCtx.drawImage(video, sx, sy, sw, sh, (W - dw) / 2, (H - dh) / 2, dw, dh);
    videoCtx.filter = "none";
  }
  drawOsd(videoCtx, osdText());
  if (playing) drawCaptions(videoCtx, Jelly.captionText());
  if (tvMenu) drawTvMenu(videoCtx);
  if (tvSet.scanlines) videoCtx.drawImage(scanFx, 0, 0, W, H);
  videoTex.needsUpdate = true;
  filmTick();
}

// ---------------- idle screensaver: bouncing "JellyBuster" logo ----------------
// one shared canvas feeds every idle screen (same sharing trick as videoMat
// for playing tapes) — one redraw + texture upload per frame, not one per screen
const dvdLogoTex = makeTexture((ctx, W, H) => {   // square brand mark used as the bouncing sprite
  const m = 22, r = 34, w = W - m * 2, h = H - m * 2;
  ctx.beginPath(); ctx.roundRect(m, m, w, h, r);
  ctx.fillStyle = "#00349c"; ctx.fill();
  ctx.lineWidth = 12; ctx.strokeStyle = "#ffd400"; ctx.stroke();
  ctx.fillStyle = "#ffd400"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `italic 900 ${Math.round(W * 0.155)}px Arial Black, Arial`;
  ctx.fillText("JELLY", W / 2, H * 0.4);
  ctx.fillText("BUSTER", W / 2, H * 0.62);
}, 512, 512);
const ssLogoBuf = document.createElement("canvas"); ssLogoBuf.width = ssLogoBuf.height = 128;
const ssLogoCtx = ssLogoBuf.getContext("2d");
const ssCanvas = document.createElement("canvas"); ssCanvas.width = 320; ssCanvas.height = 240;
const ssCtx = ssCanvas.getContext("2d");
const screensaverTex = new THREE.CanvasTexture(ssCanvas); screensaverTex.colorSpace = THREE.SRGBColorSpace;
const screensaverMat = new THREE.MeshBasicMaterial({ map: screensaverTex });
const DVD_TINTS = ["#ffd400", "#4dd0e1", "#ff6b6b", "#8affc1", "#c792ea", "#ffab40", "#ffffff"];
const dvd = { x: 40, y: 30, vx: 78, vy: 61, w: 100, h: 100, tint: 0 };
function updateScreensaver(dt) {
  const W = ssCanvas.width, H = ssCanvas.height;
  dvd.x += dvd.vx * dt; dvd.y += dvd.vy * dt;
  let bounced = false;
  if (dvd.x <= 0) { dvd.x = 0; dvd.vx = Math.abs(dvd.vx); bounced = true; }
  else if (dvd.x + dvd.w >= W) { dvd.x = W - dvd.w; dvd.vx = -Math.abs(dvd.vx); bounced = true; }
  if (dvd.y <= 0) { dvd.y = 0; dvd.vy = Math.abs(dvd.vy); bounced = true; }
  else if (dvd.y + dvd.h >= H) { dvd.y = H - dvd.h; dvd.vy = -Math.abs(dvd.vy); bounced = true; }
  if (bounced) dvd.tint = (dvd.tint + 1) % DVD_TINTS.length;   // recolors on each bounce, classic-screensaver style
  ssLogoCtx.clearRect(0, 0, 128, 128);
  ssLogoCtx.drawImage(dvdLogoTex.image, 0, 0, 128, 128);
  ssLogoCtx.globalCompositeOperation = "source-atop";          // tint only the logo's own pixels, not the black behind it
  ssLogoCtx.fillStyle = DVD_TINTS[dvd.tint] + "55";
  ssLogoCtx.fillRect(0, 0, 128, 128);
  ssLogoCtx.globalCompositeOperation = "source-over";
  ssCtx.fillStyle = "#000"; ssCtx.fillRect(0, 0, W, H);
  ssCtx.drawImage(ssLogoBuf, dvd.x, dvd.y, dvd.w, dvd.h);
  screensaverTex.needsUpdate = true;
}
let screenMesh, videoMat, videoTex, miniScreens;
let tvPowerLed, vcrDisplay;                  // the TV console's power LED + the VCR's VFD clock (built with the TV)
const crtGlows = [];                       // one real light per ceiling CRT cluster — bloom alone doesn't light the shelves under it
{
  // the preview living room: rug, coffee table, couch facing the TV
  const rugZ0 = TV.z - 6.2, rugZ1 = STORE.z - 0.1;   // runs up to the back wall and stops — the back-of-house hall is behind it
  // the Overlook Hotel carpet from The Shining — the SVG pattern behind
  // IceCreamDrip's render_motif_ref.py, drawn with real SVG semantics (that
  // script's PIL version draws strokes inward and tiles unclipped/overlapping,
  // which scrambles the motif): one 7 x 10 stroke-width tile of red hexes with
  // the group's black stroke, big black hex rings and descender bars, clipped
  // to the tile and repeated.
  const SW = 0.18;                                                              // world m per stroke width
  const overlookTex = makeTexture((ctx, W, H) => {
    const sw = W / 7, w = W, h = H;
    const ORANGE = "rgb(223,95,24)", RED = "rgb(152,31,36)", BLACK = "rgb(72,38,22)";   // "black" is the carpet's dark brown
    const g = ctx;
    const hexPts = (cx, cy, r) => [0, 60, 120, 180, 240, 300].map(deg => { const a = deg * Math.PI / 180; return [cx + r * Math.sin(a), cy + r * Math.cos(a)]; });
    const poly = pts => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); };
    const line = (x0, y0, x1, y1, width) => { g.lineWidth = width; g.lineCap = "butt"; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
    // SVG pattern semantics: one tile, clipped to its own box (the canvas edge
    // does that), strokes centred on the path, children painted in document order
    g.save(); g.translate(0, H); g.scale(1, -1);   // flipped so the motif's top points away from the couch, toward the TV
    g.fillStyle = ORANGE; g.fillRect(0, 0, w, h);
    g.strokeStyle = BLACK; g.lineJoin = "miter"; g.lineWidth = sw;
    for (const [cx, cy] of [[w / 2, h / 2], [0, h - sw], [w, h - sw], [0, -sw], [w, -sw]]) {
      poly(hexPts(cx, cy, sw * 2)); g.fillStyle = RED; g.fill(); g.lineWidth = sw; g.stroke();   // red hexes, inherited black stroke
    }
    for (const [cx, cy] of [[0, -sw], [w, -sw]]) { poly(hexPts(cx, cy, sw * 4)); g.lineWidth = sw; g.stroke(); }   // big rings
    line(w / 2, h - sw * 3, w / 2, h, sw * 1.1);                                                     // descenders
    line(0, h - sw * 7, 0, h - sw * 3, sw);
    line(w, h - sw * 7, w, h - sw * 3, sw);
    g.restore();
    const img = ctx.getImageData(0, 0, W, H), d = img.data;                                           // a little pile texture
    for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    ctx.putImageData(img, 0, 0);
  }, 7 * 96, 10 * 96);
  overlookTex.repeat.set(7 / (7 * SW), (rugZ1 - rugZ0) / (10 * SW));
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(7, rugZ1 - rugZ0), new THREE.MeshLambertMaterial({ map: overlookTex }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.01, (rugZ0 + rugZ1) / 2); scene.add(rug);
  // vintage coffee table, 0.78 m clear of the couch front (room — player is 0.64
  // wide — to reach the middle seat). Same 1.0 x 0.5 x 0.35 block as before, so
  // the tape case on top still lines up; the TV-facing side stays one solid
  // flat panel (TV_PROXIES casts the TV light's shadow from it).
  {
    const zc = TV.z - 1.8, W = 1.0, D = 0.5, H = 0.35;
    const dark = new THREE.MeshLambertMaterial({ color: 0x4a2a12 });
    const knobMat = new THREE.MeshPhongMaterial({ color: 0xb08432, specular: 0xffe2a0, shininess: 70 });
    const tg = new THREE.Group(); tg.position.set(0, 0, zc); scene.add(tg);
    const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); tg.add(o); return o; };
    add(new THREE.BoxGeometry(W, H - 0.035, 0.03), mat.wood, 0, (H - 0.035) / 2, D / 2 - 0.015);        // solid TV-side panel
    add(new THREE.BoxGeometry(W + 0.06, 0.035, D + 0.03), mat.wood, 0, H - 0.0175, -0.015);            // top: overhangs couch side + ends, flush at the TV
    add(new THREE.BoxGeometry(W + 0.03, 0.014, D + 0.015), dark, 0, H - 0.042, -0.0075);               // molded lip under it
    // couch-side skirt between the legs, scalloped along its bottom edge
    const aw = W - 0.1, ah = 0.09, sk = new THREE.Shape();
    sk.moveTo(-aw / 2, 0); sk.lineTo(aw / 2, 0); sk.lineTo(aw / 2, -ah * 0.7);
    const N = 7;
    for (let i = 0; i < N; i++) {                                       // shallow arches, deepest in the middle
      const x0 = aw / 2 - (i / N) * aw, x1 = aw / 2 - ((i + 1) / N) * aw;
      const dip = ah * (0.7 + 0.3 * (1 - Math.abs((i + 0.5) / N - 0.5) * 2));
      sk.quadraticCurveTo((x0 + x1) / 2, -dip - 0.02, x1, -ah * 0.7);
    }
    sk.lineTo(-aw / 2, 0);
    const skirt = new THREE.ExtrudeGeometry(sk, { depth: 0.02, bevelEnabled: false });
    add(skirt, dark, 0, H - 0.049, -D / 2 + 0.03);
    add(new THREE.BoxGeometry(0.36, 0.045, 0.012), mat.wood, 0, H - 0.075, -D / 2 + 0.028);              // drawer front
    add(new THREE.SphereGeometry(0.011, 10, 8), knobMat, 0, H - 0.075, -D / 2 + 0.018);                  // brass knob
    for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.02, 0.06, D - 0.09), dark, sx * (W / 2 - 0.025), H - 0.079, 0.0); // end skirts
    // turned legs at the two couch-side corners (the TV side rests on its panel)
    const legPts = [[0, 0], [0.028, 0], [0.032, 0.015], [0.024, 0.04], [0.017, 0.11], [0.021, 0.17],
                    [0.027, 0.185], [0.02, 0.2], [0.024, 0.22], [0.03, 0.235], [0.03, H - 0.049], [0, H - 0.049]]
      .map(([r, y]) => new THREE.Vector2(r, y));
    for (const sx of [-1, 1]) add(new THREE.LatheGeometry(legPts, 18), dark, sx * (W / 2 - 0.035), 0, -D / 2 + 0.04);
    add(new THREE.BoxGeometry(W - 0.07, 0.018, D - 0.07), mat.wood, 0, 0.075, 0.0);                     // lower shelf
    [[-0.28, 0, 0.1, 0x8c2a1e], [-0.27, 1, -0.05, 0x1f3f86], [0.25, 0, 0.25, 0xd8c9a0]].forEach(([x, k, r, c]) => {   // a few tapes left on the shelf
      const tb = add(new THREE.BoxGeometry(TAPE.d, TAPE.w, TAPE.h), new THREE.MeshLambertMaterial({ color: c }), x, 0.084 + TAPE.w / 2 + k * TAPE.w, 0.01);
      tb.rotation.y = r;
    });
    colliders.push({ x0: -W / 2 - 0.03, x1: W / 2 + 0.03, z0: zc - D / 2 - 0.03, z1: zc + D / 2, y1: H, shadow: false });   // TV_PROXIES shape its shadow instead
  }
  const couch = buildCouch();                                             // ornate orange sofa facing the TV (couch.js)
  const cs = 1.12;                                                        // model is built life-size; scaled up a touch (SEATS below match)
  couch.scale.setScalar(cs);
  couch.position.set(0, 0, TV.z - 3.89 - couch.userData.zRange[0] * cs); scene.add(couch);   // back edge stays at TV.z - 3.89
  const couchMeshes = couch.children.filter(c => c.isMesh);              // every mesh carries userData.sit
  { const [z0, z1] = couch.userData.zRange, w = couch.userData.footprint.w * cs;
    colliders.push({ x0: -w / 2, x1: w / 2, z0: couch.position.z + z0 * cs, z1: couch.position.z + z1 * cs, y1: 0.905 * cs, vaultOnly: true, shadow: false }); }   // (over it, not onto it: this box's top is the crest of its back, and there's no standing on that)
  const ps = textPlane("PREVIEW STATION", 1.2 * cs, 0.25 * cs);          // on the back of the couch
  const sg = couch.userData.sign;
  ps.position.set(0, sg.y * cs, couch.position.z + sg.z * cs); ps.rotation.set(sg.tilt, Math.PI, 0);
  ps.material = new THREE.MeshLambertMaterial({ map: ps.material.map }); // lit by the room, no unlit glow in the dark
  scene.add(ps);
  // classic 90s floor-standing rear-projection TV: glossy black console,
  // bullnosed top, stepped charcoal frame round the (recessed) screen, fabric
  // speaker columns either side, a full-width bottom grille with the model
  // plate, a chrome brand badge up top, a control strip with a power LED, the
  // sloped projector housing out the back — and a VCR with a blinking 12:00.
  // Built round the screen (1.8 x 1.2, centred y 0.95, front at TV.z - 0.558),
  // which the TV light / picture menu / shadow bake all key off.
  {
    const g = new THREE.Group(); g.position.set(TV.x, 0, TV.z); scene.add(g);  // local -z = front (toward the couch)
    const gloss = new THREE.MeshPhongMaterial({ color: 0x141518, specular: 0x3a3a3a, shininess: 45 });
    const satin = new THREE.MeshPhongMaterial({ color: 0x0d0e10, specular: 0x222222, shininess: 20 });
    const frameM = new THREE.MeshPhongMaterial({ color: 0x2a2d33, specular: 0x555555, shininess: 60 });
    const silver = new THREE.MeshPhongMaterial({ color: 0xa9aeb5, specular: 0xffffff, shininess: 90 });
    const add = (geo, m, x, y, z, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
    const bx = (w, h, d, m, x, y, z, parent) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z, parent);
    const W = 2.3, ZF = -0.545, TOPY = 1.78;                                  // cabinet width, front face, top
    const grilleTex = (w, h, reps) => {                                         // black speaker cloth: a fine weave
      const t = makeTexture((ctx, cw, ch) => {
        ctx.fillStyle = "#1c1e22"; ctx.fillRect(0, 0, cw, ch);
        ctx.fillStyle = "#2c2f34"; for (let x = 0; x < cw; x += 4) ctx.fillRect(x, 0, 1, ch);
        ctx.fillStyle = "#0a0b0c"; for (let y = 0; y < ch; y += 4) ctx.fillRect(0, y, cw, 1);
      }, 128, 128);
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w * reps, h * reps); return t;
    };
    const grille = (w, h, x, y) => add(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: grilleTex(w, h, 8) }), x, y, ZF - 0.003).rotation.y = Math.PI;
    // body: plinth, lower band, the screen section, the bullnosed top
    bx(W - 0.08, 0.06, 0.56, satin, 0, 0.03, -0.24);                                        // recessed plinth
    bx(W, 0.3, 0.6, gloss, 0, 0.21, ZF + 0.3);                                               // lower band (0.06-0.36)
    bx(W, 1.2, 0.6, gloss, 0, 0.96, ZF + 0.3);                                               // screen section (0.36-1.56)
    bx(W, 0.12, 0.6, gloss, 0, 1.62, ZF + 0.3);                                              // top band (1.56-1.68)
    bx(W, 0.1, 0.55, gloss, 0, TOPY - 0.05, ZF + 0.325);                                     // behind the bullnose
    const nose = add(new THREE.CylinderGeometry(0.05, 0.05, W, 20), gloss, 0, TOPY - 0.05, ZF + 0.05); nose.rotation.z = Math.PI / 2;
    // sloped rear housing: the projector + mirror box, tall at the cabinet, raking down to the back
    const prof = new THREE.Shape([[0.055, 0.06], [0.055, TOPY - 0.02], [0.3, 1.52], [0.6, 0.95], [0.6, 0.06]].map(([z, y]) => new THREE.Vector2(z, y)));
    const rear = new THREE.ExtrudeGeometry(prof, { depth: 2.0, bevelEnabled: false }); rear.rotateY(-Math.PI / 2); rear.translate(1.0, 0, 0);
    add(rear, satin, 0, 0, 0);
    // stepped frame round the screen, with a silver pinline at its inner edge
    const SY = 0.95, SW = 1.8, SH = 1.2, FW = 0.05;
    for (const [w, h, x, y] of [[SW + 2 * FW, FW, 0, SY + SH / 2 + FW / 2], [SW + 2 * FW, FW, 0, SY - SH / 2 - FW / 2], [FW, SH, SW / 2 + FW / 2, SY], [FW, SH, -SW / 2 - FW / 2, SY]]) {
      bx(w, h, 0.05, frameM, x, y, ZF - 0.02);
      bx(w + (w > h ? 0.04 : 0.02), h + (h > w ? 0.04 : 0.02), 0.02, gloss, x, y, ZF - 0.005);   // the step out to the cabinet face
    }
    for (const [w, h, x, y] of [[SW, 0.006, 0, SY + SH / 2 + 0.003], [SW, 0.006, 0, SY - SH / 2 - 0.003], [0.006, SH, SW / 2 + 0.003, SY], [0.006, SH, -SW / 2 - 0.003, SY]])
      bx(w, h, 0.006, silver, x, y, ZF - 0.047);
    // speaker columns either side of the screen, and the full-width grille below
    for (const s of [-1, 1]) grille(0.14, 1.12, s * (W / 2 - 0.09), SY);
    grille(1.72, 0.2, -0.13, 0.2);
    const plate = textPlane("PROJECTION 60", 0.34, 0.05, "#1a1c20", "#b8bdc4", "Arial", 64);
    plate.material = new THREE.MeshLambertMaterial({ map: plate.material.map });
    plate.position.set(-0.13, 0.2, ZF - 0.006); plate.rotation.y = Math.PI; g.add(plate);
    // brand badge on the top band
    const badge = textPlane("VIDEOTRONIC", 0.4, 0.05, "#d8dce2", "#141518", "Arial Black", 72);
    badge.material = new THREE.MeshPhongMaterial({ map: badge.material.map, specular: 0x888888, shininess: 70 });
    badge.position.set(0, 1.655, ZF - 0.004); badge.rotation.y = Math.PI; g.add(badge);
    // control strip, lower right: a row of little buttons and the power LED
    bx(0.3, 0.07, 0.012, satin, 0.93, 0.2, ZF - 0.006);
    for (let i = 0; i < 4; i++) bx(0.03, 0.018, 0.012, frameM, 0.84 + i * 0.045, 0.2, ZF - 0.014);
    tvPowerLed = glow(add(new THREE.SphereGeometry(0.008, 10, 8), new THREE.MeshBasicMaterial({ color: 0x551008 }), 1.05, 0.2, ZF - 0.012));
    // feet
    for (const x of [-1, 1]) for (const z of [-0.45, 0.45]) add(new THREE.CylinderGeometry(0.03, 0.035, 0.02, 12), satin, x * (W / 2 - 0.12), 0.01, z + 0.05);
    colliders.push({ x0: TV.x - W / 2, x1: TV.x + W / 2, z0: TV.z + ZF, z1: TV.z + 0.6, y1: TOPY });   // starts behind the screen: the TV light's shadow bake treats colliders as blockers

    // the VCR on top: black, a VHS door, buttons, and a green VFD clock
    const vcr = new THREE.Group(); vcr.position.set(0.55, TOPY, -0.2); g.add(vcr);
    bx(0.43, 0.09, 0.3, gloss, 0, 0.045, 0, vcr);
    bx(0.43, 0.012, 0.3, frameM, 0, 0.006, 0, vcr);                                         // silver-grey base trim
    bx(0.2, 0.035, 0.006, satin, -0.07, 0.05, -0.152, vcr);                                  // tape door
    const vhs = textPlane("VHS", 0.04, 0.014, "#c9cdd2", "#0d0e10", "Arial Black", 60);
    vhs.material = new THREE.MeshLambertMaterial({ map: vhs.material.map }); vhs.position.set(-0.07, 0.023, -0.156); vhs.rotation.y = Math.PI; vcr.add(vhs);
    for (let i = 0; i < 5; i++) bx(0.016, 0.008, 0.006, frameM, 0.07 + i * 0.022, 0.028, -0.152, vcr);
    const vfd = document.createElement("canvas"); vfd.width = 128; vfd.height = 40;
    vcrDisplay = { ctx: vfd.getContext("2d"), tex: new THREE.CanvasTexture(vfd), shown: "" };
    vcrDisplay.tex.colorSpace = THREE.SRGBColorSpace;
    glow(add(new THREE.PlaneGeometry(0.1, 0.03), new THREE.MeshBasicMaterial({ map: vcrDisplay.tex }), 0.12, 0.06, -0.1535, vcr)).rotation.y = Math.PI;
  }
  screenMesh = new THREE.Mesh(screenGeo, screensaverMat);
  screenMesh.position.set(0, 0.95, TV.z - 0.558);
  screenMesh.rotation.y = Math.PI;                 // faces the couch
  scene.add(glow(screenMesh));
  aimables.push(screenMesh, ...couchMeshes);
  const poolTex = makeTexture((ctx, W, H) => {   // soft warm pool on the floor under each lamp — edge fades gradually, no hard ring
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2);
    g.addColorStop(0, "rgba(255,176,102,.22)"); g.addColorStop(0.35, "rgba(255,176,102,.12)");   // -25% from the original .3/.16
    g.addColorStop(0.7, "rgba(255,176,102,.04)"); g.addColorStop(1, "rgba(255,176,102,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }, 256, 256);
  // floor lamps at either end of the couch, just clear of its arms, level with its middle
  const lampZ = couch.position.z + (couch.userData.zRange[0] + couch.userData.zRange[1]) / 2 * cs;
  const lampX = couch.userData.footprint.w * cs / 2 + 0.35;
  // vintage brass floor lamp to go with the parlor sofa: stepped weighted
  // base, turned stem with collars, harp + finial, bell-shaped fabric shade
  // with trim, a bulb you can see glowing inside, and a pull chain
  const brass = new THREE.MeshPhongMaterial({ color: 0xb08432, specular: 0xffe2a0, shininess: 70 });
  const bronze = new THREE.MeshPhongMaterial({ color: 0x3a2a18, specular: 0x7a6040, shininess: 40 });
  const trimMat = new THREE.MeshLambertMaterial({ color: 0x7a1f1a });                 // oxblood fabric trim
  const lathe = (pts, m, seg = 28) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), m);
  const SHADE_Y0 = 1.3, SHADE_H = 0.34;
  function makeLamp(lx) {
    const g = new THREE.Group(); g.position.set(lx, 0, lampZ);
    const parts = [
      lathe([[0, 0], [0.19, 0], [0.19, 0.018], [0.165, 0.03], [0.15, 0.055], [0.05, 0.075], [0, 0.08]], bronze),        // weighted base
      lathe([[0.045, 0.07], [0.05, 0.09], [0.03, 0.1]], brass),                                                          // base collar
      lathe([[0.018, 0.1], [0.016, 0.62], [0.034, 0.64], [0.034, 0.67], [0.016, 0.69],                                 // stem, knop midway
             [0.014, 1.18], [0.028, 1.2], [0.028, 1.23], [0.012, 1.25], [0.012, 1.3]], brass, 16),
      lathe([[0.02, 1.3], [0.026, 1.31], [0.026, 1.39], [0.02, 1.4]], brass, 16),                                       // bulb socket
    ];
    // harp: a brass wire loop from the socket up over the bulb to the finial
    const harp = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.0045, 6, 24, Math.PI), brass);
    harp.position.y = 1.53; harp.scale.y = 1.6; parts.push(harp);
    for (const hx of [-0.075, 0.075]) {                                                   // harp legs down to the socket saddle
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.14, 6), brass); leg.position.set(hx, 1.46, 0); parts.push(leg);
    }
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.008, 0.012), brass); saddle.position.y = 1.39; parts.push(saddle);
    parts.push(lathe([[0, 1.645], [0.012, 1.655], [0.02, 1.672], [0.012, 1.69], [0.004, 1.71], [0, 1.715]], brass, 12)); // finial
    // bell shade: flared skirt, soft shoulder, narrow top; double-sided so the lit inside shows
    const shadeMat = glowDraw(new THREE.MeshLambertMaterial({ color: 0xf2dcae, emissive: 0xe8a458, emissiveIntensity: SHADE_GLOW, side: THREE.DoubleSide }), { emitOnly: true, gain: 2 });
    const shadePts = [[0.25, 0], [0.235, 0.03], [0.205, 0.12], [0.18, 0.22], [0.155, 0.3], [0.13, SHADE_H]]
      .map(([r, y]) => [r, SHADE_Y0 + y]);
    const shade = lathe(shadePts, shadeMat, 36); glow(shade);
    const rimTop = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.008, 6, 36), trimMat);
    rimTop.rotation.x = Math.PI / 2; rimTop.position.y = SHADE_Y0 + SHADE_H;
    const rimBot = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.012, 6, 40), trimMat);
    rimBot.rotation.x = Math.PI / 2; rimBot.position.y = SHADE_Y0;
    const bulbMat = glowDraw(new THREE.MeshBasicMaterial({ color: 0xfff3d6 }));
    bulbMat.userData.onColor = new THREE.Color(0xfff3d6); bulbMat.userData.offColor = new THREE.Color(0x5a554a);
    const bulb = glow(new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), bulbMat)); bulb.position.y = 1.45; bulb.scale.y = 1.25;
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.16, 4), brass); chain.position.set(0.03, 1.3, 0);
    const pull = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), brass); pull.position.set(0.03, 1.22, 0);
    parts.push(shade, rimTop, rimBot, bulb, chain, pull);
    g.add(...parts); scene.add(g);
    return { parts, shadeMat, bulbMat };
  }
  for (const lx of [-lampX, lampX]) {
    const { parts, shadeMat, bulbMat } = makeLamp(lx);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4),
      new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false }));
    lampPools.push(pool);   // dimmed further to nothing once the overhead fluorescents are on — see the main update loop
    pool.rotation.x = -Math.PI / 2; pool.position.set(lx, 0.03, lampZ); scene.add(pool);
    const lampL = new THREE.PointLight(0xffb066, LAMP_ON, 4, 2); lampL.position.set(lx, 1.45, lampZ);   // at the bulb
    lampL.userData.on = LAMP_ON; lampL.userData.shadeMat = shadeMat; lampL.userData.bulbMat = bulbMat; lampL.userData.pool = pool;
    scene.add(lampL);   // not in allLights — survives lights-out
    lamps.push(lampL);
    for (const m of parts) { m.userData.lamp = lampL; aimables.push(m); }
  }

  // every screen shares ONE decode: the single <video> is drawn, letterboxed
  // to its own native aspect, into one shared canvas that any number of
  // meshes can sample for free — a raw VideoTexture would just stretch to
  // fill the (fixed-aspect) screen plane, distorting anything that isn't
  // exactly that aspect
  videoTex = new THREE.CanvasTexture(videoCanvas);
  videoTex.colorSpace = THREE.SRGBColorSpace;
  videoMat = new THREE.MeshBasicMaterial({ map: videoTex, color: 0xd9d9d9 }); // -15%, blown-out whites were blinding
  if (theaterScreenMesh) {
    const tex = new THREE.VideoTexture(document.getElementById("vid"));
    tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;   // (mipmaps: no shimmer from the back rows)
    const m = new THREE.MeshBasicMaterial({ map: tex, color: 0xd9d9d9 });   // (-15%, as the TV's: blown-out whites were blinding)
    m.onBeforeCompile = sh => {
      sh.uniforms.uPic = filmPic;
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec4 uPic;").replace("#include <map_fragment>", `#include <map_fragment>
        { vec3 c = (diffuseColor.rgb * uPic.x - 0.5) * uPic.y + 0.5;
          c = mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, uPic.z);
          const vec3 k = vec3(0.57735); float cs = cos(uPic.w), sn = sin(uPic.w);
          diffuseColor.rgb = clamp(c * cs + cross(k, c) * sn + k * dot(k, c) * (1.0 - cs), 0.0, 1.0); }`);
    };
    glowDraw(m);                                   // (the glow pass redraws it against the main pass's depth: pulled forward so it all passes, not in a shifting pattern)
    filmPlane = glow(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m)); filmPlane.position.z = 0.01; filmPlane.visible = false; theaterScreenMesh.add(filmPlane);
    const { width: SW, height: SH } = theaterScreenMesh.geometry.parameters, words = new THREE.CanvasTexture(filmTextCtx.canvas); words.colorSpace = THREE.SRGBColorSpace;
    filmText = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ map: words, transparent: true, depthWrite: false })); filmText.position.z = 0.02; filmText.visible = false; theaterScreenMesh.add(filmText);
  }
  miniScreens = [screenMesh];
  if (theaterScreenMesh) {
    theaterScreenMesh.material = screensaverMat;
    miniScreens.push(theaterScreenMesh);
  }
  // ceiling CRT clusters at the outer ends of the center aisles, pairs side by side
  // (along z), fanned ~45° apart, screens facing the center of the store
  const crtBody = new THREE.MeshLambertMaterial({ color: 0x2a2d33 });
  const crtMountMat = new THREE.MeshPhongMaterial({ color: 0x4a4e54, specular: 0x777777, shininess: 40 });
  const crt = base => {                    // front box + tube bulge + screen
    const g = new THREE.Group();
    g.rotation.order = "YXZ"; g.rotation.y = base; g.rotation.x = 0.32;   // aimed down — they hang high
    g.scale.setScalar(1.15);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.5, 0.3), crtBody));
    const bulge = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.38, 0.22), crtBody);
    bulge.position.z = -0.24; g.add(bulge);
    const m = glow(new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.38), screensaverMat));
    m.position.z = 0.154; g.add(m); miniScreens.push(m);
    // its cradle, tilting with it: a tray under the set, a plate up each side to the pivot
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.014, 0.34), crtMountMat); tray.position.y = -0.257; g.add(tray);
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.27, 0.16), crtMountMat); p.position.set(sx * 0.316, -0.125, 0); g.add(p); }
    return g;
  };
  // What holds them up, in steel, merged into one mesh a cluster: a plate bolted to the ceiling, a column down from it; for a pair a
  // braced crossbar; to each set a swivel stem into a U-shaped yoke, a tilt knob either side where it meets the set's cradle
  const crtMount = (g, sets) => {                // sets: [{ z, yaw }], in g's frame (y 0: the sets' pivot height)
    const H = STORE.h - g.position.y, geos = [], o = new THREE.Object3D();
    const part = (geo, x, y, z, ry = 0, parent = null) => {
      o.position.set(x, y, z); o.rotation.set(0, 0, 0); o.updateMatrix();
      if (parent) o.matrix.premultiply(parent);
      geo.applyMatrix4(o.matrix); geos.push(geo.index ? geo : geo); return geo;
    };
    const cyl = (r, h) => new THREE.CylinderGeometry(r, r, h, 12);
    const rod = (a, b, r) => {                   // from one point to another
      const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), geo = cyl(r, d.length());
      o.position.copy(A).addScaledVector(d, 0.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); o.scale.setScalar(1); o.updateMatrix();
      geo.applyMatrix4(o.matrix); geos.push(geo); o.quaternion.identity();
    };
    const TOP = 0.46, ARM_X = 0.375, BAR_Y = sets.length > 1 ? 0.6 : TOP;   // the yoke's top; its arms, out past the cradle; where the column ends
    part(cyl(0.12, 0.014), 0, H - 0.007, 0);     // the ceiling plate, its bolts
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; part(cyl(0.012, 0.01), Math.cos(a) * 0.09, H - 0.019, Math.sin(a) * 0.09); }
    part(cyl(0.034, 0.06), 0, H - 0.044, 0);     // the collar under it
    part(cyl(0.024, H - BAR_Y), 0, (H + BAR_Y) / 2, 0);   // the column
    if (sets.length > 1) {
      const zs = sets.map(q => q.z), L = Math.max(...zs) - Math.min(...zs) + 0.1;
      part(new THREE.BoxGeometry(0.05, 0.04, L), 0, BAR_Y, 0);   // the crossbar
      for (const q of sets) rod([0, BAR_Y + 0.19, 0], [0, BAR_Y + 0.015, q.z * 0.72], 0.009);   // its braces, back up to the column
      part(cyl(0.032, 0.05), 0, BAR_Y + 0.03, 0);   // where the column meets it
    }
    for (const { z, yaw } of sets) {
      const m = new THREE.Matrix4().makeRotationY(yaw).setPosition(0, 0, z), Y = (geo, x, y, zz) => part(geo, x, y, zz, 0, m);
      if (sets.length > 1) { Y(cyl(0.018, BAR_Y - TOP), 0, (BAR_Y + TOP) / 2, 0); Y(cyl(0.03, 0.03), 0, BAR_Y - 0.03, 0); }   // the stem, its swivel under the crossbar
      Y(new THREE.BoxGeometry(ARM_X * 2 + 0.014, 0.022, 0.05), 0, TOP, 0);   // the yoke: its top...
      for (const sx of [-1, 1]) {
        Y(new THREE.BoxGeometry(0.012, TOP + 0.04, 0.05), sx * ARM_X, (TOP - 0.04) / 2, 0);   // ...an arm down each side...
        const knob = cyl(0.028, 0.026); knob.rotateZ(Math.PI / 2); Y(knob, sx * (ARM_X + 0.018), 0, 0);   // ...the tilt knob at its foot
      }
    }
    g.add(new THREE.Mesh(mergeGeometries(geos), crtMountMat));
  };
  for (const [x, z] of crtSpots) {          // one cluster over each outer end of the center aisles (see the store layout)
    {
      const g = new THREE.Group(); g.position.set(x, 2.75, z);
      const base = x < 0 ? Math.PI / 2 : -Math.PI / 2;   // face the store center
      const sets = [];
      for (const o of [-0.45, 0.45]) {      // side by side along the aisle, fanned to its ends
        const fan = (x < 0 ? 1 : -1) * (o < 0 ? 1 : -1) * Math.PI / 8;
        const c = crt(base + fan); c.position.z = o; g.add(c); sets.push({ z: o, yaw: base + fan });
      }
      crtMount(g, sets);
      const cg = new THREE.PointLight(0x8899bb, 0, 6, 1.5); g.add(cg); crtGlows.push(cg);
      scene.add(g);
    }
  }
  // one more for the staff: up in the corner where the west wall meets the
  // front glass, aimed back at the register bullpen
  {
    const x = WALL_L + 0.55, z = 0.55, g = new THREE.Group(); g.position.set(x, 2.75, z);
    const yaw = Math.atan2(-4.5 - x, 2.4 - z);             // toward the middle of the space behind the counter
    g.add(crt(yaw)); crtMount(g, [{ z: 0, yaw }]);
    const cg = new THREE.PointLight(0x8899bb, 0, 4, 1.5); g.add(cg); crtGlows.push(cg);
    scene.add(g);
  }
}
// one seat per couch cushion (cushion centers ±0.6 m in couch.js, × the 1.12 couch scale)
const SEATS = [-0.672, 0, 0.672].map(x => ({ x, z: TV.z - 3.3 }));   // the three cushions (your body sits there; the camera rides its head)
let seatAt = SEATS[1], aimSeatX = 0;         // seat in use / world x where the couch was aimed at
let seated = false, stoodAt = null;

// Fluorescents restriking: most panels come on after a short random stagger;
// a minority flicker a few times first before settling steady. Returns a list
// of [onAt, offAt] windows (in seconds since warm-up started) — the panel
// reads "lit" whenever t falls in one of them, and the final window always
// runs through to `duration` so every panel is steady by the time it ends.
function buildFlickerSchedule(duration) {
  if (Math.random() > 0.4) return [[Math.random() * 0.5, duration]];    // comes on cleanly, just staggered
  const pulses = []; let t = Math.random() * 0.15;
  const n = 2 + Math.floor(Math.random() * 3);                          // 2-4 stutters before it strikes
  for (let i = 0; i < n; i++) {
    const on = t + 0.03 + Math.random() * 0.12;
    pulses.push([t, on]);
    t = on + 0.05 + Math.random() * 0.22;
    if (t > duration * 0.75) break;
  }
  pulses.push([t, duration]);
  return pulses;
}
function flickerLit(schedule, t) { return schedule.some(([on, off]) => t >= on && t < off); }

// ---- the fig in the corner beside the TV (from VaultBusterGodot: store/plants.js) ----
buildFig(-2.8, 27.4);

// ---- lights: six switch zones (see LIGHT_ZONES), each with its own flicker warm-up ----
// lightsOut = "the store's dark": every sales-floor zone off and no daylight
// to speak of — the TV glow, marquee posters, bloom and lamp pools key off it
let lightsOut = false;
const zoneOn = Object.fromEntries(LIGHT_ZONES.map(z => [z, z !== "closet"]));   // (the closet bulb starts off)
const zoneLvl = Object.fromEntries(LIGHT_ZONES.map(z => [z, +zoneOn[z]]));   // what the shader gets: 0..1, flickering while warming up
const zoneWarm = {};                              // zone -> { t, duration, mats, schedules } while its panels restrike
function setZone(zone, on) {
  zoneOn[zone] = on;
  const mats = panelMats.filter(m => m.userData.zone === zone);
  if (on) {
    const duration = 1.1 + Math.random() * 0.6;
    zoneWarm[zone] = { t: 0, duration, mats, schedules: mats.map(() => buildFlickerSchedule(duration)) };
  } else {
    delete zoneWarm[zone]; zoneLvl[zone] = 0;
    mats.forEach(m => m.color.set(0x0d1016));
  }
  applyLighting();
}
function lightingTick(dt) {                       // fluorescents restriking, zone by zone
  for (const [zone, w] of Object.entries(zoneWarm)) {
    w.t += dt;
    const done = w.t >= w.duration;
    let lit = 0;
    w.mats.forEach((m, i) => { const on = done || flickerLit(w.schedules[i], w.t); if (on) lit++; m.color.set(on ? 0xf8fbff : 0x30343d); });
    zoneLvl[zone] = w.mats.length ? lit / w.mats.length : 1;
    if (done) delete zoneWarm[zone];
  }
  todTick();
  applyLighting();
  for (let k = 0; k < 3; k++) {                    // the burnt-out troffers, dark in the shader's light too (flickering: half)
    const d = typeof deadLights !== "undefined" && deadLights[k], t = d && TROFFERS[d.i];
    TVU.uDeadL.value[k].set(t ? t.x : 0, t ? t.z : 0, t ? (d.t > 0 ? 0.5 : 1) : 0, 0);
  }
}
function applyLighting() {
  const Z = TVU.uZone.value, B = TVU.uBoh.value;
  Z.set(zoneLvl.front, zoneLvl.aisles, zoneLvl.lounge, tod.level);
  B.set(zoneLvl.hall, zoneLvl.breakroom, zoneLvl.restroom, zoneLvl.closet); TVU.uOffice.value = zoneLvl.office;
  closetBulb.mat?.color.set(zoneOn.closet ? 0xfff2c4 : 0x3a3833);
  boothGlow.lamps?.color.set(zoneOn.booth ? 0xffd890 : 0x3a3833); boothGlow.stairs?.color.set(zoneOn.stairwell ? 0xffd890 : 0x3a3833); boothGlow.red?.color.set(zoneOn.booth ? 0x2a0806 : 0xff2a1a);
  TVU.uThLight.value.set(zoneLvl.lobby, zoneLvl.theater, zoneLvl.booth, zoneLvl.stairwell);
  for (const l of allLights) l.intensity = l.userData.on * (zoneLvl[l.userData.zone] ?? 1);
  for (const m of posterMats) m.emissiveIntensity = 0.12 + 0.55 * (1 - (zoneLvl[m.userData.zone] ?? 1));   // (the marquee bulbs themselves are untouched)
  const dark = !zoneOn.front && !zoneOn.aisles && !zoneOn.lounge && tod.level < 0.35;
  if (dark === lightsOut && applyLighting.done) return;
  applyLighting.done = true; lightsOut = dark;
  haloMat.opacity = dark ? 0.4 : 0.22;        // the marquee spill shows more with the lights down
  bloomPass.strength = dark ? 0.55 : 0.28;    // barely-there with the lights on; a bit more presence in the dark
  // threshold raised from .2/.4 — screen whites (menus, bright scenes) were blooming
  // too readily; this only raises the bar for what counts as "glowing"
  bloomPass.threshold = dark ? 0.34 : 0.52;
}

