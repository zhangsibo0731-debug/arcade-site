'use strict';
const controllerFactory=require('../vendor/sudoku/controller.js');
const renderer=require('../vendor/sudoku/renderer.js');
class SudokuGame {
  constructor(canvas,platform,back){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.platform=platform;this.controller=controllerFactory.create({storage:platform.storage(),back});this.active=false;}
  resize() {
    const info = this.platform.systemInfo();
    this.canvas.width = Math.round(info.width * info.pixelRatio);
    this.canvas.height = Math.round(info.height * info.pixelRatio);
    this.ctx.setTransform(info.pixelRatio, 0, 0, info.pixelRatio, 0, 0);
    const area = info.safeArea || {left: 0, right: info.width, bottom: info.height};
    const areaTop = Number.isFinite(area.top) ? Math.max(0, area.top) : 0;
    const statusTop = Number.isFinite(info.statusBarHeight) ? Math.max(0, info.statusBarHeight) : 0;
    const top = Math.max(areaTop, statusTop);
    const menuBottom = info.menuButton && info.menuButton.bottom;
    // DevTools may return {}. undefined + 8 must not turn safe.top into NaN.
    const contentTop = Number.isFinite(menuBottom) && menuBottom > top && menuBottom < info.height
      ? menuBottom + 8
      : top + 48; // Reserve a 32px capsule and spacing without valid geometry.
    this.controller.resize(info.width, info.height, {...area, top: contentTop});
  }
  enter(){this.resize();this.active=true;this.controller.show();}
  leave(){this.active=false;this.controller.hide();}
  update(dt){this.controller.tick(dt*1000);}
  draw(){if(this.controller.needsDraw()){renderer.draw(this.ctx,this.controller.view());this.controller.drawn();}}
  touchStart(t){this.controller.touchStart(t.clientX,t.clientY);}
  touchMove(t){this.controller.touchMove(t.clientX,t.clientY);}
  touchEnd(t){this.controller.touchEnd(t.clientX,t.clientY);}
  touchCancel(){this.controller.cancelTouch();}
  onHide(){this.controller.hide();}
  onShow(){this.resize();this.controller.show();}
}
module.exports=SudokuGame;
