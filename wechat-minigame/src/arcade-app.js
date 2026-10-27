'use strict';
const PuyoGame=require('./puyo-game.js');
const SudokuGame=require('./sudoku-game.js');
const lobby=require('./lobby.js');

// The app owns the single RAF/touch/lifecycle dispatch. Games never register a
// second set of listeners or run while another scene is visible.
class ArcadeApp {
  constructor(canvas,platform){
    this.canvas=canvas;this.platform=platform;this.ctx=canvas.getContext('2d');this.info=platform.systemInfo();
    this.puyo=new PuyoGame(canvas,platform);this.puyo.restoreOrMenu();
    this.sudoku=null;this.scene='lobby';this.hidden=false;this.last=0;this.scroll=0;this.buttons=[];this.pointer=null;
  }
  resetCanvas(){const i=this.platform.systemInfo();this.info=i;this.canvas.width=Math.round(i.width*i.pixelRatio);this.canvas.height=Math.round(i.height*i.pixelRatio);this.ctx.setTransform(i.pixelRatio,0,0,i.pixelRatio,0,0);}
  open(name){
    if(this.scene==='puyo')this.puyo.onHide();
    if(this.scene==='sudoku')this.sudoku.leave();
    this.scene=name;this.last=0;this.pointer=null;
    if(name==='sudoku'){if(!this.sudoku)this.sudoku=new SudokuGame(this.canvas,this.platform,()=>this.open('lobby'));this.sudoku.enter();}
    else {this.resetCanvas();if(name==='puyo'){this.puyo.mode='menu';this.puyo.onShow();if(this.puyo.audio.preload)this.puyo.audio.preload();}}
  }
  start(){
    this.resetCanvas();
    wx.onTouchStart(e=>this.touch('start',e));wx.onTouchMove(e=>this.touch('move',e));wx.onTouchEnd(e=>this.touch('end',e));
    if(wx.onTouchCancel)wx.onTouchCancel(()=>this.touch('cancel',{}));
    requestAnimationFrame(t=>this.frame(t));
  }
  touch(type,event){
    if(this.hidden)return;
    if(this.scene==='puyo'){
      if(type==='cancel'){this.puyo.hold=null;this.puyo.pointer=null;}
      else this.puyo[{start:'touchStart',move:'touchMove',end:'touchEnd'}[type]](event);
      if(this.puyo.mode==='lobby')this.open('lobby');return;
    }
    const t=(type==='end'?event.changedTouches:event.touches)||[],point=t[0];
    if(this.scene==='sudoku'){if(type==='cancel')this.sudoku.touchCancel();else if(point)this.sudoku[{start:'touchStart',move:'touchMove',end:'touchEnd'}[type]](point);return;}
    if(type==='cancel'){this.pointer=null;return;}
    if(!point)return;
    const x=point.clientX,y=point.clientY;
    if(type==='start')this.pointer={x,y,last:y,dragged:false};
    else if(type==='move'&&this.pointer){const p=this.pointer;if(Math.hypot(x-p.x,y-p.y)>8)p.dragged=true;if(p.dragged){this.scroll=Math.max(0,Math.min(this.maxScroll||0,this.scroll+p.last-y));p.last=y;}}
    else if(type==='end'){const p=this.pointer;this.pointer=null;if(!p||p.dragged||Math.hypot(x-p.x,y-p.y)>8)return;const hit=this.buttons.find(b=>x>=b.box.x&&x<b.box.x+b.box.w&&y>=b.box.y&&y<b.box.y+b.box.h);if(hit)this.open(hit.action==='openSudoku'?'sudoku':'puyo');}
  }
  frame(time){
    if(!this.hidden){const dt=this.last?Math.max(0,(time-this.last)/1000):0;this.last=time;
      if(this.scene==='puyo'){this.puyo.update(Math.min(.04,dt));this.puyo.draw();}
      else if(this.scene==='sudoku'){this.sudoku.update(dt);this.sudoku.draw();}
      else this.drawLobby();
    }
    requestAnimationFrame(t=>this.frame(t));
  }
  drawLobby(){
    const {width,height,safeArea}=this.info,ctx=this.ctx,gradient=ctx.createLinearGradient(0,0,width,height);gradient.addColorStop(0,'#25152f');gradient.addColorStop(1,'#102033');ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
    const result=lobby.draw({ctx,width,height,safe:safeArea,scroll:this.scroll,best:this.puyo.best,hasSave:!!this.puyo.resumeCandidate});this.scroll=result.scroll;this.maxScroll=result.maxScroll;this.buttons=result.buttons;
  }
  onHide(){this.hidden=true;this.last=0;this.pointer=null;if(this.scene==='puyo')this.puyo.onHide();if(this.scene==='sudoku')this.sudoku.onHide();}
  onShow(){this.hidden=false;this.last=0;if(this.scene==='puyo')this.puyo.onShow();if(this.scene==='sudoku')this.sudoku.onShow();}
}
module.exports=ArcadeApp;
