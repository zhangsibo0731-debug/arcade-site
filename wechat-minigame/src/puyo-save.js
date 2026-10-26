'use strict';

const LEGACY_KEY = 'moonlit_puyo_minigame_v1';
const ACTIVE_KEY = 'moonlit_puyo_active_v3';
const keyFor = (type) => 'moonlit_puyo_save_v3_' + type;

function create(storage, validators) {
  function convert(saved) {
    if (!saved || typeof saved !== 'object' || !validators.validBoard(saved.board)) return null;
    const gameType = saved.gameType === 'classic' ? 'classic' : 'challenge';
    if (gameType === 'classic' && saved.board.some((row) => row.some((cell) => cell > 5))) return null;
    return Object.assign({}, saved, {
      schemaVersion: 1,
      gameType,
      clearedTotal: saved.clearedTotal == null ? saved.cleared : saved.clearedTotal,
      runMaxChain: saved.runMaxChain == null ? saved.maxChain : saved.runMaxChain,
      activeDurationMs: saved.activeDurationMs == null ? saved.activeMs : saved.activeDurationMs,
      challengeState: saved.challengeState || saved.challenge,
      runBuild: saved.runBuild || saved.build,
    });
  }
  function load() {
    const active = storage.get(ACTIVE_KEY, null);
    if (active === 'none') return null;
    if (active === 'classic' || active === 'challenge') return convert(storage.get(keyFor(active), null));
    // Do not overwrite the v2 source. The shared core validates and normalizes
    // this candidate before its first v3 save is written.
    return convert(storage.get(LEGACY_KEY, null));
  }
  function save(snapshot) {
    if (!snapshot || !validators.validBoard(snapshot.board)) return false;
    const ok = storage.set(keyFor(snapshot.gameType), snapshot);
    if (ok === false) return false;
    storage.set(ACTIVE_KEY, snapshot.gameType);
    return true;
  }
  function clear(type) {
    storage.remove(keyFor(type));
    storage.set(ACTIVE_KEY, 'none');
  }
  return { load, save, clear, convert };
}

module.exports = { create, LEGACY_KEY, ACTIVE_KEY, keyFor };
