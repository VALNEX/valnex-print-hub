# Referencia Prisma

## Esquemas

- `platform`: tenants, admin users, activaciones y sesiones de dispositivo.
- `catalog`: ubicaciones, dispositivos y fuentes de impresion.
- `ops`: reglas de ruteo, jobs y logs.

## Modelos Relevantes Nuevos

1. `DeviceActivationRequest`
- solicitud de activacion con codigo one-time hash y vencimiento.

2. `DeviceApiKey`
- API key unica por dispositivo (hash del secreto, estado, revocacion).

3. `DeviceSession`
- sesion de refresh token por dispositivo con revocacion.

## Reglas de Implementacion

1. Nunca persistir secretos en claro.
2. Persistir hashes (`sha256 + pepper`) de activation code y API key.
3. Rotar refresh token en cada refresh.
4. Revocar sesiones al revocar API key.

## Flujo Prisma Recomendado

1. `request activation`: `find/create printDevice` -> `create deviceActivationRequest`.
2. `approve activation`: `expire/revoke anteriores` -> `create deviceApiKey` -> `approve request`.
3. `token exchange`: validar hash API key -> `create deviceSession`.
4. `refresh`: validar sesion -> rotar hash refresh en misma sesion.

## Migraciones

1. `pnpm prisma migrate dev --name <descripcion>`
2. `pnpm prisma migrate deploy` (produccion)
3. `pnpm prisma generate`