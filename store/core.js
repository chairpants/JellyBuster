// JellyBuster — a first-person 90s video store. Its tapes come from your Jellyfin server (jellyfin.js) and play on the in-store CRT.
// Classic scripts (not modules) so it also runs from a file:// page: this is the first of the store/ files
// (the list, in order, is in index.html), which share one scope and run in that order;
// index.html's inline module sets window.THREE / window.mergeGeometries first.
const artUrl = a => a;                       // covers are whole URLs, on the Jellyfin server
const loads = { n: 0, done: 0 };                   // images asked for / landed (or failed), for the loading bar (see boot)
{ const m = THREE.DefaultLoadingManager, s = m.itemStart, e = m.itemEnd; m.itemStart = u => { loads.n++; s(u); }; m.itemEnd = u => { loads.done++; e(u); }; }

// ---------------- palette / constants ----------------
const BLUE = 0x00349c, BLUE_DK = 0x001f5c, YELLOW = 0xffd400;
const STORE = { x: 11, z: 28, h: 3.6 };            // interior half-width / depth / height
const BAY = { len: 1.6, rows: 4, perRow: 11, depth: 0.55, top: 0.25, h: 2.0, boardY: [0.18, 0.63, 1.08, 1.53] };
// gondola side profile is a blunted wedge: vertical back (shared with the
// face behind), sloped front — depth at the floor, top at BAY.h
const frontAt = (y, spec = BAY) => spec.depth - (spec.depth - spec.top) * y / spec.h;
const LEAN = 10 * Math.PI / 180;                  // tapes tip back against each shelf's backing board
const CAP = BAY.rows * BAY.perRow;                 // 44 tapes per bay face (face-out covers)
const SHORT = { ...BAY, rows: 3, boardY: [0.18, 0.63, 1.08], h: 1.5 };   // center + kids gondolas: three rows, low enough to see across the store
const SLOT_W = 0.13, TAPE = { w: 0.032, h: 0.192, d: 0.105 }; // slot = cover + ≤1/4-tape spread
// Movies' side wall pulled in from the original symmetric ±STORE.x so its gap
// to the nearest shelf endcap (-4.76) matches TV Shows' gap to its wall
// (2.98, from its endcap at 8.02) — see the aisle-layout section for that math.
// Right/back/front-right stay at the original STORE.x scale.
const WALL_L = -7.74;
const WALL_SHIFT = WALL_L + STORE.x;       // how far the movie-side wall (and everything anchored to it) moves in, ~3.26
// back of house: a block built on behind the store's back wall at the TV Shows
// end — a hallway along the back wall, a restroom and a break room off it, the
// janitor's closet at the hall's far end, and a door at its near end into the theater's lobby
const BOH = { x0: 2, z1: 35, hallZ: 29.8, splitX: 5.8, h: 2.7, rrX: 3.9, officeZ: 32.4 };   // west wall, rear wall, hall/rooms wall, restrooms|break room wall, ceiling height, women's|men's wall, break room|manager's office wall
const DOOR_W = 1.1, DOOR_H = 2.13;          // opening; tops out just under the store's blue wall stripe
const BOH_DOORS = { store: 4.6, restroom: 5.0, restroomF: 3.0, breakroom: 8.55, office: 6.845, future: 28.9, closet: 28.9 };   // (future, closet: along z, in the hall's west wall and the closet's)
const breakFx = { clock: null, punch: null, clock12: null, coffee: null, coffeeLed: null, tv: null, tvMesh: null, vcr: null, tvT: 0 };   // the break room's moving parts (see breakroomTick)
const closetBulb = { mat: null };                 // the closet's bare bulb (its glass goes warm white when the "closet" zone is on)
const fireExit = { leaf: null, shut: null, a: 0, open: false, t: 0 };   // the theater's emergency exit door: its leaf, its collider while it's shut, how far it's swung (see fireExitTick)
const storeExit = { leaf: null, shut: null, a: 0, open: false, t: 0 };   // and the store's, past the end of the east wall's shelves
const STORE_EXIT = { z0: 26.3, z1: 27.4 };       // where along that wall
const boothGlow = { lamps: null, stairs: null, red: null };   // the booth's wall lamps' lenses, the stairwell's bulbs, the booth's red working lights (on while its lights are off)
const OFFICE_WIN = { x0: 7.5, x1: 8.65, sill: 0.95, head: 2.05 }, OFFICE_DOOR_W = 0.85;   // the manager's window onto the break room, and the narrow door beside it
const CLOSET = { x0: 9.4, x1: STORE.x, doorW: 0.8 };   // the hall's end, x0 its wall across the hall (the door's in it) to the building's side wall
const SCUPPERS = [[-7.84, 12, 1, 0], [-7.84, 26, 1, 0], [11.1, 6, -1, 0], [11.1, 21, -1, 0], [-3.0, 48.6, 0, -1], [7.5, 35.1, 0, -1]];   // the overflow scuppers through the parapet: where on the outer face, and its inward normal
// the lot out front, front to back (z): the walk, the drive (a lane each way: right-hand, so east is the near lane),
// the stall row, the curb, a strip of grass, then the road (its two lanes). Two driveways cut through, one at each end
const LOT_Y_ = -0.12, LOT = { y: LOT_Y_, lane: { 1: -3.3, "-1": -6.3 }, stalls: -7.8, curb: -12.3, roadNear: -13.8, roadFar: -20.4, road: { 1: -15.45, "-1": -18.75 }, gates: [-22.54, 26.86], gateW: 4.4,   // (the stall lines and the lot's ends go by these)
  noPark: [0, 1, 2, 19, 20, 21] };
LOT.drives = LOT.gates.map((g, i) => i === 0 ? [g - LOT.gateW / 2, g + LOT.gateW / 2 + 0.6] : [g - LOT.gateW / 2 - 0.6, g + LOT.gateW / 2]);   // the driveways' paving: 60 cm wider on the inside (toward the stalls)   // stalls nobody parks in: past the driveways (grass), the driveways, and the cut-short ones beside them (in the way of cars turning in). The driveways: stalls 1 and 20's spots
LOT.lampX = [4, 9, 14, 19].map(k => {             // the lot's street lights, along the grass strip by every fifth stall (never in a driveway or its flares: beside it)
  const R = LOT.curb - LOT.roadNear, x = WALL_L - 20 + 2.6 * (k + 1), [a, b] = LOT.drives.find(([a, b]) => x > a - R - 0.6 && x < b + R + 0.6) || [];
  return a == null ? x : Math.abs(x - (a - R - 0.6)) < Math.abs(x - (b + R + 0.6)) ? a - R - 0.6 : b + R + 0.6;
});
// the service road, laid out for a front-load trash truck on what room there is: off the lot through a cut in the walk at each end, down both sides and
// behind the theater. There the truck swings wide round a curbed island (ISLAND: a quarter circle in the crook of the two buildings), which leaves it heading
// straight down the alley at the store's dumpster; the crook's back end is a hammerhead to back into. Behind the alley it's all one apron, east across the
// back of Tony's to the east lane and so out again. Its back edge hugs the turn, then cuts across on a straight line to the east lane (LINE: where the paving
// stops). Stockade fence all round the outside, on past both ends of the lot's walk; big trees past it.
// cuts: its gaps in the walk, x. ring(e): its edge as one outline, front to back to front, e metres out past the asphalt on the outer side (the gravel shoulder: SHOULDER, to the fence)
const SERVICE_ROAD = (() => {
  const arc = (cx, cz, r, a0, a1, n = 10) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * r, cz + Math.sin(a) * r]; });
  const P = Math.PI, W = -16.2, E = 27.4, BACK = 52.6, RC = 6, CW = W + RC, CZ = BACK - RC, SHOULDER = 0.8, FRONT = 0.35;
  const ISLAND = { x: 3, z: 41, r: 7.6 }, TURN = BACK - ISLAND.z, LINE = P / 3;   // TURN: the back edge's radius round the island; LINE: how far round it the edge leaves the curve for the straight (tangent to it, and to the corner at the east lane)
  const CE = E - RC, CS = ISLAND.z + Math.sin(LINE) * TURN - (CE + Math.cos(LINE) * RC - ISLAND.x - Math.cos(LINE) * TURN) * Math.cos(LINE) / Math.sin(LINE) - Math.sin(LINE) * RC;   // the corner's centre, z: where the straight off the turn lands on it
  const back = e => [...arc(CW, CZ, RC + e, P, P / 2), ...arc(ISLAND.x, ISLAND.z, TURN + e, P / 2, LINE, 8), ...arc(CE, CS, RC + e, LINE, 0)];
  const ring = e => [[W - e, 0], ...back(e), [E + e, 0], [23, 0], [23, 18.4], [16.7, 18.4], [16.7, 14], [13, 14], [13, 0], [11.1, 0], [11.1, 35.1], [2.1, 35.1], [2.1, ISLAND.z],
    ...arc(ISLAND.x, ISLAND.z, ISLAND.r, 0, P / 2, 16), [-9.4, 48.6], [-9.4, 44.5], [-11, 43], [-11.84, 41.5], [-11.84, 0]];
  const s = SHOULDER, outer = [[W - s, FRONT], ...back(s), [E + s, FRONT]];
  const fences = [[[-58, FRONT], ...outer, [67, FRONT]]];   // (out both ways to the treeline, along the back of the walk)
  const inside = (x, z) => {                       // inside the fence, buildings and all
    if (z < FRONT) return false; let hit = false;
    for (let i = 0, j = outer.length - 1; i < outer.length; j = i++) { const [xi, zi] = outer[i], [xj, zj] = outer[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) hit = !hit; }
    return hit;
  };
  return { cuts: [[W, -11.84], [23, E]], W, E, BACK, RC, CW, CE, CZ, CS, SHOULDER, FRONT, ISLAND, TURN, LINE, ring, fences, inside, arc,
    behindFence: (x, z) => z > FRONT && !inside(x, z),   // past the fence: nobody's allowed, the player included (see blocked)
    trees: [[-19.6, 8.5, 3.7], [-21, 26.5, 4.3], [-19.9, 41, 3.6, true], [-6.5, 56.4, 4.2], [8.4, 55.6, 3.6, true], [19.6, 50, 4], [25.2, 46.4, 3.4, true], [30.8, 11.5, 3.5, true], [31.4, 28, 4.3], [30, 40.6, 3.7]],   // the big trees past it: x, z, size, pine
    fx: { snow: { value: 0 }, pond: { value: 0 } } };   // (the road's shader: what's lying on it; see weatherTick)
})();
const CURB_H = -LOT_Y_ + 0.008, CURB_Y = (LOT_Y_ + 0.008) / 2;   // a curb: from the paving up to 8 mm proud of the walk and grass (flush, its top fought theirs)
// where it's paved for driving (the lot, the driveways, the road): 12 cm down, a curb's height under the walk and the grass
function pavedAt(x, z) {
  const hw = LOT.gateW / 2;
  if (z < LOT.roadNear && z > LOT.roadFar) return true;
  if (z < -1.8 && z > LOT.curb) return x > LOT.gates[0] - hw && x < LOT.gates[1] + hw;
  return z <= LOT.curb && z >= LOT.roadNear && LOT.drives.some(([a, b]) => x > a - 0.3 && x < b + 0.3);
}
const ROOF = { y: 4.0, wall: 0.91, rects: [[-7.84, 11.1, -0.1, 35.1], [-7.84, 2.1, 35.1, 48.6]],   // the building's footprint (outer wall faces) and its flat roof: deck top y, parapet height
  tall: { x0: -7.84, x1: 2.1, z0: 29.6, z1: 48.6, y: 6.4 } };   // the tall block: the auditorium and, over the lobby's back, the projection booth, roofed 2.4 m higher
ROOF.decks = [{ r: [-7.84, 11.1, -0.1, 29.6], y: ROOF.y }, { r: [2.1, 11.1, 29.6, 35.1], y: ROOF.y }, { r: [ROOF.tall.x0, ROOF.tall.x1, ROOF.tall.z0, ROOF.tall.z1], y: ROOF.tall.y }];
const deckY = (x, z) => { for (const { r: [a, b, c, d], y } of ROOF.decks) if (x > a && x < b && z > c && z < d) return y; return null; };   // the roof deck's height there (null: off it)
// in the tall block: the auditorium's ceiling and the booth's, the booth's floor (over the lobby's back, from its front wall to
// the auditorium's), and the auditorium's door from the lobby, at its far end by the store's side wall
const TALL = { ceil: 6.0, booth: 3.0, z0: 29.8, z1: 34.9 };
const CINEMA_DOOR = -6.85;
// the auditorium's emergency exit, in its side wall by the aisle at the screen end, down on the pit's floor (its opening's
// head 2.15 over it): out into a stairwell sunk in the ground beside the building, its landing at the door, steps up toward
// the back to the paving there; well: its outer side, its end before the door, where the steps start, where they come up
const FIRE_EXIT = { z0: 44.85, z1: 45.95, head: 0.59, well: { x0: -9.25, z0: 44.65, stair: 46.1, z1: 48.6 } };
// the stairwell up to the booth, walled in, in the lobby's corner by the back of house: its side wall's outside face (x0) and
// its front wall's (z0); between its two flights (split); where they start (top: the end of the floor inside the door) and
// turn (the landing at the back). Up one flight toward the back by the back of house's wall, round, up the other toward the front
const SHAFT = { x0: -0.65, z0: 29.65, split: 0.65, top: 30.9, turn: 33.14, door: 1.3 };
const STAIR_BULBS = [[1.3, 2.62, 30.35], [0.6, 3.75, 34.0]];   // the stairwell's two lights: over the door's landing, over the turn (the room shader lights it from them)
// outside, the iron stair from the store's roof up the tall block's front to its roof: its top tread's end (x0), its sides (z),
// its treads and their run, toward +x, down to the store's roof; the landing at the top, back to land, where the parapet's open
const IRON = { x0: -5.6, z0: 28.6, z1: 29.4, n: 11, run: 0.27, land: -6.6 };
// the closet's tools, taken out with E and put back the same way, one at a time (see toolTake), held for use
// (hold, in your body's frame: foot = how far right the business end sits on the floor (as far out as the handle
// reaches), hand = the top grip [right, up, forward]; see toolTick).
// The closet build fills in g (the tool), home (its spot), col (its collider)
const TOOLS = {
  mop: { label: "mop", hold: { foot: 0.14, hand: [0.1, 1.12, 0.32] } },
  sweeper: { label: "carpet sweeper", hold: { foot: 0.12, hand: [0.18, 1.02, 0.38] } },
};
// the step ladder: carried about like the stool (opened out, red where it won't fit), set down on any clear bit of
// floor, climbed (stand on the top step and the ceiling lights are in reach), and leaned back against the closet
// wall, folded, when you're done. state: "stored" (in the closet) | "carried" | "placed" (at x, z, facing ry: its
// steps toward +z). last: where it stood before you picked it up (a save mid-carry puts it back there)
const LADDER = { aF: 0.26, aR: 0.21, TOP: 1.62, STEP: 1.32, CARRY_D: 1.15, REACH: 1.75 };   // front / rear spread (rad), cap and top-step heights, carry distance, how far up you can work
const ladder = { g: null, state: "stored", x: 0, z: 0, ry: 0, box: { y1: 1.7 }, spot: null, last: null, home: null, stow: null,
  on: false, lift: 0, from: null, fix: null, open: null, mats: [], stowBox: null };
function ladderFit(x, z, ry, b) {               // floor box round the four feet, at any angle
  const c = Math.cos(ry), sn = Math.sin(ry), xs = [], zs = [];
  for (const [lx, lz] of [[-0.3, -0.38], [0.3, -0.38], [-0.3, 0.47], [0.3, 0.47]]) { xs.push(x + lx * c + lz * sn); zs.push(z - lx * sn + lz * c); }
  return Object.assign(b, { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) });
}
// pose a mop or sweeper (built round its business end: g at the floor, a "toolHead" that turns flat on the floor and a
// "toolPole" pivoting off it): the head at world F, the handle aimed up at world A. Returns where along the handle the
// hands go: { P (its bottom), dir, len (to A, capped at the handle's length) }
const toolPoseV = { P: new THREE.Vector3(), dir: new THREE.Vector3(), len: 0 };
function toolPose(g, F, A) {
  const head = g.getObjectByName("toolHead"), pole = g.getObjectByName("toolPole");
  g.position.copy(F);
  const dx = A.x - F.x, dz = A.z - F.z, dy = A.y - F.y - pole.position.y, hd = Math.hypot(dx, dz);
  head.rotation.set(0, Math.atan2(dx, dz), 0);      // the head's +z: back toward your hands (all three set: a decomposed
  pole.rotation.set(Math.atan2(hd, dy), 0, 0);       // matrix can leave a yaw past 90° as (PI, y, PI)); the handle leans that way
  const v = toolPoseV; v.P.set(F.x, F.y + pole.position.y, F.z); v.dir.set(dx, dy, dz).normalize();
  v.len = Math.min(Math.hypot(hd, dy), pole.userData.L - 0.04);
  return v;
}
const TROFFERS = [];                              // the sales floor's ceiling lights: { x, z, y } (a burnt-out one gets a dark cover, see lightDie)                      // janitor's closet: off the hall's east end, out past the building line to x1 (its back wall)
let wallStripe = null;                           // the blue band on the side walls: { inL: its face off the west wall, y0: its bottom } (the pass-through leaf stops against it)
const trashBins = {};                            // the bins, registered as they're built (see "trash" further down)
const chute = { door: null, t: 0, at: [0, 0, 0], stand: null };   // the trash chute, in the janitor's closet (likewise)
const bath = { flushers: [], sinks: [], seat: null, water: null, sinkAt: null };   // the restrooms' working parts (built with them; see bathTick): every toilet and the urinal { flushT, at, water, waterY }, each sink { tap, stream, at, bin }. (seat, water, sinkAt: the first of each, for the exporter)   // opening centers along their walls
const BOH_OPENING_W = 1.8;                  // the store → hall opening: wide and doorless, just a cased opening
// cooler stock, shelf by shelf (see the cooler): r/h in meters; glass = bottle
// color + opacity, label = [background, text]. Grabbing one hands you that unit.
const DRINK_PRODUCTS = [
  { name: "AQUA SPRING", kind: "Water", shape: "bottle", r: 0.033, h: 0.215, glass: 0xdff3ff, opacity: 0.35, cap: 0x2a7de1, label: ["#ffffff", "#2a7de1"] },
  { name: "JELLY COLA", kind: "Soda", shape: "bottle", r: 0.034, h: 0.23, glass: 0x2b120a, opacity: 0.95, cap: 0xd21f26, label: ["#d21f26", "#ffffff"] },
  { name: "LEMON FIZZ", kind: "Soda", shape: "bottle", r: 0.034, h: 0.23, glass: 0xc9f29a, opacity: 0.55, cap: 0x2e9e3a, label: ["#2e9e3a", "#fff36b"] },
  { name: "GOLD CROWN", kind: "Beer", shape: "longneck", r: 0.031, h: 0.235, glass: 0x5a2a0a, opacity: 0.93, cap: 0xc9a227, label: ["#f3e6c4", "#9c1c1c"] },
  { name: "VALLEY PILS", kind: "Beer", shape: "longneck", r: 0.031, h: 0.235, glass: 0x1f5a2a, opacity: 0.9, cap: 0xb8bcc2, label: ["#ffffff", "#1f5a2a"] },
  { name: "VOLT", kind: "Energy drink", shape: "can", r: 0.029, h: 0.157, label: ["#111111", "#7dff3a"] },
  { name: "RUSH", kind: "Energy drink", shape: "can", r: 0.029, h: 0.157, label: ["#1b4fd6", "#e6e9ee"] },
  { name: "JELLY COLA", kind: "Soda", shape: "can", r: 0.033, h: 0.122, label: ["#d21f26", "#ffffff"] },
  { name: "ORANGE BLAST", kind: "Soda", shape: "can", r: 0.033, h: 0.122, label: ["#ff7a00", "#ffffff"] },
  { name: "ROOT BEER", kind: "Soda", shape: "can", r: 0.033, h: 0.122, label: ["#5a2d14", "#f3d9a4"] },
];
// snack rack stock — each its own shape and size (meters); the rack lays them
// out in this order (see the snack center), and grabbing one hands you that item
const SNACK_PRODUCTS = [
  { name: "FRUIT POP", color: "#e76f51", shape: "bag", w: 0.17, h: 0.23, d: 0.07 },
  { name: "BLUE RAZZ", color: "#457b9d", shape: "bag", w: 0.14, h: 0.2, d: 0.06 },
  { name: "GRAPE ZAP", color: "#8e44ad", shape: "tube", w: 0.075, h: 0.21, d: 0.075 },
  { name: "LICORICE", color: "#b5172a", shape: "box", w: 0.055, h: 0.22, d: 0.03 },
  { name: "CHOC BOMB", color: "#6b3e26", shape: "box", w: 0.1, h: 0.14, d: 0.035 },
  { name: "RED HOTZ", color: "#e63946", shape: "box", w: 0.07, h: 0.1, d: 0.028 },
  { name: "STARBITES", color: "#f4a300", shape: "bar", w: 0.16, h: 0.045, d: 0.016 },
  { name: "MINT CHILL", color: "#2a9d8f", shape: "gum", w: 0.075, h: 0.028, d: 0.016 },
];
const ORDER = ["Comedy", "Action & Adventure", "Sci-Fi & Fantasy", "Horror", "Drama",
  "Family & Kids", "Holiday", "Music", "Animation", "Anime", "Kids & Educational",
  "Sitcoms", "Classic Sitcoms", "Drama & Adventure", "Horror & Anthology",
  "Sketch Comedy & Late Night", "Broadcast Blocks", "Reality TV"];

// ---------------- boot ----------------
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x1b2b4d, 24, 60);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 120);
camera.rotation.order = "YXZ";
const WX = { kind: "clear", k: 0, wet: 0, cover: 0, plan: null, said: null, wind: 0, gust: 0, fog: 0, clouds: 0 };   // the weather (see "weather"): what's falling, how hard (0..1), how wet the ground is, how much snow's lying
const EXTERIOR_LAYER = 2;                  // exterior meshes + moonlight live only here, so interior lights never touch them
camera.layers.enable(EXTERIOR_LAYER);      // camera still needs to see layer 2, just doesn't light it any differently
let carsOut = null;                        // the cars out front, for the golf ball to hit (see golfCars): wired up with the exterior
let parkLot = () => {}, passCar = () => {}, carNew = () => null, driveIn = () => null, driveOut = () => {};   // wired up with the exterior: the day's
// parked cars / one driving by / a customer's own car ({ s: style, c: color }) / bringing theirs in to park, and away again   // (day, busy) the lot's cars for the day / ({ dir, v, z, span }) one driving by: wired up with the exterior
let setExteriorDay;                        // (isDay) => ... — street lamps and lot lights on/off; wired up below, called from the time of day
let setSky = () => {};                     // (color) => ... — sky + backdrop
let exteriorTick = () => {};               // (dt) => ... — per-frame exterior animation (the lot lights warming up); wired up below
const renderer = new THREE.WebGLRenderer({ antialias: false });   // (the scene's drawn into the composers' targets, which aren't multisampled: canvas MSAA only ever touched the final copy)
renderer.debug.checkShaderErrors = !!navigator.webdriver;          // checking forces each new shader to finish compiling there and then (a hitch); on for the tests only
renderer.setSize(innerWidth, innerHeight);
const LOWMEM = document.documentElement.classList.contains("touch");   // phones / tablets (touch.js): iOS caps a page's canvas memory, so go lighter
renderer.setPixelRatio(Math.min(devicePixelRatio, LOWMEM ? 1.5 : 2));
document.body.appendChild(renderer.domElement);
// ---------------- TV light (shader side) ----------------
// The big screen lights the room as a 3x3 grid of colored patches (one per
// region of the picture), each with real cosine falloff at the screen and at
// the surface — so it reaches every wall and the ceiling, fading with
// distance, instead of a point light's few-feet bubble. Shadows come from a
// visibility volume baked once at startup against box proxies (see
// bakeTvVis): per voxel, how much of the screen's left/center/right third it
// can see. Patched into every Lambert/Phong material; the uniform objects
// are shared by reference, so one write per frame feeds every material.
const TH_COLS = 6, TH_ROWS = 4;   // the theater screen's light: the picture sampled as 6 x 4 patches (see the auditorium in ROOM_FRAG)
const TVU = {
  uTvGain: { value: 0 }, uTvAmb: { value: new THREE.Color(0) }, uTvCell: { value: 0 },
  uTvZoneP: { value: new Float32Array(27) }, uTvZoneC: { value: new Float32Array(27) },
  uTvVis: { value: null }, uTvVolMin: { value: new THREE.Vector3() }, uTvVolSize: { value: new THREE.Vector3(1, 1, 1) },
  uTvRoom: { value: new THREE.Vector4() },   // room x0, x1, ceiling, screen-plane z (front wall is z 0)
  // room lighting (see ROOM_FRAG): switchable zones, daylight through the glass, and the outdoors
  uZone: { value: new THREE.Vector4(1, 1, 1, 1) },   // front, aisles, lounge switches (0..1, flicker-aware), daylight 0..1
  uBoh: { value: new THREE.Vector4(1, 1, 1, 0) },    // hall, break room, restroom switches, the closet bulb
  uOffice: { value: 1 },                             // the manager's office switch
  uFloorBox: { value: new THREE.Vector4() },         // sales floor: x0, x1, z1 (back wall), ceiling
  uBohBox: { value: new THREE.Vector4() },           // back of house: x0, x1, hall|rooms z, z1
  uBohSplit: { value: new THREE.Vector3() },         // restroom | break room x, ceiling, the closet's wall across the hall
  uInSky: { value: new THREE.Color() }, uInGround: { value: new THREE.Color() }, uInAmb: { value: new THREE.Color() },
  uInDirC: { value: new THREE.Color() }, uInDir: { value: new THREE.Vector3() },   // one room's worth of fluorescents
  uSunSky: { value: new THREE.Color() }, uSunGround: { value: new THREE.Color() }, uSunC: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3() },
  uMoonSky: { value: new THREE.Color() }, uMoonGround: { value: new THREE.Color() }, uMoonC: { value: new THREE.Color() }, uMoonDir: { value: new THREE.Vector3() },
  uDayC: { value: new THREE.Color() }, uNightC: { value: new THREE.Color() },       // what comes in through the storefront glass by day / by night
  uFogC: { value: new THREE.Color() }, uFogD: { value: 0 }, uFogCam: { value: 0 },                          // fog outdoors (see wxSky): its color, and density per meter
  uThLight: { value: new THREE.Vector4(1, 1, 1, 1) },   // lobby switch, theater house-lights switch, the booth's, its stairs'
  uTall: { value: new THREE.Vector4(2.72, 6.0, 29.7, 0) },   // the tall block: the booth over the lobby from this high, its ceiling and the auditorium's, the booth from this z
  uShaft: { value: new THREE.Vector2(-0.55, 29.75) },   // the booth's stairwell, in the lobby's corner from here (x, z)
  uLobbyBox: { value: new THREE.Vector4() },         // movie lobby: x0, x1, z0, z1
  uThBox: { value: new THREE.Vector4() },            // auditorium: x0, x1, z0, z1
  uThScreenP: { value: new THREE.Vector3(-2.87, 1.05, 47.8) }, // theater screen center for live bounce
  uThSconce: { value: 1 },                           // auditorium wall sconces 0..1: up between films, fading out once one plays
  uThGain: { value: 0 },                             // the theater screen's light 0..1 (a tape in), its own: not washed out by the store's lights
  uThZoneC: { value: new Float32Array(TH_COLS * TH_ROWS * 3) },   // the picture as TH_COLS x TH_ROWS patches (linear, row by row from the top left), each its own light
  uThScreenS: { value: new THREE.Vector2(6.84, 4.56) },           // the screen's width, height
  uDeadL: { value: Array.from({ length: 3 }, () => new THREE.Vector4()) },   // the sales floor's burnt-out troffers: x, z, how dark (see TROFFER_GRID)
  // light spilling through doorways into a darker room next door (see spillTick), live ones first (uSpillN): per spill,
  // the light it comes from (xyz, inside the lit room) + reach past the door (w), its color x strength, the box it
  // lands in (x0, x1, z0, z1), and the door opening (plane: 0 z = const, 1 x = const; that const; center along it; half width); the color's w: a window's sill height
  uSpillN: { value: 0 },
  uSpillD: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) },
  uSpillP: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) },
  uSpillC: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) },
  uSpillB: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) },
};
// the sales floor's ceiling lights, a regular grid (see the troffers, with the theater): the first one's x, z, the spacing,
// how many across and along, their height. ROOM_FRAG lights the floor from them (the nearest 3 x 3), not as one even wash
const TROFFER_GRID = { x: -6.3, z: 3.15, step: 3.6, nx: 5, nz: 7, y: STORE.h - 0.02 };
const TROFFER_GLSL = `
float stairCone(vec3 F, vec3 P, vec3 N) {        // a shaded bulb: a cone straight down, soft at its edge, nothing above; the wall between the flights stops it
  vec3 D = P - F; float d2 = dot(D, D), wx = ${(SHAFT.split + 0.05).toFixed(2)};
  if ((F.x - wx) * (P.x - wx) < 0.0) { float t = (wx - F.x) / D.x; if (F.z + D.z * t < ${SHAFT.turn.toFixed(2)}) return 0.0; }
  vec3 L = -D * inversesqrt(d2);
  return smoothstep(0.42, 0.78, L.y) * (0.22 + 0.78 * max(dot(N, L), 0.0)) * 3.8 / (1.0 + 0.45 * d2);
}
float trofferLight(vec3 F, vec3 P) {             // one panel facing down, on the floor at P: its light out of the diffuser falling
  vec3 L = F - P; float d2 = dot(L, L); float c = (F.y - P.y) * inversesqrt(d2);   // off from straight under it (cos^6: a pool
  float e = c * c * c; return e * e * c / (d2 + 0.6);                              // under each, dimmer between)
}`;
// Room lighting, per fragment, by where it is (world space): no light objects,
// so it costs the same however many zones there are, and it stops dead at the
// walls — a switched-off break room is dark even with the store lit next door.
// The sales floor is three switch zones along z, blended over ~2 m where they
// meet; daylight falls in through the storefront glass and fades toward the
// back; outside the building it's sun, moon or somewhere in between
const ROOM_FRAG = `
{
  vec3 rN = inverseTransformDirection(normal, viewMatrix), P = vTvPos;
  vec3 fl = mix(uInGround, uInSky, 0.5 * rN.y + 0.5) + uInAmb + uInDirC * max(dot(rN, uInDir), 0.0);
  vec3 flS = mix(uInGround, uInSky, 0.3 * rN.y + 0.7) + uInAmb * 1.2 + uInDirC * (0.45 + 0.35 * dot(rN, uInDir));   // the same, as fluorescents and white walls give it: from everywhere, little of it from one way (all but the auditorium)
  float day = uZone.w;
  vec3 rl;
  // (the emergency exits' doors hang at the walls' outside faces, past the rooms' boxes: their insides, and the openings, are the room's. Out to the leaf's own outside plate)
  if (P.x > uFloorBox.x && (P.x < uFloorBox.y || (P.x < ${(STORE.x + 0.105).toFixed(3)} && P.z > ${STORE_EXIT.z0.toFixed(2)} && P.z < ${STORE_EXIT.z1.toFixed(2)})) && P.z > -0.05 && P.z < uFloorBox.z && P.y < uFloorBox.w) {
    float w1 = 1.0 - smoothstep(9.0, 11.0, P.z), w3 = smoothstep(18.0, 20.0, P.z), w2 = max(0.0, 1.0 - w1 - w3);
    float win = exp(-P.z / 9.0);
    float facing = 0.75 + 0.35 * max(-rN.z, 0.0) + 0.2 * max(rN.y, 0.0);
    vec2 tg = floor((P.xz - vec2(${TROFFER_GRID.x.toFixed(2)}, ${TROFFER_GRID.z.toFixed(2)})) / ${TROFFER_GRID.step.toFixed(2)} + 0.5);
    float pool = 0.0;
    for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) {   // the nearest fixtures (two away: under 1% of one overhead)
      vec2 c = tg + vec2(float(i), float(j));
      if (c.x < 0.0 || c.y < 0.0 || c.x > ${(TROFFER_GRID.nx - 1).toFixed(1)} || c.y > ${(TROFFER_GRID.nz - 1).toFixed(1)}) continue;
      pool += trofferLight(vec3(${TROFFER_GRID.x.toFixed(2)} + c.x * ${TROFFER_GRID.step.toFixed(2)}, ${TROFFER_GRID.y.toFixed(2)}, ${TROFFER_GRID.z.toFixed(2)} + c.y * ${TROFFER_GRID.step.toFixed(2)}), vec3(P.x, 0.0, P.z));
    }
    for (int k = 0; k < 3; k++) if (uDeadL[k].z > 0.0) pool -= uDeadL[k].z * trofferLight(vec3(uDeadL[k].x, ${TROFFER_GRID.y.toFixed(2)}, uDeadL[k].y), vec3(P.x, 0.0, P.z));
    pool = mix(1.0, max(pool, 0.0) * 14.0, 0.6);   // the light on the floor there: ~1.15 under a panel, ~0.8 between four
    float up = max(rN.y, 0.0), down = max(-rN.y, 0.0);
    float side = mix(0.8, 1.06, smoothstep(0.05, 2.9, P.y)) * (0.9 + 0.1 * pool);   // walls and shelf faces: brighter up toward the panels, dim at the foot
    float lit = mix(mix(side, pool, up), 0.88, down);   // (the ceiling's tiles between the panels: a little dimmer)
    float edge = min(min(P.x - uFloorBox.x, uFloorBox.y - P.x), uFloorBox.z - P.z);
    lit *= 1.0 - 0.15 * (1.0 - smoothstep(0.0, 1.0, edge)) * up;                       // the floor along the walls, in their shade
    rl = (uZone.x * w1 + uZone.y * w2 + uZone.z * w3) * flS * lit
       + (day * uDayC + (1.0 - day) * uNightC) * (0.42 + 0.9 * win) * facing;
  } else if (P.x > uBohBox.x && P.x < uBohBox.y && P.z >= uFloorBox.z && P.z < uBohBox.w && P.y < uBohSplit.y + 0.05) {
    bool closet = P.x > uBohSplit.z && P.z < uBohBox.z;   // the janitor's closet: one bare bulb (uBoh.w), warm
    bool office = P.x > uBohSplit.x && P.z > ${BOH.officeZ.toFixed(2)};   // the manager's office: a yellowed old fixture
    float lvl = closet ? 0.8 * uBoh.w : office ? 0.86 * uOffice : P.z < uBohBox.z ? uBoh.x : (P.x < uBohSplit.x ? uBoh.z : uBoh.y);
    rl = (0.03 + 0.97 * lvl) * flS * (closet ? vec3(1.12, 0.95, 0.74) : office ? vec3(1.1, 0.97, 0.78) : vec3(1.0));
  } else if (P.x > uShaft.x && P.x < uLobbyBox.y && P.z > uShaft.y && P.z < uLobbyBox.w && P.y < uTall.y + 0.05) {   // the booth's stairs: bulbs on cords, warm. Cones down from their shades; above them, only what bounces back up
    float over = P.x > ${(SHAFT.split + 0.05).toFixed(2)} && P.z < ${SHAFT.turn.toFixed(2)} ? ${STAIR_BULBS[0][1].toFixed(2)} : ${STAIR_BULBS[1][1].toFixed(2)};
    float bounce = mix(0.17, 0.07, smoothstep(over - 0.2, over + 0.5, P.y)) + 0.14 * max(-rN.y, 0.0);   // (a ceiling gets the most of what comes back up)
    float cones = stairCone(vec3(${STAIR_BULBS[0].map(v => v.toFixed(2)).join(", ")}), P, rN) + stairCone(vec3(${STAIR_BULBS[1].map(v => v.toFixed(2)).join(", ")}), P, rN);
    rl = (0.03 + 0.97 * uThLight.w * (bounce + cones)) * flS * mix(vec3(1.12, 0.95, 0.74), vec3(1.3, 0.96, 0.62), min(cones, 1.0));
  } else if (P.x > uLobbyBox.x && P.x < uLobbyBox.y && P.z >= uTall.z && P.z < uLobbyBox.w && P.y > uTall.x && P.y < uTall.y + 0.05) {   // the booth: lamps low on its walls, red working lights when they're off
    rl = (0.03 + 0.97 * uThLight.z) * flS * vec3(1.12, 0.95, 0.74) + (1.0 - uThLight.z) * flS * vec3(0.16, 0.012, 0.0);
  } else if (P.x > uLobbyBox.x && P.x < uLobbyBox.y && P.z >= uLobbyBox.z && P.z < uLobbyBox.w && P.y < uBohSplit.y + 0.05) {
    rl = (0.04 + 0.96 * uThLight.x) * flS * vec3(1.08, 0.93, 0.80);
  } else if ((P.x > uThBox.x || (P.x > ${(WALL_L - 0.22).toFixed(3)} && P.z > ${FIRE_EXIT.z0.toFixed(2)} && P.z < ${FIRE_EXIT.z1.toFixed(2)})) && P.x < uThBox.y && P.z >= uThBox.z && P.z < uThBox.w && P.y < uTall.y + 0.1) {
    float film = 1.0 - uThSconce;                  // a film running: the house goes down, even with its switch left on
    vec3 thFl = (mix(0.025, 0.006, film) + 0.30 * uThLight.y * mix(1.0, 0.12, film) + 0.12 * uThSconce) * fl * vec3(1.15, 0.82, 0.55);   // house lights + a low warm sconce wash
    vec3 scr = vec3(0.0), avg = vec3(0.0);         // the screen as ${TH_COLS * TH_ROWS} patches of the picture, each lighting the room from where it is on the screen
    for (int k = 0; k < ${TH_COLS * TH_ROWS}; k++) {
      float c = float(k % ${TH_COLS}), r = float(k / ${TH_COLS});   // (the screen faces -z: the picture's left is +x)
      vec3 L = uThScreenP + vec3(uThScreenS.x * (0.5 - (c + 0.5) / ${TH_COLS}.0), uThScreenS.y * (0.5 - (r + 0.5) / ${TH_ROWS}.0), 0.0) - P;
      float d2 = dot(L, L); L *= inversesqrt(d2);
      scr += uThZoneC[k] * max(L.z, 0.0) * (0.3 + 0.7 * max(dot(rN, L), 0.0)) / (1.0 + 0.03 * d2);   // (0.3: light off the seats and walls, wrapping round)
      avg += uThZoneC[k];
    }
    vec3 sC = P - uThScreenP;                      // and what bounces round the room: the whole picture's colour, everywhere, a little less far back
    rl = thFl + uThGain * (scr * ${(14 / (TH_COLS * TH_ROWS)).toFixed(4)} + avg * ${(2.2 / (TH_COLS * TH_ROWS)).toFixed(4)} / (1.0 + 0.012 * dot(sC, sC)));
  } else {
    vec3 sun = mix(uSunGround, uSunSky, 0.5 * rN.y + 0.5) + uSunC * max(dot(rN, uSunDir), 0.0);
    vec3 moon = mix(uMoonGround, uMoonSky, 0.5 * rN.y + 0.5) + uMoonC * max(dot(rN, uMoonDir), 0.0);
    rl = mix(moon, sun, day); tvOut = 1.0;
  }
  vec3 spill = vec3(0.0);                          // a lit room's light through its doorway, shaped by the opening, fading into the dark one
  for (int i = 0; i < 8; i++) {
    if (i >= uSpillN) break;                       // (all lit, nothing spills: no cost)
    vec4 sb = uSpillB[i];
    if (P.x < sb.x || P.x > sb.y || P.z < sb.z || P.z > sb.w) continue;
    vec4 sp = uSpillP[i], dd = uSpillD[i];
    bool xPl = dd.x > 0.5;
    float sA = xPl ? sp.x : sp.z, t = (dd.y - sA) / ((xPl ? P.x : P.z) - sA);
    if (t <= 0.0 || t >= 1.0) continue;
    vec3 Q = sp.xyz + (P - sp.xyz) * t;            // where the light's path crosses the doorway's plane
    float past = length(P - Q), soft = 0.025 + 0.035 * past;
    float sill = uSpillC[i].w, edge = max(abs((xPl ? Q.z : Q.x) - dd.z) - dd.w, max(sill - Q.y, Q.y - (sill > 0.0 ? ${OFFICE_WIN.head.toFixed(2)} : ${DOOR_H.toFixed(2)})));   // (w: a window's sill, 0 for a doorway)
    float k = clamp(1.0 - past / sp.w, 0.0, 1.0);
    spill += uSpillC[i].rgb * (1.0 - smoothstep(-soft, soft, edge)) * k * k * (0.35 + 0.65 * max(dot(rN, normalize(sp.xyz - P)), 0.0));
  }
  rl = max(rl, spill * flS);
  reflectedLight.indirectDiffuse += rl * BRDF_Lambert(diffuseColor.rgb);
}
`;
const TV_FRAG = `
if (uTvGain > 0.0 && vTvPos.x > uTvRoom.x && vTvPos.x < uTvRoom.y && vTvPos.y < uTvRoom.z && vTvPos.z > 0.0 && vTvPos.z < uTvRoom.w) {
  vec3 tvN = inverseTransformDirection(normal, viewMatrix);
  vec3 tvUvw = (vTvPos + tvN * uTvCell - uTvVolMin) / uTvVolSize;   // nudged off the surface so it doesn't read its own voxel
  vec3 tvV = all(greaterThan(tvUvw, vec3(0.0))) && all(lessThan(tvUvw, vec3(1.0))) ? texture(uTvVis, tvUvw).rgb : vec3(1.0);
  vec3 tvE = vec3(0.0);
  for (int k = 0; k < 9; k++) {
    vec3 L = uTvZoneP[k] - vTvPos; float d2 = dot(L, L); L *= inversesqrt(d2);
    // screen faces -z, so L.z is the emitter-side cosine; +0.1 softens the patch up close
    tvE += uTvZoneC[k] * (tvV[k % 3] * max(L.z, 0.0) * max(dot(tvN, L), 0.0) / (d2 + 0.1));
  }
  vec3 tvC = vTvPos - uTvZoneP[4];   // fake bounce: a dim screen-tinted fill so shadows aren't pitch black
  reflectedLight.directDiffuse += (uTvGain * tvE + uTvAmb / (1.0 + 0.04 * dot(tvC, tvC))) * BRDF_Lambert(diffuseColor.rgb);
}`;
for (const M of [THREE.MeshLambertMaterial, THREE.MeshPhongMaterial]) M.prototype.onBeforeCompile = shader => {
  Object.assign(shader.uniforms, TVU);
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vTvPos;")
    .replace("#include <project_vertex>", `#include <project_vertex>
      vec4 tvWp = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        tvWp = instanceMatrix * tvWp;
      #endif
      vTvPos = (modelMatrix * tvWp).xyz;`);
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", `#include <common>
      uniform float uTvGain, uTvCell; uniform vec3 uTvAmb, uTvVolMin, uTvVolSize; uniform vec4 uTvRoom;
      uniform vec3 uTvZoneP[9], uTvZoneC[9]; uniform highp sampler3D uTvVis; varying vec3 vTvPos;
      uniform vec4 uZone, uBoh, uFloorBox, uBohBox, uLobbyBox, uThBox; uniform vec3 uBohSplit; uniform vec4 uThLight, uTall; uniform vec2 uShaft; uniform vec4 uDeadL[3]; uniform vec3 uThScreenP; uniform float uThSconce, uOffice, uThGain; uniform vec3 uThZoneC[${TH_COLS * TH_ROWS}]; uniform vec2 uThScreenS;
      uniform vec4 uSpillP[8], uSpillC[8], uSpillB[8], uSpillD[8]; uniform int uSpillN;
      uniform vec3 uInSky, uInGround, uInAmb, uInDirC, uInDir, uSunSky, uSunGround, uSunC, uSunDir, uMoonSky, uMoonGround, uMoonC, uMoonDir, uDayC, uNightC, uFogC; uniform float uFogD, uFogCam;`)
    .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\nfloat tvOut = 0.0;\n" + ROOM_FRAG + TV_FRAG)
    .replace("void main() {", TROFFER_GLSL + "\nvoid main() {")
    .replace("#include <fog_fragment>", `#include <fog_fragment>
      if ((tvOut > 0.5 || uFogCam > 0.5) && uFogD > 0.0) gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogC, 1.0 - exp(-length(vTvPos - cameraPosition) * uFogD));   // outdoors only: the fog's out there`);
};

// the fog on what isn't lit by the room shader: signs, lenses, glass (Tony's shader does the same: tonys/light.js). uFogCam: you're out in it, so it's between you and everything, indoors through a window too; from indoors, only what's out there
const FOG_OUT_GLSL = `bool fogOut(vec3 P) { bool store = ((P.x > -7.85 && P.x < 11.3 && P.z > -0.3 && P.z < 35.2) || (P.x > -7.85 && P.x < 2.2 && P.z > 35.0 && P.z < 48.7)) && P.y < 7.0, tony = P.x > 13.0 && P.x < 21.0 && P.z > 0.0 && P.z < 14.0 && P.y < 4.4; return !store && !tony; }`;
THREE.MeshBasicMaterial.prototype.onBeforeCompile = function (sh) {
  if (this.fog === false) return;                 // (the few that are meant to stand clear of it)
  Object.assign(sh.uniforms, { uFogC: TVU.uFogC, uFogD: TVU.uFogD, uFogCam: TVU.uFogCam });
  sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vFogP;").replace("#include <project_vertex>", `#include <project_vertex>
    { vec4 fw = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
      fw = instanceMatrix * fw;
      #endif
      vFogP = (modelMatrix * fw).xyz; }`);
  const add = this.blending === THREE.AdditiveBlending;
  sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\nvarying vec3 vFogP; uniform vec3 uFogC; uniform float uFogD, uFogCam;\n${FOG_OUT_GLSL}`).replace("#include <fog_fragment>", `#include <fog_fragment>
    if (uFogD > 0.0 && (uFogCam > 0.5 || fogOut(vFogP))) { float ff = 1.0 - exp(-length(vFogP - cameraPosition) * uFogD);
      ${add ? "gl_FragColor.rgb *= 1.0 - ff;" : "gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogC, ff); gl_FragColor.a = mix(gl_FragColor.a, 1.0, ff * smoothstep(0.0, 0.02, gl_FragColor.a));"} }`);
};
THREE.MeshBasicMaterial.prototype.customProgramCacheKey = function () { return `fogB${this.fog === false ? 0 : 1}${this.blending === THREE.AdditiveBlending ? 1 : 0}`; };

// ---- what walls are made of. A surface's look, worked out where it is in the world (merged boxes have no texture coordinates to
// speak of): one tiling noise picture made here at load, read twice a pixel, no image files. R: broad mottling, G: fine grain, B: long
// streaks, A: pits and flecks. wallSurface(material, kind) gives a material one of the kinds below; the painted kind goes by room ----
const wallNoise = (() => {
  const N = LOWMEM ? 256 : 512, data = new Uint8Array(N * N * 4);
  const layer = (cx, cy) => {                    // value noise that tiles: cx by cy cells over the picture
    const g = new Float32Array(cx * cy); for (let i = 0; i < g.length; i++) g[i] = Math.random();
    return (u, v) => { const x = u * cx, y = v * cy, i = Math.floor(x), j = Math.floor(y); let fx = x - i, fy = y - j; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      const at = (a, b) => g[(b % cy) * cx + (a % cx)]; const a0 = at(i, j), a1 = at(i + 1, j), b0 = at(i, j + 1), b1 = at(i + 1, j + 1); return (a0 + (a1 - a0) * fx) * (1 - fy) + (b0 + (b1 - b0) * fx) * fy; };
  };
  const m = [layer(4, 4), layer(9, 9), layer(21, 21), layer(47, 47)], fine = [layer(96, 96), layer(190, 190)], st = [layer(70, 5), layer(150, 9)], pit = [layer(60, 60), layer(120, 120)];
  for (let y = 0, p = 0; y < N; y++) for (let x = 0; x < N; x++, p += 4) {
    const u = x / N, v = y / N;
    data[p] = 255 * (0.42 * m[0](u, v) + 0.28 * m[1](u, v) + 0.2 * m[2](u, v) + 0.1 * m[3](u, v));
    data[p + 1] = 255 * (0.55 * fine[0](u, v) + 0.45 * fine[1](u, v));
    data[p + 2] = 255 * (0.62 * st[0](u, v) + 0.38 * st[1](u, v));
    data[p + 3] = 255 * (0.6 * pit[0](u, v) + 0.4 * pit[1](u, v));
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true;
  return t;
})();
const f2 = v => v.toFixed(2);
const WALL_KINDS = {
  // drywall by the room it's in. Out where people are: sanded smooth, satin paint, the finest of grain, a soft sheen. The restrooms and
  // the break room: cleanable gloss, a slight orange peel, the ceiling light's highlight sliding over it as you walk. The closet: never painted
  paint: `
    vec3 tint = vec3(1.0); float grain = 0.016, peel = 0.012, gloss = 0.05, tight = 10.0, lvl = max(uZone.x, max(uZone.y, uZone.z)), mud = 0.0;
    if (P.z > ${f2(STORE.z)} && P.x > ${f2(BOH.x0)}) {
      if (P.z < ${f2(BOH.hallZ)}) {
        lvl = uBoh.x;
        if (P.x > ${f2(CLOSET.x0)}) { tint = vec3(0.8, 0.79, 0.74); grain = 0.05; peel = 0.03; gloss = 0.0; mud = 1.0; lvl = uBoh.w; }
        else tint = vec3(0.98, 0.95, 0.88);       // the hall: an old off-white, satin all the same
      }
      else if (P.x > ${f2(BOH.splitX)} && P.z > ${f2(BOH.officeZ)}) {   // the manager's office: 4x8 sheets of walnut-look paneling, the grooves at random spacing like the real stuff, years of cigarettes darkening it toward the ceiling
        float sheet = floor(u / 1.22), su = fract(u / 1.22) * 12.0, id = floor(su), fu = fract(su), r = fract(sin((id + sheet * 13.0) * 91.7) * 43758.5);
        float g = texture2D(uWallTex, vec2(u / 0.9 + id * 0.37, P.y / 7.0 + sheet * 0.61)).b, g2 = texture2D(uWallTex, vec2(u / 0.21 + id * 0.13, P.y / 4.0)).b;
        tint = vec3(0.3, 0.165, 0.08) * (0.72 + 0.26 * r) * (0.62 + 0.55 * g + 0.3 * g2);
        tint *= mix(1.0, 0.72, smoothstep(1.5, 2.7, P.y)) * (0.9 + 0.1 * smoothstep(0.0, 0.5, P.y));
        if (r > 0.5 || id < 0.5) tint *= 0.38 + 0.62 * smoothstep(0.0, 0.07, min(fu, 1.0 - fu));   // the V-grooves (every sheet's edge, and a few between)
        grain = 0.02; peel = 0.0; gloss = 0.012; tight = 22.0; lvl = uOffice;
      }
      else if (P.x > ${f2(BOH.splitX)}) { tint = P.y < 1.2 ? vec3(0.68, 0.74, 0.63) : vec3(0.97, 0.93, 0.82); if (abs(P.y - 1.2) < 0.012) tint *= 0.55; grain = 0.012; peel = 0.05; gloss = 0.3; tight = 46.0; lvl = uBoh.y; }   // the break room: sage to the rail, cream over it, in gloss
      else { tint = vec3(0.86, 0.9, 0.93); grain = 0.012; peel = 0.05; gloss = 0.34; tight = 46.0; lvl = uBoh.z; }   // the restrooms: a pale blue-grey, in gloss
    }
    float sh = 1.0 + grain * (nB.g - 0.5) * 2.0;
    if (mud > 0.5) { float j = abs(fract(u / 1.22 + 0.5) - 0.5) * 1.22; sh += (nA.r - 0.5) * 0.14; sh += 0.1 * (1.0 - smoothstep(0.05, 0.14, j)) * (0.6 + nA.g * 0.6); }   // (taped joints, mudded, not sanded)
    sh *= mix(0.93, 1.0, smoothstep(0.0, 0.16, P.y));                    // only just darker where it meets the floor
    diffuseColor.rgb *= tint * sh; bend = (texture2D(uWallTex, wuv / 0.17).rg - 0.5) * peel * 2.0;
    { vec3 V = normalize(P - cameraPosition), Nb = normalize(wN + (onX ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0)) * bend.x + vec3(0.0, bend.y, 0.0)), Rf = reflect(V, Nb);
      totalEmissiveRadiance += vec3(1.0, 0.98, 0.94) * gloss * lvl * pow(max(Rf.y, 0.0), tight); }`,
  // the stairwell: cast concrete, flat, speckled light and dark; the faint lines of its pours, nothing raised
  concrete: `
    float sh = 1.0 + (nA.r - 0.5) * 0.08;
    float dark = smoothstep(0.66, 0.71, texture2D(uWallTex, wuv / 0.31).a), pale = smoothstep(0.67, 0.72, 1.0 - texture2D(uWallTex, wuv / 0.23 + 0.37).a), fine = texture2D(uWallTex, wuv / 0.13).g;
    sh *= 1.0 - 0.22 * dark; sh *= 1.0 + 0.2 * pale; sh *= 0.96 + 0.08 * fine;
    float lift = abs(fract(P.y / 1.2 + 0.5) - 0.5) * 1.2; sh *= 1.0 - 0.06 * (1.0 - smoothstep(0.0, 0.008, lift));
    diffuseColor.rgb *= sh;`,
  // brick, running bond: each its own shade, the mortar set back
  brick: `
    float bH = 0.075, row = floor(P.y / bH), bx = u / 0.225 + 0.5 * mod(row, 2.0), fx = fract(bx), fy = fract(P.y / bH), t = texture2D(uWallTex, vec2(floor(bx) * 0.137, row * 0.211)).r;
    float m = max(1.0 - smoothstep(0.0, 0.05, fx) * smoothstep(1.0, 0.95, fx), 1.0 - smoothstep(0.0, 0.14, fy) * smoothstep(1.0, 0.86, fy));
    float far = clamp(fwidth(P.y / bH) * 2.5 - 0.5, 0.0, 1.0); m = mix(m, 0.26, far); t = mix(t, 0.5, far);   // (far off: an average, or they beat against the pixels in curved bands)
    diffuseColor.rgb = mix(diffuseColor.rgb * (0.6 + 0.8 * t) * (0.85 + 0.3 * nB.g), vec3(0.3, 0.28, 0.25) * (0.8 + 0.4 * nB.g), m); bend = vec2(nB.g - 0.5, (1.0 - fy) * m * 0.8);`,
  // sprayed stucco outside: coarse, pitted, clean but for the odd stretch where the coping's let water by
  stucco: `
    float sh = 1.0 + (nB.g - 0.5) * 0.3 + (nB.a - 0.5) * 0.22 + (nA.r - 0.5) * 0.16;
    float cell = floor(u / 7.0), stain = step(0.74, fract(sin(cell * 12.9898 + 4.1) * 43758.5453)) * (1.0 - smoothstep(0.1, 0.22, abs(fract(u / 7.0) - 0.5)));
    sh *= 1.0 - 0.3 * stain * (0.35 + 0.65 * smoothstep(0.4, 0.66, texture2D(uWallTex, vec2(u / 1.6, P.y / 16.0)).b)) * smoothstep(1.3, 3.6, P.y);
    diffuseColor.rgb *= sh; bend = vec2(nB.g - 0.5, nB.a - 0.5) * 0.6;`,
  // the auditorium: heavy acoustic cloth, a fine weave, long soft folds
  fabric: `
    float sh = 1.0 + (nB.g - 0.5) * 0.3 + (nA.b - 0.5) * 0.3 + 0.1 * sin(u * 7.0 + nA.r * 3.0);
    diffuseColor.rgb *= sh; bend = vec2(0.16 * cos(u * 7.0 + nA.r * 3.0), 0.0) + (nB.rg - 0.5) * 0.12;`,
  // the lobby's wallpaper: a deco diamond and fan, tone on tone
  damask: `
    vec2 q = fract(vec2(u, P.y) / 0.46) - 0.5, q2 = fract(vec2(u, P.y) / 0.46) - vec2(0.0); float d = abs(q.x) + abs(q.y), d2 = min(min(abs(q2.x) + abs(q2.y), abs(q2.x - 1.0) + abs(q2.y)), min(abs(q2.x) + abs(q2.y - 1.0), abs(q2.x - 1.0) + abs(q2.y - 1.0)));
    float line = 1.0 - smoothstep(0.012, 0.024, abs(d - 0.36)), core = 1.0 - smoothstep(0.1, 0.13, d), dot2 = 1.0 - smoothstep(0.05, 0.075, d2);
    diffuseColor.rgb *= (1.0 + 0.3 * line + 0.34 * core + 0.3 * dot2) * (0.94 + 0.12 * nA.r) * (0.96 + 0.08 * nB.g); bend = (nB.rg - 0.5) * 0.06;`,
  // walnut, in vertical boards: grain running with them, a dark groove between
  wood: `
    float w = 0.24, id = floor(u / w), fu = fract(u / w), g = texture2D(uWallTex, vec2(u / 0.8 + id * 0.37, P.y / 9.0 + id * 0.61)).b, g2 = texture2D(uWallTex, vec2(u / 0.27 + id * 0.13, P.y / 5.0)).b;
    float sh = (0.8 + 0.2 * fract(sin(id * 91.7) * 43758.5)) * (0.72 + 0.42 * g + 0.2 * g2);
    sh *= 0.45 + 0.55 * smoothstep(0.0, 0.02, min(fu, 1.0 - fu));
    diffuseColor.rgb *= sh; bend = vec2((g - 0.5) * 0.24, 0.0);`,
};
const wallBaseCompile = THREE.MeshLambertMaterial.prototype.onBeforeCompile;   // (the room's lighting: it has to run first, or it renders black)
function wallSurface(m, kind) {
  m.onBeforeCompile = function (shader) {
    wallBaseCompile.call(this, shader);
    shader.uniforms.uWallTex = { value: wallNoise };
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D uWallTex;").replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      { vec3 P = vTvPos, wN = inverseTransformDirection(normal, viewMatrix), aN = abs(wN); bool onX = aN.x > aN.z;
        float u = aN.y > 0.5 ? P.x + P.z * 0.31 : onX ? P.z : P.x; vec2 wuv = aN.y > 0.5 ? P.xz : vec2(u, P.y);
        vec4 nA = texture2D(uWallTex, wuv / 2.56), nB = texture2D(uWallTex, wuv / 0.64); vec2 bend = vec2(0.0);
        ${WALL_KINDS[kind]}
        vec3 U = onX ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
        normal = normalize((viewMatrix * vec4(wN + U * bend.x + vec3(0.0, 1.0, 0.0) * bend.y, 0.0)).xyz); }`);
  };
  m.customProgramCacheKey = () => `wall-${kind}`;
  return m;
}
const canvas = renderer.domElement;
const $ = id => document.getElementById(id);

// ---------------- selective bloom ----------------
// Only things explicitly marked with BLOOM_LAYER actually glow (CRT/TV
// screens, marquee bulbs, lamp shades) — genre signs, endcap tags and other
// unlit signage stay off this layer, so they never bloom no matter how bright
// their flat color is. The scene's drawn once (mainRT, keeping its depth); then
// just the glowing things are drawn again into glowRT, which shares that depth,
// so anything in front of a glow still hides it without being drawn a second
// time (~100 draws instead of ~3,000); that's blurred and added on top
const BLOOM_LAYER = 1;
const bloomLayer = new THREE.Layers(); bloomLayer.set(BLOOM_LAYER);
function glow(obj) { obj.layers.enable(BLOOM_LAYER); return obj; }   // mark a mesh as a real light source
// The glow pass tests against the main pass's depth, and with smooth edges on that depth is multisampled and resolved,
// so on a surface turned from the camera a second draw of the same thing passes in some pixels and fails in others:
// hard blocks of glow. A material listed here is pulled forward a hair for that draw, so all of it passes; with
// emitOnly, only its own light goes into the glow (times gain), not the whole lit surface again, which would blow it out
const glowDraws = [];
function glowDraw(mat, { emitOnly = false, gain = 1 } = {}) { glowDraws.push({ mat, emitOnly, gain, color: new THREE.Color(), emit: 0 }); return mat; }
function glowDrawsBegin() {
  for (const d of glowDraws) {
    d.mat.polygonOffset = true; d.mat.polygonOffsetFactor = d.mat.polygonOffsetUnits = -1;
    if (d.emitOnly) { d.color.copy(d.mat.color); d.mat.color.setRGB(0, 0, 0); d.emit = d.mat.emissiveIntensity; d.mat.emissiveIntensity *= d.gain; }
  }
}
function glowDrawsEnd() {
  for (const d of glowDraws) {
    d.mat.polygonOffset = false;
    if (d.emitOnly) { d.mat.color.copy(d.color); d.mat.emissiveIntensity = d.emit; }
  }
}

const rtSize = () => [Math.round(innerWidth * renderer.getPixelRatio()), Math.round(innerHeight * renderer.getPixelRatio())];
const mainRT = new THREE.WebGLRenderTarget(...rtSize(), { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(...rtSize()) });
const glowRT = new THREE.WebGLRenderTarget(...rtSize(), { type: THREE.HalfFloatType, depthTexture: mainRT.depthTexture });
const mixRT = new THREE.WebGLRenderTarget(...rtSize(), { type: THREE.HalfFloatType, depthBuffer: false });
// subtle by default (lights on) — applyLighting() turns it up a bit for the dark. Its blur runs at half resolution
const bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.28, 0.3, 0.4);
const mixPass = new ShaderPass(new THREE.ShaderMaterial({
  uniforms: { baseTexture: { value: null }, bloomTexture: { value: glowRT.texture } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
  fragmentShader: `varying vec2 vUv; uniform sampler2D baseTexture; uniform sampler2D bloomTexture;
    void main(){ gl_FragColor = texture2D(baseTexture, vUv) + vec4(1.0) * texture2D(bloomTexture, vUv); }`,
}), "baseTexture");
const outputPass = new OutputPass(); outputPass.renderToScreen = true;
function bloomResize() {
  const [w, h] = rtSize(); for (const rt of [mainRT, glowRT, mixRT]) rt.setSize(w, h);
  bloomPass.setSize(w / 2, h / 2);
}
bloomResize();
// A change in how many lights there are recompiles every lit material, mid-frame: seconds of frozen game, each new count.
// So the number never changes. The game's point lights (the lamps, the TV's, the ceiling CRTs', ...) are never drawn with
// themselves: each frame the LIGHT_SLOTS nearest that are on are copied into a fixed set of real lights, which fade across
// when one's taken over. The lot's spots simply stay in the scene, dark by day
const LIGHT_SLOTS = 6, LIGHT_FADE = 0.2;
const lightSlots = Array.from({ length: LIGHT_SLOTS }, () => { const l = new THREE.PointLight(0xffffff, 0, 1, 2); l.layers.enableAll(); l.userData.slot = { src: null, k: 0 }; scene.add(l); return l; });
let sceneLights = null, lightGather = 0;
const lightPos = new THREE.Vector3(), lightWant = [];
function lightsTick(dt) {
  if (!sceneLights || ++lightGather % 120 === 0) {   // re-gathered now and then: some lights arrive after startup
    sceneLights = []; scene.traverse(o => {
      if (!o.isLight || o.userData.slot) return;
      o.layers.enable(BLOOM_LAYER);              // (the glow pass sees the same lights as the main one: otherwise three re-checks every lit glow's shader, twice a frame)
      if (o.isPointLight) { o.visible = false; sceneLights.push(o); }
    });
  }
  lightWant.length = 0;                          // the nearest that are on (by how far their reach falls short of the camera)
  for (const l of sceneLights) if (l.intensity > 0 && l.layers.test(camera.layers)) {
    l.userData.reach = lightPos.setFromMatrixPosition(l.matrixWorld).distanceTo(camera.position) - (l.distance || 20) * 0.5;
    lightWant.push(l);
  }
  lightWant.sort((a, b) => a.userData.reach - b.userData.reach); if (lightWant.length > LIGHT_SLOTS) lightWant.length = LIGHT_SLOTS;
  for (const s of lightSlots) {                  // a slot lets go of a light that's off, or that's faded out for a nearer one
    const u = s.userData.slot; if (!u.src) continue;
    if (u.src.intensity <= 0) { u.src = null; u.k = 0; }
    else if (!lightWant.includes(u.src) && (u.k -= dt / LIGHT_FADE) <= 0) { u.src = null; u.k = 0; }
  }
  for (const l of lightWant) if (!lightSlots.some(s => s.userData.slot.src === l)) { const s = lightSlots.find(s => !s.userData.slot.src); if (s) s.userData.slot.src = l; }
  for (const s of lightSlots) {
    const u = s.userData.slot, l = u.src;
    if (!l) { s.intensity = 0; continue; }
    if (lightWant.includes(l)) u.k = Math.min(1, u.k + dt / LIGHT_FADE);
    s.color.copy(l.color); s.distance = l.distance; s.decay = l.decay; s.intensity = l.intensity * u.k;
    s.position.setFromMatrixPosition(l.matrixWorld); s.updateMatrixWorld();
  }
}
scene.matrixWorldAutoUpdate = false;              // world matrices: worked out once a frame here, not again by each pass
const clearWas = new THREE.Color();
function renderWithBloom() {
  scene.updateMatrixWorld();
  renderer.setRenderTarget(mainRT); renderer.render(scene, camera);
  // the glow: just the glowing things, over a clear (black) target that keeps mainRT's depth. (A color
  // background makes three clear the depth too, so the sky's out of this pass)
  const bg = scene.background, mask = camera.layers.mask, alpha = renderer.getClearAlpha(); renderer.getClearColor(clearWas);
  scene.background = null; camera.layers.set(BLOOM_LAYER); renderer.autoClear = false;
  renderer.setRenderTarget(glowRT); renderer.setClearColor(0x000000, 0); renderer.clear(true, false, false);
  glowDrawsBegin();
  renderer.render(scene, camera);
  glowDrawsEnd();
  renderer.autoClear = true; camera.layers.mask = mask; scene.background = bg; renderer.setClearColor(clearWas, alpha);
  bloomPass.render(renderer, null, glowRT, 0, false);   // blurred, and added back onto glowRT
  mixPass.render(renderer, mixRT, mainRT);               // the scene + the glow
  outputPass.render(renderer, null, mixRT);              // tone mapping, sRGB, to the screen
}

const catalog = window.STORE_CATALOG || [];
// the saved store from last visit (see "save / restore" near the end) — read
// up front because the shelves need it while they're being stocked
// three save slots; slot 1 keeps the original key (so a store saved before slots is slot 1). The
// active one is remembered; switching slots (or starting a new store in one) reloads the page into it
const SLOTS = 3, slotKey = n => n === 1 ? "jellybuster-save" : `jellybuster-save-${n}`;
const SLOT = (() => { try { const n = +localStorage.getItem("jellybuster-slot"); return n >= 1 && n <= SLOTS ? n : 1; } catch { return 1; } })();
const SAVE_KEY = slotKey(SLOT);
// settings (per browser, not per store): see the title menu's SETTINGS
const SETTINGS = { sound: 100, sens: 100, invertY: false, shiftMin: 21, aa: !LOWMEM, ...(() => { try { return JSON.parse(localStorage.getItem("jellybuster-settings")) || {}; } catch { return {}; } })() };
const SAVE_V = 3;                            // v1 keyed tapes by id (every season of a show shares it); v2 by catalog position (shifts when tapes are added)
// a guest (see store/together.js): joined somebody else's game, so a customer in a store of the moment that's never saved. { who: the host, offer: till it's been answered }
const GUEST = (() => { try { return JSON.parse(sessionStorage.getItem("jellybuster-guest")); } catch { return null; } })();
const SAVE = GUEST ? { v: SAVE_V, mode: "customer", fresh: true } : (() => { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return s?.v === SAVE_V ? s : null; } catch { return null; } })();
{                                            // a store saved before the game was set in 1996: move its calendar (and every date it kept) back to Sept 30 1996
  const DAY1 = +new Date(1996, 8, 30, 12), d0 = SAVE?.shift?.date0;
  if (d0 > +new Date(2000, 0, 1)) {
    const dt = DAY1 - d0, mv = v => typeof v === "number" && v > 0 ? v + dt : v;
    SAVE.shift.date0 = DAY1;
    for (const r of Object.values(SAVE.rentals || {})) if (r) r[1] = mv(r[1]);
    for (const r of Object.values(SAVE.records || {})) { for (const k of ["until", "lastCall", "promise"]) r[k] = mv(r[k]); for (const i of r.incidents || []) i.at = mv(i.at); }
    for (const m of SAVE.messages || []) m.at = mv(m.at);
  }
}
// the game mode. Simulation: a bare-bones store you build up (no staff, no
// theater, no popcorn machine, part of the library) out of what it earns.
// Sandbox: everything open and a big budget. Saves from before modes are sandbox
// Customer: an established store (everything bought) that runs without you; you're one of its customers (see customer mode)
const MODE = ["simulation", "customer"].includes(SAVE?.mode) ? SAVE.mode : "sandbox", SIM = MODE === "simulation";
// who you are in the store: on staff, or (customer mode, or put out of a job: see becomeCustomer) a customer
const CUSTOMER = (SAVE?.role ?? (MODE === "customer" ? "customer" : "staff")) === "customer";
const rep = { v: SAVE?.rep ?? 50 };             // store reputation 0..100 (see repStars)
const growth = { pending: SAVE?.signups ?? (SIM ? 2 : 0), prospects: SAVE?.prospects ?? 0, pT: 30 };   // (a new simulation: a couple of curious locals on day one)  // simulation: new members who'll sign up tomorrow morning (word of mouth, ads, what you've built)
const upg = { ...SAVE?.upg };                   // upgrades bought (see UPGRADES)
if (!("rewinder2" in upg)) upg.rewinder2 = !!SAVE?.upg;   // a store saved before the second rewinder was an upgrade already had two
// a copy's stable id across reloads: "<tape id>#<season>:<n>", n = its place in
// [tape, ...tape.copies] (shelving is deterministic, so n holds every load).
// id + season is unique per tape; the id alone isn't (every season of a show shares it)
const tapeName = t => /^Season/.test(t.seasons?.[0]?.label || "") ? `${t.title} (${t.seasons[0].label})` : t.title;   // which tape of a show: "Cheers (Season 3)"
const titleOfCopy = c => Object.hasOwn(c, "copies") || Object.getPrototypeOf(c) === Object.prototype ? c : Object.getPrototypeOf(c);
const tapeKey = t => `${t.id}#${t.season ?? ""}`;
let byTapeKey = null;                        // tape key -> tape, built on first use
const copyKey = c => { const t = titleOfCopy(c); return `${tapeKey(t)}:${[t, ...(t.copies || [])].indexOf(c)}`; };
const copyByKey = k => { const i = k.lastIndexOf(":"), t = (byTapeKey ||= new Map(catalog.map(t => [tapeKey(t), t]))).get(k.slice(0, i)); return t && [t, ...(t.copies || [])][+k.slice(i + 1)]; };
// ---- be kind, rewind ----
// Every physical copy remembers where its tape is wound to: copy.tapePos =
// { ep, t } (episode index, seconds in), updated while it plays and kept
// through eject / inventory / returns / reloads. It goes back in the VCR at
// that episode. Shelving a tape that isn't rewound docks your pay
// (REWIND_FINE, set once pay exists) and the tape snaps back to the start.
const REWIND_FINE = 0;                       // $ docked per unrewound tape shelved — ponytail: 0 until pay is wired up
const payLedger = [];                        // { what, title, fine, at, ep, t } — penalties so far (saved)
// an extra copy of a title inherits everything from the first copy (Object.create),
// so its per-copy state has to be its own from the start — otherwise desensitizing,
// rewinding or renting the first copy would quietly do it to all of them
const newCopy = t => Object.assign(Object.create(t), { desens: false, lost: false, offShelf: false, tapePos: null, rental: null });
const isRewound = c => !c.tapePos || (c.tapePos.ep === 0 && c.tapePos.t < 1);
// how far through the whole tape it's wound, 0..1: episodes played + the part
// of the current one (d = its length, recorded while it played; a movie-ish
// guess if it never got that far). Drives the inventory wind bar, and later
// how long a rewind takes / how big the pay dock is
function windFrac(c) {
  const p = c.tapePos; if (!p || isRewound(c)) return 0;
  const n = c.seasons[0].episodes.length, d = p.d || (n > 1 ? 1500 : 6000);
  return Math.min(1, (p.ep + Math.min(1, p.t / d)) / n);
}
function shelveCheck(c) {                    // called as a tape goes back on its shelf
  if (isRewound(c)) return;
  payLedger.push({ what: "unrewound", title: c.title, fine: REWIND_FINE, at: Date.now(), ...c.tapePos });
  c.tapePos = null;                          // instantly rewound
  toast(`Not rewound: ${c.title}${REWIND_FINE ? ` · -$${REWIND_FINE.toFixed(2)} pay` : ""} · be kind, rewind!`);
}
// set a tape's wind to a fraction of the whole tape (the inverse of windFrac)
function setWindFrac(c, f) {
  const n = c.seasons[0].episodes.length, d = c.tapePos?.d || (n > 1 ? 1500 : 6000);
  if (f <= 0) { c.tapePos = null; return; }
  const x = Math.min(1, f) * n, ep = Math.min(n - 1, Math.floor(x));
  c.tapePos = { ep, t: (x - ep) * d, d: c.tapePos?.d };
}
// the counter rewinders (one to start, a second bought, either side of the returns tote): E puts the
// tape in hand in; it winds back over up to REWIND_SECS (scaled by how far
// it's wound) with a motor whir, clunks when done, and E takes it out — early,
// it comes out only partly rewound. Each machine is its own object in rewinders
const REWIND_SECS = 10;
function rewinderLoad(rw, tape, who = "you") {
  Object.assign(rw, { tape, f0: windFrac(tape), t: 0, done: false });
  rw.dur = Math.max(1, rw.f0 * REWIND_SECS) * (owned("rewinders") ? 0.5 : 1) * Math.max(0.5, 1 - 0.025 * (lv(who, "dex") - 1)) * (has(who, "dex", 5) ? 0.7 : 1);   // (DEX: threaded and running faster; Quick Thread)
  if (has(who, "dex", 10) && Math.random() < 0.2) { rw.dur = 0.15; if (who === "you") toast("Lucky Spool: rewound in a blink!", true); }
  if (who !== "load") gainXp(who, "dex", 3);
  rw.tapeMesh.material = tape.sideMat || mat.tapeBody; rw.tapeMesh.visible = true;
  if (rw.f0 > 0) rewinderSound(rw, true); else rewinderFinish(rw, false);
}
// every sound effect goes out through here, so the settings' Store sounds volume and M (mute) reach them too, not just the ambience
const sfxVol = () => window.StoreAmbience?.muted?.() ? 0 : SETTINGS.sound / 100;
let sfxGain = null;                            // (one, on the shared context: see StoreAudio in ambience.js)
function sfxOut() { if (!sfxGain) { sfxGain = StoreAudio.ctx().createGain(); sfxGain.connect(StoreAudio.out()); } sfxGain.gain.value = sfxVol(); return sfxGain; }
const sfxRefresh = () => sfxGain?.gain.setTargetAtTime(sfxVol(), sfxGain.context.currentTime, 0.05);   // (the alarm, a rewinder's whir: already playing)
function rewinderEmpty(rw) {                  // the tape's out: machine idle
  rewinderSound(rw, false); rw.tape = null; rw.tapeMesh.visible = false; rw.led.material.color.set(0x222222);
}
function rewinderFinish(rw, clunk = true) {
  rw.done = true; rewinderSound(rw, false); rw.led.material.color.set(0x2bff6a);
  if (clunk) try {                            // the eject thunk
    const ac = StoreAudio.ctx(), o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.type = "square"; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.09);
    g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g).connect(sfxOut(ac)); o.start(t); o.stop(t + 0.13);
  } catch {}
}
function rewinderSound(rw, on) {
  if (!on) { rw.snd?.(); rw.snd = null; return; }
  rw.led.material.color.set(0xff3b1f);
  try {                                       // little motor: a soft hum, tape hiss, and the reel's rattle, speeding up a touch as the tape runs down
    const ac = StoreAudio.ctx(); ac.resume();
    const t = ac.currentTime, end = t + rw.dur, out = ac.createGain();
    out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(0.05, t + 0.2); out.connect(sfxOut(ac));
    const hum = ac.createOscillator(), humF = ac.createBiquadFilter(), humG = ac.createGain();
    hum.type = "sawtooth"; hum.frequency.setValueAtTime(95, t); hum.frequency.linearRampToValueAtTime(125, end);
    humF.type = "lowpass"; humF.frequency.value = 260; humG.gain.value = 0.35;
    hum.connect(humF).connect(humG).connect(out);
    const noise = ac.createBufferSource(), buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noise.buffer = buf; noise.loop = true;
    const hiss = ac.createBiquadFilter(), rattle = ac.createGain(), lfo = ac.createOscillator(), depth = ac.createGain();
    hiss.type = "bandpass"; hiss.Q.value = 0.8; hiss.frequency.setValueAtTime(1400, t); hiss.frequency.linearRampToValueAtTime(1800, end);
    lfo.type = "square"; lfo.frequency.setValueAtTime(9, t); lfo.frequency.linearRampToValueAtTime(14, end);   // the reel's click-click, not a turbine
    rattle.gain.value = 0.35; depth.gain.value = 0.25; lfo.connect(depth).connect(rattle.gain);
    noise.connect(hiss).connect(rattle).connect(out);
    const src = [hum, noise, lfo]; src.forEach(o => o.start());
    rw.snd = () => { const t = ac.currentTime; out.gain.cancelScheduledValues(t); out.gain.setTargetAtTime(0, t, 0.015); src.forEach(o => o.stop(t + 0.1)); setTimeout(() => out.disconnect(), 200); };   // (a quick fade: cut dead it clicks)
  } catch {}
}
function rewinderTick(dt) {
  for (const rw of rewinders) {
    if (!rw.tape || rw.done) continue;
    rw.t += dt;
    const p = Math.min(1, rw.t / rw.dur);
    setWindFrac(rw.tape, rw.f0 * (1 - p));
    if (p >= 1) rewinderFinish(rw);
  }
}
function rewinderUse(rw) {                    // E on a rewinder
  if (rw.tape) {                              // take it out (done, or early)
    if (!invMakeRoom()) { toast("Hands full"); return; }
    const t = rw.tape;
    rewinderEmpty(rw);
    showTape(t);
  } else if (held) { const t = held; releaseFromHand(); rewinderLoad(rw, t); }
}
// the counter's service bell: a bright struck-metal ding (a few inharmonic partials, fast attack, long ring)
function dingBell() {
  try {
    const ac = StoreAudio.ctx(), t = ac.currentTime, out = ac.createGain();
    out.gain.value = 0.12; out.connect(sfxOut(ac));
    for (const [f, a, d] of [[2210, 1, 1.6], [5980, 0.35, 0.7], [3470, 0.25, 1.1]]) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = f; g.gain.setValueAtTime(a, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(out); o.start(t); o.stop(t + d);
    }
  } catch {}
}
// security tags: every copy's is live until run across the counter's
// desensitizer (copy.desens = true), and live again once it's reshelved.
// The gates only alarm on a live tag.
let desensFlash = 0;
function desensitize(c) {
  if (c.desens) { toast(`${c.title} is already desensitized`); return; }
  c.desens = true; desensFlash = 0.6;
  toast(`Desensitized: ${c.title}`, true);
  try {                                        // the pad's confirm beep-beep
    const ac = StoreAudio.ctx(), t = ac.currentTime;
    for (const [dt, f] of [[0, 1760], [0.11, 2350]]) {
      const o = ac.createOscillator(), g = ac.createGain(); o.type = "square"; o.frequency.value = f;
      g.gain.setValueAtTime(0.04, t + dt); g.gain.setValueAtTime(0, t + dt + 0.08); o.connect(g).connect(sfxOut(ac)); o.start(t + dt); o.stop(t + dt + 0.09);
    }
  } catch {}
}
let toastTimer = 0;
function toast(text, good = false) {          // red = a problem; good = the store's blue, for confirmations
  const el = document.getElementById("toast"); if (!el) return;
  el.textContent = text; el.style.display = "block"; el.style.background = good ? "var(--bb-blue)" : "";
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.style.display = "none"; }, 3500);
}
// video-store shelving: alphabetical ignoring a leading The/A/An, then seasons
// 1,2,3… with specials (season 0) and uncoded "Episodes" (-1) after the last
const shelfKey = t => t.title.replace(/^(the|an?)\s+/i, "");
const seasonRank = t => (t.season ?? 0) > 0 ? t.season : 1000 - (t.season ?? 0);
catalog.sort((a, b) => shelfKey(a).localeCompare(shelfKey(b), undefined, { numeric: true, sensitivity: "base" })
  || a.id.localeCompare(b.id) || seasonRank(a) - seasonRank(b));

// ---------------- canvas texture helpers ----------------
function makeTexture(draw, w, h) {
  const S = LOWMEM && w >= 512 ? 0.5 : 1;        // phones: big signs drawn at half scale (iOS caps a page's canvas memory)
  const c = document.createElement("canvas"); c.width = Math.round(w * S); c.height = Math.round(h * S);
  const ctx = c.getContext("2d"); ctx.scale(S, S);
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  if (w > 256) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
function textPlane(text, w, h, fg = "#ffd400", bg = "#00349c", font = "Arial Black", fs = 90) {
  const t = makeTexture((ctx, W, H) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 8; ctx.strokeRect(6, 6, W - 12, H - 12);
    ctx.fillStyle = fg; ctx.font = `italic 900 ${fs}px ${font}, Arial`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    let f = fs; while (ctx.measureText(text).width > W - 60 && f > 20) { f -= 6; ctx.font = `italic 900 ${f}px ${font}, Arial`; }
    ctx.fillText(text, W / 2, H / 2 + 4);
  }, 1024, Math.round(1024 * h / w));
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: t }));
}
function tagPlane(lines, w, lineH) {         // stacked bare white text, faint black outline
  const h = lines.length * lineH;
  const t = makeTexture((ctx, W, H) => {
    ctx.clearRect(0, 0, W, H);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(0,0,0,.5)"; ctx.fillStyle = "#fff";
    const rh = H / lines.length;
    lines.forEach((text, i) => {
      let f = Math.min(100, rh * 0.8); ctx.font = `bold ${f}px Arial Black, Arial`;
      while (ctx.measureText(text).width > W - 60 && f > 14) { f -= 6; ctx.font = `bold ${f}px Arial Black, Arial`; }
      ctx.lineWidth = Math.max(4, f / 8);
      const y = (i + 0.5) * rh;
      ctx.strokeText(text, W / 2, y); ctx.fillText(text, W / 2, y);
    });
  }, 1024, Math.round(1024 * h / w));
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshLambertMaterial({ map: t, transparent: true }));   // lit by the room, dims in lights-out
}

// carpet, ceiling tiles
const carpetTex = makeTexture((ctx, W, H) => {
  ctx.fillStyle = "#16357a"; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = Math.random() < 0.12 ? "#ffdd55" : (Math.random() < 0.5 ? "#1d4296" : "#0f2a66");
    ctx.globalAlpha = 0.25 + Math.random() * 0.5;
    ctx.fillRect(Math.random() * W, Math.random() * H, 3, 3);
  }
}, 512, 512);
carpetTex.repeat.set(11, 14);
// drop ceiling: 1.8 x 0.9 m tiles (long side along x — the same size as
// the light fixtures) acoustic tiles, pinhole-dotted, in a solid T-bar grid.
// One canvas = 3.6 m square = 2 x 4 tiles (so the dots don't repeat every
// tile); frames sit on the canvas edges and between tiles, so repeats join into one grid.
// Callers align it to world coordinates (ceilGrid) so light panels can drop
// into real grid slots
const CEIL_TILE = { x: 1.8, z: 0.9 }, CEIL_REP = 3.6;   // tile size, canvas period (both axes)
const ceilTex = makeTexture((ctx, W, H) => {
  const f = 10;                                      // T-bar width, px
  ctx.fillStyle = "#dcd9d0"; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 10400; i++) {                  // pinholes/fissures, a few bigger than others
    ctx.fillStyle = Math.random() < 0.5 ? "#b3afa4" : "#c4c0b6";
    const r = Math.random() < 0.85 ? 1.2 : 2;
    ctx.beginPath(); ctx.arc(Math.random() * W, Math.random() * H, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = "#f2f3f4";                          // T-bars: half on each canvas edge, full through the middle
  for (let i = 0; i <= 2; i++) ctx.fillRect(i * W / 2 - f / 2, 0, f, H);   // tile ends every 1.8 m
  for (let i = 0; i <= 4; i++) ctx.fillRect(0, i * H / 4 - f / 2, W, f);   // tile sides every 0.9 m
}, 1024, 1024);
// a ceiling plane spanning x0..x1, z0..z1 (rotated +90° about x, so u runs +x
// and v runs +z): offset so grid lines land on multiples of the tile size
function ceilGrid(tex, x0, x1, z0, z1) {
  tex.repeat.set((x1 - x0) / CEIL_REP, (z1 - z0) / CEIL_REP);
  tex.offset.set(x0 / CEIL_REP, z0 / CEIL_REP);
  return tex;
}

const mat = {
  carpet: new THREE.MeshLambertMaterial({ map: carpetTex }),
  ceil: new THREE.MeshLambertMaterial({ map: ceilTex }),
  wall: wallSurface(new THREE.MeshLambertMaterial({ color: 0xe8ecf2 }), "paint"),
  stripe: new THREE.MeshLambertMaterial({ color: BLUE }),
  glass: new THREE.MeshLambertMaterial({ color: 0x0a1428, transparent: true, opacity: 0.75 }),
  frame: new THREE.MeshLambertMaterial({ color: 0xf4f4f4 }),
  board: new THREE.MeshLambertMaterial({ color: 0x9aa3ad }),
  upright: new THREE.MeshLambertMaterial({ color: 0x1c4dbb }),
  counter: new THREE.MeshLambertMaterial({ color: BLUE }),
  counterTop: new THREE.MeshLambertMaterial({ color: YELLOW }),
  dark: new THREE.MeshLambertMaterial({ color: 0x14161a }),
  wood: new THREE.MeshLambertMaterial({ color: 0x7a4a22 }),
  tapeBody: new THREE.MeshLambertMaterial({ color: 0x101318 }),
  backing: new THREE.MeshLambertMaterial({ color: 0xeef0f2 }),
  storefront: new THREE.MeshLambertMaterial({ color: 0x8fb8d8, transparent: true, opacity: 0.16 }), // big display glass — barely tinted, meant to be seen through
  mullion: new THREE.MeshLambertMaterial({ color: 0x2a2e35 }),
  sidewalk: new THREE.MeshLambertMaterial({ color: 0x9a9d9f }),
  sidewalkJoint: new THREE.MeshBasicMaterial({ color: 0x6f7274 }),
  pavement: new THREE.MeshLambertMaterial({ color: 0x55595e }),
  road: new THREE.MeshLambertMaterial({ color: 0x2b2d31 }),
  curb: new THREE.MeshLambertMaterial({ color: 0xb9bcc0 }),
  grass: new THREE.MeshLambertMaterial({ color: 0x3f7d3a }),
  bench: new THREE.MeshLambertMaterial({ color: 0x2f5233 }),
  cloud: new THREE.MeshLambertMaterial({ color: 0xf2f4f6, emissive: 0x141b30, emissiveIntensity: 0.4 }), // dim emissive so they don't vanish to black under moonlight
  lineWhite: new THREE.MeshBasicMaterial({ color: 0xe8e8e8 }),
  lineYellow: new THREE.MeshBasicMaterial({ color: 0xe8c33c }),
  aluminum: new THREE.MeshLambertMaterial({ color: 0xc2c6cb }),
};
let floorHeightAt = () => 0;                // floor height under (x, z): 0 everywhere but the theater's stepped rows (set with the theater)
let panelMats = [];                        // ceiling panel groups, per switch zone — dark when switched off, flicker independently on warm-up
let theaterScreenMesh = null;
let thDeck = null;                          // the theater's pop-up VCR in the stage floor (store/theater.js): thDeck.tick(dt) raises it while a tape's in
let projBeamMat = null;
let thSconceMat = null;                    // the auditorium wall sconces' shades (see the main loop)
const beamU = { uBeamZ: { value: TVU.uTvZoneC.value }, uBeamOn: { value: 0 } };   // the beam reads the TV light's 3x3 picture colors straight from the shared array
const theaterSeats = [];
// the folding theater seats: one InstancedMesh, a hinge per seat. a: 0 = down, 1 = folded up against the back
let thCushions = null, thSeatFolds = [];
const thSeatDummy = new THREE.Object3D();
function thSeatPose(i) {
  const h = thSeatFolds[i];
  thSeatDummy.position.set(h.x, h.y, h.z); thSeatDummy.rotation.set(-h.a * 1.45, 0, 0); thSeatDummy.updateMatrix();
  thCushions.setMatrixAt(i, thSeatDummy.matrix);
}
// sprung: pushed down while someone's on it, snaps back up (with a little
// bounce off the back) the moment they stand
function thSeatTick(dt) {
  if (!thCushions) return;
  dt = Math.min(dt, 0.05);                        // a stalled frame mustn't fling the springs
  let moved = false;
  thSeatFolds.forEach((h, i) => {
    const sat = (seated && seatAt === h.seat) || custs.some(k => k.thSeat === h.seat && (k.state === "thSitDown" || k.state === "thWatch"));
    const want = sat ? 0 : 1;
    if (h.a === want && !h.v) return;
    h.v += (140 * (want - h.a) - 9 * h.v) * dt; h.a += h.v * dt;
    if (h.a > 1) { h.a = 1; h.v *= -0.35; }        // clack against the back
    if (h.a < 0) { h.a = 0; h.v *= -0.2; }         // bottoms out on its stop
    if (Math.abs(want - h.a) < 0.002 && Math.abs(h.v) < 0.05) { h.a = want; h.v = 0; }
    thSeatPose(i); moved = true;
  });
  if (moved) thCushions.instanceMatrix.needsUpdate = true;
}

// the light switch zones: three along the sales floor, then the back of house rooms
const LIGHT_ZONES = ["front", "aisles", "lounge", "hall", "breakroom", "restroom", "lobby", "theater", "closet", "booth", "stairwell", "office"];
const ZONE_NAMES = { front: "front", aisles: "aisle", lounge: "lounge", hall: "back hall", breakroom: "break room", restroom: "restroom", lobby: "theater lobby", theater: "auditorium", closet: "closet", booth: "projection booth", stairwell: "booth stairs", office: "manager's office" };
const ZONE_LABELS = { front: "FRONT", aisles: "AISLES", lounge: "LOUNGE", hall: "HALL", breakroom: "LIGHTS", restroom: "LIGHTS", lobby: "LOBBY", theater: "HOUSE", closet: "LIGHT", booth: "BOOTH", stairwell: "STAIRS", office: "LIGHTS" };
function lightZoneAt(x, z, y = 0) {
  if (z >= BOH.z1) return "theater";
  if (z > SHAFT.z0 && z < BOH.z1 && x > SHAFT.x0 && x < BOH.x0) return "stairwell";
  if (z > STORE.z && x < BOH.x0) return y > 2.8 && z > TALL.z0 ? "booth" : "lobby";
  if (z > STORE.z) return z < BOH.hallZ ? (x > CLOSET.x0 ? "closet" : "hall") : x < BOH.splitX ? "restroom" : z > BOH.officeZ ? "office" : "breakroom";   // (the two restrooms are on one circuit: the shader has the one level for them)
  return z < 10 ? "front" : z < 19 ? "aisles" : "lounge";
}
const allLights = [];                      // every light that lights-out kills (base intensity in userData.on)
const aimables = [];                       // E targets: TV screen, couch, lamps, returns counter, snack stand
const fallTops = [];                       // what you can land on but walk past (a chair, say: not a collider): { x0, x1, z0, z1, y1 }. See fallSurface
const aimBlockers = [];                    // solid things you can't reach through: walls, the back of a snack rack
const lampPools = [];                      // side-lamp floor pools — drowned out whenever the overhead lights are on
const lamps = [];                          // the two side lamps — holding L toggles both together
const hangers = [];                        // what hangs at head height if you're up on something: { x0, x1, z0, z1, y0, y1, name } (see hangerHit)
const colliders = [];                      // axis-aligned floor boxes the player can't walk into — walls included
// the Dracula standee: where it stands (x, z, facing ry), its mesh group once
// the PNG has loaded, and its collider — one box, refit wherever it's set down
const cutout = { x: 0, z: 0, ry: 0, g: null, box: { y1: 1.85 }, carried: false };
// the front doors' deadbolt: locked = the sign reads CLOSED and no new customers come in
const frontLock = { locked: false, turn: null, signs: [] };
function cutoutFit(x, z, ry, b) {            // floor box around the board's solid middle + the strut's foot behind it, at any angle
  const c = Math.cos(ry), sn = Math.sin(ry), xs = [], zs = [];
  for (const [lx, lz] of [[-0.4, 0.05], [0.4, 0.05], [-0.4, -0.45], [0.4, -0.45]]) { xs.push(x + lx * c + lz * sn); zs.push(z - lx * sn + lz * c); }
  return Object.assign(b, { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) });
}
const frontDoor = { leaves: [], k: 0, open: false, hold: 0 };   // the storefront's double doors: k 0 shut .. 1 open (the right leaf: customers' side)
const doors = [];                          // hinged interior doors (see makeDoor) — E swings them
let frontWallBox = null;                   // the storefront's collider

function seeded(seed) { return () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
