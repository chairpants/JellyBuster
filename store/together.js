// ---------------- playing together ----------------
// Two players on the same network, each in their own copy of the store: what's shared is where you are, and the time and
// weather, which either can change from the wheel. The host plays their game as usual. Whoever joins reloads as a guest
// (GUEST, store/core.js): a customer in a store that's never saved, every tape free, who isn't thrown out at closing and
// whose clock is the host's. There's no server to run. Jellyfin introduces you, and after that it's a direct WebRTC link between the two browsers.
//   - pairing: each side leaves its connection details as the name of a SyncPlay group, since any signed-in user can
//     list those whichever account made them (the session messages other clients use need a permission between accounts).
//     A group's name stops at 200 characters, so only what the other side can't work out goes in: see pack / unpack.
//   - the link: no STUN or TURN servers, so it only comes up if the two can reach each other directly.
//   - the other player: a body like a customer's, with a name over it, eased toward where they last said they were.
const TOGETHER = { group: "jbg1", nameMax: 200, connectIn: 30000, sendEvery: 50, silentFor: 15000 };   // ms. silentFor's long because a tab in the background only sends about once a second
const together = {
  g: new THREE.Group(), state: "off",           // off | hosting | joining | connected
  pc: null, pos: null, ctl: null, peer: null,   // pos: position updates, none resent. ctl: what has to arrive. peer: the other player, once they've said hello
  try: 0,                                       // up on every new try: what's left over from an earlier one sees it's changed and stops
  seed: crypto.getRandomValues(new Uint32Array(1))[0], up: false, sender: null,
  host: false, timeAt: 0, skyPick: -1, skyDay: 0,   // skyPick: the wheel's weather today, if it's been touched (the plain day's weather comes from the day: the same on both)
};
scene.add(together.g);

const tgSleep = ms => new Promise(r => setTimeout(r, ms));
function tgStatus(text, bad = false) { const el = $("tgStatus"); el.textContent = text; el.style.color = bad ? "#ffb3b3" : ""; el.style.opacity = bad || text ? 1 : ""; }
function tgButtons() {
  const off = together.state === "off";
  $("tgHost").hidden = !off || !!GUEST; $("tgHosts").hidden = !off || !!GUEST; $("tgStop").hidden = off && !GUEST;
  $("tgStop").textContent = GUEST ? "LEAVE THE STORE" : together.state === "connected" ? "DISCONNECT" : "CANCEL";
}
const tgList = () => Jelly.tabApi("/SyncPlay/List");
const tgLeaveGroup = keepalive => Jelly.tabApi("/SyncPlay/Leave", { method: "POST", keepalive }).catch(() => {});
function tgWhy(e) {
  return e.status === 401 || e.status === 403 ? "Jellyfin won't let this account use SyncPlay. Allow it for this user in the server's dashboard." : e.message;
}

// ---- the connection details, small enough for a group's name ----
const tgToB64 = hex => btoa(String.fromCharCode(...hex.match(/../g).map(x => parseInt(x, 16)))).replace(/=+$/, "");
const tgToHex = s => [...atob(s)].map(c => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
const TG_MDNS = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.local$/i;   // how browsers hide a device's address
const tgHostOut = h => TG_MDNS.test(h) ? tgToB64(h.replace(/\.local$/i, "").replace(/-/g, "")) : h;
function tgHostIn(h) {
  if (!/^[A-Za-z0-9+/]{22}$/.test(h)) return h;
  const x = tgToHex(h);
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}.local`;
}
function tgPack(sdp, head) {                    // -> the ICE username and password, the certificate's fingerprint, and as many addresses as fit
  const field = k => { const m = sdp.match(new RegExp(`^a=${k}:(.*)$`, "m")); if (!m) throw new Error(`The browser's connection details have no ${k}.`); return m[1].trim(); };
  const [algo, print] = field("fingerprint").split(" ");
  if (algo.toLowerCase() !== "sha-256") throw new Error("This browser's connection details aren't a kind this can send.");
  const found = [...new Set(sdp.split(/\r?\n/).filter(l => l.startsWith("a=candidate")).map(l => l.split(" "))
    .filter(p => p[2].toLowerCase() === "udp" && p[7] === "host").map(p => `${tgHostOut(p[4])}|${p[5]}`))];
  if (!found.length) throw new Error("The browser found no network address to offer. Is this device on the network?");
  const base = `${field("ice-ufrag")} ${field("ice-pwd")} ${tgToB64(print.replace(/:/g, ""))}`, kept = [];
  for (const c of found) if (`${head} ${base} ${[...kept, c].join(",")}`.length <= TOGETHER.nameMax) kept.push(c);
  if (!kept.length) throw new Error("The connection details won't fit in a group's name.");
  return `${base} ${kept.join(",")}`;
}
function tgUnpack(text, type) {
  const bad = () => new Error("The other player's connection details don't look right.");
  const parts = String(text).split(" "); if (parts.length !== 4) throw bad();
  const [ufrag, pwd, print, list] = parts;
  if (!/^[A-Za-z0-9+/]{4,64}$/.test(ufrag) || !/^[A-Za-z0-9+/]{22,64}$/.test(pwd) || !/^[A-Za-z0-9+/]{43}$/.test(print)) throw bad();
  const lines = list.split(",").map((c, i) => {
    const [h, port] = c.split("|"), host = tgHostIn(h);
    if (!/^[A-Za-z0-9.:_-]+$/.test(host) || !/^\d{1,5}$/.test(port)) throw bad();
    return `a=candidate:${i + 1} 1 udp ${2113937151 - i} ${host} ${port} typ host\r\n`;
  }).join("");
  const fp = tgToHex(print).toUpperCase().match(/../g).join(":");
  return `v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\nc=IN IP4 0.0.0.0\r\n${lines}a=ice-ufrag:${ufrag}\r\na=ice-pwd:${pwd}\r\na=fingerprint:sha-256 ${fp}\r\na=setup:${type === "offer" ? "actpass" : "active"}\r\na=mid:0\r\na=sctp-port:5000\r\n`;
}
function tgParseName(name) {                    // a group's name -> { kind: "o" (an offer) | "a" (its answer), id, text }, or null if it's somebody's real group
  const m = new RegExp(`^${TOGETHER.group}([oa]) ([a-z0-9]{4}) (.+)$`).exec(name || "");
  return m && { kind: m[1], id: m[2], text: m[3] };
}
const tgId = () => [...crypto.getRandomValues(new Uint8Array(4))].map(b => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");

// ---- the link ----
function tgNewPeer() {
  const T = together, mine = T.try;
  if (!window.RTCPeerConnection) throw new Error("This browser doesn't have WebRTC.");
  const pc = T.pc = new RTCPeerConnection({ iceServers: [] });
  // both channels are agreed on ahead (negotiated): neither side has to wait to be told about them
  T.pos = pc.createDataChannel("pos", { negotiated: true, id: 0, ordered: false, maxRetransmits: 0 });
  T.ctl = pc.createDataChannel("ctl", { negotiated: true, id: 1 });
  T.pos.onmessage = e => tgOnPos(e.data, mine);
  T.ctl.onmessage = e => tgOnCtl(e.data, mine);
  T.ctl.onopen = () => { if (mine === T.try) tgLinked(); };
  T.ctl.onclose = () => { if (mine === T.try) tgLost(); };
  pc.addEventListener("connectionstatechange", () => { if (mine === T.try && pc.connectionState === "failed") tgLost(); });
  return pc;
}
function tgGathered(pc) {
  return new Promise(res => {
    if (pc.iceGatheringState === "complete") return res();
    const t = setTimeout(res, 6000);            // whatever's been found by then will have to do
    pc.addEventListener("icegatheringstatechange", () => { if (pc.iceGatheringState === "complete") { clearTimeout(t); res(); } });
  });
}
function tgClose() {
  const T = together;
  clearInterval(T.sender); T.sender = null;
  try { T.pos?.close(); } catch {} try { T.ctl?.close(); } catch {} try { T.pc?.close(); } catch {}
  T.pc = T.pos = T.ctl = null; T.up = false; T.host = false;
  tgPeerGone();
}
function tgStop(status = "", bad = false) {     // back to not being connected to anybody
  const T = together;
  T.try++; T.state = "off"; tgClose(); tgLeaveGroup();
  tgStatus(status, bad); tgButtons(); tgLobby();
}
function tgLost() {                             // the link's ended: it never came up, or it did and now it's gone
  if (!together.up) return tgStop("Couldn't connect directly. Usual causes: a guest network or your router's AP isolation setting, a firewall blocking UDP, a VPN, or the other device being on another network.", true);
  toast(together.peer ? `${together.peer.name} left` : "The other player left");
  tgStop("The other player left.");
}
function tgArmTimeout(mine) {
  setTimeout(() => { if (mine === together.try && !together.up) tgLost(); }, TOGETHER.connectIn);
}
async function togetherHost() {
  const T = together, mine = ++T.try, id = tgId();
  T.state = "hosting"; T.host = true; tgButtons(); tgStatus("Getting ready…");
  try {
    const pc = tgNewPeer();
    await pc.setLocalDescription(await pc.createOffer());
    await tgGathered(pc);
    if (mine !== T.try) return;
    const head = `${TOGETHER.group}o ${id}`;
    await Jelly.tabApi("/SyncPlay/New", { method: "POST", body: { GroupName: `${head} ${tgPack(pc.localDescription.sdp, head)}` } });
    if (mine !== T.try) return tgLeaveGroup();
    tgStatus("Hosting. On the other device, open Play Together and choose Join. You can go back into the store while you wait.");
    let answer = null;
    while (mine === T.try && !answer) {
      try { answer = (await tgList()).map(g => tgParseName(g.GroupName)).find(g => g?.kind === "a" && g.id === id); } catch {}   // (a blip: ask again)
      if (!answer) await tgSleep(1000);
    }
    if (mine !== T.try) return;
    tgStatus("Found them. Connecting…");
    await tgLeaveGroup();                       // off the list: nobody else tries to join
    await pc.setRemoteDescription({ type: "answer", sdp: tgUnpack(answer.text, "answer") });
    tgArmTimeout(mine);
  } catch (e) { if (mine === T.try) tgStop(tgWhy(e), true); }
}
async function togetherJoin(offer, who) {
  const T = together, mine = ++T.try;
  T.state = "joining"; tgButtons(); tgStatus(`Connecting to ${who}…`);
  try {
    const pc = tgNewPeer();
    await pc.setRemoteDescription({ type: "offer", sdp: tgUnpack(offer.text, "offer") });
    await pc.setLocalDescription(await pc.createAnswer());
    await tgGathered(pc);
    if (mine !== T.try) return;
    const head = `${TOGETHER.group}a ${offer.id}`;
    await Jelly.tabApi("/SyncPlay/New", { method: "POST", body: { GroupName: `${head} ${tgPack(pc.localDescription.sdp, head)}` } });
    tgArmTimeout(mine);
  } catch (e) { if (mine === T.try) tgStop(tgWhy(e), true); }
}
function tgLinked() {
  const T = together;
  T.up = true; T.state = "connected";
  tgLeaveGroup();                               // Jellyfin's part is over
  tgButtons(); tgStatus("Connected. Waiting to hear from them…");
  T.ctl.send(JSON.stringify({ t: "hi", name: tgMyName(), seed: T.seed, uniform: !CUSTOMER }));
  if (T.host && T.skyPick >= 0 && T.skyDay === shift.day) T.ctl.send(JSON.stringify({ t: "wheel", i: T.skyPick }));   // (they've missed what's already been picked today)
  // on a timer, not the frame loop: a tab in the background stops drawing, and it still has to say it's there
  T.sender = setInterval(tgSend, TOGETHER.sendEvery);
}
function tgMyName() { return String(Jelly.info().user || "Player").replace(/[<>]/g, "").slice(0, 24); }
function tgSend() {
  const T = together; if (T.pos?.readyState !== "open") return;
  if (T.host && T.ctl?.readyState === "open" && performance.now() - T.timeAt > 2000) {
    T.timeAt = performance.now();
    if (T.skyDay !== shift.day) { T.skyDay = shift.day; T.skyPick = -1; }   // (a picked weather's only for that day)
    T.ctl.send(JSON.stringify({ t: "time", h: shift.h, day: shift.day }));
  }
  const g = me.group.position, r = v => Math.round(v * 1000) / 1000;
  const sit = onStool ? STOOL_SIT : seated ? (seatAt?.hipY ? { hipY: seatAt.hipY } : {}) : null;
  const pose = sit ? 2 : keys.has("KeyC") ? 1 : 0;
  try { T.pos.send(JSON.stringify([r(g.x), r(g.y), r(g.z), r(me.group.rotation.y), pose, sit?.hipY ?? 0, sit?.tuck ?? 0])); } catch {}
}
function tgOnCtl(data, mine) {
  const T = together; if (mine !== T.try) return;
  let d; try { d = JSON.parse(data); } catch { return; }
  if (d.t === "bye") return tgLost();
  if (d.t === "wheel") { const o = WHEEL_OPTS[d.i]; if (o) wheelPick(o, true); return; }
  if (d.t === "time") {                         // (the host's clock, every couple of seconds)
    if (!GUEST || !(d.h >= 0 && d.h < 48) || !(d.day >= 1)) return;
    shift.warp = 0; shift.h = d.h; shift.day = d.day >>> 0;
    return;
  }
  if (d.t !== "hi" || T.peer) return;
  tgPeerArrives(String(d.name || "Player").replace(/[<>]/g, "").slice(0, 24), d.seed >>> 0, !!d.uniform);
  toast(`${T.peer.name} is here`, true);
  tgStatus(`Connected to ${T.peer.name}. Each of you is in your own store, so you'll see each other but nothing else is shared yet.`);
}
function tgOnPos(data, mine) {
  const T = together, P = T.peer; if (mine !== T.try || !P) return;
  let a; try { a = JSON.parse(data); } catch { return; }
  if (!Array.isArray(a) || a.length !== 7 || !a.every(Number.isFinite)) return;
  P.heard = performance.now();
  if (Math.abs(a[0]) > 500 || Math.abs(a[1]) > 100 || Math.abs(a[2]) > 500) return;   // (nowhere in this world)
  P.to = { x: a[0], y: a[1], z: a[2], ry: a[3] };
  if (a[4] !== P.pose || a[5] !== P.hipY || a[6] !== P.tuck) {
    P.pose = a[4]; P.hipY = a[5]; P.tuck = a[6];
    P.c.setPose(a[4] === 2 ? "sit" : a[4] === 1 ? "crouch" : "idle", a[4] === 2 ? { ...(a[5] && { hipY: a[5] }), ...(a[6] && { tuck: a[6] }) } : undefined);
  }
}

function togetherSkyPicked(o, fromOtherPlayer) {   // (from the wheel) a pick on either side's a pick on both
  const T = together, i = WHEEL_OPTS.indexOf(o);
  if (o[1] === "sky") { T.skyPick = i; T.skyDay = shift.day; }
  if (T.host) T.timeAt = 0;                     // (the new hour goes straight over)
  if (!fromOtherPlayer && T.ctl?.readyState === "open") T.ctl.send(JSON.stringify({ t: "wheel", i }));
}

// ---- the other player ----
function tgPeerArrives(name, seed, uniform) {
  const rnd = seeded(seed), female = rnd() < 0.5;
  const c = StoreCustomers.build({ ...StoreCustomers.randomOutfit(rnd, female), hat: null,
    ...(uniform ? { top: "uniform", topA: "#1b3fa0", topB: "#ffd400", longSleeves: false, nameTag: name.split(" ")[0].toUpperCase() } : {}) });
  c.glows.forEach(glow); c.setMood("happy");
  const label = tgLabel(name); label.position.y = 2.2 * (c.group.scale.y || 1); c.group.add(label);
  c.group.visible = false;                      // (till the first word of where they are)
  together.g.add(c.group);
  together.peer = { name, c, label, to: null, ry: 0, speed: 0, pose: 0, hipY: 0, tuck: 0, heard: performance.now() };
}
function tgLabel(name) {                        // a name over their head: there's nothing else to tell them from a customer
  const cv = document.createElement("canvas"); cv.width = 512; cv.height = 96;
  const g = cv.getContext("2d"), font = "bold 56px Verdana, sans-serif"; g.font = font;
  const w = Math.min(500, g.measureText(name).width + 40);
  g.fillStyle = "rgba(10,26,69,0.85)"; g.beginPath(); g.roundRect(256 - w / 2, 8, w, 80, 16); g.fill();
  g.fillStyle = "#ffd400"; g.font = font; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(name, 256, 50, 470);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  s.scale.set(1.1, 0.206, 1);
  return s;
}
function tgPeerGone() {
  const T = together, P = T.peer; if (!P) return;
  T.peer = null; T.g.remove(P.c.group); P.c.dispose();
  P.label.material.map.dispose(); P.label.material.dispose();
}
function togetherTick(dt) {                     // the main loop: eases them to where they last said they were
  const T = together, P = T.peer; if (!P) return;
  if (performance.now() - P.heard > TOGETHER.silentFor) return tgLost();
  const g = P.c.group; if (!P.to) return;
  const dx = P.to.x - g.position.x, dy = P.to.y - g.position.y, dz = P.to.z - g.position.z, d = Math.hypot(dx, dz);
  if (!g.visible || d > 6 || Math.abs(dy) > 3) {   // first seen, or they've gone further than anybody walks in a moment: no sliding over there
    g.position.set(P.to.x, P.to.y, P.to.z); P.ry = P.to.ry; g.visible = true; P.c.tick(dt, 0); return;
  }
  const k = 1 - Math.exp(-dt * 12);
  g.position.x += dx * k; g.position.y += dy * k; g.position.z += dz * k;
  P.ry += Math.atan2(Math.sin(P.to.ry - P.ry), Math.cos(P.to.ry - P.ry)) * k; g.rotation.y = P.ry;
  P.speed += (d * k / Math.max(dt, 1e-4) - P.speed) * Math.min(1, dt * 10);   // smoothed, or the legs flicker between updates
  P.c.tick(dt, P.speed < 0.15 ? 0 : P.speed);
}

// ---- the menu: who's hosting, looked up only while it's on screen ----
let tgLooking = false;
async function tgLobby() {
  if (tgLooking || GUEST) return;
  tgLooking = true;
  const open = () => !$("mmTogether").hidden && !$("mainMenu").hidden && $("titleScreen").style.display !== "none" && together.state === "off";
  try {
    while (open()) {
      let list = null;
      try {
        list = (await tgList()).map(g => ({ offer: tgParseName(g.GroupName), who: String((g.Participants || []).join(", ") || "Somebody") })).filter(g => g.offer?.kind === "o");
      } catch (e) { tgStatus(tgWhy(e), true); }
      if (list && open()) {
        const buttons = list.map(g => {
          const b = document.createElement("button"), name = document.createElement("b"), sub = document.createElement("small");
          name.textContent = `JOIN ${g.who}`; sub.textContent = "You'll come in as a customer. Your own stores aren't touched"; b.append(name, sub);
          b.onclick = () => tgBecomeGuest(g.offer, g.who);
          return b;
        });
        $("tgHosts").replaceChildren(...buttons);
        $("tgHosts").style.cssText = "display:flex;flex-direction:column;gap:10px";
        if (!$("tgStatus").style.color) tgStatus(list.length ? "" : "Nobody's hosting yet. Looking…");
      }
      await tgSleep(1500);
    }
  } finally { tgLooking = false; }
}
function togetherOpen() { tgButtons(); tgLobby(); }
// ---- the guest ----
function tgBecomeGuest(offer, who) {            // the store's built for who you are as the page loads, so joining's a reload: the answer goes from the other side of it
  try {
    sessionStorage.setItem("jellybuster-guest", JSON.stringify({ who, offer }));
    sessionStorage.setItem("jellybuster-play", "1");
  } catch { return tgStatus("This browser won't let the page remember it's joining.", true); }
  if (started) saveState();                     // (your own store, where you left it)
  saveOff = true; location.reload();
}
function guestSetup() {                         // (from main.js, as the store's restored) just inside the door, the store open, till the host's clock comes through
  shift.h = 14; setFrontLock(false); armGates(false);
  shift.greet = `You're ${GUEST.who}'s guest. Tapes are free: take one to a TV and press E`;
}
function tgGuestLeaves() {
  try { sessionStorage.removeItem("jellybuster-guest"); } catch {}
  location.reload();
}
if (GUEST?.offer) {                             // just reloaded to join. (Once: a reload after this is a guest with nobody to connect to, free to leave)
  const { offer, who } = GUEST;
  try { sessionStorage.setItem("jellybuster-guest", JSON.stringify({ who })); } catch {}
  togetherJoin(offer, who);
}
$("tgHost").onclick = togetherHost;
$("tgStop").onclick = () => GUEST ? tgGuestLeaves() : tgStop();
addEventListener("pagehide", () => {
  const T = together;
  try { if (T.ctl?.readyState === "open") T.ctl.send('{"t":"bye"}'); } catch {}
  if (T.state !== "off") tgLeaveGroup(true);
});
