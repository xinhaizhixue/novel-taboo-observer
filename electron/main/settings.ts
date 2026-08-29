import path from 'node:path';
import { DEFAULT_SETTINGS } from '../../src/shared/constants.js';
import type { Settings } from '../../src/shared/types.js';
import { mergeDeep, readJson, writeJson } from './utils.js';

export class SettingsStore {
  private readonly target: string;
  constructor(appData: string) { this.target = path.join(appData, 'settings.json'); }

  async get(): Promise<Settings> {
    return mergeDeep(DEFAULT_SETTINGS, await readJson<Partial<Settings>>(this.target, {}));
  }

  async update(patch: Partial<Settings>) {
    const next = mergeDeep(await this.get(), patch);
    await writeJson(this.target, next);
    return next;
  }
}
