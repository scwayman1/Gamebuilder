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
- FORBIDDEN: fetch, XMLHttpRequest, WebSocket, localStorage, sessionStorage, indexedDB, document.cookie, eval, new Function, import, parent, top, opener, location, document.write.
- Keep gameCode under ~350 lines. One scene class (or inline scene object) is plenty.`,
};

export const TEMPLATES: GameTemplate[] = [PHASER_ARCADE_TEMPLATE];

export function getTemplate(id: string): GameTemplate | null {
  return TEMPLATES.find((t) => t.id === id) ?? null;
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
