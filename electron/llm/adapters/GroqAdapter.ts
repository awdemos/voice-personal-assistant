import fs from 'fs';
import Groq from 'groq-sdk';
import { BaseProvider } from './LLMProvider';
import type { GenerationRequest } from './LLMProvider';
import type { RateLimiter } from '../../services/RateLimiter';
import { CredentialsManager } from '../../services/CredentialsManager';
import { processImage } from './shared';

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

export class GroqAdapter extends BaseProvider {
  readonly name = 'groq';
  readonly supportsVision = true;

  private client: Groq | null = null;
  private lastKey: string | undefined;

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  reset(): void {
    this.client = null;
    this.lastKey = undefined;
  }

  getClient(): Groq {
    const apiKey = CredentialsManager.getInstance().getGroqApiKey();
    if (!apiKey) throw new Error('Groq client not initialized');
    if (!this.client || this.lastKey !== apiKey) {
      this.client = new Groq({ apiKey });
      this.lastKey = apiKey;
    }
    return this.client;
  }

  async generate(request: GenerationRequest): Promise<string> {
    const client = this.getClient();
    await this.acquireRateLimit();

    const messages: any[] = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }

    const isMultimodal = request.imagePaths && request.imagePaths.length > 0;

    if (isMultimodal) {
      const contentParts: any[] = [{ type: 'text', text: request.text }];
      for (const p of request.imagePaths!) {
        if (fs.existsSync(p)) {
          const { mimeType, data } = await processImage(p);
          contentParts.push({ type: 'image_url', image_url: { url: `data:${mimeType};base64,${data}` } });
        }
      }
      messages.push({ role: 'user', content: contentParts });

      const response = await client.chat.completions.create({
        model: GROQ_VISION_MODEL,
        messages,
        temperature: 1,
        max_completion_tokens: 28672,
        top_p: 1,
        stream: false,
        stop: null,
      });

      return response.choices[0]?.message?.content || '';
    }

    messages.push({ role: 'user', content: request.text });

    const response = await client.chat.completions.create({
      model: request.modelId || GROQ_MODEL,
      messages,
      temperature: 0.4,
      max_tokens: 8192,
      stream: false,
    });

    return response.choices[0]?.message?.content || '';
  }
}
