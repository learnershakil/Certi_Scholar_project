import { config } from '../config/env';
import { NormalizedOcrResult } from '@repo/contracts';

export interface OcrClientOptions {
  serviceUrl?: string;
  serviceKey?: string;
  timeoutMs?: number;
}

export class OcrClient {
  private serviceUrl: string;
  private serviceKey: string;
  private timeoutMs: number;

  constructor(options: OcrClientOptions = {}) {
    this.serviceUrl = options.serviceUrl || config.ocrServiceUrl;
    this.serviceKey = options.serviceKey || config.ocrServiceKey;
    this.timeoutMs = options.timeoutMs || 30000;
  }

  async processDocumentBuffer(
    documentId: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<NormalizedOcrResult> {
    const fileBase64 = buffer.toString('base64');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.serviceUrl}/api/v1/ocr/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ocr-service-key': this.serviceKey,
        },
        body: JSON.stringify({
          documentId,
          mimeType,
          fileBase64,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OCR service failed with status ${response.status}: ${errorText}`);
      }

      const result = (await response.json()) as NormalizedOcrResult;
      return result;
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        throw new Error(`OCR service timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  async checkHealth(): Promise<{ status: string; configured_provider: string }> {
    try {
      const res = await fetch(`${this.serviceUrl}/health`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`Health check returned ${res.status}`);
      return await res.json();
    } catch (err: unknown) {
      return {
        status: 'unreachable',
        configured_provider: 'unknown',
      };
    }
  }
}

export const ocrClient = new OcrClient();

