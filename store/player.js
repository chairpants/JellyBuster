// ---------------- player ----------------
const player = { x: 0, z: 2.6, yaw: Math.PI, pitch: 0, r: 0.32, inBooth: false, airH: 0 };   // (inBooth: up in the projection booth, its floor over the lobby's)
let eyeY = 1.65;                            // eased toward standing/crouch height
camera.position.set(player.x, 1.65, player.z);
camera.rotation.y = player.yaw;
// your own body: a customer rig in the store uniform, with the TV head and neck hidden, since the
// camera is where they'd be. It stands a little behind the eye so looking
// down shows your chest, belly and feet; on the couch it takes Dana's sitting
// pose and the camera rides its head
// a guest (playing together): somebody plain, the same on both screens. A grey tee (its print the same grey: none to see), jeans, white sneakers
const GUEST_LOOK = { female: false, top: "tee", topA: "#8a8f96", topB: "#8a8f96", sleeve: "baggy", longSleeves: false, pants: "khaki", pantsColor: "#3b5b8c", shoes: "#eeeeee", hightop: false, hat: null, height: 1, build: 1 };
const me = StoreCustomers.build({ ...StoreCustomers.randomOutfit(seeded(1985), false), height: 1, build: 1, hat: null,
  ...(GUEST ? GUEST_LOOK : CUSTOMER ? {} : { top: "uniform", topA: "#1b3fa0", topB: "#ffd400", longSleeves: false, pants: "khaki", pantsColor: "#b9a27a", shoes: "#1e1e1e" }) });   // Dana's uniform, no name tag (a customer: your own clothes)
me.rig.head.visible = false; me.rig.neck.visible = false;
me.walkLean = false;                        // the eye doesn't tip forward, so neither does the chest: the feet stay in view
scene.add(me.group);
me.group.rotation.order = "YXZ";            // (the yaw first: then a fall tips it over backwards, whichever way you're facing)
const meLast = { x: player.x, z: player.z }, meEye = new THREE.Vector3();
function meTick(dt) {
  const g = me.group;
  let speed = 0;
  g.rotation.x = fall ? (fall.prone ? 1 : -1) * fall.a : 0;
  if (fall) {                                  // tipping over from where your feet are, backwards or (prone) on your face, your head where the camera's gone
    const fx = -fall.ux, fz = -fall.uz, off = 0.21 * (1 - fall.tilt);   // (21 cm behind your eye to begin with, as you stand)
    g.position.set(fall.fX + Math.sin(fall.yaw0) * off, fall.fY + 0.08 * fall.tilt, fall.fZ + Math.cos(fall.yaw0) * off); g.rotation.y = fall.prone ? Math.atan2(fall.ux, fall.uz) : Math.atan2(-fall.ux, -fall.uz);
    me.setPose(fall.stage === "up" ? "crouch" : "idle");
    const b = fall.tilt > 0.4 && fall.plan?.lean ? bodyBend(player.x, player.z, fx, fz, g.rotation.y) : null;   // (lying where it fits, nothing to fold round)
    b ? me.setBend(b.legs, b.arm0, b.arm1) : me.setBend();
  } else if (onStool) {
    g.position.set(stool.x, 0, stool.z); g.rotation.y = stool.angle + Math.PI;
    me.setPose("sit", STOOL_SIT);
  } else if (seated) {                        // on the cushion, a hair inboard like Dana so the elbows clear the arm
    g.position.set(seatAt.y != null ? seatAt.x : Math.sign(seatAt.x) * Math.max(0, Math.abs(seatAt.x) - 0.04), seatAt.y || 0, seatAt.z); g.rotation.y = seatAt.ry || 0;
    me.setPose("sit", seatAt.hipY ? { hipY: seatAt.hipY } : undefined);
  } else if (golf.on) {                      // at address on the roof (see golfTick)
    g.position.copy(golfStance()); g.rotation.y = golf.aim - Math.PI / 2 + Math.PI; me.setPose("idle");
  } else if (roof.climb) {                   // on the closet ladder, facing the rungs
    g.position.set(roof.cam.x, roof.cam.y - 1.65, roof.cam.z + 0.21); g.rotation.y = Math.PI; me.setPose("idle");
  } else if (ladder.on) {                    // up on the top step, facing the ladder
    const k = ladder.lift, e = k * k * (3 - 2 * k);
    g.position.set(player.x, floorHeightAt(player.x, player.z) + LADDER.STEP * e + 0.015, player.z); g.rotation.y = ladder.ry + Math.PI;
    me.setPose("idle");
  } else {
    speed = Math.hypot(player.x - meLast.x, player.z - meLast.z) / Math.max(dt, 1e-4);
    g.position.set(player.x + Math.sin(player.yaw) * 0.21, playerFloor(), player.z + Math.cos(player.yaw) * 0.21);   // 21 cm behind the eye: looking down, the chest only creeps in near the bottom
    g.rotation.y = player.yaw + Math.PI;      // the rig faces +z; yaw 0 looks down -z
    me.setPose(keys.has("KeyC") ? "crouch" : "idle");
  }
  meLast.x = player.x; meLast.z = player.z;
  const onToilet = seated && !!seatAt?.toilet;    // pants down, and the broadcast-standards mosaic over the middle
  if (onToilet !== meToilet) { meToilet = onToilet; me.setPantsDown(onToilet); censor.visible = onToilet; }
  if (onToilet) { censor.lookAt(camera.position); if ((censor.t -= dt) <= 0) { censor.t = 0.12; censorDraw(); } }   // (always square to your eye)
  me.setAir(jump.air || !!mantle || fall?.stage === "drop");
  me.tick(dt, speed);
}
// whatever's in your hand rides your own right hand: the arm reaches for the spot the item's drawn at (its carry
// spot, or up at your mouth mid-bite or mid-sip), and for the frame the item's drawn where the hand actually got to:
// at arm's length, swinging as you walk, low in a crouch. (Tools and the ladder pose the arms themselves.)
// Returns an undo, so everything else keeps seeing the item at its own spot
let meHolding = false;
const meGrip = new THREE.Vector3();
function meHandFollow() {
  const g = [handGroup, snackGroup, popcornGroup, coHand, postitHeld?.mesh].find(o => o?.visible && o.parent === camera);
  if (!g || toolHeld || ladder.on || roof.climb || golf.on) { if (meHolding && !toolHeld && !ladder.on && !golf.on) me.reachTo(null); meHolding = false; return null; }
  camera.updateMatrixWorld();
  me.reachTo(camera.localToWorld(meGrip.copy(g.position)), 0, { lean: false }); meHolding = true;   // (lands next tick)
  me.group.updateMatrixWorld(true); me.rig.arms[0].hand.getWorldPosition(meGrip);
  const rest = g.position.clone(); g.position.copy(camera.worldToLocal(meGrip));
  return () => g.position.copy(rest);
}
// the censor: a pixel mosaic over your lap, redrawn a few times a second so it shimmers like a TV blur
let meToilet = false;
const censorTex = makeTexture(() => {}, 64, 64); censorTex.magFilter = THREE.NearestFilter; censorTex.minFilter = THREE.NearestFilter;
const censor = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.36), new THREE.MeshLambertMaterial({ map: censorTex, transparent: true, alphaTest: 0.1 }));   // lit like the skin around it (an unlit sprite bloomed)
censor.position.set(0, 0.6, 0.17); censor.visible = false; censor.t = 0; me.group.add(censor);
function censorDraw() {
  const g = censorTex.image.getContext("2d"), skin = me.outfit.skin, n = 8, c = 64 / n;
  g.clearRect(0, 0, 64, 64);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const dx = (i + 0.5) / n - 0.5, dy = (j + 0.5) / n - 0.5; if (dx * dx + dy * dy > 0.25) continue;   // a round-ish patch
    const tone = Math.random(); g.fillStyle = tone < 0.4 ? skin : tone < 0.62 ? "#9a6a4c" : tone < 0.8 ? "#f6dcc4" : tone < 0.92 ? "#b9a27a" : "#5a4230";   // skin, shade, highlight, khaki, deep shadow
    g.globalAlpha = 0.85 + Math.random() * 0.15; g.fillRect(i * c, j * c, c, c);
  }
  g.globalAlpha = 1; censorTex.needsUpdate = true;
}

// ---- the spinning stool (starts behind the counter; hold E to carry it off
// like the standee): E sits; seated, each E is a
// shove that adds spin (up to a hard cap), and bearing friction winds it
// down — a constant drag plus a little that grows with speed, so a hard spin
// coasts a few turns and a nudge dies in a couple of seconds. You turn with
// the seat: the body stays put under you while the store goes round. Any
// move key gets you up; an empty seat coasts to a stop on its own ----
const STOOL = { SEAT: 0.72, R: 0.26, CARRY_D: 0.95,          // seat top height, footprint half-width, how far ahead it's carried
  PUSH: 2.4, MAX: 14,                                           // rad/s per shove, hard cap (~2.2 turns a second)
  DRAG: 0.9, VISC: 0.25, EMPTY: 2.5 };                          // rad/s² constant, 1/s per rad/s, x friction with nobody on it
const STOOL_SIT = { hipY: STOOL.SEAT + 0.05, tuck: 0.5 };       // up on the seat, feet pulled back onto the footring
const stool = { x: -4.5, z: 2.0, angle: 0, vel: 0, g: null, top: null, carried: false, spot: null, by: null, danaCarry: false };   // by: "dana" while she has it
const stoolFit = (x, z, b) => Object.assign(b, { x0: x - STOOL.R, x1: x + STOOL.R, z0: z - STOOL.R, z1: z + STOOL.R });
stool.box = stoolFit(stool.x, stool.z, { y1: STOOL.SEAT, shadow: false });
let onStool = false;
{
  const chrome = new THREE.MeshPhongMaterial({ color: 0xc9cdd2, specular: 0xffffff, shininess: 90 });
  const black = new THREE.MeshPhongMaterial({ color: 0x18181a, specular: 0x444444, shininess: 30 });
  const vinyl = new THREE.MeshPhongMaterial({ color: 0xb3161f, specular: 0x552222, shininess: 45 });   // diner-red seat
  const g = stool.g = new THREE.Group(); g.position.set(stool.x, 0, stool.z); scene.add(g);
  const add = (geo, m, x, y, z, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); o.userData.stool = true; aimables.push(o); return o; };
  for (let i = 0; i < 5; i++) {                                 // five-star base on casters
    const a = i / 5 * Math.PI * 2, arm = new THREE.Group(); arm.rotation.y = a; g.add(arm);
    add(new THREE.BoxGeometry(0.04, 0.03, 0.27), chrome, 0, 0.075, 0.15, arm).rotation.x = 0.12;   // sloping down to the wheel
    add(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 8), chrome, 0, 0.055, 0.27, arm);           // caster stem
    add(new THREE.CylinderGeometry(0.028, 0.028, 0.025, 14), black, 0, 0.028, 0.285, arm).rotation.z = Math.PI / 2;   // the wheel
  }
  add(new THREE.CylinderGeometry(0.055, 0.065, 0.06, 18), chrome, 0, 0.09, 0);                    // hub
  add(new THREE.CylinderGeometry(0.036, 0.036, 0.26, 18), black, 0, 0.24, 0);                      // gas-lift sleeve
  add(new THREE.CylinderGeometry(0.024, 0.024, STOOL.SEAT - 0.4, 14), chrome, 0, (STOOL.SEAT + 0.3) / 2, 0);   // the column
  const ring = add(new THREE.TorusGeometry(0.23, 0.011, 8, 40), chrome, 0, 0.34, 0); ring.rotation.x = Math.PI / 2;   // footring
  for (let i = 0; i < 3; i++) {                                 // its spokes back to the sleeve
    const a = i / 3 * Math.PI * 2, sp = add(new THREE.CylinderGeometry(0.007, 0.007, 0.2, 6), chrome, Math.sin(a) * 0.13, 0.34, Math.cos(a) * 0.13);
    sp.rotation.set(Math.PI / 2, 0, 0); sp.rotation.order = "YXZ"; sp.rotation.y = a;
  }
  const top = stool.top = new THREE.Group(); top.position.y = STOOL.SEAT; g.add(top);   // everything that turns
  add(new THREE.CylinderGeometry(0.19, 0.19, 0.075, 32), vinyl, 0, -0.04, 0, top);                  // cushion
  add(new THREE.CylinderGeometry(0.185, 0.19, 0.012, 32), vinyl, 0, -0.001, 0, top);                // its slightly domed top
  const band = add(new THREE.TorusGeometry(0.19, 0.012, 8, 40), chrome, 0, -0.06, 0, top); band.rotation.x = Math.PI / 2;   // chrome edge band
  add(new THREE.CylinderGeometry(0.12, 0.08, 0.04, 20), black, 0, -0.1, 0, top);                   // the mechanism under the seat
  const lever = add(new THREE.BoxGeometry(0.018, 0.012, 0.14), chrome, 0.09, -0.11, 0.1, top); lever.rotation.y = -0.6;   // height paddle (and how you can tell it's turning)
  add(new THREE.BoxGeometry(0.03, 0.02, 0.04), black, 0.13, -0.11, 0.155, top).rotation.y = -0.6;  // its grip
  colliders.push(stool.box);
}
function stoolPush() {
  stool.vel = Math.min(STOOL.MAX, stool.vel + STOOL.PUSH);
  try {                                           // the bearing's dry swish as it goes
    const ac = StoreAudio.ctx(), n = ac.sampleRate * 0.25, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / n) ** 2;
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), gn = ac.createGain();
    f.type = "bandpass"; f.frequency.value = 500 + stool.vel * 40; f.Q.value = 2; gn.gain.value = 0.12;
    src.buffer = b; src.connect(f).connect(gn).connect(sfxOut(ac)); src.start();
  } catch {}
}
function stoolSit() {
  stoodAt = { x: player.x, z: player.z, yaw: player.yaw };
  player.x = stool.x; player.z = stool.z;                       // you're where the stool is now (NPCs step round you, the gates know where you are)
  stool.angle = player.yaw; onStool = true;                     // sit facing the way you were looking
}
function stoolStand() {                           // step off toward where you're facing, or anywhere clear, or back where you came from
  onStool = false;
  for (const da of [0, 1.2, -1.2, 2.4, -2.4, Math.PI]) {
    const a = player.yaw + da, x = stool.x - Math.sin(a) * 0.62, z = stool.z - Math.cos(a) * 0.62;
    if (!blocked(x, z)) { player.x = x; player.z = z; return; }
  }
  player.x = stoodAt.x; player.z = stoodAt.z;
}
function stoolTick(dt) {
  if (stool.vel) {
    const sat = onStool || !!stool.by;
    const drag = (STOOL.DRAG + STOOL.VISC * stool.vel) * (sat ? 1 : STOOL.EMPTY) * dt;
    const v = Math.max(0, stool.vel - drag), d = (stool.vel + v) / 2 * dt;   // averaged over the step, so a stop lands smoothly
    stool.vel = v; stool.angle += d;
    if (onStool) player.yaw += d;                 // you turn with it; your look stays where it was relative to your body
  }
  stool.top.rotation.y = stool.angle;             // (Dana scoots it round by hand, too)
}
// drunk: a beer goes down a sip at a time into your stomach, and on into your blood over the next half minute or so;
// you burn off about a beer every four minutes (real ones: two and a half store hours). Past a beer and a bit in your blood it shows, worse the
// more there is: a beer now and then is nothing, a couple back to back is a buzz, three or four in a row and you're gone.
// (Drinks, not real BAC: 1 = a whole beer.) And it has consequences, more the drunker you are:
//   drunk: you stumble now and then on your feet, and fumble what's in your hand (a drink or popcorn spills, a snack's
//     dropped); customers near you notice (a shocked face each, points off, and it counts against the night's reputation)
//   wasted: you throw up on the floor (a mess for the mop; it takes the edge off)
//   past that (5 beers in your blood): you black out. The screen goes, the store runs on a couple of hours without you,
//     and you come to on the floor
//   blacked out, or clocked out drunk: the next shift's hungover till lunch: slow on your feet, a throbbing headache
const drunk = { gut: SAVE?.drunk?.gut || 0, blood: SAVE?.drunk?.blood || 0, lvl: 0, peak: 0, hang: !!SAVE?.drunk?.hang, owe: !!SAVE?.drunk?.owe,
  stumbleT: 5, lurch: 0, lx: 0, lz: 0, fumbleT: 12, pukeT: 25, seenT: 0, out: 0 };
const DRUNK_OUT = 5, OUT_S = 7;                  // beers in the blood to black out; real seconds out (the store runs 2 hours in them)
function drunkTick(dt) {
  const a = drunk.gut * Math.min(1, dt / 30);
  drunk.gut -= a; drunk.blood = Math.max(0, drunk.blood + a - dt / 240);
  const k = Math.max(0, Math.min(1, (drunk.blood - 1.2) / 3));
  const lvl = k > 0.6 ? 3 : k > 0.2 ? 2 : drunk.blood > 0.9 ? 1 : 0;
  if (lvl > drunk.lvl && !drunk.out) toast(["", "A nice little buzz", "You're getting drunk", "You're wasted. Maybe sit down for a while"][lvl], lvl < 2);
  drunk.lvl = lvl; drunk.peak = Math.max(drunk.peak, lvl);
  if (drunk.out) { if ((drunk.out -= dt) <= 0) drunkWake(); return k; }
  if (drunk.blood >= DRUNK_OUT) { drunkOut(); return k; }
  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw), up = !seated && !onStool && !ladder.on && !roof.climb;
  if (drunk.lurch > 0) {                         // a stumble: a step off sideways you didn't mean to take
    drunk.lurch -= dt;
    const nx = player.x + drunk.lx * dt, nz = player.z + drunk.lz * dt;
    if (!blocked(nx, player.z)) player.x = nx;
    if (!blocked(player.x, nz)) player.z = nz;
  }
  if (lvl >= 2 && up) {
    const walking = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].some(c => keys.has(c));
    if (walking && (drunk.stumbleT -= dt * k * 2) <= 0) {
      drunk.stumbleT = 3 + Math.random() * 5;
      const s = Math.random() < 0.5 ? 1 : -1;
      drunk.lurch = 0.45; drunk.lx = -fz * s * 1.6 + fx * 0.6; drunk.lz = fx * s * 1.6 + fz * 0.6;   // off to one side, and on a bit
      player.yaw += s * 0.25; player.pitch = Math.max(-1.4, player.pitch - 0.18); me.stagger(-s);
    }
    if ((drunk.fumbleT -= dt * k * (walking ? 2 : 1)) <= 0) { drunk.fumbleT = 10 + Math.random() * 15; drunkFumble(); }
  }
  if (lvl >= 3 && (drunk.pukeT -= dt * k) <= 0) { drunk.pukeT = 25 + Math.random() * 30; drunkPuke(); }
  if (lvl >= 2 && (drunk.seenT -= dt) <= 0) {     // customers who can see you: about one in three notice, each second (at the register, nearly all)
    drunk.seenT = 1;
    for (const c of custs) if (c.c && !c.sawDrunk && Math.hypot(c.c.group.position.x - player.x, c.c.group.position.z - player.z) < (co?.cust === c ? 3 : 4.5) && Math.random() < (co?.cust === c ? 0.8 : 0.3)) drunkSeen(c, co?.cust === c ? 2 : 1);
  }
  return k;
}
function drunkSeen(c, n = 1, how = "noticed you're drunk") {   // n: how bad (at the register: worse)
  c.sawDrunk = true; c.c.setMood("shock"); c.hi = 2.5;
  shift.stats.drunkSeen = (shift.stats.drunkSeen || 0) + n; shiftScore(-5 * n, "you");
  logAct(`A customer ${how}${co?.cust === c ? ", right at the register" : ""}`, "bad", null, -5 * n);
}
function drunkFumble() {                         // whatever's in hand: drinks and popcorn spill, a snack hits the floor
  const x = player.x - Math.sin(player.yaw) * 0.45, z = player.z - Math.cos(player.yaw) * 0.45;
  if (heldSnack && snackLeft && !stockCarry.has(heldSnack)) {
    const p = heldSnack.userData.snack;
    if (isDrink(p)) { messAdd("spill", x, z); snackLeft = 0; snackTag(); toast(`Whoops: you spilled your ${p.kind === "Beer" ? "beer" : p.name}`); }
    else { messAdd("wrapper", x, z); dropSnack(true); toast(`Whoops: you dropped your ${p.name}`); }
  } else if (heldPopcorn?.kind === "box" && heldPopcorn.fill) {
    messAdd("popcorn", x, z); heldPopcorn.fill = 0; heldPopcorn.toppings = []; popcornVisual(); toast("Whoops: popcorn everywhere");
  }
}
function drunkPuke() {
  messAdd("vomit", player.x - Math.sin(player.yaw) * 0.6, player.z - Math.cos(player.yaw) * 0.6);
  drunk.gut = 0; drunk.blood = Math.max(0, drunk.blood - 0.6);   // (what hadn't gone in yet, and a bit that had)
  player.pitch = Math.max(-1.4, player.pitch - 0.5); me.stagger(1);
  toast("You threw up. On the floor. Of the store");
  shiftScore(-10, "you"); logAct("Threw up on the store floor", "bad", null, -10);
  for (const c of custs) if (c.c && Math.hypot(c.c.group.position.x - player.x, c.c.group.position.z - player.z) < 7) { if (c.sawDrunk) { c.c.setMood("angry"); c.hi = 3; } else drunkSeen(c, 2, "watched you throw up"); }
}
function drunkOut() {                            // the lights go out; the store runs on 2 hours (shiftTick's fast-forward) while you're on the floor
  drunkFumble(); keys.clear();
  drunk.out = OUT_S; drunk.owe = true; shift.warp = Math.min(SHIFT.close, Math.max(shift.warp, shift.h) + 2);
  shiftScore(-50, "you"); shift.stats.drunkSeen = (shift.stats.drunkSeen || 0) + 3;
}
function drunkWake() {
  drunk.out = 0; drunk.gut = 0; drunk.blood = 2.4;
  eyeY = 0.25; player.pitch = 0.5;              // on the floor, looking up; the eye eases back up to standing
  logAct("Blacked out on the job. A couple of hours, gone", "bad", null, -50);
  toast(`You come to on the floor. It's ${fmtClock(shift.h)}. What happened?`);
}
const drunkDim = () => drunk.out ? Math.min(1, (OUT_S - drunk.out) / 1.2, drunk.out / 0.4 + 0.3) : 0;   // fade out, hold, then a little light before you're up
const hungover = () => drunk.hang && shift.h < 13;     // till lunch
// dizzy: a hard spin on the stool builds it up (a nudge doesn't); once the spinning
// eases off the room keeps drifting the other way, the view sways and blurs, and
// walking forward pulls you off to one side or the other. Wears off over ~20 s
const dizzy = { v: 0, t: 0, blur: "", said: false, ph: 0 };
function dizzyTick(dt) {
  if (onStool && stool.vel > 5) dizzy.v = Math.min(1, dizzy.v + dt * stool.vel / STOOL.MAX / 8);   // ~8 s flat out to max
  else dizzy.v = Math.max(0, dizzy.v - dt / 20);
  const spin = Math.max(0, (dizzy.v - 0.3) / 0.7);   // the first few seconds of spinning are free
  const k = Math.max(spin, drunkTick(dt));         // drunk: the same sway, blur and pull, without the room going round
  dizzy.t += dt;
  if (spin && !(onStool && stool.vel > 2)) player.yaw -= spin * 0.7 * dt * (1 + 0.4 * Math.sin(dizzy.t * 0.9));   // the room keeps going round the other way
  if (spin > 0.5 && !dizzy.said) { dizzy.said = true; toast("Whoa... the room's still spinning", true); }
  if (!k) { dizzy.said = false; dizzy.ph = Math.random() * Math.PI * 2; }   // next time it may pull the other way first
  if (k && !onStool && !seated && (keys.has("KeyW") || keys.has("ArrowUp"))) player.yaw += k * 1.3 * dt * Math.sin(dizzy.t * 0.7 + dizzy.ph);   // walking: pulled left, then right...
  const dim = Math.max(drunkDim(), hungover() ? 0.18 * Math.max(0, Math.sin(dizzy.t * 1.2)) ** 6 : 0);   // blacked out / a hangover's throb
  const blur = [k > 0.05 && `blur(${(k * 2.5).toFixed(1)}px)`, dim > 0.01 && `brightness(${(1 - dim).toFixed(2)})`].filter(Boolean).join(" ");
  if (blur !== dizzy.blur) canvas.style.filter = dizzy.blur = blur;
  return k;
}
const keys = new Set();
const HOLD_MS = 450;                       // hold E on the standee to lift it
let eHoldTimer = null, eHoldPostit = null;                     // hold E on the standee to lift it (a tap does nothing, so it's hard to grab by accident)
let eHoldStool = false, eHoldLadder = false;   // (the ladder the same: tap climbs, hold picks it up)                    // E went down on the stool: a tap sits on release, a hold picks it up
let eHoldSwitch = null;                    // E went down on a multi-switch plate: a tap flips this one on release, a hold flips the plate
addEventListener("keydown", e => {
  if (relockOnInput && e.code !== "Escape" && !posTerm?.isOpen() && !shift.report && !hiring.open) { relockOnInput = false; lockMouse()?.catch?.(() => {}); }
  if (posTerm?.isOpen()) { posEsc = e.key === "Escape"; return posTerm.key(e); }   // typing at the register: no walking, no hotkeys
  if (shift.report) { if (["Enter", "Space", "KeyE"].includes(e.code) && !e.repeat) nextShift(); return; }   // the end-of-shift slip
  if (board.open) { if (document.pointerLockElement === canvas) boardKey(e); return; }   // arranging the staff's jobs
  if (e.code === "KeyK" && !e.repeat && document.pointerLockElement === canvas && !(CUSTOMER && cm.term)) { sheetToggle(); return; }   // the skills sheet (not at the register terminal: K takes the key there)
  if (document.pointerLockElement !== canvas) return;   // paused / title screen
  if (WHEEL.open) { if (e.code === "Escape") wheelClose(); return; }   // the time and weather wheel's up
  if (siKey(e)) return;                          // at the Space Invaders machine: its controls
  if (CUSTOMER && cm.term && cmTermKey(e)) return;   // logged into the register (customer mode): its keys, not yours
  if (e.code === "Escape") { if (!escClose()) document.exitPointerLock(); return; }   // (only reaches us in fullscreen, with the keyboard lock)
  if (drunk.out) return;                     // out cold
  if (["Space", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.code === "KeyE" && !e.repeat && cmove.item) { /* carrying one: click sets it down */ }
  else if (e.code === "KeyE" && !e.repeat && WX_KIT_ON && wxKit.sel >= 0 && !inv.length) wxKitUse();   // (WX_KIT: temporary)
  else if (e.code === "KeyE" && !e.repeat) {
    if (aimMove && !seated && !onStool && !cutout.carried && !stool.carried && !boxCarry.length) { eHoldMove = aimMove; eHoldTimer = setTimeout(() => { eHoldTimer = null; const it = eHoldMove; eHoldMove = null; if (it) moveStart(it); }, HOLD_MS); }   // a tap does its usual thing (on release); a hold picks it up
    else if (aimPostit && !postitHeld) { eHoldPostit = aimPostit; eHoldTimer = setTimeout(() => { eHoldTimer = null; const n = eHoldPostit; eHoldPostit = null; if (n) postitPickUp(n); }, HOLD_MS); }   // a tap calls them; a hold peels it off
    else if (aimCutout) eHoldTimer = setTimeout(() => { eHoldTimer = null; if (aimCutout) cutoutPickUp(); }, HOLD_MS);
    else if (aimLadder && ladder.state === "placed") { eHoldLadder = true; eHoldTimer = setTimeout(() => { eHoldTimer = null; eHoldLadder = false; ladderPickUp(); }, HOLD_MS); }
    else if (aimStool && !stool.by) { eHoldStool = true; eHoldTimer = setTimeout(() => { eHoldTimer = null; eHoldStool = false; stoolPickUp(); }, HOLD_MS); }
    else if (aimSwitch && switchPlate[aimSwitch].length > 1 && !seated && !aimCouch && !cutout.carried && !stool.carried && !aimCustomer) {
      eHoldSwitch = aimSwitch;
      eHoldTimer = setTimeout(() => { eHoldTimer = null; flipPlate(eHoldSwitch); eHoldSwitch = null; }, HOLD_MS);
    }
    else onE();                              // one press, one action — holding E doesn't machine-gun bites, doors, the flap
  }
  if (catchCall && /^Digit[1-5]$/.test(e.code)) catchDecide(+e.code[5]);   // deciding what happens to a shoplifter
  else if (phone.call && /^Digit[12]$/.test(e.code)) callAnswer(+e.code[5]);   // on the phone
  else if (WX_KIT_ON && !inv.length && /^Digit[1-9]$/.test(e.code)) wxKitSelect(+e.code[5] - 1);   // (WX_KIT: temporary)
  else if (CUSTOMER && /^Digit\d$/.test(e.code) && !e.repeat && cmComboKey(e.code[5])) {}   // at a padlock: the combination
  else if (/^Digit[1-9]$/.test(e.code)) invSelect(+e.code[5] - 1);   // pick an inventory slot
  if (e.code === "Space" && !e.repeat) jumpStart();
  if (e.code === "KeyB" && !e.repeat) togglePause();
  if ((e.code === "KeyV" || e.code === "KeyN") && !e.repeat) mediaDown(e.code);   // the tape: a tap for the episode before / after, held to wind (see media)
  if (e.code === "KeyQ" && !e.repeat) coQ();
  if (e.code === "KeyX" && !e.repeat && CUSTOMER) cmSpill();
  if (e.code === "KeyT" && !e.repeat && CUSTOMER && aimEmp && cmBehindCounter(aimEmp.c?.group.position.x ?? 0, aimEmp.c?.group.position.z ?? 9)) cmTicket(aimEmp);
  if (e.code === "KeyR" && !e.repeat && held) { if (!inspecting) inspecting = true; else tapeBoxFlip(); }   // up to look at it; again: turn it over
  if (e.code === "KeyT" && !e.repeat && playing && !(CUSTOMER && aimEmp)) tvOsd(Jelly.nextCaptions(), 3);   // captions: off till asked for
  if (e.code === "KeyJ" && !e.repeat) logToggle();      // the log, bottom left
  if (e.code === "PageUp" || e.code === "PageDown") { e.preventDefault(); logScroll(e.code === "PageUp" ? -1 : 1); }        // at the counter: waive fees / offer a snack
  if (e.code === "KeyL" && !e.repeat) skipHour();   // the store lights are real switches; L fast-forwards the clock
  if (e.code === "KeyH") document.body.classList.toggle("nohud");
  if (e.code === "KeyM" && !e.repeat && window.StoreAmbience) { const m = !StoreAmbience.muted(); StoreAmbience.setMuted(m); sfxRefresh(); toast(m ? "Store sounds off (M)" : "Store sounds on (M)", true); }
  if (e.code === "KeyF" && !e.repeat) WHEEL.hold = setTimeout(() => { WHEEL.hold = null; wheelOpen(); }, 350);   // held: the time and weather wheel (a tap: nothing. Fullscreen is the browser's own F11)
});
addEventListener("keyup", e => {
  keys.delete(e.code);
  mediaUp(e.code);
  if (e.code === "KeyF" && WHEEL.hold) { clearTimeout(WHEEL.hold); WHEEL.hold = null; }
  if (e.code === "KeyE") {
    clearTimeout(eHoldTimer); eHoldTimer = null;   // let go before it's lifted: nothing happens
    if (eHoldSwitch) { flipSwitch(eHoldSwitch); eHoldSwitch = null; }   // a tap on the plate: just the one switch
    if (eHoldStool) { eHoldStool = false; stoolSit(); }                  // a tap on the stool: sit
    if (eHoldLadder) { eHoldLadder = false; ladderClimb(); }             // a tap on the ladder: up you go
    if (eHoldMove) { eHoldMove = null; onE(); }                         // a tap on a rewinder / the pad / the printer: its usual thing
    if (eHoldPostit) { const n = eHoldPostit; eHoldPostit = null; postitCall(n); }   // a tap on a post-it: make the call
  }
});
let seatFov = 70;
canvas.addEventListener("wheel", e => {          // lean in on the couch, or zoom a held-up cover
  if (cmove.item) {                              // carrying a counter thing: turn it, 15° per notch's worth of scrolling
    const px = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1);   // (lines / pages -> pixels)
    if (Math.abs(px) >= 50) { cmove.wheel = 0; cmove.ry -= Math.sign(px) * Math.PI / 12; return; }   // a mouse wheel notch: one step
    cmove.wheel = (cmove.wheel || 0) + px;                                                   // a touchpad's little deltas: a step per 50 px of swipe
    while (Math.abs(cmove.wheel) >= 50) { const d = Math.sign(cmove.wheel); cmove.ry -= d * Math.PI / 12; cmove.wheel -= d * 50; }
    return;
  }
  if (tvMenu && tvMenuWheel(e.deltaY < 0 ? 1 : -1)) return;               // nudging a menu slider
  if (seated) {                                   // lean in; all the way in on a playing screen, one notch more: it full screen (a notch back: the room)
    if (fullVid.on) { if (e.deltaY > 0) fullVidSet(false); return; }
    if (e.deltaY < 0 && seatFov <= 28.01 && fullVidAim()) { fullVidSet(true); return; }
    seatFov = Math.max(28, Math.min(70, seatFov + e.deltaY * 0.02));
  }
  else if (held && inspecting) {
    coverZoom = Math.max(1, Math.min(BOX_ZOOM_MAX, coverZoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
    if (coverZoom <= 1.05) boxState.panX = boxState.panY = 0;
  }
  else if (inv.length) {                         // scroll the inventory: every item plus one empty slot (empty-handed)
    const n = Math.min(inv.length + 1, INV_MAX), cur = invSel >= 0 ? invSel : Math.min(invEmpty, inv.length);
    invSelect((cur + (e.deltaY > 0 ? 1 : -1) + n) % n);
  }
});
let lastActive = 0;                          // last mouse-look or key — the crosshair hides after a few still seconds
addEventListener("mousemove", e => {
  if (WHEEL.open && document.pointerLockElement === canvas) { wheelMouse(e.movementX, e.movementY); return; }
  if (document.pointerLockElement !== canvas || golf.on || arcade.on || fullVid.on) return;   // (golfing: the camera's the swing's; at the arcade machine, its screen; full screen on a tape: held still)
  if (mouseJumped(e.movementX, e.movementY)) return;   // (a move that never happened)
  lastActive = performance.now();
  if (held && inspecting) { tapeBoxMouse(e.movementX, e.movementY); return; }   // a tape held up: the mouse is on the box
  const k = 0.0022 * SETTINGS.sens / 100;   // (SETTINGS: sensitivity, invert)
  player.yaw -= e.movementX * k;
  player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch - e.movementY * k * (SETTINGS.invertY ? -1 : 1)));
});
function blocked(x, z) {
  if (!fall && hangerAt(x, z)) return true;      // (your head: a sign's in the way, unless you're going fast enough to find out: see FALL.bonk)
  const r = player.r, near = Math.hypot(x - player.x, z - player.z) < 1;   // (a step from where you are: anywhere else, just what's there)
  if (player.onRoof) return !onDeck(x, z) || (near && Math.abs(roofY(x, z) - roofY(player.x, player.z)) > 0.35)   // up top: the decks (the tall block's a wall from the low one but up the iron stair),
    || roof.cols.some(c => x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r);                    // their parapets and their kit
  if (player.inBooth) return x < BOOTH.x0 + r || z < BOOTH.z0 + r || z > BOOTH.z1 - r || (x > BOOTH.x1 - r && (z > SHAFT.top - r || z < BOOTH.z0 + 0.08 + r || x > BOOTH.x1 + 0.4))   // the booth: out only to the stairs' top (clear of its walls: their colliders, past it)
    || BOOTH.cols.some(c => x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r);
  if (near) {                                    // no climbing a step much over a stair's (the booth's stairs' top from the lobby), nor dropping off one but into the booth
    const f0 = floorHeightAt(player.x, player.z), f1 = floorHeightAt(x, z);
    if (f1 - f0 > 0.4 || (f0 - f1 > 0.6 && !(f0 > TALL.booth - 0.1 && x < SHAFT.x0))) return true;
  }
  if (SERVICE_ROAD.behindFence(x, z) && !SERVICE_ROAD.behindFence(player.x, player.z)) return true;   // (the fence runs out to the treeline: no going round the end of it)
  if (CUSTOMER ? outBlocked(x, z) : tonyBlocked(x, z)) return true;
  for (const c of colliders) if (!c.staff)       // (you walk through the staff: they can't pin you in a corner)
    if (x > c.x0 - player.r && x < c.x1 + player.r && z > c.z0 - player.r && z < c.z1 + player.r) {
      if (c.y1 != null && player.airH + floorHeightAt(x, z) >= c.y1 - 0.02) continue;   // (off the ground and over the top of it. A top's a height in the world and airH's from the floor you're on: the theater's goes below ground)
      if (c === frontWallBox && x > 0.05 + player.r && x < 1.75 - player.r && (!CUSTOMER || cmDoorOpen(player.z > 0))) continue;   // the right-hand door: customers' (when they're let in), and yours (you've the keys)
      return true;
    }
  return false;
}
// out front, as a customer: the sidewalk and the lot, not the road beyond or round the sides of the building; and the parked cars
const carQ = new THREE.Vector3();
const inBuilding = (x, z, pad = 0) => ROOF.rects.some(([x0, x1, z0, z1]) => x > x0 - pad && x < x1 + pad && z > z0 - pad && z < z1 + pad);   // (the video store's footprint)
const inTonys = (x, z, pad = 0) => x > TONY.x0 - pad && x < TONY.x1 + pad && z > TONY.z0 - pad && z < TONY.z1 + pad;
const tonyInsideAt = (x, z) => tonyIn(x, z) || tonyDoorway(x, z) || tonyBackWay(x, z);
const tonyFrontLocked = (x, z) => tony.locked && player.z < -0.25 && z > player.z && tonyDoorway(x, z);   // (locked from the walk: from inside you can always let yourself out)
function tonyBlocked(x, z) {                     // Tony's walls, and the two doors through them
  if (tonyFrontLocked(x, z)) return true;
  if (tonyInsideAt(player.x, player.z)) return !(tonyInsideAt(x, z) || z < -0.3 || z > 14.35);
  return !tonyDoorway(x, z) && !tonyBackWay(x, z) && inTonys(x, z, player.r);
}
function outBlocked(x, z) {
  const r = player.r;
  if (tonyFrontLocked(x, z)) return true;
  if (tonyInsideAt(player.x, player.z)) return tonyBlocked(x, z);   // in Tony's: its walls
  if (inBuilding(player.x, player.z)) return false;  // in the video store: its own walls do it
  // outside: anywhere (the walk, the lot, the road, the service road round both buildings: see blocked for the fence), just not off the world
  if (z < -120 || z > 150 || x < -120 || x > 120) return true;
  if (tonyDoorway(x, z) || tonyBackWay(x, z)) return false;
  if (inTonys(x, z, r)) return true;
  if (inBuilding(x, z, r)) return !(CUSTOMER && z < 0.5 && x > 0.05 + r && x < 1.75 - r);   // (the front doors: see blocked)
  for (const { g } of carsOut?.all() || []) {
    if (Math.abs(g.position.x - x) > 3.5 || Math.abs(g.position.z - z) > 3.5) continue;
    const s = g.userData.car, q = g.worldToLocal(carQ.set(x, 0.5, z));
    if (Math.abs(q.x) < s.L / 2 + player.r && Math.abs(q.z) < s.W / 2 + player.r) return true;
  }
  return false;
}
// ---- the jump (Space): a person's, not a game character's. Up about 48 cm under real gravity, so about 0.6 s in the air; how far is whatever speed you left the
// ground with (about 1.8 m from a walk, 3 m from a flat-out run), with next to no steering once you're up, and a moment to get your feet back when you land.
// Nothing heavy in your arms. Feet over something low you clear it, or land on top of it (see groundUnder) ----
const JUMP = { g: 9.81, h: 0.48, airControl: 1.2, recover: 0.22 };
const jump = { air: false, v: 0, vx: 0, vz: 0, recover: 0, dip: 0 };
const jumpHeavy = () => stool.carried || cutout.carried || ladder.state === "carried" || boxCarry.length || bagCarry.length || toolHeld || cmove.item;
function jumpStart() {
  if (fall || mantle || jump.air || jump.recover > 0 || seated || onStool || ladder.on || roof.climb || inspecting || scrub || drunk.out || golf.on || jumpHeavy()) return false;
  const h = JUMP.h * (1 + 0.02 * (lv("you", "con") - 1)) * (hungover() ? 0.6 : 1) * (keys.has("KeyC") ? 0.75 : 1);   // (CON: a little more spring; a hangover: a lot less; from a crouch you've not got your legs under you)
  jump.air = true; jump.v = Math.sqrt(2 * JUMP.g * h); jump.peak = null; return true;
}
function groundUnder(x, z) {                     // what you'd land on, up from the floor: the floor, or the top of something low you've got your feet over
  if (player.onRoof || player.inBooth) return 0;
  let g = 0; const r = 0.12, f = floorHeightAt(x, z);
  for (const c of colliders) if (c.y1 != null && c.y1 - f > g && c.y1 - f <= player.airH + 0.03 && x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) g = c.y1 - f;
  return g;
}
// ---- the mantle: in the air, pushing forward at a ledge you can get your hands on, you pull yourself up onto it. Whatever has a
// top (a collider's y1) is a ledge, if it's in reach, wide enough to stand on, there's room for you up there, and headroom.
// Something low and narrow with clear floor beyond (the couch, a rail) you vault instead ----
const MANTLE = { reach: 1.45, min: 0.05, wide: 0.3, time: 0.55, probe: 0.22, vaultMin: 0.55, vaultH: 1.1, vaultD: 1.15, vaultT: 0.6 };   // m above your feet at the moment, m (less than that's a hop: see groundUnder), m, s, m past your own radius; a vault: the height off the floor it's for, the most depth to cross, s
let mantle = null;
function ceilingAt(x, z) {                        // what your head has to fit under
  if (tonyInsideAt(x, z)) return 3.0;
  const r = roomAt(x, z);
  return r === "out" ? Infinity : r === "store" ? STORE.h : r === "theater" ? TALL.ceil : BOH.h;
}
function mantleFind(fx, fz) {                     // -> where a climb from here would put you, or null
  if (player.onRoof || player.inBooth || jumpHeavy()) return null;
  const feet = playerFloor(), r = player.r;
  let ledge = null, px, pz;
  for (const ahead of [0.05, MANTLE.probe]) {     // (close in first: a rail's thinner than the far one)
    px = player.x + fx * (r + ahead); pz = player.z + fz * (r + ahead);
    for (const c of colliders) {
      if (c.staff || px <= c.x0 || px >= c.x1 || pz <= c.z0 || pz >= c.z1) continue;
      if (c.y1 == null) return null;              // (a wall, floor to ceiling)
      if (c.y1 > feet + MANTLE.min && (!ledge || c.y1 > ledge.y1)) ledge = c;
    }
    if (ledge) break;
  }
  if (!ledge || ledge.y1 - feet > MANTLE.reach) return null;
  const grip = [px, ledge.y1, pz], was = player.airH, standsAt = (x, z, h) => { player.airH = h; const ok = !blocked(x, z); player.airH = was; return ok; };
  // low and narrow enough to go over: a hand on it and you're down the far side
  const tall = ledge.y1 - floorHeightAt(player.x, player.z);
  if (tall >= MANTLE.vaultMin && tall <= MANTLE.vaultH) {   // (any lower and you'd rather step up on it)
    const toX = fx > 0 ? (ledge.x1 - px) / fx : fx < 0 ? (ledge.x0 - px) / fx : Infinity, toZ = fz > 0 ? (ledge.z1 - pz) / fz : fz < 0 ? (ledge.z0 - pz) / fz : Infinity, across = Math.min(toX, toZ);
    if (across <= MANTLE.vaultD) for (const past of [r + 0.1, r + 0.02]) {
      const x = px + fx * (across + past), z = pz + fz * (across + past), f = floorHeightAt(x, z);
      if (Math.abs(f - floorHeightAt(player.x, player.z)) <= 0.7 && standsAt(x, z, 0)) return { x, z, h: 0, top: ledge.y1, grip, vault: true };
    }
  }
  if (ledge.vaultOnly || ledge.x1 - ledge.x0 < MANTLE.wide || ledge.z1 - ledge.z0 < MANTLE.wide) return null;
  const inset = (a, b, v) => { const m = Math.min(r, (b - a) / 2); return Math.max(a + m, Math.min(b - m, v)); };
  const x = inset(ledge.x0, ledge.x1, player.x + fx * (r + 0.5)), z = inset(ledge.z0, ledge.z1, player.z + fz * (r + 0.5));
  if (ledge.y1 + 1.7 > ceilingAt(x, z)) return null;
  const h = ledge.y1 - floorHeightAt(x, z);
  return standsAt(x, z, h) ? { x, z, h, top: ledge.y1, grip } : null;   // (something taller right beside where you'd stand: no)
}
function mantleStart(to, fx, fz) {
  mantle = { ...to, x0: player.x, z0: player.z, y0: playerFloor(), t: 0 };
  mantle.T = to.vault ? MANTLE.vaultT : MANTLE.time * (0.6 + 0.4 * Math.min(1, (to.top - mantle.y0) / MANTLE.reach));   // (further up, longer)
  jump.air = false; jump.v = jump.vx = jump.vz = 0;
  const [gx, gy, gz] = to.grip, sx = fz * 0.22, sz = -fx * 0.22;   // (both hands on the ledge, shoulder width apart: a vault's just the one)
  me.reachTo(new THREE.Vector3(gx + sx, gy, gz + sz), 0, { lean: false }); if (!to.vault) me.reachAlso(new THREE.Vector3(gx - sx, gy, gz - sz), 1);
}
function mantleTick(dt) {                         // up first, then over the edge. A vault: up and over in one go, and down the far side
  const M = mantle, s = k => k * k * (3 - 2 * k), k = (M.t = Math.min(M.T, M.t + dt)) / M.T;
  let y, over;
  if (M.vault) {
    const apex = M.top + 0.06, land = floorHeightAt(M.x, M.z);
    y = k < 0.45 ? M.y0 + (apex - M.y0) * s(k / 0.45) : apex + (land - apex) * ((k - 0.45) / 0.55) ** 2; over = s(Math.min(1, k * 1.05));
  } else { y = M.y0 + (M.top - M.y0) * s(Math.min(1, k / 0.7)); over = s(Math.max(0, (k - 0.45) / 0.55)); }
  player.x = M.x0 + (M.x - M.x0) * over; player.z = M.z0 + (M.z - M.z0) * over;
  player.airH = y - floorHeightAt(player.x, player.z);
  if (k < 1) return;
  player.x = M.x; player.z = M.z; player.airH = M.h; me.reachTo(null); me.reachAlso(null);
  jump.dip = M.vault ? 0.09 : 0.06; if (M.vault) jump.recover = 0.12;
  ambStep(player.x, player.z, 0.5); mantle = null;
}
// ---- falling: your head or chest into a hanging sign or a wall at speed, down further than knees take, or drunk and up on something: you
// tip over backwards from your feet, and flat on your back you've to get yourself up. Your legs into something low at a run (see
// lowBlocker): you go flying headfirst, the way you were going, clean over it and anything else low, and up off your face. Only your head and torso stop against
// things (see bodyBlocked): arms and legs bend round whatever's there (bodyBend) ----
const FALL = { g: 9.81, slam: 4.2, bonk: 4, drop: 1.6, lie: 0.7, up: 1.0, knock: 1.2, tip: 5, long: 1.55, hip: 0.65, trip: 4, shin: 0.62, dur: 0.85, hurdle: 0.8 };   // m/s, m/s into a sign, m, s on the floor before you can get up, s getting up, m/s knocked back, how fast you go over, m head to feet, m head to hips, m/s to trip on something, how far above your feet its top can be and only catch your legs, s to go over, how high a thing you go flying over on a trip
const FALL_WHY = { slam: "That wall's not going anywhere", drop: "Further down than it looked", drunk: "The floor came up to meet you", trip: "Watch your step" };
let fall = null;
function lowBlocker(x, z) {                      // what's in the way here, if it's all low enough to catch only your legs; otherwise null (a wall's a wall)
  if (player.onRoof || player.inBooth) return null;
  const r = player.r, feet = player.airH + floorHeightAt(x, z); let low = null;
  for (const c of colliders) if (!c.staff && x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) {
    if (c.y1 != null && feet >= c.y1 - 0.02) continue;   // (already over it)
    if (c.y1 == null || c.y1 - feet > FALL.shin || (c.y0 != null && c.y0 > feet + 0.3)) return null;
    low = c;
  }
  return low;
}
function fallStart(why, kx = 0, kz = 0, over = null) {   // over: tripped on it. Headfirst, along (kx, kz)
  if (fall) return;
  if (mantle) { mantle = null; me.reachTo(null); me.reachAlso(null); }
  jump.air = false; jump.v = jump.vx = jump.vz = 0; jump.peak = null;
  const lx = -Math.sin(player.yaw), lz = -Math.cos(player.yaw), toward = kx * lx + kz * lz > 0;   // (backwards: away from what you hit, or just back; a trip: along)
  const kl = Math.hypot(kx, kz), ux = over ? kx / kl : kl && !toward ? kx / kl : -lx, uz = over ? kz / kl : kl && !toward ? kz / kl : -lz;
  fall = { stage: "drop", t: 0, v: 0, tilt: 0, a: 0, k: 0, a0: 0, plan: null, ux, uz, yaw0: player.yaw, fX: player.x, fZ: player.z, fY: playerFloor(), start: { x: player.x, z: player.z }, prone: !!over, roll: (Math.random() < 0.5 ? -1 : 1), why, vx: kx * FALL.knock, vz: kz * FALL.knock, drunk: drunk.lvl > 0, feet: { x: player.x, z: player.z } };
  me.slip(); ambStep(player.x, player.z, 1);
}
function withRadius(r, test) { const was = player.r; player.r = r; try { return test(); } finally { player.r = was; } }
function bodyBlocked(x, z, fx, fz, tilt = 1) {    // head at x, z; the torso from there on toward the feet, as far over as you've gone
  const at = d => d * tilt;
  return withRadius(0.14, () => blocked(x, z)) || withRadius(0.2, () => blocked(x + fx * at(0.35), z + fz * at(0.35)) || blocked(x + fx * at(FALL.hip), z + fz * at(FALL.hip)));
}
function bodyBend(x, z, fx, fz, ry) {             // -> how the legs and arms have to fold, for what's there: head at x, z
  const hipX = x + fx * FALL.hip, hipZ = z + fz * FALL.hip; let legs = null;
  withRadius(0.06, () => { for (let d = 0.25; d <= 0.9; d += 0.13) if (blocked(hipX + fx * d, hipZ + fz * d)) { legs = Math.max(0.27, d - 0.13); break; } });
  const sx = Math.cos(ry), sz = -Math.sin(ry), sh = (s, d) => withRadius(0.05, () => blocked(x + fx * 0.3 + sx * s * d, z + fz * 0.3 + sz * s * d));   // (the body's own x, across it)
  return { legs, arm0: sh(ARM0_SIDE, 0.4) ? 1 : 0, arm1: sh(-ARM0_SIDE, 0.4) ? 1 : 0 };
}
const ARM0_SIDE = -1;                             // (which side of a body its first arm's on: its own -x)
// Where you end up is worked out when you hit the ground, from what's actually there: your body's a straight line, feet to head, and it has to lie
// on things, not through them. Flat on the floor if there's room; across whatever's low enough to land on; slid or turned a little if that's what
// fits; slumped against it if nothing does. Then the fall just plays out to there
function fallSurface(x, z, r = 0.12) {            // the height of what's here, in the world: Infinity for what you can't lie on
  const was = player.airH; player.airH = 1e4; const wall = withRadius(r, () => blocked(x, z)); player.airH = was;   // (as high as it goes: only what has no top stops it)
  if (wall) return Infinity;
  if (player.onRoof || player.inBooth) return playerFloor();
  let top = floorHeightAt(x, z);
  const over = c => x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r && !c.staff && !(c.y0 != null && c.y0 > top + 1.9);
  for (const c of colliders) if (over(c) && c.y1 > top) top = c.y1;
  for (const c of fallTops) if (over(c) && c.y1 > top) top = c.y1;
  return top;
}
function fallFit(fx, fz, ux, uz, feetY) {         // a straight body from these feet, this way: -> how far along, and how far up or down its head is; null if it won't go
  let hd = FALL.long, dy = 0;
  for (let i = 0; i < 3; i++) {
    const s = fallSurface(fx + ux * hd, fz + uz * hd); if (s === Infinity) return null;
    dy = s + 0.1 - feetY; if (Math.abs(dy) > FALL.long * 0.85) return null;
    hd = Math.sqrt(FALL.long * FALL.long - dy * dy);
  }
  for (let d = 0.14; d < hd; d += 0.12) { const s = fallSurface(fx + ux * d, fz + uz * d, 0.15); if (s > feetY + dy * d / hd + 0.05) return null; }
  return { hd, dy };
}
function fallPlan(F) {                            // -> { x, z, y (the feet), a (from upright: past 90 degrees is head down), ux, uz, lean }
  const p = { x: F.fX, z: F.fZ }, base = Math.atan2(F.ux, F.uz), tries = [];
  let clearTo = 0, hop = 0;                       // a trip: you go flying, level, clean over whatever's low in the way, and come down past it. As far as that goes, and how high
  if (F.prone) for (let d = 0.05; d <= 1.7; d += 0.05) {
    const h = fallSurface(p.x + F.ux * d, p.z + F.uz * d, 0.15); if (h === Infinity || h > F.fY + FALL.hurdle) break;
    if (h > F.fY + 0.05) { clearTo = d + 0.2; hop = Math.max(hop, h - F.fY); }
  }
  for (const turn of [0, 0.35, -0.35, 0.7, -0.7, 1.1, -1.1]) for (const s of F.prone ? [clearTo, clearTo + 0.25, clearTo + 0.5, clearTo + 0.8, clearTo - 0.3, -0.3, -0.6] : [0, -0.3, -0.6, -0.9, -1.2]) tries.push({ turn, s, cost: Math.abs(turn) * 0.8 + Math.abs(s - clearTo) });   // (s: how far along your feet come down)
  tries.sort((a, b) => a.cost - b.cost);
  for (const { turn, s } of tries) {
    const ux = Math.sin(base + turn), uz = Math.cos(base + turn), sx = Math.sin(base), sz = Math.cos(base), x = p.x + sx * s, z = p.z + sz * s, feetY = fallSurface(x, z);
    if (feetY === Infinity || feetY > F.fY + (F.prone && s > 0 ? FALL.shin + 0.05 : 0.12)) continue;   // (your feet only go up onto what you tripped over)
    if (s) { let ok = true; for (let d = 0.15; d < Math.abs(s); d += 0.15) if (fallSurface(p.x + sx * Math.sign(s) * d, p.z + sz * Math.sign(s) * d) === Infinity) ok = false; if (!ok) continue; }   // (nothing to slide them through)
    const fit = fallFit(x, z, ux, uz, feetY);
    if (fit) return { x, z, y: feetY, a: Math.acos(Math.max(-1, Math.min(1, fit.dy / FALL.long))), ux, uz, lean: false, hop: hop && s > 0 ? hop + 0.3 : 0 };
  }
  let a = Math.PI / 2;                            // nowhere to lie: as far over as there's room, against whatever it is
  for (let d = 0.1; d <= FALL.long; d += 0.1) {
    const s = fallSurface(p.x + F.ux * d, p.z + F.uz * d, 0.14);
    if (s === Infinity) { a = Math.min(a, Math.asin(Math.max(0.1, d - 0.16) / FALL.long)); break; }
    if (s - F.fY > 0.1) a = Math.min(a, Math.atan2(d, s + 0.08 - F.fY));
  }
  return { x: p.x, z: p.z, y: F.fY, a: Math.max(0.12, a), ux: F.ux, uz: F.uz, lean: true };
}
function fallPose(F) {                            // the feet and the angle decide where your head, so you, are
  const L = FALL.long * Math.sin(F.a); player.x = F.fX + F.ux * L; player.z = F.fZ + F.uz * L; F.tilt = Math.min(1, F.a / (Math.PI / 2));
}
function fallTick(dt) {
  const F = fall, s = k => k * k * (3 - 2 * k);
  if (F.prone && F.stage !== "up") player.pitch += (-0.95 - player.pitch) * Math.min(1, dt * 3.5);   // the floor coming up at you
  if (F.stage === "drop" && !F.plan) {            // still in the air: on down, the way you were going, starting to go over
    const land = groundUnder(player.x, player.z);
    if (player.airH > land + 0.02) {
      F.v -= FALL.g * dt; player.airH += F.v * dt;
      for (const [dx, dz] of [[F.vx * dt, 0], [0, F.vz * dt]]) if ((dx || dz) && !withRadius(0.14, () => blocked(player.x + dx, player.z + dz))) { player.x += dx; player.z += dz; }
      F.a = Math.min(0.5, F.a + dt * 1.2); F.tilt = F.a / (Math.PI / 2);
      const L = FALL.long * Math.sin(F.a); F.fX = player.x - F.ux * L; F.fZ = player.z - F.uz * L; F.fY = playerFloor();
      return;
    }
    player.airH = Math.max(land, 0); const L = FALL.long * Math.sin(F.a); F.fX = player.x - F.ux * L; F.fZ = player.z - F.uz * L; F.fY = playerFloor();
    F.plan = fallPlan(F); F.k = 0; F.a0 = F.a; F.from = { x: F.fX, z: F.fZ, y: F.fY, ux: F.ux, uz: F.uz }; player.airH = 0;
  }
  if (F.stage === "drop") {                       // slowly at first, then all at once, like anything tipping over
    const P = F.plan, O = F.from; F.k = Math.min(1, F.k + dt / FALL.dur);
    const m = F.prone ? s(F.k) : s(Math.min(1, F.k * 1.6)), e = F.prone ? s(Math.min(1, F.k * 1.35)) : F.k * F.k;   // (a trip: level early, flying)
    F.a = F.a0 + (P.a - F.a0) * e; F.fX = O.x + (P.x - O.x) * m; F.fZ = O.z + (P.z - O.z) * m; F.fY = O.y + (P.y - O.y) * m + (P.hop || 0) * Math.sin(Math.PI * F.k);
    const ux = O.ux + (P.ux - O.ux) * m, uz = O.uz + (P.uz - O.uz) * m, n = Math.hypot(ux, uz) || 1; F.ux = ux / n; F.uz = uz / n;
    fallPose(F);
    if (F.k >= 1) { F.stage = "down"; F.t = 0; jump.dip = 0.08; ambStep(player.x, player.z, 1); toast(`${F.why}. Move or press Space to get up`); }
    return;
  }
  F.t += dt;
  if (F.stage === "down") {
    if (F.t >= FALL.lie && ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].some(k => keys.has(k))) {
      F.stage = "up"; F.t = 0; F.a1 = F.a; F.from = { x: F.fX, z: F.fZ, y: F.fY };
      const L = FALL.long * Math.sin(F.a), spots = [0, FALL.hip, 0.3, 1.0, L].map(d => [F.fX + F.ux * d, F.fZ + F.uz * d]).concat([[F.start.x, F.start.z]]);   // up where your feet are, or wherever along you there's room to stand
      F.to = spots.map(([x, z]) => { const top = fallSurface(x, z), air = top === Infinity ? 0 : Math.max(0, top - floorHeightAt(x, z)); player.airH = air; const ok = top !== Infinity && !blocked(x, z); player.airH = 0; return ok ? { x, z, air } : null; }).find(Boolean) || { x: F.start.x, z: F.start.z, air: 0 };
    }
    return;
  }
  const T = FALL.up * (F.drunk ? 1.7 : 1), k = s(Math.min(1, F.t / T));
  if (F.prone) player.pitch += (0 - player.pitch) * Math.min(1, dt * 3);
  F.a = F.a1 * (1 - k); F.fX = F.from.x + (F.to.x - F.from.x) * k; F.fZ = F.from.z + (F.to.z - F.from.z) * k; F.fY = F.from.y + (F.to.air + floorHeightAt(F.to.x, F.to.z) - F.from.y) * k;
  fallPose(F);
  if (F.t >= T) { player.x = F.to.x; player.z = F.to.z; player.airH = F.to.air; fall = null; jump.recover = 0.25; me.setBend(); }
}
function fallEye() {                              // (main loop) how high your eye is, while you're down: above the floor you're over
  const F = fall, c = Math.cos(F.a), n = Math.sin(F.a);
  return F.fY + 1.65 * c + 0.3 * n * n - playerFloor();
}
function hangerAt(x, z, feet = player.airH + floorHeightAt(x, z), eye = eyeY) {   // your head, in a hanging sign, if you were here
  if (player.onRoof || player.inBooth) return null;
  const head = feet + eye + 0.17, r = 0.15;
  return hangers.find(h => head >= h.y0 && feet < h.y1 && x > h.x0 - r && x < h.x1 + r && z > h.z0 - r && z < h.z1 + r) || null;
}
function eyeRoom() {                              // (main loop) stood up under a sign: only as tall as there's room for. How high your eye can go
  if (player.onRoof || player.inBooth) return 1.65;
  const feet = playerFloor(), r = 0.15, h = hangers.find(h => feet < h.y1 && player.x > h.x0 - r && player.x < h.x1 + r && player.z > h.z0 - r && player.z < h.z1 + r);
  return h ? Math.max(0.9, h.y0 - feet - 0.17 - 0.01) : 1.65;
}
function drunkTopple(dt) {                        // drunk and up on something: not for long
  if (!drunk.lvl || fall || mantle || jump.air || drunk.out) return;
  const up = ladder.on ? 2 : player.airH > 0.25 ? 1 : 0; if (!up) return;
  if (Math.random() < dt * [0, 0.15, 0.6, 1.5][Math.min(3, drunk.lvl)] * up) {
    const h = ladder.on ? LADDER.STEP * ladder.lift : player.airH;
    if (ladder.on) { ladderDown(); player.airH = h; }
    fallStart(FALL_WHY.drunk, -Math.sin(player.yaw), -Math.cos(player.yaw));
  }
}
function jumpTick(dt) {                          // up and down, and on at the speed you left the ground; -> whether you're off it
  if (jump.recover > 0) jump.recover -= dt;
  jump.dip = Math.max(0, jump.dip - dt * 0.55);
  if (!jump.air && !player.airH) return false;
  const under = groundUnder(player.x, player.z);
  if (!jump.air && player.airH > under + 0.01) { jump.air = true; jump.v = 0; jump.peak = player.airH + floorHeightAt(player.x, player.z); }   // walked off the edge of it
  if (!jump.air) { player.airH = under; return false; }
  player.airH += jump.v * dt; jump.v -= JUMP.g * dt;
  jump.peak = Math.max(jump.peak ?? -Infinity, playerFloor());
  const speed = Math.hypot(jump.vx, jump.vz), sign = hangerAt(player.x, player.z) || hangerAt(player.x + jump.vx * dt, player.z + jump.vz * dt);
  if (sign) {                                    // into a hanging sign: how fast decides how much it matters
    if (Math.hypot(speed, jump.v) >= FALL.bonk) { fallStart(`Right in the ${sign.name}`, speed ? -jump.vx / speed : 0, speed ? -jump.vz / speed : 0); return false; }
    if (jump.v > 0 && hangerAt(player.x, player.z)) { player.airH -= jump.v * dt; jump.v = 0; }   // a bump on the head, and back down
  }
  const hitX = blocked(player.x + jump.vx * dt, player.z), hitZ = blocked(player.x, player.z + jump.vz * dt);
  if ((hitX || hitZ) && speed >= FALL.trip) {     // clipped something low with your legs, in the air
    const low = lowBlocker(player.x + jump.vx * dt, player.z + jump.vz * dt) || lowBlocker(player.x + jump.vx * dt, player.z) || lowBlocker(player.x, player.z + jump.vz * dt);
    if (low && !mantleFind(jump.vx / speed, jump.vz / speed)) { fallStart(FALL_WHY.trip, jump.vx / speed, jump.vz / speed, low); return false; }
  }
  if ((hitX || hitZ) && speed >= FALL.slam && !mantleFind(jump.vx / speed, jump.vz / speed)) {   // flat out into something there's no getting over
    fallStart(FALL_WHY.slam, -jump.vx / speed, -jump.vz / speed); return false;
  }
  if (hitX) jump.vx = 0; else player.x += jump.vx * dt;
  if (hitZ) jump.vz = 0; else player.z += jump.vz * dt;
  const land = groundUnder(player.x, player.z);
  if (jump.v < 0 && player.airH <= land) {
    const dropped = jump.peak - (land + floorHeightAt(player.x, player.z)); jump.peak = null;
    if (dropped >= FALL.drop) { player.airH = land; jump.air = false; fallStart(FALL_WHY.drop, 0, 0); return false; }   // (further than knees take)
    jump.dip = Math.min(0.11, -jump.v * 0.035); player.airH = land; jump.air = false; jump.recover = JUMP.recover;   // the knees take it
    ambStep(player.x, player.z, Math.min(1, 0.45 - jump.v * 0.12));
  }
  return jump.air;
}
function move(dt) {
  if (seated || onStool || ladder.on || roof.climb) { player.airH = 0; jump.air = false; jump.vx = jump.vz = 0; }
  const f = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const rt = new THREE.Vector3(-f.z, 0, f.x);
  let ix = 0, iz = 0;
  if (document.pointerLockElement !== canvas || roof.climb || cm.term || cm.sleeping || arcade.on) return;
  drunkTopple(dt);
  if (fall) return fallTick(dt);
  if (onStool) {                            // E spins you; a move key gets you up
    if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].some(k => keys.has(k))) stoolStand();
    return;
  }
  if (ladder.on) {                          // a move key gets you down (not mid-swap)
    if (!ladder.fix && ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].some(k => keys.has(k))) ladderDown();
    return;
  }
  if (mantle) return mantleTick(dt);
  if (doorStep) return doorStepTick(dt);
  const airborne = jumpTick(dt);
  if (fall) return;
  if (seated || inspecting || scrub || drunk.out || golf.on) return;   // stand up with E first; (scrubbing: you stay put till it's done)
  if (keys.has("KeyW") || keys.has("ArrowUp")) iz += 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) iz -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) ix += 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) ix -= 1;
  if (airborne) {                                // a little give in the air, no more: you go where you jumped
    if (iz > 0) { const to = mantleFind(f.x, f.z); if (to) return mantleStart(to, f.x, f.z); }
    if (ix || iz) { const L = Math.hypot(ix, iz), k = JUMP.airControl * dt / L; jump.vx += (f.x * iz + rt.x * ix) * k; jump.vz += (f.z * iz + rt.z * ix) * k; }
    return;
  }
  if (!ix && !iz) { jump.vx = jump.vz = 0; return; }
  const sp = ((keys.has("ShiftLeft") || keys.has("ShiftRight")) ? 5.2 * (has("you", "con", 5) ? 1.15 : 1) : 3.1) * (1 + 0.02 * (lv("you", "con") - 1));   // (CON: quicker on your feet; Second Wind)
  const crouched = keys.has("KeyC");
  const spd = sp * (crouched ? 0.55 : 1) * (hungover() ? 0.75 : 1) * (jump.recover > 0 ? 0.6 : 1);
  const dx = (f.x * iz + rt.x * ix) * spd * dt, dz = (f.z * iz + rt.z * ix) * spd * dt;
  { const sign = spd >= FALL.bonk && hangerAt(player.x + dx, player.z + dz); if (sign) { const L = Math.hypot(dx, dz); return fallStart(`Right in the ${sign.name}`, -dx / L, -dz / L); } }   // at a run. A walk, it just stops you
  jump.vx = dx / dt; jump.vz = dz / dt;           // (what you'd take off with)
  const x0 = player.x, z0 = player.z, top = !player.inBooth && floorHeightAt(x0, z0) > TALL.booth - 0.1;
  const stuck = blocked(x0, z0);                 // (somewhere you can't be, however you got there: any way out goes)
  if (!stuck && spd >= FALL.trip && (dx || dz)) { const low = (blocked(x0 + dx, z0 + dz) && lowBlocker(x0 + dx, z0 + dz)) || (blocked(x0 + dx, z0) && lowBlocker(x0 + dx, z0)) || (blocked(x0, z0 + dz) && lowBlocker(x0, z0 + dz)), L = Math.hypot(dx, dz); if (low) return fallStart(FALL_WHY.trip, dx / L, dz / L, low); }   // at a run, your legs on something low. A walk, it just stops you
  if (stuck || !blocked(player.x + dx, player.z)) player.x += dx;
  if (stuck || !blocked(player.x, player.z + dz)) player.z += dz;
  if (top && player.x < SHAFT.x0) player.inBooth = true;                    // off the stairs' top into the booth,
  else if (player.inBooth && player.x > BOOTH.x1 + 0.15) player.inBooth = false;   // and back out onto it
  const walked = Math.hypot(player.x - x0, player.z - z0); if ((walkXp += walked) > 12) { walkXp = 0; gainXp("you", "con", 1); }
  if ((playerStepD += walked) > (sp > 4 ? 0.95 : 0.72)) { playerStepD = 0; ambStep(player.x, player.z, crouched ? 0.35 : 0.6); }   // your own, quieter (you're wearing sneakers)
}
let playerStepD = 0, walkXp = 0;
function ambStep(x, z, w) {                      // tile at the front and in back of house; carpet elsewhere; outdoors, paving, and whatever the weather's left on it
  const out = !player.inBooth && (player.onRoof || !(inBuilding(x, z) || tonyIn(x, z)));
  window.StoreAmbience?.step(x, z, out || z < 4.35 || (z > STORE.z && x > BOH.x0 && z < BOH.z1), w, !out ? null : WX.cover > 0.18 ? "snow" : WX.wet > 0.22 ? "wet" : null);
}

// ---------------- picking / inspecting ----------------
const raycaster = new THREE.Raycaster();
const tvRay = new THREE.Raycaster();
function tvScreenHit() {                     // crosshair on the main TV screen -> its point on the 480x320 screen canvas
  tvRay.setFromCamera({ x: 0, y: 0 }, camera);
  const h = tvRay.intersectObject(screenMesh, false)[0];
  return h && h.distance < 9 ? { x: h.uv.x * videoCanvas.width, y: (1 - h.uv.y) * videoCanvas.height } : null;
}
const highlight = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(TAPE.w, TAPE.h, TAPE.d)),
  new THREE.LineBasicMaterial({ color: YELLOW }));
highlight.visible = false;                 // turned per tape to match its shelf (tape.ry)
scene.add(highlight);
let aimStool = false, aimPickup = null, aimTony = null, aimBed = false, aimFireExit = null, aimExitDoor = null;          // aimPickup: something to find (customer mode: see PICKUPS)
let aimPostit = null, aimNotepad = false;          // a post-it by the phone / the pad by the register
let aimBlinds = null, aimSec = null, hovered = null, held = null, heldSnack = null, aimTV = false, aimLamp = null, aimCouch = false, aimReturns = false, aimSnack = null, aimFlap = null, aimCooler = false, aimPop = null, aimTrash = false, aimDoor = null, aimPOS = false, aimSlot = false, aimRewinder = null, aimBell = false, aimDesens = false, aimCutout = false, aimCustomer = false, aimLock = false, aimEmp = false, aimSwitch = null, aimDrawer = false, aimSeatObj = null, aimExit = false, aimPrinter = false, aimStockSlot = null, aimCupboard = null, aimBox = null, aimMess = null, aimStray = null, aimPhone = false, aimHolds = false, aimBoard = false, aimMove = null, aimToilet = false, aimSink = false, aimTowels = false, aimBin = null, aimBag = null, aimChute = false, aimTool = null, aimDead = null, aimLadder = false, aimLadderHome = false;   // aimSeatObj: the theater seat aimed at (null = a couch cushion)
let returnBin = [];                          // tapes dropped in the returns slot — carry-only, never auto-reshelved
// a tape you're only looking at — held up straight off a shelf or out of
// Returns, not taken yet: right-click puts it right back where it came from.
// Once it's taken (click to tuck, or swapping to another item) it's yours to
// carry and has to be put back properly
let peek = null, peekSrc = null;             // peekSrc: "shelf" | "bin"
let flapOpen = false;
function toggleFlap() {
  if (flapOpen) {                            // trying to close it — refuse if you're standing in the gap
    const c = flapCollider;
    if (player.x > c.x0 - player.r && player.x < c.x1 + player.r && player.z > c.z0 - player.r && player.z < c.z1 + player.r) return;
  }
  flapOpen = !flapOpen;
  const i = colliders.indexOf(flapCollider);
  if (flapOpen && i >= 0) colliders.splice(i, 1);   // swung up — walk through
  else if (!flapOpen && i < 0) colliders.push(flapCollider);   // back down — flush with the counters again
}
function playerIn(c) { return player.x > c.x0 - player.r && player.x < c.x1 + player.r && player.z > c.z0 - player.r && player.z < c.z1 + player.r; }
// a push door: whoever's in the doorway (you, a customer, Dana) swings it away
// from the side they came in on; once they're through it springs shut, swinging
// past center a few times before it settles, like a real double-acting door
function pushDoorTick(d, dt) {
  if (d.locked) { d.a = d.v = 0; d.side = 0; d.pivot.rotation.y = d.base; return; }   // chained shut
  dt = Math.min(dt, 0.05);
  const bodies = [[player.x, player.z]];
  for (const k of custs) if (k.c) bodies.push([k.c.group.position.x, k.c.group.position.z]);
  for (const e of staff) if (e.c) bodies.push([e.c.group.position.x, e.c.group.position.z]);
  let near = null;                              // across-the-wall offset of whoever's closest to the threshold
  for (const [x, z] of bodies) {
    const along = (d.alongX ? x : z) - d.c, across = (d.alongX ? z : x) - d.at;
    if (Math.abs(along) < DOOR_W / 2 + 0.2 && Math.abs(across) < 0.8 && (near === null || Math.abs(across) < Math.abs(near))) near = across;
  }
  if (near === null) d.side = 0;
  else if (!d.side) { d.side = -Math.sign(near) || 1; if (Math.abs(d.a) < 0.15) doorSnd(d, "push", "open"); }   // opens away from them; holds that way until the doorway's clear
  const target = d.side ? Math.PI / 2 * 0.95 * d.hinge * (d.alongX ? d.side : -d.side) : 0;
  d.v += ((d.side ? 90 : 30) * (target - d.a) - (d.side ? 16 : 2.2) * d.v) * dt;   // pushed: quick and firm; let go: a loose spring
  d.a += d.v * dt;
  if (Math.abs(d.v) > 0.4) d.moving = true;
  if (!d.side && Math.abs(d.a) < 0.002 && Math.abs(d.v) < 0.01) { d.a = 0; d.v = 0; if (d.moving) { d.moving = false; doorSnd(d, "push", "settle"); } }
  window.StoreAmbience?.swing(d, ...doorAt(d), Math.abs(d.v));
  d.pivot.rotation.y = d.base + d.a;
}
const doorAt = d => [(d.shut.x0 + d.shut.x1) / 2, 1.05, (d.shut.z0 + d.shut.z1) / 2];
const doorSnd = (d, kind, action) => window.StoreAmbience?.door(kind, action, ...doorAt(d));
// ---- out of a door's way: the quarter circle its leaf sweeps, on the side it swings to. In the wall's
// terms, u runs from the hinge along the doorway, v out from the wall on the swing side ----
function doorUV(d, x, z) {
  const along = d.alongX ? x : z, perp = d.alongX ? z : x, hp = d.c + d.hinge * d.W / 2;
  return { u: (along - hp) * -d.hinge, v: (perp - d.at) * d.swing };
}
function inDoorSweep(d, x, z, pad) {           // (a square round it, not the arc: anywhere in front of the leaf counts, however you stand)
  const { u, v } = doorUV(d, x, z);
  return u > -pad && u < d.W + pad && v > -0.1 && v < d.W + pad;
}
// ---- the door dance: you step back as the door starts to swing, it swings past you, and once it's
// settled you step back in to where you were. One timeline drives both (DOOR_DANCE, in seconds) ----
const DOOR_DANCE = { swing: [0, 0.63], back: [0.16, 0.45], home: [0.47, 0.9] };   // (you start back with the door ~15% open, and start in again at ~85%)
const danceEase = (t, [a, b]) => { const k = Math.max(0, Math.min(1, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
let doorStep = null;                          // { d, x0, z0, x1, z1, a0, t }: mid-dance (see move, and the door loop in main.js)
function doorStepBack(d) {                    // straight back from the wall, the way the door opens, to just past its reach; where you stand along the wall stays put
  if (doorStep || jump.air || fall || mantle || seated || onStool || ladder.on) return false;
  const perp = d.at + d.swing * (d.W + player.r + (d.stall ? 0.05 : 0.15));   // (a stall's tight: just clear of its door, short of the toilet)
  doorStep = { d, x0: player.x, z0: player.z, x1: d.alongX ? player.x : perp, z1: d.alongX ? perp : player.z, a0: d.a, t: 0 };
  return true;
}
const doorDanceA = (s, want) => s.a0 + (want - s.a0) * danceEase(s.t, DOOR_DANCE.swing);   // the door's angle, mid-dance
function doorStepTick(dt) {                   // you, through the usual collisions: back out, a beat, back in
  const s = doorStep; s.t += dt;
  if (s.t > DOOR_DANCE.swing[1] && ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].some(k => keys.has(k))) { doorStep = null; return; }   // (the door's done: walking off cuts the bow short)
  const k = danceEase(s.t, DOOR_DANCE.back) - danceEase(s.t, DOOR_DANCE.home);
  const tx = s.x0 + (s.x1 - s.x0) * k, tz = s.z0 + (s.z1 - s.z0) * k, x0 = player.x, z0 = player.z;
  if (!blocked(tx, player.z)) player.x = tx;
  if (!blocked(player.x, tz)) player.z = tz;
  if ((playerStepD += Math.hypot(player.x - x0, player.z - z0)) > 0.45) { playerStepD = 0; ambStep(player.x, player.z, 0.5); }
  if (s.t >= DOOR_DANCE.home[1]) doorStep = null;
}
// a door on a closer (the restrooms'): open, it swings itself shut once nobody's been in its way for a moment
function doorCloserTick(d, dt) {
  if (!d.open || doorStep?.d === d) { d.closeT = 0; return; }
  const pad = 0.45, cx = (d.shut.x0 + d.shut.x1) / 2, cz = (d.shut.z0 + d.shut.z1) / 2;
  const inWay = (x, z) => inDoorSweep(d, x, z, pad) || Math.hypot(x - cx, z - cz) < 1.2;
  const near = inWay(player.x, player.z) || custs.some(k => k.c && inWay(k.c.group.position.x, k.c.group.position.z))
    || staff.some(e => e.c && inWay(e.c.group.position.x, e.c.group.position.z)) || (together.peer?.c && inWay(together.peer.c.group.position.x, together.peer.c.group.position.z));
  if (near) d.closeT = 0; else if ((d.closeT = (d.closeT || 0) + dt) > 1.5) { d.closeT = 0; toggleDoor(d); d.selfShut = true; }
}
function toggleDoor(d) {
  if (d.push) return;                        // push doors aren't opened, they're walked through
  if (d.locked) { d.rattle = 0.35; doorSnd(d, "wood", "rattle"); return; }   // just jiggles in its frame
  const next = d.open ? d.shut : d.openBox;
  if (d.open && playerIn(next)) return;      // you're standing in the doorway
  const backed = inDoorSweep(d, player.x, player.z, player.r) && doorStepBack(d);   // it'd swing through you: you step back out of its way first
  if (!backed && !d.open && playerIn(next)) return;   // (nowhere to step back to, and right where it opens to: it doesn't)
  colliders.splice(colliders.indexOf(d.open ? d.openBox : d.shut), 1);
  colliders.push(next);
  d.open = !d.open;
  if (d.open) doorSnd(d, "wood", "open"); else d.closing = true;   // (the thump comes when it meets the frame)
}
// ---- carrying the standee: E lifts it off the floor and it rides ~1.3 m in
// front of you, turned to face you (walk around it to choose its angle). E sets
// it down if its footprint is clear, you're not in it, and nothing solid sits
// between you and the spot; otherwise it tints red and stays in your arms ----
const CARRY_D = 1.3, cutoutTint = new THREE.Color();
let cutoutSpot = null;                       // where it'd land this frame, or null if it won't fit there
function cutoutSpotAhead() { return carrySpotAhead(CARRY_D, (x, z, ry) => cutoutFit(x, z, ry, {})); }
function carrySpotAhead(dist, fit) {           // a spot `dist` ahead for something carried: its footprint clear, and reachable
  const x = player.x - Math.sin(player.yaw) * dist, z = player.z - Math.cos(player.yaw) * dist, ry = player.yaw;
  const b = fit(x, z, ry);
  const clear = !colliders.some(c => c.x0 < b.x1 && c.x1 > b.x0 && c.z0 < b.z1 && c.z1 > b.z0) && !playerIn(b);
  const inside = (px, pz) => colliders.some(c => px > c.x0 && px < c.x1 && pz > c.z0 && pz < c.z1);
  let reach = true;
  for (let i = 1; i <= 8 && reach; i++) reach = !inside(player.x + (x - player.x) * i / 8, player.z + (z - player.z) * i / 8);
  return { x, z, ry, ok: clear && reach };
}
function cutoutCarryTick() {
  if (!cutout.carried || !cutout.g) return;
  const s = cutoutSpotAhead();
  cutoutSpot = s.ok ? s : null;
  cutout.g.position.set(s.x, 0.04, s.z); cutout.g.rotation.y = s.ry;   // lifted just off the floor
  cutoutTint.set(s.ok ? 0xffffff : 0xff5a5a);
  cutout.g.traverse(o => {
    if (!o.isMesh) return;
    o.userData.baseColor ??= o.material.color.clone();
    o.material.color.copy(o.userData.baseColor).multiply(cutoutTint);
  });
}
function cutoutSeeThrough(on) {                // life-size and facing you: see-through while carried so you can see where you're going
  cutout.g.traverse(o => { if (o.isMesh) { o.material.transparent = on; o.material.opacity = on ? 0.45 : 1; o.material.depthWrite = !on; o.material.needsUpdate = true; } });
}
// the stool, carried the same way: held just ahead of you, a little off the
// floor, red where it won't fit; E sets it down
const stoolTint = new THREE.Color();
function stoolCarryTick() {
  if (!stool.carried) return;
  const s = carrySpotAhead(STOOL.CARRY_D, (x, z) => stoolFit(x, z, {}));
  stool.spot = s.ok ? s : null;
  stool.g.position.set(s.x, 0.08, s.z);
  stoolTint.set(s.ok ? 0xffffff : 0xff5a5a);
  stool.g.traverse(o => {                       // its materials are shared between parts: keep the base color on the material
    if (!o.isMesh) return;
    o.material.userData.baseColor ??= o.material.color.clone();
    o.material.color.copy(o.material.userData.baseColor).multiply(stoolTint);
  });
}
function stoolPickUp() {
  stool.carried = true; stool.vel = 0;
  colliders.splice(colliders.indexOf(stool.box), 1);
}
function stoolPutDown() {
  if (!stool.spot) return;
  Object.assign(stool, { x: stool.spot.x, z: stool.spot.z, carried: false });
  stool.g.position.set(stool.x, 0, stool.z);
  stool.g.traverse(o => { if (o.isMesh && o.material.userData.baseColor) o.material.color.copy(o.material.userData.baseColor); });
  colliders.push(stoolFit(stool.x, stool.z, stool.box));
}
function cutoutPickUp() {
  cutout.carried = true; cutoutSeeThrough(true);
  colliders.splice(colliders.indexOf(cutout.box), 1);
  tvBake = bakeTvVis();                      // its shadow on the TV light leaves with it
}
function cutoutPutDown() {
  if (!cutoutSpot) return;
  Object.assign(cutout, { x: cutoutSpot.x, z: cutoutSpot.z, ry: cutoutSpot.ry, carried: false });
  cutout.g.position.set(cutout.x, 0, cutout.z);
  cutout.g.traverse(o => { if (o.isMesh && o.userData.baseColor) o.material.color.copy(o.userData.baseColor); });
  cutoutSeeThrough(false);
  colliders.push(cutoutFit(cutout.x, cutout.z, cutout.ry, cutout.box));
  tvBake = bakeTvVis();
}
