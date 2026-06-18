import { Application, Container } from 'pixi.js';

export const SCENE_W = 640;
export const SCENE_H = 360;

// Vertical bands of scene in logical Y coordinates (top = 0)
export const HORIZON = {
  pathTop: 216,
  pathBottom: 232,
  lakeTop: 243,
  lakeBottom: SCENE_H,
};

/** Letterboxed scene rect (position and scale) inside a viewport */
export interface Letterbox {
  scale: number;
  offX: number;
  offY: number;
  width: number;
  height: number;
}

// Fit scene into viewport preserving aspect ratio and centering it
export function letterbox(
  w: number = window.innerWidth,
  h: number = window.innerHeight,
): Letterbox {
  const scale = Math.min(w / SCENE_W, h / SCENE_H);
  return {
    scale,
    offX: (w - SCENE_W * scale) / 2,
    offY: (h - SCENE_H * scale) / 2,
    width: SCENE_W * scale,
    height: SCENE_H * scale,
  };
}

export interface SceneLayers {
  sky: Container;
  buildings: Container;
  path: Container;
  water: Container;
  lake: Container;
  lyrics: Container;
  ui: Container;
}

export interface Scene {
  app: Application;
  root: Container;
  world: Container;
  layers: SceneLayers;
  resize(): void;
}

// Create Pixi application and layer container tree then drop canvas into host
export async function createScene(host: HTMLElement): Promise<Scene> {
  const app = new Application();
  await app.init({
    background: '#0c1326',
    resizeTo: host,
    antialias: false,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  host.appendChild(app.canvas);

  const root = new Container();
  app.stage.addChild(root);

  // World holds letterboxed scene while UI stays in renderer space
  const layer = (label: string): Container => {
    const c = new Container();
    c.label = label;
    return c;
  };

  const world = layer('world');
  root.addChild(world);

  const sky = layer('sky');
  const buildings = layer('buildings');
  const path = layer('path');
  const water = layer('water');
  const lake = layer('lake');
  const lyrics = layer('lyrics');
  const ui = layer('ui');

  // Keep lake water and lyric cards together so displacement filter warps both
  water.addChild(lake, lyrics);
  world.addChild(sky, buildings, path, water);
  root.addChild(ui);

  const scene: Scene = {
    app,
    root,
    world,
    layers: { sky, buildings, path, water, lake, lyrics, ui },
    // Rescale and recenter world every time the renderer resizes
    resize() {
      const box = letterbox(app.renderer.width, app.renderer.height);
      world.scale.set(box.scale);
      world.position.set(box.offX, box.offY);
    },
  };

  scene.resize();
  app.renderer.on('resize', () => scene.resize());

  return scene;
}
