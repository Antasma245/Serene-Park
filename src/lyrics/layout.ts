import { HORIZON, SCENE_W } from '../scene/Scene.ts';
import { bestCandidateSpot, type Point } from '../util/sampling.ts';

// Usable band of lake for placing cards with inset from edges
const TOP = HORIZON.lakeTop + 20;
const BOT = HORIZON.lakeBottom - 27;
const SIDE = 40;

// How many spots a card tries before it picks one (best candidate sampling)
const SPAWN_CANDIDATES = 5;

// Spawn point for a card (drawn from caller seeded RNG)
export function spawnPosition(rng: () => number, occupied: readonly Point[]): Point {
  const region = { x0: SIDE, x1: SCENE_W - SIDE, y0: TOP, y1: BOT };
  return bestCandidateSpot(rng, SPAWN_CANDIDATES, region, occupied);
}
