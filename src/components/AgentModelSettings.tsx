import { Select } from './Select';
import { useEffect, useState } from 'react';
import type { AgentAdapterInfo, Settings } from '../shared/types';

export function AgentModelSettings({ settings, agents, onChange }: { settings: Settings; agents: AgentAdapterInfo[]; onChange(patch: Partial<Settings>): Promise<void> }) {
  const [draft, setDraft] = useState(settings.agents);
  const [notice, setNotice] = useState('');
  const models = agents.find((agent) => agent.id === 'codex')?.models ?? [];
  useEffect(() => setDraft(settings.agents), [settings.agents]);
  const apply = async (next = draft) => {
    setNotice('');
    try { await onChange({ agents: next }); setNotice('已保存，仅影响后续工作台任务；全局 CLI 配置未修改。'); }
    catch (error) { setNotice(String(error)); }
  };
  return <section className="agent-model-settings"><h3>Codex 写作与审阅模型</h3><p>明确记录每次任务指定的模型和推理强度。留空由 CLI 决定；工作台不再暗中为只读角色切换轻量模型。</p>
    <datalist id="available-codex-models">{models.map((model) => <option key={model} value={model} />)}</datalist>
    <label>Writer 模型<input aria-label="Writer 模型" list="available-codex-models" value={draft.codexWriterModel} placeholder="留空使用 CLI 默认" onChange={(event) => setDraft({ ...draft, codexWriterModel: event.target.value })} /></label>
    <label>文学审阅模型<input aria-label="文学审阅模型" list="available-codex-models" value={draft.codexReviewModel} placeholder="留空使用 CLI 默认" onChange={(event) => setDraft({ ...draft, codexReviewModel: event.target.value })} /></label>
    <label>Writer 推理强度<Select aria-label="Writer 推理强度" value={draft.writerReasoning} onChange={(event) => setDraft({ ...draft, writerReasoning: event.target.value as Settings['agents']['writerReasoning'] })}>{['low', 'medium', 'high', 'xhigh'].map((level) => <option key={level}>{level}</option>)}</Select></label>
    <label>审阅推理强度<Select aria-label="审阅推理强度" value={draft.reviewReasoning} onChange={(event) => setDraft({ ...draft, reviewReasoning: event.target.value as Settings['agents']['reviewReasoning'] })}>{['low', 'medium', 'high', 'xhigh'].map((level) => <option key={level}>{level}</option>)}</Select></label>
    <div><button onClick={() => void apply()}>保存模型选择</button>{models[0] && <button onClick={() => { const next = { ...draft, codexWriterModel: models[0], codexReviewModel: models[0], writerReasoning: 'high' as const, reviewReasoning: 'high' as const }; setDraft(next); void apply(next); }}>使用 {models[0]} 深度写作与审阅</button>}</div>
    {notice && <p role="status">{notice}</p>}
  </section>;
}
