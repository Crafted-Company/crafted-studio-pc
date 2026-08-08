import React, { useState } from 'react';
import { User, Bot, Terminal, Copy, Check, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Message } from '../../shared/types';
import { useChatStore } from '../../stores/chatStore';
import { cn } from '../../utils/cn';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ToolCallCard } from './ToolCallCard';

interface MessageBubbleProps {
  message: Message;
}

const COLLAPSE_CHAR_THRESHOLD = 500;
const COLLAPSE_LINE_THRESHOLD = 15;
const COLLAPSED_LINE_COUNT = 3;

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isStreaming = message.status === 'sending';

  const [isCopied, setIsCopied] = useState(false);
  // Default to FULLY EXPANDED per Sprint 8.2 requirement
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { retryMessage, isGenerating } = useChatStore();

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const lines = message.content.split('\n');
  const isLongMessage =
    !isStreaming &&
    (message.content.length > COLLAPSE_CHAR_THRESHOLD || lines.length > COLLAPSE_LINE_THRESHOLD);

  const getDisplayedText = () => {
    const cleanText = message.content.replace(/```tool_call\s*[\s\S]*?```/g, '').trim();
    if (!isCollapsed || isStreaming || !isLongMessage) {
      return cleanText;
    }
    const cleanLines = cleanText.split('\n');
    if (cleanLines.length > COLLAPSED_LINE_COUNT) {
      return cleanLines.slice(0, COLLAPSED_LINE_COUNT).join('\n') + '\n...';
    }
    return cleanText.substring(0, 180) + '...';
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isGenerating) {
      retryMessage(message.id);
    }
  };

  return (
    <div
      className={cn(
        'group relative flex w-full mb-3.5 animate-fade-in select-text font-sans',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'relative flex max-w-[85%] space-x-2.5 rounded-2xl p-3.5 shadow-crafted-card border transition-all duration-200',
          isUser
            ? 'bg-crafted-surface/90 border-crafted-brand-rust/30 text-crafted-text'
            : isSystem
            ? 'bg-amber-500/5 border-amber-500/20 text-amber-200'
            : 'bg-crafted-surface/70 border-crafted-border text-crafted-text'
        )}
      >
        {/* Hover Action Toolbar */}
        {!isStreaming && (
          <div
            className={cn(
              'absolute -top-3 z-10 hidden group-hover:flex items-center space-x-1 rounded-lg border border-crafted-border bg-crafted-surface/95 px-1.5 py-0.5 shadow-crafted-card backdrop-blur-md transition-all',
              isUser ? 'right-4' : 'left-4'
            )}
          >
            {/* Copy Message Action */}
            <button
              onClick={handleCopy}
              title="Copy Message"
              className="flex items-center space-x-1 rounded p-1 text-[10px] font-medium text-crafted-text-muted hover:bg-crafted-surface-hover hover:text-crafted-text transition-colors"
            >
              {isCopied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {/* Retry Response Action */}
            {!isSystem && (
              <button
                onClick={handleRetry}
                disabled={isGenerating}
                title="Retry Response"
                className="flex items-center space-x-1 rounded p-1 text-[10px] font-medium text-crafted-text-muted hover:bg-crafted-surface-hover hover:text-crafted-text disabled:opacity-40 transition-colors"
              >
                <RefreshCw className="h-3 w-3 text-cyan-400" />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}

        {/* Avatar */}
        <div
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-[10px] shadow-sm',
            isUser
              ? 'bg-gradient-to-br from-[#433FA9] to-[#A9452D] text-white'
              : isSystem
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'bg-crafted-surface-hover text-crafted-text-muted border border-crafted-border'
          )}
        >
          {isUser ? (
            <User className="h-3 w-3" />
          ) : isSystem ? (
            <Terminal className="h-3 w-3" />
          ) : (
            <Bot className="h-3 w-3" />
          )}
        </div>

        {/* Content & Viewport */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between space-x-4">
            <span className="font-mono text-[10px] font-semibold tracking-wider text-crafted-text-dim uppercase">
              {isUser ? 'User' : isSystem ? 'System' : 'Assistant'}
            </span>
            <span className="font-mono text-[9px] text-crafted-text-dim">{formattedTime}</span>
          </div>

          {/* Thinking State when Assistant bubble is created but first token hasn't arrived */}
          {!isUser && isStreaming && !message.content.trim() ? (
            <div className="flex items-center space-x-2 py-1 font-mono text-xs text-crafted-text-muted animate-pulse">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-400" />
              <span>Thinking & generating response...</span>
            </div>
          ) : (
            <div className="relative">
              <div className="text-xs leading-relaxed text-crafted-text break-words font-sans">
                <MarkdownRenderer content={getDisplayedText()} />
              </div>

              {/* Render Interactive Tool Execution Cards for Detected Tool Calls */}
              {!isUser && !isStreaming && (
                (() => {
                  const toolCalls: any[] = [];
                  const regex = /```tool_call\s*([\s\S]*?)\s*```/g;
                  let match;
                  while ((match = regex.exec(message.content)) !== null) {
                    try {
                      const parsed = JSON.parse(match[1]);
                      if (parsed.tool) {
                        toolCalls.push({
                          toolId: parsed.tool,
                          arguments: parsed.arguments || {},
                          callId: Math.random().toString(36).substring(7),
                        });
                      }
                    } catch {}
                  }

                  if (toolCalls.length === 0) return null;

                  return (
                    <div className="mt-3 space-y-2">
                      {toolCalls.map((tc, idx) => (
                        <ToolCallCard key={tc.callId || idx} toolCall={tc} />
                      ))}
                    </div>
                  );
                })()
              )}

              {/* Fade Overlay when explicitly collapsed by user */}
              {isCollapsed && (
                <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-crafted-surface via-crafted-surface/80 to-transparent pointer-events-none" />
              )}
            </div>
          )}

          {/* Collapse / Expand Toggle Button (Only visible on long messages, defaults to fully expanded) */}
          {isLongMessage && !isStreaming && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="mt-2 flex items-center space-x-1 font-mono text-[10px] font-semibold text-crafted-brand-lightViolet hover:text-white transition-colors"
            >
              {isCollapsed ? (
                <>
                  <ChevronDown className="h-3 w-3" />
                  <span>Show More ({lines.length} lines)</span>
                </>
              ) : (
                <>
                  <ChevronUp className="h-3 w-3" />
                  <span>Show Less (Collapse to 3 lines)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
