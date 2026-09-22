# Arcade API · Cloudflare 可行性验证

这个目录是独立于游戏前端的最小 Worker + D1 实验。目前只支持噗呦排行榜，不会影响 GitHub Pages 或本地存档。

## 代码结构

- `src/index.js`：Worker 入口与路由组装。
- `src/http.js`：响应和 CORS。
- `src/leaderboard-rules.js`：周榜周期与成绩校验。
- `src/leaderboard-service.js`：排行榜业务流程。
- `src/leaderboard-store.js`：D1 查询与写入。

Worker 与 CloudBase 网关分别部署，但共同执行仓库根目录 `server-contracts/` 中的接口契约测试。

## 本地验证

```bash
npm install
npm test
npm run db:local
npm run dev
```

接口：

- `GET /api/v1/health`
- `GET /api/v1/leaderboard?game=puyo&mode=challenge`
- `POST /api/v1/scores`

## 首次创建线上 D1

```bash
npx wrangler login
npx wrangler d1 create arcade-db
```

首次创建时，把返回的 `database_id` 写入 `wrangler.jsonc`，然后执行：

```bash
npm run db:remote
npm run deploy
```

## 边界

- API 失败不会影响游戏本体；正式接入时仍以本地纪录为准。
- 当前参数校验只能阻止明显异常，不能让纯前端成绩完全防作弊。
- 第一阶段不做账号、云存档、金币或跨游戏数据。

## 当前验证结果（2026-09-21）

- 本地 Worker + D1 迁移、写入和排行榜读取均已通过。
- 远程 D1 `arcade-db` 已创建并成功执行迁移。
- Worker 已部署至 `https://arcade-api.zhangsibo0731.workers.dev`。
- Cloudflare 管理 API 能确认部署与远程数据库正常。
- 当前终端网络直连上述 `workers.dev` 地址失败，但本机 Chromium 可以完成读取与写入；前端因此始终采用短超时和本地降级，不让游戏依赖该 API。
- 排行榜按北京时间每周一重置，每名玩家每周只保留一条最高成绩。
