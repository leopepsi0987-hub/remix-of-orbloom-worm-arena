export const KILL_RULES = { chainWindow: 60 * 8, reactionDuration: 60 * 3 } as const;
export type KillChain = { last: number; chain: number; total: number };
export function registerKill(previous: KillChain, frame: number) {
  const chain = previous.total > 0 && frame - previous.last <= KILL_RULES.chainWindow ? previous.chain + 1 : 1;
  const titles = ['GOTCHA!', 'DOUBLE KILL!', 'TRIPLE KILL!', 'UNSTOPPABLE!'];
  return { last: frame, chain, total: previous.total + 1, title: titles[Math.min(chain, 4) - 1] ?? 'UNSTOPPABLE!', face: chain >= 3 ? 1 : 0 };
}