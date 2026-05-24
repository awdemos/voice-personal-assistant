import fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';
import { BaseProvider } from './LLMProvider';
import type { GenerationRequest } from './LLMProvider';
import type { RateLimiter } from '../../services/RateLimiter';
import { CredentialsManager } from '../../services/CredentialsManager';
import { processImage, withRetry, withTimeout, CLAUDE_MAX_OUTPUT_TOKENS } from './shared';

const CLAUDE_MODEL = 'claude-sonnet-4-6';

function getClaudeMaxOutput(modelId: string): number {
  const id = modelId.toLowerCase();
  if (id.startsWith('claude-3-5-') || id.startsWith('claude-3-7-') || id.startsWith('claude-3-haiku')) return 8192;
  if (id.startsWith('claude-opus-4-')) return 32000;
  if (id.startsWith('claude-sonnet-4-') || id.startsWith('claude-haiku-4-5') || id.startsWith('claude-mythos')) return 64000;
  return 8192;
}

function getClaudeCacheMinChars(modelId: string): number {
  const id = modelId.toLowerCase();
  if (id.startsWith('claude-opus-4-7') || id.startsWith('claude-opus-4-6') || id.startsWith('claude-opus-4-5') || id.startsWith('claude-haiku-4-5')) return 4096 * 4;
  if (id.startsWith('claude-sonnet-4-6')) return 2048 * 4;
  if (id.startsWith('claude-3-5-haiku') || id.startsWith('claude-haiku-3-5')) return 2048 * 4;
  if (id.startsWith('claude-')) return 1024 * 4;
  return 4096 * 4;
}

function buildClaudeSystemBlocks(systemPrompt: string, modelId: string): Array<{
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral' };
}> {
  const minChars = getClaudeCacheMinChars(modelId);
  const canCache = systemPrompt.length >= minChars;

  const blocks: Array<{ type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }> = [
    canCache
      ? { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }
      : { type: 'text', text: systemPrompt },
  ];

  return blocks;
}

export class ClaudeAdapter extends BaseProvider {
  readonly name = 'claude';
  readonly supportsVision = true;

  private client: Anthropic | null = null;
  private lastKey: string | undefined;
  private cacheFirstHitLogged: boolean = false;

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  reset(): void {
    this.client = null;
    this.lastKey = undefined;
  }

  getClient(): Anthropic {
    const apiKey = CredentialsManager.getInstance().getClaudeApiKey();
    if (!apiKey) throw new Error('Claude client not initialized');
    if (!this.client || this.lastKey !== apiKey) {
      this.client = new Anthropic({ apiKey });
      this.lastKey = apiKey;
    }
    return this.client;
  }

  async generate(request: GenerationRequest): Promise<string> {
    const client = this.getClient();
    await this.acquireRateLimit();

    const model = request.modelId || CLAUDE_MODEL;

    const content: any[] = [];
    if (request.imagePaths?.length) {
      for (const p of request.imagePaths) {
        if (fs.existsSync(p)) {
          const { mimeType, data } = await processImage(p);
          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data,
            },
          });
        }
      }
    }
    content.push({ type: 'text', text: request.text });

    const response = await withTimeout(
      withRetry(async () => {
        const stream = client.messages.stream({
          model,
          max_tokens: getClaudeMaxOutput(model),
          ...(request.systemPrompt ? { system: buildClaudeSystemBlocks(request.systemPrompt, model) } : {}),
          messages: [{ role: 'user', content }],
        });
        return await stream.finalMessage();
      }),
      120000,
      `Claude (${model})`
    );

    if (!this.cacheFirstHitLogged) {
      const usage: any = (response as any).usage;
      const cacheRead = usage?.cache_read_input_tokens || 0;
      const cacheCreate = usage?.cache_creation_input_tokens || 0;
      if (cacheRead > 0) {
        console.log(`[ClaudeAdapter] Claude prompt cache HIT: ${cacheRead} cached tokens (model=${model}, write=${cacheCreate})`);
        this.cacheFirstHitLogged = true;
      } else if (cacheCreate > 0) {
        console.log(`[ClaudeAdapter] Claude prompt cache WRITE: ${cacheCreate} tokens cached (model=${model}) — subsequent turns should HIT`);
      }
    }

    const textBlock = response.content.find((block: any) => block.type === 'text') as any;
    return textBlock?.text || '';
  }
}
