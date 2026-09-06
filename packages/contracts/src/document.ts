import { z } from 'zod';

export enum DocumentProcessingState {
  RECEIVED = 'RECEIVED',
  VALIDATING = 'VALIDATING',
  QUARANTINED = 'QUARANTINED',
  CLEAN = 'CLEAN',
  STORED = 'STORED',
  PROCESSING_QUEUED = 'PROCESSING_QUEUED',
  OCR_IN_PROGRESS = 'OCR_IN_PROGRESS',
  CLASSIFIED = 'CLASSIFIED',
  EXTRACTED = 'EXTRACTED',
  PENDING_REVIEW = 'PENDING_REVIEW',
  REVIEWED = 'REVIEWED',
  CALCULATED = 'CALCULATED',
  VERIFICATION_PENDING = 'VERIFICATION_PENDING',
  VERIFIED = 'VERIFIED',
  COMPLETED = 'COMPLETED',
  REJECTED_INVALID_TYPE = 'REJECTED_INVALID_TYPE',
  REJECTED_TOO_LARGE = 'REJECTED_TOO_LARGE',
  REJECTED_CORRUPT = 'REJECTED_CORRUPT',
  QUARANTINED_MALWARE = 'QUARANTINED_MALWARE',
  SCAN_FAILED_RETRYABLE = 'SCAN_FAILED_RETRYABLE',
  FAILED = 'FAILED',
}

export const DocumentProcessingStateSchema = z.nativeEnum(DocumentProcessingState);

export enum DocumentTypeCategory {
  ACADEMIC_MARKSHEET = 'ACADEMIC_MARKSHEET',
  INCOME_CERTIFICATE = 'INCOME_CERTIFICATE',
  IDENTITY_DOCUMENT = 'IDENTITY_DOCUMENT',
  PAN_CARD = 'PAN_CARD',
  AADHAAR_DOCUMENT = 'AADHAAR_DOCUMENT',
  CASTE_CERTIFICATE = 'CASTE_CERTIFICATE',
  DOMICILE_CERTIFICATE = 'DOMICILE_CERTIFICATE',
  UNKNOWN = 'UNKNOWN',
}

export const DocumentTypeCategorySchema = z.nativeEnum(DocumentTypeCategory);

export enum ScanState {
  PENDING = 'PENDING',
  SCANNING = 'SCANNING',
  CLEAN = 'CLEAN',
  INFECTED = 'INFECTED',
  SUSPICIOUS = 'SUSPICIOUS',
  FAILED = 'FAILED',
}

export const ScanStateSchema = z.nativeEnum(ScanState);

export const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'] as const;
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export const MAX_FILE_SIZE_DEFAULT = 10 * 1024 * 1024; // 10 MB

export const CreateDocumentUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.enum(ALLOWED_MIME_TYPES),
  fileSize: z.number().positive().max(MAX_FILE_SIZE_DEFAULT),
  applicationId: z.string().min(1),
  instituteId: z.string().min(1),
  categoryHint: DocumentTypeCategorySchema.optional(),
});

export type CreateDocumentUploadDto = z.infer<typeof CreateDocumentUploadSchema>;

export const CompleteUploadSchema = z.object({
  documentId: z.string().min(1),
  checksumSha256: z.string().min(32),
});

export type CompleteUploadDto = z.infer<typeof CompleteUploadSchema>;

export interface DocumentRecord {
  id: string;
  instituteId: string;
  studentId: string;
  applicationId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSizeBytes: number;
  checksumSha256: string;
  storageDriver: 'r2' | 'local';
  storageKey: string;
  quarantineKey?: string;
  status: DocumentProcessingState;
  scanState: ScanState;
  scanDetails?: {
    scannedAt?: string;
    engine?: string;
    signatureFound?: string;
    pdfSecurityFlags?: string[];
  };
  category: DocumentTypeCategory;
  categoryConfidence?: number;
  extractionProfileId?: string;
  pageCount?: number;
  qrData?: {
    rawPayload?: string;
    trustedDomain?: boolean;
    decodedFields?: Record<string, string>;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PresignedUrlResponse {
  uploadUrl?: string;
  viewUrl?: string;
  expiresInSeconds: number;
  objectKey: string;
}

