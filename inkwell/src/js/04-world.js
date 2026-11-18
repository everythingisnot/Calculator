// ======================================================================
// World: biomes, floating islands, decor, water, lava, clouds, labels, the Lumen.
// ======================================================================
const BIOMES = {
  meadow: { top: 0x2a5fd6, mid: 0xa8cbf8, bot: 0x86a8e2, skySun: [0.35, 0.16, -1], sun: 0xfff0d6, sunI: 3.1, hemiS: 0xcfe2ff, hemiG: 0x5a4a30, hemiI: 0.7, fog: 0xb4d2f8,
    grass: 0x78c050, grass2: 0x4f9a3c, rock: 0xc09a74, rock2: 0x82664f, trees: 'round', leaf: [0x4a9a3a, 0x5fb444, 0x3a8434], flowers: [0xff8fb1, 0xffffff, 0xffd34d, 0xb89aff], cloud: 0xffffff, seaLit: 0xf4f8ff, seaShade: 0x8eaee6 },
  golden: { top: 0x4060c8, mid: 0xffd9b0, bot: 0xd8a0a0, skySun: [0.6, 0.08, -1], sun: 0xffd2a0, sunI: 2.7, hemiS: 0xffe0c0, hemiG: 0x6a4a3a, hemiI: 0.85, fog: 0xffd9b8,
    grass: 0xa2c85a, grass2: 0x7aa844, rock: 0xd0a07a, rock2: 0x8a6250, trees: 'round', leaf: [0x7ab04a, 0x9ac050, 0x5a9a40], flowers: [0xffffff, 0xffd34d, 0xff8a5a], cloud: 0xfff0e0, seaLit: 0xfff2e0, seaShade: 0xd8b0b8 },
  autumn: { top: 0x4a78d0, mid: 0xf2e2cc, bot: 0xc8a8a0, skySun: [-0.4, 0.14, -1], sun: 0xffe2b8, sunI: 2.8, hemiS: 0xffe8d0, hemiG: 0x6a4a30, hemiI: 0.9, fog: 0xf2e2cc,
    grass: 0xa8b04e, grass2: 0x8a9440, rock: 0xb8957a, rock2: 0x7a6050, trees: 'round', leaf: [0xe0782a, 0xd8502a, 0xf0b040, 0xb8402a], flowers: [0xffd34d, 0xff8a3a], cloud: 0xfff6ea, seaLit: 0xfff6ea, seaShade: 0xc8b0a8 },
  night: { top: 0x070b24, mid: 0x26346e, bot: 0x111638, skySun: [0.5, 0.25, -1], sun: 0x9fb4ff, sunI: 0.55, hemiS: 0x4a5a9a, hemiG: 0x1a1a2a, hemiI: 0.4, fog: 0x1c2858, stars: 1, exposure: 1.15,
    grass: 0x3d6a62, grass2: 0x2c5650, rock: 0x6a6a8a, rock2: 0x3c3c58, trees: 'pine', leaf: [0x23504a, 0x2a5a52], flowers: [0x7af0ff, 0xc89aff, 0x9affc8], glowFlowers: true, cloud: 0x3a4a80, seaLit: 0x34447a, seaShade: 0x161c40 },
  frost: { top: 0x5a8ad8, mid: 0xeaf4ff, bot: 0xb8cce8, skySun: [0.3, 0.12, -1], sun: 0xffffff, sunI: 2.6, hemiS: 0xeaf4ff, hemiG: 0x8090a8, hemiI: 1.0, fog: 0xeaf4ff,
    grass: 0xf4f8ff, grass2: 0xdce8f6, rock: 0x9aa8bc, rock2: 0x6a7a90, trees: 'snowpine', leaf: [0x2a5a4a, 0x346a5a], flowers: [], cloud: 0xffffff, seaLit: 0xffffff, seaShade: 0xbccbe6, snow: true },
  lagoon: { top: 0x2a7ae0, mid: 0xc8f0ff, bot: 0x8ad0e8, skySun: [-0.5, 0.18, -1], sun: 0xfff6e0, sunI: 3.0, hemiS: 0xd8f6ff, hemiG: 0x6a6a40, hemiI: 1.0, fog: 0xc8f0ff,
    grass: 0x8ad06a, grass2: 0x62b050, rock: 0xe0c89a, rock2: 0xa8906a, trees: 'palm', leaf: [0x4aa84a, 0x5ac05a], flowers: [0xff5aa0, 0xffd34d], cloud: 0xffffff, seaLit: 0xffffff, seaShade: 0x9ad8ec },
  highland: { top: 0x3a6ac8, mid: 0xdce6f2, bot: 0x98a8c8, skySun: [0.2, 0.2, -1], sun: 0xfff4e0, sunI: 2.8, hemiS: 0xe0eaff, hemiG: 0x5a5a50, hemiI: 0.95, fog: 0xdce6f2,
    grass: 0x6aa85a, grass2: 0x4a8a4a, rock: 0x9a9a9a, rock2: 0x6a6a70, trees: 'pine', leaf: [0x2f6a44, 0x3a7a4a], flowers: [0xb89aff, 0xffffff], cloud: 0xffffff, seaLit: 0xffffff, seaShade: 0xa8b4d0 },
  ember: { top: 0x2a1238, mid: 0xff9a6a, bot: 0x5a2238, skySun: [0.1, 0.06, -1], sun: 0xffb080, sunI: 2.4, hemiS: 0xffb090, hemiG: 0x3a1a1a, hemiI: 0.75, fog: 0xd8806a, exposure: 1.05,
    grass: 0x6a5a50, grass2: 0x4a3e3a, rock: 0x5a4444, rock2: 0x2e2226, trees: 'dead', leaf: [0x3a2a24], flowers: [0xff7a2a], cloud: 0xffc8a8, seaLit: 0xffb898, seaShade: 0x8a4a5a },
};

// --------------------------------------------------------------- value noise
function hash3(x, y, z) { let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = smooth(x - xi), yf = smooth(y - yi), zf = smooth(z - zi);
  const c = (a, b, d) => hash3(xi + a, yi + b, zi + d);
  const x00 = lerp(c(0, 0, 0), c(1, 0, 0), xf), x10 = lerp(c(0, 1, 0), c(1, 1, 0), xf), x01 = lerp(c(0, 0, 1), c(1, 0, 1), xf), x11 = lerp(c(0, 1, 1), c(1, 1, 1), xf);
  return lerp(lerp(x00, x10, yf), lerp(x01, x11, yf), zf) * 2 - 1;
}

// --------------------------------------------------------------- labels
const Labels = {
  root: $('#labels'), list: [],
  add(html, getPos, cls = '') { const el = document.createElement('div'); el.className = 'wlabel ' + cls; el.innerHTML = html; this.root.appendChild(el); const l = { el, getPos, hidden: false }; this.list.push(l); return l; },
  remove(l) { if (!l) return; l.el.remove(); this.list = this.list.filter((x) => x !== l); },
  clear() { this.list.forEach((l) => l.el.remove()); this.list = []; },
  update() {
    const w = window.innerWidth, h = window.innerHeight, v = new THREE.Vector3();
    for (const l of this.list) {
      const p = l.getPos(); if (!p || l.hidden) { l.el.style.opacity = 0; continue; }
      v.copy(p).project(camera);
      if (v.z > 1 || v.z < -1) { l.el.style.opacity = 0; continue; }
      l.el.style.opacity = '';
      l.el.style.transform = `translate(${((v.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v.y) / 2 * h).toFixed(1)}px) translate(-50%, -100%)`;
    }
  },
};

// --------------------------------------------------------------- clouds (persistent)
const cloudGeo = new THREE.SphereGeometry(1, 20, 14);
const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, envMapIntensity: 0.4, emissive: 0x30384a, emissiveIntensity: 1 });
const CLOUD_N = 22, PUFFS = 7;
const clouds = new THREE.InstancedMesh(cloudGeo, cloudMat, CLOUD_N * PUFFS);
clouds.castShadow = false; clouds.receiveShadow = false;
scene.add(clouds);
const cloudData = [];
{
  const r = rng(77);
  for (let i = 0; i < CLOUD_N; i++) {
    let a, rad, y;
    const below = i % 3 === 0;
    a = below ? r() * TAU : Math.PI + 0.15 + r() * (Math.PI - 0.3); rad = below ? 30 + r() * 70 : 55 + r() * 90; y = below ? -17 + r() * 4 : -12 + r() * 16;
    const puffs = [];
    const s = 2.2 + r() * 3.4;
    for (let j = 0; j < PUFFS; j++) puffs.push([(j - PUFFS / 2) * s * 0.5 + (r() - 0.5) * s, (r() - 0.3) * s * 0.5, (r() - 0.5) * s * 0.8, s * (0.55 + r() * 0.5) * (1 - Math.abs(j - PUFFS / 2) / PUFFS)]);
    cloudData.push({ x: Math.cos(a) * rad, y, z: Math.sin(a) * rad, sp: 0.3 + r() * 0.5, puffs });
  }
}
function updateClouds(t) {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  let k = 0;
  for (const c of cloudData) {
    const dx = ((c.x + t * c.sp + 180) % 360 + 360) % 360 - 180;
    for (const [px, py, pz, ps] of c.puffs) { p.set(dx + px, c.y + py, c.z + pz); s.set(ps, ps * 0.72, ps); m.compose(p, q, s); clouds.setMatrixAt(k++, m); }
  }
  clouds.instanceMatrix.needsUpdate = true;
}

// --------------------------------------------------------------- world
class World {
  constructor(level) {
    this.level = level;
    this.pal = BIOMES[level.biome] || BIOMES.meadow;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.islands = level.islands.map((i, n) => ({ ...i, id: i.id ?? 'i' + n }));
    this.walkMeshes = [];
    this.extraSurfaces = [];
    this.lakes = [];
    this.lavas = [];
    this.anims = [];
    this.rnd = rng(level.seed ?? 11);
    this.applyPalette();
    this.baseY = Math.min(...this.islands.map((i) => i.h));
    for (const isl of this.islands) this.buildIsland(isl);
    this.buildDistant();
  }
  applyPalette() {
    const p = this.pal;
    skyU.top.value.set(p.top); skyU.mid.value.set(p.mid); skyU.bot.value.set(p.bot); skyU.sunCol.value.set(p.sun);
    skyU.sunDir.value.set(...p.skySun).normalize(); skyU.stars.value = p.stars ?? 0;
    scene.fog.color.set(p.fog);
    seaU.lit.value.set(p.seaLit); seaU.shade.value.set(p.seaShade); seaU.fogCol.value.set(p.fog);
    sun.color.set(p.sun); sun.intensity = p.sunI;
    hemi.color.set(p.hemiS); hemi.groundColor.set(p.hemiG); hemi.intensity = p.hemiI;
    rim.intensity = p.stars ? 0.35 : 0.55; rim.color.set(p.stars ? 0x6a7aff : 0x9fc4ff);
    renderer.toneMappingExposure = p.exposure ?? 1.0;
    cloudMat.color.set(p.cloud);
    cloudMat.emissive.set(p.stars ? 0x0a0e20 : 0x1e2433);
  }
  dispose() {
    scene.remove(this.group);
    this.group.traverse((o) => { if (o.isMesh || o.isInstancedMesh) { if (o.geometry && !cachedGeos.has(o.geometry)) o.geometry.dispose(); } });
  }
  // ---------------- surfaces
  surfaceAt(x, z) {
    let best = null;
    for (const i of this.islands) if (x >= i.x0 - 0.12 && x <= i.x1 + 0.12 && z >= i.z0 - 0.12 && z <= i.z1 + 0.12) { if (!best || i.h > best.h) best = i; }
    for (const s of this.extraSurfaces) if (x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1) { if (!best || s.h > best.h) best = s; }
    return best;
  }
  lakeAt(x, z) { return this.lakes.find((l) => hyp(x, z, l.x, l.z) < l.r) || null; }
  lavaAt(x, z) { return this.lavas.find((l) => x >= l.x0 && x <= l.x1 && z >= l.z0 && z <= l.z1) || null; }
  // ---------------- islands
  buildIsland(isl) {
    const p = this.pal, r = this.rnd;
    const w = isl.x1 - isl.x0, d = isl.z1 - isl.z0, cx = (isl.x0 + isl.x1) / 2, cz = (isl.z0 + isl.z1) / 2;
    const capGeo = new RoundedBoxGeometry(w + 0.3, 0.5, d + 0.3, 4, 0.24);
    const cpos = capGeo.attributes.position, ccol = new Float32Array(cpos.count * 3), g1 = new THREE.Color(p.grass), g2 = new THREE.Color(p.grass2), tmp = new THREE.Color();
    const dirt = new THREE.Color(p.rock).lerp(new THREE.Color(0x3a2a20), 0.35);
    for (let i = 0; i < cpos.count; i++) {
      const x = cpos.getX(i) + cx, y = cpos.getY(i), z = cpos.getZ(i) + cz;
      const n = noise3(x * 0.35, 0, z * 0.35) * 0.5 + noise3(x * 1.3, 3, z * 1.3) * 0.3;
      tmp.copy(g1).lerp(g2, clamp(n + 0.5, 0, 1));
      if (y < 0.05) tmp.lerp(dirt, clamp((0.05 - y) * 4, 0, 1));
      ccol[i * 3] = tmp.r; ccol[i * 3 + 1] = tmp.g; ccol[i * 3 + 2] = tmp.b;
    }
    capGeo.setAttribute('color', new THREE.BufferAttribute(ccol, 3));
    const cap = new THREE.Mesh(capGeo, M(0xffffff, { r: 0.95, vc: 1, env: 0.3 }));
    cap.position.set(cx, isl.h - 0.25, cz);
    cap.receiveShadow = true; cap.castShadow = true;
    cap.userData.walk = isl;
    this.group.add(cap); this.walkMeshes.push(cap);

    const straight = isl.h - this.baseY + 0.4;
    const depth = straight + 4.5 + r() * 2.5;
    const sx = Math.max(4, Math.round(w * 1.1)), sz = Math.max(3, Math.round(d * 1.1)), sy = Math.max(6, Math.round(depth * 1.3));
    const geo = new THREE.BoxGeometry(w, depth, d, sx, sy, sz);
    geo.translate(0, -depth / 2, 0);
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), r1 = new THREE.Color(p.rock), r2 = new THREE.Color(p.rock2);
    const seed = r() * 100;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const n = noise3((x + cx) * 0.6 + seed, y * 0.6, (z + cz) * 0.6);
      let shrink = 1;
      if (-y > straight) { const t = clamp((-y - straight) / (depth - straight), 0, 1); shrink = 1 - Math.pow(t, 0.8) * 0.9; }
      const edge = y > -0.05 ? 0 : 1;
      x = x * shrink + n * 0.28 * edge; z = z * shrink + noise3((x + cx) * 0.6, y * 0.6 + 9, (z + cz) * 0.6 + seed) * 0.28 * edge;
      if (y < -0.05) y += n * 0.18;
      pos.setXYZ(i, x, y, z);
      const band = Math.sin((y + isl.h) * 2.4 + n * 2.5) * 0.5 + 0.5;
      tmp.copy(r1).lerp(r2, band * 0.7 + clamp(-y / depth, 0, 1) * 0.35);
      col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const body = new THREE.Mesh(geo, M(0xffffff, { r: 0.92, flat: 1, vc: 1, env: 0.3 }));
    body.position.set(cx, isl.h - 0.4, cz);
    body.castShadow = true; body.receiveShadow = true;
    this.group.add(body);
    // hanging rocks under the island
    for (let i = 0; i < 3; i++) P(cone(0.4 + r() * 0.5, 1.5 + r() * 2, 6), M(p.rock2, { r: 0.9, flat: 1 }), cx + (r() - 0.5) * w * 0.5, isl.h - depth - 0.2 - r(), cz + (r() - 0.5) * d * 0.4, this.group, Math.PI, r() * 3, 0);
  }
  // ---------------- decor
  decorate(exclude) {
    const p = this.pal, r = this.rnd;
    const nd = this.noDecor || [];
    const free = (x, z, rad) => !exclude.some((e) => hyp(x, z, e[0], e[1]) < (e[2] ?? 1.6) + rad) && (rad < 0 || !nd.some(([a, b, c, d]) => x > a - 0.6 && x < b + 0.6 && z > c - 0.6 && z < d + 0.6));
    const grassPts = [], flowerPts = [];
    for (const isl of this.islands) {
      if (isl.bare) continue;
      const w = isl.x1 - isl.x0, d = isl.z1 - isl.z0, area = w * d;
      const nTrees = Math.round(area * (isl.trees ?? 0.05));
      for (let i = 0; i < nTrees * 4 && i < 80; i++) {
        const side = r() < 0.75 ? -1 : 1;
        const x = isl.x0 + 0.6 + r() * (w - 1.2), z = side < 0 ? isl.z0 + 0.4 + r() * Math.min(1.6, d * 0.3) : isl.z1 - 0.4 - r() * Math.min(1.6, d * 0.3);
        if (!free(x, z, 0.9) || this.lakeAt(x, z)) continue;
        if (this.decorCount(isl) >= nTrees) break;
        this.tree(x, isl.h, z, r);
        exclude.push([x, z, 0.9]);
        isl._decor = (isl._decor || 0) + 1;
      }
      for (let i = 0; i < Math.round(area * 0.06); i++) {
        const x = isl.x0 + r() * w, z = isl.z0 + r() * d;
        if (!free(x, z, 0.4) || this.lakeAt(x, z)) continue;
        const s = 0.12 + r() * 0.3;
        P(dode(s), M(p.rock2, { r: 0.9, flat: 1 }), x, isl.h + s * 0.4, z, this.group, r() * 3, r() * 3, 0, [1, 0.7, 1]);
      }
      for (let i = 0; i < area * 2.6; i++) { const x = isl.x0 + r() * w, z = isl.z0 + r() * d; if (free(x, z, -0.9) && !this.lakeAt(x, z)) grassPts.push([x, isl.h, z]); }
      if (p.flowers.length) for (let i = 0; i < area * 0.5; i++) { const x = isl.x0 + r() * w, z = isl.z0 + r() * d; if (free(x, z, -0.6) && !this.lakeAt(x, z)) flowerPts.push([x, isl.h, z]); }
    }
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    if (grassPts.length) {
      const gm = new THREE.InstancedMesh(cone(0.06, 0.32, 4), M(p.snow ? 0xdfe8f4 : p.grass2, { r: 0.9, flat: 1 }), grassPts.length);
      grassPts.forEach(([x, y, z], i) => { e.set((r() - 0.5) * 0.5, r() * 3, (r() - 0.5) * 0.5); q.setFromEuler(e); const s = 0.6 + r() * 0.9; mtx.compose(V3(x, y + 0.12 * s, z), q, V3(s, s, s)); gm.setMatrixAt(i, mtx); });
      gm.receiveShadow = true; this.group.add(gm);
    }
    if (flowerPts.length) {
      const fm = new THREE.InstancedMesh(sph(0.07, 8, 6), p.glowFlowers ? M(0xffffff, { e: 0xffffff, ei: 1.6 }) : M(0xffffff, { r: 0.6 }), flowerPts.length);
      const c = new THREE.Color();
      flowerPts.forEach(([x, y, z], i) => { mtx.compose(V3(x, y + 0.14, z), q.identity(), V3(1, 0.7, 1)); fm.setMatrixAt(i, mtx); c.set(pick(p.flowers, r)); fm.setColorAt(i, c); });
      fm.castShadow = false; this.group.add(fm);
      if (p.glowFlowers) this.glowPts = flowerPts;
    }
  }
  decorCount(isl) { return isl._decor || 0; }
  tree(x, y, z, r) {
    const p = this.pal, g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = r() * TAU;
    const s = 0.8 + r() * 0.6; g.scale.setScalar(s);
    const trunk = M(p.trees === 'dead' ? 0x2e2220 : 0x7a5233, { r: 0.9 });
    const leaf = M(pick(p.leaf, r), { r: 0.8, flat: 1 });
    if (p.trees === 'round') { P(cyl(0.14, 0.22, 1.5, 8), trunk, 0, 0.75, 0, g); P(ico(0.9, 1), leaf, 0, 2.0, 0, g); P(ico(0.62, 1), leaf, 0.5, 1.7, 0.2, g); P(ico(0.55, 1), leaf, -0.45, 1.8, -0.2, g); }
    else if (p.trees === 'pine' || p.trees === 'snowpine') {
      P(cyl(0.12, 0.18, 0.9, 8), trunk, 0, 0.45, 0, g);
      for (let i = 0; i < 3; i++) { P(cone(0.9 - i * 0.22, 1.1, 8), leaf, 0, 1.1 + i * 0.6, 0, g); if (p.snow) P(cone(0.5 - i * 0.12, 0.45, 8), M(0xffffff, { r: 0.9, flat: 1 }), 0, 1.5 + i * 0.6, 0, g); }
    } else if (p.trees === 'palm') {
      for (let i = 0; i < 5; i++) P(cyl(0.12, 0.14, 0.5, 8), M(0x9a7a52, { r: 0.9 }), i * 0.06, 0.25 + i * 0.48, 0, g, 0, 0, -0.08);
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; P(sph(0.5, 10, 6), leaf, 0.3 + Math.cos(a) * 0.55, 2.4, Math.sin(a) * 0.55, g, 0, -a, 0.5, [1.5, 0.12, 0.45]); }
      P(sph(0.12, 8, 6), M(0x6a4a2a, {}), 0.3, 2.3, 0.1, g);
    } else if (p.trees === 'dead') {
      P(cyl(0.08, 0.16, 1.8, 6), trunk, 0, 0.9, 0, g);
      for (let i = 0; i < 4; i++) P(cyl(0.03, 0.06, 0.8, 5), trunk, Math.cos(i * 1.7) * 0.25, 1.3 + i * 0.15, Math.sin(i * 1.7) * 0.25, g, Math.sin(i * 1.7) * 0.8, 0, Math.cos(i * 1.7) * 0.8);
    }
    this.group.add(g);
  }
  buildDistant() {
    const r = rng(this.level.seed ?? 5), p = this.pal;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI + Math.PI + (r() - 0.5) * 0.4, rad = 60 + r() * 50;
      const g = new THREE.Group(); g.position.set(Math.cos(a) * rad, -6 + r() * 16, Math.sin(a) * rad * 0.8 - 10);
      const s = 1.5 + r() * 2.5;
      P(cyl(s, s * 1.05, 0.6, 9), M(p.grass, { r: 0.95, flat: 1 }), 0, 0, 0, g);
      P(cone(s, s * 2.4, 9), M(p.rock, { r: 0.95, flat: 1 }), 0, -s * 1.2 - 0.3, 0, g, Math.PI);
      if (r() < 0.7) { const tg = new THREE.Group(); tg.position.y = 0.3; g.add(tg); P(cyl(0.15, 0.2, 1, 6), M(0x7a5233, {}), 0, 0.5, 0, tg); P(ico(0.8, 0), M(pick(p.leaf, r), { flat: 1 }), 0, 1.4, 0, tg); }
      g.traverse((o) => { o.castShadow = false; });
      const ph = r() * 10;
      this.anims.push((t) => { g.position.y += Math.sin(t * 0.4 + ph) * 0.003; });
      this.group.add(g);
    }
  }
  // ---------------- features
  addLake(x, z, rad, h) {
    const u = { time: { value: 0 }, deep: { value: new THREE.Color(0x1a5a9a) }, shallow: { value: new THREE.Color(0x5ad0e8) } };
    const mat = new THREE.ShaderMaterial({
      uniforms: u, transparent: true, depthWrite: false,
      vertexShader: `varying vec2 vU; varying vec3 vW; void main(){ vU = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float time; uniform vec3 deep, shallow; varying vec2 vU; varying vec3 vW;
        void main(){ float r = length(vU - 0.5) * 2.0;
          float w = sin(vW.x * 3.0 + time * 1.6) * sin(vW.z * 2.6 - time * 1.3) + sin((vW.x + vW.z) * 5.0 + time * 2.4) * 0.5;
          vec3 c = mix(deep, shallow, smoothstep(0.35, 1.0, r) * 0.8 + w * 0.06);
          float spark = pow(max(w, 0.0), 6.0) * 0.9;
          vec3 V = normalize(cameraPosition - vW); float fr = pow(1.0 - max(V.y, 0.0), 3.0);
          c += vec3(spark) + vec3(0.6, 0.8, 1.0) * fr * 0.5;
          float edge = smoothstep(1.0, 0.94, r);
          gl_FragColor = vec4(c, (0.78 + fr * 0.15) * edge); }`,
    });
    const m = new THREE.Mesh(new THREE.CircleGeometry(rad, 64), mat);
    m.rotation.x = -Math.PI / 2; m.position.set(x, h + 0.32, z); m.renderOrder = 2;
    this.group.add(m);
    P(new THREE.RingGeometry(rad - 0.05, rad + 0.55, 64), M(0xe8d6a8, { r: 0.95, side: 1 }), x, h + 0.02, z, this.group, -Math.PI / 2);
    P(new THREE.CircleGeometry(rad, 48), M(0x2a4a6a, { r: 0.9 }), x, h + 0.015, z, this.group, -Math.PI / 2);
    const lake = { x, z, r: rad, h, mesh: m, u };
    this.lakes.push(lake);
    this.anims.push((t) => { u.time.value = t; });
    return lake;
  }
  addLava(x0, x1, z0, z1, y) {
    const u = { time: { value: 0 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: u,
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float time; varying vec3 vW;
        float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
        void main(){ vec2 p = vW.xz * 1.2; float n = n2(p + vec2(time * 0.3, time * 0.1)) * 0.6 + n2(p * 2.3 - time * 0.4) * 0.4;
          float crust = smoothstep(0.55, 0.75, n);
          vec3 hot = mix(vec3(4.0, 1.1, 0.15), vec3(5.0, 2.6, 0.5), n);
          vec3 c = mix(hot, vec3(0.12, 0.04, 0.03), crust);
          gl_FragColor = vec4(c, 1.0); }`,
    });
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.4, z1 - z0), mat);
    m.position.set((x0 + x1) / 2, y - 0.2, (z0 + z1) / 2);
    this.group.add(m);
    const lava = { x0, x1, z0, z1, y };
    this.lavas.push(lava);
    this.anims.push((t) => {
      u.time.value = t;
      requestLight((x0 + x1) / 2, y + 1.2, (z0 + z1) / 2, 0xff6a20, 26, 10, 1);
      if (Math.random() < 0.3) fxAdd.emit({ x: rand(x0, x1), y: y + 0.1, z: rand(z0, z1), vx: rand(-0.3, 0.3), vy: rand(1.5, 3.5), vz: rand(-0.3, 0.3), life: rand(0.6, 1.2), s: 0.18, s1: 0.02, c: 0xffd27a, c1: 0xff3a10, g: -3 });
    });
    return lava;
  }
  update(t, dt) {
    for (const a of this.anims) a(t, dt);
    if (this.glowPts && Math.random() < 0.15) { const p = pick(this.glowPts); FX.sparkle(p[0], p[1] + 0.3, p[2], pick(this.pal.flowers), 0.2); }
  }
}

// --------------------------------------------------------------- the Lumen (goal)
class Lumen {
  constructor(world, x, z, opts = {}) {
    const s = world.surfaceAt(x, z);
    this.world = world; this.x = x; this.z = z; this.h = opts.y ?? (s ? s.h : 0);
    this.active = !opts.locked && !opts.hidden; this.hidden = !!opts.hidden; this.t = 0;
    const g = this.group = new THREE.Group(); g.position.set(x, this.h, z); world.group.add(g);
    if (!opts.noPedestal) {
      P(cyl(0.42, 0.55, 0.35, 8), M(0xe9e2d4, { r: 0.6, flat: 1 }), 0, 0.17, 0, g);
      P(cyl(0.3, 0.38, 0.12, 8), M(0xd8cfbe, { r: 0.6, flat: 1 }), 0, 0.41, 0, g);
    }
    this.gem = new THREE.Group(); this.gem.position.y = 1.35; g.add(this.gem);
    this.crystal = P(octa(0.36), glass(0xffd27a, { e: 0xffb020, ei: 0.9, ior: 1.8 }), 0, 0, 0, this.gem, 0, 0, 0, [1, 1.45, 1]);
    this.core = P(sph(0.16, 16, 12), M(0xffffff, { e: 0xffd27a, ei: 6 }), 0, 0, 0, this.gem);
    this.core.castShadow = false;
    this.ring = P(tor(0.62, 0.018, TAU, 6, 64), M(0xffffff, { e: 0xffc65a, ei: 4 }), 0, 0, 0, this.gem, Math.PI / 2);
    this.ring2 = P(tor(0.5, 0.012, TAU, 6, 64), M(0xffffff, { e: 0x9aa8ff, ei: 4 }), 0, 0, 0, this.gem, Math.PI / 2.4);
    this.seal = P(sph(0.8, 28, 20), M(0x2a3aa8, { r: 0.2, e: 0x1a2a90, ei: 0.8, o: 0.55 }), 0, 0, 0, this.gem);
    this.seal.visible = !this.active;
    g.visible = !this.hidden;
    this.label = Labels.add('<b>Lumen</b>', () => V3(this.group.position.x, this.group.position.y + 2.35, this.group.position.z), 'small');
    this.label.hidden = this.hidden;
  }
  activate(at) {
    if (at) { const s = this.world.surfaceAt(at[0], at[1]); this.x = at[0]; this.z = at[1]; this.h = s ? s.h : this.h; this.group.position.set(this.x, this.h, this.z); }
    if (this.active) return;
    this.active = true; this.hidden = false; this.group.visible = true; this.label.hidden = false;
    this.seal.visible = false;
    FX.burst(this.x, this.h + 1.35, this.z, 0xffd27a, 40, 4, 0.3);
    Sfx.good();
  }
  update(t, dt) {
    this.t += dt;
    this.gem.rotation.y += dt * 1.2;
    this.gem.position.y = 1.35 + Math.sin(this.t * 2) * 0.12;
    this.ring.rotation.z += dt * 0.8; this.ring2.rotation.x += dt * 0.6;
    if (this.hidden) return;
    const k = this.active ? 1 : 0.3;
    requestLight(this.x, this.h + 1.6, this.z, 0xffc870, 14 * k, 7, 2);
    if (this.active && Math.random() < 0.4) FX.sparkle(this.x, this.h + 1.35, this.z, 0xffe6a0, 0.7);
  }
}
