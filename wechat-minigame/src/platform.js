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

function audio(options) {
  return require('./puyo-audio.js').create(Object.assign({}, options || {}, { wx, storage: storage(), bgmUrl: config.bgmUrl }));
}

function systemInfo() {
  const info = wx.getSystemInfoSync();
  let menuButton = null;
  try { if (wx.getMenuButtonBoundingClientRect) menuButton = wx.getMenuButtonBoundingClientRect(); } catch (_) {}
  return {
    width: info.windowWidth,
    height: info.windowHeight,
    pixelRatio: Math.min(info.pixelRatio || 1, 2),
    statusBarHeight: Number.isFinite(info.statusBarHeight) ? Math.max(0, info.statusBarHeight) : 0,
    safeArea: info.safeArea || { left: 0, top: 0, right: info.windowWidth, bottom: info.windowHeight },
    menuButton,
  };
}

module.exports = { storage, request, audio, systemInfo };
