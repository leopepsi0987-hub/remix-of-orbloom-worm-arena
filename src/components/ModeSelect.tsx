import gardenUrl from "@/assets/lobby-garden.jpg";
import logoUrl from "@/assets/logo-wormz.png";
import { Button } from "@/components/ui/button";
import { Swords, Users, Skull, ChevronLeft } from "lucide-react";

export type GameMode = "duel" | "teams" | "frenzy";

const MODES: { id: GameMode; title: string; sub: string; icon: typeof Swords }[] = [
  { id: "duel", title: "1 VS 1", sub: "Duel a single rival", icon: Swords },
  { id: "teams", title: "4 VS 4", sub: "Three allies fight beside you", icon: Users },
  { id: "frenzy", title: "1 VS 30", sub: "Frenzy against the whole swarm", icon: Skull },
];

/** Mode picker shown when the player hits Battle in the lobby. */
export function ModeSelect({ onPick, onBack }: { onPick: (mode: GameMode) => void; onBack: () => void }) {
  return (
    <div className="home-scene absolute inset-0 z-20">
      <img src={gardenUrl} alt="" width={1536} height={1024} className="home-background" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 sm:gap-3">
        <img src={logoUrl} alt="Wormz" width={1152} height={576} className="h-16 w-auto sm:h-24" />
        <h2 className="font-display text-xl font-black text-foreground sm:text-2xl">Choose a battle</h2>
        <div className="grid w-full max-w-md gap-2 sm:gap-3">
          {MODES.map((m) => (
            <Button
              key={m.id}
              onClick={() => onPick(m.id)}
              className="mode-button"
              aria-label={`${m.title}: ${m.sub}`}
            >
              <m.icon aria-hidden="true" className="size-7 shrink-0 text-primary" strokeWidth={2.5} />
              <span className="flex min-w-0 flex-col items-start">
                <span className="font-display text-xl font-black leading-none text-foreground sm:text-2xl">{m.title}</span>
                <span className="truncate text-xs font-semibold text-muted-foreground">{m.sub}</span>
              </span>
            </Button>
          ))}
        </div>
        <Button variant="ghost" onClick={onBack} className="font-display font-black text-foreground">
          <ChevronLeft aria-hidden="true" className="size-4" /> Back
        </Button>
      </div>
    </div>
  );
}
