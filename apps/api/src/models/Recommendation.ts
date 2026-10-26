import mongoose, { Schema, Document as MongooseDoc, Model } from 'mongoose';
import { RecommendationStatus } from '@repo/contracts';

export interface IConditionExplanationRecord {
  field: string;
  criterionDescription: string;
  expectedValue: unknown;
  applicantValue: unknown;
  passed: boolean;
  provenance: 'OCR' | 'HUMAN_CORRECTED' | 'DIGILOCKER' | 'CERTI_ADAPTER' | 'MANUAL' | 'SIMULATED' | 'MISSING';
  reasonText: string;
}

export interface IRecommendation extends MongooseDoc {
  applicationId: string;
  scholarshipId: mongoose.Types.ObjectId;
  instituteId: mongoose.Types.ObjectId;
  status: RecommendationStatus;
  overallScore?: number;
  conditionExplanations: IConditionExplanationRecord[];
  summaryStudentText: string;
  summaryOfficerText: string;
  isAuthenticityVerified: boolean;
  provenanceSummary: Record<string, string>;
  version: number;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RecommendationSchema = new Schema<IRecommendation>(
  {
    applicationId: { type: String, required: true, index: true },
    scholarshipId: { type: Schema.Types.ObjectId, ref: 'Scholarship', required: true, index: true },
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    status: {
      type: String,
      enum: Object.values(RecommendationStatus),
      required: true,
      index: true,
    },
    overallScore: { type: Number },
    conditionExplanations: [
      {
        field: { type: String, required: true },
        criterionDescription: { type: String, required: true },
        expectedValue: { type: Schema.Types.Mixed },
        applicantValue: { type: Schema.Types.Mixed },
        passed: { type: Boolean, required: true },
        provenance: {
          type: String,
          enum: ['OCR', 'HUMAN_CORRECTED', 'DIGILOCKER', 'CERTI_ADAPTER', 'MANUAL', 'SIMULATED', 'MISSING'],
          required: true,
        },
        reasonText: { type: String, required: true },
      },
    ],
    summaryStudentText: { type: String, required: true },
    summaryOfficerText: { type: String, required: true },
    isAuthenticityVerified: { type: Boolean, required: true, default: false },
    provenanceSummary: { type: Schema.Types.Mixed, default: {} },
    version: { type: Number, required: true, default: 1 },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

RecommendationSchema.index({ instituteId: 1, applicationId: 1, scholarshipId: 1 }, { unique: true });

export const RecommendationModel: Model<IRecommendation> =
  (mongoose.models.Recommendation as Model<IRecommendation>) ||
  mongoose.model<IRecommendation>('Recommendation', RecommendationSchema);
