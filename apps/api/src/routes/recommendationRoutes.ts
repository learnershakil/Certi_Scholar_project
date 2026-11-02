import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { recommendationService } from '../services/recommendation/recommendationService';

export const recommendationRouter: Router = Router();

recommendationRouter.use(authenticateUser);

/**
 * POST /api/v1/recommendations/generate
 * Synthesize M6 calculations, M7 verifications, and M8 rule evaluations into an explainable recommendation.
 */
recommendationRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { scholarshipId, applicationId } = req.body || {};

    if (!scholarshipId || !applicationId) {
      res.status(400).json({
        success: false,
        error: { message: 'Both scholarshipId and applicationId are required' },
      });
      return;
    }

    const recommendation = await recommendationService.generateRecommendation(
      scholarshipId,
      applicationId,
      user
    );

    res.status(200).json({
      success: true,
      data: recommendation,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate recommendation';
    const status = message.startsWith('Forbidden') ? 403 : message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: { message } });
  }
});

/**
 * GET /api/v1/recommendations/application/:applicationId
 * Retrieve recommendations for an application.
 */
recommendationRouter.get('/application/:applicationId', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { applicationId } = req.params;

    if (!applicationId) {
      res.status(400).json({ success: false, error: { message: 'Application ID is required' } });
      return;
    }

    const recommendations = await recommendationService.getRecommendationsByApplication(
      applicationId,
      user
    );

    res.status(200).json({
      success: true,
      data: recommendations,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve recommendations';
    const status = message.startsWith('Forbidden') ? 403 : 400;
    res.status(status).json({ success: false, error: { message } });
  }
});

/**
 * GET /api/v1/recommendations/:id
 * Retrieve a specific recommendation record by ID.
 */
recommendationRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const id = req.params.id as string;

    if (!id) {
      res.status(400).json({ success: false, error: { message: 'Recommendation ID is required' } });
      return;
    }

    const recommendation = await recommendationService.getRecommendationById(id, user);
    res.status(200).json({
      success: true,
      data: recommendation,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve recommendation';
    const status = message.startsWith('Forbidden') ? 403 : message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: { message } });
  }
});

