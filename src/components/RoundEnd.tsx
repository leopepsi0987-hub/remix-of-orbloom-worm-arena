import trophyUrl from "@/assets/icon-trophy.png";
import { Button } from "@/components/ui/button";
import { Play, Home as HomeIcon, Shuffle, Coins } from "lucide-react";

/** Round-end card shown over the frozen arena when the player's worm dies — or wins. */
export function RoundEnd({
  score,
  longest,
  place,
  total,
  best,
  win = false,
  onRetry,
  onHome,
  onModes,
  gold = 0, kills = 0, saving = false, saveError = '', onSaveRetry,
}: {
  /** final length when the run ended */
  score: number;
  /** longest length reached during the run */
  longest: number;
  /** placement at the moment of death (1 = first) */
  place: number;
  /** worms in the match */
  total: number;
  /** all-time best length */
  best: number;
  /** the run ended by wiping out every rival */
  win?: boolean;
  onRetry: () => void;
  onHome: () => void;
  onModes?: () => void;
  gold?: number;
  kills?: number;
  saving?: boolean;
  saveError?: string;
  onSaveRetry?: () => void;
}) {
  const newBest = score >= best && score > 0;
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 p-3 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={win ? "Victory" : "Round over"}
        className="round-end-card flex max-h-full w-full max-w-sm flex-col items-center gap-2 overflow-y-auto rounded-2xl border-2 border-border bg-card/95 p-3 text-center shadow-2xl sm:gap-3 sm:p-5"
      >
        <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/50 px-4 py-2">
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
              {win ? "Victory" : "Round over"}
            </span>
            <span className="font-display text-3xl font-black leading-none text-primary sm:text-4xl">
              #{place}
              <span className="ml-1 align-middle text-sm font-bold text-muted-foreground">/ {total}</span>
            </span>
          </div>
          <img src={trophyUrl} alt="" width={64} height={64} className="h-12 w-12 shrink-0 sm:h-14 sm:w-14" />
        </div>

        {newBest && (
          <p className="rounded-full bg-primary/20 px-3 py-0.5 font-display text-xs font-black text-primary sm:text-sm">
            New best!
          </p>
        )}

        <div className="grid w-full grid-cols-2 gap-2">
          <Stat label="Length" value={score} />
          <Stat label="Longest" value={longest} />
        </div>
        <div className="flex w-full items-center justify-between px-2 text-sm font-black text-primary"><span>{kills} kills</span><span className="flex items-center gap-1"><Coins className="size-4" />{saving ? 'Saving…' : `+${gold} gold`}</span></div>
        {saveError && <Button variant="ghost" onClick={onSaveRetry} className="h-7 text-xs text-primary">Retry gold save</Button>}

        <Button onClick={onRetry} className="battle-button font-display w-full">
          <Play aria-hidden="true" className="size-6" fill="currentColor" /> PLAY AGAIN
        </Button>
        <div className="flex w-full gap-2">
          {onModes && (
            <Button
              variant="ghost"
              onClick={onModes}
              className="h-11 shrink-0 rounded-lg border-2 border-border/60 bg-background/40 font-display text-xs font-black text-foreground"
            >
              <Shuffle aria-hidden="true" className="size-4" /> MODES
            </Button>
          )}
          <Button
            onClick={onHome}
            className="h-11 flex-1 rounded-lg border-2 border-border bg-background/60 font-display text-sm font-black text-foreground"
          >
            <HomeIcon aria-hidden="true" className="size-4" /> Home
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl border border-border/60 bg-background/40 px-2 py-2">
      <span className="font-display text-xl font-black tabular-nums text-primary sm:text-2xl">{value}</span>
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  );
}
