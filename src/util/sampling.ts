// Rectangular region defined by edges to drop a point into
export interface Region {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface Point {
  x: number;
  y: number;
}

// Best candidate sampling to avoid clumps and overlaps of items
export function bestCandidateSpot(
  rng: () => number,
  attempts: number,
  region: Region,
  occupied: readonly Point[],
): Point {
  let best: Point = { x: region.x0, y: region.y0 };
  let bestDist = -1;
  for (let i = 0; i < attempts; i++) {
    const x = region.x0 + rng() * (region.x1 - region.x0);
    const y = region.y0 + rng() * (region.y1 - region.y0);
    // Squared distance from candidate to closest occupied neighbour
    let nearest = Infinity;
    for (const o of occupied) {
      const dx = o.x - x;
      const dy = o.y - y;
      const d = dx * dx + dy * dy;
      if (d < nearest) nearest = d;
    }
    // Keep most isolated candidate seen so far
    if (nearest > bestDist) {
      bestDist = nearest;
      best = { x, y };
    }
  }
  return best;
}
