import { Player } from 'textalive-app-api';
import type { IVideo, IPhrase } from 'textalive-app-api';
import { setIsPlaying, setNow, setPhase } from './state.ts';
import { getLang, type Lang } from '../i18n/index.ts';
import {
  applyChorusTimings,
  IMIE_CHORUS_TIMINGS,
  type ChorusPhraseTiming,
} from '../lyrics/chorusTimings.ts';

export interface ContestSongVideoOptions {
  beatId: number;
  chordId: number;
  repetitiveSegmentId: number;
  lyricId: number;
  lyricDiffId: number;
}

export interface ContestSong {
  title: string;
  artist: string;
  url: string;
  video: ContestSongVideoOptions;
  // Per-language title/artist overrides for UI with fallback to canonical
  i18n?: Partial<Record<Lang, { title?: string; artist?: string }>>;
  // Optional timing corrections applied once video loads
  chorusTimings?: ChorusPhraseTiming[];
}

/** Title of a song in given (or current) language with fallback to canonical */
export function songTitle(song: ContestSong, lang: Lang = getLang()): string {
  return song.i18n?.[lang]?.title ?? song.title;
}

/** Artist of a song in given (or current) language with fallback to canonical */
export function songArtist(song: ContestSong, lang: Lang = getLang()): string {
  return song.i18n?.[lang]?.artist ?? song.artist;
}

// Designated songs with pinned revisions
export const CONTEST_SONGS: ContestSong[] = [
  {
    title: 'こたえて',
    artist: 'imie',
    i18n: { en: { title: 'Answer Me', artist: 'imie' } },
    url: 'https://piapro.jp/t/6W2N/20251215164617',
    video: {
      beatId: 4827293,
      chordId: 2963754,
      repetitiveSegmentId: 3086261,
      lyricId: 126519,
      lyricDiffId: 28645,
    },
    chorusTimings: IMIE_CHORUS_TIMINGS,
  },
  {
    title: 'アフター・ザ・カーテン',
    artist: 'Rulmry',
    i18n: { en: { title: 'After The Curtain', artist: 'Rulmry' } },
    url: 'https://piapro.jp/t/zoqO/20251214200738',
    video: {
      beatId: 4827294,
      chordId: 2963755,
      repetitiveSegmentId: 3086262,
      lyricId: 126591,
      lyricDiffId: 28627,
    },
  },
  {
    title: 'シャッターチャンス',
    artist: '夜未アガリ',
    i18n: { en: { title: 'Shutter Chance', artist: 'Yamiagari' } },
    url: 'https://piapro.jp/t/PNpQ/20251209170719',
    video: {
      beatId: 4827295,
      chordId: 2963756,
      repetitiveSegmentId: 3086263,
      lyricId: 126542,
      lyricDiffId: 28628,
    },
  },
  {
    title: '世界最後の音楽隊',
    artist: '夏山よつぎ×ど〜ぱみん',
    i18n: { en: { title: 'The Last March on Earth', artist: 'Natsuyama Yotsugi × Dopam!ne' } },
    url: 'https://piapro.jp/t/B3yJ/20251215061727',
    video: {
      beatId: 4827296,
      chordId: 2963757,
      repetitiveSegmentId: 3086264,
      lyricId: 126594,
      lyricDiffId: 28629,
    },
  },
  {
    title: 'トリツクロジー',
    artist: '鶴三',
    i18n: { en: { title: 'Toritsukulogy', artist: 'Tsuruzou' } },
    url: 'https://piapro.jp/t/QBdL/20251215094303',
    video: {
      beatId: 4827297,
      chordId: 2963758,
      repetitiveSegmentId: 3086265,
      lyricId: 126593,
      lyricDiffId: 28630,
    },
  },
  {
    title: 'TAKEOVER',
    artist: 'Twinfield',
    url: 'https://piapro.jp/t/E2i3/20251215092113',
    video: {
      beatId: 4827298,
      chordId: 2963759,
      repetitiveSegmentId: 3086266,
      lyricId: 126533,
      lyricDiffId: 28631,
    },
  },
];

export interface TextAlivePlayer {
  player: Player;
  phrases: IPhrase[];
  loadSong(song: ContestSong): Promise<void>;
  play(): void;
  pause(): void;
}

// TextAlive App API token
const TEXTALIVE_TOKEN = 'RswjRC7RCgO10v8g';

// Create TextAlive player and hook its events into shared scene state
export async function createTextAlivePlayer(
  mediaElement: HTMLElement,
  onReady: () => void,
): Promise<TextAlivePlayer> {
  const player = new Player({
    app: { token: TEXTALIVE_TOKEN },
    mediaElement,
    vocalAmplitudeEnabled: true,
    valenceArousalEnabled: false,
  });

  const phrases: IPhrase[] = [];
  // Most recently requested song (so onVideoReady can apply timing corrections)
  let currentSong: ContestSong | null = null;

  player.addListener({
    // Video data ready (collect phrase list and apply timing corrections)
    onVideoReady(v: IVideo) {
      phrases.length = 0;
      let p: IPhrase | null = v.firstPhrase;
      while (p) {
        phrases.push(p);
        p = p.next;
      }
      if (currentSong?.chorusTimings) {
        applyChorusTimings(phrases, currentSong.chorusTimings);
      }
      onReady();
    },
    // Playback tick (update clock and derive verse/chorus phase)
    onThrottledTimeUpdate(position: number) {
      setNow(position);
      const inChorus = !!player.findChorus(position);
      setPhase(inChorus ? 'chorus' : 'verse');
    },
    onPlay() {
      setIsPlaying(true);
    },
    onPause() {
      setIsPlaying(false);
    },
    onStop() {
      setIsPlaying(false);
    },
  });

  return {
    player,
    phrases,
    // Load a song from its piapro URL (pinned to contest video revision)
    async loadSong(song: ContestSong) {
      currentSong = song;
      await player.createFromSongUrl(song.url, { video: song.video });
    },
    play() {
      player.requestPlay();
    },
    pause() {
      player.requestPause();
    },
  };
}
