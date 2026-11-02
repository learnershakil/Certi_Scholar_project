import { VerificationProviderType } from '@repo/contracts';
import { IVerificationProvider } from './types';
import { digiLockerAdapter } from './providers/digilockerAdapter';
import { certiAdapter } from './providers/certiAdapter';
import { manualAdapter } from './providers/manualAdapter';
import { simulatedAdapter } from './providers/simulatedAdapter';

export class VerificationProviderFactory {
  getProvider(type: VerificationProviderType): IVerificationProvider {
    switch (type) {
      case VerificationProviderType.DIGILOCKER:
        return digiLockerAdapter;
      case VerificationProviderType.CERTI_ADAPTER:
        return certiAdapter;
      case VerificationProviderType.MANUAL:
        return manualAdapter;
      case VerificationProviderType.SIMULATED:
        return simulatedAdapter;
      default:
        throw new Error(`Unsupported verification provider type: ${type}`);
    }
  }

  listAvailableProviders(): { type: VerificationProviderType; available: boolean; description: string }[] {
    return [
      {
        type: VerificationProviderType.DIGILOCKER,
        available: digiLockerAdapter.isAvailable(),
        description: 'DigiLocker official government issuer integration (requires approved credentials)',
      },
      {
        type: VerificationProviderType.CERTI_ADAPTER,
        available: certiAdapter.isAvailable(),
        description: 'First-party student document locker with 30-day consented sharing (retrieval-only)',
      },
      {
        type: VerificationProviderType.MANUAL,
        available: manualAdapter.isAvailable(),
        description: 'Manual verification by authorized institute verification officer with recorded evidence',
      },
      {
        type: VerificationProviderType.SIMULATED,
        available: simulatedAdapter.isAvailable(),
        description: 'Simulated mock adapter for testing (strictly prohibited in production)',
      },
    ];
  }
}

export const verificationProviderFactory = new VerificationProviderFactory();

