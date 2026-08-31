(function (global) {
  'use strict';

  const RARITY_TAGS = Object.freeze({ '常见': 'common', '少见': 'uncommon', '稀有': 'rare', '传说': 'legendary' });
  const ALLOWED_TAGS = new Set([
    'freshwater', 'saltwater', 'abyssal',
    'common', 'uncommon', 'rare', 'legendary',
    'calm', 'active', 'dash',
    'day', 'dusk', 'night', 'clear', 'rain',
  ]);

  function unique(values) {
    return Array.from(new Set((values || []).filter(Boolean)));
  }

  function decorate(items, options) {
    const config = options || {};
    const sets = config.sets || {};
    return Object.freeze((items || []).map((item) => {
      const collectionSets = unique(item.collectionSets || sets[item.id]);
      const tags = unique([
        config.water,
        RARITY_TAGS[item.rarity],
        item.behavior,
      ].concat(item.times || [], item.weathers || [], item.tags || []));
      return Object.freeze(Object.assign({}, item, {
        collectionSets: Object.freeze(collectionSets),
        tags: Object.freeze(tags),
      }));
    }));
  }

  function validate(items) {
    const errors = [];
    const ids = new Set();
    (items || []).forEach((item, index) => {
      const label = item && item.id || 'index-' + index;
      if (!item || !item.id) errors.push(label + ': missing id');
      else if (ids.has(item.id)) errors.push(item.id + ': duplicate id');
      else ids.add(item.id);
      if (!Array.isArray(item && item.collectionSets) || !item.collectionSets.length) errors.push(label + ': missing collectionSets');
      (item && item.collectionSets || []).forEach((set) => {
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(set)) errors.push(label + ': invalid collection set ' + set);
      });
      if (!Array.isArray(item && item.tags) || !item.tags.length) errors.push(label + ': missing tags');
      (item && item.tags || []).forEach((tag) => {
        if (!ALLOWED_TAGS.has(tag)) errors.push(label + ': unknown tag ' + tag);
      });
    });
    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), count: ids.size });
  }

  function buildCollectionSets(items) {
    const result = {};
    (items || []).forEach((item) => {
      (item.collectionSets || []).forEach((set) => {
        if (!result[set]) result[set] = [];
        if (!result[set].includes(item.id)) result[set].push(item.id);
      });
    });
    Object.keys(result).forEach((set) => Object.freeze(result[set]));
    return Object.freeze(result);
  }

  function sameSets(actual, expected) {
    const names = unique(Object.keys(actual || {}).concat(Object.keys(expected || {}))).sort();
    return names.every((name) => {
      const left = (actual[name] || []).slice().sort();
      const right = (expected[name] || []).slice().sort();
      return left.length === right.length && left.every((id, index) => id === right[index]);
    });
  }

  global.FishingFishMetadata = Object.freeze({ decorate, validate, buildCollectionSets, sameSets, RARITY_TAGS });
})(window);
