/* Optional original procedural cues: no audio files or network requests. */
(function(F){'use strict';F.Sound=class{
  constructor(){this.context=null;this.enabled=false;this.voices=new Set();this.played={};}
  unlock(){if(!this.enabled)return;try{if(!this.context)this.context=new(window.AudioContext||window.webkitAudioContext)();if(this.context.state==='suspended')this.context.resume().catch(()=>{});}catch(e){this.enabled=false;}}
  play(type){if(!this.enabled||!this.context)return;const c=this.context,t=c.currentTime;
    const notes={shoot:[180,75],pass:[260,140],tackle:[100,65],post:[600,300],save:[320,220],restart:[1000,1200],foul:[1350,1350],penalty:[1350,1000],goal:[392,494,587,784],over:[523,440,349,523]};
    if(!notes[type])return;this.played[type]=(this.played[type]||0)+1;
    notes[type].forEach((hz,i)=>{const o=c.createOscillator(),v=c.createGain(),start=t+i*.10;o.type=type==='shoot'?'triangle':'sine';o.frequency.setValueAtTime(hz,start);v.gain.setValueAtTime(0,start);v.gain.linearRampToValueAtTime(.07,start+.012);v.gain.exponentialRampToValueAtTime(.001,start+.22);o.connect(v);v.connect(c.destination);o.start(start);o.stop(start+.24);this.voices.add(o);o.onended=()=>{this.voices.delete(o);o.disconnect();v.disconnect();};});
  }
  stop(){for(const o of this.voices){try{o.stop();}catch(e){}}this.voices.clear();}
  toggle(){this.enabled=!this.enabled;if(this.enabled)this.unlock();else this.stop();}
};})(globalThis.Football);
