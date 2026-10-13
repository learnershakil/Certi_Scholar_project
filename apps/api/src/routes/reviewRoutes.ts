import { Router, Request, Response } from 'express';
import { CorrectionActionSchema, UserRole } from '@repo/contracts';
import { authenticateUser } from '../middleware/auth';
import { reviewService } from '../services/reviewService';

export const reviewRouter: Router = Router();

// All review routes require user authentication
reviewRouter.use(authenticateUser);

/**
 * GET /api/v1/review/queue
 * Retrieve queue of documents pending review for the officer's institute.
 */
reviewRouter.get('/queue', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const isAuthorizedStaff =
      user.roles.includes(UserRole.VERIFICATION_OFFICER) ||
      user.roles.includes(UserRole.INSTITUTE_ADMIN) ||
      user.isSuperAdmin;

    if (!isAuthorizedStaff) {
      res.status(403).json({
        success: false,
        error: { message: 'Forbidden: Human review queue requires Verification Officer or Institute Admin role' },
      });
      return;
    }

    const instituteId = user.isSuperAdmin
      ? (req.query.instituteId as string) || user.instituteId || ''
      : user.instituteId!;

    if (!instituteId) {
      res.status(400).json({
        success: false,
        error: { message: 'Institute ID is required to fetch review queue' },
      });
      return;
    }

    const category = req.query.category as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const result = await reviewService.getReviewQueue({
      instituteId,
      category,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve review queue';
    res.status(500).json({ success: false, error: { message } });
  }
});

/**
 * GET /api/v1/review/:documentId
 * Fetch side-by-side review payload: document details, presigned view URL, OCR tokens,
 * extracted fields with coordinates, and correction history.
 */
reviewRouter.get('/:documentId', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const documentId = req.params.documentId as string;
    if (!documentId) {
      res.status(400).json({ success: false, error: { message: 'Document ID is required' } });
      return;
    }

    const details = await reviewService.getDocumentReviewDetails(documentId, user);

    res.status(200).json({
      success: true,
      data: details,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve document review details';
    const status = message.startsWith('Forbidden') ? 403 : message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: { message } });
  }
});

/**
 * POST /api/v1/review/:documentId/action
 * Apply human review action (APPROVE, CORRECT, MARK_UNREADABLE, REQUEST_REUPLOAD)
 * with optimistic locking and required reason.
 */
reviewRouter.post('/:documentId/action', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const documentId = req.params.documentId as string;
    if (!documentId) {
      res.status(400).json({ success: false, error: { message: 'Document ID is required' } });
      return;
    }

    const parsed = CorrectionActionSchema.parse(req.body);
    const expectedVersion =
      parsed.expectedVersion ??
      (req.headers['if-match'] ? parseInt(req.headers['if-match'] as string, 10) : undefined);

    const result = await reviewService.applyReviewAction(
      documentId,
      parsed,
      user,
      expectedVersion
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to apply review action';
    let status = 400;
    if (message.startsWith('Forbidden')) status = 403;
    else if (message.includes('not found')) status = 404;
    else if (message.includes('Optimistic lock conflict')) status = 409;

    res.status(status).json({ success: false, error: { message } });
  }
});
