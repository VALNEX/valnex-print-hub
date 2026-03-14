import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrintDeviceDto } from './dto/create-print-devices.dto';
import { UpdatePrintDeviceDto } from './dto/update-print-devices.dto';
import { FilterPrintDeviceDto } from './dto/filter-print-devices.dto';
import { Prisma, $Enums } from '../../../generated/prisma/client.js';

@Injectable()
export class PrintDevicesService {
  constructor(private readonly prisma: PrismaService) {}

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