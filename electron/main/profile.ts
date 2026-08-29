import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { AuthorProfile, AuthorStyleRule } from '../../src/shared/types.js';
import { exists, now, readJson, uid, writeJson } from './utils.js';

const PROFILE_VERSION = 1;

function fresh(): AuthorProfile {
  return { schemaVersion: PROFILE_VERSION, id: uid('author'), name: '我的作者档案', rules: [], updatedAt: now() };
}

function validate(value: AuthorProfile) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.rules)) throw new Error('作者档案格式无效');
  if (Number(value.schemaVersion) > PROFILE_VERSION) throw new Error(`作者档案版本 ${value.schemaVersion} 高于当前支持版本 ${PROFILE_VERSION}`);
  return value;
}

function uniqueEvidence(...groups: string[][]) {
  return [...new Set(groups.flat().map((item) => item.trim()).filter(Boolean))];
}

function consolidateExactDuplicates(profile: AuthorProfile) {
  const groups = new Map<string, AuthorStyleRule[]>();
  for (const rule of profile.rules) {
    const key = `${rule.category}\u0000${rule.text.trim()}`;
    groups.set(key, [...(groups.get(key) || []), rule]);
  }
  let changed = false;
  const rules: AuthorStyleRule[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      const [only] = group;
      const evidence = uniqueEvidence(only.evidence);
      const text = only.text.trim();
      changed ||= text !== only.text || evidence.length !== only.evidence.length;
      rules.push({ ...only, text, evidence });
      continue;
    }
    const authorStatuses = new Set(group.map((item) => item.status).filter((status) => status !== 'candidate'));
    if (authorStatuses.size > 1) {
      rules.push(...group);
      continue;
    }
    const chosen = group.find((item) => item.status !== 'candidate') || group[0];
    rules.push({
      ...chosen,
      text: chosen.text.trim(),
      evidence: uniqueEvidence(...group.map((item) => item.evidence)),
      updatedAt: group.map((item) => item.updatedAt).sort().at(-1) || chosen.updatedAt
    });
    changed = true;
  }
  return { profile: changed ? { ...profile, rules, updatedAt: now() } : { ...profile, rules }, changed };
}

export class AuthorProfileStore {
  private readonly target: string;
  constructor(appData: string) { this.target = path.join(appData, 'author-profile.json'); }

  async get() {
    if (!(await exists(this.target))) { const profile = fresh(); await writeJson(this.target, profile); return profile; }
    const normalized = consolidateExactDuplicates(validate(await readJson<AuthorProfile>(this.target)));
    if (normalized.changed) await writeJson(this.target, normalized.profile);
    return normalized.profile;
  }

  async upsert(input: Partial<AuthorStyleRule> & { id?: string }) {
    const profile = await this.get();
    const current = input.id ? profile.rules.find((item) => item.id === input.id) : profile.rules.find((item) => item.category === input.category && item.text === input.text?.trim());
    const mergeExisting = !input.id && Boolean(current);
    const timestamp = now();
    const rule: AuthorStyleRule = {
      id: input.id || current?.id || uid('style'), category: input.category ?? current?.category ?? 'preference', text: input.text?.trim() || current?.text || '',
      status: mergeExisting ? current!.status : input.status ?? current?.status ?? 'candidate',
      evidence: mergeExisting ? uniqueEvidence(current!.evidence, input.evidence || []) : uniqueEvidence(input.evidence ?? current?.evidence ?? []),
      createdAt: current?.createdAt ?? timestamp, updatedAt: timestamp
    };
    if (!rule.text) throw new Error('风格规则不能为空');
    const rules = profile.rules.filter((item) => item.id !== rule.id);
    rules.push(rule);
    const next = consolidateExactDuplicates({ ...profile, rules, updatedAt: timestamp }).profile;
    await writeJson(this.target, next);
    return next;
  }

  async remove(id: string) {
    const profile = await this.get();
    if (!profile.rules.some((item) => item.id === id)) throw new Error('风格规则不存在');
    const next = { ...profile, rules: profile.rules.filter((item) => item.id !== id), updatedAt: now() };
    await writeJson(this.target, next);
    return next;
  }

  async importFile(target: string) {
    const value = validate(JSON.parse(await readFile(target, 'utf8')) as AuthorProfile);
    const normalized = consolidateExactDuplicates({ ...value, schemaVersion: PROFILE_VERSION, updatedAt: now() }).profile;
    await writeJson(this.target, normalized);
    return normalized;
  }

  async importSnapshot(snapshot: string) {
    const value = consolidateExactDuplicates(validate(JSON.parse(snapshot) as AuthorProfile)).profile;
    if (!(await exists(this.target))) { await writeJson(this.target, value); return value; }
    const current = await this.get();
    if (!current.rules.length) { await writeJson(this.target, value); return value; }
    if (current.id !== value.id) return current;
    const rules = new Map(current.rules.map((item) => [item.id, item]));
    for (const item of value.rules) {
      const existing = rules.get(item.id);
      if (!existing || item.updatedAt > existing.updatedAt) rules.set(item.id, item);
    }
    const merged = consolidateExactDuplicates({ ...current, rules: [...rules.values()], updatedAt: now() }).profile;
    await writeJson(this.target, merged);
    return merged;
  }

  async exportFile(target: string) { const profile = await this.get(); await writeJson(target, profile); }
}
