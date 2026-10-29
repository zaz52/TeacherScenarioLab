# TeacherScenarioLab 开发数据库初始化与恢复

> 适用：本地开发与测试环境。开发库不在 home 目录下，不随虚拟机
> 持久；虚拟机被替换后开发库会丢失，**情境的事实源永远是代码与
> 导出记录，不是开发库本身**。每次会话开始先复核开发库状态。

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
4. 旧训练记录、旧账号随开发库丢失，不可恢复——开发库只放验证用
   数据，不要把真实学员数据放在开发库里。
5. 恢复后跑一次闭环验证：建会话 → 开始 → 脚本多轮 → 推进状态 →
   评价（无密钥时应为 503 且不落账）→ 记录页可见该训练。

## 5. 模型配置与重启注意事项

- 本地长期配置是工作目录的 `openmaic.yml`（`openmaic.example.yml`
  是模板）。它引用 `${NVIDIA_API_KEY}` / `${GLM_API_KEY}`，这两个
  变量必须在 `.env.local` 里填好，否则服务器拒绝启动。
- 只有一把 key 就绪时，先把另一家 provider 段和对应的槽位行注释
  掉再启动，不要留空变量启动。
- 配置在进程启动时读取并缓存：改 `openmaic.yml` 或 `.env.local`
  后必须重启开发服务器；运行中的服务器不受新文件影响。
- 测试时真实 `openmaic.yml` 会干扰解析模型的测试：跑测试用
  `OPENMAIC_CONFIG` 指向一个空文件隔离，例如
  `OPENMAIC_CONFIG=/tmp/empty.yml pnpm vitest run tests/training …`。
