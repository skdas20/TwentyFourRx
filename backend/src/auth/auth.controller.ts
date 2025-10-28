import { Controller, Post, Get, Body, UseGuards, Req, Res } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService, RegisterDto, LoginDto } from './auth.service';
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
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
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
}
