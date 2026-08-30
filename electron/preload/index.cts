import { contextBridge, ipcRenderer } from 'electron';
import type { AgentEvent, WorkbenchApi } from '../../src/shared/types.js';

const invoke = <T,>(name: keyof WorkbenchApi, ...args: unknown[]) => ipcRenderer.invoke(`workbench:${String(name)}`, ...args) as Promise<T>;
const api: WorkbenchApi = {
  platform: process.platform,
  chooseProject: () => invoke('chooseProject'),
  createProject: (input) => invoke('createProject', input),
  openProject: (root) => invoke('openProject', root),
  addWork: (title) => invoke('addWork', title),
  activateWork: (workId) => invoke('activateWork', workId),
  refreshProject: () => invoke('refreshProject'),
  readFile: (path) => invoke('readFile', path),
  searchProject: (query) => invoke('searchProject', query),
  writeFile: (input) => invoke('writeFile', input),
  moveFile: (input) => invoke('moveFile', input),
  repositoryInfo: () => invoke('repositoryInfo'),
  updateGitPolicy: (policy) => invoke('updateGitPolicy', policy),
  revealProjectFolder: () => invoke('revealProjectFolder'),
  copyText: (text) => invoke('copyText', text),
  analyzeTrash: (input) => invoke('analyzeTrash', input),
  trashProjectItem: (input) => invoke('trashProjectItem', input),
  listTrash: () => invoke('listTrash'),
  restoreTrash: (id) => invoke('restoreTrash', id),
  trashCurrentProject: (input) => invoke('trashCurrentProject', input),
  createRecovery: (input) => invoke('createRecovery', input),
  listRecovery: (path) => invoke('listRecovery', path),
  restoreRecovery: (id) => invoke('restoreRecovery', id),
  appendEvent: (type, payload, source) => invoke('appendEvent', type, payload, source),
  gitStatus: () => invoke('gitStatus'),
  gitDiff: (path, staged) => invoke('gitDiff', path, staged),
  gitFileVersions: (path) => invoke('gitFileVersions', path),
  gitCommit: (input) => invoke('gitCommit', input),
  listAgents: () => invoke('listAgents'),
  runAgent: (input) => invoke('runAgent', input),
  runObserver: (input) => invoke('runObserver', input),
  cancelAgent: (id) => invoke('cancelAgent', id),
  stopAllAgents: () => invoke('stopAllAgents'),
  sendAgentMessage: (id, message) => invoke('sendAgentMessage', id, message),
  createContextPack: (input) => invoke('createContextPack', input),
  observerSession: (action) => invoke('observerSession', action),
  relocateComments: (input) => invoke('relocateComments', input),
  commentFeedback: (input) => invoke('commentFeedback', input),
  analyzeCanonImpact: (input) => invoke('analyzeCanonImpact', input),
  updateTask: (input) => invoke('updateTask', input),
  updateGoal: (input) => invoke('updateGoal', input),
  decideProposal: (input) => invoke('decideProposal', input),
  getAuthorProfile: () => invoke('getAuthorProfile'),
  upsertStyleRule: (input) => invoke('upsertStyleRule', input),
  deleteStyleRule: (id) => invoke('deleteStyleRule', id),
  exportAuthorProfile: () => invoke('exportAuthorProfile'),
  importAuthorProfile: () => invoke('importAuthorProfile'),
  getSettings: () => invoke('getSettings'),
  updateSettings: (input) => invoke('updateSettings', input),
  getRecentProject: () => invoke('getRecentProject'),
  updateBufferState: (input) => invoke('updateBufferState', input),
  onAgentEvent: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: AgentEvent) => listener(payload);
    ipcRenderer.on('workbench:agent-event', handler);
    return () => ipcRenderer.off('workbench:agent-event', handler);
  },
  onExternalFileChange: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: { path: string; hash: string; content: string }) => listener(payload);
    ipcRenderer.on('workbench:external-file-change', handler);
    return () => ipcRenderer.off('workbench:external-file-change', handler);
  },
  onProjectChange: (listener) => {
    const handler = () => listener();
    ipcRenderer.on('workbench:project-change', handler);
    return () => ipcRenderer.off('workbench:project-change', handler);
  }
};

contextBridge.exposeInMainWorld('workbench', api);
