import { audio } from "@/lib/sfx";

/** Tiny procedural chiptune loop, scheduled ahead on the Web Audio clock. */
const BPM = 92;
const STEP = 60 / BPM / 4; // 16th notes
// A minor groove: Am - F - C - G
const ROOTS = [57, 53, 60, 55];
const ARP = [0, 7, 12, 7, 3, 7, 10, 7];

let timer: ReturnType<typeof setInterval> | null = null;
let gain: GainNode | null = null;
let next = 0;
let n = 0;
let on = true;

const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function note(c: AudioContext, f: number, t: number, d: number, type: OscillatorType, v: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = f;
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(gain!);
  o.start(t);
  o.stop(t + d + 0.02);
}

function schedule() {
  const { ctx } = audio();
  while (next < ctx.currentTime + 0.15) {
    const bar = Math.floor(n / 16) % ROOTS.length;
    const s = n % 16;
    const root = ROOTS[bar]!;
    if (s === 0 || s === 8) note(ctx, hz(root - 24), next, STEP * 7, "sine", 0.35);
    if (s % 4 === 0) note(ctx, hz(root + (ARP[(s / 4 + bar) % ARP.length] ?? 0)), next, STEP * 3.5, "triangle", 0.09);
    if (s === 0) note(ctx, 70, next, 0.18, "sine", 0.3);
    next += STEP;
    n++;
  }
}

export function startMusic() {
  if (!on || timer) return;
  const { ctx, master } = audio();
  if (!gain) {
    gain = ctx.createGain();
    gain.gain.value = 0.14;
    const soft = ctx.createBiquadFilter(); soft.type = "lowpass"; soft.frequency.value = 1400;
    gain.connect(soft).connect(master);
  }
  next = ctx.currentTime + 0.05;
  timer = setInterval(schedule, 40);
}
export function stopMusic() {
  if (timer) clearInterval(timer);
  timer = null;
}
export function setMusicOn(v: boolean) {
  on = v;
  if (v) startMusic();
  else stopMusic();
}
