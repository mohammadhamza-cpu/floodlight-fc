/* Deterministic unit and integration fixtures. Browser runner also exercises
 * real keyboard/touch events and complete unaltered seeded matches. */
(function(F){'use strict';const results=[];
  function test(name,fn){try{fn();results.push({name,passed:true});}catch(e){results.push({name,passed:false,error:e.message});}}
  function ok(x,msg='assertion failed'){if(!x)throw Error(msg);}
  function near(a,b,e=.001){ok(Math.abs(a-b)<=e,`${a} != ${b}`);}
  function seed(n=37){return()=>{n=(1664525*n+1013904223)>>>0;return n/4294967296;};}
  function game(opts={}){const g=new F.Game({random:seed(),...opts});g.phase='play';return g;}
  function run(g,s,inputs=[]){for(let i=0;i<Math.round(s/F.C.step);i++)g.step(F.C.step,inputs);}
  function empty(g){g.players.forEach((p,i)=>{p.x=(i%7)*7-24;p.y=p.team?30:-30;p.stun=3;});g.ball=F.makeBall();g.ball.owner=null;}
  test('14 players, seven per team, exactly two keepers',()=>{const g=game();ok(g.players.length===14&&g.players.filter(p=>p.keeper).length===2);for(let i=0;i<2;i++)ok(g.players.filter(p=>p.team===i).length===7);});
  test('Kickoff initializes possession and selected striker',()=>{const g=new F.Game();ok(g.phase==='kickoff');ok(g.player(g.ball.owner).team===0&&g.selected[0]===g.ball.owner);});
  test('Kickoff countdown becomes active play',()=>{const g=new F.Game();run(g,1.9);ok(g.phase==='play'&&g.remaining<180);});
  test('Dead ball kickoff does not consume match clock',()=>{const g=new F.Game();run(g,1);near(g.remaining,180);});
  test('Running accelerates in requested direction',()=>{const p=F.makePlayer(0,1),x=p.x;for(let i=0;i<120;i++)F.movePlayer(p,{x:1,y:0},1/120);ok(p.x>x+8&&p.vx>9);});
  test('Movement brakes after release',()=>{const p=F.makePlayer(0,1);for(let i=0;i<60;i++)F.movePlayer(p,{x:1,y:0},1/120);for(let i=0;i<100;i++)F.movePlayer(p,{},1/120);ok(Math.abs(p.vx)<.001);});
  test('Diagonal movement is normalized',()=>{const a=F.makePlayer(0,1),b=F.makePlayer(0,1);for(let i=0;i<60;i++){F.movePlayer(a,{x:1,y:0},1/120);F.movePlayer(b,{x:1,y:1},1/120);}near(Math.hypot(a.vx,a.vy),Math.hypot(b.vx,b.vy));});
  test('Sprinting is faster and drains stamina',()=>{const a=F.makePlayer(0,1),b=F.makePlayer(0,1);for(let i=0;i<120;i++){F.movePlayer(a,{x:1,y:0},1/120);F.movePlayer(b,{x:1,y:0,sprint:true},1/120);}ok(b.x>a.x+3&&b.stamina<a.stamina);});
  test('Stamina recovers at rest',()=>{const p=F.makePlayer(0,1);p.stamina=.2;F.movePlayer(p,{},.5);ok(p.stamina>.2);});
  test('Shielding slows run and sets protection',()=>{const p=F.makePlayer(0,1);for(let i=0;i<120;i++)F.movePlayer(p,{x:1,dribble:true},1/120);ok(p.protect&&p.vx<8);});
  test('Players stay inside pitch',()=>{const p=F.makePlayer(0,1);p.x=50.9;p.y=32.9;for(let i=0;i<120;i++)F.movePlayer(p,{x:1,y:1,sprint:true},1/120);ok(p.x<=51&&p.y<=33);});
  test('Player overlap separates symmetrically',()=>{const a=F.makePlayer(0,1),b=F.makePlayer(1,1);a.x=b.x=0;a.y=b.y=0;F.separatePlayers([a,b]);near(F.dist(a,b),2.1);});
  test('Gravity produces flight and floor bounce',()=>{const b=F.makeBall();b.z=2;b.vz=-8;let bounced=false;for(let i=0;i<60;i++){F.integrateBall(b,1/120);if(b.vz>0)bounced=true;ok(b.z>=F.C.ballR);}ok(bounced);});
  test('Rolling friction reduces ball speed',()=>{const b=F.makeBall();b.vx=20;for(let i=0;i<120;i++)F.integrateBall(b,1/120);ok(b.vx>0&&b.vx<8);});
  test('Ball settles with no perpetual jitter',()=>{const b=F.makeBall();b.vx=1;b.vz=1;for(let i=0;i<1200;i++)F.integrateBall(b,1/120);near(b.vx,0);near(b.vz,0);near(b.z,F.C.ballR);});
  test('Swept distance catches high velocity crossings',()=>near(F.segmentDistance({x:0,y:0},{x:10,y:0},{x:5,y:1}),1));
  test('Pass releases ownership and increments stat',()=>{const g=game(),p=g.player(g.ball.owner);ok(g.kick(p,'pass',{x:1}));ok(g.ball.owner===null&&g.ball.kind==='pass'&&g.stats.passes[0]===1&&Math.hypot(g.ball.vx,g.ball.vy)>20);});
  test('Directional pass chooses receiver on aimed side',()=>{const g=game(),p=g.players[5];p.x=0;p.y=0;g.players.filter(q=>q.team===0&&q!==p).forEach(q=>{q.x=-20;q.y=0;});g.players[3].x=2;g.players[3].y=-15;g.players[4].x=2;g.players[4].y=15;ok(F.passTarget(g,p,{x:0,y:1}).id===4);ok(F.passTarget(g,p,{x:0,y:-1}).id===3);});
  test('Shot targets opposing goal with vertical lift',()=>{const g=game(),p=g.player(g.ball.owner);g.kick(p,'shoot',{});ok(g.ball.vx>40&&g.ball.vz>0&&g.stats.shots[0]===1&&p.kick>0);});
  test('Away shot travels toward left goal',()=>{const g=game(),p=g.players[12];g.giveBall(p);g.kick(p,'shoot',{});ok(g.ball.vx<0&&g.stats.shots[1]===1);});
  test('Cooldown prevents duplicate kicks',()=>{const g=game(),p=g.player(g.ball.owner);g.kick(p,'shoot');g.giveBall(p);ok(!g.kick(p,'shoot')&&g.stats.shots[0]===1);});
  test('Cannot shoot while not in possession',()=>{const g=game();ok(!g.kick(g.players[1],'shoot'));});
  test('Ground pass can be received and auto-selects receiver',()=>{const g=game();empty(g);const p=g.players[3];p.x=0;p.y=0;p.stun=0;Object.assign(g.ball,{x:.2,y:0,vx:30,kind:'pass'});g.ballContacts({x:-.2,y:0,z:.38});ok(g.ball.owner===p.id&&g.selected[0]===p.id);});
  test('High ball cannot be collected by outfield feet',()=>{const g=game();empty(g);const p=g.players[3];p.x=0;p.y=0;p.stun=0;Object.assign(g.ball,{x:0,y:0,z:3,vx:10});g.ballContacts({x:-.2,y:0,z:3});ok(g.ball.owner===null);});
  test('Hard shot deflects off outfield player',()=>{const g=game();empty(g);const p=g.players[3];p.x=0;p.y=0;p.stun=0;Object.assign(g.ball,{x:.5,y:0,vx:48,kind:'shoot'});g.ballContacts({x:-.1,y:0,z:.38});ok(g.ball.owner===null&&g.ball.vz===3&&g.ball.lastPlayer===p.id);});
  test('Clean ball-side tackle wins possession',()=>{const g=game(),p=g.players[1],q=g.players[8];q.x=0;q.y=0;q.fx=1;q.fy=0;g.giveBall(q);p.x=2;p.y=0;g.tackle(p,{});ok(g.ball.owner===p.id&&g.stats.tackles[0]===1&&q.stun>0);});
  test('Shield blocks distant standing tackle',()=>{const g=game(),p=g.players[1],q=g.players[8];q.x=0;q.y=0;q.fx=1;q.fy=0;q.protect=true;g.giveBall(q);p.x=-1;p.y=0;g.tackle(p,{standing:true});ok(g.ball.owner===q.id);});
  test('Tackle from behind causes free kick outside area',()=>{const g=game(),p=g.players[1],q=g.players[8];q.x=0;q.y=0;q.fx=1;q.fy=0;g.giveBall(q);p.x=-1.5;p.y=0;g.tackle(p,{});ok(g.phase==='restart'&&g.restartKind==='free kick'&&g.stats.fouls[0]===1);});
  test('Reckless in-box challenge awards penalty',()=>{const g=game(),p=g.players[1],q=g.players[8];q.x=-43;q.y=0;q.fx=-1;q.fy=0;g.giveBall(q);p.x=-41.5;p.y=0;g.tackle(p,{});ok(g.phase==='penalty'&&g.penaltyTeam===1&&g.stats.penalties[1]===1);});
  test('Penalty freezes match clock and allows aiming',()=>{const g=game();g.penalty(0);const t=g.remaining;run(g,.5,[{y:1}]);ok(g.penaltyAim>3&&g.remaining===t);});
  test('Human penalty launches on shoot',()=>{const g=game();g.penalty(0);g.step(F.C.step,[{shoot:true}]);ok(g.phase==='play'&&g.ball.vx>0&&g.ball.owner===null);});
  test('AI penalty takes automatically',()=>{const g=game();g.penalty(1);run(g,2.6);ok(g.phase==='play'&&g.stats.shots[1]===1);});
  test('Penalty expires into automatic shot instead of deadlock',()=>{const g=game();g.penalty(0);run(g,6.1);ok(g.phase!=='penalty'&&g.stats.shots[0]===1);});
  test('Local defender can move goalkeeper on penalty',()=>{const g=game({mode:'local'});g.penalty(0);run(g,.25,[{},{y:1}]);ok(g.players[7].y>1);});
  test('Goal at right end awards home once',()=>{const g=game();empty(g);Object.assign(g.ball,{x:53,y:0,z:.5,vx:40});F.checkBoundary(g,{x:51,y:0,z:.5});ok(g.phase==='goal'&&g.scores[0]===1);g.goal(0);ok(g.scores[0]===1);});
  test('Goal at left end awards away regardless of last touch',()=>{const g=game();empty(g);Object.assign(g.ball,{x:-53,y:0,z:.5,lastTeam:0});F.checkBoundary(g,{x:-51,y:0,z:.5});ok(g.scores[1]===1);});
  test('Ball must cross fully before goal',()=>{const g=game();Object.assign(g.ball,{owner:null,x:52.2,y:0,z:.5});F.checkBoundary(g,{x:51.8,y:0,z:.5});ok(g.scores[0]===0&&g.phase==='play');});
  test('Over-crossbar ball is goal kick, not goal',()=>{const g=game();Object.assign(g.ball,{owner:null,x:53,y:0,z:6,lastTeam:0});F.checkBoundary(g,{x:51,y:0,z:6});ok(g.scores[0]===0&&g.restartKind==='goal kick'&&g.restartTeam===1);});
  test('Swept post collision rebounds',()=>{const g=game();Object.assign(g.ball,{owner:null,x:52.2,y:7.9,z:1,vx:45,vy:0});F.checkBoundary(g,{x:51,y:7.9,z:1});ok(g.scores[0]===0&&g.ball.vx<0);});
  test('Crossbar rebounds high shot',()=>{const g=game();Object.assign(g.ball,{owner:null,x:52.2,y:0,z:4,vx:45,vy:0});F.checkBoundary(g,{x:51,y:0,z:4});ok(g.scores[0]===0&&g.ball.vx<0);});
  test('Wide ball after defender touch gives corner',()=>{const g=game();Object.assign(g.ball,{owner:null,x:53,y:20,z:.4,lastTeam:1});F.checkBoundary(g,{x:51,y:20,z:.4});ok(g.restartKind==='corner'&&g.restartTeam===0);});
  test('Touchline exit awards throw to opponent',()=>{const g=game();Object.assign(g.ball,{owner:null,x:3,y:35,z:.4,lastTeam:0});F.checkBoundary(g,{x:3,y:33,z:.4});ok(g.restartKind==='throw in'&&g.restartTeam===1);});
  test('Celebration gives arms-up timers to scoring team',()=>{const g=game();g.goal(1);ok(g.players.filter(p=>p.team===1).every(p=>p.celebrate>0));});
  test('Goal reset gives losing side kickoff',()=>{const g=game();g.goal(0);run(g,2.8);ok(g.phase==='kickoff'&&g.player(g.ball.owner).team===1&&g.scores[0]===1);});
  test('Keeper catches nearby shot and records save',()=>{const g=game();empty(g);const k=g.players[7];k.x=49;k.y=0;k.stun=0;Object.assign(g.ball,{x:48.9,y:0,z:1,vx:45,lastTeam:0,kind:'shoot'});g.ballContacts({x:48.4,y:0,z:1});ok(g.ball.owner===7&&g.stats.saves[1]===1&&k.dive>0);});
  test('Keeper distributes ball autonomously',()=>{const g=game();g.giveBall(g.players[0]);run(g,.8);ok(g.stats.passes[0]>=1);});
  test('Keeper predicts crossing and starts dive animation',()=>{const g=game(),k=g.players[7];Object.assign(g.ball,{owner:null,x:35,y:0,vx:40,vy:17});F.aiInput(g,k,.01);ok(k.dive>0&&g.stats.dives[1]===1);});
  test('Closest relevant defender selected with hysteresis',()=>{const g=game();g.ball.owner=null;g.ball.x=40;g.ball.y=25;g.selected[0]=1;g.players[4].x=39;g.players[4].y=25;g.switchPlayer(0);ok(g.selected[0]===4);});
  test('Manual switching chooses another nearby defender',()=>{const g=game();g.ball.owner=null;g.switchPlayer(0);const old=g.selected[0];g.switchPlayer(0,true);ok(g.selected[0]!==old&&g.switchLock[0]>0);});
  test('Possession overrides manual switch',()=>{const g=game();const owner=g.ball.owner;g.switchPlayer(0,true);ok(g.selected[0]===owner);});
  test('AI teammate seeks space when own team possesses',()=>{const g=game(),p=g.players[3],i=F.aiInput(g,p,.01);ok(Math.hypot(i.x,i.y)>.1&&i.x>0);});
  test('AI nearest defender presses ball',()=>{const g=game(),p=g.players[12],i=F.aiInput(g,p,.01);ok(i.x<0);});
  test('AI close attacker elects to shoot',()=>{const g=game(),p=g.players[12];p.x=-34;p.y=3;g.giveBall(p);p.think=0;ok(F.aiInput(g,p,.01).shoot);});
  test('AI pressured carrier elects pass away from goal',()=>{const g=game(),p=g.players[12];p.x=4;p.y=3;g.players[1].x=2;g.players[1].y=3;g.giveBall(p);p.think=0;p.possession=2;ok(F.aiInput(g,p,.01).pass);});
  test('Difficulty adjusts pace, reaction, accuracy and keeper reach',()=>{const a=F.levels.easy,b=F.levels.hard;ok(b.pace>a.pace&&b.think<a.think&&b.accuracy<a.accuracy&&b.save>a.save);});
  test('Timer decrements in active play only',()=>{const g=game();const t=g.remaining;run(g,.5);near(g.remaining,t-.5,.001);});
  test('Pause freezes all authoritative state',()=>{const g=game();g.paused=true;const old=JSON.stringify(g);run(g,1,[{x:1,shoot:true}]);ok(JSON.stringify(g)===old);});
  test('Time expires into winner screen state',()=>{const g=game({duration:.2});g.scores=[3,2];run(g,.3);ok(g.phase==='over'&&g.winner===0&&g.remaining===0);});
  test('Level scores finish as a draw',()=>{const g=game({duration:.1});run(g,.2);ok(g.phase==='over'&&g.winner===null);});
  test('Match-over state cannot change or emit again',()=>{const events=[],g=game({duration:.1,onEvent:e=>events.push(e.type)});run(g,.2);const t=g.elapsed;run(g,2);near(g.elapsed,t);ok(events.filter(x=>x==='over').length===1);});
  test('New match clears scores and statistics',()=>{const g=game();g.goal(0);const n=new F.Game();ok(n.scores.join()==='0,0'&&n.stats.shots.join()==='0,0'&&n.remaining===180);});
  test('Selected local players take independent inputs',()=>{const g=game({mode:'local'});g.ball.owner=null;g.ball.x=0;g.ball.y=0;const a=g.player(g.selected[0]),b=g.player(g.selected[1]);g.switchLock=[10,10];const x=a.x,y=b.x;run(g,.3,[{x:-1},{x:1}]);ok(a.x<x-1&&b.x>y+1);});
  test('Identical fixed ticks are deterministic',()=>{const a=game({random:seed(88)}),b=game({random:seed(88)});run(a,4,[{x:1}]);run(b,4,[{x:1}]);ok(JSON.stringify(a)===JSON.stringify(b));});
  test('Player physics is comparable at 60 and 120 Hz',()=>{const a=F.makePlayer(0,1),b=F.makePlayer(0,1);for(let i=0;i<120;i++)F.movePlayer(a,{x:1},1/120);for(let i=0;i<60;i++)F.movePlayer(b,{x:1},1/60);near(a.x,b.x,.05);});
  test('Ball physics is comparable at 60 and 120 Hz',()=>{const a=F.makeBall(),b=F.makeBall();a.vx=b.vx=30;for(let i=0;i<120;i++)F.integrateBall(a,1/120);for(let i=0;i<60;i++)F.integrateBall(b,1/60);near(a.x,b.x,.1);});
  test('Dribbling the whole ball over goal line scores',()=>{const g=game();empty(g);const p=g.players[5];Object.assign(p,{x:50.9,y:0,fx:1,fy:0,stun:0});g.giveBall(p);run(g,.3,[{x:1}]);ok(g.scores[0]===1&&g.phase==='goal');});
  test('Carrying ball wide over goal line gives goal kick',()=>{const g=game();empty(g);const p=g.players[5];Object.assign(p,{x:50.9,y:22,fx:1,fy:0,stun:0});g.giveBall(p);run(g,.3,[{x:1}]);ok(g.scores[0]===0&&g.restartKind==='goal kick');});
  test('Carrying ball over touchline gives throw in',()=>{const g=game();empty(g);const p=g.players[5];Object.assign(p,{x:10,y:32.9,fx:0,fy:1,stun:0});g.giveBall(p);run(g,.3,[{y:1}]);ok(g.restartKind==='throw in'&&g.restartTeam===1);});
  test('Standing tackle cannot instantly ping-pong newly received ball',()=>{const g=game(),p=g.players[1],q=g.players[8];Object.assign(q,{x:0,y:0,fx:1,fy:0});g.giveBall(q);p.x=2;p.y=0;g.tackle(p,{standing:true});ok(g.ball.owner===q.id);});
  test('Rendered frame rate leaves fixed-step match result unchanged',()=>{const simulate=fps=>{const g=game({random:seed(89)});let accumulator=0;for(let frame=0;frame<fps*8;frame++){accumulator+=1/fps;while(accumulator>=F.C.step-1e-10){g.step(F.C.step,[{x:1}]);accumulator-=F.C.step;}}return g;};const a=simulate(30),b=simulate(144);near(a.remaining,b.remaining);near(a.ball.x,b.ball.x);near(a.ball.y,b.ball.y);ok(a.scores.join()===b.scores.join());});
  globalThis.FootballTestResults=results;globalThis.FootballTestSeed=seed;
  document.getElementById('results').textContent=results.map(r=>(r.passed?'PASS ':'FAIL ')+r.name+(r.error?' — '+r.error:'')).join('\n')+`\n\n${results.filter(r=>r.passed).length}/${results.length} passed`;
})(globalThis.Football);
