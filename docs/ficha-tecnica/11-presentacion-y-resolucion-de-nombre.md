# 11 - Presentacion de Dispositivo y Resolucion de Nombre

## Objetivo

Definir como un cliente impresora obtiene identidad canonica (deviceId/nombre) y como impacta el estado operativo.

## Regla de Resolucion

Orden de matching:

1. `tenantId + macAddress`
2. `tenantId + identifier`
3. crear nuevo `print_device` si no existe

## Flujo Operativo (WS)

1. Cliente ya autenticado por flujo de activacion/token.
2. Conecta a `/print` con token.
3. Emite `print.device.present`.
4. Recibe `print.device.presented` con `id`, `name`, `code`, `status`.

Efecto de estado:

1. Present WS -> `online`.
2. Disconnect WS (sin otro socket activo) -> `offline`.

## Flujo Helper HTTP

`POST /api/print-devices/present`

Uso:

1. resolver identidad/nombre por MAC/identifier
2. no publicar por si solo como online operativo

## Regla de Nombre Oficial

1. Primera alta: usa nombre recibido.
2. Presentaciones siguientes: retorna nombre oficial guardado.
3. Renombre solo via endpoint de rename.

## Cambio de Nombre

1. Admin: `PATCH /api/print-devices/{id}`
2. Cliente de dispositivo autorizado: `PATCH /api/print-devices/{id}/rename` (mismo tenant)

## Buenas Practicas

1. Enviar siempre `macAddress` cuando exista.
2. Mantener `identifier` estable por instalacion.
3. No forzar alias local cuando backend retorna un nombre distinto.