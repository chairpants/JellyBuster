// ---- the clock: the shift's hours going by (shiftTick), skipping one, the HUD's top line, and the light switches' rockers ----
function shiftTick(dt) {
  if (shift.report) return;
  if (shift.greet && document.pointerLockElement === canvas) { toast(shift.greet, true); shift.greet = null; }
  if (started && !GUEST && (document.pointerLockElement === canvas || posTerm.isOpen())) {   // (a guest's clock is the host's: see store/together.js)
    const was = shift.h;
    if (shift.warp > shift.h) shift.h = Math.min(shift.warp, shift.h + dt / 2.5);   // L: an hour in 2.5 s
    else shift.h += dt / (shift.h < SHIFT.close ? SHIFT.hour : 3600);             // after close: real time
    const crossed = at => was < at && shift.h >= at;
    if (CUSTOMER) cmClock(crossed);
    else if (crossed(SHIFT.open)) toast(frontLock.locked ? "10:00 AM — opening time. Unlock the front doors" : "10:00 AM — we're open", true);
    if (crossed(SHIFT.lastIn) && !CUSTOMER) toast("11:45 PM — last customers of the night", true);
    const d = shiftDate().getDay(), weekend = d === 5 || d === 6;
    if (crossed(12)) logAct("The lunch crowd's starting to come in");
    if (crossed(15)) logAct(weekend ? "Afternoon's picking up" : "School's out: here comes the after-school crowd");
    if (crossed(18.5)) logAct(weekend ? `${d === 5 ? "Friday" : "Saturday"} night rush: it's about to get busy` : "The evening rush is starting");
    if (crossed(SHIFT.close) && !CUSTOMER) toast("Midnight — closing time. Lock up and head out the front doors when you're done", true);
  }
  showTick();
  if (started && (document.pointerLockElement === canvas || posTerm.isOpen())) { phoneTick(dt); holdsTick(); }
  shiftHud();
}
function skipHour() {                             // L: fast-forward an hour (the sky eases through it). Never past close: after that the clock's real
  if (afterClose()) return toast("After close the clock's running for real");
  shift.warp = Math.min(SHIFT.close, Math.max(shift.warp, shift.h) + 1);
}
let shiftHudTxt = "";
function shiftHud() {
  shift.goals ||= dayGoals();
  const goalsTxt = shift.goals.map(g => { const st = goalState(g); return `${st.mark} ${st.text}${st.have && st.mark !== "✓" ? ` ${st.have}` : ""}`; }).join("|");
  if (CUSTOMER) {                                  // (out front: your own money, and where you're headed)
    const [a, b, g] = cmHud(), t = a + b + g.join("|"); if (t === shiftHudTxt) return; shiftHudTxt = t;
    const el = $("shiftClock"); el.innerHTML = `${a}<div class="h">${b}</div><div class="goals">${g.map(x => `<div class="${x[0] === "✓" ? "done" : ""}">${x}</div>`).join("")}</div>`;
    el.classList.toggle("late", afterClose()); el.style.display = "block"; return;
  }
  const late = afterClose(), txt = `${WEEKDAYS[shiftDate().getDay()]} ${fmtClock(shift.h, late)}|${late ? "CLOSED" : shift.h < SHIFT.open ? "OPENS 10 AM" : `DAY ${shift.day}`} ${starStr(repStars())} · ${(b => (b < 0 ? "-$" : "$") + Math.abs(b).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))(posTerm.budget())} · STORE ${shift.stats.score.toLocaleString()} · YOU ${shift.stats.you.toLocaleString()}${staff.length ? ` · STAFF ${shift.stats.dana.toLocaleString()}` : ""}`;
  if (txt + goalsTxt === shiftHudTxt) return; shiftHudTxt = txt + goalsTxt;
  const [t, sub] = txt.split("|"), el = $("shiftClock");
  el.innerHTML = `${t}<div class="h">${sub}</div><div class="goals">${goalsTxt.split("|").map(g => `<div class="${g[0] === "✓" ? "done" : g[0] === "✗" ? "miss" : ""}">${g}</div>`).join("")}</div>`;
  el.classList.toggle("late", late); el.style.display = "block";
}

// the light switches: a plate of toggles on the wall, one per zone. Built in
// the world section below (lightSwitches), toggled with E
const switchToggles = [];                         // { mesh, zone } — the rocker flips with its zone
const switchPlate = { closet: ["closet"] };        // zone -> every zone on its plate, in order (the closet: just its bulb)
function flipSwitch(zone) { setZone(zone, !zoneOn[zone]); switchSnap(zoneOn[zone]); }
// hold E on a plate: the whole row goes the opposite of its first switch
function flipPlate(zone) {
  const zones = switchPlate[zone], on = !zoneOn[zones[0]];
  for (const z of zones) if (zoneOn[z] !== on) setZone(z, on);
  switchSnap(on);
}
function switchSnap(on) {
  try {                                           // a plastic snap
    const ac = StoreAudio.ctx(), n = ac.sampleRate * 0.03, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.12));
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    f.type = "bandpass"; f.frequency.value = on ? 2600 : 2100; g.gain.value = 0.35;
    src.buffer = b; src.connect(f).connect(g).connect(sfxOut(ac)); src.start();
  } catch {}
}

// the plates: ivory, a toggle per gang with its zone printed under it. A gang's
// whole face is the aim target (an invisible pad), so you don't have to hit the lever
{
  const ivory = new THREE.MeshLambertMaterial({ color: 0xece6d6 }), pad = new THREE.MeshBasicMaterial({ visible: false });
  const plate = (x, y, z, ry, zones) => {
    for (const zn of zones) switchPlate[zn] = zones;
    const n = zones.length, GW = 0.07, W = GW * n + 0.03, H = 0.15;
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; scene.add(g);
    const face = makeTexture((ctx, w, h) => {                     // the plate's face: screw dots, lever slots, labels
      ctx.fillStyle = "#ece6d6"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#2b2b2b"; ctx.textAlign = "center";
      zones.forEach((zn, i) => {
        const cx = (0.015 + GW * (i + 0.5)) / W * w;
        ctx.fillStyle = "#b9b09a"; ctx.fillRect(cx - w * 0.012 / W, h * 0.3, w * 0.024 / W, h * 0.3);   // the slot
        ctx.fillStyle = "#c9c1ad"; for (const sy of [0.13, 0.75]) { ctx.beginPath(); ctx.arc(cx, h * sy, h * 0.03, 0, 7); ctx.fill(); }   // screws
        const lb = ZONE_LABELS[zn], maxW = w * (GW - 0.008) / W;
        let fs = Math.round(h * 0.11); ctx.font = `bold ${fs}px Arial`;
        while (ctx.measureText(lb).width > maxW && fs > 6) ctx.font = `bold ${--fs}px Arial`;   // fit the gang
        ctx.fillStyle = "#2b2b2b"; ctx.fillText(lb, cx, h * 0.93);
      });
    }, 256, Math.round(256 * H / W));
    const pm = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.008), [ivory, ivory, ivory, ivory, new THREE.MeshLambertMaterial({ map: face }), ivory]);
    pm.position.z = 0.004; g.add(pm);
    zones.forEach((zn, i) => {
      const cx = -W / 2 + 0.015 + GW * (i + 0.5), cy = H * (0.5 - 0.45);
      const piv = new THREE.Group(); piv.position.set(cx, cy, 0.009); g.add(piv);
      const lever = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.03), ivory); lever.position.z = 0.013; piv.add(lever);   // sticks out, tipped up (on) or down (off)
      piv.rotation.x = zoneOn[zn] ? -0.32 : 0.32;
      switchToggles.push({ mesh: piv, zone: zn });
      const hit = new THREE.Mesh(new THREE.BoxGeometry(GW, H, 0.04), pad); hit.position.set(cx, 0, 0.02); g.add(hit);
      for (const m of [hit, lever]) { m.userData.lightZone = zn; aimables.push(m); }
    });
  };
  // behind the register: the west wall, by the front window — the sales floor's three zones and the back hall
  plate(WALL_L + 0.1, 1.22, 1.3, Math.PI / 2, ["front", "aisles", "lounge", "hall"]);
  // just inside each back room, on the wall with the door, latch side (the doors hinge on their east side)
  const inside = BOH.hallZ + WALL_T / 2;
  plate(BOH_DOORS.breakroom - DOOR_W / 2 - 0.25, 1.22, inside, 0, ["breakroom"]);
  plate(BOH_DOORS.restroom - DOOR_W / 2 - 0.25, 1.22, inside, 0, ["restroom"]);
  plate(BOH_DOORS.restroomF - DOOR_W / 2 - 0.25, 1.22, inside, 0, ["restroom"]);          // (the two restrooms: one circuit)
  plate(CINEMA_DOOR + 1.07, 1.22, BOH.z1 - WALL_T / 2, Math.PI, ["lobby", "theater"]);
  plate(SHAFT.split + 0.1, 1.22, (TALL.z0 + SHAFT.top) / 2, Math.PI / 2, ["stairwell"]);   // at the booth's stairs' foot, across from their door
  plate(SHAFT.x0, TALL.booth + 1.22, 31.5, -Math.PI / 2, ["stairwell", "booth"]);          // up in the booth, by the stairs' top
}

