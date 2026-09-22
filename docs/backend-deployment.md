# 服务端手动部署

服务端生产部署由 GitHub Actions 手动触发，不会在普通 `push` 时自动执行。

## GitHub Secrets

在仓库的 `Settings → Secrets and variables → Actions` 中配置以下 Repository secrets：

| Secret | 用途 |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | 部署现有 Cloudflare Worker，权限限制在对应账户与 Worker |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID |
| `TCB_SECRET_ID` | 腾讯云 API SecretId |
| `TCB_SECRET_KEY` | 腾讯云 API SecretKey |
| `TCB_ENV_ID` | CloudBase 生产环境 ID，当前为 `prod-d9gxcy8cc6ef71935` |

密钥不得写入 Git、工作流文件或前端代码。

## 操作入口

1. 打开 GitHub 仓库的 `Actions`。
2. 在左侧选择“部署服务端”。
3. 点击 `Run workflow`，选择 `main` 后确认。
4. 等待“测试服务端”和“部署并验收”两个 Job 完成。

工作流依次执行：

1. Cloudflare Worker 与 CloudBase 网关测试；
2. Cloudflare Worker 部署及线上验收；
3. CloudBase `arcadeGateway` 部署及线上验收；
4. 将提交号和服务地址写入运行摘要。

同一时间只允许一个生产部署运行。后点击的任务会等待，不会中断正在进行的部署。

## GitHub Environment

工作流使用名为 `production` 的 Environment。可以在仓库 `Settings → Environments → production` 中增加 Required reviewers，让每次部署在真正访问生产密钥前再进行一次人工确认。
