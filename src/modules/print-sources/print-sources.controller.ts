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
import { PrintSourcesService } from './print-sources.service';
import { CreatePrintSourceDto } from './dto/create-print-sources.dto';
import { UpdatePrintSourceDto } from './dto/update-print-sources.dto';
import { FilterPrintSourceDto } from './dto/filter-print-sources.dto';

@ApiTags('print-sources')
@Controller('print-sources')
export class PrintSourcesController {
  constructor(private readonly service: PrintSourcesService) {}

  @Post()
  @ApiOperation({ summary: 'Create print sources' })
  @ApiBody({ type: CreatePrintSourceDto })
  @ApiCreatedResponse({
    description: 'Print Sources created',
    schema: {
      example: {
        success: true,
        message: 'Print Sources created successfully',
        data: {
          id: '11111111-2222-3333-4444-555555555555',
          tenantId: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11',
          status: 'active',
        },
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-sources',
      },
    },
  })
  async create(@Body() dto: CreatePrintSourceDto, @Req() req: Request) {
    const data = await this.service.create(dto);
    return buildSuccessResponse(req.path, 'Print Sources created successfully', data);
  }

  @Get()
  @ApiOperation({ summary: 'List print sources' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 25 })
  @ApiQuery({ name: 'tenantId', required: false, example: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11' })
  @ApiQuery({ name: 'status', required: false, example: 'active' })
  @ApiOkResponse({
    description: 'Print Sources list',
    schema: {
      example: {
        success: true,
        message: 'Print Sources list retrieved successfully',
        data: [],
        meta: { page: 1, pageSize: 25 },
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-sources',
      },
    },
  })
  async findAll(@Query() filter: FilterPrintSourceDto, @Req() req: Request) {
    const data = await this.service.findAll(filter);
    return buildSuccessResponse(req.path, 'Print Sources list retrieved successfully', data, {
      page: filter.page,
      pageSize: filter.pageSize,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get print sources by id' })
  @ApiParam({ name: 'id', example: '11111111-2222-3333-4444-555555555555' })
  @ApiOkResponse({
    description: 'Print Sources detail',
    schema: {
      example: {
        success: true,
        message: 'Print Sources retrieved successfully',
        data: {
          id: '11111111-2222-3333-4444-555555555555',
          tenantId: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11',
          status: 'active',
        },
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-sources/11111111-2222-3333-4444-555555555555',
      },
    },
  })
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const data = await this.service.findOne(id);
    return buildSuccessResponse(req.path, 'Print Sources retrieved successfully', data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update print sources' })
  @ApiParam({ name: 'id', example: '11111111-2222-3333-4444-555555555555' })
  @ApiBody({ type: UpdatePrintSourceDto })
  @ApiOkResponse({
    description: 'Print Sources updated',
    schema: {
      example: {
        success: true,
        message: 'Print Sources updated successfully',
        data: {
          id: '11111111-2222-3333-4444-555555555555',
          tenantId: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11',
          status: 'active',
        },
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-sources/11111111-2222-3333-4444-555555555555',
      },
    },
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePrintSourceDto,
    @Req() req: Request,
  ) {
    const data = await this.service.update(id, dto);
    return buildSuccessResponse(req.path, 'Print Sources updated successfully', data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete print sources' })
  @ApiParam({ name: 'id', example: '11111111-2222-3333-4444-555555555555' })
  @ApiOkResponse({
    description: 'Print Sources deleted',
    schema: {
      example: {
        success: true,
        message: 'Print Sources deleted successfully',
        data: null,
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-sources/11111111-2222-3333-4444-555555555555',
      },
    },
  })
  async remove(@Param('id') id: string, @Req() req: Request) {
    await this.service.remove(id);
    return buildSuccessResponse(req.path, 'Print Sources deleted successfully', null);
  }
}
