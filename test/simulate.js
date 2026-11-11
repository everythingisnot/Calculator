// Sanity + length check: plays full games with simple random bots.
const E = require('../engine.js');
function rng(seed){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
const pick=(a,r)=>a[Math.floor(r()*a.length)];
function play(seed){
  const r=rng(seed); let s=E.newGame([{id:'a',name:'A',tok:0},{id:'b',name:'B',tok:1}],r), turns=0, steps=0, last=-1;
  const act=(a,by)=>{const x=E.apply(s,a,r,by); if(!x) throw new Error('illegal '+JSON.stringify(a)+' phase '+s.phase); s=x};
  while(s.status==='playing'){
    if(++steps>20000) throw new Error('stuck seed '+seed);
    const by=E.actor(s), me=s.players[by], opp=s.players[1-by];
    const all=[...s.deck,...s.discard]; s.players.forEach(p=>{all.push(...p.hand,...p.bank);E.ORDER.forEach(g=>all.push(...p.sets[g],...p.ups[g]))});
    if(all.length!==E.CARDS.length||new Set(all).size!==all.length) throw new Error('card count broke: '+all.length);
    if(s.phase==='respond'){
      if(s.pending.stage==='block') act({t:r()<0.7?'block':'accept'},by);
      else { const p=E.payable(me).sort((a,b)=>E.CARDS[b].v-E.CARDS[a].v), cards=[]; let sum=0; for(const c of p){ if(sum>=s.pending.amt)break; cards.push(c); sum+=E.CARDS[c].v } act({t:'pay',cards},by) }
      continue;
    }
    if(s.phase==='discard'){act({t:'discard',c:me.hand[0]},by);continue}
    if(s.turn!==last){turns++;last=s.turn}
    const moves=[];
    if(s.plays<E.PLAYS) for(const c of me.hand){ const k=E.CARDS[c];
      if(k.k==='asset') moves.push({t:'asset',c});
      else if(k.k==='wild') moves.push({t:'asset',c,g:pick(k.gs,r)});
      else if(k.k==='cash') moves.push({t:'bank',c});
      else { const a=k.a, mine=E.ORDER.filter(g=>me.sets[g].length), lo=E.loose(opp), lm=E.loose(me);
        if(a==='fund'||a==='lawsuit'||a==='halluc'||a==='scrape'||(a==='hype'&&!s.hype)) moves.push({t:'act',c});
        else if(a==='invoice'&&mine.length) moves.push({t:'act',c,g:pick(mine,r)});
        else if(a==='poach'&&lo.length) moves.push({t:'act',c,x:pick(lo,r)});
        else if(a==='merger'&&lo.length&&lm.length) moves.push({t:'act',c,x:pick(lo,r),y:pick(lm,r)});
        else if(a==='takeover'){const g=E.ORDER.find(g=>E.isComplete(opp,g)); if(g) moves.push({t:'act',c,g})}
        else if(a==='tune'){const g=E.ORDER.find(g=>E.isComplete(me,g)&&me.ups[g].length<E.MAX_TUNES); if(g) moves.push({t:'act',c,g})}
        else if(a!=='guard') moves.push({t:'bank',c});
      } }
    if(moves.length && r()<0.9) act(pick(moves,r),by); else act({t:'end'},by);
  }
  return turns;
}
const t=Array.from({length:2000},(_,k)=>play(k+1)).sort((a,b)=>a-b);
console.log(`cards ${E.CARDS.length}; 2000 games ok; turns per player: median ${Math.round(t[1000]/2)}, p10 ${Math.round(t[200]/2)}, p90 ${Math.round(t[1800]/2)}`);
