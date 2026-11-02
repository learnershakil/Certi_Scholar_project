import mongoose, { Schema, Document as MongooseDoc, Model } from 'mongoose';
import { ConsistencyStatus } from '@repo/contracts';

export interface ISubjectMarkRecord {
  subjectName: string;
  maxMarks: number;
  obtainedMarks: number;
  theoryMarks?: number;
  practicalMarks?: number;
}

export interface IAcademicConsistency extends MongooseDoc {
  documentId: mongoose.Types.ObjectId;
  applicationId: string;
  instituteId: mongoose.Types.ObjectId;
  profileKey: string;
  profileVersion: string;
  status: ConsistencyStatus;
  computedTotalMarks: number;
  computedMaxMarks: number;
  computedPercentage: number;
  printedTotalMarks?: number;
  printedPercentage?: number;
  totalMarksDifference?: number;
  percentageDifference?: number;
  toleranceAllowed: number;
  discrepancyFlagged: boolean;
  subjectBreakdown: ISubjectMarkRecord[];
  notes: string;
  version: number;
  calculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AcademicConsistencySchema = new Schema<IAcademicConsistency>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    applicationId: { type: String, required: true, index: true },
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    profileKey: { type: String, required: true },
    profileVersion: { type: String, required: true, default: '1.0.0' },
    status: {
      type: String,
      enum: Object.values(ConsistencyStatus),
      required: true,
      index: true,
    },
    computedTotalMarks: { type: Number, required: true },
    computedMaxMarks: { type: Number, required: true },
    computedPercentage: { type: Number, required: true },
    printedTotalMarks: { type: Number },
    printedPercentage: { type: Number },
    totalMarksDifference: { type: Number },
    percentageDifference: { type: Number },
    toleranceAllowed: { type: Number, required: true, default: 0.1 },
    discrepancyFlagged: { type: Boolean, required: true, default: false },
    subjectBreakdown: [
      {
        subjectName: { type: String, required: true },
        maxMarks: { type: Number, required: true },
        obtainedMarks: { type: Number, required: true },
        theoryMarks: { type: Number },
        practicalMarks: { type: Number },
      },
    ],
    notes: { type: String, required: true },
    version: { type: Number, required: true, default: 1 },
    calculatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

AcademicConsistencySchema.index({ instituteId: 1, documentId: 1 }, { unique: true });

export const AcademicConsistencyModel: Model<IAcademicConsistency> =
  (mongoose.models.AcademicConsistency as Model<IAcademicConsistency>) ||
  mongoose.model<IAcademicConsistency>('AcademicConsistency', AcademicConsistencySchema);

