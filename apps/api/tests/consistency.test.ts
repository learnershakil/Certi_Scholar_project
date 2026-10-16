import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app';
import { config } from '../src/config/env';
import { Institute } from '../src/models/Institute';
import { User } from '../src/models/User';
import { InstituteMembership } from '../src/models/InstituteMembership';
import { DocumentModel } from '../src/models/Document';
import { DocumentExtractionModel } from '../src/models/DocumentExtraction';
import { AcademicConsistencyModel } from '../src/models/AcademicConsistency';
import { TimelineEventModel } from '../src/models/TimelineEvent';
import {
  DocumentTypeCategory,
  DocumentProcessingState,
  ScanState,
  FieldReviewStatus,
  ConsistencyStatus,
  UserRole,
} from '@repo/contracts';

describe('M6 Academic Calculation & Consistency (Meetr)', () => {
  let instA: any;
  let instB: any;
  let studentA: any;
  let officerA: any;
  let officerB: any;

  let tokenOfficerA: string;
  let tokenOfficerB: string;

  let docMarksheetConsistent: any;
  let docMarksheetMismatch: any;
  let docIncomplete: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }

    instA = await Institute.create({ code: 'INST_CALC_A', name: 'Calculation Inst A' });
    instB = await Institute.create({ code: 'INST_CALC_B', name: 'Calculation Inst B' });

    studentA = await User.create({ email: 'student.calc@inst-a.edu', name: 'Student Calc' });
    await InstituteMembership.create({
      instituteId: instA._id,
      userId: studentA._id,
      roles: [UserRole.STUDENT],
    });

    officerA = await User.create({ email: 'officer.meetr@inst-a.edu', name: 'Officer Meetr' });
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

    officerB = await User.create({ email: 'officer.b.calc@inst-b.edu', name: 'Officer B' });
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

    // 1. Consistent Marksheet: 400/500 (80.00%)
    docMarksheetConsistent = await DocumentModel.create({
      instituteId: instA._id,
      studentId: studentA._id,
      applicationId: 'APP-M6-001',
      category: DocumentTypeCategory.ACADEMIC_MARKSHEET,
      filename: 'cbse_consistent.pdf',
      originalName: 'cbse_consistent.pdf',
      storageDriver: 'local',
      storageKey: 'clean/cbse_consistent.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 20480,
      checksumSha256: 'sha256-m6-hash-1',
      status: DocumentProcessingState.EXTRACTED,
      scanState: ScanState.CLEAN,
    });

    await DocumentExtractionModel.create({
      documentId: docMarksheetConsistent._id,
      applicationId: 'APP-M6-001',
      instituteId: instA._id,
      profileId: new mongoose.Types.ObjectId(),
      profileKey: 'CBSE_XII_MARKSHEET_2024',
      profileVersion: '1.0.0',
      version: 1,
      needsReview: false,
      fields: [
        {
          fieldKey: 'percentage',
          label: 'Printed Percentage',
          dataType: 'NUMBER',
          rawValue: '80.00',
          normalizedValue: 80.0,
          confidence: 0.95,
          confidenceMethod: 'PATTERN_OCR_ALIGNMENT',
          isBelowThreshold: false,
          reviewStatus: FieldReviewStatus.AUTO_ACCEPTED,
        },
        {
          fieldKey: 'totalMarks',
          label: 'Total Obtained Marks',
          dataType: 'NUMBER',
          rawValue: '400',
          normalizedValue: 400,
          confidence: 0.95,
          confidenceMethod: 'PATTERN_OCR_ALIGNMENT',
          isBelowThreshold: false,
          reviewStatus: FieldReviewStatus.AUTO_ACCEPTED,
        },
        {
          fieldKey: 'maxMarks',
          label: 'Maximum Marks',
          dataType: 'NUMBER',
          rawValue: '500',
          normalizedValue: 500,
          confidence: 0.95,
          confidenceMethod: 'PATTERN_OCR_ALIGNMENT',
          isBelowThreshold: false,
          reviewStatus: FieldReviewStatus.AUTO_ACCEPTED,
        },
      ],
    });

    // 2. Mismatched Marksheet: Subject marks sum to 400/500 (80%), but printed percentage is 84% (P12 requirement)
    docMarksheetMismatch = await DocumentModel.create({
      instituteId: instA._id,
      studentId: studentA._id,
      applicationId: 'APP-M6-002',
      category: DocumentTypeCategory.ACADEMIC_MARKSHEET,
      filename: 'cbse_mismatch.pdf',
      originalName: 'cbse_mismatch.pdf',
      storageDriver: 'local',
      storageKey: 'clean/cbse_mismatch.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 20480,
      checksumSha256: 'sha256-m6-hash-2',
      status: DocumentProcessingState.EXTRACTED,
      scanState: ScanState.CLEAN,
    });

    await DocumentExtractionModel.create({
      documentId: docMarksheetMismatch._id,
      applicationId: 'APP-M6-002',
      instituteId: instA._id,
      profileId: new mongoose.Types.ObjectId(),
      profileKey: 'CBSE_XII_MARKSHEET_2024',
      profileVersion: '1.0.0',
      version: 1,
      needsReview: false,
      fields: [
        {
          fieldKey: 'percentage',
          label: 'Printed Percentage',
          dataType: 'NUMBER',
          rawValue: '84.00',
          normalizedValue: 84.0, // Disagrees with 400/500 = 80.0%
          confidence: 0.95,
          confidenceMethod: 'PATTERN_OCR_ALIGNMENT',
          isBelowThreshold: false,
          reviewStatus: FieldReviewStatus.AUTO_ACCEPTED,
        },
        {
          fieldKey: 'subjectMarks',
          label: 'Subject Marks Breakdown',
          dataType: 'ARRAY',
          rawValue: null,
          normalizedValue: [
            { subjectName: 'English Core', maxMarks: 100, obtainedMarks: 80 },
            { subjectName: 'Mathematics', maxMarks: 100, obtainedMarks: 75 },
            { subjectName: 'Physics', maxMarks: 100, obtainedMarks: 85 },
            { subjectName: 'Chemistry', maxMarks: 100, obtainedMarks: 78 },
            { subjectName: 'Computer Science', maxMarks: 100, obtainedMarks: 82 },
          ], // Sum = 400 / 500 = 80.0%
          confidence: 0.92,
          confidenceMethod: 'PATTERN_OCR_ALIGNMENT',
          isBelowThreshold: false,
          reviewStatus: FieldReviewStatus.AUTO_ACCEPTED,
        },
      ],
    });

    // 3. Incomplete Document (Missing marks)
    docIncomplete = await DocumentModel.create({
      instituteId: instA._id,
      studentId: studentA._id,
      applicationId: 'APP-M6-003',
      category: DocumentTypeCategory.ACADEMIC_MARKSHEET,
      filename: 'incomplete.pdf',
      originalName: 'incomplete.pdf',
      storageDriver: 'local',
      storageKey: 'clean/incomplete.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 20480,
      checksumSha256: 'sha256-m6-hash-3',
      status: DocumentProcessingState.EXTRACTED,
      scanState: ScanState.CLEAN,
    });
  });

  afterAll(async () => {
    await DocumentModel.deleteMany({ applicationId: { $in: ['APP-M6-001', 'APP-M6-002', 'APP-M6-003'] } });
    await DocumentExtractionModel.deleteMany({ applicationId: { $in: ['APP-M6-001', 'APP-M6-002', 'APP-M6-003'] } });
    await AcademicConsistencyModel.deleteMany({ instituteId: instA?._id });
    await TimelineEventModel.deleteMany({ applicationId: { $in: ['APP-M6-001', 'APP-M6-002', 'APP-M6-003'] } });
    if (instA?._id) await Institute.findByIdAndDelete(instA._id);
    if (instB?._id) await Institute.findByIdAndDelete(instB._id);
    if (studentA?._id) await User.findByIdAndDelete(studentA._id);
    if (officerA?._id) await User.findByIdAndDelete(officerA._id);
    if (officerB?._id) await User.findByIdAndDelete(officerB._id);
  });

  it('Step 1: Successfully calculates consistent academic aggregate marks', async () => {
    const res = await request(app)
      .post(`/api/v1/documents/${docMarksheetConsistent._id}/consistency`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerA}`)
      .send({ profileKey: 'CBSE_XII_STANDARD' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(ConsistencyStatus.CONSISTENT);
    expect(res.body.data.computedTotalMarks).toBe(400);
    expect(res.body.data.computedMaxMarks).toBe(500);
    expect(res.body.data.computedPercentage).toBe(80.0);
    expect(res.body.data.printedPercentage).toBe(80.0);
    expect(res.body.data.discrepancyFlagged).toBe(false);
    expect(res.body.data.profileKey).toBe('CBSE_XII_STANDARD');
    expect(res.body.data.profileVersion).toBe('1.0.0');
  });

  it('Step 2: Detects and flags printed percentage that disagrees with recomputed subject marks (P12 Acceptance Criteria)', async () => {
    const res = await request(app)
      .post(`/api/v1/documents/${docMarksheetMismatch._id}/consistency`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerA}`)
      .send({ profileKey: 'CBSE_XII_STANDARD' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(ConsistencyStatus.MISMATCH);
    expect(res.body.data.computedTotalMarks).toBe(400);
    expect(res.body.data.computedPercentage).toBe(80.0);
    expect(res.body.data.printedPercentage).toBe(84.0);
    expect(res.body.data.percentageDifference).toBe(4.0);
    expect(res.body.data.discrepancyFlagged).toBe(true);
    expect(res.body.data.notes).toContain('Mismatch is a review signal, not an authenticity verdict');

    // Verify timeline event was recorded
    const events = await TimelineEventModel.find({ applicationId: 'APP-M6-002' });
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].title).toContain('Academic Consistency: MISMATCH');
  });

  it('Step 3: Missing or ambiguous inputs return UNABLE_TO_CALCULATE without inventing results', async () => {
    const res = await request(app)
      .post(`/api/v1/documents/${docIncomplete._id}/consistency`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(ConsistencyStatus.UNABLE_TO_CALCULATE);
    expect(res.body.data.notes).toContain('Unable to calculate');
    expect(res.body.data.discrepancyFlagged).toBe(true);
  });

  it('Step 4: Idempotent execution updates version without duplicate database records', async () => {
    // Call consistency check a second time on the same document
    const res = await request(app)
      .post(`/api/v1/documents/${docMarksheetConsistent._id}/consistency`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.version).toBe(2);

    const count = await AcademicConsistencyModel.countDocuments({ documentId: docMarksheetConsistent._id });
    expect(count).toBe(1); // Exactly 1 document record, not duplicated
  });

  it('Step 5: Retrieves persisted consistency result via GET endpoint', async () => {
    const res = await request(app)
      .get(`/api/v1/documents/${docMarksheetConsistent._id}/consistency`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.computedPercentage).toBe(80.0);
  });

  it('Step 6: Cross-Tenant Denial: Officer from Institute B cannot run or view consistency for Institute A', async () => {
    const res = await request(app)
      .post(`/api/v1/documents/${docMarksheetConsistent._id}/consistency`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerB}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Forbidden');
  });
});
