import path from 'node:path';
import { ProjectService } from '../electron/main/project.js';
import { makeAnchor } from '../electron/main/observer.js';
import type { ObserverComment } from '../src/shared/types.js';
import { now, uid } from '../electron/main/utils.js';

const root = path.resolve(process.argv[2] || path.join(import.meta.dirname, '..', 'workspaces', 'wan-jie-zhu-shen'));
const mode = process.argv[3] || 'open';
const filePath = 'manuscript/第二卷-下城武考/第094章-九叠崩峰没有固定的脚.md';
const issueType = '伤势连续性';
const project = new ProjectService('million-word-observer-ninefold');
await project.open(root);
const existing = (await project.state()).comments.find((item) => item.issueType === issueType && item.anchor.filePath === filePath);

if (mode === 'open') {
  if (existing) {
    process.stdout.write(`${JSON.stringify({ commentId: existing.id, status: existing.status, reused: true }, null, 2)}\n`);
  } else {
    const file = await project.readFile(filePath);
    const quote = '江砚右肩是肌肉挫伤，没有骨裂，主动抬臂只剩正常范围的六成。';
    const start = file.content.indexOf(quote);
    if (start < 0) throw new Error('找不到九叠首轮伤势锚点');
    const createdAt = now();
    const comment: ObserverComment = {
      id: uid('OBS'),
      issueType,
      severity: 'warning',
      summary: '肩伤复核不能只作为进入第二轮的一次性门票。',
      evidence: '第一轮明确右肩主动范围只剩六成；如果下一章只写“通过复查”便恢复完整打法，伤势门槛会失去连续约束。',
      suggestedAction: '第二轮写明复查数值、动作禁区和持续监测；江砚的应对不得依赖右肩突然恢复或临场爆发。',
      anchor: makeAnchor(filePath, file.content, 'chapter-094-ninefold-review', file.hash, { quote, start, end: start + quote.length })!,
      status: 'open',
      reviewCount: 0,
      messages: [{ id: uid('msg'), source: 'observer', body: '建议让肩伤持续改变第二轮可用动作，并在赛后复查是否恶化。', createdAt }],
      createdAt,
      updatedAt: createdAt
    };
    await project.eventStore.append('comment.created', comment as never, 'observer');
    process.stdout.write(`${JSON.stringify({ commentId: comment.id, status: comment.status, reused: false }, null, 2)}\n`);
  }
} else if (mode === 'resolve') {
  if (!existing) throw new Error('找不到待复查的九叠伤势评论');
  if (existing.status === 'resolved') {
    process.stdout.write(`${JSON.stringify({ commentId: existing.id, status: existing.status, reused: true }, null, 2)}\n`);
  } else {
    const accepted: ObserverComment = {
      ...existing,
      status: 'accepted',
      updatedAt: now(),
      messages: [...existing.messages, { id: uid('msg'), source: 'author', body: '接受：第二轮只在主动范围恢复到八成后开放，并持续限制右肩出力与复查。', createdAt: now() }]
    };
    await project.eventStore.append('comment.updated', accepted as never, 'author');
    const resolved: ObserverComment = {
      ...accepted,
      status: 'resolved',
      reviewCount: accepted.reviewCount + 1,
      updatedAt: now(),
      messages: [...accepted.messages, { id: uid('msg'), source: 'observer', body: '复查通过：第095章保留八成活动门槛、六成出力限制和轮后超声复核，伤势没有被胜负覆盖。', createdAt: now() }]
    };
    await project.eventStore.append('comment.updated', resolved as never, 'observer');
    process.stdout.write(`${JSON.stringify({ commentId: resolved.id, status: resolved.status, reviewCount: resolved.reviewCount, reused: false }, null, 2)}\n`);
  }
} else {
  throw new Error(`未知模式：${mode}`);
}
