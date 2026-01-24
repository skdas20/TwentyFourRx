
import {
  Controller,
  Get,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    return this.usersService.getUser(user.sub);
  }

  @Get('documents')
  async getDocuments(@CurrentUser() user: any) {
    return this.usersService.getUserDocuments(user.sub);
  }

  @Post('documents')
  @UseInterceptors(AnyFilesInterceptor())
  async uploadDocuments(
    @CurrentUser() user: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    console.log(`\n========================================`);
    console.log(`📤 DOCUMENT UPLOAD REQUEST RECEIVED`);
    console.log(`========================================`);
    console.log(`👤 User ID: ${user?.sub || 'UNKNOWN'}`);
    console.log(`👤 User Email: ${user?.email || 'UNKNOWN'}`);
    console.log(`📎 Files received: ${files?.length || 0}`);
    console.log(`📦 Request timestamp: ${new Date().toISOString()}`);
    
    if (!files || files.length === 0) {
      console.log(`⚠️  WARNING: No files received in request!`);
    }
    
    // Group files by fieldname (document type)
    const documents: { [key: string]: Express.Multer.File[] } = {};
    files?.forEach((file, index) => {
      console.log(`\n📄 File ${index + 1}:`);
      console.log(`   - Field name: ${file.fieldname}`);
      console.log(`   - Original name: ${file.originalname}`);
      console.log(`   - Size: ${file.size} bytes (${(file.size / 1024).toFixed(2)} KB)`);
      console.log(`   - MIME type: ${file.mimetype}`);
      
      if (!documents[file.fieldname]) {
        documents[file.fieldname] = [];
      }
      documents[file.fieldname].push(file);
    });

    // Convert arrays to single file or keep as array
    const documentsToUpload: { [key: string]: Express.Multer.File | Express.Multer.File[] } = {};
    for (const [key, fileArray] of Object.entries(documents)) {
      documentsToUpload[key] = fileArray.length === 1 ? fileArray[0] : fileArray;
      console.log(`\n📦 Document type "${key}": ${fileArray.length} file(s)`);
    }

    console.log(`\n🔄 Calling uploadKycDocuments service...`);
    try {
      const result = await this.usersService.uploadKycDocuments(user.sub, documentsToUpload);
      console.log(`✅ Upload completed successfully for user: ${user.sub}`);
      console.log(`📊 Result: ${JSON.stringify(result)}`);
      console.log(`========================================\n`);
      return result;
    } catch (error) {
      console.log(`❌ Upload failed with error:`);
      console.log(error);
      console.log(`========================================\n`);
      throw error;
    }
  }
}
