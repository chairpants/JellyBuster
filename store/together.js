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
    .filter(p => p[2].toLowerCase() === "udp" && p[7] === "host" && p[5] !== "9").map(p => `${tgHostOut(p[4])}|${p[5]}`))]
    .sort((a, b) => /^\d+\.\d+\.\d+\.\d+\|/.test(b) - /^\d+\.\d+\.\d+\.\d+\|/.test(a));   // (a plain IPv4 address first: the likeliest to reach, and the shortest)
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
// A browser hides its address in what it offers (a made-up name.local, for the other side to look up on the network), and on
// plenty of networks that lookup never comes back: the two never find each other. A page allowed the microphone is trusted
// with the real address, so the microphone's asked for (and let go straight away, nothing recorded) before anything's offered.
// Turned down, or no microphone: it goes ahead with the made-up name, and may still work
async function tgRevealAddress(say) {
  if (!navigator.mediaDevices?.getUserMedia) return false;
  try { if ((await navigator.permissions?.query({ name: "microphone" }))?.state === "granted") return true; } catch {}
  say("Your browser will ask to use the microphone. Allow it: that's what lets it tell the other device where this one is. Nothing's recorded, and it's switched straight off.");
  try { (await navigator.mediaDevices.getUserMedia({ audio: true })).getTracks().forEach(t => t.stop()); return true; }
  catch { return false; }
}
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
  if (GUEST) {                                  // a guest with nobody to be the guest of: told so in the store, then back to their own menu, where it says why
    toast(status || "The other player left", !bad); setTimeout(() => tgGuestLeaves(status || "The other player left.", bad), 4000);
    return;
  }
  tgStatus(status, bad); tgButtons(); tgLobby();
}
async function tgDiagnose(pc) {                // why it never came up, in a line: what each side offered, whether the other's address was found, whether anything answered
  if (!pc) return "";
  try {
    const st = [...(await pc.getStats()).values()], by = t => st.filter(s => s.type === t);
    const where = c => c.address || "(hidden)";
    const local = by("local-candidate").map(c => `${c.candidateType} ${where(c)} ${c.protocol}`);
    const remote = by("remote-candidate").map(c => `${c.candidateType} ${where(c)}`);
    const pairs = by("candidate-pair"), sent = pairs.reduce((n, p) => n + (p.requestsSent || 0), 0), got = pairs.reduce((n, p) => n + (p.responsesReceived || 0) + (p.requestsReceived || 0), 0);
    const states = [...new Set(pairs.map(p => p.state))].join("/") || "none";
    return `[this device offered: ${local.join(", ") || "nothing"} · theirs, as found here: ${remote.join(", ") || "nothing"} · checks sent ${sent}, heard back ${got} · pairs ${states} · ice ${pc.iceConnectionState}]`;
  } catch (e) { return `[no details: ${e.message}]`; }
}
function tgLost() {                             // the link's ended: it never came up, or it did and now it's gone
  if (!together.up) { const T = together, mine = T.try; return void tgDiagnose(T.pc).then(d => { if (mine !== T.try) return; console.warn("Play together:", d); tgStop("Couldn't connect directly. Usual causes: a guest network or your router's AP isolation setting, a firewall blocking UDP, a VPN, or the other device being on another network. On a Mac, the browser needs Local Network access: System Settings, Privacy & Security, Local Network. " + d, true); }); }
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
    await tgRevealAddress(t => tgStatus(t)); if (mine !== T.try) return;
    tgStatus("Getting ready…");
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
    await tgRevealAddress(t => GUEST ? toast(t, true) : tgStatus(t)); if (mine !== T.try) return;
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
  T.ctl.send(JSON.stringify({ t: "hi", name: tgMyName(), seed: T.seed, uniform: !CUSTOMER, guest: !!GUEST }));
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
    if (playing && T.peer) tgVcrSend(true);      // (where the tape's got to: the other's put right if it's wandered)
  }
  tgWorldTick();
  const g = me.group.position, r = v => Math.round(v * 1000) / 1000;
  const sit = onStool ? STOOL_SIT : seated ? (seatAt?.hipY ? { hipY: seatAt.hipY } : {}) : null;
  const pose = fall ? 3 : sit ? 2 : keys.has("KeyC") ? 1 : 0;
  try { T.pos.send(JSON.stringify([r(g.x), r(g.y), r(g.z), r(me.group.rotation.y), pose, fall ? r(fall.prone ? -fall.tilt : fall.tilt) : sit?.hipY ?? 0, sit?.tuck ?? 0, jump.air || mantle ? 1 : 0])); } catch {}
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
  if (d.t === "vcr") return tgVcrApply(d);
  if (d.t === "world") return tgWorldApply(d);
  if (d.t !== "hi" || T.peer) return;
  tgPeerArrives(String(d.name || "Player").replace(/[<>]/g, "").slice(0, 24), d.seed >>> 0, !!d.uniform, !!d.guest);
  if (T.host && playing) tgVcrSend();           // (a tape's already going: on theirs too)
  tgWorld.last = {}; tgWorld.touched = {}; tgWorld.fullAt = 0;   // (the host's whole store goes over first thing; the guest's own changes after that)
  if (!T.host) for (const [k, p] of Object.entries(TG_PARTS)) tgWorld.last[k] = p.get();   // (the guest's store as it loaded isn't news: the host's is what counts)
  toast(`${T.peer.name} is here`, true);
  tgStatus(`Connected to ${T.peer.name}. Each of you is in your own store, so you'll see each other but nothing else is shared yet.`);
}
function tgOnPos(data, mine) {
  const T = together, P = T.peer; if (mine !== T.try || !P) return;
  let a; try { a = JSON.parse(data); } catch { return; }
  if (!Array.isArray(a) || a.length !== 8 || !a.every(Number.isFinite)) return;
  P.heard = performance.now();
  if (Math.abs(a[0]) > 500 || Math.abs(a[1]) > 100 || Math.abs(a[2]) > 500) return;   // (nowhere in this world)
  P.to = { x: a[0], y: a[1], z: a[2], ry: a[3] };
  P.c.setAir(!!a[7]);
  P.tilt = a[4] === 3 ? Math.max(0, Math.min(1, Math.abs(a[5]))) : 0; P.prone = a[4] === 3 && a[5] < 0;   // (down on their back, or their face: see fall, store/player.js)
  if (a[4] !== P.pose || (a[4] !== 3 && (a[5] !== P.hipY || a[6] !== P.tuck))) {
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

// ---- the tape: whatever's in one VCR is in the other's, at the same place, playing or paused ----
// Either can put a tape in, pause it, wind it or take it out: each change goes over as where the tape is now (which tape,
// which episode, how far in, paused or not), and the other's VCR is put the same. What that does to the other's own video
// (it starts, it seeks, it pauses) would come straight back as a change of theirs: for a moment after, those aren't sent.
// A tape put in from the other side plays from the catalog's copy (nothing's off your shelves), and comes out of the VCR
// into nobody's hand. The host says where its tape's got to every couple of seconds; more than a second out, it's put right
const tgVcr = { quiet: 0, theirs: null, want: null };   // want: the newest word from them, and when it came (a tape that's still loading is put to that, not to what started it)
function tgVcrSend(drift = false) {
  const T = together; if (T.ctl?.readyState !== "open" || !T.peer || performance.now() < tgVcr.quiet) return;
  const s = playing ? { t: "vcr", key: tapeKey(titleOfCopy(playing.tape)), ep: playing.idx, at: Math.round((media.on ? media.t : video.currentTime) * 100) / 100, paused: video.paused || media.on, drift }
    : { t: "vcr", key: null };
  if (drift && !playing) return;
  try { T.ctl.send(JSON.stringify(s)); } catch {}
}
for (const ev of ["play", "pause", "seeked"]) video.addEventListener(ev, () => { if (!paused && !media.on) tgVcrSend(); });   // (not the pause screen pausing it: that's just you)
function tgVcrApply(d) {
  const T = together, quiet = ms => { tgVcr.quiet = Math.max(tgVcr.quiet, performance.now() + ms); };
  quiet(1500); tgVcr.want = { d, got: performance.now() };
  if (!d.key) { if (playing) eject(playing.tape !== tgVcr.theirs); tgVcr.theirs = null; return; }   // (yours comes out into your hand; theirs just goes)
  const t = catalog.find(x => tapeKey(x) === d.key);
  if (!t) { toast(`${T.peer?.name || "They"} put on a tape this store doesn't have`); return; }
  const at = (w = tgVcr.want) => w.d.paused ? w.d.at : w.d.at + (performance.now() - w.got) / 1000;   // (how far it'll have got while this one caught up)
  const line = (w = tgVcr.want) => {
    if (Math.abs(video.currentTime - at(w)) > (w.d.drift ? 1 : 0.5)) video.currentTime = at(w);
    if (w.d.paused && !video.paused) video.pause(); else if (!w.d.paused && video.paused) video.play().catch(() => {});
  };
  if (playing && tapeKey(titleOfCopy(playing.tape)) === d.key && playing.idx === d.ep) { if (!media.on) line(); return; }
  if (d.drift) return;                           // (a reminder of where it's got to: no reason to change tapes over)
  if (playing && playing.tape !== tgVcr.theirs) eject();   // yours comes out into your hand, as when you swap tapes
  tgVcr.theirs = t; t.tapePos = { ep: d.ep, t: at() };
  quiet(8000);                                   // (however long the tape takes to load: its starting isn't news)
  playEpisode(d.ep, t).then(() => { const w = tgVcr.want; if (playing?.tape === t && w.d.key === d.key && w.d.ep === d.ep) line(w); tgVcr.quiet = performance.now() + 800; });
}

// ---- the store's moving parts: doors, lights, lamps, blinds, the counter's flap, the cooler, the stool, the standee ----
// Each side looks at them a few times a second and sends the parts that have changed since it last said; the other puts its
// own the same. What's just been put to the other's word counts as already said, so it isn't sent straight back. The host
// sends the lot every few seconds too (whatever didn't take the first time, someone in a doorway, say, takes then), but
// not over anything the guest's only just changed. Customers and staff are each side's own: a door one of theirs opens opens on both
const tgWorld = { last: {}, touched: {}, at: 0, fullAt: 0 };
const TG_PARTS = {
  doors: { get: () => doors.map(d => d.push ? null : d.open), set: v => v.forEach((o, i) => { const d = doors[i]; if (d && !d.push && o != null && d.open !== o) tgDoorSet(d, o); }) },
  lights: { get: () => LIGHT_ZONES.map(z => !!zoneOn[z]), set: v => LIGHT_ZONES.forEach((z, i) => { if (v[i] != null && !!zoneOn[z] !== v[i]) setZone(z, v[i]); }) },
  lamps: { get: () => lamps.map(l => !!l.userData.on), set: v => v.forEach((on, i) => { if (lamps[i] && !!lamps[i].userData.on !== on) setLamp(lamps[i], on); }) },
  blinds: { get: () => officeFx.blinds.map(b => !!b.open), set: v => v.forEach((o, i) => { const b = officeFx.blinds[i]; if (b && !!b.open !== o) blindsToggle(b); }) },
  flap: { get: () => !!flapOpen, set: v => { if (!!flapOpen !== v) toggleFlap(); } },
  cooler: { get: () => !!coolerOpen, set: v => { coolerOpen = v; } },
  stool: { get: () => stool.carried || stool.by || onStool ? tgWorld.last.stool : [+stool.x.toFixed(2), +stool.z.toFixed(2)],   // (in someone's hands: where it was)
    set: v => { if (!v || stool.carried || stool.by || onStool) return; stool.x = v[0]; stool.z = v[1]; stoolFit(stool.x, stool.z, stool.box); stool.g.position.set(stool.x, 0, stool.z); } },
  cutout: { get: () => cutout.carried ? tgWorld.last.cutout : [+cutout.x.toFixed(2), +cutout.z.toFixed(2), +cutout.ry.toFixed(3)],
    set: v => { if (!v || cutout.carried) return; [cutout.x, cutout.z, cutout.ry] = v; cutoutFit(cutout.x, cutout.z, cutout.ry, cutout.box); cutout.g?.position.set(cutout.x, 0, cutout.z); cutout.g?.rotation.set(0, cutout.ry, 0); tvBake = bakeTvVis(); } },
};
function tgDoorSet(d, open) {                    // as if it were swung here: you step out of its way. A lock (customer mode's) doesn't stop it: it's open over there
  if (!open && playerIn(d.shut)) return;         // (you're in the doorway: it'll go when the host next says, once you're through)
  const was = d.locked; d.locked = false; toggleDoor(d); d.locked = was;
}
function tgWorldTick() {                         // (from tgSend, so it goes on in a background tab)
  const T = together, now = performance.now(); if (T.ctl?.readyState !== "open" || !T.peer || now - tgWorld.at < 250) return;
  tgWorld.at = now;
  const full = T.host && now - tgWorld.fullAt > 3000, out = {};
  for (const [k, p] of Object.entries(TG_PARTS)) {
    const v = p.get(), j = JSON.stringify(v);
    if (j !== JSON.stringify(tgWorld.last[k])) { tgWorld.last[k] = v; tgWorld.touched[k] = now; out[k] = v; }
    else if (full && v !== undefined) out[k] = v;
  }
  if (full) tgWorld.fullAt = now;
  if (Object.keys(out).length) try { T.ctl.send(JSON.stringify({ t: "world", s: out, full })); } catch {}
}
function tgWorldApply(d) {
  const now = performance.now();
  for (const [k, v] of Object.entries(d.s || {})) {
    const p = TG_PARTS[k]; if (!p) continue;
    if (d.full && now - (tgWorld.touched[k] || 0) < 1500) continue;   // (changed here a moment ago: what's on its way over is newer)
    try { p.set(v); } catch (e) { console.warn("Play together: couldn't set", k, e); }
    tgWorld.last[k] = v;                         // (said: not to be sent back)
  }
}

// ---- the other player ----
function tgPeerArrives(name, seed, uniform, guest) {
  const rnd = seeded(seed), female = !guest && rnd() < 0.5;
  const c = StoreCustomers.build({ ...StoreCustomers.randomOutfit(rnd, female), hat: null, ...(guest ? GUEST_LOOK : {}),
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
  g.rotation.order = "YXZ"; g.rotation.x += ((P.prone ? 1 : -1) * (P.tilt || 0) * Math.PI / 2 - g.rotation.x) * Math.min(1, dt * 12);
  if (P.tilt > 0.4) {                            // (down: folded round what's there, in this copy of the store too. Their head's the far end from the feet)
    const dn = P.prone ? -1 : 1, fx = dn * Math.sin(P.to.ry), fz = dn * Math.cos(P.to.ry), b = bodyBend(P.to.x - fx * FALL.long, P.to.z - fz * FALL.long, fx, fz, P.to.ry); P.c.setBend(b.legs, b.arm0, b.arm1);
  } else P.c.setBend();
  const dx = P.to.x - g.position.x, dy = P.to.y - g.position.y, dz = P.to.z - g.position.z, d = Math.hypot(dx, dz);
  if (!g.visible || d > 6 || Math.abs(dy) > 3) {   // first seen, or they've gone further than anybody walks in a moment: no sliding over there
    g.position.set(P.to.x, P.to.y, P.to.z); P.ry = P.to.ry; g.visible = true; P.c.tick(dt, 0); return;
  }
  const k = 1 - Math.exp(-dt * 12);
  g.position.x += dx * k; g.position.y += dy * k; g.position.z += dz * k;
  P.ry += Math.atan2(Math.sin(P.to.ry - P.ry), Math.cos(P.to.ry - P.ry)) * k; g.rotation.y = P.ry;
  P.speed += (d * k / Math.max(dt, 1e-4) - P.speed) * Math.min(1, dt * 10);   // smoothed, or the legs flicker between updates
  P.c.tick(dt, P.speed < 0.15 || P.tilt > 0.05 ? 0 : P.speed);
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
function tgGuestLeaves(note, bad = false) {     // note: what to say on Play Together once the menu's back (why it ended)
  try { sessionStorage.removeItem("jellybuster-guest"); if (note) sessionStorage.setItem("jellybuster-tg-note", JSON.stringify({ note, bad })); } catch {}
  location.reload();
}
function tgNoteShown() {                        // (from the title menu) -> what to say, if a guest's just been sent home, once
  try { const n = JSON.parse(sessionStorage.getItem("jellybuster-tg-note")); sessionStorage.removeItem("jellybuster-tg-note"); return n; } catch { return null; }
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
