import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { Server, Socket } from 'socket.io';
import { AuthTokenPayload } from '../../common/auth/auth.types';
import { TokenRevocationService } from '../../common/auth/token-revocation.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, $Enums } from '../../../generated/prisma/client.js';

type SubscriptionPayload = {
  tenantId?: string;
  deviceId?: string;
  jobId?: string;
};

type PrintJobAckPayload = {
  jobId: string;
  tenantId?: string;
  deviceId?: string;
  message?: string;
};

type PrintJobResultPayload = {
  jobId: string;
  tenantId?: string;
  deviceId?: string;
  status: 'success' | 'warning' | 'error';
  code?: string;
  message?: string;
  raw?: Prisma.InputJsonValue | null;
};

type ActiveDevicesReportPayload = {
  tenantId?: string;
  deviceIds: string[];
};

type DevicePresentPayload = {
  identifier: string;
  name?: string;
  code?: string;
  macAddress?: string;
  locationId?: string;
  type?: $Enums.PrintDeviceType;
  connectionType?: $Enums.PrintConnectionType;
};

@WebSocketGateway({
  namespace: 'print',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class PrintEventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(PrintEventsGateway.name);
  private readonly socketAuthById = new Map<
    string,
    AuthTokenPayload & { authenticatedAt: string }
  >();
  private readonly activeDevicesBySocket = new Map<
    string,
    { tenantId: string; deviceIds: string[]; reportedAt: string }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly tokenRevocationService: TokenRevocationService,
  ) {}

  private emitToRooms(
    event: string,
    payload: Record<string, unknown>,
    target: { tenantId?: string | null; printerId?: string | null; jobId: string },
  ): void {
    if (target.tenantId) {
      this.server.to(`tenant:${target.tenantId}`).emit(event, payload);
    }
    if (target.printerId) {
      this.server.to(`device:${target.printerId}`).emit(event, payload);
    }
    this.server.to(`job:${target.jobId}`).emit(event, payload);
  }

  @WebSocketServer()
  server!: Server;

  private extractHandshakeToken(client: Socket): string | null {
    const auth = client.handshake.auth as { token?: string } | undefined;
    const authToken = auth?.token?.trim();
    if (authToken) {
      return authToken;
    }

    const rawHeader = client.handshake.headers?.authorization;
    const header = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    if (!header) {
      return null;
    }

    const [type, token] = header.split(' ');
    if (type?.toLowerCase() !== 'bearer' || !token) {
      return null;
    }

    return token;
  }

  private getSocketAuth(client: Socket) {
    return this.socketAuthById.get(client.id);
  }

  private requireSocketAuth(client: Socket) {
    const auth = this.getSocketAuth(client);
    if (!auth) {
      return {
        event: 'print.auth.required',
        reason: 'login_required',
      };
    }

    const now = Math.floor(Date.now() / 1000);
    if (auth.exp && now >= auth.exp) {
      this.socketAuthById.delete(client.id);
      client.disconnect(true);
      return {
        event: 'print.auth.required',
        reason: 'session_expired',
      };
    }

    if (this.tokenRevocationService.isRevoked(auth.jti)) {
      this.socketAuthById.delete(client.id);
      client.disconnect(true);
      return {
        event: 'print.auth.required',
        reason: 'token_revoked',
      };
    }

    return auth;
  }

  async handleConnection(client: Socket) {
    const token = this.extractHandshakeToken(client);
    if (!token) {
      this.logger.warn(`Socket ${client.id} rejected: missing auth token`);
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthTokenPayload>(token);
      if (payload.scope !== 'printer-client') {
        this.logger.warn(`Socket ${client.id} rejected: invalid scope`);
        client.disconnect(true);
        return;
      }
      if (this.tokenRevocationService.isRevoked(payload.jti)) {
        this.logger.warn(`Socket ${client.id} rejected: revoked token`);
        client.disconnect(true);
        return;
      }

      const authenticatedAt = new Date().toISOString();
      this.socketAuthById.set(client.id, {
        ...payload,
        authenticatedAt,
      });

      await client.join(`tenant:${payload.tenantId}`);
      if (payload.deviceId) {
        await client.join(`device:${payload.deviceId}`);
      }

      this.logger.debug(
        `Client connected/authenticated: ${client.id} tenant=${payload.tenantId}`,
      );
    } catch {
      this.logger.warn(`Socket ${client.id} rejected: invalid/expired token`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const report = this.activeDevicesBySocket.get(client.id);
    const auth = this.socketAuthById.get(client.id);
    const tenantId = report?.tenantId ?? auth?.tenantId;

    const disconnectedDeviceIds = new Set<string>();
    if (auth?.deviceId) {
      disconnectedDeviceIds.add(auth.deviceId);
    }
    if (report?.deviceIds?.length) {
      report.deviceIds.forEach((deviceId) => disconnectedDeviceIds.add(deviceId));
    }
    client.rooms.forEach((room) => {
      if (room.startsWith('device:')) {
        const roomDeviceId = room.slice('device:'.length);
        if (roomDeviceId) {
          disconnectedDeviceIds.add(roomDeviceId);
        }
      }
    });

    if (report) {
      this.server
        .to(`tenant:${report.tenantId}`)
        .emit('print.devices.active.updated', {
          socketId: client.id,
          tenantId: report.tenantId,
          deviceIds: [],
          reportedAt: new Date().toISOString(),
          disconnected: true,
        });
    }

    this.activeDevicesBySocket.delete(client.id);
    this.socketAuthById.delete(client.id);

    if (tenantId && disconnectedDeviceIds.size > 0) {
      const stillActiveDeviceIds = new Set<string>();
      this.activeDevicesBySocket.forEach((activeReport) => {
        if (activeReport.tenantId !== tenantId) {
          return;
        }
        activeReport.deviceIds.forEach((deviceId) => stillActiveDeviceIds.add(deviceId));
      });

      const offlineDeviceIds = Array.from(disconnectedDeviceIds).filter(
        (deviceId) => !stillActiveDeviceIds.has(deviceId),
      );

      if (offlineDeviceIds.length > 0) {
        try {
          const result = await this.prisma.client.printDevice.updateMany({
            where: {
              tenantId,
              id: { in: offlineDeviceIds },
              status: {
                in: [$Enums.PrintDeviceStatus.online, $Enums.PrintDeviceStatus.busy],
              },
            },
            data: {
              status: $Enums.PrintDeviceStatus.offline,
              statusReason: 'ws_disconnected',
            },
          });

          this.logger.debug(
            `WS disconnect status sync: socket=${client.id} tenant=${tenantId} offlineCandidates=${offlineDeviceIds.join(',')} updated=${result.count}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to mark devices offline on disconnect for socket ${client.id}`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      } else {
        this.logger.debug(
          `WS disconnect status sync skipped: socket=${client.id} tenant=${tenantId} no_offline_candidates`,
        );
      }
    } else {
      this.logger.debug(
        `WS disconnect status sync skipped: socket=${client.id} tenant=${tenantId ?? 'n/a'} no_device_ids`,
      );
    }

    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  private buildActiveDevicesSnapshot(tenantId: string) {
    const reports: Array<{
      socketId: string;
      tenantId: string;
      deviceIds: string[];
      reportedAt: string;
    }> = [];

    this.activeDevicesBySocket.forEach((report, socketId) => {
      if (report.tenantId === tenantId) {
        reports.push({
          socketId,
          tenantId: report.tenantId,
          deviceIds: report.deviceIds,
          reportedAt: report.reportedAt,
        });
      }
    });

    return reports;
  }

  private normalizeCode(source: string): string {
    return source
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
  }

  private normalizeMacAddress(value?: string): string | null {
    if (!value) {
      return null;
    }

    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/[^a-f0-9]/g, '');

    if (normalized.length !== 12) {
      return null;
    }

    return normalized.match(/.{1,2}/g)?.join(':') ?? null;
  }

  @SubscribeMessage('print.device.present')
  async handleDevicePresent(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: DevicePresentPayload,
  ) {
    const auth = this.requireSocketAuth(client);
    if ('event' in auth) {
      return auth;
    }

    const identifier = payload.identifier?.trim();
    if (!identifier) {
      return {
        event: 'print.device.present.failed',
        reason: 'identifier_required',
      };
    }

    const normalizedMacAddress = this.normalizeMacAddress(payload.macAddress);

    let device = normalizedMacAddress
      ? await this.prisma.client.printDevice.findFirst({
          where: {
            tenantId: auth.tenantId,
            macAddress: normalizedMacAddress,
          },
          select: {
            id: true,
            tenantId: true,
            name: true,
            code: true,
            status: true,
            macAddress: true,
          },
        })
      : null;

    if (!device) {
      device = await this.prisma.client.printDevice.findFirst({
        where: {
          tenantId: auth.tenantId,
          identifier,
        },
        select: {
          id: true,
          tenantId: true,
          name: true,
          code: true,
          status: true,
          macAddress: true,
        },
      });
    }

    if (!device) {
      const baseCode = this.normalizeCode(payload.code?.trim() || identifier);
      const uniqueCode = `${baseCode || 'device'}-${randomUUID().slice(0, 8)}`;

      device = await this.prisma.client.printDevice.create({
        data: {
          tenantId: auth.tenantId,
          locationId: payload.locationId,
          name: payload.name?.trim() || `Printer ${identifier.slice(-6)}`,
          code: uniqueCode,
          type: payload.type ?? $Enums.PrintDeviceType.other,
          connectionType: payload.connectionType ?? $Enums.PrintConnectionType.bridge,
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
          macAddress: true,
        },
      });
    } else if (!device.macAddress && normalizedMacAddress) {
      await this.prisma.client.printDevice.update({
        where: { id: device.id },
        data: { macAddress: normalizedMacAddress },
      });

      device = {
        ...device,
        macAddress: normalizedMacAddress,
      };
    }

    const refreshedDevice = await this.prisma.client.printDevice.update({
      where: { id: device.id },
      data: {
        status: $Enums.PrintDeviceStatus.online,
        lastSeenAt: new Date(),
        statusReason: null,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        code: true,
        status: true,
      },
    });

    this.socketAuthById.set(client.id, {
      ...auth,
      deviceId: refreshedDevice.id,
    });

    await client.join(`device:${refreshedDevice.id}`);

    const presentedPayload = {
      event: 'print.device.present.ok',
      tenantId: auth.tenantId,
      device: {
        id: refreshedDevice.id,
        name: refreshedDevice.name,
        code: refreshedDevice.code,
        status: refreshedDevice.status,
      },
    };

    this.server.to(client.id).emit('print.device.presented', presentedPayload);

    return presentedPayload;
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubscriptionPayload,
  ) {
    const auth = this.requireSocketAuth(client);
    if ('event' in auth) {
      return auth;
    }

    const rooms: string[] = [];

    rooms.push(`tenant:${auth.tenantId}`);

    if (payload.tenantId && payload.tenantId !== auth.tenantId) {
      return {
        event: 'subscribe.ignored',
        reason: 'tenant_mismatch',
      };
    }

    if (payload.deviceId) {
      if (auth.deviceId && payload.deviceId !== auth.deviceId) {
        return {
          event: 'subscribe.ignored',
          reason: 'device_mismatch',
        };
      }
      rooms.push(`device:${payload.deviceId}`);
    } else if (auth.deviceId) {
      rooms.push(`device:${auth.deviceId}`);
    }
    if (payload.jobId) {
      rooms.push(`job:${payload.jobId}`);
    }

    await Promise.all(rooms.map((room) => client.join(room)));

    return {
      event: 'subscribed',
      rooms,
    };
  }

  @SubscribeMessage('print.auth.login')
  handlePrinterAuthLoginDeprecated() {
    return {
      event: 'print.auth.login.deprecated',
      reason: 'use_http_login_and_ws_handshake_token',
    };
  }

  @SubscribeMessage('print.auth.logout')
  async handlePrinterLogout(@ConnectedSocket() client: Socket) {
    const auth = this.requireSocketAuth(client);
    if ('event' in auth) {
      return auth;
    }

    this.tokenRevocationService.revoke(auth.jti, auth.exp);
    this.socketAuthById.delete(client.id);
    this.activeDevicesBySocket.delete(client.id);
    setTimeout(() => client.disconnect(true), 0);

    return {
      event: 'print.auth.logout.ok',
      revokedAt: new Date().toISOString(),
    };
  }

  @SubscribeMessage('print.job.ack')
  async handlePrintJobAck(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: PrintJobAckPayload,
  ) {
    const auth = this.requireSocketAuth(client);
    if ('event' in auth) {
      return auth;
    }

    const currentJob = await this.prisma.client.printJob.findUnique({
      where: { id: payload.jobId },
    });

    if (!currentJob) {
      return {
        event: 'print.job.ack.ignored',
        reason: 'job_not_found',
        jobId: payload.jobId,
      };
    }

    if (
      payload.tenantId &&
      payload.tenantId !== auth.tenantId
    ) {
      return {
        event: 'print.job.ack.ignored',
        reason: 'tenant_mismatch',
        jobId: payload.jobId,
      };
    }

    if (currentJob.tenantId !== auth.tenantId) {
      return {
        event: 'print.job.ack.ignored',
        reason: 'tenant_mismatch',
        jobId: payload.jobId,
      };
    }

    if (String(currentJob.status) !== 'sent') {
      return {
        event: 'print.job.ack.ignored',
        reason: 'duplicate_or_invalid_state',
        jobId: payload.jobId,
        currentStatus: currentJob.status,
      };
    }

    const job = await this.prisma.client.printJob.update({
      where: { id: payload.jobId },
      data: {
        status: 'processing',
        processingAt: new Date(),
      },
    });

    const log = await this.prisma.client.printJobLog.create({
      data: {
        tenantId: auth.tenantId,
        jobId: payload.jobId,
        event: 'validated',
        level: 'info',
        message:
          payload.message ?? 'Client acknowledged print job reception',
        context: {
          socketId: client.id,
          deviceId: payload.deviceId,
        },
      },
    });

    this.emitJobUpdated({
      id: job.id,
      tenantId: job.tenantId,
      printerId: job.printerId,
      status: String(job.status),
    });

    this.emitJobLogCreated({
      id: log.id,
      tenantId: log.tenantId,
      jobId: log.jobId,
      event: String(log.event),
    });

    return {
      event: 'print.job.ack.received',
      jobId: payload.jobId,
      status: job.status,
    };
  }

  @SubscribeMessage('print.job.result')
  async handlePrintJobResult(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: PrintJobResultPayload,
  ) {
    const auth = this.requireSocketAuth(client);
    if ('event' in auth) {
      return auth;
    }

    const currentJob = await this.prisma.client.printJob.findUnique({
      where: { id: payload.jobId },
    });

    if (!currentJob) {
      return {
        event: 'print.job.result.ignored',
        reason: 'job_not_found',
        jobId: payload.jobId,
      };
    }

    if (
      payload.tenantId &&
      payload.tenantId !== auth.tenantId
    ) {
      return {
        event: 'print.job.result.ignored',
        reason: 'tenant_mismatch',
        jobId: payload.jobId,
      };
    }

    if (currentJob.tenantId !== auth.tenantId) {
      return {
        event: 'print.job.result.ignored',
        reason: 'tenant_mismatch',
        jobId: payload.jobId,
      };
    }

    const currentStatus = String(currentJob.status);
    const duplicateSuccess =
      currentStatus === 'printed' && payload.status !== 'error';
    const duplicateError = currentStatus === 'failed' && payload.status === 'error';
    const immutableState = ['cancelled'].includes(currentStatus);
    const allowedStatesForResult = ['sent', 'processing', 'retrying'];
    const invalidTransition = !allowedStatesForResult.includes(currentStatus);

    if (duplicateSuccess || duplicateError || immutableState || invalidTransition) {
      return {
        event: 'print.job.result.ignored',
        reason: invalidTransition
          ? 'invalid_state_transition'
          : 'duplicate_or_immutable_state',
        jobId: payload.jobId,
        currentStatus: currentJob.status,
      };
    }

    const isError = payload.status === 'error';
    const status = isError ? 'failed' : 'printed';

    const job = await this.prisma.client.printJob.update({
      where: { id: payload.jobId },
      data: {
        status,
        processedAt: new Date(),
        ...(isError
          ? {
              lastErrorCode: payload.code,
              errorMessage: payload.message,
            }
          : {}),
      },
    });

    const log = await this.prisma.client.printJobLog.create({
      data: {
        tenantId: auth.tenantId,
        jobId: payload.jobId,
        event: isError ? 'failed' : 'printed',
        level:
          payload.status === 'warning'
            ? 'warn'
            : isError
              ? 'error'
              : 'info',
        message:
          payload.message ??
          (isError ? 'Print job failed at client' : 'Print job completed'),
        errorCode: payload.code,
        context: {
          socketId: client.id,
          deviceId: payload.deviceId,
          resultStatus: payload.status,
          raw: payload.raw,
        },
      },
    });

    this.emitJobUpdated({
      id: job.id,
      tenantId: job.tenantId,
      printerId: job.printerId,
      status: String(job.status),
    });

    this.emitJobLogCreated({
      id: log.id,
      tenantId: log.tenantId,
      jobId: log.jobId,
      event: String(log.event),
    });

    return {
      event: 'print.job.result.received',
      jobId: payload.jobId,
      status: job.status,
    };
  }

  @SubscribeMessage('print.devices.active.report')
  async handleActiveDevicesReport(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ActiveDevicesReportPayload,
  ) {
    const auth = this.requireSocketAuth(client);
    if ('event' in auth) {
      return auth;
    }

    if (payload.tenantId && payload.tenantId !== auth.tenantId) {
      return {
        event: 'print.devices.active.report.ignored',
        reason: 'tenant_mismatch',
      };
    }

    const requestedDeviceIds = (payload.deviceIds ?? []).filter((value) => Boolean(value));
    const effectiveDeviceIds =
      requestedDeviceIds.length > 0
        ? requestedDeviceIds
        : auth.deviceId
          ? [auth.deviceId]
          : [];

    const uniqueDeviceIds = Array.from(new Set(effectiveDeviceIds));

    const reportedAt = new Date().toISOString();
    this.activeDevicesBySocket.set(client.id, {
      tenantId: auth.tenantId,
      deviceIds: uniqueDeviceIds,
      reportedAt,
    });

    const updatePayload = {
      socketId: client.id,
      tenantId: auth.tenantId,
      deviceIds: uniqueDeviceIds,
      reportedAt,
    };

    this.server
      .to(`tenant:${auth.tenantId}`)
      .emit('print.devices.active.updated', updatePayload);

    return {
      event: 'print.devices.active.reported',
      ...updatePayload,
    };
  }

  @SubscribeMessage('print.devices.active.get')
  async handleActiveDevicesSnapshot(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { tenantId?: string },
  ) {
    const auth = this.requireSocketAuth(client);
    if ('event' in auth) {
      return auth;
    }

    if (payload.tenantId && payload.tenantId !== auth.tenantId) {
      return {
        event: 'print.devices.active.get.ignored',
        reason: 'tenant_mismatch',
      };
    }

    const snapshot = this.buildActiveDevicesSnapshot(auth.tenantId);
    return {
      event: 'print.devices.active.snapshot',
      tenantId: auth.tenantId,
      clients: snapshot,
    };
  }

  emitJobCreated(job: {
    id: string;
    tenantId?: string | null;
    printerId?: string | null;
  }) {
    this.emitToRooms('print.job.created', job, {
      tenantId: job.tenantId,
      printerId: job.printerId,
      jobId: job.id,
    });
  }

  emitJobUpdated(job: {
    id: string;
    tenantId?: string | null;
    printerId?: string | null;
    status?: string | null;
  }) {
    this.emitToRooms('print.job.updated', job, {
      tenantId: job.tenantId,
      printerId: job.printerId,
      jobId: job.id,
    });
  }

  emitJobLogCreated(log: {
    id: string;
    tenantId: string;
    jobId: string;
    event: string;
  }) {
    this.emitToRooms('print.job.log.created', log, {
      tenantId: log.tenantId,
      jobId: log.jobId,
    });
  }

  emitJobDispatch(job: {
    id: string;
    tenantId?: string | null;
    printerId?: string | null;
    documentType?: string | null;
    format?: string | null;
    copies?: number | null;
    payload?: unknown;
  }) {
    if (job.printerId) {
      this.server.to(`device:${job.printerId}`).emit('print.job.dispatch', job);
    }
    if (job.tenantId) {
      this.server.to(`tenant:${job.tenantId}`).emit('print.job.dispatch', {
        id: job.id,
        printerId: job.printerId,
        documentType: job.documentType,
      });
    }
    this.server.to(`job:${job.id}`).emit('print.job.dispatch', job);
  }
}
