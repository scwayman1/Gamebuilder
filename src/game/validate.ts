// Static validation gate for LLM-generated game code — the cheap half of
// the "Debug Skill". Runs server-side before the code ever reaches a
// browser. Catches syntax errors, banned APIs, and contract violations.

import type { GameCode, GameDesign } from "./schema";

const BANNED_PATTERNS: Array<{ re: RegExp; why: string }> = [
  { re: /\bfetch\s*\(/, why: "network access (fetch) is forbidden" },
  { re: /\bXMLHttpRequest\b/, why: "network access (XHR) is forbidden" },
  { re: /\bWebSocket\b/, why: "network access (WebSocket) is forbidden" },
  { re: /\blocalStorage\b/, why: "storage access is forbidden" },
  { re: /\bsessionStorage\b/, why: "storage access is forbidden" },
  { re: /\bindexedDB\b/, why: "storage access is forbidden" },
  { re: /document\s*\.\s*cookie/, why: "cookie access is forbidden" },
  { re: /\beval\s*\(/, why: "eval is forbidden" },
  { re: /\bnew\s+Function\b/, why: "Function constructor is forbidden" },
  { re: /\bimport\s*[("']/, why: "imports are forbidden (Phaser is global)" },
  { re: /\brequire\s*\(/, why: "require is forbidden" },
  { re: /\bparent\s*\./, why: "touching the parent frame is forbidden" },
  { re: /\btop\s*\./, why: "touching the top frame is forbidden" },
  { re: /\bopener\b/, why: "window.opener is forbidden" },
  { re: /document\s*\.\s*write/, why: "document.write is forbidden" },
  {
    re: /\bthis\s*\.\s*load\s*\.\s*(image|audio|spritesheet|atlas|video)\b/,
    why: "loading external assets is forbidden — generate textures from graphics primitives instead",
  },
  { re: /https?:\/\//, why: "URLs are forbidden — no external resources" },
];

const MAX_BLOCK_BYTES = 80_000;

export function validateGameCode(code: GameCode, design: GameDesign): string[] {
  const problems: string[] = [];

  for (const [label, block] of [
    ["configCode", code.configCode],
    ["gameCode", code.gameCode],
  ] as const) {
    if (block.length > MAX_BLOCK_BYTES) {
      problems.push(
        `${label} is ${block.length} bytes — exceeds the ${MAX_BLOCK_BYTES} byte cap. Trim it.`,
      );
    }
    for (const { re, why } of BANNED_PATTERNS) {
      const m = block.match(re);
      if (m) {
        problems.push(`${label}: ${why} (found "${m[0]}")`);
      }
    }
    // Syntax check: Function() compiles without executing. The code
    // references browser globals (Phaser, window) but compilation doesn't
    // evaluate them. This runs server-side on trusted infrastructure
    // against code that will only ever execute inside a sandboxed iframe.
    try {
      // eslint-disable-next-line no-new-func
      new Function(block);
    } catch (e) {
      problems.push(
        `${label} has a syntax error: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  // Contract checks.
  if (!/const\s+GAME_CONFIG\s*=/.test(code.configCode)) {
    problems.push(
      "configCode must define `const GAME_CONFIG = {...}` — not found.",
    );
  }
  for (const spec of design.configSpec) {
    if (!new RegExp(`\\b${spec.key}\\b`).test(code.configCode)) {
      problems.push(
        `configCode is missing the configSpec key "${spec.key}" from the design.`,
      );
    }
  }
  if (!/function\s+createGame\s*\(/.test(code.gameCode)) {
    problems.push("gameCode must define `function createGame()` — not found.");
  }
  if (!/new\s+Phaser\s*\.\s*Game\b/.test(code.gameCode)) {
    problems.push(
      "gameCode must construct `new Phaser.Game({...})` inside createGame().",
    );
  }
  if (!/GAME_CONFIG/.test(code.gameCode)) {
    problems.push(
      "gameCode never reads GAME_CONFIG — gameplay constants must come from the config block.",
    );
  }

  return problems;
}
