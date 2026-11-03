import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole, AuthSessionPayload } from '@repo/contracts';
import { config } from '../config/env';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: AuthSessionPayload;
    }
  }
}

/**
 * Extracts and verifies JWT bearer token.
 * Populates req.user.
 */
export function authenticateUser(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token required.',
      },
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthSessionPayload;
    req.user = payload;
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication token.',
      },
    });
  }
}

/**
 * Ensures user has at least one of the required roles.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      });
      return;
    }

    if (req.user.isSuperAdmin || req.user.role === UserRole.ADMIN) {
      return next();
    }

    const userRoles = req.user.roles || [req.user.role];
    const hasRole = userRoles.some((r) => allowedRoles.includes(r as UserRole));

    if (!hasRole) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_ROLE',
          message: `Forbidden: Requires one of [${allowedRoles.join(', ')}] permissions.`,
        },
      });
      return;
    }

    next();
  };
}
