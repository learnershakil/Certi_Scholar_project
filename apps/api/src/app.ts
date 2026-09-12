import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { validateHttpKey } from './middleware/httpKey';
import { apiRouter } from './routes';
import { config } from './config/env';

export const app: express.Express = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.appUrl,
    credentials: true,
  })
);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Mandatory Next.js BFF proxy key validation for all API routes
app.use('/api/v1', validateHttpKey);

// Mount versioned API routes
app.use('/api/v1', apiRouter);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Endpoint ${req.method} ${req.originalUrl} not found.`,
    },
  });
});

// Central Error Handler
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  console.error(`[API ERROR] ${req.method} ${req.path}:`, err);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.env === 'production' ? 'An unexpected error occurred.' : message,
    },
  });
});
