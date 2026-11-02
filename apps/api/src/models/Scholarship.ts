import mongoose, { Schema, Document as MongooseDoc, Model } from 'mongoose';
import { ConditionGroup } from '@repo/contracts';

export interface IScholarship extends MongooseDoc {
  instituteId: mongoose.Types.ObjectId;
  code: string;
  name: string;
  description: string;
  awardAmount: number;
  totalSeats?: number;
  academicYear: string;
  ruleAst: ConditionGroup;
  version: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ScholarshipSchema = new Schema<IScholarship>(
  {
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    code: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    awardAmount: { type: Number, required: true, min: 0 },
    totalSeats: { type: Number, min: 1 },
    academicYear: { type: String, required: true },
    ruleAst: { type: Schema.Types.Mixed, required: true },
    version: { type: Number, required: true, default: 1 },
    isActive: { type: Boolean, required: true, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

ScholarshipSchema.index({ instituteId: 1, code: 1 }, { unique: true });

export const ScholarshipModel: Model<IScholarship> =
  (mongoose.models.Scholarship as Model<IScholarship>) ||
  mongoose.model<IScholarship>('Scholarship', ScholarshipSchema);

