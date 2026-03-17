import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrintDeviceDto } from './dto/create-print-devices.dto';
import { UpdatePrintDeviceDto } from './dto/update-print-devices.dto';
import { FilterPrintDeviceDto } from './dto/filter-print-devices.dto';
import { PresentPrintDeviceDto } from './dto/present-print-device.dto';
import { Prisma, $Enums } from '../../../generated/prisma/client.js';

@Injectable()
export class PrintDevicesService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeCode(source: string): string {
    return source
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
  }

  private normalizeMacAddress(value: string): string {
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/[^a-f0-9]/g, '');

    if (normalized.length !== 12) {
      throw new BadRequestException('Invalid macAddress format');
    }

    return normalized.match(/.{1,2}/g)?.join(':') ?? normalized;
  }

  private toDeviceStatus(value?: string): $Enums.PrintDeviceStatus | undefined {
    if (!value) {
      return undefined;
    }
    return Object.values($Enums.PrintDeviceStatus).find(
      (status) => status === value,
    );
  }

  create(dto: CreatePrintDeviceDto) {
    const data: Prisma.PrintDeviceUncheckedCreateInput = { ...dto };
    return this.prisma.client.printDevice.create({
      data,
    });
  }

  findAll(filter: FilterPrintDeviceDto) {
    const { page = 1, pageSize = 25, tenantId, status, active } = filter;
    const skip = (page - 1) * pageSize;

    const parsedStatus = this.toDeviceStatus(status);
    const activeStatuses: $Enums.PrintDeviceStatus[] = [
      $Enums.PrintDeviceStatus.online,
      $Enums.PrintDeviceStatus.busy,
    ];
    const inactiveStatuses: $Enums.PrintDeviceStatus[] = [
      $Enums.PrintDeviceStatus.offline,
      $Enums.PrintDeviceStatus.paused,
      $Enums.PrintDeviceStatus.error,
      $Enums.PrintDeviceStatus.unknown,
    ];

    const statusesByActivity = active ? activeStatuses : inactiveStatuses;
    if (
      parsedStatus &&
      active !== undefined &&
      !statusesByActivity.includes(parsedStatus)
    ) {
      return [];
    }

    const statusWhere: Prisma.EnumPrintDeviceStatusFilter | $Enums.PrintDeviceStatus | undefined =
      parsedStatus ??
      (active !== undefined
        ? {
            in: statusesByActivity,
          }
        : undefined);

    const where: Prisma.PrintDeviceWhereInput = {
      ...(tenantId ? { tenantId } : {}),
      ...(statusWhere ? { status: statusWhere } : {}),
    };

    return this.prisma.client.printDevice.findMany({
      where,
      include: {
        location: {
          select: {
            id: true,
            tenantId: true,
            name: true,
            code: true,
            status: true,
          },
        },
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.client.printDevice.findUnique({
      where: { id },
      include: {
        location: {
          select: {
            id: true,
            tenantId: true,
            name: true,
            code: true,
            status: true,
          },
        },
      },
    });
  }

  findOneForTenant(id: string, tenantId: string) {
    return this.prisma.client.printDevice.findFirst({
      where: { id, tenantId },
      include: {
        location: {
          select: {
            id: true,
            tenantId: true,
            name: true,
            code: true,
            status: true,
          },
        },
      },
    });
  }

  update(id: string, dto: UpdatePrintDeviceDto) {
    const data: Prisma.PrintDeviceUncheckedUpdateInput = { ...dto };
    return this.prisma.client.printDevice.update({
      where: { id },
      data,
    });
  }

  async renameForTenant(id: string, tenantId: string, name: string) {
    const current = await this.prisma.client.printDevice.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!current) {
      throw new NotFoundException(`Print device ${id} not found`);
    }

    return this.prisma.client.printDevice.update({
      where: { id: current.id },
      data: { name },
    });
  }

  async presentForTenant(tenantId: string, dto: PresentPrintDeviceDto) {
    const identifier = dto.identifier.trim();
    if (!identifier) {
      throw new BadRequestException('identifier is required');
    }

    const normalizedMacAddress = this.normalizeMacAddress(dto.macAddress);

    let device = await this.prisma.client.printDevice.findFirst({
      where: {
        tenantId,
        macAddress: normalizedMacAddress,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        code: true,
        status: true,
      },
    });

    if (!device) {
      device = await this.prisma.client.printDevice.findFirst({
        where: {
          tenantId,
          identifier,
        },
        select: {
          id: true,
          tenantId: true,
          name: true,
          code: true,
          status: true,
        },
      });
    }

    if (!device) {
      const baseCode = this.normalizeCode(dto.code?.trim() || identifier);
      const uniqueCode = `${baseCode || 'device'}-${randomUUID().slice(0, 8)}`;

      device = await this.prisma.client.printDevice.create({
        data: {
          tenantId,
          name: dto.name.trim(),
          code: uniqueCode,
          type: dto.type ?? $Enums.PrintDeviceType.other,
          connectionType: dto.connectionType ?? $Enums.PrintConnectionType.bridge,
          identifier,
          macAddress: normalizedMacAddress,
          status: $Enums.PrintDeviceStatus.unknown,
        },
        select: {
          id: true,
          tenantId: true,
          name: true,
          code: true,
          status: true,
        },
      });
    }

    const preserveOnlineStatus =
      device.status === $Enums.PrintDeviceStatus.online ||
      device.status === $Enums.PrintDeviceStatus.busy;

    const refreshedDevice = await this.prisma.client.printDevice.update({
      where: { id: device.id },
      data: {
        identifier,
        macAddress: normalizedMacAddress,
        status: preserveOnlineStatus
          ? device.status
          : $Enums.PrintDeviceStatus.unknown,
        lastSeenAt: new Date(),
        statusReason: preserveOnlineStatus ? null : 'http_helper_present',
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        code: true,
        status: true,
      },
    });

    return {
      event: 'print.device.present.ok',
      tenantId,
      device: {
        id: refreshedDevice.id,
        name: refreshedDevice.name,
        code: refreshedDevice.code,
        status: refreshedDevice.status,
      },
    };
  }

  async updateForTenant(id: string, tenantId: string, dto: UpdatePrintDeviceDto) {
    const current = await this.prisma.client.printDevice.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!current) {
      throw new NotFoundException(`Print device ${id} not found`);
    }

    const data: Prisma.PrintDeviceUncheckedUpdateInput = { ...dto };
    return this.prisma.client.printDevice.update({
      where: { id: current.id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.client.printDevice.delete({ where: { id } });
  }

  async removeForTenant(id: string, tenantId: string) {
    const current = await this.prisma.client.printDevice.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!current) {
      throw new NotFoundException(`Print device ${id} not found`);
    }

    return this.prisma.client.printDevice.delete({ where: { id: current.id } });
  }
}