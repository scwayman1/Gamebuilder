// High-fidelity SVG sprites embedded in the harness as data URIs. Phaser
// loads them via textures.addBase64 and draws them as Image objects with
// real shading, gradients, and detail — orders of magnitude better than
// what flat Phaser primitives can produce, still zero-asset (img-src
// data: is allowed by the sandbox CSP).
//
// Each export is a function returning a clean SVG string. We keep them
// as functions (not constants) so we can vary palette/pose at call time
// without copying strings.

export type SvgPalette = {
  jersey?: string;
  pants?: string;
  skin?: string;
  hair?: string;
};

export function soccerGoalSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180">
  <defs>
    <linearGradient id="gframe" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.55" stop-color="#f1f5f9"/>
      <stop offset="1" stop-color="#cbd5e1"/>
    </linearGradient>
    <pattern id="gnet" patternUnits="userSpaceOnUse" width="10" height="10">
      <path d="M0 0L10 10M10 0L0 10" stroke="#475569" stroke-width="0.6" stroke-opacity="0.5"/>
    </pattern>
    <filter id="gshadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
      <feOffset dx="0" dy="4" result="off"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.6"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <ellipse cx="120" cy="158" rx="110" ry="7" fill="#000" opacity="0.28"/>
  <path d="M30 38 L18 56 L18 142 L30 142 Z" fill="#94a3b8"/>
  <path d="M210 38 L222 56 L222 142 L210 142 Z" fill="#94a3b8"/>
  <rect x="30" y="38" width="180" height="104" fill="#ffffff" opacity="0.35"/>
  <rect x="30" y="38" width="180" height="104" fill="url(#gnet)"/>
  <path d="M30 38 L18 56 L210 56 L222 56 L222 56 Z M30 38 L210 38 L222 56" fill="none" stroke="#cbd5e1" stroke-width="2" opacity="0.7"/>
  <rect x="30" y="38" width="180" height="104" fill="none" stroke="url(#gframe)" stroke-width="8" filter="url(#gshadow)"/>
  <line x1="33" y1="42" x2="33" y2="138" stroke="#ffffff" stroke-width="2" opacity="0.85"/>
  <line x1="33" y1="42" x2="207" y2="42" stroke="#ffffff" stroke-width="2" opacity="0.85"/>
  <circle cx="30" cy="142" r="3" fill="#e2e8f0"/>
  <circle cx="210" cy="142" r="3" fill="#e2e8f0"/>
</svg>`;
}

export function soccerBallSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">
  <defs>
    <radialGradient id="bball" cx="35%" cy="30%" r="65%">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.6" stop-color="#f8fafc"/>
      <stop offset="1" stop-color="#94a3b8"/>
    </radialGradient>
    <filter id="bsh" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
      <feOffset dx="0" dy="3" result="o"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.4"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <ellipse cx="30" cy="54" rx="22" ry="3" fill="#000" opacity="0.3"/>
  <circle cx="30" cy="30" r="24" fill="url(#bball)" stroke="#cbd5e1" stroke-width="1" filter="url(#bsh)"/>
  <polygon points="30,18 38,22 36,32 24,32 22,22" fill="#1e293b"/>
  <polygon points="14,28 22,22 24,32 18,40" fill="#1e293b"/>
  <polygon points="46,28 38,22 36,32 42,40" fill="#1e293b"/>
  <polygon points="22,44 36,44 38,38 30,34 22,38" fill="#1e293b"/>
  <ellipse cx="22" cy="22" rx="6" ry="4" fill="#ffffff" opacity="0.55"/>
</svg>`;
}

export function soccerPlayerSvg(palette?: SvgPalette): string {
  const j = palette?.jersey ?? "#1d4ed8";
  const p = palette?.pants ?? "#0f172a";
  const sk = palette?.skin ?? "#fbbf24";
  const hr = palette?.hair ?? "#1e293b";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 180">
  <defs>
    <linearGradient id="pj" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${j}" stop-opacity="1"/>
      <stop offset="1" stop-color="${shade(j, -0.25)}" stop-opacity="1"/>
    </linearGradient>
    <linearGradient id="pp" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${p}" stop-opacity="1"/>
      <stop offset="1" stop-color="${shade(p, -0.2)}" stop-opacity="1"/>
    </linearGradient>
    <filter id="psh"><feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/><feOffset dy="3" result="o"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <ellipse cx="60" cy="170" rx="40" ry="5" fill="#000" opacity="0.3"/>
  <g filter="url(#psh)">
    <rect x="80" y="92" width="34" height="13" rx="4" fill="url(#pp)" transform="rotate(-32 88 95)"/>
    <ellipse cx="111" cy="80" rx="11" ry="6" fill="#0f172a"/>
    <rect x="50" y="98" width="14" height="38" rx="4" fill="url(#pp)"/>
    <rect x="64" y="98" width="14" height="42" rx="4" fill="url(#pp)" transform="rotate(8 71 119)"/>
    <ellipse cx="55" cy="140" rx="11" ry="5" fill="#0f172a"/>
  </g>
  <rect x="36" y="52" width="46" height="54" rx="9" fill="url(#pj)"/>
  <rect x="36" y="52" width="46" height="6" fill="#ffffff" opacity="0.3"/>
  <text x="59" y="84" font-family="system-ui, sans-serif" font-size="20" font-weight="800" fill="#ffffff" text-anchor="middle" opacity="0.85">9</text>
  <rect x="26" y="56" width="14" height="38" rx="4" fill="url(#pj)" transform="rotate(-8 33 75)"/>
  <rect x="78" y="56" width="14" height="38" rx="4" fill="url(#pj)" transform="rotate(8 85 75)"/>
  <circle cx="28" cy="92" r="7" fill="${sk}"/>
  <circle cx="92" cy="92" r="7" fill="${sk}"/>
  <circle cx="59" cy="36" r="18" fill="${sk}"/>
  <path d="M41 32 Q59 12 78 32 Q78 22 70 18 Q59 12 47 18 Q41 22 41 32 Z" fill="${hr}"/>
  <ellipse cx="52" cy="38" rx="2.2" ry="2.6" fill="#0f172a"/>
  <ellipse cx="66" cy="38" rx="2.2" ry="2.6" fill="#0f172a"/>
  <ellipse cx="51.5" cy="37" rx="0.8" ry="1" fill="#ffffff"/>
  <ellipse cx="65.5" cy="37" rx="0.8" ry="1" fill="#ffffff"/>
  <path d="M52 47 Q59 51 66 47" stroke="#b91c1c" stroke-width="2" fill="none" stroke-linecap="round"/>
  <ellipse cx="60" cy="55" rx="22" ry="4" fill="#000" opacity="0.18"/>
</svg>`;
}

export function sunSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <defs>
    <radialGradient id="sunCore" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#fff7e6"/>
      <stop offset="0.5" stop-color="#fde047"/>
      <stop offset="1" stop-color="#f59e0b"/>
    </radialGradient>
    <radialGradient id="sunHalo" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#fde047" stop-opacity="0.5"/>
      <stop offset="0.5" stop-color="#fde047" stop-opacity="0.2"/>
      <stop offset="1" stop-color="#fde047" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="80" cy="80" r="70" fill="url(#sunHalo)"/>
  <circle cx="80" cy="80" r="46" fill="url(#sunHalo)" opacity="0.7"/>
  <circle cx="80" cy="80" r="34" fill="url(#sunCore)"/>
  <circle cx="68" cy="68" r="14" fill="#fff7e6" opacity="0.6"/>
  <circle cx="65" cy="64" r="6" fill="#ffffff" opacity="0.85"/>
</svg>`;
}

export function cloudSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 100">
  <defs>
    <linearGradient id="cl" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#e2e8f0"/>
    </linearGradient>
    <filter id="csh"><feGaussianBlur in="SourceAlpha" stdDeviation="2"/><feOffset dy="4" result="o"/><feComponentTransfer><feFuncA type="linear" slope="0.35"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <g filter="url(#csh)">
    <ellipse cx="40" cy="62" rx="28" ry="22" fill="url(#cl)"/>
    <ellipse cx="78" cy="50" rx="36" ry="30" fill="url(#cl)"/>
    <ellipse cx="120" cy="56" rx="32" ry="26" fill="url(#cl)"/>
    <ellipse cx="148" cy="66" rx="24" ry="20" fill="url(#cl)"/>
  </g>
  <ellipse cx="68" cy="38" rx="22" ry="6" fill="#ffffff" opacity="0.85"/>
  <ellipse cx="120" cy="44" rx="18" ry="5" fill="#ffffff" opacity="0.6"/>
</svg>`;
}

export function mountainSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">
  <defs>
    <linearGradient id="mB" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#475569"/>
      <stop offset="1" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="mF" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#64748b"/>
      <stop offset="1" stop-color="#334155"/>
    </linearGradient>
  </defs>
  <polygon points="0,200 60,80 120,200" fill="url(#mB)"/>
  <polygon points="60,80 80,108 120,200 60,200" fill="#1e293b" opacity="0.7"/>
  <polygon points="60,80 48,108 72,108" fill="#ffffff"/>
  <polygon points="100,200 180,40 260,200" fill="url(#mF)"/>
  <polygon points="180,40 200,80 260,200 180,200" fill="#1e293b" opacity="0.55"/>
  <polygon points="180,40 160,82 200,82" fill="#ffffff"/>
  <polygon points="170,82 180,98 190,82" fill="#e2e8f0"/>
  <polygon points="220,200 280,120 320,200" fill="url(#mB)" opacity="0.8"/>
  <polygon points="280,120 296,144 320,200 280,200" fill="#1e293b" opacity="0.5"/>
</svg>`;
}

export function rocketSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 220">
  <defs>
    <linearGradient id="rB" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#f1f5f9"/>
      <stop offset="0.5" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#94a3b8"/>
    </linearGradient>
    <linearGradient id="rN" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fb7185"/>
      <stop offset="1" stop-color="#be123c"/>
    </linearGradient>
    <radialGradient id="rW" cx="40%" cy="35%" r="60%">
      <stop offset="0" stop-color="#fef9c3"/>
      <stop offset="0.4" stop-color="#facc15"/>
      <stop offset="0.8" stop-color="#fb923c"/>
      <stop offset="1" stop-color="#ea580c" stop-opacity="0.4"/>
    </radialGradient>
    <radialGradient id="rWin" cx="40%" cy="35%" r="55%">
      <stop offset="0" stop-color="#e0f2fe"/>
      <stop offset="0.7" stop-color="#0ea5e9"/>
      <stop offset="1" stop-color="#0c4a6e"/>
    </radialGradient>
  </defs>
  <ellipse cx="60" cy="206" rx="34" ry="6" fill="#000" opacity="0.3"/>
  <path d="M30 70 Q60 4 90 70" fill="url(#rN)"/>
  <path d="M58 12 Q60 6 62 12 L62 70 L58 70 Z" fill="#ffffff" opacity="0.5"/>
  <rect x="30" y="68" width="60" height="120" rx="6" fill="url(#rB)"/>
  <rect x="34" y="72" width="6" height="116" fill="#cbd5e1" opacity="0.5"/>
  <rect x="80" y="72" width="6" height="116" fill="#475569" opacity="0.4"/>
  <line x1="30" y1="110" x2="90" y2="110" stroke="#475569" stroke-width="1.5"/>
  <line x1="30" y1="150" x2="90" y2="150" stroke="#475569" stroke-width="1.5"/>
  <circle cx="60" cy="100" r="13" fill="#0c4a6e"/>
  <circle cx="60" cy="100" r="11" fill="url(#rWin)"/>
  <circle cx="56" cy="96" r="3" fill="#ffffff" opacity="0.8"/>
  <path d="M14 188 L30 140 L30 188 Z" fill="url(#rN)"/>
  <path d="M14 188 L30 188 L24 200 Z" fill="#7f1d1d"/>
  <path d="M106 188 L90 140 L90 188 Z" fill="url(#rN)"/>
  <path d="M106 188 L90 188 L96 200 Z" fill="#7f1d1d"/>
  <ellipse cx="60" cy="188" rx="18" ry="6" fill="#1e293b"/>
</svg>`;
}

export function rocketFlameSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 140">
  <defs>
    <radialGradient id="fl" cx="50%" cy="30%" r="60%">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.25" stop-color="#fef3c7"/>
      <stop offset="0.55" stop-color="#fbbf24"/>
      <stop offset="0.85" stop-color="#ea580c"/>
      <stop offset="1" stop-color="#ea580c" stop-opacity="0.2"/>
    </radialGradient>
  </defs>
  <path d="M22 0 Q40 -8 58 0 Q66 32 56 60 Q40 130 40 130 Q40 130 24 60 Q14 32 22 0 Z" fill="url(#fl)"/>
  <path d="M30 6 Q40 0 50 6 Q54 28 48 50 Q40 100 40 100 Q40 100 32 50 Q26 28 30 6 Z" fill="#fef9c3" opacity="0.8"/>
</svg>`;
}

export function leverSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 160">
  <defs>
    <linearGradient id="lwood" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b45309"/>
      <stop offset="0.4" stop-color="#92400e"/>
      <stop offset="1" stop-color="#451a03"/>
    </linearGradient>
    <linearGradient id="lfulc" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#94a3b8"/>
      <stop offset="1" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <ellipse cx="160" cy="148" rx="120" ry="6" fill="#000" opacity="0.25"/>
  <polygon points="120,148 200,148 160,80" fill="url(#lfulc)"/>
  <polygon points="160,80 200,148 180,148" fill="#0f172a" opacity="0.4"/>
  <rect x="40" y="74" width="240" height="14" rx="4" fill="url(#lwood)"/>
  <rect x="40" y="74" width="240" height="3" fill="#fbbf24" opacity="0.4"/>
  <line x1="40" y1="82" x2="280" y2="82" stroke="#451a03" stroke-width="0.5" opacity="0.6"/>
  <line x1="80" y1="74" x2="80" y2="88" stroke="#451a03" stroke-width="0.5" opacity="0.4"/>
  <line x1="160" y1="74" x2="160" y2="88" stroke="#451a03" stroke-width="0.5" opacity="0.4"/>
  <line x1="240" y1="74" x2="240" y2="88" stroke="#451a03" stroke-width="0.5" opacity="0.4"/>
</svg>`;
}

export function beakerSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140">
  <defs>
    <linearGradient id="bk" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.2"/>
      <stop offset="0.3" stop-color="#ffffff" stop-opacity="0.05"/>
      <stop offset="0.7" stop-color="#ffffff" stop-opacity="0.05"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.25"/>
    </linearGradient>
    <linearGradient id="liq" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#22d3ee"/>
      <stop offset="1" stop-color="#0e7490"/>
    </linearGradient>
  </defs>
  <ellipse cx="50" cy="132" rx="38" ry="5" fill="#000" opacity="0.3"/>
  <rect x="20" y="20" width="60" height="108" rx="6" fill="url(#bk)" stroke="#94a3b8" stroke-width="2"/>
  <rect x="24" y="54" width="52" height="70" rx="3" fill="url(#liq)"/>
  <ellipse cx="50" cy="54" rx="26" ry="3" fill="#a5f3fc" opacity="0.8"/>
  <rect x="14" y="18" width="72" height="6" rx="3" fill="#94a3b8"/>
  <rect x="14" y="18" width="72" height="2" rx="1" fill="#cbd5e1"/>
  <rect x="26" y="40" width="3" height="80" fill="#ffffff" opacity="0.4"/>
  <line x1="78" y1="36" x2="86" y2="36" stroke="#94a3b8" stroke-width="1"/>
  <line x1="78" y1="60" x2="86" y2="60" stroke="#94a3b8" stroke-width="1"/>
  <line x1="78" y1="84" x2="86" y2="84" stroke="#94a3b8" stroke-width="1"/>
  <line x1="78" y1="108" x2="86" y2="108" stroke="#94a3b8" stroke-width="1"/>
</svg>`;
}

export function treeSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <linearGradient id="trunk" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#78350f"/>
      <stop offset="0.5" stop-color="#92400e"/>
      <stop offset="1" stop-color="#451a03"/>
    </linearGradient>
    <radialGradient id="leaf" cx="35%" cy="35%" r="65%">
      <stop offset="0" stop-color="#86efac"/>
      <stop offset="0.5" stop-color="#22c55e"/>
      <stop offset="1" stop-color="#14532d"/>
    </radialGradient>
  </defs>
  <ellipse cx="60" cy="152" rx="42" ry="6" fill="#000" opacity="0.3"/>
  <rect x="52" y="90" width="16" height="64" rx="3" fill="url(#trunk)"/>
  <line x1="56" y1="100" x2="56" y2="150" stroke="#451a03" stroke-width="1" opacity="0.6"/>
  <line x1="64" y1="100" x2="64" y2="150" stroke="#451a03" stroke-width="1" opacity="0.4"/>
  <ellipse cx="60" cy="64" rx="46" ry="38" fill="url(#leaf)"/>
  <ellipse cx="40" cy="56" rx="22" ry="20" fill="url(#leaf)"/>
  <ellipse cx="80" cy="58" rx="22" ry="22" fill="url(#leaf)"/>
  <ellipse cx="60" cy="40" rx="28" ry="22" fill="url(#leaf)"/>
  <ellipse cx="48" cy="52" rx="10" ry="6" fill="#bbf7d0" opacity="0.7"/>
  <ellipse cx="72" cy="56" rx="8" ry="5" fill="#bbf7d0" opacity="0.6"/>
</svg>`;
}

// Tiny color tweaker for procedural shading of customizable assets.
function shade(hex: string, amount: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const n = Number.parseInt(hex.slice(1), 16);
  const r = Math.max(
    0,
    Math.min(255, ((n >> 16) & 0xff) + Math.round(amount * 255)),
  );
  const g = Math.max(
    0,
    Math.min(255, ((n >> 8) & 0xff) + Math.round(amount * 255)),
  );
  const b = Math.max(0, Math.min(255, (n & 0xff) + Math.round(amount * 255)));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

// Base64 encoder that works on Node and browsers (template assembly
// happens on the server). For multi-byte chars in SVGs we need
// Buffer-based encoding on Node, btoa on browsers.
export function svgToDataUri(svg: string): string {
  const b64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(svg, "utf8").toString("base64")
      : ((globalThis as { btoa?: (s: string) => string }).btoa?.(
          unescape(encodeURIComponent(svg)),
        ) ?? "");
  return `data:image/svg+xml;base64,${b64}`;
}

// Library bundled into the harness. Keep this list curated.
export function svgAssetLibrary(): Record<string, string> {
  return {
    soccer_goal: svgToDataUri(soccerGoalSvg()),
    soccer_ball: svgToDataUri(soccerBallSvg()),
    soccer_player: svgToDataUri(soccerPlayerSvg()),
    sun: svgToDataUri(sunSvg()),
    cloud: svgToDataUri(cloudSvg()),
    mountain: svgToDataUri(mountainSvg()),
    rocket: svgToDataUri(rocketSvg()),
    rocket_flame: svgToDataUri(rocketFlameSvg()),
    lever: svgToDataUri(leverSvg()),
    beaker: svgToDataUri(beakerSvg()),
    tree: svgToDataUri(treeSvg()),
  };
}
