import mongoose from 'mongoose';
import {
  AuthSessionPayload,
  FieldReviewStatus,
  TimelineEventType,
  UserRole,
  VerificationProviderType,
} from '@repo/contracts';
import { RecommendationModel, IRecommendation } from '../../models/Recommendation';
import { ScholarshipModel } from '../../models/Scholarship';
import { DocumentModel } from '../../models/Document';
import { DocumentExtractionModel } from '../../models/DocumentExtraction';
import { AcademicConsistencyModel } from '../../models/AcademicConsistency';
import { VerificationResultModel } from '../../models/VerificationResult';
import { scholarshipService } from '../rules/scholarshipService';
import { explanationGenerator, FieldProvenance } from './explanationGenerator';
import { auditService } from '../auditService';
import { timelineService } from '../timelineService';

export class RecommendationService {
  async generateRecommendation(
    scholarshipId: string,
    applicationId: string,
    actor: AuthSessionPayload
  ): Promise<IRecommendation> {
    const scholarship = await ScholarshipModel.findById(scholarshipId);
    if (!scholarship) {
      throw new Error(`Scholarship not found: ${scholarshipId}`);
    }

    if (!actor.isSuperAdmin && scholarship.instituteId.toString() !== actor.instituteId) {
      throw new Error('Forbidden: Unauthorized cross-tenant recommendation request');
    }

    // 1. Evaluate rules
    const { evaluation } = await scholarshipService.evaluateApplication(
      scholarshipId,
      applicationId,
      actor
    );

    // 2. Fetch documents for this application
    const documents = await DocumentModel.find({
      instituteId: scholarship.instituteId,
      applicationId,
    });

    const docIds = documents.map((d) => d._id);

    // 3. Resolve provenance & verification signals
    const provenanceMap: Record<string, FieldProvenance> = {};
    let isAnyDocumentAuthenticityVerified = false;
    let hasSimulatedVerification = false;
    let hasCertiAdapterVerification = false;
    let hasDiscrepancyFlagged = false;

    // Check extractions for corrections
    const extractions = await DocumentExtractionModel.find({ documentId: { $in: docIds } });
    for (const ext of extractions) {
      for (const field of ext.fields) {
        if (field.reviewStatus === FieldReviewStatus.CORRECTED) {
          provenanceMap[field.fieldKey] = 'HUMAN_CORRECTED';
        } else {
          provenanceMap[field.fieldKey] = 'OCR';
        }
      }
    }

    // Check consistency
    const consistencies = await AcademicConsistencyModel.find({ documentId: { $in: docIds } });
    for (const cons of consistencies) {
      if (cons.discrepancyFlagged) {
        hasDiscrepancyFlagged = true;
      }
    }

    // Check verification
    const verifications = await VerificationResultModel.find({ documentId: { $in: docIds } });
    for (const verif of verifications) {
      if (verif.isAuthenticityVerified) {
        isAnyDocumentAuthenticityVerified = true;
      }
      if (verif.isSimulated) {
        hasSimulatedVerification = true;
      }
      if (verif.provider === VerificationProviderType.CERTI_ADAPTER) {
        hasCertiAdapterVerification = true;
      }
    }

    // 4. Generate structured, explainable recommendation
    const explanation = explanationGenerator.generate({
      scholarshipName: scholarship.name,
      ruleEvaluation: evaluation,
      provenanceMap,
      isAnyDocumentAuthenticityVerified,
      hasSimulatedVerification,
      hasCertiAdapterVerification,
      hasDiscrepancyFlagged,
    });

    // 5. Idempotent upsert of Recommendation document
    const recommendation = await RecommendationModel.findOneAndUpdate(
      {
        instituteId: scholarship.instituteId,
        applicationId,
        scholarshipId: scholarship._id,
      },
      {
        $set: {
          status: explanation.status,
          conditionExplanations: explanation.conditionExplanations,
          summaryStudentText: explanation.summaryStudentText,
          summaryOfficerText: explanation.summaryOfficerText,
          isAuthenticityVerified: explanation.isAuthenticityVerified,
          provenanceSummary: provenanceMap,
          generatedAt: new Date(),
        },
        $inc: { version: 1 },
      },
      { upsert: true, new: true }
    );

    // Record audit event
    await auditService.recordAction({
      instituteId: scholarship.instituteId.toString(),
      actorId: actor.userId,
      actorRole: actor.roles[0] || UserRole.VERIFICATION_OFFICER,
      action: 'RECOMMENDATION_GENERATED',
      resourceType: 'APPLICATION',
      resourceId: applicationId,
      changes: {
        scholarshipId: scholarship._id.toString(),
        status: explanation.status,
        isAuthenticityVerified: explanation.isAuthenticityVerified,
      },
    });

    // Record timeline event
    await timelineService.recordEvent({
      applicationId,
      instituteId: scholarship.instituteId.toString(),
      type: TimelineEventType.RECOMMENDATION_GENERATED,
      actorId: actor.userId,
      actorRole: actor.roles[0] || UserRole.VERIFICATION_OFFICER,
      title: `Recommendation: ${explanation.status}`,
      description: explanation.summaryStudentText,
      metadata: {
        scholarshipId: scholarship._id.toString(),
        status: explanation.status,
        isAuthenticityVerified: explanation.isAuthenticityVerified,
      },
    });

    return recommendation;
  }

  async getRecommendationsByApplication(
    applicationId: string,
    actor: AuthSessionPayload
  ): Promise<IRecommendation[]> {
    const filter: Record<string, unknown> = { applicationId };
    if (!actor.isSuperAdmin) {
      filter.instituteId = new mongoose.Types.ObjectId(actor.instituteId);
    }

    return RecommendationModel.find(filter).sort({ createdAt: -1 });
  }

  async getRecommendationById(
    id: string,
    actor: AuthSessionPayload
  ): Promise<IRecommendation> {
    const recommendation = await RecommendationModel.findById(id);
    if (!recommendation) {
      throw new Error(`Recommendation not found: ${id}`);
    }

    if (!actor.isSuperAdmin && recommendation.instituteId.toString() !== actor.instituteId) {
      throw new Error('Forbidden: Unauthorized cross-tenant recommendation access');
    }

    return recommendation;
  }
}

export const recommendationService = new RecommendationService();

