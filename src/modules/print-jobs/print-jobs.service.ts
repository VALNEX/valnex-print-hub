import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrintJobDto } from './dto/create-print-jobs.dto';
import { UpdatePrintJobDto } from './dto/update-print-jobs.dto';
import { FilterPrintJobDto } from './dto/filter-print-jobs.dto';
import { PrintEventsGateway } from '../realtime/print-events.gateway';
import { Prisma, $Enums } from '../../../generated/prisma/client.js';

@Injectable()
export class PrintJobsService {
  private readonly logger = new Logger(PrintJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly printEventsGateway: PrintEventsGateway,
  ) {}

  private static readonly IDEMPOTENT_ACTIVE_STATUSES = [
    $Enums.PrintJobStatus.queued,
    $Enums.PrintJobStatus.routing,
    $Enums.PrintJobStatus.sent,
    $Enums.PrintJobStatus.processing,
    $Enums.PrintJobStatus.printed,
  ];

  private toJobStatus(value?: string): $Enums.PrintJobStatus | undefined {
    if (!value) {
      return undefined;
    }

    return Object.values($Enums.PrintJobStatus).find((status) => status === value);
  }

  private getAckTimeoutMs(): number {
    const value = Number(process.env.PRINT_ACK_TIMEOUT_MS ?? 15000);
    return Number.isFinite(value) && value > 0 ? value : 15000;
  }

  private getMonitorStaleMs(): number {
    const value = Number(process.env.PRINT_MONITOR_STALE_MS ?? 60000);
    return Number.isFinite(value) && value > 0 ? value : 60000;
  }

  private async findDuplicateJob(dto: CreatePrintJobDto) {
    const payload = dto;
    const tenantId = payload.tenantId;

    if (!tenantId) {
      return null;
    }

    if (payload.requestId) {
      const duplicate = await this.prisma.client.printJob.findFirst({
        where: {
          tenantId,
          requestId: payload.requestId,
        },
      });
      if (duplicate) {
        return duplicate;
      }
    }

    if (payload.externalId) {
      const duplicate = await this.prisma.client.printJob.findFirst({
        where: {
          tenantId,
          externalId: payload.externalId,
        },
      });
      if (duplicate) {
        return duplicate;
      }
    }

    if (payload.contentHash) {
      const duplicate = await this.prisma.client.printJob.findFirst({
        where: {
          tenantId,
          contentHash: payload.contentHash,
          status: {
            in: PrintJobsService.IDEMPOTENT_ACTIVE_STATUSES,
          },
        },
      });
      if (duplicate) {
        return duplicate;
      }
    }

    return null;
  }

  private scheduleAckTimeout(jobId: string): void {
    const timeoutMs = this.getAckTimeoutMs();

    setTimeout(() => {
      void this.handleAckTimeout(jobId, timeoutMs);
    }, timeoutMs);
  }

  private async handleAckTimeout(jobId: string, timeoutMs: number): Promise<void> {
    try {
      const currentJob = await this.prisma.client.printJob.findUnique({
        where: { id: jobId },
      });

      if (!currentJob || String(currentJob.status) !== 'sent') {
        return;
      }

      const canRetry = currentJob.attempts <= currentJob.maxRetries;
      const nextStatus = canRetry ? 'retrying' : 'failed';

      const updatedJob = await this.prisma.client.printJob.update({
        where: { id: currentJob.id },
        data: {
          status: nextStatus,
          ...(canRetry
            ? {}
            : {
                processedAt: new Date(),
                lastErrorCode: 'ACK_TIMEOUT',
                errorMessage: `No ACK received in ${timeoutMs}ms`,
              }),
        },
      });

      const log = await this.prisma.client.printJobLog.create({
        data: {
          tenantId: updatedJob.tenantId,
          jobId: updatedJob.id,
          event: canRetry ? 'retried' : 'failed',
          level: canRetry ? 'warn' : 'error',
          errorCode: 'ACK_TIMEOUT',
          message: canRetry
            ? `ACK timeout (${timeoutMs}ms). Job moved to retrying.`
            : `ACK timeout (${timeoutMs}ms). Job marked as failed.`,
        },
      });

      this.printEventsGateway.emitJobUpdated({
        id: updatedJob.id,
        tenantId: updatedJob.tenantId,
        printerId: updatedJob.printerId,
        status: String(updatedJob.status),
      });

      this.printEventsGateway.emitJobLogCreated({
        id: log.id,
        tenantId: log.tenantId,
        jobId: log.jobId,
        event: String(log.event),
      });
    } catch (error) {
      this.logger.error(
        `ACK timeout handler failed for job ${jobId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async create(dto: CreatePrintJobDto) {
    const duplicate = await this.findDuplicateJob(dto);
    if (duplicate) {
      return duplicate;
    }

    const data: Prisma.PrintJobUncheckedCreateInput = { ...dto };
    const job = await this.prisma.client.printJob.create({
      data,
    });
    this.printEventsGateway.emitJobCreated({
      id: job.id,
      tenantId: job.tenantId,
      printerId: job.printerId,
    });

    return job;
  }

  findAll(filter: FilterPrintJobDto) {
    const { page = 1, pageSize = 25, tenantId, status } = filter;
    const skip = (page - 1) * pageSize;
    const parsedStatus = this.toJobStatus(status);

    const where: Prisma.PrintJobWhereInput = {
      ...(tenantId ? { tenantId } : {}),
      ...(parsedStatus ? { status: parsedStatus } : {}),
    };

    return this.prisma.client.printJob.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.client.printJob.findUnique({ where: { id } });
  }

  findOneForTenant(id: string, tenantId: string) {
    return this.prisma.client.printJob.findFirst({
      where: { id, tenantId },
    });
  }

  async update(id: string, dto: UpdatePrintJobDto) {
    const data: Prisma.PrintJobUncheckedUpdateInput = { ...dto };
    const job = await this.prisma.client.printJob.update({
      where: { id },
      data,
    });

    this.printEventsGateway.emitJobUpdated({
      id: job.id,
      tenantId: job.tenantId,
      printerId: job.printerId,
      status: String(job.status),
    });

    return job;
  }

  async updateForTenant(id: string, tenantId: string, dto: UpdatePrintJobDto) {
    const current = await this.prisma.client.printJob.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!current) {
      throw new NotFoundException(`Print job ${id} not found`);
    }

    const data: Prisma.PrintJobUncheckedUpdateInput = { ...dto };
    const job = await this.prisma.client.printJob.update({
      where: { id: current.id },
      data,
    });

    this.printEventsGateway.emitJobUpdated({
      id: job.id,
      tenantId: job.tenantId,
      printerId: job.printerId,
      status: String(job.status),
    });

    return job;
  }

  async dispatch(id: string) {
    const currentJob = await this.prisma.client.printJob.findUnique({
      where: { id },
    });

    if (!currentJob) {
      throw new NotFoundException(`Print job ${id} not found`);
    }

    const currentStatus = String(currentJob.status);
    if (['sent', 'processing', 'printed'].includes(currentStatus)) {
      return currentJob;
    }

    if (!currentJob.printerId) {
      throw new BadRequestException(
        `Print job ${id} cannot be dispatched without an assigned printer`,
      );
    }

    const job = await this.prisma.client.printJob.update({
      where: { id },
      data: {
        status: 'sent',
        sentAt: new Date(),
        attempts: {
          increment: 1,
        },
      },
    });

    await this.prisma.client.printJobLog.create({
      data: {
        tenantId: job.tenantId,
        jobId: job.id,
        event: 'sent_to_printer',
        level: 'info',
        message: 'Job dispatched to print device channel',
      },
    });

    this.printEventsGateway.emitJobDispatch({
      id: job.id,
      tenantId: job.tenantId,
      printerId: job.printerId,
      documentType: job.documentType,
      format: String(job.format),
      copies: job.copies,
      payload: job.payload,
    });

    this.printEventsGateway.emitJobUpdated({
      id: job.id,
      tenantId: job.tenantId,
      printerId: job.printerId,
      status: String(job.status),
    });

    this.scheduleAckTimeout(job.id);

    return job;
  }

  async dispatchForTenant(id: string, tenantId: string) {
    const current = await this.prisma.client.printJob.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!current) {
      throw new NotFoundException(`Print job ${id} not found`);
    }

    return this.dispatch(current.id);
  }

  async getMonitor(tenantId?: string) {
    const whereBase: Prisma.PrintJobWhereInput = tenantId ? { tenantId } : {};
    const staleMs = this.getMonitorStaleMs();
    const staleDate = new Date(Date.now() - staleMs);

    const [
      total,
      queued,
      routing,
      sent,
      processing,
      retrying,
      printed,
      failed,
      cancelled,
      staleInFlight,
      recentFailures,
    ] = await Promise.all([
      this.prisma.client.printJob.count({ where: whereBase }),
      this.prisma.client.printJob.count({
        where: { ...whereBase, status: 'queued' },
      }),
      this.prisma.client.printJob.count({
        where: { ...whereBase, status: 'routing' },
      }),
      this.prisma.client.printJob.count({
        where: { ...whereBase, status: 'sent' },
      }),
      this.prisma.client.printJob.count({
        where: { ...whereBase, status: 'processing' },
      }),
      this.prisma.client.printJob.count({
        where: { ...whereBase, status: 'retrying' },
      }),
      this.prisma.client.printJob.count({
        where: { ...whereBase, status: 'printed' },
      }),
      this.prisma.client.printJob.count({
        where: { ...whereBase, status: 'failed' },
      }),
      this.prisma.client.printJob.count({
        where: { ...whereBase, status: 'cancelled' },
      }),
      this.prisma.client.printJob.findMany({
        where: {
          ...whereBase,
          status: {
            in: ['sent', 'processing'],
          },
          sentAt: { lt: staleDate },
          processedAt: null,
        },
        select: {
          id: true,
          tenantId: true,
          printerId: true,
          status: true,
          sentAt: true,
          attempts: true,
          maxRetries: true,
        },
        orderBy: { sentAt: 'asc' },
        take: 20,
      }),
      this.prisma.client.printJob.findMany({
        where: {
          ...whereBase,
          status: 'failed',
        },
        select: {
          id: true,
          tenantId: true,
          printerId: true,
          lastErrorCode: true,
          errorMessage: true,
          processedAt: true,
          attempts: true,
          maxRetries: true,
        },
        orderBy: { processedAt: 'desc' },
        take: 20,
      }),
    ]);

    return {
      staleMs,
      summary: {
        total,
        queued,
        routing,
        sent,
        processing,
        retrying,
        printed,
        failed,
        cancelled,
      },
      staleInFlight,
      recentFailures,
    };
  }

  remove(id: string) {
    return this.prisma.client.printJob.delete({ where: { id } });
  }

  async removeForTenant(id: string, tenantId: string) {
    const current = await this.prisma.client.printJob.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!current) {
      throw new NotFoundException(`Print job ${id} not found`);
    }

    return this.prisma.client.printJob.delete({ where: { id: current.id } });
  }
}