import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { UserRole } from '@repo/contracts';
import { authenticateUser } from '../middleware/auth';
import { metricsService } from '../services/reporting/metricsService';
import { exportService } from '../services/reporting/exportService';
import { timelineService } from '../services/timelineService';
import { AuditEntry } from '../models/AuditEntry';

export const reportingRouter: Router = Router();

reportingRouter.use(authenticateUser);

/**
 * GET /api/v1/reporting/dashboard
 * Retrieve KPI metrics for the authenticated institute.
 */
reportingRouter.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!user.isSuperAdmin && req.query.instituteId && req.query.instituteId !== user.instituteId) {
      res.status(403).json({ success: false, error: { message: 'Forbidden: Cannot access another institute data' } });
      return;
    }

    const instituteId = user.isSuperAdmin
      ? (req.query.instituteId as string) || user.instituteId || ''
      : user.instituteId!;

    if (!instituteId) {
      res.status(400).json({ success: false, error: { message: 'Institute ID is required' } });
      return;
    }

    const metrics = await metricsService.getInstituteMetrics(instituteId, user);
    res.status(200).json({ success: true, data: metrics });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve metrics';
    const status = message.startsWith('Forbidden') ? 403 : 400;
    res.status(status).json({ success: false, error: { message } });
  }
});

/**
 * GET /api/v1/reporting/timeline/:applicationId
 * Get complete ordered timeline spanning M1–M9 for an application.
 */
reportingRouter.get('/timeline/:applicationId', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!user.isSuperAdmin && req.query.instituteId && req.query.instituteId !== user.instituteId) {
      res.status(403).json({ success: false, error: { message: 'Forbidden: Cannot access another institute data' } });
      return;
    }

    const applicationId = req.params.applicationId as string;

    const instituteId = user.isSuperAdmin
      ? (req.query.instituteId as string) || user.instituteId || ''
      : user.instituteId!;

    if (!applicationId || !instituteId) {
      res.status(400).json({ success: false, error: { message: 'Application ID and Institute ID are required' } });
      return;
    }

    const timeline = await timelineService.getTimeline(applicationId, instituteId);
    res.status(200).json({ success: true, data: timeline });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve timeline';
    const status = message.startsWith('Forbidden') ? 403 : 400;
    res.status(status).json({ success: false, error: { message } });
  }
});

/**
 * GET /api/v1/reporting/audit
 * Query append-only audit trail with tenant isolation and filtering.
 */
reportingRouter.get('/audit', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!user.isSuperAdmin && req.query.instituteId && req.query.instituteId !== user.instituteId) {
      res.status(403).json({ success: false, error: { message: 'Forbidden: Cannot access another institute data' } });
      return;
    }

    const instituteId = user.isSuperAdmin
      ? (req.query.instituteId as string) || user.instituteId || ''
      : user.instituteId!;

    if (!instituteId) {
      res.status(400).json({ success: false, error: { message: 'Institute ID is required' } });
      return;
    }

    const isStaff =
      user.roles.includes(UserRole.INSTITUTE_ADMIN) ||
      user.roles.includes(UserRole.VERIFICATION_OFFICER) ||
      user.isSuperAdmin;

    if (!isStaff) {
      res.status(403).json({ success: false, error: { message: 'Forbidden: Audit log requires staff permissions' } });
      return;
    }

    const filter: Record<string, unknown> = {
      instituteId: new mongoose.Types.ObjectId(instituteId),
    };

    if (req.query.resourceType) filter.resourceType = req.query.resourceType;
    if (req.query.resourceId) filter.resourceId = req.query.resourceId;
    if (req.query.action) filter.action = req.query.action;

    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
    const entries = await AuditEntry.find(filter).sort({ timestamp: -1 }).limit(limit);

    res.status(200).json({ success: true, data: entries });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve audit log';
    const status = message.startsWith('Forbidden') ? 403 : 400;
    res.status(status).json({ success: false, error: { message } });
  }
});

/**
 * GET /api/v1/reporting/export/applications
 * Export applications to CSV with formula injection defense.
 */
reportingRouter.get('/export/applications', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!user.isSuperAdmin && req.query.instituteId && req.query.instituteId !== user.instituteId) {
      res.status(403).json({ success: false, error: { message: 'Forbidden: Cannot access another institute data' } });
      return;
    }

    const instituteId = user.isSuperAdmin
      ? (req.query.instituteId as string) || user.instituteId || ''
      : user.instituteId!;

    if (!instituteId) {
      res.status(400).json({ success: false, error: { message: 'Institute ID is required' } });
      return;
    }

    const csvData = await exportService.exportApplicationsToCsv(instituteId, user);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="applications_export_${Date.now()}.csv"`);
    res.status(200).send(csvData);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to export applications';
    const status = message.startsWith('Forbidden') ? 403 : 400;
    res.status(status).json({ success: false, error: { message } });
  }
});
