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
import { VerificationResultModel } from '../src/models/VerificationResult';
import { RecommendationModel } from '../src/models/Recommendation';
import { TimelineEventModel } from '../src/models/TimelineEvent';
import {
  ConditionOperator,
  ConsistencyStatus,
  DocumentProcessingState,
  DocumentTypeCategory,
  FieldDataType,
  FieldReviewStatus,
  RecommendationStatus,
  ScanState,
  UserRole,
  VerificationProviderType,
  VerificationStatus,
} from '@repo/contracts';

describe('M9 Explainable Recommendation (Katyayni Singh)', () => {
  let instA: any;
  let instB: any;
  let officerA: any;
  let officerB: any;
  let studentA: any;

  let tokenOfficerA: string;
  let tokenOfficerB: string;
  let tokenStudentA: string;

  let scholarshipA: any;
  let docMarksheet: any;
  let docIncome: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }

    instA = await Institute.create({ code: 'INST_REC_A', name: 'Recommendation Inst A' });
    instB = await Institute.create({ code: 'INST_REC_B', name: 'Recommendation Inst B' });

    officerA = await User.create({ email: 'officer.rec.a@inst-a.edu', name: 'Officer Katyayni' });
    await InstituteMembership.create({
      instituteId: instA._id,
      userId: officerA._id,
      roles: [UserRole.VERIFICATION_OFFICER],
    });
    tokenOfficerA = jwt.sign(
      {
        userId: officerA._id.toString(),
        email: officerA.email,
        roles: [UserRole.VERIFICATION_OFFICER],
        instituteId: instA._id.toString(),
        isSuperAdmin: false,
      },
      config.jwtSecret
    );

    officerB = await User.create({ email: 'officer.rec.b@inst-b.edu', name: 'Officer B' });
    await InstituteMembership.create({
      instituteId: instB._id,
      userId: officerB._id,
      roles: [UserRole.VERIFICATION_OFFICER],
    });
    tokenOfficerB = jwt.sign(
      {
        userId: officerB._id.toString(),
        email: officerB.email,
        roles: [UserRole.VERIFICATION_OFFICER],
        instituteId: instB._id.toString(),
        isSuperAdmin: false,
      },
      config.jwtSecret
    );

    studentA = await User.create({ email: 'student.rec@inst-a.edu', name: 'Student M9' });
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

    // 1. Scholarship with Merit-cum-Means rules
    scholarshipA = await ScholarshipModel.create({
      instituteId: instA._id,
      code: 'SCHOL-M9-MCM',
      name: 'Merit-cum-Means Excellence Scholarship',
      description: 'Full tuition assistance for meritorious students with family income <= 250k.',
      awardAmount: 60000,
      totalSeats: 25,
      academicYear: '2026-2027',
      ruleAst: {
        operator: 'AND',
        conditions: [
          { field: 'percentage', operator: ConditionOperator.GTE, value: 75 },
          { field: 'annualFamilyIncome', operator: ConditionOperator.LTE, value: 250000 },
        ],
      },
      version: 1,
      isActive: true,
      createdBy: officerA._id,
    });

    // 2. Application documents
    docMarksheet = await DocumentModel.create({
      instituteId: instA._id,
      studentId: studentA._id,
      applicationId: 'APP-M9-001',
      category: DocumentTypeCategory.ACADEMIC_MARKSHEET,
      filename: 'marksheet_m9.pdf',
      originalName: 'marksheet_m9.pdf',
      storageDriver: 'local',
      storageKey: 'clean/marksheet_m9.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 20480,
      checksumSha256: 'sha256-m9-hash-1',
      status: DocumentProcessingState.REVIEWED,
      scanState: ScanState.CLEAN,
    });

    // M6 Consistency Result with 82.0% recomputed percentage
    await AcademicConsistencyModel.create({
      documentId: docMarksheet._id,
      applicationId: 'APP-M9-001',
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

    docIncome = await DocumentModel.create({
      instituteId: instA._id,
      studentId: studentA._id,
      applicationId: 'APP-M9-001',
      category: DocumentTypeCategory.INCOME_CERTIFICATE,
      filename: 'income_m9.pdf',
      originalName: 'income_m9.pdf',
      storageDriver: 'local',
      storageKey: 'clean/income_m9.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 20480,
      checksumSha256: 'sha256-m9-hash-2',
      status: DocumentProcessingState.REVIEWED,
      scanState: ScanState.CLEAN,
    });

    // Extracted Income: ₹2,00,000 (Corrected by Officer)
    await DocumentExtractionModel.create({
      documentId: docIncome._id,
      applicationId: 'APP-M9-001',
      instituteId: instA._id,
      profileId: new mongoose.Types.ObjectId(),
      profileKey: 'STATE_INCOME_CERT_V1',
      profileVersion: '1.0.0',
      version: 2,
      needsReview: false,
      fields: [
        {
          fieldKey: 'annualFamilyIncome',
          label: 'Annual Family Income',
          dataType: FieldDataType.NUMBER,
          rawValue: '200000',
          normalizedValue: 200000,
          confidence: 0.98,
          confidenceMethod: 'PATTERN_OCR_ALIGNMENT',
          isBelowThreshold: false,
          reviewStatus: FieldReviewStatus.CORRECTED, // Provenance: HUMAN_CORRECTED
        },
      ],
    });
  });

  afterAll(async () => {
    await ScholarshipModel.deleteMany({ instituteId: instA?._id });
    await DocumentModel.deleteMany({ applicationId: 'APP-M9-001' });
    await AcademicConsistencyModel.deleteMany({ applicationId: 'APP-M9-001' });
    await DocumentExtractionModel.deleteMany({ applicationId: 'APP-M9-001' });
    await VerificationResultModel.deleteMany({ applicationId: 'APP-M9-001' });
    await RecommendationModel.deleteMany({ applicationId: 'APP-M9-001' });
    await TimelineEventModel.deleteMany({ applicationId: 'APP-M9-001' });
    if (instA?._id) await Institute.findByIdAndDelete(instA._id);
    if (instB?._id) await Institute.findByIdAndDelete(instB._id);
    if (officerA?._id) await User.findByIdAndDelete(officerA._id);
    if (officerB?._id) await User.findByIdAndDelete(officerB._id);
    if (studentA?._id) await User.findByIdAndDelete(studentA._id);
  });

  it('Step 1: Generates explainable recommendation with VERIFICATION_PENDING when issuer evidence is absent', async () => {
    const res = await request(app)
      .post('/api/v1/recommendations/generate')
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerA}`)
      .send({
        scholarshipId: scholarshipA._id.toString(),
        applicationId: 'APP-M9-001',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const rec = res.body.data;

    // Must be VERIFICATION_PENDING, not ELIGIBLE, because no issuer verification has run yet!
    expect(rec.status).toBe(RecommendationStatus.VERIFICATION_PENDING);
    expect(rec.isAuthenticityVerified).toBe(false);

    // Condition explanations must all be present
    expect(rec.conditionExplanations).toHaveLength(2);

    const percentageCond = rec.conditionExplanations.find((c: any) => c.field === 'percentage');
    expect(percentageCond.passed).toBe(true);
    expect(percentageCond.applicantValue).toBe(82.0);

    const incomeCond = rec.conditionExplanations.find((c: any) => c.field === 'annualFamilyIncome');
    expect(incomeCond.passed).toBe(true);
    expect(incomeCond.applicantValue).toBe(200000);
    expect(incomeCond.provenance).toBe('HUMAN_CORRECTED');

    // Student summary must clearly explain pending verification
    expect(rec.summaryStudentText).toContain('Potentially eligible');
    expect(rec.summaryStudentText).toContain('Official issuer verification is still pending');
    expect(rec.summaryStudentText).toContain('This is an advisory recommendation, not a final award');

    // Officer summary must include full dossier
    expect(rec.summaryOfficerText).toContain('[OFFICER DOSSIER]');
    expect(rec.summaryOfficerText).toContain('UNVERIFIED / PENDING');
  });

  it('Step 2: Updates status to ELIGIBLE when manual verification is recorded by officer', async () => {
    // Record manual verification on marksheet
    await VerificationResultModel.create({
      documentId: docMarksheet._id,
      applicationId: 'APP-M9-001',
      instituteId: instA._id,
      provider: VerificationProviderType.MANUAL,
      status: VerificationStatus.MATCHED,
      isAuthenticityVerified: true,
      retrievalOnly: false,
      isSimulated: false,
      evidenceReference: 'OFFICIAL-REGISTRAR-REC-9921',
      officerNotes: 'Marksheet verified via state board portal',
      verifiedAt: new Date(),
    });

    // Re-generate recommendation
    const res = await request(app)
      .post('/api/v1/recommendations/generate')
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerA}`)
      .send({
        scholarshipId: scholarshipA._id.toString(),
        applicationId: 'APP-M9-001',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(RecommendationStatus.ELIGIBLE);
    expect(res.body.data.isAuthenticityVerified).toBe(true);
    expect(res.body.data.summaryStudentText).toContain('Eligible: Your application meets all criteria');
  });

  it('Step 3: Student can retrieve their own recommendation via application endpoint', async () => {
    const res = await request(app)
      .get('/api/v1/recommendations/application/APP-M9-001')
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenStudentA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeArray();
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].applicationId).toBe('APP-M9-001');
  });

  it('Step 4: Cross-Tenant Denial: Officer from Institute B cannot generate or read recommendations for Institute A', async () => {
    const res = await request(app)
      .post('/api/v1/recommendations/generate')
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerB}`)
      .send({
        scholarshipId: scholarshipA._id.toString(),
        applicationId: 'APP-M9-001',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Forbidden');
  });
});
