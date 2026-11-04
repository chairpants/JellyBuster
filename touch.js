// Touchscreen controls (phones / tablets). Phones have no pointer lock and no keyboard, so
// this fakes the lock (the store runs exactly as it does with a mouse captured) and turns
// touches into the same events the store already listens for. No buttons:
//   - a thumb down in the bottom-left: a stick (WASD; Shift when pushed all the way)
//   - drag anywhere else: look around
//   - tap something: whatever its hover tip offers there (E, click, Q). Offers more than
//     one? Labelled choices pop up by your finger. Nothing on offer: a click
//   - long press: hold E (lift the standee, pick up the stool, move a rewinder...)
//   - two-finger tap: right-click (put back, drop, back out)
//   - tap an inventory slot, a shoplifter / phone option, or the clock (the menu)
// At the register a bar with KEYBOARD (the phone's own) and the keys a phone doesn't have.
// Only on touch devices; ?touch=1 forces it on (testing on a desktop).
(() => {
  const forced = /[?&]touch=1\b/.test(location.search);
  if (!forced && !matchMedia("(hover: none) and (pointer: coarse)").matches) return;
  document.documentElement.classList.add("touch");   // (the title screen lists these controls instead of the keys)

  // ---- the fake pointer lock: "locked" = playing, exactly as with a mouse ----
  let lockEl = null;
  Object.defineProperty(Document.prototype, "pointerLockElement", { get: () => lockEl, configurable: true });
  Element.prototype.requestPointerLock = function () { lockEl = this; document.dispatchEvent(new Event("pointerlockchange")); sync(); return Promise.resolve(); };
  Document.prototype.exitPointerLock = function () { lockEl = null; document.dispatchEvent(new Event("pointerlockchange")); sync(); };
  const canvas = () => lockEl || document.querySelector("body > canvas") || document.querySelector("canvas");

  // ---- sending the store its events ----
  const keyOf = code => code.startsWith("Key") ? code.slice(3).toLowerCase() : code.startsWith("Digit") ? code.slice(5) : code === "Space" ? " " : code;
  const key = (type, code, k = keyOf(code)) => dispatchEvent(new KeyboardEvent(type, { code, key: k, bubbles: true, cancelable: true }));
  const tapKey = code => { key("keydown", code); key("keyup", code); };
  const mouse = (type, button) => canvas().dispatchEvent(new MouseEvent(type, { button, bubbles: true, cancelable: true }));
  const click = button => { mouse("mousedown", button); mouse("mouseup", button); };
  const look = (dx, dy) => {                     // movementX/Y can't be set from the constructor everywhere: shadow them
    const e = new MouseEvent("mousemove", { bubbles: true });
    Object.defineProperty(e, "movementX", { value: dx }); Object.defineProperty(e, "movementY", { value: dy });
    dispatchEvent(e);
  };
  const ndc = (x, y) => [x / innerWidth * 2 - 1, -(y / innerHeight * 2 - 1)];

  // ---- the overlay ----
  const css = document.createElement("style");
  css.textContent = `
    #tc, #tcPos { position: fixed; inset: 0; z-index: 30; display: none; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
    #tc.on, #tcPos.on { display: block; }
    #tcPos { inset: auto 0 0 0; z-index: 60; }
    #tcStick { position: absolute; width: 120px; height: 120px; margin: -60px 0 0 -60px; border-radius: 50%; display: none;
      border: 2px solid #fff6; background: #0003; pointer-events: none; }
    #tcStick i { position: absolute; left: 50%; top: 50%; width: 52px; height: 52px; margin: -26px 0 0 -26px; border-radius: 50%; background: #fff8; }
    #tcChoice { position: absolute; display: none; flex-direction: column; gap: 8px; z-index: 2; }
    #tcChoice.on { display: flex; }
    .tcb { display: flex; align-items: center; justify-content: center; background: #001f5ce6; color: #ffd400; border: 2px solid #ffd400aa;
      font: bold 15px Arial, sans-serif; border-radius: 10px; padding: 0 16px; min-height: 46px; min-width: 56px; }
    .tcb.down { background: #ffd400; color: #001f5c; }
    #tcPos .row { display: flex; gap: 8px; justify-content: center; padding: 8px; background: #000a; }
    #tcType { position: fixed; left: -100px; top: 0; width: 10px; height: 10px; opacity: 0; }
    /* the log: tucked off to the left with just an edge showing; drag it out to read, back to tuck it away */
    html.touch #actLog { left: 0; bottom: 14px; border-radius: 0 6px 6px 0; border-left: 0; border-right: 3px solid #ffffff55;
      transform: translateX(calc(-100% + 10px)); transition: transform .2s ease-out; touch-action: pan-y; }
    html.touch #actLog.out { transform: none; }
    html.touch #actLog.drag { transition: none; }
    html.touch #actLog.unseen { border-right-color: #ffd400; }
    html.touch #actLog::after { content: ""; position: absolute; top: 0; bottom: 0; right: -18px; width: 18px; }   /* a fatter edge to grab */
    html.touch #actLog.shut #actLogList { display: block; }
    html.touch #actLog .h .k { display: none; }
    html.touch.playing #actLog { z-index: 31; }`;
  document.head.appendChild(css);
  const root = document.createElement("div"); root.id = "tc";
  root.innerHTML = `<div id="tcStick"><i></i></div><div id="tcChoice"></div>`;
  const posBar = document.createElement("div"); posBar.id = "tcPos";
  posBar.innerHTML = `<div class="row"></div><input id="tcType" autocapitalize="characters" autocomplete="off" autocorrect="off" spellcheck="false">`;
  document.body.append(root, posBar);
  function button(parent, label, up) {           // (only the register bar and the tap choices have buttons)
    const b = document.createElement("div"); b.className = "tcb"; b.textContent = label;
    b.addEventListener("touchstart", e => { e.preventDefault(); e.stopPropagation(); b.classList.add("down"); }, { passive: false });
    b.addEventListener("touchend", e => { e.preventDefault(); e.stopPropagation(); if (b.classList.contains("down")) { b.classList.remove("down"); up(); } }, { passive: false });
    b.addEventListener("touchcancel", () => b.classList.remove("down"));
    parent.appendChild(b); return b;
  }

  // ---- the stick: wherever a thumb lands in the bottom-left ----
  const stick = root.querySelector("#tcStick"), knob = stick.firstChild, R = 50;
  let held = new Set();
  const inStickZone = (x, y) => x < innerWidth * 0.4 && y > innerHeight * 0.35;
  const pressDirs = (dx, dy) => {
    const m = Math.hypot(dx, dy), want = new Set();
    if (m > 14) {
      const oct = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));   // 8 ways
      if ([-3, -2, -1].includes(oct)) want.add("KeyW"); if ([1, 2, 3].includes(oct)) want.add("KeyS");
      if ([-1, 0, 1].includes(oct)) want.add("KeyD"); if ([3, 4, -4, -3].includes(oct)) want.add("KeyA");
      if (m > R * 0.95) want.add("ShiftLeft");                                // all the way over: hustle
    }
    for (const c of held) if (!want.has(c)) key("keyup", c);
    for (const c of want) if (!held.has(c)) key("keydown", c);
    held = want;
  };

  // ---- taps: do what the tapped thing offers ----
  const choice = root.querySelector("#tcChoice");
  let choiceT = null;
  const hideChoice = () => { choice.classList.remove("on"); choice.innerHTML = ""; clearTimeout(choiceT); };
  const ACT = /^(E|Q|CLICK)\s+—\s+(.+)$/i;      // "E — open the door", "CLICK — grab Licorice", "Q — waive the fees"
  function perform(a, x, y) {
    window.StoreAim?.at(...ndc(x, y));           // (re-aim: a choice gets tapped a moment later)
    if (a === "E") tapKey("KeyE"); else if (a === "Q") tapKey("KeyQ"); else click(0);
    window.StoreAim?.center();
  }
  function hudTap(x, y) {                        // the store's own on-screen bits under the finger (they don't take touches themselves)
    const hit = [...document.querySelectorAll("#invBar .slot, #catchCall span, #callPanel > span, #shiftClock")]
      .find(el => { const r = el.getBoundingClientRect(); return r.width && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom && getComputedStyle(el).visibility !== "hidden"; });
    if (!hit) return false;
    if (hit.id === "shiftClock") { document.exitPointerLock(); return true; }            // the clock: the menu
    if (hit.classList.contains("slot")) { tapKey("Digit" + ([...hit.parentNode.children].indexOf(hit) + 1)); return true; }
    const n = hit.querySelector("b")?.textContent.trim(); if (/^\d$/.test(n)) tapKey("Digit" + n);
    return true;
  }
  function tap(x, y) {
    hideChoice();
    if (hudTap(x, y)) return;
    const r = window.StoreAim?.at(...ndc(x, y)) || { tip: "", dflt: "CLICK" };
    const acts = [];
    for (const line of r.tip.split("\n")) { const m = line.trim().match(ACT); if (m && !acts.some(a => a.k === m[1].toUpperCase())) acts.push({ k: m[1].toUpperCase(), label: m[2].split(" · ")[0] }); }
    window.StoreAim?.center();
    if (acts.length <= 1) return perform(acts[0]?.k || r.dflt, x, y);
    for (const a of acts) button(choice, a.label[0].toUpperCase() + a.label.slice(1), () => { hideChoice(); perform(a.k, x, y); });
    choice.classList.add("on");
    const w = choice.offsetWidth, h = choice.offsetHeight;
    Object.assign(choice.style, { left: Math.max(8, Math.min(innerWidth - w - 8, x - w / 2)) + "px", top: Math.max(8, Math.min(innerHeight - h - 8, y - h - 24)) + "px" });
    choiceT = setTimeout(hideChoice, 5000);
  }

  // ---- every touch on the store: stick, look, tap, long press, two-finger tap ----
  const LOOK = 1.8;                              // touch px -> mouse px
  const touches = new Map();                     // id -> { x, y, x0, y0, stick }
  let gesture = null;                            // the look fingers' current gesture: { t0, n, moved, pts, long, longT }
  root.addEventListener("touchstart", e => {
    e.preventDefault();
    if (e.target.closest?.("#tcChoice")) return;
    hideChoice();
    for (const t of e.changedTouches) {
      const stickFree = ![...touches.values()].some(s => s.stick);
      const s = { x: t.clientX, y: t.clientY, x0: t.clientX, y0: t.clientY, stick: stickFree && inStickZone(t.clientX, t.clientY), t0: performance.now() };
      touches.set(t.identifier, s);
      if (s.stick) { Object.assign(stick.style, { display: "block", left: s.x + "px", top: s.y + "px" }); knob.style.transform = ""; continue; }
      if (!gesture) {
        gesture = { t0: performance.now(), n: 0, moved: 0, pts: [], long: false };
        gesture.longT = setTimeout(() => {         // held still: a long press is holding E on whatever's there
          if (!gesture || gesture.n !== 1 || gesture.moved > 10) return;
          gesture.long = true; window.StoreAim?.at(...ndc(s.x0, s.y0)); key("keydown", "KeyE"); window.StoreAim?.center();
        }, 450);
      }
      gesture.n++; gesture.pts.push([t.clientX, t.clientY]);
    }
  }, { passive: false });
  root.addEventListener("touchmove", e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const s = touches.get(t.identifier); if (!s) continue;
      const dx = t.clientX - s.x, dy = t.clientY - s.y; s.x = t.clientX; s.y = t.clientY;
      if (s.stick) {
        let kx = s.x - s.x0, ky = s.y - s.y0; const m = Math.hypot(kx, ky); if (m > R) { kx *= R / m; ky *= R / m; }
        knob.style.transform = `translate(${kx}px, ${ky}px)`; pressDirs(s.x - s.x0, s.y - s.y0);
      } else { look(dx * LOOK, dy * LOOK); if (gesture) gesture.moved += Math.hypot(dx, dy); }
    }
  }, { passive: false });
  const end = e => {
    for (const t of e.changedTouches) {
      const s = touches.get(t.identifier); if (!s) continue; touches.delete(t.identifier);
      if (s.stick) {
        stick.style.display = "none"; pressDirs(0, 0);
        if (e.type === "touchend" && Math.hypot(s.x - s.x0, s.y - s.y0) < 12 && performance.now() - s.t0 < 300) tap(s.x0, s.y0);   // a tap, not a push
      }
    }
    if (gesture && ![...touches.values()].some(s => !s.stick)) {   // the look fingers are all up: what was it?
      const g = gesture; gesture = null; clearTimeout(g.longT);
      if (g.long) return key("keyup", "KeyE");
      if (e.type !== "touchend" || g.moved > 14 || performance.now() - g.t0 > 350) return;   // a look, not a tap
      if (g.n >= 2) {                            // two fingers: a right-click where they were
        const [[ax, ay], [bx, by]] = g.pts; window.StoreAim?.at(...ndc((ax + bx) / 2, (ay + by) / 2)); click(2); window.StoreAim?.center();
      } else tap(...g.pts[0]);
    }
  };
  root.addEventListener("touchend", end, { passive: false }); root.addEventListener("touchcancel", end, { passive: false });

  // ---- the log: pull it out by its edge, push it back ----
  const log = document.getElementById("actLog");
  if (log) {
    let d = null;                                // { x0, y0, w, from, dir } while a finger's on it
    const at = x => Math.max(-(d.w - 10), Math.min(0, d.from + x - d.x0));   // how far out: -(w - 10) tucked .. 0 all the way
    log.addEventListener("touchstart", e => {
      const t = e.touches[0]; d = { x0: t.clientX, y0: t.clientY, w: log.offsetWidth, from: log.classList.contains("out") ? 0 : -(log.offsetWidth - 10), dir: null };
      if (!log.classList.contains("out")) e.preventDefault();   // tucked: nothing to scroll, it's all drag
    }, { passive: false });
    log.addEventListener("touchmove", e => {
      if (!d) return; const t = e.touches[0], dx = t.clientX - d.x0, dy = t.clientY - d.y0;
      d.dir ||= Math.hypot(dx, dy) > 8 ? (Math.abs(dx) > Math.abs(dy) ? "x" : "y") : null;
      if (d.dir !== "x") return;                 // up and down: reading (the list scrolls)
      e.preventDefault(); log.classList.add("drag"); log.style.transform = `translateX(${at(t.clientX)}px)`;
    }, { passive: false });
    const done = e => {
      if (!d) return; const t = e.changedTouches[0], x = at(t.clientX), wasOut = d.from === 0, moved = d.dir === "x";
      const out = moved ? x > -(d.w - 10) / 2 : true;   // let go past halfway: it stays out (a tap on the edge pulls it out)
      log.classList.remove("drag"); log.style.transform = ""; log.classList.toggle("out", out); d = null;
      if (out) { log.classList.remove("unseen"); const l = document.getElementById("actLogList"); if (!wasOut) l.scrollTop = l.scrollHeight; }
    };
    log.addEventListener("touchend", done); log.addEventListener("touchcancel", done);
    const list = document.getElementById("actLogList");   // something new while it's tucked away: the edge lights up
    if (list) new MutationObserver(() => { if (!log.classList.contains("out")) log.classList.add("unseen"); }).observe(list, { childList: true });
  }

  // ---- at the register: the phone's keyboard, plus the keys it doesn't have ----
  const posRow = posBar.querySelector(".row"), type = posBar.querySelector("#tcType");
  const posKey = k => dispatchEvent(new KeyboardEvent("keydown", { key: k, code: k.length === 1 ? "" : k, bubbles: true, cancelable: true }));
  button(posRow, "KEYBOARD", () => { type.value = ""; type.focus(); });
  for (const [l, k] of [["▲", "ArrowUp"], ["▼", "ArrowDown"], ["⌫", "Backspace"], ["ENTER", "Enter"], ["ESC", "Escape"]]) button(posRow, l, () => posKey(k));
  type.addEventListener("keydown", e => {        // (Android sends "Unidentified" for letters: those come through "input" below)
    e.stopPropagation();
    if (["Enter", "Backspace"].includes(e.key)) { e.preventDefault(); posKey(e.key); }
  });
  type.addEventListener("input", () => { for (const ch of type.value) posKey(ch.toUpperCase()); type.value = ""; });

  // ---- what's showing: the touch layer while you're playing, the register bar while it's open ----
  const posOpen = () => { const p = document.getElementById("posTerm"); return !!p && !p.hidden; };
  function sync() {
    const pos = posOpen();
    root.classList.toggle("on", !!lockEl && !pos);
    document.documentElement.classList.toggle("playing", !!lockEl && !pos);   // (the log sits over the touch layer only while you're in the store)
    posBar.classList.toggle("on", pos);
    if (!pos && document.activeElement === type) type.blur();
    if (!lockEl && held.size) pressDirs(0, 0);   // (paused mid-stride: let go of the keys)
    if (!lockEl) hideChoice();
  }
  setInterval(sync, 250);                         // the register opens and closes on its own schedule
  // paused for the register (it gave the "mouse" back): any touch on the store takes you back in
  addEventListener("touchstart", e => {
    if (!lockEl && !posOpen() && e.target === canvas() && document.getElementById("titleScreen")?.style.display === "none") canvas().requestPointerLock();
  }, { passive: true });
})();
