import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const coreGlobs = ['src/**/*.{ts,tsx}', 'electron/**/*.{ts,tsx}'];
const coreFiles = await fg(coreGlobs, { cwd: repositoryRoot, absolute: true, onlyFiles: true });

const fixtureMarkers = [
  'wan-jie-zhu-shen',
  '万劫铸身',
  '江砚',
  '人间武库',
  '断星远征',
  'high-wuxia',
  'million-word-sixth-volume',
  'million-word-seventh-volume'
];

type Violation = { file: string; rule: string; marker: string; line: number };
const violations: Violation[] = [];

for (const file of coreFiles) {
  const content = await fs.readFile(file, 'utf8');
  const relative = path.relative(repositoryRoot, file);
  const lines = content.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    for (const marker of fixtureMarkers) {
      if (line.includes(marker)) violations.push({ file: relative, rule: 'fixture-marker-in-core', marker, line: index + 1 });
    }
    if (/from\s+['"][^'"]*\bscripts\//.test(line) || /import\s*\(\s*['"][^'"]*\bscripts\//.test(line)) {
      violations.push({ file: relative, rule: 'core-imports-fixture-script', marker: line.trim(), line: index + 1 });
    }
    if (/['"][^'"]*workspaces\/[^'"]+['"]/.test(line)) {
      violations.push({ file: relative, rule: 'hardcoded-workspace-path-in-core', marker: line.trim(), line: index + 1 });
    }
  }
}

const report = {
  checkedAt: new Date().toISOString(),
  coreRoots: ['src', 'electron'],
  files: coreFiles.length,
  fixtureMarkers,
  violations,
  boundary: {
    core: '通用运行时、数据模型、Agent桥接、Observer、Git与恢复能力',
    projectData: '作品名、人物、题材、卷章、正典、规则与任务保存在各自Git仓库',
    fixtures: 'scripts与workspaces可包含专用真实验收项目，但不得成为核心运行依赖'
  }
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (violations.length > 0) {
  process.stderr.write('通用核心审计失败：产品运行时包含作品专有标识、固定工作区路径或验收脚本依赖。\n');
  process.exitCode = 2;
}
