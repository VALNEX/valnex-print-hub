import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { buildSuccessResponse } from '../../common/http/api-response.dto';
import { Public } from '../../common/auth/public.decorator';
import { CurrentAuth } from '../../common/auth/current-auth.decorator';
import type { AuthTokenPayload } from '../../common/auth/auth.types';
import { AuthService } from './auth.service';
import { PrinterLoginDto } from './dto/printer-login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
  async printerLogout(
    @CurrentAuth() auth: AuthTokenPayload,
    @Req() req: Request,
  ) {
    const data = await this.authService.logout(auth);
    return buildSuccessResponse(req.path, 'Printer logout successful', data);
  }
}
