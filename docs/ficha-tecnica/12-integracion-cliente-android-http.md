# 12 - Integracion Cliente Android (Presentacion HTTP)

## Objetivo

Definir el flujo correcto para un cliente Android que se identifica por HTTP (`/api/print-devices/present`) y aclarar cuando aplica activacion, listado de dispositivos y submit de jobs.

## Aclaracion de Roles (hueco comun)

Hay 2 roles distintos y usan endpoints distintos:

1. Cliente impresora (Android/WPF) autenticado con `printer-client`.
2. Emisor de impresiones (POS/ERP/app publica) por API publica.

No son el mismo contrato.

## Matriz de Endpoints por Rol

### Cliente Impresora Android (requiere activacion y token)

1. `POST /api/auth/device/activation/request` (publico)
2. `POST /api/auth/device/activation/approve` (admin)
3. `POST /api/auth/device/token` (publico)
4. `POST /api/auth/device/refresh` (publico)
5. `POST /api/auth/device/logout` (publico)
6. `POST /api/print-devices/present` (requiere Bearer con scope `printer-client`)
7. `PATCH /api/print-devices/{id}/rename` (scope `printer-client`, mismo tenant)

### Emisor Publico (no requiere activacion de dispositivo)

1. `GET /api/public/print/devices?tenantSlug={slug}`
2. `POST /api/public/print/submit`

### Admin (backoffice)

1. `POST /api/print-jobs`
2. `GET /api/print-jobs`
3. `POST /api/print-jobs/{id}/dispatch`

`/api/print-jobs/*` esta protegido con scope `admin`; el token de impresora no sirve para crear jobs por este contrato.

## Flujo Completo Android por HTTP

## Paso 1 - Solicitar Activacion

`POST /api/auth/device/activation/request`

```json
{
  "tenantSlug": "valnex",
  "identifier": "ANDROID-PIXEL-7-01",
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "name": "Impresora Movil Patio Norte",
  "code": "mobile-patio-norte",
  "type": "thermal",
  "connectionType": "bluetooth"
}
```

Guardar de respuesta:

1. `data.activationRequestId`
2. `data.activationCode`
3. `data.expiresAt`

## Paso 2 - Aprobacion Admin

`POST /api/auth/device/activation/approve`

```json
{
  "activationCode": "Q7K9M2PJ"
}
```

Guardar de respuesta:

1. `data.apiKey.id` -> `apiKeyId`
2. `data.apiKey.key` -> `apiKey`

## Paso 3 - Intercambiar API key por Tokens

`POST /api/auth/device/token`

```json
{
  "apiKey": "dapi_33333333-4444-5555-6666-777777777777.Lzv0R7i8SxB9Y6mD3Qk2_8Pp1n4Ew5u7Rr0Tt2Qq9Lk"
}
```

Guardar de respuesta:

1. `data.accessToken`
2. `data.refreshToken`
3. `data.tenantId`
4. `data.deviceId`

## Paso 4 - Presentarse por HTTP (helper)

`POST /api/print-devices/present`

Headers:

1. `Authorization: Bearer <accessToken>`

Request JSON:

```json
{
  "identifier": "ANDROID-PIXEL-7-01",
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "name": "Impresora Movil Patio Norte",
  "code": "mobile-patio-norte",
  "type": "thermal",
  "connectionType": "bluetooth"
}
```

Respuesta relevante:

```json
{
  "success": true,
  "data": {
    "event": "print.device.present.ok",
    "tenantId": "3eb1ab23-ce33-4b8a-9efd-db75b8b6242e",
    "device": {
      "id": "659531b9-c2ed-427b-afa8-ccbd99d34f09",
      "name": "Laptop Victor",
      "code": "epson-tm-t20iii-receipt-4a06238b",
      "status": "unknown"
    }
  }
}
```

Importante:

1. Este endpoint resuelve identidad/nombre y actualiza `lastSeenAt`.
2. No deja el dispositivo `online` por si solo.
3. Para estado operativo `online/offline`, usar presentacion WebSocket (`/print`).

## Paso 5 - Mantener Sesion

Refresh antes de expirar el access token:

`POST /api/auth/device/refresh`

```json
{
  "refreshToken": "<refresh_token_actual>"
}
```

Regla critica:

1. El refresh token rota en cada refresh.
2. Reemplazar el token viejo inmediatamente.

## Paso 6 - Logout

`POST /api/auth/device/logout`

```json
{
  "refreshToken": "<refresh_token_actual>"
}
```

## Como listar dispositivos y enviar submit

Estos endpoints son del rol emisor (publico), no del token de impresora.

### Listar dispositivos disponibles

`GET /api/public/print/devices?tenantSlug=valnex`

No requiere token de impresora.

Retorna solo dispositivos en `online|busy`.

### Crear y despachar job publico (submit)

`POST /api/public/print/submit`

```json
{
  "tenantSlug": "valnex",
  "documentType": "ticket",
  "format": "escpos",
  "payload": {
    "jobs": [
      { "type": "text", "value": "Hola Android\n", "align": "center", "bold": true },
      { "type": "feed", "lines": 1 },
      { "type": "cut" }
    ]
  },
  "printerCode": "epson-tm-t20iii-receipt-4a06238b",
  "requestId": "REQ-ANDROID-0001",
  "externalId": "ORDER-ANDROID-0001"
}
```

## Errores de Flujo Comunes

1. Intentar usar token `printer-client` para `POST /api/print-jobs` (requiere admin).
2. Creer que `POST /api/print-devices/present` deja el equipo `online` automaticamente.
3. No persistir `identifier` y `macAddress` estables entre reinstalaciones.
4. Reusar refresh token viejo despues de rotacion.
5. Exponer `apiKey` o `refreshToken` en logs.

## Checklist Rapido Android

1. Persistir `identifier` estable (KeyStore/SharedPreferences seguras).
2. Normalizar y persistir `macAddress` cuando exista.
3. Guardar `apiKey` de forma segura.
4. Adjuntar `Authorization: Bearer <accessToken>` en `/api/print-devices/present`.
5. Implementar refresh con reemplazo atomico de `refreshToken`.
6. Usar `public/print/*` solo si tu app tambien cumple rol de emisor.
