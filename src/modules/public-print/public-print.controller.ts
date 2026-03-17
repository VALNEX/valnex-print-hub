import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/auth/public.decorator';
import { buildSuccessResponse } from '../../common/http/api-response.dto';
import { PublicSubmitPrintDto } from './dto/public-submit-print.dto';
import { PublicPrintService } from './public-print.service';

@ApiTags('public-print')
@Public()
@Controller('public/print')
export class PublicPrintController {
  constructor(private readonly service: PublicPrintService) {}

  @Get('devices')
  @ApiOperation({ summary: 'List available printers for public client' })
  @ApiQuery({ name: 'tenantSlug', required: true, example: 'valnex' })
  @ApiOkResponse({ description: 'Available devices listed successfully' })
  async listAvailableDevices(
    @Query('tenantSlug') tenantSlug: string,
    @Req() req: Request,
  ) {
    const data = await this.service.listAvailableDevices(tenantSlug);
    return buildSuccessResponse(
      req.path,
      'Available devices listed successfully',
      data,
    );
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit and dispatch print job (public endpoint)' })
  @ApiBody({ type: PublicSubmitPrintDto })
  @ApiOkResponse({ description: 'Print job submitted successfully' })
  async submitPrint(@Body() dto: PublicSubmitPrintDto, @Req() req: Request) {
    const data = await this.service.submitPrint(dto);
    return buildSuccessResponse(req.path, 'Print job submitted successfully', data);
  }
}
