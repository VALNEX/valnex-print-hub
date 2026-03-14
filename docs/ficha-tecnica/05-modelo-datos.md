# 05 - Modelo de Datos (Prisma)

## Schemas PostgreSQL

- platform
- catalog
- ops

## Entidades principales

### Tenant (platform.tenants)

Define el contexto multi-tenant.

Campos clave:

- id
- name
- slug
- status
- metadata/settings

### PrintLocation (catalog.print_locations)

Ubicaciones de impresion por tenant.

Campos clave:

- tenantId
- name
- code
- status

### PrintDevice (catalog.print_devices)

Impresoras y sus capacidades.

Campos clave:

- tenantId
- locationId
- type
- connectionType
- identifier
- status

### PrintSource (catalog.print_sources)

Origen funcional que solicita impresion.

### PrintRoutingRule (ops.print_routing_rules)

Reglas de enrutamiento por documento y contexto.

Campos clave:

- tenantId
- sourceId/locationId opcionales
- printerId
- documentType
- format opcional
- priority
- isActive

### PrintJob (ops.print_jobs)

Trabajo de impresion, centro del flujo.

Campos clave:

- tenantId
- printerId/locationId/sourceId
- documentType
- format
- status
- payload/renderedPayload
- attempts/maxRetries
- errores y timestamps del ciclo de vida

Restricciones relevantes:

- unique (tenantId, externalId)
- unique (tenantId, requestId)

### PrintJobLog (ops.print_job_logs)

Bitacora de eventos por job.

Campos clave:

- tenantId
- jobId
- event
- level
- message
- errorCode
- context

## Enums mas usados

- RecordStatus
- PrintDeviceType
- PrintConnectionType
- PrintDeviceStatus
- PrintJobFormat
- PrintJobPriority
- PrintJobStatus
- PrintLogEvent

## Relaciones

- Tenant 1:N con locations, devices, sources, routingRules, jobs, jobLogs
- PrintJob N:1 con tenant y opcionalmente con location/printer/source
- PrintJobLog N:1 con PrintJob
