// Balance + sanity check: plays full games with simple bots and reports length.
const E = require('../engine.js');
function rng(seed){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
function play(seed, goal, n){
  const r=rng(seed);
  let s=E.newGame(Array.from({length:n},(_,i)=>({id:'p'+i,name:'P'+i,tok:i})),goal,r), turns=0, steps=0;
  const act=a=>{const x=E.apply(s,a,r); if(!x) throw new Error('illegal '+JSON.stringify(a)+' in '+s.phase); s=x};
  while(s.status==='playing'){
    if(++steps>100000) throw new Error('stuck');
    const i=s.turn,p=s.players[i];
    if(s.phase==='roll'){turns++;act({t:'roll'})}
    else if(s.phase==='buy'){act({t:p.cash-E.SPACES[p.pos].p>=100?'buy':'pass'})}
    else {
      if(p.cash<0){const mine=E.tilesOf(s,i); if(!mine.length){act({t:'bankrupt'});continue} act({t:'sell',i:mine[0]});continue}
      const up=E.tilesOf(s,i).find(k=>E.SPACES[k].t==='prop'&&s.owned[k].l<3&&p.cash>=E.upCost(k)+300);
      if(up!==undefined){act({t:'upgrade',i:up});continue}
      act({t:'end'});
    }
    const total=s.players.reduce((a,_,j)=>a+E.netWorth(s,j),0); if(!Number.isFinite(total)) throw new Error('NaN');
  }
  return {turns,bankrupt:s.players.some(p=>p.out)};
}
for(const [goal,n] of [[3000,2],[4500,2],[3000,4]]){
  const res=Array.from({length:400},(_,k)=>play(k+1,goal,n)), t=res.map(x=>x.turns).sort((a,b)=>a-b);
  console.log(`goal ${goal}, ${n}p: turns/player median ${Math.round(t[200]/n)}, p10 ${Math.round(t[40]/n)}, p90 ${Math.round(t[360]/n)}, ended by bankruptcy ${Math.round(res.filter(x=>x.bankrupt).length/4)}%`);
}
