import { z } from 'zod';

export enum VerificationProviderType {
  DIGILOCKER = 'DIGILOCKER',
  CERTI_ADAPTER = 'CERTI_ADAPTER',
  MANUAL = 'MANUAL',
  SIMULATED = 'SIMULATED',
}

export const VerificationProviderTypeSchema = z.nativeEnum(VerificationProviderType);

export enum VerificationStatus {
  PENDING = 'PENDING',
  MATCHED = 'MATCHED',
  NOT_MATCHED = 'NOT_MATCHED',
  NOT_FOUND = 'NOT_FOUND',
  UNAVAILABLE = 'UNAVAILABLE',
  RETRYABLE_ERROR = 'RETRYABLE_ERROR',
  MANUAL_REVIEW_REQUIRED = 'MANUAL_REVIEW_REQUIRED',
  RETRIEVED_NOT_AUTHENTICITY_VERIFIED = 'RETRIEVED_NOT_AUTHENTICITY_VERIFIED',
  SIMULATED_MATCH = 'SIMULATED_MATCH',
  SIMULATED_NOT_MATCHED = 'SIMULATED_NOT_MATCHED',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}

export const VerificationStatusSchema = z.nativeEnum(VerificationStatus);

export interface VerificationConsentGrant {
  id: string;
  studentId: string;
  instituteId: string;
  applicationId: string;
  selectedDocumentIds: string[];
  purpose: string;
  durationDays: number;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  grantedAt: string;
  expiresAt: string;
  revokedAt?: string;
  revokedBy?: string;
}

export const CreateConsentGrantSchema = z.object({
  applicationId: z.string().min(1),
  instituteId: z.string().optional().default('660000000000000000000001'),
  selectedDocumentIds: z.array(z.string().min(1)).min(1),
  purpose: z.string().min(3).max(200),
  durationDays: z.number().int().min(1).max(90).default(30),
});

export type CreateConsentGrantDto = z.infer<typeof CreateConsentGrantSchema>;

export interface VerificationResultRecord {
  id: string;
  documentId: string;
  applicationId: string;
  instituteId: string;
  provider: VerificationProviderType;
  status: VerificationStatus;
  isAuthenticityVerified: boolean;
  retrievalOnly: boolean;
  isSimulated: boolean;
  evidenceReference?: string;
  issuerMetadata?: Record<string, unknown>;
  verifiedFields?: Record<string, boolean>;
  officerNotes?: string;
  verifiedAt: string;
}

