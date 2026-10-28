'use strict';
const assert = require('node:assert/strict');
const Layout = require('./layout.js');
const Controller = require('./controller.js');
const Renderer = require('./renderer.js');
const {seededRandom, clone} = require('./test/legacy-harness.js');
const overlap = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
const configs = [['classic',9,'easy'],['classic',9,'medium'],['classic',9,'hard'],['kids',4,'easy'],['kids',6,'easy'],['kids',9,'easy']];
for (const [width,height] of [[320,568],[366,809],[390,844],[430,932]]) {
  for (const [mode,size,level] of configs) for (const top of [0,47]) {
    const obstruction = {x:width-112,y:top+8,w:104,h:32};
    const safe = {top,bottom:height-24,left:0,right:width,obstruction};
    const layout = Layout.create(width,height,safe,{mode,size,level});
    assert.equal(layout.title.y,top+30,'title remains top-aligned independently of capsule');
    assert.equal(layout.boxes.filter(b=>b.fixed).length,4,'compact header has only back/config/new/pause');
    layout.boxes.forEach(b=>{assert.ok(b.w>=44&&b.h>=44);if(b.fixed)assert.equal(overlap(b,obstruction),false);});
    for(let i=0;i<layout.boxes.length;i++)for(let j=i+1;j<layout.boxes.length;j++)assert.equal(overlap(layout.boxes[i],layout.boxes[j]),false,'all touch targets are disjoint');
    assert.equal(Layout.hit(layout,obstruction.x+2,obstruction.y+2),null,'capsule zone is never a game touch target');
    const scrolled = Layout.create(width,height,safe,{mode,size,level},9999);
    const settings = scrolled.boxes.find(b=>b.action==='settings');
    assert.equal(Layout.hit(scrolled,settings.x+5,settings.y+5),'settings','header remains fixed when scrolling');
    const hint = scrolled.boxes.find(b=>b.action==='hint');
    assert.equal(Layout.hit(scrolled,hint.x+hint.w/2,hint.y-scrolled.scroll+hint.h/2),'hint','last toolbar remains reachable');
    assert.ok(scrolled.board.w/size>=Math.min(26,(width-24)/size));
  }
}
const values = new Map();
const platform = {storage:{get:(key,fallback)=>values.has(key)?clone(values.get(key)):fallback,set:(key,value)=>{values.set(key,clone(value));return true;}},back(){}};
const controller = Controller.create(platform,{random:seededRandom(812)});
controller.resize(320,568,{top:0,bottom:544,left:0,right:320,obstruction:{x:208,y:8,w:104,h:32}});
controller.action('cell:0:0');
const before = controller.view().model.state;
const tap = action => {
  const view = controller.view(), box = (view.overlay?view.overlay.buttons:view.layout.boxes).find(b=>b.action===action);
  assert.ok(box,'missing '+action); controller.touchStart(box.x+box.w/2,box.y+box.h/2);controller.touchEnd(box.x+box.w/2,box.y+box.h/2);
};
tap('settings');assert.equal(controller.view().overlay.kind,'settings');
tap('draftMode:kids');tap('draftSize:6');
assert.equal(controller.view().overlay.draft.size,6);
assert.ok(controller.view().overlay.buttons.find(b=>b.action==='draftSize:6').selected);
controller.tick(60000);assert.deepEqual(controller.view().model.state,before,'settings draft never changes the running puzzle or time');
tap('settingsApply');assert.equal(controller.view().overlay.kind,'confirm');assert.match(controller.view().overlay.body,/儿童版 · 6宫/);
tap('cancel');assert.equal(controller.view().overlay.kind,'settings');assert.equal(controller.view().overlay.draft.size,6);
tap('settingsClose');assert.deepEqual(controller.view().model.state,before);assert.equal(controller.view().model.paused,false);
tap('settings');tap('draftMode:kids');tap('draftSize:6');tap('settingsApply');tap('confirmNew');
assert.equal(controller.view().model.state.size,6);assert.equal(controller.view().model.state.mode,'kids');
const kids = controller.view().model.state;
tap('settings');tap('settingsApply');assert.deepEqual(controller.view().model.state,kids,'unchanged settings do not generate another puzzle');
tap('settings');tap('draftMode:classic');tap('draftLevel:hard');
controller.hide();controller.show();assert.equal(controller.view().overlay.draft.level,'hard');
controller.key('Escape');assert.equal(controller.view().overlay,null);assert.deepEqual(controller.view().model.state,kids);
tap('settings');tap('draftMode:classic');tap('draftLevel:hard');tap('settingsApply');tap('confirmNew');
assert.equal(controller.view().model.state.level,'hard');
const context = new Proxy({measureText:s=>({width:String(s).length*8})},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>{o[k]=v;return true;}});
for(const action of ['settings','settingsClose','pause','resume','new','cancel']) {tap(action);assert.doesNotThrow(()=>Renderer.draw(context,controller.view()));}
console.log('Sudoku compact UI: 48 mode/device/inset layouts, fixed header hits, capsule exclusion, settings draft/confirm/cancel and lifecycle passed');
