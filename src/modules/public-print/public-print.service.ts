import { Injectable, NotFoundException } from '@nestjs/common';
import { $Enums } from '../../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service';
import { PrintJobsService } from '../print-jobs/print-jobs.service';
import { PublicSubmitPrintDto } from './dto/public-submit-print.dto';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class PublicPrintService {
  private static readonly TENANT_CACHE_TTL_SECONDS = 300;
  private static readonly PUBLIC_DEVICES_CACHE_TTL_SECONDS = 15;

  constructor(
    private readonly prisma: PrismaService,
    private readonly printJobsService: PrintJobsService,
    private readonly redis: RedisService,
  ) {}

  private getTenantCacheKey(tenantSlug: string): string {
    return `cache:tenant:slug:${tenantSlug}`;
  }

  private getPublicDevicesCacheKey(tenantId: string): string {
    return `cache:public:devices:tenant:${tenantId}`;
  }

  private async findActiveTenantBySlug(tenantSlug: string) {
    const cacheKey = this.getTenantCacheKey(tenantSlug);
    const cachedTenant = await this.redis.getJson<{
      id: string;
      slug: string;
      name?: string;
    }>(cacheKey);

    if (cachedTenant) {
      return cachedTenant;
    }

    const tenant = await this.prisma.client.tenant.findFirst({
      where: {
        slug: tenantSlug,
        status: $Enums.RecordStatus.active,
      },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    });

    if (!tenant) {
      return null;
    }

    await this.redis.setJson(
      cacheKey,
      tenant,
      PublicPrintService.TENANT_CACHE_TTL_SECONDS,
    );

    return tenant;
  }

  async listAvailableDevices(tenantSlug: string) {
    const normalizedSlug = tenantSlug.trim().toLowerCase();

    const tenant = await this.findActiveTenantBySlug(normalizedSlug);

    if (!tenant) {
      throw new NotFoundException('Tenant not found or inactive');
    }

    const devicesCacheKey = this.getPublicDevicesCacheKey(tenant.id);
    const cachedDevices = await this.redis.getJson<
      Array<{
        id: string;
        name: string;
        code: string;
        status: string;
        location: { id: string; name: string; code: string } | null;
      }>
    >(devicesCacheKey);

    const devices =
      cachedDevices ??
      (await this.prisma.client.printDevice.findMany({
        where: {
          tenantId: tenant.id,
          status: {
            in: [$Enums.PrintDeviceStatus.online, $Enums.PrintDeviceStatus.busy],
          },
        },
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          location: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      }));

    if (!cachedDevices) {
      await this.redis.setJson(
        devicesCacheKey,
        devices,
        PublicPrintService.PUBLIC_DEVICES_CACHE_TTL_SECONDS,
      );
    }

    return {
      tenant,
      devices,
    };
  }

  async submitPrint(dto: PublicSubmitPrintDto) {
    const tenantSlug = dto.tenantSlug.trim().toLowerCase();

    const tenant = await this.findActiveTenantBySlug(tenantSlug);

    if (!tenant) {
      throw new NotFoundException('Tenant not found or inactive');
    }

    const printer = dto.printerCode
      ? await this.prisma.client.printDevice.findFirst({
          where: {
            tenantId: tenant.id,
            code: dto.printerCode,
            status: {
              in: [
                $Enums.PrintDeviceStatus.online,
                $Enums.PrintDeviceStatus.busy,
              ],
            },
          },
          select: {
            id: true,
            code: true,
            locationId: true,
          },
        })
      : await this.prisma.client.printDevice.findFirst({
          where: {
            tenantId: tenant.id,
            status: {
              in: [
                $Enums.PrintDeviceStatus.online,
                $Enums.PrintDeviceStatus.busy,
              ],
            },
          },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            code: true,
            locationId: true,
          },
        });

    if (!printer) {
      throw new NotFoundException('No available printer for tenant');
    }

    const job = await this.printJobsService.create({
      tenantId: tenant.id,
      documentType: dto.documentType,
      format: dto.format,
      payload: dto.payload,
      requestId: dto.requestId,
      externalId: dto.externalId,
      contentHash: dto.contentHash,
      printerId: printer.id,
      printerCode: printer.code,
      locationId: printer.locationId ?? undefined,
      copies: dto.copies,
    });

    const dispatched = await this.printJobsService.dispatch(job.id);

    const dispatchPayload = {
      id: dispatched.id,
      tenantId: dispatched.tenantId,
      printerId: dispatched.printerId,
      documentType: dispatched.documentType,
      format: String(dispatched.format),
      copies: dispatched.copies,
      payload: dispatched.payload,
    };

    return {
      tenantSlug: tenant.slug,
      jobId: dispatched.id,
      status: dispatched.status,
      printer: {
        id: printer.id,
        code: printer.code,
      },
      dispatchPayload,
    };
  }
}
