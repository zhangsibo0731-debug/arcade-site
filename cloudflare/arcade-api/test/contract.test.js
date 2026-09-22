import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateScore, weekInfo } from '../src/leaderboard-rules.js';

const contract = JSON.parse(readFileSync(new URL('../../../server-contracts/leaderboard-v1.json', import.meta.url), 'utf8'));

test('Worker follows shared leaderboard week contract', () => {
  contract.weekCases.forEach((item) => {
    assert.deepEqual(weekInfo(new Date(item.input)), { key: item.key, resetAt: item.resetAt });
  });
});

test('Worker follows shared score validation contract', () => {
  assert.equal(validateScore(contract.validScore).error, undefined);
  contract.invalidScores.forEach((item) => {
    assert.equal(validateScore({ ...contract.validScore, ...item.patch }).error, item.error);
  });
});
