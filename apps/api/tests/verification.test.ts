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
import { VerificationConsentGrantModel } from '../src/models/VerificationConsentGrant';
import { VerificationResultModel } from '../src/models/VerificationResult';
import { TimelineEventModel } from '../src/models/TimelineEvent';
import {
  DocumentTypeCategory,
  DocumentProcessingState,
  ScanState,
  VerificationProviderType,
  VerificationStatus,
  UserRole,
} from '@repo/contracts';

describe('M7 Verification Adapter (learnershakil)', () => {
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

    instA = await Institute.create({ code: 'INST_VERIF_A', name: 'Verification Inst A' });
    instB = await Institute.create({ code: 'INST_VERIF_B', name: 'Verification Inst B' });

    studentA = await User.create({ email: 'student.verif@inst-a.edu', name: 'Student Verif' });
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

    officerA = await User.create({ email: 'officer.shakil@inst-a.edu', name: 'Officer Shakil' });
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

    officerB = await User.create({ email: 'officer.verif.b@inst-b.edu', name: 'Officer B' });
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

    testDocA = await DocumentModel.create({
      instituteId: instA._id,
      studentId: studentA._id,
      applicationId: 'APP-M7-001',
      category: DocumentTypeCategory.ACADEMIC_MARKSHEET,
      filename: 'marksheet_verif.pdf',
      originalName: 'marksheet_verif.pdf',
      storageDriver: 'local',
      storageKey: 'clean/marksheet_verif.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 20480,
      checksumSha256: 'sha256-m7-test-hash',
      status: DocumentProcessingState.REVIEWED,
      scanState: ScanState.CLEAN,
    });
  });

  afterAll(async () => {
    if (testDocA?._id) {
      await DocumentModel.deleteMany({ applicationId: 'APP-M7-001' });
      await VerificationConsentGrantModel.deleteMany({ applicationId: 'APP-M7-001' });
      await VerificationResultModel.deleteMany({ applicationId: 'APP-M7-001' });
      await TimelineEventModel.deleteMany({ applicationId: 'APP-M7-001' });
    }
    if (instA?._id) await Institute.findByIdAndDelete(instA._id);
    if (instB?._id) await Institute.findByIdAndDelete(instB._id);
    if (studentA?._id) await User.findByIdAndDelete(studentA._id);
    if (officerA?._id) await User.findByIdAndDelete(officerA._id);
    if (officerB?._id) await User.findByIdAndDelete(officerB._id);
  });

  it('Step 1: Common provider list truthfully exposes DigiLocker as unavailable without credentials', async () => {
    const res = await request(app)
      .get('/api/v1/verification/providers')
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const providers = res.body.data;
    const dl = providers.find((p: any) => p.type === VerificationProviderType.DIGILOCKER);
    expect(dl).toBeDefined();
    expect(dl.available).toBe(false); // Truth in engineering: not configured in test environment
  });

  it('Step 2: Calling DigiLocker without credentials returns UNAVAILABLE without false claims', async () => {
    const res = await request(app)
      .post(`/api/v1/documents/${testDocA._id}/verify`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerA}`)
      .send({ provider: VerificationProviderType.DIGILOCKER });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(VerificationStatus.UNAVAILABLE);
    expect(res.body.data.isAuthenticityVerified).toBe(false);
    expect(res.body.data.officerNotes).toContain('DigiLocker integration is not configured');
  });

  it('Step 3: Student creates 30-day Certi Adapter locker consent grant and retrieves document truthfully', async () => {
    // 1. Student creates consent grant
    const consentRes = await request(app)
      .post('/api/v1/verification/consent')
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenStudentA}`)
      .send({
        applicationId: 'APP-M7-001',
        instituteId: instA._id.toString(),
        selectedDocumentIds: [testDocA._id.toString()],
        purpose: 'Scholarship eligibility document verification',
        durationDays: 30,
      });

    expect(consentRes.status).toBe(201);
    expect(consentRes.body.success).toBe(true);
    const grantId = consentRes.body.data._id;
    expect(grantId).toBeDefined();

    // 2. Perform verification via Certi Adapter
    const verifRes = await request(app)
      .post(`/api/v1/documents/${testDocA._id}/verify`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerA}`)
      .send({
        provider: VerificationProviderType.CERTI_ADAPTER,
        consentGrantId: grantId,
      });

    expect(verifRes.status).toBe(200);
    expect(verifRes.body.success).toBe(true);
    expect(verifRes.body.data.status).toBe(VerificationStatus.RETRIEVED_NOT_AUTHENTICITY_VERIFIED);
    expect(verifRes.body.data.retrievalOnly).toBe(true);
    expect(verifRes.body.data.isAuthenticityVerified).toBe(false); // Non-negotiable authenticity rule!
    expect(verifRes.body.data.officerNotes).toContain('First-party document locker sharing does NOT establish government or issuer authenticity');
  });

  it('Step 4: Revoking Certi Adapter consent immediately halts future locker access', async () => {
    const grant = await VerificationConsentGrantModel.findOne({ applicationId: 'APP-M7-001' });
    expect(grant).not.toBeNull();

    // Student revokes consent
    const revokeRes = await request(app)
      .post(`/api/v1/verification/consent/${grant!._id}/revoke`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenStudentA}`)
      .send({ reason: 'Student withdrew consent for this application' });

    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.data.status).toBe('REVOKED');

    // Subsequent retrieval attempt must return REVOKED
    const verifRes = await request(app)
      .post(`/api/v1/documents/${testDocA._id}/verify`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerA}`)
      .send({ provider: VerificationProviderType.CERTI_ADAPTER });

    expect(verifRes.status).toBe(200);
    expect(verifRes.body.data.status).toBe(VerificationStatus.REVOKED);
    expect(verifRes.body.data.officerNotes).toContain('Student revoked consented access');
  });

  it('Step 5: Verification Officer records Manual Verification with method and evidence reference', async () => {
    const res = await request(app)
      .post(`/api/v1/documents/${testDocA._id}/verify`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerA}`)
      .send({
        provider: VerificationProviderType.MANUAL,
        manualEvidence: {
          method: 'OFFICIAL_UNIVERSITY_PORTAL_CONFIRMATION',
          reference: 'CONF-REGISTRAR-REF-2026-9918',
          notes: 'Officer verified marks against state board registrar portal record',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(VerificationStatus.MATCHED);
    expect(res.body.data.isAuthenticityVerified).toBe(true);
    expect(res.body.data.evidenceReference).toBe('CONF-REGISTRAR-REF-2026-9918');
  });

  it('Step 6: Simulated provider returns SIMULATED_MATCH in dev, clearly labelled as mock', async () => {
    const res = await request(app)
      .post(`/api/v1/documents/${testDocA._id}/verify`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerA}`)
      .send({
        provider: VerificationProviderType.SIMULATED,
        simulatedScenario: 'MATCH',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(VerificationStatus.SIMULATED_MATCH);
    expect(res.body.data.isSimulated).toBe(true);
    expect(res.body.data.isAuthenticityVerified).toBe(false);
    expect(res.body.data.officerNotes).toContain('SIMULATED DEMO ONLY');
  });

  it('Step 7: Cross-Tenant Denial: Officer from Institute B cannot verify or view results for Institute A', async () => {
    const res = await request(app)
      .post(`/api/v1/documents/${testDocA._id}/verify`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerB}`)
      .send({ provider: VerificationProviderType.SIMULATED });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Forbidden');

    const getRes = await request(app)
      .get(`/api/v1/documents/${testDocA._id}/verification`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerB}`);

    expect(getRes.status).toBe(403);
  });
});

