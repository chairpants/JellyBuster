# JellyBuster

A first-person 90s video store with its shelves stocked from **your own Jellyfin library**. Every movie is a tape, every season of a show is a tape, and what you put in the VCR streams from your server. Inside the game the store is still called JellyBuster.

## Linking your Jellyfin

1. Open `index.html` in a browser, straight from your computer (`file://`). There's nothing to build or serve. You need an internet connection, because three.js and hls.js load from a CDN.
2. Enter your server's address (for example `http://your-server:8096`) and sign in with your Jellyfin user and password, or use **Quick Connect** and approve the code in a Jellyfin app that's already signed in.
3. The library is read fresh each time the game loads. **SETTINGS → UNLINK JELLYFIN** signs out; your store saves stay.

The browser talks to your server directly, with no proxy. Your address and a session token are kept in this browser's localStorage. Your password isn't kept. The token also goes in the video URLs, as Jellyfin requires, so over plain http it's visible on your network like any other Jellyfin traffic.

**Don't host it on https** (GitHub Pages, say) if your server is plain http: browsers block an https page from reaching an http server. Open the file locally, or put Jellyfin behind https.

### How your library goes on the shelves

- **Sections** come from each title's Jellyfin genres, best fit first (see `placeMovie` and `placeSeries` in `jellyfin.js`).
- **The walls** (new releases) get your newer movies. The oldest 15% or so go on the classics shelves in the middle, and TV goes on the shelving east of the walkway. Kids' titles go by the windows, judged from genres and rating.
- **Classic Horror** is its own shelf with its own sign: your best-rated pre-2000 horror films, if you have at least 11. Otherwise that shelf isn't there.
- **Staff Picks** and the wall posters are your best-rated titles.
- **Room:** the store holds about 3,000 tapes. Past that, the lowest rated are left out, and SETTINGS tells you how many.
- **Spare room** is filled with extra copies, so a small library still fills the store.

### What goes back to your server

Playing a tape tells Jellyfin like any other client (started, progress, stopped), so **watching in the game counts as watching on your account**: resume points and played status can change. Customers renting tapes in the game don't touch your server. The game's tape position is its own: a tape plays from wherever it's wound to in the game, not from your Jellyfin resume point.

Files your browser can play (mp4 or webm with browser-friendly codecs) play directly. Anything else (mkv, HEVC where unsupported, AC3/DTS audio) is remuxed or transcoded by your server as HLS, which uses its CPU or GPU.

---

**It's 7:25 on a Friday night, there's a line at the counter, somebody by the door has a tape under their jacket, and the store is yours.**

JellyBuster is a first-person shift at a neighborhood video store in the 90s. You're the one behind the counter. You work the register, keep the place running, and turn a half-empty storefront into the store everybody in town goes to on a Friday night.

---

## Your first few minutes

It's 9 AM and the doors are still locked. You have an hour.

**Walk** the floor and **flip on** the lights zone by zone. **Empty** the returns slot, **rewind** what came back, and **shelve** it where it goes. **Stock** the candy rack from the cupboard behind the counter. Then **unlock** the front doors.

The chime goes and the first customer wanders in. They browse, they pick something out, they **come up to the counter**. You **swipe** their card, **ring it up**, **desensitize** the tape so it doesn't set off the gates, **charge** (or waive) their three dollars in late fees, **pitch** them a box of candy, **tear off** the receipt and **hand it over**. Speed matters, and so does getting every step right.

Then the phone rings. Someone wants to know if you have a particular movie in. Say you'll hold it, and it had better be on the holds shelf when they show up.

Then a customer with darting eyes heads for the door.

---

## Then it becomes your store

You can't do it all yourself for long, and you're not supposed to.

**Hire.** Post a job opening from the register and three applicants come in to interview, each good at something different. Pick the one you want on your team.

**Schedule.** Lay out their week hour by hour on the register's DOS-style schedule screen. They come in the front door when their shift starts and leave when it ends.

**Delegate.** The job board behind the counter works like a priority grid: register, phones, floor, returns, restock, cleanup. Put your best talker on the register, keep someone strong on restocking, and set the rest to sweep up.

**Level up.** Everyone has six stats, each one tied to part of the job: **DEX** for register work and rewinding, **INT** for shelving and finding the exact tape someone asked for, **CHA** for upsells and the phone, **STR** for hauling deliveries, **CON** for cleaning and miles walked, **WIS** for spotting shoplifters. The work earns XP, and milestones unlock perks like *Quick Thread*, *Smooth Talker* and *Sixth Sense*. Your clumsy new hire turns into your best clerk.

**Grow.** Every shift ends with a printed slip and a grade. A good night raises your star rating and gets people talking, so more members sign up. Each day comes with goals to hit. Spend what the store earns on upgrades: security cameras, anti-theft signs, a second rewinder, high-speed rewinders shaped like little sports cars, a better cooler, staff training, an ad in the paper, and a theater with an 8 PM feature.

**Keep it clean.** Soda gets spilled, popcorn ends up in the carpet, bins overflow, ceiling lights burn out. Grab the mop, the carpet sweeper, or the step ladder from the janitor's closet. Whatever's left at midnight counts against you on the closing check.

---

## The feel of the place

Buzzing fluorescent tubes, blue carpet, a confetti-print kids' corner, posters ringed with marquee bulbs, and a DOS terminal on the counter that wants an F-key for everything. A customer's TV-set head smiles when you get their order right and scowls when you leave them waiting.

All the sound is generated live instead of recorded: ballast hum, room tone, traffic outside the glass, the door chime, the cooler's compressor kicking on. The day goes by outside the front windows, from morning light to golden hour to sodium lamps over an empty lot. After close it's just you, the lounge lamps and whatever you left undone.

---

## Clock in

Open `index.html` in a browser (see above). It runs with keyboard and mouse, and you can play it on a touchscreen too.

- **Simulation** starts you in a bare-bones store: no staff, the theater chained shut, a small member list. Build it up from what it earns.
- **Sandbox** gives you $10,000 and Dana on staff from the start. Buy what you like and get playing.
- **Customer** puts you on the other side of the counter. The store runs itself, and you walk in off the lot with your own wallet. Pay for what you take (or don't, if nobody's looking), stay out of the back, and see how far you can get. Some doors are locked and some things padlocked, and what opens them is out there somewhere. Be a good customer and they'll treat you like a regular. In Simulation, keep the store in the red three nights running and the owner fires you: you're back the next day as a customer.

Three save files, like an old cartridge: pick one to **play**, **copy** or **delete** it. The store remembers where you left everything. If you like it, tell someone who used to work behind a counter.

---

## Controls

| Key | Action |
|---|---|
| **W A S D** | Walk |
| **Mouse** | Look |
| **Shift** | Hustle |
| **C** | Crouch |
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
| **V / N** | Tap for the previous / next episode. Hold to rewind / fast-forward, with a scrub bar in the corner showing where you are |
| **K** | Character sheet: your skills and the staff's, with XP toward the next level |
| **H** | Hide the HUD |
| **M** | Store sounds on/off (fluorescent hum, air, traffic outside, the door chime, footsteps, doors, the cooler) |
| **J** | Show or hide the log (bottom left) · **PgUp / PgDn** scroll it |
| **1–5** | When you've caught a shoplifter: ban a week / a month, cancel their membership, call the police, or let them off with a warning |
| **F** | Fullscreen |

---

## How it's put together

To run it locally, open `index.html` in a browser. It works straight from `file://` with no server; you just need an internet connection, because three.js loads from a CDN.

Everything runs as plain `<script>` files loaded in order. There are no ES modules, so the page works from `file://`. The one exception is a small inline module in `index.html` that imports three.js and its post-processing add-ons from the CDN, puts them on `window`, and then loads the game itself, the files in `store/` (JellyBuster itself, and the game's rules), `tonys/` (the pizza place next door) and `exterior/` (the lot, the grounds, the sky), in order. They are one program cut into sections, not modules: they share one scope, and the order (the list in `index.html`) matters, because each file runs as it loads and can only use what earlier files have already made.

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
| `store/main.js` | Save and restore, the main loop, room culling, loading |
| `couch.js` | The procedurally built parlor sofa |
| `pos.js` | The register's DOS-style POS terminal |
| `ambience.js` | The store's ambient sound, modelled from the physics of each source rather than recorded: ballast hum, room tone, Doppler-shifted traffic through the glass, the entry chime, footsteps, latches and hinges, swing doors, the cooler's door and compressor |
| `jellyfin.js` | The link to your server: the sign-in form, the library as tapes on shelves (`window.STORE_CATALOG`, `STORE_META`, `STORE_POSTERS`), and playing (direct or HLS, reporting back) |
| `tests/smoke.mjs` | The smoke tests (see Testing) |
| `tests/jellyfin.mjs` | The link: signing in, the library as stock, playing, and libraries tiny and too big |
| `tests/mock-jellyfin.mjs` | The stand-in Jellyfin those tests run against (it needs `ffmpeg` to make its test video) |
| `tests/shot.mjs` | A screenshot (or frame timing) from anywhere in a fresh store |

### Testing

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
