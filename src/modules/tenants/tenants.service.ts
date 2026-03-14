import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenants.dto';
import { UpdateTenantDto } from './dto/update-tenants.dto';
import { FilterTenantDto } from './dto/filter-tenants.dto';
import { Prisma, $Enums } from '../../../generated/prisma/client.js';
import { generateApiKey, hashApiKey } from '../../common/auth/api-key.util';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  private sanitizeTenant<T extends { apiKey?: string | null; webhookSecret?: string | null }>(
    tenant: T,
  ): Omit<T, 'apiKey' | 'webhookSecret'> {
    const { apiKey: _apiKey, webhookSecret: _webhookSecret, ...safeTenant } = tenant;
    return safeTenant;
  }

  private toRecordStatus(value?: string): $Enums.RecordStatus | undefined {
    if (!value) {
      return undefined;
    }
    return Object.values($Enums.RecordStatus).find((status) => status === value);
  }

  async create(dto: CreateTenantDto) {
    const plainApiKey = generateApiKey();
    const hashedApiKey = await hashApiKey(plainApiKey);

    const data: Prisma.TenantUncheckedCreateInput = {
      ...dto,
      apiKey: hashedApiKey,
    };

    const createdTenant = await this.prisma.client.tenant.create({
      data,
    });

    return {
      ...this.sanitizeTenant(createdTenant),
      apiKey: plainApiKey,
      apiKeyOneTime: true,
    };
  }

  async rotateApiKey(id: string) {
    const plainApiKey = generateApiKey();
    const hashedApiKey = await hashApiKey(plainApiKey);

    const updatedTenant = await this.prisma.client.tenant.update({
      where: { id },
      data: {
        apiKey: hashedApiKey,
      },
    });

    return {
      ...this.sanitizeTenant(updatedTenant),
      apiKey: plainApiKey,
      apiKeyOneTime: true,
      rotatedAt: new Date().toISOString(),
    };
  }

  async findAll(filter: FilterTenantDto) {
    const { page = 1, pageSize = 25, tenantId, status } = filter;
    const skip = (page - 1) * pageSize;

    const parsedStatus = this.toRecordStatus(status);
    const where: Prisma.TenantWhereInput = {
      ...(tenantId ? { tenantId } : {}),
      ...(parsedStatus ? { status: parsedStatus } : {}),
    };

    const tenants = await this.prisma.client.tenant.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    });

    return tenants.map((tenant) => this.sanitizeTenant(tenant));
  }

  async findOne(id: string) {
    const tenant = await this.prisma.client.tenant.findUnique({ where: { id } });
    return tenant ? this.sanitizeTenant(tenant) : null;
  }

  async update(id: string, dto: UpdateTenantDto) {
    const data: Prisma.TenantUncheckedUpdateInput = { ...dto };
    const updatedTenant = await this.prisma.client.tenant.update({
      where: { id },
      data,
    });

    return this.sanitizeTenant(updatedTenant);
  }

  remove(id: string) {
    return this.prisma.client.tenant.delete({ where: { id } });
  }
}