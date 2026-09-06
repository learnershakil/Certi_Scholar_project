import { z } from 'zod';

export interface SubjectMarkEntry {
  subjectName: string;
  maxMarks: number;
  obtainedMarks: number;
  theoryMarks?: number;
  practicalMarks?: number;
}

export enum ConsistencyStatus {
  CONSISTENT = 'CONSISTENT',
  MISMATCH = 'MISMATCH',
  UNABLE_TO_CALCULATE = 'UNABLE_TO_CALCULATE',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
}

export interface AcademicCalculationProfile {
  id: string;
  key: string; // e.g. "CBSE_XII_STANDARD", "STATE_BOARD_5_SUBJECTS"
  name: string;
  formulaVersion: string;
  weightingMethod: 'EQUAL_SUM' | 'BEST_OF_FIVE' | 'WEIGHTED';
  roundingTolerance: number; // e.g. 0.05%
  maxSubjectsCount?: number;
}

export interface AcademicConsistencyResult {
  documentId: string;
  applicationId: string;
  profileKey: string;
  formulaVersion: string;
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
  notes: string;
  calculatedAt: string;
}

