export const WEATHER_RULES = { minCalm: 60 * 55, maxCalm: 60 * 85, duration: 60 * 18, fade: 120, strikeEvery: 300, warning: 150, flash: 24, radius: 72, safeVision: 230, loss: 0.2, minLength: 15, immunity: 240, maxStrikes: 2 } as const;
export type Strike = { x: number; y: number; at: number; applied: boolean };
export type Weather = { starts: number; ends: number; nextStrike: number; strikes: Strike[] };
export function nextStorm(frame: number, random = Math.random): Weather {
  const starts = frame + WEATHER_RULES.minCalm + Math.floor(random() * (WEATHER_RULES.maxCalm - WEATHER_RULES.minCalm));
  return { starts, ends: starts + WEATHER_RULES.duration, nextStrike: starts + 180, strikes: [] };
}
export function fogAmount(weather: Weather, frame: number) {
  return Math.max(0, Math.min(1, (frame - weather.starts) / WEATHER_RULES.fade, (weather.ends - frame) / WEATHER_RULES.fade));
}
export function lightningLength(length: number) { return Math.max(Math.min(length, WEATHER_RULES.minLength), length * (1 - WEATHER_RULES.loss)); }
export function strikeHits(strike: Strike, head: { x: number; y: number }, frame: number, immuneUntil: number, shield: boolean) {
  return !shield && frame >= immuneUntil && frame >= strike.at && frame < strike.at + WEATHER_RULES.flash && Math.hypot(head.x - strike.x, head.y - strike.y) <= WEATHER_RULES.radius;
}