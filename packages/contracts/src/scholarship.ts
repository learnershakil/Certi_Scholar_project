import { z } from 'zod';

export enum ConditionOperator {
  EQ = 'EQ',
  NEQ = 'NEQ',
  GT = 'GT',
  GTE = 'GTE',
  LT = 'LT',
  LTE = 'LTE',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  CONTAINS = 'CONTAINS',
}

export const ConditionOperatorSchema = z.nativeEnum(ConditionOperator);

export interface AtomicCondition {
  field: string;
  operator: ConditionOperator;
  value: string | number | boolean | (string | number)[];
  label?: string;
}

export interface ConditionGroup {
  operator: 'AND' | 'OR';
  conditions: (AtomicCondition | ConditionGroup)[];
}

export const AtomicConditionSchema: z.ZodType<AtomicCondition> = z.object({
  field: z.string().min(1),
  operator: ConditionOperatorSchema,
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()]))]),
  label: z.string().optional(),
});

export const ConditionGroupSchema: z.ZodType<ConditionGroup> = z.lazy(() =>
  z.object({
    operator: z.enum(['AND', 'OR']),
    conditions: z.array(z.union([AtomicConditionSchema, ConditionGroupSchema])),
  })
);

export const CreateScholarshipSchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(3).max(200),
  description: z.string().min(10),
  instituteId: z.string().min(1),
  awardAmount: z.number().positive(),
  totalSeats: z.number().int().positive().optional(),
  academicYear: z.string().min(4).max(10),
  ruleAst: ConditionGroupSchema,
  isActive: z.boolean().default(true),
});

export type CreateScholarshipDto = z.infer<typeof CreateScholarshipSchema>;

export interface ConditionEvaluationResult {
  field: string;
  expectedOperator: string;
  expectedValue: unknown;
  actualValue: unknown;
  passed: boolean;
  isUnknownOrMissing: boolean;
  reason: string;
}

export interface RuleEvaluationSummary {
  scholarshipId: string;
  ruleVersion: string;
  overallPassed: boolean;
  hasMissingOrUncertainInputs: boolean;
  conditionResults: ConditionEvaluationResult[];
  evaluatedAt: string;
}

