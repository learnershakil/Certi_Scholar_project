import { AcademicCalculationProfile } from '@repo/contracts';

export const DEFAULT_CALCULATION_PROFILES: Record<string, AcademicCalculationProfile> = {
  CBSE_XII_STANDARD: {
    id: 'profile_cbse_xii_std',
    key: 'CBSE_XII_STANDARD',
    name: 'CBSE Class XII 5-Subject Standard Aggregate',
    formulaVersion: '1.0.0',
    weightingMethod: 'EQUAL_SUM',
    roundingTolerance: 0.1, // 0.1% tolerance
    maxSubjectsCount: 5,
  },
  STATE_BOARD_5_SUBJECTS: {
    id: 'profile_state_5_sub',
    key: 'STATE_BOARD_5_SUBJECTS',
    name: 'State Board 5-Subject Evaluation',
    formulaVersion: '1.0.0',
    weightingMethod: 'EQUAL_SUM',
    roundingTolerance: 0.1,
    maxSubjectsCount: 5,
  },
  BEST_OF_FIVE_6_SUBJECTS: {
    id: 'profile_best_of_five',
    key: 'BEST_OF_FIVE_6_SUBJECTS',
    name: 'Best of Five Aggregate (6 Enrolled Subjects)',
    formulaVersion: '1.0.0',
    weightingMethod: 'BEST_OF_FIVE',
    roundingTolerance: 0.1,
    maxSubjectsCount: 6,
  },
};

export function resolveCalculationProfile(key: string): AcademicCalculationProfile {
  const profile = DEFAULT_CALCULATION_PROFILES[key];
  if (!profile) {
    throw new Error(`Calculation profile not found: ${key}`);
  }
  return profile;
}

