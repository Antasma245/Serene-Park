import { Container, Graphics } from 'pixi.js';
import { fillFraction, getState, isMaxed, subscribe } from '../../player/state.ts';
import { mulberry32 } from '../../util/rng.ts';
import type { WindowRect } from '../assets.ts';

interface LitWindow {
  x: number;
  y: number;
  w: number;
  h: number;
  weight: number;
  on: boolean;
}

// Layer that draws lit window overlay during chorus
export class BuildingsLayer {
  readonly view = new Container();
  private windowLayer = new Graphics();
  private windows: LitWindow[] = [];
  private litOrder: number[] = [];
  private rng = mulberry32(20260629);

  constructor(rects: WindowRect[]) {
    // Give each window fixed random brightness weight
    for (const r of rects) {
      this.windows.push({
        x: r.x,
        y: r.y,
        w: r.w,
        h: r.h,
        weight: 0.6 + this.rng() * 0.4,
        on: false,
      });
    }
    // Random light-up order so skyline fills in scattered
    this.litOrder = this.shuffledIndices(this.windows.length);

    this.view.addChild(this.windowLayer);
    this.windowLayer.blendMode = 'add';

    // Keep lit window count in step with progress meter
    subscribe((s) => {
      this.syncLitWindows(fillFraction(s));
    });
  }

  // Fisher-Yates shuffle using seeded RNG
  private shuffledIndices(n: number): number[] {
    const arr = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Light first fill fraction of windows in shuffled order
  private syncLitWindows(fill: number): void {
    const target = Math.round(this.windows.length * fill);
    for (const w of this.windows) w.on = false;
    for (let i = 0; i < target; i++) this.windows[this.litOrder[i]].on = true;
  }

  // Redraw lit windows every frame (chorus only)
  update(): void {
    const s = getState();
    this.windowLayer.clear();
    if (s.phase !== 'chorus') return;
    const amp = s.vocalAmp01;
    const beat = s.beatPulse;

    const now = performance.now();

    // Warm yellow normally (skyline cycles through RGB once meter is full)
    const maxed = isMaxed(s);
    const baseHue = (now * 0.06) % 360;

    for (const w of this.windows) {
      if (!w.on) continue;
      const brightness = Math.min(1, 0.35 + amp * 0.9 * w.weight + beat * 0.4);
      const c = maxed ? hsvToRgb(baseHue, 0.85, brightness) : blendYellow(brightness);
      this.windowLayer
        .rect(w.x, w.y, w.w, w.h)
        .fill({ color: c, alpha: 0.7 + 0.3 * brightness });
    }
  }
}

// Warm window yellow scaled by brightness and packed as 0xRRGGBB
function blendYellow(b: number): number {
  const r = Math.round(242 * b);
  const g = Math.round(193 * b);
  const bl = Math.round(78 * b);
  return (r << 16) | (g << 8) | bl;
}

// Pack from HSV to 0xRRGGBB
function hsvToRgb(h: number, s: number, v: number): number {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return (
    (Math.round((r + m) * 255) << 16) |
    (Math.round((g + m) * 255) << 8) |
    Math.round((b + m) * 255)
  );
}
