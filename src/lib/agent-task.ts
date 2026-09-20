import type { AgentRole, CreativeTask } from '../shared/types';

function roleMatches(task: CreativeTask, role: AgentRole) {
  return task.assignee === role || (role === 'writer' && task.kind === 'writing');
}

export function currentTaskForAgent(tasks: CreativeTask[], role: AgentRole, objective: string) {
  const title = objective.trim().split(/\r?\n/, 1)[0].trim();
  return tasks.find((task) => task.status === 'now' && task.title.trim() === title && roleMatches(task, role));
}

export function taskObjectiveForAgent(tasks: CreativeTask[], role: AgentRole, objective: string) {
  const draft = objective.trim();
  const task = currentTaskForAgent(tasks, role, draft);
  if (!task) return draft;
  const title = task.title.trim();
  const details = task.description.trim();
  const description = details.split(/\r?\n/, 1)[0] === title ? details.slice(title.length).trim() : details;
  if (!description || draft.includes(description)) return draft;
  const addition = draft.slice(title.length).trim();
  return [title, description, addition].filter(Boolean).join('\n\n');
}

function pathStem(filePath: string) {
  const name = filePath.split('/').pop() || filePath;
  return name.replace(/\.(?:md|markdown|txt)$/i, '');
}

function taskNamesFile(title: string, stem: string) {
  if (title.includes(stem)) return true;
  const chapter = stem.match(/^第0*(\d+)章(?:[-_.]|$)/u);
  const range = title.match(/^(?:续写|完成|修订|重写)?\s*第\s*(\d+)\s*[—–\-~～至到]\s*第?\s*(\d+)\s*章/u);
  if (!chapter || !range) return false;
  const number = Number(chapter[1]);
  return number >= Math.min(Number(range[1]), Number(range[2])) && number <= Math.max(Number(range[1]), Number(range[2]));
}

/**
 * Keep the Agent composer aligned with the file the author is actually viewing.
 * A global continue-card focus can point at the next chapter while Writer is still
 * scoped to the current buffer, so only reuse a task title when it names that file.
 */
export function suggestedObjectiveForAgent(tasks: CreativeTask[], continueFocus: string, role: AgentRole, filePath?: string) {
  if (!filePath) return continueFocus.trim() || '诊断下一步创作任务';
  const stem = pathStem(filePath);
  const matchingTask = tasks.find((task) => task.status === 'now' && roleMatches(task, role) && taskNamesFile(task.title, stem) && task.links.includes(filePath));
  if (matchingTask) return matchingTask.title;
  if (filePath.startsWith('manuscript/')) return `继续完善${stem}`;
  if (filePath.startsWith('research/')) return `继续整理${stem}`;
  if (filePath.startsWith('planning/')) return `检查并完善${stem}`;
  if (filePath.startsWith('canon/')) return `核查${stem}与当前正文的一致性`;
  if (filePath.startsWith('decisions/')) return `复核${stem}及其后续影响`;
  return continueFocus.trim() || `处理${stem}`;
}
