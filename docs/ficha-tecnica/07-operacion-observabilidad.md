# 07 - Operacion y Observabilidad

## Variables de entorno

Minimas:

- DATABASE_URL
- PORT

Opcionales del flujo:

- PRINT_ACK_TIMEOUT_MS (default 15000)
- PRINT_MONITOR_STALE_MS (default 60000)

## Arranque

```bash
pnpm install
pnpm build
pnpm run start
```

## Endpoints operativos

- GET /api
- GET /api/docs
- GET /api/print-jobs/monitor

## Uso de monitor

Respuesta incluye:

- staleMs
- summary por estado
- staleInFlight (sent/processing estancados)
- recentFailures

## Observabilidad recomendada

- Correlacionar logs por jobId y tenantId
- Medir latencias:
  - create -> dispatch
  - dispatch -> ack
  - ack -> result
- Alertas:
  - growth de failed
  - growth de retrying
  - staleInFlight > umbral

## Troubleshooting

### Puerto ocupado (EADDRINUSE)

En Windows:

```powershell
Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
```

### Verificar API

```powershell
try {
  $r = Invoke-WebRequest -Uri 'http://localhost:3001/api' -Method GET -TimeoutSec 8
  "STATUS=$($r.StatusCode)"
} catch {
  "ERROR=$($_.Exception.Message)"
}
```

### Verificar docs

```powershell
Invoke-WebRequest -Uri 'http://localhost:3001/api/docs' -Method GET
```

## Plan de evolucion operativa

- healthcheck dedicado con estado DB y gateway
- metricas Prometheus/OpenTelemetry
- dashboard por tenant/dispositivo
- trazabilidad distribuida de evento a evento
