import mongoose, { Schema, Document as MongooseDoc, Model } from 'mongoose';
import { VerificationProviderType, VerificationStatus } from '@repo/contracts';

export interface IVerificationResult extends MongooseDoc {
  documentId: mongoose.Types.ObjectId;
  applicationId: string;
  instituteId: mongoose.Types.ObjectId;
  provider: VerificationProviderType;
  status: VerificationStatus;
  isAuthenticityVerified: boolean;
  retrievalOnly: boolean;
  isSimulated: boolean;
  evidenceReference?: string;
  issuerMetadata?: Record<string, unknown>;
  verifiedFields?: Record<string, boolean>;
  officerNotes?: string;
  verifiedAt: Date;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const VerificationResultSchema = new Schema<IVerificationResult>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    applicationId: { type: String, required: true, index: true },
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    provider: {
      type: String,
      enum: Object.values(VerificationProviderType),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(VerificationStatus),
      required: true,
      index: true,
    },
    isAuthenticityVerified: { type: Boolean, required: true, default: false },
    retrievalOnly: { type: Boolean, required: true, default: false },
    isSimulated: { type: Boolean, required: true, default: false },
    evidenceReference: { type: String },
    issuerMetadata: { type: Schema.Types.Mixed },
    verifiedFields: { type: Schema.Types.Mixed },
    officerNotes: { type: String },
    verifiedAt: { type: Date, default: Date.now },
    version: { type: Number, required: true, default: 1 },
  },
  { timestamps: true }
);

VerificationResultSchema.index({ instituteId: 1, documentId: 1, provider: 1 });

export const VerificationResultModel: Model<IVerificationResult> =
  (mongoose.models.VerificationResult as Model<IVerificationResult>) ||
  mongoose.model<IVerificationResult>('VerificationResult', VerificationResultSchema);

