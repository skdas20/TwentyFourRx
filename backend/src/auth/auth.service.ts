import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../config/prisma.service';
import { RedisService } from '../config/redis.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../common/services/email.service';
import { GcsService } from '../common/services/gcs.service';
import * as bcrypt from 'bcrypt';
import { generateSecurePassword, generateResetToken, hashToken, validateToken } from '../common/utils/password.util';

export interface RegisterDto {
  name: string;
  email: string;
  phone?: string;
  roleCode?: 'TRADER' | 'SELLER'; // Optional, defaults to TRADER
  dlNumber?: string;
  gstin?: string;
  address?: string;
  // password removed - will be auto-generated
}

export interface CreateAdminDto {
  name: string;
  email: string;
  phone?: string;
  password: string;
  secretKey: string; // Must match env variable
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private redisService: RedisService,
    private configService: ConfigService,
    private emailService: EmailService,
    private gcsService: GcsService,
  ) {}

  async register(
    dto: RegisterDto,
    documents?: { [docTypeCode: string]: Express.Multer.File },
  ) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Default to TRADER if no role specified (SELLER and TRADER have same permissions)
    const roleCode: 'TRADER' | 'SELLER' = dto.roleCode || 'TRADER';

    // Validate role - only TRADER or SELLER allowed for public registration
    if (!['TRADER', 'SELLER'].includes(roleCode)) {
      throw new BadRequestException('Invalid role. Must be TRADER or SELLER');
    }

    // Validate Required Business Fields
    if (!dto.dlNumber || !dto.gstin || !dto.address) {
      throw new BadRequestException('DL Number, GSTIN and Address are required for registration');
    }

    // Generate secure password
    const generatedPassword = generateSecurePassword();
    
    // Hash password
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // Create user with PENDING status (Allows login but restricted features)
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        password: hashedPassword,
        roleCode: roleCode,
        status: 'PENDING',
        dlNumber: dto.dlNumber,
        gstin: dto.gstin,
        address: dto.address,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        roleCode: true,
        status: true,
        createdAt: true,
      },
    });

    // Send welcome email with generated password
    let emailSent = false;
    try {
      await this.emailService.sendWelcomeEmail(
        user.email,
        user.name,
        user.email,
        generatedPassword,
      );
      emailSent = true;
    } catch (error) {
      console.error('Failed to send welcome email (Non-fatal):', error);
      // Do NOT delete user. Proceed.
    }

    return {
      message: 'Registration successful! Please check your email for your login credentials. You can now login and complete your profile.',
      user,
    };
  }

  async createAdmin(dto: CreateAdminDto) {
    // Verify secret key
    const adminSecretKey = this.configService.get<string>('ADMIN_SECRET_KEY');
    if (!adminSecretKey || dto.secretKey !== adminSecretKey) {
      throw new UnauthorizedException('Invalid secret key');
    }

    // Check if admin already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create admin user with APPROVED status
    const admin = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        password: hashedPassword,
        roleCode: 'ADMIN',
        status: 'APPROVED', // Auto-approved
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        roleCode: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      message: 'Admin created successfully',
      admin,
    };
  }

  async login(dto: LoginDto) {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Allow PENDING users to login (Restricted access)
    // Check if user is active/blocked
    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been deactivated');
    }
    if (user.status === 'BLOCKED') {
      throw new UnauthorizedException('Your account has been blocked');
    }
    if (user.status === 'REJECTED') {
      throw new UnauthorizedException('Your registration was rejected. Please contact support.');
    }

    // Generate JWT access token
    const payload = {
      sub: user.id,
      email: user.email,
      roleCode: user.roleCode,
      status: user.status,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRATION', '15m'),
    });

    // Generate refresh token (random token stored in Redis keyed by token)
    const rawRefresh = require('crypto').randomBytes(64).toString('hex');

    const redisClient = this.redisService.getClient();
    const refreshTtlSeconds = parseInt(this.configService.get('REFRESH_TOKEN_EXPIRES_SECONDS', '2592000'));

    // Store mapping refresh:<token> => userId with TTL
    await redisClient.set(`refresh:${rawRefresh}`, user.id, 'EX', refreshTtlSeconds);

    return {
      accessToken,
      refreshToken: rawRefresh,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        roleCode: user.roleCode,
        status: user.status,
      },
    };
  }
  async refreshToken(presentedToken: string) {
    const redisClient = this.redisService.getClient();
    const userId = await redisClient.get(`refresh:${presentedToken}`);
    if (!userId) {
      throw new UnauthorizedException('Refresh token not found or expired');
    }

    // Validate user
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive || user.status !== 'APPROVED') {
      throw new UnauthorizedException('User not valid');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      roleCode: user.roleCode,
      status: user.status,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRATION', '15m'),
    });

    return { accessToken, user };
  }

  async revokeRefreshToken(presentedToken: string) {
    const redisClient = this.redisService.getClient();
    await redisClient.del(`refresh:${presentedToken}`);
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        roleCode: true,
        status: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        roleCode: true,
        status: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    // Always return success message to prevent email enumeration
    const successMessage = 'If your email is registered, you will receive a password reset link shortly.';

    if (!user) {
      return { message: successMessage };
    }

    // Invalidate any existing reset tokens for this user
    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        usedAt: new Date(),
      },
    });

    // Generate reset token
    const resetToken = generateResetToken();
    const hashedToken = hashToken(resetToken);

    // Store token with 1 hour expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt,
      },
    });

    // Send password reset email asynchronously
    this.emailService.sendPasswordResetEmail(
      user.email,
      user.name,
      resetToken, // Send plain token in email
    ).catch(error => {
      console.error('Failed to send password reset email:', error);
      // Still return success to prevent email enumeration
    });

    return { message: successMessage };
  }

  async resetPassword(dto: ResetPasswordDto) {
    // Validate passwords match
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Validate password strength
    if (dto.newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    // Hash the provided token
    const hashedToken = hashToken(dto.token);

    // Find valid token
    const tokenRecord = await this.prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    // Check if token is expired
    if (tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('Reset link has expired');
    }

    // Check if token was already used
    if (tokenRecord.usedAt) {
      throw new BadRequestException('Reset link has already been used');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // Update user password
    await this.prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { password: hashedPassword },
    });

    // Mark token as used
    await this.prisma.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() },
    });

    // Send confirmation email asynchronously
    this.emailService.sendPasswordChangedEmail(
      tokenRecord.user.email,
      tokenRecord.user.name,
    ).catch(error => {
      console.error('Failed to send password changed email:', error);
    });

    return { message: 'Password reset successful. You can now log in with your new password.' };
  }

  async validateResetToken(token: string) {
    const hashedToken = hashToken(token);

    const tokenRecord = await this.prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
    });

    if (!tokenRecord) {
      return { valid: false };
    }

    if (tokenRecord.expiresAt < new Date() || tokenRecord.usedAt) {
      return { valid: false };
    }

    return { valid: true };
  }
}
