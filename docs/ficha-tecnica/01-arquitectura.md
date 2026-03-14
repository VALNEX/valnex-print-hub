# 01 - Arquitectura

## Vista general

El sistema es una API NestJS modular que administra entidades de impresion y ejecuta el ciclo de vida de trabajos de impresion en tiempo real por WebSocket.

## Capas

- src/main.ts
  - bootstrap
  - prefijo global /api
  - ValidationPipe global
  - Swagger en /api/docs
- src/modules/prisma
  - PrismaService global
  - una sola instancia de PrismaClient
- src/modules/*
  - modulos funcionales por dominio
- src/modules/realtime
  - PrintEventsGateway para eventos Socket.IO

## Modulos funcionales

- tenants
- print-locations
- print-devices
- print-sources
- print-routing-rules
- print-jobs
- print-job-logs

Cada modulo sigue patron controller + service + dto.

## Integracion de datos

- Prisma usa adapter PrismaPg con DATABASE_URL
- PrismaClient se conecta en onModuleInit y desconecta en onModuleDestroy
- Base de datos organizada por schemas:
  - platform (tenant y enum base)
  - catalog (catalogo de dispositivos, ubicaciones, fuentes)
  - ops (trabajos, logs, reglas)

## Integracion en tiempo real

Gateway en namespace /print:

- Suscripcion de clientes a rooms:
  - tenant:{tenantId}
  - device:{deviceId}
  - job:{jobId}
- Eventos de salida de servidor:
  - print.job.created
  - print.job.updated
  - print.job.log.created
  - print.job.dispatch
- Eventos de entrada al servidor:
  - subscribe
  - print.job.ack
  - print.job.result

## Principios de diseno aplicados

- Modularidad por bounded context
- Encapsulamiento de acceso a DB en servicios
- Contratos DTO para entrada/salida
- Estado de trabajo como fuente de verdad
- Idempotencia para evitar doble impresion
- Observabilidad por endpoint monitor y logs de eventos
