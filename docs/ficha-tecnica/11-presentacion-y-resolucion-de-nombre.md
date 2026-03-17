# 11 - Presentacion de Dispositivo y Resolucion de Nombre

## Objetivo

Definir el contrato oficial para que clientes de impresora (WPF, Android, etc.) presenten un dispositivo y obtengan el nombre oficial registrado en plataforma.

Este documento cubre:

1. Identidad del dispositivo por tenant + MAC.
2. Flujo helper HTTP para obtener nombre (sin publicar dispositivo para impresion online).
3. Flujo WS para clientes operativos de impresion (si aplica).
4. Regla de renombre controlado por endpoint.

## Regla de identidad

Al presentar dispositivo, el backend resuelve en este orden:

1. tenantId + macAddress (prioridad alta)
2. tenantId + identifier (fallback)
3. Si no existe ninguno, crea un device nuevo

Consecuencia:

1. La MAC es la clave principal para reconocer la misma impresora en distintas apps del mismo tenant.
2. Si otra app se vincula a esa impresora y manda la misma MAC, recibira el mismo deviceId y el mismo nombre oficial.

## Flujo A - Helper HTTP (movil u otros clientes no WS)

Uso recomendado para apps que solo necesitan resolver nombre oficial por MAC.

### 1) Login printer-client

POST /api/auth/printer/login

{
  "username": "tenant-slug",
  "password": "tenant-api-key"
}

### 2) Presentar dispositivo por HTTP

POST /api/print-devices/present
Authorization: Bearer {printerAccessToken}
Content-Type: application/json

{
  "identifier": "ANDROID-PIXEL-7-01",
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "name": "Impresora Movil Patio Norte",
  "code": "mobile-patio-norte",
  "type": "thermal",
  "connectionType": "bluetooth"
}

### 3) Respuesta esperada

{
  "success": true,
  "message": "Print device presented successfully",
  "data": {
    "event": "print.device.present.ok",
    "tenantId": "f747df6f-a628-429d-8be0-a2b3fee1c96e",
    "device": {
      "id": "a6a118a2-236c-4c18-8fc6-1f15c8391621",
      "name": "Nombre Oficial en Plataforma",
      "code": "epson-tm-t20iii-receipt-05f42bc8",
      "status": "unknown"
    }
  }
}

Notas importantes del helper HTTP:

1. Este flujo NO publica el dispositivo como disponible para impresion online.
2. El backend mantiene status unknown (helper de identidad/nombre).
3. La app debe usar device.name como fuente de verdad.

## Flujo B - Presentacion WS (cliente operativo de impresion)

Uso para cliente que si recibe jobs por tiempo real.

### 1) Login unificado o printer-client

POST /api/auth/login o POST /api/auth/printer/login

### 2) Conectar WS a /print con token

Handshake auth:

{
  "token": "<accessToken>"
}

### 3) Emitir print.device.present

{
  "identifier": "WPF-FRONT-01",
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "name": "Front Desk Printer",
  "code": "front-desk",
  "type": "thermal",
  "connectionType": "bridge"
}

Resultado:

1. Evento print.device.presented con id, name y code oficiales.
2. Este flujo se usa para canal de impresion en tiempo real.

## Regla de nombre oficial

1. Primera presentacion: si no existe por MAC/identifier, se crea con name enviado.
2. Presentaciones futuras con misma MAC: se reutiliza registro existente y se retorna el name oficial guardado.
3. El cliente no debe forzar nombre local si backend retorna uno distinto.

## Como cambiar nombre de impresora

Solo por endpoint de renombre (no por presentacion):

PATCH /api/print-devices/{deviceId}/rename
Authorization: Bearer {adminAccessToken o printerAccessToken}
Content-Type: application/json

{
  "name": "Bascula Patio Norte"
}

Reglas:

1. admin puede renombrar globalmente.
2. printer-client solo renombra devices del mismo tenant del token.

## Buenas practicas para apps cliente

1. Persistir identifier estable por instalacion.
2. Enviar siempre macAddress cuando exista.
3. Tomar device.id y device.name devueltos por backend como canonicos.
4. Si app B encuentra misma MAC de app A, no crear alias local; usar nombre oficial retornado.
5. Registrar en logs locales: tenantId, device.id, macAddress normalizada, nombre retornado.

## Errores comunes

1. Invalid macAddress format:
   - macAddress no cumple formato hexadecimal de 12 caracteres.
2. Print device not found (en rename):
   - deviceId no pertenece al tenant del token printer-client.
3. Missing authentication token:
   - falta Bearer token en endpoint protegido.
