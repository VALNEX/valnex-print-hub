# 04 - Contratos WebSocket

Namespace: `/print`

## Autenticacion de Conexion

1. Obtener `accessToken` desde `POST /api/auth/device/token` o `POST /api/auth/device/refresh`.
2. Conectar Socket.IO enviando `auth.token` en handshake.

Ejemplo cliente Socket.IO:

```json
{
	"auth": {
		"token": "<access_token_jwt>"
	}
}
```

## Eventos de Entrada

1. `print.device.present`
2. `subscribe`
3. `print.job.ack`
4. `print.job.result`
5. `print.devices.active.report`
6. `print.devices.active.get`

Ejemplo `print.device.present`:

```json
{
	"identifier": "WPF-FRONT-01",
	"name": "Front Desk Printer",
	"code": "front-desk",
	"macAddress": "AA:BB:CC:DD:EE:FF",
	"type": "thermal",
	"connectionType": "bridge"
}
```

Ejemplo `print.job.ack`:

```json
{
	"jobId": "44444444-5555-6666-7777-888888888888",
	"message": "Job received by client"
}
```

Ejemplo `print.job.result`:

```json
{
	"jobId": "44444444-5555-6666-7777-888888888888",
	"status": "success",
	"message": "Printed successfully"
}
```

Ejemplo `print.devices.active.report`:

```json
{
	"deviceIds": [
		"22222222-3333-4444-5555-666666666666"
	]
}
```

## Eventos de Salida

1. `print.device.presented`
2. `print.job.dispatch`
3. `print.job.updated`
4. `print.job.log.created`
5. `print.devices.active.updated`

Ejemplo `print.device.presented`:

```json
{
	"event": "print.device.present.ok",
	"tenantId": "a1f4f8fe-1111-4444-8888-0f9b4d4c1a11",
	"device": {
		"id": "22222222-3333-4444-5555-666666666666",
		"name": "Front Desk Printer",
		"code": "front-desk-a1b2c3d4",
		"status": "online"
	}
}
```

## Reglas de Estado de Device

1. Al `print.device.present`, backend marca `online`.
2. En desconexion, backend marca `offline` si no hay otro socket activo del mismo device.
3. Si token revocado o expirado, la conexion WS es rechazada.

## Validaciones Relevantes

1. Scope requerido: `printer-client`.
2. Tenant del token debe coincidir con tenant de recursos consultados/reportados.