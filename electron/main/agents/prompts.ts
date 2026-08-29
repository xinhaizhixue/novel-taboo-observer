import type { AgentRole, AgentRunRequest, ContextPack, ObserverRunRequest } from '../../../src/shared/types.js';

const ROLE_NAMES: Record<AgentRole, string> = {
  writer: '正文 Writer', observer: '独立 Observer', navigator: '创作导航器', architect: '故事架构师', 'canon-keeper': '正典维护员', 'style-coach': '风格教练', researcher: '资料研究员', editor: '编辑审校', 'release-assistant': '发布助手', 'memory-curator': '记忆整理员'
};

function context(pack?: ContextPack) {
  if (!pack) return '工作台没有附加上下文包。请先读取授权范围内的仓库文件，并明确指出上下文缺口。';
  return [
    '作者档案状态约束：只有 status=confirmed 的风格规则已经生效；candidate/rejected 仅供审查，不能当作作者约束执行。',
    `上下文包 ${pack.id}（${pack.characters}/${pack.budget} 字符）：`,
    ...pack.items.filter((item) => item.included).map((item) => `\n## ${item.title}\n来源：${item.source}\n入选理由：${item.reason}\n${item.content}`),
    ...(pack.gaps.length ? [`\n已知缺口：${pack.gaps.join('；')}`] : [])
  ].join('\n');
}

export function taskPrompt(input: AgentRunRequest) {
  const permission = input.role === 'writer'
    ? `你可以直接修改且只能修改以下授权范围：${input.scope.join('、') || '作者尚未提供范围，请不要改文件'}。`
    : input.role === 'researcher'
      ? `你可以写入且只能写入以下研究资料范围：${input.scope.join('、') || 'research/'}。不得修改正文、正典、规划或确认决定；明确区分来源、推断和待核实问题。`
      : `本任务是只读分析。不要修改任何文件；把 planning、canon 或任务变化作为候选交回工作台，作者确认后再落盘。`;
  const structured = ['navigator', 'architect'].includes(input.role)
    ? '\n- 先诊断问题，再给 2～4 条真正不同、可比较的路线。每条必须说明效果、因果链、代价、风险、后续影响和新增铺垫。严格按工作台提供的 JSON Schema 输出，不修改文件。'
    : ['memory-curator', 'style-coach'].includes(input.role)
      ? '\n- 只提炼有至少两条独立证据支持的候选规则；区分长期偏好、稳定优势、待提升能力、内容边界和叙事声音。严格按工作台提供的 JSON Schema 输出，不修改文件。'
    : '\n- 最终回答简要说明做了什么、改了哪些文件、仍需作者决定什么。';
  return `你现在是小说写作工作台中的「${ROLE_NAMES[input.role]}」，面对的是中文长篇网文项目，不是软件项目。\n\n任务：${input.objective}\n完成条件：\n${input.completionCriteria.map((item) => `- ${item}`).join('\n') || '- 清晰完成作者目标'}\n\n${permission}\n\n硬性边界：\n- 不得执行 git add、git commit、git push、git pull、merge 或 rebase；Git 动作只能由工作台在作者明确授权后执行。\n- 不得覆盖未保存的作者缓冲区；工作台会在你开始和结束时做哈希与冲突检查。\n- 保留 Markdown/TXT；正文修改直接写目标文件，不建立隐藏草稿。\n- 核心正典变更只提出候选与影响分析，不可悄悄确认。\n- 如果任务信息不足，清楚说明缺口，避免编造既有事实。${structured}\n- ${input.allowNetwork ? '本任务已授权联网，但仅限完成本任务所需范围。' : '本任务未授权联网，不要访问网络。'}\n\n${context(input.contextPack)}`;
}

const stringList = { type: 'array', items: { type: 'string' } } as const;

export const NAVIGATION_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['title', 'diagnosis', 'highImpactQuestions', 'recommendedGoal', 'routes'],
  properties: {
    title: { type: 'string' },
    diagnosis: { type: 'string' },
    highImpactQuestions: { ...stringList, maxItems: 3 },
    recommendedGoal: { type: 'string' },
    routes: {
      type: 'array', minItems: 2, maxItems: 4,
      items: {
        type: 'object', additionalProperties: false,
        required: ['title', 'pitch', 'effect', 'causalChain', 'tradeoffs', 'risks', 'followUpImpact', 'requiredSetup', 'firstChapterGoal'],
        properties: {
          title: { type: 'string' }, pitch: { type: 'string' }, effect: { type: 'string' },
          causalChain: stringList, tradeoffs: stringList, risks: stringList,
          followUpImpact: { type: 'string' }, requiredSetup: stringList, firstChapterGoal: { type: 'string' }
        }
      }
    }
  }
};

export const STYLE_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['summary', 'rules'],
  properties: {
    summary: { type: 'string' },
    rules: {
      type: 'array', maxItems: 8,
      items: {
        type: 'object', additionalProperties: false, required: ['category', 'text', 'evidence'],
        properties: { category: { type: 'string', enum: ['preference', 'strength', 'improvement', 'boundary', 'voice'] }, text: { type: 'string' }, evidence: { type: 'array', minItems: 2, items: { type: 'string' } } }
      }
    }
  }
};

export function observerPrompt(input: ObserverRunRequest) {
  const { snapshot } = input;
  return `你是独立的长篇网文 Observer。你只审查，不修改任何文件。请分析下面不可变快照，并严格输出符合给定 JSON Schema 的结果。\n\n快照信息：\n- snapshotId: ${snapshot.id}\n- filePath: ${snapshot.filePath}\n- hash: ${snapshot.hash}\n- editorVersion: ${snapshot.editorVersion}\n- mode: ${input.mode}\n${snapshot.selection ? `- selection: ${snapshot.selection.start}-${snapshot.selection.end}` : ''}\n${input.commentId ? `- 关联评论：${input.commentId}` : ''}\n${input.question ? `- 作者请求：${input.question}` : ''}\n\n规则：\n1. 只为真正有帮助的问题建评论，避免逐句吹毛求疵；普通建议不超过 5 条，阻塞问题优先。\n2. quote 必须逐字复制自快照，start/end 使用 UTF-16 字符偏移，content.slice(start,end) 必须等于 quote。无法锚定时使用最相关短句。\n3. 检查因果、人物知识边界、连续性、节奏、情绪可信度、读者承诺和作品声音。\n4. 不把 AI 推断写成正典。依据不足时明确说明。\n5. suggestedAction 给出可执行方向，不要整段代写，除非作者明确要求。\n6. 如果没有值得打断作者的问题，返回空 comments，并在 summary 说明整体判断。\n7. explain 模式以解释原评论依据和适用边界为主，不重复制造无关问题；review 模式比较修改前后并用 reviewResult 判断 resolved、partial、unresolved 或 obsolete；其他模式使用 not-applicable。\n\n${context(input.contextPack)}\n\n## 不可变正文快照\n${snapshot.content}`;
}

export const OBSERVER_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['summary', 'reviewResult', 'comments'],
  properties: {
    summary: { type: 'string' },
    reviewResult: { type: 'string', enum: ['not-applicable', 'resolved', 'partial', 'unresolved', 'obsolete'] },
    comments: {
      type: 'array', maxItems: 8, items: {
        type: 'object', additionalProperties: false,
        required: ['issueType', 'severity', 'summary', 'evidence', 'suggestedAction', 'quote', 'start', 'end'],
        properties: {
          issueType: { type: 'string' }, severity: { type: 'string', enum: ['suggestion', 'warning', 'blocking'] }, summary: { type: 'string' }, evidence: { type: 'string' }, suggestedAction: { type: 'string' }, quote: { type: 'string' }, start: { type: 'integer', minimum: 0 }, end: { type: 'integer', minimum: 0 }
        }
      }
    }
  }
};
