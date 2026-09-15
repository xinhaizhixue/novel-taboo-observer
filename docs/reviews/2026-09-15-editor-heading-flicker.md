# Markdown 标题闪烁修复（0.3.2）

## 原因

Agent 流式事件更新 React 页面状态。Editor 每次接收新的评论数组、行内 basicSetup 和 onChange 回调，触发 @uiw/react-codemirror 的 reconfigure effect；同时 markdown() 被重新创建，语言解析状态随之替换，导致标题高亮反复重建。

## 修复

固定语言扩展、基础配置及传入 CodeMirror 的回调引用；通过最新回调引用保持编辑事件正确。评论改用独立 StateField/StateEffect 更新，语义相同的评论副本不触发更新。评论范围仍按当前文档与逐字引文校验。

## 验证

使用真实 React + CodeMirror 在 jsdom 中挂载，未模拟编辑器：

- 相同测试套在旧 Editor 实现上，两项均失败（语言实例被替换、等价评论刷新产生额外事务）。
- 修复后连续 30 次父组件刷新：零次解析器重配、相同标题 DOM、光标与滚动位置保持。
- 新增/克隆/关闭评论仍正确渲染；后续键入调用最新回调。
- 132 项测试通过，类型检查和构建通过。
