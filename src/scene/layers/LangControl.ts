import { LANGS, getLang, setLang, t, onLangChange, type Lang } from '../../i18n/index.ts';
import { getState } from '../../player/state.ts';
import type { TextAlivePlayer } from '../../player/textalive.ts';

// Inject version from package.json at build time
declare const __APP_VERSION__: string;

// Credits shown in menu footer
const APP_VERSION = __APP_VERSION__;
const APP_DEVELOPER = 'Antasma245';
const APP_ARTIST = 'Pixel-Boy & AAA';
const APP_TRANSLATOR = 'Procyon';

// Two-letter codes for language control (always shown as JA/EN)
const LANG_CODE: Record<Lang, string> = { ja: 'JA', en: 'EN' };

/** Mount language button into slot (click opens full-screen menu and pauses playback) */
export function mountLangControl(slot: HTMLElement, ta: TextAlivePlayer): HTMLElement {
  // Button sitting in the HUD control row
  const btn = document.createElement('button');
  btn.id = 'lang-button';
  btn.type = 'button';
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.setAttribute('aria-expanded', 'false');
  const icon = document.createElement('span');
  icon.className = 'material-symbols-outlined';
  icon.textContent = 'language';
  btn.appendChild(icon);

  // Full-screen overlay shown when menu opens
  const overlay = document.createElement('div');
  overlay.id = 'how-to-overlay';
  overlay.classList.add('hidden');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  // Centered panel (app title, language toggle and How to Use section)
  const panel = document.createElement('div');
  panel.className = 'menu-panel';

  const header = document.createElement('div');
  header.className = 'menu-header';
  const title = document.createElement('h1');
  title.className = 'menu-title';
  const subtitle = document.createElement('p');
  subtitle.className = 'menu-subtitle';
  header.append(title, subtitle);

  // Segmented language control (one pill per language with switch on click)
  const seg = document.createElement('div');
  seg.className = 'menu-segmented';
  seg.setAttribute('role', 'group');
  const segItems = new Map<Lang, HTMLButtonElement>();
  LANGS.forEach(({ code, label }) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'menu-seg';
    const codeEl = document.createElement('span');
    codeEl.className = 'menu-seg-code';
    codeEl.textContent = LANG_CODE[code];
    const nameEl = document.createElement('span');
    nameEl.className = 'menu-seg-name';
    nameEl.textContent = label;
    item.append(codeEl, nameEl);
    item.addEventListener('click', () => setLang(code));
    segItems.set(code, item);
    seg.appendChild(item);
  });

  // How to Use section (yellow heading over instruction lines)
  const howTo = document.createElement('div');
  howTo.className = 'menu-howto';
  const howToTitle = document.createElement('h2');
  howToTitle.className = 'menu-howto-title';
  const howToBody = document.createElement('div');
  howToBody.className = 'menu-howto-body';

  const lyricsLine = document.createElement('p');
  const driftLine = document.createElement('small');
  const fillLine = document.createElement('p');
  const maxedLine = document.createElement('small');
  howToBody.append(lyricsLine, driftLine, fillLine, maxedLine);
  howTo.append(howToTitle, howToBody);

  // Footer credits (version, developer, artist and translator)
  const footer = document.createElement('div');
  footer.className = 'menu-footer';
  const versionEl = document.createElement('span');
  const devEl = document.createElement('span');
  const artistEl = document.createElement('span');
  const translatorEl = document.createElement('span');
  footer.append(versionEl, devEl, artistEl, translatorEl);

  panel.append(header, seg, howTo);
  overlay.append(panel, footer);

  let open = false;

  // Re-apply every localized string (called once and on each language change)
  function syncText(): void {
    title.textContent = t('app.title');
    subtitle.textContent = t('app.subtitle');
    howToTitle.textContent = t('menu.howTo');
    lyricsLine.textContent = t('menu.lyrics');
    driftLine.textContent = t('menu.drift');
    fillLine.textContent = t('menu.fill');
    maxedLine.textContent = t('menu.maxed');
    versionEl.textContent = t('menu.version', { v: APP_VERSION });
    devEl.textContent = t('menu.developer', { name: APP_DEVELOPER });
    artistEl.textContent = t('menu.artist', { name: APP_ARTIST });
    translatorEl.textContent = t('menu.translator', { name: APP_TRANSLATOR });
    btn.title = t('settings.label');
    btn.setAttribute('aria-label', t('settings.label'));
    segItems.forEach((el, code) => el.classList.toggle('active', code === getLang()));
  }

  function openMenu(): void {
    open = true;
    // Pause playback to avoid song running behind menu
    if (getState().isPlaying) ta.pause();
    overlay.classList.remove('hidden');
    // Dim and disable other HUD controls (language button can still close menu)
    document.body.classList.add('menu-open');
    btn.setAttribute('aria-expanded', 'true');
    btn.classList.add('active');
  }
  function close(): void {
    open = false;
    overlay.classList.add('hidden');
    document.body.classList.remove('menu-open');
    btn.setAttribute('aria-expanded', 'false');
    btn.classList.remove('active');
  }

  // Button toggles menu (escape closes it too)
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    open ? close() : openMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (open && e.key === 'Escape') close();
  });

  onLangChange(syncText);
  syncText();

  slot.appendChild(btn);
  document.body.appendChild(overlay);
  return btn;
}
