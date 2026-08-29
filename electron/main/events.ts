import { appendFile, mkdir, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { DATA_VERSION } from '../../src/shared/constants.js';
import type { EventSource, JsonValue, NovelEvent } from '../../src/shared/types.js';
import { now, uid } from './utils.js';

export class EventStore {
  private warnings: string[] = [];
  constructor(private readonly root: string, readonly sessionId: string) {}

  get diagnostics() { return [...this.warnings]; }

  async append(type: string, payload: JsonValue, source: EventSource = 'system') {
    const event: NovelEvent = { schemaVersion: DATA_VERSION, id: uid('evt'), type, createdAt: now(), sessionId: this.sessionId, source, payload };
    const month = event.createdAt.slice(0, 7);
    const directory = path.join(this.root, '.novel', 'events', month);
    await mkdir(directory, { recursive: true });
    await appendFile(path.join(directory, `session-${this.sessionId}.jsonl`), `${JSON.stringify(event)}\n`, 'utf8');
    return event;
  }

  async all() {
    const base = path.join(this.root, '.novel', 'events');
    const events: NovelEvent[] = [];
    this.warnings = [];
    let months: string[] = [];
    try { months = await readdir(base); } catch { return events; }
    for (const month of months.sort()) {
      const directory = path.join(base, month);
      let files: string[] = [];
      try { files = await readdir(directory); } catch { continue; }
      for (const file of files.filter((item) => item.endsWith('.jsonl')).sort()) {
        const lines = (await readFile(path.join(directory, file), 'utf8')).split('\n').filter(Boolean);
        for (const [index, line] of lines.entries()) {
          try {
            const event = JSON.parse(line) as NovelEvent;
            if (!event.id || !event.type || !event.createdAt || typeof event.schemaVersion !== 'number') throw new Error('缺少必要字段');
            if (event.schemaVersion > DATA_VERSION) {
              this.warnings.push(`${month}/${file}:${index + 1} 使用了更高的数据版本 ${event.schemaVersion}，已跳过`);
              continue;
            }
            events.push(event);
          } catch (error) {
            this.warnings.push(`${month}/${file}:${index + 1} 无法读取（${error instanceof Error ? error.message : '格式损坏'}），已保留原文件并跳过该行`);
          }
        }
      }
    }
    return events.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}
