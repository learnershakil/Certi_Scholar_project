import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import mongoose from 'mongoose';
import request from 'supertest';
import { app } from '../src/app';
import { config } from '../src/config/env';
import { Institute } from '../src/models/Institute';
import { User } from '../src/models/User';
import { InstituteMembership } from '../src/models/InstituteMembership';
import { DocumentModel } from '../src/models/Document';
import { OCRResultModel } from '../src/models/OCRResult';
import { enqueueOcrJob, closeOcrQueue } from '../src/services/queueService';
import { UserRole, DocumentProcessingState, ScanState } from '@repo/contracts';
import jwt from 'jsonwebtoken';

describe('M2 Asynchronous OCR & Text Extraction Integration', () => {
  let instA: any;
  let instB: any;
  let studentA: any;
  let studentA2: any;
  let officerA: any;
  let tokenStudentA: string;
  let tokenStudentA2: string;
  let tokenOfficerA: string;
  let cleanDocA: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }

    instA = await Institute.create({ code: 'INST_OCR_A', name: 'OCR Institute A' });
    instB = await Institute.create({ code: 'INST_OCR_B', name: 'OCR Institute B' });

    studentA = await User.create({ email: 'ocr.student.a@inst.edu', name: 'Student OCR A' });
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

    studentA2 = await User.create({ email: 'ocr.student.a2@inst.edu', name: 'Student OCR A2' });
    await InstituteMembership.create({
      instituteId: instA._id,
      userId: studentA2._id,
      roles: [UserRole.STUDENT],
    });
    tokenStudentA2 = jwt.sign(
      {
        userId: studentA2._id.toString(),
        email: studentA2.email,
        roles: [UserRole.STUDENT],
        instituteId: instA._id.toString(),
        isSuperAdmin: false,
      },
      config.jwtSecret
    );

    officerA = await User.create({ email: 'ocr.officer.a@inst.edu', name: 'Officer OCR A' });
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

    cleanDocA = await DocumentModel.create({
      instituteId: instA._id,
      studentId: studentA._id,
      applicationId: 'APP-OCR-001',
      filename: 'clean_marksheet_uuid.pdf',
      originalName: 'marksheet_clean.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 1024 * 40,
      checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      storageDriver: 'local',
      storageKey: 'clean/clean_marksheet.pdf',
      status: DocumentProcessingState.PROCESSING_QUEUED,
      scanState: ScanState.CLEAN,
    });
  });

  afterAll(async () => {
    await closeOcrQueue();
  });

  it('Step 1: Enqueues OCR job idempotently into BullMQ queue', async () => {
    const jobId1 = await enqueueOcrJob({
      documentId: cleanDocA._id.toString(),
      instituteId: instA._id.toString(),
      cleanStorageKey: cleanDocA.storageKey,
      mimeType: cleanDocA.mimeType,
      fileSizeBytes: cleanDocA.fileSize,
    });

    expect(jobId1).toBe(`ocr-${cleanDocA._id.toString()}`);

    // Re-enqueueing same document uses identical job ID (idempotent deduplication)
    const jobId2 = await enqueueOcrJob({
      documentId: cleanDocA._id.toString(),
      instituteId: instA._id.toString(),
      cleanStorageKey: cleanDocA.storageKey,
      mimeType: cleanDocA.mimeType,
      fileSizeBytes: cleanDocA.fileSize,
    });

    expect(jobId2).toBe(jobId1);
  });

  it('Step 2: Stores normalized OCR result with full text and bounding geometry', async () => {
    const savedOcr = await OCRResultModel.create({
      documentId: cleanDocA._id,
      instituteId: instA._id,
      provider: 'TESSERACT',
      providerVersion: '5.5.4',
      fullText: 'CENTRAL BOARD OF SECONDARY EDUCATION\nROLL: 129481\nMARKS: 472/500',
      pageCount: 1,
      latencyMs: 340,
      status: 'COMPLETED',
      pages: [
        {
          pageNumber: 1,
          width: 800,
          height: 1100,
          unit: 'PIXEL',
          confidence: 0.94,
          text: 'CENTRAL BOARD OF SECONDARY EDUCATION\nROLL: 129481\nMARKS: 472/500',
          blocks: [
            {
              blockType: 'TEXT',
              text: 'CENTRAL BOARD OF SECONDARY EDUCATION',
              confidence: 0.96,
              paragraphs: [
                {
                  text: 'CENTRAL BOARD OF SECONDARY EDUCATION',
                  words: [
                    {
                      text: 'CENTRAL',
                      confidence: 0.98,
                      boundingPolygon: {
                        vertices: [
                          { x: 50, y: 50 },
                          { x: 120, y: 50 },
                          { x: 120, y: 65 },
                          { x: 50, y: 65 },
                        ],
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(savedOcr._id).toBeDefined();
    expect(savedOcr.fullText).toContain('CENTRAL BOARD');
    expect(savedOcr.pages[0].blocks[0].paragraphs[0].words[0].boundingPolygon.vertices.length).toBe(4);
  });

  it('Step 3: Student A can retrieve normalized OCR result via API', async () => {
    const res = await request(app)
      .get(`/api/v1/documents/${cleanDocA._id}/ocr`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenStudentA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.provider).toBe('TESSERACT');
    expect(res.body.data.fullText).toContain('CENTRAL BOARD');
    expect(res.body.data.pages.length).toBe(1);
  });

  it('Step 4: Officer A (authorized staff) can retrieve normalized OCR result', async () => {
    const res = await request(app)
      .get(`/api/v1/documents/${cleanDocA._id}/ocr`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.documentId).toBe(cleanDocA._id.toString());
  });

  it('Step 5: Same-Institute Cross-Student Denial: Student A2 cannot view Student A OCR result', async () => {
    const res = await request(app)
      .get(`/api/v1/documents/${cleanDocA._id}/ocr`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenStudentA2}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Forbidden');
  });

  it('Step 6: Cross-Tenant Denial: Officer from Institute B cannot view Institute A OCR result', async () => {
    const officerB = await User.create({ email: 'officer.b@inst-b.edu', name: 'Officer B' });
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

    const res = await request(app)
      .get(`/api/v1/documents/${cleanDocA._id}/ocr`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerB}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
