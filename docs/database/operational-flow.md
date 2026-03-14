# Flujo operativo del sistema de impresion

Este flujo esta alineado con los modelos y enums reales del schema Prisma.

## Explicacion paso a paso

### 1. El sistema externo o modulo interno manda una peticion al webhook

Puede venir desde:

- Yard
- Billing
- Maintenance
- Bascula
- Inventario

La peticion incluye cosas como:

- tenant
- origen
- ubicacion
- tipo de documento
- payload
- copias

### 2. Se identifica el tenant

El sistema valida:

- tenantId o slug
- api_key o firma
- estado del tenant

Si el tenant no existe o esta suspendido, se rechaza.

### 3. Se valida la solicitud

Se revisa que:

- el payload tenga la estructura esperada
- exista el source
- exista la location si fue enviada
- el tipo de documento sea valido
- la impresora indicada exista, si viene explicita

### 4. Se crea el print_job

Se inserta el trabajo en la base con estado inicial, normalmente:

- queued, o
- routing

Tambien se genera el primer log:

- received

### 5. Se resuelve la impresora destino

El sistema busca en print_routing_rules una coincidencia segun:

- tenant
- source
- location
- document_type

Si no encuentra una regla:

- usa impresora por defecto, o
- marca el job como failed

Eventos tipicos en esta etapa:

- routing_resolved
- routing_failed

### 6. Se asigna el dispositivo

Cuando ya se resolvio la regla:

- se guarda printer_id en print_jobs
- se registra un log tipo routing_resolved

### 7. El job entra a cola o se envia al bridge

Dependiendo de la arquitectura:

- se coloca en una cola interna
- o se manda directo a un servicio puente
- o se despacha a un worker

Eventos tipicos en esta etapa:

- sent_to_queue
- sent_to_bridge
- sent_to_printer

### 8. El bridge o worker procesa la impresion

El componente tecnico:

- transforma el payload al formato real
- envia ESC/POS, texto, imagen, ZPL, PDF, etc.
- intenta imprimir en el dispositivo correcto

### 9. Se actualiza el estado del job

Segun el resultado:

- sent cuando fue despachado al dispositivo o bridge
- printed si salio bien
- failed si hubo error
- cancelled si fue abortado

Si el job vuelve a intentarse, puede pasar por:

- retrying
- processing

Y se agregan logs tecnicos.

### 10. Se conserva la trazabilidad

Todo queda registrado para:

- auditoria
- reintentos
- soporte
- metricas
- monitoreo

## Diagrama de flujo

```mermaid
flowchart TD
    A[Webhook recibe solicitud de impresion] --> B[Validar tenant]
    B --> C{Tenant valido y activo?}

    C -- No --> C1[Rechazar solicitud]
    C1 --> C2[Registrar error o intento fallido]

    C -- Si --> D[Validar payload y datos requeridos]
    D --> E{Solicitud valida?}

    E -- No --> E1[Marcar request como invalida]
    E1 --> E2[Responder error]

    E -- Si --> F[Crear registro en print_jobs]
    F --> G[Crear log inicial en print_job_logs]
    G --> H[Buscar regla en print_routing_rules]

    H --> I{Se encontro regla de enrutamiento?}
    I -- No --> I1{Hay impresora por defecto?}
    I1 -- No --> I2[Marcar job como failed]
    I2 --> I3[Registrar log routing_failed]

    I -- Si --> J[Asignar print_device y registrar routing_resolved]
    I1 -- Si --> J

    J --> K[Enviar job a cola o bridge y registrar sent_to_queue o sent_to_bridge]
    K --> L[Worker o servicio de impresion procesa el job]
    L --> M{Impresion exitosa?}

    M -- Si --> N[Actualizar print_jobs a printed]
    N --> O[Registrar log printed]
    O --> P[Fin]

    M -- No --> Q[Actualizar print_jobs a failed]
    Q --> R[Registrar log failed]
    R --> S{Permite reintento?}

    S -- Si --> T[Reencolar job]
    T --> L

    S -- No --> U[Fin con error]
```

## Flujo resumido en una linea

Webhook -> Validacion -> Creacion del job -> Resolucion de regla -> Asignacion de impresora -> Cola/bridge -> Impresion -> Logs y estado final

## Estados y eventos reales del schema

Estados de PrintJobStatus:

- queued
- routing
- processing
- sent
- printed
- failed
- cancelled
- retrying

Eventos de PrintLogEvent:

- received
- validated
- rejected
- queued
- routing_resolved
- routing_failed
- assigned_printer
- sent_to_queue
- sent_to_bridge
- sent_to_printer
- printed
- failed
- retried
- cancelled
