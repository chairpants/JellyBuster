// Look at the game from anywhere: a fresh store, the player put at x,z facing yaw (radians; 0 looks at the
// front door, PI toward the back) with pitch, then a screenshot. Optionally run some setup first (any JS, with
// the window.__t test hooks; its value is printed), or time the frames instead.
//   node tests/shot.mjs out.png 7.5,28.9,-1.57,0
//   node tests/shot.mjs out.png 10.3,29.1,-1.7,0.1 --setup "__t.setZone('closet', true)"
//   node tests/shot.mjs - 3,12,3.14,0 --mode simulation --gpu --fps   (frame times on the real GPU, no picture; --profile: where the time goes)
import { URL, launch, linkedContext } from "./browser.mjs";

const args = process.argv.slice(2), flag = f => args.includes(f), opt = f => args[args.indexOf(f) + 1];
const [out, at = "0,2.6,3.14,0"] = args, [x, z, yaw, pitch] = at.split(",").map(Number);
const browser = await launch({ gpu: flag("--gpu") });
const page = await (await linkedContext(browser, { viewport: { width: 1000, height: 600 }, deviceScaleFactor: 1 })).newPage();
const errors = []; page.on("pageerror", e => errors.push(String(e)));
const ready = () => page.waitForFunction(() => !document.getElementById("mainMenu").hidden, null, { timeout: 300000 });
await page.goto(URL, { timeout: 300000 }); await ready();
await page.evaluate(m => { localStorage.clear(); localStorage.setItem("jellybuster-save", JSON.stringify({ v: 3, mode: m, fresh: true })); }, flag("--mode") ? opt("--mode") : "sandbox");
await page.reload({ timeout: 300000 }); await ready();
await page.click("#mmFiles .acts .go"); await page.waitForTimeout(2500);
if (flag("--setup")) { const r = await page.evaluate(opt("--setup")).catch(e => { if (!/serialize/.test(e.message)) throw e; }); if (r !== undefined) console.log(r); }   // (whatever it comes to, printed, if it can be)
await page.evaluate(([x, z, yaw, pitch]) => Object.assign(__t.player, { x, z, yaw, pitch }), [x, z, yaw, pitch]);
await page.waitForTimeout(2000);
if (flag("--fps")) {
  const ts = await page.evaluate(() => new Promise(r => { const ts = [], t0 = performance.now(); const f = t => { ts.push(t); if (performance.now() - t0 < 6000) requestAnimationFrame(f); else r(ts); }; requestAnimationFrame(f); }));
  const d = ts.slice(1).map((t, i) => t - ts[i]).sort((a, b) => a - b);
  console.log(`fps ${(ts.length / 6).toFixed(1)} · median ${d[d.length >> 1].toFixed(2)} ms · p95 ${d[Math.floor(d.length * 0.95)].toFixed(2)} ms`);
}
if (flag("--profile")) {                         // where the main thread's time goes, per frame: the top functions by self time
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Profiler.enable"); await cdp.send("Profiler.setSamplingInterval", { interval: 100 }); await cdp.send("Profiler.start");
  const frames = await page.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 6000) requestAnimationFrame(f); else r(n); }; requestAnimationFrame(f); }));
  const { profile } = await cdp.send("Profiler.stop"), byId = new Map(profile.nodes.map(n => [n.id, n])), self = new Map();
  profile.samples.forEach((id, i) => { const f = byId.get(id).callFrame, k = `${f.functionName || "(anon)"} ${f.url.split("/").pop()}:${f.lineNumber + 1}`; self.set(k, (self.get(k) || 0) + (profile.timeDeltas[i] || 0)); });
  console.log(`${frames} frames; ms per frame, by function:`);
  [...self].sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([k, v]) => console.log(`  ${(v / 1000 / frames).toFixed(2).padStart(6)}  ${k}`));
}
if (out !== "-") await page.screenshot({ path: out });
console.log(errors.length ? `page errors:\n${errors.join("\n")}` : "no page errors");
await browser.close();
process.exit(errors.length ? 1 : 0);
