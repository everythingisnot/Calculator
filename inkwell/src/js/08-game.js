// ======================================================================
// Game: state, rules, input, HUD and screens.
// ======================================================================
const SAVE_KEY = 'inkwell.save.v1';
const save = Object.assign({ unlocked: 1, stars: {}, found: [] }, store.get(SAVE_KEY, {}));
const persist = () => store.set(SAVE_KEY, save);
const ui = {
  hud: $('#hud'), goals: $('#goals'), name: $('#lvl-name'), eyebrow: $('#lvl-eyebrow'), hearts: $('#hearts'), inkNum: $('#ink-num'), inkFill: $('#ink-fill'), inkPar: $('#ink-par'), inkParText: $('#ink-par-text'),
  toasts: $('#toasts'), input: $('#word'), form: $('#quill'), preview: $('#preview'), recent: $('#recent'), card: $('#card'), rule: $('#rule-banner'), vignette: $('#vignette'),
};
const HEART_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#ff6b57" d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.5h2c.8-1.3 2.3-2.5 4.4-2.5 3.6 0 5.7 3.7 4.2 7.2C19.5 16.4 12 21 12 21z"/><path fill="#ffffff" opacity=".35" d="M7 7.2c-1.6.3-2.6 1.8-2.3 3.4.1.4.6.5.8.1.5-1.1 1.3-1.9 2.2-2.3.5-.2.3-1.3-.7-1.2z"/></svg>';

class Game {
  constructor(level, opts = {}) {
    this.level = level; this.showcase = !!opts.showcase;
    this.world = new World(level);
    for (const s of level.surfaces || []) this.world.extraSurfaces.push({ ...s });
    for (const l of level.lava || []) this.world.addLava(l.x0, l.x1, l.z0, l.z1, l.y);
    if (level.decorLake) this.world.addLake(level.decorLake.x, level.decorLake.z, level.decorLake.r, 0);
    this.nav = new Nav(this, level);
    this.things = []; this.targets = {}; this.targetList = [];
    this.player = new Player(this, level.start[0], level.start[1]);
    const excl = [[level.start[0], level.start[1], 1.8]];
    if (level.lumen) excl.push([level.lumen.x, level.lumen.z, 1.8]);
    for (const l of level.links || []) { excl.push([l.pa[0], l.pa[1], 1.6], [l.pb[0], l.pb[1], 1.6]); for (let u = 0; u <= 1; u += 0.1) excl.push([lerp(l.pa[0], l.pb[0], u), lerp(l.pa[1], l.pb[1], u), 1.2]); }
    for (const spec of level.targets || []) {
      const t = new TT[spec.type](this, { ...spec });
      this.targets[spec.id] = t; this.targetList.push(t);
      excl.push([t.x, t.z, Math.max(1.6, t.r)]);
    }
    for (const pr of level.props || []) excl.push(...buildProp(this.world, pr));
    for (let x = level.start[0]; x < (level.lumen?.x ?? level.start[0]); x += 0.8) excl.push([x, level.start[1] * (1 - (x - level.start[0]) / 20), 1.0]);
    this.world.noDecor = (level.targets || []).filter((t) => t.type === 'dark').map((t) => t.area);
    this.world.decorate(excl);
    this.lumen = level.lumen ? new Lumen(this.world, level.lumen.x, level.lumen.z, level.lumen) : null;
    this.inkUsed = 0; this.inkMax = level.ink; this.written = []; this.won = false; this.failed = false; this.time = 0; this.hintIx = 0;
    this.fireAcc = 0; this.shakeAmt = 0; this.toastSeen = new Map();
    this.dropRing = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }));
    this.dropRing.rotation.x = -Math.PI / 2; this.dropRing.visible = false; this.dropRing.renderOrder = 6; this.world.group.add(this.dropRing);
    this.marker = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.34, 32), new THREE.MeshBasicMaterial({ color: 0xffe6a0, transparent: true, opacity: 0, depthWrite: false }));
    this.marker.rotation.x = -Math.PI / 2; this.world.group.add(this.marker);
    for (const w of level.things || []) { const r = parse(w.w); if (r.def) this.spawn(r, w.x, w.z, true); }
    if (level.ambient === 'snow') this.snow = true;
    if (level.ambient === 'fireflies') this.fireflies = true;
    const c = level.cam;
    const asp = camera.aspect || 1;
    this.camTarget = V3(...c.target); this.camDist = c.dist * (asp < 1 ? 1 + (1 - asp) * 1.1 : 1);
    controls.target.copy(this.camTarget);
    const intro = opts.showcase ? 1 : 1.25;
    this.camOffset = V3(-2, this.camDist * 0.62, this.camDist * 0.8).normalize().multiplyScalar(this.camDist);
    camera.position.copy(this.camTarget).addScaledVector(this.camOffset, intro);
    controls.minDistance = 7;
    controls.maxDistance = this.camDist * (opts.showcase ? 1.6 : 1.3);
    this.intro = opts.showcase ? 0 : 1.6;
  }
  dispose() { this.world.dispose(); Labels.clear(); fxAdd.clear(); fxNorm.clear(); closeCard(); }

  // ---------------------------------------------------------------- writing
  inkLeft() { return this.inkMax - this.inkUsed; }
  write(text) {
    if (this.won || this.failed) return;
    const r = parse(text);
    if (r.error) { this.toast(r.error, 'bad'); Sfx.error(); return false; }
    if (r.cost > this.inkLeft()) { this.toast(`Not enough ink. “${r.label}” costs ${r.cost} and you have ${this.inkLeft()} left. Retry the isle for a full inkwell.`, 'bad'); Sfx.error(); return false; }
    this.inkUsed += r.cost;
    const t = this.spawn(r);
    this.written.push(r.label);
    if (!save.found.includes(r.def.name)) { save.found.push(r.def.name); persist(); }
    Sfx.write();
    updateRecent(r.label);
    this.updateHUD();
    if (t.burning) this.toast(`The ${t.label} is burning itself up!`, 'bad');
    this.focusOn(t);
    const tag = Labels.add(`New: <b>${esc(t.label)}</b>`, () => V3(t.pos.x, t.pos.y + Math.max(1.2, t.height * t.p.scale) + 0.5, t.pos.z), 'new');
    setTimeout(() => Labels.remove(tag), 3500);
    if (COARSE) setTimeout(() => { if (t.alive && !t.dragging && !t.equipped && game === this && !down) openCard(t); }, 700);
    return true;
  }
  spawn(r, x, z, free = false) {
    const props = makeProps(r.def, r.adjs || []);
    const t = new Thing(this, r.def, props, r.label || r.def.name);
    t.group.userData.thing = t;
    if (x == null) {
      const pl = this.player, zn = this.nav.zoneAt(pl.pos.x, pl.pos.y, pl.pos.z) || this.nav.nearestZone(pl.pos.x, pl.pos.y, pl.pos.z);
      const base = Math.atan2(camera.position.x - pl.pos.x, camera.position.z - pl.pos.z);
      let best = null;
      for (let i = 0; i < 14 && !best; i++) {
        const a = base + (i % 2 ? 1 : -1) * (0.7 + Math.floor(i / 2) * 0.45), d = 1.6 + t.radius * 0.6;
        const px = pl.pos.x + Math.sin(a) * d, pz = pl.pos.z + Math.cos(a) * d;
        const s = this.world.surfaceAt(px, pz);
        if (s && Math.abs(s.h - pl.pos.y) < 0.4 && !this.world.lakeAt(px, pz) && (!zn || this.nav.zoneAt(px, s.h, pz) === zn) && !this.things.some((o) => o !== t && hyp(o.pos.x, o.pos.z, px, pz) < 0.9)) best = [px, pz];
      }
      [x, z] = best || [pl.pos.x + 1.2, pl.pos.z + 0.6];
    }
    const s = this.world.surfaceAt(x, z);
    t.pos.set(x, (s ? s.h : 0) + (free ? 0 : 2.4), z);
    t.group.rotation.y = rand(-0.4, 0.4) + (t.has('creature') ? Math.PI : 0);
    this.things.push(t);
    if (!free) { FX.ink(x, s ? s.h : 0, z); t.mesh.scale.setScalar(0.01); t.popIn = 0; }
    return t;
  }
  onThingRemoved(t) { if (cardThing === t) closeCard(); }
  focusOn(t, sec = 2.5) { this.focus = { t, time: sec }; }
  recenter() { this.recenterT = 1.2; }
  useOn(t, tg) {
    if (!t.alive) return;
    if (t.snap) { const old = t.snap.target; t.snap = null; old.release?.(t); t.group.quaternion.identity(); }
    t.pos.y = tg.h + 1;
    FX.ink(tg.x, tg.h, tg.z);
    this.dropThing(t, tg.x, tg.z);
    this.focusOn(t, 2);
  }
  onEquip(t) {
    Sfx.pop();
    let msg = `Wren equips the ${t.label}.`;
    if (t.has('fly')) msg = this.level.rules?.noFly ? `Wren has the ${t.label}, but: ${this.level.rules.noFly}` : `Wren can fly with the ${t.label}! Tap anywhere to fly there.`;
    else if (t.p.light >= 3) msg = `Wren holds up the ${t.label}. It lights the way.`;
    else if (t.has('dive')) msg = `Wren can dive with the ${t.label}. Tap the water to dive in.`;
    else if (t.has('armor')) msg = `The ${t.label} will block the next hit${t.p.armor >= 2 ? 's' : ''}.`;
    this.toast(msg, t.has('fly') && this.level.rules?.noFly ? 'bad' : '');
  }
  dropThing(t, x, z) {
    const pl = this.player;
    if (hyp(x, z, pl.pos.x, pl.pos.z) < 0.9 + Math.min(t.radius, 1) * 0.3) {
      if (t.has('heal') || t.p.heal) {
        if (pl.heal(Math.max(1, Math.round(t.p.heal || 1)))) { this.toast(`The ${t.label} restores Wren’s hearts.`, 'good'); if (!t.has('creature')) t.remove('used'); else t.pos.x += 1.5; return; }
        this.toast('Wren already has all three hearts.');
      } else if (t.p.equip) { if (pl.equip(t)) return; }
    }
    let best = null, bd = 1e9;
    for (const tg of this.targetList) { const d = hyp(x, z, tg.x, tg.z); if (d < tg.r + 0.3 && d < bd) { bd = d; best = tg; } }
    t.pos.x = x; t.pos.z = z;
    if (best && best.accept(t)) { this.updateHUD(); return; }
    t.vy = 0;
  }
  // ---------------------------------------------------------------- movement
  moveTo(x, z, h) {
    if (this.won || this.failed || this.player.dead) return;
    const lakeT = this.targetList.find((t) => t.type === 'lake' && !t.solved && hyp(x, z, t.x, t.z) < t.r);
    const pl = this.player;
    if (lakeT) {
      const a = Math.atan2(pl.pos.x - lakeT.x, pl.pos.z - lakeT.z), sx = lakeT.x + Math.sin(a) * (lakeT.r + 0.5), sz = lakeT.z + Math.cos(a) * (lakeT.r + 0.5);
      const res = this.nav.plan(pl, sx, sz, this.nav.zoneAt(sx, h, sz) || this.nav.nearestZone(sx, h, sz));
      pl.path = res.path;
      if (pl.hasTag('dive')) { const last = pl.path[pl.path.length - 1]; if (last) last.done = () => { FX.splash(lakeT.x, lakeT.h + 0.3, lakeT.z); lakeT.dive(null); }; }
      else this.toast('Wren can’t swim that deep. Something has to dive, drain, pull or grab the cage.');
      return;
    }
    const zone = this.nav.zoneAt(x, h, z);
    if (!zone) return;
    const res = this.nav.plan(pl, x, z, zone);
    pl.path = res.path;
    if (res.reason) { this.toast(res.reason); Sfx.error(); }
    const last = pl.path[pl.path.length - 1];
    if (last) { this.marker.position.set(last.x, last.y + 0.04, last.z); this.marker.material.opacity = 1; this.marker.scale.setScalar(1); }
  }
  blockedFor(thing, nx, nz) {
    const za = this.nav.zoneAt(thing.pos.x, thing.pos.y, thing.pos.z), zb = this.nav.zoneAt(nx, thing.pos.y, nz);
    if (!zb) return true;
    if (!za || za === zb) return false;
    const l = this.nav.links.find((k) => (k.a === za.id && k.b === zb.id) || (k.b === za.id && k.a === zb.id));
    return !l || !this.nav.open(l) || l.kind !== 'walk';
  }
  // ---------------------------------------------------------------- progress
  onSolved(t) {
    if (t.spec.reward?.lumen && this.lumen) this.lumen.activate(t.spec.reward.lumen);
    this.updateHUD();
  }
  onUnsolved() { this.updateHUD(); }
  win() {
    if (this.won || this.failed || this.level.sandbox) return;
    this.won = true;
    const lv = this.level, inkOk = this.inkUsed <= lv.par, noHurt = this.player.hurtCount === 0;
    const stars = 1 + (inkOk ? 1 : 0) + (noHurt ? 1 : 0);
    const prev = save.stars[lv.id] || 0;
    save.stars[lv.id] = Math.max(prev, stars);
    save.unlocked = Math.max(save.unlocked, lv.id + 1);
    persist();
    Sfx.win();
    this.lumen.label.hidden = true;
    this.celebrate = 1.8;
    this.player.path = [];
    setTimeout(() => showResult(true, { stars, inkOk, noHurt, ink: this.inkUsed, par: lv.par, words: this.written, best: save.stars[lv.id] }), 1900);
  }
  fail(msg) {
    if (this.won || this.failed) return;
    if (this.level.sandbox) { const pl = this.player; pl.dead = false; pl.hearts = pl.maxHearts; pl.iframes = 3; this.updateHUD(); this.toast('Wren shakes it off. In the sandbox, hearts refill.', 'gold'); return; }
    this.failed = true;
    Sfx.error();
    setTimeout(() => showResult(false, { msg }), 1300);
  }
  // ---------------------------------------------------------------- hazards
  explode(t) {
    const x = t.pos.x, y = t.pos.y, z = t.pos.z, R = 3.0 * Math.sqrt(t.p.scale);
    t.remove('exploded');
    FX.explode(x, y, z); Sfx.boom(); this.shake(0.8);
    this.flash = { x, y: y + 1, z, t: 0.35 };
    let lost = 0;
    for (const o of [...this.things]) {
      const d = hyp(x, z, o.pos.x, o.pos.z);
      if (d < R && Math.abs(o.pos.y - y) < 3) {
        if (o.has('explosive') && o.fuse <= 0) { o.fuse = 0.25; continue; }
        if (o.has('metal') || o.has('stone')) { o.vy = 7; o.pos.x += (o.pos.x - x) / (d + 0.1) * 0.8; o.pos.z += (o.pos.z - z) / (d + 0.1) * 0.8; if (o.snap) o.snap.target.release?.(o); o.snap = null; }
        else { o.remove('blown'); lost++; }
      } else if (d < R + 1.2 && o.has('flammable')) o.ignite();
    }
    if (lost) this.toast(`The blast destroyed ${lost === 1 ? 'something nearby' : lost + ' things nearby'}.`, 'bad');
    for (const tg of this.targetList) {
      const d = hyp(x, z, tg.x, tg.z);
      if (tg.type === 'powder' && d < tg.r + 0.5 && !this.failed) { FX.explode(tg.x, tg.h, tg.z); tg.group.visible = false; this.fail('The blast set off the gunpowder. The mill went up in smoke.'); return; }
      if (d > R + 1.2) continue;
      if (tg.blast) tg.blast();
      if (tg.type === 'ice' && !tg.solved) tg.shatter('The blast shattered the ice!');
      if (tg.type === 'creature' && tg.state === 'block') {
        const pw = 7 * Math.sqrt(t.p.scale) * (t.p.power / 7);
        if (pw >= tg.power) { this.toast(`The blast sent the ${tg.kind} running!`, 'good'); tg.win('beaten'); }
        else { this.toast(`The blast only annoyed the ${tg.kind} (power ${pw.toFixed(1)} vs ${tg.power}).`, 'bad'); Sfx.roar(); }
      }
    }
    const dp = hyp(x, z, this.player.pos.x, this.player.pos.z);
    if (dp < R && Math.abs(this.player.pos.y - y) < 3) this.player.hurt(dp < 1.6 ? 2 : 1, 'Wren was caught in the blast!', { pos: V3(x, y, z) });
  }
  fireTick() {
    const srcs = [], pl = this.player;
    for (const t of this.things) {
      if (!t.alive || !(t.has('flame') || t.burning)) continue;
      const p = t.equipped ? pl.pos : t.pos;
      srcs.push({ x: p.x, y: p.y, z: p.z, r: t.burning ? 1.3 * Math.sqrt(t.p.scale) : t.p.flameR * (t.equipped ? 0.55 : 1), self: t, held: !!t.equipped });
    }
    for (const tg of this.targetList) if (tg.flameSources) srcs.push(...tg.flameSources());
    const near = (o, s, extra = 0) => hyp(o.pos.x, o.pos.z, s.x, s.z) < s.r + o.radius * 0.4 * o.p.scale + extra && Math.abs(o.pos.y - s.y) < 2.6;
    for (const t of this.things) {
      if (!t.alive || t.equipped || t.dragging) continue;
      const hot = srcs.some((s) => s.self !== t && near(t, s));
      if (t.has('flammable') && !t.burning) {
        if (hot) { t.heat += 0.22; if (t.heat >= 1 && t.ignite()) this.toast(`The ${t.label} caught fire!`, 'bad'); }
        else t.heat = Math.max(0, t.heat - 0.1);
      }
      if (t.has('explosive') && t.fuse <= 0 && (hot || t.has('flame'))) { t.fuse = 1.8; this.toast(`The ${t.label}’s fuse is lit! Get back!`, 'bad'); }
      if (t.has('ice') && !t.has('flame')) {
        const heat = srcs.some((s) => s.self !== t && near(t, s, 0.3)) || this.things.some((o) => o !== t && o.has('hot') && !o.equipped && hyp(o.pos.x, o.pos.z, t.pos.x, t.pos.z) < 1.3);
        if (heat) { t.melt = (t.melt || 0) + 0.2; t.mesh.scale.y = Math.max(0.2, 1 - t.melt * 0.4) * t.p.scale; if (t.melt > 2) { FX.steam(t.pos.x, t.pos.y + 0.4, t.pos.z, 12); this.toast(`The ${t.label} melted.`); t.remove('melted'); continue; } }
      }
      if ((t.has('water') || t.has('extinguish')) && !t.has('creature')) {
        let any = false;
        for (const o of this.things) if (o !== t && o.burning && hyp(o.pos.x, o.pos.z, t.pos.x, t.pos.z) < 1.4 + o.radius * 0.5) { o.extinguish(); any = true; }
        if (any) { this.toast(`The ${t.label} put out the flames.`, 'good'); Sfx.hiss(); if (!t.has('fly')) t.remove('used'); }
      }
    }
    if (!pl.dead && !this.won) {
      for (const s of srcs) { if (s.held || s.dragon) continue; const d = hyp(pl.pos.x, pl.pos.z, s.x, s.z); if (d < 0.6 + Math.min(s.r, 3) * 0.35 && Math.abs(pl.pos.y - s.y) < 2) { pl.hurt(1, 'Ouch! Too close to the flames.'); break; } }
      for (const tg of this.targetList) if (tg.type === 'fire' && !tg.solved && hyp(pl.pos.x, pl.pos.z, tg.x, tg.z) < tg.r - 0.4) pl.hurt(1, 'Ouch! Wren got too close to the burning cottage.');
    }
  }
  // ---------------------------------------------------------------- loop
  update(dt, T) {
    this.time += dt;
    this.world.update(T, dt);
    for (const t of [...this.things]) {
      if (t.popIn != null) { t.popIn += dt * 3.2; const k = t.popIn >= 1 ? 1 : 1 + Math.sin(t.popIn * Math.PI) * 0.25 * (1 - t.popIn) + (t.popIn - 1) * (1 - t.popIn) * -1; t.mesh.scale.setScalar(t.p.scale * clamp(t.popIn < 1 ? smooth(t.popIn) * 1.15 : 1, 0.01, 1.2)); if (t.popIn >= 1) { t.mesh.scale.setScalar(t.p.scale); t.popIn = null; } }
      if (!t.equipped) t.update(dt);
    }
    if (!this.showcase) this.player.update(dt);
    else this.player.update(dt * 0.6);
    for (const t of this.targetList) t.update(dt);
    if (this.lumen) this.lumen.update(T, dt);
    this.fireAcc += dt;
    if (this.fireAcc > 0.2 && !this.showcase) { this.fireAcc = 0; this.fireTick(); }
    if (this.flash && this.flash.t > 0) { this.flash.t -= dt; requestLight(this.flash.x, this.flash.y, this.flash.z, 0xffd27a, 220 * this.flash.t, 18, 5); }
    if (this.marker.material.opacity > 0) { this.marker.material.opacity -= dt * 1.5; this.marker.scale.multiplyScalar(1 + dt * 0.8); }
    if (this.snow) for (let i = 0; i < 2; i++) fxNorm.emit({ x: camera.position.x + rand(-25, 25), y: rand(4, 12), z: rand(-10, 12), vx: rand(2, 4), vy: -1.6, vz: rand(-0.3, 0.3), life: 5, s: 0.09, c: 0xffffff, a: 0.9, fadeIn: 0.5 });
    if (this.fireflies && Math.random() < 0.25) fxAdd.emit({ x: rand(-10, 2), y: rand(0.4, 2.6), z: rand(-4, 4), vx: rand(-0.3, 0.3), vy: rand(-0.1, 0.2), vz: rand(-0.3, 0.3), life: rand(2, 4), s: 0.14, s1: 0.06, c: 0xd8ff7a, a: 1, fadeIn: 0.8 });
    // win check
    const pl = this.player;
    if (this.lumen && this.lumen.active && !this.lumen.hidden && !this.won && !this.failed && !this.showcase && hyp(pl.pos.x, pl.pos.z, this.lumen.x, this.lumen.z) < 1.15 && Math.abs(pl.pos.y - this.lumen.h) < 1.5) this.win();
    if (this.celebrate > 0) {
      this.celebrate -= dt;
      const g = this.lumen.gem, tgt = V3(pl.pos.x, pl.pos.y + 1.6, pl.pos.z);
      this.lumen.group.worldToLocal(tgt); g.position.lerp(tgt, 0.06); g.scale.multiplyScalar(0.985);
      if (Math.random() < 0.6) FX.burst(pl.pos.x, pl.pos.y + 1.2, pl.pos.z, pick([0xffd27a, 0x9aa8ff, 0xffffff]), 3, 3, 0.18);
      pl.body.rotation.y += dt * 8;
    }
    // camera
    if (this.intro > 0) { this.intro -= dt; }
    if (!this.showcase) {
      let focus = V3(pl.pos.x, pl.pos.y + 0.8, pl.pos.z);
      if (this.focus && this.focus.time > 0) { this.focus.time -= dt; if (this.focus.t.alive && !this.focus.t.equipped) focus.lerp(V3(this.focus.t.pos.x, this.focus.t.pos.y + 0.5, this.focus.t.pos.z), 0.6); }
      const dz = camera.position.distanceTo(controls.target);
      const k = 0.35 + 0.6 * clamp(1 - (dz - 9) / Math.max(1, this.camDist - 9), 0, 1);
      if (cardThing && window.innerWidth < 700) focus.lerp(V3(cardThing.pos.x, cardThing.pos.y, cardThing.pos.z), 0.7);
      const want = this.camTarget.clone().lerp(focus, k);
      if (!ui.card.hidden && window.innerWidth < 700) want.y -= dz * 0.17;
      controls.target.lerp(want, 1 - Math.exp(-dt * 2.5));
      if (this.recenterT > 0) { this.recenterT -= dt; camera.position.lerp(controls.target.clone().add(this.camOffset), 1 - Math.exp(-dt * 4)); }
      const pts = [V3(pl.pos.x, pl.pos.y + 0.7, pl.pos.z)];
      for (const t of this.things) if (!t.equipped && (t.dragging || (this.focus && this.focus.t === t && this.focus.time > 0) || cardThing === t)) pts.push(V3(t.pos.x, t.pos.y + 0.5, t.pos.z));
      this.world.fadeBlockers(pts, dt);
      const d = camera.position.distanceTo(controls.target);
      if (this.intro > 0 && d > this.camDist) { const dir = camera.position.clone().sub(controls.target).normalize(); camera.position.copy(controls.target).addScaledVector(dir, lerp(d, this.camDist, 1 - Math.exp(-dt * 2.5))); }
    }
  }
  // ---------------------------------------------------------------- feedback
  toast(msg, cls = '') {
    if (this.showcase || !msg) return;
    const now = performance.now(), last = this.toastSeen.get(msg);
    if (last && now - last < 2500) return;
    this.toastSeen.set(msg, now);
    const el = document.createElement('div'); el.className = 'toast ' + cls; el.textContent = msg;
    ui.toasts.prepend(el);
    while (ui.toasts.children.length > 4) ui.toasts.lastChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 450); }, 4200 + msg.length * 25);
  }
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); }
  flashHurt() { ui.vignette.style.opacity = 1; setTimeout(() => (ui.vignette.style.opacity = 0), 260); }
  updateLabels() {}
  updateHUD() {
    if (this.showcase) return;
    const lv = this.level, pl = this.player;
    ui.hearts.innerHTML = Array.from({ length: pl.maxHearts }, (_, i) => HEART_SVG.replace('<svg', `<svg class="${i < pl.hearts ? '' : 'lost'}"`)).join('');
    if (lv.sandbox) { ui.inkNum.textContent = `${this.inkUsed} used · unlimited`; ui.inkFill.style.width = '100%'; ui.inkPar.style.display = 'none'; ui.inkParText.textContent = 'Sandbox: no limits, no stars.'; }
    else {
      ui.inkNum.textContent = `${this.inkUsed} / ${this.inkMax}`;
      ui.inkFill.style.width = `${Math.min(100, this.inkUsed / this.inkMax * 100)}%`;
      ui.inkFill.classList.toggle('over', this.inkUsed > lv.par);
      ui.inkPar.style.display = ''; ui.inkPar.style.left = `calc(${lv.par / this.inkMax * 100}% - 1px)`;
      ui.inkParText.innerHTML = this.inkUsed <= lv.par ? `Par <b>${lv.par}</b> · ${lv.par - this.inkUsed} ink under par` : `Par <b>${lv.par}</b> · ${this.inkUsed - lv.par} over par`;
    }
    const goals = this.targetList.filter((t) => t.goal).map((t) => ({ text: t.goal, done: t.solved }));
    if (this.lumen) goals.push({ text: 'Reach the Lumen', done: this.won, final: true });
    let cur = goals.findIndex((g) => !g.done);
    ui.goals.innerHTML = goals.map((g, i) => `<li class="${g.done ? 'done' : ''} ${g.final ? 'final' : ''} ${i === cur ? 'current' : ''}"><i></i><span>${esc(g.text)}</span></li>`).join('') || '<li class="current"><i></i><span>Write anything and experiment</span></li>';
    $('#goal-toggle').hidden = goals.length < 2;
  }
}

// ======================================================================
// Input
// ======================================================================
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let game = null, down = null, cardThing = null;
const COARSE = window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : false;
function setRay(e, dy = 0) { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY + dy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); }
function nearestThingOnScreen(e, px) {
  const r = canvas.getBoundingClientRect(), v = new THREE.Vector3();
  let best = null, bd = px;
  for (const t of game.things) {
    if (t.equipped || t.fixed || !t.alive) continue;
    v.set(t.pos.x, t.pos.y + Math.min(1.2, t.height * t.p.scale * 0.5), t.pos.z).project(camera);
    if (v.z > 1) continue;
    const d = Math.hypot((v.x + 1) / 2 * r.width + r.left - e.clientX, (1 - v.y) / 2 * r.height + r.top - e.clientY);
    if (d < bd) { bd = d; best = t; }
  }
  return best;
}
function screenOpen() { return [...document.querySelectorAll('.screen')].some((s) => !s.hidden); }
function hitThing() {
  const groups = game.things.filter((t) => !t.equipped && !t.fixed).map((t) => t.group);
  const hits = ray.intersectObjects(groups, true);
  for (const h of hits) { let o = h.object; while (o && !o.userData.thing) o = o.parent; if (o) return o.userData.thing; }
  return null;
}
function hitPlayer() { return ray.intersectObject(game.player.group, true).length > 0; }
function hitGround() {
  const hits = ray.intersectObjects(game.world.walkMeshes, false);
  if (hits.length) return { p: hits[0].point, h: hits[0].object.userData.walk.h };
  for (const s of game.world.extraSurfaces) { const pl = new THREE.Plane(V3(0, 1, 0), -s.h), p = new THREE.Vector3(); if (ray.ray.intersectPlane(pl, p) && p.x >= s.x0 && p.x <= s.x1 && p.z >= s.z0 && p.z <= s.z1) return { p, h: s.h }; }
  return null;
}
canvas.addEventListener('pointerdown', (e) => {
  Sfx.init();
  if (!game || game.showcase || screenOpen() || game.won || game.failed) return;
  if (document.activeElement === ui.input && e.pointerType !== 'mouse') ui.input.blur();
  setRay(e);
  const t = hitThing() || (e.pointerType !== 'mouse' && !hitPlayer() ? nearestThingOnScreen(e, 34) : null);
  down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, touch: e.pointerType !== 'mouse' };
  if (t) { down.thing = t; controls.enabled = false; canvas.setPointerCapture(e.pointerId); }
  else if (hitPlayer()) { down.player = true; }
}, { capture: true });
canvas.addEventListener('pointermove', (e) => {
  if (!down || !game || e.pointerId !== down.id) return;
  const t = down.thing;
  if (!t) return;
  if (!down.dragging && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) {
    down.dragging = true; t.dragging = true; closeCard();
    if (t.snap) { const tg = t.snap.target; t.snap = null; if (tg.release) tg.release(t); t.group.rotation.set(0, t.group.rotation.y, 0); t.group.quaternion.setFromEuler(new THREE.Euler(0, 0, 0)); }
    const s = game.world.surfaceAt(t.pos.x, t.pos.z); down.planeH = s ? s.h : t.pos.y;
    t.sleeping = false;
  }
  if (!down.dragging) return;
  setRay(e, down.touch ? -70 : 0);
  let p = null, h = down.planeH;
  const gh = hitGround();
  if (gh) { p = gh.p; h = gh.h; down.planeH = h; } else { const v = new THREE.Vector3(); if (ray.ray.intersectPlane(new THREE.Plane(V3(0, 1, 0), -h), v)) p = v; }
  if (!p) return;
  t.pos.x = lerp(t.pos.x, p.x, 0.6); t.pos.z = lerp(t.pos.z, p.z, 0.6); t.pos.y = lerp(t.pos.y, h + 0.9, 0.4);
  t.group.rotation.z = Math.sin(performance.now() / 200) * 0.06;
  let tg = null, bd = 1e9;
  for (const x of game.targetList) { const d = hyp(p.x, p.z, x.x, x.z); if (d < x.r + 0.3 && d < bd && x.type !== 'npc' && x.type !== 'powder') { bd = d; tg = x; } }
  const nearWren = hyp(p.x, p.z, game.player.pos.x, game.player.pos.z) < 1.1 && (t.p.equip || t.has('heal'));
  const ring = game.dropRing; ring.visible = true;
  if (nearWren) { ring.position.set(game.player.pos.x, game.player.pos.y + 0.05, game.player.pos.z); ring.scale.setScalar(0.9); ring.material.color.set(0x7fe0b0); }
  else if (tg) { ring.position.set(tg.x, tg.h + 0.06, tg.z); ring.scale.setScalar(Math.min(tg.r, 2.6)); ring.material.color.set(0xffc65a); }
  else { ring.position.set(p.x, h + 0.04, p.z); ring.scale.setScalar(0.6); ring.material.color.set(0xffffff); }
});
function endPointer(e) {
  if (!down || !game || (e.pointerId !== down.id)) return;
  const d = down; down = null;
  controls.enabled = true;
  game.dropRing.visible = false;
  if (d.thing) {
    const t = d.thing;
    try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
    if (d.dragging) { t.dragging = false; t.group.rotation.z = 0; if (t.alive) game.dropThing(t, t.pos.x, t.pos.z); }
    else openCard(t, e.clientX, e.clientY);
    return;
  }
  if (e.type === 'pointercancel') return;
  const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y), dur = performance.now() - d.t;
  if (moved > 8 || dur > 600) return;
  if (d.player) { openPlayerCard(e.clientX, e.clientY); return; }
  setRay(e);
  if (game.lumen && game.lumen.active && ray.intersectObject(game.lumen.group, true).length) { game.moveTo(game.lumen.x, game.lumen.z, game.lumen.h); return; }
  const g = hitGround();
  if (g) game.moveTo(g.p.x, g.p.z, g.h);
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

// ---------------------------------------------------------------- object card
const STAT_ROWS = [
  ['climbH', 'Reach', (v) => v.toFixed(1) + ' m'], ['len', 'Span', (v) => v.toFixed(1) + ' m'], ['mass', 'Weight', (v) => v.toFixed(1)], ['power', 'Power', (v) => v.toFixed(1)],
  ['dig', 'Dig', (v) => v.toFixed(1)], ['water', 'Water', (v) => v.toFixed(1)], ['light', 'Light', (v) => v.toFixed(0)], ['fv', 'Food value', (v) => v.toFixed(1)],
  ['value', 'Gold value', (v) => v.toFixed(0)], ['reach', 'Pull', (v) => v.toFixed(1)], ['drain', 'Drain', (v) => v.toFixed(1)], ['armor', 'Armour', (v) => v.toFixed(0)],
];
const TAG_CHIPS = [
  ['flammable', 'Burns', 't-fire'], ['fireproof', 'Fireproof', ''], ['flame', 'On fire', 't-fire'], ['hot', 'Hot', 't-fire'], ['cold', 'Cold', 't-water'], ['ice', 'Melts', 't-water'], ['water', 'Wet', 't-water'],
  ['fly', 'Flies', 't-fly'], ['dive', 'Dives', 't-water'], ['metal', 'Metal', ''], ['wood', 'Wood', ''], ['stone', 'Stone', ''], ['cloth', 'Cloth', ''], ['plant', 'Plant', ''],
  ['hostile', 'Hostile', 't-danger'], ['friendly', 'Friendly', ''], ['explosive', 'Explosive', 't-danger'], ['loud', 'Loud', ''], ['magnet', 'Magnetic', ''], ['key', 'Opens locks', 't-gold'], ['heal', 'Heals', ''], ['money', 'Treasure', 't-gold'], ['sleepy', 'Sleepy', ''],
];
function thingStatsHTML(p, tags, def) {
  const rows = STAT_ROWS.filter(([k]) => p[k] > 0.001 && !(k === 'mass' && false)).map(([k, n, f]) => `<div><span>${n}</span><b>${f(p[k])}</b></div>`);
  if (p.food) rows.push(`<div><span>Food</span><b>${p.food}</b></div>`);
  if (p.music) rows.push(`<div><span>Music</span><b>${p.music}</b></div>`);
  const chips = TAG_CHIPS.filter(([t]) => tags.has(t)).map(([, n, c]) => `<span class="chip ${c}">${n}</span>`);
  if (p.equip) chips.push(`<span class="chip">Equip: ${p.equip === 'ride' ? 'ride' : p.equip}</span>`);
  return { rows: rows.join(''), chips: chips.join('') };
}
function placeCard(x, y) {
  const c = ui.card, w = c.offsetWidth, h = c.offsetHeight;
  const mobile = window.innerWidth < 700;
  document.body.classList.toggle('card-open', mobile);
  if (mobile) { c.style.left = `max(16px, env(safe-area-inset-left, 0px))`; c.style.top = 'auto'; c.style.bottom = `calc(100px + env(safe-area-inset-bottom, 0px))`; return; }
  c.style.bottom = 'auto';
  c.style.left = clamp(x + 16, 16, window.innerWidth - w - 16) + 'px';
  c.style.top = clamp(y - h / 2, 80, window.innerHeight - h - 150) + 'px';
}
function openCard(t, x, y) {
  cardThing = t;
  const uses = game.targetList.filter((tg) => !['npc', 'powder'].includes(tg.type) && (!tg.solved || tg.type === 'plate') && !(t.snap && t.snap.target === tg) && tg.labelEl)
    .map((tg) => ({ tg, name: tg.labelEl.el.textContent.replace(/\s+/g, ' ').trim() }));
  const { rows, chips } = thingStatsHTML(t.p, t.tags, t.def);
  const status = t.burning ? '<span class="chip t-fire">Burning</span>' : t.sleeping ? '<span class="chip">Asleep</span>' : '';
  ui.card.innerHTML = `<button class="x" id="card-x" type="button" aria-label="Close">×</button><div><div class="eyebrow">${esc(t.def.cat)}</div><h3>${esc(t.label)}</h3></div>
    ${rows ? `<div class="stats">${rows}</div>` : ''}<div class="tags">${chips}${status}</div>
    ${uses.length ? `<div class="uses"><div class="eyebrow">Use it on</div>${uses.map((u, i) => `<button type="button" class="use" data-i="${i}">${esc(u.name)}</button>`).join('')}</div>` : ''}
    <div class="acts">${t.p.equip ? '<button id="card-equip" type="button" class="primary">Give to Wren</button>' : ''}${t.has('heal') && !t.p.equip ? '<button id="card-heal" type="button" class="primary">Use on Wren</button>' : ''}<button id="card-erase" type="button">Erase</button></div>
    <div class="eyebrow" style="text-transform:none;letter-spacing:0">Tap a target above, or drag the object onto it. Erasing gives no ink back.</div>`;
  if (x == null) { const v = V3(t.pos.x, t.pos.y + 1, t.pos.z).project(camera); x = (v.x + 1) / 2 * window.innerWidth; y = (1 - v.y) / 2 * window.innerHeight; }
  ui.card.hidden = false; placeCard(x, y);
  ui.card.querySelectorAll('.use').forEach((b) => (b.onclick = () => { const u = uses[+b.dataset.i]; closeCard(); game.useOn(t, u.tg); }));
  const hb = $('#card-heal'); if (hb) hb.onclick = () => { closeCard(); game.dropThing(t, game.player.pos.x, game.player.pos.z); };
  $('#card-x').onclick = closeCard;
  $('#card-erase').onclick = () => { FX.ink(t.pos.x, t.pos.y, t.pos.z); t.remove('erased'); closeCard(); };
  const eq = $('#card-equip'); if (eq) eq.onclick = () => { game.player.equip(t); closeCard(); };
}
function openPlayerCard(x, y) {
  cardThing = null;
  const pl = game.player, slots = [['hand', pl.hand], ['back', pl.back], ['ride', pl.ride]];
  ui.card.innerHTML = `<button class="x" id="card-x" type="button" aria-label="Close">×</button><div><div class="eyebrow">Ink sprite</div><h3>Wren</h3></div>
    <div class="stats"><div><span>Hearts</span><b>${pl.hearts} / ${pl.maxHearts}</b></div><div><span>Armour</span><b>${pl.armorHP}</b></div></div>
    <div class="stats" style="grid-template-columns:1fr">${slots.map(([s, t]) => `<div><span>${s === 'hand' ? 'Holding' : s === 'back' ? 'On back' : 'Riding'}</span><b>${t ? esc(t.label) : '—'}</b></div>`).join('')}</div>
    <div class="acts">${slots.filter(([, t]) => t).map(([s, t]) => `<button type="button" data-slot="${s}">Drop ${esc(t.label)}</button>`).join('') || '<span class="eyebrow" style="text-transform:none;letter-spacing:0">Drop gear like wings, a torch or a shield onto Wren to equip it.</span>'}</div>`;
  ui.card.hidden = false; placeCard(x, y);
  $('#card-x').onclick = closeCard;
  ui.card.querySelectorAll('[data-slot]').forEach((b) => (b.onclick = () => { const t = pl[b.dataset.slot]; if (t) pl.unequip(t); closeCard(); }));
}
function closeCard() { ui.card.hidden = true; cardThing = null; document.body.classList.remove('card-open'); }

// ---------------------------------------------------------------- quill bar
ui.form.addEventListener('submit', (e) => {
  e.preventDefault(); Sfx.init();
  if (!game || game.showcase) return;
  if (game.write(ui.input.value)) { ui.input.value = ''; renderPreview(); }
});
function renderPreview() {
  const v = ui.input.value.trim();
  if (!v) { ui.preview.innerHTML = ''; return; }
  const r = parse(v);
  if (r.error) { ui.preview.innerHTML = r.unknown ? `<span>${esc(r.error)}</span>` : ''; return; }
  const p = makeProps(r.def, r.adjs);
  const left = game ? game.inkLeft() : 0;
  const bits = STAT_ROWS.filter(([k]) => ['climbH', 'len', 'power', 'water', 'dig', 'mass'].includes(k) && p[k] > 0.001).slice(0, 3).map(([k, n, f]) => `<span class="chip">${n} ${f(p[k])}</span>`).join('');
  ui.preview.innerHTML = `<span class="chip ${r.cost > left ? 't-danger' : 't-gold'}">${esc(r.label)} · ${r.cost} ink</span>${bits}`;
}
ui.input.addEventListener('input', renderPreview);
ui.input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { ui.input.blur(); closeCard(); } });
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeCard();
  if (game && !game.showcase && !screenOpen() && document.activeElement !== ui.input && /^[a-z]$/i.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) ui.input.focus();
});
const recentWords = [];
function updateRecent(label) {
  const i = recentWords.indexOf(label); if (i >= 0) recentWords.splice(i, 1);
  recentWords.unshift(label); recentWords.length = Math.min(recentWords.length, 5);
  ui.recent.innerHTML = recentWords.map((w) => `<button type="button" class="chip" data-w="${esc(w)}">${esc(w)}</button>`).join('');
  ui.recent.querySelectorAll('button').forEach((b) => (b.onclick = () => { ui.input.value = b.dataset.w; renderPreview(); ui.input.focus(); }));
}

// ======================================================================
// Screens
// ======================================================================
const screens = { title: $('#screen-title'), map: $('#screen-map'), brief: $('#screen-brief'), result: $('#screen-result'), lex: $('#screen-lex'), how: $('#screen-how') };
function show(name) { for (const k in screens) screens[k].hidden = k !== name; }
function hideAll() { for (const k in screens) screens[k].hidden = true; }
function loadLevel(level, opts = {}) {
  if (game) game.dispose();
  game = new Game(level, opts);
  controls.autoRotate = !!opts.showcase; controls.autoRotateSpeed = 0.35;
  ui.hud.hidden = !!opts.showcase;
  closeCard(); ui.toasts.innerHTML = '';
  if (!opts.showcase) {
    ui.eyebrow.textContent = level.sandbox ? 'Sandbox' : `Isle ${level.id} of ${LEVELS.length}`;
    ui.name.textContent = level.name;
    ui.rule.hidden = !level.rules?.noFly; ui.rule.textContent = level.rules?.noFly || '';
    recentWords.length = 0; ui.recent.innerHTML = ''; ui.input.value = ''; ui.preview.innerHTML = '';
    game.updateHUD();
    setTimeout(() => game && game.level === level && game.toast(level.sandbox ? 'Unlimited ink. Write anything!' : (COARSE ? 'Write a word below, then tap a target in the card that pops up, or drag the object there.' : 'Write a word below, then drag what appears onto the glowing spots, or tap it to pick a target.'), 'gold'), 600);
  }
}
function showTitle() { loadLevel(LEVELS[0], { showcase: true }); show('title'); }
function showMap() {
  if (!game || !game.showcase) loadLevel(LEVELS[(save.unlocked - 1) % LEVELS.length] || LEVELS[0], { showcase: true });
  const total = Object.values(save.stars).reduce((a, b) => a + b, 0);
  $('#map-progress').textContent = `${total} of ${LEVELS.length * 3} stars · ${save.found.length} of ${DEFS.length} words found`;
  $('#isles').innerHTML = LEVELS.map((l) => {
    const locked = l.id > save.unlocked, st = save.stars[l.id] || 0, pal = BIOMES[l.biome];
    const sw = `background: radial-gradient(circle, #${new THREE.Color(pal.sun).getHexString()}, #${new THREE.Color(pal.top).getHexString()})`;
    return `<button class="isle" type="button" data-id="${l.id}" ${locked ? 'disabled' : ''}><span class="sw" style="${sw}"></span><span class="num">Isle ${l.id}${locked ? ' · locked' : ''}</span><span class="nm">${esc(l.name)}</span><span class="stars" aria-label="${st} of 3 stars">${'★'.repeat(st)}<s>${'★'.repeat(3 - st)}</s></span></button>`;
  }).join('') + `<button class="isle sandbox" type="button" data-id="0"><span class="num">Sandbox</span><span class="nm">Free Write</span><span class="stars" style="color:var(--muted);letter-spacing:0;font-size:13px">Unlimited ink</span></button>`;
  $('#isles').querySelectorAll('.isle').forEach((b) => (b.onclick = () => showBrief(+b.dataset.id)));
  show('map');
}
function levelById(id) { return id === 0 ? SANDBOX : LEVELS.find((l) => l.id === id); }
function showBrief(id) {
  const l = levelById(id);
  const rules = [];
  if (l.rules?.noFly) rules.push(`<li><b>No flying.</b> ${esc(l.rules.noFly)}</li>`);
  if (l.targets?.some((t) => t.type === 'powder')) rules.push('<li><b>Gunpowder.</b> Any flame or explosive inside the red ring sets it off, and the isle is lost.</li>');
  if (l.targets?.some((t) => t.lava)) rules.push('<li><b>Lava.</b> Wooden things catch fire above it.</li>');
  if (l.targets?.some((t) => t.eater)) rules.push('<li><b>Hungry goat.</b> It eats wood, plants and cloth, even ladders you’re using.</li>');
  const st = save.stars[l.id] || 0;
  $('#brief').innerHTML = `<div class="sheet-head"><div><div class="eyebrow">${l.sandbox ? 'Sandbox' : `Isle ${l.id}`}${st ? ` · best ${'★'.repeat(st)}` : ''}</div><h2>${esc(l.name)}</h2></div><button type="button" id="brief-back">Back</button></div>
    <p class="brief-story">${esc(l.story)}</p>
    ${l.sandbox ? '' : `<div class="brief-stats"><div class="stat"><div class="v">${l.ink}</div><div class="k">Ink in the well</div></div><div class="stat"><div class="v">${l.par}</div><div class="k">Par for ★★</div></div><div class="stat"><div class="v">3</div><div class="k">Hearts</div></div></div>`}
    ${rules.length ? `<ul class="rules">${rules.join('')}</ul>` : ''}
    <div class="row"><button class="big primary" type="button" id="brief-go">${l.sandbox ? 'Open the sandbox' : 'Start'}</button></div>`;
  $('#brief-back').onclick = showMap;
  $('#brief-go').onclick = () => { Sfx.init(); hideAll(); loadLevel(l); };
  show('brief');
}
function showResult(won, d) {
  const l = game.level, next = LEVELS.find((x) => x.id === l.id + 1);
  if (won) {
    $('#result').innerHTML = `<div class="sheet-head"><div><div class="eyebrow">Isle ${l.id} complete</div><h2>${esc(l.name)}</h2></div></div>
      <div class="star-row">${[1, 2, 3].map((i) => `<span class="${i <= d.stars ? 'on' : ''}" style="animation-delay:${i * 0.18}s">★</span>`).join('')}</div>
      <div class="star-key"><div class="ok">★ Reached the Lumen</div><div class="${d.inkOk ? 'ok' : ''}">★ ${d.inkOk ? 'At or under' : 'Over'} par: ${d.ink} ink used, par ${d.par}</div><div class="${d.noHurt ? 'ok' : ''}">★ ${d.noHurt ? 'No hearts lost' : 'Lost a heart along the way'}</div></div>
      ${d.words.length ? `<div><div class="eyebrow" style="margin-bottom:6px">Your words</div><div class="lex-words">${d.words.map((w) => `<span class="chip">${esc(w)}</span>`).join('')}</div></div>` : ''}
      <div class="row">${next ? '<button class="big primary" type="button" id="res-next">Next isle</button>' : '<button class="big primary" type="button" id="res-map">All isles complete</button>'}<button type="button" id="res-retry">Replay</button><button type="button" id="res-isles">Isles</button></div>`;
    const n = $('#res-next'); if (n) n.onclick = () => showBrief(next.id);
    const m = $('#res-map'); if (m) m.onclick = showMap;
  } else {
    $('#result').innerHTML = `<div class="sheet-head"><div><div class="eyebrow">Isle ${l.id}</div><h2>The ink ran dry</h2></div></div>
      <p class="brief-story">${esc(d.msg || 'Wren needs a rest.')}</p>
      <div class="row"><button class="big primary" type="button" id="res-retry">Try again</button><button type="button" id="res-isles">Isles</button></div>`;
  }
  $('#res-retry').onclick = () => { hideAll(); loadLevel(l); };
  $('#res-isles').onclick = showMap;
  show('result');
}
function showLexicon() {
  const cats = [...new Set(DEFS.map((d) => d.cat))];
  $('#lex').innerHTML = `<div class="sheet-head"><div><div class="eyebrow">${save.found.length} of ${DEFS.length} words found</div><h2>Lexicon</h2></div><button type="button" id="lex-close">Close</button></div>
    <p class="brief-story" style="font-size:14px">Every word you write is recorded here. Undiscovered words show their first letter. Most words also accept synonyms and plurals.</p>
    <div class="lex-cats">${cats.map((c) => { const ds = DEFS.filter((d) => d.cat === c), f = ds.filter((d) => save.found.includes(d.name)); return `<div class="lex-cat"><h3>${esc(c)} <small>${f.length} / ${ds.length}</small></h3><div class="lex-words">${ds.map((d) => save.found.includes(d.name) ? `<span class="chip">${esc(d.name)}</span>` : `<span class="chip unk">${esc(d.name[0].toUpperCase())}···</span>`).join('')}</div></div>`; }).join('')}</div>`;
  $('#lex-close').onclick = () => { if (game && !game.showcase) hideAll(); else show('title'); };
  show('lex');
}

$('#btn-play').onclick = () => { Sfx.init(); showMap(); };
$('#btn-sandbox').onclick = () => { Sfx.init(); showBrief(0); };
$('#btn-how').onclick = () => show('how');
$('#how-close').onclick = () => { if (game && !game.showcase) hideAll(); else show('title'); };
$('#map-back').onclick = showTitle;
$('#btn-menu').onclick = () => { closeCard(); showMap(); };
$('#btn-restart').onclick = () => { if (game) loadLevel(game.level); };
$('#btn-hint').onclick = () => { if (!game) return; const h = game.level.hints; game.toastSeen.clear(); game.toast(`Hint ${game.hintIx % h.length + 1} of ${h.length}: ${h[game.hintIx % h.length]}`, 'gold'); game.hintIx++; };
$('#btn-lex').onclick = showLexicon;
$('#btn-view').onclick = () => { if (game) game.recenter(); };
$('#goal-toggle').onclick = () => { const c = ui.goals.classList.toggle('collapsed'); $('#goal-toggle').textContent = c ? 'Show all goals' : 'Show fewer'; };
const sndBtn = $('#btn-sound');
sndBtn.setAttribute('aria-pressed', String(Sfx.on));
sndBtn.onclick = () => { Sfx.init(); Sfx.setOn(!Sfx.on); sndBtn.setAttribute('aria-pressed', String(Sfx.on)); };
const selQ = $('#sel-quality'); selQ.value = quality;
selQ.onchange = () => { quality = selQ.value; store.set('inkwell.quality', quality); applyQuality(); };
const chkM = $('#chk-music'); chkM.checked = Sfx.music;
chkM.onchange = () => { Sfx.init(); Sfx.setMusic(chkM.checked); };
$('#adj-list').innerHTML = ADJ_LIST.filter((a) => !a.colour).map((a) => `<span class="chip">${esc(a.name)}${a.cost ? ` +${a.cost}` : ''}</span>`).join('') + '<span class="chip">colours +0</span>';

// ======================================================================
// Main loop
// ======================================================================
let last = performance.now(), T = 0;
const shakeOff = new THREE.Vector3();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; T += dt;
  camera.position.sub(shakeOff); shakeOff.set(0, 0, 0);
  if (game) game.update(dt, T);
  controls.update();
  if (game && game.shakeAmt > 0.001) { shakeOff.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(game.shakeAmt * 0.35); camera.position.add(shakeOff); game.shakeAmt *= Math.exp(-dt * 6); }
  sky.position.copy(camera.position);
  skyU.time.value = T; seaU.time.value = T;
  updateClouds(T);
  fxAdd.update(dt); fxNorm.update(dt);
  flushLights();
  Labels.update();
  Sfx.tickMusic(dt);
  composer.render();
}
applyQuality();
showTitle();
requestAnimationFrame(frame);
window.__gameReady = true;
setTimeout(() => $('#loading').classList.add('gone'), 250);
window.__inkwell = { get game() { return game; }, parse, LEVELS, loadLevel, showBrief, fxAdd, fxNorm, lightPool, THREE };
