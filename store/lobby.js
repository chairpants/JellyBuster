// ---------------- lobby + back wall dressing ----------------
let cashDrawer = null, drawerOpen = 0;          // the register's till; drawerOpen eases 0..1 (see the main loop)
let returnSlotMesh;                          // the E target for the returns counter, set below
let refreshReturnsBin = () => {};            // redraws the tapes sitting in the returns counter — set with the counter below
let flapPivot, flapGate, flapCollider, flapOpenA = Math.PI / 2 * 0.97;   // flapOpenA: how far the leaf lifts (worked out below: till it meets the wall's band)        // the counter pass-through: lift-up leaf + swinging half gate, set below
let posScreen;                                // the register monitor's glass (pos.js mirrors its terminal onto it)
// the counter's VHS rewinders (models built with the counter, logic near the
// rewind policy): each { tape = the copy inside, f0/dur/t = rewind progress, tapeMesh, led, snd }
const rewinders = [];
const rewinderKit = { model: null };             // (rw, car) => dress a rewinder as the plain box or the sports car (built with the counter)
function rewinderOn(rw, on) {                    // the second one only once it's bought: hidden, and nothing to aim at
  if (rw.on === on) return; rw.on = on; rw.g.visible = on;
  rw.g.traverse(o => { if (o.isMesh) { const i = aimables.indexOf(o); if (on && i < 0) aimables.push(o); if (!on && i >= 0) aimables.splice(i, 1); } });
}
let phoneLook = () => {};                    // (set when the phone is built)
let popcornMachine = null, theaterSign = null, jobBoardMesh = null;
const COUNTER = { y: 1.08, tops: [], groups: {} };   // the checkout counter's usable worktop (rectangles, world x/z) and the things on it that can be moved (see counter moves)   // (simulation: bought later — see amenities)
const PHONE_AT = new THREE.Vector3(), HOLDS_AT = new THREE.Vector3();   // the desk phone / the holds tray, on the back cabinet (set when it's built)
const PRN_AT = { x: -4.62, z: 3.93 };           // the receipt printer's paper slot
const printer = { strip: null, tex: null, job: null };   // the receipt feeding out of it (see printReceipt)
const DESENS_AT = { x: -4.95, z: 3.92 };       // the desensitizer pad, beside the register
let gateLed;                                  // the security gates' status LED material
let desensLed;                                // the desensitizer pad's LED (flashes green when a tag is killed)
const GATE_Z = 4.0;                           // security gate line across the entry lane (|x| < 2)
{
  // ---- the employee counter: one L around the register nook ----
  // North run (the checkout) faces the store along z 3.65-4.35; the east run
  // faces the entry lane along x -2.6..-1.9 and runs solid all the way to the
  // front wall — no way in from the doors. The way in is a lift-up pass-through
  // at the west end, by the soda cooler (see the flap below).
  // Both runs share one builder, in a local frame: the run goes along +x from
  // 0..len, the customer face is +z, the employee face -z, the worktop's top
  // at y 1.08 (the register and rewinder sit on it). Customer side: recessed
  // toe kick, blue panels with chrome bands + dividers, a raised transaction
  // ledge. Employee side: cabinet doors, or an open cubby where asked.
  const RX = -2.25;                            // east run centerline
  const CD = 0.7, TOP = 1.08, KICK = 0.1;      // counter depth, worktop height, toe kick
  const FLAP_X0 = WALL_L + 0.1, FLAP_X1 = -6.0; // pass-through gap (wall to the checkout's west end) — wide enough to get round the cooler
  const chromeC = new THREE.MeshPhongMaterial({ color: 0xc9cdd2, specular: 0xffffff, shininess: 90 });
  const blueDk = new THREE.MeshLambertMaterial({ color: 0x1d3a8a }), cubbyMat = new THREE.MeshLambertMaterial({ color: 0x0e1426 });
  // corner pieces meet on a 45° miter: a run whose end turns the corner
  // (miterEnd: turning at len; miterStart: coming off another run at 0) has
  // its worktop / ledge ends cut along the diagonal through the two runs'
  // shared outer corner, so the matching piece on the other run meets it edge
  // to edge. A piece's plan is a prism between z_in..z_out whose end x
  // follows that diagonal: end(z) = len + (z - CD/2), start(z) = -CD - (z - CD/2)
  function prism(pts, y0, y1, m) {             // pts: plan outline [[x, z], ...]; extruded y0..y1
    const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, z)));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: y1 - y0, bevelEnabled: false });
    geo.rotateX(Math.PI / 2); geo.translate(0, y1, 0);   // shape y -> world z, extrusion -> down from y1
    return new THREE.Mesh(geo, m);
  }
  function counterRun(len, { cubbies = [], miterStart = false, miterEnd = false, endTrim = false, logo = null, drawer = null, stock = null } = {}) {   // stock: (door i, doors) -> "food" | "drinks" | null: a stock cupboard   // drawer: [x0, x1] a drawer front sits over
    const g = new THREE.Group(); scene.add(g);
    const add = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); g.add(o); return o; };
    const BH = TOP - 0.04 - KICK, by = KICK + BH / 2;                         // body height / center
    add(len, KICK, CD - 0.12, mat.dark, len / 2, KICK / 2, 0);               // toe kick, recessed both sides
    // body: solid except where a cubby opens on the employee side
    let x = 0;
    for (const c of [...cubbies].sort((a, b) => a.x0 - b.x0).concat([{ x0: len, x1: len }])) {
      if (c.x0 > x) add(c.x0 - x, BH, CD - 0.02, mat.counter, (x + c.x0) / 2, by, 0);
      if (c.x1 > c.x0) {                                                      // the cubby: customer-side wall, slab above, floor, dark inside
        const w = c.x1 - c.x0, cx = (c.x0 + c.x1) / 2, back = 0.2;
        add(w, BH, back, mat.counter, cx, by, CD / 2 - 0.01 - back / 2);
        add(w, TOP - 0.04 - c.y1, CD - 0.02, mat.counter, cx, (c.y1 + TOP - 0.04) / 2, 0);
        add(w, c.y0 - KICK, CD - 0.02, mat.counter, cx, (KICK + c.y0) / 2, 0);
        add(w, c.y1 - c.y0, 0.01, cubbyMat, cx, (c.y0 + c.y1) / 2, CD / 2 - 0.01 - back - 0.005);
      }
      x = c.x1;
    }
    const x0 = z => miterStart ? -CD - (z - CD / 2) : -0.02, x1 = z => miterEnd ? len + (z - CD / 2) : len + 0.02;
    const slab = (zIn, zOut, y0, y1, m) => g.add(prism([[x0(zIn), zIn], [x1(zIn), zIn], [x1(zOut), zOut], [x0(zOut), zOut]], y0, y1, m));
    slab(-CD / 2 - 0.03, CD / 2 + 0.03, TOP - 0.04, TOP, mat.counterTop);                    // worktop
    slab(CD / 2 + 0.03, CD / 2 + 0.042, TOP - 0.0375, TOP - 0.0025, chromeC);                // chrome nosing
    // raised transaction ledge along the customer edge: riser, top, chrome nosing
    slab(CD / 2 - 0.15, CD / 2 - 0.11, TOP, TOP + 0.14, mat.counter);
    slab(CD / 2 - 0.14, CD / 2 + 0.08, TOP + 0.14, TOP + 0.17, mat.counterTop);
    slab(CD / 2 + 0.08, CD / 2 + 0.09, TOP + 0.14, TOP + 0.17, chromeC);
    // customer face: chrome bands and a yellow pinstripe
    const fz = CD / 2 - 0.004;
    for (const y of [KICK + 0.12, TOP - 0.16]) add(len, 0.02, 0.012, chromeC, len / 2, y, fz + 0.006);
    add(len, 0.025, 0.008, mat.counterTop, len / 2, TOP - 0.2, fz + 0.004);
    if (endTrim) {                                                            // customer-facing end at len (the lane corner)
      for (const y of [KICK + 0.12, TOP - 0.16]) add(0.012, 0.02, CD, chromeC, len + 0.006, y, 0);
      add(0.03, TOP - 0.045 - KICK, 0.03, chromeC, len, (KICK + TOP - 0.045) / 2, CD / 2);   // corner guard, stops just under the worktop
    }
    if (logo) {
      const t = textPlane(logo, Math.min(2.6, len * 0.6), 0.34, "#ffd400", "#00349c");
      t.material = new THREE.MeshLambertMaterial({ map: t.material.map }); t.position.set(len / 2, 0.52, fz + 0.012); g.add(t);
    }
    // employee side: cabinet doors (skipping cubbies), chrome pulls
    const doorsAt = [];
    for (let d = 0.05; d + 0.5 <= len - 0.05; d += 0.52) if (!cubbies.some(c => d + 0.5 > c.x0 && d < c.x1)) doorsAt.push(d);
    doorsAt.forEach((d, i) => {                // doors under a drawer stop short of it
      const under = drawer && d + 0.5 > drawer[0] && d < drawer[1], top = under ? TOP - 0.23 : by + 0.02 + (BH - 0.12) / 2, bot = by + 0.02 - (BH - 0.12) / 2;
      const door = add(0.49, top - bot, 0.015, blueDk, d + 0.25, (top + bot) / 2, -CD / 2 + 0.002);
      const pull = add(0.012, 0.12, 0.02, chromeC, d + 0.43, top - 0.14, -CD / 2 - 0.01);
      const kind = stock?.(i, doorsAt.length);
      if (kind) {                              // a stock cupboard: labelled, and E on it hands out restock
        const lbl = textPlane(kind === "food" ? "SNACK STOCK" : "DRINK STOCK", 0.3, 0.06, "#fff", kind === "food" ? "#8a5a1c" : "#1c5a8a", "Arial", 60);
        lbl.material = new THREE.MeshLambertMaterial({ map: lbl.material.map }); lbl.position.set(d + 0.22, top - 0.1, -CD / 2 - 0.008); lbl.rotation.y = Math.PI; g.add(lbl);
        for (const m of [door, pull, lbl]) { m.userData.stock = kind; aimables.push(m); }
      }
    });
    return g;
  }
  // north run: flap edge -> the lane corner (the corner block belongs to it)
  const nLen = (RX + CD / 2) - FLAP_X1;
  const north = counterRun(nLen, { endTrim: true, miterEnd: true, logo: "JELLYBUSTER VIDEO", drawer: [-5.45 - 0.23 - FLAP_X1, -5.45 + 0.23 - FLAP_X1] });   // the cash drawer under the register   // mitered into the east run at the lane corner
  north.position.set(FLAP_X1, 0, 4);
  colliders.push({ x0: FLAP_X1, x1: RX + CD / 2, z0: 4 - CD / 2, z1: 4 + CD / 2 + 0.08, y1: TOP + 0.17 });
  // east run: from the corner down to the front wall, customer face to the lane;
  // a cubby near the corner holds the returns tote (the drop slot's on the lane face)
  const FRONT = 0.1, eLen = (4 - CD / 2) - FRONT, RET = 1.05;               // RET: slot/tote position along the run
  const east = counterRun(eLen, { cubbies: [{ x0: RET - 0.42, x1: RET + 0.42, y0: 0.14, y1: 0.66 }], miterStart: true,
    stock: (i, n) => i < Math.ceil(n / 2) ? "drinks" : "food" });   // the stockroom, such as it is: drinks nearest the cooler end, snacks toward the front
  east.position.set(RX, 0, 4 - CD / 2); east.rotation.y = Math.PI / 2;      // local +x runs south (world -z), customer face east
  colliders.push({ x0: RX - CD / 2, x1: RX + CD / 2 + 0.08, z0: FRONT, z1: 4 - CD / 2, y1: TOP + 0.17 });
  // register: a beige CRT point-of-sale terminal with keyboard + mouse, where
  // the old black box stood — facing the employee side (toward the doors' wall)
  {
    const pos = new THREE.Group(); pos.position.set(-5.45, 1.08, 4); pos.rotation.y = Math.PI; scene.add(pos); COUNTER.groups.register = pos;   // local +z = employee side
    const beige = new THREE.MeshLambertMaterial({ color: 0xd8d0bc }), beigeDk = new THREE.MeshLambertMaterial({ color: 0xbdb49e });
    const add = (geo, m, x, y, z, parent = pos) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
    // monitor: swivel base, neck, bezel box, tapered CRT back, recessed screen
    add(new THREE.CylinderGeometry(0.13, 0.15, 0.025, 24), beigeDk, 0, 0.0125, -0.05);
    add(new THREE.BoxGeometry(0.1, 0.05, 0.1), beigeDk, 0, 0.05, -0.05);
    const mon = new THREE.Group(); mon.position.set(0, 0.26, -0.05); mon.rotation.x = -0.06; pos.add(mon);   // tipped back a touch
    add(new THREE.BoxGeometry(0.4, 0.34, 0.06), beige, 0, 0, 0.1, mon);                                     // front bezel
    const back = add(new THREE.CylinderGeometry(0.2, 0.12, 0.28, 4, 1).rotateX(Math.PI / 2).rotateZ(Math.PI / 4), beigeDk, 0, 0.005, -0.07, mon);
    back.scale.set(1.25, 1, 1);                                                                             // squared-off tube housing, wider than tall — wide at the bezel, tapering to the back
    const scr = makeTexture((ctx, w, h) => {                                                                // green POS screen
      ctx.fillStyle = "#031a0b"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#39ff7a"; ctx.font = "bold 22px 'Courier New', monospace"; ctx.textBaseline = "top";
      const lines = ["JELLYBUSTER POS  v2.3", "--------------------", "RENTAL / RETURN", "", "MEMBER #: ______", "TITLE  : ______", "DUE    : 3 NIGHTS", "", "F1 RENT  F2 RETURN", "F3 LATE FEES"];
      lines.forEach((l, i) => ctx.fillText(l, 16, 14 + i * 24));
      ctx.fillRect(16 + 9 * 13.2, 14 + 4 * 24, 12, 20);                                                  // block cursor
      const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.75);                  // CRT falloff
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.55)"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }, 320, 256);
    add(new THREE.BoxGeometry(0.32, 0.25, 0.01), new THREE.MeshLambertMaterial({ color: 0x0c0f0c }), 0, 0.01, 0.128, mon);   // screen recess
    posScreen = glow(add(new THREE.PlaneGeometry(0.3, 0.235), new THREE.MeshBasicMaterial({ map: scr }), 0, 0.01, 0.1335, mon));   // pos.js takes this over once it's up
    add(new THREE.BoxGeometry(0.012, 0.012, 0.004), new THREE.MeshBasicMaterial({ color: 0x39ff7a }), 0.16, -0.15, 0.132, mon);   // power LED
    // keyboard: beige slab, raised back edge, key grid on top
    const keys = makeTexture((ctx, w, h) => {
      ctx.fillStyle = "#cfc7b2"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#e9e3d3"; ctx.strokeStyle = "#8e866f"; ctx.lineWidth = 1;
      const rows = 6, kh = h / (rows + 0.6);
      for (let r = 0; r < rows; r++) {
        const n = r === 5 ? 1 : 15, kw = r === 5 ? w * 0.45 : (w * 0.74) / 15;
        for (let k = 0; k < n; k++) { const x = r === 5 ? w * 0.22 : 8 + k * kw; ctx.fillRect(x, 6 + r * kh, kw - 3, kh - 3); ctx.strokeRect(x, 6 + r * kh, kw - 3, kh - 3); }
      }
      for (let r = 1; r < 6; r++) for (let k = 0; k < 4; k++) { const x = w * 0.8 + k * (w * 0.19 / 4); ctx.fillRect(x, 6 + r * (h / 6.6), w * 0.04, h / 6.6 - 3); }   // number pad
    }, 512, 176);
    const kb = add(new THREE.BoxGeometry(0.44, 0.025, 0.16), [beige, beige, new THREE.MeshLambertMaterial({ map: keys }), beige, beige, beige], 0, 0.02, 0.2);
    kb.rotation.x = 0.07;                                                                                   // raised at the back
    // mouse on a pad, cord running back to the monitor
    add(new THREE.BoxGeometry(0.2, 0.004, 0.17), new THREE.MeshLambertMaterial({ color: 0x1f3f86 }), 0.33, 0.002, 0.2);
    const mouse = add(new THREE.SphereGeometry(0.035, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), beige, 0.33, 0.004, 0.21);
    mouse.scale.set(0.85, 0.7, 1.35);
    add(new THREE.BoxGeometry(0.002, 0.003, 0.018), beigeDk, 0.33, 0.028, 0.185);                          // button split
    const cord = add(new THREE.CylinderGeometry(0.003, 0.003, 0.3, 6).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x9a927d }), 0.26, 0.004, 0.03);
    cord.rotation.y = 0.55;
    pos.traverse(o => { if (o.isMesh) { o.userData.pos = true; aimables.push(o); } });   // E anywhere on it logs in
  }
  // a pad of post-its and a pen, past the keyboard's right end: an overdue call looked up on the register gets
  // written on one and stuck by the phone (see post-its)
  {
    const g = new THREE.Group(); g.position.set(-5.145, TOP, 3.77); g.rotation.y = 0.12; scene.add(g); COUNTER.groups.notepad = g;
    const edge = new THREE.MeshLambertMaterial({ color: 0xeed65a }), top = new THREE.MeshLambertMaterial({ color: 0xffea6e });
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.014, 0.076), [edge, edge, top, edge, edge, edge]); pad.position.y = 0.007; g.add(pad);
    const pen = new THREE.Group(); pen.position.set(-0.06, 0.0045, 0.012); pen.rotation.y = Math.PI / 2 - 0.1; g.add(pen);   // (down the pad's left side, clear of the keyboard)
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.11, 10).rotateZ(Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0x1d3f9e, shininess: 60 })); pen.add(barrel);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.035, 10).rotateZ(Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0x15161a, shininess: 60 })); cap.position.x = 0.065; pen.add(cap);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0045, 0.014, 10).rotateZ(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xd8d8dc })); tip.position.x = -0.062; pen.add(tip);
    g.traverse(o => { if (o.isMesh) { o.userData.notepad = true; aimables.push(o); } });
  }
  // tape rewinders, a pair on the lane counter either side of the returns tote (placed below, once RZ is known).
  // The machine (rw.g: where it sits, what you aim at and move) wears a model: a plain black box to start; the
  // classic little sports car once they're high-speed (rewinderKit.model swaps it, see amenities). Either way a
  // loaded tape lies in the top, lengthwise along local x, and a status LED on the side faces the employee
  function boxModel(m, rw) {
    const add = (geo, mt, x, y, z) => { const o = new THREE.Mesh(geo, mt); o.position.set(x, y, z); m.add(o); return o; };
    const body = new THREE.MeshPhongMaterial({ color: 0x1c1c1f, specular: 0x333333, shininess: 25 }), well = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });
    const L = 0.26, H = 0.07, W = 0.15;
    add(new THREE.BoxGeometry(L, H, W), body, 0, 0.008 + H / 2, 0);
    add(new THREE.BoxGeometry(TAPE.h + 0.02, 0.003, TAPE.d + 0.012), well, -0.015, 0.008 + H + 0.0005, 0);   // the tape well
    add(new THREE.BoxGeometry(0.028, 0.012, 0.03), chromeC, 0.1, 0.008 + H + 0.004, 0);                     // eject
    for (const x of [-0.11, 0.11]) for (const z of [-0.06, 0.06]) add(new THREE.BoxGeometry(0.025, 0.008, 0.025), well, x, 0.004, z);   // feet
    const lbl = textPlane("REWINDER", 0.09, 0.016, "#c8c8c8", "#1c1c1f", "Arial Black", 60); lbl.material = new THREE.MeshLambertMaterial({ map: lbl.material.map });
    lbl.position.set(-0.04, 0.008 + H * 0.55, W / 2 + 0.001); m.add(lbl);
    rw.led = glow(add(new THREE.BoxGeometry(0.012, 0.012, 0.004), new THREE.MeshBasicMaterial({ color: 0x222222 }), 0.08, 0.008 + H * 0.55, W / 2 + 0.002));
    rw.tapeMesh = add(new THREE.BoxGeometry(TAPE.h, TAPE.w, TAPE.d), mat.tapeBody, -0.015, 0.008 + H + TAPE.w / 2 - 0.01, 0);   // sat down in the well
  }
  function carModel(m, rw) {                    // a little convertible facing the employee side; the tape rides in its open cockpit
    const red = new THREE.MeshPhongMaterial({ color: 0xc41e1e, specular: 0xffffff, shininess: 80 });
    const blackP = new THREE.MeshPhongMaterial({ color: 0x151515, specular: 0x555555, shininess: 50 });
    const add = (geo, mt, x, y, z) => { const o = new THREE.Mesh(geo, mt); o.position.set(x, y, z); m.add(o); return o; };
    const W = 0.17, A = 0.036;                  // body width; wheel-arch radius
    // side profile (+x = nose), extruded across the width with rounded edges; the dip is the open cockpit
    const p = new THREE.Shape();
    p.moveTo(-0.22, 0.014); p.lineTo(-0.14 - A, 0.014); p.lineTo(-0.14 - A, 0.028);
    p.absarc(-0.14, 0.028, A, Math.PI, 0, true); p.lineTo(-0.14 + A, 0.014);
    p.lineTo(0.15 - A, 0.014); p.lineTo(0.15 - A, 0.028);
    p.absarc(0.15, 0.028, A, Math.PI, 0, true); p.lineTo(0.15 + A, 0.014);
    p.lineTo(0.235, 0.018); p.lineTo(0.245, 0.036);
    p.quadraticCurveTo(0.235, 0.058, 0.17, 0.066); p.lineTo(0.085, 0.072);       // long hood up to the cowl
    p.lineTo(0.085, 0.048); p.lineTo(-0.125, 0.048); p.lineTo(-0.125, 0.076);    // cockpit
    p.lineTo(-0.19, 0.078); p.quadraticCurveTo(-0.222, 0.076, -0.225, 0.05); p.lineTo(-0.22, 0.014);   // rear deck, tail
    const bodyGeo = new THREE.ExtrudeGeometry(p, { depth: W - 0.012, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 3, curveSegments: 12 });
    bodyGeo.translate(0, 0, -(W - 0.012) / 2);
    add(bodyGeo, red, 0, 0, 0);
    for (const z of [-1, 1]) add(new THREE.BoxGeometry(0.21, 0.026, 0.012), red, -0.02, 0.061, z * (W / 2 - 0.006));   // door tops, closing the cockpit sides
    add(new THREE.BoxGeometry(0.21, 0.004, W - 0.024), blackP, -0.02, 0.057, 0);             // cockpit floor (over the bevel)
    const lean = 0.55, glass = add(new THREE.BoxGeometry(0.003, 0.05, W - 0.02),
      new THREE.MeshPhongMaterial({ color: 0x9fc6de, transparent: true, opacity: 0.35, specular: 0xffffff, shininess: 100 }),
      0.085 - 0.025 * Math.sin(lean), 0.074 + 0.025 * Math.cos(lean), 0);
    glass.rotation.z = lean;                                                                  // raked windshield
    const top = add(new THREE.BoxGeometry(0.006, 0.006, W - 0.014), chromeC, 0.085 - 0.05 * Math.sin(lean), 0.074 + 0.05 * Math.cos(lean), 0);
    top.rotation.z = lean;                                                                    // its chrome header
    for (const x of [0.25, -0.228]) add(new THREE.BoxGeometry(0.01, 0.012, W - 0.02), chromeC, x, 0.022, 0);   // bumpers
    for (const x of [-0.14, 0.15]) for (const z of [-1, 1]) {
      const w = add(new THREE.CylinderGeometry(0.028, 0.028, 0.022, 20), blackP, x, 0.028, z * (W / 2 - 0.008)); w.rotation.x = Math.PI / 2;
      const hub = add(new THREE.CylinderGeometry(0.014, 0.014, 0.004, 16), chromeC, x, 0.028, z * (W / 2 + 0.004)); hub.rotation.x = Math.PI / 2;
    }
    for (const z of [-0.05, 0.05]) {
      add(new THREE.BoxGeometry(0.008, 0.012, 0.028), new THREE.MeshBasicMaterial({ color: 0xfff6c8 }), 0.243, 0.042, z);   // headlights
      glow(add(new THREE.BoxGeometry(0.006, 0.01, 0.03), new THREE.MeshBasicMaterial({ color: 0xff2a2a }), -0.226, 0.058, z));   // taillights
    }
    rw.led = glow(add(new THREE.BoxGeometry(0.012, 0.012, 0.004), new THREE.MeshBasicMaterial({ color: 0x222222 }), 0.03, 0.04, W / 2 + 0.002));   // status LED on the side
    rw.tapeMesh = add(new THREE.BoxGeometry(TAPE.h, TAPE.w, TAPE.d), mat.tapeBody, -0.02, 0.059 + TAPE.w / 2, 0);   // lies lengthwise in the cockpit
  }
  rewinderKit.model = (rw, car) => {            // dress the machine (keeping its tape, LED state, aim and move handles)
    if (rw.model && rw.car === car) return;
    const was = rw.model, led = rw.led?.material.color.getHex() ?? 0x222222, tapeOn = !!rw.tapeMesh?.visible, tapeMat = rw.tapeMesh?.material;
    if (was) { was.traverse(o => { const i = aimables.indexOf(o); if (i >= 0) aimables.splice(i, 1); }); rw.g.remove(was); }
    const m = new THREE.Group(); rw.g.add(m); rw.model = m; rw.car = car;
    (car ? carModel : boxModel)(m, rw);
    rw.led.material.color.setHex(led); rw.tapeMesh.visible = tapeOn; if (tapeMat) rw.tapeMesh.material = tapeMat;
    m.traverse(o => { if (o.isMesh) { o.userData.rewinder = rw; if (rw.on) aimables.push(o); } });
    const it = was && counterItems?.find(k => k.g === rw.g);   // (a swap: if it's movable, its new outline, and the new parts are handles)
    if (it) { it.fp = footprint(rw.g); m.traverse(o => { if (o.isMesh) o.userData.movable = it; }); }
  };
  function buildRewinder(x, z, ry) {
    const rw = { tape: null, f0: 0, dur: 0, t: 0, done: false, tapeMesh: null, led: null, snd: null, on: true };
    const g = new THREE.Group(); g.position.set(x, TOP, z); g.rotation.y = ry; scene.add(g);
    rw.g = g; rewinders.push(rw);
    rewinderKit.model(rw, false);
  }

  // ---- returns: a stainless drop slot on the lane face, into a tote in the cubby behind ----
  const RZ = 4 - CD / 2 - RET;                 // world z of the slot / tote
  const steelC = new THREE.MeshPhongMaterial({ color: 0xaab2ba, specular: 0xffffff, shininess: 70 });
  box(0.012, 0.3, 0.5, steelC, RX + CD / 2 + 0.006, 0.82, RZ);                                   // drop plate
  box(0.008, 0.05, 0.38, mat.dark, RX + CD / 2 + 0.014, 0.86, RZ);                                // the slot
  returnSlotMesh = box(0.02, 0.07, 0.4, chromeC, RX + CD / 2 + 0.02, 0.9, RZ);                     // its hinged lip — the E target from the lane
  returnSlotMesh.userData.returns = true; aimables.push(returnSlotMesh);
  for (const dz of [-0.46, 0.46]) buildRewinder(RX - 0.12, RZ + dz, -Math.PI / 2);
  // the worktop things can be set down on: the north run behind its transaction ledge, and the east run behind its ledge
  COUNTER.y = TOP;
  COUNTER.tops.push({ x0: FLAP_X1 + 0.03, x1: RX + CD / 2 - 0.03, z0: 4 - CD / 2 + 0.02, z1: 4 + CD / 2 - 0.16, run: "north", staff: 4 - CD / 2 - 0.5 },
    { x0: RX - CD / 2 + 0.02, x1: RX + CD / 2 - 0.16, z0: 0.13, z1: 4 - CD / 2 + 0.02, run: "east", staff: RX - CD / 2 - 0.5 });   // on the worktop over the tote, clear of the ledge; local +z (its face) = world -x, the employee side
  const drop = textPlane("DROP TAPES HERE", 0.44, 0.07, "#1a1d22", "#e8ecf0", "Arial", 64);
  drop.material = new THREE.MeshLambertMaterial({ map: drop.material.map });
  drop.position.set(RX + CD / 2 + 0.013, 0.73, RZ); drop.rotation.y = Math.PI / 2; scene.add(drop);
  const rb = textPlane("RETURNS", 0.84, 0.24, "#001f5c", "#ffd400");                             // on the blue face, under the slot
  rb.material = new THREE.MeshLambertMaterial({ map: rb.material.map }); rb.position.set(RX + CD / 2 + 0.012, 0.42, RZ); rb.rotation.y = Math.PI / 2;
  scene.add(rb);
  // the tote in the cubby (open on the employee side, x = RX - CD/2)
  const toteMat = new THREE.MeshLambertMaterial({ color: 0x2456b8 });
  const TW = 0.74, TD = 0.38, TH = 0.3, tx = RX - 0.1, ty = 0.15;   // x RX-0.29..RX+0.09: clear of the cubby's back wall
  box(TD, 0.02, TW, toteMat, tx, ty + 0.01, RZ);
  for (const s of [-1, 1]) box(TD, TH, 0.02, toteMat, tx, ty + TH / 2, RZ + s * (TW / 2 - 0.01));
  for (const s of [-1, 1]) box(0.02, TH, TW, toteMat, tx + s * (TD / 2 - 0.01), ty + TH / 2, RZ);
  const grab = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.52),                               // the cubby's open side: click target from behind the counter
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  grab.position.set(RX - CD / 2 - 0.005, 0.4, RZ); grab.rotation.y = -Math.PI / 2; scene.add(grab);
  grab.userData.returns = true; aimables.push(grab);
  const binGroup = new THREE.Group(); scene.add(binGroup);
  refreshReturnsBin = () => {                  // returned tapes lying in the tote, loose piles
    binGroup.clear();
    returnBin.slice(-12).forEach((t, i) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(TAPE.h, TAPE.w, TAPE.d), t.sideMat || mat.tapeBody);
      const pile = i % 3, level = Math.floor(i / 3);
      m.position.set(tx + (level % 2) * 0.03 - 0.015, ty + 0.02 + TAPE.w / 2 + level * TAPE.w, RZ - 0.22 + pile * 0.22);
      m.rotation.y = Math.PI / 2 + ((i * 0.37) % 0.5 - 0.25); binGroup.add(m);
    });
  };
  const hours = textPlane("OPEN 10A-12A DAILY", 0.9, 0.22, "#001f5c", "#fff");  // tented placard, first thing you see coming in
  hours.position.set(RX - 0.05, TOP + 0.11, FRONT + 0.3); hours.rotation.x = -0.3; hours.rotation.y = Math.PI; scene.add(hours);

  // ---- the pass-through, by the soda cooler: a lift-up countertop leaf
  // hinged at the wall plus a swinging half gate under it, both animated
  // together (see the main loop). Closed = flush with the counter.
  const FW = FLAP_X1 - FLAP_X0;
  flapPivot = new THREE.Group(); flapPivot.position.set(FLAP_X0, TOP - 0.04, 4); scene.add(flapPivot);
  const flapMesh = new THREE.Mesh(new THREE.BoxGeometry(FW - 0.01, 0.04, CD + 0.06), mat.counterTop);
  flapMesh.position.set(FW / 2, 0.02, 0); flapPivot.add(flapMesh);
  const flapEdge = new THREE.Mesh(new THREE.BoxGeometry(FW - 0.01, 0.035, 0.012), chromeC);
  flapEdge.position.set(FW / 2, 0.02, CD / 2 + 0.036); flapPivot.add(flapEdge);
  for (const hz of [-0.25, 0.25]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 10), chromeC); h.rotation.x = Math.PI / 2; h.position.set(0.01, 0.0, hz); flapPivot.add(h); }   // hinge knuckles
  flapGate = new THREE.Group(); flapGate.position.set(FLAP_X0 + 0.02, 0, 4); scene.add(flapGate);
  const gw = FW - 0.06;
  const gate = new THREE.Mesh(new THREE.BoxGeometry(gw, TOP - 0.1 - KICK, 0.04), mat.counter); gate.position.set(gw / 2, KICK + (TOP - 0.1 - KICK) / 2, 0); flapGate.add(gate);
  const gRail = new THREE.Mesh(new THREE.BoxGeometry(gw, 0.03, 0.05), mat.counterTop); gRail.position.set(gw / 2, TOP - 0.1, 0); flapGate.add(gRail);
  for (const y of [KICK + 0.12, TOP - 0.2]) { const b = new THREE.Mesh(new THREE.BoxGeometry(gw, 0.02, 0.05), chromeC); b.position.set(gw / 2, y, 0); flapGate.add(b); }
  const kickPlate = new THREE.Mesh(new THREE.BoxGeometry(gw, 0.16, 0.046), steelC); kickPlate.position.set(gw / 2, KICK + 0.08, 0); flapGate.add(kickPlate);
  const pull = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.07), chromeC); pull.position.set(gw - 0.08, TOP - 0.34, 0); flapGate.add(pull);
  for (const m of [flapMesh, flapEdge, gate, gRail, pull]) { m.userData.flap = flapPivot; aimables.push(m); }
  flapCollider = { x0: FLAP_X0, x1: FLAP_X1, z0: 4 - CD / 2, z1: 4 + CD / 2 };
  if (wallStripe) {                              // lifted, the leaf's top face leans toward the wall: stop it a few mm shy of the band's bottom edge
    const X0 = FLAP_X0, Y0 = TOP - 0.04, th = 0.04, clear = a => { const c = Math.cos(a), s = Math.sin(a), lx = (wallStripe.y0 - Y0 - th * c) / s;
      return lx > FW || X0 - th * s + lx * c >= wallStripe.inL + 0.005; };
    while (flapOpenA > 0.5 && !clear(flapOpenA)) flapOpenA -= 0.002;
  }
  colliders.push(flapCollider);                // starts closed/blocked; toggleFlap() adds/removes this

  // ---- on the counter ----
  const put = (geo, m, x, y, z, parent = scene) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const beigeP = new THREE.MeshLambertMaterial({ color: 0xd8d0bc }), blackC = new THREE.MeshPhongMaterial({ color: 0x151515, specular: 0x555555, shininess: 50 });
  // receipt printer beside the register
  // a squat charcoal thermal printer: paper roll under a rounded clamshell at the back, the slot and
  // tear bar at the seam, a front deck (clerk side, -z) with the feed button and power LED
  const PRN = PRN_AT.x;                       // the receipt printer: past the desensitizer, toward the register
  const prnG = new THREE.Group(); prnG.position.set(PRN, TOP, PRN_AT.z + 0.028); scene.add(prnG);
  const prnC = new THREE.MeshPhongMaterial({ color: 0x2b2d31, specular: 0x333333, shininess: 30 }), prnLid = new THREE.MeshPhongMaterial({ color: 0x3a3d42, specular: 0x555555, shininess: 50 });
  put(new THREE.BoxGeometry(0.15, 0.06, 0.2), prnC, 0, 0.03, 0, prnG);                                        // base
  const lid = put(new THREE.CylinderGeometry(0.058, 0.058, 0.148, 24), prnLid, 0, 0.062, 0.035, prnG); lid.rotation.z = Math.PI / 2;   // roll cover
  put(new THREE.BoxGeometry(0.15, 0.032, 0.075), prnC, 0, 0.074, -0.0625, prnG);                              // front deck
  put(new THREE.BoxGeometry(0.1, 0.004, 0.01), blackC, 0, 0.091, -0.028, prnG);                               // paper slot
  put(new THREE.BoxGeometry(0.11, 0.006, 0.004), chromeC, 0, 0.094, -0.035, prnG);                            // tear bar
  put(new THREE.BoxGeometry(0.07, 0.012, 0.002), new THREE.MeshLambertMaterial({ color: 0xf3efe2 }), 0, 0.098, -0.031, prnG);   // a tail of paper, always showing
  put(new THREE.BoxGeometry(0.03, 0.008, 0.016), new THREE.MeshLambertMaterial({ color: 0x9a9ea4 }), 0.035, 0.093, -0.075, prnG);   // FEED button
  glow(put(new THREE.BoxGeometry(0.008, 0.004, 0.008), new THREE.MeshBasicMaterial({ color: 0x40ff70 }), -0.05, 0.091, -0.08, prnG));   // power LED
  prnG.traverse(o => { if (o.isMesh) { o.userData.printer = true; aimables.push(o); } });
  // a sale's receipt feeds up out of the slot toward the clerk, top of the slip first, curling
  // over as it comes (the curl is in z, so scaling z with the length keeps it in proportion)
  const stripG = new THREE.PlaneGeometry(0.07, 1, 1, 16).translate(0, 0.5, 0), sp = stripG.attributes.position;
  for (let i = 0; i < sp.count; i++) sp.setZ(i, 0.16 * sp.getY(i) ** 2);
  stripG.computeVertexNormals();
  const strip = printer.strip = new THREE.Mesh(stripG, new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide, alphaTest: 0.5 }));
  strip.position.set(0, 0.098, -0.028); strip.rotation.set(-0.2, Math.PI, 0); strip.visible = false;   // (in the printer's own frame: it goes where the printer goes)
  strip.userData.printer = true; prnG.add(strip); aimables.push(strip);
  COUNTER.groups.printer = prnG;
  // security-tag deactivator pad (the "desensitizer"): tapes run across it before they leave
  const desG = new THREE.Group(); desG.position.set(DESENS_AT.x, TOP, DESENS_AT.z); scene.add(desG); COUNTER.groups.desens = desG;   // right beside the register
  const padMesh = put(new THREE.BoxGeometry(0.28, 0.025, 0.2), blackC, 0, 0.0125, 0, desG);
  desensLed = glow(put(new THREE.BoxGeometry(0.012, 0.006, 0.012), new THREE.MeshBasicMaterial({ color: 0xff3020 }), 0.12, 0.028, -0.08, desG));
  padMesh.userData.desens = true; aimables.push(padMesh);
  const deac = textPlane("DESENSITIZE", 0.2, 0.04, "#ddd", "#151515", "Arial", 60);
  deac.material = new THREE.MeshLambertMaterial({ map: deac.material.map }); deac.position.set(-0.02, 0.026, 0); deac.rotation.x = -Math.PI / 2; deac.rotation.z = Math.PI; desG.add(deac);
  // cash drawer under the register, on the employee face: slides out (toward
  // the clerk) when a sale's rung up, a till of bills and coins inside
  {
    const dz = 4 - CD / 2 - 0.01;
    cashDrawer = new THREE.Group(); cashDrawer.position.set(-5.45, TOP - 0.13, dz); scene.add(cashDrawer);
    const front = put(new THREE.BoxGeometry(0.46, 0.13, 0.02), beigeP, 0, 0, 0, cashDrawer);
    const pull = put(new THREE.BoxGeometry(0.12, 0.015, 0.02), chromeC, 0, 0, -0.012, cashDrawer);
    put(new THREE.BoxGeometry(0.42, 0.08, 0.3), new THREE.MeshLambertMaterial({ color: 0x2a2a2e }), 0, -0.01, 0.16, cashDrawer);   // the till tray behind the front
    ["#8fbf8a", "#8fbf8a", "#9fc79a", "#8fbf8a", "#b9b9b0"].forEach((c, i) => put(new THREE.BoxGeometry(0.066, 0.01, 0.13), new THREE.MeshLambertMaterial({ color: c }), -0.16 + i * 0.08, 0.035, 0.18, cashDrawer));   // bills / coins
    for (const m of [front, pull]) { m.userData.drawer = true; aimables.push(m); }
  }
  // service bell on the ledge — E / click to ding it
  const LEDGE_Y = TOP + 0.17, LZ = 4 + CD / 2 - 0.03;
  const bell = new THREE.Group(); bell.position.set(-3.1, LEDGE_Y, LZ); scene.add(bell);
  put(new THREE.CylinderGeometry(0.045, 0.05, 0.02, 20), blackC, 0, 0.01, 0, bell);
  put(new THREE.SphereGeometry(0.042, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), chromeC, 0, 0.02, 0, bell);
  put(new THREE.CylinderGeometry(0.004, 0.004, 0.025, 8), chromeC, 0, 0.07, 0, bell);
  put(new THREE.SphereGeometry(0.009, 10, 8), chromeC, 0, 0.083, 0, bell);
  bell.traverse(o => { if (o.isMesh) { o.userData.bell = true; aimables.push(o); } });
  // pen cup + "become a member" forms in an acrylic holder
  put(new THREE.CylinderGeometry(0.03, 0.028, 0.09, 14), new THREE.MeshLambertMaterial({ color: 0x1f3f86 }), -3.7, LEDGE_Y + 0.045, LZ);
  [[-0.012, 0.2, 0xc41e1e], [0.01, -0.15, 0x111111], [0, 0.05, 0x1f55c4]].forEach(([dx, tilt, c]) => {
    const pen = put(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 6), new THREE.MeshLambertMaterial({ color: c }), -3.7 + dx, LEDGE_Y + 0.1, LZ); pen.rotation.z = tilt;
  });
  const forms = makeTexture((ctx, W, H) => {
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#00349c"; ctx.fillRect(0, 0, W, 60);
    ctx.fillStyle = "#ffd400"; ctx.font = "bold 30px Arial Black, Arial"; ctx.textAlign = "center"; ctx.fillText("BECOME A MEMBER", W / 2, 42);
    ctx.fillStyle = "#333"; ctx.font = "18px Arial"; ctx.textAlign = "left";
    ["NAME ________________", "ADDRESS _____________", "PHONE _______________", "DRIVER LIC # ________", "", "FREE RENTAL WITH SIGNUP!"].forEach((l, i) => ctx.fillText(l, 20, 100 + i * 34));
  }, 320, 320);
  const holder = new THREE.Group(); holder.position.set(-4.0, LEDGE_Y, LZ); holder.rotation.y = 0; scene.add(holder);
  const acrylicC = new THREE.MeshPhongMaterial({ color: 0xdbe8f0, specular: 0xffffff, shininess: 90, transparent: true, opacity: 0.35, depthWrite: false });
  put(new THREE.BoxGeometry(0.2, 0.2, 0.004), acrylicC, 0, 0.1, 0.04, holder).rotation.x = -0.25;
  const form = put(new THREE.PlaneGeometry(0.17, 0.17), new THREE.MeshLambertMaterial({ map: forms }), 0, 0.1, 0.035, holder); form.rotation.x = -0.25;
  // hanging CHECKOUT sign over the checkout run, two panels back to back on cables
  {
    const sx = -4.2, sy = 2.75, tex = textPlane("CHECKOUT", 1.6, 0.4).material.map, m = new THREE.MeshLambertMaterial({ map: tex });
    const f = put(new THREE.PlaneGeometry(1.6, 0.4), m, sx, sy, 4.005); const b = put(new THREE.PlaneGeometry(1.6, 0.4), m, sx, sy, 3.995); b.rotation.y = Math.PI;
    for (const cx of [sx - 0.6, sx + 0.6]) put(new THREE.CylinderGeometry(0.006, 0.006, STORE.h - sy - 0.2), mat.dark, cx, (STORE.h + sy + 0.2) / 2, 4);
  }

  // ---- back cabinet under the front window: phone, paper bags, reserved holds ----
  {
    const bx0 = -6.9, bx1 = -3.4, bz = FRONT + 0.25, BHt = 0.82;
    box(bx1 - bx0, BHt - 0.03, 0.46, mat.counter, (bx0 + bx1) / 2, (BHt - 0.03) / 2, bz);
    box(bx1 - bx0 + 0.02, 0.03, 0.5, mat.counterTop, (bx0 + bx1) / 2, BHt - 0.015, bz);
    for (let d = bx0 + 0.05; d + 0.5 <= bx1; d += 0.52) {
      box(0.49, BHt - 0.14, 0.015, blueDk, d + 0.25, (BHt - 0.03) / 2 + 0.02, bz + 0.232);
      box(0.012, 0.12, 0.02, chromeC, d + 0.43, BHt - 0.2, bz + 0.245);
    }
    colliders.push({ x0: bx0, x1: bx1, z0: FRONT, z1: bz + 0.25, y1: BHt });
    // multi-line desk phone (a 2565-style key set): sloped body, handset across the cradle, a Touch-Tone pad,
    // a row of lit line buttons along the front, and a coiled cord. Its front faces you behind the counter
    const ph = new THREE.Group(); ph.position.set(-6.4, BHt, bz); scene.add(ph); PHONE_AT.set(-6.4, BHt + 0.08, bz);
    const slope = Math.atan2(0.04, 0.22);
    const prof = new THREE.Shape([new THREE.Vector2(-0.11, 0), new THREE.Vector2(0.11, 0), new THREE.Vector2(0.11, 0.075), new THREE.Vector2(-0.11, 0.035)]);
    const bodyG = new THREE.ExtrudeGeometry(prof, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 3, curveSegments: 1 });
    bodyG.rotateY(Math.PI / 2); bodyG.translate(-0.11, 0.008, 0);   // profile x -> -z: the low edge at the front (+z)
    put(bodyG, beigeP, 0, 0, 0, ph);
    const top = new THREE.Group(); top.position.set(0, 0.071, 0); top.rotation.x = slope; ph.add(top);   // the sloped top face
    put(new THREE.BoxGeometry(0.085, 0.003, 0.1), blackC, 0, 0.001, 0.045, top);                         // keypad bezel
    const keyM = new THREE.MeshPhongMaterial({ color: 0xf2efe6, shininess: 40 });
    for (let i = 0; i < 12; i++) put(new THREE.BoxGeometry(0.019, 0.007, 0.015), keyM, -0.025 + (i % 3) * 0.025, 0.004, 0.01 + Math.floor(i / 3) * 0.022, top);
    const digits = makeTexture((ctx, W, H) => {
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#222"; ctx.font = "bold 24px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      "123456789*0#".split("").forEach((c, i) => ctx.fillText(c, W * (0.5 + (i % 3 - 1) * 0.294), H * (0.225 + Math.floor(i / 3) * 0.1833)));
    }, 128, 180);
    const keyLbl = put(new THREE.PlaneGeometry(0.085, 0.12), new THREE.MeshBasicMaterial({ map: digits, transparent: true, depthWrite: false }), 0, 0.0078, 0.043, top);
    keyLbl.rotation.x = -Math.PI / 2;
    for (const x of [-0.085, 0.085]) put(new THREE.BoxGeometry(0.04, 0.02, 0.05), beigeP, x, 0.008, -0.055, top);   // cradle horns
    put(new THREE.BoxGeometry(0.008, 0.006, 0.012), blackC, 0.085, 0.02, -0.055, top);                     // hookswitch plunger
    const handset = new THREE.Group(); handset.position.set(0, 0.044, -0.055); top.add(handset);
    const grip = put(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 12), beigeP, 0, 0.012, 0, handset); grip.rotation.z = Math.PI / 2; grip.scale.set(1, 1, 1.5);
    for (const x of [-0.09, 0.09]) {                  // earpiece / mouthpiece cups, flared, face down in the cradle
      put(new THREE.CylinderGeometry(0.022, 0.034, 0.036, 24), beigeP, x, -0.004, 0, handset);
      put(new THREE.TorusGeometry(0.03, 0.003, 8, 24).rotateX(Math.PI / 2), beigeP, x, -0.022, 0, handset);   // rolled rim
      put(new THREE.CylinderGeometry(0.027, 0.027, 0.002, 24), blackC, x, -0.0225, 0, handset);                // grille
    }
    const lampOff = new THREE.MeshLambertMaterial({ color: 0xcfd6d8 }), lampLit = new THREE.MeshBasicMaterial({ color: 0xffb040 }), lampMsg = new THREE.MeshBasicMaterial({ color: 0xff3030 });
    const lamps = [];                                 // line buttons: clear plastic, lit from behind
    for (let i = 0; i < 6; i++) lamps.push(put(new THREE.BoxGeometry(0.024, 0.014, 0.008), lampOff, -0.075 + i * 0.03, 0.022, 0.122, ph));
    put(new THREE.BoxGeometry(0.2, 0.004, 0.006), blackC, 0, 0.034, 0.12, ph);                             // designation strip over them
    // coiled cord: handset's left end, down onto the cabinet top, back up into the body's side
    const A = new THREE.Vector3(-0.1, 0.075, -0.05), B = new THREE.Vector3(-0.125, 0.02, 0.02), C = new THREE.Vector3(-0.2, -0.02, 0.0);
    const spine = new THREE.QuadraticBezierCurve3(A, C, B);
    const coil = new THREE.Curve(); coil.getPoint = (t, v = new THREE.Vector3()) => {
      const p = spine.getPoint(t), tg = spine.getTangent(t), n = new THREE.Vector3(0, 0, 1).cross(tg).normalize(), b = tg.clone().cross(n), a = t * Math.PI * 2 * 26;
      p.y = Math.max(p.y, 0.004); return v.copy(p).addScaledVector(n, 0.005 * Math.cos(a)).addScaledVector(b, 0.005 * Math.sin(a));
    };
    put(new THREE.TubeGeometry(coil, 520, 0.0018, 5), beigeP, 0, 0, 0, ph);
    phoneLook = now => {                              // handset off the hook while you're on a call; line 1 flashes while it rings
      handset.visible = !phone.call && !phone.out;
      lamps[0].material = phone.call || phone.out || (phone.ring && now % 1000 < 500) ? lampLit : lampOff;
      lamps[5].material = posTerm?.inbox() ? lampMsg : lampOff;   // message waiting: see the register (M)
    };
    ph.traverse(m => { if (m.isMesh) { m.userData.phone = true; aimables.push(m); } });
    // the staff's own little wastebasket, in the corner between the cabinet and the wall (post-its, receipts, wrappers)
    {
      const cx = (WALL_L + bx0) / 2, cz = bz;
      const can = put(new THREE.LatheGeometry([[0.1, 0], [0.125, 0.34], [0.118, 0.34], [0.094, 0.012], [0.001, 0.012]].map(([r, y]) => new THREE.Vector2(r, y)), 24),
        new THREE.MeshPhongMaterial({ color: 0x2d3440, specular: 0x333333, shininess: 25, side: THREE.DoubleSide }), cx, 0, cz);
      const liner = put(new THREE.TorusGeometry(0.123, 0.005, 6, 28), new THREE.MeshLambertMaterial({ color: 0xd8dde2 }), cx, 0.34, cz); liner.rotation.x = Math.PI / 2;
      trashBins.counter = { id: "counter", name: "counter wastebasket", cap: 8, x: cx, z: cz, rimY: 0.34, r: 0.1, liner: 0xd8dde2, parts: [can, liner], stand: { x: cx + 0.15, z: cz + 0.62, ry: Math.PI } };
      colliders.push({ x0: cx - 0.13, x1: cx + 0.13, z0: cz - 0.13, z1: cz + 0.13, y1: 0.34 });
    }
    // stack of brown paper bags
    const kraft = new THREE.MeshLambertMaterial({ color: 0xa8804f });
    for (let i = 0; i < 6; i++) put(new THREE.BoxGeometry(0.3, 0.008, 0.2), kraft, -5.75 + (i % 2) * 0.01, BHt + 0.004 + i * 0.008, bz).rotation.y = Math.PI / 2;   // turned endwise, clear of the job board
    // reserved holds: whatever's been put aside for someone, stacked with a slip on each (see holdsRender)
    const pad = put(new THREE.BoxGeometry(0.4, 0.2, 0.34), new THREE.MeshBasicMaterial({ visible: false }), -4.4, BHt + 0.1, bz);
    pad.userData.holds = true; aimables.push(pad);
    const tray = put(new THREE.BoxGeometry(0.34, 0.012, 0.26), new THREE.MeshLambertMaterial({ color: 0x2a2e35 }), -4.4, BHt + 0.006, bz);
    const lbl = textPlane("HOLDS", 0.12, 0.035, "#222", "#fff59a", "Arial Black", 60); lbl.material = new THREE.MeshLambertMaterial({ map: lbl.material.map });
    lbl.position.set(-4.4, BHt + 0.0125, bz + 0.1); lbl.rotation.x = -Math.PI / 2; lbl.rotation.z = Math.PI; scene.add(lbl);
    HOLDS_AT.set(-4.4, BHt + 0.012, bz);
    // Dana's job board: a little cork board on an easel, facing the register
    const jb = new THREE.Group(); jb.position.set(-5.25, BHt, bz - 0.08); jb.rotation.x = -0.12; scene.add(jb);
    const frame = put(new THREE.BoxGeometry(0.52, 0.36, 0.02), new THREE.MeshLambertMaterial({ color: 0x5a3b22 }), 0, 0.2, 0, jb);
    const cork = put(new THREE.BoxGeometry(0.47, 0.31, 0.012), new THREE.MeshLambertMaterial({ map: makeTexture((g, w, h) => {
      g.fillStyle = "#b98a55"; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${90 + Math.random() * 60},${60 + Math.random() * 40},30,.35)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      g.fillStyle = "#fff8c8"; g.fillRect(w * 0.08, h * 0.1, w * 0.84, h * 0.2); g.fillStyle = "#222"; g.font = `bold ${h * 0.12}px Arial`; g.textAlign = "center"; g.fillText("JOB BOARD", w / 2, h * 0.25);
      ["#ffd6d6", "#d6f0ff", "#e3ffd6", "#fff0c8", "#f0d6ff", "#d6fff4"].forEach((c, i) => { g.fillStyle = c; g.fillRect(w * (0.08 + (i % 3) * 0.29), h * (0.4 + Math.floor(i / 3) * 0.28), w * 0.25, h * 0.22); });
    }, 256, 170) }), 0, 0.2, 0.012, jb);
    for (const m of [frame, cork]) { m.userData.jobBoard = true; aimables.push(m); }
    jobBoardMesh = { g: jb, parts: [frame, cork] };   // (simulation: it goes up once Dana's hired — see amenities)
  }

  const kind = textPlane("BE KIND, REWIND", 1.6, 0.55); kind.position.set(0, 3.1, 0.16);
  kind.material = new THREE.MeshLambertMaterial({ map: kind.material.map }); // lit by the room, no unlit glow in the dark
  scene.add(kind);

  // mural stays centered on the corridor/TV-lounge axis (x=0), not the now-
  // asymmetric wall's own center — that's the sightline it's actually built for
  const logo = textPlane("JELLYBUSTER", 6, 1.2, "#ffd400", "#00349c");        // back-wall mural
  logo.position.set(0, 3.0, STORE.z - 0.15); logo.rotation.y = Math.PI;      // up where the couch can see it
  logo.material = new THREE.MeshLambertMaterial({ map: logo.material.map }); // lit by the room, dims in lights-out
  scene.add(logo);
  const tag = textPlane("WOW! WHAT A SELECTION.", 3.2, 0.4, "#fff", "#001f5c");
  tag.position.set(0, 2.1, STORE.z - 0.15); tag.rotation.y = Math.PI;   // above the TV cabinet, under the mural — the lounge sits against this wall
  tag.material = new THREE.MeshLambertMaterial({ map: tag.material.map }); // lit by the room, no unlit glow in the dark
  scene.add(tag);
}

const corkCanvas = document.createElement("canvas"); corkCanvas.width = 1040; corkCanvas.height = 680;   // (drawn by corkDraw)
const corkTex = new THREE.CanvasTexture(corkCanvas); corkTex.colorSpace = THREE.SRGBColorSpace;
// ---------------- entry lane: half wall + security gates ----------------
// The counters line the west side of the path in from the doors; a half wall
// mirrors them on the east side (with the community corkboard standing on it), and anti-theft gate pedestals (the "metal
// detector") span the lane past the RETURNS counter. Three pedestals make two ~1.2m lanes;
// the gaps at the counter and at the rail (~0.45-0.5m) are narrower than the
// player (0.64m), so walking in means walking through a gate.
{
  const BX = 1.95, Z0 = 0.15, Z1 = 4.35, HW = 1.05, T = 0.12;   // wall line: front wall -> level with the checkout's customer edge; height, thickness
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); scene.add(o); aimBlockers.push(o); return o; };   // (no reaching through it to the shelves behind)
  const wood = new THREE.MeshLambertMaterial({ color: 0x7a5232 }), woodDk = new THREE.MeshLambertMaterial({ color: 0x5a3a22 });
  add(new THREE.BoxGeometry(T, HW, Z1 - Z0), mat.wall, BX, HW / 2, (Z0 + Z1) / 2);                          // the wall
  add(new THREE.BoxGeometry(T + 0.002, 0.1, Z1 - Z0 + 0.002), new THREE.MeshLambertMaterial({ color: 0x1d3f9e }), BX, 0.05, (Z0 + Z1) / 2);   // blue base, like the counters
  add(new THREE.BoxGeometry(T + 0.06, 0.04, Z1 - Z0 + 0.04), wood, BX, HW + 0.02, (Z0 + Z1) / 2);            // wood cap
  // the corkboard: on two legs screwed into the cap behind it, facing the lane (-x)
  const CZ = 2.3, CW = 1.3, CH = 0.85, CY = HW + 0.12 + CH / 2;
  for (const dz of [-CW / 2 + 0.05, CW / 2 - 0.05]) add(new THREE.BoxGeometry(0.04, CY + CH / 2 - HW - 0.04, 0.05), woodDk, BX + 0.042, (HW + CY + CH / 2) / 2 + 0.02, CZ + dz);
  add(new THREE.BoxGeometry(0.04, CH + 0.06, CW + 0.06), woodDk, BX, CY, CZ);                                 // frame (and the back)
  const cork = add(new THREE.PlaneGeometry(CW, CH), new THREE.MeshLambertMaterial({ map: corkTex }), BX - 0.021, CY, CZ); cork.rotation.y = -Math.PI / 2;
  colliders.push({ x0: BX - T / 2, x1: BX + T / 2, z0: Z0, z1: Z1 });

  const GZ = GATE_Z;                           // gate line: past the RETURNS counter, level with the checkout corner and the rail's far end
  const grey = new THREE.MeshLambertMaterial({ color: 0x3a3f46 });
  const acrylic = new THREE.MeshPhongMaterial({ color: 0xdbe8f0, specular: 0xffffff, shininess: 90, transparent: true, opacity: 0.3, depthWrite: false });
  const led = gateLed = new THREE.MeshBasicMaterial({ color: 0x39ff7a });   // shared by all three: flashes red when the alarm trips
  const plate = textPlane("SECURITY", 0.3, 0.07, "#fff", "#2b3038"); plate.material = new THREE.MeshLambertMaterial({ map: plate.material.map });
  for (const x of [-1.35, 0, 1.35]) {
    const g = new THREE.Group(); g.position.set(x, 0, GZ); scene.add(g);
    const add = (geo, m, px, py, pz) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); g.add(o); return o; };
    add(new THREE.BoxGeometry(0.12, 0.08, 0.52), grey, 0, 0.04, 0);                       // floor base
    add(new THREE.BoxGeometry(0.03, 1.42, 0.42), acrylic, 0, 0.08 + 0.71, 0);            // clear antenna panel
    for (const z of [-0.215, 0.215]) add(new THREE.BoxGeometry(0.05, 1.42, 0.035), grey, 0, 0.08 + 0.71, z);   // side frames
    add(new THREE.BoxGeometry(0.12, 0.07, 0.52), grey, 0, 1.535, 0);                      // top cap
    glow(add(new THREE.BoxGeometry(0.03, 0.02, 0.08), led, 0, 1.58, 0.14));               // status LED
    for (const sx of [-1, 1]) {                                                           // SECURITY plate, both faces
      const p = plate.clone(); p.position.set(sx * 0.018, 1.36, 0); p.rotation.y = sx * Math.PI / 2; g.add(p);
    }
    colliders.push({ x0: x - 0.06, x1: x + 0.06, z0: GZ - 0.26, z1: GZ + 0.26 });
  }
}

// ---------------- lobby trash receptacle ----------------
// Commercial lobby bin, not a plain can: wood-slat cabinet on a bronze plinth,
// brass trim bands, molded top, and a swinging "THANK YOU" push flap. Stands on
// the carpet just past the entry rail, facing into the store. E with a snack,
// drink or popcorn in hand throws it away (the flap swings in).
let trashFlap = null, trashFlapT = 0, trashFlapRest = 0;   // rest: held ajar when the bin's nearly full
{
  const TX = 2.5, TZ = 3.85, W = 0.56, H = 1.02;
  const g = new THREE.Group(); g.position.set(TX, 0, TZ); g.rotation.y = 0; scene.add(g);   // front faces +z, into the store
  const bronze = new THREE.MeshPhongMaterial({ color: 0x3b2a1c, specular: 0x6b5238, shininess: 35 });
  const brass = new THREE.MeshPhongMaterial({ color: 0xb08432, specular: 0xffe2a0, shininess: 70 });
  const slats = makeTexture((ctx, w, h) => {
    const n = 7;
    for (let i = 0; i < n; i++) {
      const x = i * w / n, hue = [28, 25, 30, 26, 29, 27, 24][i];
      ctx.fillStyle = `hsl(${hue} 48% ${30 + (i % 3) * 3}%)`; ctx.fillRect(x, 0, w / n, h);
      ctx.strokeStyle = "rgba(40,20,8,.35)"; ctx.lineWidth = 1;                  // wood grain
      for (let k = 0; k < 6; k++) { ctx.beginPath(); const gx = x + 4 + Math.random() * (w / n - 8); ctx.moveTo(gx, 0); ctx.bezierCurveTo(gx + 3, h * 0.3, gx - 3, h * 0.7, gx + 1, h); ctx.stroke(); }
      ctx.fillStyle = "#1c1008"; ctx.fillRect(x, 0, 3, h);                        // groove between boards
    }
  }, 256, 512);
  const wood = new THREE.MeshLambertMaterial({ map: slats });
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };
  const parts = [];
  parts.push(add(new THREE.BoxGeometry(W + 0.06, 0.08, W + 0.06), bronze, 0, 0.04, 0));                 // plinth
  parts.push(add(new THREE.BoxGeometry(W - 0.02, H - 0.1, W - 0.02), wood, 0, 0.08 + (H - 0.1) / 2, 0)); // slatted body
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
    parts.push(add(new THREE.BoxGeometry(0.045, H - 0.08, 0.045), bronze, x * W / 2, 0.08 + (H - 0.08) / 2, z * W / 2));   // corner posts
  for (const y of [0.16, H - 0.1]) parts.push(add(new THREE.BoxGeometry(W + 0.02, 0.025, W + 0.02), brass, 0, y, 0));   // brass bands
  parts.push(add(new THREE.BoxGeometry(W + 0.08, 0.05, W + 0.08), bronze, 0, H + 0.025, 0));             // molded top
  parts.push(add(new THREE.BoxGeometry(W - 0.04, 0.03, W - 0.04), bronze, 0, H + 0.065, 0));             // raised center
  for (const [dx, dz, w, d] of [[0, 1, W + 0.08, 0.02], [0, -1, W + 0.08, 0.02], [1, 0, 0.02, W + 0.08], [-1, 0, 0.02, W + 0.08]])
    parts.push(add(new THREE.BoxGeometry(w, 0.04, d), brass, dx * (W / 2 + 0.03), H + 0.07, dz * (W / 2 + 0.03)));   // tray rim
  // push flap on the front: bronze panel hinged at its top edge, gold "THANK YOU"
  parts.push(add(new THREE.BoxGeometry(0.44, 0.3, 0.012), new THREE.MeshLambertMaterial({ color: 0x0c0806 }), 0, 0.74, W / 2 - 0.004));   // dark opening behind it
  trashFlap = new THREE.Group(); trashFlap.position.set(0, 0.88, W / 2 + 0.006); g.add(trashFlap);
  const flap = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.26, 0.014), bronze); flap.position.y = -0.13; trashFlap.add(flap); parts.push(flap);
  const thanks = textPlane("THANK YOU", 0.34, 0.08, "#e3b64a", "#3b2a1c");
  thanks.material = new THREE.MeshLambertMaterial({ map: thanks.material.map }); thanks.position.set(0, -0.13, 0.008); trashFlap.add(thanks); parts.push(thanks);
  const over = new THREE.Group(); over.position.set(0, 0.63, W / 2 + 0.02); g.add(over); over.visible = false;   // nearly full: what's stopping the flap closing
  const wad = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045, 0), new THREE.MeshLambertMaterial({ color: 0xf0ede4 })); wad.position.set(0.09, 0, 0.01); over.add(wad);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.13, 12), new THREE.MeshLambertMaterial({ color: 0xc8302a })); cup.rotation.set(0.3, 0, Math.PI / 2 - 0.2); cup.position.set(-0.08, 0.005, 0.02); over.add(cup);
  const wrap = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.006, 0.06), new THREE.MeshLambertMaterial({ color: 0xe0b020 })); wrap.position.set(0, -0.02, 0.03); wrap.rotation.set(0.4, 0.5, 0); over.add(wrap);
  parts.push(wad, cup, wrap);
  trashBins.lobby = { id: "lobby", name: "lobby trash", cap: 16, x: TX, z: TZ, closed: true, liner: 0x1c1c1e, parts, over, stand: { x: TX, z: TZ + 0.7, ry: Math.PI } };
  colliders.push({ x0: TX - W / 2 - 0.04, x1: TX + W / 2 + 0.04, z0: TZ - W / 2 - 0.04, z1: TZ + W / 2 + 0.04 });
}

// ---------------- lobby extras: tile entry, snacks, popcorn ----------------
// real video stores tiled the entry/checkout zone and carpeted the aisles —
// same trick here: a terrazzo plane laid right over the carpet up
// front, flecked in the store's blue and yellow, split into big panels by
// brass divider strips, with a blue border band where it meets the carpet.
{
  const PANEL = 1.2;                           // meters per terrazzo panel (one texture repeat)
  const tileTex = makeTexture((ctx, W, H) => {
    ctx.fillStyle = "#e6e0d2"; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 9000; i++) {           // fine cement grain
      ctx.fillStyle = Math.random() < 0.5 ? "rgba(120,110,95,.18)" : "rgba(255,255,255,.35)";
      ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5);
    }
    // aggregate chips: irregular little polygons, mostly neutral stone with brand-color confetti
    const chips = [["#1d4296", 0.2], ["#00349c", 0.14], ["#ffd400", 0.12], ["#1a1a1c", 0.1], ["#8f887b", 0.2], ["#fbf8f0", 0.14], ["#b9b1a1", 0.1]];
    const pickChip = () => { let r = Math.random(); for (const [c, w] of chips) if ((r -= w) < 0) return c; return chips[0][0]; };
    for (let i = 0; i < 2600; i++) {
      const cx = Math.random() * W, cy = Math.random() * H, r = 1.5 + Math.random() ** 2.2 * 9;
      const n = 4 + Math.floor(Math.random() * 3), rot = Math.random() * Math.PI * 2;
      ctx.fillStyle = pickChip(); ctx.beginPath();
      for (let k = 0; k < n; k++) {
        const a = rot + k / n * Math.PI * 2, rr = r * (0.6 + Math.random() * 0.4);
        ctx[k ? "lineTo" : "moveTo"](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      ctx.fill();
    }
    ctx.strokeStyle = "#b8923a"; ctx.lineWidth = 6;   // brass divider strips, split across the wrap so they tile seamlessly
    ctx.strokeRect(0, 0, W, H);
  }, 1024, 1024);
  // tile covers just the entry lane + counter area: it ends with the entry rail
  // (z 4.35, level with the checkout edge) and at the rail line (x 1.95) — carpet
  // past the rail and out to the glass on the east side
  const TILE_Z = 4.35, TILE_X1 = 1.95, BORDER = 0.14;
  const XC = (WALL_L + TILE_X1) / 2, XW = TILE_X1 - WALL_L;
  tileTex.repeat.set(XW / PANEL, TILE_Z / PANEL);
  tileTex.offset.set(-((XW / PANEL) % 1), 0);   // panel seams line up with the rail edge, not the side wall
  // matte on purpose: a Phong sheen here pays per-pixel specular for every point
  // light in the store (~40, mostly poster marquees) across a floor that fills
  // the screen up close — it more than halved the frame rate in the lobby
  const terrazzo = new THREE.MeshLambertMaterial({ map: tileTex });
  const tile = new THREE.Mesh(new THREE.PlaneGeometry(XW, TILE_Z), terrazzo);
  tile.rotation.x = -Math.PI / 2; tile.position.set(XC, 0.003, TILE_Z / 2); scene.add(tile);
  const band = new THREE.MeshLambertMaterial({ color: BLUE });
  for (const [w, d, x, z] of [[XW, BORDER, XC, TILE_Z - BORDER / 2], [BORDER, TILE_Z - BORDER, TILE_X1 - BORDER / 2, (TILE_Z - BORDER) / 2]]) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(w, d), band);
    b.rotation.x = -Math.PI / 2; b.position.set(x, 0.008, z); scene.add(b);   // 5 mm over the tile — 1 mm flickered at a distance
  }
}
// ---------------- snack center: drink cooler; the popcorn machine (out in the theater's lobby) ----------------
// The cooler's against the movie-side wall, just past the register's
// customer edge (z 4.35), all facing the store. Each is modeled in its own local
// frame — front faces +z, width along x, origin at floor center — then turned
// to face +x. Local +x ends up pointing north (toward the register).
const SNACK_ZONE = [4.5, 6.1];               // wall z-span the cooler covers — side-wall posters skip it
// Branding slots: set window.STORE_BRANDING = { "cooler-marquee": "data:image/…", … }
// (data URIs — file:// can't feed local image files to WebGL) to swap in real
// art; each slot otherwise draws a placeholder. Slot sizes (w x h, meters):
//   cooler-marquee 0.74x0.2 · cooler-side 0.7x1.66 · popcorn-header 0.52x0.11
//   popcorn-cart 0.54x0.54 · snack-header 0.96x0.28
const BRANDING = window.STORE_BRANDING || {};
function brandTex(slot, w, h, draw) {
  if (BRANDING[slot]) { const t = new THREE.TextureLoader().load(BRANDING[slot]); t.colorSpace = THREE.SRGBColorSpace; return t; }
  const k = 512 / Math.max(w, h);
  return makeTexture(draw, Math.round(w * k), Math.round(h * k));
}
let coolerDoor = null, coolerOpen = false, coolerThermo = null;
let popcornKit = null;                       // cup geometry/material + popcorn texture, reused for the box in your hand
let buildSnackRack = null;                   // (width, header) -> a stocked snack rack group; set in the snack center
{
  const WX = WALL_L + 0.1;                    // movie-side wall's inner face
  const addTo = (parent, geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const place = (g, depth, width, z) => {     // back against the wall, facing the store, plus a footprint collider
    g.rotation.y = Math.PI / 2; g.position.set(WX + 0.01 + depth / 2, 0, z); scene.add(g);
    colliders.push({ x0: WX, x1: WX + 0.01 + depth, z0: z - width / 2, z1: z + width / 2 });
  };

  const chrome = new THREE.MeshPhongMaterial({ color: 0xc9cdd2, specular: 0xffffff, shininess: 90 });
  const glass = new THREE.MeshLambertMaterial({ color: 0xcfe9f7, transparent: true, opacity: 0.16, depthWrite: false });

  // ---- drink cooler: glass-door merchandiser, 0.78 wide, 2.1 tall with its marquee ----
  {
    const W = 0.78, D = 0.74, H = 1.86, KICK = 0.1, T = 0.035, CZ = 5.25;
    const g = new THREE.Group();
    const shell = new THREE.MeshLambertMaterial({ color: 0x1b1d22 });
    const liner = new THREE.MeshLambertMaterial({ color: 0xe4ebf1, emissive: 0xa9bdd0, emissiveIntensity: 0.35 });   // lit interior — glows a bit in lights-out, like a real one
    for (const sx of [-1, 1]) addTo(g, new THREE.BoxGeometry(T, H, D), shell, sx * (W / 2 - T / 2), H / 2, 0);
    addTo(g, new THREE.BoxGeometry(W, T, D), shell, 0, H - T / 2, 0);
    addTo(g, new THREE.BoxGeometry(W, H, T), shell, 0, H / 2, -D / 2 + T / 2);
    const slats = makeTexture((ctx, w, h) => {
      ctx.fillStyle = "#15171b"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#2c3036"; for (let y = 6; y < h; y += 14) ctx.fillRect(10, y, w - 20, 6);
    }, 256, 64);
    addTo(g, new THREE.BoxGeometry(W, KICK, D - 0.02), new THREE.MeshLambertMaterial({ map: slats }), 0, KICK / 2, -0.01);  // louvered kick plate
    // interior: liner walls, floor, a light strip up top, and shelves
    const IW = W - 2 * T, IB = -D / 2 + T, IF = D / 2 - 0.05, ID = IF - IB, IH = H - T - KICK;
    addTo(g, new THREE.BoxGeometry(IW, IH, 0.01), liner, 0, KICK + IH / 2, IB + 0.005);
    for (const sx of [-1, 1]) addTo(g, new THREE.BoxGeometry(0.01, IH, ID), liner, sx * (IW / 2 - 0.005), KICK + IH / 2, (IB + IF) / 2);
    addTo(g, new THREE.BoxGeometry(IW, 0.01, ID), liner, 0, KICK + 0.005, (IB + IF) / 2);
    addTo(g, new THREE.BoxGeometry(IW, 0.01, ID), liner, 0, H - T - 0.005, (IB + IF) / 2);
    glow(addTo(g, new THREE.BoxGeometry(IW - 0.06, 0.018, 0.03), new THREE.MeshBasicMaterial({ color: 0xf4f9ff }), 0, H - T - 0.025, IF - 0.04));
    const wire = new THREE.MeshLambertMaterial({ color: 0x9aa3ad });
    const priceStrip = new THREE.MeshLambertMaterial({ color: 0xffffff });
    // shelf tops (y) for stocking drinks later — plus the cooler floor at KICK
    g.userData.shelves = [0.46, 0.8, 1.14, 1.48];
    for (const y of g.userData.shelves) {
      addTo(g, new THREE.BoxGeometry(IW - 0.02, 0.012, ID - 0.04), wire, 0, y - 0.006, (IB + IF) / 2 - 0.01);
      addTo(g, new THREE.BoxGeometry(IW - 0.02, 0.028, 0.006), priceStrip, 0, y - 0.01, IF - 0.03);     // price-tag strip on the shelf lip
    }
    // ---- drinks: each unit is a small group (body, label, cap); every mesh in it
    // points back to the unit so the whole bottle/can is what you grab ----
    {
      const levels = [KICK + 0.01, ...g.userData.shelves];          // floor, then each shelf top
      const layout = [[[0], 1], [[1, 2], 1], [[3, 4], 1], [[5, 6], 1], [[7, 8, 9], 2]];   // [products, stack height] per level
      const silver = new THREE.MeshPhongMaterial({ color: 0xc7ccd2, specular: 0xffffff, shininess: 80 });
      const labelTex = (p, w, h) => makeTexture((ctx, W, H) => {
        ctx.fillStyle = p.label[0]; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = p.label[1]; ctx.fillRect(0, H * 0.08, W, H * 0.05); ctx.fillRect(0, H * 0.87, W, H * 0.05);
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        let f = H * 0.42; ctx.font = `italic 900 ${f}px Arial Black, Arial`;
        while (ctx.measureText(p.name).width > W * 0.4 && f > 8) { f -= 2; ctx.font = `italic 900 ${f}px Arial Black, Arial`; }
        for (const cx of [0.25, 0.75]) ctx.fillText(p.name, W * cx, H / 2);   // front + back of the wrap
      }, w, h);
      const lathe = (pts, m) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 24), m);
      const build = p => {                    // one template per product; units are clones (shared geometry/materials)
        const u = new THREE.Group(), { r, h } = p;
        if (p.shape === "can") {
          const side = new THREE.MeshLambertMaterial({ map: labelTex(p, 512, Math.round(512 * h / (Math.PI * 2 * r))) });
          const can = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h * 0.94, 24).rotateY(-Math.PI / 2), [side, silver, silver]);
          can.position.y = h * 0.47; u.add(can);
          u.add(lathe([[r, h * 0.94], [r * 0.86, h * 0.985], [r * 0.84, h], [0, h]], silver));   // tapered top + lid
          u.add(lathe([[0, 0], [r * 0.84, 0], [r, h * 0.03]], silver));                           // domed bottom rim
        } else {
          const long = p.shape === "longneck";
          const body = long
            ? [[0, 0], [r * 0.92, 0], [r, 0.012], [r, h * 0.55], [r * 0.9, h * 0.62], [r * 0.42, h * 0.76], [r * 0.38, h * 0.95], [0.001, h * 0.95]]
            : [[0, 0], [r * 0.9, 0], [r, 0.01], [r, h * 0.28], [r * 0.9, h * 0.34], [r, h * 0.42], [r, h * 0.62], [r * 0.92, h * 0.7], [r * 0.45, h * 0.84], [r * 0.42, h * 0.92], [0.001, h * 0.92]];
          const glassMat = new THREE.MeshPhongMaterial({ color: p.glass, specular: 0xffffff, shininess: 90, transparent: p.opacity < 1, opacity: p.opacity });
          u.add(lathe(body, glassMat));
          const [l0, l1] = long ? [0.14, 0.44] : [0.42, 0.62];                 // label band, as fractions of height
          const band = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.0015, r + 0.0015, h * (l1 - l0), 24, 1, true).rotateY(-Math.PI / 2),
            new THREE.MeshLambertMaterial({ map: labelTex(p, 512, Math.round(512 * h * (l1 - l0) / (Math.PI * 2 * r))) }));
          band.position.y = h * (l0 + l1) / 2; u.add(band);
          const capMat = new THREE.MeshPhongMaterial({ color: p.cap, specular: 0xffffff, shininess: 50 });
          const cap = long ? new THREE.CylinderGeometry(r * 0.42, r * 0.44, h * 0.05, 16) : new THREE.CylinderGeometry(r * 0.47, r * 0.47, h * 0.08, 16);
          const capM = new THREE.Mesh(cap, capMat); capM.position.y = long ? h * 0.975 : h * 0.96; u.add(capM);
        }
        u.userData.snack = p;
        return u;
      };
      layout.forEach(([ids, stack], li) => {
        const segW = (IW - 0.03) / ids.length;
        ids.forEach((pi, si) => {
          const p = DRINK_PRODUCTS[pi], tmpl = build(p), pitch = 2 * p.r + 0.008;
          const across = Math.max(1, Math.floor(segW / pitch));
          const x0 = -(IW - 0.03) / 2 + si * segW + (segW - (across - 1) * pitch) / 2;
          for (let row = 0; row < 3; row++) for (let a = 0; a < across; a++) for (let k = 0; k < stack; k++) {
            const u = tmpl.clone();
            u.position.set(x0 + a * pitch, levels[li] + k * p.h, IF - 0.05 - p.r - row * (2 * p.r + 0.012));
            u.traverse(m => { if (m.isMesh) { m.userData.unit = u; aimables.push(m); } });
            g.add(u);
          }
        });
      });
    }
    // digital thermometer, stuck in the top hinge-side corner behind the glass
    const thermoTex = makeTexture(() => {}, 128, 64);
    const tctx = thermoTex.image.getContext("2d");
    const thermo = new THREE.Group(); thermo.position.set(IW / 2 - 0.065, H - T - 0.075, IF - 0.02); g.add(thermo);
    addTo(thermo, new THREE.BoxGeometry(0.085, 0.048, 0.016), new THREE.MeshLambertMaterial({ color: 0xe9ecef }), 0, 0, 0);
    addTo(thermo, new THREE.PlaneGeometry(0.066, 0.03), new THREE.MeshBasicMaterial({ map: thermoTex }), 0, 0.002, 0.0085);
    coolerThermo = {
      temp: 36, shown: null,
      tick(dt) {                              // climbs toward room temperature while the door's open; pulls back down to 36°F (slowly) once it shuts
        this.temp += ((coolerOpen ? 66 : 36) - this.temp) * Math.min(1, dt * (coolerOpen ? (upg.compressor ? 0.012 : 0.02) : (upg.compressor ? 0.03 : 0.012)));
        const t = Math.round(this.temp);
        if (t === this.shown) return;
        this.shown = t;
        tctx.fillStyle = "#9fb89a"; tctx.fillRect(0, 0, 128, 64);                    // backlit LCD
        tctx.fillStyle = "#1d2a1c"; tctx.textAlign = "right"; tctx.textBaseline = "middle";
        tctx.font = "bold 44px 'Courier New', monospace"; tctx.fillText(String(t), 92, 34);
        tctx.font = "bold 20px Arial"; tctx.fillText("°F", 122, 24);
        thermoTex.needsUpdate = true;
      },
    };
    coolerThermo.tick(0);
    // full glass door, hinged on the register-side (+x) edge, swings out
    coolerDoor = new THREE.Group(); coolerDoor.position.set(W / 2, 0, D / 2 - 0.02); g.add(coolerDoor);
    const DW = W, DH = H - KICK, SW = 0.05, doorY = KICK + DH / 2;
    const doorParts = [
      addTo(coolerDoor, new THREE.BoxGeometry(SW, DH, 0.04), shell, -SW / 2, doorY, 0),                    // hinge stile
      addTo(coolerDoor, new THREE.BoxGeometry(SW, DH, 0.04), shell, -DW + SW / 2, doorY, 0),               // latch stile
      addTo(coolerDoor, new THREE.BoxGeometry(DW, 0.07, 0.04), shell, -DW / 2, KICK + 0.035, 0),           // bottom rail
      addTo(coolerDoor, new THREE.BoxGeometry(DW, 0.06, 0.04), shell, -DW / 2, H - 0.03, 0),               // top rail
      addTo(coolerDoor, new THREE.BoxGeometry(DW - 2 * SW, DH - 0.13, 0.012), glass, -DW / 2, KICK + 0.07 + (DH - 0.13) / 2, 0),
      addTo(coolerDoor, new THREE.CylinderGeometry(0.012, 0.012, 0.9, 10), chrome, -DW + 0.06, 1.0, 0.06), // pull handle
    ];
    for (const dy of [-0.4, 0.4]) doorParts.push(addTo(coolerDoor, new THREE.BoxGeometry(0.02, 0.02, 0.05), chrome, -DW + 0.06, 1.0 + dy, 0.035));
    for (const p of doorParts) { p.userData.coolerDoor = true; aimables.push(p); }
    // branding: marquee light box on top, full-height graphics on both outer sides
    const MH = 0.24;
    addTo(g, new THREE.BoxGeometry(W, MH, 0.16), shell, 0, H + MH / 2, D / 2 - 0.08);
    const marqueeTex = brandTex("cooler-marquee", 0.74, 0.2, (ctx, w, h) => {
      const gr = ctx.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#e0141e"); gr.addColorStop(1, "#8e0a10");
      ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = `italic 900 ${h * 0.5}px Arial Black, Arial`; ctx.fillText("ICE COLD", w / 2, h * 0.4);
      ctx.font = `bold ${h * 0.22}px Arial`; ctx.fillText("JELLY COLA · DRINKS", w / 2, h * 0.8);
    });
    addTo(g, new THREE.PlaneGeometry(0.74, 0.2), new THREE.MeshBasicMaterial({ map: marqueeTex }), 0, H + MH / 2, D / 2 + 0.001);
    const sideTex = brandTex("cooler-side", 0.7, 1.66, (ctx, w, h) => {
      ctx.fillStyle = "#c8101c"; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#fff"; ctx.lineWidth = w * 0.09;                      // white swoosh
      ctx.beginPath(); ctx.moveTo(-10, h * 0.62); ctx.bezierCurveTo(w * 0.4, h * 0.5, w * 0.6, h * 0.8, w + 10, h * 0.66); ctx.stroke();
      ctx.save(); ctx.translate(w / 2, h * 0.32); ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = `italic 900 ${w * 0.3}px Arial Black, Arial`; ctx.fillText("JELLY", 0, -w * 0.13);
      ctx.fillText("COLA", 0, w * 0.2); ctx.restore();
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = `bold ${w * 0.1}px Arial`; ctx.fillText("ICE COLD", w / 2, h * 0.9);
    });
    const sideMat = new THREE.MeshLambertMaterial({ map: sideTex });
    for (const sx of [-1, 1]) {
      const p = addTo(g, new THREE.PlaneGeometry(0.7, 1.66), sideMat, sx * (W / 2 + 0.001), KICK + 0.03 + 1.66 / 2, 0);
      p.rotation.y = sx * Math.PI / 2;
    }
    place(g, D, W, CZ);
  }

  // ---- popcorn machine: red kettle machine on its cart, condiment shelf on the side. In the theater's lobby, against its
  // north wall just past the concession stand (store/theaterlobby.js), facing the room, a way behind the counter left between them ----
  {
    const PX = -3.05, PWZ = STORE.z + WALL_T / 2, CW = 0.62, CD = 0.46, SHELF = 0.3;
    const g = new THREE.Group();
    const pop = (m, what) => { m.userData.popcorn = what; aimables.push(m); return m; };   // popcorn-sequence targets
    const red = new THREE.MeshLambertMaterial({ color: 0xc8102e });
    const gold = new THREE.MeshPhongMaterial({ color: 0xd4a017, specular: 0xfff0b0, shininess: 60 });
    const black = new THREE.MeshLambertMaterial({ color: 0x141414 });
    // cart: body on casters, gold trim, graphic panel on the front
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      addTo(g, new THREE.CylinderGeometry(0.04, 0.04, 0.035, 12), black, x * (CW / 2 - 0.06), 0.04, z * (CD / 2 - 0.06)).rotation.z = Math.PI / 2;
      addTo(g, new THREE.BoxGeometry(0.03, 0.07, 0.03), chrome, x * (CW / 2 - 0.06), 0.09, z * (CD / 2 - 0.06));
    }
    addTo(g, new THREE.BoxGeometry(CW, 0.66, CD), red, 0, 0.12 + 0.33, 0);
    addTo(g, new THREE.BoxGeometry(CW + 0.02, 0.025, CD + 0.02), gold, 0, 0.79, 0);
    addTo(g, new THREE.BoxGeometry(CW + 0.01, 0.02, CD + 0.01), gold, 0, 0.13, 0);
    const cartTex = brandTex("popcorn-cart", 0.54, 0.54, (ctx, w, h) => {
      for (let i = 0; i < 9; i++) { ctx.fillStyle = i % 2 ? "#fff6e0" : "#d81e2c"; ctx.fillRect(i * w / 9, 0, w / 9 + 1, h); }
      ctx.fillStyle = "#ffd400"; ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.32, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#8e0a10"; ctx.lineWidth = w * 0.02; ctx.stroke();
      ctx.fillStyle = "#b3121d"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = `italic 900 ${w * 0.1}px Arial Black, Arial`; ctx.fillText("FRESH", w / 2, h * 0.43); ctx.fillText("POPCORN", w / 2, h * 0.57);
    });
    addTo(g, new THREE.PlaneGeometry(0.54, 0.54), new THREE.MeshLambertMaterial({ map: cartTex }), 0, 0.46, CD / 2 + 0.001);
    // kettle cabinet: red plinth + corner posts, glass all round, red top with a lit header
    const K0 = 0.8, KH = 0.56, KW = 0.58, KD = 0.42;
    addTo(g, new THREE.BoxGeometry(KW, 0.08, KD), red, 0, K0 + 0.04, 0);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) addTo(g, new THREE.BoxGeometry(0.03, KH, 0.03), red, x * (KW / 2 - 0.015), K0 + 0.08 + KH / 2, z * (KD / 2 - 0.015));
    pop(addTo(g, new THREE.BoxGeometry(KW - 0.06, KH, 0.006), glass, 0, K0 + 0.08 + KH / 2, KD / 2 - 0.015), "corn");    // front
    addTo(g, new THREE.BoxGeometry(KW - 0.06, KH, 0.006), glass, 0, K0 + 0.08 + KH / 2, -KD / 2 + 0.015);   // back
    for (const sx of [-1, 1]) pop(addTo(g, new THREE.BoxGeometry(0.006, KH, KD - 0.06), glass, sx * (KW / 2 - 0.015), K0 + 0.08 + KH / 2, 0), "corn");
    const TOP = K0 + 0.08 + KH;
    addTo(g, new THREE.BoxGeometry(KW, 0.15, KD), red, 0, TOP + 0.075, 0);
    addTo(g, new THREE.BoxGeometry(KW + 0.015, 0.02, KD + 0.015), gold, 0, TOP + 0.16, 0);
    addTo(g, new THREE.CylinderGeometry(0.035, 0.05, 0.05, 16), gold, 0, TOP + 0.195, 0);              // little crown on the roof
    const headerTex = brandTex("popcorn-header", 0.52, 0.11, (ctx, w, h) => {
      ctx.fillStyle = "#b3121d"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#ffd400"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = `italic 900 ${h * 0.72}px Arial Black, Arial`; ctx.fillText("POPCORN", w / 2, h * 0.54);
    });
    addTo(g, new THREE.PlaneGeometry(0.52, 0.11), new THREE.MeshBasicMaterial({ map: headerTex }), 0, TOP + 0.075, KD / 2 + 0.001);
    // inside: warming light, kettle hanging off its rod, popcorn heaped on the deck
    glow(addTo(g, new THREE.BoxGeometry(KW - 0.12, 0.012, 0.04), new THREE.MeshBasicMaterial({ color: 0xffe2a8 }), 0, TOP - 0.01, 0.1));
    const steel = new THREE.MeshPhongMaterial({ color: 0xa3a9b0, specular: 0xffffff, shininess: 80 });
    addTo(g, new THREE.CylinderGeometry(0.007, 0.007, 0.14, 8), steel, 0, TOP - 0.07, -0.02);
    const kettle = addTo(g, new THREE.CylinderGeometry(0.1, 0.085, 0.1, 20), steel, 0, TOP - 0.19, -0.02); kettle.rotation.z = 0.12;
    addTo(g, new THREE.CylinderGeometry(0.105, 0.105, 0.012, 20), steel, 0, TOP - 0.135, -0.02).rotation.z = 0.12;
    const cornTex = makeTexture((ctx, w, h) => {
      ctx.fillStyle = "#f3cf6b"; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) {
        ctx.fillStyle = ["#fff8e2", "#fbe8a8", "#f6d77e", "#fffdf4"][i % 4];
        ctx.beginPath(); ctx.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 4, 0, Math.PI * 2); ctx.fill();
      }
    }, 256, 256);
    const corn = addTo(g, new THREE.SphereGeometry(0.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshLambertMaterial({ map: cornTex, emissive: 0x6a4a10, emissiveIntensity: 0.4 }), 0, K0 + 0.08, 0);
    corn.scale.set((KW - 0.06) / 1.0, 0.36, (KD - 0.06) / 1.0); pop(corn, "corn");
    // condiment shelf bolted to the side facing the snack rack (local -x)
    const SX = -CW / 2 - SHELF / 2, SY = 0.79;
    addTo(g, new THREE.BoxGeometry(SHELF, 0.025, CD - 0.04), red, SX, SY, 0);
    addTo(g, new THREE.BoxGeometry(SHELF, 0.03, 0.012), chrome, SX, SY + 0.025, (CD - 0.04) / 2);            // front rail
    addTo(g, new THREE.BoxGeometry(0.012, 0.03, CD - 0.04), chrome, SX - SHELF / 2, SY + 0.025, 0);          // end rail
    const brace = addTo(g, new THREE.BoxGeometry(0.02, 0.36, 0.02), chrome, SX + 0.04, SY - 0.13, 0); brace.rotation.z = -0.62;
    const ST = SY + 0.0125;                   // shelf top
    // stack of paper popcorn boxes: tapered, red-and-white striped, nested
    const boxTex = makeTexture((ctx, w, h) => {
      for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? "#fffaf0" : "#d81e2c"; ctx.fillRect(i * w / 12, 0, w / 12 + 1, h); }
      ctx.fillStyle = "#ffd400"; ctx.fillRect(0, h * 0.4, w, h * 0.2);
    }, 256, 128);
    const cup = new THREE.CylinderGeometry(0.052, 0.036, 0.12, 4, 1, true); cup.rotateY(Math.PI / 4);
    const cupMat = new THREE.MeshLambertMaterial({ map: boxTex, side: THREE.DoubleSide });
    for (let i = 0; i < 8; i++) pop(addTo(g, cup, cupMat, SX + 0.06, ST + 0.06 + i * 0.016, -0.1), "boxes");
    popcornKit = { cup, cupMat, cornTex };
    // salt shaker, sugar pourer, butter pump
    const shakerGlass = new THREE.MeshLambertMaterial({ color: 0xf4f6f8, transparent: true, opacity: 0.75 });
    pop(addTo(g, new THREE.CylinderGeometry(0.022, 0.024, 0.07, 14), shakerGlass, SX - 0.06, ST + 0.035, 0.1), "salt");
    pop(addTo(g, new THREE.SphereGeometry(0.023, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), chrome, SX - 0.06, ST + 0.07, 0.1), "salt");
    const sugarGlass = new THREE.MeshLambertMaterial({ color: 0xfaf3e6, transparent: true, opacity: 0.8 });
    pop(addTo(g, new THREE.CylinderGeometry(0.03, 0.032, 0.09, 16), sugarGlass, SX + 0.03, ST + 0.045, 0.11), "sugar");
    pop(addTo(g, new THREE.CylinderGeometry(0.008, 0.032, 0.035, 16), chrome, SX + 0.03, ST + 0.107, 0.11), "sugar");
    pop(addTo(g, new THREE.CylinderGeometry(0.004, 0.006, 0.03, 8), chrome, SX + 0.03, ST + 0.135, 0.11), "sugar");
    const butterTex = makeTexture((ctx, w, h) => {
      ctx.fillStyle = "#f7d44c"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#b3121d"; ctx.fillRect(0, h * 0.34, w, h * 0.32);
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = `bold ${h * 0.22}px Arial Black, Arial`; ctx.fillText("BUTTER", w * 0.25, h * 0.5); ctx.fillText("BUTTER", w * 0.75, h * 0.5);
    }, 256, 128);
    pop(addTo(g, new THREE.CylinderGeometry(0.045, 0.045, 0.16, 20), new THREE.MeshLambertMaterial({ map: butterTex }), SX - 0.07, ST + 0.08, -0.07), "butter");
    pop(addTo(g, new THREE.CylinderGeometry(0.012, 0.012, 0.05, 10), black, SX - 0.07, ST + 0.185, -0.07), "butter");
    pop(addTo(g, new THREE.BoxGeometry(0.03, 0.018, 0.06), black, SX - 0.07, ST + 0.215, -0.05), "butter");   // pump head + nozzle
    g.position.set(PX, 0, PWZ + 0.05 + CD / 2); scene.add(g);
    colliders.push({ x0: PX - CW / 2, x1: PX + CW / 2, z0: PWZ, z1: PWZ + 0.05 + CD });
    colliders.push({ x0: PX - CW / 2 - SHELF, x1: PX - CW / 2, z0: PWZ, z1: PWZ + 0.05 + CD });   // the side shelf (local -x = world -x)
    popcornMachine = { g, cols: colliders.slice(-2) };   // (simulation: bought later — see amenities)
  }

  // ---- snack rack: 1.62 tall, sloped shelves, every product its own shape ----
  // (a function: the candy aisle out on the floor builds it — see the store layout)
  const RD = 0.42, RH = 1.62;
  buildSnackRack = (RW, header = "SNACKS") => {
    const g = new THREE.Group();
    const frame = new THREE.MeshLambertMaterial({ color: 0x1c1f26 });
    for (const sx of [-1, 1]) addTo(g, new THREE.BoxGeometry(0.03, RH, RD), frame, sx * (RW / 2 - 0.015), RH / 2, 0);
    const peg = makeTexture((ctx, w, h) => {
      ctx.fillStyle = "#2a2e36"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#15171b"; for (let y = 8; y < h; y += 16) for (let x = 8; x < w; x += 16) ctx.fillRect(x, y, 3, 3);
    }, 256, 512);
    aimBlockers.push(addTo(g, new THREE.BoxGeometry(RW - 0.06, RH - 0.02, 0.02), new THREE.MeshLambertMaterial({ map: peg }), 0, RH / 2, -RD / 2 + 0.01));
    const headerTex = brandTex("snack-header", 0.96, 0.28, (ctx, w, h) => {
      ctx.fillStyle = "#00349c"; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#ffd400"; ctx.lineWidth = h * 0.06; ctx.strokeRect(h * 0.05, h * 0.05, w - h * 0.1, h - h * 0.1);
      ctx.fillStyle = "#ffd400"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      let px = h * 0.55; ctx.font = `italic 900 ${px}px Arial Black, Arial`; while (ctx.measureText(header).width > w * 0.68 && px > 10) { px -= 2; ctx.font = `italic 900 ${px}px Arial Black, Arial`; }   // (a long word shrinks to fit between its stars)
      ctx.fillText(header, w / 2, h * 0.53);
      ctx.fillStyle = "#fff"; ctx.font = `${h * 0.3}px Arial`; ctx.fillText("★", w * 0.13, h * 0.53); ctx.fillText("★", w * 0.87, h * 0.53);
    });
    addTo(g, new THREE.BoxGeometry(RW, 0.3, 0.05), frame, 0, RH - 0.15, -RD / 2 + 0.06);
    addTo(g, new THREE.PlaneGeometry(0.96, 0.28), new THREE.MeshLambertMaterial({ map: headerTex }), 0, RH - 0.15, -RD / 2 + 0.086);   // lit by the room, no glow
    const TILT = 0.12, shelfYs = [0.18, 0.5, 0.8, 1.07];
    const board = new THREE.MeshLambertMaterial({ color: 0xd9dde2 }), lip = new THREE.MeshLambertMaterial({ color: 0xffd400 });
    for (const y of shelfYs) {                // tilted toward the shopper, yellow price lip on the front edge
      const b = addTo(g, new THREE.BoxGeometry(RW - 0.06, 0.015, RD - 0.04), board, 0, y, 0); b.rotation.x = TILT;
      addTo(g, new THREE.BoxGeometry(RW - 0.06, 0.04, 0.008), lip, 0, y - (RD / 2 - 0.02) * Math.sin(TILT) + 0.012, RD / 2 - 0.02);
    }
    // one texture per product: its color, its name, a few shape-specific touches
    const labelTex = p => makeTexture((ctx, w, h) => {
      ctx.fillStyle = p.color; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255,255,255,.18)";
      if (p.shape === "bag") { ctx.fillRect(0, 0, w, h * 0.08); ctx.fillRect(0, h * 0.92, w, h * 0.08); }  // crimped seals
      if (p.shape === "bar") { ctx.fillRect(0, h * 0.7, w, h * 0.3); }
      if (p.shape === "tube") { ctx.fillStyle = "#e9ecef"; ctx.fillRect(0, 0, w, h * 0.06); }
      if (p.shape === "box") { ctx.strokeStyle = "#ffd400"; ctx.lineWidth = w * 0.05; ctx.strokeRect(w * 0.06, h * 0.06, w * 0.88, h * 0.88); }
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const words = p.name.split(" "), vertical = h > w * 1.2, sliver = h > w * 2.5;   // sliver: licorice-thin
      const maxW = p.shape === "tube" ? w * 0.4 : w * 0.9;                                 // a tube only shows ~half its wrap
      let f = (vertical ? w * 0.26 : h * 0.34);
      ctx.font = `italic 900 ${f}px Arial Black, Arial`;
      while (Math.max(...words.map(s => ctx.measureText(s).width)) > maxW && f > 8) { f -= 2; ctx.font = `italic 900 ${f}px Arial Black, Arial`; }
      if (p.shape === "tube") words.forEach((s, i) => { for (const cx of [0.25, 0.75]) ctx.fillText(s, w * cx, h / 2 + (i - (words.length - 1) / 2) * f * 1.05); });
      else if (sliver) {                      // licorice-thin: name runs up the length, like the real packs
        ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-Math.PI / 2);
        let fv = w * 0.62; ctx.font = `italic 900 ${fv}px Arial Black, Arial`;
        while (ctx.measureText(p.name).width > h * 0.86 && fv > 8) { fv -= 2; ctx.font = `italic 900 ${fv}px Arial Black, Arial`; }
        ctx.fillText(p.name, 0, 0); ctx.restore();
      }
      else if (vertical) words.forEach((s, i) => ctx.fillText(s, w / 2, h / 2 + (i - (words.length - 1) / 2) * f * 1.05));
      else ctx.fillText(p.name, w / 2, h / 2);
    }, p.shape === "tube" ? 512 : 256, p.shape === "tube" ? Math.round(512 * p.h / (Math.PI * p.w)) : Math.round(256 * p.h / p.w));
    // chip bags: a box puffed out in the middle and pinched flat at the sealed top and bottom
    const pillow = (w, h, d) => {
      const geo = new THREE.BoxGeometry(w, h, d, 8, 10, 1), pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const nx = pos.getX(i) / (w / 2), ny = pos.getY(i) / (h / 2);
        pos.setZ(i, pos.getZ(i) * Math.max(0.08, (1 - 0.5 * nx * nx) * (1 - Math.pow(Math.abs(ny), 5))));
      }
      geo.computeVertexNormals(); return geo;
    };
    const geoFor = p => p.shape === "bag" ? pillow(p.w, p.h, p.d)
      : p.shape === "tube" ? new THREE.CylinderGeometry(p.w / 2, p.w / 2, p.h, 20).rotateY(-Math.PI / 2)   // texture seam to the back, label (u=.25/.75) front and back
      : new THREE.BoxGeometry(p.w, p.h, p.d);
    // [shelf, which half, stack height]: bags bottom, tubes + licorice, theater boxes, then bars + gum piled up top
    const layout = [[0, -1, 1], [0, 1, 1], [1, -1, 1], [1, 1, 1], [2, -1, 1], [2, 1, 1], [3, -1, 3], [3, 1, 4]];
    SNACK_PRODUCTS.forEach((p, pi) => {
      const [si, half, stack] = layout[pi];
      if (!p.geo) {                            // built once, shared by every rack
        const tex = labelTex(p);
        const side = new THREE.MeshLambertMaterial({ color: p.color });
        const face = new THREE.MeshLambertMaterial({ map: tex });
        p.mat = p.shape === "box" || p.shape === "bar" || p.shape === "gum" ? [side, side, side, side, face, side] : face;
        p.geo = geoFor(p);                     // what you get in hand is this exact geometry + material
      }
      const geo = p.geo, m = p.mat;
      const across = Math.max(1, Math.floor((RW / 2 - 0.05) / (p.w + 0.015)));
      const x0 = half * (RW / 4) - (across - 1) * (p.w + 0.015) / 2;
      for (let row = 0; row < 2; row++) for (let a = 0; a < across; a++) for (let k = 0; k < stack; k++) {
        const z = 0.1 - row * (p.d + 0.05);
        const y = shelfYs[si] + 0.009 + p.h / 2 + k * p.h - z * Math.tan(TILT);   // sits on the tilted board
        const u = addTo(g, geo, m, x0 + a * (p.w + 0.015), y, z);
        u.rotation.x = TILT;
        u.userData.snack = p; aimables.push(u);
      }
    });
    return g;                                  // local +z faces the shopper; the pegboard back is at z = -RD/2
  };
  buildSnackRack.depth = RD;
}

