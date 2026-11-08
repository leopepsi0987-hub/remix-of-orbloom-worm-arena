import { describe, expect, it } from 'vitest';
import { drawReaction } from './arena-effects';

describe('drawReaction', () => {
  it('never draws a negative radius while a reaction fades out', () => {
    const radii: number[] = [];
    const ctx = new Proxy({}, { get: (_t, key) => key === 'arc' ? (_x: number, _y: number, r: number) => { if (r < 0) throw new Error('negative'); radii.push(r); } : () => {}, set: () => true }) as unknown as CanvasRenderingContext2D;
    const art = {} as HTMLCanvasElement;
    for (let age = 0; age <= 90; age++) for (const face of [0, 1, 2]) expect(() => drawReaction(ctx, art, 0, 0, age, 90, face, false)).not.toThrow();
    expect(radii.length).toBeGreaterThan(0);
  });
});
