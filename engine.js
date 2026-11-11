/* Token Tycoons card game rules. Two players. Pure functions over a plain-JSON
   state, so the same code runs on both phones and in the Node test. */
(function (root) {
  'use strict';

  var PLAYS = 3, HAND_LIMIT = 7, WIN_STACKS = 3, TUNE_BONUS = 3, MAX_TUNES = 2, LAWSUIT = 4;

  var SECT = {
    data:     { n: 'Data',     c: '#2f7fd6', size: 2, rent: [1, 3] },
    power:    { n: 'Power',    c: '#b98a00', size: 2, rent: [2, 4] },
    chips:    { n: 'Chips',    c: '#e07b1f', size: 3, rent: [1, 3, 5] },
    models:   { n: 'Models',   c: '#8b5cf0', size: 3, rent: [2, 3, 6] },
    robots:   { n: 'Robotics', c: '#e0445f', size: 3, rent: [2, 4, 7] },
    frontier: { n: 'Frontier', c: '#0f8f7f', size: 2, rent: [3, 8] }
  };
  var ORDER = ['data', 'power', 'chips', 'models', 'robots', 'frontier'];

  var ACTS = {
    invoice:  { n: 'Invoice', i: '🧾', v: 1, d: 'Pick one of your sectors. Your rival pays you its rent.' },
    hype:     { n: 'Hype Cycle', i: '📈', v: 1, d: 'Your next Invoice this turn charges double.' },
    fund:     { n: 'Funding Round', i: '💸', v: 1, d: 'Draw 2 cards.' },
    lawsuit:  { n: 'Lawsuit', i: '⚖️', v: 3, d: 'Your rival pays you ₮' + LAWSUIT + '.' },
    poach:    { n: 'Poach', i: '🎣', v: 3, d: 'Take one asset from a rival stack that is not complete.' },
    merger:   { n: 'Merger', i: '🤝', v: 3, d: 'Swap one of your assets for one of your rival\'s. Complete stacks are safe.' },
    takeover: { n: 'Hostile Takeover', i: '🏴‍☠️', v: 5, d: 'Take a whole complete stack from your rival.' },
    halluc:   { n: 'Hallucination', i: '🌀', v: 2, d: 'Your rival discards 2 random cards from their hand.' },
    scrape:   { n: 'Scrape', i: '🕸️', v: 2, d: 'Take 1 random card from your rival\'s hand.' },
    tune:     { n: 'Fine-tune', i: '🎚️', v: 3, d: 'Add to one of your complete stacks. Its rent goes up by ₮' + TUNE_BONUS + '.' },
    guard:    { n: 'Guardrail', i: '🛡️', v: 3, d: 'Cancels an action played against you. You are offered it when that happens. It does not use up a play.' }
  };

  // ---- the deck: card id = index into CARDS ----
  var CARDS = [];
  function add(n, card) { for (var k = 0; k < n; k++) CARDS.push(card); }
  [['data', 1, [['Scraper Farm', '🕷️'], ['Labeling Depot', '🏷️'], ['Web Archive', '📚']]],
   ['power', 2, [['Solar Array', '☀️'], ['Fusion Plant', '⚛️'], ['Wind Farm', '🌬️']]],
   ['chips', 2, [['Wafer Fab', '💿'], ['GPU Foundry', '🎛️'], ['Datacenter Row', '🗄️'], ['Cooling Loop', '❄️']]],
   ['models', 3, [['Chatbot Co', '🗨️'], ['Vision Lab', '👁️'], ['Code Copilot', '⌨️'], ['Voice Clone', '🎙️']]],
   ['robots', 3, [['Drone Works', '🚁'], ['Humanoid Inc', '🦾'], ['Robotaxi Fleet', '🚕'], ['Warehouse Bots', '📦']]],
   ['frontier', 4, [['Reasoning Engine', '♟️'], ['Agent Swarm', '🐝'], ['AGI Lab', '✨']]]
  ].forEach(function (row) {
    row[2].forEach(function (a) { CARDS.push({ k: 'asset', g: row[0], v: row[1], n: a[0], i: a[1] }); });
  });
  add(1, { k: 'wild', gs: ['data', 'power'], v: 1, n: 'Hybrid Cloud', i: '🔀' });
  add(1, { k: 'wild', gs: ['chips', 'models'], v: 2, n: 'Full-stack Lab', i: '🔀' });
  add(1, { k: 'wild', gs: ['robots', 'frontier'], v: 3, n: 'Moonshot Team', i: '🔀' });
  add(2, { k: 'wild', gs: ORDER.slice(), v: 0, n: 'Generalist', i: '🃏' });
  [[1, 5], [2, 4], [3, 3], [4, 2], [5, 2]].forEach(function (c) { add(c[1], { k: 'cash', v: c[0], n: '₮' + c[0] + ' Funding', i: '🪙' }); });
  [['invoice', 7], ['hype', 2], ['fund', 6], ['lawsuit', 3], ['poach', 3], ['merger', 2], ['takeover', 2], ['halluc', 2], ['scrape', 2], ['tune', 3], ['guard', 3]]
    .forEach(function (a) { add(a[1], { k: 'act', a: a[0], v: ACTS[a[0]].v, n: ACTS[a[0]].n, i: ACTS[a[0]].i }); });

  // ---- queries ----
  function isAsset(c) { return CARDS[c].k === 'asset' || CARDS[c].k === 'wild'; }
  function isComplete(p, g) { return p.sets[g].length >= SECT[g].size; }
  function stacks(p) { return ORDER.filter(function (g) { return isComplete(p, g); }).length; }
  function rent(p, g) {
    var n = p.sets[g].length; if (!n) return 0;
    return SECT[g].rent[Math.min(n, SECT[g].size) - 1] + (isComplete(p, g) ? TUNE_BONUS * p.ups[g].length : 0);
  }
  function sectorOf(p, c) { for (var k = 0; k < ORDER.length; k++) if (p.sets[ORDER[k]].indexOf(c) >= 0) return ORDER[k]; return null; }
  function bankTotal(p) { return p.bank.reduce(function (a, c) { return a + CARDS[c].v; }, 0); }
  /** Cards a player can pay with: everything in the bank, plus assets on the table that have a value. */
  function payable(p) {
    var r = p.bank.slice();
    ORDER.forEach(function (g) { p.sets[g].forEach(function (c) { if (CARDS[c].v > 0) r.push(c); }); });
    return r;
  }
  /** Rival assets that Poach and Merger may take (not in complete stacks). */
  function loose(p) { var r = []; ORDER.forEach(function (g) { if (!isComplete(p, g)) r = r.concat(p.sets[g]); }); return r; }
  function hasGuard(p) { return p.hand.some(function (c) { return CARDS[c].a === 'guard'; }); }
  /** Index of the player who has to do something right now. */
  function actor(s) { return s.phase === 'respond' ? s.pending.to : s.turn; }

  // ---- helpers that change state ----
  function log(s, p, text) { s.log.push({ p: p, t: text }); if (s.log.length > 40) s.log.shift(); }
  function take(arr, c) { var i = arr.indexOf(c); if (i < 0) return false; arr.splice(i, 1); return true; }
  function shuffle(a, rnd) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function draw(s, i, n, rnd) {
    for (var k = 0; k < n; k++) {
      if (!s.deck.length) { s.deck = shuffle(s.discard, rnd); s.discard = []; }
      if (!s.deck.length) return;
      s.players[i].hand.push(s.deck.pop());
    }
  }
  function checkWin(s) {
    for (var i = 0; i < 2; i++) if (stacks(s.players[i]) >= WIN_STACKS) {
      s.status = 'over'; s.phase = 'over'; s.winner = i; s.pending = null;
      log(s, i, 'completed ' + WIN_STACKS + ' stacks and wins.');
      return true;
    }
    return false;
  }
  function nextTurn(s, rnd) {
    s.turn = 1 - s.turn; s.plays = 0; s.hype = false; s.phase = 'play';
    draw(s, s.turn, s.players[s.turn].hand.length ? 2 : 5, rnd);
  }
  function transfer(s, from, to, cards) {
    var a = s.players[from], b = s.players[to];
    cards.forEach(function (c) {
      if (take(a.bank, c)) b.bank.push(c);
      else { var g = sectorOf(a, c); take(a.sets[g], c); b.sets[g].push(c); }
    });
  }
  function finish(s) { s.pending = null; s.phase = 'play'; checkWin(s); }

  /** Carry out the pending action once nobody blocks it any further. */
  function settle(s, rnd) {
    var pd = s.pending, A = s.players[pd.from], V = s.players[pd.target], names;
    if (pd.neg) { log(s, pd.target, 'blocked ' + pd.label + ' with a Guardrail.'); return finish(s); }
    if (pd.kind === 'pay') {
      var all = payable(V), total = all.reduce(function (a, c) { return a + CARDS[c].v; }, 0);
      if (total > pd.amt) { pd.stage = 'pay'; pd.to = pd.target; return; }
      transfer(s, pd.target, pd.from, all);
      log(s, pd.target, all.length ? 'could only pay ₮' + total + ' of ₮' + pd.amt + '.' : 'had nothing to pay with.');
    } else if (pd.kind === 'poach') {
      if (loose(V).indexOf(pd.x) >= 0) { transfer(s, pd.target, pd.from, [pd.x]); log(s, pd.from, 'poached ' + CARDS[pd.x].n + '.'); }
    } else if (pd.kind === 'merger') {
      if (loose(V).indexOf(pd.x) >= 0 && loose(A).indexOf(pd.y) >= 0) {
        transfer(s, pd.target, pd.from, [pd.x]); transfer(s, pd.from, pd.target, [pd.y]);
        log(s, pd.from, 'swapped ' + CARDS[pd.y].n + ' for ' + CARDS[pd.x].n + '.');
      }
    } else if (pd.kind === 'takeover') {
      if (isComplete(V, pd.g)) {
        A.sets[pd.g] = A.sets[pd.g].concat(V.sets[pd.g]); V.sets[pd.g] = [];
        A.ups[pd.g] = A.ups[pd.g].concat(V.ups[pd.g]); V.ups[pd.g] = [];
        log(s, pd.from, 'took over the ' + SECT[pd.g].n + ' stack.');
      }
    } else if (pd.kind === 'halluc') {
      names = [];
      for (var k = 0; k < 2 && V.hand.length; k++) { var c = V.hand.splice(Math.floor(rnd() * V.hand.length), 1)[0]; s.discard.push(c); names.push(CARDS[c].n); }
      log(s, pd.target, names.length ? 'lost ' + names.join(' and ') + ' to a Hallucination.' : 'had no cards to lose.');
    } else if (pd.kind === 'scrape') {
      if (V.hand.length) { A.hand.push(V.hand.splice(Math.floor(rnd() * V.hand.length), 1)[0]); log(s, pd.from, 'scraped a card from ' + V.name + '\'s hand.'); }
    }
    finish(s);
  }
  function attack(s, by, pd, rnd) {
    pd.from = by; pd.target = 1 - by; pd.to = 1 - by; pd.neg = false; pd.stage = 'block';
    s.pending = pd; s.phase = 'respond';
    if (!hasGuard(s.players[pd.to])) settle(s, rnd);
  }

  /** players: [{id,name,tok}, {id,name,tok}] */
  function newGame(players, rnd, seq) {
    var deck = shuffle(CARDS.map(function (_, i) { return i; }), rnd);
    var s = {
      seq: seq || 1, status: 'playing', phase: 'play', turn: Math.floor(rnd() * 2), plays: 0, hype: false,
      deck: deck, discard: [], pending: null, log: [], winner: null,
      players: players.map(function (p) {
        var sets = {}, ups = {}; ORDER.forEach(function (g) { sets[g] = []; ups[g] = []; });
        return { id: p.id, name: p.name, tok: p.tok, hand: [], bank: [], sets: sets, ups: ups };
      })
    };
    draw(s, 0, 5, rnd); draw(s, 1, 5, rnd); draw(s, s.turn, 2, rnd);
    return s;
  }

  /** Returns the next state, or null if `by` may not do `a` right now. */
  function apply(state, a, rnd, by) {
    if (state.status !== 'playing' || by !== actor(state)) return null;
    var s = JSON.parse(JSON.stringify(state)); s.seq++;
    var me = s.players[by], opp = s.players[1 - by], pd = s.pending, c = a.c, card = CARDS[c], g = a.g;

    if (s.phase === 'respond') {
      if (pd.stage === 'block') {
        if (a.t === 'accept') settle(s, rnd);
        else if (a.t === 'block') {
          var gc = me.hand.filter(function (x) { return CARDS[x].a === 'guard'; })[0];
          if (gc === undefined) return null;
          take(me.hand, gc); s.discard.push(gc);
          pd.neg = !pd.neg; pd.to = 1 - by;
          log(s, by, 'played a Guardrail.');
          if (!hasGuard(s.players[pd.to])) settle(s, rnd);
        } else return null;
      } else {
        if (a.t !== 'pay' || !a.cards) return null;
        var all = payable(me), seen = {}, sum = 0;
        for (var k = 0; k < a.cards.length; k++) {
          if (all.indexOf(a.cards[k]) < 0 || seen[a.cards[k]]) return null;
          seen[a.cards[k]] = 1; sum += CARDS[a.cards[k]].v;
        }
        if (sum < pd.amt && a.cards.length < all.length) return null;
        transfer(s, by, pd.from, a.cards);
        log(s, by, 'paid ' + s.players[pd.from].name + ' ₮' + sum + '.');
        finish(s);
      }
      return s;
    }

    if (s.phase === 'discard') {
      if (a.t !== 'discard' || !take(me.hand, c)) return null;
      s.discard.push(c);
      if (me.hand.length <= HAND_LIMIT) nextTurn(s, rnd);
      return s;
    }

    // ---- play phase ----
    if (a.t === 'end') {
      log(s, by, 'ended their turn.');
      if (me.hand.length > HAND_LIMIT) s.phase = 'discard'; else nextTurn(s, rnd);
      return s;
    }
    if (a.t === 'move') {   // re-assign a wild already on the table (free)
      var from = sectorOf(me, c);
      if (!from || !card || card.k !== 'wild' || card.gs.indexOf(g) < 0 || g === from) return null;
      take(me.sets[from], c); me.sets[g].push(c);
      log(s, by, 'moved ' + card.n + ' to ' + SECT[g].n + '.');
      checkWin(s); return s;
    }
    if (s.plays >= PLAYS || !card || me.hand.indexOf(c) < 0) return null;

    if (a.t === 'bank') {
      if (isAsset(c) || card.v <= 0) return null;
      take(me.hand, c); me.bank.push(c);
      log(s, by, 'banked ₮' + card.v + '.');
    } else if (a.t === 'asset') {
      if (!isAsset(c)) return null;
      if (card.k === 'asset') g = card.g; else if (card.gs.indexOf(g) < 0) return null;
      take(me.hand, c); me.sets[g].push(c);
      log(s, by, 'added ' + card.n + ' to ' + SECT[g].n + '.');
    } else if (a.t === 'act') {
      if (card.k !== 'act' || card.a === 'guard') return null;
      var kind = card.a, pend = null;
      if (kind === 'fund') { take(me.hand, c); draw(s, by, 2, rnd); log(s, by, 'raised a Funding Round and drew 2 cards.'); }
      else if (kind === 'hype') { if (s.hype) return null; s.hype = true; log(s, by, 'started a Hype Cycle. Their next Invoice is doubled.'); }
      else if (kind === 'tune') {
        if (!SECT[g] || !isComplete(me, g) || me.ups[g].length >= MAX_TUNES) return null;
        take(me.hand, c); me.ups[g].push(c); s.plays++;
        log(s, by, 'fine-tuned their ' + SECT[g].n + ' stack.');
        return s;
      } else if (kind === 'invoice') {
        if (!SECT[g] || !me.sets[g].length) return null;
        var amt = rent(me, g) * (s.hype ? 2 : 1); s.hype = false;
        pend = { kind: 'pay', amt: amt, label: 'the ' + SECT[g].n + ' Invoice', text: 'sent a ₮' + amt + ' Invoice for ' + SECT[g].n + '.' };
      } else if (kind === 'lawsuit') pend = { kind: 'pay', amt: LAWSUIT, label: 'the Lawsuit', text: 'filed a Lawsuit for ₮' + LAWSUIT + '.' };
      else if (kind === 'poach') {
        if (loose(opp).indexOf(a.x) < 0) return null;
        pend = { kind: 'poach', x: a.x, label: 'the Poach', text: 'is poaching ' + CARDS[a.x].n + '.' };
      } else if (kind === 'merger') {
        if (loose(opp).indexOf(a.x) < 0 || loose(me).indexOf(a.y) < 0) return null;
        pend = { kind: 'merger', x: a.x, y: a.y, label: 'the Merger', text: 'proposed a Merger: ' + CARDS[a.y].n + ' for ' + CARDS[a.x].n + '.' };
      } else if (kind === 'takeover') {
        if (!SECT[g] || !isComplete(opp, g)) return null;
        pend = { kind: 'takeover', g: g, label: 'the Hostile Takeover', text: 'launched a Hostile Takeover of ' + SECT[g].n + '.' };
      } else if (kind === 'halluc') pend = { kind: 'halluc', label: 'the Hallucination', text: 'played Hallucination.' };
      else if (kind === 'scrape') pend = { kind: 'scrape', label: 'the Scrape', text: 'played Scrape.' };
      if (kind !== 'fund') take(me.hand, c);
      s.discard.push(c); s.plays++;
      if (pend) { log(s, by, pend.text); attack(s, by, pend, rnd); }
      return s;
    } else return null;
    s.plays++;
    checkWin(s);
    return s;
  }

  var api = {
    CARDS: CARDS, SECT: SECT, ORDER: ORDER, ACTS: ACTS, PLAYS: PLAYS, HAND_LIMIT: HAND_LIMIT, WIN_STACKS: WIN_STACKS,
    TUNE_BONUS: TUNE_BONUS, MAX_TUNES: MAX_TUNES, LAWSUIT: LAWSUIT,
    isAsset: isAsset, isComplete: isComplete, stacks: stacks, rent: rent, sectorOf: sectorOf, bankTotal: bankTotal,
    payable: payable, loose: loose, hasGuard: hasGuard, actor: actor, newGame: newGame, apply: apply
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Engine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
