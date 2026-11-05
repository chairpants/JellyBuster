// The link to a Jellyfin server: this is where the store's stock comes from. index.html waits on Jelly.ready before
// it loads the game, because the game reads window.STORE_CATALOG while it loads.
//   - the link: a form for the server's address and a sign-in (a password, or Quick Connect). What's kept in
//     localStorage is the address and the session token, never the password.
//   - the stock: every movie a tape, every season of a show a tape, each put in one of the store's sections and on one
//     of its shelf blocks (t.shelf, which store/shelves.js lays out). What won't fit in the store is left out.
//   - playing: Jelly.attach(video, itemId, atSeconds) asks the server how this browser should play the item: the file
//     itself if the browser can, else HLS (remuxed or transcoded, through hls.js), and tells the server how it's going.
// Browser-to-server directly, no proxy: Jellyfin answers any origin (Access-Control-Allow-Origin: *), file:// included.
(() => {
  const KEY = "jellybuster-link", DEVICE_KEY = "jellybuster-device", VERSION = "0.1.0";
  // what each shelf block holds: { bays, cap: tapes per bay }, as store/shelves.js builds them. tests/jellyfin.mjs checks every tape in stock gets a slot
  const SHELVES = { wall: { bays: 27, cap: 44 }, classic: { bays: 8, cap: 33 }, kids: { bays: 16, cap: 33 }, tv: { bays: 32, cap: 33 }, mv: { bays: 2, cap: 44 } };

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };
  let link = (() => { try { return JSON.parse(store.get(KEY)) || null; } catch { return null; } })();   // { url, token, userId, userName, serverName }
  const deviceId = store.get(DEVICE_KEY) || (() => { const id = `jellybuster-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`; store.set(DEVICE_KEY, id); return id; })();
  const authHeader = (token, device = deviceId) => `MediaBrowser Client="JellyBuster", Device="Web browser", DeviceId="${device}", Version="${VERSION}"${token ? `, Token="${token}"` : ""}`;
  // Playing together (store/together.js) needs a session of this tab's own, or two tabs would be one session to the
  // server. The same token under another DeviceId is exactly that, and adds nothing to the server's list of devices
  const tabDevice = `${deviceId}-${Math.random().toString(36).slice(2, 10)}`;

  async function call(base, token, path, { method = "GET", body, timeout = 15000, keepalive = false, device } = {}) {
    let r;
    try {
      r = await fetch(base + path, { method, keepalive, signal: keepalive ? undefined : AbortSignal.timeout(timeout),
        headers: { Authorization: authHeader(token, device), ...(body ? { "Content-Type": "application/json" } : {}) }, body: body && JSON.stringify(body) });
    } catch (e) {
      const err = new Error(unreachable(base, e)); err.offline = true; throw err;
    }
    if (!r.ok) { const err = new Error(`The server said ${r.status} to ${path.split("?")[0]}`); err.status = r.status; throw err; }
    return r.status === 204 || !/json/.test(r.headers.get("content-type") || "") ? null : r.json();
  }
  const api = (path, opts) => call(link.url, link.token, path, opts);
  function unreachable(base, e) {
    // (Whether an https page may reach an http server depends on the browser, and a failed fetch doesn't say why it failed: so, what to try)
    if (location.protocol === "https:" && base.startsWith("http:")) return `Can't reach ${base}. This page is https and that address is http, which some browsers block. To check, open ${base} in a new tab. If Jellyfin loads, this browser is blocking the game: run your own copy of it instead of this page. If it doesn't load, check the address, and that this device is on the same network.`;
    return e?.name === "TimeoutError" ? `${base} took too long to answer.` : `Can't reach ${base}. Is the address right, and is Jellyfin running?`;
  }
  const cleanAddress = a => {
    a = a.trim().replace(/\/+$/, "").replace(/\/web(\/.*)?$/, "");
    return /^https?:\/\//i.test(a) ? a : `http://${a}`;
  };

  // ---- from Jellyfin's items to tapes ----
  const noTags = s => String(s ?? "").replace(/[<>]/g, "");   // the game puts titles in innerHTML in places, and these came from the outside
  const lower = it => (it.Genres || []).map(g => g.toLowerCase());
  const has = (g, ...names) => names.some(n => g.includes(n));
  const firstOf = (g, ...names) => { const i = g.findIndex(x => names.includes(x)); return i < 0 ? Infinity : i; };
  const grownUp = it => /^(R|NC-17|TV-MA|TV-14)$/i.test(it.OfficialRating || "");
  const japanese = it => (it.ProductionLocations || []).some(l => /japan/i.test(l));
  // a movie's section: the one that best fits its genres, the first genre counting most
  const FILM_SECTIONS = {
    "Comedy": ["comedy", "parody", "satire", "stand-up"],
    "Action & Adventure": ["action", "adventure", "action & adventure", "war", "western", "martial arts", "disaster", "thriller", "suspense"],
    "Sci-Fi & Fantasy": ["science fiction", "sci-fi", "sci-fi & fantasy", "fantasy"],
    "Horror": ["horror", "slasher"],
    "Drama": ["drama", "romance", "romantic comedy", "biography", "history", "crime", "mystery", "film-noir", "film noir", "sport", "sports"],
  };
  function placeMovie(it) {                       // -> [section, shelf]
    const g = lower(it);
    if (has(g, "holiday", "christmas")) return ["Holiday", "kids"];
    const anim = g.includes("animation");
    if (g.includes("anime") || (anim && japanese(it))) return ["Anime", grownUp(it) || !/^(G|PG|TV-Y7?|TV-G|TV-PG)$/i.test(it.OfficialRating || "") ? "tv" : "kids"];
    if (anim) return grownUp(it) ? ["Animation", "tv"] : ["Family & Kids", "kids"];
    if (has(g, "family", "children", "kids")) return ["Family & Kids", "kids"];
    if (g.includes("documentary")) return ["Documentary", "tv"];
    if (/^music/.test(g[0] || "")) return ["Music", "tv"];
    let best = "Drama", top = 0;
    for (const [section, names] of Object.entries(FILM_SECTIONS)) {
      const fit = g.reduce((a, x, i) => a + (names.includes(x) ? 1 / (i + 1) : 0), 0);
      if (fit > top) { top = fit; best = section; }
    }
    return [best, "wall"];                        // (the classics are picked out of these afterwards: see stock())
  }
  function placeSeries(it) {
    const g = lower(it), year = it.ProductionYear || 0;
    const kidRated = /^(TV-Y7?|TV-G|TV-PG|G|PG)$/i.test(it.OfficialRating || "");
    const anim = g.includes("animation");
    if (g.includes("anime") || (anim && japanese(it))) return ["Anime", kidRated ? "kids" : "tv"];
    if (anim) return ["Animation", grownUp(it) ? "tv" : "kids"];
    if (has(g, "kids", "children", "family")) return ["Kids & Educational", "kids"];
    if (has(g, "reality", "game show", "game-show")) return ["Reality TV", "tv"];
    if (g.includes("documentary")) return ["Documentary", "tv"];
    if (has(g, "talk", "talk show", "news", "sketch", "late night")) return ["Sketch Comedy & Late Night", "tv"];
    if (has(g, "horror", "anthology")) return ["Horror & Anthology", "tv"];
    if (firstOf(g, "comedy", "sitcom") < firstOf(g, "drama", "action", "action & adventure", "crime", "sci-fi & fantasy", "science fiction", "mystery"))
      return [year && year < 1985 ? "Classic Sitcoms" : "Sitcoms", "tv"];
    return ["Drama & Adventure", "tv"];
  }
  const imageUrl = (id, tag, q) => `${link.url}/Items/${id}/Images/Primary?${q}&tag=${tag}`;
  const SMALL = "fillWidth=185&fillHeight=278&quality=80", LARGE = "fillHeight=1100&quality=90";
  function placeholderArt(title) {                // no picture on the server: a plain printed case
    const esc = title.replace(/&/g, "&amp;").replace(/"/g, "&quot;"), words = esc.split(" ");
    const lines = [""]; for (const w of words) { if ((lines.at(-1) + " " + w).length > 14 && lines.at(-1)) lines.push(w); else lines[lines.length - 1] = (lines.at(-1) + " " + w).trim(); }
    const text = lines.slice(0, 8).map((l, i) => `<text x="92" y="${70 + i * 24}" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="19" fill="#ffd400">${l}</text>`).join("");
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="185" height="278"><rect width="185" height="278" fill="#00349c"/><rect x="6" y="6" width="173" height="266" fill="none" stroke="#fff" stroke-width="2"/>${text}</svg>`)}`;
  }
  const votes = it => Math.round(Math.pow(10, (it.CommunityRating || 5) / 2));   // the game weighs titles by vote count; Jellyfin has a 0-10 score: 8 is as good as ten thousand votes

  function tapesFrom(items, seasonItems, episodes, partsOf) {
    const seasonArt = new Map(seasonItems.filter(s => s.ImageTags?.Primary).map(s => [`${s.SeriesId}#${s.IndexNumber}`, s]));
    const seasonIds = new Map(seasonItems.map(s => [`${s.SeriesId}#${s.IndexNumber}`, s.Id]));
    const bySeries = new Map();
    for (const e of episodes) { if (!bySeries.has(e.SeriesId)) bySeries.set(e.SeriesId, []); bySeries.get(e.SeriesId).push(e); }
    const tapes = [], meta = {}, posters = [];
    for (const it of items) {
      const title = noTags(it.Name); if (!title) continue;
      const art = it.ImageTags?.Primary ? { art: imageUrl(it.Id, it.ImageTags.Primary, SMALL), artHi: imageUrl(it.Id, it.ImageTags.Primary, LARGE) } : { art: placeholderArt(title), artHi: null };
      meta[it.Id] = [it.ProductionYear || 0, votes(it)];
      if (art.artHi) { const g = lower(it); posters.push({ id: it.Id, url: art.artHi, kind: g.includes("animation") || g.includes("anime") ? "cartoon" : it.Type === "Movie" ? "movie" : "show" }); }   // (the item's own picture: a show's, never a season's)
      if (it.Type === "Movie") {
        const [category, shelf] = placeMovie(it), parts = partsOf.get(it.Id) || [];
        const episodes = [[it.Id, parts.length ? `${title} - Part 1` : title, null], ...parts.map((p, i) => [p.Id, `${title} - Part ${i + 2}`, null])];
        tapes.push({ id: it.Id, kind: "movie", title, category, shelf, ...art, seasons: [{ label: parts.length ? `${parts.length + 1} parts` : "", episodes }] });
      } else {
        const [category, shelf] = placeSeries(it), seasons = new Map(), upper = title.toUpperCase();
        for (const e of bySeries.get(it.Id) || []) {
          const s = e.ParentIndexNumber ?? -1;
          if (!seasons.has(s)) seasons.set(s, []);
          seasons.get(s).push(e);
        }
        for (const [s, eps] of seasons) {
          eps.sort((a, b) => (a.IndexNumber ?? 1e6) - (b.IndexNumber ?? 1e6));
          const pic = seasonArt.get(`${it.Id}#${s}`);
          tapes.push({ id: it.Id, seasonId: seasonIds.get(`${it.Id}#${s}`), kind: "series", title, category, shelf, season: s,
            ...(pic ? { art: imageUrl(pic.Id, pic.ImageTags.Primary, SMALL), artHi: imageUrl(pic.Id, pic.ImageTags.Primary, LARGE) } : art),
            seasons: [{ label: s < 0 ? "Episodes" : `Season ${s}`, episodes: eps.map(e => {
              const code = s >= 0 ? `S${String(s).padStart(2, "0")}E${String(e.IndexNumber ?? 0).padStart(2, "0")} - ` : "";
              return [e.Id, `${upper} - ${code}${noTags(e.Name) || "Episode"}`, null];
            }) }] });
        }
      }
    }
    return { tapes, meta, posters };
  }
  // The walls' posters: each title once, best rated first. Mostly movies, every 6th a show, every 8th a cartoon (animated films
  // count as cartoons); when one kind runs out, the others fill in. store/shelves.js hangs and reshuffles them
  function posterPicks(posters, kept, meta, n = 40) {
    const stocked = new Set(kept.map(t => t.id)), by = { movie: [], show: [], cartoon: [] };
    for (const p of posters) if (stocked.has(p.id)) by[p.kind].push(p);
    for (const list of Object.values(by)) list.sort((a, b) => meta[b.id][1] - meta[a.id][1]);
    const out = [];
    for (let i = 0; i < n; i++) {
      const want = i % 8 === 3 ? "cartoon" : i % 6 === 5 ? "show" : "movie";
      const from = [want, "movie", "show", "cartoon"].map(k => by[k]).find(l => l.length);
      if (!from) break;
      out.push(from.shift().url);
    }
    return out;
  }
  // Onto the store's shelves: a spooky shelf (Classic Horror's) if there's enough for one; the oldest films in the middle
  // of the store (the classics) and the rest round the walls (new releases). Then each block's cut to what it can hold,
  // the lowest rated out first: a section takes whole bays, so what fits depends on how the sections fall.
  function stock(tapes, meta) {
    const year = t => meta[t.id][0], score = t => meta[t.id][1];
    const onWall = tapes.filter(t => t.shelf === "wall");
    const spooky = onWall.filter(t => t.category === "Horror" && year(t) && year(t) < 2000);
    if (spooky.length >= 11) {                    // a shelf row's worth, at least
      for (const t of [...spooky].sort((a, b) => score(b) - score(a)).slice(0, SHELVES.mv.bays * SHELVES.mv.cap)) { t.shelf = "mv"; t.category = "Classic Horror"; }
    }
    const films = onWall.filter(t => t.shelf === "wall").sort((a, b) => year(a) - year(b));
    const classics = films.length < 7 ? 0 : Math.min(Math.round(films.length * 0.15), Math.floor(SHELVES.classic.bays * SHELVES.classic.cap * 0.9));
    for (const t of films.slice(0, classics)) t.shelf = "classic";
    const kept = [];
    let left = 0;
    for (const [shelf, { bays, cap }] of Object.entries(SHELVES)) {
      const here = tapes.filter(t => t.shelf === shelf), count = new Map();
      for (const t of here) count.set(t.category, (count.get(t.category) || 0) + 1);
      const need = () => [...count.values()].reduce((a, n) => a + Math.ceil(n / cap), 0);
      const out = new Set();
      if (need() > bays) for (const t of [...here].sort((a, b) => score(a) - score(b) || (b.season ?? 0) - (a.season ?? 0))) {
        if (need() <= bays) break;
        out.add(t); count.set(t.category, count.get(t.category) - 1);
      }
      left += out.size;
      kept.push(...here.filter(t => !out.has(t)));
    }
    return { kept, left };
  }

  const LIST = "Recursive=true&IsMissing=false&EnableUserData=false&EnableTotalRecordCount=false";
  let summary = { tapes: 0, left: 0 };
  async function fetchLibrary(say) {
    const u = `userId=${link.userId}`;
    say("Reading the library…");
    const [shows, seasons, eps] = await Promise.all([
      api(`/Items?${u}&${LIST}&IncludeItemTypes=Movie,Series&Fields=Genres,ProductionLocations,PartCount&EnableImageTypes=Primary&ImageTypeLimit=1`, { timeout: 180000 }),
      api(`/Items?${u}&${LIST}&IncludeItemTypes=Season&EnableImageTypes=Primary&ImageTypeLimit=1`, { timeout: 180000 }),
      api(`/Items?${u}&${LIST}&IncludeItemTypes=Episode&EnableImages=false`, { timeout: 180000 }),
    ]);
    const partsOf = new Map();
    for (const it of shows.Items) if (it.PartCount > 1) {   // a film in a few files (name-part1.avi, name-part2.avi): the server lists only the first
      const r = await api(`/Videos/${it.Id}/AdditionalParts?${u}`).catch(() => null);
      if (r?.Items?.length) partsOf.set(it.Id, r.Items);
    }
    const { tapes, meta, posters } = tapesFrom(shows.Items, seasons.Items, eps.Items, partsOf);
    if (!tapes.length) throw new Error(`${link.userName} can't see any movies or shows on this server.`);
    const { kept, left } = stock(tapes, meta);
    if (left) console.warn(`JellyBuster: ${left} tapes don't fit in the store and were left off the shelves (the lowest rated)`);
    window.STORE_CATALOG = kept; window.STORE_META = meta;
    window.STORE_POSTERS = posterPicks(posters, kept, meta);
    summary = { tapes: kept.length, left };
  }

  // ---- the link form ----
  const CSS = `#jfLink { position: fixed; inset: 0; z-index: 100000; display: flex; align-items: center; justify-content: center; background: #05070f; color: #fff; font: 14px Verdana, sans-serif; padding: 16px; box-sizing: border-box; overflow: auto; }
    #jfLink form { display: flex; flex-direction: column; gap: 10px; width: min(420px, 100%); background: #00349c; border: 3px solid #ffd400; padding: 22px; box-sizing: border-box; }
    #jfLink h1 { margin: 0; color: #ffd400; font: 900 italic 30px "Arial Black", Arial, sans-serif; letter-spacing: 1px; }
    #jfLink p { margin: 0; line-height: 1.45; color: #d6e2ff; font-size: 13px; }
    #jfLink label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; letter-spacing: 1px; color: #ffd400; }
    #jfLink input { font: 15px Verdana, sans-serif; padding: 8px; border: 2px solid #ffffff55; background: #001c5c; color: #fff; box-sizing: border-box; width: 100%; }
    #jfLink input:focus { outline: none; border-color: #ffd400; }
    #jfLink button { font: bold 14px Verdana, sans-serif; letter-spacing: 1px; color: #00349c; background: #ffd400; border: 0; padding: 11px; cursor: pointer; }
    #jfLink button.alt { background: transparent; color: #fff; border: 2px solid #ffffff55; }
    #jfLink button:disabled { opacity: .5; cursor: default; }
    #jfLink .why { color: #ffc2c2; font-size: 13px; line-height: 1.4; min-height: 1px; }
    #jfLink .code { color: #ffd400; font: 900 34px "Courier New", monospace; letter-spacing: 6px; text-align: center; }
    #jfLink[data-busy] form > *:not(.busy) { display: none; } #jfLink .busy { display: none; } #jfLink[data-busy] .busy { display: block; }`;
  let root = null;
  const el = id => root.querySelector(`#${id}`);
  function mount() {
    if (root) return;
    const style = document.createElement("style"); style.textContent = CSS; document.head.appendChild(style);
    root = document.createElement("div"); root.id = "jfLink";
    root.innerHTML = `<form autocomplete="on">
      <h1>JELLYBUSTER</h1>
      <p>Stock the store from your Jellyfin library. Your password goes only to your server.</p>
      <label>SERVER ADDRESS <input id="jfUrl" placeholder="http://localhost:8096" autocomplete="url" spellcheck="false"></label>
      <label>USER <input id="jfUser" autocomplete="username" spellcheck="false"></label>
      <label>PASSWORD <input id="jfPass" type="password" autocomplete="current-password"></label>
      <div class="why" id="jfWhy"></div>
      <button id="jfGo" type="submit">LINK</button>
      <button id="jfRetry" type="button" hidden>TRY AGAIN</button>
      <button id="jfQuick" type="button" class="alt">USE QUICK CONNECT</button>
      <p id="jfQuickNote" hidden></p><div class="code" id="jfCode" hidden></div>
      <div class="busy" id="jfBusy"></div>
    </form>`;
    (document.body || document.documentElement).appendChild(root);
    el("jfUrl").value = link?.url || "http://localhost:8096";
    el("jfUser").value = link?.userName || "";
    wire();
  }
  const say = text => { mount(); root.dataset.busy = "1"; el("jfBusy").textContent = text; };
  function ask(why = "") {                        // the form, up, with why it's up
    mount(); delete root.dataset.busy; el("jfWhy").textContent = why;
    el("jfRetry").hidden = !link?.token;          // still signed in, the server just wasn't there: no need for the password
    (el("jfUser").value ? el("jfPass") : el("jfUrl")).focus();
  }
  function linked(url, auth, serverName) {
    link = { url, token: auth.AccessToken, userId: auth.User.Id, userName: auth.User.Name, serverName };
    store.set(KEY, JSON.stringify(link));
  }
  let quick = null;                               // the Quick Connect wait under way
  const quickOff = () => { clearInterval(quick); quick = null; el("jfQuickNote").hidden = el("jfCode").hidden = true; el("jfQuick").textContent = "USE QUICK CONNECT"; };

  let done;
  const ready = new Promise(r => { done = r; });
  async function load() {
    try {
      say("Reaching your Jellyfin…");
      await fetchLibrary(say);
      root?.remove(); root = null;
      done();
    } catch (e) {
      if (e.status === 401 || e.status === 403) { link = { ...link, token: null }; store.set(KEY, JSON.stringify(link)); ask("That sign-in has run out. Sign in again."); }
      else ask(e.message);
    }
  }
  function wire() {
    el("jfRetry").addEventListener("click", load);
    root.querySelector("form").addEventListener("submit", async e => {
      e.preventDefault(); if (quick) quickOff();
      const url = cleanAddress(el("jfUrl").value || "http://localhost:8096"), user = el("jfUser").value.trim();
      if (!user) return ask("Who's signing in? Put in your Jellyfin user, or use Quick Connect.");
      try {
        say("Reaching your Jellyfin…");
        const info = await call(url, null, "/System/Info/Public", { timeout: 8000 });
        const auth = await call(url, null, "/Users/AuthenticateByName", { method: "POST", body: { Username: user, Pw: el("jfPass").value } });
        el("jfPass").value = "";
        linked(url, auth, info?.ServerName);
        load();
      } catch (e2) { ask(e2.status === 401 ? "That user and password didn't work." : e2.message); }
    });
    el("jfQuick").addEventListener("click", async () => {
      if (quick) return quickOff();
      const url = cleanAddress(el("jfUrl").value || "http://localhost:8096");
      try {
        el("jfWhy").textContent = "";
        const info = await call(url, null, "/System/Info/Public", { timeout: 8000 });
        const q = await call(url, null, "/QuickConnect/Initiate", { method: "POST" });
        el("jfCode").textContent = q.Code; el("jfCode").hidden = false;
        el("jfQuickNote").textContent = "In a signed-in Jellyfin app: your user → Quick Connect → enter this code."; el("jfQuickNote").hidden = false;
        el("jfQuick").textContent = "CANCEL";
        quick = setInterval(async () => {
          const s = await call(url, null, `/QuickConnect/Connect?Secret=${encodeURIComponent(q.Secret)}`).catch(() => null);
          if (!s?.Authenticated || !quick) return;
          quickOff();
          try {
            linked(url, await call(url, null, "/Users/AuthenticateWithQuickConnect", { method: "POST", body: { Secret: q.Secret } }), info?.ServerName);
            load();
          } catch (e2) { ask(e2.message); }
        }, 2500);
      } catch (e2) { ask(e2.status === 401 || e2.status === 403 ? "Quick Connect isn't turned on for this server." : e2.message); }
    });
  }
  const start = () => { if (link?.token) load(); else ask(); };

  // ---- what the back of a tape's box says (store/tapebox.js): a movie's own, a season's with its series' filling the gaps ----
  const DETAIL_FIELDS = "Overview,People,Genres,Taglines,Studios,OfficialRating,CommunityRating,CriticRating,ProductionYear,RunTimeTicks,ImageTags,BackdropImageTags";
  async function details(t) {
    const ids = t.seasonId ? [t.seasonId, t.id] : [t.id];
    const r = await api(`/Items?userId=${link.userId}&Ids=${ids.join(",")}&Fields=${DETAIL_FIELDS}`);
    const by = new Map((r?.Items || []).map(it => [it.Id, it])), own = by.get(ids[0]) || by.get(t.id), top = by.get(t.id) || own;
    if (!own) return {};
    const pick = (k, empty) => (own[k]?.length ? own[k] : top[k]) ?? empty;
    const img = (id, type, q) => `${link.url}/Items/${id}/Images/${type}?${q}`;
    return { title: noTags(top.Name) || t.title, season: own !== top ? noTags(own.Name) : "", year: own.ProductionYear || top.ProductionYear || 0,
      rating: top.OfficialRating || "", stars: top.CommunityRating || 0, critics: top.CriticRating || 0,
      minutes: Math.round((own.RunTimeTicks || 0) / 600000000), tagline: noTags((pick("Taglines", []))[0] || ""), overview: noTags(pick("Overview", "")),
      genres: top.Genres || [], studios: (top.Studios || []).map(s => noTags(s.Name)),
      people: (pick("People", [])).map(p => ({ name: noTags(p.Name), role: noTags(p.Role || ""), type: p.Type, img: p.PrimaryImageTag ? img(p.Id, "Primary", `maxHeight=320&tag=${p.PrimaryImageTag}`) : null })),
      backdrop: own.BackdropImageTags?.length ? img(own.Id, "Backdrop", "maxWidth=1280&quality=85") : top.BackdropImageTags?.length ? img(top.Id, "Backdrop", "maxWidth=1280&quality=85") : null,
      logo: top.ImageTags?.Logo ? img(top.Id, "Logo", "maxWidth=900") : null };
  }

  // ---- playing ----
  function deviceProfile() {
    const v = document.createElement("video"), can = t => !!v.canPlayType(t).replace("no", "");
    const video = ["h264"], webm = [];
    if (can('video/mp4; codecs="hvc1.1.6.L120.90"')) video.push("hevc");
    if (can('video/mp4; codecs="av01.0.08M.08"')) { video.push("av1"); webm.push("av1"); }
    if (can('video/webm; codecs="vp9"')) { video.push("vp9"); webm.push("vp9"); }
    if (can('video/webm; codecs="vp8"')) webm.push("vp8");
    const direct = [{ Type: "Video", Container: "mp4,m4v", VideoCodec: video.join(","), AudioCodec: "aac,mp3,opus,flac,alac" }];
    if (webm.length) direct.push({ Type: "Video", Container: "webm", VideoCodec: webm.join(","), AudioCodec: "opus,vorbis" });
    return { Name: "JellyBuster", MaxStreamingBitrate: 120000000, MaxStaticBitrate: 120000000,
      DirectPlayProfiles: direct,
      TranscodingProfiles: [{ Type: "Video", Container: "ts", Protocol: "hls", Context: "Streaming", VideoCodec: "h264", AudioCodec: "aac,mp3", MaxAudioChannels: "2", MinSegments: 1, BreakOnNonKeyFrames: true }],
      ContainerProfiles: [],
      // a screen that can't show HDR isn't handed HDR, or it plays washed out: the server tone maps it to SDR instead
      CodecProfiles: matchMedia("(dynamic-range: high)").matches ? [] : [{ Type: "Video", Conditions: [{ Condition: "EqualsAny", Property: "VideoRangeType", Value: "SDR", IsRequired: false }] }],
      SubtitleProfiles: [{ Format: "vtt", Method: "External" }] };
  }
  let session = null, hls = null, turn = 0;
  // Captions: the item's text tracks, as WebVTT off the server. Off till asked for. The screens are a canvas, so the track's kept hidden and
  // its current line drawn on (captionText, in the game's updateVideoFrame); full screen, where it's the <video> itself, it shows natively.
  const cc = { tracks: [], on: -1, lang: null, wanted: false, big: false };
  function captionsOff() { for (const t of cc.tracks) t.remove(); cc.tracks = []; cc.on = -1; }
  function captionSet(i) {
    cc.tracks.forEach((t, k) => { t.track.mode = k === i ? (cc.big ? "showing" : "hidden") : "disabled"; });
    cc.on = i;
  }
  function captionsFor(video, id, src) {
    captionsOff();
    for (const s of src.MediaStreams || []) {
      if (s.Type !== "Subtitle" || s.IsTextSubtitleStream === false) continue;
      const path = s.DeliveryUrl || `/Videos/${id}/${src.Id}/Subtitles/${s.Index}/0/Stream.vtt`, full = /^https?:/.test(path) ? path : link.url + path;
      const t = document.createElement("track"); t.kind = "subtitles"; t.label = s.DisplayTitle || s.Language || "Captions"; t.srclang = s.Language || "und";
      t.src = /[?&]ApiKey=/i.test(full) ? full : `${full}${full.includes("?") ? "&" : "?"}ApiKey=${encodeURIComponent(link.token)}`;
      video.appendChild(t); t.track.mode = "disabled"; cc.tracks.push(t);
    }
    if (cc.wanted && cc.tracks.length) {          // they had captions on: the same language on the next tape, else its first
      const i = cc.tracks.findIndex(t => t.srclang === cc.lang);
      captionSet(i < 0 ? 0 : i);
    }
  }
  const ticks = s => Math.round((s || 0) * 1e7);
  const report = (what, video, extra = {}, keepalive = false) => session && api(`/Sessions/Playing${what}`, { method: "POST", keepalive, body: {
    ItemId: session.id, MediaSourceId: session.source, PlaySessionId: session.play, PlayMethod: session.method, CanSeek: true,
    PositionTicks: ticks(video.currentTime), IsPaused: video.paused, ...extra } }).catch(() => {});
  function stop(video, keepalive = false) {       // whatever's on comes off, and the server hears it did (that's also what ends a transcode)
    turn++;
    clearInterval(session?.beat);
    if (session) report("/Stopped", video, {}, keepalive);
    session = null;
    if (hls) { hls.destroy(); hls = null; }
    captionsOff();
  }
  const waitFor = (video, url) => new Promise((resolve, reject) => {
    const off = () => { video.removeEventListener("loadedmetadata", ok); video.removeEventListener("error", bad); };
    const ok = () => { off(); resolve(); }, bad = () => { off(); reject(new Error("The browser can't play this one.")); };
    video.addEventListener("loadedmetadata", ok); video.addEventListener("error", bad);
    video.crossOrigin = "anonymous"; video.src = url; video.load();   // (crossOrigin before src, or the picture can't go on a texture)
  });
  const seekTo = (video, at) => { if (at > 1 && isFinite(video.duration) && at < video.duration - 5) video.currentTime = at; };
  async function attach(video, id, at = 0, forceStream = false) {   // -> true when it's ready to play; false if another tape went in meanwhile
    stop(video);
    const mine = turn;
    const info = await api(`/Items/${id}/PlaybackInfo?userId=${link.userId}`, { method: "POST", body: { UserId: link.userId, MaxStreamingBitrate: 120000000,
      EnableDirectPlay: !forceStream, EnableDirectStream: true, EnableTranscoding: true, AutoOpenLiveStream: false, DeviceProfile: deviceProfile() } });
    if (mine !== turn) return false;
    const src = info?.MediaSources?.[0];
    if (!src) throw new Error(info?.ErrorCode ? `The server won't play this: ${info.ErrorCode}` : "The server has nothing to play for this one.");
    const vs = (src.MediaStreams || []).find(m => m.Type === "Video");
    console.info(`JellyBuster: ${src.SupportsDirectPlay && !forceStream ? "direct play" : "streamed"}, ${vs?.Codec || "?"} ${vs?.Width || "?"}x${vs?.Height || "?"}, ${vs?.VideoRangeType || vs?.VideoRange || "range unknown"}; this screen ${matchMedia("(dynamic-range: high)").matches ? "reports HDR" : "reports SDR"}`);
    const playId = encodeURIComponent(info.PlaySessionId || "");
    if (src.SupportsDirectPlay && !forceStream) {
      const url = `${link.url}/Videos/${id}/stream?static=true&mediaSourceId=${encodeURIComponent(src.Id)}&PlaySessionId=${playId}&Tag=${encodeURIComponent(src.ETag || "")}&ApiKey=${encodeURIComponent(link.token)}`;
      try { await waitFor(video, url); }
      catch { return mine === turn ? attach(video, id, at, true) : false; }   // the server thought it could; the browser can't (10-bit, say): stream it instead
      if (mine !== turn) return false;
      seekTo(video, at);
      captionsFor(video, id, src);
      begin(video, id, src.Id, info.PlaySessionId, "DirectPlay");
      return true;
    }
    if (!src.TranscodingUrl) throw new Error("The server can't stream this one to a browser.");
    const url = link.url + src.TranscodingUrl, method = src.SupportsDirectStream ? "DirectStream" : "Transcode";
    if (window.Hls?.isSupported()) {
      await new Promise((resolve, reject) => {
        const h = hls = new Hls({ startPosition: at > 1 ? at : -1 });
        video.crossOrigin = "anonymous";
        let up = false, retried = false;
        h.on(Hls.Events.MANIFEST_PARSED, () => { up = true; resolve(); });
        h.on(Hls.Events.ERROR, (_, d) => {
          if (!d.fatal) return;
          if (d.type === Hls.ErrorTypes.MEDIA_ERROR && !retried) { retried = true; h.recoverMediaError(); return; }
          if (up) { Jelly.onTrouble?.("Lost the stream from the server."); h.destroy(); if (hls === h) hls = null; }
          else { h.destroy(); if (hls === h) hls = null; reject(new Error(`The server's stream didn't start (${d.details}).`)); }
        });
        h.loadSource(url); h.attachMedia(video);
      });
    } else {
      await waitFor(video, url);                  // Safari plays HLS itself
      seekTo(video, at);
    }
    if (mine !== turn) return false;
    captionsFor(video, id, src);
    begin(video, id, src.Id, info.PlaySessionId, method);
    return true;
  }
  function begin(video, id, source, play, method) {
    session = { id, source, play, method, beat: setInterval(() => report("/Progress", video), 10000) };
    report("", video);
  }
  addEventListener("pagehide", () => { const v = document.getElementById("vid"); if (session && v) stop(v, true); });

  window.Jelly = {
    ready, attach, stop, details, onTrouble: null,
    tabApi: (path, opts) => api(path, { ...opts, device: tabDevice }),   // a call as this tab's own session
    nextCaptions() {                              // T: each track in turn, then off. -> what to say
      if (!cc.tracks.length) return "NO CAPTIONS ON THIS TAPE";
      const i = cc.on + 1 < cc.tracks.length ? cc.on + 1 : -1;
      captionSet(i); cc.wanted = i >= 0; cc.lang = i >= 0 ? cc.tracks[i].srclang : null;
      return i < 0 ? "CAPTIONS OFF" : `CC ${cc.tracks[i].label.toUpperCase()}`;
    },
    captionText() {                               // the line(s) up right now, plain, or ""
      const t = cc.tracks[cc.on]?.track; if (!t?.activeCues?.length) return "";
      return [...t.activeCues].map(c => c.text.replace(/<[^>]*>/g, "")).join("\n");
    },
    captionsFullScreen(on) { cc.big = on; if (cc.on >= 0) captionSet(cc.on); },
    info: () => ({ server: link?.serverName || link?.url, url: link?.url, user: link?.userName, ...summary }),
    unlink() {                                    // sign out on the server too, then back to the form
      const was = link; link = null; store.del(KEY);
      return was?.token ? call(was.url, was.token, "/Sessions/Logout", { method: "POST", keepalive: true }).catch(() => {}) : Promise.resolve();
    },
  };
  window.STORE_CATALOG = []; window.STORE_META = {}; window.STORE_POSTERS = [];
  if (document.body) start(); else addEventListener("DOMContentLoaded", start, { once: true });
})();
