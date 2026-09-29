import mongoose, { Schema, Document as MongooseDoc, Model } from 'mongoose';
import { DocumentTypeCategory, FieldDataType } from '@repo/contracts';

export interface IExtractionProfile extends MongooseDoc {
  key: string;
  name: string;
  category: DocumentTypeCategory;
  version: string;
  fields: {
    fieldKey: string;
    label: string;
    dataType: FieldDataType;
    required: boolean;
    confidenceThreshold: number;
    regexPattern?: string;
    description?: string;
  }[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FieldDefinitionSchema = new Schema(
  {
    fieldKey: { type: String, required: true },
    label: { type: String, required: true },
    dataType: {
      type: String,
      enum: Object.values(FieldDataType),
      required: true,
      default: FieldDataType.STRING,
    },
    required: { type: Boolean, default: true },
    confidenceThreshold: { type: Number, required: true, default: 0.85 },
    regexPattern: { type: String },
    description: { type: String },
  },
  { _id: false }
);

const ExtractionProfileSchema = new Schema<IExtractionProfile>(
  {
    key: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    category: {
      type: String,
      enum: Object.values(DocumentTypeCategory),
      required: true,
      index: true,
    },
    version: { type: String, required: true, default: '1.0.0' },
    fields: { type: [FieldDefinitionSchema], default: [] },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const ExtractionProfileModel: Model<IExtractionProfile> =
  (mongoose.models.ExtractionProfile as Model<IExtractionProfile>) ||
  mongoose.model<IExtractionProfile>('ExtractionProfile', ExtractionProfileSchema);
