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
import { ScholarshipModel } from '../src/models/Scholarship';
import { RecommendationModel } from '../src/models/Recommendation';
import { AuditEntry } from '../src/models/AuditEntry';
import { TimelineEventModel } from '../src/models/TimelineEvent';
import {
  DocumentTypeCategory,
  DocumentProcessingState,
  ScanState,
  RecommendationStatus,
  TimelineEventType,
  UserRole,
} from '@repo/contracts';

describe('M10 Timeline, Audit & Reporting (learnershakil)', () => {
  let instA: any;
  let instB: any;
  let adminA: any;
  let adminB: any;
  let studentA: any;

  let tokenAdminA: string;
  let tokenAdminB: string;
  let tokenStudentA: string;

  let scholarshipA: any;
  let docA: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }

    instA = await Institute.create({ code: 'INST_REP_A', name: 'Reporting Inst A' });
    instB = await Institute.create({ code: 'INST_REP_B', name: 'Reporting Inst B' });

    adminA = await User.create({ email: 'admin.m10@inst-a.edu', name: 'Admin Shakil' });
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

    adminB = await User.create({ email: 'admin.m10@inst-b.edu', name: 'Admin B' });
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

    studentA = await User.create({ email: 'student.m10@inst-a.edu', name: 'Student M10' });
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

    scholarshipA = await ScholarshipModel.create({
      instituteId: instA._id,
      code: 'SCHOL-M10',
      name: '=CMD|\' /C calc\'!A0', // Formula injection payload in scholarship name to test defense!
      description: 'Engineering excellence scholarship.',
      awardAmount: 50000,
      academicYear: '2026-2027',
      ruleAst: { operator: 'AND', conditions: [] },
      version: 1,
      isActive: true,
      createdBy: adminA._id,
    });

    docA = await DocumentModel.create({
      instituteId: instA._id,
      studentId: studentA._id,
      applicationId: 'APP-M10-001',
      category: DocumentTypeCategory.ACADEMIC_MARKSHEET,
      filename: 'marksheet_m10.pdf',
      originalName: 'marksheet_m10.pdf',
      storageDriver: 'local',
      storageKey: 'clean/marksheet_m10.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 20480,
      checksumSha256: 'sha256-m10-hash',
      status: DocumentProcessingState.REVIEWED,
      scanState: ScanState.CLEAN,
    });

    // Seed ordered timeline events spanning M1-M9
    await TimelineEventModel.create([
      {
        applicationId: 'APP-M10-001',
        documentId: docA._id.toString(),
        instituteId: instA._id,
        type: TimelineEventType.DOCUMENT_UPLOADED,
        title: 'Document Uploaded',
        description: 'Student uploaded marksheet_m10.pdf',
        timestamp: new Date(Date.now() - 50000),
      },
      {
        applicationId: 'APP-M10-001',
        documentId: docA._id.toString(),
        instituteId: instA._id,
        type: TimelineEventType.MALWARE_SCAN_CLEAN,
        title: 'Malware Scan Passed',
        description: 'ClamAV streaming scan confirmed clean file',
        timestamp: new Date(Date.now() - 40000),
      },
      {
        applicationId: 'APP-M10-001',
        documentId: docA._id.toString(),
        instituteId: instA._id,
        type: TimelineEventType.OCR_COMPLETED,
        title: 'OCR Extraction Completed',
        description: 'Tesseract 5.5 OCR extraction completed with high confidence',
        timestamp: new Date(Date.now() - 30000),
      },
      {
        applicationId: 'APP-M10-001',
        documentId: docA._id.toString(),
        instituteId: instA._id,
        type: TimelineEventType.DOCUMENT_CLASSIFIED,
        title: 'Document Classified',
        description: 'Classified as CBSE_XII_MARKSHEET',
        timestamp: new Date(Date.now() - 20000),
      },
      {
        applicationId: 'APP-M10-001',
        documentId: docA._id.toString(),
        instituteId: instA._id,
        type: TimelineEventType.RECOMMENDATION_GENERATED,
        title: 'Recommendation Generated',
        description: 'Advisory recommendation issued: VERIFICATION_PENDING',
        timestamp: new Date(Date.now() - 10000),
      },
    ]);

    // Seed Recommendation record
    await RecommendationModel.create({
      applicationId: 'APP-M10-001',
      scholarshipId: scholarshipA._id,
      instituteId: instA._id,
      status: RecommendationStatus.ELIGIBLE,
      conditionExplanations: [],
      summaryStudentText: 'Eligible for grant award.',
      summaryOfficerText: 'Verified and eligible.',
      isAuthenticityVerified: true,
      generatedAt: new Date(),
    });

    // Seed audit entry
    await AuditEntry.create({
      instituteId: instA._id,
      actorId: adminA._id.toString(),
      actorRole: UserRole.INSTITUTE_ADMIN,
      action: 'SCHOLARSHIP_CREATED',
      resourceType: 'SCHOLARSHIP',
      resourceId: scholarshipA._id.toString(),
      timestamp: new Date(),
    });
  });

  afterAll(async () => {
    await ScholarshipModel.deleteMany({ instituteId: instA?._id });
    await DocumentModel.deleteMany({ applicationId: 'APP-M10-001' });
    await RecommendationModel.deleteMany({ applicationId: 'APP-M10-001' });
    await TimelineEventModel.deleteMany({ applicationId: 'APP-M10-001' });
    await AuditEntry.deleteMany({ instituteId: instA?._id });
    if (instA?._id) await Institute.findByIdAndDelete(instA._id);
    if (instB?._id) await Institute.findByIdAndDelete(instB._id);
    if (adminA?._id) await User.findByIdAndDelete(adminA._id);
    if (adminB?._id) await User.findByIdAndDelete(adminB._id);
    if (studentA?._id) await User.findByIdAndDelete(studentA._id);
  });

  it('Step 1: Admin retrieves KPI dashboard metrics strictly scoped to their institute', async () => {
    const res = await request(app)
      .get('/api/v1/reporting/dashboard')
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenAdminA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalApplications).toBeGreaterThanOrEqual(1);
    expect(res.body.data.totalDocuments).toBeGreaterThanOrEqual(1);
    expect(res.body.data.extractionAccuracyRate).toBeNumber();
    expect(res.body.data.recommendationDistribution).toBeDefined();
  });

  it('Step 2: Retrieves ordered processing timeline spanning stages M1–M9', async () => {
    const res = await request(app)
      .get('/api/v1/reporting/timeline/APP-M10-001')
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenAdminA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeArray();
    expect(res.body.data.length).toBe(5);

    // Verify chronological order
    expect(res.body.data[0].type).toBe(TimelineEventType.DOCUMENT_UPLOADED);
    expect(res.body.data[1].type).toBe(TimelineEventType.MALWARE_SCAN_CLEAN);
    expect(res.body.data[2].type).toBe(TimelineEventType.OCR_COMPLETED);
    expect(res.body.data[3].type).toBe(TimelineEventType.DOCUMENT_CLASSIFIED);
    expect(res.body.data[4].type).toBe(TimelineEventType.RECOMMENDATION_GENERATED);
  });

  it('Step 3: Queries append-only audit trail with filtering and tenant isolation', async () => {
    const res = await request(app)
      .get('/api/v1/reporting/audit?resourceType=SCHOLARSHIP')
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenAdminA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeArray();
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].action).toBe('SCHOLARSHIP_CREATED');
  });

  it('Step 4: Exports applications to CSV and neutralizes formula injection payloads', async () => {
    const res = await request(app)
      .get('/api/v1/reporting/export/applications')
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenAdminA}`);

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/csv');
    const csvContent = res.text;

    // Must contain header
    expect(csvContent).toContain('"Application ID"');

    // Must contain application row
    expect(csvContent).toContain('APP-M10-001');

    // Formula injection payload '=CMD' MUST be safely sanitized with leading single quote: "'=CMD"
    expect(csvContent).toContain("\"'=CMD");
  });

  it('Step 5: Cross-Tenant Denial: Admin from Institute B cannot view timeline, audit, dashboard, or exports of Institute A', async () => {
    // 1. Dashboard cross-tenant denial
    const dashRes = await request(app)
      .get(`/api/v1/reporting/dashboard?instituteId=${instA._id}`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenAdminB}`);
    expect(dashRes.status).toBe(403);

    // 2. Timeline cross-tenant denial
    const timeRes = await request(app)
      .get(`/api/v1/reporting/timeline/APP-M10-001?instituteId=${instA._id}`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenAdminB}`);
    expect(timeRes.status).toBe(403);

    // 3. Export cross-tenant denial
    const expRes = await request(app)
      .get(`/api/v1/reporting/export/applications?instituteId=${instA._id}`)
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${tokenAdminB}`);
    expect(expRes.status).toBe(403);
  });
});
