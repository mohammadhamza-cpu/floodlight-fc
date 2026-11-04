/* Browser orchestration. Exactly one requestAnimationFrame chain and a 120 Hz
 * accumulator own simulation time. Menus, tab blur and visibility freeze play.
 * Debug state is intentionally readable for the included browser regression. */
(function(F){
  'use strict';
  const $=id=>document.getElementById(id),canvas=$('pitch'),overlay=$('overlay');
  const sound=new F.Sound(),renderer=new F.Renderer(canvas),config={mode:'ai',difficulty:'medium',duration:180,home:0,away:1};
  let game=new F.Game(),screen='menu',helpReturn='menu',last=0,accumulator=0,hudStamp='';
  const diagnostics={frames:0,steps:0};
  const controls=new F.Controls(canvas,{active:()=>screen==='play',pause:()=>togglePause(),unlock:()=>sound.unlock()});
  function bind(selector,fn){overlay.querySelector(selector)?.addEventListener('click',fn);}
  function setScreen(next){screen=next;document.body.classList.toggle('playing',next!=='menu');document.body.classList.toggle('local',config.mode==='local'&&next!=='menu');$('hud').hidden=next==='menu';$('pause').hidden=next==='menu'||next==='over';$('touch-controls').hidden=next!=='play'||config.mode==='local';}
  function menu(){
    sound.stop();controls.clear();game.paused=true;setScreen('menu');renderer.teams=[F.teams[config.home],F.teams[config.away]];overlay.hidden=false;$('banner').classList.remove('visible');
    const options=selected=>F.teams.map((t,i)=>`<option value="${i}" ${i===selected?'selected':''}>${t.name}</option>`).join('');
    overlay.innerHTML=`<section class="menu"><div><p class="eyebrow"><span class="live-dot"></span>UNDER THE LIGHTS. INTO THE GAME.</p><div class="headline"><h1>LITTLE LEGS.<br><em>BIG LEAGUE.</em></h1></div><p class="intro">The pitch is yours. Find the pass, beat your marker, and put it in the back of the net.</p><div class="features"><span>7-A-SIDE</span><span>TOUCH + KEYBOARD</span><span>100% OFFLINE</span></div></div><div class="setup"><span class="field-label">01 / PICK YOUR MATCH</span><div class="segment"><button id="mode-ai" aria-pressed="${config.mode==='ai'}">PLAYER vs AI</button><button id="mode-local" aria-pressed="${config.mode==='local'}">LOCAL 2 PLAYER</button></div><span class="field-label">02 / ${config.mode==='ai'?'THE CHALLENGE':'TEAMMATE AI'}</span><div class="segment">${['easy','medium','hard'].map(d=>`<button data-level="${d}" aria-pressed="${d===config.difficulty}">${d.toUpperCase()}</button>`).join('')}</div><span class="field-label">03 / YOUR COLORS · HOME vs AWAY</span><div class="team-select"><select id="home-team" aria-label="Home team">${options(config.home)}</select><span>vs</span><select id="away-team" aria-label="Away team">${options(config.away)}</select></div><span class="field-label">04 / MATCH LENGTH</span><div class="segment">${[120,180,300].map(n=>`<button data-duration="${n}" aria-pressed="${config.duration===n}">${n/60} MIN</button>`).join('')}</div><button id="start" class="primary">KICK OFF <span>↗</span></button><p class="setup-foot">${config.mode==='local'?'TWO PLAYERS · ONE KEYBOARD · NO ONLINE CONNECTION':'WASD / ARROWS TO MOVE · SPACE TO SHOOT · J TO PASS'}</p></div></section>`;
    bind('#mode-ai',()=>{config.mode='ai';menu();});bind('#mode-local',()=>{config.mode='local';menu();});
    overlay.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{config.difficulty=b.dataset.level;menu();});
    overlay.querySelectorAll('[data-duration]').forEach(b=>b.onclick=()=>{config.duration=Number(b.dataset.duration);menu();});
    $('home-team').onchange=e=>{config.home=Number(e.target.value);if(config.home===config.away)config.away=(config.home+1)%F.teams.length;menu();};
    $('away-team').onchange=e=>{config.away=Number(e.target.value);if(config.home===config.away)config.home=(config.away+1)%F.teams.length;menu();};
    bind('#start',start);$('control-guide').textContent='7-A-SIDE · ORIGINAL ARCADE FOOTBALL · PLAY OFFLINE';
  }
  function event(e){sound.play(e.type);renderer.event(e);if(['goal','restart','penalty','over'].includes(e.type))controls.clear();if(e.type==='over')showOver();}
  function start(){
    sound.stop();sound.unlock();controls.clear();controls.mode=config.mode;
    game=new F.Game(config);game.onEvent=event;game.paused=false;renderer.teams=[F.teams[config.home],F.teams[config.away]];renderer.particles=[];setScreen('play');overlay.hidden=true;last=performance.now();accumulator=0;hudStamp='';
    $('control-guide').textContent=config.mode==='local'?'P1  WASD · SPACE shoot/tackle · J pass · K dribble · L.SHIFT sprint · Q switch   |   P2  ARROWS · ENTER · O · I · R.SHIFT · U   |   P pause':'WASD / ARROWS move · SPACE shoot / tackle · J pass · K dribble · SHIFT sprint · Q switch · P pause';
    sound.play('restart');canvas.focus();updateHUD();
  }
  function pause(){
    if(screen!=='play')return;game.paused=true;controls.clear();sound.stop();accumulator=0;setScreen('pause');overlay.hidden=false;$('banner').classList.remove('visible');
    overlay.innerHTML='<section class="panel"><p class="eyebrow">HALF A BREATHER</p><h2>Still your game.</h2><p>The clock is stopped. Come back when you’re ready.</p><button id="resume" class="primary">BACK TO THE PITCH <span>↗</span></button><button id="restart" class="secondary">RESTART MATCH</button><button id="main-menu" class="secondary">TEAM SELECT / MAIN MENU</button></section>';
    bind('#resume',resume);bind('#restart',start);bind('#main-menu',menu);
  }
  function resume(){controls.clear();game.paused=false;setScreen('play');overlay.hidden=true;last=performance.now();accumulator=0;sound.unlock();canvas.focus();}
  function togglePause(){if(screen==='help')closeHelp();else if(screen==='pause')resume();else pause();}
  function showOver(){
    setScreen('over');controls.clear();overlay.hidden=false;updateHUD();const teams=renderer.teams;
    overlay.innerHTML=`<section class="panel"><p class="eyebrow">FULL TIME · THAT’S FOOTBALL</p><h2>${game.winner===null?'Honors even.':teams[game.winner].name+' wins!'}</h2><div class="result"><b>${game.scores[0]}</b><span>:</span><b>${game.scores[1]}</b></div><p style="text-align:center">${teams[0].name} &nbsp; vs &nbsp; ${teams[1].name}</p><div class="stats">${['shots','passes','saves','fouls'].map(k=>`<div><b>${game.stats[k].join(' : ')}</b>${k.toUpperCase()}</div>`).join('')}</div><button id="rematch" class="primary">RUN IT BACK <span>↗</span></button><button id="main-menu" class="secondary">TEAM SELECT / MAIN MENU</button></section>`;
    bind('#rematch',start);bind('#main-menu',menu);
  }
  function help(){
    if(screen==='help'){closeHelp();return;}helpReturn=screen;game.paused=true;controls.clear();sound.stop();setScreen('help');overlay.hidden=false;
    overlay.innerHTML='<section class="panel"><p class="eyebrow">THE BEAUTIFUL LITTLE GAME</p><h2>Make your move.</h2><ul><li><strong>Player 1:</strong> WASD move, Space shoot / tackle, J pass, hold K to dribble/shield, left Shift sprint, Q switch.<br><strong>Player 2:</strong> arrows, Enter shoot / tackle, O pass, I dribble, right Shift sprint, U switch. Solo mode also accepts arrows for movement.</li><li><strong>Touch:</strong> drag the left joystick; tap Shoot or Pass while moving. Hold Sprint for speed, Dribble for close control. Tap Switch to select another defender. Multiple fingers work together.</li><li><strong>Attack:</strong> aim a pass with movement, or release movement for the best forward outlet. Shots aim at goal automatically; hold Up/Down to aim left/right within the goal. Get closer for a better chance. A green ring and P1/P2 arrow show your selected player. Possession and nearest-player selection are automatic.</li><li><strong>Defense:</strong> Shoot becomes a tackle without the ball. Approach from the ball side. A sliding challenge from behind is a foul; inside the penalty area it awards a penalty. Hold Dribble to shield the ball from a standing challenge. Keepers dive, catch and distribute automatically.</li><li><strong>Penalties:</strong> attacker uses Up/Down to aim and Shoot to take the kick within six seconds. The defending local player can move the goalkeeper with Up/Down. The kick is taken automatically if time runs out.</li><li><strong>Rules:</strong> seven a side. Ball out gives throw-ins, corners or goal kicks automatically. No offside, cards or halftime. Dead-ball time is stopped. Most goals at full time wins; level scores are a draw.</li><li><strong>P / Escape</strong> pauses. Changing tabs pauses too. Local two-player mode needs a keyboard. Turn your phone sideways for a larger pitch.</li></ul><button id="close-help" class="primary">LET’S PLAY <span>↗</span></button></section>';
    bind('#close-help',closeHelp);
  }
  function closeHelp(){if(helpReturn==='play')resume();else if(helpReturn==='pause'){setScreen('play');pause();}else if(helpReturn==='over')showOver();else menu();}
  function updateHUD(){
    const seconds=Math.ceil(game.remaining),stamp=[...game.scores,seconds,config.mode,config.difficulty,config.home,config.away].join('|');if(stamp===hudStamp)return;hudStamp=stamp;
    $('score-home').textContent=game.scores[0];$('score-away').textContent=game.scores[1];$('clock').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
    $('home-name').textContent=renderer.teams[0].short;$('away-name').textContent=renderer.teams[1].short;$('home-dot').style.background=renderer.teams[0].color;$('away-dot').style.background=renderer.teams[1].color;$('away-label').textContent=config.mode==='local'?'PLAYER 2':config.difficulty.toUpperCase()+' AI';
  }
  function frame(now){
    const dt=last?Math.min(.1,Math.max(0,(now-last)/1000)):0;last=now;diagnostics.frames++;
    if(screen==='play'){accumulator+=dt;while(accumulator>=F.C.step){accumulator-=F.C.step;game.step(F.C.step,controls.sample());diagnostics.steps++;if(screen!=='play')break;}}
    else accumulator=0;
    renderer.draw(game,screen==='pause'||screen==='help'?0:dt,screen==='menu');
    if(screen==='play'){updateHUD();$('banner').textContent=game.message;$('banner').classList.toggle('visible',game.messageTime>0);}
    requestAnimationFrame(frame);
  }
  $('pause').onclick=togglePause;$('help').onclick=help;$('brand').onclick=e=>{e.preventDefault();if(screen==='play')pause();};
  $('sound').onclick=()=>{sound.toggle();$('sound').textContent=sound.enabled?'SOUND ON':'SOUND OFF';$('sound').setAttribute('aria-pressed',String(sound.enabled));$('sound').setAttribute('aria-label',sound.enabled?'Disable sound':'Enable sound');if(screen==='play')canvas.focus();};
  window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  globalThis.Floodlight={get game(){return game;},get screen(){return screen;},config,controls,renderer,sound,diagnostics,start,pause,resume,menu};
  menu();requestAnimationFrame(frame);
})(globalThis.Football);
