(function (global) {
  'use strict';

  const VERSION = 2;
  const PROFILE_KEY = 'puyo_cloud_profile_v1';
  const DEFAULT_TIMEOUT = 2000;

  function safeParse(value) {
    try { return JSON.parse(value); } catch (error) { return null; }
  }

  function cleanNickname(value) {
    return Array.from(String(value || '').trim()).slice(0, 12).join('').replace(/[\u0000-\u001f\u007f]/g, '');
  }

  function fallbackId() {
    return 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  }

  function create(options = {}) {
    const storage = options.storage || global.localStorage;
    const fetcher = options.fetch || global.fetch.bind(global);
    const configuredBases = Array.isArray(options.apiBases) ? options.apiBases : [options.apiBase];
    const apiBases = configuredBases.map((value) => String(value || '').replace(/\/$/, '')).filter(Boolean);
    const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : DEFAULT_TIMEOUT;
    const makeId = options.randomUUID || (() => global.crypto && global.crypto.randomUUID ? global.crypto.randomUUID() : fallbackId());

    function readProfile() {
      let saved = null;
      try { saved = safeParse(storage.getItem(PROFILE_KEY)); } catch (error) {}
      return {
        playerId: saved && typeof saved.playerId === 'string' && saved.playerId ? saved.playerId : '',
        nickname: cleanNickname(saved && saved.nickname),
        optedIn: !!(saved && saved.optedIn),
      };
    }

    function writeProfile(next) {
      const profile = {
        playerId: next.playerId || makeId(),
        nickname: cleanNickname(next.nickname),
        optedIn: next.optedIn === true,
      };
      try { storage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch (error) {}
      return profile;
    }

    function enable(nickname) {
      const name = cleanNickname(nickname);
      if (!name) return { error: '请输入昵称' };
      const profile = readProfile();
      return { profile: writeProfile({ ...profile, nickname: name, optedIn: true }) };
    }

    function rename(nickname) {
      const name = cleanNickname(nickname);
      if (!name) return { error: '请输入昵称' };
      const profile = readProfile();
      if (!profile.optedIn) return enable(name);
      return { profile: writeProfile({ ...profile, nickname: name }) };
    }

    function disable() {
      const profile = readProfile();
      return writeProfile({ ...profile, optedIn: false });
    }

    async function request(path, init = {}) {
      let lastError = new Error('云排行榜请求失败');
      for (let index = 0; index < apiBases.length; index++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetcher(apiBases[index] + path, { ...init, signal: controller.signal });
          const body = await response.json().catch(() => ({}));
          if (response.ok) return body;
          const error = new Error(body.error || '云排行榜请求失败');
          if (response.status < 500) error.nonRetryable = true;
          if (error.nonRetryable || index === apiBases.length - 1) throw error;
          lastError = error;
        } catch (error) {
          if (error && error.nonRetryable) throw error;
          lastError = error && error.name === 'AbortError' ? new Error('连接超时') : error;
          if (index === apiBases.length - 1) throw lastError;
        } finally {
          clearTimeout(timer);
        }
      }
      throw lastError;
    }

    function load() {
      return request('/api/v1/leaderboard?game=puyo&mode=challenge');
    }

    async function submit(result) {
      const profile = readProfile();
      if (!profile.optedIn || !profile.nickname) return { skipped: true };
      const body = {
        submissionId: makeId(),
        playerId: profile.playerId,
        playerName: profile.nickname,
        game: 'puyo',
        mode: 'challenge',
        score: Math.max(0, Math.floor(result.score || 0)),
        stage: Math.max(1, Math.floor(result.stage || 1)),
        maxChain: Math.max(0, Math.floor(result.maxChain || 0)),
        durationMs: Math.max(1000, Math.min(86400000, Math.floor(result.durationMs || 0))),
        gameVersion: String(result.gameVersion || ''),
      };
      return request('/api/v1/scores', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    return Object.freeze({ readProfile, enable, rename, disable, load, submit, cleanNickname });
  }

  global.PuyoLeaderboard = Object.freeze({ VERSION, PROFILE_KEY, DEFAULT_TIMEOUT, create, cleanNickname });
})(typeof window !== 'undefined' ? window : globalThis);
