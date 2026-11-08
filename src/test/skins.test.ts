import { describe, expect, it } from "vitest";
import { SKINS, segColor, skinById } from "@/lib/skins";

describe("skins", () => {
  it("offers 10 unique skins", () => {
    expect(SKINS.length).toBe(10);
    expect(new Set(SKINS.map((s) => s.id)).size).toBe(10);
  });
  it("falls back to the first skin for unknown ids", () => {
    expect(skinById("nope").id).toBe("emerald");
    expect(skinById("tiger").id).toBe("tiger");
  });
  it("stripes alternate every 3 segments", () => {
    const tiger = skinById("tiger");
    expect(segColor(tiger, 0)).toBe(tiger.colors[0]);
    expect(segColor(tiger, 3)).toBe(tiger.colors[1]);
    expect(segColor(tiger, 6)).toBe(tiger.colors[0]);
  });
});
