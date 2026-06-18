import './style.css';
import { createScene, letterbox } from './scene/Scene.ts';
import { loadSceneAssets } from './scene/assets.ts';
import { SkyLayer } from './scene/layers/Sky.ts';
import { BuildingsLayer } from './scene/layers/Buildings.ts';
import { PathLayer } from './scene/layers/Path.ts';
import { LakeLayer } from './scene/layers/Lake.ts';
import { LyricLayer } from './scene/layers/LyricLayer.ts';
import { mountHud } from './scene/layers/UI.ts';
import { mountLangControl } from './scene/layers/LangControl.ts';
import { mountOrientationGuard } from './scene/layers/OrientationGuard.ts';
import { createTextAlivePlayer } from './player/textalive.ts';
import { ensureLyricFont } from './lyrics/font.ts';
import { AudioPulse } from './audio/pulse.ts';
import { t } from './i18n/index.ts';

async function boot(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) throw new Error('#app not found');

  document.title = t('app.title');

  // Set --s before splash renders so its text scales with canvas too
  document.documentElement.style.setProperty('--s', String(letterbox().scale));

  // Loading splash, removed once scene is ready
  const splash = document.createElement('div');
  splash.id = 'splash';
  splash.textContent = t('splash.loading');
  document.body.appendChild(splash);

  // Build Pixi scene and load every image asset
  const scene = await createScene(app);
  const assets = await loadSceneAssets();

  // Create each visual layer and add it to its scene container
  const sky = new SkyLayer(assets);
  const buildings = new BuildingsLayer(assets.windows);
  const path = new PathLayer(assets);
  const lake = new LakeLayer(scene.app, scene.layers.lake, assets);
  const lyrics = new LyricLayer({
    onClick: (x, y) => lake.splash(x, y),
  });
  // Make lyric cards warp with water
  scene.layers.lyrics.filters = [lake.displacement];

  scene.layers.sky.addChild(sky.view);
  scene.layers.buildings.addChild(buildings.view);
  scene.layers.path.addChild(path.view);
  scene.layers.lake.addChild(lake.bg);
  scene.layers.lyrics.addChild(lyrics.view);

  // Off-screen host for TextAlive media player
  const media = document.createElement('div');
  media.id = 'media';
  media.style.position = 'fixed';
  media.style.left = '-9999px';
  document.body.appendChild(media);

  // Start TextAlive player (callback runs each time lyrics load)
  const ta = await createTextAlivePlayer(media, async () => {
    // Download font characters for the song before lyric card rasterization
    await ensureLyricFont(ta.phrases.map((p) => p.text).join(''));
    lyrics.load(ta.phrases);
  });

  // Mount HTML overlays (HUD, language menu, and device orientation prompt)
  const { langSlot } = mountHud(document.body, ta, scene);
  mountLangControl(langSlot, ta);
  mountOrientationGuard();

  // On each frame, read audio pulse from playback then update every layer
  const pulse = new AudioPulse(ta.player);
  scene.app.ticker.add((ticker) => {
    const dt = ticker.deltaMS;
    pulse.update(dt);
    sky.update();
    buildings.update();
    path.update(dt);
    lake.update(dt);
    lyrics.update(dt);
  });

  // Fade splash out once first frame has rendered
  requestAnimationFrame(() => {
    splash.classList.add('hidden');
    setTimeout(() => splash.remove(), 700);
  });
}

// Show any boot failure on splash
boot().catch((err) => {
  console.error(err);
  const el = document.getElementById('splash');
  if (el) el.textContent = t('splash.error');
});
