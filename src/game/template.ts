// Game template registry — the "Template Skill".
//
// A template is a frozen HTML skeleton with two LLM-fillable regions:
// CONFIG (numeric tunables) and GAME (the createGame() implementation).
// Everything else — the error-reporting harness, the boot contract, the
// CSP — is ours and never touched by the model.

import { isFormulaSafe } from "./blueprint-formula";
import type { GameDesign } from "./schema";
import { svgAssetLibrary } from "./svg-assets";

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
- GRAPHICS — USE THE ART LIBRARY FIRST. The harness exposes \`window.__art\` backed by a HIGH-FIDELITY SVG SPRITE LIBRARY (real shading, gradients, shadows — orders of magnitude better than primitives). PREFER these over raw rectangles whenever applicable. Available:
  - Backgrounds: \`__art.background(scene, "sky"|"space"|"sunset"|"dawn"|"underwater"|"jungle"|"lab"|"field", { stars: true, ground: true })\`
  - Decor (SVG sprites): \`__art.sun(s,x,y,r)\`, \`__art.cloud(s,x,y,scale)\`, \`__art.mountains(s,baseY)\` (parallax layered), \`__art.tree(s,x,y,scale)\`, \`__art.field(s,baseY,"grass"|"lab-floor")\`
  - Composed objects (SVG sprites with detailed shading): \`__art.soccerGoal(s,x,y,scale)\`, \`__art.soccerBall(s,x,y,r)\`, \`__art.character(s,x,y,{pose:"kick"|"throw"|"run"|"stand", jersey:0xRRGGBB, scale:1})\`, \`__art.lever(s,x,y,{tilt:0, load:true, effort:true})\`, \`__art.rocket(s,x,y,{flame:true})\` (flame animates automatically), \`__art.beaker(s,x,y,{color:0x0ea5e9})\`
  - Custom topic art: when the library doesn't fit the topic, AUTHOR YOUR OWN SVG and pass it to \`__art.customSvg(scene, "<svg ...>...</svg>", x, y, { scale: 1 })\`. The harness loads it as a sprite. Use this for topic-specific scene elements (a microscope, an atom, an animal).
  - UI: \`__art.titleBar(s)\`, \`__art.ui.button(s,x,y,w,h,label,{color1,color2})\`, \`__art.ui.card(s,x,y,w,h,{border:true})\`, \`__art.ui.slider(s,x,y,w,{min,max,value,accent,onChange})\`
  - FX: \`__art.fx.particleBurst(s,x,y,{count,color})\`, \`__art.fx.glow(s,target,color,intensity)\`
  - POST-PROCESSING: CALL \`__art.fx.postProcess(scene, { vignette: true, bloom: true })\` in create() AFTER all scene objects are added. Produces a cinematic vignette + bloom overlay that makes EVERY scene look polished. Skip only if the topic explicitly needs flat clinical visuals.
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

USE THE ART LIBRARY. The harness exposes \`window.__art\` backed by HIGH-FIDELITY SVG SPRITES (real shading + gradients + drop shadows). DO NOT draw raw rectangles for known scene elements. If a topic-specific element isn't in the library, AUTHOR AN SVG and pass it to \`__art.customSvg(scene, svgString, x, y, { scale })\`. Custom SVGs must be valid XML, viewBox-based, and use only fill/stroke/gradient — no scripts, no external refs. This is the most important rule for visual quality.

REQUIRED POST-PROCESSING: Call \`__art.fx.postProcess(this, { vignette: true, bloom: true })\` at the END of create() — after all your scene elements. It adds a soft bloom + cinematic vignette overlay that makes every exhibit look polished. Non-negotiable.

USE THE FORMULA EVALUATORS. The harness pre-builds formula closures at assembly time and exposes \`window.__outcomes\`. To compute an outcome at slider values:
    const v = { kickPower: 70, kickAngle: 45, spinRate: 5 };
    const goalProb = window.__outcomes.goalProbability(v);
    const meta = window.__outcomeMeta.goalProbability; // { label, unit, isPrimary }
- DO NOT build your own Function() or eval — the harness already did it server-side from the validated formula strings. Just call \`__outcomes[id](values)\`. Guard with Number.isFinite — show "—" if not.

REQUIRED LAYOUT (1280x720, three zones):
- SCENE ZONE (y=56..540) — must LOOK LIKE THE TOPIC, with depth and atmosphere. Backdrop + mid-ground + foreground. Examples (use these as recipes):
  - Soccer kick: \`__art.background(this, "dawn", { ground: true })\` → \`__art.mountains(this, 420)\` (distant) → \`__art.sun(this, 1140, 100, 38)\` → \`__art.cloud(this, 250, 90, 0.8)\` and \`__art.cloud(this, 880, 130, 0.9)\` → \`__art.field(this, 480, "grass")\` → \`__art.soccerGoal(this, 1020, 460, 1.5)\` (the goal goes IN FRONT of the field but BEHIND the player) → \`__art.character(this, 320, 470, { pose: "kick", jersey: 0x1d4ed8, scale: 1.4 })\` (player kicks rightward) → \`__art.soccerBall(this, 360, 510, 20)\` (the ball you'll tween toward the goal). Players should be sized ~280px tall; the goal ~280px tall too.
  - Lever: \`__art.background(this, "lab")\` → \`__art.field(this, 500, "lab-floor")\` → \`__art.beaker(this, 200, 460, { scale: 1.2 })\` (decor) → \`__art.lever(this, 640, 460, { tilt: 0, load: true, effort: true, scale: 2 })\` (centerpiece, animate tilt).
  - Rocket launch: \`__art.background(this, "space", { stars: true })\` → \`__art.mountains(this, 540)\` (silhouette, tint 0x0f172a) → \`__art.rocket(this, 640, 460, { flame: true, scale: 1.8 })\` (animate y upward; flame is auto-animated).
  - Water cycle: \`__art.background(this, "sky")\` → \`__art.mountains(this, 420)\` → \`__art.sun(this, 1100, 110, 44)\` → 3-4 \`__art.cloud(this, ...)\` at varying heights/scales → \`__art.tree(this, x, 500, 1.4)\` × 3 along the foreground.
  - Topic NOT in the recipes (microscope, atom, mitosis cell, ecosystem): use \`__art.customSvg(this, svgString, x, y, {scale})\` with a topic-specific SVG you author inline. Pair it with \`__art.background\` and \`__art.field\` for atmosphere.
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
  // "Simulation Lab" and the explicit "Lab Exhibit" both route to the
  // exhibit template. The old declarative React Simulation Lab is gone.
  if (
    companionType === "Lab Exhibit (experimental)" ||
    companionType === "Simulation Lab"
  )
    return LAB_EXHIBIT_TEMPLATE;
  return null;
}

const CONFIG_MARK = "/*{{CONFIG}}*/";
const GAME_MARK = "/*{{GAME}}*/";
const EXHIBIT_MARK = "/*{{EXHIBIT}}*/";

function skeleton(): string {
  const svgLib = svgAssetLibrary();
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
// __ASSETS__ (frozen — high-fidelity SVG sprite library, bundled as
// data: URIs so the iframe never touches the network. The CSP allows
// img-src data:, so Phaser can load these via textures.addBase64.)
window.__svgAssets = ${JSON.stringify(svgLib)};
// Track per-key state across the whole game: pending vs ready. addBase64
// is asynchronous — the texture is not actually registered until the
// HTMLImageElement decodes. Without this guard, calling sprite("mountain")
// three times in the same frame triggers three addBase64 calls in flight
// before the first completes → "Texture key already in use" on retries.
window.__assetState = window.__assetState || {};
window.__ensureAsset = function (scene, key) {
  var fullKey = "art." + key;
  if (!scene || !scene.textures) return fullKey;
  if (window.__assetState[fullKey] === "ready" || scene.textures.exists(fullKey)) {
    window.__assetState[fullKey] = "ready";
    return fullKey;
  }
  if (window.__assetState[fullKey] === "pending") return fullKey;
  var src = window.__svgAssets[key];
  if (!src) return null;
  window.__assetState[fullKey] = "pending";
  try {
    scene.textures.once("addtexture-" + fullKey, function () {
      window.__assetState[fullKey] = "ready";
    });
    scene.textures.addBase64(fullKey, src);
  } catch (e) {
    // Defensive: another concurrent call already registered. Mark ready
    // and move on rather than letting the error escape.
    window.__assetState[fullKey] = "ready";
  }
  return fullKey;
};
// Preload all SVG assets eagerly when a scene starts so that subsequent
// sprite() calls find them already registered, the first frame paints
// the real textures instead of the placeholder, and there is no
// addBase64 race during gameplay. Templates should call
// \`window.__preloadArtAssets(this)\` from preload() or at the very top
// of create() before any sprite() call.
window.__preloadArtAssets = function (scene) {
  if (!scene || !scene.textures) return;
  var keys = Object.keys(window.__svgAssets);
  for (var i = 0; i < keys.length; i++) {
    window.__ensureAsset(scene, keys[i]);
  }
};
</script>
<script>
// __ART__ v2 (frozen — rich art library shared by every template.
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

  // ---- sun: sprite with optional bonus halo for blooming ----
  function sun(scene, x, y, r) {
    r = r || 32;
    var c = scene.add.container(x, y);
    c.add(scene.add.circle(0, 0, r * 2.4, 0xfff2a8, 0.08));
    c.add(sprite(scene, "sun", 0, 0, { width: r * 2.6, height: r * 2.6 }));
    return c;
  }

  // ---- cloud sprite (multi-layer SVG with depth + highlight) ----
  function cloud(scene, x, y, scale) {
    return sprite(scene, "cloud", x, y, { scale: scale || 1 });
  }

  // ---- mountain range: parallax of layered detailed SVG mountains ----
  function mountains(scene, baseY, opts) {
    opts = opts || {};
    var c = scene.add.container(0, 0);
    var w = scene.scale.width;
    // Back layer (muted, distant)
    var back = sprite(scene, "mountain", w * 0.5, baseY, {
      originY: 1, width: w * 1.1, alpha: 0.65, tint: 0x64748b
    });
    c.add(back);
    // Front layer (vivid, closer)
    var frontL = sprite(scene, "mountain", w * 0.3, baseY + 10, {
      originY: 1, width: w * 0.7
    });
    c.add(frontL);
    var frontR = sprite(scene, "mountain", w * 0.75, baseY + 14, {
      originY: 1, width: w * 0.65
    });
    c.add(frontR);
    return c;
  }

  // ---- tree sprite (detailed leaf clusters + shading) ----
  function tree(scene, x, y, scale) {
    return sprite(scene, "tree", x, y, { scale: scale || 1, originY: 1 });
  }

  // ---- sprite-backed helpers — render the bundled SVG asset library at
  // texture quality. The first call for any key registers the texture
  // via __ensureAsset(); subsequent calls just grab it from the cache.
  function sprite(scene, key, x, y, opts) {
    opts = opts || {};
    var k = window.__ensureAsset(scene, key);
    if (!k) return scene.add.container(x, y);
    var img = scene.add.image(x, y, k);
    img.setOrigin(opts.originX == null ? 0.5 : opts.originX, opts.originY == null ? 0.5 : opts.originY);
    if (opts.scale) img.setScale(opts.scale);
    else if (opts.width) img.setDisplaySize(opts.width, opts.height || opts.width);
    if (opts.alpha != null) img.setAlpha(opts.alpha);
    if (opts.tint != null) img.setTint(opts.tint);
    return img;
  }

  // Goal / ball / player: detailed SVG sprites with gradients + shadows.
  function soccerGoal(scene, x, y, scale) {
    return sprite(scene, "soccer_goal", x, y, { scale: (scale || 1) * 1.2 });
  }
  function soccerBall(scene, x, y, r) {
    return sprite(scene, "soccer_ball", x, y, { width: (r || 12) * 2.5, height: (r || 12) * 2.5 });
  }
  function character(scene, x, y, opts) {
    opts = opts || {};
    // pose is reflected by flipping/scaling for now; jersey color via tint
    var s = opts.scale || 1;
    var spr = sprite(scene, "soccer_player", x, y, { scale: s });
    if (opts.pose === "kick") {
      // pre-rendered kick pose is the default; nothing to do
    } else if (opts.pose === "throw") {
      spr.setFlipX(true);
    }
    if (opts.jersey != null) {
      // tint preserves shading via multiply
      var hex = typeof opts.jersey === "number" ? opts.jersey : 0xffffff;
      spr.setTint(hex);
    }
    return spr;
  }

  // ---- lever sprite (wood beam + steel fulcrum + tilt-aware container) ----
  function lever(scene, x, y, opts) {
    opts = opts || {};
    var s = opts.scale || 1;
    var c = scene.add.container(x, y);
    var leverSpr = sprite(scene, "lever", 0, 0, { scale: s });
    if (opts.tilt) leverSpr.setRotation(opts.tilt);
    c.add(leverSpr);
    if (opts.load) {
      var lx = Math.cos(opts.tilt || 0) * -120 * s;
      var ly = Math.sin(opts.tilt || 0) * -120 * s - 20 * s;
      var box = scene.add.rectangle(lx, ly, 36 * s, 28 * s, 0x78350f);
      box.setStrokeStyle(2 * s, 0x451a03);
      c.add(box);
      c.add(scene.add.rectangle(lx, ly - 12 * s, 36 * s, 4 * s, 0xfbbf24, 0.4));
    }
    if (opts.effort) {
      var ex = Math.cos(opts.tilt || 0) * 120 * s;
      var ey = Math.sin(opts.tilt || 0) * 120 * s - 8 * s;
      var arrow = scene.add.graphics();
      arrow.fillStyle(0xef4444, 1);
      arrow.fillTriangle(ex - 10 * s, ey - 30 * s, ex + 10 * s, ey - 30 * s, ex, ey - 10 * s);
      arrow.fillRoundedRect(ex - 5 * s, ey - 60 * s, 10 * s, 30 * s, 3 * s);
      arrow.fillStyle(0xffffff, 0.4);
      arrow.fillRoundedRect(ex - 3 * s, ey - 58 * s, 3 * s, 26 * s, 1.5 * s);
      c.add(arrow);
    }
    return c;
  }

  // ---- rocket sprite (with optional animated flame) ----
  function rocket(scene, x, y, opts) {
    opts = opts || {};
    var s = opts.scale || 1;
    var c = scene.add.container(x, y);
    var body = sprite(scene, "rocket", 0, 0, { scale: s });
    c.add(body);
    if (opts.flame) {
      var flame = sprite(scene, "rocket_flame", 0, 100 * s, { scale: s });
      c.add(flame);
      scene.tweens.add({
        targets: flame,
        scaleY: s * 1.15,
        scaleX: s * 0.92,
        alpha: 0.85,
        duration: 90,
        yoyo: true,
        repeat: -1
      });
    }
    return c;
  }

  // ---- beaker sprite (glass + liquid + measurement marks) ----
  function beaker(scene, x, y, opts) {
    opts = opts || {};
    var s = opts.scale || 1;
    var c = scene.add.container(x, y);
    var spr = sprite(scene, "beaker", 0, 0, { scale: s });
    if (opts.color != null) spr.setTint(opts.color);
    c.add(spr);
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

  // ---- custom SVG (Builder escape hatch for topic-specific art).
  // The Builder can author its own SVG string and drop it into the scene
  // at sprite quality. The harness loads it via addBase64 — the iframe
  // never touches new Function or eval to do this.
  var customSvgCount = 0;
  function customSvg(scene, svgText, x, y, opts) {
    opts = opts || {};
    var key = "art.custom." + (++customSvgCount);
    if (!scene.textures.exists(key)) {
      var b64;
      try {
        b64 = window.btoa(unescape(encodeURIComponent(String(svgText))));
      } catch (e) { return scene.add.container(x, y); }
      scene.textures.addBase64(key, "data:image/svg+xml;base64," + b64);
    }
    var img = scene.add.image(x, y, key);
    img.setOrigin(opts.originX == null ? 0.5 : opts.originX, opts.originY == null ? 0.5 : opts.originY);
    if (opts.scale) img.setScale(opts.scale);
    else if (opts.width) img.setDisplaySize(opts.width, opts.height || opts.width);
    if (opts.alpha != null) img.setAlpha(opts.alpha);
    return img;
  }

  // ---- post-processing: vignette + soft bloom over the camera.
  // Cheap to compute, but dramatically lifts perceived quality.
  function vignette(scene, opts) {
    opts = opts || {};
    var w = scene.scale.width, h = scene.scale.height;
    var v = scene.add.graphics().setDepth(950).setScrollFactor(0);
    var inner = Math.min(w, h) * 0.6;
    var outer = Math.sqrt(w * w + h * h) * 0.7;
    for (var r = inner; r < outer; r += 24) {
      var a = ((r - inner) / (outer - inner)) * (opts.intensity || 0.55);
      v.fillStyle(0x000000, Math.min(0.05, a * 0.05));
      v.fillRect(0, 0, w, h);
    }
    var corners = scene.add.graphics().setDepth(951).setScrollFactor(0);
    corners.fillStyle(0x000000, 0.55);
    corners.fillRect(0, 0, w, h);
    corners.fillStyle(0x000000, 0);
    corners.fillRect(40, 40, w - 80, h - 80);
    corners.setBlendMode(Phaser.BlendModes.MULTIPLY);
    return v;
  }
  function filmGrain(scene) {
    var w = scene.scale.width, h = scene.scale.height;
    var g = scene.add.graphics().setDepth(949).setScrollFactor(0).setAlpha(0.05);
    for (var i = 0; i < 800; i++) {
      g.fillStyle(0xffffff, 0.3);
      g.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }
    return g;
  }
  function bloomCanvas(scene) {
    // Bloom-lite: a soft white radial overlay at the top of the scene
    // simulating atmospheric light scatter.
    var w = scene.scale.width, h = scene.scale.height;
    var b = scene.add.graphics().setDepth(948).setScrollFactor(0);
    b.fillStyle(0xffffff, 0.12);
    b.fillEllipse(w * 0.5, h * 0.15, w * 1.2, h * 0.5);
    return b;
  }
  function postProcess(scene, opts) {
    opts = opts || {};
    var layers = scene.add.container(0, 0).setDepth(945).setScrollFactor(0);
    if (opts.bloom !== false) bloomCanvas(scene);
    if (opts.grain) filmGrain(scene);
    if (opts.vignette !== false) vignette(scene, { intensity: opts.intensity });
    return layers;
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
    sprite: sprite,
    customSvg: customSvg,
    assets: function () { return Object.keys(window.__svgAssets); },
    ui: {
      button: uiButton,
      card: uiCard,
      slider: uiSlider
    },
    fx: {
      particleBurst: particleBurst,
      glow: glow,
      vignette: vignette,
      filmGrain: filmGrain,
      bloom: bloomCanvas,
      postProcess: postProcess
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
    // Hook into the first scene's boot to preload the SVG library before
    // any user code runs. This guarantees __ensureAsset never races
    // even if the Builder forgets to call __preloadArtAssets explicitly.
    var g = window.__game;
    if (g && g.scene && g.scene.scenes) {
      g.events.once("ready", function () {
        try {
          for (var i = 0; i < g.scene.scenes.length; i++) {
            var s = g.scene.scenes[i];
            if (s && s.textures) window.__preloadArtAssets(s);
          }
        } catch (e) { /* eat — assets will fall back to lazy ensure */ }
      });
    }
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
