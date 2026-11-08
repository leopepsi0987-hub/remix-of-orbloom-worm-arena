// Simulated-lobby behaviour: gamer tags, colour palettes and the decision rules
// that make a bot look like a person (flee bigger worms, hunt smaller ones,
// forage when nobody is around, and never ram a body).

export type V = { x: number; y: number };

export type Palette = { id: string; body: string; core: string; glow: string };

export const PALETTES: Palette[] = [
  { id: "toxic", body: "hsl(96 80% 20%)", core: "hsl(96 95% 62%)", glow: "hsl(96 100% 60%)" },
  { id: "magma", body: "hsl(12 85% 22%)", core: "hsl(18 100% 60%)", glow: "hsl(14 100% 58%)" },
  { id: "cyber", body: "hsl(190 80% 20%)", core: "hsl(188 100% 62%)", glow: "hsl(186 100% 60%)" },
  { id: "vapor", body: "hsl(285 70% 24%)", core: "hsl(288 95% 68%)", glow: "hsl(288 100% 66%)" },
  { id: "gold", body: "hsl(45 85% 20%)", core: "hsl(46 100% 58%)", glow: "hsl(46 100% 56%)" },
  { id: "blood", body: "hsl(350 80% 20%)", core: "hsl(352 95% 58%)", glow: "hsl(352 100% 56%)" },
  { id: "ice", body: "hsl(210 70% 24%)", core: "hsl(205 100% 70%)", glow: "hsl(205 100% 68%)" },
  { id: "candy", body: "hsl(320 70% 24%)", core: "hsl(322 95% 68%)", glow: "hsl(322 100% 66%)" },
  { id: "royal", body: "hsl(255 70% 24%)", core: "hsl(252 95% 68%)", glow: "hsl(252 100% 66%)" },
  { id: "copper", body: "hsl(28 80% 22%)", core: "hsl(30 95% 58%)", glow: "hsl(30 100% 56%)" },
  { id: "lime", body: "hsl(75 80% 20%)", core: "hsl(78 95% 60%)", glow: "hsl(78 100% 58%)" },
  { id: "deep", body: "hsl(230 70% 22%)", core: "hsl(226 95% 64%)", glow: "hsl(226 100% 62%)" },
];

export const PLAYER_PALETTE: Palette = {
  id: "emerald",
  body: "hsl(152 80% 18%)",
  core: "hsl(150 90% 60%)",
  glow: "hsl(150 100% 58%)",
};

export function pickPalette(): Palette {
  return PALETTES[Math.floor(Math.random() * PALETTES.length)]!;
}

const TAG_BASES = [
  "Venom", "Wormhole", "SirSlithers", "Noodle", "Hydra", "Mamba", "Coil", "Glitch",
  "Pixel", "Razor", "Turbo", "Wiggles", "Loop", "Fang", "Nova", "Sushi", "Wasabi",
  "Rogue", "Comet", "Guppy", "Kaiju", "Zephyr", "Biscuit", "Tornado", "Static",
  "Chomp", "Ravioli", "Cobra", "Doughboy", "Blip", "Grub", "Moth", "Taco", "Vortex",
  "Wraith", "Pancake", "Dizzy", "Quasar", "Slurp", "Muncher", "Glowstick", "Kraken",
];

const TAG_SUFFIXES = ["69", "99", "2000", "88", "_x", "_pro", "_xd", "0nly", "_TTV", "1234", "_gg", "9000"];

function rnd(a: number, b: number) {
  return a + Math.random() * (b - a);
}

/** Randomised gamer tag, unique against `used` (which it mutates). */
export function makeTag(used: Set<string>): string {
  for (let tries = 0; tries < 24; tries++) {
    const base = TAG_BASES[Math.floor(Math.random() * TAG_BASES.length)]!;
    const roll = Math.random();
    let tag = base;
    if (roll < 0.25) tag = base + TAG_SUFFIXES[Math.floor(Math.random() * TAG_SUFFIXES.length)]!;
    else if (roll < 0.4) tag = "xX" + base + "Xx";
    else if (roll < 0.55) tag = base + "_" + Math.floor(rnd(10, 99));
    if (!used.has(tag)) {
      used.add(tag);
      return tag;
    }
  }
  const tag = "Worm" + Math.floor(rnd(1000, 9999));
  used.add(tag);
  return tag;
}

// ---------------------------------------------------------------- decision rules

export type BotView = { head: V; angle: number; len: number };
export type Intent = "flee" | "hunt" | "seek" | "wander";
export type Decision = { intent: Intent; target: number; boost: boolean };

export const BASE_SPEED = 2.6;

export const AI = {
  /** A worm this much bigger than me is a threat. */
  FLEE_RATIO: 1.25,
  FLEE_R: 420,
  FLEE_BOOST_R: 240,
  /** A worm this much smaller than me is a meal. */
  HUNT_RATIO: 0.75,
  HUNT_R: 520,
  HUNT_BOOST_R: 300,
  /** Below this length boosting costs more than it earns. */
  MIN_BOOST_LEN: 20,
};

export function fleeAngle(self: V, threat: V): number {
  return Math.atan2(self.y - threat.y, self.x - threat.x);
}

/** Aim where the prey will be, not where it is. */
export function interceptAngle(self: V, prey: V, preyAngle: number, speed: number, preySpeed = BASE_SPEED): number {
  const d = Math.hypot(prey.x - self.x, prey.y - self.y);
  const t = speed > 0 ? d / speed : 0;
  const px = prey.x + Math.cos(preyAngle) * preySpeed * t;
  const py = prey.y + Math.sin(preyAngle) * preySpeed * t;
  return Math.atan2(py - self.y, px - self.x);
}

/**
 * One step of bot thinking. Priority: survive (flee) > eat (hunt) > forage > wander.
 * `others` must exclude self and dead worms.
 */
export function decide(self: BotView, others: BotView[], foodTarget: V | null, speed: number): Decision {
  let threat: BotView | null = null;
  let tDist = Infinity;
  let prey: BotView | null = null;
  let pDist = Infinity;

  for (const o of others) {
    const d = Math.hypot(o.head.x - self.head.x, o.head.y - self.head.y);
    if (o.len >= self.len * AI.FLEE_RATIO && d < AI.FLEE_R && d < tDist) {
      threat = o;
      tDist = d;
    } else if (o.len <= self.len * AI.HUNT_RATIO && d < AI.HUNT_R && d < pDist) {
      prey = o;
      pDist = d;
    }
  }

  if (threat) {
    return {
      intent: "flee",
      target: fleeAngle(self.head, threat.head),
      boost: tDist < AI.FLEE_BOOST_R && self.len > AI.MIN_BOOST_LEN,
    };
  }
  if (prey) {
    return {
      intent: "hunt",
      target: interceptAngle(self.head, prey.head, prey.angle, speed),
      boost: pDist < AI.HUNT_BOOST_R && self.len > AI.MIN_BOOST_LEN,
    };
  }
  if (foodTarget) {
    return {
      intent: "seek",
      target: Math.atan2(foodTarget.y - self.head.y, foodTarget.x - self.head.x),
      boost: false,
    };
  }
  return { intent: "wander", target: self.angle, boost: false };
}

/** Shortest-arc turn, capped at `max` radians. */
export function clampTurn(current: number, target: number, max: number): number {
  const d = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + Math.max(-max, Math.min(max, d));
}

// ---------------------------------------------------------------- spatial helpers

function cellKey(x: number, y: number, size: number) {
  return Math.floor(x / size) + "," + Math.floor(y / size);
}

/** Counts per cell, so a bot can head for the densest nearby food cluster. */
export class CountGrid {
  private cells = new Map<string, { x: number; y: number; n: number }>();
  constructor(private size = 150) {}

  clear() {
    this.cells.clear();
  }

  add(x: number, y: number) {
    const k = cellKey(x, y, this.size);
    const c = this.cells.get(k);
    if (c) {
      c.n++;
      return;
    }
    const cx = Math.floor(x / this.size);
    const cy = Math.floor(y / this.size);
    this.cells.set(k, { x: (cx + 0.5) * this.size, y: (cy + 0.5) * this.size, n: 1 });
  }

  /** Centre of the best cell within `radius` cells (density, biased to closeness). */
  best(from: V, radius: number): V | null {
    const cx = Math.floor(from.x / this.size);
    const cy = Math.floor(from.y / this.size);
    let bestP: V | null = null;
    let bestS = 0;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const c = this.cells.get(cx + dx + "," + (cy + dy));
        if (!c || c.n < 1) continue;
        const d = Math.hypot(c.x - from.x, c.y - from.y);
        const s = c.n / (1 + d / this.size);
        if (s > bestS) {
          bestS = s;
          bestP = { x: c.x, y: c.y };
        }
      }
    }
    return bestP;
  }
}

/** Worm body segments bucketed by cell, for cheap "is there a body ahead of me?" probes. */
export class PointGrid {
  private cells = new Map<string, { x: number; y: number; id: number }[]>();
  constructor(private size = 150) {}

  clear() {
    this.cells.clear();
  }

  add(id: number, x: number, y: number) {
    const k = cellKey(x, y, this.size);
    const a = this.cells.get(k);
    if (a) a.push({ x, y, id });
    else this.cells.set(k, [{ x, y, id }]);
  }

  hit(x: number, y: number, r: number, selfId: number): boolean {
    const span = Math.max(1, Math.ceil(r / this.size));
    const cx = Math.floor(x / this.size);
    const cy = Math.floor(y / this.size);
    const r2 = r * r;
    for (let dx = -span; dx <= span; dx++) {
      for (let dy = -span; dy <= span; dy++) {
        const a = this.cells.get(cx + dx + "," + (cy + dy));
        if (!a) continue;
        for (const p of a) {
          if (p.id === selfId) continue;
          const ddx = p.x - x;
          const ddy = p.y - y;
          if (ddx * ddx + ddy * ddy < r2) return true;
        }
      }
    }
    return false;
  }
}

/**
 * Whisker probe: three short rays ahead of the head. Returns a steering angle if
 * the straight-ahead ray is blocked, or null when the way is clear.
 */
export function whisker(self: BotView, grid: PointGrid, selfId: number, reach: number, spin: number): number | null {
  const blocked = (off: number) => {
    const a = self.angle + off;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    for (let d = 40; d <= reach; d += 40) {
      if (grid.hit(self.head.x + ca * d, self.head.y + sa * d, 14, selfId)) return true;
    }
    return false;
  };
  if (!blocked(0)) return null;
  if (!blocked(-0.6)) return self.angle - 0.6;
  if (!blocked(0.6)) return self.angle + 0.6;
  return self.angle + 1.3 * spin;
}
