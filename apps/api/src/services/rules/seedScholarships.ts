import mongoose from 'mongoose';
import { ConditionGroup, ConditionOperator } from '@repo/contracts';
import { ScholarshipModel } from '../../models/Scholarship';

export const MERIT_CUM_MEANS_RULE: ConditionGroup = {
  operator: 'AND',
  conditions: [
    {
      field: 'percentage',
      operator: ConditionOperator.GTE,
      value: 75,
      label: 'Academic Percentage (Minimum 75%)',
    },
    {
      field: 'annualFamilyIncome',
      operator: ConditionOperator.LTE,
      value: 250000,
      label: 'Annual Family Income (Max ₹2,50,000)',
    },
    {
      operator: 'OR',
      conditions: [
        { field: 'category', operator: ConditionOperator.EQ, value: 'SC', label: 'SC Category' },
        { field: 'category', operator: ConditionOperator.EQ, value: 'ST', label: 'ST Category' },
        { field: 'category', operator: ConditionOperator.EQ, value: 'OBC', label: 'OBC Category' },
        { field: 'category', operator: ConditionOperator.EQ, value: 'GENERAL_EWS', label: 'General EWS Category' },
      ],
    },
  ],
};

export const POST_MATRIC_EXCELLENCE_RULE: ConditionGroup = {
  operator: 'AND',
  conditions: [
    {
      field: 'percentage',
      operator: ConditionOperator.GTE,
      value: 85,
      label: 'Excellence Threshold (Minimum 85%)',
    },
    {
      field: 'annualFamilyIncome',
      operator: ConditionOperator.LTE,
      value: 500000,
      label: 'Annual Family Income (Max ₹5,00,000)',
    },
  ],
};

export async function ensureDefaultScholarships(instituteId: string, adminUserId: string) {
  const existing = await ScholarshipModel.findOne({ instituteId, code: 'SCHOL-MCM-2026' });
  if (!existing) {
    await ScholarshipModel.create({
      instituteId: new mongoose.Types.ObjectId(instituteId),
      code: 'SCHOL-MCM-2026',
      name: 'Merit-cum-Means Higher Education Scholarship',
      description: 'Need-based financial aid for high-achieving students from economically challenged backgrounds.',
      awardAmount: 50000,
      totalSeats: 100,
      academicYear: '2026-2027',
      ruleAst: MERIT_CUM_MEANS_RULE,
      version: 1,
      isActive: true,
      createdBy: new mongoose.Types.ObjectId(adminUserId),
    });
  }
}
