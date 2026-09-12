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

    if (req.user.isSuperAdmin) {
      return next();
    }

    const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));
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

/**
 * Enforces tenant matching: authenticated user must belong to requested institute.
 */
export function requireTenantContext(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
    });
    return;
  }

  if (req.user.isSuperAdmin) {
    return next();
  }

  const requestedInstituteId =
    req.params.instituteId || req.body?.instituteId || req.query.instituteId;

  if (requestedInstituteId && req.user.instituteId !== requestedInstituteId) {
    res.status(403).json({
      success: false,
      error: {
        code: 'TENANT_MISMATCH',
        message: 'Forbidden: Cross-institute data access is strictly prohibited.',
      },
    });
    return;
  }

  next();
}

