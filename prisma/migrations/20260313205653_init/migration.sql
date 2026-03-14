-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('active', 'inactive', 'suspended', 'deleted');

-- CreateEnum
CREATE TYPE "PrintDeviceType" AS ENUM ('thermal', 'label', 'laser', 'inkjet', 'dot_matrix', 'mobile', 'virtual', 'other');

-- CreateEnum
CREATE TYPE "PrintConnectionType" AS ENUM ('network', 'bluetooth', 'usb', 'serial', 'bridge', 'cloud', 'spooler', 'other');

-- CreateEnum
CREATE TYPE "PrintDeviceStatus" AS ENUM ('online', 'offline', 'busy', 'error', 'paused', 'unknown');

-- CreateEnum
CREATE TYPE "PrintJobFormat" AS ENUM ('text', 'escpos', 'pdf', 'image', 'zpl', 'raw', 'html', 'qrcode', 'barcode');

-- CreateEnum
CREATE TYPE "PrintJobPriority" AS ENUM ('low', 'normal', 'high', 'critical');

-- CreateEnum
CREATE TYPE "PrintJobStatus" AS ENUM ('queued', 'routing', 'processing', 'sent', 'printed', 'failed', 'cancelled', 'retrying');

-- CreateEnum
CREATE TYPE "PrintLogEvent" AS ENUM ('received', 'validated', 'rejected', 'queued', 'routing_resolved', 'routing_failed', 'assigned_printer', 'sent_to_queue', 'sent_to_bridge', 'sent_to_printer', 'printed', 'failed', 'retried', 'cancelled');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "legalName" VARCHAR(200),
    "taxId" VARCHAR(50),
    "apiKey" VARCHAR(255),
    "webhookSecret" VARCHAR(255),
    "status" "RecordStatus" NOT NULL DEFAULT 'active',
    "timezone" VARCHAR(80),
    "currency" VARCHAR(10),
    "language" VARCHAR(10),
    "logoUrl" TEXT,
    "metadata" JSONB,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_locations" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "description" TEXT,
    "addressLine1" VARCHAR(150),
    "addressLine2" VARCHAR(150),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "country" VARCHAR(100),
    "postalCode" VARCHAR(20),
    "status" "RecordStatus" NOT NULL DEFAULT 'active',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "print_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_devices" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "locationId" UUID,
    "name" VARCHAR(150) NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "description" TEXT,
    "type" "PrintDeviceType" NOT NULL,
    "brand" VARCHAR(100),
    "model" VARCHAR(100),
    "connectionType" "PrintConnectionType" NOT NULL,
    "identifier" VARCHAR(255) NOT NULL,
    "host" VARCHAR(255),
    "port" INTEGER,
    "macAddress" VARCHAR(50),
    "deviceSerial" VARCHAR(100),
    "driverName" VARCHAR(100),
    "paperWidthMm" INTEGER,
    "dpi" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "acceptsRaw" BOOLEAN NOT NULL DEFAULT false,
    "acceptsEscpos" BOOLEAN NOT NULL DEFAULT false,
    "acceptsZpl" BOOLEAN NOT NULL DEFAULT false,
    "acceptsPdf" BOOLEAN NOT NULL DEFAULT false,
    "acceptsImage" BOOLEAN NOT NULL DEFAULT false,
    "status" "PrintDeviceStatus" NOT NULL DEFAULT 'unknown',
    "lastSeenAt" TIMESTAMP(3),
    "metadata" JSONB,
    "settings" JSONB,
    "statusReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "print_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_sources" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "description" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'active',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "print_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_routing_rules" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "sourceId" UUID,
    "locationId" UUID,
    "printerId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "documentType" VARCHAR(100) NOT NULL,
    "format" "PrintJobFormat",
    "priority" INTEGER NOT NULL DEFAULT 100,
    "copies" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stopOnMatch" BOOLEAN NOT NULL DEFAULT true,
    "conditions" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "print_routing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_jobs" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "locationId" UUID,
    "printerId" UUID,
    "sourceId" UUID,
    "routingRuleId" UUID,
    "externalId" VARCHAR(120),
    "requestId" VARCHAR(120),
    "documentType" VARCHAR(100) NOT NULL,
    "format" "PrintJobFormat" NOT NULL,
    "priority" "PrintJobPriority" NOT NULL DEFAULT 'normal',
    "status" "PrintJobStatus" NOT NULL DEFAULT 'queued',
    "copies" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "renderedPayload" JSONB,
    "contentHash" VARCHAR(128),
    "printerCode" VARCHAR(80),
    "locationCode" VARCHAR(80),
    "sourceCode" VARCHAR(80),
    "requestedBy" VARCHAR(150),
    "requestedByUserId" UUID,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "queuedAt" TIMESTAMP(3),
    "processingAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 0,
    "lastErrorCode" VARCHAR(80),
    "errorMessage" TEXT,
    "bridgeNode" VARCHAR(120),
    "ipAddress" VARCHAR(80),
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "print_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_job_logs" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "event" "PrintLogEvent" NOT NULL,
    "level" VARCHAR(20),
    "message" TEXT,
    "errorCode" VARCHAR(80),
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "print_job_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_apiKey_key" ON "tenants"("apiKey");

-- CreateIndex
CREATE INDEX "tenants_status_idx" ON "tenants"("status");

-- CreateIndex
CREATE INDEX "tenants_createdAt_idx" ON "tenants"("createdAt");

-- CreateIndex
CREATE INDEX "print_locations_tenantId_idx" ON "print_locations"("tenantId");

-- CreateIndex
CREATE INDEX "print_locations_tenantId_status_idx" ON "print_locations"("tenantId", "status");

-- CreateIndex
CREATE INDEX "print_locations_tenantId_name_idx" ON "print_locations"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "print_locations_tenantId_code_key" ON "print_locations"("tenantId", "code");

-- CreateIndex
CREATE INDEX "print_devices_tenantId_idx" ON "print_devices"("tenantId");

-- CreateIndex
CREATE INDEX "print_devices_tenantId_locationId_idx" ON "print_devices"("tenantId", "locationId");

-- CreateIndex
CREATE INDEX "print_devices_tenantId_status_idx" ON "print_devices"("tenantId", "status");

-- CreateIndex
CREATE INDEX "print_devices_tenantId_isDefault_idx" ON "print_devices"("tenantId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "print_devices_tenantId_code_key" ON "print_devices"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "print_devices_tenantId_identifier_key" ON "print_devices"("tenantId", "identifier");

-- CreateIndex
CREATE INDEX "print_sources_tenantId_idx" ON "print_sources"("tenantId");

-- CreateIndex
CREATE INDEX "print_sources_tenantId_status_idx" ON "print_sources"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "print_sources_tenantId_code_key" ON "print_sources"("tenantId", "code");

-- CreateIndex
CREATE INDEX "print_routing_rules_tenantId_idx" ON "print_routing_rules"("tenantId");

-- CreateIndex
CREATE INDEX "print_routing_rules_tenantId_isActive_idx" ON "print_routing_rules"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "print_routing_rules_tenantId_documentType_idx" ON "print_routing_rules"("tenantId", "documentType");

-- CreateIndex
CREATE INDEX "print_routing_rules_tenantId_sourceId_locationId_documentTy_idx" ON "print_routing_rules"("tenantId", "sourceId", "locationId", "documentType", "isActive");

-- CreateIndex
CREATE INDEX "print_routing_rules_tenantId_priority_idx" ON "print_routing_rules"("tenantId", "priority");

-- CreateIndex
CREATE INDEX "print_jobs_tenantId_idx" ON "print_jobs"("tenantId");

-- CreateIndex
CREATE INDEX "print_jobs_tenantId_status_idx" ON "print_jobs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "print_jobs_tenantId_priority_status_idx" ON "print_jobs"("tenantId", "priority", "status");

-- CreateIndex
CREATE INDEX "print_jobs_tenantId_sourceId_status_idx" ON "print_jobs"("tenantId", "sourceId", "status");

-- CreateIndex
CREATE INDEX "print_jobs_tenantId_locationId_status_idx" ON "print_jobs"("tenantId", "locationId", "status");

-- CreateIndex
CREATE INDEX "print_jobs_tenantId_printerId_status_idx" ON "print_jobs"("tenantId", "printerId", "status");

-- CreateIndex
CREATE INDEX "print_jobs_tenantId_requestedAt_idx" ON "print_jobs"("tenantId", "requestedAt");

-- CreateIndex
CREATE INDEX "print_jobs_tenantId_documentType_idx" ON "print_jobs"("tenantId", "documentType");

-- CreateIndex
CREATE UNIQUE INDEX "uq_print_jobs_tenant_external_id" ON "print_jobs"("tenantId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_print_jobs_tenant_request_id" ON "print_jobs"("tenantId", "requestId");

-- CreateIndex
CREATE INDEX "print_job_logs_tenantId_idx" ON "print_job_logs"("tenantId");

-- CreateIndex
CREATE INDEX "print_job_logs_jobId_idx" ON "print_job_logs"("jobId");

-- CreateIndex
CREATE INDEX "print_job_logs_tenantId_event_idx" ON "print_job_logs"("tenantId", "event");

-- CreateIndex
CREATE INDEX "print_job_logs_tenantId_createdAt_idx" ON "print_job_logs"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "print_locations" ADD CONSTRAINT "print_locations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_devices" ADD CONSTRAINT "print_devices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_devices" ADD CONSTRAINT "print_devices_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "print_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_sources" ADD CONSTRAINT "print_sources_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_routing_rules" ADD CONSTRAINT "print_routing_rules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_routing_rules" ADD CONSTRAINT "print_routing_rules_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "print_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_routing_rules" ADD CONSTRAINT "print_routing_rules_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "print_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_routing_rules" ADD CONSTRAINT "print_routing_rules_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "print_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "print_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "print_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "print_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_job_logs" ADD CONSTRAINT "print_job_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_job_logs" ADD CONSTRAINT "print_job_logs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "print_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
