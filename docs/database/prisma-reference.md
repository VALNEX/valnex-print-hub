# Referencia tecnica de Prisma

## Schemas PostgreSQL configurados

- platform
- catalog
- ops

## Enums y valores reales

### RecordStatus (platform)

- active
- inactive
- suspended
- deleted

### PrintDeviceType (catalog)

- thermal
- label
- laser
- inkjet
- dot_matrix
- mobile
- virtual
- other

### PrintConnectionType (catalog)

- network
- bluetooth
- usb
- serial
- bridge
- cloud
- spooler
- other

### PrintDeviceStatus (catalog)

- online
- offline
- busy
- error
- paused
- unknown

### PrintJobFormat (ops)

- text
- escpos
- pdf
- image
- zpl
- raw
- html
- qrcode
- barcode

### PrintJobPriority (ops)

- low
- normal
- high
- critical

### PrintJobStatus (ops)

- queued
- routing
- processing
- sent
- printed
- failed
- cancelled
- retrying

### PrintLogEvent (ops)

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

## Modelos por schema

### platform

- Tenant -> tenants

### catalog

- PrintLocation -> print_locations
- PrintDevice -> print_devices
- PrintSource -> print_sources

### ops

- PrintRoutingRule -> print_routing_rules
- PrintJob -> print_jobs
- PrintJobLog -> print_job_logs
