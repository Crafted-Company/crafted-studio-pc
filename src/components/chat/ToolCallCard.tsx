import React, { useState } from 'react';
import { Play, Check, X, ShieldAlert, ChevronDown, ChevronUp, Terminal, FileText, Folder, GitBranch, Loader2, Trash2 } from 'lucide-react';
import { ToolCallRequest, ToolExecutionResult } from '../../shared/types';
import { useChatStore } from '../../stores/chatStore';

interface ToolCallCardProps {
  toolCall: ToolCallRequest;
  executionResult?: ToolExecutionResult;
}

export const ToolCallCard: React.FC<ToolCallCardProps> = ({ toolCall, executionResult }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const runtimeState = useChatStore((state) => state.runtimeState);
  const respondToApproval = useChatStore((state) => state.respondToApproval);

  const { toolId, arguments: args, callId } = toolCall;

  // Check if this tool call is actively awaiting approval in the backend runtime
  const isPendingInRuntime = runtimeState?.status === 'waiting_approval' && runtimeState.pendingApproval?.callId === callId;
  const isExecutingInRuntime = runtimeState?.status === 'running' && !executionResult;

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
              {isPendingInRuntime && (
                <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 font-mono">
                  <ShieldAlert className="h-3 w-3 text-amber-400" />
                  <span>Permission Required</span>
                </span>
              )}
              {isExecutingInRuntime && (
                <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-[10px] text-cyan-300 font-mono animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
                  <span>Executing...</span>
                </span>
              )}
              {executionResult && executionResult.success && (
                <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-400 font-mono">
                  <Check className="h-3 w-3" />
                  <span>Success ({executionResult.durationMs}ms)</span>
                </span>
              )}
              {executionResult && !executionResult.success && (
                <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-[10px] text-red-300 font-mono">
                  <X className="h-3 w-3 text-red-400" />
                  <span>Failed / Denied</span>
                </span>
              )}
            </div>
            {renderArgsSummary()}
          </div>
        </div>

        {executionResult && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg text-crafted-text-dim hover:text-crafted-text hover:bg-crafted-surface transition-colors"
            title="Toggle details"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Backend-Driven Permission Approval Bar (Survives Tab Switches) */}
      {isPendingInRuntime && (
        <div className="flex flex-col space-y-2.5 px-3.5 py-3 bg-amber-500/5 border-b border-amber-500/20 text-xs">
          <span className="text-crafted-text font-medium">Allow this tool action on your workspace?</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => respondToApproval(callId!, 'DENY')}
              className="flex-1 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 font-medium transition-colors text-center"
            >
              Deny
            </button>
            <button
              onClick={() => respondToApproval(callId!, 'ALLOW_ALWAYS')}
              className="flex-1 py-1.5 rounded-lg bg-crafted-surface border border-crafted-border text-crafted-text hover:bg-crafted-surface-hover font-medium transition-colors text-center"
            >
              Always Allow
            </button>
            <button
              onClick={() => respondToApproval(callId!, 'ALLOW_ONCE')}
              className="flex-1 py-1.5 rounded-lg bg-crafted-brand-rust hover:bg-crafted-brand-rust/90 text-white font-semibold transition-colors text-center shadow-crafted-glow"
            >
              Allow Once
            </button>
          </div>
        </div>
      )}

      {/* Expandable Result Output Details */}
      {(isExpanded || (executionResult && !executionResult.success)) && executionResult && (
        <div className="p-3 bg-[#111318] text-xs font-mono border-t border-crafted-border/40 max-h-60 overflow-y-auto">
          {executionResult.error ? (
            <div className="text-red-400 whitespace-pre-wrap">{executionResult.error}</div>
          ) : (
            <pre className="text-crafted-text-muted whitespace-pre-wrap">{executionResult.output}</pre>
          )}
        </div>
      )}
    </div>
  );
};
