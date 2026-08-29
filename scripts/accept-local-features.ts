import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import fg from 'fast-glob';
import { ProjectService } from '../electron/main/project.js';
import { RecoveryStore } from '../electron/main/recovery.js';
import { DEFAULT_SETTINGS } from '../src/shared/constants.js';
import { exec, now } from '../electron/main/utils.js';

const root = path.resolve(process.argv[2] || path.join(import.meta.dirname, '..', 'workspaces', 'wan-jie-zhu-shen'));
const project = new ProjectService('local-feature-acceptance');
await project.open(root);
const receipts: Array<Record<string, unknown>> = [];

async function lastReceipt(id: string) {
  return (await project.eventStore.all())
    .filter((event) => event.type === 'acceptance.recorded')
    .map((event) => event.payload as unknown as { id?: string; status?: string; sourceCommit?: string })
    .findLast((item) => item.id === id && item.status === 'passed');
}

async function appendReceipt(id: string, evidence: Record<string, unknown>) {
  const existing = await lastReceipt(id);
  const sourceCommit = String(evidence.sourceCommit || '');
  if (existing && (!sourceCommit || existing.sourceCommit === sourceCommit)) {
    receipts.push({ id, status: 'passed', reused: true, ...evidence });
    return;
  }
  const payload = { id, status: 'passed', verifiedAt: now(), ...evidence };
  await project.eventStore.append('acceptance.recorded', payload as never, 'system');
  receipts.push(payload);
}

async function acceptPortability() {
  const source = await project.state();
  const sourceCommit = (await exec('git', ['rev-parse', 'HEAD'], root)).stdout.trim();
  const existing = await lastReceipt('cross-machine-clone');
  if (existing?.sourceCommit === sourceCommit) {
    receipts.push({ id: 'cross-machine-clone', status: 'passed', reused: true, sourceCommit });
    return;
  }
  if (!source.git.clean) throw new Error('跨电脑clone验收要求小说仓库先干净提交');
  const temp = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-portability-'));
  const cloneRoot = path.join(temp, 'clone');
  try {
    await exec('git', ['clone', '--local', '--no-hardlinks', root, cloneRoot], temp);
    const restored = await new ProjectService('fresh-clone-acceptance').open(cloneRoot);
    const equal = {
      projectId: restored.manifest.projectId === source.manifest.projectId,
      chapters: restored.manuscriptStats.chapterCount === source.manuscriptStats.chapterCount,
      characters: restored.manuscriptStats.totalCharacters === source.manuscriptStats.totalCharacters,
      goal: restored.continueCard.goal?.title === source.continueCard.goal?.title,
      focus: restored.continueCard.focus === source.continueCard.focus,
      tasks: restored.tasks.length === source.tasks.length,
      facts: restored.facts.length === source.facts.length,
      comments: restored.comments.length === source.comments.length && restored.comments.every((comment, index) => comment.status === source.comments[index]?.status && comment.reviewCount === source.comments[index]?.reviewCount)
    };
    if (Object.values(equal).some((value) => !value)) throw new Error(`全新clone关键状态不一致：${JSON.stringify(equal)}`);
    const novelFiles = await fg(['.novel/**/*'], { cwd: cloneRoot, onlyFiles: true, dot: true });
    const bodies = await Promise.all(novelFiles.map((file) => readFile(path.join(cloneRoot, file), 'utf8')));
    const credentialPatterns = [/OPENAI_API_KEY/i, /ANTHROPIC_API_KEY/i, /"apiKey"\s*:/i, /sk-[a-z0-9]{20,}/i];
    if (bodies.some((body) => credentialPatterns.some((pattern) => pattern.test(body)))) throw new Error('clone中的.novel数据疑似包含模型凭据');
    await appendReceipt('cross-machine-clone', { sourceCommit, cloneHead: (await exec('git', ['rev-parse', 'HEAD'], cloneRoot)).stdout.trim(), equal, credentialsAbsent: true, chapters: restored.manuscriptStats.chapterCount, characters: restored.manuscriptStats.totalCharacters });
  } finally { await rm(temp, { recursive: true, force: true }); }
}

async function acceptRecoveryConflict() {
  const state = await project.state();
  const filePath = state.continueCard.lastFile;
  if (!filePath) throw new Error('没有当前正文可做恢复验收');
  const appData = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-real-recovery-'));
  try {
    const recovery = new RecoveryStore(appData, async () => DEFAULT_SETTINGS);
    const original = await project.readFile(filePath);
    const unsaved = `${original.content}\n<!-- REAL_UNSAVED_RECOVERY_ACCEPTANCE -->\n`;
    await recovery.create(project.activeManifest.projectId, filePath, unsaved, 'real-project-unsaved-buffer', true);
    const external = await project.writeFile(filePath, `${original.content}\n<!-- REAL_EXTERNAL_CHANGE_ACCEPTANCE -->\n`, original.hash);
    if ('conflict' in external) throw new Error('制造外部变化时意外冲突');
    const conflict = await project.writeFile(filePath, unsaved, original.hash);
    if (!('conflict' in conflict) || !conflict.conflict?.diskContent.includes('REAL_EXTERNAL_CHANGE_ACCEPTANCE')) throw new Error('旧哈希未触发真实三方冲突保护');
    const entry = (await recovery.list(project.activeManifest.projectId, filePath))[0];
    const restored = await recovery.restore(project.activeManifest.projectId, entry.id);
    if (restored.content !== unsaved) throw new Error('恢复点未还原未保存缓冲');
    const reverted = await project.writeFile(filePath, original.content, external.hash);
    if ('conflict' in reverted || reverted.hash !== original.hash) throw new Error('真实正文未恢复原始哈希');
    await appendReceipt('save-recovery-conflict', { filePath, originalHash: original.hash, conflictProtected: true, recoveryMatchesUnsaved: true, formalFileRestored: true, recoveryStoreRootOutsideRepository: !path.resolve(appData).startsWith(`${path.resolve(root)}${path.sep}`) });
  } finally { await rm(appData, { recursive: true, force: true }); }
}

async function acceptSeriesAndTxt() {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-real-series-'));
  const seriesRoot = path.join(temp, 'series');
  try {
    const series = new ProjectService('real-series-acceptance');
    let state = await series.create({ root: seriesRoot, title: '跨题材系列验收', kind: 'series', idea: '两部现实向作品共享城市背景但正文独立。' });
    const firstWork = state.manifest.activeWorkId!;
    state = await series.addWork('第二部TXT验收');
    const secondWork = state.manifest.activeWorkId!;
    const txtPath = 'manuscript/work-2/第二章.txt';
    const text = '第二部纯文本章节。\n\n夜班店员在停电前保存了最后一张收据。\n';
    await series.writeFile(txtPath, text, undefined, true);
    await series.activateWork(firstWork);
    await series.activateWork(secondWork);
    const reopenedProject = new ProjectService('real-series-reopen');
    const reopened = await reopenedProject.open(seriesRoot);
    const txt = await reopenedProject.readFile(txtPath);
    const top = (await exec('git', ['rev-parse', '--show-toplevel'], seriesRoot)).stdout.trim();
    const assertions = {
      kind: reopened.manifest.kind === 'series',
      workCount: reopened.manifest.works.length === 2,
      activeWork: reopened.manifest.activeWorkId === secondWork,
      txtContent: txt.content === text,
      independentGitRoot: await realpath(top) === await realpath(seriesRoot)
    };
    if (Object.values(assertions).some((value) => !value)) throw new Error(`真实系列/TXT重开验收失败：${JSON.stringify({ assertions, activeWorkId: reopened.manifest.activeWorkId, expectedWorkId: secondWork, top, seriesRoot })}`);
    await appendReceipt('series-and-txt', { works: reopened.manifest.works.map((work) => ({ id: work.id, title: work.title, manuscriptRoot: work.manuscriptRoot })), activeWorkId: reopened.manifest.activeWorkId, txtPath, txtCharacters: txt.content.replace(/\s/g, '').length, independentGitRoot: true, reopened: true });
  } finally { await rm(temp, { recursive: true, force: true }); }
}

await acceptPortability();
await acceptRecoveryConflict();
await acceptSeriesAndTxt();
process.stdout.write(`${JSON.stringify({ root, receipts }, null, 2)}\n`);
