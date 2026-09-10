(function (global) {
  'use strict';

  const VERSION = 1;

  function create(options) {
    const rows = options.rows;
    const cols = options.cols;
    const garbage = options.garbage;
    const colorCount = options.colorCount;
    const rotationCount = options.rotationCount;
    const keys = options.keys;

    function typeKey(group, type) {
      return keys[group][type === 'challenge' ? 'challenge' : 'classic'];
    }

    function readNumber(key) {
      try { return parseInt(global.localStorage.getItem(key), 10) || 0; } catch (e) { return 0; }
    }

    function writeNumber(key, value) {
      try { global.localStorage.setItem(key, String(value)); } catch (e) {}
    }

    function readHighScore(type) { return readNumber(typeKey('highScore', type)); }
    function writeHighScore(type, value) { writeNumber(typeKey('highScore', type), value); }
    function readBestChain(type) { return readNumber(typeKey('bestChain', type)); }
    function writeBestChain(type, value) { writeNumber(typeKey('bestChain', type), value); }

    function readMuted() {
      try { return global.localStorage.getItem(keys.muted) === '1'; } catch (e) { return false; }
    }

    function writeMuted(value) {
      try { global.localStorage.setItem(keys.muted, value ? '1' : '0'); } catch (e) {}
    }

    function validBoard(value) {
      return Array.isArray(value) && value.length === rows && value.every((row) =>
        Array.isArray(row) && row.length === cols && row.every((cell) =>
          Number.isInteger(cell) && cell >= 0 && cell <= garbage
        )
      );
    }

    function validColors(value) {
      return Array.isArray(value) && value.length === 2 && value.every((color) =>
        Number.isInteger(color) && color >= 1 && color <= colorCount
      );
    }

    function validPair(value) {
      return !!value &&
        Number.isInteger(value.x) && value.x >= 0 && value.x < cols &&
        Number.isInteger(value.y) && value.y >= -1 && value.y < rows &&
        Number.isInteger(value.rot) && value.rot >= 0 && value.rot < rotationCount &&
        validColors(value.colors);
    }

    function save(type, snapshot) {
      try { global.localStorage.setItem(typeKey('save', type), JSON.stringify(snapshot)); } catch (e) {}
    }

    function loadLatest() {
      return ['classic', 'challenge'].map((type) => {
        try {
          const value = JSON.parse(global.localStorage.getItem(typeKey('save', type)));
          if (!value || !validBoard(value.board)) return null;
          if (type === 'classic' && value.board.some((row) => row.includes(garbage))) return null;
          return Object.assign({}, value, { gameType: type });
        } catch (e) { return null; }
      }).filter(Boolean).sort((a, b) =>
        (Number(b.savedAt) || 0) - (Number(a.savedAt) || 0)
      )[0] || null;
    }

    function clear(type) {
      try { global.localStorage.removeItem(typeKey('save', type)); } catch (e) {}
    }

    return Object.freeze({
      readHighScore,
      writeHighScore,
      readBestChain,
      writeBestChain,
      readMuted,
      writeMuted,
      validBoard,
      validColors,
      validPair,
      save,
      loadLatest,
      clear,
    });
  }

  global.PuyoStorage = Object.freeze({ VERSION, create });
})(typeof window !== 'undefined' ? window : globalThis);
