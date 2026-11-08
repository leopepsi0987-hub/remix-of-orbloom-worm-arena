import { describe, expect, it } from "vitest";

import {
  AI,
  BASE_SPEED,
  CountGrid,
  PointGrid,
  decide,
  makeTag,
  whisker,
  type BotView,
  type V,
} from "@/lib/bots";

const v = (x: number, y: number): V => ({ x, y });
const bot = (x: number, y: number, len: number, angle = 0): BotView => ({ head: v(x, y), angle, len });

describe("bot decisions", () => {
  it("a small worm flees a bigger one that is close", () => {
    const d = decide(bot(0, 0, 30), [bot(100, 0, 80)], null, BASE_SPEED * 2);
    expect(d.intent).toBe("flee");
    expect(d.target).toBeCloseTo(Math.PI, 5); // runs away from the threat, not toward it
    expect(d.boost).toBe(true); // close enough to be worth burning mass
  });

  it("a big worm boosts to cut off a smaller one", () => {
    const d = decide(bot(0, 0, 120), [bot(200, 0, 40)], null, BASE_SPEED * 2);
    expect(d.intent).toBe("hunt");
    expect(d.boost).toBe(true);
  });

  it("hunting aims ahead of the prey, not at where it is", () => {
    const d = decide(bot(0, 0, 120), [bot(100, 0, 40, -Math.PI / 2)], null, BASE_SPEED * 2);
    expect(d.intent).toBe("hunt");
    expect(d.target).toBeCloseTo(Math.atan2(-50, 100), 4);
  });

  it("survival outranks dinner when both apply", () => {
    const d = decide(bot(0, 0, 60), [bot(150, 0, 100), bot(100, 0, 40)], v(0, 300), BASE_SPEED * 2);
    expect(d.intent).toBe("flee");
  });

  it("ignores worms that are too far to matter", () => {
    const d = decide(bot(0, 0, 30), [bot(AI.FLEE_R + 40, 0, 80)], v(10, 0), BASE_SPEED);
    expect(d.intent).toBe("seek");
    expect(d.target).toBeCloseTo(0, 5);
  });

  it("treats a similar-sized worm as neither threat nor prey", () => {
    const d = decide(bot(0, 0, 100), [bot(100, 0, 100)], null, BASE_SPEED);
    expect(d.intent).toBe("wander");
    expect(d.boost).toBe(false);
  });

  it("forages toward the nearest food when nobody is around", () => {
    const d = decide(bot(0, 0, 50), [], v(0, 200), BASE_SPEED);
    expect(d.intent).toBe("seek");
    expect(d.target).toBeCloseTo(Math.PI / 2, 5);
    expect(d.boost).toBe(false);
  });

  it("wanders with no food and no company", () => {
    const d = decide(bot(0, 0, 50), [], null, BASE_SPEED);
    expect(d.intent).toBe("wander");
    expect(d.target).toBeCloseTo(0, 5);
  });

  it("won't boost on a thin body", () => {
    const d = decide(bot(0, 0, AI.MIN_BOOST_LEN - 5), [bot(50, 0, 100)], null, BASE_SPEED * 2);
    expect(d.intent).toBe("flee");
    expect(d.boost).toBe(false);
  });

  it("doesn't burn mass on a threat it can outrun at walking pace", () => {
    const d = decide(bot(0, 0, 30), [bot(AI.FLEE_BOOST_R + 60, 0, 90)], null, BASE_SPEED);
    expect(d.intent).toBe("flee");
    expect(d.boost).toBe(false);
  });
});

describe("whisker probe", () => {
  const wall = (g: PointGrid, id: number, x: number, from: number, to: number) => {
    for (let y = from; y <= to; y += 20) g.add(id, x, y);
  };

  it("turns toward the open side when a body blocks the way", () => {
    const g = new PointGrid(150);
    wall(g, 7, 120, -60, 60);
    expect(whisker(bot(0, 0, 50, 0), g, 1, 180, 1)).toBeCloseTo(-0.6, 5);
  });

  it("keeps going when the way is clear", () => {
    const g = new PointGrid(150);
    wall(g, 7, 600, -200, 200);
    expect(whisker(bot(0, 0, 50, 0), g, 1, 180, 1)).toBeNull();
  });

  it("ignores its own body", () => {
    const g = new PointGrid(150);
    wall(g, 1, 120, -200, 200);
    expect(whisker(bot(0, 0, 50, 0), g, 1, 180, 1)).toBeNull();
  });
});

describe("food clusters", () => {
  it("heads for the denser cluster", () => {
    const g = new CountGrid(150);
    for (let i = 0; i < 12; i++) g.add(400, 0);
    for (let i = 0; i < 2; i++) g.add(0, -300);
    const t = g.best(v(0, 0), 5);
    expect(t).not.toBeNull();
    expect(t!.x).toBeGreaterThan(200);
  });

  it("finds nothing in an empty arena", () => {
    expect(new CountGrid(150).best(v(0, 0), 5)).toBeNull();
  });
});

describe("gamer tags", () => {
  it("gives every bot in the lobby its own tag", () => {
    const used = new Set<string>();
    const tags = Array.from({ length: 20 }, () => makeTag(used));
    expect(new Set(tags).size).toBe(20);
  });
});
