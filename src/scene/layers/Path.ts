import { Container, Sprite, Texture } from 'pixi.js';
import gsap from 'gsap';
import { HORIZON, SCENE_W } from '../Scene.ts';
import { fillFraction, getState, isMaxed, subscribe, type SceneState } from '../../player/state.ts';
import { mulberry32 } from '../../util/rng.ts';
import { bestCandidateSpot } from '../../util/sampling.ts';
import type { SceneAssets } from '../assets.ts';

const MAX_CROWD = 50;
const OFFSCREEN_PAD = 20; // How far off each edge people spawn from/exit to
const SPAWN_MARGIN = 20; // Keep spawns this far inside scene edges
// How many random spots each new person tries before picking one
const SPAWN_CANDIDATES = 10;

// Blink timing (eyes stay shut for BLINK_DURATION_MS then wait a random gap)
const BLINK_DURATION_MS = 120;
const BLINK_GAP_MIN_MS = 3000;
const BLINK_GAP_MAX_MS = 5000;

interface Person {
  view: Sprite;
  x: number;
  active: boolean;
  texIndex: number;
  // Time left until next eye-state change (in ms)
  blinkTimer: number;
}

// Layer that manages crowd of people (who gather on it during verses)
export class PathLayer {
  readonly view = new Container();
  private people: Person[] = [];
  private peopleContainer = new Container();
  private rng = mulberry32(7777);
  private lastClickCount = 0;
  private currentPhase: 'verse' | 'chorus' = 'verse';
  private personTextures: Texture[];
  private blinkTextures: Texture[];
  private cheerTextures: [Texture[], Texture[]];
  // Current cheer frame (0 = open, 1 = cheer) and previous beat pulse
  private cheerFrame = 0;
  private lastBeatPulse = 0;
  private wasMaxed = false;

  constructor(assets: SceneAssets) {
    this.personTextures = assets.persons;
    this.blinkTextures = assets.personsBlink;
    this.cheerTextures = [assets.persons, assets.personsCheer];
    this.view.addChild(this.peopleContainer);
    this.peopleContainer.sortableChildren = true;

    // Build full sprite pool once (sprites are reused as people come and go)
    for (let i = 0; i < MAX_CROWD; i++) this.createPerson();

    subscribe((s) => {
      // Drop in click count means a song was reset (to clear crowd)
      if (s.totalClickCount < this.lastClickCount) {
        this.retireAll();
        this.currentPhase = s.phase;
        this.lastClickCount = s.totalClickCount;
        return;
      }
      // Crowd only gathers during verses (chorus clears path, otherwise grow crowd)
      const phaseChanged = s.phase !== this.currentPhase;
      if (phaseChanged) {
        this.currentPhase = s.phase;
        if (s.phase === 'chorus') this.retireAll();
        else this.syncCrowd(s);
      } else if (s.phase === 'verse' && s.totalClickCount > this.lastClickCount) {
        this.syncCrowd(s);
      }
      this.lastClickCount = s.totalClickCount;
    });
  }

  // Add one inactive sprite to pool, cycling through character textures
  private createPerson(): Person {
    const idx = this.people.length % this.personTextures.length;
    const sprite = new Sprite(this.personTextures[idx]);
    sprite.anchor.set(0.5, 1.0); // Anchor at feet
    sprite.roundPixels = true; // Snap to pixel grid so nearest sampling stays stable
    sprite.visible = false;
    this.peopleContainer.addChild(sprite);
    const p: Person = { view: sprite, x: 0, active: false, texIndex: idx, blinkTimer: 0 };
    this.people.push(p);
    return p;
  }

  private nextBlinkGap(): number {
    return BLINK_GAP_MIN_MS + this.rng() * (BLINK_GAP_MAX_MS - BLINK_GAP_MIN_MS);
  }

  // Bring active crowd size up to target set by current fill level
  private syncCrowd(s: Readonly<SceneState>): void {
    if (s.totalPhrases <= 0) return;
    const target = Math.round(MAX_CROWD * fillFraction(s));
    const activeCount = this.people.reduce((n, p) => n + (p.active ? 1 : 0), 0);
    const toAdd = target - activeCount;
    for (let i = 0; i < toAdd; i++) this.addPerson();
  }

  // Reuse a retired sprite if one is free, otherwise grow the pool
  private nextFreePerson(): Person {
    for (const p of this.people) if (!p.active) return p;
    return this.createPerson();
  }

  // Activate one person and slide them in from a random off-screen edge
  private addPerson(): void {
    const p = this.nextFreePerson();
    p.active = true;
    if (isMaxed()) {
      // Joining an already-cheering crowd (fall in step on current frame)
      p.view.texture = this.cheerTextures[this.cheerFrame][p.texIndex];
    } else {
      p.view.texture = this.personTextures[p.texIndex];
      p.blinkTimer = this.nextBlinkGap();
    }
    const { x: targetX, y: targetY } = this.pickSpot(p);
    p.x = targetX;
    p.view.position.set(this.rng() < 0.5 ? -OFFSCREEN_PAD : SCENE_W + OFFSCREEN_PAD, targetY);
    p.view.alpha = 0;
    p.view.visible = true;
    p.view.zIndex = targetY; // Depth-sort so nearer (lower) people draw in front
    this.peopleContainer.sortChildren();
    gsap.to(p.view, { alpha: 1, duration: 0.4, ease: 'sine.out' });
    gsap.to(p.view.position, { x: targetX, duration: 0.7, ease: 'sine.out' });
  }

  // Pick where a joining person stands while keeping the crowd evenly spread
  private pickSpot(joining: Person): { x: number; y: number } {
    const occupied = this.people
      .filter((p) => p.active && p !== joining)
      .map((p) => ({ x: p.x, y: p.view.position.y }));
    const region = {
      x0: SPAWN_MARGIN,
      x1: SCENE_W - SPAWN_MARGIN,
      y0: HORIZON.pathTop,
      y1: HORIZON.pathBottom,
    };
    return bestCandidateSpot(this.rng, SPAWN_CANDIDATES, region, occupied);
  }

  // Fade and walk every active person off-screen then free them.
  private retireAll(): void {
    for (const p of this.people) {
      if (!p.active) continue;
      gsap.to(p.view, {
        alpha: 0,
        duration: 0.6,
        ease: 'sine.in',
        onComplete: () => {
          p.view.visible = false;
          p.active = false;
        },
      });
      gsap.to(p.view.position, {
        x: p.view.position.x < SCENE_W / 2 ? -OFFSCREEN_PAD : SCENE_W + OFFSCREEN_PAD,
        duration: 0.9,
        ease: 'sine.in',
      });
    }
  }

  // Per-frame motion (only texture animation is blinking and cheering)
  update(dtMs: number): void {
    const maxed = isMaxed();
    if (maxed) {
      this.updateCheer();
    } else {
      this.updateBlink(dtMs);
    }
    this.wasMaxed = maxed;
  }

  // Tick each person blink timer down and swap between open and closed eyes
  private updateBlink(dtMs: number): void {
    for (const p of this.people) {
      if (!p.active) continue;
      p.blinkTimer -= dtMs;
      if (p.blinkTimer > 0) continue;
      const eyesClosed = p.view.texture === this.blinkTextures[p.texIndex];
      if (eyesClosed) {
        p.view.texture = this.personTextures[p.texIndex];
        p.blinkTimer = this.nextBlinkGap();
      } else {
        p.view.texture = this.blinkTextures[p.texIndex];
        p.blinkTimer = BLINK_DURATION_MS;
      }
    }
  }

  // Swap whole crowd to next cheer frame on each beat rising edge
  private updateCheer(): void {
    const beatPulse = getState().beatPulse;
    const beatOnset = beatPulse > this.lastBeatPulse + 0.01;
    this.lastBeatPulse = beatPulse;
    if (beatOnset) this.cheerFrame ^= 1;
    if (!beatOnset && this.wasMaxed) return;

    const frames = this.cheerTextures[this.cheerFrame];
    for (const p of this.people) {
      if (p.active) p.view.texture = frames[p.texIndex];
    }
  }
}
