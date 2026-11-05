/* Browser orchestration. Exactly one requestAnimationFrame chain and a 120 Hz
 * accumulator own simulation time. FIFA-style menu flow: match setup over the
 * live pitch -> dedicated team-select screen -> kickoff. Menus, tab blur and
 * visibility freeze play. Debug state stays readable for the regression. */
(function(F){
  'use strict';
  const $=id=>document.getElementById(id),canvas=$('pitch'),overlay=$('overlay');
  const sound=new F.Sound(),renderer=new F.Renderer(canvas),config={mode:'ai',difficulty:'medium',duration:180,home:0,away:1};
  let game=new F.Game(),screen='menu',helpReturn='menu',last=0,accumulator=0,hudStamp='';
  const diagnostics={frames:0,steps:0};
  const controls=new F.Controls(canvas,{active:()=>screen==='play',pause:()=>togglePause(),unlock:()=>sound.unlock()});
  function bind(selector,fn){overlay.querySelector(selector)?.addEventListener('click',fn);}
  function setScreen(next){screen=next;document.body.classList.toggle('playing',!['menu','teams'].includes(next));document.body.classList.toggle('local',config.mode==='local'&&!['menu','teams'].includes(next));$('hud').hidden=['menu','teams'].includes(next);$('pause').hidden=['menu','teams','over'].includes(next);$('touch-controls').hidden=next!=='play'||config.mode==='local';}
  function kitPreview(team,size=86){
    const t=F.teams[team],s=size/100;
    let pattern='';
    if(t.pattern==='stripes')pattern=[-18,0,18].map(x=>`<rect x="${50+x-6}" y="22" width="12" height="52" fill="${t.accent}"/>`).join('');
    else if(t.pattern==='hoops')pattern=[34,50,66].map(y=>`<rect x="18" y="${y-5}" width="64" height="10" fill="${t.accent}"/>`).join('');
    else if(t.pattern==='sash')pattern=`<polygon points="22,22 40,22 82,74 64,74" fill="${t.accent}"/>`;
    else if(t.pattern==='halves')pattern=`<rect x="50" y="22" width="32" height="52" fill="${t.accent}"/>`;
    return `<svg viewBox="0 0 100 100" width="${100*s}" height="${100*s}" aria-hidden="true"><path d="M18 22 L38 14 L50 20 L62 14 L82 22 L76 38 L70 34 L70 74 L30 74 L30 34 L24 38 Z" fill="${t.color}"/><clipPath id="kit-${team}"><path d="M18 22 L38 14 L50 20 L62 14 L82 22 L76 38 L70 34 L70 74 L30 74 L30 34 L24 38 Z"/></clipPath><g clip-path="url(#kit-${team})">${pattern}<rect x="18" y="14" width="64" height="7" fill="${t.dark}"/></g><rect x="34" y="74" width="32" height="14" rx="2" fill="${t.shorts}"/><rect x="36" y="92" width="10" height="6" fill="${t.socks}"/><rect x="54" y="92" width="10" height="6" fill="${t.socks}"/></svg>`;
  }
  function menu(){
    sound.stop();controls.clear();game.paused=true;setScreen('menu');renderer.teams=[F.teams[config.home],F.teams[config.away]];overlay.hidden=false;$('banner').classList.remove('visible');
    overlay.innerHTML=`<section class="shell menu-shell"><header class="shell-head"><p class="eyebrow"><span class="live-dot"></span>UNDER THE LIGHTS · ARCADE FOOTBALL</p><h1>FLOODLIGHT <em>FC</em></h1></header>
    <div class="card-row">
      <article class="mode-card ${config.mode==='ai'?'active':''}" id="card-ai" role="button" tabindex="0" aria-pressed="${config.mode==='ai'}"><span class="card-art">◉ vs ▣</span><h2>PLAYER vs AI</h2><p>Lead your seven against the machine.</p></article>
      <article class="mode-card ${config.mode==='local'?'active':''}" id="card-local" role="button" tabindex="0" aria-pressed="${config.mode==='local'}"><span class="card-art">◉ vs ◉</span><h2>LOCAL 2 PLAYER</h2><p>One keyboard. Two rivals. No mercy.</p></article>
      <article class="option-card"><h3>${config.mode==='ai'?'CPU CHALLENGE':'SUPPORT AI'}</h3><div class="segment">${['easy','medium','hard'].map(d=>`<button data-level="${d}" aria-pressed="${d===config.difficulty}">${d.toUpperCase()}</button>`).join('')}</div><h3>MATCH LENGTH</h3><div class="segment">${[120,180,300].map(n=>`<button data-duration="${n}" aria-pressed="${config.duration===n}">${n/60} MIN</button>`).join('')}</div></article>
    </div>
    <button id="to-teams" class="primary">CHOOSE TEAMS <span>→</span></button>
    <p class="menu-foot">${config.mode==='local'?'TWO PLAYERS · ONE KEYBOARD · 100% OFFLINE':'WASD MOVE · HOLD SPACE FOR POWER · E PASS · 100% OFFLINE'}</p></section>`;
    const pick=mode=>{config.mode=mode;menu();};
    ['ai','local'].forEach(mode=>{const card=$(`card-${mode}`);card.addEventListener('click',()=>pick(mode));card.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();pick(mode);}});});
    overlay.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{config.difficulty=b.dataset.level;menu();});
    overlay.querySelectorAll('[data-duration]').forEach(b=>b.onclick=()=>{config.duration=Number(b.dataset.duration);menu();});
    bind('#to-teams',teams);
    $('control-guide').textContent='7-A-SIDE · ORIGINAL ARCADE FOOTBALL · PLAY OFFLINE';
  }
  function teams(){
    setScreen('teams');overlay.hidden=false;controls.clear();game.paused=true;
    const side=(label,key,other)=>`<div class="team-column"><h3>${label}</h3><div class="kit-grid" data-side="${key}">${F.teams.map((t,i)=>`<button class="kit-card ${config[key]===i?'active':''}" data-team="${i}" aria-pressed="${config[key]===i}" ${config[other]===i?'data-taken="true"':''}><span class="kit-art">${kitPreview(i,62)}</span><b>${t.name}</b><small>${t.pattern.toUpperCase()} · ${t.short}</small></button>`).join('')}</div></div>`;
    overlay.innerHTML=`<section class="shell teams-shell"><header class="shell-head"><p class="eyebrow">STEP 2 / 2 · PICK YOUR COLORS</p><h1>TEAM <em>SELECT</em></h1></header>
    <div class="team-row">${side(config.mode==='local'?'PLAYER 1 · HOME':'YOU · HOME','home','away')}<div class="versus"><div class="versus-badge">VS</div><div class="versus-kits">${kitPreview(config.home,70)}${kitPreview(config.away,70)}</div><p>${F.teams[config.home].short} vs ${F.teams[config.away].short}</p></div>${side(config.mode==='local'?'PLAYER 2 · AWAY':`${config.difficulty.toUpperCase()} AI · AWAY`,'away','home')}</div>
    <div class="teams-actions"><button id="back-menu" class="secondary">← MATCH OPTIONS</button><button id="start" class="primary">KICK OFF <span>↗</span></button></div></section>`;
    overlay.querySelectorAll('.kit-grid').forEach(grid=>grid.querySelectorAll('.kit-card').forEach(card=>card.onclick=()=>{
      const side=grid.dataset.side,team=Number(card.dataset.team),other=side==='home'?'away':'home';
      config[side]=team;if(config[other]===team)config[other]=(team+1)%F.teams.length;
      renderer.teams=[F.teams[config.home],F.teams[config.away]];teams();
    }));
    bind('#back-menu',menu);bind('#start',start);
  }
  function event(e){sound.play(e.type);renderer.event(e);if(['goal','restart','penalty','over'].includes(e.type))controls.clear();if(e.type==='over')showOver();}
  function start(){
    sound.stop();sound.unlock();controls.clear();controls.mode=config.mode;
    game=new F.Game(config);game.onEvent=event;game.paused=false;renderer.teams=[F.teams[config.home],F.teams[config.away]];renderer.particles=[];setScreen('play');overlay.hidden=true;last=performance.now();accumulator=0;hudStamp='';
    $('control-guide').textContent=config.mode==='local'?'P1  WASD · hold SPACE shoot / slide · E pass+tackle · F dribble · L.SHIFT sprint · Q switch   |   P2  ARROWS · ENTER · O · I · R.SHIFT · U   |   P pause':'WASD / ARROWS move · hold SPACE power shot / slide · E pass + clean tackle · F dribble · SHIFT sprint · Q switch · P pause';
    sound.play('restart');canvas.focus();updateHUD();
  }
  function pause(){
    if(screen!=='play')return;game.paused=true;game.cancelCharges();controls.clear();sound.stop();accumulator=0;setScreen('pause');overlay.hidden=false;$('banner').classList.remove('visible');
    overlay.innerHTML='<section class="panel"><p class="eyebrow">HALF A BREATHER</p><h2>Still your game.</h2><p>The clock is stopped. Come back when you’re ready.</p><button id="resume" class="primary">BACK TO THE PITCH <span>↗</span></button><button id="restart" class="secondary">RESTART MATCH</button><button id="main-menu" class="secondary">MATCH OPTIONS / MAIN MENU</button></section>';
    bind('#resume',resume);bind('#restart',start);bind('#main-menu',menu);
  }
  function resume(){controls.clear();game.paused=false;setScreen('play');overlay.hidden=true;last=performance.now();accumulator=0;sound.unlock();canvas.focus();}
  function togglePause(){if(screen==='help')closeHelp();else if(screen==='pause')resume();else pause();}
  function showOver(){
    setScreen('over');controls.clear();overlay.hidden=false;updateHUD();const teamList=renderer.teams;
    overlay.innerHTML=`<section class="panel"><p class="eyebrow">FULL TIME · THAT’S FOOTBALL</p><h2>${game.winner===null?'Honors even.':teamList[game.winner].name+' wins!'}</h2><div class="result"><b>${game.scores[0]}</b><span>:</span><b>${game.scores[1]}</b></div><p style="text-align:center">${teamList[0].name} &nbsp; vs &nbsp; ${teamList[1].name}</p><div class="stats">${['shots','passes','cleanTackles','saves'].map(k=>`<div><b>${game.stats[k].join(' : ')}</b>${k==='cleanTackles'?'CLEAN TACKLES':k.toUpperCase()}</div>`).join('')}</div><button id="rematch" class="primary">RUN IT BACK <span>↗</span></button><button id="main-menu" class="secondary">MATCH OPTIONS / MAIN MENU</button></section>`;
    bind('#rematch',start);bind('#main-menu',menu);
  }
  function help(){
    if(screen==='help'){closeHelp();return;}helpReturn=screen;game.paused=true;game.cancelCharges();controls.clear();sound.stop();setScreen('help');overlay.hidden=false;
    overlay.innerHTML='<section class="panel"><p class="eyebrow">THE BEAUTIFUL LITTLE GAME</p><h2>Make your move.</h2><ul><li><strong>Player 1:</strong> WASD move, hold <strong>Space</strong> to charge a shot and release to strike (tap = 40%, full bar ≈ 0.85 s), <strong>E</strong> pass, hold <strong>F</strong> to dribble/shield, left Shift sprint, Q switch.<br><strong>Player 2:</strong> arrows, Enter shot (hold for power), O pass, I dribble, right Shift sprint, U switch. Solo mode also accepts arrows.</li><li><strong>Touch:</strong> drag the left joystick. Hold <strong>SHOOT</strong> to charge, release to strike; tap Pass while moving to aim it. Hold Sprint or Dribble; tap Switch. Multiple fingers work together.</li><li><strong>Attack:</strong> movement aims passes; without movement the best forward outlet is chosen. Shots aim at goal automatically — hold Up/Down to place them across the goal mouth, and use more charge for distance. Charging slows you down. A green ring and P1/P2 arrow mark your player; possession switches selection automatically.</li><li><strong>Defense — two tackles:</strong> without the ball, <strong>E/O is a clean standing tackle</strong>: safe, short range, wins the ball from the front or side once the carrier has touched it. <strong>Space/Enter is a sliding challenge</strong>: longer reach, but sliding in from behind concedes a free kick — or a penalty inside your own box. Hold Dribble to shield against standing challenges. Keepers dive, catch and distribute automatically.</li><li><strong>Penalties:</strong> attacker aims with Up/Down and shoots within six seconds. The defending local player moves the keeper with their Up/Down keys. Timeout takes the shot automatically.</li><li><strong>Rules:</strong> seven a side on a big pitch. Throw-ins, corners and goal kicks are automatic. No offside, cards or halftime. Dead-ball time is stopped. Most goals at full time wins; level scores are a draw.</li><li><strong>P / Escape</strong> pauses. Changing tabs pauses too. Local two-player mode needs a keyboard. Turn your phone sideways for a larger pitch.</li></ul><button id="close-help" class="primary">LET’S PLAY <span>↗</span></button></section>';
    bind('#close-help',closeHelp);
  }
  function closeHelp(){if(helpReturn==='play')resume();else if(helpReturn==='pause'){setScreen('play');pause();}else if(helpReturn==='over')showOver();else if(helpReturn==='teams')teams();else menu();}
  function updateHUD(){
    const seconds=Math.ceil(game.remaining),stamp=[...game.scores,seconds,config.mode,config.difficulty,config.home,config.away].join('|');if(stamp===hudStamp)return;hudStamp=stamp;
    $('score-home').textContent=game.scores[0];$('score-away').textContent=game.scores[1];$('clock').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
    $('home-name').textContent=renderer.teams[0].short;$('away-name').textContent=renderer.teams[1].short;$('home-dot').style.background=renderer.teams[0].color;$('away-dot').style.background=renderer.teams[1].color;$('away-label').textContent=config.mode==='local'?'PLAYER 2':config.difficulty.toUpperCase()+' AI';
  }
  function updatePower(){
    // HUD power bar mirrors the selected player's live charge, then flashes
    // the struck power briefly after release.
    const bar=$('power-fill'),label=$('power-label'),box=$('power');
    let fraction=0,text='HOLD SHOOT FOR POWER',active=false;
    for(const team of [0,1]){
      if(team===1&&config.mode!=='local')continue;
      const p=game.player(game.selected[team]);
      if(p&&p.charging){fraction=F.powerFromHold(p.chargeSeconds);text=`P${team+1} POWER ${Math.round(fraction*100)}%`;active=true;break;}
      if(p&&p.powerFlash>0){fraction=p.swingPower;text=`P${team+1} STRUCK ${Math.round(fraction*100)}%`;active=true;break;}
    }
    box.classList.toggle('charging',active);box.classList.toggle('full',fraction>=.97);
    bar.style.transform=`scaleX(${fraction})`;
    if(label.textContent!==text)label.textContent=text;
  }
  function frame(now){
    const dt=last?Math.min(.1,Math.max(0,(now-last)/1000)):0;last=now;diagnostics.frames++;
    if(screen==='play'){accumulator+=dt;while(accumulator>=F.C.step){accumulator-=F.C.step;game.step(F.C.step,controls.sample());diagnostics.steps++;if(screen!=='play')break;}}
    else accumulator=0;
    renderer.draw(game,screen==='pause'||screen==='help'?0:dt,['menu','teams'].includes(screen));
    if(screen==='play'){updateHUD();updatePower();$('banner').textContent=game.message;$('banner').classList.toggle('visible',game.messageTime>0);}
    requestAnimationFrame(frame);
  }
  $('pause').onclick=togglePause;$('help').onclick=help;$('brand').onclick=e=>{e.preventDefault();if(screen==='play')pause();};
  $('sound').onclick=()=>{sound.toggle();$('sound').textContent=sound.enabled?'SOUND ON':'SOUND OFF';$('sound').setAttribute('aria-pressed',String(sound.enabled));$('sound').setAttribute('aria-label',sound.enabled?'Disable sound':'Enable sound');if(screen==='play')canvas.focus();};
  window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  globalThis.Floodlight={get game(){return game;},get screen(){return screen;},config,controls,renderer,sound,diagnostics,start,pause,resume,menu,teams};
  menu();requestAnimationFrame(frame);
})(globalThis.Football);
