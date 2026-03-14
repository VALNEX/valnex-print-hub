# Diccionario de tablas 1:1 con Prisma

Este documento esta alineado con el schema actual de Prisma y PostgreSQL multi-schema.

## Mapa de schemas en PostgreSQL

| Schema PostgreSQL | Modelos |
| --- | --- |
| platform | Tenant |
| catalog | PrintLocation, PrintDevice, PrintSource |
| ops | PrintRoutingRule, PrintJob, PrintJobLog |

## 1. tenants

- Prisma model: Tenant
- Tabla fisica: tenants
- Schema: platform

Proposito:
Entidad raiz multi-tenant. Identifica la empresa y su configuracion base.

Campos clave reales en schema:

- id
- name
- slug
- status
- apiKey
- webhookSecret
- createdAt

Relaciones:

- 1:N con PrintLocation, PrintDevice, PrintSource, PrintRoutingRule, PrintJob, PrintJobLog.

## 2. print_locations

- Prisma model: PrintLocation
- Tabla fisica: print_locations
- Schema: catalog

Proposito:
Puntos fisicos o logicos donde se generan o consumen impresiones.

Campos clave reales en schema:

- id
- tenantId
- name
- code
- status
- createdAt

Relaciones:

- N:1 con Tenant.
- 1:N con PrintDevice, PrintRoutingRule, PrintJob.

## 3. print_devices

- Prisma model: PrintDevice
- Tabla fisica: print_devices
- Schema: catalog

Proposito:
Inventario de dispositivos de impresion y su conectividad.

Campos clave reales en schema:

- id
- tenantId
- locationId
- name
- type
- brand
- model
- connectionType
- identifier
- status
- isDefault
- createdAt

Relaciones:

- N:1 con Tenant.
- N:1 opcional con PrintLocation.
- 1:N con PrintRoutingRule y PrintJob.

## 4. print_sources

- Prisma model: PrintSource
- Tabla fisica: print_sources
- Schema: catalog

Proposito:
Catalogo de origenes funcionales de impresion por tenant.

Campos clave reales en schema:

- id
- tenantId
- name
- code
- status

Relaciones:

- N:1 con Tenant.
- 1:N con PrintRoutingRule y PrintJob.

## 5. print_routing_rules

- Prisma model: PrintRoutingRule
- Tabla fisica: print_routing_rules
- Schema: ops

Proposito:
Reglas de enrutamiento para resolver impresora destino segun contexto.

Campos clave reales en schema:

- id
- tenantId
- sourceId
- locationId
- documentType
- printerId
- priority
- isActive

Campos operativos adicionales relevantes:

- format
- copies
- stopOnMatch
- conditions

Relaciones:

- N:1 con Tenant.
- N:1 opcional con PrintSource y PrintLocation.
- N:1 obligatoria con PrintDevice.

## 6. print_jobs

- Prisma model: PrintJob
- Tabla fisica: print_jobs
- Schema: ops

Proposito:
Registro central de cada solicitud de impresion, su ciclo de vida y su resultado.

Campos clave reales en schema:

- id
- tenantId
- locationId
- printerId
- sourceId
- documentType
- format
- priority
- status
- copies
- payload
- requestedAt
- processedAt
- errorMessage

Campos tecnicos adicionales relevantes:

- externalId
- requestId
- contentHash
- attempts
- maxRetries
- lastErrorCode
- bridgeNode

Estados reales en schema (PrintJobStatus):

- queued
- routing
- processing
- sent
- printed
- failed
- cancelled
- retrying

Relaciones:

- N:1 con Tenant.
- N:1 opcional con PrintLocation, PrintDevice y PrintSource.
- 1:N con PrintJobLog.

## 7. print_job_logs

- Prisma model: PrintJobLog
- Tabla fisica: print_job_logs
- Schema: ops

Proposito:
Auditoria de eventos del ciclo de vida de cada print job.

Campos clave reales en schema:

- id
- tenantId
- jobId
- event
- message
- createdAt

Campos tecnicos adicionales relevantes:

- level
- errorCode
- context

Eventos reales en schema (PrintLogEvent):

- received
- validated
- rejected
- queued
- routing_resolved
- routing_failed
- assigned_printer
- sent_to_queue
- sent_to_bridge
- sent_to_printer
- printed
- failed
- retried
- cancelled

Relaciones:

- N:1 con Tenant.
- N:1 con PrintJob.

## Resumen rapido de funcion

| Tabla fisica | Funcion principal |
| --- | --- |
| tenants | Define la empresa dueña de sus impresiones |
| print_locations | Separa sucursales o puntos fisicos |
| print_devices | Registra impresoras y dispositivos |
| print_sources | Identifica el modulo origen de impresion |
| print_routing_rules | Decide a que impresora va cada trabajo |
| print_jobs | Guarda y controla cada solicitud |
| print_job_logs | Audita todo el ciclo de vida del job |

## Equivalencia de nombres (texto funcional vs Prisma)

| Nombre funcional | Campo Prisma |
| --- | --- |
| tenant_id | tenantId |
| location_id | locationId |
| source_id | sourceId |
| printer_id | printerId |
| document_type | documentType |
| is_active | isActive |
| is_default | isDefault |
| api_key | apiKey |
| webhook_secret | webhookSecret |
| created_at | createdAt |
| requested_at | requestedAt |
| processed_at | processedAt |
| error_message | errorMessage |
