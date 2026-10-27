(function (root) {
  'use strict';
  const dep = name => typeof module !== 'undefined' && module.exports ? require('./' + name + '.js') : root[{'rules':'SudokuRules','game-session':'SudokuSession','presentation':'SudokuPresentation','layout':'SudokuLayout','overlays':'SudokuOverlays'}[name]];
  function create(platform, options = {}) {
    const rules = dep('rules').create({random: options.random}), session = dep('game-session').create(rules);
    const presentation = dep('presentation'), geometry = dep('layout'), overlays = dep('overlays');
    const SAVE = 'sudoku_canvas_save_v1', BEST = 'sudoku_canvas_best_v1';
    let size = {width: 390, height: 844, safe: {top: 0, bottom: 844}}, scroll = 0, modal = null, pending = null, pointer = null, hidden = false;
    let dirty = true, warning = '', toast = '', toastLeft = 0, feedback = null, bests = {}, invalidRaw = null;
    const read = (key, fallback) => {try {return platform.storage.get(key, fallback);} catch (_) {return fallback;}};
    function write(key, value) {try {if (platform.storage.set(key, value) === false) throw Error('storage'); return true;} catch (_) {warning = '无法保存，请检查可用存储空间'; dirty = true; return false;} }
    const bestKey = () => {const s = session.snapshot(); return s.size + '-' + s.level;};
    function save() { if (invalidRaw !== null || !session.snapshot()) return false; return write(SAVE, session.snapshot()); }
    function generate(config) {
      if (invalidRaw !== null) {if (!write(SAVE + '_invalid_backup', invalidRaw)) return; invalidRaw = null;}
      session.start(config.mode, config.size, config.level); modal = null; pending = null; scroll = 0; feedback = null; toast = ''; save(); dirty = true;
    }
    function config() {const s = session.snapshot(); return {mode: s.mode, size: s.size, level: s.level};}
    bests = read(BEST, {}); if (!bests || typeof bests !== 'object' || Array.isArray(bests)) bests = {};
    const saved = read(SAVE, null);
    if (saved && session.restore(saved)) modal = session.snapshot().won ? 'won' : 'resume';
    else {session.start('classic', 9, 'easy'); if (saved !== null) {invalidRaw = saved; modal = 'invalid'; session.pause();}}
    function resize(width, height, safe) {size = {width, height, safe: safe || {top: 0, bottom: height}}; dirty = true;}
    function view() {
      const best = bests[bestKey()], m = presentation.model(session, rules, Number.isInteger(best) && best >= 0 ? best : null);
      const layout = geometry.create(size.width, size.height, size.safe, m.state, scroll); scroll = layout.scroll;
      return {model: m, layout, overlay: overlays.model(modal, m, layout), warning, toast, feedback};
    }
    function events() {
      session.drainEvents().forEach(event => {
        if (event.type === 'entered' && session.snapshot().mode === 'kids') {
          toast = event.correct ? event.lineDone ? '完成一排啦！真棒！' : '对啦，继续加油！' : '再想想，你可以的！'; toastLeft = 1600;
          if (event.correct) feedback = {...event, age: 0};
        }
        if (event.type === 'won') {
          modal = 'won'; const elapsed = session.snapshot().elapsed, key = bestKey();
          if (!Number.isInteger(bests[key]) || elapsed < bests[key]) {const next = {...bests, [key]: elapsed}; if (write(BEST, next)) bests = next;}
          feedback = {won: true, age: 0};
        }
      });
    }
    function action(command) {
      if (hidden) return;
      if (modal && !['resume', 'confirmNew', 'cancel', 'back'].includes(command)) return;
      if (command === 'back') {session.pause(); save(); platform.back(); return;}
      if (command === 'resume') {if (modal === 'invalid' || modal === 'confirm') return; modal = null; session.resume();}
      else if (command === 'cancel') {if (modal !== 'confirm') return; modal = pending.previous; pending = null; if (!modal) session.resume();}
      else if (command === 'confirmNew') {generate(pending ? pending.config : config());}
      else if (command === 'pause') {session.pause(); modal = 'paused'; save();}
      else if (command === 'new' || /^(mode|size|level):/.test(command)) {
        const next = config(), [type, value] = command.split(':');
        if (type === 'mode') Object.assign(next, {mode: value, size: value === 'kids' ? 4 : 9, level: 'easy'});
        if (type === 'size') next.size = Number(value);
        if (type === 'level') next.level = value;
        if (command !== 'new' && JSON.stringify(next) === JSON.stringify(config())) return;
        pending = {config: next, previous: modal}; modal = 'confirm'; session.pause();
      } else {
        if (modal) return;
        if (command === 'notes') session.setNotes(!session.view().notesMode);
        else if (command.startsWith('cell:')) {const [, r, c] = command.split(':'); session.select(+r, +c);}
        else if (command.startsWith('number:')) session.enter(Number(command.split(':')[1]));
        else if (['undo', 'erase', 'hint'].includes(command)) session[command]();
        events(); save();
      }
      dirty = true;
    }
    function tick(ms) {
      if (hidden) return;
      const before = session.snapshot().elapsed; session.tick(ms);
      if (session.snapshot().elapsed !== before) {save(); dirty = true;}
      if (toastLeft > 0) {toastLeft -= ms; if (toastLeft <= 0) toast = ''; dirty = true;}
      if (feedback) {feedback.age += ms; dirty = true; if (feedback.age > (feedback.won ? 2400 : 450)) feedback = null;}
    }
    function touchStart(x, y) {pointer = {x, y, last: y, dragged: false};}
    function touchMove(x, y) {
      if (!pointer || modal) return;
      if (Math.hypot(x - pointer.x, y - pointer.y) > 8) pointer.dragged = true;
      if (pointer.dragged) {scroll = Math.max(0, Math.min(view().layout.maxScroll, scroll + pointer.last - y)); pointer.last = y; dirty = true;}
    }
    function touchEnd(x, y) {
      const p = pointer; pointer = null;
      if (!p || p.dragged || Math.hypot(x - p.x, y - p.y) > 8) return;
      const v = view();
      if (v.overlay) {const b = v.overlay.buttons.find(b => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h); if (b) action(b.action); return;}
      const hit = geometry.hit(v.layout, x, y);
      if (typeof hit === 'string') action(hit);
      else if (hit) action('cell:' + Math.floor(hit.y * v.model.state.size) + ':' + Math.floor(hit.x * v.model.state.size));
    }
    function key(key, ctrl) {
      if (modal) {if (key === 'Enter' && ['paused','resume'].includes(modal)) action('resume'); if (key === 'Escape' && modal === 'confirm') action('cancel'); return;}
      if (ctrl && key.toLowerCase() === 'z') action('undo');
      else if (/^[1-9]$/.test(key)) action('number:' + key);
      else if (['Delete', 'Backspace', '0'].includes(key)) action('erase');
      else if (key.toLowerCase() === 'n') action('notes');
      else if (key.toLowerCase() === 'h') action('hint');
      else if (key === 'Escape' || key.toLowerCase() === 'p') action('pause');
      else if (key.startsWith('Arrow')) {const v = session.view(), n = v.state.size, s = v.selected || {r: 0, c: 0}; const r = (s.r + (key === 'ArrowUp' ? -1 : key === 'ArrowDown' ? 1 : 0) + n) % n, c = (s.c + (key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : 0) + n) % n; action('cell:' + r + ':' + c);}
    }
    function hide() {hidden = true; pointer = null; session.pause(); if (!modal) modal = 'paused'; save(); dirty = true;}
    function show() {hidden = false; dirty = true;}
    return {view, action, tick, resize, touchStart, touchMove, touchEnd, cancelTouch: () => {pointer = null;}, key, save, hide, show,
      needsDraw: () => dirty, drawn: () => {dirty = false;}, scrollBy: delta => {if (!modal) {scroll = Math.max(0, Math.min(view().layout.maxScroll, scroll + delta)); dirty = true;}}};
  }
  const api = {create}; root.SudokuController = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
