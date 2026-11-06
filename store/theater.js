// ---- movie theater lobby (x WALL_L..BX0, z BZ0..BZ1) & single-screen stadium theater (z BZ1..48.5): the auditorium as
// wide as the lobby, flush with the store's side wall, and 6 m to its ceiling; over the lobby's back the projection booth,
// up a walled-in stairwell in the lobby's corner by the back of house (see the booth, below) ----
{
  const LX0 = WALL_L, LX1 = BX0, LZ0 = Z, LZ1 = BZ1, LH = BOH.h;
  const TX = (LX0 + LX1) / 2;              // -2.87: centerline of lobby & auditorium
  const TW = LX1 - LX0, TX0 = LX0, TX1 = LX1, TZ0 = LZ1, TZ1 = 48.5, TH = TALL.ceil;
  const IN0 = TX0 + WALL_T / 2, IN1 = TX1 - WALL_T / 2;   // the auditorium's side walls' inside faces
  TVU.uLobbyBox.value.set(LX0 - 0.05, LX1 + 0.05, LZ0, LZ1);   // (to the wall's center line, where its door hangs: the door's far face is the auditorium's)
  TVU.uThBox.value.set(TX0 - 0.05, TX1 + 0.05, TZ0, TZ1 + 0.05);

  // lobby walls, art-deco cinema carpet, and ceiling (not over the stairwell: it's walled in, up to the booth)
  wall(LZ0, LZ1 + T / 2, LX0, false, LH, mat.wall);
  wall(LX0, LX1, LZ1, true, LH, mat.wall, [CINEMA_DOOR]);   // south wall with the door into Cinema 1, at its far end
  const lobbyCarpetTex = makeTexture((ctx, W, H) => {
    ctx.fillStyle = "#58111a"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#d4a017"; ctx.lineWidth = 6;
    const s = W / 4;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const cx = (x + 0.5) * s, cy = (y + 0.5) * s;
      ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.38); ctx.lineTo(cx + s * 0.38, cy);
      ctx.lineTo(cx, cy + s * 0.38); ctx.lineTo(cx - s * 0.38, cy); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = "#1b4d4a"; ctx.beginPath(); ctx.arc(cx, cy, s * 0.1, 0, 7); ctx.fill();
    }
    for (let i = 0; i < 1800; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? "rgba(255,215,100,.12)" : "rgba(0,0,0,.22)";
      ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
    }
  }, 512, 512);
  for (const [x0, x1, z0, z1] of [[LX0, SHAFT.x0, LZ0, LZ1], [SHAFT.x0, LX1, LZ0, SHAFT.z0]]) {
    floorPatch(lobbyCarpetTex, 2.0, x0, x1, z0, z1);
    const t = ceilGrid(ceilTex.clone(), x0, x1, z0, z1); t.needsUpdate = true;
    const c = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshLambertMaterial({ map: t }));
    c.rotation.x = Math.PI / 2; c.position.set((x0 + x1) / 2, LH, (z0 + z1) / 2); scene.add(c);
  }

  // the auditorium door: the same maroon push door as the hall's, no window
  makeDoor({ at: LZ1, c: CINEMA_DOOR, alongX: true, hinge: -1, swing: 1, leafMat: theaterDoorMat, push: true,
    signs: [{ text: "CINEMA 1", side: -1 }, { text: "LOBBY", side: 1 }] });

  // glowing marquee over the Cinema 1 door (as far over as the corner lets it)
  const MQX = LX0 + WALL_T / 2 + 1.14;
  box(2.2, 0.36, 0.14, mat.dark, MQX, DOOR_H + 0.25, LZ1 - T / 2 - 0.07);
  const mq = glow(textPlane("★ CINEMA 1 · NOW SHOWING ★", 2.08, 0.28, "#ffd400", "#58111a", "Arial Black", 64));
  mq.position.set(MQX, DOOR_H + 0.25, LZ1 - T / 2 - 0.145); mq.rotation.y = Math.PI; scene.add(mq);

  const brass = new THREE.MeshPhongMaterial({ color: 0xc9a227, specular: 0xffe2a0, shininess: 80 });
  // (the lobby's dressed in store/theaterlobby.js: it wants the poster bulbs from store/shelves.js)

  // ---- Single-Screen Stadium Auditorium ----
  // 6 stadium rows stepping down from y = 0 (at z = 36.6) to y = -1.56 (at z = 44.4), a row more across the back on the
  // level floor by the door. One block of seats from the far wall, the aisle down the side by the door: a ramp
  const R_Z0 = 36.6, R_ROWS = 6, R_STEP_Z = 1.3, R_DROP = 0.26, R_END = R_Z0 + R_ROWS * R_STEP_Z; // 44.4
  const PIT_Y = -R_ROWS * R_DROP;          // -1.56
  const AX = -6.03;                        // the aisle: from the side wall's face to here
  const EXIT = FIRE_EXIT, W = EXIT.well;   // the emergency exit: in the side wall by the aisle, at the screen end, down where the aisle comes out

  floorHeightAt = (x, z) => {
    if (x > W.x0 && x < IN0 && z > W.z0 && z < W.z1 && (x < TX0 - WALL_T / 2 || (z > EXIT.z0 && z < EXIT.z1)))   // out the emergency exit: its landing, then the steps up
      return z < W.stair ? PIT_Y : PIT_Y * (1 - (z - W.stair) / (W.z1 - W.stair));
    if (x > SHAFT.x0 && x < BX0 - 0.12 && z > TALL.z0 && z < TALL.z1) return stairsAt(x, z);
    if (z <= R_Z0 || x < TX0 || x > TX1 || z > TZ1) return 0;
    if (z < R_END) {
      if (x < AX) return ((z - R_Z0) / (R_END - R_Z0)) * PIT_Y;   // the side aisle's ramp
      const r = Math.min(R_ROWS - 1, Math.floor((z - R_Z0) / R_STEP_Z));
      return -(r + 1) * R_DROP;
    }
    return PIT_Y;
  };

  // outer auditorium walls (spanning down to PIT_Y so no gaps show as the floor drops)
  const WALL_BOT = PIT_Y, WALL_H = TH - WALL_BOT, WALL_CY = (TH + WALL_BOT) / 2;
  const thWall = wallSurface(new THREE.MeshLambertMaterial({ color: 0x3a1a20 }), "fabric");
  const curtainMat = new THREE.MeshLambertMaterial({ color: 0x74121d });
  const tierFloorMat = new THREE.MeshLambertMaterial({ color: 0x38131a });
  const riserMat = new THREE.MeshLambertMaterial({ color: 0x1e0b0f });
  const stepLightMat = new THREE.MeshBasicMaterial({ color: 0xff1a1a });   // red aisle step lights

  // side walls and the rear screen wall (the one with the door's under the booth: see the booth)
  const EH = PIT_Y + 2.15;                   // (the side wall by the aisle: round the emergency exit's opening)
  aimBlockers.push(
    box(WALL_T, WALL_H, EXIT.z0 - TZ0, thWall, TX0, WALL_CY, (TZ0 + EXIT.z0) / 2),
    box(WALL_T, WALL_H, TZ1 - EXIT.z1, thWall, TX0, WALL_CY, (EXIT.z1 + TZ1) / 2),
    box(WALL_T, TH - EH, EXIT.z1 - EXIT.z0, thWall, TX0, (EH + TH) / 2, (EXIT.z0 + EXIT.z1) / 2),
    box(WALL_T, WALL_H, TZ1 - TZ0, thWall, TX1, WALL_CY, (TZ0 + TZ1) / 2),
    box(TW, WALL_H, WALL_T, thWall, TX, WALL_CY, TZ1)
  );
  colliders.push(
    { x0: TX0 - 0.18, x1: TX0 + 0.18, z0: TZ0, z1: EXIT.z0, y0: WALL_BOT, y1: TH }, { x0: TX0 - 0.18, x1: TX0 + 0.18, z0: EXIT.z1, z1: TZ1, y0: WALL_BOT, y1: TH },
    fireExit.shut = { x0: TX0 - 0.18, x1: TX0 + 0.18, z0: EXIT.z0, z1: EXIT.z1, y0: WALL_BOT, y1: TH },   // (the exit, while its door's shut)
    { x0: TX1 - 0.18, x1: TX1 + 0.18, z0: TZ0, z1: TZ1, y0: WALL_BOT, y1: TH },
    { x0: TX0, x1: TX1, z0: TZ1 - 0.18, z1: TZ1 + 0.18, y0: WALL_BOT, y1: TH }
  );
  // the wall with the door, its own colour on this side all the way down (it's the lobby's paint the other side)
  for (const [x0, x1, y0, y1] of [[IN0, CINEMA_DOOR - 0.61, 0, LH], [CINEMA_DOOR + 0.61, IN1, 0, LH], [CINEMA_DOOR - 0.61, CINEMA_DOOR + 0.61, DOOR_H + 0.06, LH]])
    box(x1 - x0, y1 - y0, 0.012, thWall, (x0 + x1) / 2, (y0 + y1) / 2, TZ0 + WALL_T / 2 + 0.006);

  // dark cinema ceiling + back entry cross-aisle + the side aisle's ramp + front orchestra pit
  const thCeil = new THREE.Mesh(new THREE.PlaneGeometry(TW, TZ1 - TZ0), new THREE.MeshLambertMaterial({ color: 0x121016 }));
  thCeil.rotation.x = Math.PI / 2; thCeil.position.set(TX, TH, (TZ0 + TZ1) / 2); scene.add(thCeil);
  box(TW, 0.04, R_Z0 - TZ0, tierFloorMat, TX, -0.02, (TZ0 + R_Z0) / 2);
  box(TW, 0.04, TZ1 - R_END, tierFloorMat, TX, PIT_Y - 0.02, (R_END + TZ1) / 2);

  const AW = AX - IN0, ACX = (IN0 + AX) / 2;
  const rampLen = Math.hypot(R_END - R_Z0, PIT_Y), rampAng = Math.atan2(-PIT_Y, R_END - R_Z0);
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(AW, 0.04, rampLen), tierFloorMat);
  ramp.position.set(ACX, PIT_Y / 2 - 0.02, (R_Z0 + R_END) / 2); ramp.rotation.x = rampAng; scene.add(ramp);
  {                                          // solid fill under the ramp, down to the pit: the rows step below its edge, so its side would show daylight
    const sh = new THREE.Shape();              // side profile in (z, y): top follows the ramp (tucked just inside its slab), bottom at the pit floor
    sh.moveTo(R_Z0, -0.03); sh.lineTo(R_END, PIT_Y - 0.03); sh.lineTo(R_END, PIT_Y - 0.04); sh.lineTo(R_Z0, PIT_Y - 0.04); sh.lineTo(R_Z0, -0.03);
    const g = new THREE.ExtrudeGeometry(sh, { depth: AW - 0.004, bevelEnabled: false });
    g.rotateY(-Math.PI / 2); g.translate(AX - 0.002, 0, 0);   // extruded across the aisle's width
    scene.add(new THREE.Mesh(g, riserMat));
  }

  // stadium tiers & seats, v2: real cinema chairs — shared side standards
  // with armrests and cup holders, a reclined padded back in a plastic shell,
  // and a sprung seat that folds up against the back (see thSeatTick). The
  // fixed parts merge into 3 meshes; the folding seats are one InstancedMesh
  const bankW = IN1 - AX, bankX = (AX + IN1) / 2;
  const SEAT_X0 = -5.66, PITCH = 0.62, PER_ROW = 12;   // a row's seats, from the aisle to the far wall
  const FRONT = { from: 3, to: 8 };                    // the front row: room for wheelchairs at each end, the seats in the middle only
  const seatPlush = new THREE.MeshLambertMaterial({ color: 0x9e1b24 });
  const seatDark = new THREE.MeshLambertMaterial({ color: 0x1c1a1e });
  const seatWood = new THREE.MeshLambertMaterial({ color: 0x4a2c18 });
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const plushGeos = [], darkGeos = [], woodGeos = [];
  const pushGeo = (arr, geo, x, y, z, rx = 0) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (rx) g.rotateX(rx);
    g.translate(x, y, z); arr.push(g);
  };
  // a padded slab: rounded rectangle w x h (x, y from 0 up), extruded `depth` along +z with a soft bevel
  const padGeo = (w, h, r, depth, b) => {
    const x0 = -w / 2 + b, x1 = w / 2 - b, y0 = b, y1 = h - b, sh = new THREE.Shape();
    sh.moveTo(x0 + r, y0); sh.lineTo(x1 - r, y0); sh.quadraticCurveTo(x1, y0, x1, y0 + r); sh.lineTo(x1, y1 - r);
    sh.quadraticCurveTo(x1, y1, x1 - r, y1); sh.lineTo(x0 + r, y1); sh.quadraticCurveTo(x0, y1, x0, y1 - r);
    sh.lineTo(x0, y0 + r); sh.quadraticCurveTo(x0, y0, x0 + r, y0);
    return new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 4 });
  };
  const RECLINE = -0.2;
  const backPad = padGeo(0.5, 0.6, 0.08, 0.05, 0.025);         // z -0.025..0.075, pivot at its bottom
  const backShell = padGeo(0.54, 0.68, 0.09, 0.02, 0.012);     // z -0.012..0.032
  const standard = new THREE.BoxGeometry(0.05, 0.6, 0.46), armrest = new THREE.BoxGeometry(0.085, 0.045, 0.4);
  const cupHolder = new THREE.CylinderGeometry(0.038, 0.032, 0.05, 12, 1, true);
  // the folding seat, hinged at its top back edge: cushion (plush) + the pan under it (dark), 0.44 deep along +z
  const cushion = padGeo(0.48, 0.44, 0.07, 0.07, 0.02); cushion.rotateX(Math.PI / 2); cushion.translate(0, -0.02, 0);   // top at y 0, z 0..0.44
  const pan = new THREE.BoxGeometry(0.44, 0.025, 0.38).toNonIndexed(); pan.translate(0, -0.125, 0.22);
  const hinges = [];

  for (let r = -1; r < R_ROWS; r++) {               // (r -1: the row across the back, on the level floor)
    const z0 = r < 0 ? R_Z0 - 1.25 : R_Z0 + r * R_STEP_Z, z1 = z0 + R_STEP_Z, y = r < 0 ? 0 : -(r + 1) * R_DROP;
    if (r >= 0) {
      // solid tier block down to PIT_Y so the aisle's side looks closed from the ramp
      box(bankW, y - PIT_Y + 0.02, R_STEP_Z, tierFloorMat, bankX, (y + PIT_Y) / 2 - 0.01, (z0 + z1) / 2);
      box(bankW, R_DROP + 0.02, 0.04, riserMat, bankX, y + R_DROP / 2, z0 + 0.02);
      // red aisle step-edge marker light
      const strip = glow(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.018, R_STEP_Z - 0.08), stepLightMat));
      strip.position.set(AX + 0.04, y + 0.01, (z0 + z1) / 2); scene.add(strip);
    }
    const k0 = r === R_ROWS - 1 ? FRONT.from : 0, k1 = r === R_ROWS - 1 ? FRONT.to : PER_ROW - 1, sz = z0 + 0.36;
    for (let k = k0; k <= k1 + 1; k++) {              // a standard each side of every seat, shared between neighbours
      const ax = SEAT_X0 + (k - 0.5) * PITCH;
      pushGeo(darkGeos, standard, ax, y + 0.3, sz - 0.03);
      pushGeo(woodGeos, armrest, ax, y + 0.625, sz - 0.05);
      pushGeo(darkGeos, cupHolder, ax, y + 0.63, sz + 0.2);
    }
    for (let k = k0; k <= k1; k++) {                  // facing +z toward the screen
      const sx = SEAT_X0 + k * PITCH;
      pushGeo(plushGeos, backPad, sx, y + 0.47, sz - 0.275, RECLINE);    // padded front, reclined
      pushGeo(darkGeos, backShell, sx, y + 0.43, sz - 0.332, RECLINE);   // the plastic shell behind it
      const seat = { x: sx, y, z: sz + 0.04, rowZ: z0 + 0.86 };
      theaterSeats.push(seat);
      hinges.push({ seat, x: sx, y: y + 0.45, z: sz - 0.19, a: 1, v: 0 });   // starts folded up

      // invisible pick target so aiming at any seat and pressing E sits you right there
      const seatHit = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.82, 0.52), hitMat);
      seatHit.position.set(sx, y + 0.42, sz);
      seatHit.userData.sit = true;
      seatHit.userData.seatPos = seat;              // the same object as the theaterSeats entry: that's how a seat knows it's taken
      scene.add(seatHit); aimables.push(seatHit);
    }
    // row seat-back collider (leaves 0.72m legroom walkway in front of each row)
    colliders.push({ x0: SEAT_X0 + k0 * PITCH - 0.28, x1: SEAT_X0 + k1 * PITCH + 0.28, z0: z0 + 0.08, z1: z0 + 0.56, y0: y, y1: y + 0.95, shadow: false });
  }
  scene.add(new THREE.Mesh(mergeGeometries(plushGeos), seatPlush));
  scene.add(new THREE.Mesh(mergeGeometries(darkGeos), seatDark));
  scene.add(new THREE.Mesh(mergeGeometries(woodGeos), seatWood));
  thSeatFolds = hinges;
  thCushions = new THREE.InstancedMesh(mergeGeometries([cushion, pan], true), [seatPlush, seatDark], hinges.length);
  thCushions.frustumCulled = false;                  // instances are spread over the whole house; the base geometry sits at the origin
  hinges.forEach((_, i) => thSeatPose(i));
  scene.add(thCushions);
  // the front row's wheelchair spaces, two at each end, their sides marked quietly on the floor; a black iron railing on the
  // step behind each pair, for the row behind (posts, a mid rail, a round top rail)
  {
    const FZ = R_Z0 + (R_ROWS - 1) * R_STEP_Z + 0.4, line = new THREE.MeshLambertMaterial({ color: 0x4d4650 });
    for (const x of [-5.97, -5.04, -4.11, -0.39, 0.54, 1.47]) box(0.04, 0.003, 1.1, line, x, PIT_Y + 0.0015, FZ + 0.05);
    const black = new THREE.MeshLambertMaterial({ color: 0x151617 }), TOP = PIT_Y + R_DROP, AT = R_Z0 + (R_ROWS - 1) * R_STEP_Z - 0.02;
    for (const [xa, xb] of [[-6.0, -4.15], [-0.35, 1.85]]) {
      const n = Math.ceil(xb - xa);
      for (let i = 0; i <= n; i++) { const x = xa + (xb - xa) * i / n; box(0.04, 0.8, 0.04, black, x, TOP + 0.4, AT); box(0.1, 0.008, 0.1, black, x, TOP + 0.004, AT); }
      box(xb - xa, 0.025, 0.025, black, (xa + xb) / 2, TOP + 0.4, AT);
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, xb - xa + 0.04, 12), black); rail.rotation.z = Math.PI / 2; rail.position.set((xa + xb) / 2, TOP + 0.8, AT); scene.add(rail);
      colliders.push({ x0: xa - 0.03, x1: xb + 0.03, z0: AT - 0.04, z1: AT + 0.04, y0: TOP, y1: TOP + 0.82 });
    }
  }

  // acoustic wall drapery + warm brass wall sconces (on the aisle's side, the last panel starts past the exit)
  const sconceMat = thSconceMat = new THREE.MeshLambertMaterial({ color: 0xffe0a3, emissive: 0xff9d3b, emissiveIntensity: 0.85 });
  for (const s of [-1, 1]) {
    const wx = TX + s * (TW / 2 - 0.12);
    for (let z = 37.2; z < 46.5; z += 2.2) {
      const [a, b] = s < 0 && z - 0.75 < EXIT.z1 + 0.2 && z + 0.75 > EXIT.z0 - 0.2 ? [EXIT.z1 + 0.2, z + 0.75] : [z - 0.75, z + 0.75], c = (a + b) / 2;
      box(0.05, 2.2, b - a, curtainMat, wx, 0.8, c);
      box(0.08, 0.28, 0.16, brass, wx - s * 0.04, 1.55, c);
      const shade = glow(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.05, 0.22, 10), sconceMat));
      shade.position.set(wx - s * 0.09, 1.68, c); scene.add(shade);
    }
  }

  // ---- the screen end, v3: a small-town picture palace done on a budget. A proscenium of painted plywood (burgundy, the
  // trim gold paint, not leaf) with fluted cream pilasters, a plywood sunburst over the opening and deco speed lines either
  // side; in the opening, velvet that actually hangs in folds (gathered back to the sides, a valance with a gold fringe) and
  // black masking round the screen. The stage: a black-painted deck, carpeted front, a brass nosing and a row of footlights
  // (they fade with the sconces when a film starts) ----
  const ST_Z0 = 46.8, ST_Y = -0.95;
  const deckBlack = new THREE.MeshLambertMaterial({ color: 0x171415 });
  const fascia = new THREE.MeshLambertMaterial({ color: 0x3a1018 });       // the stage front, carpeted
  box(TW - 0.2, ST_Y - PIT_Y, TZ1 - ST_Z0, [fascia, fascia, deckBlack, fascia, fascia, fascia], TX, (ST_Y + PIT_Y) / 2, (ST_Z0 + TZ1) / 2);
  const goldPaint = new THREE.MeshPhongMaterial({ color: 0xa8843a, specular: 0x4a3c22, shininess: 24 });
  box(TW - 0.2, 0.05, 0.07, goldPaint, TX, ST_Y - 0.022, ST_Z0 - 0.025);   // the nosing, its top a hair over the deck
  box(TW - 0.2, 0.07, 0.04, deckBlack, TX, ST_Y - 0.1, ST_Z0 - 0.02);     // the footlights' trough, and the lamps in it
  {
    const bulbs = [], n = 16;
    for (let i = 0; i < n; i++) { const g = new THREE.SphereGeometry(0.022, 10, 8); g.translate(IN0 + 0.3 + (IN1 - IN0 - 0.6) * i / (n - 1), ST_Y - 0.1, ST_Z0 - 0.045); bulbs.push(g); }
    scene.add(glow(new THREE.Mesh(mergeGeometries(bulbs), sconceMat)));
  }
  colliders.push({ x0: TX0, x1: TX1, z0: ST_Z0 - 0.05, z1: TZ1, y0: PIT_Y, y1: ST_Y });

  // the 6.84m x 4.56m screen (3:2, the video canvas's shape) on black masking, at z 47.85
  const SW = 6.84, SH = 4.56, SY = 1.43, FW = 7.13, FH = 4.85, FY0 = -0.97;
  box(FW, FH, 0.08, new THREE.MeshLambertMaterial({ color: 0x060606 }), TX, FY0 + FH / 2, 47.92);
  TVU.uThScreenP.value.set(TX, SY, 47.8); TVU.uThScreenS.value.set(SW, SH);

  // the proscenium: its face at PZ, the opening OW wide up to OT; the wall either side of the opening and over it
  const PZ = 47.58, OW = SW + 1.9, OT = 4.35, OX0 = TX - OW / 2, OX1 = TX + OW / 2;
  const procMat = wallSurface(new THREE.MeshLambertMaterial({ color: 0x4c1722 }), "paint");
  const cream = new THREE.MeshLambertMaterial({ color: 0xcdb98f });
  const fluteTex = makeTexture((ctx, W, H) => {          // the pilasters' fluting: grooves picked out in gold paint
    ctx.fillStyle = "#d8c59c"; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 5; i++) {
      const x = W * (0.14 + 0.18 * i);
      ctx.fillStyle = "#8c7650"; ctx.fillRect(x - 6, 0, 12, H);
      ctx.fillStyle = "#b8944a"; ctx.fillRect(x - 2, 0, 4, H);
    }
  }, 128, 256);
  const fluted = new THREE.MeshLambertMaterial({ map: fluteTex });
  const PD = 0.06;                                        // (the face's thickness)
  for (const [x0, x1] of [[IN0, OX0], [OX1, IN1]]) box(x1 - x0, TH - ST_Y, PD, procMat, (x0 + x1) / 2, (TH + ST_Y) / 2, PZ);
  box(IN1 - IN0, TH - OT, PD, procMat, TX, (TH + OT) / 2, PZ);
  for (const [x0, x1] of [[IN0, OX0], [OX1, IN1]]) {     // a pilaster on each: plinth, fluted shaft, a stepped gold capital
    const cx = (x0 + x1) / 2, w = x1 - x0 - 0.06;
    box(w + 0.04, 0.28, 0.16, new THREE.MeshLambertMaterial({ color: 0x2a1610 }), cx, ST_Y + 0.14, PZ - 0.06);
    box(w, OT - 0.3 - (ST_Y + 0.28), 0.1, [cream, cream, cream, cream, fluted, fluted], cx, (OT - 0.3 + ST_Y + 0.28) / 2, PZ - 0.05);
    box(w + 0.04, 0.16, 0.13, goldPaint, cx, OT - 0.22, PZ - 0.06);
    box(w + 0.1, 0.12, 0.16, cream, cx, OT - 0.08, PZ - 0.07);
    box(w + 0.14, 0.04, 0.18, goldPaint, cx, OT + 0.0, PZ - 0.08);
  }
  for (const x of [OX0 + 0.035, OX1 - 0.035]) box(0.07, OT - ST_Y, 0.05, goldPaint, x, (OT + ST_Y) / 2, PZ - 0.04);   // the opening's gold edge
  box(OW, 0.07, 0.05, goldPaint, TX, OT + 0.035, PZ - 0.04);
  {                                                       // the sunburst: a plywood fan over the opening, its rays in two golds
    const sun = makeTexture((ctx, W, H) => {
      const cx = W / 2, cy = H, R = W / 2, n = 15;
      for (let i = 0; i < n; i++) {
        const a0 = Math.PI + Math.PI * i / n, a1 = Math.PI + Math.PI * (i + 1) / n;
        ctx.fillStyle = i % 2 ? "#a07c34" : "#c9a552";
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = "#5a1a22"; ctx.lineWidth = 6;
      for (const r of [R * 0.36, R - 3]) { ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0); ctx.stroke(); }
      ctx.fillStyle = "#e0c27a"; ctx.beginPath(); ctx.arc(cx, cy, R * 0.34, Math.PI, 0); ctx.fill();
    }, 256, 128);
    const fan = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.85), new THREE.MeshLambertMaterial({ map: sun, transparent: true, alphaTest: 0.5 }));
    fan.position.set(TX, OT + 0.07 + 0.425, PZ - 0.035); fan.rotation.y = Math.PI; scene.add(fan);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {   // deco speed lines running out from it
      const len = 2.1 - i * 0.55, y = OT + 0.2 + i * 0.16;
      box(len, 0.045, 0.03, goldPaint, TX + s * (0.95 + len / 2), y, PZ - 0.045);
    }
  }
  box(IN1 - IN0, 0.06, 0.06, goldPaint, TX, TH - 0.36, PZ - 0.05);   // the cornice: a gold line, a cream crown up to the ceiling
  box(IN1 - IN0, 0.3, 0.14, cream, TX, TH - 0.15, PZ - 0.06);

  // the velvet, in folds: a plane rippled across its width, lit by the room like anything else (each fold catches the screen)
  const pleated = (w, h, folds, amp) => {
    const g = new THREE.PlaneGeometry(w, h, folds * 8, 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, amp * Math.sin((p.getX(i) / w + 0.5) * folds * Math.PI * 2));
    g.rotateY(Math.PI); g.computeVertexNormals(); return g;
  };
  const velvet = new THREE.MeshLambertMaterial({ color: 0x7a1220 });
  const CW = OW / 2 - SW / 2 + 0.06;                       // gathered back, their inner edges just over the masking
  for (const s of [-1, 1]) {
    const c = new THREE.Mesh(pleated(CW, OT - ST_Y, 7, 0.07), velvet);
    c.position.set(TX + s * (OW / 2 - CW / 2), (OT + ST_Y) / 2, PZ + 0.15); scene.add(c);
  }
  const VH = 0.6, val = new THREE.Mesh(pleated(OW, VH, 24, 0.045), velvet);   // the valance, in front of them
  val.position.set(TX, OT - VH / 2, PZ + 0.07); scene.add(val);
  {
    const fr = makeTexture((ctx, W, H) => {               // its fringe: gold threads, gaps between
      ctx.clearRect(0, 0, W, H);
      for (let x = 0; x < W; x += 4) { ctx.fillStyle = x % 8 ? "#a8843a" : "#c9a552"; ctx.fillRect(x, 0, 2, H * (0.85 + 0.15 * Math.sin(x))); }
      ctx.fillStyle = "#b8944a"; ctx.fillRect(0, 0, W, H * 0.22);
    }, 64, 32);
    fr.wrapS = THREE.RepeatWrapping; fr.repeat.x = OW / 0.12;
    const fringe = new THREE.Mesh(new THREE.PlaneGeometry(OW, 0.1), new THREE.MeshLambertMaterial({ map: fr, alphaTest: 0.5, side: THREE.DoubleSide }));
    fringe.position.set(TX, OT - VH - 0.04, PZ + 0.02); fringe.rotation.y = Math.PI; scene.add(fringe);
  }
  colliders.push({ x0: TX0, x1: TX1, z0: PZ - 0.14, z1: TZ1, y0: ST_Y, y1: TH });   // the proscenium and all behind it: up on the stage you stop at its face (the back wall's own would let you past)

  theaterScreenMesh = glow(new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), mat.dark));
  theaterScreenMesh.position.set(TX, SY, 47.85);
  theaterScreenMesh.rotation.y = Math.PI;          // faces -z toward the stadium seats
  scene.add(theaterScreenMesh);
  aimables.push(theaterScreenMesh);

  // the theater's VCR: a lift in the stage floor, centre front. Waiting for a tape, it stands a few centimetres up, presenting
  // its front: the slot, the VCR's display and a green light; a tape in, it sinks flush with the deck (its lid painted the same
  // black, only its seam shows) for the film. From the seats it's nothing; at the stage looking down, you'll find it (E on it,
  // as on any VCR)
  {
    const DZ = ST_Z0 + 0.3, g = new THREE.Group(); g.position.set(TX, ST_Y + 0.002, DZ); scene.add(g);
    const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.36), new THREE.MeshLambertMaterial({ color: 0x050505 }));
    seam.rotation.x = -Math.PI / 2; seam.position.set(TX, ST_Y + 0.001, DZ); scene.add(seam);
    const silver = new THREE.MeshLambertMaterial({ color: 0x2a2b2e });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.14, 0.33), [silver, silver, deckBlack, silver, silver, silver]);
    body.position.y = -0.07; g.add(body);
    const slot = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.014), new THREE.MeshBasicMaterial({ color: 0x050505 }));
    slot.position.set(0.06, -0.018, -0.1656); slot.rotation.y = Math.PI; g.add(slot);
    const bezel = new THREE.Mesh(new THREE.PlaneGeometry(0.218, 0.026), new THREE.MeshLambertMaterial({ color: 0x6a6c72 }));   // (its flap's frame, so the slot reads)
    bezel.position.set(0.06, -0.018, -0.1653); bezel.rotation.y = Math.PI; g.add(bezel);
    const disp = glow(new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.031), new THREE.MeshBasicMaterial({ color: 0x6dffb0 })));
    disp.position.set(-0.13, -0.022, -0.1656); disp.rotation.y = Math.PI; g.add(disp);
    const led = glow(new THREE.Mesh(new THREE.CircleGeometry(0.004, 8), new THREE.MeshBasicMaterial({ color: 0x3dff6a })));
    led.position.set(0.19, -0.02, -0.1656); led.rotation.y = Math.PI; g.add(led);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.36), hitMat);
    hit.position.set(TX, ST_Y + 0.04, DZ); hit.userData.theaterDeck = true; scene.add(hit); aimables.push(hit);
    const UP = 0.045;
    g.position.y += UP;
    thDeck = { g, lift: UP, tick(dt) {
      if (!disp.material.map && vcrDisplay) { disp.material.map = vcrDisplay.tex; disp.material.color.set(0xffffff); disp.material.needsUpdate = true; }   // (the VCR's own clock face: 12:00 blinking while it waits)
      const want = playing ? 0 : UP;                // up, ready for a tape; down out of the way once one's in
      this.lift += Math.sign(want - this.lift) * Math.min(Math.abs(want - this.lift), dt * 0.03);   // a slow motor: 1.5 s
      g.position.y = ST_Y + 0.002 + this.lift;
    } };
  }

  // the projection booth's ports up in the back wall (z = TZ0), at the projector's height + volumetric projector beam
  const PORT_Y = 4.2;
  box(1.4, 0.55, 0.06, mat.dark, TX + 1.8, PORT_Y, TZ0 + 0.12);
  for (const dx of [-0.35, 0.35]) {
    const port = glow(new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.22), new THREE.MeshBasicMaterial({ color: dx < 0 ? 0xffffff : 0x5577aa })));
    port.position.set(TX + 1.8 + dx, PORT_Y, TZ0 + 0.155); scene.add(port);
  }
  {
    const beamTex = makeTexture((ctx, W, H) => {
      const img = ctx.createImageData(W, H), d = img.data;
      for (let y = 0; y < H; y++) {
        const along = Math.pow(1 - y / H, 2.6);                // hugs the booth, dies out well before the screen
        for (let x = 0; x < W; x++) {
          const a = (x / W) * Math.PI * 2;                     // seamless around the cylinder circumference
          const ray = 0.78 + 0.22 * Math.sin(a * 5) * Math.cos(a * 3);
          const alpha = Math.round(255 * along * ray);
          const i = (y * W + x) * 4;
          d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = alpha;
        }
      }
      ctx.putImageData(img, 0, 0);
    }, 128, 256);
    projBeamMat = new THREE.MeshBasicMaterial({
      map: beamTex, color: 0xfff8ee, transparent: true, opacity: 0.01,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true,   // (one pass: three's two, back faces then front, left the front ones with no picture color: white. Added light's the same in any order)
    });
    // sections of the picture ride the beam: aScr is where each vertex sits in
    // the frame (0..1, top-left origin), and the fragment blends the 3x3 zone
    // colors there — saturation pushed, since the zones are frame averages
    projBeamMat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, beamU);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nattribute vec2 aScr; varying vec2 vScr;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvScr = aScr;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform vec3 uBeamZ[9]; uniform float uBeamOn; varying vec2 vScr;")
        .replace("#include <map_fragment>", `#include <map_fragment>
            vec2 g = clamp(vScr * 3.0 - 0.5, 0.0, 2.0);
            ivec2 a = ivec2(floor(g)), b = min(a + 1, 2); vec2 f = g - vec2(a);
            vec3 zc = mix(mix(uBeamZ[a.y * 3 + a.x], uBeamZ[a.y * 3 + b.x], f.x), mix(uBeamZ[b.y * 3 + a.x], uBeamZ[b.y * 3 + b.x], f.x), f.y);
            zc = max(mix(vec3(dot(zc, vec3(0.2126, 0.7152, 0.0722))), zc, 3.0), 0.0);
            zc *= 0.8 * inversesqrt(max(max(zc.r, max(zc.g, zc.b)), 0.01));   // brightness -> sqrt: dark sections dim, not black
            diffuseColor.rgb *= mix(vec3(1.0), zc, uBeamOn);`);
    };
    const P0 = new THREE.Vector3(TX + 1.45, PORT_Y, TZ0 + 0.16);
    const P1 = new THREE.Vector3(TX, SY, 47.85);
    const len = 8.5;                                           // stops mid-house so it never hangs over the screen
    // 4 nested concentric cones (no flat crossed fins -> no '+' shape at the port)
    const shells = [
      [0.075, 1.25, 1.00],
      [0.055, 0.90, 0.92],
      [0.038, 0.58, 0.84],
      [0.020, 0.28, 0.75],
    ].map(([r0, r1, k]) => {
      const g = new THREE.CylinderGeometry(r0, r1, len * k, 24, 1, true);
      g.translate(0, len * (1 - k) / 2, 0);
      return g;
    });
    const cone = mergeGeometries(shells);
    cone.translate(0, -len / 2, 0); cone.rotateX(-Math.PI / 2);   // axis now 0..len along +z, +z aimed at the screen
    {                                                      // frame position per vertex, against the outer shell's radius there
      const p = cone.attributes.position, scr = new Float32Array(p.count * 2);
      for (let i = 0; i < p.count; i++) {
        const R = 0.075 + 1.175 * p.getZ(i) / len;
        scr[i * 2] = 0.5 - 0.5 * p.getX(i) / R;            // local +x is world +x: the audience's left
        scr[i * 2 + 1] = 0.5 - 0.5 * p.getY(i) / R;        // +y up = top of the frame
      }
      cone.setAttribute("aScr", new THREE.BufferAttribute(scr, 2));
    }
    const beam = new THREE.Mesh(cone, projBeamMat);
    beam.position.copy(P0); beam.lookAt(P1);
    scene.add(beam);

    const lens = glow(new THREE.Mesh(new THREE.CircleGeometry(0.075, 16), new THREE.MeshBasicMaterial({ color: 0xfffbe6 })));
    lens.position.set(P0.x, P0.y, P0.z + 0.01);
    scene.add(lens);
  }
  // An exit sign the way they're made: stencil-plain strokes of one width, tall square letters, the I just a bar, wide apart. Dim, in a dark room
  const exitTex = makeTexture((c, W, H) => {
    c.fillStyle = "#0d0303"; c.fillRect(0, 0, W, H);
    c.strokeStyle = "#2a2a2a"; c.lineWidth = 8; c.strokeRect(4, 4, W - 8, H - 8);
    const s = 17, h = 112, y = (H - h) / 2, w = 70, gap = 34, xW = 78; let x = (W - (w + gap + xW + gap + s + gap + w)) / 2;
    c.fillStyle = "#ff1c12";
    c.fillRect(x, y, s, h); c.fillRect(x, y, w, s); c.fillRect(x, y + h - s, w, s); c.fillRect(x, y + (h - s) / 2, w - 10, s);   // E (its middle arm a little short)
    x += w + gap;
    const dx = s * 0.62;                       // X: two bars of the same weight, crossing
    for (const [a, b] of [[x, x + xW], [x + xW, x]]) { c.beginPath(); c.moveTo(a - dx, y); c.lineTo(a + dx, y); c.lineTo(b + dx, y + h); c.lineTo(b - dx, y + h); c.closePath(); c.fill(); }
    x += xW + gap;
    c.fillRect(x, y, s, h);                    // I
    x += s + gap;
    c.fillRect(x, y, w, s); c.fillRect(x + (w - s) / 2, y, s, h);   // T
  }, 512, 192);
  const exitSignMesh = w => new THREE.Mesh(new THREE.PlaneGeometry(w, w * 192 / 512), new THREE.MeshBasicMaterial({ map: exitTex, color: 0x8c8c8c }));
  const exitSign = exitSignMesh(0.44);
  exitSign.position.set(CINEMA_DOOR, DOOR_H + 0.25, TZ0 + WALL_T / 2 + 0.02); scene.add(exitSign);   // over the door, facing the seats

  // the emergency exit, in the side wall by the aisle at the screen end: one way, out. A steel door out at the wall's outside
  // face, swinging out (E on its panic bar: see fireExitTick); a lit EXIT over it inside. Outside, it opens into a stairwell
  // sunk in the ground beside the building: a landing, concrete steps up toward the back, a railing round it up top; over
  // the door, a wall pack; on the door, no handle, a notice
  {
    const xi = IN0, xo = TX0 - WALL_T / 2 - 0.15, { z0, z1 } = EXIT, zc = (z0 + z1) / 2, F = PIT_Y, lam = c => new THREE.MeshLambertMaterial({ color: c });
    const at = (w, h, d, m, x, y, z, out = false, par = scene) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); par.add(o); if (out) o.layers.set(EXTERIOR_LAYER); return o; };
    const frame = lam(0x2b2d30), steel = lam(0x3a3d42), conc = lam(0x9a9a96), iron = lam(0x2a2c2f);
    for (const [a, b, y0, y1] of [[z0, z0 + 0.05, 0, 2.15], [z1 - 0.05, z1, 0, 2.15], [z0, z1, 2.1, 2.15]]) at(0.06, y1 - y0, b - a, frame, xi + 0.03, F + (y0 + y1) / 2, (a + b) / 2);   // its frame, inside
    for (const z of [z0 + 0.01, z1 - 0.01]) at(xi - xo, 2.15, 0.02, frame, (xi + xo) / 2, F + 1.075, z);   // the opening's reveal, through the wall
    at(xi - xo, 0.02, z1 - z0, frame, (xi + xo) / 2, F + 2.14, zc); at(xi - xo, 0.02, z1 - z0, conc, (xi + xo) / 2, F - 0.01, zc);
    at(0.06, 0.15, 0.36, lam(0x141414), xi + 0.03, F + 2.39, zc);
    const sign = exitSignMesh(0.35);
    sign.position.set(xi + 0.0605, F + 2.39, zc); sign.rotation.y = Math.PI / 2; scene.add(sign);
    // the door: hinged at the end away from the steps, its leaf along +z from there (turned -y: it swings out, back against the
    // stairwell's end, clear of the way up). Its inside face the room's,
    // its outside face (and what's on it) out there's, and something to aim at either side
    const leaf = new THREE.Group(), LW = z1 - z0 - 0.06; leaf.position.set(xo + 0.03, 0, z0 + 0.03); scene.add(leaf);
    const inner = at(0.025, 2.125, LW, steel, 0.0125, F + 1.0725, LW / 2, false, leaf);   // (up to its head: no line of daylight over it)
    const bar = at(0.05, 0.04, LW - 0.2, lam(0xb8bcc2), 0.07, F + 1.0, LW / 2, false, leaf);   // the panic bar
    const ends = [0.1, LW - 0.1].map(z => at(0.07, 0.08, 0.08, lam(0x8f9398), 0.06, F + 1.0, z, false, leaf));
    at(0.02, 2.1, LW, lam(0x6b7078), -0.01, F + 1.06, LW / 2, true, leaf);
    for (const y of [0.5, 1.2, 1.9]) at(0.025, 0.1, 0.03, lam(0x9da3a8), -0.02, F + y, 0.01, true, leaf);   // its hinges
    const note = textPlane("EMERGENCY EXIT ONLY · NO ENTRY", 0.62, 0.07, "#f2f2ee", "#b3121d", "Arial Black", 48);
    note.material = new THREE.MeshLambertMaterial({ map: note.material.map }); note.position.set(-0.021, F + 1.55, LW / 2); note.rotation.y = -Math.PI / 2; note.layers.set(EXTERIOR_LAYER); leaf.add(note);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.1, LW), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(-0.04, F + 1.06, LW / 2); leaf.add(hit);   // (the outside's on the exterior layer, which the aiming ray doesn't see)
    for (const o of [inner, bar, ...ends]) { o.userData.fireExit = "in"; aimables.push(o); }
    hit.userData.fireExit = "out"; aimables.push(hit);
    fireExit.leaf = leaf;
    at(0.2, 0.22, 0.32, lam(0x5a4b3a), xo - 0.1, 0.95, zc, true); at(0.17, 0.01, 0.28, lam(0xf1e3b5), xo - 0.105, 0.835, zc, true);   // the wall pack over it
    // the stairwell: its walls (the building's side of it too, under the ground), the landing, the steps, the railing
    const D = F - 0.06, g = new THREE.Group(); scene.add(g);
    at(0.15, 0.05 - D, W.z1 - W.z0 + 0.15, conc, W.x0 - 0.075, (D + 0.05) / 2, (W.z0 - 0.15 + W.z1) / 2, true, g);
    at(xo - W.x0 + 0.15, 0.05 - D, 0.15, conc, (W.x0 - 0.15 + xo) / 2, (D + 0.05) / 2, W.z0 - 0.075, true, g);
    for (const [a, b] of [[W.z0, z0], [z1, W.z1]]) at(0.02, -D, b - a, conc, xo - 0.01, D / 2, (a + b) / 2, true, g);
    at(0.02, F + 0.01 - D, z1 - z0, conc, xo - 0.01, (D + F) / 2, zc, true, g);
    at(xo - W.x0, 0.06, W.stair - W.z0, conc, (W.x0 + xo) / 2, F - 0.03, (W.z0 + W.stair) / 2, true, g);
    const n = 9, run = (W.z1 - W.stair) / n;
    for (let i = 0; i < n; i++) { const top = F * (1 - (i + 1) / n); at(xo - W.x0, top - D, run, conc, (W.x0 + xo) / 2, (top + D) / 2, W.stair + (i + 0.5) * run, true, g); }
    const post = (x, z) => at(0.04, 1.0, 0.04, iron, x, 0.5, z, true, g);
    for (let z = W.z0 - 0.08; z < W.z1; z += 1.0) post(W.x0 - 0.08, z);
    post(W.x0 - 0.08, W.z1 - 0.02); post(xo - 0.08, W.z0 - 0.08);
    at(0.04, 0.04, W.z1 - W.z0 + 0.08, iron, W.x0 - 0.08, 1.0, (W.z0 - 0.08 + W.z1) / 2, true, g); at(0.03, 0.03, W.z1 - W.z0 + 0.08, iron, W.x0 - 0.08, 0.5, (W.z0 - 0.08 + W.z1) / 2, true, g);
    at(xo - W.x0, 0.04, 0.04, iron, (W.x0 + xo) / 2, 1.0, W.z0 - 0.08, true, g); at(xo - W.x0, 0.03, 0.03, iron, (W.x0 + xo) / 2, 0.5, W.z0 - 0.08, true, g);
  }

  // the store's emergency exit, the same door again: in the east wall just past the end of its shelves, one way, out to the alley by the dumpster. Its leaf out at the wall's outside face, hinged at the back end, swinging out; a lit EXIT over it inside; a wall pack over it outside (the notice on it: see buildGrounds)
  {
    const { z0, z1 } = STORE_EXIT, zc = (z0 + z1) / 2, xi = STORE.x - WALL_T / 2, xo = STORE.x + WALL_T / 2 + 0.005, lam = c => new THREE.MeshLambertMaterial({ color: c }), LW = z1 - z0 + 0.03, LH = DOOR_H + 0.02;   // (the leaf's a little bigger than its opening every way, lapping the wall behind its edges: no daylight round it)
    const at = (w, h, d, m, x, y, z, out = false, par = scene) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); par.add(o); if (out) o.layers.set(EXTERIOR_LAYER); return o; };
    const frame = lam(0x2b2d30), steel = lam(0x3a3d42);
    for (const [a, b, y0, y1] of [[z0, z0 + 0.05, 0, DOOR_H], [z1 - 0.05, z1, 0, DOOR_H], [z0, z1, DOOR_H - 0.05, DOOR_H]]) at(0.06, y1 - y0, b - a, frame, xi - 0.03, (y0 + y1) / 2, (a + b) / 2);   // its frame, inside
    for (const z of [z0 + 0.01, z1 - 0.01]) at(xo - xi, DOOR_H, 0.02, frame, (xi + xo) / 2, DOOR_H / 2, z);   // the opening's reveal, through the wall
    at(xo - xi, 0.02, z1 - z0, frame, (xi + xo) / 2, DOOR_H - 0.01, zc); at(xo - xi + 0.12, 0.012, z1 - z0, lam(0x9a9a96), (xi + xo) / 2 + 0.06, 0.006, zc);   // its head, a concrete sill
    at(0.26, 0.15, 0.36, lam(0x141414), xi - 0.14, 2.4, zc);   // (its box reaches out past the blue stripe that runs round the room)
    const sign = exitSignMesh(0.35); sign.position.set(xi - 0.2705, 2.4, zc); sign.rotation.y = -Math.PI / 2; scene.add(sign);
    const leaf = new THREE.Group(); leaf.position.set(xo, 0, z1 + 0.015); scene.add(leaf);   // (local -z: along the leaf from its hinge. Turned -y, it swings out, +x)
    const inner = at(0.025, LH, LW, steel, -0.0125, LH / 2, -LW / 2, false, leaf);
    const bar = at(0.05, 0.04, LW - 0.2, lam(0xb8bcc2), -0.07, 1, -LW / 2, false, leaf);   // the panic bar
    const ends = [0.1, LW - 0.1].map(z => at(0.07, 0.08, 0.08, lam(0x8f9398), -0.06, 1, -z, false, leaf));
    at(0.02, LH, LW, lam(0x6b7078), 0.01, LH / 2, -LW / 2, true, leaf);
    for (const y of [0.5, 1.2, 1.9]) at(0.025, 0.1, 0.03, lam(0x9da3a8), 0.02, y, -0.01, true, leaf);   // its hinges
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.04, LH, LW), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(0.04, LH / 2, -LW / 2); leaf.add(hit);   // (the outside's on the exterior layer, which the aiming ray doesn't see)
    for (const o of [inner, bar, ...ends]) { o.userData.fireExit = "in"; o.userData.exitDoor = storeExit; aimables.push(o); }
    hit.userData.fireExit = "out"; hit.userData.exitDoor = storeExit; aimables.push(hit);
    storeExit.leaf = leaf; storeExit.w = LW;
    colliders.push(storeExit.shut = { x0: STORE.x - 0.18, x1: STORE.x + 0.18, z0, z1 });   // (while its door's shut)
    at(0.2, 0.22, 0.32, lam(0x5a4b3a), xo + 0.1, DOOR_H + 0.28, zc, true); at(0.17, 0.01, 0.28, lam(0xf1e3b5), xo + 0.105, DOOR_H + 0.165, zc, true);   // the wall pack over it
  }
}

function fireExitUse(side, E = fireExit) {       // E on an emergency exit: from inside, the bar pushed and it swings open; from outside, nothing to open it by
  if (side !== "in") { toast("No handle this side: it only opens from inside"); return; }
  if (!E.open) { E.open = true; E.t = 0; window.StoreAmbience?.door("push", "open", E.leaf.position.x, 0, E.leaf.position.z); }
}
function fireExitTick(dt) {
  if (fireExit.leaf) { const { z0, z1 } = FIRE_EXIT; exitDoorTick(fireExit, dt, Math.abs(player.z - (z0 + z1) / 2) < 1.4 && player.x < WALL_L + 1.2 && player.x > FIRE_EXIT.well.x0 - 0.5 && !player.onRoof); }
  if (storeExit.leaf) { const { z0, z1 } = STORE_EXIT; exitDoorTick(storeExit, dt, Math.abs(player.z - (z0 + z1) / 2) < 1.4 && Math.abs(player.x - STORE.x) < 1.3 && !player.onRoof); }
}
function exitDoorTick(E, dt, near) {              // the door: out of your way while it's open; its closer pulls it shut once you're clear of it
  if (E.open && !near && (E.t += dt) > 1.5) E.open = false;
  else if (near) E.t = 0;
  const was = E.a; E.a = Math.max(0, Math.min(1, E.a + (E.open ? 2.0 : -0.9) * dt));
  E.leaf.rotation.y = -1.5 * (1 - (1 - E.a) ** 2);
  const i = colliders.indexOf(E.shut);
  if (E.a > 0.6 && i >= 0) colliders.splice(i, 1);
  else if (E.a < 0.6 && i < 0) colliders.push(E.shut);
  if (was > 0 && E.a === 0) window.StoreAmbience?.door("push", "settle", E.leaf.position.x, 0, E.leaf.position.z);
}

// ---- the projection booth, over the lobby's back (floor 3 m up, ceiling 6; staff only, so grey block, a concrete floor, a
// dark ceiling; its own lights, on a switch of their own): a window in the wall it shares with the auditorium to watch from
// and a spinning stool at it, the projector at its port, fed from a platter, the bench films are made up on, the cans, the
// sound rack; red working lights for when the room's dark. And the stairs up to it: walled in, in the lobby's corner by the
// back of house, through a door marked for staff, up one flight toward the back, round on a landing, up the other toward
// the front and out through the side wall into the booth. You're in the booth or you're not (player.inBooth: its floor's
// over the lobby's), and you get in and out at the stairs' top ----
const BOOTH = { x0: WALL_L + WALL_T / 2, x1: SHAFT.x0, z0: TALL.z0, z1: TALL.z1 - 0.04, cols: [], g: null };   // its floor (to the port wall's black face), what's on it; g: all of it and the stairs, drawn only when it can be seen (see boothSeen)
function stairsAt(x, z) {                        // the stairwell's floor: the flights as ramps (the treads drawn over them)
  const B = TALL.booth, k = (z - SHAFT.top) / (SHAFT.turn - SHAFT.top);
  if (x > SHAFT.split + 0.05) return z < SHAFT.top ? 0 : z < SHAFT.turn ? k * B / 2 : B / 2;   // the near flight, up toward the back
  return z >= SHAFT.turn ? B / 2 : z >= SHAFT.top ? B / 2 + (1 - k) * B / 2 : B;            // the far one, back up toward the front, and its top
}
{
  const B = TALL.booth, CEIL = TALL.ceil, UNDER = ROOF.tall.y - 0.05, PORT_Y = 4.2, WIN = [-5.4, -3.4, B + 0.85, B + 1.6];   // the window: x0, x1, sill, head
  const lam = c => new THREE.MeshLambertMaterial({ color: c });
  const C = { iron: lam(0x2a2c2f), metal: lam(0xa9aeb3), block: wallSurface(lam(0x7c7d7a), "concrete"), paint: lam(0xe8ecf2), port: lam(0x17181b), floor: lam(0x34373b), ceil: lam(0x26282b),
    tread: lam(0x55595e), nose: lam(0x1d1f22), cast: lam(0x3a3d42), head: lam(0x4a4f57), lamp: lam(0x2c2f34), duct: lam(0x9a9ea4), alu: lam(0xb8bcc2), film: lam(0x3b2a1e),
    rack: lam(0x141518), unit: lam(0x2a2c30), mat: lam(0x1a1b1d), cork: lam(0x8c6a46), paper: lam(0xe6e2d6), red: lam(0xb3201c), table: lam(0x6b5a44) };
  const blk = (x0, y0, z0, x1, y1, z1, m) => box(x1 - x0, y1 - y0, z1 - z0, m, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const wallBlk = (...a) => { const o = blk(...a); aimBlockers.push(o); return o; };
  const lobbyBlk = (...a) => { const o = wallBlk(...a); lobbySide.add(o); return o; };
  const cyl = (x, y, z, r, len, axis, m) => {    // axis: "x" | "y" | "z"
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 16), m); o.position.set(x, y, z);
    if (axis === "x") o.rotation.z = Math.PI / 2; else if (axis === "z") o.rotation.x = Math.PI / 2; scene.add(o); return o;
  };
  const bar = (a, b, w, d, m) => {               // a beam w by d from a to b
    const v = new THREE.Vector3().subVectors(b, a), o = new THREE.Mesh(new THREE.BoxGeometry(w, v.length(), d), m);
    o.position.copy(a).add(b).multiplyScalar(0.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); scene.add(o); return o;
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const bcol = (x0, x1, z0, z1) => BOOTH.cols.push({ x0, x1, z0, z1 });
  const X0 = BOOTH.x0, XS = SHAFT.x0, n0 = scene.children.length, lobbySide = new Set();   // (lobbySide: the stairwell's walls, seen from the lobby: left out of g)

  // its walls, from just over the lobby's ceiling: the front, the store's side, the back of house's
  wallBlk(WALL_L - WALL_T / 2 - 0.1, 2.72, TALL.z0 - WALL_T, BX0 + WALL_T / 2 + 0.1, UNDER, TALL.z0, C.block);
  wallBlk(WALL_L - WALL_T / 2 - 0.1, 2.72, TALL.z0, X0, UNDER, TALL.z1, C.block);
  wallBlk(BX0 - WALL_T / 2 - 0.02, 2.72, TALL.z0, BX0 + WALL_T / 2 + 0.1, UNDER, TALL.z1, C.block);
  // the wall it shares with the auditorium, from the lobby's ceiling up, round the window: the auditorium's colour that side,
  // black this side (nothing to throw light back at the glass)
  const thWall = lam(0x261015), Z0 = TALL.z1, Z1 = TALL.z1 + WALL_T, WX0 = WALL_L, WX1 = BX0;
  for (const [x0, x1, y0, y1] of [[WX0, WX1, BOH.h, WIN[2]], [WX0, WX1, WIN[3], CEIL + 0.35], [WX0, WIN[0], WIN[2], WIN[3]], [WIN[1], WX1, WIN[2], WIN[3]]]) wallBlk(x0, y0, Z0, x1, y1, Z1, thWall);
  for (const [x0, x1, y0, y1] of [[X0, XS, B, WIN[2]], [X0, XS, WIN[3], CEIL], [X0, WIN[0], WIN[2], WIN[3]], [WIN[1], XS, WIN[2], WIN[3]]]) blk(x0, y0, Z0 - 0.04, x1, y1, Z0, C.port);
  const glass = blk(WIN[0], WIN[2], Z0 + 0.094, WIN[1], WIN[3], Z0 + 0.106, new THREE.MeshPhongMaterial({ color: 0x8c9eb3, transparent: true, opacity: 0.16, shininess: 120, specular: 0xffffff, depthWrite: false }));
  aimBlockers.push(glass);
  for (const [x0, x1, y0, y1] of [[WIN[0] - 0.05, WIN[0], WIN[2] - 0.05, WIN[3] + 0.05], [WIN[1], WIN[1] + 0.05, WIN[2] - 0.05, WIN[3] + 0.05], [WIN[0], WIN[1], WIN[3], WIN[3] + 0.05]]) blk(x0, y0, Z0 - 0.08, x1, y1, Z0 - 0.04, C.iron);
  blk(WIN[0] - 0.1, WIN[2] - 0.05, Z0 - 0.28, WIN[1] + 0.1, WIN[2], Z0 - 0.04, C.iron);   // the sill
  blk(-1.77, PORT_Y - 0.275, Z0 - 0.12, XS - 0.05, PORT_Y + 0.275, Z0 - 0.06, C.port);      // the port's frame this side
  blk(X0, B - 0.02, TALL.z0, XS, B, BOOTH.z1, C.floor);
  blk(X0, CEIL, TALL.z0, BX0 - WALL_T / 2, CEIL + 0.02, Z0, C.ceil);

  // the projector, at its port: cast pedestal, console, the head with its lens through the port, the xenon lamp house behind, its exhaust up through the ceiling
  const px = -1.42;
  blk(-2.15, B, 33.25, -0.72, B + 0.008, 34.84, C.mat);
  blk(px - 0.42, B, 33.65, px + 0.42, B + 0.09, 34.65, C.cast);
  blk(px - 0.2, B + 0.09, 33.85, px + 0.2, B + 0.92, 34.45, C.cast);
  blk(px - 0.34, B + 0.92, 33.45, px + 0.34, B + 0.99, 34.7, C.cast);
  blk(px - 0.2, B + 0.99, 34.08, px + 0.2, B + 1.42, 34.6, C.head);
  blk(px - 0.17, B + 0.99, 34.0, px + 0.17, B + 1.2, 34.08, C.head);
  cyl(px, PORT_Y, 34.72, 0.065, 0.24, "z", C.iron);
  for (const y of [B + 1.06, B + 1.32]) cyl(px - 0.21, y, 34.3, 0.055, 0.03, "x", C.metal);   // the sprockets either side of the gate
  blk(px - 0.24, B + 0.99, 33.48, px + 0.24, B + 1.62, 34.08, C.lamp);
  for (let i = 0; i < 4; i++) blk(px - 0.25, B + 1.08 + i * 0.12, 33.5, px - 0.24, B + 1.12 + i * 0.12, 34.06, C.metal);   // its cooling fins
  cyl(px, (B + 1.62 + CEIL) / 2, 33.78, 0.1, CEIL - B - 1.62, "y", C.duct);
  blk(-3.05, B, 33.95, -2.65, B + 0.95, 34.6, C.unit);                                       // the lamp's power supply
  bcol(px - 0.42, px + 0.42, 33.45, BOOTH.z1); bcol(-3.05, -2.65, 33.95, 34.6);
  // the platter: three decks on a mast, a film wound on the top two, the brain on top; the film over a roller to the projector
  const pl = V(-4.3, B, 31.9);
  blk(pl.x - 0.35, B, pl.z - 0.35, pl.x + 0.35, B + 0.12, pl.z + 0.35, C.cast);
  cyl(pl.x, B + 0.8, pl.z, 0.05, 1.6, "y", C.metal);
  for (let i = 0; i < 3; i++) { const y = B + 0.55 + i * 0.4; cyl(pl.x, y, pl.z, 0.68, 0.025, "y", C.alu); if (i) cyl(pl.x, y + 0.03, pl.z, 0.47, 0.035, "y", C.film); }
  cyl(pl.x, B + 1.68, pl.z, 0.11, 0.16, "y", C.head);
  blk(pl.x + 0.36, B, pl.z - 0.12, pl.x + 0.52, B + 0.9, pl.z + 0.12, C.unit);
  bcol(pl.x - 0.68, pl.x + 0.68, pl.z - 0.68, pl.z + 0.68);
  const post = V(-2.45, B, 33.35);
  cyl(post.x, B + 0.82, post.z, 0.025, 1.64, "y", C.metal); cyl(post.x, B + 1.62, post.z, 0.04, 0.06, "x", C.alu);
  bar(V(pl.x + 0.06, B + 1.62, pl.z + 0.04), V(post.x, B + 1.66, post.z), 0.035, 0.003, C.film);
  bar(V(post.x, B + 1.66, post.z), V(px, B + 1.44, 34.2), 0.035, 0.003, C.film);
  bcol(post.x - 0.08, post.x + 0.08, post.z - 0.08, post.z + 0.08);
  // the make-up bench along the side wall: rewinds at each end, the splicer, cans waiting
  const bx0 = X0 + 0.02, bx1 = -6.92;
  blk(bx0, B + 0.85, 30.4, bx1, B + 0.9, 32.7, C.table);
  for (const z of [30.45, 32.6]) for (const x of [bx0 + 0.05, bx1 - 0.05]) blk(x - 0.025, B, z - 0.025, x + 0.025, B + 0.85, z + 0.025, C.iron);
  blk(bx0, B + 0.25, 30.45, bx1, B + 0.28, 32.65, C.table);
  for (const z of [30.75, 32.35]) { blk(-7.32, B + 0.9, z - 0.05, -7.22, B + 1.05, z + 0.05, C.iron); cyl(-7.27, B + 1.24, z, 0.19, 0.03, "x", C.alu); cyl(-7.2, B + 1.24, z, 0.015, 0.12, "x", C.iron); }
  blk(-7.4, B + 0.9, 31.45, -7.12, B + 0.97, 31.7, C.metal);                                  // the splicer
  for (let i = 0; i < 4; i++) cyl(-7.27, B + 0.29 + 0.045 * i + 0.02, 31.2 + (i % 2) * 0.06, 0.2, 0.04, "y", C.metal);
  bcol(bx0, bx1, 30.4, 32.7);
  // the can rack on the front wall
  for (const x of [-7.55, -6.6]) blk(x, B, 29.82, x + 0.04, B + 1.9, 30.27, C.iron);
  for (let i = 0; i < 4; i++) {
    const y = B + 0.25 + i * 0.52; blk(-7.55, y, 29.82, -6.56, y + 0.025, 30.27, C.iron);
    for (let j = 0; j < (i < 3 ? 3 : 2); j++) cyl(-7.33 + j * 0.3, y + 0.05 + (j % 2) * 0.045, 30.04, 0.19, 0.045, "y", (i + j) % 3 ? C.metal : lam(0x8a6d2a));
  }
  bcol(-7.6, -6.52, TALL.z0, 30.3);
  // the sound rack, on the stairwell's wall: black, its units, their lights (always on: it's powered whatever the room's lights)
  blk(XS - 0.62, B, 32.15, XS, B + 1.9, 32.95, C.rack);
  for (let i = 0; i < 6; i++) {
    const y = B + 0.2 + i * 0.26; blk(XS - 0.632, y, 32.2, XS - 0.62, y + 0.2, 32.9, C.unit);
    for (let j = 0; j < (i % 3) + 2; j++) glow(blk(XS - 0.638, y + 0.144, 32.294 + j * 0.06, XS - 0.632, y + 0.156, 32.306 + j * 0.06, new THREE.MeshBasicMaterial({ color: [0x33ff66, 0xffb020, 0x33ff66, 0xff4030][(i + j) % 4] })));
  }
  bcol(XS - 0.62, XS, 32.15, 32.95);
  // the rest: the extinguisher by the stairs, the clock over the window, the schedule board, a bin
  cyl(XS - 0.1, B + 0.6, 31.05, 0.08, 0.5, "y", C.red); cyl(XS - 0.1, B + 0.9, 31.05, 0.03, 0.1, "y", C.iron); blk(XS - 0.03, B + 0.5, 30.98, XS, B + 0.75, 31.12, C.iron);
  cyl(-4.4, B + 2.35, Z0 - 0.06, 0.16, 0.04, "z", C.paper); cyl(-4.4, B + 2.35, Z0 - 0.045, 0.175, 0.03, "z", C.iron);
  blk(-4.0, B + 1.35, TALL.z0, -2.8, B + 2.05, TALL.z0 + 0.03, C.cork);
  for (let i = 0; i < 5; i++) blk(-3.92 + (i % 3) * 0.38, B + 1.42 + Math.floor(i / 3) * 0.3, TALL.z0 + 0.03, -3.66 + (i % 3) * 0.38, B + 1.68 + Math.floor(i / 3) * 0.3, TALL.z0 + 0.035, C.paper);
  cyl(-6.3, B + 0.22, 30.55, 0.17, 0.44, "y", C.iron); bcol(-6.47, -6.13, 30.38, 30.72);
  // the lights: lamps low on the walls shining down, red working lights lower (on while the room's dark)
  boothGlow.lamps = new THREE.MeshBasicMaterial({ color: 0xffd890 }); boothGlow.red = new THREE.MeshBasicMaterial({ color: 0x2a0806 });
  for (const [x, z, ox, oz] of [[-6.2, TALL.z0, 0, 1], [-3.4, TALL.z0, 0, 1], [X0, 33.9, 1, 0], [-6.6, BOOTH.z1, 0, -1], [-2.4, BOOTH.z1, 0, -1]]) {
    const y = B + 0.95, w = ox ? 0.11 : 0.26, d = ox ? 0.26 : 0.11;
    box(w, 0.1, d, C.iron, x + ox * 0.055, y + 0.05, z + oz * 0.055);
    glow(box(ox ? 0.07 : 0.22, 0.006, ox ? 0.22 : 0.07, boothGlow.lamps, x + ox * 0.06, y - 0.003, z + oz * 0.06));
  }
  for (const [x, z, ox, oz] of [[XS, 31.35, -1, 0], [XS, 33.6, -1, 0], [-2.2, BOOTH.z1, 0, -1], [-5.6, BOOTH.z1, 0, -1], [-3.4, TALL.z0, 0, 1], [-5.6, TALL.z0, 0, 1], [X0, 33.5, 1, 0]])
    glow(box(ox ? 0.02 : 0.14, 0.035, ox ? 0.14 : 0.02, boothGlow.red, x + ox * 0.012, B + 0.18, z + oz * 0.012));
  // a spinning stool at the window, the register's kind
  {
    const g = new THREE.Group(); g.position.set(-4.4, B, 34.0); scene.add(g);
    const chromeS = new THREE.MeshPhongMaterial({ color: 0xc9cdd2, specular: 0xffffff, shininess: 80 });
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, leg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.3), C.iron); leg.position.set(Math.sin(a) * 0.15, 0.04, Math.cos(a) * 0.15); leg.rotation.y = a; g.add(leg); }
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.62, 10), chromeS); stem.position.y = 0.35; g.add(stem);
    const seatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.18, 0.08, 20), lam(0x1c1c1e)); seatTop.position.y = 0.68; g.add(seatTop);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.8, 0.45), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(-4.4, B + 0.4, 34.0); scene.add(hit);
    hit.userData.sit = true; hit.userData.seatPos = { x: -4.4, y: B, z: 34.0, ry: 0, hipY: 0.7 }; aimables.push(hit);
    bcol(-4.62, -4.18, 33.78, 34.22);
  }

  // the stairwell: walls of block, coursed (the lobby's paint on the outside of them), its floor inside the door, the
  // flights and the landing, the rails on the walls, the bulbs hanging on their cords
  const x0 = XS + 0.15, mid = SHAFT.split, rise = B / 18, run = (SHAFT.turn - SHAFT.top) / 8, WB = BX0 - WALL_T / 2;
  lobbyBlk(XS, 0, SHAFT.top, x0, UNDER, TALL.z1, C.block);
  lobbyBlk(XS, 0, TALL.z0, x0, B, SHAFT.top, C.block);
  wallBlk(XS, B + 2.1, TALL.z0, x0, UNDER, SHAFT.top, C.block);
  lobbyBlk(XS, 0, SHAFT.z0, 0.69, BOH.h + 0.02, TALL.z0, C.block);
  lobbyBlk(0.69, DOOR_H + 0.06, SHAFT.z0, WB, BOH.h + 0.02, TALL.z0, C.block);
  blk(WB - 0.02, 0, TALL.z0, WB, CEIL + 0.03, TALL.z1, C.block);                             // (over the lobby's paint, in here)
  for (const [x0_, x1, y0, y1, z0, z1] of [[XS - 0.01, XS, 0, BOH.h, SHAFT.z0, TALL.z1], [XS, 0.69, 0, BOH.h, SHAFT.z0 - 0.01, SHAFT.z0], [0.69, WB + 0.01, DOOR_H + 0.06, BOH.h, SHAFT.z0 - 0.01, SHAFT.z0]])
    lobbySide.add(blk(x0_, y0, z0, x1, y1, z1, C.paint));                                     // (out there it's the lobby's: its paint)
  blk(x0, 0, TALL.z1 - 0.02, WB - 0.02, CEIL, TALL.z1, C.block);
  blk(mid + 0.1, 0, TALL.z0, WB - 0.02, 0.01, SHAFT.top, C.floor);
  wallBlk(mid, 0, TALL.z0, mid + 0.1, B + 1.1, SHAFT.turn, C.block);                          // between the flights
  for (let i = 0; i < 8; i++) {                    // up toward the back, by the back of house's wall
    const z = SHAFT.top + i * run;
    blk(mid + 0.1, 0, z, WB - 0.02, (i + 1) * rise, z + run, C.tread);
    blk(mid + 0.1, (i + 1) * rise - 0.015, z - 0.005, WB - 0.02, (i + 1) * rise + 0.003, z + 0.04, C.nose);
  }
  blk(x0, 0, SHAFT.turn, WB - 0.02, B / 2, TALL.z1 - 0.02, C.tread);
  blk(mid + 0.1, B / 2 - 0.015, SHAFT.turn - 0.005, WB - 0.02, B / 2 + 0.003, SHAFT.turn + 0.04, C.nose);
  for (let j = 0; j < 8; j++) {                    // and round, up toward the front
    const z = SHAFT.turn - (j + 1) * run, y = B / 2 + (j + 1) * rise;
    blk(x0, 0, z, mid, y, z + run, C.tread);
    blk(x0, y - 0.015, z + run - 0.04, mid, y + 0.003, z + run + 0.005, C.nose);
  }
  blk(x0, 0, TALL.z0, mid, B, SHAFT.top, C.tread);
  blk(x0, B - 0.015, SHAFT.top - 0.04, mid, B + 0.003, SHAFT.top + 0.005, C.nose);
  const r1 = WB - 0.06;
  bar(V(r1, rise + 0.9, SHAFT.top), V(r1, B / 2 + 0.9, SHAFT.turn), 0.05, 0.05, C.iron);
  bar(V(x0 + 0.04, B / 2 + rise + 0.9, SHAFT.turn), V(x0 + 0.04, B + 0.9, SHAFT.top), 0.05, 0.05, C.iron);
  bar(V(WB - 0.04, B / 2 + 0.9, TALL.z1 - 0.06), V(x0 + 0.02, B / 2 + 0.9, TALL.z1 - 0.06), 0.05, 0.05, C.iron);
  colliders.push({ x0: XS - 0.08, x1: x0 + 0.08, z0: SHAFT.top, z1: TALL.z1 },   // its walls (the side one open at the top of the stairs, into the booth: you can't get up there from the lobby)
    { x0: XS - 0.08, x1: 0.69, z0: SHAFT.z0 - 0.08, z1: TALL.z0 + 0.08 }, { x0: mid - 0.04, x1: mid + 0.14, z0: TALL.z0, z1: SHAFT.turn },
    { x0: x0, x1: WB, z0: TALL.z1 - 0.08, z1: TALL.z1 });
  boothGlow.stairs = new THREE.MeshBasicMaterial({ color: 0xffd890 });
  for (const [x, y, z] of STAIR_BULBS) {   // hanging over the door's landing, over the turn
    bar(V(x, CEIL, z), V(x, y + 0.16, z), 0.012, 0.012, C.iron);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.17, 0.15, 24, 1, true), Object.assign(lam(0x2f4636), { side: THREE.DoubleSide })); shade.position.set(x, y + 0.09, z); scene.add(shade);
    const bulb = glow(new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), boothGlow.stairs)); bulb.position.set(x, y, z); scene.add(bulb);
  }
  // all of it but the stairwell's outside in one group, and what doesn't move or get aimed at merged, one mesh a material
  // (some 250 boxes otherwise, each a draw)
  BOOTH.g = new THREE.Group(); scene.add(BOOTH.g);
  for (const o of scene.children.slice(n0, -1)) if (!lobbySide.has(o)) BOOTH.g.add(o);   // (-1: not g itself)
  {
    const by = new Map(), solid = new Set(aimBlockers);
    for (const o of [...BOOTH.g.children]) {
      if (!o.isMesh || o.layers.mask !== 1 || Object.keys(o.userData).length || aimables.includes(o) || o.material.transparent) continue;
      o.updateMatrixWorld(); const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
      for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k);
      const key = o.material.uuid + (solid.has(o) ? ":solid" : "");
      if (!by.has(key)) by.set(key, { m: o.material, solid: solid.has(o), gs: [] });
      by.get(key).gs.push(g); BOOTH.g.remove(o); if (solid.has(o)) aimBlockers.splice(aimBlockers.indexOf(o), 1);
    }
    for (const { m, solid: sd, gs } of by.values()) { const mesh = new THREE.Mesh(mergeGeometries(gs), m); BOOTH.g.add(mesh); if (sd) aimBlockers.push(mesh); }
  }
  // its door: the break room's kind, marked for staff (made last: a save keeps the doors by their order)
  makeDoor({ at: (SHAFT.z0 + TALL.z0) / 2, c: SHAFT.door, alongX: true, hinge: 1, swing: 1, leafMat: painted, signs: [{ text: "EMPLOYEES ONLY", side: -1 }] });
}
// fluorescent troffers: fixtures taking the place of one ceiling
// tile each (snapped into its slot). Mostly one glowing white rectangle —
// the diffuser — with the two tubes behind it only faintly brighter bands.
// Merged per group, emissive — a handful of independently-lit groups so
// warm-up flicker (see setZone) can hit some fixtures and not others,
// like real fluorescents restriking
const PANEL_GROUPS = 3;                         // flicker groups per switch zone
const panelBuckets = new Map();                 // "zone:group" -> geometries
const diffuserTex = makeTexture((ctx, W, H) => {
  ctx.fillStyle = "#e3e8ef"; ctx.fillRect(0, 0, W, H);
  for (const cy of [H * 0.3, H * 0.7]) {                                          // the two tubes, soft through the diffuser
    const g = ctx.createLinearGradient(0, cy - H * 0.14, 0, cy + H * 0.14);
    g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.fillRect(0, cy - H * 0.14, W, H * 0.28);
  }
}, 128, 64);
const troffer = (x, z, y, snapZ = true, w = 0) => {      // -> where it ended up (w: a room narrower than a tile slot: a panel this wide, where it's told along x)
  if (!w) x = Math.round((x - CEIL_TILE.x / 2) / CEIL_TILE.x) * CEIL_TILE.x + CEIL_TILE.x / 2;   // centered in a tile slot
  if (snapZ) z = Math.round((z - CEIL_TILE.z / 2) / CEIL_TILE.z) * CEIL_TILE.z + CEIL_TILE.z / 2;   // (the hall's grid is its own: its lights go where they're told)
  const p = new THREE.PlaneGeometry(w || CEIL_TILE.x - 0.02, CEIL_TILE.z - 0.02); p.rotateX(Math.PI / 2); p.translate(x, y - 0.02, z);
  const key = `${lightZoneAt(x, z)}:${Math.floor(Math.random() * PANEL_GROUPS)}`;
  if (!panelBuckets.has(key)) panelBuckets.set(key, []);
  panelBuckets.get(key).push(p);
  return { x, z, y: y - 0.02 };
};
for (const [x, z] of [[-5.4, 30.15], [-2.6, 30.15]]) troffer(x, z, BOH.h);   // movie theater lobby troffers (clear of the stairwell)
// every other tile slot across, every fourth along — a tile or more of
// plain ceiling on every side, so no two fixtures ever touch
for (let x = -9.9; x <= STORE.x - 1; x += 2 * CEIL_TILE.x) for (let z = 3.15; z <= STORE.z - 1; z += 4 * CEIL_TILE.z) {
  if (x - CEIL_TILE.x / 2 < XL + 0.3) continue;   // don't float panels past the pulled-in movie-side wall
  TROFFERS.push(troffer(x, z, STORE.h));
}
for (const x of [4.5, 8.1]) troffer(x, hallMid, BOH.h, false);              // down the middle of the hall (its ceiling grid is centered there too)
for (const x of [(BOH.x0 + 0.1 + BOH.rrX - 0.1) / 2, (BOH.rrX + 0.1 + BOH.splitX - 0.1) / 2]) troffer(x, 32.4, BOH.h, true, 1.3);   // the restrooms: 1.7 m across, a tile slot's too wide
troffer(8.1, 31.05, BOH.h);    // the break room
panelMats = [...panelBuckets].map(([key, bucket]) => {
  const m = new THREE.MeshBasicMaterial({ color: 0xf8fbff, map: diffuserTex });
  m.userData.zone = key.split(":")[0];
  scene.add(new THREE.Mesh(mergeGeometries(bucket), m));
  return m;
});

// lighting: the overhead rig (hemisphere + ambient + a key light) now lives
// in the room shader, one copy per switch zone — see ROOM_FRAG / TVU
const lin = (hex, k) => new THREE.Color(hex).multiplyScalar(k);
TVU.uInSky.value.copy(lin(0xdfe8ff, 1.15)); TVU.uInGround.value.copy(lin(0x223355, 1.15));
TVU.uInAmb.value.copy(lin(0xffffff, 0.32)); TVU.uInDirC.value.copy(lin(0xffffff, 0.55)); TVU.uInDir.value.set(3, 10, -6).normalize();
TVU.uFloorBox.value.set(XL - 0.05, XR + 0.05, Z, H + 0.05);
TVU.uBohBox.value.set(BOH.x0, CLOSET.x1 + 0.05, BOH.hallZ, BOH.z1 + 0.05); TVU.uBohSplit.value.set(BOH.splitX, BOH.h, CLOSET.x0);
const lobby = new THREE.PointLight(0xfff2cc, 0.7, 14, 2); lobby.position.set(0.9, 2.4, 3.15);   // under the entry troffer, low enough not to burn a hot spot into the tiles
lobby.userData.on = lobby.intensity; lobby.userData.zone = "front"; allLights.push(lobby); scene.add(lobby);

