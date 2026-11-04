// ---------------- a tape held up: the box itself, in your hands ----------------
// The real shape of the thing (TAPE: a clamshell, spine on either side), near the camera and big, unlit so a dark room
// doesn't hide it. The mouse tilts it; the wheel zooms, and zoomed in the mouse moves it around to read; R turns it over.
// The back's drawn once per tape from what Jellyfin knows (Jelly.details), laid out like a rental's: the backdrop darkened
// behind it all, the logo (else the title), the tagline, the top-billed faces, the blurb, a season's episodes, the rating and
// run time, the billing block, a barcode. Kept for the last few tapes looked at.
const BOX_FILL = 0.74;                           // how much of the screen's height it takes, at no zoom
const FACE_W = 640, FACE_H = 1170, FACE_S = LOWMEM ? 1 : 1.5;   // the back's laid out at this size, and drawn at this many times it
const BOX_KEEP = 8, BOX_REST = -0.18, BOX_ZOOM_MAX = 4, BOX_DIST = 0.9;   // (far off and scaled up: so close, the near edge loomed off the screen)
// drawn last and over everything, so it can't go into a shelf: a box's outward faces never overlap, so it needs no depth test.
// It still writes depth, or the glow pass draws what's behind it through it
const tapeFaceMat = color => new THREE.MeshBasicMaterial({ color, fog: false, transparent: true, depthFunc: THREE.AlwaysDepth });
const boxFront = tapeFaceMat(0xf2f2f2), boxBack = tapeFaceMat(0xf2f2f2), boxSide = tapeFaceMat(0xcccccc), boxEnd = tapeFaceMat(0x1b1e24);
const tapeBox = new THREE.Mesh(new THREE.BoxGeometry(TAPE.d, TAPE.h, TAPE.w), [boxSide, boxSide, boxEnd, boxEnd, boxFront, boxBack]);   // right, left, top, bottom, front, back
tapeBox.visible = false; tapeBox.renderOrder = 10; camera.add(tapeBox);
// the room behind it, dimmed: a dark sheet just behind the box (the page can't dim what's under the box and not the box)
const tapeBoxDim = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.72, fog: false, depthWrite: false, depthTest: false }));   // (0.72: the picture's still linear here, so this reads as about a half)
tapeBoxDim.position.z = -0.4; tapeBoxDim.renderOrder = 9; tapeBoxDim.visible = false; camera.add(tapeBoxDim);
const boxState = { key: null, tape: null, flipped: false, a: 0, yaw: 0, pitch: 0, panX: 0, panY: 0, rec: null };
const boxCache = new Map();                      // tapeKey -> { front, frontHi, back, side }
const boxLoader = new THREE.TextureLoader();

function boxFit(tex) {                           // a poster's cropped to the box's narrower face, not squeezed
  const img = tex.image, a = img.width / img.height, face = TAPE.d / TAPE.h;
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  if (a > face) { tex.repeat.set(face / a, 1); tex.offset.set((1 - face / a) / 2, 0); }
  else { tex.repeat.set(1, a / face); tex.offset.set(0, (1 - a / face) / 2); }
  tex.needsUpdate = true;
  return tex;
}
function boxShelfCover(t) {                       // what it looks like on the shelf, at once: its cell of the cover atlas, copied out (the sharp one's still on its way)
  if (t.cell == null) return null;
  const a = atlases[Math.floor(t.cell / CELLS)]; if (!a) return null;
  const k = a.canvas.width / 2048, x = ((t.cell % CELLS) % COLS) * CW * k, y = Math.floor((t.cell % CELLS) / COLS) * CH * k, m = 2 * k;   // (m: inside the cell's border)
  const c = document.createElement("canvas"); c.width = Math.round((CW - 4) * k); c.height = Math.round((CH - 4) * k);
  c.getContext("2d").drawImage(a.canvas, x + m, y + m, c.width, c.height, 0, 0, c.width, c.height);
  return boxFit(new THREE.CanvasTexture(c));
}
function boxSpine(t) {                           // the title up the spine, on the case's color (the cover's)
  const c = document.createElement("canvas"); c.width = 96; c.height = 560; const g = c.getContext("2d");
  const col = t.sideMat ? `#${t.sideMat.color.getHexString()}` : "#14171d";
  g.fillStyle = col; g.fillRect(0, 0, 96, 560);
  g.fillStyle = "#0006"; g.fillRect(0, 0, 96, 6); g.fillRect(0, 554, 96, 6);
  const lum = t.sideMat ? t.sideMat.color.r * 0.3 + t.sideMat.color.g * 0.6 + t.sideMat.color.b * 0.1 : 0;
  g.translate(48, 280); g.rotate(Math.PI / 2); g.fillStyle = lum > 0.5 ? "#101010" : "#f4f4f4"; g.textAlign = "center"; g.textBaseline = "middle";
  let px = 40; const name = tapeName(t).toUpperCase(); g.font = `900 ${px}px "Arial Black", Arial, sans-serif`;
  while (g.measureText(name).width > 500 && px > 16) { px -= 2; g.font = `900 ${px}px "Arial Black", Arial, sans-serif`; }
  g.fillText(name, 0, 2);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

// ---- the back ----
const boxImage = url => !url ? Promise.resolve(null) : new Promise(res => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = () => res(null); i.src = url; });
function boxWrap(g, text, w) {
  const out = []; for (const para of String(text).split("\n")) {
    let line = ""; for (const word of para.split(/\s+/)) { const n = line ? `${line} ${word}` : word; if (g.measureText(n).width > w && line) { out.push(line); line = word; } else line = n; }
    if (line) out.push(line);
  } return out;
}
function boxFitChars(text, n) {                  // no more than n characters, ending on a sentence if one ends late enough
  text = text.trim(); if (text.length <= n) return text;
  const cut = text.slice(0, n), end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return end > n / 2 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}
function boxCover(g, img, x, y, w, h) {          // an image filling a rectangle, cropped
  const s = Math.max(w / img.width, h / img.height), sw = w / s, sh = h / s;
  g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}
const BOX_RATINGS = { "G": "GENERAL AUDIENCES", "PG": "PARENTAL GUIDANCE SUGGESTED", "PG-13": "PARENTS STRONGLY CAUTIONED", "R": "RESTRICTED", "NC-17": "NO ONE 17 AND UNDER ADMITTED", "NR": "NOT RATED" };
function boxRating(r) {                          // Jellyfin's rating, tidied: "US:PG-13 / US:Rated PG-13" -> "PG-13", "Unrated" -> "NR"
  r = String(r || "").split(" / ")[0].trim(); if (r.includes(":")) r = r.split(":")[1];
  r = r.replace(/^Rated /i, "").trim().toUpperCase();
  return r === "NOT RATED" || r === "UNRATED" ? "NR" : r;
}
function boxBarcode(g, seed, x, y) {             // a UPC-looking barcode, the same every time for the same tape
  g.fillStyle = "#fff"; g.fillRect(x, y, 150, 70); g.fillStyle = "#000";
  let s = [...seed].reduce((a, c) => a * 31 + c.charCodeAt(0) >>> 0, 7); const rnd = n => (s = (s * 16807) % 2147483647) % n;
  for (let bx = 8; bx < 142;) { const w = 1 + rnd(3), tall = bx < 12 || bx > 136 || Math.abs(bx - 75) < 3; g.fillRect(x + bx, y + 6, w, tall ? 58 : 50); bx += w + 1 + rnd(3); }
}
async function boxDrawBack(t, g) {
  const d = await Jelly.details(t).catch(() => ({})) || {};
  const cast = (d.people || []).filter(p => p.type === "Actor" && p.img).slice(0, 4);
  const [backdrop, logo, ...faces] = await Promise.all([boxImage(d.backdrop), boxImage(d.logo), ...cast.map(p => boxImage(p.img))]);
  const W = FACE_W, H = FACE_H, PAD = 34, inner = W - PAD * 2, S = "rgba(0,0,0,.85)";
  const GOLD = "#ffd400", sans = `Arial, "Liberation Sans", sans-serif`, black = `"Arial Black", Arial, sans-serif`, narrow = `"Arial Narrow", "Liberation Sans Narrow", Arial, sans-serif`;
  g.setTransform(FACE_S, 0, 0, FACE_S, 0, 0);
  g.shadowColor = "transparent"; g.fillStyle = catColor[t.category] || "#1b2a4a"; g.fillRect(0, 0, W, H); g.fillStyle = "#0009"; g.fillRect(0, 0, W, H);
  if (backdrop) boxCover(g, backdrop, 0, 0, W, H);
  const shade = g.createLinearGradient(0, 0, 0, H); shade.addColorStop(0, "rgba(0,0,0,.45)"); shade.addColorStop(0.35, "rgba(0,0,0,.72)"); shade.addColorStop(1, "rgba(0,0,0,.9)");
  g.fillStyle = shade; g.fillRect(0, 0, W, H);
  const write = (text, x, y, px, { font = sans, weight = "normal", italic = false, color = "#fff", align = "left", shadow = true } = {}) => {
    g.font = `${italic ? "italic " : ""}${weight} ${px}px ${font}`; g.fillStyle = color; g.textAlign = align; g.textBaseline = "top";
    g.shadowColor = shadow ? S : "transparent"; g.shadowBlur = shadow ? 3 : 0; g.shadowOffsetX = g.shadowOffsetY = shadow ? 1.5 : 0;
    g.fillText(text, x, y);
  };
  const para = (text, x, y, w, px, lh, opts = {}, max = 99) => {   // -> where it ended
    g.font = `${opts.italic ? "italic " : ""}${opts.weight || "normal"} ${px}px ${opts.font || sans}`;
    let lines = boxWrap(g, text, w);
    if (lines.length > max) { lines = lines.slice(0, max); lines[max - 1] = `${lines[max - 1].replace(/[\s.,;:]+$/, "")}…`; }
    const ax = opts.align === "center" ? x + w / 2 : x;
    lines.forEach((l, i) => write(l, ax, y + i * lh, px, opts));
    return y + lines.length * lh;
  };
  const title = d.title || t.title, year = d.year || window.STORE_META?.[t.id]?.[0] || 0;
  // from the bottom up, so the blurb gets what's left: the foot, the billing, the scores, the facts
  let bottom = H - PAD - 70;
  boxBarcode(g, tapeKey(t), PAD, bottom);
  g.strokeStyle = "#fff"; g.lineWidth = 3; g.strokeRect(W - PAD - 86, bottom + 12, 86, 46);
  write("VHS", W - PAD - 43, bottom + 20, 28, { font: black, weight: "900", italic: true, align: "center" });
  const studio = (d.studios || [])[0] || "JellyBuster Home Video";
  para(`© ${year || ""} ${studio}. All rights reserved. Licensed for home viewing only. Any public performance, copying or other use is strictly prohibited. Be kind, please rewind.`, PAD + 166, bottom + 4, inner - 166 - 102, 11, 13, { color: "#b4b4b4", shadow: false }, 5);
  const peopleOf = (type, n) => (d.people || []).filter(p => p.type === type).slice(0, n).map(p => p.name.toUpperCase()).join("  ");
  const billing = [(d.studios || [])[0] && `${d.studios[0].toUpperCase()} PRESENTS`, peopleOf("Director", 1) && `A ${peopleOf("Director", 1)} FILM`, `"${title.toUpperCase()}"`, peopleOf("Actor", 8),
    peopleOf("Composer", 1) && `MUSIC BY ${peopleOf("Composer", 1)}`, peopleOf("Writer", 3) && `WRITTEN BY ${peopleOf("Writer", 3)}`, peopleOf("Producer", 3) && `PRODUCED BY ${peopleOf("Producer", 3)}`, peopleOf("Director", 2) && `DIRECTED BY ${peopleOf("Director", 2)}`].filter(Boolean);
  if (billing.length > 1) {
    g.font = `bold 13px ${narrow}`; const n = Math.min(5, boxWrap(g, billing.join("  ·  "), inner).length);
    bottom -= n * 15 + 12; para(billing.join("  ·  "), PAD, bottom, inner, 13, 15, { font: narrow, weight: "bold", color: "#d8d8d8", align: "center", shadow: false }, 5);
  }
  const scores = []; if (d.stars > 0) { const s = Math.round(d.stars / 2); scores.push(`${"★".repeat(s)}${"☆".repeat(5 - s)}  ${d.stars.toFixed(1)}/10`); } if (d.critics > 0) scores.push(`CRITICS ${Math.round(d.critics)}%`);
  if (scores.length) { bottom -= 34; write(scores.join("     "), PAD, bottom, 20, { weight: "bold", color: GOLD }); }
  const rating = boxRating(d.rating), bits = []; if (year) bits.push(String(year)); if (d.minutes) bits.push(`${d.minutes} MIN`); bits.push(...(d.genres || []).slice(0, 2).map(s => s.toUpperCase()), "STEREO");
  bottom -= 70;
  let fx = PAD;
  if (rating) {
    const words = BOX_RATINGS[rating] || (rating.startsWith("TV") ? "TV PARENTAL GUIDELINES" : "");
    g.font = `900 ${rating.length <= 5 ? 30 : 22}px ${black}`; const bw = Math.max(108, g.measureText(rating).width + 16);
    g.shadowColor = "transparent"; g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(fx, bottom, bw, 62); g.strokeStyle = "#fff"; g.lineWidth = 2; g.strokeRect(fx, bottom, bw, 62);
    write(rating, fx + bw / 2, bottom + 5, rating.length <= 5 ? 30 : 22, { font: black, weight: "900", align: "center", shadow: false });
    if (words) para(words, fx + 4, bottom + 39, bw - 8, 8.5, 10, { weight: "bold", align: "center", shadow: false }, 2);
    fx += bw + 14;
  }
  para(bits.join("  ·  "), fx, bottom + 12, W - PAD - fx, 17, 22, { weight: "bold" }, 2);
  // from the top down
  let y = PAD;
  if (logo) { const s = Math.min(inner / logo.width, 150 / logo.height), lw = logo.width * s, lh = logo.height * s; g.shadowColor = "transparent"; g.drawImage(logo, (W - lw) / 2, y + (150 - lh) / 2, lw, lh); y += 164; }
  else y = para(title.toUpperCase(), PAD, y, inner, 50, 56, { font: black, weight: "900", align: "center" }, 2) + 10;
  if (t.kind === "series" && t.seasons?.[0]?.label) y = para((d.season || t.seasons[0].label).toUpperCase(), PAD, y, inner, 28, 34, { weight: "bold", color: GOLD, align: "center" }, 1) + 4;
  if (d.tagline) y = para(d.tagline, PAD, y, inner, 25, 30, { weight: "bold", italic: true, color: GOLD, align: "center" }, 2) + 10;
  if (cast.length) {
    const cell = 128, gap = 14, row = cast.length * cell + (cast.length - 1) * gap; let cx = (W - row) / 2;
    cast.forEach((p, i) => {
      g.shadowColor = "transparent"; g.fillStyle = "#1a1a1a"; g.fillRect(cx, y, cell, 150); g.strokeStyle = "#ffffffe6"; g.lineWidth = 3; g.strokeRect(cx + 1.5, y + 1.5, cell - 3, 147);
      if (faces[i]) { g.save(); g.beginPath(); g.rect(cx + 3, y + 3, cell - 6, 144); g.clip(); boxCover(g, faces[i], cx + 3, y + 3, cell - 6, 144); g.restore(); }
      const end = para(p.name.toUpperCase(), cx, y + 154, cell, 15, 17, { weight: "bold", align: "center" }, 2);
      if (p.role) para(p.role.split(" / ")[0], cx, end + 1, cell, 13, 15, { italic: true, color: "#cccccc", align: "center" }, 1);
      cx += cell + gap;
    });
    y += 154 + 34 + 18 + 12;
  }
  const eps = t.kind === "series" ? t.seasons[0].episodes : [], listed = Math.min(10, eps.length), listH = listed ? Math.ceil(listed / 2) * 20 + 30 : 0;
  const blurb = d.overview || `${t.category}. Rewind before returning.`;
  const room = bottom - y - listH - 14, maxLines = Math.max(2, Math.floor(room / 28));
  y = para(boxFitChars(blurb, t.kind === "movie" ? 760 : 420), PAD, y, inner, 22, 28, {}, maxLines) + 12;
  if (listed) {
    write(`${eps.length} EPISODE${eps.length > 1 ? "S" : ""} ON THIS TAPE${eps.length > listed ? `  ·  FIRST ${listed} LISTED` : ""}`, PAD, y, 16, { weight: "bold", color: GOLD }); y += 24;
    const colW = (inner - 18) / 2;
    eps.slice(0, listed).forEach((e, i) => {
      const parts = e[1].split(" - "), name = parts.length > 2 ? parts.slice(2).join(" - ") : e[1];
      g.font = `normal 15px ${sans}`; let s = `${i + 1}. ${name}`; while (g.measureText(s).width > colW && s.length > 4) s = `${s.slice(0, -2)}…`;
      write(s, PAD + (i % 2) * (colW + 18), y + Math.floor(i / 2) * 20, 15, { color: "#e6e6e6" });
    });
  }
}
function boxMakeBack(t, rec) {
  const c = document.createElement("canvas"); c.width = FACE_W * FACE_S; c.height = FACE_H * FACE_S;
  const g = c.getContext("2d", { willReadFrequently: true });   // (kept on the CPU: it goes up to the GPU once, and doesn't stall anything getting there)
  rec.back = new THREE.CanvasTexture(c); rec.back.colorSpace = THREE.SRGBColorSpace; rec.back.anisotropy = renderer.capabilities.getMaxAnisotropy();
  g.fillStyle = "#14171d"; g.fillRect(0, 0, c.width, c.height);   // (till it's drawn: a plain back)
  boxDrawBack(t, g).catch(e => console.warn("JellyBuster: couldn't draw the back of the box", e)).finally(() => { g.setTransform(1, 0, 0, 1, 0, 0); g.shadowColor = "transparent"; rec.back.needsUpdate = true; if (boxState.rec === rec) boxBack.needsUpdate = true; });
}
function boxRecord(t) {
  const key = tapeKey(t); let rec = boxCache.get(key);
  if (rec) { boxCache.delete(key); boxCache.set(key, rec); return rec; }   // (most recent last)
  rec = { front: null, small: boxShelfCover(t), back: null, side: boxSpine(t) }; boxCache.set(key, rec);
  boxMakeBack(t, rec);
  for (const [k, old] of boxCache) { if (boxCache.size <= BOX_KEEP) break; if (old === boxState.rec) continue; boxCache.delete(k); for (const tx of [old.front, old.small, old.back, old.side]) tx?.dispose(); }
  const show = tex => { if (boxState.rec === rec) { boxFront.map = tex; boxFront.needsUpdate = true; } };
  const hi = t.artHi || t.art, take = url => boxLoader.load(url, tex => { rec.front?.dispose(); rec.front = boxFit(tex); show(rec.front); rec.small?.dispose(); rec.small = null; }, undefined, () => {});
  if (t.category === "Classic Horror") stickerize(hi, take); else take(hi);   // (its sticker's on the image, as on the shelf)
  return rec;
}
function tapeBoxShow(t) {                        // a new tape up: the right way round, level, not zoomed
  const rec = boxRecord(t);
  Object.assign(boxState, { key: tapeKey(t), tape: t, rec, flipped: false, a: 0, yaw: 0, pitch: 0, panX: 0, panY: 0 });
  coverZoom = 1;
  boxFront.map = rec.front || rec.small; boxBack.map = rec.back; boxSide.map = rec.side;
  boxEnd.color.copy(t.sideMat ? t.sideMat.color : new THREE.Color(0x1b1e24));
  for (const m of [boxFront, boxBack, boxSide]) m.needsUpdate = true;
}
function tapeBoxFlip() { boxState.flipped = !boxState.flipped; }
function tapeBoxMouse(dx, dy) {                  // the mouse, while it's up: tilts it; zoomed in, moves it around to read
  if (coverZoom > 1.05) {
    const lim = (coverZoom - 1) * 0.5, k = 0.0011;
    boxState.panX = Math.max(-lim, Math.min(lim, boxState.panX + dx * k / coverZoom));
    boxState.panY = Math.max(-lim, Math.min(lim, boxState.panY - dy * k / coverZoom));
  } else {
    boxState.yaw = Math.max(-0.75, Math.min(0.75, boxState.yaw + dx * 0.0035));
    boxState.pitch = Math.max(-0.55, Math.min(0.55, boxState.pitch + dy * 0.0035));
  }
}
function tapeBoxTick(dt) {
  const on = !!held && inspecting;
  tapeBox.visible = tapeBoxDim.visible = on;
  document.body.classList.toggle("boxup", on);
  if (!on) { boxState.key = null; return; }
  if (boxState.key !== tapeKey(held)) tapeBoxShow(held);
  const target = boxState.flipped ? Math.PI : 0, k = 1 - Math.exp(-dt * 9);
  boxState.a += (target - boxState.a) * k;
  const zoomed = Math.min(1, (coverZoom - 1) / 0.6), fit = 2 * BOX_DIST * Math.tan(camera.fov * Math.PI / 360) * BOX_FILL / TAPE.h, size = fit * coverZoom;
  const tilt = 1 - zoomed;                       // zoomed in, it squares up to be read
  tapeBox.rotation.set(boxState.pitch * tilt, boxState.a + (BOX_REST + boxState.yaw) * tilt, 0);
  tapeBox.scale.setScalar(size);
  tapeBox.position.set(-boxState.panX * TAPE.d * size, -boxState.panY * TAPE.h * size + 0.004 * fit * tilt, -BOX_DIST);
}
