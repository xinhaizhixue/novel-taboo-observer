import path from 'node:path';
import { ProjectService } from '../electron/main/project.js';
import type { StoryFact } from '../src/shared/types.js';
import { now, uid } from '../electron/main/utils.js';

const root = path.resolve(process.argv[2] || path.join(import.meta.dirname, '..', 'workspaces', 'wan-jie-zhu-shen'));
const project = new ProjectService('million-word-researcher');
let state = await project.open(root);
const task = state.tasks.find((item) => item.title.includes('第052～054章'));
if (!task) throw new Error('找不到栖山城研究任务');
await project.eventStore.append('task.upsert', { ...task, status: 'now', assignee: 'researcher', kind: 'research', agentWork: '已建立 research/栖山城五十三年前事故档案.md；完成三类离线来源交叉核验，未知载体身份仍待确认。', links: [...new Set([...task.links, 'research/栖山城五十三年前事故档案.md'])], updatedAt: now() } as never, 'agent');
const candidates: StoryFact[] = [
  { id: uid('fact'), category: 'timeline', subject: '栖山归一武训事故', statement: '五十三年前119名学员被统一下发岳门守式，造成27死64重伤；离线灾害索引与旧报转载相互印证。', status: 'ai-suggested', evidence: [{ filePath: 'research/栖山城五十三年前事故档案.md', quote: 'QS-73-归一武训事故' }], updatedAt: now() },
  { id: uid('fact'), category: 'foreshadowing', subject: '栖山无名指骨流转', statement: '事故后四个月，一段带异常气血记录纹的无名男性指骨由栖山公共殓房送入临渊城防医学所。', status: 'ai-suggested', evidence: [{ filePath: 'research/栖山城五十三年前事故档案.md', quote: 'LY-MED-骨传导样本-0055' }], updatedAt: now() }
];
for (const fact of candidates) if (!state.facts.some((item) => item.subject === fact.subject && item.statement === fact.statement)) { await project.eventStore.append('fact.upsert', fact as never, 'agent'); state = await project.state(); }
await project.eventStore.append('file.changed', { path: 'research/栖山城五十三年前事故档案.md', origin: 'author', reason: 'researcher-offline-archive' }, 'agent');
process.stdout.write(`${JSON.stringify({ researchFile: 'research/栖山城五十三年前事故档案.md', taskStatus: 'now', candidateFacts: candidates.length, canonPromotions: 0 }, null, 2)}\n`);
