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
import { PrintRoutingRulesService } from './print-routing-rules.service';
import { CreatePrintRoutingRuleDto } from './dto/create-print-routing-rules.dto';
import { UpdatePrintRoutingRuleDto } from './dto/update-print-routing-rules.dto';
import { FilterPrintRoutingRuleDto } from './dto/filter-print-routing-rules.dto';

@ApiTags('print-routing-rules')
@UseGuards(JwtAuthGuard)
@RequireScopes('admin')
@Controller('print-routing-rules')
export class PrintRoutingRulesController {
  constructor(private readonly service: PrintRoutingRulesService) {}

  @Post()
  @ApiOperation({ summary: 'Create print routing rules' })
  @ApiBody({ type: CreatePrintRoutingRuleDto })
  @ApiCreatedResponse({
    description: 'Print Routing Rules created',
    schema: {
      example: {
        success: true,
        message: 'Print Routing Rules created successfully',
        data: {
          id: '11111111-2222-3333-4444-555555555555',
          tenantId: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11',
          status: 'active',
        },
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-routing-rules',
      },
    },
  })
  async create(@Body() dto: CreatePrintRoutingRuleDto, @Req() req: Request) {
    const data = await this.service.create(dto);
    return buildSuccessResponse(req.path, 'Print Routing Rules created successfully', data);
  }

  @Get()
  @ApiOperation({ summary: 'List print routing rules' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 25 })
  @ApiQuery({ name: 'tenantId', required: false, example: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11' })
  @ApiQuery({ name: 'status', required: false, example: 'active' })
  @ApiOkResponse({
    description: 'Print Routing Rules list',
    schema: {
      example: {
        success: true,
        message: 'Print Routing Rules list retrieved successfully',
        data: [],
        meta: { page: 1, pageSize: 25 },
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-routing-rules',
      },
    },
  })
  async findAll(@Query() filter: FilterPrintRoutingRuleDto, @Req() req: Request) {
    const data = await this.service.findAll(filter);
    return buildSuccessResponse(req.path, 'Print Routing Rules list retrieved successfully', data, {
      page: filter.page,
      pageSize: filter.pageSize,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get print routing rules by id' })
  @ApiParam({ name: 'id', example: '11111111-2222-3333-4444-555555555555' })
  @ApiOkResponse({
    description: 'Print Routing Rules detail',
    schema: {
      example: {
        success: true,
        message: 'Print Routing Rules retrieved successfully',
        data: {
          id: '11111111-2222-3333-4444-555555555555',
          tenantId: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11',
          status: 'active',
        },
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-routing-rules/11111111-2222-3333-4444-555555555555',
      },
    },
  })
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const data = await this.service.findOne(id);
    return buildSuccessResponse(req.path, 'Print Routing Rules retrieved successfully', data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update print routing rules' })
  @ApiParam({ name: 'id', example: '11111111-2222-3333-4444-555555555555' })
  @ApiBody({ type: UpdatePrintRoutingRuleDto })
  @ApiOkResponse({
    description: 'Print Routing Rules updated',
    schema: {
      example: {
        success: true,
        message: 'Print Routing Rules updated successfully',
        data: {
          id: '11111111-2222-3333-4444-555555555555',
          tenantId: 'a1f4f8fe-1111-4444-8888-0f9b4d4c1a11',
          status: 'active',
        },
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-routing-rules/11111111-2222-3333-4444-555555555555',
      },
    },
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePrintRoutingRuleDto,
    @Req() req: Request,
  ) {
    const data = await this.service.update(id, dto);
    return buildSuccessResponse(req.path, 'Print Routing Rules updated successfully', data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete print routing rules' })
  @ApiParam({ name: 'id', example: '11111111-2222-3333-4444-555555555555' })
  @ApiOkResponse({
    description: 'Print Routing Rules deleted',
    schema: {
      example: {
        success: true,
        message: 'Print Routing Rules deleted successfully',
        data: null,
        timestamp: '2026-03-13T21:10:00.000Z',
        path: '/print-routing-rules/11111111-2222-3333-4444-555555555555',
      },
    },
  })
  async remove(@Param('id') id: string, @Req() req: Request) {
    await this.service.remove(id);
    return buildSuccessResponse(req.path, 'Print Routing Rules deleted successfully', null);
  }
}
