// ---------------- player ----------------
const player = { x: 0, z: 2.6, yaw: Math.PI, pitch: 0, r: 0.32, inBooth: false };   // (inBooth: up in the projection booth, its floor over the lobby's)
let eyeY = 1.65;                            // eased toward standing/crouch height
camera.position.set(player.x, 1.65, player.z);
camera.rotation.y = player.yaw;
// your own body: a customer rig in the store uniform, with the TV head and neck hidden, since the
// camera is where they'd be. It stands a little behind the eye so looking
// down shows your chest, belly and feet; on the couch it takes Dana's sitting
// pose and the camera rides its head
const me = StoreCustomers.build({ ...StoreCustomers.randomOutfit(seeded(1985), false), height: 1, build: 1, hat: null,
  ...(CUSTOMER ? {} : { top: "uniform", topA: "#1b3fa0", topB: "#ffd400", longSleeves: false, pants: "khaki", pantsColor: "#b9a27a", shoes: "#1e1e1e" }) });   // Dana's uniform, no name tag (a customer: your own clothes)
me.rig.head.visible = false; me.rig.neck.visible = false;
me.walkLean = false;                        // the eye doesn't tip forward, so neither does the chest: the feet stay in view
scene.add(me.group);
const meLast = { x: player.x, z: player.z }, meEye = new THREE.Vector3();
function meTick(dt) {
  const g = me.group;
  let speed = 0;
  if (onStool) {
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
  if (document.pointerLockElement !== canvas) {   // paused / title screen: only the window-level keys
    if (e.code === "KeyF") document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    return;
  }
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
  if (e.code === "KeyF") document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
});
addEventListener("keyup", e => {
  keys.delete(e.code);
  mediaUp(e.code);
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
  if (document.pointerLockElement !== canvas || golf.on || arcade.on || fullVid.on) return;   // (golfing: the camera's the swing's; at the arcade machine, its screen; full screen on a tape: held still)
  if (mouseJumped(e.movementX, e.movementY)) return;   // (a move that never happened)
  lastActive = performance.now();
  if (held && inspecting) { tapeBoxMouse(e.movementX, e.movementY); return; }   // a tape held up: the mouse is on the box
  const k = 0.0022 * SETTINGS.sens / 100;   // (SETTINGS: sensitivity, invert)
  player.yaw -= e.movementX * k;
  player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch - e.movementY * k * (SETTINGS.invertY ? -1 : 1)));
});
function blocked(x, z) {
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
function move(dt) {
  const f = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const rt = new THREE.Vector3(-f.z, 0, f.x);
  let ix = 0, iz = 0;
  if (document.pointerLockElement !== canvas || roof.climb || cm.term || cm.sleeping || arcade.on) return;
  if (onStool) {                            // E spins you; a move key gets you up
    if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].some(k => keys.has(k))) stoolStand();
    return;
  }
  if (ladder.on) {                          // a move key gets you down (not mid-swap)
    if (!ladder.fix && ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].some(k => keys.has(k))) ladderDown();
    return;
  }
  if (seated || inspecting || scrub || drunk.out || golf.on) return;   // stand up with E first; (scrubbing: you stay put till it's done)
  if (keys.has("KeyW") || keys.has("ArrowUp")) iz += 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) iz -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) ix += 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) ix -= 1;
  if (!ix && !iz) return;
  const sp = ((keys.has("ShiftLeft") || keys.has("ShiftRight")) ? 5.2 * (has("you", "con", 5) ? 1.15 : 1) : 3.1) * (1 + 0.02 * (lv("you", "con") - 1));   // (CON: quicker on your feet; Second Wind)
  const crouched = keys.has("KeyC");
  const spd = sp * (crouched ? 0.55 : 1) * (hungover() ? 0.75 : 1);
  const dx = (f.x * iz + rt.x * ix) * spd * dt, dz = (f.z * iz + rt.z * ix) * spd * dt;
  const x0 = player.x, z0 = player.z, top = !player.inBooth && floorHeightAt(x0, z0) > TALL.booth - 0.1;
  const stuck = blocked(x0, z0);                 // (somewhere you can't be, however you got there: any way out goes)
  if (stuck || !blocked(player.x + dx, player.z)) player.x += dx;
  if (stuck || !blocked(player.x, player.z + dz)) player.z += dz;
  if (top && player.x < SHAFT.x0) player.inBooth = true;                    // off the stairs' top into the booth,
  else if (player.inBooth && player.x > BOOTH.x1 + 0.15) player.inBooth = false;   // and back out onto it
  const walked = Math.hypot(player.x - x0, player.z - z0); if ((walkXp += walked) > 12) { walkXp = 0; gainXp("you", "con", 1); }
  if ((playerStepD += walked) > (sp > 4 ? 0.95 : 0.72)) { playerStepD = 0; ambStep(player.x, player.z, crouched ? 0.35 : 0.6); }   // your own, quieter (you're wearing sneakers)
}
let playerStepD = 0, walkXp = 0;
const ambStep = (x, z, w) => window.StoreAmbience?.step(x, z, z < 4.35 || (z > STORE.z && x > BOH.x0 && z < BOH.z1), w);   // tile at the front and in back of house; carpet elsewhere

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
let aimStool = false, aimPickup = null, aimTony = null, aimBed = false, aimFireExit = null;          // aimPickup: something to find (customer mode: see PICKUPS)
let aimPostit = null, aimNotepad = false;          // a post-it by the phone / the pad by the register
let hovered = null, held = null, heldSnack = null, aimTV = false, aimLamp = null, aimCouch = false, aimReturns = false, aimSnack = null, aimFlap = null, aimCooler = false, aimPop = null, aimTrash = false, aimDoor = null, aimPOS = false, aimSlot = false, aimRewinder = null, aimBell = false, aimDesens = false, aimCutout = false, aimCustomer = false, aimLock = false, aimEmp = false, aimSwitch = null, aimDrawer = false, aimSeatObj = null, aimExit = false, aimPrinter = false, aimStockSlot = null, aimCupboard = null, aimBox = null, aimMess = null, aimStray = null, aimPhone = false, aimHolds = false, aimBoard = false, aimMove = null, aimToilet = false, aimSink = false, aimTowels = false, aimBin = null, aimBag = null, aimChute = false, aimTool = null, aimDead = null, aimLadder = false, aimLadderHome = false;   // aimSeatObj: the theater seat aimed at (null = a couch cushion)
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
function toggleDoor(d) {
  if (d.push) return;                        // push doors aren't opened, they're walked through
  if (d.locked) { d.rattle = 0.35; doorSnd(d, "wood", "rattle"); return; }   // just jiggles in its frame
  const next = d.open ? d.shut : d.openBox;
  if (playerIn(next)) return;                // you're standing where it would swing to
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
