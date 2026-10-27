'use strict';
const assert=require('node:assert/strict');
const {createLegacy,clone,seededRandom}=require('./test/legacy-harness.js');
const rules=require('./rules.js').create({random:seededRandom(72)});
const original=rules.makeGame('classic',9,'easy'),trial=rules.makeGame('classic',9,'easy');
let filled=0;
for(let r=0;r<9&&filled<3;r++)for(let c=0;c<9&&filled<3;c++)if(!trial.givens[r][c]){trial.board[r][c]=trial.solution[r][c];filled++;}
trial.elapsed=38;
const raw=JSON.stringify(original),trialRaw=JSON.stringify(trial);
const storage={sudoku_save_v1:raw,sudoku_canvas_save_v1:trialRaw};
const game=createLegacy({storage});
assert.deepEqual(game.snapshot().state,trial,'empty original slot should preview the filled trial save');
assert.equal(game.timerActive(),false);
game.fireTimer();assert.equal(game.values.get('sudoku_save_v1'),raw,'preview must not overwrite either slot');
assert.equal(game.values.get('sudoku_canvas_save_v1'),trialRaw);
assert.match(game.elements.get('resumeMeta').textContent,/试用界面进度.*已填 3 格/);
game.elements.get('btnResumeContinue').click();
assert.equal(game.timerActive(),true);
assert.equal(game.values.get('sudoku_save_v1_before_canvas_import'),raw);
assert.deepEqual(JSON.parse(game.values.get('sudoku_save_v1')),trial);
assert.equal(game.values.get('sudoku_canvas_save_v1'),trialRaw,'source save is never consumed or cleared');
const reloaded=createLegacy({storage:Object.fromEntries(game.values)});assert.deepEqual(reloaded.snapshot().state,trial);
assert.equal(reloaded.elements.get('btnResumeOther').hidden,true,'same board in both slots should not prompt twice');

const active=clone(original);let cell;
for(let r=0;r<9&&!cell;r++)for(let c=0;c<9;c++)if(!active.givens[r][c]){cell={r,c};break;}
active.board[cell.r][cell.c]=active.solution[cell.r][cell.c];
const both=createLegacy({storage:{...storage,sudoku_save_v1:JSON.stringify(active)}});
assert.deepEqual(both.snapshot().state,active,'never replace another real game automatically');
assert.equal(both.elements.get('btnResumeOther').hidden,false);
both.elements.get('btnResumeOther').click();assert.deepEqual(both.snapshot().state,trial);
assert.deepEqual(JSON.parse(both.values.get('sudoku_save_v1_before_canvas_import')),active);

const chooseOriginal=createLegacy({storage});chooseOriginal.elements.get('btnResumeOther').click();
assert.deepEqual(chooseOriginal.snapshot().state,original);
assert.equal(chooseOriginal.values.has('sudoku_save_v1_before_canvas_import'),false);
const failed=createLegacy({storage,failWrite:key=>key.endsWith('_before_canvas_import')});
failed.elements.get('btnResumeContinue').click();assert.equal(failed.timerActive(),false);assert.equal(failed.values.get('sudoku_save_v1'),raw);assert.equal(failed.values.get('sudoku_canvas_save_v1'),trialRaw);
const invalid=createLegacy({storage:{sudoku_save_v1:'{bad',sudoku_canvas_save_v1:trialRaw}});
invalid.elements.get('btnResumeContinue').click();assert.equal(invalid.values.get('sudoku_save_v1_invalid_backup'),'{bad');
const badTrial=createLegacy({storage:{sudoku_save_v1:raw,sudoku_canvas_save_v1:'{bad'}});assert.deepEqual(badTrial.snapshot().state,original);assert.equal(badTrial.values.get('sudoku_canvas_save_v1'),'{bad');
console.log('Sudoku resume bridge: filled trial progress, explicit import, backups, both choices, repeated reload and failure preservation passed');
