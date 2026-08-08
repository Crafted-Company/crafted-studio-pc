import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { shell } from 'electron';
import { ToolCallRequest, ToolExecutionResult, PermissionDecision } from '../shared/types';
import { ToolRegistry } from './ToolRegistry';
import { PermissionService } from './PermissionService';
import { ProjectService } from './ProjectService';
import { FileService } from './FileService';

const execAsync = promisify(exec);

export class ToolExecutionService {
  /**
   * Enforces strict workspace boundary guard to prevent operations escaping active project folder.
   */
  private static sanitizeWorkspacePath(targetPath: string, rootPath: string): string {
    const resolvedPath = path.isAbsolute(targetPath) ? path.resolve(targetPath) : path.resolve(path.join(rootPath, targetPath));
    const normalizedRoot = path.resolve(rootPath);

    // Prevent escaping workspace root
    if (!resolvedPath.toLowerCase().startsWith(normalizedRoot.toLowerCase())) {
      throw new Error(`Security Violation: Target path "${targetPath}" is outside the active workspace project directory.`);
    }

    return resolvedPath;
  }

  public static async executeTool(
    request: ToolCallRequest,
    permissionDecision?: PermissionDecision
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const { toolId, arguments: args, callId } = request;

    const tool = ToolRegistry.getTool(toolId);
    if (!tool) {
      return {
        callId,
        toolId,
        success: false,
        error: `Tool "${toolId}" is not registered in ToolRegistry.`,
        durationMs: Date.now() - startTime,
      };
    }

    // Check permission requirements
    if (PermissionService.isPermissionRequired(toolId)) {
      if (!permissionDecision || permissionDecision === 'DENY') {
        return {
          callId,
          toolId,
          success: false,
          error: `User denied permission to execute "${tool.name}".`,
          durationMs: Date.now() - startTime,
        };
      }
      PermissionService.recordDecision(toolId, permissionDecision);
    }

    // Resolve active project root
    const activeProject = await ProjectService.getActiveProject();
    const rootPath = activeProject?.path || process.cwd();

    try {
      let output = '';

      switch (toolId) {
        case 'read_file': {
          const rawPath = args.filePath as string;
          if (!rawPath) throw new Error('Argument "filePath" is required.');
          const targetPath = this.sanitizeWorkspacePath(rawPath, rootPath);
          const res = await FileService.readFileText(targetPath);
          output = res.content;
          break;
        }

        case 'write_file': {
          const rawPath = args.filePath as string;
          const content = args.content as string;
          if (!rawPath) throw new Error('Argument "filePath" is required.');
          if (content === undefined) throw new Error('Argument "content" is required.');

          const targetPath = this.sanitizeWorkspacePath(rawPath, rootPath);
          await FileService.writeFileText(targetPath, content);
          output = `Successfully wrote ${content.length} characters to "${path.basename(targetPath)}".`;
          break;
        }

        case 'delete_file': {
          const rawPath = args.filePath as string;
          if (!rawPath) throw new Error('Argument "filePath" is required.');
          const targetPath = this.sanitizeWorkspacePath(rawPath, rootPath);

          // Prevent deleting project root directory
          if (targetPath.toLowerCase() === path.resolve(rootPath).toLowerCase()) {
            throw new Error('Security Error: Deleting the entire project root directory is strictly prohibited.');
          }

          if (!fs.existsSync(targetPath)) {
            throw new Error(`File or directory does not exist: ${targetPath}`);
          }

          await shell.trashItem(targetPath);
          output = `Successfully moved "${path.basename(targetPath)}" to the Recycle Bin.`;
          break;
        }

        case 'list_directory': {
          const subDir = (args.directoryPath as string) || '';
          const targetDir = this.sanitizeWorkspacePath(subDir || rootPath, rootPath);

          if (!fs.existsSync(targetDir)) {
            throw new Error(`Directory path does not exist: ${targetDir}`);
          }

          const entries = fs.readdirSync(targetDir, { withFileTypes: true });
          const formatted = entries
            .map((e) => `${e.isDirectory() ? '[DIR] ' : '[FILE]'} ${e.name}`)
            .join('\n');
          output = formatted || '[Empty Directory]';
          break;
        }

        case 'run_terminal_command': {
          const cmd = args.command as string;
          if (!cmd) throw new Error('Argument "command" is required.');

          const { stdout, stderr } = await execAsync(cmd, { cwd: rootPath, timeout: 30000 });
          output = stdout || stderr || '[Command executed with no output]';
          break;
        }

        case 'git_status': {
          const { stdout } = await execAsync('git status --short', { cwd: rootPath });
          output = stdout || 'On branch main. Working tree clean.';
          break;
        }

        case 'git_diff': {
          const fileFilter = (args.filePath as string) || '';
          const cmd = fileFilter ? `git diff -- "${fileFilter}"` : 'git diff';
          const { stdout } = await execAsync(cmd, { cwd: rootPath });
          output = stdout || 'No uncommitted changes detected.';
          break;
        }

        default:
          throw new Error(`Execution handler for tool "${toolId}" is not implemented.`);
      }

      return {
        callId,
        toolId,
        success: true,
        output,
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        callId,
        toolId,
        success: false,
        error: errMsg,
        durationMs: Date.now() - startTime,
      };
    }
  }
}
