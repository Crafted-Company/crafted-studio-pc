export interface WorkspacePanelDefinition {
  id: string;
  title: string;
  minSize: number; // in pixels
  defaultSize: number; // relative proportion e.g. 0.25
}

export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
  panelVisibility?: Record<string, boolean>;
  panelOrder?: string[];
  panelProportions?: Record<string, number>;
  focusModePanel?: string | null;
  leftSidebarWidth?: number;
  rightSidebarWidth?: number;
  leftCollapsed?: boolean;
  rightCollapsed?: boolean;
  centerSplitRatio?: number;
  chatCollapsed?: boolean;
  workbenchCollapsed?: boolean;
  bottomPanelHeight?: number;
  bottomPanelCollapsed?: boolean;
  bottomPanelActiveTab?: 'terminal' | 'problems' | 'output';
}

export interface AppSettings {
  theme: 'dark';
  logoPath?: string;
  appName: string;
  version: string;
  activeProjectId?: string;
}

export interface ProviderConfigData {
  providerId: string;
  name: string;
  isEnabled: boolean;
  baseUrl?: string;
  apiKey?: string;
  activeModelId?: string;
  unencryptedOptIn?: boolean;
  [key: string]: unknown;
}

export interface AISettings {
  activeProviderId: string;
  ollamaBaseUrl: string;
  ollamaActiveModel: string;
  enabledProviders: string[];
  providersConfig: Record<string, ProviderConfigData>;
  keyStorageMode?: 'safeStorage' | 'sessionOnly' | 'unencryptedOptIn';
  defaultProfileId?: string;
  activeAgentId?: string;
}

export interface ModelProfile {
  id: string;
  name: string;
  providerId: string;
  modelId: string;
  temperature: number;
  maxTokens?: number;
  systemPrompt?: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  systemPrompt: string;
  profileId: string;
  isPreset: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectConfig {
  name: string;
  createdAt: string;
  updatedAt: string;
  template: string;
  version: string;
  projectType?: string;
  description?: string;
  blueprintId?: string;
  selectedModules?: string[];
  currentStage?: string;
  completedChecklistItems?: string[];
}

export interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  template: string;
  version: string;
  projectType?: string;
  description?: string;
  blueprintId: string;
  selectedModules: string[];
  currentStage: string;
  completedChecklistItems: string[];
  completionPercentage: number;
  isMissing?: boolean;
}

export interface ImportProposal {
  isImportRequired: true;
  projectPath: string;
  folderName: string;
  detectedType: string;
}

export type OpenProjectResult = Project | ImportProposal;

export interface RecentProject {
  id: string;
  projectId: string;
  name: string;
  path: string;
  lastOpenedAt: string;
}

export interface CreateProjectInput {
  name: string;
  parentPath: string;
  template?: string;
  description?: string;
  blueprintId?: string;
  selectedModules?: string[];
  currentStage?: string;
}

export interface ImportProjectInput {
  projectPath: string;
  name?: string;
  template?: string;
  description?: string;
  blueprintId?: string;
  selectedModules?: string[];
}

export interface TreeNodeMetadata {
  gitStatus?: 'modified' | 'added' | 'deleted' | 'untracked' | 'ignored';
  isAiContext?: boolean;
  isMemoryFile?: boolean;
  badge?: string;
  sizeBytes?: number;
  updatedAt?: string;
  [key: string]: unknown;
}

export type TreeNodeType = 'file' | 'directory';

export interface TreeNode {
  id: string;
  name: string;
  path: string;
  type: TreeNodeType;
  extension?: string;
  children?: TreeNode[];
  depth: number;
  parentId?: string | null;
  metadata?: TreeNodeMetadata;
}

export interface ExplorerScanOptions {
  maxDepth?: number;
  ignoreGlobs?: string[];
}

export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageStatus = 'sending' | 'sent' | 'error';

export interface MessageMetadata {
  model?: string;
  provider?: string;
  tokensUsage?: { prompt: number; completion: number; total: number };
  thinking?: string;
  toolCalls?: unknown[];
  citations?: string[];
  attachments?: string[];
  error?: string;
  agentId?: string;
  agentName?: string;
  profileId?: string;
  profileName?: string;
  [key: string]: unknown;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  createdAt: string;
  metadata?: MessageMetadata;
}

export interface Conversation {
  id: string;
  projectId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}

export interface CreateMessageInput {
  projectId: string;
  role: MessageRole;
  content: string;
  metadata?: MessageMetadata;
}

export type EditorType = 'monaco' | 'text-viewer' | 'image-viewer' | 'unknown';

export interface EditorDefinition {
  id: EditorType;
  name: string;
  extensions: string[];
}

export interface TabStateMetadata {
  scrollTop?: number;
  cursorLine?: number;
  cursorColumn?: number;
  zoomLevel?: number;
  viewState?: unknown;
  updatedAtOnDisk?: string;
  [key: string]: unknown;
}

export interface TabItem {
  id: string;
  path: string;
  title: string;
  editorId: EditorType;
  extension: string;
  isDirty?: boolean;
  content?: string;
  originalContent?: string;
  stateMetadata?: TabStateMetadata;
}

export interface WorkbenchSession {
  projectId: string;
  activeTabPath: string | null;
  tabs: TabItem[];
}

export interface FileContentResult {
  path: string;
  content: string;
  sizeBytes: number;
  isBinary?: boolean;
}

export interface StreamStartPayload {
  conversationId: string;
  messageId: string;
  role: MessageRole;
  initialContent: string;
}

export interface StreamTokenPayload {
  conversationId: string;
  messageId: string;
  token: string;
  fullText: string;
}

export interface StreamEndPayload {
  conversationId: string;
  messageId: string;
  fullText: string;
}

export interface BootstrapState {
  isReady: boolean;
  appSettings: AppSettings;
  aiSettings: AISettings;
  activeProject: Project | null;
  recentProjects: RecentProject[];
  providerStatuses: unknown[];
  modelProfiles?: ModelProfile[];
  agents?: AgentDefinition[];
}

export interface TerminalSessionMeta {
  id: string;
  title: string;
  cwd: string;
}

export const IPC_CHANNELS = {
  APP_GET_BOOTSTRAP_STATE: 'app:get-bootstrap-state',
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_RESTORE: 'window:restore',
  WINDOW_CLOSE: 'window:close',
  WINDOW_GET_STATE: 'window:get-state',
  WINDOW_SAVE_LAYOUT: 'window:save-layout',

  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  PROJECT_CREATE: 'project:create',
  PROJECT_OPEN: 'project:open',
  PROJECT_IMPORT: 'project:import',
  PROJECT_SWITCH: 'project:switch',
  PROJECT_GET_ACTIVE: 'project:get-active',
  PROJECT_LIST_RECENT: 'project:list-recent',
  PROJECT_DELETE: 'project:delete',
  PROJECT_UPDATE_WORKFLOW: 'project:update-workflow',
  PROJECT_OPEN_FOLDER: 'project:open-folder',

  EXPLORER_SCAN: 'explorer:scan',
  EXPLORER_GET_EXPANDED: 'explorer:get-expanded',
  EXPLORER_SAVE_EXPANDED: 'explorer:save-expanded',

  CHAT_GET_CONVERSATION: 'chat:get-conversation',
  CHAT_GET_MESSAGES: 'chat:get-messages',
  CHAT_SEND_MESSAGE: 'chat:send-message',
  CHAT_CANCEL_GENERATION: 'chat:cancel-generation',
  CHAT_CLEAR_CONVERSATION: 'chat:clear-conversation',
  CHAT_STREAM_START: 'chat:stream-start',
  CHAT_STREAM_TOKEN: 'chat:stream-token',
  CHAT_STREAM_END: 'chat:stream-end',

  FILE_READ_TEXT: 'file:read-text',
  FILE_WRITE_TEXT: 'file:write-text',
  FILE_GET_STATS: 'file:get-stats',
  FILE_READ_DATA_URL: 'file:read-data-url',

  WORKBENCH_GET_SESSION: 'workbench:get-session',
  WORKBENCH_SAVE_SESSION: 'workbench:save-session',

  AI_GET_SETTINGS: 'ai:get-settings',
  AI_SAVE_SETTINGS: 'ai:save-settings',
  AI_GET_STATUSES: 'ai:get-statuses',
  AI_LIST_MODELS: 'ai:list-models',
  AI_TEST_CONNECTION: 'ai:test-connection',
  AI_GET_SECURITY_STATUS: 'ai:get-security-status',
  AI_SAVE_PROVIDER_KEY: 'ai:save-provider-key',
  AI_GET_PROVIDER_KEY: 'ai:get-provider-key',

  MODEL_PROFILES_GET_ALL: 'model-profiles:get-all',
  MODEL_PROFILES_SAVE: 'model-profiles:save',
  MODEL_PROFILES_DELETE: 'model-profiles:delete',

  AGENTS_GET_ALL: 'agents:get-all',
  AGENTS_SAVE: 'agents:save',
  AGENTS_DELETE: 'agents:delete',

  TERMINAL_CREATE: 'terminal:create',
  TERMINAL_DATA: 'terminal:data',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_CLOSE: 'terminal:close',

  DIALOG_SELECT_FOLDER: 'dialog:select-folder',

  DETECT_PROJECT_CONFIG: 'detect-project-config',
  SAVE_PROJECT_CONFIG: 'save-project-config',
  GET_GIT_INFO: 'get-git-info',
  SET_GIT_REMOTE: 'set-git-remote',
  GET_GIT_NEXT_COMMIT_MSG: 'get-git-next-commit-msg',

  TOOL_DOCK_GET_ITEMS: 'tool-dock:get-items',
  TOOL_DOCK_ADD_ITEM: 'tool-dock:add-item',
  TOOL_DOCK_UPDATE_ITEM: 'tool-dock:update-item',
  TOOL_DOCK_DELETE_ITEM: 'tool-dock:delete-item',
  TOOL_DOCK_REORDER_ITEMS: 'tool-dock:reorder-items',
  TOOL_DOCK_LAUNCH_TOOL: 'tool-dock:launch-tool',
  TOOL_DOCK_SELECT_EXECUTABLE: 'tool-dock:select-executable',
  TOOL_DOCK_OPEN_EXTERNAL_URL: 'tool-dock:open-external-url',
  TOOL_DOCK_GET_DISCOVERED_APPS: 'tool-dock:get-discovered-apps',
  TOOL_DOCK_ARRANGE_WORKSPACE: 'tool-dock:arrange-workspace',
  FILE_CREATE: 'file:create',
  FILE_CREATE_DIR: 'file:create-dir',
  FILE_RENAME: 'file:rename',
  FILE_TRASH: 'file:trash',
  FILE_DUPLICATE: 'file:duplicate',

  TOOL_EXECUTE: 'tool:execute',
  TOOL_GET_DEFINITIONS: 'tool:get-definitions',
} as const;

export * from './toolDock';

export interface ICcraftedAPI {
  getBootstrapState: () => Promise<BootstrapState>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  restoreWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  getWindowState: () => Promise<WindowState>;
  saveLayoutState: (state: Partial<WindowState>) => Promise<boolean>;
  getSettings: () => Promise<AppSettings>;
  setSetting: (key: keyof AppSettings, value: unknown) => Promise<boolean>;
  createProject: (input: CreateProjectInput) => Promise<Project>;
  openProject: (projectPath?: string) => Promise<OpenProjectResult>;
  importProject: (input: ImportProjectInput) => Promise<Project>;
  switchProject: (projectId: string) => Promise<Project | null>;
  getActiveProject: () => Promise<Project | null>;
  getRecentProjects: () => Promise<RecentProject[]>;
  deleteProject: (projectId: string) => Promise<boolean>;
  updateProjectWorkflow: (projectId: string, update: { currentStage?: string; completedChecklistItems?: string[] }) => Promise<Project | null>;
  openProjectFolder: (folderPath: string) => Promise<boolean>;
  selectFolder: () => Promise<string | null>;
  scanExplorerTree: (projectPath: string, options?: ExplorerScanOptions) => Promise<TreeNode | null>;
  getExpandedPaths: (projectId: string) => Promise<string[]>;
  saveExpandedPaths: (projectId: string, expandedPaths: string[]) => Promise<boolean>;
  getConversation: (projectId: string) => Promise<Conversation>;
  getMessages: (conversationId: string) => Promise<Message[]>;
  sendMessage: (input: CreateMessageInput) => Promise<Message>;
  cancelGeneration: (conversationId: string) => Promise<boolean>;
  clearConversation: (projectId: string) => Promise<boolean>;
  readFileText: (filePath: string) => Promise<FileContentResult>;
  writeFileText: (filePath: string, content: string) => Promise<boolean>;
  getFileStats: (filePath: string) => Promise<{ sizeBytes: number; updatedAt: string } | null>;
  readFileDataUrl: (filePath: string) => Promise<string>;
  createFile: (filePath: string, content?: string) => Promise<boolean>;
  createFolder: (folderPath: string) => Promise<boolean>;
  renamePath: (oldPath: string, newPath: string) => Promise<boolean>;
  trashItem: (targetPath: string) => Promise<boolean>;
  duplicatePath: (targetPath: string) => Promise<string | null>;
  getWorkbenchSession: (projectId: string) => Promise<WorkbenchSession>;
  saveWorkbenchSession: (projectId: string, activeTabPath: string | null, tabs: TabItem[]) => Promise<boolean>;
  getAISettings: () => Promise<AISettings>;
  saveAISettings: (settings: Partial<AISettings>) => Promise<boolean>;
  getAIStatuses: () => Promise<unknown[]>;
  listAIModels: (providerId: string) => Promise<unknown[]>;
  testAIConnection: (providerId: string, baseUrl?: string) => Promise<{ isAvailable: boolean; success: boolean; error?: string }>;
  getAISecurityStatus: () => Promise<{ isSafeStorageAvailable: boolean }>;
  saveAIProviderKey: (providerId: string, apiKey: string, mode?: 'safeStorage' | 'sessionOnly' | 'unencryptedOptIn') => Promise<boolean>;
  getAIProviderKey: (providerId: string) => Promise<string | null>;
  getModelProfiles: () => Promise<ModelProfile[]>;
  saveModelProfile: (profile: Partial<ModelProfile>) => Promise<ModelProfile>;
  deleteModelProfile: (id: string) => Promise<boolean>;
  getAgents: () => Promise<AgentDefinition[]>;
  saveAgent: (agent: Partial<AgentDefinition>) => Promise<AgentDefinition>;
  deleteAgent: (id: string) => Promise<boolean>;
  terminalCreate: (options: { id: string; cwd: string; shellPath?: string; cols?: number; rows?: number }) => Promise<boolean>;
  terminalData: (id: string, data: string) => void;
  terminalResize: (id: string, cols: number, rows: number) => void;
  terminalClose: (id: string) => void;
  onTerminalData: (id: string, callback: (data: string) => void) => () => void;
  onTerminalExit: (id: string, callback: (code: number) => void) => () => void;
  detectProjectConfig: (projectPath: string) => Promise<unknown>;
  saveProjectConfig: (projectPath: string, config: unknown) => Promise<boolean>;
  getGitInfo: (projectPath: string) => Promise<unknown>;
  setGitRemote: (projectPath: string, repoUrl: string) => Promise<boolean>;
  getGitNextCommitMsg: (projectPath: string, userMsg?: string) => Promise<string>;
  getToolDockItems: () => Promise<import('./toolDock').ToolDockItem[]>;
  addToolDockItem: (input: import('./toolDock').CreateToolInput) => Promise<import('./toolDock').ToolDockItem>;
  updateToolDockItem: (id: string, update: import('./toolDock').UpdateToolInput) => Promise<import('./toolDock').ToolDockItem | null>;
  deleteToolDockItem: (id: string) => Promise<boolean>;
  reorderToolDockItems: (orderedIds: string[]) => Promise<boolean>;
  launchTool: (target: string, type: import('./toolDock').ToolType, name?: string) => Promise<{ success: boolean; error?: string }>;
  selectExecutableFile: () => Promise<string | null>;
  openExternalUrl: (url: string) => Promise<boolean>;
  getDiscoveredApps: () => Promise<any[]>;
  arrangeWorkspace: () => Promise<boolean>;
  executeTool: (request: ToolCallRequest, permissionDecision?: PermissionDecision) => Promise<ToolExecutionResult>;
  getToolDefinitions: () => Promise<ToolDefinition[]>;
  onStreamStart: (callback: (payload: StreamStartPayload) => void) => () => void;
  onStreamToken: (callback: (payload: StreamTokenPayload) => void) => () => void;
  onStreamEnd: (callback: (payload: StreamEndPayload) => void) => () => void;
  onWindowMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void;
}

declare global {
  interface Window {
    craftedAPI: ICcraftedAPI;
  }
}

export type ToolRiskLevel = 'SAFE' | 'CONFIRMATION_REQUIRED';

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  riskLevel: ToolRiskLevel;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string; required?: boolean }>;
    required?: string[];
  };
}

export interface ToolCallRequest {
  toolId: string;
  arguments: Record<string, any>;
  callId?: string;
}

export interface ToolExecutionResult {
  callId?: string;
  toolId: string;
  success: boolean;
  output?: string;
  error?: string;
  durationMs: number;
}

export type PermissionDecision = 'ALLOW_ONCE' | 'ALLOW_ALWAYS' | 'DENY';

