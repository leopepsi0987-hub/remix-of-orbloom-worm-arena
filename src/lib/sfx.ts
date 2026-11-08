let ctx: AudioContext | null = null;
let master: GainNode | null = null;
export let muted = false;
export function setMuted(m: boolean) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.5;
}
function ac() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}
export function audio() {
  const c = ac();
  return { ctx: c, master: master! };
}
function tone(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0, delay = 0) {
  const c = ac();
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master!);
  o.start(t);
  o.stop(t + dur + 0.02);
}

let combo = 0;
let lastEat = 0;
export function sfxEat(big = false) {
  const now = performance.now();
  combo = now - lastEat < 400 ? Math.min(combo + 1, 12) : 0;
  lastEat = now;
  const f = 520 * Math.pow(2, combo / 12);
  tone(f, 0.09, "triangle", big ? 0.35 : 0.2, f * 0.6);
  if (big) tone(f * 1.5, 0.12, "sine", 0.15, 0, 0.04);
}
export function sfxBoost() {
  tone(180, 0.25, "sawtooth", 0.08, 400);
}
export function sfxDeath() {
  tone(400, 0.6, "square", 0.18, -340);
  tone(200, 0.8, "sawtooth", 0.12, -150, 0.1);
}
export function sfxStart() {
  [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.15, "square", 0.12, 0, i * 0.09));
}
export function sfxKill() {
  [784, 988, 1318].forEach((f, i) => tone(f, 0.12, "triangle", 0.2, 0, i * 0.06));
}
