import fs from 'fs';
import sharp from 'sharp';

export const MAX_OUTPUT_TOKENS = 65536;
export const CLAUDE_MAX_OUTPUT_TOKENS = 64000;

export async function processImage(path: string): Promise<{ mimeType: string; data: string }> {
  try {
    const imageBuffer = await fs.promises.readFile(path);
    const processedBuffer = await sharp(imageBuffer)
      .resize({
        width: 1536,
        height: 1536,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    return {
      mimeType: 'image/jpeg',
      data: processedBuffer.toString('base64'),
    };
  } catch (error) {
    console.error('[AdapterShared] Failed to process image with sharp:', error);
    const data = await fs.promises.readFile(path);
    return {
      mimeType: 'image/png',
      data: data.toString('base64'),
    };
  }
}

export async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let delay = 400;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      const msg = e.message || '';
      const status = e.status ?? e.statusCode ?? 0;
      const isRetryable =
        msg.includes('503') ||
        msg.includes('overloaded') ||
        status === 529 ||
        status === 429 ||
        status === 500 ||
        msg.includes('rate_limit') ||
        msg.includes('rate limit');
      if (!isRetryable) throw e;

      console.warn(`[AdapterShared] Transient error (${status || msg.slice(0, 40)}). Retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }
  throw new Error('Model busy, try again');
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)),
      timeoutMs
    );
  });

  promise.catch(() => {});

  return Promise.race([
    promise.then((result) => {
      clearTimeout(timeoutHandle!);
      return result;
    }),
    timeoutPromise,
  ]);
}
