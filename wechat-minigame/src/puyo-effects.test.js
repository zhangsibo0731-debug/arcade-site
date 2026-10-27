'use strict';

const assert = require('assert');
const PuyoEffects = require('./puyo-effects.js');

const effects = new PuyoEffects();
effects.startPop([[1, 2]], 400);
let state = effects.cellState(1, 2);
assert.strictEqual(state.alpha, 1);
effects.update(.22);
state = effects.cellState(1, 2);
assert.ok(state.alpha < 1, 'pop should fade after its flash phase');
assert.ok(state.scaleX < 1.2, 'pop scale should be bounded');
effects.update(.3);
assert.strictEqual(effects.pop, null);

effects.startPop([[1, 2]], 400, [{cell:[1,2],from:7,to:8}]);
for (let i = 0; i < 7; i++) {
  effects.update(.05);
  const ice = effects.cellState(1, 2);
  assert.strictEqual(ice.alpha, 1, 'first ice hit must not fade the surviving shell');
  assert.ok(ice.scaleX > .9 && ice.scaleY > .9, 'first hit must not shrink the ice away');
}
assert.strictEqual(effects.cellState(1,2).iceCracked, true);
effects.startPop([[1, 2]], 400, [{cell:[1,2],from:8,to:0}]);
effects.update(.3);
assert.ok(effects.cellState(1,2).alpha < .5, 'second ice hit must dissolve the shell');
effects.burstIce([{cell:[1,2],from:8,to:0}]);
assert.strictEqual(effects.particles.filter((item) => item.ice).length, 10);
effects.update(1);
assert.strictEqual(effects.particles.length, 0, 'ice shards must expire');

effects.startFall(new Map([['2,6', 4]]), 200);
state = effects.cellState(2, 6);
assert.ok(state.offsetRows < -3.9, 'fall starts at the previous row');
effects.update(.1);
state = effects.cellState(2, 6);
assert.ok(state.offsetRows < 0 && state.offsetRows > -4, 'fall should move toward its target');

effects.startRecolor([[0, 8], [1, 8]], 1000, 2, 4);
state = effects.cellState(0, 8);
assert.strictEqual(state.recolor.source, 2);
assert.strictEqual(state.recolor.target, 4);
effects.update(.6);
assert.ok(effects.cellState(0, 8).recolor.progress > .5);

effects.startGarbageFall([[0, 10], [1, 10]], 650);
assert.ok(effects.cellState(0, 10).offsetRows < 0);
effects.update(.7);
assert.strictEqual(effects.garbageFall, null);

// Sample the entire path, not just its endpoints: the previous Back easing
// overshot below the board by more than a row for a long drop.
for (const row of [0, 5, 11]) {
  effects.reset();
  effects.startGarbageFall([[0, row], [1, row], [2, row], [3, row], [4, row]], 810);
  for (let elapsed = 0; elapsed <= 810; elapsed++) {
    effects.garbageFall.elapsed = elapsed;
    for (let x = 0; x < 5; x++) {
      const state = effects.cellState(x, row);
      assert.ok(state.offsetRows <= 1e-9, 'a garbage ball must never fall below its landing cell');
      const entry = effects.garbageFall.entries.get(x + ',' + row);
      const p = Math.max(0, (elapsed - entry.delay) / (810 - entry.delay));
      if (p >= .72) assert.ok(state.offsetRows >= -.241, 'rebound height is bounded independently of drop distance');
      if (elapsed < entry.delay) assert.strictEqual(state.alpha, 0, 'staggered balls remain hidden until released');
    }
  }
  effects.garbageFall.elapsed = 810 * .72;
  assert.ok(Math.abs(effects.cellState(0, row).offsetRows) < 1e-9, 'first contact reaches the floor');
  effects.garbageFall.elapsed = 810 * .81;
  assert.ok(effects.cellState(0, row).offsetRows < -.23, 'the first bounce rises above the floor');
  effects.garbageFall.elapsed = 810;
  assert.ok(Math.abs(effects.cellState(0, row).offsetRows) < 1e-9, 'settles exactly at the landing cell');
}
effects.reset();

effects.showBanner('2 CHAIN', '+400', 2, 800);
effects.startShake(3);
assert.strictEqual(effects.banner.text, '2 CHAIN');
assert.ok(effects.boardOffset().x === 0 || Number.isFinite(effects.boardOffset().x));

effects.reset();
effects.burst([[2, 5]], () => '#fff', 2);
for (let frame = 0; frame < 18; frame++) effects.update(1 / 60);
assert.ok(effects.particles.length > 0);
assert.ok(effects.particles.every((particle) => Math.abs(particle.y - 5.5) < 2), 'a burst should spread near the cleared cell rather than plunge off the board');

console.log('wechat minigame visual effects tests passed');
