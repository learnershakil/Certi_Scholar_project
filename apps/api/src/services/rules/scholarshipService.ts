import mongoose from 'mongoose';
import {
  AuthSessionPayload,
  ConditionGroup,
  CreateScholarshipDto,
  RuleEvaluationSummary,
  TimelineEventType,
  UserRole,
} from '@repo/contracts';
import { ScholarshipModel, IScholarship } from '../../models/Scholarship';
import { DocumentModel } from '../../models/Document';
import { DocumentExtractionModel } from '../../models/DocumentExtraction';
import { AcademicConsistencyModel } from '../../models/AcademicConsistency';
import { VerificationResultModel } from '../../models/VerificationResult';
import { ruleEvaluator } from './ruleEvaluator';
import { auditService } from '../auditService';
import { timelineService } from '../timelineService';

export class ScholarshipService {
  async createScholarship(dto: CreateScholarshipDto, actor: AuthSessionPayload): Promise<IScholarship> {
    const isStaffAdmin =
      actor.role === UserRole.ADMIN ||
      actor.roles?.includes(UserRole.ADMIN) ||
      actor.roles?.includes(UserRole.INSTITUTE_ADMIN) ||
      actor.isSuperAdmin;
    if (!isStaffAdmin) {
      throw new Error('Forbidden: Only Administrators can create scholarship rules');
    }

    const instituteId = actor.isSuperAdmin ? dto.instituteId : actor.instituteId!;
    if (actor.instituteId && actor.instituteId !== dto.instituteId && !actor.isSuperAdmin) {
      throw new Error('Forbidden: Cannot create scholarship for another institute');
    }

    const existing = await ScholarshipModel.findOne({ instituteId, code: dto.code });
    if (existing) {
      throw new Error(`Scholarship with code '${dto.code}' already exists in this institute`);
    }

    const scholarship = await ScholarshipModel.create({
      instituteId: new mongoose.Types.ObjectId(instituteId),
      code: dto.code,
      name: dto.name,
      description: dto.description,
      awardAmount: dto.awardAmount,
      totalSeats: dto.totalSeats,
      academicYear: dto.academicYear,
      ruleAst: dto.ruleAst,
      version: 1,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      createdBy: new mongoose.Types.ObjectId(actor.userId),
    });

    await auditService.recordAction({
      instituteId,
      actorId: actor.userId,
      actorRole: actor.roles[0] || UserRole.INSTITUTE_ADMIN,
      action: 'SCHOLARSHIP_CREATED',
      resourceType: 'SCHOLARSHIP',
      resourceId: scholarship._id.toString(),
      changes: { code: dto.code, name: dto.name, awardAmount: dto.awardAmount },
    });

    return scholarship;
  }

  async updateScholarship(
    id: string,
    updates: Partial<CreateScholarshipDto>,
    actor: AuthSessionPayload
  ): Promise<IScholarship> {
    const scholarship = await ScholarshipModel.findById(id);
    if (!scholarship) {
      throw new Error(`Scholarship not found: ${id}`);
    }

    if (!actor.isSuperAdmin && scholarship.instituteId.toString() !== actor.instituteId) {
      throw new Error('Forbidden: Unauthorized cross-tenant scholarship update');
    }

    const isStaffAdmin =
      actor.role === UserRole.ADMIN ||
      actor.roles?.includes(UserRole.ADMIN) ||
      actor.roles?.includes(UserRole.INSTITUTE_ADMIN) ||
      actor.isSuperAdmin;
    if (!isStaffAdmin) {
      throw new Error('Forbidden: Only Administrators can modify scholarship rules');
    }

    let versionChanged = false;
    if (updates.name) scholarship.name = updates.name;
    if (updates.description) scholarship.description = updates.description;
    if (updates.awardAmount !== undefined) scholarship.awardAmount = updates.awardAmount;
    if (updates.totalSeats !== undefined) scholarship.totalSeats = updates.totalSeats;
    if (updates.academicYear) scholarship.academicYear = updates.academicYear;
    if (updates.isActive !== undefined) scholarship.isActive = updates.isActive;

    if (updates.ruleAst) {
      scholarship.ruleAst = updates.ruleAst;
      scholarship.version += 1;
      versionChanged = true;
    }

    scholarship.updatedBy = new mongoose.Types.ObjectId(actor.userId);
    await scholarship.save();

    await auditService.recordAction({
      instituteId: scholarship.instituteId.toString(),
      actorId: actor.userId,
      actorRole: actor.roles[0] || UserRole.INSTITUTE_ADMIN,
      action: 'SCHOLARSHIP_UPDATED',
      resourceType: 'SCHOLARSHIP',
      resourceId: scholarship._id.toString(),
      changes: { version: scholarship.version, versionChanged },
    });

    return scholarship;
  }

  async listScholarships(instituteId: string, actor: AuthSessionPayload): Promise<IScholarship[]> {
    if (!actor.isSuperAdmin && instituteId !== actor.instituteId) {
      throw new Error('Forbidden: Unauthorized cross-tenant scholarship access');
    }

    return ScholarshipModel.find({ instituteId: new mongoose.Types.ObjectId(instituteId) }).sort({ createdAt: -1 });
  }

  async getScholarship(id: string, actor: AuthSessionPayload): Promise<IScholarship> {
    const scholarship = await ScholarshipModel.findById(id);
    if (!scholarship) {
      throw new Error(`Scholarship not found: ${id}`);
    }

    if (!actor.isSuperAdmin && scholarship.instituteId.toString() !== actor.instituteId) {
      throw new Error('Forbidden: Unauthorized cross-tenant scholarship access');
    }

    return scholarship;
  }

  /**
   * Test harness: Evaluate hypothetical applicant data against rule AST without mutating DB.
   */
  testHypotheticalRule(ruleAst: ConditionGroup, applicantFacts: Record<string, unknown>): RuleEvaluationSummary {
    return ruleEvaluator.evaluateRule('HYPOTHETICAL_TEST', 'test_v1', ruleAst, applicantFacts);
  }

  /**
   * Evaluate a real application against a scholarship rule.
   */
  async evaluateApplication(
    scholarshipId: string,
    applicationId: string,
    actor: AuthSessionPayload
  ): Promise<{
    evaluation: RuleEvaluationSummary;
    facts: Record<string, unknown>;
  }> {
    const scholarship = await this.getScholarship(scholarshipId, actor);

    // Collect applicant facts from verified documents
    const documents = await DocumentModel.find({
      instituteId: scholarship.instituteId,
      applicationId,
    });

    if (documents.length === 0) {
      throw new Error(`No documents found for application: ${applicationId}`);
    }

    const facts: Record<string, unknown> = {};

    for (const doc of documents) {
      // 1. Check consistency recomputed percentage
      const consistency = await AcademicConsistencyModel.findOne({ documentId: doc._id });
      if (consistency) {
        facts['percentage'] = consistency.computedPercentage;
        facts['academicTotalMarks'] = consistency.computedTotalMarks;
        facts['isDiscrepancyFlagged'] = consistency.discrepancyFlagged;
      }

      // 2. Extracted fields from profile
      const extraction = await DocumentExtractionModel.findOne({ documentId: doc._id }).sort({ version: -1 });
      if (extraction) {
        for (const f of extraction.fields) {
          const val = f.normalizedValue !== undefined ? f.normalizedValue : f.rawValue;
          facts[f.fieldKey] = val;
        }
      }

      // 3. Verification results
      const verification = await VerificationResultModel.findOne({ documentId: doc._id }).sort({ createdAt: -1 });
      if (verification) {
        facts[`${doc.category}_isAuthenticityVerified`] = verification.isAuthenticityVerified;
      }
    }

    const evaluation = ruleEvaluator.evaluateRule(
      scholarship._id.toString(),
      `v${scholarship.version}`,
      scholarship.ruleAst,
      facts
    );

    // Record audit event
    await auditService.recordAction({
      instituteId: scholarship.instituteId.toString(),
      actorId: actor.userId,
      actorRole: actor.roles[0] || UserRole.VERIFICATION_OFFICER,
      action: 'SCHOLARSHIP_EVALUATED',
      resourceType: 'SCHOLARSHIP',
      resourceId: scholarship._id.toString(),
      changes: {
        applicationId,
        overallPassed: evaluation.overallPassed,
        hasMissingOrUncertainInputs: evaluation.hasMissingOrUncertainInputs,
      },
    });

    // Record timeline event
    await timelineService.recordEvent({
      applicationId,
      instituteId: scholarship.instituteId.toString(),
      type: TimelineEventType.SCHOLARSHIP_EVALUATED,
      actorId: actor.userId,
      actorRole: actor.roles[0] || UserRole.VERIFICATION_OFFICER,
      title: `Rule Evaluation: ${scholarship.name}`,
      description: evaluation.overallPassed
        ? `Application satisfies all conditions for '${scholarship.name}' (rule v${scholarship.version}).`
        : evaluation.hasMissingOrUncertainInputs
          ? `Application evaluation incomplete: missing or unverified inputs for '${scholarship.name}'.`
          : `Application does not satisfy eligibility criteria for '${scholarship.name}'.`,
      metadata: {
        scholarshipId: scholarship._id.toString(),
        overallPassed: evaluation.overallPassed,
        hasMissingOrUncertainInputs: evaluation.hasMissingOrUncertainInputs,
      },
    });

    return {
      evaluation,
      facts,
    };
  }
}

export const scholarshipService = new ScholarshipService();

