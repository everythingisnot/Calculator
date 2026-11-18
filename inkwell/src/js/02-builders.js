// ======================================================================
// Builders: every object the quill can write, modelled from primitives.
// Convention: base at y = 0, front faces +z, natural size in metres.
// Long objects (planks, bridges) run along x; tall ones (ladders) along y.
// ======================================================================
const C = {
  wood: 0xb4794a, woodD: 0x7d5230, woodL: 0xd9ac78, metal: 0xc3cad3, steel: 0x6f7884, dark: 0x2a2e38, red: 0xe24a3b, orange: 0xf08a24,
  yellow: 0xffd34d, green: 0x56b85c, leaf: 0x4f9e4a, blue: 0x3f7be0, sky: 0x7fc4ff, white: 0xf4f2ee, black: 0x1d1e24, pink: 0xff8fb1,
  purple: 0x8b5cf6, brown: 0x7a5233, cream: 0xf3e6c8, gold: 0xffc54a, stone: 0x9a958e, ice: 0xbfe8ff, skin: 0xf1c7a0, rope: 0xc9a56b,
};
const hemiGeo = (r) => G(`h${r}`, () => new THREE.SphereGeometry(r, 24, 12, 0, TAU, 0, Math.PI / 2));
const ext = (key, shapeFn, depth, bevel = 0.02) => G('x' + key, () => {
  const g = new THREE.ExtrudeGeometry(shapeFn(), { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2 });
  g.translate(0, 0, -depth / 2); return g;
});
const lathe = (key, pts, seg = 28) => G('l' + key, () => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg));
const dark = () => M(C.black, { r: 0.35 });
const eyeW = () => M(0xffffff, { r: 0.25 });
function eyes(parent, x, y, z, r = 0.05, spread = 1) {
  for (const s of [-1, 1]) { P(sph(r, 12, 10), eyeW(), s * x * spread, y, z, parent); P(sph(r * 0.55, 10, 8), dark(), s * x * spread, y, z + r * 0.6, parent); }
}
function wheel(g, x, y, z, r = 0.3, w = 0.22) {
  P(cyl(r, r, w, 22), M(0x22252c, { r: 0.85 }), x, y, z, g, Math.PI / 2);
  P(cyl(r * 0.5, r * 0.5, w + 0.02, 14), M(C.metal, { r: 0.3, m: 0.8 }), x, y, z, g, Math.PI / 2);
}
function spinner(mesh, axis, speed) { return (g, t, dt) => { mesh.rotation[axis] += speed * dt; }; }

const B = {};

// ---------------- climbing & crossing
B.ladder = (g) => {
  const w = M(C.wood, { r: 0.75, main: 1 });
  for (const x of [-0.32, 0.32]) P(box(0.1, 3.4, 0.1), w, x, 1.7, 0, g);
  for (let i = 0; i < 8; i++) P(box(0.64, 0.07, 0.08, 0.02), w, 0, 0.28 + i * 0.42, 0, g);
};
B.stairs = (g) => {
  const w = M(C.woodL, { r: 0.8, main: 1 }), d = M(C.woodD, { r: 0.8 });
  for (let i = 0; i < 7; i++) { P(box(1.2, 0.42 * (i + 1), 0.48, 0.04), i % 2 ? w : M(C.wood, { r: 0.8, main: 1 }), 0, 0.21 * (i + 1), 1.5 - i * 0.48, g); }
  P(box(0.08, 3.2, 0.08), d, 0.62, 1.6, -1.4, g);
};
B.rope = (g) => {
  const m = M(C.rope, { r: 0.95, main: 1 });
  for (let i = 0; i < 4; i++) P(tor(0.42 - i * 0.02, 0.06, TAU, 8, 28), m, 0, 0.07 + i * 0.1, 0, g, Math.PI / 2);
  P(cyl(0.05, 0.05, 0.8, 8), m, 0.45, 0.38, 0.2, g, 0, 0, 0.8);
};
B.ropeLine = (g, v) => { // used when a rope is anchored: hangs along y, length v.len
  const m = M(C.rope, { r: 0.95, main: 1 });
  P(cyl(0.06, 0.06, v.len, 8), m, 0, v.len / 2, 0, g);
  for (let y = 0.4; y < v.len; y += 0.55) P(sph(0.1, 10, 8), m, 0, y, 0, g);
};
B.ropeBridge = (g, v) => {
  const m = M(C.rope, { r: 0.95, main: 1 }), w = M(C.woodL, { r: 0.85, main: 1 });
  const n = Math.floor(v.len / 0.4);
  for (let i = 0; i < n; i++) P(box(0.28, 0.06, 0.9, 0.02), w, -v.len / 2 + 0.2 + i * 0.4, 0.06 - Math.sin((i / (n - 1)) * Math.PI) * 0.25, 0, g);
  for (const z of [-0.45, 0.45]) P(cyl(0.035, 0.035, v.len, 6), m, 0, 0.6, z, g, 0, 0, Math.PI / 2);
};
B.plank = (g) => P(box(3.4, 0.12, 0.52, 0.04), M(C.woodL, { r: 0.8, main: 1 }), 0, 0.06, 0, g);
B.stick = (g) => P(cyl(0.05, 0.06, 2.2, 8), M(C.wood, { r: 0.85, main: 1 }), 0, 0.06, 0, g, 0, 0, Math.PI / 2);
B.log = (g) => {
  P(cyl(0.3, 0.3, 3.8, 14), M(0x8a5a34, { r: 0.9, main: 1, flat: 1 }), 0, 0.3, 0, g, 0, 0, Math.PI / 2);
  const e = M(0xe0b88a, { r: 0.9 });
  for (const x of [-1.905, 1.905]) P(cyl(0.26, 0.26, 0.02, 14), e, x, 0.3, 0, g, 0, 0, Math.PI / 2);
};
B.bridge = (g) => {
  const w = M(C.wood, { r: 0.8, main: 1 }), d = M(C.woodD, { r: 0.8, main: 1 });
  for (let i = 0; i < 16; i++) P(box(0.38, 0.1, 1.25, 0.03), i % 3 ? w : d, -3.3 + 0.2 + i * 0.41, 0.1, 0, g, 0, (i % 2 ? 1 : -1) * 0.03);
  for (const x of [-3.25, 3.25]) for (const z of [-0.62, 0.62]) P(box(0.13, 0.9, 0.13), d, x, 0.45, z, g);
  for (const z of [-0.62, 0.62]) P(box(6.6, 0.07, 0.07, 0.02), d, 0, 0.8, z, g);
};
B.trampoline = (g) => {
  const m = M(C.steel, { r: 0.35, m: 0.7, main: 1 });
  P(tor(0.9, 0.07, TAU, 8, 36), M(C.blue, { r: 0.5 }), 0, 0.55, 0, g, Math.PI / 2);
  P(cyl(0.86, 0.86, 0.03, 36), M(C.black, { r: 0.7 }), 0, 0.54, 0, g);
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.4; P(cyl(0.04, 0.04, 0.6, 8), m, Math.cos(a) * 0.82, 0.27, Math.sin(a) * 0.82, g); }
};
B.beanstalk = (g) => {
  const st = M(0x3f9a46, { r: 0.7, main: 1 }), lf = M(0x5fc05a, { r: 0.6, side: 1 });
  for (let i = 0; i < 10; i++) {
    const y = i * 0.55;
    P(cyl(0.12 - i * 0.006, 0.13 - i * 0.006, 0.62, 10), st, Math.sin(i * 0.9) * 0.18, y + 0.3, Math.cos(i * 0.9) * 0.18, g, 0.2 * Math.sin(i), 0, 0.2 * Math.cos(i));
    P(sph(0.26, 12, 8), lf, Math.sin(i * 0.9) * 0.18 + (i % 2 ? 0.35 : -0.35), y + 0.35, 0, g, 0, 0, i % 2 ? -0.6 : 0.6, [1, 0.15, 0.6]);
  }
};
B.tree = (g, v = {}) => {
  P(cyl(0.16, 0.24, 1.6, 10), M(0x7a5233, { r: 0.9 }), 0, 0.8, 0, g);
  const lc = v.leaf ?? 0x5aa64e;
  const l = M(lc, { r: 0.8, flat: 1, main: 1 });
  P(ico(0.95, 1), l, 0, 2.2, 0, g); P(ico(0.7, 1), l, 0.55, 1.85, 0.2, g); P(ico(0.65, 1), l, -0.5, 1.95, -0.25, g); P(ico(0.55, 1), l, 0.1, 2.85, 0.1, g);
};

// ---------------- flight
B.wings = (g) => {
  const m = M(0xffffff, { r: 0.55, main: 1 }), tip = M(0xdfe8ff, { r: 0.5 });
  const wings = [];
  for (const s of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(s * 0.12, 0.7, 0); g.add(p);
    for (let i = 0; i < 4; i++) P(sph(0.3, 14, 10), i === 3 ? tip : m, s * (0.25 + i * 0.22), 0.1 - i * 0.12, 0, p, 0, 0, s * (0.5 + i * 0.12), [1.2, 0.35, 0.12]);
    wings.push(p);
  }
  P(box(0.22, 0.32, 0.12, 0.05), M(C.gold, { r: 0.3, m: 0.7 }), 0, 0.65, 0, g);
  g.userData.wings = wings;
};
B.jetpack = (g) => {
  const m = M(C.metal, { r: 0.3, m: 0.85, main: 1 }), r = M(C.red, { r: 0.4 });
  for (const x of [-0.18, 0.18]) { P(caps(0.14, 0.5), m, x, 0.55, 0, g); P(cone(0.12, 0.2, 14), M(C.dark, { r: 0.4, m: 0.6 }), x, 0.12, 0, g, Math.PI); }
  P(box(0.3, 0.5, 0.14, 0.04), r, 0, 0.6, 0.12, g);
  g.userData.flameAt = V3(0, 0, 0); g.userData.jet = true;
};
B.balloon = (g, v = {}) => {
  P(sph(0.42, 24, 18), M(v.c ?? C.red, { r: 0.18, main: 1, env: 1.2 }), 0, 1.9, 0, g, 0, 0, 0, [1, 1.15, 1]);
  P(cone(0.06, 0.1, 10), M(v.c ?? C.red, { r: 0.2 }), 0, 1.4, 0, g, Math.PI);
  P(cyl(0.006, 0.006, 1.35, 4), M(0xffffff, { r: 0.6 }), 0, 0.7, 0, g);
};
B.hotairballoon = (g) => {
  const cols = [C.red, C.yellow, C.red, C.white, C.red, C.yellow, C.red, C.white];
  for (let i = 0; i < 8; i++) P(G('hab' + i, () => new THREE.SphereGeometry(1.1, 6, 18, (i / 8) * TAU, TAU / 8)), M(cols[i], { r: 0.5, main: i % 2 === 0 }), 0, 2.6, 0, g, 0, 0, 0, [1, 1.15, 1]);
  P(box(0.7, 0.5, 0.7, 0.06), M(C.woodD, { r: 0.9 }), 0, 0.25, 0, g);
  for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) P(cyl(0.01, 0.01, 1.2, 4), M(C.rope, {}), x * 1.3, 1.05, z * 1.3, g);
};
B.helicopter = (g) => {
  const b = M(C.blue, { r: 0.35, m: 0.3, main: 1 });
  P(caps(0.55, 0.8), b, 0, 0.95, 0, g, 0, 0, Math.PI / 2);
  P(sph(0.5, 20, 14), glass(0x9fd6ff), 0.45, 1.0, 0, g, 0, 0, 0, [0.9, 0.85, 0.9]);
  P(cyl(0.08, 0.14, 1.8, 10), b, -1.4, 1.1, 0, g, 0, 0, Math.PI / 2);
  P(box(0.1, 0.5, 0.3), b, -2.25, 1.3, 0, g);
  const rotor = new THREE.Group(); rotor.position.set(0, 1.62, 0); g.add(rotor);
  P(box(3.4, 0.04, 0.18, 0.02), M(C.dark, { r: 0.5 }), 0, 0, 0, rotor); P(box(0.18, 0.04, 3.4, 0.02), M(C.dark, { r: 0.5 }), 0, 0, 0, rotor);
  P(cyl(0.06, 0.06, 0.2, 8), M(C.dark, {}), 0, 1.52, 0, g);
  for (const z of [-0.4, 0.4]) P(box(1.6, 0.06, 0.06), M(C.dark, { r: 0.4, m: 0.6 }), 0, 0.12, z, g);
  g.userData.anim = spinner(rotor, 'y', 22);
};
B.plane = (g) => {
  const w = M(C.white, { r: 0.35, main: 1 }), r = M(C.red, { r: 0.4 });
  P(caps(0.36, 2.2), w, 0, 0.9, 0, g, 0, 0, Math.PI / 2);
  P(box(0.8, 0.08, 3.6, 0.03), r, 0.1, 0.85, 0, g);
  P(box(0.5, 0.06, 1.2, 0.02), r, -1.35, 1.0, 0, g); P(box(0.5, 0.6, 0.06, 0.02), r, -1.35, 1.25, 0, g);
  P(sph(0.3, 14, 10), glass(0x9fd6ff), 0.55, 1.15, 0, g, 0, 0, 0, [1.2, 0.7, 0.8]);
  const prop = new THREE.Group(); prop.position.set(1.52, 0.9, 0); g.add(prop);
  P(box(0.04, 1.2, 0.12, 0.02), M(C.dark, {}), 0, 0, 0, prop);
  P(cone(0.14, 0.25, 12), r, 1.5, 0.9, 0, g, 0, 0, -Math.PI / 2);
  for (const z of [-0.5, 0.5]) wheel(g, 0.4, 0.2, z, 0.18, 0.1);
  g.userData.anim = spinner(prop, 'x', 30);
};
B.broom = (g) => {
  P(cyl(0.04, 0.05, 1.8, 8), M(C.wood, { r: 0.8, main: 1 }), 0.2, 0.25, 0, g, 0, 0, Math.PI / 2 - 0.05);
  P(cone(0.24, 0.7, 14), M(0xd9b45a, { r: 0.95, main: 1 }), -0.95, 0.25, 0, g, 0, 0, -Math.PI / 2);
  P(cyl(0.08, 0.08, 0.08, 10), M(C.red, {}), -0.6, 0.25, 0, g, 0, 0, Math.PI / 2);
};
B.rocket = (g) => {
  const w = M(C.white, { r: 0.3, m: 0.2, main: 1 }), r = M(C.red, { r: 0.35 });
  P(cyl(0.35, 0.38, 1.8, 24), w, 0, 1.3, 0, g);
  P(cone(0.35, 0.8, 24), r, 0, 2.6, 0, g);
  P(cyl(0.16, 0.16, 0.06, 20), glass(0x7ec8ff), 0, 1.8, 0.34, g, Math.PI / 2);
  for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; P(box(0.06, 0.6, 0.45, 0.02), r, Math.cos(a) * 0.38, 0.55, Math.sin(a) * 0.38, g, 0, -a); }
  P(cyl(0.22, 0.3, 0.25, 16), M(C.dark, { r: 0.4, m: 0.6 }), 0, 0.3, 0, g);
  g.userData.flameAt = V3(0, 0.1, 0); g.userData.jet = true;
};
B.carpet = (g) => {
  const m = M(0x9b2d5e, { r: 0.85, main: 1 }), t = M(C.gold, { r: 0.6 });
  const segs = [];
  for (let i = 0; i < 6; i++) segs.push(P(box(0.36, 0.05, 1.2, 0.01), m, -0.9 + i * 0.36, 0.5, 0, g));
  for (const x of [-1.1, 1.1]) for (const z of [-0.5, 0, 0.5]) P(sph(0.05, 8, 6), t, x, 0.5, z, g);
  P(box(2.1, 0.06, 0.08, 0.01), t, 0, 0.53, 0.56, g); P(box(2.1, 0.06, 0.08, 0.01), t, 0, 0.53, -0.56, g);
  g.userData.anim = (gg, time) => segs.forEach((s, i) => { s.position.y = 0.5 + Math.sin(time * 4 + i * 0.9) * 0.05; });
};
B.cloud = (g, v = {}) => {
  const m = M(v.c ?? 0xffffff, { r: 1, main: 1, e: v.c ? undefined : 0x26303f, ei: 1 });
  for (const [x, y, z, r] of [[0, 1.2, 0, 0.6], [0.6, 1.1, 0.1, 0.45], [-0.6, 1.1, -0.05, 0.48], [0.25, 1.5, -0.1, 0.42], [-0.3, 1.45, 0.15, 0.38]]) P(sph(r, 18, 12), m, x, y, z, g);
};
B.raincloud = (g) => { B.cloud(g, { c: 0x8892a6 }); g.userData.rain = true; };

// ---------------- water, diving, reach
B.submarine = (g) => {
  const y = M(C.yellow, { r: 0.35, m: 0.3, main: 1 });
  P(caps(0.55, 1.6), y, 0, 0.6, 0, g, 0, 0, Math.PI / 2);
  P(box(0.6, 0.5, 0.4, 0.12), y, 0.1, 1.2, 0, g);
  P(cyl(0.04, 0.04, 0.5, 8), M(C.dark, {}), 0.2, 1.6, 0, g);
  for (const x of [-0.5, 0.1, 0.7]) P(cyl(0.14, 0.14, 0.05, 16), glass(0x8fd8ff), x, 0.65, 0.53, g, Math.PI / 2);
  const prop = new THREE.Group(); prop.position.set(-1.38, 0.6, 0); g.add(prop);
  for (let i = 0; i < 3; i++) P(box(0.04, 0.4, 0.12, 0.02), M(C.steel, { r: 0.3, m: 0.8 }), 0, 0, 0, prop, i / 3 * Math.PI);
  g.userData.anim = spinner(prop, 'x', 8);
};
B.scuba = (g) => {
  const t = M(0xf2c230, { r: 0.3, m: 0.5, main: 1 });
  for (const x of [-0.13, 0.13]) { P(caps(0.12, 0.5), t, x, 0.5, 0, g); P(cyl(0.04, 0.04, 0.12, 8), M(C.steel, { m: 0.8, r: 0.3 }), x, 0.95, 0, g); }
  P(tor(0.18, 0.04, TAU, 8, 20), M(C.dark, {}), 0, 0.55, 0.12, g);
  P(box(0.4, 0.22, 0.12, 0.05), glass(0x9fe0ff), 0, 0.2, 0.3, g);
};
B.boat = (g) => {
  const m = M(C.wood, { r: 0.75, main: 1 }), d = M(C.woodD, { r: 0.8, main: 1 });
  P(box(2.2, 0.45, 0.95, 0.15), m, 0, 0.3, 0, g);
  P(cone(0.48, 0.7, 4), m, 1.35, 0.3, 0, g, 0, Math.PI / 4, -Math.PI / 2, [1, 1, 0.68]);
  P(box(2.0, 0.08, 0.8, 0.02), M(0x5a3a20, { r: 0.9 }), 0, 0.5, 0, g);
  P(box(0.22, 0.08, 0.9, 0.02), d, 0.1, 0.62, 0, g);
  P(cyl(0.04, 0.04, 1.6, 8), d, -0.7, 0.8, 0.0, g, 0, 0, 0.3);
};
B.fishingrod = (g) => {
  P(cyl(0.02, 0.04, 2.2, 8), M(0x3a2a20, { r: 0.6, main: 1 }), 0.6, 0.6, 0, g, 0, 0, -1.0);
  P(cyl(0.08, 0.08, 0.08, 14), M(C.metal, { r: 0.3, m: 0.8 }), -0.05, 0.12, 0.06, g, Math.PI / 2);
  P(cyl(0.004, 0.004, 0.9, 4), M(0xffffff, {}), 1.52, 0.75, 0, g);
  P(sph(0.06, 10, 8), M(C.red, {}), 1.52, 0.3, 0, g);
};
B.net = (g) => {
  P(cyl(0.03, 0.03, 1.4, 8), M(C.wood, { r: 0.8, main: 1 }), 0, 0.7, 0, g);
  P(tor(0.3, 0.025, TAU, 6, 24), M(C.metal, { m: 0.8, r: 0.3 }), 0, 1.65, 0, g);
  P(cone(0.3, 0.55, 12), M(0xe8e2d0, { r: 0.9, side: 1, o: 0.7 }), 0, 1.4, 0, g, Math.PI).material.wireframe = false;
};
B.hook = (g) => {
  const m = M(C.steel, { r: 0.3, m: 0.85, main: 1 });
  P(cyl(0.04, 0.04, 0.7, 8), m, 0, 0.45, 0, g);
  for (let i = 0; i < 3; i++) P(tor(0.16, 0.035, Math.PI, 6, 14), m, Math.cos(i / 3 * TAU) * 0.14, 0.2, Math.sin(i / 3 * TAU) * 0.14, g, 0, -i / 3 * TAU, Math.PI);
  P(tor(0.25, 0.05, TAU, 6, 20), M(C.rope, { r: 0.95 }), 0.35, 0.06, 0, g, Math.PI / 2);
};
B.crane = (g) => {
  const y = M(0xf2b632, { r: 0.45, m: 0.2, main: 1 });
  P(box(2.2, 0.5, 1.1, 0.12), y, 0, 0.55, 0, g);
  for (const x of [-0.7, 0.7]) for (const z of [-0.6, 0.6]) wheel(g, x, 0.3, z, 0.3);
  P(box(0.8, 0.7, 0.9, 0.1), y, -0.5, 1.15, 0, g);
  P(box(0.25, 0.25, 3.6, 0.04), y, 0.4, 2.2, 0, g, 0.9, Math.PI / 2, 0);
  P(cyl(0.015, 0.015, 1.4, 4), M(C.dark, {}), 2.0, 2.4, 0, g);
  P(tor(0.12, 0.03, Math.PI * 1.5, 6, 14), M(C.steel, { m: 0.8 }), 2.0, 1.6, 0, g);
};
B.magnet = (g) => {
  P(tor(0.35, 0.13, Math.PI, 10, 24), M(C.red, { r: 0.35, main: 1 }), 0, 0.55, 0, g, 0, 0, 0);
  for (const x of [-0.35, 0.35]) P(box(0.27, 0.22, 0.27, 0.04), M(C.metal, { r: 0.25, m: 0.9 }), x, 0.11, 0, g);
  for (const x of [-0.35, 0.35]) P(box(0.26, 0.36, 0.26, 0.04), M(C.red, { r: 0.35, main: 1 }), x, 0.4, 0, g);
};
B.pump = (g) => {
  P(box(0.9, 0.7, 0.6, 0.1), M(0x3c8de0, { r: 0.4, m: 0.4, main: 1 }), 0, 0.35, 0, g);
  P(cyl(0.22, 0.22, 0.65, 18), M(C.metal, { r: 0.3, m: 0.85 }), 0, 0.5, 0.3, g, Math.PI / 2);
  P(tor(0.35, 0.06, TAU * 0.75, 8, 24), M(C.dark, { r: 0.7 }), 0.6, 0.35, 0, g, 0, Math.PI / 2);
};
B.sponge = (g) => {
  P(box(0.8, 0.45, 0.55, 0.12), M(0xffd84a, { r: 0.95, main: 1 }), 0, 0.23, 0, g);
  P(box(0.82, 0.12, 0.57, 0.05), M(0x4fb25a, { r: 0.9 }), 0, 0.48, 0, g);
  for (let i = 0; i < 9; i++) P(sph(0.045, 8, 6), M(0xc99a2a, { r: 1 }), rand(-0.32, 0.32), rand(0.08, 0.38), 0.28, g);
};

// ---------------- fire & light
B.torch = (g) => {
  P(cyl(0.05, 0.07, 1.0, 10), M(C.wood, { r: 0.85, main: 1 }), 0, 0.5, 0, g);
  P(cyl(0.11, 0.08, 0.22, 12), M(0x5b4636, { r: 0.95 }), 0, 1.08, 0, g);
  g.userData.flameAt = V3(0, 1.25, 0);
};
B.lantern = (g) => {
  const f = M(0x3b3f4a, { r: 0.35, m: 0.85, main: 1 });
  P(box(0.42, 0.06, 0.42, 0.02), f, 0, 0.03, 0, g); P(box(0.42, 0.06, 0.42, 0.02), f, 0, 0.64, 0, g);
  P(cone(0.28, 0.22, 4), f, 0, 0.78, 0, g, 0, Math.PI / 4);
  for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) P(box(0.04, 0.6, 0.04, 0.01), f, x, 0.33, z, g);
  P(box(0.32, 0.54, 0.32, 0.05), M(0xffd27a, { r: 0.2, e: 0xffb347, ei: 2.6 }), 0, 0.33, 0, g);
  P(tor(0.1, 0.02, TAU, 6, 16), f, 0, 0.98, 0, g);
  g.userData.glow = 0xffb347;
};
B.flashlight = (g) => {
  P(cyl(0.08, 0.08, 0.7, 14), M(0x2a3550, { r: 0.4, m: 0.6, main: 1 }), 0, 0.09, 0, g, 0, 0, Math.PI / 2);
  P(cyl(0.14, 0.09, 0.2, 16), M(C.metal, { r: 0.3, m: 0.8 }), 0.42, 0.13, 0, g, 0, 0, Math.PI / 2);
  P(cyl(0.12, 0.12, 0.02, 16), M(0xffffff, { e: 0xfff4d0, ei: 3 }), 0.53, 0.13, 0, g, 0, 0, Math.PI / 2);
  g.userData.glow = 0xfff4d0;
};
B.candle = (g) => {
  P(cyl(0.09, 0.1, 0.42, 14), M(C.cream, { r: 0.7, main: 1 }), 0, 0.21, 0, g);
  P(cyl(0.16, 0.16, 0.04, 16), M(C.gold, { m: 0.8, r: 0.3 }), 0, 0.02, 0, g);
  g.userData.flameAt = V3(0, 0.48, 0); g.userData.small = true;
};
B.lamp = (g) => {
  P(cyl(0.2, 0.24, 0.06, 18), M(0x3b3f4a, { r: 0.4, m: 0.7, main: 1 }), 0, 0.03, 0, g);
  P(cyl(0.03, 0.03, 1.1, 8), M(0x3b3f4a, { r: 0.4, m: 0.7 }), 0, 0.6, 0, g);
  P(cyl(0.16, 0.3, 0.32, 18, true), M(0xfff0c8, { r: 0.8, e: 0xffd08a, ei: 1.4, side: 1 }), 0, 1.2, 0, g);
  P(sph(0.09, 12, 8), M(0xffffff, { e: 0xffe2a8, ei: 3 }), 0, 1.15, 0, g);
  g.userData.glow = 0xffd08a;
};
B.firefly = (g) => {
  P(caps(0.06, 0.12), M(0x2b2a20, { r: 0.5 }), 0, 1.2, 0, g, Math.PI / 2);
  P(sph(0.09, 12, 8), M(0xd8ff7a, { e: 0xc8ff5a, ei: 3, main: 1 }), 0, 1.2, -0.12, g);
  const wings = [];
  for (const s of [-1, 1]) { const p = new THREE.Group(); p.position.set(s * 0.04, 1.26, 0.02); g.add(p); P(sph(0.1, 8, 6), M(0xffffff, { o: 0.5 }), s * 0.08, 0, 0, p, 0, 0, 0, [1, 0.1, 0.5]); wings.push(p); }
  g.userData.wings = wings; g.userData.glow = 0xc8ff5a;
};
B.sun = (g) => {
  P(sph(0.9, 32, 20), M(0xffd75a, { e: 0xffb31a, ei: 3.2, main: 1 }), 0, 2.4, 0, g).castShadow = false;
  const rays = new THREE.Group(); rays.position.y = 2.4; g.add(rays);
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; const m = P(cone(0.16, 0.5, 8), M(0xffe07a, { e: 0xffb31a, ei: 2.4 }), Math.cos(a) * 1.15, Math.sin(a) * 1.15, 0, rays, 0, 0, a - Math.PI / 2); m.castShadow = false; }
  g.userData.glow = 0xffc04a; g.userData.anim = (gg, t) => { rays.rotation.z = t * 0.4; rays.lookAt(camera.position); rays.rotateZ(t * 0.4); };
};
B.moon = (g) => {
  P(sph(0.8, 32, 20), M(0xe8ecf5, { r: 0.9, e: 0x9fb2d8, ei: 0.9, main: 1 }), 0, 2.4, 0, g);
  for (const [x, y, z, r] of [[0.3, 2.6, 0.62, 0.15], [-0.25, 2.2, 0.7, 0.12], [0.1, 2.0, 0.75, 0.08]]) P(sph(r, 12, 8), M(0xc9d0de, { r: 1 }), x, y, z, g);
  g.userData.glow = 0xb8c8ff;
};
B.star = (g) => {
  const shape = () => { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.22 : 0.5, a = i / 10 * TAU + Math.PI / 2; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } s.closePath(); return s; };
  P(ext('star', shape, 0.16, 0.04), M(0xffd75a, { r: 0.3, m: 0.5, e: 0xffb31a, ei: 1.6, main: 1 }), 0, 1.0, 0, g);
  g.userData.glow = 0xffd75a; g.userData.spin = true;
};
B.glowstick = (g) => { P(caps(0.05, 0.5), M(0x7dff8a, { e: 0x3aff6a, ei: 2.6, main: 1 }), 0, 0.05, 0, g, 0, 0, Math.PI / 2); g.userData.glow = 0x5aff80; };
B.fire = (g) => {
  const l = M(0x6b4426, { r: 0.9, main: 1 }), s = M(C.stone, { r: 0.9, flat: 1 });
  for (let i = 0; i < 4; i++) P(cyl(0.07, 0.08, 0.9, 8), l, 0, 0.18, 0, g, 0, i / 4 * Math.PI, Math.PI / 2 - 0.35);
  for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; P(dode(0.14), s, Math.cos(a) * 0.5, 0.08, Math.sin(a) * 0.5, g, a, a, 0); }
  P(sph(0.22, 10, 8), M(0xff8a2a, { e: 0xff5a10, ei: 3 }), 0, 0.22, 0, g).castShadow = false;
  g.userData.flameAt = V3(0, 0.3, 0); g.userData.big = true;
};
B.flamethrower = (g) => {
  const m = M(0x4a5260, { r: 0.35, m: 0.8, main: 1 });
  P(caps(0.14, 0.4), M(C.red, { r: 0.35 }), -0.25, 0.32, 0, g);
  P(cyl(0.05, 0.05, 1.1, 10), m, 0.35, 0.3, 0, g, 0, 0, Math.PI / 2);
  P(cyl(0.09, 0.06, 0.2, 12), m, 0.95, 0.3, 0, g, 0, 0, Math.PI / 2);
  P(box(0.08, 0.2, 0.06, 0.02), M(C.dark, {}), 0.2, 0.18, 0, g);
  g.userData.flameAt = V3(1.1, 0.3, 0);
};
B.lava = (g) => {
  P(ico(0.55, 1), M(0xff6a1a, { r: 0.6, e: 0xff3a00, ei: 2.2, flat: 1, main: 1 }), 0, 0.42, 0, g, 0, 0, 0, [1, 0.75, 1]);
  for (let i = 0; i < 6; i++) P(dode(0.16), M(0x2b1a14, { r: 0.95, flat: 1 }), rand(-0.4, 0.4), rand(0.5, 0.75), rand(-0.4, 0.4), g);
  g.userData.glow = 0xff5a10;
};
B.heater = (g) => {
  const m = M(0xeceae6, { r: 0.4, m: 0.2, main: 1 });
  for (let i = 0; i < 7; i++) P(box(0.12, 0.8, 0.22, 0.05), m, -0.42 + i * 0.14, 0.48, 0, g);
  P(box(1.0, 0.06, 0.26, 0.02), m, 0, 0.1, 0, g);
  P(box(0.9, 0.06, 0.04, 0.01), M(0xff7a3a, { e: 0xff4a10, ei: 2.4 }), 0, 0.82, 0.12, g);
  for (const x of [-0.45, 0.45]) P(cyl(0.03, 0.03, 0.1, 6), m, x, 0.04, 0, g);
  g.userData.glow = 0xff6a2a;
};
B.hairdryer = (g) => {
  const m = M(0xff7aa8, { r: 0.35, main: 1 });
  P(cyl(0.16, 0.16, 0.55, 18), m, 0.1, 0.62, 0, g, 0, 0, Math.PI / 2);
  P(cyl(0.12, 0.1, 0.18, 16), M(C.dark, {}), 0.45, 0.62, 0, g, 0, 0, Math.PI / 2);
  P(caps(0.07, 0.38), m, -0.02, 0.3, 0, g, 0, 0, -0.15);
};
B.match = (g) => {
  P(box(0.04, 0.5, 0.04, 0.01), M(0xe9cf9a, { r: 0.8, main: 1 }), 0, 0.25, 0, g);
  P(sph(0.045, 10, 8), M(0xc4302b, {}), 0, 0.52, 0, g, 0, 0, 0, [1, 1.3, 1]);
  g.userData.flameAt = V3(0, 0.58, 0); g.userData.small = true;
};

// ---------------- water & cold
B.water = (g) => {
  P(sph(0.5, 28, 18), glass(0x5fb6ff, { main: 1, r: 0.04 }), 0, 0.28, 0, g, 0, 0, 0, [1, 0.55, 1]);
  for (let i = 0; i < 4; i++) P(sph(0.12, 12, 10), glass(0x7fc8ff), Math.cos(i * 1.7) * 0.6, 0.12, Math.sin(i * 1.7) * 0.6, g);
  g.userData.anim = (gg, t) => { gg.children[0].scale.set(1 + Math.sin(t * 3) * 0.04, 0.55 + Math.cos(t * 3.3) * 0.03, 1 + Math.cos(t * 2.7) * 0.04); };
};
B.bucket = (g, v = {}) => {
  P(cyl(0.3, 0.24, 0.5, 20, true), M(C.metal, { r: 0.3, m: 0.85, side: 1, main: 1 }), 0, 0.25, 0, g);
  P(cyl(0.24, 0.24, 0.02, 20), M(C.metal, { r: 0.3, m: 0.85 }), 0, 0.01, 0, g);
  P(tor(0.3, 0.015, Math.PI, 6, 16), M(C.dark, { m: 0.8 }), 0, 0.5, 0, g);
  if (v.full) P(cyl(0.28, 0.28, 0.02, 20), glass(0x5fb6ff), 0, 0.44, 0, g);
};
B.extinguisher = (g) => {
  P(caps(0.17, 0.6), M(0xd9302b, { r: 0.3, m: 0.15, main: 1 }), 0, 0.48, 0, g);
  P(box(0.22, 0.08, 0.1, 0.02), M(C.dark, {}), 0, 0.98, 0, g);
  P(cyl(0.02, 0.02, 0.5, 6), M(C.dark, {}), 0.15, 0.8, 0, g, 0, 0, 0.8);
  P(box(0.2, 0.14, 0.02, 0.01), M(C.white, {}), 0, 0.55, 0.17, g);
};
B.firetruck = (g) => {
  const r = M(0xd8302b, { r: 0.35, m: 0.2, main: 1 });
  P(box(3.0, 0.9, 1.3, 0.12), r, -0.2, 0.85, 0, g);
  P(box(0.9, 0.8, 1.3, 0.14), r, 1.6, 1.0, 0, g);
  P(box(0.05, 0.4, 1.1, 0.02), glass(0x9fd6ff), 2.06, 1.15, 0, g);
  P(box(2.6, 0.08, 0.5, 0.02), M(C.metal, { m: 0.85, r: 0.3 }), -0.3, 1.45, 0, g);
  for (let i = 0; i < 8; i++) P(box(0.05, 0.1, 0.5, 0.01), M(C.metal, { m: 0.85, r: 0.3 }), -1.5 + i * 0.34, 1.52, 0, g);
  P(box(0.2, 0.1, 0.4, 0.03), M(0x4fa3ff, { e: 0x2a7aff, ei: 2 }), 1.5, 1.45, 0, g);
  for (const x of [-1.2, 0.2, 1.6]) for (const z of [-0.66, 0.66]) wheel(g, x, 0.35, z, 0.35);
};
B.hose = (g) => {
  const m = M(0x3fa04a, { r: 0.5, main: 1 });
  for (let i = 0; i < 3; i++) P(tor(0.35 - i * 0.03, 0.05, TAU, 8, 24), m, 0, 0.06 + i * 0.09, 0, g, Math.PI / 2);
  P(cyl(0.05, 0.07, 0.3, 10), M(C.gold, { m: 0.8, r: 0.3 }), 0.45, 0.1, 0.1, g, 0, 0, Math.PI / 2);
};
B.snowball = (g) => P(ico(0.32, 2), M(0xffffff, { r: 0.95, main: 1, e: 0x26303a }), 0, 0.32, 0, g);
B.iceblock = (g) => P(box(0.7, 0.7, 0.7, 0.08), glass(0xbfe8ff, { main: 1, r: 0.12 }), 0, 0.35, 0, g, 0, 0.3);
B.snowman = (g) => {
  const s = M(0xffffff, { r: 0.95, main: 1, e: 0x26303a });
  P(sph(0.5, 20, 14), s, 0, 0.45, 0, g); P(sph(0.36, 20, 14), s, 0, 1.1, 0, g); P(sph(0.26, 20, 14), s, 0, 1.6, 0, g);
  P(cone(0.05, 0.3, 10), M(C.orange, {}), 0, 1.6, 0.36, g, Math.PI / 2);
  eyes(g, 0.08, 1.68, 0.22, 0.035);
  P(cyl(0.22, 0.22, 0.04, 18), M(C.black, {}), 0, 1.82, 0, g); P(cyl(0.15, 0.15, 0.3, 18), M(C.black, {}), 0, 1.98, 0, g);
  for (const s2 of [-1, 1]) P(cyl(0.02, 0.025, 0.7, 6), M(C.brown, {}), s2 * 0.55, 1.2, 0, g, 0, 0, s2 * 1.0);
  P(tor(0.26, 0.06, TAU, 8, 20), M(C.red, {}), 0, 1.38, 0, g, Math.PI / 2);
};
B.freezeray = (g) => {
  const m = M(0xdfe9f5, { r: 0.25, m: 0.6, main: 1 });
  P(caps(0.12, 0.55), m, 0, 0.32, 0, g, 0, 0, Math.PI / 2);
  for (let i = 0; i < 3; i++) P(tor(0.14, 0.025, TAU, 6, 18), M(0x5ad8ff, { e: 0x2ab8ff, ei: 2 }), 0.1 + i * 0.12, 0.32, 0, g, 0, Math.PI / 2);
  P(sph(0.09, 12, 8), M(0x9ff0ff, { e: 0x5ad8ff, ei: 3 }), 0.52, 0.32, 0, g);
  P(box(0.1, 0.25, 0.08, 0.03), m, -0.15, 0.12, 0, g);
  g.userData.glow = 0x5ad8ff;
};
B.fridge = (g) => {
  P(box(0.8, 1.8, 0.7, 0.1), M(0xf1f3f5, { r: 0.3, m: 0.15, main: 1 }), 0, 0.9, 0, g);
  P(box(0.82, 0.02, 0.02, 0.005), M(C.dark, {}), 0, 1.15, 0.36, g);
  for (const y of [0.6, 1.5]) P(box(0.05, 0.35, 0.05, 0.02), M(C.metal, { m: 0.8, r: 0.3 }), 0.3, y, 0.38, g);
};

// ---------------- tools & weapons
B.sword = (g) => {
  P(box(0.12, 1.1, 0.03, 0.01), M(0xdfe6ee, { r: 0.15, m: 1, main: 1 }), 0, 0.85, 0, g);
  P(cone(0.06, 0.15, 4), M(0xdfe6ee, { r: 0.15, m: 1 }), 0, 1.47, 0, g, 0, Math.PI / 4, 0, [1, 1, 0.3]);
  P(box(0.42, 0.06, 0.08, 0.02), M(C.gold, { r: 0.3, m: 0.9 }), 0, 0.3, 0, g);
  P(cyl(0.035, 0.035, 0.24, 8), M(0x5a3a28, { r: 0.8 }), 0, 0.15, 0, g);
  P(sph(0.05, 10, 8), M(C.gold, { r: 0.3, m: 0.9 }), 0, 0.02, 0, g);
};
B.axe = (g) => {
  P(cyl(0.035, 0.045, 1.1, 8), M(C.wood, { r: 0.8, main: 1 }), 0, 0.55, 0, g);
  P(box(0.34, 0.28, 0.05, 0.02), M(0xb8c2cc, { r: 0.25, m: 0.9 }), 0.16, 0.98, 0, g);
};
B.hammer = (g) => {
  P(cyl(0.035, 0.04, 0.8, 8), M(C.wood, { r: 0.8, main: 1 }), 0, 0.4, 0, g);
  P(box(0.38, 0.16, 0.16, 0.03), M(0x5a6270, { r: 0.35, m: 0.85, main: 1 }), 0, 0.82, 0, g);
};
B.pickaxe = (g) => {
  P(cyl(0.035, 0.045, 1.1, 8), M(C.wood, { r: 0.8, main: 1 }), 0, 0.55, 0, g);
  P(tor(0.4, 0.045, Math.PI * 0.8, 6, 18), M(0x8a95a3, { r: 0.3, m: 0.9, main: 1 }), 0, 0.72, 0, g, 0, 0, Math.PI * 0.1);
};
B.shovel = (g) => {
  P(cyl(0.035, 0.035, 1.1, 8), M(C.wood, { r: 0.8, main: 1 }), 0, 0.75, 0, g);
  P(box(0.3, 0.38, 0.04, 0.02), M(0x9aa3ad, { r: 0.35, m: 0.85, main: 1 }), 0, 0.19, 0, g);
  P(box(0.22, 0.05, 0.05, 0.02), M(C.dark, {}), 0, 1.32, 0, g);
};
B.drill = (g) => {
  P(caps(0.16, 0.5), M(0xf2b632, { r: 0.4, main: 1 }), 0, 0.85, 0, g);
  P(box(0.7, 0.07, 0.07, 0.02), M(C.dark, {}), 0, 1.3, 0, g);
  P(cone(0.08, 0.5, 10), M(0x9aa3ad, { m: 0.9, r: 0.3 }), 0, 0.3, 0, g, Math.PI);
};
B.excavator = (g) => {
  const y = M(0xf2b632, { r: 0.45, main: 1 });
  P(box(2.2, 0.4, 1.4, 0.15), M(0x2b2e36, { r: 0.85 }), 0, 0.25, 0, g);
  P(box(1.4, 0.8, 1.2, 0.12), y, -0.2, 0.9, 0, g);
  P(box(0.6, 0.6, 0.6, 0.08), glass(0x9fd6ff), 0.3, 1.3, 0.25, g);
  P(box(1.6, 0.2, 0.2, 0.05), y, 1.1, 1.5, -0.3, g, 0, 0, 0.5);
  P(box(1.2, 0.18, 0.18, 0.05), y, 2.05, 1.05, -0.3, g, 0, 0, -1.1);
  P(box(0.45, 0.4, 0.5, 0.06), M(C.dark, { m: 0.6 }), 2.35, 0.35, -0.3, g);
};
B.bow = (g) => {
  P(tor(0.6, 0.035, Math.PI, 6, 24), M(C.wood, { r: 0.7, main: 1 }), 0, 0.7, 0, g, 0, 0, -Math.PI / 2);
  P(cyl(0.006, 0.006, 1.2, 4), M(0xffffff, {}), 0, 0.7, 0, g);
  P(cyl(0.015, 0.015, 1.0, 6), M(C.woodL, {}), 0.2, 0.7, 0, g, 0, 0, Math.PI / 2);
};
B.spear = (g) => {
  P(cyl(0.03, 0.03, 2.0, 8), M(C.wood, { r: 0.8, main: 1 }), 0, 1.0, 0, g);
  P(cone(0.07, 0.3, 6), M(0xb8c2cc, { r: 0.25, m: 0.9 }), 0, 2.15, 0, g);
};
B.club = (g) => P(cyl(0.14, 0.05, 1.0, 10), M(0x8a5a34, { r: 0.9, main: 1, flat: 1 }), 0, 0.5, 0, g);
B.cannon = (g) => {
  P(cyl(0.22, 0.3, 1.6, 20), M(0x2f333c, { r: 0.35, m: 0.85, main: 1 }), 0.1, 0.75, 0, g, 0, 0, Math.PI / 2 - 0.25);
  P(tor(0.24, 0.05, TAU, 8, 20), M(0x2f333c, { r: 0.35, m: 0.85 }), 0.85, 0.95, 0, g, 0, Math.PI / 2 - 0.0, 0);
  P(box(0.9, 0.3, 0.6, 0.05), M(C.woodD, { r: 0.85 }), -0.1, 0.42, 0, g);
  for (const z of [-0.38, 0.38]) wheel(g, -0.1, 0.38, z, 0.38, 0.1);
};
B.tank = (g) => {
  const m = M(0x6b7a4a, { r: 0.55, main: 1 });
  P(box(2.6, 0.6, 1.6, 0.15), m, 0, 0.55, 0, g);
  for (const z of [-0.85, 0.85]) { P(box(2.7, 0.45, 0.35, 0.15), M(0x2b2e30, { r: 0.85 }), 0, 0.28, z, g); for (let i = 0; i < 5; i++) wheel(g, -1 + i * 0.5, 0.25, z, 0.2, 0.36); }
  P(box(1.2, 0.45, 1.0, 0.15), m, -0.15, 1.05, 0, g);
  P(cyl(0.08, 0.1, 1.6, 12), m, 1.2, 1.1, 0, g, 0, 0, Math.PI / 2);
};
B.bomb = (g) => {
  P(sph(0.38, 24, 16), M(0x23262e, { r: 0.35, m: 0.4, main: 1 }), 0, 0.38, 0, g);
  P(cyl(0.1, 0.1, 0.12, 12), M(0x55595f, { m: 0.8 }), 0, 0.78, 0, g);
  P(cyl(0.02, 0.02, 0.25, 6), M(0xd9c79a, {}), 0.06, 0.92, 0, g, 0, 0, -0.5);
  g.userData.fuseAt = V3(0.12, 1.05, 0);
};
B.dynamite = (g) => {
  for (const [x, z] of [[-0.1, 0], [0.1, 0], [0, 0.15]]) P(cyl(0.09, 0.09, 0.7, 14), M(0xd23a2a, { r: 0.6, main: 1 }), x, 0.35, z, g);
  P(box(0.36, 0.1, 0.36, 0.02), M(0x2b2420, {}), 0, 0.35, 0.05, g);
  P(cyl(0.015, 0.015, 0.3, 6), M(0xd9c79a, {}), 0, 0.85, 0.05, g, 0.3);
  g.userData.fuseAt = V3(0, 1.0, 0.1);
};
B.shield = (g) => {
  P(cyl(0.5, 0.5, 0.08, 28), M(0x3f6fd8, { r: 0.4, m: 0.4, main: 1 }), 0, 0.55, 0, g, Math.PI / 2);
  P(tor(0.5, 0.04, TAU, 8, 32), M(C.gold, { r: 0.3, m: 0.9 }), 0, 0.55, 0.0, g);
  P(sph(0.12, 14, 10), M(C.gold, { r: 0.3, m: 0.9 }), 0, 0.55, 0.06, g);
};
B.armor = (g) => {
  const m = M(0xc8d0da, { r: 0.22, m: 0.95, main: 1 });
  P(sph(0.42, 20, 14), m, 0, 0.65, 0, g, 0, 0, 0, [1, 1.2, 0.65]);
  for (const x of [-0.42, 0.42]) P(sph(0.18, 14, 10), m, x, 1.05, 0, g, 0, 0, 0, [1.2, 0.7, 1]);
  P(box(0.7, 0.08, 0.4, 0.03), M(C.brown, {}), 0, 0.35, 0, g);
};
B.crowbar = (g) => {
  P(cyl(0.03, 0.03, 1.1, 8), M(0xc4302b, { r: 0.35, m: 0.6, main: 1 }), 0, 0.55, 0, g);
  P(tor(0.12, 0.03, Math.PI, 6, 12), M(0xc4302b, { r: 0.35, m: 0.6 }), 0.12, 1.1, 0, g);
};
B.saw = (g) => {
  P(box(0.9, 0.3, 0.02, 0.005), M(0xd5dbe2, { r: 0.2, m: 1, main: 1 }), 0.2, 0.3, 0, g);
  P(box(0.25, 0.3, 0.07, 0.04), M(C.red, {}), -0.35, 0.33, 0, g);
};
B.chainsaw = (g) => {
  P(box(0.55, 0.38, 0.3, 0.08), M(C.orange, { r: 0.4, main: 1 }), -0.2, 0.25, 0, g);
  P(box(0.9, 0.12, 0.04, 0.05), M(0x9aa3ad, { m: 0.9, r: 0.3 }), 0.5, 0.22, 0, g);
  P(tor(0.12, 0.025, Math.PI, 6, 12), M(C.dark, {}), -0.2, 0.45, 0, g);
};
B.knife = (g) => {
  P(box(0.45, 0.08, 0.015, 0.005), M(0xdfe6ee, { r: 0.15, m: 1, main: 1 }), 0.25, 0.06, 0, g);
  P(box(0.28, 0.07, 0.05, 0.02), M(C.dark, {}), -0.12, 0.06, 0, g);
};
B.key = (g) => {
  const m = M(C.gold, { r: 0.25, m: 1, main: 1 });
  P(tor(0.14, 0.04, TAU, 8, 20), m, -0.22, 0.2, 0, g);
  P(cyl(0.03, 0.03, 0.5, 8), m, 0.13, 0.2, 0, g, 0, 0, Math.PI / 2);
  for (const x of [0.25, 0.34]) P(box(0.05, 0.1, 0.04, 0.01), m, x, 0.14, 0, g);
  g.userData.spin = true;
};

// ---------------- people & creatures
function person(g, v = {}) {
  const root = new THREE.Group(); root.scale.setScalar(v.scale ?? 1); g.add(root);
  const skin = M(v.skin ?? C.skin, { r: 0.7 });
  const shirt = M(v.shirt ?? 0x4f7be0, { r: 0.7, main: 1 });
  const pants = M(v.pants ?? 0x34405e, { r: 0.8 });
  const legs = [], arms = [];
  for (const x of [-0.13, 0.13]) {
    const p = new THREE.Group(); p.position.set(x, 0.66, 0); root.add(p);
    P(caps(0.1, 0.42), pants, 0, -0.3, 0, p);
    P(box(0.17, 0.1, 0.28, 0.04), M(0x2a2420, { r: 0.8 }), 0, -0.6, 0.04, p);
    legs.push(p);
  }
  if (v.robe) P(cone(0.42, 1.1, 20), shirt, 0, 0.6, 0, root);
  P(caps(0.25, 0.34), v.armor ? M(0xc8d0da, { r: 0.22, m: 0.95, main: 1 }) : shirt, 0, 1.05, 0, root);
  if (v.belt) P(cyl(0.255, 0.255, 0.08, 18), M(v.belt, {}), 0, 0.82, 0, root);
  for (const x of [-0.33, 0.33]) {
    const p = new THREE.Group(); p.position.set(x, 1.32, 0); root.add(p);
    P(caps(0.075, 0.36), v.armor ? M(0xc8d0da, { r: 0.22, m: 0.95 }) : shirt, 0, -0.24, 0, p);
    P(sph(0.08, 12, 10), skin, 0, -0.48, 0, p);
    arms.push(p);
  }
  const head = new THREE.Group(); head.position.set(0, 1.7, 0); root.add(head);
  P(sph(0.25, 24, 18), skin, 0, 0, 0, head);
  eyes(head, 0.085, 0.03, 0.2, 0.045);
  if (v.nose) P(sph(0.09, 12, 10), skin, 0, -0.03, 0.25, head);
  if (v.hair !== false && !v.hat) P(hemiGeo(0.265), M(v.hair ?? 0x4a3020, { r: 0.85 }), 0, 0.02, -0.02, head, -0.25);
  const hm = (c, o = {}) => M(c, { r: 0.5, ...o });
  switch (v.hat) {
    case 'fire': P(hemiGeo(0.28), hm(C.red), 0, 0.05, 0, head); P(cyl(0.38, 0.38, 0.04, 24), hm(C.red), 0, 0.06, -0.04, head); break;
    case 'knight': P(sph(0.28, 20, 14), hm(0xc8d0da, { m: 0.95, r: 0.2 }), 0, 0.02, 0, head); P(box(0.36, 0.06, 0.1, 0.02), M(C.dark, {}), 0, 0.02, 0.24, head); P(cone(0.06, 0.4, 8), hm(C.red), 0, 0.42, -0.05, head, -0.3); break;
    case 'wizard': P(cone(0.26, 0.75, 20), hm(v.shirt ?? C.purple), 0, 0.45, 0, head, -0.12); P(cyl(0.42, 0.42, 0.03, 24), hm(v.shirt ?? C.purple), 0, 0.12, 0, head); P(sph(0.05, 8, 6), M(C.gold, { e: C.gold, ei: 1 }), 0.06, 0.5, 0.18, head); break;
    case 'chef': P(cyl(0.22, 0.2, 0.3, 18), hm(C.white), 0, 0.3, 0, head); P(sph(0.26, 16, 10), hm(C.white), 0, 0.48, 0, head, 0, 0, 0, [1, 0.6, 1]); break;
    case 'cap': P(hemiGeo(0.27), hm(0x23305a), 0, 0.06, 0, head); P(box(0.3, 0.03, 0.18, 0.01), hm(0x1a1f30), 0, 0.08, 0.24, head); P(sph(0.04, 8, 6), M(C.gold, { m: 0.9 }), 0, 0.2, 0.25, head); break;
    case 'tricorn': P(cyl(0.3, 0.38, 0.14, 3), hm(C.black), 0, 0.22, 0, head); break;
    case 'straw': P(cyl(0.48, 0.48, 0.03, 28), hm(0xe8c66a, { r: 0.9 }), 0, 0.12, 0, head); P(cyl(0.22, 0.25, 0.2, 20), hm(0xe8c66a, { r: 0.9 }), 0, 0.22, 0, head); break;
    case 'band': P(hemiGeo(0.265), M(v.hair ?? 0x1d1e24, { r: 0.8 }), 0, 0.02, -0.02, head, -0.25); P(tor(0.255, 0.03, TAU, 6, 24), hm(C.red), 0, 0.08, 0, head, Math.PI / 2); break;
    case 'hood': P(sph(0.3, 20, 14), hm(v.shirt ?? C.black), 0, 0.03, -0.03, head); P(box(0.36, 0.1, 0.1, 0.03), hm(v.skin ?? C.skin), 0, 0.03, 0.24, head); break;
    case 'mask': P(hemiGeo(0.265), M(0x1d1e24, { r: 0.6 }), 0, 0.02, -0.02, head, -0.25); P(box(0.36, 0.16, 0.08, 0.05), glass(0x9fe0ff), 0, 0.04, 0.22, head); break;
    case 'crown': P(cyl(0.2, 0.2, 0.14, 8, true), M(C.gold, { m: 1, r: 0.25, side: 1 }), 0, 0.28, 0, head); break;
    default: break;
  }
  if (v.beard) P(cone(0.16, 0.4, 14), M(0xeeeeee, { r: 0.9 }), 0, -0.26, 0.15, head, Math.PI + 0.3);
  if (v.patch) P(cyl(0.06, 0.06, 0.02, 12), M(C.black, {}), 0.085, 0.04, 0.24, head, Math.PI / 2);
  if (v.tank) P(caps(0.12, 0.45), M(0xf2c230, { r: 0.3, m: 0.5 }), 0, 1.05, -0.32, root);
  if (v.coat) P(box(0.56, 0.7, 0.4, 0.12), M(C.white, { r: 0.7 }), 0, 0.92, 0, root);
  const hand = arms[1];
  if (v.hold === 'sword') { const s = new THREE.Group(); B.sword(s); s.scale.setScalar(0.7); s.position.set(0, -0.5, 0.05); s.rotation.x = Math.PI / 2; hand.add(s); }
  if (v.hold === 'staff') { P(cyl(0.025, 0.025, 1.4, 8), M(C.woodD, {}), 0, -0.4, 0.05, hand); P(sph(0.08, 12, 10), M(0x9ff0ff, { e: 0x5ad8ff, ei: 3 }), 0, 0.32, 0.05, hand); g.userData.glow = 0x7ad8ff; }
  if (v.hold === 'club') { const s = new THREE.Group(); B.club(s); s.position.set(0, -0.5, 0.05); s.rotation.x = Math.PI / 2 + 0.4; s.scale.setScalar(1.1); hand.add(s); }
  if (v.hold === 'hose') P(tor(0.2, 0.04, TAU * 0.8, 6, 18), M(0xd9c79a, {}), 0, -0.5, 0.1, hand);
  if (v.hold === 'cutlass') { P(tor(0.4, 0.025, Math.PI * 0.5, 6, 12), M(0xdfe6ee, { m: 1, r: 0.2 }), 0, -0.5, 0.3, hand, Math.PI / 2); }
  if (v.zombie) arms.forEach((a) => (a.rotation.x = -1.4));
  g.userData.legs = legs; g.userData.arms = arms;
}
B.person = person;
B.robot = (g) => {
  const m = M(0xb9c4d0, { r: 0.3, m: 0.85, main: 1 }), d = M(0x3a404c, { r: 0.4, m: 0.7 });
  const legs = [];
  for (const x of [-0.18, 0.18]) { const p = new THREE.Group(); p.position.set(x, 0.62, 0); g.add(p); P(box(0.18, 0.6, 0.2, 0.05), d, 0, -0.3, 0, p); legs.push(p); }
  P(box(0.7, 0.75, 0.5, 0.1), m, 0, 1.0, 0, g);
  P(cyl(0.12, 0.12, 0.03, 18), M(0x5ad8ff, { e: 0x2ab8ff, ei: 2.5 }), 0, 1.05, 0.26, g, Math.PI / 2);
  const arms = [];
  for (const x of [-0.45, 0.45]) { const p = new THREE.Group(); p.position.set(x, 1.3, 0); g.add(p); P(box(0.14, 0.6, 0.16, 0.05), d, 0, -0.3, 0, p); arms.push(p); }
  P(box(0.5, 0.4, 0.42, 0.1), m, 0, 1.62, 0, g);
  for (const x of [-0.11, 0.11]) P(sph(0.06, 12, 8), M(0x9ff0ff, { e: 0x5ad8ff, ei: 3 }), x, 1.65, 0.21, g);
  P(cyl(0.015, 0.015, 0.25, 6), d, 0, 1.95, 0, g); P(sph(0.05, 10, 8), M(C.red, { e: C.red, ei: 2 }), 0, 2.08, 0, g);
  g.userData.legs = legs; g.userData.arms = arms;
};
B.ghost = (g) => {
  const m = M(0xf2f6ff, { r: 0.5, e: 0x8090c0, ei: 0.6, o: 0.82, main: 1 });
  P(sph(0.45, 24, 16), m, 0, 1.45, 0, g);
  P(cyl(0.45, 0.55, 0.9, 24, true), m, 0, 0.98, 0, g);
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; P(sph(0.13, 10, 8), m, Math.cos(a) * 0.5, 0.55, Math.sin(a) * 0.5, g); }
  for (const x of [-0.14, 0.14]) P(sph(0.07, 10, 8), M(C.black, {}), x, 1.5, 0.4, g, 0, 0, 0, [1, 1.4, 0.5]);
};
B.monster = (g, v = {}) => {
  const m = M(v.c ?? 0x7a4fd8, { r: 0.85, flat: 1, main: 1 });
  P(ico(0.75, 1), m, 0, 1.05, 0, g);
  for (const x of [-0.4, 0.4]) P(cone(0.12, 0.45, 10), M(0xf3e6c8, {}), x, 1.8, 0, g, 0, 0, -x * 0.8);
  P(sph(0.22, 16, 12), eyeW(), 0, 1.25, 0.62, g); P(sph(0.11, 12, 10), M(0xd23a2a, {}), 0, 1.25, 0.8, g);
  for (let i = 0; i < 5; i++) P(cone(0.05, 0.14, 6), M(0xffffff, {}), -0.24 + i * 0.12, 0.78, 0.66, g, Math.PI);
  const legs = [];
  for (const x of [-0.35, 0.35]) { const p = new THREE.Group(); p.position.set(x, 0.45, 0); g.add(p); P(caps(0.16, 0.25), m, 0, -0.2, 0, p); legs.push(p); }
  g.userData.legs = legs;
};
B.quad = (g, v = {}) => {
  const root = new THREE.Group(); root.scale.setScalar(v.s ?? 1); g.add(root);
  const body = M(v.c, { r: v.r ?? 0.85, main: 1 }), belly = M(v.c2 ?? v.c, { r: 0.85 });
  const L = v.len ?? 1.0, H = v.h ?? 0.45, W = v.w ?? 0.42, BH = v.bh ?? 0.45, HR = v.head ?? 0.28;
  if (v.wool) { for (let i = 0; i < 9; i++) P(sph(BH * 0.55, 12, 10), M(0xf6f3ea, { r: 1, main: 1 }), ((i % 3) - 1) * W * 0.5, H + BH * 0.5 + (i % 2) * 0.08, (Math.floor(i / 3) - 1) * L * 0.33, root); }
  else P(caps(BH / 2, Math.max(0.01, L - BH)), body, 0, H + BH / 2, 0, root, Math.PI / 2, 0, 0, [W / BH, 1, 1]);
  const legs = [];
  const legMat = v.legC ? M(v.legC, { r: 0.85 }) : body;
  for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const p = new THREE.Group(); p.position.set(x * W * 0.3, H + 0.05, z * (L / 2 - BH * 0.3)); root.add(p);
    P(cyl(v.thick ?? 0.08, (v.thick ?? 0.08) * 0.85, H + 0.05, 10), legMat, 0, -(H + 0.05) / 2, 0, p);
    P(sph((v.thick ?? 0.08) * 1.1, 10, 8), M(v.paw ?? v.c2 ?? v.c, { r: 0.85 }), 0, -H, 0.02, p, 0, 0, 0, [1, 0.6, 1.2]);
    legs.push(p);
  }
  const head = new THREE.Group(); head.position.set(0, H + BH * 0.85 + (v.neck ?? 0), L / 2 + HR * 0.3); root.add(head);
  if (v.neck) P(cyl(HR * 0.55, HR * 0.7, v.neck + 0.2, 10), body, 0, -v.neck / 2 - 0.05, -HR * 0.3, head, -0.35);
  P(sph(HR, 20, 14), v.wool ? M(0x3a3430, { r: 0.8 }) : body, 0, 0, 0, head);
  if (v.snout !== false) P(sph(HR * (v.snoutR ?? 0.55), 14, 10), M(v.snoutC ?? v.c2 ?? v.c, { r: 0.8 }), 0, -HR * 0.25, HR * 0.8, head, 0, 0, 0, [1, 0.8, v.snoutL ?? 1.1]);
  P(sph(HR * 0.16, 10, 8), M(v.noseC ?? C.black, { r: 0.4 }), 0, -HR * 0.1, HR * (0.8 + 0.55 * (v.snoutL ?? 1.1) * 0.95), head);
  eyes(head, HR * 0.4, HR * 0.25, HR * 0.82, HR * 0.17);
  const ear = M(v.earC ?? v.c, { r: 0.85 });
  if (v.ears === 'pointy') for (const s of [-1, 1]) P(cone(HR * 0.32, HR * 0.7, 8), ear, s * HR * 0.55, HR * 0.8, 0, head, 0, 0, -s * 0.3);
  if (v.ears === 'round') for (const s of [-1, 1]) P(sph(HR * (v.earR ?? 0.32), 12, 10), ear, s * HR * 0.7, HR * 0.75, -HR * 0.1, head, 0, 0, 0, [1, 1, 0.5]);
  if (v.ears === 'floppy') for (const s of [-1, 1]) P(sph(HR * 0.35, 12, 10), ear, s * HR * 0.9, HR * 0.05, -HR * 0.05, head, 0, 0, s * 0.4, [0.45, 1.3, 0.8]);
  if (v.ears === 'big') for (const s of [-1, 1]) P(cyl(HR * 0.95, HR * 0.95, 0.06, 20), ear, s * HR * 1.05, 0, -HR * 0.3, head, 0, 0, Math.PI / 2 + s * 0.2);
  if (v.horns === 'cow') for (const s of [-1, 1]) P(cone(HR * 0.12, HR * 0.5, 8), M(0xf3e6c8, {}), s * HR * 0.55, HR * 0.8, -HR * 0.1, head, 0, 0, -s * 0.9);
  if (v.horns === 'goat') for (const s of [-1, 1]) P(tor(HR * 0.45, HR * 0.1, Math.PI, 8, 14), M(0xa89a82, { r: 0.6 }), s * HR * 0.35, HR * 0.6, -HR * 0.45, head, 0, Math.PI / 2, 0);
  if (v.horns === 'uni') P(cone(HR * 0.12, HR * 1.4, 10), M(C.gold, { m: 0.8, r: 0.3, e: 0xffb31a, ei: 0.4 }), 0, HR * 1.1, HR * 0.4, head, 0.5);
  if (v.beard) P(cone(HR * 0.2, HR * 0.6, 8), M(0xd8d2c4, {}), 0, -HR * 0.8, HR * 0.7, head, Math.PI);
  if (v.mane) P(tor(HR * 0.95, HR * 0.4, TAU, 8, 18), M(v.mane, { r: 0.95, flat: 1 }), 0, 0, -HR * 0.1, head);
  if (v.trunk) { for (let i = 0; i < 5; i++) P(cyl(HR * (0.26 - i * 0.03), HR * (0.28 - i * 0.03), HR * 0.5, 10), body, 0, -HR * 0.3 - i * HR * 0.4, HR * (1.0 + i * 0.08 - i * i * 0.02), head, 0.2 + i * 0.1); P(cone(HR * 0.1, HR * 0.8, 8), M(0xf3e6c8, {}), HR * 0.45, -HR * 0.55, HR * 0.8, head, 1.6, 0, 0); P(cone(HR * 0.1, HR * 0.8, 8), M(0xf3e6c8, {}), -HR * 0.45, -HR * 0.55, HR * 0.8, head, 1.6, 0, 0); }
  if (v.spots) for (let i = 0; i < 6; i++) P(sph(BH * 0.28, 10, 8), M(v.spots, { r: 0.85 }), (i % 2 ? 1 : -1) * W * 0.48, H + BH * (0.4 + (i % 3) * 0.15), -L * 0.35 + i * L * 0.14, root, 0, 0, 0, [0.3, 1, 1.2]);
  if (v.stripes) for (let i = 0; i < 6; i++) P(tor(BH * 0.52, 0.025, Math.PI, 6, 14), M(v.stripes, { r: 0.85 }), 0, H + BH * 0.5, -L * 0.3 + i * L * 0.12, root, 0, 0, 0, [W / BH, 1, 1]);
  const tail = new THREE.Group(); tail.position.set(0, H + BH * 0.7, -L / 2); root.add(tail);
  if (v.tail === 'long') { P(cyl(0.035, 0.05, 0.7, 8), body, 0, 0.1, -0.3, tail, -1.0); if (v.tuft) P(sph(0.09, 10, 8), M(v.tuft, {}), 0, 0.32, -0.6, tail); }
  if (v.tail === 'up') P(cyl(0.035, 0.05, 0.5, 8), body, 0, 0.2, -0.1, tail, -0.5);
  if (v.tail === 'bushy') P(caps(0.1, 0.45), body, 0, -0.05, -0.3, tail, -1.1);
  if (v.tail === 'short') P(sph(0.09, 10, 8), body, 0, 0, -0.02, tail);
  if (v.tail === 'curly') P(tor(0.08, 0.025, TAU * 0.8, 6, 14), body, 0, 0, -0.06, tail, 0, Math.PI / 2);
  if (v.tail === 'thin') P(cyl(0.012, 0.02, 0.7, 6), M(0xf4a6b5, {}), 0, -0.1, -0.35, tail, -1.3);
  if (v.tail === 'hair') P(cone(0.1, 0.7, 8), M(v.mane ?? v.c, { r: 0.95 }), 0, -0.3, -0.12, tail, -0.5);
  if (v.udder) P(sph(0.13, 12, 8), M(0xf4a6b5, {}), 0, H - 0.02, -L * 0.15, root);
  g.userData.legs = legs; g.userData.head = head; g.userData.tail = tail;
};
B.bird = (g, v = {}) => {
  const root = new THREE.Group(); root.scale.setScalar(v.s ?? 1); g.add(root);
  const m = M(v.c ?? C.blue, { r: 0.7, main: 1 }), b2 = M(v.c2 ?? 0xf4f2ee, { r: 0.75 });
  P(sph(0.3, 20, 14), m, 0, 0.55, 0, root, 0, 0, 0, [1, 0.95, 1.2]);
  P(sph(0.24, 16, 12), b2, 0, 0.5, 0.12, root, 0, 0, 0, [0.9, 0.9, 1]);
  const hc = v.headC ? M(v.headC, { r: 0.7 }) : m;
  P(sph(v.owl ? 0.26 : 0.2, 18, 12), hc, 0, v.owl ? 0.82 : 0.86, v.owl ? 0.12 : 0.24, root);
  if (v.owl) { for (const s of [-1, 1]) { P(sph(0.09, 14, 10), M(0xffd34d, {}), s * 0.1, 0.86, 0.33, root); P(sph(0.05, 10, 8), dark(), s * 0.1, 0.86, 0.4, root); P(cone(0.05, 0.14, 6), m, s * 0.15, 1.08, 0.1, root, 0, 0, -s * 0.3); } }
  else eyes(root, 0.09, 0.9, 0.4, 0.04);
  const beak = M(v.beak ?? 0xf2a53a, { r: 0.5 });
  if (v.flat) P(box(0.16, 0.05, 0.2, 0.02), beak, 0, 0.82, 0.48, root);
  else P(cone(0.06, v.hook ? 0.18 : 0.16, 8), beak, 0, 0.83, v.owl ? 0.38 : 0.47, root, Math.PI / 2 + (v.hook ? 0.4 : 0));
  if (v.comb) { P(sph(0.07, 10, 8), M(C.red, {}), 0, 1.06, 0.24, root, 0, 0, 0, [0.5, 1.2, 1.4]); P(sph(0.05, 8, 6), M(C.red, {}), 0, 0.72, 0.42, root); }
  if (v.crest) P(cone(0.05, 0.22, 8), M(v.crest, {}), 0, 1.08, 0.18, root, -0.5);
  const wings = [];
  for (const s of [-1, 1]) { const p = new THREE.Group(); p.position.set(s * 0.26, 0.62, 0); root.add(p); P(sph(0.22, 14, 10), M(v.wingC ?? v.c ?? C.blue, { r: 0.7 }), s * 0.18, 0, -0.04, p, 0, 0, 0, [1.3, 0.25, 0.85]); wings.push(p); }
  P(cone(0.14, 0.3, 4), m, 0, 0.55, -0.42, root, -Math.PI / 2 - 0.3, Math.PI / 4, 0, [1, 1, 0.3]);
  for (const x of [-0.08, 0.08]) P(cyl(0.015, 0.015, 0.3, 5), M(0xf2a53a, {}), x, 0.15, 0.02, root);
  g.userData.wings = wings;
};
B.fishy = (g, v = {}) => {
  const root = new THREE.Group(); root.scale.setScalar(v.s ?? 1); g.add(root);
  const m = M(v.c ?? 0xf08a24, { r: 0.35, m: 0.2, main: 1 });
  P(sph(0.3, 20, 14), m, 0, 0.3, 0, root, 0, 0, 0, [0.55, 0.85, 1.5]);
  if (v.belly) P(sph(0.28, 16, 12), M(v.belly, { r: 0.5 }), 0, 0.22, 0.02, root, 0, 0, 0, [0.5, 0.6, 1.4]);
  P(cone(0.22, 0.32, 4), M(v.fin ?? v.c ?? 0xf08a24, { r: 0.4 }), 0, 0.3, -0.52, root, -Math.PI / 2, Math.PI / 4, 0, [0.2, 1, 1.2]);
  P(cone(0.12, 0.3, 4), M(v.fin ?? v.c ?? 0xf08a24, { r: 0.4 }), 0, 0.6, -0.05, root, 0, Math.PI / 4, 0, [0.15, 1, 1]);
  eyes(root, 0.13, 0.36, 0.3, 0.045);
  if (v.teeth) for (let i = 0; i < 6; i++) P(cone(0.02, 0.06, 4), M(0xffffff, {}), -0.08 + i * 0.032, 0.2, 0.42, root, Math.PI);
};
B.snake = (g, v = {}) => {
  const pts = []; for (let i = 0; i <= 20; i++) pts.push(V3(Math.sin(i * 0.6) * 0.35, 0.12, -1 + i * 0.1));
  const tube = G('snake', () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.1, 10));
  P(tube, M(v.c ?? 0x4caf50, { r: 0.45, main: 1 }), 0, 0, 0, g);
  P(sph(0.15, 14, 10), M(v.c ?? 0x4caf50, { r: 0.45, main: 1 }), pts[20].x, 0.15, 1.05, g, 0, 0, 0, [1, 0.7, 1.3]);
  eyes(g, 0.07, 0.24, 1.15, 0.035);
  P(cyl(0.008, 0.008, 0.15, 4), M(C.red, {}), pts[20].x, 0.12, 1.28, g, Math.PI / 2);
};
B.spider = (g) => {
  const m = M(0x23202a, { r: 0.5, main: 1 });
  P(sph(0.32, 18, 12), m, 0, 0.45, -0.2, g, 0, 0, 0, [1, 0.85, 1.2]); P(sph(0.2, 16, 12), m, 0, 0.42, 0.25, g);
  P(sph(0.08, 10, 8), M(C.red, {}), 0, 0.72, -0.25, g, 0, 0, 0, [1, 0.3, 1.4]);
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const z = 0.35 - i * 0.18; P(cyl(0.025, 0.025, 0.5, 5), m, s * 0.32, 0.55, z, g, 0, 0, s * 1.0); P(cyl(0.02, 0.02, 0.55, 5), m, s * 0.6, 0.28, z, g, 0, 0, -s * 0.4); }
  eyes(g, 0.07, 0.48, 0.42, 0.04);
};
B.frog = (g) => {
  const m = M(0x5cb84a, { r: 0.45, main: 1 });
  P(sph(0.3, 18, 12), m, 0, 0.25, 0, g, 0, 0, 0, [1.1, 0.7, 1]);
  for (const s of [-1, 1]) { P(sph(0.1, 12, 10), m, s * 0.13, 0.45, 0.15, g); P(sph(0.06, 10, 8), dark(), s * 0.13, 0.48, 0.22, g); P(sph(0.12, 10, 8), m, s * 0.3, 0.1, -0.08, g, 0, 0, 0, [1, 0.5, 1.6]); }
  P(sph(0.18, 14, 10), M(0xdff0a0, {}), 0, 0.18, 0.1, g, 0, 0, 0, [1, 0.6, 1]);
};
B.dragon = (g, v = {}) => {
  const root = new THREE.Group(); root.scale.setScalar(v.s ?? 1); g.add(root);
  const m = M(v.c ?? 0xc8352b, { r: 0.45, m: 0.15, main: 1 }), b = M(0xf2c15a, { r: 0.6 }), dk = M(0x5a1a14, { r: 0.6 });
  P(caps(0.45, 1.2), m, 0, 1.0, 0, root, Math.PI / 2);
  P(caps(0.36, 1.0), b, 0, 0.85, 0.1, root, Math.PI / 2, 0, 0, [0.9, 1, 0.8]);
  const legs = [];
  for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const p = new THREE.Group(); p.position.set(x * 0.35, 0.75, z * 0.55); root.add(p); P(cyl(0.13, 0.1, 0.75, 10), m, 0, -0.37, 0, p); P(sph(0.14, 10, 8), dk, 0, -0.72, 0.06, p, 0, 0, 0, [1, 0.6, 1.3]); legs.push(p); }
  P(cyl(0.2, 0.3, 1.0, 12), m, 0, 1.55, 0.95, root, 0.7);
  const head = new THREE.Group(); head.position.set(0, 2.0, 1.4); root.add(head);
  P(sph(0.34, 18, 12), m, 0, 0, 0, head, 0, 0, 0, [1, 0.9, 1.1]);
  P(box(0.42, 0.26, 0.5, 0.1), m, 0, -0.08, 0.36, head);
  for (const s of [-1, 1]) { P(cone(0.07, 0.55, 8), M(0xf3e6c8, {}), s * 0.18, 0.3, -0.2, head, -0.9, 0, -s * 0.2); P(sph(0.03, 6, 6), dark(), s * 0.1, -0.02, 0.62, head); }
  eyes(head, 0.17, 0.1, 0.24, 0.07);
  for (let i = 0; i < 6; i++) P(cone(0.08, 0.22, 6), dk, 0, 1.45 - i * 0.02, 0.55 - i * 0.35, root);
  const tail = new THREE.Group(); tail.position.set(0, 1.0, -0.8); root.add(tail);
  for (let i = 0; i < 6; i++) P(sph(0.26 - i * 0.035, 12, 10), m, Math.sin(i * 0.6) * 0.2, -i * 0.1, -i * 0.28, tail);
  P(cone(0.16, 0.28, 4), dk, Math.sin(3.6) * 0.2, -0.62, -1.75, tail, -Math.PI / 2, 0, 0, [1, 1, 0.3]);
  const wingShape = () => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(1.7, 0.7); s.lineTo(1.9, -0.1); s.lineTo(1.4, -0.3); s.lineTo(1.0, -0.6); s.lineTo(0.6, -0.5); s.lineTo(0, -0.6); s.closePath(); return s; };
  const wings = [];
  for (const sd of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(sd * 0.3, 1.4, 0.3); root.add(p);
    const w = P(ext('dwing', wingShape, 0.03, 0.01), M(v.wing ?? 0x8a2320, { r: 0.6, side: 1 }), 0, 0, 0, p, Math.PI / 2, 0, 0);
    if (sd < 0) w.scale.x = -1;
    wings.push(p);
  }
  g.userData.wings = wings; g.userData.wingFlat = true; g.userData.legs = legs; g.userData.head = head;
  g.userData.mouth = V3(0, 1.95 * (v.s ?? 1), 1.95 * (v.s ?? 1));
};

// ---------------- food
B.apple = (g, v = {}) => {
  P(sph(0.22, 20, 14), M(v.c ?? 0xd83a2e, { r: 0.35, main: 1 }), 0, 0.21, 0, g, 0, 0, 0, [1, 0.92, 1]);
  P(cyl(0.015, 0.015, 0.1, 5), M(C.brown, {}), 0, 0.45, 0, g);
  P(sph(0.06, 8, 6), M(C.leaf, {}), 0.06, 0.46, 0, g, 0, 0, 0.5, [1.3, 0.3, 0.7]);
};
B.banana = (g) => P(tor(0.3, 0.06, Math.PI * 0.7, 8, 16), M(0xf7d54a, { r: 0.5, main: 1 }), 0, 0.33, 0, g, 0, 0, Math.PI * 1.15);
B.berries = (g) => { for (let i = 0; i < 9; i++) P(sph(0.07, 10, 8), M(0x5b2a8a, { r: 0.3, main: 1 }), Math.cos(i * 2.1) * 0.1 * (i % 3), 0.07 + (i > 5 ? 0.1 : 0), Math.sin(i * 2.1) * 0.1 * (i % 3), g); P(sph(0.06, 8, 6), M(C.leaf, {}), 0, 0.25, 0, g, 0, 0, 0, [1.5, 0.3, 0.8]); };
B.carrot = (g) => {
  P(cone(0.1, 0.55, 12), M(0xf28a2a, { r: 0.6, main: 1 }), 0, 0.1, 0, g, 0, 0, Math.PI / 2);
  for (let i = 0; i < 3; i++) P(cone(0.03, 0.25, 6), M(C.leaf, {}), -0.35, 0.1 + (i - 1) * 0.04, 0, g, 0, 0, Math.PI / 2 + (i - 1) * 0.4);
};
B.cheese = (g) => {
  const sh = () => { const s = new THREE.Shape(); s.moveTo(-0.3, 0); s.lineTo(0.3, 0); s.lineTo(-0.3, 0.3); s.closePath(); return s; };
  P(ext('cheese', sh, 0.35, 0.02), M(0xffcf4a, { r: 0.55, main: 1 }), 0, 0.02, 0, g, 0, Math.PI / 2);
  for (const [x, y] of [[0.1, 0.1], [-0.08, 0.18]]) P(sph(0.04, 8, 6), M(0xd9a52a, {}), 0.18, y, x, g);
};
B.bread = (g) => P(caps(0.18, 0.4), M(0xd99a4e, { r: 0.75, main: 1 }), 0, 0.17, 0, g, 0, 0, Math.PI / 2, [1, 1, 1.2]);
B.cake = (g) => {
  P(cyl(0.45, 0.45, 0.3, 28), M(0xf6d9e6, { r: 0.6, main: 1 }), 0, 0.15, 0, g);
  P(cyl(0.35, 0.35, 0.25, 28), M(0xffffff, { r: 0.6 }), 0, 0.42, 0, g);
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; P(sph(0.05, 8, 6), M(0xd8302b, { r: 0.2 }), Math.cos(a) * 0.28, 0.58, Math.sin(a) * 0.28, g); }
  P(cyl(0.02, 0.02, 0.2, 6), M(0x7fc4ff, {}), 0, 0.65, 0, g);
};
B.pie = (g) => {
  P(cyl(0.42, 0.36, 0.14, 28), M(0xd9a05a, { r: 0.7, main: 1 }), 0, 0.07, 0, g);
  for (let i = -2; i <= 2; i++) { P(box(0.06, 0.03, 0.76, 0.01), M(0xe8b878, {}), i * 0.14, 0.15, 0, g); P(box(0.76, 0.03, 0.06, 0.01), M(0xe8b878, {}), 0, 0.16, i * 0.14, g); }
};
B.cookie = (g) => { P(cyl(0.22, 0.22, 0.05, 22), M(0xd39a54, { r: 0.8, main: 1 }), 0, 0.03, 0, g); for (let i = 0; i < 6; i++) P(sph(0.025, 6, 5), M(0x4a2a18, {}), Math.cos(i * 1.7) * 0.13, 0.06, Math.sin(i * 1.7) * 0.13, g); };
B.icecream = (g) => {
  P(cone(0.13, 0.4, 14), M(0xd9a05a, { r: 0.7 }), 0, 0.2, 0, g, Math.PI);
  P(sph(0.15, 14, 10), M(0xffb6cc, { r: 0.5, main: 1 }), 0, 0.46, 0, g); P(sph(0.13, 14, 10), M(0xfff1d8, { r: 0.5 }), 0, 0.64, 0, g);
  P(sph(0.04, 8, 6), M(C.red, {}), 0, 0.79, 0, g);
};
B.honey = (g) => {
  P(cyl(0.2, 0.22, 0.38, 20), glass(0xffb020, { main: 1, r: 0.1 }), 0, 0.19, 0, g);
  P(cyl(0.18, 0.18, 0.32, 20), M(0xf0a020, { r: 0.25, e: 0x6a3a00, ei: 0.4 }), 0, 0.18, 0, g);
  P(cyl(0.22, 0.22, 0.06, 20), M(0xd9302b, { r: 0.7 }), 0, 0.41, 0, g);
  P(box(0.22, 0.12, 0.02, 0.01), M(C.cream, {}), 0, 0.22, 0.21, g);
};
B.meat = (g) => {
  P(sph(0.22, 16, 12), M(0xa8502a, { r: 0.6, main: 1 }), 0.1, 0.18, 0, g, 0, 0, 0, [1.3, 0.85, 1]);
  P(cyl(0.04, 0.04, 0.35, 8), M(0xf3e6c8, {}), -0.25, 0.14, 0, g, 0, 0, Math.PI / 2);
  for (const z of [-0.05, 0.05]) P(sph(0.055, 8, 6), M(0xf3e6c8, {}), -0.43, 0.14, z, g);
};
B.pizza = (g) => {
  P(cyl(0.45, 0.45, 0.05, 28), M(0xe8b060, { r: 0.7 }), 0, 0.03, 0, g);
  P(cyl(0.4, 0.4, 0.02, 28), M(0xf2c84a, { r: 0.6, main: 1 }), 0, 0.065, 0, g);
  for (let i = 0; i < 7; i++) P(cyl(0.06, 0.06, 0.02, 12), M(0xc8302b, {}), Math.cos(i * 1.3) * 0.25 * ((i % 2) + 0.5), 0.08, Math.sin(i * 1.3) * 0.25 * ((i % 2) + 0.5), g);
};
B.hay = (g) => {
  P(box(0.9, 0.5, 0.55, 0.08), M(0xe6c25a, { r: 1, main: 1 }), 0, 0.25, 0, g);
  for (const x of [-0.22, 0.22]) P(box(0.04, 0.52, 0.57, 0.01), M(0xa8743f, {}), x, 0.25, 0, g);
};
B.salad = (g) => { P(sph(0.3, 18, 10, 0), M(0xffffff, { r: 0.3 }), 0, 0.18, 0, g, Math.PI, 0, 0, [1, 0.6, 1]); for (let i = 0; i < 8; i++) P(sph(0.1, 10, 8), M(i % 3 ? 0x6cc24a : 0xd8302b, { r: 0.6, main: i % 3 > 0 }), Math.cos(i) * 0.15, 0.25, Math.sin(i) * 0.15, g); };
B.bone = (g) => { const m = M(0xf3ecd8, { r: 0.6, main: 1 }); P(cyl(0.05, 0.05, 0.5, 8), m, 0, 0.08, 0, g, 0, 0, Math.PI / 2); for (const x of [-0.27, 0.27]) for (const z of [-0.06, 0.06]) P(sph(0.07, 10, 8), m, x, 0.08, z, g); };
B.egg = (g) => P(sph(0.16, 18, 14), M(0xf6efe0, { r: 0.45, main: 1 }), 0, 0.2, 0, g, 0, 0, 0, [0.85, 1.15, 0.85]);
B.watermelon = (g) => { P(sph(0.4, 22, 16), M(0x2e8a3a, { r: 0.4, main: 1 }), 0, 0.36, 0, g, 0, 0, 0, [1.2, 0.9, 1]); for (let i = 0; i < 6; i++) P(tor(0.4, 0.02, Math.PI, 6, 18), M(0x1d5a24, {}), 0, 0.36, 0, g, 0, i / 6 * Math.PI, Math.PI / 2, [1.2, 0.9, 1]); };
B.mushroom = (g, v = {}) => { P(cyl(0.08, 0.1, 0.3, 12), M(C.cream, {}), 0, 0.15, 0, g); P(hemiGeo(0.24), M(v.c ?? 0xd8302b, { r: 0.5, main: 1, e: v.glow, ei: v.glow ? 1.5 : 1 }), 0, 0.28, 0, g); for (let i = 0; i < 5; i++) P(sph(0.035, 6, 5), M(0xffffff, {}), Math.cos(i * 1.3) * 0.14, 0.43, Math.sin(i * 1.3) * 0.14, g); };
B.candy = (g) => { P(sph(0.14, 14, 10), M(0xff5aa0, { r: 0.25, main: 1 }), 0, 0.15, 0, g); for (const s of [-1, 1]) P(cone(0.09, 0.15, 8), M(0xffd34d, { r: 0.4 }), s * 0.2, 0.15, 0, g, 0, 0, s * Math.PI / 2); };
B.fishfood = (g) => B.fishy(g, { s: 0.7, c: 0x8fb4c8, fin: 0x6a8aa0, belly: 0xe8eef2 });

// ---------------- treasure
B.coin = (g) => { for (let i = 0; i < 3; i++) P(cyl(0.18, 0.18, 0.04, 24), M(C.gold, { r: 0.22, m: 1, main: 1 }), i * 0.03, 0.02 + i * 0.045, 0, g); };
B.goldbar = (g) => P(cyl(0.22, 0.3, 0.2, 4), M(C.gold, { r: 0.18, m: 1, main: 1 }), 0, 0.1, 0, g, 0, Math.PI / 4, 0, [1.8, 1, 0.8]);
B.gem = (g, v = {}) => { P(octa(0.3), glass(v.c ?? 0x5affc8, { main: 1, e: v.c ?? 0x5affc8, ei: 0.35, ior: 2.0 }), 0, 0.42, 0, g, 0, 0, 0, [1, 1.3, 1]); g.userData.spin = true; g.userData.glow = v.c ?? 0x5affc8; };
B.treasure = (g) => {
  P(box(0.9, 0.5, 0.6, 0.06), M(0x8a5a34, { r: 0.8, main: 1 }), 0, 0.25, 0, g);
  P(cyl(0.3, 0.3, 0.9, 20, false), M(0x8a5a34, { r: 0.8, main: 1 }), 0, 0.5, 0, g, 0, 0, Math.PI / 2, [1, 1, 1]).scale.set(1, 1, 1);
  for (const x of [-0.35, 0, 0.35]) P(box(0.06, 0.82, 0.64, 0.01), M(C.gold, { m: 0.9, r: 0.3 }), x, 0.4, 0, g);
  for (let i = 0; i < 5; i++) P(cyl(0.08, 0.08, 0.03, 12), M(C.gold, { m: 1, r: 0.2, e: 0x6a4a00, ei: 0.6 }), -0.3 + i * 0.15, 0.82, 0.25, g, 0.3);
  g.userData.glow = 0xffc54a;
};
B.cash = (g) => { for (let i = 0; i < 3; i++) P(box(0.5, 0.06, 0.25, 0.01), M(0x5fae6a, { r: 0.8, main: 1 }), i * 0.03, 0.03 + i * 0.065, 0, g, 0, i * 0.1); P(box(0.1, 0.2, 0.27, 0.01), M(0xf3e6c8, {}), 0.03, 0.1, 0, g); };
B.crown = (g) => {
  const m = M(C.gold, { r: 0.2, m: 1, main: 1 });
  P(cyl(0.3, 0.3, 0.18, 24, true), M(C.gold, { r: 0.2, m: 1, side: 1, main: 1 }), 0, 0.09, 0, g);
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; P(cone(0.07, 0.22, 6), m, Math.cos(a) * 0.3, 0.28, Math.sin(a) * 0.3, g); P(sph(0.04, 8, 6), M(i % 2 ? 0xd8302b : 0x3a7bff, { r: 0.2 }), Math.cos(a) * 0.31, 0.1, Math.sin(a) * 0.31, g); }
  g.userData.spin = true;
};

// ---------------- toys & music
B.ball = (g, v = {}) => { P(hemiGeo(0.3), M(v.c ?? 0xd8302b, { r: 0.3, main: 1 }), 0, 0.3, 0, g); P(hemiGeo(0.3), M(0xffffff, { r: 0.3 }), 0, 0.3, 0, g, Math.PI); };
B.teddy = (g) => {
  const m = M(0xb07a45, { r: 0.95, main: 1 }), l = M(0xe0c098, { r: 0.95 });
  P(sph(0.3, 16, 12), m, 0, 0.32, 0, g); P(sph(0.24, 16, 12), m, 0, 0.78, 0, g);
  for (const s of [-1, 1]) { P(sph(0.09, 10, 8), m, s * 0.17, 0.98, 0, g); P(sph(0.1, 10, 8), m, s * 0.3, 0.42, 0.08, g); P(sph(0.11, 10, 8), m, s * 0.17, 0.08, 0.15, g); }
  P(sph(0.1, 10, 8), l, 0, 0.73, 0.2, g); P(sph(0.035, 8, 6), dark(), 0, 0.76, 0.3, g); eyes(g, 0.08, 0.85, 0.2, 0.035);
  P(sph(0.18, 12, 10), l, 0, 0.32, 0.18, g, 0, 0, 0, [1, 1, 0.5]);
};
B.kite = (g) => {
  const sh = () => { const s = new THREE.Shape(); s.moveTo(0, 0.6); s.lineTo(0.4, 0); s.lineTo(0, -0.8); s.lineTo(-0.4, 0); s.closePath(); return s; };
  P(ext('kite', sh, 0.02, 0), M(0xff5aa0, { r: 0.6, side: 1, main: 1 }), 0, 1.4, 0, g, -0.3);
  for (let i = 0; i < 4; i++) P(box(0.12, 0.06, 0.02, 0.01), M([0xffd34d, 0x5ad8ff, 0x8b5cf6, 0x5fd6a0][i], {}), 0, 0.55 - i * 0.14, 0.2 + i * 0.03, g, 0, 0, i);
};
B.flute = (g) => { P(cyl(0.035, 0.035, 0.8, 12), M(0xd9c09a, { r: 0.4, m: 0.3, main: 1 }), 0, 0.04, 0, g, 0, 0, Math.PI / 2); for (let i = 0; i < 6; i++) P(cyl(0.012, 0.012, 0.01, 6), dark(), -0.2 + i * 0.08, 0.075, 0, g); };
B.guitar = (g) => {
  const m = M(0xc8783a, { r: 0.45, main: 1 });
  P(cyl(0.32, 0.32, 0.12, 24), m, 0, 0.32, 0, g, Math.PI / 2); P(cyl(0.25, 0.25, 0.12, 24), m, 0, 0.7, 0, g, Math.PI / 2);
  P(cyl(0.09, 0.09, 0.02, 18), dark(), 0, 0.5, 0.07, g, Math.PI / 2);
  P(box(0.09, 0.8, 0.05, 0.02), M(0x4a2a18, {}), 0, 1.25, 0, g); P(box(0.14, 0.18, 0.05, 0.02), M(0x4a2a18, {}), 0, 1.72, 0, g);
};
B.harp = (g) => {
  const m = M(C.gold, { r: 0.25, m: 0.9, main: 1 });
  P(tor(0.55, 0.05, Math.PI * 0.9, 8, 20), m, 0, 0.75, 0, g, 0, 0, Math.PI * 0.55);
  P(cyl(0.05, 0.06, 1.3, 10), m, -0.4, 0.65, 0, g, 0, 0, 0.15);
  for (let i = 0; i < 7; i++) P(cyl(0.005, 0.005, 0.4 + i * 0.12, 4), M(0xffffff, { e: 0xffffff, ei: 0.4 }), -0.3 + i * 0.1, 0.5 + i * 0.05, 0, g);
};
B.drum = (g) => {
  P(cyl(0.38, 0.38, 0.5, 26), M(0xd8302b, { r: 0.4, main: 1 }), 0, 0.25, 0, g);
  for (const y of [0.02, 0.48]) P(tor(0.38, 0.03, TAU, 6, 28), M(C.gold, { m: 0.9, r: 0.3 }), 0, y, 0, g, Math.PI / 2);
  P(cyl(0.37, 0.37, 0.01, 26), M(0xf6f0e0, { r: 0.7 }), 0, 0.5, 0, g);
  for (const s of [-1, 1]) P(cyl(0.02, 0.02, 0.5, 6), M(C.woodL, {}), s * 0.15, 0.65, 0, g, 0.3, 0, s * 0.4);
};
B.trumpet = (g) => {
  const m = M(C.gold, { r: 0.18, m: 1, main: 1 });
  P(cyl(0.035, 0.035, 0.8, 10), m, 0, 0.15, 0, g, 0, 0, Math.PI / 2);
  P(cyl(0.18, 0.04, 0.3, 18, true), M(C.gold, { r: 0.18, m: 1, side: 1 }), 0.52, 0.15, 0, g, 0, 0, Math.PI / 2);
  for (let i = 0; i < 3; i++) P(cyl(0.03, 0.03, 0.15, 8), m, -0.05 + i * 0.08, 0.25, 0, g);
};
B.violin = (g) => { const m = M(0xa8542a, { r: 0.35, main: 1 }); P(cyl(0.18, 0.18, 0.08, 20), m, 0, 0.2, 0, g, Math.PI / 2); P(cyl(0.14, 0.14, 0.08, 20), m, 0, 0.45, 0, g, Math.PI / 2); P(box(0.05, 0.4, 0.04, 0.01), dark(), 0, 0.75, 0, g); };
B.piano = (g) => {
  const m = M(0x16171c, { r: 0.15, m: 0.2, main: 1 });
  P(box(1.6, 1.1, 0.6, 0.06), m, 0, 0.75, -0.1, g);
  P(box(1.5, 0.08, 0.3, 0.02), M(0xffffff, { r: 0.3 }), 0, 0.72, 0.32, g);
  for (let i = 0; i < 10; i++) P(box(0.06, 0.05, 0.16, 0.01), m, -0.66 + i * 0.15, 0.78, 0.26, g);
  for (const x of [-0.7, 0.7]) P(box(0.08, 0.7, 0.08, 0.02), m, x, 0.35, 0.3, g);
};
B.bell = (g) => {
  P(lathe('bell', [[0, 0.75], [0.12, 0.72], [0.2, 0.6], [0.24, 0.35], [0.33, 0.12], [0.38, 0.05], [0.36, 0.02], [0.0, 0.08]]), M(C.gold, { r: 0.2, m: 1, side: 1, main: 1 }), 0, 0, 0, g);
  P(sph(0.08, 10, 8), M(C.gold, { m: 1 }), 0, 0.06, 0, g);
};
B.musicbox = (g) => {
  P(box(0.5, 0.32, 0.36, 0.05), M(0x8b5cf6, { r: 0.5, main: 1 }), 0, 0.16, 0, g);
  P(box(0.5, 0.04, 0.36, 0.02), M(C.gold, { m: 0.9, r: 0.3 }), 0, 0.34, 0, g);
  P(cyl(0.015, 0.015, 0.15, 6), M(C.gold, { m: 0.9 }), 0.3, 0.2, 0, g, 0, 0, Math.PI / 2);
};

// ---------------- heavy & everyday things
B.anvil = (g) => {
  const m = M(0x3a3f48, { r: 0.4, m: 0.9, main: 1 });
  P(box(0.6, 0.18, 0.45, 0.03), m, 0, 0.09, 0, g); P(box(0.3, 0.3, 0.3, 0.03), m, 0, 0.33, 0, g);
  P(box(0.9, 0.24, 0.42, 0.04), m, 0.05, 0.6, 0, g); P(cone(0.2, 0.4, 4), m, 0.65, 0.6, 0, g, 0, Math.PI / 4, -Math.PI / 2, [1, 1, 0.8]);
};
B.rock = (g) => P(dode(0.35), M(C.stone, { r: 0.9, flat: 1, main: 1 }), 0, 0.3, 0, g, 0.3, 0.5, 0.2, [1.2, 0.85, 1]);
B.boulder = (g) => { P(dode(0.85), M(0x8a857c, { r: 0.9, flat: 1, main: 1 }), 0, 0.75, 0, g, 0.3, 0.5, 0.2, [1.15, 0.9, 1]); P(dode(0.4), M(0x8a857c, { r: 0.9, flat: 1, main: 1 }), 0.6, 0.3, 0.4, g, 1, 0.2, 0.4); };
B.car = (g, v = {}) => {
  const m = M(v.c ?? 0x3a8ae0, { r: 0.25, m: 0.4, main: 1 });
  P(box(2.2, 0.55, 1.1, 0.2), m, 0, 0.55, 0, g);
  P(box(1.2, 0.5, 1.0, 0.22), m, -0.15, 1.0, 0, g);
  P(box(1.22, 0.36, 1.02, 0.15), glass(0x9fd6ff), -0.15, 1.02, 0, g);
  for (const x of [-0.7, 0.7]) for (const z of [-0.55, 0.55]) wheel(g, x, 0.3, z, 0.3);
  for (const z of [-0.35, 0.35]) P(sph(0.08, 10, 8), M(0xffffff, { e: 0xfff2c0, ei: 1.5 }), 1.1, 0.6, z, g);
};
B.safe = (g) => {
  P(box(0.9, 0.9, 0.8, 0.06), M(0x3a4048, { r: 0.4, m: 0.8, main: 1 }), 0, 0.45, 0, g);
  P(cyl(0.12, 0.12, 0.05, 18), M(C.metal, { m: 0.9, r: 0.2 }), 0.1, 0.5, 0.41, g, Math.PI / 2);
  P(box(0.05, 0.3, 0.05, 0.02), M(C.metal, { m: 0.9 }), -0.25, 0.45, 0.42, g);
};
B.crate = (g) => {
  const w = M(0xc8925a, { r: 0.85, main: 1 }), d = M(0x9a6a3a, { r: 0.85, main: 1 });
  P(box(0.8, 0.8, 0.8, 0.03), w, 0, 0.4, 0, g);
  for (const z of [-0.41, 0.41]) { P(box(0.8, 0.1, 0.02, 0.01), d, 0, 0.1, z, g); P(box(0.8, 0.1, 0.02, 0.01), d, 0, 0.7, z, g); P(box(0.1, 0.9, 0.02, 0.01), d, 0, 0.4, z, g, 0, 0, 0.78); }
};
B.barrel = (g) => {
  P(cyl(0.38, 0.38, 0.95, 20), M(0xa8743f, { r: 0.85, main: 1 }), 0, 0.48, 0, g, 0, 0, 0, [1, 1, 1]);
  for (const y of [0.12, 0.48, 0.84]) P(tor(0.385, 0.025, TAU, 6, 24), M(0x4a4f58, { m: 0.8, r: 0.4 }), 0, y, 0, g, Math.PI / 2);
};
B.brick = (g) => P(box(0.5, 0.2, 0.25, 0.02), M(0xb24a32, { r: 0.95, main: 1 }), 0, 0.1, 0, g);
B.statue = (g) => {
  const s = M(0xc9c4ba, { r: 0.8, main: 1 });
  P(box(0.8, 0.4, 0.8, 0.04), s, 0, 0.2, 0, g);
  const f = new THREE.Group(); f.position.y = 0.4; g.add(f); person(f, { skin: 0xc9c4ba, shirt: 0xc9c4ba, pants: 0xc9c4ba, hair: 0xc9c4ba });
  f.traverse((o) => { if (o.isMesh) o.material = s; });
};
B.weight = (g) => { const m = M(0x2b2e36, { r: 0.4, m: 0.8, main: 1 }); P(cyl(0.04, 0.04, 0.9, 8), M(C.metal, { m: 0.9 }), 0, 0.25, 0, g, 0, 0, Math.PI / 2); for (const x of [-0.35, 0.35]) P(cyl(0.25, 0.25, 0.12, 20), m, x, 0.25, 0, g, 0, 0, Math.PI / 2); };
B.tent = (g) => {
  P(cone(1.0, 1.4, 4), M(0xe8743a, { r: 0.8, main: 1 }), 0, 0.7, 0, g, 0, Math.PI / 4, 0, [1, 1, 0.8]);
  P(cone(0.35, 0.8, 3), M(0x3a2a20, {}), 0, 0.4, 0.55, g, 0, 0, 0, [1, 1, 0.1]);
};
B.house = (g) => {
  P(box(2.2, 1.6, 1.8, 0.05), M(0xf3e2c4, { r: 0.9, main: 1 }), 0, 0.8, 0, g);
  P(cyl(1.6, 1.6, 2.4, 3), M(0xb8483a, { r: 0.7 }), 0, 2.05, 0, g, 0, 0, Math.PI / 2, [0.62, 1, 1.08]);
  P(box(0.5, 0.9, 0.06, 0.02), M(0x7a4a2a, {}), 0.3, 0.45, 0.92, g);
  for (const x of [-0.55]) P(box(0.45, 0.45, 0.06, 0.02), M(0xffe2a0, { e: 0xffb050, ei: 0.8 }), x, 0.95, 0.92, g);
};
B.umbrella = (g, v = {}) => {
  P(cone(0.75, 0.35, 8), M(v.c ?? 0x3a7bff, { r: 0.6, main: 1, side: 1 }), 0, 1.35, 0, g);
  P(cyl(0.02, 0.02, 1.3, 6), M(C.dark, {}), 0, 0.68, 0, g);
  P(tor(0.08, 0.02, Math.PI, 6, 10), M(C.dark, {}), 0.08, 0.04, 0, g, 0, 0, Math.PI);
};
B.flower = (g, v = {}) => {
  P(cyl(0.02, 0.02, 0.5, 6), M(0x3f9a46, {}), 0, 0.25, 0, g);
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; P(sph(0.08, 10, 8), M(v.c ?? 0xff6fa8, { r: 0.6, main: 1 }), Math.cos(a) * 0.1, 0.55, Math.sin(a) * 0.1, g, 0, 0, 0, [1, 0.4, 1]); }
  P(sph(0.06, 10, 8), M(0xffd34d, {}), 0, 0.56, 0, g);
};
B.bush = (g) => { const m = M(0x4f9e4a, { r: 0.85, flat: 1, main: 1 }); P(ico(0.45, 1), m, 0, 0.35, 0, g); P(ico(0.35, 1), m, 0.4, 0.28, 0.1, g); P(ico(0.32, 1), m, -0.38, 0.26, -0.05, g); };
B.cactus = (g) => {
  const m = M(0x4a9a5a, { r: 0.7, main: 1 });
  P(caps(0.2, 1.0), m, 0, 0.7, 0, g); P(caps(0.12, 0.35), m, 0.32, 0.9, 0, g); P(caps(0.12, 0.25), m, -0.3, 0.75, 0, g);
  P(cyl(0.12, 0.12, 0.25, 10), m, 0.22, 0.72, 0, g, 0, 0, Math.PI / 2); P(cyl(0.1, 0.1, 0.25, 10), m, -0.2, 0.62, 0, g, 0, 0, Math.PI / 2);
};
B.table = (g) => { const w = M(C.wood, { r: 0.7, main: 1 }); P(box(1.2, 0.08, 0.8, 0.03), w, 0, 0.75, 0, g); for (const [x, z] of [[-0.5, -0.32], [0.5, -0.32], [-0.5, 0.32], [0.5, 0.32]]) P(box(0.07, 0.72, 0.07, 0.02), w, x, 0.36, z, g); };
B.chair = (g) => { const w = M(C.wood, { r: 0.7, main: 1 }); P(box(0.5, 0.06, 0.5, 0.02), w, 0, 0.48, 0, g); P(box(0.5, 0.55, 0.06, 0.02), w, 0, 0.78, -0.22, g); for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) P(box(0.05, 0.46, 0.05, 0.01), w, x, 0.23, z, g); };
B.bed = (g) => { P(box(1.0, 0.35, 2.0, 0.06), M(C.wood, { r: 0.7, main: 1 }), 0, 0.2, 0, g); P(box(0.95, 0.15, 1.9, 0.06), M(0xf4f2ee, { r: 0.9 }), 0, 0.42, 0, g); P(box(0.6, 0.12, 0.3, 0.06), M(0xffffff, { r: 0.9 }), 0, 0.55, -0.75, g); P(box(0.98, 0.1, 1.2, 0.04), M(0x5a7bd8, { r: 0.9 }), 0, 0.5, 0.35, g); P(box(1.0, 0.7, 0.08, 0.03), M(C.woodD, {}), 0, 0.4, -1.0, g); };
B.medkit = (g) => { P(box(0.6, 0.4, 0.25, 0.06), M(0xffffff, { r: 0.5, main: 1 }), 0, 0.2, 0, g); P(box(0.24, 0.07, 0.02, 0.01), M(C.red, {}), 0, 0.2, 0.13, g); P(box(0.07, 0.24, 0.02, 0.01), M(C.red, {}), 0, 0.2, 0.13, g); };
B.potion = (g, v = {}) => {
  P(sph(0.2, 18, 14), glass(v.c ?? 0xff5aa0, { main: 1, e: v.c ?? 0xff5aa0, ei: 0.7 }), 0, 0.21, 0, g);
  P(cyl(0.06, 0.07, 0.16, 12), glass(v.c ?? 0xff5aa0), 0, 0.45, 0, g); P(cyl(0.065, 0.065, 0.07, 12), M(0x8a5a34, {}), 0, 0.55, 0, g);
  g.userData.glow = v.c ?? 0xff5aa0;
};
B.gate = (g) => { // level prop, not writable
  const m = M(0x3a3f48, { r: 0.4, m: 0.9 });
  for (let i = 0; i < 7; i++) P(cyl(0.06, 0.06, 2.6, 8), m, 0, 1.3, -1.8 + i * 0.6, g);
  for (const y of [0.4, 2.2]) P(box(0.14, 0.14, 4.0, 0.03), m, 0, y, 0, g);
};
