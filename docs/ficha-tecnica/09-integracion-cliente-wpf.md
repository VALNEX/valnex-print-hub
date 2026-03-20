# 09 - Integracion Cliente WPF

## Objetivo

Integrar un cliente de impresora WPF con el nuevo flujo de activacion de dispositivo, sesion segura y WS en tiempo real.

## Paso 1 - Solicitar Activacion

`POST /api/auth/device/activation/request`

Request JSON:

```json
{
	"tenantSlug": "valnex",
	"identifier": "WPF-FRONT-01",
	"macAddress": "AA:BB:CC:DD:EE:FF",
	"name": "Front Desk Printer",
	"code": "front-desk",
	"type": "thermal",
	"connectionType": "bridge"
}
```

Guardar localmente:

1. `activationRequestId`
2. `activationCode`
3. `expiresAt`

## Paso 2 - Aprobacion Admin

Admin usa:

1. `GET /api/auth/device/activation/pending`
2. `POST /api/auth/device/activation/approve`

Request JSON de aprobacion:

```json
{
	"activationRequestId": "11111111-2222-3333-4444-555555555555",
	"activationCode": "Q7K9M2PJ"
}
```

Response JSON relevante para el cliente:

```json
{
	"success": true,
	"data": {
		"credential": {
			"id": "33333333-4444-5555-6666-777777777777",
			"status": "active",
			"secret": "Lzv0R7i8SxB9Y6mD3Qk2_8Pp1n4Ew5u7Rr0Tt2Qq9Lk"
		}
	}
}
```

El cliente recibe/captura:

1. `credential.id` como `credentialId`
2. `credential.secret` como `credentialSecret`

## Paso 3 - Obtener Tokens

`POST /api/auth/device/token`

Request JSON:

```json
{
	"credentialId": "33333333-4444-5555-6666-777777777777",
	"credentialSecret": "Lzv0R7i8SxB9Y6mD3Qk2_8Pp1n4Ew5u7Rr0Tt2Qq9Lk"
}
```

Response JSON relevante:

```json
{
	"success": true,
	"data": {
		"tokenType": "Bearer",
		"accessToken": "<jwt>",
		"accessExpiresAt": "2026-03-20T20:10:00.000Z",
		"refreshToken": "<refresh_token>",
		"refreshExpiresAt": "2026-04-19T18:13:00.000Z",
		"tenantId": "a1f4f8fe-1111-4444-8888-0f9b4d4c1a11",
		"tenantSlug": "valnex",
		"deviceId": "22222222-3333-4444-5555-666666666666",
		"ws": {
			"namespace": "/print",
			"auth": {
				"token": "<jwt>"
			}
		}
	}
}
```

Guardar:

1. `accessToken`
2. `refreshToken`
3. `ws.auth.token`

## Paso 4 - Conectar WS y Presentar Device

1. Conectar a namespace `/print` con `auth.token`.
2. Emitir `print.device.present`.
3. Esperar `print.device.presented`.

## Paso 5 - Mantener Sesion

1. Antes de expirar access token, llamar `POST /api/auth/device/refresh`.
2. Guardar nuevo refresh token (rotacion obligatoria).

Request JSON de refresh:

```json
{
	"refreshToken": "<refresh_token_actual>"
}
```

## Paso 6 - Cierre de Sesion

1. `POST /api/auth/device/logout` con refresh token actual.

Request JSON de logout:

```json
{
	"refreshToken": "<refresh_token_actual>"
}
```

Response JSON esperado:

```json
{
	"success": true,
	"data": {
		"revoked": true,
		"revokedAt": "2026-03-20T18:14:00.000Z"
	}
}
```

## Buenas Practicas WPF

1. Persistir `identifier` y `macAddress` de forma estable.
2. Tratar `device.id` y `device.name` del backend como canonicos.
3. No reusar refresh token viejo luego de rotacion.
4. Manejar reconnect WS con refresh previo del access token cuando aplique.
5. Nunca enviar `credential.secret` ni `refreshToken` a logs, telemetry o UI.