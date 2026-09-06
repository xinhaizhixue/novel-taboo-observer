# MVP 架构

## 1. 边界

禁忌观察者是本地 Electron 工作台，不是模型聚合服务。Renderer 只通过隔离的 preload API 调用主进程；主进程管理小说仓库、Git、恢复点和 Agent 子进程。模型认证、模型选择和工具 Harness 由 Codex CLI、Claude Code 等 Agent 自行负责。

```text
React + CodeMirror 工作台
        │ typed IPC
Electron 主进程
  ├─ ProjectService：文本、manifest、事件重放
  ├─ ContextAssembler：按任务选择可解释上下文
  ├─ AgentHub：统一任务/会话/能力/取消协议
  │    ├─ CodexAdapter
  │    └─ ClaudeAdapter
  ├─ RecoveryStore：仓库外 gzip 去重恢复点
  └─ GitService：status / diff / 显式 commit
        │
小说 Git 仓库（Markdown/TXT + JSON/JSONL）
```

## 2. 权威数据

- 正文、正典、规划和确认决定是普通 Markdown/TXT。
- `.novel/manifest.json` 标识数据版本、系列和作品。
- `.novel/events/YYYY-MM/session-*.jsonl` 是只追加事件源。目标、任务、评论、反馈、Agent 任务与确认结果由事件重放恢复。
- Agent 完整 stdout/stderr、界面设置、最近项目和恢复点位于 Electron userData；它们不是作品事实源。
- 作者档案独立保存；规则、证据与 `candidate / confirmed / rejected` 状态一并快照到 manifest，供作品跨电脑继续审查。只有 `confirmed` 规则作为 Agent 的生效约束。

## 3. Agent 协议

适配器统一暴露能力声明、启动、恢复、取消、结构化输出和文件修改能力。工作台不会把缺失能力伪装成可用。

每个任务记录任务 ID、角色、授权范围、开始哈希、会话 ID、结束状态和实际变化文件。Writer 使用 Agent 的 workspace-write 沙箱；其他角色使用只读模式。工作台提示词和新仓库的 `AGENTS.md` 双重禁止 Agent 执行 Git 写操作。

Observer、Navigator 和风格整理使用 JSON Schema 结构化交付：

- Observer 输出逐字 quote 和 UTF-16 范围；工作台重新验证锚点。
- Navigator 输出 2～4 条路线及效果、因果、代价、风险和后续影响；作者可以选择或明确说明取舍后组合路线，只有确认结果才生成正式目标/任务。
- 记忆整理员只输出至少两条证据支持的候选规则；候选需作者确认。

Observer 的阻断评论由工作台提供“发回 Writer”语义动作。只有作者点击后，平台才续接覆盖该文件的原 Writer 会话；未保存缓冲区仍会阻止续接。评论、转发反馈和 Writer 任务摘要随仓库事件迁移，运行中 CLI 消息不借仓库文件充当邮箱。

创作要求与工作台约束分别表达。Writer 按作品题材、人物目标、行动与后果写作；任务、验收项、版本和下一章要求留在工作台。Observer 先审人物与情节，再核连续性；正文的新事实可以由正常叙述与行动建立，不必增加文书核验场景。审校依据需要锚定正文，但不能把“数据一致”当成文学质量通过。

## 4. 并发与版本

编辑器为每个打开文件保存 `savedContent`、磁盘哈希、当前缓冲区、编辑器版本和保存状态。Writer 启动前会检查授权范围内是否有未保存缓冲区；存在时拒绝启动并先写恢复点。

外部变化到达时：干净缓冲区直接重载；脏缓冲区进入三方比较（编辑起点、作者缓冲区、磁盘最新版）。任何一方都不会被静默覆盖。

Observer 始终分析不可变快照。评论保存原快照哈希、原文、前后文和位置；原文仍逐字存在时才允许重定位，否则标记 stale。

编辑器实例按文件路径隔离。评论装饰从 CodeMirror 当前 `doc` 动态计算，先验证完整范围和逐字引文，不使用 React 下一份正文的长度裁剪旧状态。这样，短研究资料与带评论的长章节切换，以及同一正文被整体替换时，都不会将超出当前文档的装饰位置交给 changeset 映射。

Agent 前后目录差异不直接等于 Agent 写入。`ProjectService` 在本次进程内为工作台保存、新建和重命名保留递增版本及目标内容哈希，`AgentHub` 在启动和续接前记录版本边界。结束时，仅与边界后的作者回执精确匹配的变化进入 `concurrentAuthorFiles`；其余差异仍按任务写入范围核查。回执不从仓库事件重建，避免 Agent 通过声称 `origin=author` 绕过核查；作者保存后若又被其他程序改成不同内容，也不会被豁免。历史任务不追溯改写，外部编辑器和其他进程的未归因变化仍可能需要人工核查。

## 5. 恢复与限制

恢复点使用内容哈希去重和 gzip blob，索引位于仓库外。默认 30 秒、30 天、单项目 500 MB、全局 2 GB，并保护每个文件最新恢复点和最近会话结束点。

当前数据版本为 1。高于工作台支持版本的项目会拒绝打开并提示升级，低版本也不会被静默改写；未来升级必须先备份再显式迁移。单条事件损坏时保留原文件、继续重放有效历史，并在继续创作页显示精确诊断。MVP 首发 macOS，领域模型与仓库格式不依赖 macOS。
