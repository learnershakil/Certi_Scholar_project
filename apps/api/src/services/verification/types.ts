import { VerificationProviderType, VerificationStatus } from '@repo/contracts';

export interface VerificationContext {
  documentId: string;
  applicationId: string;
  instituteId: string;
  studentId: string;
  category: string;
  extractedFields?: Record<string, unknown>;
  consentGrantId?: string;
  manualEvidence?: {
    method: string;
    reference: string;
    notes: string;
    officerId: string;
  };
  simulatedScenario?: 'MATCH' | 'MISMATCH' | 'NOT_FOUND' | 'UNAVAILABLE';
}

export interface VerificationExecutionResult {
  provider: VerificationProviderType;
  status: VerificationStatus;
  isAuthenticityVerified: boolean;
  retrievalOnly: boolean;
  isSimulated: boolean;
  evidenceReference?: string;
  issuerMetadata?: Record<string, unknown>;
  verifiedFields?: Record<string, boolean>;
  notes?: string;
}

export interface IVerificationProvider {
  readonly providerType: VerificationProviderType;
  isAvailable(): boolean;
  verify(context: VerificationContext): Promise<VerificationExecutionResult>;
}
