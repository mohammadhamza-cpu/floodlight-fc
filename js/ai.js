/* Team AI: two pressers, zonal cover, wide passing outlets, forward runs,
 * lane-aware passes, timed shots and predictive goalkeeper interception.
 * Human teams still get autonomous support; selected players remain manual. */
(function(F){
  'use strict';
  F.levels={easy:{pace:.79,think:.62,accuracy:2.7,save:.65},medium:{pace:.94,think:.38,accuracy:1.55,save:.9},hard:{pace:1.03,think:.19,accuracy:.7,save:1.13}};
  F.passTarget=function(g,p,aim){
    const d=F.dir(p.team),hasAim=aim&&Math.hypot(aim.x,aim.y)>.15,u=hasAim?F.unit(aim.x,aim.y):{x:d,y:0};
    let best=null,score=-Infinity;
    for(const q of g.players){
      if(q.team!==p.team||q.id===p.id||q.keeper)continue;
      const dx=q.x-p.x,dy=q.y-p.y,dist=Math.hypot(dx,dy);if(dist<3||dist>48)continue;
      const dot=(dx*u.x+dy*u.y)/dist;
      let blocked=0,space=15;
      for(const o of g.players)if(o.team!==p.team){if(F.segmentDistance(p,q,o)<2.7)blocked++;space=Math.min(space,F.dist(q,o));}
      const s=dot*(hasAim?22:6)+dx*d*.19-dist*.10+space*.5-blocked*7;
      if(s>score){best=q;score=s;}
    }
    return best;
  };
  F.aiInput=function(g,p,dt){
    const out=F.emptyInput(),d=F.dir(p.team),b=g.ball,owner=g.player(b.owner);
    const level=F.levels[p.team===0&&g.mode==='ai'?'medium':g.difficulty];
    let x=p.homeX,y=p.homeY;
    if(p.keeper){
      x=-d*48.5;y=F.clamp(b.y*.45,-6.5,6.5);
      if(b.owner===null&&b.vx*d<-2&&p.reaction<=0){
        const t=(x-b.x)/b.vx;
        if(t>0&&t<1.2){y=F.clamp(b.y+b.vy*t,-8,8);if(t<.55&&Math.abs(y-p.y)>1.1&&p.dive<=0){p.dive=.5;p.diveY=Math.sign(y-p.y);g.stats.dives[p.team]++;}}
      }
      if(owner===p){p.think-=dt;out.pass=p.think<=0;}
    }else if(owner===p){
      const near=g.players.filter(q=>q.team!==p.team&&!q.keeper).reduce((a,q)=>Math.min(a,F.dist(p,q)),99);
      x=50*d;y=p.y*.68;out.sprint=near>4&&Math.abs(p.x)<32;
      // A close defender triggers a lateral dribble and an earlier outlet pass.
      if(near<4){y=p.y+(p.y>0?-6:6);out.dribble=true;}
      p.think-=dt;
      if(p.think<=0){
        const range=52-p.x*d;
        if(range<32&&Math.abs(p.y)<19){out.shoot=true;const k=g.players[(1-p.team)*7];out.aimY=g.random()<.6?(k.y>=0?-1:1)*(5.5+g.random()*1.3):(g.random()-.5)*9;}
        else if(p.possession>2.5||(near<3.3&&p.possession>.65)){out.pass=true;}
        p.think=level.think+g.random()*.25;
      }
    }else{
      const chase=g.players.filter(q=>q.team===p.team&&!q.keeper).sort((a,c)=>F.dist(a,b)-F.dist(c,b));
      const attacking=owner&&owner.team===p.team;
      if(!attacking&&(chase[0]===p||chase[1]===p)){
        const anticipation=b.owner===null?.22:.10;
        x=b.x+b.vx*anticipation;y=b.y+b.vy*anticipation;
        if(chase[1]===p&&owner){x-=d*3;y+=(p.homeY>0?3:-3);}
        out.sprint=F.dist(p,b)>7;
        if(owner&&owner.team!==p.team&&owner.possession>.55&&F.dist(p,owner)<2.65&&p.cooldown<=0){
          // AI uses safe standing tackles; human slides can concede fouls.
          out.standing=true;out.shoot=true;
        }
      }else if(attacking){
        x=F.clamp(p.homeX+b.x*.57+d*12,-44,44);
        y=F.clamp(p.homeY+b.y*.22,-28,28);
        if(p.role==='forward')x=F.clamp(b.x+d*13,-44,44);
        if(F.dist(p,owner)<7)y+=p.homeY>=0?6:-6;
      }else{
        x=F.clamp(p.homeX+b.x*.38-d*7,-44,44);y=F.clamp(p.homeY+b.y*.32,-27,27);
        // Defenders stay goal-side of nearby unmarked attackers.
        if(p.role==='defender'){
          const threats=g.players.filter(q=>q.team!==p.team&&!q.keeper&&q.x*d<0).sort((a,c)=>F.dist(p,a)-F.dist(p,c));
          if(threats[0]){x=threats[0].x-d*4;y=threats[0].y;}
        }
      }
    }
    const u=F.unit(x-p.x,y-p.y),distance=Math.hypot(x-p.x,y-p.y),factor=Math.min(1,distance/1.6)*level.pace;
    out.x=u.x*factor;out.y=u.y*factor;
    if(p.keeper&&p.dive>0)out.y=F.clamp((y-p.y)*2,-1.6,1.6);
    return out;
  };
})(globalThis.Football);
