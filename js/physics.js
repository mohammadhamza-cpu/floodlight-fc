/* Floodlight FC: pure numeric physics shared by the game and deterministic tests.
 * Arcade field coordinates, not a regulation simulator. Z is ball height.
 * Fixed 120 Hz simulation; swept goal/post checks live in rules.js. */
(function(F){
  'use strict';
  F.C=Object.freeze({halfX:52,halfY:34,goalY:8,goalH:4,ballR:.38,playerR:1.05,step:1/120,gravity:22,run:9.2,sprint:13.2});
  F.clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  F.dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  F.unit=(x,y)=>{const n=Math.hypot(x,y);return n>1e-8?{x:x/n,y:y/n}:{x:0,y:0};};
  F.dir=team=>team===0?1:-1;
  F.emptyInput=()=>({x:0,y:0,shoot:false,pass:false,dribble:false,sprint:false,switch:false});
  F.makeBall=()=>({x:0,y:0,z:.38,vx:0,vy:0,vz:0,owner:null,lastTeam:0,lastPlayer:null,lock:0,trail:[],kind:'loose'});
  F.movePlayer=function(p,input,dt){
    const n=Math.hypot(input.x||0,input.y||0),axis=n>1?1/n:1;
    const sprint=!!input.sprint&&p.stamina>.04&&n>.1&&p.stun<=0;
    p.stamina=F.clamp(p.stamina+(sprint?-.23:.16)*dt,0,1);
    const speed=(sprint?F.C.sprint:F.C.run)*(input.dribble?.83:1)*(p.keeper?.65:1);
    p.sprinting=sprint;p.protect=!!input.dribble;
    let tx=(input.x||0)*axis*speed,ty=(input.y||0)*axis*speed;
    if(p.stun>0){tx=0;ty=0;}
    if(p.slide>.12){tx=p.fx*17;ty=p.fy*17;}
    const k=1-Math.exp(-dt*15);
    p.vx+=(tx-p.vx)*k;p.vy+=(ty-p.vy)*k;
    p.x=F.clamp(p.x+p.vx*dt,-51,51);p.y=F.clamp(p.y+p.vy*dt,-33,33);
    if(Math.hypot(tx,ty)>.5){const u=F.unit(tx,ty);p.fx=u.x;p.fy=u.y;}
    p.stride+=Math.hypot(p.vx,p.vy)*dt*1.45;
  };
  F.integrateBall=function(b,dt){
    const previous={x:b.x,y:b.y,z:b.z};
    b.x+=b.vx*dt;b.y+=b.vy*dt;
    b.vz-=F.C.gravity*dt;b.z+=b.vz*dt;
    if(b.z<F.C.ballR){b.z=F.C.ballR;if(b.vz<-1.6)b.vz=-b.vz*.48;else b.vz=0;}
    const drag=b.z<=F.C.ballR+.015?1.05:.20;
    const damping=Math.exp(-drag*dt);b.vx*=damping;b.vy*=damping;
    if(Math.hypot(b.vx,b.vy)<.07){b.vx=0;b.vy=0;}
    return previous;
  };
  F.separatePlayers=function(players){
    for(let i=0;i<players.length;i++)for(let j=i+1;j<players.length;j++){
      const a=players[i],b=players[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=F.C.playerR*2;
      if(d<min){const nx=d>.001?dx/d:1,ny=d>.001?dy/d:0,shift=(min-d)*.5;
        a.x=F.clamp(a.x-nx*shift,-51,51);a.y=F.clamp(a.y-ny*shift,-33,33);
        b.x=F.clamp(b.x+nx*shift,-51,51);b.y=F.clamp(b.y+ny*shift,-33,33);
      }
    }
  };
  F.segmentDistance=function(a,b,p){
    const dx=b.x-a.x,dy=b.y-a.y,t=F.clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);
    return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);
  };
})(globalThis.Football=globalThis.Football||{});
