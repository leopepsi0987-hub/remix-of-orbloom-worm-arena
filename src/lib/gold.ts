export const SKIN_PRICES: Record<string, number> = { emerald: 0, tiger: 100, candy: 150, bee: 200, ice: 250, algeria: 300, lava: 400, neon: 500, galaxy: 650, rainbow: 800 };
export type Wallet = { gold: number; owned: string[]; equipped: string; reward: number };
export function goldForSeconds(seconds: number) { return Math.min(120, Math.max(0, Math.floor(seconds / 5)) * 2); }
export function canBuy(gold: number, owned: string[], skin: string) {
  const price = SKIN_PRICES[skin];
  return price !== undefined && (owned.includes(skin) || gold >= price);
}