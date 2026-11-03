import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateUser, requireRole } from '../middleware/auth';
import { UserRole } from '@repo/contracts';
import { caseAssignmentService } from '../services/caseAssignmentService';
import { SINGLE_ORG_ID_STR } from '../config/constants';

const AssignCaseSchema = z.object({
  instituteId: z.string().optional(),
  applicationId: z.string().min(1),
  documentId: z.string().optional(),
  officerId: z.string().min(1),
  notes: z.string().max(1000).optional(),
});

export const caseAssignmentRouter: Router = Router();

caseAssignmentRouter.use(authenticateUser);

/**
 * Assign a case to a verification officer.
 * Restricted to Admins.
 */
caseAssignmentRouter.post(
  '/assign',
  requireRole(UserRole.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const parsed = AssignCaseSchema.parse(req.body);
      const actor = req.user!;
      const orgId = parsed.instituteId || actor.instituteId || SINGLE_ORG_ID_STR;

      if (!actor.isSuperAdmin && actor.instituteId && parsed.instituteId && actor.instituteId !== parsed.instituteId) {
        return res.status(403).json({
          success: false,
          error: { message: 'Forbidden: Unauthorized cross-tenant case assignment' },
        });
      }

      const assignment = await caseAssignmentService.assignCase(
        {
          instituteId: orgId,
          applicationId: parsed.applicationId,
          documentId: parsed.documentId,
          officerId: parsed.officerId,
          notes: parsed.notes,
        },
        actor
      );

      res.status(201).json({
        success: true,
        data: assignment,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to assign case';
      const status = message.toLowerCase().includes('forbidden') ? 403 : 400;
      res.status(status).json({ success: false, error: { message } });
    }
  }
);

/**
 * Verification Officer lists their own active assignments.
 */
caseAssignmentRouter.get(
  '/my-assignments',
  requireRole(UserRole.OFFICER, UserRole.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const actor = req.user!;
      const orgId = actor.instituteId || SINGLE_ORG_ID_STR;

      const assignments = await caseAssignmentService.getOfficerAssignments(
        orgId,
        actor.userId
      );

      res.json({
        success: true,
        data: assignments,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve assignments';
      res.status(500).json({ success: false, error: { message } });
    }
  }
);

/**
 * Admin lists all assignments in organization.
 */
caseAssignmentRouter.get(
  '/',
  requireRole(UserRole.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const actor = req.user!;
      const orgId = actor.instituteId || SINGLE_ORG_ID_STR;

      const assignments = await caseAssignmentService.getAllInstituteAssignments(orgId);

      res.json({
        success: true,
        data: assignments,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve assignments';
      res.status(500).json({ success: false, error: { message } });
    }
  }
);
