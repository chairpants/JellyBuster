// ---------------- exterior (glimpsed through the storefront glass) ----------------
// Purely a backdrop — outside the walls the player can't reach, just what's
// visible through the doors and the storefront glass. Everything here lives
// on EXTERIOR_LAYER only, lit exclusively by the moonlight rig below — the
// interior's fluorescents/lamps/screens (all on the default layer) never
// touch it, and it never touches them, regardless of whether the store
// lights are on or off. It's always night out there, moonlit midnight blue.
const DAY_SKY = 0x4f8fd6, MOON_SKY = 0x0e1a38;
scene.background = new THREE.Color(DAY_SKY);   // matches the default lights-on (daytime) state at boot
{
  const ea = m => { m.layers.set(EXTERIOR_LAYER); scene.add(m); return m; };   // exterior-only add
  const eb = (w, h, d, m, x, y, z) => {                                       // exterior-only box (mirrors box(), above)
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z); return ea(b);
  };
  const x0 = WALL_L - 20, x1 = STORE.x + 20, w = x1 - x0, cx = (x0 + x1) / 2;   // well past the building on both sides
  const SIDEWALK = 1.8;                                  // right outside the doors, before the lot starts
  const driveTo = LOT.stalls, lotFar = LOT.curb, roadFar = LOT.roadFar,   // the drive two lanes wide (one each way), then the stalls, the curb, the road
    grassFar = -SIDEWALK - 28.6, treesNear = -SIDEWALK - 22.1, treesFar = -SIDEWALK - 30.1;   // (the road's lanes 3.3 m: the far side of it, out past them)
  const ground = (zNear, zFar, m) => {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(w, zNear - zFar), m);
    g.rotation.x = -Math.PI / 2; g.position.set(cx, 0, (zNear + zFar) / 2); ea(g);
  };
  { const cuts = SERVICE_ROAD.cuts, edges = [x0, ...cuts.flat(), x1];   // sidewalk right outside the doors, but for the service road's two cuts through it
    for (let i = 0; i < edges.length; i += 2) { const w2 = edges[i + 1] - edges[i], g = new THREE.Mesh(new THREE.PlaneGeometry(w2, SIDEWALK), mat.sidewalk); g.rotation.x = -Math.PI / 2; g.position.set(edges[i] + w2 / 2, 0, -SIDEWALK / 2); ea(g); }
    const y0 = 0.004, y1 = LOT.y + 0.003, tilt = Math.atan2(y0 - y1, SIDEWALK);   // the cuts: paved, down from the road's level to the lot's, a curb down each side
    for (const [a, b] of cuts) { const r = new THREE.Mesh(new THREE.PlaneGeometry(b - a, Math.hypot(SIDEWALK, y0 - y1)), mat.pavement); r.rotation.x = -Math.PI / 2 - tilt; r.position.set((a + b) / 2, (y0 + y1) / 2, -SIDEWALK / 2); ea(r);
      const lip = new THREE.Mesh(new THREE.PlaneGeometry(b - a, 0.1), mat.pavement); lip.rotation.x = -Math.PI / 2; lip.position.set((a + b) / 2, LOT.y + 0.004, -SIDEWALK - 0.03); ea(lip);
      for (const ex of [a - 0.075, b + 0.075]) eb(0.15, CURB_H, SIDEWALK, mat.curb, ex, CURB_Y, -SIDEWALK / 2); } }
  for (let x = x0 + 1; x < x1; x += 2) {                  // expansion joints
    if (SERVICE_ROAD.cuts.some(([a, b]) => x > a - 0.1 && x < b + 0.1)) continue;
    const joint = new THREE.Mesh(new THREE.PlaneGeometry(0.03, SIDEWALK), mat.sidewalkJoint);
    joint.rotation.x = -Math.PI / 2; joint.position.set(x, 0.002, -SIDEWALK / 2); ea(joint);
  }
  const lx0 = LOT.gates[0] - LOT.gateW / 2, lx1 = LOT.gates[1] + LOT.gateW / 2;   // the lot ends at each driveway's far edge (grass past it)
  { const pv = new THREE.Mesh(new THREE.PlaneGeometry(lx1 - lx0, -SIDEWALK - lotFar), mat.pavement); pv.rotation.x = -Math.PI / 2; pv.position.set((lx0 + lx1) / 2, LOT.y, (lotFar - SIDEWALK) / 2); ea(pv);   // small parking lot: the drive first (a lane each way), stalls at the back
    for (const [a, b] of [[x0, lx0], [lx1, x1]]) { const gr = new THREE.Mesh(new THREE.PlaneGeometry(b - a, -SIDEWALK - lotFar), mat.grass); gr.rotation.x = -Math.PI / 2; gr.position.set((a + b) / 2, 0, (lotFar - SIDEWALK) / 2); ea(gr); } }
  { const R = lotFar - LOT.roadNear, hw = LOT.gateW / 2, zc = (lotFar + LOT.roadNear) / 2;   // a strip of grass between the lot and the road (up at the walk's height), round the driveways
    const cuts = [x0, ...LOT.drives.flatMap(([a, b]) => [a - R, b + R]), x1];
    for (let i = 0; i < cuts.length; i += 2) { const gr = new THREE.Mesh(new THREE.PlaneGeometry(cuts[i + 1] - cuts[i], R), mat.grass); gr.rotation.x = -Math.PI / 2; gr.position.set((cuts[i] + cuts[i + 1]) / 2, 0, zc); ea(gr); }
    for (const [da, db] of LOT.drives) {              // the driveway, paved down at the lot's level; either side of its flares, a quarter of grass
      const d = new THREE.Mesh(new THREE.PlaneGeometry(db - da, R), mat.pavement); d.rotation.x = -Math.PI / 2; d.position.set((da + db) / 2, LOT.y + 0.003, zc); ea(d);
      for (const sd of [-1, 1]) { const cx2 = (sd < 0 ? da : db) + sd * R, sh = new THREE.Shape(); sh.moveTo(cx2, -lotFar); sh.absarc(cx2, -lotFar, R, Math.PI / 2, sd > 0 ? Math.PI : 0, sd < 0); sh.lineTo(cx2, -lotFar);
        const q = new THREE.Mesh(new THREE.ShapeGeometry(sh, 12), mat.grass); q.rotation.x = -Math.PI / 2; ea(q); }
    } }
  for (let x = x0 + 1.3; x < x1; x += 2.6) {              // painted stall lines, the full width of the lot (but not across the two driveways)
    if (LOT.gates.some(gx => Math.abs(x - gx) < LOT.gateW / 2) || x < lx0 || x > lx1) continue;
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.12, driveTo - lotFar - 0.4), mat.lineWhite);
    line.rotation.x = -Math.PI / 2; line.position.set(x, LOT.y + 0.002, (driveTo + lotFar) / 2); ea(line);
  }

  // the parked cars (see parkLot, below): mostly nosed in toward the road, so
  // the store looks at their tails
  const stallX = k => x0 + 2.6 * (k + 1);               // center of stall k, between the painted lines above
  const stallZ = (driveTo + lotFar) / 2;
  // Each car is a side-profile silhouette (hood, windshield, roof, rear
  // glass/deck, with real wheel-arch cutouts) extruded across its width with
  // a bevel for soft rounded edges, plus a glass greenhouse extruded a hair
  // wider so it reads as the window band. Built in a local frame where +x is
  // the nose and z is across the width, then turned so the nose faces the road.
  const carGlass = new THREE.MeshPhongMaterial({ color: 0x1b2533, specular: 0x8899aa, shininess: 90 });
  const carTire = new THREE.MeshLambertMaterial({ color: 0x141414 });
  const carTrim = new THREE.MeshLambertMaterial({ color: 0x232325 });
  const chrome = new THREE.MeshPhongMaterial({ color: 0xc8ccd2, specular: 0xffffff, shininess: 100 });
  const tailLampM = new THREE.MeshPhongMaterial({ color: 0x9a1616, specular: 0x552222, shininess: 60 });
  const headLampM = new THREE.MeshPhongMaterial({ color: 0xe8e4cc, specular: 0xffffff, shininess: 80 });
  const revLampM = new THREE.MeshPhongMaterial({ color: 0xdcdcd6, specular: 0xffffff, shininess: 80 });
  const litHead = new THREE.MeshBasicMaterial({ color: 0xfff4c8 }), litRev = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const dimTail = new THREE.MeshBasicMaterial({ color: 0x8c140e }), brakeTail = new THREE.MeshBasicMaterial({ color: 0xff3a24 });
  // the lamps: head (on at night), tail (0 off, 1 the dim running lights at night, 2 the brake lights), rev (in reverse).
  // Only what's set changes, and what's lit up bright glows (the bloom layer); the dim tail lights don't
  const LAMP_MAT = { head: [headLampM, litHead], tail: [tailLampM, dimTail, brakeTail], rev: [revLampM, litRev] };
  // ...and the light they throw on the ground at night: not real lights (every lit pixel in the store would pay for
  // each one, and switching them on and off rebuilds shaders), but light painted onto the pavement, additively, on a
  // plane under the car: the headlights' cones out ahead, a red wash behind on the brakes (a faint one from the
  // running lights), white behind in reverse. Anything standing on it still hides it (it's drawn depth-tested)
  const poolTex = (w, h, f) => {                   // f(u along, v across -1..1) -> 0..1
    const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"), img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const a = Math.max(0, Math.min(1, f((x + 0.5) / w, ((y + 0.5) / h) * 2 - 1))) * 255, i = (y * w + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = a; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const HEAD_POOL = { len: 11, w: 7 };             // out ahead of the bumper, and how wide the cones get
  const headTex = poolTex(256, 128, (u, v) => {    // two cones, one per lamp, spreading and fading with distance
    const d = u * HEAD_POOL.len, half = HEAD_POOL.w / 2;
    let a = 0;
    for (const lx of [-0.62, 0.62]) {              // each lamp's center, in meters across
      const c = lx * (1 + d * 0.08), spread = 0.35 + d * 0.27, x = v * half - c;
      a += (1 - sstep(spread * 0.55, spread, Math.abs(x)));
    }
    const near = sstep(0, 0.8, d), fall = 1 / (1 + (d / 4.5) ** 2), hot = 0.35 * Math.exp(-(((d - 3) / 2) ** 2));
    return Math.min(1, a) * near * (fall + hot) * (1 - sstep(0.85, 1, u));
  });
  const rearTex = poolTex(128, 128, (u, v) => {    // a wash spreading back from the bumper (u: 0 at it)
    const r = Math.hypot(u * 1.15, v * 0.75);
    return (1 - sstep(0.15, 1, r)) * sstep(0, 0.12, u);
  });
  const poolM = (map, color, opacity) => new THREE.MeshBasicMaterial({ map, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, fog: false });
  const POOL_MAT = { head: poolM(headTex, 0xffefc2, 0.75), brake: poolM(rearTex, 0xff1c0c, 0.85), tail: poolM(rearTex, 0xff1c0c, 0.18), rev: poolM(rearTex, 0xfff6ea, 0.6) };
  const lampSet = (g, { head = false, tail = 0, rev = false }) => {
    const dark = night(), key = `${+head}${tail}${+rev}${+dark}`; if (g.userData.lampKey === key) return; g.userData.lampKey = key;
    g.traverse(m => {
      const p = m.userData.pool;
      if (p === "head") m.visible = dark && head;
      else if (p === "rear") { m.visible = dark && tail > 0; m.material = tail === 2 ? POOL_MAT.brake : POOL_MAT.tail; }
      else if (p === "rev") m.visible = dark && rev;
      const k = m.userData.lamp; if (!k) return;
      const v = k === "head" ? +head : k === "tail" ? tail : +rev; m.material = LAMP_MAT[k][v];
      if (k === "tail" ? v === 2 : v) m.layers.enable(BLOOM_LAYER); else m.layers.disable(BLOOM_LAYER);
    });
  };
  const night = () => wasDay === false;
  const running = () => ({ head: night(), tail: night() ? 1 : 0 });   // just driving along
  const BEV = 0.04, BEVT = 0.06, YB = 0.25, ARCH = 0.5, TIRE = 0.33;
  const car = (x, z, yaw, s) => {
    const { L, W, color, noseY, hoodY, cowlX, wsTopX, roofY, rTopX, rBotX, rBotY, rearY, wheels } = s;
    const g = new THREE.Group(); g.position.set(x, LOT.y, z); g.rotation.y = Math.PI / 2 + yaw; scene.add(g); g.userData.car = s;   // (its shape: the golf ball hits it)
    const part = (geo, m, px, py, pz) => {
      const p = new THREE.Mesh(geo, m); p.position.set(px, py, pz); p.layers.set(EXTERIOR_LAYER); g.add(p); return p;
    };
    const paint = new THREE.MeshPhongMaterial({ color, specular: 0x444444, shininess: 55 });
    const extrude = (shape, depth, m, bevel) => {
      const geo = new THREE.ExtrudeGeometry(shape, bevel
        ? { depth, bevelEnabled: true, bevelSize: BEV, bevelThickness: BEVT, bevelSegments: 3, curveSegments: 12 }
        : { depth, bevelEnabled: false, curveSegments: 12 });
      geo.translate(0, 0, -depth / 2);
      return part(geo, m, 0, 0, 0);
    };

    // body silhouette: bottom edge rear→front with an arch over each wheel, then the top line front→rear
    const body = new THREE.Shape();
    body.moveTo(-L / 2, YB);
    for (const wx of wheels) { body.lineTo(wx - ARCH, YB); body.absarc(wx, YB, ARCH, Math.PI, 0, true); }
    body.lineTo(L / 2, YB);
    const top = [[L / 2 + 0.02, noseY], [L / 2 - 0.2, hoodY - 0.03], [cowlX, hoodY], [wsTopX, roofY], [rTopX, roofY], [rBotX, rBotY]];
    if (s.bedTop) top.push([-L / 2 + 0.05, s.bedTop], [-L / 2 - 0.02, s.bedTop - 0.06]);
    else {
      if (rBotX > -L / 2 + 0.2) top.push([-L / 2 + 0.15, rBotY - 0.02]);
      top.push([-L / 2 - 0.02, rearY]);
    }
    top.forEach(([px, py]) => body.lineTo(px, py));
    body.lineTo(-L / 2, YB);
    extrude(body, W - 2 * BEVT, paint, true);

    // greenhouse: follows the windshield and rear glass, pushed outward past the
    // body's bevel so it shows on the slopes, stopping just under the roof line
    const gTop = roofY - 0.07, out = 0.055;
    const along = (ax, ay, bx, by, y) => ax + (bx - ax) * (y - ay) / (by - ay);
    const shiftFor = (ax, ay, bx, by) => out * Math.hypot(bx - ax, by - ay) / Math.abs(by - ay);
    const fShift = shiftFor(cowlX, hoodY, wsTopX, roofY);
    const rShift = s.rearInset ?? -shiftFor(rTopX, roofY, rBotX, rBotY);
    const glass = new THREE.Shape();
    glass.moveTo(cowlX + fShift, hoodY);
    glass.lineTo(along(cowlX, hoodY, wsTopX, roofY, gTop) + fShift, gTop);
    glass.lineTo(along(rTopX, roofY, rBotX, rBotY, gTop) + rShift, gTop);
    glass.lineTo(rBotX + rShift, s.bedTop ? hoodY : rBotY);
    glass.lineTo(cowlX + fShift, hoodY);
    extrude(glass, W + 0.02, carGlass, false);
    for (const px of s.pillars || []) part(new THREE.BoxGeometry(0.09, gTop - hoodY + 0.02, W + 0.04), paint, px, (gTop + hoodY) / 2, 0);

    if (s.bedTop) {                                      // pickup cab: rounded rear window on the back of the cab, above the bed
      const rw = W - 0.4, y0 = s.bedTop + 0.14, y1 = roofY - 0.12, rh = y1 - y0, rr = 0.05;
      const pane = new THREE.Shape();
      pane.moveTo(-rw / 2 + rr, 0); pane.lineTo(rw / 2 - rr, 0); pane.quadraticCurveTo(rw / 2, 0, rw / 2, rr);
      pane.lineTo(rw / 2, rh - rr); pane.quadraticCurveTo(rw / 2, rh, rw / 2 - rr, rh);
      pane.lineTo(-rw / 2 + rr, rh); pane.quadraticCurveTo(-rw / 2, rh, -rw / 2, rh - rr);
      pane.lineTo(-rw / 2, rr); pane.quadraticCurveTo(-rw / 2, 0, -rw / 2 + rr, 0);
      const geo = new THREE.ExtrudeGeometry(pane, { depth: 0.02, bevelEnabled: false, curveSegments: 6 });
      geo.translate(0, -rh / 2, -0.01); geo.rotateY(Math.PI / 2);           // face it out the back of the cab (-x)
      const ym = (y0 + y1) / 2;
      const win = part(geo, carGlass, along(rTopX, roofY, rBotX, rBotY, ym) - BEV - 0.012, ym, 0);
      win.rotation.z = -Math.atan2(rTopX - rBotX, roofY - rBotY);            // match the cab back's slight lean
    }

    if (s.bedTop) part(new THREE.BoxGeometry((rBotX - 0.12) - (-L / 2 + 0.05), 0.012, W - 0.2), carTrim,     // bed opening
      (-L / 2 + 0.05 + rBotX - 0.12) / 2, s.bedTop + BEV + 0.006, 0);
    if (s.wood) part(new THREE.BoxGeometry(L - 0.9, 0.16, W + 0.03), s.wood, -0.1, 0.8, 0);             // wagon woodgrain side panel

    const trim = s.chromeBumpers ? chrome : carTrim;
    for (const ex of [-1, 1]) part(new THREE.BoxGeometry(0.12, 0.15, W + 0.04), trim, ex * (L / 2 + 0.08), 0.36, 0);   // bumpers
    part(new THREE.BoxGeometry(0.02, 0.14, W * 0.42), carTrim, L / 2 + 0.075, noseY - 0.15, 0);                       // grille
    const tailY = (s.bedTop ?? rearY) - 0.14;
    for (const sz of [-1, 1]) {
      part(new THREE.BoxGeometry(0.04, 0.11, 0.3), headLampM, L / 2 + 0.07, noseY - 0.1, sz * (W / 2 - 0.3)).userData.lamp = "head";
      part(new THREE.BoxGeometry(0.04, 0.12, 0.34), tailLampM, -L / 2 - 0.07, tailY, sz * (W / 2 - 0.26)).userData.lamp = "tail";
      part(new THREE.BoxGeometry(0.04, 0.08, 0.12), revLampM, -L / 2 - 0.07, tailY - 0.01, sz * (W / 2 - 0.51)).userData.lamp = "rev";   // reverse lamp, inboard of the tail light
      part(new THREE.BoxGeometry(0.12, 0.08, 0.1), paint, cowlX - 0.12, hoodY + 0.1, sz * (W / 2 + 0.05));            // mirrors
      for (const wx of wheels) {
        const tire = part(new THREE.CylinderGeometry(TIRE, TIRE, 0.24, 18), carTire, wx, TIRE, sz * (W / 2 - 0.13));
        tire.rotation.x = Math.PI / 2;
        const hub = part(new THREE.CylinderGeometry(0.19, 0.19, 0.25, 14), chrome, wx, TIRE, sz * (W / 2 - 0.13));
        hub.rotation.x = Math.PI / 2;
      }
    }
    const pool = (kind, len, w, x, mat) => {       // a light pool on the pavement (local +x = the nose)
      const geo = new THREE.PlaneGeometry(len, w); geo.rotateX(-Math.PI / 2); if (x < 0) geo.rotateY(Math.PI);   // (behind: u runs back from the bumper)
      const p = part(geo, mat, x, 0.02, 0); p.userData.pool = kind; p.visible = false; return p;   // (no renderOrder: sorted with the other see-through things, so it's drawn before the storefront glass, which writes depth)
    };
    pool("head", HEAD_POOL.len, HEAD_POOL.w, L / 2 + 0.1 + HEAD_POOL.len / 2, POOL_MAT.head);
    pool("rear", 3.4, W + 2.2, -(L / 2 + 0.1 + 3.4 / 2), POOL_MAT.tail);
    pool("rev", 2.6, W + 1.2, -(L / 2 + 0.1 + 2.6 / 2), POOL_MAT.rev);
    return g;
  };
  const STYLES = [
    {                                                   // sedan: long hood, fastback-ish rear glass, short trunk
      L: 4.1, W: 1.75, noseY: 0.72, hoodY: 0.92, cowlX: 0.75, wsTopX: 0.05, roofY: 1.38,
      rTopX: -0.85, rBotX: -1.35, rBotY: 0.98, rearY: 0.78, wheels: [-1.25, 1.25], pillars: [-0.35] },
    {                                                   // station wagon: roof runs to the tail, woodgrain sides
      L: 4.1, W: 1.72, noseY: 0.72, hoodY: 0.92, cowlX: 0.9, wsTopX: 0.25, roofY: 1.4,
      rTopX: -1.8, rBotX: -1.97, rBotY: 0.95, rearY: 0.9, wheels: [-1.28, 1.28], pillars: [-0.2, -1.05],
      wood: new THREE.MeshLambertMaterial({ color: 0x7a5230 }) },
    {                                                   // pickup: tall cab, open bed, chrome bumpers
      L: 4.1, W: 1.82, noseY: 0.82, hoodY: 1.0, cowlX: 0.95, wsTopX: 0.35, roofY: 1.55,
      rTopX: -0.5, rBotX: -0.53, rBotY: 1.02, bedTop: 1.02, rearInset: 0.1, wheels: [-1.3, 1.3], chromeBumpers: true },
    {                                                   // hatchback: short, the roof sloping straight down to the tail
      L: 3.8, W: 1.68, noseY: 0.7, hoodY: 0.9, cowlX: 0.7, wsTopX: 0.05, roofY: 1.36,
      rTopX: -1.2, rBotX: -1.82, rBotY: 0.95, rearY: 0.85, wheels: [-1.15, 1.15], pillars: [-0.5] },
    {                                                   // minivan: tall, the windshield well forward
      L: 4.5, W: 1.85, noseY: 0.8, hoodY: 1.05, cowlX: 1.35, wsTopX: 0.75, roofY: 1.8,
      rTopX: -2.05, rBotX: -2.2, rBotY: 1.1, rearY: 1.0, wheels: [-1.45, 1.4], pillars: [0.05, -1.0] },
    {                                                   // coupe: low and long in the hood
      L: 4.2, W: 1.75, noseY: 0.62, hoodY: 0.82, cowlX: 0.6, wsTopX: -0.2, roofY: 1.24,
      rTopX: -0.8, rBotX: -1.5, rBotY: 0.9, rearY: 0.78, wheels: [-1.3, 1.3], chromeBumpers: true },
  ];
  // mid-90s paint, weighted roughly like the lots of the day: white most of all, then that era's hunter
  // green and teal, burgundy, silver, black, navy, champagne, with the odd red, plum or dark gray
  const PAINT = [
    0xeceae2, 0xeceae2, 0xeceae2, 0xf2efe6,          // white / off-white
    0x1f4a36, 0x1f4a36, 0x16392b,                    // hunter / forest green
    0x2e7d7a, 0x2a8a86,                              // teal / aqua green
    0x6a1a26, 0x5a1520,                              // burgundy / maroon
    0xb8bcc2, 0xa4a8ae,                              // silver
    0x1c1c1f,                                        // black
    0x1f2f5a, 0x2a4373,                              // navy / medium blue
    0xcdb88e,                                        // champagne / light gold
    0xa31d1d,                                        // red
    0x4a2d55,                                        // plum
    0x4a4d52,                                        // charcoal
  ];
  // the lot: different every day (the same all day, reload or not): a few cars, more on a busy day, in any
  // stall but the ones the lamp poles stand in, mostly nosed in, now and then backed in, never quite straight
  let parked = [];
  parkLot = (day, busy) => {
    for (const g of parked) g.removeFromParent(); parked = [];
    let seed = 7919 * day + 13; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const free = [...Array(22).keys()].filter(k => !LOT.noPark.includes(k)), pick = a => a[Math.floor(rnd() * a.length)];   // (1, 20: the driveways; 0, 21: past them, grass now)
    for (let n = 2 + Math.floor(rnd() * 4) + (busy ? 2 : 0); n > 0 && free.length; n--) {
      const k = free.splice(Math.floor(rnd() * free.length), 1)[0], backIn = rnd() < 0.25;
      parked.push(car(stallX(k) + (rnd() - 0.5) * 0.3, stallZ + 0.15 + (rnd() - 0.5) * 0.4, (backIn ? Math.PI : 0) + (rnd() - 0.5) * 0.12, { ...pick(STYLES), color: pick(PAINT) }));
      parked.at(-1).userData.stall = k;
    }
  };
  // and one driving by on the road: the ambience's passing-car sound calls this, so you see what you hear.
  // Right-hand traffic: eastbound in the lane nearer the store
  const movers = [], ROAD_END = 110, laneZ = dir => LOT.road[dir];
  let carIds = 0, traffic = [];                       // (traffic: this frame's moving cars, for keeping them out of each other: see carAhead)
  const roadPass = (look, dir, v, then) => {
    let x0 = -dir * ROAD_END; while ([...movers.map(m => m.g), ...lotCars.map(c => c.g)].some(o => o && Math.abs(o.position.z - laneZ(dir)) < 1.5 && Math.abs(o.position.x - x0) < 8)) x0 -= dir * 8;   // (not on top of one already there)
    const g = car(x0, laneZ(dir), dir > 0 ? -Math.PI / 2 : Math.PI / 2, { ...STYLES[look.s], color: look.c }); lampSet(g, running());
    movers.push({ g, id: ++carIds, vx: dir * v, v0: dir * v, z0: laneZ(dir), end: dir * ROAD_END, then });
  };
  const alarms = new Set();
  carsOut = {                                        // for the golf ball: every car out there, what it's doing, and the scares it can get
    all: () => [...parked.map(g => ({ g })), ...lotCars.filter(c => c.g).map(c => ({ g: c.g, lot: c })), ...movers.map(m => ({ g: m.g, m }))],
    alarm: g => { g.userData.alarm = { t: 0 }; alarms.add(g); },
    swerve: (m, away) => { if (!m.sw && !m.crash) m.sw = { t: 0, T: 1.3, A: away * 1.1 }; },   // away: +1 toward the store, -1 away from it
    crash: m => { m.sw = null; m.crash = { st: "off", t: 0, z1: m.v0 > 0 ? LOT.roadNear + 0.6 : LOT.roadFar - 0.8 }; },   // to its right: the lot's curb, or the grass over the road
  };
  carNew = () => ({ s: Math.floor(Math.random() * STYLES.length), c: PAINT[Math.floor(Math.random() * PAINT.length)] });
  passCar = ({ dir, v }) => roadPass(carNew(), dir, v);
  // a customer's own car: along the road, slowing, and in at the driveway on its side of the lot (east-bound at the west
  // end, west-bound at the east), round into its lane of the drive, up to the stall and nosed in. Leaving, it backs
  // out into the lane for the way it's going, drives to the driveway ahead and out onto the road. The curves are
  // splines the car's driven along at a speed (its nose along the curve, its tail along it backing out)
  const PARK_Z = stallZ + 0.15, lotCars = [];
  const bez = (a, b, c, t) => [(1 - t) ** 2 * a[0] + 2 * t * (1 - t) * b[0] + t * t * c[0], (1 - t) ** 2 * a[1] + 2 * t * (1 - t) * b[1] + t * t * c[1]];
  const spline = pts => new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, "centripetal");
  const gateFor = d => { const [a, b] = LOT.drives[d > 0 ? 0 : 1]; return (a + b) / 2; };   // in: the near end for the way you're coming; out: the far end for the way you're going
  const inPath = (d, E, back = 0) => { const L = LOT.road[d], A = LOT.lane[d];   // from the road, through the driveway, into its lane (back: start that much further off)
    return spline([[E - d * (90 + back), L], [E - d * 34, L], [E - d * 7, L], [E - d * 1.6, L + 0.7], [E, LOT.roadNear], [E, lotFar], [E + d * 0.8, (lotFar + A) / 2], [E + d * 3.2, A - 0.2 * Math.sign(A + 4.8)], [E + d * 7, A]]); };
  const outPath = (e, X, x0) => { const L = LOT.road[e], A = LOT.lane[e];   // from its lane, out the driveway, onto the road and away
    return spline([[x0, A], [X - e * 3.5, A], [X - e * 0.8, (lotFar + A) / 2], [X, lotFar], [X, LOT.roadNear], [X + e * 1.6, L + 0.7], [X + e * 7, L], [X + e * 36, L], [X + e * 90, L]]); };
  driveIn = (look, onParked, near) => {            // -> the car (where to get out: car.door), or null: no free stall. near: an x to park close to (next door's customers)
    const taken = new Set([...parked.map(g => g.userData.stall), ...lotCars.map(c => c.stall)]);
    let free = [...Array(22).keys()].filter(k => !LOT.noPark.includes(k) && !taken.has(k)); if (!free.length) return null;
    if (near != null) { free.sort((a, b) => Math.abs(stallX(a) - near) - Math.abs(stallX(b) - near)); free = free.slice(0, 3); }
    const k = free[Math.floor(Math.random() * free.length)], sx = stallX(k), ways = [1, -1].filter(d => (sx - gateFor(d)) * d >= 10);   // (a stall right by a driveway: from the other end)
    const dir = ways[Math.floor(Math.random() * ways.length)];   // which way it's coming along the road (and up the drive)
    const c = { id: ++carIds, look, stall: k, sx, dir, phase: "approach", t: 0, u: 0, g: null, onParked, door: { x: sx - 1.2, z: PARK_Z } };   // the driver's side: west, nosed in toward the road
    let back = 0; const sx0 = gateFor(dir) - dir * 90;   // (somebody already starting out there: further back)
    while ([...movers.map(m => m.g), ...lotCars.map(o => o.g)].some(o => o && Math.abs(o.position.z - LOT.road[dir]) < 1.5 && Math.abs(o.position.x - (sx0 - dir * back)) < 9)) back += 9;
    c.path = inPath(dir, gateFor(dir), back); c.len = c.path.getLength();
    const p0 = c.path.getPointAt(0); c.g = car(p0.x, p0.z, 0, { ...STYLES[look.s], color: look.c });
    lotCars.push(c);
    window.StoreAmbience?.drive?.(dir, 13);
    return c;
  };
  driveOut = c => {                                 // in and gone (or never got parked: just gone)
    if (c.phase !== "parked") { c.g?.removeFromParent(); lotCars.splice(lotCars.indexOf(c), 1); c.phase = "gone"; return; }
    c.phase = "startUp"; c.t = 0; c.e = Math.random() < 0.5 ? 1 : -1;   // started up, foot on the brake, into reverse; then whichever way they're headed
  };
  // keeping out of each other: a moving car with another moving car just ahead of it (in its path, close for its speed)
  // waits. Two that'd each wait on the other: the one that came first goes. Parked cars don't count (they stay put)
  const LOT_MOVING = new Set(["approach", "aisle", "turnIn", "backOut", "shift", "leave"]);   // (shift: stopped in the lane after backing out, still in the way)
  const fwdOf = (g, back) => { const ry = g.rotation.y, k = back ? -1 : 1; return [Math.cos(ry) * k, -Math.sin(ry) * k]; };
  const sees = (a, b, reach) => { const [fx, fz] = fwdOf(a.g, a.back), dx = b.g.position.x - a.g.position.x, dz = b.g.position.z - a.g.position.z, al = dx * fx + dz * fz;
    return al > 0.5 && al < reach && Math.abs(dx * fz - dz * fx) < 1.7; };
  const carAhead = (g, speed) => {
    const me = traffic.find(t => t.g === g); if (!me) return false;
    const reach = Math.max(7.5, 4 + Math.abs(speed) * 0.85);
    return traffic.some(o => o !== me && ((sees(me, o, reach) && !(sees(o, me, 12) && me.id < o.id))
      || (me.id > o.id && Math.hypot(o.g.position.x - g.position.x, o.g.position.z - g.position.z) < 1.8)));   // (right on top of each other, as can happen starting out: the newer one waits)
  };
  const along = (c, v, dt, back) => {               // drive c along its path at v m/s -> true at the end
    if (carAhead(c.g, v)) { lampSet(c.g, { head: night(), tail: 2 }); return false; }   // (waiting on the car ahead: on the brake)
    c.u = Math.min(1, c.u + v * dt / c.len); const p = c.path.getPointAt(c.u); steer(c, p.x, p.z, back); return c.u >= 1;
  };
  const steer = (c, x, z, back) => {                // put it at x/z, pointing the way it's going (backwards: the other way)
    const p = c.g.position, dx = x - p.x, dz = z - p.z;
    if (dx * dx + dz * dz > 1e-8) c.g.rotation.y = back ? Math.atan2(dz, -dx) : Math.atan2(-dz, dx);   // (the nose is the car's local +x)
    p.x = x; p.z = z;
  };
  // the lamps follow the driving: brakes on slowing for the turn in and held a moment once it's stopped, then all
  // off; leaving, started up on the brake and into reverse (the reverse lamps), braking to a stop at the end of
  // backing out, then into drive and away. Headlights and the dim tail lights whenever it's moving at night
  const lotTick = dt => {
    for (const g of movers) if (g.crash?.st !== "sat") lampSet(g.g, running());   // (night can fall while one's going by)
    for (const g of alarms) {                         // a car alarm going: the lights flashing with it
      const a = g.userData.alarm; a.t += dt; const on = Math.floor(a.t * 2.5) % 2 === 0;
      lampSet(g, a.t < 10 ? { head: on, tail: on ? 2 : 0 } : {}); if (a.t >= 10) alarms.delete(g);
    }
    for (const c of lotCars) if (c.phase === "parked" && c.idling) lampSet(c.g, running());
    for (const c of [...lotCars]) {
      const A = LOT.lane[c.dir];
      if (c.phase === "approach") {                  // along the road and round in at the driveway: road speed, slowing for the turn
        const u = 1 - (1 - c.u) * c.len / (c.len - 56);   // (how far along the last stretch: the 56 m before it is just coming up the road from out of sight)
        const v = u < 0.55 ? 11 : u < 0.75 ? 11 - (u - 0.55) / 0.2 * 6.5 : 4.5;
        lampSet(c.g, { ...running(), tail: u > 0.5 && u < 0.78 ? 2 : running().tail });
        if (along(c, v, dt)) c.phase = "aisle";
      } else if (c.phase === "aisle") {               // up its lane toward the stall, the turn in starts 3 m short of it
        if (carAhead(c.g, 5)) { lampSet(c.g, { head: night(), tail: 2 }); continue; }
        const x = c.g.position.x + c.dir * 5 * dt, left = (c.sx - c.dir * 3 - x) * c.dir;
        lampSet(c.g, { ...running(), tail: left < 2.5 ? 2 : running().tail });   // slowing for it
        if (left <= 0) { c.phase = "turnIn"; c.t = 0; } else steer(c, x, A);
      } else if (c.phase === "turnIn") {
        if (carAhead(c.g, 3)) continue;
        c.t = Math.min(1, c.t + dt / 2.0); const [x, z] = bez([c.sx - c.dir * 3, A], [c.sx, A], [c.sx, PARK_Z], 1 - (1 - c.t) ** 2); steer(c, x, z);
        lampSet(c.g, { head: night(), tail: 2 });
        if (c.t >= 1) { c.phase = "stopped"; c.t = 0; }
      } else if (c.phase === "stopped") {            // in the stall, foot still on the brake; then into park and off
        if ((c.t += dt) >= 0.9) { c.phase = "parked"; lampSet(c.g, c.idling ? running() : {}); c.onParked?.(c); }   // (idling: somebody waits in it, engine running, lights on)
      } else if (c.phase === "startUp") {            // started, on the brake; into reverse
        c.t += dt; lampSet(c.g, { head: night(), tail: 2, rev: c.t > 0.6 });
        if (c.t >= 1.2) { c.phase = "backOut"; c.t = 0; }
      } else if (c.phase === "backOut") {            // back out into the lane for the way it's going, tail swinging away from it
        if (carAhead(c.g, 3)) continue;
        const E = LOT.lane[c.e];
        c.t = Math.min(1, c.t + dt / 2.4); const [x, z] = bez([c.sx, PARK_Z], [c.sx, E], [c.sx - c.e * 2.8, E], c.t * c.t * (3 - 2 * c.t)); steer(c, x, z, true);
        lampSet(c.g, { head: night(), tail: c.t > 0.7 ? 2 : running().tail, rev: true });   // (easing to a stop at the end: on the brake)
        if (c.t >= 1) { c.phase = "shift"; c.t = 0; }
      } else if (c.phase === "shift") {              // stopped in the lane, on the brake, out of reverse and into drive
        c.t += dt; lampSet(c.g, { head: night(), tail: 2, rev: c.t < 0.35 });
        if (c.t >= 0.6) { c.phase = "leave"; c.path = outPath(c.e, gateFor(-c.e), c.g.position.x); c.len = c.path.getLength(); c.u = 0; }
      } else if (c.phase === "leave") {               // down the lane, out the driveway and off along the road
        const X = gateFor(-c.e), L = LOT.road[c.e];       // (at the curb: a gap in the traffic coming along its lane first)
        const u = c.u * c.len / (c.len - 54);            // (as it was before the road ran on out of sight: the last 54 m is just driving away)
        if (u > 0.3 && u < 0.55 && movers.some(m => Math.abs(m.g.position.z - L) < 1.5 && (X - m.g.position.x) * c.e > -3 && (X - m.g.position.x) * c.e < 22)) { lampSet(c.g, { head: night(), tail: 2 }); continue; }
        lampSet(c.g, { ...running(), tail: u > 0.15 && u < 0.3 ? 2 : running().tail });
        if (along(c, u < 0.4 ? 5 : 11, dt)) { c.g.removeFromParent(); lotCars.splice(lotCars.indexOf(c), 1); c.phase = "gone"; }
      }
    }
  };

  eb(LOT.drives[1][0] - LOT.drives[0][1], CURB_H, 0.15, mat.curb, (LOT.drives[0][1] + LOT.drives[1][0]) / 2, CURB_Y, lotFar);   // the curb along the road side, between the driveways
  // the lot's ends and its edge along the walk curbed too, its corners at the walk rounded off (grass in the corner, the curb round it)
  { const Rs = 1.5, zw = -SIDEWALK;
    for (const [ex, sd] of [[lx0, 1], [lx1, -1]]) {
      eb(0.15, CURB_H, (zw - Rs) - lotFar, mat.curb, ex - sd * 0.075, CURB_Y, (lotFar + zw - Rs) / 2);       // down the end of the lot (just outside its edge, like the curves)
      const cx2 = ex + sd * Rs, cy2 = -zw + Rs, sh = new THREE.Shape();                                  // (shape space: x, and -z)
      sh.moveTo(ex, -zw); sh.lineTo(cx2, -zw); sh.absarc(cx2, cy2, Rs, -Math.PI / 2, sd > 0 ? -Math.PI : 0, sd > 0); sh.lineTo(ex, -zw);
      const f = new THREE.Mesh(new THREE.ShapeGeometry(sh, 12), mat.grass); f.rotation.x = -Math.PI / 2; f.position.y = 0.006; ea(f);
      for (let i = 0; i < 8; i++) {
        const a0 = -Math.PI / 2 - sd * (i + 0.5) / 8 * Math.PI / 2, x = cx2 + Math.cos(a0) * (Rs + 0.075), z = -(cy2 + Math.sin(a0) * (Rs + 0.075));
        const c = eb(Rs * Math.PI / 2 / 8 + 0.02, CURB_H, 0.15, mat.curb, x, CURB_Y, z); c.rotation.y = a0 + Math.PI / 2;
      }
    }
    { const e = [lx0 + Rs, ...SERVICE_ROAD.cuts.flat(), lx1 - Rs]; for (let i = 0; i < e.length; i += 2) eb(e[i + 1] - e[i], CURB_H, 0.15, mat.curb, (e[i] + e[i + 1]) / 2, CURB_Y, zw + 0.075); }   // along the walk (on the walk's edge, meeting the corners' curves; open at the service road)
  }
  // where each driveway meets the road: a quarter-circle flare either side, the curb curving round it out to the road
  { const R = lotFar - LOT.roadNear;
    for (const [da, db] of LOT.drives) for (const sd of [-1, 1]) {
      const ex = sd < 0 ? da : db, cx2 = ex + sd * R, sh = new THREE.Shape();   // (shape space: x, and -z)
      sh.moveTo(ex, -LOT.roadNear); sh.lineTo(cx2, -LOT.roadNear); sh.absarc(cx2, -lotFar, R, Math.PI / 2, sd > 0 ? Math.PI : 0, sd < 0); sh.lineTo(ex, -LOT.roadNear);
      const f = new THREE.Mesh(new THREE.ShapeGeometry(sh, 12), mat.pavement); f.rotation.x = -Math.PI / 2; f.position.y = LOT.y + 0.004; ea(f);
      for (let i = 0; i < 8; i++) {                   // the curb along the curve, in short straight pieces
        const a0 = Math.PI / 2 + sd * (i + 0.5) / 8 * Math.PI / 2, x = cx2 + Math.cos(a0) * (R - 0.075), z = lotFar - Math.sin(a0) * (R - 0.075);   // (on the grass side of the curve)
        const c = eb(R * Math.PI / 2 / 8 + 0.02, CURB_H, 0.15, mat.curb, x, CURB_Y, z); c.rotation.y = a0 + Math.PI / 2;
      }
    } }
  const ROAD_X = 250;                                     // the road behind the lot, out both ways past where the eye (and the fog) gives out
  { const r = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_X * 2, LOT.roadNear - roadFar), mat.road); r.rotation.x = -Math.PI / 2; r.position.set(0, LOT.y, (LOT.roadNear + roadFar) / 2); ea(r);
    const R = lotFar - LOT.roadNear, hw = LOT.gateW / 2, cuts = [-ROAD_X, ...LOT.drives.flatMap(([a, b]) => [a - R, b + R]), ROAD_X];   // curbs along both edges of the road (not across the driveways)
    for (let i = 0; i < cuts.length; i += 2) eb(cuts[i + 1] - cuts[i], CURB_H, 0.15, mat.curb, (cuts[i] + cuts[i + 1]) / 2, CURB_Y, LOT.roadNear + 0.075);
    eb(ROAD_X * 2, CURB_H, 0.15, mat.curb, 0, CURB_Y, roadFar - 0.075); }
  { const n = Math.floor(ROAD_X * 2 / 1.7), dg = new THREE.PlaneGeometry(0.9, 0.12); dg.rotateX(-Math.PI / 2);   // dashed centerline
    const dash = new THREE.InstancedMesh(dg, mat.lineYellow, n), m4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) dash.setMatrixAt(i, m4.makeTranslation(-ROAD_X + 0.8 + i * 1.7, LOT.y + 0.002, (LOT.roadNear + roadFar) / 2));
    dash.frustumCulled = false; ea(dash); }
  ground(roadFar, grassFar, mat.grass);                  // a much deeper stretch of grass on the far side
  { const g = new THREE.Mesh(new THREE.PlaneGeometry(EDGE.SEE * 2, 1.2), mat.sidewalk); g.rotation.x = -Math.PI / 2; g.position.set(0, 0.004, roadFar - 0.75); ea(g);   // the public walk along the far side, past the park and on with the road
    const jg = new THREE.PlaneGeometry(0.025, 1.2); jg.rotateX(-Math.PI / 2); const joints = new THREE.InstancedMesh(jg, mat.dark, Math.floor(EDGE.SEE)), m4 = new THREE.Matrix4();
    for (let i = 0; i < joints.count; i++) joints.setMatrixAt(i, m4.makeTranslation(x0 + 1 + 2 * (i - Math.floor(EDGE.SEE / 2) + 13), 0.006, roadFar - 0.75)); joints.frustumCulled = false; ea(joints); }   // (the joints every 2 m, in step with the store's walk: the slabs' shading goes by the same joints)
  const benchZ = roadFar - 2.2;                          // the park's bench by the walk, just past the road (built with the park: exterior/playground.js); its lamp's below

  // night lighting — these only come on when setExteriorDay flips to night.
  // Each entry remembers its "on" value; lenses also join the bloom layer so
  // they glow, but stay dark (and don't bloom) by day.
  const nightLights = [], nightGlows = [];
  const ecyl = (rt, rb, h, m, x, y, z, seg = 12) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); c.position.set(x, y, z); return ea(c);
  };
  const glowMat = (color, emissive, on) => {
    const m = new THREE.MeshLambertMaterial({ color, emissive, emissiveIntensity: 0 }); m.userData.on = on; nightGlows.push(m); return m;
  };
  const nightLight = (l, on) => { l.intensity = 0; l.userData.on = on; l.layers.set(EXTERIOR_LAYER); scene.add(l); nightLights.push(l); return l; };

  // parking-lot street lights: cobra-head fixtures on tall poles at the head
  // of the stalls, arms reaching out over the cars, sodium orange pooling
  // straight down. Every 5 stalls (13m), each standing in an empty stall —
  // stall 4 sits right between the sedan and the wagon, so both get lit.
  const poleMat = new THREE.MeshPhongMaterial({ color: 0x3b3f45, specular: 0x222222, shininess: 30 });
  // They don't snap on at dusk: each strikes a moment after night falls
  // (staggered) and warms up like a real sodium lamp — a dim red-orange glow
  // building to full orange over a few seconds. See exteriorTick below.
  const sodium = [];                     // { lens, spot, delay }
  const streetLamp = (x, z) => {
    const sodiumLens = new THREE.MeshLambertMaterial({ color: 0x3a2e1c, emissive: 0xffae4a, emissiveIntensity: 0 });   // its own, so each warms up on its own clock
    const armLen = 2.2, hy = 6.0, hz = z + armLen + 0.25;
    ecyl(0.26, 0.3, 0.5, mat.sidewalk, x, 0.25, z, 14);                     // concrete footing
    ecyl(0.06, 0.08, 5.6, poleMat, x, 0.5 + 2.8, z, 10);                    // pole
    eb(0.08, 0.08, armLen, poleMat, x, hy, z + armLen / 2);                 // arm out over the stalls
    eb(0.46, 0.16, 0.8, poleMat, x, hy - 0.02, hz);                         // head housing
    eb(0.36, 0.02, 0.62, sodiumLens, x, hy - 0.11, hz).layers.enable(BLOOM_LAYER);
    const spot = new THREE.SpotLight(0xffae4a, 0, 18, 0.72, 0.55, 1.5);   // tall pole: needs a lot of candela (72 at full) to read on dark asphalt
    spot.layers.set(EXTERIOR_LAYER); scene.add(spot);
    spot.position.set(x, hy - 0.15, hz);
    spot.target.position.set(x, 0, hz); scene.add(spot.target);
    sodium.push({ lens: sodiumLens, spot, delay: 0 });
  };
  for (const x of LOT.lampX) streetLamp(x, (lotFar + LOT.roadNear) / 2);   // out on the grass strip (see LOT.lampX)

  // security lights round the sides and backs of both buildings: bronze wall packs, a hood over a prismatic refractor angled down, each throwing a
  // fan of sodium out and down off its wall (aimed off it, so none of it comes in through the wall). They strike and warm up with the lot's.
  // x, y, z: on the wall's face; nx, nz: out from it; reach: how far out the middle of the pool lands
  const packM = new THREE.MeshPhongMaterial({ color: 0x3b3226, specular: 0x222222, shininess: 20 });
  const wallPack = (x, y, z, nx, nz, reach = 6) => {
    const lens = new THREE.MeshLambertMaterial({ color: 0x3a2e1c, emissive: 0xffae4a, emissiveIntensity: 0 }), g = new THREE.Group();
    g.position.set(x, y, z); g.rotation.y = Math.atan2(nx, nz);                 // (its +z: out from the wall)
    const part = (w, h, d, m, px, py, pz, rx = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(px, py, pz); o.rotation.x = rx; o.layers.set(EXTERIOR_LAYER); g.add(o); return o; };
    part(0.36, 0.32, 0.05, packM, 0, 0, 0.025);                                  // the back box, on the wall
    part(0.34, 0.1, 0.24, packM, 0, 0.1, 0.15, -0.12);                           // the hood
    for (const sx of [-0.16, 0.16]) part(0.02, 0.24, 0.2, packM, sx, -0.02, 0.13);
    part(0.3, 0.2, 0.02, lens, 0, -0.03, 0.235, -0.45).layers.enable(BLOOM_LAYER);   // the refractor, tipped down
    part(0.32, 0.03, 0.12, lens, 0, -0.13, 0.15).layers.enable(BLOOM_LAYER);
    scene.add(g);
    const spot = new THREE.SpotLight(0xffae4a, 0, 17, 1.05, 0.6, 1.5); spot.layers.set(EXTERIOR_LAYER);
    spot.position.set(x + nx * 0.3, y - 0.12, z + nz * 0.3); spot.target.position.set(x + nx * reach, 0, z + nz * reach); scene.add(spot, spot.target);
    sodium.push({ lens, spot, delay: 0, full: 60, glow: 2.2, warm: 45 });   // (slower than the lot's: a dim red for a while, creeping up to full over most of a minute)
  };
  wallPack(9.5, 3.3, 35.1, 0, 1);            // the store's back wall, over the hammerhead and the back ladder
  wallPack(11.1, 2.95, 26.85, 1, 0, 5);      // the store's east wall, over the emergency exit and the dumpster
  wallPack(-7.84, 3.3, 16, -1, 0);           // the store's west wall, down the west lane
  wallPack(-7.84, 3.6, 43.2, -1, 0, 5);      // the theater's west wall, by the fire exit's stairwell
  wallPack(-5.4, 4.6, 48.6, 0, 1, 4);        // the theater's back wall, out over the service road (clear of the downspout at -3: SCUPPERS)
  wallPack(21, 3.3, 8, 1, 0);                // Tony's east wall, down the east lane

  // ornamental park lamp beside the bench: black wrought iron, stepped
  // octagonal base, slim shaft with a collar, flared lantern with a pyramid
  // cap and finial — softer and warmer than the sodium lot lights
  const iron = new THREE.MeshPhongMaterial({ color: 0x121212, specular: 0x333333, shininess: 40 });
  const lanternGlass = glowMat(0x4a3a1c, 0xffcf7a, 1.3);
  const parkLamp = (px, pz) => {
    ecyl(0.2, 0.24, 0.12, iron, px, 0.06, pz, 8);                           // plinth
    ecyl(0.12, 0.16, 0.4, iron, px, 0.32, pz, 8);                           // tapered base
    ecyl(0.14, 0.14, 0.04, iron, px, 0.54, pz, 12);                         // collar
    ecyl(0.045, 0.06, 2.3, iron, px, 1.7, pz, 10);                          // shaft
    ecyl(0.08, 0.08, 0.05, iron, px, 1.4, pz, 12);                          // decorative ring
    ecyl(0.09, 0.05, 0.14, iron, px, 2.92, pz, 8);                          // lantern cradle
    const glass = ecyl(0.17, 0.12, 0.38, lanternGlass, px, 3.18, pz, 4);    // flared four-sided lantern
    glass.rotation.y = Math.PI / 4; glass.layers.enable(BLOOM_LAYER);
    const cap = ea(new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.2, 4), iron));
    cap.position.set(px, 3.47, pz); cap.rotation.y = Math.PI / 4;
    const finial = ea(new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), iron)); finial.position.set(px, 3.6, pz);
    nightLight(new THREE.PointLight(0xffcf7a, 0, 10, 1.5), 14).position.set(px, 3.15, pz);
  };
  parkLamp(1.2, benchZ);
  // and more of them in the park itself, for after dark: each well clear of the rocket, the merry-go-round, the seesaw and
  // the swings' arc (exterior/playground.js), and of the paths between them. A post you can't walk through
  for (const [px, pz] of [[-7.5, -27.5], [9, -25], [5.5, -37.5], [15.5, -36.5]]) { parkLamp(px, pz); colliders.push({ x0: px - 0.22, x1: px + 0.22, z0: pz - 0.22, z1: pz + 0.22 }); }

  // the trees: a layered pine (stacked tapering cones) and a round broadleaf (lumpy icosahedra), the treeline
  // across the road and now groves and a treeline all round, swaying, and the broadleaf ones through the seasons (trees.js)
  StoreTrees.build({ scene, layer: EXTERIOR_LAYER, rows: [], x0, x1, avoid: ROOF.rects,
    road: [LOT.roadFar, LOT.curb], lotY: LOT.y, lot: [LOT.gates[0] - LOT.gateW / 2 - 6, LOT.gates[1] + LOT.gateW / 2 + 6, LOT.curb] });

  // fills any gaps above/between the trees. Unlit and exempt from fog: the
  // scene background itself is never fogged, so a fogged plane read as a
  // slightly different blue and its corners showed against the open sky
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(w + 40, 26),
    new THREE.MeshBasicMaterial({ color: DAY_SKY, fog: false }));
  backdrop.position.set(cx, 10, treesFar - 3); ea(backdrop);

  // day/night rig — its own layer, so it's the only thing illuminating the
  // above, and never touches (or is touched by) the interior's fluorescents.
  // Warm sun by day, cool pale-blue moon by night; the time of day (L) picks
  // which one's live, in sync with the store's own lights toggle.
  // (three.js doesn't limit lights by layer, so real sun/moon lights used to
  // light the inside of the store too; the room shader does them instead,
  // outside the building only — the interior gets daylight through the glass)
  const lin = (hex, k) => new THREE.Color(hex).multiplyScalar(k);
  TVU.uSunSky.value.copy(lin(0xaed4f5, 0.75)); TVU.uSunGround.value.copy(lin(0x4c6a3c, 0.75)); TVU.uSunC.value.copy(lin(0xfff3d9, 0.95)); TVU.uSunDir.value.set(12, 30, -8).normalize();
  TVU.uMoonSky.value.copy(lin(0x2c3d68, 0.55)); TVU.uMoonGround.value.copy(lin(0x05070f, 0.55)); TVU.uMoonC.value.copy(lin(0xaec2e8, 0.5)); TVU.uMoonDir.value.set(-14, 26, -10).normalize();
  setSky = c => { scene.background.copy(c); }; backdrop.visible = false;   // (the sky dome, wxSky, is the sky now)
  let wasDay = null;
  setExteriorDay = isDay => {
    if (isDay === wasDay) return; wasDay = isDay;
    for (const l of nightLights) l.intensity = isDay ? 0 : l.userData.on;         // park lamp: night only, straight on
    for (const m of nightGlows) m.emissiveIntensity = isDay ? 0 : m.userData.on;
    for (const s of sodium) { s.spot.intensity = 0; s.lens.emissiveIntensity = 0; s.delay = 1.2 + Math.random() * 1.3; }   // lot lights: off, then warm up
    sodiumT = isDay ? null : 0;
  };
  let sodiumT = null;                          // seconds since night fell while the lot lights warm up; null = settled
  const SODIUM_WARM = 5, cold = new THREE.Color(0xff4d1a), warm = new THREE.Color(0xffae4a);
  exteriorTick = dt => {
    traffic = [...movers.filter(m => m.crash?.st !== "sat").map(m => ({ g: m.g, id: m.id, back: false })),
      ...lotCars.filter(c => c.g && LOT_MOVING.has(c.phase)).map(c => ({ g: c.g, id: c.id, back: c.phase === "backOut" }))];
    for (let i = movers.length - 1; i >= 0; i--) {   // the cars going by
      const m = movers[i], p = m.g.position, dir = Math.sign(m.v0);
      let vz = 0;
      if (!m.crash && !m.sw) m.vx = carAhead(m.g, m.vx) ? dir * Math.max(0, Math.abs(m.vx) - 12 * dt) : dir * Math.min(Math.abs(m.v0), Math.abs(m.vx) + 5 * dt);   // (slowing behind somebody, back up to speed after)
      if (m.crash) {                                 // off the road: braking hard onto the shoulder, sat there on its hazards, then away again
        const c = m.crash; c.t += dt;
        if (c.st === "off") {
          m.vx = dir * Math.max(0, Math.abs(m.vx) - 9 * dt); vz = (c.z1 - p.z) * 2.2;
          if (Math.abs(m.vx) < 0.05) { m.vx = 0; c.st = "sat"; c.t = 0; m.g.rotation.z = dir * 0.025; }   // (up on the curb, or nose down in the grass)
        } else if (c.st === "sat") {
          const on = Math.floor(c.t * 1.6) % 2 === 0; lampSet(m.g, { head: night(), tail: on ? 2 : 0 });   // the hazards
          if (c.t > 22) { c.st = "back"; m.g.rotation.z = 0; }
        } else {
          m.vx = dir * Math.min(Math.abs(m.v0), Math.abs(m.vx) + 2.5 * dt); vz = (m.z0 - p.z) * 1.2;
          if (Math.abs(p.z - m.z0) < 0.03 && m.vx === m.v0) { p.z = m.z0; m.crash = null; }
        }
      } else if (m.sw) {                             // a swerve: out round it and back into the lane
        const s = m.sw, k = (s.t += dt) / s.T;
        if (k >= 1) { p.z = m.z0; m.sw = null; } else vz = s.A * Math.PI / s.T * Math.cos(Math.PI * k);
      }
      p.x += m.vx * dt; p.z += vz * dt;
      if (m.vx || vz) m.g.rotation.y = Math.atan2(-vz, m.vx || dir * 0.01);   // (pointing the way it's going)
      if ((p.x - m.end) * dir > 0) { m.g.removeFromParent(); movers.splice(i, 1); m.then?.(); }
    }
    lotTick(dt);
    if (sodiumT === null) return;
    sodiumT += dt;
    let done = true;
    for (const s of sodium) {
      const k = Math.min(1, Math.max(0, (sodiumT - s.delay) / (s.warm ?? SODIUM_WARM)));
      if (k < 1) done = false;
      if (k <= 0) continue;                    // not struck yet
      const strike = k < 0.06 && Math.random() < 0.35 ? 0.3 : 1;   // a little sputter as it strikes
      s.spot.intensity = (s.full ?? 72) * k * k * strike;  // slow start, then climbs to full
      s.lens.emissiveIntensity = (s.glow ?? 1.6) * (0.12 + 0.88 * k) * strike;
      s.spot.color.copy(cold).lerp(warm, k); s.lens.emissive.copy(cold).lerp(warm, k);
    }
    if (done) sodiumT = null;
  };
  setExteriorDay(true);          // matches lightsOut's default (false) — moon/moonFill start off, not double-lit with the sun
}

