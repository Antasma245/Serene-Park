import { Container } from 'pixi.js';
import type { IPhrase } from 'textalive-app-api';
import { PhraseCard } from '../../lyrics/PhraseCard.ts';
import { spawnPosition } from '../../lyrics/layout.ts';
import { registerPhraseClick, getState, setTotalPhrases, subscribe } from '../../player/state.ts';
import { mulberry32 } from '../../util/rng.ts';
import { HORIZON, SCENE_W, SCENE_H } from '../Scene.ts';

const EDGE_MARGIN = 6; // Smallest gap kept between card and scene edges
const SPAWN_SEED = 49297; // Seed shared card-placement RNG

// Card surfaces this long before phrase start and lingers after end
const PRE_ROLL_MS = 250;
const POST_LINGER_MS = 1500;

export interface LyricLayerHooks {
  onClick: (x: number, y: number) => void;
}

// Holds one PhraseCard per phrase and runs their lifecycle off playback time
export class LyricLayer {
  readonly view = new Container();
  private cards = new Map<number, PhraseCard>();
  private hooks: LyricLayerHooks;
  // Shared RNG that places cards
  private rng = mulberry32(SPAWN_SEED);

  constructor(hooks: LyricLayerHooks) {
    this.hooks = hooks;
    // Wipe cards when song resets (phrase count drops to zero)
    subscribe((s) => {
      if (s.totalPhrases === 0 && this.cards.size > 0) this.clearCards();
    });
  }

  private clearCards(): void {
    for (const card of this.cards.values()) {
      this.view.removeChild(card.view);
      card.deactivate();
    }
    this.cards.clear();
    // Reset RNG so next run lays cards out identically
    this.rng = mulberry32(SPAWN_SEED);
  }

  // Replace current cards with one per phrase of freshly loaded song
  load(phrases: IPhrase[]): void {
    this.clearCards();

    phrases.forEach((phrase, index) => {
      const card = new PhraseCard(phrase, index, {
        // Click registers phrase and splashes water at card spot
        onClick: (c) => {
          registerPhraseClick(c.id);
          this.hooks.onClick(c.view.position.x, c.view.position.y);
        },
      });
      this.cards.set(index, card);
      this.view.addChild(card.view);
    });

    setTotalPhrases(phrases.length);
  }

  // On each frame, surface/retire cards based on current playback time and let active ones drift
  update(dtMs: number): void {
    const now = getState().now;
    for (const card of this.cards.values()) {
      const start = card.phrase.startTime - PRE_ROLL_MS;
      const end = card.phrase.endTime + POST_LINGER_MS;
      const shouldBeActive = now >= start && now <= end;
      if (shouldBeActive && !card.isActive() && !card.wasClicked()) {
        // Surface card at a spot clear of cards already on screen (clamped inside lake)
        const occupied = [...this.cards.values()]
          .filter((c) => c.isActive())
          .map((c) => ({ x: c.view.position.x, y: c.view.position.y }));
        const pos = spawnPosition(this.rng, occupied);
        const halfW = card.cardW / 2 + EDGE_MARGIN;
        const halfH = card.cardH / 2 + EDGE_MARGIN;
        const x = Math.max(halfW, Math.min(SCENE_W - halfW, pos.x));
        const y = Math.max(HORIZON.lakeTop + halfH, Math.min(SCENE_H - halfH, pos.y));
        card.activate(x, y);
      } else if (!shouldBeActive && card.isActive() && now > end - 100) {
        card.fadeOut();
      }
      card.drift(dtMs);
    }
  }
}
