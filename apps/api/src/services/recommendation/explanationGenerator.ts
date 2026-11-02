import {
  RecommendationStatus,
  RuleEvaluationSummary,
  ConditionEvaluationResult,
} from '@repo/contracts';
import { IConditionExplanationRecord } from '../../models/Recommendation';

export type FieldProvenance =
  | 'OCR'
  | 'HUMAN_CORRECTED'
  | 'DIGILOCKER'
  | 'CERTI_ADAPTER'
  | 'MANUAL'
  | 'SIMULATED'
  | 'MISSING';

export interface ExplanationInput {
  scholarshipName: string;
  ruleEvaluation: RuleEvaluationSummary;
  provenanceMap: Record<string, FieldProvenance>;
  isAnyDocumentAuthenticityVerified: boolean;
  hasSimulatedVerification: boolean;
  hasCertiAdapterVerification: boolean;
  hasDiscrepancyFlagged: boolean;
}

export interface GeneratedExplanation {
  status: RecommendationStatus;
  conditionExplanations: IConditionExplanationRecord[];
  summaryStudentText: string;
  summaryOfficerText: string;
  isAuthenticityVerified: boolean;
}

export class ExplanationGenerator {
  generate(input: ExplanationInput): GeneratedExplanation {
    const {
      scholarshipName,
      ruleEvaluation,
      provenanceMap,
      isAnyDocumentAuthenticityVerified,
      hasSimulatedVerification,
      hasCertiAdapterVerification,
      hasDiscrepancyFlagged,
    } = input;

    // Build condition-by-condition explanations
    const conditionExplanations: IConditionExplanationRecord[] = ruleEvaluation.conditionResults.map((c) => {
      const provenance = provenanceMap[c.field] || (c.isUnknownOrMissing ? 'MISSING' : 'OCR');
      const criterionDescription = this.describeCriterion(c);
      const reasonText = this.buildConditionReason(c, provenance);

      return {
        field: c.field,
        criterionDescription,
        expectedValue: c.expectedValue,
        applicantValue: c.actualValue,
        passed: c.passed,
        provenance,
        reasonText,
      };
    });

    // Determine status
    let status: RecommendationStatus;
    const isAuthenticityVerified = isAnyDocumentAuthenticityVerified && !hasSimulatedVerification;

    if (ruleEvaluation.hasMissingOrUncertainInputs) {
      status = RecommendationStatus.INCOMPLETE_NEEDS_REVIEW;
    } else if (!ruleEvaluation.overallPassed) {
      status = RecommendationStatus.NOT_ELIGIBLE;
    } else if (!isAuthenticityVerified) {
      status = RecommendationStatus.VERIFICATION_PENDING;
    } else {
      status = RecommendationStatus.ELIGIBLE;
    }

    // Generate student-facing explanation text
    const summaryStudentText = this.buildStudentSummary({
      scholarshipName,
      status,
      ruleEvaluation,
      hasDiscrepancyFlagged,
      hasCertiAdapterVerification,
      hasSimulatedVerification,
    });

    // Generate officer-facing explanation text
    const summaryOfficerText = this.buildOfficerSummary({
      scholarshipName,
      status,
      ruleEvaluation,
      isAuthenticityVerified,
      hasDiscrepancyFlagged,
      hasCertiAdapterVerification,
      hasSimulatedVerification,
    });

    return {
      status,
      conditionExplanations,
      summaryStudentText,
      summaryOfficerText,
      isAuthenticityVerified,
    };
  }

  private describeCriterion(c: ConditionEvaluationResult): string {
    const fieldLabels: Record<string, string> = {
      percentage: 'Academic Percentage',
      annualFamilyIncome: 'Annual Family Income',
      category: 'Social Category',
    };

    const label = fieldLabels[c.field] || c.field;
    return `${label} must satisfy ${c.expectedOperator} ${JSON.stringify(c.expectedValue)}`;
  }

  private buildConditionReason(c: ConditionEvaluationResult, provenance: FieldProvenance): string {
    if (c.isUnknownOrMissing) {
      return `Missing input: '${c.field}' could not be resolved from submitted documents or officer reviews. Provenance: MISSING.`;
    }

    const provLabel = provenance === 'HUMAN_CORRECTED' ? 'Reviewed & Corrected by Officer' : `Source: ${provenance}`;
    if (c.passed) {
      return `Satisfied: Applicant ${c.field} is ${JSON.stringify(c.actualValue)} (meets requirement ${c.expectedOperator} ${JSON.stringify(c.expectedValue)}). [${provLabel}]`;
    } else {
      return `Unsatisfied: Applicant ${c.field} is ${JSON.stringify(c.actualValue)}, which fails requirement ${c.expectedOperator} ${JSON.stringify(c.expectedValue)}. [${provLabel}]`;
    }
  }

  private buildStudentSummary(params: {
    scholarshipName: string;
    status: RecommendationStatus;
    ruleEvaluation: RuleEvaluationSummary;
    hasDiscrepancyFlagged: boolean;
    hasCertiAdapterVerification: boolean;
    hasSimulatedVerification: boolean;
  }): string {
    const { scholarshipName, status, hasDiscrepancyFlagged, hasCertiAdapterVerification } = params;

    switch (status) {
      case RecommendationStatus.INCOMPLETE_NEEDS_REVIEW:
        return `Application incomplete for ${scholarshipName}: One or more required eligibility fields are missing or awaiting officer review. Next step: Please check your uploaded documents or await verification review.`;

      case RecommendationStatus.NOT_ELIGIBLE:
        return `Currently not eligible for ${scholarshipName}: Your application does not satisfy all eligibility conditions. Please review the detailed condition breakdown below for details.`;

      case RecommendationStatus.VERIFICATION_PENDING: {
        const provNote = hasCertiAdapterVerification
          ? 'Documents retrieved via student locker (Certi Adapter) are user content and await issuer verification.'
          : 'Official issuer verification is still pending.';

        const discNote = hasDiscrepancyFlagged
          ? ' Note: Academic marks contain a discrepancy signal flagged for officer review.'
          : '';

        return `Potentially eligible: You satisfy the academic and financial criteria for ${scholarshipName} based on submitted records. ${provNote}${discNote} This is an advisory recommendation, not a final award.`;
      }

      case RecommendationStatus.ELIGIBLE:
        return `Eligible: Your application meets all criteria for ${scholarshipName} and your credentials have been verified. The Scholarship Officer will process final award decisions based on available seats.`;

      default:
        return `Recommendation status: ${status} for ${scholarshipName}.`;
    }
  }

  private buildOfficerSummary(params: {
    scholarshipName: string;
    status: RecommendationStatus;
    ruleEvaluation: RuleEvaluationSummary;
    isAuthenticityVerified: boolean;
    hasDiscrepancyFlagged: boolean;
    hasCertiAdapterVerification: boolean;
    hasSimulatedVerification: boolean;
  }): string {
    const {
      scholarshipName,
      status,
      ruleEvaluation,
      isAuthenticityVerified,
      hasDiscrepancyFlagged,
      hasCertiAdapterVerification,
      hasSimulatedVerification,
    } = params;

    const parts: string[] = [];
    parts.push(`[OFFICER DOSSIER] Scholarship: ${scholarshipName} (Rule Version: ${ruleEvaluation.ruleVersion})`);
    parts.push(`Evaluation Status: ${status}`);
    parts.push(`Rule Conditions Met: ${ruleEvaluation.overallPassed ? 'YES' : 'NO'}`);
    parts.push(`Issuer Authenticity Verified: ${isAuthenticityVerified ? 'VERIFIED' : 'UNVERIFIED / PENDING'}`);

    if (hasDiscrepancyFlagged) {
      parts.push(`WARNING: Academic consistency check flagged a printed vs computed marks discrepancy.`);
    }

    if (hasCertiAdapterVerification) {
      parts.push(`NOTE: Document was retrieved via Certi Locker consent; treated as retrieval-only user content.`);
    }

    if (hasSimulatedVerification) {
      parts.push(`NOTICE: Simulated verification adapter was used during evaluation (development fixture).`);
    }

    parts.push(`Action Required: Scholarship Officer must review eligibility signals and process institutional award decision.`);
    return parts.join(' | ');
  }
}

export const explanationGenerator = new ExplanationGenerator();

