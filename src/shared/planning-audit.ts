import type { PlanningAudit, PlanningAuditItem, ProjectManifest } from './types.js';

export const STORY_PLAN_PATH = 'planning/全书路线.md';
export function storyPlanPath(manifest: ProjectManifest): string {
  return manifest.kind === 'series' ? `planning/${manifest.activeWorkId || 'work-1'}/全书路线.md` : STORY_PLAN_PATH;
}

export const STORY_PLAN_TEMPLATE = `# 全书路线（工作草案）

> 可以边写边补。候选、待定和作者已确认的决定请分开写；留空不会阻止写作，但工作台会提醒。

## 题材承诺与读者回报

待定：读者为什么愿意持续追读？每个阶段有什么具体回报？

## 主角成长与能力边界

待定：主角会在哪些方面变强？有什么代价和不能做到的事？

## 世界机制与力量路线

待定：关键异常最终如何解释？有无异能、武道或修仙？没有也请明确写出。

## 分卷路线与关键转折

待定：至少列出主要阶段的目标、转折、阶段回报与代价。

## 终局与人物收束

待定：核心冲突怎样解决？主角和重要人物最终如何改变？

## 当前卷与近期章节

待定：当前卷的目标、接下来的行动和需要兑现的伏笔。
`;

type Document = { path: string; content: string };
type Section = { path: string; title: string; body: string };

const TOPICS: Array<{ key: PlanningAuditItem['key']; label: string; question: string; heading: RegExp; line?: RegExp }> = [
  { key: 'promise', label: '题材承诺与读者回报', question: '这本书持续给读者什么体验和阶段回报？', heading: /作品承诺|一句话承诺|题材承诺|题材与读者|开书状态|本书写作方向/ },
  { key: 'growth', label: '主角成长', question: '主角后期会在哪些方面变强，代价和边界是什么？', heading: /主角成长|成长路线|长线成长|人物弧光|主角弧光/, line: /^(?:[-*]\s*)?(?:主角)?长线成长[：:]/ },
  { key: 'world', label: '世界机制与力量路线', question: '异常的答案与力量路线是什么？无超凡也应明确记录。', heading: /世界机制|世界规则|灾变(?:成因|真相|机制)|力量体系|能力体系|能力边界|异能体系|超凡设定|力量路线/, line: /^(?:[-*]\s*)?(?:力量路线|能力边界|灾变真相)[：:]|(?:不设|没有|无)(?:异能|超凡|修仙|武道)/ },
  { key: 'arcs', label: '分卷路线与关键转折', question: '从当前阶段到终局有哪些大转折和分卷回报？', heading: /全书大纲|百万字总纲|分卷路线|分卷大纲|卷纲|后续长篇骨架|第[一二三四五六七八九十\d]+卷/ },
  { key: 'ending', label: '终局与人物收束', question: '核心冲突如何收束，人物最终作出什么选择？', heading: /^(?:终局|结局|人物收束|最终回报|全书收束)/ },
  { key: 'current', label: '当前卷与近期章节', question: '当前卷目标和接下来几章的行动是否有记录？', heading: /当前卷|近期章节|未来一至三章|本轮目标|本轮进度|第一卷/ }
];

function substantial(body: string): boolean {
  const cleaned = body
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
    .filter((line) => !/^\s*(?:>|待定|待探索|暂无|未定|TBD|TODO)/i.test(line))
    .join('')
    .replace(/[\s#*\-—：:，。！？?、；;（）()[\]`]/g, '');
  return cleaned.length >= 12;
}

function sections(documents: Document[]): Section[] {
  return documents.flatMap(({ path, content }) => {
    const result: Section[] = [];
    let current: Section | null = null;
    for (const line of content.replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/)) {
      const heading = line.match(/^#{1,4}\s+(.+)$/);
      if (heading) {
        if (current) result.push(current);
        current = { path, title: heading[1], body: '' };
      } else if (current) current.body += `${line}\n`;
    }
    if (current) result.push(current);
    return result;
  });
}

export function auditPlanning(documents: Document[]): PlanningAudit {
  const relevant = documents.filter((doc) => /^(planning|canon)\/.*\.(?:md|markdown|txt)$/i.test(doc.path));
  const parts = sections(relevant);
  const items = TOPICS.map((topic): PlanningAuditItem => {
    const matches = parts.filter((part) => topic.heading.test(part.title) && substantial(part.body));
    const lineMatches = relevant.filter((doc) => topic.line && doc.content.split(/\r?\n/).some((line) => topic.line!.test(line) && substantial(line)));
    const sources = [...new Set([...matches.map((part) => part.path), ...lineMatches.map((doc) => doc.path)])];
    let status: PlanningAuditItem['status'] = sources.length ? 'recorded' : 'missing';
    if (topic.key === 'arcs' && sources.length) {
      const volumes = matches.filter((part) => /^第[一二三四五六七八九十\d]+卷/.test(part.title));
      if (volumes.length < 2) status = 'skeleton';
    }
    return { key: topic.key, label: topic.label, question: topic.question, status, sources };
  });
  return { items, attention: items.filter((item) => item.status !== 'recorded').map((item) => item.key) };
}

export function hasDraftedChapter(content: string): boolean {
  const body = content.replace(/<!--[\s\S]*?-->/g, '').replace(/^\s*#{1,4}[^\n]*$/gm, '').replace(/\s/g, '');
  return body.length >= 50;
}
