import mongoose from 'mongoose';
import { AuditEntry } from '../models/AuditEntry';

export interface RecordViewParams {
  instituteId: string;
  actorId: string;
  actorRole: string;
  documentId: string;
  ipAddress?: string;
  userAgent?: string;
  viewReason?: string;
  action?: 'DOCUMENT_VIEW_ACCESS_GRANTED' | 'PRESIGNED_URL_ISSUED' | 'DOCUMENT_VIEWED';
}

export interface RecordAuditParams {
  instituteId: string;
  actorId: string;
  actorRole: string;
  action: string;
  resourceType: 'DOCUMENT' | 'APPLICATION' | 'CORRECTION' | 'SCHOLARSHIP' | 'CONSENT' | 'AUTH';
  resourceId: string;
  ipAddress?: string;
  userAgent?: string;
  changes?: Record<string, unknown>;
}

export class AuditService {
  async recordDocumentView(params: RecordViewParams): Promise<void> {
    try {
      await AuditEntry.create({
        instituteId: new mongoose.Types.ObjectId(params.instituteId),
        actorId: params.actorId,
        actorRole: params.actorRole,
        action: params.action || 'PRESIGNED_URL_ISSUED',
        resourceType: 'DOCUMENT',
        resourceId: params.documentId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        viewReason: params.viewReason || 'Officer / Student authorized document access granted',
        timestamp: new Date(),
      });
    } catch (err) {
      console.error('Failed to log document view audit:', err);
    }
  }

  async recordAction(params: RecordAuditParams): Promise<void> {
    try {
      await AuditEntry.create({
        instituteId: new mongoose.Types.ObjectId(params.instituteId),
        actorId: params.actorId,
        actorRole: params.actorRole,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        changes: params.changes,
        timestamp: new Date(),
      });
    } catch (err) {
      console.error('Failed to log audit action:', err);
    }
  }
}

export const auditService = new AuditService();

