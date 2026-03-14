# 06 - Seguridad

## Controles ya implementados

- ValidationPipe global con:
  - whitelist: true
  - transform: true
  - forbidNonWhitelisted: true
- DTOs con class-validator
- Enums en campos criticos (status, format, etc.)
- Validaciones de transicion de estado en flujo WS
- Validacion de tenant en ACK y result
- Idempotencia para prevenir duplicados de impresion

## Riesgos a considerar

- No hay autenticacion/autorizarion activa en controladores o gateway.
- subscribe acepta room IDs sin validacion de identidad.
- ACK/result confian en tenantId enviado por cliente.
- CORS en WS esta abierto a origin true.
- El timeout de ACK vive en memoria de proceso.

## Recomendaciones prioritarias

1. HTTP Auth
- Agregar JWT guard en API publica.
- Aplicar RBAC por tenant y rol.

2. WS Auth
- Requerir token en handshake.
- Resolver tenantId del token, no del payload.
- Verificar que deviceId pertenezca al tenant autenticado.

3. Integridad de eventos
- Agregar request signature/HMAC opcional por dispositivo.
- Incluir nonce/timestamp para evitar replay.

4. Hardening de CORS
- Definir lista explicita de origins permitidos por entorno.

5. Datos sensibles
- No incluir secretos o PII en payload/context de logs.
- Politica de retencion y mascarado.

6. Resiliencia
- Mover timeout/reintentos a worker persistente (cola/cron) para no depender de memoria local.

## Checklist minimo para produccion

- JWT habilitado en HTTP y WS
- segregacion estricta por tenant en todas las consultas
- CORS restringido
- rate limiting
- auditoria de cambios criticos
- alarmas para incrementos de failed/retrying
