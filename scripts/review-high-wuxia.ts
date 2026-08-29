import path from 'node:path';
import { ProjectService } from '../electron/main/project.js';
import { makeAnchor } from '../electron/main/observer.js';
import type { ObserverComment } from '../src/shared/types.js';
import { hashText, now, uid } from '../electron/main/utils.js';

const root = path.resolve(process.argv[2] || path.join(import.meta.dirname, '..', 'workspaces', 'wan-jie-zhu-shen'));
const filePath = 'manuscript/第一卷-灰炉余火/第006章-三万人的第一轮.md';
const project = new ProjectService('million-word-observer-review');
await project.open(root);
const before = await project.readFile(filePath);
const quote = '规则从来没有说不能协作，只是所有人都默认别人必须是对手。';
const start = before.content.indexOf(quote);
if (start < 0) throw new Error('找不到 Observer 锚定文字');
const timestamp = now();
const comment: ObserverComment = {
  id: uid('OBS'), issueType: '规则铺垫', severity: 'warning', summary: '综合救援权重出现得太晚，容易像临时为主角改规则。', evidence: '项目公布时只写搬运假人和受击淘汰，直到结算前读者才知道同区存活率会影响成绩。', suggestedAction: '在开考时明确成绩包含动态加权，但隐藏具体权重；这样主角发现协作解法仍有惊喜，胜利也符合预先规则。',
  anchor: makeAnchor(filePath, before.content, 'chapter-006-review-snapshot', before.hash, { quote, start, end: start + quote.length })!, status: 'open', reviewCount: 0,
  messages: [{ id: uid('msg'), source: 'observer', body: '建议提前声明动态评分维度，避免结算规则显得机械降神。', createdAt: timestamp }], createdAt: timestamp, updatedAt: timestamp
};
await project.eventStore.append('comment.created', comment as never, 'observer');
const accepted: ObserverComment = { ...comment, status: 'accepted', updatedAt: now(), messages: [...comment.messages, { id: uid('msg'), source: 'author', body: '接受建议：保留权重未知，但开场声明同区存活率参与动态评分。', createdAt: now() }] };
await project.eventStore.append('comment.updated', accepted as never, 'author');
const marker = '第一轮项目公布。\n\n不是测力，也不是擂台，而是“负重救援”。每个测试区投放十具八十公斤假人，考生需在不断倾斜的金属地面上将假人送到安全线。星兽影像会随机扑击，受击三次淘汰；假人掉落，直接扣除一半成绩。';
const replacement = `${marker}\n\n项目终端同时注明：最终成绩由救援效率、假人完整度和同区存活率动态加权，具体权重将在结束后公开，以防考生针对单项规则投机。`;
if (!before.content.includes(marker)) throw new Error('第006章待修改段落已经变化，请人工复查');
const nextContent = before.content.replace(marker, replacement);
const written = await project.writeFile(filePath, nextContent, before.hash);
if ('conflict' in written) throw new Error('Observer 修改时正文发生并发冲突');
await project.eventStore.append('file.changed', { path: filePath, origin: 'author', reason: 'accepted-observer-comment', hash: written.hash }, 'author');
const resolved: ObserverComment = { ...accepted, status: 'resolved', reviewCount: 1, updatedAt: now(), anchor: { ...accepted.anchor, currentHash: hashText(nextContent) }, messages: [...accepted.messages, { id: uid('msg'), source: 'observer', body: '复查通过：评分维度已在开考时声明，具体权重仍保持未知，主角的协作解法不再依赖临时规则。', createdAt: now() }] };
await project.eventStore.append('comment.updated', resolved as never, 'observer');
process.stdout.write(`${JSON.stringify({ commentId: comment.id, status: resolved.status, reviewCount: resolved.reviewCount, filePath, newHash: written.hash }, null, 2)}\n`);
