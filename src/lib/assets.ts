import logo from "@/assets/logo-wormz.png";
import garden from "@/assets/lobby-garden.jpg";
import ground from "@/assets/arena-ground.jpg";
import sound from "@/assets/icon-sound.png";
import music from "@/assets/icon-music.png";
import boost from "@/assets/icon-boost.png";
import rotate from "@/assets/icon-rotate.png";
import trophy from "@/assets/icon-trophy.png";
import players from "@/assets/icon-players.png";
import skins from "@/assets/icon-skins.png";
import play from "@/assets/icon-play.png";
import apple from "@/assets/food-apple.png";
import donut from "@/assets/food-donut.png";
import candy from "@/assets/food-candy.png";
import powerSpeed from "@/assets/power-speed.png";
import powerMagnet from "@/assets/power-magnet.png";
import powerShield from "@/assets/power-shield.png";
import powerDouble from "@/assets/power-double.png";
import powerSlow from "@/assets/power-slow.png";
import reactions from "@/assets/reaction-faces.png";

export const GAME_ASSETS = [logo, garden, ground, sound, music, boost, rotate, trophy, players, skins, play, apple, donut, candy, powerSpeed, powerMagnet, powerShield, powerDouble, powerSlow, reactions];
const images = new Map<string, HTMLImageElement>();

export function cachedImage(url: string) {
  return images.get(url);
}

export async function preloadAssets(urls: string[], onProgress: (loaded: number, total: number) => void) {
  let loaded = 0;
  onProgress(0, urls.length);
  await Promise.all(urls.map(async (url) => {
    if (!images.has(url)) {
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Artwork download timed out")), 30000);
        image.onload = () => { clearTimeout(timeout); resolve(); };
        image.onerror = () => { clearTimeout(timeout); reject(new Error("Artwork could not be downloaded")); };
        image.src = url;
      });
      await image.decode();
      images.set(url, image);
    }
    onProgress(++loaded, urls.length);
  }));
}