# NetMath 产品规划

## 域名

mathnetwork.network

## 两条产品线

### 1. Web 版（官网 + 在线 Demo）

**目的**：让人快速了解 NetMath 是什么，在线浏览 GMTNet 知识图谱

```
mathnetwork.network/              ← 产品介绍、截图、特性说明
mathnetwork.network/gmtnet        ← GMTNet 在线 Demo（只读浏览）
```

或子域名方案：
```
mathnetwork.network               ← 官网
gmtnet.mathnetwork.network        ← GMTNet 在线浏览
```

**特点**：
- 只读，不需要登录
- 浏览知识图谱 + MDX 文档 + 网络分析
- 展示 NetMath 的能力

**技术**：
- 前端：Vercel 部署 Next.js
- 后端：Render/VPS 部署 FastAPI + GMTNet 数据
- `NEXT_PUBLIC_API_BASE` 指向后端 URL

### 2. Desktop 版（本地应用）

**目的**：本地创建和编辑自己的知识图谱

**特点**：
- 本地文件，数据在自己电脑上
- 可编辑：创建节点、添加边、写 MDX
- 可导出

**技术**：
- Tauri 桌面应用
- 后端内嵌或本地运行

**计划**：
- 先打磨好再开源
- 官网提供下载链接

## Git 分支策略

| 分支 | 用途 |
|------|------|
| `main` | Web 版（部署到官网） |
| `desktop` | Tauri 桌面版（开发中） |
| `legacy` | 旧架构备份 |

## 优先级

1. ~~架构重构~~ ✅ 已完成
2. **官网 + GMTNet 在线 Demo** ← 下一步
3. 桌面版打磨 + 开源
4. 更多数学项目（不只 GMTNet）

## 目标用户

- 数学研究者（组织论文笔记、定理依赖关系）
- 数学学生（学习复杂理论的结构）
- 任何需要结构化知识图谱的人

## 待决定

- [ ] 官网设计（首页内容、截图、动画？）
- [ ] GMTNet Demo 是嵌在官网里还是独立页面
- [ ] 桌面版什么时候开源
- [ ] 是否支持多项目（不只 GMTNet）
- [ ] 是否需要用户系统（在线版）
