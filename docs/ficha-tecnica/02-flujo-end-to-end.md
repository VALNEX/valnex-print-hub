# 02 - Flujo End-to-End

## A) Onboarding de Cliente Impresora

1. Cliente solicita activacion (`/api/auth/device/activation/request`).
2. Admin consulta pendientes (`/api/auth/device/activation/pending`).
3. Admin aprueba (`/api/auth/device/activation/approve`).
4. Cliente intercambia credencial (`/api/auth/device/token`).
5. Cliente usa access token en WS `/print`.

## B) Presencia y Disponibilidad

1. Cliente emite `print.device.present`.
2. Backend actualiza estado `online` y devuelve `print.device.presented`.
3. Al desconectar, backend actualiza `offline` si ya no hay otro socket activo para ese device.

## C) Impresion Publica

1. Emisor consulta `GET /api/public/print/devices?tenantSlug=...`.
2. Emisor envia `POST /api/public/print/submit`.
3. Backend crea `print_job` y despacha a WS (`print.job.dispatch`).
4. Cliente impresora responde `print.job.ack` y `print.job.result`.

## D) Sesion de Dispositivo

1. Refresh periodico con `POST /api/auth/device/refresh`.
2. Logout con `POST /api/auth/device/logout`.
3. Revocacion forzada por admin con `POST /api/auth/device/credential/revoke`.

## E) Redis en el Flujo

1. Cache publico tenant/devices para lecturas frecuentes.
2. Invalidacion en present/disconnect/CRUD de dispositivos.
3. Revocacion de JWT distribuida.
4. Rate-limit de activaciones.