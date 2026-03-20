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

### 1) Solicitar activacion de dispositivo

`POST /api/auth/device/activation/request`

Request JSON (valido):

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

Response JSON (shape real):

```json
{
	"success": true,
	"message": "Device activation request created",
	"data": {
		"activationRequestId": "11111111-2222-3333-4444-555555555555",
		"activationCode": "Q7K9M2PJ",
		"expiresAt": "2026-03-20T18:40:00.000Z",
		"tenantId": "a1f4f8fe-1111-4444-8888-0f9b4d4c1a11",
		"deviceId": "22222222-3333-4444-5555-666666666666",
		"status": "pending"
	},
	"timestamp": "2026-03-20T18:10:00.000Z",
	"path": "/auth/device/activation/request"
}
```

### 2) Listar activaciones pendientes (admin)

`GET /api/auth/device/activation/pending?tenantSlug=valnex&limit=50`

Headers:

1. `Authorization: Bearer <admin_access_token>`

Response JSON (shape real):

```json
{
	"success": true,
	"message": "Pending device activations retrieved successfully",
	"data": {
		"count": 1,
		"items": [
			{
				"id": "11111111-2222-3333-4444-555555555555",
				"status": "pending",
				"expiresAt": "2026-03-20T18:40:00.000Z",
				"createdAt": "2026-03-20T18:10:00.000Z",
				"requestedIdentifier": "WPF-FRONT-01",
				"requestedMacAddress": "aa:bb:cc:dd:ee:ff",
				"requestedName": "Front Desk Printer",
				"tenant": {
					"id": "a1f4f8fe-1111-4444-8888-0f9b4d4c1a11",
					"slug": "valnex",
					"name": "Valnex"
				},
				"device": {
					"id": "22222222-3333-4444-5555-666666666666",
					"code": "front-desk-a1b2c3d4",
					"name": "Front Desk Printer",
					"status": "unknown"
				}
			}
		]
	},
	"timestamp": "2026-03-20T18:11:00.000Z",
	"path": "/auth/device/activation/pending"
}
```

### 3) Aprobar activacion (admin)

`POST /api/auth/device/activation/approve`

Headers:

1. `Authorization: Bearer <admin_access_token>`

Request JSON (valido):

```json
{
	"activationRequestId": "11111111-2222-3333-4444-555555555555",
	"activationCode": "Q7K9M2PJ"
}
```

Response JSON (shape real):

```json
{
	"success": true,
	"message": "Device activation approved",
	"data": {
		"activationRequestId": "11111111-2222-3333-4444-555555555555",
		"tenantId": "a1f4f8fe-1111-4444-8888-0f9b4d4c1a11",
		"tenantSlug": "valnex",
		"device": {
			"id": "22222222-3333-4444-5555-666666666666",
			"tenantId": "a1f4f8fe-1111-4444-8888-0f9b4d4c1a11",
			"name": "Front Desk Printer",
			"code": "front-desk-a1b2c3d4",
			"status": "unknown"
		},
		"credential": {
			"id": "33333333-4444-5555-6666-777777777777",
			"status": "active",
			"secret": "Lzv0R7i8SxB9Y6mD3Qk2_8Pp1n4Ew5u7Rr0Tt2Qq9Lk"
		}
	},
	"timestamp": "2026-03-20T18:12:00.000Z",
	"path": "/auth/device/activation/approve"
}
```

### 4) Intercambiar credencial por tokens

`POST /api/auth/device/token`

Request JSON (valido):

```json
{
	"credentialId": "33333333-4444-5555-6666-777777777777",
	"credentialSecret": "Lzv0R7i8SxB9Y6mD3Qk2_8Pp1n4Ew5u7Rr0Tt2Qq9Lk"
}
```

Response JSON (shape real):

```json
{
	"success": true,
	"message": "Device token issued successfully",
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
	},
	"timestamp": "2026-03-20T18:13:00.000Z",
	"path": "/auth/device/token"
}
```

### 5) Refrescar token de dispositivo (rotacion obligatoria)

`POST /api/auth/device/refresh`

Request JSON (valido):

```json
{
	"refreshToken": "<refresh_token_actual>"
}
```

Response JSON: mismo shape que `POST /api/auth/device/token` con `refreshToken` nuevo.

### 6) Logout de dispositivo

`POST /api/auth/device/logout`

Request JSON (valido):

```json
{
	"refreshToken": "<refresh_token_actual>"
}
```

Response JSON (shape real):

```json
{
	"success": true,
	"message": "Device logout processed",
	"data": {
		"revoked": true,
		"revokedAt": "2026-03-20T18:14:00.000Z"
	},
	"timestamp": "2026-03-20T18:14:00.000Z",
	"path": "/auth/device/logout"
}
```

### 7) Revocar credencial (admin)

`POST /api/auth/device/credential/revoke`

Headers:

1. `Authorization: Bearer <admin_access_token>`

Request JSON (valido):

```json
{
	"credentialId": "33333333-4444-5555-6666-777777777777",
	"reason": "Device reported as compromised"
}
```

Response JSON (shape real):

```json
{
	"success": true,
	"message": "Device credential revoked",
	"data": {
		"credentialId": "33333333-4444-5555-6666-777777777777",
		"revoked": true,
		"revokedAt": "2026-03-20T18:15:00.000Z"
	},
	"timestamp": "2026-03-20T18:15:00.000Z",
	"path": "/auth/device/credential/revoke"
}
```

### Validaciones de backend relevantes (DTO)

1. `activationRequestId`: string de longitud 36.
2. `activationCode`: string entre 6 y 20.
3. `credentialSecret`: string entre 32 y 255.
4. `refreshToken`: string entre 32 y 255.
5. `tenantSlug`: maximo 100.
6. `identifier`: minimo 3, maximo 255.
7. `name`: minimo 2, maximo 150.
8. `code` (opcional): maximo 80.

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