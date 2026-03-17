# 10 - Instructivo para Emisor de Impresion

## Objetivo

Este instructivo es para el sistema que manda a imprimir (ERP, POS, ecommerce o integrador).

Flujo objetivo:

1. Consultar impresoras disponibles del tenant.
2. Mostrar opciones al usuario.
3. Enviar el job a la impresora seleccionada.
4. Confirmar resultado de envio y monitorear estado del job.

## Endpoints a usar

Base URL con prefijo global: /api

1. Listar impresoras: GET /api/public/print/devices?tenantSlug={tenantSlug}
2. Enviar impresion: POST /api/public/print/submit

## Autenticacion y tenant (importante)

Hay 2 modos validos de integracion. Este instructivo usa por defecto el modo publico.

Modo A (recomendado para integradores externos): Publico

1. No requiere login de API.
2. Identifica tenant por tenantSlug.
3. Endpoints:
  - GET /api/public/print/devices
  - POST /api/public/print/submit

Modo B (operacion interna/admin): Protegido

1. Requiere login admin y token Bearer.
2. Usa tenantId en el cuerpo de create job.
3. Endpoints:
  - POST /api/auth/login (credenciales admin) o POST /api/auth/admin/login
  - POST /api/print-jobs
  - POST /api/print-jobs/{jobId}/dispatch

Conclusiones practicas:

1. Si vas por flujo publico, no necesitas tenantId, solo tenantSlug.
2. Si necesitas trabajar con tenantId, si o si debes usar flujo admin autenticado.

Modo C (cliente impresora autenticado): printer-client

1. Requiere login por POST /api/auth/printer/login.
2. Puede renombrar su device por endpoint protegido de tenant.
3. Endpoint:
  - POST /api/print-devices/present (helper de nombre por MAC, via HTTP)
  - PATCH /api/print-devices/{deviceId}/rename

Nota:

1. Con token printer-client no se puede administrar todo el catalogo.
2. Solo se permite renombrar devices del mismo tenant del token.
3. El endpoint HTTP present es helper: mantiene status unknown y NO publica el device como disponible para impresion online.

## Tutorial de nombre de impresora para WPF y Android

Objetivo operativo:

1. Primera presentacion: el device se registra con el name enviado por el cliente.
2. Siguientes presentaciones: si llega la misma MAC dentro del mismo tenant, el backend reutiliza ese device y retorna el nombre guardado en plataforma.
3. Cambiar nombre de impresora: solo por endpoint admin PATCH /api/print-devices/:id.

### Regla de matching de identidad

Al emitir print.device.present, el backend resuelve en este orden:

1. tenantId + macAddress (prioridad alta)
2. tenantId + identifier (fallback)
3. Si no existe ninguno: crea device nuevo

Por eso, para WPF y Android la recomendacion es enviar siempre:

1. identifier estable por instalacion
2. macAddress real del adaptador/impresora
3. name de presentacion

### Payload de presentacion recomendado (WPF y Android)

Evento WS: print.device.present

{
  "identifier": "WPF-FRONT-01",
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "name": "Front Desk Printer",
  "code": "front-desk",
  "type": "thermal",
  "connectionType": "bridge"
}

Nota:

1. El backend normaliza MAC (acepta formatos con : o -).
2. Si la MAC ya existe en ese tenant, se retorna el nombre guardado en backend, no el nombre enviado por cliente.

### Resultado esperado al presentar

Evento de salida: print.device.presented

{
  "event": "print.device.present.ok",
  "tenantId": "...",
  "device": {
    "id": "...",
    "name": "Nombre Oficial en Plataforma",
    "code": "epson-tm-t20iii-receipt-05f42bc8",
    "status": "unknown"
  }
}

Interpretacion:

1. Si name coincide con lo enviado, probablemente fue alta inicial.
2. Si name difiere, backend encontro la MAC existente y te devolvio el nombre oficial.

### Como renombrar una impresora (unica via permitida)

Paso 1: login admin

POST /api/auth/admin/login

{
  "email": "admin@valnex.local",
  "password": "StrongPassword123!"
}

Paso 2: actualizar nombre

PATCH /api/print-devices/{deviceId}
Authorization: Bearer {adminAccessToken}
Content-Type: application/json

{
  "name": "Bascula Patio Norte"
}

Resultado:

1. El nombre oficial cambia en plataforma.
2. En la siguiente presentacion de WPF/Android con la misma MAC, el backend regresara ese nuevo nombre.

Alternativa para cliente impresora (sin admin):

Paso 1: login printer-client

POST /api/auth/printer/login

{
  "username": "tenant-slug",
  "password": "tenant-api-key"
}

Paso 2: renombrar con token printer-client

PATCH /api/print-devices/{deviceId}/rename
Authorization: Bearer {printerAccessToken}
Content-Type: application/json

{
  "name": "Bascula Patio Norte"
}

Regla de seguridad:

1. Si el deviceId no pertenece al tenant del token, el backend rechaza la operacion.

### Buenas practicas para clientes WPF y Android

1. No sobreescribir nombre localmente despues de recibir print.device.presented.
2. Tratar device.name recibido como fuente de verdad.
3. Persistir identifier estable y reutilizarlo en cada reconexion.
4. Enviar siempre macAddress cuando este disponible.

## Paso 1 - Listar impresoras disponibles

Request:

GET /api/public/print/devices?tenantSlug=valnex

Respuesta esperada (resumen):

{
  "success": true,
  "data": {
    "tenant": {
      "id": "...",
      "slug": "valnex",
      "name": "Valnex"
    },
    "devices": [
      {
        "id": "a6a118a2-236c-4c18-8fc6-1f15c8391621",
        "name": "Front Desk Printer",
        "code": "epson-tm-t20iii-receipt-05f42bc8",
        "status": "online",
        "location": {
          "id": "...",
          "name": "Patio",
          "code": "patio"
        }
      }
    ]
  }
}

Regla de UI para el emisor:

1. Mostrar name + code + status.
2. Permitir seleccionar por code.
3. Si no hay devices, bloquear boton de imprimir y mostrar mensaje operativo.

## Paso 2 - Enviar job a la impresora seleccionada

El emisor envia la impresion usando printerCode de la impresora seleccionada.

Nota: este ejemplo es del modo publico (sin login de API).

Request:

POST /api/public/print/submit
Content-Type: application/json

{
  "tenantSlug": "valnex",
  "documentType": "ticket",
  "format": "escpos",
  "payload": {
    "jobs": [
      {
        "type": "text",
        "value": "KON KENN\\n",
        "align": "center",
        "bold": true,
        "width": 2,
        "height": 2
      },
      {
        "type": "feed",
        "lines": 1
      },
      {
        "type": "cut"
      }
    ]
  },
  "printerCode": "epson-tm-t20iii-receipt-05f42bc8",
  "requestId": "REQ-20260316-0001",
  "externalId": "ORDER-20260316-0001"
}

## Reglas obligatorias de payload para tickets escpos

1. payload debe ser objeto.
2. payload.jobs debe existir y ser array no vacio.
3. Comandos soportados: text, image, feed, cut.
4. Para type text se requiere value (string).
5. Para type image se requiere url (string).
6. Para type feed se requiere lines (entero mayor o igual a 1).

## Como interpretar la respuesta

Respuesta exitosa (resumen):

{
  "success": true,
  "data": {
    "tenantSlug": "valnex",
    "jobId": "743ce41d-1fb1-4c3a-ae04-fa89566890c5",
    "status": "sent",
    "printer": {
      "id": "a6a118a2-236c-4c18-8fc6-1f15c8391621",
      "code": "epson-tm-t20iii-receipt-05f42bc8"
    },
    "dispatchPayload": {
      "id": "743ce41d-1fb1-4c3a-ae04-fa89566890c5",
      "tenantId": "f747df6f-a628-429d-8be0-a2b3fee1c96e",
      "printerId": "a6a118a2-236c-4c18-8fc6-1f15c8391621",
      "documentType": "ticket",
      "format": "escpos",
      "copies": 1,
      "payload": {
        "jobs": ["..."]
      }
    }
  }
}

Notas:

1. status sent significa que el backend ya despacho al canal de la impresora.
2. El resultado final impreso o failed depende del cliente impresora (ACK y RESULT por WS).
3. Guardar jobId para trazabilidad.

## Recomendaciones de idempotencia

1. requestId: identificador tecnico unico por intento logico de envio.
2. externalId: identificador de negocio (folio de orden, ticket o venta).
3. Reusar requestId y externalId en reintentos del mismo documento.

## Errores frecuentes

1. Tenant no encontrado:
   - Causa: tenantSlug invalido o inactivo.
2. No available printer for tenant:
   - Causa: no hay impresoras online o busy para ese tenant.
3. Bad Request por JSON:
   - Causa: cuerpo mal formado o payload.jobs ausente.
4. payload.jobs invalido para escpos:
   - Causa: comando sin campos requeridos.

## Checklist de salida para el emisor

1. Puede listar impresoras por tenantSlug.
2. Muestra code y permite seleccion de impresora.
3. Envia submit con payload.jobs valido.
4. Guarda jobId, requestId y externalId.
5. Maneja errores de negocio y reintentos controlados.
