import type { AgentRole, CreativeTask } from '../shared/types';

function roleMatches(task: CreativeTask, role: AgentRole) {
  return task.assignee === role || (role === 'writer' && task.kind === 'writing');
}

export function currentTaskForAgent(tasks: CreativeTask[], role: AgentRole, objective: string) {
  const title = objective.trim();
  return tasks.find((task) => task.status === 'now' && task.title.trim() === title && roleMatches(task, role));
}

function pathStem(filePath: string) {
  const name = filePath.split('/').pop() || filePath;
  return name.replace(/\.(?:md|markdown|txt)$/i, '');
}

/**
 * Keep the Agent composer aligned with the file the author is actually viewing.
 * A global continue-card focus can point at the next chapter while Writer is still
 * scoped to the current buffer, so only reuse a task title when it names that file.
 */
export function suggestedObjectiveForAgent(tasks: CreativeTask[], continueFocus: string, role: AgentRole, filePath?: string) {
  if (!filePath) return continueFocus.trim() || '诊断下一步创作任务';
  const stem = pathStem(filePath);
  const matchingTask = tasks.find((task) => task.status === 'now' && roleMatches(task, role) && task.title.includes(stem) && task.links.includes(filePath));
  if (matchingTask) return matchingTask.title;
  if (filePath.startsWith('manuscript/')) return `继续完善${stem}`;
  if (filePath.startsWith('research/')) return `继续整理${stem}`;
  if (filePath.startsWith('planning/')) return `检查并完善${stem}`;
  if (filePath.startsWith('canon/')) return `核查${stem}与当前正文的一致性`;
  if (filePath.startsWith('decisions/')) return `复核${stem}及其后续影响`;
  return continueFocus.trim() || `处理${stem}`;
}
