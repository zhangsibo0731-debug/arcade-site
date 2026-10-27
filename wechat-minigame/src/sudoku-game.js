'use strict';
const controllerFactory=require('../vendor/sudoku/controller.js');
const renderer=require('../vendor/sudoku/renderer.js');
class SudokuGame {
  constructor(canvas,platform,back){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.platform=platform;this.controller=controllerFactory.create({storage:platform.storage(),back});this.active=false;}
  enter(){const info=this.platform.systemInfo();this.canvas.width=Math.round(info.width*info.pixelRatio);this.canvas.height=Math.round(info.height*info.pixelRatio);this.ctx.setTransform(info.pixelRatio,0,0,info.pixelRatio,0,0);const safe={...info.safeArea,top:Math.max(info.safeArea.top,info.menuButton?info.menuButton.bottom+8:info.safeArea.top)};this.controller.resize(info.width,info.height,safe);this.active=true;this.controller.show();}
  leave(){this.active=false;this.controller.hide();}
  update(dt){this.controller.tick(dt*1000);}
  draw(){if(this.controller.needsDraw()){renderer.draw(this.ctx,this.controller.view());this.controller.drawn();}}
  touchStart(t){this.controller.touchStart(t.clientX,t.clientY);}
  touchMove(t){this.controller.touchMove(t.clientX,t.clientY);}
  touchEnd(t){this.controller.touchEnd(t.clientX,t.clientY);}
  touchCancel(){this.controller.cancelTouch();}
  onHide(){this.controller.hide();}
  onShow(){this.controller.show();}
}
module.exports=SudokuGame;
