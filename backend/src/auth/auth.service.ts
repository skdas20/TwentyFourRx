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
import * as bcrypt from 'bcrypt';

export interface RegisterDto {
  name: string;
  email: string;
  phone?: string;
  password: string;
  roleCode?: 'TRADER' | 'SELLER'; // Optional, defaults to TRADER
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

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private redisService: RedisService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
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

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user with PENDING status
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        password: hashedPassword,
        roleCode: roleCode,
        status: 'PENDING',
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

    // Send welcome email with credentials
    try {
      await this.emailService.sendWelcomeEmail(
        user.email,
        user.name,
        user.email,
        dto.password,
      );
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Continue even if email fails
    }

    return {
      message: 'Registration successful. Please check your email for credentials and wait for admin approval.',
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

    // Check if user is approved
    if (user.status !== 'APPROVED') {
      throw new UnauthorizedException(
        `Your account is ${user.status}. Please wait for admin approval.`,
      );
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been deactivated');
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
}
