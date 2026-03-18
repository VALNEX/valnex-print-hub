# 09 - Integracion Cliente WPF

## Objetivo

Integrar un cliente de impresora WPF con el nuevo flujo de activacion de dispositivo, sesion segura y WS en tiempo real.

## Paso 1 - Solicitar Activacion

`POST /api/auth/device/activation/request`

Enviar:

1. `tenantSlug`
2. `identifier` estable por instalacion
3. `macAddress`
4. `name`

## Paso 2 - Aprobacion Admin

Admin usa:

1. `GET /api/auth/device/activation/pending`
2. `POST /api/auth/device/activation/approve`

El cliente recibe o captura:

1. `credentialId`
2. `credentialSecret`

## Paso 3 - Obtener Tokens

`POST /api/auth/device/token`

Respuesta:

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

## Paso 6 - Cierre de Sesion

1. `POST /api/auth/device/logout` con refresh token actual.

## Buenas Practicas WPF

1. Persistir `identifier` y `macAddress` de forma estable.
2. Tratar `device.id` y `device.name` del backend como canonicos.
3. No reusar refresh token viejo luego de rotacion.
4. Manejar reconnect WS con refresh previo del access token cuando aplique.