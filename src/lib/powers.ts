/** All durations use fixed 60 Hz simulation frames, never display refresh rate. */
export const POWER_KINDS = ["speed", "magnet", "shield", "double", "slow"] as const;
export type PowerKind = typeof POWER_KINDS[number];
export type ActivePowers = Partial<Record<PowerKind, number>>;
export type Pickup = { x: number; y: number; kind: PowerKind; expiresAt: number; spawnedAt: number };
/**
 * Powers stay special: only a couple on the whole arena at once, one drops in
 * every ~24 simulation seconds, and each falls from the sky when it appears.
 */
export const POWER_RULES = { duration: 8 * 60, lifetime: 45 * 60, maxPickups: 2, spawnEvery: 24 * 60, radius: 24, magnetRadius: 170, dropFrames: 45, dropHeight: 90 };
export const POWER_LABELS: Record<PowerKind, string> = { speed: "Speed", magnet: "Magnet", shield: "Shield", double: "Double food", slow: "Slow bots" };
export function activatePower(active: ActivePowers, kind: PowerKind, frame: number) {
  active[kind] = frame + POWER_RULES.duration;
}
export function hasPower(active: ActivePowers, kind: PowerKind, frame: number) {
  return (active[kind] ?? 0) > frame;
}
export function powerSpeed(active: ActivePowers, frame: number, player: boolean) {
  return player ? (hasPower(active, "speed", frame) ? 1.45 : 1) : (hasPower(active, "slow", frame) ? 0.65 : 1);
}
export function powerFoodValue(active: ActivePowers, frame: number, value: number) {
  return value * (hasPower(active, "double", frame) ? 2 : 1);
}

/** Vertical offset (px, negative = still in the air) of a pickup dropping in. */
export function pickupDropY(pickup: Pickup, frame: number): number {
  const p = (frame - pickup.spawnedAt) / POWER_RULES.dropFrames;
  if (p >= 1) return 0;
  const fall = Math.min(1, Math.max(0, p) / 0.7);
  const y = -(1 - fall * fall) * POWER_RULES.dropHeight;
  if (p <= 0.7) return y;
  // small landing bounce after the fall
  return -Math.sin(((p - 0.7) / 0.3) * Math.PI) * 10;
}

export function updatePickups(pickups: Pickup[], frame: number, candidate?: Pickup) {
  for (let i = pickups.length - 1; i >= 0; i--) if ((pickups[i]?.expiresAt ?? 0) <= frame) pickups.splice(i, 1);
  if (candidate && pickups.length < POWER_RULES.maxPickups) pickups.push(candidate);
}
