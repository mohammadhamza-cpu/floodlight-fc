/* Swept whole-ball goal detection, solid posts/crossbar and ball-out restarts.
 * Arcade rules: no offside, no cards, draws stand. Reckless in-box challenges
 * cause a penalty; other fouls cause a free kick. No sudden-death shootout. */
(function(F){
  'use strict';
  F.checkBoundary=function(g,old){
    const b=g.ball,C=F.C;
    for(const sx of [-1,1]){
      const line=sx*C.halfX;
      // Swept collisions stop fast balls tunneling through a goalpost.
      for(const sy of [-1,1]){
        const post={x:line,y:sy*C.goalY};
        if(b.z<C.goalH+.25&&F.segmentDistance(old,b,post)<C.ballR+.24){
          const carrier=g.player(b.owner);if(carrier){b.vx=carrier.vx;b.vy=carrier.vy;b.owner=null;}
          const dx=b.x-post.x,dy=b.y-post.y,u=F.unit(dx,dy),dot=b.vx*u.x+b.vy*u.y;
          b.x=post.x+u.x*(C.ballR+.26);b.y=post.y+u.y*(C.ballR+.26);
          b.vx-=1.8*dot*u.x;b.vy-=1.8*dot*u.y;b.lock=.15;g.emit('post');return;
        }
      }
      if((old.x-line)*(b.x-line)<=0&&Math.abs(b.x-old.x)>.00001){
        const t=(line-old.x)/(b.x-old.x),y=old.y+(b.y-old.y)*t,z=old.z+(b.z-old.z)*t;
        if(Math.abs(y)<C.goalY&&Math.abs(z-C.goalH)<C.ballR+.18){b.x=line-sx*.5;b.vx=-b.vx*.78;b.vz=-b.vz*.4;g.emit('post');return;}
      }
      const threshold=sx*(C.halfX+C.ballR);
      if(old.x*sx<=threshold*sx&&b.x*sx>threshold*sx){
        const t=(threshold-old.x)/(b.x-old.x),y=old.y+(b.y-old.y)*t,z=old.z+(b.z-old.z)*t;
        if(Math.abs(y)<C.goalY-C.ballR&&z<C.goalH-C.ballR){g.goal(sx===1?0:1);return;}
      }
    }
    if(Math.abs(b.x)>C.halfX+C.ballR){
      const defending=b.x<0?0:1;
      if(b.lastTeam===defending)g.restart('corner',1-defending,{x:Math.sign(b.x)*50.3,y:Math.sign(b.y||1)*32});
      else g.restart('goal kick',defending,{x:Math.sign(b.x)*45,y:0});
    }else if(Math.abs(b.y)>C.halfY+C.ballR){g.restart('throw in',1-b.lastTeam,{x:F.clamp(b.x,-48,48),y:Math.sign(b.y)*32});}
  };
})(globalThis.Football);
