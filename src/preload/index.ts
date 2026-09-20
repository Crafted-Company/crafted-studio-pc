import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC_CHANNELS,
  ICcraftedAPI,
  AppSettings,
  WindowState,
  CreateProjectInput,
  ImportProjectInput,
  ExplorerScanOptions,
  CreateMessageInput,
  TabItem,
  AISettings,
  StreamStartPayload,
  StreamTokenPayload,
  StreamEndPayload,
  ModelProfile,
  AgentDefinition,
} from '../shared/types';

const api: ICcraftedAPI = {
  getBootstrapState: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_BOOTSTRAP_STATE),
  minimizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
  maximizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE),
  restoreWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_RESTORE),
  closeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
  getWindowState: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_GET_STATE),
  saveLayoutState: (state: Partial<WindowState>) => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SAVE_LAYOUT, state),
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  setSetting: (key: keyof AppSettings, value: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, key, value),

  createProject: (input: CreateProjectInput) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_CREATE, input),
  openProject: (projectPath?: string) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_OPEN, projectPath),
  importProject: (input: ImportProjectInput) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_IMPORT, input),
  switchProject: (projectId: string) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_SWITCH, projectId),
  getActiveProject: () => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_GET_ACTIVE),
  getRecentProjects: () => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_LIST_RECENT),
  deleteProject: (projectId: string) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_DELETE, projectId),
  updateProjectWorkflow: (projectId: string, update: { currentStage?: string; completedChecklistItems?: string[] }) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROJECT_UPDATE_WORKFLOW, projectId, update),
  openProjectFolder: (folderPath: string) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_OPEN_FOLDER, folderPath),
  selectFolder: () => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_SELECT_FOLDER),

  scanExplorerTree: (projectPath: string, options?: ExplorerScanOptions) =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPLORER_SCAN, projectPath, options),
  getExpandedPaths: (projectId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPLORER_GET_EXPANDED, projectId),
  saveExpandedPaths: (projectId: string, expandedPaths: string[]) =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPLORER_SAVE_EXPANDED, projectId, expandedPaths),

  getConversation: (projectId: string) => ipcRenderer.invoke(IPC_CHANNELS.CHAT_GET_CONVERSATION, projectId),
  getMessages: (conversationId: string) => ipcRenderer.invoke(IPC_CHANNELS.CHAT_GET_MESSAGES, conversationId),
  sendMessage: (input: CreateMessageInput) => ipcRenderer.invoke(IPC_CHANNELS.CHAT_SEND_MESSAGE, input),
  cancelGeneration: (conversationId: string) => ipcRenderer.invoke(IPC_CHANNELS.CHAT_CANCEL_GENERATION, conversationId),
  clearConversation: (projectId: string) => ipcRenderer.invoke(IPC_CHANNELS.CHAT_CLEAR_CONVERSATION, projectId),

  readFileText: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_READ_TEXT, filePath),
  writeFileText: (filePath: string, content: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_WRITE_TEXT, filePath, content),
  getFileStats: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_GET_STATS, filePath),
  readFileDataUrl: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_READ_DATA_URL, filePath),
  createFile: (filePath: string, content?: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_CREATE, filePath, content),
  createFolder: (folderPath: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_CREATE_DIR, folderPath),
  renamePath: (oldPath: string, newPath: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_RENAME, oldPath, newPath),
  trashItem: (targetPath: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_TRASH, targetPath),
  duplicatePath: (targetPath: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_DUPLICATE, targetPath),

  getWorkbenchSession: (projectId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKBENCH_GET_SESSION, projectId),
  saveWorkbenchSession: (projectId: string, activeTabPath: string | null, tabs: TabItem[]) =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKBENCH_SAVE_SESSION, projectId, activeTabPath, tabs),

  getAISettings: () => ipcRenderer.invoke(IPC_CHANNELS.AI_GET_SETTINGS),
  saveAISettings: (settings: Partial<AISettings>) =>
    ipcRenderer.invoke(IPC_CHANNELS.AI_SAVE_SETTINGS, settings),
  getAIStatuses: () => ipcRenderer.invoke(IPC_CHANNELS.AI_GET_STATUSES),
  listAIModels: (providerId: string) => ipcRenderer.invoke(IPC_CHANNELS.AI_LIST_MODELS, providerId),
  testAIConnection: (providerId: string, baseUrl?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.AI_TEST_CONNECTION, providerId, baseUrl),
  getAISecurityStatus: () => ipcRenderer.invoke(IPC_CHANNELS.AI_GET_SECURITY_STATUS),
  saveAIProviderKey: (providerId: string, apiKey: string, mode?: 'safeStorage' | 'sessionOnly' | 'unencryptedOptIn') =>
    ipcRenderer.invoke(IPC_CHANNELS.AI_SAVE_PROVIDER_KEY, providerId, apiKey, mode),
  getAIProviderKey: (providerId: string) => ipcRenderer.invoke(IPC_CHANNELS.AI_GET_PROVIDER_KEY, providerId),

  getModelProfiles: () => ipcRenderer.invoke(IPC_CHANNELS.MODEL_PROFILES_GET_ALL),
  saveModelProfile: (profile: Partial<ModelProfile>) =>
    ipcRenderer.invoke(IPC_CHANNELS.MODEL_PROFILES_SAVE, profile),
  deleteModelProfile: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.MODEL_PROFILES_DELETE, id),

  getAgents: () => ipcRenderer.invoke(IPC_CHANNELS.AGENTS_GET_ALL),
  saveAgent: (agent: Partial<AgentDefinition>) => ipcRenderer.invoke(IPC_CHANNELS.AGENTS_SAVE, agent),
  deleteAgent: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.AGENTS_DELETE, id),

  terminalCreate: (options) => ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_CREATE, options),
  terminalData: (id, data) => ipcRenderer.send(IPC_CHANNELS.TERMINAL_DATA, id, data),
  terminalResize: (id, cols, rows) => ipcRenderer.send(IPC_CHANNELS.TERMINAL_RESIZE, id, cols, rows),
  terminalClose: (id) => ipcRenderer.send(IPC_CHANNELS.TERMINAL_CLOSE, id),

  onTerminalData: (id, callback) => {
    const channel = `terminal:data:${id}`;
    const listener = (_event: any, data: string) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  onTerminalExit: (id, callback) => {
    const channel = `terminal:close:${id}`;
    const listener = (_event: any, code: number) => callback(code);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },

  detectProjectConfig: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.DETECT_PROJECT_CONFIG, projectPath),
  saveProjectConfig: (projectPath: string, config: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_PROJECT_CONFIG, projectPath, config),
  getGitInfo: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_GIT_INFO, projectPath),
  setGitRemote: (projectPath: string, repoUrl: string) => ipcRenderer.invoke(IPC_CHANNELS.SET_GIT_REMOTE, projectPath, repoUrl),
  getGitNextCommitMsg: (projectPath: string, userMsg?: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_GIT_NEXT_COMMIT_MSG, projectPath, userMsg),

  getToolDockItems: () => ipcRenderer.invoke(IPC_CHANNELS.TOOL_DOCK_GET_ITEMS),
  addToolDockItem: (input) => ipcRenderer.invoke(IPC_CHANNELS.TOOL_DOCK_ADD_ITEM, input),
  updateToolDockItem: (id, update) => ipcRenderer.invoke(IPC_CHANNELS.TOOL_DOCK_UPDATE_ITEM, id, update),
  deleteToolDockItem: (id) => ipcRenderer.invoke(IPC_CHANNELS.TOOL_DOCK_DELETE_ITEM, id),
  reorderToolDockItems: (orderedIds) => ipcRenderer.invoke(IPC_CHANNELS.TOOL_DOCK_REORDER_ITEMS, orderedIds),
  launchTool: (target, type, name) => ipcRenderer.invoke(IPC_CHANNELS.TOOL_DOCK_LAUNCH_TOOL, target, type, name),
  selectExecutableFile: () => ipcRenderer.invoke(IPC_CHANNELS.TOOL_DOCK_SELECT_EXECUTABLE),
  openExternalUrl: (url) => ipcRenderer.invoke(IPC_CHANNELS.TOOL_DOCK_OPEN_EXTERNAL_URL, url),
  getDiscoveredApps: () => ipcRenderer.invoke(IPC_CHANNELS.TOOL_DOCK_GET_DISCOVERED_APPS),

  arrangeWorkspace: () => ipcRenderer.invoke(IPC_CHANNELS.TOOL_DOCK_ARRANGE_WORKSPACE),

  executeTool: (request, permissionDecision) => ipcRenderer.invoke(IPC_CHANNELS.TOOL_EXECUTE, request, permissionDecision),
  getToolDefinitions: () => ipcRenderer.invoke(IPC_CHANNELS.TOOL_GET_DEFINITIONS),

  onStreamStart: (callback: (payload: StreamStartPayload) => void) => {
    const listener = (_event: any, payload: StreamStartPayload) => callback(payload);
    ipcRenderer.on(IPC_CHANNELS.CHAT_STREAM_START, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.CHAT_STREAM_START, listener);
  },

  onStreamToken: (callback: (payload: StreamTokenPayload) => void) => {
    const listener = (_event: any, payload: StreamTokenPayload) => callback(payload);
    ipcRenderer.on(IPC_CHANNELS.CHAT_STREAM_TOKEN, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.CHAT_STREAM_TOKEN, listener);
  },

  onStreamEnd: (callback: (payload: StreamEndPayload) => void) => {
    const listener = (_event: any, payload: StreamEndPayload) => callback(payload);
    ipcRenderer.on(IPC_CHANNELS.CHAT_STREAM_END, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.CHAT_STREAM_END, listener);
  },

  onWindowMaximizedChange: (callback: (isMaximized: boolean) => void) => {
    const listener = (_event: any, isMaximized: boolean) => callback(isMaximized);
    ipcRenderer.on('window:maximized-change', listener);
    return () => ipcRenderer.removeListener('window:maximized-change', listener);
  },

  onAgentStateSync: (callback) => {
    const listener = (_event: any, state: any) => callback(state);
    ipcRenderer.on('agent:stateSync', listener);
    return () => ipcRenderer.removeListener('agent:stateSync', listener);
  },
  getAgentRuntimeState: () => ipcRenderer.invoke('agent:getState'),
  respondToToolApproval: (callId, decision) => ipcRenderer.invoke('agent:respondApproval', callId, decision),
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('craftedAPI', api);
  } catch (error) {
    console.error('[Preload] Failed to expose craftedAPI:', error);
  }
} else {
  // @ts-ignore
  window.craftedAPI = api;
}
