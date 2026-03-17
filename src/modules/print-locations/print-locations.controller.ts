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
import { PrintLocationsService } from './print-locations.service';
import { CreatePrintLocationDto } from './dto/create-print-locations.dto';
import { UpdatePrintLocationDto } from './dto/update-print-locations.dto';
import { FilterPrintLocationDto } from './dto/filter-print-locations.dto';

@ApiTags('print-locations')
@UseGuards(JwtAuthGuard)
@RequireScopes('admin')
@Controller('print-locations')
export class PrintLocationsController {
  constructor(private readonly service: PrintLocationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create print locations' })
  @ApiBody({ type: CreatePrintLocationDto })
  @ApiCreatedResponse({
    description: 'Print Locations created',
    schema: {
      example: {
        success: true,
        message: 'Print Locations created successfully',
        data: {
          id: '11111111-2222-3333-4444-555555555555',
          tenantId: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11',
          status: 'active',
        },
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-locations',
      },
    },
  })
  async create(@Body() dto: CreatePrintLocationDto, @Req() req: Request) {
    const data = await this.service.create(dto);
    return buildSuccessResponse(req.path, 'Print Locations created successfully', data);
  }

  @Get()
  @ApiOperation({ summary: 'List print locations' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 25 })
  @ApiQuery({ name: 'tenantId', required: false, example: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11' })
  @ApiQuery({ name: 'status', required: false, example: 'active' })
  @ApiOkResponse({
    description: 'Print Locations list',
    schema: {
      example: {
        success: true,
        message: 'Print Locations list retrieved successfully',
        data: [],
        meta: { page: 1, pageSize: 25 },
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-locations',
      },
    },
  })
  async findAll(@Query() filter: FilterPrintLocationDto, @Req() req: Request) {
    const data = await this.service.findAll(filter);
    return buildSuccessResponse(req.path, 'Print Locations list retrieved successfully', data, {
      page: filter.page,
      pageSize: filter.pageSize,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get print locations by id' })
  @ApiParam({ name: 'id', example: '11111111-2222-3333-4444-555555555555' })
  @ApiOkResponse({
    description: 'Print Locations detail',
    schema: {
      example: {
        success: true,
        message: 'Print Locations retrieved successfully',
        data: {
          id: '11111111-2222-3333-4444-555555555555',
          tenantId: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11',
          status: 'active',
        },
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-locations/11111111-2222-3333-4444-555555555555',
      },
    },
  })
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const data = await this.service.findOne(id);
    return buildSuccessResponse(req.path, 'Print Locations retrieved successfully', data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update print locations' })
  @ApiParam({ name: 'id', example: '11111111-2222-3333-4444-555555555555' })
  @ApiBody({ type: UpdatePrintLocationDto })
  @ApiOkResponse({
    description: 'Print Locations updated',
    schema: {
      example: {
        success: true,
        message: 'Print Locations updated successfully',
        data: {
          id: '11111111-2222-3333-4444-555555555555',
          tenantId: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11',
          status: 'active',
        },
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-locations/11111111-2222-3333-4444-555555555555',
      },
    },
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePrintLocationDto,
    @Req() req: Request,
  ) {
    const data = await this.service.update(id, dto);
    return buildSuccessResponse(req.path, 'Print Locations updated successfully', data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete print locations' })
  @ApiParam({ name: 'id', example: '11111111-2222-3333-4444-555555555555' })
  @ApiOkResponse({
    description: 'Print Locations deleted',
    schema: {
      example: {
        success: true,
        message: 'Print Locations deleted successfully',
        data: null,
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-locations/11111111-2222-3333-4444-555555555555',
      },
    },
  })
  async remove(@Param('id') id: string, @Req() req: Request) {
    await this.service.remove(id);
    return buildSuccessResponse(req.path, 'Print Locations deleted successfully', null);
  }
}
