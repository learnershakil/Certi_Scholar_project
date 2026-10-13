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
import { OCRResultModel } from '../src/models/OCRResult';
import { CorrectionModel } from '../src/models/Correction';
import { AuditEntry } from '../src/models/AuditEntry';
import { TimelineEventModel } from '../src/models/TimelineEvent';
import {
  DocumentTypeCategory,
  DocumentProcessingState,
  ScanState,
  FieldReviewStatus,
  UserRole,
} from '@repo/contracts';

describe('M5 Human Review & Correction (Katyayni Singh)', () => {
  let instA: any;
  let instB: any;
  let studentA: any;
  let officerA: any;
  let officerB: any;

  let tokenStudentA: string;
  let tokenOfficerA: string;
  let tokenOfficerB: string;

  let testDocA: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }

    instA = await Institute.create({ code: 'INST_REV_A', name: 'Review Institute A' });
    instB = await Institute.create({ code: 'INST_REV_B', name: 'Review Institute B' });

    studentA = await User.create({ email: 'student.m5@inst-a.edu', name: 'Student M5' });
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

    officerA = await User.create({ email: 'officer.m5@inst-a.edu', name: 'Officer Katyayni' });
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

    officerB = await User.create({ email: 'officer.b@inst-b.edu', name: 'Officer B' });
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

    // Seed document with OCR and extraction records
    testDocA = await DocumentModel.create({
      instituteId: instA._id,
      studentId: studentA._id,
      applicationId: 'APP-M5-001',
      category: DocumentTypeCategory.ACADEMIC_MARKSHEET,
      filename: 'cbse_twelfth_marksheet.pdf',
      originalName: 'cbse_twelfth_marksheet.pdf',
      storageDriver: 'local',
      storageKey: 'clean/cbse_twelfth_marksheet.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 20480,
      checksumSha256: 'sha256-m5-test-hash',
      status: DocumentProcessingState.PENDING_REVIEW,
      scanState: ScanState.CLEAN,
    });

    // OCR Result with bounding geometry
    await OCRResultModel.create({
      documentId: testDocA._id,
      instituteId: instA._id,
      provider: 'TESSERACT',
      fullText:
        'CENTRAL BOARD OF SECONDARY EDUCATION\nROLL NO: 1234567\nSTUDENT NAME: RAHUL KUMAR\nMARKS: 410/500 (82.00%)',
      pageCount: 1,
      latencyMs: 120,
      status: 'COMPLETED',
      pages: [
        {
          pageNumber: 1,
          width: 800,
          height: 1000,
          tokens: [
            { text: 'ROLL', boundingBox: { vertices: [{ x: 10, y: 10 }, { x: 50, y: 10 }, { x: 50, y: 25 }, { x: 10, y: 25 }] } },
            { text: '1234567', boundingBox: { vertices: [{ x: 60, y: 10 }, { x: 120, y: 10 }, { x: 120, y: 25 }, { x: 60, y: 25 }] } },
          ],
        },
      ],
    });

    // Extraction with one low-confidence field needing review
    await DocumentExtractionModel.create({
      documentId: testDocA._id,
      applicationId: 'APP-M5-001',
      instituteId: instA._id,
      profileId: new mongoose.Types.ObjectId(),
      profileKey: 'CBSE_XII_MARKSHEET_2024',
      profileVersion: '1.0.0',
      version: 1,
      needsReview: true,
      fields: [
        {
          fieldKey: 'studentName',
          label: 'Student Full Name',
          dataType: 'STRING',
          rawValue: 'RAHUL KUMAR',
          normalizedValue: 'RAHUL KUMAR',
          confidence: 0.98,
          confidenceMethod: 'PATTERN_OCR_ALIGNMENT',
          isBelowThreshold: false,
          reviewStatus: FieldReviewStatus.AUTO_ACCEPTED,
          source: {
            page: 1,
            boundingPolygon: {
              vertices: [{ x: 50, y: 50 }, { x: 200, y: 50 }, { x: 200, y: 70 }, { x: 50, y: 70 }],
            },
          },
        },
        {
          fieldKey: 'percentage',
          label: 'Aggregate Percentage',
          dataType: 'NUMBER',
          rawValue: '82.00',
          normalizedValue: 82.0,
          confidence: 0.65, // Below threshold -> NEEDS_REVIEW
          confidenceMethod: 'PATTERN_OCR_ALIGNMENT',
          isBelowThreshold: true,
          reviewStatus: FieldReviewStatus.NEEDS_REVIEW,
          source: {
            page: 1,
            boundingPolygon: {
              vertices: [{ x: 150, y: 150 }, { x: 220, y: 150 }, { x: 220, y: 170 }, { x: 150, y: 170 }],
            },
          },
        },
      ],
    });
  });

  afterAll(async () => {
    if (testDocA?._id) {
      await DocumentModel.deleteMany({ applicationId: 'APP-M5-001' });
      await OCRResultModel.deleteMany({ documentId: testDocA._id });
      await DocumentExtractionModel.deleteMany({ applicationId: 'APP-M5-001' });
      await CorrectionModel.deleteMany({ applicationId: 'APP-M5-001' });
      await AuditEntry.deleteMany({ resourceId: testDocA._id.toString() });
      await TimelineEventModel.deleteMany({ applicationId: 'APP-M5-001' });
    }
    if (instA?._id) await Institute.findByIdAndDelete(instA._id);
    if (instB?._id) await Institute.findByIdAndDelete(instB._id);
    if (studentA?._id) await User.findByIdAndDelete(studentA._id);
    if (officerA?._id) await User.findByIdAndDelete(officerA._id);
    if (officerB?._id) await User.findByIdAndDelete(officerB._id);
  });

  it('Step 1: Verification Officer can list the review queue for their institute', async () => {
    const res = await request(app)
      .get('/api/v1/review/queue')
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toBeArray();
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.total).toBeGreaterThanOrEqual(1);
  });

  it('Step 2: Unauthorized student cannot access review queue', async () => {
    const res = await request(app)
      .get('/api/v1/review/queue')
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenStudentA}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('Step 3: Verification Officer retrieves side-by-side review payload with geometry and presigned URL', async () => {
    const res = await request(app)
      .get(`/api/v1/review/${testDocA._id}`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.document._id).toBe(testDocA._id.toString());
    expect(res.body.data.viewUrl).toBeString();
    expect(res.body.data.ocrResult.fullText).toContain('RAHUL KUMAR');
    expect(res.body.data.extraction.fields).toHaveLength(2);
    expect(res.body.data.extraction.fields[1].fieldKey).toBe('percentage');
    expect(res.body.data.extraction.fields[1].source.boundingPolygon.vertices).toHaveLength(4);
  });

  it('Step 4: Cross-Tenant Denial: Officer from Institute B cannot view document review details of Institute A', async () => {
    const res = await request(app)
      .get(`/api/v1/review/${testDocA._id}`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerB}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Forbidden');
  });

  it('Step 5: Officer performs field correction with mandatory reason, recording append-only audit trail', async () => {
    const res = await request(app)
      .post(`/api/v1/review/${testDocA._id}/action`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerA}`)
      .send({
        fieldKey: 'percentage',
        action: 'CORRECT',
        correctedValue: 82.5,
        reason: 'Digit 0 misread by OCR; verified visually against marksheet table as 82.50%',
        expectedVersion: 1,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.extraction.version).toBe(2);
    expect(res.body.data.extraction.needsReview).toBe(false); // All fields now resolved
    expect(res.body.data.correction.originalValue).toBe(82.0);
    expect(res.body.data.correction.correctedValue).toBe(82.5);
    expect(res.body.data.correction.action).toBe('CORRECT');

    // Verify original OCR output was NOT erased or mutated
    const ocrRecord = await OCRResultModel.findOne({ documentId: testDocA._id });
    expect(ocrRecord).not.toBeNull();
    expect(ocrRecord?.fullText).toContain('MARKS: 410/500 (82.00%)');

    // Verify append-only correction was saved in MongoDB
    const savedCorrection = await CorrectionModel.findOne({ documentId: testDocA._id });
    expect(savedCorrection).not.toBeNull();
    expect(savedCorrection?.fieldKey).toBe('percentage');
    expect(savedCorrection?.reason).toContain('Digit 0 misread');

    // Verify audit entry was logged
    const auditRecord = await AuditEntry.findOne({ resourceType: 'CORRECTION' });
    expect(auditRecord).not.toBeNull();
    expect(auditRecord?.action).toBe('FIELD_CORRECT');

    // Verify timeline event was logged
    const timelineEvents = await TimelineEventModel.find({ applicationId: 'APP-M5-001' });
    expect(timelineEvents.length).toBeGreaterThanOrEqual(1);

    // Verify document status transitioned to REVIEWED
    const updatedDoc = await DocumentModel.findById(testDocA._id);
    expect(updatedDoc?.status).toBe(DocumentProcessingState.REVIEWED);
  });

  it('Step 6: Optimistic Concurrency Control rejects stale review update when version mismatches', async () => {
    const res = await request(app)
      .post(`/api/v1/review/${testDocA._id}/action`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerA}`)
      .send({
        fieldKey: 'percentage',
        action: 'CORRECT',
        correctedValue: 83.0,
        reason: 'Attempting conflicting concurrent update with old version 1',
        expectedVersion: 1, // Current is now 2
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Optimistic lock conflict');
  });

  it('Step 7: Cross-Tenant Denial: Officer from Institute B cannot submit correction for Institute A', async () => {
    const res = await request(app)
      .post(`/api/v1/review/${testDocA._id}/action`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerB}`)
      .send({
        fieldKey: 'studentName',
        action: 'APPROVE',
        reason: 'Unauthorized cross-tenant attempt',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Forbidden');
  });
});
