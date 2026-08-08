import path from 'path';
import { ProjectService } from './ProjectService';
import { WorkbenchService } from './WorkbenchService';
import { FileService } from './FileService';
import { AgentService } from './AgentService';
import { ModelProfileService } from './ModelProfileService';
import { AIChatMessage } from '../ai/types';

export interface ContextBuildOptions {
  projectId: string;
  agentId?: string;
  userPrompt: string;
  selectedFilePaths?: string[];
  activeTabPath?: string;
  activeTabContent?: string;
  cursorLine?: number;
  cursorColumn?: number;
}

export interface BuiltContextResult {
  systemPrompt: string;
  assembledMessages: AIChatMessage[];
  contextSummary: {
    activeFile?: string;
    attachedFilesCount: number;
    memoryFilesCount: number;
  };
}

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp', 'tiff']);

export class ContextBuilderService {
  public static async buildPromptContext(options: ContextBuildOptions): Promise<BuiltContextResult> {
    const {
      projectId,
      agentId,
      userPrompt,
      selectedFilePaths = [],
      activeTabPath: explicitActivePath,
      activeTabContent: explicitActiveContent,
    } = options;

    // 1. Resolve Agent & Model Profile
    const targetAgentId = agentId || 'agent-architect';
    const agent = AgentService.getAgentById(targetAgentId) || AgentService.getDefaultAgent();
    const profile = agent
      ? ModelProfileService.getProfileById(agent.profileId)
      : ModelProfileService.getDefaultProfile();

    const baseSystemPrompt =
      agent?.systemPrompt || profile?.systemPrompt || 'You are an expert AI assistant in Crafted Studio.';

    // 2. Fetch Active Project Details
    const activeProject = await ProjectService.getActiveProject();
    let projectContextStr = '';
    let memoryFilesCount = 0;

    if (activeProject && activeProject.path) {
      projectContextStr += `\n\n[WORKSPACE PROJECT]\nActive Project Name: ${activeProject.name}\nRoot Path: ${activeProject.path}\nTemplate: ${activeProject.template}\nDevelopment Stage: ${activeProject.currentStage}\n`;

      // Check for project memory files (e.g. implementation_plan.md, requirements.md, README.md)
      const memoryCandidates = ['implementation_plan.md', 'requirements.md', 'README.md', 'MEMORY.md'];
      for (const fileName of memoryCandidates) {
        const fullPath = path.join(activeProject.path, fileName);
        try {
          const fileRes = await FileService.readFileText(fullPath);
          if (fileRes && fileRes.content) {
            memoryFilesCount++;
            const snippet = fileRes.content.length > 2500 ? fileRes.content.substring(0, 2500) + '\n...[truncated]' : fileRes.content;
            projectContextStr += `\n--- [PROJECT DOCUMENT: ${fileName}] ---\n${snippet}\n`;
          }
        } catch {}
      }
    }

    // 3. Resolve Active Editor File
    let activeFileStr = '';
    let activeFilePath: string | undefined = explicitActivePath;

    if (!activeFilePath && activeProject) {
      try {
        const session = await WorkbenchService.getSession(activeProject.id);
        if (session.activeTabPath) {
          activeFilePath = session.activeTabPath;
        }
      } catch {}
    }

    if (activeFilePath) {
      const normalizedPath = activeFilePath.replace(/\\/g, '/');
      const fileName = path.basename(normalizedPath);
      const ext = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : '';

      let snippet = explicitActiveContent;

      if (!snippet) {
        if (IMAGE_EXTENSIONS.has(ext)) {
          snippet = `[Binary Image Asset File: ${fileName}]`;
        } else {
          try {
            const res = await FileService.readFileText(activeFilePath);
            snippet = res.content;
          } catch {
            snippet = `[File: ${fileName}]`;
          }
        }
      }

      const formattedSnippet = snippet
        ? snippet.length > 4000
          ? snippet.substring(0, 4000) + '\n...[truncated]'
          : snippet
        : '[Empty file]';

      activeFileStr += `\n\n=========================================\n[CURRENTLY ACTIVE OPEN EDITOR TAB]\nFile Name: ${fileName}\nFull Absolute Path: ${normalizedPath}\nContent Preview:\n\`\`\`\n${formattedSnippet}\n\`\`\`\n=========================================\n\nCRITICAL DIRECTIVE: The user currently has "${fileName}" OPEN in their editor workspace tab. When the user asks what file is open, answer explicitly "${fileName}".\n`;
    } else {
      activeFileStr += `\n\n[CURRENTLY ACTIVE OPEN EDITOR TAB]\nNo file is currently open in the active editor tab.\n`;
    }

    // 4. Read Explicitly Attached / Selected Context Files
    let attachedFilesStr = '';
    let attachedFilesCount = 0;

    for (const filePath of selectedFilePaths) {
      const normPath = filePath.replace(/\\/g, '/');
      if (activeFilePath && normPath === activeFilePath.replace(/\\/g, '/')) continue; // avoid duplicate

      try {
        const fileRes = await FileService.readFileText(filePath);
        if (fileRes && fileRes.content) {
          attachedFilesCount++;
          const snippet = fileRes.content.length > 2000 ? fileRes.content.substring(0, 2000) + '\n...[truncated]' : fileRes.content;
          attachedFilesStr += `\n--- [ATTACHED CONTEXT FILE: ${path.basename(filePath)}] ---\nPath: ${filePath}\n\`\`\`\n${snippet}\n\`\`\`\n`;
        }
      } catch {}
    }

    let toolsInstructionsStr = '';
    if (targetAgentId === 'agent-engineer' || targetAgentId === 'agent-architect') {
      toolsInstructionsStr += `\n\n[AVAILABLE SYSTEM TOOLS]\n` +
        `You have access to execute system tools for project files and terminal commands.\n` +
        `To invoke a tool, output a \`\`\`tool_call JSON block formatted as follows:\n\n` +
        `\`\`\`tool_call\n` +
        `{\n` +
        `  "tool": "write_file",\n` +
        `  "arguments": {\n` +
        `    "filePath": "test.md",\n` +
        `    "content": "Hello World"\n` +
        `  }\n` +
        `}\n` +
        `\`\`\`\n\n` +
        `Available Tools:\n` +
        `- read_file: { "filePath": string }\n` +
        `- write_file: { "filePath": string, "content": string }\n` +
        `- delete_file: { "filePath": string }\n` +
        `- list_directory: { "directoryPath"?: string }\n` +
        `- run_terminal_command: { "command": string }\n` +
        `- git_status: {}\n` +
        `- git_diff: { "filePath"?: string }\n`;
    }

    // Assemble Final Composite System Prompt with ACTIVE EDITOR FILE placed prominently at top
    const fullSystemPrompt = `${baseSystemPrompt}${activeFileStr}${projectContextStr}${attachedFilesStr}${toolsInstructionsStr}`;

    return {
      systemPrompt: fullSystemPrompt,
      assembledMessages: [
        { role: 'system', content: fullSystemPrompt },
        { role: 'user', content: userPrompt },
      ],
      contextSummary: {
        activeFile: activeFilePath ? path.basename(activeFilePath) : undefined,
        attachedFilesCount,
        memoryFilesCount,
      },
    };
  }
}
