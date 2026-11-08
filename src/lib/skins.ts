/** Worm skins: a pattern + colors. Drawn as glossy round segments. */
export type Pattern = "solid" | "stripes" | "bands" | "spots";
export type Skin = { id: string; name: string; colors: string[]; pattern: Pattern; outline: string; glow: string };

export const SKINS: Skin[] = [
  { id: "emerald", name: "Emerald", colors: ["#2ee68a", "#1fb86c"], pattern: "spots", outline: "#0b4a2b", glow: "#4dffa6" },
  { id: "tiger", name: "Tiger", colors: ["#ff8a1f", "#1b1b1b"], pattern: "stripes", outline: "#4a2100", glow: "#ffae5c" },
  { id: "candy", name: "Candy", colors: ["#ff5fa8", "#ffffff"], pattern: "stripes", outline: "#7a1446", glow: "#ff8cc4" },
  { id: "rainbow", name: "Rainbow", colors: ["#ff3b3b", "#ff9a1f", "#ffe11f", "#3bdb4a", "#2fa8ff", "#8b5bff"], pattern: "bands", outline: "#2a1a4a", glow: "#ffffff" },
  { id: "neon", name: "Neon", colors: ["#19f0ff", "#ff2bd6"], pattern: "bands", outline: "#14093a", glow: "#7bf6ff" },
  { id: "bee", name: "Bumble", colors: ["#ffd21f", "#222222"], pattern: "bands", outline: "#3d2f00", glow: "#ffe36b" },
  { id: "galaxy", name: "Galaxy", colors: ["#5b2bff", "#c13bff", "#2b7bff"], pattern: "bands", outline: "#12073a", glow: "#a77bff" },
  { id: "lava", name: "Lava", colors: ["#ff2e1f", "#ff8a1f", "#ffd21f"], pattern: "stripes", outline: "#4a0700", glow: "#ff6a3b" },
  { id: "ice", name: "Frost", colors: ["#e8f8ff", "#7fd3ff"], pattern: "spots", outline: "#1d4a6a", glow: "#bff0ff" },
  { id: "algeria", name: "Algeria", colors: ["#1f9e4a", "#ffffff", "#e8202a"], pattern: "bands", outline: "#0b3a1b", glow: "#ffffff" },
];

export const skinById = (id: string | null) => SKINS.find((s) => s.id === id) ?? SKINS[0]!;
export const randomSkin = () => SKINS[Math.floor(Math.random() * SKINS.length)]!;

/** Color of segment i (0 = head). Stripes are thin, bands are thick. */
export function segColor(s: Skin, i: number): string {
  const c = s.colors;
  switch (s.pattern) {
    case "solid":
      return c[0]!;
    case "stripes":
      return c[Math.floor(i / 3) % c.length]!;
    case "bands":
      return c[Math.floor(i / 5) % c.length]!;
    case "spots":
      return i % 7 === 3 ? c[1]! : c[0]!;
  }
}

/**
 * Shaded segment sprites: a 3D ball (radial gradient, dark rim, specular dot)
 * baked once per color + size bucket, then blitted. Gradients per frame would
 * be far too expensive with 20 worms on screen.
 */
const segCache = new Map<string, HTMLCanvasElement>();
function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)));
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}
function segSprite(color: string, outline: string, r: number) {
  const px = Math.max(8, Math.ceil(r * 2.5) & ~3); // 4px buckets
  const key = color + outline + px;
  let cv = segCache.get(key);
  if (cv) return cv;
  cv = document.createElement("canvas");
  cv.width = cv.height = px;
  const g = cv.getContext("2d");
  if (!g) return cv;
  const c = px / 2,
    rr = px / 2 - 1;
  g.fillStyle = outline;
  g.beginPath();
  g.arc(c, c, rr, 0, Math.PI * 2);
  g.fill();
  const gr = g.createRadialGradient(c - rr * 0.25, c - rr * 0.38, rr * 0.05, c + rr * 0.12, c + rr * 0.25, rr);
  gr.addColorStop(0, shade(color, 0.55));
  gr.addColorStop(0.35, shade(color, 0.15));
  gr.addColorStop(0.65, color);
  gr.addColorStop(1, shade(color, -0.48));
  g.fillStyle = gr;
  g.beginPath();
  g.arc(c, c, rr * 0.9, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(255,255,255,0.38)";
  g.beginPath();
  g.ellipse(c - rr * 0.32, c - rr * 0.4, rr * 0.26, rr * 0.16, -0.6, 0, Math.PI * 2);
  g.fill();
  segCache.set(key, cv);
  return cv;
}

/** Draw a worm: soft ground shadow, shaded ball segments tail-first, cartoon eyes. */
export function drawWorm(
  ctx: CanvasRenderingContext2D,
  pts: { x: number; y: number }[],
  angle: number,
  wd: number,
  skin: Skin,
  boost: boolean,
  step = 2,
) {
  const head = pts[0];
  if (pts.length < 2 || !head) return;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(head.x + wd * 0.12, head.y + wd * 0.3);
  for (let i = step; i < pts.length; i += step) {
    const point = pts[i];
    if (point) ctx.lineTo(point.x + wd * 0.12, point.y + wd * 0.3);
  }
  ctx.strokeStyle = "rgba(0,20,60,0.25)";
  ctx.lineWidth = wd * 1.05;
  ctx.stroke();
  if (boost) {
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = skin.glow;
    ctx.lineWidth = wd * 1.9;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const r = wd / 2 + 1.5;
  // Uniform world-distance sampling makes a smooth tube regardless of speed
  // or preview point density; cached overlapping sprites keep shading cheap.
  const samples: { x: number; y: number; index: number }[] = [{ ...head, index: 0 }];
  const spacing = Math.max(2, wd * 0.19);
  let distance = 0;
  let nextDistance = spacing;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (!a || !b) continue;
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    while (length > 0 && nextDistance <= distance + length) {
      const fraction = (nextDistance - distance) / length;
      samples.push({ x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction, index: samples.length });
      nextDistance += spacing;
    }
    distance += length;
  }
  for (let i = samples.length - 1; i >= 0; i--) {
    const p = samples[i];
    if (!p) continue;
    const taper = i > samples.length - 5 ? Math.max(0.45, (samples.length - i) / 5) : 1;
    const radius = (i === 0 ? r * 1.12 : r) * taper;
    const sp = segSprite(segColor(skin, p.index), skin.outline, radius);
    const d = radius * 2.1;
    ctx.drawImage(sp, p.x - d / 2, p.y - d / 2, d, d);
  }

  // head: big cartoon eyes with a highlight
  const h = head;
  for (const sd of [-1, 1]) {
    const ex = h.x + Math.cos(angle + sd * 0.75) * wd * 0.32,
      ey = h.y + Math.sin(angle + sd * 0.75) * wd * 0.32;
    ctx.fillStyle = "#1a1a2a";
    ctx.beginPath();
    ctx.arc(ex, ey, wd * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(ex, ey, wd * 0.26, 0, Math.PI * 2);
    ctx.fill();
    const px = ex + Math.cos(angle) * wd * 0.1,
      py = ey + Math.sin(angle) * wd * 0.1;
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(px, py, wd * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(px - wd * 0.05, py - wd * 0.05, wd * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
}
