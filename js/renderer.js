/* Original Canvas 2.5D art. A fixed elevated perspective keeps all 14 players
 * and the complete pitch visible; ground geometry, shadows and height all use
 * the same projection. Figurines wear patterned kits (stripes/hoops/sash/halves)
 * with shorts and socks, swing arms while running, wind up and follow through on
 * kicks, and show a charge ring while a shot powers up. No downloaded assets. */
(function(F){
  'use strict';
  F.teams=[
    {name:'Harbor City',short:'HBR',color:'#39b8ff',dark:'#14659e',accent:'#eaf7ff',pattern:'stripes',shorts:'#103a5c',socks:'#39b8ff',keeper:'#ffcf5c'},
    {name:'Ember United',short:'EMB',color:'#ff5a43',dark:'#a82430',accent:'#ffd9b0',pattern:'hoops',shorts:'#571218',socks:'#ff5a43',keeper:'#9ff291'},
    {name:'Violet Rovers',short:'VIO',color:'#b390ff',dark:'#5c35a0',accent:'#f4edff',pattern:'sash',shorts:'#2e1b52',socks:'#b390ff',keeper:'#ffe27a'},
    {name:'Golden Athletic',short:'GLD',color:'#ffd550',dark:'#8f6a12',accent:'#2e2410',pattern:'halves',shorts:'#201a08',socks:'#ffd550',keeper:'#7fe8ef'},
    {name:'Rose Town',short:'ROS',color:'#ff8ebe',dark:'#a93568',accent:'#ffe3ef',pattern:'stripes',shorts:'#4b1230',socks:'#ff8ebe',keeper:'#b1f17e'},
    {name:'Arctic FC',short:'ARC',color:'#eef9ff',dark:'#7fa3b4',accent:'#9adbe8',pattern:'hoops',shorts:'#1d4654',socks:'#cdeef5',keeper:'#ffb66e'}];
  F.Renderer=class{
    constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.teams=[F.teams[0],F.teams[1]];this.time=0;this.particles=[];this.resize();window.addEventListener('resize',()=>this.resize());}
    resize(){const r=this.canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);this.w=r.width;this.h=r.height;this.canvas.width=Math.round(r.width*d);this.canvas.height=Math.round(r.height*d);this.ctx.setTransform(d,0,0,d,0,0);}
    project(x,y,z=0){const q=1+y*.0024;return {x:this.cx+x*this.scale*q,y:this.cy+y*this.scale*.63-z*this.scale*.84,s:this.scale*q};}
    path(points,close=false){const c=this.ctx;c.beginPath();points.forEach((v,i)=>{const p=this.project(...v);if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);});if(close)c.closePath();}
    poly(points,fill,stroke,width=1){this.path(points,true);if(fill){this.ctx.fillStyle=fill;this.ctx.fill();}if(stroke){this.ctx.strokeStyle=stroke;this.ctx.lineWidth=width;this.ctx.stroke();}}
    line(points,color,width=1){this.path(points);this.ctx.strokeStyle=color;this.ctx.lineWidth=width;this.ctx.stroke();}
    circle(x,y,r,color,width=1){const points=[];for(let i=0;i<=60;i++){const a=i/60*Math.PI*2;points.push([x+Math.cos(a)*r,y+Math.sin(a)*r]);}this.line(points,color,width);}
    event(e){if(e.type==='goal'){for(let i=0;i<85;i++)this.particles.push({x:this.w*.25+Math.random()*this.w*.5,y:this.h*.25,vx:(Math.random()-.5)*200,vy:-90-Math.random()*230,life:2.8,color:i%2?this.teams[e.team].color:'#e5ff89',size:3+Math.random()*4});}}
    field(){
      const c=this.ctx,s=this.scale,X=F.C.halfX,Y=F.C.halfY;
      // Stadium apron and stepped stands surround, rather than obscure, the pitch.
      this.poly([[-X-11,-Y-9],[X+11,-Y-9],[X+12,Y+10],[-X-12,Y+10]],'#183a42');
      for(let j=0;j<4;j++){
        this.poly([[-X-9,-Y-10-j*2],[X+9,-Y-10-j*2],[X+9,-Y-9-j*2],[-X-9,-Y-9-j*2]],j%2?'#244b57':'#1b394b');
        for(let i=0;i<78;i++){const p=this.project(-X-7+i*1.72,-Y-9.5-j*2);c.fillStyle=['#869998','#596e7b','#ecbb80','#314c68','#74a8b7'][(i*7+j*3)%5];c.fillRect(p.x,p.y,Math.max(1,s*.43),Math.max(1,s*.45));}
      }
      this.poly([[-X-2,-Y-2],[X+2,-Y-2],[X+2,Y+2],[-X-2,Y+2]],'#143f36');
      this.poly([[-X,-Y],[X,-Y],[X,Y],[-X,Y]],'#39965a');
      for(let i=0;i<15;i++){const x=-X+i*(2*X/15);this.poly([[x,-Y],[x+2*X/15,-Y],[x+2*X/15,Y],[x,Y]],i%2?'#389354':'#409e5d');}
      c.globalAlpha=.09;
      for(let i=0;i<430;i++){const x=((i*47)%(2*X-2))-X+1,y=((i*29)%(2*Y-2))-Y+1;this.line([[x,y],[x+.25,y-.22]],'#d6f3aa',Math.max(.45,s*.07));}
      c.globalAlpha=1;
      const white='#d8efda',lw=Math.max(1,s*.15);
      this.poly([[-X,-Y],[X,-Y],[X,Y],[-X,Y]],null,white,lw);this.line([[0,-Y],[0,Y]],white,lw);this.circle(0,0,9.8,white,lw);
      for(const d of [-1,1]){
        this.poly([[d*X,-20],[d*(X-18),-20],[d*(X-18),20],[d*X,20]],null,white,lw);
        this.poly([[d*X,-10.5],[d*(X-6.5),-10.5],[d*(X-6.5),10.5],[d*X,10.5]],null,white,lw);
        const points=[];for(let i=0;i<=30;i++){const a=-1.05+i/30*2.1;points.push([d*(X-13-Math.cos(a)*9.8),Math.sin(a)*9.8]);}this.line(points,white,lw);
        this.circle(d*(X-13),0,.21,white,s*.35);
        for(const y of [-Y,Y]){const p=this.project(d*X,y),top=this.project(d*X,y,2.8);c.strokeStyle='#f4f5e8';c.lineWidth=Math.max(1,s*.12);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(top.x,top.y);c.stroke();c.fillStyle='#e8ff7c';c.beginPath();c.moveTo(top.x,top.y);c.lineTo(top.x+s*1.2,top.y+s*.5);c.lineTo(top.x,top.y+s);c.fill();}
      }
      this.circle(0,0,.2,white,s*.4);
      for(const y of [-Y-5,Y+5]){
        for(let i=0;i<5;i++){const x=-X+2+i*((2*X-4)/5);this.poly([[x,y-1],[x+(2*X-4)/5-2,y-1],[x+(2*X-4)/5-2,y+1],[x,y+1]],i%2?'#dcf783':'#244552');const p=this.project(x+((2*X-4)/5-2)/2,y);c.fillStyle=i%2?'#183b31':'#b6d1d4';c.font=`800 ${Math.max(4,s*.75)}px system-ui`;c.textAlign='center';c.fillText(['FLOODLIGHT FC','PLAY BEAUTIFULLY','7-A-SIDE','ALL HEART','THE NIGHT IS YOURS'][i],p.x,p.y+s*.28);}
      }
    }
    goal(d,front=false){
      const X=F.C.halfX,x=d*X,back=d*(X+4.5),c=this.ctx,s=this.scale;
      if(!front){
        this.poly([[x,-8,0],[back,-8,0],[back,8,0],[x,8,0]],'#173b354d');
        this.poly([[back,-8,0],[back,8,0],[back,8,4],[back,-8,4]],'#d9edfa13');
        for(let y=-8;y<=8;y+=1.3){this.line([[x,y,4],[back,y,3.7],[back,y,0]],'#d8eaf86b',Math.max(.5,s*.065));}
        for(let z=0;z<=4;z+=.7){this.line([[x,-8,z],[back,-8,z],[back,8,z],[x,8,z]],'#d8eaf86b',Math.max(.5,s*.065));}
      }else{
        this.line([[x,-8,0],[x,-8,4],[x,8,4],[x,8,0]],'#e9f4ff',Math.max(2,s*.27));
        this.line([[x,-8,4],[back,-8,3.7],[back,-8,0]],'#a8c1d1',Math.max(1,s*.14));
        this.line([[x,8,4],[back,8,3.7],[back,8,0]],'#a8c1d1',Math.max(1,s*.14));
      }
    }
    kit(c,s,team,keeper,face){
      // Torso trapezoid with team pattern; keepers wear a plain contrast shirt.
      const shirtTop=-3.62,shirtBottom=-2.05,halfTop=.68,halfBottom=.52;
      c.save();
      c.beginPath();c.moveTo(-halfTop*s,shirtTop*s);c.lineTo(halfTop*s,shirtTop*s);c.lineTo(halfBottom*s,shirtBottom*s);c.lineTo(-halfBottom*s,shirtBottom*s);c.closePath();c.clip();
      const base=keeper?team.keeper:team.color;
      const g=c.createLinearGradient(-s,0,s,0);g.addColorStop(0,keeper?'#4e6b58':team.dark);g.addColorStop(.45,base);g.addColorStop(1,base);
      c.fillStyle=g;c.fillRect(-s,shirtTop*s,2*s,(shirtBottom-shirtTop)*s);
      if(!keeper){
        c.fillStyle=team.accent;
        if(team.pattern==='stripes'){for(let i=-2;i<=2;i++){if(i%2)continue;c.fillRect((i*.26-.09)*s,shirtTop*s,.18*s,(shirtBottom-shirtTop)*s);}}
        else if(team.pattern==='hoops'){for(let i=0;i<3;i++)c.fillRect(-s,(shirtTop+.33+i*.52)*s,2*s,.17*s);}
        else if(team.pattern==='sash'){c.save();c.rotate(-.5);c.fillRect(-1.1*s,-3.15*s,2.2*s,.3*s);c.restore();}
        else if(team.pattern==='halves'){c.fillRect(0,shirtTop*s,s,(shirtBottom-shirtTop)*s);}
        c.fillStyle=team.dark;c.fillRect(-halfTop*s,shirtTop*s,2*halfTop*s,.14*s);
      }
      c.restore();
      c.strokeStyle='#0c232e55';c.lineWidth=s*.05;
      c.beginPath();c.moveTo(-halfTop*s,shirtTop*s);c.lineTo(halfTop*s,shirtTop*s);c.lineTo(halfBottom*s,shirtBottom*s);c.lineTo(-halfBottom*s,shirtBottom*s);c.closePath();c.stroke();
    }
    player(p,g){
      const c=this.ctx,a=this.project(p.x,p.y),s=a.s,selected=g.selected[p.team]===p.id&&(p.team===0||g.mode==='local'),team=this.teams[p.team];
      c.save();c.translate(a.x,a.y);
      c.fillStyle='#092e3850';c.beginPath();c.ellipse(s*.7,s*.38,s*1.4,s*.55,-.15,0,Math.PI*2);c.fill();
      if(selected){c.strokeStyle=p.team===0?'#dfff7f':'#fff4bc';c.lineWidth=Math.max(1.3,s*.18);c.beginPath();c.ellipse(0,0,s*1.9,s*.82,0,0,Math.PI*2);c.stroke();}
      // Charge ring: live shot power fills clockwise while shoot is held.
      if(p.charging){const power=F.powerFromHold(p.chargeSeconds);c.strokeStyle='#10324055';c.lineWidth=Math.max(2,s*.3);c.beginPath();c.ellipse(0,0,s*2.5,s*1.1,0,0,Math.PI*2);c.stroke();c.strokeStyle=power>.97?'#ffe55e':'#9df06c';c.beginPath();c.ellipse(0,0,s*2.5,s*1.1,0,-Math.PI/2,-Math.PI/2+power*Math.PI*2);c.stroke();}
      if(p.sprinting){c.strokeStyle='#ddf6cf69';c.lineWidth=s*.12;for(let i=0;i<2;i++){c.beginPath();c.moveTo(-p.fx*s*2,-s*(1+i));c.lineTo(-p.fx*s*3.2,-s*(1+i));c.stroke();}}
      const jump=p.celebrate>0?Math.max(0,Math.sin(this.time*10+p.id))*.9:0;
      c.translate(0,-jump*s);if(p.dive>0)c.rotate(p.diveY*.9);else if(p.slide>0){c.translate(p.fx*s*.7,-s*.2);c.rotate(-p.fx*.9);}
      const run=Math.min(1,Math.hypot(p.vx,p.vy)/5),swing=Math.sin(p.stride)*.85*run,face=p.fx>=0?1:-1,skin='#1b303a';
      const limb=(points,color,width)=>{c.beginPath();points.forEach((v,i)=>{if(i)c.lineTo(v[0]*s,v[1]*s);else c.moveTo(v[0]*s,v[1]*s);});c.strokeStyle=color;c.lineWidth=s*width;c.lineCap='round';c.lineJoin='round';c.stroke();};
      // Kick animation: wind-up (foot pulled back) then snap through the ball
      // with a follow-through proportional to the struck power.
      let kickLeg=0,lean=0;
      if(p.kick>0){
        const duration=p.kick>.3?.34:.26,progress=1-p.kick/duration,power=.55+p.kickPower;
        kickLeg=progress<.35?-progress/.35*1.1*power:Math.sin((progress-.35)/.65*Math.PI)*2.1*power;
        lean=progress<.35?.1:-.22*power;
      }
      const charge=p.charging?Math.min(1,F.powerFromHold(p.chargeSeconds)):0;
      if(charge)lean+=.12+charge*.1;
      c.rotate(lean*face);
      const hipY=-2.02;
      // Legs: skin shanks with team socks and boots; kicking leg overrides swing.
      const standSwing=p.kick>0?-.35:-swing,kickSwing=p.kick>0?kickLeg:swing;
      c.fillStyle=team.shorts;c.beginPath();c.moveTo(-.5*s,(hipY-.28)*s);c.lineTo(.5*s,(hipY-.28)*s);c.lineTo(.56*s,(hipY+.42)*s);c.lineTo(-.56*s,(hipY+.42)*s);c.closePath();c.fill();
      limb([[-.22,hipY+.3],[standSwing*.55-.18,-1],[standSwing-.14,0]],skin,.3);
      limb([[-.22+standSwing-.14,-.02],[standSwing-.14+.12,-.02]],team.socks,.26);
      limb([[standSwing-.2,-.04],[standSwing+.22,-.02]],'#f2f7f4',.22);
      limb([[.22,hipY+.3],[kickSwing*.55+.2,-1-Math.max(0,kickLeg)*.14],[kickSwing+.18,-Math.max(0,kickLeg)*.38]],skin,.33);
      limb([[.1+kickSwing+.18,-Math.max(0,kickLeg)*.38-.02],[kickSwing+.34,-Math.max(0,kickLeg)*.38-.02]],team.socks,.28);
      limb([[kickSwing+.1,-Math.max(0,kickLeg)*.38-.05],[kickSwing+.52,-Math.max(0,kickLeg)*.38-.01]],'#f2f7f4',.24);
      // Arms: counter-swing while running, both up when celebrating, wrap on charge.
      const armSwing=p.kick>0?.9:swing,up=p.celebrate>0?-5.25:-2.32;
      limb([[-.52,-3.32],[-.92,-2.7+armSwing*.3],[-1.18+armSwing*.3,up]],skin,.27);
      limb([[.52,-3.32],[.92,-2.72-armSwing*.3],[1.16-armSwing*.3,up+(p.kick>0?-.5:0)]],skin,.27);
      this.kit(c,s,team,p.keeper,face);
      c.fillStyle=p.keeper||team.pattern!=='halves'?'#f7ffff':'#ffe9a8';c.font=`800 ${s*.62}px system-ui`;c.textAlign='center';c.fillText(String(p.number),0,-s*2.52);
      if(p.keeper){for(const x of [-1.18,1.16]){c.fillStyle='#f4f8e7';c.beginPath();c.arc(x*s,up*s,s*.26,0,Math.PI*2);c.fill();}}
      const head=c.createRadialGradient(-s*.18,-s*4.37,s*.03,0,-s*4.2,s*.64);head.addColorStop(0,'#44596a');head.addColorStop(1,'#122531');c.fillStyle=head;c.beginPath();c.arc(0,-s*4.2,s*.64,0,Math.PI*2);c.fill();
      c.fillStyle=team.color;c.beginPath();c.arc(0,-s*4.52,s*.3,Math.PI,0);c.fill();
      c.fillStyle='#b5d1dc';c.beginPath();c.arc(face*s*.3,-s*4.28,s*.09,0,Math.PI*2);c.fill();
      c.restore();
      if(selected){const h=this.project(p.x,p.y,7);c.fillStyle=p.team===0?'#e6ff94':'#fff0b4';c.beginPath();c.moveTo(h.x,h.y+s*.7);c.lineTo(h.x-s*.6,h.y);c.lineTo(h.x+s*.6,h.y);c.fill();c.font=`800 ${Math.max(9,s*1)}px system-ui`;c.textAlign='center';c.fillText(`P${p.team+1}`,h.x,h.y-s*.5);
        const width=s*3.5;c.fillStyle='#122e37';c.fillRect(a.x-width/2,a.y+s*1.35,width,s*.24);c.fillStyle=p.stamina>.25?'#dfff7f':'#ff785d';c.fillRect(a.x-width/2,a.y+s*1.35,width*p.stamina,s*.24);
      }
    }
    ball(b){
      const c=this.ctx,p=this.project(b.x,b.y,b.z),ground=this.project(b.x,b.y),r=Math.max(2.6,p.s*.49);
      c.fillStyle='#092d3b66';c.beginPath();c.ellipse(ground.x+p.s*.3,ground.y+p.s*.2,r*(1+b.z*.08),r*.5,0,0,Math.PI*2);c.fill();
      if(Math.hypot(b.vx,b.vy)>23){const u=F.unit(b.vx,b.vy);const old=this.project(b.x-u.x*2,b.y-u.y*2,b.z);c.strokeStyle='#ecffe780';c.lineWidth=r;c.beginPath();c.moveTo(old.x,old.y);c.lineTo(p.x,p.y);c.stroke();}
      c.save();c.translate(p.x,p.y);c.rotate((b.x+b.y)*.5);c.fillStyle='#fff';c.strokeStyle='#173849';c.lineWidth=Math.max(.65,r*.18);c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#243b47';c.beginPath();for(let i=0;i<5;i++){const a=i*Math.PI*2/5;c.lineTo(Math.cos(a)*r*.47,Math.sin(a)*r*.47);}c.closePath();c.fill();for(let i=0;i<3;i++){const a=i*Math.PI*2/3;c.beginPath();c.arc(Math.cos(a)*r*.95,Math.sin(a)*r*.95,r*.27,0,Math.PI*2);c.fill();}c.restore();
    }
    draw(g,dt,menu=false){
      const c=this.ctx;this.time+=dt;const w=this.w,h=this.h;
      // Navigation and orientation changes can briefly report a zero-size
      // canvas. Skip that frame rather than create negative projection radii.
      if(w<40||h<40)return;
      const landscape=h<560&&w>700;
      const top=landscape?64:w<600?95:104,bottom=landscape?32:w<600?190:160,available=Math.max(125,h-top-bottom);
      this.scale=Math.min((w-24)/(F.C.halfX*2+22),(available-16)/(F.C.halfY*2+1));this.cx=w/2;this.cy=top+available*.5;
      c.clearRect(0,0,w,h);const bg=c.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#142c40');bg.addColorStop(1,'#081d2b');c.fillStyle=bg;c.fillRect(0,0,w,h);
      for(const x of [w*.12,w*.88]){const glow=c.createRadialGradient(x,70,5,x,70,w*.48);glow.addColorStop(0,'#b6e9f314');glow.addColorStop(1,'#a9edf000');c.fillStyle=glow;c.fillRect(0,0,w,h);}
      this.field();this.goal(-1);this.goal(1);
      const entries=g.players.map(p=>({y:p.y,draw:()=>this.player(p,g)}));entries.push({y:g.ball.y,draw:()=>this.ball(g.ball)});entries.sort((a,b)=>a.y-b.y).forEach(e=>e.draw());
      this.goal(-1,true);this.goal(1,true);
      if(g.phase==='penalty'){
        const d=F.dir(g.penaltyTeam);this.line([[g.ball.x,g.ball.y,.5],[d*F.C.halfX,g.penaltyAim,1]],'#ffe69c99',Math.max(1,this.scale*.16));const a=this.project(d*F.C.halfX,g.penaltyAim,1);c.strokeStyle='#ffe998';c.lineWidth=2;c.beginPath();c.arc(a.x,a.y,this.scale,0,Math.PI*2);c.stroke();
      }
      if(!menu){c.fillStyle='#93b5bd';c.font='700 10px system-ui';c.textAlign='center';c.fillText(`${this.teams[0].short}  →                       ←  ${this.teams[1].short}`,w/2,h-bottom+17);}
      this.particles=this.particles.filter(p=>p.life>0);for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=200*dt;c.globalAlpha=Math.min(1,p.life);c.fillStyle=p.color;c.fillRect(p.x,p.y,p.size,p.size*.5);}c.globalAlpha=1;
    }
  };
})(globalThis.Football);
