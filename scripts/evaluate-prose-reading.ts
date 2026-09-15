import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ClaudeAdapter } from '../electron/main/agents/claude.js';
import { coldReadingPrompt, COLD_READING_SCHEMA } from '../electron/main/agents/prompts.js';
import { hashText } from '../electron/main/utils.js';
import type { AnalysisSnapshot, ColdReading } from '../src/shared/types.js';

// Expected labels are used only after the CLI returns; never sent to the reviewer.
const fixtures = [
  { text: '唐铮把扳手往下一压，手背磕在机座上。血珠刚冒出来，就混进了黑油。\n\n头顶有人踩得铁板乱响。\n\n“还没好？”\n\n“试。”\n\n启动机咔哒一声，没了下文。', issue: true },
  { text: '老周把钥匙交给小林。小林把钥匙锁进柜子，转身离开。\n\n老周掏出这把钥匙，打开了车门。', issue: true },
  { text: '林涛和陈飞站在门口。他把伞递给他，叫他去接他。', issue: true },
  { text: '“现在点火？”船长握着钥匙问。\n\n唐铮把扳手收回来：“试。”\n\n船长转动钥匙。发动机响了。', issue: false },
  { text: '“开门吗？”她问。\n\n“别。”他按住门把手。门外又响起了抓挠声。', issue: false }
];
const sources: AnalysisSnapshot[] = fixtures.map((f, i) => ({ id: `sample-${i}`, filePath: `manuscript/片段${i+1}.md`, content: f.text, hash: hashText(f.text), editorVersion: 0, createdAt: new Date().toISOString() }));
const root = await mkdtemp(path.join(os.tmpdir(), 'prose-eval-'));
const adapter = new ClaudeAdapter();
const status = await adapter.info(); if (!status.available) throw new Error(status.reason);
const prompt = coldReadingPrompt({ adapterId: 'claude', mode: 'manual', snapshot: sources[0], bundle: { scope: 'sequence', sources, requestedPaths: sources.map(s => s.filePath), omittedPaths: [], characters: sources.reduce((n,s)=>n+s.content.length,0), budget: 20000, gaps: [] } });
const schemaPath=path.join(root,'schema.json');await writeFile(schemaPath,JSON.stringify(COLD_READING_SCHEMA));
const result = await adapter.run({ taskId: 'prose-evaluation', schemaPath, root, prompt, readOnly: true, pureText: true, outputPath: path.join(root, 'result.json'), startupTimeoutMs: 180000, emit: () => {} }).completed;
if (result.exitCode !== 0) throw new Error(`CLI failed: ${result.exitCode}`);
const parsed = JSON.parse(result.finalMessage.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')) as ColdReading;
const checks = sources.map((source, i) => { const row=parsed.readings.find(r => r.filePath===source.filePath); const grounded = row && row.frictions.every(f => source.content.includes(f.quote)); return {filePath:source.filePath, expected: fixtures[i].issue, found: Boolean(row?.frictions.length), grounded:Boolean(grounded), passed:Boolean(row && grounded && Boolean(row.frictions.length)===fixtures[i].issue)}; });
const target=path.resolve(`docs/reviews/prose-evaluation-2026-09-15-${process.env.EVAL_ROUND || 'round2'}.json`);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,JSON.stringify({at:new Date().toISOString(),adapter:status.name,version:status.version,sessionId:result.sessionId,checks,reading:parsed},null,2));
console.log(JSON.stringify({report:target,checks},null,2));
if (checks.some(c=>!c.passed)) process.exitCode=1;
