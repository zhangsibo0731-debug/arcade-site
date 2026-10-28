(function () {
  'use strict';
  const canvas=document.getElementById('game'),ctx=canvas.getContext('2d'),accessible=document.getElementById('accessible'),status=document.getElementById('status');
  const platform={storage:{get(key,fallback){const raw=localStorage.getItem(key);if(raw===null)return fallback;try{return JSON.parse(raw);}catch(_){return raw;}},set(key,value){localStorage.setItem(key,JSON.stringify(value));return true;}},back(){location.href='../';}};
  const controller=window.SudokuController.create(platform);
  let last=0,summary='',a11ySignature='';
  function resize(){const width=innerWidth,height=innerHeight,dpr=Math.min(devicePixelRatio||1,2),safe=getComputedStyle(document.getElementById('safe'));canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);controller.resize(width,height,{top:parseFloat(safe.paddingTop)||0,bottom:height-(parseFloat(safe.paddingBottom)||0),left:parseFloat(safe.paddingLeft)||0,right:width-(parseFloat(safe.paddingRight)||0)});}
  function a11y(view){const {model:m,overlay}=view;const next=JSON.stringify([m.state.board,m.state.notes,m.selected,m.notesMode,m.historyLength,m.state.hintsLeft,overlay&&[overlay.kind,overlay.draft]]);if(next===a11ySignature)return;a11ySignature=next;
    const focused=document.activeElement&&document.activeElement.dataset.action;
    const actions=overlay?overlay.buttons:view.layout.boxes;
    accessible.replaceChildren();
    if(!overlay){const grid=document.createElement('div');grid.setAttribute('role','grid');grid.setAttribute('aria-label','数独 '+m.state.size+' 乘 '+m.state.size);for(let r=0;r<m.state.size;r++){const row=document.createElement('div');row.setAttribute('role','row');m.cells.filter(c=>c.r===r).forEach(cell=>{const holder=document.createElement('div');holder.setAttribute('role','gridcell');const b=document.createElement('button');b.type='button';b.dataset.action='cell:'+cell.r+':'+cell.c;b.textContent=(cell.r+1)+'行'+(cell.c+1)+'列，'+(cell.value||'空格')+(cell.given?'，给定数字':'')+(cell.error?'，数字冲突':'');b.setAttribute('aria-pressed',String(cell.selected));holder.appendChild(b);row.appendChild(holder);});grid.appendChild(row);}accessible.appendChild(grid);}
    accessible.setAttribute('role',overlay?'dialog':'group');accessible.setAttribute('aria-label',overlay?overlay.title:'数独辅助操作');if(overlay)accessible.setAttribute('aria-modal','true');else accessible.removeAttribute('aria-modal');
    actions.forEach(item=>{const b=document.createElement('button');b.type='button';b.dataset.action=item.action;b.textContent=item.action==='hint'?'提示，剩余 '+m.state.hintsLeft:item.action==='back'?'返回游戏厅':item.action==='settings'?'游戏设置：'+item.label:item.label;b.disabled=item.action==='hint'&&!m.state.hintsLeft||item.action==='undo'&&!m.historyLength;if(item.action==='notes')b.setAttribute('aria-pressed',String(m.notesMode));if(item.kind==='choice')b.setAttribute('aria-pressed',String(!!item.selected));accessible.appendChild(b);});
    if(focused){const b=Array.from(accessible.querySelectorAll('button')).find(b=>b.dataset.action===focused);if(b)b.focus({preventScroll:true});}
    const text=(overlay?overlay.title+'，'+overlay.body:m.configLabel+'，失误 '+m.state.mistakes+'，提示剩余 '+m.state.hintsLeft)+(view.warning?'，'+view.warning:'')+(view.toast?'，'+view.toast:'');if(text!==summary){status.textContent=text;summary=text;}
  }
  accessible.addEventListener('click',e=>{const button=e.target.closest('button');if(button)controller.action(button.dataset.action);});
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);controller.touchStart(e.offsetX,e.offsetY);canvas.focus({preventScroll:true});});
  canvas.addEventListener('pointermove',e=>controller.touchMove(e.offsetX,e.offsetY));canvas.addEventListener('pointerup',e=>controller.touchEnd(e.offsetX,e.offsetY));canvas.addEventListener('pointercancel',()=>controller.cancelTouch());
  canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('wheel',e=>{e.preventDefault();controller.scrollBy(e.deltaY);},{passive:false});
  // Hint/notes/pause are one-shot commands: holding a key must not spend all
  // hints or toggle a mode repeatedly. Also covers duplicate native keydowns.
  const heldKeys=new Set();
  document.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(e.target.closest('#accessible')&&(e.key==='Enter'||e.key===' '))return;if(/^[1-9]$/.test(e.key)||['Backspace','Delete','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Escape',' '].includes(e.key)||(e.ctrlKey||e.metaKey)&&key==='z')e.preventDefault();if(!e.key.startsWith('Arrow')&&heldKeys.has(key))return;heldKeys.add(key);controller.key(e.key,e.ctrlKey||e.metaKey);});
  document.addEventListener('keyup',e=>heldKeys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>heldKeys.clear());
  document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden)controller.hide();else controller.show();});window.addEventListener('pagehide',()=>controller.hide());window.addEventListener('resize',resize);
  function frame(now){if(!document.hidden){if(last)controller.tick(now-last);last=now;if(controller.needsDraw()){const view=controller.view();window.SudokuRenderer.draw(ctx,view);a11y(view);controller.drawn();}}requestAnimationFrame(frame);}
  resize();requestAnimationFrame(frame);
})();
