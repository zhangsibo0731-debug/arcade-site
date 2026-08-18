/* 游戏厅 · Service Worker：联网优先（始终最新），断网回退缓存 */
const CACHE = 'arcade-v11';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=5',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './input-guard.js?v=6',
  './sudoku/index.html',
  './sudoku/styles.css',
  './sudoku/game.js',
  './breakout/index.html',
  './breakout/styles.css',
  './breakout/game.js',
  './tetris/index.html',
  './tetris/styles.css',
  './tetris/game.js?v=8',
  './2048/index.html',
  './2048/styles.css',
  './2048/game.js',
  './memory/index.html',
  './memory/styles.css',
  './memory/game.js',
  './pacman/index.html',
  './pacman/styles.css',
  './pacman/game.js?v=7',
  './puyo/index.html',
  './puyo/styles.css?v=5',
  './puyo/game.js?v=11',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // 联网成功：写回缓存，返回最新内容
        if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => {
        // 断网：回退缓存；再没有就回退大厅
        return caches.match(e.request).then((hit) => hit || caches.match('./index.html'));
      })
  );
});
