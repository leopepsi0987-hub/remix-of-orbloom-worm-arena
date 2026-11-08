import { describe, it, expect } from 'vitest';
import { nextStorm, fogAmount, lightningLength, strikeHits, WEATHER_RULES } from '@/lib/weather';
describe('fair weather', () => {
  it('never starts in the first 55 seconds and lasts only 18 seconds', () => { const storm = nextStorm(0, () => 0); expect(storm.starts).toBe(3300); expect(storm.ends - storm.starts).toBe(1080); expect(fogAmount(storm, 3299)).toBe(0); expect(fogAmount(storm, storm.ends)).toBe(0); });
  it('lightning shortens without killing', () => { expect(lightningLength(100)).toBe(80); expect(lightningLength(16)).toBe(15); expect(lightningLength(10)).toBe(10); });
  it('does not hit before warning ends or through shield or immunity', () => { const s = { x: 0, y: 0, at: WEATHER_RULES.warning, applied: false }; expect(strikeHits(s, s, 149, 0, false)).toBe(false); expect(strikeHits(s, s, 150, 0, false)).toBe(true); expect(strikeHits(s, s, 150, 200, false)).toBe(false); expect(strikeHits(s, s, 150, 0, true)).toBe(false); expect(strikeHits(s, { x: 73, y: 0 }, 150, 0, false)).toBe(false); });
});