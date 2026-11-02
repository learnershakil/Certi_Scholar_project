import mongoose from 'mongoose';
import Redis from 'ioredis';
import { app } from './app';
import { config } from './config/env';

/**
 * Connect to MongoDB with bounded exponential retry.
 * Prevents crash-looping if database container is cold-starting.
 */
async function connectMongoWithRetry(uri: string, maxRetries = 5, initialDelayMs = 1000): Promise<void> {
  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt < maxRetries) {
    attempt++;
    try {
      console.log(`[BOOT] Connecting to MongoDB (attempt ${attempt}/${maxRetries}): ${uri.replace(/\/\/.*@/, '//***@')}...`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log('[BOOT] MongoDB connected successfully.');
      return;
    } catch (err) {
      console.error(`[BOOT WARNING] MongoDB connection failed (attempt ${attempt}/${maxRetries}):`, (err as Error).message);
      if (attempt >= maxRetries) {
        throw new Error(`Failed to connect to MongoDB after ${maxRetries} attempts: ${(err as Error).message}`);
      }
      console.log(`[BOOT] Retrying MongoDB connection in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, 10000); // Exponential backoff capped at 10s
    }
  }
}

/**
 * Verify Redis connectivity for queue operations.
 */
async function verifyRedis(redisUrl: string): Promise<boolean> {
  try {
    const redis = new Redis(redisUrl, {
      lazyConnect: true,
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
    });
    await redis.connect();
    const pong = await redis.ping();
    await redis.quit();
    console.log(`[BOOT] Redis reachable (${pong}).`);
    return true;
  } catch (err) {
    console.warn(`[BOOT WARNING] Redis connection check failed: ${(err as Error).message}. BullMQ queues may be degraded.`);
    return false;
  }
}

async function bootstrap() {
  try {
    await connectMongoWithRetry(config.mongoUri);
    await verifyRedis(config.redisUrl);

    const server = app.listen(config.port, () => {
      console.log(`[BOOT] CertiScholar Node API running on http://localhost:${config.port}`);
      console.log(`[BOOT] Environment: ${config.env} | Storage Driver: ${config.storageDriver}`);
    });

    const gracefulShutdown = async (signal: string) => {
      console.log(`[SHUTDOWN] Received ${signal}. Initiating graceful shutdown...`);
      server.close(async () => {
        try {
          if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
            console.log('[SHUTDOWN] MongoDB connection closed.');
          }
        } catch (closeErr) {
          console.error('[SHUTDOWN ERROR] Error closing MongoDB connection:', closeErr);
        }
        console.log('[SHUTDOWN] Server closed gracefully.');
        process.exit(0);
      });

      // Force exit if not cleanly shut down within 10 seconds
      setTimeout(() => {
        console.error('[SHUTDOWN] Forced shutdown after timeout.');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (err) {
    console.error('[BOOT FATAL] Failed to start Node API:', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}


