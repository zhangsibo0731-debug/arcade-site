(function (global) {
  'use strict';

  const LOCATIONS = Object.freeze({
    lake: Object.freeze({
      id: 'lake',
      name: '月湖',
      icon: '🌙',
      subtitle: '熟悉而宁静的湖畔',
      collectionLabel: 'MOONLAKE COLLECTION',
      weightRecordLabel: '本湖最大重量！',
      legendaryTitle: '月光奇迹！',
      mechanic: 'none',
      unlock: 'default',
      fishIds: Object.freeze(['crucian', 'carp', 'loach', 'catfish', 'perch', 'trout', 'eel', 'puffer', 'icefin', 'starlight', 'koi', 'moon']),
    }),
    river: Object.freeze({
      id: 'river',
      name: '清溪',
      icon: '≋',
      subtitle: '水流带来新的相遇',
      collectionLabel: 'CLEARSTREAM COLLECTION',
      weightRecordLabel: '本溪最大重量！',
      legendaryTitle: '溪谷传说！',
      mechanic: 'current',
      unlock: Object.freeze({ discoveredFish: 6 }),
      fishIds: Object.freeze(['loach', 'trout', 'ayu', 'pale-chub', 'yamame', 'silver-minnow', 'stone-loach', 'cherry-salmon', 'torrent-catfish', 'taimen']),
    }),
    coast: Object.freeze({
      id: 'coast',
      name: '潮汐湾',
      icon: '🌊',
      subtitle: '盐风与灯塔守望的海湾',
      collectionLabel: 'TIDAL COVE COLLECTION',
      weightRecordLabel: '本湾最大重量！',
      legendaryTitle: '潮汐奇遇！',
      mechanic: 'surge',
      unlock: Object.freeze({
        discoveredFish: 14,
        rareFishIds: Object.freeze(['icefin', 'starlight', 'koi', 'moon', 'cherry-salmon', 'torrent-catfish', 'taimen']),
        clueItemIds: Object.freeze(['message-bottle', 'old-compass']),
      }),
      fishIds: Object.freeze(['silver-sardine', 'blue-mackerel', 'sand-flounder', 'sea-bream', 'sea-bass', 'puffer', 'eel', 'reef-octopus', 'bluefin-tuna', 'starlit-sailfish']),
    }),
  });

  function discoveredFishCount(collection) {
    return Object.values(collection || {}).filter((record) => record && record.count > 0).length;
  }

  function unlockProgressFor(location, collection, itemCollection) {
    if (!location || location.unlock === 'default') return { fish: 0, fishNeeded: 0, rare: true, clue: true };
    const unlock = location.unlock;
    return {
      fish: discoveredFishCount(collection),
      fishNeeded: unlock.discoveredFish || 0,
      rare: !unlock.rareFishIds || unlock.rareFishIds.some((id) => collection && collection[id] && collection[id].count > 0),
      clue: !unlock.clueItemIds || unlock.clueItemIds.some((id) => itemCollection && Number(itemCollection[id]) > 0),
    };
  }

  function meetsUnlock(location, collection, itemCollection) {
    if (!location || location.unlock === 'default') return true;
    const progress = unlockProgressFor(location, collection, itemCollection);
    return progress.fish >= progress.fishNeeded && progress.rare && progress.clue;
  }

  function resolveUnlocked(collection, itemCollection, saved) {
    const unlocked = new Set(Array.isArray(saved) ? saved : []);
    Object.values(LOCATIONS).forEach((location) => {
      if (meetsUnlock(location, collection, itemCollection)) unlocked.add(location.id);
    });
    return Object.keys(LOCATIONS).filter((id) => unlocked.has(id));
  }

  function progressFor(location, collection) {
    if (!location) return { found: 0, total: 0 };
    const found = location.fishIds.filter((id) => collection[id] && collection[id].count > 0).length;
    return { found, total: location.fishIds.length };
  }

  global.FishingLocations = Object.freeze({ LOCATIONS, discoveredFishCount, unlockProgressFor, meetsUnlock, resolveUnlocked, progressFor });
})(window);
