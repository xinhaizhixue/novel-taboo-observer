import type { AgentEvent } from '../shared/types';

export function agentEventText(events: AgentEvent[]) {
  for (const event of [...events].reverse()) {
    if (event.type === 'raw') {
      const rawText = typeof event.payload === 'string' ? event.payload : '';
      if (/failed to refresh available models:\s*timeout waiting for child process to exit/i.test(rawText)) return 'Codex 刷新模型目录时超时；该诊断可能可恢复，工作台会继续等待实际模型输出，直到启动总超时。';
      if (event.payload && !Array.isArray(event.payload) && typeof event.payload === 'object') {
        const payload = event.payload as Record<string, unknown>;
        const rawType = String(payload.type ?? '');
        if (rawType === 'system' && payload.subtype === 'thinking_tokens') return '模型正在分析正文，尚未返回结论。';
        if (rawType === 'thread.started') return 'Agent 会话已建立，正在等待模型开始响应…';
        if (rawType === 'turn.started') return '模型回合已经开始，正在读取上下文…';
      }
      continue;
    }
    if (!['message', 'command', 'error'].includes(event.type)) continue;
    if (typeof event.payload === 'string') return event.payload;
    if (!event.payload || Array.isArray(event.payload) || typeof event.payload !== 'object') continue;
    const payload = event.payload as Record<string, unknown>;
    const item = payload.item && typeof payload.item === 'object' && !Array.isArray(payload.item) ? payload.item as Record<string, unknown> : undefined;
    if (typeof item?.text === 'string') return item.text;
    if (item?.type === 'command_execution' && typeof item.command === 'string') return `${item.status === 'in_progress' ? '正在执行' : '已执行'}：${item.command.slice(0, 140)}`;
    if (typeof payload.message === 'string') return payload.message;
    if (typeof payload.error === 'string') return payload.error;
    const message = payload.message;
    if (message && typeof message === 'object' && !Array.isArray(message)) {
      const content = (message as Record<string, unknown>).content;
      if (!Array.isArray(content)) continue;
      const blocks = content.filter((block): block is Record<string, unknown> => Boolean(block) && typeof block === 'object' && !Array.isArray(block));
      const text = blocks.filter((block) => block.type === 'text' && typeof block.text === 'string').map((block) => block.text).join('\n').trim();
      if (text) return text;
      const tool = blocks.find((block) => block.type === 'tool_use' && typeof block.name === 'string');
      if (tool) return `正在调用 ${tool.name}…`;
      if (blocks.some((block) => block.type === 'thinking')) return '模型正在分析正文，尚未返回结论。';
    }
  }
  return undefined;
}
