import {
  CONTEST_SONGS,
  songTitle,
  songArtist,
  type ContestSong,
  type TextAlivePlayer,
} from '../../player/textalive.ts';
import { subscribe, getState, softReset, fillFraction, isMaxed } from '../../player/state.ts';
import { t, onLangChange } from '../../i18n/index.ts';
import { letterbox, type Scene } from '../Scene.ts';

// Marquee tuning (scroll speed and minimum cycle length)
const MARQUEE_SPEED = 20;
const MARQUEE_MIN_DUR = 4;
// Fraction of each half-cycle spent moving (rest is end pause)
const MARQUEE_TRAVEL = 0.6;

export interface Hud {
  /** Canvas-anchored overlay frame (more elements can mount inside it) */
  frame: HTMLElement;
  /** Slot in control row where language button is placed */
  langSlot: HTMLElement;
}

// Build HTML HUD overlay (song selector, progress bar, play/pause) pinned to canvas
export function mountHud(host: HTMLElement, ta: TextAlivePlayer, scene: Scene): Hud {
  // Overlay frame matching the letterboxed scene
  const frame = document.createElement('div');
  frame.id = 'canvas-ui';

  // Stick frame to the current letterbox rectangle and publish canvas scale on :root
  function syncFrame(): void {
    const box = letterbox();
    frame.style.left = `${box.offX}px`;
    frame.style.top = `${box.offY}px`;
    frame.style.width = `${box.width}px`;
    frame.style.height = `${box.height}px`;
    document.documentElement.style.setProperty('--s', String(box.scale));
  }
  syncFrame();

  // Trapezoid HUD container
  const hud = document.createElement('div');
  hud.id = 'hud';

  // Top row (song title marquee with a transparent native <select> laid over)
  const song = document.createElement('div');
  song.className = 'hud-song';
  const songTrack = document.createElement('div');
  songTrack.className = 'hud-song-track';
  const songText = document.createElement('span');
  songText.className = 'hud-song-text';
  songTrack.appendChild(songText);

  // One option per contest song plus a leading placeholder
  const select = document.createElement('select');
  const placeholder = document.createElement('option');
  placeholder.value = '';
  select.appendChild(placeholder);
  const optionEls: HTMLOptionElement[] = [];
  CONTEST_SONGS.forEach((_, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    optionEls.push(opt);
    select.appendChild(opt);
  });
  song.append(songTrack, select);

  // Bottom row (progress bar, play/pause button and slot for language button)
  const controls = document.createElement('div');
  controls.className = 'hud-controls';

  const progress = document.createElement('div');
  progress.className = 'hud-progress';
  const progressFill = document.createElement('div');
  progressFill.className = 'hud-progress-fill';
  const progressLabel = document.createElement('span');
  progressLabel.className = 'hud-progress-label';
  progress.append(progressFill, progressLabel);

  const playBtn = document.createElement('button');
  playBtn.className = 'hud-play';
  playBtn.disabled = true;

  const langSlot = document.createElement('div');
  langSlot.className = 'hud-lang-slot';

  controls.append(progress, playBtn, langSlot);
  hud.append(song, controls);
  frame.appendChild(hud);
  host.appendChild(frame);

  function renderPlayLabel(): void {
    playBtn.textContent = getState().isPlaying ? t('hud.pause') : t('hud.play');
  }

  // Chosen contest song or undefined while placeholder is selected
  function selectedSong(): ContestSong | undefined {
    return select.value ? CONTEST_SONGS[Number(select.value)] : undefined;
  }

  // Marquee text for current selection (placeholder until a song is chosen)
  function selectedSongLabel(): string {
    const s = selectedSong();
    return s ? `${songTitle(s)} / ${songArtist(s)}` : t('hud.selectSong');
  }

  // Scroll title only when it overflows the track, otherwise keep it centered
  function updateMarquee(): void {
    songText.classList.remove('scrolling');
    songText.style.removeProperty('--marquee-shift');
    songText.style.removeProperty('--marquee-dur');
    // Measure after clearing class so width is natural and untranslated
    const overflow = songText.scrollWidth - songTrack.clientWidth;
    if (overflow > 1) {
      const scale = letterbox().scale || 1;
      // Convert overflow to logical px then set keyframe duration
      const travel = overflow / scale / MARQUEE_SPEED;
      const dur = Math.max(MARQUEE_MIN_DUR, travel / MARQUEE_TRAVEL);
      songText.style.setProperty('--marquee-shift', `${overflow}px`);
      songText.style.setProperty('--marquee-dur', `${dur}s`);
      songText.classList.add('scrolling');
    }
  }

  function renderSongText(): void {
    songText.textContent = selectedSongLabel();
    // Wait for layout to settle before measuring overflow
    requestAnimationFrame(updateMarquee);
  }

  // (Re-)apply every language-dependent label (called once and on each language change)
  function renderText(): void {
    renderPlayLabel();
    placeholder.textContent = t('hud.selectSong');
    CONTEST_SONGS.forEach((s, i) => {
      optionEls[i].textContent = `${songTitle(s)} / ${songArtist(s)}`;
    });
    renderSongText();
  }
  renderText();
  onLangChange(renderText);

  // Mirror fill meter onto progress bar while toggling maxed-out style
  function renderProgress(): void {
    const pct = Math.round(fillFraction() * 100);
    progressFill.style.width = `${pct}%`;
    progressLabel.textContent = `${pct}%`;
    progress.classList.toggle('maxed', isMaxed());
  }
  renderProgress();

  // Full-screen overlay shown while a newly selected song loads
  const loadingOverlay = document.createElement('div');
  loadingOverlay.id = 'song-loading';
  loadingOverlay.classList.add('hidden');
  loadingOverlay.textContent = t('hud.loading');
  host.appendChild(loadingOverlay);

  // Selecting a song (reset progress and pause then load it with play button disabled)
  select.addEventListener('change', async () => {
    const song = selectedSong();
    renderSongText();
    if (!song) return;
    playBtn.disabled = true;
    loadingOverlay.textContent = t('hud.loadingSong', { title: songTitle(song) });
    loadingOverlay.classList.remove('hidden');
    if (getState().isPlaying) ta.pause();
    softReset();
    try {
      await ta.loadSong(song);
      playBtn.disabled = false;
      loadingOverlay.classList.add('hidden');
    } catch (e) {
      loadingOverlay.textContent = t('hud.loadFailed', { title: songTitle(song) });
      console.error(e);
    }
  });

  playBtn.addEventListener('click', () => {
    if (getState().isPlaying) ta.pause();
    else ta.play();
  });

  // Re-render play label and progress whenever shared state changes
  subscribe(() => {
    renderPlayLabel();
    renderProgress();
  });

  // On resize, keep frame glued to letterbox and marquee speed scale-stable
  function onResize(): void {
    syncFrame();
    updateMarquee();
  }
  window.addEventListener('resize', onResize);
  scene.app.renderer.on('resize', onResize);

  return { frame, langSlot };
}
