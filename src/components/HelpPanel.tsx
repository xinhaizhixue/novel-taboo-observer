import { Archive, Bot, BookOpen, GitBranch, Keyboard, LifeBuoy, MessageSquareText, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import type { RepositoryInfo } from '../shared/types';

export function HelpPanel({ repository, onNewProject, onOpenProject, onOpenGit, onOpenStyle }: { repository: RepositoryInfo | null; onNewProject(): void; onOpenProject(): void; onOpenGit(): void; onOpenStyle(): void }) {
  return <div className="page help-page">
    <header><span className="eyebrow">作者使用指南</span><h2>不用先学会 Git，也能从一句灵感开始</h2><p>工作台负责把文件、Agent、评论、恢复和版本管理翻译成作者能直接操作的流程。</p></header>
    <section className="help-start"><div><span>01</span><h3>建立作品</h3><p>选择独立小说或系列作品，填写暂定名、一句话灵感和篇幅，工作台会创建第一章、正典、规划和 Git 仓库。</p></div><div><span>02</span><h3>确定方向</h3><p>先定题材承诺、主角目标与最小设定，再逐步补全主角成长、世界或力量路线、分卷转折和终局。创作旅程会提示尚未记录的高影响问题；AI 提出候选，作者决定哪些生效。</p></div><div><span>03</span><h3>开始写作</h3><p>可在大纲未齐时探索式开写。启动 Writer 前会提示具体缺口，由作者选择先补规划或本次先写；候选设定不能自动变成正典。</p></div><div><span>04</span><h3>审查与回写</h3><p>Writer 完成后默认自动审阅；核对实际正文与评论，再把新增事实、人物变化和后续承诺更新到正典及滚动规划。每卷收束时复核全书路线，再拆下一卷目标。</p></div></section>
    <div className="help-actions"><button className="primary" onClick={onNewProject}><BookOpen size={16} />新建小说</button><button onClick={onOpenProject}><Archive size={16} />打开已有仓库</button></div>
    <div className="help-grid">
      <section><Bot /><h3>什么时候交给 Agent</h3><dl><div><dt>Writer</dt><dd>续写、重写、润色，直接修改明确授权的正文。</dd></div><div><dt>Navigator / Story Architect</dt><dd>规划下一步或处理卡文，只给候选，不替作者确认。</dd></div><div><dt>Researcher</dt><dd>联网考据时单次授权，只写研究资料，不自动升级正典。</dd></div><div><dt>记忆整理员</dt><dd>从多条正文与反馈证据中提炼可确认的长期风格规则。</dd></div></dl></section>
      <section><MessageSquareText /><h3>评论在哪里</h3><p>评论和 Agent 会话始终位于右侧面板，不在左侧重复占一个空页面。关闭右栏后，可从右上角重新展开。</p><p>旧文字变化后，评论会重定位或过期；“修改后复查”会把结果写回同一线程。</p></section>
      <section><GitBranch /><h3>保存、Git 与提交</h3><p>保存 ≠ Git 提交。Git 变更用行号、增删颜色和事件摘要展示；只有点击“明确提交”并勾选文件后才会提交。</p><button onClick={onOpenGit}>查看 Git 变更</button></section>
      <section><Sparkles /><h3>风格与能力</h3><p>作者级规则可跨作品导入导出；候选规则必须有多条证据，经确认后生效，并支持编辑与删除。</p><button onClick={onOpenStyle}>管理写作风格</button></section>
      <section><Trash2 /><h3>删除与恢复</h3><p>正文、大纲、研究、人物与世界、决定、目录和系列单部作品都先分析影响，再移入工作台回收站。结构化记录使用取消、拒绝或废弃状态；整个仓库只会移入 macOS 废纸篓。</p></section>
      <section><ShieldCheck /><h3>换电脑与安全边界</h3><p>正文、正典、任务、重要评论和 Agent 摘要随 Git 仓库迁移；登录凭据、完整终端日志和未保存恢复点不进仓库。</p></section>
    </div>
    <section className="help-repository"><LifeBuoy /><div><h3>当前仓库</h3><code>{repository?.root || '浏览器演示不连接真实目录'}</code><p>{repository?.remote ? `远端：${repository.remote}` : '尚未配置远端；删除本地仓库前请先提交并备份。'}</p></div></section>
    <section className="help-shortcuts"><Keyboard /><div><h3>常用快捷键</h3><p><kbd>⌘ S</kbd> 保存当前文件　<kbd>⌘ Enter</kbd> 在 Agent 任务框中开始任务　<kbd>Esc</kbd> 关闭普通弹窗　<kbd>Tab</kbd> 在弹窗控件间移动</p></div></section>
  </div>;
}
