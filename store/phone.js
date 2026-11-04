// ---------------- the phone: "do you have ... in?" ----------------
// Every couple of hours it rings. Answer (E) and a member asks after a title:
// 1 — yes, you'll hold one for them; 2 — sorry, all out. Promise a hold and a
// copy had better be on the holds shelf (E with it in hand) by the time they
// come in for it. Customers in the store come first: a call you miss while
// you're with someone costs nothing (they'll call back), but pick up while
// someone's waiting at the counter and they notice. Dana takes calls too, but
// only when nobody in the store needs her
const phone = { next: SAVE?.phone?.next ?? null, ring: null, call: null, out: null };   // next: the game hour of the next call; out: a call you're making (see post-its)
const holds = [];                                // promised holds: { member, title, at (game hour they come in), day, copy (on the shelf) | null, by, alert }
const holdAlertFor = copy => holds.find(h => h.alert && !h.copy && h.title === titleOfCopy(copy));   // a POS alert on a promised hold: the next return of it goes on the holds shelf
const storeBusy = () => !!(co || custWaiting() || custLine.length || custAsks.some(k => k.state === "asking"));   // somebody in the store needs serving
let ringOut = null;
function heardFrom(x, z, falloff = true) {      // how loud a sound out on the sales floor is where you are: the whole floor hears it (fainter
  const room = player.z < STORE.z ? 1 : player.z < BOH.hallZ && player.x > BOH.x0 && player.x < CLOSET.x0 ? 0.4 : 0;   // with distance), the hall a little through the doorway, the back rooms not at all
  if (!falloff || !room) return room;              // (falloff off: the caller's sound already fades with distance, it just needs the walls)
  return room * Math.max(0.15, 1 / (1 + (Math.hypot(player.x - x, player.z - z) / 8) ** 2));
}
const ringHeard = () => heardFrom(PHONE_AT.x, PHONE_AT.z);
function ringBurst() {                            // a desk-set ringer: a clapper buzzing between two small gongs ~20 times a second for 2 s
  try {                                           // (lowpassed and not too loud: a real bell, but across the room and not in your ear)
    const ac = StoreAudio.ctx(), t = ac.currentTime + 0.02, out = ringOut = ac.createGain(), lp = ac.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 3200; out.gain.value = 0.09 * ringHeard(); out.connect(lp).connect(sfxOut(ac));
    [[1180, 0], [1390, 0.025]].forEach(([f, off]) => {   // the two gongs, struck alternately
      for (const [r, a] of [[1, 1], [2.32, 0.35], [4.1, 0.12]]) {
        const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f * r; o.connect(g).connect(out);
        g.gain.setValueAtTime(0, t);
        for (let s = t + off; s < t + 2; s += 0.05) { const env = Math.min(1, (s - t) / 0.08, (t + 2 - s) / 0.15); g.gain.setValueAtTime(a * env, s); g.gain.setTargetAtTime(a * env * 0.25, s, 0.012); }
        g.gain.setTargetAtTime(0, t + 2, 0.08); o.start(t); o.stop(t + 2.6);
      }
    });
  } catch {}
}
// the other calls a video store gets. q: what they say; a: the two answers; right: which one's right (null: either's fine).
// answer(c, key, Who) does the rest. Street dates are the movies' VHS releases (roughly): "is it out yet?" only once it's
// been in theaters, and only until it's out
const NOT_YET = [["Twister", "1996-05-10", "1996-10-01"], ["Mission: Impossible", "1996-05-22", "1996-11-12"], ["Independence Day", "1996-07-02", "1996-11-22"],
  ["Jerry Maguire", "1996-12-13", "1997-08-26"], ["Men in Black", "1997-07-02", "1997-11-25"], ["Titanic", "1997-12-19", "1998-09-01"]];
const PRANKS = ["Uh, yeah, do you have <b>Free Willy</b>?|Then you better go free him! <i>*click*</i>", "Is your refrigerator running?|Then you better go catch it! <i>*click*</i>",
  "Do you have <b>Lethal Weapon</b>?|Freeze! FBI! <i>*giggling, click*</i>"];
const roughDay = () => shift.stats.walkouts >= 2 || shift.stats.stolen > 0;
const CALLS = {
  hours: { q: () => "What time do you close tonight?", a: ["Midnight", "Ten o'clock"], right: 1 },
  notyet: { q: c => `Is <b>${c.film[0]}</b> out on tape yet?`, a: c => [`Not till ${new Date(c.film[2] + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}: I'll put you on the list`, "Yep, come on down"], right: 1 },
  prank: { q: c => c.prank.split("|")[0], a: ["Yes, we do", "Hang up"], right: null,
    answer: (c, key, Who) => logAct(key === 1 ? `Prank call. ${c.prank.split("|")[1].replace(/<[^>]+>/g, "")}` : `${Who} hung up on a prank caller`) },
  fee: { q: c => `About this ${money(posTerm.owed(c.member))} late fee: I dropped that tape off on time!`, a: ["I'll take it off this once", "Sorry, the fee stands"], right: null,
    answer(c, key, Who) {
      const name = memberName(c.member), owed = posTerm.owed(c.member);
      if (key === 1) { shift.stats.feesWaived += owed; posTerm.settle(c.member, false); posTerm.loyal(c.member, 4); logAct(`${Who} waived ${name}'s ${money(owed)} late fee over the phone`); }
      else { posTerm.loyal(c.member, -3); logAct(`${Who} told ${name} the ${money(owed)} late fee stands`); }
    } },
  dennis: { who: "DENNIS · DISTRICT", q: () => "Dennis, from district. Just checking in: how's today going over there?", a: ["Going great", "Bit of a rough one"], right: () => roughDay() ? 2 : 1 },
};
const callRight = c => { const r = CALLS[c.kind]?.right; return typeof r === "function" ? r(c) : r; };
function phoneCaller() {                          // mostly a member asking after a title; now and then one of the CALLS
  if (Math.random() < 0.35) {
    const d = shiftDate(), film = NOT_YET.find(([, th, st]) => d >= new Date(th) && d < new Date(st)), owing = posTerm.members.filter(m => m.active && posTerm.owed(m) > 0);
    const kinds = ["hours", "prank", ...(film ? ["notyet"] : []), ...(owing.length ? ["fee"] : []), ...(phone.dennis !== shift.day && shift.h > 15 ? ["dennis"] : [])];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const pickM = ms => ms[Math.floor(Math.random() * ms.length)];
    if (kind === "dennis") phone.dennis = shift.day;
    return { kind, film, prank: pickM(PRANKS), member: kind === "fee" ? pickM(owing) : kind === "dennis" ? null : pickM(posTerm.members.filter(m => m.active)) };
  }
  const ms = posTerm.members.filter(m => m.active !== false && posTerm.canVisit(m) && !custs.some(k => k.member === m) && !holds.some(h => h.member === m));
  const m = ms[Math.floor(Math.random() * ms.length)]; if (!m) return null;
  const cats = customerFor(Math.imul(m.num, 2654435761) >>> 0, m.female).persona.taste.cats;
  const pool = catalog.filter(t => t.pos && !t.libLocked && (!cats.length || cats.includes(t.category)));
  const inNow = pool.filter(onShelfCopy), out = pool.filter(t => !onShelfCopy(t));
  const from = Math.random() < 0.65 || !out.length ? inNow : out;
  return from.length ? { member: m, title: from[Math.floor(Math.random() * from.length)] } : null;
}
function phoneTick(dt) {                          // (runs with the clock)
  if (phone.next == null) phone.next = Math.max(shift.h, SHIFT.open) + 1 + Math.random() * 1.5;
  phoneOutTick(dt);
  if (!phone.ring && !phone.call && !phone.out && shiftOpen() && shift.h >= phone.next) {
    phone.next = shift.h + 2 + Math.random() * 1.5;   // semi-infrequent: every two to three and a half hours
    const c = phoneCaller(); if (c) { phone.ring = { ...c, t: 0, rang: 0 }; logAct("The phone's ringing (behind the counter)"); }
  }
  const r = phone.ring; if (!r) { phoneCallTick(dt); return; }
  r.t += dt;
  if (r.t >= r.rang) { r.rang += 6; ringBurst(); }   // US cadence: 2 s on, 4 s off
  if (ringOut) ringOut.gain.setTargetAtTime(0.09 * ringHeard(), ringOut.context.currentTime, 0.1);   // walk away mid-ring and it fades
  const taker = r.t > 6 && staff.find(e => e.c && e.state === "post" && co?.emp !== e && e.t <= 0 && withEmp(e, danaBestJob) === "phone");
  if (taker) return withEmp(taker, danaCall);   // top of someone's list right now: they get it
  if (r.t > 20) {                                 // rang out
    phone.ring = null;
    const from = r.member ? memberName(r.member) : "Dennis at district";
    posTerm.message(`${fmtClock(shift.h)} MISSED CALL - ${r.member ? `${from} #${r.member.num} (${r.member.phone})` : from}${r.kind === "fee" ? " RE: LATE FEE" : r.title ? ` RE: ${r.title.title}` : ""}`);
    if (storeBusy()) { logAct(`Missed a call from ${from} while you were with customers: they'll call back`); phone.next = shift.h + 0.4 + Math.random() * 0.4; }
    else { shiftScore(-10); if (r.member) posTerm.loyal(r.member, -2); logAct(`Missed a call from ${from}`, "bad", null, -10); }
  }
}
function phoneAnswer() {                          // E on the phone while it's ringing
  const r = phone.ring; if (!r) return;
  gainXp("you", "cha", 4);
  phone.ring = null;
  const waiting = [custWaiting(), ...custAsks.filter(k => k.state === "asking")].filter(Boolean);
  if (waiting.length) {                           // they're standing right there
    for (const k of waiting) { k.t -= 10; posTerm.loyal(k.member, -2); k.c.setMood("impatient"); k.hi = 2; }
    logAct(`Picked up the phone with ${waiting.length === 1 ? "a customer" : waiting.length + " customers"} waiting at the counter`, "bad");
  }
  phone.call = { ...r, t: 30 };
  callHud();
}
function phoneCallTick(dt) {
  const c = phone.call; if (!c) return;
  if ((c.t -= dt) <= 0) { phone.call = null; callHud(); shiftScore(-5); logAct(`${c.member ? memberName(c.member) : "Dennis"} got tired of waiting on the line and hung up`, "bad", null, -5); }
}
function callAnswer(key, by = "you") {            // 1: yes, I'll hold one · 2: sorry, all out
  const c = phone.call; if (!c) return;
  phone.call = null; callHud();
  const Who = by === "dana" ? emp.first : "You";
  if (c.kind) {                                   // one of the CALLS
    const K = CALLS[c.kind], right = callRight(c);
    if (K.answer) return K.answer(c, key, Who);
    const said = (typeof K.a === "function" ? K.a(c) : K.a)[key - 1], who = c.member ? memberName(c.member) : "Dennis";
    if (key === right) { shiftScore(5, by); if (c.member) posTerm.loyal(c.member, 1); logAct(`${Who} told ${who}: "${said}"`, "", null, 5); }
    else { shiftScore(-10, by); if (c.member) posTerm.loyal(c.member, -3); logAct(`${Who} told ${who}: "${said}". Not quite right`, "bad", null, -10); }
    return;
  }
  const name = memberName(c.member), inNow = !!onShelfCopy(c.title);
  if (key === 1) {
    const at = Math.min(SHIFT.lastIn - 0.1, shift.h + 1 + Math.random() * 1.2);
    holds.push({ member: c.member, title: c.title, at, day: shift.day, copy: null, by });
    logAct(`${Who} told ${name} there's a copy of ${tapeName(c.title)} on hold for them: they'll be in around ${fmtClock(at)}${by === "you" ? ". Put a copy on the holds shelf" : ""}`);
    return holds[holds.length - 1];
  }
  if (inNow) { shiftScore(-10, by); posTerm.loyal(c.member, -3); logAct(`${Who} told ${name} ${tapeName(c.title)} was all out, but there's one on the shelf`, "bad", null, -10); }
  else { shiftScore(10, by); posTerm.loyal(c.member, 1); logAct(`${Who} told ${name} ${tapeName(c.title)} is all out`, "", null, 10); }
}
function callHud() {
  const el = $("callPanel"), c = phone.call; if (!c) { el.style.display = "none"; return; }
  if (c.kind) {
    const K = CALLS[c.kind], a = typeof K.a === "function" ? K.a(c) : K.a;
    el.innerHTML = `<div class="h">ON THE PHONE · ${K.who || (c.member ? `${memberName(c.member)} #${c.member.num}` : "UNKNOWN CALLER")}</div><div class="q">“${K.q(c)}”</div>` +
      a.map((x, i) => `<span><b>${i + 1}</b> ${x}</span>`).join("");
    el.style.display = "block"; return;
  }
  el.innerHTML = `<div class="h">ON THE PHONE \u00b7 ${memberName(c.member)} #${c.member.num}</div><div class="q">\u201cHi, do you have <b>${tapeName(c.title)}</b> in?\u201d <span class="cat">(${c.title.category})</span></div>` +
    `<span><b>1</b> Yes, I'll hold one for you</span><span><b>2</b> Sorry, we're all out</span>`;
  el.style.display = "block";
}

// ---------------- post-its by the phone: the overdue calls ----------------
// Look up an overdue member on the register (the message center) and it goes down on a post-it, stuck on the cabinet
// by the phone. E on one makes the call (the phone's own line: while you're on it, nobody else gets through); what
// came of it is written on the note, and on their record. Hold E to peel one off; a wastebasket takes it.
// Who picks up depends on when you ring: working people aren't home on a weekday afternoon (the machine gets it),
// weekend mornings people sleep in, and the later in the evening the less they like it. Past their bedtime you'll
// wake them, and they'll let you know
const postits = [];                               // { m (member), result: null | what came of it, at: the hour it was written, mesh }
let postitHeld = null;                            // the one you've peeled off
const POSTIT_W = 0.076;
const postitSpot = i => ({ x: -6.22 + (i % 8 % 4) * 0.09, z: PHONE_AT.z - 0.075 + Math.floor(i % 8 / 4) * 0.15, y: PHONE_AT.y - 0.0785 + Math.floor(i / 8) * 0.0015 });   // two rows of four by the phone, then on top
function postitDraw(n) {                          // handwritten, on the yellow square
  const c = n.cv ||= Object.assign(document.createElement("canvas"), { width: 256, height: 256 }), g = c.getContext("2d");
  g.fillStyle = "#ffea6e"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#f3d750"; g.fillRect(0, 0, 256, 26);                       // the sticky strip
  const hand = px => `${px}px "Bradley Hand", "Segoe Print", "Comic Sans MS", cursive`;
  g.fillStyle = "#1b2f8c"; g.textBaseline = "top";
  g.font = hand(30); g.fillText("CALL:", 14, 34);
  g.font = hand(32); g.fillText(memberName(n.m), 14, 70, 228);
  g.font = hand(28); g.fillText(n.m.phone, 14, 108);
  g.font = hand(22); g.fillText(posTerm.lateSummary(n.m).toLowerCase() || "tape's back!", 14, 144, 228);
  if (n.result) {
    g.fillStyle = "#b3261e"; g.font = hand(20);
    const words = n.result.split(" "), lines = [""];
    for (const w of words) { const t = (lines.at(-1) + " " + w).trim(); if (g.measureText(t).width > 228) lines.push(w); else lines[lines.length - 1] = t; }
    lines.slice(0, 3).forEach((l, k) => g.fillText(l, 14, 178 + k * 24));
    g.strokeStyle = "#b3261e"; g.lineWidth = 3; g.beginPath(); g.moveTo(12, 64); g.lineTo(240, 60); g.stroke();   // crossed off
  }
  if (n.tex) n.tex.needsUpdate = true;
}
function postitMesh(n) {
  postitDraw(n);
  n.tex = new THREE.CanvasTexture(n.cv); n.tex.colorSpace = THREE.SRGBColorSpace; n.tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  n.mesh = new THREE.Mesh(new THREE.PlaneGeometry(POSTIT_W, POSTIT_W), new THREE.MeshLambertMaterial({ map: n.tex }));
  n.mesh.userData.postit = n; aimables.push(n.mesh); scene.add(n.mesh);
  n.rz = n.rz ?? (Math.random() - 0.5) * 0.25;
}
function postitsLayout() {                       // stuck down flat on the cabinet top, read from where you stand
  postits.filter(n => n !== postitHeld).forEach((n, i) => {
    const p = postitSpot(i); if (n.mesh.parent !== scene) scene.add(n.mesh);
    n.mesh.position.set(p.x, p.y, p.z); n.mesh.rotation.set(-Math.PI / 2, 0, n.rz); n.mesh.scale.setScalar(1);
  });
}
function postitAdd(m, quiet = false) {            // the register: an overdue call looked up -> a note by the phone (one per member)
  if (postits.some(n => n.m === m)) return null;
  const n = { m, result: null, at: shift.h }; postitMesh(n); postits.push(n); postitsLayout();
  if (!quiet) logAct(`Jotted down a post-it to call ${memberName(m)} (${m.phone}): it's by the phone`);
  return n;
}
function postitPickUp(n) {                        // hold E: peeled off, in your hand
  postitHeld = n; n.mesh.removeFromParent(); camera.add(n.mesh);
  n.mesh.position.set(0.17, -0.15, -0.38); n.mesh.rotation.set(-0.35, 0.15, 0.08); n.mesh.scale.setScalar(1.15);
  const i = aimables.indexOf(n.mesh); if (i >= 0) aimables.splice(i, 1);
  postitsLayout();
  toast("Peeled off the post-it · E on a wastebasket to toss it · right-click to stick it back", true);
}
function postitPutBack() {                        // stuck back down by the phone
  const n = postitHeld; if (!n) return; postitHeld = null;
  n.mesh.removeFromParent(); aimables.push(n.mesh); postitsLayout();
}
function postitToss(bin) {                        // into a wastebasket
  const n = postitHeld; if (!n) return; postitHeld = null;
  n.mesh.removeFromParent(); n.mesh.geometry.dispose(); n.mesh.material.dispose(); n.tex.dispose();
  postits.splice(postits.indexOf(n), 1); postitsLayout();
  trashAdd(bin, 1); toast(`Tossed the post-it for ${memberName(n.m)}`, true);
}
// how a member's day goes (from their member #, so the same person keeps the same habits)
function memberHabits(m) {
  const r = k => (Math.imul(m.num + k * 7919, 2654435761) >>> 0) / 4294967296;
  return { works: r(1) < 0.68, nightOwl: r(2) < 0.15, sleepsIn: r(3) < 0.55 };
}
// -> { pick: "machine" | "noanswer" | "answer", mood: "ok" | "annoyed" | "angry", woke, why } for a call made right now
function callOutcome(m, h = shift.h, day = weekday()) {
  const H = h, hab = memberHabits(m), weekend = day === 0 || day === 6, R = Math.random;
  const bed = hab.nightOwl ? 25 : day === 5 || day === 6 ? 23.5 : 22.5;      // lights out (Friday and Saturday nights, a bit later)
  let home = 0.85;
  if (!weekend && hab.works && H >= 8.5 && H < 17.5) home = 0.1;             // at work
  else if (!weekend && H >= 17.5 && H < 18.5) home = 0.55;                    // on the way home
  else if (weekend && H >= 11.5 && H < 18) home = 0.45;                       // out doing weekend things
  if (R() > home) return { pick: R() < 0.85 ? "machine" : "noanswer", why: !weekend && hab.works && H < 17.5 ? "work" : "out" };
  const asleep = H >= bed ? 0.85 : H >= bed - 0.75 ? 0.3 : weekend && hab.sleepsIn && H < 10.5 ? 0.7 : weekend && hab.sleepsIn && H < 11.5 ? 0.3 : 0;
  if (R() < asleep) {                             // you woke them up
    if (R() < 0.4) return { pick: R() < 0.7 ? "machine" : "noanswer", why: "asleep" };   // (slept through it)
    const late = H >= bed - 0.75;
    return { pick: "answer", woke: true, mood: late ? (H >= bed + 0.5 || R() < 0.6 ? "angry" : "annoyed") : R() < 0.75 ? "annoyed" : "ok", why: late ? "night" : "morning" };
  }
  const evening = H >= bed - 1.5, dinner = H >= 17.75 && H < 19;
  return { pick: "answer", mood: evening ? (R() < 0.55 ? "annoyed" : "ok") : dinner && R() < 0.25 ? "annoyed" : "ok", why: evening ? "late" : dinner ? "dinner" : "" };
}
const CALL_SAY = {
  ok: ["It's in the car: I'll drop it off.", "Oh no, I thought I'd returned that! I'll look for it.", "Sorry! I'll bring it in.", "The kid hid it in the toy box. I'll bring it by."],
  okNo: ["Yeah, yeah. I'll get to it.", "Huh. I'll have to look for it.", "Is that still out? Weird."],
  late: ["It's kind of late to be calling... fine, I'll bring it in.", "We were just going to bed. Yes, I'll return it."],
  dinner: ["We're eating dinner. I'll bring it in, okay?", "Can this wait? We're in the middle of dinner."],
  morning: ["Mmf... it's Saturday morning... yeah, okay. Later.", "You woke me up. I'll bring it in. Bye."],
  night: ["Do you know what time it is?! <i>*click*</i>", "It's the middle of the night! Don't call here this late! <i>*click*</i>"],
};
const pickOne = a => a[Math.floor(Math.random() * a.length)];
function postitCall(n) {                          // E on a post-it: dial
  const m = n.m;
  if (phone.ring) return toast("The phone's ringing: answer it first");
  if (phone.call || phone.out) return toast("You're already on the phone");
  if (!posTerm.needsCall(m)) { if (!n.result) { n.result = "TAPE CAME BACK. NO NEED TO CALL"; postitDraw(n); } return toast(`${memberName(m)}'s not overdue anymore: hold E to peel it off and toss it`); }
  if (posTerm.calledToday(m)) return toast(`You've already called ${memberName(m)} today: try again tomorrow`);
  const o = callOutcome(m);
  phone.out = { n, m, o, t: 0, rings: o.pick === "answer" ? 1 + Math.floor(Math.random() * 3) : o.pick === "machine" ? 3 : 5, said: null };
  callOutHud();
}
function phoneOutTick(dt) {                        // ringing out, then whoever (or whatever) picks up
  const c = phone.out; if (!c) return;
  if (c.said) { if ((c.t -= dt) <= 0) { phone.out = null; callOutHud(); } return; }   // what they said stays up a moment
  if (Math.floor(c.t / 3) !== Math.floor((c.t + dt) / 3) || c.t === 0) ringBack();   // US ringback: 2 s on, 4 s off (heard every 3 s here: it's quick)
  c.t += dt;
  if (c.t < c.rings * 3) return;
  const { m, o, n } = c, name = memberName(m), loy = (m.loyalty || 0) / 250, at = fmtClock(shift.h);
  let promise = false, say, note, kind = "";
  if (o.pick === "noanswer") { say = "<i>It rings and rings. Nobody's home, and no machine.</i>"; note = "NO ANSWER"; }
  else if (o.pick === "machine") { promise = Math.random() < 0.25; say = `<i>“Hi, you've reached the ${m.last[0]}${m.last.slice(1).toLowerCase()}s. Leave a message at the beep.”</i> You leave one.`; note = "MACHINE. LEFT A MESSAGE"; }
  else if (o.mood === "angry") {
    promise = Math.random() < 0.1; say = `“${pickOne(CALL_SAY.night)}”`; note = o.woke ? "WOKE THEM UP. HUNG UP ON ME" : "HUNG UP ON ME";
    posTerm.loyal(m, -15); shiftScore(-15, "you"); kind = "bad";
  } else if (o.mood === "annoyed") {
    promise = Math.random() < 0.45 + loy; posTerm.loyal(m, -6); kind = "bad";
    say = `“${pickOne(CALL_SAY[o.why] || CALL_SAY.late)}”`; note = `${o.woke ? "WOKE THEM. " : ""}ANNOYED. ${promise ? "SAYS THEY'LL BRING IT" : "NO PROMISES"}`;
  } else {
    promise = Math.random() < 0.8 + loy; posTerm.loyal(m, 1);
    say = `“${pickOne(promise ? CALL_SAY.ok : CALL_SAY.okNo)}”`; note = promise ? "SPOKE TO THEM. BRINGING IT IN" : "SPOKE TO THEM. NO PROMISES";
  }
  n.result = `${at} - ${note}`; postitDraw(n);
  posTerm.recordCall(m, { promise, result: `${at} ${note}` });
  gainXp("you", "cha", 6);
  if (!promise) logAct(`Called ${name} about their overdue tape: ${note.toLowerCase()}`, kind, null, kind ? (o.mood === "angry" ? -15 : null) : null);
  c.said = say; c.t = 4.5; callOutHud();
}
function ringBack() {                             // the ringback tone in the handset: 440 + 480 Hz, quietly
  try {
    const ac = StoreAudio.ctx(), t = ac.currentTime + 0.02, out = ac.createGain(); out.gain.value = 0.025; out.connect(sfxOut(ac));
    for (const f of [440, 480]) { const o = ac.createOscillator(); o.frequency.value = f; o.connect(out); o.start(t); o.stop(t + 1.6); }
    out.gain.setValueAtTime(0.025, t + 1.5); out.gain.linearRampToValueAtTime(0, t + 1.6);
  } catch {}
}
function callOutHud() {
  const el = $("callPanel"), c = phone.out;
  if (!c) { if (!phone.call) el.style.display = "none"; return; }
  el.innerHTML = `<div class="h">CALLING · ${memberName(c.m)} #${c.m.num} · ${c.m.phone}</div>` +
    (c.said ? `<div class="q">${c.said}</div>` : `<div class="q"><i>Ringing…</i> <span class="cat">(${posTerm.lateSummary(c.m).toLowerCase()})</span></div>`);
  el.style.display = "block";
}
function holdPull() {                            // E on the holds shelf, hands free: take down the one someone's at the counter for
  const k = custAsks.find(k => k.state === "asking" && k.want.kind === "hold" && k.want.hold.copy);
  const h = k?.want.hold; if (!h) { toast("Those are for customers who come in for them"); return; }
  if (!invMakeRoom()) { toast("Hands full"); return; }
  const t = h.copy; h.copy = null; h.pulled = t; holdsRender(); showTape(t);
}
function holdPlace(tape) {                        // E on the holds shelf with a tape in hand
  const h = holds.find(h => !h.copy && titleOfCopy(tape) === h.title);
  if (!h) { toast("Nobody's asked for that one to be held"); return; }
  tape.fromReturns = tape.strayFix = false; releaseFromHand(); invSync();
  h.copy = tape; holdsRender(); shiftScore(15, "you"); gainXp("you", "int", 5);
  logAct(`Put ${tape.title} on the holds shelf for ${memberName(h.member)}`, "good", null, 15);
}
let holdMeshes = [];
function holdsRender() {                          // the held tapes, stacked in the tray with a yellow slip on each
  for (const m of holdMeshes) m.removeFromParent(); holdMeshes = [];
  holds.filter(h => h.copy).forEach((h, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(TAPE.h, TAPE.w, TAPE.d), h.copy.sideMat || mat.tapeBody);
    m.position.set(HOLDS_AT.x + (i % 2) * 0.012, HOLDS_AT.y + TAPE.w / 2 + i * TAPE.w, HOLDS_AT.z); scene.add(m); holdMeshes.push(m);
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.002, 0.07), holdSlip); s.position.set(m.position.x, m.position.y + TAPE.w / 2 + 0.001, m.position.z); scene.add(s); holdMeshes.push(s);
  });
}
const holdSlip = new THREE.MeshLambertMaterial({ color: 0xfff59a });
function holdsTick() {                           // callers come in for their holds
  for (const h of holds.filter(h => !h.coming && h.day === shift.day && shift.h >= h.at && shiftOpen() && !frontLock.locked)) {
    if (custs.some(k => k.member === h.member)) continue;
    h.coming = true; const k = custSpawn(h.member); k.pickup = h; k.thief = false; k.returning = [];
  }
}
function danaCall() {                            // Dana picks up: she checks, tells the truth, and fetches it herself if it's in
  const r = phone.ring; phone.ring = null; phone.call = { ...r, t: 30 };
  if (r.kind) { callAnswer(callRight(phone.call) ?? 2, "dana"); return; }   // she knows the answers (and hangs up on pranks; the fee stands: not hers to waive)
  const copy = onShelfCopy(r.title);
  if (!copy) { callAnswer(2, "dana"); return; }
  const h = callAnswer(1, "dana");
  emp.fetch = { copy, hold: h }; emp.c.setMood("happy"); empGo("fetchGo", shelfSpot(copy));
}

// ---------------- the calendar: holidays and street dates ----------------
// The days that matter in a video store, every year: some busier (New Year's Eve), some dead (Super Bowl
// Sunday), and some that pull people to one section for the weeks before (horror for Halloween, the holiday
// shelf through December). On the wall behind the register: a promo calendar with them circled in red marker
const nthDow = (y, m, dow, n) => { const d = new Date(y, m, 1, 12); d.setDate(1 + (dow - d.getDay() + 7) % 7 + 7 * (n - 1)); return d; };
const lastDow = (y, m, dow) => { const d = new Date(y, m + 1, 0, 12); d.setDate(d.getDate() - (d.getDay() - dow + 7) % 7); return d; };
const holidays = y => [
  { at: new Date(y, 9, 31, 12), label: "HALLOWEEN", rush: 1.25, lean: ["Horror", "Horror & Anthology"], lead: 14 },
  { at: new Date(+nthDow(y, 10, 4, 4) - 864e5), label: "LONG WKND", rush: 1.25 },
  { at: nthDow(y, 10, 4, 4), label: "THANKSGIV.", rush: 0.6 },
  { at: new Date(y, 11, 25, 12), label: "CHRISTMAS", rush: 0.5, lean: ["Holiday", "Family & Kids"], lead: 24 },
  { at: new Date(y, 11, 31, 12), label: "NEW YEAR'S", rush: 1.4 },
  { at: lastDow(y, 0, 0), label: "SUPER BOWL", rush: 0.6 },
  { at: new Date(y, 1, 14, 12), label: "VALENTINE", rush: 1.2, lean: ["Drama", "Comedy"], lead: 3 },
  ...NOT_YET.filter(f => +f[2].slice(0, 4) === y).map(([t, , st]) => ({ at: new Date(st + "T12:00"), label: `${t.split(":")[0].toUpperCase().slice(0, 10)} VHS`, rush: 1.1 })),
];
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
function season() {                               // today: { today: [holidays], rush, lean: [categories] } (worked out once a day)
  if (season.day === shift.day) return season.v;
  const d = shiftDate(), hs = [...holidays(d.getFullYear() - 1), ...holidays(d.getFullYear())];
  const today = hs.filter(h => sameDay(h.at, d));
  season.day = shift.day;
  return season.v = { today, rush: today.reduce((a, h) => a * h.rush, 1), lean: hs.filter(h => h.lean && d <= h.at && (h.at - d) / 864e5 <= h.lead).flatMap(h => h.lean) };
}
const calCanvas = document.createElement("canvas"); calCanvas.width = 512; calCanvas.height = 768;
const calTex = new THREE.CanvasTexture(calCanvas); calTex.colorSpace = THREE.SRGBColorSpace;
{
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.63), new THREE.MeshLambertMaterial({ map: calTex }));
  m.position.set(WALL_L + 0.106, 1.5, 0.72); m.rotation.y = Math.PI / 2; scene.add(m);   // the west wall, by the front window, under the TV
}
function calendarDraw() {
  const g = calCanvas.getContext("2d"), W = 512, d = shiftDate(), y = d.getFullYear(), mo = d.getMonth();
  g.fillStyle = "#fbf8ef"; g.fillRect(0, 0, W, 768);
  // the picture half: the store's own promo
  const sky = g.createLinearGradient(0, 0, 0, 300); sky.addColorStop(0, "#0b1d5c"); sky.addColorStop(1, "#3a2a7a"); g.fillStyle = sky; g.fillRect(0, 0, W, 300);
  g.fillStyle = "#ffd400"; g.font = "bold 44px Arial Black, Arial"; g.textAlign = "center"; g.fillText("JELLYBUSTER", W / 2, 70);
  g.fillStyle = "#fff"; g.font = "bold 22px Arial"; g.fillText("VIDEO · BE KIND, REWIND", W / 2, 102);
  g.fillStyle = "#111"; g.fillRect(126, 140, 260, 130); g.fillStyle = "#e8e8e8"; g.fillRect(166, 158, 180, 46);   // a tape, label and reels
  g.fillStyle = "#333"; for (const x of [200, 312]) { g.beginPath(); g.arc(x, 236, 22, 0, 7); g.fill(); }
  g.fillStyle = "#c00"; g.font = "bold 20px Arial"; g.fillText(`${y}`, W / 2, 188);
  // the month
  const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  g.fillStyle = "#111"; g.font = "bold 36px Arial"; g.fillText(`${MONTHS[mo]} ${y}`, W / 2, 346);
  const x0 = 18, cw = (W - 36) / 7, y0 = 372, ch = 64, first = new Date(y, mo, 1).getDay(), days = new Date(y, mo + 1, 0).getDate();
  g.font = "bold 16px Arial"; "SMTWTFS".split("").forEach((c, i) => { g.fillStyle = i ? "#333" : "#c00"; g.fillText(c, x0 + cw * (i + 0.5), y0 + 4); });
  const hs = holidays(y).filter(h => h.at.getMonth() === mo);
  for (let n = 1; n <= days; n++) {
    const k = first + n - 1, cx = x0 + cw * (k % 7), cy = y0 + 12 + ch * Math.floor(k / 7);
    g.strokeStyle = "#bbb"; g.lineWidth = 1; g.strokeRect(cx, cy, cw, ch);
    g.fillStyle = k % 7 ? "#222" : "#c00"; g.font = "bold 20px Arial"; g.textAlign = "left"; g.fillText(n, cx + 5, cy + 21);
    const h = hs.find(h => h.at.getDate() === n);
    if (h) {                                      // circled in red marker, with a scrawl
      g.strokeStyle = "#d01818"; g.lineWidth = 4; g.beginPath(); g.ellipse(cx + cw / 2, cy + ch / 2, cw / 2 - 3, ch / 2 - 4, -0.12, 0.3, 0.3 + Math.PI * 2.08); g.stroke();
      g.fillStyle = "#d01818"; g.font = "bold 14px Comic Sans MS, Arial"; g.textAlign = "center"; g.fillText(h.label, cx + cw / 2, cy + ch - 9);
    }
    if (n < d.getDate()) {                        // crossed off
      g.strokeStyle = "#222b"; g.lineWidth = 3; g.beginPath(); g.moveTo(cx + 8, cy + 8); g.lineTo(cx + cw - 8, cy + ch - 8); g.moveTo(cx + cw - 8, cy + 8); g.lineTo(cx + 8, cy + ch - 8); g.stroke();
    } else if (n === d.getDate()) { g.strokeStyle = "#1a5cff"; g.lineWidth = 3; g.strokeRect(cx + 2, cy + 2, cw - 4, ch - 4); }
  }
  g.textAlign = "left"; calTex.needsUpdate = true;
}
calendarDraw();

// ---------------- the community corkboard, on the entry half wall ----------------
// What's going on around town, and in here: flyers that change week to week, whatever's coming up on the
// calendar, tonight's feature, the employee of the month, and a Polaroid of everyone who's banned
const FLYERS = [
  ["#fff59a", ["LOST CAT!", "ORANGE TABBY", "\"MR. WHISKERS\"", "CALL 555-0142"]], ["#bfe3ff", ["BAND SEEKS", "DRUMMER", "NO POSERS", "ASK FOR TODD"]],
  ["#ffd0e8", ["BABYSITTER", "CPR CERTIFIED", "$4/HR", "555-0199"]], ["#d6ffd0", ["GUITAR", "LESSONS", "ALL AGES", "555-0177"]],
  ["#fff", ["GARAGE SALE", "SAT 8AM", "NINTENDO, LP'S", "412 ELM ST"]], ["#ffe0b8", ["LAWNS MOWED", "$10", "ASK FOR KEVIN"]],
  ["#e0d4ff", ["KARATE", "SIGN-UPS", "REC CENTER"]], ["#fff", ["FREE PUPPIES", "TO GOOD HOME", "555-0123"]],
];
function corkDraw() {
  const g = corkCanvas.getContext("2d"), W = 1040, H = 680, wk = Math.floor((shift.day - 1) / 7);
  let seed = 9301 + wk * 49297; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;   // the same flyers all week
  g.fillStyle = "#b58552"; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 2600; i++) { g.fillStyle = rnd() < 0.5 ? "#9c6c3e" : "#c99a64"; g.fillRect(rnd() * W, rnd() * H, 3, 3); }
  const pin = (x, y) => { g.fillStyle = ["#d22", "#22a", "#1a1", "#eb0"][Math.floor(rnd() * 4)]; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); };
  const note = (x, y, w, h, bg, lines, size = 22) => {
    g.save(); g.translate(x + w / 2, y + h / 2); g.rotate((rnd() - 0.5) * 0.12); g.fillStyle = "#0004"; g.fillRect(-w / 2 + 4, -h / 2 + 5, w, h);
    g.fillStyle = bg; g.fillRect(-w / 2, -h / 2, w, h); g.fillStyle = "#222"; g.textAlign = "center";
    lines.forEach((l, i) => { g.font = `bold ${i ? size - 4 : size}px Arial`; g.fillText(l, 0, -h / 2 + size + 8 + i * (size + 4), w - 12); });
    pin(0, -h / 2 + 10); g.restore();
  };
  const polaroid = (x, y, name, tag, bg) => {     // a snapshot: a TV-head silhouette in the frame, a name in marker under it
    g.save(); g.translate(x + 70, y + 85); g.rotate((rnd() - 0.5) * 0.16); g.fillStyle = "#0004"; g.fillRect(-66, -76, 140, 170);
    g.fillStyle = "#f6f4ee"; g.fillRect(-70, -80, 140, 170); g.fillStyle = bg; g.fillRect(-60, -70, 120, 112);
    g.fillStyle = "#222"; g.fillRect(-26, -48, 52, 40); g.fillStyle = "#6af"; g.fillRect(-20, -43, 40, 30); g.fillStyle = "#222"; g.fillRect(-36, -4, 72, 46);
    g.fillStyle = "#c00"; g.font = "bold 16px Comic Sans MS, Arial"; g.textAlign = "center"; g.fillText(tag, 0, 62, 130);
    g.fillStyle = "#111"; g.font = "bold 15px Comic Sans MS, Arial"; g.fillText(name, 0, 82, 130); pin(0, -72); g.restore();
  };
  // the employee of the month: whoever's furthest along
  const best = [you, ...staff].reduce((a, e) => avgLevel(e) > avgLevel(a) ? e : a, you);
  polaroid(24, 20, best === you ? "YOU!" : `${best.first} ${best.last[0]}.`.toUpperCase(), "EMPLOYEE OF THE MONTH", "#ffd400");
  // the banned (most recent first)
  const banned = posTerm.members.filter(m => m.status && !posTerm.canVisit(m)).slice(-4);
  banned.forEach((m, i) => polaroid(W - 170 - i * 150, H - 200, `${m.first[0]}. ${m.last}`.toUpperCase(), "DO NOT RENT", "#ccc"));
  // what's coming up on the calendar, and tonight's feature
  const d = shiftDate(), soon = [...holidays(d.getFullYear()), ...holidays(d.getFullYear() + 1)].filter(h => h.at >= d && (h.at - d) / 864e5 <= 21).sort((a, b) => a.at - b.at)[0];
  if (soon) note(196, 26, 250, 150, "#ff9b3d", soon.label === "HALLOWEEN" ? ["HORROR-THON!", "SCARY STUFF ALL", "OCTOBER LONG"] : soon.label === "CHRISTMAS" ? ["HOLIDAY", "FAVORITES", "ON THE ENDCAP"]
    : [soon.label, soon.at.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase(), "PLAN AHEAD!"], 26);
  if (show.title) note(470, 22, 290, 120, "#111", ["TONIGHT 8PM"], 28), g.fillStyle = "#ffd400", g.font = "bold 22px Arial", g.textAlign = "center", g.fillText(show.title.title.toUpperCase(), 615, 120, 270), g.textAlign = "left";
  // the flyers: four of them this week
  const fl = [...FLYERS].sort(() => rnd() - 0.5).slice(0, banned.length > 2 ? 3 : 4);
  const dow = (shift.day - 1) % 7;                 // through the week, people tear the tabs off (more off the popular ones)
  [[790, 24], [200, 210], [430, 190], [30, 250]].slice(0, fl.length).forEach(([x, y], i) => {
    note(x, y, 210, 170, fl[i][0], fl[i][1]);
    const torn = Math.min(6, Math.floor(dow * (0.2 + rnd() * 0.8))), gone = new Set([0, 1, 2, 3, 4, 5].sort(() => rnd() - 0.5).slice(0, torn));
    g.fillStyle = "#222"; for (let k = 0; k < 6; k++) { if (gone.has(k)) continue; g.save(); g.translate(x + 20 + k * 32, y + 170); g.fillStyle = fl[i][0]; g.fillRect(0, 0, 24, 40); g.restore(); }   // tear-off tabs
  });
  if (dow >= 3) {                                 // somebody's put a card up since Monday
    const cards = [["NEED A RIDE", "TO THE GAME SAT", "ASK JEN"], ["FOUND: KEYS", "ASK AT COUNTER"], ["FOR SALE", "SEGA GENESIS", "+ 6 GAMES $60"], ["ROOMMATE", "WANTED", "NO SMOKERS"], ["TUTORING", "MATH / SCIENCE", "555-0110"]];
    note(650, 470, 170, 120, "#f4f1e6", cards[(wk * 3 + 1) % cards.length], 18);
  }
  corkTex.needsUpdate = true;
}

// ---------------- decorations for the holidays ----------------
// Up for the month (or the run-up): October's cobwebs, jack-o'-lanterns by the door and orange-and-purple bunting;
// November's paper leaves and a cut-out turkey on the door; December's tree in the front corner, colored lights
// along the windows and a wreath; paper hearts on the glass for Valentine's; red, white and blue for the Fourth
const decor = { g: new THREE.Group(), key: null, blink: [], t: 0 };
scene.add(decor.g);
function decorDraw() {
  const d = shiftDate(), mo = d.getMonth(), dd = d.getDate();
  const key = mo === 9 ? "halloween" : mo === 10 ? "fall" : mo === 11 ? "xmas" : mo === 1 && dd <= 14 ? "valentine" : mo === 6 && dd <= 7 ? "fourth" : null;
  if (key === decor.key) return; decor.key = key;
  decor.g.traverse(o => { if (o.isMesh) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.map?.dispose(); m.dispose(); }); } });
  decor.g.clear(); decor.blink = []; for (const c of decor.cols || []) colliders.splice(colliders.indexOf(c), 1); decor.cols = [];
  if (!key) return;
  const G = decor.g, lam = c => new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide });
  const add = (geo, m, x, y, z, parent = G) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const canvasMat = (w, h, draw, opts = {}) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshLambertMaterial({ map: t, transparent: true, side: THREE.DoubleSide, alphaTest: 0.05, ...opts }); };
  const bunting = (cols, y = 2.6, z = 0.18) => {   // pennants on a string along the window header, sagging between ties
    const tri = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.09, 0, 0), new THREE.Vector3(0.09, 0, 0), new THREE.Vector3(0, -0.2, 0)]); tri.computeVertexNormals();
    const mats = cols.map(lam), x0 = WALL_L + 0.3, x1 = STORE.x - 0.3, span = 2.4;
    for (let x = x0, i = 0; x < x1; x += 0.24, i++) { const k = ((x - x0) % span) / span, sag = 0.12 * Math.sin(k * Math.PI); add(tri, mats[i % mats.length], x, y - sag, z); }
  };
  const lights = (y = 2.62, z = 0.16) => {         // a string of colored bulbs, twinkling (two sets taking turns)
    const geo = new THREE.SphereGeometry(0.022, 6, 5), cols = [0xff3030, 0x30ff60, 0x3070ff, 0xffd400, 0xff7ad9];
    const sets = [new THREE.Group(), new THREE.Group()]; sets.forEach(s => G.add(s));
    const x0 = WALL_L + 0.3, x1 = STORE.x - 0.3, span = 2.4;
    for (let x = x0, i = 0; x < x1; x += 0.2, i++) { const k = ((x - x0) % span) / span; glow(add(geo, new THREE.MeshBasicMaterial({ color: cols[i % cols.length] }), x, y - 0.1 * Math.sin(k * Math.PI), z, sets[i % 2])); }
    decor.blink.push(sets);
  };
  const glassCutout = (draw, x, y, s, z = 0.04) => { const m = add(new THREE.PlaneGeometry(s, s), canvasMat(128, 128, draw), x, y, z); return m; };
  if (key === "halloween") {
    bunting([0xff7a12, 0x5b2a86, 0x111111]);
    const web = canvasMat(256, 256, (g, w) => { g.strokeStyle = "rgba(240,240,240,0.75)"; g.lineWidth = 1.6;
      for (let a = 0; a <= 8; a++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a / 8 * Math.PI / 2) * w, Math.sin(a / 8 * Math.PI / 2) * w); g.stroke(); }
      for (let r = 30; r < w; r += 34) { g.beginPath(); for (let a = 0; a <= 8; a++) { const t = a / 8 * Math.PI / 2, rr = r * (a % 2 ? 0.92 : 1); a ? g.lineTo(Math.cos(t) * rr, Math.sin(t) * rr) : g.moveTo(Math.cos(t) * rr, Math.sin(t) * rr); } g.stroke(); } });
    for (const [x, z, ry] of [[WALL_L + 0.11, 0.21, 0], [STORE.x - 0.11, 0.21, Math.PI / 2], [WALL_L + 0.11, STORE.z - 0.15, -Math.PI / 2], [STORE.x - 0.11, STORE.z - 0.15, Math.PI]]) {
      const w = add(new THREE.PlaneGeometry(0.9, 0.9), web, x, STORE.h - 0.02, z); w.rotation.set(Math.PI / 2, 0, ry); w.geometry.translate(0.45, -0.45, 0);   // across the corner, up at the ceiling
    }
    // jack-o'-lanterns on the counter's lane-side ledge, first thing you see coming in: ribbed and squat, a crooked
    // stem and a curl of vine, the lid cut round the stem, the faces carved through with candlelight showing in them
    const R = 0.12, ribbed = geo => {             // ten lobes with creases between, dimpled top and bottom
      const p = geo.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i); const a = Math.atan2(v.z, v.x), k = 1 - 0.09 * (1 - Math.abs(Math.cos(a * 5))) ** 3, h = v.y / R;
        p.setXYZ(i, v.x * k, v.y * 0.78 - 0.035 * R * (1 - h * h) ** 8 * Math.sign(h), v.z * k);
      }
      geo.computeVertexNormals(); return geo;
    };
    const skin = canvasMat(256, 128, (g, w, h) => {   // orange with darker crease lines and a few blemishes; the lid cut ringing the top
      g.fillStyle = "#e5711a"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 10; i++) { const gr = g.createLinearGradient(i * w / 10, 0, (i + 1) * w / 10, 0); gr.addColorStop(0, "#f08a2a"); gr.addColorStop(0.4, "#de701a"); gr.addColorStop(0.5, "#a8480c"); gr.addColorStop(0.6, "#de701a"); gr.addColorStop(1, "#f08a2a"); g.fillStyle = gr; g.fillRect(i * w / 10, 0, w / 10, h); }
      g.fillStyle = "rgba(120,80,20,0.25)"; for (let i = 0; i < 14; i++) { g.beginPath(); g.arc((i * 73) % w, 30 + (i * 37) % 80, 1 + i % 3, 0, 7); g.fill(); }
      g.fillStyle = "#4a2408"; g.fillRect(0, 12, w, 2);
    }, { transparent: false, alphaTest: 0 });
    const cut = g => { g.fill(); g.stroke(); };     // what's carved: the lit flesh inside, a dark rind edge round it
    const faces = [
      g => { for (const x of [42, 86]) { g.beginPath(); g.moveTo(x - 14, 60); g.lineTo(x + 14, 60); g.lineTo(x, 36); cut(g); }
        g.beginPath(); g.moveTo(58, 72); g.lineTo(70, 72); g.lineTo(64, 62); cut(g);
        g.beginPath(); g.moveTo(26, 82); for (let i = 0; i <= 8; i++) g.lineTo(26 + i * 9.5, 82 + (i % 2 ? 0 : 6) + Math.sin(i / 8 * Math.PI) * 14); g.lineTo(102, 82); g.quadraticCurveTo(64, 120, 26, 82); cut(g); },
      g => { for (const x of [42, 86]) { g.beginPath(); g.ellipse(x, 50, 11, 14, 0, 0, 7); cut(g); }
        g.beginPath(); g.ellipse(64, 92, 14, 17, 0, 0, 7); cut(g); },
      g => { for (const [x, s] of [[42, -1], [86, 1]]) { g.beginPath(); g.moveTo(x - 14, 46 + s * 6); g.lineTo(x + 14, 46 - s * 6); g.lineTo(x, 62); cut(g); }
        g.beginPath(); g.moveTo(24, 78); g.quadraticCurveTo(64, 126, 104, 78); g.quadraticCurveTo(64, 100, 24, 78); cut(g); g.clearRect(56, 84, 10, 12); g.clearRect(74, 80, 9, 10); },
    ];
    const vine = new THREE.MeshLambertMaterial({ color: 0x5a6a24 }), stemMat = new THREE.MeshLambertMaterial({ color: 0x6a5a2a });
    for (const [z, s, f] of [[0.38, 1, 0], [0.7, 0.82, 2], [0.98, 0.68, 1]]) {   // on the ledge, x ~ -1.93; turned toward the doors
      const x = -1.93, p = new THREE.Group(); p.position.set(x, 1.25, z); p.rotation.y = Math.atan2(0 - x, 1.4 - z) + (f - 1) * 0.15; p.scale.setScalar(s); G.add(p);
      add(ribbed(new THREE.SphereGeometry(R, 40, 20)), skin, 0, R * 0.78, 0, p);
      const face = canvasMat(128, 128, g => { const gr = g.createRadialGradient(64, 70, 6, 64, 70, 70); gr.addColorStop(0, "#fff2a8"); gr.addColorStop(1, "#ff8a1a"); g.fillStyle = gr; g.strokeStyle = "#5a2a08"; g.lineWidth = 5; g.lineJoin = "round"; faces[f](g); });
      const lit = new THREE.MeshBasicMaterial({ map: face.map, transparent: true, alphaTest: 0.05, color: 0xffb030 });
      glow(add(ribbed(new THREE.SphereGeometry(R * 1.01, 24, 16, Math.PI * 0.2, Math.PI * 0.6, Math.PI * 0.22, Math.PI * 0.5)), lit, 0, R * 0.78, 0, p));   // the front of the rind, facing local +z
      const stem = add(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(0.02, 0.07, 0.015)), 6, 0.013, 6), stemMat, 0, R * 1.5, 0, p);
      stem.rotation.y = f * 2;
      add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0.01, 0], [0.04, 0.01], [0.06, -0.01], [0.05, -0.03], [0.035, -0.02]].map(([a, b]) => new THREE.Vector3(a, R * 0.02 + b * 0.3, b))), 16, 0.0035, 4), vine, 0, R * 1.52, 0, p).rotation.y = f * 2 + 1;
    }
  }
  if (key === "fall") {
    bunting([0xc8501e, 0xe0a020, 0x8a3a1a, 0xb87a2a]);
    glassCutout(g => { g.fillStyle = "#7a4a22"; g.beginPath(); g.arc(64, 74, 26, 0, 7); g.fill();
      ["#c8401e", "#e0a020", "#8a5a2a", "#d06a1e", "#b83a1e"].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.ellipse(64 + Math.cos(Math.PI + i * 0.6 + 0.3) * 30, 60 + Math.sin(Math.PI + i * 0.6 + 0.3) * 30, 10, 24, i * 0.6 - 1.1, 0, 7); g.fill(); });
      g.fillStyle = "#8a5a2a"; g.beginPath(); g.arc(64, 52, 14, 0, 7); g.fill(); g.fillStyle = "#e0a020"; g.beginPath(); g.moveTo(64, 54); g.lineTo(74, 58); g.lineTo(64, 60); g.fill(); g.fillStyle = "#d02020"; g.fillRect(60, 60, 5, 9); g.fillStyle = "#111"; g.fillRect(59, 47, 3, 3); }, -2.6, 1.5, 0.55);
  }
  if (key === "xmas") {
    lights();
    const tx = STORE.x - 1.0, tz = 1.0, tree = new THREE.Group(); tree.position.set(tx, 0, tz); G.add(tree);
    add(new THREE.CylinderGeometry(0.05, 0.06, 0.25, 8), lam(0x5a3a1e), 0, 0.12, 0, tree);
    add(new THREE.CylinderGeometry(0.22, 0.26, 0.2, 10), lam(0xb02020), 0, 0.1, 0, tree);   // the stand, wrapped
    [[0.62, 0.7, 0.55], [0.48, 0.6, 1.0], [0.34, 0.5, 1.38], [0.2, 0.42, 1.72]].forEach(([r, h, y]) => add(new THREE.ConeGeometry(r, h, 10), lam(0x1e5a2e), 0, y, 0, tree));
    const star = glow(add(new THREE.OctahedronGeometry(0.07), new THREE.MeshBasicMaterial({ color: 0xffe066 }), 0, 1.97, 0, tree)); star.scale.y = 1.4;
    const sets = [new THREE.Group(), new THREE.Group()]; sets.forEach(s => tree.add(s)); const bulb = new THREE.SphereGeometry(0.025, 6, 5);
    for (let i = 0; i < 46; i++) { const y = 0.35 + (i / 46) * 1.5, r = 0.6 * (1 - (y - 0.25) / 1.75) + 0.03, a = i * 2.4; glow(add(bulb, new THREE.MeshBasicMaterial({ color: [0xff3030, 0x30ff60, 0x3070ff, 0xffd400][i % 4] }), Math.cos(a) * r, y, Math.sin(a) * r, sets[i % 2])); }
    for (let i = 0; i < 18; i++) { const y = 0.4 + Math.random() * 1.3, r = 0.58 * (1 - (y - 0.25) / 1.75), a = Math.random() * 6.28; add(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshPhongMaterial({ color: [0xc81e1e, 0xd4af37, 0x2050c0, 0xe0e0e0][i % 4], shininess: 90 }), Math.cos(a) * r, y, Math.sin(a) * r, tree); }
    for (let i = 0; i < 4; i++) { const b = add(new THREE.BoxGeometry(0.22, 0.16, 0.2), lam([0xc81e1e, 0x2050c0, 0x2b9348, 0xd4af37][i]), Math.cos(i * 1.6 + 0.4) * 0.45, 0.08, Math.sin(i * 1.6 + 0.4) * 0.45, tree); b.rotation.y = i; }   // presents
    decor.blink.push(sets);
    decor.cols.push({ x0: tx - 0.62, x1: tx + 0.62, z0: tz - 0.62, z1: tz + 0.62, y1: 2 }); colliders.push(decor.cols.at(-1));
    const wreath = new THREE.Group(); wreath.position.set(-0.85, 1.85, 0.12); G.add(wreath);   // up on the glass over the left door leaf
    add(new THREE.TorusGeometry(0.2, 0.06, 8, 20), lam(0x1e5a2e), 0, 0, 0, wreath);
    for (let i = 0; i < 8; i++) add(new THREE.SphereGeometry(0.022, 6, 5), lam(0xc81e1e), Math.cos(i * 0.785) * 0.2, Math.sin(i * 0.785) * 0.2, 0.05, wreath);
    add(new THREE.BoxGeometry(0.14, 0.08, 0.03), lam(0xc81e1e), 0, -0.2, 0.04, wreath);
  }
  if (key === "valentine") {
    const heart = (c) => g => { g.fillStyle = c; g.beginPath(); g.moveTo(64, 108); g.bezierCurveTo(-10, 60, 30, 0, 64, 38); g.bezierCurveTo(98, 0, 138, 60, 64, 108); g.fill(); };
    for (let i = 0; i < 12; i++) { const side = i % 2 ? 1 : -1, x = side * (2.4 + (i >> 1) * 1.35); if (x < WALL_L + 0.4 || x > STORE.x - 0.4) continue; glassCutout(heart(["#e8264f", "#ff8fb1", "#ffffff"][i % 3]), x, 1.1 + (i % 3) * 0.45, 0.32); }
  }
  if (key === "fourth") bunting([0xc81e1e, 0xf4f4f4, 0x1f3f9a]);
}
function decorTick(dt) {                          // the lights take turns
  if (!decor.blink.length || (decor.t += dt) < 0.7) return; decor.t = 0;
  for (const [a, b] of decor.blink) { a.visible = !a.visible; b.visible = !a.visible; }
}
decorDraw();

