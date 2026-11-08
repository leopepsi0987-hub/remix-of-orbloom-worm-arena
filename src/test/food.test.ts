import { describe, expect, it } from "vitest";
import { addBoundedFood, boostedLength, expireFood, FOOD_RULES, type ArenaFood } from "@/lib/food";

const drop = (expiresAt: number | null): ArenaFood => ({ x: 0, y: 0, r: expiresAt === null ? 13 : 26, v: 5, kind: 0, rot: 0, expiresAt });

describe("food clutter prevention", () => {
  it("boosting sheds mass without creating any trail food", () => {
    const food: ArenaFood[] = [drop(null)];
    let length = 100;
    for (let i = 0; i < 600; i++) length = boostedLength(length);
    expect(length).toBeCloseTo(52);
    expect(food).toHaveLength(1);
  });
  it("keeps death loot bounded even after thousands of drops", () => {
    const food: ArenaFood[] = Array.from({ length: 260 }, () => drop(null));
    for (let i = 0; i < 20000; i++) addBoundedFood(food, drop(i + 2700));
    expect(food).toHaveLength(420);
    expect(food.filter(f => f.expiresAt === null)).toHaveLength(260);
    expect(food.filter(f => f.expiresAt !== null)).toHaveLength(160);
  });
  it("expires old loot but retains normal food", () => {
    const food = [drop(null), drop(2700)];
    expireFood(food, 2699);
    expect(food).toHaveLength(2);
    expireFood(food, FOOD_RULES.deathLifetimeFrames);
    expect(food).toEqual([drop(null)]);
  });
});