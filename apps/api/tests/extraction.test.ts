import { describe, it, expect, beforeAll } from 'bun:test';
import mongoose from 'mongoose';
import request from 'supertest';
import { app } from '../src/app';
import { config } from '../src/config/env';
import { Institute } from '../src/models/Institute';
import { User } from '../src/models/User';
import { InstituteMembership } from '../src/models/InstituteMembership';
import { DocumentModel } from '../src/models/Document';
import { OCRResultModel } from '../src/models/OCRResult';
import { ExtractionProfileModel } from '../src/models/ExtractionProfile';
import { DocumentExtractionModel } from '../src/models/DocumentExtraction';
import { ensureDefaultExtractionProfiles } from '../src/services/classification';
import {
  DocumentTypeCategory,
  UserRole,
  DocumentProcessingState,
  ScanState,
  FieldReviewStatus,
} from '@repo/contracts';
import jwt from 'jsonwebtoken';

describe('M4 Field Extraction & Confidence Calibration (Priyanshu Kumar)', () => {
  let instA: any;
  let instB: any;
  let studentA: any;
  let officerA: any;
  let tokenStudentA: string;
  let tokenOfficerA: string;
  let docMarksheet: any;
  let docIncome: any;
  let docIncomplete: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }

    await ensureDefaultExtractionProfiles();

    instA = await Institute.create({ code: 'INST_EXT_A', name: 'Extraction Inst A' });
    instB = await Institute.create({ code: 'INST_EXT_B', name: 'Extraction Inst B' });

    studentA = await User.create({ email: 'ext.student@inst.edu', name: 'Student Ext' });
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

    officerA = await User.create({ email: 'ext.officer@inst.edu', name: 'Officer Ext' });
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

    const marksheetProfile = await ExtractionProfileModel.findOne({ key: 'CBSE_XII_MARKSHEET_2024' });

    // 1. Clean CBSE Marksheet Document
    docMarksheet = await DocumentModel.create({
      instituteId: instA._id,
      studentId: studentA._id,
      applicationId: 'APP-EXT-001',
      filename: 'cbse_valid_marksheet.pdf',
      originalName: 'cbse_valid_marksheet.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 20480,
      checksumSha256: 'sha256-ext-marksheet',
      storageDriver: 'local',
      storageKey: 'clean/cbse_valid_marksheet.pdf',
      status: DocumentProcessingState.PROCESSING_QUEUED,
      scanState: ScanState.CLEAN,
      category: DocumentTypeCategory.ACADEMIC_MARKSHEET,
      extractionProfileId: marksheetProfile?._id.toString(),
    });

    await OCRResultModel.create({
      documentId: docMarksheet._id,
      instituteId: instA._id,
      provider: 'TESSERACT',
      fullText:
        'CENTRAL BOARD OF SECONDARY EDUCATION\n' +
        'STATEMENT OF MARKS\n' +
        'NAME OF CANDIDATE: PRIYANSHU KUMAR\n' +
        'ROLL NO: 1294819\n' +
        'EXAMINATION: 2024\n' +
        'TOTAL MARKS: 475 / 500\n' +
        'PERCENTAGE: 95.0%',
      pageCount: 1,
      latencyMs: 140,
      status: 'COMPLETED',
      pages: [],
    });

    // 2. State Income Certificate Document
    const incomeProfile = await ExtractionProfileModel.findOne({ key: 'STATE_INCOME_CERT_V1' });
    docIncome = await DocumentModel.create({
      instituteId: instA._id,
      studentId: studentA._id,
      applicationId: 'APP-EXT-002',
      filename: 'state_income.pdf',
      originalName: 'state_income.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 18400,
      checksumSha256: 'sha256-ext-income',
      storageDriver: 'local',
      storageKey: 'clean/state_income.pdf',
      status: DocumentProcessingState.PROCESSING_QUEUED,
      scanState: ScanState.CLEAN,
      category: DocumentTypeCategory.INCOME_CERTIFICATE,
      extractionProfileId: incomeProfile?._id.toString(),
    });

    await OCRResultModel.create({
      documentId: docIncome._id,
      instituteId: instA._id,
      provider: 'TESSERACT',
      fullText:
        'OFFICE OF THE TAHSILDAR\n' +
        'INCOME CERTIFICATE (PRAMAN PATRA)\n' +
        'CERTIFICATE NO: INC-2024-99182\n' +
        'NAME OF APPLICANT: RAMESH CHANDRA\n' +
        'TOTAL ANNUAL INCOME: RS. 140000 PER ANNUM',
      pageCount: 1,
      latencyMs: 110,
      status: 'COMPLETED',
      pages: [],
    });

    // 3. Incomplete document (missing candidate name and roll number)
    docIncomplete = await DocumentModel.create({
      instituteId: instA._id,
      studentId: studentA._id,
      applicationId: 'APP-EXT-003',
      filename: 'blurry_transcript.pdf',
      originalName: 'blurry_transcript.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 12000,
      checksumSha256: 'sha256-ext-incomplete',
      storageDriver: 'local',
      storageKey: 'clean/blurry_transcript.pdf',
      status: DocumentProcessingState.PROCESSING_QUEUED,
      scanState: ScanState.CLEAN,
      category: DocumentTypeCategory.ACADEMIC_MARKSHEET,
      extractionProfileId: marksheetProfile?._id.toString(),
    });

    await OCRResultModel.create({
      documentId: docIncomplete._id,
      instituteId: instA._id,
      provider: 'TESSERACT',
      fullText: 'CENTRAL BOARD EXAMINATION\nYEAR: 2024\nSOME UNREADABLE TEXT',
      pageCount: 1,
      latencyMs: 100,
      status: 'COMPLETED',
      pages: [],
    });
  });

  it('Step 1: Extracts structured fields from CBSE Marksheet with high confidence and bounding polygons', async () => {
    const res = await request(app)
      .post(`/api/v1/documents/${docMarksheet._id}/extract`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.profileKey).toBe('CBSE_XII_MARKSHEET_2024');
    expect(data.needsReview).toBe(false);

    const nameField = data.fields.find((f: any) => f.fieldKey === 'studentName');
    expect(nameField).toBeDefined();
    expect(nameField.normalizedValue).toBe('PRIYANSHU KUMAR');
    expect(nameField.confidence).toBeGreaterThanOrEqual(0.85);
    expect(nameField.reviewStatus).toBe(FieldReviewStatus.AUTO_ACCEPTED);
    expect(nameField.source.boundingPolygon.vertices.length).toBe(4);

    const rollField = data.fields.find((f: any) => f.fieldKey === 'rollNumber');
    expect(rollField.normalizedValue).toBe('1294819');
    expect(rollField.confidence).toBeGreaterThanOrEqual(0.9);

    const marksField = data.fields.find((f: any) => f.fieldKey === 'marksObtained');
    expect(marksField.normalizedValue).toBe(475);

    const pctField = data.fields.find((f: any) => f.fieldKey === 'percentage');
    expect(pctField.normalizedValue).toBe(95.0);
  });

  it('Step 2: Extracts structured fields from State Income Certificate', async () => {
    const res = await request(app)
      .post(`/api/v1/documents/${docIncome._id}/extract`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.profileKey).toBe('STATE_INCOME_CERT_V1');

    const incomeField = data.fields.find((f: any) => f.fieldKey === 'annualIncomeRupees');
    expect(incomeField.normalizedValue).toBe(140000);
    expect(incomeField.reviewStatus).toBe(FieldReviewStatus.AUTO_ACCEPTED);

    const certField = data.fields.find((f: any) => f.fieldKey === 'certificateNumber');
    expect(certField.normalizedValue).toBe('INC-2024-99182');
  });

  it('Step 3: Missing required fields routes document to NEEDS_REVIEW and sets PENDING_REVIEW', async () => {
    const res = await request(app)
      .post(`/api/v1/documents/${docIncomplete._id}/extract`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.needsReview).toBe(true);
    expect(data.allRequiredPresent).toBe(false);

    const nameField = data.fields.find((f: any) => f.fieldKey === 'studentName');
    expect(nameField.reviewStatus).toBe(FieldReviewStatus.NEEDS_REVIEW);
    expect(nameField.isBelowThreshold).toBe(true);

    // Verify document status updated to PENDING_REVIEW
    const updatedDoc = await DocumentModel.findById(docIncomplete._id);
    expect(updatedDoc?.status).toBe(DocumentProcessingState.PENDING_REVIEW);
  });

  it('Step 4: Reprocessing creates a new extraction version without destroying previous evidence', async () => {
    const res = await request(app)
      .post(`/api/v1/documents/${docMarksheet._id}/extract`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.version).toBe(2);

    const versions = await DocumentExtractionModel.find({ documentId: docMarksheet._id });
    expect(versions.length).toBe(2);
  });

  it('Step 5: Cross-Tenant Denial: Officer from Institute B cannot extract or read fields of Institute A', async () => {
    const officerB = await User.create({ email: 'officer.ext.b@inst-b.edu', name: 'Officer Ext B' });
    await InstituteMembership.create({
      instituteId: instB._id,
      userId: officerB._id,
      roles: [UserRole.VERIFICATION_OFFICER],
    });
    const tokenOfficerB = jwt.sign(
      {
        userId: officerB._id.toString(),
        email: officerB.email,
        roles: [UserRole.VERIFICATION_OFFICER],
        instituteId: instB._id.toString(),
        isSuperAdmin: false,
      },
      config.jwtSecret
    );

    const postRes = await request(app)
      .post(`/api/v1/documents/${docMarksheet._id}/extract`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerB}`);

    expect(postRes.status).toBe(403);

    const getRes = await request(app)
      .get(`/api/v1/documents/${docMarksheet._id}/fields`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerB}`);

    expect(getRes.status).toBe(403);
  });
});

