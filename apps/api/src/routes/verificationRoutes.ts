import { Router, Request, Response } from 'express';
import { CreateConsentGrantSchema } from '@repo/contracts';
import { authenticateUser } from '../middleware/auth';
import { verificationService } from '../services/verification/verificationService';
import { verificationProviderFactory } from '../services/verification/providerFactory';

export const verificationRouter: Router = Router();

verificationRouter.use(authenticateUser);

/**
 * GET /api/v1/verification/providers
 * List supported verification providers and whether they are currently available/configured.
 */
verificationRouter.get('/providers', async (_req: Request, res: Response) => {
  const providers = verificationProviderFactory.listAvailableProviders();
  res.status(200).json({ success: true, data: providers });
});

/**
 * POST /api/v1/verification/consent
 * Create a first-party Certi Adapter locker consent grant (30-day default).
 */
verificationRouter.post('/consent', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const parsed = CreateConsentGrantSchema.parse(req.body);

    const grant = await verificationService.createConsentGrant(parsed, user);
    res.status(201).json({ success: true, data: grant });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create consent grant';
    const status = message.startsWith('Forbidden') ? 403 : 400;
    res.status(status).json({ success: false, error: { message } });
  }
});

/**
 * POST /api/v1/verification/consent/:id/revoke
 * Student revokes consent grant; future locker fetches are stopped immediately.
 */
verificationRouter.post('/consent/:id/revoke', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const grantId = req.params.id as string;
    const reason = req.body.reason || 'Revoked by student';

    const grant = await verificationService.revokeConsentGrant(grantId, reason, user);
    res.status(200).json({ success: true, data: grant });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to revoke consent grant';
    const status = message.startsWith('Forbidden') ? 403 : message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: { message } });
  }
});

