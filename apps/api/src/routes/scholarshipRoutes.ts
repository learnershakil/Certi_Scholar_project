import { Router, Request, Response } from 'express';
import { CreateScholarshipSchema, ConditionGroupSchema } from '@repo/contracts';
import { authenticateUser } from '../middleware/auth';
import { scholarshipService } from '../services/rules/scholarshipService';

export const scholarshipRouter: Router = Router();

scholarshipRouter.use(authenticateUser);

/**
 * POST /api/v1/scholarships
 * Create a new scholarship and its JSON rule AST.
 */
scholarshipRouter.post('/', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const parsed = CreateScholarshipSchema.parse(req.body);

    const scholarship = await scholarshipService.createScholarship(parsed, user);
    res.status(201).json({ success: true, data: scholarship });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create scholarship';
    const status = message.startsWith('Forbidden') ? 403 : message.includes('already exists') ? 409 : 400;
    res.status(status).json({ success: false, error: { message } });
  }
});

/**
 * GET /api/v1/scholarships
 * List all scholarships for the authenticated institute.
 */
scholarshipRouter.get('/', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const instituteId = user.isSuperAdmin
      ? (req.query.instituteId as string) || user.instituteId || ''
      : user.instituteId!;

    if (!instituteId) {
      res.status(400).json({ success: false, error: { message: 'Institute ID is required' } });
      return;
    }

    const scholarships = await scholarshipService.listScholarships(instituteId, user);
    res.status(200).json({ success: true, data: scholarships });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list scholarships';
    const status = message.startsWith('Forbidden') ? 403 : 400;
    res.status(status).json({ success: false, error: { message } });
  }
});

/**
 * POST /api/v1/scholarships/rules/test
 * Test harness: Evaluate hypothetical applicant data against an AST without database mutation.
 */
scholarshipRouter.post('/rules/test', async (req: Request, res: Response) => {
  try {
    const { ruleAst, applicantFacts } = req.body || {};
    if (!ruleAst || !applicantFacts) {
      res.status(400).json({
        success: false,
        error: { message: 'Both ruleAst and applicantFacts are required for hypothetical testing' },
      });
      return;
    }

    const parsedRule = ConditionGroupSchema.parse(ruleAst);
    const result = scholarshipService.testHypotheticalRule(parsedRule, applicantFacts);

    res.status(200).json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to test hypothetical rule';
    res.status(400).json({ success: false, error: { message } });
  }
});

/**
 * GET /api/v1/scholarships/:id
 * Retrieve a scholarship by ID.
 */
scholarshipRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const id = req.params.id as string;
    if (!id) {
      res.status(400).json({ success: false, error: { message: 'Scholarship ID is required' } });
      return;
    }

    const scholarship = await scholarshipService.getScholarship(id, user);
    res.status(200).json({ success: true, data: scholarship });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve scholarship';
    const status = message.startsWith('Forbidden') ? 403 : message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: { message } });
  }
});

/**
 * PATCH /api/v1/scholarships/:id
 * Update a scholarship. Increments rule version if rule AST was modified.
 */
scholarshipRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const id = req.params.id as string;
    if (!id) {
      res.status(400).json({ success: false, error: { message: 'Scholarship ID is required' } });
      return;
    }

    const updated = await scholarshipService.updateScholarship(id, req.body, user);
    res.status(200).json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update scholarship';
    const status = message.startsWith('Forbidden') ? 403 : message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: { message } });
  }
});

/**
 * POST /api/v1/scholarships/:id/evaluate
 * Evaluate a real application against a scholarship rule using verified documents and extracted facts.
 */
scholarshipRouter.post('/:id/evaluate', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const id = req.params.id as string;
    const { applicationId } = req.body || {};

    if (!id || !applicationId) {
      res.status(400).json({
        success: false,
        error: { message: 'Both scholarship ID and applicationId are required' },
      });
      return;
    }

    const result = await scholarshipService.evaluateApplication(id, applicationId, user);
    res.status(200).json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to evaluate scholarship rule';
    const status = message.startsWith('Forbidden') ? 403 : message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: { message } });
  }
});
