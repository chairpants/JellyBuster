// ---- the ground everywhere else, after the service road's: asphalt (the lot, the road), concrete (the walks, the curbs), grass, crushed stone, bare dirt.
// Nothing's painted on a canvas here: each is worked out in its shader from where the pixel is in the world, so it never tiles and holds up however close
// you stand, and nothing finer than a pixel is drawn (it fades with distance instead of crawling). It only shades the material's own colour, which the
// weather and the seasons still own (WX_GROUND, exterior/sky.js); under snow it fades out. groundFx(material, kind) puts it on a material ----
const GROUND_FX_GLSL = {
  head: `
    uniform float uGfxSnow; uniform vec4 uGfxA;
    float gfH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float gfN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(gfH(i), gfH(i + vec2(1, 0)), f.x), mix(gfH(i + vec2(0, 1)), gfH(i + vec2(1, 1)), f.x), f.y); }
    float gfLine(float d, float w, float pw) { return (1.0 - smoothstep(w, w + max(pw, 0.006), d)) * clamp(w * 2.5 / max(pw, 1e-4), 0.0, 1.0); }   // a line w wide, d from its middle: gone once it's finer than a pixel
    float gfEdges(vec2 q, out float cell) {         // how near a cell's edge (0 on it): cracked plates
      vec2 ip = floor(q); float F1 = 9.0, F2 = 9.0; cell = 0.0;
      for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 c = ip + vec2(float(i), float(j)), o = c + 0.14 + 0.72 * vec2(gfH(c), gfH(c + 37.0)); float d = length(q - o); if (d < F1) { F2 = F1; F1 = d; cell = gfH(c + 3.0); } else if (d < F2) F2 = d; }
      return F2 - F1;
    }`,
  // asphalt. uGfxA: x = how wide a paver's pass is; y = 1 on the road (wheel lines down each lane: z, w = the two lanes), 0 on the lot (oil where engines sit: z = the stalls' row, w = the first stall's line)
  asphalt: `
    float agg = (gfH(floor(P * 118.0)) - 0.5) * 0.3 + (gfH(floor(P * 52.0) + 5.0) - 0.5) * 0.17 + smoothstep(0.8, 0.87, gfN(P * 64.0)) * 0.16;
    col *= 1.0 + near * agg + (n1 - 0.5) * 0.1 + (n3 - 0.5) * 0.13 + (gfN(P * 0.33 + 9.0) - 0.5) * 0.16;   // stones in the tar; years of sun, not evenly
    float pass = P.y / uGfxA.x, band = floor(pass); col *= 0.95 + 0.1 * gfH(vec2(band, 4.0));                  // laid a pass at a time
    vec2 wob = (vec2(gfN(P * 3.1 + 7.0), gfN(P * 3.1 - 11.0)) - 0.5) * 0.3 + (vec2(gfN(P * 14.0), gfN(P * 14.0 + 5.0)) - 0.5) * 0.045;
    float open = smoothstep(0.38, 0.6, gfN(vec2(P.x * 0.16, band * 3.7)));                                     // the seams between passes, opened up along some of their length
    float crack = gfLine(abs(fract(pass + wob.y / uGfxA.x + 0.5) - 0.5) * uGfxA.x, 0.012, pw) * open;
    { float cw = 6.4 + 3.0 * gfH(vec2(band, 9.0)), cx = P.x / cw + gfH(vec2(band, 2.0)), ci = floor(cx);     // across each pass every few metres: it shrinks
      float at = 0.2 + 0.6 * gfH(vec2(ci, band)); crack = max(crack, gfLine(abs(fract(cx) - at + wob.x / cw) * cw, 0.01, pw) * step(0.3, gfH(vec2(ci + 0.5, band)))); }
    float bad = smoothstep(0.6, 0.78, gfN(P * 0.21 + 31.0) + (n3 - 0.5) * 0.2);                                // and where it's had the worst of it, wandering ones, then plates
    if (bad > 0.002 && mid > 0.002) { float cl, e = gfEdges((P + wob * 0.5) * 0.62, cl); crack = max(crack, gfLine(e / 0.62 * 0.5, 0.009, pw) * bad * step(0.35, cl)); }
    float gat = smoothstep(0.83, 0.93, gfN(P * 0.27 - 17.0) + (n3 - 0.5) * 0.16);
    if (gat > 0.002 && near > 0.002) { float cl, e = gfEdges((P + wob * 0.2) * 5.4, cl); col = mix(col * (1.0 + (cl - 0.5) * 0.2 * gat), col * 0.3, (1.0 - smoothstep(0.02, 0.07, e)) * gat * near); }
    col *= 1.0 - 0.16 * gat * (1.0 - near * 0.6);
    float seal = smoothstep(0.7, 0.76, gfN(P * 0.11 + 3.0)) * step(0.02, crack);                              // tar poured down a few, one summer
    col = mix(col, col * 0.3, crack * (1.0 - seal)); col = mix(col, vec3(0.34), seal * gfLine(0.0, 0.03, pw) * 0.85);
    { float patchN = gfH(floor(P / vec2(9.0, uGfxA.x)) + 61.0); vec2 pf = fract(P / vec2(9.0, uGfxA.x)) - vec2(0.3 + 0.4 * gfH(vec2(patchN, 1.0)), 0.5);   // saw-cut and filled, here and there
      vec2 hs = vec2(0.09 + 0.1 * gfH(vec2(patchN, 2.0)), 0.16 + 0.2 * gfH(vec2(patchN, 3.0))), dq = abs(pf) - hs; float inside = step(max(dq.x, dq.y), 0.0) * step(0.86, patchN);
      col = mix(col, col * (patchN > 0.93 ? 0.72 : 1.16) * (0.96 + 0.08 * n2), inside); col *= 1.0 - 0.55 * inside * gfLine(min(-dq.x * 9.0, -dq.y * uGfxA.x), 0.014, pw); }
    if (uGfxA.y > 0.5) {                            // the road: each lane's wheel lines polished dark, a paler strip between them, drips down the middle
      for (int k = 0; k < 2; k++) { float lz = k == 0 ? uGfxA.z : uGfxA.w, d = abs(P.y - lz);
        col *= 1.0 - 0.13 * exp(-pow((d - 0.82) / 0.3, 2.0)) * (0.7 + 0.6 * n3) + 0.05 * exp(-pow(d / 0.3, 2.0));
        col *= 1.0 - 0.3 * exp(-pow(d / 0.16, 2.0)) * smoothstep(0.68, 0.84, gfN(vec2(P.x * 2.3, lz))) * mid; }
    } else {                                        // the lot: oil where the engines stand over it, stall after stall, some worse than others
      float sx = (P.x - uGfxA.w) / 2.6, si = floor(sx), bad2 = gfH(vec2(si, 77.0)); vec2 o = vec2((fract(sx) - 0.5) * 2.6 + (gfH(vec2(si, 5.0)) - 0.5) * 0.5, (P.y - uGfxA.z) * 0.7);
      float d = length(o) + (n1 - 0.5) * 0.5 + (n2 - 0.5) * 0.14; col *= 1.0 - (0.2 + 0.5 * bad2 * bad2) * (1.0 - smoothstep(0.1, 0.75, d)) * step(abs(P.y - uGfxA.z), 2.4);
      col *= 1.0 - 0.07 * smoothstep(0.55, 0.8, gfN(P * 0.8 + 50.0));                                           // and whatever else has dripped, anywhere
    }`,
  // concrete: poured in slabs (uGfxA.x wide, the first joint at uGfxA.y), each a shade its own, pitted, stained, a few cracked across; gum
  concrete: `
    float sl = (P.x - uGfxA.y) / uGfxA.x, si = floor(sl), sh = gfH(vec2(si, floor(P.y / 6.0)));
    col *= 0.93 + 0.12 * sh + (n3 - 0.5) * 0.1 + (n1 - 0.5) * 0.07 * mid;
    col *= 1.0 + near * ((gfH(floor(P * 140.0)) - 0.5) * 0.16 - smoothstep(0.82, 0.9, gfN(P * 70.0)) * 0.14);   // sand in the face, and the pits where stones have popped
    col *= mix(vec3(1.0), vec3(0.8, 0.76, 0.68), smoothstep(0.55, 0.85, gfN(P * 0.6 + 21.0)) * 0.55);            // leaf-stained, rust-stained
    col *= 1.0 - 0.1 * smoothstep(0.5, 0.0, abs(fract(sl) - 0.5) * 2.0 - 0.78) * up;                             // dirt along the joints
    if (sh > 0.8) { float cx = fract(sl) - 0.5 + (gfN(vec2(P.y * 2.6, si)) - 0.5) * 0.3 + (P.y - floor(P.y / 6.0) * 6.0 - 3.0) * (sh - 0.9) * 0.6; col *= 1.0 - 0.6 * gfLine(abs(cx) * uGfxA.x, 0.006, pw) * up; }
    { vec2 gq = P * 2.9, gi = floor(gq); float gh = gfH(gi + 13.0); col *= 1.0 - 0.5 * step(0.94, gh) * (1.0 - smoothstep(0.03, 0.045, length(fract(gq) - 0.2 - 0.6 * vec2(gfH(gi), gfH(gi + 7.0))) / 2.9 * 2.0)) * near * up; }`,
  // grass: never one green. Thick and thin, a yellower patch where it dries out first, clover, the odd bare spot; the mower's stripes; blades up close
  grass: `
    float big = gfN(P * 0.13 + 3.0), mdm = gfN(P * 0.55 - 8.0), dry = smoothstep(0.52, 0.8, gfN(P * 0.21 + 60.0) * 0.7 + mdm * 0.3);
    col *= 0.8 + 0.3 * big + (mdm - 0.5) * 0.24 + (n3 - 0.5) * 0.16 + (n1 - 0.5) * 0.14 * mid;
    col *= mix(vec3(1.0), vec3(1.34, 1.1, 0.72), dry * 0.55);                                                    // drying out
    col *= mix(vec3(1.0), vec3(0.72, 0.95, 0.84), smoothstep(0.66, 0.8, gfN(P * 1.1 + 90.0)) * 0.6);             // clover
    col *= 1.0 + 0.035 * sin(P.y * 5.9) * (1.0 - dry);                                                           // mown in stripes
    { float bl = gfH(floor(P * vec2(210.0, 46.0) + vec2(0.0, gfH(floor(P.xx * 210.0)) * 9.0))), tuft = gfN(P * 11.0); col *= 1.0 + near * ((bl - 0.5) * 0.42 + (tuft - 0.5) * 0.3) + (tuft - 0.5) * 0.1 * mid; }
    { float bare = smoothstep(0.86, 0.93, gfN(P * 0.37 + 140.0) + (n1 - 0.5) * 0.12); col = mix(col, vec3(1.75, 0.82, 0.92) * (0.85 + 0.3 * n2), bare * 0.75); }   // worn through to dirt`,
  // crushed stone: every stone its own grey, fines in between, darker and packed where wheels go
  stone: `
    float st = gfH(floor(P * 42.0 + gfN(P * 9.0) * 2.0)), st2 = gfH(floor(P * 17.0) + 3.0);
    col *= 1.0 + near * ((st - 0.5) * 0.55 + (st2 - 0.5) * 0.25) + mid * (n2 - 0.5) * 0.16 + (n3 - 0.5) * 0.16 + (gfN(P * 0.3) - 0.5) * 0.18;
    col *= mix(vec3(1.0), vec3(1.08, 1.0, 0.86), smoothstep(0.5, 0.8, gfN(P * 0.7 + 12.0)) * 0.5);
    col *= 1.0 - 0.2 * smoothstep(0.62, 0.8, gfN(vec2(P.x * 0.9, P.y * 0.12) + 5.0));                            // rutted`,
  // bare dirt, where feet land: packed pale in the middle, pebbles, scuffed
  dirt: `
    col *= 0.86 + 0.3 * gfN(P * 1.7) + (n1 - 0.5) * 0.2 * mid + near * ((gfH(floor(P * 90.0)) - 0.5) * 0.22);
    col *= 1.0 + near * smoothstep(0.86, 0.92, gfN(P * 38.0)) * 0.5 - 0.22 * smoothstep(0.6, 0.85, gfN(vec2(P.x * 3.0, P.y * 9.0)));`,
};
function groundFx(m, kind, a = [1, 0, 0, 0]) {
  const A = { value: new THREE.Vector4(...a) };
  m.onBeforeCompile = function (sh) {
    wallBaseCompile.call(this, sh);                 // (the room's lighting first: see wallSurface, store/core.js)
    Object.assign(sh.uniforms, { uGfxSnow: SERVICE_ROAD.fx.snow, uGfxA: A });
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + GROUND_FX_GLSL.head)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      { vec2 P = vTvPos.xz; float pw = length(fwidth(P));   // (how many metres a pixel covers)
        float near = 1.0 - smoothstep(0.012, 0.09, pw), mid = 1.0 - smoothstep(0.1, 0.7, pw), n1 = gfN(P * 8.5), n2 = gfN(P * 29.0), n3 = gfN(P * 2.1 + 40.0);
        float up = smoothstep(0.4, 0.9, inverseTransformDirection(normal, viewMatrix).y); vec3 col = vec3(1.0);
        ${GROUND_FX_GLSL[kind]}
        diffuseColor.rgb *= mix(vec3(1.0), max(col, 0.0), (0.35 + 0.65 * up) * (1.0 - 0.85 * smoothstep(0.05, 0.6, uGfxSnow))); }`);
  };
  m.customProgramCacheKey = () => "groundFx:" + kind;
  m.needsUpdate = true; return m;
}
groundFx(mat.pavement, "asphalt", [4.5, 0, (LOT.stalls + LOT.curb) / 2 - 0.9, WALL_L - 20 + 1.3]);
groundFx(mat.road, "asphalt", [(LOT.roadNear - LOT.roadFar) / 2, 1, LOT.road[1], LOT.road[-1]]);
groundFx(mat.sidewalk, "concrete", [2, WALL_L - 20 + 1]);
groundFx(mat.curb, "concrete", [3, 0.4]);
groundFx(mat.grass, "grass");
