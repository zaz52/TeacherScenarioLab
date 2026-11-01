# TeacherScenarioLab Cloudflare 与 Neon 上线操作

2026-10-30 用户确认生产数据库采用 Neon 免费 PostgreSQL，首页品牌为
「教师情境实训实验室 / TeacherScenarioLab」。2026-11-01用户最终确认域名为
`teacherlab.weiyiai.top`（当前账号的 `weiyiai.top` 区域）。旧域名已废弃。
PR #1 保持 Draft，目标分支为 `dev/teacher-scenario-lab`；合并需要用户批准。

2026-11-01 用户明确授权本次继续使用此前配置的凭据部署，撤销本次发布前的轮换条件。
凭据由 GitHub Actions 加密 Secrets 注入，发布授权绑定精确提交 SHA。
下文历史检查点中的“待轮换”描述保留当时状态；当前发布依据本段授权执行。

## 2026-11-01 后台执行依赖加载检查点（14:40，Asia/Shanghai）

3c6d4e5的[CI](https://github.com/zaz52/TeacherScenarioLab/actions/runs/41279648134)、
[PostgreSQL合约](https://github.com/zaz52/TeacherScenarioLab/actions/runs/41279648132)和
[Cloudflare](https://github.com/zaz52/TeacherScenarioLab/actions/runs/41279648135)全部成功，
测试执行汇总18950通过、0失败、774跳过，其中包括50项离线合约及跨作业重复执行。
159项Chromium E2E通过。此前18900的汇总未包含50项离线合约，当前记录已补全。
实际发布版本为a67f14b9-7d09-4a5f-a30c-c46fe2a23780，域名与Neon连通通过。

SDK去重使上传降到54314.29KiB、启动21ms，但实际平台仍记录内存超限重启。
GLM请求实际HTTP429并按失败记账；Google评价实际HTTP503，紧接的重试受限额拦截；
OpenRouter零价角色单次HTTP200，完整资格测试中断。上述结果均未形成通过的模型资格，
训练评价保存和五维证据仍待验收。

源码进一步发现空队列启动会加载课程执行引擎、默认步骤服务及材料解析实现。
课程runner将执行依赖延迟到领取任务并启动租约心跳后加载，沿用原执行函数；
材料调度器把解析实现和课堂错误类型的依赖延迟到实际工作路径。
领取、心跳、暂停、恢复、错误处理、SQL及训练核心保持当前实现。
新增回归验证空队列与材料调度器的依赖边界，并检查加载期间心跳持续。
本机首轮30项失败来自私有模型配置引用缺失环境变量，隔离源码副本在
D:/Codex/cache/TeacherScenarioLab-lazy-import-tests-20261101中复测，45通过、0失败；
三处改动代码与副本SHA256逐一匹配，ESLint与格式通过，私有配置与密钥保留原位。
后续提交的云端和生产结果继续独立核验，当前尚未认定内存问题解决。

## 2026-11-01 生产发布与域名验收（14:05，Asia/Shanghai）

代码提交 `34cd18f02ae07f40c8d1ef7ee1729c33f03f5bcf` 已成功发布到
`teacher-scenario-lab`，初始版本为 `17c56d20-e1c2-4771-b3b7-c740652c149a`。
管理员环境变量初始化后产生新的配置版本，部署记录以 Cloudflare 当前版本为准。

用户确认后，通过 Custom Domains API 将 `teacherlab.weiyiai.top` 绑定到该 Worker，
HTTP200；区域为 `weiyiai.top`。Wrangler routes 与页面 metadataBase 沿用这一域名。
正式入口为 <https://teacherlab.weiyiai.top>，访问码保存在本地忽略文件 `.env.local`，
经平台环境变量注入。管理员会话保存在本地忽略文件 `.env.live-admin.local`，
该会话属于初始化账户，用户新建账户的管理员授权需单独绑定其公开账户ID。

该提交的 [CI](https://github.com/zaz52/TeacherScenarioLab/actions/runs/41277098216)、
[PostgreSQL合约](https://github.com/zaz52/TeacherScenarioLab/actions/runs/41277098223) 与
[Cloudflare](https://github.com/zaz52/TeacherScenarioLab/actions/runs/41277098221) 均成功。
CI与PG测试执行汇总18950通过、0失败、774跳过，包含跨作业重复；159项Chromium E2E通过。
标准Next.js/Docker生产构建和OpenNext构建通过，Workers上传56178.60KiB，启动25ms。

生产 `/api/health`、首页、大厅、训练室、复盘、文献、设置六处页面HTTP200；
50条文献详情均HTTP200。管理员初始化、情境v1导入发布、学员建号、创建训练、
脚本对话和消息幂等通过；普通账号管理API返回403。生产数据库保留这些验收记录。
此前workers.dev第36条文献详情出现一次500，完整自定义域名复测未复现；原失败证据保留。
浏览器控制工具超时，生产可视操作验收尚未完成。

**真实模型全流程未通过。** GLM刷新目录HTTP200，但资格调用期间宿主重启；
OpenRouter零价模型目录和策略保存HTTP200，资格调用HTTP500（1101）。
Cloudflare实际tail记录 `Durable Object's isolate exceeded its memory limit and was reset.`，
包含 `exceededMemory` 事件。平台每个isolate的128MB上限见
[官方内存说明](https://developers.cloudflare.com/durable-objects/observability/metrics-and-analytics/)。
属于生产运行时内存问题；构建及隔离workerd成功不能替代此项。
GLM初次资格因缺少刷新后的目录被busy拦截，随后调用中断留下reserved账与限时租约，
资格均未通过，失败调用没有生成已通过资格。需要继续处理运行体积/内存并重新验收模型落账、
评价保存和五维证据，当前上线状态为待验收。

Google目录HTTP400、Groq目录HTTP403，Mistral凭据缺失；NVIDIA目录含已配置ID，
其直接推理仍受独立费用授权和预算门槛约束。OpenRouter免费候选资格未通过，
付费模型回退保持受限。所有供应商预设和训练后端/核心引擎保持当前实现。

发布前已用TLS验证Neon连接并备份38张表；私有备份保留于仓库外。
回滚时在Cloudflare的 `teacher-scenario-lab` Deployments选择上一个已通过验收的版本，
回滚后逐项复测健康、登录、训练与评价。首次上线尚无完整模型验收通过的历史版本，
当前版本不能当作完整验收通过的回滚基线。数据库备份恢复需独立批准并先核对数据变更。
PR继续Draft，合并等待批准，main保持原状态。后续配置提交的CI与部署另记。

针对实际内存失败，Workers专用Next构建把AI SDK与Zod标为serverExternalPackages，
由OpenNext在下一阶段统一打包，减少跨服务端路由层重复代码。该调整的体积与运行结果
仍待新的云端构建和生产复测，暂未认定内存阻塞消除。
本机全量tsc因缺少已锁定的@opennextjs/cloudflare安装返回TS2307；
改动文件格式、脚本语法、工作流YAML和PR目标分支规则通过，完整类型与构建继续由云端检查。

以下章节为历史检查点，当前状态以上述生产验收记录为准。

## 2026-11-01 实际发布结果与权限补充

提交`d4d38a3`的标准CI与PostgreSQL工作流成功，Cloudflare构建和完整隔离运行检查通过。
实际平台发布在目标Worker的Secrets请求处返回`No access to the specified resource`；
对尚不存在的目标Worker进行一次不含密钥、统一503响应的初始化上传同样返回HTTP403。
平台服务列表仍为空，网站与自定义域名尚未上线。

账号持有人需要在Cloudflare的API令牌管理中编辑现有部署Token，授予当前部署账号的
Workers产品级`Admin`权限，以创建新Worker。域名绑定需要额外授予`weiyi.top`区域的
`Workers Routes Write`。权限范围限定到该账号及该域名，保存后使用原Token重新验证。
现有Worker可采用更小范围的`Editor`权限；首次创建需要产品级Admin。
依据：[Cloudflare Workers权限说明](https://developers.cloudflare.com/workers/authorization/workers/)。
Token值始终保留在忽略文件或加密Secrets中。

2026-11-01 13:26补充：用户新Token已解除403，目标服务初始化成功；实际Worker上传因
源码映射104472KiB超过60MiB限制被平台拒绝，部署列表为空。配置已设置
`upload_source_maps: false`；Wrangler4.150.0起该功能默认开启，详见
[官方变更说明](https://developers.cloudflare.com/changelog/post/2026-10-20-source-maps-on-by-default/)。
该开关影响部署时的堆栈源码映射，生产程序仍由同一OpenNext构建流程生成。

## 空闲调度与部署条件（2026-11-01）

宿主空闲调度使用现有后台任务的启动和停止接口。默认10分钟没有活跃HTTP请求且
队列元数据为空时暂停轮询；流响应在关闭、失败或取消前保持请求活跃。
未完成、等待确认或暂停的课程仍需资源保活，因而保持后台运行；材料提取、
旧课程导入、启动维护及正在执行的资产回收同样阻止暂停。
所有检查使用既有状态，训练状态和账本的权威实现保持原样。

暂停期间保留共享Pool对象，空闲连接沿用原生idle timeout释放；每30分钟通过alarm
调用原回收、压缩及旧课程导入入口。新请求串行恢复后台任务，维护冷启动结束后
可立即重新暂停；SIGTERM仍等待后台停止后关闭Pool。
`TEACHERLAB_IDLE_TIMEOUT_MS`、`TEACHERLAB_HEARTBEAT_MS`、
`TEACHERLAB_MAINTENANCE_INTERVAL_MS`可调整宿主时序，默认分别为600000、60000、1800000。
工作流采用较短时序，在隔离库中检查暂停后停止SQL轮询、维护、并发恢复和等待中课程保活。
当前实现的完整workerd与Linux结果以本次推送的Actions为准。

空闲调度降低空库持续活跃的用量；实际Neon自动暂停和Cloudflare生产CPU/内存仍须
部署后测量，持续任务与流量仍会消耗额度。本次发布按用户最新授权使用现有凭据，
通过受保护变量注入；实际平台部署、Neon TLS连接和域名验收各自记录结果。

## 已完成的构建检查点（bf08689，2026-11-01）

代码提交 `bf0868958dfb6210e0388a5170eaa3640eeaf337` 的
[Cloudflare validation](https://github.com/zaz52/TeacherScenarioLab/actions/runs/41253461735)
和 [Storage PostgreSQL Contract](https://github.com/zaz52/TeacherScenarioLab/actions/runs/41253461692)
已成功。完整 OpenNext 构建与 Wrangler dry-run 产物为 56150.58 KiB（约54.8 MiB），
通过64 MiB门槛；真实workerd图片操作、数据库顺序/并发/回滚及Durable Object后台SQL通过。
完整应用的16项账号、76项产品检查及50条文献详情请求通过，观测窗口内后台错误为0。
同一提交的[标准CI](https://github.com/zaz52/TeacherScenarioLab/actions/runs/41253461690)全部12个作业成功，
标准Next.js/Docker生产构建与16项容器检查通过，Chromium E2E为159通过、0失败。
CI与PostgreSQL工作流的测试执行汇总18919通过、0失败、774跳过，含跨作业重复执行，HTTP检查另计。

这些检查使用Ubuntu隔离PostgreSQL及本地workerd，平台上传、生产启动CPU/内存、
Cloudflare到Neon的TLS连接、真实供应商训练评价和域名逐页验收仍待完成。
目前生产凭据仍待轮换。2026-11-01公开查询中，`teacherlab.weiyi.top`的
A、AAAA、CNAME均为NXDOMAIN；部署及DNS变更尚未执行。

bf08689的免费容量尚未验收通过：当时后台任务持续扫描，宿主每分钟设置一次alarm。
Neon的100 CU-h月度额度在0.25 CU持续活跃30天时对应约180 CU-h的需求；
此值为持续活跃假设下的计算，实际消耗需以Neon用量为准。
空闲暂停需保留正在执行及等待确认的任务、资源保活、事件通知和维护任务，
并覆盖恢复、并发请求和故障重试测试。后续调度实现见本文开头，生产用量仍须实际测量。
额度不足时的上线门槛与供应商调用资格分别核验。

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

2026-11-01：10f6e01的OpenNext构建、54.9MiB体积门槛、账号16项和产品76项检查通过，
日志另发现原课程后台扫描跨请求I/O错误。完整应用改用单个SQLite Durable Object宿主，
入口固定对象ID，原生Pool与后台任务处于该对象的I/O上下文；业务数据继续落在PostgreSQL。
本机探针已验证跨请求连接与响应结束后的后台SQL，完整应用继续云端验收并检查后台错误。
训练存储及3处持久化模块的Pool导入恢复原值，原SQL、事务和权限保持原样。

依据[Durable Objects价格](https://developers.cloudflare.com/durable-objects/platform/pricing/)，
Free支持SQLite后端，每日10万请求及13000GB-s时长，超额操作失败；资源按账号共享。
[Neon Free](https://neon.com/pricing)包含每项目每月100CU-h，0.25CU持续活跃30天约180CU-h。
常驻轮询会影响数据库自动暂停，空闲调度与实际额度属于正式上线前的容量验收项目。
本机Windows预览可使用短路径`--persist-to F:/Codex/cache/teacherlab-worker-state`，
SQLite数据库及其WAL文件路径需满足本机文件系统限制。

2026-10-30 实际结果：提交b858937的标准CI、PostgreSQL、Next.js16.4.1生产构建、
Docker运行检查与159项浏览器回归通过。独立Workers构建失败于pg-cloudflare解析
以及sharp原生.node模块，Wrangler dry-run与workerd步骤尚未执行。该次失败属于
适配依赖/原生模块打包兼容性，日志未显示OOM。原文档/PDF/图片处理仍保留原实现。
Cloudflare线上六处页面和真实训练验收保持未通过状态。

以下为请求作用域方案的历史结果，当前入口已采用前述Durable Object宿主，
`lib/persistence/postgres-pool.ts`已移除，4处原生Pool导入恢复原值。

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
Webpack首次编译从storage聚合入口解析到浏览器未使用的服务端node:crypto；
Workers构建使用Next的`optimizePackageImports`拆分该入口，编译与完整运行继续复验。
类型检查暴露的路由辅助导出移至服务模块；persistence处理器保持原字节内容，
路由入口导出既有HTTP方法。相关权限、隔离、事件和存储测试沿用原断言。
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
