// ---- janitor's closet (interior x CLOSET.x0+0.1..CLOSET.x1-0.1, z BZ0+0.1..HZ-0.1), at the hall's end. Its narrow door
// swings out into the hall; from the door (facing +x): the trash chute on the back wall (the building's outside wall),
// mop + bucket in the back right corner, the carpet sweeper beside it, a folded step ladder (for the ceiling lights) on
// the right, a shelf of cleaning stuff up on the back wall ----
{
  const x0 = CLOSET.x0 + WALL_T / 2, x1 = CLOSET.x1 - WALL_T / 2, z0 = BZ0 + WALL_T / 2, z1 = HZ - WALL_T / 2;
  floorPatch(vctTex, 2.4, CLOSET.x0, CLOSET.x1, BZ0, HZ);
  const csh = new THREE.Shape([[CLOSET.x0, BZ0], [CLOSET.x1, BZ0], [CLOSET.x1, HZ], [CLOSET.x0, HZ]].map(([x, z]) => new THREE.Vector2(x, z))), hatchHole = new THREE.Path();   // plain painted drywall, the roof hatch's opening cut in it (see the roof)
  hatchHole.moveTo(10.28, 28.12); hatchHole.lineTo(10.88, 28.12); hatchHole.lineTo(10.88, 28.87); hatchHole.lineTo(10.28, 28.87); hatchHole.lineTo(10.28, 28.12); csh.holes.push(hatchHole);
  const ceil = new THREE.Mesh(new THREE.ShapeGeometry(csh), new THREE.MeshLambertMaterial({ color: 0xe6e3dc }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = BH; scene.add(ceil);   // (shape y -> world z; facing down)
  const put = (geo, m, x, y, z, par = scene) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); par.add(o); return o; };
  const bx = (w, h, d, m, x, y, z, par) => put(new THREE.BoxGeometry(w, h, d), m, x, y, z, par);
  const cyl = (r, h, m, x, y, z, par) => put(new THREE.CylinderGeometry(r, r, h, 12), m, x, y, z, par);
  const lam = c => new THREE.MeshLambertMaterial({ color: c });
  const yellow = lam(0xf2c200), grey = lam(0x6b6f74), dark = lam(0x222222), wood = lam(0xb08a5a), alu = new THREE.MeshPhongMaterial({ color: 0xc9cdd2, specular: 0xffffff, shininess: 80 });
  const stick = (a, b, r, m, par) => {             // a pole from point a to point b
    const d = new THREE.Vector3().subVectors(b, a), o = cyl(r, d.length(), m, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, par);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return o;
  };
  // one bare bulb on a cord from the middle of the ceiling (its own light zone: E on it, or its chain, flips it)
  {
    const bx0 = (x0 + x1) / 2, bz0 = (z0 + z1) / 2, porcelain = lam(0xf1ede2), parts = [];
    parts.push(put(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16), porcelain, bx0, BH - 0.01, bz0));          // ceiling canopy
    parts.push(cyl(0.004, 0.32, dark, bx0, BH - 0.17, bz0));                                                      // the cord
    parts.push(put(new THREE.CylinderGeometry(0.022, 0.026, 0.06, 12), porcelain, bx0, BH - 0.36, bz0));           // socket
    closetBulb.mat = new THREE.MeshBasicMaterial({ color: 0x3a3833 });
    const glass = glow(put(new THREE.SphereGeometry(0.032, 16, 12), closetBulb.mat, bx0, BH - 0.415, bz0)); glass.scale.y = 1.25; parts.push(glass);
    parts.push(cyl(0.0025, 0.3, alu, bx0 + 0.02, BH - 0.52, bz0), put(new THREE.SphereGeometry(0.008, 8, 6), alu, bx0 + 0.02, BH - 0.675, bz0));   // pull chain + its bead
    for (const o of parts) { o.userData.lightZone = "closet"; aimables.push(o); }
  }
  // the trash chute, on the back wall (the outside one, the dumpster just the other side of it): a stainless hopper
  // door (tips out from the top) through the wall. Bagged trash goes here
  {
    const cz = 28.72, g = new THREE.Group(); g.position.set(x1, 0, cz); g.rotation.y = -Math.PI / 2; scene.add(g);   // local +z: out of the wall into the room
    const brushed = makeTexture((ctx, W, H) => {
      ctx.fillStyle = "#b9bec4"; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 220; i++) { ctx.fillStyle = Math.random() < 0.5 ? `rgba(255,255,255,${0.03 + Math.random() * 0.05})` : `rgba(50,55,62,${0.03 + Math.random() * 0.05})`; ctx.fillRect(0, Math.random() * H, W, 1); }
    }, 128, 128);
    const steel = new THREE.MeshPhongMaterial({ color: 0xffffff, map: brushed, specular: 0xffffff, shininess: 70 });
    const parts = [], add = (geo, m, x, y, z, par = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); par.add(o); parts.push(o); return o; };
    add(new THREE.BoxGeometry(0.66, 1.02, 0.015), steel, 0, 1.13, 0.0075);                         // wall plate
    add(new THREE.BoxGeometry(0.56, 0.045, 0.1), steel, 0, 1.31, 0.065);                           // the frame round the opening
    add(new THREE.BoxGeometry(0.56, 0.045, 0.1), steel, 0, 0.815, 0.065);
    for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.045, 0.45, 0.1), steel, sx * 0.258, 1.06, 0.065);
    add(new THREE.BoxGeometry(0.47, 0.45, 0.01), new THREE.MeshBasicMaterial({ color: 0x050505 }), 0, 1.06, 0.03);   // the throat, dark behind the door
    const door = new THREE.Group(); door.position.set(0, 0.84, 0.105); g.add(door);              // hinged along its bottom edge
    add(new THREE.BoxGeometry(0.46, 0.44, 0.018), steel, 0, 0.22, 0, door);
    add(new THREE.BoxGeometry(0.3, 0.024, 0.024), steel, 0, 0.37, 0.05, door);                    // pull bar
    for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.02, 0.024, 0.05), steel, sx * 0.14, 0.37, 0.025, door);
    const plate = textPlane("TRASH CHUTE", 0.42, 0.075, "#ffffff", "#9b1c1c", "Arial Black", 60);
    plate.material = new THREE.MeshLambertMaterial({ map: plate.material.map }); plate.position.set(0, 1.5, 0.017); g.add(plate); parts.push(plate);
    const warn = textPlane("NO BOXES · NO LIQUIDS · KEEP CLOSED", 0.46, 0.035, "#1a1a1a", "#f2c200", "Arial", 40);
    warn.material = new THREE.MeshLambertMaterial({ map: warn.material.map }); warn.position.set(0, 0.74, 0.017); g.add(warn); parts.push(warn);
    for (const o of parts) { o.userData.chute = true; aimables.push(o); }
    chute.door = door; chute.at = [x1 - 0.15, 1.05, cz]; chute.stand = { x: x1 - 0.6, z: cz, ry: Math.PI / 2 };
    colliders.push({ x0: x1 - 0.16, x1, z0: cz - 0.33, z1: cz + 0.33, y1: 1.7 });
  }

  // mop bucket: a commercial 26-quart one. Tapered yellow tub with a rolled rim on a dolly with swivel casters,
  // the side-press wringer clamped over the back end (its lever up by the wall), grey water in it
  const mbx = x1 - 0.24, mbz = z1 - 0.3;
  {
    const tubM = new THREE.MeshPhongMaterial({ color: 0xf2c200, specular: 0x554400, shininess: 30, side: THREE.DoubleSide });
    const wringM = new THREE.MeshPhongMaterial({ color: 0x55595f, specular: 0x333333, shininess: 25 }), chromeM = alu;
    const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.2, 0.34, 4, 1, true), tubM);   // a 4-sided taper: the tub's walls
    tub.rotation.y = Math.PI / 4; tub.scale.set(0.82, 1, 1.12); tub.position.set(mbx, 0.25, mbz); scene.add(tub);
    bx(0.26, 0.012, 0.36, tubM, mbx, 0.085, mbz);                                        // its floor
    for (const [w, d, ox, oz] of [[0.31, 0.03, 0, -0.19], [0.31, 0.03, 0, 0.19], [0.03, 0.38, -0.143, 0], [0.03, 0.38, 0.143, 0]])
      bx(w, 0.022, d, tubM, mbx + ox, 0.42, mbz + oz);                                    // the rolled rim
    bx(0.07, 0.02, 0.05, tubM, mbx, 0.415, mbz + 0.215);                                 // pour spout, front end
    bx(0.25, 0.004, 0.33, new THREE.MeshPhongMaterial({ color: 0x6e6b55, specular: 0x666655, shininess: 60 }), mbx, 0.3, mbz + 0.01);   // the dirty water
    // the dolly underneath: a dark frame, a caster at each corner
    bx(0.3, 0.025, 0.4, dark, mbx, 0.07, mbz);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      bx(0.025, 0.035, 0.03, grey, mbx + sx * 0.13, 0.045, mbz + sz * 0.18);              // swivel fork
      cyl(0.025, 0.018, dark, mbx + sx * 0.13, 0.026, mbz + sz * 0.18).rotation.z = Math.PI / 2;
    }
    // the wringer, over the back third: side plates, the fixed and the moving press plates, the lever with its grip
    const wz = mbz - 0.13;
    for (const sx of [-1, 1]) bx(0.012, 0.2, 0.15, wringM, mbx + sx * 0.14, 0.5, wz);
    bx(0.26, 0.16, 0.012, wringM, mbx, 0.5, wz - 0.07);                                  // the back plate
    bx(0.25, 0.14, 0.02, wringM, mbx, 0.5, wz + 0.025);                                  // the press plate
    for (let i = 0; i < 5; i++) bx(0.24, 0.008, 0.008, dark, mbx, 0.445 + i * 0.028, wz + 0.037);   // its ribs
    bx(0.3, 0.03, 0.04, wringM, mbx, 0.41, wz);                                          // the clamp onto the rim
    stick(new THREE.Vector3(mbx + 0.15, 0.56, wz + 0.02), new THREE.Vector3(mbx + 0.15, 1.02, wz - 0.07), 0.011, chromeM);   // the lever: up and back
    stick(new THREE.Vector3(mbx + 0.15, 0.98, wz - 0.06), new THREE.Vector3(mbx + 0.15, 1.08, wz - 0.08), 0.018, dark);    // its grip
    const warn = textPlane("CAUTION", 0.12, 0.035, "#1a1a1a", "#f2c200", "Arial Black", 40);
    warn.material = new THREE.MeshLambertMaterial({ map: warn.material.map }); warn.rotation.y = -Math.PI / 2; warn.position.set(mbx - 0.152, 0.3, mbz + 0.05); scene.add(warn);
  }
  colliders.push({ x0: mbx - 0.18, x1, z0: mbz - 0.24, z1: mbz + 0.24, y1: 0.6 });
  const tool = (id, g, home, col = null) => {      // one of the TOOLS: aimable, with an (invisible) spot to put it back on
    const h = put(new THREE.BoxGeometry(...home[0]), new THREE.MeshBasicMaterial({ visible: false }), ...home[1]); h.userData.toolHome = id;
    g.traverse(o => { if (o.isMesh) { o.userData.tool = id; aimables.push(o); } });
    Object.assign(TOOLS[id], { g, home: h, col }); if (col) colliders.push(col);
  };
  const toolRig = (L, h) => {                      // the pieces toolPose turns: a head flat on the floor, a pole of length L pivoting h up
    const g = new THREE.Group(), head = new THREE.Group(), pole = new THREE.Group();
    head.name = "toolHead"; pole.name = "toolPole"; pole.position.y = h; pole.userData.L = L;
    g.add(head); head.add(pole); return { g, head, pole };
  };
  // the mop: a cotton wet mop. A lacquered wood handle with a red hang-up cap, the grey quick-change jaw clamped
  // across a green headband, and the strands, flopped out round it (on the floor; bunched up standing in the bucket)
  {
    const { g, head, pole } = toolRig(1.42, 0.05);
    const strandMs = [0xece6d4, 0xdcd5bf, 0xcfc6ac, 0xe4dcc6].map(c => lam(c));
    const mop = new THREE.Group(); mop.name = "mopStrands"; head.add(mop);
    for (let i = 0; i < 46; i++) {                 // splayed every which way, longer out to the sides (they hang off the band's ends)
      const a = i * 2.39996 + Math.random() * 0.4, side = Math.abs(Math.sin(a)), len = 0.13 + 0.09 * side + Math.random() * 0.06;
      const ox = (Math.random() - 0.5) * 0.12, tipX = ox + Math.sin(a) * len, tipZ = Math.cos(a) * len * 0.75;
      stick(new THREE.Vector3(ox, 0.04, 0), new THREE.Vector3(tipX, 0.007 + Math.random() * 0.01, tipZ), 0.0085, strandMs[i % 4], mop);
    }
    const lump = put(new THREE.SphereGeometry(0.07, 14, 10), strandMs[0], 0, 0.03, 0, mop); lump.scale.set(1.5, 0.55, 0.9);   // the bunch under the band
    bx(0.17, 0.022, 0.06, lam(0x2f8f4e), 0, 0.058, 0, mop);                             // the headband
    bx(0.15, 0.03, 0.045, lam(0x8a8f96), 0, 0.004, 0, pole);                            // the jaw, clamped over it
    cyl(0.016, 0.012, alu, 0.06, 0.004, 0.026, pole).rotation.x = Math.PI / 2;          // its wing nut
    cyl(0.016, 0.06, alu, 0, 0.045, 0, pole);                                           // the ferrule the handle screws into
    cyl(0.0135, 1.32, new THREE.MeshPhongMaterial({ color: 0xc69a62, specular: 0x553311, shininess: 40 }), 0, 0.06 + 0.66, 0, pole);   // the handle
    cyl(0.017, 0.07, lam(0xc0262c), 0, 1.4 - 0.035, 0, pole);                           // hang-up cap
    put(new THREE.TorusGeometry(0.014, 0.004, 6, 14), lam(0xc0262c), 0, 1.42 + 0.01, 0, pole);   // its hanging loop
    g.position.set(mbx, 0.09, mbz + 0.08); scene.add(g);
    mop.scale.set(0.5, 1, 0.45);                    // stood in the bucket: the strands bunched up in the water
    toolPose(g, g.position.clone(), new THREE.Vector3(x1 - 0.33, 1.6, z1 - 0.02));       // leaned on the side wall (clear of the shelf)
    tool("mop", g, [[0.25, 1.3, 0.25], [mbx + 0.1, 0.95, mbz + 0.05]]);
  }
  // carpet sweeper: the push kind, no cord. A red enamelled hood over a black base with a rubber bumper all round,
  // a chrome trim strip, a dump pedal, rubber wheels and corner brushes underneath; a chrome bail off pivots at
  // each end up to the handle, which has a foam grip and a loop to hang it by. Parked by the mop bucket, the handle
  // against the wall over it
  const swx = x1 - 0.67, swz = z1 - 0.25;
  {
    const { g, head, pole } = toolRig(1.2, 0.055);
    const enamel = new THREE.MeshPhongMaterial({ color: 0x9c1b1f, specular: 0xffffff, shininess: 70 });
    bx(0.3, 0.045, 0.19, dark, 0, 0.045, 0, head);                                       // the base
    const hood = cyl(0.095, 0.3, enamel, 0, 0.068, 0, head); hood.rotation.z = Math.PI / 2; hood.scale.set(0.45, 1, 1);   // rounded hood over it
    bx(0.318, 0.022, 0.21, lam(0x151515), 0, 0.034, 0, head);                            // rubber bumper
    bx(0.28, 0.008, 0.025, alu, 0, 0.11, 0, head);                                       // chrome trim along the top
    bx(0.05, 0.012, 0.03, dark, 0.11, 0.1, 0.07, head);                                  // the dump pedal
    const badge = textPlane("SWEEP-MATIC", 0.09, 0.02, "#f1ede2", "#9c1b1f", "Arial Black", 40);
    badge.material = new THREE.MeshLambertMaterial({ map: badge.material.map }); badge.rotation.x = -0.5; badge.position.set(0, 0.085, 0.088); head.add(badge);   // on the back slope of the hood, facing you
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const w = cyl(0.017, 0.014, dark, sx * 0.12, 0.017, sz * 0.06, head); w.rotation.z = Math.PI / 2; w.name = "sweeperWheel";
    }
    for (const sx of [-1, 1]) cyl(0.03, 0.012, lam(0x3a3128), sx * 0.13, 0.01, -0.085, head);   // corner brushes, front
    for (const sx of [-1, 1]) {                    // the bail: pivots at the ends of the hood, up to the yoke
      cyl(0.012, 0.012, alu, sx * 0.158, 0, 0, pole).rotation.z = Math.PI / 2;
      stick(new THREE.Vector3(sx * 0.158, 0, 0), new THREE.Vector3(sx * 0.02, 0.17, 0), 0.006, alu, pole);
    }
    bx(0.05, 0.035, 0.025, dark, 0, 0.18, 0, pole);                                      // the yoke
    cyl(0.011, 0.86, alu, 0, 0.19 + 0.43, 0, pole);                                      // the handle
    cyl(0.018, 0.16, lam(0x1c1c1c), 0, 1.2 - 0.09, 0, pole);                              // foam grip
    put(new THREE.TorusGeometry(0.016, 0.004, 6, 14), dark, 0, 1.2 + 0.01, 0, pole);     // hang loop
    scene.add(g);
    toolPose(g, new THREE.Vector3(swx, 0, swz), new THREE.Vector3(x1 - 0.38, 1.3, swz));
    tool("sweeper", g, [[0.36, 1.3, 0.42], [swx + 0.1, 0.65, swz]], { x0: swx - 0.13, x1: swx + 0.2, z0: swz - 0.19, z1: swz + 0.19, y1: 0.4 });
  }
  // the step ladder: a 5-foot aluminium A-frame. Two sections hinge off the blue top cap: the front one carries the
  // ribbed treads, the rear one just braces; folding spreaders lock them apart. ladder.open(k) swings them from
  // folded flat (0) to spread (1). It lives folded against the right-hand wall, just inside the door
  {
    const { aF, aR, TOP } = LADDER, Lf = TOP / Math.cos(aF), Lr = TOP / Math.cos(aR);
    const g = new THREE.Group(); scene.add(g); ladder.g = g;
    const m = c => { const o = new THREE.MeshPhongMaterial({ color: c, specular: 0x666666, shininess: 50 }); ladder.mats.push(o); return o; };
    const aluL = m(0xc9cdd2), treadM = m(0xa9aeb5), capM = m(0x2a5fb0), rubber = m(0x1a1a1a);
    const bar = (a, b, w, d, mt, par) => {         // a flat bar from a to b (its width along x)
      const v = new THREE.Vector3().subVectors(b, a), o = put(new THREE.BoxGeometry(w, v.length(), d), mt, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, par);
      o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); return o;
    };
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const top = new THREE.Group(), front = new THREE.Group(), rear = new THREE.Group(); g.add(top); top.add(front, rear); rear.position.z = -0.035;
    // the top cap: a moulded tray, a paint-can slot, and the sticker everyone ignores
    bx(0.5, 0.06, 0.25, capM, 0, 0.03, -0.015, top);
    bx(0.38, 0.012, 0.15, rubber, 0, 0.056, -0.015, top);                               // the tray
    bx(0.06, 0.012, 0.06, aluL, 0.2, 0.057, -0.015, top);                               // a hook for the bucket
    const warn = textPlane("NOT A STEP", 0.2, 0.04, "#ffffff", "#c0262c", "Arial Black", 48);
    const wm = m(0xffffff); wm.map = warn.material.map; warn.material = wm;
    warn.position.set(0, 0.03, 0.111); top.add(warn);
    // front section: rails flaring out to the feet, four treads (level once it's spread), rubber shoes
    for (const sx of [-1, 1]) {
      bar(V(sx * 0.215, 0, 0), V(sx * 0.265, -Lf, 0), 0.022, 0.065, aluL, front);
      const f = bx(0.05, 0.035, 0.085, rubber, sx * 0.265, -Lf + 0.0175, 0, front); f.rotation.x = aF;
    }
    for (let i = 1; i <= 4; i++) {
      const h = i * LADDER.STEP / 4, sd = (TOP - h) / Math.cos(aF), w = 0.43 + 0.05 * sd / Lf;
      const t = bx(w, 0.028, 0.09, treadM, 0, -sd, 0.012, front); t.rotation.x = aF;
      for (const rz of [-0.025, 0, 0.025]) bx(w - 0.02, 0.004, 0.006, rubber, 0, 0.016, rz, t);   // its ribs
      bar(V(-w / 2, -sd - 0.02, -0.03), V(w / 2, -sd - 0.06, -0.03), 0.012, 0.012, aluL, front).visible = i < 4;   // a brace under it
    }
    // rear section: plain rails, two cross braces, a diagonal
    for (const sx of [-1, 1]) {
      bar(V(sx * 0.2, 0, 0), V(sx * 0.255, -Lr, 0), 0.022, 0.045, aluL, rear);
      const f = bx(0.05, 0.035, 0.07, rubber, sx * 0.255, -Lr + 0.0175, 0, rear); f.rotation.x = -aR;
    }
    for (const sd of [0.45, 1.05]) bx(0.42 + 0.05 * sd / Lr, 0.03, 0.012, aluL, 0, -sd, 0, rear);
    bar(V(-0.2, -0.45, 0.004), V(0.22, -1.05, 0.004), 0.016, 0.006, aluL, rear);
    // spreaders: hinged bars between the sections, a little below halfway (only there when it's spread)
    const spread = [];
    for (const sx of [-1, 1]) {
      const y = 0.72, d = TOP - y;
      spread.push(bar(V(sx * 0.25, y, d * Math.tan(aF)), V(sx * 0.245, y, -0.035 - d * Math.tan(aR)), 0.008, 0.02, aluL, g));
    }
    g.traverse(o => { if (o.isMesh) { o.userData.ladder = true; aimables.push(o); } });
    ladder.open = k => {
      front.rotation.x = -aF * k; rear.rotation.x = aR * k; top.position.y = Lf * Math.cos(aF * k);
      for (const b of spread) b.visible = k > 0.9;
    };
    // stowed: folded flat and leaned back against the wall (its own spot to put it back on, too)
    ladder.stow = { x: x0 + 0.35, z: z1 - 0.12, lean: 0.07 };
    const h = put(new THREE.BoxGeometry(0.55, 1.6, 0.25), new THREE.MeshBasicMaterial({ visible: false }), ladder.stow.x, 0.8, z1 - 0.12); ladder.home = h;
    ladder.stowBox = { x0: ladder.stow.x - 0.27, x1: ladder.stow.x + 0.27, z0: z1 - 0.22, z1, y1: 1.7 }; colliders.push(ladder.stowBox);
    ladderPose();
  }
  // two short shelves stacked on the back wall, up out of the way and over in the right-hand corner (clear of the roof
  // ladder by the left wall, and whoever's climbing it): carpet shampoo and floor cleaner up top, bleach and glass cleaner below
  const sz0 = z1 - 0.65, sz1 = z1 - 0.08, sd = 0.24, sx = x1 - sd / 2;   // (clear of the chute beside them)
  const items = [
    top => { bx(0.09, 0.26, 0.11, lam(0x6aa84f), sx, top + 0.13, z); cyl(0.02, 0.03, dark, sx, top + 0.275, z); label(0.09, 0.09, 0xf6f6f2, top + 0.12, z, 0.047); },   // carpet shampoo
    top => { bx(0.08, 0.22, 0.1, yellow, sx, top + 0.11, z); cyl(0.018, 0.03, lam(0xd21f26), sx, top + 0.235, z); label(0.08, 0.08, 0xd21f26, top + 0.1, z, 0.042); },   // floor cleaner
    top => { bx(0.12, 0.24, 0.15, lam(0xf6f6f2), sx, top + 0.12, z); cyl(0.022, 0.03, lam(0x2a5fb0), sx, top + 0.255, z + 0.04); label(0.11, 0.1, 0x2a5fb0, top + 0.11, z, 0.062); },   // bleach jug
    top => { cyl(0.04, 0.2, lam(0x2f8fe8), sx, top + 0.1, z); bx(0.06, 0.06, 0.03, lam(0xf2f2f2), sx - 0.01, top + 0.23, z); bx(0.012, 0.04, 0.012, lam(0xf2f2f2), sx - 0.05, top + 0.19, z); },   // glass cleaner: spray head + trigger
  ];
  let z = 0;
  const label = (w, h, c, y, zz, d) => bx(0.004, h, w, lam(c), sx - d, y, zz);
  [1.65, 1.2].forEach((sy, k) => {
    bx(sd, 0.025, sz1 - sz0, wood, sx, sy, (sz0 + sz1) / 2);
    for (const bz of [sz0 + 0.08, sz1 - 0.08]) bx(0.02, 0.18, 0.02, grey, x1 - 0.02, sy - 0.1, bz);   // brackets
    for (const i of [0, 1]) { z = sz0 + 0.16 + i * (sz1 - sz0 - 0.32); items[k * 2 + i](sy + 0.0125); }
  });
}
function ladderPose() {                          // where it is for its state (carried: ladderTick moves it)
  const L = ladder, g = L.g;
  if (L.state === "stored") { L.open(0); g.position.set(L.stow.x, 0, L.stow.z); g.rotation.set(L.stow.lean, 0, 0); }
  else if (L.state === "placed") { L.open(1); g.position.set(L.x, floorHeightAt(L.x, L.z), L.z); g.rotation.set(0, L.ry, 0); }
}

const rr = textPlane("RESTROOMS", 1.0, 0.24, "#fff", "#00349c");         // over the store-side doorway, above the stripe
rr.material = new THREE.MeshLambertMaterial({ map: rr.material.map });
rr.position.set(BOH_DOORS.store, DOOR_H + 0.62, Z - T / 2 - 0.02); rr.rotation.y = Math.PI; scene.add(rr);

// ---- break room, V3 (interior x SX+0.1..XR-0.1, z HZ+0.1..BOH.officeZ-0.1): half its old depth, the manager's office behind it ----
// Lockers on the west wall (names on Dymo tape, a couple of padlocks, old poster tubes on top) and a coat rail past
// them, the aprons on pegs beside the office door, the punch clock and its card rack on the hall wall by the lockers;
// past the hall door, a small table end-on to that wall under the bulletin board, a molded chair either side of it, an empty Tony's box and
// the TV Guide on it; a kitchenette on the back wall past the office's window: oak
// cabinets with panelled doors, a sink sunk in the counter with a dish rack, a Mr. Coffee with its pot on, a microwave
// blinking 12:00 since the last outage; the almond fridge in the corner under magnets. A TV/VCR up on a bracket (on
// while someone's at lunch), the store's awards over the bulletin board, a wall clock that keeps the shift's time, the
// extinguisher, a first aid kit, the labor-law poster. The hall door swings in over x 8.0-9.1 up to ~z 30.9, and the
// lockers and the way to the office door (x 6.4-7.3) have the west end of the room to themselves
{
  const x0 = SX + 0.1, x1 = XR - 0.1, z0 = HZ + 0.1, z1 = BOH.officeZ - 0.1;
  const put = (geo, m, x, y, z, ry = 0, par = scene) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; par.add(o); return o; };
  const bx = (w, h, d, m, x, y, z, par) => put(new THREE.BoxGeometry(w, h, d), m, x, y, z, 0, par);
  const cyl = (rt, rb, h, m, x, y, z, seg = 16, par) => put(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z, 0, par);
  const grp = (x, y, z, ry = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; scene.add(g); return g; };
  const lam = c => new THREE.MeshLambertMaterial({ color: c }), phong = (c, s = 40, sp = 0x444444) => new THREE.MeshPhongMaterial({ color: c, specular: sp, shininess: s });
  const pic = (draw, w, h) => new THREE.MeshLambertMaterial({ map: makeTexture(draw, w, h), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });   // (decals: drawn in front of whatever they're stuck to)
  const sheet = (m, w, h, x, y, z, ry = 0, par) => put(new THREE.PlaneGeometry(w, h), m, x, y, z, ry, par);
  const lockerMat = lam(0x5f7fa3), lockerDk = lam(0x3c526b), white = lam(0xeeeeea), almond = phong(0xe8e0c8, 30, 0x555555);
  const laminate = phong(0xd9cfb4, 20, 0x333333), chrome = phong(0xc9cdd2, 90, 0xffffff), blackP = phong(0x1b1b1d, 40);
  const oak = new THREE.MeshLambertMaterial({ map: makeTexture((ctx, W, H) => {   // golden oak, the grain running up the doors
    ctx.fillStyle = "#9a6f40"; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) { const x = Math.random() * W, w = 1 + Math.random() * 4; ctx.fillStyle = `rgba(${Math.random() < 0.5 ? "70,42,18" : "190,140,80"},${0.15 + Math.random() * 0.25})`;
      ctx.beginPath(); ctx.moveTo(x, 0); for (let y = 0; y <= H; y += 16) ctx.lineTo(x + Math.sin(y * 0.03 + i) * 4, y); ctx.lineTo(x + w, H); ctx.lineTo(x + w, 0); ctx.fill(); }
  }, 256, 256) });
  const oakDk = lam(0x6e4c2a);

  // ---- lockers: four tall steel lockers facing +x, louvred vents, number plates, names, padlocks ----
  const LD = 0.45, LW = 0.38, LH = 1.8, lz0 = z0 + 0.05;
  const vent = pic((ctx, W, H) => { ctx.fillStyle = "#5f7fa3"; ctx.fillRect(0, 0, W, H); for (let y = 6; y < H - 4; y += 10) { ctx.fillStyle = "#1e2a38"; ctx.fillRect(8, y, W - 16, 5); ctx.fillStyle = "#86a2c2"; ctx.fillRect(8, y + 5, W - 16, 1); } }, 128, 64);
  const NAMES = ["", "DANA", "RAY", ""];
  for (let i = 0; i < 4; i++) {
    const z = lz0 + LW / 2 + i * LW, fx = x0 + LD;
    bx(LD, LH, LW - 0.01, lockerMat, x0 + LD / 2, LH / 2, z);
    bx(0.008, LH - 0.1, LW - 0.04, lockerMat, fx + 0.004, LH / 2 + 0.02, z);                    // the door, proud of the frame
    for (const y of [LH - 0.18, 0.22]) sheet(vent, LW * 0.6, 0.12, fx + 0.014, y, z, Math.PI / 2);
    bx(0.012, 0.16, 0.035, chrome, fx + 0.014, 1.0, z + LW / 2 - 0.07);                         // the lift latch
    sheet(pic((ctx, W, H) => { ctx.fillStyle = "#c8ccd0"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#222"; ctx.font = "bold 40px Arial"; ctx.textAlign = "center"; ctx.fillText(String(i + 1), W / 2, 44); }, 64, 56), 0.05, 0.04, fx + 0.014, LH - 0.32, z, Math.PI / 2);
    if (NAMES[i]) sheet(pic((ctx, W, H) => { ctx.fillStyle = "#111"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#f4f4f4"; ctx.font = "bold 30px Arial"; ctx.textAlign = "center"; ctx.fillText(NAMES[i].split("").join(" "), W / 2, 31); }, 192, 42), 0.13, 0.028, fx + 0.014, LH - 0.4, z, Math.PI / 2);
    if (i === 1 || i === 2) {                                                                     // a padlock through the latch
      const lk = grp(fx + 0.04, 0.93, z + LW / 2 - 0.07, Math.PI / 2);
      bx(0.045, 0.045, 0.02, i === 1 ? phong(0x2c2f33, 60, 0x888888) : phong(0xb08a3a, 70, 0xffeeaa), 0, 0, 0, lk);
      const sh = put(new THREE.TorusGeometry(0.014, 0.004, 6, 12, Math.PI), chrome, 0, 0.022, 0, 0, lk);
    }
  }
  sheet(Object.assign(pic((ctx, W) => { ctx.fillStyle = "#f2d21a"; ctx.beginPath(); ctx.arc(W / 2, W / 2, W / 2 - 2, 0, 7); ctx.fill(); ctx.fillStyle = "#222"; ctx.fillRect(W * 0.34, W * 0.3, 6, 12); ctx.fillRect(W * 0.6, W * 0.3, 6, 12); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(W / 2, W / 2, W * 0.28, 0.5, Math.PI - 0.5); ctx.stroke(); }, 64, 64), { transparent: true, alphaTest: 0.5 }), 0.06, 0.06, x0 + LD + 0.016, 1.35, lz0 + 2.5 * LW - 0.06, Math.PI / 2);   // a sticker someone stuck on
  colliders.push({ x0, x1: x0 + LD, z0: lz0, z1: lz0 + 4 * LW, y1: LH });
  for (let k = 0; k < 3; k++) { const t = cyl(0.04, 0.04, 0.9, lam([0xd9cfb4, 0xb8a684, 0xcfc4a6][k]), x0 + 0.24, LH + 0.04 + k * 0.0, lz0 + 0.3 + k * 0.09, 12); t.rotation.x = Math.PI / 2; t.rotation.z = 0.15 * (k - 1); t.position.y = LH + 0.04; }   // rolled promo posters, kept "for later"
  bx(0.32, 0.12, 0.22, lam(0xd8d0c0), x0 + 0.22, LH + 0.06, lz0 + 1.2);                        // a shoebox of old name tags

  // ---- coat rail past the lockers: a jacket and a spare uniform vest ----
  {
    const rz0 = lz0 + 4 * LW + 0.08, rz1 = z1 - 0.12, ry = 1.68;
    bx(0.02, 0.08, rz1 - rz0, oakDk, x0 + 0.01, ry, (rz0 + rz1) / 2);
    for (const z of [rz0 + 0.12, (rz0 + rz1) / 2, rz1 - 0.12]) { bx(0.07, 0.015, 0.015, chrome, x0 + 0.045, ry - 0.02, z); bx(0.012, 0.04, 0.015, chrome, x0 + 0.075, ry, z); }
    const jk = grp(x0 + 0.07, ry - 0.06, rz0 + 0.12, Math.PI / 2), denim = lam(0x3d5a85);
    bx(0.44, 0.6, 0.07, denim, 0, -0.3, 0, jk); bx(0.26, 0.06, 0.08, lam(0xb08a5a), 0, -0.02, 0, jk);   // a jean jacket, the corduroy collar
    for (const s of [-1, 1]) { const sl = bx(0.1, 0.56, 0.07, denim, s * 0.25, -0.33, 0.005, jk); sl.rotation.z = s * 0.06; }
    const vs = grp(x0 + 0.07, ry - 0.06, rz1 - 0.12, Math.PI / 2), vb = lam(0x00349c);
    bx(0.38, 0.52, 0.04, vb, 0, -0.27, 0, vs); bx(0.1, 0.1, 0.045, lam(0x0a1c4c), 0, -0.07, 0, vs);   // the vest, its neck
    bx(0.08, 0.025, 0.002, lam(0xf2c200), 0.09, -0.2, 0.022, vs);                               // the name tag
  }
  // ---- the aprons: a peg rail on the back wall, beside the office door, two store aprons on it and an empty peg ----
  {
    const px0 = x0 + 0.03, px1 = BOH_DOORS.office - OFFICE_DOOR_W / 2 - 0.09, pc = (px0 + px1) / 2, py = 1.72, apronM = lam(0x24408e), strap = lam(0x1a2c63);
    bx(px1 - px0, 0.07, 0.018, oakDk, pc, py, z1 - 0.009);
    [-0.14, 0, 0.14].forEach((dx, i) => {
      const p = cyl(0.008, 0.008, 0.05, oakDk, pc + dx, py, z1 - 0.04, 8); p.rotation.x = Math.PI / 2;
      if (i === 1) return;
      const a = grp(pc + dx, py - 0.02, z1 - 0.038, Math.PI);
      bx(0.11, 0.3, 0.012, apronM, 0, -0.17, 0, a); bx(0.17, 0.42, 0.012, apronM, 0, -0.52, 0, a);   // the bib, the skirt
      bx(0.012, 0.3, 0.008, strap, -0.05, -0.1, 0.008, a); bx(0.012, 0.3, 0.008, strap, 0.05, -0.1, 0.008, a);   // the neck loop
      bx(0.1, 0.1, 0.003, lam(0x1b3274), 0, -0.56, 0.008, a);                                     // the pocket
      bx(0.07, 0.03, 0.002, lam(0xf2c200), 0, -0.2, 0.008, a);                                    // the JellyBuster patch
    });
  }

  // ---- a small table and two molded chairs ----
  const tx = x0 + 4.1, tz = z0 + 0.5, TW = 0.6, TD = 0.8, TH = 0.74;   // (its narrow end to the hall wall)
  bx(TW, 0.028, TD, laminate, tx, TH - 0.014, tz);
  bx(TW + 0.012, 0.03, TD + 0.012, chrome, tx, TH - 0.03, tz);                                     // the chrome edge band
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { cyl(0.018, 0.018, TH - 0.045, chrome, tx + sx * (TW / 2 - 0.08), (TH - 0.045) / 2, tz + sz * (TD / 2 - 0.08), 8); cyl(0.03, 0.03, 0.012, blackP, tx + sx * (TW / 2 - 0.08), 0.006, tz + sz * (TD / 2 - 0.08), 10); }
  colliders.push({ x0: tx - TW / 2, x1: tx + TW / 2, z0: tz - TD / 2, z1: tz + TD / 2, y1: TH });
  {                                                                                                  // what's on it
    const y = TH;
    const nap = grp(tx - 0.14, y, tz - 0.28, 0.2); bx(0.12, 0.012, 0.06, chrome, 0, 0.006, 0, nap); for (const s of [-1, 1]) bx(0.12, 0.09, 0.004, chrome, 0, 0.05, s * 0.025, nap); bx(0.11, 0.08, 0.04, white, 0, 0.05, 0, nap);
    const salt = new THREE.CylinderGeometry(0.018, 0.02, 0.07, 10);
    put(salt, phong(0xf2f2f2, 60), tx + 0.02, y + 0.035, tz - 0.25); put(salt, phong(0x3a3530, 60), tx + 0.06, y + 0.035, tz - 0.28);
    for (const [dx, c] of [[0.08, 0xc9cdd2], [0.12, 0xc9cdd2]]) cyl(0.018, 0.018, 0.012, chrome, tx + dx - 0.06, y + 0.076, tz - 0.25 - (dx - 0.08) * 0.75, 10);
    const box = grp(tx, y, tz + 0.16, -0.15);                                                // an empty Tony's box, lid down, a grease spot coming through
    bx(0.4, 0.045, 0.4, lam(0xd8c7a4), 0, 0.0225, 0, box);
    sheet(pic((ctx, W, H) => {
      ctx.fillStyle = "#d8c7a4"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "rgba(120,80,30,0.25)"; ctx.beginPath(); ctx.ellipse(W * 0.7, H * 0.68, 40, 30, 0.4, 0, 7); ctx.fill();
      ctx.fillStyle = "#b3202a"; ctx.textAlign = "center"; ctx.font = "italic 900 40px Arial Black, Arial"; ctx.fillText("TONY'S", W / 2, H * 0.42);
      ctx.font = "bold 22px Arial"; ctx.fillText("HOT  ·  FRESH  ·  NEXT DOOR", W / 2, H * 0.56); ctx.strokeStyle = "#b3202a"; ctx.lineWidth = 4; ctx.strokeRect(20, 20, W - 40, H - 40);
    }, 256, 256), 0.39, 0.39, 0, 0.05, 0, 0, box).rotation.x = -Math.PI / 2;
    const tvg = sheet(pic((ctx, W, H) => {                                                          // the TV Guide, digest size
      ctx.fillStyle = "#f4f1e8"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#c8102e"; ctx.fillRect(0, 0, W, 46); ctx.fillStyle = "#fff"; ctx.font = "italic 900 34px Arial Black, Arial"; ctx.fillText("TV GUIDE", 10, 36);
      ctx.fillStyle = "#3b6aa0"; ctx.fillRect(10, 56, W - 20, H - 110); ctx.fillStyle = "#222"; ctx.font = "bold 16px Arial"; ctx.fillText("FALL PREVIEW: 22 NEW SHOWS", 10, H - 30);
    }, 192, 256), 0.14, 0.19, tx + 0.17, y + 0.0065, tz - 0.2); tvg.rotation.x = -Math.PI / 2; tvg.rotation.z = 0.4;   // (flat, turned 0.4 on the table: spun in its own plane before it's laid down)
    bx(0.14, 0.006, 0.19, lam(0xe8e4d8), tx + 0.17, y + 0.003, tz - 0.2).rotation.y = 0.4;   // its pages
    const mug = (x, z, c, par) => { const g = grp(x, y, z, Math.random() * 6); put(new THREE.CylinderGeometry(0.04, 0.036, 0.095, 16, 1, true), Object.assign(phong(c, 50), { side: THREE.DoubleSide }), 0, 0.0475, 0, 0, g); cyl(0.036, 0.036, 0.004, phong(c, 50), 0, 0.002, 0, 16, g); cyl(0.036, 0.036, 0.002, lam(0x3a1f0e), 0, 0.075, 0, 16, g); const h = put(new THREE.TorusGeometry(0.025, 0.007, 6, 12), phong(c, 50), 0.045, 0.05, 0, 0, g); return g; };
    mug(tx - 0.22, tz - 0.1, 0xf2f2ee);
  }
  const chairMat = phong(0xc0501e, 30, 0x333333);
  const shell = (w, d, h, r) => {                                                                   // a molded shell: a rounded slab, bevelled all round
    const s = new THREE.Shape(), x = w / 2, y = d / 2;
    s.moveTo(-x + r, -y); s.lineTo(x - r, -y); s.quadraticCurveTo(x, -y, x, -y + r); s.lineTo(x, y - r); s.quadraticCurveTo(x, y, x - r, y);
    s.lineTo(-x + r, y); s.quadraticCurveTo(-x, y, -x, y - r); s.lineTo(-x, -y + r); s.quadraticCurveTo(-x, -y, -x + r, -y);
    const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2, curveSegments: 8 }); g.translate(0, 0, -h / 2); return g;
  };
  const seatG = shell(0.42, 0.4, 0.014, 0.07).rotateX(-Math.PI / 2), backG = shell(0.42, 0.3, 0.014, 0.08), legG = new THREE.CylinderGeometry(0.011, 0.011, 0.45, 6);
  const chair = (x, z, ry) => {
    const g = grp(x, 0, z, ry); fallTops.push({ x0: x - 0.22, x1: x + 0.22, z0: z - 0.22, z1: z + 0.22, y1: 0.5 });
    put(seatG, chairMat, 0, 0.45, 0, 0, g);
    const b = put(backG, chairMat, 0, 0.7, -0.2, 0, g); b.rotation.x = -0.14;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) { const l = put(legG, chrome, sx * 0.17, 0.225, sz * 0.16, 0, g); l.rotation.z = -sx * 0.06; l.rotation.x = sz * 0.05; }
      const up = put(new THREE.CylinderGeometry(0.009, 0.009, 0.3, 6), chrome, sx * 0.17, 0.6, -0.19, 0, g); up.rotation.x = -0.14;   // the back's struts
      bx(0.012, 0.012, 0.34, chrome, sx * 0.175, 0.14, 0, g);                                                            // side rails
    }
  };
  chair(tx - TW / 2 - 0.3, tz + 0.05, Math.PI / 2); chair(tx + TW / 2 + 0.3, tz + 0.08, -Math.PI / 2 + 0.12);   // across from each other, the door side's back clear of the door swung open (LUNCH_CHAIRS sit where these do)

  // ---- kitchenette: oak base cabinets under a laminate counter with the sink sunk in it, uppers above ----
  const kx0 = x1 - 2.62, ux0 = x1 - 2.15, kx1 = x1 - 0.72, CD = 0.6, CH = 0.9, kz = z1 - CD / 2, front = z1 - CD;
  const kw = kx1 - kx0, kc = (kx0 + kx1) / 2, uw = kx1 - ux0, uc = (ux0 + kx1) / 2, sinkX = kx0 + 0.64, SW = 0.5, SD = 0.38, sz = kz - 0.03;
  const door = (x, y, w, h, zf, knob) => {                                                           // a panelled door: the slab, a raised field, a brass knob
    bx(w - 0.008, h - 0.008, 0.018, oak, x, y, zf - 0.009);
    bx(w - 0.1, h - 0.1, 0.008, oakDk, x, y, zf - 0.019); bx(w - 0.12, h - 0.12, 0.006, oak, x, y, zf - 0.024);
    if (knob) cyl(0.012, 0.009, 0.025, phong(0xb8913a, 80, 0xffeebb), x + knob[0], y + knob[1], zf - 0.035, 10).rotation.x = Math.PI / 2;
  };
  bx(kw, 0.1, CD - 0.08, blackP, kc, 0.05, kz + 0.04);                                                // the toe kick
  bx(kw, CH - 0.32, CD - 0.01, oakDk, kc, 0.1 + (CH - 0.32) / 2, kz + 0.005);                         // the carcass (low enough to clear the sink's basin)
  for (const x of [kx0 + 0.009, kx1 - 0.009]) bx(0.018, CH - 0.135, CD - 0.01, oakDk, x, 0.1 + (CH - 0.135) / 2 - 0.0, kz + 0.005);   // its end panels
  bx(kw, CH - 0.135 - 0.58, 0.018, oakDk, kc, 0.68 + (CH - 0.135 - 0.58) / 2, front + 0.009);           // the face frame behind the drawers
  for (let i = 0; i < 4; i++) { const w = kw / 4, x = kx0 + w * (i + 0.5); door(x, 0.1 + (CH - 0.32) / 2, w, CH - 0.32, front, [i % 2 ? -w / 2 + 0.06 : w / 2 - 0.06, (CH - 0.32) / 2 - 0.08]); door(x, CH - 0.04 - 0.08, w, 0.15, front, [0, 0]); }   // doors under, a drawer over each
  // the counter, built round the sink's hole, a rolled front edge
  bx(sinkX - SW / 2 - kx0 + 0.01, 0.035, CD + 0.02, laminate, (kx0 - 0.01 + sinkX - SW / 2) / 2, CH - 0.0175, kz);
  bx(kx1 + 0.01 - sinkX - SW / 2, 0.035, CD + 0.02, laminate, (kx1 + 0.01 + sinkX + SW / 2) / 2, CH - 0.0175, kz);
  bx(SW, 0.035, sz - SD / 2 - (front - 0.01), laminate, sinkX, CH - 0.0175, (front - 0.01 + sz - SD / 2) / 2);
  bx(SW, 0.035, z1 - (sz + SD / 2), laminate, sinkX, CH - 0.0175, (z1 + sz + SD / 2) / 2);
  bx(kw + 0.02, 0.012, 0.012, phong(0xb5ab90, 30), kc, CH - 0.03, front - 0.016);
  bx(uw, 0.1, 0.012, laminate, uc, CH + 0.05, z1 - 0.006);                                            // the backsplash
  {                                                                                                    // the sink: a stainless basin under the hole, a drain, twin taps
    const ss = phong(0xb9bec4, 70, 0xdddddd), SDP = 0.17, by = CH - SDP;
    bx(SW - 0.02, 0.006, SD - 0.02, ss, sinkX, by, sz);
    for (const s of [-1, 1]) { bx(0.006, SDP, SD - 0.02, ss, sinkX + s * (SW / 2 - 0.013), by + SDP / 2, sz); bx(SW - 0.02, SDP, 0.006, ss, sinkX, by + SDP / 2, sz + s * (SD / 2 - 0.013)); }
    cyl(0.03, 0.03, 0.004, lam(0x3a3c3f), sinkX, by + 0.004, sz, 14);
    cyl(0.014, 0.016, 0.2, chrome, sinkX, CH + 0.1, z1 - 0.09, 10);                                    // the gooseneck
    const sp = put(new THREE.TorusGeometry(0.07, 0.012, 8, 16, Math.PI), chrome, sinkX, CH + 0.2, z1 - 0.16, Math.PI / 2);
    for (const s of [-1, 1]) { cyl(0.02, 0.022, 0.04, chrome, sinkX + s * 0.12, CH + 0.02, z1 - 0.09, 10); bx(0.055, 0.012, 0.012, chrome, sinkX + s * 0.12, CH + 0.05, z1 - 0.09); }
    // the dish rack beside it: a plastic-coated wire rack, a mug and a plate drying
    const rx = sinkX - SW / 2 - 0.18, rk = grp(rx, CH, kz - 0.02);
    const wire = phong(0xe8e8e8, 30);
    for (const s of [-1, 1]) { bx(0.3, 0.1, 0.006, wire, 0, 0.05, s * 0.15, rk); bx(0.006, 0.1, 0.3, wire, s * 0.15, 0.05, 0, rk); }
    for (let k = -2; k <= 2; k++) bx(0.004, 0.006, 0.3, wire, k * 0.06, 0.012, 0, rk);
    const plate = put(new THREE.CylinderGeometry(0.11, 0.09, 0.012, 20), phong(0xf4f2ea, 60), -0.06, 0.12, 0, 0, rk); plate.rotation.z = Math.PI / 2 - 0.12;
    const m = grp(rx + 0.07, CH + 0.06, kz - 0.02); m.rotation.z = Math.PI - 0.3;
    const blue = phong(0x2d5aa8, 50);                                                                 // (upside down, drying: open tube drawn both sides, so you see in, and its base)
    put(new THREE.CylinderGeometry(0.04, 0.036, 0.095, 14, 1, true), Object.assign(phong(0x2d5aa8, 50), { side: THREE.DoubleSide }), 0, 0, 0, 0, m); put(new THREE.TorusGeometry(0.025, 0.007, 6, 12), blue, 0.045, 0, 0, 0, m);
    cyl(0.036, 0.036, 0.004, blue, 0, -0.0455, 0, 14, m);
    cyl(0.028, 0.03, 0.17, phong(0x3aa04a, 60, 0x99ff99), sinkX - 0.21, CH + 0.085, z1 - 0.07, 10);   // dish soap, behind the basin
    cyl(0.008, 0.012, 0.03, lam(0xe0e0e0), sinkX - 0.21, CH + 0.185, z1 - 0.07, 8);
    bx(0.09, 0.03, 0.06, lam(0xe0c02a), sinkX + 0.2, CH + 0.015, z1 - 0.07); bx(0.09, 0.01, 0.06, lam(0x2f7a3a), sinkX + 0.2, CH + 0.035, z1 - 0.07);   // the sponge
    bx(0.9, 0.012, 0.6, lam(0x2a2b2d), sinkX, 0.006, front - 0.32);                                  // the rubber mat in front of it
  }
  const UD = 0.33, uy0 = 1.45, uy1 = 2.15;
  bx(uw, uy1 - uy0, UD - 0.02, oakDk, uc, (uy0 + uy1) / 2, z1 - UD / 2 + 0.01);
  for (let i = 0; i < 3; i++) { const w = uw / 3; door(ux0 + w * (i + 0.5), (uy0 + uy1) / 2, w, uy1 - uy0, z1 - UD, [i % 2 ? -w / 2 + 0.06 : w / 2 - 0.06, -(uy1 - uy0) / 2 + 0.08]); }
  bx(uw + 0.03, 0.04, UD + 0.02, oakDk, uc, uy1 + 0.02, z1 - UD / 2);                                 // the crown
  {                                                                                                    // a paper towel roll under the uppers
    const ty = uy0 - 0.08, tx2 = ux0 + 0.3;
    for (const s of [-1, 1]) bx(0.01, 0.08, 0.04, chrome, tx2 + s * 0.15, uy0 - 0.04, z1 - UD + 0.1);
    cyl(0.055, 0.055, 0.28, white, tx2, ty, z1 - UD + 0.1, 16).rotation.z = Math.PI / 2;
    sheet(lam(0xeeeeea), 0.27, 0.12, tx2, ty - 0.11, z1 - UD + 0.045, Math.PI);
  }
  colliders.push({ x0: kx0, x1: kx1, z0: z1 - CD, z1, y1: CH });
  // the coffee maker, between the sink and the microwave: base and warming plate, the reservoir tower, the brew head over the pot (the pot's on while the store's open)
  {
    const g = grp(kx0 + 1.04, CH, kz + 0.04), bp = blackP;
    bx(0.2, 0.04, 0.26, bp, 0, 0.02, 0, g); bx(0.2, 0.38, 0.09, bp, 0, 0.19, 0.085, g); bx(0.2, 0.08, 0.24, bp, 0, 0.34, 0.01, g);
    cyl(0.065, 0.065, 0.008, lam(0x2e2e30), 0, 0.044, -0.035, 18, g);
    const pot = put(new THREE.LatheGeometry([[0.001, 0], [0.06, 0.002], [0.074, 0.04], [0.072, 0.1], [0.055, 0.15], [0.05, 0.16]].map(([r, y]) => new THREE.Vector2(r, y)), 20),
      new THREE.MeshPhongMaterial({ color: 0xcfd8de, specular: 0xffffff, shininess: 120, transparent: true, opacity: 0.35, side: THREE.DoubleSide }), 0, 0.048, -0.035, 0, g);
    breakFx.coffee = put(new THREE.CylinderGeometry(0.068, 0.062, 0.07, 18), phong(0x2a1608, 90, 0x886644), 0, 0.085, -0.035, 0, g);
    cyl(0.052, 0.052, 0.02, bp, 0, 0.215, -0.035, 16, g);
    const hd = put(new THREE.TorusGeometry(0.035, 0.01, 6, 12, Math.PI), bp, 0.075, 0.13, -0.035, Math.PI / 2, g); hd.rotation.z = -Math.PI / 2;
    breakFx.coffeeLed = new THREE.MeshBasicMaterial({ color: 0x401010 }); glow(bx(0.012, 0.012, 0.004, breakFx.coffeeLed, 0.06, 0.02, -0.131, g));
    for (let k = 0; k < 6; k++) cyl(0.036, 0.028, 0.08, lam(0xfafaf6), kx0 + 1.24, CH + 0.04 + k * 0.022, kz - 0.17, 12);   // a sleeve of styrofoam cups
    cyl(0.06, 0.06, 0.15, phong(0xb7362c, 50), kx0 + 1.24, CH + 0.075, kz + 0.14, 16); cyl(0.061, 0.061, 0.012, lam(0x222222), kx0 + 1.24, CH + 0.155, kz + 0.14, 16);   // the coffee can
  }
  // the microwave: almond, a dark window with its screen, the keypad, and the clock blinking 12:00 (see breakroomTick)
  {
    const g = grp(kx1 - 0.27, CH, kz + 0.02), MW = 0.5, MH = 0.29, MD = 0.36;
    bx(MW, MH, MD, almond, 0, MH / 2 + 0.012, 0, g);
    for (const s of [-1, 1]) for (const t of [-1, 1]) cyl(0.012, 0.012, 0.012, blackP, s * 0.2, 0.006, t * 0.14, 8, g);
    sheet(new THREE.MeshPhongMaterial({ map: makeTexture((ctx, W, H) => { ctx.fillStyle = "#111"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "rgba(90,90,90,0.5)"; for (let x = 0; x < W; x += 6) for (let y = 0; y < H; y += 6) ctx.fillRect(x, y, 3, 3); }, 128, 96), specular: 0x666666, shininess: 90 }), 0.3, 0.2, -0.06, MH / 2 + 0.012, -MD / 2 - 0.005, Math.PI, g);
    bx(0.02, 0.18, 0.02, almond, 0.105, MH / 2 + 0.012, -MD / 2 - 0.012, g);                          // the door pull
    sheet(pic((ctx, W, H) => { ctx.fillStyle = "#d9d0b6"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#111"; ctx.fillRect(10, 10, W - 20, 30);
      ctx.font = "bold 13px Arial"; ctx.textAlign = "center"; const k = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "CLR", "0", "START"];
      k.forEach((t, i) => { const x = 18 + (i % 3) * 26, y = 58 + Math.floor(i / 3) * 24; ctx.fillStyle = i === 11 ? "#2f7a3a" : "#ece6d6"; ctx.fillRect(x - 10, y - 9, 20, 17); ctx.fillStyle = "#222"; ctx.fillText(t.length > 2 ? t[0] : t, x, y + 4); });
      ctx.fillStyle = "#444"; ctx.font = "bold 11px Arial"; ctx.fillText("POPCORN", W / 2, H - 24); ctx.fillText("DEFROST", W / 2, H - 10);
    }, 96, 192), 0.1, 0.22, 0.18, MH / 2 + 0.012, -MD / 2 - 0.005, Math.PI, g);
    const dig = makeTexture((ctx, W, H) => { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#59ff8a"; ctx.font = "bold 44px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("12:00", W / 2, H / 2 + 2); }, 128, 48);
    breakFx.clock12 = glow(sheet(new THREE.MeshBasicMaterial({ map: dig }), 0.075, 0.024, 0.18, MH / 2 + 0.012 + 0.092, -MD / 2 - 0.01, Math.PI, g));
  }
  // the fridge in the corner: almond, top freezer, under magnets
  {
    const fx = x1 - 0.34, FH = 1.72, ff = z1 - 0.68;
    bx(0.66, FH - 0.06, 0.66, almond, fx, 0.06 + (FH - 0.06) / 2, z1 - 0.33);
    bx(0.6, 0.06, 0.6, blackP, fx, 0.03, z1 - 0.33);                                                   // the kick grille
    bx(0.66, 0.006, 0.006, lam(0x6a6458), fx, FH * 0.68, ff + 0.018);                                // freezer / fridge split
    for (const [y, h] of [[FH * 0.84, 0.24], [FH * 0.47, 0.46]]) { bx(0.03, h, 0.035, almond, fx - 0.27, y, ff - 0.025); for (const s of [-1, 1]) bx(0.03, 0.03, 0.025, almond, fx - 0.27, y + s * (h / 2 - 0.015), ff - 0.012); }   // handles
    const paper = (draw, w, h, x, y, rot, mag) => {                                                    // something stuck to the door, a magnet on top
      const s = sheet(pic(draw, Math.round(w * 800), Math.round(h * 800)), w, h, x, y, ff + 0.012 - Math.random() * 0.004, Math.PI); s.rotation.z = rot;
      if (mag) cyl(0.012, 0.012, 0.008, lam(mag), x + Math.sin(rot) * h / 2, y + h / 2 - 0.015, ff + 0.004, 10).rotation.x = Math.PI / 2;
    };
    paper((ctx, W, H) => { ctx.fillStyle = "#fffdf6"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#b3202a"; ctx.fillRect(0, 0, W, H * 0.2); ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = `italic 900 ${W * 0.13}px Arial Black, Arial`; ctx.fillText("TONY'S PIZZA", W / 2, H * 0.14);
      ctx.fillStyle = "#333"; ctx.font = `bold ${W * 0.06}px Arial`; ctx.textAlign = "left";
      ["Cheese  sm 6.50  lg 8.99", "Pepperoni   7.25  9.99", "The Works   9.50 12.99", "Garlic knots       2.50", "Calzone            5.75", "Wings (10)         4.99"].forEach((l, i) => ctx.fillText(l, W * 0.08, H * 0.32 + i * H * 0.1));
      ctx.textAlign = "center"; ctx.fillStyle = "#b3202a"; ctx.font = `bold ${W * 0.065}px Arial`; ctx.fillText("WE'RE RIGHT NEXT DOOR!", W / 2, H * 0.94);
    }, 0.2, 0.28, fx - 0.08, 1.0, 0.04, 0xf2c200);
    paper((ctx, W, H) => { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); ctx.lineWidth = 6; ctx.lineCap = "round";   // a kid's crayon drawing: a house, a sun, the store?
      ctx.strokeStyle = "#e0402a"; ctx.strokeRect(W * 0.2, H * 0.45, W * 0.45, H * 0.4); ctx.beginPath(); ctx.moveTo(W * 0.15, H * 0.47); ctx.lineTo(W * 0.42, H * 0.2); ctx.lineTo(W * 0.7, H * 0.47); ctx.stroke();
      ctx.strokeStyle = "#f2c200"; ctx.beginPath(); ctx.arc(W * 0.82, H * 0.18, W * 0.09, 0, 7); ctx.stroke(); ctx.strokeStyle = "#2f8a3a"; ctx.beginPath(); ctx.moveTo(0, H * 0.88); ctx.lineTo(W, H * 0.86); ctx.stroke();
      ctx.fillStyle = "#2d5aa8"; ctx.font = `bold ${W * 0.1}px Comic Sans MS, Arial`; ctx.fillText("4 DANA", W * 0.06, H * 0.12);
    }, 0.21, 0.16, fx + 0.12, 1.36, -0.08, 0xd2302c);
    paper((ctx, W, H) => { ctx.fillStyle = "#fbfbf4"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#c22"; ctx.textAlign = "center"; ctx.font = `bold ${W * 0.12}px Arial`; ctx.fillText("PLEASE", W / 2, H * 0.3); ctx.fillText("LABEL YOUR", W / 2, H * 0.52); ctx.fillText("FOOD!!", W / 2, H * 0.74); ctx.fillStyle = "#333"; ctx.font = `${W * 0.07}px Arial`; ctx.fillText("- mgmt", W * 0.7, H * 0.92); }, 0.18, 0.13, fx + 0.1, 0.72, 0.02, 0x2d5aa8);
    paper((ctx, W, H) => { ctx.fillStyle = "#f6f6f0"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#7a9ac0"; ctx.fillRect(W * 0.07, H * 0.06, W * 0.86, H * 0.66); ctx.fillStyle = "#c79a74"; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(W * (0.22 + k * 0.19), H * 0.38, W * 0.06, 0, 7); ctx.fill(); ctx.fillRect(W * (0.15 + k * 0.19), H * 0.47, W * 0.14, H * 0.25); }
      ctx.fillStyle = "#333"; ctx.font = `${W * 0.08}px Arial`; ctx.fillText("xmas party!", W * 0.12, H * 0.88); }, 0.1, 0.12, fx - 0.12, 1.45, 0.12, 0x2f8a3a);
    for (const [x, y, c] of [[fx + 0.18, 1.6, 0xf2c200], [fx - 0.2, 0.6, 0xd2302c], [fx + 0.22, 0.45, 0x2f8a3a]]) cyl(0.014, 0.014, 0.01, lam(c), x, y, ff + 0.014, 10).rotation.x = Math.PI / 2;   // spare magnets
    bx(0.3, 0.06, 0.28, white, fx - 0.08, FH + 0.03, z1 - 0.32); bx(0.2, 0.28, 0.07, lam(0xc8502a), fx + 0.15, FH + 0.14, z1 - 0.3);   // paper plates; a cereal box someone keeps up there
    colliders.push({ x0: fx - 0.33, x1: fx + 0.33, z0: ff, z1, y1: FH });
  }
  sheet(pic((ctx, W, H) => {                                                                          // over the sink
    ctx.fillStyle = "#fffef4"; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = "#c22"; ctx.lineWidth = 6; ctx.strokeRect(6, 6, W - 12, H - 12);
    ctx.fillStyle = "#222"; ctx.textAlign = "center"; ctx.font = "bold 30px Arial"; ctx.fillText("YOUR MOTHER", W / 2, 50); ctx.fillText("DOESN'T WORK HERE", W / 2, 88);
    ctx.font = "22px Arial"; ctx.fillText("wash your own dishes!", W / 2, 128);
  }, 384, 150), 0.3, 0.117, sinkX + 0.02, 1.22, z1 - 0.008, Math.PI);

  // trash can under the office's window: open top, a liner turned over the rim (what's in it: see trashBins)
  {
    const cx = (OFFICE_WIN.x0 + OFFICE_WIN.x1) / 2, cz = z1 - 0.2;                                  // (under the office's window)
    const can = put(new THREE.LatheGeometry([[0.15, 0], [0.17, 0.55], [0.162, 0.55], [0.142, 0.015], [0.001, 0.015]].map(([r, y]) => new THREE.Vector2(r, y)), 28),
      new THREE.MeshPhongMaterial({ color: 0x3b4a5a, specular: 0x333333, shininess: 20, side: THREE.DoubleSide }), cx, 0, cz);
    const liner = put(new THREE.TorusGeometry(0.168, 0.007, 6, 30), new THREE.MeshLambertMaterial({ color: 0xd8dde2 }), cx, 0.55, cz); liner.rotation.x = Math.PI / 2;
    trashBins.breakroom = { id: "breakroom", name: "break room trash", cap: 10, x: cx, z: cz, rimY: 0.55, r: 0.15, liner: 0xd8dde2, parts: [can, liner], stand: { x: cx, z: cz - 0.62, ry: Math.PI } };
    colliders.push({ x0: cx - 0.17, x1: cx + 0.17, z0: cz - 0.17, z1: cz + 0.17, y1: 0.55 });
  }

  // ---- the TV/VCR up on a bracket in the corner over the table, turned to it ----
  {
    const g = grp(x0 + 0.42, 2.0, z1 - 0.42, -Math.PI / 4), shellM = phong(0x2b2c2f, 30);
    bx(0.06, 0.06, 0.5, shellM, 0, 0.12, 0.32, g).rotation.y = 0; bx(0.36, 0.02, 0.36, shellM, 0, -0.27, 0.02, g);   // the arm off the corner, the shelf
    bx(0.44, 0.34, 0.34, shellM, 0, -0.08, 0.04, g); bx(0.3, 0.24, 0.1, shellM, 0, -0.08, 0.24, g);   // the set, its tube's bulge behind
    bx(0.38, 0.07, 0.3, phong(0x1d1e20, 40), 0, -0.3, 0.02, g);                                        // the VCR under it
    breakFx.vcr = new THREE.MeshBasicMaterial({ color: 0x0c2a12 }); glow(sheet(breakFx.vcr, 0.06, 0.016, 0.08, -0.3, -0.176, Math.PI, g));
    breakFx.tv = new THREE.MeshBasicMaterial({ color: 0x15181a }); breakFx.tvMesh = glow(sheet(breakFx.tv, 0.34, 0.25, -0.02, -0.08, -0.136, Math.PI, g));
    sheet(new THREE.MeshPhongMaterial({ color: 0x000000, specular: 0x999999, shininess: 120, transparent: true, opacity: 0.25 }), 0.34, 0.25, -0.02, -0.08, -0.141, Math.PI, g);   // the glass's sheen
    for (let k = 0; k < 2; k++) cyl(0.008, 0.008, 0.012, lam(0x777777), 0.18, -0.03 - k * 0.04, -0.134, 8, g).rotation.x = Math.PI / 2;   // its knobs
  }

  // ---- by the door: the punch clock and its card rack ----
  {
    const g = grp(x0 + 0.72, 1.38, z0, Math.PI);                                                             // (facing +z, into the room)
    bx(0.26, 0.34, 0.15, phong(0xcfc6ae, 30), 0, 0, -0.075, g); bx(0.27, 0.06, 0.16, phong(0x8a8478, 30), 0, -0.19, -0.08, g);
    sheet(pic((ctx, W) => { ctx.fillStyle = "#cfc6ae"; ctx.fillRect(0, 0, W, W); ctx.fillStyle = "#f4f1e6"; ctx.beginPath(); ctx.arc(W / 2, W / 2, W / 2 - 6, 0, 7); ctx.fill(); ctx.strokeStyle = "#222"; ctx.lineWidth = 6; ctx.stroke();
      ctx.fillStyle = "#222"; ctx.font = "bold 18px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; for (let i = 1; i <= 12; i++) { const a = i * Math.PI / 6; ctx.fillText(i, W / 2 + Math.sin(a) * W * 0.36, W / 2 - Math.cos(a) * W * 0.36); }
      ctx.font = "bold 12px Arial"; ctx.fillText("SIMPLEX", W / 2, W * 0.68); }, 128, 128), 0.15, 0.15, 0, 0.05, -0.156, Math.PI, g);
    bx(0.12, 0.012, 0.03, blackP, 0, 0.16, -0.12, g);                                                   // the card slot on top
    breakFx.punch = { g, h: null, m: null };
    const hand = (len, w) => { const p = new THREE.Group(); p.position.set(0, 0.05, -0.162); g.add(p); bx(w, len, 0.002, lam(0x111111), 0, len / 2 - 0.01, 0, p); return p; };
    breakFx.punch.h = hand(0.04, 0.008); breakFx.punch.m = hand(0.06, 0.005);
    const r = grp(x0 + 1.12, 1.32, z0, Math.PI);                                                             // the rack: a row of slots, a card for each of us
    bx(0.2, 0.5, 0.04, phong(0x9a9488, 30), 0, 0, -0.02, r);
    for (let k = 0; k < 6; k++) { bx(0.19, 0.012, 0.03, phong(0x6a665c, 30), 0, -0.22 + k * 0.08, -0.05, r); if (k !== 1 && k < 5) bx(0.09, 0.18, 0.003, lam(0xe4d6a8), (k % 2 ? 0.035 : -0.035), -0.18 + k * 0.08, -0.04, r); }
  }
  // the extinguisher under the office's window beside the trash (its sign low, under it: the window's over it), the first aid kit and the labor law poster on the east wall
  {
    const ex = OFFICE_WIN.x0 + 0.2, ez = z1 - 0.1;
    cyl(0.07, 0.07, 0.42, phong(0xc0161b, 70, 0xffaaaa), ex, 0.55, ez, 16); put(new THREE.SphereGeometry(0.07, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), phong(0xc0161b, 70, 0xffaaaa), ex, 0.76, ez);
    bx(0.05, 0.08, 0.04, blackP, ex, 0.86, ez); bx(0.03, 0.012, 0.1, blackP, ex, 0.89, ez - 0.03); const hose = put(new THREE.TorusGeometry(0.1, 0.008, 6, 12, Math.PI * 0.8), blackP, ex, 0.76, ez - 0.065);
    bx(0.16, 0.06, 0.03, chrome, ex, 0.68, z1 - 0.015);                                                    // its hook
    sheet(pic((ctx, W, H) => { ctx.fillStyle = "#c0161b"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "bold 22px Arial"; ctx.fillText("FIRE", W / 2, 34); ctx.fillText("EXTINGUISHER", W / 2, 62); }, 192, 80), 0.24, 0.1, ex, 0.21, z1 - 0.008, Math.PI);
    const fa = grp(x1, 1.5, z0 + 0.85, -Math.PI / 2);
    bx(0.3, 0.22, 0.1, phong(0xf2f2ee, 40), 0, 0, 0.05, fa);
    sheet(pic((ctx, W, H) => { ctx.fillStyle = "#f2f2ee"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#c0161b"; ctx.fillRect(W / 2 - 14, 14, 28, 72); ctx.fillRect(W / 2 - 36, 36, 72, 28); ctx.fillStyle = "#222"; ctx.textAlign = "center"; ctx.font = "bold 16px Arial"; ctx.fillText("FIRST AID", W / 2, H - 14); }, 128, 128), 0.24, 0.2, 0, 0, 0.106, 0, fa);
    sheet(pic((ctx, W, H) => {                                                                            // the poster the law makes you put up, never read
      ctx.fillStyle = "#f6f3e8"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#1f3f7a"; ctx.fillRect(0, 0, W, 64); ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "bold 26px Arial"; ctx.fillText("YOUR RIGHTS UNDER THE", W / 2, 28); ctx.fillText("FAIR LABOR STANDARDS ACT", W / 2, 56);
      ctx.fillStyle = "#c22"; ctx.font = "bold 32px Arial"; ctx.fillText("FEDERAL MINIMUM WAGE", W / 2, 112); ctx.font = "bold 64px Arial"; ctx.fillText("$4.25", W / 2, 186); ctx.fillStyle = "#333"; ctx.font = "20px Arial"; ctx.fillText("PER HOUR", W / 2, 214);
      ctx.textAlign = "left"; ctx.font = "15px Arial"; for (let y = 250; y < H - 20; y += 20) ctx.fillText("—— ———— ——— —— ————— ——— ———— —— ———", 24, y);
    }, 420, 560), 0.42, 0.56, x1 - 0.008, 1.5, z0 + 1.38, -Math.PI / 2);
  }

  // ---- the bulletin board on the hall wall: this week's schedule, notices, a Polaroid ----
  const board = makeTexture((ctx, W, H) => {
    ctx.fillStyle = "#a9794a"; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 4000; i++) { ctx.fillStyle = Math.random() < 0.5 ? "rgba(120,80,40,0.5)" : "rgba(200,150,95,0.5)"; ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
    const note = (x, y, w, h, bg, lines, rot, fs = 26, pin = "#c22") => {
      ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot); ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(-w / 2 + 4, -h / 2 + 5, w, h); ctx.fillStyle = bg; ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = "#222"; ctx.font = `bold ${fs}px Arial`; lines.forEach((l, i) => ctx.fillText(l, -w / 2 + 14, -h / 2 + fs + 12 + i * fs * 1.25));
      ctx.fillStyle = pin; ctx.beginPath(); ctx.arc(0, -h / 2 + 10, 8, 0, 7); ctx.fill(); ctx.restore();
    };
    note(40, 36, 450, 400, "#fff", ["SCHEDULE - WEEK OF", "MON   NICK / DANA", "TUE   DANA / RAY", "WED   NICK / TINA", "THU   RAY / TINA", "FRI   ALL HANDS", "SAT   NICK / DANA", "SUN   CLOSE 9PM"], -0.02, 30);
    note(540, 40, 340, 200, "#fff59a", ["BE KIND, REWIND!", "CHECK EVERY", "RETURN FOR", "REWIND + CASE"], 0.05, 30, "#2a62c4");
    note(560, 290, 300, 160, "#bfe3ff", ["LOST: BLUE", "LUNCHBOX", "  - DANA"], -0.04, 30, "#2a8a3a");
    note(60, 470, 400, 56, "#ffd0d0", ["NEW RELEASE WALL FRI"], 0.03, 28);
    note(910, 60, 160, 150, "#e8ffd8", ["SHIFT", "SWAP?", "SAT -> RAY"], 0.08, 24, "#c22");
    ctx.save(); ctx.translate(980, 380); ctx.rotate(-0.1); ctx.fillStyle = "#f6f6f0"; ctx.fillRect(-80, -95, 160, 190); ctx.fillStyle = "#4a6a90"; ctx.fillRect(-68, -83, 136, 136);   // a Polaroid of the crew
    ctx.fillStyle = "#c79a74"; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(-40 + k * 40, -30, 13, 0, 7); ctx.fill(); ctx.fillRect(-52 + k * 40, -16, 24, 36); }
    ctx.fillStyle = "#333"; ctx.font = "italic 20px Arial"; ctx.fillText("grand opening", -62, 80); ctx.restore();
  }, 1152, 560);
  put(new THREE.PlaneGeometry(1.2, 0.66), new THREE.MeshLambertMaterial({ map: board, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), tx - 0.05, 1.38, z0 + 0.014);   // (clear of the frame's face, 6 mm proud of the wall)
  bx(1.26, 0.72, 0.02, oakDk, tx - 0.05, 1.38, z0 - 0.004);                                                      // frame

  // ---- the wall clock over the table, keeping the shift's time (see breakroomTick), employee of the month beside it ----
  {
    const clock = makeTexture((ctx, W) => {
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(W / 2, W / 2, W / 2 - 4, 0, 7); ctx.fill();
      ctx.lineWidth = 10; ctx.strokeStyle = "#222"; ctx.stroke();
      ctx.fillStyle = "#222"; ctx.font = "bold 26px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (let i = 1; i <= 12; i++) { const a = i * Math.PI / 6; ctx.fillText(i, W / 2 + Math.sin(a) * W * 0.37, W / 2 - Math.cos(a) * W * 0.37); }
      for (let i = 0; i < 60; i++) { const a = i * Math.PI / 30; ctx.fillRect(W / 2 + Math.sin(a) * W * 0.45 - 1, W / 2 - Math.cos(a) * W * 0.45 - 1, 2, 2); }
    }, 256, 256);
    const g = grp(x0 + 1.12, 1.92, z0);                                                              // (the hall wall, over the card rack)
    put(new THREE.CircleGeometry(0.16, 32), new THREE.MeshLambertMaterial({ map: clock }), 0, 0, 0.006, 0, g);
    put(new THREE.TorusGeometry(0.163, 0.012, 6, 32), blackP, 0, 0, 0.01, 0, g);
    const hand = (len, w, c, z) => { const p = new THREE.Group(); p.position.z = z; g.add(p); bx(w, len, 0.003, lam(c), 0, len / 2 - 0.02, 0, p); return p; };
    breakFx.clock = { h: hand(0.09, 0.012, 0x111111, 0.014), m: hand(0.13, 0.008, 0x111111, 0.017), s: hand(0.14, 0.003, 0xc22222, 0.02) };
    cyl(0.01, 0.01, 0.006, lam(0x111111), 0, 0, 0.021, 10, g).rotation.x = Math.PI / 2;
  }
  const eotm = makeTexture((ctx, W, H) => {
    ctx.fillStyle = "#00349c"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#ffd400"; ctx.font = "bold 22px Arial Black, Arial"; ctx.textAlign = "center";
    ctx.fillText("EMPLOYEE", W / 2, 34); ctx.fillText("OF THE MONTH", W / 2, 60);
    ctx.fillStyle = "#ddd"; ctx.fillRect(W / 2 - 60, 76, 120, 140);                            // photo
    ctx.fillStyle = "#c9a07a"; ctx.beginPath(); ctx.arc(W / 2, 128, 34, 0, 7); ctx.fill(); ctx.fillRect(W / 2 - 46, 168, 92, 48);
    ctx.fillStyle = "#fff"; ctx.font = "bold 20px Arial"; ctx.fillText("DANA", W / 2, 246);
  }, 256, 270);
  // ---- awards and recognition, over the bulletin board on the hall wall: employee of the month, the district's plaque and certificate, and by the punch clock, the sign-in clipboard ----
  const ay = 2.03, ax = BOH_DOORS.breakroom + 0.92;
  put(new THREE.PlaneGeometry(0.4, 0.42), new THREE.MeshLambertMaterial({ map: eotm, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), ax, ay, z0 + 0.02);
  bx(0.44, 0.46, 0.012, lam(0xc9a64a), ax, ay, z0 + 0.006);                                                    // its gold-tone frame
  bx(0.32, 0.4, 0.02, oakDk, ax + 0.48, ay, z0 + 0.01);                                                         // a walnut plaque, its engraved brass plate
  sheet(pic((ctx, W, H) => {
    ctx.fillStyle = "#c9a64a"; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = "#6b5218"; ctx.lineWidth = 5; ctx.strokeRect(6, 6, W - 12, H - 12); ctx.fillStyle = "#2a1e08"; ctx.textAlign = "center";
    ctx.font = "bold 21px Georgia, serif"; ctx.fillText("DISTRICT 7", W / 2, 44); ctx.font = "italic 18px Georgia, serif"; ctx.fillText("Most Rentals", W / 2, 88); ctx.fillText("Per Square Foot", W / 2, 112);
    ctx.font = "bold 22px Georgia, serif"; ctx.fillText("3RD PLACE", W / 2, 164); ctx.font = "15px Georgia, serif"; ctx.fillText("Runner-up, Friendliest Staff", W / 2, 204);
  }, 256, 256), 0.25, 0.3, ax + 0.48, ay, z0 + 0.022);
  bx(0.32, 0.25, 0.012, blackP, ax + 0.91, ay + 0.04, z0 + 0.006);                                              // a framed certificate, hung not quite straight
  sheet(pic((ctx, W, H) => {
    ctx.fillStyle = "#f4efdc"; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = "#1f3f7a"; ctx.lineWidth = 7; ctx.strokeRect(10, 10, W - 20, H - 20); ctx.fillStyle = "#1f3f7a"; ctx.textAlign = "center"; ctx.font = "italic bold 26px Georgia, serif"; ctx.fillText("Certificate of Achievement", W / 2, 58);
    ctx.fillStyle = "#333"; ctx.font = "17px Georgia, serif"; ctx.fillText("presented to the whole crew for", W / 2, 96); ctx.font = "bold 20px Georgia, serif"; ctx.fillText("50,000 TAPES REWOUND", W / 2, 130); ctx.fillStyle = "#b3202a"; ctx.beginPath(); ctx.arc(W - 62, H - 52, 22, 0, 7); ctx.fill();
  }, 384, 256), 0.29, 0.21, ax + 0.91, ay + 0.04, z0 + 0.014).rotation.z = -0.025;
  { const cb = grp(x0 + 1.52, 1.34, z0); bx(0.23, 0.32, 0.01, lam(0x7a5a38), 0, 0, 0.005, cb); bx(0.09, 0.03, 0.012, chrome, 0, 0.145, 0.012, cb);   // the clipboard, its sign-in sheet
    sheet(pic((ctx, W, H) => { ctx.fillStyle = "#f7f4e8"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#222"; ctx.font = "bold 19px Arial"; ctx.textAlign = "center"; ctx.fillText("CASH-OUT LOG", W / 2, 26); ctx.textAlign = "left"; ctx.font = "italic 15px Arial"; for (let i = 0; i < 12; i++) { ctx.fillStyle = "#b9c8df"; ctx.fillRect(10, 46 + i * 20, W - 20, 1); ctx.fillStyle = "#22304f"; if (i < 8) ctx.fillText(["Dana", "Ray", "Nick", "Tina"][i % 4] + "  " + (10 + i) + ":00", 18, 43 + i * 20); } }, 192, 280), 0.2, 0.28, 0, -0.012, 0.012, 0, cb); }

  // ---- vinyl cove base round the room (not across the doorway) ----
  {
    const cove = lam(0x4a4a4c), H = 0.1, t = 0.012;
    bx(t, H, z1 - z0, cove, x0 + t / 2, H / 2, (z0 + z1) / 2); bx(t, H, z1 - z0, cove, x1 - t / 2, H / 2, (z0 + z1) / 2);
    const o0 = BOH_DOORS.office - OFFICE_DOOR_W / 2 - 0.08, o1 = BOH_DOORS.office + OFFICE_DOOR_W / 2 + 0.08;
    bx(o0 - x0, H, t, cove, (x0 + o0) / 2, H / 2, z1 - t / 2); bx(x1 - o1, H, t, cove, (o1 + x1) / 2, H / 2, z1 - t / 2);
    const d0 = BOH_DOORS.breakroom - DOOR_W / 2 - 0.08, d1 = BOH_DOORS.breakroom + DOOR_W / 2 + 0.08;
    bx(d0 - x0, H, t, cove, (x0 + d0) / 2, H / 2, z0 + t / 2); bx(x1 - d1, H, t, cove, (d1 + x1) / 2, H / 2, z0 + t / 2);
  }
}

// ---- the restrooms: women's to the west (two stalls), men's to the east (a stall and a urinal) ----
// Each room (1.7 m x 5 m) has a pedestal sink under a framed mirror on its west wall, a single-lever faucet, a paper
// towel dispenser and a little wastebasket beside it, tiled wainscot all round, and at the back its stalls: two-piece
// toilets on the back wall behind grey steel partitions. E flushes (each its own, the urinal too) and runs each tap (see bath)
{
  const z0 = HZ + 0.1, z1 = BZ1 - 0.1;
  const put = (geo, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; scene.add(o); return o; };
  const china = new THREE.MeshPhongMaterial({ color: 0xf7f7f3, specular: 0x9a9a9a, shininess: 85, side: THREE.DoubleSide });
  const chrome = new THREE.MeshPhongMaterial({ color: 0xd4d8dd, specular: 0xffffff, shininess: 110 });
  const cream = new THREE.MeshPhongMaterial({ color: 0xebe7de, specular: 0x444444, shininess: 30 });
  const darkP = new THREE.MeshPhongMaterial({ color: 0x33373c, specular: 0x333333, shininess: 25 });
  const rrect = (w, d, r) => {                   // a rounded rectangle, w along x, d along the shape's y
    const s = new THREE.Shape(), x = w / 2, y = d / 2;
    s.moveTo(-x + r, -y); s.lineTo(x - r, -y); s.quadraticCurveTo(x, -y, x, -y + r); s.lineTo(x, y - r); s.quadraticCurveTo(x, y, x - r, y);
    s.lineTo(-x + r, y); s.quadraticCurveTo(-x, y, -x, y - r); s.lineTo(-x, -y + r); s.quadraticCurveTo(-x, -y, -x + r, -y); return s;
  };
  const slab = (shape, h, m, b = 0.008) => {    // that shape extruded up h from y 0, edges rounded over
    const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.001, h - 2 * b), bevelEnabled: b > 0, bevelSize: b, bevelThickness: b, bevelSegments: 3, curveSegments: 12 });
    g.rotateX(-Math.PI / 2); g.translate(0, b, 0); return new THREE.Mesh(g, m);
  };
  const place = (o, x, y, z, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; scene.add(o); return o; };
  const lathe = (pts, m, segs = 32) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs), m);
  const tube = (pts, r, m) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 24, r, 10), m);

  // tiled wainscot to 1.05 m (under the light switch): 10 cm glazed squares, a blue cap row on top
  const WH = 1.05;
  const tileTex = makeTexture((ctx, W, H) => {
    ctx.fillStyle = "#b9bec4"; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const g = ctx.createLinearGradient(0, j * 64, 0, j * 64 + 62); g.addColorStop(0, "#f4f6f7"); g.addColorStop(1, "#e3e8ec");
      ctx.fillStyle = g; ctx.fillRect(i * 64 + 2, j * 64 + 2, 60, 60);
    }
  }, 256, 256);
  tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping;
  const tileMat = (len) => { const t = tileTex.clone(); t.needsUpdate = true; t.repeat.set(len / 0.4, WH / 0.4); return new THREE.MeshLambertMaterial({ map: t }); };
  const capMat = new THREE.MeshLambertMaterial({ color: 0x2a4d8a });
  const wains = (a0, a1, alongX, at, face) => {  // one wall's run: along x (at = z) or along z (at = x); face = which way it looks
    const len = a1 - a0, c = (a0 + a1) / 2, off = face * 0.003;
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(len, WH), tileMat(len));
    if (alongX) { pl.position.set(c, WH / 2, at + off); pl.rotation.y = face > 0 ? 0 : Math.PI; } else { pl.position.set(at + off, WH / 2, c); pl.rotation.y = face > 0 ? Math.PI / 2 : -Math.PI / 2; }
    scene.add(pl);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len : 0.014, 0.06, alongX ? 0.014 : len), capMat);
    cap.position.set(alongX ? c : at + face * 0.007, WH + 0.03, alongX ? at + face * 0.007 : c); scene.add(cap);
  };
  const walls = (x0, x1, door) => {             // a room's wainscot: its side walls, its back, either side of its door
    wains(z0, z1, false, x0, 1); wains(z0, z1, false, x1, -1); wains(x0, x1, true, z1, -1);
    wains(x0, door - DOOR_W / 2 - 0.04, true, z0, 1); wains(door + DOOR_W / 2 + 0.04, x1, true, z0, 1);
  };

  // ---- the toilet: two-piece, elongated bowl, seat and lid up ----
  const buildToilet = (tx, stallEast) => {
  const zb = z1, bz = zb - 0.44;   // center line; back wall; bowl center
  const toilet = [];
  toilet.push(place(slab(rrect(0.5, 0.2, 0.045), 0.36, china, 0.012), tx, 0.43, zb - 0.108));                // tank
  toilet.push(place(slab(rrect(0.535, 0.228, 0.05), 0.036, china, 0.012), tx, 0.79, zb - 0.108));            // tank lid
  toilet.push(place(slab(rrect(0.34, 0.24, 0.06), 0.07, china), tx, 0.36, zb - 0.14));                      // the deck the tank sits on
  const bowl = lathe([[0.105, 0], [0.122, 0.014], [0.1, 0.06], [0.098, 0.16], [0.135, 0.255], [0.182, 0.338], [0.2, 0.374], [0.2, 0.392], [0.186, 0.402],
    [0.165, 0.397], [0.132, 0.345], [0.082, 0.262], [0.045, 0.205], [0.001, 0.192]], china, 40);
  bowl.scale.set(1, 1, 1.3); toilet.push(place(bowl, tx, 0, bz));
  const water = put(new THREE.CircleGeometry(0.104, 28), new THREE.MeshPhongMaterial({ color: 0xa9cfe0, specular: 0xffffff, shininess: 120, transparent: true, opacity: 0.72 }), tx, 0.288, bz);
  water.rotation.x = -Math.PI / 2; water.scale.set(1, 1.3, 1);
  const seatShape = new THREE.Shape(); seatShape.absellipse(0, 0, 0.188, 0.245, 0, Math.PI * 2);   // a real seat: a broad flat ring, not a tube
  const seatHole = new THREE.Path(); seatHole.absellipse(0, 0.012, 0.112, 0.158, 0, Math.PI * 2, true); seatShape.holes.push(seatHole);   // (the opening sits a touch forward)
  toilet.push(place(slab(seatShape, 0.03, china, 0.011), tx, 0.398, bz - 0.01));
  const lid = put(new THREE.CylinderGeometry(0.188, 0.188, 0.022, 36), china, tx, 0.66, zb - 0.245); lid.scale.set(1, 1, 1.28); lid.rotation.x = Math.PI / 2 - 0.13; toilet.push(lid);   // up, leaning on the tank
  for (const s of [-1, 1]) {
    const h = put(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 12), chrome, tx + s * 0.085, 0.425, zb - 0.235); h.rotation.z = Math.PI / 2;   // seat hinges
    put(new THREE.SphereGeometry(0.02, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), china, tx + s * 0.105, 0.012, bz + 0.06);                     // bolt caps
  }
  const boss = put(new THREE.CylinderGeometry(0.017, 0.017, 0.012, 16), chrome, tx - 0.18, 0.73, zb - 0.214); boss.rotation.x = Math.PI / 2;
  const flushLever = put(new THREE.BoxGeometry(0.075, 0.013, 0.013), chrome, tx - 0.215, 0.73, zb - 0.222);                               // flush lever
  const leverHit = put(new THREE.BoxGeometry(0.13, 0.07, 0.06), new THREE.MeshBasicMaterial({ visible: false }), tx - 0.2, 0.73, zb - 0.225);   // (a forgiving target for it)
  const flusher = { flushT: 0, at: [tx, 0.4, bz], water, waterY: water.position.y }; bath.flushers.push(flusher);
  for (const m of [boss, flushLever, leverHit]) { m.userData.flush = flusher; aimables.push(m); }
  const valve = put(new THREE.CylinderGeometry(0.014, 0.014, 0.05, 12), chrome, tx - 0.19, 0.17, zb - 0.025); valve.rotation.x = Math.PI / 2;   // shutoff on the wall
  put(new THREE.CylinderGeometry(0.02, 0.02, 0.008, 16), chrome, tx - 0.19, 0.17, zb - 0.052).rotation.x = Math.PI / 2;
  put(new THREE.BoxGeometry(0.034, 0.012, 0.01), chrome, tx - 0.19, 0.17, zb - 0.058);                                                    // its oval handle
  place(tube([[tx - 0.19, 0.17, zb - 0.05], [tx - 0.2, 0.26, zb - 0.07], [tx - 0.17, 0.38, zb - 0.1], [tx - 0.16, 0.435, zb - 0.1]], 0.006,
    new THREE.MeshPhongMaterial({ color: 0x9aa0a6, specular: 0xdddddd, shininess: 60 })), 0, 0, 0);                                     // braided supply line
  const seat = { x: tx, y: 0, z: bz + 0.05, ry: Math.PI, hipY: 0.47, toilet: true };   // sitting on it: facing out into the room
  bath.seat ??= seat; bath.water ??= water;
  for (const m of toilet) { m.userData.sit = true; m.userData.seatPos = seat; aimables.push(m); }
  colliders.push({ x0: tx - 0.27, x1: tx + 0.27, z0: zb - 0.72, z1: zb, y1: 0.85 });
  // toilet paper on the stall's east side: backplate, arm, a roll with a sheet hanging
  const x1 = stallEast;
  put(new THREE.BoxGeometry(0.012, 0.07, 0.19), chrome, x1 - 0.006, 0.74, zb - 0.6);
  const arm = put(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 10), chrome, x1 - 0.012, 0.74, zb - 0.6); arm.rotation.x = Math.PI / 2;
  const roll = put(new THREE.CylinderGeometry(0.057, 0.057, 0.11, 22), new THREE.MeshLambertMaterial({ color: 0xfbfbf9 }), x1 - 0.075, 0.74, zb - 0.6); roll.rotation.x = Math.PI / 2;
  put(new THREE.PlaneGeometry(0.1, 0.12), new THREE.MeshLambertMaterial({ color: 0xfbfbf9, side: THREE.DoubleSide }), x1 - 0.132, 0.68, zb - 0.6, Math.PI / 2);
  };

  // ---- a stall: grey steel, a gap under it, a door that swings in. x0..x1 its width; a side partition where there's no wall ----
  const STALL_Z = z1 - 2.15,   // (deep enough to step back in out of the door's way, clear of the toilet: see doorStepBack)
    STALL_H = 1.85, STALL_DOOR = 0.72, stallM = new THREE.MeshPhongMaterial({ color: 0x8e979e, specular: 0x555555, shininess: 40 });
  const buildStall = (x0, x1, partition) => {
    const c = (x0 + x1) / 2, a = c - STALL_DOOR / 2, b = c + STALL_DOOR / 2;
    solid(a - x0, STALL_H, 0.05, stallM, (x0 + a) / 2, STALL_H / 2, STALL_Z); solid(x1 - b, STALL_H, 0.05, stallM, (b + x1) / 2, STALL_H / 2, STALL_Z);   // the pilasters, floor to top
    box(STALL_DOOR + 0.02, 0.03, 0.05, stallM, c, STALL_H - 0.015, STALL_Z);                                                                             // the headrail
    if (partition != null) solid(0.03, STALL_H - 0.25, z1 - STALL_Z, stallM, partition, 0.25 + (STALL_H - 0.25) / 2, (STALL_Z + z1) / 2);
    makeDoor({ at: STALL_Z, c, alongX: true, hinge: 1, swing: 1, leafMat: stallM, w: STALL_DOOR, h: STALL_H - 0.3, y0: 0.26, stall: true });
    buildToilet(c, x1);
  };

  // ---- a urinal: wall-hung china, a flush valve on the pipe above it ----
  const buildUrinal = (x) => {
    const zw = z1, cy = 0.86, zo = zw - 0.23, half = new THREE.SphereGeometry(1, 28, 18, 0, Math.PI);   // half an egg, its open side out from the wall
    const shell = (m, sx, sy, sz) => { const o = put(half, m, x, cy, zo); o.scale.set(sx, sy, sz); return o; };
    const body = shell(new THREE.MeshPhongMaterial({ color: 0xf7f7f3, specular: 0x9a9a9a, shininess: 85 }), 0.19, 0.36, 0.215);                       // the outside
    const bowl = shell(new THREE.MeshPhongMaterial({ color: 0xcdd4d6, specular: 0x8a8a8a, shininess: 70, side: THREE.BackSide }), 0.165, 0.335, 0.19);   // the inside, a shade darker
    const rim = put(new THREE.TorusGeometry(1, 0.1, 10, 44), china, x, cy, zo); rim.scale.set(0.177, 0.347, 0.2);                                       // the lip
    put(new THREE.CylinderGeometry(0.038, 0.038, 0.014, 18), new THREE.MeshLambertMaterial({ color: 0xe6a3c0 }), x, cy - 0.285, zo + 0.07);             // the puck
    put(new THREE.CylinderGeometry(0.018, 0.018, 0.004, 14), chrome, x, cy - 0.3, zo + 0.12);                                                           // the drain
    put(new THREE.CylinderGeometry(0.015, 0.015, 0.38, 12), chrome, x, 1.39, zw - 0.09);                                                // the pipe, up to the valve
    const valve = put(new THREE.CylinderGeometry(0.03, 0.03, 0.09, 16), chrome, x, 1.6, zw - 0.09);
    const elbow = put(new THREE.CylinderGeometry(0.015, 0.015, 0.09, 12), chrome, x, 1.6, zw - 0.045); elbow.rotation.x = Math.PI / 2;   // back into the wall
    const handle = put(new THREE.BoxGeometry(0.1, 0.012, 0.012), chrome, x + 0.075, 1.6, zw - 0.09);
    const hit = put(new THREE.BoxGeometry(0.2, 0.2, 0.12), new THREE.MeshBasicMaterial({ visible: false }), x + 0.03, 1.6, zw - 0.09);  // (a forgiving target for it)
    const flusher = { flushT: 0, at: [x, 1.0, zw - 0.2], water: null, waterY: 0 }; bath.flushers.push(flusher);
    for (const m of [valve, handle, hit, body, bowl, rim]) { m.userData.flush = flusher; aimables.push(m); }
    colliders.push({ x0: x - 0.2, x1: x + 0.2, z0: zw - 0.3, z1: zw, y1: 1.25 });
  };

  // ---- the washing up: the pedestal sink (on the west wall, facing +x) and its faucet, the mirror, soap, towels, wastebasket ----
  const buildWash = (wx, binId, binName) => {
  const sz = 31.75, sx = wx + 0.24, top = 0.86;
  const basinShape = rrect(0.48, 0.58, 0.08), hole = new THREE.Path(); hole.absellipse(0.03, 0, 0.165, 0.205, 0, Math.PI * 2, true); basinShape.holes.push(hole);
  const basin = place(slab(basinShape, 0.14, china, 0.012), sx, top - 0.14, sz);
  const bowlIn = put(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), china, sx + 0.03, top - 0.002, sz); bowlIn.scale.set(0.165, 0.12, 0.205);
  put(new THREE.CylinderGeometry(0.022, 0.022, 0.004, 18), chrome, sx + 0.03, top - 0.12, sz);                                           // drain
  put(new THREE.CircleGeometry(0.009, 12), darkP, sx - 0.13, top - 0.045, sz, Math.PI / 2);                                             // overflow
  place(lathe([[0.13, 0], [0.1, 0.03], [0.074, 0.12], [0.064, 0.4], [0.074, 0.62], [0.11, top - 0.14]], china, 32), sx - 0.02, 0, sz).scale.set(1, 1, 0.9);   // pedestal
  const fx = wx + 0.075, faucet = [];
  faucet.push(put(new THREE.CylinderGeometry(0.03, 0.032, 0.012, 20), chrome, fx, top + 0.006, sz));                                    // escutcheon
  faucet.push(put(new THREE.CylinderGeometry(0.019, 0.022, 0.085, 20), chrome, fx, top + 0.055, sz));                                   // body
  faucet.push(place(tube([[fx, top + 0.08, sz], [fx + 0.012, top + 0.13, sz], [fx + 0.07, top + 0.152, sz], [fx + 0.13, top + 0.125, sz], [fx + 0.148, top + 0.1, sz]], 0.011, chrome), 0, 0, 0));   // arched spout
  const aer = put(new THREE.CylinderGeometry(0.013, 0.012, 0.014, 16), chrome, fx + 0.15, top + 0.093, sz); aer.rotation.z = -0.35; faucet.push(aer);
  const lever = put(new THREE.BoxGeometry(0.085, 0.013, 0.022), chrome, fx - 0.03, top + 0.108, sz); lever.rotation.z = 0.3; faucet.push(lever);
  put(new THREE.CircleGeometry(0.004, 10), new THREE.MeshBasicMaterial({ color: 0xd02020 }), fx, top + 0.06, sz + 0.0205);             // hot / cold dots
  put(new THREE.CircleGeometry(0.004, 10), new THREE.MeshBasicMaterial({ color: 0x2050d0 }), fx, top + 0.06, sz - 0.0205, Math.PI);
  const stream = put(new THREE.CylinderGeometry(0.005, 0.008, 0.21, 10, 1, true), new THREE.MeshPhongMaterial({ color: 0xcfe6f2, specular: 0xffffff, shininess: 120, transparent: true, opacity: 0.55 }), fx + 0.155, top - 0.03, sz);
  stream.visible = false;
  const sink = { tap: false, stream, at: [fx + 0.15, top, sz], key: `tap-${binId}`, bin: null }; bath.sinks.push(sink); bath.sinkAt ??= sink.at;
  for (const m of [...faucet, basin, bowlIn]) { m.userData.sink = sink; aimables.push(m); }
  colliders.push({ x0: wx, x1: wx + 0.5, z0: sz - 0.3, z1: sz + 0.3, y1: 0.9 });
  // mirror: a rounded chrome frame, the glass inset
  const frameShape = rrect(0.58, 0.78, 0.07), inner = rrect(0.5, 0.7, 0.045); frameShape.holes.push(new THREE.Path(inner.getPoints(12)));
  const frameGeo = new THREE.ExtrudeGeometry(frameShape, { depth: 0.018, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2, curveSegments: 12 });
  frameGeo.rotateY(Math.PI / 2); put(frameGeo, chrome, wx, 1.52, sz);
  put(new THREE.PlaneGeometry(0.5, 0.7), new THREE.MeshPhongMaterial({ color: 0xa6b6c4, specular: 0xffffff, shininess: 140 }), wx + 0.012, 1.52, sz, Math.PI / 2);
  const wash = textPlane("EMPLOYEES MUST WASH HANDS", 0.42, 0.1, "#fff", "#1a1d22", "Arial", 64);
  wash.material = new THREE.MeshLambertMaterial({ map: wash.material.map }); wash.position.set(wx + 0.006, 2.02, sz); wash.rotation.y = Math.PI / 2; scene.add(wash);
  // soap dispenser beside the mirror: a rounded box, a push plate, the nozzle
  place(slab(rrect(0.075, 0.1, 0.02), 0.15, cream, 0.008), wx + 0.04, 1.02, sz + 0.37);
  put(new THREE.BoxGeometry(0.006, 0.05, 0.06), darkP, wx + 0.088, 1.1, sz + 0.37);   // push plate
  put(new THREE.CylinderGeometry(0.005, 0.005, 0.02, 8), darkP, wx + 0.05, 1.012, sz + 0.37);

  // ---- paper towel dispenser: cream plastic, a smoked window on the stack, a towel hanging out ----
  const pz = sz - 0.68;
  const disp = place(slab(rrect(0.14, 0.3, 0.035), 0.36, cream, 0.012), wx + 0.07, 1.2, pz);
  put(new THREE.BoxGeometry(0.004, 0.13, 0.2), new THREE.MeshPhongMaterial({ color: 0x2a2e33, transparent: true, opacity: 0.55, specular: 0xffffff, shininess: 100 }), wx + 0.157, 1.43, pz);   // window (just proud of the rounded front)
  put(new THREE.BoxGeometry(0.004, 0.06, 0.17), new THREE.MeshLambertMaterial({ color: 0xf2efe6 }), wx + 0.1535, 1.4, pz);                  // the stack's edge, seen through it (about half full)
  put(new THREE.BoxGeometry(0.11, 0.006, 0.22), darkP, wx + 0.07, 1.199, pz);                                                             // dispensing slot
  const towelM = new THREE.MeshLambertMaterial({ color: 0xf6f3ea, side: THREE.DoubleSide });
  const t1 = put(new THREE.PlaneGeometry(0.09, 0.2), towelM, wx + 0.085, 1.15, pz, Math.PI / 2); t1.rotation.z = 0.08;
  const t2 = put(new THREE.PlaneGeometry(0.05, 0.2), towelM, wx + 0.1, 1.175, pz, Math.PI / 2); t2.rotation.set(0.9, Math.PI / 2, 0);   // the fold
  const brand = textPlane("JELLYBUSTER", 0.14, 0.025, "#2a4d8a", "#ebe7de", "Arial Black", 60); brand.material = new THREE.MeshLambertMaterial({ map: brand.material.map });
  brand.position.set(wx + 0.154, 1.53, pz); brand.rotation.y = Math.PI / 2; scene.add(brand);
  disp.userData.towels = sink; aimables.push(disp);
  // the small wastebasket under it: open top, a liner folded over the rim, a few towels in it
  const bin = place(lathe([[0.1, 0], [0.13, 0.31], [0.124, 0.31], [0.095, 0.012], [0.001, 0.012]], new THREE.MeshPhongMaterial({ color: 0x3d4248, specular: 0x444444, shininess: 30, side: THREE.DoubleSide }), 28), wx + 0.19, 0, pz);
  const liner = put(new THREE.TorusGeometry(0.127, 0.006, 6, 30), new THREE.MeshLambertMaterial({ color: 0xe8e8e8 }), wx + 0.19, 0.31, pz); liner.rotation.x = Math.PI / 2;
  sink.bin = trashBins[binId] = { id: binId, name: binName, cap: 8, x: wx + 0.19, z: pz, rimY: 0.31, r: 0.1, liner: 0xeeeeee, towels: true, parts: [bin, liner], stand: { x: wx + 1.28, z: pz, ry: -Math.PI / 2 } };
  colliders.push({ x0: wx + 0.04, x1: wx + 0.34, z0: pz - 0.15, z1: pz + 0.15, y1: 0.35 });
  };

  const FX0 = BX0 + 0.1, FX1 = BOH.rrX - 0.1, MX0 = BOH.rrX + 0.1, MX1 = SX - 0.1, FMID = (FX0 + FX1) / 2, MSTALL = MX1 - 0.9;
  // the women's: a sink, two stalls side by side
  walls(FX0, FX1, BOH_DOORS.restroomF); buildWash(FX0, "restroomF", "women's room wastebasket");
  buildStall(FX0, FMID, FMID); buildStall(FMID, FX1, null);
  // the men's: a sink, a stall against the east wall, the urinal beside it
  walls(MX0, MX1, BOH_DOORS.restroom); buildWash(MX0, "restroom", "men's room wastebasket");
  buildStall(MSTALL, MX1, MSTALL); buildUrinal((MX0 + MSTALL) / 2);
}
