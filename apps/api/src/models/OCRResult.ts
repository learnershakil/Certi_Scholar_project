import mongoose, { Schema, Document as MongooseDoc, Model } from 'mongoose';
import { NormalizedOcrResult } from '@repo/contracts';

export interface IOCRResult extends MongooseDoc {
  documentId: mongoose.Types.ObjectId;
  instituteId: mongoose.Types.ObjectId;
  provider: 'GOOGLE_CLOUD_VISION' | 'TESSERACT' | 'MOCK';
  providerVersion?: string;
  fullText: string;
  pages: any[];
  pageCount: number;
  latencyMs: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  attempts: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OCRResultSchema = new Schema<IOCRResult>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    provider: { type: String, enum: ['GOOGLE_CLOUD_VISION', 'TESSERACT', 'MOCK'], required: true },
    providerVersion: { type: String },
    fullText: { type: String, required: true },
    pages: { type: [Schema.Types.Mixed] as any, default: [] },
    pageCount: { type: Number, required: true, default: 0 },
    latencyMs: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'COMPLETED',
      index: true,
    },
    attempts: { type: Number, default: 1 },
    error: { type: String },
  },
  { timestamps: true }
);

OCRResultSchema.index({ instituteId: 1, documentId: 1 });

export const OCRResultModel: Model<IOCRResult> =
  (mongoose.models.OCRResult as Model<IOCRResult>) ||
  mongoose.model<IOCRResult>('OCRResult', OCRResultSchema);
