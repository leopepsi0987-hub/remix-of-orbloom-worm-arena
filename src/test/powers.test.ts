import { describe, expect, it } from "vitest";
import { POWER_RULES, activatePower, hasPower, pickupDropY, powerSpeed, powerFoodValue, updatePickups, type ActivePowers, type Pickup } from "@/lib/powers";

describe("Arena powers", () => {
  it("speed increases player movement without speeding up bots", () => {
    const active: ActivePowers = {}; activatePower(active, "speed", 0);
    expect(powerSpeed(active, 1, true)).toBe(1.45);
    expect(powerSpeed(active, 1, false)).toBe(1);
  });
  it("magnet activates temporarily and refreshes rather than stacks", () => {
    const active: ActivePowers = {}; activatePower(active, "magnet", 0); activatePower(active, "magnet", 100);
    expect(hasPower(active, "magnet", 579)).toBe(true);
    expect(hasPower(active, "magnet", 580)).toBe(false);
  });
  it("shield immunity expires after eight simulation seconds", () => {
    const active: ActivePowers = {}; activatePower(active, "shield", 20);
    expect(hasPower(active, "shield", 499)).toBe(true);
    expect(hasPower(active, "shield", 500)).toBe(false);
  });
  it("double food doubles collected value only while active", () => {
    const active: ActivePowers = {}; activatePower(active, "double", 0);
    expect(powerFoodValue(active, 1, 1.5)).toBe(3);
    expect(powerFoodValue(active, 480, 1.5)).toBe(1.5);
  });
  it("slow affects bots but not the player", () => {
    const active: ActivePowers = {}; activatePower(active, "slow", 0);
    expect(powerSpeed(active, 1, false)).toBe(0.65);
    expect(powerSpeed(active, 1, true)).toBe(1);
  });
  it("pickups stay rare: a hard cap of two and expired ones are removed", () => {
    const pickups: Pickup[] = Array.from({ length: POWER_RULES.maxPickups }, () => ({ x: 0, y: 0, kind: "speed", expiresAt: 1800, spawnedAt: 0 }));
    updatePickups(pickups, 1, { x: 1, y: 1, kind: "magnet", expiresAt: 1801, spawnedAt: 1 });
    expect(pickups).toHaveLength(POWER_RULES.maxPickups);
    updatePickups(pickups, 1800);
    expect(pickups).toHaveLength(0);
  });
  it("spawns are slow enough that at most a couple exist at once", () => {
    // one spawns every 24 s and lives 45 s, so the field holds 1–2, capped at 2
    expect(POWER_RULES.spawnEvery / 60).toBe(24);
    expect(POWER_RULES.lifetime / 60).toBe(45);
    expect(POWER_RULES.maxPickups).toBe(2);
  });
  it("fresh pickups fall in from above and settle with a small bounce", () => {
    const pickup: Pickup = { x: 0, y: 0, kind: "speed", expiresAt: 9999, spawnedAt: 0 };
    const high = pickupDropY(pickup, 0);
    expect(high).toBeLessThan(-POWER_RULES.dropHeight / 2); // starts high above the ground
    expect(pickupDropY(pickup, 30)).toBeGreaterThan(high); // falls toward the ground
    expect(pickupDropY(pickup, POWER_RULES.dropFrames)).toBe(0); // rests exactly on the ground
  });
});
