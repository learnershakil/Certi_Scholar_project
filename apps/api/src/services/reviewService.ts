import mongoose from 'mongoose';
import {
  DocumentProcessingState,
  FieldReviewStatus,
  TimelineEventType,
  AuthSessionPayload,
  UserRole,
  CorrectionActionDto,
} from '@repo/contracts';
import { DocumentModel } from '../models/Document';
import { DocumentExtractionModel, IDocumentExtraction } from '../models/DocumentExtraction';
import { CorrectionModel, ICorrection } from '../models/Correction';
import { OCRResultModel } from '../models/OCRResult';
import { CaseAssignmentModel } from '../models/CaseAssignment';
import { caseAssignmentService } from './caseAssignmentService';
import { storageService } from './storage';
import { auditService } from './auditService';
import { timelineService } from './timelineService';

export interface QueueFilters {
  instituteId: string;
  category?: string;
  page?: number;
  limit?: number;
  assignedOfficerId?: string;
}

export class ReviewService {
  async getReviewQueue(filters: QueueFilters) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(50, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      instituteId: new mongoose.Types.ObjectId(filters.instituteId),
      status: {
        $in: [
          DocumentProcessingState.PENDING_REVIEW,
          DocumentProcessingState.EXTRACTED,
          DocumentProcessingState.PROCESSING_QUEUED,
        ],
      },
    };

    if (filters.category) {
      query.category = filters.category;
    }

    // Filter by assigned officer if specified
    if (filters.assignedOfficerId) {
      const assignments = await CaseAssignmentModel.find({
        instituteId: new mongoose.Types.ObjectId(filters.instituteId),
        officerId: new mongoose.Types.ObjectId(filters.assignedOfficerId),
        status: { $in: ['ASSIGNED', 'IN_REVIEW'] },
      });
      const assignedDocIds = assignments
        .filter((a) => a.documentId)
        .map((a) => a.documentId);
      const assignedAppIds = assignments
        .filter((a) => a.applicationId)
        .map((a) => a.applicationId);

      query.$or = [
        { _id: { $in: assignedDocIds } },
        { applicationId: { $in: assignedAppIds } },
      ];
    }

    const [items, total] = await Promise.all([
      DocumentModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      DocumentModel.countDocuments(query),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getDocumentReviewDetails(
    documentId: string,
    actor: AuthSessionPayload
  ) {
    const doc = await DocumentModel.findById(documentId);
    if (!doc) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Tenancy Check
    if (!actor.isSuperAdmin && doc.instituteId.toString() !== actor.instituteId) {
      throw new Error('Forbidden: Unauthorized cross-tenant document review access');
    }

    // Only Officers or Admins
    const isAuthorizedStaff =
      actor.role === UserRole.OFFICER ||
      actor.role === UserRole.ADMIN ||
      actor.roles?.includes(UserRole.OFFICER) ||
      actor.roles?.includes(UserRole.ADMIN) ||
      actor.roles?.includes(UserRole.VERIFICATION_OFFICER) ||
      actor.roles?.includes(UserRole.INSTITUTE_ADMIN) ||
      actor.isSuperAdmin;

    if (!isAuthorizedStaff) {
      throw new Error('Forbidden: Human review requires Officer or Admin role');
    }

    // Case assignment authorization
    const isAssigned = await caseAssignmentService.isOfficerAuthorizedForDocument(documentId, actor);
    if (!isAssigned) {
      throw new Error('Forbidden: This case has been assigned to another verification officer');
    }

    // Generate short-lived presigned URL for document preview (15 mins)
    const viewUrl = await storageService.generatePresignedViewUrl(doc.storageKey, 900);

    // Fetch OCR result and extracted fields
    const [ocrResult, extraction, corrections] = await Promise.all([
      OCRResultModel.findOne({ documentId: doc._id }),
      DocumentExtractionModel.findOne({ documentId: doc._id }).sort({ version: -1 }),
      CorrectionModel.find({ documentId: doc._id }).sort({ createdAt: -1 }),
    ]);

    return {
      document: doc,
      viewUrl,
      ocrResult,
      extraction,
      corrections,
    };
  }

  async applyReviewAction(
    documentId: string,
    actionDto: CorrectionActionDto,
    actor: AuthSessionPayload,
    expectedVersion?: number
  ): Promise<{
    extraction: IDocumentExtraction;
    correction: ICorrection;
  }> {
    const doc = await DocumentModel.findById(documentId);
    if (!doc) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Tenancy Check
    if (!actor.isSuperAdmin && doc.instituteId.toString() !== actor.instituteId) {
      throw new Error('Forbidden: Unauthorized cross-tenant review action');
    }

    // Role check: Only officers/admins can perform review actions
    const isAuthorized =
      actor.role === UserRole.OFFICER ||
      actor.role === UserRole.ADMIN ||
      actor.roles?.includes(UserRole.OFFICER) ||
      actor.roles?.includes(UserRole.ADMIN) ||
      actor.roles?.includes(UserRole.VERIFICATION_OFFICER) ||
      actor.roles?.includes(UserRole.INSTITUTE_ADMIN) ||
      actor.isSuperAdmin;

    if (!isAuthorized) {
      throw new Error('Forbidden: Action requires Officer or Admin role');
    }

    // Case assignment authorization
    const isAssigned = await caseAssignmentService.isOfficerAuthorizedForDocument(documentId, actor);
    if (!isAssigned) {
      throw new Error('Forbidden: This case has been assigned to another verification officer');
    }

    // Fetch latest extraction
    const extraction = await DocumentExtractionModel.findOne({ documentId: doc._id }).sort({ version: -1 });
    if (!extraction) {
      throw new Error('No extracted fields record found for this document to review');
    }

    // Optimistic Concurrency Control
    if (expectedVersion !== undefined && extraction.version !== expectedVersion) {
      throw new Error(
        `Optimistic lock conflict: Document fields have been modified by another reviewer (current v${extraction.version}, expected v${expectedVersion})`
      );
    }

    const field = extraction.fields.find((f) => f.fieldKey === actionDto.fieldKey);
    if (!field) {
      throw new Error(`Field '${actionDto.fieldKey}' not found in document extraction profile`);
    }

    const originalValue = field.normalizedValue !== undefined ? field.normalizedValue : field.rawValue;
    let finalCorrectedValue = originalValue;

    if (actionDto.action === 'APPROVE') {
      field.reviewStatus = FieldReviewStatus.APPROVED;
      field.isBelowThreshold = false;
    } else if (actionDto.action === 'CORRECT') {
      if (actionDto.correctedValue === undefined) {
        throw new Error('A correctedValue is required when action is CORRECT');
      }
      finalCorrectedValue = actionDto.correctedValue;
      field.normalizedValue = actionDto.correctedValue;
      field.reviewStatus = FieldReviewStatus.CORRECTED;
      field.isBelowThreshold = false;
    } else if (actionDto.action === 'MARK_UNREADABLE') {
      field.reviewStatus = FieldReviewStatus.UNREADABLE;
      field.normalizedValue = null;
    } else if (actionDto.action === 'REQUEST_REUPLOAD') {
      field.reviewStatus = FieldReviewStatus.REJECTED;
      await DocumentModel.findByIdAndUpdate(doc._id, {
        $set: { status: DocumentProcessingState.REJECTED_CORRUPT },
      });
    }

    // Check if any fields still require review
    const remainingUnreviewed = extraction.fields.filter(
      (f) => f.reviewStatus === FieldReviewStatus.NEEDS_REVIEW
    );
    extraction.needsReview = remainingUnreviewed.length > 0;
    extraction.version += 1;
    extraction.markModified('fields');
    await extraction.save();

    // If all fields are reviewed, update document status
    if (!extraction.needsReview && actionDto.action !== 'REQUEST_REUPLOAD') {
      await DocumentModel.findByIdAndUpdate(doc._id, {
        $set: { status: DocumentProcessingState.REVIEWED },
      });
    }

    // Create append-only correction record
    const correction = await CorrectionModel.create({
      documentId: doc._id,
      applicationId: doc.applicationId,
      instituteId: doc.instituteId,
      fieldKey: actionDto.fieldKey,
      originalValue,
      correctedValue: finalCorrectedValue,
      action: actionDto.action,
      reason: actionDto.reason,
      officerId: new mongoose.Types.ObjectId(actor.userId),
      officerRole: actor.roles[0] || UserRole.VERIFICATION_OFFICER,
      officerName: actor.email,
      version: extraction.version,
    });

    // Record audit entry
    await auditService.recordAction({
      instituteId: doc.instituteId.toString(),
      actorId: actor.userId,
      actorRole: actor.roles[0] || UserRole.VERIFICATION_OFFICER,
      action: `FIELD_${actionDto.action}`,
      resourceType: 'CORRECTION',
      resourceId: correction._id.toString(),
      changes: {
        documentId: doc._id.toString(),
        fieldKey: actionDto.fieldKey,
        action: actionDto.action,
        reason: actionDto.reason,
      },
    });

    // Record timeline event
    await timelineService.recordEvent({
      applicationId: doc.applicationId,
      documentId: doc._id.toString(),
      instituteId: doc.instituteId.toString(),
      type: TimelineEventType.FIELD_CORRECTED,
      actorId: actor.userId,
      actorRole: actor.roles[0] || UserRole.VERIFICATION_OFFICER,
      title: `Field Review: ${field.label} (${actionDto.action})`,
      description: `Officer ${actionDto.action} field '${field.label}'. Reason: ${actionDto.reason}`,
      metadata: {
        fieldKey: actionDto.fieldKey,
        action: actionDto.action,
        originalValue,
        correctedValue: finalCorrectedValue,
      },
    });

    return {
      extraction,
      correction,
    };
  }
}

export const reviewService = new ReviewService();
