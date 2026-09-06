import fs from 'fs/promises';
import path from 'path';
import { IStorageService } from './index';

export class LocalStorageService implements IStorageService {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  private async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch {
      // already exists
    }
  }

  private getFullPath(key: string): string {
    // Prevent directory traversal
    const safeKey = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    return path.join(this.baseDir, safeKey);
  }

  async saveQuarantined(key: string, buffer: Buffer, _contentType: string): Promise<string> {
    const fullPath = this.getFullPath(`quarantine/${key}`);
    await this.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, buffer);
    return `quarantine/${key}`;
  }

  async promoteToClean(quarantineKey: string, cleanKey: string): Promise<string> {
    const src = this.getFullPath(quarantineKey);
    const dest = this.getFullPath(`clean/${cleanKey}`);
    await this.ensureDir(path.dirname(dest));
    await fs.rename(src, dest);
    return `clean/${cleanKey}`;
  }

  async getFileBuffer(key: string): Promise<Buffer> {
    const fullPath = this.getFullPath(key);
    return fs.readFile(fullPath);
  }

  async generatePresignedUploadUrl(
    key: string,
    _contentType: string,
    _expiresInSeconds = 900
  ): Promise<string> {
    // For local dev driver, return an internal direct upload endpoint path
    return `/api/v1/documents/upload-local?key=${encodeURIComponent(key)}`;
  }

  async generatePresignedViewUrl(key: string, _expiresInSeconds = 900): Promise<string> {
    // For local dev driver, return a time-limited tokenized view route
    return `/api/v1/documents/view-local?key=${encodeURIComponent(key)}`;
  }

  async deleteFile(key: string): Promise<void> {
    const fullPath = this.getFullPath(key);
    try {
      await fs.unlink(fullPath);
    } catch {
      // Ignored if file doesn't exist
    }
  }
}

