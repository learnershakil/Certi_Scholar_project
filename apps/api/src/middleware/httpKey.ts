import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config/env';

/**
 * Validates the server-only x-http-key header sent from Next.js BFF.
 * Employs constant-time string comparison to prevent timing attacks.
 */
export function validateHttpKey(req: Request, res: Response, next: NextFunction): void {
  // Allow health checks without key for container orchestrators if needed
  if (req.path === '/api/v1/health' || req.path === '/health') {
    return next();
  }

  const incomingKey = req.headers['x-http-key'];

  if (!incomingKey || typeof incomingKey !== 'string') {
    res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_HTTP_KEY',
        message: 'Unauthorized: Missing mandatory x-http-key service header.',
      },
    });
    return;
  }

  const expectedKey = config.httpKey;

  // Safe constant-time comparison
  const incomingBuffer = Buffer.from(incomingKey);
  const expectedBuffer = Buffer.from(expectedKey);

  if (
    incomingBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(incomingBuffer, expectedBuffer)
  ) {
    res.status(403).json({
      success: false,
      error: {
        code: 'INVALID_HTTP_KEY',
        message: 'Forbidden: Invalid x-http-key service header.',
      },
    });
    return;
  }

  next();
}

