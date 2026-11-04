/* Keyboard and multi-pointer touch input. Edges are consumed once per physics
 * tick; held sprint/dribble and analog joystick are continuous. Cancellation,
 * blur and pause discard input, never synthesize a shot. */
(function(F){
  'use strict';
  const maps=[{up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',shoot:'Space',pass:'KeyJ',dribble:'KeyK',sprint:'ShiftLeft',switch:'KeyQ'},
    {up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight',shoot:'Enter',pass:'KeyO',dribble:'KeyI',sprint:'ShiftRight',switch:'KeyU'}];
  F.Controls=class{
    constructor(canvas,{active,pause,unlock}){
      this.keys=new Set();this.edges=new Set();this.pointers=new Map();this.axis={x:0,y:0};this.mode='ai';this.canvas=canvas;this.active=active;
      const codes=new Set(maps.flatMap(m=>Object.values(m)));
      window.addEventListener('keydown',e=>{
        const interactive=/^(BUTTON|SELECT|INPUT)$/.test(document.activeElement?.tagName);
        if(e.code==='Escape'||e.code==='KeyP'){if(!e.repeat){e.preventDefault();pause();}return;}
        if(!active()||interactive||!codes.has(e.code))return;
        e.preventDefault();unlock();if(!this.keys.has(e.code)&&!e.repeat)this.edges.add(e.code);this.keys.add(e.code);
      });
      window.addEventListener('keyup',e=>{this.keys.delete(e.code);});
      canvas.addEventListener('pointerdown',()=>{canvas.focus();unlock();});
      this.joy=document.getElementById('joystick');this.knob=document.getElementById('stick');
      this.joy.addEventListener('pointerdown',e=>{if(!active()||this.joyId!==undefined)return;e.preventDefault();this.joyId=e.pointerId;this.joy.setPointerCapture(e.pointerId);this.joyMove(e);unlock();canvas.focus();});
      this.joy.addEventListener('pointermove',e=>{if(e.pointerId===this.joyId)this.joyMove(e);});
      const joyEnd=e=>{if(e.pointerId===this.joyId){this.joyId=undefined;this.axis={x:0,y:0};this.paintJoy();}};
      ['pointerup','pointercancel','lostpointercapture'].forEach(type=>this.joy.addEventListener(type,joyEnd));
      document.querySelectorAll('[data-action]').forEach(el=>{
        el.addEventListener('pointerdown',e=>{if(!active())return;e.preventDefault();el.setPointerCapture(e.pointerId);const action=el.dataset.action;this.pointers.set(e.pointerId,action);this.edges.add('touch-'+action);el.classList.add('held');canvas.focus();unlock();});
        const end=e=>{this.pointers.delete(e.pointerId);if(![...this.pointers.values()].includes(el.dataset.action))el.classList.remove('held');};
        ['pointerup','pointercancel','lostpointercapture'].forEach(type=>el.addEventListener(type,end));
      });
    }
    joyMove(e){const r=this.joy.getBoundingClientRect(),radius=r.width*.33,dx=(e.clientX-r.x-r.width/2)/radius,dy=(e.clientY-r.y-r.height/2)/radius,n=Math.hypot(dx,dy);this.axis=n<.12?{x:0,y:0}:{x:dx/Math.max(1,n),y:dy/Math.max(1,n)};this.paintJoy();}
    paintJoy(){this.knob.style.transform=`translate(${this.axis.x*33}px,${this.axis.y*33}px)`;}
    sample(){
      const result=maps.map((m,team)=>{const held=a=>this.keys.has(m[a])||(team===0&&[...this.pointers.values()].includes(a));
        const edge=a=>this.edges.has(m[a])||(team===0&&this.edges.has('touch-'+a));
        return {x:(held('right')?1:0)-(held('left')?1:0)+(team===0?this.axis.x:0),y:(held('down')?1:0)-(held('up')?1:0)+(team===0?this.axis.y:0),shoot:edge('shoot'),pass:edge('pass'),switch:edge('switch'),dribble:held('dribble'),sprint:held('sprint')};});
      if(this.mode==='ai'){
        result[0].x+=result[1].x;result[0].y+=result[1].y;result[1]=F.emptyInput();
      }
      this.edges.clear();return result;
    }
    clear(){this.keys.clear();this.edges.clear();this.pointers.clear();this.axis={x:0,y:0};this.joyId=undefined;this.paintJoy();document.querySelectorAll('[data-action]').forEach(el=>el.classList.remove('held'));}
  };
})(globalThis.Football);
