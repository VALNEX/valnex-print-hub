# Flujo Operativo de Datos

## 1) Activacion de Dispositivo

1. Cliente solicita activacion (`device/activation/request`).
2. Se crea o resuelve `print_device` por tenant + mac/identifier.
3. Se crea `device_activation_request` en estado `pending` con expiracion.
4. Admin aprueba (`device/activation/approve`) y se genera `device_api_key`.

## 2) Sesion de Dispositivo

1. Cliente intercambia API key por tokens (`device/token`).
2. Se crea `device_session` con hash de refresh token.
3. Cliente refresca tokens (`device/refresh`) con rotacion de refresh token.
4. En logout/revocacion se marca sesion revocada y se invalida cache Redis asociado.

## 3) Presencia de Impresora

1. WS `print.device.present` actualiza `print_device.status` a `online`.
2. En desconexion WS, si no hay otro socket activo para el mismo device, se actualiza a `offline`.
3. `POST /print-devices/present` es helper HTTP y no publica online por si mismo.

## 4) Flujo Publico de Impresion

1. Se resuelve tenant por slug.
2. Se listan devices `online|busy`.
3. Se crea y despacha `print_job`.

## 5) Redis en Flujo Operativo

1. Cache tenant por slug.
2. Cache lista de devices publicos.
3. Revocacion distribuida de JWT por `jti`.
4. Rate limit de solicitudes de activacion.
5. Cache de sesiones de refresh token por hash.