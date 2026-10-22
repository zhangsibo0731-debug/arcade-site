# 月夜街机 · 微信小游戏

首版仅迁移噗呦噗呦，网页版仍由仓库根目录维护。

## 打开方式

1. 在仓库根目录执行 `node wechat-minigame/scripts/sync-puyo-rules.js`。
2. 微信开发者工具选择“小游戏”，导入 `wechat-minigame/`。
3. 未注册前使用 `touristappid` 本地预览；注册后替换 `project.config.json` 中的 AppID。
4. 开发工具本地调试可暂时关闭合法域名校验；真机体验和发布必须在微信后台配置合法域名。

本地逻辑检查：

```bash
node wechat-minigame/scripts/sync-puyo-rules.js --check
node wechat-minigame/src/puyo-game.test.js
node wechat-minigame/src/leaderboard.test.js
node wechat-minigame/scripts/check-package.js
```

## 微信后台配置

- request 合法域名：`https://prod-d9gxcy8cc6ef71935-1325136572.ap-shanghai.app.tcloudbase.com`
- BGM 上云后，再把资源域名配置为 downloadFile 合法域名，并写入 `src/config.js` 的 `bgmUrl`。

## 约束

- 不把 `puyo/assets/` 整目录复制进小游戏。
- `vendor/puyo/` 是由网页版规则同步产生的运行副本；修改规则后必须重新执行同步脚本。
- 提交前执行 `node wechat-minigame/scripts/check-package.js`。
