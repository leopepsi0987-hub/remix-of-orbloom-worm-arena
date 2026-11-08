import { useEffect, useRef, useState } from "react";
import logoUrl from "@/assets/logo-wormz.png";
import skinsUrl from "@/assets/icon-skins.png";
import trophyUrl from "@/assets/icon-trophy.png";
import playersUrl from "@/assets/icon-players.png";
import { SKINS, drawWorm, skinById, type Skin } from "@/lib/skins";
import gardenUrl from "@/assets/lobby-garden.jpg";
import { Button } from "@/components/ui/button";
import { Play, X, Check, Coins, LockKeyhole } from "lucide-react";
import { SKIN_PRICES, type Wallet } from '@/lib/gold';

/** Main home screen: your worm, name, skin shop, best score and the big Battle button. */
export function Home({
  skinId,
  onSkin,
  nick,
  onNick,
  best,
  lastScore,
  onBattle,
  wallet, walletReady, buying, walletError, onRetryWallet,
}: {
  skinId: string;
  onSkin: (id: string) => void;
  nick: string;
  onNick: (n: string) => void;
  best: number;
  lastScore: number | null;
  onBattle: () => void;
  wallet: Wallet;
  walletReady: boolean;
  buying: boolean;
  walletError: string;
  onRetryWallet: () => void;
}) {
  const [panel, setPanel] = useState<null | "skins" | "rank">(null);
  const skin = skinById(skinId);

  return (
    <div className="home-scene absolute inset-0 z-20">
      <img src={gardenUrl} alt="" width={1536} height={1024} className="home-background" />
      {/* profile badge */}
      <div className="home-profile">
        <div className="home-avatar h-10 w-10 shrink-0 overflow-hidden rounded-lg border-2 border-primary bg-card">
          <img src={playersUrl} alt="" width={48} height={48} className="h-full w-full object-contain" />
        </div>
        <input
          value={nick}
          maxLength={14}
          onChange={(e) => onNick(e.target.value)}
          placeholder="Your name"
          aria-label="Your name"
          className="home-name min-w-0 rounded-lg border border-border/60 bg-card/80 px-3 py-1.5 font-display text-sm font-bold text-foreground outline-none focus:border-primary"
        />
      </div>

      {/* left menu tiles */}
      <div className="home-nav">
        <Tile icon={skinsUrl} label="Skin shop" onClick={() => setPanel("skins")} />
        <Tile icon={trophyUrl} label="Ranking" onClick={() => setPanel("rank")} />
      </div>

      {/* centre: logo, worm, battle */}
      <div className="home-center">
        <img src={logoUrl} alt="Wormz" width={1152} height={576} className="home-logo" />
        {lastScore !== null && (
          <p className="home-last font-display text-sm font-black text-foreground">
            Last run: <span className="text-primary">{lastScore}</span>
          </p>
        )}
        <div className="home-worm">
          <SkinPreview skin={skin} />
        </div>
        <p className="home-skin-name text-foreground">{skin.name}</p>
        <Button onClick={onBattle} className="battle-button font-display">
          <Play aria-hidden="true" className="size-7" fill="currentColor" /> BATTLE!
        </Button>
      </div>

      {/* right: best score */}
      <div className="home-best flex items-center gap-2 rounded-lg border border-border bg-card/90 px-4 py-2">
        <Coins className="size-5 text-primary" />
        <span className="font-display text-sm font-black text-primary" aria-label="Gold balance">{walletReady ? wallet.gold : '…'}</span>
        <span className="h-4 border-l border-border" />
        <img src={trophyUrl} alt="" width={22} height={22} className="h-5 w-5" />
        <span className="font-display text-sm font-black tabular-nums text-foreground">Best {best}</span>
      </div>

      {panel && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm" onClick={() => setPanel(null)}>
          <div role="dialog" aria-modal="true" aria-label={panel === "skins" ? "Wardrobe" : "Ranking"}
            className="relative flex max-h-full w-full max-w-2xl flex-col gap-3 rounded-lg border-2 border-border bg-card p-4 sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="ghost"
              onClick={() => setPanel(null)}
              aria-label="Close"
              className="absolute -right-2 -top-2 h-9 w-9 rounded-xl border-2 border-foreground/80 bg-primary font-display text-lg font-black text-primary-foreground"
            >
              <X />
            </Button>
            {panel === "skins" ? (
              <>
                <div className="flex items-center justify-center gap-4"><h2 className="font-display text-xl font-black text-foreground sm:text-2xl">Wardrobe</h2><span className="flex items-center gap-1 font-bold text-primary"><Coins className="size-4" /> {wallet.gold}</span></div>
                {walletError && <Button variant="ghost" onClick={onRetryWallet} className="text-primary">{walletError}</Button>}
                <div className="flex min-h-0 gap-4">
                  <div className="flex w-2/5 shrink-0 flex-col items-center gap-1">
                    <SkinPreview skin={skin} />
                    <p className="font-display text-sm font-black text-primary">{skin.name}</p>
                    <span className="text-xs text-muted-foreground">Equipped</span>
                  </div>
                  <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
                    {SKINS.map((s) => (
                      <Button variant="ghost"
                        key={s.id}
                        onClick={() => onSkin(s.id)}
                        aria-label={wallet.owned.includes(s.id) ? `Select ${s.name}` : `Buy ${s.name} for ${SKIN_PRICES[s.id]} gold`}
                        aria-pressed={s.id === skinId}
                        disabled={!walletReady || buying || (!wallet.owned.includes(s.id) && wallet.gold < (SKIN_PRICES[s.id] ?? Infinity))}
                        className={`wardrobe-option rounded-lg border-2 ${s.id === skinId ? "border-primary bg-primary/20" : "border-border/40 bg-background/30"}`}
                      >
                        <SkinPreview skin={s} animated={false} />
                        <span className="flex items-center gap-1 text-xs font-bold">{s.id === skinId && <Check className="size-3" />}{s.name}</span>
                        {!wallet.owned.includes(s.id) && <span className="flex items-center gap-1 text-xs font-black text-primary"><LockKeyhole className="size-3" />{SKIN_PRICES[s.id]} <Coins className="size-3" /></span>}
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-center font-display text-xl font-black text-foreground sm:text-2xl">Ranking</h2>
                <div className="flex flex-col items-center gap-2 py-4">
                  <img src={trophyUrl} alt="" width={96} height={96} className="h-20 w-20" />
                  <p className="font-display text-lg font-black text-foreground">
                    Your best length: <span className="text-primary">{best}</span>
                  </p>
                  {lastScore !== null && <p className="text-sm text-muted-foreground">Last run: {lastScore}</p>}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <Button variant="ghost" onClick={onClick} className="home-tile font-display font-black">
      <img src={icon} alt="" width={64} height={64} />
      <span>{label}</span>
    </Button>
  );
}

function SkinPreview({ skin, animated = true }: { skin: Skin; animated?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const loop = (t: number) => {
      const dpr = Math.min(devicePixelRatio, 1.5);
      const w = cv.clientWidth,
        h = cv.clientHeight;
      if (cv.width !== w * dpr) {
        cv.width = w * dpr;
        cv.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const pts = [];
      const wd = h * 0.26;
      for (let i = 0; i < 60; i++) {
        const x = w * 0.85 - i * ((w * 0.7) / 60);
        pts.push({ x, y: h / 2 + Math.sin(t / 260 - i * 0.18) * h * 0.18 });
      }
      const head = pts[0];
      const next = pts[1];
      if (!head || !next) return;
      const a = Math.atan2(head.y - next.y, head.x - next.x);
      drawWorm(ctx, pts, a, wd, skin, false, 1);
      if (animated && !matchMedia("(prefers-reduced-motion: reduce)").matches) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [skin, animated]);
  return <canvas ref={ref} className="aspect-[5/2] w-full" />;
}
