(function (global) {
  'use strict';

  const BASE_VALUE = Object.freeze({ '常见': 18, '少见': 55, '稀有': 180, '传说': 800 });
  const BAG_CAPACITY = 60;
  const MAX_COINS = 999999999;
  const MAX_BAIT = 9999;

  function boundedInt(value, fallback, max) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(max, Math.floor(number))) : fallback;
  }

  function fishValue(item, weight) {
    const ratio = Math.max(0, Math.min(1, (weight - item.min) / Math.max(1, item.max - item.min)));
    return Math.max(1, Math.round(BASE_VALUE[item.rarity] * (.72 + ratio * .78) + weight / 250));
  }

  function bagValue(bag) {
    return bag.reduce((sum, entry) => sum + (entry && Number(entry.value) || 0), 0);
  }

  function normalizeCoins(value) {
    return boundedInt(value, 0, MAX_COINS);
  }

  function normalizeTackle(raw) {
    const value = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const premiumBait = boundedInt(value.premiumBait, 5, MAX_BAIT);
    return {
      premiumBait,
      selectedBait: value.selectedBait === 'premium' && premiumBait > 0 ? 'premium' : 'normal',
      stableHook: typeof value.stableHook === 'boolean' ? value.stableHook : true,
      magnet: typeof value.magnet === 'boolean' ? value.magnet : true,
    };
  }

  function normalizeBag(raw, fishById) {
    if (!Array.isArray(raw)) return [];
    return raw.reduce((bag, entry) => {
      if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string') return bag;
      const item = fishById.get(entry.id);
      const weight = Number(entry.weight);
      if (!item || !Number.isFinite(weight) || weight < item.min || weight > item.max) return bag;
      bag.push({ id: item.id, weight: Math.round(weight), value: fishValue(item, weight) });
      return bag;
    }, []).slice(-BAG_CAPACITY);
  }

  global.FishingEconomy = Object.freeze({
    BAG_CAPACITY,
    MAX_COINS,
    MAX_BAIT,
    fishValue,
    bagValue,
    normalizeCoins,
    normalizeTackle,
    normalizeBag,
    premiumBaitPack: Object.freeze({ amount: 3, price: 90 }),
  });
})(window);
