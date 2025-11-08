import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private minioClient: Minio.Client;
  private bucketName = '24rx-documents';

  constructor(private configService: ConfigService) {
    this.minioClient = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT') || 'localhost',
      port: parseInt(this.configService.get<string>('MINIO_PORT') || '9000'),
      useSSL: this.configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY') || 'minioadmin',
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY') || 'minioadmin123',
    });
  }

  async onModuleInit() {
    // Create bucket if it doesn't exist
    try {
      console.log('🔍 Checking MinIO bucket:', this.bucketName);
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        console.log('📦 Creating MinIO bucket:', this.bucketName);
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        console.log(`✅ Created MinIO bucket: ${this.bucketName}`);
        
        // Set bucket policy to allow public read access
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucketName}/*`],
            },
          ],
        };
        await this.minioClient.setBucketPolicy(this.bucketName, JSON.stringify(policy));
        console.log('✅ MinIO bucket policy set for public read access');
      } else {
        console.log('✅ MinIO bucket already exists:', this.bucketName);
      }
    } catch (error) {
      console.error('❌ MinIO initialization error:', error.message);
      console.error('Full error:', error);
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'documents',
  ): Promise<string> {
    const fileName = `${folder}/${Date.now()}-${file.originalname}`;
    
    console.log('📤 Uploading to MinIO:', {
      bucket: this.bucketName,
      fileName,
      size: file.size,
      mimetype: file.mimetype,
    });
    
    await this.minioClient.putObject(
      this.bucketName,
      fileName,
      file.buffer,
      file.size,
      {
        'Content-Type': file.mimetype,
      },
    );

    // Return the URL to access the file
    const url = `http://${this.configService.get<string>('MINIO_ENDPOINT') || 'localhost'}:${this.configService.get<string>('MINIO_PORT') || '9000'}/${this.bucketName}/${fileName}`;
    console.log('✅ File uploaded successfully:', url);
    return url;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract file name from URL
      const fileName = fileUrl.split(`/${this.bucketName}/`)[1];
      if (fileName) {
        await this.minioClient.removeObject(this.bucketName, fileName);
      }
    } catch (error) {
      console.error('Error deleting file from MinIO:', error);
    }
  }

  async getFileUrl(fileName: string): Promise<string> {
    // Generate a presigned URL valid for 7 days
    return await this.minioClient.presignedGetObject(this.bucketName, fileName, 7 * 24 * 60 * 60);
  }
}
