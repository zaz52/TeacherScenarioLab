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

提交3f779f8的完整OpenNext构建、Wrangler dry-run与图片workerd检查通过，
实际应用第二次目录请求出现连接跨请求复用挂起。宿主连接构造通过
`lib/persistence/postgres-pool.ts`接入：Node维持node-postgres构造，Workers由
`cloudflare-worker.mjs`创建请求作用域，每个作用域持有独立原生Pool，响应流结束、
取消或异常后由waitUntil完成清理。原事务固定客户端、SQL、权限和迁移保持原样。
新增独立真实PostgreSQL workerd合约；完整应用首次并发目录与后续连续请求另行验证。

该次dry-run输出约124.9MiB未压缩、25.7MiB gzip；dry-run未执行平台上传。
2026-10-31核对[官方体积限制](https://developers.cloudflare.com/workers/platform/limits/#worker-size)：
未压缩上限64MiB，gzip值作为参考。1a7cba2产物128060.41KiB超限，
后续构建启用Wrangler压缩并由工作流检查实际Total Upload值，保留主要依赖体积。
c9f7903压缩后92113.05KiB仍超限；账号16项与产品76项检查通过。
重复服务端块的诊断促使Workers专用构建使用`pnpm build --webpack`，
图片映射同时适配Webpack；最终体积和行为继续按工作流结果记录。
生产套餐、CPU和启动限额需在轮换凭据后核实，后台轮询任务也需独立验收。

2026-10-31继续免费Workers适配。私有包`@teacherlab/images`提供Node与workerd条件入口：
Node使用原sharp流程；Workers通过IMAGES绑定处理字节，不提供公开图片源URL。
Workers视觉附件统一解码并转为受大小/尺寸限制的单帧JPEG，原始材料图片保持原状；
PDF的8位灰度、灰度透明、RGB和RGBA像素通过PNG编码保留。
Next的standalone追踪显式携带私有包与pg-cloudflare的workerd入口。
独立`node scripts/teacher-scenario-image-smoke.mjs`在本机workerd执行真实绑定操作；
本地Images模拟器的功能范围与生产服务不同，色彩、方向、动画和完整PDF需生产复验。

[Images免费计划](https://developers.cloudflare.com/images/pricing/)包含每月5000次独立转换，
超额拒绝新转换且不自动收费；`.info()`按[绑定说明](https://developers.cloudflare.com/images/optimization/binding/)免费。
Workers免费HTTP请求CPU上限为10ms、内存128MB，依据[当前限制](https://developers.cloudflare.com/workers/platform/limits/)。
上线验收需记录CPU、内存与图片配额；本机workerd通过不能代表免费生产额度已通过。

```bash
pnpm install --frozen-lockfile
pnpm cf:build
pnpm cf:check
pnpm cf:preview
```

`Cloudflare validation` 工作流使用 Ubuntu 24.04 和独立 PostgreSQL 16，
执行 OpenNext 构建、Wrangler dry-run 与本地 Workers 健康/并发及连续目录请求。
隔离库中的合成情境覆盖账号会话与owner隔离、脚本对话、幂等消息、状态事件、
无模型凭据时评价失败不落账、6处页面HTTP响应和50条文献详情接口。
页面HTTP检查与真实浏览器交互分别验收，文献接口检查与外部书目信息核验分别记录。
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
