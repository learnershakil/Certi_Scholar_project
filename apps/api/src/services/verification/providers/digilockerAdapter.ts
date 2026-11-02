import { VerificationProviderType, VerificationStatus } from '@repo/contracts';
import { IVerificationProvider, VerificationContext, VerificationExecutionResult } from '../types';

export class DigiLockerAdapter implements IVerificationProvider {
  readonly providerType = VerificationProviderType.DIGILOCKER;

  isAvailable(): boolean {
    // DigiLocker is only available when real partner credentials and approved scopes are configured
    const clientId = process.env.DIGILOCKER_CLIENT_ID;
    const clientSecret = process.env.DIGILOCKER_CLIENT_SECRET;
    return Boolean(clientId && clientSecret && !clientId.includes('mock') && !clientId.includes('dev-'));
  }

  async verify(context: VerificationContext): Promise<VerificationExecutionResult> {
    if (!this.isAvailable()) {
      return {
        provider: this.providerType,
        status: VerificationStatus.UNAVAILABLE,
        isAuthenticityVerified: false,
        retrievalOnly: false,
        isSimulated: false,
        notes:
          'DigiLocker integration is not configured with official partner credentials and government scopes. It is never misrepresented as live or available without configuration.',
      };
    }

    // In a production environment with approved partner credentials:
    // Live verification requires a valid MeriPehchan student OAuth session and NeGD certificate trust chain.
    // Without an active live student OAuth token and cryptographic verification against the government root certificate,
    // we never falsely claim issuer verification.
    return {
      provider: this.providerType,
      status: VerificationStatus.UNAVAILABLE,
      isAuthenticityVerified: false,
      retrievalOnly: false,
      isSimulated: false,
      notes:
        'DigiLocker partner gateway is pending live MeriPehchan student OAuth token and NeGD certificate trust chain verification. Authentic digital signature verification cannot be claimed without live token exchange.',
    };
  }
}

export const digiLockerAdapter = new DigiLockerAdapter();

