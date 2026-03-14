# 08 - Pruebas y Checklist

## Objetivo

Validar que el flujo de impresion funciona extremo a extremo con transiciones correctas y resiliencia basica.

## Pruebas manuales recomendadas

### 1) Smoke API

- GET /api -> 200
- GET /api/docs -> 200
- GET /api/print-jobs/monitor -> 200

### 2) CRUD base

- Crear tenant
- Crear location
- Crear device
- Crear source
- Crear routing rule

### 3) Flujo job feliz

1. Crear print job
2. Dispatch
3. Cliente WS envia ACK
4. Cliente WS envia result success
5. Verificar job status = printed
6. Verificar logs (validated, printed)

### 4) Flujo con error

1. Crear y dispatch
2. ACK
3. result error con code/message
4. Verificar status = failed
5. Verificar lastErrorCode/errorMessage

### 5) Timeout ACK

1. Crear y dispatch
2. No enviar ACK
3. Esperar PRINT_ACK_TIMEOUT_MS
4. Verificar retrying o failed segun attempts/maxRetries

### 6) Idempotencia

- Repetir create con mismo requestId
- Repetir create con mismo externalId
- Repetir create con mismo contentHash en estado activo
- Verificar que no se duplique impresion

### 7) Transiciones invalidas

- Enviar result para job queued
- Esperar response ignored con invalid_state_transition

## Casos de regresion

- Dispatch sin printerId debe devolver 400
- ACK con tenant incorrecto debe ignored
- Result duplicado no debe mutar estado

## Checklist de salida

- Build OK
- Tests OK
- Monitor endpoint operativo
- Flujo WS validado con cliente real o script
- No any y sin casts inseguros
- Swagger alineado a enums y estados reales

## Script base para cliente WS (pseudo)

```text
connect('/print')
emit('subscribe', { tenantId, deviceId })
on('print.job.dispatch', (job) => {
  emit('print.job.ack', { jobId: job.id, tenantId, deviceId })
  // imprimir fisicamente
  emit('print.job.result', {
    jobId: job.id,
    tenantId,
    deviceId,
    status: 'success',
    message: 'printed'
  })
})
```
