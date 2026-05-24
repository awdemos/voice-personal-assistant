import fs from 'fs';
import OpenAI from 'openai';
import { createHash } from 'crypto';
import { BaseProvider } from './LLMProvider';
import type { GenerationRequest } from './LLMProvider';
import type { RateLimiter } from '../../services/RateLimiter';
import { CredentialsManager } from '../../services/CredentialsManager';
import { processImage, withRetry, withTimeout, MAX_OUTPUT_TOKENS } from './shared';

const OPENAI_MODEL = 'gpt-5.4';

function getOpenAiPromptCacheKey(systemPrompt?: string): string | undefined {
  if (!systemPrompt) return undefined;
  return createHash('sha256').update(systemPrompt).digest('hex').slice(0, 32);
}

function getClaudeMaxOutput(modelId: string): number {
  const id = modelId.toLowerCase();
  if (id.startsWith('claude-3-5-') || id.startsWith('claude-3-7-') || id.startsWith('claude-3-haiku')) return 8192;
  if (id.startsWith('claude-opus-4-')) return 32000;
  if (id.startsWith('claude-sonnet-4-') || id.startsWith('claude-haiku-4-5') || id.startsWith('claude-mythos')) return 64000;
  return 8192;
}

export class OpenAIAdapter extends BaseProvider {
  readonly name = 'openai';
  readonly supportsVision = true;

  private client: OpenAI | null = null;
  private lastKey: string | undefined;

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  reset(): void {
    this.client = null;
    this.lastKey = undefined;
  }

  getClient(): OpenAI {
    const apiKey = CredentialsManager.getInstance().getOpenaiApiKey();
    if (!apiKey) throw new Error('OpenAI client not initialized');
    if (!this.client || this.lastKey !== apiKey) {
      this.client = new OpenAI({ apiKey });
      this.lastKey = apiKey;
    }
    return this.client;
  }

  async generate(request: GenerationRequest): Promise<string> {
    const client = this.getClient();
    await this.acquireRateLimit();

    const model = request.modelId || OPENAI_MODEL;

    const messages: any[] = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }

    if (request.imagePaths?.length) {
      const contentParts: any[] = [{ type: 'text', text: request.text }];
      for (const p of request.imagePaths) {
        if (fs.existsSync(p)) {
          const { mimeType, data } = await processImage(p);
          contentParts.push({ type: 'image_url', image_url: { url: `data:${mimeType};base64,${data}` } });
        }
      }
      messages.push({ role: 'user', content: contentParts });
    } else {
      messages.push({ role: 'user', content: request.text });
    }

    const cacheKey = getOpenAiPromptCacheKey(request.systemPrompt);
    const response = await withTimeout(
      withRetry(() =>
        client.chat.completions.create({
          model,
          messages,
          max_completion_tokens: model.toLowerCase().includes('claude') ? getClaudeMaxOutput(model) : MAX_OUTPUT_TOKENS,
          ...(cacheKey ? { prompt_cache_key: cacheKey } : {}),
        })
      ),
      60000,
      `OpenAI (${model})`
    );

    return response.choices[0]?.message?.content || '';
  }
}
