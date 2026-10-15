import path from 'node:path';
import type { AnalysisSnapshot, ColdReading, ObserverRunRequest, ReviewAssessment, ReviewBundle, ReviewDimension, ReviewReport } from '../../src/shared/types.js';
import { REVIEW_DIMENSIONS } from '../../src/shared/constants.js';
import { compareNaturalPath } from '../../src/shared/natural-sort.js';
import type { ProjectService } from './project.js';
import { hashText, now, uid } from './utils.js';

/** Fixed coverage windows keep a cold reader from reviewing only one convenient exchange. */
export function readingWindows(content: string) {
  const count = Math.min(8, Math.max(1, Math.ceil(content.length / 850)));
  return Array.from({ length: count }, (_, index) => {
    const start = Math.floor(content.length * index / count);
    const end = Math.floor(content.length * (index + 1) / count);
    return { index: index + 1, start, end, content: content.slice(start, end) };
  });
}

export function coldReadingGaps(reading: ColdReading, sources: AnalysisSnapshot[]) {
  const gaps: string[] = [];
  for (const source of sources) {
    const matches = reading.readings?.filter((row) => row.filePath === source.filePath) ?? [];
    const row = matches[0];
    if (matches.length !== 1 || !row?.quote?.trim() || !source.content.includes(row.quote)) {
      gaps.push(`${source.filePath}缺少逐字匹配的初读记录。`);
      continue;
    }
    const minRetell = Math.min(80, Math.max(8, Math.floor(source.content.length / 4)));
    if ((row.understanding?.trim().length ?? 0) < minRetell) gaps.push(`${source.filePath}只复述了局部，未重述整章行动。`);
    if (!Array.isArray(row.frictions) || row.frictions.some((item) => !item.quote?.trim() || !source.content.includes(item.quote) || !item.difficulty?.trim() || !item.suggestion?.trim())) gaps.push(`${source.filePath}的初读疑点缺少有效引文或说明。`);
    const windows = readingWindows(source.content);
    const traces = row.sceneTrace ?? [];
    if (traces.length !== windows.length) gaps.push(`${source.filePath}没有覆盖全部${windows.length}个阅读段。`);
    for (const window of windows) {
      const entries = traces.filter((item) => item.windowIndex === window.index);
      const trace = entries[0];
      const fields = trace && [trace.placeAndPeople, trace.immediateGoal, trace.actionAndResult, trace.bridge];
      if (entries.length !== 1 || !trace?.quote?.trim() || !window.content.includes(trace.quote) || !fields?.every((value) => typeof value === 'string' && value.trim()) || !['clear', 'unclear'].includes(trace.clarity)) {
        gaps.push(`${source.filePath}第${window.index}段缺少可核对的场景位置与因果追踪。`);
      } else if (trace.clarity === 'unclear' && (!trace.readerQuestion.trim() || !(row.frictions || []).some((item) => item.quote === trace.quote))) {
        gaps.push(`${source.filePath}第${window.index}段读不清，却没有对应的初读疑点。`);
      }
    }
  }
  return gaps;
}

/** Read whole scenes in human chapter order, never relevance-ranked fragments. */
export async function buildReviewBundle(project: ProjectService, input: ObserverRunRequest, budget = 48_000): Promise<ReviewBundle> {
  const scope = input.reviewScope ?? 'chapter';
  const primary = input.snapshot;
  if (hashText(primary.content) !== primary.hash) throw new Error('正文快照哈希不匹配，请重新发起审阅。');
  const work = project.activeManifest.works.filter((item) => primary.filePath.startsWith(`${item.manuscriptRoot.replace(/\/$/, '')}/`)).sort((a, b) => b.manuscriptRoot.length - a.manuscriptRoot.length)[0];
  const all = (await project.files()).filter((file) => file.category === 'manuscript' && (!work || file.path.startsWith(`${work.manuscriptRoot.replace(/\/$/, '')}/`))).map((file) => file.path);
  if (!all.includes(primary.filePath)) all.push(primary.filePath);
  all.sort(compareNaturalPath);
  const index = all.indexOf(primary.filePath);
  const window = Math.min(5, Math.max(2, Math.floor(input.reviewWindow ?? 5)));
  const requestedPaths = scope === 'sequence' ? all.slice(Math.max(0, index - window + 1), index + 1) : all.slice(Math.max(0, index - 1), index + 2);
  const sources: AnalysisSnapshot[] = [];
  const omittedPaths: string[] = [];
  const gaps: string[] = [];
  let characters = primary.content.length;
  sources.push(primary);
  if (characters > budget) gaps.push('当前章节超过审阅字符预算；保留全文，需要分场景审阅后补充整体判断。');
  for (const filePath of requestedPaths.filter((file) => file !== primary.filePath)) {
    try {
      const file = await project.readFile(filePath);
      if (characters + file.content.length > budget) { omittedPaths.push(filePath); continue; }
      sources.push({ id: uid('review-source'), filePath, content: file.content, hash: file.hash, editorVersion: 0, createdAt: now() });
      characters += file.content.length;
    } catch { omittedPaths.push(filePath); }
  }
  sources.sort((a, b) => compareNaturalPath(a.filePath, b.filePath));
  if (omittedPaths.length) gaps.push('有整章未能纳入，相关维度只能标为资料不足，不能宣布整体没有问题。');
  if (scope === 'sequence' && sources.length < 2) gaps.push('不足两章，无法完成跨章比较；请使用本章精读，或在有相邻正文后再联合审读。');
  return { scope, sources, requestedPaths, omittedPaths, characters, budget, gaps };
}

export function pendingReview(input: ObserverRunRequest, taskId: string): ReviewReport {
  const bundle = input.bundle!;
  return { protocolVersion: 4, coldReading: input.coldReading, quoteNormalizations: input.quoteNormalizations, chapterReadings: [], id: input.reportId!, taskId, scope: bundle.scope, status: 'running', primaryFile: input.snapshot.filePath, createdAt: input.snapshot.createdAt, summary: '正在逐项审阅；尚无结论。', sources: bundle.sources.map(({ filePath, hash, referenceOnly }) => ({ filePath, hash, referenceOnly })), omittedPaths: bundle.omittedPaths, gaps: [...bundle.gaps], assessments: [], commentIds: [], unanchored: [], sourceWriterTaskId: input.sourceWriterTaskId, writingRequirements: input.writingRequirements };
}

/** Treat the model's coverage claims as untrusted: validate every quoted source. */
export function finishReview(report: ReviewReport, bundle: ReviewBundle, parsed: Record<string, unknown>, commentIds: string[], unanchored: ReviewReport['unanchored']): ReviewReport {
  const gaps = [...report.gaps];
  if (report.protocolVersion === 4 && !report.coldReading) gaps.push('缺少覆盖全章的独立正文阅读记录。');
  if (report.protocolVersion === 4 && report.coldReading) gaps.push(...coldReadingGaps(report.coldReading, bundle.sources.filter((source) => !source.referenceOnly)));
  const resolutions = Array.isArray(parsed.coldResolutions) ? parsed.coldResolutions as Array<Record<string, unknown>> : [];
  const comments = Array.isArray(parsed.comments) ? parsed.comments as Array<Record<string, unknown>> : [];
  for (const reading of report.coldReading?.readings ?? []) for (const friction of reading.frictions) {
    const rows = resolutions.filter(row => row.filePath === reading.filePath && row.quote === friction.quote);
    const row = rows[0];
    if (rows.length !== 1 || !String(row.reason ?? '').trim() || !['retain', 'dismiss'].includes(String(row.decision)) || (row.decision === 'retain' && !comments.some(comment => comment.filePath === reading.filePath && String(comment.quote ?? '').includes(friction.quote)))) gaps.push(`${reading.filePath}的首次阅读疑点尚未逐条处理：${friction.quote}`);
  }
  for (const reading of report.coldReading?.readings ?? []) for (const trace of reading.sceneTrace ?? []) {
    if (trace.clarity === 'unclear' && !comments.some((comment) => comment.filePath === reading.filePath && String(comment.quote ?? '').includes(trace.quote))) gaps.push(`${reading.filePath}第${trace.windowIndex}段读不清的位置或因果没有形成可处理意见。`);
  }

  const readings = Array.isArray(parsed.chapterReadings) ? parsed.chapterReadings as Array<Record<string, unknown>> : [];
  const chapterReadings: NonNullable<ReviewReport['chapterReadings']> = [];
  for (const source of bundle.sources.filter((source) => !source.referenceOnly)) {
    const matches = readings.filter((row) => row.filePath === source.filePath);
    const row = matches[0];
    const quotes = Array.isArray(row?.evidence) ? row.evidence as Array<Record<string, unknown>> : [];
    const valid = quotes.filter((quote) => quote.filePath === source.filePath && String(quote.quote ?? '').trim() && source.content.includes(String(quote.quote)));
    if (matches.length !== 1 || !String(row?.change ?? '').trim() || !valid.length || valid.length !== quotes.length) {
      gaps.push(`${source.filePath}没有可验证的逐章阅读记录。`);
    } else chapterReadings.push({ filePath: source.filePath, change: String(row.change), evidence: valid.map((quote) => ({ filePath: source.filePath, quote: String(quote.quote) })) });
  }
  const rows = Array.isArray(parsed.assessments) ? parsed.assessments as Array<Record<string, unknown>> : [];
  const assessments: ReviewAssessment[] = Object.keys(REVIEW_DIMENSIONS).map((dimension) => {
    const matches = rows.filter((row) => row.dimension === dimension);
    const row = matches[0];
    const proposed = Array.isArray(row?.evidence) ? row.evidence as Array<Record<string, unknown>> : [];
    const evidence = proposed.filter((item) => typeof item.quote === 'string' && item.quote.trim() && bundle.sources.some((source) => source.filePath === item.filePath && source.content.includes(String(item.quote)))).map((item) => ({ filePath: String(item.filePath), quote: String(item.quote) }));
    const needsComparison = bundle.scope === 'sequence' && ['agency', 'pacing', 'dialogue'].includes(dimension);
    const valid = (!needsComparison || new Set(evidence.map((item) => item.filePath)).size >= 2) && matches.length === 1 && evidence.length > 0 && proposed.length === evidence.length && ['issues', 'clear', 'insufficient'].includes(String(row?.status)) && String(row?.finding ?? '').trim();
    if (!valid) gaps.push(`${REVIEW_DIMENSIONS[dimension as ReviewDimension]}缺少完整、可核对的检查结果。`);
    return { dimension: dimension as ReviewDimension, status: valid ? row.status as ReviewAssessment['status'] : 'insufficient', finding: String(row?.finding ?? '本项没有完成检查。'), evidence };
  });
  if (unanchored.length) gaps.push(`${unanchored.length} 条意见未能可靠定位，已保留待核实。`);
  const alignment = parsed.taskAlignment as Record<string, unknown> | undefined;
  const alignmentEvidence = Array.isArray(alignment?.evidence) ? alignment.evidence as Array<Record<string, unknown>> : [];
  const validAlignmentEvidence = alignmentEvidence.filter((item) => String(item.quote ?? '').trim() && bundle.sources.some((source) => source.filePath === item.filePath && source.content.includes(String(item.quote))));
  const alignmentValid = !report.sourceWriterTaskId || (['met', 'unmet', 'insufficient'].includes(String(alignment?.status)) && String(alignment?.finding ?? '').trim() && validAlignmentEvidence.length > 0 && validAlignmentEvidence.length === alignmentEvidence.length);
  const taskAlignment: NonNullable<ReviewReport['taskAlignment']> = { status: !report.sourceWriterTaskId ? 'not-applicable' : alignmentValid ? alignment!.status as 'met' | 'unmet' | 'insufficient' : 'insufficient', finding: String(alignment?.finding ?? '本次没有完成写作要求核对。'), evidence: validAlignmentEvidence.map((item) => ({ filePath: String(item.filePath), quote: String(item.quote) })) };
  if (!alignmentValid || taskAlignment.status === 'insufficient') gaps.push('本次 Writer 的写作要求尚未完整核对。');
  const issues = taskAlignment.status === 'unmet' || commentIds.length > 0 || assessments.some((row) => row.status === 'issues');
  if (assessments.some((row) => row.status === 'issues') && !commentIds.length) gaps.push('报告指出问题但没有生成可处理的锚定意见。');
  return { ...report, coldResolutions: resolutions.map(row => ({ filePath: String(row.filePath), quote: String(row.quote), decision: String(row.decision), reason: String(row.reason) })), status: gaps.length || assessments.some((row) => row.status === 'insufficient') ? 'incomplete' : issues ? 'findings' : 'clear', completedAt: now(), summary: String(parsed.summary ?? '未提供整体判断。'), gaps: [...new Set(gaps)], chapterReadings, taskAlignment, assessments, commentIds, unanchored };
}

export function reviewIsStale(report: ReviewReport, hashes: Record<string, string>) {
  return report.sources.some((source) => hashes[source.filePath] !== source.hash);
}

/** Multiple changed files are covered in ordered windows rather than N duplicate reviews. */
export function automaticReviewTargets(files: string[], changed: string[], sequence: boolean) {
  const ordered = [...files].sort(compareNaturalPath);
  const affected = ordered.filter((file) => changed.includes(file));
  if (affected.length <= 1) return affected.map((filePath) => ({ filePath, scope: sequence ? 'sequence' as const : 'chapter' as const }));
  const result: Array<{ filePath: string; scope: 'sequence' }> = [];
  let remaining = [...affected];
  while (remaining.length) {
    const first = ordered.indexOf(remaining[0]);
    const inWindow = remaining.filter((file) => ordered.indexOf(file) < first + 5 && path.dirname(file) === path.dirname(remaining[0]));
    const last = inWindow.at(-1)!;
    result.push({ filePath: last, scope: 'sequence' });
    remaining = remaining.filter((file) => !inWindow.includes(file));
  }
  return result;
}

export function validateReviewQuotes(bundle: ReviewBundle, item: Record<string, unknown>) {
  const filePath = String(item.filePath ?? bundle.sources[0]?.filePath ?? '');
  const quote = String(item.quote ?? '');
  const source = bundle.sources.find((file) => file.filePath === filePath);
  if (!source || !quote || !source.content.includes(quote)) return { source, reason: '主引文不在已审正文中。' };
  if (source.content.slice(Number(item.start), Number(item.end)) !== quote && source.content.indexOf(quote) !== source.content.lastIndexOf(quote)) return { source, reason: '引文重复且偏移无法区分位置。' };
  const evidence = Array.isArray(item.evidenceQuotes) ? item.evidenceQuotes as Array<Record<string, unknown>> : [];
  if (evidence.some((row) => !String(row.quote ?? '').trim() || !bundle.sources.some((file) => file.filePath === row.filePath && file.content.includes(String(row.quote))))) return { source, reason: '辅助证据不在已审正文中。' };
  return { source, reason: '' };
}

/** Allow bounded historical corroboration only when it still matches the launch baseline. */
export async function addReviewReferences(project: ProjectService, bundle: ReviewBundle, parsed: Record<string, unknown>, startHashes: Record<string, string>) {
  const paths = new Set<string>();
  for (const row of [...(Array.isArray(parsed.assessments) ? parsed.assessments : []), ...(Array.isArray(parsed.comments) ? parsed.comments : []), ...(parsed.taskAlignment && typeof parsed.taskAlignment === 'object' ? [parsed.taskAlignment] : [])] as Array<Record<string, unknown>>) {
    if (typeof row.filePath === 'string') paths.add(row.filePath);
    for (const item of [...(Array.isArray(row.evidence) ? row.evidence : []), ...(Array.isArray(row.evidenceQuotes) ? row.evidenceQuotes : [])] as Array<Record<string, unknown>>) if (typeof item.filePath === 'string') paths.add(item.filePath);
  }
  for (const filePath of [...paths].slice(0, 12)) {
    if (bundle.sources.some((source) => source.filePath === filePath) || !startHashes[filePath]) continue;
    try {
      const file = await project.readFile(filePath);
      if (file.hash !== startHashes[filePath]) { bundle.gaps.push(`${filePath}在审阅期间发生变化，补充引用无法核实。`); continue; }
      if (bundle.characters + file.content.length > bundle.budget) { bundle.gaps.push(`${filePath}补充依据超过预算，未纳入完整快照。`); continue; }
      bundle.sources.push({ id: uid('review-reference'), filePath, content: file.content, hash: file.hash, editorVersion: 0, createdAt: now(), referenceOnly: true });
      bundle.characters += file.content.length;
    } catch { bundle.gaps.push(`${filePath}补充依据无法读取。`); }
  }
}

export function writerReviewOutcome(writerId: string, changedFiles: string[], reports: ReviewReport[]) {
  const checked = new Set(reports.filter((report) => report.sourceWriterTaskId === writerId && report.protocolVersion === 4 && Boolean(report.coldReading) && !report.stale && report.status === 'clear' && report.taskAlignment?.status === 'met').flatMap((report) => report.sources.filter((source) => !source.referenceOnly).map((source) => source.filePath)));
  const missing = changedFiles.filter((file) => !checked.has(file));
  return { complete: changedFiles.length > 0 && missing.length === 0, missing };
}
