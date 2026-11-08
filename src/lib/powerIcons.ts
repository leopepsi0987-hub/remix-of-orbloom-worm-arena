import speedUrl from "@/assets/power-speed.png";
import magnetUrl from "@/assets/power-magnet.png";
import shieldUrl from "@/assets/power-shield.png";
import doubleUrl from "@/assets/power-double.png";
import slowUrl from "@/assets/power-slow.png";
import type { PowerKind } from "@/lib/powers";

/** Real artwork for every power, shared by the HUD badges and the arena sprites. */
export const POWER_ICON_URLS: Record<PowerKind, string> = {
  speed: speedUrl,
  magnet: magnetUrl,
  shield: shieldUrl,
  double: doubleUrl,
  slow: slowUrl,
};
