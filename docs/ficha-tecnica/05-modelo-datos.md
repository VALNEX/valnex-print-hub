# 05 - Modelo de Datos

## Dominios Principales

1. Plataforma: tenant, admin y seguridad de dispositivo.
2. Catalogo: locations, devices, sources.
3. Operacion: routing rules, jobs, logs.

## Entidades Clave de Seguridad de Dispositivo

1. `DeviceActivationRequest`
2. `DeviceApiKey`
3. `DeviceSession`

## Entidades Clave de Impresion

1. `PrintDevice`
2. `PrintRoutingRule`
3. `PrintJob`
4. `PrintJobLog`

## Relaciones Relevantes

1. Tenant 1:N PrintDevice.
2. PrintDevice 1:N DeviceApiKey.
3. DeviceApiKey 1:N DeviceSession.
4. PrintJob 1:N PrintJobLog.

## Consideraciones

1. Se usa hash para activationCode, apiKey y refreshToken.
2. Estados de dispositivo dependen de presencia WS operativa.