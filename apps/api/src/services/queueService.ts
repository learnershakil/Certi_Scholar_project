import { Queue } from 'bullmq';
import { config } from '../config/env';

export interface OcrJobData {
  documentId: string;
  instituteId: string;
  cleanStorageKey: string;
  mimeType: string;
  fileSizeBytes: number;
}

// Check if running in test environment to avoid dangling open Redis connections if not needed
export const isTestEnv = process.env.NODE_ENV === 'test';

let ocrQueueInstance: Queue<OcrJobData> | null = null;

export function getOcrQueue(): Queue<OcrJobData> {
  if (!ocrQueueInstance) {
    ocrQueueInstance = new Queue<OcrJobData>('ocr-processing', {
      connection: {
        host: config.redisHost,
        port: config.redisPort,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }
  return ocrQueueInstance;
}

export async function enqueueOcrJob(data: OcrJobData): Promise<string> {
  const queue = getOcrQueue();
  // Idempotency: Use documentId as job ID so duplicate submissions do not duplicate work
  const job = await queue.add('extract-text', data, {
    jobId: `ocr-${data.documentId}`,
  });
  return job.id!;
}

export async function closeOcrQueue(): Promise<void> {
  if (ocrQueueInstance) {
    await ocrQueueInstance.close();
    ocrQueueInstance = null;
  }
}
