(function (global) {
  'use strict';

  const LEGACY_FISH_SETS = Object.freeze({
    'lake-base': Object.freeze(['crucian', 'carp', 'loach', 'catfish', 'perch', 'trout', 'eel', 'puffer', 'icefin', 'starlight', 'koi', 'moon']),
    'river-base': Object.freeze(['loach', 'trout', 'ayu', 'pale-chub', 'yamame', 'silver-minnow', 'stone-loach', 'cherry-salmon', 'torrent-catfish', 'taimen']),
    'coast-base': Object.freeze(['silver-sardine', 'blue-mackerel', 'sand-flounder', 'sea-bream', 'sea-bass', 'puffer', 'eel', 'reef-octopus', 'bluefin-tuna', 'starlit-sailfish']),
    'abyss-base': Object.freeze(['lanternfish', 'hatchetfish', 'fangtooth', 'barreleye', 'giant-isopod', 'reef-octopus', 'bluefin-tuna', 'viperfish', 'oarfish', 'luminous-coelacanth']),
  });
  const ALL_FISH = global.FishingFishData.FISH
    .concat(global.FishingLakeExpansionFishData.LAKE_EXPANSION_FISH, global.FishingRiverFishData.RIVER_FISH, global.FishingRiverExpansionFishData.RIVER_EXPANSION_FISH, global.FishingCoastFishData.COAST_FISH, global.FishingAbyssFishData.ABYSS_FISH);
  const FISH_METADATA_VALIDATION = global.FishingFishMetadata.validate(ALL_FISH);
  if (!FISH_METADATA_VALIDATION.valid) {
    throw new Error('Fishing fish metadata is invalid: ' + FISH_METADATA_VALIDATION.errors.join('; '));
  }
  const GENERATED_FISH_SETS = global.FishingFishMetadata.buildCollectionSets(ALL_FISH);
  const GENERATED_BASE_SETS = Object.freeze(Object.keys(LEGACY_FISH_SETS).reduce((sets, id) => {
    sets[id] = GENERATED_FISH_SETS[id] || Object.freeze([]);
    return sets;
  }, {}));
  const GENERATED_SETS_MATCH_LEGACY = global.FishingFishMetadata.sameSets(GENERATED_BASE_SETS, LEGACY_FISH_SETS);
  const ACTIVE_FISH_SETS = GENERATED_SETS_MATCH_LEGACY
    ? GENERATED_FISH_SETS
    : Object.freeze(Object.assign({}, GENERATED_FISH_SETS, LEGACY_FISH_SETS));
  if (!GENERATED_SETS_MATCH_LEGACY && global.console && typeof global.console.error === 'function') {
    global.console.error('Generated fishing base sets differ from the compatibility map; preserving expansion sets and using compatibility base sets.');
  }
  const COLLECTION_SETS = Object.freeze(Object.assign({}, ACTIVE_FISH_SETS, {
    'abyss-items-base': Object.freeze(['broken-dive-lamp', 'corroded-rivet', 'torn-deep-net', 'abyssal-coin', 'crystal-compass', 'sealed-logbook']),
  }));

  const CATEGORIES = Object.freeze({
    catalog: Object.freeze({ label: '图鉴', accent: 'aqua', icon: 'book' }),
    challenge: Object.freeze({ label: '挑战', accent: 'gold', icon: 'hook' }),
    exploration: Object.freeze({ label: '探索', accent: 'violet', icon: 'compass' }),
    journey: Object.freeze({ label: '旅程', accent: 'orange', icon: 'basket' }),
    encounter: Object.freeze({ label: '奇遇', accent: 'mist', icon: 'spark' }),
  });

  function achievement(id, category, title, description, icon, frame, retroactive, condition, extra) {
    return Object.freeze(Object.assign({ id, category, title, description, icon, frame, retroactive, condition }, extra || {}));
  }

  const ACHIEVEMENTS = Object.freeze([
    achievement('first-catch', 'catalog', '初次相遇', '钓到第一条鱼', 'fish', 'common', true, { type: 'stat', path: 'totalCaught', gte: 1 }),
    achievement('discover-10', 'catalog', '水中百态', '发现 10 种不同的鱼', 'book', 'common', true, { type: 'uniqueCount', source: 'collection', gte: 10 }),
    achievement('discover-25', 'catalog', '博闻钓客', '发现 25 种不同的鱼', 'book', 'rare', true, { type: 'uniqueCount', source: 'collection', gte: 25 }),
    achievement('complete-lake-base', 'catalog', '月湖博物志', '完成月湖基础图鉴', 'moon-fish', 'rare', true, { type: 'collectionSet', set: 'lake-base', source: 'collection' }, { special: true }),
    achievement('four-waters-observer', 'catalog', '四水观察家', '在四个钓场都发现至少一种鱼', 'four-waters', 'rare', true, { type: 'locationCoverage', gte: 4 }),
    achievement('complete-base-catalog', 'catalog', '初代博物学家', '完成四个基础鱼类图鉴', 'four-waters', 'legendary', true, { type: 'allOf', conditions: ['lake-base', 'river-base', 'coast-base', 'abyss-base'].map((set) => ({ type: 'collectionSet', set, source: 'collection' })) }, { special: true }),

    achievement('catch-streak-3', 'challenge', '稳稳上鱼', '连续捕获 3 次', 'hook', 'common', true, { type: 'stat', path: 'bestStreak', gte: 3 }),
    achievement('catch-streak-10', 'challenge', '一竿不空', '连续捕获 10 次', 'flame-hook', 'rare', true, { type: 'stat', path: 'bestStreak', gte: 10 }),
    achievement('catch-large', 'challenge', '大鱼上岸', '捕获一条大型鱼', 'large-fish', 'common', false, { type: 'eventMatch', event: 'fishCaught', fields: { sizeRank: ['大型', '巨型', '纪录级'] } }),
    achievement('catch-record-size', 'challenge', '湖中巨物', '捕获一条纪录级鱼', 'crown-fish', 'rare', false, { type: 'eventMatch', event: 'fishCaught', fields: { sizeRank: '纪录级' } }),
    achievement('rare-without-hook', 'challenge', '不借外力', '关闭稳定鱼钩捕获稀有鱼', 'bare-hook', 'rare', false, { type: 'eventMatch', event: 'fishCaught', fields: { rarity: ['稀有', '传说'], stableHook: false } }),
    achievement('barehanded-legend', 'challenge', '赤手传奇', '普通鱼饵且关闭稳定鱼钩捕获传说鱼', 'legend-hook', 'legendary', false, { type: 'eventMatch', event: 'fishCaught', fields: { rarity: '传说', bait: 'normal', stableHook: false } }, { special: true }),
    achievement('rainy-night-legend', 'challenge', '雨夜来客', '在雨夜捕获一条传说鱼', 'moon-fish', 'legendary', false, { type: 'eventMatch', event: 'fishCaught', fields: { rarity: '传说', time: 'night', weather: 'rain' } }, { hidden: true, special: true }),

    achievement('first-treasure', 'exploration', '水底有东西', '发现第一件宝物', 'treasure', 'common', true, { type: 'uniqueCount', source: 'treasureCollection', gte: 1 }),
    achievement('unlock-river', 'exploration', '顺流而下', '解锁清溪', 'river', 'common', true, { type: 'includes', source: 'unlockedLocations', value: 'river' }),
    achievement('unlock-coast', 'exploration', '听见海风', '解锁潮汐湾', 'lighthouse', 'rare', true, { type: 'includes', source: 'unlockedLocations', value: 'coast' }),
    achievement('unlock-abyss', 'exploration', '海图背面', '解锁隐藏钓场星渊', 'abyss-map', 'legendary', true, { type: 'includes', source: 'unlockedLocations', value: 'abyss' }, { special: true }),
    achievement('complete-abyss-items', 'exploration', '深海考古', '完成星渊基础水边收藏', 'relic', 'legendary', true, { type: 'collectionSet', set: 'abyss-items-base', source: 'itemCollection' }, { special: true }),

    achievement('first-sale', 'journey', '第一桶金', '第一次出售鱼获', 'coin', 'common', false, { type: 'counter', key: 'fishSold', gte: 1 }),
    achievement('coins-500', 'journey', '小有积蓄', '持有 500 金币', 'coins', 'common', true, { type: 'stat', path: 'coins', gte: 500 }),
    achievement('bait-customer-5', 'journey', '湖边常客', '购买高级鱼饵 5 次', 'bait', 'rare', false, { type: 'counter', key: 'baitPurchases', gte: 5 }),
    achievement('record-hunter-3', 'journey', '重量猎人', '累计 3 次刷新同种鱼的重量纪录', 'scale', 'rare', false, { type: 'counter', key: 'weightRecords', gte: 3 }),

    achievement('escape-streak-3', 'encounter', '今天不宜钓鱼', '连续让 3 条鱼逃脱', 'broken-line', 'common', false, { type: 'streak', key: 'escape', gte: 3 }),
    achievement('escape-near-win', 'encounter', '就差一点', '捕获进度达到 90% 后让鱼逃脱', 'almost', 'rare', false, { type: 'eventMatch', event: 'fishEscaped', fields: { progress: { gte: .9 } } }),
    achievement('missed-bite', 'encounter', '它看了我一眼', '咬钩后没有及时提竿', 'bobber', 'common', false, { type: 'eventMatch', event: 'biteMissed', fields: {} }),
    achievement('premium-common', 'encounter', '高级鱼饵体验卡', '使用高级鱼饵钓到常见鱼', 'shrug-bait', 'common', false, { type: 'eventMatch', event: 'fishCaught', fields: { rarity: '常见', bait: 'premium' } }),
    achievement('first-junk', 'encounter', '至少不是空军', '获得第一件普通杂物', 'boot', 'common', true, { type: 'uniqueCount', source: 'junkCollection', gte: 1 }),
    achievement('bait-donor', 'encounter', '鱼饵慈善家', '累计三次错过咬钩时机', 'shrug-bait', 'rare', false, { type: 'counter', key: 'bitesMissed', gte: 3 }, { hidden: true }),
  ]);

  // Development-only conditions used by the isolated test hook. They are not
  // included in ACHIEVEMENTS and never appear in the player's memorial book.
  const TEST_ACHIEVEMENTS = Object.freeze([
    achievement('__test-tag-legend', 'challenge', '标签测试', '标签组合匹配', 'fish', 'common', false, { type: 'eventMatch', event: 'fishCaught', tagsAll: ['legendary'], tagsAny: ['freshwater', 'abyssal'], excludeTags: ['common'] }),
    achievement('__test-sequence-tolerant', 'encounter', '宽容序列测试', '杂物后在窗口内发现宝物', 'treasure', 'common', false, { type: 'sequence', steps: [{ event: 'itemCaught', fields: { itemType: 'junk' } }, { event: 'itemCaught', fields: { itemType: 'treasure' } }], maxEvents: 3 }),
    achievement('__test-sequence-strict', 'challenge', '严格序列测试', '连续捕获常见鱼与稀有鱼', 'hook', 'common', false, { type: 'sequence', steps: [{ event: 'fishCaught', tagsAll: ['common'] }, { event: 'fishCaught', tagsAll: ['rare'] }], maxEvents: 1, resetOnMismatch: true }),
  ]);

  const FISH_METADATA_STATUS = Object.freeze({
    valid: FISH_METADATA_VALIDATION.valid,
    fishCount: FISH_METADATA_VALIDATION.count,
    generatedSetsMatchLegacy: GENERATED_SETS_MATCH_LEGACY,
    source: GENERATED_SETS_MATCH_LEGACY ? 'fish-metadata' : 'compatibility-fallback',
  });

  global.FishingAchievementData = Object.freeze({ COLLECTION_SETS, CATEGORIES, ACHIEVEMENTS, TEST_ACHIEVEMENTS, FISH_METADATA_STATUS });
})(window);
