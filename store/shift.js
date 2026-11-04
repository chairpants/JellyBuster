// ---- the shift: the store's open 10A-12A (the placard by the door). While
// it's open a store hour passes every SHIFT.hour real seconds; at midnight the
// clock drops to real time and stays there — the day doesn't end until you've
// locked up and walked out the front doors (clockOut). It only runs while
// you're in the store (not on the title screen). L fast-forwards an hour ----
const SHIFT = { start: 9, open: 10, lastIn: 23.75, close: 24, hour: SETTINGS.shiftMin * 60 / 14 };   // hours since the shift day's midnight; hour: real seconds per store hour while open (a ~21 minute shift)
const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const shiftStats = () => ({ score: 0, you: 0, dana: 0, tickets: 0, refunds: 0, signups: 0, visitors: 0, served: 0, rentals: 0, rentalTake: 0, snackTake: 0, returns: 0, walkouts: 0, stolen: 0, caught: 0, upsells: 0, feesCollected: 0, feesWaived: 0 });
// points for the shift. The store's score is everything; your own and Dana's are
// the parts each of you earned (walkouts and theft hit only the store's)
function shiftScore(n, who = null) { const s = shift.stats; s.score += n; if (who) s[who] += n; }   // who: "you" | "dana" | null
// ---- the log, bottom left: ring-outs, money in and out, fees, returns, trouble.
// Fixed height, scrolls (newest at the bottom; PageUp/PageDown), J collapses it ----
const actLog = [], logData = [];                 // rows on screen / the same, as data for the save
function logAct(text, kind = "", money = null, pts = null, at = null) {   // kind: "good" | "bad" | ""; money/pts: signed amounts, shown on the right; at: a saved row's time
  const el = $("actLogList"); if (!el || (CUSTOMER && !logAct.mine && !at)) return;   // (a customer's log: what happened to you, not the store's books)
  logData.push([at || fmtClock(shift.h), text, kind, money, pts]); if (logData.length > 60) logData.shift();
  const atEnd = el.scrollHeight - el.scrollTop - el.clientHeight < 8;
  const row = document.createElement("div"); row.className = `row ${kind}`;
  const amt = [money != null && money !== 0 ? `${money > 0 ? "+" : "\u2212"}$${Math.abs(money).toFixed(2)}` : "", pts ? `${pts > 0 ? "+" : "\u2212"}${Math.abs(pts)} pts` : ""].filter(Boolean).join(" · ");
  row.innerHTML = `<span class="t">${at || fmtClock(shift.h)}</span><span class="x"></span>${amt ? `<span class="a">${amt}</span>` : ""}`;
  row.querySelector(".x").textContent = text;
  el.appendChild(row); actLog.push(row);
  while (actLog.length > 200) actLog.shift().remove();
  if (atEnd) el.scrollTop = el.scrollHeight;     // follow along, unless you've scrolled back to read
  $("actLog").style.display = "block";
  const box = $("actLog"); if (!at && box.classList.contains("shut")) box.querySelector(".n").textContent = `(${++logAct.unseen} new)`;
}
logAct.unseen = 0;
function logToggle() {
  const box = $("actLog"); box.classList.toggle("shut"); logAct.unseen = 0; box.querySelector(".n").textContent = "";
  if (!box.classList.contains("shut")) { const el = $("actLogList"); el.scrollTop = el.scrollHeight; }
}
function logScroll(dir) { const el = $("actLogList"); el.scrollTop += dir * el.clientHeight * 0.8; }
let redNights = SAVE?.redNights || 0;          // simulation: closing nights in a row with the store in the red (three, and you're fired: see becomeCustomer)
const shift = {
  day: SAVE?.shift?.day ?? 1, h: SAVE?.shift?.h ?? SHIFT.start, warp: 0,
  date0: SAVE?.shift?.date0 ?? +new Date(1996, 8, 30, 12),   // day 1: Monday, Sept 30 1996 (noon, like the POS's), a slow start
  stats: { ...shiftStats(), ...SAVE?.shift?.stats }, greet: null, report: false,
  goals: SAVE?.shift?.goals ?? null,              // today's two goals: [{ id, n }] (see GOALS)
};
// ---- day goals: two a day, something to aim at (and $20 + 50 points each, at close). The numbers grow with the
// days. got(stats) -> how far along (a count) or, for the yes/no ones, whether it still holds; done at close
const GOALS = {
  serve: { text: n => `Ring up ${n} customers`, n: d => Math.min(30, 6 + 2 * d), got: s => s.served },
  rent: { text: n => `Rent out ${n} tapes`, n: d => Math.min(40, 8 + 3 * d), got: s => s.rentals },
  signup: { sim: true, text: n => `Sign up ${n} new member${n > 1 ? "s" : ""}`, n: d => Math.min(4, 1 + Math.floor(d / 3)), got: s => s.signups },
  upsell: { text: n => `Sell ${n} snack${n > 1 ? "s" : ""} at the counter`, n: d => Math.min(8, 2 + Math.floor(d / 2)), got: s => s.upsells },
  noWalk: { text: () => "Nobody walks out", got: s => s.walkouts === 0 },
  tidy: { text: () => "A clean closing check", got: (s, chk) => chk ? !(chk.bin + chk.strays + chk.messes + chk.trash + chk.lights) : null },
};
function dayGoals() {
  const ids = Object.keys(GOALS).filter(id => SIM || !GOALS[id].sim), out = [];
  while (out.length < 2) { const id = ids.splice(Math.floor(Math.random() * ids.length), 1)[0]; out.push({ id, n: GOALS[id].n?.(shift.day) ?? 0 }); }
  return out;
}
function goalState(g, chk) {                      // -> { text, mark: "✓" | "✗" | "☐", have }
  const G = GOALS[g.id], got = G.got(shift.stats, chk), counted = G.n !== undefined;
  const ok = counted ? got >= g.n : !!chk && got === true;   // (the yes/no ones only count once the day's done...)
  const failed = counted ? !!chk && !ok : got === false;     // (...but fail as soon as they fail)
  return { text: G.text(g.n), mark: ok ? "✓" : failed ? "✗" : "☐", have: counted ? `${Math.min(got, g.n)}/${g.n}` : "" };
}
const shiftDate = () => new Date(shift.date0 + (shift.day - 1) * 864e5);
// ---- reputation: 0..100 (1-5 stars), moved each night by how the shift went.
// A better name brings more people in (and sells more tickets) ----
const repStars = (v = rep.v) => Math.max(1, Math.min(5, Math.round(1 + v / 25)));
const starStr = n => "\u2605".repeat(n) + "\u2606".repeat(5 - n);
const repMult = () => 0.7 + rep.v / 100 * 0.6;
// the shift slip's "how far to the next star": a bar between this star's threshold and the next
// (a star every 25 points, starting at 37.5 for 3), and roughly how many A nights (+5 each) it'll take
function repProgress() {
  const n = repStars(); if (n >= 5) return ["  TOP RATED: KEEP IT THERE"];
  const lo = n <= 1 ? 0 : 25 * (n - 1.5), hi = 25 * (n - 0.5), f = Math.max(0, Math.min(1, (rep.v - lo) / (hi - lo))), k = Math.round(f * 20);
  const nights = Math.max(1, Math.ceil((hi - rep.v) / 5));
  return [`  NEXT STAR [${"#".repeat(k)}${"-".repeat(20 - k)}]`, `  ~${nights} MORE A NIGHT${nights > 1 ? "S" : ""} TO ${starStr(n + 1)}`];
}
// ---- upgrades, bought on the register out of the store budget ----
const LIBRARY = [                               // the library comes in tiers, each after the one before
  { cats: ["Kids & Educational", "Holiday", "Reality TV", "Music", "Broadcast Blocks"] },
  { cats: ["Classic Sitcoms", "Sketch Comedy & Late Night"] },
  { cats: ["Anime", "Horror & Anthology", "Classic Horror"] },
];
const owned = id => !!upg[id];
const libTier = () => upg.library || 0;
const libLocked = c => LIBRARY.slice(libTier()).some(t => t.cats.includes(c.category));
const UPGRADES = [
  { id: "hire", name: "HIRE AN EMPLOYEE", cost: 250, repeat: true, desc: "3 APPLICANTS TO CHOOSE FROM" },
  { id: "popcorn", name: "POPCORN MACHINE", cost: 150, desc: "FRESH POPCORN IN THE THEATER LOBBY" },
  { id: "theater", name: "OPEN THE THEATER", cost: 600, desc: "UNLOCK THE LOBBY AND THE AUDITORIUM" },
  { id: "lib1", name: "LIBRARY UPGRADE 1", cost: 200, lib: 1, desc: "KIDS, HOLIDAY, REALITY TV, MUSIC" },
  { id: "lib2", name: "LIBRARY UPGRADE 2", cost: 350, lib: 2, desc: "CLASSIC SITCOMS, SKETCH & LATE NIGHT" },
  { id: "lib3", name: "LIBRARY UPGRADE 3", cost: 500, lib: 3, desc: "ANIME, HORROR ANTHOLOGY, CLASSIC HORROR" },
  { id: "cameras", name: "SECURITY CAMERAS", cost: 450, desc: "EVERY SHOPLIFTER ON TAPE; FEWER TRY" },
  { id: "sign", name: "ANTI-THEFT SIGNAGE", cost: 60, desc: "\"SHOPLIFTERS WILL BE PROSECUTED\"" },
  { id: "rewinder2", name: "SECOND REWINDER", cost: 90, desc: "TWO TAPES REWINDING AT ONCE" },
  { id: "rewinders", name: "HIGH-SPEED REWINDERS", cost: 300, desc: "HALF THE TIME, AND THEY LOOK FAST" },
  { id: "compressor", name: "COOLER COMPRESSOR", cost: 220, desc: "COOLER STAYS COLD, RECOVERS FASTER" },
  { id: "dana", name: "STAFF TRAINING", cost: 250, desc: "THE STAFF LEARN 50% FASTER" },
  { id: "ad", name: "NEWSPAPER AD", cost: 120, repeat: true, desc: SIM ? "NEW MEMBERS, A BIT OF BUZZ (1/DAY)" : "+REPUTATION (ONE A DAY)" },
];
if (MODE === "sandbox" || (MODE === "customer" && !upg.v)) {   // sandbox: everything, from the start (its saves too); customer mode: a store that's been going a while
  for (const u of UPGRADES) if (!u.repeat) upg[u.id] = true;
  upg.library = LIBRARY.length;
}
upg.v = 2;                                       // (marks stores saved from here on)
function upgBuy(id) {                            // -> null if bought, else why not
  const u = UPGRADES.find(q => q.id === id); if (!u) return "NO SUCH UPGRADE.";
  if (!u.repeat && owned(id)) return "ALREADY INSTALLED.";
  if (id === "dana" && !staff.length) return "HIRE SOMEONE FIRST.";
  if (id === "rewinders" && !owned("rewinder2")) return "SECOND REWINDER FIRST.";
  if (id === "popcorn" && !owned("theater")) return "OPEN THE THEATER FIRST.";
  if (id === "hire") {                           // three applicants come up to pick from (the POS has taken the money; not hiring refunds it)
    if (staff.length >= STAFF_MAX) return `THE STAFF ROOM'S FULL (${STAFF_MAX}).`;
    if (hiring.open) return "ALREADY INTERVIEWING.";
    setTimeout(() => hireOpen(hireCost()), 0); return null;
  }
  if (u.lib) {                                   // the distributor stocks the shelves overnight
    if (libTier() !== u.lib - 1 || deliveries.some(d => d.lib)) return libTier() >= u.lib || deliveries.some(d => d.lib === u.lib) ? "ALREADY ORDERED." : `LIBRARY UPGRADE ${u.lib - 1} FIRST.`;
    upg[id] = true;
    if (!SIM) { logAct(`${u.name[0] + u.name.slice(1).toLowerCase()}: ${libUnlock(u.lib)} tapes on the shelves`, "good"); return null; }   // sandbox: straight onto the shelves
    deliveries.push({ lib: u.lib });
    logAct(`Ordered ${u.name.toLowerCase()}: the tapes arrive tomorrow morning`, "good"); return null;
  }
  if (id === "ad") {                             // simulation: new sign-ups tomorrow (and a little reputation); sandbox: reputation
    if (upg.adDay === shift.day) return "AN AD ALREADY RAN TODAY."; upg.adDay = shift.day;
    rep.v = Math.min(100, rep.v + (SIM ? 3 : 8)); if (SIM) growth.pending += 4;
    logAct(SIM ? "Ran an ad in the paper: expect some new members tomorrow" : "Ran an ad in the paper: the word's getting out", "good"); return null;
  }
  upg[id] = true; upgVisuals(); amenities();
  if (SIM) growth.pending += { theater: 6, popcorn: 2 }[id] || 0;   // a theater brings people in
  logAct(id === "theater" ? "The theater's open for business" : `Installed: ${u.name.toLowerCase()}`, "good");
  return null;
}
function upgVisuals() {                          // what you can see of what you've bought
  if (upg.cameras && !upgVisuals.cams) {
    upgVisuals.cams = true;
    const dome = new THREE.MeshPhongMaterial({ color: 0x1a1a1e, specular: 0x666666, shininess: 60, transparent: true, opacity: 0.85 }), base = new THREE.MeshLambertMaterial({ color: 0xe8e8e8 });
    // where they'd actually earn their keep (each in a ceiling tile clear of the light panels): the door and the gates,
    // the register, down the center aisles, the back-hall opening and the right-hand aisles, the far back-left corner
    for (const [x, z] of [[0.9, 4.95], [-4.5, 2.25], [0, 12.15], [9.9, 26.55], [-6.3, 26.55]]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 16), base); b.position.set(x, STORE.h - 0.02, z); scene.add(b);
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), dome); d.position.set(x, STORE.h - 0.035, z); scene.add(d);
      const led = glow(new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2020 }))); led.position.set(x + 0.05, STORE.h - 0.06, z); scene.add(led);
    }
  }
  if (upg.sign && !upgVisuals.sign) {
    upgVisuals.sign = true;
    const t = textPlane("SHOPLIFTERS WILL BE PROSECUTED", 1.5, 0.11, "#fff", "#8c1c1c", "Arial Black", 48);
    t.material = new THREE.MeshLambertMaterial({ map: t.material.map }); t.position.set(0, 2.66, 0.28); scene.add(t);   // a placard on the door header, under BE KIND, REWIND
  }
}
// ---- tonight's feature: pick a film on the register; customers buy tickets at
// checkout; ticket holders come in at 7:45 and take their seats. It has to be
// playing (in the theater deck or the lounge VCR, same feed) by 8:15, or it's
// refunds all round ----
const SHOW = { at: 20, grace: 0.25, len: 1.75, ticket: 4 };
const show = { title: null, day: 0, sold: 0, status: "", spawned: 0 };   // status: "" | arriving | late | on | failed | done
const filmOn = () => show.title && playing && !video.paused && titleOfCopy(playing.tape) === show.title;
function showTick() {
  if (!show.title || show.day !== shift.day || ["failed", "done"].includes(show.status)) return;
  const h = shift.h, goers = () => custs.filter(k => k.moviegoer);
  if (!show.status && h >= SHOW.at - 0.25) { show.status = "arriving"; logAct(show.sold ? `Ticket holders arriving for ${show.title.title} (${show.sold})` : `No tickets sold for ${show.title.title} tonight`); if (!show.sold) { show.status = "done"; return; } }
  if (show.status === "arriving" && show.spawned < show.sold && h >= SHOW.at - 0.25 + show.spawned * 0.02) {   // they trickle in
    const m = custPickMember(true); if (m) { const k = custSpawn(m); k.moviegoer = true; k.returning = []; k.thief = false; show.spawned++; }
  }
  if (show.status === "arriving" && h >= SHOW.at) {
    if (filmOn()) { show.status = "on"; logAct(`Showtime: ${show.title.title} is playing`, "good"); }
    else { show.status = "late"; toast(`8:00 — ${show.title.title} should be starting! Put it in the VCR`); logAct(`It's 8 and ${show.title.title} isn't on: load it in the VCR`, "bad"); }
  }
  if (show.status === "late") {
    if (filmOn()) { show.status = "on"; logAct(`${show.title.title} started late`); }
    else if (h >= SHOW.at + SHOW.grace) {        // refunds, and a lot of unhappy people
      show.status = "failed"; posTerm.sale(-show.sold * SHOW.ticket); shift.stats.refunds += show.sold * SHOW.ticket; shiftScore(-20 * show.sold);
      for (const k of goers()) { posTerm.loyal(k.member, -6); k.c.setMood("angry"); k.hi = 2; if (k.state === "thWatch") k.t = 0; else custGo(k, "leave", CUST_DOOR); }
      logAct(`${show.title.title} never started: refunded ${show.sold} ticket${show.sold > 1 ? "s" : ""}`, "bad", -show.sold * SHOW.ticket, -20 * show.sold);
    }
  }
  if (show.status === "on" && h >= SHOW.at + SHOW.len) {
    show.status = "done"; const n = goers().length; shiftScore(10 * n);
    for (const k of goers()) { posTerm.loyal(k.member, 3); if (k.state === "thWatch") k.t = 0; }
    logAct(`${show.title.title} let out: ${n} happy moviegoer${n === 1 ? "" : "s"}`, "good", null, 10 * n);
  }
}
function showSet(title) {                        // from the register: today's 8 PM if there's time to sell tickets, else tomorrow's
  if (!owned("theater")) return "THE THEATER ISN'T OPEN YET.";
  const day = shift.h < 18 ? shift.day : shift.day + 1;
  if (show.day === day && show.sold) return `TICKETS ALREADY SOLD FOR ${show.title.title.toUpperCase()}.`;
  Object.assign(show, { title, day, sold: 0, status: "", spawned: 0 });
  logAct(`Tonight's feature${day === shift.day ? "" : " (tomorrow)"}: ${title.title} at 8 PM`, "good");
  return null;
}
const ticketChance = () => show.title && show.day === shift.day && !show.status && shift.h < SHOW.at - 0.3
  ? Math.min(0.4, 0.08 + 0.04 * Math.log10(1 + (window.STORE_META?.[show.title.id]?.[1] || 0))) * (0.8 + rep.v / 250) : 0;
const shiftOpen = () => shift.h >= SHIFT.open && shift.h < SHIFT.lastIn;   // new customers still come in
const afterClose = () => shift.h >= SHIFT.close;
function fmtClock(h, secs = false) {
  const t = Math.floor(h * 3600), hh = Math.floor(t / 3600) % 24, mm = Math.floor(t / 60) % 60, ss = t % 60;
  return `${hh % 12 || 12}:${String(mm).padStart(2, "0")}${secs ? ":" + String(ss).padStart(2, "0") : ""} ${hh < 12 ? "AM" : "PM"}`;
}
// The sky through the day: [hour, daylight 0..1, sky, daylight's color through
// the glass (linear)]. Everything eases between neighbors, so dusk is a slow
// slide from golden hour through sunset and the blue hour into night
const GLASS = { day: [0.95, 0.97, 1.0], morning: [1.0, 0.9, 0.8], gold: [1.0, 0.74, 0.45], sunset: [1.0, 0.55, 0.34], blue: [0.55, 0.65, 1.0] };
const SKY_KEYS = [
  [0, 0, 0x0e1a38, GLASS.blue],
  [4.8, 0, 0x0e1a38, GLASS.blue],
  [5.6, 0.12, 0x2d3564, GLASS.blue],            // first light
  [6.3, 0.45, 0x9b8cb4, GLASS.sunset],          // dawn
  [7.4, 0.85, 0x8fb0d8, GLASS.morning],
  [8.6, 1, 0x4f8fd6, GLASS.day],
  [17.4, 1, 0x4f8fd6, GLASS.day],
  [18.8, 0.8, 0x9ea9bd, GLASS.gold],            // golden hour
  [19.6, 0.45, 0xc9794f, GLASS.sunset],         // sunset
  [20.3, 0.12, 0x39406e, GLASS.blue],           // the blue hour
  [21.1, 0, 0x0e1a38, GLASS.blue],              // night
  [24, 0, 0x0e1a38, GLASS.blue],
].map(([h, level, sky, glass]) => ({ h, level, sky: new THREE.Color(sky), glass }));
const SUN_C = TVU.uSunC.value.clone(), SUN_LOW = new THREE.Color(1.0, 0.5, 0.22).multiplyScalar(0.95);   // noon sun / sun on the horizon
const tod = { level: 1, sky: new THREE.Color() };
function todTick() {                              // sample the sky for the shift clock's hour
  const h = shift.h % 24;
  let i = 0; while (i < SKY_KEYS.length - 2 && SKY_KEYS[i + 1].h <= h) i++;
  const a = SKY_KEYS[i], b = SKY_KEYS[i + 1], t = Math.min(1, Math.max(0, (h - a.h) / (b.h - a.h))), k = t * t * (3 - 2 * t);
  tod.level = a.level + (b.level - a.level) * k;
  tod.sky.lerpColors(a.sky, b.sky, k);
  if (WX.k > 0) tod.sky.lerp(WX_SKY.setRGB(0.42 * tod.level + 0.07, 0.45 * tod.level + 0.08, 0.5 * tod.level + 0.1), WX.k * 0.8);   // overcast
  setSky(tod.sky);
  setExteriorDay(tod.level > 0.5);                                   // lamps/lot lights from dusk on
  TVU.uDayC.value.setRGB(...a.glass.map((v, n) => v + (b.glass[n] - v) * k));   // daylight through the glass (linear)
  TVU.uNightC.value.set(0.035, 0.045, 0.08);                        // moonlight + the lot lights through it
  const arc = Math.min(1, Math.max(0, (h - 5.9) / 14.2)) * Math.PI, up = Math.sin(arc);   // the sun: up in the east ~6, across, down in the west ~8
  TVU.uSunDir.value.set(-16 * Math.cos(arc), 3 + 30 * up, -8).normalize();
  TVU.uSunC.value.copy(SUN_C).lerp(SUN_LOW, (1 - up) ** 3);         // warm and low at either end of the day
  if (WX.k > 0) { TVU.uSunC.value.multiplyScalar(1 - (WX.kind === "snow" ? 0.45 : 0.7) * WX.k); TVU.uDayC.value.multiplyScalar(1 - 0.4 * WX.k); }   // no sun through the clouds, a duller light through the glass
}
const WX_SKY = new THREE.Color();
