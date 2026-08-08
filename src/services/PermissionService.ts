import { PermissionDecision, ToolRiskLevel } from '../shared/types';
import { ToolRegistry } from './ToolRegistry';

export class PermissionService {
  private static sessionAllowedTools: Set<string> = new Set();

  public static isPermissionRequired(toolId: string): boolean {
    if (this.sessionAllowedTools.has(toolId)) {
      return false; // Auto-approved for this session
    }

    const tool = ToolRegistry.getTool(toolId);
    if (!tool) return true; // Default to requiring permission if unknown

    return tool.riskLevel === 'CONFIRMATION_REQUIRED';
  }

  public static recordDecision(toolId: string, decision: PermissionDecision): void {
    if (decision === 'ALLOW_ALWAYS') {
      this.sessionAllowedTools.add(toolId);
    }
  }

  public static clearSessionPermissions(): void {
    this.sessionAllowedTools.clear();
  }
}
