# Diccionario de Tablas

## platform.tenants

- Proposito: entidad dueña de recursos multi-tenant.
- Claves: `id`, `slug`, `status`.

## platform.admin_users

- Proposito: administradores del sistema.
- Claves: `email`, `passwordHash`, `status`.

## platform.device_activation_requests

- Proposito: solicitudes one-time de activacion de cliente.
- Claves: `activationCodeHash`, `status`, `expiresAt`, `approvedByAdminId`.

## platform.device_api_keys

- Proposito: API keys persistentes por dispositivo.
- Claves: `secretHash`, `status`, `revokedAt`, `expiresAt`.

## platform.device_sessions

- Proposito: sesiones refresh por dispositivo.
- Claves: `refreshTokenHash`, `expiresAt`, `revokedAt`.

## catalog.print_locations

- Proposito: ubicaciones de impresion por tenant.

## catalog.print_devices

- Proposito: impresoras/dispositivos operativos.
- Claves: `tenantId + code`, `tenantId + identifier`, `status`.

## catalog.print_sources

- Proposito: origen funcional de solicitudes de impresion.

## ops.print_routing_rules

- Proposito: reglas para resolver impresora de destino.

## ops.print_jobs

- Proposito: jobs de impresion y su ciclo de vida.

## ops.print_job_logs

- Proposito: bitacora de eventos por job.