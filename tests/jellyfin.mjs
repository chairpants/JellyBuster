// The link to Jellyfin, against a stand-in server (tests/mock-jellyfin.mjs): signing in, the library as stock, covers,
// playing (the file itself, and HLS), the server being told. A tiny library and one too big for the store, too: every
// tape in stock has to end up on a shelf.  Run with: node tests/jellyfin.mjs
import { URL, launch, linkedContext } from "./browser.mjs";
import { startMock } from "./mock-jellyfin.mjs";

let failed = 0;
const check = (name, ok, detail = "") => { console.log(`${ok ? "  ✓" : "  ✗"} ${name}${detail ? `  (${detail})` : ""}`); if (!ok) failed++; };
const browser = await launch();
const ready = page => page.waitForFunction(() => !document.getElementById("mainMenu").hidden, null, { timeout: 300000 });
const watch = page => { const errors = []; page.on("pageerror", e => errors.push(String(e))); return errors; };
const noisy = e => !/ERR_|Failed to load/.test(e);

console.log("signing in");
{
  const mock = await startMock({ movies: 40, series: 6 });
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 600 } }), page = await ctx.newPage(), errors = watch(page);
  await page.goto(URL);
  await page.waitForSelector("#jfLink form");
  check("not linked: the form, and the game hasn't started", await page.evaluate(() => !window.__t && !window.catalog));
  await page.fill("#jfUrl", "127.0.0.1:1"); await page.fill("#jfUser", "tester"); await page.click("#jfGo");
  await page.waitForFunction(() => /Can't reach/.test(document.getElementById("jfWhy")?.textContent));
  check("a dead address says so", true);
  await page.fill("#jfUrl", mock.url + "/web/"); await page.fill("#jfPass", "wrong"); await page.click("#jfGo");
  await page.waitForFunction(() => /didn't work/.test(document.getElementById("jfWhy")?.textContent));
  check("a wrong password says so, and the /web/ on an address copied from the browser is forgiven", true);
  await page.fill("#jfPass", mock.PASSWORD); await page.click("#jfGo");
  await ready(page);
  check("signed in: the store opens", !(await page.$("#jfLink")));
  const kept = await page.evaluate(() => localStorage.getItem("jellybuster-link"));
  check("the token's kept, the password isn't", kept.includes("mock-token") && !kept.includes(mock.PASSWORD));
  check("no errors", errors.filter(noisy).length === 0, errors[0]);
  await page.reload(); await ready(page);
  check("still linked after a reload, no form", !(await page.$("#jfLink")));

  await page.click("#mmSettingsBtn");
  check("settings say who it's linked to", /Mock Jellyfin as tester/.test(await page.textContent("#setJelly")));
  await page.click("#setUnlink"); await page.waitForSelector("#jfLink form");
  check("unlinking: back to the form, signed out on the server", mock.log.some(l => l.path === "/Sessions/Logout") && await page.evaluate(() => !localStorage.getItem("jellybuster-link")));

  await page.fill("#jfUrl", mock.url); await page.click("#jfQuick");
  await page.waitForFunction(() => document.getElementById("jfCode")?.textContent === "123456");
  check("Quick Connect shows its code", true);
  mock.approveQuickConnect();
  await ready(page);
  check("approved elsewhere: the store opens", !(await page.$("#jfLink")));
  await ctx.close();
}

console.log("\nthe stock, and playing it");
{
  const ctx = await linkedContext(browser, { viewport: { width: 1000, height: 600 } }), page = await ctx.newPage(), errors = watch(page), mock = ctx.mock;
  await page.goto(URL); await ready(page);
  await page.evaluate(() => { localStorage.setItem("jellybuster-save", JSON.stringify({ v: 3, mode: "sandbox", fresh: true })); }); await page.reload(); await ready(page);
  await page.click("#mmFiles .acts .go"); await page.waitForTimeout(2500);
  check("in the store, no errors", errors.filter(noisy).length === 0, errors[0]);
  const s = await page.evaluate(() => {
    const c = __t.catalog, by = k => c.filter(t => t.shelf === k).length;
    return { n: c.length, unshelved: c.filter(t => !t.pos).map(t => t.title).slice(0, 5), wall: by("wall"), classic: by("classic"), kids: by("kids"), tv: by("tv"), mv: by("mv"),
      cats: [...new Set(c.map(t => t.category))], seasons: c.filter(t => t.id === "s4").map(t => t.seasons[0].label), multi: c.find(t => t.id === "m1")?.seasons[0].episodes.length,
      noArt: c.filter(t => !t.art).length, staff: c.reduce((a, t) => a + (t.copies?.length || 0), 0) };
  });
  check("every tape in stock is on a shelf", s.unshelved.length === 0, s.unshelved.join(", "));
  check("all the shelf blocks are stocked", s.wall && s.classic && s.kids && s.tv && s.mv, JSON.stringify(s));
  check("a tape per season", s.seasons.length >= 2 && s.seasons.includes("Season 0"), s.seasons.join(","));
  check("a film in two files is two parts on one tape", s.multi === 2);
  check("every tape has a cover (a printed one when the server has none)", s.noArt === 0);
  const pics = await page.evaluate(() => STORE_POSTERS.map(u => u.match(/\/Items\/([^/]+)\//)[1]));
  check("posters: each title once, never a season's, mostly movies with some shows and cartoons", new Set(pics).size === pics.length && !pics.some(p => /n\d+$/.test(p)) && pics.filter(p => p[0] === "m").length > pics.length / 2 && pics.some(p => p[0] === "s"), pics.slice(0, 12).join(" "));
  const canvas = await page.evaluate(async () => {
    const t = __t.catalog.find(t => t.art.startsWith("http"));
    const img = await new Promise((res, rej) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = rej; i.src = t.art; });
    const c = document.createElement("canvas"); c.width = c.height = 8; const g = c.getContext("2d"); g.drawImage(img, 0, 0, 8, 8);
    try { g.getImageData(0, 0, 1, 1); return "readable"; } catch (e) { return String(e); }
  });
  check("covers come through readable (the shelves paint them onto atlases)", canvas === "readable", canvas);

  const play = (where, at) => page.evaluate(async ([where, at]) => {
    const t = where === "hls" ? __t.catalog.find(t => t.id === "m4") : __t.catalog.find(t => t.id === "m0");
    t.tapePos = at ? { ep: 0, t: at } : null;
    __t.playEpisode(0, t);
    const v = document.getElementById("vid"), t0 = performance.now();
    const say = () => document.getElementById("nowPlaying").textContent;
    while (!(say().startsWith(`Now Playing: ${t.title}`) && v.currentTime > (at || 0) + 0.5 && !v.paused) && performance.now() - t0 < 30000) await new Promise(r => setTimeout(r, 200));
    let pixels = "tainted"; try { const c = document.createElement("canvas"); c.width = c.height = 4; const g = c.getContext("2d"); g.drawImage(v, 0, 0, 4, 4); g.getImageData(0, 0, 1, 1); pixels = "readable"; } catch {}
    return { time: v.currentTime, paused: v.paused, w: v.videoWidth, src: v.currentSrc.split("?")[0].replace(/^https?:\/\/[^/]+/, ""), pixels, say: say() };
  }, [where, at]);
  const hasPlay = await page.evaluate(() => typeof __t.playEpisode === "function");
  check("the test hooks reach the TV", hasPlay);
  if (hasPlay) {
    const a = await play("direct");
    check("an mp4: the file itself, playing, the picture usable on a texture", a.time > 0.5 && a.w === 320 && a.pixels === "readable" && a.src.includes("/Videos/m0/stream"), JSON.stringify(a));
    const cc = await page.evaluate(async () => {
      const off = Jelly.captionText(), say = Jelly.nextCaptions(); const t0 = performance.now();
      while (!Jelly.captionText() && performance.now() - t0 < 8000) await new Promise(r => setTimeout(r, 100));
      const on = Jelly.captionText(), end = Jelly.nextCaptions(); return { off, say, on, end, after: Jelly.captionText() };
    });
    check("captions: off to start, T brings the text track, tags stripped, T again turns it off", cc.off === "" && cc.say === "CC ENGLISH" && cc.on === "A test caption" && cc.end === "CAPTIONS OFF" && cc.after === "", JSON.stringify(cc));
    const wind = await page.evaluate(async () => {
      const v = document.getElementById("vid"), bar = document.getElementById("scrubBar"), wait = ms => new Promise(r => setTimeout(r, ms));
      const was = v.currentTime; __t.mediaDown("KeyN"); await wait(800);
      const during = { on: __t.media.on, paused: v.paused, bar: getComputedStyle(bar).display, text: bar.textContent, t: __t.media.t };
      __t.mediaUp("KeyN"); await wait(300); const after = { on: __t.media.on, playing: !v.paused, at: v.currentTime };
      __t.mediaDown("KeyV"); await wait(800); const back = __t.media.t; __t.mediaUp("KeyV"); await wait(200);
      const tap = () => { __t.mediaDown("KeyN"); __t.mediaUp("KeyN"); return __t.media.tapKey; }, oneTap = tap(), twoTaps = tap();
      const p0 = v.paused; __t.togglePause(); const p1 = v.paused; __t.togglePause();
      return { was, during, after, back, duration: v.duration, pauseFlips: p0 !== p1, oneTap, twoTaps };
    });
    check("V / N held: winds with the picture held, a bar in the corner saying where; let go and it plays on from there. One tap only asks, two change the episode. B: play / pause", wind.during.on && wind.during.paused && wind.during.bar === "block" && wind.during.t > wind.was && !wind.after.on && wind.after.playing && wind.after.at > wind.was && wind.back < wind.during.t && wind.pauseFlips && wind.oneTap === "KeyN" && wind.twoTaps === null, JSON.stringify(wind));
    const started = mock.log.some(l => l.path === "/Sessions/Playing" && l.body.includes('"m0"'));
    check("the server's told it's playing", started);
    const b = await play("hls");
    check("an mkv: HLS, playing, the picture usable on a texture", b.time > 0.5 && b.w === 320 && b.pixels === "readable" && b.src.startsWith("blob:"), JSON.stringify(b));
    check("the tape before it: the server's told it stopped", mock.log.some(l => l.path === "/Sessions/Playing/Stopped" && l.body.includes('"m0"')));
    const c = await play("direct", 12);
    check("a tape wound on plays from where it's wound to", c.time >= 12 && c.time < 20, String(c.time));
    const d = await play("hls", 12);
    check("the same over HLS", d.time >= 12 && d.time < 22, String(d.time));
    await page.evaluate(() => __t.eject());
    await page.waitForTimeout(300);
    check("out it comes: the server's told, no token left on the video", mock.log.filter(l => l.path === "/Sessions/Playing/Stopped").length >= 4 && await page.evaluate(() => !document.getElementById("vid").getAttribute("src")));
  }
  check("no errors playing", errors.filter(noisy).length === 0, errors.filter(noisy)[0]);
  await ctx.close();
}

console.log("\ncovers on their way");
{
  const ctx = await linkedContext(browser, { viewport: { width: 1000, height: 600 } }, { movies: 120, series: 10, imageDelay: 300, brokenImages: true }), page = await ctx.newPage(), errors = watch(page);
  await page.goto(URL, { timeout: 300000, waitUntil: "commit" });
  await page.waitForFunction(() => /^Covers \d+ \/ \d+$/.test(document.getElementById("coverProgress")?.textContent || ""), null, { timeout: 120000 });
  const during = await page.textContent("#coverProgress");
  check("a count on screen while they come in", /^Covers \d+ \/ \d+$/.test(during), during);
  await page.waitForFunction(() => /missing|in$/.test(document.getElementById("coverProgress")?.textContent || ""), null, { timeout: 300000 });
  const end = await page.textContent("#coverProgress");
  check("all in: it says so, and how many the server couldn't give", end === "1 cover missing", end);
  await page.waitForFunction(() => !document.getElementById("coverProgress"), null, { timeout: 20000 });
  check("then it goes away", true);
  check("no errors", errors.filter(noisy).length === 0, errors.filter(noisy)[0]);
  await ctx.close();
}

for (const [name, lib, min] of [["a tiny library", { movies: 3, series: 1 }, 1], ["no shows at all", { movies: 20, series: 0 }, 20], ["no movies at all", { movies: 0, series: 8 }, 1], ["one too big for the store", { movies: 4000, series: 400 }, 1000]]) {
  console.log(`\n${name}`);
  const ctx = await linkedContext(browser, { viewport: { width: 1000, height: 600 } }, lib), page = await ctx.newPage(), errors = watch(page);
  await page.goto(URL, { timeout: 300000 }); await ready(page);
  await page.evaluate(() => { localStorage.setItem("jellybuster-save", JSON.stringify({ v: 3, mode: "sandbox", fresh: true })); }); await page.reload({ timeout: 300000 }); await ready(page);
  await page.click("#mmFiles .acts .go"); await page.waitForTimeout(2000);
  const r = await page.evaluate(() => ({ n: __t.catalog.length, off: __t.catalog.filter(t => !t.pos).length, left: Jelly.info().left, walls: __t.catalog.flatMap(t => [t, ...(t.copies || [])]).filter(c => c.pos).length }));
  check("loads with no errors", errors.filter(noisy).length === 0, errors.filter(noisy)[0]);
  check("every tape in stock is on a shelf", r.off === 0 && r.n >= min, JSON.stringify(r));
  await ctx.close();
}

await browser.close();
console.log(failed ? `\n${failed} FAILED` : "\nall passed");
process.exit(failed ? 1 : 0);
