import mongoose, { Schema, Document as MongooseDoc, Model } from 'mongoose';
import { FieldDataType, FieldReviewStatus } from '@repo/contracts';

export interface IExtractedFieldSubdocument {
  fieldKey: string;
  label: string;
  dataType: FieldDataType;
  rawValue: unknown;
  normalizedValue: unknown;
  confidence: number;
  confidenceMethod: string;
  source?: {
    page: number;
    boundingPolygon?: {
      vertices: { x: number; y: number }[];
    };
    matchedSnippet?: string;
  };
  reviewStatus: FieldReviewStatus;
  isBelowThreshold: boolean;
  missingReason?: string;
}

export interface IDocumentExtraction extends MongooseDoc {
  documentId: mongoose.Types.ObjectId;
  instituteId: mongoose.Types.ObjectId;
  profileId: mongoose.Types.ObjectId;
  profileKey: string;
  profileVersion: string;
  fields: IExtractedFieldSubdocument[];
  allRequiredPresent: boolean;
  needsReview: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const ExtractedFieldSchema = new Schema(
  {
    fieldKey: { type: String, required: true },
    label: { type: String, required: true },
    dataType: { type: String, enum: Object.values(FieldDataType), required: true },
    rawValue: { type: Schema.Types.Mixed },
    normalizedValue: { type: Schema.Types.Mixed },
    confidence: { type: Number, required: true, default: 0 },
    confidenceMethod: { type: String, required: true, default: 'PATTERN_OCR_ALIGNMENT' },
    source: {
      page: { type: Number, default: 1 },
      boundingPolygon: {
        vertices: [{ x: Number, y: Number }],
      },
      matchedSnippet: { type: String },
    },
    reviewStatus: {
      type: String,
      enum: Object.values(FieldReviewStatus),
      required: true,
      default: FieldReviewStatus.NEEDS_REVIEW,
    },
    isBelowThreshold: { type: Boolean, required: true, default: false },
    missingReason: { type: String },
  },
  { _id: false }
);

const DocumentExtractionSchema = new Schema<IDocumentExtraction>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    profileId: { type: Schema.Types.ObjectId, ref: 'ExtractionProfile', required: true },
    profileKey: { type: String, required: true },
    profileVersion: { type: String, required: true, default: '1.0.0' },
    fields: { type: [ExtractedFieldSchema], default: [] },
    allRequiredPresent: { type: Boolean, required: true, default: true },
    needsReview: { type: Boolean, required: true, default: false, index: true },
    version: { type: Number, required: true, default: 1 },
  },
  { timestamps: true }
);

DocumentExtractionSchema.index({ instituteId: 1, documentId: 1, version: -1 });

export const DocumentExtractionModel: Model<IDocumentExtraction> =
  (mongoose.models.DocumentExtraction as Model<IDocumentExtraction>) ||
  mongoose.model<IDocumentExtraction>('DocumentExtraction', DocumentExtractionSchema);
