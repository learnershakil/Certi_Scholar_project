import mongoose, { Schema, Document as MongooseDoc, Model } from 'mongoose';
import {
  DocumentProcessingState,
  DocumentTypeCategory,
  ScanState,
} from '@repo/contracts';

export interface IDocumentRecord extends MongooseDoc {
  instituteId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
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
    scannedAt?: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

const DocumentRecordSchema = new Schema<IDocumentRecord>(
  {
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    applicationId: { type: String, required: true, index: true },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSizeBytes: { type: Number, required: true },
    checksumSha256: { type: String, required: true },
    storageDriver: { type: String, enum: ['r2', 'local'], required: true },
    storageKey: { type: String, required: true },
    quarantineKey: { type: String },
    status: {
      type: String,
      enum: Object.values(DocumentProcessingState),
      default: DocumentProcessingState.RECEIVED,
      index: true,
    },
    scanState: {
      type: String,
      enum: Object.values(ScanState),
      default: ScanState.PENDING,
      index: true,
    },
    scanDetails: {
      scannedAt: { type: Date },
      engine: { type: String },
      signatureFound: { type: String },
      pdfSecurityFlags: [{ type: String }],
    },
    category: {
      type: String,
      enum: Object.values(DocumentTypeCategory),
      default: DocumentTypeCategory.UNKNOWN,
      index: true,
    },
    categoryConfidence: { type: Number },
    extractionProfileId: { type: String },
    pageCount: { type: Number },
    qrData: {
      rawPayload: { type: String },
      trustedDomain: { type: Boolean },
      decodedFields: { type: Map, of: String },
    },
  },
  { timestamps: true }
);

DocumentRecordSchema.index({ instituteId: 1, applicationId: 1 });
DocumentRecordSchema.index({ instituteId: 1, studentId: 1 });

export const DocumentModel: Model<IDocumentRecord> =
  (mongoose.models.DocumentRecord as Model<IDocumentRecord>) ||
  mongoose.model<IDocumentRecord>('DocumentRecord', DocumentRecordSchema);
