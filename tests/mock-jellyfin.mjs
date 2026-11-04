// A stand-in Jellyfin for the tests: the parts of the API the game uses, answering the way the real one does (any
// origin, Range on the file, a token wanted everywhere but the public calls), with a made-up library.
//   startMock({ movies: 300, series: 40, imageDelay: ms, brokenImages: true }) -> { url, link, log, approveQuickConnect }
// Video is a few seconds of test card made with ffmpeg the first time it's asked for: an mp4 played directly, and the
// same as HLS for what the mock says a browser can't play (every 5th movie's an .mkv).
import http from "node:http";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TOKEN = "mock-token", USER = { Id: "user1", Name: "tester" }, PASSWORD = "hunter2";
const MEDIA = join(tmpdir(), "jellybuster-mock-media");

function media(hd) {
  if (hd) {                                      // (1080p, 24 fps: for timing the screens against what a film actually is)
    const big = join(MEDIA, "card1080.mp4");
    if (!existsSync(big)) { mkdirSync(MEDIA, { recursive: true }); execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=size=1920x1080:rate=24:duration=60", "-f", "lavfi", "-i", "sine=frequency=330:duration=60", "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-g", "24", "-c:a", "aac", "-movflags", "+faststart", big]); }
    return { mp4: big, hls: big };
  }
  const mp4 = join(MEDIA, "card.mp4"), hls = join(MEDIA, "card.m3u8");
  if (!existsSync(hls)) {
    mkdirSync(MEDIA, { recursive: true });
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=320x240:rate=15:duration=30", "-f", "lavfi", "-i", "sine=frequency=330:duration=30",
      "-c:v", "libx264", "-profile:v", "baseline", "-pix_fmt", "yuv420p", "-g", "15", "-c:a", "aac", "-movflags", "+faststart", mp4]);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", mp4, "-c", "copy", "-f", "hls", "-hls_time", "4", "-hls_playlist_type", "vod", "-hls_segment_filename", join(MEDIA, "seg%d.ts"), hls]);
  }
  return { mp4, hls };
}

const GENRES = [["Comedy"], ["Action", "Adventure"], ["Science Fiction"], ["Horror", "Thriller"], ["Drama"], ["Drama", "Romance"], ["Family", "Animation"], ["Documentary"], ["Thriller", "Crime"], ["Fantasy", "Comedy"]];
const TV_GENRES = [["Comedy"], ["Drama", "Crime"], ["Animation", "Comedy"], ["Reality"], ["Sci-Fi & Fantasy"], ["Horror"], ["Kids"], ["Talk"], ["Animation"], ["Documentary"]];
const NOUNS = ["Harbor", "Midnight", "Velvet", "Static", "Comet", "Ghost", "Rewind", "Neon", "Paper", "Thunder", "Marble", "Orbit"];
function library({ movies = 300, series = 40 } = {}) {
  const items = new Map(), add = it => (items.set(it.Id, it), it);
  const name = i => `${i % 3 === 0 ? "The " : ""}${NOUNS[i % NOUNS.length]} ${NOUNS[(i * 7 + 3) % NOUNS.length]} ${i}`;
  for (let i = 0; i < movies; i++) add({ Id: `m${i}`, Type: "Movie", Name: name(i), Genres: GENRES[i % GENRES.length], ProductionYear: 1950 + i * 7 % 76, CommunityRating: 3 + i * 13 % 70 / 10,
    OfficialRating: i % 4 === 0 ? "R" : "PG", ProductionLocations: ["United States of America"], Container: i % 5 === 4 ? "mkv" : "mp4", ImageTags: i % 17 === 16 ? {} : { Primary: `tag${i}` } });
  if (movies > 2) { items.get("m1").PartCount = 2; add({ Id: "m1p2", Type: "MoviePart", Name: "part 2", Container: "mp4" }); }
  for (let i = 0; i < series; i++) {
    const s = add({ Id: `s${i}`, Type: "Series", Name: `${NOUNS[(i * 5) % NOUNS.length]} Street ${i}`, Genres: TV_GENRES[i % TV_GENRES.length], ProductionYear: 1960 + i * 11 % 65, CommunityRating: 4 + i * 7 % 55 / 10,
      OfficialRating: i % 3 ? "TV-PG" : "TV-MA", ProductionLocations: [], ImageTags: { Primary: `stag${i}` } });
    for (let n = i % 4 === 0 ? 0 : 1; n <= 1 + i % 4; n++) {
      add({ Id: `s${i}n${n}`, Type: "Season", SeriesId: s.Id, IndexNumber: n, Name: `Season ${n}`, ImageTags: n % 2 ? { Primary: `seas${i}n${n}` } : {} });
      for (let e = 1; e <= 3 + i % 5; e++) add({ Id: `s${i}n${n}e${e}`, Type: "Episode", SeriesId: s.Id, SeriesName: s.Name, ParentIndexNumber: n, IndexNumber: e, Name: `Episode ${e}`, Container: "mp4" });
    }
  }
  return items;
}

export async function startMock(options = {}) {
  const items = library(options), log = [], quick = { approved: false };
  const authed = req => (req.headers.authorization || "").includes(`Token="${TOKEN}"`);
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, "http://x"), p = u.pathname;
    const head = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*", "Access-Control-Expose-Headers": "*" };
    const json = (o, code = 200) => { res.writeHead(code, { ...head, "Content-Type": "application/json" }); res.end(JSON.stringify(o)); };
    if (req.method === "OPTIONS") { res.writeHead(204, head); return res.end(); }
    let body = ""; req.on("data", d => body += d);
    req.on("end", () => {
      log.push({ method: req.method, path: p, query: u.search, body });
      if (p === "/System/Info/Public") return json({ ServerName: "Mock Jellyfin", Version: "12.4.0", Id: "mock", StartupWizardCompleted: true });
      if (p === "/Users/AuthenticateByName") { const b = JSON.parse(body); return b.Username === USER.Name && b.Pw === PASSWORD ? json({ AccessToken: TOKEN, User: USER }) : json({}, 401); }
      if (p === "/QuickConnect/Initiate") return json({ Code: "123456", Secret: "s3cret" });
      if (p === "/QuickConnect/Connect") return json({ Authenticated: quick.approved });
      if (p === "/Users/AuthenticateWithQuickConnect") return json({ AccessToken: TOKEN, User: USER });
      const img = p.match(/^\/Items\/([^/]+)\/Images\/(?:Primary|Backdrop|Logo)$/);
      if (img && options.brokenImages && img[1] === "m0") { res.writeHead(500, head); return res.end(); }
      if (img && options.imageDelay && !req.delayed) { req.delayed = true; return setTimeout(() => { res.writeHead(200, { ...head, "Content-Type": "image/svg+xml" }); res.end('<svg xmlns="http://www.w3.org/2000/svg" width="185" height="278"><rect width="185" height="278" fill="#884"/></svg>'); }, options.imageDelay); }
      if (img) { const hue = [...img[1]].reduce((a, c) => a * 31 + c.charCodeAt(0) >>> 0, 7) % 360;
        res.writeHead(200, { ...head, "Content-Type": "image/svg+xml" });
        return res.end(`<svg xmlns="http://www.w3.org/2000/svg" width="185" height="278"><rect width="185" height="278" fill="hsl(${hue} 70% 45%)"/><circle cx="92" cy="120" r="60" fill="#fff"/></svg>`); }
      const streaming = p.match(/^\/Videos\/([^/]+)\/stream$/) || p.startsWith("/hls/");
      if (streaming) {
        if (u.searchParams.get("ApiKey") !== TOKEN) { res.writeHead(401, head); return res.end(); }
        const { mp4, hls } = media(options.hdVideo);
        if (p === "/hls/master.m3u8") { res.writeHead(200, { ...head, "Content-Type": "application/vnd.apple.mpegurl" });
          return res.end(readFileSync(hls, "utf8").replace(/^(seg\d+\.ts)$/gm, `$1?ApiKey=${TOKEN}`)); }
        if (p.startsWith("/hls/")) { res.writeHead(200, { ...head, "Content-Type": "video/mp2t" }); return res.end(readFileSync(join(MEDIA, p.slice(5)))); }
        const size = statSync(mp4).size, data = readFileSync(mp4), m = (req.headers.range || "").match(/bytes=(\d*)-(\d*)/);
        if (m) { const a = +m[1] || 0, b = m[2] ? +m[2] : size - 1;
          res.writeHead(206, { ...head, "Content-Type": "video/mp4", "Accept-Ranges": "bytes", "Content-Range": `bytes ${a}-${b}/${size}`, "Content-Length": b - a + 1 });
          return res.end(data.subarray(a, b + 1)); }
        res.writeHead(200, { ...head, "Content-Type": "video/mp4", "Accept-Ranges": "bytes", "Content-Length": size }); return res.end(data);
      }
      if (/\/Subtitles\/\d+\/0\/Stream\.vtt$/.test(p)) { res.writeHead(200, { ...head, "Content-Type": "text/vtt" }); return res.end("WEBVTT\n\n00:00.000 --> 00:30.000\n<i>A test</i> caption\n"); }
      if (!authed(req)) return json({}, 401);
      if (p === "/Items" && u.searchParams.get("Ids")) {
        const cast = [["Ann Example", "Dr. Vale"], ["Ben Sample", "The Detective"], ["Cleo Stand-In", "Mara"], ["Dev Placeholder", "Himself"], ["Ed Extra", "Crowd"]];
        return json({ Items: u.searchParams.get("Ids").split(",").map(id => items.get(id)).filter(Boolean).map(it => ({ ...it, Overview: it.Type === "Season" ? "" : `${it.Name} is the kind of picture you rent on a rainy Friday. A stranger comes to town, nothing is what it seems, and by the time the credits roll someone has learned something about themselves. Critics called it a film. Audiences called it their favorite tape of the summer.`,
          Taglines: ["Be kind. Rewind."], Studios: [{ Name: "Mock Pictures" }], CriticRating: 81, RunTimeTicks: it.Type === "Movie" ? 6.3e10 : 0, BackdropImageTags: it.Type === "Season" ? [] : ["bd"],
          People: it.Type === "Season" ? [] : [...cast.map(([Name, Role], i) => ({ Id: `p${i}`, Name, Role, Type: "Actor", PrimaryImageTag: `f${i}` })), { Id: "pd", Name: "Vera Director", Type: "Director" }, { Id: "pw", Name: "Walt Writer", Type: "Writer" }, { Id: "pc", Name: "Cora Composer", Type: "Composer" }] })) });
      }
      if (p === "/Items") {
        const types = (u.searchParams.get("IncludeItemTypes") || "").split(",");
        return json({ Items: [...items.values()].filter(i => types.includes(i.Type)) });
      }
      const parts = p.match(/^\/Videos\/([^/]+)\/AdditionalParts$/);
      if (parts) return json({ Items: parts[1] === "m1" ? [items.get("m1p2")] : [] });
      const info = p.match(/^\/Items\/([^/]+)\/PlaybackInfo$/);
      if (info) { const it = items.get(info[1]), b = JSON.parse(body); if (!it) return json({}, 404);
        const direct = it.Container === "mp4" && b.EnableDirectPlay !== false && b.DeviceProfile?.DirectPlayProfiles?.some(d => d.Container.split(",").includes("mp4"));
        return json({ PlaySessionId: `play-${it.Id}`, MediaSources: [{ Id: it.Id, Container: it.Container, ETag: "etag", SupportsDirectPlay: direct, SupportsDirectStream: !direct, MediaStreams: [{ Type: "Video", Index: 0 }, { Type: "Subtitle", Index: 2, Language: "eng", DisplayTitle: "English", IsTextSubtitleStream: true }, { Type: "Subtitle", Index: 3, Language: "und", IsTextSubtitleStream: false }],
          TranscodingUrl: direct ? undefined : `/hls/master.m3u8?ApiKey=${TOKEN}&PlaySessionId=play-${it.Id}` }] }); }
      if (p.startsWith("/Sessions/")) { res.writeHead(204, head); return res.end(); }
      json({}, 404);
    });
  });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  server.unref();
  const url = `http://127.0.0.1:${server.address().port}`;
  return { url, log, server, USER, PASSWORD, approveQuickConnect: () => { quick.approved = true; },
    link: { url, token: TOKEN, userId: USER.Id, userName: USER.Name, serverName: "Mock Jellyfin" } };
}
