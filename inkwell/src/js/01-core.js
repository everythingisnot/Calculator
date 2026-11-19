import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ======================================================================
// Core: utilities, renderer, scene, sky, post-processing, particles, audio
// ======================================================================
const $ = (s) => document.querySelector(s);
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const hyp = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const pick = (arr, r = Math.random) => arr[Math.floor(r() * arr.length)];
const smooth = (t) => t * t * (3 - 2 * t);
function rng(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------------------------------------------------------- renderer
const QUALITY = {
  high: { pr: 2, shadow: 2048, bloom: true, samples: 4 },
  medium: { pr: 1.35, shadow: 1024, bloom: true, samples: 2 },
  low: { pr: 1, shadow: 512, bloom: false, samples: 0 },
};
let quality = store.get('inkwell.quality', (Math.min(screen.width, screen.height) < 600) ? 'medium' : 'high');
if (!QUALITY[quality]) quality = 'high';

const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xbfd8ff, 70, 260);
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1200);
camera.position.set(0, 16, 30);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 9;
controls.maxDistance = 48;
controls.minPolarAngle = 0.25;
controls.maxPolarAngle = 1.36;
controls.rotateSpeed = 0.6;
controls.zoomSpeed = 0.8;
controls.target.set(0, 1, 0);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

// ---------------------------------------------------------------- lights
const hemi = new THREE.HemisphereLight(0xd6e8ff, 0x5a4a3a, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d6, 2.8);
sun.position.set(14, 24, 12);
sun.castShadow = true;
{
  const sc = sun.shadow.camera;
  sc.left = -19; sc.right = 19; sc.top = 15; sc.bottom = -15; sc.near = 1; sc.far = 90;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.035;
}
scene.add(sun, sun.target);
const rim = new THREE.DirectionalLight(0x9fc4ff, 0.55);
rim.position.set(-16, 10, -14);
scene.add(rim);

// ---------------------------------------------------------------- sky
const skyU = {
  top: { value: new THREE.Color(0x3d6fd8) }, mid: { value: new THREE.Color(0xbfd8ff) }, bot: { value: new THREE.Color(0x8aa3d8) },
  sunDir: { value: V3(0.5, 0.35, -0.6).normalize() }, sunCol: { value: new THREE.Color(0xfff0c8) },
  time: { value: 0 }, stars: { value: 0 },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(600, 48, 24),
  new THREE.ShaderMaterial({
    uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform vec3 top, mid, bot, sunCol, sunDir; uniform float time, stars; varying vec3 vP;
      float hash(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
      void main(){
        vec3 d = normalize(vP); float h = d.y;
        vec3 c = h > 0.0 ? mix(mid, top, pow(clamp(h, 0.0, 1.0), 0.55)) : mix(mid, bot, pow(clamp(-h * 2.2, 0.0, 1.0), 0.6));
        float s = max(dot(d, normalize(sunDir)), 0.0);
        c += sunCol * (pow(s, 1400.0) * 9.0 + pow(s, 40.0) * 0.4 + pow(s, 5.0) * 0.16);
        if (stars > 0.0) {
          vec3 q = floor(d * 240.0); float st = step(0.9968, hash(q));
          float tw = 0.55 + 0.45 * sin(time * 2.0 + hash(q + 3.0) * 40.0);
          c += vec3(st * tw * stars * clamp(h * 3.0, 0.0, 1.0)) * vec3(0.9, 0.95, 1.2);
        }
        gl_FragColor = vec4(c, 1.0);
      }`,
  })
);
sky.renderOrder = -10;
scene.add(sky);

// cloud sea far below the isles
const seaU = { time: { value: 0 }, lit: { value: new THREE.Color(0xffffff) }, shade: { value: new THREE.Color(0x9fb4e0) }, fogCol: { value: new THREE.Color(0xbfd8ff) } };
const cloudSea = new THREE.Mesh(
  new THREE.PlaneGeometry(1600, 1600, 1, 1),
  new THREE.ShaderMaterial({
    uniforms: seaU, fog: false, depthWrite: true,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform float time; uniform vec3 lit, shade, fogCol; varying vec3 vW;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * n2(p); p *= 2.03; a *= 0.5; } return v; }
      void main(){
        vec2 p = vW.xz * 0.018;
        float n = fbm(p + vec2(time * 0.012, time * 0.006));
        float m = fbm(p * 2.3 - vec2(time * 0.02, 0.0));
        float v = smoothstep(0.3, 0.85, n * 0.75 + m * 0.4);
        vec3 c = mix(shade, lit, v);
        float d = length(vW.xz - cameraPosition.xz);
        c = mix(c, fogCol, smoothstep(60.0, 520.0, d));
        gl_FragColor = vec4(c, 1.0);
      }`,
  })
);
cloudSea.rotation.x = -Math.PI / 2;
cloudSea.position.y = -22;
scene.add(cloudSea);

// ---------------------------------------------------------------- post
let composer, bloomPass;
function buildComposer() {
  const q = QUALITY[quality];
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x || 1, size.y || 1, { type: THREE.HalfFloatType, samples: q.samples });
  if (composer) composer.dispose();
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  // Clamp HDR and drop NaN/Inf before bloom: one overflowing pixel in a half-float buffer would otherwise bloom across the whole screen.
  composer.addPass(new ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
      float ok(float v){ return (v == v && v < 1e4) ? clamp(v, 0.0, 24.0) : 0.0; }
      void main(){ vec4 c = texture2D(tDiffuse, vUv); gl_FragColor = vec4(ok(c.r), ok(c.g), ok(c.b), 1.0); }`,
  }));
  bloomPass = new UnrealBloomPass(new THREE.Vector2(size.x || 1, size.y || 1), 0.32, 0.5, 0.92);
  bloomPass.enabled = q.bloom;
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
}
function applyQuality() {
  const q = QUALITY[quality];
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pr));
  sun.shadow.mapSize.set(q.shadow, q.shadow);
  if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  resize();
  buildComposer();
  resize();
}
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
  const s = h * renderer.getPixelRatio() * 0.5 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  fxAdd && (fxAdd.mat.uniforms.scale.value = s);
  fxNorm && (fxNorm.mat.uniforms.scale.value = s);
}
window.addEventListener('resize', resize);

// ---------------------------------------------------------------- materials & geometry
const matCache = new Map();
function M(color, o = {}) {
  const key = [color, o.r ?? 0.62, o.m ?? 0, o.e ?? '', o.ei ?? 1, o.flat ? 1 : 0, o.o ?? 1, o.main ? 1 : 0, o.vc ? 1 : 0, o.side ?? 0, o.env ?? 0.7].join('|');
  let m = matCache.get(key);
  if (m) return m;
  m = new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.62, metalness: o.m ?? 0, flatShading: !!o.flat, envMapIntensity: o.env ?? 0.7, vertexColors: !!o.vc });
  if (o.e != null) { m.emissive = new THREE.Color(o.e); m.emissiveIntensity = o.ei ?? 1; }
  if (o.o != null && o.o < 1) { m.transparent = true; m.opacity = o.o; m.depthWrite = false; }
  if (o.side) m.side = THREE.DoubleSide;
  if (o.main) m.userData.main = true;
  matCache.set(key, m);
  return m;
}
function glass(color, o = {}) {
  const key = 'glass|' + color + '|' + (o.main ? 1 : 0) + '|' + (o.e ?? '') + '|' + (o.r ?? 0.08);
  let m = matCache.get(key);
  if (m) return m;
  m = new THREE.MeshPhysicalMaterial({
    color, roughness: o.r ?? 0.08, metalness: 0, transmission: 1, thickness: o.th ?? 0.9, ior: o.ior ?? 1.33,
    attenuationColor: new THREE.Color(color), attenuationDistance: 1.6, envMapIntensity: 1.1, clearcoat: 0.6, clearcoatRoughness: 0.15,
  });
  if (o.e != null) { m.emissive = new THREE.Color(o.e); m.emissiveIntensity = o.ei ?? 0.4; }
  if (o.main) m.userData.main = true;
  matCache.set(key, m);
  return m;
}
const geoCache = new Map();
const cachedGeos = new Set();
const G = (key, f) => { let g = geoCache.get(key); if (!g) { g = f(); geoCache.set(key, g); cachedGeos.add(g); } return g; };
const box = (w, h, d, r) => G(`b${w},${h},${d},${r}`, () => (r === 0 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 2, r ?? Math.min(w, h, d) * 0.2)));
const sph = (r, ws = 24, hs = 16) => G(`s${r},${ws},${hs}`, () => new THREE.SphereGeometry(r, ws, hs));
const cyl = (rt, rb, h, s = 20, open = false) => G(`c${rt},${rb},${h},${s},${open}`, () => new THREE.CylinderGeometry(rt, rb, h, s, 1, open));
const cone = (r, h, s = 20) => G(`k${r},${h},${s}`, () => new THREE.ConeGeometry(r, h, s));
const tor = (R, r, arc = TAU, rs = 10, ts = 32) => G(`t${R},${r},${arc},${rs},${ts}`, () => new THREE.TorusGeometry(R, r, rs, ts, arc));
const caps = (r, l, cs = 6, rs = 16) => G(`p${r},${l}`, () => new THREE.CapsuleGeometry(r, l, cs, rs));
const ico = (r, d = 0) => G(`i${r},${d}`, () => new THREE.IcosahedronGeometry(r, d));
const dode = (r) => G(`d${r}`, () => new THREE.DodecahedronGeometry(r, 0));
const octa = (r) => G(`o${r}`, () => new THREE.OctahedronGeometry(r, 0));
function P(geo, mat, x = 0, y = 0, z = 0, parent = null, rx = 0, ry = 0, rz = 0, s = null) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  if (s != null) { if (typeof s === 'number') m.scale.setScalar(s); else m.scale.set(s[0], s[1], s[2]); }
  m.castShadow = true; m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

// ---------------------------------------------------------------- particles
const SPRITE_VS = `
  attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vC; varying float vA; uniform float scale;
  void main(){ vC = color; vA = alpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * scale / max(-mv.z, 0.1); gl_Position = projectionMatrix * mv; }`;
const SPRITE_FS_ADD = `varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vC * a * a * vA, 1.0); }`;
const SPRITE_FS_NORM = `varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.15, d); if (a * vA < 0.01) discard; gl_FragColor = vec4(vC, a * vA); }`;
class Particles {
  constructor(max, additive) {
    this.max = max; this.list = [];
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3); this.size = new Float32Array(max); this.alpha = new Float32Array(max);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.boundingSphere = new THREE.Sphere(V3(), 1e5);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { scale: { value: 400 } }, vertexShader: SPRITE_VS, fragmentShader: additive ? SPRITE_FS_ADD : SPRITE_FS_NORM,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 5 : 4;
    this.geo = g;
    scene.add(this.points);
  }
  emit(o) {
    if (this.list.length >= this.max) this.list.shift();
    const c0 = new THREE.Color(o.c ?? 0xffffff), c1 = new THREE.Color(o.c1 ?? o.c ?? 0xffffff);
    this.list.push({
      x: o.x, y: o.y, z: o.z, vx: o.vx ?? 0, vy: o.vy ?? 0, vz: o.vz ?? 0, t: 0, life: o.life ?? 1,
      s0: o.s ?? 0.3, s1: o.s1 ?? o.s ?? 0.3, c0, c1, a: o.a ?? 1, g: o.g ?? 0, drag: o.drag ?? 0, fadeIn: o.fadeIn ?? 0.08,
    });
  }
  update(dt) {
    const L = this.list; let n = 0;
    for (let i = L.length - 1; i >= 0; i--) { const p = L[i]; p.t += dt; if (p.t >= p.life) L.splice(i, 1); }
    for (const p of L) {
      p.vy += p.g * dt; const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; p.vz *= k;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const u = p.t / p.life, i3 = n * 3;
      this.pos[i3] = p.x; this.pos[i3 + 1] = p.y; this.pos[i3 + 2] = p.z;
      this.col[i3] = lerp(p.c0.r, p.c1.r, u); this.col[i3 + 1] = lerp(p.c0.g, p.c1.g, u); this.col[i3 + 2] = lerp(p.c0.b, p.c1.b, u);
      this.size[n] = lerp(p.s0, p.s1, u);
      this.alpha[n] = p.a * Math.min(1, p.t / p.fadeIn) * (1 - u) ;
      n++;
    }
    this.geo.setDrawRange(0, n);
    for (const k of ['position', 'color', 'size', 'alpha']) this.geo.attributes[k].needsUpdate = true;
  }
  clear() { this.list.length = 0; }
}
const fxAdd = new Particles(2600, true);
const fxNorm = new Particles(1400, false);
const FX = {
  fire(x, y, z, k = 1) {
    fxAdd.emit({ x: x + rand(-0.15, 0.15) * k, y, z: z + rand(-0.15, 0.15) * k, vx: rand(-0.2, 0.2), vy: rand(1.2, 2.2) * k, vz: rand(-0.2, 0.2), life: rand(0.45, 0.8), s: 0.55 * k, s1: 0.1, c: 0xffd27a, c1: 0xff3a10, a: 0.9, drag: 1.2 });
  },
  smoke(x, y, z, k = 1, col = 0x3a3a44) {
    fxNorm.emit({ x: x + rand(-0.2, 0.2), y, z: z + rand(-0.2, 0.2), vx: rand(-0.2, 0.2), vy: rand(0.6, 1.1), vz: rand(-0.2, 0.2), life: rand(1.6, 2.6), s: 0.5 * k, s1: 1.8 * k, c: col, c1: 0x8a8a96, a: 0.42, drag: 0.4, fadeIn: 0.4 });
  },
  steam(x, y, z, n = 14) {
    for (let i = 0; i < n; i++) fxNorm.emit({ x: x + rand(-0.6, 0.6), y: y + rand(0, 0.6), z: z + rand(-0.6, 0.6), vx: rand(-0.4, 0.4), vy: rand(1, 2), vz: rand(-0.4, 0.4), life: rand(1, 1.8), s: 0.5, s1: 2.2, c: 0xffffff, c1: 0xdde6f0, a: 0.5, drag: 0.8, fadeIn: 0.2 });
  },
  burst(x, y, z, c = 0xffd27a, n = 24, sp = 3, s = 0.25) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), b = rand(-0.2, 1), v = rand(0.4, 1) * sp;
      fxAdd.emit({ x, y, z, vx: Math.cos(a) * v * (1 - Math.abs(b) * 0.5), vy: b * v + 1, vz: Math.sin(a) * v * (1 - Math.abs(b) * 0.5), life: rand(0.6, 1.2), s, s1: 0.02, c, c1: c, a: 1, g: -4, drag: 1.5 });
    }
  },
  ink(x, y, z) {
    for (let i = 0; i < 26; i++) {
      const a = rand(0, TAU), v = rand(1.5, 3.5);
      fxNorm.emit({ x, y: y + 0.1, z, vx: Math.cos(a) * v, vy: rand(1, 4), vz: Math.sin(a) * v, life: rand(0.5, 0.9), s: rand(0.15, 0.32), s1: 0.02, c: 0x3346c8, c1: 0x1a2270, a: 0.95, g: -12, drag: 1 });
    }
    for (let i = 0; i < 18; i++) {
      const a = rand(0, TAU), v = rand(0.6, 2);
      fxAdd.emit({ x, y: y + rand(0.2, 1.5), z, vx: Math.cos(a) * v, vy: rand(0.3, 1.6), vz: Math.sin(a) * v, life: rand(0.6, 1.2), s: 0.22, s1: 0.02, c: 0xfff0b0, c1: 0x7a8cff, a: 1, drag: 1.4 });
    }
  },
  sparkle(x, y, z, c = 0xfff0b0, spread = 0.6) {
    fxAdd.emit({ x: x + rand(-spread, spread), y: y + rand(-spread, spread), z: z + rand(-spread, spread), vx: 0, vy: rand(0.1, 0.5), vz: 0, life: rand(0.6, 1.3), s: rand(0.08, 0.2), s1: 0.01, c, a: 1, fadeIn: 0.3 });
  },
  dust(x, y, z, n = 10, c = 0xc9b79a) {
    for (let i = 0; i < n; i++) { const a = rand(0, TAU); fxNorm.emit({ x, y: y + 0.1, z, vx: Math.cos(a) * rand(0.5, 1.6), vy: rand(0.2, 0.8), vz: Math.sin(a) * rand(0.5, 1.6), life: rand(0.6, 1.1), s: 0.3, s1: 0.9, c, a: 0.45, drag: 2 }); }
  },
  splash(x, y, z, n = 22) {
    for (let i = 0; i < n; i++) { const a = rand(0, TAU), v = rand(0.5, 2.2); fxNorm.emit({ x, y, z, vx: Math.cos(a) * v, vy: rand(2, 5), vz: Math.sin(a) * v, life: rand(0.5, 1), s: rand(0.1, 0.22), s1: 0.04, c: 0xbfe8ff, c1: 0x6fb6ff, a: 0.9, g: -14 }); }
  },
  explode(x, y, z) {
    for (let i = 0; i < 60; i++) { const a = rand(0, TAU), b = rand(-0.1, 1), v = rand(2, 7); fxAdd.emit({ x, y: y + 0.5, z, vx: Math.cos(a) * v, vy: b * v, vz: Math.sin(a) * v, life: rand(0.4, 0.9), s: rand(0.5, 1.1), s1: 0.1, c: 0xfff1a8, c1: 0xff3a10, a: 1, drag: 2.5 }); }
    for (let i = 0; i < 26; i++) FX.smoke(x + rand(-1, 1), y + rand(0, 1.5), z + rand(-1, 1), 1.6, 0x2b2b30);
  },
};

// pooled point lights (fixed count keeps shader programs stable)
const lightPool = [];
for (let i = 0; i < 6; i++) { const l = new THREE.PointLight(0xffaa55, 0, 9, 1.6); l.castShadow = false; scene.add(l); lightPool.push(l); }
const lightReq = [];
function requestLight(x, y, z, color, intensity, distance, prio = 0) { lightReq.push({ x, y, z, color, intensity, distance, prio }); }
function flushLights() {
  const t = controls.target;
  for (const r of lightReq) r.d = (r.x - t.x) ** 2 + (r.z - t.z) ** 2 - r.prio * 1000;
  lightReq.sort((a, b) => a.d - b.d);
  for (let i = 0; i < lightPool.length; i++) {
    const l = lightPool[i], r = lightReq[i];
    if (r) { l.position.set(r.x, r.y, r.z); l.color.set(r.color); l.intensity = r.intensity; l.distance = r.distance; }
    else l.intensity = 0;
  }
  lightReq.length = 0;
}

// ---------------------------------------------------------------- audio (synthesised, no files)
const Sfx = {
  ctx: null, master: null, musicGain: null, on: store.get('inkwell.sound', true), music: store.get('inkwell.music', true), musicTimer: 0, beat: 0,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = this.on ? 0.6 : 0; this.master.connect(this.ctx.destination);
    this.delay = this.ctx.createDelay(); this.delay.delayTime.value = 0.32;
    const fb = this.ctx.createGain(); fb.gain.value = 0.35; this.delay.connect(fb); fb.connect(this.delay);
    const wet = this.ctx.createGain(); wet.gain.value = 0.35; this.delay.connect(wet); wet.connect(this.master);
    this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = this.music ? 0.22 : 0; this.musicGain.connect(this.master); this.musicGain.connect(this.delay);
  },
  setOn(v) { this.on = v; store.set('inkwell.sound', v); if (this.master) this.master.gain.value = v ? 0.6 : 0; },
  setMusic(v) { this.music = v; store.set('inkwell.music', v); if (this.musicGain) this.musicGain.gain.value = v ? 0.22 : 0; },
  tone(f, dur = 0.2, type = 'sine', vol = 0.3, slide = 0, when = 0, dest = null) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime + when, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.master); if (!dest) g.connect(this.delay);
    o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur = 0.3, vol = 0.3, freq = 1200, q = 0.8, when = 0) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime + when, n = Math.floor(this.ctx.sampleRate * dur), buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
  },
  write() { [660, 880, 1320].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.16, 0, i * 0.05)); this.noise(0.25, 0.12, 2400, 1.5); },
  error() { this.tone(220, 0.25, 'square', 0.08, -80); this.tone(180, 0.3, 'square', 0.06, -60, 0.08); },
  good() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.15, 0, i * 0.07)); },
  win() { [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => this.tone(f, 0.6, 'sine', 0.18, 0, i * 0.09)); [392, 523].forEach((f, i) => this.tone(f, 1.4, 'triangle', 0.1, 0, 0.4 + i * 0.1)); },
  hurt() { this.tone(300, 0.3, 'sawtooth', 0.1, -180); this.noise(0.2, 0.2, 500); },
  boom() { this.noise(1.1, 0.7, 180, 0.5); this.tone(90, 0.8, 'sine', 0.4, -50); },
  splash() { this.noise(0.5, 0.25, 900, 0.6); },
  hiss() { this.noise(0.9, 0.18, 3200, 0.6); },
  pop() { this.tone(500, 0.12, 'sine', 0.15, 400); },
  step() { this.noise(0.05, 0.03, 700, 2); },
  roar() { this.tone(110, 0.7, 'sawtooth', 0.12, -40); this.noise(0.6, 0.15, 300, 0.7); },
  chomp() { this.noise(0.08, 0.2, 900, 2); this.noise(0.08, 0.2, 700, 2, 0.12); },
  tickMusic(dt) {
    if (!this.ctx || !this.music || !this.on) return;
    this.musicTimer -= dt;
    if (this.musicTimer > 0) return;
    this.musicTimer = 0.62;
    const scale = [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3];
    const prog = [[0, 2, 4], [5, 2, 4], [3, 5, 7], [1, 3, 5]];
    const chord = prog[Math.floor(this.beat / 8) % prog.length];
    if (this.beat % 8 === 0) chord.forEach((n) => this.tone(scale[n] / 2, 4.6, 'sine', 0.05, 0, 0, this.musicGain));
    if (Math.random() < 0.62) this.tone(scale[pick(chord)] * (Math.random() < 0.3 ? 2 : 1), 1.3, 'triangle', 0.035, 0, 0, this.musicGain);
    this.beat++;
  },
};
