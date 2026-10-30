# TeacherScenarioLab 模型资源池

## 源码盘点与边界

2026-10-30 开工时 HEAD 为 `245179c`，PR #1 保持 Draft，目标为
`dev/teacher-scenario-lab`。对应 CI 与 Storage PostgreSQL Contract 均为 success。
工作区干净，现有12种语言、账号、情境管理、角色隐私过滤和评价证据校验已存在。

| 已有能力 | 权威源码 | 本次接入 |
| --- | --- | --- |
| 训练分槽位 | `lib/config/model-slots.ts` | 继续使用 `classroom.roleplay`、`classroom.evaluation` |
| 模型配置和适配器 | `lib/server/model-config/`、`lib/ai/providers.ts` | 资源池通过 `resolveModelReference`、`languageModelFor` 和 `callLLM` 建立受控调用 |
| 单次失败备用 | `lib/ai/llm.ts` | 资源池请求关闭隐式备用，候选模型逐个执行资格和预算检查 |
| 隐私与证据 | `lib/training/roleplay.ts`、`evaluation.ts` | 回复扫描、五维结构和教师消息引用在入库前校验 |
| 训练数据与身份 | `lib/training/server.ts`、`with-training-admin.ts` | 复用 owner 查询、管理员认证和训练事务 |
| 配置与部署 | `openmaic*.yml`、`.env.production.example`、`docs/` | 保留既有 preset；新增七家训练连接档案与管理页 |

现有原生 GLM、Google、OpenRouter preset 继续使用。Groq、Mistral、Cloudflare
Workers AI、NVIDIA 复用 OpenAI Compatible 协议；协议适配不需要 OpenAI GPT 密钥。
共享层增加可选的服务端 fetch 参数，训练调用使用现有代理与重定向校验工具。

## 官方政策核验

核验日期：2026-10-30。政策是目录和账号资格核验的参考；账号真实额度单独登记。

| 供应商 | 来源 | 免费条件与待核实项 |
| --- | --- | --- |
| GLM | [GLM-4.7-Flash](https://docs.bigmodel.cn/cn/guide/models/free/glm-4.7-flash)、[官方公告](https://www.zhipuai.cn/zh/news/148) | 原生端点的指定 Flash 零价格；限流与账号目录仍需实际验证 |
| Google | [价格](https://ai.google.dev/gemini-api/docs/pricing)、[限制](https://ai.google.dev/gemini-api/docs/rate-limits)、[条款](https://ai.google.dev/gemini-api/terms) | `gemini-3.8-flash` 有免费层；账号需确认未启用付费结算，实际 RPM/TPM/RPD 从 AI Studio 核对 |
| Groq | [模型](https://console.groq.com/docs/models)、[限制](https://console.groq.com/docs/rate-limits) | 免费计划按组织和模型限流；目录授权与账号计划分别验证 |
| Mistral | [创建 API 密钥](https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key)、[隐私](https://help.mistral.ai/en/articles/347617-do-you-use-my-user-data-to-train-your-artificial-intelligence-models) | Free mode 与账号权限、模型可用性需核验；免费数据使用政策需审核 |
| Cloudflare | [价格](https://developers.cloudflare.com/workers-ai/platform/pricing/) | 每日共享 10,000 Neurons，UTC 零时重置；部分模型要求付费方式，付费计划可能超额计费 |
| OpenRouter | [免费模型](https://openrouter.ai/collections/free-models/)、[限制](https://openrouter.ai/docs/api-reference/limits) | 训练中心接受 `:free` 模型；免费计划限制与失败请求计数需核验 |
| NVIDIA | [官方目录](https://build.nvidia.com/) | 最终托底独立授权，预算和价格上界齐备后可用；凭据存在不代表免费资格 |

目录内模型不能据此直接获得角色或评价资格。Cloudflare Neurons、Token、请求数
和美元额度保持独立单位；Token 不能无依据转换为 Neurons。账号额度未知时显示未知。

## 管理流程与数据来源

五个页面位于 `/training/admin/models` 及其 `providers`、`quotas`、`routing`、`logs`。
全部数据 API 复用训练管理员认证；写入要求 JSON、同源 Origin 与大小限制。
凭据由受保护环境变量或 deployment provider 提供，页面和调用元数据不返回密钥。

1. 刷新官方模型目录，选择精确 ID。GLM 官方文档列出的 `glm-4.7-flash`
   可执行受控测试，当前账号目录可能未列出它；目录 404 不触发猜名。
2. 填写已核实的免费计划、有效时间、额度类型、单位、重置与过期时间。
   选择“本地预算”时，数值表示本系统的人工调用上限；供应商余额继续保持未知。
3. 审阅隐私政策，确认使用虚构数据。未知账号计划、过期观测、付费候选和
   OpenRouter 非免费 ID 均不能进入普通训练池。
4. 运行角色六例或评价两例的真实资格测试。固定提示词覆盖家长、学生、校医、
   校长、连续对话和隐私诱导；评价检查五维结构、真实证据及分数波动。
   自动测试通过后的角色真实性和建议质量仍应由管理员阅读验收记录审阅。
   测试详情保存通过校验的固定虚构案例输出（超长输出明确标记截断）；
   拦截结果保留事实 ID，原始拦截文本保持不入库。
5. 自动顺序为合格免费额度（临期优先）、任务默认、合格备用、已授权 NVIDIA。
   手动路由继续经过免费、安全、任务资格、目录和预算检查。

额度来源分别为 official-api、admin-entered、local-estimate、unavailable。
当前目录适配器能读取模型清单；供应商余额接口未接入时，官方余额保持未知。
管理员观测时间后本系统所有预留请求均扣入本地估算，同账号其他应用的使用量
需要管理员重新核实。已配置的本地日/月预算按周期重置；供应商余额在重置后重新核实。

默认20%预警可修改；页面呈现低额度、过期、暂停、授权待核实、最近失败和调用时间。
调用记录保留状态、HTTP、失败分类、耗时与已返回的 Token 用量；缺失 Token 保持
未知。非流式请求的 TTFT 保持空值。性能表采用最近最多1000次真实请求样本，
P50/P95 是这些样本的描述统计；少量样本无法形成供应商优劣排名。

## 调度、安全与 PostgreSQL

数据库事务对供应商共享 RPM/TPM/RPD、并发、预算进行原子预留。失败请求与
Token 用量未知的请求保守保留预留量。NVIDIA 同时检查授权、单次预算、每日预算
和输入输出价格上界。预算为本系统按配置计算的约束，账号侧仍应设置硬支出上限。

每场训练的每个任务有独立租约；角色模型成功后写入训练事件，后续轮次固定。
切换成功后 `model-switched` 与角色消息在同一训练事务提交，学员看到切换提示。
角色上下文继续来自现有角色过滤、训练状态和披露引擎；其他角色私有事实和
未披露隐藏事实保持原边界。评价独立固定与调度，原始消息 ID 继续作为证据锚点。

429 检查正文与 Retry-After，分别标识请求/Token/每日限制、未知限流和额度耗尽。
1305 记录临时限流，1113 记录账号资源不足。临时限制冷却后恢复；401/403/404
停用对应候选并保留管理日志。5xx/网络/超时最多重试一次，再进入合格候选。
评价 JSON 允许一次重新生成；证据错误、隐私泄露及内容安全拒绝终止请求。
所有原有写入校验仍在；失败请求不创建成功角色消息或评价。

Google 免费层可能用于产品改进和人工审核。输入仅允许虚构情境，敏感个人数据
通过检测时拒绝外发。文本检测无法证明任意自然语言已完全匿名；上线前需对
自建情境和使用规范进行隐私审阅。未来情境创作、复盘建议和文献辅助尚未接入
资源池，接入时需要新增业务资格与服务调用，现有页面不声称具备这些能力。

## 验收与发布

单元测试分开验证费用、防绕过、分类、重试和评价修复；PostgreSQL 测试验证
多进程预算、租约、真实训练事务、固定模型、隔离和失败写入。模拟传输测试
清楚标记为 mock；真实供应商验收单独保存结果与外部阻塞。

CI 保留原权限与目标分支触发规则，PG 工作流显式纳入新增合约文件。浏览器测试
覆盖管理页、额度保存和未授权拦截。当前 PR 保持 Draft，验收完成前不合并或部署。
