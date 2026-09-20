import { describe, expect, it } from 'vitest';
import { agentEventText } from '../src/lib/agent-progress.js';
import type { AgentEvent } from '../src/shared/types.js';

const event = (type: AgentEvent['type'], payload: AgentEvent['payload']): AgentEvent => ({ type, payload, taskId: 'review-task', at: '2026-09-20T00:00:00Z' });

describe('会话面板中的真实 Agent 进度', () => {
  it('Claude 已返回分析进度时显示分析中，不泄露推理文本', () => {
    expect(agentEventText([event('raw', { type: 'system', subtype: 'thinking_tokens', thinking: '不应显示的内部推理' })])).toBe('模型正在分析正文，尚未返回结论。');
    expect(agentEventText([event('message', { type: 'assistant', message: { content: [{ type: 'thinking', thinking: '不应显示的内部推理' }] } })])).toBe('模型正在分析正文，尚未返回结论。');
  });

  it('显示 Claude 的公开消息或工具进度，后到的诊断不盖掉已有进展', () => {
    const progress = event('message', { type: 'assistant', message: { content: [{ type: 'thinking', thinking: '内部推理' }, { type: 'text', text: '已读完正文，正在核对人物位置。' }] } });
    expect(agentEventText([progress, event('raw', { type: 'system', subtype: 'diagnostic' })])).toBe('已读完正文，正在核对人物位置。');
    expect(agentEventText([event('message', { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Read', input: { file_path: 'manuscript/第10章.md' } }] } })])).toBe('正在调用 Read…');
  });

  it('保留 Codex 命令进度、跨遍审阅提示和最新错误', () => {
    const command = event('command', { item: { type: 'command_execution', command: 'read chapter', status: 'in_progress' } });
    expect(agentEventText([command])).toBe('正在执行：read chapter');
    expect(agentEventText([command, event('message', '第一遍正文阅读已保存，开始第二遍上下文审查。')])).toBe('第一遍正文阅读已保存，开始第二遍上下文审查。');
    expect(agentEventText([command, event('error', { error: '连接失败' })])).toBe('连接失败');
  });
});
