/** No food is emitted by movement or boosting. Only arena food and death loot exist. */
export const FOOD_RULES = {
  normalTarget: 260,
  maxDeathDrops: 160,
  deathLifetimeFrames: 60 * 45,
  boostMassCost: 0.08,
} as const;

export type ArenaFood = {
  x: number; y: number; r: number; v: number; kind: number; rot: number;
  expiresAt: number | null;
};

export function addBoundedFood(food: ArenaFood[], item: ArenaFood) {
  if (item.expiresAt !== null) {
    let count = 0;
    let oldest = -1;
    for (let i = 0; i < food.length; i++) {
      if (food[i]?.expiresAt !== null) {
        count++;
        if (oldest === -1) oldest = i;
      }
    }
    if (count >= FOOD_RULES.maxDeathDrops && oldest >= 0) food.splice(oldest, 1);
  }
  food.push(item);
}

export function expireFood(food: ArenaFood[], frame: number) {
  for (let i = food.length - 1; i >= 0; i--) {
    const item = food[i];
    if (item && item.expiresAt !== null && item.expiresAt <= frame) food.splice(i, 1);
  }
}

export function boostedLength(length: number) {
  return length - FOOD_RULES.boostMassCost;
}