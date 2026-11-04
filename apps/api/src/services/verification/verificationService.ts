import mongoose from 'mongoose';
import {
  AuthSessionPayload,
  CreateConsentGrantDto,
  TimelineEventType,
  expandRoles,
  UserRole,
  VerificationProviderType,
} from '@repo/contracts';
import { DocumentModel } from '../../models/Document';
import { VerificationConsentGrantModel, IVerificationConsentGrant } from '../../models/VerificationConsentGrant';
import { VerificationResultModel, IVerificationResult } from '../../models/VerificationResult';
import { verificationProviderFactory } from './providerFactory';
import { auditService } from '../auditService';
import { timelineService } from '../timelineService';

export interface VerifyDocumentOptions {
  consentGrantId?: string;
  manualEvidence?: {
    method: string;
    reference: string;
    notes: string;
  };
  simulatedScenario?: 'MATCH' | 'MISMATCH' | 'NOT_FOUND' | 'UNAVAILABLE';
}

export class VerificationService {
  async createConsentGrant(
    dto: CreateConsentGrantDto,
    actor: AuthSessionPayload
  ): Promise<IVerificationConsentGrant> {
    const studentId = new mongoose.Types.ObjectId(actor.userId);
    const instituteId = new mongoose.Types.ObjectId(dto.instituteId);
    const durationDays = dto.durationDays || 30;

    const grantedAt = new Date();
    const expiresAt = new Date(grantedAt.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const docIds = dto.selectedDocumentIds.map((id) => new mongoose.Types.ObjectId(id));

    // Verify student owns all selected documents
    const docCount = await DocumentModel.countDocuments({
      _id: { $in: docIds },
      studentId,
    });

    if (docCount !== docIds.length) {
      throw new Error('Forbidden: Cannot grant consent for documents not owned by the student');
    }

    const grant = await VerificationConsentGrantModel.create({
      studentId,
      instituteId,
      applicationId: dto.applicationId,
      selectedDocumentIds: docIds,
      purpose: dto.purpose,
      durationDays,
      status: 'ACTIVE',
      grantedAt,
      expiresAt,
    });

    await auditService.recordAction({
      instituteId: dto.instituteId,
      actorId: actor.userId,
      actorRole: actor.roles[0] || UserRole.STUDENT,
      action: 'CONSENT_GRANTED',
      resourceType: 'CONSENT',
      resourceId: grant._id.toString(),
      changes: {
        applicationId: dto.applicationId,
        purpose: dto.purpose,
        durationDays,
        selectedDocumentIds: dto.selectedDocumentIds,
      },
    });

    await timelineService.recordEvent({
      applicationId: dto.applicationId,
      instituteId: dto.instituteId,
      type: TimelineEventType.CONSENT_GRANTED,
      actorId: actor.userId,
      actorRole: actor.roles[0] || UserRole.STUDENT,
      title: 'Document Locker Consent Granted',
      description: `Student granted ${durationDays}-day consent for locker access for application ${dto.applicationId}. Purpose: ${dto.purpose}`,
      metadata: {
        consentGrantId: grant._id.toString(),
        durationDays,
        expiresAt: expiresAt.toISOString(),
      },
    });

    return grant;
  }

  async revokeConsentGrant(
    grantId: string,
    reason: string,
    actor: AuthSessionPayload
  ): Promise<IVerificationConsentGrant> {
    const grant = await VerificationConsentGrantModel.findById(grantId);
    if (!grant) {
      throw new Error(`Consent grant not found: ${grantId}`);
    }

    if (grant.studentId.toString() !== actor.userId && !actor.isSuperAdmin) {
      throw new Error('Forbidden: Only the consenting student can revoke locker consent');
    }

    grant.status = 'REVOKED';
    grant.revokedAt = new Date();
    grant.revokedBy = new mongoose.Types.ObjectId(actor.userId);
    grant.revocationReason = reason;
    await grant.save();

    await auditService.recordAction({
      instituteId: grant.instituteId.toString(),
      actorId: actor.userId,
      actorRole: actor.roles[0] || UserRole.STUDENT,
      action: 'CONSENT_REVOKED',
      resourceType: 'CONSENT',
      resourceId: grant._id.toString(),
      changes: { reason },
    });

    await timelineService.recordEvent({
      applicationId: grant.applicationId,
      instituteId: grant.instituteId.toString(),
      type: TimelineEventType.CONSENT_REVOKED,
      actorId: actor.userId,
      actorRole: actor.roles[0] || UserRole.STUDENT,
      title: 'Document Locker Consent Revoked',
      description: `Student revoked locker consent. Reason: ${reason}. Future fetches are stopped immediately.`,
      metadata: { consentGrantId: grant._id.toString(), reason },
    });

    return grant;
  }

  async verifyDocument(
    documentId: string,
    providerType: VerificationProviderType,
    actor: AuthSessionPayload,
    options?: VerifyDocumentOptions
  ): Promise<IVerificationResult> {
    const doc = await DocumentModel.findById(documentId);
    if (!doc) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Tenancy Check
    if (!actor.isSuperAdmin && doc.instituteId.toString() !== actor.instituteId) {
      throw new Error('Forbidden: Unauthorized cross-tenant document verification');
    }

    // Role check: Only authorized staff or owning student for Certi Adapter
    const expanded = expandRoles(actor.roles || [actor.role]);
    const isStaff =
      expanded.includes(UserRole.VERIFICATION_OFFICER) ||
      expanded.includes(UserRole.ADMIN) ||
      actor.isSuperAdmin;

    const isOwningStudent =
      actor.roles.includes(UserRole.STUDENT) && doc.studentId.toString() === actor.userId;

    if (!isStaff && !isOwningStudent) {
      throw new Error('Forbidden: Insufficient permissions to trigger verification');
    }

    if (!isStaff && providerType === VerificationProviderType.MANUAL) {
      throw new Error('Forbidden: Only verification officers can record manual verification');
    }

    const provider = verificationProviderFactory.getProvider(providerType);

    if (!provider.isAvailable()) {
      throw new Error(`Verification provider ${providerType} is not available. Check its configuration before retrying.`);
    }

    const result = await provider.verify({
      documentId: doc._id.toString(),
      applicationId: doc.applicationId,
      instituteId: doc.instituteId.toString(),
      studentId: doc.studentId.toString(),
      category: doc.category,
      consentGrantId: options?.consentGrantId,
      manualEvidence: options?.manualEvidence
        ? {
            ...options.manualEvidence,
            officerId: actor.userId,
          }
        : undefined,
      simulatedScenario: options?.simulatedScenario,
    });

    const verificationRecord = await VerificationResultModel.findOneAndUpdate(
      { instituteId: doc.instituteId, documentId: doc._id, provider: providerType },
      {
        $set: {
          applicationId: doc.applicationId,
          status: result.status,
          isAuthenticityVerified: result.isAuthenticityVerified,
          retrievalOnly: result.retrievalOnly,
          isSimulated: result.isSimulated,
          evidenceReference: result.evidenceReference,
          issuerMetadata: result.issuerMetadata,
          verifiedFields: result.verifiedFields,
          officerNotes: result.notes,
          verifiedAt: new Date(),
        },
        $inc: { version: 1 },
      },
      { upsert: true, new: true }
    );

    await auditService.recordAction({
      instituteId: doc.instituteId.toString(),
      actorId: actor.userId,
      actorRole: actor.roles[0] || UserRole.VERIFICATION_OFFICER,
      action: `DOCUMENT_VERIFY_${providerType}`,
      resourceType: 'DOCUMENT',
      resourceId: doc._id.toString(),
      changes: {
        provider: providerType,
        status: result.status,
        isAuthenticityVerified: result.isAuthenticityVerified,
      },
    });

    await timelineService.recordEvent({
      applicationId: doc.applicationId,
      documentId: doc._id.toString(),
      instituteId: doc.instituteId.toString(),
      type: TimelineEventType.VERIFICATION_COMPLETED,
      actorId: actor.userId,
      actorRole: actor.roles[0] || UserRole.VERIFICATION_OFFICER,
      title: `Verification (${providerType}): ${result.status}`,
      description: result.notes || `Completed verification via ${providerType}`,
      metadata: {
        provider: providerType,
        status: result.status,
        isAuthenticityVerified: result.isAuthenticityVerified,
        isSimulated: result.isSimulated,
      },
    });

    return verificationRecord;
  }

  async getVerificationResults(
    documentId: string,
    actor: AuthSessionPayload
  ): Promise<IVerificationResult[]> {
    const doc = await DocumentModel.findById(documentId);
    if (!doc) {
      throw new Error(`Document not found: ${documentId}`);
    }

    if (!actor.isSuperAdmin && doc.instituteId.toString() !== actor.instituteId) {
      throw new Error('Forbidden: Unauthorized cross-tenant verification access');
    }

    return VerificationResultModel.find({ documentId: doc._id }).sort({ createdAt: -1 });
  }
}

export const verificationService = new VerificationService();

