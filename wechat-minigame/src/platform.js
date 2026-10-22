'use strict';

const config = require('./config.js');

function storage() {
  return {
    get(key, fallback) {
      try {
        const value = wx.getStorageSync(key);
        return value === '' || value == null ? fallback : value;
      } catch (_) { return fallback; }
    },
    set(key, value) {
      try { wx.setStorageSync(key, value); return true; } catch (_) { return false; }
    },
    remove(key) {
      try { wx.removeStorageSync(key); } catch (_) {}
    },
  };
}

function request(path, options) {
  const input = options || {};
  return new Promise((resolve, reject) => wx.request({
    url: config.apiBase + path,
    method: input.method || 'GET',
    data: input.data,
    header: Object.assign({ 'content-type': 'application/json' }, input.headers || {}),
    success(result) {
      if (result.statusCode >= 200 && result.statusCode < 300) resolve(result.data);
      else reject(new Error('HTTP ' + result.statusCode));
    },
    fail: reject,
  }));
}

function audio() {
  let muted = !!storage().get('moonlit_muted_v1', false);
  let bgm = null;
  function ensureBgm() {
    if (bgm || !config.bgmUrl) return bgm;
    bgm = wx.createInnerAudioContext();
    bgm.loop = true;
    bgm.volume = 0.38;
    bgm.src = config.bgmUrl;
    return bgm;
  }
  return {
    isMuted: () => muted,
    toggle() {
      muted = !muted;
      storage().set('moonlit_muted_v1', muted);
      if (muted && bgm) bgm.pause();
      else if (!muted && bgm) bgm.play();
      return muted;
    },
    start() { const player = ensureBgm(); if (player && !muted) player.play(); },
    pause() { if (bgm) bgm.pause(); },
    resume() { if (bgm && !muted) bgm.play(); },
    stop() { if (bgm) bgm.stop(); },
    destroy() { if (bgm) bgm.destroy(); bgm = null; },
  };
}

function systemInfo() {
  const info = wx.getSystemInfoSync();
  return {
    width: info.windowWidth,
    height: info.windowHeight,
    pixelRatio: Math.min(info.pixelRatio || 1, 2),
    safeArea: info.safeArea || { left: 0, top: 0, right: info.windowWidth, bottom: info.windowHeight },
  };
}

module.exports = { storage, request, audio, systemInfo };
