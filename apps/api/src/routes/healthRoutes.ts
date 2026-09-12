import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { config } from '../config/env';

export const healthRouter: Router = Router();

healthRouter.get('/', async (_req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'UP' : 'DOWN';

  res.json({
    status: dbStatus === 'UP' ? 'HEALTHY' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'certischolar-node-api',
    dependencies: {
      database: dbStatus,
      storageDriver: config.storageDriver,
      scannerType: config.scannerType,
    },
  });
});
