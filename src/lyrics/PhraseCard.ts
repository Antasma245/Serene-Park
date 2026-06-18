import { Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';
import gsap from 'gsap';
import type { IPhrase } from 'textalive-app-api';
import { LYRIC_FONT_FAMILY } from './font.ts';

export interface PhraseCardEvents {
  onClick: (card: PhraseCard) => void;
}

const TAU = Math.PI * 2;

// Shared text style for every character (matches HUD font size)
const STYLE = new TextStyle({
  fontFamily: LYRIC_FONT_FAMILY,
  fontSize: 12,
  fontWeight: '400',
  fill: 0x2a2030,
  align: 'center',
  stroke: { color: 0xfff5e2, width: 1.5, join: 'round' },
});

// Rendered character which drifts on its own after the card is clicked
interface Glyph {
  text: Text;
  baseX: number;
  baseY: number;
  driftX: number;
  driftY: number;
  vx: number;
  vy: number;
  spin: number;
  phase: number;
}

export class PhraseCard {
  readonly view = new Container();
  readonly phrase: IPhrase;
  readonly id: number;
  private bg = new Graphics();
  private glyphs: Glyph[] = [];
  private active = false;
  private clicked = false;
  private fading = false;
  private scattering = false;
  private scatterTime = 0;
  baseX = 0;
  baseY = 0;
  spawnTime = 0;
  // Per-card phase offset so cards sway independently
  private readonly wobblePhase: number;
  readonly cardW: number;
  readonly cardH: number;

  constructor(phrase: IPhrase, id: number, events: PhraseCardEvents) {
    this.phrase = phrase;
    this.id = id;
    this.wobblePhase = (id * 2.39996) % TAU;

    // Build one Text per character ensuring they can be laid out into a centered label
    const lines = (phrase.text || '').split('\n');
    let lineHeight = 0;
    const measured = lines.map((line) =>
      [...line].map((ch) => {
        const t = new Text({ text: ch, style: STYLE });
        t.anchor.set(0.5);
        // Rasterize at 4× density so characters stay clear once scene is upscaled
        t.resolution = 4;
        lineHeight = Math.max(lineHeight, t.height);
        return { t, w: t.width };
      }),
    );

    // Place each character to rebuild a centered multi-line block
    const lineGap = 1;
    const lineWidths = measured.map((g) => g.reduce((s, x) => s + x.w, 0));
    const blockW = Math.max(0, ...lineWidths);
    const totalH = lines.length * lineHeight + (lines.length - 1) * lineGap;

    let y = -totalH / 2 + lineHeight / 2;
    measured.forEach((g, li) => {
      let x = -lineWidths[li] / 2;
      for (const item of g) {
        const cx = x + item.w / 2;
        item.t.position.set(cx, y);
        this.glyphs.push({
          text: item.t,
          baseX: cx,
          baseY: y,
          driftX: 0,
          driftY: 0,
          vx: 0,
          vy: 0,
          spin: 0,
          phase: 0,
        });
        x += item.w;
      }
      y += lineHeight + lineGap;
    });

    // Rounded translucent card sized to the text block plus its padding
    const padX = 6;
    const padY = 2;
    const w = Math.max(28, blockW + padX * 2);
    const h = totalH + padY * 2;
    this.cardW = w;
    this.cardH = h;
    this.bg
      .roundRect(-w / 2, -h / 2, w, h, 5)
      .fill({ color: 0xffffff, alpha: 0.55 })
      .stroke({ color: 0xfff5e2, width: 1, alpha: 0.7 });

    this.view.addChild(this.bg, ...this.glyphs.map((g) => g.text));
    this.view.alpha = 0;
    this.view.visible = false;
    this.view.eventMode = 'static';
    this.view.cursor = 'pointer';
    this.view.hitArea = new Rectangle(-w / 2, -h / 2, w, h);

    // Click handler (pull card out of layer lifecycle and run scatter sequence)
    this.view.on('pointertap', () => {
      if (!this.active || this.clicked) return;
      this.clicked = true;
      this.active = false;
      this.fading = false;
      events.onClick(this);
      gsap.killTweensOf(this.view);
      gsap.killTweensOf(this.view.scale);
      gsap.killTweensOf(this.bg);

      // Pop and settle scale then fade card background out so only characters remain
      gsap.to(this.view.scale, { x: 1.25, y: 1.25, duration: 0.18, ease: 'back.out(2)' });
      gsap.to(this.view.scale, { x: 1, y: 1, duration: 0.3, delay: 0.18, ease: 'sine.out' });
      gsap.to(this.bg, { alpha: 0, duration: 0.35, delay: 0.1, ease: 'sine.out' });

      this.startScatter();
      // Dim to faint ghost and persist as drifting characters then fade out and retire
      gsap.to(this.view, { alpha: 0.45, duration: 0.4, delay: 0.18, ease: 'sine.out' });
      gsap.to(this.view, {
        alpha: 0,
        duration: 2.6,
        delay: 2.2,
        ease: 'sine.in',
        onComplete: () => this.retire(),
      });
    });
  }

  // Give each character outward velocity, spin and wobble phase
  private startScatter(): void {
    this.scattering = true;
    this.scatterTime = 0;
    for (const g of this.glyphs) {
      // Angular jitter so wide single-line phrases scatter vertically too
      const ang = Math.atan2(g.baseY, g.baseX) + (Math.random() - 0.5) * 2.2;
      const speed = 1.5 + Math.random() * 2.5;
      g.vx = Math.cos(ang) * speed;
      g.vy = Math.sin(ang) * speed * 0.9;
      g.spin = (Math.random() - 0.5) * 0.6;
      g.phase = Math.random() * TAU;
      g.driftX = 0;
      g.driftY = 0;
    }
  }

  // End state after a clicked card has fully scattered and faded
  private retire(): void {
    this.scattering = false;
    this.view.visible = false;
    this.view.alpha = 0;
  }

  // Surface card at coordinates with fade-and-pop entrance
  activate(x: number, y: number): void {
    if (this.active || this.clicked) return;
    this.active = true;
    this.baseX = x;
    this.baseY = y;
    this.view.position.set(x, y);
    this.view.scale.set(0.85);
    this.view.alpha = 0;
    this.view.visible = true;
    this.spawnTime = performance.now();
    gsap.to(this.view, { alpha: 0.95, duration: 0.35, ease: 'sine.out' });
    gsap.to(this.view.scale, { x: 1, y: 1, duration: 0.4, ease: 'back.out(1.6)' });
  }

  // Hide card immediately and reset it for reuse
  deactivate(): void {
    if (!this.active && !this.scattering) return;
    this.active = false;
    this.fading = false;
    this.scattering = false;
    this.view.visible = false;
    gsap.killTweensOf(this.view);
    gsap.killTweensOf(this.view.scale);
    gsap.killTweensOf(this.bg);
    this.view.alpha = 0;
    this.view.scale.set(1);
    this.bg.alpha = 1;
  }

  // Fade un-clicked cards out once their phrase window has passed
  fadeOut(): void {
    if (!this.active || this.fading) return;
    this.fading = true;
    gsap.killTweensOf(this.view);
    gsap.to(this.view, {
      alpha: 0,
      duration: 0.6,
      ease: 'sine.in',
      onComplete: () => this.deactivate(),
    });
  }

  isActive(): boolean {
    return this.active;
  }

  wasClicked(): boolean {
    return this.clicked;
  }

  // Per-frame motion (scattering characters once clicked or sway of whole card)
  drift(dtMs: number): void {
    if (this.scattering) {
      this.scatterDrift(dtMs);
      return;
    }
    if (!this.active || this.clicked) return;
    const t = (performance.now() - this.spawnTime) * 0.001;
    const ph = this.wobblePhase;
    this.view.position.x = this.baseX + Math.sin(t * 0.9 + ph) * 6;
    this.view.position.y =
      this.baseY + Math.cos(t * 0.7 + ph) * 4 + Math.sin(t * 1.3 + ph) * 1.5;
  }

  // Move each character by its outward velocity plus small wobble and spin
  private scatterDrift(dtMs: number): void {
    const dt = dtMs * 0.001;
    this.scatterTime += dt;
    const t = this.scatterTime;
    for (const g of this.glyphs) {
      g.driftX += g.vx * dt;
      g.driftY += g.vy * dt;
      g.text.position.x = g.baseX + g.driftX + Math.sin(t * 1.1 + g.phase) * 1.6;
      g.text.position.y = g.baseY + g.driftY + Math.cos(t * 0.9 + g.phase) * 1.3;
      g.text.rotation = Math.sin(t * 0.8 + g.phase) * g.spin;
    }
  }
}
