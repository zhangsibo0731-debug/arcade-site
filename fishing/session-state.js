(function (global) {
  'use strict';

  const ACTIVE_PHASES = Object.freeze(['waiting', 'bite', 'hooking', 'fishing']);
  const RESTORABLE_PHASES = Object.freeze(['ready'].concat(ACTIVE_PHASES));

  function clamp(value, min, max, fallback) {
    const number = Number(value);
    return Math.max(min, Math.min(max, Number.isFinite(number) ? number : fallback));
  }

  function create(options) {
    const storage = options.storage;
    const key = options.key;

    function save(state) {
      storage.writeObject(key, {
        phase: state.phase,
        castDistance: state.castDistance,
        castTime: state.castTime,
        castUsedPremiumBait: state.castUsedPremiumBait,
        waitLeft: state.waitLeft,
        biteLeft: state.biteLeft,
        hookTime: state.hookTime,
        fish: state.fishId,
        catchable: state.catchableId,
        fishY: state.fishY,
        fishTarget: state.fishTarget,
        fishMoveLeft: state.fishMoveLeft,
        fishWarning: state.fishWarning,
        dashPending: state.dashPending,
        dashCount: state.dashCount,
        zoneY: state.zoneY,
        zoneV: state.zoneV,
        catchProgress: state.catchProgress,
        surgeTimer: state.surgeTimer,
        surgeLeft: state.surgeLeft,
        surgeDirection: state.surgeDirection,
        streak: state.streak,
        location: state.location,
      });
    }

    function load() {
      return storage.readObject(key, null);
    }

    function clear() {
      storage.remove(key);
    }

    function normalize(saved, lookup) {
      const fish = saved.fish && lookup.fishById.get(saved.fish);
      const item = saved.catchable && lookup.itemById.get(saved.catchable);
      let phase = RESTORABLE_PHASES.includes(saved.phase) ? saved.phase : 'ready';
      if ((phase === 'hooking' || phase === 'fishing') && !fish && !item) phase = 'ready';
      const fishY = clamp(saved.fishY, .04, .96, .5);
      const location = saved.location && lookup.locations[saved.location] && lookup.unlockedLocations.includes(saved.location)
        ? saved.location
        : null;
      return {
        phase,
        fish: fish || null,
        item: item || null,
        location,
        castDistance: Number(saved.castDistance) || .55,
        castTime: Math.max(0, Number(saved.castTime) || 0),
        castUsedPremiumBait: !!saved.castUsedPremiumBait,
        waitLeft: Math.max(.4, Number(saved.waitLeft) || .4),
        biteLeft: Math.max(.8, Number(saved.biteLeft) || .8),
        hookTime: Math.max(.15, Number(saved.hookTime) || .15),
        fishY,
        fishTarget: clamp(saved.fishTarget, .04, .96, fishY),
        fishMoveLeft: Math.max(.1, Number(saved.fishMoveLeft) || .4),
        fishWarning: Math.max(0, Number(saved.fishWarning) || 0),
        dashPending: !!saved.dashPending,
        dashCount: Math.max(0, Number(saved.dashCount) || 0),
        zoneY: clamp(saved.zoneY, .16, .84, .2),
        zoneV: clamp(saved.zoneV, -.88, .84, 0),
        catchProgress: clamp(saved.catchProgress, .08, .96, .25),
        surgeTimer: clamp(saved.surgeTimer, .1, 6, 4.4),
        surgeLeft: clamp(saved.surgeLeft, 0, .45, 0),
        surgeDirection: Number(saved.surgeDirection) < 0 ? -1 : 1,
        streak: Math.max(0, Number(saved.streak) || 0),
      };
    }

    return Object.freeze({ activePhases: ACTIVE_PHASES, save, load, clear, normalize });
  }

  global.FishingSessionState = Object.freeze({ create });
})(window);
