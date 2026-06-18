export type Phase = 'verse' | 'chorus';

// Central observable snapshot of everything the visual layers react to
export interface SceneState {
  phase: Phase;
  now: number;
  isPlaying: boolean;
  totalClickCount: number;
  totalPhrases: number;
  clickedPhraseIds: Set<number>;
  vocalAmp01: number;
  beatPulse: number;
}

// Max of fill meter (crowd and windows) is reached at this fraction of song
export const MAX_FILL_THRESHOLD = 0.8;

type Listener = (s: Readonly<SceneState>) => void;

const state: SceneState = {
  phase: 'verse',
  now: 0,
  isPlaying: false,
  totalClickCount: 0,
  totalPhrases: 0,
  clickedPhraseIds: new Set(),
  vocalAmp01: 0,
  beatPulse: 0,
};

const listeners = new Set<Listener>();

export function getState(): Readonly<SceneState> {
  return state;
}

// Eased and normalized fill level shared by crowd, windows and progress bar
export function fillFraction(s: Readonly<SceneState> = state): number {
  const denom = s.totalPhrases * MAX_FILL_THRESHOLD;
  const frac = denom > 0 ? Math.min(1, s.totalClickCount / denom) : 0;
  return Math.pow(frac, 1.5);
}

export function isMaxed(s: Readonly<SceneState> = state): boolean {
  return fillFraction(s) >= 1;
}

// Add a listener and return a function that removes it
export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Switch between verse and chorus
export function setPhase(next: Phase): void {
  if (state.phase === next) return;
  state.phase = next;
  emit();
}

// Update current playback time
export function setNow(t: number): void {
  state.now = t;
}

// Set phrase count for newly loaded song and clear all click progress
export function setTotalPhrases(n: number): void {
  if (state.totalPhrases === n) return;
  state.totalPhrases = n;
  state.totalClickCount = 0;
  state.clickedPhraseIds.clear();
  emit();
}

// Reset everything to pre-song state (used when switching songs)
export function softReset(): void {
  state.phase = 'verse';
  state.now = 0;
  state.totalClickCount = 0;
  state.totalPhrases = 0;
  state.clickedPhraseIds.clear();
  state.vocalAmp01 = 0;
  state.beatPulse = 0;
  emit();
}

export function setIsPlaying(playing: boolean): void {
  if (state.isPlaying === playing) return;
  state.isPlaying = playing;
  emit();
}

// Store latest audio signals with layers reading in their tick
export function setAudioPulse(amp01: number, beatPulse: number): void {
  state.vocalAmp01 = amp01;
  state.beatPulse = beatPulse;
}

// Count phrase first click only and returns false if already counted
export function registerPhraseClick(phraseId: number): boolean {
  if (state.clickedPhraseIds.has(phraseId)) return false;
  state.clickedPhraseIds.add(phraseId);
  state.totalClickCount += 1;
  emit();
  return true;
}

// Notify every subscriber of current state
function emit(): void {
  for (const l of listeners) l(state);
}
