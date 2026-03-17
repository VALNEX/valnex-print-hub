# Ficha Tecnica - Valnex Print Hub

Esta carpeta documenta el sistema de impresion multi-tenant de punta a punta.

## Objetivo

Dar una guia unica para entender:

- arquitectura tecnica
- flujo funcional completo
- contratos HTTP y WebSocket
- modelo de datos Prisma/PostgreSQL
- seguridad y hardening
- operacion, monitoreo y troubleshooting
- pruebas funcionales y checklist de salida a produccion

## Como leer esta ficha

1. Empezar por arquitectura y flujo.
2. Continuar con contratos de integracion (HTTP/WS).
3. Revisar seguridad y operacion.
4. Ejecutar checklist de pruebas.

## Indice

- [01-arquitectura.md](01-arquitectura.md)
- [02-flujo-end-to-end.md](02-flujo-end-to-end.md)
- [03-contratos-http.md](03-contratos-http.md)
- [04-contratos-websocket.md](04-contratos-websocket.md)
- [05-modelo-datos.md](05-modelo-datos.md)
- [06-seguridad.md](06-seguridad.md)
- [07-operacion-observabilidad.md](07-operacion-observabilidad.md)
- [08-pruebas-checklist.md](08-pruebas-checklist.md)
- [09-integracion-cliente-wpf.md](09-integracion-cliente-wpf.md)
- [10-instructivo-emisor-impresion.md](10-instructivo-emisor-impresion.md)
- [11-presentacion-y-resolucion-de-nombre.md](11-presentacion-y-resolucion-de-nombre.md)

## Stack

- NestJS 11
- Prisma 7 con adapter PostgreSQL
- PostgreSQL (schemas: platform, catalog, ops)
- Socket.IO via @nestjs/websockets
- Validacion global con class-validator
- Swagger en /api/docs

## Convenciones del proyecto

- Prefijo global API: /api
- Respuesta HTTP unificada: success, message, data, meta, timestamp, path
- Prisma centralizado en src/modules/prisma/prisma.service.ts
- Flujo de impresion orientado a eventos (WS), no polling HTTP para entrega al cliente impresor
