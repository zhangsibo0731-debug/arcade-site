(function (global) {
  'use strict';

  const KEYS = Object.freeze({
    TOTAL: 'fishing_total_v1',
    BEST_WEIGHT: 'fishing_best_weight_v1',
    BEST_STREAK: 'fishing_best_streak_v1',
    MUTED: 'fishing_muted_v1',
    SAVE: 'fishing_save_v1',
    COLLECTION: 'fishing_collection_v1',
    ENVIRONMENT_STEP: 'fishing_environment_step_v1',
    CURRENT_LOCATION: 'fishing_current_location_v1',
    UNLOCKED_LOCATIONS: 'fishing_unlocked_locations_v1',
    ITEM_COLLECTION: 'fishing_item_collection_v1',
  });

  function readInt(key) {
    try { return parseInt(localStorage.getItem(key), 10) || 0; } catch (e) { return 0; }
  }

  function writeInt(key, value) {
    try {
      localStorage.setItem(key, String(value));
      return true;
    } catch (e) { return false; }
  }

  function readString(key, fallback) {
    try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; }
  }

  function writeString(key, value) {
    try {
      localStorage.setItem(key, String(value));
      return true;
    } catch (e) { return false; }
  }

  function readObject(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value && typeof value === 'object' ? value : fallback;
    } catch (e) { return fallback; }
  }

  function writeObject(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) { return false; }
  }

  function remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) { return false; }
  }

  global.FishingStorage = Object.freeze({ KEYS, readInt, writeInt, readString, writeString, readObject, writeObject, remove });
})(window);
