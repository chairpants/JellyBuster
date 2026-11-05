// JellyBuster POS/NET — the register's green-screen terminal: a telnet
// session into the store's (SCO Unix, naturally) back-office box, running a
// menu-driven rental system. Classic script, like couch.js: store.js calls
// window.createPOS(api) once the shelves are stocked.
//
// api: {
//   catalog,            every title (copies hang off t.copies)
//   rented,             the copies store.js pulled off the shelves as "out on rental"
//   savedRental(copy),  [member #, out ms] from last visit, if this copy's rental was saved
//   budget,             store budget from last visit (a fresh store starts with $300)
//   activeMembers,      member #s signed up (saved), or startMembers: how many a new store begins with (else: everyone)
//   savedRecords,       { member #: { incidents, status, until, loyalty, lastVisit } } from last visit
//   savedOwed,          { member #: late fees owed } from last visit
//   today, clock(),     the shift's date (ms) and its clock ("HH:MM") — store.js runs its own calendar
//   replace(copy),      a replacement for a lost copy arrived: store.js puts it in the returns bin
//   lose(copy),         a rental billed as lost: it's never coming back (off the rented list, on the lost one)
//   promised(member),   an overdue member said on the phone they'll bring it in
//   callNote(member),   an overdue call looked up: a post-it for the store phone (the call's made from there)
//   savedMessages,      the message center's notes from last visit: [{ at, text, read }]
//   returnBin(), held(), playing(),   live store state, read on demand
//   alarm(), silenceAlarm(),          security gate alarm: is it going off / shut it up
//   gatesArmed(), armGates(on),       the gate system itself: armed or switched off entirely
//   resetSave(),                      wipe the saved store and reload (SYSRESET)
//   onClose(),          player logged off / backed out
//   onRedraw(canvas),   the screen changed — mirror it onto the in-world monitor
// }
// -> { open(), close(), isOpen(), key(e), canvas, members, message(text), inbox(), messagesAll(), rentMax, dueIn(rental), checkIn(copy), checkOut(copy, member), sale(amount), budget(), owed(member), settle(member, paid), owedAll(), join(n), prospect(skip), enroll(member), activeNums(), incident(member, what), setStatus(member, status, days), canVisit(member), loyal(member, d), recordsAll(), setDate(date), rentalOf(copy) }
window.createPOS = function createPOS(api) {
  const COLS = 80, ROWS = 30;
  // DOS-app palette: blue screen, light grey text, bright white values, cyan
  // labels and frames, yellow headings, green money, red warnings; a grey bar
  // for the selection. VT323 (vendor/, loaded in index.html) with a
  // monospace fallback offline
  const P = { bg: "#0000aa", fg: "#c8c8d8", hi: "#ffffff", yel: "#ffff55", cyan: "#55ffff", dcyan: "#00aaaa", grn: "#55ff55", red: "#ff5555",
    gray: "#8a8ad0", blk: "#000000", deep: "#000077", shadow: "#000044", sel: "#c8c8d8" };
  const FONT = "VT323, 'Courier New', monospace";

  // ---- seeded randomness: the same customers every visit within a session ----
  let seed = 0x5eed1996;
  const rnd = () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));

  // ---- formatting ----
  const DAY = 864e5;
  let TODAY = (() => { const d = api.today ? new Date(api.today) : new Date(); d.setHours(12, 0, 0, 0); return d; })();   // the shift's date (store.js): day 1 is Mon Sept 30 1996
  const fmtD = d => `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
  const clock = () => { if (api.clock) return api.clock(); const n = new Date(); return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`; };
  const money = n => "$" + n.toFixed(2);
  const L = (s, n) => (String(s) + " ".repeat(n)).slice(0, n);
  const R = (s, n) => (" ".repeat(n) + String(s)).slice(-n);
  const up = s => String(s).toUpperCase();

  // ---- the store's data ----
  const meta = window.STORE_META || {};
  const yearOf = t => meta[t.id]?.[0] || "";
  const copiesOf = t => [t, ...(t.copies || [])];
  // a copy is Object.create(title) (see store.js); the title itself is copy #1
  const titleOf = c => Object.hasOwn(c, "copies") || Object.getPrototypeOf(c) === Object.prototype ? c : Object.getPrototypeOf(c);
  const isTV = t => t.seasons.length > 1 || t.seasons[0].episodes.length > 1;
  const priceOf = t => t.newRelease ? { cls: "NEW RELEASE", nights: 2, rate: 3.99, late: 2.00 } : { cls: "CATALOG", nights: 5, rate: 1.99, late: 1.00 };
  const FIRST = ["JOHN", "MARY", "DAVID", "LISA", "NICK", "KAREN", "STEVE", "SUSAN", "CHRIS", "AMY", "BRIAN", "DONNA", "KEVIN", "TINA", "JASON",
    "HEATHER", "SCOTT", "WENDY", "TODD", "DAWN", "GREG", "SHANNON", "RAY", "TRACY", "DOUG", "ANGELA", "PHIL", "KIM", "ERIC", "MELISSA", "RON", "JILL",
    "DANNY", "STACY", "TROY", "APRIL", "GARY", "NICOLE", "DEREK", "JENNY", "MARCUS", "BECKY", "LUIS", "ROSA", "ANDRE", "KEISHA", "DALE", "PAM"];
  const LAST = ["SMITH", "JOHNSON", "MILLER", "DAVIS", "GARCIA", "WILSON", "ANDERSON", "TAYLOR", "THOMAS", "MOORE", "MARTIN", "JACKSON", "THOMPSON",
    "WHITE", "LOPEZ", "HARRIS", "CLARK", "LEWIS", "ROBINSON", "WALKER", "YOUNG", "ALLEN", "KING", "WRIGHT", "SCOTT", "HILL", "GREEN", "ADAMS",
    "BAKER", "NELSON", "CARTER", "MITCHELL", "ROBERTS", "TURNER", "PHILLIPS", "CAMPBELL", "PARKER", "EVANS", "EDWARDS", "COLLINS", "STEWART",
    "MORRIS", "MURPHY", "COOK", "ROGERS", "REED", "BAILEY", "KOWALSKI", "NGUYEN", "OKAFOR", "BRENNAN", "DELUCA"];
  const STREETS = ["MAPLE AVE", "OAK ST", "ELM ST", "CEDAR LN", "PINE RIDGE RD", "LAKEVIEW DR", "2ND ST", "MAIN ST", "HIGHLAND AVE", "SUNSET BLVD",
    "WILLOW CT", "BIRCH WAY", "PARK PL", "RIVER RD", "HILLCREST DR", "ORCHARD LN", "MILL ST", "CHESTNUT ST", "FAIRVIEW AVE", "BROOKSIDE DR"];
  const NOTES = ["", "", "", "", "", "PAYS IN QUARTERS", "DAMAGED TAPE 03/96 - PAID", "NO R-RATED (PARENT REQUEST)", "HORROR FAN - CALL ON NEW ARRIVALS",
    "BOUNCED CHECK 11/95 - CASH ONLY", "EMPLOYEE FAMILY", "REWIND FEE WAIVED 2X - LAST WARNING", "ON RESERVE LIST FOR NEW RELEASES",
    "ALWAYS ASKS FOR STAFF PICKS", "RETURNED TAPE IN WRONG CASE 2X", "ACCT FROZEN ONCE - FEES PAID 07/96"];
  const customers = [];
  const usedNums = new Set();
  for (let i = 0; i < 140; i++) addCustomer();     // the original 140, as in every older save
  const seed140 = seed;
  for (let i = 140; i < 300; i++) addCustomer();   // 160 more locals to sign up over time...
  seed = seed140;                                   // ...drawn without shifting anything rnd() makes after this
  function addCustomer() {
    let num; do num = int(10001, 48999); while (usedNums.has(num)); usedNums.add(num);
    const first = pick(FIRST);
    customers.push({
      num, first, female: FIRST.indexOf(first) % 2 === 1, last: pick(LAST),   // FIRST alternates his / her names
      phone: `555-${String(num * 7919 % 10000).padStart(4, "0")}`,   // (from the member #, not rnd(): the same people as in saves made before phones came back)
      addr: `${int(12, 9870)} ${pick(STREETS)}`, since: int(1987, 1996), lifetime: int(3, 640),
      notes: pick(NOTES), heavy: rnd() < 0.2, rentals: [],
    });
  }
  customers.sort((a, b) => a.last.localeCompare(b.last) || a.first.localeCompare(b.first));
  for (const [num, owed] of Object.entries(api.savedOwed || {})) { const c = customers.find(c => c.num === +num); if (c) c.owed = owed; }
  for (const [num, r] of Object.entries(api.savedRecords || {})) { const c = customers.find(c => c.num === +num); if (c) Object.assign(c, r); }   // incidents, bans
  // who's actually a member: everyone, unless store.js says otherwise (simulation
  // starts with a small base: api.startMembers of them, the rest sign up over time)
  if (api.activeMembers) { const on = new Set(api.activeMembers); for (const c of customers) c.active = on.has(c.num); }
  else if (api.startMembers) { for (const c of customers) c.active = false; for (let n = 0; n < api.startMembers;) { const c = pick(customers); if (!c.active) { c.active = true; n++; } } }
  else for (const c of customers) c.active = true;
  const members = () => customers.filter(c => c.active);
  const heavy = customers.filter(c => c.heavy && c.active).length ? customers.filter(c => c.heavy && c.active) : members();
  const fullName = c => `${c.last}, ${c.first}`;
  // every copy store.js pulled off the shelf is checked out to somebody —
  // regulars take the lion's share
  // (nobody has more than RENT_MAX out: a saved store from before the limit gets its extras spread
  // round other members; anything no member has room for goes back on the shelf)
  const RENT_MAX = 3, room = c => c.rentals.length < RENT_MAX;
  const rentals = [...api.rented].map(copy => {   // (a copy of the list: unrent takes copies out of the real one)
    const saved = api.savedRental?.(copy), p = priceOf(copy);
    let cust = saved && customers.find(c => c.num === saved[0]), keep = !!cust && room(cust);
    if (!keep) { const hv = heavy.filter(room), ms = members().filter(room); cust = rnd() < 0.55 && hv.length ? pick(hv) : ms.length ? pick(ms) : null; }   // (members only: a small base keeps fewer tapes out)
    if (!cust) { api.unrent?.(copy); return null; }
    cust.active = true;                            // (anyone with a tape out is a member, whatever the list said)
    const out = keep ? new Date(saved[1]) : new Date(TODAY - int(0, p.nights + 4) * DAY), due = new Date(+out + p.nights * DAY);
    const r = { copy, cust, out, due };
    copy.rental = r; cust.rentals.push(r); return r;
  }).filter(Boolean);
  const daysLate = r => Math.max(0, Math.round((TODAY - r.due) / DAY));
  const lateFee = r => daysLate(r) * priceOf(r.copy).late;
  const custFees = c => (c.owed || 0) + c.rentals.reduce((a, r) => a + lateFee(r), 0);   // on the account, plus what the late ones out now are running up
  let budget = api.budget ?? 300;
  const replaceCost = t => t.newRelease ? 64.95 : 24.95;   // studio pricing: new releases come in at rental-market prices
  const copyStatus = c => c.libLocked ? "NOT CARRIED (LIBRARY UPGRADE)" : c.lost ? "LOST - STOLEN" : c === api.held() ? "IN HAND (STAFF)" : api.returnBin().includes(c) ? "IN RETURNS BIN"
    : api.playing()?.tape === c ? "IN LOUNGE VCR" : c.rental ? `OUT #${c.rental.cust.num} DUE ${fmtD(c.rental.due)}${daysLate(c.rental) ? ` LATE ${daysLate(c.rental)}D` : ""}`
    : c.offShelf ? "UNACCOUNTED" : "ON SHELF";
  const copyIn = t => copiesOf(t).filter(c => !c.offShelf).length;

  // ---- the message center: the store's notes (missed calls and the like, left by store.js with message())
  // and the calls somebody has to make: anyone with a tape CALL_DAYS late gets one until they've promised to
  // bring it in. Looking one up here writes a post-it for the store phone (api.callNote); the call's made from
  // there, and store.js puts what came of it on their record (recordCall). Still nothing after two tries and
  // LOST_DAYS: bill the tapes as lost ----
  const CALL_DAYS = 5, LOST_DAYS = 14;
  const notes = (api.savedMessages || []).slice(-40);
  const lateOf = c => c.rentals.filter(r => daysLate(r) >= CALL_DAYS);
  const toCall = () => customers.filter(c => lateOf(c).length && !(c.promise >= +TODAY - 2 * DAY))   // (a promise not kept in two days: back on the list)
    .sort((a, b) => Math.max(...lateOf(b).map(daysLate)) - Math.max(...lateOf(a).map(daysLate)));
  const inboxCount = () => toCall().filter(c => c.lastCall !== +TODAY).length + notes.filter(n => !n.read).length;
  function callScreen(c) {
    return { title: `OVERDUE CALL - ${up(fullName(c))} #${c.num}`, prompt: "L TO BILL AS LOST, ESC", lines: () => {
      const late = lateOf(c), worst = late.length ? Math.max(...late.map(daysLate)) : 0;
      return ["", ` MEMBER...: ${up(fullName(c))}  #${c.num}`, ` PHONE....: ${c.phone}`, ` LOYALTY..: ${c.loyalty > 30 ? "REGULAR" : c.loyalty < -30 ? "UNHAPPY" : "OK"}`, "",
        " OVERDUE:", ...late.map(r => `   ${L(up(r.copy.title), 44)} ${R(daysLate(r) + " DAYS", 8)}  ${R(money(lateFee(r)), 8)}`), "",
        ` CALLS....: ${c.calls || 0}${c.lastCall ? `  (LAST ${fmtD(new Date(c.lastCall))})` : ""}`, ...(c.lastResult ? [` LAST CALL: ${c.lastResult}`] : []),
        c.lastCall === +TODAY ? " CALLED TODAY. TRY AGAIN TOMORROW." : " A POST-IT'S BY THE STORE PHONE: CALL THEM FROM THERE.",
        ...(c.promise ? [` PROMISED.: ${fmtD(new Date(c.promise))} - NOT IN YET`] : []), "",
        worst >= LOST_DAYS && (c.calls || 0) >= 2 ? " L: BILL THE TAPES AS LOST (REPLACEMENT COST GOES ON THEIR ACCOUNT)" : ` (BILL AS LOST: AFTER ${LOST_DAYS} DAYS AND 2 CALLS)`];
    }, submit(v) {
      if (v === "C") { msg = "CALLS GO OUT FROM THE STORE PHONE: THE POST-IT'S BY IT."; return draw(); }
      if (v === "L") {
        const late = lateOf(c);
        if (!late.length || Math.max(...late.map(daysLate)) < LOST_DAYS || (c.calls || 0) < 2) { msg = `NOT YET: ${LOST_DAYS} DAYS LATE AND 2 CALLS FIRST.`; return draw(); }
        for (const r of late) {
          c.owed = +((c.owed || 0) + replaceCost(r.copy) + lateFee(r)).toFixed(2);
          c.rentals.splice(c.rentals.indexOf(r), 1); rentals.splice(rentals.indexOf(r), 1); r.copy.rental = null; r.copy.lost = true; api.lose?.(r.copy);
        }
        (c.incidents ||= []).push({ at: +TODAY, what: `BILLED FOR ${late.length} UNRETURNED TAPE${late.length > 1 ? "S" : ""}` });
        delete c.promise; back(); msg = "BILLED AS LOST. REORDER FROM B - REPLACEMENT COPIES."; return draw();
      }
      msg = "L TO BILL AS LOST. CALL FROM THE STORE PHONE."; draw();
    } };
  }
  function messagesScreen() {
    const items = [...toCall().map(c => ({ c })), ...[...notes].reverse()];
    return listScreen("MESSAGE CENTER", `      ${L("WHAT", 6)}`, items,
      (it, n) => {
        if (!it.c) return ` ${R(n, 3)}  ${L(it.read ? "NOTE" : "NEW", 6)} ${L(`${fmtD(new Date(it.at))} ${it.text}`, 66)}`;
        const late = lateOf(it.c), k = it.c.calls || 0;
        return ` ${R(n, 3)}  ${L(it.c.lastCall === +TODAY ? "CALLED" : "CALL", 6)} ${L(`${up(fullName(it.c))} #${it.c.num} - ${late.length} TAPE${late.length > 1 ? "S" : ""} ${Math.max(...late.map(daysLate))}D LATE${k ? ` (${k} CALL${k > 1 ? "S" : ""})` : ""}`, 66)}`;
      },
      it => {
        if (it.c) { api.callNote?.(it.c); return go(callScreen(it.c)); }   // (a post-it goes by the phone)
        it.read = true;
        go({ title: "MESSAGE", prompt: "D TO DELETE, ESC TO RETURN", lines: () => ["", ` ${fmtD(new Date(it.at))}`, "", ` ${it.text}`],
          submit(v) { if (v === "D") { notes.splice(notes.indexOf(it), 1); back(); back(); go(messagesScreen()); } else back(); } });
      },
      "NO MESSAGES. NOBODY TO CALL.");
  }

  // ---- the screen: an 80x30 grid of cells, each { ch, fg, bg } (or px: [top, bottom], two
  // square "pixels" for the logo), painted onto a canvas: the in-world monitor's, and a big one
  // for the close-up. Box-drawing lines and blocks are drawn as shapes, not font glyphs, so the
  // sections' borders join up cleanly at any size ----
  const canvas = document.createElement("canvas"); canvas.width = 800; canvas.height = 600;   // ~the monitor glass's 4:3
  const el = document.createElement("div"); el.id = "posTerm"; el.hidden = true;
  const view = document.createElement("canvas"); el.appendChild(view); document.body.appendChild(el);   // the close-up
  let open = false, mode = "login", input = "", user = "", blink = true, login = 0;   // login: 0 waiting, 1-9 the badge/password sequence
  let screen = null;                               // app screen: { title, lines() | render(g, top, rows), prompt, submit(v), pick }
  const stack = [];
  let msg = "";                                    // one-line status message above the prompt
  let hover = null, hits = [], layout = { top: 3, rows: 22 };   // hover: the cell under the mouse; hits: clickable spans this frame
  const WD = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const BODY = ROWS - 8;                           // body rows under the compact header (see frame)

  const blankGrid = () => Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ({ ch: " ", fg: P.fg, bg: P.bg, px: null })));
  function put(g, r, c, s, fg, bg) { s = String(s); for (let i = 0; i < s.length; i++) { const k = g[r]?.[c + i]; if (!k) continue; k.ch = s[i]; k.px = null; if (fg) k.fg = fg; if (bg) k.bg = bg; } }
  function tint(g, r, c0, c1, fg, bg) { for (let c = c0; c <= c1; c++) { const k = g[r]?.[c]; if (!k) continue; if (fg) k.fg = fg; if (bg) k.bg = bg; } }
  const center = (g, r, s, fg, bg, c0 = 0, c1 = COLS - 1) => put(g, r, c0 + Math.floor((c1 - c0 + 1 - s.length) / 2), s, fg, bg);
  function box(g, r0, c0, r1, c1, dbl, fg) {      // an outline
    const [h, v, tl, tr, bl, br] = dbl ? "═║╔╗╚╝" : "─│┌┐└┘";
    put(g, r0, c0, tl + h.repeat(c1 - c0 - 1) + tr, fg); put(g, r1, c0, bl + h.repeat(c1 - c0 - 1) + br, fg);
    for (let r = r0 + 1; r < r1; r++) { put(g, r, c0, v, fg); put(g, r, c1, v, fg); }
  }
  function rule(g, r, c0, c1, kind, fg) {          // a divider across a box: "dbl" ╠═╣ · "mid" ╟─╢ · "single" ├─┤
    const [a, h, b] = kind === "dbl" ? "╠═╣" : kind === "mid" ? "╟─╢" : "├─┤";
    put(g, r, c0, a + h.repeat(c1 - c0 - 1) + b, fg);
  }

  // the logo: JELLYBUSTER in 5x7 pixel letters, yellow running to orange, with a drop shadow:
  // 8 pixel rows = 4 rows of half-block cells
  const FONT5 = {
    J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"], Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
    U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"], L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"], B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"], E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  };
  const LOGO = "JELLYBUSTER", LOGO_W = LOGO.length * 6;  // (5 wide + a gap; the last gap holds the shadow)
  const RAMP = ["#ffff88", "#ffff55", "#ffee33", "#ffcc22", "#ffaa11", "#ff8800", "#ff6600"];
  function logo(g, r0, c0) {
    const on = (x, y) => { const i = Math.floor(x / 6), k = x % 6; return y >= 0 && y < 7 && i >= 0 && i < LOGO.length && k < 5 && FONT5[LOGO[i]][y][k] === "1"; };
    for (let row = 0; row < 4; row++) for (let x = 0; x < LOGO_W; x++) {
      const k = g[r0 + row]?.[c0 + x]; if (!k) continue;
      const px = [0, 1].map(h => { const y = row * 2 + h; return on(x, y) ? RAMP[y] : on(x - 1, y - 1) ? P.shadow : k.bg; });
      if (px[0] !== k.bg || px[1] !== k.bg) { k.px = px; k.ch = " "; }
    }
  }
  const TAG = "·  V I D E O   ·   P O S / N E T   2 . 3  ·";

  function statusBar(g, r) {                       // who, when, money: split by bars
    const parts = [[`EMP ${user || "----"}`, P.hi], ["TERM 01", P.fg], [`${WD[TODAY.getDay()]} ${fmtD(TODAY)}`, P.yel], [clock(), P.yel], [`BUDGET ${money(budget)}`, budget < 0 ? P.red : P.grn]];
    if (api.reputation) parts.push(["*".repeat(api.reputation().stars).padEnd(5, "."), P.yel]);
    let c = 2; parts.forEach(([t, fg], i) => { if (i) { put(g, r, c, "│", P.dcyan); c += 2; } put(g, r, c, t, fg); c += t.length + 1; });
  }
  function headerBig(g) {                          // main menu: the logo up top
    logo(g, 1, Math.floor((COLS - LOGO_W) / 2));
    center(g, 5, TAG, P.cyan);
    rule(g, 6, 0, COLS - 1, "dbl", P.dcyan); statusBar(g, 7); rule(g, 8, 0, COLS - 1, "mid", P.dcyan);
  }
  function headerSmall(g) {                        // everywhere else: the name in the top border, the screen's title on a bar
    put(g, 0, 2, " JELLYBUSTER ", P.yel); put(g, 0, 15, " POS/NET 2.3 ", P.cyan);
    const right = ` EMP ${user} │ ${fmtD(TODAY)} ${clock()} │ ${money(budget)} `; put(g, 0, COLS - 2 - right.length, right, P.fg);
    tint(g, 1, 1, COLS - 2, P.blk, P.dcyan); put(g, 1, 2, "► " + screen.title.slice(0, COLS - 6), P.blk, P.dcyan);
    rule(g, 2, 0, COLS - 1, "mid", P.dcyan);
  }
  function keyBar(g, r, keys) {                    // [cap, label, action]: black strip under the frame, cyan key caps
    tint(g, r, 0, COLS - 1, P.fg, P.blk);
    let c = 1;
    for (const [k, label, act] of keys) {
      put(g, r, c, ` ${k} `, P.blk, P.dcyan); put(g, r, c + k.length + 2, ` ${label}`, P.hi, P.blk);
      hits.push({ r, c0: c, c1: c + k.length + label.length + 2, act }); c += k.length + label.length + 5;
    }
  }
  const press = k => () => key({ key: k, preventDefault() {} });   // (a click on a key cap: as if it were pressed)
  function footer(g) {
    rule(g, ROWS - 5, 0, COLS - 1, "mid", P.dcyan);
    if (msg) put(g, ROWS - 4, 2, msg.slice(0, COLS - 4), /INVALID|UNKNOWN|INSUFFICIENT|REQUIRED|NOT |NO SUCH|FULL|FIRST|CAN'T|PART TIME/.test(msg) ? P.red
      : /ORDERED|PURCHASED|SET:|ARMED|ACCEPTED|SILENCED|WELCOME|CLEARED|SAVED|HIRED/.test(msg) ? P.grn : P.yel);
    const label = `${screen.prompt || "SELECTION"}: `;
    put(g, ROWS - 3, 2, label, P.cyan); put(g, ROWS - 3, 2 + label.length, input, P.hi); put(g, ROWS - 3, 2 + label.length + input.length, blink ? "█" : " ", P.hi);
    keyBar(g, ROWS - 1, [["F1", "HELP", press("F1")], ...(screen.pager ? [["N", "NEXT", () => { msg = ""; screen.submit("N"); }], ["P", "PREV", () => { msg = ""; screen.submit("P"); }]] : [["F2", "FIND", press("F2")]]),
      ["ENTER", "OK", press("Enter")], ["ESC", "BACK", press("Escape")], ["F10", "LOG OFF", press("F10")]]);
  }
  // a body line: plain text, colored by what it looks like (or { t, head: true } for a column heading)
  function colorLine(g, r, l) {
    const head = typeof l === "object" && l, t = (head ? l.t : l || "").slice(0, COLS - 2);
    if (head) { tint(g, r, 1, COLS - 2, P.yel, P.deep); put(g, r, 1, t, P.yel); return; }
    put(g, r, 1, t, P.fg);
    const lab = /^(\s*[A-Z#][A-Z #/.'-]*?\.{2,}:)/.exec(t);   // " TITLE....: value"
    if (lab) { tint(g, r, 1, lab[1].length, P.cyan); tint(g, r, 1 + lab[1].length, COLS - 2, P.hi); }
    const mark = (re, fg) => { for (const m of t.matchAll(re)) tint(g, r, 1 + m.index, m.index + m[0].length, fg); };
    mark(/\$-?[\d,]+\.\d\d/g, P.grn); mark(/PAGE \d+ OF \d+/g, P.gray);
    mark(/\bON SHELF\b|\bREGULAR\b|GOOD STANDING|\bINSTALLED\b/g, P.grn);
    mark(/\bLATE \d+D\b|LOST - STOLEN|\bUNHAPPY\b|\bDISARMED\b/g, P.red); mark(/\*\*\*[^*]*\*\*\*/g, P.red);
  }
  const pickRect = (pk, i) => { if (pk.rect) return pk.rect(i); const l = pk.line(i); return l >= 0 && l < layout.rows ? { r: layout.top + l, c0: 1, c1: COLS - 2 } : null; };

  function frame() {                               // -> the grid for this moment
    const g = blankGrid(); hits = [];
    box(g, 0, 0, ROWS - 2, COLS - 1, true, P.dcyan);
    if (mode === "login") { loginScreen(g); return g; }
    const big = screen === mainMenu, top = big ? 9 : 3, rows = ROWS - 5 - top;   // the body runs down to the footer's divider
    layout = { top, rows };
    if (big) headerBig(g); else headerSmall(g);
    if (screen.render) screen.render(g, top, rows);
    else screen.lines().slice(0, rows).forEach((l, i) => colorLine(g, top + i, l));
    const pk = screen.pick;
    if (pk && pk.count()) { pk.cur = Math.min(pk.cur, pk.count() - 1); const rc = pickRect(pk, pk.cur); if (rc) tint(g, rc.r, rc.c0, rc.c1, P.bg, P.sel); }
    footer(g);
    return g;
  }

  // ---- the login screen: what the monitor shows whenever nobody's logged in ----
  function loginScreen(g) {
    logo(g, 2, Math.floor((COLS - LOGO_W) / 2)); center(g, 6, TAG, P.cyan);
    const x0 = 19, x1 = 60, y0 = 8, y1 = 14;
    box(g, y0, x0, y1, x1, false, P.dcyan); center(g, y0, " SECURE LOGIN ", P.yel, null, x0, x1);
    const field = (r, k, v, fg = P.hi) => { put(g, r, x0 + 3, k, P.cyan); put(g, r, x0 + 3 + k.length + 1, v, fg); };
    field(y0 + 1, "STORE.....:", "#0417  ELM ST PLAZA"); field(y0 + 2, "TERMINAL..:", "REGISTER 01");
    field(y0 + 3, "EMPLOYEE..:", login >= 1 ? "0042  (BADGE)" : "____", login >= 1 ? P.hi : P.gray);
    field(y0 + 4, "PASSWORD..:", login >= 2 ? "*".repeat(Math.min(6, login - 1)).padEnd(6, "_") : "______", login >= 2 ? P.hi : P.gray);
    field(y0 + 5, "STATUS....:", login >= 9 ? "ACCESS GRANTED" : login >= 8 ? "VERIFYING..." : "READY", login >= 9 ? P.grn : login >= 8 ? P.yel : P.fg);
    const btn = login ? "              " : "[  LOG IN  ]";
    center(g, y1 + 2, btn, P.blk, login ? null : P.dcyan);
    if (!login) { const c0 = Math.floor((COLS - btn.length) / 2); hits.push({ r: y1 + 2, c0, c1: c0 + btn.length - 1, act: startLogin }); }
    center(g, y1 + 4, login ? "" : "SWIPE BADGE OR PRESS ENTER TO LOG IN", !open || blink ? P.yel : P.bg);
    rule(g, 20, 0, COLS - 1, "mid", P.dcyan);
    const late = rentals.filter(r => daysLate(r)).length, f = api.feature?.();
    put(g, 21, 2, "RETURNS BIN", P.cyan); put(g, 21, 14, R(api.returnBin().length, 3), P.hi);
    put(g, 22, 2, "OVERDUE....", P.cyan); put(g, 22, 14, R(late, 3), late ? P.red : P.hi);
    put(g, 23, 2, "MEMBERS....", P.cyan); put(g, 23, 14, R(members().length, 3), P.hi);
    put(g, 21, 24, "TONIGHT...", P.cyan); put(g, 21, 35, f ? `${up(f.title).slice(0, 26)} 8PM` : "NO FEATURE", f ? P.hi : P.gray);
    put(g, 22, 24, "GATES.....", P.cyan); put(g, 22, 35, api.alarm() ? "*** ALARM ***" : api.gatesArmed() ? "ARMED" : "DISARMED", api.alarm() ? P.red : api.gatesArmed() ? P.grn : P.red);
    const nm = inboxCount(); put(g, 24, 2, "MESSAGES...", P.cyan); put(g, 24, 14, R(nm, 3), nm ? P.red : P.hi);
    put(g, 23, 24, "BUDGET....", P.cyan); put(g, 23, 35, money(budget), budget < 0 ? P.red : P.grn);
    const when = `${WD[TODAY.getDay()]} ${fmtD(TODAY)}`; put(g, 21, COLS - 3 - when.length, when, P.yel); put(g, 22, COLS - 3 - clock().length, clock(), P.yel);
    put(g, 23, COLS - 21, "SCO UNIX 3.2 · TTY01", P.gray);
    put(g, ROWS - 3, 2, `LAST LOGIN: ${fmtD(new Date(TODAY - DAY))} 21:47 ON TTY01`, P.gray);
    keyBar(g, ROWS - 1, open ? [["ENTER", "LOG IN", startLogin], ["ESC", "WALK AWAY", press("Escape")]] : []);
  }
  let loginTimers = [];
  function startLogin() {                          // the badge, the password, a beat to verify, and in
    if (login) return;
    const steps = [[0, 1], [160, 2], [230, 3], [300, 4], [370, 5], [440, 6], [510, 7], [580, 8], [950, 9]];
    loginTimers = steps.map(([t, s]) => setTimeout(() => { login = s; draw(); }, t));
    loginTimers.push(setTimeout(() => {
      login = 0; user = "0042"; mode = "app"; stack.length = 0; screen = mainMenu; input = "";
      msg = `BADGE ACCEPTED. WELCOME BACK. LAST LOGIN: ${fmtD(new Date(TODAY - DAY))} 21:47 ON TTY01`; draw();
    }, 1250));
  }
  function loginReset() { loginTimers.forEach(clearTimeout); loginTimers = []; login = 0; }

  // ---- painting a grid onto a canvas ----
  const BLOCKS = { "█": [0, 1, 1], "▀": [0, 0.5, 1], "▄": [0.5, 1, 1], "░": [0, 1, 0.25], "▒": [0, 1, 0.5], "▓": [0, 1, 0.75] };   // [top, bottom, alpha]
  function boxLines(x, ch, l, t, w, h, lw) {        // a box-drawing character as strokes; -> false if it isn't one
    const r = l + w, b = t + h, o = lw % 2 ? 0.5 : 0, cx = Math.round(l + w / 2) + o, cy = Math.round(t + h / 2) + o, d = Math.max(2, Math.round(w * 0.2));
    const S = [];
    const s = (a, b2, c, e) => S.push([a, b2, c, e]);
    switch (ch) {
      case "─": s(l, cy, r, cy); break; case "│": s(cx, t, cx, b); break;
      case "┌": s(cx, cy, r, cy); s(cx, cy, cx, b); break; case "┐": s(l, cy, cx, cy); s(cx, cy, cx, b); break;
      case "└": s(cx, t, cx, cy); s(cx, cy, r, cy); break; case "┘": s(cx, t, cx, cy); s(l, cy, cx, cy); break;
      case "├": s(cx, t, cx, b); s(cx, cy, r, cy); break; case "┤": s(cx, t, cx, b); s(l, cy, cx, cy); break;
      case "┬": s(l, cy, r, cy); s(cx, cy, cx, b); break; case "┴": s(l, cy, r, cy); s(cx, t, cx, cy); break;
      case "┼": s(l, cy, r, cy); s(cx, t, cx, b); break;
      case "═": s(l, cy - d, r, cy - d); s(l, cy + d, r, cy + d); break;
      case "║": s(cx - d, t, cx - d, b); s(cx + d, t, cx + d, b); break;
      case "╔": s(cx - d, cy - d, r, cy - d); s(cx - d, cy - d, cx - d, b); s(cx + d, cy + d, r, cy + d); s(cx + d, cy + d, cx + d, b); break;
      case "╗": s(l, cy - d, cx + d, cy - d); s(cx + d, cy - d, cx + d, b); s(l, cy + d, cx - d, cy + d); s(cx - d, cy + d, cx - d, b); break;
      case "╚": s(cx - d, t, cx - d, cy + d); s(cx - d, cy + d, r, cy + d); s(cx + d, t, cx + d, cy - d); s(cx + d, cy - d, r, cy - d); break;
      case "╝": s(cx + d, t, cx + d, cy + d); s(l, cy + d, cx + d, cy + d); s(cx - d, t, cx - d, cy - d); s(l, cy - d, cx - d, cy - d); break;
      case "╠": s(cx - d, t, cx - d, b); s(cx + d, t, cx + d, cy - d); s(cx + d, cy - d, r, cy - d); s(cx + d, b, cx + d, cy + d); s(cx + d, cy + d, r, cy + d); break;
      case "╣": s(cx + d, t, cx + d, b); s(cx - d, t, cx - d, cy - d); s(l, cy - d, cx - d, cy - d); s(cx - d, b, cx - d, cy + d); s(l, cy + d, cx - d, cy + d); break;
      case "╟": s(cx - d, t, cx - d, b); s(cx + d, t, cx + d, b); s(cx + d, cy, r, cy); break;
      case "╢": s(cx - d, t, cx - d, b); s(cx + d, t, cx + d, b); s(l, cy, cx - d, cy); break;
      case "╤": s(l, cy - d, r, cy - d); s(l, cy + d, r, cy + d); s(cx, cy + d, cx, b); break;
      case "╧": s(l, cy - d, r, cy - d); s(l, cy + d, r, cy + d); s(cx, t, cx, cy - d); break;
      default: return false;
    }
    x.beginPath(); for (const [a, b2, c, e] of S) { x.moveTo(a, b2); x.lineTo(c, e); } x.stroke(); return true;
  }
  function paint(cv, g) {
    const x = cv.getContext("2d"), W = cv.width, H = cv.height, cw = W / COLS, ch = H / ROWS;
    const X = c => Math.round(c * cw), Y = r => Math.round(r * ch);
    x.fillStyle = P.bg; x.fillRect(0, 0, W, H);
    x.font = `${Math.round(ch * 1.0)}px ${FONT}`; x.textBaseline = "middle"; x.textAlign = "center";
    const lw = Math.max(1, Math.round(ch / 13)); x.lineWidth = lw; x.lineCap = "square";
    g.forEach((row, r) => {
      for (let c = 0; c < COLS;) {                 // backgrounds, in runs
        let e = c; while (e + 1 < COLS && row[e + 1].bg === row[c].bg) e++;
        if (row[c].bg !== P.bg) { x.fillStyle = row[c].bg; x.fillRect(X(c), Y(r), X(e + 1) - X(c), Y(r + 1) - Y(r)); }
        c = e + 1;
      }
      row.forEach((k, c) => {
        const l = X(c), t = Y(r), w = X(c + 1) - l, h = Y(r + 1) - t;
        if (k.px) { const m = Math.round(h / 2); x.fillStyle = k.px[0]; x.fillRect(l, t, w, m); x.fillStyle = k.px[1]; x.fillRect(l, t + m, w, h - m); return; }
        if (k.ch === " ") return;
        const bl = BLOCKS[k.ch];
        if (bl) { x.globalAlpha = bl[2]; x.fillStyle = k.fg; x.fillRect(l, t + Math.round(h * bl[0]), w, Math.round(h * (bl[1] - bl[0]))); x.globalAlpha = 1; return; }
        x.strokeStyle = k.fg; if (boxLines(x, k.ch, l, t, w, h, lw)) return;
        x.fillStyle = k.fg; x.fillText(k.ch, l + w / 2, t + h * 0.54);
      });
    });
    x.fillStyle = "rgba(0,0,0,.13)"; for (let y = 0; y < H; y += 3) x.fillRect(0, y + 2, W, 1);   // scanlines
    const v = x.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.95);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.45)"); x.fillStyle = v; x.fillRect(0, 0, W, H);
  }
  // ---- the register: a sale window over whatever's on screen while someone's being rung up.
  // store.js hands it the sale (see ring() below); the member's account comes from here ----
  let sale = null;
  function saleWindow(g) {
    const s = sale, m = s.member, r0 = 1, r1 = ROWS - 3, c0 = 1, c1 = COLS - 2, W = c1 - c0 - 3;
    for (let r = r0; r <= r1; r++) tint(g, r, c0, c1, P.fg, P.deep), put(g, r, c0, " ".repeat(c1 - c0 + 1));
    box(g, r0, c0, r1, c1, true, P.cyan); put(g, r0, c0 + 2, s.signup ? " NEW MEMBER " : " REGISTER · SALE ", P.yel);
    if (s.clerk) put(g, r0, c1 - s.clerk.length - 9, ` CLERK: ${s.clerk} `, P.fg);
    let r = r0 + 1; const line = (t, fg = P.fg) => { put(g, r, c0 + 2, L(t, W), fg); r++; };
    const lr = (l, v, fg = P.fg, vfg = P.hi) => { put(g, r, c0 + 2, L(l, W), fg); put(g, r, c1 - 2 - v.length, v, vfg); r++; };
    if (s.carded === null) { r++; line("  CASH SALE · NO MEMBER CARD", P.gray); r++; }
    else if (!s.carded) { r++; line(blink ? `  ► ${s.signup ? "ENTER NEW MEMBER" : "TAP MEMBER CARD ON READER"}` : "", P.yel); r++; }
    else {
      const loy = m.loyalty || 0, fees = custFees(m), late = m.rentals.filter(daysLate).length;
      lr(`#${m.num}  ${up(fullName(m))}`, `SINCE ${m.since}`, P.hi, P.cyan);
      line(`LOYALTY ${"*".repeat(Math.round((loy + 100) / 40)).padEnd(5, ".")}  ${loy >= 40 ? "REGULAR" : loy <= -40 ? "UNHAPPY" : ""}${m.likes ? `   LIKES: ${up(m.likes)}` : ""}`, loy <= -40 ? P.red : P.fg);
      const st = m.status === "banned" && m.until > +TODAY ? `*** BANNED UNTIL ${fmtD(new Date(m.until))} ***` : m.status === "cancelled" ? "*** MEMBERSHIP CANCELLED ***" : m.status === "arrested" ? "*** DO NOT RENT ***" : "";
      line(st || `OUT: ${m.rentals.length}/${RENT_MAX} TAPES${late ? ` · ${late} LATE` : ""}${fees ? ` · FEES ${money(fees)}` : " · GOOD STANDING"}`, st || late || fees ? P.red : P.grn);
      if (m.notes) line(`NOTES: ${m.notes}`, P.yel);
      const inc = m.incidents?.at(-1); if (inc) line(`INCIDENT ${fmtD(new Date(inc.at))}: ${up(inc.what)}`, P.red);
    }
    rule(g, r++, c0, c1, "mid", P.cyan);
    for (const [name, price] of s.items.slice(0, 7)) lr(`  ${up(name)}`, money(price));
    if (s.items.length > 7) line(`  ... ${s.items.length - 7} MORE`);
    if (s.feesCharged) lr("  LATE FEES", money(s.feesCharged), P.red, P.red);
    if (s.feesWaived) lr("  LATE FEES WAIVED", `-${money(s.feesWaived)}`, P.gray, P.gray);
    r = Math.max(r, r1 - 6); rule(g, r++, c0, c1, "mid", P.cyan);
    if (!s.signup) {
      lr("TOTAL DUE", money(s.total), P.yel, P.yel);
      if (s.cashIn != null) lr("CASH TENDERED", money(s.cashIn), P.fg, P.grn);
      if (s.cashIn != null) lr("CHANGE DUE", s.change ? money(s.change) : "EXACT", P.fg, s.change && blink ? P.yel : P.hi);
    }
    if (s.next) { r = r1 - 1; line(`► ${up(s.next)}`, P.cyan); }
  }
  function draw() {
    const g = frame();
    if (sale && (!open || mode === "login")) saleWindow(g);   // (at the keyboard, logged in, the screen's yours: the sale waits)
    const k = hover && g[hover.r]?.[hover.c];      // the mouse's cell, inverted (on the monitor too)
    if (k && !k.px) { const sel = k.bg === P.sel; k.bg = sel ? P.bg : P.sel; k.fg = sel ? P.sel : P.bg; }
    paint(canvas, g); api.onRedraw(canvas);
    if (open) {
      const dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.round(view.clientWidth * dpr), h = Math.round(view.clientHeight * dpr);
      if (w && (view.width !== w || view.height !== h)) { view.width = w; view.height = h; }
      paint(view, g);
    }
  }
  let lastIdle = "";
  setInterval(() => {                              // the cursor blinks while you're at it; the idle screen's clock and counts keep up
    if (open || sale) { blink = !blink; draw(); return; }   // (a sale on the register blinks too)
    const k = `${mode}|${clock()}|${api.returnBin().length}|${api.alarm()}`; if (k !== lastIdle) { lastIdle = k; blink = true; draw(); }
  }, 530);

  // ---- app screens ----
  function go(s) { if (screen) stack.push(screen); screen = s; input = ""; msg = ""; draw(); }
  function back() { input = ""; msg = ""; if (stack.length) { screen = stack.pop(); draw(); } else logoff(); }
  // a paged, numbered pick list
  function listScreen(title, head, items, row, onPick, empty = "NO RECORDS FOUND.") {
    const per = BODY - 2; let page = 0;
    const pages = () => Math.max(1, Math.ceil(items.length / per));
    const scr = {
      title: `${title}  (${items.length} RECORD${items.length === 1 ? "" : "S"})`, pager: true, prompt: onPick ? "RECORD # OR N/P" : "N/P OR ESC",
      lines: () => items.length ? [{ t: head, head: true }, ...items.slice(page * per, page * per + per).map((it, i) => row(it, page * per + i + 1)),
        ...Array(Math.max(0, per - (items.length - page * per))).fill(""), R(`PAGE ${page + 1} OF ${pages()} `, COLS - 1)] : ["", " " + empty],
      submit(v) {
        if (v === "N") { if (page < pages() - 1) page++; else msg = "LAST PAGE."; return draw(); }
        if (v === "P") { if (page > 0) page--; else msg = "FIRST PAGE."; return draw(); }
        const n = parseInt(v, 10);
        if (onPick && n >= 1 && n <= items.length) return onPick(items[n - 1]);
        msg = "INVALID SELECTION."; draw();
      },
    };
    // arrow keys walk the records (turning pages as needed); ENTER opens the highlighted one
    if (onPick && items.length) scr.pick = { cur: 0, count: () => items.length, value: i => String(i + 1),
      line: i => 1 + i - page * per, moved: i => { page = Math.floor(i / per); } };
    return scr;
  }
  function prompt(title, label, help, onValue) {
    return { title, prompt: label, lines: () => ["", ...help.map(h => " " + h)], submit(v) { if (v) onValue(v); else { msg = "ENTRY REQUIRED."; draw(); } } };
  }

  const tName = t => /^Season (\d+)/.test(t.seasons?.[0]?.label || "") ? `${t.title} S${t.seasons[0].label.slice(7)}` : t.title;   // which tape of a show
  const titleRow = (t, n) => ` ${R(n, 3)}  ${L(up(tName(t)), 36)} ${L(up(t.category), 20)} ${L(yearOf(t), 4)} ${R(copiesOf(t).length, 3)} ${R(copyIn(t), 3)}`;
  const titleHead = `      ${L("TITLE", 36)} ${L("SECTION", 20)} YEAR CPY  IN`;
  function titleDetail(t) {
    const p = priceOf(t), eps = t.seasons.reduce((a, s) => a + s.episodes.length, 0);
    const cs = copiesOf(t);
    go({
      title: `TITLE INQUIRY - ${up(tName(t))}`.slice(0, COLS - 2), prompt: api.requests?.(t).length ? "COPY # FOR RENTER, A FOR ALERT, ESC" : "COPY # FOR RENTER, ESC",
      lines: () => [
        ` TITLE....: ${up(t.title)}`.slice(0, COLS),
        ` SECTION..: ${up(t.category)}${isTV(t) ? `        FORMAT: TV SERIES, ${t.seasons.length} VOL / ${eps} EP` : "        FORMAT: FEATURE"}`,
        ` YEAR.....: ${yearOf(t) || "N/A"}       SKU: VB-${(t.id.split("").reduce((a, c) => a * 31 + c.charCodeAt(0) >>> 0, 7) % 900000 + 100000)}`,
        ` CLASS....: ${p.cls}  ${p.nights}-NIGHT ${money(p.rate)}   LATE ${money(p.late)}/DAY`,
        ` STOCK....: ${cs.length} COPIES, ${copyIn(t)} IN / ${cs.length - copyIn(t)} OUT`,
        ...(api.requests?.(t) || []).map((r, i) => `${i ? "           " : " REQUEST..:"} HOLD FOR ${r.name}, IN ~${r.at}${r.alert ? "   *** ALERT: HOLD NEXT RETURN ***" : ""}`.slice(0, COLS)), "",
        { t: "  COPY  STATUS", head: true }, ...cs.slice(0, 12).map((c, i) => `  ${String(i + 1).padStart(2, "0")}    ${copyStatus(c)}`),
        ...(cs.length > 12 ? [`  ... ${cs.length - 12} MORE`] : []),
      ],
      submit(v) {
        const rq = api.requests?.(t) || [];
        if (v === "A" && rq.length) { const on = !rq[0].alert; api.setAlert(t, on); msg = on ? "ALERT SET: NEXT RETURN OF THIS TITLE GOES ON THE HOLDS SHELF." : "ALERT CLEARED."; return draw(); }
        const c = cs[parseInt(v, 10) - 1];
        if (c?.rental) return custDetail(c.rental.cust);
        msg = c ? "COPY IS NOT CHECKED OUT." : "INVALID SELECTION."; draw();
      },
    });
  }
  function custDetail(c) {
    go({
      title: `MEMBER INQUIRY - #${c.num}`, prompt: "RENTAL # FOR TITLE, ESC",
      lines: () => [
        ` MEMBER #.: ${c.num}                 MEMBER SINCE: ${c.since}`,
        ` NAME.....: ${fullName(c)}`,
        ` ADDRESS..: ${c.addr}`,
        ` PHONE....: ${c.phone}                LIFETIME RENTALS: ${c.lifetime + c.rentals.length}`,
        ` STATUS...: ${c.status === "arrested" ? "*** ARRESTED - DO NOT RENT ***" : c.status === "cancelled" ? "*** MEMBERSHIP CANCELLED ***"
          : c.status === "banned" && c.until > +TODAY ? `*** BANNED UNTIL ${fmtD(new Date(c.until))} ***` : custFees(c) ? `FEES DUE ${money(custFees(c))} - COLLECT BEFORE RENTAL` : c.rentals.length ? "ACTIVE" : "GOOD STANDING"}`,
        ` LOYALTY..: ${"*".repeat(Math.round(((c.loyalty || 0) + 100) / 40)).padEnd(5, ".")}  ${(c.loyalty || 0) >= 40 ? "REGULAR" : (c.loyalty || 0) <= -40 ? "UNHAPPY" : ""}${c.likes ? `      LIKES: ${up(c.likes)}` : ""}`,
        ` NOTES....: ${c.notes || "-"}`,
        ...(c.incidents || []).slice(-3).map((x, i) => ` ${i ? "         " : "INCIDENT."}: ${fmtD(new Date(x.at))} ${up(x.what)}`.slice(0, COLS)), "",
        c.rentals.length ? { t: `  #   ${L("OUT", 9)}${L("DUE", 9)}${L("TITLE", 38)}LATE FEE`, head: true } : "  NO RENTALS OUT.",
        ...c.rentals.slice(0, 9).map((r, i) => `  ${i + 1}   ${L(fmtD(r.out), 9)}${L(fmtD(r.due), 9)}${L(up(r.copy.title), 38)}${daysLate(r) ? money(lateFee(r)) : "-"}`),
      ],
      submit(v) { const r = c.rentals[parseInt(v, 10) - 1]; if (r) titleDetail(titleOf(r.copy)); else { msg = "INVALID SELECTION."; draw(); } },
    });
  }
  const custRow = (c, n) => ` ${R(n, 3)}  ${R(c.num, 6)}  ${L(fullName(c), 26)} ${L(c.phone, 9)} ${R(c.rentals.length, 3)}  ${custFees(c) ? R(money(custFees(c)), 8) : R("-", 8)}`;
  const custHead = `       MEMBR  ${L("NAME", 26)} ${L("PHONE", 9)} OUT      FEES`;
  const findTitles = q => api.catalog.filter(t => up(t.title).includes(q));
  const findCusts = q => members().filter(c => String(c.num) === q || fullName(c).includes(q) || c.phone.endsWith(q));

  // ---- the staff schedule: the week on one grid. Days across, hours down (9 AM, before
  // opening, to midnight), a colored lane per employee in each day; arrows/space or click
  // (and drag) to set hours, TAB or 1-4 for whose lane. Part time: 25 hours a week each ----
  const CREW = [P.cyan, "#ff55ff", P.grn, "#ffaa00"];
  function schedScreen() {
    const info = api.schedInfo, X0 = 8, DW = 10;   // day d's cells: X0 + d*DW .. +DW-2, a bar between days
    const st = { d: TODAY.getDay(), n: Math.max(0, Math.min(info.slots - 1, parseInt(clock(), 10) - info.h0)), e: 0, paint: null };
    const crew = () => api.staffSched();
    const lbl = n => { const h = info.h0 + n; return `${h % 12 || 12}${h < 12 ? "AM" : "PM"}`; };
    const has = (w, d, n) => !!(w.sched[d] >> n & 1);
    function set(d, n, e, on) { const w = crew()[e]; if (!w) return null; const want = on ?? !has(w, d, n); if (want !== has(w, d, n)) msg = api.setSched(w.id, d, n, want) || ""; return want; }
    const laneW = () => Math.max(2, Math.floor(8 / Math.max(1, crew().length)));
    function cellOf(h, top) {                    // a click -> { d, n, e } (or null)
      const n = h.r - top - 1, rel = h.c - (X0 - 1), d = Math.floor(rel / DW), k = rel - d * DW - 2, e = Math.floor(k / laneW());
      return n >= 0 && n < info.slots && d >= 0 && d < 7 && k >= 0 && e < crew().length ? { d, n, e } : null;
    }
    return {
      title: "STAFF - WEEKLY SCHEDULE", prompt: "ARROWS MOVE, SPACE SETS, TAB SWITCHES EMPLOYEE",
      lines: () => [],
      render(g, top) {
        const cw = crew();
        if (!cw.length) { colorLine(g, top + 1, " NO STAFF ON THE PAYROLL YET."); colorLine(g, top + 2, " HIRE SOMEONE UNDER UPGRADES (U): HIRE AN EMPLOYEE."); return; }
        st.e = Math.min(st.e, cw.length - 1);
        const lw = laneW(), today = TODAY.getDay(), nowN = parseInt(clock(), 10) - info.h0;
        tint(g, top, 1, COLS - 2, P.yel, P.deep); put(g, top, 2, "HOUR", P.cyan);
        WD.forEach((d, i) => { const x = X0 + i * DW; put(g, top, x - 1, "│", P.dcyan); center(g, top, i === today ? `${d} ◄` : d, i === today ? P.yel : P.hi, null, x, x + DW - 2); });
        for (let n = 0; n < info.slots; n++) {
          const r = top + 1 + n;
          put(g, r, 2, lbl(n).padStart(4), n === 0 ? P.gray : n === nowN ? P.yel : P.fg);
          for (let d = 0; d < 7; d++) {
            const x = X0 + d * DW; put(g, r, x - 1, "│", P.dcyan);
            cw.forEach((w, e) => {
              const c0 = x + 1 + e * lw, on = has(w, d, n), start = on && (n === 0 || !has(w, d, n - 1));
              if (on) { tint(g, r, c0, c0 + lw - 1, P.blk, CREW[e]); if (start) put(g, r, c0, w.first[0], P.blk); }
              else put(g, r, c0 + (lw >> 1) - (lw > 2 ? 1 : 0), "·", n === 0 ? P.shadow : P.deep);
              if (d === st.d && n === st.n && e === st.e) { tint(g, r, c0, c0 + lw - 1, on ? P.hi : P.blk, on ? P.blk : P.hi); if (!on) put(g, r, c0, " ".repeat(lw), P.blk, P.hi); }
            });
          }
        }
        const lr = top + info.slots + 2; put(g, lr - 1, 1, "─".repeat(COLS - 2), P.dcyan);
        let c = 2;
        cw.forEach((w, e) => {
          const t = `${w.first.toUpperCase().slice(0, 9)} ${w.hours}/${info.max}H`, x = c;
          put(g, lr, x, e === st.e ? "►" : " ", P.yel); put(g, lr, x + 1, "  ", P.blk, CREW[e]); put(g, lr, x + 4, t, e === st.e ? P.hi : P.fg);
          if (w.hours > info.max) tint(g, lr, x + 4, x + 3 + t.length, P.red);
          hits.push({ r: lr, c0: x, c1: x + 3 + t.length, act: () => { st.e = e; draw(); } }); c += t.length + 7;
        });
        const open = Array.from({ length: 7 }, (_, d) => Array.from({ length: info.slots - 1 }, (_, k) => cw.some(w => has(w, d, k + 1))).filter(x => !x).length).reduce((a, b) => a + b, 0);
        const pay = cw.reduce((a, w) => a + w.hours * w.rate, 0);
        put(g, lr + 1, 2, "OPEN HOURS NOBODY'S ON:", P.cyan); put(g, lr + 1, 26, `${open}`, open ? P.yel : P.grn);
        put(g, lr + 1, 34, "WEEKLY PAYROLL:", P.cyan); put(g, lr + 1, 50, money(pay), P.grn);
        put(g, lr + 2, 2, "←↑↓→ MOVE · SPACE SET/CLEAR · SHIFT+ARROWS PAINT · TAB/1-4 WHO · X CLEAR DAY", P.gray);
      },
      keys(e) {
        const n = crew().length; if (!n) return false;
        const mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
        if (mv) { st.d = (st.d + mv[0] + 7) % 7; st.n = Math.max(0, Math.min(info.slots - 1, st.n + mv[1])); if (e.shiftKey) set(st.d, st.n, st.e, true); else msg = ""; draw(); return true; }
        if (e.key === " " || (e.key === "Enter" && !input.trim())) { input = ""; set(st.d, st.n, st.e); draw(); return true; }
        if (e.key === "Tab") { st.e = (st.e + (e.shiftKey ? n - 1 : 1)) % n; draw(); return true; }
        if (/^[1-4]$/.test(e.key) && +e.key <= n) { st.e = +e.key - 1; draw(); return true; }
        if (e.key === "x" || e.key === "X") { for (let k = 0; k < info.slots; k++) set(st.d, k, st.e, false); msg = `CLEARED ${crew()[st.e].first.toUpperCase()}'S ${WD[st.d]}.`; draw(); return true; }
        return e.key.length === 1;                  // (no typing on this screen)
      },
      click(h) { const k = cellOf(h, layout.top); if (!k) return false; Object.assign(st, k); st.paint = set(k.d, k.n, k.e); draw(); return true; },
      drag(h) { const k = cellOf(h, layout.top); if (!k || st.paint === null || k.e !== st.e) return; if (k.d === st.d && k.n === st.n) return; st.d = k.d; st.n = k.n; set(k.d, k.n, k.e, st.paint); draw(); },
    };
  }

  const MENU = [
    ["1", "INVENTORY - TITLE SEARCH", () => go(prompt("INVENTORY - TITLE SEARCH", "TITLE (OR PART)", ["ENTER ANY PART OF A TITLE.  EXAMPLE: ALIEN"],
      q => go(listScreen(`TITLE SEARCH: ${q}`, titleHead, findTitles(q), titleRow, titleDetail))))],
    ["2", "INVENTORY - BROWSE BY SECTION", () => {
      const cats = [...new Set(api.catalog.map(t => t.category))].sort();
      go(listScreen("SECTIONS", `      ${L("SECTION", 30)} TITLES  COPIES  OUT`, cats,
        (c, n) => { const ts = api.catalog.filter(t => t.category === c), cp = ts.reduce((a, t) => a + copiesOf(t).length, 0), inn = ts.reduce((a, t) => a + copyIn(t), 0);
          return ` ${R(n, 3)}  ${L(up(c), 30)} ${R(ts.length, 6)}  ${R(cp, 6)}  ${R(cp - inn, 3)}`; },
        c => go(listScreen(up(c), titleHead, api.catalog.filter(t => t.category === c), titleRow, titleDetail))));
    }],
    ["3", "MEMBERS - LOOKUP (NAME / MEMBER # / PHONE)", () => go(prompt("MEMBER LOOKUP", "NAME, MEMBER # OR PHONE", ["LAST NAME, PART OF A NAME, 5-DIGIT MEMBER #, OR LAST 4 OF PHONE."],
      q => go(listScreen(`MEMBER SEARCH: ${q}`, custHead, findCusts(q), custRow, custDetail))))],
    ["4", "MEMBERS - ALL ACCOUNTS", () => go(listScreen("ALL MEMBERS", custHead, members(), custRow, custDetail))],
    ["5", "REPORTS - OVERDUE / LATE FEES", () => {
      const od = members().filter(c => custFees(c) > 0).sort((a, b) => custFees(b) - custFees(a));
      go(listScreen("OVERDUE ACCOUNTS", custHead, od, custRow, custDetail, "NO OVERDUE ACCOUNTS. NICE."));
    }],
    ["6", "REPORTS - RENTALS OUT", () => {
      const out = [...rentals].sort((a, b) => a.due - b.due);
      go(listScreen("RENTALS OUT", `      ${L("TITLE", 34)} ${L("MEMBER", 20)} DUE      LATE`, out,
        (r, n) => ` ${R(n, 3)}  ${L(up(r.copy.title), 34)} ${L(fullName(r.cust), 20)} ${fmtD(r.due)} ${daysLate(r) ? R(daysLate(r) + "D", 4) : "   -"}`,
        r => custDetail(r.cust)));
    }],
    ["7", "RETURNS BIN - CHECK-IN QUEUE", () => go(listScreen("RETURNS BIN", titleHead, api.returnBin().map(titleOf),
      titleRow, titleDetail, "RETURNS BIN IS EMPTY."))],
    ["8", "REPORTS - DAILY SUMMARY", () => {
      const allC = api.catalog.reduce((a, t) => a + copiesOf(t).length, 0), inC = api.catalog.reduce((a, t) => a + copyIn(t), 0);
      const today = rentals.filter(r => Math.round((TODAY - r.out) / DAY) === 0);
      const od = rentals.filter(r => daysLate(r));
      const fees = rentals.reduce((a, r) => a + lateFee(r), 0);
      const top = [...api.catalog].filter(t => t.copies?.length).sort((a, b) => (copiesOf(b).length - copyIn(b)) - (copiesOf(a).length - copyIn(a))).slice(0, 5);
      go({ title: `DAILY SUMMARY - ${fmtD(TODAY)}`, prompt: "ESC TO RETURN", lines: () => [
        ` TITLES IN SYSTEM........ ${R(api.catalog.length, 8)}      MEMBERS............ ${R(members().length, 8)}`,
        ` COPIES IN SYSTEM........ ${R(allC, 8)}      ACCOUNTS W/ FEES... ${R(members().filter(c => custFees(c)).length, 8)}`,
        ` COPIES ON SHELF......... ${R(inC, 8)}      LATE FEES OWED..... ${R(money(fees), 8)}`,
        ` COPIES OUT.............. ${R(allC - inC, 8)}      RETURNS BIN........ ${R(api.returnBin().length, 8)}`,
        ` OVERDUE COPIES.......... ${R(od.length, 8)}`, "",
        ` RENTALS TODAY........... ${R(today.length, 8)}      GROSS TODAY........ ${R(money(today.reduce((a, r) => a + priceOf(r.copy).rate, 0)), 8)}`, "",
        "  MOST RENTED RIGHT NOW:", ...top.map((t, i) => `   ${i + 1}. ${L(up(t.title), 40)} ${copiesOf(t).length - copyIn(t)} OF ${copiesOf(t).length} OUT`),
      ], submit() { back(); } });
    }],
    ["M", "MESSAGES - CALLS TO MAKE, MISSED CALLS", () => go(messagesScreen())],
    ["9", "LOUNGE - PREVIEW STATION STATUS", () => go({ title: "PREVIEW STATION", prompt: "ESC TO RETURN", lines: () => {
      const p = api.playing();
      return p ? ["", ` VCR......: PLAYING`, ` TAPE.....: ${up(p.tape.title)}`, ` SECTION..: ${up(p.tape.category)}`]
        : ["", " VCR......: EMPTY", "", " INSERT A TAPE AT THE LOUNGE TV TO PREVIEW IT."];
    }, submit() { back(); } })],
    ["H", "HELP / COMMANDS", () => go({ title: "HELP", prompt: "ESC TO RETURN", lines: () => [
      " FROM THE MAIN MENU YOU CAN TYPE A NUMBER, OR A COMMAND:", "",
      "   FIND <TITLE>     TITLE SEARCH            MEMBER <NAME|#>   MEMBER LOOKUP",
      "   OVERDUE          LATE FEE REPORT         OUT               RENTALS OUT",
      "   RETURNS          RETURNS BIN             REPORT            DAILY SUMMARY",
      "   VER              VERSION                 LOGOFF / EXIT     END SESSION",
      "   SUPPLIES         ORDER SNACKS/DRINKS     UPGRADES          STORE IMPROVEMENTS",
      "   THEATER          TONIGHT'S FEATURE       REPLACE           ORDER LOST COPIES",
      "   SCHEDULE         THE STAFF'S WEEK        SYSRESET          WIPE THE SAVED STORE",
      "   MESSAGES         CALLS TO MAKE, NOTES", "",
      " ESC GOES BACK ONE SCREEN. F10 LOGS OFF FROM ANYWHERE.", "",
      " SYSTEM PROBLEMS? CALL DENNIS (DISTRICT) - DO NOT REBOOT THE SERVER.",
    ], submit() { back(); } })],
    ["S", "SECURITY - GATE SYSTEM", () => go({ title: "SECURITY GATE SYSTEM", prompt: "Y TO CHANGE, ESC TO CANCEL", lines: () => {
      const armed = api.gatesArmed();
      return ["", ` SYSTEM STATUS..: ${armed ? "ARMED" : "*** DISARMED ***"}`, " ZONE...........: ENTRY LANE (3 PEDESTALS)",
        ` ALARM..........: ${api.alarm() ? "SOUNDING" : "QUIET"}`, "",
        armed ? " DISARM THE GATES? TAGGED TAPES WILL PASS THROUGH WITHOUT AN ALARM." : " RE-ARM THE GATES?",
        "", armed ? " STORE POLICY: GATES STAY ARMED DURING BUSINESS HOURS." : " REMEMBER TO RE-ARM BEFORE OPENING."];
    }, submit(v) {
      if (v !== "Y") { msg = "TYPE Y TO CHANGE."; return draw(); }
      const arm = !api.gatesArmed(); api.armGates(arm); back(); msg = arm ? "GATES ARMED." : "GATES DISARMED - NO ALARMS WILL SOUND."; draw();
    } })],
    ["B", "BUDGET - ORDER REPLACEMENT COPIES", () => {
      const lost = api.catalog.flatMap(copiesOf).filter(c => c.lost);
      go(listScreen(`LOST / STOLEN COPIES - BUDGET ${money(budget)}`, `      ${L("TITLE", 44)} ${L("CLASS", 12)}    COST`, lost,
        (c, n) => ` ${R(n, 3)}  ${L(up(c.title), 44)} ${L(priceOf(c).cls, 12)} ${R(money(replaceCost(c)), 7)}`,
        c => go({ title: "ORDER REPLACEMENT", prompt: "Y TO ORDER, ESC TO CANCEL", lines: () => ["",
          ` TITLE....: ${up(c.title)}`.slice(0, COLS), ` COST.....: ${money(replaceCost(c))}`, ` BUDGET...: ${money(budget)}`, "",
          budget >= replaceCost(c) ? " ARRIVES WITH TOMORROW'S DELIVERY - IN THE RETURNS BIN." : " *** INSUFFICIENT BUDGET ***"],
          submit(v) {
            if (v !== "Y") { msg = "TYPE Y TO ORDER."; return draw(); }
            if (!c.lost) { back(); return; }
            if (budget < replaceCost(c)) { msg = "INSUFFICIENT BUDGET."; return draw(); }
            budget -= replaceCost(c); c.lost = false; api.replace(c);   // store.js delivers it next morning
            back(); back(); msg = `ORDERED: ${up(c.title)}. BUDGET NOW ${money(budget)}.`; draw();
          } }),
        "NO LOST COPIES ON FILE."));
    }],
    ["T", "THEATER - TONIGHT'S FEATURE (8 PM)", () => {
      const f = api.feature?.(), films = api.featureChoices?.() || [];
      go(listScreen(`THEATER - ${f ? `${f.day}: ${up(f.title)} (${f.sold} SOLD)` : "NO FEATURE SET"}`.slice(0, COLS - 2), `      ${L("FILM (MOST POPULAR ON THE SHELF)", 50)} YEAR`, films,
        (t, n) => ` ${R(n, 3)}  ${L(up(t.title), 50)} ${yearOf(t)}`,
        t => { const err = api.setFeature(t); back(); msg = err || `FEATURE SET: ${up(t.title)} AT 8 PM. TICKETS $4.00 AT THE REGISTER.`; draw(); },
        "NO FILMS ON THE SHELF."));
    }, () => api.theaterOpen?.() !== false],
    ["U", "UPGRADES - STORE IMPROVEMENTS", () => {
      const items = api.upgrades?.() || [];
      go(listScreen(`UPGRADES - BUDGET ${money(budget)}`, `      ${L("UPGRADE", 23)} ${L("", 37)}   COST`, items,
        (u, n) => ` ${R(n, 3)}  ${L(u.owned ? `${u.name} *` : u.name, 23)} ${L(u.owned ? "INSTALLED" : u.ranToday ? "RAN TODAY" : u.desc, 37)} ${R(money(u.cost), 7)}`,
        u => go({ title: "PURCHASE UPGRADE", prompt: "Y TO BUY, ESC TO CANCEL", lines: () => ["", ` UPGRADE..: ${u.name}`, ` WHAT.....: ${u.desc}`, ` COST.....: ${money(u.cost)}`, ` BUDGET...: ${money(budget)}`],
          submit(v) {
            if (v !== "Y") { msg = "TYPE Y TO BUY."; return draw(); }
            if (budget < u.cost) { msg = "INSUFFICIENT BUDGET."; return draw(); }
            const err = api.buyUpgrade(u.id); if (err) { msg = err; return draw(); }
            budget -= u.cost; back(); back(); msg = `PURCHASED: ${u.name}. BUDGET NOW ${money(budget)}.`; draw();
          } }),
        "NO UPGRADES AVAILABLE."));
    }],
    ["O", "SUPPLIES - ORDER SNACKS & DRINKS", () => {
      const items = api.supplies?.() || [];
      go(listScreen(`SUPPLIES - BUDGET ${money(budget)}`, `      ${L("ITEM", 26)} ${L("TYPE", 6)} RACK   STOCK  ON ORDER   CASE`, items,
        (x, n) => ` ${R(n, 3)}  ${L(up(x.name), 26)} ${L(x.drink ? "DRINK" : "SNACK", 6)} ${R(`${x.out}/${x.spots}`, 5)} ${R(x.back, 6)} ${R(x.ordered || "-", 9)} ${R(money(x.caseCost), 7)}`,
        x => go({ title: "ORDER SUPPLIES", prompt: "CASES (1-9), ESC TO CANCEL", lines: () => ["",
          ` ITEM.....: ${up(x.name)} (${x.drink ? "DRINK" : "SNACK"})`, ` ON RACKS.: ${x.out} OF ${x.spots} SPOTS`, ` IN STOCK.: ${x.back}`, ` ON ORDER.: ${x.ordered}`,
          ` CASE.....: ${x.caseQty} FOR ${money(x.caseCost)}`, ` BUDGET...: ${money(budget)}`, "", " ORDERS ARRIVE WITH TOMORROW MORNING'S DELIVERY, BOXED BY THE FRONT DOOR."],
          submit(v) {
            const n = parseInt(v, 10);
            if (!(n >= 1 && n <= 9)) { msg = "ENTER 1-9 CASES."; return draw(); }
            if (budget < n * x.caseCost) { msg = "INSUFFICIENT BUDGET."; return draw(); }
            budget -= n * x.caseCost; api.order(x.name, n);
            back(); back(); msg = `ORDERED ${n} CASE${n > 1 ? "S" : ""} OF ${up(x.name)}. BUDGET NOW ${money(budget)}.`; draw();
          } }),
        "NO SUPPLIES ON FILE."));
    }],
    ["W", "STAFF - WEEKLY SCHEDULE", () => go(schedScreen()), () => !!api.staffSched],
    ["0", "LOG OFF", () => logoff()],
    // only listed while the entry gates are going off
    ["A", "*** SECURITY - SILENCE GATE ALARM ***", () => go({ title: "SECURITY GATE CONTROL", prompt: "Y TO SILENCE, ESC TO CANCEL", lines: () => [
      "", " GATE STATUS....: ALARM", " ZONE...........: ENTRY LANE (3 PEDESTALS)", ` TRIGGERED......: ${clock()}`, " CAUSE..........: ACTIVE SECURITY TAG DETECTED", "",
      " SILENCE THE ALARM AND RESET THE GATES?", "", " REMEMBER: CHECK THE CUSTOMER'S RECEIPT BEFORE THEY LEAVE."],
      submit(v) { if (v !== "Y") { msg = "TYPE Y TO SILENCE."; return draw(); } api.silenceAlarm(); back(); msg = "GATE ALARM SILENCED. GATES RE-ARMED."; draw(); },
    }), () => api.alarm()],
  ];
  const menuItems = () => MENU.filter(m => !m[3] || m[3]());
  // the main menu: two boxed columns of sections, the day's numbers underneath
  const SHORT = { "1": "TITLE SEARCH", "2": "BROWSE BY SECTION", "7": "RETURNS BIN QUEUE", B: "REPLACEMENT COPIES", "3": "MEMBER LOOKUP", "4": "ALL ACCOUNTS",
    "5": "OVERDUE / LATE FEES", "6": "RENTALS OUT", "8": "DAILY SUMMARY", M: "MESSAGES", O: "ORDER SUPPLIES", U: "STORE UPGRADES", T: "TONIGHT'S FEATURE", W: "STAFF SCHEDULE",
    "9": "PREVIEW STATION", S: "GATE SYSTEM", A: "SILENCE GATE ALARM", H: "HELP / COMMANDS", "0": "LOG OFF" };
  const COLUMNS = [[["INVENTORY", ["1", "2", "7", "B"]], ["MEMBERS", ["3", "4", "5"]], ["REPORTS", ["6", "8", "M"]]],
    [["STORE", ["O", "U", "T", "W", "9"]], ["SECURITY", ["A", "S"]], ["SYSTEM", ["H", "0"]]]];
  let menuRects = [];
  function menuOrder() {                           // visible items, column by column: [key, label, fn, col]
    const vis = new Map(menuItems().map(m => [m[0], m]));
    return COLUMNS.flatMap((col, ci) => col.flatMap(([, keys]) => keys.filter(k => vis.has(k)).map(k => { const m = vis.get(k); return [m[0], m[1], m[2], m[3], ci]; })));
  }
  const mainMenu = {
    title: "MAIN MENU", prompt: "SELECTION OR COMMAND",
    pick: { cur: 0, count: () => menuOrder().length, value: i => menuOrder()[i][0], rect: i => menuRects[i],
      side(i, dir) {                               // ←/→: across to the other column, about level
        const o = menuOrder(), here = menuRects[i], want = o[i][4] + dir; if (!here) return i;
        let best = i, bd = 1e9; o.forEach((m, j) => { if (m[4] === want && menuRects[j] && Math.abs(menuRects[j].r - here.r) < bd) { bd = Math.abs(menuRects[j].r - here.r); best = j; } });
        return best;
      } },
    render(g, top) {
      const vis = new Map(menuItems().map(m => [m[0], m])), order = menuOrder(); menuRects = [];
      COLUMNS.forEach((col, ci) => {
        const c0 = ci ? 41 : 2, c1 = ci ? 77 : 38; let r = top;
        col.forEach(([name, keys], gi) => {
          const ks = keys.filter(k => vis.has(k)); if (!ks.length) return;
          if (gi === 0) put(g, r, c0, "┌" + "─".repeat(c1 - c0 - 1) + "┐", P.dcyan); else put(g, r, c0, "├" + "─".repeat(c1 - c0 - 1) + "┤", P.dcyan);
          put(g, r, c0 + 2, ` ${name} `, P.yel); r++;
          for (const k of ks) {
            put(g, r, c0, "│", P.dcyan); put(g, r, c1, "│", P.dcyan);
            const alarm = k === "A", nm = k === "M" && inboxCount();
            put(g, r, c0 + 2, k, alarm || nm ? P.red : P.yel); put(g, r, c0 + 5, nm ? `MESSAGES (${nm} NEW)` : SHORT[k] || vis.get(k)[1], alarm || nm ? (blink ? P.red : P.hi) : P.hi);
            menuRects[order.findIndex(m => m[0] === k)] = { r, c0: c0 + 1, c1: c1 - 1 }; r++;
          }
        });
        put(g, r, c0, "└" + "─".repeat(c1 - c0 - 1) + "┘", P.dcyan);
      });
      const late = rentals.filter(r => daysLate(r)).length, f = api.feature?.();
      const facts = [[`${members().length}`, " MEMBERS"], [`${late}`, " OVERDUE", late ? P.red : P.hi], [`${api.returnBin().length}`, " IN RETURNS"],
        ...(f ? [[up(f.title).slice(0, 22), ` TONIGHT (${f.sold} SOLD)`]] : []), ...(api.gatesArmed() ? [] : [["GATES", " DISARMED", P.red]])];
      let c = 2; facts.forEach(([v, k, fg], i) => { if (i) { put(g, top + 15, c, "·", P.dcyan); c += 2; } put(g, top + 15, c, v, fg || P.hi); put(g, top + 15, c + v.length, k, P.cyan); c += v.length + k.length + 1; });
    },
    submit(v) {
      const [cmd, ...rest] = v.split(/\s+/), arg = rest.join(" ");
      const m = menuItems().find(([k]) => k === v);
      if (m) return m[2]();
      if ((cmd === "FIND" || cmd === "INV") && arg) return go(listScreen(`TITLE SEARCH: ${arg}`, titleHead, findTitles(arg), titleRow, titleDetail));
      if ((cmd === "MEMBER" || cmd === "CUST") && arg) return go(listScreen(`MEMBER SEARCH: ${arg}`, custHead, findCusts(arg), custRow, custDetail));
      const alias = { OVERDUE: "5", OUT: "6", RETURNS: "7", REPORT: "8", HELP: "H", "?": "H", LOGOFF: "0", EXIT: "0", LOGOUT: "0",
        SUPPLIES: "O", ORDER: "O", MESSAGES: "M", MSGS: "M", CALLS: "M", SCHEDULE: "W", STAFF: "W", UPGRADES: "U", UPGRADE: "U", THEATER: "T", FEATURE: "T", GATES: "S", REPLACE: "B" }[cmd];
      if (alias) return MENU.find(([k]) => k === alias)[2]();
      if (cmd === "SYSRESET") return go({ title: "SYSTEM RESET", prompt: "TYPE RESET TO CONFIRM, ESC TO CANCEL", lines: () => ["",
        " THIS WIPES THE SAVED STORE: INVENTORY, RETURNS, RENTALS, LIGHTS, WHERE YOU", " ARE STANDING, THE TAPE IN THE VCR. THE STORE RELOADS FRESH.", "",
        " TV PICTURE SETTINGS ARE KEPT."],
        submit(v) { if (v === "RESET") api.resetSave(); else { msg = "TYPE RESET TO CONFIRM."; draw(); } } });
      if (cmd === "VER") { msg = "POS/NET 2.3 (C) 1993 VIDEOTRAK SYSTEMS INC.  LICENSED TO JELLYBUSTER VIDEO #0417"; return draw(); }
      msg = `UNKNOWN COMMAND: ${v}.  TYPE H FOR HELP.`; draw();
    },
    back() { logoff(); },
  };

  function logoff() {                             // back to the login screen (it stays up on the monitor)
    mode = "login"; screen = null; stack.length = 0; input = ""; msg = ""; user = ""; loginReset();
    open = false; el.hidden = true; hover = null; draw(); api.onClose();
  }

  // ---- input ----
  function key(e) {
    e.preventDefault();
    if (mode === "login") {
      if (e.key === "Escape" || e.key === "F10") return close();
      if (e.key === "Enter" || e.key === " ") startLogin();
      return;
    }
    if (e.key === "F10") return logoff();
    if (e.key === "Escape") return screen === mainMenu && !stack.length ? logoff() : back();
    if (e.key === "F1") return MENU.find(([k]) => k === "H")[2]();
    if (e.key === "F2") return MENU.find(([k]) => k === "1")[2]();
    if (e.key === "Backspace") { input = input.slice(0, -1); return draw(); }
    if (screen.keys?.(e)) return;                  // a screen with its own keys (the schedule grid)
    const pk = screen.pick;
    if (pk && (e.key === "ArrowUp" || e.key === "ArrowDown") && pk.count()) {
      pk.cur = Math.max(0, Math.min(pk.count() - 1, pk.cur + (e.key === "ArrowDown" ? 1 : -1)));
      pk.moved?.(pk.cur); return draw();
    }
    if (pk?.side && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { pk.cur = pk.side(pk.cur, e.key === "ArrowRight" ? 1 : -1); return draw(); }
    if (pk && e.key === "Enter" && !input.trim() && pk.count()) { msg = ""; input = ""; return screen.submit(pk.value(pk.cur)); }
    if (e.key === "Enter") { const v = input.trim(); input = ""; msg = ""; screen.submit(up(v)); return; }
    if (e.key.length === 1 && input.length < 40) { input += e.key; draw(); }
  }

  // ---- mouse: the cell under the pointer lights up; click a menu or list row to highlight it,
  // click it again to select it; the key caps along the bottom (and LOG IN) click too ----
  function cellAt(e) {
    const r = view.getBoundingClientRect(), cs = getComputedStyle(view);
    const c = Math.floor((e.clientX - r.left - parseFloat(cs.borderLeftWidth)) / (view.clientWidth / COLS)), row = Math.floor((e.clientY - r.top - parseFloat(cs.borderTopWidth)) / (view.clientHeight / ROWS));
    return c >= 0 && c < COLS && row >= 0 && row < ROWS ? { c, r: row } : null;
  }
  view.addEventListener("mousemove", e => {
    const h = cellAt(e); if (h?.c !== hover?.c || h?.r !== hover?.r) { hover = h; if (h && e.buttons & 1 && mode === "app") screen.drag?.(h); draw(); }   // (a drag paints the schedule)
  });
  view.addEventListener("mouseleave", () => { if (hover) { hover = null; draw(); } });
  view.addEventListener("mousedown", e => {
    if (e.button !== 0 || !open) return;
    const h = cellAt(e); if (!h) return;
    e.preventDefault();
    const hit = hits.find(x => x.r === h.r && h.c >= x.c0 && h.c <= x.c1); if (hit) return hit.act();
    if (mode !== "app") return;
    if (screen.click?.(h)) return;                 // a screen with its own clickable layout
    const pk = screen.pick; if (!pk || !pk.count()) return;
    for (let i = 0; i < pk.count(); i++) { const rc = pickRect(pk, i); if (rc && rc.r === h.r && h.c >= rc.c0 && h.c <= rc.c1) {
      if (i === pk.cur) { msg = ""; input = ""; return screen.submit(pk.value(i)); }   // second click: select it
      pk.cur = i; pk.moved?.(i); msg = ""; return draw();                               // first click: highlight it
    } }
  });
  function close() { loginReset(); open = false; el.hidden = true; hover = null; draw(); api.onClose(); }
  addEventListener("resize", () => { if (open) draw(); });
  document.fonts?.load("20px VT323").then(() => draw(), () => {});   // repaint the monitor once the web font arrives
  return {
    canvas, key, isOpen: () => open,
    open() { open = true; el.hidden = false; blink = true; draw(); },   // the login screen (or, mid-session, wherever you were)
    close,
    idle() { draw(); },                          // paint the monitor once at startup
    // for store.js's walk-in customers: every member is somebody who might come in
    members: customers,
    rentMax: RENT_MAX,                           // tapes out at once, per member
    dueIn: r => Math.round((r.due - TODAY) / DAY),   // days until a rental's due (negative = late)
    checkOut(copy, cust) {                       // a walk-in rented this copy: on their account, and the money in the budget
      const p = priceOf(copy), out = new Date(TODAY), r = { copy, cust, out, due: new Date(+out + p.nights * DAY) };
      copy.rental = r; cust.rentals.push(r); rentals.push(r); budget += p.rate;
      if (open && mode === "app") draw();
    },
    budget: () => budget,
    owed: m => m.owed || 0,                    // late fees on a member's account
    settle(m, paid) { if (paid) budget += m.owed || 0; m.owed = 0; if (open && mode === "app") draw(); },   // charged (into the budget) or waived
    incident(m, what) { (m.incidents ||= []).push({ at: +TODAY, what }); if (open && mode === "app") draw(); },   // on their record
    setStatus(m, status, days = 0) { m.status = status; m.until = status === "banned" ? +TODAY + days * DAY : 0; },   // "banned" (for days) | "cancelled" | "arrested" | null
    canVisit: m => !["cancelled", "arrested"].includes(m.status) && !(m.status === "banned" && m.until > +TODAY),
    loyal(m, d) { m.loyalty = Math.max(-100, Math.min(100, (m.loyalty || 0) + d)); },   // how they feel about the store: -100..100
    recordsAll: () => Object.fromEntries(customers.filter(c => c.incidents || c.status || c.loyalty || c.lastVisit != null || c.calls || c.promise || c.car !== undefined).map(c => [c.num, { incidents: c.incidents, status: c.status, until: c.until, loyalty: c.loyalty, lastVisit: c.lastVisit, calls: c.calls, lastCall: c.lastCall, lastResult: c.lastResult, promise: c.promise, car: c.car }])),
    // overdue calls, made from the store phone (store.js): who still needs one, and what came of it
    needsCall: c => lateOf(c).length > 0 && !(c.promise >= +TODAY - 2 * DAY),
    calledToday: c => c.lastCall === +TODAY,
    lateSummary: c => { const late = lateOf(c); return late.length ? `${late.length} TAPE${late.length > 1 ? "S" : ""} ${Math.max(...late.map(daysLate))}D LATE` : ""; },
    recordCall(c, { promise, result }) {
      c.calls = (c.calls || 0) + 1; c.lastCall = +TODAY; c.lastResult = up(result);
      if (promise) { c.promise = +TODAY; api.promised?.(c); }
      if (open && mode === "app") draw();
    },
    message(text) { notes.push({ at: +TODAY, text: up(text), read: false }); if (notes.length > 40) notes.shift(); draw(); },   // a note in the message center
    inbox: () => inboxCount(),                 // what's waiting there: calls not made today, unread notes
    messagesAll: () => notes,
    join(n) {                                    // n new sign-ups (not anyone who's banned or been sent packing) -> who
      const pool = customers.filter(c => !c.active && !c.status), got = [];
      while (got.length < n && pool.length) { const c = pool.splice(Math.floor(rnd() * pool.length), 1)[0]; c.active = true; got.push(c); }
      if (open && mode === "app") draw(); return got;
    },
    prospect: skip => { const pool = customers.filter(c => !c.active && !c.status && !skip.includes(c)); return pool.length ? pool[Math.floor(rnd() * pool.length)] : null; },   // somebody who isn't a member yet
    enroll(m) { m.active = true; m.since = new Date(TODAY).getFullYear(); if (open && mode === "app") draw(); },   // typed into the system: a member now
    activeNums: () => customers.filter(c => c.active).map(c => c.num),
    owedAll: () => Object.fromEntries(customers.filter(c => c.owed).map(c => [c.num, c.owed])),
    setDate(d) { TODAY = new Date(d); TODAY.setHours(12, 0, 0, 0); if (open && mode === "app") draw(); },   // a new shift: late fees and due dates move on
    rentPrice: copy => priceOf(copy).rate,     // what a copy rents for, for the counter's running total
    sale(amount) { budget += amount; if (open && mode === "app") draw(); },   // snacks and drinks at the counter
    ring(s) { sale = s; draw(); },
    ringing: () => sale,                         // (what the sale window is showing, for the tests)               // the sale on the register: { member, carded, signup, clerk, items: [[name, price]], feesCharged, feesWaived, total, cashIn, change, next } or null
    rentalOf: c => c.rental && [c.rental.cust.num, +c.rental.out],
    cancel(copy) {                               // void a rental outright (no fees): the store never had it to rent
      const r = copy.rental; if (!r) return;
      r.cust.rentals.splice(r.cust.rentals.indexOf(r), 1); rentals.splice(rentals.indexOf(r), 1); copy.rental = null;
    },
    checkIn(copy) {                              // a member dropped this copy back off: close out the rental
      const r = copy.rental; if (!r) return;
      const fee = lateFee(r); if (fee) r.cust.owed = +((r.cust.owed || 0) + fee).toFixed(2);   // back late: the fee goes on their account, settled at their next checkout
      r.cust.rentals.splice(r.cust.rentals.indexOf(r), 1); rentals.splice(rentals.indexOf(r), 1); copy.rental = null;   // off their account and out of the reports (null, not delete: an extra copy would fall back to the first copy's rental)
      if (open && mode === "app") draw();
    },
  };
};