'use strict';

const PROFILE_KEY = 'moonlit_leaderboard_profile_v1';

function cleanNickname(value) {
  return Array.from(String(value || '').trim()).slice(0, 12).join('').replace(/[\u0000-\u001f\u007f]/g, '');
}

function create(platform, storage, version) {
  function profile() {
    const saved = storage.get(PROFILE_KEY, {});
    return saved && typeof saved === 'object' ? saved : {};
  }
  function enable(nickname) {
    const name = cleanNickname(nickname);
    if (!name) return false;
    const current = profile();
    storage.set(PROFILE_KEY, {
      playerId: current.playerId || ('wx-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)),
      nickname: name,
      optedIn: true,
    });
    return true;
  }
  function load() { return platform.request('/api/v1/leaderboard?game=puyo&mode=challenge'); }
  function submit(result) {
    const current = profile();
    if (!current.optedIn || !current.nickname) return Promise.resolve({ skipped: true });
    return platform.request('/api/v1/scores', {
      method: 'POST',
      data: {
        submissionId: 'wx-s-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10),
        playerId: current.playerId,
        playerName: current.nickname,
        game: 'puyo', mode: 'challenge',
        score: Math.max(0, Math.floor(result.score || 0)),
        stage: Math.max(1, Math.floor(result.stage || 1)),
        maxChain: Math.max(0, Math.floor(result.maxChain || 0)),
        durationMs: Math.max(1000, Math.floor(result.durationMs || 0)),
        gameVersion: version,
      },
    });
  }
  return { profile, enable, load, submit };
}

module.exports = { create, cleanNickname };
