# 04 - Contratos WebSocket

## Configuracion

- Namespace: /print
- Transporte: Socket.IO
- CORS: origin true, credentials true

## Autenticacion WS (obligatoria)

Antes de usar subscribe, ack, result o canales de actividad, el cliente impresor debe autenticarse.

Autenticacion actual:

1. Hacer login HTTP en `POST /api/auth/printer/login`.
2. Tomar `accessToken` del login.
3. Conectar al namespace `/print` enviando el token en handshake:

```json
{
  "auth": {
    "token": "<jwt>"
  }
}
```

Si no esta autenticado, el servidor responde:

```json
{
  "event": "print.auth.required",
  "reason": "login_required"
}
```

## Rooms

El cliente se puede suscribir a uno o varios rooms:

- tenant:{tenantId}
- device:{deviceId}
- job:{jobId}

## Evento de entrada: subscribe

Payload:

```json
{
  "tenantId": "a1f4f8fe-1111-4444-8888-0f9b4d4c1a11",
  "deviceId": "b1f4f8fe-1111-4444-8888-0f9b4d4c1b11",
  "jobId": "c1f4f8fe-1111-4444-8888-0f9b4d4c1c11"
}
```

Respuesta:

```json
{
  "event": "subscribed",
  "rooms": ["tenant:...", "device:...", "job:..."]
}
```

## Evento de entrada: print.device.present

El cliente reporta su identidad de dispositivo despues del handshake JWT.
El backend asigna o recupera `deviceId` y lo enlaza a la sesion.

Payload:

```json
{
  "identifier": "WPF-FRONT-01",
  "name": "Front Desk Printer",
  "code": "front-desk",
  "locationId": "optional-location-id",
  "type": "thermal",
  "connectionType": "bridge"
}
```

Respuesta:

```json
{
  "event": "print.device.present.ok",
  "tenantId": "<tenantId>",
  "device": {
    "id": "<deviceId>",
    "name": "Front Desk Printer",
    "code": "front-desk-1234abcd",
    "status": "unknown"
  }
}
```

Evento adicional emitido por servidor al cliente autenticado:

- `print.device.presented`

## Eventos de salida del servidor

### print.job.created

Se emite al crear un trabajo.

Payload base:

```json
{
  "id": "<jobId>",
  "tenantId": "<tenantId>",
  "printerId": "<printerId|null>"
}
```

### print.job.dispatch

Se emite en dispatch.

- al room de device con payload completo
- al room de tenant con payload resumido
- al room de job con payload completo

Payload completo:

```json
{
  "id": "<jobId>",
  "tenantId": "<tenantId>",
  "printerId": "<printerId>",
  "documentType": "ticket",
  "format": "escpos",
  "copies": 1,
  "payload": { "lines": ["..."] }
}
```

### print.job.updated

Se emite cuando cambia estado del job.

### print.job.log.created

Se emite cuando se crea un log asociado al job.

## Eventos de entrada al servidor

### print.job.ack

Payload:

```json
{
  "jobId": "<jobId>",
  "tenantId": "<tenantId>",
  "deviceId": "<deviceId>",
  "message": "recibido"
}
```

Comportamiento:

- valida existencia del job
- valida tenant contra sesion autenticada
- solo acepta estado sent
- mueve a processing y registra log validated

### print.job.result

Payload:

```json
{
  "jobId": "<jobId>",
  "tenantId": "<tenantId>",
  "deviceId": "<deviceId>",
  "status": "success",
  "code": "PRN_OK",
  "message": "impresion completada",
  "raw": { "latencyMs": 120 }
}
```

Reglas:

- evita duplicados
- evita estado immutable (cancelled)
- permite solo sent, processing, retrying
- valida tenant contra sesion autenticada

Resultado:

- success/warning -> printed
- error -> failed
- crea log + emite updated/log.created

## Secuencia sugerida cliente impresor

1. conectar a /print
2. enviar token JWT en handshake
3. emitir print.device.present para obtener/recuperar deviceId
4. emitir subscribe con deviceId/jobId
5. escuchar print.job.dispatch
6. enviar print.job.ack inmediato
7. ejecutar impresion local
8. enviar print.job.result final

## Canal de dispositivos activos por cliente

Evento de entrada:

- print.devices.active.report

Payload:

```json
{
  "deviceIds": ["device-1", "device-2"]
}
```

Broadcast de actualizacion por tenant:

- print.devices.active.updated

Consulta de snapshot:

- evento de entrada: print.devices.active.get
- respuesta: print.devices.active.snapshot
