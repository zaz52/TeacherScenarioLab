# TeacherScenarioLab 生产部署方案

> 目标域名：`https://teacherlab.weiyi.top`；品牌：教师情境实训实验室 / TeacherScenarioLab。
> 2026-10-30 用户确认采用 Neon 免费 PostgreSQL，推进 OpenNext/Workers 部署验证。
> [Cloudflare 与 Neon 操作说明](cloudflare.md)记录该路径及运行门槛。
> 本文保留已验证的 Node.js standalone / Docker 部署能力；训练API、核心引擎与迁移沿用现有实现。

## 1. 部署形态（已验证的仓库能力）

仓库自带多阶段 `Dockerfile`（node:22-alpine，pnpm 10.28.0，standalone
输出，runner 以 `nextjs` 用户执行 `node server.js`，监听 3000）和
`docker-compose.yml`（`openmaic` + `postgres:16` 两个服务，postgres 健康
检查通过后应用才启动）。生产部署复用这两件，不另写部署脚本。

```bash
# 在部署机上（需要 Docker）
cp openmaic.teacher-scenario.example.yml openmaic.yml   # 只有文件存在时才能挂载；缺失文件会被挂载成目录
cp .env.production.example .env.local  # 再填入真实值（见第 2 节）
docker compose --env-file .env.local -f docker-compose.yml -f docker-compose.teacher-scenario.yml config --quiet
docker compose --env-file .env.local -f docker-compose.yml -f docker-compose.teacher-scenario.yml up -d --build
docker compose --env-file .env.local ps                      # openmaic 与 postgres 均为 healthy/running
curl -s http://127.0.0.1:3000/api/health   # {"status":"ok",...}，该接口不依赖数据库
```

`docker-compose.teacher-scenario.yml` 将本地配置只读挂载至 `/app/openmaic.yml`，
并固定多用户身份模式。配置文件缺失时，bind 的 `create_host_path: false`
使 Compose 报错；数据库口令、访问码和加密根密钥缺失时也会拒绝配置。
填好密钥与精确模型 ID 后再启动。基础 Compose 中的可选
配置挂载仍保留原注释状态。以上命令供验收批准后的部署使用。

## 2. 必需的服务端环境变量（`.env.local`，不进 Git）

| 变量                             | 说明                                                                                                                                                                             |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                   | 必填。示例通过 `PERSISTENCE_POSTGRES_PASSWORD` 构造连接串；使用外部库时覆盖该值，特殊字符需 URL 编码。                                                                           |
| `PERSISTENCE_POSTGRES_PASSWORD`  | 使用 bundled PostgreSQL 时必填。通过 `--env-file .env.local` 同时传入 Compose 插值和应用环境；已有卷的口令变更需要单独操作与验证。                                               |
| `OPENMAIC_SECRET_KEY`            | 保存用户模型密钥所用的加密根密钥。生产设置高熵值、所有副本一致，并与数据库一起保留受保护备份；轮换前验证旧密文的恢复方案。未设置时生成的 `data/instance-secret.key` 需要持久化。 |
| `OWNER_SINGLE_USER`              | **生产必须设为 `false`**。Compose 默认是 `true`（单人自用模式：所有请求解析为同一个 owner，不发匿名 cookie），会破坏训练的账号/匿名/认领模型。                                   |
| `TRAINING_ADMIN_ACCOUNT_IDS`     | 管理员账号 ID 列表（逗号分隔，形如 `acct:<uuid>`）。管理员永不自助授予，只从这里来。                                                                                             |
| `NVIDIA_API_KEY` / `GLM_API_KEY` | 模型密钥，只进 `.env.local`，不进 YAML 明文、不进源码、不进 Git。                                                                                                                |
| `OPENMAIC_CONFIG`                | 不设时默认读工作目录的 `openmaic.yml`；需要换位置时设为文件路径。                                                                                                                |
| `ACCESS_CODE`                    | 对外发布前必须设强值（无 ACCESS_CODE 时 Compose 默认只绑 127.0.0.1）。                                                                                                           |
| `OPENMAIC_PUBLISH_ADDRESS`       | 需要对外发布时设为 `0.0.0.0`（或指定网卡），并配合反代/隧道做 HTTPS。                                                                                                            |

模型配置用 `openmaic.yml`。GLM / Google 参考 `openmaic.teacher-scenario.example.yml`，
通用供应商参考 `openmaic.example.yml`；已有配置应合并需要的 provider 和 slot。
智谱 GLM 与 Google 分别使用原生 `glm`、`google` preset；角色对话与训练评价分别走
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
docker compose --env-file .env.local exec -T postgres pg_dump -U openmaic -Fc openmaic > tsl-backup-$(date +%F).dump
sha256sum tsl-backup-*.dump
```

- 恢复演练：在独立空库用 `pg_restore --exit-on-error` 恢复上述自定义格式备份；
  验证迁移版本与数据后再制定生产恢复窗口。生产恢复前保留当前库备份。恢复后核对
  `training_scenarios` 里已发布版本、`trainings` 数量与管理员账号。
- 已发布情境版本是冻结的：恢复后历史训练仍绑定原版本，不会被新
  版本覆盖；不要直接 UPDATE 已发布行。

## 4. 健康检查与进程管理

- 健康检查：`GET /api/health`（不依赖数据库）。Compose 的 postgres
  服务自带健康检查；应用容器建议再加 `restart: unless-stopped`。
- 日志：`docker compose logs -f openmaic`。模型调用失败时日志只含
  错误码与厂商状态，不含密钥。
- 进程自动重启：用 Compose 的 restart 策略；不要用 `pm2` 之外再套一层。

## 5. HTTPS 与域名接入（`teacherlab.weiyi.top`）

1. 先在部署机上把应用跑起来并通过第 6 节回归（不要先切流量）。
2. Node.js部署时，将 `teacherlab.weiyi.top` 指到用户确认的部署机：A 记录到服务器公网 IP，或
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
7. 模型：脚本模式全程可用；模型池默认角色为GLM Flash、评价为Google Flash，
   各自通过真实资格和完整训练验收，评价证据定位回原始对话。NVIDIA按独立授权托底。
8. 文献：关键词检索与详情页返回真实收录条目，无编造。

## 7. 上线前仍待外部条件（截至本文档编写时，诚实标注）

- 代码通过现有 Draft PR #1 审核：`feat/teacher-scenario-lab-product` → `dev/teacher-scenario-lab`。每次验收记录精确 head SHA。
- 生产构建以最新 head 对应的 Next.js Build 与 Main image 作业为准；历史 OOM 记录保留在验收报告中。镜像 builder 成功与网站运行验收分别记录。
- 生产密钥由用户在受保护环境配置，聊天交接过的密钥上线前轮换；Mistral凭据尚缺。
  Neon账号授权、生产数据库连接与迁移，以及Cloudflare Workers权限和域名目标需实际核实。
- 上线是六个分开的操作：① 代码推送到 GitHub ② 构建和部署应用
  ③ 配置目标子域名 ④ 初始化生产数据库 ⑤ 配置生产模型密钥
  ⑥ 生产环境最终验收。GitHub 上有代码 ≠ 网站已上线。

## 8. 发布前配置核验

- 使用第 1 节包含两个 `-f` 参数的 `config --quiet` 命令校验后，核验应用与 PostgreSQL 使用同一口令；完整 `config` 输出含敏感值，应保留在受保护环境。
- NVIDIA 的 `NVIDIA_MODEL_ID` 由携带本地密钥的 `GET https://integrate.api.nvidia.com/v1/models` 目录核验。GLM 的 `GLM_MODEL_ID` 按账号可用目录填写；两项真实调用分别验收。
- 健康探针 `/api/health` 不检查数据库。数据库就绪还需以数据库连接、训练目录和真实写入读取回归核验。
- Main image CI 将最终 runner 镜像加载到临时 Docker daemon，使用独立 PostgreSQL 库启动，以 UID 1001 运行。`scripts/teacher-scenario-runtime-smoke.mjs` 检查健康、访问码拒绝/登录、目录、账号创建/读取、隔离、会话撤销、cookie 属性与管理权限；不向镜像注入真实模型密钥。实际部署机仍需执行第 6 节回归。
- 普通账号访问管理 API 返回 403；跨 owner 的训练返回 404；无效会话返回 401。复核 HTTPS 下 cookie 的 Secure、HttpOnly、SameSite 属性。
- 正式部署以完成验收和取得用户授权为前提。域名 DNS、服务器归属、Cloudflare 路由、生产 PostgreSQL 和备份位置须由可核验的当前配置确认；当次授权范围记录于项目进度。

## 训练资源池上线门槛

详见 [模型资源池](model-pool.md)。管理员先刷新模型目录，核对免费资格、
额度来源及隐私政策，再执行角色和评价各自的真实资格测试。通过后资源池按
免费资源、任务默认、备用及 NVIDIA 最终授权顺序调度。训练默认角色为
`glm-4.7-flash`，默认评价为 `gemini-3.8-flash`。资格与目录过期后需要复核。

资源池可从同名 `openmaic.yml` provider 读取凭据，缺省连接使用本环境模板
中的对应变量。该训练入口的凭据读取规则独立于 OpenMAIC 的 legacy 槽位翻译。
Google 免费账号资格须在控制台确认；供应商目录成功不能证明免费资格。
NVIDIA 默认停用，管理员授权、价格上界与预算齐备后才可进入最终候选。

模型管理 API 需要训练管理员身份，生产同时保留访问码、HTTPS 和多用户身份隔离。
模型管理页、真实评价、账号隔离和最终镜像回归通过后，方可进入部署验收。
当前PR保持Draft，合并等待用户批准；部署与生产回归按本轮明确授权及实际条件执行。
