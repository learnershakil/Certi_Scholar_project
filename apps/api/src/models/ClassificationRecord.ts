import mongoose, { Schema, Document as MongooseDoc, Model } from 'mongoose';
import { DocumentTypeCategory } from '@repo/contracts';

export interface IClassificationRecord extends MongooseDoc {
  documentId: mongoose.Types.ObjectId;
  instituteId: mongoose.Types.ObjectId;
  provider: 'GEMINI' | 'DETERMINISTIC_HEURISTIC' | 'MOCK';
  modelVersion?: string;
  category: DocumentTypeCategory;
  modelConfidence: number;
  candidateProfileKey?: string | null;
  evidencePhrases: string[];
  explanation?: string;
  classifiedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ClassificationRecordSchema = new Schema<IClassificationRecord>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    provider: {
      type: String,
      enum: ['GEMINI', 'DETERMINISTIC_HEURISTIC', 'MOCK'],
      required: true,
    },
    modelVersion: { type: String },
    category: {
      type: String,
      enum: Object.values(DocumentTypeCategory),
      required: true,
      index: true,
    },
    modelConfidence: { type: Number, required: true },
    candidateProfileKey: { type: String, default: null },
    evidencePhrases: { type: [String], default: [] },
    explanation: { type: String },
    classifiedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ClassificationRecordSchema.index({ instituteId: 1, documentId: 1 });

export const ClassificationRecordModel: Model<IClassificationRecord> =
  (mongoose.models.ClassificationRecord as Model<IClassificationRecord>) ||
  mongoose.model<IClassificationRecord>('ClassificationRecord', ClassificationRecordSchema);

