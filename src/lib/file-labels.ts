import type { ProjectFile } from '../shared/types';

const CHARACTER_LABELS: Partial<Record<ProjectFile['category'], string>> = {
  manuscript: '本章',
  planning: '本规划',
  research: '本资料',
  canon: '本设定',
  decision: '本决定'
};

export function fileCharacterLabel(category?: ProjectFile['category']) {
  return category ? CHARACTER_LABELS[category] || '当前文件' : '当前文件';
}
