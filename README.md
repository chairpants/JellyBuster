<div align="center">

<img src="docs/screenshots/logo.jpg" alt="JellyBuster: Wow! What a selection." width="620">

### A first-person 90s video store, stocked from **your own** Jellyfin library.

[![three.js](https://img.shields.io/badge/three.js-r170-1b3fa0?style=flat-square)](https://threejs.org)
[![Jellyfin](https://img.shields.io/badge/Jellyfin-your%20library-ffd400?style=flat-square&labelColor=1b3fa0)](https://jellyfin.org)
[![No build](https://img.shields.io/badge/build%20step-none-1b3fa0?style=flat-square)](#%EF%B8%8F-play-now)
[![Co-op](https://img.shields.io/badge/co--op-same%20network-ffd400?style=flat-square&labelColor=1b3fa0)](#-play-together)
[![License: MIT](https://img.shields.io/badge/license-MIT-1b3fa0?style=flat-square)](LICENSE)

[Play now](https://chairpants.github.io/JellyBuster/) · [Your library](#-your-library-on-actual-shelves) · [The job](#-work-the-shift) · [Play together](#-play-together) · [Screenshots](#-take-the-tour) · [Controls](#%EF%B8%8F-controls) · [Under the hood](#-under-the-hood)

<img src="docs/screenshots/slideshow.webp" alt="A slideshow of the store, the register, the theater, Tony's arcade, the roof and the lot in snow" width="800">

**It's 7:25 on a Friday night, there's a line at the counter,<br>somebody by the door has a tape under their jacket, and the store is yours.**

</div>

---

## ▶️ Play now

1. **Download or clone** this repo. There's nothing to build or install.
2. **Open `index.html`** in a browser, straight from your computer.
3. **Link your Jellyfin:** enter your server's address (like `http://your-server:8096`) and sign in, or use **Quick Connect**.
4. **Pick a store** and clock in. It runs with keyboard and mouse, or on a touchscreen.

No internet needed: everything the game loads is in the folder. You just need to reach your Jellyfin server.

> [!IMPORTANT]
> **Don't host it on https** (GitHub Pages, say) if your server is plain http: browsers block an https page from reaching an http server. Open the file locally, or put Jellyfin behind https.

## 📼 Your library, on actual shelves

Every movie is a tape. Every season of a show is a tape. Put one in the VCR and it streams from your server.

- **Sections** come from each title's genres.
- **The walls** get your newer movies, and the oldest go on the classics shelves.
- **Classic Horror** earns its own shelf and sign if you own enough of it.
- **Staff Picks** and the wall posters are your best rated.
- **Holds about 3,000 tapes**, and a small library gets extra copies so the store still looks full.

> [!WARNING]
> **Watching in the game counts as watching on your account:** resume points and played status can change. Customers renting tapes in the game don't touch your server.

Your password isn't kept. Your server's address and a session token stay in this browser's storage, and the browser talks to your server directly, with no proxy.

## 🧾 Work the shift

It's 9 AM, the doors are locked, and you have an hour. Flip on the lights, empty the returns slot, rewind what came back, shelve it, stock the candy rack, then unlock the doors.

The chime goes. Swipe the card, ring it up, desensitize the tape, take the money. Then the phone rings. Then a customer with darting eyes heads for the door.

<details>
<summary><b>Read the full first shift</b></summary>

It's 9 AM and the doors are still locked. You have an hour.

**Walk** the floor and **flip on** the lights zone by zone. **Empty** the returns slot, **rewind** what came back, and **shelve** it where it goes. **Stock** the candy rack from the cupboard behind the counter. Then **unlock** the front doors.

The chime goes and the first customer wanders in. They browse, they pick something out, they **come up to the counter**. You **swipe** their card, **ring it up**, **desensitize** the tape so it doesn't set off the gates, **charge** (or waive) their three dollars in late fees, **pitch** them a box of candy, **tear off** the receipt and **hand it over**. Speed matters, and so does getting every step right.

Then the phone rings. Someone wants to know if you have a particular movie in. Say you'll hold it, and it had better be on the holds shelf when they show up.

Then a customer with darting eyes heads for the door.

</details>

**Then it becomes your store:** hire, schedule, delegate, level up your staff, spend what you earn, and keep the place clean.

<details>
<summary><b>How the store grows</b></summary>

You can't do it all yourself for long, and you're not supposed to.

**Hire.** Post a job opening from the register and three applicants come in to interview, each good at something different. Pick the one you want on your team.

**Schedule.** Lay out their week hour by hour on the register's DOS-style schedule screen. They come in the front door when their shift starts and leave when it ends.

**Delegate.** The job board behind the counter works like a priority grid: register, phones, floor, returns, restock, cleanup. Put your best talker on the register, keep someone strong on restocking, and set the rest to sweep up.

**Level up.** Everyone has six stats, each one tied to part of the job: **DEX** for register work and rewinding, **INT** for shelving and finding the exact tape someone asked for, **CHA** for upsells and the phone, **STR** for hauling deliveries, **CON** for cleaning and miles walked, **WIS** for spotting shoplifters. The work earns XP, and milestones unlock perks like *Quick Thread*, *Smooth Talker* and *Sixth Sense*. Your clumsy new hire turns into your best clerk.

**Grow.** Every shift ends with a printed slip and a grade. A good night raises your star rating and gets people talking, so more members sign up. Each day comes with goals to hit. Spend what the store earns on upgrades: security cameras, anti-theft signs, a second rewinder, high-speed rewinders shaped like little sports cars, a better cooler, staff training, an ad in the paper, and a theater with an 8 PM feature.

**Keep it clean.** Soda gets spilled, popcorn ends up in the carpet, bins overflow, ceiling lights burn out. Grab the mop, the carpet sweeper, or the step ladder from the janitor's closet. Whatever's left at midnight counts against you on the closing check.

</details>

<details>
<summary><b>The feel of the place</b></summary>

Buzzing fluorescent tubes, blue carpet, a confetti-print kids' corner, posters ringed with marquee bulbs, and a DOS terminal on the counter that wants an F-key for everything. A customer's TV-set head smiles when you get their order right and scowls when you leave them waiting.

All the sound is generated live instead of recorded: ballast hum, room tone, traffic outside the glass, the door chime, the cooler's compressor kicking on. The day goes by outside the front windows, from morning light to golden hour to sodium lamps over an empty lot. After close it's just you, the lounge lamps and whatever you left undone.

</details>

## 🎮 Three ways to play

| 🏗️ Simulation | 🛒 Sandbox | 🕵️ Customer |
|---|---|---|
| A bare-bones store: no staff, the theater chained shut, a small member list. Build it up from what it earns. | $10,000 and Dana on staff from the start. Buy what you like and get playing. | The other side of the counter. Walk in with your own wallet, pay for what you take (or don't), and see how far you can get. |

Three save files, like an old cartridge: **play**, **copy** or **delete**.

## 🍿 Play together

Bring someone on your home network. There's no server to run: Jellyfin introduces you, then your browsers talk directly.

```text
   HOST  ─────┐                              ┌─────  GUEST
  (plays as   ├───  Jellyfin says "hi"  ─────┤     (a customer,
   usual)     └═══  direct connection  ══════┘      here for movies)
```

1. **Host:** start a store, press Esc, then choose **Play Together → Host**.
2. **Guest:** on the other device, choose **Play Together** and join the host.

| | |
|---|---|
| **Shared** | Seeing each other, the time of day, the weather (either of you can change them) |
| **Your own copy** | Customers, tapes, and the movie you're watching |
| **Guest perks** | Every tape's free, nobody walks you out at midnight, and your own saves aren't touched |

<details>
<summary><b>Getting it onto a phone, and if it won't connect</b></summary>

Computers can each just open their own copy of `index.html`. Phones are bad at opening local game folders, so serve it from a computer on your network, keeping that running while you play:

```sh
python3 -m http.server 8000
```

Then open `http://<that-computer's-address>:8000` on the phone.

If the two devices can't connect, the usual causes are a guest network or your router's AP isolation setting, a firewall blocking UDP, or a VPN. `JellyBusterLink/index.html` is a small standalone page for testing just the connection.

</details>

## 📸 Take the tour

<table>
  <tr>
    <td align="center" width="33%"><a href="docs/screenshots/lot-day.jpg"><img src="docs/screenshots/lot-day.jpg" alt="The storefront, midday"></a><br><sub>The storefront, midday</sub></td>
    <td align="center" width="33%"><a href="docs/screenshots/lot-gold.jpg"><img src="docs/screenshots/lot-gold.jpg" alt="Golden hour"></a><br><sub>Golden hour</sub></td>
    <td align="center" width="33%"><a href="docs/screenshots/lot-night.jpg"><img src="docs/screenshots/lot-night.jpg" alt="After dark, with Tony's next door"></a><br><sub>After dark, with Tony's next door</sub></td>
  </tr>
  <tr>
    <td align="center" width="33%"><a href="docs/screenshots/lot-rain.jpg"><img src="docs/screenshots/lot-rain.jpg" alt="A storm rolling through"></a><br><sub>A storm rolling through</sub></td>
    <td align="center" width="33%"><a href="docs/screenshots/lot-snow.jpg"><img src="docs/screenshots/lot-snow.jpg" alt="Snowed in"></a><br><sub>Snowed in</sub></td>
    <td align="center" width="33%"><a href="docs/screenshots/wheel.jpg"><img src="docs/screenshots/wheel.jpg" alt="Hold F: pick the hour and the weather"></a><br><sub>Hold F: pick the hour and the weather</sub></td>
  </tr>
  <tr>
    <td align="center" width="33%"><a href="docs/screenshots/front.jpg"><img src="docs/screenshots/front.jpg" alt="Through the anti-theft gates"></a><br><sub>Through the anti-theft gates</sub></td>
    <td align="center" width="33%"><a href="docs/screenshots/walls.jpg"><img src="docs/screenshots/walls.jpg" alt="New releases, wall to wall"></a><br><sub>New releases, wall to wall</sub></td>
    <td align="center" width="33%"><a href="docs/screenshots/shelf.jpg"><img src="docs/screenshots/shelf.jpg" alt="Your library, on the shelf"></a><br><sub>Your library, on the shelf</sub></td>
  </tr>
  <tr>
    <td align="center" width="33%"><a href="docs/screenshots/tape.jpg"><img src="docs/screenshots/tape.jpg" alt="Hold a tape up and read it"></a><br><sub>Hold a tape up and read it</sub></td>
    <td align="center" width="33%"><a href="docs/screenshots/staff-picks.jpg"><img src="docs/screenshots/staff-picks.jpg" alt="Staff Picks: your best rated"></a><br><sub>Staff Picks: your best rated</sub></td>
    <td align="center" width="33%"><a href="docs/screenshots/counter.jpg"><img src="docs/screenshots/counter.jpg" alt="The counter"></a><br><sub>The counter</sub></td>
  </tr>
  <tr>
    <td align="center" width="33%"><a href="docs/screenshots/behind-counter.jpg"><img src="docs/screenshots/behind-counter.jpg" alt="Your side of it"></a><br><sub>Your side of it</sub></td>
    <td align="center" width="33%"><a href="docs/screenshots/register.jpg"><img src="docs/screenshots/register.jpg" alt="The register's DOS terminal"></a><br><sub>The register's DOS terminal</sub></td>
    <td align="center" width="33%"><a href="docs/screenshots/breakroom.jpg"><img src="docs/screenshots/breakroom.jpg" alt="The break room"></a><br><sub>The break room</sub></td>
  </tr>
  <tr>
    <td align="center" width="33%"><a href="docs/screenshots/lounge.jpg"><img src="docs/screenshots/lounge.jpg" alt="The TV lounge"></a><br><sub>The TV lounge</sub></td>
    <td align="center" width="33%"><a href="docs/screenshots/lobby.jpg"><img src="docs/screenshots/lobby.jpg" alt="The theater lobby"></a><br><sub>The theater lobby</sub></td>
    <td align="center" width="33%"><a href="docs/screenshots/theater.jpg"><img src="docs/screenshots/theater.jpg" alt="The auditorium"></a><br><sub>The auditorium</sub></td>
  </tr>
  <tr>
    <td align="center" width="33%"><a href="docs/screenshots/tony-out.jpg"><img src="docs/screenshots/tony-out.jpg" alt="Tony's Pizza"></a><br><sub>Tony's Pizza</sub></td>
    <td align="center" width="33%"><a href="docs/screenshots/tony-in.jpg"><img src="docs/screenshots/tony-in.jpg" alt="Slices and cabinets"></a><br><sub>Slices and cabinets</sub></td>
    <td align="center" width="33%"><a href="docs/screenshots/arcade.jpg"><img src="docs/screenshots/arcade.jpg" alt="Quarters not included"></a><br><sub>Quarters not included</sub></td>
  </tr>
  <tr>
    <td align="center" width="33%"><a href="docs/screenshots/golf.jpg"><img src="docs/screenshots/golf.jpg" alt="Golf. On the roof. Sure."></a><br><sub>Golf. On the roof. Sure.</sub></td>
    <td align="center" width="33%"><a href="docs/screenshots/together.jpg"><img src="docs/screenshots/together.jpg" alt="Your friend, in the store"></a><br><sub>Your friend, in the store</sub></td>
    <td align="center" width="33%"><a href="docs/screenshots/menu.jpg"><img src="docs/screenshots/menu.jpg" alt="Three save files, like a cartridge"></a><br><sub>Three save files, like a cartridge</sub></td>
  </tr>
</table>

<sub>Everything's captured in-game. The movies and covers are made up for these screenshots: yours will be from your own library.</sub>

## ⌨️ Controls

| Key | Action | | Key | Action |
|---|---|---|---|---|
| **W A S D** | Walk | | **E** | Interact |
| **Mouse** | Look | | **Click** | Pick up a tape, take a bite |
| **Shift** | Hustle | | **B** | Play or pause the tape |
| **C** | Crouch | | **F** (hold) | Time and weather wheel |
| **Space** | Jump | | **H** | Hide the HUD |

<details>
<summary><b>All controls</b></summary>

| Key | Action |
|---|---|
| **W A S D** | Walk |
| **Mouse** | Look |
| **Shift** | Hustle |
| **C** | Crouch |
| **Space** | Jump: a realistic hop, further with a run-up. Not with your arms full |
| **Click** a tape | Pick it up and hold it up to look at it |
| **Click** again | Tuck it in your hand |
| **Right-click** | Put back a tape you're still looking at (straight off the shelf or out of Returns) · put down an untouched snack |
| **Click** a snack, drink or popcorn in hand | Take a bite or a sip |
| **E** | Interact: doors, lamps, the register, the counter gear, and plenty more. Some things want E held down. On the stool behind the counter, each tap spins you (tap fast to spin harder) and WASD gets you up; hold E on it to carry it somewhere else. Hold E on a rewinder, the desensitizer or the receipt printer to move it around the counter: a see-through copy shows where it'll go (only over free worktop), the wheel turns it, click sets it down, right-click puts it back |
| **Q** | At the counter: offer the customer a snack (they'll go grab it and come back), or waive their late fees |
| **L** | Skip ahead an hour (until close). The store lights are real switches on the walls: E flips one, and holding E on the panel by the register turns the whole panel on or off |
| **Mouse wheel** | Zoom while seated · otherwise switch the item in hand when carrying several |
| **1–9** | Pick an inventory slot (carry up to 9 items; the bar appears once you hold 2+) |
| **B** | Play or pause the tape in the TV |
| **V / N** | Double-tap for the previous / next episode. Hold to rewind / fast-forward, with a scrub bar in the corner showing where you are |
| **K** | Character sheet: your skills and the staff's, with XP toward the next level |
| **F** | Hold for the time and weather wheel (fullscreen is your browser's **F11**): aim with the mouse, click to choose, right-click or Esc to cancel |
| **H** | Hide the HUD |
| **M** | Store sounds on/off (fluorescent hum, air, traffic outside, the door chime, footsteps, doors, the cooler) |
| **J** | Show or hide the log (bottom left) · **PgUp / PgDn** scroll it |
| **1–5** | When you've caught a shoplifter: ban a week / a month, cancel their membership, call the police, or let them off with a warning |

</details>

## 🔧 Under the hood

<details>
<summary><b>How your library goes on the shelves</b></summary>

- **Sections** come from each title's Jellyfin genres, best fit first (see `placeMovie` and `placeSeries` in `jellyfin.js`).
- **The walls** (new releases) get your newer movies. The oldest 15% or so go on the classics shelves in the middle, and TV goes on the shelving east of the walkway. Kids' titles go by the windows, judged from genres and rating.
- **Classic Horror** is its own shelf with its own sign: your best-rated pre-2000 horror films, if you have at least 11. Otherwise that shelf isn't there.
- **Staff Picks** and the wall posters are your best-rated titles.
- **Room:** the store holds about 3,000 tapes. Past that, the lowest rated are left out, and SETTINGS tells you how many.
- **Spare room** is filled with extra copies, so a small library still fills the store.

</details>

<details>
<summary><b>What goes back to your server</b></summary>

Playing a tape tells Jellyfin like any other client (started, progress, stopped), so **watching in the game counts as watching on your account**: resume points and played status can change. Customers renting tapes in the game don't touch your server. The game's tape position is its own: a tape plays from wherever it's wound to in the game, not from your Jellyfin resume point.

Files your browser can play (mp4 or webm with browser-friendly codecs) play directly. Anything else (mkv, HEVC where unsupported, AC3/DTS audio) is remuxed or transcoded by your server as HLS, which uses its CPU or GPU.

---

**It's 7:25 on a Friday night, there's a line at the counter, somebody by the door has a tape under their jacket, and the store is yours.**

JellyBuster is a first-person shift at a neighborhood video store in the 90s. You're the one behind the counter. You work the register, keep the place running, and turn a half-empty storefront into the store everybody in town goes to on a Friday night.

</details>

<details>
<summary><b>How it's put together, and running the tests</b></summary>

To run it locally, open `index.html` in a browser. It works straight from `file://` with no server and no internet: three.js, hls.js and the register's font are all in `vendor/`.

Everything runs as plain `<script>` files loaded in order. There are no ES modules, so the page works from `file://`. Three.js and its add-ons are bundled once into `vendor/three.js`, and `npm run vendor` rebuilds that, only needed to change its version. A small inline script in `index.html` waits for Jellyfin and then loads the game itself, the files in `store/` (JellyBuster itself, and the game's rules), `tonys/` (the pizza place next door) and `exterior/` (the lot, the grounds, the sky), in order. They are one program cut into sections, not modules: they share one scope, and the order (the list in `index.html`) matters, because each file runs as it loads and can only use what earlier files have already made.

| File | What it is |
|---|---|
| `index.html` | The page, the HUD, and the three.js bootstrap |
| `store/core.js` | Constants and the palette, the renderer, the TV-light shader, bloom, rewinding, canvas-texture helpers |
| `store/shell.js` | The building: `box` / `solid` / `wall`, doors, the outer walls, the back hall |
| `store/backrooms.js` | Janitor's closet, break room, restroom |
| `store/theater.js` | The theater lobby and the theater |
| `exterior/lot.js` | The lot, the road, the street outside |
| `exterior/grounds.js` | Around the building: the grass, the dumpster, the cardboard bed behind it |
| `exterior/serviceroad.js` | The service road: its worn paving, the fence, jersey barriers, the turning island |
| `store/lobby.js` | Lobby and back-wall dressing, the entry lane and gates, the snack center |
| `store/shelves.js` | Posters, the cover atlases, the shelves, the store layout |
| `store/lounge.js` | The TV lounge, picture settings, the screensaver, the light switches |
| `store/clock.js` | The clock: the shift's hours going by, the HUD's top line, the light switches' rockers |
| `store/shift.js` | The shift, the log, day goals, reputation, upgrades, tonight's feature |
| `exterior/sky.js` | Weather and the sky |
| `exterior/trees.js` | The trees outside, swaying, through the seasons |
| `store/player.js` | The player, the stool, picking things up, the standee |
| `store/shoppers.js` | Customers: who they are, what they want, how they get around |
| `store/staff.js` | Dana and the staff: skills, the job board, hiring, restocking |
| `store/checkout.js` | Checkout and the receipt, eating and drinking, snack and drink stock |
| `store/phone.js` | The phone, post-its, the calendar, the corkboard, holiday decorations |
| `tonys/inside.js` | Inside Tony's: the dining room, the counter, the kitchen |
| `tonys/arcade.js` | Its two arcade cabinets, Space Invaders and Asteroids |
| `tonys/outside.js` | Tony's building from outside, and its roof |
| `store/roof.js` | The roof and what's on it, golf |
| `store/chores.js` | The restroom's working parts, counter gear, misshelved tapes, messes, the ladder, trash, popcorn, inventory |
| `store/tv.js` | Holding a tape up, the store TV |
| `store/title.js` | The title screen and pointer lock, the register hookup, the gate alarm, clocking out |
| `store/customer-mode.js` | Customer mode |
| `store/together.js` | Playing together: pairing through Jellyfin, the direct link, the other player, guests, the shared time and weather |
| `store/main.js` | Save and restore, the main loop, room culling, loading |
| `couch.js` | The procedurally built parlor sofa |
| `pos.js` | The register's DOS-style POS terminal |
| `ambience.js` | The store's ambient sound, modelled from the physics of each source rather than recorded: ballast hum, room tone, Doppler-shifted traffic through the glass, the entry chime, footsteps, latches and hinges, swing doors, the cooler's door and compressor |
| `jellyfin.js` | The link to your server: the sign-in form, the library as tapes on shelves (`window.STORE_CATALOG`, `STORE_META`, `STORE_POSTERS`), and playing (direct or HLS, reporting back) |
| `JellyBusterLink/index.html` | A standalone page for checking two devices can connect directly |
| `vendor/` | three.js, hls.js and the VT323 font, with their licenses |
| `tests/smoke.mjs` | The smoke tests (see Testing) |
| `tests/jellyfin.mjs` | The link: signing in, the library as stock, playing, and libraries tiny and too big |
| `tests/mock-jellyfin.mjs` | The stand-in Jellyfin those tests run against (it needs `ffmpeg` to make its test video) |
| `tests/shot.mjs` | A screenshot (or frame timing) from anywhere in a fresh store |

#### Testing

`tests/smoke.mjs` loads the game headless from `file://` and drives each system through its test hooks: the menu and save files, a full checkout, restocking, a phone hold, moving counter gear, save/reload, the restroom, and a fresh Simulation store: hiring and schedules, skill milestones, the rewinder upgrades, staff clocking out, members' visiting rhythm, day goals, the janitor's closet and the register's sale screen; then a Customer store: in off the lot, paying, getting caught, and a key that keeps through a reload. It needs Node and a Chromium:

```sh
npm install                      # playwright-core (dev only; the game itself has no build)
npx playwright install chromium  # or set PLAYWRIGHT_CHROMIUM_PATH to any Chrome/Chromium
npm test                         # a few minutes: it renders in software
```

To look at something, `tests/shot.mjs` puts you at a spot and takes a screenshot. Add `--setup "<js>"` to arrange things first through the `window.__t` hooks, or `--gpu --fps` to time frames on the real GPU:

```sh
node tests/shot.mjs closet.png 10.3,29.1,-1.7,0.1 --setup "__t.setZone('closet', true)"
node tests/shot.mjs - 3,12,3.14,0 --mode simulation --gpu --fps
```

</details>

---

<div align="center">

**BE KIND. REWIND.**

[MIT licensed](LICENSE). Use it, change it, share it: just keep the license notice. Bundled libraries keep their own licenses, in `vendor/`.<br>
A fan-made game, not affiliated with Jellyfin or any video store chain.

*If you like it, tell someone who used to work behind a counter.*

</div>
