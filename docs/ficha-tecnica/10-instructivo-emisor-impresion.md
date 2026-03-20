# 10 - Instructivo para Emisor de Impresion

## Objetivo

Guiar al sistema emisor (ERP/POS/ecommerce) para listar impresoras disponibles y enviar jobs correctamente.

## Endpoints Publicos del Emisor

1. `GET /api/public/print/devices?tenantSlug={tenantSlug}`
2. `POST /api/public/print/submit`

## Reglas Operativas

1. El emisor no usa flujo de activacion de dispositivo.
2. El emisor opera por contrato publico multi-tenant via `tenantSlug`.
3. Solo se pueden usar dispositivos `online|busy`.

## Payload Ticket ESC/POS

1. `payload` debe ser objeto.
2. `payload.jobs` debe existir y no ser vacio.
3. Comandos permitidos: `text`, `image`, `feed`, `cut`.

## Ejemplo de Submit

`POST /api/public/print/submit`

```json
{
  "tenantSlug": "valnex",
  "documentType": "ticket",
  "format": "escpos",
  "payload": {
    "jobs": [
      { "type": "text", "value": "Hola\n", "align": "center", "bold": true },
      { "type": "feed", "lines": 1 },
      { "type": "cut" }
    ]
  },
  "printerCode": "front-desk-a1b2c3d4",
  "requestId": "REQ-0001",
  "externalId": "ORDER-0001"
}
```

## Idempotencia Recomendada

1. `requestId` unico por intento logico.
2. `externalId` como referencia de negocio.

## Errores Frecuentes

1. Tenant no encontrado/inactivo.
2. No hay impresoras disponibles.
3. `payload.jobs` invalido para `escpos`.

## Relacion con Cliente Impresora

1. El cliente impresora (WPF/Android) se autentica por flujo de activacion de dispositivo.
2. El emisor no necesita esas credenciales ni tokens de dispositivo.