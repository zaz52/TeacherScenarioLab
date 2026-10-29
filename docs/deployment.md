# TeacherScenarioLab 生产部署方案

> 目标域名：`https://zhiwei.weiyi.top`（显示名称：教师情境实训实验室）。
> 架构底线：本应用需要常驻 Node.js 进程 + PostgreSQL，**不**迁移为
> Cloudflare Pages 静态站点，也不为 Workers 重写后端。Cloudflare 只用于
> 域名管理、DNS、代理或隧道接入。

## 1. 部署形态（已验证的仓库能力）

仓库自带多阶段 `Dockerfile`（node:22-alpine，pnpm 10.28.0，standalone
输出，runner 以 `nextjs` 用户执行 `node server.js`，监听 3000）和
`docker-compose.yml`（`openmaic` + `postgres:16` 两个服务，postgres 健康
检查通过后应用才启动）。生产部署复用这两件，不另写部署脚本。

```bash
# 在部署机上（需要 Docker）
cp openmaic.example.yml openmaic.yml   # 只有文件存在时才能挂载；缺失文件会被挂载成目录
cp .env.production.example .env.local  # 再填入真实值（见第 2 节）
docker compose up -d --build
docker compose ps                      # openmaic 与 postgres 均为 healthy/running
curl -s http://127.0.0.1:3000/api/health   # {"status":"ok",...}，该接口不依赖数据库
```

## 2. 必需的服务端环境变量（`.env.local`，不进 Git）

| 变量 | 说明 |
|---|---|
| `DATABASE_URL` | 必填。Compose 默认用 `docker-compose.defaults.env` 里的 bundled postgres 地址；用外部库时在 `.env.local` 里覆盖。密码只用字母数字，否则 URL 编码会断。 |
| `OWNER_SINGLE_USER` | **生产必须设为 `false`**。Compose 默认是 `true`（单人自用模式：所有请求解析为同一个 owner，不发匿名 cookie），会破坏训练的账号/匿名/认领模型。 |
| `TRAINING_ADMIN_ACCOUNT_IDS` | 管理员账号 ID 列表（逗号分隔，形如 `acct:<uuid>`）。管理员永不自助授予，只从这里来。 |
| `NVIDIA_API_KEY` / `GLM_API_KEY` | 模型密钥，只进 `.env.local`，不进 YAML 明文、不进源码、不进 Git。 |
| `OPENMAIC_CONFIG` | 不设时默认读工作目录的 `openmaic.yml`；需要换位置时设为文件路径。 |
| `ACCESS_CODE` | 对外发布前必须设强值（无 ACCESS_CODE 时 Compose 默认只绑 127.0.0.1）。 |
| `OPENMAIC_PUBLISH_ADDRESS` | 需要对外发布时设为 `0.0.0.0`（或指定网卡），并配合反代/隧道做 HTTPS。 |

模型配置用 `openmaic.yml`（长期机制，见仓库 `openmaic.example.yml`）：
NVIDIA 走 `openai-compatible`（`https://integrate.api.nvidia.com/v1`），
智谱 GLM 走原生 `glm` preset；角色对话与训练评价分别走
`classroom.roleplay` / `classroom.evaluation` 槽位。**`openmaic.yml` 一旦
存在，legacy 的 `*_API_KEY` 三元组、`DEFAULT_MODEL` 全部失效**，两套不可
混用；且 yml 里 `${VAR}` 引用的变量未设置时，服务器拒绝启动。

## 3. 数据库：迁移、备份、恢复

- 迁移自动执行：首次访问训练存储时，`getTrainingStore()` 会在引导
  advisory lock 下执行 `ensureTrainingSchema`（`training_scenarios` 等
  表按版本化迁移创建），无需单独跑迁移命令。部署后第一次打开训练页
  即完成建表；失败时看应用日志，不要手动改表结构。
- 备份（部署机上，示例）：

```bash
docker compose exec postgres pg_dump -U openmaic openmaic > tsl-backup-$(date +%F).sql
```

- 恢复：停应用后用 `psql` 回放备份，再起应用；恢复后核对
  `training_scenarios` 里已发布版本、`trainings` 数量与管理员账号。
- 已发布情境版本是冻结的：恢复后历史训练仍绑定原版本，不会被新
  版本覆盖；不要直接 UPDATE 已发布行。

## 4. 健康检查与进程管理

- 健康检查：`GET /api/health`（不依赖数据库）。Compose 的 postgres
  服务自带健康检查；应用容器建议再加 `restart: unless-stopped`。
- 日志：`docker compose logs -f openmaic`。模型调用失败时日志只含
  错误码与厂商状态，不含密钥。
- 进程自动重启：用 Compose 的 restart 策略；不要用 `pm2` 之外再套一层。

## 5. HTTPS 与域名接入（`zhiwei.weiyi.top`）

1. 先在部署机上把应用跑起来并通过第 6 节回归（不要先切流量）。
2. 再把 `zhiwei.weiyi.top` 指到部署机：A 记录到服务器公网 IP，或
   Cloudflare Tunnel（`cloudflared`）指向 `127.0.0.1:3000`；二选一，
   以实际服务器条件为准。
3. HTTPS 由反代（Caddy/Nginx）或 Cloudflare 代理层终止；应用本身只
   监听 3000，不直接处理证书。
4. **切流前确认该子域名当前承载的应用**：如果仍有旧服务在跑，先记
   录旧服务的配置、数据与恢复路径，准备好回滚（把 DNS 指回旧目标），
   未完成验收前不切换现有流量。

## 6. 部署后回归（必须逐项通过才算上线）

1. `GET /api/health` 返回 ok。
2. 首页标题为“教师情境实训实验室”，开始训练/记录/文献/管理入口可达。
3. 两个浏览器（或两个账号）训练记录互不可见（owner 隔离）。
4. 匿名训练 → 创建账号 → 账号页认领，记录归属转移。
5. 管理后台：非管理员打开只看到权限提示，直接调管理 API 返回 403。
6. 情境：新建草稿 → 发布 → 大厅可见；已发布版本编辑/删除均被 409 拒绝。
7. 模型：脚本模式全程可用；配置密钥后角色对话（NVIDIA）与评价
   （GLM）各至少一次真实调用成功，评价证据能定位回原始对话。
8. 文献：关键词检索与详情页返回真实收录条目，无编造。

## 7. 上线前仍待外部条件（截至本文档编写时，诚实标注）

- 代码尚未推送到 GitHub（本地开发分支，未建 PR、未合并主分支）。
- 生产构建在 8GB 虚拟机上因 OOM（exit 137）未通过，需在更大内存
  机器或 CI 上复验；**不要把未通过的构建说成通过**。
- 生产模型密钥、生产服务器、生产数据库均未配置；`zhiwei.weiyi.top`
  的当前服务归属尚未从公开渠道确认，DNS 不动。
- 上线是六个分开的操作：① 代码推送到 GitHub ② 构建和部署应用
  ③ 配置目标子域名 ④ 初始化生产数据库 ⑤ 配置生产模型密钥
  ⑥ 生产环境最终验收。GitHub 上有代码 ≠ 网站已上线。
