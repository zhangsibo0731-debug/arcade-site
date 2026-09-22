'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const contract = require('../../server-contracts/leaderboard-v1.json');
const { validateScore, weekInfo } = require('./leaderboard-rules.js');

test('CloudBase follows shared leaderboard week contract', () => {
  contract.weekCases.forEach((item) => {
    assert.deepEqual(weekInfo(new Date(item.input)), { key: item.key, resetAt: item.resetAt });
  });
});

test('CloudBase follows shared score validation contract', () => {
  assert.equal(validateScore(contract.validScore).error, undefined);
  contract.invalidScores.forEach((item) => {
    assert.equal(validateScore({ ...contract.validScore, ...item.patch }).error, item.error);
  });
});
