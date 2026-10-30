# TeacherScenarioLab Cloudflare 与 Neon 上线操作

2026-10-30 用户确认生产数据库采用 Neon 免费 PostgreSQL，首页品牌为
「教师情境实训实验室 / TeacherScenarioLab」，目标域名为 `teacherlab.weiyi.top`。
PR #1 保持 Draft，目标分支为 `dev/teacher-scenario-lab`；合并需要用户批准。

## 构建与运行边界

保留 Next.js standalone 和已有 Node.js/Docker 部署入口。Workers 使用
`@opennextjs/cloudflare` 转换 standalone 产物，Wrangler 配置位于 `wrangler.jsonc`。
新增依赖固定版本，Next.js 版本满足适配器声明的 peer 要求。

官方依据：[OpenNext 支持范围](https://opennext.js.org/cloudflare)、
[安装](https://opennext.js.org/cloudflare/get-started)、
[数据库连接生命周期](https://opennext.js.org/cloudflare/howtos/db)。核验日期2026-10-30。
现有训练与课程存储使用进程级 PostgreSQL Pool，启动逻辑包含后台工作。
Workers 对跨请求 socket 和启动时 I/O 有限制；是否兼容以 workerd 运行测试为准。
通过 Next.js 编译或 Workers 打包后，仍需执行数据库连续请求和完整训练验收。
当前任务保持训练 API、状态机、权限、事件账本与迁移实现原样。

2026-10-30 实际结果：提交b858937的标准CI、PostgreSQL、Next.js16.4.1生产构建、
Docker运行检查与159项浏览器回归通过。独立Workers构建失败于pg-cloudflare解析
以及sharp原生.node模块，Wrangler dry-run与workerd步骤尚未执行。该次失败属于
适配依赖/原生模块打包兼容性，日志未显示OOM。原文档/PDF/图片处理仍保留原实现。
Cloudflare线上六处页面和真实训练验收保持未通过状态。

```bash
pnpm install --frozen-lockfile
pnpm cf:build
pnpm cf:check
pnpm cf:preview
```

`Cloudflare validation` 工作流使用 Ubuntu 24.04 和独立 PostgreSQL 16，
执行 OpenNext 构建、Wrangler dry-run 与本地 Workers 健康/连续目录请求。
该工作流保留诊断日志，部署、DNS 和供应商真实调用需要各自的配置与验收。
构建失败按编译、依赖、资源不足和 Workers 运行错误分别记录。

## Neon 数据库与生产变量

1. 用户在 Neon 创建 Free 项目与生产数据库，选择 PostgreSQL 16 或受支持版本。
   记录区域、数据库名、版本和备份负责人，连接串保存到受保护环境。
   免费存储、计算与恢复窗口以账号控制台和
   [当前官方价格](https://neon.com/pricing)为准；用量达到限制可能暂停服务。
2. 将 `DATABASE_URL` 配置为提供商给出的 TLS 连接串。建库和迁移使用具备DDL权限的
   直连地址；连接池地址的事务/会话语义需要通过当前锁与迁移合约验证。
   Hyperdrive 是可选连接方案，当前代码的连接生命周期仍需单独验收。
3. 复用现有首次访问迁移：`getTrainingStore()` 在 bootstrap advisory lock 下调用
   `ensureTrainingSchema`；身份和模型池使用现有公共服务的 schema 初始化。
   原始迁移与生产记录保持追加演进。执行前留存可恢复备份，验证失败时保留日志。
4. 配置 Workers 服务端 Secrets：`DATABASE_URL`、`OPENMAIC_SECRET_KEY`、`ACCESS_CODE`、
   生产模型密钥及 `TRAINING_ADMIN_ACCOUNT_IDS`。`OWNER_SINGLE_USER=false` 固定保留。
   生产密钥由用户填入；聊天交接过的密钥先轮换。Mistral 凭据目前缺失。
5. `.dev.vars.example` 提供空占位；本地预览复制为已忽略的 `.dev.vars` 后填入测试配置。
   模板中的空值需要替换。模型池可按当前 provider 规则读取服务端环境变量，
   资格、免费账号核验和预算通过后才允许真实训练。
6. `/api/health` 检查应用健康，数据库连通还需检查训练目录、账号写入读取和真实训练。
   管理员初始化沿用 [恢复文档](recovery.md)：创建账号后，由环境变量指定管理员账号ID。

TeacherScenarioLab项目位于Singapore，项目ID为weathered-rain-85770545，账号计划已核实为free_v3。
teacherlab数据库的PostgreSQL16.15 TLS连接与应用bootstrap已验证，初始化38张公共表；
训练、消息和评价为0。测试通过临时本机代理隧道连接，Cloudflare到Neon的网络仍需实际验收。
该连接凭据曾在聊天中交接，正式使用前由用户轮换并注入生产环境。

## 部署、域名与验收

先确认账号 Worker 权限、免费/付费运行限制、生产 Secrets、Neon 连通和迁移结果。
保存现有部署ID与精确Git SHA，再执行 `pnpm cf:deploy`。首次部署需要记录无历史版本的状态。
运行链接以 Cloudflare 实际返回为准，部署成功后记录版本ID与产物大小。

域名最终目标为 `teacherlab.weiyi.top`。用户确认 Worker 地址及记录指向后，在 Cloudflare
面板配置该项目的域名与DNS。构建配置中保留无域名路由状态，域名切换独立验收。

| 上线检查     | 通过依据                                              |
| ------------ | ----------------------------------------------------- |
| 首页/大厅    | `/` 与首页训练分区可访问，品牌显示中英文产品名        |
| 训练室       | `/classroom/training/<id>` 可访问且owner隔离正确      |
| 复盘         | `/eval/training/<id>` 可访问且证据锚点对应原消息      |
| 文献         | `/courseware/references` 检索50条真实条目且详情可打开 |
| 管理         | `/settings/training` 及模型中心可访问，普通账号被拒绝 |
| 完整真实训练 | 创建→对话→评价→复盘→PostgreSQL落账，状态和事件一致    |
| 五维评价     | 每维证据引用真实教师消息，JSON和证据检查均通过        |
| 健康         | `/api/health` 为ok，数据库读写另有证据                |
| 生产配置     | HTTPS、cookie、管理员、密钥、域名及备份核验完成       |

每项记录通过/未通过及原因。模拟供应商传输结果和真实供应商验收分别记录。

## 回滚

出现运行故障时，先在 Cloudflare 面板选择上一个已验收的 Worker 部署执行回滚，
或使用 `pnpm exec wrangler rollback <previous-version-id>`。恢复后核验健康、账号隔离、
训练读取和写入。数据库保留现有数据，应用回滚前确认与当前 schema 的兼容性。
数据库恢复另按备份恢复流程审批执行。域名变更发生后，DNS回滚目标也需单独确认。

回滚记录包含前后版本、Git SHA、时间、健康结果和数据库schema版本。
main 分支保持原状，PR 合并继续等待用户批准。
