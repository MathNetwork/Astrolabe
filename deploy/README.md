# 部署 GMTNet 网站

## 架构

```
Vercel (免费)              Render (免费)
┌──────────────┐          ┌──────────────────┐
│  Next.js     │  fetch   │  Python backend   │
│  前端        │ ──────→  │  + GMTNet 数据    │
│  gmtnet.xxx  │          │  api.gmtnet.xxx   │
└──────────────┘          └──────────────────┘
```

## 步骤

### 1. Push 代码到 GitHub

代码已经在 `refactor/panel-architecture` 分支。

### 2. 部署后端（Render.com）

1. 注册 https://render.com（用 GitHub 登录）
2. New → Web Service → 连接 NetMath 仓库
3. 配置：
   - **Name**: `gmtnet-api`
   - **Branch**: `refactor/panel-architecture`
   - **Root Directory**: （留空）
   - **Runtime**: Docker
   - **Dockerfile Path**: `deploy/Dockerfile`
   - **Instance Type**: Free
4. 点 Create Web Service
5. 等部署完成，拿到 URL（如 `https://gmtnet-api.onrender.com`）

### 3. 部署前端（Vercel）

1. 注册 https://vercel.com（用 GitHub 登录）
2. Import → 选 NetMath 仓库
3. 配置：
   - **Framework**: Next.js（自动检测）
   - **Branch**: `refactor/panel-architecture`
   - **Environment Variables**:
     - `NEXT_PUBLIC_API_BASE` = `https://gmtnet-api.onrender.com`（上一步的 URL）
     - `NEXT_PUBLIC_PROJECT_PATH` = `/app/data/GMTNet`（容器内路径）
4. 点 Deploy
5. 拿到 URL（如 `https://gmtnet.vercel.app`）

### 4. 完成

访问 `https://gmtnet.vercel.app` → 看到 GMTNet 首页 → 点击进入

## 本地测试部署

```bash
# 构建 Docker 镜像
docker build -f deploy/Dockerfile -t gmtnet-api .

# 运行
docker run -p 8765:8765 gmtnet-api

# 前端指向 Docker
NEXT_PUBLIC_API_BASE=http://localhost:8765 NEXT_PUBLIC_PROJECT_PATH=/app/data/GMTNet npm run dev
```

## 费用

- Vercel Free: 无限制静态站点
- Render Free: 750 小时/月，15 分钟无流量自动休眠（首次访问冷启动约 30 秒）
