/* Token Tycoons rules engine. Pure functions over a plain-JSON game state,
   so the same code runs on both phones and in the Node balance test. */
(function (root) {
  'use strict';

  var START_BONUS = 150, START_CASH = 1500, MAX_LEVEL = 3, LIMIT_POS = 14;
  var LEVEL_MULT = [1, 3, 6, 10];
  var POWER_RENT = [0, 40, 100, 220];

  var GROUPS = {
    data:     { n: 'Data',     c: '#2f7fd6' },
    chips:    { n: 'Chips',    c: '#e07b1f' },
    models:   { n: 'Models',   c: '#8b5cf0' },
    robots:   { n: 'Robotics', c: '#e0445f' },
    frontier: { n: 'Frontier', c: '#0f8f7f' },
    power:    { n: 'Power',    c: '#b98a00' }
  };

  // 28 spaces, clockwise from the top-left corner.
  var SPACES = [
    { t: 'start', n: 'Boot Up', i: '⏻', s: 'START', d: 'Collect ₮' + START_BONUS + ' funding every time you pass or land here.' },
    { t: 'prop', n: 'Scraper Farm', g: 'data', p: 60, i: '🕸️' },
    { t: 'card', n: 'Prompt', i: '💬', s: 'PROMPT', d: 'Draw a prompt card. Could be funding, could be a lawsuit.' },
    { t: 'prop', n: 'Labeling Depot', g: 'data', p: 80, i: '🏷️' },
    { t: 'tax', n: 'Cloud Bill', i: '☁️', s: '-₮100', a: 100, d: 'The invoice arrived. Pay ₮100.' },
    { t: 'power', n: 'Solar Array', g: 'power', p: 150, i: '☀️' },
    { t: 'prop', n: 'Wafer Fab', g: 'chips', p: 120, i: '💿' },
    { t: 'rest', n: 'Open Source Commons', i: '🌱', s: 'FREE', d: 'Nothing happens here. Enjoy the goodwill.' },
    { t: 'prop', n: 'GPU Foundry', g: 'chips', p: 140, i: '🎛️' },
    { t: 'card', n: 'Prompt', i: '💬', s: 'PROMPT', d: 'Draw a prompt card. Could be funding, could be a lawsuit.' },
    { t: 'prop', n: 'Datacenter Row', g: 'chips', p: 160, i: '🗄️' },
    { t: 'prop', n: 'Chatbot Co', g: 'models', p: 180, i: '🗨️' },
    { t: 'halluc', n: 'Hallucination', i: '🌀', s: 'OOPS', d: 'Your models made things up. Pay ₮30 for every tile you own (minimum ₮30).' },
    { t: 'prop', n: 'Vision Lab', g: 'models', p: 200, i: '👁️' },
    { t: 'limit', n: 'Rate Limited', i: '⏳', s: 'WAIT', d: 'Too many requests. You skip your next turn.' },
    { t: 'prop', n: 'Code Copilot', g: 'models', p: 220, i: '⌨️' },
    { t: 'power', n: 'Fusion Plant', g: 'power', p: 150, i: '⚛️' },
    { t: 'prop', n: 'Drone Works', g: 'robots', p: 240, i: '🚁' },
    { t: 'card', n: 'Prompt', i: '💬', s: 'PROMPT', d: 'Draw a prompt card. Could be funding, could be a lawsuit.' },
    { t: 'prop', n: 'Humanoid Inc', g: 'robots', p: 260, i: '🦾' },
    { t: 'prop', n: 'Robotaxi Fleet', g: 'robots', p: 280, i: '🚕' },
    { t: 'bonus', n: 'Viral Demo', i: '🚀', s: '+₮100', a: 100, d: 'Your demo blew up. Collect ₮100.' },
    { t: 'prop', n: 'Reasoning Engine', g: 'frontier', p: 300, i: '♟️' },
    { t: 'card', n: 'Prompt', i: '💬', s: 'PROMPT', d: 'Draw a prompt card. Could be funding, could be a lawsuit.' },
    { t: 'prop', n: 'Agent Swarm', g: 'frontier', p: 320, i: '🐝' },
    { t: 'power', n: 'Wind Farm', g: 'power', p: 150, i: '🌬️' },
    { t: 'tax', n: 'Regulators', i: '⚖️', s: '-₮150', a: 150, d: 'Compliance review. Pay ₮150.' },
    { t: 'prop', n: 'AGI Lab', g: 'frontier', p: 400, i: '✨' }
  ];
  var N = SPACES.length;

  function isOwnable(sp) { return sp.t === 'prop' || sp.t === 'power'; }
  function upCost(i) { return Math.round(SPACES[i].p * 0.5); }
  function groupTiles(g) { var r = []; SPACES.forEach(function (sp, i) { if (sp.g === g) r.push(i); }); return r; }
  function ownerOf(s, i) { return s.owned[i] ? s.owned[i].o : -1; }
  function tilesOf(s, p) { return Object.keys(s.owned).map(Number).filter(function (i) { return s.owned[i].o === p; }).sort(function (a, b) { return a - b; }); }
  function ownsGroup(s, p, g) { return groupTiles(g).every(function (i) { return ownerOf(s, i) === p; }); }

  /** Rent for tile i at a given level (defaults to its current level and owner). */
  function rentAt(s, i, level, owner) {
    var sp = SPACES[i];
    if (owner === undefined) owner = ownerOf(s, i);
    if (sp.t === 'power') {
      var k = owner < 0 ? 1 : groupTiles('power').filter(function (j) { return ownerOf(s, j) === owner; }).length;
      return POWER_RENT[Math.max(1, k)];
    }
    if (level === undefined) level = s.owned[i] ? s.owned[i].l : 0;
    var r = Math.round(sp.p * 0.1) * LEVEL_MULT[level];
    if (owner >= 0 && ownsGroup(s, owner, sp.g)) r *= 2;
    return r;
  }
  function sellValue(s, i) { return Math.round((SPACES[i].p + s.owned[i].l * upCost(i)) / 2); }
  function netWorth(s, p) {
    return s.players[p].cash + tilesOf(s, p).reduce(function (a, i) { return a + SPACES[i].p + s.owned[i].l * upCost(i); }, 0);
  }

  function log(s, p, text) { s.log.push({ p: p, t: text }); if (s.log.length > 40) s.log.shift(); }
  function fmt(n) { return '₮' + n.toLocaleString('en-CA'); }

  var CARDS = [
    { t: 'Seed round closes. Collect ₮150.', f: function (s, i) { s.players[i].cash += 150; } },
    { t: 'You top a benchmark leaderboard. Collect ₮120.', f: function (s, i) { s.players[i].cash += 120; } },
    { t: 'Government research grant. Collect ₮200.', f: function (s, i) { s.players[i].cash += 200; } },
    { t: 'Enterprise contract signed. Collect ₮100.', f: function (s, i) { s.players[i].cash += 100; } },
    { t: 'GPU shortage. Pay ₮80 for spot capacity.', f: function (s, i) { s.players[i].cash -= 80; } },
    { t: 'Model weights leak online. Pay ₮60 for incident response.', f: function (s, i) { s.players[i].cash -= 60; } },
    { t: 'Data licensing lawsuit. Pay ₮120.', f: function (s, i) { s.players[i].cash -= 120; } },
    { t: 'Acqui-hire payout. Collect ₮50 from each rival.', f: function (s, i) {
      s.players.forEach(function (q, j) { if (j !== i && !q.out) { q.cash -= 50; s.players[i].cash += 50; } });
    } },
    { t: 'A rival poaches your lead researcher. Pay each rival ₮40.', f: function (s, i) {
      s.players.forEach(function (q, j) { if (j !== i && !q.out) { q.cash += 40; s.players[i].cash -= 40; } });
    } },
    { t: 'Major outage. Go straight to Rate Limited and skip your next turn.', f: function (s, i) {
      s.players[i].pos = LIMIT_POS; s.players[i].skip = 1;
    } },
    { t: 'Clean reboot. Jump to Boot Up and collect ₮' + START_BONUS + '.', f: function (s, i) {
      s.players[i].pos = 0; s.players[i].cash += START_BONUS;
    } },
    { t: 'Open-source goodwill. Free upgrade on your cheapest tile, or ₮60 if you have nothing to upgrade.', f: function (s, i) {
      var c = tilesOf(s, i).filter(function (k) { return SPACES[k].t === 'prop' && s.owned[k].l < MAX_LEVEL; })
        .sort(function (a, b) { return SPACES[a].p - SPACES[b].p; });
      if (c.length) { s.owned[c[0]].l++; log(s, i, SPACES[c[0]].n + ' upgraded to v' + (s.owned[c[0]].l + 1) + ' for free.'); }
      else s.players[i].cash += 60;
    } },
    { t: 'Momentum. Advance 3 spaces.', f: function (s, i) { move(s, i, 3); land(s); } }
  ];

  function move(s, i, steps) {
    var p = s.players[i], to = p.pos + steps;
    if (to >= N) { to -= N; p.cash += START_BONUS; log(s, i, 'passed Boot Up and collected ' + fmt(START_BONUS) + '.'); }
    p.pos = to;
  }

  function land(s, rnd) {
    var i = s.turn, p = s.players[i], sp = SPACES[p.pos];
    s.phase = 'end';
    if (isOwnable(sp)) {
      var o = ownerOf(s, p.pos);
      if (o < 0) {
        if (p.cash >= sp.p) s.phase = 'buy';
        else log(s, i, 'landed on ' + sp.n + ' but cannot afford ' + fmt(sp.p) + '.');
      } else if (o !== i) {
        var r = rentAt(s, p.pos);
        p.cash -= r; s.players[o].cash += r;
        log(s, i, 'landed on ' + sp.n + ' and paid ' + s.players[o].name + ' ' + fmt(r) + ' rent.');
      } else log(s, i, 'landed on their own ' + sp.n + '.');
    } else if (sp.t === 'card') {
      var c = CARDS[Math.floor(rnd() * CARDS.length)];
      s.card = { text: c.t, seq: s.seq };
      log(s, i, 'drew a prompt: ' + c.t);
      c.f(s, i);
    } else if (sp.t === 'tax') {
      p.cash -= sp.a; log(s, i, 'landed on ' + sp.n + ' and paid ' + fmt(sp.a) + '.');
    } else if (sp.t === 'bonus') {
      p.cash += sp.a; log(s, i, 'landed on ' + sp.n + ' and collected ' + fmt(sp.a) + '.');
    } else if (sp.t === 'halluc') {
      var fine = Math.max(30, 30 * tilesOf(s, i).length);
      p.cash -= fine; log(s, i, 'hit a Hallucination and paid ' + fmt(fine) + '.');
    } else if (sp.t === 'limit') {
      p.skip = 1; log(s, i, 'got Rate Limited and will skip a turn.');
    } else if (sp.t === 'rest') {
      log(s, i, 'is relaxing at the Open Source Commons.');
    }
  }

  function checkWin(s) {
    var alive = [], best = -1;
    s.players.forEach(function (p, i) { if (!p.out) alive.push(i); });
    if (alive.length === 1) best = alive[0];
    else alive.forEach(function (i) {
      if (netWorth(s, i) >= s.goal && (best < 0 || netWorth(s, i) > netWorth(s, best))) best = i;
    });
    if (best >= 0) {
      s.status = 'over'; s.winner = best; s.phase = 'over';
      log(s, best, 'wins the race with a net worth of ' + fmt(netWorth(s, best)) + '.');
    }
    return best >= 0;
  }

  function nextTurn(s) {
    for (var k = 0; k < s.players.length * 2; k++) {
      s.turn = (s.turn + 1) % s.players.length;
      var p = s.players[s.turn];
      if (p.out) continue;
      if (p.skip) { p.skip = 0; log(s, s.turn, 'is Rate Limited and skips this turn.'); continue; }
      break;
    }
    s.phase = 'roll'; s.again = false;
  }

  /** players: [{id,name,tok}] */
  function newGame(players, goal, rnd, seq) {
    return {
      seq: seq || 1, status: 'playing', goal: goal,
      players: players.map(function (p) { return { id: p.id, name: p.name, tok: p.tok, cash: START_CASH, pos: 0, skip: 0, out: false }; }),
      turn: Math.floor(rnd() * players.length), phase: 'roll', again: false,
      roll: null, card: null, owned: {}, log: [], winner: null
    };
  }

  /** Returns the next state, or null when the action is not legal right now.
      Every action belongs to the player whose turn it is. */
  function apply(state, a, rnd) {
    if (state.status !== 'playing') return null;
    var s = JSON.parse(JSON.stringify(state));
    s.seq++;
    var i = s.turn, p = s.players[i], t;

    if (a.t === 'roll') {
      if (s.phase !== 'roll') return null;
      var d1 = 1 + Math.floor(rnd() * 6), d2 = 1 + Math.floor(rnd() * 6), from = p.pos;
      s.card = null;
      log(s, i, 'rolled ' + d1 + ' + ' + d2 + '.');
      move(s, i, d1 + d2);
      s.roll = { seq: s.seq, p: i, from: from, d: [d1, d2] };
      land(s, rnd);
      s.again = d1 === d2 && !p.skip;
    } else if (a.t === 'buy') {
      if (s.phase !== 'buy') return null;
      t = SPACES[p.pos];
      p.cash -= t.p; s.owned[p.pos] = { o: i, l: 0 };
      log(s, i, 'bought ' + t.n + ' for ' + fmt(t.p) + '.');
      s.phase = 'end';
    } else if (a.t === 'pass') {
      if (s.phase !== 'buy') return null;
      log(s, i, 'passed on ' + SPACES[p.pos].n + '.');
      s.phase = 'end';
    } else if (a.t === 'upgrade') {
      t = s.owned[a.i];
      if (s.phase === 'buy' || !t || t.o !== i || SPACES[a.i].t !== 'prop' || t.l >= MAX_LEVEL || p.cash < upCost(a.i)) return null;
      p.cash -= upCost(a.i); t.l++;
      log(s, i, 'upgraded ' + SPACES[a.i].n + ' to v' + (t.l + 1) + ' for ' + fmt(upCost(a.i)) + '.');
    } else if (a.t === 'sell') {
      t = s.owned[a.i];
      if (s.phase === 'buy' || !t || t.o !== i) return null;
      var v = sellValue(s, a.i);
      p.cash += v; delete s.owned[a.i];
      log(s, i, 'sold ' + SPACES[a.i].n + ' back to the bank for ' + fmt(v) + '.');
    } else if (a.t === 'end') {
      if (s.phase !== 'end' || p.cash < 0) return null;
      if (!checkWin(s)) { if (s.again) { s.again = false; s.phase = 'roll'; } else nextTurn(s); }
    } else if (a.t === 'bankrupt') {
      if (s.phase === 'buy') return null;
      p.out = true;
      tilesOf(s, i).forEach(function (k) { delete s.owned[k]; });
      log(s, i, 'went bankrupt. Their tiles return to the bank.');
      if (!checkWin(s)) nextTurn(s);
    } else return null;
    return s;
  }

  var api = {
    SPACES: SPACES, GROUPS: GROUPS, N: N, START_BONUS: START_BONUS, MAX_LEVEL: MAX_LEVEL, LEVEL_MULT: LEVEL_MULT, POWER_RENT: POWER_RENT,
    isOwnable: isOwnable, upCost: upCost, groupTiles: groupTiles, ownerOf: ownerOf, tilesOf: tilesOf, ownsGroup: ownsGroup,
    rentAt: rentAt, sellValue: sellValue, netWorth: netWorth, newGame: newGame, apply: apply, fmt: fmt
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Engine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
