import { z } from 'zod';
import { ConditionEvaluationResult } from './scholarship';

export enum RecommendationStatus {
  ELIGIBLE = 'ELIGIBLE',
  NOT_ELIGIBLE = 'NOT_ELIGIBLE',
  INCOMPLETE_NEEDS_REVIEW = 'INCOMPLETE_NEEDS_REVIEW',
  VERIFICATION_PENDING = 'VERIFICATION_PENDING',
  UNAVAILABLE = 'UNAVAILABLE',
}

export const RecommendationStatusSchema = z.nativeEnum(RecommendationStatus);

export interface ConditionExplanation {
  field: string;
  criterionDescription: string;
  expectedValue: unknown;
  applicantValue: unknown;
  passed: boolean;
  provenance: 'OCR' | 'HUMAN_CORRECTED' | 'DIGILOCKER' | 'CERTI_ADAPTER' | 'MANUAL' | 'SIMULATED' | 'MISSING';
  reasonText: string;
}

export interface RecommendationRecord {
  id: string;
  applicationId: string;
  scholarshipId: string;
  instituteId: string;
  status: RecommendationStatus;
  overallScore?: number;
  conditionExplanations: ConditionExplanation[];
  summaryStudentText: string;
  summaryOfficerText: string;
  isAuthenticityVerified: boolean;
  generatedAt: string;
}

