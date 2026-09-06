import { z } from 'zod';
import { FieldReviewStatus } from './extraction';

export const CorrectionActionSchema = z.object({
  fieldKey: z.string().min(1),
  action: z.enum(['APPROVE', 'CORRECT', 'MARK_UNREADABLE', 'REQUEST_REUPLOAD']),
  correctedValue: z.any().optional(),
  reason: z.string().min(3).max(500),
});

export type CorrectionActionDto = z.infer<typeof CorrectionActionSchema>;

export interface CorrectionRecord {
  id: string;
  documentId: string;
  applicationId: string;
  instituteId: string;
  fieldKey: string;
  originalValue: unknown;
  correctedValue: unknown;
  action: 'APPROVE' | 'CORRECT' | 'MARK_UNREADABLE' | 'REQUEST_REUPLOAD';
  reason: string;
  officerId: string;
  officerRole: string;
  officerName?: string;
  createdAt: string;
}

