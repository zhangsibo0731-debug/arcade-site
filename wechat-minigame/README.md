# 月夜街机 · 微信小游戏

提供原生 Canvas 游戏厅首页，目前可玩噗呦噗呦与数独。噗呦复用网页版玩法核心，数独共用规则、状态、展示模型、布局、Canvas 渲染、弹窗和控制器；其他游戏卡片暂时显示“移植中”。网页版仍由仓库根目录维护。

## 打开方式

1. 在仓库根目录执行 `node wechat-minigame/scripts/sync-puyo-rules.js` 和 `node wechat-minigame/scripts/sync-sudoku.js`。
2. 微信开发者工具选择“小游戏”，导入 `wechat-minigame/`。
3. `project.config.json` 已配置正式小游戏 AppID；如复制工程到另一个小游戏账号，需要替换其中的 AppID。
4. 开发工具本地调试可暂时关闭合法域名校验；真机体验和发布必须在微信后台配置合法域名。

本地逻辑检查：

```bash
node wechat-minigame/scripts/sync-puyo-rules.js --check
node wechat-minigame/scripts/sync-sudoku.js --check
node sudoku/baseline.test.js
node sudoku/rules.test.js
node sudoku/migration.test.js
node sudoku/web-platform.test.js
node sudoku/resume-bridge.test.js
node wechat-minigame/src/arcade-app.test.js
node wechat-minigame/src/sudoku-game.test.js
node wechat-minigame/src/bootstrap.test.js
node wechat-minigame/src/puyo-save.test.js
node wechat-minigame/src/puyo-presentation.test.js
node wechat-minigame/src/puyo-feedback.test.js
node wechat-minigame/src/puyo-audio.test.js
node wechat-minigame/src/puyo-effects.test.js
node wechat-minigame/src/puyo-animation-flow.test.js
node wechat-minigame/src/puyo-renderer.test.js
node wechat-minigame/src/puyo-game.test.js
node wechat-minigame/src/leaderboard.test.js
node wechat-minigame/src/puyo-parity.test.js
node wechat-minigame/scripts/check-package.js
node wechat-minigame/scripts/check-audio-assets.js
```

## 微信后台配置

- request 合法域名：`https://prod-d9gxcy8cc6ef71935-1325136572.ap-shanghai.app.tcloudbase.com`
- BGM 上云后，再把资源域名配置为 downloadFile 合法域名，并写入 `src/config.js` 的 `bgmUrl`。

## 音频维护

- `vendor/puyo/audio.js` 直接同步网页版正式音效；微信端只注入音频上下文和独立增益通道，不再维护另一套简化音效。
- `src/puyo-audio.js` 负责微信音乐加载、独立音量、震动设置和生命周期。首页、模式菜单及对局里的声音按钮打开设置；总静音不改变音乐/音效各自档位。
- 当前包内 BGM 是网页版正式曲的 64 kbps 压缩导出，保持同一首、同一长度；两种模式都使用它。来源指纹记录在 `assets/puyo-bgm.meta.json`，母带更新后必须重新核对导出和指纹，不能只替换网页文件。
- 优先使用解码缓冲循环；不支持或解码失败时降级到微信原生播放器。暂停/切后台保留位置，返回后由玩家继续；不在恢复或解码回调里自动开始对局。
- 网页默认音色和音量规则保持不变；`puyo/audio.js` 仅增加可选平台注入、音效停止和声部回收能力。

## 约束

- 不把 `puyo/assets/` 整目录复制进小游戏。
- `vendor/puyo/` 是由网页版规则同步产生的运行副本；修改规则后必须重新执行同步脚本。
- `src/puyo-session-controller.js` 连接共享核心与微信表现层；不在微信端重复实现计分、连锁或肉鸽结算。
- 两种模式各自保存；旧 v2 存档保留原始数据并迁移。消除/奖励尚未结算时保存最近稳定落子，重新进入会回到这一步，不保存半帧动画。
- 提交前执行 `node wechat-minigame/scripts/check-package.js`。

## 数独维护与体验

- 唯一共享源码在 `sudoku/`，不要直接修改 `vendor/sudoku/`。修改后同步，并运行上述四项数独/路由测试。
- `src/arcade-app.js` 统一分发触控、动画帧和生命周期；`src/sudoku-game.js` 只负责微信画布、安全区与平台连接。
- 微信开发者工具已有工程直接编译，主页点击“数独”，无需重新导入。微信胶囊区域会额外预留，空间不足时可上下拖动页面。
- 网页共用界面测试入口：`http://127.0.0.1:8417/sudoku/canvas.html`；原 DOM 页面 `/sudoku/` 保留，已接同一玩法核心。
- Canvas 使用独立存档 `sudoku_canvas_save_v1` 和纪录 `sudoku_canvas_best_v1`，不覆盖原 DOM 存档；微信与浏览器存储各自独立，不自动互通。
- 原网页 `/sudoku/` 会识别同浏览器 Canvas 试用进度：原版尚未填数时优先预览已填写的试用局；两份都有进度时提供明确选择。点击继续后才恢复到原版，并先备份原版存档到 `sudoku_save_v1_before_canvas_import`；试用原档不删除，不自动合并两道题。
- 退出/切后台停止计时，回来明确继续；新局、模式/尺寸/难度切换需要确认。坏档须由玩家确认开始新局后备份，保存失败会提示。
- 桌面与模拟器已测不等于手机真机验收。发布/上传前应完成经典与儿童各一局、后台恢复及生成耗时的手机验收。
