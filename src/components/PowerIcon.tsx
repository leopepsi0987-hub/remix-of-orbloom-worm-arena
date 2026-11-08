import { POWER_ICON_URLS } from "@/lib/powerIcons";
import type { PowerKind } from "@/lib/powers";

export function PowerIcon({ kind }: { kind: PowerKind }) {
  return <img src={POWER_ICON_URLS[kind]} alt="" width={20} height={20} className="h-5 w-5" aria-hidden="true" />;
}
