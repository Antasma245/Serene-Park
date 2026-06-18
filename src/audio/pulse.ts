import type { Player } from 'textalive-app-api';
import { setAudioPulse } from '../player/state.ts';

const AMP_SMOOTH = 0.18; // How fast smoothed vocal amplitude tracks raw value
const BEAT_DECAY = 0.0055; // How fast a beat pulse fades back to zero (per ms)

// Read TextAlive player each frame and publish two normalized signals
export class AudioPulse {
  private ampSmoothed = 0;
  private beatPulse = 0;
  private lastBeatStart = -1;

  private player: Player;

  constructor(player: Player) {
    this.player = player;
  }

  update(dtMs: number): void {
    const p = this.player;
    // Report silence if no song is loaded
    if (!p.video || !p.timer) {
      setAudioPulse(0, 0);
      return;
    }
    const now = p.timer.position;

    // Smooth normalized vocal amplitude toward current value
    const max = p.getMaxVocalAmplitude() || 1;
    const raw = p.getVocalAmplitude(now) / max;
    const target = Math.max(0, Math.min(1, raw));
    this.ampSmoothed += (target - this.ampSmoothed) * AMP_SMOOTH;

    // Kick pulse on each new beat (harder on downbeat) then let it decay
    const beat = p.findBeat(now);
    if (beat && beat.startTime !== this.lastBeatStart) {
      this.lastBeatStart = beat.startTime;
      this.beatPulse = beat.position === 1 ? 1.0 : 0.5;
    }
    this.beatPulse = Math.max(0, this.beatPulse - BEAT_DECAY * dtMs);

    setAudioPulse(this.ampSmoothed, this.beatPulse);
  }
}
