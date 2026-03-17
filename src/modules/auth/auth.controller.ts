import {
  Body,
  Controller,
  Headers,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { buildSuccessResponse } from '../../common/http/api-response.dto';
import { Public } from '../../common/auth/public.decorator';
import { CurrentAuth } from '../../common/auth/current-auth.decorator';
import type { AuthTokenPayload } from '../../common/auth/auth.types';
import { RequireScopes } from '../../common/auth/required-scope.decorator';
import { AuthService } from './auth.service';
import { PrinterLoginDto } from './dto/printer-login.dto';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AuthLoginDto } from './dto/auth-login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private getAdminCookieOptions() {
    const maxAgeSeconds = Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 28800);
    const maxAge =
      Number.isFinite(maxAgeSeconds) && maxAgeSeconds > 0
        ? Math.floor(maxAgeSeconds) * 1000
        : 28800000;

    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge,
      domain: process.env.ADMIN_COOKIE_DOMAIN || undefined,
    };
  }

  private setAdminCookie(response: Response, accessToken: string) {
    response.cookie(
      'admin_access_token',
      accessToken,
      this.getAdminCookieOptions(),
    );
  }

  private clearAdminCookie(response: Response) {
    const options = this.getAdminCookieOptions();
    response.clearCookie('admin_access_token', {
      httpOnly: true,
      secure: options.secure,
      sameSite: options.sameSite,
      path: options.path,
      domain: options.domain,
    });
  }

  @Public()
  @Post('login')
  @ApiOperation({
    summary:
      'Unified login: identifies if credentials belong to admin user or tenant',
  })
  @ApiBody({ type: AuthLoginDto })
  async login(
    @Body() dto: AuthLoginDto,
    @Res({ passthrough: true }) response: Response,
    @Req() req: Request,
  ) {
    const data = await this.authService.login(dto);

    if (data.principalType === 'admin') {
      this.setAdminCookie(response, data.accessToken);
    }

    return buildSuccessResponse(req.path, 'Login successful', data);
  }

  @Public()
  @Post('admin/register')
  @ApiOperation({ summary: 'Register initial admin user (one-time bootstrap)' })
  @ApiBody({ type: AdminRegisterDto })
  async adminRegister(
    @Body() dto: AdminRegisterDto,
    @Headers('x-bootstrap-token') bootstrapToken: string | undefined,
    @Res({ passthrough: true }) response: Response,
    @Req() req: Request,
  ) {
    const data = await this.authService.registerInitialAdmin(dto, bootstrapToken);
    this.setAdminCookie(response, data.accessToken);
    return buildSuccessResponse(req.path, 'Admin registered successfully', data);
  }

  @Public()
  @Post('admin/login')
  @ApiOperation({ summary: 'Login for admin panel' })
  @ApiBody({ type: AdminLoginDto })
  async adminLogin(
    @Body() dto: AdminLoginDto,
    @Res({ passthrough: true }) response: Response,
    @Req() req: Request,
  ) {
    const data = await this.authService.adminLogin(dto);
    this.setAdminCookie(response, data.accessToken);
    return buildSuccessResponse(req.path, 'Admin login successful', data);
  }

  @Public()
  @Post('printer/login')
  @ApiOperation({ summary: 'Login for printer client (.NET/WPF)' })
  @ApiBody({ type: PrinterLoginDto })
  @ApiOkResponse({
    description: 'Printer login succeeded',
    schema: {
      example: {
        success: true,
        message: 'Printer login successful',
        data: {
          tokenType: 'Bearer',
          accessToken: '<jwt>',
          expiresAt: '2026-03-14T08:00:00.000Z',
          tenantId: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11',
          tenantSlug: 'tenant-slug',
          ws: {
            namespace: '/print',
            auth: {
              token: '<jwt>',
            },
          },
        },
      },
    },
  })
  async printerLogin(@Body() dto: PrinterLoginDto, @Req() req: Request) {
    const data = await this.authService.printerLogin(dto);
    return buildSuccessResponse(req.path, 'Printer login successful', data);
  }

  @UseGuards(JwtAuthGuard)
  @Post('printer/logout')
  @ApiOperation({ summary: 'Logout and revoke printer token' })
  @RequireScopes('printer-client')
  async printerLogout(
    @CurrentAuth() auth: AuthTokenPayload,
    @Req() req: Request,
  ) {
    const data = await this.authService.logout(auth);
    return buildSuccessResponse(req.path, 'Printer logout successful', data);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/logout')
  @ApiOperation({ summary: 'Logout and revoke admin token' })
  @RequireScopes('admin')
  async adminLogout(
    @CurrentAuth() auth: AuthTokenPayload,
    @Res({ passthrough: true }) response: Response,
    @Req() req: Request,
  ) {
    const data = await this.authService.logout(auth);
    this.clearAdminCookie(response);
    return buildSuccessResponse(req.path, 'Admin logout successful', data);
  }
}
