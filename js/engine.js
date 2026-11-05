/* Authoritative match state. Rendering/input never award goals or move players.
 * Seven per side: keeper, two defenders, two midfielders and two forwards.
 * Human shots charge while the shoot control is held (tap 40%, 0.85 s = 100%).
 * Pass control doubles as the safe standing "clean tackle"; shoot slides. */
(function(F){
  'use strict';
  const formation=[[-56,0,'keeper'],[-34,-15,'defender'],[-34,15,'defender'],[-14,-24,'midfielder'],[-14,24,'midfielder'],[-5,-9,'forward'],[-5,9,'forward']];
  F.makePlayer=function(team,i){const [x,y,role]=formation[i],d=F.dir(team);return {id:team*7+i,team,number:i+1,role,keeper:i===0,homeX:x*d,homeY:y,x:x*d,y,vx:0,vy:0,fx:d,fy:0,stride:i,stamina:1,sprinting:false,protect:false,kick:0,kickPower:0,slide:0,stun:0,dive:0,diveY:1,reaction:0,cooldown:0,think:.6,possession:0,feint:0,celebrate:0,charging:false,chargeSeconds:0,swingPower:0,powerFlash:0};};
  class Game{
    constructor({mode='ai',difficulty='medium',duration=180,random=Math.random,onEvent=()=>{}}={}){
      this.mode=mode;this.difficulty=F.levels[difficulty]?difficulty:'medium';this.duration=duration;this.remaining=duration;this.random=random;this.onEvent=onEvent;
      this.players=[...Array.from({length:7},(_,i)=>F.makePlayer(0,i)),...Array.from({length:7},(_,i)=>F.makePlayer(1,i))];
      this.ball=F.makeBall();this.scores=[0,0];this.selected=[5,12];this.switchLock=[0,0];this.stats={shots:[0,0],passes:[0,0],tackles:[0,0],cleanTackles:[0,0],saves:[0,0],fouls:[0,0],penalties:[0,0],dives:[0,0],possession:[0,0]};
      this.elapsed=0;this.paused=false;this.winner=null;this.message='';this.messageTime=0;this.phase='kickoff';this.phaseTime=0;this.restart('kickoff',0,{x:0,y:0});
    }
    player(id){return id===null||id===undefined?null:this.players[id];}
    emit(type,data={}){this.onEvent({type,...data});}
    announce(text,time=1.5){this.message=text;this.messageTime=time;}
    cancelCharges(){for(const p of this.players){p.charging=false;p.chargeSeconds=0;}}
    giveBall(p){const b=this.ball;b.owner=p.id;b.lastPlayer=p.id;b.lastTeam=p.team;b.vx=0;b.vy=0;b.vz=0;b.z=F.C.ballR;b.x=p.x+p.fx*1.35;b.y=p.y+p.fy*1.35;p.possession=0;p.think=.55;this.selected[p.team]=p.id;}
    resetFormation(){this.players.forEach(p=>Object.assign(p,F.makePlayer(p.team,p.number-1)));}
    restart(kind,team,spot){
      if(this.phase==='over')return;
      const b=this.ball;
      if(kind==='kickoff')this.resetFormation();
      this.cancelCharges();
      this.phase=kind==='kickoff'?'kickoff':'restart';this.phaseTime=kind==='kickoff'?1.8:1.45;
      this.restartKind=kind;this.restartTeam=team;
      const candidates=this.players.filter(p=>p.team===team&&(kind==='goal kick'?p.keeper:!p.keeper));
      const p=candidates.sort((a,c)=>F.dist(a,spot)-F.dist(c,spot))[0];
      for(const q of this.players)if(q!==p&&F.dist(q,spot)<8){q.x=F.clamp(spot.x-F.dir(team)*9,-F.C.halfX+2,F.C.halfX-2);q.y=F.clamp(q.y+(q.y>=spot.y?6:-6),-F.C.halfY+2,F.C.halfY-2);q.vx=0;q.vy=0;}
      p.x=spot.x-F.dir(team)*1.5;p.y=spot.y;p.fx=F.dir(team);p.fy=0;p.vx=0;p.vy=0;
      Object.assign(b,F.makeBall());this.giveBall(p);b.trail=[];this.announce(kind.toUpperCase(),this.phaseTime+.2);this.emit('restart',{kind,team});
    }
    goal(team){
      if(this.phase!=='play')return;
      this.scores[team]++;this.phase='goal';this.phaseTime=2.7;this.scoringTeam=team;this.cancelCharges();
      this.ball.owner=null;this.ball.vx=0;this.ball.vy=0;this.ball.vz=0;
      this.ball.x=F.dir(team)*(F.C.halfX+2);this.ball.y=F.clamp(this.ball.y,-7,7);
      this.players.forEach(p=>{p.celebrate=p.team===team?2.7:0;p.vx=0;p.vy=0;});
      this.announce('GOOOAL!',2.7);this.emit('goal',{team,score:this.scores.slice()});
    }
    finish(){this.phase='over';this.winner=this.scores[0]===this.scores[1]?null:this.scores[0]>this.scores[1]?0:1;this.remaining=0;this.cancelCharges();this.emit('over',{winner:this.winner});}
    foul(offender,victim){
      this.stats.fouls[offender.team]++;offender.stun=.6;this.emit('foul',{team:offender.team});
      const ownGoal=-F.dir(offender.team)*F.C.halfX;
      if(Math.abs(victim.x-ownGoal)<20&&Math.abs(victim.y)<22){this.penalty(victim.team);}
      else{this.restart('free kick',victim.team,{x:victim.x,y:victim.y});this.announce('FOUL · FREE KICK',1.6);}
    }
    penalty(team){
      this.stats.penalties[team]++;this.resetFormation();const d=F.dir(team),p=this.players[team*7+5];
      this.players.forEach(q=>{if(!q.keeper){q.x=d*28-(q.number%3)*d*3;q.y=(q.number-3)*5;}q.vx=0;q.vy=0;});
      p.x=d*46.6;p.y=0;p.fx=d;p.fy=0;this.giveBall(p);
      const k=this.players[(1-team)*7];k.x=d*58.5;k.y=0;
      this.phase='penalty';this.phaseTime=6;this.penaltyTeam=team;this.penaltyAim=0;
      this.selected[team]=p.id;this.selected[1-team]=k.id;this.announce('PENALTY · UP / DOWN TO AIM · SHOOT',6);this.emit('penalty',{team});
    }
    kick(p,kind,input={}){
      if(this.ball.owner!==p.id||p.cooldown>0)return false;
      const b=this.ball,d=F.dir(p.team);let target,speed,lift;
      if(kind==='pass'){
        target=F.passTarget(this,p,input);
        const dist=target?F.dist(p,target):19;
        if(target)target={x:target.x+target.vx*.25,y:target.y+target.vy*.25};else target={x:p.x+d*19,y:p.y};
        speed=F.clamp(dist*1.12+13,24,52);lift=1.4;p.kickPower=.45;p.kick=.26;this.stats.passes[p.team]++;
      }else{
        const ai=input.ai,level=F.levels[this.difficulty];
        const keeper=this.players[(1-p.team)*7];
        const aim=input.penalty?this.penaltyAim:input.aimY!==undefined?input.aimY:(Math.abs(input.y||0)>.12?input.y*6.6:(keeper.y>=0?-6.2:6.2));
        const error=ai?(this.random()-.5)*level.accuracy:0;
        // Held charge decides pace and lift: 40% tap to 100% full bar.
        const power=input.power!==undefined?F.clamp(input.power,.4,1):.7;
        target={x:d*(F.C.halfX+2),y:F.clamp(aim+error,-7.25,7.25)};
        speed=input.penalty?47:34+27*power+Math.min(5,Math.hypot(p.vx,p.vy)*.4);
        lift=input.penalty?5:3.1+3.4*power;
        p.kickPower=input.penalty?.85:power;p.kick=.34;p.swingPower=power;p.powerFlash=.9;this.stats.shots[p.team]++;
        const keepLevel=F.levels[keeper.team===0&&this.mode==='ai'?'medium':this.difficulty];
        keeper.reaction=.09+keepLevel.think*.35;
      }
      const u=F.unit(target.x-b.x,target.y-b.y);
      b.owner=null;b.kind=kind;b.lastTeam=p.team;b.lastPlayer=p.id;b.lock=.19;b.vx=u.x*speed;b.vy=u.y*speed;b.vz=lift;
      p.charging=false;p.chargeSeconds=0;p.cooldown=.35;p.possession=0;this.emit(kind,{team:p.team,x:p.x,y:p.y});return true;
    }
    tackle(p,input){
      if(p.cooldown>0||p.stun>0)return;
      const standing=!!input.standing;
      p.cooldown=standing?.55:.95;p.slide=standing?0:.32;p.kick=standing?.2:0;p.kickPower=.4;this.stats.tackles[p.team]++;
      const owner=this.player(this.ball.owner);
      if(!owner||owner.team===p.team||F.dist(p,owner)>(standing?2.9:3.25)||(standing&&owner.possession<.55))return;
      const ballDist=F.dist(p,this.ball),behind=(p.x-owner.x)*owner.fx+(p.y-owner.y)*owner.fy<-.65;
      // Slides reach further but foul when they arrive from behind the carrier.
      if(!standing&&ballDist>2.2&&behind){this.foul(p,owner);return;}
      if(owner.protect&&ballDist>1.7){p.stun=.3;return;}
      if(ballDist<(standing?2.6:3.2)){
        owner.stun=.45;owner.charging=false;owner.chargeSeconds=0;this.giveBall(p);
        if(standing)this.stats.cleanTackles[p.team]++;
        this.announce('CLEAN TACKLE',.65);this.emit('tackle',{team:p.team});
      }
    }
    switchPlayer(team,manual=false){
      if(this.phase==='penalty')return;
      const owner=this.player(this.ball.owner),old=this.player(this.selected[team]);
      if(owner&&owner.team===team){this.selected[team]=owner.id;return;}
      const candidates=this.players.filter(p=>p.team===team&&!p.keeper).sort((a,b)=>F.dist(a,this.ball)-F.dist(b,this.ball));
      let next=candidates[0];if(manual&&next===old)next=candidates[1];
      if(manual||!old||old.keeper||(this.switchLock[team]<=0&&F.dist(next,this.ball)+4<F.dist(old,this.ball))){this.selected[team]=next.id;this.switchLock[team]=manual?1.5:.7;}
    }
    ballContacts(old){
      const b=this.ball;if(b.owner!==null)return;
      for(const p of this.players){
        if(p.stun>0||(b.lock>0&&p.id===b.lastPlayer))continue;
        const d=F.segmentDistance(old,b,p),speed=Math.hypot(b.vx,b.vy);
        if(p.keeper){
          const area=Math.abs(p.x)>F.C.halfX-20&&Math.abs(p.y)<22,level=F.levels[p.team===0&&this.mode==='ai'?'medium':this.difficulty];
          const reach=p.dive>0?2.4*level.save:1.4*level.save;
          if(area&&p.reaction<=0&&d<reach&&b.z<(p.dive>0?3.5:2.8)){
            if(b.lastTeam!==p.team){this.stats.saves[p.team]++;this.emit('save',{team:p.team});this.announce('KEEPER SAVE',.9);}
            this.giveBall(p);p.dive=.45;p.think=.65;return;
          }
        }else if(d<1.5&&b.z<1.65){
          if(speed<34||b.kind==='pass'){
            this.giveBall(p);return;
          }
          const u=F.unit(b.x-p.x,b.y-p.y);b.vx=(b.vx+u.x*speed)*.40;b.vy=(b.vy+u.y*speed)*.4;b.vz=3;b.lastTeam=p.team;b.lastPlayer=p.id;b.lock=.12;this.emit('deflect');return;
        }
      }
    }
    step(dt,inputs=[]){
      if(this.paused||this.phase==='over')return;
      dt=F.clamp(dt,0,.05);this.elapsed+=dt;this.messageTime=Math.max(0,this.messageTime-dt);
      for(const p of this.players)for(const k of ['kick','slide','stun','dive','reaction','cooldown','feint','celebrate','powerFlash'])p[k]=Math.max(0,p[k]-dt);
      if(this.phase==='goal'){
        this.phaseTime-=dt;
        if(this.phaseTime<=0){if(this.remaining<=0)this.finish();else this.restart('kickoff',1-this.scoringTeam,{x:0,y:0});}return;
      }
      if(this.phase==='kickoff'||this.phase==='restart'){
        this.phaseTime-=dt;if(this.phaseTime<=0){this.phase='play';this.announce('PLAY!',.7);}return;
      }
      if(this.phase==='penalty'){
        this.phaseTime-=dt;const team=this.penaltyTeam,human=team===0||this.mode==='local',i=inputs[team]||{},p=this.player(this.ball.owner),k=this.players[(1-team)*7];
        this.penaltyAim=F.clamp(this.penaltyAim+(i.y||0)*9*dt,-6.7,6.7);
        if((1-team===0||this.mode==='local')&&inputs[1-team])k.y=F.clamp(k.y+(inputs[1-team].y||0)*8*dt,-7,7);
        if((human&&i.shoot)||(!human&&this.phaseTime<3.5)||this.phaseTime<=0){
          if(!human)this.penaltyAim=(this.random()-.5)*12;
          p.cooldown=0;this.kick(p,'shoot',{penalty:true});this.phase='play';this.announce('PENALTY SHOT',1);
        }return;
      }
      this.remaining=Math.max(0,this.remaining-dt);
      for(let team=0;team<2;team++){this.switchLock[team]-=dt;this.switchPlayer(team,!!inputs[team]?.switch);}
      const commands=[];
      for(const p of this.players){
        const human=(p.team===0||this.mode==='local')&&p.id===this.selected[p.team]&&!p.keeper;
        const ai=!human;const input=ai?F.aiInput(this,p,dt):(inputs[p.team]||F.emptyInput());
        commands[p.id]={...input,ai};
        if(human){
          // Shot charging: start while held with the ball; movement slows via physics.
          if(this.ball.owner===p.id){
            if(input.shootHeld&&!p.charging&&p.cooldown<=0){p.charging=true;p.chargeSeconds=0;}
            else if(p.charging&&input.shootHeld)p.chargeSeconds=Math.min(p.chargeSeconds+dt,2.5);
          }else if(p.charging){p.charging=false;p.chargeSeconds=0;}
        }
        F.movePlayer(p,input,dt);
        if(input.dribble&&this.ball.owner===p.id&&p.feint<=0){p.feint=.7;this.emit('dribble',{team:p.team});}
      }
      F.separatePlayers(this.players);
      const ballBefore={x:this.ball.x,y:this.ball.y,z:this.ball.z};
      const owner=this.player(this.ball.owner);
      if(owner){owner.possession+=dt;this.stats.possession[owner.team]+=dt;this.ball.x=owner.x+owner.fx*(owner.protect?1.05:1.45);this.ball.y=owner.y+owner.fy*(owner.protect?1.05:1.45);this.ball.z=F.C.ballR+Math.abs(Math.sin(owner.stride))*.12;}
      // Dribbling over a boundary is still a goal or ball out, even before
      // a kick releases possession. Use the same swept checks as free balls.
      if(owner){F.checkBoundary(this,ballBefore);if(this.phase!=='play')return;}
      for(const p of this.players){const i=commands[p.id];
        if(this.ball.owner===p.id){
          // Humans shoot by releasing a held charge. An explicit power on a
          // shoot edge (AI teammates, scripted simulations) kicks immediately.
          if(i.shoot&&(i.ai||i.power!==undefined))this.kick(p,'shoot',i);
          else if(!i.ai&&p.charging&&!i.shootHeld){const power=F.powerFromHold(p.chargeSeconds);p.charging=false;p.chargeSeconds=0;this.kick(p,'shoot',{...i,power});}
          // Tap faster than one physics tick: edge without a live hold.
          else if(!i.ai&&i.shoot&&!i.shootHeld&&!p.charging)this.kick(p,'shoot',{...i,power:F.powerFromHold(0)});
          else if(i.pass&&!p.charging)this.kick(p,'pass',i);
        }
        // Keyboard/touch never set `standing`: Space/Enter slide, E/O stand.
        else if(i.shoot)this.tackle(p,{...i,standing:!!i.standing});
        else if(i.pass&&!i.ai)this.tackle(p,{...i,standing:true});
        if(this.phase!=='play')return;
      }
      if(this.ball.owner===null){
        this.ball.lock=Math.max(0,this.ball.lock-dt);const old=F.integrateBall(this.ball,dt);F.checkBoundary(this,old);
        if(this.phase==='play')this.ballContacts(old);
      }
      if(this.ball.owner!==null){const p=this.player(this.ball.owner);this.selected[p.team]=p.id;}
      if(this.phase==='play'&&this.remaining<=0)this.finish();
    }
  }
  F.Game=Game;
})(globalThis.Football);
