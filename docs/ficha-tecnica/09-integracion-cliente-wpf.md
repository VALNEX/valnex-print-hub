# 09 - Integracion Completa con Cliente .NET WPF

## Objetivo

Esta guia explica como integrar de punta a punta:

- backend de impresion (este proyecto NestJS)
- cliente de impresoras en .NET WPF (bridge local)
- backend solicitante que manda a imprimir

Incluye auth unificada, conexion en tiempo real, presentacion de dispositivo,
consumo de eventos y envio de ACK/RESULT.

## Especificacion Operativa para IA (modo estricto)

Esta seccion define exactamente que debe hacer una IA cliente. Si hay conflicto
entre ejemplos y esta seccion, esta seccion manda.

### 1) HTTP que SI usa el cliente WPF

- `POST /api/auth/login`
- `POST /api/auth/printer/logout` (recomendado al cerrar sesion)

Request de login (obligatorio):

```json
{
  "identifier": "<tenantSlug>",
  "password": "<tenantApiKey>"
}
```

Validaciones de login (obligatorias):

1. `success == true`
2. `data.principalType == "tenant"`
3. `data.accessToken` no vacio
4. `data.tenantId` no vacio
5. `data.ws.namespace == "/print"`

Si falla cualquiera: NO conectar WS y marcar autenticacion invalida.

### 2) Como debe presentarse por WS

Namespace y auth de handshake:

- Namespace: `/print`
- Handshake auth:

```json
{
  "token": "<accessToken>"
}
```

Al conectar, emitir exactamente `print.device.present` con:

```json
{
  "identifier": "<stable-installation-identifier>",
  "macAddress": "<device-mac-address>",
  "name": "<device-display-name>",
  "code": "<optional-human-code>",
  "locationId": "<optional-location-id>",
  "type": "thermal",
  "connectionType": "bridge"
}
```

Regla de `identifier`:

- Debe ser estable por instalacion (persistido en disco local).
- Nunca regenerarlo por reinicio de proceso.

### 3) Como debe checkear `deviceId`

La IA debe tratar `deviceId` como identidad efectiva de sesion.

Fuente valida de `deviceId`:

1. `print.device.present.ok.device.id` (ack)
2. `print.device.presented.device.id` (evento push)

Reglas de validacion:

1. Debe existir y ser string no vacio.
2. Si llegan ambas fuentes (ack + push), deben coincidir.
3. Si no coinciden: cerrar socket, re-login, reintentar presentacion.
4. No usar `identifier` en lugar de `deviceId` para ACK/RESULT.
5. Toda emision `print.job.ack` y `print.job.result` debe incluir ese `deviceId`.

Pseudoflujo obligatorio:

1. Login HTTP.
2. Conectar WS con token.
3. Emitir `print.device.present`.
4. Esperar `deviceId` valido.
5. Emitir `subscribe` con `deviceId`.
6. Emitir `print.devices.active.report` con `deviceId`.
7. Procesar jobs.

### 4) WS que SI usa el cliente WPF

Eventos cliente -> servidor:

- `print.device.present`
- `subscribe`
- `print.devices.active.report`
- `print.job.ack`
- `print.job.result`
- `print.auth.logout` (opcional)

Eventos servidor -> cliente:

- `print.device.presented`
- `print.job.dispatch`
- `print.job.updated`
- `print.job.log.created`
- `print.devices.active.updated`

Reglas de procesamiento de job:

1. Al recibir `print.job.dispatch`, enviar `print.job.ack` inmediato.
2. Ejecutar impresion local.
3. Enviar `print.job.result` final con `status` en: `success`, `warning`, `error`.
4. Incluir siempre `jobId` y `deviceId` correctos.

### 5) Formato de presentacion para otra IA (resumen corto)

Usar este bloque literal como contrato minimo:

```yaml
integration_mode: printer-client
http:
  login:
    method: POST
    path: /api/auth/login
    body:
      identifier: <tenantSlug>
      password: <tenantApiKey>
  logout:
    method: POST
    path: /api/auth/printer/logout
ws:
  namespace: /print
  auth:
    token: <accessToken>
  emit:
    - print.device.present
    - subscribe
    - print.devices.active.report
    - print.job.ack
    - print.job.result
  on:
    - print.device.presented
    - print.job.dispatch
device_identity:
  source_events:
    - print.device.present.ok.device.id
    - print.device.presented.device.id
  rules:
    - must_be_non_empty
    - ack_and_push_must_match
    - use_deviceId_for_ack_and_result
```

## Cambio clave de arquitectura

Ahora existen dos tipos de sesion:

- `admin`: para gestionar catalogo y configuraciones (protegido)
- `tenant` (scope `printer-client`): para cliente WPF de impresora

Y para negocio externo quedaron solo endpoints publicos de impresion:

- `GET /api/public/print/devices?tenantSlug=...`
- `POST /api/public/print/submit`

## Pregunta central: como sabe WPF su deviceId

Regla de oro:

1. WPF define un `identifier` estable por instalacion (no cambia entre reinicios)
2. WPF envia ese `identifier` con `print.device.present`
3. El backend busca `tenantId + identifier`
4. Si existe, regresa el mismo `deviceId`
5. Si no existe, crea el dispositivo y regresa un `deviceId` nuevo

Entonces, tu app no necesita inventar `deviceId`.
Solo debe mantener estable el `identifier`.

## Requisitos

- .NET 6 o superior
- WPF
- Conectividad saliente HTTPS/WSS hacia Print Hub
- Credenciales de tenant:
  - `identifier` para login HTTP: `tenantSlug`
  - `password` para login HTTP: `tenant apiKey`
- Seguridad:
  - el apiKey se entrega una sola vez al crear/rotar tenant
  - en base de datos solo se guarda hash

## Endpoints y eventos usados por WPF

HTTP:

- `POST /api/auth/login` (unificado)
- `POST /api/auth/printer/logout`

WS namespace:

- `/print`

WS cliente -> servidor:

- `print.device.present`
- `subscribe`
- `print.devices.active.report`
- `print.job.ack`
- `print.job.result`
- `print.auth.logout` (opcional)

WS servidor -> cliente:

- `print.device.presented`
- `print.job.dispatch`
- `print.job.updated`
- `print.job.log.created`
- `print.devices.active.updated`

## Flujo recomendado WPF (bridge)

1. Login HTTP por `POST /api/auth/login` con credenciales tenant.
2. Validar que `principalType == tenant`.
3. Abrir WS con `auth.token = accessToken`.
4. Al conectar, emitir `print.device.present` con `identifier` estable.
5. Capturar `print.device.presented` y guardar `device.id` en memoria de sesion.
6. Emitir `subscribe` con `deviceId`.
7. Emitir `print.devices.active.report` para marcar presencia.
8. Al recibir `print.job.dispatch`, responder ACK.
9. Imprimir localmente.
10. Responder RESULT (`success`, `warning` o `error`).

## Paso 1: Login unificado

Request:

```http
POST /api/auth/login
Content-Type: application/json

{
  "identifier": "valnex",
  "password": "tenant-api-key"
}
```

Response esperada para WPF de tenant:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "principalType": "tenant",
    "tokenType": "Bearer",
    "accessToken": "<jwt>",
    "expiresAt": "2026-03-14T08:00:00.000Z",
    "tenantId": "a1f4f8fe-1111-4444-8888-0f9b4d4c1a11",
    "tenantSlug": "valnex",
    "ws": {
      "namespace": "/print",
      "auth": {
        "token": "<jwt>"
      }
    }
  }
}
```

Si recibes `principalType = admin`, no es un bridge de impresora.

## Paso 2: Identifier estable por instalacion

No uses un identifier efimero por proceso.

Recomendado:

1. En primer arranque, generar GUID local.
2. Guardarlo en archivo local protegido (ejemplo ProgramData).
3. Reusar siempre ese valor.

Ejemplo de valor final:

- `WPF-FRONT-01`
- `WPF-<MachineName>-<GuidPersistido>`

## Paso 3: Conexion WS + presentacion de dispositivo

Payload de presentacion:

```json
{
  "identifier": "WPF-FRONT-01",
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "name": "Front Desk Printer",
  "code": "front-desk",
  "locationId": "optional-location-id",
  "type": "thermal",
  "connectionType": "bridge"
}
```

Respuesta/logica esperada:

- `print.device.present.ok` (ack del request)
- `print.device.presented` (evento push)

En ambos llega `device.id`.
Ese `device.id` es el que debes usar en `subscribe`, `ack` y `result`.

## Ejemplo .NET WPF (conceptual)

```csharp
using SocketIOClient;
using System.Net.Http.Json;

public class PrintHubClient
{
    private readonly HttpClient _http;
    private SocketIO? _socket;
    private string _tenantId = string.Empty;
    private string _deviceId = string.Empty;
    private string _token = string.Empty;

    public PrintHubClient(HttpClient http)
    {
        _http = http;
    }

    public async Task LoginTenantAsync(string baseUrl, string tenantSlug, string apiKey)
    {
        var resp = await _http.PostAsJsonAsync($"{baseUrl}/api/auth/login", new
        {
            identifier = tenantSlug,
            password = apiKey
        });

        resp.EnsureSuccessStatusCode();
        var body = await resp.Content.ReadFromJsonAsync<AuthEnvelope>();

        if (body?.Data is null || body.Data.PrincipalType != "tenant")
            throw new InvalidOperationException("Login no corresponde a tenant printer-client");

        _token = body.Data.AccessToken;
        _tenantId = body.Data.TenantId;
    }

    public async Task ConnectWsAsync(string baseUrl)
    {
        _socket = new SocketIO($"{baseUrl}/print", new SocketIOOptions
        {
            Auth = new Dictionary<string, string> { ["token"] = _token },
            Reconnection = true,
            ReconnectionAttempts = 20,
            ReconnectionDelay = 2000
        });

        _socket.OnConnected += async (_, _) =>
        {
            var identifier = LoadOrCreateStableIdentifier();

            await _socket.EmitAsync("print.device.present", new
            {
                identifier,
                name = Environment.MachineName,
                connectionType = "bridge"
            });
        };

        _socket.On("print.device.presented", async res =>
        {
            var presented = res.GetValue<DevicePresentedEnvelope>();
            _deviceId = presented.Device.Id;

            await _socket!.EmitAsync("subscribe", new { deviceId = _deviceId });
            await _socket.EmitAsync("print.devices.active.report", new
            {
                deviceIds = new[] { _deviceId }
            });
        });

        _socket.On("print.job.dispatch", async res =>
        {
            var job = res.GetValue<DispatchJob>();
            await HandleDispatchAsync(job);
        });

        await _socket.ConnectAsync();
    }

    private async Task HandleDispatchAsync(DispatchJob job)
    {
        if (_socket == null) return;

        await _socket.EmitAsync("print.job.ack", new
        {
            jobId = job.Id,
            deviceId = _deviceId,
            message = "Job received"
        });

        try
        {
            await PrintLocalAsync(job);

            await _socket.EmitAsync("print.job.result", new
            {
                jobId = job.Id,
                deviceId = _deviceId,
                status = "success",
                code = "PRINT_OK",
                message = "Printed successfully"
            });
        }
        catch (Exception ex)
        {
            await _socket.EmitAsync("print.job.result", new
            {
                jobId = job.Id,
                deviceId = _deviceId,
                status = "error",
                code = "PRINT_ERROR",
                message = ex.Message
            });
        }
    }

    private string LoadOrCreateStableIdentifier()
    {
        // Persistir y reusar siempre el mismo valor por instalacion.
        return $"WPF-{Environment.MachineName}";
    }

    private Task PrintLocalAsync(DispatchJob job)
    {
        // Integrar spooler/driver real.
        return Task.CompletedTask;
    }
}

public record AuthEnvelope(AuthData? Data);
public record AuthData(string PrincipalType, string AccessToken, string TenantId);
public record DispatchJob(string Id, string DocumentType, string Format, object Payload);
public record DevicePresentedEnvelope(DevicePresented Device);
public record DevicePresented(string Id, string Name, string Code);
```

## Flujo para backend de negocio (publico)

Tu ERP/POS/ecommerce ya no necesita usar endpoints admin para imprimir.

Regla obligatoria para tickets `escpos`:

- `payload` debe ser objeto con propiedad `jobs`.
- `payload.jobs` debe ser array no vacio.
- Comandos soportados: `text`, `image`, `feed`, `cut`.

1. Consultar impresoras disponibles:

```http
GET /api/public/print/devices?tenantSlug=valnex
```

2. Enviar impresion (crea y despacha):

```http
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
        "type": "text",
        "value": "SALIDA\\n",
        "align": "center",
        "bold": true,
        "width": 1,
        "height": 1
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
  "printerCode": "front-desk",
  "requestId": "REQ-10025",
  "externalId": "ORDER-10025"
}
```

## Seguridad operativa recomendada

- Guardar JWT en memoria (no en disco).
- Rehacer login antes de expiracion.
- En cierre de app, logout:
  - `POST /api/auth/printer/logout` con Bearer token, o
  - `print.auth.logout` por WS.
- TLS obligatorio en todos los entornos (HTTPS/WSS).

## Errores comunes y solucion

- `Missing bearer token` en endpoints protegidos:
  - falta Authorization Bearer o token expirado.
- `Invalid token scope`:
  - intentaste endpoint admin con token tenant o viceversa.
- `tenant_mismatch` en ACK/RESULT:
  - job o token pertenece a tenant diferente.
- `No available printer for tenant` en submit publico:
  - no hay impresora online/busy para ese tenant.

## Checklist QA minima

- Login unificado devuelve `principalType = tenant` para WPF.
- Conexion WS y presentacion de dispositivo OK.
- `deviceId` recuperado correctamente en `print.device.presented`.
- `print.job.dispatch` recibido por WPF.
- ACK y RESULT recibidos por backend.
- Flujo publico `devices -> submit -> printed/failed` OK.
