import type { CreativeTask, ReviewReport } from '../shared/types';
import { fileTitle } from './format';

export function readabilityRewriteTask(report: ReviewReport, reason: string): Partial<CreativeTask> {
  const paths = [...new Set(report.sources.filter((source) => !source.referenceOnly).map((source) => source.filePath))];
  if (!paths.length) throw new Error('本报告没有可修订的正文范围。');
  return {
    title: `重写${paths.map(fileTitle).join('、')}：让读者顺读场景`,
    description: `作者读后退回：${reason}\n允许重建场景顺序和段落，不限于润色原句；保持已确认的核心设定，改动事实须回写正典与滚动规划。`,
    level: paths.length > 1 ? 'work' : 'chapter', status: 'now', kind: 'revision', assignee: 'writer', source: 'author', priority: 'critical',
    whyNow: '作者实际阅读判定当前正文难以理解；模型审阅通过不能代替作者验收。',
    aiPreAnalysis: `author-readability:${report.id}`, authorDecision: reason, requiresAuthorReadability: true,
    completionCriteria: ['首次阅读能说清各场景中谁在哪里、想做什么、行动如何引出结果', '场景和章节之间的人物位置及因果能够直接接上', '句子与对话自然，不靠道具清单和读者脑补推进', '当前版本经独立审阅后仍须作者亲自顺读确认'],
    links: paths
  };
}
