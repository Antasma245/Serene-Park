import { t, onLangChange } from '../../i18n/index.ts';

// Limit prompt to phones/tablets (coarse pointer = mobile device)
const COARSE_POINTER = window.matchMedia('(pointer: coarse)');

/** Mount full-screen rotation prompt shown on mobile devices held in portrait */
export function mountOrientationGuard(): void {
  const overlay = document.createElement('div');
  overlay.id = 'orient-overlay';
  overlay.classList.add('hidden');
  overlay.setAttribute('role', 'alertdialog');
  overlay.setAttribute('aria-modal', 'true');

  const panel = document.createElement('div');
  panel.className = 'orient-panel';

  const icon = document.createElement('span');
  icon.className = 'material-symbols-outlined orient-icon';
  icon.textContent = 'screen_rotation';

  const title = document.createElement('h1');
  title.className = 'orient-title';

  const body = document.createElement('p');
  body.className = 'orient-body';

  // Clicking Ignore hides prompt for rest of session (returns on reload)
  const ignoreBtn = document.createElement('button');
  ignoreBtn.type = 'button';
  ignoreBtn.className = 'orient-ignore';
  let dismissed = false;

  panel.append(icon, title, body, ignoreBtn);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // Apply localized strings
  function syncText(): void {
    title.textContent = t('orient.title');
    body.textContent = t('orient.body');
    ignoreBtn.textContent = t('orient.ignore');
  }

  // Show overlay only on mobile device held in portrait
  function syncVisibility(): void {
    const portrait = window.innerHeight > window.innerWidth;
    const show = !dismissed && COARSE_POINTER.matches && portrait;
    overlay.classList.toggle('hidden', !show);
  }

  ignoreBtn.addEventListener('click', () => {
    dismissed = true;
    syncVisibility();
  });

  syncText();
  syncVisibility();

  // Re-check on language change and any time orientation or size changes
  onLangChange(syncText);
  window.addEventListener('resize', syncVisibility);
  window.addEventListener('orientationchange', syncVisibility);
}
