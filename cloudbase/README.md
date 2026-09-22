# CloudBase 国内排行榜入口

环境：`prod-d9gxcy8cc6ef71935`（上海）

公开入口：

- 健康检查：`https://prod-d9gxcy8cc6ef71935-1325136572.ap-shanghai.app.tcloudbase.com/api/v1/health`
- 周榜：`/api/v1/leaderboard?game=puyo&mode=challenge`
- 上传：`/api/v1/scores`

## 结构

- `arcade-gateway/`：正式国内网关，通过Cloudflare D1 REST API读写现有数据库。
- `arcade-gateway-probe/`：连通性探针。验证结果为CloudBase无法访问`workers.dev`，但可以访问Cloudflare管理API。

正式网关需要在CloudBase函数`arcadeGateway`中配置环境变量`CLOUDFLARE_D1_API_TOKEN`。Token只授予账户级D1编辑权限，不得写入仓库或前端代码。

## 部署注意

CloudBase CLI 3.8.3使用`fn deploy --httpFn --path`自动创建路由时，会把HTTP函数标成`SCF`。部署后必须确认路由上游类型为`WEB_SCF`。`/api`路由还需要开启路径透传，由函数自身处理CORS，并设置客户端限流。

部署不会替换Cloudflare Worker；D1始终是唯一数据源，Worker保留为境外备用入口。
