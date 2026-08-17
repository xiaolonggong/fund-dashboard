# AGENTS.md

本文件面向在 `fund-dashboard` 仓库上工作的 AI 代理与开发者，定义项目结构、开发命令、架构约定与**版本管理规则**。开始任何开发前请先阅读本文件。

## 1. 项目概述

基金看板（fund-dashboard）是一个**本地运行的桌面 Web 应用**，用于管理个人公募基金持仓、查看实时收益与主要市场指数。

- 访问地址：`http://127.0.0.1:51888`（唯一用户入口）
- 数据存储：持仓/自选/成本数据仅存于浏览器 `localStorage`，后端**不落库**、不建账号
- 交付形态：Windows 本地应用，双击 `启动基金看板.bat` 即可使用
- 当前版本：`1.1.0`（见 [CHANGELOG.md](./CHANGELOG.md)）

## 2. 技术栈

| 层 | 技术 |
|---|---|
| 后端 | Node.js ≥ 20、Koa 2、@koa/router、koa-bodyparser、axios、iconv-lite |
| 前端 | React 19、TypeScript、Rsbuild（Rspack）、Tailwind CSS 4、echarts 6 + echarts-for-react、Radix UI、decimal.js |
| 测试 | Vitest（`web/tests`） |

## 3. 目录结构

```text
fund-dashboard/
├── AGENTS.md                  # 本文件（AI 开发代理指南）
├── README.md                  # 项目说明（用户视角）
├── CHANGELOG.md               # 变更日志（版本管理核心）
├── 需求文档.md                 # 原始需求与产品决策
├── THIRD_PARTY_LICENSES/      # 第三方许可证
├── start-fund-dashboard.ps1   # 一键启动脚本（检查依赖/构建/拉起服务）
├── 启动基金看板.bat            # 双击入口
├── package.json               # 根包：聚合脚本（setup/build/test/start）
├── server/                    # 后端（Koa，端口 51888）
│   ├── package.json
│   └── src/
│       ├── index.js           # 服务入口：静态托管 web/dist + /api + 晚间定时任务
│       ├── routes.js          # 全部 API 路由
│       └── services/
│           ├── fund.js        # 基金搜索/详情/净值/费率/业绩走势/基准解析
│           ├── market.js      # 指数与个股行情（多数据源兜底）
│           └── estimateAccuracy.js # 估值准确率对比（晚间 22:00 定时）
└── web/                       # 前端（Rsbuild + React）
    ├── package.json
    ├── rsbuild.config.ts
    ├── AGENTS.md              # web 子目录的构建说明（Rsbuild/Rspack）
    ├── src/
    │   ├── App.tsx            # 页面骨架：总览/持仓/自选/大盘/指数/估值准确率
    │   ├── components/        # 页面与抽屉组件（见下）
    │   ├── lib/               # api.ts（接口封装）、portfolioStore.ts（localStorage）、计算工具
    │   └── index.css
    ├── tests/                 # Vitest 测试
    └── dist/                  # 构建产物（git 忽略，由后端静态托管）
```

关键组件：`Overview`（总览）、`PortfolioTable`+`PortfolioTabBar`（持仓+多组合）、`Watchlist`（自选）、`MarketOverview`（A股大盘）、`IndicesDashboard`（指数看板）、`EstimateAccuracy`（估值准确率）、`FundDetailDrawer`（基金详情抽屉：规模/经理/费率/前十大持仓/持仓股行情/业绩走势）、`FundPerformanceChart`（业绩走势图，echarts 双线）、`FundTrendDialog`/`IndexTrendDialog`（走势弹窗）、`ConfigDialog`（导入导出）。

## 4. 常用命令

```powershell
npm run setup        # 首次：安装 server + web 依赖并构建 web
npm run dev          # 同时启动前后端开发模式（server 51888 / web 51889）
npm run dev:web      # 仅前端开发服务器（51889，/api 代理到 51888）
npm run dev:server   # 仅后端（node --watch）
npm run build        # 构建前端到 web/dist
npm run typecheck    # TS 类型检查（tsc --noEmit）
npm run test         # Vitest 单元测试
npm start            # 启动后端服务（需先 build）
```

## 5. API 路由（server/src/routes.js）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查 |
| GET | `/api/funds/search?keyword=` | 基金代码/名称模糊搜索 |
| GET | `/api/funds/suggest` | 基金联想（Fund123） |
| POST | `/api/funds/resolve` | 批量识别基金代码 |
| POST | `/api/funds/quotes` | 批量拉取基金/股票行情（分批 50 只） |
| GET | `/api/funds/:code/quote` | 单基金行情 |
| GET | `/api/funds/:code/history` | 基金净值走势 |
| GET | `/api/funds/:code/detail` | 基金详情（规模/经理/费率/前十大持仓/持仓股行情） |
| GET | `/api/funds/:code/performance` | 业绩走势（基金 vs 业绩比较基准，7 周期） |
| GET | `/api/funds/estimate-accuracy` | 估值准确率列表 |
| POST | `/api/funds/estimate-accuracy/run` | 手动触发估值准确率对比 |
| GET | `/api/indices` | 首页指数列表（过滤 benchOnly） |
| GET | `/api/indices/:code/history` | 指数历史 |
| GET | `/api/market/overview` | A股大盘概览 |

## 6. 版本管理规则（必读）

采用**语义化版本**（SemVer）`MAJOR.MINOR.PATCH`，从 `1.0.0` 起步。当前基线 `1.1.0`。

### 6.1 版本号约定

| 段位 | 何时递增 | 示例 |
|---|---|---|
| MAJOR | 不兼容的破坏性变更（API 契约、数据模型、用户流程重做） | 1.1.0 → 2.0.0 |
| MINOR | 向后兼容的新功能（新模块、新接口、新页面） | 1.0.0 → 1.1.0 |
| PATCH | 向后兼容的缺陷修复、样式/文案小优化 | 1.1.0 → 1.1.1 |

**版本号必须三处同步**：根 `package.json`、`web/package.json`、`server/package.json` 的 `version` 字段保持一致。

### 6.2 发布流程（每次发版必须完成）

1. 更新三处 `package.json` 的 `version`；
2. 在 `CHANGELOG.md` 顶部新建版本条目（`## vX.Y.Z - YYYY-MM-DD`），按「新增 / 修复 / 优化 / 安全」分类记录本版本全部变更，并把原「Unreleased」内容并入；
3. 更新 `README.md` 的「当前版本」链接与功能描述；
4. 运行 `npm run typecheck`、`npm run test`、`npm run build` 全部通过；
5. 本地重启服务并抽查关键接口，确认无回归。

### 6.3 开发中变更记录

- 日常开发时，把已完成的用户可见变更**及时**追加到 `CHANGELOG.md` 顶部的 `## [Unreleased]` 区段（新增/修复/优化/安全），发版时再归入具体版本号；
- 纯内部重构、依赖升级（无行为变化）可只在 Unreleased 的「优化」或「安全」中记录，不强制单独发版。

### 6.4 Git 提交规范

- 提交信息使用 `type: 描述` 前缀，参考现有历史：`feat:`（新功能）、`fix:`（缺陷修复）、`docs:`（文档）、`chore:`（杂项/依赖）、`refactor:`（重构）；
- 发布时提交信息使用 `发布 vX.Y.Z ...`；
- 不打 Git tag 也可以，版本以三处 package.json + CHANGELOG.md 为准。

## 7. 架构与关键约定

### 7.1 数据流

- 前端状态：`portfolioStore.ts` 读写 `localStorage`（多组合结构 `MultiPortfolioPayload`），页面组件通过 `App.tsx` 统一分发；
- 行情数据：前端 → `/api` → 第三方公开接口，后端仅做转发/清洗/缓存；
- 业绩走势：`getFundPerformance` 并行拉净值（`pingzhongdata` 的 `Data_netWorthTrend`）+ 基准文本（东财详情接口），解析基准指数后拉 `getIndexFullHistory`，按 7 周期切分。

### 7.2 基金详情抽屉（FundDetailDrawer）

- 入口：持仓/自选表格点击基金名打开右侧抽屉；
- 模块：规模/经理、费率（申购/赎回分档表、交易确认日、最小赎回）、前十大持仓、持仓股行情（A股+港股，`ulist.np/get` 分批 50 只）、业绩走势；
- 港股 secid：`116.XXXXX`（5 位代码），A股为 `0.`/`1.` 前缀；`toAshareSecid()` 已兼容，**勿用 padStart 对港股代码补零**。

### 7.3 业绩比较基准解析（fund.js `resolveBenchmarkCandidates`）

- 规则表 `BENCH_INDEX_RULES`：数组顺序即优先级，**更具体的规则必须排在前面**（如 `/恒生港股通中国科技/` 在 `/恒生/` 之前、`/上证50/` 在 `/上证综合指数|上证综指|上证指数/` 之前、`/中证500/` 在 `/沪深300/` 之前）；
- 组合基准按 `+` 分段并解析 `*N%` 权重，**取权重最高**的成分指数，逐个尝试拉历史，全部失败才降级沪深300（`isDefault=true`）；
- 规则引用的 code **必须存在于 `market.js` 的 `INDEX_LIST`**（`getIndexFullHistory` 依赖 `findIndexMeta`），否则匹配到也会拉取失败被降级；
- 基准文本措辞变体多（上证综合指数/上证综指、主要消费/内地消费/中证医药卫生 等），新增规则后必须用真实基金基准文本实测。

### 7.4 指数历史数据源（market.js `getIndexFullHistory`）

多源兜底顺序（`getIndexFullHistory` 内）：

1. **csindex 中证指数官网**（`fetchCsindexDaily`）：中证系列（000/930/931/H30）全历史（2004 年起），最优先；
2. **新浪 CN**（3500 点）：A股指数/ETF，覆盖 2012 年起；
3. **腾讯**（上限约 2000 点）：A股/港股/美股指数；
4. **新浪 US**：美股指数。

已知坑：

- 本服务器**东财 push2his 不可达**，不要依赖 `push2his.eastmoney.com`；
- 腾讯 `web.ifzq.gtimg.cn` 的 datalen 超 ~2000 返回空，需限制上限；
- **数据新鲜度检查 `isIndexFresh`**（最后一条距今 > 12 天视为过期）：新浪 000922 中证红利数据停在 2019 年，过期数据必须自动跳过继续走下一源；
- 无公开历史源的基准用近似标的并**在图例如实标注**：中证全指半导体→国证半导体芯片(980017)、恒生港股通中国科技→恒生科技(HSTECH)、Au99.99→华安黄金ETF(518880)。

## 8. 测试与质量

- 修改 `web/src/lib` 下的计算逻辑后，运行 `npm run test`（Vitest）；
- 任何改动至少运行 `npm run typecheck`；
- 后端改动后运行 `node --check server/src/<file>.js` 语法检查；
- 涉及数据源/基准解析的改动，必须在本地起服务后用真实基金代码 curl 验证，并回归此前修过的案例（见 CHANGELOG 中的验证记录）。

## 9. 数据源与隐私红线

- 全部行情来自第三方公开接口（东方财富、Fund123、腾讯、新浪、中证指数官网、日经官网、Naver），可能随时限流/变更，接口层必须做超时与降级；
- 个人持仓、成本、备份（`fund-dashboard-backup-*.json`、`server/data/`）**严禁**提交、上传或外发；
- 改动 `funds/quotes` 等批量接口时注意分批（50 只/批），避免触发限流。
