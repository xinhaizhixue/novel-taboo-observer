import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { cliCandidates, cliEnvironment } from '../electron/main/agents/discovery.js';
import { ClaudeAdapter } from '../electron/main/agents/claude.js';
import { SettingsStore } from '../electron/main/settings.js';
const roots: string[] = [];
afterEach(async () => { vi.unstubAllEnvs(); await Promise.all(roots.splice(0).map(r => rm(r,{recursive:true,force:true}))); });
it('Finder PATH 下发现 NVM CLI，运行时仍能解析同目录 Node，设置重载保持 Observer 选择', async () => {
  const home=await mkdtemp(path.join(os.tmpdir(),'cli-discovery-')); roots.push(home);
  const bin=path.join(home,'.nvm/versions/node/v22.0.0/bin'); await mkdir(bin,{recursive:true});
  const cli=path.join(bin,'claude');
  await writeFile(cli,'#!/bin/sh\nif [ "$1" = "--version" ]; then echo "claude test"; else echo \'{"loggedIn":true}\'; fi\n',{mode:0o755});
  vi.stubEnv('HOME',home);vi.stubEnv('NVM_DIR',path.join(home,'.nvm'));vi.stubEnv('PATH','/usr/bin:/bin');
  expect(await cliCandidates('claude','claude')).toContain(cli);
  const adapter=new ClaudeAdapter();expect(await adapter.info()).toMatchObject({available:true,authenticated:true,command:cli});
  expect(cliEnvironment(cli).PATH?.split(path.delimiter)[0]).toBe(bin);
  const store=new SettingsStore(home); const before=await store.get();
  await store.update({observer:{...before.observer,adapter:'claude'}});
  expect((await new SettingsStore(home).get()).observer.adapter).toBe('claude');
  expect((await store.get()).autosave).toEqual(before.autosave);
});
it('自定义路径优先，NVM 版本按数字排序而非字典排序', async () => {
 const home=await mkdtemp(path.join(os.tmpdir(),'cli-order-'));roots.push(home);
 for(const version of ['v9.0.0','v22.1.0'])await mkdir(path.join(home,'.nvm/versions/node',version,'bin'),{recursive:true});
 const candidates=await cliCandidates('/custom/claude','claude',{HOME:home,PATH:'/bin'});
 expect(candidates[0]).toBe('/custom/claude');expect(candidates.findIndex(s=>s.includes('v22.1.0'))).toBeLessThan(candidates.findIndex(s=>s.includes('v9.0.0')));
});
