import mongoose from 'mongoose';
import { VerificationProviderType, VerificationStatus } from '@repo/contracts';
import { IVerificationProvider, VerificationContext, VerificationExecutionResult } from '../types';
import { VerificationConsentGrantModel } from '../../../models/VerificationConsentGrant';

export class CertiAdapter implements IVerificationProvider {
  readonly providerType = VerificationProviderType.CERTI_ADAPTER;

  isAvailable(): boolean {
    return true; // First-party student locker consent service
  }

  async verify(context: VerificationContext): Promise<VerificationExecutionResult> {
    const docObjectId = new mongoose.Types.ObjectId(context.documentId);
    const studentObjectId = new mongoose.Types.ObjectId(context.studentId);
    const instObjectId = new mongoose.Types.ObjectId(context.instituteId);

    // Look for active consent grant
    const grant = await VerificationConsentGrantModel.findOne({
      studentId: studentObjectId,
      instituteId: instObjectId,
      selectedDocumentIds: docObjectId,
    }).sort({ createdAt: -1 });

    if (!grant) {
      return {
        provider: this.providerType,
        status: VerificationStatus.NOT_FOUND,
        isAuthenticityVerified: false,
        retrievalOnly: true,
        isSimulated: false,
        notes: 'No active student consent grant found in Certi Locker for this document and institute.',
      };
    }

    if (grant.status === 'REVOKED') {
      return {
        provider: this.providerType,
        status: VerificationStatus.REVOKED,
        isAuthenticityVerified: false,
        retrievalOnly: true,
        isSimulated: false,
        notes: `Student revoked consented access to this locker document at ${grant.revokedAt?.toISOString()}. Future retrieval blocked.`,
      };
    }

    if (new Date() > grant.expiresAt || grant.status === 'EXPIRED') {
      if (grant.status !== 'EXPIRED') {
        grant.status = 'EXPIRED';
        await grant.save();
      }
      return {
        provider: this.providerType,
        status: VerificationStatus.EXPIRED,
        isAuthenticityVerified: false,
        retrievalOnly: true,
        isSimulated: false,
        notes: `Student consent grant expired at ${grant.expiresAt.toISOString()}. Locker access is no longer permitted without re-consent.`,
      };
    }

    // Valid consent: return honest RETRIEVED_NOT_AUTHENTICITY_VERIFIED
    return {
      provider: this.providerType,
      status: VerificationStatus.RETRIEVED_NOT_AUTHENTICITY_VERIFIED,
      isAuthenticityVerified: false, // Non-negotiable authenticity principle: student locker is user content, not government authority
      retrievalOnly: true,
      isSimulated: false,
      evidenceReference: `CERTI-CONSENT-${grant._id.toString()}`,
      issuerMetadata: {
        consentGrantId: grant._id.toString(),
        purpose: grant.purpose,
        grantedAt: grant.grantedAt.toISOString(),
        expiresAt: grant.expiresAt.toISOString(),
      },
      notes:
        'Document retrieved via first-party student locker consent (Certi Adapter). First-party document locker sharing does NOT establish government or issuer authenticity.',
    };
  }
}

export const certiAdapter = new CertiAdapter();

