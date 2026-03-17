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
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenants.dto';
import { UpdateTenantDto } from './dto/update-tenants.dto';
import { FilterTenantDto } from './dto/filter-tenants.dto';

@ApiTags('tenants')
@UseGuards(JwtAuthGuard)
@RequireScopes('admin')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly service: TenantsService) {}

  @Post()
  @ApiOperation({ summary: 'Create tenants' })
  @ApiBody({ type: CreateTenantDto })
  @ApiCreatedResponse({
    description: 'Tenants created',
    schema: {
      example: {
        success: true,
        message: 'Tenants created successfully',
        data: {
          id: '11111111-2222-3333-4444-555555555555',
          slug: 'valnex',
          apiKey: 'vph_abc123def456ghi789',
          apiKeyOneTime: true,
          status: 'active',
        },
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/tenants',
      },
    },
  })
  async create(@Body() dto: CreateTenantDto, @Req() req: Request) {
    const data = await this.service.create(dto);
    return buildSuccessResponse(req.path, 'Tenants created successfully', data);
  }

  @Post(':id/rotate-api-key')
  @ApiOperation({ summary: 'Rotate tenant apiKey' })
  @ApiParam({ name: 'id', example: '11111111-2222-3333-4444-555555555555' })
  @ApiCreatedResponse({
    description: 'Tenant apiKey rotated',
    schema: {
      example: {
        success: true,
        message: 'Tenant apiKey rotated successfully',
        data: {
          id: '11111111-2222-3333-4444-555555555555',
          slug: 'valnex',
          apiKey: 'vph_newlyGeneratedOneTimeKey',
          apiKeyOneTime: true,
          rotatedAt: '2026-03-14T20:00:00.000Z',
          status: 'active',
        },
        timestamp: '2026-03-14T20:00:00.000Z',
        path: '/tenants/11111111-2222-3333-4444-555555555555/rotate-api-key',
      },
    },
  })
  async rotateApiKey(@Param('id') id: string, @Req() req: Request) {
    const data = await this.service.rotateApiKey(id);
    return buildSuccessResponse(req.path, 'Tenant apiKey rotated successfully', data);
  }

  @Get()
  @ApiOperation({ summary: 'List tenants' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 25 })
  @ApiQuery({ name: 'tenantId', required: false, example: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11' })
  @ApiQuery({ name: 'status', required: false, example: 'active' })
  @ApiOkResponse({
    description: 'Tenants list',
    schema: {
      example: {
        success: true,
        message: 'Tenants list retrieved successfully',
        data: [],
        meta: { page: 1, pageSize: 25 },
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/tenants',
      },
    },
  })
  async findAll(@Query() filter: FilterTenantDto, @Req() req: Request) {
    const data = await this.service.findAll(filter);
    return buildSuccessResponse(req.path, 'Tenants list retrieved successfully', data, {
      page: filter.page,
      pageSize: filter.pageSize,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenants by id' })
  @ApiParam({ name: 'id', example: '11111111-2222-3333-4444-555555555555' })
  @ApiOkResponse({
    description: 'Tenants detail',
    schema: {
      example: {
        success: true,
        message: 'Tenants retrieved successfully',
        data: {
          id: '11111111-2222-3333-4444-555555555555',
          tenantId: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11',
          status: 'active',
        },
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/tenants/11111111-2222-3333-4444-555555555555',
      },
    },
  })
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const data = await this.service.findOne(id);
    return buildSuccessResponse(req.path, 'Tenants retrieved successfully', data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update tenants' })
  @ApiParam({ name: 'id', example: '11111111-2222-3333-4444-555555555555' })
  @ApiBody({ type: UpdateTenantDto })
  @ApiOkResponse({
    description: 'Tenants updated',
    schema: {
      example: {
        success: true,
        message: 'Tenants updated successfully',
        data: {
          id: '11111111-2222-3333-4444-555555555555',
          tenantId: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11',
          status: 'active',
        },
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/tenants/11111111-2222-3333-4444-555555555555',
      },
    },
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
    @Req() req: Request,
  ) {
    const data = await this.service.update(id, dto);
    return buildSuccessResponse(req.path, 'Tenants updated successfully', data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete tenants' })
  @ApiParam({ name: 'id', example: '11111111-2222-3333-4444-555555555555' })
  @ApiOkResponse({
    description: 'Tenants deleted',
    schema: {
      example: {
        success: true,
        message: 'Tenants deleted successfully',
        data: null,
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/tenants/11111111-2222-3333-4444-555555555555',
      },
    },
  })
  async remove(@Param('id') id: string, @Req() req: Request) {
    await this.service.remove(id);
    return buildSuccessResponse(req.path, 'Tenants deleted successfully', null);
  }
}
