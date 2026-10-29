# TeacherScenarioLab · Windows 本机安装与运行说明

> 适用：开发者的 Windows 电脑。基线以仓库实际状态为准（不要从旧
> 电脑复制 `node_modules` 过来）。未在本机验证的步骤会明确标注。

## 1. 准备工作

| 项目 | 要求 | 核对命令 |
|---|---|---|
| Node.js | >= 22.19.0（仓库 `engines` 硬性要求） | `node -v` |
| pnpm | 10.28.0（`packageManager` 精确锁定） | `pnpm -v` |
| Git | 任意现代版 | `git -v` |
| 数据库（二选一） | ① Docker Desktop（推荐，跑 `pnpm db:up`）② 本机 PostgreSQL 16 | 见第 3 步 |

```powershell
# 安装 pnpm（任选一种）
corepack enable
corepack prepare pnpm@10.28.0 --activate
# 或 npm install -g pnpm@10.28.0
```

## 2. 拉取代码（关键：单盘布局）

仓库、pnpm store、npm 缓存尽量放在同一个盘。最省事：仓库放在
系统盘，例如 `C:\code\TeacherScenarioLab`，其余全部默认。

```powershell
git clone https://github.com/zaz52/TeacherScenarioLab.git
cd TeacherScenarioLab
```

路径用纯 ASCII、不要带空格与中文。如果仓库必须放在 D 盘，把
pnpm store 也改到同盘：`pnpm config set store-dir D:\pnpm-store`。

## 3. 数据库（二选一）

### 方案 A：Docker Desktop（推荐）

```powershell
docker info   # 确认 Docker Desktop 已启动
pnpm db:up
```

按 `docker-compose.yml` 启动 PostgreSQL 16（库名 `openmaic`、用户
`openmaic`、仅回环 `127.0.0.1:5432`；端口可用 `OPENMAIC_DB_PORT` 改）。

### 方案 B：本机 PostgreSQL 16

安装 PostgreSQL 16（官网安装包或 winget），建库建用户（密码自行设定）：

```sql
CREATE ROLE openmaic LOGIN PASSWORD '你设的密码';
CREATE DATABASE openmaic OWNER openmaic;
```

随后在 `.env.local` 里写对应的 `DATABASE_URL`（见第 4 步）。

## 4. 配置环境变量

```powershell
copy .env.example .env.local
```

`.env.local` 最少需要一项：

```
DATABASE_URL=<redacted>
```

`.env.local` 不要提交进 Git（仓库已忽略它）。

**TeacherScenarioLab 专属注意**：如果你要用 `openmaic.yml` 做模型
配置（NVIDIA + GLM 双供应商、角色/评价分槽位），必须先在
`.env.local` 里填好 `NVIDIA_API_KEY` 和 `GLM_API_KEY`，否则服务器
会因引用到未设置变量而拒绝启动；只有一把 key 就绪时，先把另一家
provider 段和对应槽位行注释掉。没有模型密钥时应用仍可启动（脚本
模式可用），模型调用会在调用时返回配置错误，不要编造密钥填入。

## 5. 安装依赖并启动

```powershell
pnpm install
pnpm dev
```

- `pnpm install` 会连带构建 `packages/@openmaic/*` 的 dist。
- `pnpm dev` 首次启动会构建一次 standalone player，随后启动 Next
  开发服务器。没有 `DATABASE_URL` 时开发服务器拒绝启动。
- 改 `openmaic.yml` 或 `.env.local` 后必须重启，运行中的服务器不
  会读新文件。

启动后验证（按顺序）：

1. 打开 `http://localhost:3000`，首页标题应为“教师情境实训实验室”。
2. 打开 `http://localhost:3000/api/health`，应返回 `{"status":"ok",...}`
   （不依赖数据库，是最轻量的启动探针）。
3. 训练页：`http://localhost:3000/training/hall` 应列出已发布情境；
   未导入发布前大厅为空是正常的，按 `docs/recovery.md` 第 3 节
   做管理员初始化与情境导入发布。

## 6. 常用检查命令

```powershell
$env:NODE_OPTIONS="--max-old-space-size=4096"; npx tsc --noEmit
pnpm vitest run tests/training tests/config tests/server/model-config
```

- 全仓类型检查在默认堆内存下可能 OOM，上面给了 4GB 堆的写法。
- 跑测试时如果工作目录有真实 `openmaic.yml`，用
  `OPENMAIC_CONFIG` 指向空文件隔离（见 `docs/recovery.md` 第 5 节）。

## 7. 常见问题

- **端口占用**：5432 被占用改 `OPENMAIC_DB_PORT`（Docker 方案）或
  本机 PG 的监听端口，并同步改 `DATABASE_URL`；3000 被占用用
  `pnpm dev -- -p 3001`。
- **Node / pnpm 版本不对**：Node < 22.19 升级 Node（建议 nvm-windows）；
  pnpm 不是 10.28.0 按第 1 步重装指定版本。
- **构建或类型检查内存不足**：按第 6 节加大堆内存重跑；生产构建
  在 8GB 机器上可能 OOM（exit 137），属资源不足，不是编译错误，
  需换大内存机器或 CI 复验，不要把 OOM 说成构建通过。
