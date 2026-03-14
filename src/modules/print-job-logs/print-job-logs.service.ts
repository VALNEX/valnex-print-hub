import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrintJobLogDto } from './dto/create-print-job-logs.dto';
import { UpdatePrintJobLogDto } from './dto/update-print-job-logs.dto';
import { FilterPrintJobLogDto } from './dto/filter-print-job-logs.dto';
import { PrintEventsGateway } from '../realtime/print-events.gateway';
import { Prisma } from '../../../generated/prisma/client.js';

@Injectable()
export class PrintJobLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly printEventsGateway: PrintEventsGateway,
  ) {}

  async create(dto: CreatePrintJobLogDto) {
    const data: Prisma.PrintJobLogUncheckedCreateInput = { ...dto };
    const log = await this.prisma.client.printJobLog.create({
      data,
    });
    this.printEventsGateway.emitJobLogCreated({
      id: log.id,
      tenantId: log.tenantId,
      jobId: log.jobId,
      event: String(log.event),
    });

    return log;
  }

  findAll(filter: FilterPrintJobLogDto) {
    const { page = 1, pageSize = 25, tenantId } = filter;
    const skip = (page - 1) * pageSize;

    const where: Prisma.PrintJobLogWhereInput = {
      ...(tenantId ? { tenantId } : {}),
    };

    return this.prisma.client.printJobLog.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.client.printJobLog.findUnique({ where: { id } });
  }

  findOneForTenant(id: string, tenantId: string) {
    return this.prisma.client.printJobLog.findFirst({
      where: { id, tenantId },
    });
  }

  update(id: string, dto: UpdatePrintJobLogDto) {
    const data: Prisma.PrintJobLogUncheckedUpdateInput = { ...dto };
    return this.prisma.client.printJobLog.update({
      where: { id },
      data,
    });
  }

  async updateForTenant(id: string, tenantId: string, dto: UpdatePrintJobLogDto) {
    const current = await this.prisma.client.printJobLog.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!current) {
      throw new NotFoundException(`Print job log ${id} not found`);
    }

    const data: Prisma.PrintJobLogUncheckedUpdateInput = { ...dto };
    return this.prisma.client.printJobLog.update({
      where: { id: current.id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.client.printJobLog.delete({ where: { id } });
  }

  async removeForTenant(id: string, tenantId: string) {
    const current = await this.prisma.client.printJobLog.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!current) {
      throw new NotFoundException(`Print job log ${id} not found`);
    }

    return this.prisma.client.printJobLog.delete({ where: { id: current.id } });
  }
}