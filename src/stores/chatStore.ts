import { create } from 'zustand';
import { Conversation, Message, CreateMessageInput, PermissionDecision } from '../shared/types';
import { AgentRuntimeState } from '../services/AgentRuntimeService';

interface ChatStoreState {
  activeConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  isGenerating: boolean;
  streamingMessageId: string | null;
  streamingContent: string;
  composerText: string;
  currentProjectId: string | null;
  runtimeState: AgentRuntimeState | null;

  setComposerText: (text: string) => void;
  loadConversationForProject: (projectId: string | null) => Promise<void>;
  sendMessage: (content: string, metadata?: import('../shared/types').MessageMetadata) => Promise<Message | null>;
  cancelGeneration: () => Promise<void>;
  retryMessage: (messageId: string) => Promise<void>;
  clearConversation: () => Promise<void>;
  respondToApproval: (callId: string, decision: PermissionDecision) => Promise<void>;
  subscribeStreamEvents: () => () => void;
}

// Throttling frame buffer (inspired by T3 Code event rendering optimizations)
let rafPending = false;
let pendingStateSync: AgentRuntimeState | null = null;

export const useChatStore = create<ChatStoreState>((set, get) => ({
  activeConversation: null,
  messages: [],
  isLoading: false,
  isSending: false,
  isGenerating: false,
  streamingMessageId: null,
  streamingContent: '',
  composerText: '',
  currentProjectId: null,
  runtimeState: null,

  setComposerText: (text: string) => set({ composerText: text }),

  loadConversationForProject: async (projectId: string | null) => {
    if (!projectId) {
      set({
        activeConversation: null,
        messages: [],
        isLoading: false,
        isGenerating: false,
        streamingMessageId: null,
        streamingContent: '',
        currentProjectId: null,
        runtimeState: null,
      });
      return;
    }

    set({ isLoading: true, currentProjectId: projectId });

    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        const conversation = await window.craftedAPI.getConversation(projectId);
        const msgs = await window.craftedAPI.getMessages(conversation.id);
        const rState = await window.craftedAPI.getAgentRuntimeState();

        set({
          activeConversation: conversation,
          messages: msgs,
          isLoading: false,
          runtimeState: rState,
          isGenerating: rState.status === 'running' || rState.status === 'waiting_approval',
          streamingMessageId: rState.streamingMessageId,
          streamingContent: rState.streamingContent,
        });
      } catch (err) {
        console.error('[chatStore] Error loading conversation for project:', err);
        set({
          activeConversation: null,
          messages: [],
          isLoading: false,
        });
      }
    } else {
      set({ isLoading: false });
    }
  },

  sendMessage: async (content: string, metadata?: import('../shared/types').MessageMetadata) => {
    const { currentProjectId, isSending, isGenerating } = get();
    const trimmed = content.trim();

    if (!trimmed || !currentProjectId || isSending || isGenerating) {
      return null;
    }

    const tempUserMsg: Message = {
      id: `temp-user-${Date.now()}`,
      conversationId: get().activeConversation?.id || 'conv',
      role: 'user',
      content: trimmed,
      status: 'sent',
      createdAt: new Date().toISOString(),
      metadata,
    };

    set((state) => ({
      isSending: true,
      composerText: '',
      messages: [...state.messages, tempUserMsg],
    }));

    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        const input: CreateMessageInput = {
          projectId: currentProjectId,
          role: 'user',
          content: trimmed,
          metadata,
        };

        const userMsg = await window.craftedAPI.sendMessage(input);

        if (userMsg) {
          set((state) => ({
            isSending: false,
            messages: state.messages.map((m) => (m.id === tempUserMsg.id ? userMsg : m)),
          }));
        }

        return userMsg;
      } catch (err) {
        console.error('[chatStore] Error sending message:', err);
        set({ isSending: false, isGenerating: false });
        return null;
      }
    }

    set({ isSending: false, isGenerating: false });
    return null;
  },

  cancelGeneration: async () => {
    const { activeConversation } = get();
    if (!activeConversation) return;

    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        await window.craftedAPI.cancelGeneration(activeConversation.id);
        const updatedMsgs = await window.craftedAPI.getMessages(activeConversation.id);
        set({
          messages: updatedMsgs,
          isGenerating: false,
          isSending: false,
          streamingMessageId: null,
          streamingContent: '',
        });
      } catch (err) {
        console.error('[chatStore] Error cancelling generation:', err);
      }
    }
  },

  retryMessage: async (messageId: string) => {
    const { messages, isGenerating, cancelGeneration } = get();
    const target = messages.find((m) => m.id === messageId);
    if (!target) return;

    let userContentToRetry: string | null = null;
    if (target.role === 'user') {
      userContentToRetry = target.content;
    } else {
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx > 0 && messages[idx - 1].role === 'user') {
        userContentToRetry = messages[idx - 1].content;
      }
    }

    if (!userContentToRetry) return;

    if (isGenerating) {
      await cancelGeneration();
    }

    setTimeout(() => {
      get().sendMessage(userContentToRetry!);
    }, 100);
  },

  clearConversation: async () => {
    const { currentProjectId } = get();
    if (!currentProjectId) return;

    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        await window.craftedAPI.clearConversation(currentProjectId);
        set({ messages: [], isGenerating: false, isSending: false, streamingContent: '', runtimeState: null });
      } catch (err) {
        console.error('[chatStore] Error clearing conversation:', err);
      }
    }
  },

  respondToApproval: async (callId: string, decision: PermissionDecision) => {
    if (typeof window !== 'undefined' && window.craftedAPI) {
      await window.craftedAPI.respondToToolApproval(callId, decision);
    }
  },

  subscribeStreamEvents: () => {
    if (typeof window === 'undefined' || !window.craftedAPI) {
      return () => {};
    }

    const unsubAgentSync = window.craftedAPI.onAgentStateSync((state: AgentRuntimeState) => {
      pendingStateSync = state;

      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(async () => {
          rafPending = false;
          const nextState = pendingStateSync;
          if (!nextState) return;

          const currentActiveConv = get().activeConversation;
          const isOurConv = !nextState.conversationId || (currentActiveConv && nextState.conversationId === currentActiveConv.id);

          if (!isOurConv) return;

          const isBusy = nextState.status === 'running' || nextState.status === 'waiting_approval';

          set({
            runtimeState: nextState,
            isGenerating: isBusy,
            streamingMessageId: nextState.streamingMessageId,
            streamingContent: nextState.streamingContent,
          });

          // Settle turn on completion / error / interrupted
          if (nextState.status === 'completed' || nextState.status === 'error' || nextState.status === 'interrupted') {
            if (currentActiveConv) {
              const msgs = await window.craftedAPI.getMessages(currentActiveConv.id);
              set({
                messages: msgs,
                isGenerating: false,
                isSending: false,
                streamingMessageId: null,
                streamingContent: '',
              });
            }
          }
        });
      }
    });

    return () => {
      unsubAgentSync();
    };
  },
}));
