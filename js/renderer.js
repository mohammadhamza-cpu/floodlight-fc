/* Original Canvas 2.5D art. A fixed elevated perspective keeps all 14 players
 * and the complete pitch visible; ground geometry, shadows and height all use
 * the same projection. No downloaded textures, fonts or character assets. */
(function(F){
  'use strict';
  F.teams=[{name:'Harbor City',short:'HBR',color:'#39b8ff',dark:'#14659e'},{name:'Ember United',short:'EMB',color:'#ff664f',dark:'#b12f39'}, {name:'Violet Rovers',short:'VIO',color:'#b390ff',dark:'#6039a2'},{name:'Golden Athletic',short:'GLD',color:'#ffd550',dark:'#a77916'}, {name:'Rose Town',short:'ROS',color:'#ff8ebe',dark:'#aa3969'},{name:'Arctic FC',short:'ARC',color:'#edf9ff',dark:'#729bad'}];
  F.Renderer=class{
    constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.teams=[F.teams[0],F.teams[1]];this.time=0;this.particles=[];this.resize();window.addEventListener('resize',()=>this.resize());}
    resize(){const r=this.canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);this.w=r.width;this.h=r.height;this.canvas.width=Math.round(r.width*d);this.canvas.height=Math.round(r.height*d);this.ctx.setTransform(d,0,0,d,0,0);}
    project(x,y,z=0){const q=1+y*.0027;return {x:this.cx+x*this.scale*q,y:this.cy+y*this.scale*.63-z*this.scale*.84,s:this.scale*q};}
    path(points,close=false){const c=this.ctx;c.beginPath();points.forEach((v,i)=>{const p=this.project(...v);if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);});if(close)c.closePath();}
    poly(points,fill,stroke,width=1){this.path(points,true);if(fill){this.ctx.fillStyle=fill;this.ctx.fill();}if(stroke){this.ctx.strokeStyle=stroke;this.ctx.lineWidth=width;this.ctx.stroke();}}
    line(points,color,width=1){this.path(points);this.ctx.strokeStyle=color;this.ctx.lineWidth=width;this.ctx.stroke();}
    circle(x,y,r,color,width=1){const points=[];for(let i=0;i<=60;i++){const a=i/60*Math.PI*2;points.push([x+Math.cos(a)*r,y+Math.sin(a)*r]);}this.line(points,color,width);}
    event(e){if(e.type==='goal'){for(let i=0;i<85;i++)this.particles.push({x:this.w*.25+Math.random()*this.w*.5,y:this.h*.25,vx:(Math.random()-.5)*200,vy:-90-Math.random()*230,life:2.8,color:i%2?this.teams[e.team].color:'#e5ff89',size:3+Math.random()*4});}}
    field(){
      const c=this.ctx,s=this.scale;
      // Stadium apron and stepped stands surround, rather than obscure, the pitch.
      this.poly([[-63,-43],[63,-43],[64,44],[-64,44]],'#183a42');
      for(let j=0;j<4;j++){
        this.poly([[-61,-44-j*2],[61,-44-j*2],[61,-43-j*2],[-61,-43-j*2]],j%2?'#244b57':'#1b394b');
        for(let i=0;i<70;i++){const p=this.project(-59+i*1.72,-43.5-j*2);c.fillStyle=['#869998','#596e7b','#ecbb80','#314c68','#74a8b7'][(i*7+j*3)%5];c.fillRect(p.x,p.y,Math.max(1,s*.43),Math.max(1,s*.45));}
      }
      this.poly([[-54,-36],[54,-36],[54,36],[-54,36]],'#143f36');
      this.poly([[-52,-34],[52,-34],[52,34],[-52,34]],'#39965a');
      for(let i=0;i<13;i++){const x=-52+i*8;this.poly([[x,-34],[x+8,-34],[x+8,34],[x,34]],i%2?'#389354':'#409e5d');}
      // Fine turf strokes are deterministic and subtle, never per-frame random.
      c.globalAlpha=.09;
      for(let i=0;i<430;i++){const x=((i*47)%103)-51,y=((i*29)%67)-33;this.line([[x,y],[x+.25,y-.22]],'#d6f3aa',Math.max(.45,s*.07));}
      c.globalAlpha=1;
      const white='#d8efda',lw=Math.max(1,s*.15);
      this.poly([[-52,-34],[52,-34],[52,34],[-52,34]],null,white,lw);this.line([[0,-34],[0,34]],white,lw);this.circle(0,0,9.2,white,lw);
      for(const d of [-1,1]){
        this.poly([[d*52,-19],[d*35,-19],[d*35,19],[d*52,19]],null,white,lw);
        this.poly([[d*52,-10],[d*46,-10],[d*46,10],[d*52,10]],null,white,lw);
        const points=[];for(let i=0;i<=30;i++){const a=-1.05+i/30*2.1;points.push([d*(41-Math.cos(a)*9.2),Math.sin(a)*9.2]);}this.line(points,white,lw);
        this.circle(d*41,0,.21,white,s*.35);
        for(const y of [-34,34]){const p=this.project(d*52,y),top=this.project(d*52,y,2.8);c.strokeStyle='#f4f5e8';c.lineWidth=Math.max(1,s*.12);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(top.x,top.y);c.stroke();c.fillStyle='#e8ff7c';c.beginPath();c.moveTo(top.x,top.y);c.lineTo(top.x+s*1.2,top.y+s*.5);c.lineTo(top.x,top.y+s);c.fill();}
      }
      this.circle(0,0,.2,white,s*.4);
      for(const y of [-39,39]){
        for(let i=0;i<5;i++){const x=-50+i*20;this.poly([[x,y-1],[x+18,y-1],[x+18,y+1],[x,y+1]],i%2?'#dcf783':'#244552');const p=this.project(x+9,y);c.fillStyle=i%2?'#183b31':'#b6d1d4';c.font=`800 ${Math.max(4,s*.75)}px system-ui`;c.textAlign='center';c.fillText(['FLOODLIGHT FC','PLAY BEAUTIFULLY','7-A-SIDE','ALL HEART','THE NIGHT IS YOURS'][i],p.x,p.y+s*.28);}
      }
    }
    goal(d,front=false){
      const x=d*52,back=d*56.5,c=this.ctx,s=this.scale;
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
    player(p,g){
      const c=this.ctx,a=this.project(p.x,p.y),s=a.s,selected=g.selected[p.team]===p.id&&(p.team===0||g.mode==='local'),team=this.teams[p.team];
      c.save();c.translate(a.x,a.y);
      c.fillStyle='#092e3850';c.beginPath();c.ellipse(s*.7,s*.38,s*1.4,s*.55,-.15,0,Math.PI*2);c.fill();
      if(selected){c.strokeStyle=p.team===0?'#dfff7f':'#fff4bc';c.lineWidth=Math.max(1.3,s*.18);c.beginPath();c.ellipse(0,0,s*1.9,s*.82,0,0,Math.PI*2);c.stroke();}
      if(p.sprinting){c.strokeStyle='#ddf6cf69';c.lineWidth=s*.12;for(let i=0;i<2;i++){c.beginPath();c.moveTo(-p.fx*s*2,-s*(1+i));c.lineTo(-p.fx*s*3.2,-s*(1+i));c.stroke();}}
      const jump=p.celebrate>0?Math.max(0,Math.sin(this.time*10+p.id))*.9:0;
      c.translate(0,-jump*s);if(p.dive>0)c.rotate(p.diveY*.9);else if(p.slide>0){c.translate(p.fx*s*.7,-s*.2);c.rotate(-p.fx*.9);}
      const run=Math.min(1,Math.hypot(p.vx,p.vy)/5),swing=Math.sin(p.stride)*.85*run,face=p.fx>=0?1:-1,skin='#172c35',boot='#ecf5ee';
      const limb=(points,color,width)=>{c.beginPath();points.forEach((v,i)=>{if(i)c.lineTo(v[0]*s,v[1]*s);else c.moveTo(v[0]*s,v[1]*s);});c.strokeStyle=color;c.lineWidth=s*width;c.lineCap='round';c.lineJoin='round';c.stroke();};
      const kick=p.kick>0?Math.sin(p.kick/.34*Math.PI)*1.7:0;
      limb([[0,-2.05],[-swing*.7,-1.1],[-swing,0]],skin,.34);
      limb([[0,-2.05],[swing*.7+kick*face*.4,-1.1],[swing+kick*face,-kick*.42]],skin,.38);
      limb([[-swing-.08,-.08],[-swing+.36,-.02]],boot,.25);
      limb([[swing+kick*face-.08,-kick*.42],[swing+kick*face+.36,-kick*.42]],boot,.25);
      const arm=p.celebrate>0?-5.25:-2.3;
      limb([[-.5,-3.3],[-.9,-2.65-swing*.35],[-1.2+swing*.25,arm]],skin,.29);
      limb([[.5,-3.3],[.9,-2.7+swing*.35],[1.1-swing*.25,arm]],skin,.29);
      // Short team shirt over a stick torso; contrasting keepers have gloves.
      const color=p.keeper?(p.team===0?'#ffcf5c':'#9ff291'):team.color;
      const gradient=c.createLinearGradient(-s,0,s,0);gradient.addColorStop(0,p.keeper?'#599b69':team.dark);gradient.addColorStop(.6,color);gradient.addColorStop(1,color);c.fillStyle=gradient;
      c.beginPath();c.moveTo(-s*.65,-s*3.55);c.lineTo(s*.65,-s*3.55);c.lineTo(s*.5,-s*2.1);c.lineTo(-s*.5,-s*2.1);c.closePath();c.fill();
      c.fillStyle='#f7ffff';c.font=`bold ${s*.65}px system-ui`;c.textAlign='center';c.fillText(String(p.number),0,-s*2.6);
      if(p.keeper){for(const x of [-1.2,1.1]){c.fillStyle='#f4f8e7';c.beginPath();c.arc(x*s,arm*s,s*.25,0,Math.PI*2);c.fill();}}
      const head=c.createRadialGradient(-s*.18,-s*4.37,s*.03,0,-s*4.2,s*.64);head.addColorStop(0,'#435966');head.addColorStop(1,'#102430');c.fillStyle=head;c.beginPath();c.arc(0,-s*4.2,s*.65,0,Math.PI*2);c.fill();
      c.fillStyle='#b5d1dc';c.beginPath();c.arc(face*s*.32,-s*4.3,s*.09,0,Math.PI*2);c.fill();
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
      this.scale=Math.min((w-28)/126,(available-20)/61);this.cx=w/2;this.cy=top+available*.5;
      c.clearRect(0,0,w,h);const bg=c.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#142c40');bg.addColorStop(1,'#081d2b');c.fillStyle=bg;c.fillRect(0,0,w,h);
      // Soft floodlight pools.
      for(const x of [w*.12,w*.88]){const glow=c.createRadialGradient(x,70,5,x,70,w*.48);glow.addColorStop(0,'#b6e9f314');glow.addColorStop(1,'#a9edf000');c.fillStyle=glow;c.fillRect(0,0,w,h);}
      this.field();this.goal(-1);this.goal(1);
      const entries=g.players.map(p=>({y:p.y,draw:()=>this.player(p,g)}));entries.push({y:g.ball.y,draw:()=>this.ball(g.ball)});entries.sort((a,b)=>a.y-b.y).forEach(e=>e.draw());
      this.goal(-1,true);this.goal(1,true);
      if(g.phase==='penalty'){
        const d=F.dir(g.penaltyTeam);this.line([[g.ball.x,g.ball.y,.5],[d*52,g.penaltyAim,1]],'#ffe69c99',Math.max(1,this.scale*.16));const a=this.project(d*52,g.penaltyAim,1);c.strokeStyle='#ffe998';c.lineWidth=2;c.beginPath();c.arc(a.x,a.y,this.scale,0,Math.PI*2);c.stroke();
      }
      if(!menu){c.fillStyle='#93b5bd';c.font='700 10px system-ui';c.textAlign='center';c.fillText(`${this.teams[0].short}  →                       ←  ${this.teams[1].short}`,w/2,h-bottom+17);}
      this.particles=this.particles.filter(p=>p.life>0);for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=200*dt;c.globalAlpha=Math.min(1,p.life);c.fillStyle=p.color;c.fillRect(p.x,p.y,p.size,p.size*.5);}c.globalAlpha=1;
    }
  };
})(globalThis.Football);
