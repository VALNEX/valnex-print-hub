# 04 - Contratos WebSocket

Namespace: `/print`

## Autenticacion de Conexion

1. Obtener `accessToken` desde `POST /api/auth/device/token` o `POST /api/auth/device/refresh`.
2. Conectar Socket.IO enviando `auth.token` en handshake.

## Eventos de Entrada

1. `print.device.present`
2. `subscribe`
3. `print.job.ack`
4. `print.job.result`
5. `print.devices.active.report`
6. `print.devices.active.get`

## Eventos de Salida

1. `print.device.presented`
2. `print.job.dispatch`
3. `print.job.updated`
4. `print.job.log.created`
5. `print.devices.active.updated`

## Reglas de Estado de Device

1. Al `print.device.present`, backend marca `online`.
2. En desconexion, backend marca `offline` si no hay otro socket activo del mismo device.
3. Si token revocado o expirado, la conexion WS es rechazada.

## Validaciones Relevantes

1. Scope requerido: `printer-client`.
2. Tenant del token debe coincidir con tenant de recursos consultados/reportados.