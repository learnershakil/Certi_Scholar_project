import {
  AcademicCalculationProfile,
  ConsistencyStatus,
  SubjectMarkEntry,
} from '@repo/contracts';

export interface CalculationInput {
  profile: AcademicCalculationProfile;
  subjects?: SubjectMarkEntry[];
  printedTotalMarks?: number;
  printedPercentage?: number;
  extractedTotalMarks?: number;
  extractedMaxMarks?: number;
}

export interface CalculationEvaluation {
  status: ConsistencyStatus;
  computedTotalMarks: number;
  computedMaxMarks: number;
  computedPercentage: number;
  printedTotalMarks?: number;
  printedPercentage?: number;
  totalMarksDifference?: number;
  percentageDifference?: number;
  discrepancyFlagged: boolean;
  notes: string;
  evaluatedSubjects: SubjectMarkEntry[];
}

export class CalculationEngine {
  evaluate(input: CalculationInput): CalculationEvaluation {
    const { profile, subjects, printedTotalMarks, printedPercentage, extractedTotalMarks, extractedMaxMarks } = input;

    // Check if we have subject-level breakdown
    if (subjects && subjects.length > 0) {
      let activeSubjects = [...subjects];

      // Handle weighting method
      if (profile.weightingMethod === 'BEST_OF_FIVE' && activeSubjects.length > 5) {
        // Sort descending by ratio of obtained / max
        activeSubjects.sort((a, b) => {
          const ratioA = a.maxMarks > 0 ? a.obtainedMarks / a.maxMarks : 0;
          const ratioB = b.maxMarks > 0 ? b.obtainedMarks / b.maxMarks : 0;
          return ratioB - ratioA;
        });
        activeSubjects = activeSubjects.slice(0, 5);
      } else if (profile.maxSubjectsCount && activeSubjects.length > profile.maxSubjectsCount) {
        activeSubjects = activeSubjects.slice(0, profile.maxSubjectsCount);
      }

      const computedTotalMarks = activeSubjects.reduce((sum, s) => sum + s.obtainedMarks, 0);
      const computedMaxMarks = activeSubjects.reduce((sum, s) => sum + s.maxMarks, 0);

      if (computedMaxMarks <= 0) {
        return {
          status: ConsistencyStatus.UNABLE_TO_CALCULATE,
          computedTotalMarks: 0,
          computedMaxMarks: 0,
          computedPercentage: 0,
          printedTotalMarks,
          printedPercentage,
          discrepancyFlagged: true,
          notes: 'Unable to calculate: Maximum marks cannot be zero or negative.',
          evaluatedSubjects: activeSubjects,
        };
      }

      const computedPercentage = Math.round((computedTotalMarks / computedMaxMarks) * 10000) / 100;

      // Discrepancy checks
      let discrepancyFlagged = false;
      let totalMarksDiff: number | undefined;
      let percentageDiff: number | undefined;
      const reasons: string[] = [];

      if (printedTotalMarks !== undefined) {
        totalMarksDiff = Math.abs(computedTotalMarks - printedTotalMarks);
        if (totalMarksDiff > 0.01) {
          discrepancyFlagged = true;
          reasons.push(
            `Computed subject marks sum to ${computedTotalMarks}, but printed total marks is ${printedTotalMarks} (diff: ${totalMarksDiff}).`
          );
        }
      }

      if (printedPercentage !== undefined) {
        percentageDiff = Math.round(Math.abs(computedPercentage - printedPercentage) * 100) / 100;
        if (percentageDiff > profile.roundingTolerance) {
          discrepancyFlagged = true;
          reasons.push(
            `Computed percentage is ${computedPercentage}%, but printed percentage is ${printedPercentage}% (diff: ${percentageDiff}% exceeds tolerance of ${profile.roundingTolerance}%).`
          );
        }
      }

      const status = discrepancyFlagged ? ConsistencyStatus.MISMATCH : ConsistencyStatus.CONSISTENT;
      const notes = discrepancyFlagged
        ? `${reasons.join(' ')} Mismatch is a review signal, not an authenticity verdict.`
        : `Computed aggregate (${computedPercentage}%) matches document printed values within tolerance (${profile.roundingTolerance}%).`;

      return {
        status,
        computedTotalMarks,
        computedMaxMarks,
        computedPercentage,
        printedTotalMarks,
        printedPercentage,
        totalMarksDifference: totalMarksDiff,
        percentageDifference: percentageDiff,
        discrepancyFlagged,
        notes,
        evaluatedSubjects: activeSubjects,
      };
    }

    // Fallback if only aggregate fields are present
    if (extractedTotalMarks !== undefined && extractedMaxMarks !== undefined && extractedMaxMarks > 0) {
      const computedTotalMarks = extractedTotalMarks;
      const computedMaxMarks = extractedMaxMarks;
      const computedPercentage = Math.round((computedTotalMarks / computedMaxMarks) * 10000) / 100;

      let discrepancyFlagged = false;
      let percentageDiff: number | undefined;
      const reasons: string[] = [];

      if (printedPercentage !== undefined) {
        percentageDiff = Math.round(Math.abs(computedPercentage - printedPercentage) * 100) / 100;
        if (percentageDiff > profile.roundingTolerance) {
          discrepancyFlagged = true;
          reasons.push(
            `Recomputed percentage from total/max is ${computedPercentage}%, but printed percentage is ${printedPercentage}%.`
          );
        }
      }

      const status = discrepancyFlagged ? ConsistencyStatus.MISMATCH : ConsistencyStatus.CONSISTENT;
      const notes = discrepancyFlagged
        ? `${reasons.join(' ')} Discrepancy is a review signal, not an authenticity verdict.`
        : `Recomputed percentage matches printed value within tolerance.`;

      return {
        status,
        computedTotalMarks,
        computedMaxMarks,
        computedPercentage,
        printedTotalMarks,
        printedPercentage,
        totalMarksDifference: 0,
        percentageDifference: percentageDiff,
        discrepancyFlagged,
        notes,
        evaluatedSubjects: [],
      };
    }

    // Missing inputs
    return {
      status: ConsistencyStatus.UNABLE_TO_CALCULATE,
      computedTotalMarks: 0,
      computedMaxMarks: 0,
      computedPercentage: 0,
      printedTotalMarks,
      printedPercentage,
      discrepancyFlagged: true,
      notes: 'Unable to calculate: Required subject marks or aggregate totals are missing from document fields.',
      evaluatedSubjects: [],
    };
  }
}

export const calculationEngine = new CalculationEngine();

