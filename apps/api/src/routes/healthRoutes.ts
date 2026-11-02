import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import { config } from '../config/env';

export const healthRouter: Router = Router();

async function checkRedis(): Promise<'UP' | 'DOWN'> {
  try {
    const redis = new Redis(config.redisUrl, {
      lazyConnect: true,
      connectTimeout: 2000,
      maxRetriesPerRequest: 1,
    });
    await redis.connect();
    await redis.ping();
    await redis.quit();
    return 'UP';
  } catch {
    return 'DOWN';
  }
}

healthRouter.get('/liveness', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'UP', service: 'certischolar-node-api' });
});

healthRouter.get('/readiness', async (_req: Request, res: Response) => {
  const dbUp = mongoose.connection.readyState === 1;
  const redisStatus = await checkRedis();
  const isReady = dbUp && redisStatus === 'UP';

  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'READY' : 'NOT_READY',
    dependencies: {
      database: dbUp ? 'UP' : 'DOWN',
      redis: redisStatus,
    },
  });
});

healthRouter.get('/', async (_req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'UP' : 'DOWN';
  const redisStatus = await checkRedis();
  const overallHealthy = dbStatus === 'UP';

  res.status(overallHealthy ? 200 : 503).json({
    status: overallHealthy ? 'HEALTHY' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'certischolar-node-api',
    dependencies: {
      database: dbStatus,
      redis: redisStatus,
      storageDriver: config.storageDriver,
      scannerType: config.scannerType,
    },
  });
});

