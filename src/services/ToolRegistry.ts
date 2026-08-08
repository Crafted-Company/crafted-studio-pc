import { z } from 'zod';
import { ToolDefinition } from '../shared/types';

export class ToolRegistry {
  private static tools: Map<string, ToolDefinition> = new Map();

  static {
    this.registerTool({
      id: 'read_file',
      name: 'Read Workspace File',
      description: 'Read the text contents of any specified file in the active project.',
      riskLevel: 'SAFE',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Relative or absolute file path to read from workspace.',
          },
        },
        required: ['filePath'],
      },
    });

    this.registerTool({
      id: 'write_file',
      name: 'Write / Edit Workspace File',
      description: 'Create a new file or write text content to an existing file in the project.',
      riskLevel: 'CONFIRMATION_REQUIRED',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Relative or absolute file path to write.',
          },
          content: {
            type: 'string',
            description: 'Full text content to write into the file.',
          },
        },
        required: ['filePath', 'content'],
      },
    });

    this.registerTool({
      id: 'delete_file',
      name: 'Delete / Trash File',
      description: 'Safely move a file or folder to the system Recycle Bin.',
      riskLevel: 'CONFIRMATION_REQUIRED',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Relative or absolute file path to delete.',
          },
        },
        required: ['filePath'],
      },
    });

    this.registerTool({
      id: 'list_directory',
      name: 'List Directory Contents',
      description: 'List subdirectories and files inside a project directory path.',
      riskLevel: 'SAFE',
      parameters: {
        type: 'object',
        properties: {
          directoryPath: {
            type: 'string',
            description: 'Directory path relative to project root or empty for root directory.',
          },
        },
      },
    });

    this.registerTool({
      id: 'run_terminal_command',
      name: 'Run Terminal Command',
      description: 'Execute a shell command inside the active project directory.',
      riskLevel: 'CONFIRMATION_REQUIRED',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'Shell command line string to run (e.g. npm test, git status, ls).',
          },
        },
        required: ['command'],
      },
    });

    this.registerTool({
      id: 'git_status',
      name: 'Git Status',
      description: 'Get current git repository status, changed files, and untracked files.',
      riskLevel: 'SAFE',
      parameters: {
        type: 'object',
        properties: {},
      },
    });

    this.registerTool({
      id: 'git_diff',
      name: 'Git Diff',
      description: 'Show git diff for uncommitted workspace modifications.',
      riskLevel: 'SAFE',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Optional file path to filter diff output.',
          },
        },
      },
    });
  }

  public static registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.id, tool);
  }

  public static getTool(id: string): ToolDefinition | undefined {
    return this.tools.get(id);
  }

  public static getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }
}
