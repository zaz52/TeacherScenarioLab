# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### TeacherScenarioLab 新人指引自动跟随定位（2026-11-03，Asia/Shanghai）

- 用户要求指引进入哪一步就自动定位哪一步。移除手动定位按钮，打开、前后切换和目录选择均触发自动页面导航、区域滚动及持续高亮，步骤切换或关闭时清理定位与观察器。
- 情境、记录和事件按步骤自动切到对应分区；首页自动切回实训模式。登录、训练室、语音、进度、复盘和列表使用专门锚点，目标异步挂载后继续跟随，指引面板按目标位置调整上下位置。
- 训练与复盘定位基于当前账号实际记录；优先保留当前可用训练，复盘限定已保存评价。缺少前置记录时定位创建入口或训练记录，并显示等待说明。导航过程保持指引步骤，沿用原账号权限，指引不提交训练消息或生成评价。
- 功能、浏览器及模型测试继续由用户执行；改动文件格式、生产构建与部署状态另记交付记录。

### TeacherScenarioLab 删除恢复、训练归组与新人指引（2026-11-03，Asia/Shanghai）

- 用户要求情境列表和训练记录支持删除、训练过程归组折叠，并提供逐步介绍网站功能的新人指引。
- 新增按账号隔离的“移至已删除”和恢复接口及确认弹窗，情境在当前账号的列表与实训选择器同步移除；训练从记录、趋势与事件中心同步移除，恢复后重新计入。发布冻结版本、消息、评价与权威事件账本保留。原账号schema初始化锁新增兼容的teacherlab_library_removed表，原表与数据保留。
- 训练记录按情境/版本折叠归组，每组先显示5条；事件中心每次训练汇总成一张折叠卡片，含时间、事件数与发言数，展开后每批20条，保留搜索及训练筛选。
- 新增全站常驻新人指引、首次访问提示、步骤目录、前后导航及定位高亮，覆盖注册登录、情境选择、实训设置、模型、对话与语音、助教/阶段反馈、正式评价、复盘、记录、事件、知识库、设置及按权限显示的管理功能。文案提供简体中文与英文回退，沿用既有语言资源结构。
- 功能、单元、E2E、浏览器和模型测试按用户要求执行数0；格式、生产编译、部署连通结果另记交付报告。删除采用可恢复的个人列表管理，站点全局发布情境的冻结与管理权限保持。

### TeacherScenarioLab 智能路由与站点模型编辑（2026-11-03，Asia/Shanghai）

- 用户反馈默认模型不可用、Magpie模型列表过长及服务器供应商无法编辑。核对生产配置DEFAULT_MODEL为glm:glm-4.7-flash；独立训练资源池的固定OpenRouter路由已脱离有效策略，其他候选存在资格失败或额度确认过期。Magpie原配置有AMD七模型、无路由组。
- 首页显示统一智能路由入口，个人指定模型收起至设置维护；默认实训槽位接入受保护Magpie组，沿用原模型适配器、消息账本、输出及评价证据验证。Magpie smart组按可用成员调度，故障和限额切换由现有网关实现。
- 模型服务新增所有者专用站点供应商编辑入口，支持密钥替换、API地址及模型清单增减；全局覆盖加密保存于已有模型控制表，写入采用版本检查并撤销旧资格。普通用户个人模型及受委派管理员权限沿用。
- 功能、模型生成及故障注入验收由用户执行，本轮不重复已失败供应商请求。生产构建与部署结果另记发布报告。当前Magpie七模型共用AMD凭据，其费用与共享额度未确认，无法承诺全供应商均耗尽后仍可成功。

### TeacherScenarioLab 四类知识库与家校沟通设置（2026-11-03，Asia/Shanghai）

- 用户要求新增助教、助评、家长和疫情沟通场景知识库，每类50条，中外期刊兼收；追加图片反馈要求家长类型、年级和聊天方式可选，家校沟通默认面向家长。
- 新增200张带独立文献出处的知识卡，原50篇和ID保留。196条DOI题录经Crossref核对，4条中文文献以原刊/机构页核对；199条具有公开核心/SCIE/SSCI收录依据，目录版本在界面标明，1条收录状态待单独核验。实训建议为编辑整理，全文证据审阅边界随详情展示。
- 首页原对话框新增12个年级、50种组合家长画像、私聊/电话练习/群聊与情境重点。设置和训练创建在同一事务写入事件账本，重复训练复制其原设置；原发布版本、数据与引擎沿用。家校沟通筛选家长，综合情境保留学生。
- 助教按已保存消息检索待复核措辞、给出参考说法和阅读依据；助评每10轮完整互动显示带原消息锚点的规则辅助五维阶段反馈。正式模型评价继续走原证据校验及保存流程。群聊提示词按公开事实组织，输出继续经过原信息泄露扫描。
- 涉及知识数据与检索页面、原引用服务、实训设置/支持接口、首页/实训/复盘组件及12种语言键；新增文案使用中文和英文回退。功能、单元、E2E、浏览器及真实模型调用验收由用户执行，代理执行数0；编译与生产构建状态另记交付报告。详见docs/knowledge-base.md。
- 本地全量TypeScript检查因现有依赖安装缺少Next、Vitest、sharp等模块返回退出码2；生产构建交由GitHub完整依赖环境核验，此本地检查保留为未通过记录。
- 源码审阅补齐综合情境的群聊角色背景，按实际选中角色交流；实训设置摘要明确标注训练范围及家长画像。

### TeacherScenarioLab 反向代理共享模型保存修复（2026-11-03，Asia/Shanghai）

- 共享模型连接保存实际返回403，原Origin比较受Cloudflare后内部HTTP地址影响。复用现有同源JSON请求校验，管理员权限、请求大小、模型与地址限制继续沿用。
- AMD真实模型目录返回HTTP200，Magpie已配置7个文本模型；个人模型连接已保存。生成、评价、密码及邮件功能验收由用户执行，代理功能测试执行数0。生产构建与最终发布状态记入交付报告。

### TeacherScenarioLab 训练历史、独立登录与 Magpie 网关（2026-11-03 05:34，Asia/Shanghai）

- 用户要求整理训练记录、事件中心，接入VPS统一模型网关，并补充独立登录与密码登录。训练历史展示情境名称、状态、评价摘要、继续训练和复盘入口；没有评价时显示未评价，事件使用中文时间线，技术ID收进详情。
- 记录和事件按账号及当前分区懒加载，取消过期请求、校验数据所属账号，并同步URL分区，修复登录后未重新加载。
- 新增 /login、/register 和密码登录接口；邮箱验证码与8–128位密码完成注册后前往登录。保留已有邮箱验证码登录及原账号绑定，验证码重设密码时撤销该账号旧会话。密码使用随机盐scrypt哈希，按邮箱和IP限制尝试、限制哈希并发，新增独立密码和尝试表，沿用schema锁兼容初始化。
- 新增资源受限的Magpie Docker配置与鉴权OpenAI兼容代理，上游固定为项目私有网关，限制路由、模型前缀、请求体和输出长度，保留全局SSRF限制。凭据使用受保护配置，VPS容器状态另记报告。
- AMD需通过站内模型服务安全保存供应商Key后完成目录及统一入口接入。未将尚未完成的配置或生成调用标为通过。
- 功能、单元、E2E、浏览器、密码/SMTP验收及模型生成调用由用户操作，本轮代理执行数0；生产构建和发布另记报告。新增文案使用中文和英文回退，原训练引擎、账本及管理员权限沿用。

### TeacherScenarioLab 情境编辑页统一后台样式（2026-11-03 04:16，Asia/Shanghai）

- 同轮后台设计补齐情境新建、编辑页：接入统一标题、表单控件、角色与事实分区、手机端单列布局，并同步按情境管理权限展示编辑器。
- 涉及 training-scenario-editor.tsx、admin-console.css；原保存接口、草稿校验与版本冻结逻辑沿用。补齐移动端统计条奇数项布局。
- 用户保留功能验收，单元、浏览器、E2E及模型调用测试执行数0；使用最终提交的生产镜像交付。

### TeacherScenarioLab 后台界面与分级授权（2026-11-03 04:05，Asia/Shanghai）

- 用户要求重做后台 UI，验证码邮件由本人管理，并可选择其他管理员能使用的功能。保留现有设置入口，后台使用统一标题、分区面板、成员搜索、权限勾选、状态与记录详情；手机端使用分区选择，表单自适应，宽表格在独立容器滚动。
- 站点所有者独占验证码 SMTP 配置读取与修改、授予或撤销管理员、分配权限。所有者取受保护环境变量 TEACHERLAB_OWNER_ACCOUNT_ID，未设置时兼容 TRAINING_ADMIN_ACCOUNT_IDS 首项；服务端同时要求有效用户会话和管理员角色。
- 新增5项可委派模块：情境管理、训练抽查、文献检查、共享模型管理、人员管理。默认空授权；现有委派管理员需由所有者显式分配。权限保存在新增独立表 teacherlab_admin_permissions，现有训练表和历史数据沿用。
- 设置导航、首页情境创建、后台各 API 同步校验模块权限；人员管理可添加与启停普通成员，授权与管理其他管理员仍由所有者完成。撤销管理员清空其模块权限，变更写入原审计表；后续请求实时读取授权。
- 涉及 components/settings、账号权限服务、管理包装器、会话响应与文案、部署说明及环境变量模板。训练服务端状态机、消息账本、披露与模型引擎沿用。功能、单元、E2E、浏览器、模型调用测试执行数0，按用户要求由用户验收；生产构建与部署结果另记交付报告。新增文案采用中文和英文回退。

### TeacherScenarioLab 角色默认名称与可选显示名称（2026-11-03 03:12，Asia/Shanghai）

- 用户要求学生、家长、老师等角色默认显示类型，姓名改为可选自定义。首页下拉框、训练大厅与实训室消息标签统一使用角色类型，实训室侧栏移除原始姓名的默认展示。
- 首页与实训室新增自定义角色名称入口，覆盖当前情境全部角色，支持逐项填写和清空后保存；名称按账号、情境及版本保存在当前浏览器，首页和实训室共用。界面明确显示名称与原情境人物设定的范围，存储失败显示错误。
- 涉及 character-presentation.ts、role-name-settings.tsx、epidemic-composer.tsx、training-room.tsx 和12种语言文案（其他语言使用英文回退）。权限、训练后端、模型提示与事件账本沿用。
- 功能、单元、浏览器、E2E及模型调用测试由用户执行，本轮执行数0；生产构建与部署状态另记工作区交付报告。

### TeacherScenarioLab 实训室交互与情境创建（2026-11-02，Asia/Shanghai）

- 角色统一展示类型与姓名，使用“学生 · 小雨、家长 · 乐乐妈妈”等标签，角色头像与选择对应。
- 实训室补齐场景简报、角色侧栏、消息气泡、输入与发送、显式启用浏览器语音输入和浏览器朗读、阶段推进、已披露信息和五维评价证据定位。created 状态允许输入，首次发送复用现有 start 接口；模型失败保留已落账消息，提供单独重试回复与显式脚本切换。
- 管理员可按公开背景与学生、家长、教师化名生成结构化草稿，确认后使用现有发布接口冻结版本。新情境的通用角色包仅包含公开背景与安全脚本，原角色包、提示事实筛选、信息扫描、状态机、幂等及事件账本继续使用。
- 按用户要求，本轮功能测试和模型调用测试留给用户；生产构建与部署结果记录于工作区交付报告。

### TeacherScenarioLab 恢复原首页并接入疫情实训（2026-11-02，Asia/Shanghai）

- 用户明确要求沿用原首页 UI 并融合训练功能。恢复原渐变背景、标题、头像胶囊、中央输入框、模型栏、语音与设置，疫情实训和课程学习共用原页面。
- 原输入框连接现有训练创建接口，情境、对话角色与模型在输入框内选择；开场内容作为待发送草稿带入训练室，保持原简介与状态推进流程。
- 情境卡片选择后回填同一输入区域；已增加的邮箱账号、人员权限、个人模型与管理员设置保留。匿名首页展示原 UI，操作时引导登录，课程后台列表订阅按模式与登录状态启用。
- 按用户要求，功能测试由用户执行，本轮继续使用生产构建交付模式；构建和部署结果记录于工作区交付报告。

### TeacherScenarioLab 统一疫情实训与邮箱账号（2026-11-02，Asia/Shanghai）

- 首次生产编译定位到课程页迁移后相对 CSS 路径失效，修正为原样式文件的绝对别名引用；补齐疫情情境同事教师的个人角色模型选项。构建失败属于编译依赖路径问题，功能测试执行数为 0。

- 用户要求统一原首页与训练入口，主题围绕疫情开展。首页提供校园疫情实训、训练记录和复盘入口，原课程生成迁至辅助入口，设置共用原设置窗口。
- 新增邮箱验证码注册、登录与原账号绑定，复用现有服务端会话。验证码哈希存储、过期、次数与频率限制，SMTP 授权码通过现有密钥盒加密；管理员可在站内配置 QQ、163 或企业邮箱 SMTP。
- 新增人员管理：预建邮箱账号、授予或撤销管理员、停用或恢复账号与审计记录。新注册默认普通用户，初始化管理员受保护。
- 全部登录用户可通过原模型设置维护个人供应商、自定义 API、密钥与模型，并选择训练角色和评价模型；个人设置按 owner 隔离，训练输出继续经过原验证器与信息隔离规则。
- 按用户要求，本轮功能测试交由用户执行。手动交付增加构建模式，使用 `run_account_checks=false` 跳过运行、浏览器及其他测试步骤；正常 CI 入口保留。构建、部署与用户验收分别记录实际结果。

### TeacherScenarioLab 账号创建入口修复（2026-11-02，Asia/Shanghai）

- 用户反馈找不到创建账号；首页账号标签原先显示匿名提示，创建表单缺失。补齐显示名输入、创建按钮、提交状态和失败重试，创建成功后使用现有会话接口展示账户 ID；后端身份与管理员授权机制沿用。
- 补齐 12 种语言的三项账号表单文案，增加浏览器表单失败恢复、创建账号、会话刷新保留、管理权限和登出定点回归。
- CI 增加功能分支手动账号定点检查，复用现有生产镜像构建、运行验证和校验和 Artifact。正常 PR 与集成事件的检查保持；本次提交跳过自动批量检查，随后手动执行账号回归与镜像任务。
- 生产访问码保持关闭；本轮网站发布结果和实际检查数据另记于工作区上线验收记录。
- 首轮账号浏览器检查已完成创建与 ID 展示，随后 HTTP 测试客户端未携带 Secure Cookie 导致权限断言返回401；会话与权限断言改由浏览器发起，403标准保留。专项镜像缓存采用最小上传范围，常规构建保持原设置。

### TeacherScenarioLab 1GB VPS 接入准备（2026-11-02，Asia/Shanghai）

- 用户提供已创建的 teacherlab-vps Tunnel Token；密钥以受限本地文件接收并通过 SFTP 保存至主机只读挂载，UID 65532、权限 400。cloudflared 已启动、配置自动重启并建立 4 条新加坡连接，原 x-ui/xray 运行正常；监控绑定本机。
- 批量准备 VPS Compose、现有 CI 镜像导出和部署/恢复说明。镜像沿用已验收 runner，新增功能分支树匹配、镜像 ID 和 SHA-256 清单，Artifact 保留一天；生产变量与模型密钥在部署机注入。
- 当前源站 3000 尚未启动，Cloudflare 管理 API 对隧道详情返回 401、DNS 返回 403，现有域名仍绑定原 Worker；网站迁移和最终容量验收待实际完成。
- 用户提供部署主机并授权继续部署；SSH 登录成功，实际核对 Debian 12、2 核、972MiB 内存、约 17GB 可用磁盘，原有 x-ui/xray 服务及端口记录保留。
- 按 Docker 官方 Debian 安装源完成 Engine 与 Compose 安装，新增项目专用 1GiB 交换文件及持久化项；原有 x-ui 服务仍 active，原监听端口保持。应用镜像交付与完整运行验收尚未完成。
- 现有 Cloudflare Token 读取隧道成功，新建隧道及读取 DNS 实际返回 403；用户选择手动配置。隧道 Token 本地保护文件已准备，域名与 DNS 尚未切换。
- 用户控制台界面与说明不同；浏览器导航超时后，电脑操作工具因无法可靠确认 Windows 当前网址而停止。后续按用户页面截图定位入口，镜像与域名验收继续记录实际结果。

### TeacherScenarioLab 长模型资格请求的连接保活（2026-11-01，Asia/Shanghai）

- 799a0a4 的 CI、PostgreSQL 与 Cloudflare 三项检查全部成功，冷启动等待修正版已发布；线上并发与完整页面复测单独记录。
- 长角色资格请求发生客户端断开，三个真实调用已落账但完整资格尚未更新。资格响应超过 15 秒后发送 JSON 合法空白保活，最终完整结果仍由原资格函数产生；快速拒绝继续通过原错误处理返回。
- 管理后台等待完整 JSON 后刷新资格；长操作失败时响应流失败，失败资格保持 passed=false。权限、同源校验、调用预算、信息扫描和资格标准沿用。
- 保活、快速错误、长操作失败、取消清理与管理 API 回归合计 14 通过、0 失败；新增代码定点 TypeScript、ESLint 和格式检查通过。云端与真实六用例资格仍待新版本核验。

### TeacherScenarioLab 前端冷启动并发检查（2026-11-01，Asia/Shanghai）

- 7e728a3 的单元与 Workers 集成通过，云端 TypeScript 发现新增启动函数漏补配套 .d.mts 导出，门禁继续拦截发布；补齐声明并定点核对新测试的类型。
- fb8e1d9 的三项 GitHub 工作流成功，18981 项测试执行通过、0 失败、776 跳过（含跨作业重复），162 项 E2E 通过；新模型管理功能已实际发布，前端版本 e1622842、训练接口版本 7d5cca1b。
- 生产 /api/model-config 曾返回 500，平台日志确认前端 Durable Object 内存超限；同次冷启动包含 HTTP 请求与定时维护。后续配置、健康与首页请求恢复 200，内存稳定性继续列为未通过。
- 前端 HTTP 与定时维护共用启动等待，启动失败传递给全部等待者并允许后续重试；保留原健康检查、请求计数、空闲维护及业务处理函数。并发启动、失败重试与现有生命周期回归 22 通过、0 失败；生产复测待新版本发布。
- 生产自定义 HTTPS API 和密钥保存成功，真实评价已有 HTTP 200 调用落账；完整资格仍待长用例结束。免费角色模型仍在校医用例被信息扫描拦截，保留失败资格与安全检查，尚未完成真实训练评价全流程。

### TeacherScenarioLab PostgreSQL 并发验收修复（2026-11-01，Asia/Shanghai）

- ecb274d 的 CI 全部通过，Cloudflare 生产构建、公网 DNS/私网拒绝预检与双服务产品集成通过；发布门禁因 PostgreSQL 合约失败而停止。
- PostgreSQL 合约的 394 项应用断言通过，但并发额度测试延迟接收预期拒绝，Vitest 报未处理异常。测试改为启动请求时立即接收拒绝，保留锁等待、额度错误类型和最终入库数量断言；生产额度实现与迁移沿用。
- 本地 PostgreSQL 16 定点回归 9 通过、0 失败、0 跳过，未出现未处理异常。新提交的云端完整检查和正式发布结果待核验。

### TeacherScenarioLab 云端凭据提示与网络诊断（2026-11-01，Asia/Shanghai）

- 6eeb947浏览器验收161通过、1失败；失败来自新断言同时选中页面错误提示和Next路由播报器，已按错误文本收紧定位。新8a15b1b的Linux workerd公网DNS/私网拒绝预检已通过，继续执行完整构建与集成。
- 新workerd预检复现明确根因：运行时不支持fetch的redirect:error；DoH改用manual并拒绝全部非2xx，补充302私网目标拒绝回归。相关22项检查通过；Windows外网fetch另报内部网络错误，保留失败证据并交由云端独立核验。
- 6eeb947的PostgreSQL合约通过，CI单元分片发现新密码输入缺少共享CredentialStorageHint；补回统一加密存储提示，相关22项回归通过、0失败。
- Cloudflare产品回归在自定义连接保存时实际返回409，发布门禁保留阻断。增加固定原因码区分地址、DNS、实例密钥、版本冲突和换址密钥要求，返回内容不包含凭据。
- 把公网DNS查询/私网拒绝的workerd预检提前到生产构建之前，使用现有测试Worker目录与停止机制；集成失败的响应记录限制长度并使用隔离合成凭据。此次未宣称自定义API已上线通过。

### TeacherScenarioLab 已知流程文本的扫描误报修复（2026-11-01，Asia/Shanghai）

- 真实角色资格在校医用例反复命中fact-principal-decision；源码确认校医自身已知资料和校长资料重复包含“需上级部门决定”。原扫描将已提供给说话者的同一政策片段当作新增泄露。
- 扫描增加服务端已知事实参数，来源限定为公开、本人专属和权威披露集合；共享片段按实际已知内容判定，其他专属片段和完整未知陈述继续检查。运行前后两次扫描与资格用例使用一致来源，原可见性、披露条件、状态机、事件与事务逻辑沿用。
- 新增重复政策、其他专属/隐藏内容继续拦截及PostgreSQL双扫描后消息/角色事件保存回归；训练测试245通过、0失败、0跳过。线上真实资格需在修正版发布后重跑，历史失败记录保留。

### TeacherScenarioLab 模型管理表单回归（2026-11-01，Asia/Shanghai）

- 编辑已有连接时将展示字段与提交载荷分开，提交符合严格API结构；省略密钥可保留原加密值。
- 新增三项Playwright浏览器回归，覆盖自定义表单密码输入、保存后清空密钥及再次编辑、按角色选择保持评价与其他角色设置、403时编辑入口不可用。使用明确标记的模拟API，真实后端与供应商验收分别记录；测试发现3项，执行结果待云端核验。

### TeacherScenarioLab 自定义模型与角色路由（2026-11-01，Asia/Shanghai）

- 管理员可登记自定义HTTPS API、独立密钥、协议及模型ID，复用OpenMAIC设置校验、AES-GCM密钥封装、模型解析与callLLM；连接使用独立custom命名空间，保留现有预设。Mistral从本次资源中心必需供应商列表移除。
- 密钥与审计分开保存，浏览器响应不返回密钥；改地址/协议要求重新输入密钥。连接采用版本比较写入，修改后暂停关联策略并清除旧资格；模型注册与真实资格验证分别记录，手工模型清单不生成供应商HTTP成功记录。
- 后台增加自定义连接表单及情境角色模型选择，角色对话按characterId保留选择记录，管理员新路由作用于后续请求，评价独立。付费自定义模型须明确授权及双预算，通过资格后可手工选用，自动免费回退不纳入付费自定义候选。
- 12种语言增加11个对应标签。训练测试242通过、0失败；DNS适配及原SSRF/重定向回归86通过、0失败。新增协议映射断言曾1项失败，核实原预设映射到openai后修正并复测通过。
- Workers DNS适配使用官方DoH接口查询A/AAAA，保留原公网判定；Node沿用系统解析及原连接地址固定机制。当前Windows workerd原生DNS报EBADQUERY，公网DoH本地集成尚待验证，云端双服务回归增加真实公网地址注册和权限/密钥脱敏检查。
- 1521db2的CI、PG与Cloudflare均成功并实际发布。生产免费OpenRouter角色资格2例通过后因信息边界失败，GLM免费型号限流，Google评价网络失败；真实资格与训练评价全流程继续列为未通过，PR保持Draft。

### TeacherScenarioLab 训练接口运行隔离（2026-11-01，Asia/Shanghai）

- 3232165的三项GitHub工作流成功，生产真实模型资格仍触发128MB宿主内存超限，平台tail证据保留。
- Cloudflare入口将训练请求通过私有Service Binding转发到独立TrainingApiHost，复用29个原有路由、原访问码中间件与原NextRequest/NextResponse；训练核心与业务处理函数沿用现有实现。独立包预构建约8.7MB，正式运行内存需云端验收。
- 发布按私有API服务、前端的顺序注入受保护环境变量；API服务关闭workers.dev及预览URL。CI增加独立包dry-run，并在双服务本地workerd环境执行现有产品回归。
- 本地独立PostgreSQL库通过账号、管理员、情境导入发布、owner隔离、管理403、脚本训练、消息幂等、状态/事件账本、无模型评价拒绝与50条文献详情检查。路由及空闲生命周期回归18通过、0失败；云端结果另行核验。
- 用户确认自定义API地址/密钥/模型ID与按角色选模需求；站内管理员账号ID稍后提供，Mistral退出本次验收必需清单，现有供应商预设保留。

### TeacherScenarioLab 后台执行依赖延迟加载（2026-11-01 14:40，Asia/Shanghai）

- 3c6d4e5的CI、PostgreSQL与Cloudflare三项工作流全部成功，18950项测试执行通过、0失败、774跳过（包含50项离线合约与跨作业重复）；159项E2E通过。生产Docker构建及数据库运行检查通过，修正版已实际发布到teacherlab.weiyiai.top，版本a67f14b9-7d09-4a5f-a30c-c46fe2a23780。
- SDK去重使Workers上传从56178.60降为54314.29KiB、启动21ms；生产GLM实际请求返回HTTP429并按失败落账，Google评价上游HTTP503，OpenRouter角色单次HTTP200但完整资格套件仍因宿主内存重启中断。完整模型验收继续阻塞。
- 空课程队列的轮询改为领取任务并启动心跳后加载原engine与默认services；材料轮询把解析实现和课堂错误类型的依赖延迟到实际工作路径。原执行函数、SQL、租约、状态、存储和训练后端保持当前实现。
- 增加空队列依赖加载与模块加载期间心跳的回归，并验证材料调度器加载时不引入文档执行依赖。首轮本地回归读到私有模型配置，30失败/14通过；在D盘不含私有配置的同版源码副本中复测，45通过/0失败，ESLint与改动文件格式通过。原私有配置完整保留。

### TeacherScenarioLab 生产域名绑定与实际验收（2026-11-01 14:05，Asia/Shanghai）

- 用户最终确认teacherlab.weiyiai.top，已成功绑定当前账号weiyiai.top区域的teacher-scenario-lab Worker；Wrangler自定义域名、页面metadataBase与环境模板同步此域名。
- 34cd18f的三项GitHub工作流成功，标准Docker/Next与OpenNext生产构建完成；平台实际发布成功，上传56178.60KiB、启动25ms。云端测试执行汇总18950通过/0失败/774跳过（跨作业重复另计），159项Chromium E2E通过。
- 生产六处页面及健康接口HTTP200、50条文献详情通过；管理员初始化、情境v1导入发布、创建训练、脚本对话、消息幂等与普通账号管理API403通过。生产验收账户和训练记录保留，密钥与会话均存于忽略文件或受保护变量。
- 根据生产内存失败与构建中重复大块的证据，Workers构建将AI SDK与Zod留到OpenNext统一打包，减少Next服务端路由层重复依赖；标准Node构建依赖策略沿用原配置。体积变化与生产复测待本次工作流验证。
- 真实模型资格验证触发Cloudflare宿主128MB内存上限，tail确认isolate重启；GLM和OpenRouter资格未通过，实际评价保存及五维证据验收仍阻塞。初次文献500证据保留，完整域名复测通过；生产浏览器操作验收因工具超时尚未完成。PR继续Draft，合并待批。

### TeacherScenarioLab 源码映射上传限制（2026-11-01 13:26，Asia/Shanghai）

- 用户提供新部署Token，已通过隐藏输入更新忽略文件并同步GitHub加密Secrets。账户API、workers.dev子域和目标资源查询正常，原403授权阻塞解除；新凭据可见7个原有服务。
- 8da55e4第二次Cloudflare运行通过生产构建与完整隔离验收，静态资产2432个上传成功；Worker发布被平台以10021拒绝，原因为源码映射104472KiB超过60MiB上限。目标服务已初始化，部署列表为空；网站未上线，数据库与DNS未在本轮改变。
- 在Wrangler配置中显式设置upload_source_maps=false，采用官方开关关闭源码映射上传。Wrangler4.150.0起默认上传源码映射，部署脚本及业务实现保持当前版本；后续平台发布结果另行核验。

### TeacherScenarioLab 平台发布权限核验（2026-11-01 10:00，Asia/Shanghai）

- d4d38a3 的标准 CI 与 PostgreSQL 合约成功；159 项 E2E、生产 Next.js/Docker 镜像及容器数据库检查成功。Cloudflare 构建、56178.65KiB 体积门槛、账号/产品/50条文献详情和空闲暂停、维护、并发恢复检查通过。
- 工作流已使用用户授权的现有凭据实际尝试发布；目标 Worker Secrets 请求返回 `No access to the specified resource`。随后对不存在的目标 Worker 执行一次不含密钥、统一503响应的初始化上传，平台同样返回HTTP403；未创建服务，域名与生产数据库均未在本轮改变。
- 部署入口关闭Wrangler磁盘日志，并沿用CLI的OpenNext递归保护标记，直接上传已验证的自定义宿主产物。发布权限需由账号持有人补充：首次创建需要Workers产品级Admin；自定义域名需要限定到weiyi.top的Workers Routes Write。PR保持Draft，合并待批。

### TeacherScenarioLab Workers 空闲调度（2026-11-01，Asia/Shanghai）

- 用户明确要求使用此前凭据继续部署，撤销本次部署前置轮换要求。现有凭据通过sealed-box写入该仓库Actions Secrets；部署按一次性的精确SHA变量授权，先等待同一提交CI与PostgreSQL成功，再由已通过workerd验收的Linux产物执行Wrangler发布。PR继续保持Draft，域名指向确认与线上结果另行记录。
- dd41f95的三项工作流已全部成功。发布前Cloudflare凭据只读验证为active、账号服务数0；用户随后明确授权本次复用现有凭据。平台上传与域名验收结果按实际运行补记。
- 为Neon免费容量增加宿主空闲调度：默认10分钟无请求且无后台工作时暂停轮询，每30分钟沿用原维护入口执行回收与压缩；请求恢复后台任务。流响应、执行中/等待确认的课程、材料提取、旧课程导入、启动维护及资产回收纳入保活判断，训练API、权限、账本和迁移保持原样。
- 新增串行暂停/恢复与故障拦截、只读队列元数据查询、维护和流生命周期测试；本地相关回归127通过/1失败，失败为Windows目录POSIX权限断言，断言保留。隔离PostgreSQL的38项队列状态检查通过，测试事务已回滚；ESLint与YAML检查通过，完整workerd和Linux回归由本次推送的工作流验收。

### TeacherScenarioLab Workers 路由构建契约（2026-11-01，Asia/Shanghai）

- bf08689的CI、Cloudflare与Storage PostgreSQL工作流全部成功，标准Next.js/Docker生产构建及16项容器检查通过，完整Workers应用后台错误观测为0；Workers产物56150.58KiB，16项账号、76项产品及50条文献详情检查通过。云端测试汇总18919通过、0失败、774跳过，含跨作业重复执行；Chromium E2E为159通过、0失败。原训练API、服务端存储、迁移及82个受保护文件与9a990da一致，指定24个删除文件核对通过。
- 文档补充当前可验证检查点、请求作用域旧方案的历史标记及Neon持续轮询容量缺口。正式平台部署、生产凭据轮换、免费容量和真实模型评价仍待验收；2026-11-01公开域名查询仍为NXDOMAIN。
- 10f6e01的三项工作流成功：Workers未压缩包56246.18KiB，16项账号及76项产品检查通过；运行日志另发现原课程后台任务跨请求数据库错误，整体上线继续阻塞。改用单个SQLite Durable Object宿主验证现有Next后台任务，4处Pool导入恢复原值，增加后台错误门槛。
- 本机workerd探针确认Durable Object的跨请求连接与响应结束后后台SQL成功。首次探针遇到Windows SQLite长路径错误，状态目录缩短后通过。免费账号能力及Neon空闲轮询用量继续核验，尚未上传平台资源。
- 本地广泛回归首轮891通过、4失败；相同断言串行复测96通过、0失败，消除了两项超时及一项日志断言失败。Windows POSIX文件权限断言仍按失败记录；Linux全仓单元、类型、格式和PostgreSQL合约通过。
- 458e072的标准CI与Storage PostgreSQL工作流成功；Cloudflare工作流因8个路由的辅助导出未满足Next入口类型契约失败。
- 修复后静态核查111个路由，非法导出为0；persistence处理器迁移前后内容一致。改动文件格式与目标ESLint通过，权限、身份、事件流和存储回归继续按实际执行结果记录。
- 本地隔离验收库从环境中断恢复，日志移至数据目录外，原数据保留。生产凭据仍待用户轮换；实际部署要求已收到，Workers平台限制、生产连通与上线验收继续作为部署前置条件。

### TeacherScenarioLab 免费 Workers 兼容适配（2026-10-31，Asia/Shanghai）

- Webpack聚合导入问题消除后，类型检查发现8个既有路由导出额外辅助成员。流轮询常量迁至服务端共享契约、批量场景上限沿用stage-limits模块；无外部调用的辅助成员改为模块内声明。persistence处理器逐字节迁至lib/persistence/request-handler.ts，HTTP入口保留原方法导出；相关测试改从服务模块导入，行为断言保留。
- 29f5e8的Webpack构建发现浏览器从storage总入口解析到未使用的服务端node:crypto，属于编译依赖边界问题。采用Next官方optimizePackageImports对storage入口按导出拆分，继续原断言复验；原库及客户端业务源码保持原样。
- c9f7903压缩后92113.05KiB仍超64MiB，体积门槛按失败记录；16项账号与76项产品检查继续通过。诊断显示多份重复服务端大块，Workers专用构建改用Webpack并沿用图片入口映射，继续云端比较体积及运行回归。
- 核对Cloudflare2026-10-29官方限制后确认Workers未压缩包上限64MiB；1a7cba2的128060.41KiB dry-run产物超限，开启Wrangler压缩并增加实际上传体积门槛与依赖体积诊断。平台上传、启动/CPU和免费账号能力继续独立验收。
- 1a7cba2的Cloudflare工作流通过：完整OpenNext构建、Wrangler dry-run、真实workerd图片/PostgreSQL检查及应用目录3次并发和3次连续请求成功；Storage PostgreSQL工作流通过。主CI的供应商中立守卫发现pg旧计数，按实际移除的1处导入将12缩减为11，继续复验。
- Workers独立数据库增加合成情境和账号验收，覆盖访问码、会话隔离、脚本对话、消息幂等、状态事件、无模型凭据时评价失败不落账、6处页面HTTP响应及50条文献详情；最终结果以本次工作流执行记录为准。生产凭据轮换由用户稍后完成。
- 宿主连接边界本地回归658/658、请求生命周期6/6通过；真实workerd与独立PostgreSQL完成2次顺序和3次并发请求、连接区分及事务回滚。首次本机回归受并行下载资源占用影响失败，停下载后按原断言复验通过；云端完整应用验收继续执行。
- 3f779f8的OpenNext构建与Wrangler dry-run成功，完整workerd在第二次目录请求出现跨请求连接挂起。新增宿主PostgreSQL构造边界和流结束清理，Node构造方式、原事务/权限/迁移与训练API保持原行为；运行验证继续执行。
- 根据Next.js官方GHSA-2464-fhr4-w9xw公告，将项目与私有图片包的直接sharp固定为0.35.5；Next.js16.4.1已使用该修复版，其他依赖声明保持原值。
- 8813794的云端图片workerd检查、全仓格式/ESLint/TypeScript通过；pg-cloudflare错误消除。完整Workers打包仍有4项sharp错误，继续明确指定Workers构建的图片入口并保留依赖诊断。
- 用户确认继续免费Cloudflare Workers路径，撤回VPS选择；Neon Free与teacherlab.weiyi.top保持既定方案，合并继续等待批准。
- 增加私有图片运行时条件导出：Node沿用sharp，Workers通过Images绑定执行转换，保留PDF像素转PNG、WebP衍生图片、视觉附件大小和无效输入检查；训练API与核心引擎保持原样。
- 补充pg-cloudflare条件入口的standalone文件追踪。新增真实workerd图片操作检查，原图像处理回归保留；完整OpenNext、数据库跨请求与免费运行额度仍需云端验收。
- 免费Images每月5000次独立转换，超额拒绝新转换；未开通付费服务。实际部署、DNS和模型生产密钥配置仍待完成。

### TeacherScenarioLab 旧树清理与 Workers 适配（2026-10-30 19:36，Asia/Shanghai）

- 2026-10-30 20:13验收补充：b858937的标准CI与PostgreSQL工作流成功，159项浏览器回归和16项最终容器检查通过；Next.js16.4.1生产编译与镜像成功。Cloudflare独立构建因pg-cloudflare解析与sharp原生.node依赖共5项打包错误失败，未进入workerd运行，日志未显示OOM。
- Neon free_v3项目的teacherlab数据库已通过TLS证书校验连接，复用既有应用bootstrap创建38张表；训练、消息、评价均为0。连接通过本机既有代理的临时TLS隧道验证，系统与域名DNS配置保持原状。生产密码已在聊天交接，上线前需轮换。
- Workers实际部署、目标域名切换、真实模型全流程及线上逐页验收尚未完成。保留原图片处理功能和训练核心实现，后续部署方案需结合原生模块兼容性决定。

- 用户确认生产数据库采用Neon免费PostgreSQL，首页品牌为教师情境实训实验室 / TeacherScenarioLab，目标域名更新为teacherlab.weiyi.top。
- 基于9a990da删除指定24个旧页面、组件与导航文件，受保护新树和训练API保持校验值一致；旧引用为0。归档过期Next路由类型缓存后重新生成，全量TypeScript为0错误；28个训练测试文件229项通过、0失败、0跳过。删除检查点6a7a332的CI与PostgreSQL工作流均成功。
- 增加OpenNext、Wrangler与独立Linux构建/Workers运行验证流程。当前适配器要求Next.js至少16.4.1，按该最低兼容版本调整，原业务依赖声明保持不变；新增环境模板使用空占位。
- 按确认更新首页品牌及站点metadata，保留新路由、原课程入口与上游署名。训练后端、核心引擎、权限、迁移和事件账本保持原实现。
- Neon独立项目TeacherScenarioLab已创建，PostgreSQL16、Singapore、0.25CU；生产连接串和既有迁移连通仍待验证。Cloudflare可读服务列表，workers.dev子域名查询403，实际部署权限尚待核实。Mistral生产凭据缺失，聊天密钥需先轮换。
- 本地删除验证已完成；适配提交的完整CI、生产构建与workerd结果在推送后单独记录。PR保持Draft，合并、正式部署与DNS修改尚未执行。

### TeacherScenarioLab 评价提示契约修复（2026-10-30 13:53，Asia/Shanghai）

- 实测 JSON 失败的输出 Token 为899，未触及2048输出上限；源码核对发现旧提示使用无效省略号示例，并同时要求评语与 JSON 外无内容。
- 改为完整五维 JSON 结构示例和真实教师消息 ID 白名单，明确复制完整 UUID；历史叙述加 JSON 的解析兼容性、证据校验与事务保存规则保留。
- 增加示例可解析与证据白名单回归测试；本地对应测试、ESLint 和完整 TypeScript 通过。新模板的版本2真实资格回归按次数上限执行，结果在交付报告中独立记录。

### TeacherScenarioLab 业务质量门槛收紧（2026-10-30 13:33，Asia/Shanghai）

- 冷却后真实业务评价先返回不合格 JSON，单次修复后出现无效证据引用；两次 HTTP 200 均按失败记录，评价入库数保持0。修正前一条记录中对恢复阻塞原因的概括。
- 业务隐私/证据失败与重复 JSON 失败撤销对应任务资格，其他任务资格保持独立；在隔离 PostgreSQL 重放已观测失败，确认撤销入库且无新增供应商请求。
- 资格套件升级到版本2，评价增加使用 UUID 消息锚点的20条多角色消息案例；角色六例、评价三例及版本校验形成运行门槛。此前两次短案例通过作为历史证据保留，真实版本2长对话仍待供应商验收。
- 管理页将旧版资格标为待重新实测，长对话资格案例使用与业务一致的 UUID 消息锚点。
- 本地格式、类型、目标 ESLint、模型单元及 PostgreSQL 合约完成对应验证；最终结果由本次提交的 GitHub Actions 和独立验收报告记录。

### TeacherScenarioLab 模型验收可审阅性（2026-10-30 13:23，Asia/Shanghai）

- 管理后台新增固定虚构测试的合格输出详情、跳过数和拦截事实 ID；拦截文本保持不入库，表单校验失败显示提示，12种语言补齐相应文案。
- 调用元数据从实际 fetch 响应记录 HTTP 状态；补充201状态和隐私元数据透传测试。
- GitHub 第二轮 TypeScript、ESLint、PostgreSQL、生产镜像及159项浏览器测试通过；单元作业出现课堂编辑器预热回调全局计数失败。测试改为观察目标预热函数，执行/取消断言保留，追加独立浏览器 idle 工作的回归案例。
- GLM Flash 评价完成2次真实请求，五维结构、证据 ID 与分数波动检查通过；业务评价请求遇到429，按冷却规则保留失败状态并执行一次恢复核验，恢复请求先出现 JSON 失败，格式修复后证据校验仍失败，评价入库数为0。完整真实角色模型资格仍受供应商状态和严格输出边界约束。
- 本次变更继续使用原功能分支与 Draft PR，合并、部署和生产域名修改保持关闭。

### TeacherScenarioLab 资源池契约与验收补充（2026-10-30 13:01，Asia/Shanghai）

- `94ec62e` 的生产 Next.js 构建、最终 Docker 镜像和16项 PostgreSQL 运行检查通过，159项 Chromium 浏览器回归通过，PostgreSQL 合约通过；CI 中旧部署模板断言和新增测试函数类型检查失败，修正为当前 GLM/Google 分工和明确类型。
- 真实资格测试对瞬时网络/服务错误增加一次预算内重试，保留权限、额度、隐私和安全拒绝的终止规则，并补充自动化验证。
- 7张模型资源池表在独立数据库完成备份恢复，全部行数一致；观测余额与本地日/月预算的恢复规则在文档中分开说明。
- 真实供应商请求仍有超时、限流和输出扫描阻塞；失败及跳过按实际记录。PR 保持 Draft，最新提交的完整 CI 需以本次推送后的结果为准。

### TeacherScenarioLab 多供应商训练模型池（2026-10-30 12:46，Asia/Shanghai）

- 新增七家训练供应商连接档案，复用现有原生/兼容适配器、槽位标识与 callLLM；保留原有 provider preset。
- 角色与评价独立资格、免费额度优先、模型固定、有限重试、分类冷却、JSON 单次修复、安全拒绝终止及预算预留接入训练服务；新增 PostgreSQL 元数据与管理审计。
- 新增模型总览、供应商、额度、调度、日志五页，覆盖12种语言；区分本地预算、供应商观测余额、官方数据与估算，NVIDIA 保持独立授权门槛。
- 本地 TypeScript 和全仓 Prettier 检查通过；训练/配置/身份与 PostgreSQL 回归通过。新增浏览器和 PostgreSQL 工作流合约随本次推送在 GitHub 验证。
- 真实请求取得 GLM Flash 角色回复和一次 Gemini 五维 JSON 评价；完整真实训练受限流、服务错误、超时及输出扫描拦截阻塞，资格失败保留原状态。NVIDIA 本轮无生成调用，Mistral 待密钥，Cloudflare 待账号额度与 Neurons 核验。
- 凭据保存于 Git 忽略的本地环境配置；PR 保持 Draft，部署、合并、DNS 和生产数据变更均未执行。

### TeacherScenarioLab 容器验收访问码登录（2026-10-30 08:48，Asia/Shanghai）

- `7b00235` 的生产镜像构建、UID 1001 启动及健康探针通过；目录请求因缺少访问码认证返回 401，运行检查按失败记录。其余 CI 与 PostgreSQL 作业成功，158 项浏览器回归通过。
- 运行脚本通过现有 `/api/access-code/verify` 取得访问凭据；追加无凭据、错误访问码的 401 检查，并在后续账号请求中同时发送访问凭据与独立账号会话。访问码保护及 cookie 安全属性保留。
- 本地语法、格式核验后推送复验。真实 NVIDIA 成功、GLM 429 / 1113 阻塞及生产外部条件保持上一记录。

### TeacherScenarioLab 真实模型联调与容器启动验收（2026-10-30 08:26，Asia/Shanghai）

- 用户提供的 NVIDIA/GLM 密钥写入 Git 忽略的本地环境文件；`openmaic.yml` 引用环境变量，保留角色/评价独立槽位。凭据曾通过聊天提供，生产使用前需轮换。
- 两家模型目录均 HTTP 200。首个 NVIDIA 目录模型推理 HTTP 404；更换为目录与官方文档均列出的 `nvidia/nemotron-3.5-lightning-30b-a3b` 后，通过原 resolveModel/callLLM/角色服务真实调用成功（HTTP 200，约 50.5 秒）。中文输出通过泄露扫描，消息与事件保存于独立本地测试库。
- GLM `glm-4.7` 通用 API 返回 HTTP 429 / 1113（余额不足或无可用资源包）；评价与完成事件均未保存。用户要求保留此阻塞，标准 API 资源可用后继续五维评价真实联调。
- Main image CI 追加最终镜像加载、非 root 启动及独立 PostgreSQL 的健康、账号隔离、会话撤销与管理权限检查；真实模型密钥继续保留在本地。
- 本轮容器启动检查的云端结果待运行。条件合并/部署授权已收到，生产服务器、数据库与域名信息仍待核实。

### TeacherScenarioLab 训练状态本地化（2026-10-30 07:50，Asia/Shanghai）

- 模拟室、训练记录、复盘页使用本地化状态标签；七种状态在 12 个语言包中补齐，每个语言包现有 196 个训练键。
- 状态机、API 和数据库继续使用原有标识，未知状态保留可见原值。新增回归覆盖每个语言的全部状态与未知标识处理。
- 验证：本地化与状态机 41 项通过、0 失败、0 跳过；TypeScript 与 12 语言键检查通过。浏览器训练流程追加实际状态显示断言，继续在原 PR 完整套件中验证。
- 上线授权延续：用户允许验收满足后合并和部署；真实模型密钥、生产服务器与域名配置仍待安全提供。

### TeacherScenarioLab 完成度补齐与条件上线授权（2026-10-30 07:41，Asia/Shanghai）

- 用户已授权：验收满足后允许合并 PR #1 并正式部署。真实模型验收仍缺少 NVIDIA/GLM 密钥、可用模型 ID；生产服务器与域名变更信息已请求，待提供后继续相应操作。
- 复核远程 HEAD `974ddbb`、目标分支及现有两个工作流，均与上轮交付一致；145 项 Chromium 回归、生产 Build 和完整 runner 镜像通过。
- 补齐 9 个语言包的训练界面译文，以及繁体中文的 34 条英文回退；每个语言包保留 189 个训练键，其他模块内容经结构比较保持一致。
- 新增本地化回归：修改前 10 项失败、修改后 23 项通过；覆盖键、非空值、插值与学员/管理说明文案，12 语言全局键检查通过。
- 新增管理后台真实表单的新建、编辑、删除、发布冻结、非管理员提示验收，以及 12 个语言的首页、记录和导航浏览器检查。新增用例进入原有完整 E2E 套件。
- 验证：TypeScript、相关格式和本地回归通过；当前提交的 GitHub 完整 CI 与新增浏览器用例待云端运行。上线条件满足前 PR 保持 Draft，现阶段未合并、未部署。

### TeacherScenarioLab 最终验收提交（2026-10-30 01:40，Asia/Shanghai）

- `a974572` 的 Next.js 生产 Build、完整 Docker runner 镜像、全部单测与 PostgreSQL 工作流通过；浏览器训练闭环通过，总计 144 项通过、1 项文献夹具失败。
- 文献列表的年份附注与详情标题分别按真实 API 元数据验证，保持精确标题和年份断言。
- 生产覆盖配置在数据库口令、访问码或加密根密钥缺失时拒绝配置；官方 Compose 实测缺失拒绝、补齐后合并成功、数据库口令一致。
- 生产服务器、数据库和 Cloudflare 状态按尚未取得权威配置记录，公开 DNS 为 NXDOMAIN。最终报告按本提交的云端复验结果出具，真实 NVIDIA/GLM 联调保留密钥阻塞。

### TeacherScenarioLab 生产配置与验收收敛（2026-10-30 01:30，Asia/Shanghai）

- 本地完整 Storage 套件 1491 项通过、0 失败、7 跳过；独立 PostgreSQL 写入审计通过，13 张表的插入计数均增加。故障注入遗留的本地测试触发器已恢复，原行数据保留。
- `9733791` 云端 PostgreSQL 合约工作流成功，35 个应用套件 382 项通过；浏览器 143 项通过、1 项失败。剩余夹具把 `/training/hall` 提前识别为详情地址，现改为 UUID 路由等待并增加本人读取成功校验。
- 新增 `docker-compose.teacher-scenario.yml`：只读模型配置挂载、缺失源文件拒绝自动创建、多用户 owner 模式。官方 Compose v5.6.1 二进制经发布校验和核验后，实际配置合并检查通过，全程未联系 Docker daemon。
- 主镜像 CI 验证扩展到 runner 阶段，包含运行层依赖与 standalone 文件复制；镜像发布保持关闭。
- 最新 TypeScript、全仓 Prettier、54 项工作流/身份/stage 检查通过。备份恢复结果与外部阻塞延续上一记录；最终验收报告附精确 SHA、逐项 Actions 结果和测试统计。
- 本机跨盘依赖缓存及 Webpack 开发编译存在环境兼容限制，浏览器最终验收使用 GitHub 的生产构建与 Chromium。NVIDIA/GLM 实际调用仍需本地密钥与可用模型 ID；正式部署、合并及 DNS 修改均待用户授权。

### TeacherScenarioLab CI 验收跟进（2026-10-30 01:15，Asia/Shanghai）

- `dc5dcf4` 云端生产 Build、镜像、Lint/Typecheck、全部单测作业及 PostgreSQL 合约工作流通过；浏览器 142 项通过、2 项失败、1 项未运行。
- 修复两个浏览器失败：视频缩略图夹具切换至 `/courseware`；中文产品流程明确设置 `zh-CN` 浏览器语言，数据库连接必须显式配置。
- 修复 Storage 故障注入测试清理：触发器删除与模拟写入放在同一事务，回滚后再次验证触发器生效。独立 PostgreSQL 库连续执行两次，每次 8 项通过；保留全部原有断言。
- 备份恢复演练通过：本地独立空库恢复 PostgreSQL 自定义格式备份，27 张表行数一致，校验和已记录。生产加密根密钥与备份要求补入变量模板和部署文档。
- 待办：修复提交对应的完整云端浏览器复验、Storage 完整本地复验。真实供应商调用等待 NVIDIA/GLM 密钥；正式部署仍待用户批准。

### TeacherScenarioLab 回归修复与上线准备（2026-10-30 00:51，Asia/Shanghai）

- 需求：完成部署前可执行的开发、回归、模型链路与上线准备，现有 PR #1 保持 Draft。
- 修复：评价 JSON 字符串中的花括号解析；损坏或空会话凭据返回 invalid；无凭据请求延迟初始化训练会话存储；模型失败响应使用固定信息，原始供应商错误不进入 API 响应。
- 功能回归：保留产品首页，恢复上游课程生成和课程库界面至 `/courseware`，新增首页与训练导航入口，12 种语言的导航键保持一致；原课程 E2E 的入口定位同步到该路由，断言保持原值。
- 启动兼容：Node 启动逻辑保持原内容，迁入 `lib/server/startup.ts`，由 instrumentation 的明确 Node 运行时分支导入，隔离 Edge 打包的 Node SDK。启动和身份边界复测 91 项通过。
- 自动验收：新增 3 项真实数据库/浏览器产品流程；模型配置测试隔离开发者导出的其他供应商配置。训练 121 项、配置/身份/模型/工作流 987 项通过；TypeScript 已通过，最新修改继续复验。
- 文档配置：补充 NVIDIA/GLM 独立槽位示例；生产变量模板补齐 Compose 数据库口令插值；更新 Windows、备份恢复、管理员及上线前核验说明。真实模型调用等待 NVIDIA/GLM 密钥，用户选择先继续无密钥验收。
- 外部核验：Google 公共 DNS 查询 `zhiwei.weiyi.top` 的 A/AAAA/CNAME 均返回 NXDOMAIN；生产服务器、生产数据库与 Cloudflare 账号配置仍需当前权威信息。
- 待办：当前提交的云端完整 CI、生产 Build、镜像与 E2E 结果，Storage 本地完整退出码与恢复演练，真实供应商调用。
- 涉及文件：训练服务与回归测试、课程入口及 E2E、启动入口、i18n 导航、模型示例与部署文档。

### TeacherScenarioLab 预部署验收（2026-10-29 23:58，Asia/Shanghai）

- 任务：接管剩余开发、回归与上线准备；现有 PR #1 保持 Draft。
- 已核验 Muse 提交 `3fb5cfb` 的格式、训练 stage 例外与身份公共服务修复；最新 GitHub Lint/Typecheck 检查通过。
- 补齐 PostgreSQL 合约工作流缺失的 6 个训练测试；与 Git 跟踪清单核验为 35 个应用测试文件。
- 根据 CI 的 `Playwright does not support chromium on ubuntu26.04-x64` 实际错误，将 E2E 作业固定为 Ubuntu 24.04。触发分支及权限配置保持原值。
- 验证：两个 YAML 解析、工作流结构范围、PostgreSQL 清单一致性与 diff 检查通过；后续 GitHub 全量结果待运行。
- 待办：训练/身份/配置/数据库回归、浏览器验收、真实模型密钥条件核验、生产构建与部署文档审查。
- 涉及文件：`.github/workflows/ci.yml`、`.github/workflows/storage-pg-contract.yml`、`CHANGELOG.md`。

### Features

- `@openmaic/generation` exports `renderScenePrompt('slide-content', { imageElementEnabled, generatedImageEnabled, generatedVideoEnabled })`, which returns the slide content system prompt without running generation. Slide generation builds its system prompt through the same code, so the two cannot drift. `@openmaic/generation` 0.3.26.

### Bug Fixes

- Workbench: the request preview now opens the course even when a course read started before the first page landed answers after the run has finished; previously it could stay on "Opening the classroom" until the course card was clicked.
- Workbench: the first switch from Learn to Edit no longer waits for the editor to download. The classroom pane loads the editor while the browser is idle (or when the pointer or focus reaches Edit) on courses you can edit, and the switch no longer waits for the font picker's stylesheets, which load in the background. A slide set in a picker font may briefly show the fallback face before it swaps in.
- Google TTS: add Gemini 3.8 Flash-Lite (the new default) and Flash TTS ahead of the preview models' retirement. Preserve complete WAV responses instead of wrapping them in a second header; retain PCM conversion and explicit model selections. [#2033](https://github.com/THU-MAIC/OpenMAIC/issues/2033)
- Speech recognition: OpenAI-compatible transcription models that reject `verbose_json` now receive plain JSON requests. Qwen3 ASR recordings are uploaded as WAV from both the composer and the settings preview, with a matching multipart filename. Known OpenAI transcription models retain their existing SDK path and provider requests retain the guarded transport.

- A slide image whose box has a different shape from the image is now fitted inside the box the model laid out, centered, like `object-fit: contain`. Previously the box kept its width and changed its height, so a box flatter than its image grew downward and covered the text below it. Boxes within 10% of the image's ratio, and images with unknown dimensions, are unchanged. `@openmaic/generation` 0.3.25.
- Narration: generated speech is prompted to keep Greek letters and named constants as symbols, because that text is also the caption (classroom, standalone HTML player, and narration export). Write π, not the homophone 派, and the same for θ, α, β, λ, ω, Σ, and the constant e. `@openmaic/generation` 0.3.28. [#1906](https://github.com/THU-MAIC/OpenMAIC/issues/1906)
- Ark Agent Plan chat models resolve catalog metadata again, so reference images, context windows and max output are no longer dropped. The request still sends the plan's own model id. Ids that match an existing row reuse it (`deepseek-v4-pro`, `glm-5.3`, `kimi-k3`, `kimi-k2.7-code`, and Coding Plan `k3`). Seed 2.1 Pro, Seed 2.1 Lite, Seed 2.0 Mini, `deepseek-v4-flash`, `minimax-m3`, `kimi-k2.8-preview` and `ark-code-latest` resolve for the Agent Plan and stay off the dated Doubao preset; `ark-code-latest` is a router with tool calling, no image input and no single window. `kimi-k2.8-preview` omits max output because that documented ceiling equals the context window and callers send it as `max_tokens`. Kimi Coding Plan ids stay off the open-platform Kimi preset. The rest of MiniMax's M2 chat ids and TokenDance's Cogevol ids resolve model info as well. [#1947](https://github.com/THU-MAIC/OpenMAIC/issues/1947) [#1942](https://github.com/THU-MAIC/OpenMAIC/issues/1942)
- MinerU gateways that return image URLs instead of base64: slide images taken from a PDF's figures were stored as a few bytes of garbage, because the parser wrapped each URL as a base64 data URL and the server decoded it. The parser now keeps the URL, and the server downloads the image when it stores the extraction (uploaded materials and the knowledge base) under the provider-result URL policy (HTTPS and public addresses only) with per-image, total-size and time limits. An image that cannot be downloaded is left out and counted (`imagesSkipped`) without failing the extraction. A stored extraction that still holds image URLs is not reused for a new upload of the same file, and a course generated from it downloads the images then. Base64 decoding of extracted images and provider data URLs now refuses a payload that is not base64.

## [1.3.0-rc.1] - 2026-10-22

1.3.0-rc.1 is the first release candidate for 1.3.0. Its main theme is the **knowledge base**: every upload is kept in its owner's knowledge base until it is deleted, organized in folders and parsed once, with the result reused by every conversation. A new library page lists and organizes the materials, the composer offers them through `@` and a picker, and the agent gets tools to read, search and organize them. Interactive scenes also load their libraries from the deployment instead of a public CDN, the editor marks pages that have current problems, and malformed slide shapes no longer hang the renderer. This release contains breaking changes and upgrade conditions: the built-in Veo provider is removed, and the knowledge base adds schema changes that cannot run beside older instances or be rolled back. Read **Breaking Changes** before upgrading from 1.2.x.

### Breaking Changes

- **The built-in Veo video provider (`veo`) is removed.** Google shuts down all three Veo 3.1 preview models (`veo-3.1-generate-preview`, `veo-3.1-fast-generate-preview`, `veo-3.1-lite-generate-preview`) on October 22, 2026, and they were the provider's last models (Veo 3.0 and 2.0 were removed in [#1939](https://github.com/THU-MAIC/OpenMAIC/pull/1939)). Support for Google's replacement, `gemini-omni-1.1-flash`, is tracked in [#1940](https://github.com/THU-MAIC/OpenMAIC/issues/1940).
  - Pick another video provider in **Course Model Config → Video**, or assign `slots.video` to one in `openmaic.yml`. Veo 3.1 stays available through OpenRouter Video (`google/veo-3.1`), which OpenRouter serves from Vertex AI and is not part of this shutdown.
  - Existing configurations keep loading. An `openmaic.yml` provider with `preset: veo` no longer stops the server: it resolves nothing, every slot that named it follows its parent again, and a startup notice asks to remove it. Workspace settings that chose a Veo provider fall back the same way. `VIDEO_VEO_API_KEY`, `VIDEO_VEO_MODELS` and `VIDEO_VEO_BASE_URL` are ignored, with a startup notice when set; a `video.veo` entry in `server-providers.yml` is not carried over.

- **The knowledge base sets release conditions.** This is the first release that writes material reference roots and keeps knowledge-base materials only in the asset pool, and processes of an earlier release can lose that data. [#1896](https://github.com/THU-MAIC/OpenMAIC/pull/1896)
  - Stop every old instance before this version accepts writes. Do not run a mixed-version rolling deployment: schema-version checks in recent builds refuse to start against a newer schema but do not stop a process that is already running.
  - Finish the rollout well within `ASSET_COLLECTION_GRACE_MS` (one hour by default). An older collector releases an entry that only a reference root keeps alive one grace period after stamping it.
  - Do not roll back below this release (the material-pool Phase 1a boundary): an older reader cannot read a material that exists only in the pool.
  - Set `MATERIALS_POOL_BACKFILL=1` only after every old instance has stopped, then restart. Unset, older uploads stay where they are and are still read from there.
  - A host that provisions `ASSET_PG_SCHEMA`, `AGENT_SESSION_PG_SCHEMA` or `AGENT_SESSION_MATERIAL_PG_SCHEMA` through its own migrations must apply the schema additions listed under **Material library upgrade reference** below before upgrading; otherwise document writes, session reads and extraction fail on a missing table or column.
  - Without a registered byte store or `ASSET_S3_BUCKET`, knowledge-base originals are stored in PostgreSQL; plan database size and backups accordingly.

### Highlights

- **Knowledge base.** Every successful upload, from the workbench or from classic generation, now belongs to its owner's knowledge base and stays there until it is deleted; existing undeleted uploads are included. Materials can be grouped into folders, each is parsed once and the result is shared by every conversation, and a library page shows usage and parsing status and lets owners rename, move and delete them. The composer's `@` menu and `@` button offer knowledge-base sources beside classrooms, and the agent can read, search and organize them (but not delete them). RFC: [Discussion #1716](https://github.com/THU-MAIC/OpenMAIC/discussions/1716), tracking: [#1736](https://github.com/THU-MAIC/OpenMAIC/issues/1736). [#1896](https://github.com/THU-MAIC/OpenMAIC/pull/1896) [#1989](https://github.com/THU-MAIC/OpenMAIC/pull/1989)
- **Self-hosted interactive scene libraries.** KaTeX, Three.js, Chart.js and the Tailwind browser runtime are served by the deployment, and public CDN URLs for them in new and stored scenes are mapped to the hosted copies, so interactive scenes no longer depend on a public CDN. [#1972](https://github.com/THU-MAIC/OpenMAIC/pull/1972) [#1971](https://github.com/THU-MAIC/OpenMAIC/issues/1971)
- **Course issue markers.** The editor's page thumbnails now mark current problems in a course, such as missing narration, media that was never generated and cues that point at nothing, and a marker clears once its cause is fixed. This is the first phase of [#1900](https://github.com/THU-MAIC/OpenMAIC/issues/1900). [#1903](https://github.com/THU-MAIC/OpenMAIC/pull/1903) (by @Oliveryfaso)

### Added

- Interactive scenes load KaTeX, Three.js, Chart.js and the Tailwind v4 browser runtime from the deployment (`/vendor/interactive`, configurable with the build-time `INTERACTIVE_ASSET_BASE_URL`) instead of a public CDN. KaTeX is injected only into pages that contain math, and loads ahead of the page's scripts as before. The interactive prompts list the hosted libraries, and public CDN URLs for them in generated or stored pages are rewritten to the hosted copies when a scene opens and before export; other URLs are left as written. `@openmaic/generation` 0.3.24. [#1971](https://github.com/THU-MAIC/OpenMAIC/issues/1971)

- Course generation passes each catalogue voice's `gender` into the voice list and asks the model to pick a voice whose gender matches the agent, keeping the agent's name and persona consistent with that gender. `voiceDesign.gender` (`male` or `female`) is part of the agent DSL, the export sanitizer, and `set_roster`, so a course-language identity can still drive the match. When the model's voice is missing or invalid, playback falls back by index within that gender. A catalogue with no male/female data, or an agent whose gender is unknown, keeps the previous full-list index pick. [#1084](https://github.com/THU-MAIC/OpenMAIC/issues/1084) [#1908](https://github.com/THU-MAIC/OpenMAIC/pull/1908) (by @Frank-zhu2000)

- Course issues: `@openmaic/dsl` 0.12.0 adds `CourseIssue` and `collectCourseIssues`, which derive a course's current problems from the document (missing narration, generated-media placeholders, dangling cues and the existing action-content lint) without changing the serialized format. Editor thumbnails show their markers from this one list. Missing narration is reported only when the workspace can generate narration on the server, and every issue is a warning in this phase. Thumbnail markers no longer flash while a page whose narration lives only in the browser's cache is edited. [#1903](https://github.com/THU-MAIC/OpenMAIC/pull/1903) [#1953](https://github.com/THU-MAIC/OpenMAIC/pull/1953) (by @Oliveryfaso)
- Speech: a provider in `openmaic.yml` can declare its own `voices` list and `options.defaultVoice`, for OpenAI-compatible TTS endpoints whose voices differ from the built-in OpenAI catalogue. The list feeds the voice picker and the catalogue generated agents choose from, and the default is used for browser and server narration when no voice was selected; an explicitly selected voice is still used. Providers without these settings behave as before. [#1969](https://github.com/THU-MAIC/OpenMAIC/pull/1969) (by @xuyuanwei678)
- Course cards: a course that is generating shows the page in progress ("Generating 2/5" while page 2 is generated) instead of the number of finished pages, capped at the total. [#1926](https://github.com/THU-MAIC/OpenMAIC/pull/1926) (by @Cham1229)

### Bug Fixes

- Interactive scenes that load KaTeX themselves now get the platform's KaTeX too. Previously any page that mentioned KaTeX was skipped, so its math stayed raw when the page's own copy did not render it, and a page that called `renderMathInElement` after its copy failed to load stopped with a `ReferenceError` and showed the runtime-error notice. The platform's KaTeX now loads ahead of the page's scripts, its observer typesets labels the page fills in on load, and when the CDN is unreachable the page's math calls do nothing instead of throwing. The interactive prompts ask pages to leave math typesetting to the platform. `@openmaic/generation` 0.3.23. [#1538](https://github.com/THU-MAIC/OpenMAIC/issues/1538)

- Slides: malformed SVG paths and invalid shape geometry could hang the renderer or leave part of a slide missing. The new `@openmaic/geometry` package validates shapes where they are generated, edited or written by the agent; shapes already stored with invalid geometry are drawn as their text label (or left out when they have none) in playback, the editor, the whiteboard and PPTX export, without rewriting saved courses. Authored and generated shape labels get the same 10px inset in every renderer, while imported PPTX labels keep their own. [#1915](https://github.com/THU-MAIC/OpenMAIC/pull/1915) (by @cosarah)
- Renderer: slides with many heavy inline formulas no longer block the page in one long task when they first appear, including on cached visits, while ordinary slides with many formulas still finish before their first paint. Formulas still waiting to be typeset stay hidden instead of showing raw LaTeX. [#1930](https://github.com/THU-MAIC/OpenMAIC/pull/1930) [#1962](https://github.com/THU-MAIC/OpenMAIC/pull/1962) (by @YizukiAme)
- Charts: short bar, column, line, area and scatter charts no longer collapse to an empty plot. Margins scale with the chart, axis labels stay inside it and the legend gets its own row, in the app and in `@openmaic/renderer`; plot areas from imported files are kept. [#1973](https://github.com/THU-MAIC/OpenMAIC/pull/1973) (by @cosarah)
- Whiteboard: text and code on the whiteboard can be selected and copied; the rest of the canvas stays non-selectable. [#1952](https://github.com/THU-MAIC/OpenMAIC/pull/1952) (by @bhushan4work)
- Export: after moving from a classroom with failed outlines to a completed one without reloading, **Export** stayed disabled until the page was reloaded. [#1934](https://github.com/THU-MAIC/OpenMAIC/pull/1934) (by @VictorMaxWang)
- Web fetch: DeepSeek returns response headers only after it has fetched the whole page, but its reader gave up after 10 s, so slow pages failed with `Web fetch headers timed out` although DeepSeek completed (and billed) them. The header wait now uses the request deadline (`bodyTimeoutMs`, 30 s by default). [#1990](https://github.com/THU-MAIC/OpenMAIC/pull/1990)
- Media: the OpenRouter Video and ComfyUI adapters read the files a provider returns with a 200 MB limit, checked against the declared length and while streaming, instead of buffering a response of any size. [#1933](https://github.com/THU-MAIC/OpenMAIC/pull/1933) (by @AbelWangYaBo)

### Packages

- `@openmaic/storage` 0.38.0 (was 0.37.3), `@openmaic/dsl` 0.12.0 (was 0.11.3), `@openmaic/generation` 0.3.24 (was 0.3.21), `@openmaic/renderer` 0.2.0 (was 0.1.14), `@openmaic/editor` 0.0.12 (was 0.0.11), and the new `@openmaic/geometry` 0.1.0. `@openmaic/importer` is unchanged at 0.3.1.
- `@openmaic/renderer` 0.2.0 requires the optional peer `echarts >=5.5`; SDK consumers on ECharts 5.0–5.4 must upgrade it. ECharts is still needed only for slides with charts. [#1973](https://github.com/THU-MAIC/OpenMAIC/pull/1973)

### Known issues

- Qwen voice cloning still calls a retired model, so registering or synthesizing a cloned voice fails. The move to CosyVoice is in review in [#1949](https://github.com/THU-MAIC/OpenMAIC/pull/1949). [#1941](https://github.com/THU-MAIC/OpenMAIC/issues/1941)
- Course issues ship their first phase only: thumbnail markers, all at warning level. An issues list and a single "Fix with agent" entry point are planned in [#1900](https://github.com/THU-MAIC/OpenMAIC/issues/1900).
- On deployments protected by `ACCESS_CODE`, the composer's attach button, drag-and-drop and image paste can stay unavailable after the access code is entered on a fresh page load, until the page is reloaded. A fix is in review in [#1974](https://github.com/THU-MAIC/OpenMAIC/pull/1974).
- Volcengine Ark Agent Plan models report no image input, so reference images are dropped for them. [#1942](https://github.com/THU-MAIC/OpenMAIC/issues/1942)

### Material library upgrade reference

The full list of storage, schema and API changes behind the knowledge base, for self-hosters and embedders. The release conditions under **Breaking Changes** summarize what an upgrade has to observe.

- All successful uploads, including classic-mode uploads and existing undeleted files, belong to the owner's knowledge base and remain until explicitly deleted. Upload age, composer removal/unload and generation completion no longer delete them; the 24-hour sweep reclaims only unfinished reservations. The existing byte-store/pool and extraction formats remain; the knowledge base reads old parsed results without bulk reparsing, and classic generation retains its existing input contract. Usage includes classic parsed-result bytes, matching upload admission. The historical `owner_material.retention` column is inert; it no longer controls visibility, parsing or cleanup. No marking migration is required. [#1898](https://github.com/THU-MAIC/OpenMAIC/issues/1898)
- Migrations append new versions without changing published SQL: asset v2, agent-session v3, session-material v2, owner-material v5, and the new session-material-links store. Keep storage at **0.38.0**. Stop **all old instances before accepting writes** with this build; do not roll back to code before the material-pool Phase 1a boundary. Enable `MATERIALS_POOL_BACKFILL=1` only after every old instance is stopped. Schema-version checks in newer old builds are additional protection, not permission for a mixed rollout. Disposable integration test databases without main's migration ledger should be recreated separately, not reused as a production upgrade source.

- Server persistence: assets are allocated in a per-owner partition, so `ASSET_QUOTA_BYTES` is a per-owner ceiling and only the owner can replace or delete an entry (and not even the owner while a reference root holds it). Other owners read an entry by id while a live course of the entry's owner references it, and a document write references and commits only its owner's entries (and legacy ones), so naming another owner's id records nothing. Entries in the old shared partition stay readable by id, and can be replaced or deleted only by an owner who owns every course referencing them.
- `@openmaic/storage` 0.38.0: the entry lifecycle statements (the document-write stamp and the collector's sweep, legacy mark and release check) now read `asset_root_refs`, and the reference-tracking marker gains a `rule_version` column. A host that provisions `ASSET_PG_SCHEMA` through its own migrations must create that table and its index, and add `asset_reference_tracking.rule_version INTEGER NOT NULL DEFAULT 1`, before upgrading, or document writes that drop an asset reference, and the collector's entry pass, fail with `relation "asset_root_refs" does not exist` (or a missing column); see the schema additions and release conditions below.
- The first start adds two nullable columns, `agent_sessions.locale` and `agent_session_materials.extraction_reason_code` (`ADD COLUMN IF NOT EXISTS`; existing rows stay empty and read as before). A host that provisions `AGENT_SESSION_PG_SCHEMA` or `AGENT_SESSION_MATERIAL_PG_SCHEMA` through its own migrations must add `locale TEXT` to `agent_sessions` and `extraction_reason_code TEXT` to `agent_session_materials` before upgrading; without them, session reads and extraction settlement fail with `column ... does not exist`.
- The first start adds `asset_root_refs` to the asset schema, and to `owner_material` the nullable `asset_id`, `folder_id` and `display_name` columns, the `material_folders` table and the `owner_material_folder_fk` foreign key. Claims move folder rows and update `folder_id`. The shipped owner-material v2 migration remains unchanged; v5 adds the pool pointer after that one-time migration. **Release conditions.** Two separate hazards come from processes of an earlier release, and each has its own condition:
  - _Older collectors do not know about roots._ An older collector's sweep stamps any committed entry no document references and releases it one grace period later, so an entry only a root keeps alive is at risk while an older process runs. Upgrade all instances together and let the rollout finish well within `ASSET_COLLECTION_GRACE_MS` (an older collector needs at least one grace period between stamping and releasing an entry). Deployments that store users' original files may want a longer grace period than the one-hour default.
  - _Old bootstraps predating schema versioning can drop `owner_material.asset_id`._ Once pool pointers exist, starting those versions can erase them. Builds with a schema-version boot check instead refuse a newer schema, but that does not stop an old process already running. Stop every old instance before accepting new writes; do not use a rolling deployment with mixed versions.
  - Do not roll back before the material-pool Phase 1a boundary. A host that provisions the asset schema through its own migrations must create `asset_root_refs`; the lifecycle statements name it.
- The first start also adds owner-level extraction columns to `owner_material` (`extraction_token`, `extraction_claims` (default 0), `extraction_lease_at`, `extraction_error`, `extraction_result`, `extraction_cache_key`) and two partial indexes (`owner_material_extraction_queue_idx`, `owner_material_extraction_cache_idx`). Claims move the new columns with their rows.
- The material library's tools (RFC #1716 Phase 2) add the `agent_session_material_links` table (`session_id` referencing `agent_sessions(id)` with `ON DELETE CASCADE`, `material_id`, `created_at`; provisioned as its own versioned migration store) and two partial indexes on `owner_material`: `owner_material_derived_from_idx` (`derived_from`) and `owner_material_owner_folder_idx` (`owner_id, folder_id`, which also serves the folder foreign key's `ON DELETE RESTRICT` check). Every instance with the agent runtime starts the owner-level extraction runner beside the session one (`OPENMAIC_AGENT_RUNTIME_SCAN_INTERVAL_MS` and `OPENMAIC_AGENT_RUNTIME_MAX_CONCURRENT` apply to both); on shutdown it waits for its runs as the session runner does, and logs when one is still in a provider call it cannot cancel. Conversations and their copies from before keep working unchanged.
- Knowledge-base uploads go into the asset pool. A new knowledge-base upload is stored as a pool entry in its owner's partition, kept alive by a `('material', id)` reference root, and `owner_material.asset_id` points at it; classic uploads continue using the material byte store. Reading a material's original -- what a conversation's tools, extraction and imports do -- takes the pool first and falls back to the old object key, so uploads from before keep working; conversations attach materials by id (see the material library tools entry below) and keep the copies they made before. An object from before the pool is used only when it matches the digest recorded at upload; a damaged one reads as unavailable. When the owner's pool quota (`ASSET_QUOTA_BYTES`) has no room, an upload answers `507 ASSET_QUOTA_EXCEEDED`; the size (`413`) and source-quota (`429`) answers are unchanged. Uploads and the backfill allocate their pool entries directly, not through the persistence route, so a host's `beforeAssetAllocate` hook does not see them. **Storage:** without a registered byte store or `ASSET_S3_BUCKET`, uploaded originals (and existing ones, as the backfill moves them) are stored in PostgreSQL; plan database size and backups accordingly, or configure a bucket. **Backfill:** `MATERIALS_POOL_BACKFILL=1` moves pre-pool uploads whose extraction format supports pool originals into it (classic files that still require their byte-store key are skipped but remain in the knowledge base), one bounded pass per server start while the agent runtime is enabled; it deletes each old object only once the material's pool pointer has committed. Set it only after every instance runs this release and every older instance is stopped, then restart. Unset, old uploads stay where they are and are still read from there. **Release boundary:** this is the first release that writes material reference roots and keeps materials only in the pool. The release conditions above apply from here on: stop older instances before new ones take writes, and do not roll back below this release, because an older reader cannot read a material that exists only in the pool.

- Material library: `DELETE /api/materials/[id]` deletes a ready source and its derivatives in one transaction, withdrawing their pool roots and cancelling pending or running extraction through tombstones. Successful deletion returns 204; missing, foreign, uploading and already deleted sources return 404, and derivatives return 409. Library links become unreadable; existing conversation text, session copies and independent course media remain. Legacy originals are removed after commit; failures retain `oss_key`, and a cleanup pass on every server start (with the agent runtime enabled, independent of `MATERIALS_POOL_BACKFILL`) retries them without migration; the backfill itself no longer looks at deleted sources. No schema change, agent deletion tool or new event.
- Material library, tools and `@` (RFC #1716 Phase 2). A material sent with a message is attached by id instead of copied: the conversation reads the upload as it is now, its extraction is shared by every conversation of the owner and runs once, and nothing is copied into the conversation. Conversations that already hold copies keep reading them; sending one of those materials again reuses the copy. The agent's material tools take `scope: 'library'` to reach the owner's whole knowledge base without attaching it, read and search a source by its own id once extracted (every page and search hit carries the text's revision; continuing a page needs the previous one's), and organize it: `list_material_folders`, `create_material_folder`, `rename_material_folder`, `move_materials` (a source moves with its images and keyframes) and `rename_material`. The agent cannot delete. Documents keep the images their provider returned (at most 100, as WebP) as derivatives, and their text names them. The composer's `@` menu and `@` button offer the knowledge base's sources beside classrooms; a pick is staged like an upload and attached when the message is sent. New routes for the library page: `GET /api/materials/library` (with limits and usage), `GET/POST /api/materials/folders`, `PATCH/DELETE /api/materials/folders/[id]` (only an empty folder is deleted), `POST /api/materials/move` and `PATCH /api/materials/[id]` (rename), gated like the rest of `/api/materials`. Changes in behavior: sending a material no longer reads its bytes, so an upload whose stored object is damaged is attached and then reads as unavailable to the tools instead of refusing the message; an extraction refused for certain (its claim lost, its source deleted, its publication refused) removes the pool entries it allocated instead of leaving them to expire.
- Agent: `use_material_media` copies a material into a course as a new pool entry of the run owner, the way generated images and videos are stored, instead of writing a file under `/api/classroom-media`. It returns an `ast_` id for the media element; the `patch_stage` write naming it commits the entry and records the course's own reference, and a copy no page names expires. The course therefore keeps working after the material is deleted, and every use counts against the owner's asset quota (`ASSET_QUOTA_BYTES`) even when the bytes are the same. Like generated media, these entries are allocated directly, so a host's `beforeAssetAllocate` hook does not see them; a full store answers the agent with an error instead of a fallback write.
- `@openmaic/storage` 0.38.0: a reference-rule version. `ASSET_REFERENCE_RULE_VERSION` (2: document references and roots; exported from `@openmaic/storage/asset/collector`) is recorded on `asset_reference_tracking.rule_version` by every write that maintains references, document references and roots alike, raised and never lowered (a root change raises an existing marker but never creates one). A collector that finds a newer version — before its pass, or under the lock of an entry it is about to delete — refuses its entry level with `AssetReferenceRuleVersionError` while its byte pass still runs, so the next new kind of reference does not need a manual rollout rule for collectors. Collectors from before this release do not read it, so this release still relies on the release conditions above.
- Server persistence: a legacy shared-partition entry that any reference root holds can no longer be replaced or deleted by anyone, whoever owns the courses naming it: the asset layer cannot tell whose a root is, and removing the entry would take the root with it.
- `@openmaic/storage` 0.38.0: reference roots. `asset_root_refs (root_kind, root_id, asset_id)` (asset migration v2) keeps an asset entry alive for a caller that owns it outside any document, and `changeAssetRoots(queryable, { add, remove, principals })` (from `@openmaic/storage/asset/pg`) adds and removes roots in the caller's transaction: it locks every touched entry in one ascending statement, refuses a missing entry or one held outside `principals` (`AssetRootTargetError`) and a malformed call or a root named twice (`AssetRootInputError`), commits the entries it roots, and stamps only the entries whose root row it actually removed and that nothing else references. It never deletes an entry or bytes. Every lifecycle check — the document-write stamp, the collector's legacy mark, standing sweep and final release check — now counts a root as a reference; `root_kind` and `root_id` are opaque to the package, and a root never makes an entry readable by another principal.
- `@openmaic/storage` 0.38.0: an optional `locale` on `createSession` (read back on `AgentSessionMeta`) and on `postUserMessage` (read back on `AgentSessionUserMessage`), stored as given and opaque to the package; and an optional `reasonCode` argument to `PgAgentSessionMaterialStore.settleExtractionFailure`, read back as `MaterialExtractionState.reasonCode`. The code is kept only when the attempt settles as `failed`, in the same lease-fenced update as the status: an automatic retry back to `pending`, an explicit retry, a new claim and a successful completion clear it, and a failure without a code never keeps an earlier attempt's.
- `@openmaic/storage` 0.38.0: `PgAssetStore.remove` and `replace` refuse an entry a reference root holds with the new `AssetRootedError` (`code: 'ASSET_ROOTED'`, exported from the package root and `@openmaic/storage/asset/pg`) and leave it as it is; the asset HTTP handler answers `409 ASSET_ROOTED`. The check runs under the entry's row lock, after the ownership check, so another principal's rooted id still answers as an unknown id does: `remove` succeeds without doing anything and `replace` raises `AssetNotFoundError` (HTTP `404`). Whoever holds the root withdraws it first. The `asset_root_refs` foreign key still cascades, so only a direct row delete takes a root with its entry. A rooted entry whose replacement would also exceed the quota reports `ASSET_QUOTA_EXCEEDED`; nothing is written either way.

## [1.2.1] - 2026-10-18

1.2.1 is a regular patch release. Its main theme is web research: Kimi, DeepSeek and Firecrawl join as web-search providers, and a new `webFetch` slot lets the agent's `fetch_url` tool use a hosted reader instead of the built-in one. It also contains one breaking change, the removal of the legacy director-graph classroom chat ([#1913](https://github.com/THU-MAIC/OpenMAIC/pull/1913)), and removes retired models from the built-in catalogs ([#1939](https://github.com/THU-MAIC/OpenMAIC/pull/1939)). Read **Breaking Changes** before upgrading from 1.2.0.

### Breaking Changes

- **The legacy director-graph classroom chat is removed; classroom chat always runs on Pi.** [#1913](https://github.com/THU-MAIC/OpenMAIC/pull/1913)
  - Pi needs a Classroom model with tool calling: select one for **Classroom** in **Course Model Config**, or set the `classroom` slot (or the `llm` slot it inherits from) in `openmaic.yml`. For Gemini, use the native `google` preset.
  - Remove `NEXT_PUBLIC_PI_CHAT_ENABLED`. A production build accepts only unset, an empty string, `true` or `1` (exact match) and fails with migration guidance on any other value. The Docker build arg and its Compose forwarding remain only to carry the value to that check.
  - `POST /api/chat` is removed and answers `404`. With `ACCESS_CODE` set, an unauthenticated request still gets `401` first.

### Highlights

- **Web research.** Every new provider is opt-in or must be assigned; existing search defaults and the keyless `builtin` reader stay as they are.
  - **`webFetch` slot.** The reader behind the agent's `fetch_url` tool is now a capability slot with its own provider registry. It defaults to `builtin` (the existing local reader); `webFetch: null` in `openmaic.yml` removes the tool. Kimi is the first hosted reader, reusing the `kimi` or `kimi-coding-plan` credentials. Choose the reader in **Course Model Config → Web Fetch** and enter keys in **Settings → Model Services → Web Fetch**. URL and private-address checks run before a URL reaches a hosted reader and again on the final URL it reports; each request uses one reader, with no fallback. [#1912](https://github.com/THU-MAIC/OpenMAIC/pull/1912)
  - **Kimi web search.** Shares the Kimi chat key and base URL; Open Platform keys use Search Pro and Coding Plan keys use the Coding Plan search endpoint. A Kimi chat key alone does not enable search: set `WEB_SEARCH_KIMI_ENABLED=true`, add `web-search.kimi` to `server-providers.yml`, or, with `openmaic.yml`, assign `slots.webSearch` to a `kimi` provider. `WEB_SEARCH_KIMI_ENABLED=false` turns it off. [#1911](https://github.com/THU-MAIC/OpenMAIC/pull/1911)
  - **Token plans can declare web fetch.** Connecting Kimi Coding Plan in **Settings → Token Plan** now assigns web fetch to the plan alongside chat and web search, taking over the implicit `builtin` default without a conflict prompt; disconnecting returns to the server default. Lock the `webFetch` slot to keep `builtin`. [#1927](https://github.com/THU-MAIC/OpenMAIC/pull/1927)
  - **DeepSeek web search and fetch.** The `deepseek` preset reuses `DEEPSEEK_API_KEY` and its API base for both tools. Opt in to search with `WEB_SEARCH_DEEPSEEK_ENABLED=true`, a `web-search.deepseek` entry, or an explicit `webSearch` slot; assign `webFetch: deepseek` in `openmaic.yml` for fetch. [#1937](https://github.com/THU-MAIC/OpenMAIC/pull/1937)
  - **Firecrawl web search and fetch.** One `firecrawl` provider (`preset: firecrawl`) serves both `webSearch` and `webFetch` with one key. `FIRECRAWL_API_KEY` / `FIRECRAWL_BASE_URL` configure it in legacy setups, where it comes last in the search preference order; web fetch stays on `builtin` until `webFetch` is assigned to it. A self-hosted Firecrawl base must be declared in `openmaic.yml`. [#1931](https://github.com/THU-MAIC/OpenMAIC/pull/1931) [#1834](https://github.com/THU-MAIC/OpenMAIC/pull/1834) (by @JuampiHernandez)

### Features

- Classroom chat: `cue_user` can offer 2 to 4 suggested replies, shown as one row of buttons in the roundtable. Choosing one sends it as an ordinary learner message; learners can still type their own reply. [#1379](https://github.com/THU-MAIC/OpenMAIC/pull/1379) (by @yanpgwang)

### Bug Fixes

- Chat: on plain HTTP at a non-localhost address (a LAN or Tailscale IP, for example), where the browser has no Web Locks, classroom chats failed to load and every save retried in a loop. Chats now save and load there; two tabs on the same chat resolve last-write-wins. The deployment guide recommends HTTPS for phones and tablets. [#1929](https://github.com/THU-MAIC/OpenMAIC/pull/1929)
- i18n: the server picks the initial language from the locale cookie, then `Accept-Language`, and sets `<html lang>` to match, so server and client render the same language: a browser in another language no longer gets Chinese server HTML that switches after load. `/` and `/_not-found` now render dynamically. [#1874](https://github.com/THU-MAIC/OpenMAIC/pull/1874) (by @costajohnt)
- Generation: a non-numeric or non-finite shape `rotate` is reported as a model-output error with its element path instead of silently becoming `0`; a missing or `null` angle still means `0` (`@openmaic/generation` 0.3.21). [#1891](https://github.com/THU-MAIC/OpenMAIC/pull/1891) (by @Hahaa909)
- Roundtable: the suggested-reply bubble no longer appears stacked with the outgoing chat bubble and then jumps down; it appears once, in place, after the previous bubble has left. [#1943](https://github.com/THU-MAIC/OpenMAIC/pull/1943)

### Packages

- `@openmaic/generation` 0.3.21 (was 0.3.20). Other packages are unchanged from 1.2.0.

### Known issues

- Google shuts down the Veo 3.1 previews on October 22, 2026; after that the built-in Veo provider has no working model. [#1940](https://github.com/THU-MAIC/OpenMAIC/issues/1940)
- Qwen voice cloning still uses a retired model, so registering or synthesizing a cloned voice fails until it moves to CosyVoice; `TTS_QWEN_VOICE_CLONE_MODEL` can point to another model. [#1941](https://github.com/THU-MAIC/OpenMAIC/issues/1941)
- Volcengine Ark Agent Plan models report no image input, so reference images are dropped for them. [#1942](https://github.com/THU-MAIC/OpenMAIC/issues/1942)

### Other Changes

- Models: remove retired entries from the built-in catalogs and presets (existing saved IDs remain user-managed): [#1939](https://github.com/THU-MAIC/OpenMAIC/pull/1939)
  - deepseek: `deepseek-v4-flash`, `deepseek-v4-flash-vision-exp`. Use `deepseek-flash`.
  - qwen: `qwen3.6-max-preview`, `qwen3-max`. Use `qwen3.7-max`.
  - kimi: `kimi-k2.5`, `kimi-k2-thinking`. Use `kimi-k3`.
  - siliconflow: `deepseek-ai/DeepSeek-R1-Distill-Qwen-7B`, `Pro/moonshotai/Kimi-K2.5`, `THUDM/GLM-4.1V-9B-Thinking`, `THUDM/GLM-Z1-Rumination-32B-0414`. Use an available model from the provider catalog.
  - grok: `grok-4-1-fast-reasoning`, `grok-4-1-fast-non-reasoning`, `grok-code-fast-1`. Use `grok-4.3` or `grok-build-0.1`.
  - grok-image: `grok-imagine-image-pro`. Use `grok-imagine-image`.
  - tencent-hunyuan: `hy3-preview`; also remove `hunyuan-2.0-thinking-20251109` and `hunyuan-2.0-instruct-20251111` from environment examples. Use `hy3`.
  - xiaomi: `mimo-v2-pro`, `mimo-v2-omni`, `mimo-v2-flash`. Use `mimo-v2.6-pro` or `mimo-v2.6-flash`.
  - doubao: `doubao-seed-1-8-251228`. Use `doubao-seed-evolving`.
  - seedream: `doubao-seedream-3-0-t2i-250415`. Use `doubao-seedream-5-0-260128`.
  - seedance: `doubao-seedance-1-5-pro-251215`. Use `doubao-seedance-2-0-mini-260615`. Keep `doubao-seedance-1-0-lite-t2v-250428` while its status is Retiring, not Shutdown.
  - qwen-image: `qwen-image-max`, `qwen-image-max-2025-12-30`, `qwen-image-plus`, `qwen-image-plus-2026-01-09`, `qwen-image`. Use `qwen-image-3.0`.
  - nano-banana: `gemini-3.1-flash-image-preview`, `gemini-3-pro-image-preview`. Use `gemini-nano-banana-2.1` or `gemini-3-pro-image`.
  - veo: `veo-3.0-fast-generate-001`, `veo-3.0-generate-001`, `veo-2.0-generate-001`. Use `veo-3.1-generate-preview` (scheduled to retire October 22, 2026).
  - qwen-tts: `qwen3-tts-instruct-flash`, `qwen-tts`. Use `qwen3-tts-flash`.
  - Ark Agent Plan doubao: `doubao-seed-2.1-turbo`, `doubao-seed-2.0-pro`, `doubao-seed-2.0-code`, `doubao-seed-2.0-lite`, `deepseek-v3.2`, `minimax-m2.7`, `glm-5.2`, `glm-5.1`, `kimi-k2.6`. Use `doubao-seed-2.1-pro`, `deepseek-v4-pro` or `minimax-m3`.
  - Ark Agent Plan seedream: `doubao-seedream-5.0-lite`. Use `doubao-seedream-5.0-pro`.
  - Ark Agent Plan seedance: `doubao-seedance-1.5-pro`. Use `doubao-seedance-2.0-mini`.
  - Removed IDs that vendors route to a catalog successor resolve to it for capability lookups, so saved configurations keep image input, thinking controls and reasoning replay: `deepseek-v4-flash` and `deepseek-v4-flash-vision-exp` → `deepseek-flash`, `hy3-preview` → `hy3`, `grok-code-fast-1` → `grok-build-0.1`, Ark Agent Plan `glm-5.2` → `glm-5.3`.
  - `grok-4-1-fast*` (served as `grok-4.3` at a fixed reasoning effort) and SiliconFlow `Pro/moonshotai/Kimi-K2.5` remain valid in saved configurations. They lose catalog capability metadata, including image input and thinking controls; reselect a replacement model to restore that metadata.
  - Retain `qwen3-tts-vc-2026-01-22` as the non-selectable grouping ID for saved cloned voices. The model has retired: clone registration and synthesis fail until migration to CosyVoice. `TTS_QWEN_VOICE_CLONE_MODEL` can point to another model.
  - Keep upcoming retirements in the catalog: MiMo V2.5 / V2.5 Pro on October 21, 2026; Veo 3.1 Fast / Standard / Lite previews and Doubao Seed 2.0 Lite / Mini on October 22, 2026; `gpt-image-1` on October 23, 2026. Google's recommended Veo replacement, `gemini-omni-1.1-flash`, is not yet supported by the Veo adapter.
  - Ark Agent Plan: add the officially listed migration targets `doubao-seed-2.1-lite`, `glm-5.3`, `kimi-k3` and `kimi-k2.8-preview` (the Small-tier replacement for `kimi-k2.7-code`).
  - Keep models with future retirement dates and unverified entries; update image/video probe defaults and refresh the documented model tables.

- Dependencies: `@langchain/langgraph` is no longer installed. [#1913](https://github.com/THU-MAIC/OpenMAIC/pull/1913)
- Docs: `CONTRIBUTING.md` documents how app release versions are chosen. [#1938](https://github.com/THU-MAIC/OpenMAIC/pull/1938)

## [1.2.0] - 2026-10-16

1.2.0 is the **server-first** release. Course generation, model configuration, courses and media, and identity move to the server, and the browser becomes a client. It needs PostgreSQL and a long-running Node.js server; serverless hosts, Vercel included, stay on 1.1.x. This section collects what is new in 1.2.0 beyond the rc.1 and rc.2 sections below, including classroom export, which landed before rc.2 but was not recorded there. Coming from 1.1.x:

- Read **Breaking Changes** and **Before you upgrade** under [1.2.0-rc.1](#120-rc1---2026-10-04): `DATABASE_URL` is required, `MODEL_ROUTES` without `openmaic.yml` stops the server at startup, the browser no longer sends provider settings, and `POST /api/generate-classroom` takes `{ requirement, materialIds? }`.
- Back up the database, choose an identity mode before the first start, keep `data/`, and set `OPENMAIC_SECRET_KEY` when several instances share the database.
- Read the breaking change under [1.2.0-rc.2](#120-rc2---2026-10-11): every provider with server-managed credentials needs an explicit model list (`*_MODELS`, or `models` in `openmaic.yml`), and the render-service must be upgraded together with or before the app.
- Pi classroom chat now refuses models that cannot call tools and Google's OpenAI-compatible Gemini endpoint (see **Behavior Changes**).
- The deployment guide's [Upgrading from 1.1.x](packages/docs/content/docs/deployment.mdx#upgrading-from-11x) table lists every step.

### Highlights

- **Classroom export.** New since 1.2.0-rc.1, first recorded here.
  - **The PPTX keeps the whole lesson.** Interactive, quiz and PBL scenes stay where they are in the lesson as placeholder slides with an **Open online** button and a QR code that open the scene in the online classroom; quiz placeholders list the question stems, PBL placeholders the goal and milestones. **Export PPTX** and **Export Resource Pack** become submenus: with placeholder slides (recommended) or slides only. [#1811](https://github.com/THU-MAIC/OpenMAIC/pull/1811) [#1819](https://github.com/THU-MAIC/OpenMAIC/pull/1819) [#1823](https://github.com/THU-MAIC/OpenMAIC/pull/1823) [#1693](https://github.com/THU-MAIC/OpenMAIC/pull/1693) (menu refactor by @Tiyatrotist)
  - **Offline HTML.** **Export as HTML** produces one self-contained file that plays the classroom without a network connection: narration with captions, spotlight and laser, auto-advancing slides, slide video, discussion cards and interactive widget actions. Quiz, interactive and PBL scenes hold after their narration until the learner moves on. Choose **With narration and video** or **Without narration**. When JavaScript does not run, the file shows a short message instead of a blank page. [#1813](https://github.com/THU-MAIC/OpenMAIC/pull/1813) [#1842](https://github.com/THU-MAIC/OpenMAIC/pull/1842) [#1848](https://github.com/THU-MAIC/OpenMAIC/pull/1848) [#1850](https://github.com/THU-MAIC/OpenMAIC/pull/1850)
  - **Large classrooms.** A classroom that would exceed 400 MB as one file is exported as a ZIP of `classroom.html` with `audio/`, `media/` and `images/` folders; extract it before opening `classroom.html`. [#1845](https://github.com/THU-MAIC/OpenMAIC/pull/1845)
  - Related fixes: line charts keep their lines in Safari (`@openmaic/renderer` 0.1.12) [#1825](https://github.com/THU-MAIC/OpenMAIC/pull/1825); offline exports drop web-font fallbacks instead of logging a CSP error for each [#1826](https://github.com/THU-MAIC/OpenMAIC/pull/1826); narration is labelled by its real audio container, which also stops WAV clips in `.maic.zip` exports from showing a 12-hour duration in Safari [#1842](https://github.com/THU-MAIC/OpenMAIC/pull/1842).
- **Inline math survives saving.** Formulas typed in the slide text editor are stored as their LaTeX source and typeset by the clients, instead of being flattened on save and losing the source; the server never typesets authored input, and a formula over 2000 characters is shown as LaTeX text. Render-service slide previews typeset them with KaTeX styles (`@openmaic/renderer` 0.1.14), and the PPTX export writes each inline formula as one run of LaTeX text. [#1829](https://github.com/THU-MAIC/OpenMAIC/pull/1829) [#1904](https://github.com/THU-MAIC/OpenMAIC/pull/1904)

### Behavior Changes

- Pi classroom chat refuses a model whose catalogue entry says it cannot call tools, before inference, with `400 MODEL_CONFIG_INVALID` (`reason: tool_calling_required`) and a localized explanation; Course Model Config notes the requirement on the classroom slot. Legacy chat, quiz grading and PBL are unaffected. [#1894](https://github.com/THU-MAIC/OpenMAIC/pull/1894)
- Pi classroom chat refuses Google's official OpenAI-compatible Gemini endpoint (`generativelanguage.googleapis.com/v1beta/openai`) with `400 MODEL_CONFIG_INVALID` (`reason: gemini_native_required`). Configure Gemini with the native `google` preset; the configuration guides describe the move. [#1897](https://github.com/THU-MAIC/OpenMAIC/pull/1897)

### Features

- Image generation: GLM (Zhipu CogView) provider `glm-image`, with `cogview-3-flash` (default) and `cogview-4`. Configure it with `IMAGE_GLM_API_KEY` or in `openmaic.yml`. [#1832](https://github.com/THU-MAIC/OpenMAIC/pull/1832) (by @Cham1229)
- Settings: user-editable provider credentials (language model, speech, transcription, web search, image, video and document services) show a notice that the key is sent to the server hosting this instance, so it should be entered only on a deployment you trust. [#1158](https://github.com/THU-MAIC/OpenMAIC/pull/1158) (by @yipwingtim)
- Embedders: `configureGenerationRunHooks`, registered once at boot like `configurePersistenceHooks`, lets a host admit or refuse run starts (`authorizeStart`), run each execution in its own async context (`wrapExecution`), mark its own failures non-retryable (`classifyFailure`) and receive run events (`onRunEvent`). Nothing changes when no hooks are registered. [#1807](https://github.com/THU-MAIC/OpenMAIC/pull/1807)

### Security

- Agent: user-authored skill content is enclosed in a closing marker derived from its content hash, so a skill body can no longer fake the end of its user-authored block or close the skill envelope early. [#1816](https://github.com/THU-MAIC/OpenMAIC/pull/1816)
- Math: the app's KaTeX and Temml render paths (slides, whiteboard, quizzes, editor, chat Markdown, PPTX export, importer, offline exports) disable formula-defined macros (`\def`, `\newcommand`, `\let`, …), force `trust: false` and cap `maxExpand`, so a short formula cannot expand into an expensive render (`safeKatexOptions` in `@openmaic/dsl` 0.11.3). Generated interactive pages keep their own KaTeX auto-render settings; that script runs inside the sandboxed interactive frame, not in the app. [#1827](https://github.com/THU-MAIC/OpenMAIC/pull/1827)
- Sanitizer: inline style values containing a backslash are refused, so CSS escapes cannot get past the blocked-token check. Defence in depth: no URL-accepting property is currently allowed. [#1815](https://github.com/THU-MAIC/OpenMAIC/pull/1815)

### Bug Fixes

- Server: a long-running server no longer slows down with every request it serves. Each request's owner-bound document store created its own `AsyncLocalStorage`, which stays registered for the life of the process, so the cost of every promise grew until the event loop stalled; all stores now share one. [#1871](https://github.com/THU-MAIC/OpenMAIC/pull/1871)
- Generation: an explicit provider plan or balance exhaustion is reported as `PROVIDER_QUOTA_EXHAUSTED`, with localized guidance and Retry on the generation preview and classroom failure cards, and is no longer retried within a model call or step. A configured LLM fallback is still used; ordinary 429s keep their retries. [#1831](https://github.com/THU-MAIC/OpenMAIC/pull/1831) [#1861](https://github.com/THU-MAIC/OpenMAIC/pull/1861) (by @YizukiAme)
- Generation: images sent to vision calls (outline, scene content, scene actions, PBL evaluation) that are over 1 MiB of base64 or 2048 px, animated, CMYK, 16-bit or in another format are re-encoded as JPEG within those limits; an image that still does not fit or cannot be decoded is dropped with a warning instead of failing the step. Data URLs are parsed without a regex (`@openmaic/generation` 0.3.19). [#1902](https://github.com/THU-MAIC/OpenMAIC/pull/1902)
- Generation: interactive pages publish one explicit current state and games build their state before the first render, Start or reset, so generated pages no longer abort initialization (`@openmaic/generation` 0.3.16). [#1795](https://github.com/THU-MAIC/OpenMAIC/pull/1795) (by @Ethereal49)
- Generation: a model-supplied rotation of a generated slide shape is kept instead of reset to zero, and the slide prompt defines rotation (degrees, clockwise around the centre) (`@openmaic/generation` 0.3.18, 0.3.20). [#1855](https://github.com/THU-MAIC/OpenMAIC/pull/1855) [#1872](https://github.com/THU-MAIC/OpenMAIC/pull/1872) (by @Hahaa909)
- Workbench: a material over the server's upload cap is refused in the browser before any bytes are sent, with the "file too large" message, instead of after a full upload behind a buffering proxy. [#1887](https://github.com/THU-MAIC/OpenMAIC/pull/1887)
- Import: a ZIP classroom import no longer deletes the course it just created when the server committed the write but the response was lost. [#1864](https://github.com/THU-MAIC/OpenMAIC/pull/1864) (by @Duang777)
- Pi classroom chat: malformed table, code and slide reference snapshots and empty members of `storeState.scenes` answer `400 INVALID_REQUEST` instead of a `500` or a failed stream. [#1752](https://github.com/THU-MAIC/OpenMAIC/pull/1752) [#1893](https://github.com/THU-MAIC/OpenMAIC/pull/1893) (by @Frank-zhu2000)
- Speech: a client-supplied TTS base URL on a local network is refused with a message that no longer suggests `ALLOW_LOCAL_NETWORKS`, which does not apply to client-supplied endpoints; such a service has to be configured by the operator. [#1798](https://github.com/THU-MAIC/OpenMAIC/pull/1798) (by @mvanhorn)
- Renderer: cancelling idle typesetting uses the scheduling pair it started with. This unblocked publishing `@openmaic/renderer` 0.1.14 and `@openmaic/editor` 0.0.11; renderer 0.1.13 was never published. [#1901](https://github.com/THU-MAIC/OpenMAIC/pull/1901)

### Packages

- New since rc.2: `@openmaic/renderer` 0.1.14 (0.1.13, referenced by rc.2, was never published) and `@openmaic/generation` 0.3.20 (rc.2 had 0.3.18). `@openmaic/editor` 0.0.11 is the version rc.2 referenced, first published with this release. Unchanged from rc.2: `@openmaic/dsl` 0.11.3, `@openmaic/importer` 0.3.1 and `@openmaic/storage` 0.37.3.

### Known issues

- On iPhone, an exported HTML file does not play inside WeChat or the Files preview; open it in Safari or another browser. [#1847](https://github.com/THU-MAIC/OpenMAIC/issues/1847)
- Long formulas in an exported PPTX may wrap onto several lines in PowerPoint and WPS. [#1905](https://github.com/THU-MAIC/OpenMAIC/issues/1905)
- With the renderer-based editor off (`NEXT_PUBLIC_MAIC_EDITOR_RENDERER_ENABLED`), the legacy canvas editor flattens the inline formulas in a text box to plain text when that text is edited. [#1868](https://github.com/THU-MAIC/OpenMAIC/issues/1868)

### Other Changes

- Tests and CI: the suite runs reliably on Windows and newer Node.js runtimes and under load, boot tests no longer start real background workers, and the PostgreSQL CI job runs every app contract suite. [#1803](https://github.com/THU-MAIC/OpenMAIC/pull/1803) [#1828](https://github.com/THU-MAIC/OpenMAIC/pull/1828) [#1890](https://github.com/THU-MAIC/OpenMAIC/pull/1890) [#1867](https://github.com/THU-MAIC/OpenMAIC/pull/1867) [#1907](https://github.com/THU-MAIC/OpenMAIC/pull/1907) (with @Cham1229, @BeAIcoder and @YizukiAme)

## [1.2.0-rc.2] - 2026-10-11

### Security

- Enforce model authorization for server-managed providers across chat, media, speech, model-based web search and workspace model assignments. Unauthorized and unknown model ids return the same HTTP 403 response before provider access. Users' own credentials continue to work. [#1879](https://github.com/THU-MAIC/OpenMAIC/pull/1879) (with @13ob0)
- Render jobs are bound to the requesting owner. The render-service and app must be upgraded together; upgrade every service instance (or drain old instances) together with or before the app. Old/new version mixes fail closed through a dedicated owner-bound job namespace. [#1884](https://github.com/THU-MAIC/OpenMAIC/pull/1884) (by @Duang777)
- Deleted courses no longer serve their legacy classroom media: `/api/classroom-media/<id>/...` checks the course lifecycle before touching the filesystem and answers a tombstoned course with the same 404 as a missing file. Successful responses are `private, max-age=300, must-revalidate` instead of `public, immutable`. [#1883](https://github.com/THU-MAIC/OpenMAIC/pull/1883) (by @Duang777)

### Breaking change: server-managed model authorization

- Set `*_MODELS` for every provider with server-managed credentials, or set `models` under each provider in `openmaic.yml` / `server-providers.yml`. Without a list, only deployment default/fallback and capability slot references authorize models; preset catalogues and workspace assignments do not. Provider-only media slots authorize a single adapter default. Services without model ids need no list. Providers configured without credentials (local Ollama, Lemonade) are not restricted; a keyless gateway that adds its own upstream credential should be given a key and a model list.
- Migration: list the model ids users should be able to select (including voice compatibility models), restart the server, then update workspace selections that are no longer authorized. A startup warning names the configuration setting for each provider with credentials but no explicit list.

### Bug Fixes

- S3 asset storage: `@openmaic/storage` 0.37.3 supports path-style addressing for S3-compatible object stores such as MinIO and Ceph. Set `AWS_S3_FORCE_PATH_STYLE=true` (or `1`) together with `AWS_ENDPOINT_URL_S3` so objects are addressed as `endpoint/bucket/key`; leaving it unset keeps the existing behaviour for Amazon S3 (#1686).
- Server persistence: `@openmaic/storage` 0.37.2 bounds `HttpDocumentStore` requests with a deadline (`requestTimeoutMs`, default 30s, `<= 0` disables) covering the request round trip — sending the body and receiving the response headers — so a persistence endpoint that stops answering fails like any other transport error instead of holding its caller forever. The stage autosave keeps at most one save in flight and starts the next only once that promise settles, so a request that never settled silently stranded every later save for the life of the page while the editor went on rendering the in-memory document; the reload showed what had actually reached the server. A request aborted at the deadline rejects with `HTTP_REQUEST_TIMEOUT`, which the autosave's existing backoff retries. The budget is the floor plus an allowance proportional to the request body (sized at a fixed 100 KiB/s) and is capped at 10 minutes, so a large document on a slow link is not mistaken for a stall; reading the response body stays outside the bound. This mirrors the budget `HttpAssetStore` already applies through `probeTimeoutMs` / `startBoundedOperation`.
- Synchronous scene previews and video exports no longer block each other; each uses its own execution lane. [#1830](https://github.com/THU-MAIC/OpenMAIC/pull/1830)
- Preview concurrency is capped by the render resource profile and reported by `/health`. Cancelling a preview during Chromium startup retains its execution slot until launch and browser cleanup settle.

## [1.2.0-rc.1] - 2026-10-04

The release candidate for 1.2.0, **server-first**.

Up to 1.1.x the browser drove course generation one request per step and kept the courses, the provider keys and the model settings itself. Closing the tab stopped a course halfway, every browser had to be set up on its own, a deployment could offer providers but not fix which models its users get, and the headless API ran a separate pipeline that drifted from the web app. 1.2.0 moves all of this to the server: courses and media, identity, model configuration and course generation live there, and the browser is a client. Generation becomes a server-side run shared by the web app and the API, and models are configured once per deployment. The cost is the deployment shape: a long-running Node process and PostgreSQL instead of a serverless host.

Design: RFC [#1754](https://github.com/THU-MAIC/OpenMAIC/discussions/1754) (release) and [#1701](https://github.com/THU-MAIC/OpenMAIC/discussions/1701) (model configuration). Read **Breaking Changes** and **Before you upgrade** first.

### Highlights

- **Generation runs on the server.** Classic generation is a server-side run that keeps going when the page is closed, resumes from its last checkpoint after a restart or a crashed worker, streams progress to every open tab, and pauses at a failed step so that Retry re-runs only that step. Images and videos are generated alongside the scenes, and a single failed item can be retried. The web app and the headless API share one pipeline. [#1756](https://github.com/THU-MAIC/OpenMAIC/pull/1756) [#1759](https://github.com/THU-MAIC/OpenMAIC/pull/1759) [#1761](https://github.com/THU-MAIC/OpenMAIC/pull/1761)
- **Models are configured on the server.** `openmaic.yml` declares providers and capability slots: `llm` with `course.*`, `classroom` and `agent`, plus `tts`, `asr`, `image`, `video`, `webSearch` and `document`.
  - `slots` are server defaults that users may change.
  - `lock` fixes slots (or `all`) for everyone.
  - `allowUserKeys: false` keeps users from adding their own providers.
  - The settings take the matching shape: _set it up yourself_, _choose a model_ or _configured by the administrator_.
  - Keys are stored encrypted on the server and never leave it. [#1727](https://github.com/THU-MAIC/OpenMAIC/pull/1727) [#1733](https://github.com/THU-MAIC/OpenMAIC/pull/1733) [#1767](https://github.com/THU-MAIC/OpenMAIC/pull/1767) [#1793](https://github.com/THU-MAIC/OpenMAIC/pull/1793)
- **Materials are parsed as soon as they are attached.** The composer uploads and parses each file in place and shows progress, Ready, or Failed with Retry. Generate waits until every file is ready, and the preview then opens without a material-analysis step. Re-uploading the same file reuses the earlier parse. [#1796](https://github.com/THU-MAIC/OpenMAIC/pull/1796)
- **Identity.** There are three modes:
  - single-user for personal installations (the Docker Compose default);
  - anonymous visitors, whose cookie now lasts 400 days and is renewed while in use;
  - accounts, through host auth methods.

  Anonymous work can be claimed into an account with `POST /api/identity/claim`.

- **Custom agents are stored on the server** (`/api/agents`). [#1758](https://github.com/THU-MAIC/OpenMAIC/pull/1758)
- **The database schema is versioned** (`openmaic_schema_migrations`). [#1757](https://github.com/THU-MAIC/OpenMAIC/pull/1757)
- **Upgrades carry browser data to the server.** The first load after the upgrade moves the browser's courses, chat, progress, folders, media, custom agents and model settings to the server, once per browser.

### Breaking Changes

- **PostgreSQL and a long-running server are required.** `DATABASE_URL` is mandatory.
  - Deploy with Docker (`docker compose up` now includes PostgreSQL and runs single-user, on `127.0.0.1`) or with `pnpm start`.
  - Serverless hosts, Vercel included, stay on 1.1.x; the README explains how to deploy it.
  - `NEXT_PUBLIC_PERSISTENCE` and `vercel.json` are removed.
- **`MODEL_ROUTES` without `openmaic.yml` stops the server at startup.** Deployments running the Pro agent must write `openmaic.yml` before upgrading. The route-to-slot table is under "Migrating from the legacy configuration" in the configuration docs. Without `openmaic.yml`, the provider variables, `server-providers.yml`, `DEFAULT_MODEL` and `MODEL_FALLBACK` keep working, but are deprecated.
- **The browser no longer sends provider settings.** The `x-api-key`, `x-model`, `x-base-url`, `x-model-routes`, `x-image-*` and `x-video-*` headers, and the matching body fields, are deprecated.
  - They are honoured only for a slot with nothing assigned.
  - They are never honoured under `allowUserKeys: false`.
- **Headless API.** `POST /api/generate-classroom` takes `{ requirement, materialIds? }`.
  - Upload documents first with `POST /api/materials`; `pdfContent` is refused.
  - Job ids are run ids, so job ids from earlier builds answer `404`.
  - The `enable*`, `agentMode` and web-search request fields are ignored. Every capability the server configures runs, and `GET /api/generate-classroom/capabilities` reports which ones.
  - Submissions are checked up front (`400 MISSING_MODEL`, `MISSING_API_KEY`, …) and limited per owner (`429 ACTIVE_RUN_LIMIT`).
  - In anonymous-cookie mode, keep one cookie jar for the upload, the submission and the polls.
- **Routes removed:**
  - `/api/generate/{scene-outlines-stream,agent-profiles,scene-content,scene-actions}`
  - `/api/extract-document`
  - `/api/web-search`
  - `GET` / `POST /api/classroom`

  Use `/api/generation-runs` instead.

- **A course is read-only while it is being generated.** Other writers get `409 COURSE_GENERATING` until its run completes or ends. Deleting the course and moving it between folders stay allowed.
- **Runtime sessions are keyed by the resolved owner.** `PERSISTENCE_DEV_TOKEN`, `NEXT_PUBLIC_PERSISTENCE_TOKEN` and `PERSISTENCE_ALLOW_INSECURE_DEV_AUTH` are removed.
  - If the token was your only access gate, put the deployment behind `ACCESS_CODE`, a gateway or owner auth methods first.
  - Earlier runtime sessions are not migrated.
- **Assets belong to an owner.** `ASSET_QUOTA_BYTES` is a per-owner limit.
- **Interrupted courses are not resumed.** Courses interrupted in the browser before 1.2.0 show their remaining scenes as interrupted.
- **Embedders.** `@openmaic/storage` 0.32–0.37 changes:
  - document ownership moves to the `documentOwnership` relation;
  - the browser storage seams have no IndexedDB fallback;
  - `ServerPersistenceProvider.documentStore` is removed.

### Before you upgrade

- **Back up the database.** The first start runs the schema migrations. On a large `document_stages` table, it builds an index under a write lock; you can build that index concurrently beforehand (see the full notes).
- **Rolling back to 1.1.x** needs either the ownership copy-back SQL (under Breaking Changes in the full notes) or that backup.
- **Set `OPENMAIC_SECRET_KEY`** when several replicas share the database, when `data/` does not survive a restart, or when the working directory is read-only. Otherwise back up `data/instance-secret.key` together with the database.
- **Choose an identity mode:** single-user, a shared team owner, anonymous, or host auth.
- **Keep `data/classrooms`.** Classrooms stored there are imported once, in the background.
- **Check which capabilities will run.** With the legacy configuration, the first configured provider of each kind becomes the server default. Course research then runs whenever web search is configured, and headless jobs use every configured capability. To turn one off for everybody, set its slot to `null` and list it in `lock`.
- **Connect PostgreSQL directly or through a session pool.** A transaction-mode pooler (PgBouncer `pool_mode = transaction`) is not supported.
- **Follow the guide.** The deployment guide's "Upgrading from 1.1.x" table lists every step.

### Known issues

- Web-search services in Settings → Model Services have no **Test connection** button.
- A token plan connected with an invalid key shows as connected; the error appears only when a course is generated.
- A very short requirement can drift off topic or ignore an explicit slide count.

<details>
<summary><strong>Full change notes</strong></summary>

#### Breaking Changes

- Server-backed persistence is always on. Courses, folders and folder membership, chat history and learner runtime, and generated media are stored on the server through `/api/persistence`; the browser has no storage backend of its own any more. The build-time `NEXT_PUBLIC_PERSISTENCE` switch is removed (from the client, the Dockerfile and `docker-compose.yml`) and ignored. The server now requires `DATABASE_URL` and exits at startup without it (`[boot] Invalid server configuration; the server will not start: DATABASE_URL is not set. ...`); `pnpm db:up` / `pnpm db:down` start and stop a separate development database (the Compose `postgres` service definition under its own project and volume, `openmaic-dev-db`), published on `127.0.0.1` (`OPENMAIC_DB_PORT`, default `5432`), for local development; other deployments point `DATABASE_URL` at a PostgreSQL database they run. Only device-local state stays in the browser (settings, playback position, the editor's current scene and undo history, a local cache of media the server already stores, and browser voice profiles), in a new `maic-device-cache` IndexedDB database; **Settings → Clear Local Cache** clears exactly that. Courses an earlier browser-only build stored in the browser are not deleted; the one-way importer below moves them to the server.
- Docker Compose: `docker compose up` now starts PostgreSQL (no profile) and a server-backed app (`DATABASE_URL` set from `PERSISTENCE_POSTGRES_PASSWORD`) that waits for PostgreSQL to be healthy, in single-user mode (`docker-compose.defaults.env`, read before `.env.local` so it can be overridden there). The app port is published on `127.0.0.1` only; start with `OPENMAIC_PUBLISH_ADDRESS=0.0.0.0` to serve other machines, and set `ACCESS_CODE` then: every visitor is the same single owner. `OPENMAIC_PORT` changes the host port. `--profile server-persistence` is still accepted and does nothing. A `DATABASE_URL` in `.env.local` still wins over the bundled default. Courses an earlier browser-only deployment stored in the browser are not deleted; the one-way importer in this release moves them to the server. Anonymous libraries from an earlier server-backed deployment are not merged into the single owner automatically; claim them explicitly. A `.env.local` that sets `PERSISTENCE_SHARED_OWNER_ID` must also set `OWNER_SINGLE_USER=false`.
- `@openmaic/storage` 0.34.0: course ownership is no longer recorded on `document_stages`. `PgDocumentStore` never reads or writes `document_stages.owner_id`; an owner-bound store scopes listings, writes, deletes, the freshness manifest and folder membership through the host's ownership relation, named with the new `documentOwnership` option (`{ table, stageIdColumn?, ownerIdColumn?, tombstoneColumn?, claimOnCreate? }`). The relation must cascade with the document rows (`REFERENCES document_stages(id) ON DELETE CASCADE`) or be cleaned alongside them; a leftover ownership row keeps the id reserved for its owner. `documentOwnership: false` turns document scoping off, and on an owner-bound store it requires `allowCrossOwnerDocumentAccess: true`, so binding an owner for folders or asset principals cannot silently expose every owner's documents. `forOwner(ownerId)` (or `ownerId`) without `documentOwnership` now throws at construction instead of silently scoping nothing. A store that is not owner-bound is tenant-agnostic: it lists and writes every document, where it used to see only documents with no owner. `AssetCollector`'s `assetReferencePrincipals` requires `documentOwnership` too, because the backfill reads each document's owner from that relation. A new `folders: false` option lets a host whose own `document_stages` has no `folder_id` column use the store without folders. Fresh installs no longer get the `owner_id` column or its two indexes (`document_stages_owner_idx`, `document_stages_owner_folder_idx`); `document_stages_folder_idx` replaces the latter.
- Server persistence: `stage_meta` is the only record of who owns a course. At the first start, courses whose owner was recorded only on `document_stages.owner_id` are adopted into `stage_meta` (once per database, logged with a count; where the two records disagree `stage_meta` stands and the disagreement is counted). To roll back to a release that still reads the column, first copy ownership back for courses created since the upgrade: `UPDATE document_stages AS d SET owner_id = m.owner_id FROM stage_meta AS m WHERE m.stage_id = d.id AND d.owner_id IS NULL`.

- Server persistence: runtime sessions (`/api/persistence/runtime/*`) are keyed by the owner the owner identity seam resolves, not by a client-supplied `x-learner-key` behind the development token. `PERSISTENCE_DEV_TOKEN`, `NEXT_PUBLIC_PERSISTENCE_TOKEN` and `PERSISTENCE_ALLOW_INSECURE_DEV_AUTH` are removed and ignored; the browser learns its learner key from `GET /api/persistence/learner-key`. Runtime sessions written before this change were keyed by a browser-minted learner key and are no longer reachable; they are not migrated, because trusting a client-supplied old key would restore client-chosen identity. Course documents and media are unaffected. **If the development token was your only access gate**, put the deployment behind `ACCESS_CODE` or a gateway, or register owner auth methods, before upgrading: without the token the endpoint serves every visitor as their own anonymous owner.
- Server persistence: assets are allocated in a per-owner partition, so `ASSET_QUOTA_BYTES` is a per-owner ceiling and only the owner can replace or delete an entry. Other owners read an entry by id while a live course of the entry's owner references it, and a document write references and commits only its owner's entries (and legacy ones), so naming another owner's id records nothing. Entries in the old shared partition stay readable by id, and can be replaced or deleted only by an owner who owns every course referencing them.
- Server-side classroom generation (`POST /api/generate-classroom`) writes through server persistence. A job runs for the request owner and saves the classroom into that owner's course library, with its images, videos and narration in the owner's asset pool; nothing is written under `data/classrooms` or `data/classroom-jobs` any more. `POST /api/classroom` and `GET /api/classroom` are removed, and so is the classroom page's fallback to `GET /api/classroom`. Jobs are stored in PostgreSQL (as generation runs, see below) and are owner-scoped: `GET /api/generate-classroom/<jobId>` answers only the owner that created the job (or the account it was claimed into) and `404` for everyone else, like an unknown id. With a fixed owner (`PERSISTENCE_SHARED_OWNER_ID`, `OWNER_SINGLE_USER`, or a host auth method) this is automatic; in anonymous-cookie mode a headless caller must keep the cookie from its first response and send it when polling, and the classrooms it generates belong to that anonymous owner: anyone can open them by link, but no browser user can edit them. Run with a fixed owner or host auth when API-generated courses should be editable.
- Headless generation runs on the server's generation runs ([#1754](https://github.com/THU-MAIC/OpenMAIC/discussions/1754), E2): `POST /api/generate-classroom` starts a run of the request owner, the same pipeline (and the same step functions, prompts and validation) as classic generation, with the outline confirmed by the run itself, course-specific agents (the built-in ones if that step fails), and no interactive or task-engine mode. The separate server pipeline (`generateClassroom`, its media and TTS passes and the in-process job runner) is removed. For API callers:
  - The job id is the run id (`run-…`), also returned as `runId`; job ids of earlier builds answer `404`. The poll response keeps its shape (`status` `queued` / `running` / `succeeded` / `failed`, `step`, `progress`, `scenesGenerated`, `totalScenes`, `result.classroomId` / `url` / `scenesCount`, `error`, `done`), read from the run, and adds `runId`, `runState` and `retryable`. A run paused at a failed step, and a run whose course was deleted or that was discarded, read as `failed` with `error` naming the step; a paused one is `retryable` and keeps its scenes, and `POST /api/generation-runs/<runId>/retry` (`{ commandId }`) resumes it at that step, after which the job reads `running` again. `step` no longer reports `generating_tts` or `persisting` (narration is part of each scene, and each scene is saved as it is generated); it adds `generating_media` for the images and videos that finish after the last scene.
  - A submission is refused up front, before any run exists, instead of becoming a job that fails: `400 MISSING_MODEL` when the outline or actions slot, or every scene content type (`course.content.<type>`, which inherits `course.content` and `llm`), resolves to no model (none configured, or the slot turned off), `400 MISSING_API_KEY` when its provider needs a key it lacks, `400 INVALID_URL` for an endpoint the workspace may not use, `400 MODEL_CONFIG_INVALID` for an option only the deployment may set (Bedrock, a proxy). Bodies are capped at 64 KiB (`413`) and requirements at 20 000 characters. The checks run in this order: the body, the models, the materials, the limit. When only some scene types resolve, the submission is accepted: the outline does not avoid the others, and a scene of such a type pauses the run at its content step.
  - Runs are limited per owner: `429 ACTIVE_RUN_LIMIT` when the owner already has `OPENMAIC_MAX_ACTIVE_RUNS_PER_OWNER` runs in progress (default 2). A paused run, like one waiting for its outline to be confirmed, holds no worker and does not count; a step Retry makes it count again and answers the same `429` over the limit (as `confirm-outline` does).
  - Courses are written as they generate: the course exists (read-only to other writers) from its first scene, each scene is narrated before it is appended, and images and videos are generated alongside. A narration provider failure the retries cannot overcome pauses the run instead of leaving clips silent; a clip the asset store refuses is left silent and counted in `result.warning`, as is a failed image or video, which does not fail the job either (the retryable ones have a Retry on the run). The counts survive the compaction of finished runs. `result.ttsCoverage` is removed, and so are `TTS_MIN_INTERVAL_MS` and `TTS_BACKOFF_BUDGET_MS`, which only the removed TTS pass read.
  - Document images found by material extraction are stored as assets of the course and can be placed on slides; the removed pipeline used the extracted text only.
  - The `generate-classroom` LLM stage key is removed (nothing resolves through it); an `x-model-routes` header naming it gets the unknown-stage warning, and the `MODEL_ROUTES` migration table keeps its row.
  - Pre-release builds of this line created a `classroom_generation_jobs` table (schema store `classroom-generation-jobs`); it is no longer created or read, and is left untouched in databases that have it.
- Deployment: OpenMAIC needs a long-running Node.js process with PostgreSQL, the Docker image (`docker compose` or on its own) or `pnpm start` ([#1754](https://github.com/THU-MAIC/OpenMAIC/discussions/1754), F). Generation runs execute in a worker inside the server process and continue after the request that started them, so serverless hosts, Vercel included, are not supported. `vercel.json` is removed, and the build always produces the standalone output (the `VERCEL` build switch in `next.config.ts` is gone). Serverless deployment is supported up to 1.1.x: the README describes deploying the `release/1.1.x` branch on Vercel (Vercel's deploy button cannot select a branch whose name contains a slash), and such a deployment moves to a long-running host without losing data when the new host uses the same database and address. The deployment docs gain the required configuration (`DATABASE_URL`, an identity mode, and for several instances `OPENMAIC_SECRET_KEY` and one shared data directory, where uploaded materials live), the generation run variables and an "Upgrading from 1.1.x" table.
- Model configuration is server-side ([#1701](https://github.com/THU-MAIC/OpenMAIC/discussions/1701)): models and providers come from `openmaic.yml` or the settings (**Token Plan**, **Model Services** and **Course Model Config**, see Features), not from the browser. `MODEL_ROUTES` is no longer read (see below); with `openmaic.yml` it is ignored with a notice. The `pbl-chat` and `maic-agent` stage keys, which nothing resolved, are removed. The provider variables, `server-providers.yml`, `DEFAULT_MODEL` and `MODEL_FALLBACK` keep working while there is no `openmaic.yml` and are deprecated; with `openmaic.yml` they configure nothing on their own and are referenced from the file as `${VAR}`. [#1731](https://github.com/THU-MAIC/OpenMAIC/pull/1731) [#1732](https://github.com/THU-MAIC/OpenMAIC/pull/1732) [#1735](https://github.com/THU-MAIC/OpenMAIC/pull/1735)
- **`MODEL_ROUTES` without `openmaic.yml` stops the server at startup** (`MODEL_ROUTES does not carry over to the model configuration: ...`). Earlier releases required `MODEL_ROUTES` for the agent runtime (a `maic-agent-driver` route), so every deployment that runs the Pro agent must migrate before upgrading: write `openmaic.yml` and remove `MODEL_ROUTES`. Each route becomes the slot of its stage: `maic-agent-driver` → `agent` (its `api` and `contextWindow` move to the slot; a thinking `effort` is refused there as before), `conversation-title` → `agent.title` (unset, it follows `agent`), `scene-outlines-stream` → `course.outline`, `scene-content` and `scene-content:slide|quiz|interactive|pbl` → `course.content` and `course.content.slide|quiz|interactive|pbl`, `scene-actions` → `course.actions`, `agent-profiles` → `course.agents`, `web-search-query-rewrite` → `course.research`, `chat-adapter`, `quiz-grade` and `pbl-v2-runtime` (with its `:instructor`, `:open-task`, `:evaluate`, `:simulator` variants) → `classroom`, `generate-classroom` → `llm`. Stages that share a slot take one model. A route's `thinking` moves to the slot. See "Migrating from the legacy configuration" in the configuration docs for a worked example.
- Model configuration: the browser holds no provider state and sends none. Providers, keys, endpoints, model and provider ids, thinking settings, per-stage routes, Token Plan enrollment and per-capability selections are removed from the settings store; the Token Plan, Model Services and Course Model Config sections read and write the workspace's configuration on the server instead (see Features); the client no longer sends `x-api-key`, `x-base-url`, `x-model`, `x-model-routes`, `x-image-*`, `x-video-*`, `x-*-provider` or the key, endpoint, provider and model body fields. A browser's own settings are imported once (see Features). [#1735](https://github.com/THU-MAIC/OpenMAIC/pull/1735) [#1737](https://github.com/THU-MAIC/OpenMAIC/pull/1737) [#1744](https://github.com/THU-MAIC/OpenMAIC/pull/1744) [#1767](https://github.com/THU-MAIC/OpenMAIC/pull/1767)
- Deprecated request fields: `x-model`, `x-api-key`, `x-base-url`, `x-provider-type`, `x-model-routes`, `x-image-provider`, `x-image-model`, `x-video-provider`, `x-video-model` and the equivalent body fields of the speech, search and document routes are honoured only while the slot they would affect has nothing assigned or, on a server still configured through the legacy variables, only a default those translate to (a default in `openmaic.yml`, a workspace's own choice and a locked slot win, and a slot set to `null` refuses the request), and not at all under `allowUserKeys: false`, which also refuses the header form of the provider test routes. The server logs a warning the first time a request names its own language model. They will be removed two minor versions after the model settings ship.
- `POST /api/generate-classroom` takes `{ requirement, materialIds? }`. Documents are uploaded first with `POST /api/materials` (`X-Material-Filename`, the bytes as the body) as the same owner (in anonymous-cookie mode, keep one cookie jar for the upload, the submission and the polls), referenced by id, and deleted with the new `DELETE /api/materials/<id>` once the job is finished. `pdfContent` is refused with `400 INVALID_REQUEST`; `enableWebSearch`, `enableImageGeneration`, `enableVideoGeneration`, `enableTTS`, `agentMode`, `webSearchProviderId`, `webSearchApiKey`, `webSearchModelId` and `baiduSubSources` are removed and ignored. Web search, images, video and narration run whenever the server configures them, and the new `GET /api/generate-classroom/capabilities` reports what is configured and which upload types this server can extract. `materialIds` takes at most 5 ids, 150 MiB in total, of types an available extractor reads, and unknown, foreign, unfinished and deleted ids share one answer; each owner's material library is capped (100 files / 2 GiB by default). The server never fetches caller-supplied URLs. The job record's `inputSummary` (`requirementPreview`, `hasPdf`, `pdfTextLength`, `pdfImageCount`, kept in the old `data/classroom-jobs` files and never part of the poll response) is removed. Uploads and materials are owner-scoped like jobs. [#1728](https://github.com/THU-MAIC/OpenMAIC/pull/1728)
- Generation runs on the server (see Features): a run keeps going when the page that started it is left or closed, and once its outline is confirmed it has no stop or pause; deleting the course ends it at its next step. A course is read-only to every other writer until its run completes or ends: content writes through the document store (`saveDocument`, `putStage`, `putScene`, `deleteScene`) and `generation-complete` answer `409 COURSE_GENERATING` on the stage routes, `403` with that code on `/api/persistence` and an error to the Pro agent's tools; deleting the course and moving it between folders stay allowed. A run paused at a failed step keeps its course read-only until a Retry completes it or the course is deleted. [#1759](https://github.com/THU-MAIC/OpenMAIC/pull/1759) [#1761](https://github.com/THU-MAIC/OpenMAIC/pull/1761)
- The per-step generation routes the browser called in 1.1.x are removed; course generation runs on the server ([#1754](https://github.com/THU-MAIC/OpenMAIC/discussions/1754), E4). Start a run with `POST /api/generation-runs` (or `POST /api/generate-classroom` for a headless caller) and follow it instead:
  - `POST /api/generate/scene-outlines-stream` is removed; use generation runs.
  - `POST /api/generate/agent-profiles` is removed; use generation runs.
  - `POST /api/generate/scene-content` is removed; use generation runs.
  - `POST /api/generate/scene-actions` is removed; use generation runs.
  - `POST /api/extract-document` is removed; use generation runs (upload materials with `POST /api/materials`).
  - `POST /api/web-search` is removed; use generation runs.
- Courses interrupted in the browser before 1.2.0 are not resumed; their remaining scenes show as interrupted ("Generation was interrupted", with no Retry). The scenes they have keep working, and images and videos of those courses that were never generated are offered as Retry rather than generated on open.
- Embedders: the browser storage seams (`configureDocumentStorage`, `configureRuntimeStorage`, `configureAssetPoolStorage`) have no IndexedDB fallback any more. The browser bootstrap configures the HTTP stores; code outside the browser must configure a `store`, and resolving an unconfigured seam throws. [#1710](https://github.com/THU-MAIC/OpenMAIC/pull/1710)

#### Deprecated

- `document_stages.owner_id`: the document store no longer reads or writes it (only the boot backfill reads it, and a claim mirrors the new owner into it while it exists, so a rollback still finds consistent ownership). Existing installations keep the column (made nullable, its default removed) for this release so a rollback still finds it; it will be dropped in the next release.

#### Upgrade notes

- Anonymous identities: existing 30-day `anonymous_id` cookies are renewed to 400 days on their next API request, and every response of an owner-scoped route that resolves to an anonymous cookie now carries a `Set-Cookie` renewing it. A browser that loses the cookie (a manual clear, or 400 days without use) gets a new owner, and cannot reach the earlier anonymous library, or a pending legacy import bound to it, from that browser: anonymous identity has no other key. Use single-user mode (the Compose default) for a personal installation, or accounts (owner auth methods) for many users.
- Schema versions: every start now records which schema version each store of the database is at, in a new `openmaic_schema_migrations` table, and applies only what is missing, in order, under the existing bootstrap lock (waited on for at most five minutes, then the start fails naming the lock). One-time steps (the `stage_meta` ownership adoption, the `document_stages.owner_id` retirement, the owner-material `asset_id` drop, the agent-session owner-event constraint swap) run once per database instead of on every start. The first start on an existing database (1.1.x or a development build) runs every store's baseline statement by statement, outside a transaction, exactly as earlier starts ran it (the same locks, released as each statement finishes), and records it afterwards; a start interrupted part-way runs it again. A migration that fails is reported with its store, version and name and retried on the next request. The server exits at startup (`[boot] Server startup failed ... SchemaVersionAheadError`) if the database records a version of any store, including those of features not in use, that is newer than the release knows: it was upgraded by a newer release, so run that release or a later one, or restore a backup taken before it. Releases before 1.2.0 do not read the table; rolling back to one still requires the ownership copy-back above (courses 1.2.0 creates have no `document_stages.owner_id`), otherwise restore a backup taken before the upgrade. A changed checksum of an applied migration only logs a warning in production (and stops a development or test server). Schema bootstrap needs a direct or session-pooled PostgreSQL connection; a pooler in transaction mode (PgBouncer `pool_mode = transaction`) is not supported.
- The first start creates the `owner_merges` table (with the `stage_meta` and owner-material schemas). Nothing is claimed until a claim is triggered; the default trigger is the explicit `POST /api/identity/claim`.
- The first start on an existing installation changes `document_stages` under table locks. `CREATE INDEX document_stages_folder_idx` builds the new index under a SHARE lock, which blocks writes to `document_stages` for the length of the build. `DROP INDEX` of `document_stages_owner_idx` / `document_stages_owner_folder_idx` takes a brief ACCESS EXCLUSIVE lock. If a host added `NOT NULL` or a default to `owner_id`, `ALTER TABLE ... DROP NOT NULL` / `DROP DEFAULT` also takes ACCESS EXCLUSIVE, which blocks reads too and waits behind any open transaction on the table. Upgrade in a quiet window, or start one instance first and let it finish before the rest start (concurrent starts are serialized anyway; see Bug Fixes). Once done, later starts change nothing.
- To keep the index build off the start path on a large table, create the index and drop the old ones yourself beforehand, outside a transaction: `CREATE INDEX CONCURRENTLY IF NOT EXISTS document_stages_folder_idx ON document_stages (folder_id, id) WHERE folder_id IS NOT NULL;`, `DROP INDEX CONCURRENTLY IF EXISTS document_stages_owner_idx;`, `DROP INDEX CONCURRENTLY IF EXISTS document_stages_owner_folder_idx;`. The start then builds and drops nothing. It still takes and releases the same momentary SHARE lock that every other `CREATE INDEX IF NOT EXISTS` in the schema takes on each start.
- Classrooms an earlier version stored under `data/classrooms` (or `OPENMAIC_CLASSROOMS_DIR`) are imported once, in the background after startup, retried with backoff until the import completes: each keeps its id (its link shows not-found until its import lands), its own `/api/classroom-media` media and narration move to the asset pool, and the outcome is recorded in the new `legacy_classroom_imports` table, so later starts skip it. An id another course already holds is skipped and that course stays as it is; so are invalid files and reservation placeholders, decided before any media is stored, and creates the host refuses, whose stored media is released. When the owner's asset store is full the run stops, records nothing for the classrooms it did not import, releases what it had stored for the current one while it is still unclaimed, logs it, and tries again later. A classroom whose import fails otherwise is retried and, after three failed attempts, skipped with its last error. One instance imports at a time. Imported classrooms belong to the shared team owner or the single user when one is configured, otherwise to a dedicated owner (`system:legacy-classrooms`): they open read-only from their old link and appear in no visitor's library. The files are not deleted; keep the directory, since imported classrooms may still reference other classrooms' files and agent-run courses still serve media from it.
- Rolling upgrades: jobs an older instance recorded under `data/classroom-jobs` are not migrated, and polling them answers `404`. An older instance still running during the upgrade may finish a classroom the importer had skipped as a reservation placeholder; that file is not imported later.
- Media capabilities after an upgrade with the legacy configuration: the first configured TTS, ASR, image, video and document provider, and the first search provider in the old priority order, become server defaults, so these capabilities are on wherever the server configures a provider. This keeps the earlier behaviour of the web app, which switched image, video and narration on at a browser's first visit whenever the server had a provider for them, and gave the classroom chat and the agent web search whenever a search provider was configured. Two things change: course generation now researches the web whenever web search is on (it was an opt-in switch, off by default), and headless `/api/generate-classroom` jobs use every configured capability (the request flags defaulted to off). A workspace switches any of them off in **Settings → Course Model Config**; a deployment that wants one off for everybody sets its slot to `null` in `openmaic.yml` and names it in `lock`.
- Settings stored in a browser by an earlier version (providers with their keys and base URLs, the chosen model, token plan enrollment and each capability's selection) are imported into the workspace once, never replacing a workspace setting or a slot in a subtree `openmaic.yml` locks. Not carried over, to set up again: per-stage models, thinking settings, custom speech and transcription providers, AliDocMind's key pair, the VoxCPM backend and Baidu search sub-sources (the custom providers and the key pair stay in the browser with their keys, listed in Settings → Model Services). Speech input switched off becomes `asr: null`, and narration, images or video switched off while a usable provider for them was set up become `tts: null`, `image: null` or `video: null`. The research switch is not carried over (it only stopped course research; chat and the agent kept searching), nor is a switch that was off only by default: each capability now runs whenever its slot resolves.
- Keys saved in the model settings are encrypted under `OPENMAIC_SECRET_KEY`, or, when it is unset, under a secret generated on first use in `data/instance-secret.key`. Set `OPENMAIC_SECRET_KEY` when several replicas share the database, when `data/` does not survive a restart (a container without a volume) and when the working directory is read-only (saving a key fails there otherwise); back up the secret file with the database otherwise. Keys sealed under a lost or different secret cannot be read (the settings mark them) and have to be entered again. [#1733](https://github.com/THU-MAIC/OpenMAIC/pull/1733) [#1783](https://github.com/THU-MAIC/OpenMAIC/pull/1783) The server warns at startup when `OPENMAIC_SECRET_KEY` is unset and the data directory is not writable, and when stored keys were sealed under a different secret than the current one; it still starts.

#### Features

- One-way import of browser data from earlier builds (temporary). On the first load after the upgrade, once the page is idle, the client moves what an earlier build kept in the browser to the server, for the owner the server resolves: courses from the browser document store and the original tables with their chat, learner runtime, playback position, agent roster, folders and membership, pre-runtime quiz state and media; media bytes of server courses from earlier opt-in server builds that only the old browser tables hold; and device-only rows (generation failure records, bytes a full store refused, auto-voice reference clips) into the device cache. It runs once per browser: the server binds the browser's random id to the first owner that asks (the new `legacy_import_bindings` table and `POST /api/identity/legacy-import-binding`, an atomic insert that answers only whether the requesting owner holds the browser), a claim carries the binding to the account (a new claim participant), and owner resolution refuses every importer request (`X-OpenMAIC-Legacy-Import`) of an owner that does not hold the binding with `409 LEGACY_IMPORT_NOT_BOUND`; any other owner later using the same browser gets nothing imported. It is automatic and silent (problems are logged under `[legacy-browser-import]`), never writes to the old browser storage, keeps one ledger per browser (a random browser id and no owner information) so it resumes after an interruption and never imports twice (Clear Local Cache keeps it, and keeps the pre-runtime quiz keys until the import is complete), and serializes tabs with Web Locks. A course the owner already has on the server stays as the server has it; one whose id another owner holds is imported under a new id derived from the browser id; one deleted on the server stays deleted. Transient failures and 401s are retried on later loads with backoff; when the asset store is full the course is imported anyway and its media waits where the app's own retry finds it; media the server refuses for good shows the ordinary failed-media state (without Retry when nothing could regenerate it). A course the old browser storage cannot read holds up only what it could affect, and settles after five failing runs over a day (the older table copy when there is one, otherwise skipped with the reason). A browser whose data another owner holds asks the server again only every ten minutes, and opens the old databases only once it is bound. The module (`lib/legacy-browser-import/`) will be removed a few releases later; its README lists the steps.

- Owner identity: a built-in `singleUser` owner for personal installations. `OWNER_SINGLE_USER=true` resolves every request to one owner (`OWNER_SINGLE_USER_ID`, default `local`) with `kind: 'user'` and `course:publish`, minting no anonymous cookie; the principal gets a claim candidate from an anonymous cookie the browser still carries, so earlier anonymous work can be claimed into it explicitly (`POST /api/identity/claim`; `OWNER_CLAIM_TRIGGER=auto` would merge every visiting browser's anonymous library, so it is not a default). It runs with or without `ACCESS_CODE`; without one the server logs one prominent startup warning (in place of the generic unset-`ACCESS_CODE` warning) that anyone who can reach it shares, edits and can delete the single library. It excludes `PERSISTENCE_SHARED_OWNER_ID`; hosts may register `singleUserAuthMethod()` last, under the same rules as `sharedTeamAuthMethod()`. Malformed values fail startup. The app warns at startup when published beyond loopback (`OPENMAIC_PUBLISH_ADDRESS`, which the Compose file passes to it) with the Compose default PostgreSQL password.
- Owner identity: one resolution entry point with composable auth methods. A host registers an ordered list of `OwnerAuthMethod`s once from `instrumentation.ts` with `configureOwnerAuthentication({ methods, anonymousFallback? })` (single-shot, sealed on first use, validated at boot). Each method answers `authenticated`, `not-applicable` (no credential of its kind) or `invalid` (its credential is present but bad); core keeps the first `authenticated` answer, refuses any `invalid` answer with `401 INVALID_CREDENTIAL` without asking later methods, and when no method applies falls back to the anonymous cookie owner, or answers `401` with `anonymousFallback: false`. Route handlers and Server Actions ask the same methods in the same order, once per request. `PERSISTENCE_SHARED_OWNER_ID` still selects the `sharedTeam` owner on its own; beside host methods it is kept by listing `sharedTeamAuthMethod()` last, and setting the variable while a registration leaves it out fails startup. Identity gateways are covered by a documented recipe (a host method that verifies the gateway's signed JWT against the identity provider's keys), not by a built-in. Host methods live in `lib/server/identity/host/`, the only place the boundary test lets code read gateway identity headers or an incoming `Authorization` header. On `403 OWNER_RETIRED`, core calls `clearCredential` only on the anonymous fallback and on methods that declare `issuesAnonymousOwners: true`, never on an account method. The unreleased `OWNER_AUTHENTICATOR` / `TRUSTED_PROXY_*` variables of an earlier built-in gateway-header authenticator fail startup when set.
- Owner identity: claiming anonymous work into an account. When a host auth method authenticates a non-anonymous principal and the same request also carries a valid anonymous owner cookie, core attaches a `pendingClaim` naming that anonymous owner (never for an anonymous principal or the built-in `sharedTeam`, and a method cannot set one itself), which covers both an anonymous-then-sign-in flow and a deployment moving from anonymous use to accounts. `POST /api/identity/claim` (same-origin JSON only; `OWNER_CLAIM_TRIGGER=auto` claims on the first request carrying a pending claim, except the explicit claim routes) moves the anonymous owner's folders, courses, materials, agent sessions, skills, runtime sessions and asset entries to the account in one transaction, records it in the new `owner_merges` table, and drops the anonymous cookie. Same-named folders merge, a folder id the account already uses is renumbered, a colliding skill handle gets the first free numeric suffix, runtime sessions are re-keyed as stored, and quotas are not applied to what moves. Claims are idempotent per pair, refused for an anonymous owner another account already claimed, and never chain. A retired anonymous id writes nothing afterwards: creates and writes through `/api/persistence`, the folder, course, material and skill routes, and writes by id to moved rows answer `403 OWNER_RETIRED`, with a `Set-Cookie` that drops the retired cookie. Agent runs, generated media and skills created by a run that started before the claim follow it to the account. Every owner write takes a per-owner advisory lock first, so a fenced write racing a claim is moved or refused; lock waits are bounded (`OWNER_CLAIM_LOCK_WAIT_MS`, `OWNER_WRITE_LOCK_WAIT_MS`) and running out answers `503 OWNER_BUSY` with `Retry-After`. The anonymous cookie is a bearer credential: its holder can claim that anonymous work into a signed-in account, so clear it on shared devices. Hosts add their own tables with `registerClaimParticipant`, and an auth method may implement `describeStoredOwner` and `clearCredential`; `principalFromStoredOwner(ownerId)` describes a stored id for work without a request. The runtime contract's `POST /runtime/learners/merge` now performs the same claim, allowed only from the request's own pending claim. The owner-events stream tells a retired owner only that it moved, never the account's id.
- `@openmaic/storage` 0.37.0: versioned schema migrations for the PostgreSQL backends. Each backend declares an ordered list (`DOCUMENT_PG_MIGRATIONS`, `RUNTIME_PG_MIGRATIONS`, `ASSET_PG_MIGRATIONS`, `AGENT_SESSION_PG_MIGRATIONS`, `AGENT_SESSION_MATERIAL_PG_MIGRATIONS`, `USER_SKILL_PG_MIGRATIONS`) whose version 1 is the DDL earlier releases ran on every start, run statement by statement outside a transaction, and `applySchemaMigrations(queryable, { store, migrations }, { lockTimeoutMs? })` (`@openmaic/storage/pg-migrations`) applies the pending ones under a session-level advisory lock waited on for a bounded time (`SchemaLockTimeoutError`), each later migration in a transaction with its record unless it sets `transaction: false`, recording `(store, version, name, checksum, applied_at)` in `openmaic_schema_migrations`. The `ensure*Schema` functions keep their signatures and now run their store's migrations: they are safe to call from several instances at once, accept a pool, a checked-out client, a connected `pg.Client` or PGlite, and refuse a connection inside an open transaction (`SchemaMigrationInTransactionError`) instead of committing the caller's work. A database that records a newer version of a store than the code knows is refused with `SchemaVersionAheadError`; a changed checksum of an applied migration throws `SchemaMigrationChecksumError` outside production and warns under `NODE_ENV=production`. `verifySchemaMigrations(queryable, sets)` makes both checks read-only. One-time steps now run once per database: the `document_stages.owner_id` retirement (relaxing `NOT NULL` / default, dropping its two indexes) is document version 2, and the owner-event type constraint swap is agent-session version 2, so `DOCUMENT_PG_SCHEMA` and `AGENT_SESSION_PG_SCHEMA`, now every migration's SQL concatenated, list those statements last. A table-name override is recorded as a store of its own. `splitSqlStatements` no longer drops a last statement that has no terminating semicolon. [#1757](https://github.com/THU-MAIC/OpenMAIC/pull/1757)
- `@openmaic/storage` 0.36.0: `PgAssetStore.releasePending(principal, ref)` deletes an entry only while it is still an unclaimed allocation (the principal's, pending, and named by no document), and answers whether it did. It locks the pending entry and then checks references in a separate statement, like the collector's entry pass, so a reference a concurrent backfill commits is never cascaded away. A writer that allocated ids and then failed to write the document naming them can release them at once without risking an entry a document did commit.
- `@openmaic/storage` 0.35.1: `reassignDocumentFolders(tx, { fromOwnerId, toOwnerId, documentOwnership })` moves one owner's folders and filing to another (merging same-named folders, renumbering colliding ids); `PgAssetStore.reassignPrincipal(fromKey, toKey)` moves a principal's entries under both principals' write locks; `PgUserSkillStore.mergeOwner(from, to)` moves skills, renaming a handle the target holds to one neither side holds; `PgRuntimeStore.reassignLearner(from, to)` re-keys sessions without re-validating them. `PgUserSkillStore` (`resolveFinalOwner`) and `PgRuntimeStore` (`resolveFinalLearner`) take a hook that runs as the create transaction's first statement. Every HTTP handler (runtime, documents, assets) now answers a `DocumentWriteRefusedError` as `403` with its code, and the new `StorageBusyError(code, message, retryAfterSeconds)` as `503` with its code and `Retry-After`. `PgUserSkillStore.list` orders ties by id.
- Server persistence: host extension hooks, registered once from `instrumentation.ts` next to the owner auth methods and sealed on first use. `configurePersistenceHooks` adds `authorizeCreate` / `onCreate` (run once per created course inside its transaction; a refusal answers `403 CREATE_REFUSED` and a throw rolls the create back), a `library` provider for what `GET /api/stages` lists (never an id the read path would refuse), and `beforeAssetAllocate` (refuse an upload, `create` or `replace`, with any `Response` before bytes are stored or quota counted). Hooks receive an `actor` whose `source` is `'request'` (with the resolved principal) or `'background'` (an agent run; a refusal reaches the agent as a fixed message). `configureAssetByteStore` replaces the `ASSET_S3_BUCKET` switch for the request path and the asset collector alike; under `ASSET_BYTE_EGRESS=redirect` a store that does not declare `signsReadUrls` stops the server at boot. Nothing changes when no hook is registered.
- `@openmaic/storage` 0.33.0: `DocumentWriteRefusedError(stageId, code, message)` lets a store refuse a write as policy; the document HTTP handler answers `403` with the error's code and applies nothing. `isDocumentWriteRefusedError` also recognizes one thrown by another copy of the package, by name and shape.
- Server persistence: `ServerPersistenceProvider` (`lib/persistence/server-provider.ts`) no longer exposes an unscoped `documentStore`, which wrote courses with no owner check and no host hooks. Use the owner-bound store (`createOwnerBoundDocumentStore`, or `getOwnerScopedDocumentStore`).
- Owner identity: `POST /api/chat/pi` answers `401` when owner resolution refuses the request, like every other owner-resolving route, instead of continuing without an owner. Under the default anonymous fallback nothing changes.
- Agent registry on the server ([#1754](https://github.com/THU-MAIC/OpenMAIC/discussions/1754), G). Built-in agents stay in code (read-only, updated and translated with releases); an owner's custom agents are stored in a new owner-scoped `owner_agents` table (schema store `owner-agents`) instead of the browser's `agent-registry-storage`. `GET /api/agents` lists the built-in agents (`readOnly: true`) and then the owner's own; `POST /api/agents` creates one and `PUT` / `DELETE /api/agents/:id` change or delete one, checked with the same schema the browser uses (at most 100 per owner); built-in agents answer `403 BUILT_IN_AGENT_READ_ONLY`. A claim moves the anonymous owner's agents to the account, which keeps its own agent where both use an id. On the server, `resolveAgentsForOwner(ownerId, agentIds)` (`lib/server/agents/registry.ts`) resolves ids to agents and throws `UnknownAgentsError` listing the unknown ones. The browser registry reads and writes through the API and no longer writes localStorage; the custom agents an earlier build kept there are imported in the background, through the legacy importer's binding and fence (`POST /api/agents/import`), and the import stays open (the browser copy kept, Clear Local Cache included) until every one of them is on the server. [#1758](https://github.com/THU-MAIC/OpenMAIC/pull/1758)
- Capability slots ([#1701](https://github.com/THU-MAIC/OpenMAIC/discussions/1701)): every model and provider call resolves through one slot of a fixed tree: `llm` with `course.research`, `course.outline`, `course.agents`, `course.content` (and `course.content.slide` / `quiz` / `interactive` / `pbl`), `course.actions`, `classroom` and `agent` (requires tool calling) with `agent.title` (`openmaic.yml` only); and the roots `tts`, `asr`, `image`, `video`, `webSearch` and `document`. A slot without an assignment follows its parent; `null` turns a capability off for its subtree (whatever a request names); a root with nothing assigned fails loudly instead of falling back to any vendor. A slot in a subtree `openmaic.yml` locks resolves from the file alone; any other slot takes the workspace's own assignment found anywhere from the slot up to the root, and only without one the server's default (`slots` in `openmaic.yml`, or the translated `DEFAULT_MODEL` and friends), so whatever a user changes wins and a slot that follows its parent follows the user's choice there. Resolution runs at request time for the request's owner and in background work for the owner it works for (following a claim). Requirements are checked on the slot that declares them. Language-model slots take a `fallback`, used by `callLLM` and, as the last attempt before anything has streamed, by streaming calls; a slot-resolved model no longer retries on `MODEL_FALLBACK`, and a fallback on any other slot is refused. Browserless outlines resolve `course.outline` instead of the `generate-classroom` model. Media, search, document extraction, narration and the agent runtime's tools resolve through their slots too, keeping the `<CAP>_<VENDOR>_ENABLED=false` switches in force. [#1726](https://github.com/THU-MAIC/OpenMAIC/pull/1726) [#1729](https://github.com/THU-MAIC/OpenMAIC/pull/1729) [#1734](https://github.com/THU-MAIC/OpenMAIC/pull/1734) [#1735](https://github.com/THU-MAIC/OpenMAIC/pull/1735) [#1737](https://github.com/THU-MAIC/OpenMAIC/pull/1737) [#1739](https://github.com/THU-MAIC/OpenMAIC/pull/1739) [#1743](https://github.com/THU-MAIC/OpenMAIC/pull/1743)
- `openmaic.yml`: the deployment's model configuration, read at startup from the working directory (`/app` in the Docker image) or the file `OPENMAIC_CONFIG` names (which must then exist). It declares `providers` (`{ preset, apiKey, baseUrl, proxy, credentials, options }`, from built-in presets including the four token plans and `openai-compatible`), `slots`, the server's defaults that users may change in the model settings (`provider:model`, a provider-only reference for search and document services, `null`, or `{ model, thinking, fallback, api, contextWindow }`), `lock` (`[slot, ...]` or `all`: slots fixed for everyone, each with its whole subtree; every slot listed must be written under `slots`) and `allowUserKeys` (default `true`; `false` keeps users from adding providers, keys and token plans and stops using the ones they added). A `policy` key is refused, naming `allowUserKeys`. `${VAR}` is interpolated in every string and an unset or empty variable is an error; the schema is strict and every problem is reported at once by its path, and an invalid file stops the server at startup. Without the file, the provider variables, `server-providers.yml`, `DEFAULT_MODEL` and `MODEL_FALLBACK` are translated at startup into providers and defaults (`DEFAULT_MODEL` for `llm`; the provider the server used to pick, or `DEFAULT_IMAGE_PROVIDER`, for the media, search and document roots) with a deprecation notice. A new `openmaic.example.yml`; Docker mounts the file at run time and `.dockerignore` keeps it out of images. The configuration docs are rebuilt around it, in every locale. [#1727](https://github.com/THU-MAIC/OpenMAIC/pull/1727) [#1731](https://github.com/THU-MAIC/OpenMAIC/pull/1731) [#1732](https://github.com/THU-MAIC/OpenMAIC/pull/1732) [#1737](https://github.com/THU-MAIC/OpenMAIC/pull/1737) [#1742](https://github.com/THU-MAIC/OpenMAIC/pull/1742) [#1744](https://github.com/THU-MAIC/OpenMAIC/pull/1744) [#1750](https://github.com/THU-MAIC/OpenMAIC/pull/1750)
- Model settings on the server: **Token Plan**, **Model Services** and **Course Model Config** read and write the workspace's model configuration through the new `GET` / `PUT /api/model-config` (one change per request against a `revision`; `409 CONFLICT`, `409 SLOT_LOCKED` for any slot in a locked subtree). The view carries each slot's `source` (`default`, `workspace`, `locked`, `inherited` with the slot it follows, or `unconfigured`), whether it is `locked`, the `serverDefault` written on it, and the deployment's `allowUserKeys`. The settings take one of three shapes derived from it: **set it up yourself** (`allowUserKeys` on: Token Plan, Model Services and Course Model Config), **choose a model** (`allowUserKeys: false`: only Course Model Config, among the deployment's providers) and **configured by the administrator** (everything locked: the course model diagram, every card read-only). A control is shown only where using it can change something: a Model Services tab and adding a service only while its capability has a slot a user may set, Token Plan only while a plan can fill a slot that is not locked (connecting never touches a locked one), a locked card as one read-only line marked **Fixed by the administrator**, a card on a server default marked **Server default** with **Reset to server default** once changed, and the home page model picker only when the default model can be changed (`llm` not locked, a language model to pick). Model Services keeps one tab per capability with its services: a service's key (write-only, shown masked), endpoint (chat services only) and model list are its workspace provider, and the deployment's services are shown read-only. Course Model Config is the course model map: each slot with its effective model and where it comes from, edited on the card (follow the parent, a model, off, a fallback, the thinking settings of a chat slot's own model); a capability's switch sets its slot to `null` and restores what it held. Connecting a token plan adds its provider and applies its recommended configuration (asking first before it replaces assignments the workspace made); disconnecting removes it. Test buttons and model lists name the saved provider (`provider` / `model` on the verify routes and `probe-models`, `previewProvider` / `previewModel` on speech and transcription), so no key leaves the browser. A workspace's settings are stored per owner in PostgreSQL with keys encrypted at rest (AES-256-GCM under the instance secret) and move with a claim. Workspace providers may not use Bedrock, a proxy or a key pair; a custom base URL is for chat presets only, validated as a caller-supplied endpoint; media, search and document services use their preset's public endpoint, except Azure Speech's official regional endpoints. The generation toolbar's model picker sets the default model (`llm`) with its thinking settings, which every slot that follows it uses (stages with a model of their own are shown in Course Model Config); the material popover's extractor select sets the `document` slot. [#1733](https://github.com/THU-MAIC/OpenMAIC/pull/1733) [#1740](https://github.com/THU-MAIC/OpenMAIC/pull/1740) [#1741](https://github.com/THU-MAIC/OpenMAIC/pull/1741) [#1744](https://github.com/THU-MAIC/OpenMAIC/pull/1744) [#1767](https://github.com/THU-MAIC/OpenMAIC/pull/1767) [#1780](https://github.com/THU-MAIC/OpenMAIC/pull/1780) [#1781](https://github.com/THU-MAIC/OpenMAIC/pull/1781) [#1784](https://github.com/THU-MAIC/OpenMAIC/pull/1784)
- One-time import of browser model settings (temporary): the settings store's migration turns what a browser kept (providers with keys or custom endpoints, enrolled token plans, the chosen model, per-capability selections, an explicit "speech input off") into a proposal for `POST /api/model-config/import`, staged before any field is dropped and sent through the legacy importer's binding. The import adds only what the workspace and the deployment do not already have and lists what it skipped; per-stage routes and the old per-browser media toggles are not imported. A setting leaves the browser only once the answer shows the workspace holding it (a provider only when the server holds the same key); anything skipped, refused or unconfirmed stays in the browser with its keys and is listed in Settings → Model Services until it is set up again or discarded (see Upgrade notes). [#1744](https://github.com/THU-MAIC/OpenMAIC/pull/1744) [#1784](https://github.com/THU-MAIC/OpenMAIC/pull/1784) [#1785](https://github.com/THU-MAIC/OpenMAIC/pull/1785) [#1787](https://github.com/THU-MAIC/OpenMAIC/pull/1787)
- Generation runs ([#1754](https://github.com/THU-MAIC/OpenMAIC/discussions/1754), E): a run is an owner-scoped PostgreSQL record (new schema store `generation-runs`: runs, per-step checkpoints, an ordered event log and idempotent commands) that executes the classic pipeline with the step functions shared with the routes (research, outline, agents, then per scene content, actions and narration) and commits a checkpoint after every step. A worker runs in every server process, whether or not `OPENMAIC_AGENT_RUNTIME_ENABLED` is set; another process takes a run over from its last checkpoint when its worker dies, and a step whose workers keep dying pauses the run. States: `preparing → outlining → awaiting_outline_confirmation → generating → completed`, plus `paused` (a step failed after its retries; Retry re-runs that step only) and `ended` (the course was deleted, or a run without a course discarded). The outline always waits for `confirm-outline` (`{ outlineRevision, outlines?, commandId }`) holding no worker, unless the run was started with `outlineReview: "auto"`. The course is created with the first scene, scenes are appended as they are narrated, and completion sets `generationComplete`. API (owner-scoped; another owner's run answers `404`): `POST /api/generation-runs`, `GET /api/generation-runs?active=1`, `GET` / `DELETE /api/generation-runs/<id>`, `GET /api/generation-runs/<id>/events?after=<seq>` (SSE with replay, `resync` and heartbeat), `POST …/confirm-outline`, `POST …/retry` and `GET /api/generation-runs/events` (the owner's run changes). Limits: `OPENMAIC_MAX_ACTIVE_RUNS_PER_OWNER` (default 2), `OPENMAIC_MAX_WAITING_RUNS_PER_OWNER` (10), `OPENMAIC_GENERATION_RUN_MAX_CONCURRENT` runs per process (4) and `OPENMAIC_GENERATION_RUN_STREAMS_PER_OWNER` (16); finished runs are compacted after `OPENMAIC_GENERATION_RUN_RETENTION_HOURS` (24). Outlines are capped at 100 scenes and 512 KiB, also in browser generation. [#1756](https://github.com/THU-MAIC/OpenMAIC/pull/1756) [#1759](https://github.com/THU-MAIC/OpenMAIC/pull/1759)
- Generation runs: a media lane generates the images and videos the outline asks for once the course exists, alongside the scenes and one item at a time, with a checkpoint per item: stored bytes commit with their checkpoint, a takeover places them instead of paying again, and a video takeover resumes the provider task it recorded. A slot that is off or unassigned skips its kind; a media failure never pauses the run and carries the route's code (`CONTENT_SENSITIVE`, `GENERATION_DISABLED`, `MISSING_MODEL`, `ASSET_QUOTA_EXCEEDED`, `MEDIA_PLACEMENT_FAILED`, `MEDIA_ELEMENT_REMOVED`). `POST …/retry` with `{ commandId, media: { elementId } }` runs one failed or skipped item again, also after completion, when its result is written into the current course without touching the author's other edits. The run snapshot includes `media`, and `media` events report each item. Images found in uploaded materials are stored as assets of the course and can be placed on slides. [#1761](https://github.com/THU-MAIC/OpenMAIC/pull/1761)
- Course materials are extracted when they are uploaded ([#1754](https://github.com/THU-MAIC/OpenMAIC/discussions/1754), E): `POST /api/materials` starts the extraction in the background (`?extract=false` defers it), and `GET /api/materials/<id>` (and the owner's list, `GET /api/materials` without `sessionId`) reports its `extraction`: `extracting`, `ready` (with `textChars`, `pageCount`, `imageCount` and what a course leaves out, `truncated`), or `failed` with the extractor's `error`; `POST /api/materials/<id>/extraction` extracts a failed one again. A background extractor in every server process holds each extraction under a lease (a restart resumes it; `OPENMAIC_MATERIAL_EXTRACTION_CONCURRENCY`, default 2), lets owners take turns (`OPENMAIC_MATERIAL_EXTRACTION_PER_OWNER`, default 2 running per owner), and stops the extractor's requests and commands when the material is deleted or the extraction runs out of time. The same file uploaded again by the same owner reuses its finished extraction when it would be extracted the same way (same type and services). The stored result counts against the owner's byte quota (checked when it is published; over it fails with `MATERIAL_QUOTA_EXCEEDED`) and is capped (`OPENMAIC_MATERIAL_EXTRACTION_MAX_RESULT_MB`, default 100; larger fails with `EXTRACTION_RESULT_TOO_LARGE`). Uploads no run or agent session uses are deleted once unread for `OPENMAIC_UNUSED_MATERIAL_TTL_HOURS` (default 24); an open composer reads its materials back to keep them, and the same sweep removes result files no attempt published. A run reads the stored extraction, waits for one still running, and fails with a failed one's error (Retry extracts it again). The composer uploads a file as soon as it is attached and shows its progress, parsing (or transcribing), ready or failed with Retry on the material; Generate waits until every material is ready, and the preview then opens without a material analysis. What a course leaves out of a long material is shown on the material instead of in the preview.

#### Bug Fixes

- Pro workspace: the course list shows a placeholder for a classic generation from the moment it starts, matching the home page's card (title, state, and opening the generation preview), and turns it into the course in place once the course exists.
- Pro workspace: a course that is still being generated shows its progress in the course list and a "being generated" placeholder in the classroom pane instead of a blank pane; it cannot be opened or @-mentioned until it completes, then opens automatically, and the agent is told it is read-only until generation completes.
- Classic generation no longer stalls at the outline when the preview is closed: the short pause before an outline continues now runs on the server (`outlineReview: "countdown"`, generation-runs migration 4), so the run continues with no page open, while opening the review mid-stream or during the pause holds it (`POST /api/generation-runs/<id>/hold-outline`) for editing as before; with "Always review outlines before generation" on, the run waits for the learner's confirmation in any tab.
- Home: the composer no longer keeps the last requirement as a draft; Generate creates the course card at once.
- Home: video thumbnails no longer leave failed requests in the browser's network panel on every load; each video is drawn from its poster, or from its opening frame (decoded once and cached) when it has none.
- Home: the course list shows as soon as the library loads, instead of waiting for every course's content and first-slide media; thumbnails load as cards come into view, a few at a time.
- Home: while the page loads, it shows its hero and a skeleton of the course library instead of a blank grey screen (in dark mode too), and the courses take the skeleton's place without moving.
- Home: course thumbnails are kept in the browser's local cache, so a reload shows unchanged courses at once without downloading their content and media again; a course that changed is read again, and Settings → Clear Local Cache clears them.
- Composer: the document extractor picker in the course-material popover is hidden when the deployment locks the `document` slot (`lock: [document]` or `lock: all`); uploading stays available.
- Token Plan: connecting TokenDance also assigns the Pro agent (`agent`) to `deepseek-v4.1-flash`; the default model stays the plan's own.
- Classroom: the page no longer logs a `404` for `/api/persistence/runtime/sessions/whiteboard:…` on every load and whiteboard open before anything was drawn; the learner whiteboard loads from the session listing.
- Pro workspace: a course generated on the server no longer shows a "Read-only" badge to its owner; only a course saved from Discover, or one still being generated, is shown read-only.
- Settings: with every slot locked (`lock: all`), Token Plan and Model Services are hidden, including a plan the workspace connected earlier and the Text-to-Speech tab for user voices; only the read-only course model map remains.
- Generation preview: no "document parsing" step any more. Materials are extracted when they are attached, so the run's material step is not shown; a failure there still pauses the run with Retry.
- Composer: the course-material popover lists materials as compact rows on the popover's type scale, with file-type icons, a thin progress bar and icon buttons for Retry and Remove.
- Editor: slide elements can be dragged, resized and rotated in Safari; the Pro-mode editor no longer throws on mouse-down where the `TouchEvent` API is missing (desktop Safari).
- Settings: Model Services scrolls its list to the selected service (by default the one in use, such as a connected token plan's provider further down the list), and the selected row no longer looks like the promoted first row, so the list always highlights the service the panel shows.
- Owner identity: a browser's first load establishes one anonymous owner. The page response now sets the `anonymous_id` cookie (same value format and attributes as before) when the request carries no valid one and neither `OWNER_SINGLE_USER` nor `PERSISTENCE_SHARED_OWNER_ID` is set, so the page's concurrent first API requests no longer each mint an owner and overwrite one another's cookie; a valid cookie is never replaced. `POST /api/identity/legacy-import-binding` binds only an owner the browser already presented (a request that minted its owner answers `409 OWNER_NOT_ESTABLISHED` and the importer retries on a later load), so the legacy import can no longer be bound to an owner whose cookie a later response replaced and then stall with `409 LEGACY_IMPORT_NOT_BOUND`. `OWNER_ANONYMOUS_PREMINT=false` turns page minting off (default on; a malformed value fails startup). Set it only when registered owner auth methods set `anonymousFallback: false`, and the server warns at startup when such a registration leaves it on; hosts that keep anonymous visitors keep it and skip it per request in `middleware.ts` for requests their methods authenticate (see "Registering methods" in the README).
- Owner identity: the anonymous identity lasts 400 days (the longest browsers keep a cookie) instead of 30, and is renewed while in use: every route handler and Server Action response that resolves to a valid anonymous cookie re-sends the same value with a fresh `Max-Age`, so an active visitor no longer loses the whole library 30 days after the first visit. Page responses do not renew it, so pages stay cacheable, and a response that clears the cookie (a claim, a retired owner) never renews it.
- Server persistence: the course library and folders work without the agent runtime. `/api/stages/**` (list, create, read, save, delete, manifest, scenes, freshness, status, generation-complete, publish, unpublish) and `/api/folders/**` now gate on `DATABASE_URL` alone instead of also requiring `OPENMAIC_AGENT_RUNTIME_ENABLED`, so a deployment with server persistence and the runtime off no longer answers `404` there and shows an empty, unavailable library. Agent routes (`/api/agent/**`, `/api/skills/**`) and the session-scoped material reads (`GET /api/materials`, `GET /api/materials/<id>`) still require the runtime, while uploading to and deleting from the owner's material library (`POST /api/materials`, `DELETE /api/materials/<id>`) needs only `DATABASE_URL`, and without a `DATABASE_URL` everything answers `404` as before. `GET /api/agent/runtime` also reports `persistence`.
- Startup: a configuration refused by the boot validation in `instrumentation.ts` (a malformed `ASSET_QUOTA_BYTES`, `ASSET_PENDING_TTL_MS`, `OWNER_WRITE_LOCK_WAIT_MS` or `OWNER_CLAIM_LOCK_WAIT_MS`; an `OWNER_CLAIM_TRIGGER` other than `explicit` / `auto`; the removed `OWNER_AUTHENTICATOR` / `TRUSTED_PROXY_*` variables; a malformed `PERSISTENCE_SHARED_OWNER_ID`, one without `ACCESS_CODE` or beside a registration that leaves out `sharedTeamAuthMethod()`, or `sharedTeamAuthMethod()` registered without it or not last; `ASSET_S3_BUCKET` beside a registered asset byte store, or `ASSET_BYTE_EGRESS=redirect` with a byte store that does not declare `signsReadUrls`) now exits the Node.js server with code `1` after one `[boot] Invalid server configuration` line carrying the original message. Any other boot failure (a module missing from the build, a host registration call that throws) also exits with code `1`, printed as `[boot] Server startup failed` with its stack. Previously the server logged "Failed to prepare server", kept listening, and answered every request with `500`. Warnings never stop the server.
- Server persistence: two concurrent creates of one new course id by the same owner no longer refuse the second as `reserved-document`: creates of one id take turns, and the second saves as an update without running the create hooks again.
- Server persistence: instances starting at the same time against one database no longer fail schema setup on a catalog race (`duplicate key value violates unique constraint "pg_class_relname_nsp_index"` / `pg_type_typname_nsp_index`, `tuple concurrently updated`), which made an instance's first request answer `500`. Every schema bootstrap (documents, `stage_meta` and its ownership backfill, owner materials, assets, runtime, agent sessions, session materials, user skills, and the asset collector's) now runs under one PostgreSQL advisory lock held on a dedicated connection.

#### Security

- Server persistence: operations on one owner-bound document store no longer share mutable state, so concurrent calls on a store an agent run shares with its tools each gate their own stage; `create_stage` also runs sequentially within a tool batch.
- Server persistence: runtime data of a deleted course reads as absent and takes no new writes, however the request path is spelled.
- `@openmaic/storage` 0.32.0: `PgDocumentStore` takes `assetReferencePrincipals` (and `AssetCollector` a matching per-owner function) so a document write can no longer commit or pin another principal's asset entry; a store can refuse `createSession` with `RuntimeStageNotFoundError` (`404 STAGE_NOT_FOUND`); and a session create over a taken id answers `409 SESSION_ALREADY_EXISTS` whoever holds it, instead of `403` for another learner's session.

</details>

## [1.1.3] - 2026-10-05

A security release. Course documents served by `/api/persistence` now carry only the slide HTML the renderer produces, on every write and every read. Read **Behavior Changes** before upgrading.

### Security

- Course documents: with server persistence enabled, `/api/persistence/documents/...` stored and returned slide HTML without sanitizing it. Document reads are capability-by-id, so anyone with a course link loads that course, and the classroom renders slide text, shape text, table cells and LaTeX snapshots as HTML. A course written through this path could therefore run script in the browser of anyone who opened its link. The owner-bound document store now applies the same sanitization policy as `/api/classroom` to the stage and scenes on every write and every read, so new documents are stored clean and documents stored earlier are served clean. [GHSA-6c52-8h4v-5xvg](https://github.com/THU-MAIC/OpenMAIC/security/advisories/GHSA-6c52-8h4v-5xvg) [#1799](https://github.com/THU-MAIC/OpenMAIC/pull/1799)

The same fix ships in [v1.2.0-rc.1](https://github.com/THU-MAIC/OpenMAIC/releases/tag/v1.2.0-rc.1).

### Behavior Changes

- Slide HTML written through `/api/persistence` is reduced to the renderer's formatting vocabulary (the policy `/api/classroom` already applies): scripts, event-handler attributes, `javascript:` URLs and embedded objects are removed, and inline styles are re-serialized without spaces (`text-align: center;` becomes `text-align:center`). Formatting the editor produces is kept.
- Documents already stored are not rewritten in the database; they are sanitized when read, and stored clean the next time they are saved.

## [1.1.2] - 2026-09-28

A security release. Server-side requests to provider URLs that a caller can choose now connect only to the addresses that passed validation and refuse redirects, and error responses no longer carry provider response bodies or connection details. Read **Behavior Changes** before upgrading.

### Security

- Provider connections: when a provider is not configured on the server, the settings UI can supply its own base URL, endpoint or model. Several routes validated such a URL once and then connected with a transport that resolved DNS again or followed redirects: PDF parsing and connectivity checks, the Azure voice list, model listing, image and video providers, and LLM calls. Some of these routes also echoed provider response bodies or connection errors back to the caller. This allowed requests to internal addresses and probing of internal services. These requests now go through the strict provider transport, which pins every connection to validated addresses and refuses redirects. IP-literal hosts and the built-in default URLs of unmanaged providers are held to the same policy. Caller-facing errors are fixed text. Client-supplied AliDocMind endpoints must be official hosts. [GHSA-g87c-cm4q-cw5x](https://github.com/THU-MAIC/OpenMAIC/security/advisories/GHSA-g87c-cm4q-cw5x) [#1704](https://github.com/THU-MAIC/OpenMAIC/pull/1704)
- Classroom media generation downloads provider-returned image and video URLs through the strict provider transport: HTTPS public addresses only, `data:` URLs decoded locally, and size bounded while streaming [#1692](https://github.com/THU-MAIC/OpenMAIC/pull/1692) (by @Yi-111-a). Agent-runtime image and video tools now do the same [#1704](https://github.com/THU-MAIC/OpenMAIC/pull/1704).

### Behavior Changes

- A caller-supplied LLM, image/video, model-list, PDF-check or self-hosted MinerU base URL that answers with a redirect is refused instead of followed. Configure the final URL.
- A caller-supplied provider base URL containing a query string or fragment is refused.
- A caller-chosen loopback or private address, including an IP literal or an unmanaged provider's built-in `localhost` default (Ollama, Lemonade, VoxCPM), needs `ALLOW_LOCAL_NETWORKS`. Configure the provider on the server to keep it operator-managed.
- Server-configured providers (LLM, image/video, TTS/ASR, MinerU, MinerU Cloud) may use local network addresses without `ALLOW_LOCAL_NETWORKS`. Cloud metadata and reserved ranges stay blocked, and redirects from them follow `ALLOW_LOCAL_NETWORKS`.
- A client-supplied AliDocMind endpoint must be an official `docmind-api.<region>.aliyuncs.com` host over HTTPS; other endpoints answer `403 INVALID_URL`. Server-configured endpoints are unchanged.
- Provider check and generation errors are fixed messages without the provider's response text or connection errors:
  - `/api/verify-pdf-provider` success no longer includes `status`;
  - `/api/azure-voices` answers provider failures with `502`;
  - `/api/provider/probe-models` reports other HTTP failures as `502` with the status class only;
  - LLM errors for a client-selected endpoint read `Cannot connect to API: connection failed` (or `request timed out`, `redirects are not allowed`) or the HTTP reason phrase;
  - MinerU Cloud errors report the HTTP status or numeric code.
- Agent-runtime video and poster downloads require HTTPS.
- Pinned provider requests connect directly and do not use Node's environment proxy (`NODE_USE_ENV_PROXY` with `HTTP_PROXY`/`HTTPS_PROXY`).
- A provider id that names an inherited object property (such as `constructor`) is no longer treated as server-configured.

## [1.1.1] - 2026-09-27

A security release: MinerU Cloud document parsing now holds the upload and result URLs returned by the provider to the strict public address policy, validates every redirect hop, and bounds what it reads and decompresses.

### Security

- MinerU Cloud parsing fetched the presigned upload URL and the result ZIP URL taken from the provider's response with a plain fetch, so when a caller supplied its own MinerU base URL (the provider not configured on the server), its endpoint could steer the server's `PUT` of the uploaded document and the result download at internal addresses. Every MinerU Cloud request now goes through the strict provider transport (per-hop redirect validation and DNS pinning); the response-supplied upload and ZIP URLs must be HTTPS public addresses under every policy, the upload no longer follows redirects, address-policy refusals are not retried, and JSON, ZIP and decompressed entry sizes are bounded. The shared SSRF guard also classifies IPv4-compatible IPv6 addresses (`::/96`) by their embedded IPv4 [GHSA-cpjc-vgjh-c5jp](https://github.com/THU-MAIC/OpenMAIC/security/advisories/GHSA-cpjc-vgjh-c5jp) (reported by @AbelWangYaBo) [#1688](https://github.com/THU-MAIC/OpenMAIC/pull/1688)

## [1.1.0] - 2026-09-24

Classroom chat now runs on an agent loop by default: learners can point at a slide element, an interactive component or a whiteboard drawing and ask about it, and the teacher can read the lesson, check the live state of an interactive experiment and search the web before answering. Settings are reorganized around the course workflow, with a model choice per generation step and first-class Token Plan connections (TokenDance, MiniMax, Seed and Kimi). Read **Behavior Changes** before upgrading.

### Highlights

- **Pi classroom chat is the default.** The in-class conversation moves from the director graph to an agent loop that can read slides on demand, search the web and call classroom tools within a single answer [#1628](https://github.com/THU-MAIC/OpenMAIC/pull/1628) [#1637](https://github.com/THU-MAIC/OpenMAIC/pull/1637)
- **Ask about what you're looking at.** Reference a single PPT element, an interactive component or a whiteboard element from the playback bar and ask about it; interactive pages that declare state are sampled at question time, so the teacher can explain the result the learner is actually seeing, and `read_scene` exposes an interactive page's static instructions [#1508](https://github.com/THU-MAIC/OpenMAIC/pull/1508) [#1632](https://github.com/THU-MAIC/OpenMAIC/pull/1632) [#1656](https://github.com/THU-MAIC/OpenMAIC/pull/1656)
- **Settings, rebuilt around the course workflow.** Choose a model for each generation step (outline, slides, interactive pages, scene actions and more), toggle each capability on or off, and manage Token Plans in one place [#1644](https://github.com/THU-MAIC/OpenMAIC/pull/1644)
- **Token Plans.** One-key presets for TokenDance (every modality) and the Kimi Coding Plan (text only; other modalities stay on your own providers) [#1525](https://github.com/THU-MAIC/OpenMAIC/pull/1525) [#1664](https://github.com/THU-MAIC/OpenMAIC/pull/1664)

### Features

- Models: add OpenRouter image and video providers [#1356](https://github.com/THU-MAIC/OpenMAIC/pull/1356), Gemini 3.8 Flash and 3.7 Flash [#1629](https://github.com/THU-MAIC/OpenMAIC/pull/1629), and Xiaomi MiMo V2.6 [#1655](https://github.com/THU-MAIC/OpenMAIC/pull/1655)
- TTS: pace classroom narration requests and classify MiniMax RPM limits so rate-limited runs slow down instead of failing [#1650](https://github.com/THU-MAIC/OpenMAIC/pull/1650); auto-detect Vietnamese for browser-native narration [#1487](https://github.com/THU-MAIC/OpenMAIC/pull/1487)
- Storage: workbench image and video generation write through the asset pool (#1007 part 6) [#1524](https://github.com/THU-MAIC/OpenMAIC/pull/1524); ZIP imports persist media in the server asset pool [#1520](https://github.com/THU-MAIC/OpenMAIC/pull/1520)
- Persistence: optional single-tenant mode that resolves every request to one shared owner (`PERSISTENCE_SHARED_OWNER_ID`) [#1639](https://github.com/THU-MAIC/OpenMAIC/pull/1639)
- Render service: admission control and per-task resource budgets [#1492](https://github.com/THU-MAIC/OpenMAIC/pull/1492)
- Attribution: TokenDance gateway requests carry an `X-APP-URL` header identifying the OpenMAIC deployment [#1675](https://github.com/THU-MAIC/OpenMAIC/pull/1675)

### Bug Fixes

- Generation: reject quiz options whose values are not A–Z and constrain them at the source [#1651](https://github.com/THU-MAIC/OpenMAIC/pull/1651); reject unusable interactive scripts and surface runtime errors on the page [#1649](https://github.com/THU-MAIC/OpenMAIC/pull/1649); keep narration speech free of formulas and LaTeX [#1586](https://github.com/THU-MAIC/OpenMAIC/pull/1586); tolerate non-array `mediaGenerations` in outlines [#1469](https://github.com/THU-MAIC/OpenMAIC/pull/1469); add a browser-safe package entry [#1609](https://github.com/THU-MAIC/OpenMAIC/pull/1609); stabilize model picker teardown [#1618](https://github.com/THU-MAIC/OpenMAIC/pull/1618)
- Playback and audio: mobile narration survives past the first segment and discussion lines reuse one media element [#1477](https://github.com/THU-MAIC/OpenMAIC/pull/1477) [#1610](https://github.com/THU-MAIC/OpenMAIC/pull/1610); stop superseded scene engines [#1510](https://github.com/THU-MAIC/OpenMAIC/pull/1510); queue widget messages until the iframe is ready [#1532](https://github.com/THU-MAIC/OpenMAIC/pull/1532); resolve CDN-backed narration consistently [#1521](https://github.com/THU-MAIC/OpenMAIC/pull/1521); keep refused narration instead of re-billing it [#1523](https://github.com/THU-MAIC/OpenMAIC/pull/1523); derive the Azure SSML locale from the selected voice [#1566](https://github.com/THU-MAIC/OpenMAIC/pull/1566); rebuild FormData bodies for the undici transport [#1580](https://github.com/THU-MAIC/OpenMAIC/pull/1580)
- PPTX import and editor: preserve tab columns, text insets, arrows, text/chart/image styling, shape autofit, Wingdings checkmarks, diagonal corners, table typography and punctuation wrapping; include every color attribute in the style cache key; share line bounds for alignment and dragging; bound ZIP inflation by default [#1518](https://github.com/THU-MAIC/OpenMAIC/pull/1518) [#1534](https://github.com/THU-MAIC/OpenMAIC/pull/1534) [#1577](https://github.com/THU-MAIC/OpenMAIC/pull/1577) [#1581](https://github.com/THU-MAIC/OpenMAIC/pull/1581) [#1571](https://github.com/THU-MAIC/OpenMAIC/pull/1571) [#1631](https://github.com/THU-MAIC/OpenMAIC/pull/1631) [#1588](https://github.com/THU-MAIC/OpenMAIC/pull/1588)
- Media and web search: refuse redirects on adapter generation and poll calls [#1636](https://github.com/THU-MAIC/OpenMAIC/pull/1636); keep long Grok relay generations alive and inline image bytes [#1364](https://github.com/THU-MAIC/OpenMAIC/pull/1364); emit keyframe images as data URLs [#1444](https://github.com/THU-MAIC/OpenMAIC/pull/1444); stop leaking Brave's HTML challenge page into errors [#1553](https://github.com/THU-MAIC/OpenMAIC/pull/1553); bound the model-discovery response body timeout [#1478](https://github.com/THU-MAIC/OpenMAIC/pull/1478)
- Export: surface video render rejection reasons [#1414](https://github.com/THU-MAIC/OpenMAIC/pull/1414); include active line geometry in bounds [#1626](https://github.com/THU-MAIC/OpenMAIC/pull/1626)
- Server and storage: validate `pdfContent` input [#1578](https://github.com/THU-MAIC/OpenMAIC/pull/1578); sanitize agent session text [#1504](https://github.com/THU-MAIC/OpenMAIC/pull/1504); correlate 5xx responses with request IDs [#1601](https://github.com/THU-MAIC/OpenMAIC/pull/1601); warn when access-code protection is disabled [#1599](https://github.com/THU-MAIC/OpenMAIC/pull/1599); show effective upload limits in errors [#1418](https://github.com/THU-MAIC/OpenMAIC/pull/1418)
- Docker: create `/app/data` owned by the runtime user so classroom persistence works [#1442](https://github.com/THU-MAIC/OpenMAIC/pull/1442); build workspace packages in the builder stage [#1598](https://github.com/THU-MAIC/OpenMAIC/pull/1598)
- Misc: send `taskEngineMode` on the on-demand vocational scene path [#716](https://github.com/THU-MAIC/OpenMAIC/pull/716); POSIX zip entry names for exported skills on Windows [#1641](https://github.com/THU-MAIC/OpenMAIC/pull/1641); i18n and persistence fixes [#1595](https://github.com/THU-MAIC/OpenMAIC/pull/1595) [#1596](https://github.com/THU-MAIC/OpenMAIC/pull/1596)

### Behavior Changes

- **Pi is the default classroom chat runtime.** To keep the legacy director-graph chat, build with `NEXT_PUBLIC_PI_CHAT_ENABLED=false` [#1628](https://github.com/THU-MAIC/OpenMAIC/pull/1628)
- **Stricter generated content.** Quizzes whose option values are not A–Z and interactive pages with unparseable scripts are now rejected as invalid model output and retried or skipped by the existing path, instead of being saved broken [#1651](https://github.com/THU-MAIC/OpenMAIC/pull/1651) [#1649](https://github.com/THU-MAIC/OpenMAIC/pull/1649)
- **Settings layout.** The web-search toggle moved from the generation toolbar into Settings; an existing preference is migrated once on first load [#1644](https://github.com/THU-MAIC/OpenMAIC/pull/1644)
- **Courseware references are opt-in.** The playback-bar reference entry (PPT, interactive and whiteboard) is enabled with `NEXT_PUBLIC_COURSEWARE_REFERENCE_ENABLED=true` [#1656](https://github.com/THU-MAIC/OpenMAIC/pull/1656)

### Other Changes

- Docs: align security and behavior claims with shipped code, and document the Docker builder heap limit [#1592](https://github.com/THU-MAIC/OpenMAIC/pull/1592) [#1607](https://github.com/THU-MAIC/OpenMAIC/pull/1607)
- Refactors and CI: shared per-course session lifecycle, shared narration walk for export, MIME policy from the format registry, Node 24 publish actions, Windows-safe media tests [#1619](https://github.com/THU-MAIC/OpenMAIC/pull/1619) [#1621](https://github.com/THU-MAIC/OpenMAIC/pull/1621) [#1590](https://github.com/THU-MAIC/OpenMAIC/pull/1590) [#1569](https://github.com/THU-MAIC/OpenMAIC/pull/1569) [#1584](https://github.com/THU-MAIC/OpenMAIC/pull/1584) [#1615](https://github.com/THU-MAIC/OpenMAIC/pull/1615)

### Contributors

Thanks to the community contributors in this release: @AbelWangYaBo, @acse-bq23, @Ai-Eastern, @BeAIcoder, @Cham1229, @ciclou1, @dajiaohuang, @Duang777, @Hosuke, @HuntercodeT, @hydraxman, @LeoParkerOu, @lianglaibin116-cloud, @ly-wang19, @mianbaofang, @nqthiep, @PassCode023, @puxiao, @Qnh233, @ttkm2023, @WizKid1968, @YizukiAme, @zdnemz.

## [1.0.3] - 2026-09-15

A security release: access-code tokens now expire and verification is throttled behind a trusted proxy, the render service applies a network policy to the untrusted HTML it renders, audio provider requests validate redirects and pin their connections, and Next.js is upgraded to patch a critical RCE. It also carries the fixes and features merged since 1.0.2.

### Security

- Access-code verification tokens (`timestamp.HMAC`) never expired because neither verifier checked the timestamp, and `POST /api/access-code/verify` had no throttling. Both verifiers now enforce a 7-day server-side lifetime and reject non-canonical signatures, and verification is rate-limited per client when `TRUST_PROXY_HEADERS=true` (with a warning to use a long random `ACCESS_CODE` when it is short) [GHSA-qpmr-534w-hhpg](https://github.com/THU-MAIC/OpenMAIC/security/advisories/GHSA-qpmr-534w-hhpg) (reported by @CaptBoykin) [#1513](https://github.com/THU-MAIC/OpenMAIC/pull/1513)
- The render service ran caller-supplied HTML in headless Chromium without the packager's Content-Security-Policy on the `/preview` and `/render` paths, so inline script could reach loopback and internal addresses and, on `/render`, paint the response into the returned MP4. Both paths now inject a first-parsed CSP, the preview frame is additionally guarded by request interception, and framed same-origin `.svg`/`.xhtml` documents are sanitized [GHSA-vqq3-22q7-289w](https://github.com/THU-MAIC/OpenMAIC/security/advisories/GHSA-vqq3-22q7-289w) (reported by @CaptBoykin) [#1512](https://github.com/THU-MAIC/OpenMAIC/pull/1512)
- Audio provider requests (TTS, ASR, voice registration and voice cloning) validated a client-supplied base URL once and then followed redirects and re-resolved DNS unvalidated, so a redirect or a rebinding answer could reach an internal address. These requests now validate every redirect hop and connect only to the addresses the guard validated, on every hop [GHSA-9p8q-rcmg-pmjw](https://github.com/THU-MAIC/OpenMAIC/security/advisories/GHSA-9p8q-rcmg-pmjw) (reported by @CaptBoykin) [#1514](https://github.com/THU-MAIC/OpenMAIC/pull/1514)
- Upgrade Next.js from 16.2.11 to 16.3.3, which patches an unauthenticated remote code execution on Windows-hosted servers ([GHSA-p293-qw3h-jr36](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36) / CVE-2026-75604) [#1503](https://github.com/THU-MAIC/OpenMAIC/pull/1503)

### Features

- Storage: the server owns the asset entry lifecycle and releases assets on course deletion (the #1007 amendment) [#1472](https://github.com/THU-MAIC/OpenMAIC/pull/1472) [#1473](https://github.com/THU-MAIC/OpenMAIC/pull/1473)
- Skills: add an inquiry-based exercise-class teaching skill grounded in the zone of proximal development [#1382](https://github.com/THU-MAIC/OpenMAIC/pull/1382)

### Bug Fixes

- Importer: resolve embedded PPTX videos when the legacy link points at NULL, and upload video posters through the configured callback (`@openmaic/importer` 0.2.1) [#1507](https://github.com/THU-MAIC/OpenMAIC/pull/1507)
- Storage: keep jsonb writes valid when model output contains NUL or lone surrogates [#1499](https://github.com/THU-MAIC/OpenMAIC/pull/1499); allow one owner material to be bound to multiple sessions [#1500](https://github.com/THU-MAIC/OpenMAIC/pull/1500)
- Classroom: render a transient server error as a retryable state instead of the terminal "course does not exist" card, on both the pane and the standalone route [#1485](https://github.com/THU-MAIC/OpenMAIC/pull/1485)
- Upload: resolve the generic Office MIME (`application/vnd.ms-office`) via the filename extension [#1498](https://github.com/THU-MAIC/OpenMAIC/pull/1498)
- Settings: maintain the ASR language state invariant on provider selection [#1443](https://github.com/THU-MAIC/OpenMAIC/pull/1443)
- TTS: treat a custom provider's Add-dialog default base URL as a configured credential path so generation narration is not skipped [#1482](https://github.com/THU-MAIC/OpenMAIC/pull/1482)
- Export: tolerate malformed authored CSS in classroom exports instead of dropping later assets [#1422](https://github.com/THU-MAIC/OpenMAIC/pull/1422)
- Render service: preserve plan audio during chunk assembly [#1358](https://github.com/THU-MAIC/OpenMAIC/pull/1358)
- Docker: enable the Pro workbench flag in Docker builds and allow a non-TLS localhost cookie [#1484](https://github.com/THU-MAIC/OpenMAIC/pull/1484)

### Other Changes

- Docs: document the deployment assumptions and pre-report checks in the security policy [#1511](https://github.com/THU-MAIC/OpenMAIC/pull/1511)
- Tests: isolate the image URL-guard test environment so it no longer inherits the generic OpenAI fallback [#1476](https://github.com/THU-MAIC/OpenMAIC/pull/1476)

## [1.0.2] - 2026-09-14

A security release that closes a cloud-metadata SSRF gap, a DNS-rebinding bypass
on media proxying, and a classroom overwrite, and tightens two request paths —
read the Breaking Changes section first.

### Security

- `/api/proxy-media` and the outbound URL guard accepted the Alibaba Cloud
  instance-metadata address `100.100.100.200` because the metadata denylist was
  not applied before an IP literal was accepted. The guard now checks metadata
  hostnames and addresses — including mapped and transition encodings — before
  the literal and local-network branches, in every environment and regardless of
  `ALLOW_LOCAL_NETWORKS`
  [GHSA-6xff-rgjg-v33f](https://github.com/THU-MAIC/OpenMAIC/security/advisories/GHSA-6xff-rgjg-v33f) (reported by @lihua666a-cell)
- `/api/proxy-media` validated a hostname and then let `fetch()` resolve it
  again at connect time, so a name whose answer changed between the two lookups
  could reach an internal address (DNS rebinding). The proxy now connects only
  to the addresses the guard validated, on every redirect hop, through a shared
  pinned dispatcher
  [GHSA-23xq-m3mm-3j49](https://github.com/THU-MAIC/OpenMAIC/security/advisories/GHSA-23xq-m3mm-3j49) (reported by @ry2811)
- `POST /api/classroom` accepted a caller-chosen classroom id and renamed a
  temporary file over an existing classroom, replacing its content. Ids are now
  server-generated and classroom files are created exclusively, with a bounded
  retry and a 409 on collision
  [GHSA-87m4-6c66-pc68](https://github.com/THU-MAIC/OpenMAIC/security/advisories/GHSA-87m4-6c66-pc68) (reported by @ry2811)
- `POST /api/generate/tts` now inspects a 200 response before storing or billing
  it: HTML, JSON and other non-audio bodies are rejected, and a URL embedded in
  a JSON envelope is never followed [#1405](https://github.com/THU-MAIC/OpenMAIC/pull/1405)

### Breaking Changes

- `POST /api/classroom` no longer honours a client-supplied `stage.id`; the `id` in the response is the classroom's id [#1489](https://github.com/THU-MAIC/OpenMAIC/pull/1489)
- The outbound URL guard now refuses IANA reserved, documentation, multicast and broadcast ranges (`240.0.0.0/4`, `198.18.0.0/15`, `192.0.2.0/24`, `2001:db8::/32`, …) at both the URL and the connection layer, regardless of `ALLOW_LOCAL_NETWORKS`. CGNAT `100.64.0.0/10` (Tailscale and similar overlays) is blocked by default and allowed with `ALLOW_LOCAL_NETWORKS=true`, like private ranges [#1488](https://github.com/THU-MAIC/OpenMAIC/pull/1488)

### Features

- Playback: the global Reference courseware entry now grounds HTML-backed GenUI and Interactive scenes on one source-authored component — resolved again on the host against the request-start scene snapshot, sanitized and bounded, and shared with the Director and both child runtimes — behind the default-off `NEXT_PUBLIC_COURSEWARE_REFERENCE_ENABLED` build-time gate [#1281](https://github.com/THU-MAIC/OpenMAIC/pull/1281)
- Export: the export dialog checks render queue availability before compiling; a service that reports itself busy disables MP4 with a localized hint and a manual recheck, while ZIP and subtitle downloads stay available [#1455](https://github.com/THU-MAIC/OpenMAIC/pull/1455)
- Media: under server-backed persistence, generated media is written through the asset pool first and the allocated id is persisted into the document, so a reload regenerates nothing and other browsers resolve the same bytes [#1392](https://github.com/THU-MAIC/OpenMAIC/pull/1392)
- Providers: add GLM-5.3 and GLM-5.3-Flash, and make the GLM thinking adapter degrade a disabled request to the lightest effort for always-thinking models [#1401](https://github.com/THU-MAIC/OpenMAIC/pull/1401)
- Render service: emit one JSON lifecycle event per render and preview transition — submission, start with `queueWaitMs`, finish with its outcome and duration, admission rejection, and preview request — carrying only bounded, low-cardinality fields [#1397](https://github.com/THU-MAIC/OpenMAIC/pull/1397)

### Bug Fixes

- TTS: prepare the next discussion segment while the current clip plays, so synthesis latency overlaps playback while audio stays strictly ordered [#1435](https://github.com/THU-MAIC/OpenMAIC/pull/1435)
- Export: keep one in-memory compiled ZIP so an unchanged retry after a 429 submits the same result instead of recompiling [#1456](https://github.com/THU-MAIC/OpenMAIC/pull/1456)
- AI runtime: let non-streaming LLM calls outlive undici's 300 s headers timeout through a shared dispatcher with a 15-minute limit [#1404](https://github.com/THU-MAIC/OpenMAIC/pull/1404); share one process-local thinking context across Next.js bundle evaluations [#1378](https://github.com/THU-MAIC/OpenMAIC/pull/1378)
- Importer: convert Equation 3.0 and MathType OLE formulas to LaTeX through MTEF v3 with degrade telemetry, and fix the non-transparent formula placeholder [#1411](https://github.com/THU-MAIC/OpenMAIC/pull/1411); stop PPTX import from hanging in non-browser environments by bounding image loading and EMF/PDF rasterization [#1424](https://github.com/THU-MAIC/OpenMAIC/pull/1424)
- Quiz: resolve AI answer keys to option values before grading, failing closed when a key matches no option or several [#1328](https://github.com/THU-MAIC/OpenMAIC/pull/1328)
- Renderer: lazy-load the optional ECharts runtime, share one loading promise and wait for chart readiness during slide PNG export [#1420](https://github.com/THU-MAIC/OpenMAIC/pull/1420)
- Render service: keep preview browser evaluation self-contained so `tsx`'s `__name` helper never reaches Chromium [#1421](https://github.com/THU-MAIC/OpenMAIC/pull/1421); enforce the chunk worker cap and report the worker count actually observed [#1359](https://github.com/THU-MAIC/OpenMAIC/pull/1359)
- Materials: sanitize the owner id in the byte-store key so uploads work on Windows [#1426](https://github.com/THU-MAIC/OpenMAIC/pull/1426)
- Settings: read `data.error` for image and video provider test results instead of rendering `failed: undefined` [#1459](https://github.com/THU-MAIC/OpenMAIC/pull/1459)
- Classroom: adapt the completion page to short viewports instead of clipping its content above the scroll origin [#1461](https://github.com/THU-MAIC/OpenMAIC/pull/1461)
- Build: include the libvips native libraries in standalone tracing so sharp loads at boot [#1407](https://github.com/THU-MAIC/OpenMAIC/pull/1407)

### Other Changes

- CI: add an opt-in issue triage agent that analyzes read-only by default and publishes only on an explicit run [#1439](https://github.com/THU-MAIC/OpenMAIC/pull/1439)
- Docs: state the advisory severity and CVE process in the security policy [#1417](https://github.com/THU-MAIC/OpenMAIC/pull/1417)
- Tests: cover preview callbacks across the `tsx`/browser boundary [#1454](https://github.com/THU-MAIC/OpenMAIC/pull/1454); make the material search budget test deterministic through an injectable clock [#1453](https://github.com/THU-MAIC/OpenMAIC/pull/1453)

## [1.0.1] - 2026-09-06

A security and stability release. Everyone running 1.0.0 should upgrade; read the
Breaking Changes section first, as this release tightens two defaults.

### Security

- Classroom persistence rejected a stage id that escaped the classrooms directory
  only on the read path. The write path now applies the same allowlist, and the
  storage layer asserts a resolved classroom file stays inside `CLASSROOMS_DIR`
  [GHSA-p2wh-m28m-c5xw](https://github.com/THU-MAIC/OpenMAIC/security/advisories/GHSA-p2wh-m28m-c5xw) (reported by @skeletonsec)
- Stored slide HTML is now restricted to the formatting vocabulary the renderer
  produces, sanitized at the classroom persistence boundary on both write and read,
  with a separate policy for KaTeX snapshots so formulas are not flattened
  [GHSA-7rhf-2798-mvcj](https://github.com/THU-MAIC/OpenMAIC/security/advisories/GHSA-7rhf-2798-mvcj) (reported by @skeletonsec)
- The outbound URL guard ran only under `NODE_ENV=production`; it now runs at every
  call site in every environment, and a repository-scanning test fails if a gated
  call site reappears
  [GHSA-9m7h-vh2h-rc3w](https://github.com/THU-MAIC/OpenMAIC/security/advisories/GHSA-9m7h-vh2h-rc3w) (reported by @uziii2208)
- Provider requests now re-validate every redirect hop through a shared transport
  and drop credential headers on a cross-origin hop, the way the platform fetch does
  [GHSA-725p-44hx-v52c](https://github.com/THU-MAIC/OpenMAIC/security/advisories/GHSA-725p-44hx-v52c) (reported by @skeletonsec)
- The development persistence authenticator is refused under `NODE_ENV=production`
  unless an explicit opt-in is set; it provides no user isolation and was never
  meant to serve production traffic
- Bump next, js-yaml, undici, nanoid, lodash and sharp for disclosed advisories [#1357](https://github.com/THU-MAIC/OpenMAIC/pull/1357)
- Bound skill zip inflation instead of trusting the declared uncompressed size [#1374](https://github.com/THU-MAIC/OpenMAIC/pull/1374), and bound `import_pptx` parsing with a size cap and timeout [#1269](https://github.com/THU-MAIC/OpenMAIC/pull/1269)

### Breaking Changes

- Node: the minimum supported runtime is now 22.19.0, up from 20.9.0 [#1337](https://github.com/THU-MAIC/OpenMAIC/pull/1337)
- The outbound URL guard now runs in every environment, not only production builds. A client-supplied provider base URL pointing at a loopback or private address — a local Ollama or Lemonade endpoint entered in Settings, for example — is rejected unless `ALLOW_LOCAL_NETWORKS=true` is set. Production deployments already behaved this way; development builds did not
- Redirect hops are re-validated for every provider, including server-managed ones. An internal gateway that answers a redirect to a private address needs `ALLOW_LOCAL_NETWORKS=true`
- The development persistence authenticator no longer serves traffic under `NODE_ENV=production`. A deployment that intentionally runs it on a trusted network must set `PERSISTENCE_ALLOW_INSECURE_DEV_AUTH=true`
- `POST /api/classroom` now rejects a payload whose scenes do not satisfy the slide DSL, and a stage id outside `[A-Za-z0-9_-]`

### Features

- Agent: add a fact-check skill [#1274](https://github.com/THU-MAIC/OpenMAIC/pull/1274); let `generate_scene` pass `widgetType` and `widgetOutline` for interactive pages [#1259](https://github.com/THU-MAIC/OpenMAIC/pull/1259); make `generate_video` asynchronous with a placeholder reference [#1267](https://github.com/THU-MAIC/OpenMAIC/pull/1267)
- Pro workbench: reference single PPT elements from chat [#1224](https://github.com/THU-MAIC/OpenMAIC/pull/1224); generate concise conversation titles [#1275](https://github.com/THU-MAIC/OpenMAIC/pull/1275)
- Render service: add a `POST /preview` endpoint [#1285](https://github.com/THU-MAIC/OpenMAIC/pull/1285); report admission state machine-readably, with 429 reasons and an accepting flag on health [#1351](https://github.com/THU-MAIC/OpenMAIC/pull/1351)
- Providers: add Exa as a web-search provider [#1342](https://github.com/THU-MAIC/OpenMAIC/pull/1342); register `deepseek-v4-flash-vision-exp` with vision capability [#1329](https://github.com/THU-MAIC/OpenMAIC/pull/1329)
- Canvas: insert text by double-click [#1310](https://github.com/THU-MAIC/OpenMAIC/pull/1310)

### Bug Fixes

- Classroom: speed up loading through media hydration, sidebar thumbnails and media range requests [#1276](https://github.com/THU-MAIC/OpenMAIC/pull/1276); keep bottom table rows visible during playback [#1366](https://github.com/THU-MAIC/OpenMAIC/pull/1366); keep videos playing inline on mobile [#1321](https://github.com/THU-MAIC/OpenMAIC/pull/1321)
- Agent runtime: preserve `generate_scene` failure causes [#1316](https://github.com/THU-MAIC/OpenMAIC/pull/1316); bound `generate_scene` retries per page [#1370](https://github.com/THU-MAIC/OpenMAIC/pull/1370); normalize skill paths to POSIX before the loader [#1297](https://github.com/THU-MAIC/OpenMAIC/pull/1297)
- Workbench: handle stale workspace resume memory [#1271](https://github.com/THU-MAIC/OpenMAIC/pull/1271); persist Pro conversation titles [#1273](https://github.com/THU-MAIC/OpenMAIC/pull/1273); render LaTeX in assistant messages [#1309](https://github.com/THU-MAIC/OpenMAIC/pull/1309)
- Generation: assign unique IDs per media request [#1368](https://github.com/THU-MAIC/OpenMAIC/pull/1368); load micropip before generated imports [#1282](https://github.com/THU-MAIC/OpenMAIC/pull/1282); keep diagram node position off the hover transform [#1339](https://github.com/THU-MAIC/OpenMAIC/pull/1339); normalize GPT Image 2 generation sizes [#1346](https://github.com/THU-MAIC/OpenMAIC/pull/1346)
- Providers and media: apply server-pinned models for image and video providers [#1298](https://github.com/THU-MAIC/OpenMAIC/pull/1298); bypass the AI SDK for custom ASR providers so extra response fields survive [#1283](https://github.com/THU-MAIC/OpenMAIC/pull/1283); turn TTS and media generation on from the Settings page [#1311](https://github.com/THU-MAIC/OpenMAIC/pull/1311)
- Storage: prune redundant intermediate `message_update` frames [#1279](https://github.com/THU-MAIC/OpenMAIC/pull/1279)
- DSL: migrate away legacy rotate/height fields on line elements [#1261](https://github.com/THU-MAIC/OpenMAIC/pull/1261)
- Export: recheck script readiness on download [#1159](https://github.com/THU-MAIC/OpenMAIC/pull/1159)
- Importer: fix `pnpm install` failing on Windows [#1372](https://github.com/THU-MAIC/OpenMAIC/pull/1372)
- Docs site: isolate the standalone build from product middleware [#1307](https://github.com/THU-MAIC/OpenMAIC/pull/1307)

### Other Changes

- Build and tooling: enforce the direct dependency engine floor [#1337](https://github.com/THU-MAIC/OpenMAIC/pull/1337); enforce LF line endings for text files [#1296](https://github.com/THU-MAIC/OpenMAIC/pull/1296); replace `rm -rf` with a cross-platform `fs.rmSync` in package scripts [#1338](https://github.com/THU-MAIC/OpenMAIC/pull/1338)
- CI: migrate GitHub Actions off the deprecated Node 20 runtime [#1343](https://github.com/THU-MAIC/OpenMAIC/pull/1343)
- Docs: sync the README with current code, multi-workbench skill support and the 1.0 videos [#1334](https://github.com/THU-MAIC/OpenMAIC/pull/1334); swap the English and Chinese user-guide links in the README badges [#1290](https://github.com/THU-MAIC/OpenMAIC/pull/1290)
- Tests: isolate the media force-off test from the OpenAI fallback [#1303](https://github.com/THU-MAIC/OpenMAIC/pull/1303)

## [1.0.0] - 2026-08-27

### Features

- **Agent workbench (Pro mode)** — chat-first course building from the home page: the collapsible workspace shell [#1206](https://github.com/THU-MAIC/OpenMAIC/pull/1206), the agent chat surface [#1205](https://github.com/THU-MAIC/OpenMAIC/pull/1205), and the client data layer [#1204](https://github.com/THU-MAIC/OpenMAIC/pull/1204), with Pro entry points that preserve mode-transition semantics [#1208](https://github.com/THU-MAIC/OpenMAIC/pull/1208); owner-scoped folder routes, stage-metadata viewer surfaces, and the material upload contract [#1215](https://github.com/THU-MAIC/OpenMAIC/pull/1215), plus stage and material HTTP routes [#1203](https://github.com/THU-MAIC/OpenMAIC/pull/1203); the Pro workbench flag now implies the MAIC Editor gate [#1223](https://github.com/THU-MAIC/OpenMAIC/pull/1223)
- **Durable agent runtime** — server-backed course-building sessions: the driver model contract and stage route dialect [#1165](https://github.com/THU-MAIC/OpenMAIC/pull/1165), the runtime foundations on the agent-session store [#1167](https://github.com/THU-MAIC/OpenMAIC/pull/1167), a background session runner [#1169](https://github.com/THU-MAIC/OpenMAIC/pull/1169), agent session and owner event streams [#1170](https://github.com/THU-MAIC/OpenMAIC/pull/1170), and session lifecycle routes [#1171](https://github.com/THU-MAIC/OpenMAIC/pull/1171) — sessions survive restarts, accept follow-up steering and cancellation, and stream a replayable event transcript; the runtime configuration surface is documented [#1176](https://github.com/THU-MAIC/OpenMAIC/pull/1176)
- **Agent tools and skills** — validated, provider-neutral course tools: neutral tool foundation libraries [#1184](https://github.com/THU-MAIC/OpenMAIC/pull/1184), a `web_search` tool on the session runner [#1185](https://github.com/THU-MAIC/OpenMAIC/pull/1185), session materials with a `fetch_url` tool behind the URL trust gate [#1190](https://github.com/THU-MAIC/OpenMAIC/pull/1190), material read/search [#1192](https://github.com/THU-MAIC/OpenMAIC/pull/1192), stage read/patch [#1194](https://github.com/THU-MAIC/OpenMAIC/pull/1194), page generation and deck editing [#1198](https://github.com/THU-MAIC/OpenMAIC/pull/1198), roster and voice registration [#1201](https://github.com/THU-MAIC/OpenMAIC/pull/1201), folder organisation [#1202](https://github.com/THU-MAIC/OpenMAIC/pull/1202), image/video/PPTX import [#1211](https://github.com/THU-MAIC/OpenMAIC/pull/1211), and the material extraction lifecycle [#1212](https://github.com/THU-MAIC/OpenMAIC/pull/1212); a skills system [#1189](https://github.com/THU-MAIC/OpenMAIC/pull/1189) with Feynman and spiral curriculum methods [#1240](https://github.com/THU-MAIC/OpenMAIC/pull/1240), reference tools and skills ported in a parity audit [#1241](https://github.com/THU-MAIC/OpenMAIC/pull/1241), and real skill management in Settings — list, download, delete, and upload [#1244](https://github.com/THU-MAIC/OpenMAIC/pull/1244)
- **Provider-neutral server capabilities** — image, video, and ASR models resolved from server config [#1175](https://github.com/THU-MAIC/OpenMAIC/pull/1175), uniform capability force-off with a consistent missing-key contract [#1181](https://github.com/THU-MAIC/OpenMAIC/pull/1181), startup validation of model routing config [#1182](https://github.com/THU-MAIC/OpenMAIC/pull/1182), silent-behavior fixes from the provider audit [#1196](https://github.com/THU-MAIC/OpenMAIC/pull/1196), and provider force-off enforced in agent tools with vendor identity scrubbed from tool results [#1231](https://github.com/THU-MAIC/OpenMAIC/pull/1231)
- **Pluggable persistence** — an agent-session store with a PostgreSQL backend over layered contracts [#1163](https://github.com/THU-MAIC/OpenMAIC/pull/1163), an ownership scope on stage documents [#1191](https://github.com/THU-MAIC/OpenMAIC/pull/1191), a per-session URL trust gate [#1186](https://github.com/THU-MAIC/OpenMAIC/pull/1186), per-scene monotonic revisions via database triggers [#1214](https://github.com/THU-MAIC/OpenMAIC/pull/1214), owner materials migrated to `oss_key` with the legacy `asset_id` dropped [#1250](https://github.com/THU-MAIC/OpenMAIC/pull/1250), and per-owner quota reservations serialized with crashed uploads reclaimable [#1232](https://github.com/THU-MAIC/OpenMAIC/pull/1232)
- **Materials and the asset byte model** — uploaded sources ingested into the asset pool and extracted by id [#1154](https://github.com/THU-MAIC/OpenMAIC/pull/1154), derived assets with lineage and an extraction cache [#1164](https://github.com/THU-MAIC/OpenMAIC/pull/1164), a material library manifest with id-addressed generation images [#1168](https://github.com/THU-MAIC/OpenMAIC/pull/1168), inline base64 images converted to pool assets on load [#1172](https://github.com/THU-MAIC/OpenMAIC/pull/1172), legacy references converted to allocated asset ids [#1101](https://github.com/THU-MAIC/OpenMAIC/pull/1101), media and materials moved onto the reference byte model with the asset-registry wiring retired [#1242](https://github.com/THU-MAIC/OpenMAIC/pull/1242), a standardized asset manifest with converged export paths [#1117](https://github.com/THU-MAIC/OpenMAIC/pull/1117) over one shared stored-bytes resolver [#1116](https://github.com/THU-MAIC/OpenMAIC/pull/1116), opt-in indirect asset byte egress [#1100](https://github.com/THU-MAIC/OpenMAIC/pull/1100), and an optional local ffmpeg/ffprobe media extractor [#1213](https://github.com/THU-MAIC/OpenMAIC/pull/1213)
- Editor: float the insert toolbar in the outer frame with collapse [#1246](https://github.com/THU-MAIC/OpenMAIC/pull/1246); port the timeline TTS preview single-flight and voice-all state latching [#1235](https://github.com/THU-MAIC/OpenMAIC/pull/1235)
- Whiteboard and Pi Native Child: destructive whiteboard runtime operations [#1173](https://github.com/THU-MAIC/OpenMAIC/pull/1173); Native Child whiteboard tools [#1152](https://github.com/THU-MAIC/OpenMAIC/pull/1152) and additive whiteboard tools [#1156](https://github.com/THU-MAIC/OpenMAIC/pull/1156), web search [#1133](https://github.com/THU-MAIC/OpenMAIC/pull/1133), and a native child runtime with scoped Spotlight [#1111](https://github.com/THU-MAIC/OpenMAIC/pull/1111)
- Qwen TTS voice cloning [#1160](https://github.com/THU-MAIC/OpenMAIC/pull/1160)
- Download the narration script as Markdown or DOCX on export [#1144](https://github.com/THU-MAIC/OpenMAIC/pull/1144)
- A document lexical retrieval foundation for RAG [#1078](https://github.com/THU-MAIC/OpenMAIC/pull/1078)
- Video export: a bounded local chunk executor [#1115](https://github.com/THU-MAIC/OpenMAIC/pull/1115)
- German (de-DE) localization [#1128](https://github.com/THU-MAIC/OpenMAIC/pull/1128)
- OpenClaw skill: a secondary-development flow [#1119](https://github.com/THU-MAIC/OpenMAIC/pull/1119)

### Bug Fixes

- Workbench: restore editor chrome, mode transition, streaming, materials, mentions, and folders [#1229](https://github.com/THU-MAIC/OpenMAIC/pull/1229); restore the attach entry and add the rail settings entry, pinning all three entry points [#1221](https://github.com/THU-MAIC/OpenMAIC/pull/1221); list PG-mode home courses via owner stages while keeping the interrupted terminal course card [#1218](https://github.com/THU-MAIC/OpenMAIC/pull/1218); send the opening session message exactly once with references intact [#1234](https://github.com/THU-MAIC/OpenMAIC/pull/1234); show newly created folders in the sidebar without a reload [#1254](https://github.com/THU-MAIC/OpenMAIC/pull/1254); single-source the chat gutter so the timeline and composer share a left edge [#1255](https://github.com/THU-MAIC/OpenMAIC/pull/1255) [#1247](https://github.com/THU-MAIC/OpenMAIC/pull/1247); lock the pane-embedded classroom to edit mode [#1256](https://github.com/THU-MAIC/OpenMAIC/pull/1256); label the extraction lifecycle tools on the timeline
- Agent runtime: control-plane routes answer 404, not 500, without a database, and the runtime reports itself unusable without one [#1207](https://github.com/THU-MAIC/OpenMAIC/pull/1207); abort in-flight TTS on cancel and bound every provider request with a timeout [#1217](https://github.com/THU-MAIC/OpenMAIC/pull/1217); bound every tool call with a timeout and never resurrect a cancelled session [#1226](https://github.com/THU-MAIC/OpenMAIC/pull/1226); fence durable tool writes and consume cancel requests atomically [#1230](https://github.com/THU-MAIC/OpenMAIC/pull/1230); fence session claims while an ask_user question is outstanding [#1248](https://github.com/THU-MAIC/OpenMAIC/pull/1248); settle-time rescue tracks real delivery instead of a count offset [#1249](https://github.com/THU-MAIC/OpenMAIC/pull/1249); repair orphaned and late tool results across interruption boundaries [#1180](https://github.com/THU-MAIC/OpenMAIC/pull/1180); wake SSE tails and the runner on durable deltas for streaming fidelity [#1222](https://github.com/THU-MAIC/OpenMAIC/pull/1222); carry reasoning through the completions dialect so the thinking strip renders [#1239](https://github.com/THU-MAIC/OpenMAIC/pull/1239); revoke deleted-session URL authority and reject private ISATAP endpoints [#1199](https://github.com/THU-MAIC/OpenMAIC/pull/1199)
- Editor: complete element referencing with the renderer DOM contract and GenUI picking aligned to the reference [#1238](https://github.com/THU-MAIC/OpenMAIC/pull/1238); resolve dock-bar i18n keys, remove the dock height drag, and wire element referencing [#1233](https://github.com/THU-MAIC/OpenMAIC/pull/1233); allow dragging selected lines [#1166](https://github.com/THU-MAIC/OpenMAIC/pull/1166); allow multi-tab edit mode by dropping the cross-tab edit lock [#1161](https://github.com/THU-MAIC/OpenMAIC/pull/1161); align editable shape labels with text [#1137](https://github.com/THU-MAIC/OpenMAIC/pull/1137); keep class roster cards from shrinking [#1135](https://github.com/THU-MAIC/OpenMAIC/pull/1135)
- Media: restore the reference classic media chain [#1236](https://github.com/THU-MAIC/OpenMAIC/pull/1236); persist origin-independent classroom-media references from the agent runtime [#1245](https://github.com/THU-MAIC/OpenMAIC/pull/1245)
- Storage: asset writes no longer self-deadlock against pooled PostgreSQL [#1225](https://github.com/THU-MAIC/OpenMAIC/pull/1225) [#1227](https://github.com/THU-MAIC/OpenMAIC/pull/1227)
- Importer: adapt the imported PPTX canvas size so decks render without overflow [#1237](https://github.com/THU-MAIC/OpenMAIC/pull/1237)
- Classroom: center adapted canvases in the stage and send navigation home during generation [#1243](https://github.com/THU-MAIC/OpenMAIC/pull/1243)
- Renderer: preserve literal text line breaks [#1132](https://github.com/THU-MAIC/OpenMAIC/pull/1132)
- Whiteboard: correct the inverted viewportRatio so boards render 16:9 landscape [#1257](https://github.com/THU-MAIC/OpenMAIC/pull/1257)
- Video export: make Cyrillic and Arabic Quiz fonts deterministic [#1114](https://github.com/THU-MAIC/OpenMAIC/pull/1114); constrain GenUI iframe visibility [#1125](https://github.com/THU-MAIC/OpenMAIC/pull/1125)
- i18n: fix the Traditional Chinese translations in the importer [#1127](https://github.com/THU-MAIC/OpenMAIC/pull/1127)

### Other Changes

- Docs: add the release version prefix to the README and drop the opt-in framing, surface the 1.0.0 user-guide badges at the top [#1253](https://github.com/THU-MAIC/OpenMAIC/pull/1253), and a takeaway-style 1.0.0 announcement with bilingual guide links; announce 1.0.0 and refresh the feature overview [#1216](https://github.com/THU-MAIC/OpenMAIC/pull/1216); document the agent runtime configuration surface [#1176](https://github.com/THU-MAIC/OpenMAIC/pull/1176)
- Tests: reconcile vendor-token debt counts with the integration line and after the main merge, mock both runtime gate exports in the control-plane route suites, and give material fixtures the extraction lifecycle fields; keep the PG contract suite order-independent [#1200](https://github.com/THU-MAIC/OpenMAIC/pull/1200); cover indirect-egress CORS in Chromium [#1138](https://github.com/THU-MAIC/OpenMAIC/pull/1138); wait for project cleanup instead of racing it in the render suite [#1193](https://github.com/THU-MAIC/OpenMAIC/pull/1193); stop loading `.env.local` into unit tests by default [#1162](https://github.com/THU-MAIC/OpenMAIC/pull/1162); guard the provider-neutral layers against vendor leakage [#1197](https://github.com/THU-MAIC/OpenMAIC/pull/1197)
- CI and build: cut wall-clock time and bound Playwright browser installs [#1146](https://github.com/THU-MAIC/OpenMAIC/pull/1146); scope the Next typecheck to production sources [#1179](https://github.com/THU-MAIC/OpenMAIC/pull/1179); add optional Docker mirrors and a pnpm cache [#1139](https://github.com/THU-MAIC/OpenMAIC/pull/1139)
- Workbench cleanup: retire the bookmark concept and the saved-courses drawer [#1219](https://github.com/THU-MAIC/OpenMAIC/pull/1219); remove the in-editor agent panel [#1210](https://github.com/THU-MAIC/OpenMAIC/pull/1210)
- Storage: drop the unused active-stage API from the agent-session contract [#1174](https://github.com/THU-MAIC/OpenMAIC/pull/1174)
- Pi: simplify agent tool ownership and completion [#1148](https://github.com/THU-MAIC/OpenMAIC/pull/1148)

## [0.3.2] - 2026-08-14

### Features

- **Video export hardening** — fidelity polish for spotlight geometry, video clips, formulas, and subtitles [#952](https://github.com/THU-MAIC/OpenMAIC/pull/952), deterministic Quiz/PBL cover cards [#995](https://github.com/THU-MAIC/OpenMAIC/pull/995), self-contained static interactive HTML capture [#1086](https://github.com/THU-MAIC/OpenMAIC/pull/1086), deterministic Quiz question-list scrolling [#1102](https://github.com/THU-MAIC/OpenMAIC/pull/1102), a stable RenderExecutor seam [#1104](https://github.com/THU-MAIC/OpenMAIC/pull/1104), explicit CPU resource profiles [#1105](https://github.com/THU-MAIC/OpenMAIC/pull/1105), and effective parallel capture in the render service [#1042](https://github.com/THU-MAIC/OpenMAIC/pull/1042)
- **Server-backed persistence completion** — learner-data cutover: quiz + playback onto RuntimeStore [#955](https://github.com/THU-MAIC/OpenMAIC/pull/955); document-persistence cutover: stage/scene/outline onto DocumentStore [#965](https://github.com/THU-MAIC/OpenMAIC/pull/965); server-backed documents over an HTTP contract with a Postgres backend and one reference server [#979](https://github.com/THU-MAIC/OpenMAIC/pull/979); a one-command server-backed stack (compose profile + embedded API + docs) [#982](https://github.com/THU-MAIC/OpenMAIC/pull/982); dirty-set incremental saves with operation-level flush [#983](https://github.com/THU-MAIC/OpenMAIC/pull/983); settings/user-profile persistence through KVStore [#1001](https://github.com/THU-MAIC/OpenMAIC/pull/1001); the KV HTTP contract and clients promoted to main [#1020](https://github.com/THU-MAIC/OpenMAIC/pull/1020); learner whiteboard RuntimeStore foundation [#1075](https://github.com/THU-MAIC/OpenMAIC/pull/1075)
- **Asset registry** — allocated asset ids over the content-addressed blob layer [#1024](https://github.com/THU-MAIC/OpenMAIC/pull/1024), unified media asset reference types [#1038](https://github.com/THU-MAIC/OpenMAIC/pull/1038), generated assets allocated through the registry [#1039](https://github.com/THU-MAIC/OpenMAIC/pull/1039), a server asset registry over a pluggable byte layer [#1077](https://github.com/THU-MAIC/OpenMAIC/pull/1077), and the asset backend wired into the app [#1089](https://github.com/THU-MAIC/OpenMAIC/pull/1089)
- **`@openmaic/generation` package** — scaffolding with pipeline types and packaged prompt assets [#1063](https://github.com/THU-MAIC/OpenMAIC/pull/1063); outline generation [#1065](https://github.com/THU-MAIC/OpenMAIC/pull/1065) and scene generation + PBL single-call planning [#1087](https://github.com/THU-MAIC/OpenMAIC/pull/1087) moved into the package; the app consumes the package everywhere and `lib/generation` is deleted [#1090](https://github.com/THU-MAIC/OpenMAIC/pull/1090)
- **SDK contract ownership** — interactive and PBL content kinds promoted into `@openmaic/dsl` [#1070](https://github.com/THU-MAIC/OpenMAIC/pull/1070), app consumes the contract's interactive/widget types [#1073](https://github.com/THU-MAIC/OpenMAIC/pull/1073) and PBL project types [#1079](https://github.com/THU-MAIC/OpenMAIC/pull/1079), and the renderer decouples its editing UI from the app [#1072](https://github.com/THU-MAIC/OpenMAIC/pull/1072)
- Course folder grouping [#1005](https://github.com/THU-MAIC/OpenMAIC/pull/1005) (by @CXuPercy)
- Local FunASR ASR provider [#1044](https://github.com/THU-MAIC/OpenMAIC/pull/1044)
- Claude (`claude search`) as a web-search provider [#393](https://github.com/THU-MAIC/OpenMAIC/pull/393) (by @joseph-mpo-yeti)
- Per-stage routing for `generate-classroom` instead of one model [#1048](https://github.com/THU-MAIC/OpenMAIC/pull/1048); evidence-aware Pi Director context runtime [#971](https://github.com/THU-MAIC/OpenMAIC/pull/971); optional playback canvas renderer [#958](https://github.com/THU-MAIC/OpenMAIC/pull/958)
- Amazon Bedrock LLM provider [#538](https://github.com/THU-MAIC/OpenMAIC/pull/538) (by @littlebullGit), Atlas Cloud LLM provider [#948](https://github.com/THU-MAIC/OpenMAIC/pull/948) (by @binyangzhu000-sudo), latest Claude/Gemini/Kimi/Grok models [#993](https://github.com/THU-MAIC/OpenMAIC/pull/993), and Grok 4.6 [#1113](https://github.com/THU-MAIC/OpenMAIC/pull/1113)
- French (fr-FR) locale [#1068](https://github.com/THU-MAIC/OpenMAIC/pull/1068) (by @momo2lajoie), Spanish (Mexico) locale [#942](https://github.com/THU-MAIC/OpenMAIC/pull/942) (by @davidmedel), Vietnamese (vi-VN) locale [#1025](https://github.com/THU-MAIC/OpenMAIC/pull/1025) (by @niitbeo), and 432 reviewed zh-TW translations [#526](https://github.com/THU-MAIC/OpenMAIC/pull/526) (by @alvinets)

### Bug Fixes

- Persistence: stop corrupting binary response bodies in the route adapter [#1088](https://github.com/THU-MAIC/OpenMAIC/pull/1088); omit undefined object fields at persistence boundaries [#992](https://github.com/THU-MAIC/OpenMAIC/pull/992); bind default fetch to globalThis in both HTTP store clients [#984](https://github.com/THU-MAIC/OpenMAIC/pull/984)
- Chat: harden runtime sync, legacy migration, and record validation [#1050](https://github.com/THU-MAIC/OpenMAIC/pull/1050); add opt-in streaming chat compatibility [#990](https://github.com/THU-MAIC/OpenMAIC/pull/990)
- Access code: refetch server providers after the code is accepted [#1081](https://github.com/THU-MAIC/OpenMAIC/pull/1081)
- Render service: make parallel capture effective [#1042](https://github.com/THU-MAIC/OpenMAIC/pull/1042); keep the entrypoint LF so the image starts on Windows [#1027](https://github.com/THU-MAIC/OpenMAIC/pull/1027)
- i18n: load every Inter subset so non-Latin text keeps the UI font [#1026](https://github.com/THU-MAIC/OpenMAIC/pull/1026); translate ASR provider names in the generation toolbar [#1028](https://github.com/THU-MAIC/OpenMAIC/pull/1028); localize Pro mode right rail labels [#1023](https://github.com/THU-MAIC/OpenMAIC/pull/1023)
- Render whiteboard math via KaTeX instead of raw LaTeX text [#938](https://github.com/THU-MAIC/OpenMAIC/pull/938); keep arrowheads visible when toggling thumbnails [#1045](https://github.com/THU-MAIC/OpenMAIC/pull/1045)
- AI: omit zero SiliconFlow thinking budget [#1035](https://github.com/THU-MAIC/OpenMAIC/pull/1035); harden shared Pi transport contracts [#1108](https://github.com/THU-MAIC/OpenMAIC/pull/1108)
- Importer: handle custom shapes without paths [#1015](https://github.com/THU-MAIC/OpenMAIC/pull/1015)
- Vocational mode: keep the toggle thumb within the track [#1032](https://github.com/THU-MAIC/OpenMAIC/pull/1032)
- Editor packages: add npm provenance metadata [#1098](https://github.com/THU-MAIC/OpenMAIC/pull/1098)
- Release: dedupe the published dsl and close two release-path blind spots [#1019](https://github.com/THU-MAIC/OpenMAIC/pull/1019); hand published versions to the marker job [#1076](https://github.com/THU-MAIC/OpenMAIC/pull/1076)

### Other Changes

- PBL: retire the v1 write path and dead UI, converge on v2 [#1060](https://github.com/THU-MAIC/OpenMAIC/pull/1060); split the planner core from the loop with an injectable LLM call path [#1069](https://github.com/THU-MAIC/OpenMAIC/pull/1069); pin single-call prompt goldens [#1071](https://github.com/THU-MAIC/OpenMAIC/pull/1071); route runtime agents through the shared LLM entry point [#1006](https://github.com/THU-MAIC/OpenMAIC/pull/1006)
- Document transform pipeline foundation [#920](https://github.com/THU-MAIC/OpenMAIC/pull/920); choreography overlays driven from descriptors [#947](https://github.com/THU-MAIC/OpenMAIC/pull/947); single-source the generated agent roster on the stage document [#994](https://github.com/THU-MAIC/OpenMAIC/pull/994)
- Publish validated package tarballs [#1040](https://github.com/THU-MAIC/OpenMAIC/pull/1040); publish storage and enforce version bumps [#998](https://github.com/THU-MAIC/OpenMAIC/pull/998); publish the OpenMAIC skill to ClawHub [#1056](https://github.com/THU-MAIC/OpenMAIC/pull/1056)
- Docs refresh and synchronization [#996](https://github.com/THU-MAIC/OpenMAIC/pull/996); align the environment variable template [#1107](https://github.com/THU-MAIC/OpenMAIC/pull/1107); stabilize the Hyperframes lint command [#1097](https://github.com/THU-MAIC/OpenMAIC/pull/1097)

## [0.3.1] - 2026-07-21

### Features

- **Video export (MP4)** — Export a lesson as a rendered video: a `VideoTimeline` IR with a pure compile pipeline [#913](https://github.com/THU-MAIC/OpenMAIC/pull/913), an L1 Hyperframes emitter with in-browser frame collection and ZIP export [#931](https://github.com/THU-MAIC/OpenMAIC/pull/931), and a service-backed MP4 render with in-app one-click export [#937](https://github.com/THU-MAIC/OpenMAIC/pull/937) (by @cosarah) — built on a shared orchestration spec in `lib/choreography` [#890](https://github.com/THU-MAIC/OpenMAIC/pull/890) (by @cosarah) and persisted TTS audio durations [#862](https://github.com/THU-MAIC/OpenMAIC/pull/862) (by @cosarah)
- **Server-backed runtime storage** — A pluggable storage seam for classroom runtime state: `@openmaic/storage` KV + asset primitives [#858](https://github.com/THU-MAIC/OpenMAIC/pull/858), a normalized DocumentStore [#860](https://github.com/THU-MAIC/OpenMAIC/pull/860), RuntimeStore sessions with append-only records [#880](https://github.com/THU-MAIC/OpenMAIC/pull/880), a DSL runtime envelope [#870](https://github.com/THU-MAIC/OpenMAIC/pull/870), device-anonymous learner identity [#885](https://github.com/THU-MAIC/OpenMAIC/pull/885), a runtime-event outbox with dual-write [#893](https://github.com/THU-MAIC/OpenMAIC/pull/893), cutovers for PBL learner state [#902](https://github.com/THU-MAIC/OpenMAIC/pull/902) [#922](https://github.com/THU-MAIC/OpenMAIC/pull/922) and chat sessions [#926](https://github.com/THU-MAIC/OpenMAIC/pull/926), and an HTTP backend contract with a Postgres backend and reference server [#946](https://github.com/THU-MAIC/OpenMAIC/pull/946)
- **Editor: direct manipulation** — Select and drag slide elements [#859](https://github.com/THU-MAIC/OpenMAIC/pull/859), 8-point resize + rotate handles [#881](https://github.com/THU-MAIC/OpenMAIC/pull/881), marquee multi-select with multi-element drag [#888](https://github.com/THU-MAIC/OpenMAIC/pull/888), and a draggable insert toolbar [#912](https://github.com/THU-MAIC/OpenMAIC/pull/912), scaffolded as the `@openmaic/renderer` v2 editing surface behind a machine-enforced import boundary [#853](https://github.com/THU-MAIC/OpenMAIC/pull/853) [#855](https://github.com/THU-MAIC/OpenMAIC/pull/855)
- **Edit with AI upgrades** — Natural-language element edits through a typed EditIntent pipeline [#896](https://github.com/THU-MAIC/OpenMAIC/pull/896), validated JSON Patch element edits [#927](https://github.com/THU-MAIC/OpenMAIC/pull/927), and multi-session conversation history for the AI editor [#801](https://github.com/THU-MAIC/OpenMAIC/pull/801)
- **DSL self-ownership** — `@openmaic/dsl` now owns the Action playback verbs [#787](https://github.com/THU-MAIC/OpenMAIC/pull/787), ships JSON Schema artifacts with pure validators [#817](https://github.com/THU-MAIC/OpenMAIC/pull/817), activates the migration registry and runner [#825](https://github.com/THU-MAIC/OpenMAIC/pull/825), and owns element-level normalization and defaults wired into the generator [#832](https://github.com/THU-MAIC/OpenMAIC/pull/832) and the importer output boundary [#845](https://github.com/THU-MAIC/OpenMAIC/pull/845)
- **Document Parsing expansion** — Multi-format course-material upload [#741](https://github.com/THU-MAIC/OpenMAIC/pull/741) and document bundles [#844](https://github.com/THU-MAIC/OpenMAIC/pull/844) (by @jackefn), audio/video media extraction with an AliDocMind provider [#887](https://github.com/THU-MAIC/OpenMAIC/pull/887) (by @yanpgwang), and a renamed Document Parsing surface with visible supported formats and extended MinerU support (by @yanpgwang)
- Add Azure OpenAI as an LLM provider [#916](https://github.com/THU-MAIC/OpenMAIC/pull/916) (by @hydraxman), SearXNG as a web-search provider [#842](https://github.com/THU-MAIC/OpenMAIC/pull/842) (by @PineSongCN), ComfyUI as an image provider [#850](https://github.com/THU-MAIC/OpenMAIC/pull/850) (by @PhillLittlewood), the GPT-5.6 model family [#907](https://github.com/THU-MAIC/OpenMAIC/pull/907), and an updated Doubao Seed model catalog [#827](https://github.com/THU-MAIC/OpenMAIC/pull/827)
- Add one-click token-plan setup and a deployment usage dashboard [#784](https://github.com/THU-MAIC/OpenMAIC/pull/784) (by @yanpgwang)
- Add action-level playback navigation [#843](https://github.com/THU-MAIC/OpenMAIC/pull/843) (by @danishsshaikh)
- Redesign the narration timeline (action picker + inline insert) and enable it for interactive/PBL scenes [#834](https://github.com/THU-MAIC/OpenMAIC/pull/834)
- Add in-editor authoring of classroom agents with a Stage-level roster [#816](https://github.com/THU-MAIC/OpenMAIC/pull/816)
- Parallelize within-scene TTS generation [#696](https://github.com/THU-MAIC/OpenMAIC/pull/696) (by @ly-wang19)
- Feed the real HTML element inventory into interactive-action prompts [#829](https://github.com/THU-MAIC/OpenMAIC/pull/829) and add a postMessage listener contract to diagram/game/code widgets [#872](https://github.com/THU-MAIC/OpenMAIC/pull/872) (by @yanpgwang)
- Add an experimental Pi classroom runtime behind a flag [#914](https://github.com/THU-MAIC/OpenMAIC/pull/914)

### Bug Fixes

- Security: disable redirects in media connectivity probes [#930](https://github.com/THU-MAIC/OpenMAIC/pull/930) and harden provider redirect handling with ISATAP address detection [#928](https://github.com/THU-MAIC/OpenMAIC/pull/928) against SSRF (by @YizukiAme)
- Generation: strip reasoning blocks before JSON parsing [#750](https://github.com/THU-MAIC/OpenMAIC/pull/750) (by @yipwingtim), localize scene-generation errors [#894](https://github.com/THU-MAIC/OpenMAIC/pull/894) (by @wsun1), tolerate malformed generated slide data (by @yipwingtim), and honor outline node constraints in diagrams [#911](https://github.com/THU-MAIC/OpenMAIC/pull/911)
- Editor: keep emptied or zero-action scenes playable, bind the outline by stable id, and surface incomplete content [#814](https://github.com/THU-MAIC/OpenMAIC/pull/814); show per-line loading while the batch "regenerate all TTS" runs [#830](https://github.com/THU-MAIC/OpenMAIC/pull/830)
- Export: fix the unresponsive resource pack for interactive-only decks [#933](https://github.com/THU-MAIC/OpenMAIC/pull/933) (by @2046731121CC), compute SVG path bounding boxes via `getBounds()` [#656](https://github.com/THU-MAIC/OpenMAIC/pull/656), keep sibling attributes when style is empty [#683](https://github.com/THU-MAIC/OpenMAIC/pull/683), and convert PPTX shadow offsets from px to pt [#679](https://github.com/THU-MAIC/OpenMAIC/pull/679) (by @ly-wang19)
- Quiz: render formulas in quiz text [#833](https://github.com/THU-MAIC/OpenMAIC/pull/833) (by @dpersek); stop leaking questions on entry and pass results to the chat agent [#823](https://github.com/THU-MAIC/OpenMAIC/pull/823) (by @yanpgwang)
- Storage: store image files as array buffers [#923](https://github.com/THU-MAIC/OpenMAIC/pull/923) (by @YizukiAme) and accept image storage IDs containing underscores [#918](https://github.com/THU-MAIC/OpenMAIC/pull/918)
- Chat: preserve message line breaks [#908](https://github.com/THU-MAIC/OpenMAIC/pull/908), and cap the roundtable non-presentation input height [#917](https://github.com/THU-MAIC/OpenMAIC/pull/917) (by @YizukiAme)
- TTS: respect string context when splitting the Doubao stream [#677](https://github.com/THU-MAIC/OpenMAIC/pull/677); web search: match Brave's current result-title markup [#688](https://github.com/THU-MAIC/OpenMAIC/pull/688) (by @ly-wang19)
- Stage: centralize the deck completion predicate [#883](https://github.com/THU-MAIC/OpenMAIC/pull/883) (by @dpersek)
- AI: close PROVIDERS/THINKING_CAPABILITIES metadata drift with a guard [#809](https://github.com/THU-MAIC/OpenMAIC/pull/809) (by @mvanhorn)
- Home: clarify the Interactive Mode selected state [#901](https://github.com/THU-MAIC/OpenMAIC/pull/901); lecture notes: render interactive-webpage widget actions [#810](https://github.com/THU-MAIC/OpenMAIC/pull/810)
- Docker: fix the postinstall script failure in Docker builds [#835](https://github.com/THU-MAIC/OpenMAIC/pull/835) (by @Lee-Flier)
- mathml2omml: call `includes()` instead of indexing it [#681](https://github.com/THU-MAIC/OpenMAIC/pull/681) (by @ly-wang19)

### Other Changes

- Performance: dedupe editor alignment snap-lines in O(n) [#692](https://github.com/THU-MAIC/OpenMAIC/pull/692), diff code lines in O(n) via a prev-line map [#706](https://github.com/THU-MAIC/OpenMAIC/pull/706), and index assigned images by id in `fixElementDefaults` [#701](https://github.com/THU-MAIC/OpenMAIC/pull/701) (by @ly-wang19)
- Tests: cover `splitLongSpeechText` / `splitLongSpeechActions` [#694](https://github.com/THU-MAIC/OpenMAIC/pull/694) (by @ly-wang19); settle dynamic imports [#899](https://github.com/THU-MAIC/OpenMAIC/pull/899) and drain debounced saves [#897](https://github.com/THU-MAIC/OpenMAIC/pull/897) before store-test teardown
- Media providers: share the submit-poll task driver [#900](https://github.com/THU-MAIC/OpenMAIC/pull/900) and the auth probe across matching adapters [#903](https://github.com/THU-MAIC/OpenMAIC/pull/903), and remove the dead legacy pipeline chain [#905](https://github.com/THU-MAIC/OpenMAIC/pull/905) (by @YizukiAme)
- Packages: add repository metadata [#813](https://github.com/THU-MAIC/OpenMAIC/pull/813) and set `@openmaic/*` package versions to 0.0.2 [#812](https://github.com/THU-MAIC/OpenMAIC/pull/812) (by @xuyuanwei678)
- Docs: document the dev-server OOM workaround for large generations [#808](https://github.com/THU-MAIC/OpenMAIC/pull/808) (by @mvanhorn)
- Tighten GitHub issue intake [#921](https://github.com/THU-MAIC/OpenMAIC/pull/921)

## [0.3.0] - 2026-06-28

### License

- Relicense the project from AGPL-3.0 to MIT

### Breaking Changes

- Remove `allow-same-origin` from the interactive `srcDoc` iframe sandbox for tighter isolation; interactive widgets that relied on same-origin access may need updates [#726](https://github.com/THU-MAIC/OpenMAIC/pull/726) (by @sebastiondev)
- Restructure the slide DSL and renderer into standalone `@openmaic/*` packages consumed by the app; the inline DSL shim is removed [#707](https://github.com/THU-MAIC/OpenMAIC/pull/707) [#738](https://github.com/THU-MAIC/OpenMAIC/pull/738)

### Features

- **Project-Based Learning (PBL) v2** — Add the PBL v2 core schema and generation path [#795](https://github.com/THU-MAIC/OpenMAIC/pull/795) (by @cosarah), runtime APIs with classroom UI [#799](https://github.com/THU-MAIC/OpenMAIC/pull/799) (by @cosarah), in-timeline discussion authoring [#798](https://github.com/THU-MAIC/OpenMAIC/pull/798), auto-retry for transient scene-generation failures [#788](https://github.com/THU-MAIC/OpenMAIC/pull/788) (by @YizukiAme), and a planner eval harness [#803](https://github.com/THU-MAIC/OpenMAIC/pull/803) [#805](https://github.com/THU-MAIC/OpenMAIC/pull/805) (by @cosarah)
- **Edit with AI** — Add a Pro-mode editor agent that edits generated slides from a chat prompt [#777](https://github.com/THU-MAIC/OpenMAIC/pull/777)
- **`@openmaic/*` SDK on npm** — Publish the DSL, renderer, and importer SDK family to npm [#778](https://github.com/THU-MAIC/OpenMAIC/pull/778) [#780](https://github.com/THU-MAIC/OpenMAIC/pull/780), introduce the `maic-import`/`maic-renderer` workspace packages [#668](https://github.com/THU-MAIC/OpenMAIC/pull/668) (by @xuyuanwei678), and promote the Stage/Scene lesson skeleton into `@maic/dsl` [#740](https://github.com/THU-MAIC/OpenMAIC/pull/740)
- Add optional per-stage LLM model routing [#745](https://github.com/THU-MAIC/OpenMAIC/pull/745)
- Add GLM-5.2 and Kimi K2.7 Code [#774](https://github.com/THU-MAIC/OpenMAIC/pull/774), and Qwen3.7 Plus and Qwen3.7 Max [#753](https://github.com/THU-MAIC/OpenMAIC/pull/753), to the model registry
- Add a vocational-learning task engine with procedural skill widgets [#685](https://github.com/THU-MAIC/OpenMAIC/pull/685) (by @jackefn)
- Add Korean (ko-KR) translation [#733](https://github.com/THU-MAIC/OpenMAIC/pull/733) (by @moduvoice)
- Improve TTS with per-agent auto-voice quality and stable timbre registration [#670](https://github.com/THU-MAIC/OpenMAIC/pull/670), and unify the provider-enablement model with browser-native TTS off by default [#665](https://github.com/THU-MAIC/OpenMAIC/pull/665)
- Add opt-in parallel scene-content generation [#660](https://github.com/THU-MAIC/OpenMAIC/pull/660) (by @ly-wang19)
- Add a document extractor provider foundation [#704](https://github.com/THU-MAIC/OpenMAIC/pull/704) (by @jackefn)
- Infer concise course titles from outlines for more readable course names [#756](https://github.com/THU-MAIC/OpenMAIC/pull/756)
- Refactor widget actions into the unified scene action pipeline [#796](https://github.com/THU-MAIC/OpenMAIC/pull/796)

### Bug Fixes

- Importer: port PPTX shape-restoration hotfixes [#789](https://github.com/THU-MAIC/OpenMAIC/pull/789) (by @xuyuanwei678), fix hanging-indent bullet rendering [#727](https://github.com/THU-MAIC/OpenMAIC/pull/727) (by @xuyuanwei678), and guard SVG export against arc-first paths [#638](https://github.com/THU-MAIC/OpenMAIC/pull/638) (by @ly-wang19)
- Generation: make outline type changes take effect so interactive/PBL outlines are no longer downgraded to slides [#772](https://github.com/THU-MAIC/OpenMAIC/pull/772), stop regenerating deleted slides on finished decks [#769](https://github.com/THU-MAIC/OpenMAIC/pull/769), show full key-point text in the outline editor [#782](https://github.com/THU-MAIC/OpenMAIC/pull/782), and linearize outline streaming and interactive post-processing for better performance [#732](https://github.com/THU-MAIC/OpenMAIC/pull/732)
- Agent: respond to the user's turn before lecturing [#699](https://github.com/THU-MAIC/OpenMAIC/pull/699), and constrain action narration to a single teacher voice [#671](https://github.com/THU-MAIC/OpenMAIC/pull/671)
- Editor: stop dumping the raw tool-failure blob in AI edit tool cards [#785](https://github.com/THU-MAIC/OpenMAIC/pull/785), persist AgentBar voice and mode selections across reloads [#723](https://github.com/THU-MAIC/OpenMAIC/pull/723), and keep the edit runtime alive across read-only scenes [#802](https://github.com/THU-MAIC/OpenMAIC/pull/802) (by @cosarah)
- Audio: gate the speech button on ASR availability [#711](https://github.com/THU-MAIC/OpenMAIC/pull/711), revoke blob URLs when playback is rejected [#652](https://github.com/THU-MAIC/OpenMAIC/pull/652) (by @ly-wang19), and surface TTS provider rate limits as HTTP 429 [#644](https://github.com/THU-MAIC/OpenMAIC/pull/644) (by @ly-wang19)
- Renderer: make the code entrance animation play line by line [#724](https://github.com/THU-MAIC/OpenMAIC/pull/724) (by @tongshu2023)
- Security: point the SSRF local-network rejection at the `ALLOW_LOCAL_NETWORKS` escape hatch [#667](https://github.com/THU-MAIC/OpenMAIC/pull/667) (by @mvanhorn)
- Networking: bypass the proxy for loopback hosts and honor `NO_PROXY` [#718](https://github.com/THU-MAIC/OpenMAIC/pull/718) (by @tongshu2023)
- Fix overlay layout shift on the home and classroom pages [#690](https://github.com/THU-MAIC/OpenMAIC/pull/690) (by @cosarah)

### Other Changes

- Drop the dead `ThumbnailSlide` path and fix `@maic/dsl` Node ESM resolution [#736](https://github.com/THU-MAIC/OpenMAIC/pull/736)
- Docs: correct the stale i18n location and supported-language list [#640](https://github.com/THU-MAIC/OpenMAIC/pull/640) (by @ly-wang19)

## [0.2.2] - 2026-06-02

### Features

- **MAIC Editor (v0) — slide editing surface** — A new **Pro Mode** toggle turns any generated slide into an editable canvas: select and edit text, insert text boxes and images, navigate and reorder slides from a thumbnail rail, with history-aware undo/redo. This is the first surface of the broader MAIC Editor framework (gated behind `NEXT_PUBLIC_MAIC_EDITOR_ENABLED`) [#615](https://github.com/THU-MAIC/OpenMAIC/pull/615)
- **Editable outline before generation** — The streaming course outline now morphs into an inline editor: review, edit, reorder, and add or delete scenes and bullet points, then confirm to generate the full course — so you catch structure problems before spending a full generation [#558](https://github.com/THU-MAIC/OpenMAIC/pull/558)
- **Offline-ready classroom export** — Exported teaching resource packs and classroom ZIPs now inline external assets so interactive pages open fully offline, even when copied to another machine [#613](https://github.com/THU-MAIC/OpenMAIC/pull/613)
- Add Claude Opus 4.8 and MiniMax M3 to the default model registry [#635](https://github.com/THU-MAIC/OpenMAIC/pull/635)
- Add Gemini 3.5 Flash [#584](https://github.com/THU-MAIC/OpenMAIC/pull/584)
- Add Xiaomi MiMo Token Plan support [#578](https://github.com/THU-MAIC/OpenMAIC/pull/578) (by @xuruiray)
- Add web search providers: Brave and Baidu [#42](https://github.com/THU-MAIC/OpenMAIC/pull/42) (by @YizukiAme), Bocha [#524](https://github.com/THU-MAIC/OpenMAIC/pull/524), and MiniMax [#634](https://github.com/THU-MAIC/OpenMAIC/pull/634)
- Add Azure STT (Fast Transcription) as a speech-to-text provider [#175](https://github.com/THU-MAIC/OpenMAIC/pull/175) (by @ismailariyan)
- Add HappyHorse video adapter [#509](https://github.com/THU-MAIC/OpenMAIC/pull/509) (by @xuruiray) and Lemonade as an LLM provider [#508](https://github.com/THU-MAIC/OpenMAIC/pull/508)
- Add OpenAI image generation environment-variable fallback [#510](https://github.com/THU-MAIC/OpenMAIC/pull/510) (by @xuruiray)
- Add generated-video manifest references so produced videos survive export/import [#540](https://github.com/THU-MAIC/OpenMAIC/pull/540)
- Add Traditional Chinese (zh-TW) [#517](https://github.com/THU-MAIC/OpenMAIC/pull/517) (by @alvinets) and Brazilian Portuguese (pt-BR) [#602](https://github.com/THU-MAIC/OpenMAIC/pull/602) (by @hemanz) interface languages

### Bug Fixes

- **Server-configured providers are now admin-managed** — providers set via server environment can no longer be overridden by client settings, preventing base-URL/key tampering on shared deployments [#624](https://github.com/THU-MAIC/OpenMAIC/pull/624); fixes server API-key fallback when the client echoes the provider base URL [#533](https://github.com/THU-MAIC/OpenMAIC/pull/533) (by @LooThao); auto-selects the server LLM model [#577](https://github.com/THU-MAIC/OpenMAIC/pull/577) (by @xuruiray); and enforces a "usable provider ⇒ concrete model" invariant [#581](https://github.com/THU-MAIC/OpenMAIC/pull/581)
- Keep interactive scenes alive across remounts with an iframe keep-alive pool, so interactive content no longer reloads when navigating [#629](https://github.com/THU-MAIC/OpenMAIC/pull/629)
- Restore the orchestration director's ability to answer the user's question and stop runaway turns (removed `maxTurns`) [#599](https://github.com/THU-MAIC/OpenMAIC/pull/599); restore agent attribution in the director summary [#554](https://github.com/THU-MAIC/OpenMAIC/pull/554) (by @ashutoshrana)
- Skip shapes with malformed SVG paths instead of aborting the whole PPTX export [#505](https://github.com/THU-MAIC/OpenMAIC/pull/505); prevent memory leaks and silent export failures [#552](https://github.com/THU-MAIC/OpenMAIC/pull/552) (by @arnow117)
- Add defensive checks in ChartElement to prevent crashes on malformed chart data [#588](https://github.com/THU-MAIC/OpenMAIC/pull/588) (by @tongshu2023)
- Let whiteboard code elements capture internal scroll/drag instead of the canvas [#544](https://github.com/THU-MAIC/OpenMAIC/pull/544) (by @cosarah)
- Preserve discussion triggers when importing classroom ZIPs [#557](https://github.com/THU-MAIC/OpenMAIC/pull/557) (by @cosarah)
- Fix generated video thumbnails [#546](https://github.com/THU-MAIC/OpenMAIC/pull/546)
- Gate media snippets in the interactive-outlines prompt template [#628](https://github.com/THU-MAIC/OpenMAIC/pull/628)
- Hide the unsupported MiniMax Hailuo fast text-to-video model [#632](https://github.com/THU-MAIC/OpenMAIC/pull/632); remove weak Lemonade recommended models [#567](https://github.com/THU-MAIC/OpenMAIC/pull/567) (by @cosarah)
- Fix Haiku 4.5 thinking controls [#501](https://github.com/THU-MAIC/OpenMAIC/pull/501)
- Use an ESM import for TypeScript in the pptxgenjs rollup config [#616](https://github.com/THU-MAIC/OpenMAIC/pull/616)
- Align zh-TW provider names with the rest of the locale set

### Other Changes

- Add a Fumadocs-based documentation site [#622](https://github.com/THU-MAIC/OpenMAIC/pull/622)
- Add a VoxCPM2 setup guide and tighten the README section [#500](https://github.com/THU-MAIC/OpenMAIC/pull/500) [#502](https://github.com/THU-MAIC/OpenMAIC/pull/502)
- Fix the commercial licensing contact email [#604](https://github.com/THU-MAIC/OpenMAIC/pull/604) (by @DHQ1204)

## [0.2.1] - 2026-04-26

### Features

- **[VoxCPM2](https://github.com/OpenBMB/VoxCPM) TTS provider with voice cloning** — OpenMAIC adapts to user-managed VoxCPM backends (vLLM-Omni, Nano-VLLM, official Python API). Clone any voice from a reference audio clip you upload or record in the browser, or let Auto Voice generate a fitting voice from each agent's persona at synthesis time. Voice profiles are stored locally to keep the serverless setup model. The Agent Bar exposes a searchable, previewable voice picker that draws from the global VoxCPM voice pool [#496](https://github.com/THU-MAIC/OpenMAIC/pull/496)
- **Per-model thinking configuration** — First-class metadata for each model's reasoning capability (effort levels, on/off toggle, adjustable budget, or fixed thinking) flows through chat and all generation paths and is mapped to the right provider-specific request fields (Anthropic `thinking`, OpenAI `reasoning`, etc.). The model selector becomes a unified provider/model/thinking popover with compact search and a much smaller toolbar footprint [#494](https://github.com/THU-MAIC/OpenMAIC/pull/494)
- **End-of-course completion page with persistent quiz state** — When the outline is fully materialized, students see a course-complete view with quiz score card, scene-type stat cards, and a (motion-respecting) confetti celebration. Quiz answers persist on submit and grading results persist on completion, so navigating away and back restores the reviewing state with AI feedback intact instead of resetting [#484](https://github.com/THU-MAIC/OpenMAIC/pull/484)
- Add latest released models including [GPT-5.5](https://github.com/THU-MAIC/OpenMAIC/pull/487), DeepSeek-V4 (`-pro`, `-flash`), Xiaomi [MiMo](https://github.com/XiaomiMiMo) (`mimo-v2.5-pro`, `mimo-v2.5`), Tencent [Hy3](https://github.com/Tencent-Hunyuan), and [OpenRouter](https://openrouter.ai/) as a multi-provider gateway [#481](https://github.com/THU-MAIC/OpenMAIC/pull/481) [#487](https://github.com/THU-MAIC/OpenMAIC/pull/487)
- Add OpenAI image generation (GPT-Image-2) as a media provider [#481](https://github.com/THU-MAIC/OpenMAIC/pull/481)
- Refresh built-in model registries across Anthropic, DeepSeek, Kimi, Qwen, MiniMax, Grok, OpenAI, GLM, SiliconFlow, and Ollama; persisted local settings now rehydrate in registry order so newly curated lists appear consistent without clearing state [#481](https://github.com/THU-MAIC/OpenMAIC/pull/481)
- Add inline search for recent classrooms on the home page with deferred filtering by name and description, keyboard-driven open/clear/collapse [#476](https://github.com/THU-MAIC/OpenMAIC/pull/476)
- Add Deep-Interactive badge on classroom thumbnails for sessions generated with Interactive Mode [#478](https://github.com/THU-MAIC/OpenMAIC/pull/478)
- Replace always-included media instruction blocks in generation prompts with conditional snippet includes gated on `imageEnabled` / `videoEnabled` — disabled capabilities are removed from the prompt entirely instead of relying on negative-override directives the model often ignored [#490](https://github.com/THU-MAIC/OpenMAIC/pull/490) (by @YizukiAme)

### Bug Fixes

- Fix language drift between outline and scene generation by unifying the languageDirective across the pipeline so the same target language flows from outline planning through every per-scene call [#474](https://github.com/THU-MAIC/OpenMAIC/pull/474)

### Other Changes

- Refactor whiteboard role prompts to file-based markdown templates and add a geometry-conflict detector (overlap, line-through-bbox, canvas clipping) that surfaces problems back to the model. Eval (flash, repeat 3, gemini-3.1-pro scorer) shows overall quality 5.4 → 6.1 and overlap 6.3 → 8.1 from prompt + detector alone [#485](https://github.com/THU-MAIC/OpenMAIC/pull/485)
- Migrate orchestration prompt builders (`buildStructuredPrompt`, `buildDirectorPrompt`, `buildPBLSystemPrompt`) from inline TS template literals to file-based markdown templates under `lib/prompts/`, sharing the loader infrastructure with the generation pipeline. `prompt-builder.ts` 890 → 314 lines; future content tweaks land as markdown edits [#459](https://github.com/THU-MAIC/OpenMAIC/pull/459)

## [0.2.0] - 2026-04-20

### Features

- **Deep Interactive Mode** — Generate hands-on interactive scenes (3D visualization, simulation, game, mind map/diagram, online programming) with an AI teacher who operates the UI to guide students. Fully responsive across desktop, tablet, and mobile [#461](https://github.com/THU-MAIC/OpenMAIC/pull/461)
- Add code element support on the whiteboard — AI agents can write, display, and reference runnable code during lessons [#385](https://github.com/THU-MAIC/OpenMAIC/pull/385) (by @cosarah)
- Add Arabic (ar-SA) interface language [#431](https://github.com/THU-MAIC/OpenMAIC/pull/431) (by @YizukiAme)
- Add MinerU Cloud API as a PDF parsing provider, with a dedicated settings UI [#438](https://github.com/THU-MAIC/OpenMAIC/pull/438)
- Add latest OpenAI models to the default config [#416](https://github.com/THU-MAIC/OpenMAIC/pull/416) (by @donghch)
- Add GLM-5.1 and GLM-5V-Turbo to GLM preset models [#437](https://github.com/THU-MAIC/OpenMAIC/pull/437)
- Add international base URL shortcuts for GLM, Kimi, and MiniMax in provider settings [#449](https://github.com/THU-MAIC/OpenMAIC/pull/449)
- Add anti-framing security headers (X-Frame-Options + CSP `frame-ancestors`) with an optional `ALLOWED_FRAME_ANCESTORS` override [#430](https://github.com/THU-MAIC/OpenMAIC/pull/430) (by @YizukiAme)
- Add i18n key alignment check to CI so missing or extra translation keys fail the build [#447](https://github.com/THU-MAIC/OpenMAIC/pull/447) (by @KanameMadoka520)
- Add whiteboard layout quality eval harness and unify it with the outline-language harness [#425](https://github.com/THU-MAIC/OpenMAIC/pull/425) [#453](https://github.com/THU-MAIC/OpenMAIC/pull/453)

### Bug Fixes

- Fix classroom ZIP export to use the latest classroom name from IndexedDB [#435](https://github.com/THU-MAIC/OpenMAIC/pull/435)
- Fix spotlight cutout for text elements and add element-content variant for image/video [#457](https://github.com/THU-MAIC/OpenMAIC/pull/457)

### Other Changes

- Renew the README with Deep Interactive Mode showcase and visual assets [#463](https://github.com/THU-MAIC/OpenMAIC/pull/463) (by @Shirokumaaaa)
- Update Discord invite links across README, CONTRIBUTING, and issue templates

## [0.1.1] - 2026-04-14

### Features

- Add inline language inference for outline and PBL generation, replacing manual language selector [#412](https://github.com/THU-MAIC/OpenMAIC/pull/412) (by @cosarah)
- Add ACCESS_CODE site-level authentication for shared deployments [#411](https://github.com/THU-MAIC/OpenMAIC/pull/411)
- Add classroom export and import as ZIP [#418](https://github.com/THU-MAIC/OpenMAIC/pull/418)
- Add custom OpenAI-compatible TTS/ASR provider support [#409](https://github.com/THU-MAIC/OpenMAIC/pull/409)
- Add Ollama as built-in provider with keyless activation [#94](https://github.com/THU-MAIC/OpenMAIC/pull/94) (by @f1rep0wr)
- Add Japanese (ja-JP) locale [#365](https://github.com/THU-MAIC/OpenMAIC/pull/365) (by @YizukiAme)
- Add Russian (ru-RU) locale [#261](https://github.com/THU-MAIC/OpenMAIC/pull/261) (by @maximvalerevich)
- Migrate i18n infrastructure to i18next framework [#331](https://github.com/THU-MAIC/OpenMAIC/pull/331) (by @cosarah)
- Add MiniMax provider support [#182](https://github.com/THU-MAIC/OpenMAIC/pull/182) (by @Hi-Jiajun)
- Add Doubao TTS 2.0 (Volcengine) provider [#283](https://github.com/THU-MAIC/OpenMAIC/pull/283)
- Add configurable model selection for TTS and ASR [#108](https://github.com/THU-MAIC/OpenMAIC/pull/108) (by @ShaojieLiu)
- Add context-aware Tavily web search when PDF is uploaded [#258](https://github.com/THU-MAIC/OpenMAIC/pull/258) (by @nkmohit)
- Add course rename [#58](https://github.com/THU-MAIC/OpenMAIC/pull/58) (by @YizukiAme)
- Add end-to-end generation happy path test [#405](https://github.com/THU-MAIC/OpenMAIC/pull/405)

### Bug Fixes

- Fix DNS rebinding bypass in SSRF validation [#386](https://github.com/THU-MAIC/OpenMAIC/pull/386) (by @YizukiAme)
- Add ALLOW_LOCAL_NETWORKS env var for self-hosted deployments [#366](https://github.com/THU-MAIC/OpenMAIC/pull/366)
- Fix custom provider baseUrl not persisting on creation [#417](https://github.com/THU-MAIC/OpenMAIC/pull/417) (by @YizukiAme)
- Hide Ollama from model selector when not configured [#420](https://github.com/THU-MAIC/OpenMAIC/pull/420) (by @cosarah)
- Fix agent configs not persisting in server-generated classrooms [#336](https://github.com/THU-MAIC/OpenMAIC/pull/336) (by @YizukiAme)
- Fix action filtering logic and add safety improvements [#163](https://github.com/THU-MAIC/OpenMAIC/pull/163) (by @zky001)
- Fix modifier-key combos triggering single-key shortcuts [#359](https://github.com/THU-MAIC/OpenMAIC/pull/359) (by @YizukiAme)
- Fix agent mode selection for conditionally set generatedAgentConfigs [#373](https://github.com/THU-MAIC/OpenMAIC/pull/373) (by @YizukiAme)
- Unify TTS model selection to per-provider and fix ElevenLabs model_id [#326](https://github.com/THU-MAIC/OpenMAIC/pull/326)
- Allow model-level test connection without client-side API key [#309](https://github.com/THU-MAIC/OpenMAIC/pull/309) (by @cosarah)
- Add structured request context to all API error logs [#337](https://github.com/THU-MAIC/OpenMAIC/pull/337) (by @YizukiAme)
- Fix breathing bar background color in roundtable [#307](https://github.com/THU-MAIC/OpenMAIC/pull/307)

### Other Changes

- Add missing Ollama and Doubao provider names for ru-RU [#389](https://github.com/THU-MAIC/OpenMAIC/pull/389) (by @cosarah)
- Update Ollama logo to official version [#400](https://github.com/THU-MAIC/OpenMAIC/pull/400) (by @cosarah)
- Remove deprecated Gemini 3 Pro Preview model [#142](https://github.com/THU-MAIC/OpenMAIC/pull/142) (by @Orinameh)
- Update expired Discord invite link
- Create SECURITY.md [#281](https://github.com/THU-MAIC/OpenMAIC/pull/281) (by @fai1424)

### New Contributors

@f1rep0wr, @maximvalerevich, @Hi-Jiajun, @cosarah, @zky001, @Orinameh, @fai1424

## [0.1.0] - 2026-03-26

The first tagged release of OpenMAIC, including all improvements since the initial open-source launch.

### Highlights

- **Discussion TTS** — Voice playback during discussion phase with per-agent voice assignment, supporting all TTS providers including browser-native [#211](https://github.com/THU-MAIC/OpenMAIC/pull/211)
- **Immersive Mode** — Full-screen view with speech bubbles, auto-hide controls, and keyboard navigation [#195](https://github.com/THU-MAIC/OpenMAIC/pull/195) (by @YizukiAme)
- **Discussion buffer-level pause** — Freeze text reveal without aborting the AI stream [#129](https://github.com/THU-MAIC/OpenMAIC/pull/129) (by @YizukiAme)
- **Keyboard shortcuts** — Comprehensive roundtable controls: T/V/Esc/Space/M/S/C [#256](https://github.com/THU-MAIC/OpenMAIC/pull/256) (by @YizukiAme)
- **Whiteboard enhancements** — Pan, zoom, auto-fit [#31](https://github.com/THU-MAIC/OpenMAIC/pull/31), history and auto-save [#40](https://github.com/THU-MAIC/OpenMAIC/pull/40) (by @YizukiAme)
- **New providers** — ElevenLabs TTS [#134](https://github.com/THU-MAIC/OpenMAIC/pull/134) (by @nkmohit), Grok/xAI for LLM, image, and video [#113](https://github.com/THU-MAIC/OpenMAIC/pull/113) (by @KanameMadoka520)
- **Server-side generation** — Media and TTS generation on the server [#75](https://github.com/THU-MAIC/OpenMAIC/pull/75) (by @cosarah)
- **1.25x playback speed** [#131](https://github.com/THU-MAIC/OpenMAIC/pull/131) (by @YizukiAme)
- **OpenClaw integration** — Generate classrooms from Feishu, Slack, Telegram, and 20+ messaging apps [#4](https://github.com/THU-MAIC/OpenMAIC/pull/4) (by @cosarah)
- **Vercel one-click deploy** [#2](https://github.com/THU-MAIC/OpenMAIC/pull/2) (by @cosarah)

### Security

- Fix SSRF and credential forwarding via client-supplied baseUrl [#30](https://github.com/THU-MAIC/OpenMAIC/pull/30) (by @Wing900)
- Use resolved API key in chat route instead of client-sent key [#221](https://github.com/THU-MAIC/OpenMAIC/pull/221)

### Testing

- Add Vitest unit testing infrastructure [#144](https://github.com/THU-MAIC/OpenMAIC/pull/144)
- Add Playwright e2e testing framework [#229](https://github.com/THU-MAIC/OpenMAIC/pull/229)

### New Contributors

@YizukiAme, @nkmohit, @KanameMadoka520, @Wing900, @Bortlesboat, @JokerQianwei, @humingfeng, @tsinglua, @mehulmpt, @ShaojieLiu, @Rowtion
