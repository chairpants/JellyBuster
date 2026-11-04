// ---------------- checkout: the same steps whether you or Dana ring them up ----------------
// card → tap it on the register → card back → take the tapes → desensitize each
// on the pad → take the cash → ring it up (the drawer opens) → change → tapes
// back. Snack-only sales skip the card and the pad. Skip the pad and the
// gates will tell you about it on their way out
let co = null;                                  // { by: "player"|"dana", cust, step, tapes, total, bill, change, des }
const money = n => "$" + n.toFixed(2);
const coTotal = cust => cust.tapes.reduce((a, t) => a + posTerm.rentPrice(t), 0) + cust.snacks.reduce((a, u) => a + snackPrice(u.userData.snack), 0) + (cust.tickets || 0) * SHOW.ticket;
const coTapes = () => co.cust.tapes.length === 1 ? co.cust.tapes[0].title : `${co.cust.tapes.length} tapes`;
// signing somebody up: take their form -> type them in at the register -> hand
// them their new card. Then they're a member, and off they go to look around
const SIGNUP_STEPS = [
  { id: "form", at: "customer", need: () => true, tip: () => "take their sign-up form", do() { co.cust.c.holdProp(null); co.hand = "form"; } },
  { id: "enroll", at: "register", need: () => true, tip: () => "enter them into the computer",
    do() { posBeep(1900); setTimeout(() => posBeep(1500), 120); posTerm.enroll(co.cust.member); rushLevel.n = null; co.hand = "newcard"; } },
  { id: "newcard", at: "customer", need: () => true, tip: () => "hand them their new member card",
    do() {
      const k = co.cust, by = co.by === "player" ? "you" : "dana", secs = clockT - co.start, pts = 40 + Math.max(0, Math.round(40 - secs));
      co.hand = null; k.c.holdProp("card"); k.c.setMood("love"); k.hi = 1.8; k.prospect = false;
      shift.stats.signups++; shiftScore(pts, by); posTerm.loyal(k.member, 5); gainXp(co.by === "player" ? "you" : co.emp, "cha", 10);
      logAct(`${by === "dana" ? `${co.emp?.first ?? emp.first} signed up` : "Signed up"} ${memberName(k.member)} (#${k.member.num}): a new member`, "good", null, pts);
      co = null; coHud(); custLeaveLine(k); k.path = []; k.state = "signedUp"; k.t = 1.5;
    } },
];
const CO_STEPS = [
  { id: "card", at: "customer", need: () => co.cust.tapes.length, tip: () => "take their member card",
    do() { co.cust.c.holdProp(null); co.hand = "card"; } },
  { id: "tap", at: "register", need: () => co.cust.tapes.length, tip: () => "tap the member card on the register",
    do() { posBeep(1900); const m = co.cust.member, late = m.rentals.filter(r => posTerm.dueIn(r) < 0).length, owed = posTerm.owed(m);
      logAct(`#${m.num} ${memberName(m)}${owed ? `: ${money(owed)} in late fees due` : ""}${late ? `${owed ? "," : ":"} ${late} tape${late > 1 ? "s" : ""} out late` : ""}${owed || late ? "" : ": account OK"}`, owed || late ? "bad" : ""); } },
  { id: "cardBack", at: "customer", need: () => co.cust.tapes.length, tip: () => "hand their card back",
    do() { co.hand = null; } },
  { id: "fees", at: "customer", need: () => co.cust.tapes.length && posTerm.owed(co.cust.member) > 0,
    tip: () => `charge the ${money(posTerm.owed(co.cust.member))} in late fees`, do() { coFees(true); } },   // Q waives them instead (coQ)
  { id: "tapes", at: "customer", need: () => co.cust.tapes.length, tip: () => `take ${coTapes()}`,
    do() { co.cust.c.holdTape(0); co.hand = "tapes"; } },
  { id: "desens", at: "pad", need: () => co.cust.tapes.some(t => !t.desens), repeat: () => co.cust.tapes.some(t => !t.desens),
    tip: () => { const t = co.cust.tapes.find(t => !t.desens); return `desensitize ${t.title}${co.cust.tapes.length > 1 ? ` (${co.cust.tapes.filter(t => t.desens).length + 1} of ${co.cust.tapes.length})` : ""}`; },
    do() { desensitize(co.cust.tapes.find(t => !t.desens)); } },
  { id: "cash", at: "customer", need: () => true, tip: () => `take the cash · ${money(co.total)} due`,
    do() { co.cust.c.holdProp(null); co.cashIn = co.bill; co.hand = "cash"; } },
  { id: "ring", at: "register", need: () => true, tip: () => `ring it up · ${money(co.bill)} in${co.change ? `, ${money(co.change)} change` : ""}`,
    do() {
      for (const t of co.cust.tapes) { posTerm.checkOut(t, co.cust.member); rentedCopies.push(t); }   // on their account
      if (co.cust.snacks.length) posTerm.sale(co.cust.snacks.reduce((a, u) => a + snackPrice(u.userData.snack), 0));
      const st = shift.stats; st.served++; st.rentals += co.cust.tapes.length;
      st.rentalTake += co.cust.tapes.reduce((a, t) => a + posTerm.rentPrice(t), 0); st.snackTake += co.cust.snacks.reduce((a, u) => a + snackPrice(u.userData.snack), 0);
      co.bought = co.cust.snacks.length;
      if (co.cust.tickets) { const n = co.cust.tickets; posTerm.sale(n * SHOW.ticket); show.sold += n; shift.stats.tickets += n; }           // (sold: their spots on the rack stay empty till restocked)
      drawerOpen = 1; posBeep(1200); co.hand = null; printReceipt();
    } },
  { id: "tear", at: "printer", need: () => true, tip: () => printer.job?.done ? "tear off the receipt" : "wait for the receipt to print",
    do() { receiptTear(); co.hand = co.change ? "change" : "receipt"; } },
  { id: "change", at: "customer", need: () => co.change > 0, tip: () => `give ${money(co.change)} change`,
    do() { co.hand = "receipt"; drawerOpen = 0; } },
  { id: "receipt", at: "customer", need: () => true, tip: () => "hand them the receipt",
    do() { drawerOpen = 0; co.cust.c.holdProp("receipt"); co.hand = co.cust.tapes.length ? "tapes" : null; } },
  { id: "handback", at: "customer", need: () => true, tip: () => co.cust.tapes.length ? `hand over ${coTapes()}` : "hand over their snacks",
    do() {
      drawerOpen = 0; co.hand = null;
      co.cust.c.holdTape(co.cust.tapes.length); co.cust.snacks = [];
      co.cust.tagged = co.cust.tapes.some(t => !t.desens);          // anything still tagged sets the gates off
      co.cust.paid = true;
      {                                                              // how'd that go (yours, or Dana's)
        const secs = clockT - co.start, missed = co.cust.tapes.filter(t => !t.desens).length;
        co.why = [secs < 40 ? "quick" : secs > 110 ? "slow" : "", co.upsold ? "upsold a snack" : "", co.feesIn ? "fees collected" : "", missed ? `${missed} tag${missed > 1 ? "s" : ""} missed` : ""].filter(Boolean);
        co.score = 100 + Math.max(0, Math.round((90 - secs) * 2)) + co.pts - 75 * missed; shiftScore(co.score, co.by === "player" ? "you" : "dana");
        const by = co.by === "player" ? "you" : co.emp; gainXp(by, "dex", 10); if (co.upsold) gainXp(by, "cha", 8);
        if (co.by !== "player") posTerm.loyal(co.cust.member, Math.floor((lv(co.emp, "cha") - 1) / 4));   // a charming clerk leaves them happier
        posTerm.loyal(co.cust.member, secs < 40 ? 7 : 4);
      }
      const nT = co.cust.tapes.length, nS = co.bought || 0;
      logAct(`${co.by === "dana" ? `${co.emp?.first} rang up` : "Rang up"} ${memberName(co.cust.member)}: ${[nT ? `${nT} tape${nT > 1 ? "s" : ""}` : "", nS ? `${nS} snack${nS > 1 ? "s" : ""}` : "", co.cust.tickets ? `${co.cust.tickets} show ticket${co.cust.tickets > 1 ? "s" : ""}` : "", co.fees ? "late fees" : ""].filter(Boolean).join(", ")}${co.why?.length ? ` (${co.why.join(", ")})` : ""}`,
        co.why?.some(w => w.includes("missed")) ? "bad" : "good", co.total, co.score);
      co.cust.c.holdProp("receipt");
      co.cust.c.setMood("thanks"); co.cust.c.setPose("hold"); co.cust.state = "paid"; co.cust.t = 1.8;
      co = null; coHud();
    } },
];
function coStart(by, cust = custLine[0]) {
  regularSays(cust, "counter", by);
  if (cust.prospect) {                           // not buying: signing up
    co = { by, cust, kind: "signup", i: 0, total: 0, bill: 0, change: 0, hand: null, start: clockT, pts: 0, fees: 0 };
    cust.state = "checkout"; cust.c.setMood("happy"); cust.c.setPose("wait"); coSkip(); coHud(); return;
  }
  if (!cust.moviegoer && cust.tickets == null) {  // "two for tonight's show while you're at it"
    const want = Math.random() < ticketChance() ? (Math.random() < 0.4 ? 2 : 1) : 0;
    cust.tickets = Math.max(0, Math.min(want, Math.min(10, theaterSeats.length) - show.sold));
  }
  const total = coTotal(cust), bills = [1, 5, 10, 20, 50].filter(b => b >= total);
  const bill = Math.random() < 0.25 ? total : (bills[0] ?? 50);          // exact change now and then
  co = { by, cust, i: 0, total, bill, change: +(bill - total).toFixed(2), hand: null, start: clockT, pts: 0, fees: 0 };
  cust.state = "checkout"; cust.c.setMood("happy"); cust.c.setPose("wait");
  coSkip(); coHud();
}
function coRebill() {                            // the total changed (fees charged, a snack added): new total, what they hand over, the change
  const total = +(coTotal(co.cust) + co.fees).toFixed(2), bills = [1, 5, 10, 20, 50, 100].filter(b => b >= total);
  co.total = total; co.bill = Math.random() < 0.25 ? total : (bills[0] ?? Math.ceil(total / 20) * 20); co.change = +(co.bill - total).toFixed(2);
}
function coFees(charge) {                        // late fees on their account: charge them (money, a grumpier customer) or waive them (goodwill)
  const m = co.cust.member, amt = posTerm.owed(m);
  posTerm.settle(m, charge); co.cust.hi = 1.6;
  const feeBy = co.by === "player" ? "you" : co.emp;
  const sting = Math.max(0, 3 - Math.floor((lv(feeBy, "cha") - 1) / 3));
  posTerm.loyal(m, charge ? -(has(feeBy, "cha", 5) ? Math.ceil(sting / 2) : sting) : 6);   // (Smooth Talker: half the sting) gainXp(feeBy, "cha", charge ? 3 : 2);   // (charm takes the sting out of a fee)
  if (charge) { co.fees += amt; co.feesIn = true; coRebill(); shift.stats.feesCollected += amt; co.cust.c.setMood("meh"); co.pts += 20; logAct(`${co.by === "dana" ? `${co.emp?.first} charged` : "Charged"} ${memberName(m)} their late fees`, "good", amt); }
  else { co.feesWaived = amt; shift.stats.feesWaived += amt; co.cust.c.setMood("love"); logAct(`Waived ${memberName(m)}'s ${money(amt)} in late fees`); }
}
const upsellSpot = () => snackSpots().filter(s => s.units.some(u => u.visible && u !== heldSnack))   // the nearest rack with anything left
  .sort((a, b) => Math.hypot(a.x - CUST_COUNTER.x, a.z - CUST_COUNTER.z) - Math.hypot(b.x - CUST_COUNTER.x, b.z - CUST_COUNTER.z))[0];
const coCanOffer = () => co?.by === "player" && co.kind !== "signup" && !co.offered && !co.away && co.hand !== "cash" && co.i <= CO_STEPS.findIndex(q => q.id === "cash") && !!upsellSpot();
function coOffer() {                             // "grab a snack for the movie?" — they'll go get it and come back to pay
  if (!coCanOffer()) return;
  const cust = co.cust, P = cust.who.persona;
  co.offered = true; cust.hi = 1.6;
  const yes = Math.random() < 0.12 + 0.6 * P.sweet + 0.025 * (lv("you", "cha") - 1) - (cust.snacks.length ? 0.3 : 0) - (["impatient", "angry"].includes(cust.c.mood) ? 0.2 : 0);   // (CHA: a better pitch)
  gainXp("you", "cha", yes ? 6 : 1);
  if (!yes) { cust.c.setMood("meh"); logAct(`Offered ${memberName(cust.member)} a snack: \u201cNo thanks, I'm good\u201d`); coHud(); return; }
  shift.stats.upsells++; logAct(`Offered ${memberName(cust.member)} a snack: \u201cOoh, yeah. Hang on a sec\u201d`, "good");
  co.away = true; cust.upsell = true; cust.hi = 0;
  cust.c.holdProp(null); cust.c.setMood("happy"); cust.c.setPose(cust.holding ? "hold" : "idle");
  custGo(cust, "snack", upsellSpot());
  coHud();
}
function coQ() {                                 // Q at the counter: waive their late fees, or offer a snack
  if (aimCustomer?.state === "asking" && aimCustomer.want.kind !== "rec") return custAllOut(aimCustomer);   // (or: sorry, it's all out)
  if (co?.by !== "player" || aimCustomer !== co.cust) return;
  if (coStep()?.id === "fees") { coFees(false); co.i++; coSkip(); coHud(); }
  else coOffer();
}
// ---- the receipt: printed at "ring it up", torn off, handed over ----
function printReceipt() {
  const W = 128, H = 460, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d"), d = shiftDate(), p2 = n => String(n).padStart(2, "0");
  g.fillStyle = "#f4f1e6"; g.beginPath(); g.moveTo(0, 4);                  // thermal paper, torn zigzag at both ends
  for (let x = 0; x <= W; x += 8) g.lineTo(x, x % 16 ? 0 : 4);
  for (let x = W; x >= 0; x -= 8) g.lineTo(x, H - (x % 16 ? 0 : 4));
  g.fill(); g.fillStyle = "#2a2a30"; g.textBaseline = "top";
  let y = 12;
  const ln = (t, x = 6, px = 10, bold = false, align = "left") => { g.font = `${bold ? "bold " : ""}${px}px "Courier New", monospace`; g.textAlign = align; g.fillText(t, align === "center" ? W / 2 : x, y); y += px + 3; };
  const lr = (a, b) => { g.font = `10px "Courier New", monospace`; g.textAlign = "left"; g.fillText(a.slice(0, 13), 6, y); g.textAlign = "right"; g.fillText(b, W - 6, y); y += 13; };
  ln("JELLYBUSTER", 0, 15, true, "center"); ln("VIDEO #0417", 0, 10, false, "center"); y += 4;
  ln(`${p2(d.getMonth() + 1)}/${p2(d.getDate())}/${String(d.getFullYear()).slice(2)}  ${fmtClock(shift.h)}`, 0, 10, false, "center");
  if (co.cust.tapes.length) ln(`MEMBER #${co.cust.member.num}`, 0, 10, false, "center");
  y += 6; g.fillRect(6, y, W - 12, 1); y += 6;
  for (const t of co.cust.tapes) lr(t.title.toUpperCase(), money(posTerm.rentPrice(t)));
  for (const u of co.cust.snacks) lr(u.userData.snack.name.toUpperCase(), money(snackPrice(u.userData.snack)));
  if (co.fees) lr("LATE FEES", money(co.fees));
  if (co.cust.tickets) lr(`SHOW TIX x${co.cust.tickets}`, money(co.cust.tickets * SHOW.ticket));
  y += 4; g.fillRect(6, y, W - 12, 1); y += 6;
  lr("TOTAL", money(co.total)); lr("CASH", money(co.bill)); lr("CHANGE", money(co.change));
  if (co.cust.tapes.length) {
    const due = co.cust.tapes.map(t => t.rental?.due).filter(Boolean).sort((a, b) => a - b)[0];
    if (due) { y += 8; ln(`DUE BACK ${p2(due.getMonth() + 1)}/${p2(due.getDate())}`, 0, 11, true, "center"); ln("BY MIDNIGHT", 0, 9, false, "center"); }
  }
  y += 10; ln("BE KIND, REWIND!", 0, 10, true, "center"); ln("THANK YOU", 0, 10, false, "center");
  printer.tex?.dispose();
  const tex = printer.tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  printer.strip.material.map = tex; printer.strip.material.needsUpdate = true;
  printer.strip.visible = true; printer.strip.scale.y = printer.strip.scale.z = 0.001;
  printer.job = { t: 0, dur: 0.9 * Math.max(0.6, 1 - 0.02 * (lv(co?.by === "player" ? "you" : co?.emp, "dex") - 1)), len: 0.25, done: false };
  printBuzz(0.9);
}
function printerTick(dt) {                       // the slip feeds out; a sale that fell through leaves nothing hanging
  if (printer.strip.visible && !co) { printer.strip.visible = false; printer.job = null; }
  const j = printer.job; if (!j || j.done) return;
  j.t += dt; const f = Math.min(1, j.t / j.dur);
  printer.strip.scale.y = printer.strip.scale.z = Math.max(0.001, j.len * f);
  printer.tex.repeat.set(1, f); printer.tex.offset.set(0, 1 - f);   // only the top of the slip is out so far
  if (f >= 1) { j.done = true; coHud(); }
}
function receiptTear() {
  printer.strip.visible = false; printer.job = null;
  printer.tex.repeat.set(1, 1); printer.tex.offset.set(0, 0);
  posBeep(3200);
}
function printBuzz(secs) {                       // dot-matrix: a buzzy rasp, pulsing line by line
  try {
    const ac = StoreAudio.ctx(), t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    o.type = "sawtooth"; o.frequency.value = 118; lfo.type = "square"; lfo.frequency.value = 9; lg.gain.value = 0.012;
    g.gain.value = 0.014; lfo.connect(lg).connect(g.gain); o.connect(g).connect(sfxOut(ac));
    o.start(t); lfo.start(t); o.stop(t + secs); lfo.stop(t + secs);
  } catch {}
}
const coSteps = () => co?.kind === "signup" ? SIGNUP_STEPS : CO_STEPS;   // a sale, or signing somebody up
function coSkip() { while (co && co.i < coSteps().length && !coSteps()[co.i].need()) co.i++; coProps(); }
function coProps() {                              // what the customer's holding out for this step
  if (!co) return;
  const id = coSteps()[co.i]?.id;
  co.cust.c.holdProp(id === "card" ? "card" : id === "cash" ? "cash" : id === "form" ? "form" : null);
}
const coStep = () => co && coSteps()[co.i];
function coWants(at) {
  const s = coStep(); if (!s || co.away) return null;             // away: off getting the snack you talked them into
  if (s.id === "tear" && !printer.job?.done) return null;         // still printing
  if (s.at === at) return s;
  if (s.id === "desens" && at === "customer") return CO_STEPS.find(q => q.id === "cash");   // you can skip the pad... the gates won't
  return null;
}
// the desensitizer works any time. Mid-checkout, from taking their tapes until
// you hand them back, it does theirs, whatever step you're on (skip it for the
// cash, come back after the change); otherwise the next live tape you're
// carrying, the one in hand first. -> { tape, of, co } | {} (all done) | null (nothing to do it to)
function padTarget() {
  const count = list => list.length > 1 ? ` (${list.filter(t => t.desens).length + 1} of ${list.length})` : "";
  if (co?.by === "player" && co.kind !== "signup" && co.i > CO_STEPS.findIndex(q => q.id === "tapes") && co.cust.tapes.length) {
    const t = co.cust.tapes.find(t => !t.desens);
    return t ? { tape: t, of: count(co.cust.tapes), co: true } : {};
  }
  const mine = [...new Set([held, ...inv.filter(e => e.kind === "tape").map(e => e.ref)])].filter(Boolean);
  if (!mine.length) return null;
  const t = mine.find(t => !t.desens);
  return t ? { tape: t, of: count(mine) } : {};
}
function padUse() {
  const p = padTarget();
  if (!p?.tape) { toast(p ? "Everything in hand is already desensitized" : "Nothing to desensitize"); return; }
  if (p.co && coStep()?.id === "desens") { coAct("pad"); return; }   // right on cue: the checkout moves along
  desensitize(p.tape); gainXp("you", "dex", 1);
  if (p.co) { co.idle = 0; coHud(); }             // out of order: same sale, the hand-held stack just updates
}
function coAct(at) {                              // do the current step if it happens at this spot
  const s = coWants(at); if (!s) return false;
  if (s !== coStep()) co.i = coSteps().indexOf(s);    // jumped ahead past the pad
  co.idle = 0;
  const actor = co.by === "player" ? "you" : co.emp, skill = co.kind === "signup" ? "cha" : "dex";
  s.do();
  gainXp(actor, skill, 3);                          // (each step of the work at the counter)
  if (co && !(s.repeat && s.repeat())) { co.i++; coSkip(); }
  coHud();
  return true;
}
function coRing() {                              // what the register's screen shows for this sale (see posTerm.ring)
  if (!co) return null;
  const steps = coSteps(), at = id => steps.findIndex(s => s.id === id), k = co.cust, s = coStep();
  const signup = co.kind === "signup";
  return {
    member: k.member, signup, clerk: co.by === "dana" ? co.emp?.first?.toUpperCase() : null,
    carded: signup ? co.i > at("enroll") : k.tapes.length ? co.i > at("tap") : null,   // (null: snacks only, no card)
    items: signup ? [["NEW MEMBERSHIP", 0]] : [...k.tapes.map(t => [t.title, posTerm.rentPrice(t)]), ...k.snacks.map(u => [u.userData.snack.name, snackPrice(u.userData.snack)]),
      ...(k.tickets ? [[`SHOW TICKET x${k.tickets}`, k.tickets * SHOW.ticket]] : [])],
    feesCharged: co.feesIn ? co.fees : 0, feesWaived: co.feesWaived || 0,
    total: co.total, cashIn: co.cashIn ?? null, change: co.change,
    next: co.by === "player" && s ? (co.away ? "customer is grabbing a snack" : s.tip()) : "",
  };
}
function coHud() {
  coHandShow(); posTerm.ring(coRing());
  const el = $("checkoutTag");
  if (!co) { el.style.display = "none"; return; }
  const s = coStep(), who = co.by === "dana" ? `${co.emp?.first} is ringing up` : "Ringing up";
  el.style.display = "block";
  el.innerHTML = co.kind === "signup" ? `<div class="h">NEW MEMBER</div>${co.by === "dana" ? `${co.emp?.first} is signing up` : "Signing up"} ${memberName(co.cust.member)}` +
    (co.by === "player" && s ? `<div class="next">Next: ${s.tip()}</div>` : "")
    : `<div class="h">CHECKOUT</div>${who} ${memberName(co.cust.member)} · ${money(co.total)}` +
    (co.by === "player" && s ? `<div class="next">${co.away ? "They're grabbing a snack…" : `Next: ${s.tip()}`}</div>` : "");
}
// what you're holding mid-checkout, drawn in your hand like a held tape: their
// card, the stack of tapes (real covers), the cash, the change
const coHand = new THREE.Group(); coHand.visible = false;
let coHandKey = "";
function coHandShow() {
  const want = co?.by === "player" ? co.hand || "" : "";
  const key = want + (want === "tapes" ? co.cust.tapes.map(t => t.desens ? 1 : 0).join("") : "");
  if (key === coHandKey) return; coHandKey = key;
  coHand.clear(); coHand.visible = !!want;
  if (!coHand.parent) camera.add(coHand);
  coHand.position.set(0.26, -0.26, -0.5); coHand.rotation.set(0.1, -0.35, 0.05);
  const card = (m, w, h) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.003), m); o.rotation.x = -0.25; coHand.add(o); };
  if (want === "card") card(coHandMats.card, 0.086, 0.054);
  if (want === "cash" || want === "change") card(coHandMats.cash, 0.156, 0.066);
  if (want === "form") card(coHandMats.form, 0.15, 0.21);
  if (want === "newcard") card(coHandMats.card, 0.086, 0.054);
  if (want === "receipt" && printer.tex) { const o = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.25), new THREE.MeshBasicMaterial({ map: printer.tex, side: THREE.DoubleSide, alphaTest: 0.5 })); o.rotation.set(-0.35, 0.3, 0); o.position.y = 0.04; coHand.add(o); }
  if (want === "tapes") co.cust.tapes.forEach((t, i) => {             // fanned out a little, covers toward you
    const g = new THREE.Group(); g.position.set(-0.05 + i * 0.045, i * 0.01, -0.03 - i * 0.012); g.rotation.set(-0.15, Math.PI / 2 + 0.35 - i * 0.12, 0.08 * i); coHand.add(g);   // cover toward you, fanned
    g.add(new THREE.Mesh(new THREE.BoxGeometry(TAPE.w, TAPE.h, TAPE.d), t.sideMat || mat.tapeBody));
    const art = new THREE.Mesh(new THREE.PlaneGeometry(TAPE.d, TAPE.h), new THREE.MeshBasicMaterial({ color: 0x333333 }));
    art.rotation.y = -Math.PI / 2; art.position.x = -TAPE.w / 2 - 0.001; g.add(art);
    loadCoverTexture(t, tex => { art.material.map = tex; art.material.color.set(0xffffff); art.material.needsUpdate = true; });
    if (t.desens) {                                                // a little green dot: done
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.008, 12), new THREE.MeshBasicMaterial({ color: 0x2bff6a }));
      dot.rotation.y = -Math.PI / 2; dot.position.set(-TAPE.w / 2 - 0.002, TAPE.h / 2 - 0.02, 0); g.add(dot);
    }
  });
}
const coHandMats = {
  form: new THREE.MeshLambertMaterial({ map: makeTexture((g, w, h) => { g.fillStyle = "#fbfbf4"; g.fillRect(0, 0, w, h); g.fillStyle = "#00349c"; g.font = `bold ${h * 0.06}px Arial`; g.fillText("JELLYBUSTER VIDEO", w * 0.08, h * 0.1); g.font = `${h * 0.04}px Arial`; g.fillText("MEMBERSHIP APPLICATION", w * 0.08, h * 0.16);
    g.strokeStyle = "#9aa"; g.lineWidth = 2; for (let i = 0; i < 8; i++) { const y = h * (0.26 + i * 0.09); g.beginPath(); g.moveTo(w * 0.08, y); g.lineTo(w * 0.92, y); g.stroke(); }
    g.strokeStyle = "#1b2a6a"; g.lineWidth = 3; for (let i = 0; i < 6; i++) { const y = h * (0.245 + i * 0.09); g.beginPath(); g.moveTo(w * 0.1, y); for (let x = 0.1; x < 0.2 + Math.random() * 0.5; x += 0.03) g.lineTo(w * x, y - Math.random() * h * 0.02); g.stroke(); } }, 180, 256) }),   // filled in, in ballpoint
  card: new THREE.MeshLambertMaterial({ map: makeTexture((g, w, h) => { g.fillStyle = "#1b3fa0"; g.fillRect(0, 0, w, h); g.fillStyle = "#ffd400"; g.fillRect(0, h * 0.62, w, h * 0.14); g.fillStyle = "#fff"; g.font = `bold ${h * 0.16}px Arial`; g.fillText("JELLYBUSTER", w * 0.07, h * 0.3); g.font = `${h * 0.11}px monospace`; g.fillText("MEMBER", w * 0.07, h * 0.5); }, 256, 160) }),
  cash: new THREE.MeshLambertMaterial({ map: makeTexture((g, w, h) => { g.fillStyle = "#9cc795"; g.fillRect(0, 0, w, h); g.strokeStyle = "#3d6b3a"; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = "#3d6b3a"; g.beginPath(); g.ellipse(w / 2, h / 2, h * 0.28, h * 0.34, 0, 0, 7); g.fill(); g.font = `bold ${h * 0.3}px Georgia`; g.fillText("$", w * 0.08, h * 0.42); }, 256, 110) }),
};
function posBeep(f) {
  try {
    const ac = StoreAudio.ctx(), o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.type = "square"; o.frequency.value = f; g.gain.setValueAtTime(0.035, t); g.gain.setValueAtTime(0, t + 0.09);
    o.connect(g).connect(sfxOut(ac)); o.start(t); o.stop(t + 0.1);
  } catch {}
}
function custTip(k) {                           // what E (and Q) do to this customer right now
  if (catchCall === k) return "Caught · 1–5 to decide";
  if (k.state === "tagWait") return "Their tape set off the gates<br>E — desensitize it";
  if (k.state === "asking") {
    const w = k.want, give = held ? `<br>E — hand them ${tapeName(held)}` : "";
    if (w.kind === "hold") return `Here to pick up <b>${tapeName(w.title)}</b> (on hold)${give || "<br>Get it from the holds shelf"}<br>Q — tell them it's not here`;
    const stock = w.title && lv("you", "int") >= 3 ? (onShelfCopy(w.title) ? " · <i>on the shelf</i>" : " · <i>all out</i>") : "";   // (INT: you know the stock)
    return w.kind === "title" ? `Looking for <b>${tapeName(w.title)}</b> (${w.title.category})${stock}${give}<br>Q — tell them it's all out`
      : `Wants ${TASTE_ASK[k.who.persona.taste.name] || "something good"}${give || "<br>Bring them a tape"}`;
  }
  const mine = co?.cust === k && co.by === "player";
  if (mine && co.away) return "Grabbing a snack…";
  if (mine && coStep()?.id === "fees" && coWants("customer")) return `E — ${coStep().tip()}<br>Q — waive them`;
  let t = co?.cust === k ? (mine && coWants("customer") ? `E — ${coWants("customer").tip()}` : co.by === "dana" ? `${co.emp?.first}'s ringing them up` : `Next: ${coStep().tip()}`)
    : !co && ["wait", "impatient", "angry"].includes(k.state) ? (k.prospect ? "E — they'd like to sign up" : "E — take their member card")
    : k.state === "leave" ? "E — say goodbye" : "E — say hi";
  if (mine && coCanOffer()) t += "<br>Q — offer a snack";
  return t;
}
// where you're aiming, in screen space: the crosshair (0, 0), except while touch.js points at a tapped spot:
// StoreAim.at(x, y) aims there and refreshes the hover tip (what the tap can do), then it's back to the middle
const aimNDC = { x: 0, y: 0 };
window.StoreAim = {
  at(x, y) { aimNDC.x = x; aimNDC.y = y; pickHover(); const tip = $("hoverTip"); return { tip: tip.style.display === "none" ? "" : tip.innerText, dflt: seated || onStool ? "E" : "CLICK" }; },
  center() { aimNDC.x = aimNDC.y = 0; pickHover(); },
};
function pickHover() {
  if (arcade.on) { $("hoverTip").style.display = "none"; highlight.visible = false; return; }   // (playing Space Invaders: nothing else to aim at)
  aimPostit = null; aimNotepad = false;
  hovered = null; aimStool = false; aimPickup = null; aimTony = null; aimBed = false; aimFireExit = null; cm.comboOf = null; aimTV = false; aimLamp = null; aimCouch = false; aimReturns = false; aimSnack = null; aimFlap = null; aimCooler = false; aimPop = null; aimTrash = false; aimDoor = null; aimPOS = false; aimSlot = false; aimRewinder = null; aimBell = false; aimDesens = false; aimCutout = false; aimCustomer = false; aimLock = false; aimEmp = false; aimSwitch = null; aimDrawer = false; aimExit = false; aimPrinter = false; aimStockSlot = null; aimCupboard = null; aimBox = null; aimMess = null; aimStray = null; aimPhone = false; aimHolds = false; aimBoard = false; aimMove = null; aimToilet = false; aimSink = false; aimTowels = false; aimBin = null; aimBag = null; aimChute = false; aimTool = null; aimDead = null; aimLadder = false; aimLadderHome = false;
  if (document.pointerLockElement !== canvas) { highlight.visible = false; $("hoverTip").style.display = "none"; return; }
  if (inspecting || seated || onStool) { highlight.visible = false; $("hoverTip").style.display = "none"; return; }
  if (cmove.item) {                           // carrying a counter thing: where it'd go
    highlight.visible = false; const tip = $("hoverTip"); tip.style.display = "block";
    tip.innerHTML = (cmove.spot ? cmove.ok ? `Click — set the ${cmove.item.name} down here` : "It won't fit there" : "Aim at a free spot on the counter") + `<div class="cat">Wheel — turn it · Right-click — put it back</div>`;
    return;
  }
  if (stool.carried) {                       // arms full: setting the stool down is the only thing E does
    highlight.visible = false;
    const tip = $("hoverTip"); tip.innerHTML = stool.spot ? "E — set the stool down" : "No room for the stool here"; tip.style.display = "block";
    return;
  }
  if (cutout.carried) {                      // arms full: the standee is the only thing E does
    highlight.visible = false;
    const tip = $("hoverTip"); tip.innerHTML = cutoutSpot ? "E — set the standee down" : "No room for the standee here"; tip.style.display = "block";
    return;
  }
  raycaster.setFromCamera(aimNDC, camera);
  aimRoofLadder = false; aimBack = false;
  aimGolf = false; aimCine = null;
  if (roof.climb || player.onRoof) {          // on the closet ladder, or up top: the hatch (to go back down), the golf mat and the movie setup are all there is
    highlight.visible = false; const tip = $("hoverTip");
    if (golf.on || seated) { tip.style.display = "none"; return; }   // (sat in a lawn chair: E stands you up, nothing else)
    const C = roof.cine, a = !roof.climb && raycaster.intersectObjects(roof.ladderParts.concat(roof.lid.children, golf.parts, C.vcr, C.proj, roof.seats, roof.back.top), false)[0], near = !!a && a.distance < 2.4;
    aimGolf = near && golf.parts.includes(a.object);
    aimCine = near && C.vcr.includes(a.object) ? "vcr" : near && C.proj.includes(a.object) ? "proj" : null;
    aimCouch = near && !!a.object.userData.sit; if (aimCouch) aimSeatObj = a.object.userData.seatPos;   // a lawn chair (its hint is the couch's: see tvHint)
    aimBack = near && a.object === roof.back.top;
    aimRoofLadder = near && !aimGolf && !aimCine && !aimCouch && !aimBack;
    tip.innerHTML = aimBack ? (roof.back.down ? "E — climb down the back ladder" : "E — kick the ladder down<div class=\"cat\">it's latched up, out of reach from the ground</div>")
      : aimRoofLadder ? "E — climb back down" : aimGolf ? (roofHandsFull() ? "The golf mat<div class=\"cat\">you'll need your hands free</div>" : "E — tee off")
      : aimCine === "proj" ? `E — turn the projector ${C.on ? "off" : "on"}`
      : aimCine === "vcr" ? (held ? `E — put ${held.title} in` : playing ? `E — eject${C.on ? "" : "<div class=\"cat\">the projector's off</div>"}` : "The VCR<div class=\"cat\">bring a tape up</div>") : "";
    tip.style.display = tip.innerHTML ? "block" : "none";
    return;
  }
  {                                          // the ladder out back, from the ground: up it, if somebody's kicked it down
    const a = raycaster.intersectObject(roof.back.foot, false)[0], wall = a && raycaster.intersectObjects(aimBlockers, false)[0];
    if (a && a.distance < 2.6 && !(wall && wall.distance < a.distance)) {
      aimBack = true; highlight.visible = false;
      const tip = $("hoverTip"); tip.innerHTML = !roof.back.down ? "A ladder to the roof<div class=\"cat\">pulled up, out of reach</div>" : roofHandsFull() ? "The back ladder<div class=\"cat\">you'll need both hands free</div>" : "E — climb up to the roof"; tip.style.display = "block";
      return;
    }
  }
  {                                          // the fixed ladder in the closet, up to the roof
    const a = raycaster.intersectObjects(roof.ladderParts, false)[0], wall = a && raycaster.intersectObjects(aimBlockers, false)[0];
    if (a && a.distance < 2.2 && !(wall && wall.distance < a.distance)) {
      aimRoofLadder = true; highlight.visible = false;
      if (CUSTOMER && !cm.hatch) cm.comboOf = COMBOS.hatch;   // (a customer: the hatch up top's padlocked)
      const tip = $("hoverTip"); tip.innerHTML = cm.comboOf ? comboTip(cm.comboOf) : roofHandsFull() ? "The roof ladder<div class=\"cat\">you'll need both hands free</div>" : "E — climb up to the roof"; tip.style.display = "block";
      return;
    }
  }
  if (ladder.on) {                           // up the ladder: the lights are all there is
    highlight.visible = false;
    const a = raycaster.intersectObjects(aimables, false).find(h => h.object.userData.deadLight);
    aimDead = a && a.distance < LADDER.REACH ? a.object.userData.deadLight : null;
    const tip = $("hoverTip"); tip.style.display = "block";
    tip.innerHTML = ladder.fix ? "Swapping the tube…" : aimDead ? "E — swap the tube" : a && a.distance < 6 ? "Out of reach from here<div class=\"cat\">E — climb down and move the ladder under it</div>" : "On the step ladder<div class=\"cat\">E or a move key — climb down</div>";
    return;
  }
  if (ladder.state === "carried") {          // arms full of ladder: set it down, or back against the closet wall
    highlight.visible = false;
    const a = raycaster.intersectObject(ladder.home, false)[0];
    aimLadderHome = !!a && a.distance < 2.6;
    const tip = $("hoverTip"); tip.style.display = "block";
    tip.innerHTML = aimLadderHome ? "E — fold it up and lean it against the wall" : ladder.spot ? "E — set the step ladder up here" : "No room for the step ladder here";
    return;
  }
  if (boxCarry.length) {                     // arms full of boxes: a stock cupboard (to unpack) or another box
    highlight.visible = false;
    const a = raycaster.intersectObjects(aimables, false).find(h => h.distance < 2.4 && (h.object.userData.stock || h.object.userData.box));
    aimCupboard = a?.object.userData.stock || null; aimBox = a?.object.userData.box || null;
    const tip = $("hoverTip"); tip.style.display = "block";
    tip.innerHTML = aimCupboard ? `E — unpack ${boxCarry.length === 1 ? "the box" : `all ${boxCarry.length} boxes`}` : aimBox ? (boxCarry.length < 3 ? `E — pick up ${aimBox.name} \u00d7${aimBox.qty} too` : "Arms full") : `Carrying ${boxCarry.length} box${boxCarry.length > 1 ? "es" : ""} · unpack at a stock cupboard behind the counter`;
    return;
  }
  if (bagCarry.length) {                     // hands full of trash bags: the chute, another bin or bag, and doors and switches on the way
    highlight.visible = false;
    let a = raycaster.intersectObjects(aimables, false).find(h => h.distance < 2.4 && ["chute", "trashBin", "trashBag", "door", "lightZone"].some(k => h.object.userData[k]));
    const wall = a && raycaster.intersectObjects(aimBlockers, false)[0]; if (wall && wall.distance < a.distance) a = undefined;
    const u = a?.object.userData || {}, n = bagCarry.length, more = n < bagMax();
    aimChute = !!u.chute; aimBin = u.trashBin || null; aimBag = u.trashBag || null; aimDoor = !aimChute && !aimBin && !aimBag && u.door || null; aimSwitch = !aimDoor && !aimChute && !aimBin && !aimBag && u.lightZone || null;
    const tip = $("hoverTip"); tip.style.display = "block";
    tip.innerHTML = aimChute ? `E — send ${n === 1 ? "the bag" : n === 2 ? "both bags" : "all three bags"} down the chute`
      : aimBin ? (aimBin.n ? (more ? `E — bag the ${aimBin.name} too` : "Hands full") : `The ${aimBin.name} · empty`)
      : aimBag ? (more ? "E — pick up this bag too" : "Hands full")
      : aimDoor ? (aimDoor.locked ? "Locked" : `E — ${aimDoor.open ? "close" : "open"} the door`)
      : aimSwitch ? `E — turn the ${ZONE_NAMES[aimSwitch]} lights ${zoneOn[aimSwitch] ? "off" : "on"}`
      : `Carrying ${n === 1 ? "a trash bag" : `${n} trash bags`} · the chute's in the janitor's closet<div class="cat">Right-click — set ${n === 1 ? "it" : "them"} down</div>`;
    return;
  }
  let hit = raycaster.intersectObjects(coverMeshes, false).find(h => h.distance < 3.4);   // a checked-out copy is collapsed out of the mesh, so the ray goes past its slot
  if (hit && raycaster.intersectObjects(aimBlockers, false)[0]?.distance < hit.distance) hit = undefined;   // something solid in the way
  if (hit) hovered = hit.object.userData.tapes[Math.floor(hit.face.a / COVER_V)];
  const sh = strays.length && raycaster.intersectObjects(strays.map(s => s.mesh), false)[0];   // a misshelved tape sticks out in front of the row
  if (sh && sh.distance < 2.6 && (!hit || sh.distance < hit.distance + 0.05)) {
    hovered = null; aimStray = strays.find(s => s.mesh === sh.object); highlight.visible = false;
    const tip = $("hoverTip"); tip.innerHTML = `E — pick up the misshelved ${aimStray.copy.title}`; tip.style.display = "block";
    return;
  }
  // the tape in hand's own empty slot: aim within ~8cm of its center (a slot is
  // 13cm wide), nothing solid in front of it, and it can go back on the shelf
  if (held?.pos && held.offShelf) {
    const ray = raycaster.ray, t = held.pos.clone().sub(ray.origin).dot(ray.direction);
    const blocked = (hit && hit.distance < t - 0.15) || raycaster.intersectObjects(aimBlockers, false).some(h => h.distance < t - 0.15);
    aimSlot = t > 0.3 && t < 3.4 && ray.distanceSqToPoint(held.pos) < 0.08 ** 2 && !blocked;
  }
  if (aimSlot) {
    hovered = null;
    highlight.visible = true; highlight.position.copy(held.pos); highlight.rotation.y = held.ry;
    const tip = $("hoverTip");
    tip.innerHTML = `CLICK — put ${held.title} back`; tip.style.display = "block";
    return;
  }
  if (hovered) {
    highlight.visible = true; highlight.position.copy(hovered.pos); highlight.rotation.y = hovered.ry;
    const tip = $("hoverTip");
    const season = hovered.seasons?.[0]?.label;             // "Season 1", "Episodes", or "" for a movie
    tip.innerHTML = `${hovered.title}<div class="cat">${hovered.category}${season ? " · " + season : ""}</div>`;
    tip.style.display = "block";
  } else {
    highlight.visible = false;
    const aimHits = raycaster.intersectObjects(aimables, false);
    let aim = aimHits.find(h => h.object.userData.mess && h.distance < 2.4) || aimHits[0];   // trash under a seat: the trash, not the seat
    const wall = aim && raycaster.intersectObjects(aimBlockers, false)[0];
    if (wall && wall.distance < aim.distance) aim = undefined;   // it's on the far side of a wall or a rack's back
    aimMove = aim && aim.distance < 2.4 && aim.object.userData.movable || null;   // (a rewinder, the pad, the printer: hold E to move it)
    cmRent.aim = !!aim?.object.userData.cmRentDrop && aim.distance < 2;
    if (aim?.object.userData.pickup && aim.distance < 2) aimPickup = aim.object.userData.pickup;
    else if (aim?.object.userData.combo && aim.distance < 1.6) cm.comboOf = aim.object.userData.combo;
    else if (aim?.object.userData.tony && aim.distance < 2.4) aimTony = aim.object.userData.tony;
    else if (aim?.object.userData.bed && aim.distance < 2.4 && CUSTOMER) aimBed = true;
    else if (aim?.object.userData.fireExit && aim.distance < 2.2) { aimFireExit = aim.object.userData.fireExit; aimExitDoor = aim.object.userData.exitDoor || fireExit; }
    else if ((aim?.object === screenMesh && aim.distance < 4.5) || (aim?.object === theaterScreenMesh && aim.distance < 9) || (aim?.object.userData.theaterDeck && aim.distance < 3.2)) aimTV = true;
    else if (aim?.object.userData.lamp && aim.distance < 2.6) aimLamp = aim.object.userData.lamp;
    else if (aim?.object.userData.sit && aim.distance < 3.2) { aimCouch = true; aimSeatX = aim.point.x; aimSeatObj = aim.object.userData.seatPos || null; }
    else if (aim?.object.userData.returns && aim.distance < 2.4) aimReturns = true;
    else if ((aimStockSlot = aim && aim.distance < 2.4 && (aim.object.userData.unit || aim.object.userData.snack) && stockSlotIn(aim.object.userData.unit || aim.object) || null)) {}   // carrying one for this lane, and it has room: in it goes, at the back
    else if ((aim?.object.userData.unit || aim?.object.userData.snack) && (aim.object.userData.unit || aim.object).visible && aim.distance < 2.4)
      aimSnack = aim.object.userData.unit || aim.object;   // the exact unit you pointed at (a drink's whole group, not just the label you hit)
    else if (aim?.object.userData.stock && aim.distance < 2.2) aimCupboard = aim.object.userData.stock;
    else if (aim?.object.userData.box && aim.distance < 2.4) aimBox = aim.object.userData.box;
    else if (aim?.object.userData.mess && aim.distance < 2.4) aimMess = aim.object.userData.mess;
    else if (aim?.object.userData.tool && aim.distance < 2.4) aimTool = aim.object.userData.tool;
    else if (aim?.object.userData.toolHome && aim.distance < 2.4 && toolHeld === aim.object.userData.toolHome) aimTool = toolHeld;
    else if (aim?.object.userData.ladder && aim.distance < 2.4) aimLadder = true;
    else if (aim?.object.userData.deadLight && aim.distance < 3.8) aimDead = aim.object.userData.deadLight;
    else if (aim?.object.userData.postit && aim.distance < 2.4) aimPostit = aim.object.userData.postit;
    else if (aim?.object.userData.notepad && aim.distance < 2.4) aimNotepad = true;
    else if (aim?.object.userData.phone && aim.distance < 2.4) aimPhone = true;
    else if (aim?.object.userData.holds && aim.distance < 2.4) aimHolds = true;
    else if (aim?.object.userData.jobBoard && aim.distance < 2.4) aimBoard = true;
    else if (aim?.object.userData.flush && aim.distance < 2.2) aimToilet = aim.object.userData.flush;   // the lever flushes (the rest of it you sit on)
    else if (aim?.object.userData.sink && aim.distance < 2.2) aimSink = aim.object.userData.sink;
    else if (aim?.object.userData.towels && aim.distance < 2.2) aimTowels = aim.object.userData.towels;
    else if (aim?.object.userData.coolerDoor && aim.distance < 2.6) aimCooler = true;
    else if (aim?.object.userData.popcorn && aim.distance < 2.4 && owned("popcorn")) aimPop = aim.object.userData.popcorn;
    else if (aim?.object.userData.trashBin && aim.distance < 2.4 && (heldSnack || heldPopcorn || postitHeld) && !binFull(aim.object.userData.trashBin)) aimTrash = aim.object.userData.trashBin;
    else if (aim?.object.userData.trashBin && aim.distance < 2.4) aimBin = aim.object.userData.trashBin;
    else if (aim?.object.userData.trashBag && aim.distance < 2.4) aimBag = aim.object.userData.trashBag;
    else if (aim?.object.userData.chute && aim.distance < 2.4) aimChute = true;
    else if (aim?.object.userData.flap && aim.distance < 2.6) aimFlap = aim.object.userData.flap;
    else if (aim?.object.userData.door && aim.distance < 2.4) aimDoor = aim.object.userData.door;
    else if (aim?.object.userData.pos && aim.distance < 2.4) aimPOS = true;
    else if (aim?.object.userData.bell && aim.distance < 2.4) aimBell = true;
    else if (aim?.object.userData.desens && aim.distance < 2.4) aimDesens = true;   // always usable (see padTarget)
    else if (aim?.object.userData.drawer && aim.distance < 2.4) aimDrawer = true;
    else if (aim?.object.userData.rewinder && aim.distance < 2.4 && (held || aim.object.userData.rewinder.tape)) aimRewinder = aim.object.userData.rewinder;
    else if (aim?.object.userData.cutout && aim.distance < 2.6) aimCutout = true;
    else if (aim?.object.userData.frontLock && aim.distance < 2.2) aimLock = true;
    else if (aim?.object.userData.exitDoor && aim.distance < 2.4 && shift.h >= 23) aimExit = true;   // near close: the way home
    else if (aim?.object.userData.lightZone && aim.distance < 2.2) aimSwitch = aim.object.userData.lightZone;
    else if (aim?.object.userData.stool && aim.distance < 2.2) aimStool = true;
    else if (aim?.object.userData.employee && aim.distance < 2.8) aimEmp = aim.object.userData.employee;   // (the employee themself)
    else if (aim?.object.userData.customer?.c && aim.distance < 2.6 && aim.object.userData.customer.state !== "out") { aimCustomer = aim.object.userData.customer; aimCustomer.known = true; }   // walking ones too: a shoplifter doesn't stop. known: you've had their name up
    else if (aim?.object.userData.printer && aim.distance < 2.4) aimPrinter = true;
    const tip = $("hoverTip"), cmT = CUSTOMER && cmTip();
    if (cmT) tip.innerHTML = cmT;
    else if (aimLamp) tip.innerHTML = `E — turn lamp ${aimLamp.userData.on ? "off" : "on"}`;
    else if (aimReturns && (held || returnBin.length)) tip.innerHTML = [held && "E — drop tape in Returns",
      returnBin.length && inv.length < INV_MAX && `CLICK — look at a tape from Returns (${returnBin.length})`].filter(Boolean).join("<br>");
    else if (aimPop) tip.innerHTML = popcornStep(aimPop, false);
    else if (aimTrash) tip.innerHTML = `E — throw away ${postitHeld ? "the post-it" : heldSnack ? heldSnack.userData.snack.name : "the popcorn"}`;
    else if (postitHeld && (aimPostit || aimPhone || aimNotepad)) tip.innerHTML = "E — stick the post-it back by the phone";
    else if (aimPostit) { const n = aimPostit, m = n.m, can = !phone.out && !phone.call && posTerm.needsCall(m) && !posTerm.calledToday(m);
      tip.innerHTML = `Post-it: call ${memberName(m)} · ${m.phone}<div class="cat">${n.result ? n.result.toLowerCase() : posTerm.lateSummary(m).toLowerCase()}</div>` +
        (eHoldTimer && eHoldPostit ? "Peeling…" : (can ? "E — call them<br>" : !posTerm.needsCall(m) ? "<div class=\"cat\">the tape's back: no need to call</div>" : posTerm.calledToday(m) ? "<div class=\"cat\">called today: try again tomorrow</div>" : "") + "Hold E — peel it off"); }
    else if (aimNotepad) tip.innerHTML = `Post-it notes<div class="cat">an overdue call looked up on the register (messages) goes on one, by the phone</div>`;
    else if (aimBin) tip.innerHTML = aimBin.n ? `E — bag the trash<div class="cat">${aimBin.name} · ${binFull(aimBin) ? "full" : `${Math.round(100 * aimBin.n / aimBin.cap)}% full`}</div>` : `The ${aimBin.name} · empty`;
    else if (aimBag) tip.innerHTML = "E — pick up the trash bag";
    else if (aimChute) tip.innerHTML = "Trash chute<div class=\"cat\">E — open the hatch · bag up the bins and bring them here</div>";
    else if (aimSnack && inv.length < INV_MAX) tip.innerHTML = `CLICK — grab ${aimSnack.userData.snack.name}${aimSnack.userData.snack.kind ? ` <div class="cat">${aimSnack.userData.snack.kind}</div>` : ""}`;
    else if (aimCooler) tip.innerHTML = `E — ${coolerOpen ? "close" : "open"} the cooler<div class="cat">${Math.round(coolerThermo.temp)}°F inside${(drinkUnits || []).some(u => u.visible && drinkTemp(u) > DRINK_WARM) ? " · some drinks still warm" : ""}</div>`;
    else if (aimFlap) tip.innerHTML = `E — ${flapOpen ? "close" : "open"} the counter pass-through`;
    else if (aimDoor) tip.innerHTML = aimDoor.locked ? "Locked" : `E — ${aimDoor.open ? "close" : "open"} the door`;
    else if (aimRewinder) tip.innerHTML = !aimRewinder.tape ? `E — rewind ${held.title}${isRewound(held) ? " (already rewound)" : ""}`
      : aimRewinder.done ? `E — take out ${aimRewinder.tape.title} · rewound`
      : `Rewinding… ${Math.round(100 * aimRewinder.t / aimRewinder.dur)}% · E — take it out early`;
    else if (aimBell) tip.innerHTML = "E — ring for service";
    else if (aimEmp && (aimEmp.leaving || aimEmp.state === "toExit")) tip.innerHTML = `${aimEmp.first}<div class="cat">Heading home</div>`;
    else if (aimEmp && afterClose()) tip.innerHTML = `E — send ${aimEmp.first} home<div class="cat">The store's closed · ${empSummary(aimEmp)}</div>`;
    else if (aimEmp) tip.innerHTML = withEmp(aimEmp, () => emp.state === "stoolSit" ? `E — give ${emp.first} a spin<div class="cat">On the stool${emp.dizzy > 0.5 ? " · looking a bit green" : ""}</div>` : emp.state === "watching" ? `${emp.first}<div class="cat">Off the clock · watching with you</div>` : emp.task === "register"
      ? (returnBin.length ? `E — ask ${emp.first} to process returns<div class="cat">${returnBin.length} in the bin · on the register</div>` : `${emp.first}<div class="cat">On the register · returns bin is empty</div>`)
      : `E — send ${emp.first} back to the register<div class="cat">Processing returns · ${returnBin.length + emp.carry.length} to go</div>`) + `<div class="cat">${empSummary(aimEmp)}</div>`;
    else if (aimSwitch) tip.innerHTML = `E — turn the ${ZONE_NAMES[aimSwitch]} lights ${zoneOn[aimSwitch] ? "off" : "on"}`
      + (switchPlate[aimSwitch].length > 1 ? `<br>Hold E — turn them all ${zoneOn[switchPlate[aimSwitch][0]] ? "off" : "on"}` : "");
    else if (aimStool) tip.innerHTML = stool.by ? `${stool.by.first}'s using the stool` : eHoldTimer ? "Lifting…" : "E — sit on the stool<br>Hold E — pick it up";
    else if (aimFireExit) tip.innerHTML = aimFireExit === "in" ? "E — push the bar: open the emergency exit<div class=\"cat\">it won't open from outside</div>" : "Emergency exit<div class=\"cat\">no handle this side: it only opens from inside</div>";
    else if (aimLock) tip.innerHTML = `E — ${frontLock.locked ? "unlock the front doors" : "lock the front doors"}`;
    else if (aimExit) tip.innerHTML = !afterClose() ? "Open till midnight · clock out after close" : custs.length ? "Customers still inside" : "E — clock out and go home";
    else if (aimCustomer) tip.innerHTML = aimCustomer.kid ? `E — say hi<div class="cat">${memberName(aimCustomer.member)}'s kid</div>` : custTip(aimCustomer) + `<div class="cat">${memberName(aimCustomer.member)} · #${aimCustomer.member.num}</div>`;
    else if (aimStockSlot) tip.innerHTML = `E — put out a ${aimStockSlot.userData.snack.name}`;
    else if (aimCupboard) { const n = emptySpots().filter(u => isDrink(u.userData.snack) === (aimCupboard === "drinks")).length;
      const mine = inv.filter(e => stockMine(e, aimCupboard)).length, inHand = heldSnack && stockMine({ kind: "snack", ref: heldSnack }, aimCupboard);
      tip.innerHTML = `${aimCupboard === "drinks" ? "Drink" : "Snack"} stock${n ? `<br>E — grab what the racks need (${n} empty spot${n > 1 ? "s" : ""})` : mine ? `<br>E — put back the ${mine} you're carrying` : " · the racks are full"}${inHand ? "<br>RIGHT-CLICK — put this one back" : ""}`; }
    else if (aimBox) tip.innerHTML = `E — pick up the box: ${aimBox.name} \u00d7${aimBox.qty}`;
    else if (aimToilet) tip.innerHTML = aimToilet.flushT > 0 ? "Flushing…" : "E — flush";
    else if (aimTony) tip.innerHTML = aimTony === "order" ? (tonyOpen() ? "E — a slice, neighbor<div class=\"cat\">Tony's</div>" : "Tony's counter<div class=\"cat\">closed · open 11 AM to 11 PM</div>") : tonyOpen() ? `E — play ${TONY_GAMES[+aimTony.slice(4)][0]}<div class="cat">on the house, you know the guy</div>` : `${TONY_GAMES[+aimTony.slice(4)][0]}<div class="cat">closed · open 11 AM to 11 PM</div>`;
    else if (aimSink) tip.innerHTML = `E — turn the tap ${aimSink.tap ? "off" : "on"}`;
    else if (aimTowels) tip.innerHTML = "E — take a paper towel";
    else if (aimBoard) tip.innerHTML = `E — the staff job board<div class="cat">${staff.map(e => `${e.first}: ${withEmp(e, () => JOBS[danaJobNow()]?.name.toLowerCase() || "free")}`).join(" · ")}</div>`;
    else if (aimPhone) tip.innerHTML = phone.ring ? "E — answer the phone" : phone.call ? "On the phone: 1 or 2 to answer them" : phone.out ? "On the phone" : `The store phone${postits.length ? `<div class="cat">${postits.length} post-it${postits.length > 1 ? "s" : ""} beside it</div>` : ""}`;
    else if (aimHolds) { const h = held && holds.find(h => !h.copy && titleOfCopy(held) === h.title), open = holds.filter(h => !h.copy);
      const ask = !held && custAsks.find(k => k.state === "asking" && k.want.kind === "hold" && k.want.hold.copy);
      tip.innerHTML = h ? `E — put ${tapeName(held)} on hold for ${memberName(h.member)}` : ask ? `E — take down ${tapeName(ask.want.title)} for ${memberName(ask.member)}` : open.length ? `Holds to put aside:<div class="cat">${open.map(h => `${tapeName(h.title)} (${memberName(h.member)}, ~${fmtClock(h.at)})`).join("<br>")}</div>` : holds.length ? `${holds.length} on hold` : "Holds shelf (empty)"; }
    else if (aimMess) { const need = MESS_TOOL[aimMess.kind];
      tip.innerHTML = need && toolHeld !== need ? `The ${MESS[aimMess.kind].label}<div class="cat">needs the ${TOOLS[need].label} · janitor's closet</div>` : `E — clean up the ${MESS[aimMess.kind].label}${need ? ` with the ${TOOLS[need].label}` : ""}`; }
    else if (aimTool) tip.innerHTML = toolHeld === aimTool ? `E — put the ${TOOLS[aimTool].label} back` : toolHeld ? `Put the ${TOOLS[toolHeld].label} back first` : `E — take the ${TOOLS[aimTool].label}`;
    else if (aimLadder) tip.innerHTML = ladder.state === "stored" ? "E — take the step ladder" : eHoldTimer ? "Lifting…" : "E — climb the ladder<br>Hold E — pick it up";
    else if (aimDead) tip.innerHTML = `A burnt-out light<div class="cat">${ladder.state === "placed" ? "set the step ladder up under it and climb up" : "the step ladder's in the janitor's closet"}</div>`;
    else if (aimPrinter) tip.innerHTML = co?.by === "player" && coStep()?.id === "tear" ? (printer.job?.done ? "E — tear off the receipt" : "Printing…") : "Receipt printer";
    else if (aimCutout) tip.innerHTML = eHoldTimer ? "Lifting…" : "Hold E — pick up the standee";
    else if (aimDesens) { const p = padTarget(); tip.innerHTML = p?.tape ? `E — desensitize ${p.tape.title}${p.of}` : `Desensitizer<div class="cat">${p ? "everything in hand is desensitized" : "bring a tape over to desensitize it"}</div>`; }
    else if (aimDrawer) tip.innerHTML = co?.by === "player" && coWants("register") ? `E — ${coWants("register").tip()}` : "Cash drawer";
    else if (aimPOS && co?.by === "player" && coWants("register")) tip.innerHTML = `E — ${coWants("register").tip()}`;
    else if (aimPOS) tip.innerHTML = gateAlarm.on ? "E — log in to the register (silence the gate alarm)" : "E — log in to the register";
    else if (aimMove) tip.innerHTML = eHoldTimer && eHoldMove ? "Lifting…" : `Hold E — move the ${aimMove.name}`;
    else { tip.style.display = "none"; return; }
    if (aimMove && !tip.innerHTML.includes("Hold E")) tip.innerHTML += `<div class="cat">Hold E — move it</div>`;
    tip.style.display = "block";
  }
}
canvas.addEventListener("contextmenu", e => e.preventDefault());
canvas.addEventListener("mouseup", e => { if (golf.on && document.pointerLockElement === canvas) golfMouse(false, e.button); });
canvas.addEventListener("mousedown", e => {
  if (document.pointerLockElement !== canvas || drunk.out) return;
  if (golf.on) { golfMouse(true, e.button); return; }
  if (cmove.item) { if (e.button === 0) movePlace(); else if (e.button === 2) moveCancel(`The ${cmove.item.name}'s back where it was`); return; }
  if (e.button === 2) {                                    // right click puts down whatever's in hand (and backs out of things, like Escape)
    if (board.open) { boardClose(); return; }             // Dana's job board
    if (sheet.open) { sheetToggle(); return; }            // the skills sheet
    if (tvMenu) { tvMenu = false; return; }                // an open picture menu closes from anywhere...
    if (tvScreenHit()) { tvMenu = true; return; }          // ...but only opens with the crosshair on the screen
    if (bagCarry.length) { bagsSetDown(); return; }       // trash bags: down at your feet
    if (postitHeld) { postitPutBack(); return; }          // a peeled-off post-it: back by the phone
    if (held && held === peek) {                           // only still-being-looked-at tapes go back
      if (peekSrc === "bin") { returnBin.push(held); releaseFromHand(); refreshReturnsBin(); } else putBack();
      peek = null;
    }
    else if (heldSnack) dropSnack();
    else if (heldPopcorn && (heldPopcorn.kind === "kernel" || !heldPopcorn.used)) dropPopcorn();   // a used box only goes in the trash
    return;
  }
  if (e.button !== 0 || cutout.carried || stool.carried || boxCarry.length || bagCarry.length) return;   // arms full carrying the standee / boxes / trash
  if (tvMenu) { const hit = tvScreenHit(); if (hit) { tvMenuClick(hit.x, hit.y); return; } }
  if (held && inspecting) { inspecting = false; peek = null; return; }  // tuck the held-up tape back in hand (it's yours now)
  if (aimSlot) { putBack(); return; }                      // slotted back into its own spot on the shelf
  if (aimReturns && returnBin.length) {                    // Returns works like a shelf: click to look, click again to take, right-click to put it back
    if (invMakeRoom()) { const t = returnBin.pop(); t.fromReturns = true; refreshReturnsBin(); pickup(t); peek = t; peekSrc = "bin"; }
    return;
  }
  if (aimPop && popcornStep(aimPop, true)) return;         // popcorn cart steps
  if (hovered || aimSnack) {                               // another item: whatever's in hand goes into the inventory (up to INV_MAX)
    if (invMakeRoom()) { if (hovered) { pickup(hovered); peek = hovered; peekSrc = "shelf"; } else grabSnack(aimSnack); }
    return;
  }
  if (held) { inspecting = true; return; }                 // hold it up to look at it
  if (heldSnack) { if (biteAnim <= 0) consumeSnack(); return; }   // a bite / sip (E stays free for standing up off the couch)
  if (heldPopcorn) { if (biteAnim <= 0) eatPopcorn(); return; }   // ...or a handful of popcorn
});

// held tape in hand
const handGroup = new THREE.Group();
handGroup.position.set(0.3, -0.28, -0.55); handGroup.rotation.set(0.05, -0.4, 0.06);
camera.add(handGroup); scene.add(camera);
const handBody = new THREE.Mesh(new THREE.BoxGeometry(TAPE.w, TAPE.h, TAPE.d), mat.tapeBody);
const handArt = new THREE.Mesh(new THREE.PlaneGeometry(TAPE.d, TAPE.h),
  new THREE.MeshBasicMaterial({ color: 0x333333 }));
handArt.rotation.y = -Math.PI / 2; handArt.position.x = -0.017;
handGroup.add(handBody, handArt);
handGroup.visible = false;

// held snack in hand — same hand slot as a tape, no inspect. It's the very unit
// you clicked: same geometry + material, and its rack slot sits empty until you
// put it back (right-click)
const snackGroup = new THREE.Group();
snackGroup.position.copy(handGroup.position); snackGroup.rotation.copy(handGroup.rotation);
camera.add(snackGroup);
snackGroup.visible = false;
function grabSnack(unit) {
  showSnack(unit); unit.visible = false;
  snackLeft = snackTotal = portions(unit.userData.snack);
  snackTag();
}
function showSnack(unit) {                   // put this unit in your hand (fresh grab, or back out of the inventory)
  const p = unit.userData.snack;
  heldSnack = unit;
  // rebuild it part for part (shared geometry/materials) rather than clone():
  // clone() deep-copies userData, and a drink's parts point back at their unit
  const copy = o => {
    const c = o.isMesh ? new THREE.Mesh(o.geometry, o.material) : new THREE.Group();
    c.position.copy(o.position); c.rotation.copy(o.rotation); c.scale.copy(o.scale);
    o.children.forEach(ch => c.add(copy(ch))); return c;
  };
  const inHand = copy(unit); inHand.position.set(0, p.shape === "tube" || !p.r ? 0 : -p.h / 2, 0); inHand.rotation.set(0, 0, 0);
  snackGroup.clear(); snackGroup.add(inHand); snackGroup.visible = true;
}
function dropSnack(toss = false) {           // right-click puts an untouched one back on the shelf; opened ones only go in the trash (toss)
  if (!toss && snackLeft < snackTotal) return;
  if (stockCarry.has(heldSnack) && !toss && aimCupboard && stockMine({ kind: "snack", ref: heldSnack }, aimCupboard)) { stockReturn.held = inv[invSel]; stockReturn(aimCupboard, true); return; }   // back on the cupboard shelf
  if (stockCarry.has(heldSnack)) { if (!toss) { toast("That's stock: E on an empty spot on the rack to put it out, or right-click the cupboard to put it back"); return; } stockCarry.delete(heldSnack); logAct(`Threw away a ${heldSnack.userData.snack.name} from stock`, "bad"); }
  else if (!toss) heldSnack.visible = true;   // (tossed: its spot on the rack stays empty until someone restocks it)
  heldSnack = null; snackGroup.visible = false; snackGroup.clear(); $("holdingTag").style.display = "none";
}
// ---- eating + drinking: E takes a bite / sip. Snacks get bites by size (volume,
// log-scaled: gum 2 ... a big chip bag 8); drinks get sips by type (always 5+).
// A finished item stays in your hand as its empty wrapper / can / bottle until
// you take it to the trash. (Its spot on the rack stays empty until restocked.)
let snackLeft = 0, snackTotal = 0, biteAnim = 0, biteGroup = null, biteDrink = false;
const isDrink = p => !!p.r;
function portions(p) {
  if (isDrink(p)) return p.shape === "bottle" ? (p.kind === "Water" ? 8 : 10) : p.shape === "longneck" ? 8 : 6;
  const vol = p.shape === "tube" ? Math.PI * (p.w / 2) ** 2 * p.h : p.w * p.h * p.d;
  return Math.max(2, Math.min(8, Math.round(2 + Math.log2(vol / 3e-5))));
}
const EMPTY = { bag: "bag", box: "box", bar: "wrapper", gum: "wrapper", tube: "tube", can: "can", bottle: "bottle", longneck: "bottle" };
function snackTag() {
  const p = heldSnack.userData.snack, drink = isDrink(p);
  $("holdingTag").style.display = "block";
  $("holdingName").textContent = snackLeft
    ? `${p.kind || "Snack"} — ${p.name} · ${snackLeft} ${drink ? "sip" : "bite"}${snackLeft === 1 ? "" : "s"} left · click to ${drink ? "drink" : "eat"}`
    : `Empty ${p.name} ${EMPTY[p.shape]} · take it to the trash`;
  invRender();
}
function consumeSnack() {
  if (!snackLeft) return;                    // finished: nothing left but the wrapper — trash it
  if (stockCarry.has(heldSnack)) { toast("That's stock: E on an empty spot on the rack to put it out"); return; }
  if (snackLeft === snackTotal && isDrink(heldSnack.userData.snack) && drinkTemp(heldSnack) > DRINK_WARM) toast(`Ugh. It's warm (${Math.round(drinkTemp(heldSnack))}°F)`);
  snackLeft--; biteAnim = 0.4; biteGroup = snackGroup; biteDrink = isDrink(heldSnack.userData.snack);
  if (heldSnack.userData.snack.kind === "Beer") drunk.gut += 1 / snackTotal;   // (see drunkTick)
  snackTag();
}

// ---------------- snack & drink stock ----------------
// Nothing on the racks refills itself. Backstock lives in the stock cupboards
// behind the counter (drinks / snacks): E on one hands you exactly what the
// racks are missing, up to what's in there and what you can carry. Carried
// stock can't be eaten; E on an empty spot on a rack puts one out. More is
// ordered on the register and arrives next morning as boxes by the entrance:
// carry them (up to 3) to a cupboard and E to unpack
const CASE_QTY = 12;
const stockCarry = new Set();                    // rack units you're carrying as stock (the unit is just its look: any empty spot of that product will take it)
const backstock = {};                            // product name -> count in the cupboards
const deliveries = [];                           // ordered, not here yet: { name, qty } | { tape: copyKey }
const boxes = [];                                // delivered, waiting by the door (or in your arms): { name, qty, mesh }
const boxCarry = [];
const stockProducts = () => {                    // every product on the racks, with its spots
  const m = new Map();
  for (const u of snackUnits()) { const p = u.userData.snack; let e = m.get(p.name); if (!e) m.set(p.name, e = { name: p.name, drink: isDrink(p), units: [] }); e.units.push(u); }
  return [...m.values()];
};
const caseCost = e => +((e.drink ? 0.6 : 0.45) * CASE_QTY).toFixed(2);   // wholesale: about half of what they sell for
function emptySpots() {                          // rack spots with nothing on them, that nobody's holding
  const busy = new Set([heldSnack, ...inv.filter(e => e.kind === "snack").map(e => e.ref), ...stockCarry, ...custs.flatMap(k => k.snacks), ...custs.map(k => k.snackUnit), ...staff.flatMap(e => e.restock ? [...e.restock.units, ...e.restock.got] : [])]);
  return snackUnits().filter(u => !u.visible && !busy.has(u));
}
function stockTake(kind) {                       // E on a stock cupboard
  const need = emptySpots().filter(u => isDrink(u.userData.snack) === (kind === "drinks"));
  if (!need.length) { if (!stockReturn(kind)) toast(`The ${kind === "drinks" ? "drink" : "snack"} racks are full`, true); return; }   // nothing to grab for: whatever you're carrying goes back
  let got = 0; const out = new Set();
  for (const u of need) {
    const name = u.userData.snack.name;
    if (!(backstock[name] > 0)) { out.add(name); continue; }
    if (!invMakeRoom()) break;
    backstock[name]--; stockCarry.add(u);
    showSnack(u); snackLeft = snackTotal = portions(u.userData.snack); snackTag(); invSync(); got++;
  }
  const full = got < need.length - out.size;
  toast(got ? `Grabbed ${got} to restock${kind === "drinks" ? " (room temperature: they'll need time to chill)" : ""}${full ? " (hands full: come back for the rest)" : ""}${out.size ? ` · out of ${[...out].slice(0, 2).join(", ")}${out.size > 2 ? "…" : ""}` : ""}` : `Out of stock: order more on the register`, !!got);
  if (out.size) logAct(`Stock cupboard's out of ${[...out].join(", ")}: order more on the register`, "bad");
}
function stockSlotIn(u) {                        // the spot in u's lane a carried item would go (back and bottom first), or null
  if (stockFor(u) < 0) return null;
  const free = new Set(emptySpots());
  return laneBack(snackLane(u), k => !k.visible && (free.has(k) || stockCarry.has(k))) || null;
}
function stockFor(u) {                           // a carried stock item that would go in this empty spot (in hand first)
  const name = u.userData.snack.name;
  if (heldSnack && stockCarry.has(heldSnack) && heldSnack.userData.snack.name === name) return invSel;
  return inv.findIndex(e => e.kind === "snack" && stockCarry.has(e.ref) && e.ref.userData.snack.name === name);
}
// carried stock back on the cupboard shelf (untouched only: an opened one's yours now). onlyHeld: just the one in hand.
// Its rack spot goes back to being an empty spot. -> how many went back
const stockMine = (e, kind) => e.kind === "snack" && stockCarry.has(e.ref) && isDrink(e.ref.userData.snack) === (kind === "drinks");
function stockReturn(kind, onlyHeld = false) {
  invSync(); invStash();                         // hand empty first: everything's an inventory entry with its bites counted
  const back = {};
  for (let i = inv.length - 1; i >= 0; i--) {
    const e = inv[i]; if (!stockMine(e, kind) || e.left < e.total || (onlyHeld && e !== stockReturn.held)) continue;
    const name = e.ref.userData.snack.name;
    stockCarry.delete(e.ref); backstock[name] = (backstock[name] || 0) + 1; back[name] = (back[name] || 0) + 1;
    inv.splice(i, 1);
  }
  stockReturn.held = null; invRender();
  const n = Object.values(back).reduce((a, b) => a + b, 0);
  if (n) toast(`Put back ${n === 1 ? `a ${Object.keys(back)[0]}` : `${n} items`} in the ${kind === "drinks" ? "drink" : "snack"} cupboard`, true);
  return n;
}
function stockPlace(u) {                         // E on an empty spot: out it goes
  const own = inv.findIndex(e => e.ref === u && stockCarry.has(u));   // the one you took for this very spot, if you've got it
  const i = own >= 0 ? own : stockFor(u); if (i < 0) return;
  gainXp("you", "str", 2);
  const e = inv[i]; stockCarry.delete(e.ref);
  if (i === invSel) { heldSnack = null; snackGroup.visible = false; snackGroup.clear(); $("holdingTag").style.display = "none"; invSync(); }
  else { inv.splice(i, 1); if (i < invSel) invSel--; invRender(); }
  u.visible = true; stockPlace.n = (stockPlace.n || 0) + 1;
  if (isDrink(u.userData.snack)) u.userData.temp = ROOM_F;   // straight from the cupboard: it'll need a while in the cooler
  shiftScore(3, "you");
  if (![...stockCarry].length) { logAct(`Restocked ${stockPlace.n} item${stockPlace.n > 1 ? "s" : ""} on the racks`, "good", null, 3 * stockPlace.n); stockPlace.n = 0; }
}
function stockOrder(name, cases) { deliveries.push({ name, qty: cases * CASE_QTY }); logAct(`Ordered ${cases} case${cases > 1 ? "s" : ""} of ${name}: arrives tomorrow morning`); }
const BOX_AT = i => ({ x: -1.5 + (i % 2) * 0.5, z: 0.75 + Math.floor(i / 2) % 5 * 0.5, y: Math.floor(i / 10) * 0.36 });   // just inside the doors, beside the lane
function boxMake(b) {                            // a brown carton, taped, with a label
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.34, 0.34), boxMat); g.add(box);
  const tape = new THREE.Mesh(new THREE.BoxGeometry(0.445, 0.005, 0.06), boxTapeMat); tape.position.y = 0.171; g.add(tape);
  const lbl = textPlane(`${b.name.toUpperCase()} \u00d7${b.qty}`, 0.36, 0.08, "#222", "#f2eee2", "Arial", 60);
  lbl.material = new THREE.MeshLambertMaterial({ map: lbl.material.map }); lbl.position.set(0, 0.02, 0.171); g.add(lbl);
  g.traverse(m => { if (m.isMesh) { m.userData.box = b; aimables.push(m); } });
  b.mesh = g; return g;
}
const boxMat = new THREE.MeshLambertMaterial({ color: 0xa87a4a }), boxTapeMat = new THREE.MeshLambertMaterial({ color: 0xc9a86a });
function boxesLayout() {                         // stacked by the door, solid (you and customers go round them)
  for (const b of boxes) if (b.col) { colliders.splice(colliders.indexOf(b.col), 1); b.col = null; }
  boxes.filter(b => !boxCarry.includes(b)).forEach((b, i) => {
    const a = BOX_AT(i); b.mesh.position.set(a.x, 0.17 + a.y, a.z); b.mesh.rotation.set(0, 0.1 * (i % 3 - 1), 0); if (b.mesh.parent !== scene) scene.add(b.mesh);
    if (!a.y) { b.col = { x0: a.x - 0.25, x1: a.x + 0.25, z0: a.z - 0.2, z1: a.z + 0.2 }; colliders.push(b.col); }
  });
}
function boxDeliver() {                          // morning: yesterday's orders are by the door
  const tapes = deliveries.filter(d => d.tape).map(d => copyByKey(d.tape)).filter(Boolean);
  for (const d of deliveries.filter(d => d.name)) { const b = { name: d.name, qty: d.qty }; boxes.push(b); boxMake(b); }
  const nb = deliveries.filter(d => d.name).length, lib = deliveries.find(d => d.lib);
  if (lib) { const n = libUnlock(lib.lib); growth.pending += 4; logAct(`Library upgrade ${lib.lib} came in overnight: ${n} tapes on the shelves`, "good"); }   // (and a bigger library draws new members)
  deliveries.length = 0; boxesLayout();
  for (const c of tapes) { setOnShelf(c, false); returnBin.push(c); } if (tapes.length) refreshReturnsBin();
  if (nb) logAct(`Delivery: ${nb} box${nb > 1 ? "es" : ""} by the front door`);
  if (tapes.length) logAct(`Delivery: ${tapes.length} replacement tape${tapes.length > 1 ? "s" : ""} in the returns bin`);
}
const boxHand = new THREE.Group();
function boxPick(b) {                            // E on a box: into your arms (up to 3, stacked)
  const most = Math.min(6, 3 + Math.floor((lv("you", "str") - 1) / 3)) + (has("you", "str", 10) ? 2 : 0);   // (STR: more boxes at once; Pack Mule)
  if (boxCarry.length >= most) { toast("That's all you can carry"); return; }
  boxCarry.push(b); b.mesh.traverse(m => { const i = aimables.indexOf(m); if (i >= 0) aimables.splice(i, 1); });
  if (!boxHand.parent) camera.add(boxHand);
  boxHand.add(b.mesh); boxHand.position.set(0.3, -0.52, -0.8); boxHand.scale.setScalar(0.75);   // carried low and to the side
  boxCarry.forEach((k, i) => { k.mesh.position.set(0, i * 0.34, 0); k.mesh.rotation.set(0, 0, 0); });
  boxesLayout();
}
function boxUnpack() {                           // E on a stock cupboard with boxes in your arms
  for (const b of boxCarry) { backstock[b.name] = (backstock[b.name] || 0) + b.qty; boxHand.remove(b.mesh); boxes.splice(boxes.indexOf(b), 1); }
  logAct(`Unpacked ${boxCarry.map(b => `${b.name} \u00d7${b.qty}`).join(", ")} into the stock cupboards`, "good");
  shiftScore(5 * boxCarry.length, "you"); gainXp("you", "str", 6 * boxCarry.length); boxCarry.length = 0;
}

// ---- drink temperature: each drink on the rack follows the cooler's air, slowly.
// Fresh stock goes in warm; a door left open warms everything. A customer who
// grabs one over 45°F isn't happy about it ----
const DRINK_WARM = 45, ROOM_F = 70;
const drinkTemp = u => u.userData.temp ?? 36;
let drinkUnits = null;
function drinkTempTick(dt) {
  if ((drinkTempTick.t = (drinkTempTick.t || 0) + dt) < 0.5) return;
  const step = drinkTempTick.t; drinkTempTick.t = 0;
  const air = coolerThermo.temp, k = Math.min(1, step / 150);   // a can takes a few minutes to follow the air
  for (const u of drinkUnits ||= snackUnits().filter(u => isDrink(u.userData.snack))) if (u.visible) u.userData.temp = drinkTemp(u) + (air - drinkTemp(u)) * k;
  if (air > 42 && !drinkTempTick.warned) { drinkTempTick.warned = true; logAct(`The cooler's warming up: ${Math.round(air)}°F${coolerOpen ? ", and the door's open" : ""}`, "bad"); }
  else if (air < 38) drinkTempTick.warned = false;
}
function custWarmDrink(cust, u) {
  shiftScore(-10); posTerm.loyal(cust.member, -3); cust.c.setMood("meh"); cust.hi = 1.8;
  logAct(`${memberName(cust.member)} grabbed a warm ${u.userData.snack.name} (${Math.round(drinkTemp(u))}°F)`, "bad", null, -10);
}

// ---------------- the build-up (simulation): what the store has so far ----------------
function amenities() {
  rewinderOn(rewinders[1], owned("rewinder2"));
  for (const rw of rewinders) rewinderKit.model(rw, owned("rewinders"));
  if (jobBoardMesh) {                              // Dana's job board: only once there's a Dana
    const on = staff.length > 0;
    if (jobBoardMesh.g.visible !== on) {
      jobBoardMesh.g.visible = on;
      for (const m of jobBoardMesh.parts) { const i = aimables.indexOf(m); if (on && i < 0) aimables.push(m); if (!on && i >= 0) aimables.splice(i, 1); }
    }
  }
  const hall = doors.find(d => d.push && !d.alongX);   // the hall -> lobby door: the theater's way in
  const open = owned("theater");
  if (hall && hall.locked !== !open) {
    hall.locked = !open;
    if (!open) colliders.push(hall.shut); else { const i = colliders.indexOf(hall.shut); if (i >= 0) colliders.splice(i, 1); }
    custSpots = custSnackSpots = null;           // the lobby's reachable (or not) now
    for (const z of ["lobby", "theater"]) if (zoneOn[z] !== open) setZone(z, open);   // dark through the porthole till it opens
  }
  if (!open && !theaterSign && hall) {           // chained shut, a sign on both faces
    theaterSign = new THREE.Group(); scene.add(theaterSign);
    for (const f of [1, -1]) {
      const t = textPlane("THEATER \u00b7 COMING SOON", 0.62, 0.16, "#ffd400", "#3a0d12", "Arial Black", 60);
      t.material = new THREE.MeshLambertMaterial({ map: t.material.map }); t.position.set(hall.at + f * 0.07, 1.5, hall.c); t.rotation.y = f * Math.PI / 2; theaterSign.add(t);
    }
  } else if (open && theaterSign) { theaterSign.removeFromParent(); theaterSign = null; }   // (removeFromParent: roomSort may have filed it into a room group)
  if (popcornMachine) {
    const on = owned("popcorn");
    if (popcornMachine.g.visible !== on) {
      popcornMachine.g.visible = on;
      for (const c of popcornMachine.cols) { const i = colliders.indexOf(c); if (on && i < 0) colliders.push(c); if (!on && i >= 0) colliders.splice(i, 1); }
    }
  }
}
function libLock() {                             // sections you haven't bought come off the shelves
  for (const t of catalog) for (const c of [t, ...(t.copies || [])]) {
    if (!libLocked(c)) continue;
    c.libLocked = true;
    if (c.rental) { posTerm.cancel(c); const i = rentedCopies.indexOf(c); if (i >= 0) rentedCopies.splice(i, 1); }   // (a new store's opening rentals don't include them)
    if (!c.offShelf) setOnShelf(c, false);
  }
  signsRefresh();
}
function libUnlock(tier) {                       // -> tapes put out
  let n = 0;
  for (const t of catalog) for (const c of [t, ...(t.copies || [])]) {
    if (!LIBRARY[tier - 1].cats.includes(c.category) || !c.libLocked) continue;
    c.libLocked = false; if (!c.lost && !c.rental) { setOnShelf(c, true); n++; }
  }
  upg.library = tier; custSpots = null; signsRefresh();
  return n;
}

