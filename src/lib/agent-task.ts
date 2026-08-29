import type { AgentRole, CreativeTask } from '../shared/types';

export function currentTaskForAgent(tasks: CreativeTask[], role: AgentRole, objective: string) {
  const title = objective.trim();
  return tasks.find((task) => task.status === 'now' && task.title.trim() === title && (task.assignee === role || (role === 'writer' && task.kind === 'writing')));
}
