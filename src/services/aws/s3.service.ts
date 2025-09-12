import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import path from 'path';

export class S3Service {
  private bucket: string;
  private s3Client: S3Client;

  constructor() {
    this.bucket = process.env.AWS_S3_BUCKET || 'cosmicspace-media';
    
    // Initialize S3 client with environment-aware configuration
    const s3Config: any = {
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: process.env.AWS_ACCESS_KEY_ID ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      } : undefined,
    };

    // For LocalStack development
    if (process.env.AWS_S3_ENDPOINT || process.env.AWS_ENDPOINT) {
      s3Config.endpoint = process.env.AWS_S3_ENDPOINT || process.env.AWS_ENDPOINT;
      s3Config.forcePathStyle = true;
    }

    this.s3Client = new S3Client(s3Config);
  }

  /**
   * Upload a file to S3
   */
  async uploadFile(
    key: string,
    body: Buffer | Uint8Array | string | Readable,
    contentType?: string,
    metadata?: Record<string, string>
  ) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: metadata,
      // Set appropriate ACL based on file type
      ACL: key.startsWith('public/') ? 'public-read' : 'private',
    });

    try {
      const result = await this.s3Client.send(command);
      const fileUrl = this.getFileUrl(key);
      return {
        success: true,
        key,
        url: fileUrl,
        etag: result.ETag,
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error(`Failed to upload file: ${error}`);
    }
  }

  /**
   * Get a presigned URL for uploading (client-side upload)
   */
  async getUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    try {
      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      console.error('Error generating upload URL:', error);
      throw new Error(`Failed to generate upload URL: ${error}`);
    }
  }

  /**
   * Get a presigned URL for downloading (private files)
   */
  async getDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      console.error('Error generating download URL:', error);
      throw new Error(`Failed to generate download URL: ${error}`);
    }
  }

  /**
   * Download a file from S3
   */
  async downloadFile(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      const response = await this.s3Client.send(command);
      const stream = response.Body as Readable;
      const chunks: Buffer[] = [];
      
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error) {
      console.error('S3 download error:', error);
      throw new Error(`Failed to download file: ${error}`);
    }
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<boolean> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
      return true;
    } catch (error) {
      console.error('S3 delete error:', error);
      return false;
    }
  }

  /**
   * Check if a file exists
   */
  async fileExists(key: string): Promise<boolean> {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(prefix: string, maxKeys: number = 1000) {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
      MaxKeys: maxKeys,
    });

    try {
      const response = await this.s3Client.send(command);
      return response.Contents || [];
    } catch (error) {
      console.error('S3 list error:', error);
      return [];
    }
  }

  /**
   * Generate a key for storing files
   */
  generateKey(
    userId: string,
    projectId: string,
    filename: string,
    type: 'media' | 'document' | 'avatar' = 'media'
  ): string {
    const ext = path.extname(filename);
    const name = path.basename(filename, ext);
    const timestamp = Date.now();
    const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, '_');
    
    return `${type}/${userId}/${projectId}/${timestamp}-${sanitizedName}${ext}`;
  }

  /**
   * Get the public URL for a file
   */
  private getFileUrl(key: string): string {
    if (process.env.AWS_ENDPOINT) {
      // LocalStack URL
      return `${process.env.AWS_ENDPOINT}/${this.bucket}/${key}`;
    } else {
      // Production S3 URL
      return `https://${this.bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
    }
  }
}

export default new S3Service();