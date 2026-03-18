# Astrolabe 产品规划

## 定位

**Astrolabe**（星盘）— 通用结构化知识网络工具

核心抽象：
- **对象**（obj）— 任何可命名的概念
- **态射**（mor）— 概念之间的关系
- **Sort** — 用户自定义的对象类型（数学里是 theorem/definition，法律里是 statute/case，生物里是 gene/pathway）

不限于数学，适用于任何需要结构化知识图谱的领域。

## 产品结构

### 桌面应用（Astrolabe.app）

本地 Tauri 应用，数据在用户电脑上：
- 创建/编辑知识图谱
- MDX 文档 + objblock/objref 交叉引用
- 2D 力导向图可视化
- 网络分析（pagerank、社区检测等）

### 官网（mathnetwork.network）

静态网站：
- 产品介绍
- 桌面版下载
- Template 项目展示 + 下载

### Template 项目

每个 template 是一个独立的 `.netmath/` 目录（knowledge.json + docs/），用户下载后用 Astrolabe 打开。每个 template 一个 GitHub 仓库。

| Template | 领域 | 仓库 | 状态 |
|----------|------|------|------|
| GMTNet | 几何测度论 | MathNetwork/GMTNet | 进行中 |
| ConLaw | 宪法学 | — | 计划 |
| CellBio | 细胞生物学 | — | 计划 |
| PhilArg | 哲学论证 | — | 计划 |
| ... | ... | — | — |

## 域名

mathnetwork.network

## 优先级

1. ~~架构重构~~ ✅
2. **桌面版打磨**（当前）
3. 做几个小 template demo
4. 官网（静态介绍 + 下载 + template 展示）
5. 开源

## 待决定

- [ ] 正式改名 NetMath → Astrolabe？
- [ ] Sort 配置是否从硬编码改为用户可自定义
- [ ] Template 的标准格式/规范
- [ ] 桌面版什么时候开源
