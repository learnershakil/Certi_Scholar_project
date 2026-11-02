import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateUser, requireRole } from '../middleware/auth';
import { UserRole } from '@repo/contracts';
import { caseAssignmentService } from '../services/caseAssignmentService';

const AssignCaseSchema = z.object({
  instituteId: z.string().min(1),
  applicationId: z.string().min(1),
  documentId: z.string().optional(),
  officerId: z.string().min(1),
  notes: z.string().max(1000).optional(),
});

export const caseAssignmentRouter: Router = Router();

caseAssignmentRouter.use(authenticateUser);

/**
 * Assign a case to a verification officer.
 * Restricted to Institute Admins and Super Admins.
 */
caseAssignmentRouter.post(
  '/assign',
  requireRole(UserRole.INSTITUTE_ADMIN),
  async (req: Request, res: Response) => {
    try {
      const parsed = AssignCaseSchema.parse(req.body);
      const actor = req.user!;

      // Enforce tenant boundary
      if (!actor.isSuperAdmin && actor.instituteId !== parsed.instituteId) {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: Cannot assign cases for another institute' },
        });
        return;
      }

      const assignment = await caseAssignmentService.assignCase(parsed, actor);
      res.status(201).json({
        success: true,
        data: assignment,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to assign case';
      res.status(400).json({ success: false, error: { message } });
    }
  }
);

/**
 * Verification Officer lists their own active assignments.
 */
caseAssignmentRouter.get(
  '/my-assignments',
  requireRole(UserRole.VERIFICATION_OFFICER),
  async (req: Request, res: Response) => {
    try {
      const actor = req.user!;
      if (!actor.instituteId) {
        res.status(400).json({ success: false, error: { message: 'No institute affiliated with user' } });
        return;
      }

      const assignments = await caseAssignmentService.getOfficerAssignments(
        actor.instituteId,
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
 * Institute Admin lists all assignments in their institute.
 */
caseAssignmentRouter.get(
  '/',
  requireRole(UserRole.INSTITUTE_ADMIN),
  async (req: Request, res: Response) => {
    try {
      const actor = req.user!;
      const instituteId = actor.isSuperAdmin
        ? (req.query.instituteId as string) || actor.instituteId || ''
        : actor.instituteId!;

      if (!instituteId) {
        res.status(400).json({ success: false, error: { message: 'Institute ID is required' } });
        return;
      }

      const assignments = await caseAssignmentService.getAllInstituteAssignments(instituteId);
      res.json({
        success: true,
        data: assignments,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve institute assignments';
      res.status(500).json({ success: false, error: { message } });
    }
  }
);

