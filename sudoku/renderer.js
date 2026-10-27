(function (root) {
  'use strict';
  // Palette migrated from sudoku/styles.css, without depending on CSS or fonts.
  const CLASSIC = {bg: '#e7e9ee', paper: '#ffffff', ink: '#141a26', soft: '#667085', accent: '#2e4ee0', line: '#d7dae2', peer: '#f1f3f9', same: '#e7ecfb', selected: '#d6dff8', error: '#d33b3b', button: '#f1f3f9'};
  const KIDS = {bg: '#fff3d6', paper: '#fffdf6', ink: '#4a3421', soft: '#a0805f', accent: '#22c55e', line: '#f0d9b0', peer: '#fff3cf', same: '#d8f8e6', selected: '#b5f0c9', error: '#ff5a5a', button: '#ffe7c0'};
  function draw(ctx, view) {
    const {model: m, layout: l, overlay, warning, toast, feedback} = view, s = m.state, theme = s.mode === 'kids' ? KIDS : CLASSIC;
    function text(value, x, y, font = 14, color = theme.ink, align = 'left', bold = false) {
      ctx.fillStyle = color; ctx.font = (bold ? '700 ' : '400 ') + font + 'px sans-serif'; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(String(value), x, y);
    }
    function panel(box, fill, radius = 10, stroke) {
      const {x,y,w,h} = box, r = Math.min(radius,w/2,h/2);
      ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill(); if (stroke) {ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke();}
    }
    function button(b, label, active, disabled, primary) {
      ctx.save(); if (disabled) ctx.globalAlpha = .42;
      const tab = /^(mode|level|size):/.test(b.action);
      panel(b, active && tab ? theme.paper : primary || active ? theme.accent : theme.button, 10, active && tab ? theme.accent : null);
      text(label, b.x+b.w/2, b.y+b.h/2, 14, primary || active && !tab ? '#fff' : theme.ink, 'center', active || primary); ctx.restore();
    }
    function wrap(value, x, y, width, font, color, lineHeight = 23) {
      let line = ''; ctx.font = '400 ' + font + 'px sans-serif';
      for (const char of value) {
        if (char === '\n' || (line && ctx.measureText(line + char).width > width)) {text(line,x,y,font,color); y+=lineHeight; line = char === '\n' ? '' : char;}
        else line += char;
      }
      if (line) text(line,x,y,font,color);
      return y;
    }
    ctx.fillStyle = theme.bg; ctx.fillRect(0,0,l.width,l.height);
    ctx.save(); ctx.beginPath(); ctx.rect(0,l.top,l.width,l.bottom-l.top); ctx.clip(); ctx.translate(0,-l.scroll);
    text('数独',l.title.x,l.title.y,25,theme.ink,'left',true);
    text(s.mode === 'kids' ? '一起找数字的小秘密' : '纸与墨 · 推理填数',l.title.x,l.title.y+20,10,theme.soft);
    text('用时 '+m.elapsedLabel,l.stats.x,l.stats.y,12,theme.soft);
    text('失误 '+s.mistakes,l.stats.x+l.stats.w/2,l.stats.y,12,theme.soft,'center');
    text('最佳 '+m.bestLabel,l.stats.x+l.stats.w,l.stats.y,12,theme.soft,'right');
    l.boxes.forEach(b => {
      const a = b.action; let active = a === 'mode:'+s.mode || a === 'level:'+s.level || a === 'size:'+s.size || a === 'notes' && m.notesMode;
      const disabled = a === 'undo' && !m.historyLength || a === 'hint' && !s.hintsLeft;
      if (a.startsWith('number:')) {
        const n = Number(a.split(':')[1]), remaining = m.remaining[n-1]; panel(b,theme.paper,9,theme.line);
        text(n,b.x+b.w/2,b.y+17,22,remaining===0?theme.soft:theme.ink,'center',true);
        text('余 '+remaining,b.x+b.w/2,b.y+35,9,theme.soft,'center');
      } else button(b,a === 'hint' ? '提示 '+s.hintsLeft : b.label,active,disabled);
    });
    const board = l.board, unit = board.w/s.size;
    ctx.fillStyle = theme.paper; ctx.fillRect(board.x,board.y,board.w,board.h);
    m.cells.forEach(cell => {
      const x = board.x+cell.c*unit, y = board.y+cell.r*unit;
      ctx.fillStyle = cell.selected ? theme.selected : cell.same ? theme.same : cell.peer ? theme.peer : theme.paper;
      ctx.fillRect(x,y,unit,unit);
      if (cell.error) {ctx.fillStyle='rgba(195,77,98,.12)'; ctx.fillRect(x,y,unit,unit);}
      let pop = 1;
      if (feedback && !feedback.won && feedback.r===cell.r && feedback.c===cell.c) pop += .15*Math.sin(Math.PI*Math.min(1,feedback.age/450));
      if (cell.value) text(cell.value,x+unit/2,y+unit/2,Math.min(36,unit*.54)*pop,cell.error ? theme.error : cell.given ? theme.ink : theme.accent,'center',cell.given);
      else if (cell.notes) {
        const cols=Math.ceil(Math.sqrt(s.size)), rows=Math.ceil(s.size/cols);
        for (let n=1;n<=s.size;n++) if(cell.notes & 1<<(n-1)) text(n,x+((n-1)%cols+.5)*unit/cols,y+(Math.floor((n-1)/cols)+.5)*unit/rows,Math.max(7,unit*.21),theme.soft,'center');
      }
    });
    for(let i=0;i<=s.size;i++) {
      ctx.lineWidth=i%m.bc===0?2: .6;ctx.strokeStyle=i%m.bc===0?theme.ink:theme.line;
      ctx.beginPath();ctx.moveTo(board.x+i*unit,board.y);ctx.lineTo(board.x+i*unit,board.y+board.h);ctx.stroke();
      ctx.lineWidth=i%m.br===0?2:.6;ctx.strokeStyle=i%m.br===0?theme.ink:theme.line;
      ctx.beginPath();ctx.moveTo(board.x,board.y+i*unit);ctx.lineTo(board.x+board.w,board.y+i*unit);ctx.stroke();
    }
    ctx.restore();
    if (l.maxScroll) {ctx.fillStyle=theme.accent;ctx.globalAlpha=.35;const track=l.bottom-l.top,thumb=track*track/(track+l.maxScroll);ctx.fillRect(l.width-5,l.top+(track-thumb)*l.scroll/l.maxScroll,3,thumb);ctx.globalAlpha=1;}
    if (overlay) {
      ctx.fillStyle='rgba(31,34,30,.48)';ctx.fillRect(0,0,l.width,l.height);
      panel(overlay.box,theme.paper,20,theme.line);
      text(overlay.title,overlay.box.x+overlay.box.w/2,overlay.box.y+42,22,theme.ink,'center',true);
      wrap(overlay.body,overlay.box.x+22,overlay.box.y+84,overlay.box.w-44,14,theme.soft);
      overlay.buttons.forEach((b,i)=>button(b,b.label,false,false,i===0));
      if(feedback && feedback.won && s.mode==='kids') {
        ['#e7a54c','#70b69c','#d57586','#84add6'].forEach((color,j)=>{for(let i=0;i<8;i++){const t=feedback.age/2400,x=(i*47+j*29)%l.width,y=l.top+((i*67+j*53)+t*180)%(l.bottom-l.top);ctx.fillStyle=color;ctx.fillRect(x,y,4,7);}});
      }
    }
    if(toast && !overlay) {const box={x:16,y:Math.max(l.top+8,l.bottom-56),w:l.width-32,h:40};panel(box,theme.accent);text(toast,l.width/2,box.y+20,13,'#fff','center',true);}
    if(warning) {panel({x:8,y:l.top+2,w:l.width-16,h:32},'#a44138');text(warning,l.width/2,l.top+18,11,'#fff','center');}
  }
  const api={draw};root.SudokuRenderer=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
