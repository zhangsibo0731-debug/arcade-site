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
    // DevTools draws its own capsule but no OS status bar in the game canvas.
    // On real devices keep the OS safe inset; neither inherits capsule height.
    const top = info.platform === 'devtools' ? 0 : Math.max(areaTop, statusTop);
    const menuBottom = info.menuButton && info.menuButton.bottom;
    const validBottom = Number.isFinite(menuBottom) && menuBottom > top && menuBottom < info.height;
    const menu = info.menuButton || {};
    const obstruction = {
      x: Number.isFinite(menu.left) && menu.left >= info.width / 2 && menu.left < info.width ? menu.left : info.width - 112,
      y: validBottom ? (Number.isFinite(menu.top) && menu.top >= top && menu.top < menuBottom ? menu.top : Math.max(top, menuBottom - 32)) : top + 8,
      w: 104,
      h: 32,
    };
    if (validBottom) obstruction.h = menuBottom - obstruction.y;
    obstruction.w = info.width - obstruction.x;
    this.controller.resize(info.width, info.height, {...area, top, obstruction});
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
