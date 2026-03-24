-- Rename enum to align with API key terminology
ALTER TYPE "platform"."DeviceCredentialStatus" RENAME TO "DeviceApiKeyStatus";

-- Rename table and related session foreign key column
ALTER TABLE "platform"."device_credentials" RENAME TO "device_api_keys";
ALTER TABLE "platform"."device_sessions" RENAME COLUMN "credentialId" TO "apiKeyId";

-- Rename primary and foreign key constraints on renamed table
ALTER TABLE "platform"."device_api_keys"
  RENAME CONSTRAINT "device_credentials_pkey" TO "device_api_keys_pkey";
ALTER TABLE "platform"."device_api_keys"
  RENAME CONSTRAINT "device_credentials_tenantId_fkey" TO "device_api_keys_tenantId_fkey";
ALTER TABLE "platform"."device_api_keys"
  RENAME CONSTRAINT "device_credentials_deviceId_fkey" TO "device_api_keys_deviceId_fkey";

-- Rename foreign key constraint on sessions table
ALTER TABLE "platform"."device_sessions"
  RENAME CONSTRAINT "device_sessions_credentialId_fkey" TO "device_sessions_apiKeyId_fkey";

-- Rename indexes to match the new names
ALTER INDEX "platform"."device_credentials_tenantId_idx"
  RENAME TO "device_api_keys_tenantId_idx";
ALTER INDEX "platform"."device_credentials_deviceId_idx"
  RENAME TO "device_api_keys_deviceId_idx";
ALTER INDEX "platform"."device_credentials_tenantId_status_idx"
  RENAME TO "device_api_keys_tenantId_status_idx";
ALTER INDEX "platform"."device_credentials_deviceId_status_idx"
  RENAME TO "device_api_keys_deviceId_status_idx";
ALTER INDEX "platform"."device_sessions_credentialId_idx"
  RENAME TO "device_sessions_apiKeyId_idx";
