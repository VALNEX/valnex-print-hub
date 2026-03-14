import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrintSourceDto } from './dto/create-print-sources.dto';
import { UpdatePrintSourceDto } from './dto/update-print-sources.dto';
import { FilterPrintSourceDto } from './dto/filter-print-sources.dto';
import { Prisma, $Enums } from '../../../generated/prisma/client.js';

@Injectable()
export class PrintSourcesService {
  constructor(private readonly prisma: PrismaService) {}

  private toRecordStatus(value?: string): $Enums.RecordStatus | undefined {
    if (!value) {
      return undefined;
    }
    return Object.values($Enums.RecordStatus).find((status) => status === value);
  }

  create(dto: CreatePrintSourceDto) {
    const data: Prisma.PrintSourceUncheckedCreateInput = { ...dto };
    return this.prisma.client.printSource.create({
      data,
    });
  }

  findAll(filter: FilterPrintSourceDto) {
    const { page = 1, pageSize = 25, tenantId, status } = filter;
    const skip = (page - 1) * pageSize;

    const parsedStatus = this.toRecordStatus(status);
    const where: Prisma.PrintSourceWhereInput = {
      ...(tenantId ? { tenantId } : {}),
      ...(parsedStatus ? { status: parsedStatus } : {}),
    };

    return this.prisma.client.printSource.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.client.printSource.findUnique({ where: { id } });
  }

  update(id: string, dto: UpdatePrintSourceDto) {
    const data: Prisma.PrintSourceUncheckedUpdateInput = { ...dto };
    return this.prisma.client.printSource.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.client.printSource.delete({ where: { id } });
  }
}