// ---------------- the restroom's working parts ----------------
const LUNCHING = new Set(["toLunch", "lunchSit", "lunch", "lunchUp"]);
function breakroomTick(dt) {                     // the clocks keep the shift's time, the microwave blinks 12:00, the pot empties through the day, the TV's on over lunch
  const B = breakFx, h = shift.h, now = performance.now() / 1000;
  if (B.clock) { B.clock.h.rotation.z = -(h % 12) / 12 * Math.PI * 2; B.clock.m.rotation.z = -(h % 1) * Math.PI * 2; B.clock.s.rotation.z = -Math.floor(now % 60) / 60 * Math.PI * 2; }
  if (B.punch) { B.punch.h.rotation.z = (h % 12) / 12 * Math.PI * 2; B.punch.m.rotation.z = (h % 1) * Math.PI * 2; }   // (seen from its back side's frame: turns the other way)
  if (B.clock12) B.clock12.visible = Math.floor(now * 1.6) % 2 === 0;
  if (B.coffee) {
    const on = h >= 8.5 && h < 22, lv = on ? 1 - ((h - 8.5) % 4) / 4 * 0.85 : 0.12;   // brewed fresh every four hours or so
    B.coffee.scale.y = lv; B.coffee.position.y = 0.05 + 0.035 * lv; B.coffeeLed.color.setHex(on ? 0xff3020 : 0x401010);
  }
  if (B.tv) {
    const on = staff.some(e => LUNCHING.has(e.state));
    if (on) { B.tvT -= dt; if (B.tvT <= 0) { B.tvT = 0.4 + Math.random() * 2.5; B.tvHue = Math.random(); } B.tv.color.setHSL(B.tvHue || 0.6, 0.35, 0.32 + Math.random() * 0.04); }
    else B.tv.color.setHex(0x15181a);
    B.vcr.color.setHex(on ? 0x39ff6a : 0x0c2a12);
  }
}
function bathTick(dt) {                          // a bowl drains and refills after a flush; a running tap's stream shimmers
  for (const f of bath.flushers) if (f.flushT > 0) {
    f.flushT = Math.max(0, f.flushT - dt); const t = 6 - f.flushT;
    if (f.water) {
      f.water.position.y = f.waterY - 0.07 * (t < 1.3 ? t / 1.3 : Math.max(0, 1 - (t - 1.3) / 3.8));
      f.water.rotation.z += dt * (t < 2.5 ? 5 : 0);   // swirl
    }
  }
  for (const s of bath.sinks) if (s.tap) s.stream.scale.set(1 + Math.sin(clockT * 40) * 0.08, 1, 1 + Math.cos(clockT * 37) * 0.08);
}

// ---------------- moving things around the counter ----------------
// The rewinders, the desensitizer and the receipt printer can be rearranged:
// hold E on one to pick it up, and a see-through copy follows your aim over
// the worktop (it only shows where it could actually sit: on the counter,
// behind the ledge, clear of the register and everything else; red if it
// won't fit). The wheel turns it, a click sets it down, right-click puts it
// back where it was, and walking off puts it back too
const cmove = { item: null, ghost: null, ry: 0, spot: null, ok: false, from: null };
let counterItems = null, eHoldMove = null;
const ghostOk = new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.42, depthWrite: false });
const ghostBad = new THREE.MeshBasicMaterial({ color: 0xff5a5a, transparent: true, opacity: 0.38, depthWrite: false });
function footprint(g) {                          // its outline on the worktop, in its own frame
  g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), b = new THREE.Box3(), mb = new THREE.Box3(), m4 = new THREE.Matrix4();
  g.traverse(o => { if (!o.isMesh || o === printer.strip) return; if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); b.union(mb.copy(o.geometry.boundingBox).applyMatrix4(m4.multiplyMatrices(inv, o.matrixWorld))); });
  return { cx: (b.min.x + b.max.x) / 2, cz: (b.min.z + b.max.z) / 2, hx: (b.max.x - b.min.x) / 2 + 0.005, hz: (b.max.z - b.min.z) / 2 + 0.005 };
}
function counterItemsList() {
  if (counterItems) return counterItems;
  const reg = (id, name, g) => { const it = { id, name, g, fp: footprint(g) }; g.traverse(o => { if (o.isMesh) o.userData.movable = it; }); return it; };
  counterItems = [...rewinders.map((rw, i) => reg(`rewinder${i}`, "rewinder", rw.g)), reg("desens", "desensitizer", COUNTER.groups.desens), reg("printer", "receipt printer", COUNTER.groups.printer)];
  counterItems.fixed = [COUNTER.groups.register, COUNTER.groups.notepad].map(g => ({ g, fp: footprint(g) }));   // (the register and its keyboard, the post-its: they stay put)
  return counterItems;
}
function obb(fp, x, z, ry) {                     // that outline placed in the world: center, axes, half-sizes
  const c = Math.cos(ry), s = Math.sin(ry), ux = [c, -s], uz = [s, c];
  return { x: x + fp.cx * c + fp.cz * s, z: z - fp.cx * s + fp.cz * c, ux, uz, hx: fp.hx, hz: fp.hz };
}
const obbOf = it => obb(it.fp, it.g.position.x, it.g.position.z, it.g.rotation.y);
function obbHit(a, b) {                          // separating axis test, in plan
  const dx = b.x - a.x, dz = b.z - a.z;
  for (const [ax, az] of [a.ux, a.uz, b.ux, b.uz]) {
    const ra = a.hx * Math.abs(a.ux[0] * ax + a.ux[1] * az) + a.hz * Math.abs(a.uz[0] * ax + a.uz[1] * az);
    const rb = b.hx * Math.abs(b.ux[0] * ax + b.ux[1] * az) + b.hz * Math.abs(b.uz[0] * ax + b.uz[1] * az);
    if (Math.abs(dx * ax + dz * az) > ra + rb) return false;
  }
  return true;
}
const onTop = (x, z) => COUNTER.tops.some(t => x >= t.x0 && x <= t.x1 && z >= t.z0 && z <= t.z1);
function fits(it, x, z, ry) {                    // all of it on the worktop, and not into anything else
  const o = obb(it.fp, x, z, ry);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) if (!onTop(o.x + o.ux[0] * o.hx * sx + o.uz[0] * o.hz * sz, o.z + o.ux[1] * o.hx * sx + o.uz[1] * o.hz * sz)) return false;
  return ![...counterItemsList().filter(k => k !== it && k.g.visible), ...counterItems.fixed].some(k => obbHit(o, obbOf(k)));
}
function ghostOf(g) {                             // a see-through copy (visible parts only; the receipt strip stays home)
  const copy = o => {
    if (o.isMesh && !o.visible) return null;
    const c = o.isMesh ? new THREE.Mesh(o.geometry, ghostOk) : new THREE.Group();
    c.position.copy(o.position); c.rotation.copy(o.rotation); c.scale.copy(o.scale);
    for (const ch of o.children) if (ch !== printer.strip) { const k = copy(ch); if (k) c.add(k); }
    return c;
  };
  return copy(g);
}
function moveStart(it) {
  if (co && (it.id === "desens" || it.id === "printer")) { toast("Not in the middle of a checkout"); return; }
  cmove.item = it; cmove.ry = it.g.rotation.y; cmove.from = { x: it.g.position.x, z: it.g.position.z, ry: it.g.rotation.y, px: player.x, pz: player.z };
  cmove.ghost = ghostOf(it.g); cmove.ghost.visible = false; scene.add(cmove.ghost);
  cmove.wheel = 0;
  it.g.visible = false; cmove.spot = null; cmove.ok = false;
}
function moveTick() {                            // each frame while carrying one: where would it go?
  if (!cmove.item) return;
  if (Math.hypot(player.x - cmove.from.px, player.z - cmove.from.pz) > 3) return moveCancel(`You walked off: the ${cmove.item.name}'s back where it was`);
  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  const r = raycaster.ray, t = r.direction.y < -0.02 ? (COUNTER.y - r.origin.y) / r.direction.y : -1;
  const x = r.origin.x + r.direction.x * t, z = r.origin.z + r.direction.z * t;
  if (t < 0 || t > 2.6 || !onTop(x, z)) { cmove.spot = null; cmove.ghost.visible = false; return; }   // not aiming at the worktop: no ghost
  cmove.spot = { x, z }; const ok = fits(cmove.item, x, z, cmove.ry);
  if (ok !== cmove.ok) { cmove.ok = ok; cmove.ghost.traverse(o => { if (o.isMesh) o.material = ok ? ghostOk : ghostBad; }); }
  cmove.ghost.visible = true; cmove.ghost.position.set(x, COUNTER.y + 0.002, z); cmove.ghost.rotation.set(0, cmove.ry, 0);
}
function moveEnd() { cmove.item.g.visible = true; cmove.ghost.removeFromParent(); cmove.item = cmove.ghost = cmove.spot = null; }   // (from wherever it is: in the first seconds roomSort files new things into room groups)
function movePlace() {                           // click: set it down (if it fits)
  if (!cmove.spot) { toast("Aim at a free spot on the counter"); return; }
  if (!cmove.ok) { toast("It won't fit there"); return; }
  const it = cmove.item; it.g.position.set(cmove.spot.x, COUNTER.y, cmove.spot.z); it.g.rotation.y = cmove.ry;
  moveEnd(); counterMoved(it);
}
function moveCancel(msg) { if (!cmove.item) return; moveEnd(); if (msg) toast(msg); }   // right-click / walked off: it never left
function counterMoved(it) {                       // everything that depends on where it sits follows it
  it.g.updateMatrixWorld(true);
  if (it.id === "desens") { DESENS_AT.x = it.g.position.x; DESENS_AT.z = it.g.position.z; }
  if (it.id === "printer") { const v = new THREE.Vector3(0, 0.091, -0.028).applyMatrix4(it.g.matrixWorld); PRN_AT.x = v.x; PRN_AT.z = v.z; }
}
function staffSpotFor(x, z) {                     // where you'd stand behind the counter to reach something at x/z
  const top = COUNTER.tops.find(t => x >= t.x0 - 0.05 && x <= t.x1 + 0.05 && z >= t.z0 - 0.05 && z <= t.z1 + 0.05) || COUNTER.tops[1];
  return top.run === "north" ? { x: Math.max(COUNTER.tops[0].x0 + 0.3, Math.min(x, COUNTER.tops[1].staff - 0.1)), z: top.staff, ry: 0 } : { x: top.staff, z, ry: Math.PI / 2 };
}
function rewinderSpot() {                         // Dana's spot for the rewinders: at the free one nearest her (or the first)
  const p = emp.c.group.position, on = rewinders.filter(rw => rw.on), free = on.filter(rw => !rw.tape), pick = (free.length ? free : on).reduce((a, b) => b.g.position.distanceTo(p) < a.g.position.distanceTo(p) ? b : a);
  return staffSpotFor(pick.g.position.x, pick.g.position.z);
}
const onNorthRun = at => COUNTER.tops[0] && at.z >= COUNTER.tops[0].z0 - 0.05 && at.x <= COUNTER.tops[0].x1;

// ---------------- misshelved tapes ----------------
// A customer putting a tape back sometimes shoves it in wherever they're
// standing: it sits crooked, sticking out of the shelf, until someone puts it
// in its own slot (E to pick it up, then put it back as usual). Dana does
// them as part of the returns
const strays = [];                               // { copy, mesh }
function misshelve(copy, spot, at = null) {
  const near = at || spot?.copies?.find(c => !c.offShelf && c !== copy) || copy;
  const nx = Math.cos(near.ry), nz = -Math.sin(near.ry);
  const m = new THREE.Mesh(new THREE.BoxGeometry(TAPE.w, TAPE.h, TAPE.d), copy.sideMat || mat.tapeBody);
  m.position.set(near.pos.x + nx * 0.07, near.pos.y + 0.02, near.pos.z + nz * 0.07); m.rotation.set(0, near.ry, 0.4);   // crooked, half out of the row
  m.userData.stray = copy; scene.add(m);
  strays.push({ copy, mesh: m, at: near });
}
function strayTake(s) {                          // off the shelf and into a hand
  s.mesh.removeFromParent(); strays.splice(strays.indexOf(s), 1);
}
// ---------------- messes ----------------
// Litter from customers (a wrapper, spilled popcorn), cups left in the
// theater. E cleans one up; Dana does too when things are quiet. A messy store
// puts customers off
const messes = [];                               // { kind, mesh, x, y, z }
const MESS_TOOL = { spill: "mop", popcorn: "sweeper", puddle: "mop", vomit: "mop" };
const messCan = o => !MESS_TOOL[o.kind] || MESS_TOOL[o.kind] === toolHeld;   // do you have what it takes, in hand?   // messes that want a tool from the janitor's closet (staff just see to it)
const MESS = {
  spill: { label: "spilled soda", make: () => { const g = new THREE.Group(), m = new THREE.MeshLambertMaterial({ color: 0x4a2410, transparent: true, opacity: 0.85, depthWrite: false });
    for (let i = 0; i < 4; i++) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.07 + Math.random() * 0.1, 18), m); d.rotation.x = -Math.PI / 2; d.position.set((Math.random() - 0.5) * 0.25, 0.002 + i * 0.0005, (Math.random() - 0.5) * 0.25); g.add(d); }
    return g; } },
  puddle: { label: "puddle by the door", make: () => { const g = new THREE.Group(), m = new THREE.MeshPhongMaterial({ color: 0x9fb0c2, transparent: true, opacity: 0.5, depthWrite: false, specular: 0xffffff, shininess: 90 });
    for (let i = 0; i < 5; i++) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.08 + Math.random() * 0.14, 18), m); d.rotation.x = -Math.PI / 2; d.position.set((Math.random() - 0.5) * 0.4, 0.002 + i * 0.0005, (Math.random() - 0.5) * 0.4); g.add(d); }
    return g; } },
  wrapper: { label: "candy wrapper", make: () => new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.006, 0.05), new THREE.MeshLambertMaterial({ color: [0xd23b3b, 0x3b7bd2, 0xe0b020][Math.floor(Math.random() * 3)] })) },
  popcorn: { label: "spilled popcorn", make: () => { const g = new THREE.Group(), m = new THREE.MeshLambertMaterial({ color: 0xf6e7a8 });
    for (let i = 0; i < 14; i++) { const k = new THREE.Mesh(new THREE.IcosahedronGeometry(0.018, 0), m); k.position.set((Math.random() - 0.5) * 0.35, 0.012, (Math.random() - 0.5) * 0.35); g.add(k); } return g; } },
  towel: { label: "paper towel", make: () => { const t = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035, 0), new THREE.MeshLambertMaterial({ color: 0xf6f3ea })); t.position.y = 0.03; t.rotation.set(1, 2, 0); return t; } },
  vomit: { label: "puke", make: () => { const g = new THREE.Group(), m = new THREE.MeshLambertMaterial({ color: 0xb59a3c, transparent: true, opacity: 0.92, depthWrite: false }), b = new THREE.MeshLambertMaterial({ color: 0x8a6a2a });
    for (let i = 0; i < 5; i++) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.06 + Math.random() * 0.12, 16), m); d.rotation.x = -Math.PI / 2; d.position.set((Math.random() - 0.5) * 0.35, 0.002 + i * 0.0005, (Math.random() - 0.5) * 0.35); g.add(d); }
    for (let i = 0; i < 9; i++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.012, 0), b); c.position.set((Math.random() - 0.5) * 0.3, 0.006, (Math.random() - 0.5) * 0.3); c.scale.y = 0.5; g.add(c); }   // (chunks)
    return g; } },
  cup: { label: "empty cup", make: () => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.14, 12), new THREE.MeshLambertMaterial({ color: 0xd9d9d9 })); c.rotation.z = Math.PI / 2; c.position.y = 0.045; return c; } },
};
// ---- the janitor's closet at work: a tool in hand (one at a time), and the ceiling lights that burn out ----
let toolHeld = null;
const toolHand = new THREE.Group();
const aimOn = (g, on) => g.traverse(o => { if (!o.isMesh) return; const i = aimables.indexOf(o); if (on && i < 0) aimables.push(o); if (!on && i >= 0) aimables.splice(i, 1); });
function toolTake(id) {
  const t = TOOLS[id]; toolHeld = id;
  t.g.visible = false; aimOn(t.g, false); aimOn(t.home, true);
  if (t.col) colliders.splice(colliders.indexOf(t.col), 1);
  const c = t.g.clone(); c.visible = true;
  if (t.hold) {                                   // the mop / sweeper: out in the world, its head on the floor in front of you (toolTick)
    c.getObjectByName("mopStrands")?.scale.setScalar(1);   // (out of the bucket: the strands flop out)
    scene.add(c); t.held = c; toolSnap = true; return;
  }
  if (!toolHand.parent) camera.add(toolHand);
  toolHand.clear(); c.position.set(...t.hand[0]); c.rotation.set(...t.hand[1]); toolHand.add(c);
}
function toolReturn() {
  const t = TOOLS[toolHeld]; toolHeld = null; scrub = null;
  t.g.visible = true; aimOn(t.g, true); aimOn(t.home, false);
  if (t.col) colliders.push(t.col);
  toolHand.clear(); if (t.held) { t.held.removeFromParent(); t.held = null; me.reachTo(null); me.reachAlso(null); }
}
// the mop or sweeper in your hands: its business end on the floor out in front of you, a bit to the right, the
// handle back up to your hands (the mop: left hand on top, right hand lower down; the sweeper: one hand on the grip).
// E on a mess with it walks you up to it and works it over: the mop side to side, the sweeper up and back in passes
let scrub = null, toolSnap = false;              // scrub: { m (the mess), t, dur }
const toolF = new THREE.Vector3(), toolA = new THREE.Vector3(), toolLast = new THREE.Vector3(), toolV = new THREE.Vector3(), toolSh = new THREE.Vector3();
function scrubStart(m) {
  scrub = { m, t: 0, dur: toolHeld === "mop" ? 2.4 : 2.1, n: m.mesh.children.length };
}
function scrubEnd() {
  const m = scrub.m; scrub = null;
  if (!messes.includes(m)) return;               // somebody beat you to it
  messClean(m);
  if (has("you", "con", 10)) for (const o of messes.filter(o => messCan(o) && Math.hypot(o.x - m.x, o.z - m.z) < 3)) messClean(o);   // Neat Freak: sweep up around it too
}
function toolTick(dt) {
  const t = toolHeld && TOOLS[toolHeld], g = t?.held;
  if (!g) return;
  const away = seated || onStool;                // sat down: it waits, out of sight, till you're up again
  g.visible = !away;
  if (away) { me.reachTo(null); me.reachAlso(null); toolSnap = true; return; }
  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw), rx = -fz, rz = fx;   // your forward, your right
  const bx = player.x - fx * 0.21, bz = player.z - fz * 0.21, y0 = floorHeightAt(player.x, player.z);   // your body (it stands behind the eye)
  const { foot: fr, hand: [hr, hy0, hf] } = t.hold, pole = g.getObjectByName("toolPole");
  const hy = hy0 - (keys.has("KeyC") ? 0.5 : 0), rise = hy - pole.position.y, run = (pole.userData.L - 0.06) ** 2 - rise * rise;
  const ff = hf + Math.sqrt(Math.max(0.04, run));   // the head out just as far as puts the top of the handle in your hand
  let cr = fr, cf = ff, ar = hr, af = hf;        // the head and the top hand, in your frame (right, forward)
  if (scrub) {
    const s = scrub, m = s.m;
    if (!messes.includes(m)) scrub = null;
    else {
      s.t += dt;
      let dx = m.x - bx, dz = m.z - bz, d = Math.hypot(dx, dz);
      if (d - ff > 0.03) {                       // too far to reach: step up to it
        const k = Math.min(d - ff, dt * 2.2) / d, nx = player.x + dx * k, nz = player.z + dz * k;
        if (!blocked(nx, nz)) { player.x = nx; player.z = nz; }
      }
      const w = Math.min(1, s.t / 0.3, Math.max(0, s.dur - s.t) / 0.3);   // eased into the work and out of it
      let u, v;
      if (toolHeld === "mop") { const a = s.t * Math.PI * 2 / 0.8; u = Math.sin(a) * 0.26; v = Math.sin(2 * a) * 0.05; }   // side to side, a lazy figure eight
      else { const a = s.t * Math.PI * 2 / 0.7; u = Math.sin(a * 0.3) * 0.1; v = Math.sin(a) * 0.3; }                       // up and back, edging across a row each pass
      const mr = dx * rx + dz * rz, mf = dx * fx + dz * fz;
      cr += (mr + u * w - cr) * w; cf += (mf + v * w - cf) * w;
      ar += u * 0.35 * w; af += v * 0.4 * w;     // the hands go with it, a little
      const k = Math.min(1, s.t / (s.dur * 0.85));   // and the mess goes as it's worked over
      if (m.kind === "popcorn") m.mesh.children.forEach((o, i) => { o.visible = (i + 1) / (s.n + 1) > k; });
      else m.mesh.scale.set(1 - 0.9 * k, 1, 1 - 0.9 * k);
      if (s.t >= s.dur) scrubEnd();
    }
  }
  toolV.set(bx + rx * cr + fx * cf, 0, bz + rz * cr + fz * cf); toolV.y = floorHeightAt(toolV.x, toolV.z);
  if (toolSnap) { toolF.copy(toolV); toolLast.copy(toolV); toolSnap = false; }
  else toolF.lerp(toolV, Math.min(1, dt * (scrub ? 20 : 12)));   // walking, it trails a touch behind you
  toolA.set(bx + rx * ar + fx * af, y0 + hy, bz + rz * ar + fz * af);
  const p = toolPose(g, toolF, toolA);
  const top = toolV.copy(p.P).addScaledVector(p.dir, p.len);
  if (toolHeld === "mop") {                      // left hand on top, the right lower down: wherever on the handle it's nearest the shoulder
    me.reachAlso(top, 1);
    me.rig.arms[0].sh.getWorldPosition(toolSh).sub(p.P);
    const along = Math.max(p.len * 0.45, Math.min(p.len * 0.85, toolSh.dot(p.dir)));
    me.reachTo(toolSh.copy(p.P).addScaledVector(p.dir, along), 0);
  } else me.reachTo(top, 0);
  // the sweeper's wheels roll with it
  const moved = toolLast.distanceTo(toolF), dir = (toolF.x - toolLast.x) * Math.sin(g.getObjectByName("toolHead").rotation.y) + (toolF.z - toolLast.z) * Math.cos(g.getObjectByName("toolHead").rotation.y);
  if (moved > 1e-5) g.traverse(o => { if (o.name === "sweeperWheel") o.rotation.x += Math.sign(dir) * moved / 0.017; });
  toolLast.copy(toolF);
}
// ---- the step ladder at work (see `ladder`) ----
const ladderTint = new THREE.Color();
function ladderTintTo(c) {
  ladderTint.set(c);
  for (const m of ladder.mats) { m.userData.baseColor ??= m.color.clone(); m.color.copy(m.userData.baseColor).multiply(ladderTint); }
}
const handsFull = () => toolHeld || boxCarry.length || bagCarry.length || cutout.carried || stool.carried || cmove.item;
function ladderPickUp() {
  if (handsFull()) { toast(toolHeld ? `Put the ${TOOLS[toolHeld].label} back first` : "Your hands are full"); return; }
  const L = ladder;
  if (L.state === "placed") { colliders.splice(colliders.indexOf(L.box), 1); L.last = { x: L.x, z: L.z, ry: L.ry }; }
  else { colliders.splice(colliders.indexOf(L.stowBox), 1); L.last = null; }
  L.state = "carried"; L.open(1);
}
function ladderPutDown() {
  const L = ladder; if (!L.spot) return;
  Object.assign(L, { x: L.spot.x, z: L.spot.z, ry: L.spot.ry, state: "placed", spot: null });
  ladderTintTo(0xffffff); colliders.push(ladderFit(L.x, L.z, L.ry, L.box)); ladderPose();
}
function ladderStore() {                         // folded and leaned back against the closet wall
  Object.assign(ladder, { state: "stored", spot: null, last: null }); ladderTintTo(0xffffff); colliders.push(ladder.stowBox); ladderPose();
}
function ladderStep() {                          // the top step, in the world: where you stand on it
  const d = (LADDER.TOP - LADDER.STEP) * Math.tan(LADDER.aF) + 0.03;
  return { x: ladder.x + Math.sin(ladder.ry) * d, z: ladder.z + Math.cos(ladder.ry) * d };
}
function ladderClimb() {
  if (handsFull()) { toast(toolHeld ? `Put the ${TOOLS[toolHeld].label} back first: you'll want both hands` : "Your hands are full"); return; }
  const L = ladder, p = ladderStep();
  L.from = { x: player.x, z: player.z }; player.x = p.x; player.z = p.z; L.on = true; L.lift = 0;
  player.yaw = L.ry + Math.PI; player.pitch = 0.5;   // facing the ladder, looking up
}
function ladderDown() {                          // step off the front, or off to a side, or back where you came from
  const L = ladder; L.on = false; L.fix = null; me.reachTo(null); me.reachAlso(null);
  for (const da of [0, 0.8, -0.8, 1.6, -1.6]) {
    const a = L.ry + da, x = L.x + Math.sin(a) * 0.95, z = L.z + Math.cos(a) * 0.95;
    if (!blocked(x, z)) { player.x = x; player.z = z; player.pitch = 0; return; }
  }
  player.x = L.from.x; player.z = L.from.z; player.pitch = 0;
}
const ladderV = new THREE.Vector3();
function ladderTick(dt) {
  const L = ladder;
  if (L.state === "carried") {                   // out in front of you, steps toward you, just off the floor
    const s = carrySpotAhead(LADDER.CARRY_D, (x, z, ry) => ladderFit(x, z, ry, {}));
    L.spot = s.ok ? s : null;
    L.g.position.set(s.x, floorHeightAt(s.x, s.z) + 0.06, s.z); L.g.rotation.set(0, s.ry, 0);
    ladderTintTo(s.ok ? 0xffffff : 0xff5a5a);
  }
  if (!L.on) return;
  L.lift = Math.min(1, L.lift + dt * 1.6);       // up the steps
  if (L.fix) {                                   // both hands up on the panel: the old tube out, a new one in
    const f = L.fix, tr = TROFFERS[f.d.i]; f.t += dt;
    const sway = Math.sin(f.t * 6) * 0.04;
    me.reachTo(ladderV.set(tr.x + 0.18 + sway, tr.y - 0.02, tr.z), 0, { lean: false });
    me.reachAlso(ladderV.set(tr.x - 0.18 - sway, tr.y - 0.02, tr.z), 1);
    if (f.t >= 1.8) { L.fix = null; me.reachTo(null); me.reachAlso(null); if (deadLights.includes(f.d)) lightFix(f.d); }
  }
}
const deadLights = [];                            // { i (into TROFFERS), mesh, t (still flickering) }
const deadMat = new THREE.MeshBasicMaterial({ color: 0x1d2026 });
function lightDie(i, flicker = 4) {               // a tube goes: a few seconds' flicker, then a dark panel
  const tr = TROFFERS[i]; if (!tr || deadLights.some(d => d.i === i)) return;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(CEIL_TILE.x - 0.02, CEIL_TILE.z - 0.02), deadMat);
  m.rotation.x = Math.PI / 2; m.position.set(tr.x, tr.y - 0.004, tr.z); scene.add(m);
  const d = { i, mesh: m, t: flicker }; m.userData.deadLight = d; aimables.push(m); deadLights.push(d);
  if (flicker) logAct("A ceiling light just went out: the step ladder's in the janitor's closet", "bad");
}
function lightFix(d) {
  d.mesh.removeFromParent(); aimables.splice(aimables.indexOf(d.mesh), 1); deadLights.splice(deadLights.indexOf(d), 1);
  shiftScore(10, "you"); gainXp("you", "con", 4); gainXp("you", "str", 2);
  logAct("Up the ladder: swapped the tube in a burnt-out light", "good", null, 10);
}
function deadLightTick(dt) {
  for (const d of deadLights) if (d.t > 0) { d.t -= dt; d.mesh.visible = d.t <= 0 || Math.random() < 0.5; }
  if (shiftOpen() && deadLights.length < 3 && TROFFERS.length && Math.random() < dt / 2400) lightDie(Math.floor(Math.random() * TROFFERS.length));   // one every couple of shifts
}
function messAdd(kind, x, z, y = floorHeightAt(x, z)) {
  if (messes.length >= 20) return;
  const mesh = MESS[kind].make(); mesh.position.set(x, y + 0.005 + (mesh.position.y || 0), z); mesh.rotation.y = Math.random() * 6.28;
  const m = { kind, mesh, x, y, z }; mesh.traverse(o => { if (o.isMesh) { o.userData.mess = m; aimables.push(o); } }); if (mesh.isMesh) { mesh.userData.mess = m; }
  scene.add(mesh); messes.push(m);
}
function messClean(m, by = "you") {
  m.mesh.removeFromParent(); m.mesh.traverse(o => { const i = aimables.indexOf(o); if (i >= 0) aimables.splice(i, 1); });
  messes.splice(messes.indexOf(m), 1);
  shiftScore(15, by); gainXp(by, "con", 6); logAct(`${by === "dana" ? `${emp.first} cleaned` : "Cleaned"} up the ${MESS[m.kind].label}`, "good", null, 15);
  trashAdd(binNear(m.x, m.z), 1, false);          // (it goes in the nearest bin)
}

// ---------------- trash: bins fill up, the bags go down the chute ----------------
// The bins: the lobby receptacle and the theater lobby's (they fill with the customers: the busier the
// store, the faster), the break room can (the staff's lunches), the counter's and the restrooms'
// wastebaskets (paper towels). A full one spills onto the floor. E on a bin ties
// off the bag and puts in a fresh liner; carry up to two to the chute in the
// break room (right-click sets them down). Bins over 3/4 full and bags left
// lying about count against the closing check, and customers notice an
// overflowing bin like any other mess. The staff do it too, under CLEANUP.
const bagMax = () => has("you", "str", 5) ? 3 : 2;   // one in each hand (Strong Grip: a third hugged in front)
const bagCarry = [];                              // in your hands: { bin, n, mesh }
const bagsDown = [];                              // set down somewhere: { bin, n, mesh, x, z, claim }
const bagHand = new THREE.Group();
const binList = () => Object.values(trashBins);
const binFull = b => b.n >= b.cap;
const binNear = (x, z) => z < STORE.z ? trashBins.lobby : x < BOH.x0 || z > BOH.z1 ? trashBins.theater : x < BOH.rrX ? trashBins.restroomF : x < BOH.splitX ? trashBins.restroom : trashBins.breakroom;
const unaim = o => o.traverse(m => { const i = aimables.indexOf(m); if (i >= 0) aimables.splice(i, 1); });
for (const b of binList()) {
  b.n = Math.min(b.cap, SAVE?.trash?.bins?.[b.id] ?? Math.floor(b.cap * 0.3 * Math.random())); b.acc = 0;
  if (!b.closed) {                                // open-top: a heap of crumpled paper that rises with the fill
    b.heap = new THREE.Group(); b.heap.position.set(b.x, 0, b.z); scene.add(b.heap);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(b.r * 0.97, 20), new THREE.MeshLambertMaterial({ color: b.liner })); disc.rotation.x = -Math.PI / 2; b.heap.add(disc);
    const colors = b.towels ? [0xf6f3ea] : [0xf2f0ea, 0xe8e2d0, 0xc23a32, 0x7a5434, 0xe0b020, 0x3b7bd2];
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4, rr = (i ? 0.35 + 0.5 * Math.random() : 0) * b.r * 0.75, sz = b.r * (0.22 + Math.random() * 0.12);
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(sz, 0), new THREE.MeshLambertMaterial({ color: colors[i % colors.length] }));
      m.position.set(Math.cos(a) * rr, sz * 0.6 + (i % 3) * sz * 0.4, Math.sin(a) * rr); m.rotation.set(Math.random() * 3, Math.random() * 3, 0); b.heap.add(m);
    }
    b.heap.traverse(o => { if (o.isMesh) b.parts.push(o); });
  }
  for (const o of b.parts) { o.userData.trashBin = b; if (!aimables.includes(o)) aimables.push(o); }
  binShow(b);
}
function binShow(b) {                             // how full it looks
  const f = Math.min(1, b.n / b.cap);
  if (b.heap) { b.heap.visible = b.n > 0; b.heap.position.y = 0.02 + (b.rimY - 0.07) * f; }
  if (b.over) { b.over.visible = f >= 0.85; trashFlapRest = f >= 0.85 ? -0.28 : 0; if (trashFlapT <= 0) trashFlap.rotation.x = trashFlapRest; }   // (pushed out from behind)
}
function trashAdd(b, k = 1, spill = true) {       // something into a bin; a full one spills onto the floor in front of it
  if (!b) return;
  for (let i = 0; i < k; i++) {
    if (b.n < b.cap) { if (++b.n === b.cap && spill) logAct(`The ${b.name} is full: bag it and take it to the chute in the janitor's closet`, "bad"); }
    else if (spill) {
      messAdd(b.towels ? "towel" : Math.random() < 0.6 ? "wrapper" : "cup", b.stand.x + (Math.random() - 0.5) * 0.7, b.stand.z + (Math.random() - 0.5) * 0.3);
      if (!b.spilled) { b.spilled = true; logAct(`The ${b.name} is overflowing onto the floor`, "bad"); }
    }
  }
  binShow(b);
}
function makeBag(b, n) {                          // a tied-off liner (black from the lobby, white from the others): the knot at the origin, the bag hanging below it
  // V2: a pear of thin plastic, sagging wide at the bottom, lumpy with what's in it, pleated where it's gathered up
  // into the neck, the corners tied in a knot (black) or the drawstring pulled into two loops (white kitchen bags)
  const g = new THREE.Group(), f = Math.min(1, n / b.cap), r = (b.id === "lobby" ? 0.2 : b.id === "breakroom" || b.id === "theater" ? 0.17 : 0.12) * (0.75 + 0.25 * f);
  const m = new THREE.MeshPhongMaterial({ color: b.liner, specular: b.id === "lobby" ? 0x8a8a8a : 0x555555, shininess: b.id === "lobby" ? 70 : 35 });
  const prof = [[0.02, 0], [0.55, 0.02], [0.86, 0.1], [1, 0.34], [1.03, 0.62], [0.96, 0.92], [0.78, 1.22], [0.5, 1.52], [0.24, 1.76], [0.09, 1.94], [0.06, 2.04]];   // (radius, height) in r
  const geo = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x * r, (y - 2.04) * r - 0.03)), 22);
  const bumps = Array.from({ length: 5 + Math.floor(f * 4) }, () => [Math.random() * 6.28, 0.15 + Math.random() * 0.75, 0.05 + Math.random() * 0.09]);   // (angle, height 0..1, size): boxes and cups pushing out
  const pa = geo.attributes.position, top = -0.03, H = 2.04 * r;
  for (let i = 0; i < pa.count; i++) {
    const x = pa.getX(i), z = pa.getZ(i), y = pa.getY(i), a = Math.atan2(z, x), h = (y - top + H) / H;   // h: 0 at the bottom, 1 at the neck
    let k = 1 + 0.16 * Math.cos(a * 9) * Math.min(1, Math.max(0, (h - 0.55) / 0.3));                     // pleats, drawn in toward the neck
    for (const [ba, bh, bs] of bumps) { const d = Math.cos(a - ba), e = h - bh; k += bs * Math.max(0, d) ** 6 * Math.exp(-e * e * 30); }
    pa.setX(i, x * k); pa.setZ(i, z * k);
    if (h < 0.08) pa.setY(i, y + (Math.random() - 0.5) * 0.01);                                          // a slumped, uneven bottom
  }
  geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, m));
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), m); knot.position.y = -0.015; g.add(knot);   // the knot
  if (b.id === "lobby") for (const sx of [-1, 1]) {                                                  // the two tied corners, flopped over
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.085, 6), m); ear.scale.z = 0.35; ear.position.set(sx * 0.03, 0.012, 0); ear.rotation.z = -sx * 1.15; g.add(ear);
  } else {
    const tie = new THREE.MeshLambertMaterial({ color: 0xc8322c });                                      // the red drawstring, pulled up into two loops
    for (const sx of [-1, 1]) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0035, 4, 14, Math.PI * 1.2), tie); l.position.set(sx * 0.012, 0.005, 0); l.rotation.set(0, sx * 0.35, Math.PI * -0.1 + (sx > 0 ? 0 : Math.PI * 0.2)); g.add(l); }
  }
  g.userData.r = r; return g;
}
function bagTie(b) {                              // -> the bag out of a bin (and a fresh liner in)
  const bag = { bin: b, n: b.n, mesh: makeBag(b, b.n) };
  b.n = 0; b.acc = 0; b.spilled = false; binShow(b); window.StoreAmbience?.bag(b.x, 0.5, b.z);
  return bag;
}
function bagHandShow() {                          // in your hands, hanging at your sides: one each side, a third in the right hand with the first
  if (!bagHand.parent) me.group.add(bagHand);     // (the body's group: a mover, never filed into a room)
  bagHand.clear();
  bagCarry.forEach(g => { g.sw = { a: 0, va: 0, b: 0, vb: 0 }; bagHand.add(g.mesh); });
}
const bagHandW = new THREE.Vector3(), bagHandV = [new THREE.Vector3(), new THREE.Vector3()], bagHandWas = [new THREE.Vector3(), new THREE.Vector3()];
function bagTick(dt) {                            // after the body's animated: each bag hangs from its hand, swinging (a damped pendulum) as the hand swings and you walk
  if (!bagCarry.length || !dt) return;
  const arms = me.rig.arms;
  for (let i = 0; i < 2; i++) if (bagCarry.some((_, j) => j % 2 === i)) arms[i].sh.rotation.z += i ? 0.2 : -0.2;   // arms held out a little, to clear the legs
  me.group.updateMatrixWorld(true);
  const ry = me.group.rotation.y, c = Math.cos(ry), sn = Math.sin(ry);
  const accs = [0, 1].map(i => {                  // each hand's acceleration, world (a jump, like picking them up, counts as none)
    const p = arms[i].hand.getWorldPosition(bagHandW), v = p.clone().sub(bagHandWas[i]).divideScalar(dt);
    if (v.length() > 12) v.set(0, 0, 0);
    const acc = v.clone().sub(bagHandV[i]).divideScalar(dt); bagHandWas[i].copy(p); bagHandV[i].copy(v); return acc;
  });
  bagCarry.forEach((g, j) => {
    const i = j % 2, acc = accs[i], hand = arms[i].hand.getWorldPosition(bagHandW);
    const af = acc.x * sn + acc.z * c, as = acc.x * c - acc.z * sn;                                   // in the body's frame: forward (+z), to its left (+x)
    const L = 0.3, sw = g.sw, lim = 0.6;
    sw.va += (-9.8 / L * Math.sin(sw.a) - 3 * sw.va + Math.max(-30, Math.min(30, af)) / L) * dt; sw.a = Math.max(-lim, Math.min(lim, sw.a + sw.va * dt));   // pushed forward, it swings back
    sw.vb += (-9.8 / L * Math.sin(sw.b) - 3 * sw.vb - Math.max(-30, Math.min(30, as)) / L) * dt; sw.b = Math.max(-lim, Math.min(lim, sw.b + sw.vb * dt));
    me.group.worldToLocal(hand); g.mesh.position.set(hand.x + (j > 1 ? 0.05 : 0), hand.y - 0.03 - (j > 1 ? 0.04 : 0), hand.z + (j > 1 ? -0.04 : 0));
    g.mesh.rotation.set(sw.a, j * 1.3, sw.b, "ZXY");
  });
}
function binBag(b) {                              // E on a bin
  if (!b.n) { toast(`The ${b.name} is empty`); return; }
  if (bagCarry.length >= bagMax()) { toast("Hands full: take these to the chute first"); return; }
  bagCarry.push(bagTie(b)); bagHandShow();
  shiftScore(5, "you"); gainXp("you", "con", 3);
}
function bagPlace(bin, n, x, z) {                 // a bag on the floor
  const g = { bin, n, mesh: makeBag(bin, n), x, z, claim: null };
  g.mesh.position.set(x, floorHeightAt(x, z) + g.mesh.userData.r * 2.35 + 0.05, z); g.mesh.rotation.y = Math.random() * 6.28;
  g.mesh.traverse(o => { if (o.isMesh) { o.userData.trashBag = g; aimables.push(o); } });
  scene.add(g.mesh); bagsDown.push(g); return g;
}
function bagsSetDown() {                          // right-click: at your feet, either side
  bagCarry.splice(0).forEach((g, i) => {
    g.mesh.removeFromParent();
    const side = (i ? -1 : 1) * 0.22, x = player.x + Math.cos(player.yaw) * side, z = player.z - Math.sin(player.yaw) * side;
    bagPlace(g.bin, g.n, x, z);
  });
}
function bagPickUp(g) {                           // E on one on the floor
  if (bagCarry.length >= bagMax()) { toast("Hands full"); return; }
  bagsDown.splice(bagsDown.indexOf(g), 1); g.mesh.removeFromParent(); unaim(g.mesh);
  g.mesh = makeBag(g.bin, g.n); bagCarry.push(g); bagHandShow();
}
function chuteUse(n) { chute.t = 1.3; window.StoreAmbience?.chute(...chute.at, n); }   // the hopper door: down, (bags in), back up
function chuteDrop() {                            // E on the chute
  const n = bagCarry.length; chuteUse(n);
  if (!n) return;                                 // (just a look down it)
  bagCarry.splice(0).forEach(g => g.mesh.removeFromParent());
  shiftScore(10 * n, "you"); gainXp("you", "str", 3 * n); gainXp("you", "con", 2 * n);
  logAct(`Took ${n === 1 ? "a bag" : `${n} bags`} of trash down the chute`, "good", null, 10 * n);
}
// the staff: the fullest bin over 60% (or a bag someone left on the floor), then the chute
const trashJob = () => bagsDown.find(g => !g.claim) || binList().filter(b => !b.claim && b.n >= b.cap * 0.6).sort((a, b) => b.n / b.cap - a.n / a.cap)[0] || null;
const TRASH_STATES = ["toBin", "bagging", "toBag", "bagLift", "toChute", "chuting"];
function empTrashStart(t) {
  emp.trash = { t, bag: null }; t.claim = emp; emp.c.setMood("neutral");
  if (t.mesh) empGo("toBag", { x: t.x + 0.45, z: t.z, ry: -Math.PI / 2 }); else empGo("toBin", t.stand);
}
function empToChute() {
  const g = emp.trash.bag; g.mesh.position.set(0, 0, 0); g.mesh.rotation.set(0, 0, 0); g.mesh.scale.setScalar(1);
  emp.c.holdItem(g.mesh); emp.c.setPose("idle"); emp.c.reachTo(null);
  empGo("toChute", chute.stand);
}
function trashTick(dt) {
  if (shift.h < SHIFT.close && !paused) {          // the day's trash: the customers' through the lobby bin, the staff's lunches, paper towels
    const hrs = dt / SHIFT.hour, inStore = custs.length;
    const rate = { lobby: 0.9 * inStore, breakroom: 0.15 + 0.25 * staff.length, restroom: 0.04 * inStore, restroomF: 0.04 * inStore, theater: owned("theater") ? 0.2 * inStore : 0, counter: 0.06 + 0.04 * staff.length };
    for (const b of binList()) if ((b.acc += hrs * (rate[b.id] || 0)) >= 1) {
      b.acc -= 1; trashAdd(b);
      if (b.id === "lobby" && custs.some(k => k.c && Math.hypot(k.c.group.position.x - b.x, k.c.group.position.z - b.z) < 2)) trashFlapT = 0.5;   // somebody right there: the flap swings
    }
  }
  if (chute.door) {                               // the hopper door: 0.3 s down, held, 0.3 s back up
    if (chute.t > 0) chute.t = Math.max(0, chute.t - dt);
    const e = 1.3 - chute.t; chute.door.rotation.x = chute.t > 0 ? 0.8 * (e < 0.3 ? e / 0.3 : e < 1 ? 1 : (1.3 - e) / 0.3) : 0;
  }
  for (const e of staff) {                        // staff on a trash run: they get the doors, and an interrupted run puts the bag down
    if (!e.trash) continue;
    if (!TRASH_STATES.includes(e.state === "repath" ? e.repath?.state : e.state) || !e.c) {   // (blocked, waiting to repath to the bin or the chute: still on the run)
      const t = e.trash.t; if (t.claim === e) t.claim = null;
      if (e.trash.bag && e.c) { e.c.holdItem(null); const p = e.c.group.position; bagPlace(e.trash.bag.bin, e.trash.bag.n, p.x, p.z); }
      e.trash = null; continue;
    }
    const p = e.c.group.position;
    for (const d of doors) if (!d.push && !d.locked && !d.open && Math.hypot(p.x - (d.alongX ? d.c : d.at), p.z - (d.alongX ? d.at : d.c)) < 1.2) toggleDoor(d);
  }
}

// ---------------- popcorn: box -> scoop -> toppings (optional) -> eat ----------------
// heldPopcorn is { kind: "box", fill: 0-8 handfuls, toppings: [] } or { kind: "kernel" }
// (a single piece, grabbed bare-handed). popcornStep() is the one place the
// sequence rules live: it returns the hover tip for a station part, and with
// apply=true actually performs the step.
let heldPopcorn = null;
const TOPPINGS = { butter: "buttered", salt: "salted", sugar: "sugared" };
const popcornGroup = new THREE.Group();
popcornGroup.position.copy(handGroup.position); popcornGroup.rotation.copy(handGroup.rotation);
camera.add(popcornGroup); popcornGroup.visible = false;
const speckMat = (colors, n, r) => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, map: makeTexture((ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  for (let i = 0; i < n; i++) { ctx.fillStyle = colors[i % colors.length]; ctx.beginPath(); ctx.arc(Math.random() * w, Math.random() * h, r * (0.5 + Math.random()), 0, Math.PI * 2); ctx.fill(); }
}, 256, 256) });
let popMats = null;                          // built on first use (needs popcornKit's texture)
function popcornVisual() {
  popcornGroup.clear();
  const hp = heldPopcorn;
  if (!hp) { popcornGroup.visible = false; $("holdingTag").style.display = "none"; return; }
  if (!popMats) {
    const k = popcornKit;
    popMats = {
      plain: new THREE.MeshLambertMaterial({ map: k.cornTex }),
      butter: new THREE.MeshLambertMaterial({ map: k.cornTex, color: 0xffcc55, emissive: 0x5a3a00, emissiveIntensity: 0.35 }),
      salt: speckMat(["#ffffff", "#f2f2f2"], 260, 2.2),
      sugar: speckMat(["#ffffff", "#fff4d0", "#e8f6ff"], 180, 3),
      kernel: new THREE.MeshLambertMaterial({ color: 0xfff1c8 }),
      mound: new THREE.SphereGeometry(0.05, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    };
    const kg = new THREE.IcosahedronGeometry(0.012, 1), kp = kg.attributes.position;   // lumpy popped kernel
    for (let i = 0; i < kp.count; i++) kp.setXYZ(i, kp.getX(i) * (0.8 + Math.random() * 0.5), kp.getY(i) * (0.8 + Math.random() * 0.5), kp.getZ(i) * (0.8 + Math.random() * 0.5));
    kg.computeVertexNormals(); popMats.kernelGeo = kg;
  }
  if (hp.kind === "kernel") {
    const m = new THREE.Mesh(popMats.kernelGeo, popMats.kernel); m.position.set(-0.08, 0.1, -0.05); popcornGroup.add(m);
    $("holdingName").textContent = "A piece of popcorn · click to eat";
  } else {
    popcornGroup.add(new THREE.Mesh(popcornKit.cup, popcornKit.cupMat));
    if (hp.fill > 0) {                       // mound shrinks as you eat it
      const h = 0.35 + 0.65 * hp.fill / 8;
      const mound = new THREE.Mesh(popMats.mound, hp.toppings.includes("butter") ? popMats.butter : popMats.plain);
      mound.position.y = 0.06; mound.scale.set(1, h, 1); popcornGroup.add(mound);
      for (const t of ["salt", "sugar"]) if (hp.toppings.includes(t)) {
        const o = new THREE.Mesh(popMats.mound, popMats[t]); o.position.y = 0.06; o.scale.set(1.02, h * 1.02, 1.02); popcornGroup.add(o);
      }
    }
    const tops = hp.toppings.map(t => TOPPINGS[t]).join(", ");
    $("holdingName").textContent = hp.fill ? `Popcorn${tops ? ` — ${tops}` : ""} · click to eat`
      : hp.used ? "Empty popcorn box · refill it or take it to the trash" : "Empty popcorn box";
  }
  popcornGroup.visible = true; $("holdingTag").style.display = "block"; invRender();
}
function popcornStep(what, apply) {
  const hp = heldPopcorn;
  let tip, act = null;
  const full = !hp && inv.length >= INV_MAX;
  const take = v => () => { if (invMakeRoom()) heldPopcorn = v(); };   // stashes whatever's in hand into the inventory first
  if (full && (what === "boxes" || what === "corn")) tip = "Hands full";
  else if (what === "boxes") {
    if (!hp) { tip = "CLICK — take a popcorn box"; act = take(() => ({ kind: "box", fill: 0, toppings: [] })); }
    else tip = hp.kind === "kernel" ? "Eat that piece first (E)" : "You've already got a box";
  } else if (what === "corn") {
    if (!hp) { tip = "CLICK — grab a piece of popcorn"; act = take(() => ({ kind: "kernel" })); }
    else if (hp.kind === "kernel") tip = "Eat that piece first (E)";
    else if (hp.fill === 8) tip = "Your box is full";
    else { tip = hp.fill ? "CLICK — top it off" : "CLICK — scoop popcorn"; act = () => { hp.fill = 8; hp.used = true; }; }
  } else {                                   // salt / sugar / butter
    if (!hp || hp.kind === "kernel") tip = "Grab a popcorn box first";
    else if (!hp.fill) tip = "Scoop some popcorn first";
    else if (hp.toppings.includes(what)) tip = `Already ${TOPPINGS[what]}`;
    else { tip = `CLICK — add ${what}`; act = () => hp.toppings.push(what); }
  }
  if (apply && act) { act(); popcornVisual(); }
  return apply ? !!act : tip;
}
function eatPopcorn() {
  const hp = heldPopcorn;
  biteAnim = 0.4; biteGroup = popcornGroup; biteDrink = false;
  if (hp.kind === "kernel") heldPopcorn = null;
  else if (hp.fill > 0 && --hp.fill === 0) hp.toppings = [];   // last handful: an empty box, ready for a refill
  popcornVisual();
}
function dropPopcorn() { heldPopcorn = null; popcornVisual(); }

// ---------------- inventory: up to 9 things carried at once ----------------
// Only one is ever "in hand" — it lives in held / heldSnack / heldPopcorn and
// behaves exactly as before. Picking up something else stashes the in-hand
// item here (with its state: bites left, popcorn fill) and a bar of slots
// appears; 1-9 or the mouse wheel swap which one is in hand. When the in-hand
// item leaves (put back, eaten up, trashed, into the TV) the next one comes out.
const INV_MAX = 9;
const inv = [];                              // { kind: "tape"|"snack"|"popcorn"|"item", ref, left?, total?, thumb? } (item: your own things, as a customer)
let invSel = -1;                             // index of the in-hand entry; -1 = empty hand
let invEmpty = -1;                           // which empty slot is selected while the hand is empty (for the outline)
let heldItem = null;                         // one of your own things in hand (customer mode: see ITEMS)
const invKind = () => held ? "tape" : heldSnack ? "snack" : heldPopcorn ? "popcorn" : heldItem ? "item" : null;
function invMakeRoom() {                     // before picking something new up: stash the in-hand item, or refuse at 9
  invSync();                                 // account for anything picked up since the last frame first
  if (inv.length >= INV_MAX) return false;
  invStash(); return true;
}
function invStash() {
  const e = inv[invSel]; if (!e) return;
  if (e.kind === "tape") { held = null; inspecting = false; handGroup.visible = false; }
  else if (e.kind === "snack") { e.left = snackLeft; e.total = snackTotal; e.thumb = invThumb(snackGroup); heldSnack = null; snackGroup.visible = false; snackGroup.clear(); }
  else if (e.kind === "item") heldItem = null;
  else { e.thumb = invThumb(popcornGroup); heldPopcorn = null; popcornGroup.visible = false; }
  $("holdingTag").style.display = "none";
  invSel = -1; peek = null;                  // swapping away from a tape counts as taking it
}
function invSelect(i) {
  invSync();
  if (i === invSel || i < 0 || i >= INV_MAX || biteAnim > 0) return;
  invStash();
  if (!inv[i]) { invEmpty = i; invRender(); return; }   // an empty slot: empty-handed (e.g. to eject a tape without swapping one in)
  const e = inv[i]; invSel = i;
  if (e.kind === "tape") showTape(e.ref);
  else if (e.kind === "snack") { showSnack(e.ref); snackLeft = e.left; snackTotal = e.total; snackTag(); }
  else if (e.kind === "item") { heldItem = e.ref; $("holdingTag").style.display = "block"; $("holdingName").textContent = e.ref.name; }
  else { heldPopcorn = e.ref; popcornVisual(); }
  invRender();
}
function invSync() {                         // once a frame: notice pickups and whatever left your hand
  const kind = invKind(), ref = held || heldSnack || heldPopcorn || heldItem, e = inv[invSel];
  if (e && kind === e.kind) e.ref = ref;     // same item, maybe changed in place (a popcorn refill)
  else if (e) {                              // it's gone: the next one comes to hand
    inv.splice(invSel, 1); const next = Math.min(invSel, inv.length - 1); invSel = -1;
    if (ref) { inv.push({ kind, ref }); invSel = inv.length - 1; }
    else if (next >= 0) invSelect(next);
    invRender();
  } else if (ref) {                          // a fresh pickup
    inv.push({ kind, ref, thumb: kind === "snack" ? invThumb(snackGroup) : kind === "popcorn" ? invThumb(popcornGroup) : kind === "item" ? itemIcon(ref) : null });
    invSel = inv.length - 1; invRender();
  }
}
// slot pictures: a tape shows its cover; snacks and popcorn get a little
// render of the actual in-hand object (a second tiny WebGL canvas, made on first use)
let thumbR = null;
const thumbScene = new THREE.Scene(), thumbCam = new THREE.PerspectiveCamera(30, 1, 0.01, 10);
thumbScene.add(new THREE.AmbientLight(0xffffff, 1.4));
{ const d = new THREE.DirectionalLight(0xffffff, 1.6); d.position.set(1, 2, 3); thumbScene.add(d); }
function invThumb(group) {
  if (!group.children.length) return null;
  try {
    thumbR ||= new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    thumbR.setSize(96, 96, false);
    const o = group.clone(); o.position.set(0, 0, 0); o.rotation.set(0.35, -0.6, 0); o.visible = true;
    thumbScene.add(o);
    const box = new THREE.Box3().setFromObject(o), c = box.getCenter(new THREE.Vector3()), r = box.getSize(new THREE.Vector3()).length() / 2;
    thumbCam.position.set(c.x, c.y, c.z + r / Math.tan(THREE.MathUtils.degToRad(15)) * 1.05); thumbCam.lookAt(c);
    thumbR.render(thumbScene, thumbCam);
    thumbScene.remove(o);
    return thumbR.domElement.toDataURL();
  } catch { return null; }
}
function invRender() {
  const bar = $("invBar"), show = inv.length > 1 || (inv.length && invSel < 0);   // 2+ items, or empty-handed with something stashed
  bar.style.display = show ? "flex" : "none";
  if (!show) return;
  const sel = invSel >= 0 ? invSel : invEmpty;
  bar.innerHTML = Array.from({ length: INV_MAX }, (_, i) => {
    const e = inv[i];
    const img = !e ? "" : e.kind === "tape" ? artUrl(e.ref.art) : e.thumb;
    const used = e?.kind === "tape" ? windFrac(e.ref)                                  // rewound = all green; red = how far it's played
      : e?.kind === "snack" ? 1 - (i === invSel ? snackLeft / snackTotal : e.left / e.total)   // bites / sips: green left, red gone
      : e?.kind === "popcorn" && e.ref.kind === "box" ? 1 - e.ref.fill / 8 : null;           // handfuls
    const wind = used != null && isFinite(used) ? `<i class="wind" style="--w:${(used * 100).toFixed(1)}%"></i>` : "";
    return `<div class="slot${i === sel ? " sel" : ""}"><span>${i + 1}</span>${img ? `<img src="${img}">` : ""}${wind}</div>`;
  }).join("");
}

