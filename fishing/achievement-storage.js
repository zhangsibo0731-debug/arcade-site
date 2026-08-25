(function (global) {
  'use strict';

  const VERSION = 1;

  function cleanRecord(value) {
    const source = value && typeof value === 'object' ? value : {};
    const unlocked = {};
    Object.entries(source.unlocked || {}).forEach(([id, record]) => {
      if (!id || !record || typeof record !== 'object') return;
      unlocked[id] = { unlockedAt: Math.max(0, Number(record.unlockedAt) || 0), retroactive: record.retroactive === true };
    });
    const cleanNumbers = (input) => Object.fromEntries(Object.entries(input || {}).filter(([key]) => key).map(([key, count]) => [key, Math.max(0, Number(count) || 0)]));
    const unique = {};
    Object.entries(source.unique || {}).forEach(([key, list]) => {
      unique[key] = Array.from(new Set(Array.isArray(list) ? list.filter((item) => typeof item === 'string' && item) : []));
    });
    return {
      version: VERSION,
      initialized: source.initialized === true,
      unlocked,
      counters: cleanNumbers(source.counters),
      streaks: cleanNumbers(source.streaks),
      unique,
      unseen: Array.from(new Set(Array.isArray(source.unseen) ? source.unseen.filter((id) => typeof id === 'string' && id) : [])).filter((id) => unlocked[id]),
    };
  }

  function create(options) {
    const storage = options.storage;
    const key = options.key;
    let state = cleanRecord(storage.readObject(key, {}));
    function save() { storage.writeObject(key, state); }
    function replace(next) { state = cleanRecord(next); save(); return state; }
    function get() { return state; }
    function markSeen(ids) {
      const seen = new Set(Array.isArray(ids) ? ids : Object.keys(state.unlocked));
      state.unseen = state.unseen.filter((id) => !seen.has(id));
      save();
    }
    return Object.freeze({ get, save, replace, markSeen, clean: cleanRecord });
  }

  global.FishingAchievementStorage = Object.freeze({ VERSION, create, clean: cleanRecord });
})(window);
