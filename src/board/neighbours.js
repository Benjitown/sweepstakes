// Neighbour lists per table size, built once and shared by every board.

/* =====================================================================================
   Flyweight · https://refactoring.guru/design-patterns/flyweight
   ===================================================================================== */
export const Neighbours = (() => {
  const cache = new Map();
  const build = t => Array.from({ length: t.w * t.h }, (_, i) => {
    const x = i % t.w, y = (i / t.w) | 0, a = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue; const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < t.w && ny < t.h) a.push(ny * t.w + nx);
    }
    return a;
  });
  return { for(t) { if (!cache.has(t.id)) cache.set(t.id, build(t)); return cache.get(t.id); } };
})();
