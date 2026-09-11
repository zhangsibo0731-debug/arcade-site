(function (global) {
  'use strict';
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function normalize(x, y) { const length = Math.hypot(x, y); return length > 0 ? { x: x / length, y: y / length } : { x: 0, y: 0 }; }
  function nearest(origin, targets, range) {
    let best = null; let bestDistance = range == null ? Infinity : range;
    targets.forEach((target) => { if (!target.dead) { const current = distance(origin, target); if (current < bestDistance) { best = target; bestDistance = current; } } });
    return best;
  }
  function circleHit(a, b) { return distance(a, b) <= (a.r || 0) + (b.r || 0); }
  function moveInside(actor, dx, dy, dt, bounds) {
    actor.x = clamp(actor.x + dx * dt, bounds.left + actor.r, bounds.right - actor.r);
    actor.y = clamp(actor.y + dy * dt, bounds.top + actor.r, bounds.bottom - actor.r);
    return actor;
  }
  global.DungeonCombatRules = Object.freeze({ clamp, distance, normalize, nearest, circleHit, moveInside });
})(typeof window !== 'undefined' ? window : globalThis);

