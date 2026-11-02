import mongoose from 'mongoose';
import { createOcrWorker } from './workers/ocrWorker';
import { config } from './config/env';

/**
 * Dedicated background worker process entrypoint.
 * Connects to MongoDB with retry, instantiates BullMQ OCR worker,
 * and handles graceful termination signals.
 */
async function startWorker() {
  console.log('[WORKER BOOT] Starting CertiScholar background OCR worker...');

  let connected = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!connected && attempts < maxAttempts) {
    attempts++;
    try {
      console.log(`[WORKER BOOT] Connecting to MongoDB (attempt ${attempts}/${maxAttempts})...`);
      await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
      connected = true;
      console.log('[WORKER BOOT] MongoDB connected successfully.');
    } catch (err) {
      console.error(`[WORKER BOOT] MongoDB connection failed (attempt ${attempts}/${maxAttempts}):`, (err as Error).message);
      if (attempts >= maxAttempts) {
        console.error('[WORKER FATAL] Exhausted MongoDB connection retries. Exiting.');
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log(`[WORKER BOOT] Initializing OCR BullMQ worker on Redis ${config.redisHost}:${config.redisPort}...`);
  const worker = createOcrWorker();

  worker.on('ready', () => {
    console.log('[WORKER READY] OCR processing worker is ready and waiting for jobs.');
  });

  worker.on('active', (job) => {
    console.log(`[WORKER ACTIVE] Processing job ${job.id} for document ${job.data.documentId}`);
  });

  worker.on('completed', (job) => {
    console.log(`[WORKER COMPLETED] Successfully processed job ${job.id} for document ${job.data.documentId}`);
  });

  worker.on('error', (err) => {
    console.error('[WORKER ERROR] Worker experienced an error:', err.message);
  });

  const shutdown = async (signal: string) => {
    console.log(`[WORKER SHUTDOWN] Received ${signal}. Closing BullMQ worker...`);
    try {
      await worker.close();
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
      console.log('[WORKER SHUTDOWN] Worker shut down gracefully.');
      process.exit(0);
    } catch (err) {
      console.error('[WORKER SHUTDOWN ERROR]', err);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

if (process.env.NODE_ENV !== 'test') {
  startWorker().catch((err) => {
    console.error('[WORKER UNCAUGHT]', err);
    process.exit(1);
  });
}

