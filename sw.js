/* 游戏厅 · Service Worker：联网优先（始终最新），断网回退缓存 */
const CACHE = 'arcade-v86';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=6',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './input-guard.js?v=7',
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
  './puyo/styles.css?v=6',
  './puyo/game.js?v=12',
  './fishing/index.html',
  './fishing/styles.css?v=26',
  './fishing/fish-metadata.js?v=1',
  './fishing/fish-data.js?v=3',
  './fishing/river-fish-data.js?v=3',
  './fishing/coast-fish-data.js?v=3',
  './fishing/abyss-fish-data.js?v=4',
  './fishing/catchables.js?v=3',
  './fishing/economy.js?v=1',
  './fishing/environments.js?v=1',
  './fishing/locations.js?v=9',
  './fishing/storage.js?v=2',
  './fishing/achievement-data.js?v=3',
  './fishing/achievement-storage.js?v=2',
  './fishing/achievement-engine.js?v=2',
  './fishing/achievement-ui.js?v=9',
  './fishing/audio.js?v=4',
  './fishing/ui.js?v=9',
  './fishing/scene-renderer.js?v=6',
  './fishing/session-state.js?v=2',
  './fishing/catch-mechanics.js?v=1',
  './fishing/economy-ui.js?v=3',
  './fishing/location-ui.js?v=3',
  './fishing/collection-ui.js?v=4',
  './fishing/game.js?v=57',
  './fishing/assets/moonlake-fish-common-v1.png',
  './fishing/assets/moonlake-fish-uncommon-v1.png',
  './fishing/assets/moonlake-fish-rare-v1.png',
  './fishing/assets/clearstream-fish-common-v1.png',
  './fishing/assets/clearstream-fish-rare-v1.png',
  './fishing/assets/clearstream-taimen-v1.png',
  './fishing/assets/coast-fish-sheet-v1.png',
  './fishing/assets/abyss-fish-sheet-v2.png',
  './fishing/assets/achievements/achievement-icons-v1.png',
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
