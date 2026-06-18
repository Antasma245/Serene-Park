import {
  Application,
  Container,
  DisplacementFilter,
  Graphics,
  Rectangle,
  RenderTexture,
  Sprite,
  Texture,
  TilingSprite,
} from 'pixi.js';
import type { FederatedPointerEvent } from 'pixi.js';
import gsap from 'gsap';
import { HORIZON, SCENE_W, SCENE_H } from '../Scene.ts';
import { subscribe } from '../../player/state.ts';
import type { SceneAssets } from '../assets.ts';

const LAKE_W = SCENE_W;
const LAKE_H = SCENE_H - HORIZON.lakeTop;
// Render displacement map at half resolution to save fill rate
const RIPPLE_W = Math.floor(LAKE_W / 2);
const RIPPLE_H = Math.floor(LAKE_H / 2);
const NOISE_TILE = 128;
const NOISE_BLOCK = 2;

// Lake with water sprite, animated noise map and expanding ripples
export class LakeLayer {
  readonly bg = new Container();
  readonly displacement: DisplacementFilter;
  private dayWater: Sprite;
  private nightWater: Sprite;
  private rippleTex: RenderTexture;
  private rippleSprite: Sprite;
  private rippleStage: Container;
  private ambient: TilingSprite;
  private app: Application;
  private currentPhase: 'verse' | 'chorus' = 'verse';
  // Each ripple is two expanding rings (water warp and visible crest)
  private foam = new Container();
  private ripples: Array<{
    g: Graphics;
    vis: Graphics;
    t: number;
    ttl: number;
    dispR: number; // Displacement ring max radius (half-res coordinates)
    visR: number; // Visible ring max radius (scene coordinates)
    dispA: number; // Displacement ring peak alpha
    visA: number; // Visible ring peak alpha
  }> = [];
  // Where last hover ripple was emitted (to throttle them by travel distance)
  private lastHoverX = -999;
  private lastHoverY = -999;

  constructor(app: Application, targetContainer: Container, assets: SceneAssets) {
    this.app = app;

    // Day and night water sprites (night one fades in during chorus)
    this.dayWater = new Sprite(assets.lakeDay);
    this.dayWater.position.set(0, HORIZON.lakeTop);

    this.nightWater = new Sprite(assets.lakeNight);
    this.nightWater.position.set(0, HORIZON.lakeTop);
    this.nightWater.alpha = 0;

    this.bg.addChild(this.dayWater, this.nightWater);
    // Visible ripple rings drawn on top of water and inside filter target
    this.bg.addChild(this.foam);

    // Displacement map is drawn into half-res render texture then upscaled to cover lake
    this.rippleTex = RenderTexture.create({ width: RIPPLE_W, height: RIPPLE_H });
    this.rippleSprite = new Sprite(this.rippleTex);
    this.rippleSprite.position.set(0, HORIZON.lakeTop);
    this.rippleSprite.scale.set(2, 2);

    // Off-screen stage assembled into displacement map
    this.rippleStage = new Container();

    // Scrolling noise gives surface constant subtle movement
    this.ambient = new TilingSprite({
      texture: makeNoiseTexture(app, NOISE_TILE, NOISE_TILE),
      width: RIPPLE_W,
      height: RIPPLE_H,
    });
    this.ambient.alpha = 0.55;
    this.rippleStage.addChild(this.ambient);

    // Pinning top rows so waterline against shore stays straight
    const TOP_PIN_ROWS = 4; // Half-res rows equivalent to 8 px in scene
    const topPin = new Graphics();
    topPin.rect(0, 0, RIPPLE_W, TOP_PIN_ROWS).fill(0x808080);
    this.rippleStage.addChild(topPin);

    // Filter warps targetContainer by reading ripple map R/G channels
    this.displacement = new DisplacementFilter({ sprite: this.rippleSprite, scale: 5 });
    this.displacement.padding = 8;
    targetContainer.filters = [this.displacement];

    targetContainer.addChild(this.rippleSprite);
    this.rippleSprite.alpha = 0; // Map drives filter only and is never shown directly

    // Pointer input over lake with container children positioned in scene coordinates
    targetContainer.eventMode = 'static';
    targetContainer.cursor = 'pointer';
    targetContainer.hitArea = new Rectangle(0, HORIZON.lakeTop, LAKE_W, LAKE_H);
    targetContainer.on('pointertap', (e: FederatedPointerEvent) => {
      const p = e.getLocalPosition(targetContainer);
      this.splash(p.x, p.y);
    });
    targetContainer.on('pointermove', (e: FederatedPointerEvent) => {
      const p = e.getLocalPosition(targetContainer);
      this.hover(p.x, p.y);
    });

    // Cross-fade to night water when chorus starts
    subscribe((s) => {
      if (s.phase === this.currentPhase) return;
      this.currentPhase = s.phase;
      const inChorus = s.phase === 'chorus';
      gsap.to(this.nightWater, { alpha: inChorus ? 1 : 0, duration: 1.2, ease: 'sine.inOut' });
    });
  }

  // Large ripple from a click or tap
  splash(x: number, y: number): void {
    this.addRipple(x, y, { ttl: 900, dispR: 23, visR: 46, dispA: 0.9, visA: 0.6 });
  }

  // Small ripple following cursor (throttled so slow drag leaves even trail)
  hover(x: number, y: number): void {
    const dx = x - this.lastHoverX;
    const dy = y - this.lastHoverY;
    if (dx * dx + dy * dy < 14 * 14) return;
    this.lastHoverX = x;
    this.lastHoverY = y;
    this.addRipple(x, y, { ttl: 650, dispR: 9, visR: 20, dispA: 0.5, visA: 0.32 });
  }

  // Create both ripple rings with g in half-res map coordinates and vis in scene coordinates
  private addRipple(
    x: number,
    y: number,
    opts: { ttl: number; dispR: number; visR: number; dispA: number; visA: number },
  ): void {
    const g = new Graphics();
    g.position.set(x * 0.5, (y - HORIZON.lakeTop) * 0.5);
    this.rippleStage.addChild(g);

    const vis = new Graphics();
    vis.position.set(x, y);
    this.foam.addChild(vis);

    this.ripples.push({ g, vis, t: 0, ...opts });
  }

  // Advance ambient noise and live ripples then bake displacement map for frame
  update(dtMs: number): void {
    // Drift ambient noise diagonally
    this.ambient.tilePosition.x -= dtMs * 0.012;
    this.ambient.tilePosition.y -= dtMs * 0.004;

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.t += dtMs;
      const p = r.t / r.ttl; // Lifetime progress
      // Retire and free ripple once lifetime is up
      if (p >= 1) {
        this.rippleStage.removeChild(r.g);
        r.g.destroy();
        this.foam.removeChild(r.vis);
        r.vis.destroy();
        this.ripples.splice(i, 1);
        continue;
      }

      // Displacement ring (bright band followed by dark band)
      const radius = 1 + p * r.dispR;
      const alpha = (1 - p) * r.dispA;
      r.g.clear();
      r.g.circle(0, 0, radius).stroke({ color: 0xffffff, width: 2, alpha });
      r.g.circle(0, 0, Math.max(0, radius - 2)).stroke({ color: 0x000000, width: 2, alpha });

      // Visible ring with eased radius so it slows and fades faster as it spreads
      const ease = 1 - (1 - p) * (1 - p);
      const visRadius = ease * r.visR;
      const visAlpha = (1 - p) * r.visA;
      r.vis.clear();
      r.vis.circle(0, 0, visRadius).stroke({ color: 0xeaf6ff, width: 1.5, alpha: visAlpha });
      r.vis
        .circle(0, 0, Math.max(0, visRadius - 4))
        .stroke({ color: 0xbfe2ff, width: 1, alpha: visAlpha * 0.6 });
    }

    // Render map (clearing to midgrey so noise and rings displace symmetrically)
    this.app.renderer.render({
      container: this.rippleStage,
      target: this.rippleTex,
      clear: true,
      clearColor: [0.5, 0.5, 0.5, 1.0],
    });
  }
}

// Build tileable greyscale noise texture for ambient surface motion
function makeNoiseTexture(app: Application, w: number, h: number): Texture {
  const g = new Graphics();
  for (let y = 0; y < h; y += NOISE_BLOCK) {
    for (let x = 0; x < w; x += NOISE_BLOCK) {
      const v = Math.floor(Math.random() * 255);
      g.rect(x, y, NOISE_BLOCK, NOISE_BLOCK).fill((v << 16) | (v << 8) | v);
    }
  }
  const tex = RenderTexture.create({ width: w, height: h });
  app.renderer.render({ container: g, target: tex });
  g.destroy();
  return tex;
}
