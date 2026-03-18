# 03 - Contratos HTTP

Base URL: `/api`

## Auth Admin

1. `POST /auth/admin/register` (bootstrap one-time)
2. `POST /auth/admin/login`
3. `POST /auth/admin/logout`

## Auth Dispositivo (nuevo flujo)

1. `POST /auth/device/activation/request`
2. `GET /auth/device/activation/pending` (admin)
3. `POST /auth/device/activation/approve` (admin)
4. `POST /auth/device/token`
5. `POST /auth/device/refresh`
6. `POST /auth/device/logout`
7. `POST /auth/device/credential/revoke` (admin)

## Impresion Publica

1. `GET /public/print/devices?tenantSlug={slug}`
2. `POST /public/print/submit`

## Catalogo/Operacion (admin)

1. `print-locations`
2. `print-devices`
3. `print-sources`
4. `print-routing-rules`
5. `print-jobs`
6. `print-job-logs`

## Notas de Compatibilidad

1. El login heredado `POST /auth/printer/login` fue reemplazado por onboarding de dispositivo.
2. `POST /print-devices/present` es helper HTTP para resolucion de identidad/nombre y no publica online por si mismo.