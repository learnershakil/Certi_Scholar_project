import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { PDFDocument } from 'pdf-lib';
import mongoose from 'mongoose';
import request from 'supertest';
import { app } from '../src/app';
import { config } from '../src/config/env';
import { Institute } from '../src/models/Institute';
import { User } from '../src/models/User';
import { InstituteMembership } from '../src/models/InstituteMembership';
import { DocumentModel } from '../src/models/Document';
import { AuditEntry } from '../src/models/AuditEntry';
import { UserRole, DocumentProcessingState, ScanState } from '@repo/contracts';
import jwt from 'jsonwebtoken';

describe('M1 Multi-Institute Tenancy & Secure Intake Integration E2E', () => {
  let instA: any;
  let instB: any;
  let studentA: any;
  let studentA2: any;
  let studentB: any;
  let officerA: any;
  let tokenStudentA: string;
  let tokenStudentA2: string;
  let tokenStudentB: string;
  let tokenOfficerA: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }

    // Clean test database
    await Institute.deleteMany({});
    await User.deleteMany({});
    await InstituteMembership.deleteMany({});
    await DocumentModel.deleteMany({});
    await AuditEntry.deleteMany({});

    // 1. Create two institutes
    instA = await Institute.create({ code: 'INST_A', name: 'Institute Alpha' });
    instB = await Institute.create({ code: 'INST_B', name: 'Institute Beta' });

    // 2. Create Student A for Institute A
    studentA = await User.create({ email: 'student.a@inst-a.edu', name: 'Student Alpha' });
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

    // 2b. Create second Student A2 in Institute A (for same-institute cross-student testing)
    studentA2 = await User.create({ email: 'student.a2@inst-a.edu', name: 'Student Alpha 2' });
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

    // 3. Create Student B for Institute B
    studentB = await User.create({ email: 'student.b@inst-b.edu', name: 'Student Beta' });
    await InstituteMembership.create({
      instituteId: instB._id,
      userId: studentB._id,
      roles: [UserRole.STUDENT],
    });
    tokenStudentB = jwt.sign(
      {
        userId: studentB._id.toString(),
        email: studentB.email,
        roles: [UserRole.STUDENT],
        instituteId: instB._id.toString(),
        isSuperAdmin: false,
      },
      config.jwtSecret
    );

    // 4. Create Verification Officer for Institute A
    officerA = await User.create({ email: 'officer.a@inst-a.edu', name: 'Officer Alpha' });
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
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('Step 1: Student A registers document upload for Institute A', async () => {
    const res = await request(app)
      .post('/api/v1/documents')
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenStudentA}`)
      .send({
        filename: 'cbse_xii_marksheet.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024 * 50,
        applicationId: 'APP-2026-001',
        instituteId: instA._id.toString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.document.status).toBe(DocumentProcessingState.RECEIVED);
    expect(res.body.data.document.instituteId).toBe(instA._id.toString());
    expect(res.body.data.uploadUrl).toBeDefined();
  });

  it('Step 2: Student A cannot register upload with another institute ID (Tenancy Guard)', async () => {
    const res = await request(app)
      .post('/api/v1/documents')
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenStudentA}`)
      .send({
        filename: 'cbse_xii_marksheet.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024 * 50,
        applicationId: 'APP-2026-999',
        instituteId: instB._id.toString(), // Wrong tenant!
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('Step 3: Student A uploads clean PDF buffer and gets promoted to clean processing queue', async () => {
    // First initiate
    const initRes = await request(app)
      .post('/api/v1/documents')
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenStudentA}`)
      .send({
        filename: 'clean_marksheet.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024 * 20,
        applicationId: 'APP-2026-002',
        instituteId: instA._id.toString(),
      });

    const docId = initRes.body.data.document._id;

    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([500, 700]);
    const validPdfBuffer = Buffer.from(await pdfDoc.save());

    const uploadRes = await request(app)
      .post(`/api/v1/documents/${docId}/upload`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenStudentA}`)
      .attach('file', validPdfBuffer, 'clean_marksheet.pdf');

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.success).toBe(true);
    expect(uploadRes.body.data.status).toBe(DocumentProcessingState.PROCESSING_QUEUED);
    expect(uploadRes.body.data.scanState).toBe(ScanState.CLEAN);
    expect(uploadRes.body.data.checksumSha256).toBeDefined();
  });

  it('Step 4: Student A uploads zero-byte file -> Rejected with 400', async () => {
    const initRes = await request(app)
      .post('/api/v1/documents')
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenStudentA}`)
      .send({
        filename: 'zero_byte.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        applicationId: 'APP-2026-002B',
        instituteId: instA._id.toString(),
      });

    const docId = initRes.body.data.document._id;

    const uploadRes = await request(app)
      .post(`/api/v1/documents/${docId}/upload`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenStudentA}`)
      .attach('file', Buffer.alloc(0), 'zero_byte.pdf');

    expect(uploadRes.status).toBe(400);
    expect(uploadRes.body.success).toBe(false);
  });

  it('Step 5: Student A uploads malware infected file -> Quarantined and Rejected', async () => {
    const initRes = await request(app)
      .post('/api/v1/documents')
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenStudentA}`)
      .send({
        filename: 'suspicious_award.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024 * 5,
        applicationId: 'APP-2026-003',
        instituteId: instA._id.toString(),
      });

    const docId = initRes.body.data.document._id;

    const infectedBuffer = Buffer.from(
      '%PDF-1.4\nX5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*\n%%EOF'
    );

    const uploadRes = await request(app)
      .post(`/api/v1/documents/${docId}/upload`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenStudentA}`)
      .attach('file', infectedBuffer, 'suspicious_award.pdf');

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.data.status).toBe(DocumentProcessingState.QUARANTINED_MALWARE);
    expect(uploadRes.body.data.scanState).toBe(ScanState.INFECTED);
    expect(uploadRes.body.data.scanDetails.signatureFound).toBe('Win.Test.EICAR_HDB-1');
  });

  it('Step 6: Officer Alpha views clean document -> presigned view URL issued & truthfully audited', async () => {
    const doc = await DocumentModel.findOne({
      instituteId: instA._id,
      scanState: ScanState.CLEAN,
    });
    expect(doc).toBeDefined();

    const viewRes = await request(app)
      .get(`/api/v1/documents/${doc!._id}/view-url?reason=Verification%20Audit`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerA}`);

    expect(viewRes.status).toBe(200);
    expect(viewRes.body.data.viewUrl).toBeDefined();

    // Verify audit record exists with PRESIGNED_URL_ISSUED action
    const audit = await AuditEntry.findOne({
      resourceId: doc!._id.toString(),
      action: 'PRESIGNED_URL_ISSUED',
    });
    expect(audit).toBeDefined();
    expect(audit!.actorId).toBe(officerA._id.toString());
    expect(audit!.instituteId.toString()).toBe(instA._id.toString());
    expect(audit!.viewReason).toContain('Verification Audit');
  });

  it('Step 7: Same-Institute Cross-Student Denial: Student A2 cannot view Student A document', async () => {
    const docA = await DocumentModel.findOne({
      instituteId: instA._id,
      studentId: studentA._id,
      scanState: ScanState.CLEAN,
    });
    expect(docA).toBeDefined();

    // Student A2 belongs to Institute A as well, but does NOT own docA
    const crossRes = await request(app)
      .get(`/api/v1/documents/${docA!._id}`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenStudentA2}`);

    expect(crossRes.status).toBe(403);
    expect(crossRes.body.success).toBe(false);
  });

  it('Step 8: Cross-Tenant Denial: Officer Alpha cannot view Document belonging to Institute Beta', async () => {
    // Create doc in Institute B
    const docB = await DocumentModel.create({
      instituteId: instB._id,
      studentId: studentB._id,
      applicationId: 'APP-BETA-001',
      filename: 'beta_doc.pdf',
      originalName: 'beta_doc.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 1024,
      checksumSha256: 'abc123',
      storageDriver: 'local',
      storageKey: 'clean/instB/beta_doc.pdf',
      status: DocumentProcessingState.PROCESSING_QUEUED,
      scanState: ScanState.CLEAN,
    });

    const crossRes = await request(app)
      .get(`/api/v1/documents/${docB._id}/view-url`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerA}`); // Officer from Institute A

    expect(crossRes.status).toBe(403);
    expect(crossRes.body.success).toBe(false);
  });

  it('Step 9: Tenant-scoped listing ensures Institute Alpha users only see Institute Alpha documents', async () => {
    const listRes = await request(app)
      .get('/api/v1/documents')
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerA}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThan(0);
    // Every single document in list must belong to Institute Alpha
    for (const doc of listRes.body.data) {
      expect(doc.instituteId).toBe(instA._id.toString());
    }
  });
});
