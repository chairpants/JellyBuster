// ---- Tony's light: the place is lit on purpose, by the fixtures you can see. A table of lights in the shader (no light
// objects, so the store's programs never recompile): a shaded pendant over each table, two over the counter, the heat
// lamps at the pass, each cabinet's screen, the neon; in the kitchen the tubes, the hood, the oven's mouth; out back the
// one bad bulb. They stop at the wall between the rooms; a pendant's table throws its shadow on the floor; the sun comes
// in through the actual windows, under the actual awning. tonyKit() bakes everything that doesn't move into one mesh
// with its color in the vertices, so however much is in here it's a handful of draws ----
const TONY_LIGHTS = [
  // x, y, z, reach; color, power; cone: cos where it starts, cos where it's full (0, 0: all round)
  ...[[16.9, 1.6], [19.1, 1.6], [16.9, 4.2], [19.1, 4.2]].map(([x, z]) => ({ p: [x, 2.02, z], r: 5, c: 0xffbe78, i: 4.6, cone: [0.42, 0.8], on: 1 })),   // 0-3: the tables
  { p: [15.0, 2.25, 7.45], r: 5, c: 0xffcf96, i: 4.4, cone: [0.42, 0.8], on: 1 }, { p: [17.5, 2.25, 7.45], r: 5, c: 0xffcf96, i: 4.4, cone: [0.42, 0.8], on: 1 },   // 4, 5: the counter
  { p: [16.2, 2.02, 9.46], r: 2.6, c: 0xff7a30, i: 1.8, cone: [0.45, 0.85], on: 1 },    // 6: the heat lamps at the pass
  { p: [14.15, 1.3, 3.2], r: 1.9, c: 0x4cff78, i: 0.55, cone: [0, 0], on: 0 }, { p: [14.15, 1.3, 4.15], r: 1.9, c: 0x9ab8ff, i: 0.55, cone: [0, 0], on: 0 }, { p: [14.15, 1.3, 5.1], r: 1.9, c: 0xffa040, i: 0.55, cone: [0, 0], on: 0 },   // 7-9: the screens (always on: they're never unplugged)
  { p: [17.1, 1.8, 0.35], r: 3.4, c: 0xff4468, i: 0.9, cone: [0, 0], on: 1 }, { p: [14.2, 1.75, 0.35], r: 2.6, c: 0xffa030, i: 0.7, cone: [0, 0], on: 1 },   // 10, 11: the neon
  { p: [16.2, 1.6, 9.5], r: 3.2, c: 0xfff0d0, i: 0.5, cone: [0, 0], on: 1 },             // 12: the kitchen's light, out through the hole
  // the kitchen
  { p: [15.9, 2.92, 11.1], r: 6, c: 0xe8f4ff, i: 2.2, cone: [0.05, 0.6], on: 1 }, { p: [19.0, 2.92, 11.8], r: 6, c: 0xdcf0e8, i: 1.9, cone: [0.05, 0.6], on: 1 },   // 13, 14: the tubes
  { p: [15.9, 2.1, 12.75], r: 3.2, c: 0xfff1c8, i: 2.6, cone: [0.35, 0.8], on: 1 },      // 15: under the hood
  { p: [15.9, 0.75, 12.55], r: 3.4, c: 0xff7a24, i: 1.5, cone: [0, 0], on: 1 },          // 16: the oven's mouth
  // out back
  { p: [18.2, 2.58, 14.26], r: 6.2, c: 0xffd070, i: 2.9, cone: [0, 0], on: 2 },          // 17: the bulb
];
const TONY_DINING = 13, TONY_END = 17, TONY_BULB = 17;
const tonyU = {
  uTL: { value: TONY_LIGHTS.map(l => new THREE.Vector4(l.p[0], l.p[1], l.p[2], l.r)) },
  uTC: { value: TONY_LIGHTS.map(() => new THREE.Vector3()) },
  uTK: { value: TONY_LIGHTS.map(l => new THREE.Vector2(l.cone[0], l.cone[1])) },
  uTAmb: { value: new THREE.Vector3() },        // dining room, kitchen (how much the room's own light fills it), daylight
  uTSun: { value: new THREE.Vector3() }, uTSunC: { value: new THREE.Color() },
  uTNoise: { value: wallNoise }, uTOn: { value: 1 },
};
for (const k of ["uSunSky", "uSunGround", "uSunC", "uSunDir", "uMoonSky", "uMoonGround", "uMoonC", "uMoonDir", "uZone", "uFogC", "uFogD", "uFogCam"]) tonyU[k] = TVU[k];
const TONY_VERT = `
  attribute vec2 aM; varying vec3 vP, vN, vC; varying vec2 vM, vUv;
  #ifndef NOVCOL
  attribute vec3 color;
  #endif
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vUv = uv;
    #ifdef NOVCOL
      vC = vec3(1.0); vM = vec2(0.0);
    #else
      vC = color; vM = aM;
    #endif
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
const TONY_FRAG = `
  uniform vec4 uTL[${TONY_LIGHTS.length}]; uniform vec3 uTC[${TONY_LIGHTS.length}]; uniform vec2 uTK[${TONY_LIGHTS.length}];
  uniform vec3 uTAmb, uTSun, uTSunC, uColor, uFogC; uniform sampler2D uTNoise; uniform float uTOn, uFogD, uFogCam;
  ${FOG_OUT_GLSL}
  uniform vec3 uSunSky, uSunGround, uSunC, uSunDir, uMoonSky, uMoonGround, uMoonC, uMoonDir; uniform vec4 uZone;
  #ifdef USE_MAP
  uniform sampler2D uMap;
  #endif
  varying vec3 vP, vN, vC; varying vec2 vM, vUv;
  float nS(vec2 p, int ch) { vec4 t = texture2D(uTNoise, p); return ch == 0 ? t.r : ch == 1 ? t.g : ch == 2 ? t.b : t.a; }
  vec3 brick(vec2 q, inout vec3 N, vec3 side) {             // running bond, 21 by 7 cm with a joint: each brick its own shade, the mortar set back
    float H = 0.075, W = 0.225, row = floor(q.y / H), u = q.x / W + 0.5 * mod(row, 2.0), id = floor(u), fx = fract(u), fy = fract(q.y / H);
    float m = max(1.0 - smoothstep(0.0, 0.05, fx) * smoothstep(1.0, 0.95, fx), 1.0 - smoothstep(0.0, 0.14, fy) * smoothstep(1.0, 0.86, fy));
    float far = clamp(fwidth(q.y / H) * 2.5 - 0.5, 0.0, 1.0); m = mix(m, 0.26, far);
    float t = mix(nS(vec2(id * 0.137, row * 0.211), 0), 0.5, far), g = nS(q / 0.31, 1);
    vec3 c = mix(vec3(0.3, 0.075, 0.05), vec3(0.5, 0.17, 0.1), t) * (0.8 + 0.4 * g);
    N = normalize(N + side * (g - 0.5) * 0.25 + vec3(0.0, (1.0 - fy) * m * 0.3, 0.0));
    return mix(c, vec3(0.3, 0.28, 0.25) * (0.75 + 0.4 * g), m);
  }
  void main() {
    vec3 N = normalize(vN), P = vP, V = normalize(cameraPosition - P); if (!gl_FrontFacing) N = -N;
    vec3 alb = vC * uColor; float gloss = vM.x, emit = vM.y, ao = 1.0;
    #ifdef USE_MAP
      alb *= texture2D(uMap, vUv).rgb;
    #endif
    bool kitchen = P.z > 9.6 && P.z < 13.95, outside = P.z > 13.95;
    #if defined(K_FLOOR)
      if (kitchen) {                                        // quarry tile: oxblood squares, dark grout, years of grease in front of the oven
        vec2 q = P.xz / 0.2, f = fract(q); float gr = 1.0 - smoothstep(0.03, 0.07, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
        float t = nS(floor(q) * 0.173, 0), g = nS(P.xz / 0.37, 1), grime = smoothstep(0.42, 0.7, nS(P.xz / 2.9, 0)) * 0.5 + 0.5 * exp(-pow((P.z - 12.3) / 0.8, 2.0));
        alb = mix(mix(vec3(0.3, 0.09, 0.055), vec3(0.42, 0.15, 0.09), t) * (0.85 + 0.3 * g), vec3(0.05, 0.04, 0.035), gr) * (1.0 - 0.45 * grime);
        gloss = 0.22 * (1.0 - gr) + 0.25 * grime;
      } else {                                              // the checkers: chipped, scuffed down a path from the door to the counter, the grime in the grout
        vec2 q = P.xz / 0.3, f = fract(q), id = floor(q); float chk = mod(id.x + id.y, 2.0), gr = 1.0 - smoothstep(0.012, 0.035, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
        float path = exp(-pow((P.x - 15.6 - 0.25 * sin(P.z * 0.8)) / 0.85, 2.0)), t = nS(id * 0.137, 0), g = nS(P.xz / 0.21, 1), m = nS(P.xz / 1.7, 0);
        vec3 c = chk > 0.5 ? mix(vec3(0.52, 0.48, 0.38), vec3(0.72, 0.68, 0.57), t) : mix(vec3(0.018), vec3(0.04), t);
        c = mix(c, c * 0.72 + 0.035, path * (0.45 + g * 0.55)); c *= 0.86 + 0.28 * m;
        alb = mix(c, vec3(0.06, 0.05, 0.045), gr); gloss = (0.5 - 0.32 * path - 0.12 * g) * (1.0 - gr);
        N = normalize(N + vec3(g - 0.5, 0.0, nS(P.xz / 0.21 + 0.3, 1) - 0.5) * 0.06);
      }
    #elif defined(K_WALL)
      bool onX = abs(N.x) > 0.5; float u = onX ? P.z : P.x; vec3 side = onX ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0); vec2 wv = vec2(u, P.y);
      if (kitchen) {                                        // FRP: the pebbled white panels every kitchen wears, seams in an aluminum strip, the hood's grease creeping out over them
        float seam = abs(fract(u / 1.22 + 0.5) - 0.5) * 1.22, peb = nS(wv / 0.15, 1), mot = nS(wv / 2.7, 0);
        float gr = exp(-dot(P.xy - vec2(15.9, 2.0), P.xy - vec2(15.9, 2.0)) / 3.2) * step(13.5, P.z), drip = smoothstep(0.45, 0.72, nS(vec2(u / 3.4, P.y / 22.0), 2));
        alb = mix(vec3(0.72, 0.71, 0.63), vec3(0.34, 0.26, 0.13), clamp(gr * (0.6 + 0.8 * drip) + 0.22 * smoothstep(0.5, 0.75, mot), 0.0, 0.9));
        if (seam < 0.012) alb = vec3(0.5, 0.52, 0.54);
        if (P.y < 0.15) alb = vec3(0.09, 0.09, 0.09);       // the cove base
        gloss = 0.16; N = normalize(N + side * (peb - 0.5) * 0.2 + vec3(0.0, (nS(wv / 0.15 + 0.4, 1) - 0.5) * 0.2, 0.0));
      } else if (P.x > 20.6) {                              // the east wall: stripped back to the brick, the photos on it
        alb = brick(wv, N, side);
      } else if (P.x < 13.4) {                              // the game corner: old dark paneling, so the screens are what you see
        float id = floor(u / 0.2), fu = fract(u / 0.2), g = nS(vec2(u / 0.8 + id * 0.37, P.y / 7.0 + id * 0.61), 2);
        alb = mix(vec3(0.075, 0.04, 0.022), vec3(0.17, 0.095, 0.05), g) * (1.0 - 0.75 * (1.0 - smoothstep(0.0, 0.03, fu)));
        gloss = 0.1;
      } else if (P.y < 1.0) {                               // wainscot: beadboard in oxblood enamel
        float fu = fract(u / 0.1), b = 1.0 - smoothstep(0.0, 0.1, fu) * smoothstep(1.0, 0.9, fu);
        alb = vec3(0.3, 0.035, 0.04) * (1.0 - 0.55 * b) * (0.9 + 0.2 * nS(wv / 0.9, 0));
        gloss = 0.3; N = normalize(N + side * (fu < 0.1 ? -0.5 : fu > 0.9 ? 0.5 : 0.0));
      } else {                                              // sponged plaster, cream gone to nicotine toward the ceiling
        float s = nS(wv / 1.3, 0), s2 = nS(wv / 0.31, 3), g = nS(wv / 0.2, 1);
        alb = mix(vec3(0.66, 0.5, 0.29), vec3(0.8, 0.68, 0.46), smoothstep(0.34, 0.66, s + (s2 - 0.5) * 0.35)) * (0.96 + 0.08 * g) * mix(1.0, 0.72, smoothstep(1.9, 3.0, P.y));
        N = normalize(N + side * (g - 0.5) * 0.1);
      }
      ao *= mix(0.72, 1.0, smoothstep(0.0, 0.3, P.y)) * mix(0.8, 1.0, smoothstep(0.0, 0.35, 3.0 - P.y));
    #elif defined(K_CEIL)
      if (kitchen) {                                        // the kitchen: vinyl-faced tile in a white grid
        vec2 f = fract(P.xz / 0.6); float gr = 1.0 - smoothstep(0.012, 0.022, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
        alb = mix(vec3(0.66, 0.65, 0.58) * (0.9 + 0.2 * nS(P.xz / 1.3, 0)), vec3(0.78), gr);
      } else {                                              // pressed tin: a square and a diamond in every 60 cm, painted over a dozen times
        vec2 q = fract(P.xz / 0.6) - 0.5; float d = abs(q.x) + abs(q.y), s = max(abs(q.x), abs(q.y));
        float r1 = 1.0 - smoothstep(0.0, 0.02, abs(d - 0.28)), r2 = 1.0 - smoothstep(0.0, 0.016, abs(s - 0.46));
        vec2 grad = sign(q) * r1 * 0.8 + (abs(q.x) > abs(q.y) ? vec2(sign(q.x), 0.0) : vec2(0.0, sign(q.y))) * r2 * 0.9;
        N = normalize(N + vec3(grad.x, 0.0, grad.y)); alb = vec3(0.56, 0.5, 0.38) * (0.86 + 0.28 * nS(P.xz / 1.1, 0)) * (1.0 - 0.3 * max(r1, r2)); gloss = 0.12;
      }
    #elif defined(K_BRICK)
      alb = brick(vec2(P.x, P.y), N, vec3(1.0, 0.0, 0.0));
      alb *= 1.0 - 0.28 * (1.0 - smoothstep(0.35, 0.9, abs(P.x - 19.9))) * (0.35 + 0.65 * smoothstep(0.4, 0.66, nS(vec2(P.x / 1.6, P.y / 18.0), 2))) * smoothstep(2.3, 4.2, P.y);   // one stretch of dirt washed down from the coping, over the service
      alb = mix(alb, vec3(0.05, 0.04, 0.03), 0.38 * exp(-pow((P.x - 15.8) / 0.5, 2.0)) * smoothstep(1.9, 2.7, P.y) * step(P.y, 2.75) * (0.5 + 0.5 * nS(vec2(P.x / 0.4, P.y / 7.0), 2)));   // the exhaust's streak
      gloss = 0.0;
    #elif defined(K_PAD)
      {                                                     // a poured slab, long since cracked: stains, patches, oil by the dumpster
        float a = nS(P.xz / 2.3, 0), g = nS(P.xz / 0.17, 1), joint = 1.0 - smoothstep(0.0, 0.012, abs(fract(P.x / 2.4 + 0.5) - 0.5) * 2.4);
        alb = vec3(0.3, 0.29, 0.26) * (0.68 + 0.5 * a) * (0.88 + 0.24 * g);
        alb = mix(alb, vec3(0.05, 0.045, 0.04), max(joint * 0.85, 0.75 * smoothstep(0.5, 0.75, nS(P.xz / 1.2 + 0.2, 0)) * exp(-dot(P.xz - vec2(15.6, 15.2), P.xz - vec2(15.6, 15.2)) / 3.4)));
        float wet = smoothstep(0.56, 0.62, nS(P.xz / 3.1 + 0.5, 0)) * exp(-dot(P.xz - vec2(16.7, 15.3), P.xz - vec2(16.7, 15.3)) / 2.2);   // what the dumpster leaks: it never dries
        alb = mix(alb, vec3(0.05, 0.05, 0.03), wet * 0.8); gloss = wet * 0.8;
      }
    #endif
    vec3 diff, spec = vec3(0.0);
    if (outside) {
      vec3 sun = mix(uSunGround, uSunSky, 0.5 * N.y + 0.5) + uSunC * max(dot(N, uSunDir), 0.0);
      vec3 moon = mix(uMoonGround, uMoonSky, 0.5 * N.y + 0.5) + uMoonC * max(dot(N, uMoonDir), 0.0);
      diff = mix(moon, sun, uZone.w);
    } else {
      float a = kitchen ? uTAmb.y : uTAmb.x;
      diff = (kitchen ? vec3(0.72, 0.78, 0.76) : vec3(0.95, 0.72, 0.5)) * a * (0.6 + 0.4 * (0.5 - 0.5 * N.y) + 0.25 * max(N.y, 0.0));
      if (!kitchen) {                                       // daylight: a soft fill off the glass, and the sun's own patch, cut by the windows and the awning
        float fall = exp(-P.z / 3.8), facing = 0.55 + 0.45 * max(dot(N, vec3(0.0, 0.25, -0.97)), 0.0);
        diff += vec3(0.82, 0.92, 1.05) * uTAmb.z * fall * facing * 1.1;
        if (uTSun.z < -0.08 && uTSun.y > 0.05 && P.y < 2.4) {
          float t = -P.z / uTSun.z; vec3 h = P + uTSun * t;  // along the sun to the glass
          float wx = max(step(13.4, h.x) * step(h.x, 15.0), step(16.3, h.x) * step(h.x, 20.6));
          float aw = (P.y + uTSun.y * (P.z + 1.1) / -uTSun.z);   // (where it passes the awning's edge)
          diff += uTSunC * wx * step(0.5, h.y) * step(h.y, 2.4) * step(aw, 2.46) * max(dot(N, uTSun), 0.0) * 0.9;
        }
      }
    }
    int i0 = outside ? ${TONY_BULB} : kitchen ? ${TONY_DINING} : 0, i1 = outside ? ${TONY_BULB + 1} : kitchen ? ${TONY_END} : ${TONY_DINING};
    for (int i = i0; i < i1; i++) {
      vec3 D = uTL[i].xyz - P; float d2 = dot(D, D), R = uTL[i].w; if (d2 > R * R) continue;
      vec3 L = D * inversesqrt(d2); float nl = max(dot(N, L), 0.0), k = 1.0 - d2 / (R * R); k = k * k / (1.0 + (outside ? 0.15 : 0.9) * d2);
      vec2 cone = uTK[i]; if (cone.y > 0.0) k *= smoothstep(cone.x, cone.y, L.y);
      if (i < 4 && P.y < 0.74) {                            // a pendant's table throws its shadow
        float t = (0.775 - P.y) / D.y; vec2 h = abs(P.xz + D.xz * t - uTL[i].xz);
        k *= smoothstep(0.38, 0.47, max(h.x, h.y));
      }
      vec3 lc = uTC[i] * k; diff += lc * (nl * 0.85 + 0.15);
      if (gloss > 0.0) { vec3 H = normalize(L + V); spec += lc * gloss * pow(max(dot(N, H), 0.0), 18.0 + gloss * 120.0); }
    }
    vec3 col = alb * diff * ao + spec;
    col = mix(col, alb, emit < 0.0 ? -emit * uTOn : emit);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    if (uFogD > 0.0 && (uFogCam > 0.5 || fogOut(vP))) gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogC, 1.0 - exp(-length(vP - cameraPosition) * uFogD));
  }`;
const tonyMats = new Map();
function tonyLit({ kind = "", map = null, color = 0xffffff, side = THREE.FrontSide } = {}) {   // kinds: FLOOR, WALL, CEIL, BRICK, PAD, LEAF (those read no vertex colors); none: the kit's
  const key = `${kind}|${map?.uuid || ""}|${color}|${side}`; if (tonyMats.has(key)) return tonyMats.get(key);
  const defines = {}; if (kind) { defines.NOVCOL = 1; if (kind !== "LEAF") defines[`K_${kind}`] = 1; } if (map) defines.USE_MAP = 1;
  const m = new THREE.ShaderMaterial({ defines, side, vertexShader: TONY_VERT, fragmentShader: TONY_FRAG, uniforms: { ...tonyU, uColor: { value: new THREE.Color(color) }, ...(map ? { uMap: { value: map } } : {}) } });
  tonyMats.set(key, m); return m;
}
function tonyKit() {                              // lays boxes and the like into one mesh: T.box(color, w, h, d, x, y, z, { ry, rx, rz, g: gloss, e: glow })
  const geos = [], stack = [new THREE.Matrix4()], M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), PP = new THREE.Vector3(), S = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
  const lay = (geo, c, x, y, z, o = {}, sx = 1, sy = 1, sz = 1) => {
    const g = geo.index ? geo.toNonIndexed() : geo; const n = g.attributes.position.count; col.set(c);
    const ca = new Float32Array(n * 3), ma = new Float32Array(n * 2); for (let i = 0; i < n; i++) { ca[i * 3] = col.r; ca[i * 3 + 1] = col.g; ca[i * 3 + 2] = col.b; ma[i * 2] = o.g || 0; ma[i * 2 + 1] = o.e || 0; }
    g.setAttribute("color", new THREE.BufferAttribute(ca, 3)); g.setAttribute("aM", new THREE.BufferAttribute(ma, 2));
    M.compose(PP.set(x, y, z), Q.setFromEuler(E.set(o.rx || 0, o.ry || 0, o.rz || 0, "YXZ")), S.set(sx, sy, sz)).premultiply(stack.at(-1));
    g.applyMatrix4(M); geos.push(g);
  };
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const T = {
    at(x, y, z, ry, fn, rx = 0) { M.compose(PP.set(x, y, z), Q.setFromEuler(E.set(rx, ry, 0, "YXZ")), S.set(1, 1, 1)); stack.push(stack.at(-1).clone().multiply(M)); fn(); stack.pop(); },
    box: (c, w, h, d, x, y, z, o) => lay(unitBox.clone(), c, x, y, z, o, w, h, d),
    cyl: (c, rt, rb, h, x, y, z, o = {}) => lay(new THREE.CylinderGeometry(rt, rb, h, o.seg || 10), c, x, y, z, o),
    sph: (c, r, x, y, z, o = {}) => lay(new THREE.SphereGeometry(r, o.seg || 10, o.seg2 || 7), c, x, y, z, o, 1, o.sy || 1, 1),
    lathe: (c, pts, x, y, z, o = {}) => lay(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), o.seg || 14), c, x, y, z, o),
    torus: (c, R, r, x, y, z, o = {}) => lay(new THREE.TorusGeometry(R, r, 6, o.seg || 20, o.arc || Math.PI * 2), c, x, y, z, o),
    rod(c, r, a, b, o = {}) { const A = new THREE.Vector3(...a), d = new THREE.Vector3(...b).sub(A), L = d.length(); if (L < 1e-5) return; const g = new THREE.CylinderGeometry(r, r, L, o.seg || 6), n = g.toNonIndexed();
      n.applyMatrix4(new THREE.Matrix4().compose(A.clone().addScaledVector(d, 0.5), new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize()), new THREE.Vector3(1, 1, 1))); lay(n, c, 0, 0, 0, o); },
    plane(c, w, h, x, y, z, o = {}) { const g = new THREE.PlaneGeometry(w, h); if (o.uv) { const [u0, v0, u1, v1] = o.uv, a = g.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, u0 + (u1 - u0) * a.getX(i), v0 + (v1 - v0) * a.getY(i)); } lay(g, c, x, y, z, o); },
    geo: (g, c, x, y, z, o) => lay(g, c, x, y, z, o),
    flush(parent, mat = tonyLit()) { if (!geos.length) return null; const o = new THREE.Mesh(mergeGeometries(geos), mat); parent.add(o); geos.length = 0; return o; },
  };
  return T;
}
function tonyPicture(parent, draw, px, py, w, h, x, y, z, o = {}) {   // a canvas on a plane: a sign, a poster, the menu (o.e: lit from behind)
  const K = tonyKit(); K.plane(0xffffff, w, h, x, y, z, o);
  return K.flush(parent, tonyLit({ map: makeTexture(draw, px, py) }));
}
// the light itself, each frame: what's on, how bright, the oven breathing, the bulb failing
const bulb = { lvl: 1, burst: 3, phase: 0, buzz: 0, mesh: null, moths: [] };
let tonyOnK = 1;
function tonyLightsTick(dt) {
  if (!tonyU.uTC) return;
  const t = tony.t2 = (tony.t2 || 0) + dt, open = tony.lit ? 1 : 0; tonyOnK += (open - tonyOnK) * Math.min(1, dt * 3);
  const day = Math.max(0, Math.min(1, tod.level)); tonyU.uTOn.value = tonyOnK; if (tony.glass) { const k = 0.1 + 0.9 * day; tony.glass.color.setRGB(0.5 * k, 0.67 * k, 0.8 * k); }
  // the bulb: a steady sick yellow with a hum in it, and every so often it stutters, now and then all the way out
  bulb.burst -= dt;
  if (bulb.burst < 0) { bulb.phase = 0.08 + Math.random() * (Math.random() < 0.2 ? 1.1 : 0.45); bulb.burst = bulb.phase + 1.2 + Math.random() * Math.random() * 11; bulb.out = Math.random() < 0.25; }
  let b = 0.86 + 0.06 * Math.sin(t * 61) + 0.05 * Math.sin(t * 13.3);
  if (bulb.phase > 0) { bulb.phase -= dt; b = bulb.out ? 0.02 : Math.random() < 0.45 ? 0.08 + Math.random() * 0.2 : 0.75 + Math.random() * 0.45; if ((bulb.buzz -= dt) < 0 && Math.hypot(player.x - 18.2, player.z - 15) < 8 && !player.onRoof) { bulb.buzz = 0.07; siBeep(90 + Math.random() * 60, 0.05, "sawtooth", 0.007); } }
  bulb.lvl = b;
  TONY_LIGHTS.forEach((l, i) => { const k = l.on === 0 ? 1 : l.on === 2 ? b : tonyOnK; let p = l.i * k;
    if (i === 16) p *= 0.82 + 0.13 * Math.sin(t * 7) + 0.08 * Math.sin(t * 17.3) + 0.04 * Math.sin(t * 31);   // the oven
    if (i >= 10 && i <= 11) p *= 0.9 + 0.1 * Math.sin(t * 31);
    if (i >= 7 && i <= 9) p *= 0.75 + 0.25 * Math.sin(t * (2.3 + i));   // whatever's on the screen
    const c = l.col ||= new THREE.Color(l.c); tonyU.uTC.value[i].set(c.r * p, c.g * p, c.b * p); });
  tonyU.uTAmb.value.set(0.03 + 0.05 * tonyOnK, 0.05 + 0.15 * tonyOnK, day * 0.5);
  const sd = TVU.uSunDir.value; tonyU.uTSun.value.copy(sd); tonyU.uTSunC.value.copy(TVU.uSunC.value).multiplyScalar(day);
  if (bulb.mesh) { bulb.mesh.material.color.setRGB(1.0 * b + 0.06, 0.8 * b + 0.03, 0.34 * b + 0.01); }
  for (const m of bulb.moths) { const a = t * m.w + m.ph; m.o.position.set(18.2 + Math.cos(a) * m.r, 2.5 + Math.sin(a * 1.7) * 0.18, 14.42 + Math.abs(Math.sin(a)) * m.r * 0.9); m.o.visible = day < 0.5; }
}
