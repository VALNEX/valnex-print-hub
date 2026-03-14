# 09 - Integracion Completa con Cliente .NET WPF

## Objetivo

Esta guia explica como integrar de punta a punta:

- backend de impresion (este proyecto NestJS)
- cliente de impresoras en .NET WPF
- backend solicitante que crea trabajos de impresion

Incluye login, conexion en tiempo real, consumo de eventos, ACK/RESULT y envio de trabajos para imprimir.

## Escenario recomendado

Componentes:

1. Backend Print Hub (este proyecto)
2. Cliente WPF en cada sede o equipo con impresoras
3. Backend de negocio (ERP/POS/ecommerce) que solicita imprimir

Flujo:

1. Cliente WPF hace login de impresora por HTTP
2. Cliente WPF abre WS con token JWT en handshake
3. Cliente WPF presenta su dispositivo (identifier) y recibe/recupera deviceId
4. Backend de negocio crea print job por HTTP con tenantId
5. Backend de negocio dispara dispatch por HTTP
6. Cliente WPF recibe print.job.dispatch
7. Cliente WPF responde ACK
8. Cliente WPF imprime localmente
9. Cliente WPF responde RESULT

## Requisitos

- .NET 6 o superior
- WPF
- Conectividad saliente HTTPS/WSS hacia el Print Hub
- Credenciales por tenant:
  - username: tenant slug
  - password: tenant apiKey
- Seguridad de credenciales:
  - el apiKey se entrega en claro una sola vez al crear tenant
  - en base de datos se almacena solo el hash del apiKey

## Endpoints y eventos usados

HTTP:

- POST /api/auth/printer/login
- POST /api/auth/printer/logout
- POST /api/print-jobs
- POST /api/print-jobs/:id/dispatch

WS namespace:

- /print

WS eventos cliente -> servidor:

- subscribe
- print.devices.active.report
- print.devices.active.get
- print.job.ack
- print.job.result
- print.auth.logout (opcional)

WS eventos servidor -> cliente:

- print.job.dispatch
- print.job.updated
- print.job.log.created
- print.devices.active.updated

## Paso 1: Login del cliente WPF

Request:

```http
POST /api/auth/printer/login
Content-Type: application/json

{
  "username": "tenant-slug",
  "password": "tenant-api-key"
}
```

Response esperada:

```json
{
  "success": true,
  "message": "Printer login successful",
  "data": {
    "tokenType": "Bearer",
    "accessToken": "<jwt>",
    "expiresAt": "2026-03-14T08:00:00.000Z",
    "tenantId": "a1f4f8fe-1111-4444-8888-0f9b4d4c1a11",
    "tenantSlug": "tenant-slug",
    "ws": {
      "namespace": "/print",
      "auth": {
        "token": "<jwt>"
      }
    }
  }
}
```

Guardar en memoria segura del cliente:

- accessToken
- expiresAt
- tenantId

## Paso 3: Presentar dispositivo y obtener deviceId de sesion

Una vez conectado por WS, el cliente presenta su identidad fisica/logica con `identifier`.
El backend:

- si existe un dispositivo para ese tenant+identifier: devuelve ese deviceId
- si no existe: lo crea y devuelve el nuevo deviceId

Evento cliente -> servidor:

`print.device.present`

Payload:

```json
{
  "identifier": "WPF-FRONT-01",
  "name": "Front Desk Printer",
  "code": "front-desk",
  "locationId": "optional-location-id",
  "type": "thermal",
  "connectionType": "bridge"
}
```

Respuesta esperada:

```json
{
  "event": "print.device.present.ok",
  "tenantId": "a1f4f8fe-1111-4444-8888-0f9b4d4c1a11",
  "device": {
    "id": "device-id",
    "name": "Front Desk Printer",
    "code": "front-desk-1234abcd",
    "status": "unknown"
  }
}
```

Adicionalmente, el servidor emite al cliente autenticado:

- `print.device.presented`

Ese evento trae el mismo `device.id` para que el cliente lo guarde en memoria de sesion.

## Paso 2: Conexion WS con handshake JWT

El gateway valida token en handshake. Si no existe o es invalido, desconecta.

Ejemplo con Socket.IO client para .NET (conceptual):

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

    public async Task LoginAsync(string baseUrl, string username, string password)
    {
        var loginResponse = await _http.PostAsJsonAsync($"{baseUrl}/api/auth/printer/login", new
        {
            username,
        password
        });

        loginResponse.EnsureSuccessStatusCode();

        var body = await loginResponse.Content.ReadFromJsonAsync<LoginEnvelope>();
        if (body == null || body.Data == null)
            throw new InvalidOperationException("Invalid login response");

        _token = body.Data.AccessToken;
        _tenantId = body.Data.TenantId;
    }

    public async Task ConnectWsAsync(string baseUrl)
    {
        _socket = new SocketIO($"{baseUrl}/print", new SocketIOOptions
        {
            Auth = new Dictionary<string, string>
            {
                ["token"] = _token
            },
            Reconnection = true,
            ReconnectionAttempts = 20,
            ReconnectionDelay = 2000
        });

        _socket.OnConnected += async (_, _) =>
        {
          var machineIdentifier = BuildMachineIdentifier();

          await _socket.EmitAsync("print.device.present", new
          {
            identifier = machineIdentifier,
            name = Environment.MachineName,
            connectionType = "bridge"
          });
        };

        _socket.On("print.device.presented", async res =>
        {
          var presented = res.GetValue<DevicePresentedEnvelope>();
          _deviceId = presented.Device.Id;

          await _socket!.EmitAsync("subscribe", new
          {
            deviceId = _deviceId
          });

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

    private string BuildMachineIdentifier()
    {
      return $"WPF-{Environment.MachineName}";
    }

    private async Task HandleDispatchAsync(DispatchJob job)
    {
        if (_socket == null) return;

        await _socket.EmitAsync("print.job.ack", new
        {
            jobId = job.Id,
            deviceId = _deviceId,
            message = "Job received by WPF client"
        });

        try
        {
            // Aqui llamas tu motor real de impresion local.
            // Ejemplo: spooler, driver ESC/POS, impresora de red, etc.
            await PrintLocalAsync(job);

            await _socket.EmitAsync("print.job.result", new
            {
                jobId = job.Id,
                deviceId = _deviceId,
                status = "success",
                code = "PRINT_OK",
                message = "Printed successfully",
                raw = new { source = "wpf", ts = DateTimeOffset.UtcNow }
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

    private Task PrintLocalAsync(DispatchJob job)
    {
        // Implementacion local de impresion.
        return Task.CompletedTask;
    }
}

public record LoginEnvelope(LoginData? Data);
public record LoginData(string AccessToken, string TenantId);
public record DispatchJob(string Id, string DocumentType, string Format, object Payload);
public record DevicePresentedEnvelope(DevicePresented Device);
public record DevicePresented(string Id, string Name, string Code);
```

## Paso 4: Envio de impresion desde backend de negocio

Importante: este endpoint NO requiere sesion hoy. Debe enviar tenantId en payload.

### 3.1 Crear print job

```http
POST /api/print-jobs
Content-Type: application/json

{
  "tenantId": "a1f4f8fe-1111-4444-8888-0f9b4d4c1a11",
  "documentType": "ticket",
  "format": "escpos",
  "payload": {
    "lines": [
      "VENTA #10025",
      "TOTAL: 249.00"
    ]
  },
  "requestId": "REQ-10025",
  "externalId": "ORDER-10025",
  "contentHash": "sha256:..."
}
```

### 3.2 Hacer dispatch

```http
POST /api/print-jobs/{jobId}/dispatch
```

Notas:

- Si el job no tiene printerId asignado, dispatch devuelve error.
- Si ya estaba sent/processing/printed, no lo redispara.

## Mapeo recomendado WPF -> backend

### Evento de entrada al cliente

print.job.dispatch:

- id
- tenantId
- printerId
- documentType
- format
- copies
- payload

### Evento de salida del cliente

print.job.ack:

- jobId (requerido)
- deviceId (recomendado)
- message (opcional)

print.job.result:

- jobId (requerido)
- deviceId (recomendado)
- status: success | warning | error
- code (opcional)
- message (opcional)
- raw (opcional JSON)

## Si tu cliente WPF ya trae un servidor interno

Si tu WPF ya recibe peticiones locales en su propio servidor interno (por ejemplo HTTP local), puedes mantenerlo y adaptar asi:

1. WPF recibe print.job.dispatch via WS
2. WPF traduce el payload a su API local interna
3. API local imprime
4. WPF responde ACK/RESULT al Print Hub

Ventaja:

- No rompes tu arquitectura existente de motor local
- El Print Hub sigue siendo orquestador y auditor

## Reintentos y resiliencia

- Si no se envia ACK a tiempo, el backend mueve el job a retrying o failed segun intentos.
- Mantener reconexion WS activa en WPF.
- Reportar print.devices.active.report tras reconexion.

## Seguridad operativa recomendada

- Guardar token solo en memoria (evitar disco).
- Renovar login antes de expiracion.
- En logout o cierre de app, llamar:
  - WS: print.auth.logout o
  - HTTP: POST /api/auth/printer/logout con Bearer token
- Forzar TLS en todos los entornos (HTTPS/WSS).

## Prueba de integracion minima

1. Login exitoso de WPF.
2. Conexion WS y subscribe.
3. Create job con tenantId.
4. Dispatch job.
5. ACK recibido por backend.
6. RESULT success recibido por backend.
7. Verificar estado final printed.
8. Verificar logs en print-job-logs.

## Errores comunes y solucion

- Missing auth token en WS:
  - No enviaste auth.token en handshake.
- tenant_mismatch en ACK/RESULT:
  - Token pertenece a otro tenant o job equivocado.
- invalid_state_transition en RESULT:
  - Enviaste resultado fuera de secuencia (ejemplo antes de sent/processing).
- dispatch sin impresora:
  - El job no tiene printerId asignado.

## Checklist de salida a QA

- Login WPF OK
- Reconexion WS OK
- Reporte de activos OK
- ACK/RESULT OK
- Flujo completo create -> dispatch -> printed OK
- Manejo de error local -> failed OK
- Sin duplicados con requestId/externalId/contentHash OK
