import React, { useState, useEffect } from 'react';
import { Play, Check, X, ShieldAlert, ChevronDown, ChevronUp, Terminal, FileText, Folder, GitBranch, Loader2, Trash2 } from 'lucide-react';
import { ToolCallRequest, ToolExecutionResult, PermissionDecision } from '../../shared/types';
import { useExplorerStore } from '../../stores/explorerStore';
import { useProjectStore } from '../../stores/projectStore';
import { useWorkbenchStore } from '../../stores/workbenchStore';

interface ToolCallCardProps {
  toolCall: ToolCallRequest;
  onExecutionComplete?: (result: ToolExecutionResult) => void;
}

export const ToolCallCard: React.FC<ToolCallCardProps> = ({ toolCall, onExecutionComplete }) => {
  const [status, setStatus] = useState<'IDLE' | 'NEEDS_PERMISSION' | 'EXECUTING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [result, setResult] = useState<ToolExecutionResult | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const { toolId, arguments: args } = toolCall;

  useEffect(() => {
    const safeTools = new Set(['read_file', 'list_directory', 'git_status', 'git_diff']);
    if (safeTools.has(toolId)) {
      handleExecute('ALLOW_ONCE');
    } else {
      setStatus('NEEDS_PERMISSION');
    }
  }, [toolId]);

  const handleExecute = async (decision: PermissionDecision) => {
    if (decision === 'DENY') {
      const denyResult: ToolExecutionResult = {
        callId: toolCall.callId,
        toolId,
        success: false,
        error: 'Execution denied by user.',
        durationMs: 0,
      };
      setResult(denyResult);
      setStatus('ERROR');
      if (onExecutionComplete) onExecutionComplete(denyResult);
      return;
    }

    setStatus('EXECUTING');
    try {
      if (typeof window !== 'undefined' && window.craftedAPI) {
        const res = await window.craftedAPI.executeTool(toolCall, decision);
        setResult(res);
        if (res.success) {
          setStatus('SUCCESS');
          const activeProj = useProjectStore.getState().activeProject;
          if (activeProj) {
            useExplorerStore.getState().loadProjectTree(activeProj.path, activeProj.id);
            if (args.filePath) {
              if (toolId === 'delete_file') {
                useWorkbenchStore.getState().closeTab(String(args.filePath));
              } else {
                useWorkbenchStore.getState().reloadTabFromDisk(String(args.filePath));
              }
            }
          }
        } else {
          setStatus('ERROR');
        }
        if (onExecutionComplete) onExecutionComplete(res);
      }
    } catch (err) {
      const errRes: ToolExecutionResult = {
        callId: toolCall.callId,
        toolId,
        success: false,
        error: String(err),
        durationMs: 0,
      };
      setResult(errRes);
      setStatus('ERROR');
      if (onExecutionComplete) onExecutionComplete(errRes);
    }
  };

  const getToolIcon = () => {
    switch (toolId) {
      case 'run_terminal_command':
        return <Terminal className="h-4 w-4 text-cyan-400" />;
      case 'write_file':
      case 'read_file':
        return <FileText className="h-4 w-4 text-amber-400" />;
      case 'delete_file':
        return <Trash2 className="h-4 w-4 text-red-400" />;
      case 'list_directory':
        return <Folder className="h-4 w-4 text-emerald-400" />;
      case 'git_status':
      case 'git_diff':
        return <GitBranch className="h-4 w-4 text-purple-400" />;
      default:
        return <Play className="h-4 w-4 text-crafted-brand-rust" />;
    }
  };

  const renderArgsSummary = () => {
    if (args.filePath) return <span className="font-mono text-xs text-crafted-text truncate">Path: {String(args.filePath)}</span>;
    if (args.command) return <span className="font-mono text-xs text-crafted-text truncate">Command: {String(args.command)}</span>;
    if (args.directoryPath !== undefined) return <span className="font-mono text-xs text-crafted-text truncate">Dir: {String(args.directoryPath || '.')}</span>;
    return <span className="font-mono text-xs text-crafted-text-dim">No arguments</span>;
  };

  return (
    <div className="my-2.5 rounded-xl border border-crafted-border bg-crafted-surface/80 shadow-md font-sans overflow-hidden transition-all">
      {/* Card Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-crafted-bg/60 border-b border-crafted-border/40">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-crafted-surface border border-crafted-border">
            {getToolIcon()}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-crafted-text capitalize">
                {toolId.replace(/_/g, ' ')}
              </span>
              {status === 'NEEDS_PERMISSION' && (
                <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 font-mono">
                  <ShieldAlert className="h-3 w-3 text-amber-400" />
                  <span>Permission Required</span>
                </span>
              )}
              {status === 'EXECUTING' && (
                <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-[10px] text-cyan-300 font-mono animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
                  <span>Executing...</span>
                </span>
              )}
              {status === 'SUCCESS' && (
                <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-400 font-mono">
                  <Check className="h-3 w-3" />
                  <span>Success ({result?.durationMs}ms)</span>
                </span>
              )}
              {status === 'ERROR' && (
                <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-[10px] text-red-300 font-mono">
                  <X className="h-3 w-3 text-red-400" />
                  <span>Failed / Denied</span>
                </span>
              )}
            </div>
            {renderArgsSummary()}
          </div>
        </div>

        {result && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg text-crafted-text-dim hover:text-crafted-text hover:bg-crafted-surface transition-colors"
            title="Toggle details"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Spacious Permission Approval Bar */}
      {status === 'NEEDS_PERMISSION' && (
        <div className="flex flex-col space-y-2.5 px-3.5 py-3 bg-amber-500/5 border-b border-amber-500/20 text-xs">
          <span className="text-crafted-text font-medium">Allow this tool action on your workspace?</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleExecute('DENY')}
              className="flex-1 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 font-medium transition-colors text-center"
            >
              Deny
            </button>
            <button
              onClick={() => handleExecute('ALLOW_ALWAYS')}
              className="flex-1 py-1.5 rounded-lg bg-crafted-surface border border-crafted-border text-crafted-text hover:bg-crafted-surface-hover font-medium transition-colors text-center"
            >
              Always Allow
            </button>
            <button
              onClick={() => handleExecute('ALLOW_ONCE')}
              className="flex-1 py-1.5 rounded-lg bg-crafted-brand-rust hover:bg-crafted-brand-rust/90 text-white font-semibold transition-colors text-center shadow-crafted-glow"
            >
              Allow Once
            </button>
          </div>
        </div>
      )}

      {/* Expandable Result Output Details */}
      {(isExpanded || status === 'ERROR') && result && (
        <div className="p-3 bg-[#111318] text-xs font-mono border-t border-crafted-border/40 max-h-60 overflow-y-auto">
          {result.error ? (
            <div className="text-red-400 whitespace-pre-wrap">{result.error}</div>
          ) : (
            <pre className="text-crafted-text-muted whitespace-pre-wrap">{result.output}</pre>
          )}
        </div>
      )}
    </div>
  );
};
