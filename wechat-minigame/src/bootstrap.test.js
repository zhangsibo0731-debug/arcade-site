'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, 'bootstrap.js'), 'utf8');

for (const readonlyWindow of [true, false]) {
  let started = false;
  const lifecycle = {};
  const canvas = { requestAnimationFrame() {} };
  const context = vm.createContext({
    module: { exports: {} },
    wx: {
      createCanvas: () => canvas,
      onHide: (callback) => { lifecycle.hide = callback; },
      onShow: (callback) => { lifecycle.show = callback; },
    },
    require(filename) {
      if (filename.startsWith('../vendor/')) {
        const modulePath = path.resolve(__dirname, filename);
        vm.runInContext(fs.readFileSync(modulePath, 'utf8'), context, { filename: modulePath });
        return;
      }
      if (filename === './platform.js') return {};
      assert.strictEqual(filename, './arcade-app.js');
      return class {
        constructor(actualCanvas) {
          assert.strictEqual(actualCanvas, canvas);
          assert.ok(vm.runInContext('window.PuyoBoardRules && window.PuyoGameSession', context));
        }
        start() { started = true; }
        onHide() {}
        onShow() {}
      };
    },
  });
  vm.runInContext('globalThis.GameGlobal = globalThis;', context);
  if (readonlyWindow) {
    vm.runInContext('Object.defineProperty(globalThis, "window", { get() { return globalThis; }, configurable: false });', context);
  }
  assert.doesNotThrow(() => vm.runInContext(source, context), readonlyWindow ? 'DevTools read-only window' : 'runtime without window');
  assert.ok(started);
  assert.strictEqual(typeof lifecycle.hide, 'function');
  assert.strictEqual(typeof lifecycle.show, 'function');
  assert.strictEqual(vm.runInContext('window === GameGlobal', context), true);
}

console.log('wechat bootstrap compatibility tests passed');
