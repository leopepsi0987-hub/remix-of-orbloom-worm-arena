import { it, expect } from 'vitest';
import { registerKill } from '@/lib/kill-streak';
it('counts two actual kills as a double and resets after eight seconds', () => { const first = registerKill({ last: 0, chain: 0, total: 0 }, 100); const double = registerKill(first, 200); expect(double.chain).toBe(2); expect(double.total).toBe(2); expect(registerKill(double, 681).chain).toBe(1); });