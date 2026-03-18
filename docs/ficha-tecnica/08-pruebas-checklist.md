# 08 - Pruebas y Checklist

## A. Auth de Dispositivo

1. Crear activation request valido.
2. Aprobar activation request valido.
3. Rechazar activation code invalido.
4. Intercambiar credencial por tokens.
5. Refrescar token y validar rotacion refresh.
6. Verificar que refresh viejo falle tras rotacion.

## B. Seguridad

1. Rate-limit de activacion excedido retorna error.
2. Token revocado no pasa guard HTTP.
3. Token revocado no pasa handshake WS.

## C. Estado de Dispositivo

1. `print.device.present` pone `online`.
2. Disconnect WS pone `offline` si no hay otro socket activo.
3. HTTP helper present no fuerza online por si solo.

## D. Flujo de Impresion

1. Lista publica retorna solo `online|busy`.
2. Submit crea job y emite dispatch.
3. ACK timeout mueve job segun configuracion de retries.

## E. Redis

1. Cache tenant/devices se llena y expira por TTL.
2. Invalida cache en cambios de device/presencia.
3. Revocacion distribuida funciona en multiples instancias.