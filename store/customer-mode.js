// ---------------- customer mode: the store from the other side of the counter ----------------
// You're not on staff: the store runs without you (a full crew covers every hour it's open, every day: see
// cmRoster), and you come in off the lot in your own clothes with your own wallet. What you take off the shelves is
// the store's till you pay for it at the counter (E on whoever's on the register): walk out with it and the gates
// go off, or somebody sees you go, or (nobody looking) you get away with it. Behind the counter, the break room,
// the janitor's closet are staff only: anyone on staff who sees you back there wants you out (once, a warning
// back to the floor; then you're walked out and not let back in today). Being a good customer counts: the staff
// get to know a regular (trust: slower to call you on things, and a discount), and lose it when you're caught.
// Some doors are locked, some things padlocked, and what opens them is out there somewhere: keys, a note with a
// combination, a badge that logs into the register, a code on its screen. Each opens the way to the next (see
// ITEMS / KEYED / PICKUPS / COMBOS), and it all leads up to the roof. Your own things go in the same nine pockets
// as everything else; a note in hand can be read. Money turns up too: dropped bills, change in the trash.
// A store kept on staff can be flipped to this (becomeCustomer): in simulation, three nights in the red and the
// owner lets you go.
const CM_ALLOWANCE = 15;                          // $ found in your jacket each morning (after the first)
const cm = { wallet: 40, owed: 0, tab: 0, strikes: 0, today: 0, banned: 0, heat: 0, seer: null, found: new Set(), rented: new Map(), paidUnits: new Set(),
  goal: false, going: false, inside: false, closeT: 0, doorHint: 0, alarmWas: false, invWas: [], checkT: 0, greet: null,
  trust: 0, seed: 0, loggedIn: false, pinTries: 0, termLock: 0, tookCash: 0, short: 0, rec: null, teed: false, wary: new Set(), alert: 0, card: false, nagged: 0, ticket: 0, watchT: 0, watched: false, hatch: false, typed: "", comboOf: null, comboWas: null, spillHint: false, term: null, searched: new Set(), day: null, heardT: 0 };
const cmMoney = n => (n < 0 ? "-$" : "$") + Math.abs(n).toFixed(2);
function cmLog(text, kind = "", money = null) { logAct.mine = true; try { logAct(text, kind, money); } finally { logAct.mine = false; } }
const cmDayStats = () => ({ spent: 0, found: 0, rented: 0, returned: 0, fees: 0, caught: 0, stolen: 0, items: [] });
cm.day = cmDayStats();
const cmRegular = () => cm.trust >= 60;           // a regular: they know your name, and knock 10% off

// ---- your own things: carried in the inventory like anything else (heldItem while one's "in hand") ----
const ITEMS = {
  card: { id: "card", icon: "badge", name: "JellyBuster member card", about: "your name in marker, a magnetic stripe", color: "#1b3fa0", tag: "#ffd400" },
  breakKey: { id: "breakKey", icon: "key", name: "Break room key", about: "a brass key on a red tag: BREAK RM", color: "#d9b44a", tag: "#c0392b" },
  closetKey: { id: "closetKey", icon: "key", name: "Janitor's key", about: "a steel key on a yellow tag: JANITOR", color: "#c4cad0", tag: "#f1c40f" },
  comboNote: { id: "comboNote", icon: "note", name: "Folded note", about: "notebook paper, folded in four", color: "#f4f1e6",
    note: "", spent: () => cm.found.has("combo:locker") },   // (written from this save's trail: see cmTrailSet)
  badge: { id: "badge", icon: "badge", name: "Ray's employee badge", about: "RAY · JELLYBUSTER VIDEO #0417 · a mag stripe on the back", color: "#1b3fa0", tag: "#ffd400" },
  pinNote: { id: "pinNote", icon: "note", name: "Post-it", about: "yellow, a little gummy", color: "#f7e36b", note: "", spent: () => cm.loggedIn },
  printout: { id: "printout", icon: "note", spent: () => cm.hatch, name: "Register printout", about: "thermal paper, curling already", color: "#f7f7f2",
    note: "" },
};
const itemIcons = {};
function itemIcon(it) {                           // drawn: the inventory slot's picture (a key, a badge, a bit of paper)
  if (itemIcons[it.id]) return itemIcons[it.id];
  const c = document.createElement("canvas"); c.width = c.height = 96; const x = c.getContext("2d");
  if (it.icon === "badge") {
    x.save(); x.translate(48, 50); x.rotate(-0.2); x.fillStyle = "#f2f2ee"; x.fillRect(-26, -34, 52, 68);
    x.fillStyle = it.color; x.fillRect(-26, -34, 52, 16); x.fillStyle = it.tag; x.fillRect(-14, -8, 28, 24);
    x.fillStyle = "#333"; x.fillRect(-18, 22, 36, 4); x.fillRect(-18, 29, 24, 3); x.restore();
  } else if (it.icon === "note") {
    x.save(); x.translate(48, 50); x.rotate(0.15); x.fillStyle = it.color; x.fillRect(-28, -34, 56, 68);
    x.strokeStyle = "#9db3d6"; x.lineWidth = 2; for (let y = -22; y < 32; y += 9) { x.beginPath(); x.moveTo(-24, y); x.lineTo(24, y); x.stroke(); }
    x.strokeStyle = "#333"; x.lineWidth = 2.5; for (let y = -24; y < 20; y += 9) { x.beginPath(); x.moveTo(-20, y); x.lineTo(-20 + 14 + Math.random() * 26, y); x.stroke(); } x.restore();
  } else {
    x.lineWidth = 9; x.strokeStyle = it.color; x.fillStyle = it.color;
    x.beginPath(); x.arc(30, 40, 15, 0, Math.PI * 2); x.stroke();                     // the bow
    x.fillRect(43, 36, 40, 9); x.fillRect(66, 45, 6, 12); x.fillRect(76, 45, 6, 9);      // the blade, its teeth
    x.fillStyle = it.tag; x.save(); x.translate(26, 64); x.rotate(-0.4); x.fillRect(-12, 0, 24, 26); x.restore();   // the tag
  }
  return itemIcons[it.id] = c.toDataURL();
}
const cmHas = id => inv.some(e => e.kind === "item" && e.ref.id === id);
function cmGive(id) {                            // into your pockets (and in hand)
  if (!invMakeRoom()) { toast("Your pockets are full"); return false; }
  heldItem = ITEMS[id]; invSync();
  $("holdingTag").style.display = "block"; $("holdingName").textContent = ITEMS[id].name;
  cm.day.items.push(ITEMS[id].name);
  return true;
}
function cmNoteTick() {                           // a note in hand: there it is, readable, down in the corner
  const el = $("notePaper"), it = heldItem?.note ? heldItem : null;
  if ((el.dataset.id || "") === (it?.id || "")) return;
  el.dataset.id = it?.id || ""; el.style.display = it ? "block" : "none"; el.textContent = it ? it.note : "";
}

// ---- the doors you need a key for (staff walk through them all day: a door left open is a way in) ----
const KEYED = [
  { key: "breakKey", room: "break room", door: () => doors.find(d => !d.push && d.alongX && d.c === BOH_DOORS.breakroom) },
  { key: "closetKey", room: "janitor's closet", door: () => doors.find(d => !d.push && !d.alongX && d.c === BOH_DOORS.closet) },
];
const keyedOf = d => KEYED.find(k => k.door() === d);
// ---- the padlocks: a combination, typed on the number keys while you're looking at the lock ----
const COMBOS = {
  locker: { name: "Ray's locker", code: "", at: [BOH.splitX + 0.49, 0.93, 31.32], gives: "badge", open: "The padlock clicks open. Ray's locker: a can of Skoal, a Walkman, and his employee badge" },
  hatch: { name: "the roof hatch", code: "", open: "The padlock on the hatch drops open. The roof's yours" },
};
const comboDone = c => c === COMBOS.hatch ? cm.hatch : cm.found.has("combo:locker");
function cmComboKey(d) {                          // a digit typed at a padlock -> true if it went to one
  const c = cm.comboOf; if (!c || comboDone(c)) return false;
  cm.typed += d;
  if (cm.typed.length < c.code.length) { posBeep(900); return true; }
  if (cm.typed !== c.code) { cm.typed = ""; toast("The shackle doesn't budge"); return true; }
  cm.typed = ""; posBeep(1400);
  if (c === COMBOS.hatch) { cm.hatch = true; cmLog("Opened the padlock on the roof hatch", "good"); }   // (the printout's spent: see cmSpentTick)
  else { cm.found.add("combo:locker"); cmLog(`Opened ${c.name}`, "good"); }
  toast(c.open, true);
  if (c.gives) setTimeout(() => cmTakeFrom(c), 1600);   // (and straight into your pockets, if there's room)
  cmSpentTick();
  return true;
}
const comboLeft = c => c.gives && comboDone(c) && !cm.found.has(c.gives);   // open, and what's in it still there
function cmTakeFrom(c) {                           // what's in an opened lock: yours if you've room, else it waits for you
  if (!comboLeft(c)) return;
  if (inv.length >= INV_MAX) return toast(`No room in your pockets: ${ITEMS[c.gives].name} stays in ${c.name} for now`);
  if (cmGive(c.gives)) { cm.found.add(c.gives); cmLog(`Took ${ITEMS[c.gives].name}`, "good"); }
}
// used up: the note once the locker's open, the printout once the hatch is. Out of your pockets, so they're free
function cmSpentTick() {
  for (const e of [...inv]) if (e.kind === "item" && e.ref.spent?.()) { invRemove(e); toast(`Tossed the ${e.ref.name.toLowerCase()}: you won't need it again`, true); }
}
const comboTip = c => comboLeft(c) ? `E — take ${ITEMS[c.gives].name}<div class="cat">${c.name}, open</div>` : comboDone(c) ? `${c.name[0].toUpperCase() + c.name.slice(1)}<div class="cat">open</div>`
  : `${c.name[0].toUpperCase() + c.name.slice(1)} · a combination padlock<div class="cat">type the numbers: ${c.code.split("").map((_, i) => cm.typed[i] ?? "_").join(" ")}</div>`;

// ---- what there is to find: things lying about (a key mesh, a dollar bill), and places to look (search: no mesh,
// just somewhere to put your hand). Once found it stays found; daily ones (money) turn up fresh each morning ----
// The trail, this save's own (see cmTrailSet): every one of these is a place to search, in every game, and most of
// them turn up nothing (or a little change). Which ones hold the break room key, Ray's note and his PIN, and the
// codes themselves, come from the save's seed. Searched is searched for good (bins: for the day, except what's in one)
const SEARCHES = {
  cushions: { area: "public", search: "between the couch cushions", at: () => [SEATS[1].x, 0.5, SEATS[1].z - 0.2], box: [1.9, 0.14, 0.16] },   // (the crease along the back, the whole couch: the seats in front of it are still for sitting)
  coffee: { area: "public", search: "under the coffee table", at: () => [TV.x, 0.22, TV.z - 1.8], r: 0.28 },
  tank: { area: "public", search: "under the toilet tank lid", at: () => [BOH.splitX - 0.55, 0.82, 34.79], r: 0.2 },
  "bin:restroom": { area: "public", bin: "restroom" },
  "bin:lobby": { area: "public", bin: "lobby" },
  jacket: { area: "break", search: "the jean jacket's pockets", at: () => [BOH.splitX + 0.17, 1.3, 31.97], r: 0.2 },
  vest: { area: "break", search: "the spare vest's pocket", at: () => [BOH.splitX + 0.17, 1.38, 32.66], r: 0.18 },
  pizza: { area: "break", search: "under the empty Tony's box", at: () => [BOH.splitX + 2.02, 0.79, 31.67], r: 0.2 },
  timecard: { area: "break", search: "the time cards in the rack", at: () => [BOH_DOORS.breakroom + 1.53, 1.32, 30.0], r: 0.22 },
  keyboard: { area: "counter", search: "under the register keyboard", at: () => [-5.45, 1.14, 3.72], r: 0.14 },
  pad: { area: "counter", search: "under the desensitizer pad", at: () => [DESENS_AT.x, 1.13, DESENS_AT.z], r: 0.13 },
  printer: { area: "counter", search: "around the receipt printer", at: () => [PRN_AT.x, 1.16, PRN_AT.z], r: 0.13 },
};
const NOTHING = ["Nothing. A gum wrapper", "Nothing but lint", "Nothing there", "Just dust", "A bottle cap. Nothing useful", "Nothing. Somebody's old receipt"];
const PICKUPS = [];                               // (this save's search spots and what's in them: see cmTrailSet)
const cmTrail = { key: null, note: null, pin: null, cards: "" };
function cmTrailSet() {                           // from the save's seed: the codes, and which spot holds what
  let sd = cm.seed; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647, pick = a => a[Math.floor(rnd() * a.length)];
  COMBOS.locker.code = String(100 + Math.floor(rnd() * 900)); COMBOS.hatch.code = String(1000 + Math.floor(rnd() * 9000));
  cmTrail.pin = String(1000 + Math.floor(rnd() * 9000));
  const ids = area => Object.keys(SEARCHES).filter(k => SEARCHES[k].area === area);
  Object.assign(cmTrail, { keyAt: pick(ids("public")), noteAt: pick(ids("break").filter(k => k !== "timecard")), pinAt: pick(ids("counter")) });
  const dash = c => c.split("").join(" - "), L = COMBOS.locker.code;
  ITEMS.comboNote.note = `Ray —\nYour locker combo starts\n${L[0]} - ${L[1]} - ?\nThe last number's on your time\ncard, like ALWAYS. Don't make\nme come find you!!      — D`;
  ITEMS.pinNote.note = `RAY\nPIN ${dash(cmTrail.pin)}\n(DON'T TELL MGR)`;
  ITEMS.printout.note = `MSG FROM: MGR\n----------------------\nROOF HATCH LOCK IS\n${dash(COMBOS.hatch.code)}\nAC GUY THURS. NOBODY\nELSE GOES UP THERE.\n----------------------`;
  PICKUPS.length = 0;
  for (const [id, sp] of Object.entries(SEARCHES)) {
    if (sp.bin) continue;                         // (a trash can's searched with E on the can: see cmSearchBin)
    const gives = id === cmTrail.keyAt ? { item: "breakKey" } : id === cmTrail.noteAt ? { item: "comboNote", cash: 1 } : id === cmTrail.pinAt ? { item: "pinNote" }
      : id === "timecard" ? { info: `Ray's time card, in the rack. In the corner, in pencil, circled: ${L[2]}` } : { cash: rnd() < 0.25 ? 0.25 : 0, nothing: pick(NOTHING) };
    const found = gives.item === "breakKey" ? "A key on a red tag: BREAK RM. Somebody's going to be looking for that"
      : gives.item === "comboNote" ? "A folded note (and a dollar)" : gives.item === "pinNote" ? "A post-it with a number on it, stuck where nobody'd see it" : null;
    PICKUPS.push({ id, ...sp, gives, found });
  }
}
const CM_MONEY_SPOTS = [[-9, -3], [5.5, -2.5], [-3, -6.4], [9, -6.8], [12, -1.1], [-6, -0.9], [-3.6, 13.5], [4.2, 17], [7.8, 21.6], [-1.4, 24.6], [6.5, 9.4], [-4.8, 26.4], [3.2, 26.2], [9.6, 12.8]];
const pickupMeshes = [];
function pickupMesh(p) {
  const g = new THREE.Group();
  if (p.mesh === "key") {
    const it = ITEMS[p.gives.item], m = new THREE.MeshPhongMaterial({ color: it.color, specular: 0xffffff, shininess: 80 });
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.004, 8, 16), m); bow.position.x = -0.022; g.add(bow);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.008, 0.003), m); blade.position.x = 0.007; g.add(blade);
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.006, 0.003), m); tooth.position.set(0.016, -0.006, 0); g.add(tooth);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.0015, 6, 14), new THREE.MeshPhongMaterial({ color: 0xaaaaaa })); ring.position.set(-0.034, -0.004, 0); g.add(ring);
    const tag = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.032, 0.002), new THREE.MeshLambertMaterial({ color: it.tag })); tag.position.set(-0.042, -0.02, 0); tag.rotation.z = 0.3; g.add(tag);
    if (p.lying) g.rotation.x = -Math.PI / 2;                          // flat on the porcelain
  } else if (p.mesh === "bill") {                // a bill, folded once and dropped
    const tex = makeTexture((ctx, W, H) => { ctx.fillStyle = "#c9d6b4"; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = "#4f6b47"; ctx.lineWidth = 6; ctx.strokeRect(8, 8, W - 16, H - 16);
      ctx.fillStyle = "#4f6b47"; ctx.beginPath(); ctx.ellipse(W / 2, H / 2, 22, 26, 0, 0, 7); ctx.fill(); ctx.font = "bold 28px Georgia"; ctx.fillText(String(p.gives.cash), 16, 40); ctx.fillText(String(p.gives.cash), W - 40, H - 16); }, 192, 84);
    const m = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide });
    for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.PlaneGeometry(0.078, 0.066), m); h.position.set(s * 0.037, 0.006, 0); h.rotation.set(-Math.PI / 2, s * 0.25, 0); g.add(h); }
  }
  const hit = new THREE.Mesh(p.box ? new THREE.BoxGeometry(...p.box) : new THREE.SphereGeometry(p.r || (p.mesh === "bill" ? 0.14 : 0.09), 8, 6), new THREE.MeshBasicMaterial()); hit.visible = false; hit.userData.pickup = p; g.add(hit);   // (a bigger target than the thing itself)
  const [x, y, z] = p.at(); g.position.set(x, y, z); if (p.ry) g.rotation.y = p.ry;
  scene.add(g); aimables.push(hit); pickupMeshes.push({ p, g, hit });
}
function cmPickupsBuild() { for (const p of PICKUPS) if (!cm.found.has(p.id)) pickupMesh(p); }
function cmPickupGone(p) {
  const i = pickupMeshes.findIndex(q => q.p === p), q = pickupMeshes[i];
  if (q) { q.g.removeFromParent(); aimables.splice(aimables.indexOf(q.hit), 1); pickupMeshes.splice(i, 1); }
}
function cmMoneyDrop() {                          // the day's dropped money: a few bills on the lot and the floor, where nobody's noticed yet
  for (const q of [...pickupMeshes]) if (q.p.daily) cmPickupGone(q.p);
  let seed = 104729 * shift.day + 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const spots = CM_MONEY_SPOTS.filter(([x, z]) => !blocked(x, z)).sort(() => rnd() - 0.5).slice(0, 2 + Math.floor(rnd() * 3));
  spots.forEach(([x, z], i) => { if (cm.searched.has(`money${shift.day}-${i}`)) return; const cash = rnd() < 0.12 ? 5 : 1;
    pickupMesh({ id: `money${shift.day}-${i}`, daily: true, mesh: "bill", at: () => [x, floorHeightAt(x, z), z], ry: rnd() * 6.28, gives: { cash }, found: cash > 1 ? "A five, folded up on the floor. Finders keepers" : "A dollar bill. Finders keepers" }); });
}
function cmPickUp(p) {
  if (p.area === "counter" && !cmBehindCounter(player.x, player.z)) return toast("You can't get at it from this side of the counter");
  if (p.search && !p.daily) return cmSearch(p);
  if (p.gives.item && !cmGive(p.gives.item)) return;
  if (p.gives.cash) { cm.wallet += p.gives.cash; cm.day.found += p.gives.cash; }
  if (p.daily) cm.searched.add(p.id); else cm.found.add(p.id);   // (the day's money: gone till tomorrow's)
  cmPickupGone(p);
  toast(p.found, true); cmLog(p.gives.item ? `Found: ${ITEMS[p.gives.item].name}${p.gives.cash ? ` (and ${cmMoney(p.gives.cash)})` : ""}` : `Found ${cmMoney(p.gives.cash)}`, "good", p.gives.cash || null);
}
function cmSearch(p) {                            // a place to look: what's there (if anything), and it's searched
  const g = p.gives;
  if (g.item && !cmGive(g.item)) return toast("There's something there, but your pockets are full");
  if (g.cash) { cm.wallet += g.cash; cm.day.found += g.cash; }
  cm.found.add(p.id); cmPickupGone(p);
  if (g.item) { toast(`You search ${p.search}. ${p.found}`, true); cmLog(`Found ${ITEMS[g.item].name.toLowerCase()} ${p.search.replace(/^the /, "in the ")}`, "good", g.cash || null); }
  else if (g.info) { toast(g.info, true); cmLog(g.info, "good"); }
  else { toast(`You search ${p.search}. ${g.cash ? `A quarter. ${g.nothing.split(".")[0]} else` : g.nothing}`, !!g.cash); if (g.cash) cmLog(`Found ${cmMoney(g.cash)} ${p.search.replace(/^the /, "in the ")}`, "", g.cash); }
  if (p.area !== "public" || g.item) cmNotice(2);
}
function cmSearchBin(b) {                         // a trash can: once a day, worth a look (change, now and then)
  if (cmTrail.keyAt === `bin:${b.id}` && !cm.found.has(cmTrail.keyAt)) {   // (the key's in this one: it stays in there till you've room for it)
    if (!cmGive("breakKey")) return toast("There's something in there, but your pockets are full");
    cm.found.add(cmTrail.keyAt); toast(`You dig through the ${b.name}. Under the paper towels: a key on a red tag, BREAK RM`, true); cmLog(`Found the break room key in the ${b.name}`, "good"); cmNotice(4); return;
  }
  if (cm.searched.has(b.id)) return toast("Already been through that one today");
  cm.searched.add(b.id);
  let seed = 7919 * shift.day + b.id.length * 31 + b.n; const r = ((seed * 16807) % 2147483647) / 2147483647;
  const cash = r < 0.35 ? [0.25, 0.5, 0.35, 1, 0.75][Math.floor(r * 100) % 5] : 0;
  if (cash) { cm.wallet += cash; cm.day.found += cash; toast(`You dig through the ${b.name}: ${cmMoney(cash)} in change`, true); cmLog(`Found ${cmMoney(cash)} in the ${b.name}`, "good", cash); }
  else toast(`You dig through the ${b.name}. Nothing but trash`);
  cmNotice(4);
}

// ---- the crew: in customer mode the store's never short-handed. Three at least, and every hour it's open covered:
// one opens (9-5), one closes (4-midnight), one's in for the middle of the day (noon-8) and works the floor ----
const CM_SHIFTS = [[0, 8], [7, 8], [3, 8]];      // [first hour (from 9 AM), hours]
const CM_FLOOR_JOBS = { cleanup: 1, returns: 2, restock: 2, floor: 2, phone: 3, register: 3 };
function cmRoster() {
  while (staff.length < 3) staff.push(makeEmployee(staff.length || SIM ? rollApplicant() : DANA_APP, staff.length));
  staff.forEach((e, i) => { const [a, n] = CM_SHIFTS[i % 3]; e.sched = Array(7).fill(((1 << n) - 1) << a); if (i % 3 === 2) for (const j of e.jobs) j.pri = CM_FLOOR_JOBS[j.id] ?? j.pri; });
}

// ---- staff only: where a customer has no business being ----
function cmStaffOnly(x = player.x, z = player.z) {
  if (player.onRoof) return null;                 // (nobody's up there to see)
  if (x < -2.6 && z > 0 && z < 3.65) return "behind the counter";
  const lz = player.inBooth ? "booth" : lightZoneAt(x, z);
  return lz === "breakroom" || lz === "closet" || lz === "booth" || lz === "stairwell" ? `in the ${ZONE_NAMES[lz]}` : null;   // (the booth and its stairs too: staff only)
}
const cmBehindCounter = (x, z) => x < -2.6 && z > 0 && z < 3.65;
// can e see you? Looking your way (or right next to you), close enough, the light on where you are (or close), and
// nothing in between: walls and shut doors always, and crouched, anything you could duck behind. Running, they
// hear you instead: close by, whichever way they're facing (not through a wall)
function segCrossesBox(ax, az, bx, bz, b) {     // (on the floor plan: does a→b pass through box b)
  let t0 = 0, t1 = 1; const dx = bx - ax, dz = bz - az;
  for (const [p, d, lo, hi] of [[ax, dx, b.x0, b.x1], [az, dz, b.z0, b.z1]]) {
    if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return false; continue; }
    let u = (lo - p) / d, v = (hi - p) / d; if (u > v) [u, v] = [v, u];
    t0 = Math.max(t0, u); t1 = Math.min(t1, v); if (t0 > t1) return false;
  }
  return true;
}
const cmRunning = () => (keys.has("ShiftLeft") || keys.has("ShiftRight")) && !keys.has("KeyC") && ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].some(k => keys.has(k));
function cmSees(e) {
  const c = e.c; if (!c || !c.group.visible || e.leaving) return false;
  const p = c.group.position, dx = player.x - p.x, dz = player.z - p.z, d = Math.hypot(dx, dz), crouch = keys.has("KeyC"), w = cmWary(e) ? 1.4 : 1, heard = cmRunning() && d < 5 * w;
  if (d > (crouch ? 7 : 12) * w) return false;
  if (!heard && !zoneOn[lightZoneAt(player.x, player.z)] && d > 2.5) return false;   // in the dark
  if (!heard && d > 1.4) { const ry = c.group.rotation.y; if ((Math.sin(ry) * dx + Math.cos(ry) * dz) / d < 0.35) return false; }   // not looking your way (right up close, they hear you)
  const eye = crouch && !heard ? 1.0 : 1.6;
  for (const b of colliders) if (!b.staff && !(b.y1 != null && b.y1 < eye) && segCrossesBox(p.x, p.z, player.x, player.z, b)) return false;
  return true;
}
// a little noise out on the floor (digging through the trash, a spill): whoever sees it thinks a bit less of you
function cmNotice(n) { const e = staff.find(cmSees); if (e) { cm.trust = Math.max(0, cm.trust - n); e.c?.setMood("meh"); } return e; }

// ---- what's yours, what isn't, and what it costs ----
const cmPrice = e => (e.kind === "tape" ? posTerm.rentPrice(e.ref) : e.kind === "snack" ? snackPrice(e.ref.userData.snack) : e.kind === "popcorn" ? 1.5 : 0) * (cmRegular() ? 0.9 : 1);
const cmPaid = e => !!GUEST || e.kind === "item" || (e.kind === "tape" ? cm.rented.has(e.ref) : e.kind === "snack" ? !!e.ref.userData.paid : !!e.ref?.paid);
const cmUnpaid = () => inv.filter(e => !cmPaid(e));
function invRemove(e) {                          // taken off you: out of the inventory (and your hand, if it was in it)
  const i = inv.indexOf(e); if (i < 0) return;
  if (i === invSel) invStash(); else if (invSel > i) invSel--;
  inv.splice(i, 1); invRender();
}
function cmPay(e) {                               // E on whoever's on the register, across the counter from them
  const due = cmUnpaid(), total = +(due.reduce((a, x) => a + cmPrice(x), 0) + cm.tab + cm.owed).toFixed(2);
  if (!total) return toast(`${e.first}: "${cmRegular() ? "Hey, you! " : ""}Let me know if you need anything!"`, true);
  if (co) return toast(`${e.first}: "Be right with you, one sec."`, true);
  if (total > cm.wallet + 1e-9) return toast(`That comes to ${cmMoney(total)}. You've only got ${cmMoney(cm.wallet)} on you`);
  const tapes = due.filter(x => x.kind === "tape"), snacks = due.filter(x => x.kind !== "tape"), s = shift.stats;
  if (tapes.length && !cm.card) {                 // first rental: they sign you up, and there's your card
    if (inv.length >= INV_MAX) return toast(`${e.first}: "I'll need to make you a card first. Free a hand?" (your pockets are full)`);
    cm.card = true; const sel = invSel; cmGive("card"); if (sel >= 0) invSelect(sel);
    toast(`${e.first} signs you up: "Here's your card. Don't lose it!"`, true); cmLog("Signed up for a JellyBuster card", "good");
  }
  for (const x of tapes) { cm.rented.set(x.ref, shift.day + 3); x.ref.desens = true; }
  const took = cm.rec?.day === shift.day && !cm.rec.done && tapes.some(x => titleOfCopy(x.ref) === cm.rec.title);
  if (took) { cm.rec.done = true; cm.trust = Math.min(100, cm.trust + 3); cmLog(`Took ${cm.rec.by}'s pick: ${cm.rec.title.title}`, "good"); }
  for (const x of snacks) { if (x.kind === "snack") { x.ref.userData.paid = true; cm.paidUnits.add(x.ref); } else x.ref.paid = true; }
  cm.wallet -= total; posTerm.sale(total);
  s.served++; s.rentals += tapes.length; s.rentalTake += tapes.reduce((a, x) => a + cmPrice(x), 0); s.snackTake += snacks.reduce((a, x) => a + cmPrice(x), 0) + cm.tab; s.feesCollected += cm.owed;
  const what = [tapes.length && `${tapes.length} tape${tapes.length > 1 ? "s" : ""} (due back day ${shift.day + 3})`, snacks.length && `${snacks.length} snack${snacks.length > 1 ? "s" : ""}`,
    cm.tab && `${cmMoney(cm.tab)} for what you'd already eaten`, cm.owed && `${cmMoney(cm.owed)} in late fees`].filter(Boolean).join(", ");
  const wasRegular = cmRegular();
  cm.day.spent += total; cm.day.rented += tapes.length; cm.day.fees += cm.owed;
  cmRentAtRegister(e);
  cm.tab = cm.owed = 0; cm.trust = Math.min(100, cm.trust + 4 + tapes.length);
  posBeep(1900); setTimeout(() => posBeep(1500), 120); e.c?.setMood("happy");
  cmStaffMet(e);                                  // (they know you a little better: see the staff)
  toast(`${e.first} rings you up: ${cmMoney(total)}${wasRegular ? " (regular's discount)" : ""}. "${took ? (cm.rec.by === e.first ? "Ooh, good choice. Told you!" : `${cm.rec.by} told you about that one, huh?`) : "Thanks! Be kind, rewind."}"`, true);
  cmLog(`Paid ${cmMoney(total)}: ${what}`, "", -total);
  if (!wasRegular && cmRegular()) { toast(`${e.first}: "You're in here all the time! I'll knock ten percent off from now on."`, true); cmLog("The staff know me now: a regular's 10% off", "good"); }
}

// ---- getting caught, and getting away with it ----
const CM_FLOOR = { x: -4.2, z: 6.6, yaw: -Math.PI / 2 }, CM_LOT = { x: 2.6, z: -3.4, yaw: Math.PI };
function cmFade(then) {                          // a blink to black while you're moved
  const f = $("fade"); f.style.opacity = 1;
  setTimeout(() => { then(); gateLastZ = player.z; cm.inside = player.z > 0.05; setTimeout(() => { f.style.opacity = 0; }, 250); }, 450);
}
function cmPutAt(p) { if (seated) seated = false; Object.assign(player, { x: p.x, z: p.z, yaw: p.yaw, pitch: 0, onRoof: false, inBooth: false }); keys.clear(); }   // (down on the ground, wherever you were)
function cmCaught(why, by) {                     // why: "staff" (somewhere you shouldn't be) | "theft"
  const name = by?.first || "The clerk", taken = cmUnpaid();
  cmTermClose();
  for (const e of taken) {                        // the store's things go back to the store
    if (e.kind === "tape") { returnBin.push(e.ref); refreshReturnsBin(); }
    else if (e.kind === "snack" && !stockCarry.has(e.ref)) e.ref.visible = true;
    invRemove(e);
  }
  cm.tab = 0; cm.heat = 0; cm.strikes++; cm.today++; cm.day.caught++; if (by?.id) cm.wary.add(by.id);
  cm.trust = Math.max(0, cm.trust - (why === "theft" ? 40 : 15));
  by?.c?.setMood("angry");
  if (why === "staff" && cm.today === 1) {
    toast(`${name}: "Whoa, you can't be back here. Employees only." They walk you back out to the floor`);
    cmLog(`Caught somewhere I shouldn't have been. ${name} let me off with a warning`, "bad");
    cmFade(() => cmPutAt(CM_FLOOR));
  } else {
    cm.banned = shift.day;
    toast(why === "theft" ? `${name}: "Hey! You didn't pay for that." They take it back and walk you out. Don't come back today` : `${name}: "Okay, that's it. Out." You're walked out, and not welcome back today`);
    cmLog(why === "theft" ? `Caught walking out without paying${taken.length ? ` (${taken.length} thing${taken.length > 1 ? "s" : ""} taken back)` : ""}. Thrown out for the day` : `Caught in back again. Thrown out for the day`, "bad");
    cmFade(() => cmPutAt(CM_LOT));
  }
}
function cmGotAway(unpaid) {                      // out the door with it and nobody saw
  const tapes = unpaid.filter(e => e.kind === "tape");
  for (const e of unpaid) { if (e.kind === "tape") { cm.rented.set(e.ref, 0); e.ref.desens = true; } else if (e.kind === "snack") { e.ref.userData.paid = true; cm.paidUnits.add(e.ref); } else e.ref.paid = true; }
  shift.stats.stolen += tapes.length; cm.day.stolen += unpaid.length; cm.tab = 0;
  toast("Nobody saw a thing. It's yours now", true);
  cmLog(`Walked out without paying: ${unpaid.map(e => e.kind === "tape" ? e.ref.title : e.kind === "snack" ? e.ref.userData.snack.name : "popcorn").join(", ") || "what I'd eaten"}`, "bad");
}

// ---- the cardboard bed out back: lie down and let a few hours go by (the clock runs fast while you're out, so the
// day still happens: see skipHour); after close, sleep through to the morning ----
function cmSleep() {
  if (afterClose()) { toast("You curl up on the cardboard. Morning comes soon enough", true); cmNextDay(); return; }
  const to = Math.min(SHIFT.close, shift.h + 3);
  cm.sleeping = true; shift.warp = to; keys.clear();
  const f = $("fade"); f.style.opacity = 1; f.textContent = "Zzz…"; cmLog(`Lay down out back for a while (${fmtClock(shift.h)} to ${fmtClock(to)})`);
}
function cmSleepTick() {
  if (!cm.sleeping || shift.warp > shift.h) return;
  cm.sleeping = false; const f = $("fade"); f.style.opacity = 0; f.textContent = "";
  toast(`You wake up stiff. ${fmtClock(shift.h)}`, true);
}

// ---- a drink, spilled on purpose: somebody on staff will come and mop it up (and they're not at the register) ----
function cmSpill() {
  if (!heldSnack || !isDrink(heldSnack.userData.snack) || !snackLeft || !cm.inside || player.onRoof) return false;
  const e = inv[invSel], x = player.x - Math.sin(player.yaw) * 0.7, z = player.z - Math.cos(player.yaw) * 0.7;
  if (blocked(x, z)) { toast("No room to spill it there"); return true; }
  if (!cmPaid(e)) cm.tab += cmPrice(e);
  messAdd("spill", x, z); snackLeft = 0; snackTag();
  const by = cmNotice(10);
  toast(by ? `${by.first}: "Whoa, careful! I'll grab the mop."` : "Oops. Somebody'll be along with a mop", !by);
  return true;
}

// ---- the movies: the staff put on a feature every night the theater's open (picked in the morning, in the deck at
// 8). A ticket's T at the register; with one, a seat in the auditorium while it's on is a night out ----
function cmFeature() {                            // the morning: tonight's film, if nobody's picked one
  if (!owned("theater") || show.day === shift.day) return;
  const films = catalog.filter(t => t.seasons?.[0]?.episodes?.length === 1 && !libLocked(t) && onShelfCopy(t));
  if (!films.length) return;
  let seed = 15485863 * shift.day + 11; const r = ((seed * 16807) % 2147483647) / 2147483647;
  showSet(films[Math.floor(r * films.length)]);
}
const cmShowToday = () => owned("theater") && show.title && show.day === shift.day;
const cmTicketOpen = () => cmShowToday() && !show.status && shift.h < SHOW.at && !afterClose();
function cmTicket(e) {
  if (!cmTicketOpen()) return toast(cmShowToday() ? `${e.first}: "Sorry, we're done selling for tonight."` : `${e.first}: "No show tonight, sorry."`, true);
  if (cm.ticket === shift.day) return toast(`${e.first}: "You've already got one! Eight o'clock, the doors open at quarter till."`, true);
  if (show.sold >= Math.min(10, theaterSeats.length)) return toast(`${e.first}: "Sold out tonight, sorry!"`, true);
  const price = SHOW.ticket * (cmRegular() ? 0.9 : 1);
  if (price > cm.wallet + 1e-9) return toast(`A ticket's ${cmMoney(price)}. You've only got ${cmMoney(cm.wallet)}`);
  cm.wallet -= price; posTerm.sale(price); show.sold++; shift.stats.tickets++; cm.ticket = shift.day; cm.day.spent += price;
  posBeep(1900); e.c?.setMood("happy");
  toast(`${e.first}: "One for ${show.title.title}, eight o'clock. Enjoy the show!"`, true);
  cmLog(`Bought a ticket for ${show.title.title} at 8 PM`, "", -price);
}
function cmShowTick(dt) {
  if (!cmShowToday()) return;
  if (["arriving", "late"].includes(show.status) && shift.h >= SHOW.at - 0.02 && !filmOn() && cm.started !== shift.day) {   // the staff start it, once (whatever's in the VCR comes out to Returns)
    const c = onShelfCopy(show.title); cm.started = shift.day;
    if (c) { const old = playing?.tape; setOnShelf(c, false); playEpisode(0, c); showTableBox(c); if (old && old !== c) { returnBin.push(old); refreshReturnsBin(); } }
  }
  if (show.status === "on" && cm.ticket === shift.day && seated && lightZoneAt(player.x, player.z) === "theater") cm.watchT += dt;
  if (show.status === "done" && cm.ticket === shift.day && !cm.watched) {
    cm.watched = true;
    if (cm.watchT > 20) { cm.trust = Math.min(100, cm.trust + 5); cm.day.items.push(`SAW ${show.title.title.toUpperCase()}`); cmLog(`Saw ${show.title.title} in the theater`, "good"); toast(`The lights come up. ${show.title.title}: not bad at all`, true); }
    else cmLog(`Bought a ticket for ${show.title.title} and never sat down for it`);
  }
}

// ---- ask them what's good: whoever you talk to (away from the register) has a pick for you, once a day. Rent it
// and they'll remember you took them up on it ----
function cmRecommend(e) {
  if (cm.rec?.day === shift.day) return toast(`${e.first}: "${cm.rec.done ? `Did you like ${cm.rec.title.title}?` : `Seriously, ${cm.rec.title.title}. ${cm.rec.title.category}. You won't regret it.`}"`, true);
  let seed = 31 * shift.day + e.first.charCodeAt(0) * 7 + 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const films = catalog.filter(t => t.seasons?.[0]?.episodes?.length === 1 && !libLocked(t) && onShelfCopy(t));
  if (!films.length) return toast(`${e.first}: "Finding everything okay?"`, true);
  const t = films[Math.floor(rnd() * films.length)];
  cm.rec = { title: t, by: e.first, day: shift.day, done: false };
  toast(`${e.first}: "Have you seen ${t.title}? It's over in ${t.category}. Trust me."`, true);
  cmLog(`${e.first} says to rent ${t.title} (${t.category})`);
}

// ---- the end of the trail (for now): up on the roof, a ball off the mat ----
function cmTeeOff() {
  if (cm.teed) return;
  cm.teed = true; cm.day.items.push("TEED OFF FROM THE ROOF");
  cmLog("Teed off from the roof of the video store. Nobody will ever believe it", "good");
  setTimeout(() => toast(`Teed off from the roof. That's the whole trail: ${shift.day} day${shift.day > 1 ? "s" : ""}, caught ${cm.strikes} time${cm.strikes === 1 ? "" : "s"}. (More to find, one day)`, true), 2500);
}
// ---- a good customer: a misshelved tape put back where it goes is noticed (more if someone sees you do it) ----
function cmHelped(t) {
  const by = staff.find(cmSees); cm.trust = Math.min(100, cm.trust + (by ? 4 : 2));
  if (by) { by.c?.setMood("happy"); toast(`${by.first}: "Oh, thanks! People just stick them anywhere."`, true); }
  cmLog(`Put a misshelved ${t.title} back where it goes`, "good");
  cmStaffShelved();
  cm.day.shelved = (cm.day.shelved || 0) + 1;
}
// ---- the staff remember: whoever caught you today keeps an eye on you; and the morning after Ray's badge goes
// missing, everyone's on the lookout ----
const cmWary = e => cm.wary.has(e.id) || cm.alert === shift.day;

// ---- the register, with a badge: logged in as Ray. What the store knows ----
function cmTermOpen() {
  if (!cmBehindCounter(player.x, player.z)) return toast("You'd have to be behind the counter to use it");
  if (cm.termLock === shift.day) return toast("The register's locked: SEE MANAGER. Not today");
  cm.term = { page: cm.loggedIn ? "menu" : "login", pin: "" }; cmTermDraw(); keys.clear();
}
function cmNoSale() {                             // the drawer pops with a ding: anyone close enough hears it
  drawerOpen = 1; posBeep(1200); setTimeout(() => posBeep(1500), 100);
  for (const e of staff) if (e.c && !e.leaving && Math.hypot(e.c.group.position.x - player.x, e.c.group.position.z - player.z) < 9) { cm.heat = Math.min(0.95, cm.heat + 0.45); cm.wary.add(e.id); e.c.setMood("shock"); }
  cmLog("Rang NO SALE on the register", "bad");
}
function cmTermClose() { if (!cm.term) return; cm.term = null; $("cmTerm").style.display = "none"; drawerOpen = 0; }
function cmTermDraw() {
  const t = cm.term, el = $("cmTerm"); if (!t) return;
  const head = `JELLYBUSTER VIDEO #0417      ${t.page === "login" ? "SIGN IN " : "USER: RAY"}\n` + "=".repeat(38) + "\n";
  const late = [...cm.rented].filter(([, due]) => due > 0 && shift.day > due);
  const body = t.page === "msgs" ? `MESSAGES (1)\n\nFROM: MGR\nRE: roof\n\nRoof hatch lock is ${COMBOS.hatch.code.split("").join("-")}.\nAC guy Thurs. NOBODY else goes\nup there. I mean it.\n\n[P] PRINT IT   [B] BACK`
    : t.page === "you" ? `CUSTOMER LOOKUP: WALK-IN\n\nRENTALS OUT ...... ${cm.rented.size}\nOVERDUE .......... ${late.length}\nFEES OWED ........ ${cmMoney(cm.owed)}\nTRUST ............ ${cm.trust >= 60 ? "REGULAR" : cm.trust >= 25 ? "FRIENDLY" : "NEW FACE"}\n\n${cm.owed ? "[W] WAIVE FEES   " : ""}[B] BACK`
    : t.page === "sched" ? "TODAY'S SCHEDULE\n\n" + staff.map((e, i) => { const m = e.sched[weekday()], a = Math.log2(m & -m), n = bits(m); return `${e.first.toUpperCase().padEnd(10)} ${m ? `${fmtClock(SCHED_H0 + a)} - ${fmtClock(SCHED_H0 + a + n)}` : "OFF"}${e.lunchDay === shift.day ? "  (LUNCH TAKEN)" : n >= 5 && m ? "  LUNCH ~MIDDAY" : ""}`; }).join("\n") + "\n\nLUNCH: 30 MIN, BREAK ROOM\n\n[B] BACK"
    : t.page === "login" ? `BADGE ..... RAY (ACCEPTED)\nPIN ....... ${[0, 1, 2, 3].map(i => t.pin[i] ? "*" : "_").join(" ")}\n\nTYPE THE PIN ON THE NUMBER KEYS\n${cm.pinTries ? `${3 - cm.pinTries} TRIES LEFT\n` : ""}\n[E] CANCEL`
    : t.page === "drawer" ? `NO SALE\n\nTHE DRAWER'S OPEN. TWENTIES, TENS,\nROLLS OF QUARTERS${cm.found.has("drawerKey") ? "" : ", AND UNDER THE\nTRAY: A STEEL KEY ON A YELLOW TAG"}.\n\n${cm.found.has("drawerKey") ? "" : "[K] TAKE THE KEY\n"}${cm.tookCash === shift.day ? "" : "[M] TAKE A TWENTY\n"}[B] SHUT THE DRAWER`
    : "[1] MESSAGES\n[2] CUSTOMER LOOKUP\n[3] SCHEDULE\n[4] NO SALE (OPEN THE DRAWER)\n\n[E] LOG OUT";
  el.textContent = head + body + (t.msg ? `\n\n> ${t.msg}` : ""); el.style.display = "block";
}
function cmTermKey(e) {                           // -> true if the terminal took the key
  const t = cm.term; if (!t) return false;
  if (e.repeat) return true;
  const k = e.code;
  if (k === "KeyE" || k === "KeyQ" || k === "Escape") { cmTermClose(); return true; }
  t.msg = "";
  if (t.page === "login") {
    if (/^Digit\d$/.test(k)) t.pin += k[5];
    if (t.pin.length === 4) {
      if (t.pin === cmTrail.pin) { cm.loggedIn = true; t.page = "menu"; cmLog("Logged into the register as Ray", "bad"); cmSpentTick(); }
      else if (++cm.pinTries >= 3) { cm.termLock = shift.day; cm.pinTries = 0; cmTermClose(); toast("INVALID PIN. TERMINAL LOCKED: SEE MANAGER. It won't take another try today"); cmLog("Locked myself out of the register for the day", "bad"); return true; }
      else { t.msg = "INVALID PIN"; posBeep(400); }
      t.pin = "";
    }
  }
  else if (t.page === "menu") { if (k === "Digit1") t.page = "msgs"; else if (k === "Digit2") t.page = "you"; else if (k === "Digit3") t.page = "sched"; else if (k === "Digit4") { t.page = "drawer"; cmNoSale(); } }
  else if (t.page === "drawer" && k === "KeyB") { drawerOpen = 0; t.page = "menu"; }
  else if (t.page === "drawer" && k === "KeyK" && !cm.found.has("drawerKey")) {
    if (inv.length >= INV_MAX) t.msg = "YOUR POCKETS ARE FULL";
    else { cmGive("closetKey"); cm.found.add("drawerKey"); t.msg = "THE JANITOR'S KEY. (it's in your pocket)"; cmLog("Took the janitor's key out of the cash drawer", "good"); }
  }
  else if (t.page === "drawer" && k === "KeyM" && cm.tookCash !== shift.day) {
    cm.tookCash = shift.day; cm.wallet += 20; posTerm.sale(-20); cm.day.stolen++; cm.short = shift.day; t.msg = "A TWENTY. (nobody saw. probably)";
    cmLog("Took a twenty out of the register", "bad", 20);
  }
  else if (k === "KeyB") t.page = "menu";
  else if (t.page === "msgs" && k === "KeyP") {
    if (cmHas("printout") || cm.hatch) t.msg = cm.hatch ? "PAPER JAM. (you don't need it anyway)" : "ALREADY PRINTED";
    else if (inv.length >= INV_MAX) t.msg = "PRINTED... but your pockets are full. (free one up and print it again)";
    else { posBeep(1200); cmGive("printout"); cm.found.add("printout"); t.msg = "PRINTED. (it's in your pocket)"; cmLog("Printed the manager's message off the register", "good"); }
  }
  else if (t.page === "you" && k === "KeyW" && cm.owed) { t.msg = `WAIVED ${cmMoney(cm.owed)}`; cmLog(`Waived my own late fees on the register (${cmMoney(cm.owed)})`, "bad"); cm.owed = 0; }
  cmTermDraw();
  return true;
}

// ---- customer mode: the staff, as people. Each of them gets to know you on their own (a day at a time: talk to
// them, or have them ring you up), apart from what the store thinks of you (cm.trust). Known a couple of days,
// they've got your name and a word about their day; a bit better, a small favor, and something for it (a tip about
// the trail, a comp for the show). Idle at the counter, they talk about you (overheard close by: who caught you
// passes it on, a good word makes the other one warmer). And a regular they know well can ask for an application:
// an answer a morning later, and a yes puts you on staff (becomeCustomer, the other way) ----
cm.crew = {}; cm.fav = null; cm.app = null;       // (saved with cm: see cmStaffSave) crew: { [their id]: { k: how well they know you, day: the last day that went up, n: lines said } }
const CM_KNOW = { name: 2, favor: 3, apply: 4 };   // how well they need to know you for each
const CM_NAMES = ["Sam", "Alex", "Chris", "Pat", "Jamie", "Casey", "Robin", "Terry", "Jordan", "Lee", "Corey", "Jesse"];
const cmStaffYou = () => CM_NAMES[cm.seed % CM_NAMES.length];   // your name (the one in marker on your card)
const cmStaffOf = e => cm.crew[e.id] ||= { k: 0, day: 0, n: 0 };
const cmStaffOn = () => staff.filter(e => e.c && !e.leaving);
const cmStaffWho = a => cmStaffOf(a).k >= CM_KNOW.name ? cmStaffYou() : "that customer";   // how a talks about you
function cmStaffMet(e) {                          // talked to, or rung up by: once a day, they know you a little better
  const s = cmStaffOf(e); if (s.day === shift.day || cm.wary.has(e.id)) return s;
  s.day = shift.day; s.k++;
  if (s.k === CM_KNOW.name) cmLog(`${e.first} knows my name now`, "good");
  return s;
}
const CM_MSGS = [["your mom called. Call her back", "Ugh. Thanks"], ["the manager wants you to call him", "Oh no. What did I do"], ["your ride's running late tonight", "Great. Thanks for telling me"],
  ["you left your headlights on", "Oh, come on. Thanks"], ["it's your turn to take the trash out", "It is NOT. ...Fine"], ["Tony's is doing two-for-one tonight", "Now we're talking"]];
function cmStaffFavorAsk(e) {                     // known well enough: once a day (store-wide), a small favor
  if (cm.favDay === shift.day || cmStaffOf(e).k < CM_KNOW.favor) return false;
  const pick = a => a[(shift.day + e.first.length) % a.length], other = cmStaffOn().find(o => o !== e);
  if (shift.day % 2 && other) {                   // pass a message on to whoever else is in
    const [msg, reply] = pick(CM_MSGS);
    cm.fav = { kind: "msg", by: e.id, byName: e.first, to: other.id, toName: other.first, msg, reply, day: shift.day, done: false };
    toast(`${e.first}: "${cmStaffYou()}, do me a favor? If you see ${other.first}, tell them ${msg}. I can't leave the counter."`, true);
  } else {                                        // a tape somebody stuck in the wrong spot: back where it goes
    let st = strays[0];
    if (!st) {
      const ts = catalog.filter(t => !libLocked(t) && onShelfCopy(t)), c = ts.length && onShelfCopy(pick(ts)), at = c && ts.map(onShelfCopy).find(x => x && x.category !== c.category);
      if (!at) return false;
      setOnShelf(c, false); misshelve(c, null, at); st = strays.at(-1);
    }
    cm.fav = { kind: "shelf", by: e.id, byName: e.first, title: st.copy.title, cat: st.at?.category || "the wrong section", day: shift.day, done: false };
    toast(`${e.first}: "${cmStaffYou()}, do me a favor? Somebody stuck ${st.copy.title} over in ${cm.fav.cat}. If you're over there, put it back where it goes?"`, true);
  }
  cm.favDay = shift.day; e.c?.setMood("happy");
  cmLog(`${e.first} asked me a favor: ${cm.fav.kind === "msg" ? `tell ${cm.fav.toName} ${cm.fav.msg}` : `put ${cm.fav.title} back where it goes`}`);
  return true;
}
function cmStaffShelved() { if (cm.fav?.kind === "shelf" && !cm.fav.done) { cm.fav.done = true; setTimeout(() => toast(`That's the favor for ${cm.fav?.byName}. Go tell them`, true), 2200); } }   // (from cmHelped: any misshelved tape you put back will do)
function cmStaffHint() {                          // what they know about the trail: the next thing you haven't found
  const sp = SEARCHES[cmTrail.keyAt];
  if (!cm.found.has(cmTrail.keyAt) && !cmHas("breakKey")) return `Ray lost the break room key again. If I had to bet? ${sp?.search ? sp.search[0].toUpperCase() + sp.search.slice(1) : `It went out with the ${sp?.bin} trash`}`;
  if (!cm.found.has("combo:locker")) return "Ray can't ever remember his locker combination. He writes the last number on his time card, I swear";
  if (!cm.loggedIn) return "Ray's got his register PIN on a post-it somewhere behind the counter. If the manager ever finds it...";
  if (!cm.found.has("drawerKey")) return "You know where the janitor's key lives? In the register drawer, under the tray. Don't ask me why";
  if (!cm.hatch) return "The manager left a message about the roof on the register. Nobody's supposed to go up there";
  if (!cm.teed) return "There's a golf mat up on the roof. Ray hits balls off it on his break. Into the trees, mostly";
  return null;
}
function cmStaffThanks(e, f) {                    // the favor, done: what they owe you
  f.paid = true; cmStaffOf(e).k++; cm.trust = Math.min(100, cm.trust + 5); e.c?.setMood("love");
  const hint = cmStaffHint(), comp = !hint && cmTicketOpen() && cm.ticket !== shift.day && show.sold < Math.min(10, theaterSeats.length);
  if (comp) { cm.ticket = shift.day; show.sold++; shift.stats.tickets++; }
  toast(`${e.first}: "Thanks, ${cmStaffYou()}. I owe you one. ${hint ? `Here's something: ${hint}."` : comp ? `Here, on me: ${show.title.title}, eight o'clock."` : "Seriously.\""}`, true);
  cmLog(hint ? `Did ${e.first} a favor. They let me in on something: ${hint}` : comp ? `Did ${e.first} a favor: a free ticket for ${show.title.title} tonight` : `Did ${e.first} a favor`, "good");
}
function cmStaffLine(e) {                         // a word about their day: what's going on first, then what they're like
  const s = cmStaffOf(e), m = e.sched[weekday()], end = SCHED_H0 + 32 - Math.clz32(m), other = cmStaffOn().find(o => o !== e);
  const top = SKILL_IDS.reduce((a, k) => (e.skills[k]?.lvl ?? 1) > (e.skills[a]?.lvl ?? 1) ? k : a, SKILL_IDS[0]), cat = catalog[(shift.day * 7 + e.first.length) % catalog.length]?.category || "Horror";
  const now = [
    ["lunch", "lunchSit"].includes(e.state) && "Mm. On my lunch. Gimme a sec",
    cm.rec?.by === e.first && cm.rec.day === shift.day && (cm.rec.done ? `So? Did you like ${cm.rec.title.title}?` : `Seriously, ${cm.rec.title.title}. ${cm.rec.title.category}. You won't regret it`),
    messes.length && (messes.length > 2 ? "It's a mess in here today. I'll get to it. I'll get to it" : "Somebody spilled something again. Story of my life"),
    e.lunchDay === shift.day ? "Tony's for lunch again. I can't keep doing this" : shift.h > 11.5 && shift.h < 14.5 && bits(m) >= 5 && "I'm starving. My lunch better be soon",
    cmShowToday() && (shift.h < SHOW.at ? `We're showing ${show.title.title} at eight.${cm.ticket === shift.day ? " You've got a ticket? Nice" : " Tickets at the register"}` : show.status === "on" && "The movie's on in there. I'm missing the good part"),
    m && end - shift.h > 0 && end - shift.h < 1 && "Less than an hour and I'm out of here",
    custs.length >= 5 && "Crazy in here today, huh?",
  ];
  const them = [
    { cha: "I could talk movies all day. Seriously, try me", int: `I've seen every tape in ${cat}. Some of them twice`, dex: "I can rewind four tapes and ring somebody up at the same time. It's a gift",
      str: "I moved every shelf in this place last month. My back hasn't forgiven me", con: "Double shift tomorrow. I don't even mind anymore", wis: "You can always tell who's going to bring their tapes back late. Always" }[top],
    other && `I was just telling ${other.first} about ${CHAT_TOPICS[(shift.day + s.n) % CHAT_TOPICS.length]}`,
    s.k >= CM_KNOW.apply && "You're in here more than I am. We should put your picture up by the register",
  ];
  const all = [...now, ...them].filter(Boolean);
  return all[s.n++ % all.length];
}
function cmStaffTalk(e) {                         // E on one of them, away from the register: whatever's between you, else a pick, else small talk
  const s = cmStaffOf(e), f = cm.fav, me = cmStaffYou(), a = cm.app;
  if (f?.kind === "msg" && f.to === e.id && !f.done) {   // the message, passed on
    f.done = true; cmStaffMet(e); e.c?.setMood("shock");
    return toast(`You tell ${e.first} ${f.msg}. ${e.first}: "${f.reply}. Tell ${f.byName} thanks."`, true);
  }
  if (f?.by === e.id && f.done && !f.paid) return cmStaffThanks(e, f);
  if (cm.wary.has(e.id)) { e.c?.setMood("angry"); return toast(`${e.first}: "Mm-hm. I've got my eye on you."`); }
  if (a?.ans && !a.told) {                        // the answer to your application
    a.told = true; cmStaffMet(e);
    if (a.ans === "no") { a.again = shift.day + 5; e.c?.setMood("meh"); cmLog("Heard back about my application: they went with somebody else", "bad"); return toast(`${e.first}: "Hey, ${me}... the manager went with somebody else. Sorry. Try again next week?"`); }
    e.c?.setMood("love"); cmLog("Heard back about my application: they want me", "good");
    return toast(`${e.first}: "${me}! The manager read your application. You're hired, if you want it. We're short today: say the word and grab a vest." (E again to take the job)`, true);
  }
  if (a?.ans === "yes" && a.told) return cmStaffJoin();
  const met = s.day !== shift.day; cmStaffMet(e);
  if (s.k >= CM_KNOW.name && !s.named) { s.named = true; e.c?.setMood("happy"); return toast(`${e.first}: "I'm ${e.first}, by the way. ${cm.card ? `And you're ${me}, right? It's on your card."` : `And you are?" "${me}." "Nice to meet you, ${me}."`}`, true); }
  if (cm.rec?.day !== shift.day) return cmRecommend(e);   // (their pick: once a day)
  if (cmRegular() && s.k >= CM_KNOW.apply && !cm.found.has("badge") && (!a || a.ans === "no" && a.told && shift.day >= a.again)) {   // a job application (not with Ray's badge in your pocket)
    cm.app = { day: shift.day, by: e.first, strikes: cm.strikes, ans: null }; e.c?.setMood("happy");
    cmLog(`Filled out a job application. ${e.first}'s giving it to the manager`, "good");
    return toast(`${e.first}: "You know we're hiring, right? You're in here more than half of us. Here, fill this out, I'll give it to the manager." You hand it back. "Give it a day."`, true);
  }
  if (!f && cmStaffFavorAsk(e)) return;
  const line = cmStaffLine(e);
  toast(`${e.first}: "${met && s.k >= CM_KNOW.name ? `Hey, ${me}! ` : ""}${line}${/[.?!]$/.test(line) ? "" : "."}"`, true);
}
const cmStaffPending = e => cm.app?.ans && (!cm.app.told || cm.app.ans === "yes") || cm.fav?.kind === "msg" && cm.fav.to === e.id && !cm.fav.done || cm.fav?.by === e.id && cm.fav.done && !cm.fav.paid;
function cmStaffTip(e) {                          // the hover tip's second line, on one of them
  const s = cmStaffOf(e), f = cm.fav;
  if (cm.app?.ans === "yes" && cm.app.told) return "E — take the job";
  if (f?.kind === "msg" && f.to === e.id && !f.done) return `E — pass on ${f.byName}'s message`;
  if (f?.by === e.id && f.done && !f.paid) return "E — tell them it's done";
  return cm.wary.has(e.id) ? "keeping an eye on you" : s.k >= CM_KNOW.name ? "knows your name" : s.k ? "knows your face" : cmRegular() ? "knows you by now" : "on staff";
}
const CM_GOSSIP_R = 4.5;                          // close enough to hear them
function cmStaffGossip(a, b) {                    // a talking to b about you: -> { line, kind, then } or null
  const you = cmStaffWho(a), good = { kind: "good", then: () => { const s = cmStaffOf(b); if (s.word !== shift.day) { s.word = shift.day; s.k++; } } };
  if (cm.wary.has(a.id) && !cm.wary.has(b.id) && cm.day.caught) return { line: `...so I caught ${you} today. Keep an eye out, okay?`, kind: "bad", then: () => cm.wary.add(b.id) };
  if (cm.alert === shift.day) return { line: "...Ray swears his badge was in his locker. Who even does that?", kind: "bad" };
  if (cm.fav?.by === a.id && cm.fav.done && cm.fav.day === shift.day) return { ...good, line: `...and ${you} ${cm.fav.kind === "msg" ? "passed on a message for me" : "put a tape back for me"}. Didn't even have to ask twice` };
  if (cm.rec?.done && cm.rec.by === a.first && cm.rec.day === shift.day) return { ...good, line: `...${you} actually rented my pick. Somebody listens to me` };
  if (cm.app && !cm.app.ans) return { line: `...did you hear? ${you === "that customer" ? "One of the regulars" : you} put in an application`, kind: "" };
  if (cm.ticket === shift.day) return { line: `...${you}'s got a ticket for tonight. Save them a good seat`, kind: "" };
  if (cmRegular()) return { ...good, line: `...that's the regular I was telling you about. ${you === "that customer" ? "In here" : `${you}'s in here`} every day` };
  if (cm.strikes >= 2) return { line: "...isn't that the one who got thrown out?", kind: "bad", then: () => b.c?.setMood("meh") };
  return null;
}
function cmStaffTick(dt) {                        // (from cmTick) the gossip; a hello by name as you come in; whoever's wary of you thinks a bit less of you
  if (cm.inside && !cmStaffTick.was) cmStaffTick.hiT = 20;
  cmStaffTick.was = cm.inside;
  if (cmStaffTick.hiT > 0 && (cmStaffTick.hiT -= dt) > 0 && cm.hiDay !== shift.day && !afterClose()) {
    const e = staff.find(e => e.c && cmStaffOf(e).k >= CM_KNOW.name && !cm.wary.has(e.id) && Math.hypot(e.c.group.position.x - player.x, e.c.group.position.z - player.z) < 7 && cmSees(e));
    if (e) { cm.hiDay = shift.day; cmStaffTick.hiT = 0; e.c.setMood("happy"); toast(`${e.first}: "Hey, ${cmStaffYou()}!"`, true); }
  }
  for (const id of cm.wary) { const s = cm.crew[id] ||= { k: 0, day: 0, n: 0 }; if (s.cold !== shift.day) { s.cold = shift.day; s.k = Math.max(0, s.k - 1); } }
  for (const a of staff) {
    const b = a.chatWith; if (!b || !a.c || !b.c) continue;
    if (a.gossipAt !== a.chatAt && b.gossipAt !== b.chatAt) {   // a chat just started: is it about you? (once a chat, the first of them to speak)
      a.gossipAt = a.chatAt; b.gossipAt = b.chatAt; const g = a.gossip = cmStaffGossip(a, b); b.gossip = null; if (g) g.then?.();
    }
    const g = a.gossip; if (!g || g.heard || !cm.inside || player.onRoof) continue;
    const p = a.c.group.position, q = b.c.group.position;
    if (Math.min(Math.hypot(p.x - player.x, p.z - player.z), Math.hypot(q.x - player.x, q.z - player.z)) > CM_GOSSIP_R) continue;
    g.heard = true; toast(`Overheard, ${a.first} to ${b.first}: "${g.line}"`, g.kind !== "bad");
    cmLog(`Overheard ${a.first} telling ${b.first}: "${g.line.replace(/^\.\.\./, "")}"`, g.kind);
  }
}
function cmStaffMorning() {                       // (from cmMorning) yesterday's favor's gone stale; an application's been read
  if (cm.fav && !cm.fav.done) cm.fav = null;
  for (const e of staff) e.gossip = null;
  const a = cm.app; if (!a || a.ans || shift.day <= a.day) return;
  a.ans = cm.trust >= 60 && cm.strikes === a.strikes && cm.short !== shift.day - 1 ? "yes" : "no"; a.told = false;
  shift.greet = (shift.greet ? shift.greet + ". " : "") + "The store called about your application: ask anyone on staff";
}
function cmStaffJoin() {                          // hired: the vest, the name tag, the other side of the counter. What you had on you goes back (rentals returned), and the page reloads into it
  if (!CUSTOMER) return;
  for (const e of [...inv]) { if (e.kind === "tape") returnBin.push(e.ref); else if (e.kind === "snack" && !stockCarry.has(e.ref)) e.ref.visible = true; invRemove(e); }
  for (const c of cm.rented.keys()) if (c.offShelf && !returnBin.includes(c)) returnBin.push(c);
  cm.rented.clear(); refreshReturnsBin(); staff.forEach((e, i) => { e.sched = defaultSched(i); });
  cmLog("Took the job. I work here now", "good"); saveState();
  let d; try { d = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch {}
  if (d?.v !== SAVE_V) return;
  Object.assign(d, { role: "staff", inv: [], cm: undefined, redNights: undefined });
  saveOff = true;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(d)); sessionStorage.setItem("jellybuster-play", "1"); } catch {}
  location.reload();
}
const cmStaffSave = () => ({ crew: cm.crew, fav: cm.fav, app: cm.app, favDay: cm.favDay, hiDay: cm.hiDay });
function cmStaffLoad(S) { if (S) Object.assign(cm, { crew: S.crew || {}, fav: S.fav || null, app: S.app || null, favDay: S.favDay || 0, hiDay: S.hiDay || 0 }); }
// ---- customer mode: rentals, from your side of the counter. What you take home gets watched (two tapes a night,
// each wound on to its end: bring it back like that and it's a dollar to rewind it, so use the rewinders on the
// counter first). A night drop out front for when they're shut or you'd rather not go in (before ten, it counts as
// the day before). Anything overdue, the store calls the house about, and the clerk brings it up as you pay ----
const CM_RENT = { late: 1, rewind: 1, nightly: 2, drop: { x: -2.75, z: -0.4 } };   // $ a day late; $ to rewind one for you; tapes you get through a night; the drop box, on the walk left of the doors
const cmRent = { aim: false };
cm.rent = { rw: 0 };                              // (saved) rewind fees on your account, not paid yet
function cmRentReturn(c, due) {                  // a rental back (the returns slot, the night drop, its shelf): late fees, and was it rewound
  if (!cm.owed) cm.rent.rw = 0;                  // (paid off or waived since)
  cm.rented.delete(c); cm.day.returned++;
  const late = due > 0 ? Math.max(0, shift.day - due) : 0;
  if (late) cm.owed += late * CM_RENT.late;
  cmLog(`Returned ${c.title}${late ? ` · ${late} day${late > 1 ? "s" : ""} late (${cmMoney(late * CM_RENT.late)} owed)` : ""}`);
  if (isRewound(c) || !due) return;              // (one you walked out with: nobody's charging you for anything)
  cm.owed += CM_RENT.rewind; cm.rent.rw++; cm.day.rwFees = (cm.day.rwFees || 0) + CM_RENT.rewind;
  const by = cm.inside && !afterClose() && staff.find(e => e.c && !e.leaving);
  if (by) { by.c.setMood("meh"); toast(`${by.first}: "Aw, ${c.title}'s not rewound. That's ${cmMoney(CM_RENT.rewind)}, sorry. The rewinders are right there on the counter!"`); }
  cmLog(`Rewind fee: ${c.title} came back not rewound (${cmMoney(CM_RENT.rewind)} owed)`, "bad");
}
// the night drop: a steel box on the walk, the store's blue, a pull-down chute up top. It empties into the returns tote
function cmRentBuild() {
  const { x, z } = CM_RENT.drop, g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const blue = new THREE.MeshLambertMaterial({ color: 0x1b3fa0 }), steel = new THREE.MeshPhongMaterial({ color: 0xaab2ba, specular: 0xffffff, shininess: 60 }), dark = new THREE.MeshLambertMaterial({ color: 0x15171a });
  const add = (o, px, py, pz) => { o.position.set(px, py, pz); o.layers.set(EXTERIOR_LAYER); g.add(o); return o; }, bx = (w, h, d, m, px, py, pz) => add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m), px, py, pz);
  bx(0.56, 0.84, 0.42, blue, 0, 0.48, 0);                                                     // the body, up on its feet
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.56, 20, 1, false, 0, Math.PI), blue), 0, 0.9, 0).rotation.z = Math.PI / 2;   // the rounded top, like a mailbox
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(0.05, 0.06, 0.05, dark, sx * 0.24, 0.03, sz * 0.17);
  bx(0.4, 0.13, 0.012, dark, 0, 0.8, -0.212);                                                 // the chute
  bx(0.38, 0.11, 0.02, steel, 0, 0.8, -0.224);                                                // its flap
  const bar = add(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.26, 10), steel), 0, 0.765, -0.25); bar.rotation.z = Math.PI / 2;   // the pull
  for (const [text, w, h, y, fg, bg] of [["VIDEO RETURNS", 0.48, 0.12, 0.6, "#ffd400", "#00349c"], ["NIGHT DROP · BE KIND, REWIND", 0.48, 0.06, 0.47, "#00349c", "#f2f2ee"]]) {
    const p = textPlane(text, w, h, fg, bg); p.material = new THREE.MeshLambertMaterial({ map: p.material.map }); add(p, 0, y, -0.212).rotation.y = Math.PI;
  }
  colliders.push({ x0: x - 0.3, x1: x + 0.3, z0: z - 0.23, z1: z + 0.23 });
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.15, 0.46), new THREE.MeshBasicMaterial()); hit.visible = false; hit.position.set(x, 0.57, z); hit.userData.cmRentDrop = true; scene.add(hit); aimables.push(hit);
}
if (CUSTOMER) cmRentBuild();
const cmRentAiming = () => cmRent.aim && player.z < 0 && Math.hypot(player.x - CM_RENT.drop.x, player.z - CM_RENT.drop.z) < 2.2;
const cmRentTip = () => `${held ? `E — drop ${held.title} down the chute` : "The night drop"}<div class="cat">video returns${shift.h < SHIFT.open ? " · before 10 AM, it counts as yesterday" : ""}</div>`;
function cmRentDrop() {                           // E at the night drop: the tape in hand, down the chute (anything else, no)
  const c = held; if (!c) return toast(heldSnack || heldPopcorn || heldItem ? "Tapes only. It's not a trash can" : "Tapes go down the chute: take one in hand");
  const due = cm.rented.get(c);
  if (due > 0 && shift.h < SHIFT.open && shift.day > due) cm.rented.set(c, due + 1);   // before they've opened: last night's
  c.fromReturns = c.strayFix = false; returnBin.push(c); releaseFromHand(); refreshReturnsBin(); invSync();
  const at = new THREE.Vector3(CM_RENT.drop.x, 0.8, CM_RENT.drop.z); golfSnd("clank", at, 0.5); setTimeout(() => golfSnd("thud", at, 0.6), 300);
  toast(`Down the chute: ${c.title}. Clunk`, true);
  if (cm.rented.has(c)) cmRentReturn(c, cm.rented.get(c));   // (checked in now: nobody's waiting on the slot to notice)
}
function cmRentAtRegister(e) {                    // as you pay: what the fees were for, and what's still out that oughtn't be
  const rw = cm.owed ? Math.min(cm.rent.rw, Math.floor(cm.owed / CM_RENT.rewind + 1e-9)) : 0; cm.rent.rw = 0;
  const late = [...cm.rented].filter(([, due]) => due > 0 && shift.day > due);
  const say = [rw && `${cmMoney(rw * CM_RENT.rewind)} of that's for rewinding. Be kind, rewind!`,
    late.length && `And ${late.length === 1 ? `${late[0][0].title} is` : `${late.length} of your tapes are`} still out. That's ${cmMoney(CM_RENT.late)} a day till it's back.`].filter(Boolean);
  if (say.length) setTimeout(() => toast(`${e.first}: "${say.join(" ")}"`, true), 2800);
}
function cmRentMorning() {                        // the morning after: what you got through last night, and the answering machine
  const home = inv.filter(e => e.kind === "tape" && cm.rented.has(e.ref)).map(e => e.ref), watched = [];
  for (const c of home) {
    if (watched.length >= CM_RENT.nightly) break;
    if (windFrac(c) > 0.97) continue;            // still at its end from last time: you'd have had to rewind it
    const n = c.seasons[0].episodes.length; setWindFrac(c, n > 1 ? windFrac(c) + 3 / n : 1); watched.push(c);   // a movie, start to finish; a show, three episodes on
  }
  cm.day.watched = watched.map(c => c.title);
  for (const c of watched) {
    const pick = cm.rec?.done && cm.rec.title === titleOfCopy(c);
    if (pick) cm.trust = Math.min(100, cm.trust + 2);
    cmLog(pick ? `Watched ${cm.rec.by}'s pick last night, ${c.title}. They were right` : `Watched ${c.title} last night`, "good");
  }
  if (home.length > watched.length) cmLog(`Didn't get to ${home.filter(c => !watched.includes(c)).map(c => c.title).join(", ")}`);
  const late = [...cm.rented].filter(([, due]) => due > 0 && shift.day > due), today = [...cm.rented].filter(([, due]) => due === shift.day);
  const fees = late.reduce((a, [, due]) => a + (shift.day - due) * CM_RENT.late, 0);
  if (late.length) cmLog(`A message on the machine at home: "Hi, this is JellyBuster Video calling about ${late.map(([c]) => c.title).join(" and ")}. ${late.length === 1 ? "It was" : "They were"} due back day ${Math.min(...late.map(([, d]) => d))}. That's ${cmMoney(fees)} in late fees so far, and a dollar a day. Thanks!"`, "bad");
  const say = [watched.length && `Last night: ${watched.map(c => c.title).join(" and ")}`, late.length && `A message on the machine: ${late.length === 1 ? "a tape's" : `${late.length} tapes are`} overdue`, today.length && `Due back today: ${today.map(([c]) => c.title).join(", ")}`].filter(Boolean);
  if (say.length) shift.greet += `. ${say.join(". ")}`;
}
function cmRentSlip(row, line, W) {               // the day slip's lines for it
  const d = cm.day, out = [...(d.returned ? [row("TAPES RETURNED", d.returned)] : []), ...(d.rwFees ? [row("  REWIND FEES", cmMoney(d.rwFees))] : []),
    ...(d.watched?.length ? ["WATCHED LAST NIGHT", ...d.watched.map(n => "  " + n.toUpperCase().slice(0, W - 2))] : [])];
  return out.length ? [...out, line] : [];
}
// ---- customer mode: the other customers, and a reason to come back each day ----
// Each morning, three little things to do on your day off (rent something from one section, the staff's pick, see
// the show, find money on the floor, help somebody find a movie, put a stray tape back, don't get caught): up in the
// corner and on the slip, and each one done the staff think a little better of you. The other customers aren't just
// scenery: now and then one turns to you and asks what's good (bring them a tape and E with it in hand: they take it,
// or not), and one slipping a tape under their jacket can be pointed out to whoever's on staff (E on them), or just
// given a look. And the slip keeps your record: days in, tapes rented, times caught, your best day
const CM_DAY_GOALS = {
  cat: { text: g => `Rent a tape from ${g.cat}`, got: g => !!cm.day.cats?.includes(g.cat) },
  pick: { text: () => "Ask the staff what's good, and rent it", got: () => cm.rec?.day === shift.day && cm.rec.done },
  show: { ok: () => cmShowToday() && !show.status, text: g => `See ${g.film} at 8 PM`, got: () => cm.watched && cm.watchT > 20,
    fail: () => cm.watched || ["done", "failed"].includes(show.status) },
  money: { text: () => "Find some money lying around", got: () => cm.day.found > 0 },
  help: { text: () => "Help another customer find a movie", got: () => cm.day.helped > 0 },
  shelve: { text: () => "Put a misshelved tape back", got: () => cm.day.shelved > 0 },
  clean: { text: () => "Don't get caught anywhere today", atClose: true, got: () => !!cm.day.in && !cm.day.caught, fail: () => cm.day.caught > 0 },
};
cm.dayRecord = { days: 0, rented: 0, caught: 0, goals: 0, perfect: 0, told: 0, best: null, last: 0 };   // (saved: see cmSave)
const cmCust = { seen: null, checkT: 0, askT: 45, ask: null, thief: null };
function cmDayGoals() {                           // the morning's list: three, different every day
  const ids = Object.keys(CM_DAY_GOALS).filter(id => CM_DAY_GOALS[id].ok?.() ?? true), out = [];
  while (out.length < 3 && ids.length) {
    const id = ids.splice(Math.floor(Math.random() * ids.length), 1)[0], g = { id };
    if (id === "cat") { const cats = [...new Set(catalog.filter(t => !libLocked(t) && onShelfCopy(t)).map(t => t.category))]; if (!cats.length) continue; g.cat = cats[Math.floor(Math.random() * cats.length)]; }
    if (id === "show") g.film = show.title.title;
    out.push(g);
  }
  cm.day.goals = out;
}
const cmDayMark = g => g.done ? "✓" : g.miss ? "✗" : "☐";
const cmDayText = g => CM_DAY_GOALS[g.id]?.text(g) ?? g.id;
function cmDayDone(g) {                           // one off the list: the staff notice the good customer
  g.done = true; cm.trust = Math.min(100, cm.trust + 3);
  const all = cm.day.goals.every(q => q.done);
  toast(all ? `✓ ${cmDayText(g)}. That's today's whole list!` : `✓ ${cmDayText(g)}`, true);
  cmLog(`Done: ${cmDayText(g)}${all ? ". That's the whole list today" : ""}`, "good");
}
function cmDayCheck() {                           // (twice a second, and at the end of the day) anything on the list just done, or blown?
  if (!cm.day.goals) cmDayGoals();
  if (!cmCust.seen) cmCust.seen = new Set(cm.rented.keys());   // (what was already out when you came in doesn't count)
  for (const c of cmCust.seen) if (!cm.rented.has(c)) cmCust.seen.delete(c);
  for (const [c, due] of cm.rented) if (!cmCust.seen.has(c)) { cmCust.seen.add(c); if (due !== 0) (cm.day.cats ||= []).push(c.category); }   // rented today (paid for: walked out with doesn't count)
  for (const g of cm.day.goals) {
    const G = CM_DAY_GOALS[g.id]; if (!G || g.done || g.miss) continue;
    if (!G.atClose && G.got(g)) cmDayDone(g); else if (G.fail?.()) g.miss = true;
  }
}
function cmDayHud() { return (cm.day.goals || []).map(g => `${cmDayMark(g)} ${cmDayText(g)}`); }
function cmDayEnd() {                             // the end of the day: what's left on the list, and the record
  cmDayCheck();
  for (const g of cm.day.goals) if (!g.done && !g.miss) { if (CM_DAY_GOALS[g.id]?.atClose && CM_DAY_GOALS[g.id].got(g)) cmDayDone(g); else g.miss = true; }
  const r = cm.dayRecord, d = cm.day; if (r.last === shift.day) return; r.last = shift.day;
  const n = d.goals.filter(g => g.done).length;
  if (d.in) r.days++;
  r.rented += d.rented; r.caught += d.caught; r.goals += n; r.told += d.told || 0;
  if (d.in && n === d.goals.length) r.perfect++;
  if (d.in && (!r.best || n > r.best.n || (n === r.best.n && d.rented > r.best.rented))) r.best = { day: shift.day, n, of: d.goals.length, rented: d.rented };
}
function cmDaySlip(W, row, line) {                // the slip's lines: today's list, and your record
  cmDayEnd(); $("shiftSlip").style.maxHeight = "calc(100vh - 110px)";
  const r = cm.dayRecord, wrap = s => { const out = []; let l = ""; for (const w of s.split(" ")) { if (l && (l + " " + w).length > W) { out.push(l); l = "    " + w; } else l = l ? l + " " + w : w; } return [...out, l]; };
  return ["TODAY'S LIST", ...cm.day.goals.flatMap(g => wrap(`  ${cmDayMark(g)} ${cmDayText(g).toUpperCase()}`)), line,
    "YOUR RECORD", row("  DAYS IN THE STORE", r.days), row("  TAPES RENTED", r.rented), row("  TIMES CAUGHT", r.caught ? r.caught : "NEVER"),
    ...(r.told ? [row("  SHOPLIFTERS POINTED OUT", r.told)] : []), row("  WHOLE LISTS DONE", r.perfect),
    ...(r.best ? [row("  BEST DAY", `DAY ${r.best.day}, ${r.best.n} OF ${r.best.of}`)] : []), line];
}
// ---- run-ins: a shopper who wants to know what's good, and one with a tape up their jacket ----
function cmCustTick(dt) {                         // (every frame, as a customer; the work twice a second)
  if (shift.report || (cmCust.checkT -= dt) > 0) return; cmCust.checkT = 0.5;
  if (cm.inside && !player.onRoof) cm.day.in = true;
  cmDayCheck(); cmCustAskTick(0.5); cmCustThiefTick();
}
function cmCustAskTick(dt) {
  const a = cmCust.ask;
  if (a) {                                        // waiting on you
    const k = a.k, p = k.c?.group.position;
    if (!p || k.state !== "cmAsk") { cmCust.ask = null; return; }   // (something else came up: closing time, whoever they came with wants to go)
    k.ry = Math.atan2(player.x - p.x, player.z - p.z);
    if (k.hi <= 0 && k.c.mood !== "ask") k.c.setMood("ask");
    if (k.t <= 0 || Math.hypot(player.x - p.x, player.z - p.z) > 9 || !cm.inside) cmCustAskEnd(k, `${a.name}: "Never mind, I'll keep looking."`);
    return;
  }
  if (!cm.inside || player.onRoof || cmStaffOnly() || cm.banned === shift.day || !shiftOpen() || (cm.day.asked || 0) >= 3 || (cmCust.askT -= dt) > 0) return;
  const k = custs.find(k => { const p = k.c?.group.position, d = p && Math.hypot(player.x - p.x, player.z - p.z);
    return p && !k.kid && !k.thief && !k.cmAsked && k.state === "browse" && !k.fid && !k.chatting && k.who.persona.taste.cats.length && k.holding < k.who.persona.maxTapes && d > 0.8 && d < 5; });
  if (k) cmCustAsk(k); else cmCust.askT = 3;     // (nobody near: in a bit)
}
function cmCustAsk(k) {                           // a shopper turns to you: what's good?
  const cats = k.who.persona.taste.cats, cat = cats[Math.floor(Math.random() * cats.length)], name = memberName(k.member).split(" ")[0];
  k.cmAsked = true; k.state = "cmAsk"; k.path = []; k.t = 45; k.hi = 0; k.c.lookAt(null); k.c.setPose(k.holding ? "hold" : "idle"); k.c.setMood("ask");
  cmCust.ask = { k, cat, name, tries: 0 }; cm.day.asked = (cm.day.asked || 0) + 1;
  cmCust.askT = (90 + Math.random() * 120) * (cm.day.goals?.some(g => g.id === "help" && !g.done) ? 0.5 : 1);
  toast(`${name}: "Hey, you look like you know movies. Anything good in ${cat}?" (find one, and E on them with it in hand)`, true);
}
function cmCustAskEnd(k, say) {                   // back to their browsing
  cmCust.ask = null; if (say) toast(say);
  if (k.c && k.state === "cmAsk") { k.hi = 0; k.c.setMood("browse"); k.state = "browse"; k.t = 0; }
}
function cmCustE(k) {                             // E on another customer -> true if it was one of these
  const a = cmCust.ask, name = memberName(k.member).split(" ")[0];
  if (k === cmCust.thief && k.sneaking) {         // you look at them, then at the jacket
    const what = cmCustBust(k), by = staff.find(cmSees);
    if (by) cm.trust = Math.min(100, cm.trust + 2);
    toast(`You catch ${name}'s eye and look at the jacket. ${what} comes out onto the returns cart, and they're gone`, true);
    cmLog(`Gave ${memberName(k.member)} a look: they put ${what} down and left`, "good");
    return true;
  }
  if (a?.k !== k) return false;
  invSync(); const e = inv[invSel];
  if (e?.kind !== "tape") { toast(`${name}: "Something in ${a.cat}, maybe?" (bring them a tape, and E with it in hand)`, true); return true; }
  const t = e.ref;
  if (cm.rented.has(t)) { toast(`${name}: "Oh, that one's yours. Is there another copy on the shelf?"`, true); return true; }
  const likes = t.category === a.cat ? 0.85 : k.who.persona.taste.cats.includes(t.category) ? 0.6 : 0.15;
  if (Math.random() >= likes) {
    k.c.setMood("meh"); k.hi = 1.6;
    if (++a.tries >= 2) cmCustAskEnd(k, `${name}: "Nah... thanks anyway. I'll keep looking."`); else toast(`${name}: "${t.title}? Hmm, not really my thing."`);
    return true;
  }
  invRemove(e); t.fromReturns = t.strayFix = false;
  k.tapes.push(t); k.holding = k.tapes.length; k.c.holdTape(Math.min(3, k.holding)); k.c.setPose("hold"); k.c.setMood("love"); k.hi = 2;
  cmCust.ask = null; k.state = "browse"; k.stopsLeft = 0; custDone(k);   // ...and off to pay for it
  cm.day.helped = (cm.day.helped || 0) + 1; posTerm.loyal(k.member, 2);
  const by = staff.find(cmSees); cm.trust = Math.min(100, cm.trust + (by ? 3 : 1)); by?.c?.setMood("happy");
  toast(`${name}: "${t.title}? Ooh, okay. I'll give it a try, thanks!"${by ? ` (${by.first} saw that)` : ""}`, true);
  cmLog(`Talked ${memberName(k.member)} into renting ${t.title}`, "good");
  return true;
}
function cmCustThiefTick() {
  const t = cmCust.thief;
  if (t) {                                        // the one you saw: still going, or out the door with it
    if (!t.sneaking) cmCust.thief = null;
    else if (!t.c || t.c.group.position.z < 0) { cmCust.thief = null; cmLog(`${memberName(t.member)} walked out with a tape under their jacket. I never said a word`); }
    return;
  }
  if (!cm.inside || player.onRoof) return;
  const boxes = new Set(custs.map(k => k.box));
  for (const k of custs) {                        // one in view, close enough to see what they're doing
    const p = k.c?.group.position; if (!p || !k.sneaking || k.cmSpotted || !k.tapes.length || p.z < 0.5 || Math.hypot(p.x - player.x, p.z - player.z) > 9) continue;
    if (colliders.some(b => !boxes.has(b) && !b.staff && !(b.y1 != null && b.y1 < 1.6) && segCrossesBox(player.x, player.z, p.x, p.z, b))) continue;
    k.cmSpotted = true; cmCust.thief = k;
    toast(`${memberName(k.member).split(" ")[0]} just slid a tape under their jacket and is making for the door. Tell somebody on staff? (E on them)`);
    break;
  }
}
function cmCustBust(k) {                          // the tapes come back out of the jacket, and they're on their way
  const what = k.tapes.length === 1 ? k.tapes[0].title : `${k.tapes.length} tapes`;
  returnBin.push(...k.tapes); refreshReturnsBin();
  k.tapes = []; k.holding = 0; k.tagged = k.sneaking = k.thief = false; k.c?.holdTape(0); k.c?.setMood("shock"); k.hi = 2;
  if (cmCust.thief === k) cmCust.thief = null;
  posTerm.incident(k.member, `CAUGHT SHOPLIFTING ${what}`.toUpperCase());
  if (k.c) custGo(k, "leave", CUST_DOOR);
  return what;
}
function cmCustTell(e) {                          // E on someone on staff with a shoplifter in sight: you point them out -> true if you did
  const k = cmCust.thief; if (!k?.c || !k.sneaking) return false;
  const name = memberName(k.member), what = cmCustBust(k);
  e.c?.setMood("angry"); cm.trust = Math.min(100, cm.trust + 8); cm.day.told = (cm.day.told || 0) + 1;
  toast(`You point ${name.split(" ")[0]} out to ${e.first}, who heads them off at the door: "The jacket. Come on." Out comes ${what}. "Thanks. Seriously."`, true);
  cmLog(`Told ${e.first} about ${name} sneaking out with ${what}. They got it back`, "good");
  return true;
}
function cmCustTip(k) {                           // the hover tip on another customer, if it's one of these
  if (cmCust.ask?.k === k) return `${memberName(k.member)}<div class="cat">wants something in ${cmCust.ask.cat} · E with a tape in hand</div>`;
  if (k === cmCust.thief && k.sneaking) return `${memberName(k.member)}<div class="cat">a tape under the jacket · E — give them a look</div>`;
  return null;
}

// ---- the day: in off the lot just before ten; whoever opened unlocks at ten; at midnight they want you out of the
// store. The night's still yours out there (and up on the roof): the day ends when you sleep, on the cardboard bed
// out back (see cmSleep), and then it's the day's slip (what you spent, found, got away with) and home ----
function cmMorning() {
  shift.h = SHIFT.open - 0.25;
  cm.searched.clear();
  if (shift.day > 1) { cm.wallet += CM_ALLOWANCE; cmLog(`Found ${cmMoney(CM_ALLOWANCE)} in my jacket`, "good", CM_ALLOWANCE); }
  if (cm.found.has("badge") && !cm.alertDone) { cm.alertDone = true; cm.alert = shift.day; cmLog("Overheard at the counter: Ray's badge went missing out of his locker. Everybody's keeping their eyes open today", "bad"); }
  if (cm.short && cm.short === shift.day - 1) { cm.alert = shift.day; cmLog("Overheard: the drawer came up twenty short last night. Everybody's watching the counter today", "bad"); }
  cm.wary.clear(); cm.nagged = 0; cm.pinTries = 0;
  cm.today = 0; cm.heat = 0; cm.closeT = 0; cm.nightHint = false; cm.going = false; cm.day = cmDayStats(); cmTermClose();
  for (const k of KEYED) { const d = k.door(); if (d?.open) toggleDoor(d); d && (d.byYou = false); }   // the back's locked up overnight
  cmPutAt(CM_LOT); gateLastZ = player.z; cm.inside = false;
  cmMoneyDrop(); cm.watchT = 0; cm.watched = false; cmFeature();
  shift.greet = `${WEEKDAYS[shiftDate().getDay()]} · day ${shift.day}. The store opens at 10. You've got ${cmMoney(cm.wallet)} on you`;
  cmStaffMorning();
  cmRentMorning();
}
function cmOpenUp() {
  if (!frontLock.locked) return;
  setFrontLock(false);
  const who = staff.find(e => e.c && !e.leaving);
  toast(`10:00 AM — ${who ? `${who.first} flips the sign` : "the sign flips"}: they're open`, true);
}
function cmNextDay() {
  if (cm.going) return; cm.going = true;
  cmFade(() => { cmPutAt(CM_LOT); cmSlip(); });
}
function cmSlip() {                               // the end of your day, on the same slip the staff get
  const d = cm.day, W = 34, row = (k, v) => k + " " + ".".repeat(Math.max(1, W - k.length - String(v).length - 2)) + " " + v, line = "-".repeat(W);
  const late = [...cm.rented].filter(([, due]) => due > 0 && shift.day >= due).length;
  keys.clear(); shift.report = true; $("hoverTip").style.display = "none"; document.exitPointerLock();
  $("shiftSlip").textContent = [
    "YOUR DAY".padStart(21), `${WEEKDAYS[shiftDate().getDay()]} · DAY ${shift.day}`.padStart(22), "",
    row("SPENT AT THE STORE", cmMoney(d.spent)), row("  INCL. LATE FEES", cmMoney(d.fees)), row("MONEY FOUND", cmMoney(d.found)), row("IN YOUR WALLET", cmMoney(cm.wallet)), line,
    row("TAPES RENTED", d.rented), row("TAPES OUT", cm.rented.size), ...(late ? [row("  DUE BACK BY TOMORROW", late)] : []), ...(cm.owed ? [row("LATE FEES OWED", cmMoney(cm.owed))] : []), line,
    ...cmRentSlip(row, line, W),
    row("WALKED OUT WITH", d.stolen ? `${d.stolen} THING${d.stolen > 1 ? "S" : ""}` : "NOTHING"), row("CAUGHT", d.caught ? `${d.caught} TIME${d.caught > 1 ? "S" : ""}` : "NEVER"),
    row("THE STAFF THINK YOU'RE", cm.trust >= 60 ? "A REGULAR" : cm.trust >= 25 ? "FRIENDLY" : "A NEW FACE"), line,
    ...cmDaySlip(W, row, line),
    ...(() => { const home = inv.filter(e => e.kind === "tape" && cm.rented.has(e.ref)).map(e => e.ref.title); return home.length ? ["TAKING HOME TONIGHT", ...home.map(n => "  " + n.toUpperCase().slice(0, W - 2))] : []; })(),
    ...(d.items.length ? ["FOUND TODAY", ...d.items.map(n => "  " + n.toUpperCase())] : ["FOUND NOTHING NEW TODAY"]), "",
    `${cm.goal ? "✓" : "☐"} GET UP ON THE ROOF`.padStart(26), ...(cm.goal ? [`${cm.teed ? "✓" : "☐"} TEE OFF FROM UP THERE`.padStart(27)] : []), "", "SEE YOU TOMORROW".padStart(25),
  ].join("\n");
  $("shiftNext").textContent = "NEXT DAY ▸";
  $("shiftReport").style.display = "flex";
}
function cmDoorOpen(fromInside) { return fromInside || !!GUEST || (!frontLock.locked && cm.banned !== shift.day); }   // (out's always fine: they let you out)

function cmTick(dt) {
  cmNoteTick(); cmSleepTick(); cmShowTick(dt);
  cmCustTick(dt);
  if (cm.comboOf !== cm.comboWas) { cm.typed = ""; cm.comboWas = cm.comboOf; }   // (looked away: start the combination over)
  if (heldSnack && !cm.spillHint && isDrink(heldSnack.userData.snack) && cm.inside) { cm.spillHint = true; toast("X — spill it on the floor (somebody'll come with a mop)", true); }
  if (!started || document.pointerLockElement !== canvas || shift.report) return;
  const inside = player.onRoof || (player.z > 0.05 && inBuilding(player.x, player.z));   // (in the video store: round the back, or Tony's next door, doesn't count)
  // out through the doors with something you haven't paid for
  if (cm.inside && !inside) {
    const unpaid = cmUnpaid();
    if (unpaid.length || cm.tab > 0) { const seer = staff.find(cmSees); if (seer) cmCaught("theft", seer); else cmGotAway(unpaid); }
  }
  if (!cm.inside && inside && cm.nagged !== shift.day && cm.banned !== shift.day) {   // in the door with something overdue: they mention it
    const late = [...cm.rented].filter(([, due]) => due > 0 && shift.day > due);
    if (late.length) { cm.nagged = shift.day; const by = staff.find(e => e.c && !e.leaving);
      toast(`${by ? by.first : "The clerk"}: "Hey, just so you know, ${late.length === 1 ? `${late[0][0].title} is` : `${late.length} of your tapes are`} overdue!"`); }
  }
  cm.inside = inside;
  if (GUEST) return;                              // (nobody minds where a guest goes, and they're not walked out at closing)
  cmStaffTick(dt);
  // the gates going off as you walk through them: everyone's eyes on you
  const alarm = gateAlarm.on && Math.abs(player.z - GATE_Z) < 1.5 && inv.some(e => e.kind === "tape" && !cmPaid(e));
  if (alarm && !cm.alarmWas) { const by = staff.find(e => e.c && !e.leaving); if (by) cmCaught("theft", by); }
  cm.alarmWas = alarm;
  // staff only: seen back there, the meter fills (slower for someone they know); out of sight it drains. Full: caught
  const where = cmStaffOnly(), seer = where ? staff.find(cmSees) : null;
  if (seer) {
    if (cm.heat === 0) { seer.c.setMood("shock"); toast(`${seer.first}: "${cmRegular() ? "Uh, hey... " : "Hey! "}Can I help you?"`); }
    cm.heat = Math.min(1, cm.heat + dt / (1.1 * (1 + cm.trust / 100) / (cmWary(seer) ? 1.5 : 1)));
    if (cm.heat >= 1) cmCaught("staff", seer);
  } else cm.heat = Math.max(0, cm.heat - dt * 0.35);
  cm.seer = seer;
  const sn = $("sneak"); sn.style.display = where || cm.heat > 0 ? "block" : "none";
  if (where || cm.heat > 0) { sn.className = seer ? "seen" : ""; sn.firstChild.textContent = seer ? `SEEN · ${seer.first.toUpperCase()}` : `STAFF ONLY · ${(where || "").toUpperCase()}${cmRunning() ? " · THEY CAN HEAR YOU RUN" : ""}`; sn.lastChild.style.setProperty("--h", `${(cm.heat * 100).toFixed(0)}%`); }
  // a door on a closer: one the staff left open swings shut once nobody's in it (unless you unlocked it yourself)
  for (const k of KEYED) {
    const d = k.door(); if (!d?.open || d.byYou) { if (d) d.closeT = 0; continue; }
    const [x, , z] = doorAt(d), near = Math.hypot(player.x - x, player.z - z) < 1.6 || staff.some(e => e.c && Math.hypot(e.c.group.position.x - x, e.c.group.position.z - z) < 1.8);
    if (near) d.closeT = 0; else if ((d.closeT = (d.closeT || 0) + dt) > 3) { d.closeT = 0; if (!playerIn(d.shut)) toggleDoor(d); }
  }
  // locked out: say so at the doors
  if (!inside && Math.hypot(player.x - 0.9, player.z) < 1.3 && !cmDoorOpen(false) && (cm.doorHint -= dt) <= 0) {
    cm.doorHint = 4; toast(cm.banned === shift.day ? "You've been thrown out for today" : afterClose() ? "CLOSED · open 10 AM to midnight" : "CLOSED · opens at 10 AM");
  }
  // every half second: what's left your hands. Eaten before it's paid for goes on your tab; a rental back in the
  // returns slot (or on its shelf) is returned, late fees and all
  if ((cm.checkT -= dt) <= 0) {
    cm.checkT = 0.5;
    for (const e of cm.invWas) if (!inv.includes(e) && !cmPaid(e) && e.kind !== "tape" && inside && !(e.kind === "snack" && e.ref.visible)) cm.tab += cmPrice(e);
    cm.invWas = [...inv]; cmSpentTick();
    for (const [c, due] of cm.rented) if (returnBin.includes(c) || !c.offShelf) cmRentReturn(c, due);
    for (const u of cm.paidUnits) if (!inv.some(e => e.ref === u)) { delete u.userData.paid; cm.paidUnits.delete(u); }   // (gone: the next one on that spot is the store's)
  }
  // the roof: as far as it goes, for now
  if (player.onRoof && !cm.goal) { cm.goal = true; toast("You made it up on the roof. Nobody knows you're here", true); cmLog("Made it up on the roof", "good"); cm.day.items.push("THE ROOF"); }
  // the end of the night: they want you out of the store, and walk you out if you hang about. Out there it's still tonight till you sleep
  if (afterClose()) {
    if (!inside) { cm.closeT = 0; if (!cm.nightHint) { cm.nightHint = true; toast("Closed for the night. The day's over when you sleep: there's a cardboard bed round the back", true); } }
    else if (player.onRoof) {}                    // up top nobody knows you're there, so nobody comes for you: the night's yours till you climb down
    else if ((cm.closeT += dt) > 25) { toast("They walk you to the door. Good night!", true); cmFade(() => cmPutAt(CM_LOT)); cm.closeT = -99; }
    else if (cm.closeT > 0 && cm.closeT - dt <= 0) toast(`${staff.find(e => e.c)?.first || "The clerk"}: "We're closed! Time to head out."`);
  }
}
function cmClock(crossed) {                       // shiftTick's hour marks, from out front
  if (crossed(SHIFT.open)) cmOpenUp();
  if (crossed(SHIFT.lastIn)) toast("11:45 PM — the store closes at midnight", true);
  if (crossed(SHIFT.close)) setFrontLock(true);
}
function cmHud() {
  const late = afterClose(), h = shift.h;
  const status = cm.banned === shift.day ? "THROWN OUT TODAY" : late ? "CLOSED" : h < SHIFT.open ? "OPENS 10 AM" : "OPEN";
  const unpaid = cmUnpaid().reduce((a, e) => a + cmPrice(e), 0);
  return [`${WEEKDAYS[shiftDate().getDay()]} ${fmtClock(h, late)}`,
    `${status} · WALLET ${cmMoney(cm.wallet)}${unpaid ? ` · UNPAID ${cmMoney(unpaid)}` : ""}${cm.tab ? ` · TAB ${cmMoney(cm.tab)}` : ""}${cm.owed ? ` · LATE FEES ${cmMoney(cm.owed)}` : ""}${cmRegular() ? " · REGULAR" : ""}`,
    [...cmDayHud(), `${cm.goal ? "✓" : "☐"} Get up on the roof`, ...(cm.goal ? [`${cm.teed ? "✓" : "☐"} Tee off from up there`] : []),
      ...(cm.rec?.day === shift.day ? [`${cm.rec.done ? "✓" : "☐"} ${cm.rec.by}'s pick: ${cm.rec.title.title}`] : []), ...(cmShowToday() && !["done", "failed"].includes(show.status) ? [`${cm.ticket === shift.day ? "✓ Ticket" : "☐ Tonight"}: ${show.title.title}, 8 PM`] : [])]];
}
function cmE() {                                  // E, as a customer: what's different. -> true if handled
  if (aimBed) { if (GUEST) toast("You're only visiting: the day ends when your host's does"); else if (!cm.sleeping) cmSleep(); return true; }
  if (aimTony) { tonyE(aimTony); return true; }
  if (cm.term) { cmTermClose(); return true; }
  if (aimPickup) { cmPickUp(aimPickup); return true; }
  if (cmRentAiming()) { cmRentDrop(); return true; }
  if (cm.comboOf) {
    if (!comboDone(cm.comboOf)) toast("Type the combination on the number keys");
    else if (comboLeft(cm.comboOf)) cmTakeFrom(cm.comboOf);
    else if (cm.comboOf === COMBOS.locker) toast("Ray's locker. Nothing else in there worth taking");
    else return false;                            // (the hatch, open: up you go)
    return true;
  }
  if (aimEmp && cmCustTell(aimEmp)) return true;
  if (aimEmp) {
    if (cmStaffPending(aimEmp) && !cmUnpaid().length && !cm.tab && !cm.owed) { cmStaffTalk(aimEmp); return true; }   // (something between you: even across the counter)
    const p = aimEmp.c?.group.position;
    if (p && cmBehindCounter(p.x, p.z) && player.x < -2.3 && player.z > 4.2 && player.z < 6.5) cmPay(aimEmp);
    else if (cmUnpaid().length || afterClose()) toast(`${aimEmp.first}: "${afterClose() ? "We're closed, sorry!" : "I can ring you up at the register!"}"`, true);
    else cmStaffTalk(aimEmp);
    return true;
  }
  if (aimCustomer && cmCustE(aimCustomer)) return true;
  if (aimCustomer) { toast(aimCustomer.kid ? "The kid stares at you" : `${memberName(aimCustomer.member).split(" ")[0]}: "Hey."`, true); return true; }
  if (aimDoor && keyedOf(aimDoor) && !aimDoor.open) {
    const k = keyedOf(aimDoor);
    if (!cmHas(k.key)) { aimDoor.rattle = 0.35; doorSnd(aimDoor, "wood", "rattle"); toast(`Locked. The ${k.room} needs a key`); return true; }
    toggleDoor(aimDoor); aimDoor.byYou = true; return true;
  }
  if (aimDoor && keyedOf(aimDoor)) { toggleDoor(aimDoor); aimDoor.byYou = false; return true; }
  if (aimBin) { cmSearchBin(aimBin); return true; }
  if (aimLock) { toast("The deadbolt's the staff's to work"); return true; }
  if (aimExit) return true;                       // (just walk out)
  if (aimPOS) { if (cmHas("badge") || cm.loggedIn) cmTermOpen(); else toast("The register's logged out. It wants an employee badge"); return true; }
  if (aimPhone) { toast("Not your phone"); return true; }
  return false;
}
function cmTip() {                                // the hover tip, as a customer -> html, or null for the usual
  if (aimBed) return afterClose() ? "E — sleep it off till morning<div class=\"cat\">somebody's cardboard bed</div>" : "E — lie down a while (3 hours)<div class=\"cat\">somebody's cardboard bed</div>";
  if (aimTony) return aimTony === "order" ? (tonyOpen() ? "E — a pepperoni slice ($1.50)<div class=\"cat\">Tony's</div>" : "Tony's counter<div class=\"cat\">closed · open 11 AM to 11 PM</div>")
    : tonyOpen() ? `E — play ${TONY_GAMES[+aimTony.slice(4)][0]}<div class="cat">a quarter a game</div>` : `${TONY_GAMES[+aimTony.slice(4)][0]}<div class="cat">closed · open 11 AM to 11 PM</div>`;
  if (aimPickup) return aimPickup.search ? `E — search ${aimPickup.search}` : aimPickup.mesh === "bill" ? "E — pick it up<div class=\"cat\">money on the floor</div>" : `E — take it<div class="cat">${ITEMS[aimPickup.gives.item].about}</div>`;
  if (cm.comboOf) return comboTip(cm.comboOf);
  if (cmRentAiming()) return cmRentTip();
  if (aimEmp && cmCust.thief?.c && cmCust.thief.sneaking) return `${aimEmp.first}<div class="cat">E — point out ${memberName(cmCust.thief.member).split(" ")[0]}, the tape under the jacket</div>`;
  if (aimEmp) { const p = aimEmp.c?.group.position, n = cmUnpaid().length + (cm.tab || cm.owed ? 1 : 0);
    const at = p && cmBehindCounter(p.x, p.z);
    return `${aimEmp.first}<div class="cat">${at && n ? "E — pay for what you've got" : cmStaffTip(aimEmp)}</div>`
      + (at && cmTicketOpen() && cm.ticket !== shift.day ? `T — a ticket for ${show.title.title}, 8 PM (${cmMoney(SHOW.ticket * (cmRegular() ? 0.9 : 1))})` : ""); }
  if (aimCustomer && cmCustTip(aimCustomer)) return cmCustTip(aimCustomer);
  if (aimCustomer) return `${aimCustomer.kid ? "A kid" : memberName(aimCustomer.member)}<div class="cat">shopping</div>`;
  if (aimDoor && keyedOf(aimDoor)) { const k = keyedOf(aimDoor); return aimDoor.open ? "E — close the door" : cmHas(k.key) ? `E — unlock the ${k.room}<div class="cat">${ITEMS[k.key].name}</div>` : "Locked"; }
  if (aimBin) return cm.searched.has(aimBin.id) && !(cmTrail.keyAt === `bin:${aimBin.id}` && !cm.found.has(cmTrail.keyAt)) ? `The ${aimBin.name}<div class="cat">already looked today</div>` : `E — dig through the ${aimBin.name}`;
  if (aimLock) return "The front doors' deadbolt";
  if (aimExit) return null;
  if (aimPOS) return cm.termLock === shift.day ? "The register<div class=\"cat\">locked: see manager</div>" : cmHas("badge") || cm.loggedIn ? `E — ${cm.loggedIn ? "use the register" : "swipe Ray's badge"}` : "The register<div class=\"cat\">logged out · wants an employee badge</div>";
  return null;
}
// the switch: off the staff for good, and back in as a customer (the same store, its staff, its stock). What you had
// on you was the store's: it goes back. Then the page reloads into it, out on the lot
function becomeCustomer(why = "") {
  if (CUSTOMER) return;
  for (const e of [...inv]) { if (e.kind === "tape") returnBin.push(e.ref); else if (e.kind === "snack" && !stockCarry.has(e.ref)) e.ref.visible = true; invRemove(e); }
  refreshReturnsBin(); saveState();
  let d; try { d = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch {}
  d = d?.v === SAVE_V ? d : { v: SAVE_V, mode: MODE };
  Object.assign(d, { role: "customer", inv: [], player: { ...CM_LOT, pitch: 0 }, cm: { wallet: 40, greet: why ? `${why} You're a customer here now` : "You're a customer here now" } });
  saveOff = true;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(d)); sessionStorage.setItem("jellybuster-play", "1"); } catch {}
  location.reload();
}
function cmSave() {
  const units = snackUnits();
  return { crew: cmStaffSave(), wallet: +cm.wallet.toFixed(2), owed: cm.owed, tab: +cm.tab.toFixed(2), strikes: cm.strikes, today: cm.today, banned: cm.banned, goal: cm.goal, found: [...cm.found],
    trust: cm.trust, seed: cm.seed, loggedIn: cm.loggedIn, pinTries: cm.pinTries, termLock: cm.termLock, tookCash: cm.tookCash, short: cm.short, rec: cm.rec && { title: copyKey(cm.rec.title), by: cm.rec.by, day: cm.rec.day, done: cm.rec.done }, teed: cm.teed, card: cm.card, alert: cm.alert, alertDone: cm.alertDone, nagged: cm.nagged, wary: [...cm.wary], ticket: cm.ticket, watchT: Math.round(cm.watchT), watched: cm.watched, hatch: cm.hatch, searched: [...cm.searched], day: cm.day,
    rent: cm.rent,
    dayRecord: cm.dayRecord,
    rented: Object.fromEntries([...cm.rented].map(([c, due]) => [copyKey(c), due])), paid: [...cm.paidUnits].map(u => units.indexOf(u)).filter(i => i >= 0) };
}
function cmLoad(S) {
  if (S) {
    Object.assign(cm, { wallet: S.wallet ?? 40, owed: S.owed || 0, tab: S.tab || 0, strikes: S.strikes || 0, today: S.today || 0, banned: S.banned || 0, goal: !!S.goal, greet: S.greet || null,
      trust: S.trust || 0, loggedIn: !!S.loggedIn, pinTries: S.pinTries || 0, termLock: S.termLock || 0, tookCash: S.tookCash || 0, short: S.short || 0, rec: S.rec && copyByKey(S.rec.title) ? { ...S.rec, title: copyByKey(S.rec.title) } : null, teed: !!S.teed, card: !!S.card, alert: S.alert || 0, alertDone: !!S.alertDone, nagged: S.nagged || 0, wary: new Set(S.wary || []), ticket: S.ticket || 0, watchT: S.watchT || 0, watched: !!S.watched, hatch: !!S.hatch, day: { ...cmDayStats(), ...S.day } });
    if (S.dayRecord) cm.dayRecord = { ...cm.dayRecord, ...S.dayRecord };
    for (const id of S.found || []) cm.found.add(id);
    for (const id of S.searched || []) cm.searched.add(id);
    cmStaffLoad(S.crew);
    for (const [k, due] of Object.entries(S.rented || {})) { const c = copyByKey(k); if (c) cm.rented.set(c, due); }
    Object.assign(cm.rent, S.rent);
    const units = snackUnits(); for (const i of S.paid || []) if (units[i]) { units[i].userData.paid = true; cm.paidUnits.add(units[i]); }
  }
  for (const e of inv) if (e.kind === "item") cm.found.add(e.ref.id);   // (whatever's in your pockets, you've found)
  cm.inside = player.z > 0.05; cm.invWas = [...inv];
  cm.seed = S?.seed || 1 + Math.floor(Math.random() * 2147483645);   // (a new customer: a trail of their own)
  cmTrailSet(); cmRoster(); cmPickupsBuild(); cmSpentTick(); cmMoneyDrop(); cmFeature();
  { const g = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial()); g.visible = false; g.position.set(...COMBOS.locker.at); g.userData.combo = COMBOS.locker; scene.add(g); aimables.push(g); }   // Ray's padlock (the lockers are drawn with the break room)
  if (cm.greet) { shift.greet = cm.greet; cm.greet = null; }
}

