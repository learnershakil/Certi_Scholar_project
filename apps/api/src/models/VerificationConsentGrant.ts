import mongoose, { Schema, Document as MongooseDoc, Model } from 'mongoose';

export interface IVerificationConsentGrant extends MongooseDoc {
  studentId: mongoose.Types.ObjectId;
  instituteId: mongoose.Types.ObjectId;
  applicationId: string;
  selectedDocumentIds: mongoose.Types.ObjectId[];
  purpose: string;
  durationDays: number;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  grantedAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  revokedBy?: mongoose.Types.ObjectId;
  revocationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VerificationConsentGrantSchema = new Schema<IVerificationConsentGrant>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    applicationId: { type: String, required: true, index: true },
    selectedDocumentIds: [{ type: Schema.Types.ObjectId, ref: 'Document', required: true }],
    purpose: { type: String, required: true, minlength: 3, maxlength: 200 },
    durationDays: { type: Number, required: true, default: 30, min: 1, max: 90 },
    status: {
      type: String,
      enum: ['ACTIVE', 'REVOKED', 'EXPIRED'],
      default: 'ACTIVE',
      index: true,
    },
    grantedAt: { type: Date, default: Date.now, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    revokedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    revocationReason: { type: String },
  },
  { timestamps: true }
);

VerificationConsentGrantSchema.index({ instituteId: 1, studentId: 1, status: 1 });

export const VerificationConsentGrantModel: Model<IVerificationConsentGrant> =
  (mongoose.models.VerificationConsentGrant as Model<IVerificationConsentGrant>) ||
  mongoose.model<IVerificationConsentGrant>('VerificationConsentGrant', VerificationConsentGrantSchema);
