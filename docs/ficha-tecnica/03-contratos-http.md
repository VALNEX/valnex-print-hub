# 03 - Contratos HTTP

## Base URL

- Prefijo global: /api
- Swagger UI: /api/docs

## Envelope de respuesta

Todas las respuestas usan formato uniforme:

```json
{
  "success": true,
  "message": "texto",
  "data": {},
  "meta": { "page": 1, "pageSize": 25 },
  "timestamp": "2026-03-14T00:00:00.000Z",
  "path": "/api/recurso"
}
```

## Endpoints por modulo

### Tenants

- POST /api/tenants
- GET /api/tenants
- GET /api/tenants/:id
- PATCH /api/tenants/:id
- DELETE /api/tenants/:id

### Print Locations

- POST /api/print-locations
- GET /api/print-locations
- GET /api/print-locations/:id
- PATCH /api/print-locations/:id
- DELETE /api/print-locations/:id

### Print Devices

- POST /api/print-devices
- GET /api/print-devices
- GET /api/print-devices/:id
- PATCH /api/print-devices/:id
- DELETE /api/print-devices/:id

### Print Sources

- POST /api/print-sources
- GET /api/print-sources
- GET /api/print-sources/:id
- PATCH /api/print-sources/:id
- DELETE /api/print-sources/:id

### Print Routing Rules

- POST /api/print-routing-rules
- GET /api/print-routing-rules
- GET /api/print-routing-rules/:id
- PATCH /api/print-routing-rules/:id
- DELETE /api/print-routing-rules/:id

### Print Jobs

- POST /api/print-jobs
- GET /api/print-jobs
- GET /api/print-jobs/monitor
- GET /api/print-jobs/:id
- PATCH /api/print-jobs/:id
- POST /api/print-jobs/:id/dispatch
- DELETE /api/print-jobs/:id

### Print Job Logs

- POST /api/print-job-logs
- GET /api/print-job-logs
- GET /api/print-job-logs/:id
- PATCH /api/print-job-logs/:id
- DELETE /api/print-job-logs/:id

## Ejemplos clave

### Crear print job

```bash
curl -X POST http://localhost:3001/api/print-jobs \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "a1f4f8fe-1111-4444-8888-0f9b4d4c1a11",
    "documentType": "ticket",
    "format": "escpos",
    "payload": { "lines": ["Venta #1001", "Total: 250.00"] },
    "requestId": "REQ-1001",
    "contentHash": "sha256:abc123"
  }'
```

### Dispatch

```bash
curl -X POST http://localhost:3001/api/print-jobs/<jobId>/dispatch
```

### Monitor

```bash
curl "http://localhost:3001/api/print-jobs/monitor?tenantId=<tenantId>"
```

## Consideraciones de contrato

- Filtros paginados usan page y pageSize.
- status en print-jobs esta tipado con enum PrintJobStatus.
- DTOs usan whitelist + forbidNonWhitelisted por ValidationPipe global.
