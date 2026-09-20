/**
 * AgentRuntimeService.ts
 *
 * Core Agent Orchestration Runtime for CS Code.
 * Architectural design extracted and adapted from T3 Code (push-event turn lifecycle)
 * and Cline (human-in-the-loop tool approval state machine).
 *
 * Licenses:
 * - T3 Code Architecture (c) ping.gg - MIT License
 * - Cline Agent Execution Patterns (c) Cline - Apache License 2.0
 */

import crypto from 'crypto';
import { BrowserWindow } from 'electron';
import { getDatabase } from '../database';
import {
  Message,
  CreateMessageInput,
  MessageMetadata,
  ToolCallRequest,
  PermissionDecision,
} from '../shared/types';
import { ProviderManager } from '../ai/ProviderManager';
import { AIChatMessage } from '../ai/types';
import { AgentService } from './AgentService';
import { ModelProfileService } from './ModelProfileService';
import { ContextBuilderService } from './ContextBuilderService';
import { ToolExecutionService } from './ToolExecutionService';
import { PermissionService } from './PermissionService';

export type RuntimeTurnState = 'idle' | 'running' | 'waiting_approval' | 'interrupted' | 'error' | 'completed';

export interface PendingToolApproval {
  callId: string;
  toolId: string;
  arguments: Record<string, any>;
  conversationId: string;
  messageId: string;
  requestedAt: string;
}

export interface AgentRuntimeState {
  conversationId: string | null;
  activeTurnId: string | null;
  status: RuntimeTurnState;
  streamingMessageId: string | null;
  streamingContent: string;
  pendingApproval: PendingToolApproval | null;
  updatedAt: string;
}

export class AgentRuntimeService {
  private static mainWindow: BrowserWindow | null = null;
  private static activeAborts: Map<string, AbortController> = new Map();
  private static pendingApprovals: Map<string, {
    approval: PendingToolApproval;
    resolve: (decision: PermissionDecision) => void;
  }> = new Map();

  private static currentState: AgentRuntimeState = {
    conversationId: null,
    activeTurnId: null,
    status: 'idle',
    streamingMessageId: null,
    streamingContent: '',
    pendingApproval: null,
    updatedAt: new Date().toISOString(),
  };

  public static setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
  }

  public static getRuntimeState(): AgentRuntimeState {
    return { ...this.currentState };
  }

  private static broadcastState(patch: Partial<AgentRuntimeState>): void {
    this.currentState = {
      ...this.currentState,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('agent:stateSync', this.currentState);
    }
  }

  /**
   * Dispatches a new turn initiated by the user.
   */
  public static async dispatchUserMessage(input: CreateMessageInput): Promise<Message> {
    if (!input.projectId || !input.content.trim()) {
      throw new Error('Project ID and message content are required');
    }

    const db = getDatabase();
    const now = new Date().toISOString();
    const turnId = crypto.randomUUID();
    const userMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();

    // 1. Get or create conversation in SQLite
    let conversation = db
      .prepare('SELECT id, project_id, title FROM conversations WHERE project_id = ?')
      .get(input.projectId) as { id: string; project_id: string; title: string } | undefined;

    if (!conversation) {
      const newConvId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO conversations (id, project_id, title, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(newConvId, input.projectId, 'Project Conversation', now, now);
      conversation = { id: newConvId, project_id: input.projectId, title: 'Project Conversation' };
    }

    // 2. Persist User Message
    const metaJson = JSON.stringify(input.metadata || {});
    db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, status, created_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userMessageId, conversation.id, 'user', input.content.trim(), 'sent', now, metaJson);

    db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(now, conversation.id);

    const userMessage: Message = {
      id: userMessageId,
      conversationId: conversation.id,
      role: 'user',
      content: input.content.trim(),
      status: 'sent',
      createdAt: now,
      metadata: input.metadata || {},
    };

    // 3. Initialize Turn State & abort controller
    const abortController = new AbortController();
    this.activeAborts.set(conversation.id, abortController);

    this.broadcastState({
      conversationId: conversation.id,
      activeTurnId: turnId,
      status: 'running',
      streamingMessageId: assistantMessageId,
      streamingContent: '',
      pendingApproval: null,
    });

    // 4. Fire Async Turn Execution Loop in background
    setImmediate(async () => {
      await this.runTurnExecutionLoop({
        conversationId: conversation!.id,
        projectId: input.projectId,
        turnId,
        assistantMessageId,
        userPrompt: input.content.trim(),
        metadata: input.metadata,
        abortController,
      });
    });

    return userMessage;
  }

  /**
   * The authoritative Agent Execution Loop (inspired by Cline & T3 Code).
   */
  private static async runTurnExecutionLoop(params: {
    conversationId: string;
    projectId: string;
    turnId: string;
    assistantMessageId: string;
    userPrompt: string;
    metadata?: MessageMetadata;
    abortController: AbortController;
  }): Promise<void> {
    const { conversationId, projectId, assistantMessageId, userPrompt, metadata, abortController } = params;
    const db = getDatabase();
    let accumulatedContent = '';
    const executedToolCalls: any[] = [];

    try {
      // Resolve Agent Definition & Model Profile
      const targetAgentId = (metadata?.agentId as string) || 'agent-architect';
      const agent = AgentService.getAgentById(targetAgentId) || AgentService.getDefaultAgent();
      const profile = agent
        ? ModelProfileService.getProfileById(agent.profileId)
        : ModelProfileService.getDefaultProfile();

      // Build context
      const contextResult = await ContextBuilderService.buildPromptContext({
        projectId,
        agentId: targetAgentId,
        userPrompt,
        selectedFilePaths: (metadata?.attachments as string[]) || [],
        activeTabPath: metadata?.activeTabPath as string | undefined,
        activeTabContent: metadata?.activeTabContent as string | undefined,
      });

      // Load clean message history
      const historyRows = db
        .prepare('SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
        .all(conversationId) as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;

      const aiMessages: AIChatMessage[] = [
        { role: 'system', content: contextResult.systemPrompt },
        ...historyRows.filter((m) => m.role !== 'system'),
      ];

      // Stream generation
      const aiResponse = await ProviderManager.generateStreamingResponse(
        aiMessages,
        {
          providerId: profile?.providerId as any,
          modelId: profile?.modelId,
          options: { temperature: profile?.temperature ?? 0.7 },
        },
        (chunk: string) => {
          accumulatedContent += chunk;
          this.broadcastState({
            streamingContent: accumulatedContent,
          });
        },
        abortController.signal
      );

      const rawText = aiResponse.content || accumulatedContent;

      // Detect JSON Tool Calls embedded in response
      const toolCallMatch = rawText.match(/```json\s*(\{[\s\S]*?"toolId"[\s\S]*?\})\s*```/);
      if (toolCallMatch && !abortController.signal.aborted) {
        try {
          const parsed = JSON.parse(toolCallMatch[1]);
          if (parsed.toolId) {
            const toolCallReq: ToolCallRequest = {
              toolId: parsed.toolId,
              arguments: parsed.arguments || {},
              callId: parsed.callId || `tool-call-${Date.now()}`,
            };

            const requiresApproval = PermissionService.isPermissionRequired(parsed.toolId);

            let decision: PermissionDecision = 'ALLOW_ONCE';
            if (requiresApproval) {
              // Pause turn and request approval
              const pending: PendingToolApproval = {
                callId: toolCallReq.callId!,
                toolId: toolCallReq.toolId,
                arguments: toolCallReq.arguments,
                conversationId,
                messageId: assistantMessageId,
                requestedAt: new Date().toISOString(),
              };

              this.broadcastState({
                status: 'waiting_approval',
                pendingApproval: pending,
              });

              // Wait for user response
              decision = await new Promise<PermissionDecision>((resolve) => {
                this.pendingApprovals.set(pending.callId, { approval: pending, resolve });
              });

              this.broadcastState({
                status: 'running',
                pendingApproval: null,
              });
            }

            // Execute tool in Main process
            const execResult = await ToolExecutionService.executeTool(toolCallReq, decision);
            executedToolCalls.push({ request: toolCallReq, result: execResult });
          }
        } catch (parseErr) {
          console.warn('[AgentRuntimeService] Failed to parse tool block:', parseErr);
        }
      }

      // Finalize Turn in SQLite
      const finalAssistantText = aiResponse.content || accumulatedContent;
      const aiMeta: MessageMetadata = {
        provider: aiResponse.providerId,
        model: aiResponse.modelId,
        agentId: agent?.id,
        agentName: agent?.name,
        profileId: profile?.id,
        profileName: profile?.name,
        contextSummary: contextResult.contextSummary,
        toolCalls: executedToolCalls.length > 0 ? executedToolCalls : undefined,
        tokensUsage: aiResponse.usage
          ? {
              prompt: aiResponse.usage.promptTokens,
              completion: aiResponse.usage.completionTokens,
              total: aiResponse.usage.totalTokens,
            }
          : undefined,
      };

      db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, status, created_at, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        assistantMessageId,
        conversationId,
        'assistant',
        finalAssistantText,
        'sent',
        new Date().toISOString(),
        JSON.stringify(aiMeta)
      );

      this.broadcastState({
        status: 'completed',
        streamingMessageId: null,
        streamingContent: '',
        activeTurnId: null,
        pendingApproval: null,
      });
    } catch (err: any) {
      if (err.name === 'AbortError' || abortController.signal.aborted) {
        console.log('[AgentRuntimeService] Turn cancelled by user:', conversationId);
        if (accumulatedContent.trim()) {
          const aiMeta: MessageMetadata = { status: 'cancelled' };
          db.prepare(`
            INSERT INTO messages (id, conversation_id, role, content, status, created_at, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(assistantMessageId, conversationId, 'assistant', accumulatedContent, 'sent', new Date().toISOString(), JSON.stringify(aiMeta));
        }
        this.broadcastState({
          status: 'interrupted',
          streamingMessageId: null,
          streamingContent: '',
          activeTurnId: null,
          pendingApproval: null,
        });
      } else {
        console.error('[AgentRuntimeService] Error in execution loop:', err);
        const errContent = `Error: ${err.message || 'Failed to generate response'}`;
        const errMeta: MessageMetadata = { error: err.message };

        db.prepare(`
          INSERT INTO messages (id, conversation_id, role, content, status, created_at, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(assistantMessageId, conversationId, 'assistant', errContent, 'error', new Date().toISOString(), JSON.stringify(errMeta));

        this.broadcastState({
          status: 'error',
          streamingMessageId: null,
          streamingContent: '',
          activeTurnId: null,
          pendingApproval: null,
        });
      }
    } finally {
      this.activeAborts.delete(conversationId);
    }
  }

  /**
   * Responds to a pending tool approval request (inspired by Cline's askResponse).
   */
  public static respondToApproval(callId: string, decision: PermissionDecision): boolean {
    const pending = this.pendingApprovals.get(callId);
    if (!pending) {
      console.warn('[AgentRuntimeService] No pending approval found for callId:', callId);
      return false;
    }

    pending.resolve(decision);
    this.pendingApprovals.delete(callId);
    return true;
  }

  /**
   * Cancels the active turn.
   */
  public static cancelActiveTurn(conversationId: string): boolean {
    const controller = this.activeAborts.get(conversationId);
    if (controller) {
      controller.abort();
      this.activeAborts.delete(conversationId);
      return true;
    }
    return false;
  }
}
