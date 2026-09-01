'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

global.window = global;
['achievement-storage.js', 'achievement-engine.js'].forEach((file) => {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  eval(source);
});

const definitions = [
  { id: 'tag', retroactive: false, condition: { type: 'eventMatch', event: 'fishCaught', tagsAll: ['legendary'], tagsAny: ['freshwater', 'abyssal'], excludeTags: ['common'] } },
  { id: 'tolerant', retroactive: false, condition: { type: 'sequence', steps: [{ event: 'itemCaught', fields: { itemType: 'junk' } }, { event: 'itemCaught', fields: { itemType: 'treasure' } }], maxEvents: 3 } },
  { id: 'strict', retroactive: false, condition: { type: 'sequence', steps: [{ event: 'fishCaught', tagsAll: ['common'] }, { event: 'fishCaught', tagsAll: ['rare'] }], maxEvents: 1, resetOnMismatch: true } },
];

function createHarness(initial) {
  let state = FishingAchievementStorage.clean(initial || {});
  const store = {
    get: () => state,
    replace: (next) => { state = FishingAchievementStorage.clean(next); return state; },
  };
  const engine = FishingAchievementEngine.create({ definitions, sets: {}, store });
  engine.initialize({});
  return { engine, getState: () => state };
}

{
  const { engine } = createHarness();
  assert.deepStrictEqual(engine.emit({ type: 'fishCaught', tags: ['legendary', 'freshwater'], eventId: 'tag-1' }, {}).map((item) => item.id), ['tag']);
}

{
  const { engine } = createHarness();
  engine.emit({ type: 'itemCaught', itemType: 'junk', itemId: 'boot', eventId: 'wide-1' }, {});
  engine.emit({ type: 'fishSold', eventId: 'wide-2' }, {});
  assert.deepStrictEqual(engine.emit({ type: 'itemCaught', itemType: 'treasure', itemId: 'key', eventId: 'wide-3' }, {}).map((item) => item.id), ['tolerant']);
}

{
  const { engine } = createHarness();
  engine.emit({ type: 'itemCaught', itemType: 'junk', eventId: 'timeout-1' }, {});
  engine.emit({ type: 'fishSold', eventId: 'timeout-2' }, {});
  engine.emit({ type: 'baitPurchased', eventId: 'timeout-3' }, {});
  engine.emit({ type: 'fishEscaped', eventId: 'timeout-4' }, {});
  assert.deepStrictEqual(engine.emit({ type: 'itemCaught', itemType: 'treasure', eventId: 'timeout-5' }, {}), []);
}

{
  const { engine } = createHarness();
  engine.emit({ type: 'fishCaught', tags: ['common'], eventId: 'strict-1' }, {});
  engine.emit({ type: 'fishSold', eventId: 'strict-2' }, {});
  assert.deepStrictEqual(engine.emit({ type: 'fishCaught', tags: ['rare'], eventId: 'strict-3' }, {}), []);
  engine.emit({ type: 'fishCaught', tags: ['common'], eventId: 'strict-4' }, {});
  assert.deepStrictEqual(engine.emit({ type: 'fishCaught', tags: ['rare'], eventId: 'strict-5' }, {}).map((item) => item.id), ['strict']);
}

{
  const { engine } = createHarness();
  engine.emit({ type: 'fishCaught', tags: ['common'], eventId: 'multi-1' }, {});
  assert.deepStrictEqual(
    engine.emit({ type: 'fishCaught', tags: ['rare', 'legendary', 'freshwater'], eventId: 'multi-2' }, {}).map((item) => item.id),
    ['tag', 'strict']
  );
}

{
  const first = createHarness();
  first.engine.emit({ type: 'itemCaught', itemType: 'junk', itemId: 'can', eventId: 'resume-1' }, {});
  const resumed = createHarness(first.getState());
  resumed.engine.emit({ type: 'fishSold', eventId: 'resume-2' }, {});
  assert.deepStrictEqual(resumed.engine.emit({ type: 'itemCaught', itemType: 'treasure', itemId: 'map', eventId: 'resume-3' }, {}).map((item) => item.id), ['tolerant']);
}

{
  const { engine, getState } = createHarness();
  engine.emit({ type: 'fishCaught', tags: ['common'], eventId: 'duplicate-1' }, {});
  engine.emit({ type: 'fishCaught', tags: ['common'], eventId: 'duplicate-1' }, {});
  engine.emit({ type: 'fishCaught', tags: ['rare'], eventId: 'duplicate-2' }, {});
  assert.strictEqual(getState().counters.fishCaught, 2);
  assert.ok(getState().unlocked.strict);
}

{
  const clean = FishingAchievementStorage.clean({
    sequences: { broken: { step: -5, remaining: 'oops', values: [null, 'fish', 'fish'] } },
    processedEvents: [null, 'one', 'one', 'two'],
  });
  assert.deepStrictEqual(clean.sequences.broken, { step: 0, remaining: 0, values: ['fish', 'fish'] });
  assert.deepStrictEqual(clean.processedEvents, ['one', 'two']);
}

{
  const migrated = FishingAchievementStorage.clean({
    version: 1,
    initialized: true,
    unlocked: { legacy: { unlockedAt: 123, retroactive: true } },
    counters: { fishCaught: 7 },
    unseen: ['legacy'],
  });
  assert.strictEqual(migrated.version, 2);
  assert.strictEqual(migrated.counters.fishCaught, 7);
  assert.deepStrictEqual(migrated.unseen, ['legacy']);
  assert.deepStrictEqual(migrated.sequences, {});
}

console.log('achievement-engine tests passed');
