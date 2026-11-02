import { VerificationProviderType, VerificationStatus } from '@repo/contracts';
import { IVerificationProvider, VerificationContext, VerificationExecutionResult } from '../types';

export class ManualVerificationAdapter implements IVerificationProvider {
  readonly providerType = VerificationProviderType.MANUAL;

  isAvailable(): boolean {
    return true; // Human officer verification fallback
  }

  async verify(context: VerificationContext): Promise<VerificationExecutionResult> {
    const evidence = context.manualEvidence;
    if (!evidence || !evidence.method || !evidence.reference) {
      return {
        provider: this.providerType,
        status: VerificationStatus.MANUAL_REVIEW_REQUIRED,
        isAuthenticityVerified: false,
        retrievalOnly: false,
        isSimulated: false,
        notes: 'Manual verification requires verification method, reference ID, and officer notes.',
      };
    }

    return {
      provider: this.providerType,
      status: VerificationStatus.MATCHED,
      isAuthenticityVerified: true,
      retrievalOnly: false,
      isSimulated: false,
      evidenceReference: evidence.reference,
      issuerMetadata: {
        method: evidence.method,
        officerId: evidence.officerId,
        verifiedAt: new Date().toISOString(),
      },
      notes: `Manual verification confirmed by officer via method '${evidence.method}'. Evidence: ${evidence.reference}. Notes: ${evidence.notes}`,
    };
  }
}

export const manualAdapter = new ManualVerificationAdapter();

