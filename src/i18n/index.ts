// Lightweight i18n layer for app UI with browser language detection

export type Lang = 'en' | 'ja';

// Set order of language menu (separate from fallback)
export const LANGS: { code: Lang; label: string }[] = [
  { code: 'ja', label: '日本語' },
  { code: 'en', label: 'English' },
];

// Used when a key is missing and for non-Japanese browsers
const FALLBACK_LANG: Lang = 'en';

type Vars = Record<string, string | number>;

// All translatable UI strings
const STRINGS: Record<Lang, Record<string, string>> = {
  ja: {
    'app.title': 'Serene Park - TextAlive リリックアプリ',
    'app.subtitle': '「マジカルミライ 2026」プログラミング・コンテスト制作作品',
    'splash.loading': 'アプリを読み込んでいます...',
    'splash.error': '読み込みに失敗しました。もう一度お試しください。',
    'hud.play': '▶ 再生',
    'hud.pause': '❚❚ 一時停止',
    'hud.selectSong': '- 楽曲を選択 -',
    'hud.loading': '読み込み中...',
    'hud.loadingSong': '「{title}」を読み込んでいます...',
    'hud.loadFailed': '「{title}」の読み込みに失敗しました。もう一度お試しください。',
    'settings.label': '設定',
    'menu.howTo': '遊び方',
    'menu.lyrics': '浮かび上がる歌詞をタップしよう',
    'menu.drift': '水面を漂う文字を眺めてみて。',
    'menu.fill': 'タップするたびにゲージがたまるよ',
    'menu.maxed': 'ゲージが満タンになると、特別な何かが起こるかも...？',
    'menu.version': '- バージョン {v} -',
    'menu.developer': '制作：{name}',
    'menu.artist': 'アート：{name}',
    'menu.translator': '翻訳：{name}',
    'orient.title': '画面を横向きにしてね',
    'orient.body': '横画面にすると、もっと楽しめるよ！',
    'orient.ignore': 'そのまま続ける',
  },
  en: {
    'app.title': 'Serene Park - A TextAlive Lyric App',
    'app.subtitle': 'Created for the "Magical Mirai 2026" Programming Contest',
    'splash.loading': 'Loading application...',
    'splash.error': 'Failed to load. Please try again.',
    'hud.play': '▶ Play',
    'hud.pause': '❚❚ Pause',
    'hud.selectSong': '- Select a song -',
    'hud.loading': 'Loading...',
    'hud.loadingSong': 'Loading "{title}"...',
    'hud.loadFailed': 'Failed to load "{title}". Please try again.',
    'settings.label': 'Settings',
    'menu.howTo': 'How to Use',
    'menu.lyrics': 'Tap the lyrics as they surface',
    'menu.drift': 'Watch as characters drift on the water.',
    'menu.fill': 'Each tap fills the progress bar',
    'menu.maxed': 'Something special will happen once the bar is full.',
    'menu.version': '- Version {v} -',
    'menu.developer': 'Made by {name}',
    'menu.artist': 'Art by {name}',
    'menu.translator': '',
    'orient.title': 'Please rotate your device',
    'orient.body': 'Switch to landscape orientation for a better experience.',
    'orient.ignore': 'Ignore and continue',
  },
};

// Switch to Japanese if browser prefers it
function detectLang(): Lang {
  const tag = (navigator.languages?.[0] ?? navigator.language ?? '').toLowerCase();
  return tag.startsWith('ja') ? 'ja' : FALLBACK_LANG;
}

let current: Lang = detectLang();
const listeners = new Set<(lang: Lang) => void>();

// Reflect active language on <html>
document.documentElement.lang = current;

export function getLang(): Lang {
  return current;
}

// If a change happened, switch language and notify all subscribers
export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  document.documentElement.lang = lang;
  document.title = t('app.title');
  listeners.forEach((fn) => fn(current));
}

/** Listen for language changes and return an unsubscribe function */
export function onLangChange(fn: (lang: Lang) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Look up a translation and interpolate placeholders */
export function t(key: string, vars?: Vars): string {
  let s = STRINGS[current]?.[key] ?? STRINGS[FALLBACK_LANG][key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}
