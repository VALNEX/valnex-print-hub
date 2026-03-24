import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { buildSuccessResponse } from '../../common/http/api-response.dto';
import { Public } from '../../common/auth/public.decorator';
import { CurrentAuth } from '../../common/auth/current-auth.decorator';
import type { AuthTokenPayload } from '../../common/auth/auth.types';
import { RequireScopes } from '../../common/auth/required-scope.decorator';
import { AuthService } from './auth.service';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AuthLoginDto } from './dto/auth-login.dto';
import { DeviceActivationRequestDto } from './dto/device-activation-request.dto';
import { DeviceActivationApproveDto } from './dto/device-activation-approve.dto';
import { DeviceTokenExchangeDto } from './dto/device-token-exchange.dto';
import { DeviceTokenRefreshDto } from './dto/device-token-refresh.dto';
import { DeviceLogoutDto } from './dto/device-logout.dto';
import { DeviceApiKeyRevokeDto } from './dto/device-api-key-revoke.dto';

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
  @ApiExcludeEndpoint()
  @ApiOperation({
    summary: 'Unified login: admin credentials only',
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
  @Post('device/activation/request')
  @ApiOperation({ summary: 'Request one-time activation code for a device' })
  @ApiBody({ type: DeviceActivationRequestDto })
  async requestDeviceActivation(
    @Body() dto: DeviceActivationRequestDto,
    @Req() req: Request,
  ) {
    const data = await this.authService.requestDeviceActivation(dto, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
    });
    return buildSuccessResponse(req.path, 'Device activation request created', data);
  }

  @UseGuards(JwtAuthGuard)
  @Post('device/activation/approve')
  @RequireScopes('admin')
  @ApiOperation({ summary: 'Approve a pending device activation request' })
  @ApiBody({ type: DeviceActivationApproveDto })
  async approveDeviceActivation(
    @Body() dto: DeviceActivationApproveDto,
    @CurrentAuth() auth: AuthTokenPayload,
    @Req() req: Request,
  ) {
    const data = await this.authService.approveDeviceActivation(dto, auth);
    return buildSuccessResponse(req.path, 'Device activation approved', data);
  }

  @Public()
  @Post('device/token')
  @ApiOperation({ summary: 'Exchange device API key for access and refresh tokens' })
  @ApiBody({ type: DeviceTokenExchangeDto })
  async exchangeDeviceToken(
    @Body() dto: DeviceTokenExchangeDto,
    @Req() req: Request,
  ) {
    const data = await this.authService.exchangeDeviceToken(dto, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
    });
    return buildSuccessResponse(req.path, 'Device token issued successfully', data);
  }

  @Public()
  @Post('device/refresh')
  @ApiOperation({ summary: 'Refresh device access token using refresh token' })
  @ApiBody({ type: DeviceTokenRefreshDto })
  async refreshDeviceToken(
    @Body() dto: DeviceTokenRefreshDto,
    @Req() req: Request,
  ) {
    const data = await this.authService.refreshDeviceToken(dto, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
    });
    return buildSuccessResponse(req.path, 'Device token refreshed successfully', data);
  }

  @Public()
  @Post('device/logout')
  @ApiOperation({ summary: 'Revoke a device refresh session' })
  @ApiBody({ type: DeviceLogoutDto })
  async logoutDevice(
    @Body() dto: DeviceLogoutDto,
    @Req() req: Request,
  ) {
    const data = await this.authService.logoutDevice(dto);
    return buildSuccessResponse(req.path, 'Device logout processed', data);
  }

  @UseGuards(JwtAuthGuard)
  @Post('device/api-key/revoke')
  @RequireScopes('admin')
  @ApiOperation({ summary: 'Revoke a device API key and all active sessions' })
  @ApiBody({ type: DeviceApiKeyRevokeDto })
  async revokeDeviceApiKey(
    @Body() dto: DeviceApiKeyRevokeDto,
    @Req() req: Request,
  ) {
    const data = await this.authService.revokeDeviceApiKey(dto);
    return buildSuccessResponse(req.path, 'Device API key revoked', data);
  }

  @UseGuards(JwtAuthGuard)
  @Get('device/activation/pending')
  @RequireScopes('admin')
  @ApiOperation({ summary: 'List pending device activation requests' })
  @ApiQuery({ name: 'tenantSlug', required: false, example: 'valnex' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiOkResponse({
    description: 'Pending device activations list',
    schema: {
      example: {
        success: true,
        message: 'Pending device activations retrieved successfully',
        data: {
          count: 1,
          items: [
            {
              id: '11111111-2222-3333-4444-555555555555',
              status: 'pending',
              expiresAt: '2026-03-18T20:20:00.000Z',
              createdAt: '2026-03-18T20:10:00.000Z',
              requestedIdentifier: 'WPF-FRONT-01',
              requestedMacAddress: 'aa:bb:cc:dd:ee:ff',
              requestedName: 'Front Desk Printer',
              tenant: {
                id: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11',
                slug: 'valnex',
                name: 'Valnex',
              },
              device: {
                id: '22222222-3333-4444-5555-666666666666',
                code: 'front-desk-a1b2c3d4',
                name: 'Front Desk Printer',
                status: 'unknown',
              },
            },
          ],
        },
      },
    },
  })
  async listPendingDeviceActivations(
    @Query('tenantSlug') tenantSlug: string | undefined,
    @Query('limit') limit: string | undefined,
    @Req() req: Request,
  ) {
    const parsedLimit = limit ? Number(limit) : undefined;
    const data = await this.authService.listPendingDeviceActivations({
      tenantSlug,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });
    return buildSuccessResponse(
      req.path,
      'Pending device activations retrieved successfully',
      data,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('printer/logout')
  @ApiExcludeEndpoint()
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
