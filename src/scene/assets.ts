import { Assets, Rectangle, Texture } from 'pixi.js';
import { HORIZON, SCENE_H, SCENE_W } from './Scene.ts';

// Single lit window rectangle in scene coordinates
export interface WindowRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Building composed of uniform grid of windows
export interface Building {
  x: number;
  y: number;
  nx: number;
  ny: number;
}

// Shared window size and spacing (applied to every building grid)
const WINDOW = { w: 4, h: 6, stepX: 7, stepY: 9 };

// Expand compact building grids into flat list of individual windows
function expandBuildings(buildings: Building[]): WindowRect[] {
  const { w, h, stepX, stepY } = WINDOW;
  const rects: WindowRect[] = [];
  for (const b of buildings) {
    for (let row = 0; row < b.ny; row++) {
      for (let col = 0; col < b.nx; col++) {
        rects.push({ x: b.x + col * stepX, y: b.y + row * stepY, w, h });
      }
    }
  }
  return rects;
}

// Every texture needed by scene layers (loaded at startup)
export interface SceneAssets {
  upperDay: Texture;
  upperNight: Texture;
  lakeDay: Texture;
  lakeNight: Texture;
  sun: Texture;
  moon: Texture;
  persons: Texture[];
  // Per-character blink frames
  personsBlink: Texture[];
  // Per-character cheer frame
  personsCheer: Texture[];
  windows: WindowRect[];
}

// avatars.png is a horizontal strip of 16x16 person sprites (one row per pose)
const PERSON_W = 16;
const PERSON_H = 16;
const PERSON_COUNT = 6;

// Pixel art must use nearest neighbour upscaling to stay clear
function setNearest(tex: Texture): void {
  tex.source.scaleMode = 'nearest';
}

// Slice count frames of specific size from one row of sprite strip
function sliceStrip(tex: Texture, count: number, w: number, h: number, row = 0): Texture[] {
  return Array.from(
    { length: count },
    (_, i) => new Texture({ source: tex.source, frame: new Rectangle(i * w, row * h, w, h) }),
  );
}

// Split full backdrop at waterline into its upper (above-water) and lower (lake) halves
function splitBackdrop(tex: Texture): { upper: Texture; lake: Texture } {
  const upperH = HORIZON.lakeTop;
  const lakeH = SCENE_H - HORIZON.lakeTop;
  const upper = new Texture({
    source: tex.source,
    frame: new Rectangle(0, 0, SCENE_W, upperH),
  });
  const lake = new Texture({
    source: tex.source,
    frame: new Rectangle(0, HORIZON.lakeTop, SCENE_W, lakeH),
  });
  return { upper, lake };
}

// Load every PNG/JSON asset in parallel then slice out per-character and backdrop sub-textures
export async function loadSceneAssets(): Promise<SceneAssets> {
  const base = import.meta.env.BASE_URL;

  const [day, night, sun, moon, buildingsData, avatars] = await Promise.all([
    Assets.load<Texture>(`${base}assets/backdrop_day.png`),
    Assets.load<Texture>(`${base}assets/backdrop_night.png`),
    Assets.load<Texture>(`${base}assets/sun.png`),
    Assets.load<Texture>(`${base}assets/moon.png`),
    fetch(`${base}assets/buildings.json`).then((r) => r.json() as Promise<Building[]>),
    Assets.load<Texture>(`${base}assets/avatars.png`),
  ]);

  const windows = expandBuildings(buildingsData);

  for (const t of [day, night, sun, moon, avatars]) setNearest(t);

  // Row 0 corresponds to eyes open (with fallback to it if spritesheet lacks blink and cheer)
  const persons = sliceStrip(avatars, PERSON_COUNT, PERSON_W, PERSON_H);
  const rows = Math.floor(avatars.height / PERSON_H);
  const personsBlink = rows >= 2 ? sliceStrip(avatars, PERSON_COUNT, PERSON_W, PERSON_H, 1) : persons;
  const personsCheer = rows >= 3 ? sliceStrip(avatars, PERSON_COUNT, PERSON_W, PERSON_H, 2) : persons;

  const dayParts = splitBackdrop(day);
  const nightParts = splitBackdrop(night);

  return {
    upperDay: dayParts.upper,
    upperNight: nightParts.upper,
    lakeDay: dayParts.lake,
    lakeNight: nightParts.lake,
    sun,
    moon,
    persons,
    personsBlink,
    personsCheer,
    windows,
  };
}
