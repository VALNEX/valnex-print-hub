# 07 - Operacion y Observabilidad

## Indicadores Operativos

1. Jobs por estado (`queued`, `sent`, `processing`, `printed`, `failed`).
2. Devices online/offline por tenant.
3. Activaciones pendientes/expiradas/aprobadas.

## Logs Clave

1. Conexiones y desconexiones WS por socket/device.
2. Eventos de dispatch/ack/result de jobs.
3. Revocaciones de token/credencial.
4. Rate-limit de activacion disparado.

## Redis - Operacion

1. Verificar conectividad y latencia de Redis.
2. Monitorear hit ratio de cache publico (`tenant`, `devices`).
3. Monitorear claves de seguridad (`auth:revoked:*`, `auth:device:*`).

## Runbook Basico

1. Si dispositivos no aparecen online: validar `print.device.present` y logs WS.
2. Si token aparentemente valido falla: verificar revocacion distribuida en Redis.
3. Si lista publica esta desactualizada: validar invalidaciones de cache por tenant.