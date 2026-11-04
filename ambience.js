// The store's ambience, built from the physics of each sound rather than
// recordings (a file:// page can't decode audio files through Web Audio, and
// this way nothing needs a license). Classic script, like customers.js:
// store.js starts it on the first click into the store and ticks it every frame.
//
// - Fluorescent hum: magnetic ballasts buzz at twice the 60 Hz mains (120 Hz)
//   with a stack of harmonics, plus a faint high rasp amplitude-modulated at
//   120 Hz. One source per light zone, up at the ceiling, following its switch.
// - Room tone: HVAC air, a slowly drifting low-passed brown noise.
// - Traffic, heard through the storefront glass: a distant low bed, and cars
//   passing on the road out front. Each is tire roar (pink noise, band-passed)
//   plus engine rumble (a low sawtooth, low-passed), moving past at 10-17 m/s
//   with its pitch following the Doppler shift c / (c - v_radial), then
//   muffled by the glass. Fewer at night.
// - Entry chime: two struck metal bars. A free-free bar rings at mode ratios
//   1 : 2.756 : 5.404 : 8.933; the higher modes die faster.
// - Footsteps: a heel strike (a damped low thump) and the scuff of the sole
//   (a short noise burst), soft and dark on carpet, brighter on tile.
// - Doors. A latch is a steel tongue snapping into a strike plate: a
//   millisecond of bright noise and two quick metallic modes. A closing door
//   is a wooden panel slapping its frame: the panel's low bending modes,
//   heavily damped, plus the contact noise. A hinge creak is stick-slip
//   friction: a train of tiny impulses, its rate wandering, ringing the
//   hinge's resonances. The theater's swing doors add the air the leaf pushes
//   (band-passed noise that rises with its speed) and a soft bump as the
//   spring hinges settle it.
// - The drink cooler: the gasket letting go (a low suction pop) when it opens,
//   a damped glass-door thump and bottles clinking against each other when it
//   shuts, and the compressor: an induction motor's 60 Hz hum and harmonics
//   with its fan's broadband whoosh, running while it pulls the temperature down.
// - The restroom. A flush: the flapper's thunk, the rush of water through the
//   trapway (pink noise, its band sweeping down as the bowl empties, over a low
//   rumble), the gurgle of air bubbles (each one a pitch rising as it
//   collapses, as bubbles do), then the tank refilling (a thin hiss). A
//   running tap: a steady mid-band pour with a brighter splash on the basin.
// - Rain on the roof and the glass: a dark wash of pink noise overhead and a brighter patter at the front, both
//   following how hard it's coming down. Snow mostly hushes the road.
// - People talking, with no words in it: each talker is a voice (a buzz at a speaking pitch, through two formant
//   band-passes that wander between vowels, gated into syllables with pauses between phrases), muffled and placed
//   where they stand; plus a faint general murmur that grows with the crowd.
// Everything placed in the room is HRTF-panned from where the camera is, and
// the chime, steps and doors get a little of a generated room reverb.
//
// window.StoreAmbience = { start(), tick(state), chime(x, y, z, vol), step(x, z, tile, weight), door(kind, action, x, y, z),
//   swing(key, x, y, z, speed), compressor(x, y, z, on), flush(x, y, z), water(key, x, y, z, on), setMuted(bool), muted(), onCarPass(fn), drive(dir, v) }
// One AudioContext for the whole game (this ambience, every sound effect, the TV), out through a limiter so
// sounds piling up can't clip into crackle. And kept running: a browser suspends a context made outside a
// click, or after the audio device hiccups, so any key, click or touch (or coming back to the tab) wakes it
window.StoreAudio = (() => {
  let ac = null, bus = null, busFade = null;
  const wake = () => { if (ac && ac.state !== "running" && ac.state !== "closed") ac.resume().catch(() => {}); };
  for (const e of ["pointerdown", "keydown", "touchstart"]) addEventListener(e, wake, true);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) wake(); });
  const ctx = () => {
    if (!ac) {
      ac = new AudioContext(); bus = ac.createDynamicsCompressor();
      bus.threshold.value = -6; bus.knee.value = 6; bus.ratio.value = 12; bus.attack.value = 0.003; bus.release.value = 0.2;
      busFade = ac.createGain(); bus.connect(busFade); busFade.connect(ac.destination);
      ac.onstatechange = () => { if (!document.hidden) setTimeout(wake, 250); };   // knocked off by the device: try to get back on
    }
    wake(); return ac;
  };
  return { ctx, out: () => (ctx(), bus), silence: on => { ctx(); busFade.gain.setTargetAtTime(on ? 0 : 1, ac.currentTime, 0.12); } };   // silence: everything that goes through out()
})();

window.StoreAmbience = (() => {
  let carSeen = null, lastNight = false;
  let ac = null, master, bed, room, glass, verbIn, hums = [], nextCar = 3, carT = 0, fade = 0, vol = 1, rainG = null, voices = [], crowdG = null, windG = null, units = [];   // vol: the settings' store-sounds volume
  let muted = (() => { try { return localStorage.getItem("jellybuster-ambience") === "off"; } catch { return false; } })();
  const noise = { white: null, pink: null, brown: null };

  function noiseBuffers() {                       // 4 s of each color, looped
    const n = ac.sampleRate * 4, mk = () => ac.createBuffer(1, n, ac.sampleRate);
    noise.white = mk(); noise.pink = mk(); noise.brown = mk();
    const w = noise.white.getChannelData(0), p = noise.pink.getChannelData(0), b = noise.brown.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, br = 0;
    for (let i = 0; i < n; i++) {
      const x = Math.random() * 2 - 1; w[i] = x;
      b0 = 0.99886 * b0 + x * 0.0555179; b1 = 0.99332 * b1 + x * 0.0750759; b2 = 0.96900 * b2 + x * 0.1538520;   // Paul Kellet's pink filter
      b3 = 0.86650 * b3 + x * 0.3104856; b4 = 0.55000 * b4 + x * 0.5329522; b5 = -0.7616 * b5 - x * 0.0168980;
      p[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + x * 0.5362) * 0.11; b6 = x * 0.115926;
      br = (br + 0.02 * x) / 1.02; b[i] = br * 3.5;                      // brown: leaky integral of white
    }
  }
  const loop = (buf, rate = 1) => { const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.loopStart = Math.random() * 3; s.playbackRate.value = rate; s.start(0, Math.random() * 3); return s; };
  const panner = (x, y, z, ref = 2, roll = 1) => {
    const p = ac.createPanner(); p.panningModel = "HRTF"; p.distanceModel = "inverse"; p.refDistance = ref; p.rolloffFactor = roll; p.maxDistance = 200;
    p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; return p;
  };
  function reverb() {                             // a small store: RT60 ~0.6 s, darker as it decays (air and soft furnishings soak the highs)
    const len = Math.floor(ac.sampleRate * 1.2), buf = ac.createBuffer(2, len, ac.sampleRate), tau = 0.6 / 6.9;
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch); let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / ac.sampleRate, k = Math.min(0.95, 0.35 + t * 1.2);   // one-pole low-pass that closes as the tail goes on
        lp = lp * k + (Math.random() * 2 - 1) * (1 - k);
        d[i] = lp * Math.exp(-t / tau) * (t < 0.004 ? t / 0.004 : 1);
      }
      for (const [at, g] of [[0.011, 0.5], [0.017, 0.35], [0.026, 0.28], [0.034, 0.2]]) d[Math.floor(at * ac.sampleRate) + ch * 7] += g * (ch ? -1 : 1);   // a few early reflections off the shelves and walls
    }
    const c = ac.createConvolver(); c.buffer = buf; return c;
  }

  function start() {
    if (ac) { ac.resume(); return; }
    try { ac = StoreAudio.ctx(); } catch { return; }
    noiseBuffers();
    master = ac.createGain(); master.gain.value = 0; master.connect(StoreAudio.out());
    bed = ac.createGain(); bed.gain.value = 1; bed.connect(master);          // things in the room
    const verb = reverb(), verbOut = ac.createGain(); verbOut.gain.value = 0.35; verbIn = ac.createGain();
    verbIn.connect(verb).connect(verbOut).connect(master);
    // outside: everything through the storefront glass (the thin, heavy-low-mids sound of a street heard indoors)
    glass = ac.createBiquadFilter(); glass.type = "lowpass"; glass.frequency.value = 650; glass.Q.value = 0.5;
    const glassG = ac.createGain(); glassG.gain.value = 0.45; glass.connect(glassG).connect(bed);
    // rain: a dark wash on the roof (overhead, everywhere) and a brighter patter on the storefront glass
    {
      const roof = loop(noise.pink), lp = ac.createBiquadFilter(), g = ac.createGain(); lp.type = "lowpass"; lp.frequency.value = 900; g.gain.value = 0;
      roof.connect(lp).connect(g).connect(bed);
      const pat = loop(noise.white), bp = ac.createBiquadFilter(), am = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain(), g2 = ac.createGain(), p = panner(1.5, 1.6, -0.3, 3, 0.8);
      bp.type = "bandpass"; bp.frequency.value = 3800; bp.Q.value = 0.8; lfo.type = "sawtooth"; lfo.frequency.value = 13; lg.gain.value = 0.4; am.gain.value = 0.6; lfo.connect(lg).connect(am.gain); lfo.start();
      g2.gain.value = 0; pat.connect(bp).connect(am).connect(g2).connect(p).connect(bed);
      rainG = { roof: g, pat: g2 };
    }
    // wind: a low rumble round the building and a howl whose pitch wanders with the gusts. Faint through the walls,
    // all of it out on the roof
    {
      const rum = loop(noise.brown, 0.7), lp = ac.createBiquadFilter(), how = loop(noise.pink), bp = ac.createBiquadFilter(), lfo = ac.createOscillator(), lg = ac.createGain(), hg = ac.createGain(), g = ac.createGain();
      lp.type = "lowpass"; lp.frequency.value = 260; bp.type = "bandpass"; bp.frequency.value = 520; bp.Q.value = 2.2;
      lfo.frequency.value = 0.09; lg.gain.value = 240; lfo.connect(lg).connect(bp.frequency); lfo.start();
      hg.gain.value = 0.55; g.gain.value = 0;
      rum.connect(lp).connect(g); how.connect(bp).connect(hg).connect(g); g.connect(bed); windG = g;
    }
    // the crowd: a faint general murmur (voiced noise in the speech band, slowly breathing) that grows with the number of people in
    {
      const s = loop(noise.pink, 0.9), f1 = ac.createBiquadFilter(), f2 = ac.createBiquadFilter(), am = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain(), g = ac.createGain();
      f1.type = "bandpass"; f1.frequency.value = 520; f1.Q.value = 1.4; f2.type = "lowpass"; f2.frequency.value = 1400;
      lfo.frequency.value = 0.9; lg.gain.value = 0.35; am.gain.value = 0.65; lfo.connect(lg).connect(am.gain); lfo.start();
      g.gain.value = 0; s.connect(f1).connect(f2).connect(am).connect(g).connect(bed); g.connect(verbIn); crowdG = g;
    }
    // room tone: air from the vents, drifting slowly
    {
      const s = loop(noise.brown), lp = ac.createBiquadFilter(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
      lp.type = "lowpass"; lp.frequency.value = 320; g.gain.value = 0.02;
      lfo.frequency.value = 0.07; lg.gain.value = 0.006; lfo.connect(lg).connect(g.gain); lfo.start();
      s.connect(lp).connect(g).connect(bed); room = g;
    }
    // traffic bed: the road, far off, through the glass
    {
      const s = loop(noise.brown, 0.8), lp = ac.createBiquadFilter(), g = ac.createGain(), p = panner(0, 1.5, -20, 6, 0.6), lfo = ac.createOscillator(), lg = ac.createGain();
      lp.type = "lowpass"; lp.frequency.value = 420; g.gain.value = 0.12;
      lfo.frequency.value = 0.031; lg.gain.value = 0.05; lfo.connect(lg).connect(g.gain); lfo.start();
      s.connect(lp).connect(g).connect(p).connect(glass); bed.traffic = g;
    }
  }
  // one fluorescent zone: 120 Hz and harmonics (magnetostriction in the ballast), and the faint rasp of the arc
  function hum(x, y, z) {
    const wave = ac.createPeriodicWave(new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0]), new Float32Array([0, 1, 0.55, 0.32, 0.22, 0.12, 0.09, 0.05, 0.03]));
    const o = ac.createOscillator(); o.setPeriodicWave(wave); o.frequency.value = 120 * (1 + (Math.random() - 0.5) * 0.002); o.start();
    const rasp = loop(noise.white), bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 3200 + Math.random() * 1200; bp.Q.value = 1.2;
    const am = ac.createGain(); am.gain.value = 0; const mod = ac.createOscillator(); mod.frequency.value = 120; const modG = ac.createGain(); modG.gain.value = 0.5; mod.connect(modG).connect(am.gain); mod.start();
    const raspG = ac.createGain(); raspG.gain.value = 0.35;
    const g = ac.createGain(); g.gain.value = 0; const p = panner(x, y, z, 1.5, 1.4);
    o.connect(g); rasp.connect(bp).connect(am).connect(raspG).connect(g); g.connect(p).connect(bed);
    return g;
  }
  // one talker: a buzz at a speaking pitch through two wandering formants, gated into syllables (no words: just talk)
  function voice() {
    const f0 = 95 + Math.random() * 140, src = ac.createOscillator(); src.type = "sawtooth"; src.frequency.value = f0; src.start();
    const vib = ac.createOscillator(), vg = ac.createGain(); vib.frequency.value = 4 + Math.random() * 2; vg.gain.value = f0 * 0.02; vib.connect(vg).connect(src.frequency); vib.start();
    const a = ac.createBiquadFilter(), b = ac.createBiquadFilter(); a.type = b.type = "bandpass"; a.Q.value = 5; b.Q.value = 7; a.frequency.value = 600; b.frequency.value = 1500;
    const sum = ac.createGain(), lp = ac.createBiquadFilter(), env = ac.createGain(), out = ac.createGain(), p = panner(0, 1.55, 0, 1.6, 1.3);
    lp.type = "lowpass"; lp.frequency.value = 1700; env.gain.value = 0; out.gain.value = 0;
    src.connect(a).connect(sum); src.connect(b).connect(sum); sum.connect(lp).connect(env).connect(out).connect(p); p.connect(bed); p.connect(verbIn);
    return { f0, src, a, b, env, out, p, next: 0, on: false };
  }
  const VOWELS = [[730, 1090], [530, 1840], [270, 2290], [570, 840], [300, 870], [660, 1720], [490, 1350]];
  function talk(v, t, x, z, gain) {               // keep this talker going: the next syllable, or a breath between phrases
    v.p.positionX.setTargetAtTime(x, t, 0.05); v.p.positionZ.setTargetAtTime(z, t, 0.05); v.out.gain.setTargetAtTime(gain, t, 0.2);
    if (t < v.next) return;
    if (Math.random() < 0.12) { v.env.gain.setTargetAtTime(0, t, 0.04); v.next = t + 0.35 + Math.random() * 1.1; return; }   // a pause
    const [f1, f2] = VOWELS[Math.floor(Math.random() * VOWELS.length)], len = 0.09 + Math.random() * 0.17;
    v.a.frequency.setTargetAtTime(f1 * (v.f0 > 170 ? 1.15 : 1), t, 0.03); v.b.frequency.setTargetAtTime(f2 * (v.f0 > 170 ? 1.15 : 1), t, 0.03);
    v.src.frequency.setTargetAtTime(v.f0 * (0.88 + Math.random() * 0.3), t, 0.06);   // the pitch rising and falling with the phrase
    v.env.gain.setTargetAtTime(0.7 + Math.random() * 0.3, t, 0.02); v.env.gain.setTargetAtTime(0.08, t + len * 0.7, 0.03);
    v.next = t + len;
  }
  // a car going by on the road out front, left to right or right to left
  function car(night, o) {                        // (a random one tells store.js, so it can drive one past: onCarPass; o: store.js's own, { dir, v })
    const t0 = ac.currentTime + 0.05, v = o?.v ?? 10 + Math.random() * 7, dir = o?.dir ?? (Math.random() < 0.5 ? 1 : -1), span = 70, dur = span / v, zRoad = dir > 0 ? -10.8 : -12.8;   // right-hand lanes
    if (!o) carSeen?.({ dir, v, z: zRoad, span });
    const p = panner(-dir * span / 2, 0.6, zRoad, 5, 1);
    p.positionX.setValueAtTime(-dir * span / 2, t0); p.positionX.linearRampToValueAtTime(dir * span / 2, t0 + dur);
    const N = 64, dopp = new Float32Array(N), c = 343;       // pitch factor over the pass, heard from about the middle of the store
    for (let i = 0; i < N; i++) { const x = -dir * span / 2 + dir * span * i / (N - 1), d = Math.hypot(x, zRoad - 8), vr = -dir * v * x / d; dopp[i] = c / (c - vr); }
    const g = ac.createGain(); g.gain.value = (night ? 0.7 : 1) * (0.7 + Math.random() * 0.5);
    // tires on asphalt
    const tire = loop(noise.pink), tf = ac.createBiquadFilter(); tf.type = "bandpass"; tf.Q.value = 0.8; const f0 = 700 + v * 25;
    tf.frequency.setValueCurveAtTime(dopp.map(k => f0 * k), t0, dur); tire.connect(tf).connect(g);
    // engine: a low sawtooth rumble
    const eng = ac.createOscillator(), ef = ac.createBiquadFilter(), eg = ac.createGain(); eng.type = "sawtooth"; ef.type = "lowpass"; ef.frequency.value = 180; eg.gain.value = 0.35;
    const e0 = 38 + Math.random() * 20; eng.frequency.setValueCurveAtTime(dopp.map(k => e0 * k), t0, dur); eng.connect(ef).connect(eg).connect(g); eng.start(t0);
    g.connect(p).connect(glass);
    const end = t0 + dur + 0.1; tire.stop(end); eng.stop(end);
  }

  function tick(s) {                               // s: { dt, cam: {x,y,z,fx,fy,fz}, zones: [{x,y,z,level}], night: 0..1, active }
    if (!ac) return;
    const t = ac.currentTime, L = ac.listener;
    if (L.positionX) { L.positionX.setTargetAtTime(s.cam.x, t, 0.02); L.positionY.setTargetAtTime(s.cam.y, t, 0.02); L.positionZ.setTargetAtTime(s.cam.z, t, 0.02);
      L.forwardX.setTargetAtTime(s.cam.fx, t, 0.02); L.forwardY.setTargetAtTime(s.cam.fy, t, 0.02); L.forwardZ.setTargetAtTime(s.cam.fz, t, 0.02); }
    else { L.setPosition(s.cam.x, s.cam.y, s.cam.z); L.setOrientation(s.cam.fx, s.cam.fy, s.cam.fz, 0, 1, 0); }
    const want = s.active && !muted ? 1 : 0;        // quiet on the title screen, and when muted
    if (want !== fade) { fade = want; master.gain.setTargetAtTime(want * 0.9 * vol, t, 0.4); }
    while (hums.length < s.zones.length) { const z = s.zones[hums.length]; hums.push(hum(z.x, z.y, z.z)); }
    s.zones.forEach((z, i) => hums[i].gain.setTargetAtTime(z.level * 0.0045, t, 0.08));   // follows the switch (and the flicker as it strikes)
    bed.traffic.gain.setTargetAtTime((0.05 + 0.08 * (1 - s.night)) * (1 - 0.6 * (s.snow || 0)), t, 1);   // (snow hushes the road)
    const wind = (s.wind || 0) * (0.55 + 0.9 * (s.gust || 0)); windG.gain.setTargetAtTime(wind * (s.outdoors ? 0.11 : 0.012), t, 0.35);
    const rain = s.rain || 0; rainG.roof.gain.setTargetAtTime(0.05 * rain, t, 0.8); rainG.pat.gain.setTargetAtTime(0.02 * rain * rain, t, 0.8);
    (s.units || []).forEach((u, i) => {             // the rooftop AC units: a fan's rush and the compressor's drone, loud out on the roof, a faint rumble through the ceiling
      if (!units[i]) units[i] = rooftop(u.x, u.y, u.z);
      units[i].gain.setTargetAtTime(u.on ? (s.outdoors ? 0.05 : 0.004) : 0, t, u.on ? 0.6 : 1.2);
    });
    const tk = s.talk || { at: [], crowd: 0 };
    crowdG.gain.setTargetAtTime(Math.min(0.012, Math.max(0, tk.crowd - 1) * 0.0022), t, 1.5);
    while (voices.length < tk.at.length) voices.push(voice());
    voices.forEach((v, i) => { const w = tk.at[i]; if (w) talk(v, t, w.x, w.z, 0.012); else { v.out.gain.setTargetAtTime(0, t, 0.3); v.env.gain.setTargetAtTime(0, t, 0.1); } });
    if (!s.active) return;
    lastNight = s.night > 0.6;
    if ((carT += s.dt) >= nextCar) { carT = 0; nextCar = s.night > 0.6 ? 25 + Math.random() * 50 : 5 + Math.random() * 14; car(s.night > 0.6); }
  }
  function chime(x, y, z, vol = 1) {               // ding... dong (vol: how much of it gets to wherever you are)
    if (!ac || muted || vol <= 0) return;
    const p = panner(x, y, z, 2, 1), out = ac.createGain(); out.gain.value = 0.12 * vol; out.connect(p); p.connect(bed); p.connect(verbIn);
    [[659.3, 0], [523.3, 0.55]].forEach(([f, at]) => {
      const t0 = ac.currentTime + at;
      [[1, 1, 1.4], [2.756, 0.45, 0.6], [5.404, 0.22, 0.3], [8.933, 0.1, 0.15]].forEach(([r, a, tau]) => {   // bar modes: ratio, strength, decay time
        const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f * r;
        g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(a, t0 + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t0 + tau * 5);
        o.connect(g).connect(out); o.start(t0); o.stop(t0 + tau * 5 + 0.05);
      });
    });
  }
  function step(x, z, tile, weight = 1) {          // heel strike + sole scuff
    if (!ac || muted || fade === 0) return;
    const t0 = ac.currentTime + Math.random() * 0.01, p = panner(x, 0.05, z, 1.2, 1.6), out = ac.createGain();
    out.gain.value = (tile ? 0.16 : 0.09) * weight * (0.8 + Math.random() * 0.4); out.connect(p); p.connect(bed); p.connect(verbIn);
    const th = ac.createOscillator(), tg = ac.createGain(); th.frequency.setValueAtTime(tile ? 140 : 95, t0); th.frequency.exponentialRampToValueAtTime(55, t0 + 0.06);
    tg.gain.setValueAtTime(0, t0); tg.gain.linearRampToValueAtTime(tile ? 0.5 : 0.8, t0 + 0.004); tg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
    th.connect(tg).connect(out); th.start(t0); th.stop(t0 + 0.12);
    const n = ac.createBufferSource(); n.buffer = noise.white; const nf = ac.createBiquadFilter(), ng = ac.createGain();
    nf.type = tile ? "bandpass" : "lowpass"; nf.frequency.value = tile ? 2400 + Math.random() * 800 : 600 + Math.random() * 300; nf.Q.value = tile ? 0.9 : 0.7;
    ng.gain.setValueAtTime(0, t0); ng.gain.linearRampToValueAtTime(tile ? 0.9 : 0.6, t0 + 0.006); ng.gain.exponentialRampToValueAtTime(0.0001, t0 + (tile ? 0.07 : 0.12));
    n.connect(nf).connect(ng).connect(out); n.start(t0, Math.random() * 3); n.stop(t0 + 0.15);
  }
  // ---- doors ----
  function spot(x, y, z, gain, ref = 1.5) {        // an output placed in the room, with a little reverb
    const p = panner(x, y, z, ref, 1.3), out = ac.createGain(); out.gain.value = gain; out.connect(p); p.connect(bed); p.connect(verbIn); return out;
  }
  function burst(out, t0, { dur, type, f, q = 0.8, amp = 1 }) {   // a short shaped noise burst
    const n = ac.createBufferSource(); n.buffer = noise.white; const bf = ac.createBiquadFilter(), g = ac.createGain();
    bf.type = type; bf.frequency.value = f; bf.Q.value = q;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(amp, t0 + Math.min(0.002, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    n.connect(bf).connect(g).connect(out); n.start(t0, Math.random() * 3); n.stop(t0 + dur + 0.02);
  }
  function modes(out, t0, list) {                   // decaying sinusoids: [frequency, amplitude, decay time]
    for (const [f, a, tau] of list) {
      const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.02);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(a, t0 + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t0 + tau * 6);
      o.connect(g).connect(out); o.start(t0); o.stop(t0 + tau * 6 + 0.02);
    }
  }
  const latch = (out, t0, k = 1) => { burst(out, t0, { dur: 0.012, type: "bandpass", f: 4200, q: 1.5, amp: 0.8 * k }); modes(out, t0, [[2300, 0.25 * k, 0.012], [3900, 0.15 * k, 0.008]]); };
  const panel = (out, t0, k = 1, lo = 1) => {       // a wooden door meeting its frame
    burst(out, t0, { dur: 0.05, type: "lowpass", f: 1400, amp: 0.7 * k });
    modes(out, t0, [[72 * lo, 0.9 * k, 0.05], [148 * lo, 0.5 * k, 0.035], [231 * lo, 0.3 * k, 0.025], [340 * lo, 0.18 * k, 0.018]]);
  };
  function creak(out, t0, dur) {                    // stick-slip: impulses at a wandering rate, ringing the hinge's resonances
    const n = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    let ph = 0, rate = 25 + Math.random() * 20;
    for (let i = 0; i < n; i++) {
      rate += (Math.random() - 0.5) * 0.9; rate = Math.max(12, Math.min(90, rate + (i / n < 0.5 ? 0.004 : -0.004) * 40));
      ph += rate / ac.sampleRate; if (ph >= 1) { ph -= 1; d[i] = 0.9 * (0.6 + Math.random() * 0.4); }
      const env = Math.sin(Math.PI * i / n); d[i] *= env;
    }
    const src = ac.createBufferSource(); src.buffer = buf;
    for (const [f, q, a] of [[720 + Math.random() * 200, 18, 1], [1580 + Math.random() * 300, 22, 0.6], [2900, 25, 0.3]]) {
      const bp = ac.createBiquadFilter(), g = ac.createGain(); bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = q; g.gain.value = a * 4;
      src.connect(bp).connect(g).connect(out);
    }
    src.start(t0);
  }
  function door(kind, action, x, y, z) {           // kind: "wood" | "push" | "cooler"; action: "open" | "close" | "rattle" | "settle"
    if (!ac || muted || fade === 0) return;
    const t0 = ac.currentTime + 0.01;
    if (kind === "wood") {
      const out = spot(x, y, z, action === "open" ? 0.8 : 0.6);   // (a latch alone is small: give it some presence)
      if (action === "open") { latch(out, t0); if (Math.random() < 0.55) creak(out, t0 + 0.08, 0.35 + Math.random() * 0.4); }
      else if (action === "close") { panel(out, t0, 1); latch(out, t0 + 0.018, 1.1); }
      else if (action === "rattle") for (let i = 0; i < 5; i++) { const t = t0 + i * 0.06 + Math.random() * 0.02; latch(out, t, 0.6); panel(out, t, 0.12, 1.3); }
    } else if (kind === "push") {
      const out = spot(x, y, z, 0.5);
      if (action === "open") { panel(out, t0, 0.25, 1.8); if (Math.random() < 0.3) creak(out, t0 + 0.05, 0.25); }   // a hand on the push plate (and now and then the spring hinge)
      else if (action === "settle") panel(out, t0, 0.3, 1.2);
    } else if (kind === "cooler") {
      const out = spot(x, y, z, 0.2);
      if (action === "open") { burst(out, t0, { dur: 0.06, type: "lowpass", f: 260, amp: 0.9 }); modes(out, t0 + 0.03, [[2600, 0.05, 0.05], [3300, 0.04, 0.04]]); }   // the gasket letting go
      else if (action === "close") {
        burst(out, t0, { dur: 0.04, type: "lowpass", f: 900, amp: 0.6 }); modes(out, t0, [[120, 0.5, 0.03], [310, 0.25, 0.02], [980, 0.08, 0.015]]);   // glass door into the gasket
        for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {   // bottles touching
          const f = 1900 + Math.random() * 2600; modes(out, t0 + 0.03 + Math.random() * 0.15, [[f, 0.12, 0.05 + Math.random() * 0.04], [f * 2.3, 0.05, 0.03]]);
        }
      }
    }
  }
  const swings = new Map();
  function swing(key, x, y, z, speed) {             // the air a swinging leaf pushes: rises with its speed (rad/s)
    if (!ac) return;
    let w = swings.get(key);
    if (!w) {
      const s = loop(noise.pink), bp = ac.createBiquadFilter(), g = ac.createGain(), p = panner(x, y, z, 1.5, 1.3);
      bp.type = "bandpass"; bp.Q.value = 0.9; g.gain.value = 0; s.connect(bp).connect(g).connect(p).connect(bed);
      swings.set(key, w = { bp, g });
    }
    const k = Math.min(1, speed / 3), t = ac.currentTime;
    w.g.gain.setTargetAtTime(0.2 * k * k, t, 0.05); w.bp.frequency.setTargetAtTime(350 + 900 * k, t, 0.05);
  }
  function rooftop(x, y, z) {
    const p = panner(x, y, z, 2.5, 1.1), g = ac.createGain(); g.gain.value = 0; g.connect(p).connect(bed);
    const m = ac.createOscillator(), mf = ac.createBiquadFilter(), mg = ac.createGain(); m.type = "sawtooth"; m.frequency.value = 58.8 + Math.random(); mf.type = "lowpass"; mf.frequency.value = 220; mg.gain.value = 0.35; m.connect(mf).connect(mg).connect(g); m.start();
    const fan = loop(noise.pink), fb = ac.createBiquadFilter(), fg = ac.createGain(); fb.type = "bandpass"; fb.frequency.value = 620; fb.Q.value = 0.5; fg.gain.value = 0.7; fan.connect(fb).connect(fg).connect(g);
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 7.5 + Math.random(); lg.gain.value = 0.12; lfo.connect(lg).connect(fg.gain); lfo.start();   // the blades' beat
    return g;
  }
  let comp = null;
  function compressor(x, y, z, on) {                // the cooler's compressor and condenser fan
    if (!ac) return;
    if (!comp) {
      const p = panner(x, y, z, 1.2, 1.4), g = ac.createGain(); g.gain.value = 0; g.connect(p).connect(bed);
      const wave = ac.createPeriodicWave(new Float32Array(7), new Float32Array([0, 1, 0.7, 0.35, 0.22, 0.1, 0.06]));
      const m = ac.createOscillator(); m.setPeriodicWave(wave); m.frequency.value = 59.6; const mg = ac.createGain(); mg.gain.value = 0.6; m.connect(mg).connect(g); m.start();   // (under load it slips a little below 60)
      const fan = loop(noise.pink), fb = ac.createBiquadFilter(), fg = ac.createGain(); fb.type = "bandpass"; fb.frequency.value = 850; fb.Q.value = 0.6; fg.gain.value = 0.5; fan.connect(fb).connect(fg).connect(g);
      comp = { g, on: false };
    }
    if (on !== comp.on) { comp.on = on; comp.g.gain.setTargetAtTime(on ? 0.012 : 0, ac.currentTime, on ? 0.35 : 0.8); }   // spins up, winds down
  }
  // ---- the restroom ----
  function flush(x, y, z) {
    if (!ac || muted || fade === 0) return;
    const t0 = ac.currentTime + 0.02, out = spot(x, y, z, 0.3, 1.2);
    panel(out, t0, 0.35, 2.2);                      // the lever and flapper
    const rush = loop(noise.pink), bp = ac.createBiquadFilter(), rg = ac.createGain();
    bp.type = "bandpass"; bp.Q.value = 0.7; bp.frequency.setValueAtTime(1900, t0); bp.frequency.exponentialRampToValueAtTime(420, t0 + 3.2);
    rg.gain.setValueAtTime(0, t0); rg.gain.linearRampToValueAtTime(0.9, t0 + 0.18); rg.gain.setTargetAtTime(0, t0 + 1.6, 0.9);
    rush.connect(bp).connect(rg).connect(out); rush.stop(t0 + 6);
    const rum = loop(noise.brown), lp = ac.createBiquadFilter(), ug = ac.createGain(); lp.type = "lowpass"; lp.frequency.value = 240;
    ug.gain.setValueAtTime(0, t0); ug.gain.linearRampToValueAtTime(0.6, t0 + 0.3); ug.gain.setTargetAtTime(0, t0 + 1.8, 0.8);
    rum.connect(lp).connect(ug).connect(out); rum.stop(t0 + 6);
    for (let i = 0; i < 14; i++) {                  // air bubbles through the trap as it siphons
      const tb = t0 + 1.2 + Math.random() * 2.4, f = 260 + Math.random() * 420, o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(f, tb); o.frequency.exponentialRampToValueAtTime(f * 2.6, tb + 0.05);
      g.gain.setValueAtTime(0, tb); g.gain.linearRampToValueAtTime(0.18, tb + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, tb + 0.07);
      o.connect(g).connect(out); o.start(tb); o.stop(tb + 0.09);
    }
    const hiss = loop(noise.white), hp = ac.createBiquadFilter(), hg = ac.createGain(); hp.type = "highpass"; hp.frequency.value = 2200;
    hg.gain.setValueAtTime(0, t0 + 3); hg.gain.linearRampToValueAtTime(0.06, t0 + 3.6); hg.gain.setValueAtTime(0.06, t0 + 10); hg.gain.linearRampToValueAtTime(0, t0 + 12);   // the tank refilling
    hiss.connect(hp).connect(hg).connect(out); hiss.stop(t0 + 12.2);
  }
  function bag(x, y, z) {                           // a full liner pulled out and tied off: plastic crinkle, the can rocking back
    if (!ac || muted || fade === 0) return;
    const t0 = ac.currentTime + 0.01, out = spot(x, y, z, 0.35);
    for (let i = 0; i < 28; i++) burst(out, t0 + Math.random() * 0.75, { dur: 0.01 + Math.random() * 0.03, type: "highpass", f: 2500 + Math.random() * 4000, q: 0.7, amp: 0.2 + Math.random() * 0.5 });
    burst(out, t0 + 0.8, { dur: 0.08, type: "lowpass", f: 500, amp: 0.5 });
  }
  function chute(x, y, z, bags) {                   // the hopper door tipping open, the bag(s) in and away down the duct, the door slapping shut
    if (!ac || muted || fade === 0) return;
    const t0 = ac.currentTime + 0.01, out = spot(x, y, z, 0.5);
    const clank = (t, k) => { burst(out, t, { dur: 0.05, type: "bandpass", f: 1800, q: 1.2, amp: 0.6 * k }); modes(out, t, [[310, 0.45 * k, 0.05], [742, 0.3 * k, 0.04], [1660, 0.18 * k, 0.03], [3120, 0.08 * k, 0.02]]); };
    clank(t0 + 0.28, 0.5);                          // open, on its stop
    for (let i = 0; i < bags; i++) {
      const tb = t0 + 0.38 + i * 0.22;
      burst(out, tb, { dur: 0.12, type: "lowpass", f: 700, amp: 0.7 });          // onto the hopper's floor
      const rush = loop(noise.brown), bp = ac.createBiquadFilter(), g = ac.createGain();   // sliding off down the duct, falling away
      bp.type = "bandpass"; bp.Q.value = 1.2; bp.frequency.setValueAtTime(900, tb + 0.05); bp.frequency.exponentialRampToValueAtTime(110, tb + 1.8);
      g.gain.setValueAtTime(0, tb + 0.05); g.gain.linearRampToValueAtTime(0.9, tb + 0.2); g.gain.exponentialRampToValueAtTime(0.001, tb + 2.0);
      rush.connect(bp).connect(g).connect(out); rush.stop(tb + 2.2);
      for (let j = 0; j < 5; j++) modes(out, tb + 0.25 + j * 0.28 + Math.random() * 0.1, [[180 - j * 15, 0.25 * (1 - j / 6), 0.06], [410 - j * 30, 0.12 * (1 - j / 6), 0.04]]);   // knocking the duct on the way down
      modes(out, tb + 2.1, [[55, 0.25, 0.08], [90, 0.15, 0.06]]);   // into the dumpster, far below
    }
    clank(t0 + 1.3, 1);                             // shut
  }
  const taps = new Map();
  function water(key, x, y, z, on) {                // a running tap
    if (!ac) return;
    let w = taps.get(key);
    if (!w) {
      const out = spot(x, y, z, 0, 1.2), pour = loop(noise.pink), pb = ac.createBiquadFilter(), splash = loop(noise.white), sb = ac.createBiquadFilter(), sg = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
      pb.type = "bandpass"; pb.frequency.value = 1100; pb.Q.value = 0.5; pour.connect(pb).connect(out);
      sb.type = "bandpass"; sb.frequency.value = 3800; sb.Q.value = 0.9; sg.gain.value = 0.35; lfo.frequency.value = 7.3; lg.gain.value = 0.15; lfo.connect(lg).connect(sg.gain); lfo.start();
      splash.connect(sb).connect(sg).connect(out);
      taps.set(key, w = out);
    }
    w.gain.setTargetAtTime(on && !muted ? 0.14 : 0, ac.currentTime, on ? 0.05 : 0.12);
  }
  function setMuted(b) { muted = b; try { localStorage.setItem("jellybuster-ambience", b ? "off" : "on"); } catch {} if (master) master.gain.setTargetAtTime(b ? 0 : fade * 0.9 * vol, ac.currentTime, 0.2); }
  function setVolume(v) { vol = Math.max(0, Math.min(1, v)); if (master) master.gain.setTargetAtTime(muted ? 0 : fade * 0.9 * vol, ac.currentTime, 0.1); }
  return { start, tick, chime, step, door, swing, compressor, flush, water, bag, chute, setMuted, setVolume, muted: () => muted, onCarPass: f => { carSeen = f; }, drive: (dir, v) => { if (ac && !muted && fade) car(lastNight, { dir, v }); } };
})();
