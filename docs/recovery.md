# TeacherScenarioLab 开发数据库初始化与恢复

生产托管数据库已选择Neon免费PostgreSQL，操作与回滚见[Cloudflare与Neon上线说明](cloudflare.md)。
生产恢复先保留当前数据备份，并复核应用回退版本与schema兼容性。

> 适用：本地开发与测试环境。每次会话先复核实际数据库位置、连接与持久化方式：
> 本机数据目录、Docker 命名卷及临时 CI 服务的保留策略各异。情境源文件、
> 管理导出与数据库备份分别保留；训练记录和账号以数据库备份恢复。

## 1. 最小初始化（PostgreSQL 16）

```bash
# 角色与库（示例口令仅用于本机开发，绝不提交、绝不用于生产）
sudo -u postgres psql -c "CREATE ROLE openmaic LOGIN CREATEDB PASSWORD '<dev-password>';"
sudo -u postgres psql -c "CREATE DATABASE openmaic OWNER openmaic;"
```

`.env.local` 里写：

```
DATABASE_URL=<redacted>
```

没有 `DATABASE_URL` 时开发服务器拒绝启动。训练存储在首次访问时
自动建表与迁移（`ensureTrainingSchema`），不需要手动跑迁移。

## 2. 管理员初始化

管理员永不自助授予，只从环境变量来：

1. 创建一个学员账号：`POST /api/training/accounts`（body 可带
   `displayName`），响应会 `Set-Cookie` 一个会话，并返回
   `account.accountId`（形如 `acct:<uuid>`）。
2. 以该账号 ID 启动开发服务器：

```bash
DATABASE_URL='<your-database-url>' \
  TRAINING_ADMIN_ACCOUNT_IDS='acct:<uuid>' \
  pnpm dev
```

3. 核对：`GET /api/training/accounts/me` 应返回 `roles: ["admin"]`；
   匿名访问管理 API 应返回 403。

## 3. 情境导入与发布（管理后台流程，不走数据库直写）

1. 管理员登录态下 `POST /api/training/admin/scenarios/import`
   （body `{ "scenarioId": "<代码草稿 id>" }`）→ 201，草稿入库
   （`publishedAt` 为 null）。
2. 核对详情：`GET /api/training/admin/scenarios/<id>/versions/<v>`，
   标题、事实、规则、披露条件与代码一致。
3. 发布前公开路由应为 404：`GET /api/training/scenarios/<id>/versions/<v>`。
4. 发布：`POST /api/training/admin/scenarios/<id>/versions/<v>/publish`
   → 200；重复发布/重复导入均为 409。
5. 发布后大厅 `GET /api/training/scenarios` 应列出该情境。

通过表单创建的情境走同样的流程：管理后台“新建版本”保存为草稿
→ 详情核对 → 发布。已发布版本不可编辑、不可删除、不可覆盖；
改动只能新建版本。

## 4. 虚拟机替换 / 开发库丢失后的恢复

1. 重装 PostgreSQL 16 与 pnpm（`npm install -g pnpm@10.28.0`），
   重建角色与库（第 1 节；口令与库名保持一致可减少改动）。
2. 重做第 2 节管理员初始化（账号 ID 会变，启动命令里的
   `TRAINING_ADMIN_ACCOUNT_IDS` 要同步换成新 ID）。
3. 重做第 3 节导入发布（代码草稿是事实源，重新导入即可）。
4. 有备份时，在独立空库恢复并核对账号、训练记录与情境版本；具体命令
   见 `docs/deployment.md`。缺少备份时，重新导入情境无法恢复旧训练记录与账号。
   开发库保持使用验证数据。
5. 恢复后跑一次闭环验证：建会话 → 开始 → 脚本多轮 → 推进状态 →
   评价（无密钥时应为 503 且不落账）→ 记录页可见该训练。

## 5. 模型配置与重启注意事项

- 本地长期配置是工作目录的 `openmaic.yml`。双供应商模板为
  `openmaic.teacher-scenario.example.yml`，通用模板为 `openmaic.example.yml`。
  双供应商模板引用 `${NVIDIA_API_KEY}` / `${GLM_API_KEY}`，这两个
  变量与 `NVIDIA_MODEL_ID`、`GLM_MODEL_ID` 必须在 `.env.local` 中配置，否则服务器拒绝启动。
- 只有一把 key 就绪时，先把另一家 provider 段和对应的槽位行注释
  掉再启动，不要留空变量启动。
- 配置在进程启动时读取并缓存：改 `openmaic.yml` 或 `.env.local`
  后必须重启开发服务器；运行中的服务器不受新文件影响。
- 测试时真实 `openmaic.yml` 会干扰解析模型的测试：跑测试用
  `OPENMAIC_CONFIG` 指向已存在的空 YAML 文件；文件存在且无配置时，使用空部署层。
  普通单测默认保持 hermetic 环境；PostgreSQL 合约通过专用 `PG_CONTRACT_URL` 运行。

## 模型资源池恢复

完整 `pg_dump` 同时保留 `training_model_policies`、`training_model_qualifications`、
`training_model_catalogs`、`training_model_control`、`training_model_calls`、
`training_model_leases`、`training_model_audit` 七张新增表。它们由管理页或模型
请求首次访问时在现有 schema bootstrap 锁内幂等创建，既有训练表保持兼容。
凭据继续由受保护环境变量或忽略配置提供，数据库内保留非密钥策略和调用元数据。

恢复后先核对目录与免费计划、观测额度和过期时间，再恢复自动调用。历史预留额度
保守计入消耗；被中断调用的结果标记仍为 reserved，属于待核实请求。租约最长
15 分钟后可恢复，新请求会重新核验额度和并发。跨环境恢复禁止复用旧的管理员名单。
