import { config } from '../../config/env';
import { LocalStorageService } from './localStorage';
import { R2StorageService } from './r2Storage';

export interface IStorageService {
  saveQuarantined(key: string, buffer: Buffer, contentType: string): Promise<string>;
  promoteToClean(quarantineKey: string, cleanKey: string): Promise<string>;
  getFileBuffer(key: string): Promise<Buffer>;
  generatePresignedUploadUrl(key: string, contentType: string, expiresInSeconds?: number): Promise<string>;
  generatePresignedViewUrl(key: string, expiresInSeconds?: number): Promise<string>;
  deleteFile(key: string): Promise<void>;
}

export function createStorageService(): IStorageService {
  if (config.storageDriver === 'r2') {
    if (
      !config.r2.accessKeyId ||
      !config.r2.secretAccessKey ||
      !config.r2.endpoint ||
      !config.r2.bucketName ||
      config.r2.accessKeyId.includes('placeholder')
    ) {
      throw new Error(
        '[FATAL STORAGE CONFIG] STORAGE_DRIVER is set to "r2" but Cloudflare R2 credentials (accessKeyId, secretAccessKey, endpoint, bucketName) are missing or placeholder values. Refusing to start.'
      );
    }
    return new R2StorageService(config.r2);
  }

  if (config.isProd) {
    throw new Error(
      '[FATAL STORAGE CONFIG] Local storage driver is strictly prohibited in production environments. Cloudflare R2 must be configured.'
    );
  }

  return new LocalStorageService(config.localStorageDir);
}

export const storageService = createStorageService();
