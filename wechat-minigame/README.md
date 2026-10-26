# 月夜街机 · 微信小游戏

提供原生 Canvas 游戏厅首页，噗呦噗呦已接入网页版共享玩法核心；界面、音效等完整迁移仍在进行，进度见 `PUYO_FULL_MIGRATION_PLAN.md`。其他游戏卡片暂时显示“移植中”。网页版仍由仓库根目录维护。

## 打开方式

1. 在仓库根目录执行 `node wechat-minigame/scripts/sync-puyo-rules.js`。
2. 微信开发者工具选择“小游戏”，导入 `wechat-minigame/`。
3. `project.config.json` 已配置正式小游戏 AppID；如复制工程到另一个小游戏账号，需要替换其中的 AppID。
4. 开发工具本地调试可暂时关闭合法域名校验；真机体验和发布必须在微信后台配置合法域名。

本地逻辑检查：

```bash
node wechat-minigame/scripts/sync-puyo-rules.js --check
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
