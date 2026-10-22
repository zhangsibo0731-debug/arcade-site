# 微信小游戏发布清单

## 账号

- [ ] 以个人主体注册“小游戏”账号，并完成管理员实名验证。
- [ ] 服务类目选择后台提供的休闲/益智游戏类目。
- [ ] 将 `project.config.json` 的 `touristappid` 替换为正式 AppID。
- [ ] AppSecret 仅保存在服务端，禁止写入本项目。
- [ ] 按账号后台实际要求准备软著、自审自查或其他审核材料。

## 域名与隐私

- [ ] request 合法域名加入 CloudBase 网关域名。
- [ ] 若未来把 BGM 改为远程资源，配置 downloadFile 合法域名。
- [ ] 在隐私保护指引中说明：本地游戏存档、玩家主动填写的排行榜昵称、挑战成绩。
- [ ] 明确排行榜为自愿加入，不读取微信昵称、头像、手机号或通讯录。

## 发布验证

- [ ] 运行 `node wechat-minigame/scripts/sync-puyo-rules.js`。
- [ ] 运行 `node wechat-minigame/src/puyo-game.test.js`。
- [ ] 运行 `node wechat-minigame/src/leaderboard.test.js`。
- [ ] 运行 `node wechat-minigame/scripts/check-package.js`。
- [ ] 微信开发者工具无编译错误、无未配置域名请求。
- [ ] iPhone 小屏、全面屏和 Android 各完成一局经典/挑战模式。
- [ ] 验证切后台自动暂停、重新进入继续、来电后音频状态。
- [ ] 验证弱网时排行榜失败不影响游戏，BGM可正常循环。
- [ ] 上传体验版，添加家庭体验成员，完成录屏后再提交审核。
