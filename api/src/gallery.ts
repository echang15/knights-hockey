import { S3Client, PutObjectCommand, DeleteObjectsCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { promises as fs } from 'node:fs';
import path from 'node:path';

/** Private storage for gallery images. Nothing here is publicly readable: callers get short-lived signed links. */
export interface GalleryStore {
  put(key: string, bytes: Buffer): Promise<void>;
  remove(keys: string[]): Promise<void>;
  url(key: string): Promise<string>;
}

const URL_TTL_SECONDS = 900;

export class S3GalleryStore implements GalleryStore {
  private s3 = new S3Client({});
  constructor(private bucket: string) {}
  async put(key: string, bytes: Buffer) {
    await this.s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: bytes, ContentType: 'image/jpeg' }));
  }
  async remove(keys: string[]) {
    if (!keys.length) return;
    await this.s3.send(new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true } }));
  }
  url(key: string) {
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: URL_TTL_SECONDS });
  }
}

/** Local dev only: files on disk, unsigned URLs. */
export class FileGalleryStore implements GalleryStore {
  constructor(public dir: string) {}
  async put(key: string, bytes: Buffer) { await fs.mkdir(this.dir, { recursive: true }); await fs.writeFile(path.join(this.dir, key), bytes); }
  async remove(keys: string[]) { await Promise.all(keys.map((k) => fs.rm(path.join(this.dir, k), { force: true }))); }
  async url(key: string) { return `/gallery-files/${key}`; }
}
