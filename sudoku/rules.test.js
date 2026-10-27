'use strict';
const assert = require('node:assert/strict');
const {create} = require('./rules.js');
const {seededRandom,clone} = require('./test/legacy-harness.js');

// Same module runs in Node without a document, canvas, localStorage or wx.
let puzzles = 0;
for (let seed=1; seed<=10; seed++) {
  for (const [mode,size,level] of [['classic',9,'easy'],['classic',9,'medium'],['classic',9,'hard'],['kids',4,'easy'],['kids',6,'easy'],['kids',9,'easy']]) {
    const rules=create({random:seededRandom(seed)});
    const state=rules.makeGame(mode,size,level);
    assert.deepEqual(state,create({random:seededRandom(seed)}).makeGame(mode,size,level));
    const {br,bc}=rules.SIZES[size];
    const original=clone(state.board);
    assert.equal(rules.countSolutions(state.board,br,bc,2),1);
    assert.deepEqual(state.board,original,'solution counting must restore its input');
    if(mode==='kids')assert.equal(rules.lastEmptySolvable(state.board,size,br,bc),true);
    assert.equal(rules.buildUnits(size,br,bc).length,size*3);
    assert.equal(state.hintsLeft,3);
    for(let r=0;r<size;r++)for(let c=0;c<size;c++) {
      assert.equal(state.givens[r][c],state.board[r][c]!==0);
      if(state.givens[r][c])assert.equal(state.board[r][c],state.solution[r][c]);
    }
    puzzles++;
  }
}
const a=create({random:seededRandom(1)}).makeGame('classic',9,'easy');
const b=create({random:seededRandom(2)}).makeGame('classic',9,'easy');
assert.notDeepEqual(a.solution,b.solution,'different seeds must not collapse into one puzzle');
console.log('sudoku shared rules: '+puzzles+' seeded puzzles passed without platform dependencies');
