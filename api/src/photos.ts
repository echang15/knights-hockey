import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface PhotoStore { put(key: string, bytes: Buffer): Promise<void> }

/** Photos live in their own bucket, served by CloudFront at /photos/*. */
export class S3PhotoStore implements PhotoStore {
  private s3 = new S3Client({});
  constructor(private bucket: string) {}
  async put(key: string, bytes: Buffer) {
    await this.s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: `photos/${key}`, Body: bytes, ContentType: 'image/jpeg', CacheControl: 'public, max-age=31536000, immutable' }));
  }
}

export class FilePhotoStore implements PhotoStore {
  constructor(public dir: string) {}
  async put(key: string, bytes: Buffer) { await fs.mkdir(this.dir, { recursive: true }); await fs.writeFile(path.join(this.dir, key), bytes); }
}
