import type { IPhrase } from 'textalive-app-api';

// Correct overlapping chorus timings for grand prize song

export interface CharTiming {
  startTime: number;
  endTime: number;
}

export interface ChorusPhraseTiming {
  /** Plain text of phrase (used to find it among all loaded phrases) */
  text: string;
  /** Per-character timing (grouped into words like the source JSON) */
  words: CharTiming[][];
}

export const IMIE_CHORUS_TIMINGS: ChorusPhraseTiming[] = [
  {
    text: 'どれほどの苦しみも悲しみの向こうに',
    words: [
      [
        { startTime: 52140, endTime: 52351 },
        { startTime: 52351, endTime: 52585 },
      ],
      [
        { startTime: 52585, endTime: 52807 },
        { startTime: 52807, endTime: 53272 },
      ],
      [{ startTime: 53272, endTime: 53490 }],
      [
        { startTime: 53490, endTime: 53992 },
        { startTime: 53992, endTime: 54216 },
        { startTime: 54216, endTime: 54658 },
      ],
      [{ startTime: 54906, endTime: 55354 }],
      [
        { startTime: 55623, endTime: 56133 },
        { startTime: 56133, endTime: 56322 },
        { startTime: 56322, endTime: 56865 },
      ],
      [{ startTime: 56865, endTime: 57140 }],
      [
        { startTime: 57140, endTime: 57333 },
        { startTime: 57333, endTime: 57529 },
        { startTime: 57529, endTime: 57722 },
      ],
      [{ startTime: 57729, endTime: 57903 }],
    ],
  },
  {
    text: 'きっと私の目指す私がいると信じ続けていた',
    words: [
      [
        { startTime: 57903, endTime: 58077 },
        { startTime: 58083, endTime: 58248 },
        { startTime: 58250, endTime: 58591 },
      ],
      [{ startTime: 59444, endTime: 59951 }],
      [{ startTime: 59951, endTime: 60454 }],
      [
        { startTime: 60461, endTime: 60677 },
        { startTime: 60677, endTime: 60891 },
        { startTime: 60891, endTime: 61315 },
      ],
      [{ startTime: 61363, endTime: 62083 }],
      [{ startTime: 62083, endTime: 62411 }],
      [
        { startTime: 63058, endTime: 63236 },
        { startTime: 63236, endTime: 63431 },
      ],
      [{ startTime: 63431, endTime: 63678 }],
      [
        { startTime: 63678, endTime: 64087 },
        { startTime: 64087, endTime: 64254 },
      ],
      [
        { startTime: 64254, endTime: 65069 },
        { startTime: 65069, endTime: 65342 },
      ],
      [{ startTime: 65342, endTime: 65585 }],
      [{ startTime: 65585, endTime: 65806 }],
      [{ startTime: 65806, endTime: 66249 }],
    ],
  },
];

// Reach into character timings to overwrite values
interface CharWithData {
  _data?: { startTime: number; endTime: number };
}

/** Concatenate plain text of phrase with all whitespace removed */
function normalizedText(phrase: IPhrase): string {
  return (phrase.text || '').replace(/\s+/g, '');
}

/** Collect phrase characters in reading order */
function charsOf(phrase: IPhrase) {
  const chars = [];
  for (let c = phrase.firstChar; c; c = c.next) {
    chars.push(c);
    if (c === phrase.lastChar) break;
  }
  return chars;
}

/** Overwrite incorrect chorus character timings on matching loaded phrases */
export function applyChorusTimings(
  phrases: IPhrase[],
  timings: ChorusPhraseTiming[],
): number {
  let patched = 0;
  for (const timing of timings) {
    const flat = timing.words.flat();
    const wanted = timing.text.replace(/\s+/g, '');
    const phrase = phrases.find((p) => normalizedText(p) === wanted);
    if (!phrase) {
      console.warn(`[chorusTimings] no phrase matched "${timing.text}"`);
      continue;
    }
    const chars = charsOf(phrase);
    if (chars.length !== flat.length) {
      console.warn(
        `[chorusTimings] "${timing.text}" has ${chars.length} chars but ${flat.length} timings; skipping`,
      );
      continue;
    }
    chars.forEach((char, i) => {
      const data = (char as unknown as CharWithData)._data;
      if (!data) return;
      data.startTime = flat[i].startTime;
      data.endTime = flat[i].endTime;
    });
    patched += 1;
  }
  return patched;
}
