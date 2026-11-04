// ---------------- hold a tape up to look at it ----------------
let inspecting = false;                      // true = box held up in view, false = carried in hand
let coverZoom = 1;                           // mouse-wheel zoom on the held-up cover (1-6x), reset per pickup
function releaseFromHand() {                 // clears the hand WITHOUT touching the shelf (TV insert / returns drop-off)
  held = null; inspecting = false; handGroup.visible = false; $("holdingTag").style.display = "none";
}
function pickup(tape) {                      // from a shelf slot OR out of the returns bin — either way, into your hand
  const h = tape.fromReturns && holdAlertFor(tape); if (h) toast(`ALERT: ${memberName(h.member)} is waiting on this one: holds shelf`);
  setOnShelf(tape, false);                   // gone from the shelf while it's in your hand
  showTape(tape); inspecting = true;
}
function showTape(tape) {                    // the tape in your hand (fresh pickup, or back out of the inventory)
  held = tape; inspecting = false;
  $("holdingTag").style.display = "block"; $("holdingName").textContent = tapeName(tape);
  $("inspectTitle").textContent = tapeName(tape); $("inspectSec").textContent = tape.newRelease ? `New Releases · ${tape.category}` : tape.category;   // where it goes back
  coverZoom = 1;
  handBody.material = tape.sideMat || mat.tapeBody;
  loadCoverTexture(tape, t => { handArt.material.map = t; handArt.material.needsUpdate = true; });
  handGroup.visible = true;
}
function putBack() {                         // back into its own shelf slot (aimed at it, or a just-looked-at tape via right-click)
  if (held) {
    shelveCheck(held); held.desens = false; setOnShelf(held, true);   // back on the shelf: tag re-armed
    gainXp("you", "int", held.fromReturns || held.strayFix ? 6 : 3);
    if (held.fromReturns) { held.fromReturns = false; shiftScore(5, "you"); logAct(`Reshelved ${held.title}`, "good", null, 5); }   // a return put away
    if (held.strayFix) { held.strayFix = false; shiftScore(10, "you"); logAct(`Put a misshelved ${held.title} back where it belongs`, "good", null, 10); if (CUSTOMER) cmHelped(held); }
  }
  releaseFromHand();
}

// ---------------- the store TV (plays what jellyfin.js streams from the server) ----------------
const video = $("vid"); video.volume = tvSet.volume / 100;
applyTv();                               // saved picture settings (pixelated filter, sharpen kernel), now the texture and the video both exist
Jelly.onTrouble = why => { $("nowPlaying").textContent = `⚠ ${why}`; };
// tape case that lands on the coffee table once something's in the TV —
// automatic: it just shows whatever's currently playing, no pickup/putBack
const tableBoxGroup = new THREE.Group();
tableBoxGroup.position.set(0, 0.368, TV.z - 1.8); tableBoxGroup.rotation.z = -Math.PI / 2;  // lies flat, art facing up
const tableBody = new THREE.Mesh(new THREE.BoxGeometry(TAPE.w, TAPE.h, TAPE.d), mat.tapeBody);
const tableArt = new THREE.Mesh(new THREE.PlaneGeometry(TAPE.d, TAPE.h), new THREE.MeshBasicMaterial({ color: 0x333333 }));
tableArt.rotation.y = -Math.PI / 2; tableArt.position.x = -TAPE.w / 2 - 0.001;
tableBoxGroup.add(tableBody, tableArt);
tableBoxGroup.visible = false;
scene.add(tableBoxGroup);
function showTableBox(tape) {
  tableBoxGroup.visible = true;
  tableBody.material = tape.sideMat || mat.tapeBody;
  loadCoverTexture(tape, t => { tableArt.material.map = t; tableArt.material.needsUpdate = true; });
}

let playing = null; // { tape, idx, eps }
// sat down and zoomed all the way in on a screen with a tape playing, one notch more: the picture full screen, edge to edge,
// the view held still; a notch back out (or getting up, or the tape coming out) and it's the room again
const fullVid = { on: false };
const FULL_AIM = 20 * Math.PI / 180;          // how far off a screen's middle you can be looking and still go full screen on it
const fullVidCam = new THREE.Vector3(), fullVidTo = new THREE.Vector3();
function fullVidAim() {                         // a tape's playing, and you're looking at a screen it's on
  if (!playing || !videoMat || screenMesh.material !== videoMat) return false;
  camera.getWorldDirection(fullVidCam);
  const on = [...miniScreens, ...(roof.cine?.on && roof.cine.sheet ? [roof.cine.sheet] : [])];
  return on.some(m => m.getWorldPosition(fullVidTo).sub(camera.position).angleTo(fullVidCam) < FULL_AIM);
}
function fullVidSet(on) {
  if (fullVid.on === on) return;
  fullVid.on = on; document.body.classList.toggle("fullvid", on); Jelly.captionsFullScreen(on);
  tvAudioRoute(); StoreAudio.silence(on);       // the plain sound of the tape: no store round it
}
function fullVidTick() { if (fullVid.on && (!seated || !playing || screenMesh.material !== videoMat)) fullVidSet(false); }
async function playEpisode(idx, tape = playing?.tape) {
  if (!tape) return;
  const eps = tape.seasons[0].episodes;
  idx = Math.max(0, Math.min(eps.length - 1, idx));
  const woundTo = tape.tapePos?.ep === idx ? tape.tapePos.t : 0;   // it plays from wherever it's wound to
  playing = { tape, idx, eps };
  tape.tapePos = { ep: idx, t: 0 };          // the tape winds forward as it plays (see the main loop)
  inspecting = false;                        // into the TV — box drops to your side
  const [itemId, epTitle] = eps[idx];
  const bits = epTitle.split(" - ");
  const code = /S\d+E\d+/i.test(bits[1] || "") ? bits[1] + " · " : "";
  const name = code ? bits.slice(2).join(" - ") : bits.slice(1).join(" - ") || epTitle;
  $("nowPlaying").style.display = "block";
  $("nowPlaying").textContent = `Loading: ${tape.title}…`;
  try {
    if (!await Jelly.attach(video, itemId, woundTo)) return;   // (another tape went in while this one was being asked for)
    await video.play();

    miniScreens.forEach(m => m.material = videoMat); // every screen shows the tape
    tvLight.base = 1;
    $("nowPlaying").textContent = `Now Playing: ${tape.title} — ${code}${name}`;
    tvOsd(`PLAY ▶ ${code.replace(" · ", "")}`.trim(), 4);
  } catch (err) {
    $("nowPlaying").textContent = `⚠ ${err.message}`;
  }
}
function eject() {
  const tape = playing?.tape;
  Jelly.stop(video); video.pause(); video.removeAttribute("src"); video.load();
  playing = null; tvLight.base = 0;
  miniScreens.forEach(m => m.material = screensaverMat);   // back to the bouncing-logo screensaver
  $("nowPlaying").style.display = "none";
  tableBoxGroup.visible = false;
  if (tape) {                              // the tape comes back out into your hand, not the shelf
    if (invMakeRoom()) pickup(tape);         // whatever you were holding slides into the inventory
    else { returnBin.push(tape); refreshReturnsBin(); }   // hands full (9 items): it goes to Returns instead
  }
}
function togglePause() {
  if (!playing || !video.src) return;
  video.paused ? video.play().catch(() => {}) : video.pause();
  if (!video.paused) tvOsd("PLAY ▶", 2);
}
function stepEpisode(d) { if (playing) playEpisode(playing.idx + d, playing.tape); }
video.addEventListener("ended", () => stepEpisode(1));
// ---- V and N: a double tap's the episode before / after (V on the first, back to its start: one tap alone just asks, so a slip of the finger doesn't change the tape); held, they wind through this one, the picture
// held still and jumping along behind, faster the longer you hold, with a bar in the corner to say where you've got to. B: play / pause ----
const SCRUB_AFTER = 300, DOUBLE_TAP = 450;      // ms: longer than a tap; how soon the second tap has to come
const media = { key: null, dir: 0, down: 0, on: false, t: 0, was: false, seekAt: 0, last: 0, barTill: 0, shown: "", tapKey: null, tapAt: 0 };
const scrubClock = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, c = String(s % 60).padStart(2, "0"); return h ? `${h}:${String(m).padStart(2, "0")}:${c}` : `${m}:${c}`; };
function mediaDown(code) {
  if (!playing || !video.src) return;
  const dir = code === "KeyV" ? -1 : 1;
  Object.assign(media, media.on ? { key: code, dir, down: performance.now() } : { key: code, dir, down: performance.now(), last: performance.now() });   // (already winding, the other key just turns it round)
}
function mediaUp(code) {
  if (code !== media.key) return;
  const { dir, on } = media; media.key = null;
  if (on) { mediaScrubEnd(); return; }
  if (!playing) return;
  const now = performance.now(), second = media.tapKey === code && now - media.tapAt < DOUBLE_TAP;
  media.tapKey = second ? null : code; media.tapAt = now;
  if (!second) { tvOsd(dir < 0 ? "V AGAIN: PREVIOUS" : "N AGAIN: NEXT", DOUBLE_TAP / 1000 + 0.3); return; }
  const eps = playing.eps.length, to = playing.idx + dir;
  if (to >= eps) tvOsd("LAST ON THIS TAPE", 2);
  else if (to < 0) { if (isFinite(video.duration)) video.currentTime = 0; tvOsd("◀◀ START", 2); }
  else stepEpisode(dir);
}
function mediaScrubEnd() {                       // let go: from here, playing if it was
  if (!media.on) return;
  media.on = false; media.key = null; media.barTill = performance.now() + 1400;
  if (!playing) return;
  video.currentTime = media.t;
  playing.tape.tapePos = { ep: playing.idx, t: media.t, d: video.duration };   // (the tape's wound to there, even if it stays paused)
  if (media.was) { video.play().catch(() => {}); tvOsd("PLAY ▶", 2); }
}
function mediaTick() {
  const now = performance.now(), dur = video.duration;
  if (media.key && !playing) { media.key = null; media.on = false; }
  if (media.key && !media.on && now - media.down > SCRUB_AFTER) {
    if (isFinite(dur) && dur > 0) { media.on = true; media.t = video.currentTime; media.was = !video.paused; media.seekAt = 0; media.last = now; media.barTill = Infinity; video.pause(); }
    else { media.key = null; tvOsd("CAN'T WIND THIS ONE", 2); }   // (a live stream: no length to wind along)
  }
  if (media.on) {
    const dt = Math.min(0.1, (now - media.last) / 1000), held = (now - media.down) / 1000; media.last = now;
    const rate = Math.min(Math.max(30, dur / 12), 20 * (1 + held * held * 0.9));   // (20 s a second to start; a whole film in about 12 seconds, at most)
    media.t = Math.max(0, Math.min(dur - 2, media.t + media.dir * rate * dt));
    if (!video.seeking && now - media.seekAt > 250) { video.currentTime = media.t; media.seekAt = now; }   // (a picture as often as the stream can find one)
    tvOsd(media.dir < 0 ? "◀◀ REW" : "FF ▶▶", 1);
  }
  const show = playing && now < media.barTill, bar = $("scrubBar");
  if (!show) { if (media.shown !== "") { bar.style.display = "none"; media.shown = ""; } return; }
  const at = media.on ? media.t : video.currentTime, key = `${Math.floor(at)}|${media.on ? media.dir : 0}`;
  if (key === media.shown) return;
  media.shown = key; bar.style.display = "block";
  bar.children[0].textContent = media.on ? (media.dir < 0 ? "◀◀" : "▶▶") : "▶";
  bar.children[1].textContent = scrubClock(at); bar.children[3].textContent = isFinite(dur) ? scrubClock(dur) : "--:--";
  bar.children[2].firstChild.style.width = `${isFinite(dur) && dur > 0 ? Math.min(100, at / dur * 100) : 0}%`;
}
addEventListener("blur", mediaScrubEnd); document.addEventListener("pointerlockchange", () => { if (document.pointerLockElement !== canvas) mediaScrubEnd(); });   // (keyups don't reach us once it's gone)
// ---- what you hear of a tape from where you're standing. It comes out of three places: the lounge's TV (the store's ceiling sets carry it through the store,
// quieter), the theater's speakers, and the VCR by the roof's chairs while the projector's on. From each it falls off with distance, down to whatever level that
// room's own echo holds, and it only leaves a room by a way out of it: a doorway passes on what reaches it, and it spreads out again from there. A shut door or a
// wall lets through a little of it, the bottom end only ----
const HEAR_SOURCES = [{ room: "store", r: 4.5, p: 1.1, floor: 0.16 }, { room: "theater", r: 16, p: 1, floor: 0.5 }, { room: "roof", r: 3, p: 1.5, floor: 0.03 }];
const hearDoorOpen = (test) => { const d = doors.find(test); return !!d && Math.abs(d.a) > 0.01; };
function hearLinks() {                           // [room, room, x, z (the way through), how much passes, how bright it stays]
  const door = (open, pass, low) => open ? [pass, 7000] : [low, 420];
  const inner = test => door(hearDoorOpen(test), 0.5, 0.05);
  return [["store", "hall", BOH_DOORS.store, STORE.z, 0.55, 7000],
    ["hall", "restroom", BOH_DOORS.restroom, BOH.hallZ, ...inner(d => d.alongX && Math.abs(d.c - BOH_DOORS.restroom) < 0.01)],
    ["hall", "breakroom", BOH_DOORS.breakroom, BOH.hallZ, ...inner(d => d.alongX && Math.abs(d.c - BOH_DOORS.breakroom) < 0.01)],
    ["hall", "closet", CLOSET.x0, BOH_DOORS.closet, ...inner(d => !d.alongX && Math.abs(d.at - CLOSET.x0) < 0.01)],
    ["hall", "lobby", BOH.x0, BOH_DOORS.future, ...inner(d => d.push && !d.alongX)],
    ["lobby", "theater", CINEMA_DOOR, TALL.z1, ...inner(d => d.push && d.alongX)],
    ["theater", "booth", -3, TALL.z1, 0.35, 5000],
    ["theater", "out", WALL_L - 0.1, (FIRE_EXIT.z0 + FIRE_EXIT.z1) / 2, ...door(fireExit.a > 0, 0.6, 0.012)],
    ["store", "out", 0.9, -0.1, ...door(frontDoor.k > 0.05, 0.3, 0.03)],   // (the storefront's glass, or its door standing open)
    ["store", "out", STORE.x + 0.1, (STORE_EXIT.z0 + STORE_EXIT.z1) / 2, ...door(storeExit.a > 0, 0.6, 0.012)],
    ["store", "roof", 2, 14, 0.006, 260],
    ["roof", "out", ...(roof.cine ? [roof.cine.sound.getWorldPosition(tvHearV).x, tvHearV.z] : [0, 0]), 0.3, 2600],   // (open air, but a parapet in the way)
    ["out", "tony", 17, 0, 0.08, 600]];
}
const tvHearV = new THREE.Vector3();
const hearRoomAt = (x, z) => tonyIn(x, z) ? "tony" : roomAt(x, z);
function tvHear(x, z, room) {                    // -> { k: how loud, lp: how bright (Hz), at: [x, z] where the loudest of it's coming from }
  const links = hearLinks(); let sum = 0, lp = 0, best = 0, at = null;
  for (const s of HEAR_SOURCES) {
    if (s.room === "roof" && !roof.cine?.on) continue;
    const m = s.room === "store" ? tvHearV.set(TV.x, 1, TV_SCREEN_Z) : s.room === "theater" ? theaterScreenMesh?.getWorldPosition(tvHearV) : roof.cine.sound.getWorldPosition(tvHearV);
    if (!m) continue;
    const ems = new Map([[s.room, { x: m.x, z: m.z, L: 1, r: s.r, p: s.p, floor: s.floor, lp: 20000 }]]), queue = [s.room];
    const levelAt = (e, px, pz) => e.L * Math.max(e.floor, Math.min(1, (e.r / Math.max(Math.hypot(px - e.x, pz - e.z), 0.01)) ** e.p));
    while (queue.length) {                       // out through the building, keeping the strongest way into each room
      const here = queue.shift(), e = ems.get(here);
      for (const [a, b, px, pz, pass, bright] of links) {
        const to = a === here ? b : b === here ? a : null; if (!to) continue;
        const L = levelAt(e, px, pz) * pass, was = ems.get(to);
        if (!was || L > was.L) { ems.set(to, { x: px, z: pz, L, r: 1.5, p: 1.15, floor: 0, lp: Math.min(e.lp, bright) }); queue.push(to); }
      }
    }
    const e = ems.get(room); if (!e) continue;
    const k = levelAt(e, x, z); sum += k * k; lp += e.lp * k * k;
    if (k > best) { best = k; at = [e.x, e.z]; }
  }
  return { k: Math.min(1, Math.sqrt(sum)), lp: sum > 0 ? lp / sum : 20000, at };
}
const hearF = new THREE.Vector3();
function tvHearTick() {
  if (!playing) { if (tvAudio?.gain) tvAudio.gain.gain.setTargetAtTime(0, tvAudio.ac.currentTime, 0.05); return; }
  const P = camera.position, room = player.onRoof || roof.climb ? "roof" : player.inBooth ? "booth" : hearRoomAt(P.x, P.z);
  const h = fullVid.on ? { k: 1, lp: 20000, at: null } : tvHear(P.x, P.z, room);
  if (!tvAudioBuild()) { video.volume = tvSet.volume / 100 * h.k; return; }   // (no way to filter it here: just the level)
  if (video.volume !== tvSet.volume / 100) video.volume = tvSet.volume / 100;
  const { ac, gain, lp, pan } = tvAudio, t = ac.currentTime;
  gain.gain.setTargetAtTime(h.k < 0.002 ? 0 : h.k, t, 0.1); lp.frequency.setTargetAtTime(h.lp, t, 0.15);
  let side = 0;                                  // which ear it's on: not hard over, it's a room
  if (h.at) { camera.getWorldDirection(hearF); const dx = h.at[0] - P.x, dz = h.at[1] - P.z, d = Math.hypot(dx, dz) || 1; side = (dx * -hearF.z + dz * hearF.x) / d * 0.5; }
  pan.pan.setTargetAtTime(side, t, 0.12);
}
function setLamp(l, on) {
  l.userData.on = on ? LAMP_ON : 0;
  l.intensity = l.userData.on;
  l.userData.shadeMat.emissiveIntensity = on ? SHADE_GLOW : 0;
  const b = l.userData.bulbMat; b.color.copy(on ? b.userData.onColor : b.userData.offColor);
  l.userData.pool.visible = on;
}
function onE() {
  if (scrub || ladder.fix || roof.climb) return;   // busy mopping / sweeping / up at a light / on the roof ladder
  if (CUSTOMER && !seated && !player.onRoof && cmE()) return;   // as a customer: the staff, the locked doors, the register (see cmE)
  if (golf.on) { if (golf.st === "idle") golfEnd(); return; }
  if (aimRoofLadder) { roofClimb(player.onRoof ? -1 : 1); return; }
  if (aimBack) { backLadderE(); return; }           // the ladder out back: kicked down from the roof, then climbed either way
  if (aimGolf) { golfStart(); return; }
  if (aimCine === "proj") { roof.cine.on = !roof.cine.on; return; }
  if (aimCine === "vcr") { vcrUse(); if (playing) roof.cine.on = true; return; }   // (a tape in: the projector comes on with it)
  if (player.onRoof && !seated && !aimCouch) return;   // (up there, past this: only the lawn chairs)
  if (ladder.on) { if (aimDead) ladder.fix = { d: aimDead, t: 0 }; else ladderDown(); return; }
  if (onStool) { stoolPush(); return; }
  if (aimStool && !stool.by) { stoolSit(); return; }
  if (seated) {                             // E always stands you up
    player.x = stoodAt.x; player.z = stoodAt.z; player.yaw = stoodAt.yaw; seated = false; return;
  }
  if (aimCouch) {
    stoodAt = { x: player.x, z: player.z, yaw: player.yaw };
    seatAt = aimSeatObj || SEATS.reduce((a, s) => Math.abs(s.x - aimSeatX) < Math.abs(a.x - aimSeatX) ? s : a);
    seated = true; player.yaw = (seatAt.ry || 0) + Math.PI; player.pitch = 0;   // looking the way the seat faces
    return;
  }
  if (cutout.carried) { cutoutPutDown(); return; }
  if (stool.carried) { stoolPutDown(); return; }
  if (ladder.state === "carried") { if (aimLadderHome) ladderStore(); else ladderPutDown(); return; }
  if (boxCarry.length) { if (aimCupboard) boxUnpack(); else if (aimBox) boxPick(aimBox); return; }   // arms full of boxes
  if (bagCarry.length) { if (aimChute) chuteDrop(); else if (aimBin) binBag(aimBin); else if (aimBag) bagPickUp(aimBag); else if (aimDoor) toggleDoor(aimDoor); else if (aimSwitch) flipSwitch(aimSwitch); return; }   // hands full of trash
  if (aimBin) { binBag(aimBin); return; }
  if (aimBag) { bagPickUp(aimBag); return; }
  if (aimChute) { chuteDrop(); return; }
  if (aimStray) { if (invMakeRoom()) { const s = aimStray; strayTake(s); s.copy.strayFix = true; showTape(s.copy); invSync(); } return; }
  if (aimBox) { boxPick(aimBox); return; }
  if (aimCupboard) { stockTake(aimCupboard); return; }
  if (aimStockSlot) { stockPlace(aimStockSlot); return; }
  if (aimMess) {
    const m = aimMess, need = MESS_TOOL[m.kind];
    if (!messCan(m)) { toast(`That needs the ${TOOLS[need].label}: it's in the janitor's closet`); return; }
    if (need) { scrubStart(m); return; }           // the mop / sweeper: worked over (toolTick), cleaned at the end
    messClean(m);
    if (has("you", "con", 10)) for (const o of messes.filter(o => messCan(o) && Math.hypot(o.x - m.x, o.z - m.z) < 3)) messClean(o);   // Neat Freak: sweep up around it too
    return;
  }
  if (aimTool) { if (toolHeld === aimTool) toolReturn(); else if (toolHeld) toast(`Put the ${TOOLS[toolHeld].label} back first`); else toolTake(aimTool); return; }
  if (aimLadder) { if (ladder.state === "stored") ladderPickUp(); else ladderClimb(); return; }
  if (aimDead) { toast(ladder.state === "placed" ? "Set the step ladder up under it and climb up" : "You'll need the step ladder: it's in the janitor's closet"); return; }
  if (postitHeld && (aimPhone || aimPostit || aimNotepad)) { postitPutBack(); return; }
  if (aimPostit) { postitCall(aimPostit); return; }   // (a tap; the keyboard's hold-or-tap goes through keyup)
  if (aimNotepad) { toast("Look up an overdue member on the register (messages) and it goes on a post-it by the phone", true); return; }
  if (aimPhone) { phoneAnswer(); return; }
  if (aimBoard) { boardOpen(); return; }
  if (aimToilet) { if (aimToilet.flushT <= 0) { aimToilet.flushT = 6; window.StoreAmbience?.flush(...aimToilet.at); } return; }
  if (aimSink) { const s = aimSink; s.tap = !s.tap; s.stream.visible = s.tap; window.StoreAmbience?.water(s.key, ...s.at, s.tap); return; }
  if (aimTowels) { const s = aimTowels; toast(s.tap ? "Turn the tap off first" : "You dry your hands", !s.tap); if (!s.tap) trashAdd(s.bin); return; }
  if (aimHolds && held && !inspecting) { holdPlace(held); return; }
  if (aimHolds && !held) { holdPull(); return; }
  if (aimCustomer) { custInteract(aimCustomer); return; }
  if (aimSwitch) { flipSwitch(aimSwitch); return; }
  if (aimFireExit) { fireExitUse(aimFireExit, aimExitDoor); return; }
  if (aimEmp && afterClose() && !aimEmp.leaving && aimEmp.state !== "toExit") { sendHome(aimEmp); return; }   // closed: off you go
  if (aimEmp && aimEmp.state === "stoolSit") {   // they're on the stool: a shove, same as your own spins (keep it up and they get dizzy)
    stoolPush(); aimEmp.bored = 0; aimEmp.c.lookAt(null); aimEmp.c.setMood(aimEmp.dizzy > 0.5 ? "meh" : "love"); return;
  }
  if (aimEmp) { withEmp(aimEmp, empToggle); return; }
  if (aimExit && afterClose() && !custs.length) { clockOut(); return; }
  if (aimPrinter && co?.by === "player" && coAct("printer")) return;
  if (aimLock) { setFrontLock(!frontLock.locked); toast(frontLock.locked ? "Front doors locked — no new customers" : "Front doors unlocked — open for business", true); return; }   // stays in your arms if it won't fit there
  if ((aimPOS || aimDrawer) && co?.by === "player" && coAct("register")) return;   // mid-checkout: tap the card / ring it up
  if (aimPOS) { openPOS(); return; }
  if (aimRewinder) { rewinderUse(aimRewinder); return; }
  if (aimBell) { dingBell(); return; }
  if (aimDesens) { padUse(); return; }
  if (aimLamp) { setLamp(aimLamp, !aimLamp.userData.on); return; }   // E on an aimed lamp flips just that one
  if (aimFlap) { toggleFlap(); return; }
  if (aimDoor) { toggleDoor(aimDoor); return; }
  if (aimTony) { tonyE(aimTony); return; }
  if (aimCooler) { coolerOpen = !coolerOpen; return; }
  if (aimTrash) {
    if (postitHeld) { postitToss(aimTrash); return; }
    if (heldSnack) dropSnack(true); else if (heldPopcorn) dropPopcorn(); else return;
    trashAdd(aimTrash, 1);
    if (aimTrash.id === "lobby") trashFlapT = 0.5; return;   // swing the flap
  }
  if (aimReturns && held) {                  // drop the tape in hand off (taking one out is a click, like a shelf)
    held.fromReturns = held.strayFix = false; returnBin.push(held); releaseFromHand(); refreshReturnsBin();
    return;
  }
  if (aimTV) { vcrUse(); return; }           // must actually be looking at the screen
  if (biteAnim > 0) return;                  // still mid-bite: finish chewing first
  if (heldPopcorn) eatPopcorn();             // nothing else aimed: E eats a handful (or the single piece)
  else if (heldSnack) consumeSnack();        // ...or a bite / sip of whatever snack or drink you're holding
}
function vcrUse() {                          // E on the TV or a VCR (the store's, the theater's, the roof's: one tape, every screen)
  if (held) {
    const tape = held, old = playing?.tape;
    playEpisode(tape.tapePos?.ep || 0, tape);   // it plays from wherever it's wound to
    releaseFromHand();                     // the tape leaves your hand...
    showTableBox(tape);                    // ...and its case lands on the coffee table
    if (old) {                             // swap: the tape that was in the VCR comes out into your inventory
      if (invMakeRoom()) showTape(old); else { returnBin.push(old); refreshReturnsBin(); }   // (9 items already: Returns)
    }
  }
  else if (playing) eject();
}
// TV light colors: every 150ms the screen canvas (already cropped,
// letterboxed and filtered — exactly what's on the glass) is shrunk to 24x18
// and averaged into the 3x3 zones the shader lights with; the main loop eases
// toward each sample so the room doesn't visibly step between them
const glowCtx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
glowCtx.canvas.width = 24; glowCtx.canvas.height = 18;
const tvTmp = new THREE.Color();
setInterval(() => {
  if (!tvLight.base) return;
  try {
    glowCtx.drawImage(videoCanvas, 0, 0, 24, 18);
    const d = glowCtx.getImageData(0, 0, 24, 18).data, sum = new Float32Array(27);
    for (let y = 0; y < 18; y++) for (let x = 0; x < 24; x++) {
      const z = ((y / 6 | 0) * 3 + (x / 8 | 0)) * 3, p = (y * 24 + x) * 4;
      sum[z] += d[p]; sum[z + 1] += d[p + 1]; sum[z + 2] += d[p + 2];
    }
    for (let z = 0; z < 27; z += 3) {           // pixels are sRGB; the shader works in linear
      tvTmp.setRGB(sum[z] / 12240, sum[z + 1] / 12240, sum[z + 2] / 12240, THREE.SRGBColorSpace);   // 48 px x 255
      tvZoneTarget[z] = tvTmp.r; tvZoneTarget[z + 1] = tvTmp.g; tvZoneTarget[z + 2] = tvTmp.b;
    }
  } catch { /* tainted frame: keep the last colors */ }
}, 150);

