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
  UseGuards,
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
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RequireScopes } from '../../common/auth/required-scope.decorator';
import { PrintJobsService } from './print-jobs.service';
import { CreatePrintJobDto } from './dto/create-print-jobs.dto';
import { UpdatePrintJobDto } from './dto/update-print-jobs.dto';
import { FilterPrintJobDto } from './dto/filter-print-jobs.dto';

@ApiTags('print-jobs')
@UseGuards(JwtAuthGuard)
@RequireScopes('admin')
@Controller('print-jobs')
export class PrintJobsController {
  constructor(private readonly service: PrintJobsService) {}

  @Post()
  @ApiOperation({ summary: 'Create print jobs' })
  @ApiBody({ type: CreatePrintJobDto })
  @ApiCreatedResponse({
    description: 'Print Jobs created',
    schema: {
      example: {
        success: true,
        message: 'Print Jobs created successfully',
        data: {
          id: '11111111-2222-3333-4444-555555555555',
          tenantId: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11',
          status: 'queued',
        },
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-jobs',
      },
    },
  })
  async create(
    @Body() dto: CreatePrintJobDto,
    @Req() req: Request,
  ) {
    const data = await this.service.create(dto);
    return buildSuccessResponse(req.path, 'Print Jobs created successfully', data);
  }

  @Get()
  @ApiOperation({ summary: 'List print jobs' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 25 })
  @ApiQuery({ name: 'tenantId', required: false, example: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11' })
  @ApiQuery({ name: 'status', required: false, example: 'queued' })
  @ApiOkResponse({
    description: 'Print Jobs list',
    schema: {
      example: {
        success: true,
        message: 'Print Jobs list retrieved successfully',
        data: [],
        meta: { page: 1, pageSize: 25 },
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-jobs',
      },
    },
  })
  async findAll(
    @Query() filter: FilterPrintJobDto,
    @Req() req: Request,
  ) {
    const data = await this.service.findAll(filter);
    return buildSuccessResponse(req.path, 'Print Jobs list retrieved successfully', data, {
      page: filter.page,
      pageSize: filter.pageSize,
    });
  }

  @Get('monitor')
  @ApiOperation({ summary: 'Monitor print pipeline health and stuck jobs' })
  @ApiQuery({ name: 'tenantId', required: false, example: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11' })
  @ApiOkResponse({
    description: 'Print monitor snapshot',
    schema: {
      example: {
        success: true,
        message: 'Print monitor snapshot retrieved successfully',
        data: {
          staleMs: 60000,
          summary: {
            total: 120,
            queued: 4,
            routing: 1,
            sent: 2,
            processing: 1,
            retrying: 0,
            printed: 110,
            failed: 2,
            cancelled: 0,
          },
          staleInFlight: [],
          recentFailures: [],
        },
      },
    },
  })
  async monitor(
    @Query('tenantId') tenantId: string | undefined,
    @Req() req: Request,
  ) {
    const data = await this.service.getMonitor(tenantId);
    return buildSuccessResponse(
      req.path,
      'Print monitor snapshot retrieved successfully',
      data,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get print jobs by id' })
  @ApiParam({ name: 'id', example: '11111111-2222-3333-4444-555555555555' })
  @ApiOkResponse({
    description: 'Print Jobs detail',
    schema: {
      example: {
        success: true,
        message: 'Print Jobs retrieved successfully',
        data: {
          id: '11111111-2222-3333-4444-555555555555',
          tenantId: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11',
          status: 'processing',
        },
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-jobs/11111111-2222-3333-4444-555555555555',
      },
    },
  })
  async findOne(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const data = await this.service.findOne(id);
    return buildSuccessResponse(req.path, 'Print Jobs retrieved successfully', data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update print jobs' })
  @ApiParam({ name: 'id', example: '11111111-2222-3333-4444-555555555555' })
  @ApiBody({ type: UpdatePrintJobDto })
  @ApiOkResponse({
    description: 'Print Jobs updated',
    schema: {
      example: {
        success: true,
        message: 'Print Jobs updated successfully',
        data: {
          id: '11111111-2222-3333-4444-555555555555',
          tenantId: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11',
          status: 'printed',
        },
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-jobs/11111111-2222-3333-4444-555555555555',
      },
    },
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePrintJobDto,
    @Req() req: Request,
  ) {
    const data = await this.service.update(id, dto);
    return buildSuccessResponse(req.path, 'Print Jobs updated successfully', data);
  }

  @Post(':id/dispatch')
  @ApiOperation({ summary: 'Dispatch print job to subscribed device channel' })
  @ApiParam({ name: 'id', example: '11111111-2222-3333-4444-555555555555' })
  @ApiOkResponse({
    description: 'Print job dispatched',
    schema: {
      example: {
        success: true,
        message: 'Print Job dispatched successfully',
        data: {
          id: '11111111-2222-3333-4444-555555555555',
          status: 'sent',
        },
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-jobs/11111111-2222-3333-4444-555555555555/dispatch',
      },
    },
  })
  async dispatch(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const data = await this.service.dispatch(id);
    return buildSuccessResponse(req.path, 'Print Job dispatched successfully', data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete print jobs' })
  @ApiParam({ name: 'id', example: '11111111-2222-3333-4444-555555555555' })
  @ApiOkResponse({
    description: 'Print Jobs deleted',
    schema: {
      example: {
        success: true,
        message: 'Print Jobs deleted successfully',
        data: null,
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-jobs/11111111-2222-3333-4444-555555555555',
      },
    },
  })
  async remove(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    await this.service.remove(id);
    return buildSuccessResponse(req.path, 'Print Jobs deleted successfully', null);
  }
}
