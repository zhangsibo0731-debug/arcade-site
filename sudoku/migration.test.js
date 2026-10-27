'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Rules=require('./rules.js'),State=require('./session-state.js'),Session=require('./game-session.js'),Controller=require('./controller.js'),Layout=require('./layout.js'),Renderer=require('./renderer.js');
const {seededRandom,createLegacy,clone}=require('./test/legacy-harness.js');
const WechatController=require('../wechat-minigame/vendor/sudoku/controller.js');
const WechatRenderer=require('../wechat-minigame/vendor/sudoku/renderer.js');
const configs=[['classic',9,'easy'],['classic',9,'medium'],['classic',9,'hard'],['kids',4,'easy'],['kids',6,'easy'],['kids',9,'easy']];
function platform(seedStorage={}){const values=new Map(Object.entries(clone(seedStorage)));return{values,storage:{get:(k,f)=>values.has(k)?values.get(k):f,set:(k,v)=>{values.set(k,clone(v));return true;}},back(){this.returned=true;}};}
const saveKey='sudoku_canvas_save_v1';
const invalidLegacy=createLegacy({storage:{sudoku_save_v1:'{invalid'}});invalidLegacy.fireTimer();assert.equal(invalidLegacy.values.get('sudoku_save_v1'),'{invalid');invalidLegacy.api.newGame('kids',4,'easy');assert.equal(invalidLegacy.values.get('sudoku_save_v1_invalid_backup'),'{invalid');
function recorder(){const calls=[];const ctx=new Proxy({measureText:t=>({width:String(t).length*8})},{get:(o,k)=>k in o?o[k]:(...args)=>{calls.push([k,...args]);},set:(o,k,v)=>{calls.push(['set',k,v]);o[k]=v;return true;}});return{calls,ctx};}
for(const [mode,size,level] of configs){
  // Legacy DOM and shared controller/session consume the same generator and
  // commands, with frozen original puzzle hashes checked separately.
  const legacy=createLegacy({seed:816});legacy.api.newGame(mode,size,level);
  const rules=Rules.create({random:seededRandom(816)}),session=Session.create(rules);
  session.start('classic',9,'easy');session.start(mode,size,level);
  assert.deepEqual(session.snapshot(),legacy.snapshot().state);
  const s=session.snapshot();let cell;for(let r=0;r<size;r++)for(let c=0;c<size;c++)if(!s.givens[r][c])cell={r,c};
  session.select(cell.r,cell.c);legacy.api.select(cell.r,cell.c);
  for(const notes of [true,false]){session.setNotes(notes);legacy.api.notes(notes);session.enter(s.solution[cell.r][cell.c]);legacy.api.enterNumber(s.solution[cell.r][cell.c]);assert.deepEqual(session.snapshot(),legacy.snapshot().state);}
  for(const name of ['undo','hint','undo','erase']){session[name]();legacy.api[name]();assert.deepEqual(session.snapshot(),legacy.snapshot().state);}
  const raw=session.snapshot();raw.elapsed=73;raw.mistakes=2;const correct=raw.solution[cell.r][cell.c];raw.board[cell.r][cell.c]=correct%size+1;
  assert.ok(State.normalize(raw,rules),'wrong player numbers are valid saves');
  for(const corrupt of [s=>s.size=8,s=>s.solution[0][0]=s.solution[0][1],s=>s.board.pop(),s=>s.notes[0][0]=1<<size,s=>s.hintsLeft=-1,s=>s.elapsed=NaN,s=>s.givens[0][0]='true']){const bad=clone(raw);corrupt(bad);assert.equal(State.normalize(bad,rules),null);}
  const webPlatform=platform({[saveKey]:raw}),wxPlatform=platform({[saveKey]:raw});
  const web=Controller.create(webPlatform,{random:seededRandom(91)}),wechat=WechatController.create(wxPlatform,{random:seededRandom(91)});
  for(const [width,height] of [[320,568],[375,667],[390,844],[430,932]]){
    const safe={top:47,bottom:height-34,left:0,right:width};web.resize(width,height,safe);wechat.resize(width,height,safe);
    assert.deepEqual(web.view(),wechat.view());
    const l=web.view().layout;
    l.boxes.forEach(b=>{assert.ok(b.h>=44);assert.ok(b.w>=44);assert.ok(b.x>=0&&b.x+b.w<=width);});
    assert.ok(l.board.w/size>=Math.min(26,(width-24)/size));
    const overlay=web.view().overlay;assert.ok(overlay.box.y>=safe.top&&overlay.box.y+overlay.box.h<=safe.bottom);
    overlay.buttons.forEach(b=>assert.ok(b.y>=overlay.box.y&&b.y+b.h<=overlay.box.y+overlay.box.h));
    const a=recorder(),b=recorder();Renderer.draw(a.ctx,web.view());WechatRenderer.draw(b.ctx,wechat.view());assert.deepEqual(a.calls,b.calls,'identical shared draw commands');
  }
  function both(action){web.action(action);wechat.action(action);assert.deepEqual(web.view(),wechat.view());}
  web.tick(5000);assert.equal(web.view().model.state.elapsed,73,'resume dialog blocks clock');both('resume');
  web.tick(1250);wechat.tick(1250);assert.equal(web.view().model.state.elapsed,74);
  both('cell:'+cell.r+':'+cell.c);both('erase');both('notes');both('number:1');both('notes');both('hint');both('undo');
  const before=web.view().model.state;both('new');both('number:1');web.tick(60000);wechat.tick(60000);assert.deepEqual(web.view().model.state,before,'modal blocks input and clock');both('cancel');
  web.hide();wechat.hide();web.tick(60000);wechat.tick(60000);web.show();wechat.show();assert.equal(web.view().overlay.kind,'paused');both('resume');
  assert.deepEqual(web.view(),wechat.view());assert.deepEqual(Object.fromEntries(webPlatform.values),Object.fromEntries(wxPlatform.values));
  both('new');both('confirmNew');assert.equal(web.view().model.state.elapsed,0);
}
const badPlatform=platform({[saveKey]:{bad:'preserve me'}}),bad=Controller.create(badPlatform);
assert.equal(bad.view().overlay.kind,'invalid');bad.tick(1000);bad.action('number:1');assert.deepEqual(badPlatform.values.get(saveKey),{bad:'preserve me'});
bad.action('confirmNew');assert.deepEqual(badPlatform.values.get(saveKey+'_invalid_backup'),{bad:'preserve me'});
const failure=platform();failure.storage.set=()=>false;const failing=Controller.create(failure);failing.action('pause');assert.ok(failing.view().warning.includes('无法保存'));
const drag=Controller.create(platform());drag.resize(320,568,{top:47,bottom:534});const before=drag.view().model.selected;drag.touchStart(50,300);drag.touchMove(50,200);drag.touchEnd(50,200);assert.deepEqual(drag.view().model.selected,before);assert.ok(drag.view().layout.scroll>0);
const complete=Rules.create({random:seededRandom(8)}).makeGame('kids',4,'easy');complete.board=clone(complete.solution);complete.givens=complete.givens.map(r=>r.map(()=>false));complete.board[0][0]=0;complete.elapsed=42;
const winPlatform=platform({[saveKey]:complete}),win=Controller.create(winPlatform);win.action('resume');win.action('cell:0:0');win.action('number:'+complete.solution[0][0]);assert.equal(win.view().overlay.kind,'won');assert.equal(winPlatform.values.get('sudoku_canvas_best_v1')['4-easy'],42);win.tick(3000);assert.equal(win.view().model.state.elapsed,42);
for(const f of ['rules','session-state','game-session','presentation','layout','overlays','controller','renderer'])assert.equal(fs.readFileSync(__dirname+'/'+f+'.js','utf8'),fs.readFileSync(__dirname+'/../wechat-minigame/vendor/sudoku/'+f+'.js','utf8'));
console.log('Sudoku migration: six configurations, DOM parity, web/WeChat event/state/layout/draw parity, saves, modals, failures and lifecycle passed');
