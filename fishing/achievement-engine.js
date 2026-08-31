(function (global) {
  'use strict';

  function valueAt(object, path) {
    return String(path || '').split('.').filter(Boolean).reduce((value, key) => value == null ? undefined : value[key], object);
  }

  function activeKeys(record) {
    return Object.keys(record || {}).filter((id) => {
      const value = record[id];
      return typeof value === 'number' ? value > 0 : value && Number(value.count || 0) > 0;
    });
  }

  function matches(actual, expected) {
    if (Array.isArray(expected)) return expected.includes(actual);
    if (expected && typeof expected === 'object') {
      if (Object.prototype.hasOwnProperty.call(expected, 'gte') && !(Number(actual) >= expected.gte)) return false;
      if (Object.prototype.hasOwnProperty.call(expected, 'lte') && !(Number(actual) <= expected.lte)) return false;
      if (Object.prototype.hasOwnProperty.call(expected, 'equals') && actual !== expected.equals) return false;
      return true;
    }
    return actual === expected;
  }

  function create(options) {
    const definitions = options.definitions || [];
    const sets = options.sets || {};
    const store = options.store;
    const onUnlock = typeof options.onUnlock === 'function' ? options.onUnlock : function () {};
    let state = store.get();

    function evaluate(condition, context, event) {
      if (!condition) return false;
      if (condition.type === 'allOf') return condition.conditions.every((item) => evaluate(item, context, event));
      if (condition.type === 'anyOf') return condition.conditions.some((item) => evaluate(item, context, event));
      if (condition.type === 'stat') return Number(valueAt(context, condition.path)) >= Number(condition.gte || 0);
      if (condition.type === 'counter') return Number(state.counters[condition.key] || 0) >= Number(condition.gte || 0);
      if (condition.type === 'streak') return Number(state.streaks[condition.key] || 0) >= Number(condition.gte || 0);
      if (condition.type === 'includes') return (context[condition.source] || []).includes(condition.value);
      if (condition.type === 'uniqueCount') return activeKeys(context[condition.source]).length >= Number(condition.gte || 0);
      if (condition.type === 'collectionSet') {
        const source = context[condition.source] || {};
        const ids = sets[condition.set] || [];
        return ids.length > 0 && ids.every((id) => activeKeys(source).includes(id));
      }
      if (condition.type === 'locationCoverage') {
        const collection = context.collection || {};
        const locations = context.locations || {};
        const count = Object.values(locations).filter((location) => (location.fishIds || []).some((id) => activeKeys(collection).includes(id))).length;
        return count >= Number(condition.gte || 0);
      }
      if (condition.type === 'eventMatch') {
        if (!event || event.type !== condition.event) return false;
        return Object.entries(condition.fields || {}).every(([field, expected]) => matches(valueAt(event, field), expected));
      }
      return false;
    }

    function unlock(definition, retroactive) {
      if (state.unlocked[definition.id]) return null;
      state.unlocked[definition.id] = { unlockedAt: Date.now(), retroactive: retroactive === true };
      state.unseen.push(definition.id);
      store.replace(state);
      state = store.get();
      onUnlock(definition, retroactive === true);
      return definition;
    }

    function check(context, event, retroactiveOnly) {
      const unlocked = [];
      definitions.forEach((definition) => {
        if (state.unlocked[definition.id]) return;
        if (retroactiveOnly && !definition.retroactive) return;
        if (!retroactiveOnly && definition.condition.type === 'eventMatch' && !event) return;
        if (evaluate(definition.condition, context, event)) {
          const result = unlock(definition, retroactiveOnly);
          if (result) unlocked.push(result);
        }
      });
      return unlocked;
    }

    function increment(key, amount) { state.counters[key] = Math.max(0, Number(state.counters[key] || 0) + (Number(amount) || 1)); }
    function setStreak(key, value) { state.streaks[key] = Math.max(0, Number(value) || 0); }

    function reduce(event) {
      if (!event || !event.type) return;
      if (event.type === 'fishCaught') {
        increment('fishCaught');
        setStreak('catch', Number(state.streaks.catch || 0) + 1);
        setStreak('escape', 0);
      } else if (event.type === 'fishEscaped') {
        increment('fishEscaped');
        setStreak('escape', Number(state.streaks.escape || 0) + 1);
        setStreak('catch', 0);
      } else if (event.type === 'biteMissed') {
        increment('bitesMissed');
        setStreak('catch', 0);
      } else if (event.type === 'itemCaught') {
        increment(event.itemType === 'treasure' ? 'treasureCaught' : 'junkCaught');
      } else if (event.type === 'fishSold') increment('fishSold', event.count || 1);
      else if (event.type === 'baitPurchased') increment('baitPurchases', event.count || 1);
      else if (event.type === 'weightRecord') increment('weightRecords');
    }

    function emit(event, context) {
      reduce(event);
      store.replace(state);
      state = store.get();
      return check(context || {}, event, false);
    }

    function initialize(context) {
      const firstRun = !state.initialized;
      state.definitionCount = definitions.length;
      store.replace(state);
      state = store.get();
      const unlocked = check(context || {}, null, true);
      state.initialized = true;
      store.replace(state);
      state = store.get();
      return { firstRun, unlocked };
    }

    function progress(definition, context) {
      const condition = definition.condition;
      if (condition.type === 'stat') return { value: Number(valueAt(context, condition.path)) || 0, target: condition.gte };
      if (condition.type === 'counter') return { value: Number(state.counters[condition.key]) || 0, target: condition.gte };
      if (condition.type === 'streak') return { value: Number(state.streaks[condition.key]) || 0, target: condition.gte };
      if (condition.type === 'uniqueCount') return { value: activeKeys(context[condition.source]).length, target: condition.gte };
      if (condition.type === 'collectionSet') {
        const ids = sets[condition.set] || [];
        const found = new Set(activeKeys(context[condition.source]));
        return { value: ids.filter((id) => found.has(id)).length, target: ids.length };
      }
      return null;
    }

    return Object.freeze({ initialize, emit, check, progress, evaluate, getState: () => state });
  }

  global.FishingAchievementEngine = Object.freeze({ create, activeKeys, matches });
})(window);
