import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import { WatermarkService } from './watermark.service';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class GcsService implements OnModuleInit {
  private storage: Storage;
  private bucketName: string;
  private bucket: any;

  constructor(private configService: ConfigService, private watermarkService: WatermarkService) {
    try {
      // Initialize Google Cloud Storage with service account key
      const keyFilePath = path.join(process.cwd(), '24rx-storage-service-key.json');
      
      console.log('🔑 Loading GCS credentials from:', keyFilePath);
      
      // Check if file exists
      if (!fs.existsSync(keyFilePath)) {
        throw new Error(`Service key file not found at: ${keyFilePath}`);
      }

      // Read and parse the key file
      const keyFileContent = fs.readFileSync(keyFilePath, 'utf8');
      const credentials = JSON.parse(keyFileContent);

      this.storage = new Storage({
        credentials: credentials,
        projectId: credentials.project_id || 'black-seer-478409-m8',
      });

      // Use bucket name from env or default
      this.bucketName = this.configService.get<string>('GCS_BUCKET_NAME') || '24rx-documents';
      this.bucket = this.storage.bucket(this.bucketName);
      
      console.log('✅ GCS credentials loaded successfully');
    } catch (error) {
      console.error('❌ Failed to initialize GCS:', error.message);
      throw error;
    }
  }

  async onModuleInit() {
    try {
      console.log('🔍 Checking Google Cloud Storage bucket:', this.bucketName);
      
      // Check if bucket exists
      const [exists] = await this.bucket.exists();
      
      if (exists) {
        console.log('✅ GCS bucket already exists:', this.bucketName);
      } else {
        console.warn('⚠️ GCS bucket does not exist:', this.bucketName);
        console.warn('Please create the bucket manually in Google Cloud Console');
        console.warn('Visit: https://console.cloud.google.com/storage');
      }
    } catch (error) {
      console.warn('⚠️ GCS initialization warning (non-critical):', error.message);
      console.warn('Application will continue without GCS file uploads');
    }
  }


  async uploadImageWithWatermark(
    file: Express.Multer.File,
    folder: string = "product-images",
  ): Promise<string> {
    console.log("🖼️  Adding watermark to image:", file.originalname);
    const watermarkedBuffer = await this.watermarkService.addWatermark(file.buffer);
    const watermarkedFile = { ...file, buffer: watermarkedBuffer };
    return this.uploadFile(watermarkedFile, folder);
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'documents',
  ): Promise<string> {
    const fileName = `${folder}/${Date.now()}-${file.originalname}`;
    
    console.log('📤 Uploading to Google Cloud Storage:', {
      bucket: this.bucketName,
      fileName,
      size: file.size,
      mimetype: file.mimetype,
    });
    
    const blob = this.bucket.file(fileName);
    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: file.mimetype,
      },
    });

    return new Promise((resolve, reject) => {
      blobStream.on('error', (error) => {
        console.error('❌ Upload error:', error);
        reject(error);
      });

      blobStream.on('finish', async () => {
        try {
          // Try to make the file publicly accessible
          await blob.makePublic();
          
          // Generate public URL
          const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
          
          console.log('✅ File uploaded successfully:', publicUrl);
          resolve(publicUrl);
        } catch (error) {
          // If uniform bucket-level access is enabled, generate signed URL instead
          console.log('⚠️ Cannot make file public (uniform bucket-level access enabled)');
          console.log('📝 Generating signed URL instead...');
          
          const [signedUrl] = await blob.getSignedUrl({
            action: 'read',
            expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
          });
          
          console.log('✅ File uploaded with signed URL:', signedUrl);
          resolve(signedUrl);
        }
      });

      blobStream.end(file.buffer);
    });
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract file name from URL
      // URL format: https://storage.googleapis.com/bucket-name/folder/filename
      const urlParts = fileUrl.split(`${this.bucketName}/`);
      if (urlParts.length > 1) {
        const fileName = urlParts[1];
        await this.bucket.file(fileName).delete();
        console.log('✅ File deleted successfully:', fileName);
      }
    } catch (error) {
      console.error('Error deleting file from GCS:', error);
    }
  }

  async getFileUrl(fileName: string): Promise<string> {
    // For public files, return the public URL
    return `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
  }

  async getSignedUrl(fileName: string, expiresInDays: number = 7): Promise<string> {
    // Generate a signed URL for private access (if needed in future)
    const [url] = await this.bucket.file(fileName).getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
    });
    return url;
  }
}
