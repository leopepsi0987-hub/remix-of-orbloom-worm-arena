import trophyUrl from "@/assets/icon-trophy.png";

export type BoardRow = { name: string; len: number; player: boolean; core: string };

/** Live lobby standings, top-right. Compact so it never reaches the bottom controls. */
export function Leaderboard({ rows, rank, alive }: { rows: BoardRow[]; rank: number; alive: number }) {
  return (
    <div className="match-board pointer-events-none absolute right-2 top-2 z-10 w-36 rounded-lg border border-border/40 bg-card/80 p-1.5 sm:right-3 sm:top-3 sm:w-48 sm:p-2">
      <div className="mb-1 flex items-center gap-1 px-1">
        <img src={trophyUrl} alt="" width={16} height={16} className="h-4 w-4" />
        <span className="font-display text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Top</span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground tabular-nums">{alive} alive</span>
      </div>
      <ol>
        {rows.map((r, i) => (
          <li
            key={r.name + i}
            className={`flex items-center gap-1.5 rounded-md px-1 py-px font-mono text-[10px] sm:text-[11px] ${
              r.player ? "bg-primary/15 font-bold text-primary" : "text-foreground/80"
            } ${i >= 5 ? "hidden tall:flex" : ""}`}
          >
            <span className="w-3 shrink-0 text-right tabular-nums text-muted-foreground">{i + 1}</span>
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.core }} />
            <span className="min-w-0 flex-1 truncate">{r.name}</span>
            <span className="shrink-0 tabular-nums">{Math.floor(r.len)}</span>
          </li>
        ))}
      </ol>
      {(rank > 5 || rank > rows.length) && (
        <div className="mt-1 border-t border-border/40 px-1 pt-1 font-mono text-[10px] font-bold text-primary tabular-nums">
          You: #{rank}
        </div>
      )}
    </div>
  );
}
