import { describe, expect, it } from 'vitest';
import { createBrowserWorkbench } from '../src/browser-workbench.js';

describe('browser UI preview', () => {
  it('provides a complete in-memory bridge instead of rendering a black screen', async () => {
    const api = createBrowserWorkbench();
    expect(String(api.platform)).toBe('browser');
    const recent = await api.getRecentProject();
    const project = await api.openProject(recent!);
    expect(project.manifest.title).toBe('雾城来信');
    expect(project.comments.some((item) => item.severity === 'blocking')).toBe(true);
    expect((await api.readFile('manuscript/第一章.md')).content).toContain('雨夜来信');
    expect((await api.listAgents()).every((item) => !item.available)).toBe(true);
  });

  it('keeps demo edits in memory and supports navigation-facing state updates', async () => {
    const api = createBrowserWorkbench();
    const before = await api.readFile('manuscript/第一章.md');
    await api.writeFile({ path: before.path, content: `${before.content}\n演示修改`, expectedHash: before.hash });
    expect((await api.readFile(before.path)).content).toContain('演示修改');
    const updated = await api.updateTask({ id: 'task-now', status: 'completed' });
    expect(updated.status).toBe('completed');
    expect((await api.refreshProject()).continueCard.next.every((item) => item.id !== 'task-now')).toBe(true);
  });
});
