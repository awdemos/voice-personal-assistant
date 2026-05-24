import type { RateLimiter } from '../services/RateLimiter';

export interface GenerationRequest {
  text: string;
  systemPrompt?: string;
  imagePaths?: string[];
  modelId?: string;
  signal?: AbortSignal;
  fastMode?: boolean;
}

export interface StreamToken {
  text: string;
  done: boolean;
}

/**
 * Common interface for all LLM provider adapters.
 * Each adapter encapsulates one provider SDK, its configuration, and rate limiting.
 */
export interface LLMProvider {
  readonly name: string;
  readonly supportsVision: boolean;

  /**
   * Non-streaming generation. Returns the complete response text.
   */
  generate(request: GenerationRequest): Promise<string>;

  /**
   * Streaming generation. Yields tokens as they arrive.
   */
  streamGenerate?(request: GenerationRequest): AsyncIterable<StreamToken>;
}

/**
 * Base class with common scaffolding for cloud providers.
 */
export abstract class BaseProvider implements LLMProvider {
  abstract readonly name: string;
  abstract readonly supportsVision: boolean;

  protected constructor(
    protected readonly rateLimiter: RateLimiter
  ) {}

  abstract generate(request: GenerationRequest): Promise<string>;

  protected async acquireRateLimit(): Promise<void> {
    await this.rateLimiter.acquire();
  }

  protected buildMessages(
    text: string,
    systemPrompt?: string,
    imageParts?: unknown[]
  ): unknown[] {
    const messages: unknown[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    if (imageParts?.length) {
      messages.push({ role: 'user', content: [{ type: 'text', text }, ...imageParts] });
    } else {
      messages.push({ role: 'user', content: text });
    }
    return messages;
  }
}
