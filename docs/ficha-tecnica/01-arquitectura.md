# 01 - Arquitectura

## Vision General

Valnex Print Hub es un backend NestJS multi-tenant con Prisma/PostgreSQL, WebSocket para tiempo real y Redis para cache/seguridad transitoria.

## Capas

1. `modules/auth`: autenticacion admin y autenticacion de dispositivos por activacion.
2. `modules/realtime`: namespace WS `/print` para presencia y eventos de job.
3. `modules/public-print`: endpoints publicos para listar impresoras y enviar jobs.
4. `modules/print-*`: catalogo y operacion de impresion.
5. `modules/redis`: cliente Redis global reusable.
6. `modules/prisma`: acceso unico a base de datos.

## Patron de Autenticacion de Dispositivo

1. Activacion de dispositivo con codigo de un solo uso.
2. Aprobacion admin de solicitud pendiente.
3. Emision de credencial por dispositivo.
4. Intercambio por access+refresh tokens.
5. Rotacion de refresh y revocacion granular.

## Redis en Arquitectura

1. Cache de tenant por slug.
2. Cache de lista publica de dispositivos por tenant.
3. Revocacion distribuida de JWT (`jti`).
4. Rate-limit de activaciones.
5. Cache de refresh token hash -> session id.

## Estado de Dispositivos

1. `print.device.present` (WS) actualiza `online`.
2. Disconnect WS actualiza `offline` cuando no quedan sockets activos para ese device.
3. `POST /print-devices/present` es helper HTTP y no publica online por si solo.