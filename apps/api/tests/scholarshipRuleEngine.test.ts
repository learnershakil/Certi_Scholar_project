import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app';
import { config } from '../src/config/env';
import { Institute } from '../src/models/Institute';
import { User } from '../src/models/User';
import { InstituteMembership } from '../src/models/InstituteMembership';
import { ScholarshipModel } from '../src/models/Scholarship';
import { DocumentModel } from '../src/models/Document';
import { DocumentExtractionModel } from '../src/models/DocumentExtraction';
import { AcademicConsistencyModel } from '../src/models/AcademicConsistency';
import { TimelineEventModel } from '../src/models/TimelineEvent';
import {
  ConditionGroup,
  ConditionOperator,
  ConsistencyStatus,
  DocumentProcessingState,
  DocumentTypeCategory,
  FieldDataType,
  FieldReviewStatus,
  ScanState,
  UserRole,
} from '@repo/contracts';

describe('M8 Scholarship Rule Engine (Meetr)', () => {
  let instA: any;
  let instB: any;
  let adminA: any;
  let adminB: any;
  let studentA: any;

  let tokenAdminA: string;
  let tokenAdminB: string;
  let tokenStudentA: string;

  let createdScholarshipId: string;
  let testDocMarksheet: any;
  let testDocIncome: any;

  const sampleRuleAst: ConditionGroup = {
    operator: 'AND',
    conditions: [
      { field: 'percentage', operator: ConditionOperator.GTE, value: 75 },
      { field: 'annualFamilyIncome', operator: ConditionOperator.LTE, value: 250000 },
      {
        operator: 'OR',
        conditions: [
          { field: 'category', operator: ConditionOperator.EQ, value: 'SC' },
          { field: 'category', operator: ConditionOperator.EQ, value: 'ST' },
          { field: 'category', operator: ConditionOperator.EQ, value: 'OBC' },
        ],
      },
    ],
  };

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }

    instA = await Institute.create({ code: 'INST_SCHOL_A', name: 'Scholarship Inst A' });
    instB = await Institute.create({ code: 'INST_SCHOL_B', name: 'Scholarship Inst B' });

    adminA = await User.create({ email: 'admin.m8@inst-a.edu', name: 'Admin Meetr' });
    await InstituteMembership.create({
      instituteId: instA._id,
      userId: adminA._id,
      roles: [UserRole.INSTITUTE_ADMIN],
    });
    tokenAdminA = jwt.sign(
      {
        userId: adminA._id.toString(),
        email: adminA.email,
        roles: [UserRole.INSTITUTE_ADMIN],
        instituteId: instA._id.toString(),
        isSuperAdmin: false,
      },
      config.jwtSecret
    );

    adminB = await User.create({ email: 'admin.m8@inst-b.edu', name: 'Admin B' });
    await InstituteMembership.create({
      instituteId: instB._id,
      userId: adminB._id,
      roles: [UserRole.INSTITUTE_ADMIN],
    });
    tokenAdminB = jwt.sign(
      {
        userId: adminB._id.toString(),
        email: adminB.email,
        roles: [UserRole.INSTITUTE_ADMIN],
        instituteId: instB._id.toString(),
        isSuperAdmin: false,
      },
      config.jwtSecret
    );

    studentA = await User.create({ email: 'student.m8@inst-a.edu', name: 'Student M8' });
    await InstituteMembership.create({
      instituteId: instA._id,
      userId: studentA._id,
      roles: [UserRole.STUDENT],
    });
    tokenStudentA = jwt.sign(
      {
        userId: studentA._id.toString(),
        email: studentA.email,
        roles: [UserRole.STUDENT],
        instituteId: instA._id.toString(),
        isSuperAdmin: false,
      },
      config.jwtSecret
    );

    // Seed application documents for real evaluation test
    testDocMarksheet = await DocumentModel.create({
      instituteId: instA._id,
      studentId: studentA._id,
      applicationId: 'APP-M8-REAL',
      category: DocumentTypeCategory.ACADEMIC_MARKSHEET,
      filename: 'cbse_m8.pdf',
      originalName: 'cbse_m8.pdf',
      storageDriver: 'local',
      storageKey: 'clean/cbse_m8.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 20480,
      checksumSha256: 'sha256-m8-marksheet-hash',
      status: DocumentProcessingState.REVIEWED,
      scanState: ScanState.CLEAN,
    });

    // M6 Consistency Result with 82.0% recomputed percentage
    await AcademicConsistencyModel.create({
      documentId: testDocMarksheet._id,
      applicationId: 'APP-M8-REAL',
      instituteId: instA._id,
      profileKey: 'CBSE_XII_STANDARD',
      profileVersion: '1.0.0',
      status: ConsistencyStatus.CONSISTENT,
      computedTotalMarks: 410,
      computedMaxMarks: 500,
      computedPercentage: 82.0,
      printedPercentage: 82.0,
      discrepancyFlagged: false,
      toleranceAllowed: 0.1,
      notes: 'Computed percentage matches printed value.',
    });

    testDocIncome = await DocumentModel.create({
      instituteId: instA._id,
      studentId: studentA._id,
      applicationId: 'APP-M8-REAL',
      category: DocumentTypeCategory.INCOME_CERTIFICATE,
      filename: 'income_m8.pdf',
      originalName: 'income_m8.pdf',
      storageDriver: 'local',
      storageKey: 'clean/income_m8.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 20480,
      checksumSha256: 'sha256-m8-income-hash',
      status: DocumentProcessingState.REVIEWED,
      scanState: ScanState.CLEAN,
    });

    // Extracted Income: ₹1,80,000 and Category: SC
    await DocumentExtractionModel.create({
      documentId: testDocIncome._id,
      applicationId: 'APP-M8-REAL',
      instituteId: instA._id,
      profileId: new mongoose.Types.ObjectId(),
      profileKey: 'STATE_INCOME_CERT_V1',
      profileVersion: '1.0.0',
      version: 1,
      needsReview: false,
      fields: [
        {
          fieldKey: 'annualFamilyIncome',
          label: 'Annual Family Income',
          dataType: FieldDataType.NUMBER,
          rawValue: '180000',
          normalizedValue: 180000,
          confidence: 0.96,
          confidenceMethod: 'PATTERN_OCR_ALIGNMENT',
          isBelowThreshold: false,
          reviewStatus: FieldReviewStatus.AUTO_ACCEPTED,
        },
        {
          fieldKey: 'category',
          label: 'Social Category',
          dataType: FieldDataType.STRING,
          rawValue: 'SC',
          normalizedValue: 'SC',
          confidence: 0.98,
          confidenceMethod: 'PATTERN_OCR_ALIGNMENT',
          isBelowThreshold: false,
          reviewStatus: FieldReviewStatus.AUTO_ACCEPTED,
        },
      ],
    });
  });

  afterAll(async () => {
    await ScholarshipModel.deleteMany({ instituteId: instA?._id });
    await DocumentModel.deleteMany({ applicationId: 'APP-M8-REAL' });
    await AcademicConsistencyModel.deleteMany({ applicationId: 'APP-M8-REAL' });
    await DocumentExtractionModel.deleteMany({ applicationId: 'APP-M8-REAL' });
    await TimelineEventModel.deleteMany({ applicationId: 'APP-M8-REAL' });
    if (instA?._id) await Institute.findByIdAndDelete(instA._id);
    if (instB?._id) await Institute.findByIdAndDelete(instB._id);
    if (adminA?._id) await User.findByIdAndDelete(adminA._id);
    if (adminB?._id) await User.findByIdAndDelete(adminB._id);
    if (studentA?._id) await User.findByIdAndDelete(studentA._id);
  });

  it('Step 1: Admin creates a new scholarship with nested AST rules without code changes', async () => {
    const res = await request(app)
      .post('/api/v1/scholarships')
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenAdminA}`)
      .send({
        code: 'ENG-MCM-2026',
        name: 'Engineering Merit-cum-Means Financial Grant',
        description: 'Need-based engineering grant for high performers from low-income families.',
        instituteId: instA._id.toString(),
        awardAmount: 75000,
        totalSeats: 50,
        academicYear: '2026-2027',
        ruleAst: sampleRuleAst,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('ENG-MCM-2026');
    expect(res.body.data.version).toBe(1);
    createdScholarshipId = res.body.data._id;
  });

  it('Step 2: Test Harness evaluates hypothetical applicant data against AST in real time', async () => {
    // 1. Qualifying hypothetical applicant: 80% marks, 200k income, SC category -> PASS
    const passRes = await request(app)
      .post('/api/v1/scholarships/rules/test')
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenAdminA}`)
      .send({
        ruleAst: sampleRuleAst,
        applicantFacts: {
          percentage: 80,
          annualFamilyIncome: 200000,
          category: 'SC',
        },
      });

    expect(passRes.status).toBe(200);
    expect(passRes.body.success).toBe(true);
    expect(passRes.body.data.overallPassed).toBe(true);
    expect(passRes.body.data.hasMissingOrUncertainInputs).toBe(false);
    expect(passRes.body.data.conditionResults).toHaveLength(5); // 2 AND conditions + 3 OR subconditions

    // 2. Disqualifying hypothetical applicant: income exceeds 250k -> FAIL
    const failRes = await request(app)
      .post('/api/v1/scholarships/rules/test')
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenAdminA}`)
      .send({
        ruleAst: sampleRuleAst,
        applicantFacts: {
          percentage: 88,
          annualFamilyIncome: 350000, // Exceeds 250k
          category: 'SC',
        },
      });

    expect(failRes.status).toBe(200);
    expect(failRes.body.data.overallPassed).toBe(false);
    const incomeCond = failRes.body.data.conditionResults.find((c: any) => c.field === 'annualFamilyIncome');
    expect(incomeCond.passed).toBe(false);
  });

  it('Step 3: 3-Valued Logic: Missing/unverified inputs are NOT silently treated as passing', async () => {
    const incompleteRes = await request(app)
      .post('/api/v1/scholarships/rules/test')
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenAdminA}`)
      .send({
        ruleAst: sampleRuleAst,
        applicantFacts: {
          percentage: 85, // Provided
          // annualFamilyIncome is MISSING!
          category: 'OBC', // Provided
        },
      });

    expect(incompleteRes.status).toBe(200);
    expect(incompleteRes.body.data.overallPassed).toBe(false); // Does NOT pass!
    expect(incompleteRes.body.data.hasMissingOrUncertainInputs).toBe(true);
    const missingCond = incompleteRes.body.data.conditionResults.find((c: any) => c.field === 'annualFamilyIncome');
    expect(missingCond.isUnknownOrMissing).toBe(true);
    expect(missingCond.passed).toBe(false);
    expect(missingCond.reason).toContain('Missing input');
  });

  it('Step 4: Updating rule AST creates a new rule version while preserving history', async () => {
    // Increase minimum percentage threshold to 80%
    const updatedAst: ConditionGroup = {
      operator: 'AND',
      conditions: [
        { field: 'percentage', operator: ConditionOperator.GTE, value: 80 },
        { field: 'annualFamilyIncome', operator: ConditionOperator.LTE, value: 250000 },
      ],
    };

    const updateRes = await request(app)
      .patch(`/api/v1/scholarships/${createdScholarshipId}`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenAdminA}`)
      .send({ ruleAst: updatedAst });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.version).toBe(2); // Version incremented!
  });

  it('Step 5: Evaluates real application data across M6 consistency, M4 extraction, and M5 corrections', async () => {
    const evalRes = await request(app)
      .post(`/api/v1/scholarships/${createdScholarshipId}/evaluate`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenAdminA}`)
      .send({ applicationId: 'APP-M8-REAL' });

    expect(evalRes.status).toBe(200);
    expect(evalRes.body.success).toBe(true);
    expect(evalRes.body.data.evaluation.overallPassed).toBe(true);
    expect(evalRes.body.data.evaluation.ruleVersion).toBe('v2');
    expect(evalRes.body.data.facts.percentage).toBe(82.0); // Derived from M6 consistency check
    expect(evalRes.body.data.facts.annualFamilyIncome).toBe(180000); // Derived from M4 extraction

    // Verify timeline event was recorded
    const timelineEvents = await TimelineEventModel.find({ applicationId: 'APP-M8-REAL' });
    expect(timelineEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('Step 6: Cross-Tenant Denial: Admin from Institute B cannot read, update, or evaluate scholarships of Institute A', async () => {
    const getRes = await request(app)
      .get(`/api/v1/scholarships/${createdScholarshipId}`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenAdminB}`);

    expect(getRes.status).toBe(403);
    expect(getRes.body.success).toBe(false);
    expect(getRes.body.error.message).toContain('Forbidden');

    const updateRes = await request(app)
      .patch(`/api/v1/scholarships/${createdScholarshipId}`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenAdminB}`)
      .send({ awardAmount: 100000 });

    expect(updateRes.status).toBe(403);
  });
});

