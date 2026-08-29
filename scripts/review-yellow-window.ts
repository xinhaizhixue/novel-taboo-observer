import path from 'node:path';
import { ProjectService } from '../electron/main/project.js';
import { makeAnchor } from '../electron/main/observer.js';
import type { ObserverComment } from '../src/shared/types.js';
import { now, uid } from '../electron/main/utils.js';

const root = path.resolve(process.argv[2] || path.join(import.meta.dirname, '..', 'workspaces', 'wan-jie-zhu-shen'));
const mode = process.argv[3] || 'open';
const filePath = 'manuscript/第五卷-地窟王庭/第316章-黄色窗口每次都比上一次短.md';
const issueType = '撤退时间语义';
const quote = '最快增长模型给出一分三十五。';
const project = new ProjectService('million-word-observer-yellow-window');
await project.open(root);
const existing = (await project.state()).comments.find((item) => item.issueType === issueType && item.anchor.filePath === filePath);

if (mode === 'open') {
  if (existing) {
    process.stdout.write(`${JSON.stringify({ commentId: existing.id, status: existing.status, reused: true }, null, 2)}\n`);
  } else {
    const file = await project.readFile(filePath);
    const start = file.content.indexOf(quote);
    if (start < 0) throw new Error('找不到黄色窗口锚点');
    const createdAt = now();
    const comment: ObserverComment = {
      id: uid('OBS'),
      issueType,
      severity: 'warning',
      summary: '“一分三十五”与全员最慢返回五分十秒的关系没有定义，撤退决定会显得自相矛盾。',
      evidence: '第316章先写阿轨最慢返回五分十秒，后文直接把黄色窗口写成一分三十五；若它是到结构失效的总时间，队伍已不可能在第317章用四分四十二返回。',
      suggestedAction: '明确窗口是扣除最慢返回上限后的结构余量，并把趋势误差、盲角补偿、下次刷新与任务剩余放进同一比较式。',
      anchor: makeAnchor(filePath, file.content, 'chapter-316-yellow-window-review', file.hash, { quote, start, end: start + quote.length })!,
      status: 'open',
      reviewCount: 0,
      messages: [{ id: uid('msg'), source: 'observer', body: '建议定义时间口径，否则合理黄线撤退的核心因果无法复核。', createdAt }],
      createdAt,
      updatedAt: createdAt
    };
    await project.eventStore.append('comment.created', comment as never, 'observer');
    process.stdout.write(`${JSON.stringify({ commentId: comment.id, status: comment.status, reused: false }, null, 2)}\n`);
  }
} else if (mode === 'resolve') {
  if (!existing) throw new Error('找不到黄色窗口评论');
  const chapter316 = await project.readFile(filePath);
  const chapter317 = await project.readFile('manuscript/第五卷-地窟王庭/第317章-信标停在百分之八十一.md');
  const chapter318 = await project.readFile('manuscript/第五卷-地窟王庭/第318章-二十分钟后没有塌落.md');
  const passed = chapter316.content.includes('扣除当前最慢返回上限后的剩余结构余量')
    && chapter316.content.includes('趋势误差三十五秒，盲角补偿二十秒，下一次可靠刷新三十秒')
    && chapter317.content.includes('趋势误差、盲角补偿和掉头成本')
    && chapter318.content.includes('最快余量已经不足以覆盖趋势误差、下一次刷新、盲角补偿和信标剩余');
  if (existing.status === 'resolved' && passed) {
    process.stdout.write(`${JSON.stringify({ commentId: existing.id, status: existing.status, reused: true }, null, 2)}\n`);
  } else if (!passed) {
    if (existing.status === 'resolved') {
      const partial: ObserverComment = {
        ...existing,
        status: 'partial',
        reviewCount: existing.reviewCount + 1,
        updatedAt: now(),
        messages: [...existing.messages, { id: uid('msg'), source: 'observer', body: '二次复查未通过：第318章独立复核仍把一分三十五写成小于五分十秒的总时间，和已修正口径冲突。', createdAt: now() }]
      };
      await project.eventStore.append('comment.updated', partial as never, 'observer');
      process.stdout.write(`${JSON.stringify({ commentId: partial.id, status: partial.status, reviewCount: partial.reviewCount, reused: false }, null, 2)}\n`);
    } else {
      throw new Error('黄色窗口时间口径尚未修正完整');
    }
  } else {
    const accepted: ObserverComment = {
      ...existing,
      status: 'accepted',
      updatedAt: now(),
      messages: [...existing.messages, { id: uid('msg'), source: 'author', body: '接受：统一把窗口定义为扣除最慢返回后的结构余量，并补齐继续任务需要消耗的比较项。', createdAt: now() }]
    };
    await project.eventStore.append('comment.updated', accepted as never, 'author');
    const resolved: ObserverComment = {
      ...accepted,
      status: 'resolved',
      reviewCount: accepted.reviewCount + 1,
      updatedAt: now(),
      messages: [...accepted.messages, { id: uid('msg'), source: 'observer', body: '复查通过：五分十秒是已扣除的返回上限，一分三十五是剩余余量；撤退比较式现在可以独立复算。', createdAt: now() }]
    };
    await project.eventStore.append('comment.updated', resolved as never, 'observer');
    process.stdout.write(`${JSON.stringify({ commentId: resolved.id, status: resolved.status, reviewCount: resolved.reviewCount, reused: false }, null, 2)}\n`);
  }
} else {
  throw new Error(`未知模式：${mode}`);
}
