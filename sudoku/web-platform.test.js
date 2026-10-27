'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const documentEvents={},windowEvents={},commands=[],calls=[];
const ctx={setTransform(){}};
const canvas={getContext:()=>ctx,addEventListener(){}};
const document={getElementById:id=>id==='game'?canvas:{addEventListener(){}},addEventListener:(name,fn)=>documentEvents[name]=fn};
const context=vm.createContext({document,localStorage:{},location:{},innerWidth:390,innerHeight:844,devicePixelRatio:2,Set,
  getComputedStyle:()=>({paddingTop:'0',paddingBottom:'0',paddingLeft:'0',paddingRight:'0'}),
  requestAnimationFrame(){},SudokuController:{create:()=>({resize(){},key:(...args)=>commands.push(args),hide:()=>calls.push('hide'),show:()=>calls.push('show')})},
  addEventListener:(name,fn)=>windowEvents[name]=fn});
vm.runInContext('window=globalThis',context);
vm.runInContext(fs.readFileSync(__dirname+'/web-platform.js','utf8'),context);
const event=key=>({key,target:{closest:()=>null},preventDefault(){}});
documentEvents.keydown(event('h'));documentEvents.keydown(event('h'));documentEvents.keydown(event('h'));
assert.deepEqual(commands,[['h',undefined]],'held hint is one command');
documentEvents.keyup(event('h'));documentEvents.keydown(event('h'));assert.equal(commands.length,2);
documentEvents.keydown(event('ArrowDown'));documentEvents.keydown(event('ArrowDown'));assert.equal(commands.length,4,'arrows may repeat');
windowEvents.blur();documentEvents.keydown(event('h'));assert.equal(commands.length,5,'blur releases held keys');
document.hidden=true;documentEvents.visibilitychange();document.hidden=false;documentEvents.visibilitychange();assert.deepEqual(calls,['hide','show']);
console.log('Sudoku web adapter: one-shot keys, key release, repeat navigation and visibility passed');
