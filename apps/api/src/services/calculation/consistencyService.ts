import mongoose from 'mongoose';
import {
  AuthSessionPayload,
  ConsistencyStatus,
  SubjectMarkEntry,
  TimelineEventType,
  UserRole,
} from '@repo/contracts';
import { DocumentModel } from '../../models/Document';
import { DocumentExtractionModel } from '../../models/DocumentExtraction';
import { AcademicConsistencyModel, IAcademicConsistency } from '../../models/AcademicConsistency';
import { resolveCalculationProfile } from './calculationProfiles';
import { calculationEngine } from './calculationEngine';
import { auditService } from '../auditService';
import { timelineService } from '../timelineService';

export interface ConsistencyCheckOptions {
  profileKey?: string;
  customSubjects?: SubjectMarkEntry[];
}

export class ConsistencyService {
  async performConsistencyCheck(
    documentId: string,
    actor: AuthSessionPayload,
    options?: ConsistencyCheckOptions
  ): Promise<IAcademicConsistency> {
    const doc = await DocumentModel.findById(documentId);
    if (!doc) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Tenancy Check
    if (!actor.isSuperAdmin && doc.instituteId.toString() !== actor.instituteId) {
      throw new Error('Forbidden: Unauthorized cross-tenant consistency check');
    }

    // Resolve profile
    const profileKey = options?.profileKey || 'CBSE_XII_STANDARD';
    const profile = resolveCalculationProfile(profileKey);

    // Fetch latest extraction
    const extraction = await DocumentExtractionModel.findOne({ documentId: doc._id }).sort({ version: -1 });

    let subjects = options?.customSubjects;
    let printedTotalMarks: number | undefined;
    let printedPercentage: number | undefined;
    let extractedTotalMarks: number | undefined;
    let extractedMaxMarks: number | undefined;

    if (extraction) {
      // Find relevant fields
      for (const field of extraction.fields) {
        const val = field.normalizedValue !== undefined ? field.normalizedValue : field.rawValue;

        if ((field.fieldKey === 'printedPercentage' || field.fieldKey === 'percentage') && typeof val === 'number') {
          printedPercentage = val;
        } else if (field.fieldKey === 'totalMarks' && typeof val === 'number') {
          printedTotalMarks = val;
          extractedTotalMarks = val;
        } else if (field.fieldKey === 'maxMarks' && typeof val === 'number') {
          extractedMaxMarks = val;
        } else if (field.fieldKey === 'subjectMarks' && Array.isArray(val)) {
          subjects = val as SubjectMarkEntry[];
        }
      }
    }

    // Run evaluation
    const evaluation = calculationEngine.evaluate({
      profile,
      subjects,
      printedTotalMarks,
      printedPercentage,
      extractedTotalMarks,
      extractedMaxMarks,
    });

    // Idempotent upsert of consistency result
    const consistencyRecord = await AcademicConsistencyModel.findOneAndUpdate(
      { instituteId: doc.instituteId, documentId: doc._id },
      {
        $set: {
          applicationId: doc.applicationId,
          profileKey: profile.key,
          profileVersion: profile.formulaVersion,
          status: evaluation.status,
          computedTotalMarks: evaluation.computedTotalMarks,
          computedMaxMarks: evaluation.computedMaxMarks,
          computedPercentage: evaluation.computedPercentage,
          printedTotalMarks: evaluation.printedTotalMarks,
          printedPercentage: evaluation.printedPercentage,
          totalMarksDifference: evaluation.totalMarksDifference,
          percentageDifference: evaluation.percentageDifference,
          toleranceAllowed: profile.roundingTolerance,
          discrepancyFlagged: evaluation.discrepancyFlagged,
          subjectBreakdown: evaluation.evaluatedSubjects,
          notes: evaluation.notes,
          calculatedAt: new Date(),
        },
        $inc: { version: 1 },
      },
      { upsert: true, new: true }
    );

    // Record audit event
    await auditService.recordAction({
      instituteId: doc.instituteId.toString(),
      actorId: actor.userId,
      actorRole: actor.roles[0] || UserRole.VERIFICATION_OFFICER,
      action: 'CONSISTENCY_CHECKED',
      resourceType: 'DOCUMENT',
      resourceId: doc._id.toString(),
      changes: {
        profileKey: profile.key,
        status: evaluation.status,
        computedPercentage: evaluation.computedPercentage,
        discrepancyFlagged: evaluation.discrepancyFlagged,
      },
    });

    // Record timeline event
    await timelineService.recordEvent({
      applicationId: doc.applicationId,
      documentId: doc._id.toString(),
      instituteId: doc.instituteId.toString(),
      type: TimelineEventType.CONSISTENCY_CALCULATED,
      actorId: actor.userId,
      actorRole: actor.roles[0] || UserRole.VERIFICATION_OFFICER,
      title: `Academic Consistency: ${evaluation.status}`,
      description: evaluation.notes,
      metadata: {
        status: evaluation.status,
        profileKey: profile.key,
        computedPercentage: evaluation.computedPercentage,
        printedPercentage: evaluation.printedPercentage,
        discrepancyFlagged: evaluation.discrepancyFlagged,
      },
    });

    return consistencyRecord;
  }

  async getConsistencyResult(documentId: string, actor: AuthSessionPayload): Promise<IAcademicConsistency | null> {
    const doc = await DocumentModel.findById(documentId);
    if (!doc) {
      throw new Error(`Document not found: ${documentId}`);
    }

    if (!actor.isSuperAdmin && doc.instituteId.toString() !== actor.instituteId) {
      throw new Error('Forbidden: Unauthorized cross-tenant consistency lookup');
    }

    return AcademicConsistencyModel.findOne({ documentId: doc._id });
  }
}

export const consistencyService = new ConsistencyService();
