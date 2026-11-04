# JellyBuster

A first-person 90s video store in three.js, stocked from the player's own Jellyfin server. No build: `index.html` loads plain scripts, and it has to keep working from `file://`. The game doesn't load until `Jelly.ready` (`jellyfin.js`): it reads its stock while it loads.

## How the game's code is laid out

The game is three folders, `store/` (the video store, plus the game's rules), `tonys/` (the pizza place next door) and `exterior/` (the lot, the grounds, the sky): one program cut into files, not modules. They share one global scope and run in the order listed in the loader at the bottom of `index.html`. A file can only use, while it loads, what earlier files have made (inside functions that run later, anything goes). A new file has to be added to that list.

`store/roof.js` builds inside one big block with its own helpers (`put`, `bx`, `lam`, ...). The grounds and Tony's outside are built from that block too, but live in their own folders as functions (`buildGrounds`, `tonyOutside`, `tonyRoof`) that the block calls, handing over the helpers they use.

Sections inside a file start with a `// ---- name ----` comment; grep for the name below to land on it.

## Where things are

**The world (what's built and where)**

| For | Look in |
|---|---|
| Sizes and positions everything else is built from (`WALL_L`, `DOOR_W`, `LOT`, colours) | `store/core.js`: palette / constants |
| `box` / `solid` / `wall` / `makeDoor`, the outer walls, the back hall | `store/shell.js` |
| Janitor's closet, break room (lockers, table, kitchenette), the women's and men's restrooms (stalls, urinal, sinks) | `store/backrooms.js` |
| The theater lobby's shell, the auditorium and its seats, the projection booth over the lobby and its stairwell (`BOOTH`, `stairsAt`) | `store/theater.js` |
| The lobby's dressing: concession stand, menu board, ropes, the NOW PLAYING poster | `store/theaterlobby.js` |
| The lot, stalls, curbs, driveways, the road, street lamps, parked cars | `exterior/lot.js` |
| Grass round the building, the store's dumpster, the cardboard bed behind it | `exterior/grounds.js` |
| The service road (laid out by `SERVICE_ROAD` in `store/core.js`): its worn paving and that shader, the fence, jersey barriers, bollards, the turning island | `exterior/serviceroad.js` |
| Employee counter, returns, back cabinet, entry lane and gates, trash receptacle, snack center (cooler, snack rack; the popcorn machine, built here, stands in the theater's lobby) | `store/lobby.js` |
| Posters, cover atlases, shelves and the store layout (walls, kids, center, Staff Picks, Classic Horror, standee, candy aisle) | `store/shelves.js` |
| TV lounge (couch, TV, lamps), the light switches | `store/lounge.js` |
| The roof and everything on it (two decks: the store's at 4 m and the tall block's at 6.4, the iron stair between them, `roofY`; AC units, dish, sign, lawn chairs, projector, the kick-down ladder out back: `BACK_LADDER`), golf, and at the end of the file how it all works (`roofClimb`, `roofTick`, `cineTick`) | `store/roof.js` |
| The roof's stamped hardware (`roofKit`: boxes, conduit, supports, drains, blocks; merged by material) | `store/roofkit.js` |
| Tony's building from outside (brick, awning, glass front), Tony's roof | `tonys/outside.js` |
| Inside Tony's: dining room, counter, kitchen | `tonys/inside.js` |
| Tony's day (in, out, locking up) | `tonys/arcade.js`: `tonyDayTick` |
| Tony's light (its own shader: the table of lights, floor, walls, tin ceiling, brick) and `tonyKit`, which bakes static parts into one mesh | `tonys/light.js` |
| Tony's arcade cabinets, built and painted | `tonys/cabinets.js` |
| The games: Space Invaders, Asteroids (`tonys/arcade.js`), Missile Command (`tonys/missile.js`) | |
| Out back of Tony's: slab, bulb, dumpster, the smokers' corner | `tonys/yard.js` |
| Phone, post-its, calendar, corkboard, holiday decorations | `store/phone.js` |
| Weather, the sky | `exterior/sky.js` |
| Trees | `exterior/trees.js` · the couch model: `couch.js` · people's bodies: `customers.js` |

**How it behaves**

| For | Look in |
|---|---|
| The player, the stool, aiming and picking up, carrying the standee | `store/player.js` |
| What E does (`onE`), holding a tape up, the store TV | `store/tv.js` |
| A tape held up: the 3D box, turning it over (R), its back drawn from Jellyfin | `store/tapebox.js` |
| What the crosshair is on (the `aim*` flags), checkout, the receipt, eating and drinking, snack stock | `store/checkout.js` |
| Customers: who they are, what they want, how they walk; people and cars going by out front | `store/shoppers.js` |
| Dana and the staff, skills, job board, hiring | `store/staff.js` |
| The shift, log, day goals, reputation, upgrades | `store/shift.js` |
| The clock ticking (`shiftTick`), skipping an hour, the HUD's top line, flipping light switches | `store/clock.js` |
| Restroom fixtures working, moving counter gear, messes, the ladder, trash, popcorn, inventory | `store/chores.js` |
| Title screen, pointer lock, gate alarm, clocking out | `store/title.js` |
| Customer mode | `store/customer-mode.js` |
| Saving, the main loop, room culling, loading, the `__t` test hooks | `store/main.js` |
| TV picture settings, screensaver | `store/lounge.js` |
| Renderer, TV-light shader, bloom, rewinding, canvas-texture helpers | `store/core.js` |
| The register terminal | `pos.js` · sound: `ambience.js` · touch controls: `touch.js` |
| The Jellyfin link: sign-in form, library to tapes (`placeMovie`, `placeSeries`, `stock`: which shelf block each tape's on, `SHELVES` mirrors what `store/shelves.js` builds), playing | `jellyfin.js` |

## Testing

`npm test` runs `tests/jellyfin.mjs` and `tests/smoke.mjs` (several minutes, software-rendered), both against a stand-in server, `tests/mock-jellyfin.mjs`. `node tests/shot.mjs out.png x,z,yaw,pitch` takes a screenshot from anywhere.
