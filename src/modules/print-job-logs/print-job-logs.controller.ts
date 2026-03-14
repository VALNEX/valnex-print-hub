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
import { PrintJobLogsService } from './print-job-logs.service';
import { CreatePrintJobLogDto } from './dto/create-print-job-logs.dto';
import { UpdatePrintJobLogDto } from './dto/update-print-job-logs.dto';
import { FilterPrintJobLogDto } from './dto/filter-print-job-logs.dto';

@ApiTags('print-job-logs')
@Controller('print-job-logs')
export class PrintJobLogsController {
  constructor(private readonly service: PrintJobLogsService) {}

  @Post()
  @ApiOperation({ summary: 'Create print job logs' })
  @ApiBody({ type: CreatePrintJobLogDto })
  @ApiCreatedResponse({
    description: 'Print Job Logs created',
    schema: {
      example: {
        success: true,
        message: 'Print Job Logs created successfully',
        data: {
          id: '11111111-2222-3333-4444-555555555555',
          tenantId: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11',
          status: 'active',
        },
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-job-logs',
      },
    },
  })
  async create(
    @Body() dto: CreatePrintJobLogDto,
    @Req() req: Request,
  ) {
    const data = await this.service.create(dto);
    return buildSuccessResponse(req.path, 'Print Job Logs created successfully', data);
  }

  @Get()
  @ApiOperation({ summary: 'List print job logs' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 25 })
  @ApiQuery({ name: 'tenantId', required: false, example: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11' })
  @ApiQuery({ name: 'status', required: false, example: 'active' })
  @ApiOkResponse({
    description: 'Print Job Logs list',
    schema: {
      example: {
        success: true,
        message: 'Print Job Logs list retrieved successfully',
        data: [],
        meta: { page: 1, pageSize: 25 },
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-job-logs',
      },
    },
  })
  async findAll(
    @Query() filter: FilterPrintJobLogDto,
    @Req() req: Request,
  ) {
    const data = await this.service.findAll(filter);
    return buildSuccessResponse(req.path, 'Print Job Logs list retrieved successfully', data, {
      page: filter.page,
      pageSize: filter.pageSize,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get print job logs by id' })
  @ApiParam({ name: 'id', example: '11111111-2222-3333-4444-555555555555' })
  @ApiOkResponse({
    description: 'Print Job Logs detail',
    schema: {
      example: {
        success: true,
        message: 'Print Job Logs retrieved successfully',
        data: {
          id: '11111111-2222-3333-4444-555555555555',
          tenantId: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11',
          status: 'active',
        },
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-job-logs/11111111-2222-3333-4444-555555555555',
      },
    },
  })
  async findOne(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const data = await this.service.findOne(id);
    return buildSuccessResponse(req.path, 'Print Job Logs retrieved successfully', data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update print job logs' })
  @ApiParam({ name: 'id', example: '11111111-2222-3333-4444-555555555555' })
  @ApiBody({ type: UpdatePrintJobLogDto })
  @ApiOkResponse({
    description: 'Print Job Logs updated',
    schema: {
      example: {
        success: true,
        message: 'Print Job Logs updated successfully',
        data: {
          id: '11111111-2222-3333-4444-555555555555',
          tenantId: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11',
          status: 'active',
        },
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-job-logs/11111111-2222-3333-4444-555555555555',
      },
    },
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePrintJobLogDto,
    @Req() req: Request,
  ) {
    const data = await this.service.update(id, dto);
    return buildSuccessResponse(req.path, 'Print Job Logs updated successfully', data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete print job logs' })
  @ApiParam({ name: 'id', example: '11111111-2222-3333-4444-555555555555' })
  @ApiOkResponse({
    description: 'Print Job Logs deleted',
    schema: {
      example: {
        success: true,
        message: 'Print Job Logs deleted successfully',
        data: null,
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-job-logs/11111111-2222-3333-4444-555555555555',
      },
    },
  })
  async remove(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    await this.service.remove(id);
    return buildSuccessResponse(req.path, 'Print Job Logs deleted successfully', null);
  }
}
