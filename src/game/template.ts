// Game template registry — the "Template Skill".
//
// A template is a frozen HTML skeleton with two LLM-fillable regions:
// CONFIG (numeric tunables) and GAME (the createGame() implementation).
// Everything else — the error-reporting harness, the boot contract, the
// CSP — is ours and never touched by the model.

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
  - Use \`parent: "game"\`, \`type: Phaser.AUTO\`, width 800, height 600, \`scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }\`.
  - Use arcade physics if needed: \`physics: { default: "arcade" }\`.
- GRAPHICS: there are NO image assets and NO network. Build all visuals from Phaser primitives:
  - \`this.add.rectangle / circle / triangle / star\`, \`this.add.text\` (emoji in text objects work well as sprites: "🦅", "🍎"),
  - or generate textures once in create(): \`const g = this.make.graphics(); g.fillStyle(0xff0000); g.fillCircle(16,16,16); g.generateTexture("dot", 32, 32); g.destroy();\`
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

UI/LAYOUT (800x600):
- Title bar at top: 50px tall. Score left, streak center, "Cards: X/Y" right.
- Mascot in upper-left corner of play area, scaled by streak.
- Prompt large in upper-middle, ~y=170.
- Answer choices in a 2x2 grid below, each ~340x70, with rounded corners (use \`this.add.graphics().fillRoundedRect\`).
- Text choices wrapped to fit; fontSize 22px.

STATE MACHINE:
- Use scene data (\`this.data.set/get\`) or simple scene-level vars: deckIndex, streak, score, recordStreak, state ("title"|"playing"|"reveal"|"end").
- Distractors must NOT include the correct answer; shuffle them with the correct each round.

Read every gameplay constant from GAME_CONFIG.`,
};

export const TEMPLATES: GameTemplate[] = [
  PHASER_ARCADE_TEMPLATE,
  FLASHCARD_QUEST_TEMPLATE,
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
  return null;
}

const CONFIG_MARK = "/*{{CONFIG}}*/";
const GAME_MARK = "/*{{GAME}}*/";

function skeleton(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' http: https:; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; font-src data:;">
<style>html,body{margin:0;padding:0;background:#0f0f1a;height:100%;overflow:hidden}#game{width:100%;height:100%}</style>
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

export function assembleGameHtml(configCode: string, gameCode: string): string {
  // .replace with a function avoids `$` being treated as a special
  // replacement pattern inside LLM-generated code.
  return skeleton()
    .replace(CONFIG_MARK, () => inert(configCode))
    .replace(GAME_MARK, () => inert(gameCode));
}
