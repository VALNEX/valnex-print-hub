import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrintLocationDto } from './dto/create-print-locations.dto';
import { UpdatePrintLocationDto } from './dto/update-print-locations.dto';
import { FilterPrintLocationDto } from './dto/filter-print-locations.dto';
import { Prisma, $Enums } from '../../../generated/prisma/client.js';

@Injectable()
export class PrintLocationsService {
  constructor(private readonly prisma: PrismaService) {}

  private toRecordStatus(value?: string): $Enums.RecordStatus | undefined {
    if (!value) {
      return undefined;
    }
    return Object.values($Enums.RecordStatus).find((status) => status === value);
  }

  create(dto: CreatePrintLocationDto) {
    const data: Prisma.PrintLocationUncheckedCreateInput = { ...dto };
    return this.prisma.client.printLocation.create({
      data,
    });
  }

  findAll(filter: FilterPrintLocationDto) {
    const { page = 1, pageSize = 25, tenantId, status } = filter;
    const skip = (page - 1) * pageSize;

    const parsedStatus = this.toRecordStatus(status);
    const where: Prisma.PrintLocationWhereInput = {
      ...(tenantId ? { tenantId } : {}),
      ...(parsedStatus ? { status: parsedStatus } : {}),
    };

    return this.prisma.client.printLocation.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.client.printLocation.findUnique({ where: { id } });
  }

  update(id: string, dto: UpdatePrintLocationDto) {
    const data: Prisma.PrintLocationUncheckedUpdateInput = { ...dto };
    return this.prisma.client.printLocation.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.client.printLocation.delete({ where: { id } });
  }
}