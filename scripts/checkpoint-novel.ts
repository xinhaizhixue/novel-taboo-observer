import path from 'node:path';
import { ProjectService } from '../electron/main/project.js';

const root = path.resolve(process.argv[2] || path.join(import.meta.dirname, '..', 'workspaces', 'wan-jie-zhu-shen'));
const message = process.argv[3] || '完成《万劫铸身》开篇九章与百万字创作基线';
const project = new ProjectService('novel-checkpoint');
await project.open(root);
const before = await project.gitService.status();
if (before.clean) {
  process.stdout.write('小说仓库当前没有需要提交的变化。\n');
} else {
  const result = await project.gitService.commit(message, before.files.map((item) => item.path), true);
  process.stdout.write(`${JSON.stringify({ paths: before.files.map((item) => item.path), ...result }, null, 2)}\n`);
}
