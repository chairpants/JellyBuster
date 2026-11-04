// ---------------- pointer lock / title screen ----------------
let started = false;
// Browsers (Chromium on Windows above all) now and then report a mouse move that never happened, sometimes a whole run
// of them, and the camera slams to the top of its range until the lock's taken again. So: raw input where there is
// any (it skips the OS's handling of the pointer), a move out of all proportion to the last one is dropped, and a run
// of those retakes the lock, unseen. Real flicks build up over several moves, so they get through. In the console,
// mouseGuard shows how often it's fired
const mouseGuard = { raw: true, last: 0, t: 0, runN: 0, runT: 0, relocking: false, dropped: 0, relocks: 0 };
const MOUSE_JUMP = { min: 250, ratio: 6, gap: 150, run: 3, runGap: 500 };   // px, x the last move, ms till that's forgotten, drops in a run, ms between them
function lockMouse() {
  if (!mouseGuard.raw) return canvas.requestPointerLock();
  return canvas.requestPointerLock({ unadjustedMovement: true })?.catch?.(err => {
    if (err?.name !== "NotSupportedError") throw err;
    mouseGuard.raw = false; return canvas.requestPointerLock();   // no raw input here: the ordinary kind
  });
}
function mouseRelockFailed() {                     // couldn't get it back without a click: an ordinary pause, then
  if (!mouseGuard.relocking) return;
  mouseGuard.relocking = false; document.dispatchEvent(new Event("pointerlockchange"));
}
addEventListener("pointerlockerror", mouseRelockFailed);
function mouseJumped(dx, dy) {                     // is this move one to ignore?
  const g = mouseGuard, now = performance.now(), m = Math.max(Math.abs(dx), Math.abs(dy));
  if (g.relocking) return true;
  if (now - g.t > MOUSE_JUMP.gap) g.last = 0;
  g.t = now;
  if (m <= Math.max(MOUSE_JUMP.min, MOUSE_JUMP.ratio * g.last)) { g.last = m; return false; }
  g.dropped++; g.runN = now - g.runT < MOUSE_JUMP.runGap ? g.runN + 1 : 1; g.runT = now;
  if (g.runN >= MOUSE_JUMP.run) {
    g.runN = 0; g.relocks++; g.relocking = true;
    console.warn("Mouse: a run of impossible moves, retaking the pointer lock", dx, dy);
    document.exitPointerLock();
  }
  return true;
}
$("titleScreen").addEventListener("click", e => {
  if (e.target.closest("button, #mainMenu")) return;
  if (started || ($("mainMenu").hidden === false && titleMenu.autoPlay?.())) lockMouse();   // paused (or just reloaded into a store): click anywhere to go in
});
function slotInfo(n) {                           // what's in a save slot, for the menu
  try {
    const d = JSON.parse(localStorage.getItem(slotKey(n))); if (!d || d.v !== SAVE_V) return null;
    const nice = { simulation: "Simulation", customer: "Customer" }[d.mode] || "Sandbox";
    if (d.fresh) return { label: `${nice} · new store`, mode: d.mode };
    if (d.role === "customer") return { label: `${nice}${d.mode === "customer" ? "" : " · a customer now"} · day ${d.shift?.day ?? 1} · $${(d.cm?.wallet ?? 40).toFixed(2)} on you`, mode: d.mode };
    return { label: `${nice} · day ${d.shift?.day ?? 1} · $${Math.round(d.budget ?? 0).toLocaleString()} · ${starStr(repStars(d.rep ?? 50))}`, mode: d.mode };
  } catch { return null; }
}
function saveSettings() { try { localStorage.setItem("jellybuster-settings", JSON.stringify(SETTINGS)); } catch {} }
function applySettings() {
  window.StoreAmbience?.setVolume?.(SETTINGS.sound / 100); sfxRefresh();
  SHIFT.hour = SETTINGS.shiftMin * 60 / 14;
  aaApply();
}
function aaApply() {                              // smooth edges: 4x multisampling on the main pass (rebuilt with the glow target: they share a depth texture)
  const n = SETTINGS.aa ? 4 : 0; if (mainRT.samples === n) return;
  mainRT.samples = n; mainRT.dispose(); glowRT.dispose();
}
aaApply();
// the main menu: three store files, like a cartridge's save files. Pick one and you can PLAY it (an empty one:
// pick the mode for a new store), COPY it to another file, or DELETE it. The page holds one store at a time (the
// active file's), so playing another file reloads into it and straight on into the store at your next click
function titleMenu() {
  const MODES = {
    simulation: ["SIMULATION", "A bare-bones store: no staff, the theater locked up, part of the library. Build it up with what it earns."],
    sandbox: ["SANDBOX", "Everything unlocked, Dana on staff, $10,000 in the budget: just play store."],
    customer: ["CUSTOMER", "You don't work here. The store runs itself; you come in off the lot with your own wallet, and play by its rules. Some doors are locked."],
  };
  const panels = { main: $("mmMain"), settings: $("mmSettings") };
  const show = k => { for (const [n, el] of Object.entries(panels)) el.hidden = n !== k; };
  const write = (n, d) => { try { d ? localStorage.setItem(slotKey(n), typeof d === "string" ? d : JSON.stringify(d)) : localStorage.removeItem(slotKey(n)); } catch {} };
  const raw = n => { try { return localStorage.getItem(slotKey(n)); } catch { return null; } };
  let autoPlay = false; try { autoPlay = sessionStorage.getItem("jellybuster-play") === "1"; sessionStorage.removeItem("jellybuster-play"); } catch {}
  let sel = autoPlay || SAVE || started ? SLOT : 0, step = null, target = 0;   // step: null | "copy" (pick where) | "copyOk" | "del"
  const play = () => { autoPlay = false; lockMouse(); };
  const reloadInto = (n, go) => {                  // the page into file n (and on into the store, if go)
    try { localStorage.setItem("jellybuster-slot", String(n)); if (go) sessionStorage.setItem("jellybuster-play", "1"); } catch {}
    location.reload();
  };
  const leaving = () => { if (started) saveState(); saveOff = true; };   // (the store you're in keeps where it was, and nothing saves over what's next)
  const playFile = n => {
    if (n === SLOT && (SAVE || started)) return play();
    leaving(); reloadInto(n, true);
  };
  const newStore = (n, mode) => {
    if (n === SLOT && !SAVE && !started && mode === MODE) return play();   // (the store that's already set up is just that)
    leaving(); write(n, { v: SAVE_V, mode, fresh: true }); reloadInto(n, true);
  };
  const del = n => {
    if (n === SLOT) { saveOff = true; write(n, null); reloadInto(n, false); return; }   // (the store on screen goes with it)
    write(n, null); sel = 0; step = null; render();
  };
  const copy = (from, to) => {
    if (from === SLOT && started) saveState();
    const d = raw(from); if (!d) return;
    if (to === SLOT) { saveOff = true; write(to, d); reloadInto(to, false); return; }   // copied over the one on screen: load the copy
    write(to, d); sel = to; step = null; render();
  };
  const btn = (html, cls, on) => { const b = document.createElement("button"); b.innerHTML = html; if (cls) b.className = cls; b.onclick = e => { e.stopPropagation(); on(); }; return b; };
  const q = (text, warn) => { const d = document.createElement("div"); d.className = warn ? "q warn" : "q"; d.textContent = text; return d; };
  function render() {
    const list = $("mmFiles"); list.innerHTML = "";
    $("mmTitle").textContent = step === "copy" || step === "copyOk" ? `COPY STORE ${sel} TO…` : started ? "PAUSED" : "SELECT A STORE";
    for (let n = 1; n <= SLOTS; n++) {
      const info = slotInfo(n), copying = step === "copy" || step === "copyOk";
      const sub = copying && n !== sel ? (info ? `${info.label} · replace it` : "empty · copy here") : info ? info.label : "empty";
      const f = btn(`<span class="n">${n}</span><span><b>${info ? `STORE ${n}` : "NEW STORE"}${n === SLOT && started ? " · PLAYING" : ""}</b><small>${sub}</small></span>`,
        `file${info ? "" : " empty"}${n === sel ? " sel" : ""}${copying && n === sel ? " dim" : ""}`, () => {
          if (copying) { if (n === sel) { step = null; render(); } else if (slotInfo(n)) { target = n; step = "copyOk"; render(); } else copy(sel, n); return; }
          if (sel !== n || step) { sel = n; step = null; render(); }
        });
      f.dataset.file = n; list.appendChild(f);
      const at = step === "copyOk" ? target : sel;
      if (n !== at || (copying && step !== "copyOk")) continue;
      const acts = document.createElement("div"); acts.className = "acts";
      if (step === "copyOk") acts.append(q(`Store ${target} gets replaced with a copy of store ${sel}.`, true), btn("COPY", "go", () => copy(sel, target)), btn("BACK", "back", () => { step = "copy"; render(); }));
      else if (step === "del") acts.append(q(`Delete store ${n} for good?`, true), btn("DELETE", "del", () => del(n)), btn("KEEP IT", "back", () => { step = null; render(); }));
      else if (info) acts.append(btn(n === SLOT && started ? "RESUME" : "PLAY", "go", () => playFile(n)),
        btn("COPY", "", () => { step = "copy"; render(); }), btn("DELETE", "del", () => { step = "del"; render(); }));
      else for (const [m, [name, about]] of Object.entries(MODES)) { const b = btn(`<b>${name}</b><small>${about}</small>`, "mode", () => newStore(n, m)); b.dataset.mode = m; acts.append(b); }
      list.appendChild(acts);
    }
    const hint = $("playHint"); hint.hidden = !autoPlay; hint.textContent = `STORE ${SLOT} · CLICK OR PRESS A KEY TO PLAY`;
  }
  titleMenu.refresh = () => { if (started) { saveState(); sel = SLOT; } step = null; render(); show("main"); };
  titleMenu.autoPlay = () => autoPlay;
  $("playHint").onclick = play;
  titleMenu.refresh();
  addEventListener("keydown", e => {                // on the title: a key goes on in (after the reload into a store), Enter plays the one picked
    if (document.pointerLockElement === canvas || $("mainMenu").hidden || $("titleScreen").style.display === "none" || panels.main.hidden || e.code === "Escape") return;
    if (autoPlay && !started) play();
    else if (e.code === "Enter" && sel && !step && slotInfo(sel)) playFile(sel);
  });
  // settings: sliders and toggles, applied as they change
  const bind = (id, key, fmt, after) => {
    const el = $(id), out = $(id + "V"), sync = () => { if (el.type === "checkbox") el.checked = !!SETTINGS[key]; else el.value = SETTINGS[key]; if (out) out.textContent = fmt(SETTINGS[key]); };
    el.oninput = () => { SETTINGS[key] = el.type === "checkbox" ? el.checked : +el.value; sync(); after?.(); saveSettings(); applySettings(); };
    sync();
  };
  bind("setSound", "sound", v => `${v}%`);
  bind("setSens", "sens", v => `${v}%`);
  bind("setInvert", "invertY", v => v ? "on" : "off");
  bind("setAA", "aa", v => v ? "on" : "off");
  bind("setShift", "shiftMin", v => `${v} min`);
  const tv = $("setTv"), tvV = $("setTvV"); tv.value = tvSet.volume; tvV.textContent = `${tvSet.volume}%`;
  tv.oninput = () => { tvSet.volume = +tv.value; tvV.textContent = `${tvSet.volume}%`; applyTv(); };   // (the same setting as the TV's own picture menu)
  $("mmSettingsBtn").onclick = () => { tv.value = tvSet.volume; tvV.textContent = `${tvSet.volume}%`; show("settings"); };
  $("mmSettingsBack").onclick = () => show("main");
  { const j = Jelly.info(); $("setJelly").textContent = `Stocked from ${j.server} as ${j.user}: ${j.tapes} tapes${j.left ? `, ${j.left} more than the store can shelve` : ""}`; }
  $("setUnlink").onclick = () => { saveOff = true; Jelly.unlink().finally(() => location.reload()); };   // (the store's saves stay, for when it's linked again)
}
let relockOnInput = false;                        // backed out with Escape: the next click or key (not Escape) takes the mouse back
function backToStore() { relockOnInput = true; keys.clear(); $("crosshair").hidden = true; toast("Click or press any key to get back in", true); }
let posEsc = false;                              // the key that closed the POS was Escape
function escClose() {                          // Escape closes whatever's open over the store; true if something was
  if (golf.on && golf.st === "idle") { golfEnd(); return true; }
  if (cmove.item) { moveCancel(`The ${cmove.item.name}'s back where it was`); return true; }
  if (held && inspecting) { inspecting = false; peek = null; return true; }
  if (tvMenu) { tvMenu = false; return true; }
  if (board.open) { boardClose(); return true; }
  if (sheet.open) { sheetToggle(); return true; }
  return false;
}
canvas.addEventListener("click", () => { relockOnInput = false; if (started && document.pointerLockElement !== canvas && !posTerm?.isOpen() && !shift.report && !hiring.open) lockMouse(); });
document.addEventListener("fullscreenchange", () => document.fullscreenElement ? navigator.keyboard?.lock?.(["Escape"]).catch(() => {}) : navigator.keyboard?.unlock?.());   // fullscreen: Escape comes to us as a key (hold it to leave fullscreen)
document.addEventListener("pointerlockchange", () => {
  const locked = document.pointerLockElement === canvas;
  if (mouseGuard.relocking) {                      // (see mouseJumped: not a pause, nobody asked for this)
    if (locked) mouseGuard.relocking = false; else lockMouse()?.catch?.(mouseRelockFailed);
    return;
  }
  if (!locked && (posTerm?.isOpen() || shift.report || hiring.open)) { keys.clear(); $("crosshair").hidden = true; return; }   // the mouse was freed for the terminal / the shift slip, not a pause
  if (!locked && started && escClose()) return backToStore();   // Escape backed out of a sub-screen, not a pause
  $("titleScreen").style.display = locked ? "none" : "flex";
  $("crosshair").hidden = !locked;
  paused = !locked && started;
  if (paused && playing && !video.paused) { video.pause(); pausedTape = true; }
  if (locked) { relockOnInput = false; if (pausedTape) { pausedTape = false; video.play().catch(() => {}); } }
  if (locked) {
    if (DEBUG_LVL && !started) for (let i = 0; i < 8; i++) { const c = onShelfCopy(catalog[Math.floor(Math.random() * catalog.length)]); if (c) { setOnShelf(c, false); misshelve(c, null, onShelfCopy(catalog[Math.floor(Math.random() * catalog.length)])); } }   // something for Keen Eye to find
    started = true; window.StoreAmbience?.start();
    if (resumePlay) { const r = resumePlay; resumePlay = null; playEpisode(r.idx, r.tape); }   // restored tape: rolls now that there's been a click
    $("titleScreen").classList.add("paused");
    titleMenu.refresh?.();
  } else { keys.clear(); titleMenu.refresh?.(); if (board.open) boardClose(); }
});
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  bloomResize();
});

// ---------------- register terminal (pos.js) ----------------
// E at the register frees the mouse and hands the keyboard to a full-screen
// green-screen session; logging off (Esc / F10 / 0) takes you straight back
// into the store. The in-world monitor mirrors whatever's on it.
const posTex = new THREE.CanvasTexture(document.createElement("canvas"));
posTex.colorSpace = THREE.SRGBColorSpace;
// ---------------- security gate alarm ----------------
// Walk through the entry gates with a tape in hand and they trip: LEDs flash
// red and a two-tone shop alarm sounds (WebAudio, no sound file) until it's
// silenced from the register terminal — the only place that option shows up.
const gateAlarm = { on: false, armed: true, t: 0, stop: null };   // armed: off (from the POS) = walk through freely
function startGateAlarm() {
  if (gateAlarm.on || !gateAlarm.armed) return;
  gateAlarm.on = true; gateAlarm.t = 0;
  try {
    const ac = StoreAudio.ctx(); ac.resume();
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = "square"; g.gain.value = 0; osc.connect(g).connect(sfxOut(ac)); osc.start();
    let hi = false;
    const beep = () => { const t = ac.currentTime; hi = !hi; osc.frequency.setValueAtTime(hi ? 2600 : 2050, t); g.gain.setValueAtTime(0.045 * heardFrom(0, GATE_Z), t); g.gain.setValueAtTime(0, t + 0.2); };   // (as loud as it is where you are, beep by beep)
    beep(); const timer = setInterval(beep, 280);
    gateAlarm.stop = () => { clearInterval(timer); const t = ac.currentTime; g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0, t, 0.01); osc.stop(t + 0.06); };
  } catch { /* no audio: the lights still go */ }
}
function silenceGateAlarm() {
  if (!gateAlarm.on) return;
  gateAlarm.on = false; gateAlarm.stop?.(); gateAlarm.stop = null; gateLed.color.set(gateAlarm.armed ? 0x39ff7a : 0x151515);
}
function armGates(on) {                      // disarmed gates go dark and ignore tapes walking through
  gateAlarm.armed = on;
  if (gateAlarm.on) silenceGateAlarm(); else gateLed.color.set(on ? 0x39ff7a : 0x151515);
}
let gateLastZ = player.z;

const posTerm = window.createPOS({
  catalog, rented: rentedCopies, budget: SAVE?.budget ?? (SIM ? 300 : 10000),
  activeMembers: SAVE?.members, startMembers: SIM && !SAVE?.members ? 40 : null,   // simulation: a small base to start
  savedOwed: SAVE?.owed, savedRecords: SAVE?.records,
  today: +shiftDate(), clock: () => { const m = Math.floor(shift.h * 60) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; },   // the shift's date and clock on the screen
  savedRental: c => SAVE?.rentals?.[copyKey(c)],
  unrent(c) { setOnShelf(c, true); const i = rentedCopies.indexOf(c); if (i >= 0) rentedCopies.splice(i, 1); },   // nobody had room for it: back on the shelf
  replace(c) { deliveries.push({ tape: copyKey(c) }); logAct(`Ordered a replacement ${c.title}: arrives tomorrow morning`); },
  savedMessages: SAVE?.messages,
  lose(c) { const k = rentedCopies.indexOf(c); if (k >= 0) rentedCopies.splice(k, 1); setOnShelf(c, false); logAct(`Billed ${c.title} as lost: reorder it on the register (B)`); },
  callNote: m => postitAdd(m),
  promised: m => logAct(`Called ${memberName(m)} about their overdue tape${m.rentals.length > 1 ? "s" : ""}: they'll bring ${m.rentals.length > 1 ? "them" : "it"} in`),
  supplies: () => stockProducts().map(e => ({ name: e.name, drink: e.drink, spots: e.units.length, out: e.units.filter(u => u.visible).length, back: backstock[e.name] || 0,
    ordered: deliveries.filter(d => d.name === e.name).reduce((a, d) => a + d.qty, 0) + boxes.filter(b => b.name === e.name).reduce((a, b) => a + b.qty, 0), caseCost: caseCost(e), caseQty: CASE_QTY })),
  order: (name, cases) => stockOrder(name, cases),
  schedInfo: { h0: SCHED_H0, slots: SCHED_SLOTS, max: SCHED_MAX },
  staffSched: () => staff.map(e => ({ id: e.id, first: e.first, last: e.last, sched: e.sched, hours: schedHours(e), rate: empRate(e), on: !!e.c })),
  setSched,
  upgrades: () => UPGRADES.map(u => ({ ...u, cost: u.id === "hire" ? hireCost() : u.cost, owned: !u.repeat && owned(u.id),
    ranToday: u.id === "ad" && upg.adDay === shift.day, desc: u.id === "hire" ? (staff.length >= STAFF_MAX ? "THE STAFF ROOM'S FULL" : `3 APPLICANTS · ${staff.length} ON STAFF`) : u.desc })), buyUpgrade: upgBuy,
  theaterOpen: () => owned("theater"), mode: MODE,
  reputation: () => ({ stars: repStars(), v: rep.v }),
  feature: () => show.title && { title: show.title.title, day: show.day === shift.day ? "TONIGHT" : "TOMORROW", sold: show.sold, status: show.status },
  featureChoices: () => catalog.filter(t => t.seasons.length === 1 && t.seasons[0].episodes.length === 1 && onShelfCopy(t))
    .sort((a, b) => (window.STORE_META?.[b.id]?.[1] || 0) - (window.STORE_META?.[a.id]?.[1] || 0)).slice(0, 15),
  setFeature: t => showSet(t),
  returnBin: () => returnBin, held: () => held, playing: () => playing,
  requests: t => holds.filter(h => !h.copy && h.title === t).map(h => ({ name: memberName(h.member), at: fmtClock(h.at), alert: !!h.alert })),
  setAlert: (t, on) => { for (const h of holds) if (!h.copy && h.title === t) h.alert = on; },
  alarm: () => gateAlarm.on, silenceAlarm: () => { if (gateAlarm.on) gainXp("you", "wis", 3); silenceGateAlarm(); }, resetSave: () => resetSave(),
  gatesArmed: () => gateAlarm.armed, armGates,
  onRedraw(c) {
    if (posTex.image !== c) { posTex.image = c; posScreen.material.map = posTex; posScreen.material.needsUpdate = true; }
    posTex.needsUpdate = true;
  },
  onClose() {                                      // straight back into the store: F10 / Enter count as the gesture, Escape doesn't
    if (hiring.open) return;                     // the applicants are still up: keep the mouse for them
    if (posEsc) return backToStore();
    lockMouse()?.catch?.(() => backToStore());
  },
});
posTerm.idle(); corkDraw(); parkLot(shift.day, [5, 6].includes(shiftDate().getDay()));
window.StoreAmbience?.onCarPass?.(c => passCar(c));
// right-click backs out of the register just like Escape (a screen back, or log off from the main menu);
// being a click, closing it takes the mouse straight back instead of waiting for the next input
$("posTerm").addEventListener("contextmenu", e => e.preventDefault());
$("posTerm").addEventListener("mousedown", e => { if (e.button !== 2 || !posTerm.isOpen()) return; e.preventDefault(); posEsc = false; posTerm.key({ key: "Escape", preventDefault() {} }); });
function openPOS() {
  keys.clear(); $("hoverTip").style.display = "none";
  posTerm.open();
  document.exitPointerLock();
}

// ---------------- clocking out: after close, E on the front doors ----------------
// ends the day: the shift slip (what came in, what walked out, a grade), then
// the next morning, 9:00 with the doors still locked (an hour to get things ready)
function clockOut() {
  if (drunk.peak >= 2) drunk.owe = true;         // (tomorrow you'll feel it)
  drunk.peak = 0;
  keys.clear(); shift.report = true; $("hoverTip").style.display = "none";
  document.exitPointerLock();
  const chk = { bin: returnBin.length, strays: strays.length, messes: messes.length, lights: deadLights.length, empty: emptySpots().length, trash: binList().filter(b => b.n >= b.cap * 0.75).length + bagsDown.length + bagCarry.length };   // the closing walk-through: what's been left undone
  const chkPts = -10 * (chk.bin + chk.strays + chk.messes + chk.trash + chk.lights) - 2 * chk.empty;
  const hrs = staff.reduce((a, e) => a + bits(e.sched[weekday()]), 0);
  if (SIM) { redNights = posTerm.budget() - (SIM ? +staff.reduce((a, e) => a + bits(e.sched[weekday()]) * empRate(e), 0).toFixed(2) : 0) < 0 ? redNights + 1 : 0;
    if (redNights === 1) logAct("The owner called: the store's in the red. Three nights of that and you're done here", "bad");
    if (redNights === 2) logAct("The owner called again: one more night in the red and you're fired", "bad");
    if (redNights >= 3) logAct("The owner came by at close. You're fired", "bad"); }
  const wages = SIM ? +staff.reduce((a, e) => a + bits(e.sched[weekday()]) * empRate(e), 0).toFixed(2) : 0; if (wages) posTerm.sale(-wages);   // the staff's pay for the day: their scheduled hours
  if (posTerm.budget() < 0) logAct(`The store's in the red: -$${(-posTerm.budget()).toFixed(2)}. Nothing on the register can be bought until it's back up`, "bad");
  if (chkPts) { shiftScore(chkPts); logAct(`Closing check: ${[chk.bin && `${chk.bin} in the returns bin`, chk.strays && `${chk.strays} misshelved`, chk.messes && `${chk.messes} messes`, chk.lights && `${chk.lights} burnt-out light${chk.lights > 1 ? "s" : ""}`, chk.trash && `${chk.trash} lots of trash not taken out`, chk.empty && `${chk.empty} empty rack spots`].filter(Boolean).join(", ")}`, "bad", null, chkPts); }
  const goals = (shift.goals || []).map(g => goalState(g, chk)), met = goals.filter(g => g.mark === "✓").length;
  if (met) { posTerm.sale(20 * met); shiftScore(50 * met); logAct(`Day goals: ${met} of ${goals.length} met`, "good", 20 * met, 50 * met); }
  const s = shift.stats, d = shiftDate(), W = 34, money = n => "$" + n.toFixed(2);
  const members = posTerm.members.filter(m => m.active).length, nextM = [50, 75, 100, 125, 150].find(n => n > members);
  const row = (k, v) => k + " " + ".".repeat(Math.max(1, W - k.length - String(v).length - 2)) + " " + v;
  const tried = s.served + s.walkouts, score = (tried ? 100 * s.served / tried : 100) - 15 * s.stolen;
  const gradeOf = sc => sc >= 93 ? "A" : sc >= 85 ? "B" : sc >= 75 ? "C" : sc >= 60 ? "D" : "F";
  const repD = !s.visitors ? 0 : Math.max(-10, Math.min(8, { A: 5, B: 3, C: 1, D: -2, F: -5 }[gradeOf(score)] - 2 * s.stolen - Math.floor((chk.messes + chk.trash) / 2) - (s.refunds ? 3 : 0) - Math.min(5, Math.ceil((s.drunkSeen || 0) / 2)) + (show.status === "done" && show.sold ? 2 : 0)));
  const repWas = repStars(); rep.v = Math.max(0, Math.min(100, rep.v + repD));
  const wom = SIM && s.visitors ? ({ A: 3, B: 2, C: 1 }[gradeOf(score)] || 0) + (repStars() >= 4) + (repStars() >= 5) : 0;   // a good night gets talked about
  growth.pending += wom; growth.prospects = Math.floor(growth.prospects / 2);   // whoever meant to come in today and didn't: half of them lose interest
  if (repD) logAct(`Reputation ${repD > 0 ? "up" : "down"}: ${starStr(repStars())}${repStars() !== repWas ? (repStars() > repWas ? " (a star up!)" : " (a star down)") : ""}`, repD > 0 ? "good" : "bad");
  const grade = !s.visitors ? "-" : score >= 93 ? "A" : score >= 85 ? "B" : score >= 75 ? "C" : score >= 60 ? "D" : "F";
  const line = "-".repeat(W), date = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
  $("shiftSlip").textContent = [
    "JELLYBUSTER VIDEO #0417".padStart(28), "END OF SHIFT".padStart(23), "",
    row(`${WEEKDAYS[d.getDay()]} ${date}`, `DAY ${shift.day}`), row("CLOCKED OUT", fmtClock(shift.h)), line,
    row("CUSTOMERS IN", s.visitors), row("RUNG UP", s.served), row("WALKED OUT", s.walkouts),
    row("TAPES RENTED", s.rentals), row("RETURNS CHECKED IN", s.returns), row("SNACK UPSELLS", s.upsells),
    row("SHOPLIFTERS CAUGHT", s.caught), row("TAPES STOLEN", s.stolen), line,
    row("RENTALS", money(s.rentalTake)), row("SNACKS", money(s.snackTake)), row("SHOW TICKETS", money(s.tickets * SHOW.ticket - s.refunds)), row("LATE FEES", money(s.feesCollected)),
    row("FEES WAIVED", money(s.feesWaived)), row("TOTAL TAKE", money(s.rentalTake + s.snackTake + s.feesCollected + s.tickets * SHOW.ticket - s.refunds)),
    ...(wages ? [row(`STAFF WAGES (${hrs} HRS)`, "-" + money(wages))] : []), row("STORE BUDGET", money(posTerm.budget())), line, "CLOSING CHECK",
    row("  LEFT IN RETURNS BIN", chk.bin), row("  MISSHELVED TAPES", chk.strays), row("  MESSES", chk.messes), row("  BURNT-OUT LIGHTS", chk.lights), row("  TRASH NOT TAKEN OUT", chk.trash), row("  EMPTY RACK SPOTS", chk.empty),
    row("  POINTS", chkPts.toLocaleString()), line, "DAY GOALS", ...goals.map(g => row(`  ${g.mark} ${g.text}`.slice(0, W - 8), g.mark === "✓" ? "+$20" : "-")), line, "",
    row("REPUTATION", `${starStr(repStars())} ${repD > 0 ? "+" : ""}${repD || "="}`), ...repProgress(),
    ...(SIM ? [row("NEW MEMBERS SIGNED UP", s.signups), row("WORD OF MOUTH: TOMORROW", `+${growth.pending}`),
      row("MEMBERS", nextM ? `${members} (NEXT: ${nextM})` : members)] : []),
    ...(SIM && redNights ? [row("NIGHTS IN THE RED", `${Math.min(redNights, 3)} OF 3`), ...(redNights >= 3 ? ["", "YOU'RE FIRED.".padStart(23), "THE OWNER WANTS YOUR KEYS".padStart(29)] : [])] : []),
    row("STORE SCORE", s.score.toLocaleString()), row("  YOURS", s.you.toLocaleString()), row("  THE STAFF'S", s.dana.toLocaleString()),
    row("  LOST (WALKOUTS, THEFT)", (s.score - s.you - s.dana).toLocaleString()), "", `SHIFT GRADE:  ${grade}`.padStart(22), "", "THANK YOU - BE KIND, REWIND".padStart(30),
  ].join("\n");
  $("shiftReport").style.display = "flex";
}
function beginShift() {                        // first thing in the morning: 9:00, doors locked, you just inside them
  shift.h = SHIFT.start; shift.warp = 0; shift.stats = shiftStats(); shift.goals = dayGoals();
  drunk.gut = drunk.blood = 0; drunk.hang = drunk.owe; drunk.owe = false;   // slept it off; a hangover's what's left (see hungover)
  for (const e of staff) { withEmp(e, empDespawn); e.sentHome = false; }   // (they went home overnight: in when their shifts start)
  for (const k of [...custs]) { if (!k.paid) for (const t of k.tapes) setOnShelf(t, true); k.tapes = []; k.tagged = false; custGone(k); }   // anyone still in at close went home too (unpaid tapes back on the shelf; ponytail: their snacks wait for a restock)
  posTerm.setDate(shiftDate()); calendarDraw(); corkDraw(); postersSwap(); decorDraw(); parkLot(shift.day, [5, 6].includes(shiftDate().getDay()));
  logAct(`— ${WEEKDAYS[shiftDate().getDay()]}, day ${shift.day} —`);
  { const sn = season(); for (const h of sn.today) logAct(`It's circled on the calendar: ${h.label}. ${h.rush > 1 ? "Expect a crowd" : "Expect a quiet one"}`, h.rush > 1 ? "good" : "");
    if (sn.lean.length) logAct(`Seasonal: ${sn.lean.includes("Holiday") ? "the holiday shelf" : sn.lean.includes("Horror") ? "horror" : sn.lean.join(" and ").toLowerCase()} is renting more than usual`); }
  boxDeliver();                                // yesterday's orders, by the front door
  // (a promise on the phone brings nobody's tape back by itself: they have to come in with it. One who's banned or fed
  // up never does, and after two days they're back on the call list, then billed as lost)
  for (const h of holds) if (h.day < shift.day) { h.day = shift.day; h.at = 11 + Math.random() * 3; h.coming = false; }   // didn't make it in: they'll come today
  phone.next = null;
  if (SIM && growth.pending) {                 // word got around: people will be in today to sign up at the counter
    growth.prospects = (growth.prospects || 0) + growth.pending; growth.pending = 0; growth.pT = 30;
    logAct(`Word's getting around: ${growth.prospects} ${growth.prospects > 1 ? "people" : "person"} might come in to sign up today`, "good");
  }
  setFrontLock(true);
  if (CUSTOMER) { cmMorning(); shiftHudTxt = ""; return; }   // (you're out on the lot: see customer mode)
  Object.assign(player, { x: 0, z: 1.4, yaw: Math.PI, pitch: 0 }); gateLastZ = player.z;
  shift.greet = `${WEEKDAYS[shiftDate().getDay()]} · day ${shift.day}. Doors open at 10 — unlock them when you're ready${drunk.hang ? ". Ugh, your head's pounding" : ""}`;
  if (SIM && shift.day === 1) {                // a new simulation: where it goes from here
    logAct("Your store's bare bones for now: no staff, the theater's locked, and part of the library's still to come");
    logAct("Everything it earns goes in the budget. Spend it on the register: U for upgrades, O to order snacks");
    logAct("Reputation builds a night at a time: an A shift moves it most, and a new star takes a few good nights in a row");
  }
  shiftHudTxt = "";
}
function nextShift() {
  shift.report = false; $("shiftReport").style.display = "none";
  if (SIM && !CUSTOMER && redNights >= 3) {        // fired: tomorrow you're back, on the other side of the counter
    redNights = 0; shift.day++; beginShift(); shift.h = SHIFT.open - 0.25;
    return becomeCustomer("The owner let you go: three nights in the red.");
  }
  shift.day++; beginShift(); saveState();
  const p = lockMouse();
  p?.catch?.(() => { $("titleScreen").style.display = "flex"; });
}
$("shiftNext").addEventListener("click", nextShift);
