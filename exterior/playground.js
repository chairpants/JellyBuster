// ---- the park across the road (EDGE.park, store/core.js): a clearing in the woods with the old town playground on it. The rocket (a caged climber
// three decks up, big enough for a grown-up, with a slide off the first), the monkey bars beside it, a merry-go-round, a seesaw, the swings, a picnic
// table, two benches and the park's sign by the walk. Painted red, teal and cream sometime in the sixties and again since. Worn to dirt wherever feet land ----
// Called from buildGrounds (exterior/grounds.js). All of it one mesh (outdoorKit, exterior/edges.js) but the seesaw's plank and the swings' seats, which move.
// How it all works (the rocket's ladders and decks, the slide, the swings, the seesaw) is at the end of the file: "the park, working".
const PLAYGROUND = { rocket: [10, -33], round: [2.8, -27.2], seesaw: [-3.5, -31.5], swings: [20.6, -29.5], table: [-9.5, -35], benches: [[0, LOT.roadFar - 2.2], [15, -24.6]] };   // (the first bench: by the walk, under the park's lamp)
// the rocket, at a grown-up's size: decks you can stand up on (2.3, 4.5, 6.6 m), a ladder to each from the one below (lad: round the mast, by angle;
// the cage's x is cos, z is sin), its rungs' line rho out from the middle. prof: the cage, height and radius; hole: a deck's hatch, radially and across
// (by the angle of the ladder up through it); walk: how far out from the middle you can stand on each deck, for the cage leaning in over your head
const ROCKET = { decks: [0, 2.3, 4.5, 6.6], lad: [-Math.PI / 2, Math.PI, Math.PI / 2], rho: 0.95, N: 28, door: Math.PI / 2, gate: 0,
  prof: [[0, 1.5], [1.2, 1.65], [2.3, 1.78], [3.4, 1.82], [4.5, 1.76], [5.6, 1.6], [6.6, 1.42], [7.8, 1.2], [8.7, 0.98], [9.3, 0.7]],
  slide: { x0: 1.7, run: 4.3, drop: 1.88, out: 0.95 } };
ROCKET.hole = [[ROCKET.rho - 0.65, -0.36], [ROCKET.rho + 0.12, -0.36], [ROCKET.rho + 0.12, 0.36], [ROCKET.rho - 0.65, 0.36]];
ROCKET.rAt = y => { const p = ROCKET.prof; for (let i = 1; i < p.length; i++) if (y <= p[i][0]) { const [y0, r0] = p[i - 1], [y1, r1] = p[i]; return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return p[p.length - 1][1]; };
ROCKET.walk = ROCKET.decks.map(d => { let m = Infinity; for (let y = d; y <= d + 1.85; y += 0.05) m = Math.min(m, ROCKET.rAt(y)); return m - 0.06 - 0.32; });
const rocketSlideY = x => { const S = ROCKET.slide, top = ROCKET.decks[1] + 0.02; return x <= S.x0 ? top : x >= S.x0 + S.run ? top - S.drop : top - S.drop * (x - S.x0) / S.run; };   // the chute's top, out from the middle
const SEESAW = { x: PLAYGROUND.seesaw[0], z: PLAYGROUND.seesaw[1], ry: 0.16, y0: 0.67, half: 1.75, seat: 1.45, handle: 1.08, max: 0.36, a: 0.36, w: 0, tip: null };   // a: tipped this far (+: the -x end down), max: an end on the ground
// the swings: a big old set, the top bar 3.3 m up (near twice a grown-up's height), 2.78 m of chain. W: half the bar, to the A-frames; splay: how far
// each A-frame's feet stand out front and back. th: out from straight down, +: forward (local +z), and on round past the bar if you get it going
// (not wrapped); free: the chains gone slack (going over too slowly): the seat's flying on its own, { y, z, vy, vz } from the bar, till they snap taut
const SWING = { x: PLAYGROUND.swings[0], z: PLAYGROUND.swings[1], ry: -0.12, H: 3.3, L: 2.78, W: 2.35, splay: 1.5, stiff: 0.6,   // stiff: heavy old chains, a hand on each: they hold their line till it'd take more than this much of your weight to keep them straight
  seats: [{ lx: -1.0, th: 0, w: 0, tuck: 0.4, g: null, free: null, pumped: -9 }, { lx: 1.0, th: 0, w: 0, tuck: 0.4, g: null, free: null, pumped: -9 }] };
const ROUND = { x: PLAYGROUND.round[0], z: PLAYGROUND.round[1], ry: 0.3, th: 0, w: 0, top: 0.46, max: 6, g: null };   // th: turned this far (about y, as three.js turns things), w: how fast (rad/s); top: its deck, to stand on
const parkWorld = (lx, lz, X, Z, ry) => { const c = Math.cos(ry), s = Math.sin(ry); return [X + lx * c + lz * s, Z - lx * s + lz * c]; };   // (a K.at frame's x, z to the world's)
const parkLocal = (x, z, X, Z, ry) => { const dx = x - X, dz = z - Z, c = Math.cos(ry), s = Math.sin(ry); return [dx * c - dz * s, dx * s + dz * c]; };
function buildPlayground({ lam, ext }) {
  const g = new THREE.Group(); scene.add(g);
  const K = outdoorKit(), KD = outdoorKit(), R = seeded(1961), P = PLAYGROUND;   // (KD: the worn dirt, its own mesh: it has the ground's shading, exterior/surfaces.js)
  const RED = 0xcf4a32, RED2 = 0xb93c28, TEAL = 0x2f8d98, TEAL2 = 0x26747e, CREAM = 0xe6d7ae, STEEL = 0x9ba0a2, DIRT = 0x8c6e4a, RUBBER = 0x1d1d1f, CHAIN = 0x74787b;
  const solid = (x0, x1, z0, z1, y1) => colliders.push({ x0, x1, z0, z1, y1 });
  const dirt = (x, z, rx, rz, ry = 0) => { const geo = new THREE.CircleGeometry(1, 22); geo.rotateX(-Math.PI / 2); geo.scale(rx, 1, rz); const p = geo.attributes.position;
    for (let i = 1; i < p.count; i++) { const k = 0.86 + R() * 0.2; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }   // (a ragged edge: grass grows back in from the outside)
    KD.add(geo, DIRT, x, 0.012, z, 0, ry); };

  // ---- the rocket (ROCKET): a cage of bars from the ground up to the nose, four fins splayed round its foot, a door in at the bottom. Three decks inside,
  // each with a hatch for the ladder up from the one below; the slide off the first, through a gap in the bars; the monkey bars off the other side ----
  { const [X, Z] = P.rocket, { prof, rAt, decks, lad, rho, N, door, gate } = ROCKET, step = Math.PI * 2 / N, S = ROCKET.slide;
    const off = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))), at = (rad, a, tan = 0) => [Math.cos(a) * rad - Math.sin(a) * tan, Math.sin(a) * rad + Math.cos(a) * tan];
    dirt(X + 1.4, Z, 6.0, 3.4);
    K.at(X, 0, Z, 0, () => {
      for (let i = 0; i < N; i++) { const a = (i + 0.5) * step, cs = Math.cos(a), sn = Math.sin(a), inDoor = off(a, door) < step, inGate = off(a, gate) < step;   // (two bars short at the door and at the slide)
        for (let k = 1; k < prof.length; k++) { const [y0, r0] = prof[k - 1], [y1, r1] = prof[k]; if ((inDoor && y1 <= decks[1]) || (inGate && y0 >= decks[1] && y1 <= 3.4)) continue;
          K.pipe(i % 2 ? CREAM : RED, [cs * r0, y0, sn * r0], [cs * r1, y1, sn * r1], 0.024, 5); } }
      for (const [y, c, t] of [[0.04, TEAL, 0.045], [1.2, CREAM, 0.026], [2.3, RED2, 0.034], [3.4, CREAM, 0.026], [4.5, RED2, 0.034], [5.6, CREAM, 0.026], [6.6, RED2, 0.034], [7.8, CREAM, 0.026], [8.7, CREAM, 0.026], [9.3, TEAL, 0.042]]) {
        const gap = y < decks[1] ? 1.5 * step : 0;   // (the rings below the first deck stop either side of the door)
        K.add(new THREE.TorusGeometry(rAt(y), t, 6, 44, Math.PI * 2 - 2 * gap), c, 0, y, 0, Math.PI / 2, 0, door + gap);
      }
      for (let k = 1; k < decks.length; k++) {         // the decks: a plate out to the cage, a hatch in it over the ladder up from below, a rim round the hatch
        const y = decks[k], sh = new THREE.Shape(); sh.absarc(0, 0, rAt(y) - 0.03, 0, Math.PI * 2, false);
        const hole = ROCKET.hole.map(([r, t]) => at(r, lad[k - 1], t)); sh.holes.push(new THREE.Path(hole.map(([x, z]) => new THREE.Vector2(x, -z))));
        const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: false, curveSegments: 32 }); geo.rotateX(-Math.PI / 2); K.add(geo, RED2, 0, y - 0.05, 0);
        for (let j = 0; j < 4; j++) { const [ax, az] = hole[j], [bx, bz] = hole[(j + 1) % 4]; K.pipe(TEAL, [ax, y + 0.012, az], [bx, y + 0.012, bz], 0.018, 5); }
      }
      for (let k = 0; k < lad.length; k++) { const a = lad[k], y0 = decks[k], y1 = decks[k + 1];   // a ladder to each deck: its rails on up a metre through the hatch, to hold climbing out
        for (const t of [-0.22, 0.22]) { const [x, z] = at(rho, a, t); K.pipe(STEEL, [x, y0, z], [x, y1 + 1.0, z], 0.02, 6); }
        { const [ax, az] = at(rho, a, -0.22), [bx, bz] = at(rho, a, 0.22); K.pipe(STEEL, [ax, y1 + 1.0, az], [bx, y1 + 1.0, bz], 0.02, 6);
          for (let y = y0 + 0.3; y < y1 - 0.05; y += 0.3) K.pipe(STEEL, [ax, y, az], [bx, y, bz], 0.015, 5); }
      }
      { const nose = new THREE.ConeGeometry(0.72, 2.0, 20, 1, true); K.add(nose, CREAM, 0, 10.3, 0);   // the nose: a cream cone, red stripes down it, a spike on top
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; K.pipe(RED, [Math.cos(a) * 0.72, 9.32, Math.sin(a) * 0.72], [Math.cos(a) * 0.03, 11.28, Math.sin(a) * 0.03], 0.02, 4); }
        K.cyl(STEEL, 0.008, 0.024, 0.8, 0, 11.7, 0, 6); }
      for (let i = 0; i < 4; i++) K.at(0, 0, 0, i * Math.PI / 2 + Math.PI / 4, () => {                                    // the fins, splayed out round its foot
        const sh = new THREE.Shape([[1.58, 3.2], [1.92, 2.45], [2.75, 0], [2.32, 0], [1.72, 0.95], [1.58, 0.98]].map(([a, b]) => new THREE.Vector2(a, b)));
        const fin = new THREE.ExtrudeGeometry(sh, { depth: 0.07, bevelEnabled: false }); fin.translate(0, 0, -0.035); K.add(fin, TEAL);
        K.pipe(TEAL2, [1.62, 0.98, 0], [2.6, 0, 0], 0.035, 6); K.box(0x777a7c, 0.6, 0.05, 0.32, 2.55, 0.02, 0);
      });
      // the slide, off the first deck toward the road: a steel chute between teal rails, the last of it running out level
      K.at(S.x0, 0, 0, 0, () => {
        const { run, drop, out } = S, top = decks[1], L = Math.hypot(run, drop), tilt = Math.atan2(drop, run);
        K.box(0xb9c2c6, L, 0.025, 0.5, run / 2, top - drop / 2, 0, 0, 0, -tilt);
        for (const s of [-0.27, 0.27]) K.box(TEAL, L, 0.17, 0.035, run / 2, top - drop / 2 + 0.07, s, 0, 0, -tilt);
        K.box(0xb9c2c6, out, 0.025, 0.5, run + out / 2, top - drop, 0); for (const s of [-0.27, 0.27]) K.box(TEAL, out, 0.13, 0.035, run + out / 2, top - drop + 0.05, s);
        for (const s of [-0.24, 0.24]) { K.pipe(TEAL2, [run + out - 0.15, 0, s], [run + out - 0.15, top - drop, s], 0.025); K.pipe(TEAL2, [run * 0.5, 0, s], [run * 0.5, top - drop * 0.5, s], 0.025); }
        for (const s of [-0.27, 0.27]) { K.pipe(TEAL, [0.05, top, s], [0.05, top + 0.85, s], 0.022); K.pipe(TEAL, [0.05, top + 0.85, s], [0.8, top + 0.42, s], 0.022); }   // something to hold sitting down at the top
      });
      // the monkey bars, off the other side: two rails out from the cage to a pair of posts
      const MB = 2.35, rc = rAt(MB) - 0.02;
      for (const s of [-0.3, 0.3]) { K.pipe(TEAL, [-rc, MB, s], [-5.2, MB, s], 0.026); K.pipe(TEAL, [-5.2, 0, s], [-5.2, MB, s], 0.03); }
      for (let x = -2.15; x > -5.1; x -= 0.36) K.pipe(STEEL, [x, MB, -0.3], [x, MB, 0.3], 0.016, 5);
      for (let y = 0.4; y < MB - 0.1; y += 0.38) K.pipe(STEEL, [-5.2, y, -0.3], [-5.2, y, 0.3], 0.016, 5);
    });
    for (let i = 0; i < N; i++) { const a = (i + 0.5) * step; if (off(a, door) < step) continue; const [x, z] = at(1.52, a); solid(X + x - 0.05, X + x + 0.05, Z + z - 0.05, Z + z + 0.05); }   // the bars, at ankle height
    for (let i = 0; i < 4; i++) for (let r = 1.72; r < 2.8; r += 0.24) { const [x, z] = at(r, i * Math.PI / 2 + Math.PI / 4); solid(X + x - 0.08, X + x + 0.08, Z + z - 0.08, Z + z + 0.08); }   // the fins
    { const [x0, z0] = at(rho, lad[0], -0.24), [x1, z1] = at(rho, lad[0], 0.24); solid(X + Math.min(x0, x1) - 0.05, X + Math.max(x0, x1) + 0.05, Z + Math.min(z0, z1) - 0.05, Z + Math.max(z0, z1) + 0.05); }   // the first ladder
    { const end = S.x0 + S.run + S.out; for (let x = S.x0; x < end - 0.01; x += 0.5) solid(X + x, X + Math.min(x + 0.5, end), Z - 0.3, Z + 0.3, rocketSlideY(Math.min(x + 0.25, end))); }   // the slide: you can hop the low end, and stop on the run-out
    solid(X - 5.3, X - 5.1, Z - 0.36, Z + 0.36);
  }

  // ---- the merry-go-round (ROUND): a steel deck painted red in wedges, four hoops to hang on to, a hub polished by hands. All but the hub turns (see roundTick) ----
  { const [X, Z] = P.round; dirt(X, Z, 2.5, 2.4);
    K.cyl(0x55585a, 0.16, 0.2, 0.38, X, 0.19, Z, 12);
    const KR = outdoorKit(); ROUND.g = new THREE.Group(); ROUND.g.position.set(X, 0, Z); ROUND.g.rotation.y = ROUND.ry; g.add(ROUND.g);
    { const K = KR;
      K.cyl(RED2, 1.42, 1.42, 0.06, 0, 0.4, 0, 28); K.add(new THREE.TorusGeometry(1.42, 0.03, 6, 32), STEEL, 0, 0.4, 0, Math.PI / 2);
      for (let i = 0; i < 8; i++) if (i % 2) { const w = new THREE.CylinderGeometry(1.38, 1.38, 0.064, 6, 1, false, i * Math.PI / 4, Math.PI / 4); K.add(w, RED, 0, 0.4, 0); }
      K.cyl(STEEL, 0.05, 0.05, 0.7, 0, 0.78, 0, 10); K.cyl(STEEL, 0.09, 0.09, 0.04, 0, 1.14, 0, 12);
      for (let i = 0; i < 4; i++) K.at(0, 0, 0, i * Math.PI / 2, () => {
        const hoop = new THREE.TorusGeometry(0.36, 0.022, 6, 14, Math.PI); K.add(hoop, i % 2 ? TEAL : STEEL, 0.95, 0.83, 0, 0, Math.PI / 2);
        for (const s of [-0.36, 0.36]) K.pipe(i % 2 ? TEAL : STEEL, [0.95, 0.43, s], [0.95, 0.83, s], 0.022);
        K.pipe(STEEL, [0.05, 1.1, 0], [0.95, 1.19, 0], 0.016, 5);
      });
    }
    ROUND.g.add(KR.mesh());
    solid(X - 1.3, X + 1.3, Z - 1.3, Z + 1.3, ROUND.top);
  }

  // ---- the seesaw (SEESAW): a plank on a pipe stand, a handle and a seat at each end. It tips to whoever's on it (see seesawTick) ----
  { const S = SEESAW; dirt(S.x - 1.5, S.z + 0.25, 0.8, 0.6); dirt(S.x + 1.5, S.z - 0.25, 0.8, 0.6);
    K.at(S.x, 0, S.z, S.ry, () => { for (const s of [-0.22, 0.22]) { K.pipe(RED, [-0.3, 0, s], [0, S.y0 - 0.05, s], 0.03); K.pipe(RED, [0.3, 0, s], [0, S.y0 - 0.05, s], 0.03); } K.pipe(STEEL, [0, S.y0 - 0.05, -0.28], [0, S.y0 - 0.05, 0.28], 0.028); });
    const KP = outdoorKit(), piv = new THREE.Group(); piv.position.set(S.x, S.y0, S.z); piv.rotation.y = S.ry; S.tip = new THREE.Group(); piv.add(S.tip); g.add(piv);
    KP.box(TEAL, S.half * 2, 0.045, 0.24, 0, 0, 0);
    for (const e of [-1, 1]) { KP.box(RED, 0.42, 0.03, 0.26, e * S.seat, 0.0375, 0); const hx = e * S.handle;
      for (const s of [-0.1, 0.1]) KP.pipe(STEEL, [hx, 0.02, s], [hx, 0.28, s], 0.013, 5); KP.pipe(STEEL, [hx, 0.28, -0.1], [hx, 0.28, 0.1], 0.013, 5); }
    S.tip.add(KP.mesh()); S.tip.rotation.z = S.a;
  }

  // ---- the swings (SWING): an A-frame at each end, a top bar, two seats on chains, each its own pendulum (see swingTick) ----
  { const S = SWING, { H, W, splay } = S, foot = W + 0.3; dirt(S.x + S.seats[0].lx, S.z, 0.8, 2.0); dirt(S.x + S.seats[1].lx, S.z, 0.8, 2.1);
    K.at(S.x, 0, S.z, S.ry, () => {
      for (const e of [-1, 1]) { for (const s of [-1, 1]) K.pipe(CREAM, [e * foot, 0, s * splay], [e * W, H, 0], 0.05, 8);
        const by = 1.45, bz = splay * (1 - by / H), bx = W + 0.3 * (1 - by / H); K.pipe(CREAM, [e * bx, by, -bz], [e * bx, by, bz], 0.026); }   // the A-frames, a brace across each
      K.pipe(TEAL, [-W - 0.14, H, 0], [W + 0.14, H, 0], 0.055, 8);
      for (const { lx } of S.seats) for (const s of [-0.21, 0.21]) K.cyl(STEEL, 0.024, 0.024, 0.06, lx + s, H - 0.06, 0, 6);
    });
    const frame = new THREE.Group(); frame.position.set(S.x, 0, S.z); frame.rotation.y = S.ry; g.add(frame);
    for (const seat of S.seats) { const KS = outdoorKit(); seat.g = new THREE.Group(); seat.g.position.set(seat.lx, H, 0); frame.add(seat.g);
      for (const s of [-0.21, 0.21]) KS.pipe(CHAIN, [s, -0.04, 0], [s, -S.L + 0.02, 0], 0.009, 4);
      KS.box(RUBBER, 0.48, 0.03, 0.17, 0, -S.L, 0); seat.g.add(KS.mesh()); }
    for (const e of [-1, 1]) for (const s of [-1, 1]) { const [x, z] = parkWorld(e * foot, s * splay, S.x, S.z, S.ry); solid(x - 0.09, x + 0.09, z - 0.09, z + 0.09); }
  }

  // ---- a picnic table, red once; the second bench, facing the swings; the park's sign by the walk ----
  { const [X, Z] = P.table;
    K.at(X, 0, Z, 0.35, () => {
      for (let k = 0; k < 5; k++) K.box(k % 2 ? RED2 : RED, 1.85, 0.04, 0.142, 0, 0.75, -0.3 + k * 0.15);
      for (const s of [-1, 1]) { for (let k = 0; k < 2; k++) K.box(k ? RED : RED2, 1.85, 0.04, 0.142, 0, 0.45, s * (0.62 + k * 0.15)); }
      for (const e of [-0.7, 0.7]) { K.box(RED2, 0.05, 0.09, 1.6, e, 0.4, 0); K.box(RED2, 0.05, 0.09, 0.72, e, 0.7, 0);
        for (const s of [-1, 1]) K.box(RED2, 0.05, 0.8, 0.09, e + 0.05 * Math.sign(e), 0.365, s * 0.44, -s * 0.42); }   // the legs: an A under each end, feet out past the seats' inner edge
    });
    solid(X - 1.0, X + 1.0, Z - 0.95, Z + 0.95, 0.82);
    const GREEN = 0x2f5233;                        // the benches: slats on iron ends, both facing the playground
    for (const [BX, BZ] of P.benches) { K.at(BX, 0, BZ, 0, () => { for (let k = 0; k < 3; k++) K.box(GREEN, 1.5, 0.035, 0.11, 0, 0.44, -0.13 + k * 0.125); for (let k = 0; k < 2; k++) K.box(GREEN, 1.5, 0.1, 0.03, 0, 0.62 + k * 0.14, 0.2, 0.12);
      for (const e of [-0.62, 0.62]) { K.box(0x18191b, 0.05, 0.44, 0.05, e, 0.22, -0.14); K.box(0x18191b, 0.05, 0.86, 0.05, e, 0.43, 0.19, 0.1); K.box(0x18191b, 0.05, 0.04, 0.36, e, 0.42, 0.02); } });
    solid(BX - 0.78, BX + 0.78, BZ - 0.22, BZ + 0.28, 0.9); }
    const SX = -9, SZ = EDGE.far - 0.7;             // the sign: routed boards between two posts, the town's green
    for (const e of [-1, 1]) K.box(0x5b4327, 0.11, 1.7, 0.11, SX + e * 1.02, 0.85, SZ);
    K.box(0x244a36, 1.96, 0.72, 0.06, SX, 1.22, SZ);
    const s = weatheredSign("ROCKET PARK\nOPEN DAWN TO DARK", 1.86, 0.62, { fg: "#eadfb8", bg: "#244a36", seed: 61, bent: 0 }); s.position.set(SX, 1.22, SZ + 0.035); g.add(s);
    solid(SX - 1.1, SX + 1.1, SZ - 0.1, SZ + 0.1);
  }
  for (const [x, z, s] of EDGE.park.trees) solid(x - 0.1 * s, x + 0.1 * s, z - 0.1 * s, z + 0.1 * s);   // the shade trees' trunks

  g.add(K.mesh()); { const d = KD.mesh(); groundFx(d.material, "dirt"); WX_GROUND.push({ m: d.material, dry: new THREE.Color(0xffffff), wet: new THREE.Color(0x9a9690), snow: 1 }); g.add(d); }
  ext(g);
}

// ---- the park, working: up and down the rocket's ladders, its decks, the slide; the swings; the seesaw. PARK.deck: which of the rocket's decks
// you're standing on (0: the ground). climb: on a ladder; ride: on a swing, an end of the seesaw, or going down the slide. cam: where your eye is
// meanwhile (main.js), tilt: what the swing does to it. parkTick runs before move (store/main.js), so the seesaw's under your feet before you step ----
const PARK = { deck: 0, climb: null, ride: null, aim: null, cam: new THREE.Vector3(), tilt: 0, t: 0, jolt: 0, sit: null };   // jolt: a swing's chains catching you; sit: how you're sat on a ride (for the other player's copy: store/together.js)
const PARK_MOVE = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"];
const parkBusy = () => !!(PARK.deck || PARK.climb || PARK.ride);
const rkAt = (rad, a, tan = 0) => [PLAYGROUND.rocket[0] + Math.cos(a) * rad - Math.sin(a) * tan, PLAYGROUND.rocket[1] + Math.sin(a) * rad + Math.cos(a) * tan];
const rkRT = (x, z, a) => { const lx = x - PLAYGROUND.rocket[0], lz = z - PLAYGROUND.rocket[1]; return [lx * Math.cos(a) + lz * Math.sin(a), -lx * Math.sin(a) + lz * Math.cos(a)]; };   // -> out along a, and across it
const rkYaw = a => Math.atan2(-Math.cos(a), -Math.sin(a));   // (the yaw that looks out along a)
function rocketBlocked(x, z) {                    // up on a deck: the cage round you, the hatch you came up through, the ladder on up
  const k = PARK.deck, lx = x - PLAYGROUND.rocket[0], lz = z - PLAYGROUND.rocket[1], d = Math.hypot(lx, lz), W = ROCKET.walk[k];
  if (d > W && !(k === 1 && Math.abs(Math.atan2(lz, lx) - ROCKET.gate) < 0.25 && d < W + 0.3)) return true;   // (the first deck: out through the gap onto the slide)
  { const [r, t] = rkRT(x, z, ROCKET.lad[k - 1]); if (r > ROCKET.rho - 0.7 && r < ROCKET.rho + 0.17 && Math.abs(t) < 0.41) return true; }
  if (k < ROCKET.lad.length) { const [r, t] = rkRT(x, z, ROCKET.lad[k]); if (r > ROCKET.rho - 0.34 && r < ROCKET.rho + 0.4 && Math.abs(t) < 0.38) return true; }
  return false;
}
// ---- the seesaw: the plank's height along it, what it does to your feet, and the plank turning on its pipe for the weight on it ----
const seesawH = u => SEESAW.y0 + 0.023 + u * Math.tan(SEESAW.a);   // its top, u along it from the pivot
const seesawUV = (x, z) => parkLocal(x, z, SEESAW.x, SEESAW.z, SEESAW.ry);
function seesawUnder(x, z, airH) {                 // (groundUnder) the plank under your feet, if you're up to it
  const [u, v] = seesawUV(x, z); if (Math.abs(v) > 0.2 || Math.abs(u) > SEESAW.half * Math.cos(SEESAW.a)) return 0;
  const h = seesawH(u) - floorHeightAt(x, z); return h <= airH + 0.03 ? h : 0;
}
function seesawBlocks(x, z) {                      // (blocked) the plank in your way: more than a step up from your feet where you'd be
  const [u, v] = seesawUV(x, z), r = player.r, e = SEESAW.half * Math.cos(SEESAW.a);
  if (Math.abs(v) > 0.13 + r || Math.abs(u) > e + r) return false;
  const top = Math.max(seesawH(Math.max(-e, Math.min(e, u - r))), seesawH(Math.max(-e, Math.min(e, u + r))));
  return top > player.airH + floorHeightAt(x, z) + 0.3;
}
function seesawOn() {                             // stood on the plank (or stepping onto its low part): -> u, or null
  if (jump.air || mantle || fall || PARK.deck || PARK.ride || PARK.climb || player.onRoof || player.inBooth) return null;
  const [u, v] = seesawUV(player.x, player.z); if (Math.abs(v) > 0.2 || Math.abs(u) > SEESAW.half * Math.cos(SEESAW.a)) return null;
  return Math.abs(player.airH + floorHeightAt(player.x, player.z) - seesawH(u)) < 0.32 ? u : null;
}
function seesawTick(dt) {
  const S = SEESAW, R = PARK.ride, on = seesawOn(), u = on ?? (R?.kind === "seesaw" ? R.e * S.seat * Math.cos(S.a) : null);
  // the other player (store/together.js), sat on an end or stood on the plank: their weight on it too. Two sat at the ends balance it,
  // so it stays where it is till whoever's end is down pushes off: up they go, and down comes the other, to push off in their turn
  const Pp = together.peer, see = Pp?.see && performance.now() - Pp.heard < 1000 ? Pp.see : null, up = see ? (see.ride ? see.e * S.seat * Math.cos(S.a) : see.u) : null;
  let tq = 0, I = 25;                              // the plank's own (balanced on its pipe), and you, 70 kg, wherever you are along it
  for (const w of [u, up]) if (w != null) { tq += -70 * 9.81 * w * Math.cos(S.a); I += 70 * w * w; }
  if (u != null && up != null) tq += Math.sign(S.a) * 70 * 9.81 * 0.15;   // (two on it: whoever's down sits back, and it stays down till they push)
  S.w += (tq / I - 1.1 * S.w) * dt; S.a += S.w * dt;
  if (see && !together.host && Pp.seeA != null) {   // both on it: the host's seesaw is the one that counts; ours eases to it
    const k = 1 - Math.exp(-dt * 5); S.a += (Pp.seeA - S.a) * k; S.w += (Pp.seeW - S.w) * k;
  }
  if (Math.abs(S.a) > S.max) {                    // an end on the ground: a thump, and a little bounce back up
    const e = -Math.sign(S.a); S.a = Math.sign(S.a) * S.max;
    if (Math.abs(S.w) > 0.5) { const [x, z] = parkWorld(e * S.half, 0, S.x, S.z, S.ry); ambStep(x, z, Math.min(1, Math.abs(S.w) * 0.5)); }
    S.w = -S.w * (u != null && up != null ? 0.1 : 0.25);
  }
  S.tip.rotation.z = S.a;
  if (on != null) player.airH = Math.max(0, seesawH(on) - floorHeightAt(player.x, player.z));   // it takes you with it
}
function seesawSeat(e) {                           // the top of the seat on end e, in the world
  const S = SEESAW, s = e * S.seat, [x, z] = parkWorld(s * Math.cos(S.a), 0, S.x, S.z, S.ry);
  return { x, y: S.y0 + s * Math.sin(S.a) + 0.06, z, dx: -e * Math.cos(S.ry), dz: e * Math.sin(S.ry) };   // dx, dz: facing the middle
}
function seesawPush(e, theirs = false) {           // your end down on the ground: shove off with your legs (theirs: the other player's, sent over)
  if (e * SEESAW.a < -(SEESAW.max - (theirs ? 0.16 : 0.08))) SEESAW.w += e * 2.6; else return;
  if (!theirs && together.peer && together.ctl?.readyState === "open") try { together.ctl.send(JSON.stringify({ t: "seesaw", e })); } catch {}
}
// ---- the swings: a pendulum each, 2.78 m of chain. Pump as you sweep through the bottom of the arc and each one sends you higher; keep it up
// in time and you'll go level with the bar, then past it, and with enough speed right on over the top. Too slow up there and the chains go
// slack: you drop, till they catch you with a jerk. Let go at the top of the arc and you fly ----
const wrapPi = a => Math.atan2(Math.sin(a), Math.cos(a));
function swingLocal(S) {                           // the seat from the bar, in the swing's own plane: z forward, y up; and how fast it's going
  if (S.free) { const f = S.free; return { z: f.z, y: f.y, vz: f.vz, vy: f.vy, r: Math.hypot(f.z, f.y) }; }
  const L = SWING.L, c = Math.cos(S.th), s = Math.sin(S.th);
  return { z: L * s, y: -L * c, vz: L * S.w * c, vy: L * S.w * s, r: L };
}
function swingAt(S) {                              // the seat's top, the chains' line up from it and forward square to them, in the world; v: its velocity
  const c = Math.cos(S.th), s = Math.sin(S.th), sr = Math.sin(SWING.ry), cr = Math.cos(SWING.ry), Lc = swingLocal(S), [x, z] = parkWorld(S.lx, Lc.z, SWING.x, SWING.z, SWING.ry);
  return { x, y: SWING.H + Lc.y + 0.015, z, ux: -s * sr, uy: c, uz: -s * cr, fx: c * sr, fy: s, fz: c * cr, vx: Lc.vz * sr, vy: Lc.vy, vz: Lc.vz * cr, r: Lc.r };
}
function swingTick(dt) {
  const R = PARK.ride, g = 9.81, L = SWING.L, P = together.peer, n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
  SWING.seats.forEach((S, i) => {
    const on = R?.kind === "swing" && R.i === i;
    if (!on && P?.swing && P.swing.i === i && performance.now() - P.heard < 1000) {   // the other player's on this one: it goes where theirs does
      const k = 1 - Math.exp(-dt * 14), d = wrapPi(P.swing.th - S.th); S.th += d * k; S.w = d * k / Math.max(dt, 1e-4); S.free = null;
      S.g.rotation.x = -S.th; S.g.scale.y = Math.max(0.3, P.swing.r / L); return;
    }
    const gust = on ? 0 : (WX.wind || 0.15) * 0.25 * Math.sin(PARK.t * 0.8 + i * 2.3), damp = on ? 0.02 : 0.22;
    for (let k = 0; k < n; k++) {
      if (!S.free) {
        S.w += (-(g / L) * Math.sin(S.th) - damp * S.w - 0.003 * S.w * Math.abs(S.w) + gust) * h; S.th += S.w * h;
        if (L * S.w * S.w + g * Math.cos(S.th) < -SWING.stiff * g) {   // up past level and nowhere near fast enough to keep the chains tight: they go slack
          const c = Math.cos(S.th), s = Math.sin(S.th); S.free = { z: L * s, y: -L * c, vz: L * S.w * c, vy: L * S.w * s };
        }
      } else {                                      // flying on slack chains: falling, till they're taut again
        const f = S.free; f.vy -= g * h; f.z += f.vz * h; f.y += f.vy * h;
        const r = Math.hypot(f.z, f.y); S.th += wrapPi(Math.atan2(f.z, -f.y) - S.th);
        if (r >= L) {                               // caught: the chains snap tight, and take all of it but the going round
          const c = Math.cos(S.th), s = Math.sin(S.th), out = f.vz * s - f.vy * c;
          S.w = (f.vz * c + f.vy * s) / L; S.free = null;
          if (out > 0.8) { const [x, z] = parkWorld(S.lx, L * s, SWING.x, SWING.z, SWING.ry); ambStep(x, z, Math.min(1, out * 0.3)); if (on) PARK.jolt = Math.min(1, out * 0.25); }
        }
      }
    }
    const r = S.free ? Math.hypot(S.free.z, S.free.y) : L; S.g.rotation.x = -S.th; S.g.scale.y = Math.max(0.3, r / L);
    S.tuck += ((on ? (S.w > 0 ? -0.9 : 0.6) : 0.4) - S.tuck) * Math.min(1, dt * 5);   // legs out going forward, tucked under coming back
  });
}
// a pump: legs out and lean back (or the other way) as you sweep through the bottom. Timed right, through the bottom, it all goes into the
// swing; a little early or late, some of it; out at the ends of the arc, hardly any. Mashing it does nothing: once a pass is all you get
function swingPump(S) {
  if (S.free) return;
  const thw = wrapPi(S.th), sp = Math.abs(S.w), since = PARK.t - S.pumped; S.pumped = PARK.t;
  if (sp < 0.15 && Math.abs(thw) < 0.3) { S.w += (Math.sign(S.w) || 1) * 0.55; return; }   // from still: a push off the ground to get going
  const fromBottom = Math.abs(thw) / Math.max(sp, 0.3);   // (how long ago it went through the bottom, or how long till it does: seconds)
  let q = Math.max(0, Math.min(1, 1 - (fromBottom - 0.12) / 0.3));
  if (Math.cos(thw) < 0) q = 0;                    // (up over the bar: nothing to push against)
  if (since < 0.45) q = 0;                        // (again already: you're still coming out of the last one)
  S.w += Math.sign(S.w) * (0.42 + 0.15 * sp) * q;   // (going faster, you can throw more into it)
  S.lastQ = q;                                     // (the tip says how that one went)
}
function swingTip(S) {                             // on a swing: what E does, and how the last pump went
  const recent = PARK.t - S.pumped < 1.2, q = S.lastQ ?? 1, thw = Math.abs(wrapPi(S.th));
  const how = S.free ? "the chains have gone slack: hold on…" : thw > Math.PI * 0.75 ? "over the top!" : recent && q > 0.75 ? "right on time" : recent && q > 0.2 ? "a bit off: pump right as you pass the bottom" : recent ? "no good: pump as you sweep through the bottom, once a pass" : "pump as you sweep through the bottom";
  return `E — pump<div class="cat">${how} · a move key — let go</div>`;
}
// ---- the slide: s along it from the lip at the first deck, sliding on steel (a little friction), then the run-out (a lot) ----
function slideAt(s) {                              // -> [out from the rocket's middle, the chute's top, on the slope?]
  const S = ROCKET.slide, L = Math.hypot(S.run, S.drop), top = ROCKET.decks[1] + 0.02;
  return s <= L ? [S.x0 + S.run * s / L, top - S.drop * s / L, true] : [S.x0 + S.run + (s - L), top - S.drop, false];
}
// ---- the merry-go-round: a shove from the ground spins it; on it, you go round with it (stood on the deck, or holding a hoop: ROUND's ride),
// and a kick off the ground keeps it going. Off it while it's going fast and you're flung. It runs down on its old bearing ----
const roundAngle = () => ROUND.ry + ROUND.th;
function roundRider(i) {                           // holding hoop i: where your eye is (x, z), and out toward the hoop
  const a = roundAngle() + i * Math.PI / 2, [x, z] = parkWorld(0.55, 0, ROUND.x, ROUND.z, a);
  return { x, z, dx: Math.cos(a), dz: -Math.sin(a), a };
}
function roundShove(dirX, dirZ, hx, hz) {          // pushed at (hx, hz), along (dirX, dirZ)
  const rx = hx - ROUND.x, rz = hz - ROUND.z, L = Math.hypot(rx, rz) * Math.hypot(dirX, dirZ) || 1, along = (dirX * rz - dirZ * rx) / L;   // (+: the way th grows)
  const sgn = Math.abs(along) > 0.15 ? Math.sign(along) : Math.sign(ROUND.w) || 1;
  ROUND.w = Math.max(-ROUND.max, Math.min(ROUND.max, ROUND.w + sgn * 1.1 * (0.4 + 0.6 * Math.abs(along))));
  ambStep(hx, hz, 0.4);
}
function roundTick(dt) {
  const R = ROUND, w0 = R.w; R.w -= Math.sign(R.w) * Math.min(Math.abs(R.w), (0.12 + 0.05 * Math.abs(R.w)) * dt);   // (friction in the bearing)
  const d = (w0 + R.w) / 2 * dt; R.th += d; R.g.rotation.y = roundAngle();
  if (!d) return;
  if (PARK.ride?.kind === "round") { const P = roundRider(PARK.ride.i); player.x = P.x; player.z = P.z; player.airH = R.top - floorHeightAt(P.x, P.z); player.yaw += d; return; }
  if (PARK.ride || PARK.climb || PARK.deck || jump.air || mantle || fall) return;
  const rx = player.x - R.x, rz = player.z - R.z;   // just stood on the deck: it carries you round too
  if (Math.hypot(rx, rz) < 1.42 && Math.abs(player.airH + floorHeightAt(player.x, player.z) - R.top) < 0.05) {
    const c = Math.cos(d), s = Math.sin(d), nx = R.x + rx * c + rz * s, nz = R.z - rx * s + rz * c;
    player.x = nx; player.z = nz; player.yaw += d;
  }
}
// ---- getting on and off ----
function parkSit(ride) {
  me.reachTo(null); me.reachAlso(null); PARK.deck = 0; jump.air = false; jump.vx = jump.vz = 0;
  PARK.ride = { ...ride, t: 0 }; player.pitch = 0;
  if (ride.kind === "swing") player.yaw = SWING.ry + Math.PI;
  else if (ride.kind === "seesaw") { const P = seesawSeat(ride.e); player.yaw = Math.atan2(-P.dx, -P.dz); }
  else if (ride.kind === "round") { const P = roundRider(ride.i); player.yaw = Math.atan2(-P.dx, -P.dz); player.pitch = -0.15; }
  else { player.yaw = -Math.PI / 2; player.pitch = -0.3; }   // (the slide: looking down it)
}
function parkOff() {                               // a move key: off whatever you're on
  const R = PARK.ride; PARK.ride = null; PARK.tilt = 0; me.reachTo(null); me.reachAlso(null);
  const f = floorHeightAt(player.x, player.z);
  if (R.kind === "swing") {
    const S = SWING.seats[R.i], P = swingAt(S), v = Math.hypot(P.vx, P.vy, P.vz);
    if (v < 0.8 && Math.cos(S.th) > 0.8) {         // hardly moving: stand up off it
      player.x = P.x + Math.sin(SWING.ry) * 0.35; player.z = P.z + Math.cos(SWING.ry) * 0.35; player.airH = 0;
      if (blocked(player.x, player.z)) { player.x = P.x; player.z = P.z; }
      S.w *= 0.3; return;
    }
    player.x = P.x; player.z = P.z; player.airH = Math.max(0, P.y + 0.05 - f);   // let go: you go on the way the seat was going
    Object.assign(jump, { air: true, v: P.vy, vx: P.vx, vz: P.vz, peak: null, recover: 0 });
    if (S.free) { S.free.vz *= 0.6; S.free.vy *= 0.6; } else S.w *= 0.6;
  } else if (R.kind === "round") {                 // let go of the hoop: on the deck if it's slow, flung off it if it isn't
    const P = roundRider(R.i), v = Math.abs(ROUND.w) * 0.55; player.airH = ROUND.top - f;
    if (v > 1.3) { const t = Math.sign(ROUND.w) * Math.abs(ROUND.w) * 0.55, rx = P.x - ROUND.x, rz = P.z - ROUND.z, L = Math.hypot(rx, rz) || 1;
      player.x = ROUND.x + rx / L * 1.25; player.z = ROUND.z + rz / L * 1.25;   // (past the hoop, at the deck's edge, and off)
      Object.assign(jump, { air: true, v: 1.2, vx: rz / L * t + rx / L * 1.2, vz: -rx / L * t + rz / L * 1.2, peak: null, recover: 0 }); }
  } else if (R.kind === "seesaw") {                // stand up beside your end
    const P = seesawSeat(R.e), [u] = seesawUV(P.x, P.z);
    for (const side of [0.62, -0.62]) { const [x, z] = parkWorld(u, side, SEESAW.x, SEESAW.z, SEESAW.ry); player.x = x; player.z = z; player.airH = 0; if (!blocked(x, z)) break; }
  }
}
// ---- the rocket's ladders: in to the foot of it (or over the hatch, going down), up or down it rung by rung, and out onto the deck at the top ----
function parkClimb(k, dir) {
  if (dir > 0 && roofHandsFull()) { toast("Hands full: you need them both for the ladder"); return; }
  const a = ROCKET.lad[k], D = ROCKET.decks, [cx, cz] = rkAt(ROCKET.rho - 0.38, a), [ax, az] = rkAt(0.2, a + Math.PI), from = dir > 0 ? D[k] : D[k + 1], to = dir > 0 ? D[k + 1] : D[k];
  const T0 = 0.35, T1 = T0 + Math.abs(to - from) / 0.8;
  PARK.climb = { k, a, dir, t: 0, x0: player.x, z0: player.z, y0: camera.position.y, cx, cz, ax, az, from, to, T0, T1, T2: dir > 0 ? T1 + 0.45 : T1, rung: -1 };
  player.yaw = rkYaw(a); player.pitch = dir > 0 ? 0.25 : -0.45;
}
function parkClimbTick(dt) {
  const C = PARK.climb, sm = k => k * k * (3 - 2 * k); C.t += dt;
  let x = C.cx, z = C.cz, y;
  if (C.t < C.T0) { const k = sm(C.t / C.T0); x = C.x0 + (C.cx - C.x0) * k; z = C.z0 + (C.cz - C.z0) * k; y = C.y0 + (C.from + 1.65 - C.y0) * k; }
  else if (C.t < C.T1) { const k = (C.t - C.T0) / (C.T1 - C.T0); y = C.from + 1.65 + (C.to - C.from) * k - 0.025 * Math.abs(Math.sin(k * Math.abs(C.to - C.from) / 0.3 * Math.PI)); }   // (a dip at each rung)
  else { const k = sm(Math.min(1, (C.t - C.T1) / Math.max(1e-3, C.T2 - C.T1))); y = C.to + 1.65; x = C.cx + (C.ax - C.cx) * k; z = C.cz + (C.az - C.cz) * k; }
  PARK.cam.set(x, y, z);
  const base = ROCKET.decks[C.k], n = Math.max(1, Math.floor((y + 0.2 - base) / 0.3));   // a hand on the rung over your head, the other on the one under it
  if (C.t >= C.T0 && C.t < C.T1) {
    if (n !== C.rung) { if (C.rung >= 0) ambStep(x, z, 0.35); C.rung = n; }
    const hand = (m, t) => { const [hx, hz] = rkAt(ROCKET.rho - 0.03, C.a, t); return new THREE.Vector3(hx, base + 0.3 * m, hz); };
    const up = n % 2 ? 0.13 : -0.13;               // (arm 0's on your own -x: looking out along the ladder, that's across it, +)
    me.reachTo(hand(n, up), up > 0 ? 0 : 1, { lean: false }); me.reachAlso(hand(n - 1, -up), up > 0 ? 1 : 0);
  } else { me.reachTo(null); me.reachAlso(null); }
  if (C.t < C.T2) return;
  const deck = C.dir > 0 ? C.k + 1 : C.k; PARK.climb = null; PARK.deck = deck;
  player.x = C.dir > 0 ? C.ax : C.cx; player.z = C.dir > 0 ? C.az : C.cz; player.airH = Math.max(0, ROCKET.decks[deck] - floorHeightAt(player.x, player.z));
  me.reachTo(null); me.reachAlso(null); ambStep(player.x, player.z, 0.5);
}
// ---- every frame (store/main.js, before move) ----
function parkTick(dt) {
  PARK.t += dt;
  if (PARK.climb) parkClimbTick(dt);
  seesawTick(dt); swingTick(dt); roundTick(dt);
  const R = PARK.ride; PARK.tilt = 0;
  if (R) R.t += dt;
  if (R?.kind === "swing") {
    const S = SWING.seats[R.i], P = swingAt(S), hip = 0.06;
    const j = PARK.jolt * Math.sin(PARK.t * 60) * 0.05; PARK.jolt = Math.max(0, PARK.jolt - dt * 3);   // (the chains catching you: a jerk)
    PARK.cam.set(P.x + P.ux * (hip + 0.7 + j) + P.fx * 0.08, P.y + P.uy * (hip + 0.7 + j) + P.fy * 0.08, P.z + P.uz * (hip + 0.7 + j) + P.fz * 0.08);
    const thw = wrapPi(S.th), k = 0.85 + 0.15 * (thw / Math.PI) ** 2;   // (looking the way it swings, the sky and the ground come and go; all the way round, over the top)
    PARK.tilt = thw * k * Math.cos(player.yaw - SWING.ry - Math.PI);
  } else if (R?.kind === "round") {
    const P = roundRider(R.i); PARK.cam.set(P.x, ROUND.top + 1.65, P.z);
  } else if (R?.kind === "seesaw") {
    const P = seesawSeat(R.e); PARK.cam.set(P.x + P.dx * 0.08, P.y + 0.03 + 0.72, P.z + P.dz * 0.08);
  } else if (R?.kind === "slide") {
    const S = ROCKET.slide, L = Math.hypot(S.run, S.drop), beta = Math.atan2(S.drop, S.run), [, , slope] = slideAt(R.s);
    R.v = Math.max(0, R.v + (slope ? 9.81 * (Math.sin(beta) - 0.18 * Math.cos(beta)) : -9.81 * 0.75) * dt); R.s += R.v * dt;
    const [lx, y] = slideAt(Math.min(R.s, L + S.out)), [X, Z] = PLAYGROUND.rocket;
    PARK.cam.set(X + lx + 0.05, y + 0.06 + 0.72, Z); player.x = X + lx; player.z = Z;
    if (R.s >= L + S.out || (!slope && R.v === 0)) {   // off the end, or stopped on the run-out
      PARK.ride = null; player.airH = Math.max(0, y - floorHeightAt(player.x, player.z));
      if (R.v > 0) Object.assign(jump, { air: true, v: 0.3, vx: R.v, vz: 0, peak: null, recover: 0 });
    }
  }
  if (PARK.deck === 1 && !PARK.climb) {             // walked out through the gap in the bars: down the slide you go
    const lx = player.x - PLAYGROUND.rocket[0], lz = player.z - PLAYGROUND.rocket[1];
    if (Math.hypot(lx, lz) > ROCKET.walk[1] + 0.1 && Math.abs(Math.atan2(lz, lx) - ROCKET.gate) < 0.25) parkSit({ kind: "slide", s: 0, v: 0.5 });
  }
}
function parkMove(dt) {                           // (move) on a ladder, nothing; on a swing or the seesaw, a move key gets you off; down the slide, no getting off
  const R = PARK.ride;
  if (R && R.kind !== "slide" && R.t > 0.35 && PARK_MOVE.some(k => keys.has(k))) parkOff();
}
function parkBody(g) {                            // (meTick) you, on whatever it is
  const C = PARK.climb, R = PARK.ride;
  if (C) { const fx = Math.cos(C.a), fz = Math.sin(C.a); g.position.set(PARK.cam.x - fx * 0.21, PARK.cam.y - 1.65, PARK.cam.z - fz * 0.21); g.rotation.y = Math.atan2(fx, fz); me.setPose("idle"); return; }
  if (R.kind === "swing") {
    const S = SWING.seats[R.i], P = swingAt(S), hip = 0.06, hipY = 0.5, hx = P.x + P.ux * hip, hy = P.y + P.uy * hip, hz = P.z + P.uz * hip;
    g.position.set(hx - P.ux * hipY, hy - P.uy * hipY, hz - P.uz * hipY); g.rotation.y = SWING.ry; g.rotation.x = -S.th;
    me.setPose("sit", { hipY, tuck: S.tuck }); PARK.sit = { hipY, tuck: S.tuck };
    const chain = side => { const k = P.r - 0.62, [x, z] = parkWorld(S.lx + side, Math.sin(S.th) * k, SWING.x, SWING.z, SWING.ry); return new THREE.Vector3(x, SWING.H - Math.cos(S.th) * k, z); };   // both hands on the chains, about shoulder high
    me.reachTo(chain(-0.21), 0, { lean: false }); me.reachAlso(chain(0.21), 1);
  } else if (R.kind === "round") {               // stood holding the hoop, facing it
    const P = roundRider(R.i); g.position.set(P.x - P.dx * 0.21, ROUND.top, P.z - P.dz * 0.21); g.rotation.y = Math.atan2(P.dx, P.dz); me.setPose("idle");
    const grip = lz => { const [x, z] = parkWorld(0.95, lz, ROUND.x, ROUND.z, P.a); return new THREE.Vector3(x, 1.15, z); };   // (arm 0, your own -x: the hoop's +z side)
    me.reachTo(grip(0.16), 0, { lean: false }); me.reachAlso(grip(-0.16), 1);
  } else if (R.kind === "seesaw") {
    const P = seesawSeat(R.e), hipY = 0.45, S = SEESAW; g.position.set(P.x, P.y + 0.03 - hipY, P.z); g.rotation.y = Math.atan2(P.dx, P.dz);
    PARK.sit = { hipY, tuck: Math.max(-0.3, Math.min(1.2, (0.55 - P.y) * 2)) }; me.setPose("sit", PARK.sit);
    const hs = R.e * S.handle, hu = hs * Math.cos(S.a), hy = S.y0 + hs * Math.sin(S.a) + 0.28;
    const grip = v => { const [x, z] = parkWorld(hu, v, S.x, S.z, S.ry); return new THREE.Vector3(x, hy, z); };
    me.reachTo(grip(-R.e * 0.1), 0, { lean: false }); me.reachAlso(grip(R.e * 0.1), 1);
  } else {                                        // the slide: sat, legs out down it
    g.position.set(player.x, PARK.cam.y - 0.72 - 0.5, player.z); g.rotation.y = Math.PI / 2; PARK.sit = { hipY: 0.5, tuck: -0.9 }; me.setPose("sit", PARK.sit);
  }
}
// ---- the crosshair (store/checkout.js) and E (store/tv.js) ----
function parkRayBox(ray, X, Z, ry, b) {            // -> how far along the ray it meets box b ([x0, y0, z0, x1, y1, z1], in the frame at X, Z turned ry), or null
  const c = Math.cos(ry), s = Math.sin(ry), ox = ray.origin.x - X, oz = ray.origin.z - Z, dx = ray.direction.x, dz = ray.direction.z;
  const o = [ox * c - oz * s, ray.origin.y, ox * s + oz * c], d = [dx * c - dz * s, ray.direction.y, dx * s + dz * c];
  let t0 = 0, t1 = Infinity;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) { if (o[i] < b[i] || o[i] > b[i + 3]) return null; continue; }
    let p = (b[i] - o[i]) / d[i], q = (b[i + 3] - o[i]) / d[i]; if (p > q) [p, q] = [q, p];
    t0 = Math.max(t0, p); t1 = Math.min(t1, q); if (t0 > t1) return null;
  }
  return t0;
}
function parkAimTip(ray, tip) {                    // -> true if the park has the crosshair (what E does is in PARK.aim)
  PARK.aim = null;
  if (PARK.climb) { tip.style.display = "none"; return true; }
  const R = PARK.ride;
  if (R) {
    tip.innerHTML = R.kind === "swing" ? swingTip(SWING.seats[R.i])
      : R.kind === "round" ? "E — kick off the ground<div class=\"cat\">a move key — let go</div>"
      : R.kind === "seesaw" ? (R.e * SEESAW.a < -(SEESAW.max - 0.08) ? "E — push off<div class=\"cat\">a move key — get off</div>" : "On the seesaw<div class=\"cat\">a move key — get off</div>") : "";
    tip.style.display = tip.innerHTML ? "block" : "none"; return true;
  }
  const [X, Z] = PLAYGROUND.rocket;
  if (!PARK.deck && Math.hypot(player.x - 8, player.z + 30) > 20) return false;
  let best = null, bd = 2.0;
  const consider = (what, d) => { if (d != null && d < bd) { bd = d; best = what; } };
  const D = ROCKET.decks, rho = ROCKET.rho, ladBox = (k, y0, y1) => parkRayBox(ray, X, Z, -ROCKET.lad[k], [rho - 0.15, y0, -0.3, rho + 0.1, y1, 0.3]);
  if (PARK.deck) {
    const k = PARK.deck;
    if (k < ROCKET.lad.length) consider({ kind: "ladder", k, dir: 1 }, ladBox(k, D[k], D[k + 1]));
    consider({ kind: "ladder", k: k - 1, dir: -1 }, ladBox(k - 1, D[k - 1] + 0.5, D[k] + 1.05));
  } else if (Math.hypot(player.x - X, player.z - Z) < 1.3 && player.airH < 0.2) consider({ kind: "ladder", k: 0, dir: 1 }, ladBox(0, 0, D[1]));
  else {
    SWING.seats.forEach((S, i) => { if (together.peer?.swing?.i === i) return; const Lc = swingLocal(S), y = SWING.H + Lc.y, lz = Lc.z;   // (not the one the other player's on)
      consider({ kind: "swing", i }, parkRayBox(ray, SWING.x, SWING.z, SWING.ry, [S.lx - 0.3, y - 0.15, lz - 0.25, S.lx + 0.3, y + 0.35, lz + 0.25])); });
    for (let i = 0; i < 4; i++) consider({ kind: "round", i }, parkRayBox(ray, ROUND.x, ROUND.z, roundAngle() + i * Math.PI / 2, [0.78, 0.62, -0.42, 1.12, 1.25, 0.42]));   // the merry-go-round: a hoop, on you get;
    { const t = parkRayBox(ray, ROUND.x, ROUND.z, 0, [-1.42, 0.3, -1.42, 1.42, 0.5, 1.42]);                                                         // the deck's edge, a shove
      if (t != null) consider({ kind: "shove", hx: ray.origin.x + ray.direction.x * t, hz: ray.origin.z + ray.direction.z * t }, t); }
    for (const e of [-1, 1]) { if (together.peer?.see?.ride && together.peer.see.e === e) continue;   // (the other player's sat on that end)
      const s = e * SEESAW.seat, u = s * Math.cos(SEESAW.a), y = SEESAW.y0 + s * Math.sin(SEESAW.a);
      consider({ kind: "seesaw", e }, parkRayBox(ray, SEESAW.x, SEESAW.z, SEESAW.ry, [u - 0.3, y - 0.15, -0.25, u + 0.3, y + 0.3, 0.25])); }
  }
  PARK.aim = best;
  if (best?.kind === "ladder") tip.innerHTML = best.dir > 0 ? (roofHandsFull() ? "The ladder<div class=\"cat\">you'll need both hands free</div>" : best.k === ROCKET.lad.length - 1 ? "E — climb up into the nose" : "E — climb up") : "E — climb down";
  else if (best?.kind === "swing") tip.innerHTML = "E — sit on the swing";
  else if (best?.kind === "seesaw") tip.innerHTML = "E — sit on the seesaw";
  else if (best?.kind === "shove") tip.innerHTML = "E — give it a shove";
  else if (best?.kind === "round") tip.innerHTML = Math.abs(ROUND.w) > 2.5 ? "Going too fast to get on<div class=\"cat\">aim low — E slows it… or speeds it up</div>" : "E — get on<div class=\"cat\">hold on to the hoop</div>";
  else if (PARK.deck === 1 && Math.abs(Math.atan2(player.z - Z, player.x - X) - ROCKET.gate) < 0.6 && Math.hypot(player.x - X, player.z - Z) > 0.8) tip.innerHTML = "The slide<div class=\"cat\">walk on out through the gap</div>";
  else { if (!PARK.deck) return false; tip.innerHTML = ""; }
  tip.style.display = tip.innerHTML ? "block" : "none";
  return true;
}
function parkE() {                                 // -> true if E was the park's
  if (PARK.climb) return true;
  const R = PARK.ride;
  if (R) {
    if (R.kind === "swing") swingPump(SWING.seats[R.i]); else if (R.kind === "seesaw") seesawPush(R.e);
    else if (R.kind === "round") { const P = roundRider(R.i), sgn = Math.sign(ROUND.w) || 1; ROUND.w = Math.max(-ROUND.max, Math.min(ROUND.max, ROUND.w + sgn * 0.7)); ambStep(P.x, P.z, 0.4); }   // a foot down, a kick
    return true;
  }
  const A = PARK.aim; if (!A) return false;
  if (A.kind === "ladder") parkClimb(A.k, A.dir);
  else if (A.kind === "swing") parkSit({ kind: "swing", i: A.i });
  else if (A.kind === "seesaw") parkSit({ kind: "seesaw", e: A.e });
  else if (A.kind === "shove") roundShove(-Math.sin(player.yaw), -Math.cos(player.yaw), A.hx, A.hz);
  else if (A.kind === "round" && Math.abs(ROUND.w) <= 2.5) parkSit({ kind: "round", i: A.i });
  return true;
}
