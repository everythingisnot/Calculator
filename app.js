/* Token Tycoons UI + phone-to-phone sync.
   Sync model: whoever acts computes the next state with the engine and sends the whole
   state to the other phone. The higher `seq` always wins. */
(function () {
  'use strict';
  var E = window.Engine, CARDS = E.CARDS, SECT = E.SECT, ORDER = E.ORDER, ACTS = E.ACTS;
  var app = document.getElementById('app');
  var COLORS = ['#ffb020', '#4cc9f0', '#ff7ab8', '#b79cff'];
  var TOKENS = ['🤖', '🧠', '🛰️', '👾'];
  // Inside a Claude artifact preview the browser sandbox blocks phone-to-phone connections.
  var SANDBOX = !!(window.claude && window.claude.use);

  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  var pid = store.get('tt_pid');
  if (!pid) { pid = Math.random().toString(36).slice(2, 10); store.set('tt_pid', pid); }
  var prefs = store.get('tt_prefs2') || { name: '', tok: 0, p2: '' };

  var S = null;            // game state (null until known)
  var sess = null;         // { mode: 'local' | 'host' | 'guest', code }
  var net = null, netStatus = '';
  var sheet = null, homeErr = '', leaveArmed = false;
  var seen = -1;           // pass-and-play: which player has confirmed they hold the phone
  var payFor = -1;         // seq of the debt the pay sheet was last opened for

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return '₮' + n; }
  function me() {
    if (!S || !S.players) return -1;
    for (var i = 0; i < S.players.length; i++) if (S.players[i].id === pid) return i;
    return -1;
  }
  /** Whose cards this phone is showing. */
  function viewer() { if (sess.mode === 'local') return E.actor(S); var m = me(); return m < 0 ? 0 : m; }
  function canAct() { return S && S.status === 'playing' && (sess.mode === 'local' || me() === E.actor(S)); }
  function color(i) { return COLORS[S.players[i].tok % COLORS.length]; }
  function save() { if (sess) store.set('tt_sess2', { mode: sess.mode, code: sess.code, S: S }); }

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
    var hostId = 'token-tycoons-cards-v1-' + code;
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
          var nm = String(m.name).slice(0, 14).trim() || 'Player 2';
          S = E.newGame([host, { id: m.pid, name: nm === host.name ? nm + ' 2' : nm, tok: tok }], Math.random, S.seq + 1);
        } else {
          // Someone rejoined from a new browser: hand them the other seat.
          var seat = S.players.filter(function (p) { return p.id !== pid; })[0];
          if (seat) { seat.id = m.pid; S.seq++; }
        }
      }
      commit(S);
    } else if (m.t === 'state' && m.s && (!S || S.status === 'lobby' || m.s.seq > S.seq)) {
      var mine = canAct();
      S = m.s; save();
      if (!mine && canAct() && navigator.vibrate) { try { navigator.vibrate(60); } catch (e) {} }
      if (sheet && sheet.t !== 'menu') sheet = null;
      render();
    }
  }
  function onStatus(st) { netStatus = st; render(); }

  /* ---------------- state changes ---------------- */
  function commit(next) {
    S = next; save();
    if (net) net.send({ t: 'state', s: S });
    render();
  }
  function act(a) {
    if (!canAct()) return;
    var next = E.apply(S, a, Math.random, E.actor(S));
    if (next) { sheet = null; commit(next); }
  }
  function start(mode, code, state) {
    sess = { mode: mode, code: code }; S = state; sheet = null; homeErr = ''; leaveArmed = false; seen = -1; payFor = -1;
    save();
    if (mode !== 'local') {
      netStatus = 'connecting';
      loadPeer().then(function () { if (sess && sess.code === code) net = Net(mode, code, onMsg, onStatus); },
        function () { netStatus = 'unsupported'; render(); });
    }
    render();
  }
  function leave() {
    if (net) { net.close(); net = null; }
    sess = null; S = null; sheet = null; store.del('tt_sess2');
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
      '<li><b>Goal:</b> be first to complete ' + E.WIN_STACKS + ' stacks. A stack is a full set of assets from one sector (2 or 3 cards, shown on each slot).</li>' +
      '<li><b>Your turn:</b> you draw 2 cards automatically, then play up to ' + E.PLAYS + ' cards, then end your turn.</li>' +
      '<li><b>Assets</b> go on the table to build stacks. Wild cards can stand in for the sectors printed on them.</li>' +
      '<li><b>Funding</b> and any action card can go in your bank as money. Bank money is what you pay with.</li>' +
      '<li><b>Actions</b> charge your rival, take their assets, or draw cards. Tap a card to read what it does.</li>' +
      '<li><b>Paying:</b> you choose which bank cards or table assets to hand over. No change is given. Cards in your hand are safe.</li>' +
      '<li><b>Guardrail</b> cancels an action played against you. Your rival can cancel it back with their own.</li>' +
      '<li>End your turn with more than ' + E.HAND_LIMIT + ' cards and you discard down to ' + E.HAND_LIMIT + '. With an empty hand you draw 5 next turn.</li>' +
      '</ul></details>';
  }

  function renderHome() {
    var saved = store.get('tt_sess2'), hashCode = (location.hash || '').replace('#', '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    var h = '<div class="hero"><div class="label">A card game about the AI boom</div>' +
      '<div class="logo">Token<span>Tycoons</span></div>' +
      '<p class="muted">Collect assets, bank your funding, and hit your rival with invoices, lawsuits and takeovers. First to ' + E.WIN_STACKS + ' complete stacks wins.</p></div>';
    if (saved && saved.S && saved.S.status === 'playing') {
      h += '<div class="panel"><div class="label">Game in progress' + (saved.mode === 'local' ? '' : ' · code ' + esc(saved.code)) + '</div>' +
        '<div class="row"><button class="btn" data-a="resume">Resume game</button><button class="btn ghost small" data-a="discard-save">Discard</button></div></div>';
    }
    h += '<div class="panel">' +
      '<label class="field"><span class="label">Your name</span><input class="input" id="name" maxlength="14" autocomplete="off" placeholder="e.g. Sam" value="' + esc(prefs.name) + '"></label>' +
      '<div class="field"><span class="label">Your colour</span><div class="picks">' + TOKENS.map(function (t, i) {
        return '<button class="pick" data-a="tok" data-i="' + i + '" aria-pressed="' + (prefs.tok === i) + '" aria-label="Colour ' + (i + 1) + '" style="box-shadow: inset 0 -4px 0 ' + COLORS[i] + '">' + t + '</button>';
      }).join('') + '</div></div></div>';
    if (SANDBOX) {
      h += '<div class="panel"><div class="label">Two phones</div><p class="note">Phone-to-phone play is switched off in this preview. It works in the hosted version of the game. You can still try it here by passing one phone back and forth.</p></div>';
    } else {
      h += '<div class="panel"><div class="label">Two phones</div>' +
        '<button class="btn" data-a="host">Host a game</button>' +
        '<div class="row"><input class="input code" id="code" maxlength="4" autocomplete="off" autocapitalize="characters" placeholder="CODE" aria-label="Game code" value="' + esc(hashCode) + '">' +
        '<button class="btn ghost" data-a="join">Join</button></div>' +
        (homeErr ? '<p class="err">' + esc(homeErr) + '</p>' : '') +
        '<p class="note">One of you hosts and shares the 4-character code. The other types it here and taps Join.</p></div>';
    }
    h += '<div class="panel"><div class="label">One phone, pass and play</div>' +
      '<input class="input" id="p2" maxlength="14" autocomplete="off" placeholder="Player 2 name" aria-label="Player 2 name" value="' + esc(prefs.p2 || '') + '">' +
      '<button class="btn ghost" data-a="local">Start on this phone</button></div>';
    h += '<div class="panel">' + rulesHtml() + '</div>';
    app.innerHTML = h;
  }

  function statusText() {
    return { connecting: 'Connecting…', waiting: 'Waiting for the other phone…', online: 'Connected', nohost: 'Looking for the host…', unsupported: 'This browser cannot connect' }[netStatus] || '';
  }
  function renderConnecting() {
    app.innerHTML = '<div class="hero"><div class="label">Joining game</div><div class="bigcode">' + esc(sess.code) + '</div></div>' +
      '<div class="panel"><p><span class="dot wait" style="margin-right:8px"></span>' + esc(statusText()) + '</p>' +
      (netStatus === 'nohost' ? '<p class="note">No game is open with that code yet. Check the code, and make sure the host\'s phone has the game on screen. Still trying.</p>' : '') +
      (netStatus === 'unsupported' ? '<p class="err">This browser does not support phone-to-phone connections. Try Safari or Chrome.</p>' : '') +
      '<button class="btn ghost" data-a="leave-now">Back</button></div>';
  }
  function renderLobby() {
    app.innerHTML = '<div class="hero"><div class="label">Your game code</div><div class="bigcode">' + esc(sess.code) + '</div></div>' +
      '<div class="panel"><p><span class="dot ' + (netStatus === 'waiting' ? 'on' : 'wait') + '" style="margin-right:8px"></span>' +
      (netStatus === 'waiting' ? 'Ready. Waiting for player 2 to join…' : esc(statusText())) + '</p>' +
      '<p class="note">On the other phone, open this same page, type the code and tap Join. Or send the invite link. Keep this screen open.</p>' +
      '<div class="row"><button class="btn" data-a="share">Send invite link</button><button class="btn ghost small" data-a="leave-now">Cancel</button></div>' +
      '<p class="note num" style="word-break:break-all;user-select:all">' + esc(inviteUrl()) + '</p></div>';
  }

  /* ---- cards ---- */
  function band(k) {
    if (k.k === 'asset') return SECT[k.g].c;
    if (k.k !== 'wild') return '';
    var n = k.gs.length;
    return 'linear-gradient(90deg,' + k.gs.map(function (g, i) { return SECT[g].c + ' ' + (i / n * 100) + '% ' + ((i + 1) / n * 100) + '%'; }).join(',') + ')';
  }
  function kindText(k) {
    if (k.k === 'asset') return SECT[k.g].n;
    if (k.k === 'wild') return k.gs.length > 2 ? 'Wild · any' : 'Wild · ' + k.gs.map(function (g) { return SECT[g].n; }).join(' / ');
    return k.k === 'cash' ? 'Bank it' : 'Action';
  }
  function cardHtml(c, big) {
    var k = CARDS[c], b = band(k);
    return '<button class="card ' + k.k + (big ? ' big' : '') + '"' + (big ? ' disabled style="opacity:1"' : ' data-a="card" data-c="' + c + '"') + ' aria-label="' + esc(k.n) + '">' +
      '<span class="cb"' + (b ? ' style="background:' + b + '"' : '') + '></span>' +
      (k.v ? '<span class="cv">' + money(k.v) + '</span>' : '') +
      '<span class="ci">' + (k.k === 'cash' ? k.v : k.i) + '</span><span class="cn">' + esc(k.k === 'cash' ? 'Funding' : k.n) + '</span><span class="ct">' + esc(kindText(k)) + '</span></button>';
  }
  function logLine(l) { return (l.p != null && S.players[l.p] ? '<b>' + esc(S.players[l.p].name) + '</b> ' : '') + esc(l.t); }

  function sideHtml(i, isViewer) {
    var p = S.players[i], active = S.status === 'playing' && E.actor(S) === i;
    return '<section class="side' + (active ? ' active' : '') + '" style="--pc:' + color(i) + '">' +
      '<div class="side-head"><span class="tokn">' + TOKENS[p.tok % TOKENS.length] + '</span>' +
      '<span class="side-name">' + esc(p.name) + (isViewer && sess.mode !== 'local' ? ' (you)' : '') + '</span>' +
      '<span class="stat"><small>Hand</small>' + p.hand.length + '</span>' +
      '<button class="stat" data-a="bank" data-i="' + i + '"><small>Bank</small>' + money(E.bankTotal(p)) + '</button>' +
      '<span class="stat"><small>Stacks</small>' + E.stacks(p) + '/' + E.WIN_STACKS + '</span></div>' +
      '<div class="slots">' + ORDER.map(function (g) {
        var cards = p.sets[g], full = E.isComplete(p, g);
        return '<button class="slot' + (cards.length ? '' : ' empty') + (full ? ' full' : '') + '" data-a="stack" data-i="' + i + '" data-g="' + g + '" style="--gc:' + SECT[g].c + '">' +
          '<span class="sh"><span>' + SECT[g].n + '</span><b>' + cards.length + '/' + SECT[g].size + '</b></span>' +
          '<span class="sc">' + cards.map(function (c) { return '<span>' + CARDS[c].i + '</span>'; }).join('') + p.ups[g].map(function () { return '<span>🎚️</span>'; }).join('') +
          (cards.length ? '<em>' + money(E.rent(p, g)) + '</em>' : '') + '</span></button>';
      }).join('') + '</div></section>';
  }

  function padHtml(v) {
    var act = E.actor(S), pd = S.pending, P = S.players, h = '';
    if (S.status === 'over') {
      return '<div class="win"><div class="label">Game over</div><h2>' + esc(P[S.winner].name) + ' wins</h2><p class="muted">' + E.WIN_STACKS + ' complete stacks</p></div>' +
        '<div class="row"><button class="btn" data-a="again">Play again</button><button class="btn ghost small" data-a="leave-now">Exit</button></div>';
    }
    if (!canAct()) {
      return '<div class="wait">' + (pd ? esc(P[act].name) + ' is deciding…' : 'Waiting for ' + esc(P[act].name) + '…') + '</div>';
    }
    if (S.phase === 'play') {
      var left = E.PLAYS - S.plays, pips = '';
      for (var k = 0; k < E.PLAYS; k++) pips += '<i' + (k < left ? '' : ' class="used"') + '></i>';
      h = '<p class="msg">' + (left ? 'Tap a card in your hand to play it. Plays left' : 'No plays left') + '<span class="pips">' + pips + '</span>' + (S.hype ? ' · next Invoice is doubled' : '') + '</p>' +
        '<div class="row"><button class="btn' + (left ? ' ghost' : '') + '" data-a="end">End turn</button></div>';
    } else if (S.phase === 'discard') {
      h = '<p class="msg err">You have too many cards. Tap ' + (P[act].hand.length - E.HAND_LIMIT) + ' more to discard.</p>';
    } else if (pd.stage === 'block') {
      if (pd.to === pd.target) {
        h = '<p class="msg"><b>' + esc(P[pd.from].name) + '</b> ' + esc(pd.text) + '</p>' +
          '<div class="row"><button class="btn" data-a="block">Block with Guardrail</button><button class="btn ghost" data-a="accept">Allow it</button></div>';
      } else {
        h = '<p class="msg"><b>' + esc(P[pd.target].name) + '</b> blocked ' + esc(pd.label) + ' with a Guardrail.</p>' +
          '<div class="row"><button class="btn" data-a="block">Counter with Guardrail</button><button class="btn ghost" data-a="accept">Let it go</button></div>';
      }
    } else {
      h = '<p class="msg"><b>' + esc(P[pd.from].name) + '</b> ' + esc(pd.text) + ' You owe ' + money(pd.amt) + '.</p>' +
        '<div class="row"><button class="btn" data-a="paysheet">Choose what to pay</button></div>';
    }
    return h;
  }

  function renderGame() {
    var v = viewer(), o = 1 - v, act = E.actor(S), P = S.players;
    var handEl = document.getElementById('hand'), scroll = handEl ? handEl.scrollLeft : 0;
    if (canAct() && S.phase === 'respond' && S.pending.stage === 'pay' && payFor !== S.seq && !(sess.mode === 'local' && seen !== act)) {
      payFor = S.seq; sheet = { t: 'pay', sel: [] };
    }
    var last = S.log.length ? logLine(S.log[S.log.length - 1]) : 'Cards are dealt.';
    var turnLabel = S.status === 'over' ? P[S.winner].name + ' wins' : (S.turn === v && sess.mode !== 'local' ? 'Your turn' : P[S.turn].name + '\'s turn');
    app.innerHTML = '<div class="top"><h1>Token <b>Tycoons</b></h1>' +
      (sess.mode === 'local' ? '' : '<span class="chip" title="' + esc(statusText()) + '"><span class="dot ' + (netStatus === 'online' ? 'on' : 'wait') + '"></span>' + esc(sess.code) + '</span>') +
      '<button class="btn ghost small" data-a="menu">Menu</button></div>' +
      sideHtml(o, false) +
      '<div class="mid"><div class="deck" title="Cards left in the deck">' + S.deck.length + '</div>' +
      '<div class="feed"><span class="turnline" style="--tc:' + color(S.status === 'over' ? S.winner : S.turn) + '">' + esc(turnLabel) + '</span>' + last + '</div></div>' +
      sideHtml(v, true) +
      '<div class="pad">' + padHtml(v) + '</div>' +
      '<div class="label">' + (sess.mode === 'local' ? esc(P[v].name) + '\'s hand' : 'Your hand') + ' · ' + P[v].hand.length + ' cards</div>' +
      '<div class="hand" id="hand">' + (P[v].hand.length ? P[v].hand.map(function (c) { return cardHtml(c); }).join('') : '<p class="note">No cards in hand.</p>') + '</div>' +
      '<div class="label">Recent moves</div><div class="log">' + S.log.slice(-8).reverse().map(function (l) { return '<div>' + logLine(l) + '</div>'; }).join('') + '</div>' +
      '<div id="sheet"></div>' +
      (sess.mode === 'local' && S.status === 'playing' && seen !== act ?
        '<div class="cover"><div><div class="label">Pass the phone to</div><h2 style="color:' + color(act) + '">' + esc(P[act].name) + '</h2>' +
        '<p class="muted">' + (S.phase === 'respond' ? 'Something needs your answer.' : 'It is your turn.') + ' Make sure the other player is not looking.</p>' +
        '<button class="btn" data-a="reveal">Show my cards</button></div></div>' : '');
    var nh = document.getElementById('hand'); if (nh) nh.scrollLeft = scroll;
    renderSheet();
  }

  function optBtn(label, attrs, cls) { return '<button class="btn wide ' + (cls || 'ghost') + '" ' + attrs + '>' + label + '</button>'; }

  function cardSheet(c) {
    var k = CARDS[c], v = viewer(), meP = S.players[v], opp = S.players[1 - v];
    var mine = canAct() && E.actor(S) === v && meP.hand.indexOf(c) >= 0;
    var desc = k.k === 'act' ? ACTS[k.a].d :
      k.k === 'cash' ? 'Money for your bank. You pay invoices and lawsuits from your bank.' :
      k.k === 'asset' ? 'A ' + SECT[k.g].n + ' asset. Collect ' + SECT[k.g].size + ' to complete the stack. Rent by cards owned: ' + SECT[k.g].rent.map(money).join(' / ') + '.' :
      'Wild asset. Counts as ' + (k.gs.length > 2 ? 'any sector' : k.gs.map(function (g) { return SECT[g].n; }).join(' or ')) + '. You can move it between stacks on your turn.' + (k.v ? '' : ' It has no money value, so it can never be taken as payment.');
    var h = '<div class="sheet-head">' + cardHtml(c, true) + '<div><div class="label">' + esc(kindText(k)) + (k.v ? ' · worth ' + money(k.v) : '') + '</div><h2>' + esc(k.n) + '</h2><p style="margin-top:6px">' + esc(desc) + '</p></div></div><div class="opts">';
    var a = ' data-c="' + c + '"';
    if (mine && S.phase === 'discard') h += optBtn('Discard this card', 'data-a="discard"' + a, 'danger');
    else if (mine && S.phase === 'play' && S.plays >= E.PLAYS) h += '<p class="note">You have used all ' + E.PLAYS + ' plays this turn.</p>';
    else if (mine && S.phase === 'play') {
      if (k.k === 'cash') h += optBtn('Put ' + money(k.v) + ' in my bank', 'data-a="do-bank"' + a, '');
      else if (k.k === 'asset') h += optBtn('Add to my ' + SECT[k.g].n + ' stack', 'data-a="do-asset"' + a, '');
      else if (k.k === 'wild') h += k.gs.map(function (g) { return optBtn('Play as ' + SECT[g].n + ' (' + meP.sets[g].length + '/' + SECT[g].size + ')', 'data-a="do-asset" data-g="' + g + '"' + a); }).join('');
      else {
        var kind = k.a, n = 0;
        if (kind === 'fund' || kind === 'lawsuit' || kind === 'halluc' || kind === 'scrape') { h += optBtn('Play ' + esc(k.n), 'data-a="do-act"' + a, ''); n++; }
        else if (kind === 'hype') { if (!S.hype) { h += optBtn('Play Hype Cycle', 'data-a="do-act"' + a, ''); n++; } }
        else if (kind === 'invoice') ORDER.forEach(function (g) {
          if (meP.sets[g].length) { h += optBtn('Charge ' + money(E.rent(meP, g) * (S.hype ? 2 : 1)) + ' for ' + SECT[g].n, 'data-a="do-act" data-g="' + g + '"' + a); n++; }
        });
        else if (kind === 'tune') ORDER.forEach(function (g) {
          if (E.isComplete(meP, g) && meP.ups[g].length < E.MAX_TUNES) { h += optBtn('Fine-tune my ' + SECT[g].n + ' stack', 'data-a="do-act" data-g="' + g + '"' + a); n++; }
        });
        else if (kind === 'takeover') ORDER.forEach(function (g) {
          if (E.isComplete(opp, g)) { h += optBtn('Take ' + esc(opp.name) + '\'s ' + SECT[g].n + ' stack', 'data-a="do-act" data-g="' + g + '"' + a); n++; }
        });
        else if (kind === 'poach') E.loose(opp).forEach(function (x) {
          h += optBtn('Take ' + CARDS[x].i + ' ' + esc(CARDS[x].n) + ' (' + SECT[E.sectorOf(opp, x)].n + ')', 'data-a="do-act" data-x="' + x + '"' + a); n++;
        });
        else if (kind === 'merger') {
          var theirs = E.loose(opp), ours = E.loose(meP);
          if (theirs.length && ours.length) {
            n++;
            h += '<div class="label">You get</div>' + theirs.map(function (x) { return '<button class="btn wide ghost" aria-pressed="' + (sheet.x === x) + '" data-a="pick-x" data-x="' + x + '">' + CARDS[x].i + ' ' + esc(CARDS[x].n) + '</button>'; }).join('') +
              '<div class="label">You give</div>' + ours.map(function (y) { return '<button class="btn wide ghost" aria-pressed="' + (sheet.y === y) + '" data-a="pick-y" data-x="' + y + '">' + CARDS[y].i + ' ' + esc(CARDS[y].n) + '</button>'; }).join('') +
              '<button class="btn wide" data-a="do-merger"' + a + (sheet.x == null || sheet.y == null ? ' disabled' : '') + '>Propose the swap</button>';
          }
        }
        if (kind === 'guard') h += '<p class="note">You will be offered this automatically when your rival plays an action against you.</p>';
        else if (!n) h += '<p class="note">Nothing to use this on right now.</p>';
        h += optBtn('Bank it as ' + money(k.v), 'data-a="do-bank"' + a);
      }
    }
    return h + optBtn('Close', 'data-a="close"') + '</div>';
  }

  function renderSheet() {
    var box = document.getElementById('sheet');
    if (!box) return;
    if (!sheet) { box.innerHTML = ''; return; }
    var h = '', v = viewer(), P = S.players;
    if (sheet.t === 'menu') {
      h = '<div class="sheet-head"><h2>Menu</h2></div>' +
        (sess.mode !== 'local' ? '<div class="kv"><span>Game code</span><b>' + esc(sess.code) + '</b></div><div class="kv"><span>Connection</span><b>' + esc(statusText()) + '</b></div>' +
          '<button class="btn ghost" data-a="share">Send invite link</button>' : '') +
        rulesHtml() +
        '<div class="row"><button class="btn danger" data-a="leave">' + (leaveArmed ? 'Tap again to leave' : 'Leave game') + '</button><button class="btn ghost" data-a="close">Close</button></div>';
    } else if (sheet.t === 'card') {
      h = cardSheet(sheet.c);
    } else if (sheet.t === 'bank') {
      var bp = P[sheet.i];
      h = '<div class="sheet-head"><h2>' + esc(bp.name) + '\'s bank · ' + money(E.bankTotal(bp)) + '</h2></div>' +
        (bp.bank.length ? '<div class="opts">' + bp.bank.slice().sort(function (a, b) { return CARDS[b].v - CARDS[a].v; }).map(function (c) {
          return '<div class="kv"><span>' + CARDS[c].i + ' ' + esc(CARDS[c].n) + '</span><b>' + money(CARDS[c].v) + '</b></div>';
        }).join('') + '</div>' : '<p class="note">The bank is empty.</p>') + optBtn('Close', 'data-a="close"');
    } else if (sheet.t === 'stack') {
      var sp = P[sheet.i], g = sheet.g, sc = SECT[g], cards = sp.sets[g], myMove = canAct() && S.phase === 'play' && sheet.i === v && E.actor(S) === v;
      h = '<div class="sheet-head"><div><div class="label">' + esc(sp.name) + '\'s stack</div><h2 style="color:' + sc.c + ';filter:brightness(1.5)">' + sc.n + ' · ' + cards.length + '/' + sc.size + '</h2></div></div>' +
        '<div class="kv"><span>Rent by cards owned</span><b>' + sc.rent.map(money).join(' / ') + '</b></div>' +
        '<div class="kv"><span>Rent right now</span><b>' + money(E.rent(sp, g)) + (sp.ups[g].length ? ' (incl. ' + sp.ups[g].length + ' fine-tune)' : '') + '</b></div>' +
        (E.isComplete(sp, g) ? '<p class="note">Complete. Safe from Poach and Merger, but not from a Hostile Takeover.</p>' : '') +
        '<div class="opts">' + (cards.length ? cards.map(function (c) {
          var k = CARDS[c], row = '<div class="kv"><span>' + k.i + ' ' + esc(k.n) + (k.k === 'wild' ? ' (wild)' : '') + '</span><b>' + (k.v ? money(k.v) : 'no value') + '</b></div>';
          if (myMove && k.k === 'wild') row += k.gs.filter(function (x) { return x !== g; }).map(function (x) { return optBtn('Move ' + esc(k.n) + ' to ' + SECT[x].n, 'data-a="do-move" data-c="' + c + '" data-g="' + x + '"'); }).join('');
          return row;
        }).join('') : '<p class="note">No cards here yet.</p>') + optBtn('Close', 'data-a="close"') + '</div>';
    } else if (sheet.t === 'pay') {
      var pd = S.pending, payer = P[E.actor(S)], all = E.payable(payer), sum = sheet.sel.reduce(function (a, c) { return a + CARDS[c].v; }, 0);
      var ok = sum >= pd.amt || sheet.sel.length === all.length;
      h = '<div class="sheet-head"><div><div class="label">You owe ' + esc(P[pd.from].name) + '</div><h2>Pay ' + money(pd.amt) + '</h2></div></div>' +
        '<p class="note">Pick cards from your bank or your table that add up to at least ' + money(pd.amt) + '. No change is given. Assets you hand over go to your rival\'s stacks.</p>' +
        '<div class="opts">' + all.map(function (c) {
          var k = CARDS[c], where = payer.bank.indexOf(c) >= 0 ? 'bank' : SECT[E.sectorOf(payer, c)].n + ' asset';
          return '<button class="btn wide ghost" style="display:flex;justify-content:space-between;text-transform:none" aria-pressed="' + (sheet.sel.indexOf(c) >= 0) + '" data-a="pay-toggle" data-c="' + c + '"><span>' + k.i + ' ' + esc(k.n) + ' · ' + where + '</span><span class="num">' + money(k.v) + '</span></button>';
        }).join('') +
        '<button class="btn wide" data-a="do-pay"' + (ok ? '' : ' disabled') + '>Pay ' + money(sum) + (ok ? '' : ' (need ' + money(pd.amt) + ')') + '</button></div>';
    }
    box.innerHTML = '<div class="scrim" data-a="scrim"><div class="sheet" role="dialog" aria-modal="true">' + h + '</div></div>';
  }

  /* ---------------- input ---------------- */
  function readInputs() {
    var n = document.getElementById('name'); if (n) prefs.name = n.value.trim().slice(0, 14);
    var p2 = document.getElementById('p2'); if (p2) prefs.p2 = p2.value.trim().slice(0, 14);
    store.set('tt_prefs2', prefs);
  }
  function share() {
    var url = inviteUrl(), text = 'Join my Token Tycoons game. Code: ' + sess.code;
    if (navigator.share) { navigator.share({ title: 'Token Tycoons', text: text, url: url }).catch(function () {}); return; }
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast('Link copied'); }, function () { toast('Copy the link shown below'); });
  }
  function toast(t) { var el = document.querySelector('[data-a="share"]'); if (el) { var o = el.textContent; el.textContent = t; setTimeout(function () { el.textContent = o; }, 1600); } }
  function num(el, name) { var v = el.getAttribute(name); return v == null ? undefined : Number(v); }

  app.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-a]'); if (!el) return;
    var a = el.getAttribute('data-a'), i = num(el, 'data-i'), c = num(el, 'data-c'), x = num(el, 'data-x'), g = el.getAttribute('data-g') || undefined;
    if (a === 'scrim') { if (ev.target === el) { sheet = null; leaveArmed = false; renderSheet(); } return; }
    if (a !== 'leave') leaveArmed = false;
    switch (a) {
      case 'tok': readInputs(); prefs.tok = i; store.set('tt_prefs2', prefs); renderHome(); break;
      case 'host':
        readInputs();
        start('host', newCode(), { status: 'lobby', seq: 0, players: [{ id: pid, name: prefs.name || 'Player 1', tok: prefs.tok }] });
        break;
      case 'join':
        readInputs();
        var code = (document.getElementById('code').value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (code.length !== 4) { homeErr = 'Enter the 4-character code from the host\'s screen.'; renderHome(); break; }
        start('guest', code, null);
        break;
      case 'local':
        readInputs();
        var n1 = prefs.name || 'Player 1', n2 = prefs.p2 || 'Player 2';
        start('local', '', E.newGame([{ id: 'local0', name: n1, tok: prefs.tok }, { id: 'local1', name: n2 === n1 ? n2 + ' 2' : n2, tok: (prefs.tok + 1) % TOKENS.length }], Math.random));
        break;
      case 'resume': var sv = store.get('tt_sess2'); if (sv) start(sv.mode, sv.code, sv.S); break;
      case 'discard-save': store.del('tt_sess2'); renderHome(); break;
      case 'leave-now': leave(); break;
      case 'leave': if (leaveArmed) leave(); else { leaveArmed = true; renderSheet(); } break;
      case 'share': share(); break;
      case 'reveal': seen = E.actor(S); render(); break;
      case 'menu': sheet = { t: 'menu' }; renderSheet(); break;
      case 'close': sheet = null; renderSheet(); break;
      case 'card': sheet = { t: 'card', c: c }; renderSheet(); break;
      case 'bank': sheet = { t: 'bank', i: i }; renderSheet(); break;
      case 'stack': sheet = { t: 'stack', i: i, g: g }; renderSheet(); break;
      case 'paysheet': sheet = { t: 'pay', sel: [] }; renderSheet(); break;
      case 'pay-toggle':
        var at = sheet.sel.indexOf(c); if (at >= 0) sheet.sel.splice(at, 1); else sheet.sel.push(c);
        renderSheet(); break;
      case 'pick-x': sheet.x = x; renderSheet(); break;
      case 'pick-y': sheet.y = x; renderSheet(); break;
      case 'again': commit(E.newGame(S.players, Math.random, S.seq + 1)); seen = -1; render(); break;
      case 'end': case 'block': case 'accept': act({ t: a }); break;
      case 'discard': act({ t: 'discard', c: c }); break;
      case 'do-bank': act({ t: 'bank', c: c }); break;
      case 'do-asset': act({ t: 'asset', c: c, g: g }); break;
      case 'do-move': act({ t: 'move', c: c, g: g }); break;
      case 'do-act': act({ t: 'act', c: c, g: g, x: x }); break;
      case 'do-merger': act({ t: 'act', c: c, x: sheet.x, y: sheet.y }); break;
      case 'do-pay': act({ t: 'pay', cards: sheet.sel.slice() }); break;
    }
  });
  app.addEventListener('input', function (ev) { if (ev.target.id === 'code') ev.target.value = ev.target.value.toUpperCase(); });

  render();
})();
