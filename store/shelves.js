// ---------------- posters on the walls ----------------
const marquee = [];   // flashing bulbs around the posters: { mesh, phases } — one InstancedMesh per poster, a color per bulb
const bulbTmp = new THREE.Color();
// which poster goes where changes every week (the same all week): the whole set reshuffled, a couple resting
let posterDay = null;                             // (the shift's day; before the shift's set up, the saved one)
const posterWeek = () => Math.floor(((posterDay ?? SAVE?.shift?.day ?? 1) - 1) / 7), posterSpots = [];
function posterFor(i) {
  const picks = (window.STORE_POSTERS || []).map(art => ({ art })), wk = posterWeek();
  let seed = 4111 + wk * 7741; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const order = picks.map((p, k) => [rnd(), p]).sort((a, b) => a[0] - b[0]).map(e => e[1]);
  return wk === 0 ? picks[i] || order[i] : order[i % order.length];   // (week one: the original hang)
}
function postersSwap() {                          // a new week: down they come, up go this week's
  posterDay = shift.day;
  const loader = new THREE.TextureLoader(), wk = posterWeek();
  for (const pm of posterMats) {
    if (pm.userData.week === wk) continue; pm.userData.week = wk;
    const art = posterFor(pm.userData.spot)?.art; if (!art) continue;
    loader.load(artUrl(art), t => { t.colorSpace = THREE.SRGBColorSpace; pm.map?.dispose(); pm.map = pm.emissiveMap = t; pm.needsUpdate = true; });
  }
}
const posterMats = [];                     // the posters, lit by their own bulbs: a touch always, a lot more when their zone's lights are off
// the marquee's warm spill on the wall around each poster: one shared soft
// halo texture, additively blended — a real point light per poster (~21 of
// them) made every lit pixel in the store pay for every poster
const MARQUEE_PTS = [];                    // bulb ring around one poster, wall-local coords
for (let j = 0; j < 7; j++) { MARQUEE_PTS.push([-0.485 + (j + 0.5) * 0.97 / 7, 0.695]); MARQUEE_PTS.push([-0.485 + (j + 0.5) * 0.97 / 7, -0.695]); }
for (let j = 0; j < 9; j++) { MARQUEE_PTS.push([-0.485, -0.695 + (j + 0.5) * 1.39 / 9]); MARQUEE_PTS.push([0.485, -0.695 + (j + 0.5) * 1.39 / 9]); }
const HALO = { w: 1.7, h: 2.1 };           // the halo plane, meters
const haloMat = new THREE.MeshBasicMaterial({ color: 0xffcf70, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false,
  map: (() => {                            // shaped by the bulbs: a glow along their rectangle, a hot spot at each one, fading off the wall
    const W = 170, H = 210, c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d"), img = g.createImageData(W, H);
    const hx = 0.485, hy = 0.695;
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const x = (px + 0.5) / W * HALO.w - HALO.w / 2, y = HALO.h / 2 - (py + 0.5) / H * HALO.h;
      const dx = Math.max(Math.abs(x) - hx, 0), dy = Math.max(Math.abs(y) - hy, 0), out = Math.hypot(dx, dy);   // outside the ring: distance to it
      const ring = Math.abs(x) <= hx && Math.abs(y) <= hy ? Math.min(hx - Math.abs(x), hy - Math.abs(y)) : out;   // (inside: to the nearest edge)
      let v = 0.6 * Math.exp(-ring / 0.08);
      for (const [bx, by] of MARQUEE_PTS) { const d2 = (x - bx) ** 2 + (y - by) ** 2; if (d2 < 0.04) v += 0.45 * Math.exp(-d2 / 0.0035); }
      const edge = Math.min(HALO.w / 2 - Math.abs(x), HALO.h / 2 - Math.abs(y)), fade = Math.min(1, edge / 0.2);   // all the way out to nothing before the plane's edge
      img.data[(py * W + px) * 4 + 3] = 255 * Math.min(1, v) * fade * fade; img.data.fill(255, (py * W + px) * 4, (py * W + px) * 4 + 3);
    }
    g.putImageData(img, 0, 0); return new THREE.CanvasTexture(c); })() });
{
  // jellyfin.js picks them: the library's best rated
  const picks = (window.STORE_POSTERS || []).map(art => ({ art }));
  const loader = new THREE.TextureLoader();
  const bulbGeo = new THREE.SphereGeometry(0.022, 6, 5), bulbMat = new THREE.MeshBasicMaterial({ color: 0xffffff });   // white: the instance colors carry the chase
  const pts = MARQUEE_PTS;
  function placePoster(tape, x, y, z, ry, i) {  // group faces +z local; wall sits just behind
    if (!tape) return;                       // fewer posters than wall spots: leave the spot bare
    posterSpots.push(i);
    loader.load(artUrl(posterFor(i).art), t => {
      t.colorSpace = THREE.SRGBColorSpace;
      const g = new THREE.Group(); g.position.set(x, overWallShelf(x, z) ? 2.85 : y, z); g.rotation.y = ry;   // lifted clear of any wall shelving below it
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.97, 1.39, 0.04), mat.dark);
      back.position.z = -0.027; g.add(back);
      const pm = new THREE.MeshLambertMaterial({ map: t, emissive: 0xffffff, emissiveIntensity: 0, emissiveMap: t });
      pm.userData.zone = lightZoneAt(x, z); pm.userData.spot = i; pm.userData.week = posterWeek(); posterMats.push(pm);
      g.add(new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.31), pm));
      const bulbs = glow(new THREE.InstancedMesh(bulbGeo, bulbMat, pts.length)), bd = new THREE.Object3D();
      pts.forEach(([px, py], j) => { bd.position.set(px, py, 0.04); bd.updateMatrix(); bulbs.setMatrixAt(j, bd.matrix); bulbs.setColorAt(j, bulbTmp.set(0xffd400)); });
      g.add(bulbs);
      marquee.push({ mesh: bulbs, phases: pts.map((_, j) => i * 1.3 + j * 0.55) });
      // the bulbs' warm spill on the wall around it (see haloMat)
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(HALO.w, HALO.h), haloMat); halo.position.z = -0.046; g.add(halo);
      scene.add(g);
    });
  }
  // front & back walls, each split in two (front around the doors, back around
  // the mural): n posters per section with every gap equal — section edge to
  // poster and poster to poster. Section edges stop short of the side-wall
  // beam (0.31) and clear the door frame / mural by 0.2.
  const PW = 0.97, CORNER = 0.31;                   // poster frame width
  const spread = (a, b, n) => { const gap = (b - a - n * PW) / (n + 1); return Array.from({ length: n }, (_, k) => a + gap * (k + 1) + PW * (k + 0.5)); };
  const frontXs = [...spread(WALL_L + CORNER, -2.0, 2), ...spread(2.0, STORE.x - CORNER, 2)];
  const backXs = [...spread(WALL_L + CORNER, -3.2, 2), ...spread(BOH_DOORS.store + BOH_OPENING_W / 2 + 0.3, STORE.x - CORNER, 2)];   // right half starts past the back-hall opening
  frontXs.forEach((x, i) => placePoster(picks[i], x, 2.1, 0.26, 0, i));
  backXs.forEach((x, i) => placePoster(picks[4 + i], x, 2.85, STORE.z - 0.26, Math.PI, 4 + i));   // (all one height, shelves under them or not)
  for (let s = 0; s < 16; s++) {           // regular run down both bare side walls, mounted on the beam
    const side = s < 8 ? -1 : 1, i = 8 + s;
    const wx = side < 0 ? WALL_L + 0.36 : STORE.x - 0.36;   // hug whichever wall (movie side pulled in)
    const pz = 2.6 + (s % 8) * 3.25;
    if (side < 0 && pz + 0.49 > SNACK_ZONE[0] && pz - 0.49 < SNACK_ZONE[1]) continue;   // the cooler/popcorn/snack run stands here
    placePoster(picks[i], wx, 2.1, pz, -side * Math.PI / 2, i);
  }
}

// ---------------- cover atlases ----------------
// Each tape's front cover is drawn once into one of a few shared 2048² atlas
// canvases (144x288 px cells, 98 per atlas) — tapes are shelved face-out.
const COLS = 14, ROWS = 7, CELLS = COLS * ROWS, CW = 144, CH = 288;
const catColor = {}, catIdx = {};
ORDER.forEach((c, i) => catIdx[c] = i);
{
  let extra = ORDER.length;
  for (const t of catalog) if (!(t.category in catIdx)) catIdx[t.category] = extra++;
  for (const c in catIdx) {
    const h = (catIdx[c] * 137.5) % 360;
    catColor[c] = `hsl(${h.toFixed(0)} 62% 36%)`;
  }
}
const atlases = [];   // {canvas, ctx, material}
function atlasFor(n) {
  while (atlases.length <= n) {
    const S = LOWMEM ? 0.5 : 1;                   // phones: a 1024² canvas drawn at half scale (a quarter of the memory; same layout and UVs)
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 2048 * S;
    const ctx = canvas.getContext("2d"); ctx.scale(S, S);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    atlases.push({ canvas, ctx, texture, material: new THREE.MeshLambertMaterial({ map: texture }) });
  }
  return atlases[n];
}
const artLoader = new THREE.TextureLoader();
// covers land one by one off the network: re-uploading a whole atlas for each would be a hitch each, so one atlas goes up at a time, a few times a second
const atlasDirty = new Set();
// ...and how far along they are, small in the corner till they're all in (they come off the server for a while, on past the store opening)
const coverCount = { done: 0, missing: 0 };
const coverBar = document.createElement("div"); coverBar.id = "coverProgress";
coverBar.style.cssText = "position:fixed;right:16px;bottom:38px;z-index:99999;pointer-events:none;color:#fff;opacity:.7;font:11px Verdana,sans-serif;text-shadow:0 1px 2px #000";
document.body.appendChild(coverBar);
const coverTick = setInterval(() => {
  const a = atlasDirty.values().next().value; if (a) { atlasDirty.delete(a); a.texture.needsUpdate = true; }
  const n = catalog.length, { done, missing } = coverCount, all = done + missing >= n;
  coverBar.textContent = !all ? `Covers ${done + missing} / ${n}` : missing ? `${missing} cover${missing > 1 ? "s" : ""} missing` : "Covers in";
  if (all && !atlasDirty.size) { clearInterval(coverTick); setTimeout(() => coverBar.remove(), missing ? 6000 : 1500); }
}, 250);

// full-res cover texture cache, keyed by art path — hand/table-box art gets
// picked up and put back constantly, so avoid re-decoding the same image
const coverTexCache = new Map();
function loadCoverTexture(tape, onLoad) {
  const cached = coverTexCache.get(tape.art);
  if (cached) { onLoad(cached); return; }
  artLoader.load(artUrl(tape.art), t => {
    t.colorSpace = THREE.SRGBColorSpace;
    coverTexCache.set(tape.art, t);
    onLoad(t);
  });
}
// box sides/back take the cover's dominant color: vote 12x18 downsampled
// pixels into 8-level-per-channel buckets and average the winning bucket.
// One material per bucket (≤512), shared by every tape that lands in it.
const swatch = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
swatch.canvas.width = 12; swatch.canvas.height = 18;
const sideMats = new Map();
function sideMatFor(img) {
  swatch.drawImage(img, 0, 0, 12, 18);
  const d = swatch.getImageData(0, 0, 12, 18).data, votes = new Map();
  for (let i = 0; i < d.length; i += 4) {
    const k = (d[i] >> 5) << 6 | (d[i + 1] >> 5) << 3 | d[i + 2] >> 5;
    const v = votes.get(k) || { k, n: 0, r: 0, g: 0, b: 0 };
    v.n++; v.r += d[i]; v.g += d[i + 1]; v.b += d[i + 2]; votes.set(k, v);
  }
  const top = [...votes.values()].reduce((a, b) => b.n > a.n ? b : a);
  if (!sideMats.has(top.k)) sideMats.set(top.k, new THREE.MeshLambertMaterial({
    color: new THREE.Color().setRGB(top.r / top.n / 255, top.g / top.n / 255, top.b / top.n / 255, THREE.SRGBColorSpace) }));
  return sideMats.get(top.k);
}
// the Classic Horror sticker: a round black-and-green badge slapped on the
// top-right corner of every Classic Horror cover (shelf covers + the held-up view)
function drawMVSticker(ctx, x, y, r) {        // x, y = badge center
  ctx.save(); ctx.translate(x, y); ctx.rotate(0.22);
  ctx.fillStyle = "#0b0b0b"; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = r * 0.12; ctx.strokeStyle = "#7dff3a"; ctx.stroke();
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `900 ${r * 0.34}px "Arial Black", Arial`;
  ctx.fillStyle = "#7dff3a"; ctx.fillText("CLASSIC", 0, -r * 0.2);
  ctx.fillStyle = "#fff"; ctx.fillText("HORROR", 0, r * 0.24);
  ctx.restore();
}
// a cover image with the sticker composited on (for the held-up <img>); falls back to the plain image
function stickerize(src, done) {
  const img = new Image(); img.crossOrigin = "anonymous";
  img.onload = () => {
    try {
      const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0);
      drawMVSticker(ctx, c.width * 0.8, c.width * 0.2, c.width * 0.16);
      done(c.toDataURL("image/jpeg", 0.92));
    } catch { done(src); }                    // tainted (no CORS): plain poster
  };
  img.onerror = () => done(src); img.src = src;
}
function drawCover(tape, cell) {
  const a = atlasFor(Math.floor(cell / CELLS)), ctx = a.ctx;
  const x0 = (cell % CELLS) % COLS * CW, y0 = Math.floor((cell % CELLS) / COLS) * CH;
  // placeholder: category-colored case with the title printed on it
  ctx.fillStyle = catColor[tape.category]; ctx.fillRect(x0, y0, CW, CH);
  ctx.strokeStyle = "#00000088"; ctx.lineWidth = 2; ctx.strokeRect(x0 + 1, y0 + 1, CW - 2, CH - 2);
  ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "top";
  const fs = 24, maxW = CW - 16; ctx.font = `bold ${fs}px Arial`;
  const lines = [""];
  for (const w of tape.title.split(" ")) {
    const last = lines[lines.length - 1];
    if (last && ctx.measureText(last + " " + w).width > maxW) lines.push(w);
    else lines[lines.length - 1] = last ? last + " " + w : w;
  }
  if (lines.length > 8) { lines.length = 8; lines[7] += "…"; }
  let line = y0 + 26;
  for (const L0 of lines) {
    let L = L0;
    while (ctx.measureText(L + "…").width > maxW && L.length > 1) L = L.slice(0, -1);
    if (L !== L0) L += "…";
    ctx.fillText(L, x0 + CW / 2, line); line += fs + 4;
  }
  if (tape.label) { ctx.fillStyle = "#ffd400"; ctx.font = "bold 15px Arial"; ctx.fillText(tape.label.slice(0, 12), x0 + CW / 2, y0 + CH - 24); }
  const mv = tape.category === "Classic Horror";
  if (mv) drawMVSticker(ctx, x0 + CW - 30, y0 + 30, 25);
  tape.cell = cell;
  // real cover art from art/, painted over the placeholder once it loads
  artLoader.load(artUrl(tape.art), tex => {
    const img = tex.image;                    // TextureLoader hands back a Texture, not an <img>
    const s = Math.max((CW - 4) / img.width, (CH - 4) / img.height);
    const sw = (CW - 4) / s, sh = (CH - 4) / s;
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x0 + 2, y0 + 2, CW - 4, CH - 4);
    if (mv) drawMVSticker(ctx, x0 + CW - 30, y0 + 30, 25);
    atlasDirty.add(a);
    tape.sideMat = sideMatFor(img);
    for (const c of [tape, ...(tape.copies || [])]) paintBody(c);   // art usually lands after the shelves are built
    coverCount.done++;
  }, undefined, () => { coverCount.missing++; });
}
catalog.forEach((tape, i) => drawCover(tape, i + 1));                          // cell 0 reserved
atlases.forEach(a => a.texture.needsUpdate = true);
function cellUV(cell) {
  const cx = (cell % CELLS) % COLS, cy = Math.floor((cell % CELLS) / COLS);
  const u0 = cx * CW / 2048, u1 = (cx * CW + CW) / 2048;
  const v1 = 1 - cy * CH / 2048, v0 = 1 - (cy * CH + CH) / 2048;
  return [u0, v0, u1, v1];
}

// ---------------- shelves ----------------
// Face = one category chunk on one side of a band; a side = faces chained along x.
// Everything on the shelves gets merged into a handful of big meshes once the
// store is laid out (flushShelves): thousands of separate tape and board
// meshes made per-object overhead the bottleneck (the bloom pass walks every
// mesh twice a frame). Taking a tape off a shelf collapses its own vertices in
// the merged mesh instead of hiding a mesh of its own.
const shelfParts = new Map();                 // material -> [world-space geometry]
const coverParts = new Map();                 // atlas index -> [{ geo, tape }]
const bodyParts = [];                         // [{ geo, tape }]
const coverMeshes = [];                       // merged covers, for picking: userData.tapes[i] owns vertices 4i..4i+3
const COVER_V = 4, BODY_V = 24;               // vertices per cover plane / tape box
const bodyColor = new THREE.Color(0x101318);  // plain black case until the cover art tells us its color
let bodyMesh = null;
function addShelfPart(material, geo) {
  if (!shelfParts.has(material)) shelfParts.set(material, []);
  shelfParts.get(material).push(geo.index ? geo.toNonIndexed() : geo);   // Extrude geometry isn't indexed; merging needs them all alike
}
function paintBody(tape) {                    // a copy's case takes its cover's dominant color (see sideMatFor)
  if (!bodyMesh || !tape.slot) return;
  const c = tape.sideMat ? tape.sideMat.color : bodyColor, col = bodyMesh.geometry.attributes.color;
  for (let i = 0; i < BODY_V; i++) col.setXYZ(tape.slot.bv + i, c.r, c.g, c.b);
  col.needsUpdate = true;
}
function setOnShelf(tape, on) {               // show/hide one copy in the merged shelf meshes
  const sl = tape.slot;
  if (!sl || tape.offShelf === !on) return;
  for (const [mesh, v0, n] of [[sl.cover, sl.cv, COVER_V], [bodyMesh, sl.bv, BODY_V]]) {
    const pos = mesh.geometry.attributes.position;
    if (!on) { sl.saved.set(mesh, pos.array.slice(v0 * 3, (v0 + n) * 3)); for (let i = 0; i < n; i++) pos.setXYZ(v0 + i, 0, -10, 0); }   // collapse it under the floor
    else pos.array.set(sl.saved.get(mesh), v0 * 3);
    pos.needsUpdate = true;
  }
  tape.offShelf = !on;
}
function flushShelves() {
  for (const [material, geos] of shelfParts) scene.add(new THREE.Mesh(mergeGeometries(geos), material));
  for (const [a, parts] of coverParts) {
    const m = new THREE.Mesh(mergeGeometries(parts.map(p => p.geo)), atlases[a].material);
    m.userData.tapes = parts.map(p => p.tape);
    parts.forEach((p, i) => { p.tape.slot = { cover: m, cv: i * COVER_V, bv: 0, saved: new Map() }; p.tape.offShelf = false; });   // own props on every copy
    coverMeshes.push(m); scene.add(m);
  }
  bodyParts.forEach(({ geo, tape }, i) => {
    const c = tape.sideMat ? tape.sideMat.color : bodyColor, col = new Float32Array(geo.attributes.position.count * 3);
    for (let v = 0; v < col.length; v += 3) { col[v] = c.r; col[v + 1] = c.g; col[v + 2] = c.b; }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    tape.slot.bv = i * BODY_V;
  });
  bodyMesh = new THREE.Mesh(mergeGeometries(bodyParts.map(p => p.geo)), new THREE.MeshLambertMaterial({ vertexColors: true }));
  scene.add(bodyMesh);
  shelfParts.clear(); coverParts.clear(); bodyParts.length = 0;
}
const catStripMat = {};  // yellow header strip per category
const endTags = [];      // endcap genre lists: { mat, cats, w, lineH } (signsRefresh swaps a locked section for COMING SOON)
let mvTopper = null;     // the CLASSIC HORROR topper (not up until the section's bought)
function signsRefresh() {                     // simulation: a section that isn't in yet says COMING SOON instead of its genre
  const soon = cat => libLocked({ category: cat });
  for (const [cat, m] of Object.entries(catStripMat)) {
    if (cat === "__soon") continue;
    m.userData.real ??= m.map;
    m.map = soon(cat) ? (catStripMat.__soon ??= stripTexture("Coming Soon")).map : m.userData.real; m.needsUpdate = true;
  }
  for (const t of endTags) {
    t.real ??= t.mat.map; let said = false;
    const lines = t.cats.map(c => !soon(c) ? c : said ? "" : (said = true, "COMING SOON"));
    t.mat.map = said ? tagPlane(lines, t.w, t.lineH).material.map : t.real; t.mat.needsUpdate = true;
  }
  if (mvTopper) mvTopper.visible = !soon("Classic Horror");
}
function stripTexture(cat) {
  const t = makeTexture((ctx, W, H) => {
    ctx.fillStyle = "#ffd400"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#00349c"; ctx.font = "bold 52px Arial Black, Arial";
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(cat.toUpperCase(), W / 2, H / 2);
  }, 1024, 96);
  return new THREE.MeshLambertMaterial({ map: t });   // lit by the room, dims in lights-out
}
// A slim category can ride along in the leftover shelf space at the end of a
// bigger one's last (partial) bay instead of starting a whole new bay: tail
// is that bigger category's trailing tapes (< CAP of them); this pads out to
// the next empty row, reserves that row for a header sign, and fills next's
// tapes into the row below. Returns the padded (CAP-length, gaps as null)
// tapes array for that single shared bay, the header descriptor for
// buildFace, and whatever of next's tapes didn't fit (to shelve normally).
function mergeIntoTail(tail, next, label, spec = BAY) {
  const cap = spec.rows * spec.perRow;
  const rowsUsed = Math.ceil(tail.length / spec.perRow);
  const headerStart = rowsUsed * spec.perRow;
  const contentStart = headerStart + spec.perRow;
  const avail = Math.max(0, cap - contentStart);
  const headCount = tail.length ? Math.min(next.length, avail) : 0;   // no tail = no leftover row to share
  const arr = new Array(cap).fill(null);
  tail.forEach((t, i) => arr[i] = t);
  for (let i = 0; i < headCount; i++) arr[contentStart + i] = next[i];
  return { arr, header: headCount ? { index: headerStart, label } : null, leftover: next.slice(headCount) };
}
// cover-face center of a tape leaning back LEAN on shelf row r, its top resting
// on that row's backing (which stands where the next row's front edge is)
function leanAt(r, spec = BAY) {
  const y0 = spec.boardY[r] + 0.02, back = frontAt(spec.boardY[r + 1] ?? spec.h, spec);
  const sn = Math.sin(LEAN), cs = Math.cos(LEAN);
  const xb0 = back + TAPE.h * sn + 0.002;          // bottom-back corner, so the top-back corner just touches
  return { cx: xb0 - TAPE.h / 2 * sn + (TAPE.w + 0.001) * cs, cy: y0 + TAPE.h / 2 * cs + (TAPE.w + 0.001) * sn };
}
// ry: the face's rotation — its shelves face local +x turned by ry (so ry=0
// faces +x, π faces -x, -π/2 faces +z, π/2 faces -z); m: which way along local z
// the bays extend from the anchor. spec: the gondola (BAY, or SHORT)
function buildFace(tapes, ax, az, ry, m, headers = [], lead = true, spec = BAY, label = null) {   // label: header-strip text, instead of the first tape's genre   // headers: mid-run category signs on an otherwise-empty row; lead=false shares the previous face's end panel
  const cap = spec.rows * spec.perRow;
  const nBays = Math.max(1, Math.ceil(tapes.length / cap));
  // local +z runs to the shopper's left, so mirror bay and slot order on m>0
  // faces — every face then reads left→right, top→bottom
  const flip = m > 0;
  const place = k => {
    const rem = k % cap, row = spec.rows - 1 - Math.floor(rem / spec.perRow); // fill top-down: partial faces keep tapes at eye level
    let bay = Math.floor(k / cap), slot = rem % spec.perRow;
    if (flip) { bay = nBays - 1 - bay; slot = spec.perRow - 1 - slot; }
    return { row, bay, lz: m * (bay * spec.len + 0.08 + (slot + 0.5) * SLOT_W) };
  };
  const covers = [], bodies = [], boards = [], uprights = [], backings = [];
  tapes.forEach((tape, k) => {
    if (!tape) { covers.push(null); bodies.push(null); return; }   // reserved gap: header row or unused slot
    const { row, lz } = place(k);
    const { cx, cy } = leanAt(row, spec);
    const p = new THREE.PlaneGeometry(TAPE.d, TAPE.h);                          // face-out cover
    const [u0, v0, u1, v1] = cellUV(tape.cell);
    const uv = p.attributes.uv;
    uv.setXY(0, u0, v1); uv.setXY(1, u1, v1); uv.setXY(2, u0, v0); uv.setXY(3, u1, v0);
    p.rotateY(Math.PI / 2); p.rotateZ(LEAN); p.translate(cx, cy, lz);
    covers.push(p);
    const b = new THREE.BoxGeometry(TAPE.w, TAPE.h, TAPE.d); b.rotateZ(LEAN);
    b.translate(cx - (TAPE.w / 2 + 0.001) * Math.cos(LEAN), cy - (TAPE.w / 2 + 0.001) * Math.sin(LEAN), lz);
    bodies.push(b);
  });
  // stepped shelves: each board's front edge sits on the sloped face, and a
  // white backing rises from it to the next board's front edge — so the
  // backing a row leans on is exactly where the row above starts
  const riseTo = r => spec.boardY[r + 1] ?? spec.h;
  for (let bay = 0; bay < nBays; bay++) {
    const zc = m * (bay * spec.len + spec.len / 2), zl = spec.len - 0.05;
    spec.boardY.forEach((y, r) => {
      const d = frontAt(y, spec);
      const g = new THREE.BoxGeometry(d, 0.04, zl); g.translate(d / 2, y, zc); boards.push(g);
      // spans top of this board → underside of the next board/cap (overlap z-fights)
      const xb = frontAt(riseTo(r), spec), y0 = y + 0.02, y1 = riseTo(r) - (r < spec.rows - 1 ? 0.02 : 0.04);
      const w = new THREE.BoxGeometry(0.015, y1 - y0, zl); w.translate(xb - 0.0075, (y0 + y1) / 2, zc); backings.push(w);
    });
    const top = new THREE.BoxGeometry(spec.top, 0.04, zl); top.translate(spec.top / 2, spec.h - 0.02, zc); uprights.push(top);
    const kick = new THREE.BoxGeometry(0.02, spec.boardY[0], zl);                  // toe kick under the bottom shelf
    kick.translate(frontAt(0, spec) - 0.03, spec.boardY[0] / 2, zc); uprights.push(kick);
    const back = new THREE.BoxGeometry(0.02, spec.h, spec.len); back.translate(0.005, spec.h / 2, zc); uprights.push(back);   // solid back: a run with nothing behind it shows a panel, not bare shelving. It sits 5 mm behind x=0, where the boards, caps and end panels all stop, so their back faces hide inside it instead of flickering against it
  }
  const side = new THREE.Shape([[0, 0], [spec.depth, 0], [spec.top, spec.h], [0, spec.h]].map(([x, y]) => new THREE.Vector2(x, y)));
  for (let b = lead ? 0 : 1; b <= nBays; b++) {   // blue wedge end panels at every bay boundary
    const u = new THREE.ExtrudeGeometry(side, { depth: 0.05, bevelEnabled: false }); u.translate(0, 0, m * b * spec.len - 0.025); uprights.push(u);
  }

  const group = new THREE.Group();
  group.rotation.y = ry;
  group.position.set(ax, 0, az);
  group.updateMatrixWorld(true);
  const M = group.matrixWorld;                  // everything goes into the merged shelf meshes in world space (see flushShelves)
  tapes.forEach((tape, k) => {
    if (!tape) return;
    const a = Math.floor(tape.cell / CELLS);
    if (!coverParts.has(a)) coverParts.set(a, []);
    coverParts.get(a).push({ geo: covers[k].applyMatrix4(M), tape });   // this exact copy — duplicates share a cover cell, so the cell can't say which
    bodyParts.push({ geo: bodies[k].applyMatrix4(M), tape });
  });
  boards.forEach(g => addShelfPart(mat.board, g.applyMatrix4(M)));
  backings.forEach(g => addShelfPart(mat.backing, g.applyMatrix4(M)));
  uprights.forEach(g => addShelfPart(mat.upright, g.applyMatrix4(M)));
  // header strip on the top backing, above the top row of tapes; genre labels live on the endcaps
  const cat = label || tapes.find(Boolean).category;
  if (!catStripMat[cat]) catStripMat[cat] = stripTexture(cat);
  if (cat !== "Classic Horror") for (let bay = 0; bay < nBays; bay++) {   // (Classic Horror has its own topper sign instead)
    const h = new THREE.PlaneGeometry(spec.len - 0.1, 0.16);
    h.rotateY(Math.PI / 2); h.translate(spec.top + 0.006, spec.h - 0.15, m * (bay * spec.len + spec.len / 2));   // 6 mm off the backing: closer flickers at a distance
    addShelfPart(catStripMat[cat], h.applyMatrix4(M));
  }
  // mid-run sign: a slim category riding the leftover shelf space gets its
  // own small placard on the empty row, right above where its tapes start
  headers.forEach(({ index, label }) => {
    if (!catStripMat[label]) catStripMat[label] = stripTexture(label);
    const { row, bay } = place(index);
    const { cx, cy } = leanAt(row, spec);
    const lz = m * (bay * spec.len + 0.08 + spec.perRow * SLOT_W / 2);
    const hp = new THREE.PlaneGeometry(spec.perRow * SLOT_W - 0.1, TAPE.h);
    hp.rotateY(Math.PI / 2); hp.rotateZ(LEAN); hp.translate(cx, cy, lz);
    addShelfPart(catStripMat[label], hp.applyMatrix4(M));
  });
  // world-space slot position per tape (for hover highlight)
  tapes.forEach((tape, k) => {
    if (!tape) return;
    const { row, lz } = place(k);
    const { cx, cy } = leanAt(row, spec);
    tape.pos = new THREE.Vector3(cx, cy, lz).applyMatrix4(group.matrixWorld);
    tape.ry = ry;                                 // hover highlight turns to match the shelf
  });
  const len = nBays * spec.len;
  const corners = [[0, 0], [spec.depth, 0], [0, m * len], [spec.depth, m * len]]   // footprint, local (x, z) → world
    .map(([x, z]) => [ax + x * Math.cos(ry) + z * Math.sin(ry), az - x * Math.sin(ry) + z * Math.cos(ry)]);
  colliders.push({ x0: Math.min(...corners.map(c => c[0])), x1: Math.max(...corners.map(c => c[0])),
                   z0: Math.min(...corners.map(c => c[1])), z1: Math.max(...corners.map(c => c[1])), y1: spec.h });
  return len;
}

// ---------------- store layout ----------------
// Three zones:
//  - kids: the front corner by the windows on the TV Shows side — kids' movies,
//    shows, cartoons, kids' anime and Holiday, on low shelving over its own carpet
//  - the outer walls: the newer movies (t.shelf "wall", see jellyfin.js), in genre order sweeping from the
//    register wall around the back to the far wall, face-out, with extra copies
//    of the hits (more TMDB votes = more copies) so the walls fill up without
//    using up titles
//  - the center: low gondolas either side of the door→lounge corridor with
//    everything else — the older movies by genre (west), then TV (east)
const WALL_GENRES = ["Comedy", "Drama", "Action & Adventure", "Horror", "Sci-Fi & Fantasy"];   // most titles first
const MAX_COPIES = 12;
// wall runs in sweep order: anchor = the run's end on the shopper's right, ry
// faces it into the room, and bays extend to the shopper's left (m = +1)
const WALL_RUNS = [
  { x: WALL_L + 0.1, z: 8.1, ry: 0, bays: 12 },                     // register (Movies) wall, front → back, just past the snack center
  { x: WALL_L + 0.1 + BAY.depth, z: STORE.z - 0.1, ry: Math.PI / 2, bays: 2 },   // back wall, left of the lounge
  { x: BOH_DOORS.store + BOH_OPENING_W / 2 + 0.01, z: STORE.z - 0.1, ry: Math.PI / 2, bays: 2 },   // back wall, past the back-hall opening beside the lounge
  { x: STORE.x - 0.1, z: STORE_EXIT.z0 - 0.3, ry: Math.PI, bays: 11 },   // far wall, back → front, from just this side of the emergency exit, stopping short of the kids section
];
const CENTER = { corridor: 1.5, westBays: 2, eastBays: 4, z0: 8.6, gap: 2.0, bands: 4 };   // corridor = half-width of the door→lounge walkway; z0 = front band's door-side face
const KIDS = { bandX: [4.75, 8.15], z0: 1.1, bays: 4, x0: 1.95, x1: STORE.x - 0.1, z1: 8.3 };   // bandX = each band's center plane; x0..x1/z0..z1 = the carpet
// is this spot on a wall above one of the wall runs? (posters get lifted over them)
function overWallShelf(x, z) {
  return wallSpans.some(w => w.axis === "x" ? Math.abs(x - w.at) < 0.5 && z > w.a0 - 0.5 && z < w.a1 + 0.5
                                            : Math.abs(z - w.at) < 0.5 && x > w.a0 - 0.5 && x < w.a1 + 0.5);
}
const crtSpots = [];                         // ceiling CRT clusters, filled in below: [x, z]
const rentedCopies = [];                     // copies pulled off the shelves as "out on rental", filled in below
const wallSpans = [];                        // what the wall runs cover, for lifting posters above them: { axis, at, a0, a1 }
{
  const meta = window.STORE_META || {};
  const yearOf = t => meta[t.id]?.[0] ?? 0, votesOf = t => meta[t.id]?.[1] ?? 0;
  // which block of shelves each tape goes on is settled when the stock's read in (jellyfin.js: t.shelf)
  const onShelf = name => t => t.shelf === name;
  const isKids = onShelf("kids"), isWall = onShelf("wall"), isMV = onShelf("mv");

  // ---- shelving helpers ----
  const capOf = spec => spec.rows * spec.perRow;
  // Shelve a block of gondola runs as one continuous snake: runs are given in
  // walking order (down one side of a band, around its endcap, back up the
  // other side, across the aisle to the next band) and every genre fills the
  // next stretch of whole bays — so each genre stays in one unbroken stretch,
  // however many runs it turns the corner onto. Spare bays go to the most
  // crowded genres (tapes spread evenly across a genre's bays), so no bay is
  // left bare. ride: { host: guest } lets a genre too small for a bay of its
  // own sit on its host's last bay, under its own placard.
  const layBlock = (list, order, runs, spec, ride = {}, fill = null) => {   // fill(tapes, slots) → tapes: restock a genre once its bays are set
    const cap = capOf(spec), byCat = new Map();
    for (const t of list) { if (!byCat.has(t.category)) byCat.set(t.category, []); byCat.get(t.category).push(t); }
    const cats = [...order.filter(c => byCat.has(c)), ...[...byCat.keys()].filter(c => !order.includes(c))];   // anything unlisted goes last
    if (!cats.length) return {};                       // nothing for this block in this library: no shelves
    const rowsFor = n => Math.ceil(n / spec.perRow);
    const units = [], riding = new Set();
    for (const c of cats) {
      if (riding.has(c)) continue;
      const u = { cat: c, tapes: byCat.get(c) };
      u.bays = Math.ceil(u.tapes.length / cap);
      const g = ride[c], gt = g && byCat.get(g);
      const lastBay = u.tapes.length - Math.floor(u.tapes.length / u.bays) * (u.bays - 1);   // roughly — even spread, the last bay holds the remainder
      if (gt && rowsFor(lastBay) + 1 + rowsFor(gt.length) <= spec.rows) { u.guest = { cat: g, tapes: gt }; riding.add(g); }
      units.push(u);
    }
    const total = runs.reduce((a, r) => a + r.bays, 0);
    let spare = total - units.reduce((a, u) => a + u.bays, 0);
    if (spare < 0) console.warn(`shelving short by ${-spare} bays for: ${cats.join(", ")}`);
    while (spare-- > 0) units.reduce((a, u) => u.tapes.length / u.bays > a.tapes.length / a.bays ? u : a).bays++;
    if (fill) for (const u of units) if (!u.guest) u.tapes = fill(u.tapes, u.bays * cap);
    const bays = [];                                   // [{ cat, tapes (cap long, nulls = empty), headers }]
    for (const u of units) {
      for (let i = 0, from = 0; i < u.bays; i++) {
        const n = Math.floor(u.tapes.length / u.bays) + (i < u.tapes.length % u.bays ? 1 : 0);   // spread evenly
        const slice = u.tapes.slice(from, from + n); from += n;
        if (u.guest && i === u.bays - 1) {
          const { arr, header } = mergeIntoTail(slice, u.guest.tapes, u.guest.cat, spec);
          bays.push({ cat: u.cat, tapes: arr, headers: header ? [header] : [] });
        } else {                                       // a part-filled bay spreads its tapes evenly over its shelves, not a full top row and a straggler
          const arr = Array(cap).fill(null);
          for (let r = 0, k = 0; r < spec.rows; r++)
            for (let i = 0, n = Math.floor(slice.length / spec.rows) + (r < slice.length % spec.rows ? 1 : 0); i < n; i++) arr[r * spec.perRow + i] = slice[k++];
          bays.push({ cat: u.cat, tapes: arr, headers: [] });
        }
      }
    }
    let bi = 0;
    for (const r of runs) {                            // each run takes its next stretch of bays; one face per genre within it
      const mine = bays.slice(bi, bi + r.bays); bi += r.bays;
      const faces = [];
      mine.forEach(bay => {
        const f = faces[faces.length - 1];
        if (f && f.cat === bay.cat) { bay.headers.forEach(h => f.headers.push({ ...h, index: h.index + f.tapes.length })); f.tapes.push(...bay.tapes); }
        else faces.push({ cat: bay.cat, tapes: [...bay.tapes], headers: [...bay.headers] });
      });
      buildRun(faces, r.x, r.z, r.ry, r.dx, r.dz, spec);
    }
    return Object.fromEntries(units.map(u => [u.cat + (u.guest ? " + " + u.guest.cat : ""), u.bays]));
  };
  // One double-sided gondola run: faces laid end to end from (x, z) along
  // world direction (dx, dz), shelves facing ry, with the stacked genre list
  // on the blue endcap at each end
  const buildRun = (chain, x, z, ry, dx, dz, spec) => {
    if (!chain.length) return;
    const lx = Math.sin(ry), lz = Math.cos(ry);                     // the face's local +z, in world
    const m = Math.sign(lx * dx + lz * dz);                         // bays extend toward (dx, dz)
    // m>0 runs read toward the anchor, so lay their faces out last-first —
    // then every run reads left→right, and consecutive runs join end-to-end:
    // a genre snakes down one side of a band and back up the other
    let at = 0;
    (m > 0 ? [...chain].reverse() : chain).forEach((f, i) => { at += buildFace(f.tapes, x + dx * at, z + dz * at, ry, m, f.headers, i === 0, spec, f.cat); });
    const cats = [...new Set(chain.flatMap(f => f.tapes.filter(Boolean).map(t => t.category)))];
    const tag = tagPlane(cats, frontAt(1.1 + cats.length * 0.08, spec) - 0.04, 0.14);   // fits the wedge where its top edge is
    endTags.push({ mat: tag.material, cats, w: frontAt(1.1 + cats.length * 0.08, spec) - 0.04, lineH: 0.14 });   // (the clone at the far end shares this material)
    const nx = Math.cos(ry), nz = -Math.sin(ry), off = frontAt(1.1, spec) / 2;        // out from the back plane, to mid-wedge
    [[-0.033, Math.atan2(-dx, -dz)], [at + 0.033, Math.atan2(dx, dz)]].forEach(([d, rot], i) => {   // 8 mm off the 5 cm end panels
      const t = i ? tag.clone() : tag;
      t.position.set(x + dx * d + nx * off, 1.1, z + dz * d + nz * off); t.rotation.y = rot; scene.add(t);
    });
  };

  // ---- the walls: newer movies, with copies of the hits ----
  const wallBays = WALL_RUNS.reduce((a, r) => a + r.bays, 0);
  const weight = t => Math.pow(votesOf(t) + 1, 0.3);
  const byGenre = WALL_GENRES.map(g => catalog.filter(t => t.category === g && isWall(t)));   // catalog's already in shelf (alphabetical) order
  // each genre gets enough bays for one of each (jellyfin.js made sure those fit), and the spare ones go by its share of
  // the total pull. A genre this library has none of gets none
  const pull = byGenre.map(ts => ts.reduce((a, t) => a + weight(t), 0)), pullSum = pull.reduce((a, b) => a + b, 0) || 1;
  const ideal = pull.map(p => p / pullSum * wallBays);
  const bays = byGenre.map(ts => Math.ceil(ts.length / CAP));
  if (pull.some(p => p > 0)) for (let spare = wallBays - bays.reduce((a, b) => a + b, 0); spare > 0; spare--) {
    let most = -1;
    for (let i = 0; i < bays.length; i++) if (byGenre[i].length && (most < 0 || ideal[i] - bays[i] > ideal[most] - bays[most])) most = i;
    bays[most]++;
  }
  // copies per title fill its genre's bays exactly: ∝ weight, 1..MAX_COPIES
  const copiesFor = (ts, slots) => {
    const w = ts.map(weight), calc = s => w.map(x => Math.max(1, Math.min(MAX_COPIES, Math.round(s * x))));
    let lo = 0, hi = 100;
    for (let i = 0; i < 50; i++) { const mid = (lo + hi) / 2; calc(mid).reduce((a, b) => a + b, 0) > slots ? hi = mid : lo = mid; }
    const c = calc(lo), order = w.map((x, i) => i).sort((a, b) => w[b] - w[a]);
    let left = slots - c.reduce((a, b) => a + b, 0);
    for (let cap = MAX_COPIES; left > 0; cap++) for (const i of order) { if (left > 0 && c[i] < cap) { c[i]++; left--; } }
    return c;
  };
  // the sweep runs right→left for someone facing the wall, but each face reads
  // left→right: lay every genre in reverse along the sweep, and flip each run's
  // slice back when it's shelved
  const sweep = [];
  byGenre.forEach((ts, gi) => {
    ts.forEach(t => t.newRelease = true);             // the walls are the new releases (POS prices them that way)
    const n = copiesFor(ts, bays[gi] * CAP), stock = [];
    ts.forEach((t, i) => {
      t.copies = [];
      for (let k = 0; k < n[i]; k++) { const c = k ? newCopy(t) : t; if (k) t.copies.push(c); stock.push(c); }   // a copy is the same tape in every way but where it sits
    });
    sweep.push(...stock.reverse());
  });
  let si = 0;
  for (const run of WALL_RUNS) {
    const slice = sweep.slice(si, si + run.bays * CAP); si += run.bays * CAP;
    const lx = Math.sin(run.ry), lz = Math.cos(run.ry);
    let at = 0;
    for (let i = 0; i < slice.length;) {                // one face per genre stretch within the run
      let j = i; while (j < slice.length && slice[j].category === slice[i].category) j++;
      at += buildFace(slice.slice(i, j).reverse(), run.x + lx * at, run.z + lz * at, run.ry, 1, [], at === 0);
      i = j;
    }
    wallSpans.push(Math.abs(lx) > 0.5 ? { axis: "z", at: run.z, a0: Math.min(run.x, run.x + lx * at), a1: Math.max(run.x, run.x + lx * at) }
                      : { axis: "x", at: run.x, a0: Math.min(run.z, run.z + lz * at), a1: Math.max(run.z, run.z + lz * at) });
  }

  // ---- kids: low bands running back from the windows ----
  const kidsList = catalog.filter(isKids);
  // snake: each band's entrance-side (-x) face front→back, around the back endcap, its far (+x) face back→front, then the next band
  const kidsRuns = KIDS.bandX.flatMap(bx => [Math.PI, 0].map(ry => ({ x: bx, z: KIDS.z0, ry, dx: 0, dz: 1, bays: KIDS.bays })));
  // a thin section's stocked out with copies of its best, side by side, till it's most of the way full
  const copiesToFill = (ts, slots) => {
    const want = Math.min(Math.floor(slots * 0.7) - ts.length, ts.length * (MAX_COPIES - 1)), n = new Map(ts.map(t => [t, 1]));
    const best = [...ts].sort((a, b) => votesOf(b) - votesOf(a));
    for (let i = 0; i < want; i++) { const t = best[i % best.length]; n.set(t, n.get(t) + 1); }
    return ts.flatMap(t => [t, ...Array.from({ length: n.get(t) - 1 }, () => { const c = newCopy(t); (t.copies ||= []).push(c); return c; })]);
  };
  const kidsBays = layBlock(kidsList, ["Family & Kids", "Holiday", "Kids & Educational", "Animation", "Anime"], kidsRuns, SHORT, {}, copiesToFill);
  {                                                  // the kids' own carpet: arcade-style confetti on deep purple
    const kidsTex = makeTexture((ctx, W, H) => {
      ctx.fillStyle = "#2a1660"; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 3000; i++) {                // carpet fleck
        ctx.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.18)";
        ctx.fillRect(Math.random() * W, Math.random() * H, 3, 3);
      }
      const cols = ["#ffd400", "#ff4f7b", "#2fd3c7", "#7bea4a", "#ff8a1f", "#5aa9ff"];
      const star = (r) => { ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 - Math.PI / 2, rr = k % 2 ? r * 0.45 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); };
      const shapes = [
        r => star(r),
        r => { ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2); ctx.fill(); },                               // dot
        r => { ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2); ctx.lineWidth = r * 0.22; ctx.stroke(); },   // ring
        r => { ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.87, r * 0.5); ctx.lineTo(-r * 0.87, r * 0.5); ctx.closePath(); ctx.fill(); },   // triangle
        r => { ctx.beginPath(); ctx.lineWidth = r * 0.22; ctx.lineCap = "round"; for (let k = 0; k <= 4; k++) ctx.lineTo(-r + k * r / 2, k % 2 ? r * 0.35 : -r * 0.35); ctx.stroke(); },   // zigzag
        r => { ctx.beginPath(); ctx.lineWidth = r * 0.2; ctx.lineCap = "round"; ctx.moveTo(-r, 0); ctx.bezierCurveTo(-r * 0.4, -r, r * 0.4, r, r, 0); ctx.stroke(); },            // squiggle
      ];
      // scatter with wraparound so the pattern tiles seamlessly
      for (let i = 0; i < 70; i++) {
        const x = Math.random() * W, y = Math.random() * H, r = 18 + Math.random() * 26, rot = Math.random() * Math.PI * 2;
        const draw = shapes[i % shapes.length], c = cols[Math.floor(Math.random() * cols.length)];
        for (const ox of [-W, 0, W]) for (const oy of [-H, 0, H]) {
          ctx.save(); ctx.translate(x + ox, y + oy); ctx.rotate(rot); ctx.fillStyle = ctx.strokeStyle = c; draw(r); ctx.restore();
        }
      }
    }, 1024, 1024);
    const TILE = 2.4, w = KIDS.x1 - KIDS.x0, d = KIDS.z1 - 0.1;
    kidsTex.repeat.set(w / TILE, d / TILE);
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ map: kidsTex }));
    rug.rotation.x = -Math.PI / 2; rug.position.set((KIDS.x0 + KIDS.x1) / 2, 0.003, 0.1 + d / 2); scene.add(rug);
  }

  // ---- center: older movies west of the corridor, TV east ----
  const classics = catalog.filter(onShelf("classic")), tv = catalog.filter(onShelf("tv"));
  const bandStep = 2 * SHORT.depth + CENTER.gap;
  const bandZ = b => CENTER.z0 + b * bandStep + SHORT.depth;   // a band's back plane
  // snake through a block's bands: door-side (-z) face first, around the endcap, then its back (+z) face
  const blockRuns = (bands, x, dx, bays) => bands.flatMap(b => [Math.PI / 2, -Math.PI / 2].map(ry => ({ x, z: bandZ(b), ry, dx, dz: 0, bays })));
  // TV east of the corridor, all four bands; grown-up Animation right next to Anime
  const TV_ORDER = ["Sitcoms", "Classic Sitcoms", "Sketch Comedy & Late Night", "Broadcast Blocks", "Drama & Adventure",
    "Horror & Anthology", "Animation", "Anime", "Reality TV"];
  const tvBays = layBlock(tv, TV_ORDER, blockRuns([0, 1, 2, 3], CENTER.corridor, 1, CENTER.eastBays), SHORT, { "Broadcast Blocks": "Music" }, copiesToFill);
  // classics west of the corridor, in its back two bands — the front band is
  // the candy aisle, and the one behind it stays open floor by the register
  const classicsFrom = 2;
  const classicsBays = layBlock(classics, WALL_GENRES, blockRuns([classicsFrom, classicsFrom + 1], -CENTER.corridor, -1, CENTER.westBays), SHORT, {}, copiesToFill);
  for (let b = 0; b < CENTER.bands - 1; b++) {           // a ceiling CRT cluster at each outer end of the aisle behind each band
    const zMid = bandZ(b) + SHORT.depth + CENTER.gap / 2;
    crtSpots.push([-CENTER.corridor - CENTER.westBays * BAY.len - 0.9, zMid], [CENTER.corridor + CENTER.eastBays * BAY.len + 0.9, zMid]);
  }

  // ---- Staff Picks: a low display across the far end of the walkway, facing the entrance ----
  // The library's best rated, one copy of each: three rows of movies, then three of TV (a show's first tape). A row's
  // unused slots stay empty (reads as rented out).
  const best = (list, n) => [...list].filter(t => !isKids(t)).sort((a, b) => votesOf(b) - votesOf(a) || a.id.localeCompare(b.id)).slice(0, n);
  const firstTapes = [...new Map([...catalog].filter(t => t.kind === "series").sort((a, b) => seasonRank(a) - seasonRank(b)).map(t => [t.id, t]).reverse()).values()];
  const pad = (list, rows) => { const n = rows * SHORT.perRow; return [...list.slice(0, n), ...Array(Math.max(0, n - list.length)).fill(null)]; };
  const lastBandEnd = CENTER.z0 + (CENTER.bands - 1) * bandStep + 2 * SHORT.depth;
  const pickZ = lastBandEnd + 1.1 + SHORT.depth;           // display's back plane: a walkway's clearance behind the last band
  const pickW = 2;                                         // bays wide — wider than the walkway
  const slots = [...pad(best(catalog.filter(t => t.kind === "movie"), 3 * SHORT.perRow), 3), ...pad(best(firstTapes, 3 * SHORT.perRow), 3)].map(t => { if (!t) return null; const c = newCopy(t); (t.copies ||= []).push(c); return c; });
  const px0 = -pickW * BAY.len / 2;
  buildFace(slots, -px0, pickZ, Math.PI / 2, -1, [], true, SHORT, "STAFF PICKS");   // faces the entrance, runs +x → -x
  {                                                        // a topper sign, facing the entrance
    const sg = textPlane("STAFF PICKS", 2.4, 0.42);
    sg.material = new THREE.MeshLambertMaterial({ map: sg.material.map });
    box(2.5, 0.5, 0.06, mat.upright, 0, SHORT.h + 0.25, pickZ - 0.03);
    sg.position.set(0, SHORT.h + 0.25, pickZ - 0.066); sg.rotation.y = Math.PI; scene.add(sg);   // 6 mm off the board
  }

  // ---- Classic Horror: band 1's back face (register side), facing into the
  // store — the first thing before the Classics, one standard aisle from
  // Comedy, back to back with the candy rack. This one unit is four rows
  // high (same 1.5 m gondola) to hold more in two bays ----
  const MV_SPEC = { ...SHORT, rows: 4, boardY: [0.12, 0.45, 0.78, 1.11] };
  const mvBays = layBlock(catalog.filter(isMV), ["Classic Horror"],
    [{ x: -CENTER.corridor, z: bandZ(1), ry: -Math.PI / 2, dx: -1, dz: 0, bays: CENTER.westBays }], MV_SPEC);
  if (catalog.some(isMV)) {                                // topper: CLASSIC HORROR in green on black, facing into the store
    const cx = -CENTER.corridor - CENTER.westBays * BAY.len / 2, z = bandZ(1);
    mvTopper = new THREE.Group(); scene.add(mvTopper);
    mvTopper.add(box(2.5, 0.5, 0.06, mat.dark, cx, SHORT.h + 0.25, z + 0.03));
    const sg = textPlane("CLASSIC HORROR", 2.4, 0.42, "#7dff3a", "#0b0b0b");
    sg.material = new THREE.MeshLambertMaterial({ map: sg.material.map });
    sg.position.set(cx, SHORT.h + 0.25, z + 0.066); mvTopper.add(sg);
  }

  // home spot: faces into the aisle at 45°, tucked by the Classic Horror endcap
  Object.assign(cutout, { x: -1.3, z: bandZ(1) + 0.9, ry: -Math.PI / 4 });
  // ---- cardboard standee (cutout.js): life-size Dracula at the walkway end of
  // the Classic Horror aisle, facing the same way as the covers (into the store). Shaped exactly like the PNG
  // (alpha-tested), printed on the front, plain cardboard on the back, a few
  // cardboard layers between for a visible edge, and an easel strut folded
  // out behind to hold it up. E picks it up and carries it; E again sets it
  // down anywhere it fits (see "carrying the standee") ----
  if (window.STORE_CUTOUT) {
    const img = new Image();
    img.onload = () => {
      const H = 1.85, W = H * img.width / img.height, T = 0.005;              // life-size; 5 mm board
      const layer = fill => {                                                  // the PNG's silhouette, recolored (null = the print itself)
        const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
        const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0);
        if (fill) { ctx.globalCompositeOperation = "source-in"; fill(ctx, c.width, c.height); }
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
      };
      const kraft = (ctx, w, h) => {                                           // cardboard: tan with faint fibres
        ctx.fillStyle = "#b98c5a"; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 900; i++) { ctx.fillStyle = Math.random() < 0.5 ? "rgba(90,60,30,.18)" : "rgba(255,240,210,.15)"; ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 6, 1); }
      };
      const g = cutout.g = new THREE.Group(); g.position.set(cutout.x, 0, cutout.z); g.rotation.y = cutout.ry; scene.add(g);
      const face = (tex, z, ry = 0) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: ry ? THREE.FrontSide : THREE.DoubleSide }));
        m.position.set(0, H / 2, z); m.rotation.y = ry; g.add(m); return m;
      };
      face(layer(null), T / 2);                                                // printed front
      face(layer(kraft), -T / 2, Math.PI);                                     // cardboard back
      const edge = layer((ctx, w, h) => { ctx.fillStyle = "#8f6a42"; ctx.fillRect(0, 0, w, h); });
      for (let i = 1; i < 4; i++) face(edge, T / 2 - i * T / 4);                // the board's thickness, seen edge-on
      // easel strut: a tapered cardboard leg hinged a bit over halfway up the back, foot on the floor behind
      const top = 1.05, reach = 0.45, len = Math.hypot(top, reach);
      const strut = new THREE.Shape([[-0.07, 0], [0.07, 0], [0.12, -len], [-0.12, -len]].map(([x, y]) => new THREE.Vector2(x, y)));
      const leg = new THREE.Mesh(new THREE.ShapeGeometry(strut), new THREE.MeshLambertMaterial({ color: 0xb98c5a, side: THREE.DoubleSide }));
      leg.position.set(0, top, -T); leg.rotation.x = Math.atan2(reach, top); g.add(leg);   // swings the foot back (-z), behind the board
      const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.004), new THREE.MeshLambertMaterial({ color: 0x8f6a42 }));
      hinge.position.set(0, top - 0.02, -T - 0.002); g.add(hinge);             // the glued tab the strut folds out from
      g.traverse(o => { if (o.isMesh) { o.userData.cutout = true; aimables.push(o); } });
    };
    img.src = window.STORE_CUTOUT;
    colliders.push(cutout.box); cutoutFit(cutout.x, cutout.z, cutout.ry, cutout.box);
  }

  // ---- candy aisle: band 1's door-side face on the register side, back to back with Classic Horror ----
  // one wide snack rack facing the register and the doors, where a checkout line would stand
  {
    const w = CENTER.westBays * BAY.len, cx = -CENTER.corridor - w / 2, cz = bandZ(1), d = buildSnackRack.depth;
    const g = buildSnackRack(w, "CANDY");
    g.rotation.y = Math.PI; g.position.set(cx, 0, cz - d / 2); scene.add(g);
    colliders.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d, z1: cz });
  }

  // hanging section signs — two back-to-back panels (not one double-sided
  // plane, which mirrors the text on the far side) so both faces read
  // correctly, hung from a pair of thin cables, lit by the room
  const westEnd = -CENTER.corridor - CENTER.westBays * BAY.len, eastEnd = CENTER.corridor + CENTER.eastBays * BAY.len;
  for (const [txt, x, z, w] of [
    ["KIDS", (KIDS.bandX[0] + KIDS.bandX[1]) / 2, KIDS.z0 - 0.4, 2.2],
    ["NEW RELEASES", (WALL_L + 0.1 + BAY.depth + westEnd) / 2, CENTER.z0 - 0.5, 2.3],
    ["NEW RELEASES", (STORE.x - 0.1 - BAY.depth + eastEnd) / 2, CENTER.z0 - 0.5, 2.3],
    ["CLASSICS", (westEnd - CENTER.corridor) / 2, CENTER.z0 + classicsFrom * bandStep - 0.5, 2.6],
    ["TV SHOWS", (eastEnd + CENTER.corridor) / 2, CENTER.z0 - 0.5, 2.6],
  ]) {
    hangers.push({ x0: x - w / 2, x1: x + w / 2, z0: z - 0.08, z1: z + 0.08, y0: 2.65, y1: 3.25, name: txt });
    const tex = textPlane(txt, w, 0.6).material.map;
    const signMat = new THREE.MeshLambertMaterial({ map: tex });
    const front = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.6), signMat);
    front.position.set(x, 2.95, z); front.rotation.y = Math.PI; scene.add(front); // faces the door
    const back = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.6), signMat);
    back.position.set(x, 2.95, z); scene.add(back);                              // faces into the store
    const cableLen = STORE.h - 3.25;
    for (const cx of [x - w * 0.38, x + w * 0.38]) {
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, cableLen), mat.dark);
      cable.position.set(cx, 3.25 + cableLen / 2, z); scene.add(cable);
    }
  }
  flushShelves();
  // some copies of the multi-copy titles are out on rental: hide a random
  // share (up to ~45%) off the END of each title's row, so the shelf still
  // reads as faced-up but clearly shopped. A returned one (returns bin →
  // putBack) just drops back into its own gap
  if (SAVE?.rented) for (const c of SAVE.rented.map(copyByKey).filter(Boolean)) { setOnShelf(c, false); rentedCopies.push(c); }   // same gaps as last visit
  else for (const t of catalog) {
    const n = 1 + (t.copies?.length || 0);
    if (n < 3) continue;
    const out = Math.floor(Math.random() * n * 0.45);
    t.copies.slice(t.copies.length - out).forEach(c => { setOnShelf(c, false); rentedCopies.push(c); });   // the POS checks each out to a member
  }
  window.__layout = { mvBays, wall: sweep.length, wallBays: Object.fromEntries(WALL_GENRES.map((g, i) => [g, bays[i]])), kidsBays, tvBays, classicsBays };
}

