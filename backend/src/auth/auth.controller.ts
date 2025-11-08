import { Controller, Post, Get, Body, UseGuards, Req, Res, Param, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { Response, Request } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AuthService, RegisterDto, LoginDto, CreateAdminDto, ForgotPasswordDto, ResetPasswordDto } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // inject config if needed for cookie settings
  // using passthrough responses so Nest still returns value

  @Public()
  @Post('register')
  @UseInterceptors(
    FileFieldsInterceptor([
      // Screenshot 1 - Basic Business Documents
      { name: 'GST_CERTIFICATE', maxCount: 1 },
      { name: 'PAN_CARD', maxCount: 1 },
      { name: 'FACTORY_LICENSE', maxCount: 1 },
      { name: 'FSSAI_CERTIFICATE', maxCount: 1 },
      { name: 'CANCELLED_CHEQUE', maxCount: 1 },
      { name: 'INDEMNITY_CERTIFICATE', maxCount: 1 },
      { name: 'COMPANY_PROFILE', maxCount: 1 },
      { name: 'DRUG_LICENSE_1', maxCount: 1 },
      { name: 'DRUG_LICENSE_2', maxCount: 1 },
      { name: 'DRUG_LICENSE_3', maxCount: 1 },
      { name: 'DRUG_LICENSE_4', maxCount: 1 },
      // Screenshot 2 - Authorization & Quality Documents
      { name: 'MANUFACTURER_AUTH_LETTER', maxCount: 1 },
      { name: 'MANUFACTURER_AGREEMENT', maxCount: 1 },
      { name: 'QUALITY_CERTIFICATIONS', maxCount: 1 },
      { name: 'INCORPORATION_CERTIFICATE', maxCount: 1 },
      { name: 'MSE_CERTIFICATE', maxCount: 1 },
      { name: 'UDYOG_AADHAR', maxCount: 1 },
      { name: 'NSIC_CERTIFICATE', maxCount: 1 },
      // Screenshot 3 - Legal & Compliance Documents
      { name: 'NON_CONVICTION_CERTIFICATE', maxCount: 1 },
      { name: 'SUPPLY_ORDER', maxCount: 1 },
      { name: 'SAMPLE_DECLARATION_FORM', maxCount: 1 },
      { name: 'DECLARATION_FORM', maxCount: 1 },
    ], {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
      },
      fileFilter: (req, file, callback) => {
        // Allow PDF, images
        const allowedMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (allowedMimes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new Error(`Invalid file type for ${file.fieldname}. Only PDF, JPG, PNG allowed.`), false);
        }
      },
    })
  )
  async register(
    @Body() dto: RegisterDto,
    @UploadedFiles() files?: { [fieldname: string]: Express.Multer.File[] },
  ) {
    // Convert file arrays to single files
    const documents: { [docTypeCode: string]: Express.Multer.File } = {};
    if (files) {
      for (const [key, fileArray] of Object.entries(files)) {
        if (fileArray && fileArray.length > 0) {
          documents[key] = fileArray[0];
        }
      }
    }

    return this.authService.register(dto, documents);
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);

    // Set refresh token as httpOnly cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: parseInt(process.env.REFRESH_TOKEN_EXPIRES_SECONDS || '2592000') * 1000,
      path: '/',
    };

    res.cookie('refreshToken', result.refreshToken, cookieOptions);

    // return access token and user
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return { error: 'No refresh token' };
    }

    const result = await this.authService.refreshToken(token);

    // Optionally rotate refresh token (not rotating in this initial version)

    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refreshToken;
    if (token) {
      await this.authService.revokeRefreshToken(token);
    }
    res.clearCookie('refreshToken', { path: '/' });
    return { ok: true };
  }

  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.sub);
  }

  // SECRET ENDPOINT: Create admin (internal use only)
  @Public()
  @Post('admin/create')
  async createAdmin(@Body() dto: CreateAdminDto) {
    return this.authService.createAdmin(dto);
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Get('validate-reset-token/:token')
  async validateResetToken(@Param('token') token: string) {
    return this.authService.validateResetToken(token);
  }
}
