# 06 - Seguridad

## Principios

1. Credenciales de dispositivo unicas por equipo.
2. Tokens de acceso cortos y refresh rotativo.
3. Revocacion granular por dispositivo.
4. Validacion estricta de scope y tenant.

## Auth de Dispositivo

1. Activacion one-time con aprobacion admin.
2. Intercambio de credencial por tokens.
3. Rotacion de refresh token en cada refresh.

## Redis en Seguridad

1. Revocacion distribuida de JWT por `jti`.
2. Rate-limit para evitar abuso en activacion.
3. Cache de sesiones refresh para menor latencia y control de invalidez.

## Practicas Recomendadas

1. Definir `DEVICE_SECRET_PEPPER` fuerte en produccion.
2. Rotar `JWT_SECRET` por procedimiento controlado.
3. Habilitar TLS extremo a extremo.
4. Auditar revocaciones administrativas de credenciales.