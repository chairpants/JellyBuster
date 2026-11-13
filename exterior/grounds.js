// ---- around the building: grass all round, the dumpster and what's behind it; the service road and its fence (exterior/serviceroad.js) laid over the grass ----
// Called from the roof's block (store/roof.js), with the helpers of its it uses.
function buildGrounds({ lam, put, bx, cy, ext, dark }) {
  const ground = (x0, x1, z0, z1, m, y = 0) => { const g = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), m); g.rotation.x = -Math.PI / 2; g.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); scene.add(g); ext(g); };
  for (const [x0, x1, z0, z1] of [[-250, -27.74, LOT.roadNear, 0], [31, 250, LOT.roadNear, 0], [-250, -27.74, -250, LOT.roadFar], [31, 250, -250, LOT.roadFar], [-27.74, 31, -250, -30.4],   // (out front: round the road, which runs on out of sight)
    [-250, -9.4, 0, 250], [-9.4, -7.84, 0, FIRE_EXIT.well.z0 - 0.15], [-9.4, -7.84, FIRE_EXIT.well.z1, 250], [11.1, 250, 0, 250],   // (round the emergency exit's stairwell)
    [2.1, 11.1, 35.1, 48.6], [-7.84, 11.1, 48.6, 250]]) ground(x0, x1, z0, z1, mat.grass);   // (none under the building: the theater's floor goes down below it)
  { const n = weatheredSign("EMERGENCY EXIT\nNO ENTRY", 0.62, 0.26, { fg: "#f2f2ee", bg: "#a81a1c", seed: 91, bent: 0.008 }); n.position.set(0.024, 1.5, -storeExit.w / 2); n.rotation.y = Math.PI / 2; n.layers.set(EXTERIOR_LAYER); storeExit.leaf.add(n); }   // the notice on the store's emergency exit
  buildServiceRoad({ lam, ext });                  // the service road: its paving, fence, barriers
  buildEdges({ lam, ext });                        // out front, where the world stops: the county's yard and its fence, the power line (exterior/edges.js)
  buildPlayground({ lam, ext });                   // the park across the road (exterior/playground.js)
  for (const [x, z, seed, tilt] of [[-16.38, 0.42, 51, 0.022], [22.45, 0.4, 67, -0.03]]) {   // a sign at each way in
    const s = new THREE.Group(); scene.add(s); cy(0.03, 0.03, 2.2, lam(0x6a6e70), x, 1.1, z, 8, s);
    bx(1.15, 0.42, 0.012, lam(0x5e6264), x, 2.0, z - 0.034, s).rotation.z = tilt;                                  // (the back of the sheet)
    const t = weatheredSign("SERVICE DRIVE", 1.15, 0.42, { fg: "#d8d4c0", bg: "#2f4d33", seed, bent: 0.02 }); t.position.set(x, 2.0, z - 0.05); t.rotation.set(0, Math.PI, tilt); s.add(t); ext(s);
  }
  {                                                // the dumpster, under the closet's chute, front to the back lot so the truck can come straight at it: two plastic lids, a bit of rust, a sleeve down each end for the forks
    const DX = 12.7, DZ = 28.72, d = new THREE.Group(); d.position.set(DX, 0, DZ); scene.add(d);
    const green = lam(0x2e5a3a), lidM = lam(0x1b1d1f), sleeve = lam(0x2a2c2c);
    put(new THREE.BoxGeometry(1.9, 1.1, 1.15), green, 0, 0.62, 0, d);
    bx(0.93, 0.05, 1.25, lidM, 0.475, 1.2, 0.05, d).rotation.x = -0.08;
    { const l = bx(0.93, 0.05, 1.25, lidM, -0.475, 0.72, -0.72, d); l.rotation.x = -1.42; }   // the one under the chute, thrown back and hanging
    for (const s of [-1, 1]) { bx(0.3, 0.12, 1.2, dark, s * 0.55, 0.07, 0, d); bx(0.07, 0.14, 1.1, sleeve, s * 0.985, 0.74, 0, d); }
    bx(1.95, 0.05, 0.06, lam(0x6a3a22), 0, 0.95, 0.58, d);
    bx(0.45, 0.25, 0.004, lam(0xd0c8a0), 0.25, 0.66, 0.577, d); bx(0.3, 0.05, 0.004, lam(0x8a1a1a), 0.25, 0.71, 0.58, d);   // the hauler's label
    ext(d); colliders.push({ x0: 11.1, x1: DX + 1.02, z0: DZ - 0.58, z1: DZ + 0.58, y1: 1.3 });
    const o = new THREE.Group(), gal = lam(0x9da3a8); scene.add(o);   // the chute's outlet over it: a hood out from the wall to over the bin, its flap
    bx(1.15, 0.26, 0.6, gal, 11.525, 1.45, DZ, o);
    bx(0.02, 0.3, 0.6, gal, 12.14, 1.42, DZ, o).rotation.z = 0.35;
    ext(o);
  }
  {                                                // behind the dumpster, against the store's wall past the emergency exit, where nobody coming up the alley sees it: somebody's cardboard bed (a place to lie low and pass the day)
    const BX = 12.05, BZ = 24.6, b = new THREE.Group(); b.position.set(BX, 0, BZ); scene.add(b);
    const card = makeTexture((ctx, w2, h2) => { ctx.fillStyle = "#b08a5a"; ctx.fillRect(0, 0, w2, h2); ctx.strokeStyle = "#8a6a42"; ctx.lineWidth = 3; ctx.strokeRect(6, 6, w2 - 12, h2 - 12);
      ctx.beginPath(); ctx.moveTo(w2 / 2, 0); ctx.lineTo(w2 / 2, h2); ctx.stroke(); ctx.fillStyle = "#3a2a1a"; ctx.font = "bold 22px Arial"; ctx.fillText("THIS SIDE UP", 30, h2 * 0.3); ctx.fillText("↑ ↑", 60, h2 * 0.6);
      for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(60,40,20,${Math.random() * 0.15})`; ctx.fillRect(Math.random() * w2, Math.random() * h2, 6 + Math.random() * 20, 3 + Math.random() * 10); } }, 256, 128);
    const cm2 = lam(0xb08a5a); cm2.map = card;
    for (const [w2, d2, x, z, ry] of [[0.95, 2.0, 0, 0, 0.02], [0.8, 1.1, 0.12, 0.55, -0.08]]) { const o = bx(w2, 0.02, d2, cm2, x, 0.012 + (x ? 0.02 : 0), z, b); o.rotation.y = ry; }
    const blanket = bx(0.85, 0.12, 1.2, lam(0x5a6b3a), 0.05, 0.09, -0.15, b); blanket.rotation.set(0.04, 0.1, 0.03);
    const pillow = bx(0.5, 0.14, 0.32, lam(0x2c2f45), 0, 0.1, 0.78, b); pillow.rotation.y = 0.2;           // a rolled-up jacket for a pillow
    bx(0.4, 0.3, 0.32, lam(0x1f6fb5), -0.55, 0.15, 0.9, b);                                                      // a milk crate
    for (const [cx2, cz2] of [[0.6, -0.8], [0.68, -0.62]]) { const can = cy(0.033, 0.033, 0.12, lam(0xc8282f), cx2, 0.06, cz2, 10, b); can.rotation.z = cx2 > 0.65 ? Math.PI / 2 : 0; }
    ext(b);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 2.3), new THREE.MeshBasicMaterial()); hit.visible = false; hit.position.set(BX, 0.25, BZ); hit.userData.bed = true;
    scene.add(hit); aimables.push(hit);           // (what you aim at: the bed itself is on the exterior layer, which the aiming ray doesn't see)
  }
}
