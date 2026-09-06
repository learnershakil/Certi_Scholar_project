import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IInstitute extends Document {
  code: string;
  name: string;
  domain?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const InstituteSchema = new Schema<IInstitute>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    domain: { type: String, lowercase: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Institute: Model<IInstitute> =
  (mongoose.models.Institute as Model<IInstitute>) ||
  mongoose.model<IInstitute>('Institute', InstituteSchema);
