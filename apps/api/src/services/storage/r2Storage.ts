import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IStorageService } from './index';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  endpoint: string;
}

export class R2StorageService implements IStorageService {
  private client: S3Client;
  private bucket: string;

  constructor(config: R2Config) {
    this.bucket = config.bucketName;
    this.client = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async saveQuarantined(key: string, buffer: Buffer, contentType: string): Promise<string> {
    const objectKey = `quarantine/${key}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: buffer,
        ContentType: contentType,
      })
    );
    return objectKey;
  }

  async promoteToClean(quarantineKey: string, cleanKey: string): Promise<string> {
    const destKey = `clean/${cleanKey}`;
    // Copy from quarantine to clean
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${quarantineKey}`,
        Key: destKey,
      })
    );
    // Delete quarantine object
    await this.deleteFile(quarantineKey);
    return destKey;
  }

  async getFileBuffer(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );

    if (!response.Body) {
      throw new Error(`Object body is empty for key: ${key}`);
    }

    // Convert stream to Buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async generatePresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds = 900
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: `quarantine/${key}`,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async generatePresignedViewUrl(key: string, expiresInSeconds = 900): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async deleteFile(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
  }
}

