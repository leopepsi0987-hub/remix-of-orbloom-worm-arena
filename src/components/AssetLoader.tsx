import { useEffect, useRef, useState, type ReactNode } from "react";
import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GAME_ASSETS, preloadAssets } from "@/lib/assets";

export function AssetLoader({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    preloadAssets(GAME_ASSETS, (loaded, total) => {
      if (!cancelled) setProgress(Math.round(loaded / total * 100));
    }).then(() => { if (!cancelled) setDownloaded(true); }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [attempt]);
  useEffect(() => {
    if (!downloaded) return;
    let cancelled = false;
    const visibleImages = Array.from(stage.current?.querySelectorAll("img") ?? []);
    Promise.all(visibleImages.map(image => image.decode())).then(() => {
      if (!cancelled) setReady(true);
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [downloaded, attempt]);
  return <>
    {downloaded && <div ref={stage} aria-hidden={!ready} inert={!ready} className={ready ? "" : "invisible"}>{children}</div>}
    {!ready && <main className="loading-screen fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-card px-8 text-center text-foreground">
    <Download className="size-10 text-primary" />
    <h1 className="font-display text-4xl font-black">WORMZ</h1>
    <p className="font-display font-bold" role="status">{failed ? "Download interrupted" : "Downloading assets…"}</p>
    <progress aria-label="Assets downloaded" className="asset-progress h-3 w-full max-w-xs" max={100} value={progress} />
    <span className="font-mono text-sm tabular-nums">{progress}%</span>
    {failed && <Button onClick={() => setAttempt(v => v + 1)}><RefreshCw /> Retry download</Button>}
  </main>}
  </>;
}