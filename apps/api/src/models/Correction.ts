import mongoose, { Schema, Document as MongooseDoc, Model } from 'mongoose';

export interface ICorrection extends MongooseDoc {
  documentId: mongoose.Types.ObjectId;
  applicationId: string;
  instituteId: mongoose.Types.ObjectId;
  fieldKey: string;
  originalValue: unknown;
  correctedValue: unknown;
  action: 'APPROVE' | 'CORRECT' | 'MARK_UNREADABLE' | 'REQUEST_REUPLOAD';
  reason: string;
  officerId: mongoose.Types.ObjectId;
  officerRole: string;
  officerName?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const CorrectionSchema = new Schema<ICorrection>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    applicationId: { type: String, required: true, index: true },
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    fieldKey: { type: String, required: true },
    originalValue: { type: Schema.Types.Mixed },
    correctedValue: { type: Schema.Types.Mixed },
    action: {
      type: String,
      enum: ['APPROVE', 'CORRECT', 'MARK_UNREADABLE', 'REQUEST_REUPLOAD'],
      required: true,
    },
    reason: { type: String, required: true, minlength: 3, maxlength: 500 },
    officerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    officerRole: { type: String, required: true },
    officerName: { type: String },
    version: { type: Number, required: true, default: 1 },
  },
  { timestamps: true }
);

CorrectionSchema.index({ instituteId: 1, documentId: 1, createdAt: -1 });

export const CorrectionModel: Model<ICorrection> =
  (mongoose.models.Correction as Model<ICorrection>) ||
  mongoose.model<ICorrection>('Correction', CorrectionSchema);
