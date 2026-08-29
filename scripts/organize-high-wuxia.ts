import path from 'node:path';
import { ProjectService } from '../electron/main/project.js';

const root = path.resolve(process.argv[2] || path.join(import.meta.dirname, '..', 'workspaces', 'wan-jie-zhu-shen'));
const from = 'manuscript/第一章.md';
const to = 'manuscript/第一卷-灰炉余火/第001章-死人教我出拳.md';
const project = new ProjectService('million-word-file-organizer');
await project.open(root);
if ((await project.files()).some((item) => item.path === from)) {
  const moved = await project.moveFile(from, to);
  await project.eventStore.append('file.moved', moved as never, 'author');
  await project.eventStore.append('project.position', { filePath: to }, 'system');
}
const state = await project.state();
process.stdout.write(`${JSON.stringify({ firstChapter: state.files.find((item) => item.path === to)?.path, stats: state.manuscriptStats }, null, 2)}\n`);
