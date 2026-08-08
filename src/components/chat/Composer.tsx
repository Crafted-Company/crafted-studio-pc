import React, { useRef, useEffect } from 'react';
import { SendHorizontal, Sparkles, Square, Bot, ChevronDown } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useChatStore } from '../../stores/chatStore';
import { useShortcutStore } from '../../stores/shortcutStore';
import { useAISettingsStore } from '../../stores/aiSettingsStore';
import { useWorkbenchStore } from '../../stores/workbenchStore';

export const Composer: React.FC = () => {
  const { activeProject } = useProjectStore();
  const {
    composerText,
    setComposerText,
    sendMessage,
    isSending,
    isGenerating,
    cancelGeneration,
  } = useChatStore();
  const { agents, modelProfiles, activeAgentId, setActiveAgentId } = useAISettingsStore();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeAgent = agents.find((a) => a.id === activeAgentId) || agents[0];
  const activeProfile = modelProfiles.find((p) => p.id === activeAgent?.profileId);

  useEffect(() => {
    if (textareaRef.current) {
      if (!composerText) {
        textareaRef.current.style.height = '40px';
      } else {
        const newHeight = Math.min(textareaRef.current.scrollHeight, 140);
        textareaRef.current.style.height = `${Math.max(40, newHeight)}px`;
      }
    }
  }, [composerText]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isGenerating) {
      await cancelGeneration();
      return;
    }
    if (!composerText.trim() || !activeProject || isSending) return;

    const workbenchState = useWorkbenchStore.getState();
    const normActive = workbenchState.activeTabPath ? workbenchState.activeTabPath.replace(/\\/g, '/').toLowerCase() : null;
    const activeTab = workbenchState.openTabs.find((t) => t.path.replace(/\\/g, '/').toLowerCase() === normActive);

    await sendMessage(composerText, {
      agentId: activeAgent?.id,
      agentName: activeAgent?.name,
      profileId: activeProfile?.id,
      profileName: activeProfile?.name,
      provider: activeProfile?.providerId,
      model: activeProfile?.modelId,
      activeTabPath: workbenchState.activeTabPath || undefined,
      activeTabContent: activeTab?.content || undefined,
    });

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleStop = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await cancelGeneration();
  };

  // Register Chat Command Handlers (Ctrl+L for Focus Chat Input)
  useEffect(() => {
    const registerHandler = useShortcutStore.getState().registerHandler;
    const unsubs = [
      registerHandler('chat.focusInput', () => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.select();
        }
      }),
      registerHandler('chat.sendMessage', () => {
        if (!isGenerating) {
          handleSubmit();
        }
      }),
    ];

    return () => {
      unsubs.forEach((unsub) => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [handleSubmit, isGenerating]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && isGenerating) {
      e.preventDefault();
      cancelGeneration();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isGenerating) {
        handleSubmit();
      }
    }
  };

  return (
    <div className="border-t border-crafted-border/60 bg-crafted-surface/40 p-3 select-none font-sans">
      <form onSubmit={handleSubmit} className="relative flex flex-col space-y-2">
        {/* Active Agent Selector Bar */}
        <div className="flex items-center justify-between font-mono text-xs">
          <div className="flex items-center space-x-1.5 bg-crafted-surface border border-crafted-border px-2.5 py-1 rounded-lg">
            <Bot className="h-3.5 w-3.5 text-crafted-brand-rust shrink-0" />
            <select
              value={activeAgentId}
              onChange={(e) => setActiveAgentId(e.target.value)}
              className="bg-transparent text-crafted-text font-bold text-[11px] focus:outline-none cursor-pointer pr-1"
            >
              {agents.map((ag) => {
                const prof = modelProfiles.find((p) => p.id === ag.profileId);
                return (
                  <option key={ag.id} value={ag.id} className="bg-[#1a1a24] text-[#e0e0e0] font-sans py-1">
                    {ag.name} ({prof ? prof.name : 'Default Profile'})
                  </option>
                );
              })}
            </select>
          </div>

          {activeProfile && (
            <span className="text-[10px] text-crafted-text-dim px-2 py-0.5 rounded bg-crafted-surface/60 border border-crafted-border/40">
              {activeProfile.providerId.toUpperCase()} • {activeProfile.modelId}
            </span>
          )}
        </div>

        <div className="relative flex items-end rounded-xl border border-crafted-border bg-crafted-surface p-1.5 focus-within:border-crafted-brand-rust/60 transition-colors shadow-crafted-card">
          <textarea
            ref={textareaRef}
            rows={1}
            value={composerText}
            onChange={(e) => setComposerText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!activeProject}
            placeholder={
              !activeProject
                ? 'Select or create a project to start typing messages...'
                : isGenerating
                ? 'AI is generating... Type your next message or click Stop'
                : `Message ${activeAgent?.name || 'AI Assistant'} for ${activeProject.name}... (Press Enter to send)`
            }
            className="flex-1 max-h-32 resize-none bg-transparent px-2.5 py-1.5 text-xs text-crafted-text placeholder-crafted-text-dim focus:outline-none disabled:opacity-40 font-sans"
          />

          {isGenerating ? (
            <button
              type="button"
              onClick={handleStop}
              title="Stop Generation (Esc)"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all animate-pulse"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!activeProject || !composerText.trim() || isSending}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#433FA9] to-[#A9452D] text-white shadow-sm hover:opacity-90 disabled:opacity-40 disabled:hover:opacity-40 transition-opacity"
            >
              {isSending ? (
                <Sparkles className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizontal className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2 font-mono text-[10px] text-crafted-text-dim">
            <span>Shift+Enter for newline</span>
            <span>•</span>
            <span>Ctrl+L to focus</span>
          </div>
          <span className="font-mono text-[10px] text-crafted-text-dim">
            {composerText.length > 0 ? `${composerText.length} chars` : ''}
          </span>
        </div>
      </form>
    </div>
  );
};
