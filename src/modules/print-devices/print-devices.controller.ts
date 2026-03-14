import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { buildSuccessResponse } from '../../common/http/api-response.dto';
import { PrintDevicesService } from './print-devices.service';
import { CreatePrintDeviceDto } from './dto/create-print-devices.dto';
import { UpdatePrintDeviceDto } from './dto/update-print-devices.dto';
import { FilterPrintDeviceDto } from './dto/filter-print-devices.dto';

@ApiTags('print-devices')
@Controller('print-devices')
export class PrintDevicesController {
  constructor(private readonly service: PrintDevicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create print devices' })
  @ApiBody({ type: CreatePrintDeviceDto })
  @ApiCreatedResponse({
    description: 'Print Devices created',
    schema: {
      example: {
        success: true,
        message: 'Print Devices created successfully',
        data: {
          id: '11111111-2222-3333-4444-555555555555',
          tenantId: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11',
          status: 'active',
        },
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-devices',
      },
    },
  })
  async create(
    @Body() dto: CreatePrintDeviceDto,
    @Req() req: Request,
  ) {
    const data = await this.service.create(dto);
    return buildSuccessResponse(req.path, 'Print Devices created successfully', data);
  }

  @Get()
  @ApiOperation({ summary: 'List print devices' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 25 })
  @ApiQuery({ name: 'tenantId', required: false, example: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11' })
  @ApiQuery({ name: 'status', required: false, example: 'online' })
  @ApiQuery({
    name: 'active',
    required: false,
    example: true,
    description: 'True: online/busy. False: offline/paused/error/unknown.',
  })
  @ApiOkResponse({
    description: 'Print Devices list',
    schema: {
      example: {
        success: true,
        message: 'Print Devices list retrieved successfully',
        data: [],
        meta: { page: 1, pageSize: 25 },
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-devices',
      },
    },
  })
  async findAll(
    @Query() filter: FilterPrintDeviceDto,
    @Req() req: Request,
  ) {
    const data = await this.service.findAll(filter);
    return buildSuccessResponse(req.path, 'Print Devices list retrieved successfully', data, {
      page: filter.page,
      pageSize: filter.pageSize,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get print devices by id' })
  @ApiParam({ name: 'id', example: '11111111-2222-3333-4444-555555555555' })
  @ApiOkResponse({
    description: 'Print Devices detail',
    schema: {
      example: {
        success: true,
        message: 'Print Devices retrieved successfully',
        data: {
          id: '11111111-2222-3333-4444-555555555555',
          tenantId: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11',
          status: 'active',
        },
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-devices/11111111-2222-3333-4444-555555555555',
      },
    },
  })
  async findOne(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const data = await this.service.findOne(id);
    return buildSuccessResponse(req.path, 'Print Devices retrieved successfully', data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update print devices' })
  @ApiParam({ name: 'id', example: '11111111-2222-3333-4444-555555555555' })
  @ApiBody({ type: UpdatePrintDeviceDto })
  @ApiOkResponse({
    description: 'Print Devices updated',
    schema: {
      example: {
        success: true,
        message: 'Print Devices updated successfully',
        data: {
          id: '11111111-2222-3333-4444-555555555555',
          tenantId: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11',
          status: 'active',
        },
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-devices/11111111-2222-3333-4444-555555555555',
      },
    },
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePrintDeviceDto,
    @Req() req: Request,
  ) {
    const data = await this.service.update(id, dto);
    return buildSuccessResponse(req.path, 'Print Devices updated successfully', data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete print devices' })
  @ApiParam({ name: 'id', example: '11111111-2222-3333-4444-555555555555' })
  @ApiOkResponse({
    description: 'Print Devices deleted',
    schema: {
      example: {
        success: true,
        message: 'Print Devices deleted successfully',
        data: null,
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-devices/11111111-2222-3333-4444-555555555555',
      },
    },
  })
  async remove(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    await this.service.remove(id);
    return buildSuccessResponse(req.path, 'Print Devices deleted successfully', null);
  }
}
