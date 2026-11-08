import { useEffect, useRef, useState } from "react";
import groundUrl from "@/assets/arena-ground.jpg";
import appleUrl from "@/assets/food-apple.png";
import donutUrl from "@/assets/food-donut.png";
import candyUrl from "@/assets/food-candy.png";
import soundUrl from "@/assets/icon-sound.png";
import musicUrl from "@/assets/icon-music.png";
import boostUrl from "@/assets/icon-boost.png";
import rotateUrl from "@/assets/icon-rotate.png";
import { drawWorm, randomSkin, skinById, type Skin } from "@/lib/skins";
import { setMusicOn, startMusic } from "@/lib/music";
import { Home } from "@/components/Home";
import { RoundEnd } from "@/components/RoundEnd";
import { sfxBoost, sfxDeath, sfxEat, sfxKill, sfxStart, setMuted } from "@/lib/sfx";
import {
  AI,
  BASE_SPEED,
  CountGrid,
  PointGrid,
  clampTurn,
  decide,
  makeTag,
  whisker,
  type BotView,
  type Intent,
  type V,
} from "@/lib/bots";
import { Leaderboard, type BoardRow } from "@/components/Leaderboard";
import { Button } from "@/components/ui/button";
import { FOOD_RULES, addBoundedFood, expireFood, boostedLength, type ArenaFood } from "@/lib/food";
import { cachedImage } from "@/lib/assets";
import { POWER_KINDS, POWER_LABELS, POWER_RULES, activatePower, hasPower, pickupDropY, powerSpeed, powerFoodValue, updatePickups, type ActivePowers, type Pickup, type PowerKind } from "@/lib/powers";
import { PowerIcon } from "@/components/PowerIcon";
import { POWER_ICON_URLS } from "@/lib/powerIcons";
import { ModeSelect, type GameMode } from "@/components/ModeSelect";
import { useWallet } from '@/hooks/use-wallet';
import { WEATHER_RULES, nextStorm, fogAmount, lightningLength, strikeHits } from '@/lib/weather';
import { KILL_RULES, registerKill, type KillChain } from '@/lib/kill-streak';
import { bakeFog, bakeReactions, drawFog, drawReaction, drawStrikes } from '@/lib/arena-effects';

type Worm = {
  id: number;
  name: string;
  skin: Skin;
  pts: V[];
  angle: number;
  len: number;
  alive: boolean;
  player: boolean;
  team: number;
  boost: boolean;
  wantBoost: boolean;
  target: number;
  think: number;
  spin: number;
  intent: Intent;
  immuneUntil: number;
  reaction: { face: number; until: number } | null;
};

const R = 1600;
const SEG = 6;

/** Bots per mode: allies share the player's team and never kill them. */
const MODE_SETUP: Record<GameMode, { allies: number; enemies: number }> = {
  duel: { allies: 0, enemies: 1 },
  teams: { allies: 3, enemies: 4 },
  frenzy: { allies: 0, enemies: 30 },
};
const MODE_LABEL: Record<GameMode, string> = { duel: "1 vs 1", teams: "4 vs 4", frenzy: "1 vs 30" };
const FOOD_TARGET = FOOD_RULES.normalTarget;
const TOP_N = 8;

let nextId = 1;

function rnd(a: number, b: number) {
  return a + Math.random() * (b - a);
}
function randInArena(m = 60): V {
  const a = Math.random() * Math.PI * 2;
  const d = Math.sqrt(Math.random()) * (R - m);
  return { x: Math.cos(a) * d, y: Math.sin(a) * d };
}
/** Bots shouldn't pop into existence on top of someone's face. */
function spawnSpot(avoid?: V): V {
  for (let i = 0; i < 12; i++) {
    const p = randInArena(220);
    if (!avoid || Math.hypot(p.x - avoid.x, p.y - avoid.y) > 360) return p;
  }
  return randInArena(220);
}
function makeWorm(player: boolean, name: string, skin: Skin, team: number, avoid?: V): Worm {
  const p = player ? { x: 0, y: 0 } : spawnSpot(avoid);
  const angle = Math.random() * Math.PI * 2;
  const pts: V[] = [];
  for (let i = 0; i < 20; i++) pts.push({ x: p.x - Math.cos(angle) * i * SEG, y: p.y - Math.sin(angle) * i * SEG });
  return {
    id: nextId++,
    name,
    skin,
    pts,
    angle,
    len: player ? 20 : rnd(22, 95),
    alive: true,
    player,
    team,
    boost: false,
    wantBoost: false,
    target: angle,
    think: Math.floor(rnd(0, 30)),
    spin: Math.random() < 0.5 ? -1 : 1,
    intent: "wander",
    immuneUntil: 0,
    reaction: null,
  };
}
const width = (w: Worm) => Math.min(14 + w.len * 0.05, 34);

function loadImg(src: string) {
  const cached = cachedImage(src);
  if (cached) return cached;
  const i = new Image();
  i.src = src;
  return i;
}

/**
 * Food art ships at 816px but is drawn at ~25px, and re-downsampling the full
 * bitmap hundreds of times a second is what actually costs the frame. Bake one
 * small copy per food type and draw from that instead.
 */
type Sprite = { cv: HTMLCanvasElement; ready: boolean };
function makeSprite(src: string, size = 96): Sprite {
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const g = cv.getContext("2d");
  const s: Sprite = { cv, ready: false };
  if (!g) return s;
  const bake = (img: HTMLImageElement) => {
    g.clearRect(0, 0, size, size);
    g.drawImage(img, 0, 0, size, size);
    s.ready = true;
  };
  const cached = cachedImage(src);
  if (cached) { bake(cached); return s; }
  const img = new Image();
  img.onload = () => bake(img);
  img.src = src;
  return s;
}

// shared input (mouse, keyboard, touch joystick)
const input = { angle: 0, hasAngle: false, boost: false };

export function WormGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const economy = useWallet();
  const economyRef = useRef(economy); economyRef.current = economy;
  const matchId = useRef('');
  const [earnedGold, setEarnedGold] = useState(0);
  const [savingGold, setSavingGold] = useState(false);
  const [kills, setKills] = useState(0);
  const [callout, setCallout] = useState<{ title: string; subtitle: string; key: number } | null>(null);
  const [stormOn, setStormOn] = useState(false);
  const rewardMatch = async (id: string) => {
    setSavingGold(true);
    const result = await economyRef.current.finish(id);
    if (result) setEarnedGold(result.reward);
    setSavingGold(false);
  };
  const [state, setState] = useState<"menu" | "modes" | "lobby" | "play" | "dead">("menu");
  const [mode, setMode] = useState<GameMode>("frenzy");
  const [won, setWon] = useState(false);
  const lastMode = useRef<GameMode>("frenzy");
  const [music, setMusic] = useState(true);
  const [len, setLen] = useState(20);
  const [skinId, setSkinId] = useState("emerald");
  const [nick, setNick] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const cfg = useRef({ skinId, nick, names, mode });
  cfg.current = { skinId, nick, names, mode };
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [runMax, setRunMax] = useState(0);
  const [place, setPlace] = useState(0);
  const [field, setField] = useState(0);
  const [touch, setTouch] = useState(false);
  const [mute, setMute] = useState(false);
  const [board, setBoard] = useState<BoardRow[]>([]);
  const [rank, setRank] = useState(0);
  const [alive, setAlive] = useState(0);
  const [powerStatus, setPowerStatus] = useState<{ kind: PowerKind; seconds: number }[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    setTouch(matchMedia("(pointer: coarse)").matches);

    setNick(localStorage.getItem("wormz.nick") ?? "");
    setBest(Number(localStorage.getItem("wormz.best") ?? 0));
  }, []);
  useEffect(() => {
    setSkinId(economy.wallet.equipped);
  }, [economy.wallet.equipped]);
  useEffect(() => {
    localStorage.setItem("wormz.skin", skinId);
  }, [skinId]);
  useEffect(() => {
    localStorage.setItem("wormz.nick", nick);
  }, [nick]);

  useEffect(() => {
    if (state !== "play") return;
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const imgs = [makeSprite(appleUrl), makeSprite(donutUrl), makeSprite(candyUrl)];
    const ground = loadImg(groundUrl);
    let pattern: CanvasPattern | null = null;
    let raf = 0;
    let frame = 0;
    input.hasAngle = false;
    input.boost = false;
    const pixelRatio = Math.min(devicePixelRatio, 1.5);
    const resize = () => {
      cv.width = innerWidth * pixelRatio;
      cv.height = innerHeight * pixelRatio;
    };
    resize();
    addEventListener("resize", resize);
    const coarse = matchMedia("(pointer: coarse)").matches;
    const mm = (e: PointerEvent) => {
      if (coarse) return;
      input.angle = Math.atan2(e.clientY - innerHeight / 2, e.clientX - innerWidth / 2);
      input.hasAngle = true;
    };
    const md = (e: PointerEvent) => {
      if (coarse) return;
      mm(e);
      input.boost = true;
    };
    const mu = () => {
      if (!coarse) input.boost = false;
    };
    const kd = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        input.boost = true;
        e.preventDefault();
      }
    };
    const ku = (e: KeyboardEvent) => {
      if (e.code === "Space") input.boost = false;
    };
    cv.addEventListener("pointermove", mm);
    cv.addEventListener("pointerdown", md);
    addEventListener("pointerup", mu);
    addEventListener("keydown", kd);
    addEventListener("keyup", ku);

    const setup = MODE_SETUP[cfg.current.mode];
    const used = new Set<string>(cfg.current.names);
    const player = makeWorm(true, cfg.current.nick.trim() || "You", skinById(cfg.current.skinId), 0);
    const worms: Worm[] = [player];
    const lobby = cfg.current.names.slice(1);
    let li = 0;
    for (let i = 0; i < setup.allies; i++) worms.push(makeWorm(false, lobby[li++] ?? makeTag(used), randomSkin(), 0, player.pts[0]));
    for (let i = 0; i < setup.enemies; i++) worms.push(makeWorm(false, lobby[li++] ?? makeTag(used), randomSkin(), cfg.current.mode === "frenzy" ? i + 1 : 1, player.pts[0])); // 1 vs 30 is every worm for itself
    const food: ArenaFood[] = [];
    const addFood = (x?: number, y?: number, v = 1.5, r = rnd(11, 15), kind = Math.floor(Math.random() * 3), loot = false) => {
      const p = x === undefined || y === undefined ? randInArena() : { x, y };
      addBoundedFood(food, { x: p.x, y: p.y, r, v, kind, rot: rnd(0, Math.PI * 2), expiresAt: loot ? frame + FOOD_RULES.deathLifetimeFrames : null });
    };
    for (let i = 0; i < FOOD_TARGET; i++) addFood();

    const foodGrid = new CountGrid(150);
    const bodyGrid = new PointGrid(150);
    let wasBoost = false;
    let maxLen = player.len;
    let chain: KillChain = { last: 0, chain: 0, total: 0 };
    let calloutUntil = 0;
    let rewardSent = false;
    const finishGold = () => { if (!rewardSent) { rewardSent = true; void rewardMatch(matchId.current); } };
    let weather = nextStorm(0);
    let lastStorm = false;
    const reactions = bakeReactions();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const active: ActivePowers = {};
    const pickups: Pickup[] = [];
    setPowerStatus([]);
    const powerArt = new Map<PowerKind, HTMLCanvasElement>();
    const palette = getComputedStyle(document.documentElement);
    const shieldColor = palette.getPropertyValue("--border").trim();
    const fogColor = palette.getPropertyValue('--storm-fog').trim();
    const fogSprite = bakeFog(fogColor);
    const stormColors = { warning: palette.getPropertyValue('--storm-warning').trim(), light: palette.getPropertyValue('--storm-light').trim() };
    // icons ship with wide transparent margins: trim to the badge so the arena
    // sprite reads as one full round icon
    for (const kind of POWER_KINDS) {
      const sprite = document.createElement("canvas"); sprite.width = sprite.height = 64;
      const g = sprite.getContext("2d");
      if (!g) continue;
      const img = cachedImage(POWER_ICON_URLS[kind]);
      if (!img || !img.naturalWidth) continue;
      const sw = 96;
      const sh = Math.max(1, Math.round(sw * img.naturalHeight / img.naturalWidth));
      const scan = document.createElement("canvas"); scan.width = sw; scan.height = sh;
      const sg = scan.getContext("2d");
      if (!sg) continue;
      sg.drawImage(img, 0, 0, sw, sh);
      let minX = sw, minY = sh, maxX = -1, maxY = -1;
      try {
        const data = sg.getImageData(0, 0, sw, sh).data;
        for (let y = 0; y < sh; y++) {
          for (let x = 0; x < sw; x++) {
            if (data[(y * sw + x) * 4 + 3]! > 8) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
      } catch { /* tainted canvas: fall back to the full image */ }
      if (minX > maxX) { minX = 0; minY = 0; maxX = sw - 1; maxY = sh - 1; }
      g.drawImage(img, minX / sw * img.naturalWidth, minY / sh * img.naturalHeight, (maxX - minX + 1) / sw * img.naturalWidth, (maxY - minY + 1) / sh * img.naturalHeight, 2, 2, 60, 60);
      powerArt.set(kind, sprite);
    }
    const spawnPower = (kind: PowerKind, near = false) => {
      const h = player.pts[0];
      if (!h) return;
      const angle = player.angle + rnd(-0.65, 0.65);
      const p = near ? { x: h.x + Math.cos(angle) * rnd(180, 360), y: h.y + Math.sin(angle) * rnd(180, 360) } : randInArena(200);
      if (Math.hypot(p.x, p.y) < R - 80) updatePickups(pickups, frame, { ...p, kind, expiresAt: frame + POWER_RULES.lifetime, spawnedAt: frame });
    };
    // one starter pickup drops in ahead of the player so the mechanic is visible
    spawnPower(POWER_KINDS[Math.floor(Math.random() * POWER_KINDS.length)]!, true);

    const kill = (w: Worm, killer?: Worm) => {
      if (!w.alive) return;
      w.alive = false;
      if (killer && killer.team !== w.team) {
        killer.reaction = { face: 0, until: frame + KILL_RULES.reactionDuration };
        if (killer.player) {
          const event = registerKill(chain, frame); chain = event;
          killer.reaction.face = event.face;
          setKills(event.total);
          setCallout({ title: event.title, subtitle: w.name, key: frame });
          calloutUntil = frame + 150; sfxKill();
        }
      }
      // fewer but much bigger, glowing drops so a kill feels like a jackpot
      const gap = Math.max(6, Math.floor(w.pts.length / 40));
      for (let i = 0; i < w.pts.length; i += gap) {
        const p = w.pts[i]!;
        if (Math.hypot(p.x, p.y) < R - 10)
          addFood(p.x + rnd(-10, 10), p.y + rnd(-10, 10), Math.max(4, (w.len / 40) * 1.2), rnd(22, 30), Math.floor(Math.random() * 3), true);
      }
      if (w.player) {
        finishGold();
        sfxDeath();
        setWon(false);
        const finalLen = Math.floor(w.len);
        setScore(finalLen);
        setRunMax(Math.floor(Math.max(maxLen, w.len)));
        // placement = worms still ahead of you when you died
        setPlace(worms.filter((o) => o.alive && o !== w && o.len > w.len).length + 1);
        setField(worms.length);
        setBest((b) => {
          const nb = Math.max(b, finalLen);
          localStorage.setItem("wormz.best", String(nb));
          return nb;
        });
        setState("dead");
      } else {
        if (Math.hypot(w.pts[0]!.x - player.pts[0]!.x, w.pts[0]!.y - player.pts[0]!.y) < 600) sfxKill();
        // duel and team battles end the moment the last rival falls
        if (cfg.current.mode !== "frenzy" && !worms.some((o) => o.alive && o.team !== 0)) {
          setScore(Math.floor(player.len));
          setRunMax(Math.floor(Math.max(maxLen, player.len)));
          setPlace(1);
          setField(worms.length);
          setWon(true);
          const finalLen = Math.floor(player.len);
          setBest(b => { const next = Math.max(b, finalLen); localStorage.setItem('wormz.best', String(next)); return next; });
          finishGold(); setState("dead");
        }
      }
    };

    const step = () => {
      frame++;
      if (calloutUntil && frame >= calloutUntil) { setCallout(null); calloutUntil = 0; }
      if (frame >= weather.ends) weather = nextStorm(frame);
      const storm = frame >= weather.starts && frame < weather.ends;
      if (storm !== lastStorm) { setStormOn(storm); lastStorm = storm; }
      weather.strikes = weather.strikes.filter(strike => frame < strike.at + WEATHER_RULES.flash);
      if (storm && frame >= weather.nextStrike && weather.strikes.length < WEATHER_RULES.maxStrikes && frame + WEATHER_RULES.warning < weather.ends) {
        const head = player.pts[0];
        const angle = rnd(0, Math.PI * 2), distance = rnd(150, 400);
        const spot = head && Math.random() < 0.65 ? { x: head.x + Math.cos(angle) * distance, y: head.y + Math.sin(angle) * distance } : randInArena(160);
        if (Math.hypot(spot.x, spot.y) < R - 90) weather.strikes.push({ ...spot, at: frame + WEATHER_RULES.warning, applied: false });
        weather.nextStrike = frame + WEATHER_RULES.strikeEvery;
      }
      for (const strike of weather.strikes) {
        if (strike.applied || frame < strike.at) continue;
        strike.applied = true;
        for (const worm of worms) {
          const head = worm.pts[0];
          if (!worm.alive || !head || !strikeHits(strike, head, frame, worm.immuneUntil, worm.player && hasPower(active, 'shield', frame))) continue;
          worm.len = lightningLength(worm.len); worm.immuneUntil = frame + WEATHER_RULES.immunity;
          worm.reaction = { face: 2, until: frame + KILL_RULES.reactionDuration };
          if (worm.player) { setCallout({ title: 'ZAPPED!', subtitle: '−20% length', key: frame }); calloutUntil = frame + 120; }
        }
      }
      expireFood(food, frame);
      updatePickups(pickups, frame);
      if (frame % POWER_RULES.spawnEvery === 0 && pickups.length < POWER_RULES.maxPickups) {
        const kind = POWER_KINDS[Math.floor(Math.random() * POWER_KINDS.length)]!;
        spawnPower(kind, Math.random() < 0.5);
      }
      // body map every frame, food map every few frames
      bodyGrid.clear();
      for (const w of worms) {
        if (!w.alive) continue;
        for (let i = 0; i < w.pts.length; i += 2) bodyGrid.add(w.id, w.pts[i]!.x, w.pts[i]!.y);
      }
      if (frame % 6 === 0) {
        foodGrid.clear();
        for (const f of food) foodGrid.add(f.x, f.y);
      }

      for (const w of worms) {
        if (!w.alive) continue;
        const h = w.pts[0]!;
        if (w.player) {
          if (input.hasAngle) w.target = input.angle;
          w.boost = input.boost && w.len > 15;
          if (w.boost && !wasBoost) sfxBoost();
          wasBoost = w.boost;
        } else {
          // re-think every so often, not every frame
          if (--w.think <= 0) {
            w.think = Math.floor(rnd(24, 48));
            if (Math.random() < 0.3) w.spin *= -1;
            const others: BotView[] = [];
            for (const o of worms) {
              const otherHead = o.pts[0];
              if (otherHead && o !== w && o.alive && o.team !== w.team && (!storm || Math.hypot(otherHead.x - h.x, otherHead.y - h.y) < WEATHER_RULES.safeVision)) others.push({ head: otherHead, angle: o.angle, len: o.len });
            }
            const d = decide(
              { head: h, angle: w.angle, len: w.len },
              others,
              foodGrid.best(h, 5),
              w.boost ? BASE_SPEED * 2 : BASE_SPEED,
            );
            w.intent = d.intent;
            w.target = d.target;
            w.wantBoost = d.boost;
          }
          // the wall beats every intention
          if (Math.hypot(h.x, h.y) > R - 260) w.target = Math.atan2(-h.y, -h.x);
          // ...and so does a body in the way
          const avoid = whisker({ head: h, angle: w.angle, len: w.len }, bodyGrid, w.id, 190, w.spin);
          if (avoid !== null) w.target = avoid;
          // Bots obey the same visible storm danger and fog sight limit.
          for (const strike of weather.strikes) {
            if (frame < strike.at && Math.hypot(h.x - strike.x, h.y - strike.y) < WEATHER_RULES.radius + 130) w.target = Math.atan2(h.y - strike.y, h.x - strike.x);
          }
          w.boost = w.wantBoost && w.len > AI.MIN_BOOST_LEN;
        }
        w.angle = clampTurn(w.angle, w.target, 0.09);
        const sp = (w.boost ? BASE_SPEED * 2 : BASE_SPEED) * powerSpeed(active, frame, w.player);
        const nh = { x: h.x + Math.cos(w.angle) * sp, y: h.y + Math.sin(w.angle) * sp };
        w.pts.unshift(nh);
        let total = 0,
          i = 1;
        for (; i < w.pts.length; i++) {
          total += Math.hypot(w.pts[i]!.x - w.pts[i - 1]!.x, w.pts[i]!.y - w.pts[i - 1]!.y);
          if (total > w.len * SEG * 0.5) break;
        }
        w.pts.length = Math.min(w.pts.length, i + 1);
        if (w.boost) {
          w.len = boostedLength(w.len);
        }
        if (w.player && w.len > maxLen) maxLen = w.len;
        if (w.player) {
          for (let i = pickups.length - 1; i >= 0; i--) {
            const pickup = pickups[i];
            if (pickup && Math.hypot(nh.x - pickup.x, nh.y - pickup.y) < POWER_RULES.radius + width(w) / 2) {
              activatePower(active, pickup.kind, frame);
              pickups.splice(i, 1); sfxEat(true);
            }
          }
        }
        if (Math.hypot(nh.x, nh.y) > R - width(w) / 2) {
          kill(w);
          continue;
        }
        const er = width(w) / 2 + 8;
        for (let f = food.length - 1; f >= 0; f--) {
          const fd = food[f]!;
          if (w.player && hasPower(active, "magnet", frame)) {
            const distance = Math.hypot(fd.x - nh.x, fd.y - nh.y);
            if (distance > 1 && distance < POWER_RULES.magnetRadius) {
              const pull = Math.min(6, distance);
              fd.x += (nh.x - fd.x) / distance * pull;
              fd.y += (nh.y - fd.y) / distance * pull;
            }
          }
          const dx = fd.x - nh.x,
            dy = fd.y - nh.y;
          if (dx * dx + dy * dy < (er + fd.r) ** 2) {
            w.len += w.player ? powerFoodValue(active, frame, fd.v) : fd.v;
            if (w.player) maxLen = Math.max(maxLen, w.len);
            food.splice(f, 1);
            if (w.player && fd.v >= 1) sfxEat(fd.v >= 3);
          }
        }
      }

      for (const w of worms) {
        if (!w.alive) continue;
        const h = w.pts[0]!;
        if (w.player && hasPower(active, "shield", frame)) continue;
        for (const o of worms) {
          if (o === w || !o.alive || o.team === w.team) continue;
          const rr = ((width(o) + width(w)) / 2) * 0.8;
          let hit = false;
          for (let i = 0; i < o.pts.length; i += 2) {
            const dx = o.pts[i]!.x - h.x,
              dy = o.pts[i]!.y - h.y;
            if (dx * dx + dy * dy < rr * rr) {
              hit = true;
              break;
            }
          }
          if (hit) {
            kill(w, o);
            break;
          }
        }
      }

      for (let i = worms.length - 1; i >= 0; i--) {
        const w = worms[i]!;
        if (!w.alive && !w.player && cfg.current.mode === "frenzy") {
          used.delete(w.name);
          worms[i] = makeWorm(false, makeTag(used), randomSkin(), w.team, player.pts[0]);
        }
      }
      if (frame % 30 === 0) {
        const normalCount = food.reduce((count, item) => count + (item.expiresAt === null ? 1 : 0), 0);
        for (let i = normalCount; i < FOOD_TARGET; i++) addFood();
      }

      // lobby standings, a few times a second
      if (frame % 12 === 0) {
        const rows: BoardRow[] = [];
        for (const w of worms) if (w.alive) rows.push({ name: w.name, len: w.len, player: w.player, core: w.skin.colors[0]! });
        rows.sort((a, b) => b.len - a.len);
        setAlive(rows.length);
        setLen(Math.floor(player.len));
        setBoard(rows.slice(0, TOP_N));
        setRank(rows.findIndex((r) => r.player) + 1);
        setPowerStatus(POWER_KINDS.filter(kind => hasPower(active, kind, frame)).map(kind => ({ kind, seconds: Math.ceil(((active[kind] ?? frame) - frame) / 60) })));
      }
    };

    const draw = (t: number) => {
      const dpr = pixelRatio;
      const W = cv.width,
        H = cv.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#03060a";
      ctx.fillRect(0, 0, W, H);
      const cam = player.pts[0]!;
      const zoom = Math.max(0.55, 1 - player.len / 1500) * (Math.min(W, H) / dpr < 500 ? 0.72 : 1);
      const s = dpr * zoom;
      ctx.setTransform(s, 0, 0, s, W / 2 - cam.x * s, H / 2 - cam.y * s);
      if (!pattern && ground.complete && ground.naturalWidth) pattern = ctx.createPattern(ground, "repeat");
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.fillStyle = pattern ?? "#0e1320";
      ctx.fill();
      ctx.restore();
      // arena edge: stacked plain strokes read as a glow without shadowBlur,
      // which re-blurs the whole ring every frame. Only worth drawing when the
      // ring is actually inside the view.
      const viewR = Math.hypot(W / 2 / s, H / 2 / s);
      if (Math.hypot(cam.x, cam.y) > R - viewR - 80) {
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,59,92,0.16)";
        ctx.lineWidth = 54;
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,59,92,0.34)";
        ctx.lineWidth = 24;
        ctx.stroke();
        ctx.strokeStyle = "#ff3b5c";
        ctx.lineWidth = 10;
        ctx.stroke();
      }
      // food (only visible)
      const vw = W / s / 2 + 40,
        vh = H / s / 2 + 40;
      for (const f of food) {
        if (Math.abs(f.x - cam.x) > vw || Math.abs(f.y - cam.y) > vh) continue;
        const sp = imgs[f.kind]!;
        if (!sp.ready) continue;
        const pulse = 1 + Math.sin(t / 300 + f.rot * 5) * 0.08;
        const sz = f.r * 2.4 * pulse;
        if (f.v >= 4) {
          // death drop: soft halo from stacked translucent circles (no blur)
          ctx.fillStyle = "#fff3a0";
          for (const [k, a] of [[1.5, 0.12], [1.15, 0.2]] as const) {
            ctx.globalAlpha = a;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.r * k * pulse, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);
        ctx.drawImage(sp.cv, -sz / 2, -sz / 2, sz, sz);
        ctx.restore();
      }
      const cullR = Math.hypot(vw, vh);
      for (const pickup of pickups) {
        if (Math.abs(pickup.x - cam.x) > vw || Math.abs(pickup.y - cam.y) > vh) continue;
        const art = powerArt.get(pickup.kind);
        if (!art) continue;
        // drop-in: the icon falls from above while its landing shadow hardens
        const dy = pickupDropY(pickup, frame);
        ctx.globalAlpha = 0.3 * (1 - Math.min(1, Math.abs(dy) / POWER_RULES.dropHeight));
        ctx.fillStyle = "#03060a";
        ctx.beginPath();
        ctx.ellipse(pickup.x, pickup.y + 12, 15, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.drawImage(art, pickup.x - 28, pickup.y - 28 + dy, 56, 56);
      }
      if (hasPower(active, "shield", frame)) {
        ctx.beginPath(); ctx.arc(cam.x, cam.y, width(player) + 14, 0, Math.PI * 2);
        ctx.strokeStyle = shieldColor; ctx.lineWidth = 4; ctx.stroke();
      }
      for (const w of worms) {
        if (!w.alive) continue;
        const h = w.pts[0]!;
        // skip worms whose whole body is surely off-screen
        if (Math.hypot(h.x - cam.x, h.y - cam.y) > cullR + w.pts.length * BASE_SPEED) continue;
        drawWorm(ctx, w.pts, w.angle, width(w), w.skin, w.boost);
        if (w.reaction && frame < w.reaction.until) drawReaction(ctx, reactions[w.reaction.face], h.x, h.y, frame - (w.reaction.until - KILL_RULES.reactionDuration), KILL_RULES.reactionDuration, w.reaction.face, reduced);
      }


      // gamer tags, screen space so they stay readable at any zoom
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.textAlign = "center";
      ctx.font = `bold ${(H / dpr < 500 ? 10 : 12) * dpr}px ui-monospace, monospace`;
      for (const w of worms) {
        if (!w.alive) continue;
        const p = w.pts[0]!;
        if (fogAmount(weather, frame) > 0.3 && Math.hypot(p.x - cam.x, p.y - cam.y) > WEATHER_RULES.safeVision) continue;
        const sx = (p.x - cam.x) * s + W / 2;
        const sy = (p.y - cam.y) * s + H / 2;
        if (sx < -80 || sx > W + 80 || sy < -40 || sy > H + 40) continue;
        const off = width(w) * s * 0.6 + 16 * dpr;
        ctx.lineWidth = 3 * dpr;
        ctx.strokeStyle = "rgba(3,6,10,0.8)";
        ctx.strokeText(w.name, sx, sy - off);
        ctx.fillStyle = w.skin.glow;
        ctx.fillText(w.name, sx, sy - off);
      }
      drawFog(ctx, fogSprite, weather, frame, W, H, s, fogColor);
      ctx.setTransform(s, 0, 0, s, W / 2 - cam.x * s, H / 2 - cam.y * s);
      drawStrikes(ctx, weather, frame, t, stormColors, reduced);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    };

    let previous = 0;
    let elapsed = 0;
    const loop = (t: number) => {
      elapsed += previous ? Math.min(t - previous, 50) : 1000 / 60;
      previous = t;
      while (elapsed >= 1000 / 60 && player.alive && stateRef.current === "play") {
        step();
        elapsed -= 1000 / 60;
      }
      // a single bad frame must never stop the match
      try { draw(t); } catch (error) { console.error('draw frame failed', error); }
      if (player.alive) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
      removeEventListener("pointerup", mu);
      removeEventListener("keydown", kd);
      removeEventListener("keyup", ku);
    };
  }, [state]);

  const openLobby = async (m: GameMode) => {
    if (savingGold) return;
    const id = crypto.randomUUID();
    if (economyRef.current.ready) {
      const started = await economyRef.current.start(id);
      if (!started) return;
    }
    matchId.current = id;
    setKills(0); setEarnedGold(0); setCallout(null); setStormOn(false);
    sfxStart();
    startMusic();
    lastMode.current = m;
    setMode(m);
    setWon(false);
    const setup = MODE_SETUP[m];
    const used = new Set<string>();
    const list = ["You"];
    for (let i = 0; i < setup.allies + setup.enemies; i++) list.push(makeTag(used));
    setNames(list);
    setState("play");
    // phones: go fullscreen + landscape when the browser allows it
    if (matchMedia("(pointer: coarse)").matches) {
      const el = document.documentElement;
      el.requestFullscreen?.()
        .then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape"))
        .catch(() => {});
    }
  };

  const iconBtn = "audio-button h-10 w-10 shrink-0 rounded-full bg-card/80 p-1.5 transition-opacity sm:h-12 sm:w-12";

  return (
    <div className="fixed inset-0 overflow-hidden bg-background select-none">
      <canvas ref={canvasRef} className="h-full w-full touch-none" />

      {/* top-left HUD: length + audio toggles */}
      {state !== "dead" && <div className={`audio-hud absolute left-2 top-2 z-30 flex items-center gap-2 sm:left-3 sm:top-3 ${state === "play" ? "in-match" : ""}`}>
        <Button variant="ghost" size="icon"
          onClick={() => {
            setMute(!mute);
            setMuted(!mute);
          }}
          className={`${iconBtn} ${mute ? "opacity-40 grayscale" : ""}`}
          aria-label={mute ? "Unmute" : "Mute"}
        >
          <img src={soundUrl} alt="" width={40} height={40} className="h-full w-full object-contain" />
        </Button>
        <Button variant="ghost" size="icon"
          onClick={() => {
            setMusic(!music);
            setMusicOn(!music);
          }}
          className={`${iconBtn} ${music ? "" : "opacity-40 grayscale"}`}
          aria-label={music ? "Music off" : "Music on"}
        >
          <img src={musicUrl} alt="" width={40} height={40} className="h-full w-full object-contain" />
        </Button>
        {state === "play" && (
          <div className="length-badge rounded-lg bg-card/80 px-3 py-1.5 font-mono text-sm font-bold text-foreground">
            Length <span className="text-primary tabular-nums">{len}</span>
          </div>
        )}
      </div>}

      {state === "play" && <div className="power-hud" aria-label="Active powers">{powerStatus.map(({ kind, seconds }) => <div key={kind} className="power-badge" title={`${POWER_LABELS[kind]}: ${seconds}s`} aria-label={`${POWER_LABELS[kind]} ${seconds} seconds`}><PowerIcon kind={kind} /><span>{seconds}s</span></div>)}</div>}

      {state === "play" && <Leaderboard rows={board} rank={rank} alive={alive} />}

      {state === "play" && (
        <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-lg bg-card/80 px-3 py-1 font-display text-xs font-black uppercase tracking-wide text-muted-foreground">
          {MODE_LABEL[mode]}
        </div>
      )}
      {state === "play" && callout && <div key={callout.key} role="status" className="kill-callout font-display"><strong>{callout.title}</strong><span>{callout.subtitle}</span></div>}
      {state === "play" && stormOn && <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-xs font-black text-primary">FOG STORM</div>}
      {state === "play" && touch && <TouchControls />}

      {state === "dead" && (
        <RoundEnd
          score={score}
          longest={runMax}
          place={place}
          total={field}
          best={best}
          win={won}
          gold={earnedGold} kills={kills} saving={savingGold} saveError={economy.error} onSaveRetry={() => void rewardMatch(matchId.current)}
          onRetry={() => openLobby(lastMode.current)}
          onModes={() => setState("modes")}
          onHome={() => setState("menu")}
        />
      )}

      {state === "modes" && <ModeSelect onPick={openLobby} onBack={() => setState("menu")} />}

      {state === "menu" && (
        <Home
          skinId={skinId}
          onSkin={async id => { const result = await economy.buy(id); if (result) setSkinId(result.equipped); }}
          wallet={economy.wallet} walletReady={economy.ready} buying={economy.busy} walletError={economy.error} onRetryWallet={() => void economy.retry()}
          nick={nick}
          onNick={setNick}
          best={best}
          lastScore={score > 0 ? score : null}
          onBattle={() => setState("modes")}
        />
      )}

      {/* phones held upright: ask to rotate */}
      <div className="absolute inset-0 z-50 hidden flex-col items-center justify-center gap-4 bg-background px-8 text-center portrait-phone:flex">
        <h1 className="rotate-wormz font-display text-4xl font-black">WORMZ</h1>
        <img src={rotateUrl} alt="" width={120} height={120} className="h-28 w-28 animate-pulse" />
        <p className="font-display text-xl font-black text-foreground">Rotate your phone</p>
        <p className="text-sm text-muted-foreground">Wormz plays in landscape.</p>
      </div>
    </div>
  );
}

function TouchControls() {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [boosting, setBoosting] = useState(false);
  const baseRef = useRef<HTMLDivElement>(null);
  const MAX = 45;

  const move = (e: React.PointerEvent) => {
    const base = baseRef.current;
    if (!base) return;
    const r = base.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > 6) {
      input.angle = Math.atan2(dy, dx);
      input.hasAngle = true;
    }
    const k = Math.min(d, MAX) / (d || 1);
    setKnob({ x: dx * k, y: dy * k });
  };

  return (
    <>
      <div
        ref={baseRef}
        className="touch-stick absolute bottom-4 left-4 z-10 h-28 w-28 touch-none sm:bottom-8 sm:left-8 sm:h-32 sm:w-32 rounded-full border-2 border-foreground/30 bg-card/40"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          move(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons || e.pointerType === "touch") move(e);
        }}
        onPointerUp={() => setKnob({ x: 0, y: 0 })}
        onPointerCancel={() => setKnob({ x: 0, y: 0 })}
      >
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 rounded-full bg-primary/80 shadow-[0_0_20px_var(--primary)]"
          style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
        />
      </div>
      <Button variant="ghost" aria-label="Boost" size="icon"
        className={`touch-boost absolute bottom-5 right-5 z-10 flex h-20 w-20 touch-none items-center justify-center rounded-full border-2 border-primary transition-transform sm:bottom-10 sm:right-8 sm:h-24 sm:w-24 ${boosting ? "scale-90 bg-primary" : "bg-primary/60"}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          input.boost = true;
          setBoosting(true);
        }}
        onPointerUp={() => {
          input.boost = false;
          setBoosting(false);
        }}
        onPointerCancel={() => {
          input.boost = false;
          setBoosting(false);
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <img src={boostUrl} alt="Boost" width={56} height={56} className="pointer-events-none h-3/5 w-3/5 object-contain" />
      </Button>
    </>
  );
}
