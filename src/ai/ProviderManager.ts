import {
  IAIProvider,
  AIProviderId,
  AIProviderStatus,
  AIModel,
  AIChatMessage,
  AIChatCompletionOptions,
  AIChatResponse,
} from './types';
import { ProviderRegistry } from './ProviderRegistry';
import { MockProvider } from './providers/MockProvider';
import { OllamaProvider } from './providers/OllamaProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { OpenRouterProvider } from './providers/OpenRouterProvider';
import { GroqProvider } from './providers/GroqProvider';
import { LMStudioProvider } from './providers/LMStudioProvider';
import { CustomProvider } from './providers/CustomProvider';
import { AISettingsService } from '../services/AISettingsService';

export class ProviderManager {
  private static isInitialized = false;

  public static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const settings = AISettingsService.getAISettings();

    // Register all providers
    const providersList: IAIProvider[] = [
      new MockProvider(),
      new OllamaProvider(),
      new OpenAIProvider(),
      new AnthropicProvider(),
      new GeminiProvider(),
      new OpenRouterProvider(),
      new GroqProvider(),
      new LMStudioProvider(),
      new CustomProvider(),
    ];

    for (const p of providersList) {
      const pConfig = settings.providersConfig?.[p.id] || {};
      await p.initialize({
        providerId: p.id,
        baseUrl: (pConfig.baseUrl as string) || (p.id === 'ollama' ? settings.ollamaBaseUrl : undefined),
        activeModelId: (pConfig.activeModelId as string) || (p.id === 'ollama' ? settings.ollamaActiveModel : undefined),
        apiKey: (pConfig.apiKey as string) || undefined,
        isEnabled: pConfig.isEnabled !== false,
      });
      ProviderRegistry.registerProvider(p);
    }

    this.isInitialized = true;
  }

  public static async getActiveProvider(preferredId?: AIProviderId): Promise<IAIProvider> {
    await this.initialize();

    const settings = AISettingsService.getAISettings();
    const targetId = preferredId || settings.activeProviderId || 'ollama';

    if (!ProviderRegistry.hasProvider(targetId)) {
      return ProviderRegistry.getProvider('mock');
    }

    const provider = ProviderRegistry.getProvider(targetId);

    // Re-sync provider config with latest saved settings
    const pConfig = settings.providersConfig?.[targetId] || {};
    await provider.initialize({
      providerId: targetId,
      baseUrl: (pConfig.baseUrl as string) || (targetId === 'ollama' ? settings.ollamaBaseUrl : undefined),
      activeModelId: (pConfig.activeModelId as string) || (targetId === 'ollama' ? settings.ollamaActiveModel : undefined),
      apiKey: (pConfig.apiKey as string) || undefined,
      isEnabled: pConfig.isEnabled !== false,
    });

    return provider;
  }

  public static async getProviderStatuses(): Promise<AIProviderStatus[]> {
    await this.initialize();
    const providers = ProviderRegistry.getAllProviders();
    const statuses = await Promise.all(providers.map((p) => p.getStatus()));
    return statuses;
  }

  public static getCachedProviderStatuses(): AIProviderStatus[] {
    const providers = ProviderRegistry.getAllProviders();
    if (providers.length === 0) return [];
    return providers.map((p) => ({
      providerId: p.id as any,
      isConfigured: true,
      isAvailable: true,
    }));
  }

  public static async listModels(providerId?: AIProviderId): Promise<AIModel[]> {
    await this.initialize();
    const provider = await this.getActiveProvider(providerId);
    return provider.listModels();
  }

  public static async testConnection(
    providerId: AIProviderId,
    baseUrl?: string
  ): Promise<{ success: boolean; isAvailable: boolean; error?: string }> {
    await this.initialize();
    if (!ProviderRegistry.hasProvider(providerId)) {
      return { success: false, isAvailable: false, error: `Provider '${providerId}' not registered` };
    }

    const provider = ProviderRegistry.getProvider(providerId);
    if (baseUrl) {
      await provider.initialize({
        providerId,
        baseUrl,
        isEnabled: true,
      });
    }

    const isOk = await provider.isAvailable();
    return {
      success: isOk,
      isAvailable: isOk,
      error: isOk ? undefined : `Unreachable endpoint or missing credentials for provider '${providerId}'`,
    };
  }

  public static async generateResponse(
    messages: AIChatMessage[],
    options?: { providerId?: AIProviderId; modelId?: string; options?: AIChatCompletionOptions }
  ): Promise<AIChatResponse> {
    return this.generateStreamingResponse(messages, options);
  }

  public static async generateStreamingResponse(
    messages: AIChatMessage[],
    options?: { providerId?: AIProviderId; modelId?: string; options?: AIChatCompletionOptions },
    onToken?: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<AIChatResponse> {
    await this.initialize();

    const settings = AISettingsService.getAISettings();
    const provider = await this.getActiveProvider(options?.providerId);

    let selectedModel = options?.modelId;
    if (!selectedModel) {
      const pConfig = settings.providersConfig?.[provider.id];
      selectedModel = pConfig?.activeModelId || (provider.id === 'ollama' ? settings.ollamaActiveModel : undefined);
    }

    if (provider.generateStreamingCompletion) {
      return provider.generateStreamingCompletion(
        messages,
        { modelId: selectedModel, ...options?.options },
        onToken,
        signal
      );
    }

    // Fallback for non-streaming providers
    const response = await provider.generateChatCompletion(messages, {
      modelId: selectedModel,
      ...options?.options,
    });

    if (onToken && response.content) {
      onToken(response.content);
    }

    return response;
  }

  public static async updateOllamaConfig(): Promise<void> {
    const settings = AISettingsService.getAISettings();
    if (ProviderRegistry.hasProvider('ollama')) {
      const ollama = ProviderRegistry.getProvider('ollama');
      await ollama.initialize({
        providerId: 'ollama',
        baseUrl: settings.ollamaBaseUrl,
        activeModelId: settings.ollamaActiveModel,
        isEnabled: true,
      });
    }
  }

  public static async dispose(): Promise<void> {
    const providers = ProviderRegistry.getAllProviders();
    for (const p of providers) {
      if (p.dispose) {
        await p.dispose();
      }
    }
    ProviderRegistry.clear();
    this.isInitialized = false;
  }
}
