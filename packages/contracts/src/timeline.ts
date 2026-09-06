import { z } from 'zod';

export enum TimelineEventType {
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  VALIDATION_PASSED = 'VALIDATION_PASSED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  MALWARE_SCAN_CLEAN = 'MALWARE_SCAN_CLEAN',
  MALWARE_SCAN_QUARANTINED = 'MALWARE_SCAN_QUARANTINED',
  OCR_QUEUED = 'OCR_QUEUED',
  OCR_COMPLETED = 'OCR_COMPLETED',
  DOCUMENT_CLASSIFIED = 'DOCUMENT_CLASSIFIED',
  FIELDS_EXTRACTED = 'FIELDS_EXTRACTED',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
  FIELD_CORRECTED = 'FIELD_CORRECTED',
  CONSISTENCY_CALCULATED = 'CONSISTENCY_CALCULATED',
  VERIFICATION_REQUESTED = 'VERIFICATION_REQUESTED',
  VERIFICATION_COMPLETED = 'VERIFICATION_COMPLETED',
  CONSENT_GRANTED = 'CONSENT_GRANTED',
  CONSENT_REVOKED = 'CONSENT_REVOKED',
  SCHOLARSHIP_EVALUATED = 'SCHOLARSHIP_EVALUATED',
  RECOMMENDATION_GENERATED = 'RECOMMENDATION_GENERATED',
  AWARD_APPROVED = 'AWARD_APPROVED',
  AWARD_REJECTED = 'AWARD_REJECTED',
}

export interface TimelineEventRecord {
  id: string;
  applicationId: string;
  documentId?: string;
  instituteId: string;
  type: TimelineEventType;
  actorId?: string;
  actorRole?: string;
  actorName?: string;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface AuditEntryRecord {
  id: string;
  instituteId: string;
  actorId: string;
  actorRole: string;
  action: string;
  resourceType: 'DOCUMENT' | 'APPLICATION' | 'CORRECTION' | 'SCHOLARSHIP' | 'CONSENT' | 'AUTH';
  resourceId: string;
  ipAddress?: string;
  userAgent?: string;
  viewReason?: string;
  changes?: {
    field?: string;
    before?: unknown;
    after?: unknown;
  };
  timestamp: string;
}

export interface DashboardMetrics {
  instituteId: string;
  totalApplications: number;
  totalDocumentsProcessed: number;
  autoAcceptedCount: number;
  humanReviewedCount: number;
  consistencyDiscrepancies: number;
  verificationPassRate: number;
  averageProcessingTimeSeconds: number;
  accuracyByField: Record<string, { total: number; corrected: number; accuracyPercentage: number }>;
}

