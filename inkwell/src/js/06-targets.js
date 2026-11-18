// ======================================================================
// Navigation (zones joined by links) and puzzle targets.
// A link is passable when its target is solved, or by flight when the link allows it.
// ======================================================================
class Nav {
  constructor(game, level) {
    this.game = game;
    this.zones = level.zones.map((z) => ({ ...z }));
    this.links = (level.links || []).map((l) => ({ flyable: l.kind === 'gap' || l.kind === 'cliff', ...l }));
  }
  zone(id) { return this.zones.find((z) => z.id === id); }
  zoneAt(x, y, z) {
    let best = null, bd = 1.2;
    for (const zn of this.zones) if (x >= zn.x0 - 0.05 && x <= zn.x1 + 0.05 && z >= zn.z0 - 0.05 && z <= zn.z1 + 0.05) { const d = Math.abs(zn.h - y); if (d < bd) { bd = d; best = zn; } }
    return best;
  }
  nearestZone(x, y, z) {
    let best = null, bd = 1e9;
    for (const zn of this.zones) { const cx = clamp(x, zn.x0, zn.x1), cz = clamp(z, zn.z0, zn.z1); const d = hyp(x, z, cx, cz) + Math.abs(zn.h - y) * 2; if (d < bd) { bd = d; best = zn; } }
    return best;
  }
  open(l) { return !l.target || this.game.targets[l.target]?.solved; }
  route(fromId, toId, pass) {
    const prev = new Map([[fromId, null]]), q = [fromId];
    while (q.length) {
      const z = q.shift(); if (z === toId) break;
      for (const l of this.links) {
        let nb = null; if (l.a === z) nb = l.b; else if (l.b === z) nb = l.a; else continue;
        if (prev.has(nb) || !pass(l)) continue;
        prev.set(nb, { l, from: z }); q.push(nb);
      }
    }
    if (!prev.has(toId)) return null;
    const steps = []; let c = toId;
    while (prev.get(c)) { const p = prev.get(c); steps.unshift({ l: p.l, from: p.from, to: c }); c = p.from; }
    return steps;
  }
  clampIn(zn, x, z, m = 0.35) { return [clamp(x, zn.x0 + m, zn.x1 - m), clamp(z, zn.z0 + m, zn.z1 - m)]; }
  plan(pl, tx, tz, tzone) {
    const g = this.game;
    const from = this.zoneAt(pl.pos.x, pl.pos.y, pl.pos.z) || this.nearestZone(pl.pos.x, pl.pos.y, pl.pos.z);
    const [dx, dz] = this.clampIn(tzone, tx, tz);
    const canFly = pl.canFly() && !g.level.rules?.noFly;
    if (from === tzone) return { path: [{ x: dx, y: tzone.h, z: dz, mode: 'walk' }] };
    const walk = this.route(from.id, tzone.id, (l) => this.open(l));
    if (walk) {
      const path = [];
      for (const s of walk) {
        const l = s.l, fwd = l.a === s.from;
        const pa = fwd ? l.pa : l.pb, pb = fwd ? l.pb : l.pa;
        const za = this.zone(s.from), zb = this.zone(s.to);
        path.push({ x: pa[0], y: za.h, z: pa[1], mode: 'walk' });
        const tgt = l.target && g.targets[l.target];
        const style = tgt && tgt.style;
        if (l.kind === 'cliff' && style === 'bounce') path.push({ x: pb[0], y: zb.h, z: pb[1], mode: 'bounce', len: hyp(pa[0], pa[1], pb[0], pb[1]) + Math.abs(zb.h - za.h) });
        else if (l.kind === 'cliff') { const foot = fwd ? l.pa : l.pb; const midX = tgt?.climbX ?? (pa[0] + pb[0]) / 2; path.push({ x: midX, y: za.h, z: foot[1], mode: 'walk' }); path.push({ x: midX, y: zb.h + 0.1, z: pb[1], mode: 'climb' }); path.push({ x: pb[0], y: zb.h, z: pb[1], mode: 'walk' }); }
        else path.push({ x: pb[0], y: zb.h, z: pb[1], mode: 'walk' });
      }
      path.push({ x: dx, y: tzone.h, z: dz, mode: 'walk' });
      return { path };
    }
    if (canFly) {
      const fly = this.route(from.id, tzone.id, (l) => this.open(l) || l.flyable);
      if (fly) {
        const top = Math.max(pl.pos.y, tzone.h) + 2.6;
        return { path: [{ x: pl.pos.x, y: top, z: pl.pos.z, mode: 'fly' }, { x: dx, y: top, z: dz, mode: 'fly' }, { x: dx, y: tzone.h, z: dz, mode: 'fly' }], flew: true };
      }
    }
    const any = this.route(from.id, tzone.id, () => true);
    if (!any) return { path: [], reason: 'Wren can’t get there from here.' };
    const path = [];
    for (const s of any) {
      const l = s.l, fwd = l.a === s.from, pa = fwd ? l.pa : l.pb, pb = fwd ? l.pb : l.pa;
      const za = this.zone(s.from), zb = this.zone(s.to);
      path.push({ x: pa[0], y: za.h, z: pa[1], mode: 'walk' });
      if (!this.open(l)) {
        const t = l.target && g.targets[l.target];
        let reason = t?.blockMsg?.() || 'The way is blocked.';
        if (l.flyable && pl.canFly() && g.level.rules?.noFly) reason += ' ' + g.level.rules.noFly;
        return { path, reason, blocker: t };
      }
      path.push({ x: pb[0], y: zb.h, z: pb[1], mode: l.kind === 'cliff' ? 'climb' : 'walk' });
    }
    return { path };
  }
}

// ---------------------------------------------------------------- targets
class Target {
  constructor(game, spec) {
    this.game = game; this.spec = spec; this.id = spec.id; this.type = spec.type; this.solved = false;
    this.x = spec.x ?? 0; this.z = spec.z ?? 0; this.r = spec.r ?? 2; this.goal = spec.goal || null;
    this.h = spec.h ?? (game.world.surfaceAt(this.x, this.z)?.h ?? 0);
    this.group = new THREE.Group(); game.world.group.add(this.group);
    this.build();
    if (spec.label) this.labelEl = Labels.add(spec.label, () => this.labelPos(), spec.warn ? 'warn' : '');
  }
  labelPos() { return V3(this.x, this.h + (this.labelY ?? 2.6), this.z); }
  build() {}
  near(thing, extra = 0) { return hyp(thing.pos.x, thing.pos.z, this.x, this.z) < this.r + extra; }
  accept() { return false; }
  update() {}
  blockMsg() { return this.spec.block || 'Something blocks the way.'; }
  solve(msg, cls = 'good') {
    if (this.solved) return;
    this.solved = true;
    if (this.labelEl) this.labelEl.el.classList.add('done');
    if (msg) this.game.toast(msg, cls);
    Sfx.good();
    this.game.onSolved(this);
  }
  unsolve(msg) {
    if (!this.solved) return;
    this.solved = false;
    if (this.labelEl) this.labelEl.el.classList.remove('done');
    if (msg) this.game.toast(msg, 'bad');
    this.game.onUnsolved(this);
  }
}
const TT = {};

// ---- ledge to climb
TT.cliff = class extends Target {
  build() {
    const s = this.spec; this.H = s.H; this.dir = s.dir; this.wallX = s.wallX; this.h = s.lowH;
    this.x = s.wallX - s.dir * 0.9; this.z = s.z ?? 0; this.r = s.r ?? 1.9; this.labelY = s.H + 1.2;
    this.climbX = s.wallX - s.dir * 0.35;
    const dots = new THREE.Group(); this.group.add(dots);
    for (let y = 0.3; y < this.H; y += 0.42) P(sph(0.05, 8, 6), M(0xffffff, { e: 0x9fb0ff, ei: 2.2 }), this.wallX - s.dir * 0.12, this.h + y, this.z, dots).castShadow = false;
    this.dots = dots;
    this.spec.label = this.spec.label ?? `Ledge · <b>${this.H.toFixed(1)} m</b>`;
  }
  labelPos() { return V3(this.wallX - this.dir * 0.4, this.h + this.H + 0.9, this.z); }
  blockMsg() { return `The ledge is ${this.H.toFixed(1)} m high. Wren needs something to climb.`; }
  accept(t) {
    if (this.solved || !(t.has('climb') || t.has('bounce'))) return false;
    if (t.p.climbH + 0.01 < this.H) { this.game.toast(`The ${t.label} only reaches ${t.p.climbH.toFixed(1)} m. The ledge is ${this.H.toFixed(1)} m.`, 'bad'); Sfx.error(); return false; }
    const d = this.dir, z = this.z, base = this.h;
    t.snap = { target: this }; t.vy = 0; t.group.rotation.set(0, 0, 0);
    const style = t.def.style || (t.has('bounce') ? 'bounce' : 'lean');
    this.style = style;
    const natH = t.size.y;
    if (style === 'hang') { t.setVisual('ropeLine', { len: this.H + 0.5 }); t.pos.set(this.wallX - d * 0.15, base, z); }
    else if (style === 'stairs') { t.group.rotation.y = -d * Math.PI / 2; t.inner.scale.y *= (this.H / Math.max(0.5, natH)); t.pos.set(this.wallX - d * 1.75 * t.p.scale, base, z); }
    else if (style === 'grow') { t.inner.scale.y *= Math.max(1, (this.H + 0.6) / Math.max(0.5, natH)); t.pos.set(this.wallX - d * 0.55, base, z + 0.5); }
    else if (style === 'bounce') { t.pos.set(this.wallX - d * 1.3, base, z); }
    else { if (natH < this.H + 0.5) t.inner.scale.y *= (this.H + 0.5) / natH; t.pos.set(this.wallX - d * 0.62, base, z); t.group.rotation.z = -d * 0.16; t.group.rotation.y = Math.PI / 2; t.group.rotation.order = 'YXZ'; t.group.rotation.set(0, Math.PI / 2, 0); t.group.rotateX(d * 0.16); }
    this.climbX = style === 'bounce' ? this.wallX - d * 1.3 : this.wallX - d * 0.4;
    this.dots.visible = false;
    this.thing = t;
    FX.ink(t.pos.x, base + 0.2, z);
    this.solve(style === 'bounce' ? `Boing! The ${t.label} can launch Wren up the ledge.` : `Wren can climb up the ${t.label} now.`);
    return true;
  }
  release(t) { if (this.thing !== t) return; this.thing = null; this.dots.visible = true; this.unsolve(`The ${t.label} is gone. The ledge can’t be climbed now.`); }
};

// ---- gap to bridge
TT.gap = class extends Target {
  build() {
    const s = this.spec; this.ax = s.a[0]; this.az = s.a[1]; this.bx = s.b[0]; this.bz = s.b[1];
    this.W = hyp(this.ax, this.az, this.bx, this.bz); this.x = (this.ax + this.bx) / 2; this.z = (this.az + this.bz) / 2; this.r = s.r ?? Math.max(1.8, this.W / 2 + 0.6);
    this.h = s.h; this.labelY = 1.3;
    const n = Math.floor(this.W / 0.4), dots = new THREE.Group(); this.group.add(dots);
    for (let i = 1; i < n; i++) P(sph(0.05, 8, 6), M(0xffffff, { e: 0x9fb0ff, ei: 2.2 }), lerp(this.ax, this.bx, i / n), this.h + 0.05, lerp(this.az, this.bz, i / n), dots).castShadow = false;
    this.dots = dots;
    this.spec.label = this.spec.label ?? `Gap · <b>${this.W.toFixed(1)} m</b>`;
  }
  blockMsg() { return `The gap is ${this.W.toFixed(1)} m wide. Wren needs a bridge.`; }
  accept(t) {
    if (this.solved || !t.has('bridge')) return false;
    if (t.p.len + 0.01 < this.W + 0.4) { this.game.toast(`Too short: the ${t.label} spans ${t.p.len.toFixed(1)} m, but the gap is ${this.W.toFixed(1)} m.`, 'bad'); Sfx.error(); return false; }
    const ang = Math.atan2(this.bz - this.az, this.bx - this.ax);
    t.snap = { target: this }; t.vy = 0;
    const yaw = new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), -ang);
    if (t.def.bridgeB) { t.setVisual(t.def.bridgeB, { len: this.W + 1 }); t.group.quaternion.copy(yaw); t.pos.set(this.x, this.h, this.z); }
    else if (t.size.y > t.size.x && t.size.y > t.size.z) {
      const base = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(V3(0, 0, 1), V3(1, 0, 0), V3(0, 1, 0)));
      t.group.quaternion.copy(yaw).multiply(base);
      const L = t.size.y;
      t.pos.set(this.x - Math.cos(ang) * L / 2, this.h + 0.06, this.z - Math.sin(ang) * L / 2);
    } else { t.group.quaternion.copy(yaw); if (t.size.z > t.size.x) t.group.rotateY(Math.PI / 2); t.pos.set(this.x, this.h - 0.02, this.z); }
    this.dots.visible = false; this.thing = t;
    const pad = 0.7;
    this.surf = { x0: Math.min(this.ax, this.bx) - 0.1, x1: Math.max(this.ax, this.bx) + 0.1, z0: Math.min(this.az, this.bz) - pad, z1: Math.max(this.az, this.bz) + pad, h: this.h, bridge: true };
    this.game.world.extraSurfaces.push(this.surf);
    FX.ink(this.x, this.h, this.z);
    this.solve(`Wren can cross on the ${t.label} now.`);
    if (this.spec.lava && t.has('flammable')) { this.game.toast(`The heat from the lava is scorching the ${t.label}!`, 'bad'); this.lavaHeat = 0; }
    return true;
  }
  update(dt) {
    if (this.spec.lava && this.thing && this.thing.has('flammable') && !this.thing.burning) { this.lavaHeat = (this.lavaHeat || 0) + dt; if (this.lavaHeat > 1.4) { this.thing.ignite(); this.game.toast(`The ${this.thing.label} caught fire over the lava!`, 'bad'); } }
  }
  release(t) {
    if (this.thing !== t) return;
    this.thing = null; this.dots.visible = true;
    const w = this.game.world; w.extraSurfaces = w.extraSurfaces.filter((s) => s !== this.surf);
    this.unsolve(`The ${t.label} is gone. The gap is open again.`);
  }
};

// ---- burning house
TT.fire = class extends Target {
  build() {
    const s = this.spec; this.max = s.hp ?? 3; this.hp = this.max; this.r = s.r ?? 2.4; this.labelY = 4;
    const house = new THREE.Group(); house.position.set(this.x, this.h, this.z); house.rotation.y = s.rot ?? 0; house.scale.setScalar(s.scale ?? 1.3); this.group.add(house);
    B.house(house);
    house.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.house = house;
    this.spec.label = this.spec.label ?? `Burning cottage`;
    this.spec.warn = true;
  }
  blockMsg() { return 'The fire is too hot to pass.'; }
  flameSources() { return this.solved ? [] : [{ x: this.x, y: this.h, z: this.z, r: this.r + 0.6 }]; }
  accept(t) {
    if (this.solved) return false;
    if (t.has('water') || t.has('extinguish') || (t.has('cold') && t.p.water > 0)) {
      const amt = Math.max(0.5, t.p.water);
      this.hp -= amt; FX.steam(this.x, this.h + 2, this.z, 30); Sfx.hiss(); Sfx.splash();
      if (!t.has('creature')) t.remove('used'); else { t.pos.set(this.x + 2.6, t.pos.y, this.z + 1.6); }
      if (this.hp <= 0) this.solve(this.spec.solved ?? 'The fire is out!');
      else this.game.toast(`The fire hisses but keeps burning. It needs more water (about ${Math.ceil(this.hp * 2) / 2} more).`);
      this.game.updateLabels();
      return true;
    }
    if (t.has('flammable')) { t.ignite(); this.hp = Math.min(this.max + 1, this.hp + 0.5); this.game.toast(`The ${t.label} only fed the flames.`, 'bad'); return true; }
    return false;
  }
  update(dt) {
    if (this.solved) { if (Math.random() < 0.05) FX.smoke(this.x + rand(-1, 1), this.h + 3, this.z + rand(-1, 1), 0.8, 0x9a9aa6); return; }
    this.hp = Math.min(this.max, this.hp + dt * (this.spec.regen ?? 0.12));
    const k = this.hp / this.max;
    for (let i = 0; i < 3; i++) if (Math.random() < k) FX.fire(this.x + rand(-1.4, 1.4), this.h + rand(1.2, 3.4), this.z + rand(-1.2, 1.2), 1.4);
    if (Math.random() < 0.25 * k) FX.smoke(this.x + rand(-1, 1), this.h + 3.5, this.z + rand(-1, 1), 1.6);
    requestLight(this.x, this.h + 2.5, this.z + 1.5, 0xff7a2a, 40 * k + 5, 12, 2);
    if (this.labelEl) this.labelEl.el.innerHTML = `Burning cottage · <b>${Math.round(k * 100)}%</b>`;
  }
};

// ---- creature blocker (bear, troll, dragon, goat, shark)
TT.creature = class extends Target {
  build() {
    const s = this.spec; this.kind = s.kind; this.power = s.power; this.r = s.r ?? 2.2;
    const def = WORDS.get(s.kind);
    const props = makeProps(def, []);
    const { outer, inner } = buildThingMesh(def, props, null, s.v);
    outer.scale.setScalar(s.scale ?? 1);
    this.mesh = outer; this.parts = inner.userData; this.group.add(outer);
    outer.position.set(this.x, this.h, this.z); outer.rotation.y = s.face ?? -Math.PI / 2;
    this.home = V3(this.x, this.h, this.z); this.t = 0; this.state = 'block';
    this.labelY = (s.labelY ?? 2.8);
    this.spec.label = this.spec.label ?? s.kind;
    this.spec.warn = true;
  }
  labelPos() { return V3(this.mesh.position.x, this.mesh.position.y + this.labelY, this.mesh.position.z); }
  blockMsg() { return this.spec.block || `The ${this.kind} won’t let Wren pass.`; }
  flameSources() { return this.spec.burnR && this.state !== 'sleep' && this.state !== 'gone' ? [{ x: this.mesh.position.x, y: this.h, z: this.mesh.position.z, r: this.spec.burnR, dragon: true }] : []; }
  react(t) {
    const s = this.spec, name = this.kind;
    const isFood = t.has('food') || (t.has('creature') && t.has('prey'));
    if (isFood && s.diet) {
      const type = t.has('creature') ? 'meat' : t.p.food;
      if (!s.diet.includes(type) && !(s.diet.includes('plant') && t.has('plant'))) return { msg: `The ${name} sniffs the ${t.label} and turns away. ${s.dietHint || ''}`.trim(), keep: true };
      if (t.p.fv + 0.01 < (s.minFood ?? 0)) { t.remove('eaten'); Sfx.chomp(); return { msg: `The ${name} gulps the ${t.label} but is still hungry. It needs something bigger.` }; }
      t.remove('eaten'); Sfx.chomp();
      return { win: 'fed', msg: s.fedMsg || `The ${name} happily eats the ${t.label} and settles down.` };
    }
    if (t.has('money') && s.toll) {
      if (t.p.value + 0.01 < s.toll) { t.remove('taken'); return { msg: `The ${name} pockets the ${t.label}, but the toll is ${s.toll} gold. That was worth ${Math.round(t.p.value)}.`, bad: true }; }
      t.remove('taken'); return { win: 'paid', msg: `The ${name} bites the ${t.label}, grins, and steps aside.` };
    }
    if (t.p.music) {
      if (t.p.music === 'loud' && s.loud === 'anger') { t.remove('smashed'); return { msg: `The racket enrages the ${name}! It smashes the ${t.label}.`, hurt: true }; }
      if (t.p.music === 'soft' && s.sleepy) { return { win: 'sleep', msg: `The ${t.label} plays a lullaby. The ${name} yawns and falls asleep.`, keep: true }; }
      return { msg: `The ${name} doesn’t care for music.`, keep: true };
    }
    let pw = t.p.power;
    if (t.has('explosive')) { t.fuse = 0.01; return { msg: '', keep: true, silent: true }; }
    if (pw > 0 || (t.has('creature') && t.has('hostile'))) {
      if (s.fireproof && t.has('flame')) pw *= 0.25;
      if (s.coldWeak && t.has('cold')) pw *= 2;
      if (pw + 0.01 >= this.power) { if (!t.has('creature')) t.remove('used'); else t.remove('left'); return { win: 'beaten', msg: s.beatMsg || `The ${t.label} drives the ${name} away!` }; }
      if (t.has('creature')) t.remove('fled'); else t.remove('smashed');
      return { msg: `The ${name} swats the ${t.label} away (power ${pw.toFixed(1)} vs ${this.power}). It looks furious!`, hurt: s.retaliate !== false };
    }
    if (t.has('toy') && s.toyCalms) return { win: 'calm', msg: `The ${name} loves the ${t.label}!`, keep: true };
    return null;
  }
  accept(t) {
    if (this.solved || this.state !== 'block') return false;
    const res = this.react(t);
    if (!res) return false;
    if (res.msg) this.game.toast(res.msg, res.win ? 'good' : 'bad');
    if (res.hurt) { Sfx.roar(); this.lunge = 0.6; setTimeout(() => this.game.player.hurt(1, `The ${this.kind} charged at Wren!`, { pos: this.mesh.position }), 450); }
    if (res.win) this.win(res.win);
    else if (!res.hurt && !res.silent) Sfx.error();
    return true;
  }
  win(how) {
    this.how = how;
    if (how === 'beaten') { this.state = 'gone'; FX.dust(this.mesh.position.x, this.h, this.mesh.position.z, 20); Sfx.roar(); }
    else if (how === 'sleep' || (how === 'fed' && this.spec.sleepAfterFood)) this.state = 'sleep';
    else this.state = 'aside';
    this.solve();
  }
  update(dt) {
    this.t += dt;
    const m = this.mesh, p = this.parts, s = this.spec;
    if (p.wings) p.wings.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * (0.25 + Math.sin(this.t * (this.state === 'sleep' ? 0.5 : 2.4)) * (this.state === 'sleep' ? 0.02 : 0.25))));
    if (this.state === 'block') {
      m.scale.y = (s.scale ?? 1) * (1 + Math.sin(this.t * 2) * 0.015);
      if (p.head) p.head.rotation.y = Math.sin(this.t * 0.7) * 0.4;
      if (this.lunge > 0) { this.lunge -= dt; const k = Math.sin((1 - this.lunge / 0.6) * Math.PI); m.position.x = this.home.x + Math.sin(m.rotation.y) * k * 0.8; m.position.z = this.home.z + Math.cos(m.rotation.y) * k * 0.8; }
      if (s.breath && Math.random() < 0.012 && !this.breathing) this.breathing = 1.2;
      if (this.breathing > 0) {
        this.breathing -= dt; const mo = p.mouth ? m.localToWorld(p.mouth.clone().multiplyScalar(1 / (s.scale ?? 1))) : V3(m.position.x, this.h + 2, m.position.z);
        const dir = V3(Math.sin(m.rotation.y), -0.25, Math.cos(m.rotation.y));
        for (let i = 0; i < 3; i++) fxAdd.emit({ x: mo.x, y: mo.y, z: mo.z, vx: dir.x * rand(5, 8) + rand(-1, 1), vy: dir.y * 6 + rand(-0.5, 1), vz: dir.z * rand(5, 8) + rand(-1, 1), life: rand(0.4, 0.7), s: 0.7, s1: 0.15, c: 0xffe27a, c1: 0xff3a10, drag: 2 });
        requestLight(mo.x, mo.y, mo.z, 0xff7a2a, 30, 10, 2);
      }
      if (s.eater) this.eat(dt);
      if (s.roam) this.roam(dt);
    } else if (this.state === 'aside') {
      const tx = s.aside?.[0] ?? this.home.x, tz = s.aside?.[1] ?? this.home.z + 2.4;
      const dx = tx - m.position.x, dz = tz - m.position.z, d = Math.hypot(dx, dz);
      if (d > 0.05) { m.position.x += dx / d * Math.min(d, dt * 2); m.position.z += dz / d * Math.min(d, dt * 2); m.rotation.y = Math.atan2(dx, dz); this.animLegs(2); }
      else { m.rotation.y = lerpAngle(m.rotation.y, 0, dt * 3); this.animLegs(0); }
    } else if (this.state === 'sleep') {
      m.rotation.z = lerp(m.rotation.z, 0.08, dt); m.scale.y = (s.scale ?? 1) * (0.94 + Math.sin(this.t * 1.2) * 0.02);
      if (Math.random() < 0.02) fxNorm.emit({ x: m.position.x, y: m.position.y + this.labelY - 0.4, z: m.position.z, vx: 0.3, vy: 0.5, life: 2, s: 0.25, s1: 0.45, c: 0xffffff, a: 0.75 });
    } else if (this.state === 'gone') {
      m.position.y += dt * 2; m.scale.multiplyScalar(1 - dt * 1.5); m.rotation.y += dt * 6;
      if (m.scale.x < 0.05) { m.visible = false; this.state = 'vanished'; }
    }
  }
  animLegs(speed) { if (!this.parts.legs) return; const a = speed ? Math.sin(this.t * 8) * 0.5 : 0; this.parts.legs.forEach((l, i) => (l.rotation.x = i % 2 ? a : -a)); }
  roam(dt) {
    const s = this.spec, m = this.mesh, [x0, x1, z0, z1] = s.roam;
    this.rt = (this.rt ?? 0) - dt;
    if (this.rt <= 0 || !this.rtarget) { this.rt = rand(2, 4); this.rtarget = [rand(x0, x1), rand(z0, z1)]; }
    if (this.chewing) { this.animLegs(0); return; }
    const [tx, tz] = this.rfood || this.rtarget, dx = tx - m.position.x, dz = tz - m.position.z, d = Math.hypot(dx, dz);
    if (d > 0.2) { m.position.x = clamp(m.position.x + dx / d * dt * 1.6, x0 - 0.9, x1 + 0.9); m.position.z = clamp(m.position.z + dz / d * dt * 1.6, z0 - 0.9, z1 + 0.9); m.rotation.y = lerpAngle(m.rotation.y, Math.atan2(dx, dz), dt * 6); this.animLegs(1); } else this.animLegs(0);
  }
  eat(dt) {
    const s = this.spec, m = this.mesh, g = this.game;
    let best = null, bd = 5.5;
    for (const t of g.things) {
      if (!t.alive || t.equipped || t.dragging) continue;
      const edible = (t.has('food') && s.diet.includes(t.p.food)) || t.has('plant') || (t.has('wood') && !t.has('metal')) || t.has('cloth');
      if (!edible || t.has('creature')) continue;
      const tp = t.snap ? t.snapPoint?.() || t.pos : t.pos;
      const d = hyp(m.position.x, m.position.z, tp.x, tp.z);
      if (d < bd) { bd = d; best = t; }
    }
    this.rfood = best ? [best.pos.x, best.pos.z] : null;
    if (best && bd < 1.5) {
      this.chewing = (this.chewing || 0) + dt;
      if (Math.random() < 0.2) FX.burst(best.pos.x, best.pos.y + 0.5, best.pos.z, 0xd9b07a, 2, 1, 0.08);
      if (this.chewing > 1.4) {
        this.chewing = 0; Sfx.chomp();
        const wasDiet = best.has('food') && s.diet.includes(best.p.food);
        g.toast(`The ${this.kind} ate the ${best.label}!`, wasDiet ? '' : 'bad');
        best.remove('eaten');
        if (wasDiet && best.p.fv + 0.01 >= (s.minFood ?? 0)) { this.state = 'sleep'; this.solve(s.fedMsg || `The ${this.kind} is full and dozes off.`); }
      }
    } else this.chewing = 0;
  }
};

// ---- darkness
TT.dark = class extends Target {
  build() {
    const s = this.spec, [x0, x1, z0, z1] = s.area; this.area = s.area; this.labelY = 2.2;
    const hgt = 3.9, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, pal = this.game.world.pal;
    this.shroud = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, hgt, d + 0.4), new THREE.MeshBasicMaterial({ color: 0x020309, transparent: true, opacity: 0.97, depthWrite: false }));
    this.shroud.position.set(cx, this.h + hgt / 2 - 0.05, cz); this.shroud.renderOrder = 3;
    this.group.add(this.shroud);
    this.roofMats = [new THREE.MeshStandardMaterial({ color: pal.rock2, roughness: 0.92, flatShading: true, transparent: true }), new THREE.MeshStandardMaterial({ color: pal.rock, roughness: 0.92, flatShading: true, transparent: true })];
    this.roof = new THREE.Group(); this.group.add(this.roof);
    P(new RoundedBoxGeometry(w + 0.9, 0.8, d + 0.9, 2, 0.35), this.roofMats[0], cx, this.h + hgt + 0.3, cz, this.roof);
    const rr = rng(Math.round(x0 * 13 + z1 * 7) + 99);
    for (let i = 0; i < Math.round(w * d / 2.2); i++) P(dode(0.5 + rr() * 0.7), this.roofMats[i % 2], x0 + rr() * w, this.h + hgt + 0.6 + rr() * 0.3, z0 + rr() * d, this.roof, rr() * 3, rr() * 3, rr() * 3, [1, 0.55 + rr() * 0.3, 1]);
    for (let i = 0; i < 6; i++) { const m = P(octa(0.18 + rr() * 0.12), M(0xffffff, { e: pick(pal.flowers.length ? pal.flowers : [0x7af0ff], rr), ei: 2.2 }), x0 + rr() * w, this.h + hgt + 1.0, z0 + rr() * d, this.roof, 0.2, rr() * 3, 0.1, [1, 1.8, 1]); m.castShadow = false; }
    this.spec.label = this.spec.label ?? 'Pitch-dark cave';
    this.spec.warn = true;
    this.fade = 1;
  }
  blockMsg() { return 'It’s pitch dark in there. Wren won’t go in without a light.'; }
  update(dt) {
    if (this.solved) { if (this.fade > 0) { this.fade = Math.max(0, this.fade - dt * 0.6); this.shroud.material.opacity = 0.97 * this.fade; this.roofMats.forEach((m) => (m.opacity = this.fade)); this.roof.position.y += dt * 1.5; this.shroud.visible = this.roof.visible = this.fade > 0.01; } return; }
    const g = this.game, pl = g.player, [x0, x1, z0, z1] = this.area;
    const inArea = (p, m = 0) => p.x > x0 - m && p.x < x1 + m && p.z > z0 - m && p.z < z1 + m;
    if (pl.lightLevel() >= 3 && hyp(pl.pos.x, pl.pos.z, this.x, this.z) < this.r + 1) return this.solve('Light floods the cave!');
    for (const t of g.things) if (t.p.light >= 3 && !t.equipped && (this.near(t) || inArea(t.pos, 0.3))) return this.solve(`The ${t.label} lights up the cave!`);
    for (const t of g.things) if (t.burning && (this.near(t) || inArea(t.pos))) return this.solve('The flames light up the cave!');
  }
};

// ---- locked gate
TT.lock = class extends Target {
  build() {
    const s = this.spec; this.labelY = 3.2;
    const gate = new THREE.Group(); gate.position.set(this.x, this.h, this.z); gate.rotation.y = s.rot ?? 0; this.group.add(gate);
    const span = s.span ?? 4, m = M(0x3a3f48, { r: 0.35, m: 0.9 });
    const n = Math.round(span / 0.5);
    for (let i = 0; i <= n; i++) P(cyl(0.06, 0.06, 2.8, 8), m, 0, 1.4, -span / 2 + i * span / n, gate);
    for (const y of [0.4, 2.4]) P(box(0.16, 0.16, span + 0.2, 0.04), m, 0, y, 0, gate);
    for (const z of [-span / 2 - 0.25, span / 2 + 0.25]) P(box(0.5, 3.2, 0.5, 0.06), M(0x8a8478, { r: 0.9, flat: 1 }), 0, 1.6, z, gate);
    const lk = new THREE.Group(); lk.position.set(0.15, 1.4, 0); gate.add(lk);
    P(box(0.12, 0.42, 0.36, 0.06), M(C.gold, { r: 0.25, m: 1 }), 0, 0, 0, lk);
    P(tor(0.13, 0.03, Math.PI, 6, 12), M(0xc8d0da, { m: 1, r: 0.2 }), 0, 0.22, 0, lk, 0, Math.PI / 2);
    this.gate = gate;
    this.spec.label = this.spec.label ?? 'Locked gate';
  }
  blockMsg() { return this.spec.block || 'The gate is locked tight.'; }
  accept(t) {
    if (this.solved) return false;
    if (t.has('key')) { t.remove('used'); this.solve(`The ${t.label} turns with a clunk. The gate opens.`); return true; }
    if (t.has('explosive')) { t.fuse = 0.01; return true; }
    if (t.has('pry') || t.has('dig') || t.p.power > 0) { Sfx.error(); this.game.toast(`The ${t.label} bounces off the iron bars. This gate needs a key.`, 'bad'); return true; }
    return false;
  }
  blast() { if (!this.solved) this.solve('The blast tore the gate open!'); }
  update(dt) { if (this.solved && this.gate.position.y > this.h - 3.2) this.gate.position.y -= dt * 2; }
};

// ---- ice wall
TT.ice = class extends Target {
  build() {
    const s = this.spec, span = s.span ?? 5; this.labelY = 3.6;
    this.wall = new THREE.Group(); this.wall.position.set(this.x, this.h, this.z); this.group.add(this.wall);
    const mat = glass(0xbfe8ff, { r: 0.18, e: 0x3a7aa8, ei: 0.25 });
    for (let i = 0; i < 6; i++) P(box(0.9 + rand(0, 0.4), 3 + rand(-0.4, 0.5), span / 6 + 0.2, 0.15), mat, rand(-0.1, 0.1), 1.5, -span / 2 + (i + 0.5) * span / 6, this.wall, 0, rand(-0.1, 0.1), rand(-0.05, 0.05));
    for (let i = 0; i < 5; i++) P(cone(0.25, 0.9, 5), mat, rand(-0.3, 0.3), 3.1, rand(-span / 2, span / 2), this.wall);
    this.melt = 0;
    this.spec.label = this.spec.label ?? 'Wall of ice';
  }
  blockMsg() { return 'A thick wall of ice blocks the way.'; }
  accept(t) {
    if (this.solved) return false;
    if (t.has('hot') || t.has('flame') || t.burning) { this.heating = t; this.game.toast(`The ${t.label} starts melting the ice…`); return false; }
    if (t.p.dig >= 3) { this.shatter(`The ${t.label} smashes through the ice!`); return true; }
    if (t.has('cold') || t.has('water')) { t.remove('frozen'); this.game.toast('That just made the ice thicker.', 'bad'); Sfx.error(); return true; }
    if (t.p.power > 0 || t.p.dig > 0) { this.game.toast(`The ${t.label} only chips the ice. Something hot would melt it${t.p.dig ? ', or a dig 3+ tool could smash it' : ''}.`, 'bad'); Sfx.error(); return true; }
    return false;
  }
  shatter(msg) { FX.burst(this.x, this.h + 1.5, this.z, 0xcff0ff, 50, 5, 0.25); Sfx.noise(0.6, 0.4, 3000, 0.7); this.wall.visible = false; this.solve(msg); }
  update(dt) {
    if (this.solved) { if (this.wall.visible) { this.wall.scale.y = Math.max(0.01, this.wall.scale.y - dt * 0.8); if (this.wall.scale.y <= 0.02) this.wall.visible = false; } return; }
    let heat = 0;
    for (const t of this.game.things) if ((t.has('hot') || t.has('flame') || t.burning) && this.near(t, 0.6)) heat += t.has('flame') || t.burning ? 1.4 * t.p.scale : 1 * t.p.scale;
    const pl = this.game.player;
    if (pl.hasTag('hot') && hyp(pl.pos.x, pl.pos.z, this.x, this.z) < this.r + 0.5) heat += 0.8;
    if (heat > 0) {
      this.melt += dt * heat * 0.35;
      if (Math.random() < 0.5) FX.steam(this.x + rand(-0.4, 0.4), this.h + rand(0.5, 2.5), this.z + rand(-2, 2), 1);
      if (Math.random() < 0.3) fxNorm.emit({ x: this.x + rand(-0.5, 0.5), y: this.h + rand(1, 3), z: this.z + rand(-2, 2), vy: -2, life: 0.6, s: 0.08, c: 0x9fd8ff, a: 0.8, g: -6 });
      this.wall.scale.y = Math.max(0.05, 1 - this.melt * 0.8);
      if (this.labelEl) this.labelEl.el.innerHTML = `Wall of ice · <b>melting ${Math.round(clamp(this.melt, 0, 1) * 100)}%</b>`;
      if (this.melt >= 1) { FX.splash(this.x, this.h + 0.3, this.z, 30); this.solve('The ice wall melted away!'); }
    }
  }
};

// ---- boulder
TT.boulder = class extends Target {
  build() {
    const s = this.spec; this.labelY = 3.2;
    this.rock = new THREE.Group(); this.rock.position.set(this.x, this.h, this.z); this.group.add(this.rock);
    const m = M(0x8f877c, { r: 0.9, flat: 1 });
    P(dode(1.4), m, 0, 1.25, 0, this.rock, 0.3, 0.6, 0.2, [1.1, 0.9, 1.3]);
    P(dode(0.8), m, 0.3, 0.6, 1.3, this.rock, 1, 0.2, 0.4); P(dode(0.7), m, -0.2, 0.5, -1.4, this.rock, 0.4, 1.3, 0.2);
    this.spec.label = this.spec.label ?? 'Boulder';
  }
  blockMsg() { return 'A huge boulder blocks the path.'; }
  accept(t) {
    if (this.solved) return false;
    if (t.p.dig >= 2) { this.crumble(`The ${t.label} breaks the boulder apart!`); if (!t.has('vehicle')) t.remove('used'); return true; }
    if (t.has('explosive')) { t.fuse = 0.01; return true; }
    if (t.has('creature') && t.p.power >= 6 && t.p.mass >= 6) { this.crumble(`The ${t.label} shoves the boulder off the isle!`); return true; }
    if (t.p.dig > 0 || t.p.power > 0) { this.game.toast(`The ${t.label} barely scratches it. You need a digging tool of dig 2 or more.`, 'bad'); Sfx.error(); return true; }
    return false;
  }
  blast() { if (!this.solved) this.crumble('The blast shattered the boulder!'); }
  crumble(msg) {
    for (let i = 0; i < 40; i++) fxNorm.emit({ x: this.x + rand(-1, 1), y: this.h + rand(0.5, 2), z: this.z + rand(-1, 1), vx: rand(-4, 4), vy: rand(2, 6), vz: rand(-4, 4), life: rand(0.6, 1.2), s: rand(0.2, 0.4), s1: 0.1, c: 0x8f877c, a: 1, g: -16 });
    FX.dust(this.x, this.h, this.z, 24, 0xb8ab98); Sfx.noise(0.6, 0.5, 300, 0.7); this.game.shake(0.3);
    this.rock.visible = false; this.solve(msg);
  }
};

// ---- pressure plate + portcullis
TT.plate = class extends Target {
  build() {
    const s = this.spec; this.need = s.mass; this.r = s.r ?? 1.0; this.labelY = 1.2;
    this.plate = P(cyl(0.85, 0.95, 0.16, 24), M(0x8a8478, { r: 0.8, flat: 1 }), this.x, this.h + 0.04, this.z, this.group);
    this.rune = P(tor(0.6, 0.04, TAU, 6, 40), M(0xffffff, { e: 0x6a8aff, ei: 2 }), this.x, this.h + 0.14, this.z, this.group, Math.PI / 2);
    if (s.gate) {
      const g = new THREE.Group(); g.position.set(s.gate.x, this.h, s.gate.z ?? 0); this.group.add(g);
      const span = s.gate.span ?? 4, m = M(0x5a544a, { r: 0.6, m: 0.5 });
      for (let i = 0; i <= 8; i++) P(box(0.12, 3, 0.12, 0.03), m, 0, 1.5, -span / 2 + i * span / 8, g);
      for (const y of [0.6, 1.6, 2.6]) P(box(0.14, 0.12, span, 0.03), m, 0, y, 0, g);
      for (const z of [-span / 2 - 0.35, span / 2 + 0.35]) P(box(0.7, 3.8, 0.6, 0.08), M(0x9a9286, { r: 0.9, flat: 1 }), 0, 1.9, z, g);
      this.gate = g;
    }
    this.spec.label = this.spec.label ?? `Pressure plate · needs weight <b>${this.need}</b>`;
  }
  blockMsg() { return 'The portcullis is shut. Something heavy must hold the pressure plate down.'; }
  accept(t) {
    if (t.has('creature') && !t.has('heavy')) return false;
    t.pos.x = this.x; t.pos.z = this.z;
    if (t.p.mass + this.load() + 0.01 < this.need) this.game.toast(`The plate doesn’t budge. It needs weight ${this.need}; the ${t.label} weighs ${t.p.mass.toFixed(1)}.`, 'bad');
    return true;
  }
  load() { let m = 0; for (const t of this.game.things) if (!t.equipped && !t.dragging && hyp(t.pos.x, t.pos.z, this.x, this.z) < this.r + 0.1 && Math.abs(t.pos.y - this.h) < 0.6) m += t.p.mass; return m; }
  update(dt) {
    const m = this.load(), on = m + 0.01 >= this.need;
    this.plate.position.y = lerp(this.plate.position.y, this.h + (on ? -0.04 : 0.04), 0.2);
    this.rune.material = M(0xffffff, { e: on ? 0x5fd6a0 : 0x6a8aff, ei: 2 });
    if (on && !this.solved) this.solve('Clunk! The portcullis rises.');
    if (!on && this.solved) this.unsolve('The plate clicks up and the portcullis slams shut!');
    if (this.gate) this.gate.position.y = lerp(this.gate.position.y, this.h + (this.solved ? 3.2 : 0), dt * 2.5);
  }
};

// ---- sunken Lumen in a lake (with an optional shark)
TT.lake = class extends Target {
  build() {
    const s = this.spec; this.r = s.r; this.labelY = 1.6;
    this.lake = this.game.world.addLake(this.x, this.z, this.r, this.h);
    const cage = new THREE.Group(); cage.position.set(this.x + (s.cageOff ?? 0), this.h + 0.02, this.z); this.group.add(cage);
    const m = M(0x5a606a, { r: 0.4, m: 0.9 });
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; P(cyl(0.025, 0.025, 0.5, 6), m, Math.cos(a) * 0.35, 0.25, Math.sin(a) * 0.35, cage); }
    P(cyl(0.4, 0.4, 0.05, 16), m, 0, 0.5, 0, cage); P(cyl(0.4, 0.4, 0.05, 16), m, 0, 0.02, 0, cage);
    this.glow = P(sph(0.16, 14, 10), M(0xffffff, { e: 0xffd27a, ei: 5 }), 0, 0.26, 0, cage); this.cage = cage;
    if (s.shark) {
      this.shark = new THREE.Group(); this.group.add(this.shark);
      P(cone(0.28, 0.6, 4), M(0x6a7a8a, { r: 0.4 }), 0, 0.3, 0, this.shark, 0, Math.PI / 4, 0, [0.25, 1, 1.2]);
      this.sharkState = 'circle';
    }
    this.t = 0; this.pull = s.pull ?? 3;
    this.spec.label = this.spec.label ?? `Lumen in an iron cage · <b>3 m down</b>`;
  }
  sharkActive() { return this.shark && this.sharkState === 'circle'; }
  accept(t) {
    if (this.solved) return false;
    const s = this.spec;
    if (this.sharkActive()) {
      if ((t.has('food') && (t.p.food === 'meat' || t.p.food === 'fish')) || (t.has('creature') && t.has('prey'))) { t.remove('eaten'); this.sharkState = 'full'; this.game.toast(`The shark snaps up the ${t.label} and swims off, full.`, 'good'); Sfx.splash(); return true; }
      if (t.p.power > 0 && !t.has('dive') && !t.has('reach')) {
        if (t.p.power + 0.01 >= (s.sharkPower ?? 4)) { t.remove('used'); this.sharkState = 'gone'; this.game.toast(`The ${t.label} chases the shark away!`, 'good'); return true; }
        t.remove('lost'); this.game.toast(`The shark isn’t scared of the ${t.label} (power ${t.p.power.toFixed(1)} vs 4). It sinks out of reach.`, 'bad'); return true;
      }
    }
    if (t.p.drain > 0) {
      this.drained = (this.drained || 0) + t.p.drain; t.remove('used');
      this.lake.mesh.scale.setScalar(Math.max(0.2, 1 - this.drained / 2 * 0.8));
      if (this.drained + 0.01 >= 2) { this.lake.mesh.visible = false; if (this.shark) this.sharkState = 'stranded'; this.retrieve('The lake drains away and the cage is left high and dry!'); }
      else this.game.toast(`The ${t.label} soaks up some water, but there’s plenty left (drain ${this.drained.toFixed(1)} of 2).`);
      return true;
    }
    if (t.has('magnet')) { if (s.metalCage !== false) { this.retrieve(`The ${t.label} drags the iron cage out of the lake!`); return true; } }
    if (t.p.reach > 0) {
      if (t.p.reach + 0.01 >= this.pull) { this.retrieve(`The ${t.label} hauls the cage out of the water!`); return true; }
      this.game.toast(`The line snaps: the iron cage is too heavy for the ${t.label} (pull ${t.p.reach.toFixed(1)}, needs ${this.pull}).`, 'bad'); Sfx.error(); t.remove('broke'); return true;
    }
    if (t.has('dive')) return this.dive(t);
    return false;
  }
  dive(t) {
    const armoured = t && (t.has('vehicle') || t.has('armor')) || (!t && (this.game.player.hasTag('armor') || this.game.player.ride?.has('vehicle')));
    if (this.sharkActive() && !armoured) {
      Sfx.splash(); FX.splash(this.x, this.h + 0.4, this.z, 30);
      if (t) { t.remove('eaten'); this.game.toast(`The shark lunges at the ${t.label}! It flees the water.`, 'bad'); }
      else this.game.player.hurt(1, 'The shark lunged at Wren!');
      return true;
    }
    this.retrieve(t ? `The ${t.label} dives down and brings up the cage!` : 'Wren dives down and grabs the cage!');
    return true;
  }
  retrieve(msg) {
    if (this.solved) return;
    this.cage.visible = false; FX.splash(this.x, this.h + 0.4, this.z, 40); Sfx.splash();
    this.solve(msg);
    this.game.lumen.activate(this.spec.shore);
  }
  update(dt) {
    this.t += dt;
    if (this.shark) {
      const st = this.sharkState;
      if (st === 'circle') { const a = this.t * 0.9; this.shark.position.set(this.x + Math.cos(a) * this.r * 0.6, this.h + 0.2 + Math.sin(this.t * 3) * 0.04, this.z + Math.sin(a) * this.r * 0.6); this.shark.rotation.y = -a; }
      else if (st === 'stranded') { this.shark.position.y = this.h + 0.05; this.shark.rotation.z = Math.sin(this.t * 8) * 0.3; }
      else this.shark.position.y = lerp(this.shark.position.y, this.h - 1, dt);
    }
    if (!this.solved) this.glow.material.emissiveIntensity = 4 + Math.sin(this.t * 3) * 1.5;
  }
};

// ---- rule: powder magazine (no fire or explosives nearby)
TT.powder = class extends Target {
  build() {
    const s = this.spec; this.r = s.r ?? 4; this.labelY = 2.2;
    for (let i = 0; i < 5; i++) {
      const g = new THREE.Group(); g.position.set(this.x + Math.cos(i * 1.3) * 0.9 * (i % 3), this.h + (i === 4 ? 0.95 : 0), this.z + Math.sin(i * 1.3) * 0.7 * (i % 3)); this.group.add(g);
      B.barrel(g); g.traverse((o) => { if (o.isMesh && o.material.userData.main) o.material = M(0xc8402e, { r: 0.7 }); });
    }
    const ring = new THREE.Mesh(new THREE.RingGeometry(this.r - 0.06, this.r, 72), new THREE.MeshBasicMaterial({ color: 0xff5a40, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(this.x, this.h + 0.03, this.z); this.group.add(ring); this.ring = ring;
    this.spec.label = this.spec.label ?? `Gunpowder · <b>no fire within ${this.r} m</b>`;
    this.spec.warn = true; this.solved = true; this.danger = 0;
  }
  update(dt) {
    let hot = false;
    const g = this.game, pl = g.player;
    for (const t of g.things) if ((t.has('flame') || t.has('explosive') && t.fuse > 0 || t.burning) && hyp(t.pos.x, t.pos.z, this.x, this.z) < this.r) hot = true;
    if ((pl.hasTag('flame')) && hyp(pl.pos.x, pl.pos.z, this.x, this.z) < this.r) hot = true;
    this.ring.material.opacity = hot ? 0.6 + Math.sin(performance.now() / 60) * 0.4 : 0.55;
    if (hot) { this.danger += dt; if (Math.random() < 0.3) FX.sparkle(this.x, this.h + 1, this.z, 0xff6a3a, 1); } else this.danger = Math.max(0, this.danger - dt);
    if (this.danger > 1.0 && !g.won && !g.failed) {
      FX.explode(this.x, this.h, this.z); FX.explode(this.x + 1, this.h + 1, this.z); Sfx.boom(); g.shake(1);
      this.group.visible = false;
      g.fail('The gunpowder caught a spark and the mill went up in smoke.');
    }
  }
};

// ---- villager or other decorative character that cheers when a goal is met
TT.npc = class extends Target {
  build() {
    const s = this.spec, def = WORDS.get(s.kind || 'person');
    const { outer, inner } = buildThingMesh(def, makeProps(def, []), null, s.v || def.v);
    outer.position.set(this.x, this.h, this.z); outer.rotation.y = s.face ?? 0; this.group.add(outer);
    this.mesh = outer; this.parts = inner.userData; this.t = 0; this.solved = true; this.labelY = 2.4;
  }
  update(dt) {
    this.t += dt;
    const happy = this.spec.cheerOn && this.game.targets[this.spec.cheerOn]?.solved;
    const arms = this.parts.arms;
    if (arms) arms.forEach((a, i) => { a.rotation.z = happy ? (i ? -1 : 1) * (2.4 + Math.sin(this.t * 8) * 0.3) : (this.spec.worried ? (i ? -1 : 1) * (0.4 + Math.sin(this.t * 10) * 0.2) : 0); });
    this.mesh.position.y = this.h + (happy ? Math.abs(Math.sin(this.t * 6)) * 0.25 : 0);
  }
};
