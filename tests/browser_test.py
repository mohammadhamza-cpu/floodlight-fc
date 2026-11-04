"""Real Chrome tests, Python standard library only. Reuses existing workspace
DevTools transport without changing the original badminton/Skyshot projects.
Run: python3 football/tests/browser_test.py
"""
import argparse
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT.parent / 'badminton/tests'))
from devtools import DevTools
ART = ROOT / 'tests/artifacts'
G = 'Floodlight.game'


def main():
    global ART
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', help='Verify a hosted HTTPS copy; no authentication is sent to it')
    args = parser.parse_args()
    base_url = args.base_url.rstrip('/') + '/' if args.base_url else None
    if base_url:
        if urllib.parse.urlparse(base_url).scheme != 'https':
            raise SystemExit('Hosted verification requires HTTPS')
        ART = ROOT / 'deployment/github-pages/artifacts'
    ART.mkdir(parents=True, exist_ok=True)
    results = []
    def check(name, passed):
        results.append(dict(name=name, passed=bool(passed)))
        print(('PASS ' if passed else 'FAIL ') + name, flush=True)
        if not passed:
            raise AssertionError(name)
    with tempfile.TemporaryDirectory(prefix='floodlight-test-') as profile:
        with open(ART/'chrome.log', 'w') as log:
            proc = subprocess.Popen(['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '--headless=new', '--no-first-run', '--no-default-browser-check', '--mute-audio', '--disable-background-networking', '--disable-sync', '--disable-component-update', '--disable-features=MediaRouter', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--remote-debugging-port=0', f'--user-data-dir={profile}', 'about:blank'], stdout=log, stderr=log)
            c = None
            try:
                portfile = Path(profile)/'DevToolsActivePort'
                deadline = time.monotonic()+25
                while not portfile.exists():
                    if proc.poll() is not None or time.monotonic()>deadline: raise RuntimeError('Chrome failed to start')
                    time.sleep(.1)
                port = int(portfile.read_text().splitlines()[0])
                with urllib.request.urlopen(f'http://127.0.0.1:{port}/json/list') as r: pages=json.load(r)
                c=DevTools(next(p['webSocketDebuggerUrl'] for p in pages if p['type']=='page'))
                for domain in ['Page','Runtime','Log','Network']: c.call(domain+'.enable')
                c.call('Emulation.setFocusEmulationEnabled', enabled=True)
                c.call('Emulation.setDeviceMetricsOverride',width=1440,height=960,deviceScaleFactor=1,mobile=False)
                c.call('Page.addScriptToEvaluateOnNewDocument',source='window.rafAudit={pending:new Set(),max:0};const nativeRAF=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>{let id=nativeRAF(t=>{rafAudit.pending.delete(id);fn(t)});rafAudit.pending.add(id);rafAudit.max=Math.max(rafAudit.max,rafAudit.pending.size);return id;};')
                native_click=c.click
                def visible_click(selector):
                    c.js(f'document.querySelector({json.dumps(selector)}).scrollIntoView({{block:"nearest"}})');time.sleep(.025);native_click(selector)
                c.click=visible_click
                native_key=c.key
                def rendered_key(code,hold=0,repeat=False):
                    native_key(code,hold=hold,repeat=repeat)
                    frame=c.js('Floodlight.diagnostics.frames')
                    c.wait(f'Floodlight.diagnostics.frames>={frame+2}')
                c.key=rendered_key
                def nav(path,ready):
                    url = urllib.parse.urljoin(base_url, path.relative_to(ROOT).as_posix()) if base_url else path.as_uri()
                    c.call('Page.navigate',url=url);time.sleep(.25);c.wait(ready)
                nav(ROOT/'tests/index.html','Boolean(window.FootballTestResults)')
                engine=c.js('FootballTestResults');(ART/'engine-results.json').write_text(json.dumps(engine,indent=2))
                print(json.dumps([r for r in engine if not r['passed']],indent=2),flush=True)
                check(f'All {len(engine)} deterministic engine tests',all(r['passed'] for r in engine))
                simulations=[]
                for mode in ['ai','local']:
                    for level in ['easy','medium','hard']:
                        sim=c.js("""(()=>{const F=Football,mode=MODE,level=LEVEL;const g=new F.Game({mode,difficulty:level,duration:180,random:FootballTestSeed(73)});let steps=0,finite=true;const events={};g.onEvent=e=>events[e.type]=(events[e.type]||0)+1;
                          for(;steps<120*400&&g.phase!=='over';steps++){
                            const inputs=[F.aiInput(g,g.player(g.selected[0]),F.C.step),mode==='local'?F.aiInput(g,g.player(g.selected[1]),F.C.step):{}];
                            g.step(F.C.step,inputs);
                            if(!Number.isFinite(g.ball.x+g.ball.y+g.ball.z)||g.players.some(p=>!Number.isFinite(p.x+p.y))){finite=false;break;}
                          }
                          return {mode,level,phase:g.phase,seconds:steps/120,scores:g.scores,stats:g.stats,events,finite};})()""".replace('MODE',json.dumps(mode)).replace('LEVEL',json.dumps(level)))
                        simulations.append(sim);print(json.dumps(sim),flush=True)
                        check(f'{mode}/{level} complete finite match',sim['phase']=='over' and sim['finite'])
                        check(f'{mode}/{level} both teams pass and shoot',all(n>0 for n in sim['stats']['passes']) and all(n>0 for n in sim['stats']['shots']))
                (ART/'simulation-results.json').write_text(json.dumps(simulations,indent=2))
                nav(ROOT/'index.html','Boolean(window.Floodlight)')
                check('Menu loads with 6 teams and three difficulty settings',c.js("Floodlight.screen==='menu' && document.querySelectorAll('#home-team option').length===6 && document.querySelectorAll('[data-level]').length===3"))
                c.screenshot(ART/'desktop-menu.png')
                c.click('#start');c.wait(f"{G}.phase==='play'")
                check('Kick off starts a playable match',c.js(f"Floodlight.screen==='play'&&{G}.players.length===14"))
                c.screenshot(ART/'desktop-play.png')
                check('All seeded matches produce goals and real keeper saves',all(sum(s['scores'])>0 and sum(s['stats']['saves'])>0 for s in simulations))
                check('Seeded solo difficulty increases opposition goals',simulations[0]['scores'][1]<simulations[1]['scores'][1] or simulations[0]['scores'][1]<simulations[2]['scores'][1])
                check('Scoreboard timer and focus are initialized',c.js("document.activeElement.id==='pitch'&&document.querySelector('#score-home').textContent===String(Floodlight.game.scores[0])&&document.querySelector('#clock').textContent===new Date(Math.ceil(Floodlight.game.remaining)*1000).toISOString().slice(14,19)"))
                def down(code): c.call('Input.dispatchKeyEvent',type='keyDown',code=code,key=code,windowsVirtualKeyCode={'Space':32,'Enter':13,'ArrowUp':38,'ArrowDown':40,'ArrowLeft':37,'ArrowRight':39,'ShiftLeft':16,'ShiftRight':16}.get(code,ord(code[-1])))
                def up(code): c.call('Input.dispatchKeyEvent',type='keyUp',code=code,key=code)
                c.js("""window.neutral=()=>{const g=Floodlight.game,F=Football;g.phase='play';g.paused=false;g.remaining=180;g.messageTime=0;g.players.forEach((p,i)=>{Object.assign(p,F.makePlayer(p.team,p.number-1));p.x=(i%7)*7-24;p.y=p.team?29:-29;p.stun=10;});Object.assign(g.players[5],{x:-10,y:0,stun:0});Object.assign(g.players[12],{x:10,y:16,stun:0});g.selected=[5,12];g.switchLock=[100,100];g.ball=F.makeBall();Object.assign(g.ball,{x:0,y:26,z:3});Floodlight.controls.clear();};
                  window.possess=(team=0)=>{neutral();const g=Floodlight.game,p=g.players[team*7+5];p.x=team?15:-15;p.y=0;g.giveBall(p);};""")
                c.js('neutral()');c.key('KeyD',hold=.3);check('WASD movement drives selected player',c.js(f'{G}.players[5].x>-8'))
                time.sleep(.4);x=c.js(f'{G}.players[5].x');time.sleep(.15);check('Release decelerates without stuck movement',abs(c.js(f'{G}.players[5].x')-x)<.03)
                c.js('neutral()');c.key('ArrowLeft',hold=.3);check('Solo arrow keys also move player one',c.js(f'{G}.players[5].x<-12'))
                c.js('neutral()');down('KeyD');down('ShiftLeft');time.sleep(.35);check('Held sprint increases speed and uses stamina',c.js(f'{G}.players[5].sprinting&&{G}.players[5].vx>12&&{G}.players[5].stamina<.96'));up('KeyD');up('ShiftLeft')
                c.js('possess()');down('KeyK');down('KeyD');time.sleep(.15);check('Dribble shields possession and animates feint',c.js(f'{G}.players[5].protect&&{G}.players[5].feint>0&&{G}.ball.owner===5'));up('KeyK');up('KeyD')
                c.js('possess()');shots=c.js(f'{G}.stats.shots[0]');c.key('Space');check('Space kicks a shot through actual physics',c.js(f'{G}.stats.shots[0]==={shots+1}&&{G}.ball.owner===null&&{G}.ball.vx>30&&{G}.players[5].kick>0'))
                c.key('Space',repeat=True);check('Keyboard autorepeat does not fire again',c.js(f'{G}.stats.shots[0]==={shots+1}'))
                c.js('possess()');passes=c.js(f'{G}.stats.passes[0]');c.key('KeyJ');check('J executes a pass',c.js(f'{G}.stats.passes[0]==={passes+1}&&{G}.ball.kind==="pass"'))
                c.js('neutral()');tackles=c.js(f'{G}.stats.tackles[0]');c.key('Space');check('Shoot without possession triggers slide tackle',c.js(f'{G}.stats.tackles[0]==={tackles+1}&&{G}.players[5].slide>0'))
                c.js('neutral()');old=c.js(f'{G}.selected[0]');c.key('KeyQ');check('Q manually switches relevant defender',c.js(f'{G}.selected[0]')!=old)
                c.js('possess()');c.key('KeyP');snapshot=c.js(f'JSON.stringify({G})');time.sleep(.25);c.key('Space');check('Pause freezes clock and physics and ignores actions',c.js("Floodlight.screen==='pause'") and snapshot==c.js(f'JSON.stringify({G})'))
                c.key('KeyP',repeat=True);check('Pause ignores autorepeat',c.js("Floodlight.screen==='pause'"))
                c.key('Escape');check('Escape resumes with cleared input',c.js("Floodlight.screen==='play'&&!Floodlight.game.paused&&Floodlight.controls.keys.size===0"))
                c.click('#pause');c.click('#resume');check('Toolbar pause/resume buttons work',c.js("Floodlight.screen==='play'&&document.activeElement.id==='pitch'"))
                c.js("document.getElementById('pause').focus()");c.key('Space');check('Focused toolbar button retains native keyboard activation',c.js("Floodlight.screen==='pause'"));c.click('#resume')
                c.js("window.dispatchEvent(new Event('blur'))");check('Focus loss pauses match',c.js("Floodlight.screen==='pause'&&Floodlight.controls.keys.size===0"));c.click('#resume')
                c.js("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden");check('Hidden tab pauses match',c.js("Floodlight.screen==='pause'"));c.click('#resume')
                c.click('#help');check('Help pauses and explains rules',c.js("Floodlight.screen==='help'&&Floodlight.game.paused&&document.querySelector('.panel').textContent.includes('Penalties')"));c.click('#close-help');check('Closing help resumes previous play',c.js("Floodlight.screen==='play'&&!Floodlight.game.paused"))
                c.click('#sound');c.wait('Floodlight.sound.context&&Floodlight.sound.context.state==="running"');c.js('possess()');c.key('Space');check('Sound toggle unlocks procedural shot cue',c.js('Floodlight.sound.enabled&&Floodlight.sound.played.shoot>0'))
                c.click('#pause');check('Pause stops active audio voices',c.js('Floodlight.sound.voices.size===0'));c.click('#resume');c.click('#sound');check('Mute stops sound and updates ARIA state',c.js('!Floodlight.sound.enabled&&document.querySelector("#sound").getAttribute("aria-pressed")==="false"'))
                # Exercise goal and save with real engine integration from controlled initial conditions.
                c.js(f'neutral();{G}.players.forEach(p=>p.stun=10);{G}.scores=[0,0];Object.assign({G}.ball,{{x:51,y:0,z:.5,vx:40,lastTeam:0}})');c.wait(f'{G}.scores[0]===1')
                check('Goal crossing updates score and celebrates',c.js(f'{G}.phase==="goal"&&{G}.players[5].celebrate>0&&document.querySelector("#score-home").textContent==="1"'))
                c.screenshot(ART/'goal-celebration.png');c.wait(f'{G}.phase==="kickoff"');check('Automatic reset gives conceding team kickoff',c.js(f'{G}.player({G}.ball.owner).team===1'))
                # Snapshot counters in the same JS task as the fixture: a fast
                # save must not occur before a separate baseline read arrives.
                saves,passes=c.js(f'(()=>{{neutral();{G}.players.forEach(p=>p.stun=10);Object.assign({G}.players[7],{{x:49,y:0,stun:0}});Object.assign({G}.ball,{{x:46.5,y:0,z:1,vx:45,lastTeam:0,kind:"shoot"}});return [{G}.stats.saves[1],{G}.stats.passes[1]]}})()');c.wait(f'{G}.stats.saves[1]>{saves}');check('Keeper makes save during live physics',c.js(f'{G}.ball.owner===7&&{G}.players[7].dive>0'))
                c.wait(f'{G}.stats.passes[1]>{passes}');check('Keeper distributes after catching',True)
                c.click('#pause');c.click('#main-menu');c.click('[data-level="hard"]');check('Difficulty selection persists',c.js('Floodlight.config.difficulty==="hard"&&document.querySelector("[data-level=hard]").getAttribute("aria-pressed")==="true"'))
                c.js("document.querySelector('#home-team').value='2';document.querySelector('#home-team').dispatchEvent(new Event('change',{bubbles:true}));");check('Home team selection updates kit identity',c.js('Floodlight.config.home===2&&Floodlight.renderer.teams[0].short==="VIO"'))
                c.js("document.querySelector('#away-team').value='2';document.querySelector('#away-team').dispatchEvent(new Event('change',{bubbles:true}));");check('Duplicate kits automatically select distinct opposing team',c.js('Floodlight.config.home!==Floodlight.config.away'))
                c.click('[data-duration="120"]');c.click('#mode-local');c.click('#start');check('Local mode and two-minute match start',c.js(f'{G}.mode==="local"&&{G}.duration===120&&document.body.classList.contains("local")'))
                check('Local guide displays separate keyboard controls',c.js('document.querySelector("#control-guide").textContent.includes("P2")&&getComputedStyle(document.querySelector("#touch-controls")).display==="none"'))
                c.js('neutral()');down('KeyA');down('ArrowRight');time.sleep(.3);up('KeyA');up('ArrowRight');check('Two players move simultaneously and independently',c.js(f'{G}.players[5].x<-12&&{G}.players[12].x>12'))
                c.js('neutral()');c.key('ArrowDown',hold=.25);check('P2 arrow movement does not move P1',c.js(f'Math.abs({G}.players[5].x+10)<.01&&{G}.players[12].y>17'))
                c.js('neutral()');down('KeyD');down('ArrowLeft');down('ShiftLeft');down('ShiftRight');time.sleep(.2);check('Both sprint keys function independently',c.js(f'{G}.players[5].sprinting&&{G}.players[12].sprinting'));[up(k) for k in ['KeyD','ArrowLeft','ShiftLeft','ShiftRight']]
                c.js('possess(1)');shots=c.js(f'{G}.stats.shots[1]');c.key('Enter');check('P2 Enter shoots toward opposing goal',c.js(f'{G}.stats.shots[1]==={shots+1}&&{G}.ball.vx<0'))
                c.js('possess(1)');passes=c.js(f'{G}.stats.passes[1]');c.key('KeyO');check('P2 O passes',c.js(f'{G}.stats.passes[1]==={passes+1}'))
                c.js('possess(1)');down('KeyI');time.sleep(.12);check('P2 I shields with independent dribble control',c.js(f'{G}.players[12].protect'));up('KeyI')
                c.js('neutral()');old=c.js(f'{G}.selected[1]');c.key('KeyU');check('P2 U switches selected defender',c.js(f'{G}.selected[1]')!=old)
                # Actual player tackle fixture, not a direct penalty() invocation.
                c.js(f'neutral();const q={G}.players[8],p={G}.players[1];Object.assign(q,{{x:-43,y:0,fx:-1,fy:0,stun:0}});{G}.giveBall(q);Object.assign(p,{{x:-41.5,y:0,stun:0}});{G}.selected[0]=1;{G}.switchLock=[100,100]');c.key('Space');check('Reckless in-box keyboard tackle triggers penalty',c.js(f'{G}.phase==="penalty"&&{G}.penaltyTeam===1&&{G}.stats.fouls[0]>0'))
                c.screenshot(ART/'penalty.png');c.key('ArrowDown',hold=.3);check('Penalty attacker aims with own movement keys',c.js(f'{G}.penaltyAim>1.5'))
                c.key('KeyS',hold=.2);check('Local penalty defender moves keeper',c.js(f'{G}.players[0].y>1'))
                shots=c.js(f'{G}.stats.shots[1]');c.key('Enter');c.wait(f'{G}.stats.shots[1]==={shots+1}');check('Penalty Shoot resumes open play',c.js(f'{G}.phase==="play"&&{G}.stats.shots[1]==={shots+1}&&{G}.ball.owner===null'))
                c.js(f'neutral();{G}.remaining=.12;{G}.scores=[2,1]');c.wait('Floodlight.screen==="over"');check('Timer expiry displays correct winner and final score',c.js('document.querySelector(".panel h2").textContent.includes("wins")&&document.querySelector("#score-home").textContent==="2"&&document.querySelector("#clock").textContent==="00:00"'))
                c.screenshot(ART/'match-over.png');c.click('#rematch');check('Rematch clears score and stats',c.js(f'{G}.scores.join()==="0,0"&&{G}.stats.shots.join()==="0,0"&&{G}.phase==="kickoff"'))
                c.click('#pause');c.click('#restart');check('Pause restart resets configured clock',c.js(f'{G}.remaining===120&&{G}.phase==="kickoff"'))
                c.js('for(let i=0;i<20;i++)Floodlight.start()');check('Twenty restarts retain one animation loop',c.js('rafAudit.pending.size===1&&rafAudit.max===1'))
                c.js('possess()');c.key('Space');check('Restarts do not duplicate listeners or shots',c.js(f'{G}.stats.shots[0]===1'))
                # Emulated mobile browser with genuine multi-touch input, not direct JS input injection.
                c.click('#pause');c.click('#main-menu');c.click('#mode-ai')
                c.call('Emulation.setDeviceMetricsOverride',width=390,height=844,deviceScaleFactor=2,mobile=True)
                c.call('Emulation.setTouchEmulationEnabled',enabled=True,maxTouchPoints=5);time.sleep(.2)
                c.screenshot(ART/'mobile-menu.png');check('Portrait menu stays within viewport',c.js('document.documentElement.scrollWidth<=innerWidth&&document.querySelector(".menu").getBoundingClientRect().bottom<=innerHeight'))
                c.click('#start');c.js('neutral()');time.sleep(.15)
                def touch(kind,points):c.call('Input.dispatchTouchEvent',type=kind,touchPoints=[dict(**p,id=i+1,radiusX=4,radiusY=4,force=1) for i,p in enumerate(points)])
                joy=c.point('#joystick');right={'x':joy['x']+28,'y':joy['y']};sprint=c.point('[data-action="sprint"]')
                touch('touchStart',[joy]);touch('touchMove',[right]);c.wait(f'{G}.players[5].x>-8',timeout=2);check('Real touch joystick moves selected player',c.js(f'{G}.players[5].x>-8&&Floodlight.controls.axis.x>.7'))
                touch('touchEnd',[]);check('Joystick release returns to neutral',c.js('Floodlight.controls.axis.x===0&&Floodlight.controls.axis.y===0'))
                c.js('neutral()');touch('touchStart',[joy,sprint]);touch('touchMove',[right,sprint]);c.wait(f'{G}.players[5].stamina<.96');check('Joystick plus sprint multi-touch works',c.js(f'{G}.players[5].sprinting&&{G}.players[5].stamina<.96'));touch('touchEnd',[])
                c.js('possess()');shots=c.js(f'{G}.stats.shots[0]');touch('touchStart',[c.point('[data-action="shoot"]')]);c.wait(f'{G}.stats.shots[0]==={shots+1}');touch('touchEnd',[]);check('Mobile Shoot kicks ball',c.js(f'{G}.stats.shots[0]==={shots+1}'))
                c.js('possess()');passes=c.js(f'{G}.stats.passes[0]');touch('touchStart',[c.point('[data-action="pass"]')]);c.wait(f'{G}.stats.passes[0]==={passes+1}');touch('touchEnd',[]);check('Mobile Pass releases a pass',c.js(f'{G}.stats.passes[0]==={passes+1}'))
                c.js('possess()');dribble=c.point('[data-action="dribble"]');touch('touchStart',[joy,dribble]);touch('touchMove',[right,dribble]);c.wait(f'{G}.players[5].protect&&{G}.players[5].x>-14.5');check('Mobile movement and Dribble work together',c.js(f'{G}.players[5].protect&&{G}.players[5].x>-15'));touch('touchEnd',[])
                c.js('neutral()');old=c.js(f'{G}.selected[0]');touch('touchStart',[c.point('[data-action="switch"]')]);c.wait(f'{G}.selected[0]!=={old}');touch('touchEnd',[]);check('Mobile Switch selects another defender',c.js(f'{G}.selected[0]')!=old)
                c.js('neutral()');touch('touchStart',[joy,sprint]);touch('touchMove',[right,sprint]);time.sleep(.08);touch('touchCancel',[]);check('Touch cancellation clears joystick and held buttons',c.js('Floodlight.controls.pointers.size===0&&Floodlight.controls.axis.x===0'))
                c.js('Floodlight.start()');time.sleep(.15);c.screenshot(ART/'mobile-play.png')
                check('Portrait controls have usable minimum target sizes',c.js('[...document.querySelectorAll("[data-action]:not(.switch)")].every(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44})'))
                check('Full pitch fits portrait canvas',c.js('(()=>{const r=Floodlight.renderer;return [[-56,-34],[56,-34],[56,34],[-56,34]].every(([x,y])=>{const p=r.project(x,y);return p.x>=0&&p.x<=r.w&&p.y>95&&p.y<r.h-180})})()'))
                c.click('#help');check('Mobile help has bounded scrolling panel',c.js('(()=>{const p=document.querySelector(".panel");return getComputedStyle(p).overflowY==="auto"&&p.clientHeight<=document.querySelector("#overlay").clientHeight})()'));c.click('#close-help')
                c.call('Emulation.setDeviceMetricsOverride',width=844,height=390,deviceScaleFactor=2,mobile=True);time.sleep(.2);c.screenshot(ART/'mobile-landscape.png')
                check('Landscape pitch is enlarged and fully visible',c.js('Floodlight.renderer.scale>4&&document.documentElement.scrollWidth<=innerWidth'))
                check('Touch controls do not cover pause button',c.js('(()=>{const a=document.querySelector("#pause").getBoundingClientRect();return [...document.querySelectorAll("[data-action],#joystick")].every(e=>{const b=e.getBoundingClientRect();return a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom})})()'))
                c.click('#pause');c.click('#main-menu');c.screenshot(ART/'landscape-menu.png');check('Landscape setup can scroll to Start',c.js('(()=>{const e=document.querySelector(".menu");return getComputedStyle(e).overflowY==="auto"&&e.clientHeight<=document.querySelector("#overlay").clientHeight})()'))
                c.js('const canvas=document.querySelector("#pitch");canvas.style.width="0px";Floodlight.renderer.resize();Floodlight.renderer.draw(Floodlight.game,.016);canvas.style.width="";Floodlight.renderer.resize()')
                frame=c.js('Floodlight.diagnostics.frames');c.wait(f'Floodlight.diagnostics.frames>{frame+2}');check('Transient zero-width canvas does not crash animation loop',True)
                c.call('Page.addScriptToEvaluateOnNewDocument',source="Object.defineProperty(window,'localStorage',{get(){throw Error('storage blocked')}})")
                nav(ROOT/'index.html','Boolean(window.Floodlight)');c.click('#start');check('Game boots and plays with browser storage blocked',c.js('Floodlight.screen==="play"'))
                remote=[e['params']['request']['url'] for e in c.events if e['method']=='Network.requestWillBeSent' and e['params']['request']['url'].startswith(('http://','https://'))]
                if base_url:
                    check('Hosted requests stay within the game static site',bool(remote) and all(url.startswith(base_url) for url in remote))
                else:
                    check('Zero HTTP/HTTPS requests during offline tests',not remote)
                errors=[e for e in c.events if e['method']=='Runtime.exceptionThrown' or (e['method']=='Log.entryAdded' and e['params']['entry']['level']=='error') or (e['method']=='Runtime.consoleAPICalled' and e['params']['type']=='error')]
                (ART/'console-errors.json').write_text(json.dumps(errors,indent=2));check('No JavaScript or console errors',not errors)
            except Exception:
                if c:
                    try:
                        state=c.js('({screen:Floodlight.screen,game:Floodlight.game,keys:[...Floodlight.controls.keys],focus:document.activeElement.id})')
                        (ART/'failure-state.json').write_text(json.dumps(state,indent=2));print('FAILURE',json.dumps(state),flush=True)
                        c.screenshot(ART/'failure.png')
                    except Exception: pass
                raise
            finally:
                (ART/'browser-results.json').write_text(json.dumps(results,indent=2))
                proc.terminate()
                try: proc.wait(timeout=8)
                except subprocess.TimeoutExpired: proc.kill();proc.wait()

if __name__=='__main__':main()
