import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { GitService } from '../electron/main/git.js';
import { ProjectService } from '../electron/main/project.js';
import { exists, hashText, now } from '../electron/main/utils.js';
import { isUiAcceptanceMode, REQUIRED_UI_STEPS, validateUiAcceptanceEvidence } from './ui-acceptance-evidence.js';

const projectArgument = process.argv[2];
const directRoot = projectArgument ? path.resolve(projectArgument) : path.resolve(import.meta.dirname, '..', 'workspaces', 'wan-jie-zhu-shen');
const workspaceRoot = projectArgument ? path.resolve(import.meta.dirname, '..', 'workspaces', projectArgument) : directRoot;
const root = projectArgument && !(await exists(directRoot)) && await exists(workspaceRoot) ? workspaceRoot : directRoot;
const modeArgument = process.argv[3] || '';
if (!isUiAcceptanceMode(modeArgument)) throw new Error('未知UI验收模式');
const evidenceArgument = process.argv[4] || process.env.ACCEPTANCE_EVIDENCE_PATH;
if (!evidenceArgument) throw new Error('必须提供本次可见UI操作证据JSON：npm run accept:ui -- <作品路径或简称> <模式> <evidence.json>');

const canonicalRoot = await realpath(root);
const evidencePath = path.resolve(evidenceArgument);
const evidenceBody = await readFile(evidencePath, 'utf8');
let parsed: unknown;
try { parsed = JSON.parse(evidenceBody); } catch { throw new Error('UI验收证据不是合法JSON'); }
const evidence = validateUiAcceptanceEvidence(parsed, { mode: modeArgument, repositoryRoot: canonicalRoot });

const screenshots = await Promise.all(evidence.screenshots.map(async (item) => {
  const screenshotPath = await realpath(item.path).catch(() => { throw new Error(`UI验收截图不存在：${item.path}`); });
  const extension = path.extname(screenshotPath).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.webp'].includes(extension)) throw new Error(`UI验收截图格式不支持：${item.path}`);
  const info = await stat(screenshotPath);
  if (!info.isFile() || info.size === 0) throw new Error(`UI验收截图为空：${item.path}`);
  const bytes = await readFile(screenshotPath);
  return { label: item.label, path: screenshotPath, bytes: info.size, sha256: hashText(bytes) };
}));

const project = new ProjectService('ui-feature-acceptance-v2');
const state = await project.open(canonicalRoot);
const repository = await new GitService(canonicalRoot).info();
const events = await project.eventStore.all();
const existing = events.filter((event) => event.type === 'acceptance.recorded').map((event) => event.payload as unknown as { id?: string; status?: string; evidenceVersion?: number }).findLast((item) => item.id === modeArgument && item.status === 'passed' && item.evidenceVersion === 2);
if (existing && process.env.ACCEPTANCE_REPLACE !== '1') {
  process.stdout.write(`${JSON.stringify({ ...existing, reused: true }, null, 2)}\n`);
  process.exit(0);
}

const payload = {
  id: modeArgument,
  status: 'passed',
  evidenceVersion: 2,
  verifiedAt: now(),
  observedAt: evidence.observedAt,
  surface: evidence.surface,
  projectTitle: state.manifest.title,
  repository: { ...repository, root: canonicalRoot },
  requiredSteps: REQUIRED_UI_STEPS[modeArgument],
  steps: evidence.steps,
  screenshots,
  notes: evidence.notes || [],
  sourceEvidence: { path: evidencePath, sha256: hashText(evidenceBody) },
  gitCommitCreatedByAcceptance: false
};
await project.eventStore.append('acceptance.recorded', payload as never, 'system');
process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
