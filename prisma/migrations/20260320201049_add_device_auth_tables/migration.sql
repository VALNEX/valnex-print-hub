-- CreateEnum
CREATE TYPE "platform"."DeviceActivationStatus" AS ENUM ('pending', 'approved', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "platform"."DeviceCredentialStatus" AS ENUM ('active', 'revoked', 'expired');

-- CreateTable
CREATE TABLE "platform"."device_activation_requests" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "activationCodeHash" VARCHAR(128) NOT NULL,
    "status" "platform"."DeviceActivationStatus" NOT NULL DEFAULT 'pending',
    "requestedIdentifier" VARCHAR(255) NOT NULL,
    "requestedMacAddress" VARCHAR(50),
    "requestedName" VARCHAR(150),
    "requestedByIp" VARCHAR(80),
    "requestedByUserAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "approvedByAdminId" UUID,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_activation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."device_credentials" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "secretHash" VARCHAR(128) NOT NULL,
    "status" "platform"."DeviceCredentialStatus" NOT NULL DEFAULT 'active',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."device_sessions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "credentialId" UUID,
    "refreshTokenHash" VARCHAR(128) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "ipAddress" VARCHAR(80),
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "device_activation_requests_tenantId_idx" ON "platform"."device_activation_requests"("tenantId");

-- CreateIndex
CREATE INDEX "device_activation_requests_deviceId_idx" ON "platform"."device_activation_requests"("deviceId");

-- CreateIndex
CREATE INDEX "device_activation_requests_tenantId_status_idx" ON "platform"."device_activation_requests"("tenantId", "status");

-- CreateIndex
CREATE INDEX "device_activation_requests_deviceId_status_idx" ON "platform"."device_activation_requests"("deviceId", "status");

-- CreateIndex
CREATE INDEX "device_activation_requests_expiresAt_idx" ON "platform"."device_activation_requests"("expiresAt");

-- CreateIndex
CREATE INDEX "device_credentials_tenantId_idx" ON "platform"."device_credentials"("tenantId");

-- CreateIndex
CREATE INDEX "device_credentials_deviceId_idx" ON "platform"."device_credentials"("deviceId");

-- CreateIndex
CREATE INDEX "device_credentials_tenantId_status_idx" ON "platform"."device_credentials"("tenantId", "status");

-- CreateIndex
CREATE INDEX "device_credentials_deviceId_status_idx" ON "platform"."device_credentials"("deviceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "device_sessions_refreshTokenHash_key" ON "platform"."device_sessions"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "device_sessions_tenantId_idx" ON "platform"."device_sessions"("tenantId");

-- CreateIndex
CREATE INDEX "device_sessions_deviceId_idx" ON "platform"."device_sessions"("deviceId");

-- CreateIndex
CREATE INDEX "device_sessions_credentialId_idx" ON "platform"."device_sessions"("credentialId");

-- CreateIndex
CREATE INDEX "device_sessions_tenantId_deviceId_idx" ON "platform"."device_sessions"("tenantId", "deviceId");

-- CreateIndex
CREATE INDEX "device_sessions_expiresAt_idx" ON "platform"."device_sessions"("expiresAt");

-- AddForeignKey
ALTER TABLE "platform"."device_activation_requests" ADD CONSTRAINT "device_activation_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "platform"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."device_activation_requests" ADD CONSTRAINT "device_activation_requests_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "catalog"."print_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."device_activation_requests" ADD CONSTRAINT "device_activation_requests_approvedByAdminId_fkey" FOREIGN KEY ("approvedByAdminId") REFERENCES "platform"."admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."device_credentials" ADD CONSTRAINT "device_credentials_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "platform"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."device_credentials" ADD CONSTRAINT "device_credentials_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "catalog"."print_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."device_sessions" ADD CONSTRAINT "device_sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "platform"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."device_sessions" ADD CONSTRAINT "device_sessions_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "catalog"."print_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."device_sessions" ADD CONSTRAINT "device_sessions_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "platform"."device_credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
