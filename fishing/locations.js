(function (global) {
  'use strict';

  const LOCATIONS = Object.freeze({
    lake: Object.freeze({
      id: 'lake',
      name: '月湖',
      icon: '🌙',
      subtitle: '熟悉而宁静的湖畔',
      mechanic: 'none',
      unlock: 'default',
      fishIds: Object.freeze(['crucian', 'carp', 'loach', 'catfish', 'perch', 'trout', 'eel', 'puffer', 'icefin', 'starlight', 'koi', 'moon']),
    }),
    river: Object.freeze({
      id: 'river',
      name: '清溪',
      icon: '≋',
      subtitle: '水流带来新的相遇',
      mechanic: 'current',
      unlock: Object.freeze({ discoveredFish: 6 }),
      fishIds: Object.freeze(['loach', 'trout', 'ayu', 'pale-chub', 'yamame', 'silver-minnow', 'stone-loach', 'cherry-salmon', 'torrent-catfish', 'taimen']),
    }),
  });

  function discoveredFishCount(collection) {
    return Object.values(collection || {}).filter((record) => record && record.count > 0).length;
  }

  function meetsUnlock(location, collection) {
    if (!location || location.unlock === 'default') return true;
    return discoveredFishCount(collection) >= (location.unlock.discoveredFish || 0);
  }

  function resolveUnlocked(collection, saved) {
    const unlocked = new Set(Array.isArray(saved) ? saved : []);
    Object.values(LOCATIONS).forEach((location) => {
      if (meetsUnlock(location, collection)) unlocked.add(location.id);
    });
    return Object.keys(LOCATIONS).filter((id) => unlocked.has(id));
  }

  function progressFor(location, collection) {
    if (!location) return { found: 0, total: 0 };
    const found = location.fishIds.filter((id) => collection[id] && collection[id].count > 0).length;
    return { found, total: location.fishIds.length };
  }

  global.FishingLocations = Object.freeze({ LOCATIONS, discoveredFishCount, meetsUnlock, resolveUnlocked, progressFor });
})(window);
