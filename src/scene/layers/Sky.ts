import { Container, Sprite } from 'pixi.js';
import gsap from 'gsap';
import { subscribe, getState } from '../../player/state.ts';
import type { SceneAssets } from '../assets.ts';

// Shared screen position for sun and moon
const CELESTIAL_X = 50;
const CELESTIAL_Y = 50;

// Sky backdrop that cross-fades and swaps celestial on phase changes
export class SkyLayer {
  readonly view = new Container();
  private dayBg: Sprite;
  private nightBg: Sprite;
  private sun: Sprite;
  private moon: Sprite;
  private currentPhase: 'verse' | 'chorus' = 'verse';

  constructor(assets: SceneAssets) {
    this.dayBg = new Sprite(assets.upperDay);
    this.nightBg = new Sprite(assets.upperNight);
    this.nightBg.alpha = 0;

    this.sun = new Sprite(assets.sun);
    this.sun.anchor.set(0.5);
    this.sun.position.set(CELESTIAL_X, CELESTIAL_Y);

    this.moon = new Sprite(assets.moon);
    this.moon.anchor.set(0.5);
    this.moon.position.set(CELESTIAL_X, CELESTIAL_Y);
    this.moon.alpha = 0;

    this.view.addChild(this.dayBg, this.nightBg, this.sun, this.moon);

    // On phase changes, cross-fade night sky in/out and swap sun for moon
    subscribe((s) => {
      if (s.phase === this.currentPhase) return;
      this.currentPhase = s.phase;
      const inChorus = s.phase === 'chorus';
      gsap.to(this.nightBg, { alpha: inChorus ? 1 : 0, duration: 1.2, ease: 'sine.inOut' });
      gsap.to(this.sun, { alpha: inChorus ? 0 : 1, duration: 1.2, ease: 'sine.inOut' });
      gsap.to(this.moon, { alpha: inChorus ? 1 : 0, duration: 1.2, ease: 'sine.inOut' });
    });
  }

  // Pulse whichever celestial body is showing in time with beat
  update(): void {
    const s = getState();
    const scale = 1 + s.beatPulse * 0.12;
    if (s.phase === 'chorus') this.moon.scale.set(scale);
    else this.sun.scale.set(scale);
  }
}
