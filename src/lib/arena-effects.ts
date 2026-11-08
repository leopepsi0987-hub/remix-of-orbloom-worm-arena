import reactionsUrl from '@/assets/reaction-faces.png';
import { cachedImage } from './assets';
import { WEATHER_RULES, fogAmount, type Weather } from './weather';

export function bakeReactions() {
  const image = cachedImage(reactionsUrl);
  return [0, 1, 2].map(index => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 96;
    const ctx = cv.getContext('2d');
    if (ctx && image) ctx.drawImage(image, image.naturalWidth / 3 * index, 0, image.naturalWidth / 3, image.naturalHeight, 0, 0, 96, 96);
    return cv;
  });
}
// age = frames since the reaction began. Pop in with overshoot, act out a face-specific move, pop out.
export function drawReaction(ctx: CanvasRenderingContext2D, art: HTMLCanvasElement | undefined, x: number, y: number, age: number, duration: number, face: number, reduced: boolean) {
  if (!art) return;
  const inT = Math.min(1, age / 14), outT = Math.min(1, (duration - age) / 12);
  const back = (t: number) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
  let size = 52 * (reduced ? 1 : back(inT)) * Math.max(0, outT), dx = 0, dy = -62 - (1 - inT) * 16, rot = 0, sx = 1, sy = 1;
  if (!reduced) {
    const t = age / 60;
    if (face === 0) { const k = Math.abs(Math.sin(t * 22)); sy = 1 - k * 0.14; sx = 1 + k * 0.1; dy -= k * 7; rot = Math.sin(t * 11) * 0.22; }
    else if (face === 1) { rot = Math.sin(t * 3.5) * 0.18; dy += Math.sin(t * 7) * 3; sx = sy = 1 + Math.sin(t * 7) * 0.04; }
    else { dx = Math.sin(age * 1.9) * 2.5 * (1 - inT * 0.5); sy = 1 + Math.max(0, 1 - age / 20) * 0.25; sx = 2 - sy; }
  }
  if (size <= 1) return;
  ctx.save(); ctx.translate(x + dx, y + dy); ctx.rotate(rot);
  ctx.globalAlpha = 0.25 * Math.max(0, outT); ctx.fillStyle = face === 2 ? '#ff8a7a' : '#ffe27a';
  ctx.beginPath(); ctx.arc(0, 0, size * 0.62 + (reduced ? 0 : Math.sin(age * 0.2) * 3), 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = Math.max(0, outT);
  if (!reduced && age < 30) { // burst rays on arrival
    const r = size * (0.6 + age / 30 * 0.6); ctx.strokeStyle = '#fff6c8'; ctx.lineWidth = 3 * (1 - age / 30); ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke(); }
  }
  ctx.scale(sx, sy); ctx.drawImage(art, -size / 2, -size / 2, size, size); ctx.restore();
}
export function drawStrikes(ctx: CanvasRenderingContext2D, weather: Weather, frame: number, time: number, colors: { warning: string; light: string }, reduced: boolean) {
  for (const strike of weather.strikes) {
    const waiting = frame < strike.at;
    ctx.save(); ctx.translate(strike.x, strike.y);
    ctx.strokeStyle = colors.warning; ctx.fillStyle = colors.warning;
    ctx.globalAlpha = waiting ? 0.13 : 0.3; ctx.beginPath(); ctx.arc(0, 0, WEATHER_RULES.radius, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.9; ctx.lineWidth = 3; ctx.setLineDash(waiting ? [8, 8] : []);
    ctx.beginPath(); ctx.arc(0, 0, WEATHER_RULES.radius, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    if (waiting) {
      ctx.beginPath(); ctx.moveTo(-5, -15); ctx.lineTo(-12, 3); ctx.lineTo(3, 0); ctx.lineTo(-3, 15); ctx.lineTo(13, -7); ctx.lineTo(0, -4); ctx.closePath(); ctx.fill();
      ctx.font = 'bold 13px Trebuchet MS'; ctx.textAlign = 'center'; ctx.globalAlpha = 1; ctx.fillText(`${Math.ceil((strike.at - frame) / 60)}`, 0, 35);
    } else {
      ctx.strokeStyle = colors.light; ctx.lineWidth = reduced ? 4 : 7;
      ctx.beginPath(); ctx.moveTo(10, -200); ctx.lineTo(-16, -140); ctx.lineTo(14, -144); ctx.lineTo(-18, -65); ctx.lineTo(12, -70); ctx.lineTo(0, 0); ctx.stroke();
      if (!reduced) { ctx.globalAlpha = 0.35; ctx.lineWidth = 18; ctx.stroke(); }
    }
    ctx.restore();
  }
}
// One tiny pre-baked radial veil stretched once, never blur or full-size art.
export function bakeFog(color: string) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 192;
  const ctx = cv.getContext('2d');
  if (ctx) { const g = ctx.createRadialGradient(96, 96, 32, 96, 96, 96); g.addColorStop(0, 'transparent'); g.addColorStop(0.32, 'transparent'); g.addColorStop(0.72, color); g.addColorStop(1, color); ctx.fillStyle = g; ctx.fillRect(0, 0, 192, 192); }
  return cv;
}
export function drawFog(ctx: CanvasRenderingContext2D, fog: HTMLCanvasElement, weather: Weather, frame: number, W: number, H: number, scale: number, color: string) {
  const opacity = fogAmount(weather, frame); if (!opacity) return;
  const size = WEATHER_RULES.safeVision * scale * 2.7;
  const x = (W - size) / 2, y = (H - size) / 2;
  ctx.save(); ctx.globalAlpha = opacity; ctx.fillStyle = color;
  if (x > 0) { ctx.fillRect(0, 0, x, H); ctx.fillRect(x + size, 0, W, H); }
  if (y > 0) { ctx.fillRect(Math.max(0, x), 0, size, y); ctx.fillRect(Math.max(0, x), y + size, size, H); }
  ctx.drawImage(fog, x, y, size, size); ctx.restore();
}