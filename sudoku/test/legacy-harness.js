'use strict';

// Test-only access to the original IIFE. No runtime exports or page changes.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const clone = (value) => JSON.parse(JSON.stringify(value));
function seededRandom(seed) {
  let value = seed >>> 0;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}
function createLegacy(options = {}) {
  const elements = new Map(), values = new Map(Object.entries(options.storage || {}));
  function element() {
    const listeners = {};
    return { hidden: false, style: {setProperty() {}, removeProperty() {}}, classList: {add() {}, remove() {}, toggle() {}},
      addEventListener(type, fn) { (listeners[type] ||= []).push(fn); }, click() { (listeners.click || []).forEach(fn => fn({})); }, setAttribute() {}, appendChild() {}, querySelectorAll: () => [], querySelector: () => element(),
      textContent: '', innerHTML: '', offsetWidth: 0 };
  }
  const document = {
    getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
    body: element(), addEventListener() {}, createElement: () => element(), createDocumentFragment: () => element(),
  };
  let timer = null;
  const math = Object.create(Math); math.random = seededRandom(options.seed || 816);
  const context = vm.createContext({ document, Math: math,
    localStorage: {getItem: (key) => values.get(key) || null, setItem: (key,value) => {if(options.failWrite && options.failWrite(key))throw Error('storage full');values.set(key,value);}},
    setInterval: (fn) => {timer = fn; return 1;}, clearInterval: () => {timer = null;}, setTimeout: () => 1,
  });
  vm.runInContext('globalThis.window = globalThis;', context);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../rules.js'), 'utf8'), context);
  for (const file of ['session-state.js', 'game-session.js']) vm.runInContext(fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8'), context);
  const source = fs.readFileSync(path.resolve(__dirname, '../game.js'), 'utf8');
  const anchor = '  init();\n})();';
  if (!source.includes(anchor)) throw new Error('Legacy startup anchor changed: review the migration baseline harness');
  const expose = `globalThis.legacy = {
    makeGame, generatePuzzle, countSolutions, lastEmptySolvable, findDuplicates, isComplete,
    newGame, enterNumber, erase, hint, undo, select, tick, save, load, continueResume,
    notes: (value) => { setNotes(value); },
    get: () => ({state, selected, notesMode, historyLength: session.view().historyLength}),
    set: (value) => {session.restore(value); session.resume(); syncSession();},
    configs: {LEVELS, SIZES}
  };`;
  vm.runInContext(source.replace(anchor, expose + '\n' + anchor), context, {timeout: 15000});
  return {api: context.legacy, snapshot: () => clone(context.legacy.get()), values, elements,
    timerActive: () => !!timer, fireTimer: () => {if(timer) timer();} };
}
module.exports = {createLegacy, seededRandom, clone};
