# Valnex Print Hub

Backend multi-tenant para orquestacion de impresion en tiempo real.

Construido con NestJS + Prisma + PostgreSQL + Socket.IO + Redis.

## Que Resuelve

1. Registro y administracion de dispositivos de impresion por tenant.
2. Enrutamiento y despacho de jobs de impresion.
3. Canal en tiempo real para ACK/RESULT de cliente impresora.
4. Flujo seguro de onboarding de cliente impresora con activacion one-time.
5. Observabilidad operativa de estado de jobs y dispositivos.

## Stack Tecnico

1. NestJS 11
2. Prisma 7
3. PostgreSQL
4. Socket.IO
5. Redis (`ioredis`)
6. PNPM

## Estado Actual del Auth

El flujo de cliente impresora fue migrado a `device provisioning`:

1. `POST /api/auth/device/activation/request`
2. `GET /api/auth/device/activation/pending` (admin)
3. `POST /api/auth/device/activation/approve` (admin)
4. `POST /api/auth/device/token`
5. `POST /api/auth/device/refresh`
6. `POST /api/auth/device/logout`
7. `POST /api/auth/device/credential/revoke` (admin)

Notas:

1. El login admin sigue vigente (`/api/auth/admin/login`).
2. El onboarding de dispositivo reemplaza el login heredado por apiKey de tenant para clientes impresora.

## Estructura del Proyecto

```text
src/
  common/
  config/
  infra/
  modules/
    auth/
    prisma/
    redis/
    realtime/
    public-print/
    print-devices/
    print-jobs/
    print-job-logs/
    print-locations/
    print-routing-rules/
    print-sources/
    tenants/
prisma/
  schema.prisma
  migrations/
docs/
  ficha-tecnica/
  database/
```

## Requisitos

1. Node.js 22+
2. PNPM 10+
3. PostgreSQL accesible
4. Redis accesible

## Configuracion de Entorno

Variables minimas recomendadas:

```env
DATABASE_URL=postgresql://user:password@host:5432/valnex_print_hub
PORT=3000
NODE_ENV=development

JWT_SECRET=change-me
JWT_EXPIRES_IN_SECONDS=28800
ADMIN_BOOTSTRAP_TOKEN=change-me-bootstrap

DEVICE_SECRET_PEPPER=change-me-pepper
DEVICE_ACTIVATION_TTL_MINUTES=10
DEVICE_REFRESH_TTL_DAYS=30
DEVICE_ACTIVATION_RATE_WINDOW_SECONDS=600
DEVICE_ACTIVATION_RATE_MAX_ATTEMPTS=10

REDIS_URL=redis://:password@127.0.0.1:6379/0
# Alternativa sin REDIS_URL:
# REDIS_HOST=127.0.0.1
# REDIS_PORT=6379
# REDIS_PASSWORD=password
```

## Instalacion y Arranque Local

1. Instalar dependencias

```bash
pnpm install
```

2. Aplicar migraciones y generar cliente Prisma

```bash
pnpm prisma migrate dev
pnpm prisma generate
```

3. Arrancar en desarrollo

```bash
pnpm run start:dev
```

4. Swagger

`http://localhost:3000/api/docs`

## Comandos Principales

```bash
pnpm run build
pnpm run start
pnpm run start:dev
pnpm run start:prod

pnpm run test
pnpm run test:e2e
pnpm run test:cov

pnpm prisma generate
pnpm prisma migrate dev --name <migration_name>
pnpm prisma migrate deploy
```

## Redis: Donde Se Usa

1. Cache tenant por slug.
2. Cache de lista publica de dispositivos por tenant.
3. Invalidez distribuida de JWT revocados (`jti`).
4. Rate limit de activacion de dispositivo.
5. Cache de sesiones de refresh token (hash -> session id).

## Comportamiento de Estado de Dispositivo

1. Evento WS `print.device.present` -> `online`.
2. Desconexion WS (si no hay otro socket activo para el mismo device) -> `offline`.
3. Endpoint helper HTTP `POST /api/print-devices/present` no publica por si solo en online operativo.

## Docker

### Build

```bash
docker build -t valnex-print-hub .
```

### Run

```bash
docker run --name valnex-print-hub --rm -p 3000:3000 --env-file .env valnex-print-hub
```

Si la base de datos esta en tu host local (Windows/Mac Docker Desktop), usar `host.docker.internal` en `DATABASE_URL`.

## Flujo Rapido de Activacion de Device (E2E)

1. Cliente solicita activacion.
2. Admin lista pendientes y aprueba.
3. Cliente intercambia credencial por tokens.
4. Cliente conecta WS `/print` y emite `print.device.present`.
5. Cliente mantiene sesion con `device/refresh` y logout/revoke cuando aplique.

## Documentacion Tecnica

1. Ficha tecnica completa: [docs/ficha-tecnica/README.md](docs/ficha-tecnica/README.md)
2. Documentacion de base de datos: [docs/database/prisma-reference.md](docs/database/prisma-reference.md)

## Licencia

UNLICENSED (proyecto privado).