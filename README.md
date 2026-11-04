# Floodlight FC

**[Play now](https://mohammadhamza-cpu.github.io/floodlight-fc/)**

Original offline 7-a-side stick-football arcade game: an elevated full-pitch view,
14 animated players, six team kits, autonomous support AI, goalkeepers, ball
physics, passing, shooting, tackling, shielding, sprinting, penalties and goal
celebrations. Built with vanilla JavaScript and Canvas 2.5D perspective rendering.
No external libraries, downloaded assets, accounts or backend.

## Play

Use the live link above, or download this repository and open [index.html](index.html)
in a modern browser. Keep the files and folders together. Select **Player vs AI**
(Easy / Medium / Hard) or **Local 2 Player**, choose teams and a 2/3/5-minute match,
then press **KICK OFF**. Local multiplayer uses one keyboard, not an online server.
Mobile players use the joystick and buttons; landscape provides a larger pitch.

| Action | Player 1 | Player 2 |
| --- | --- | --- |
| Move | WASD | Arrow keys |
| Shoot / tackle | Space | Enter |
| Pass | J | O |
| Dribble / shield | K | I |
| Sprint | Left Shift | Right Shift |
| Switch player | Q | U |
| Pause / resume | P or Escape | P or Escape |

Solo mode also accepts arrow keys for movement. Pass direction follows movement;
shots assist toward goal, with Up/Down aiming across the goal mouth. Keepers handle
normal play automatically. During a penalty, the attacker aims and shoots while
the defending local player can position the keeper. Kickoff, ball-out and foul
restarts are automatic. Dead-ball time is stopped. Highest score wins; ties remain
draws. Arcade scope: no offside, cards, halftime or post-match shootout.

## Source

- [Physics](js/physics.js), [team AI](js/ai.js), [rules](js/rules.js),
  [match engine](js/engine.js)
- [Renderer](js/renderer.js), [input](js/controls.js), [sound](js/audio.js),
  [menus and game loop](js/game.js), [styles](styles.css)
- [Engine test page](tests/index.html), [engine tests](tests/engine.test.js),
  [Chrome regression runner](tests/browser_test.py)

Simulation uses fixed 120 Hz steps with capped catch-up. The renderer is original
Canvas 2.5D art, not a full WebGL engine. Touch cancellation, tab visibility and
focus changes clear input or pause play. Sound is optional and off by default.

## Testing

The local development release passed 70 deterministic engine tests and 84
browser-run checks, including six full seeded matches across both game modes and
all difficulties. The matches produced 74 goals, 170 shots, 452 passes and 27 saves.
The successful run recorded no page JavaScript/console errors and no network
requests. Real keyboard events and emulated multi-touch exercised movement,
actions, penalties, scoring, clock, pause and restart.

The public GitHub Pages game also passed the 70 engine tests, 84 browser-run
checks and six complete seeded matches, with no page JavaScript/console errors
or off-site resource requests in the successful hosted run.

These were automated tests in Google Chrome. Mobile checks used device emulation,
not physical phones; sound was inspected programmatically, not listened to. This
does not establish compatibility with every device/browser or keyboard rollover.

Open [the engine test page](tests/index.html) to run the deterministic suite.
The Python browser runner uses only the standard library and the bundled DevTools
transport. Run it from a downloaded copy with Python 3; its default Chrome launch
path is for macOS and can be adjusted for another OS. Its `--base-url` option runs
against the public site instead of local files, without GitHub credentials.

## Hosting

GitHub Pages publishes the `main` branch at the repository root. No build step or
package installation is required. Committing updated runtime files to `main`
triggers a new Pages deployment. No credentials or unrelated workspace assets
are part of this repository.
