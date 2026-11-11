/* Token Tycoons UI + phone-to-phone sync.
   Sync model: the game is turn-based, so whoever acts computes the next state with the
   engine and sends the whole state to the other phone. The higher `seq` always wins. */
(function () {
  'use strict';
  var E = window.Engine, SP = E.SPACES, fmt = E.fmt;
  var app = document.getElementById('app');
  var COLORS = ['#ffb020', '#4cc9f0', '#ff7ab8', '#b79cff'];
  var TOKENS = ['🤖', '🧠', '🛰️', '👾'];
  var GOALS = [{ v: 3000, n: 'Quick', d: '~20 min' }, { v: 4500, n: 'Full', d: '~35 min' }];
  // Inside a Claude artifact preview the browser sandbox blocks phone-to-phone connections.
  var SANDBOX = !!(window.claude && window.claude.use);

  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  var pid = store.get('tt_pid');
  if (!pid) { pid = Math.random().toString(36).slice(2, 10); store.set('tt_pid', pid); }
  var prefs = store.get('tt_prefs') || { name: '', tok: 0, goal: 3000, local: ['', '', '', ''], count: 2 };

  var S = null;            // game state (null until known)
  var sess = null;         // { mode: 'local' | 'host' | 'guest', code }
  var net = null, netStatus = '';
  var busy = false, shownRoll = -1, disp = [];   // animation bookkeeping
  var sheet = null, homeErr = '', leaveArmed = false;

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function me() {
    if (!S || !S.players) return -1;
    if (sess.mode === 'local') return S.turn;
    for (var i = 0; i < S.players.length; i++) if (S.players[i].id === pid) return i;
    return -1;
  }
  function myTurn() { return S && S.status === 'playing' && me() === S.turn; }
  function color(i) { return COLORS[S.players[i].tok % COLORS.length]; }
  function save() { if (sess) store.set('tt_sess', { mode: sess.mode, code: sess.code, S: S }); }

  /* ---------------- networking (PeerJS / WebRTC) ---------------- */
  function loadPeer() {
    return new Promise(function (res, rej) {
      if (window.Peer) return res();
      var s = document.createElement('script');
      s.src = 'vendor/peerjs.min.js'; s.onload = function () { res(); }; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  function Net(role, code, onMsg, onStatus) {
    var peer = null, conns = [], dead = false, lastRx = 0, rt = null, dialAt = 0;
    var hostId = 'token-tycoons-v1-' + code;
    var opts = store.get('tt_broker') || {};
    function later(fn, ms) { clearTimeout(rt); rt = setTimeout(fn, ms); }
    function open() {
      if (dead) return;
      if (peer) { try { peer.destroy(); } catch (e) {} }
      conns = []; onStatus('connecting');
      peer = role === 'host' ? new window.Peer(hostId, opts) : new window.Peer(opts);
      var mine = peer;
      peer.on('open', function () { if (role === 'host') onStatus('waiting'); else dial(); });
      peer.on('connection', wire);
      peer.on('disconnected', function () {   // lost the matchmaking server: retry with a pause, never in a tight loop
        setTimeout(function () {
          if (dead || mine !== peer || peer.destroyed || !peer.disconnected) return;
          try { peer.reconnect(); } catch (e) { open(); }
        }, 2500);
      });
      peer.on('error', function (e) {
        if (dead || mine !== peer) return;
        if (e.type === 'peer-unavailable') { onStatus('nohost'); later(dial, 3000); }
        else if (e.type === 'browser-incompatible') onStatus('unsupported');
        else if (!conns.length) { onStatus('connecting'); later(open, 3000); }
      });
    }
    function dial() {
      if (dead || role !== 'guest' || conns.length) return;
      if (!peer || peer.destroyed) return open();
      if (peer.disconnected) { try { peer.reconnect(); } catch (e) {} return later(dial, 2000); }
      dialAt = Date.now();
      wire(peer.connect(hostId, { reliable: true }));
      later(function () { if (!conns.length) dial(); }, 8000);
    }
    function wire(c) {
      c.on('open', function () {
        conns.forEach(function (x) { if (x !== c) { try { x.close(); } catch (e) {} } });
        conns = [c]; lastRx = Date.now(); onStatus('online'); onMsg({ t: 'open' }, c);
      });
      c.on('data', function (d) { lastRx = Date.now(); if (d && d.t !== 'ping') onMsg(d, c); });
      c.on('close', function () { drop(c); });
      c.on('error', function () { drop(c); });
    }
    function drop(c) {
      var had = conns.indexOf(c) >= 0;
      conns = conns.filter(function (x) { return x !== c; });
      if (dead || conns.length || !had) return;
      onStatus(role === 'host' ? 'waiting' : 'connecting');
      if (role === 'guest') later(dial, 1200);
    }
    function send(m) { conns.forEach(function (c) { if (c.open) { try { c.send(m); } catch (e) {} } }); }
    var beat = setInterval(function () {
      send({ t: 'ping' });
      if (conns.length && Date.now() - lastRx > 13000) conns.slice().forEach(function (c) { try { c.close(); } catch (e) {} drop(c); });
    }, 4000);
    function wake() {
      if (dead || document.hidden) return;
      if (!peer || peer.destroyed) open();
      else if (peer.disconnected) { try { peer.reconnect(); } catch (e) { open(); } }
      else if (role === 'guest' && !conns.length && Date.now() - dialAt > 3000) dial();
      send({ t: 'ping' });
    }
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('online', wake);
    open();
    return {
      send: send,
      close: function () {
        dead = true; clearInterval(beat); clearTimeout(rt);
        document.removeEventListener('visibilitychange', wake); window.removeEventListener('online', wake);
        try { peer.destroy(); } catch (e) {}
      }
    };
  }

  function onMsg(m, c) {
    if (m.t === 'open') {
      if (sess.mode === 'guest') c.send({ t: 'hello', pid: pid, name: prefs.name || 'Player 2', tok: prefs.tok });
      if (S && S.status !== 'lobby') c.send({ t: 'state', s: S });
    } else if (m.t === 'hello' && sess.mode === 'host' && S) {
      if (!S.players.some(function (p) { return p.id === m.pid; })) {
        if (S.status === 'lobby') {
          var host = S.players[0], tok = m.tok === host.tok ? (host.tok + 1) % TOKENS.length : m.tok;
          S = E.newGame([host, { id: m.pid, name: uniqueName(String(m.name).slice(0, 14), host.name), tok: tok }], S.goal, Math.random, S.seq + 1);
          shownRoll = -1;
        } else {
          // Someone rejoined from a new browser: hand them the other seat.
          var seat = S.players.filter(function (p) { return p.id !== pid; })[0];
          if (seat) { seat.id = m.pid; S.seq++; }
        }
      }
      commit(S);
    } else if (m.t === 'state' && m.s && (!S || S.status === 'lobby' || m.s.seq > S.seq)) {
      var first = !S || S.status === 'lobby';
      S = m.s;
      if (first) shownRoll = S.roll ? S.roll.seq : -1;
      save(); schedule();
    }
  }
  function uniqueName(n, other) { n = n.trim() || 'Player 2'; return n === other ? n + ' 2' : n; }
  function onStatus(st) { netStatus = st; if (!busy) render(); }

  /* ---------------- state changes ---------------- */
  function commit(next) {
    S = next; save();
    if (net) net.send({ t: 'state', s: S });
    schedule();
  }
  function act(a) {
    if (busy || !myTurn()) return;
    var next = E.apply(S, a, Math.random);
    if (next) { sheet = null; commit(next); }
  }
  function schedule() {
    if (busy) return;
    if (S && S.roll && S.roll.seq !== shownRoll && S.status !== 'lobby') {
      busy = true;
      animateRoll(S.roll).then(function () { busy = false; schedule(); });
      return;
    }
    if (S && S.players) disp = S.players.map(function (p) { return p.pos; });
    render();
    if (myTurn() && S.phase === 'roll' && sess.mode !== 'local' && navigator.vibrate) { try { navigator.vibrate(60); } catch (e) {} }
  }

  function start(mode, code, state) {
    sess = { mode: mode, code: code }; S = state; sheet = null; homeErr = ''; leaveArmed = false;
    shownRoll = S && S.roll ? S.roll.seq : -1;
    save();
    if (mode !== 'local') {
      netStatus = 'connecting';
      loadPeer().then(function () { if (sess && sess.code === code) net = Net(mode, code, onMsg, onStatus); },
        function () { netStatus = 'unsupported'; render(); });
    }
    schedule();
  }
  function leave() {
    if (net) { net.close(); net = null; }
    sess = null; S = null; sheet = null; busy = false; store.del('tt_sess');
    if (location.hash) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} }
    render();
  }
  function newCode() { var a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', s = ''; for (var i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
  function inviteUrl() { return location.origin + location.pathname + '#' + sess.code; }

  /* ---------------- rendering ---------------- */
  function render() {
    if (!sess) return renderHome();
    if (!S) return renderConnecting();
    if (S.status === 'lobby') return renderLobby();
    renderGame();
  }

  function rulesHtml() {
    return '<details class="rules"><summary>How to play</summary><ul>' +
      '<li>Roll two dice and move clockwise around the board. Passing Boot Up pays ' + fmt(E.START_BONUS) + '.</li>' +
      '<li>Land on an unowned tile to buy it. Land on a rival\'s tile and you pay them rent.</li>' +
      '<li>On your turn, tap any tile you own to upgrade it (v2, v3, v4). Each version raises the rent. Own a whole sector and its rent doubles.</li>' +
      '<li>Power plants cannot be upgraded. Their rent grows with how many you own.</li>' +
      '<li>Doubles give you another roll. Rate Limited makes you skip a turn.</li>' +
      '<li>Short on cash? Sell tiles back to the bank for half of what you put in.</li>' +
      '<li>First player whose net worth (cash plus tiles and upgrades) reaches the goal wins. Bankrupting your rival also wins.</li>' +
      '</ul></details>';
  }

  function renderHome() {
    var saved = store.get('tt_sess'), hashCode = (location.hash || '').replace('#', '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    var h = '<div class="hero"><div class="label">A property game about the AI boom</div>' +
      '<div class="logo">Token<span>Tycoons</span></div>' +
      '<p class="muted">Buy up the AI stack, upgrade it, and collect rent until one of you is worth more than the goal.</p></div>';
    if (saved && saved.S && saved.S.status === 'playing') {
      h += '<div class="panel"><div class="label">Game in progress' + (saved.mode === 'local' ? '' : ' · code ' + esc(saved.code)) + '</div>' +
        '<div class="row"><button class="btn" data-a="resume">Resume game</button><button class="btn ghost small" data-a="discard">Discard</button></div></div>';
    }
    h += '<div class="panel">' +
      '<label class="field"><span class="label">Your name</span><input class="input" id="name" maxlength="14" autocomplete="off" placeholder="e.g. Sam" value="' + esc(prefs.name) + '"></label>' +
      '<div class="field"><span class="label">Your piece</span><div class="picks">' + TOKENS.map(function (t, i) {
        return '<button class="pick" data-a="tok" data-i="' + i + '" aria-pressed="' + (prefs.tok === i) + '" aria-label="Piece ' + (i + 1) + '" style="box-shadow: inset 0 -4px 0 ' + COLORS[i] + '">' + t + '</button>';
      }).join('') + '</div></div>' +
      '<div class="field"><span class="label">Game length (net worth to win)</span><div class="picks">' + GOALS.map(function (g) {
        return '<button class="pick txt" data-a="goal" data-v="' + g.v + '" aria-pressed="' + (prefs.goal === g.v) + '">' + g.n + ' · ' + fmt(g.v) + '<small>' + g.d + '</small></button>';
      }).join('') + '</div></div></div>';

    if (SANDBOX) {
      h += '<div class="panel"><div class="label">Two phones</div><p class="note">Phone-to-phone play is switched off in this preview. It works in the hosted version of the game. You can still play here by passing one phone back and forth.</p></div>';
    } else {
      h += '<div class="panel"><div class="label">Two phones</div>' +
        '<button class="btn" data-a="host">Host a game</button>' +
        '<div class="row"><input class="input code" id="code" maxlength="4" autocomplete="off" autocapitalize="characters" placeholder="CODE" aria-label="Game code" value="' + esc(hashCode) + '">' +
        '<button class="btn ghost" data-a="join">Join</button></div>' +
        (homeErr ? '<p class="err">' + esc(homeErr) + '</p>' : '') +
        '<p class="note">One of you hosts and shares the 4-character code. The other types it here and taps Join.</p></div>';
    }
    h += '<div class="panel"><div class="label">One phone, pass and play</div>' +
      '<div class="picks">' + [2, 3, 4].map(function (n) { return '<button class="pick txt" data-a="count" data-v="' + n + '" aria-pressed="' + (prefs.count === n) + '">' + n + ' players</button>'; }).join('') + '</div>' +
      '<div class="row">' + Array.apply(null, Array(prefs.count - 1)).map(function (_, k) {
        return '<input class="input" style="flex:1 1 120px;width:auto;min-width:0" id="ln' + (k + 1) + '" maxlength="14" autocomplete="off" placeholder="Player ' + (k + 2) + ' name" aria-label="Player ' + (k + 2) + ' name" value="' + esc(prefs.local[k + 1] || '') + '">';
      }).join('') + '</div>' +
      '<button class="btn ghost" data-a="local">Start on this phone</button></div>';
    h += '<div class="panel">' + rulesHtml() + '</div>';
    app.innerHTML = h;
  }

  function statusText() {
    return { connecting: 'Connecting…', waiting: 'Waiting for the other phone…', online: 'Connected', nohost: 'Looking for the host…', unsupported: 'This browser cannot connect' }[netStatus] || '';
  }
  function renderConnecting() {
    app.innerHTML = '<div class="hero"><div class="label">Joining game</div><div class="bigcode">' + esc(sess.code) + '</div></div>' +
      '<div class="panel"><p><span class="dot wait" style="display:inline-block;margin-right:8px"></span>' + esc(statusText()) + '</p>' +
      (netStatus === 'nohost' ? '<p class="note">No game is open with that code yet. Check the code, and make sure the host\'s phone has the game on screen. Still trying.</p>' : '') +
      (netStatus === 'unsupported' ? '<p class="err">This browser does not support phone-to-phone connections. Try Safari or Chrome.</p>' : '') +
      '<button class="btn ghost" data-a="leave-now">Back</button></div>';
  }
  function renderLobby() {
    app.innerHTML = '<div class="hero"><div class="label">Your game code</div><div class="bigcode">' + esc(sess.code) + '</div></div>' +
      '<div class="panel"><p><span class="dot ' + (netStatus === 'waiting' ? 'on' : 'wait') + '" style="display:inline-block;margin-right:8px"></span>' +
      (netStatus === 'waiting' ? 'Ready. Waiting for player 2 to join…' : esc(statusText())) + '</p>' +
      '<p class="note">On the other phone, open this same page, type the code and tap Join. Or send the invite link. Keep this screen open.</p>' +
      '<div class="row"><button class="btn" data-a="share">Send invite link</button><button class="btn ghost small" data-a="leave-now">Cancel</button></div>' +
      '<p class="note num" id="link" style="word-break:break-all;user-select:all">' + esc(inviteUrl()) + '</p></div>';
  }

  function tileXY(i) { // grid cell (col,row) for space i on the 8x8 ring
    if (i <= 7) return [i, 0];
    if (i <= 14) return [7, i - 7];
    if (i <= 21) return [21 - i, 7];
    return [0, 28 - i];
  }
  function diceHtml(v) {
    var pips = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }[v] || [];
    var h = ''; for (var k = 0; k < 9; k++) h += '<i' + (pips.indexOf(k) >= 0 ? ' class="p"' : '') + '></i>';
    return h;
  }
  function logLine(l) { return (l.p != null && S.players[l.p] ? '<b>' + esc(S.players[l.p].name) + '</b> ' : '') + esc(l.t); }

  function ensureGameDom() {
    if (document.getElementById('board')) return;
    var tiles = SP.map(function (sp, i) {
      var xy = tileXY(i), own = E.isOwnable(sp), corner = i % 7 === 0;
      return '<button class="tile' + (own ? '' : ' sp') + (corner ? ' corner' : '') + '" data-a="tile" data-i="' + i + '" id="t' + i + '" aria-label="' + esc(sp.n) + '" style="grid-column:' + (xy[0] + 1) + ';grid-row:' + (xy[1] + 1) + '">' +
        '<span class="band"' + (own ? ' style="background:' + E.GROUPS[sp.g].c + '"' : '') + '>' + (sp.t === 'prop' ? '<i></i><i></i><i></i>' : '') + '</span>' +
        '<span class="ico">' + sp.i + '</span><span class="pr">' + (own ? sp.p : sp.s) + '</span></button>';
    }).join('');
    app.innerHTML = '<div class="top"><h1>Token <b>Tycoons</b></h1><span id="conn"></span><button class="btn ghost small" data-a="menu" aria-label="Menu">Menu</button></div>' +
      '<div class="players" id="players"></div>' +
      '<div class="board-wrap"><div class="board" id="board">' + tiles +
      '<div class="core"><div class="turn" id="turn"></div><div class="dice"><div class="die" id="d0"></div><div class="die" id="d1"></div></div><div class="feed" id="feed"></div></div>' +
      '</div><div class="tokens" id="tokens"></div></div>' +
      '<div class="pad" id="pad"></div><div class="sect" id="stack"></div><div class="sect" id="log"></div><div id="sheet"></div>';
    setDice(S.roll ? S.roll.d : [1, 1]);
  }
  function setDice(d) { document.getElementById('d0').innerHTML = diceHtml(d[0]); document.getElementById('d1').innerHTML = diceHtml(d[1]); }

  function placeTokens() {
    var box = document.getElementById('tokens'), groups = {};
    if (box.children.length !== S.players.length) {
      box.innerHTML = S.players.map(function (p, i) { return '<div class="tok" id="k' + i + '" style="--pc:' + color(i) + '">' + TOKENS[p.tok % TOKENS.length] + '</div>'; }).join('');
    }
    S.players.forEach(function (p, i) { if (!p.out) (groups[disp[i]] = groups[disp[i]] || []).push(i); });
    S.players.forEach(function (p, i) {
      var el = document.getElementById('k' + i);
      el.classList.toggle('out', !!p.out);
      if (p.out) return;
      var g = groups[disp[i]], k = g.indexOf(i), t = document.getElementById('t' + disp[i]);
      var w = t.offsetWidth, spread = g.length > 1 ? w * 0.34 : 0;
      el.style.left = (t.offsetLeft + w / 2 + (k - (g.length - 1) / 2) * spread) + 'px';
      el.style.top = (t.offsetTop + t.offsetHeight / 2 + (g.length > 1 ? (k % 2 ? 1 : -1) * w * 0.12 : 0)) + 'px';
      el.style.zIndex = i === S.turn ? 3 : 2;
    });
  }

  function animateRoll(r) {
    ensureGameDom();
    shownRoll = r.seq;
    var d0 = document.getElementById('d0'), d1 = document.getElementById('d1');
    document.getElementById('pad').innerHTML = '<div class="wait">Rolling…</div>';
    d0.classList.add('rolling'); d1.classList.add('rolling');
    var spin = setInterval(function () { setDice([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]); }, 90);
    return sleep(650).then(function () {
      clearInterval(spin); d0.classList.remove('rolling'); d1.classList.remove('rolling'); setDice(r.d);
      var n = r.d[0] + r.d[1], k = 0;
      if (disp.length !== S.players.length) disp = S.players.map(function (p) { return p.pos; });
      disp[r.p] = r.from; placeTokens();
      function hop() {
        if (k >= n) return sleep(250);
        k++; disp[r.p] = (r.from + k) % E.N; placeTokens();
        return sleep(170).then(hop);
      }
      return sleep(300).then(hop);
    });
  }

  function renderGame() {
    ensureGameDom();
    var m = me(), cur = S.players[S.turn], mine = myTurn();
    // connection chip
    document.getElementById('conn').innerHTML = sess.mode === 'local' ? '' :
      '<span class="chip" title="' + esc(statusText()) + '"><span class="dot ' + (netStatus === 'online' ? 'on' : 'wait') + '"></span>' + esc(sess.code) + '</span>';
    // scoreboard
    document.getElementById('players').innerHTML = S.players.map(function (p, i) {
      var nw = E.netWorth(S, i);
      return '<div class="pl' + (i === S.turn && S.status === 'playing' ? ' active' : '') + (p.out ? ' out' : '') + '" style="--pc:' + color(i) + '">' +
        '<div class="pl-head"><span class="pl-tok">' + TOKENS[p.tok % TOKENS.length] + '</span><span class="pl-name">' + esc(p.name) + (i === m && sess.mode !== 'local' ? ' (you)' : '') + '</span></div>' +
        '<div class="pl-cash' + (p.cash < 0 ? ' neg' : '') + '">' + (p.out ? 'Bankrupt' : fmt(p.cash)) + '</div>' +
        '<div class="bar"><i style="width:' + Math.max(0, Math.min(100, nw / S.goal * 100)) + '%"></i></div>' +
        '<div class="pl-nw"><span>worth ' + fmt(nw) + '</span><span>/ ' + fmt(S.goal) + '</span></div></div>';
    }).join('');
    // tiles
    SP.forEach(function (sp, i) {
      var el = document.getElementById('t' + i), o = S.owned[i];
      el.classList.toggle('own', !!o);
      el.classList.toggle('here', S.status === 'playing' && cur.pos === i);
      if (!E.isOwnable(sp)) return;
      el.style.setProperty('--oc', o ? color(o.o) : 'transparent');
      el.querySelector('.pr').textContent = o ? E.rentAt(S, i) : sp.p;
      var pips = el.querySelectorAll('.band i');
      for (var k = 0; k < pips.length; k++) pips[k].classList.toggle('on', !!o && o.l > k);
    });
    placeTokens();
    setDice(S.roll ? S.roll.d : [1, 1]);
    // centre
    var turn = document.getElementById('turn');
    turn.style.setProperty('--tc', color(S.status === 'over' ? S.winner : S.turn));
    turn.textContent = S.status === 'over' ? S.players[S.winner].name + ' wins' : (mine && sess.mode !== 'local' ? 'Your turn' : cur.name + '\'s turn');
    document.getElementById('feed').innerHTML = S.log.length ? logLine(S.log[S.log.length - 1]) : 'Roll to start the race.';

    // action pad
    var pad = '', sp = SP[cur.pos];
    if (S.status === 'over') {
      pad = '<div class="win"><div class="label">Game over</div><h2>' + esc(S.players[S.winner].name) + ' wins</h2><p class="muted">Net worth ' + fmt(E.netWorth(S, S.winner)) + '</p></div>' +
        '<div class="row"><button class="btn" data-a="again">Play again</button><button class="btn ghost small" data-a="leave-now">Exit</button></div>';
    } else if (!mine) {
      pad = '<div class="wait">Waiting for ' + esc(cur.name) + '…</div>';
    } else if (S.phase === 'roll') {
      pad = '<div class="row"><button class="btn" data-a="roll">Roll dice</button></div>';
    } else if (S.phase === 'buy') {
      pad = '<p class="offer"><b>' + esc(sp.n) + '</b> is for sale. Rent starts at <span class="num">' + fmt(E.rentAt(S, cur.pos, 0, -1)) + '</span>.</p>' +
        '<div class="row"><button class="btn" data-a="buy">Buy ' + fmt(sp.p) + '</button><button class="btn ghost" data-a="pass">Skip</button></div>';
    } else if (cur.cash < 0) {
      var has = E.tilesOf(S, S.turn).length;
      pad = '<p class="offer err">You are ' + fmt(-cur.cash) + ' short. ' + (has ? 'Tap one of your tiles below and sell it to cover the debt.' : 'You have nothing left to sell.') + '</p>' +
        '<div class="row"><button class="btn danger" data-a="bankrupt">Declare bankruptcy</button></div>';
    } else {
      pad = '<div class="row"><button class="btn" data-a="end">' + (S.again ? 'Doubles! Roll again' : 'End turn') + '</button></div>';
    }
    document.getElementById('pad').innerHTML = pad;

    // my stack
    var who = m >= 0 ? m : S.turn, list = E.tilesOf(S, who), canUp = mine && list.some(function (i) { return SP[i].t === 'prop' && S.owned[i].l < E.MAX_LEVEL && cur.cash >= E.upCost(i); });
    document.getElementById('stack').innerHTML = '<div class="label">' + (sess.mode === 'local' ? esc(S.players[who].name) + '\'s tiles' : 'Your tiles') +
      (canUp && S.phase !== 'buy' ? ' · tap one to upgrade' : '') + '</div>' +
      (list.length ? '<div class="stack">' + list.map(function (i) {
        return '<button data-a="tile" data-i="' + i + '" style="--gc:' + E.GROUPS[SP[i].g].c + '"><span>' + SP[i].i + '</span><span class="nm">' + esc(SP[i].n) + '</span>' +
          (SP[i].t === 'prop' ? '<span class="ver">v' + (S.owned[i].l + 1) + '</span>' : '') + '<span class="rent">' + fmt(E.rentAt(S, i)) + '</span></button>';
      }).join('') + '</div>' : '<p class="note">Nothing yet. Land on a tile with a price to buy it.</p>');
    // log
    document.getElementById('log').innerHTML = '<div class="label">Recent moves</div><div class="log">' +
      S.log.slice(-7).reverse().map(function (l) { return '<div>' + logLine(l) + '</div>'; }).join('') + '</div>';
    renderSheet();
  }

  function renderSheet() {
    var box = document.getElementById('sheet');
    if (!box) return;
    if (!sheet) { box.innerHTML = ''; return; }
    var h = '';
    if (sheet.t === 'menu') {
      h = '<div class="sheet-head"><h2>Menu</h2></div>' +
        (sess.mode !== 'local' ? '<div class="kv"><span>Game code</span><b>' + esc(sess.code) + '</b></div><div class="kv"><span>Connection</span><b>' + esc(statusText()) + '</b></div>' +
          '<button class="btn ghost" data-a="share">Send invite link</button>' : '') +
        rulesHtml() +
        '<div class="row"><button class="btn danger" data-a="leave">' + (leaveArmed ? 'Tap again to leave' : 'Leave game') + '</button><button class="btn ghost" data-a="close">Close</button></div>';
    } else {
      var i = sheet.i, sp = SP[i], o = S.owned[i], mine = myTurn() && o && o.o === S.turn && S.phase !== 'buy';
      var g = sp.g ? E.GROUPS[sp.g] : null;
      h = '<div class="sheet-head"><div class="sheet-ico"' + (g ? ' style="--gc:' + g.c + '"' : '') + '>' + sp.i + '</div><div><div class="label">' + (g ? g.n + ' sector' : 'Special space') + '</div><h2>' + esc(sp.n) + '</h2></div></div>';
      if (!E.isOwnable(sp)) h += '<p>' + esc(sp.d) + '</p>';
      else {
        h += '<div class="kv"><span>Owner</span><b>' + (o ? esc(S.players[o.o].name) : 'For sale · ' + fmt(sp.p)) + '</b></div>';
        if (sp.t === 'prop') {
          var full = o && E.ownsGroup(S, o.o, sp.g);
          h += '<div class="label">Rent by version' + (full ? ' (doubled: full sector)' : '') + '</div><div class="rents">' + [0, 1, 2, 3].map(function (l) {
            return '<div' + (o && o.l === l ? ' class="cur"' : '') + '><span>V' + (l + 1) + '</span><b>' + fmt(E.rentAt(S, i, l, o ? o.o : -1)) + '</b></div>';
          }).join('') + '</div>' +
          '<p class="note">Each upgrade costs ' + fmt(E.upCost(i)) + '. Owning all ' + E.groupTiles(sp.g).length + ' ' + g.n + ' tiles doubles their rent.</p>';
        } else {
          h += '<div class="label">Rent by plants owned</div><div class="rents" style="grid-template-columns:repeat(3,minmax(0,1fr))">' + [1, 2, 3].map(function (k) {
            return '<div><span>' + k + ' OWNED</span><b>' + fmt(E.POWER_RENT[k]) + '</b></div>';
          }).join('') + '</div>';
        }
        if (mine) {
          var cur = S.players[S.turn], canUp = sp.t === 'prop' && o.l < E.MAX_LEVEL;
          h += '<div class="row">' + (canUp ? '<button class="btn" data-a="upgrade" data-i="' + i + '"' + (cur.cash < E.upCost(i) ? ' disabled' : '') + '>Upgrade ' + fmt(E.upCost(i)) + '</button>' : '') +
            '<button class="btn danger" data-a="sell" data-i="' + i + '">Sell for ' + fmt(E.sellValue(S, i)) + '</button></div>';
        }
      }
      h += '<button class="btn ghost" data-a="close">Close</button>';
    }
    box.innerHTML = '<div class="scrim" data-a="scrim"><div class="sheet" role="dialog" aria-modal="true">' + h + '</div></div>';
  }

  /* ---------------- input ---------------- */
  function readInputs() {
    var n = document.getElementById('name'); if (n) prefs.name = n.value.trim().slice(0, 14);
    for (var k = 1; k < 4; k++) { var el = document.getElementById('ln' + k); if (el) prefs.local[k] = el.value.trim().slice(0, 14); }
    store.set('tt_prefs', prefs);
  }
  function share() {
    var url = inviteUrl(), text = 'Join my Token Tycoons game. Code: ' + sess.code;
    if (navigator.share) { navigator.share({ title: 'Token Tycoons', text: text, url: url }).catch(function () {}); return; }
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast('Link copied'); }, function () { toast('Copy the link shown below'); });
  }
  function toast(t) { var el = document.querySelector('[data-a="share"]'); if (el) { var o = el.textContent; el.textContent = t; setTimeout(function () { el.textContent = o; }, 1600); } }

  app.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-a]'); if (!el) return;
    var a = el.getAttribute('data-a'), i = Number(el.getAttribute('data-i')), v = Number(el.getAttribute('data-v'));
    if (a === 'scrim') { if (ev.target === el) { sheet = null; leaveArmed = false; renderSheet(); } return; }
    if (a !== 'leave') leaveArmed = false;
    switch (a) {
      case 'tok': readInputs(); prefs.tok = i; store.set('tt_prefs', prefs); renderHome(); break;
      case 'goal': readInputs(); prefs.goal = v; store.set('tt_prefs', prefs); renderHome(); break;
      case 'count': readInputs(); prefs.count = v; store.set('tt_prefs', prefs); renderHome(); break;
      case 'host':
        readInputs();
        start('host', newCode(), { status: 'lobby', seq: 0, goal: prefs.goal, players: [{ id: pid, name: prefs.name || 'Player 1', tok: prefs.tok }] });
        break;
      case 'join':
        readInputs();
        var code = (document.getElementById('code').value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (code.length !== 4) { homeErr = 'Enter the 4-character code from the host\'s screen.'; renderHome(); break; }
        start('guest', code, null);
        break;
      case 'local':
        readInputs();
        var ps = []; for (var k = 0; k < prefs.count; k++) ps.push({ id: 'local' + k, name: (k ? prefs.local[k] : prefs.name) || 'Player ' + (k + 1), tok: (prefs.tok + k) % TOKENS.length });
        start('local', '', E.newGame(ps, prefs.goal, Math.random));
        break;
      case 'resume': var sv = store.get('tt_sess'); if (sv) start(sv.mode, sv.code, sv.S); break;
      case 'discard': store.del('tt_sess'); renderHome(); break;
      case 'leave-now': leave(); break;
      case 'leave': if (leaveArmed) leave(); else { leaveArmed = true; renderSheet(); } break;
      case 'share': share(); break;
      case 'menu': sheet = { t: 'menu' }; renderSheet(); break;
      case 'close': sheet = null; renderSheet(); break;
      case 'tile': sheet = { t: 'tile', i: i }; renderSheet(); break;
      case 'again':
        if (busy) break;
        commit(E.newGame(S.players, S.goal, Math.random, S.seq + 1));
        break;
      case 'roll': case 'buy': case 'pass': case 'end': case 'bankrupt': act({ t: a }); break;
      case 'upgrade': case 'sell': act({ t: a, i: i }); if (S.owned[i]) { sheet = { t: 'tile', i: i }; renderSheet(); } break;
    }
  });
  app.addEventListener('input', function (ev) { if (ev.target.id === 'code') ev.target.value = ev.target.value.toUpperCase(); });

  window.addEventListener('resize', function () { if (S && S.players && document.getElementById('tokens') && !busy) placeTokens(); });
  render();
})();
