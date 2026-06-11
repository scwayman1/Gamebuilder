// Game template registry — the "Template Skill".
//
// A template is a frozen HTML skeleton with two LLM-fillable regions:
// CONFIG (numeric tunables) and GAME (the createGame() implementation).
// Everything else — the error-reporting harness, the boot contract, the
// CSP — is ours and never touched by the model.

import { isFormulaSafe } from "./blueprint-formula";
import type { GameDesign } from "./schema";

export type GameTemplate = {
  id: string;
  name: string;
  engine: string;
  description: string;
  // Contract documentation injected into the Builder prompt verbatim.
  contract: string;
};

export const PHASER_ARCADE_TEMPLATE: GameTemplate = {
  id: "phaser3-arcade",
  name: "Phaser 3 Arcade",
  engine: "Phaser 3.87 (vendored, global `Phaser`)",
  description:
    "Single-scene 2D arcade game. Shapes and text only (no image assets). Keyboard + pointer input. Good for collectors, dodgers, target practice, sorting catchers.",
  contract: `TEMPLATE CONTRACT (phaser3-arcade) — your code runs inside a frozen HTML skeleton:
- Phaser 3 is already loaded as the global \`Phaser\`. Do NOT add script tags, imports, or requires.
- configCode must define exactly: \`const GAME_CONFIG = { ... }\` using the configSpec keys. Nothing else.
- gameCode must define \`function createGame()\` that returns \`new Phaser.Game({...})\`.
  - Use \`parent: "game"\`, \`type: Phaser.AUTO\`, width 1280, height 720, \`scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }\`.
  - Use arcade physics if needed: \`physics: { default: "arcade" }\`.
- GRAPHICS — USE THE ART LIBRARY FIRST. The harness exposes \`window.__art\` with composed Phaser scene primitives. PREFER these over raw rectangles whenever applicable. Available:
  - Backgrounds: \`__art.background(scene, "sky"|"space"|"sunset"|"dawn"|"underwater"|"jungle"|"lab"|"field", { stars: true, ground: true })\`
  - Decor: \`__art.sun(s,x,y,r)\`, \`__art.cloud(s,x,y,scale)\`, \`__art.mountains(s,baseY)\`, \`__art.tree(s,x,y,scale)\`, \`__art.field(s,baseY,"grass"|"lab-floor")\`
  - Composed objects: \`__art.soccerGoal(s,x,y,scale)\`, \`__art.soccerBall(s,x,y,r)\`, \`__art.character(s,x,y,{pose:"stand"|"kick"|"throw"|"run", jersey:0xRRGGBB, scale:1})\`, \`__art.lever(s,x,y,{tilt:0, load:true, effort:true})\`, \`__art.rocket(s,x,y,{flame:true})\`, \`__art.beaker(s,x,y,{level:0.5, color:0x0ea5e9})\`
  - UI: \`__art.titleBar(s)\`, \`__art.ui.button(s,x,y,w,h,label,{color1,color2})\`, \`__art.ui.card(s,x,y,w,h,{border:true})\`, \`__art.ui.slider(s,x,y,w,{min,max,value,accent,onChange})\`
  - FX: \`__art.fx.particleBurst(s,x,y,{count,color})\`, \`__art.fx.glow(s,target,color,intensity)\`
- Beyond the art library: \`scene.add.rectangle / circle / triangle / star\`, \`scene.add.text\` (system-ui font), or generate textures in create() with \`scene.make.graphics().generateTexture(...)\`. Emoji in text objects (🦅🍎🌟) still work as quick sprites.
- NEVER call \`this.load.image/audio/spritesheet\` with URLs. No preload of external anything.
- INPUT: support keyboard (cursors / space) AND pointer (tap zones) so tablets work.
- UI: show score and brief inline instructions as text objects. Include a visible win state and a lose/retry state; restart on pointer tap or SPACE.
- Read every gameplay constant from GAME_CONFIG — never hardcode numbers that exist in the config.
- Optionally call \`window.__reportScore(score)\` whenever the score changes (the harness records it).
- AUDIO is available via \`window.__audio\` — zero-asset WebAudio utility:
  - \`window.__audio.ding()\` on correct / pickup / win
  - \`window.__audio.buzz()\` on wrong / collision / lose
  - \`window.__audio.chime()\` on round win / level complete
  - \`window.__audio.tick()\` for neutral feedback (timer, menu navigation)
  - \`window.__audio.pop()\` for playful events (button tap, spawn)
  Call them — don't gate behind feature checks. They no-op silently if the browser blocks audio. Use sparingly; don't spam.
- FORBIDDEN: fetch, XMLHttpRequest, WebSocket, localStorage, sessionStorage, indexedDB, document.cookie, eval, new Function, import, parent, top, opener, location, document.write.
- Keep gameCode under ~350 lines. One scene class (or inline scene object) is plenty.`,
};

export const FLASHCARD_QUEST_TEMPLATE: GameTemplate = {
  id: "flashcard-quest",
  name: "Flashcard Quest",
  engine: "Phaser 3.87 (vendored, global `Phaser`)",
  description:
    "Recall-under-stakes flashcard game. The student answers prompts from a deck; correct answers feed a companion, build a streak, and progress a themed map. Wrong answers are sympathetic teaching moments. Use this for facts, vocab, sight words, multiplication, capitals, dates, language pairs — anything that benefits from spaced repetition.",
  contract: `TEMPLATE CONTRACT (flashcard-quest) — your code runs inside the same frozen HTML skeleton as Phaser arcade games. Phaser 3 is the global \`Phaser\`. SAME platform rules apply (no script tags, no asset loading, no network, no storage, etc.).

THIS TEMPLATE'S SHAPE:
- GAME_CONFIG MUST include \`deck\` (the array of cards from design.flashcardDeck), \`theme\` (object from design.theme), plus all numeric configSpec keys (targetCards, streakBonusEvery, etc.).
- One Phaser scene running the recall loop. NOT real-time physics — this is a turn-based answer game.

REQUIRED LOOP:
1. On start: shuffle deck (Phaser.Utils.Array.Shuffle); show theme background (theme.background) and title screen with "TAP or SPACE to start". Show the mascot (theme.mascotEmoji) as a Phaser.Text at large fontSize.
2. Round: pick the next card. Display the prompt as large readable text (fontSize: 36px, color: white, centered). Display 3-4 answer choices (correct + distractors) as tappable rounded rectangles arranged in a 2x2 grid. Use theme.accent for highlights.
3. On TAP/CLICK an answer:
   - Correct: window.__audio.ding(); particle burst from the card (Phaser particles or a quick tween of small circles radiating outward); streak++; score += 10 * (1 + Math.floor(streak/5)) (streak bonus); flash the streak meter; advance to next card.
   - Wrong: window.__audio.buzz(); shake the wrong choice (tween x by ±6 over 80ms three times); highlight the correct answer briefly; if card.explanation exists, show it for 1.5s; streak = 0; card returns to the back of the deck (spaced repetition); advance after 1.5s.
4. Companion mascot grows with streak: scale = 1 + Math.min(streak, 10) * 0.06. On streak 5+, play window.__audio.chime() once.
5. Top bar (always visible): score, streak (with a heart or star icon), cards remaining.
6. Win: deck cleared OR cards-completed >= GAME_CONFIG.targetCards. Show "QUEST COMPLETE!" + final score + record streak + "TAP or SPACE to play again". Play window.__audio.chime().

DELIGHT NON-NEGOTIABLES (the game is boring without these):
- Card flip animation: when transitioning, tween the card scaleX from 1 → 0 → 1 over ~250ms; swap text at scaleX=0.
- Particle burst on correct: ~10 small circles spawned at the card center with random outward velocities, fading + scaling to 0 over ~500ms.
- Sympathetic wrong: the answer text gets highlighted in green; the chosen wrong answer briefly turns red; copy says something kind like "Almost! [explanation]"
- Streak meter that visibly responds — a row of stars/hearts that fill up; companion mascot growing.
- Speed round every \`streakBonusEvery\` correct: card timer adds, 2x points.
- Background gets slightly more saturated as streak grows (theme.accent alpha tween from 0 to 0.15).

INPUT:
- Pointer (tap any answer choice).
- Keyboard: digit keys 1-4 select choice N; SPACE = start/restart at title and end screens.
- Both must work — tablets and laptops are both targets.

UI/LAYOUT (1280x720):
- Use \`__art.background(this, theme.name === 'space' ? 'space' : 'dawn', { stars: theme.name === 'space' })\` for atmosphere.
- Title bar via \`__art.titleBar(this)\`. Score left, streak center, "Cards: X/Y" right (white text, 18px bold).
- Mascot in upper-left corner of play area at fontSize 96px, scaled by streak.
- Prompt large in upper-middle (~y=240), fontSize 44px, white, system-ui.
- Answer choices in a 2x2 grid (use \`__art.ui.button(...)\` for each, sized ~560x80 with theme.accent gradient), centered at y=460/560.
- For card flips/transitions, prefer tweening scaleX on the prompt card created via \`__art.ui.card\`.

STATE MACHINE:
- Use scene data (\`this.data.set/get\`) or simple scene-level vars: deckIndex, streak, score, recordStreak, state ("title"|"playing"|"reveal"|"end").
- Distractors must NOT include the correct answer; shuffle them with the correct each round.

Read every gameplay constant from GAME_CONFIG.`,
};

export const TRAIL_MASTER_TEMPLATE: GameTemplate = {
  id: "trail-master",
  name: "Trail Master",
  engine: "Phaser 3.87 (vendored, global `Phaser`)",
  description:
    "Branching-journey decision game. The student's mascot travels a winding trail; at each waypoint a scene + 2-3 choices test understanding. Right answers carry the mascot forward with delight; wrong answers trigger a sympathetic teaching moment and the journey resumes (no dead ends). Use this for cause-and-effect topics, history/civics, ecology, navigation, physical reasoning — anything where the lesson is 'what should you do here, and why?'",
  contract: `TEMPLATE CONTRACT (trail-master) — your code runs inside the same frozen HTML skeleton as the other templates. Phaser 3 is the global \`Phaser\`. SAME platform rules apply (no script tags, no asset loading, no network, no storage, etc.).
THIS TEMPLATE'S SHAPE:
- GAME_CONFIG MUST include \`trail\` (the object from design.trail with destination, opening, steps[]), \`theme\` (object from design.theme), plus all numeric configSpec keys (moraleStart, streakBonusEvery, etc.).
- One Phaser scene running the journey loop. NOT real-time physics — this is a sequence of scenes with a moving avatar between them.

REQUIRED LOOP:
1. Title screen: dark themed background (theme.background), title text = "Journey to " + trail.destination. Show trail.opening as a 2-line subtitle. Show theme.mascotEmoji as a large Phaser.Text (fontSize 80px) gently bobbing (sine tween on y). "TAP or SPACE to begin" pulses below.
2. After start: render the trail as a polyline that winds across the canvas (left-to-right with vertical zigzag — see UI/LAYOUT). Waypoints are filled circles (radius 18) at each step position. The current waypoint glows with theme.accent.
3. For each step (deckIndex 0..steps.length-1):
   a. Mascot tweens along the polyline from previous waypoint to current (~600ms). window.__audio.tick() at start, window.__audio.pop() on arrival.
   b. Reveal a "scene card" overlay: a rounded rectangle (700x300, centered, fillStyle theme.background with white border) containing the prompt text (fontSize 24px, white, word-wrapped at width 640) and the choices as tappable rounded rect buttons (each 640x44, vertically stacked under the prompt, fillStyle theme.accent at low alpha, white text).
   c. Choices' display order is SHUFFLED each step (Phaser.Utils.Array.Shuffle on a copy of the choices array — do NOT mutate the source).
   d. On TAP/CLICK or digit key 1-3:
      - Correct (choice.isCorrect): window.__audio.ding(); particle burst at the chosen button (~10 small circles theme.accent, radial outward, fade in 500ms); morale += 1; streak += 1; score += 10 * (1 + Math.floor(streak / 5)); show consequence text in the card for 1500ms with a green check ✓ next to the chosen button.
      - Wrong: window.__audio.buzz(); chosen button shakes (tween x ±6 over 80ms three times); the CORRECT choice highlights in green; show choice.consequence as a sympathetic teaching message for 2200ms; streak = 0; morale unchanged (no game over — the lesson continues). The journey ALWAYS advances. Never punish with a dead end.
   e. After the reveal delay: dismiss the card (fade out 200ms) and advance deckIndex.
4. Top bar (always visible, 50px tall): "Step X / Y" left, score center, streak with a fire/star emoji right, morale as a small heart row (filled vs empty based on max(morale, 0) of total steps).
5. Speed segment: every \`streakBonusEvery\` correct in a row, briefly show "TRAIL BOOST!" text and mascot leaves a trailing particle line on next move. Audio: window.__audio.chime().
6. Win: deckIndex >= trail.steps.length. Mascot reaches a goal flag emoji 🏁 at the trail end. Big "ARRIVED AT " + trail.destination + "!" headline. Final score, record streak, and "TAP or SPACE to journey again". Play window.__audio.chime() once.

DELIGHT NON-NEGOTIABLES:
- Mascot bob/tween animation between waypoints — never teleport.
- Background subtly responds to streak: a soft theme.accent gradient overlay alpha tweens from 0 to 0.18 as streak grows; resets on a wrong answer.
- Wrong is sympathetic, never cruel: green-checks the correct choice and SHOWS the teaching message. The lesson is the consequence text — give it space and time on screen.
- Choice buttons grow slightly on hover (pointerover scale 1.04, pointerout scale 1.0).
- The trail polyline is visible at all times; completed waypoints render in muted color; remaining ones in theme.accent.

INPUT:
- Pointer (tap a choice button; tap title to start).
- Keyboard: digit keys 1, 2, 3 select the choice in that display position (after shuffle); SPACE = start/restart at title and end screens.
- Both must work — tablets and laptops are both targets.

UI/LAYOUT (1280x720):
- Atmospheric background via \`__art.background(this, "dawn", { ground: true })\` for outdoor journeys, "space" for cosmic, "underwater" for reef, "jungle" for forest.
- Decorate the backdrop: 2-3 \`__art.mountains(this, 540)\`, a \`__art.sun(this, 1100, 100)\`, scattered \`__art.tree(this, x, 620)\` along the ground line for outdoor themes. Skip for non-outdoor.
- Top bar via \`__art.titleBar(this)\`.
- Trail polyline rendered with this.add.graphics().lineStyle(8, theme.accent, 0.9).strokePoints(points, true). Points = array of {x, y} for each waypoint, spread evenly across width 120..1160 with y = 480 + Math.sin(i / steps.length * Math.PI * 2) * 80.
- Mascot Phaser.Text at fontSize 72px positioned on the current point with anchor 0.5.
- Scene card overlay via \`__art.ui.card(this, 640, 320, 900, 360, { border: true })\` ABOVE the trail layer, depth: 100. Prompt text inside at fontSize 32px.
- Choice buttons via \`__art.ui.button(this, ...)\` stacked inside the card.
- Goal flag 🏁 at the final waypoint position.

STATE MACHINE:
- Scene-level vars or this.data: deckIndex, streak, score, morale, recordStreak, state ("title"|"moving"|"prompt"|"reveal"|"end"), bgOverlayAlpha.
- After loading GAME_CONFIG.trail, build the waypoints array ONCE in create(); do not recompute per frame.
- Always validate: if a step has no isCorrect choice, treat the first as correct (defensive, in case the model slipped). NEVER show a step with zero choices — skip it silently.

Read every gameplay constant from GAME_CONFIG.`,
};

export const LAB_EXHIBIT_TEMPLATE: GameTemplate = {
  id: "lab-exhibit",
  name: "Lab Exhibit",
  engine: "Phaser 3.87 (vendored, global `Phaser`)",
  description:
    "Slider-driven interactive EXHIBIT — not a game. The student sees a topic-specific Phaser scene (a soccer player and goal; a lever; an ecosystem; a rocket) with 2-5 sliders below. Moving a slider changes a labeled outcome readout AND changes the animation when Run is pressed. Use this when the lesson is 'how does varying X affect Y?' and the topic has a recognizable visual (soccer kick, lever, pendulum, water cycle, rocket, food web). This is the right successor to the old Simulation Lab path — same sliders, same formulas, but the exhibit LOOKS LIKE THE TOPIC.",
  contract: `TEMPLATE CONTRACT (lab-exhibit) — your code runs inside the same frozen HTML skeleton as the other templates. Phaser 3 is the global \`Phaser\`. SAME platform rules apply (no script tags, no asset loading, no network, no storage, etc.).
CANVAS: 1280x720, Phaser.AUTO, Scale.FIT + CENTER_BOTH.

THIS TEMPLATE'S SHAPE:
- GAME_CONFIG MUST include \`exhibit\` (the object from design.exhibit with sceneDescription, animationDescription, variables[], outcomes[]) plus all numeric configSpec keys.
- One Phaser scene. NOT a game with score/win — an EXHIBIT the student plays with.
- The student is not under stakes. They drag sliders, press Run, watch the animation, read the outcome, drag again. This is teaching, not testing.

USE THE ART LIBRARY. The harness exposes \`window.__art\` (see full inventory below). DO NOT draw raw rectangles for known scene elements — call the helpers. This is the most important rule for visual quality.

USE THE FORMULA EVALUATORS. The harness pre-builds formula closures at assembly time and exposes \`window.__outcomes\`. To compute an outcome at slider values:
    const v = { kickPower: 70, kickAngle: 45, spinRate: 5 };
    const goalProb = window.__outcomes.goalProbability(v);
    const meta = window.__outcomeMeta.goalProbability; // { label, unit, isPrimary }
- DO NOT build your own Function() or eval — the harness already did it server-side from the validated formula strings. Just call \`__outcomes[id](values)\`. Guard with Number.isFinite — show "—" if not.

REQUIRED LAYOUT (1280x720, three zones):
- SCENE ZONE (y=56..540) — must LOOK LIKE THE TOPIC. Pick the right backdrop and props from \`__art\`. Examples:
  - Soccer kick: \`__art.background(this, "dawn", { ground: true })\`; \`__art.field(this, 480, "grass")\`; \`__art.soccerGoal(this, 1020, 440, 1.4)\`; \`__art.character(this, 320, 440, { pose: "kick", jersey: 0x1d4ed8 })\`; ball via \`__art.soccerBall(this, 360, 470, 14)\` that you'll tween toward the goal.
  - Lever: \`__art.background(this, "lab")\`; \`__art.field(this, 480, "lab-floor")\`; \`__art.lever(this, 640, 460, { tilt: 0, load: true, effort: true, scale: 2 })\` with the tilt animated from formula.
  - Rocket: \`__art.background(this, "space", { stars: true })\`; \`__art.rocket(this, 640, 540, { flame: true, scale: 2 })\` that tweens upward.
  - Water cycle: \`__art.background(this, "sky")\`; \`__art.mountains(this, 480)\`; \`__art.sun(this, 1100, 100)\`; \`__art.cloud(this, 400, 140, 1.4)\` × 3; lake as \`scene.add.ellipse(640, 540, 600, 80, 0x0ea5e9)\`.
- READOUT ZONE (y=540..600) — \`__art.ui.card(this, 640, 570, 1200, 56, { fill: 0x0f172a, alpha: 0.85 })\`. For each outcome card: render an inner card or row showing "<label>: <value> <unit>". Primary outcome larger and accented. Update LIVE on slider drag.
- CONTROL ZONE (y=600..720) — \`__art.ui.card(this, 640, 660, 1240, 120, { fill: 0xf3f4f6, alpha: 1, border: true })\`. Inside, for each variable in GAME_CONFIG.exhibit.variables (i=0..n-1):
  - Label text at (110, 620 + i * 28), fontSize 16px, dark gray.
  - \`__art.ui.slider(this, 460, 624 + i * 28, 540, { min: v.min, max: v.max, value: values[v.id], accent: 0x6366f1, onChange: function(nv){ values[v.id] = nv; refreshReadouts(); } })\`.
  - Value display text at (1040, 620 + i * 28).
- RUN BUTTON: \`__art.ui.button(this, 1180, 624, 100, 44, "▶ Run", { color1: 0x10b981, color2: 0x047857 })\`.
- RESET BUTTON: \`__art.ui.button(this, 1180, 676, 100, 36, "↺ Reset", { color1: 0x6b7280, color2: 0x374151 })\`.

REQUIRED ANIMATION:
- Read design.exhibit.animationDescription carefully and implement it. The animation is what makes this exhibit topic-specific.
- Soccer/projectile: tween the ball along a parabola from player's foot to a target x; arc height proportional to kickAngle; horizontal end-x shifted by spinRate*Math.sin(t*Math.PI). If the ball enters the goal mouth (rect intersection), play window.__audio.ding() and \`__art.fx.particleBurst(this, ball.x, ball.y, { color: 0xfacc15 })\` for celebration. If it misses, play window.__audio.buzz().
- Lever: tween the lever's tilt angle based on (effortDistance * effort - loadDistance * load) and redraw via \`__art.lever\` each frame.
- Rocket: tween rocket.y upward over a duration; height = thrust * fuel; window.__audio.chime() on reaching the top.
- Implement as Phaser tweens (this.tweens.add) OR a manual scene.update loop. Duration 1500-2500ms.
- Audio cues: window.__audio.pop() when Run is pressed; window.__audio.ding() on visible success; window.__audio.buzz() on visible miss.

DELIGHT NON-NEGOTIABLES:
- The scene must be RECOGNIZABLE in the first second — a child sees "soccer field with a goal" or "lever on a workbench" before reading any text. Use \`__art\` composed primitives, not flat rectangles.
- Live readout updates as sliders drag. Don't gate updates behind the Run button.
- Run button visibly depresses on click (the \`__art.ui.button\` handlers do this for you — keep it). Reset tweens sliders back to defaults visibly.
- The animation completes in 1.5-2.5 seconds. Never longer than 3s.

INPUT:
- Pointer/touch: drag slider handles; tap Run/Reset.
- Keyboard: Space = Run, R = Reset. ArrowLeft/ArrowRight shift the focused slider by ~5% of its range.
- Both must work — tablets and laptops are both targets.

STATE:
- Scene-level: \`values\` (current variable values dict, init from \`v.default\`), \`running\` (bool), refs to scene actors so animation can move them.
- After construction, define \`refreshReadouts()\` that reads \`window.__outcomes[id](values)\` for each outcome and updates the corresponding text. Call once at create() and on every slider drag.

DEFENSIVE:
- If GAME_CONFIG.exhibit is missing, draw centered "Exhibit not yet configured" via this.add.text — never crash.
- Clamp slider drags to [min, max]. Display values rounded to 1 decimal.
- If \`__outcomes[id](values)\` returns non-finite, show "—" instead of "NaN".

Read every gameplay constant from GAME_CONFIG.exhibit. Look at exhibit.sceneDescription to pick the right \`__art\` composition. Look at exhibit.animationDescription to drive the tween.`,
};

export const TEMPLATES: GameTemplate[] = [
  PHASER_ARCADE_TEMPLATE,
  FLASHCARD_QUEST_TEMPLATE,
  TRAIL_MASTER_TEMPLATE,
  LAB_EXHIBIT_TEMPLATE,
];

export function getTemplate(id: string): GameTemplate | null {
  return TEMPLATES.find((t) => t.id === id) ?? null;
}

// Brief summary of all templates the Designer can pick from. Injected
// into the Designer system prompt so the model knows the menu.
export function templateMenu(): string {
  return TEMPLATES.map((t) => `- "${t.id}" — ${t.name}: ${t.description}`).join(
    "\n",
  );
}

// Map companionType strings (from the brief form) to a preferred
// template id. The Designer can override based on the topic if needed.
export function templateForCompanionType(
  companionType: string,
): GameTemplate | null {
  if (companionType === "Flashcard Quest (experimental)")
    return FLASHCARD_QUEST_TEMPLATE;
  if (companionType === "Arcade Game (experimental)")
    return PHASER_ARCADE_TEMPLATE;
  if (companionType === "Trail Master (experimental)")
    return TRAIL_MASTER_TEMPLATE;
  if (companionType === "Lab Exhibit (experimental)")
    return LAB_EXHIBIT_TEMPLATE;
  return null;
}

const CONFIG_MARK = "/*{{CONFIG}}*/";
const GAME_MARK = "/*{{GAME}}*/";
const EXHIBIT_MARK = "/*{{EXHIBIT}}*/";

function skeleton(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' http: https:; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; font-src data:;">
<style>
  html,body{margin:0;padding:0;background:#0a0a18;height:100%;overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,sans-serif}
  #game{width:100%;height:100%;display:flex;align-items:center;justify-content:center}
  #game canvas{box-shadow:0 30px 80px rgba(0,0,0,0.6),0 8px 24px rgba(0,0,0,0.4);border-radius:8px}
</style>
<script src="/vendor/phaser.min.js"></script>
</head>
<body>
<div id="game"></div>
<script>
// __AUDIO__ (frozen — zero-asset WebAudio utility: window.__audio.ding(),
// .buzz(), .chime(), .tick(), .pop(). Lazy AudioContext init on first
// gesture to satisfy browser autoplay policy. Safe in sandboxed iframes.)
(function () {
  var ctx = null;
  function ensure() {
    if (ctx) return ctx;
    try {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    } catch (e) { return null; }
    return ctx;
  }
  // Try to resume the context on the first user gesture (autoplay policy).
  function unlock() {
    var c = ensure();
    if (c && c.state === "suspended" && typeof c.resume === "function") c.resume();
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("keydown", unlock, true);
  }
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);

  function tone(freq, durMs, opts) {
    var c = ensure();
    if (!c) return;
    var o = opts || {};
    var t = c.currentTime + (o.delayMs ? o.delayMs / 1000 : 0);
    var dur = durMs / 1000;
    var osc = c.createOscillator();
    osc.type = o.type || "sine";
    osc.frequency.value = freq;
    if (o.toFreq) {
      osc.frequency.linearRampToValueAtTime(o.toFreq, t + dur);
    }
    var g = c.createGain();
    var peak = (o.gain != null ? o.gain : 0.12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  window.__audio = {
    ding: function () {
      tone(880, 0.14 * 1000, { type: "sine", gain: 0.14 });
      tone(1320, 0.18 * 1000, { type: "sine", gain: 0.10, delayMs: 50 });
    },
    buzz: function () {
      tone(220, 0.18 * 1000, { type: "square", gain: 0.08, toFreq: 130 });
    },
    chime: function () {
      [523, 659, 784, 1047].forEach(function (f, i) {
        tone(f, 0.22 * 1000, { type: "sine", gain: 0.10, delayMs: i * 90 });
      });
    },
    tick: function () {
      tone(900, 0.04 * 1000, { type: "square", gain: 0.05 });
    },
    pop: function () {
      tone(440, 0.09 * 1000, { type: "triangle", gain: 0.10, toFreq: 660 });
    },
    // Generic escape hatch — frequency 80-3000Hz, duration <=600ms.
    tone: function (freq, durMs, opts) {
      if (typeof freq !== "number" || freq < 80 || freq > 3000) return;
      if (typeof durMs !== "number" || durMs <= 0 || durMs > 600) return;
      tone(freq, durMs, opts || {});
    }
  };
})();
</script>
<script>
// __ART__ v1 (frozen — rich procedural art library shared by every template.
// Exposes window.__art with atmospheric backgrounds, composed scene
// primitives (soccer goal, lever, rocket, sun/cloud/mountain, etc.), and
// properly designed UI chrome. Built from Phaser graphics + text so we
// stay zero-asset and CSP-clean. Every helper takes a scene and returns a
// Phaser.GameObjects.Container so the caller can position, tween,
// destroy, and depth-sort it as a unit.)
(function () {
  // ---- color palettes ----
  var PAL = {
    sky:        { top: 0x87ceeb, mid: 0xc8e8f8, low: 0xfff2c8 },
    space:      { top: 0x0a0a1f, mid: 0x1a1a3a, low: 0x2a1a4a },
    sunset:     { top: 0xff7f50, mid: 0xff4d6d, low: 0x6b21a8 },
    dawn:       { top: 0xfde68a, mid: 0xfb923c, low: 0x7c3aed },
    underwater: { top: 0x0e7490, mid: 0x0891b2, low: 0x06b6d4 },
    jungle:     { top: 0x166534, mid: 0x14532d, low: 0x052e16 },
    lab:        { top: 0xf3f4f6, mid: 0xe5e7eb, low: 0xd1d5db },
    field:      { top: 0x86efac, mid: 0x4ade80, low: 0x16a34a }
  };

  // ---- background atmospheres (gradient + decoration) ----
  function background(scene, kind, opts) {
    opts = opts || {};
    var w = scene.scale.width, h = scene.scale.height;
    var pal = PAL[kind] || PAL.sky;
    var g = scene.add.graphics().setDepth(-1000);
    g.fillGradientStyle(pal.top, pal.top, pal.mid, pal.low, 1, 1, 1, 1);
    g.fillRect(0, 0, w, h);
    var container = scene.add.container(0, 0, [g]).setDepth(-1000);
    if (opts.stars && (kind === "space" || kind === "sunset" || kind === "dawn")) {
      for (var i = 0; i < 60; i++) {
        var s = scene.add.circle(
          Math.random() * w,
          Math.random() * h * 0.7,
          Math.random() < 0.85 ? 1 : 2,
          0xffffff,
          0.4 + Math.random() * 0.6
        );
        container.add(s);
      }
    }
    if (opts.ground) {
      var gh = Math.round(h * 0.18);
      var ground = scene.add.graphics();
      var c1 = pal.low, c2 = pal.mid;
      ground.fillGradientStyle(c2, c2, c1, c1, 1, 1, 1, 1);
      ground.fillRect(0, h - gh, w, gh);
      container.add(ground);
    }
    return container;
  }

  // ---- sun, with radial glow ----
  function sun(scene, x, y, r) {
    r = r || 32;
    var c = scene.add.container(x, y);
    for (var i = 4; i >= 1; i--) {
      var halo = scene.add.circle(0, 0, r * (1 + i * 0.6), 0xfff2a8, 0.06 * i);
      c.add(halo);
    }
    c.add(scene.add.circle(0, 0, r, 0xfde047));
    c.add(scene.add.circle(0, -r * 0.25, r * 0.5, 0xfff4b0, 0.5));
    return c;
  }

  // ---- soft cloud (3-5 overlapping ellipses with highlight) ----
  function cloud(scene, x, y, scale) {
    scale = scale || 1;
    var c = scene.add.container(x, y);
    var puffs = [
      { x: -28, y: 4, r: 18 },
      { x: -8, y: -4, r: 22 },
      { x: 16, y: 0, r: 20 },
      { x: 32, y: 8, r: 16 }
    ];
    for (var i = 0; i < puffs.length; i++) {
      var p = puffs[i];
      c.add(scene.add.ellipse(p.x * scale, (p.y + 4) * scale, p.r * 2.2 * scale, p.r * 1.4 * scale, 0x000000, 0.08));
    }
    for (var j = 0; j < puffs.length; j++) {
      var q = puffs[j];
      c.add(scene.add.ellipse(q.x * scale, q.y * scale, q.r * 2.2 * scale, q.r * 1.4 * scale, 0xffffff, 1));
    }
    c.add(scene.add.ellipse(-12 * scale, -10 * scale, 24 * scale, 8 * scale, 0xffffff, 0.6));
    return c;
  }

  // ---- mountain range (layered triangles with snow caps) ----
  function mountains(scene, baseY, opts) {
    opts = opts || {};
    var c = scene.add.container(0, 0);
    var w = scene.scale.width;
    var layers = [
      { count: 3, color: 0x4b5563, h: 220, snow: true },
      { count: 4, color: 0x6b7280, h: 150, snow: false },
      { count: 5, color: 0x9ca3af, h: 100, snow: false }
    ];
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i];
      for (var j = 0; j < L.count; j++) {
        var cx = (w / L.count) * j + (w / L.count) * 0.5 + (Math.random() - 0.5) * 30;
        var peakH = L.h + Math.random() * 40;
        var halfBase = peakH * 0.9;
        var g = scene.add.graphics();
        g.fillStyle(L.color, 1);
        g.fillTriangle(cx - halfBase, baseY, cx + halfBase, baseY, cx, baseY - peakH);
        c.add(g);
        if (L.snow) {
          var sg = scene.add.graphics();
          sg.fillStyle(0xffffff, 1);
          sg.fillTriangle(cx - halfBase * 0.25, baseY - peakH * 0.7, cx + halfBase * 0.25, baseY - peakH * 0.7, cx, baseY - peakH);
          c.add(sg);
        }
      }
    }
    return c;
  }

  // ---- tree (trunk + clustered crown) ----
  function tree(scene, x, y, scale) {
    scale = scale || 1;
    var c = scene.add.container(x, y);
    c.add(scene.add.rectangle(0, 0, 14 * scale, 50 * scale, 0x713f12));
    var crowns = [
      { x: 0, y: -50, r: 26 },
      { x: -16, y: -38, r: 18 },
      { x: 16, y: -38, r: 18 },
      { x: 0, y: -64, r: 20 }
    ];
    for (var i = 0; i < crowns.length; i++) {
      var k = crowns[i];
      c.add(scene.add.circle(k.x * scale, k.y * scale, (k.r + 1) * scale, 0x14532d));
    }
    for (var i2 = 0; i2 < crowns.length; i2++) {
      var k2 = crowns[i2];
      c.add(scene.add.circle(k2.x * scale, k2.y * scale, k2.r * scale, 0x16a34a));
    }
    c.add(scene.add.circle(-6 * scale, -56 * scale, 6 * scale, 0x86efac, 0.6));
    return c;
  }

  // ---- soccer goal (frame + net hatch + ground shadow) ----
  function soccerGoal(scene, x, y, scale) {
    scale = scale || 1;
    var c = scene.add.container(x, y);
    var W = 140 * scale, H = 90 * scale, depth = 28 * scale;
    c.add(scene.add.ellipse(0, H * 0.5 + 4, W * 1.05, 8 * scale, 0x000000, 0.25));
    var net = scene.add.graphics();
    net.fillStyle(0xffffff, 0.5);
    net.fillRect(-W * 0.5, -H * 0.5, W, H);
    net.lineStyle(1, 0x4b5563, 0.5);
    for (var nx = -W * 0.5; nx <= W * 0.5; nx += 10 * scale) {
      net.beginPath();
      net.moveTo(nx, -H * 0.5);
      net.lineTo(nx, H * 0.5);
      net.strokePath();
    }
    for (var ny = -H * 0.5; ny <= H * 0.5; ny += 10 * scale) {
      net.beginPath();
      net.moveTo(-W * 0.5, ny);
      net.lineTo(W * 0.5, ny);
      net.strokePath();
    }
    c.add(net);
    var frame = scene.add.graphics();
    frame.lineStyle(6 * scale, 0xffffff, 1);
    frame.strokeRect(-W * 0.5, -H * 0.5, W, H);
    frame.lineStyle(4 * scale, 0xd1d5db, 1);
    frame.beginPath();
    frame.moveTo(-W * 0.5, -H * 0.5);
    frame.lineTo(-W * 0.5 - depth, -H * 0.5 + 8 * scale);
    frame.moveTo(W * 0.5, -H * 0.5);
    frame.lineTo(W * 0.5 + depth, -H * 0.5 + 8 * scale);
    frame.moveTo(-W * 0.5, H * 0.5);
    frame.lineTo(-W * 0.5 - depth, H * 0.5 + 8 * scale);
    frame.moveTo(W * 0.5, H * 0.5);
    frame.lineTo(W * 0.5 + depth, H * 0.5 + 8 * scale);
    frame.strokePath();
    c.add(frame);
    return c;
  }

  // ---- soccer ball (white circle with rotated pentagon panels) ----
  function soccerBall(scene, x, y, r) {
    r = r || 12;
    var c = scene.add.container(x, y);
    c.add(scene.add.ellipse(0, r + 2, r * 2, r * 0.4, 0x000000, 0.3));
    c.add(scene.add.circle(0, 0, r, 0xffffff));
    var penta = scene.add.graphics();
    penta.fillStyle(0x111827, 1);
    for (var k = 0; k < 5; k++) {
      var a = (k / 5) * Math.PI * 2 - Math.PI / 2;
      var px = Math.cos(a) * r * 0.5;
      var py = Math.sin(a) * r * 0.5;
      penta.fillCircle(px, py, r * 0.18);
    }
    penta.fillCircle(0, 0, r * 0.18);
    c.add(penta);
    c.add(scene.add.circle(-r * 0.3, -r * 0.3, r * 0.35, 0xffffff, 0.5));
    return c;
  }

  // ---- stylized human figure (head, body, legs, arms; pose by opts.pose) ----
  function character(scene, x, y, opts) {
    opts = opts || {};
    var pose = opts.pose || "stand"; // stand | kick | throw | run
    var jersey = opts.jersey || 0x2563eb;
    var skin = opts.skin || 0xfbbf24;
    var pants = opts.pants || 0x1e3a8a;
    var s = opts.scale || 1;
    var c = scene.add.container(x, y);
    c.add(scene.add.ellipse(0, 64 * s, 30 * s, 6 * s, 0x000000, 0.3));
    c.add(scene.add.rectangle(-8 * s, 50 * s, 10 * s, 28 * s, pants));
    c.add(scene.add.rectangle(8 * s, 50 * s, 10 * s, 28 * s, pants));
    if (pose === "kick") {
      var leg = scene.add.rectangle(20 * s, 36 * s, 30 * s, 9 * s, pants);
      leg.setRotation(-0.7);
      c.add(leg);
      c.add(scene.add.ellipse(34 * s, 28 * s, 14 * s, 7 * s, 0x111827));
    } else if (pose === "run") {
      var leg2 = scene.add.rectangle(14 * s, 50 * s, 10 * s, 28 * s, pants);
      leg2.setRotation(0.4);
      c.add(leg2);
    }
    c.add(scene.add.rectangle(0, 22 * s, 32 * s, 36 * s, jersey));
    c.add(scene.add.rectangle(0, 18 * s, 28 * s, 4 * s, 0xffffff, 0.4));
    c.add(scene.add.rectangle(-19 * s, 18 * s, 8 * s, 26 * s, jersey));
    c.add(scene.add.rectangle(19 * s, 18 * s, 8 * s, 26 * s, jersey));
    if (pose === "throw") {
      var arm = scene.add.rectangle(22 * s, 6 * s, 26 * s, 8 * s, jersey);
      arm.setRotation(-0.5);
      c.add(arm);
    }
    c.add(scene.add.circle(0, -8 * s, 11 * s, skin));
    c.add(scene.add.ellipse(-3 * s, -10 * s, 5 * s, 4 * s, 0xffffff));
    c.add(scene.add.ellipse(3 * s, -10 * s, 5 * s, 4 * s, 0xffffff));
    c.add(scene.add.ellipse(-3 * s, -10 * s, 2 * s, 2 * s, 0x111827));
    c.add(scene.add.ellipse(3 * s, -10 * s, 2 * s, 2 * s, 0x111827));
    c.add(scene.add.arc(0, -4 * s, 4 * s, 0, Math.PI, false, 0xb91c1c, 1).setRotation(0));
    c.add(scene.add.ellipse(0, -19 * s, 24 * s, 8 * s, 0x111827));
    c.add(scene.add.ellipse(0, -22 * s, 18 * s, 14 * s, 0x111827));
    return c;
  }

  // ---- lever (beam + fulcrum + optional load/effort) ----
  function lever(scene, x, y, opts) {
    opts = opts || {};
    var s = opts.scale || 1;
    var tilt = opts.tilt || 0;
    var c = scene.add.container(x, y);
    var fulcrum = scene.add.graphics();
    fulcrum.fillStyle(0x6b7280, 1);
    fulcrum.fillTriangle(-22 * s, 30 * s, 22 * s, 30 * s, 0, -8 * s);
    fulcrum.fillStyle(0x374151, 1);
    fulcrum.fillTriangle(-2 * s, 30 * s, 22 * s, 30 * s, 0, -8 * s);
    c.add(fulcrum);
    var beam = scene.add.rectangle(0, -8 * s, 240 * s, 14 * s, 0x92400e);
    beam.setRotation(tilt);
    c.add(beam);
    var hi = scene.add.rectangle(0, -12 * s, 240 * s, 4 * s, 0xfbbf24, 0.5);
    hi.setRotation(tilt);
    c.add(hi);
    if (opts.load) {
      var lx = Math.cos(tilt) * -110 * s, ly = -8 * s + Math.sin(tilt) * -110 * s;
      c.add(scene.add.rectangle(lx, ly - 14 * s, 30 * s, 28 * s, 0x78350f));
      c.add(scene.add.rectangle(lx, ly - 14 * s, 30 * s, 4 * s, 0xfbbf24, 0.5));
    }
    if (opts.effort) {
      var ex = Math.cos(tilt) * 110 * s, ey = -8 * s + Math.sin(tilt) * 110 * s;
      var arrow = scene.add.graphics();
      arrow.fillStyle(0xef4444, 1);
      arrow.fillTriangle(ex - 8 * s, ey - 24 * s, ex + 8 * s, ey - 24 * s, ex, ey - 8 * s);
      arrow.fillRect(ex - 4 * s, ey - 50 * s, 8 * s, 26 * s);
      c.add(arrow);
    }
    return c;
  }

  // ---- rocket (body + nose + fins + window) ----
  function rocket(scene, x, y, opts) {
    opts = opts || {};
    var s = opts.scale || 1;
    var c = scene.add.container(x, y);
    var bodyHi = scene.add.graphics();
    bodyHi.fillStyle(0xe5e7eb, 1);
    bodyHi.fillRoundedRect(-18 * s, -30 * s, 36 * s, 90 * s, 6 * s);
    c.add(bodyHi);
    var bodyLo = scene.add.graphics();
    bodyLo.fillStyle(0x9ca3af, 1);
    bodyLo.fillRoundedRect(6 * s, -30 * s, 12 * s, 90 * s, 6 * s);
    c.add(bodyLo);
    var nose = scene.add.graphics();
    nose.fillStyle(0xdc2626, 1);
    nose.fillTriangle(-18 * s, -30 * s, 18 * s, -30 * s, 0, -66 * s);
    nose.fillStyle(0xfca5a5, 1);
    nose.fillTriangle(-4 * s, -30 * s, 4 * s, -30 * s, 0, -64 * s);
    c.add(nose);
    var fL = scene.add.graphics();
    fL.fillStyle(0xdc2626, 1);
    fL.fillTriangle(-18 * s, 30 * s, -18 * s, 70 * s, -36 * s, 70 * s);
    c.add(fL);
    var fR = scene.add.graphics();
    fR.fillStyle(0xdc2626, 1);
    fR.fillTriangle(18 * s, 30 * s, 18 * s, 70 * s, 36 * s, 70 * s);
    c.add(fR);
    c.add(scene.add.circle(0, -6 * s, 10 * s, 0x0ea5e9));
    c.add(scene.add.circle(-3 * s, -9 * s, 5 * s, 0xbae6fd, 0.7));
    c.add(scene.add.circle(0, -6 * s, 11 * s, 0xffffff, 0).setStrokeStyle(2 * s, 0xffffff));
    if (opts.flame) {
      var flame = scene.add.graphics();
      flame.fillStyle(0xfbbf24, 0.9);
      flame.fillTriangle(-10 * s, 60 * s, 10 * s, 60 * s, 0, 110 * s);
      flame.fillStyle(0xfb923c, 1);
      flame.fillTriangle(-7 * s, 60 * s, 7 * s, 60 * s, 0, 100 * s);
      flame.fillStyle(0xfef3c7, 1);
      flame.fillTriangle(-3 * s, 60 * s, 3 * s, 60 * s, 0, 86 * s);
      c.add(flame);
    }
    return c;
  }

  // ---- beaker / flask ----
  function beaker(scene, x, y, opts) {
    opts = opts || {};
    var s = opts.scale || 1;
    var level = opts.level == null ? 0.55 : opts.level;
    var color = opts.color || 0x0ea5e9;
    var c = scene.add.container(x, y);
    var glass = scene.add.graphics();
    glass.fillStyle(0xffffff, 0.15);
    glass.fillRoundedRect(-22 * s, -36 * s, 44 * s, 70 * s, 4 * s);
    c.add(glass);
    var liq = scene.add.graphics();
    liq.fillStyle(color, 0.85);
    var liqH = 64 * s * level;
    liq.fillRoundedRect(-20 * s, 32 * s - liqH, 40 * s, liqH, 3 * s);
    c.add(liq);
    var meniscus = scene.add.ellipse(0, 32 * s - liqH, 40 * s, 4 * s, 0xffffff, 0.5);
    c.add(meniscus);
    var rim = scene.add.graphics();
    rim.lineStyle(2.5 * s, 0xe5e7eb, 1);
    rim.strokeRoundedRect(-22 * s, -36 * s, 44 * s, 70 * s, 4 * s);
    rim.lineStyle(2 * s, 0xe5e7eb, 1);
    rim.strokePath();
    rim.beginPath();
    rim.moveTo(-26 * s, -36 * s);
    rim.lineTo(26 * s, -36 * s);
    rim.strokePath();
    c.add(rim);
    c.add(scene.add.rectangle(-14 * s, 0 * s, 4 * s, 40 * s, 0xffffff, 0.3));
    return c;
  }

  // ---- ground / field ----
  function field(scene, baseY, kind) {
    var g = scene.add.graphics();
    var w = scene.scale.width;
    if (kind === "grass" || !kind) {
      g.fillStyle(0x166534, 1);
      g.fillRect(0, baseY, w, scene.scale.height - baseY);
      var stripes = scene.add.graphics();
      for (var i = 0; i < 8; i++) {
        stripes.fillStyle(i % 2 === 0 ? 0x16a34a : 0x15803d, 0.5);
        stripes.fillRect(0, baseY + i * 12, w, 6);
      }
      return scene.add.container(0, 0, [g, stripes]);
    }
    if (kind === "lab-floor") {
      g.fillGradientStyle(0xe5e7eb, 0xe5e7eb, 0xd1d5db, 0xd1d5db, 1, 1, 1, 1);
      g.fillRect(0, baseY, w, scene.scale.height - baseY);
      return scene.add.container(0, 0, [g]);
    }
    g.fillStyle(0x78350f, 1);
    g.fillRect(0, baseY, w, scene.scale.height - baseY);
    return scene.add.container(0, 0, [g]);
  }

  // ---- UI: button (rounded, gradient, shadow, hover-ready) ----
  function uiButton(scene, x, y, w, h, label, opts) {
    opts = opts || {};
    var c = scene.add.container(x, y);
    var shadow = scene.add.graphics();
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillRoundedRect(-w * 0.5 + 2, -h * 0.5 + 4, w, h, 10);
    c.add(shadow);
    var bg = scene.add.graphics();
    var c1 = opts.color1 || 0x6366f1, c2 = opts.color2 || 0x4338ca;
    bg.fillGradientStyle(c1, c1, c2, c2, 1, 1, 1, 1);
    bg.fillRoundedRect(-w * 0.5, -h * 0.5, w, h, 10);
    c.add(bg);
    var hi = scene.add.graphics();
    hi.fillStyle(0xffffff, 0.18);
    hi.fillRoundedRect(-w * 0.5 + 2, -h * 0.5 + 2, w - 4, h * 0.45, 8);
    c.add(hi);
    var txt = scene.add.text(0, 0, label, {
      fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
      fontSize: Math.round(h * 0.42) + 'px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5);
    c.add(txt);
    c.setSize(w, h);
    c.setInteractive(new Phaser.Geom.Rectangle(-w * 0.5, -h * 0.5, w, h), Phaser.Geom.Rectangle.Contains);
    c.on('pointerover', function () { c.setScale(1.04); });
    c.on('pointerout', function () { c.setScale(1.0); });
    c.on('pointerdown', function () { c.setScale(0.96); });
    c.on('pointerup', function () { c.setScale(1.04); });
    return c;
  }

  // ---- UI: card (glass surface with shadow + border) ----
  function uiCard(scene, x, y, w, h, opts) {
    opts = opts || {};
    var c = scene.add.container(x, y);
    var shadow = scene.add.graphics();
    shadow.fillStyle(0x000000, 0.35);
    shadow.fillRoundedRect(-w * 0.5 + 4, -h * 0.5 + 8, w, h, 16);
    c.add(shadow);
    var bg = scene.add.graphics();
    bg.fillStyle(opts.fill || 0xffffff, opts.alpha == null ? 0.96 : opts.alpha);
    bg.fillRoundedRect(-w * 0.5, -h * 0.5, w, h, 16);
    c.add(bg);
    if (opts.border) {
      var br = scene.add.graphics();
      br.lineStyle(2, opts.borderColor || 0xe5e7eb, 1);
      br.strokeRoundedRect(-w * 0.5, -h * 0.5, w, h, 16);
      c.add(br);
    }
    return c;
  }

  // ---- UI: slider (track + colored fill + glowing handle + drag) ----
  function uiSlider(scene, x, y, w, opts) {
    opts = opts || {};
    var min = opts.min == null ? 0 : opts.min;
    var max = opts.max == null ? 1 : opts.max;
    var value = opts.value == null ? (min + max) / 2 : opts.value;
    var accent = opts.accent || 0x6366f1;
    var c = scene.add.container(x, y);
    var track = scene.add.graphics();
    track.fillStyle(0xd1d5db, 1);
    track.fillRoundedRect(-w * 0.5, -3, w, 6, 3);
    c.add(track);
    var fill = scene.add.graphics();
    c.add(fill);
    var handleX = -w * 0.5 + ((value - min) / (max - min)) * w;
    var glow = scene.add.circle(handleX, 0, 16, accent, 0.25);
    c.add(glow);
    var handle = scene.add.circle(handleX, 0, 10, accent);
    handle.setStrokeStyle(2, 0xffffff);
    c.add(handle);
    var redraw = function (v) {
      var hx = -w * 0.5 + ((v - min) / (max - min)) * w;
      fill.clear();
      fill.fillStyle(accent, 1);
      fill.fillRoundedRect(-w * 0.5, -3, hx + w * 0.5, 6, 3);
      handle.x = hx;
      glow.x = hx;
    };
    redraw(value);
    handle.setInteractive({ draggable: true, useHandCursor: true });
    scene.input.setDraggable(handle);
    handle.on('drag', function (_p, dx) {
      var clamped = Math.max(-w * 0.5, Math.min(w * 0.5, dx));
      var t = (clamped + w * 0.5) / w;
      var nv = min + t * (max - min);
      redraw(nv);
      if (opts.onChange) opts.onChange(nv);
    });
    c.setData('redraw', redraw);
    return c;
  }

  // ---- FX: particle burst (radial outward fade) ----
  function particleBurst(scene, x, y, opts) {
    opts = opts || {};
    var count = opts.count || 12;
    var color = opts.color || 0xfacc15;
    for (var i = 0; i < count; i++) {
      var a = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      var d = 24 + Math.random() * 36;
      var p = scene.add.circle(x, y, 3 + Math.random() * 3, color, 1);
      scene.tweens.add({
        targets: p,
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d,
        alpha: 0,
        scale: 0.2,
        duration: 500 + Math.random() * 250,
        ease: 'Cubic.easeOut',
        onComplete: function () { this.targets[0].destroy(); }
      });
    }
  }

  // ---- FX: glow halo around a target ----
  function glow(scene, target, color, intensity) {
    color = color || 0xfde047;
    intensity = intensity || 0.5;
    var g = scene.add.circle(target.x, target.y, 28, color, intensity);
    g.setDepth((target.depth || 0) - 1);
    scene.tweens.add({
      targets: g,
      scale: 1.3,
      alpha: 0,
      duration: 700,
      onComplete: function () { g.destroy(); }
    });
  }

  // ---- title bar (frosted glass on top edge) ----
  function titleBar(scene, opts) {
    opts = opts || {};
    var h = opts.h || 56;
    var w = scene.scale.width;
    var c = scene.add.container(0, 0).setDepth(900);
    var bg = scene.add.graphics();
    bg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.4, 0.4, 0.0, 0.0);
    bg.fillRect(0, 0, w, h);
    c.add(bg);
    var line = scene.add.rectangle(w * 0.5, h, w, 1, 0xffffff, 0.2);
    c.add(line);
    return c;
  }

  window.__art = {
    PAL: PAL,
    background: background,
    sun: sun,
    cloud: cloud,
    mountains: mountains,
    tree: tree,
    soccerGoal: soccerGoal,
    soccerBall: soccerBall,
    character: character,
    lever: lever,
    rocket: rocket,
    beaker: beaker,
    field: field,
    titleBar: titleBar,
    ui: {
      button: uiButton,
      card: uiCard,
      slider: uiSlider
    },
    fx: {
      particleBurst: particleBurst,
      glow: glow
    }
  };
})();
</script>
<script>
// __HARNESS__ v2 (frozen — runtime reporting, screenshot capture, input fuzzing)
(function () {
  function report(type, payload) {
    try { parent.postMessage({ __gameHarness: true, type: type, payload: payload || {} }, "*"); } catch (e) {}
  }
  window.addEventListener("error", function (e) {
    report("error", {
      message: e.message || "Unknown error",
      stack: e.error && e.error.stack ? String(e.error.stack).slice(0, 2000) : null
    });
  });
  window.addEventListener("unhandledrejection", function (e) {
    var r = e.reason;
    report("error", { message: "Unhandled rejection: " + (r && r.message ? r.message : String(r)) });
  });
  var origError = console.error;
  console.error = function () {
    report("console.error", { message: Array.prototype.map.call(arguments, String).join(" ").slice(0, 2000) });
    origError.apply(console, arguments);
  };
  window.__reportReady = function () { report("ready", {}); };
  window.__reportScore = function (s) { report("score", { score: Number(s) || 0 }); };
  var beats = 0;
  setInterval(function () { if (beats < 20) report("heartbeat", { t: ++beats }); }, 1500);

  // ---- Screenshot capture (judge support) ----
  // Uses Phaser's renderer.snapshot (WebGL-safe; no preserveDrawingBuffer
  // needed). Falls back to canvas.toDataURL. Downscales to ~480px wide
  // JPEG to keep vision-model payloads small.
  function downscale(img, cb) {
    try {
      var w = 480;
      var h = Math.round(img.height * (w / img.width)) || 360;
      var c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      cb(c.toDataURL("image/jpeg", 0.7));
    } catch (e) { cb(null); }
  }
  function capture(id) {
    function fail() { report("capture", { id: id, dataUrl: null }); }
    try {
      var game = window.__game;
      if (game && game.renderer && typeof game.renderer.snapshot === "function") {
        game.renderer.snapshot(function (img) {
          downscale(img, function (url) { report("capture", { id: id, dataUrl: url }); });
        });
        return;
      }
      var cv = document.querySelector("canvas");
      if (cv) {
        var img2 = new Image();
        img2.onload = function () { downscale(img2, function (url) { report("capture", { id: id, dataUrl: url }); }); };
        img2.onerror = fail;
        img2.src = cv.toDataURL("image/png");
        return;
      }
      fail();
    } catch (e) { fail(); }
  }

  // ---- Input fuzzer (ghost playtest so the judge sees real gameplay) ----
  var KEYS = [
    { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 },
    { key: "ArrowRight", code: "ArrowRight", keyCode: 39 },
    { key: "ArrowUp", code: "ArrowUp", keyCode: 38 },
    { key: "ArrowDown", code: "ArrowDown", keyCode: 40 },
    { key: " ", code: "Space", keyCode: 32 }
  ];
  var fuzzTimer = null;
  function pressKey(k, ms) {
    var down = new KeyboardEvent("keydown", { key: k.key, code: k.code, keyCode: k.keyCode, bubbles: true });
    Object.defineProperty(down, "keyCode", { get: function () { return k.keyCode; } });
    window.dispatchEvent(down);
    setTimeout(function () {
      var up = new KeyboardEvent("keyup", { key: k.key, code: k.code, keyCode: k.keyCode, bubbles: true });
      Object.defineProperty(up, "keyCode", { get: function () { return k.keyCode; } });
      window.dispatchEvent(up);
    }, ms);
  }
  function tapCanvas() {
    var cv = document.querySelector("canvas");
    if (!cv) return;
    var r = cv.getBoundingClientRect();
    var x = r.left + r.width * (0.2 + Math.random() * 0.6);
    var y = r.top + r.height * (0.2 + Math.random() * 0.6);
    ["pointerdown", "pointerup"].forEach(function (t, i) {
      setTimeout(function () {
        cv.dispatchEvent(new PointerEvent(t, { clientX: x, clientY: y, bubbles: true, pointerId: 1, isPrimary: true }));
      }, i * 60);
    });
  }
  function fuzz(durationMs) {
    if (fuzzTimer) clearInterval(fuzzTimer);
    var until = Date.now() + (durationMs || 1500);
    fuzzTimer = setInterval(function () {
      if (Date.now() > until) { clearInterval(fuzzTimer); fuzzTimer = null; return; }
      if (Math.random() < 0.25) tapCanvas();
      else pressKey(KEYS[Math.floor(Math.random() * KEYS.length)], 120 + Math.random() * 250);
    }, 150);
  }

  window.addEventListener("message", function (e) {
    var d = e.data;
    if (!d || d.__gameParent !== true) return;
    if (d.type === "capture") capture(d.id);
    else if (d.type === "fuzz") fuzz(d.durationMs);
  });
})();
</script>
<script>
// __CONFIG__ (generated)
${CONFIG_MARK}
</script>
<script>
// __EXHIBIT__ (server-baked formula evaluators; empty for non-exhibit templates)
${EXHIBIT_MARK}
</script>
<script>
// __GAME__ (generated)
${GAME_MARK}
</script>
<script>
// __BOOT__ (frozen)
window.addEventListener("load", function () {
  try {
    if (typeof Phaser === "undefined") throw new Error("Phaser failed to load from /vendor/phaser.min.js");
    if (typeof createGame !== "function") throw new Error("Template contract violation: createGame() is not defined");
    // Stash the instance so the harness can drive renderer.snapshot().
    window.__game = createGame();
    if (window.__reportReady) window.__reportReady();
  } catch (e) {
    console.error("Boot failure: " + (e && e.message ? e.message : String(e)));
  }
});
</script>
</body>
</html>`;
}

// Escape any </script that would break out of the inline script block.
function inert(code: string): string {
  return code.replace(/<\/script/gi, "<\\/script");
}

// Server-bake formula evaluators for Lab Exhibit. The LLM never touches
// Function() at runtime; we compose closures at assembly time from the
// design's pre-validated formula strings (each must pass isFormulaSafe).
// Exposes window.__outcomes[outcomeId](values) returning a number, and
// window.__outcomeMeta[outcomeId] = { label, unit, isPrimary }.
function bakeExhibit(design?: GameDesign): string {
  if (!design?.exhibit) return "";
  const varIds = design.exhibit.variables.map((v) => v.id);
  const destructure = varIds.length > 0 ? `{${varIds.join(",")}}` : "{}";
  const fns = design.exhibit.outcomes
    .map((o) => {
      const safe = isFormulaSafe(o.formula);
      const body = safe ? `(${o.formula})` : "0";
      return `  ${JSON.stringify(o.id)}: function(v){ var ${destructure}=v||{}; try { return (${body}); } catch(e){ return NaN; } }`;
    })
    .join(",\n");
  const meta = design.exhibit.outcomes
    .map(
      (o) =>
        `  ${JSON.stringify(o.id)}: ${JSON.stringify({
          label: o.label,
          unit: o.unit,
          isPrimary: o.isPrimary,
        })}`,
    )
    .join(",\n");
  return `window.__outcomes = {
${fns}
};
window.__outcomeMeta = {
${meta}
};`;
}

export function assembleGameHtml(
  configCode: string,
  gameCode: string,
  design?: GameDesign,
): string {
  // .replace with a function avoids `$` being treated as a special
  // replacement pattern inside LLM-generated code.
  return skeleton()
    .replace(CONFIG_MARK, () => inert(configCode))
    .replace(EXHIBIT_MARK, () => bakeExhibit(design))
    .replace(GAME_MARK, () => inert(gameCode));
}
