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
import { CaseAssignmentModel } from '../src/models/CaseAssignment';
import { DocumentExtractionModel } from '../src/models/DocumentExtraction';
import {
  DocumentTypeCategory,
  DocumentProcessingState,
  ScanState,
  UserRole,
} from '@repo/contracts';

describe('Case Assignment & Officer Isolation Foundation', () => {
  let instA: any;
  let instB: any;
  let adminA: any;
  let officerA1: any;
  let officerA2: any;
  let officerB: any;
  let studentA: any;

  let tokenAdminA: string;
  let tokenOfficerA1: string;
  let tokenOfficerA2: string;
  let tokenOfficerB: string;

  let testDocA: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }

    instA = await Institute.create({ code: 'INST_CASE_A', name: 'Case Institute A' });
    instB = await Institute.create({ code: 'INST_CASE_B', name: 'Case Institute B' });

    adminA = await User.create({ email: 'admin.case@inst-a.edu', name: 'Admin Case A' });
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

    officerA1 = await User.create({ email: 'officer1.case@inst-a.edu', name: 'Officer A1' });
    await InstituteMembership.create({
      instituteId: instA._id,
      userId: officerA1._id,
      roles: [UserRole.VERIFICATION_OFFICER],
    });
    tokenOfficerA1 = jwt.sign(
      {
        userId: officerA1._id.toString(),
        email: officerA1.email,
        roles: [UserRole.VERIFICATION_OFFICER],
        instituteId: instA._id.toString(),
        isSuperAdmin: false,
      },
      config.jwtSecret
    );

    officerA2 = await User.create({ email: 'officer2.case@inst-a.edu', name: 'Officer A2' });
    await InstituteMembership.create({
      instituteId: instA._id,
      userId: officerA2._id,
      roles: [UserRole.VERIFICATION_OFFICER],
    });
    tokenOfficerA2 = jwt.sign(
      {
        userId: officerA2._id.toString(),
        email: officerA2.email,
        roles: [UserRole.VERIFICATION_OFFICER],
        instituteId: instA._id.toString(),
        isSuperAdmin: false,
      },
      config.jwtSecret
    );

    officerB = await User.create({ email: 'officer.case@inst-b.edu', name: 'Officer B' });
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

    studentA = await User.create({ email: 'student.case@inst-a.edu', name: 'Student Case A' });

    testDocA = await DocumentModel.create({
      instituteId: instA._id,
      studentId: studentA._id,
      applicationId: new mongoose.Types.ObjectId().toString(),
      filename: 'case_test_marksheet_uuid.pdf',
      originalName: 'case_test_marksheet.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 1024,
      checksumSha256: 'hash-case-test-sha256',
      storageDriver: 'local',
      storageKey: 'quarantine/case_test_marksheet.pdf',
      scanState: ScanState.CLEAN,
      status: DocumentProcessingState.PENDING_REVIEW,
      category: DocumentTypeCategory.ACADEMIC_MARKSHEET,
    });

    await DocumentExtractionModel.create({
      documentId: testDocA._id,
      applicationId: testDocA.applicationId,
      instituteId: instA._id,
      profileId: new mongoose.Types.ObjectId(),
      profileKey: 'CBSE_XII_STANDARD',
      profileVersion: '1.0.0',
      fields: [
        {
          fieldKey: 'student_name',
          label: 'Student Name',
          dataType: 'STRING',
          rawValue: 'Case Student',
          normalizedValue: 'CASE STUDENT',
          confidence: 0.7,
          isBelowThreshold: true,
          reviewStatus: 'NEEDS_REVIEW',
        },
      ],
      allRequiredPresent: true,
      needsReview: true,
      version: 1,
    });
  });

  afterAll(async () => {
    await Institute.deleteMany({ _id: { $in: [instA._id, instB._id] } });
    await User.deleteMany({ _id: { $in: [adminA._id, officerA1._id, officerA2._id, officerB._id, studentA._id] } });
    await InstituteMembership.deleteMany({ instituteId: { $in: [instA._id, instB._id] } });
    await DocumentModel.deleteMany({ _id: testDocA._id });
    await CaseAssignmentModel.deleteMany({ instituteId: { $in: [instA._id, instB._id] } });
    await DocumentExtractionModel.deleteMany({ documentId: testDocA._id });
  });

  it('Step 1: Institute Admin assigns document review case to Officer A1', async () => {
    const res = await request(app)
      .post('/api/v1/cases/assign')
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenAdminA}`)
      .send({
        instituteId: instA._id.toString(),
        applicationId: testDocA.applicationId.toString(),
        documentId: testDocA._id.toString(),
        officerId: officerA1._id.toString(),
        notes: 'Priority verification for scholarship applicant',
      });

    if (res.status !== 201) {
      console.log('STEP 1 ERROR BODY:', res.body);
    }

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.officerId).toBe(officerA1._id.toString());
    expect(res.body.data.status).toBe('ASSIGNED');
  });

  it('Step 2: Cross-Tenant Denial: Admin from Institute B cannot assign cases for Institute A', async () => {
    const tokenAdminB = jwt.sign(
      {
        userId: new mongoose.Types.ObjectId().toString(),
        email: 'admin.b@inst-b.edu',
        roles: [UserRole.INSTITUTE_ADMIN],
        instituteId: instB._id.toString(),
        isSuperAdmin: false,
      },
      config.jwtSecret
    );

    const res = await request(app)
      .post('/api/v1/cases/assign')
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenAdminB}`)
      .send({
        instituteId: instA._id.toString(),
        applicationId: testDocA.applicationId.toString(),
        documentId: testDocA._id.toString(),
        officerId: officerA1._id.toString(),
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('Step 3: Assigned Officer A1 can view the assigned review case details', async () => {
    const res = await request(app)
      .get(`/api/v1/review/${testDocA._id}`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerA1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.document._id).toBe(testDocA._id.toString());
  });

  it('Step 4: Non-assigned Officer A2 is denied access to the case assigned to Officer A1', async () => {
    const res = await request(app)
      .get(`/api/v1/review/${testDocA._id}`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerA2}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('assigned to another verification officer');
  });

  it('Step 5: Assigned Officer A1 retrieves their assigned cases list', async () => {
    const res = await request(app)
      .get('/api/v1/cases/my-assignments')
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenOfficerA1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].officerId).toBe(officerA1._id.toString());
  });
});
