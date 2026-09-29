# 写在最前面，拒绝白嫖，请留下你的star
# 叙舟 · 长篇写作工作台

一个以 Git 仓库承载作品、以本地桌面工作台承载交互、桥接 Codex CLI / Claude Code / TraeX CLI 等通用 Agent 的长篇网文 AI 写作系统。

它不直接调用模型 API，也不保存 Agent 的登录凭据。作者与 Writer 都直接编辑仓库里的 Markdown/TXT；Git diff 负责审查改动，但保存永远不等于提交，只有作者明确确认时工作台才会 stage/commit。

## MVP 已覆盖

- Markdown/TXT 编辑、文件名优先的全文搜索与回车打开、按人类章号排序的章节/卷目录和系列多作品切换；
- 始终可达的作品中心：新建/打开仓库、查看本地路径/分支/remote、在 Finder 中显示；
- 正文、大纲、研究、人物与世界、决定、嵌套目录和系列作品先做引用影响分析再移入可恢复回收站；整个仓库只移入 macOS 废纸篓；
- 默认 5 秒智能自动保存、默认失焦保存、可调参数和仓库外崩溃恢复点；
- 打开项目后的继续创作卡、目标、结构化任务编辑/取消原因、阻塞和十阶段创作旅程；
- 全书路线草案与持续规划提醒：逐项提示题材承诺、主角成长、世界或力量路线、分卷转折、终局和当前卷的记录缺口；Writer 启动前可选择补规划或显式探索式续写；
- 从一句灵感启动 Navigator，生成可比较路线，作者确认后才进入目标与任务；
- “我卡住了”诊断、路线效果/因果/代价/风险/后续影响展示，并可选用、组合、重推或拒绝；
- Codex CLI、Claude Code 与 TraeX CLI 适配，支持桌面环境下发现 NVM 等路径中的 CLI；
- Agent 面板显示 CLI 版本、登录状态、实时消息/命令、中文终态与失败诊断；可重新检测连接；
- Writer 在授权范围直接改正文，任务可停止，结果与改动摘要随仓库保存；重叠范围只允许一个 Writer，避免重复点击并发覆盖；
- Observer 分析未保存缓冲区快照、划词评论、重定位/过期、反馈、解释和一次复查闭环；阻断意见可由作者显式发回原 Writer 会话；
- 作者缓冲区、磁盘与 Agent 改动的冲突保护、非重叠自动合并和逐段三方选择；
- Git status、正文/系统记录分组、GitHub 风格 split/unified 行号 diff、系统事件摘要、打开前已有改动标记和显式提交；
- 人物状态、时间线、知识边界、伏笔等最小故事记忆、全文筛选、证据状态和正典改动影响分析；
- 任务相关上下文组装和“Agent 看到了什么”，作者可真实排除资料或补充本次临时说明；
- 独立、可导入导出的作者风格档案，以及仓库内带状态的规则、候选与证据快照；只有已确认规则生效，所有规则都支持证据查看、编辑和删除。
- 新建作品可设置计划篇幅；继续创作页区分有正文的章节与只有章题的文件，展示真实正文进度。
- 内置新手引导、使用帮助页和完整[作者使用指南](docs/USER_GUIDE.md)。

## 下载桌面版

在 [GitHub Releases](https://github.com/xinhaizhixue/novel-taboo-observer/releases) 下载发行包。v0.3.4 提供 macOS Apple Silicon（arm64）的 DMG 和 ZIP；应用未作 Developer ID 签名或公证，首次启动可能需要在 Finder 中右键打开。Agent 功能需要本机已安装并登录对应 CLI。版本改进及校验值随 Release 提供。

任务中明确引用的文件和章节范围会优先进入上下文，预算不足时列出未纳入的资料。重新打开项目后，中断的审阅会显示未完成原因；Claude Code 的分析和公开消息进度也会显示在会话面板中。随编辑自动检查不会重复消费同一版正文已有的审阅，手动复查和实际改稿后的检查仍可执行。

从任务卡交给 Writer 时，详细说明、补充要求和明确的章节范围会一起带入请求；上下文页可查看完整任务。审阅引用若只多包了一层成对的展示引号，会在同一快照中逐字核对内部文字后处理，并保留原始返回；错字、错章和未对齐证据仍不能作为完成依据。

## 开发运行

要求：macOS、Node.js 20+、Git，以及至少一个已经安装并登录的通用 Agent。CLI 检测区分可执行文件与认证状态。Observer 的 CLI 选择独立保存，手动检查和 Writer 后自动检查都遵守该选择；不可用时明确报错，不自动切换。

```bash
npm install
npm run doctor
npm run dev
```

`npm run dev` 会先编译 Electron 主进程，再启动 Vite、主进程 TypeScript 监听和真正的 Electron 进程。Renderer 修改会热更新；修改 `electron/` 下的主进程代码后，需要停止并重新运行该命令让 Electron 重新加载。

`npm run dev:web` 仅用于在普通浏览器中检查 UI：它使用明确标识的内存示例，不读取真实小说仓库、不启动 Agent，也不执行 Git。实际写作和完整功能必须使用 `npm run dev` 或桌面应用。

完整检查和桌面构建：

```bash
npm run check
npm run audit:generic
npm run dist
```

`npm run start` 会先构建再启动 Electron。`npm run demo` 会生成一个临时示例小说仓库；`npm run smoke:agent -- /absolute/path/to/repo` 会用当前已登录的 Codex 做 Observer、Writer 和 Navigator 真机冒烟测试，并真实修改该测试仓库。可用 `SMOKE_ONLY=observer`、`SMOKE_ONLY=writer` 或 `SMOKE_ONLY=navigator` 单独验收一个角色；脚本只接受 Hub 明确终态，不会把过程日志误判为完成。

跨题材通用性真机验收会临时创建一个现实向都市悬疑系列仓库，用真实 Codex Writer 写入 TXT、独立 Observer 生成锚定评论，并验证恢复冲突、Git、系列切换和全新 clone；临时仓库默认清理，回执可写入指定验收仓库：

```bash
npm run accept:cross-genre -- /absolute/path/to/receipt-repo
```

仓库内还包含一个持续实写的百万字高武端到端验收项目：

```bash
npm run e2e:high-wuxia
npm run e2e:advance-high-wuxia
npm run e2e:advance-fifth-volume
npm run e2e:advance-sixth-volume
npm run e2e:advance-seventh-volume
NOVEL_ALLOW_INCOMPLETE=1 npm run audit:novel -- workspaces/wan-jie-zhu-shen
```

这些脚本属于压力测试夹具，不是产品运行依赖；作品名、人物、卷章和题材逻辑不得进入 `src/` 或 `electron/`。`e2e:advance-high-wuxia` 用于从开篇全量重建历史状态，后续按卷使用增量命令。小说是否完结、是否达到目标字数，不是平台完成门槛；只有在新章节能验证尚未覆盖的平台能力时才继续实写。平台功能闭环、稳定性、通用性和真实 UI 验收全部通过后，即使验收小说尚未完结也应停止扩写。`npm run checkpoint:novel -- <repo> "提交说明"` 只对指定小说仓库创建显式 Git 检查点，不会 push。通用性边界见 [docs/GENERIC_CORE_BOUNDARY.md](docs/GENERIC_CORE_BOUNDARY.md)。

## 小说仓库

工作台可以新建仓库，也可以打开已有 Git 仓库。新项目的核心结构如下：

```text
series-repo/
├── manuscript/              # Markdown/TXT 正文；系列可按作品分目录
├── canon/                   # 正典、人物、世界、时间线和作品风格
├── planning/                # 全书路线草案和滚动规划
├── decisions/               # 作者确认的高影响决定
├── AGENTS.md                # 给通用 Agent 的仓库级边界
└── .novel/
    ├── manifest.json        # 版本化项目清单
    ├── roles/               # Writer / Observer 角色说明
    └── events/YYYY-MM/*.jsonl
```

`.novel/events` 是只追加、可审查的结构化事件流，保存目标、任务、评论线程、作者反馈、Agent 任务摘要和确认记录。完整 Agent 原始日志、UI 缓存和未保存恢复点留在系统应用数据目录，不污染作品 Git。

换电脑时，提交并同步小说仓库后，在新电脑安装工作台和 Agent、重新登录，再打开仓库即可重建关键状态。作者级风格用“风格与能力”页单独导入/导出；凭据永不进入作品仓库。

## 安全边界

- Writer 只获得任务明确给出的文件/目录写权限；有未保存缓冲区时任务会被阻止。
- Observer、Navigator、Story Architect 和记忆整理员默认只读。
- AI 推断和候选路线不会自动升级成作者确认正典。
- Agent 无权执行 Git stage、commit、push、pull、merge 或 rebase。
- 工作台只在显式提交对话框中对作者勾选的文件执行 stage + commit，绝不自动 push。
- Agent 中断后保留已有 diff 和失败状态，不会自动重跑有副作用的步骤。

作者从 [完整使用指南](docs/USER_GUIDE.md) 开始。详细设计见 [产品需求基线](docs/PRODUCT_REQUIREMENTS_V0.2.md)、[架构](docs/ARCHITECTURE.md)、[迁移与恢复](docs/PORTABILITY.md)、[UI 设计与验收规范](docs/UI_DESIGN_SYSTEM.md) 和 [路线图](docs/ROADMAP.md)。最近一次真实作者流程回归及测试限制见 [2026-09-07 验证记录](docs/VALIDATION-2026-09-07.md)。

平台验收夹具与作者实际作品的目标分别管理。验收样书的停止条件不能覆盖作者明确授权的整书写作任务：如果作者要求完成整部作品，应以该作品的正文、结构和篇幅目标验收，不能用平台测试通过代替作品完成。

## 应用标识与退出

窗口、菜单、Dock 和安装包统一使用「叙舟」。图标源文件为 `assets/icon.svg`，网页图标为 `public/icon.svg`，桌面图标提供 PNG、ICNS 和 ICO。应用 ID 保持不变；开发模式沿用 `novel-observer` 数据目录，已有打包版沿用 `禁忌观察者` 数据目录；首次使用打包版则复用开发版数据目录。

关闭主窗口或 Command-Q 都退出应用：先为未保存正文保存恢复副本，再停止 Agent 与文件监听。Agent 不响应正常停止时会终止其进程组。恢复副本保存失败会保留窗口，显示错误并允许保存后重试。

## 文学审阅

从侧栏「文学审阅」按当前章节精读，或联合审读最近3—5章。报告列出逐章证据、六项检查、无法定位的意见和旧版状态；Writer完成后默认自动检查实际改动文件，并核对写作要求是否达成。多章改写可显式勾选范围，改写前自动保留恢复点。详见 [文学审阅与验收](docs/LITERARY_REVIEW.md)。

项目设置可为Codex Writer和文学审阅分别指定模型与推理强度，参数写入每次任务记录；不修改全局CLI设置，也不暗中选择轻量模型。

### 两遍文字审阅

Observer 先在独立阅读目录中只读正文，保存各章理解与阅读卡顿；再使用作品上下文审查六个维度，并逐条保留或解释排除第一遍疑点。轻量润色也会记录，不要求达到阻塞写作的程度。旧报告保留，新覆盖只统计两遍审读；需要补审的旧章可在「文学审阅」选择连续章范围运行。

Claude 的只读审查只开放 Read/Grep/Glob，第一遍不开放工具；使用 CLI 的结构化输出接口。检测成功代表本地 CLI 与认证可用，实际模型连接和审查结论需以任务结果为准。有限样本检验不能保证发现所有文学问题。
