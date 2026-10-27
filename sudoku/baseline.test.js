'use strict';
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {performance} = require('node:perf_hooks');
const {createLegacy, clone} = require('./test/legacy-harness.js');
const cases = [['classic',9,'easy'],['classic',9,'medium'],['classic',9,'hard'],['kids',4,'easy'],['kids',6,'easy'],['kids',9,'easy']];
// Frozen before extraction: changes require review, never regenerate silently.
const golden = [
  'b0f850e6339439facfb28ba3cc32306a9035fd120f1c9ed0dc319616df601de1',
  'a1d96b2229fda322c6989d18478a215e7439b4453d865b7c1f8ede3218065e94',
  '6529619e386ec62ef363d5a8f6beca903ee468ca90d36606d25fecb9f517aeba',
  'd43643720e4bc4fc21c23d5a82e639f6b457380228af31e8aebb9b903d07c728',
  '66e756d5673e2d044a7bdbcb686891acee23b71d81baa4ca2b2930bb55d175de',
  '6ef188cdf9771a6046c8a2a52c8624e43fd6ccca3e403cb0205e620eb810e5b9',
];
const fingerprint = (state) => createHash('sha256').update(JSON.stringify([state.board,state.solution])).digest('hex');
const benchmarks = [];
for (const [mode,size,level] of cases) {
  const first = createLegacy({seed:816}), second = createLegacy({seed:816});
  const started = performance.now();
  first.api.newGame(mode,size,level);
  const ms = performance.now() - started;
  second.api.newGame(mode,size,level);
  const state = first.snapshot().state;
  assert.equal(fingerprint(state),golden[benchmarks.length], 'original puzzle/solution baseline changed');
  assert.equal(fingerprint(state), fingerprint(second.snapshot().state), 'fixed seed must reproduce puzzle and solution');
  const {br,bc} = first.api.configs.SIZES[size];
  for (const row of state.solution) assert.equal(new Set(row).size,size);
  for (let c=0;c<size;c++) assert.equal(new Set(state.solution.map((row)=>row[c])).size,size);
  for (let r=0;r<size;r+=br) for(let c=0;c<size;c+=bc) {
    const box=[]; for(let y=r;y<r+br;y++)for(let x=c;x<c+bc;x++)box.push(state.solution[y][x]);
    assert.equal(new Set(box).size,size);
  }
  assert.equal(first.api.countSolutions(clone(state.board),br,bc,2),1);
  if (mode==='kids') assert.equal(first.api.lastEmptySolvable(state.board,size,br,bc),true);
  benchmarks.push({mode,size,level,clues:state.board.flat().filter(Boolean).length,ms:Math.round(ms*10)/10,sha256:fingerprint(state)});
}

const game = createLegacy(); game.api.newGame('kids',4,'easy');
let state = game.snapshot().state;
const editable=[]; let given;
for(let r=0;r<4;r++)for(let c=0;c<4;c++)if(!state.givens[r][c])editable.push({r,c});else given={r,c};
game.api.select(given.r,given.c); game.api.enterNumber(1);
assert.deepEqual(game.snapshot().state.board,state.board,'given cells are immutable');
const cell=editable[0], correct=state.solution[cell.r][cell.c], wrong=correct%4+1;
game.api.select(cell.r,cell.c); game.api.notes(true); game.api.enterNumber(correct);
assert.equal(game.snapshot().state.notes[cell.r][cell.c],1<<(correct-1));
game.api.enterNumber(correct); assert.equal(game.snapshot().state.notes[cell.r][cell.c],0);
game.api.notes(false); game.api.enterNumber(wrong);
assert.equal(game.snapshot().state.mistakes,1);
game.api.undo(); assert.equal(game.snapshot().state.board[cell.r][cell.c],0);
assert.equal(game.snapshot().state.mistakes,1,'undo does not refund mistakes');
game.api.hint(); assert.equal(game.snapshot().state.hintsLeft,2);
assert.equal(game.snapshot().state.board[cell.r][cell.c],correct);
game.api.undo(); assert.equal(game.snapshot().state.hintsLeft,2,'undo does not refund hints');
for(let i=0;i<2;i++){game.api.hint();game.api.undo();}
const exhausted=game.snapshot().state; game.api.hint();
assert.deepEqual(game.snapshot().state,exhausted,'exhausted hints must be a no-op');
game.api.enterNumber(correct);game.api.erase(); assert.equal(game.snapshot().state.board[cell.r][cell.c],0);
for(let i=0;i<260;i++){game.api.notes(true);game.api.enterNumber(1);}
assert.equal(game.snapshot().historyLength,250);
game.api.notes(false);game.fireTimer();assert.equal(game.snapshot().state.elapsed,1);
game.api.save();
const restored=createLegacy({storage:Object.fromEntries(game.values)});
assert.deepEqual(restored.snapshot().state,game.snapshot().state);
assert.equal(restored.snapshot().historyLength,0);
assert.equal(restored.snapshot().notesMode,false);
assert.equal(restored.timerActive(),false,'resume dialog must not start timer before confirmation');
assert.equal(restored.elements.get('resumeOverlay').hidden,false);
// A completed board stops counting and writes the existing best-time bucket.
state=game.snapshot().state;state.board=clone(state.solution);state.board[cell.r][cell.c]=0;state.elapsed=42;
game.api.set(state);game.api.select(cell.r,cell.c);game.api.enterNumber(correct);
assert.equal(game.snapshot().state.won,true);assert.equal(game.timerActive(),false);
assert.equal(JSON.parse(game.values.get('sudoku_best_v1'))['4-easy'],42);
assert.equal(game.elements.get('overlay').hidden,false);
console.log(JSON.stringify(benchmarks,null,2));
console.log('sudoku legacy baseline: six configurations, inputs, notes, hints, undo, save/resume and completion passed');
