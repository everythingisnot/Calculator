// ======================================================================
// Entities: written things (objects & creatures) and Wren, the player.
// ======================================================================
const OVERRIDE = {
  metal: () => new THREE.MeshStandardMaterial({ color: 0xbac3cd, metalness: 0.9, roughness: 0.28, envMapIntensity: 1 }),
  stone: () => new THREE.MeshStandardMaterial({ color: 0xa29d95, roughness: 0.92, flatShading: true }),
  wood: () => new THREE.MeshStandardMaterial({ color: C.wood, roughness: 0.8 }),
  gold: () => new THREE.MeshStandardMaterial({ color: C.gold, metalness: 1, roughness: 0.2, envMapIntensity: 1.2 }),
  ice: () => glass(0xc8eeff, { r: 0.1 }).clone(),
};
function buildThingMesh(def, p, bName, v) {
  const outer = new THREE.Group();
  const inner = new THREE.Group();
  outer.add(inner);
  (B[bName || def.b] || B.crate)(inner, v || def.v || {});
  const cache = new Map();
  if (p.mat || p.colour != null || p.glow) {
    inner.traverse((o) => {
      if (!o.isMesh || !o.material || !o.material.userData.main) return;
      const key = o.material.uuid;
      let nm = cache.get(key);
      if (!nm) {
        nm = p.mat ? OVERRIDE[p.mat]() : o.material.clone();
        if (p.colour != null) { nm.color = new THREE.Color(p.colour); if (p.mat === 'gold' || p.mat === 'metal') nm.metalness = 0.6; }
        if (p.glow) { nm.emissive = new THREE.Color(typeof p.glow === 'number' ? p.glow : (p.colour ?? 0xfff0b0)); nm.emissiveIntensity = 1.4; }
        nm.userData = { main: true };
        cache.set(key, nm);
      }
      o.material = nm;
    });
  }
  // stretch along the long axis, then uniform scale
  if (p.stretch !== 1) {
    const b = new THREE.Box3().setFromObject(inner), s = b.getSize(V3());
    const ax = s.y >= s.x && s.y >= s.z ? 'y' : s.x >= s.z ? 'x' : 'z';
    inner.scale[ax] *= p.stretch;
  }
  outer.scale.setScalar(p.scale);
  if (p.wings && !inner.userData.wings) {
    const b = new THREE.Box3().setFromObject(inner), s = b.getSize(V3());
    const wings = [];
    for (const sd of [-1, 1]) {
      const w = new THREE.Group(); w.position.set(sd * s.x * 0.45, b.max.y * 0.75, 0); inner.add(w);
      for (let i = 0; i < 3; i++) P(sph(0.22, 12, 8), M(0xffffff, { r: 0.5 }), sd * (0.2 + i * 0.16), 0.05 - i * 0.07, 0, w, 0, 0, sd * (0.4 + i * 0.15), [1.2, 0.3, 0.12]);
      wings.push(w);
    }
    inner.userData.wings = wings;
  }
  outer.traverse((o) => { if (o.isMesh) { if (o.castShadow !== false) o.castShadow = true; o.receiveShadow = true; } });
  return { outer, inner };
}

let thingSeq = 0;
class Thing {
  constructor(game, def, props, label, opts = {}) {
    this.id = ++thingSeq; this.game = game; this.def = def; this.p = props; this.tags = props.tags; this.label = label;
    this.group = new THREE.Group();
    game.world.group.add(this.group);
    const { outer, inner } = buildThingMesh(def, props, opts.b, opts.v);
    this.mesh = outer; this.inner = inner; this.parts = inner.userData;
    this.group.add(outer);
    this.vy = 0; this.alive = true; this.burning = !!props.ignite; this.burnT = 0; this.heat = 0;
    this.burnMax = 4 + Math.min(props.mass, 6) * 0.8;
    this.snap = null; this.equipped = null; this.dragging = false; this.fixed = !!opts.fixed;
    this.t = rand(0, 10); this.dir = rand(0, TAU); this.wanderT = 0; this.moving = false; this.attackCD = 1; this.fuse = 0; this.sleeping = false; this.eatT = 0;
    this.measure();
  }
  measure() {
    const prev = this.group.scale.x; this.group.scale.setScalar(1);
    const q = this.group.quaternion.clone(); this.group.quaternion.identity();
    this.group.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(this.mesh), s = b.getSize(V3());
    this.size = s; this.radius = Math.max(s.x, s.z) / 2; this.height = s.y;
    this.group.scale.setScalar(prev); this.group.quaternion.copy(q);
  }
  has(t) { return this.tags.has(t); }
  get pos() { return this.group.position; }
  get name() { return this.label; }
  worldPoint(local) { const v = local.clone(); this.inner.localToWorld(v); return v; }
  setVisual(bName, v, rot) { // used when an object snaps into a socket and changes shape (rope -> hanging rope)
    this.group.remove(this.mesh);
    const { outer, inner } = buildThingMesh(this.def, { ...this.p, stretch: 1, scale: 1, wings: false }, bName, v);
    this.mesh = outer; this.inner = inner; this.parts = inner.userData; this.group.add(outer);
  }
  remove(reason) {
    if (!this.alive) return;
    this.alive = false;
    if (this.equipped) this.game.player.unequip(this, true);
    if (this.snap && this.snap.target.release) this.snap.target.release(this, reason);
    this.group.parent && this.group.parent.remove(this.group);
    this.game.things = this.game.things.filter((t) => t !== this);
    this.game.onThingRemoved(this);
  }
  ignite() {
    if (this.burning || !this.has('flammable') || !this.alive) return false;
    this.burning = true; this.burnT = 0; Sfx.hiss();
    return true;
  }
  extinguish() { if (!this.burning) return false; this.burning = false; this.heat = 0; FX.steam(this.pos.x, this.pos.y + 0.4, this.pos.z, 8); return true; }
  flamePoint() { return this.parts.flameAt ? this.worldPoint(this.parts.flameAt) : V3(this.pos.x, this.pos.y + this.height * this.group.scale.y, this.pos.z); }
  update(dt) {
    this.t += dt;
    const ud = this.parts, inner = this.inner;
    if (ud.anim) ud.anim(inner, this.t, dt, this);
    if (ud.spin && !this.equipped && !this.snap) inner.rotation.y += dt * 0.9;
    if (ud.wings) {
      const flying = this.p.hover != null || this.equipped || ud.wingFlat === undefined;
      const f = Math.sin(this.t * (ud.wingFlat ? 4 : 14)) * (flying ? (ud.wingFlat ? 0.5 : 0.7) : 0.15);
      ud.wings.forEach((w, i) => { if (ud.wingFlat) w.rotation.z = (i ? -1 : 1) * (0.2 + f); else w.rotation.z = (i ? -1 : 1) * f; });
    }
    if (ud.rain && !this.equipped && Math.random() < 0.8) fxNorm.emit({ x: this.pos.x + rand(-0.6, 0.6) * this.p.scale, y: this.pos.y + 1.0 * this.p.scale, z: this.pos.z + rand(-0.4, 0.4) * this.p.scale, vy: -7, life: 0.35, s: 0.06, s1: 0.06, c: 0x9fd0ff, a: 0.8 });
    // flames & lights
    const fs = this.p.scale * this.group.scale.x;
    if (this.has('flame') && (!ud.jet || this.equipped)) {
      const fp = this.flamePoint(), k = (ud.small ? 0.45 : ud.big ? 1.5 : 0.85) * Math.sqrt(fs);
      if (Math.random() < (ud.small ? 0.5 : 0.95)) FX.fire(fp.x, fp.y, fp.z, k);
      if (ud.big && Math.random() < 0.6) FX.fire(fp.x, fp.y, fp.z, k * 0.8);
      if (Math.random() < 0.05) FX.smoke(fp.x, fp.y + 0.6, fp.z, 0.6);
      requestLight(fp.x, fp.y + (this.equipped ? 1.1 : 0.3), fp.z, 0xff8a3a, (ud.small ? 5 : 12) * fs * (0.85 + Math.random() * 0.3), 6 + 2 * fs, 1);
    } else if (this.p.light > 0 && !this.burning) {
      const c = ud.glow ?? (typeof this.p.glow === 'number' ? this.p.glow : 0xffe2a8);
      requestLight(this.pos.x, this.pos.y + Math.max(0.6, this.height * fs * 0.6), this.pos.z, c, Math.min(30, this.p.light * 2.2), this.p.light * 1.3, 0);
    }
    if (this.burning) {
      this.burnT += dt;
      const s = this.size, sc = this.group.scale.x * this.p.scale;
      for (let i = 0; i < 2; i++) {
        const lp = V3(rand(-0.5, 0.5) * s.x / this.p.scale, rand(0.1, 0.9) * s.y / this.p.scale, rand(-0.5, 0.5) * s.z / this.p.scale);
        const w = this.worldPoint(lp); FX.fire(w.x, w.y, w.z, 0.8 * Math.sqrt(sc));
      }
      if (Math.random() < 0.15) FX.smoke(this.pos.x, this.pos.y + this.height * sc, this.pos.z, 0.9);
      requestLight(this.pos.x, this.pos.y + 1, this.pos.z, 0xff7a2a, 16, 8, 1);
      const char = clamp(this.burnT / this.burnMax, 0, 1);
      this.inner.traverse((o) => { if (o.isMesh && o.material && o.material.color && !o.userData.charred && char > 0.6) { o.material = o.material.clone(); o.material.color.multiplyScalar(0.25); o.material.emissive = new THREE.Color(0x401000); o.userData.charred = true; } });
      if (this.burnT > this.burnMax) {
        FX.smoke(this.pos.x, this.pos.y + 0.5, this.pos.z, 1.6); FX.burst(this.pos.x, this.pos.y + 0.5, this.pos.z, 0xff8a3a, 14, 2, 0.2);
        this.game.toast(`The ${this.label} burned to ash.`, 'bad');
        this.remove('burned'); return;
      }
    }
    if (this.fuse > 0) {
      this.fuse -= dt;
      const fp = this.parts.fuseAt ? this.worldPoint(this.parts.fuseAt) : V3(this.pos.x, this.pos.y + 1, this.pos.z);
      fxAdd.emit({ x: fp.x, y: fp.y, z: fp.z, vx: rand(-1, 1), vy: rand(0.5, 2), vz: rand(-1, 1), life: 0.3, s: 0.12, s1: 0.01, c: 0xfff0a0, c1: 0xff6a10 });
      if (this.fuse <= 0) { this.game.explode(this); return; }
    }
    if (this.equipped || this.dragging || this.snap || this.fixed) return;
    this.physics(dt);
    if (this.alive && this.has('creature') && this.onGround) this.ai(dt);
  }
  physics(dt) {
    const w = this.game.world, x = this.pos.x, z = this.pos.z;
    const s = w.surfaceAt(x, z), lake = w.lakeAt(x, z);
    this.onGround = false;
    if (this.p.hover != null && !(this.sleeping)) {
      const base = s ? s.h : (this.restY ?? this.pos.y - this.p.hover);
      this.restY = base;
      const ty = base + this.p.hover + Math.sin(this.t * 1.6) * 0.12;
      this.pos.y = lerp(this.pos.y, ty, 1 - Math.exp(-dt * 3));
      this.onGround = !!s;
      return;
    }
    if (lake && s && this.pos.y <= s.h + 0.6) {
      const floats = this.has('wood') || this.has('cloth') || this.has('plant') || this.has('swim') || this.has('ice') || this.p.mass < 0.6;
      if (floats || this.has('creature') && this.def.name === 'shark') { this.pos.y = lerp(this.pos.y, s.h + 0.12 + Math.sin(this.t * 2) * 0.05, 1 - Math.exp(-dt * 4)); this.vy = 0; this.onGround = this.has('creature'); return; }
      this.vy -= 6 * dt; this.pos.y += this.vy * dt;
      if (this.pos.y < s.h - 1.4) { this.game.toast(`The ${this.label} sank to the bottom of the lake.`); this.remove('sank'); }
      return;
    }
    const lava = w.lavaAt(x, z);
    if (lava && this.pos.y < lava.y + 0.4) {
      FX.burst(x, lava.y + 0.3, z, 0xff8a3a, 18, 2.5, 0.25); FX.smoke(x, lava.y + 0.5, z, 1.2);
      this.game.toast(`The ${this.label} melted into the lava.`, 'bad'); Sfx.hiss(); this.remove('lava'); return;
    }
    if (s && this.pos.y >= s.h - 0.5) {
      if (this.pos.y > s.h + 0.001 || this.vy > 0) {
        this.vy -= 24 * dt; this.pos.y += this.vy * dt;
        if (this.pos.y <= s.h) {
          if (this.vy < -7) { FX.dust(x, s.h, z, 8); if (this.p.mass > 3) this.game.shake(0.12); }
          this.pos.y = s.h; this.vy = this.vy < -6 ? -this.vy * 0.18 : 0;
        }
      } else { this.pos.y = s.h; this.onGround = true; }
      if (this.pos.y === s.h) this.onGround = true;
    } else {
      this.vy -= 24 * dt; this.pos.y += this.vy * dt;
      if (this.pos.y < -30) { this.game.toast(`The ${this.label} tumbled into the clouds.`); this.remove('fell'); }
    }
  }
  canEat(food) {
    const diet = this.def.diet;
    if (!diet || food === this || !food.alive || food.equipped) return false;
    if (food.has('creature')) return diet.includes('meat') && food.has('prey') && this.p.power > food.p.power;
    return food.has('food') && diet.includes(food.p.food) || (diet.includes('plant') && food.has('plant'));
  }
  ai(dt) {
    const g = this.game, pl = g.player;
    this.attackCD -= dt;
    if (this.sleeping) { if (Math.random() < 0.02) fxNorm.emit({ x: this.pos.x, y: this.pos.y + this.height * this.p.scale + 0.3, z: this.pos.z, vy: 0.5, vx: 0.2, life: 1.6, s: 0.2, s1: 0.35, c: 0xffffff, a: 0.7 }); return; }
    let tx = null, tz = null, speed = this.p.speed;
    const dp = hyp(this.pos.x, this.pos.z, pl.pos.x, pl.pos.z);
    const hostile = this.has('hostile') && !this.has('sleepy') && !this.calmed;
    if (hostile && !pl.dead && dp < 8 && Math.abs(pl.pos.y - this.pos.y) < 1.2 && !g.won) {
      tx = pl.pos.x; tz = pl.pos.z;
      if (dp < 0.75 + this.radius * this.p.scale * 0.6 && this.attackCD <= 0) {
        this.attackCD = 1.8;
        if (this.def.name === 'dragon') { const m = V3(this.pos.x, this.pos.y + 1.5, this.pos.z); for (let i = 0; i < 20; i++) FX.fire(lerp(m.x, pl.pos.x, i / 20), m.y, lerp(m.z, pl.pos.z, i / 20), 1); }
        pl.hurt(1, `The ${this.label} attacked Wren!`, this);
      }
    } else if (this.def.diet && !this.full) {
      let best = null, bd = 4;
      for (const f of g.things) { if (!this.canEat(f) || f.snap) continue; const d = hyp(this.pos.x, this.pos.z, f.pos.x, f.pos.z); if (d < bd && Math.abs(f.pos.y - this.pos.y) < 1) { bd = d; best = f; } }
      if (best) {
        tx = best.pos.x; tz = best.pos.z;
        if (bd < 0.7 + this.radius * this.p.scale * 0.5) {
          this.eatT += dt;
          if (this.eatT > 0.6) { this.eatT = 0; Sfx.chomp(); FX.burst(best.pos.x, best.pos.y + 0.3, best.pos.z, 0xffe0a0, 8, 1.5, 0.15); g.toast(`The ${this.label} ate the ${best.label}.`); best.remove('eaten'); if (Math.random() < 0.5) this.full = true; }
          tx = null;
        }
      }
    }
    if (tx == null) {
      this.wanderT -= dt;
      if (this.wanderT <= 0) { this.wanderT = rand(1.5, 4); this.dir = rand(0, TAU); this.wanderMove = Math.random() < 0.55; }
      if (!this.wanderMove) { this.moving = false; this.animLegs(dt, 0); return; }
      speed *= 0.35;
    } else this.dir = Math.atan2(tx - this.pos.x, tz - this.pos.z);
    const nx = this.pos.x + Math.sin(this.dir) * speed * dt, nz = this.pos.z + Math.cos(this.dir) * speed * dt;
    const s0 = g.world.surfaceAt(this.pos.x, this.pos.z), s1 = g.world.surfaceAt(nx + Math.sin(this.dir) * 0.4, nz + Math.cos(this.dir) * 0.4);
    if (s1 && s0 && Math.abs(s1.h - s0.h) < 0.3 && !g.world.lakeAt(nx, nz) && !g.blockedFor(this, nx, nz)) { this.pos.x = nx; this.pos.z = nz; this.moving = true; }
    else { this.dir += Math.PI * rand(0.6, 1.4); this.moving = false; }
    this.group.rotation.y = lerpAngle(this.group.rotation.y, this.dir, 1 - Math.exp(-dt * 8));
    this.animLegs(dt, this.moving ? speed : 0);
  }
  animLegs(dt, speed) {
    const legs = this.parts.legs; if (!legs) return;
    const a = speed > 0 ? Math.sin(this.t * (6 + speed * 2)) * 0.6 : 0;
    legs.forEach((l, i) => { l.rotation.x = lerp(l.rotation.x, (i % 2 === (i < 2 ? 0 : 1) ? a : -a), 0.3); });
    if (this.parts.arms) this.parts.arms.forEach((l, i) => { if (!this.def.v?.zombie) l.rotation.x = lerp(l.rotation.x, i ? a : -a, 0.3); });
  }
}
function lerpAngle(a, b, t) { let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * t; }

// ---------------------------------------------------------------- Wren
class Player {
  constructor(game, x, z) {
    this.game = game;
    this.group = new THREE.Group();
    game.world.group.add(this.group);
    const s = game.world.surfaceAt(x, z);
    this.group.position.set(x, s ? s.h : 0, z);
    this.body = new THREE.Group(); this.group.add(this.body); this.body.scale.setScalar(1.18);
    this.build();
    this.path = []; this.hand = null; this.back = null; this.ride = null; this.rideH = 0;
    this.hearts = 3; this.maxHearts = 3; this.hurtCount = 0; this.iframes = 0; this.dead = false; this.t = 0; this.facing = 0; this.mode = 'walk'; this.armorHP = 0;
  }
  get pos() { return this.group.position; }
  build() {
    const b = this.body;
    const ink = new THREE.MeshPhysicalMaterial({ color: 0x3550d8, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.18, sheen: 0.5, sheenColor: new THREE.Color(0x8aa0ff), envMapIntensity: 1 });
    const cream = M(0xfff4e2, { r: 0.55 });
    P(caps(0.34, 0.34, 8, 20), ink, 0, 0.58, 0, b);
    P(sph(0.27, 20, 14), cream, 0, 0.62, 0.17, b, 0, 0, 0, [1, 1.05, 0.55]);
    for (const sd of [-1, 1]) {
      P(sph(0.085, 14, 10), M(0xffffff, { r: 0.2 }), sd * 0.1, 0.72, 0.29, b, 0, 0, 0, [1, 1.25, 0.6]);
      P(sph(0.048, 10, 8), M(0x10142e, { r: 0.2 }), sd * 0.1, 0.715, 0.335, b);
      P(sph(0.016, 6, 6), M(0xffffff, { e: 0xffffff, ei: 1 }), sd * 0.1 + 0.015, 0.74, 0.37, b);
      P(sph(0.04, 8, 6), M(0xff9aa8, { r: 0.6 }), sd * 0.18, 0.62, 0.27, b, 0, 0, 0, [1, 0.6, 0.4]);
    }
    // scarf
    P(tor(0.3, 0.07, TAU, 10, 28), M(0xff7a5a, { r: 0.7 }), 0, 0.42, 0, b, Math.PI / 2);
    this.scarf = new THREE.Group(); this.scarf.position.set(0.12, 0.42, -0.28); b.add(this.scarf);
    P(box(0.12, 0.05, 0.4, 0.02), M(0xff7a5a, { r: 0.7 }), 0, 0, -0.18, this.scarf);
    // quill feather crest
    this.feather = new THREE.Group(); this.feather.position.set(0, 1.0, -0.02); b.add(this.feather);
    for (let i = 0; i < 5; i++) P(sph(0.09 - i * 0.008, 10, 8), M(i % 2 ? 0xffd27a : 0xffc65a, { r: 0.5, e: 0x6a4a00, ei: 0.4 }), 0, 0.06 + i * 0.09, -0.04 - i * 0.05, this.feather, -0.4 - i * 0.1, 0, 0, [0.5, 1.4, 0.35]);
    P(cyl(0.012, 0.012, 0.5, 6), M(0xffe6b0, {}), 0, 0.2, -0.1, this.feather, -0.5);
    // feet & hands
    this.feet = [];
    for (const sd of [-1, 1]) { const f = P(sph(0.1, 12, 8), M(0x23307a, { r: 0.5 }), sd * 0.14, 0.07, 0.04, b, 0, 0, 0, [1, 0.6, 1.3]); this.feet.push(f); }
    this.hands = [];
    for (const sd of [-1, 1]) { const h = P(sph(0.075, 12, 8), ink, sd * 0.37, 0.5, 0.05, b); this.hands.push(h); }
    this.handSlot = new THREE.Group(); this.handSlot.position.set(0.42, 0.5, 0.12); b.add(this.handSlot);
    this.backSlot = new THREE.Group(); this.backSlot.position.set(0, 0.45, -0.32); b.add(this.backSlot);
    this.rideSlot = new THREE.Group(); this.group.add(this.rideSlot);
    this.shadowDisc = new THREE.Mesh(new THREE.CircleGeometry(0.35, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false }));
    this.shadowDisc.rotation.x = -Math.PI / 2; this.shadowDisc.position.y = 0.02; this.group.add(this.shadowDisc);
  }
  hasTag(t) { return [this.hand, this.back, this.ride].some((x) => x && x.has(t)); }
  equippedThings() { return [this.hand, this.back, this.ride].filter(Boolean); }
  canFly() { return this.hasTag('fly'); }
  lightLevel() { return Math.max(0, ...this.equippedThings().map((t) => t.p.light || 0)); }
  equip(thing) {
    const slot = thing.p.equip;
    if (!slot) return false;
    const cur = slot === 'hand' ? this.hand : slot === 'back' ? this.back : this.ride;
    if (cur) this.unequip(cur);
    thing.equipped = slot; thing.snap && thing.snap.target.release && thing.snap.target.release(thing); thing.snap = null;
    thing.group.parent && thing.group.parent.remove(thing.group);
    thing.group.rotation.set(0, 0, 0);
    const maxDim = Math.max(thing.size.x, thing.size.y, thing.size.z) || 1;
    const want = slot === 'hand' ? 0.85 : slot === 'back' ? 1.0 : 2.4;
    thing.group.scale.setScalar(Math.min(1, want / maxDim));
    if (slot === 'hand') { this.hand = thing; this.handSlot.add(thing.group); thing.group.position.set(0, -0.15, 0); thing.group.rotation.set(0, Math.PI / 2, 0); }
    else if (slot === 'back') { this.back = thing; this.backSlot.add(thing.group); thing.group.position.set(0, -0.2, 0); thing.group.rotation.set(0, Math.PI, 0); }
    else {
      this.ride = thing; this.rideSlot.add(thing.group); thing.group.position.set(0, 0, 0);
      const k = thing.group.scale.x;
      this.rideH = thing.has('creature') ? thing.height * k * 0.75 : clamp(thing.height * k * 0.55, 0.3, 1.6);
      thing.group.rotation.y = thing.has('creature') ? 0 : -Math.PI / 2;
    }
    if (thing.has('armor')) this.armorHP += Math.round(thing.p.armor || 1);
    this.game.onEquip(thing);
    return true;
  }
  unequip(thing, silent = false) {
    if (this.hand === thing) this.hand = null; else if (this.back === thing) this.back = null; else if (this.ride === thing) { this.ride = null; this.rideH = 0; } else return;
    thing.equipped = null;
    thing.group.parent && thing.group.parent.remove(thing.group);
    if (thing.has('armor')) this.armorHP = Math.max(0, this.armorHP - Math.round(thing.p.armor || 1));
    if (silent || !thing.alive) return;
    thing.group.scale.setScalar(1); thing.group.rotation.set(0, 0, 0);
    this.game.world.group.add(thing.group);
    thing.pos.set(this.pos.x + Math.sin(this.facing + 1.2) * 1.0, this.pos.y + 0.5, this.pos.z + Math.cos(this.facing + 1.2) * 1.0);
    thing.vy = 0;
  }
  hurt(n, msg, src) {
    if (this.iframes > 0 || this.dead || this.game.won) return;
    this.iframes = 1.6;
    if (this.armorHP > 0) {
      this.armorHP--; Sfx.tone(900, 0.15, 'square', 0.12, -200);
      FX.burst(this.pos.x, this.pos.y + 0.7, this.pos.z, 0xdfe8ff, 14, 2.5, 0.15);
      this.game.toast(`${msg} The armour took the hit.`);
      const worn = this.equippedThings().find((t) => t.has('armor'));
      if (worn && this.armorHP === 0) { this.game.toast(`The ${worn.label} broke.`, 'bad'); worn.remove('broke'); }
      return;
    }
    this.hearts -= n; this.hurtCount += n;
    Sfx.hurt(); this.game.flashHurt(); this.game.shake(0.25);
    if (src) { const a = Math.atan2(this.pos.x - src.pos.x, this.pos.z - src.pos.z); this.knock = { x: Math.sin(a) * 4, z: Math.cos(a) * 4, t: 0.25 }; this.path = []; }
    this.game.toast(msg + (this.hearts > 0 ? ` ${this.hearts} heart${this.hearts === 1 ? '' : 's'} left.` : ''), 'bad');
    this.game.updateHUD();
    if (this.hearts <= 0) { this.dead = true; this.game.fail(msg); }
  }
  heal(n) { const before = this.hearts; this.hearts = Math.min(this.maxHearts, this.hearts + n); this.game.updateHUD(); FX.burst(this.pos.x, this.pos.y + 0.8, this.pos.z, 0xff8aa8, 20, 2, 0.2); return this.hearts > before; }
  update(dt) {
    this.t += dt; this.iframes = Math.max(0, this.iframes - dt);
    const w = this.game.world;
    let moving = false;
    if (this.knock && this.knock.t > 0) {
      this.knock.t -= dt;
      const nx = this.pos.x + this.knock.x * dt, nz = this.pos.z + this.knock.z * dt, s = w.surfaceAt(nx, nz), s0 = w.surfaceAt(this.pos.x, this.pos.z);
      if (s && s0 && Math.abs(s.h - s0.h) < 0.2 && this.game.nav.zoneAt(nx, s.h, nz)) { this.pos.x = nx; this.pos.z = nz; }
    } else if (this.path.length) {
      const wp = this.path[0];
      const sp = wp.mode === 'fly' ? 6.5 : wp.mode === 'climb' ? 2.4 : wp.mode === 'bounce' ? 5 : (this.ride && this.ride.has('creature') ? this.ride.p.speed : 0) || 3.8;
      const dx = wp.x - this.pos.x, dz = wp.z - this.pos.z, dy = wp.y - this.pos.y, dh = Math.hypot(dx, dz), d = Math.hypot(dh, dy);
      const step = sp * dt;
      if (d <= step) { this.pos.set(wp.x, wp.y, wp.z); this.path.shift(); this.mode = this.path[0]?.mode || 'walk'; wp.done && wp.done(); }
      else {
        this.pos.x += dx / d * step; this.pos.z += dz / d * step; this.pos.y += dy / d * step; moving = true; this.mode = wp.mode;
        if (wp.mode === 'walk') { const s = w.surfaceAt(this.pos.x, this.pos.z); if (s && Math.abs(s.h - this.pos.y) < 0.6) this.pos.y = s.h; }
        if (wp.mode === 'bounce') { const u = 1 - d / (wp.len || d); this.bounceY = Math.sin(clamp(u, 0, 1) * Math.PI) * 2.5; }
        if (dh > 0.02 && wp.mode !== 'climb') this.facing = Math.atan2(dx, dz);
      }
    }
    if (!this.path.length || this.mode !== 'bounce') this.bounceY = lerp(this.bounceY || 0, 0, 0.3);
    if (!this.path.length && !this.flyingRest) this.mode = 'walk';
    this.group.rotation.y = lerpAngle(this.group.rotation.y, this.facing, 1 - Math.exp(-dt * 10));
    // body animation
    const b = this.body;
    const flying = this.mode === 'fly';
    const bob = moving ? Math.abs(Math.sin(this.t * 11)) * 0.08 : Math.sin(this.t * 2.2) * 0.02;
    b.position.y = this.rideH + (this.bounceY || 0) + (flying ? 0.25 + Math.sin(this.t * 4) * 0.08 : bob);
    b.rotation.z = moving && !flying ? Math.sin(this.t * 11) * 0.06 : 0;
    b.rotation.x = flying ? 0.25 : this.mode === 'climb' ? -0.2 : 0;
    b.scale.y = 1.18 * (1 + (moving ? 0 : Math.sin(this.t * 2.2) * 0.02));
    this.feet.forEach((f, i) => { f.position.z = 0.04 + (moving && !this.ride ? Math.sin(this.t * 11 + i * Math.PI) * 0.1 : 0); });
    this.scarf.rotation.x = Math.sin(this.t * (moving ? 12 : 3)) * (moving ? 0.35 : 0.1) - (moving ? 0.3 : 0);
    this.feather.rotation.x = Math.sin(this.t * 3) * 0.06 - (moving ? 0.15 : 0);
    this.group.visible = this.iframes <= 0 || Math.floor(this.t * 14) % 2 === 0;
    this.shadowDisc.position.y = 0.02 - (b.position.y > 0.2 ? 0 : 0);
    this.shadowDisc.scale.setScalar(1 / (1 + b.position.y * 0.4));
    // carried gear effects
    for (const t of this.equippedThings()) t.update(dt);
    if ((flying || this.mode === 'bounce') && this.back && this.back.parts.jet) { const p = this.backSlot.localToWorld(V3(0, -0.2, 0)); FX.fire(p.x, p.y, p.z, 0.5); }
    const ll = this.lightLevel();
    if (ll > 0 && !this.hasTag('flame')) requestLight(this.pos.x, this.pos.y + 2.6, this.pos.z, 0xffe6b0, 10 + ll, ll * 1.6, 3);
    if (this.ride && this.ride.has('creature')) this.ride.animLegs(dt, moving ? 5 : 0);
  }
}
