# Recomendaciones Futuras de Base de Datos

## Objetivo

Mantener el modelo de datos simple, seguro y escalable para autenticacion de dispositivos y pipeline de impresion.

## Prioridad Alta

1. Agregar limpieza programada de `device_activation_requests` vencidas.
2. Agregar limpieza de `device_sessions` vencidas/revocadas.
3. Auditar rotacion de `device_api_keys` por politica (cada 90-180 dias).

## Prioridad Media

1. Particionar `print_jobs` y `print_job_logs` por fecha o tenant en cargas altas.
2. Agregar metricas de cardinalidad por tenant para deteccion de abuso.
3. Evaluar indice compuesto para busquedas de activaciones pendientes por tenant y fecha.

## Prioridad Baja

1. Materialized views para dashboards historicos de jobs.
2. Archivado automatico de logs operativos de larga data.

## Redis y Persistencia

1. Redis se usa para cache y seguridad transitoria, no como fuente primaria de verdad.
2. Toda decision de negocio critica debe persistir en Postgres.
3. Las claves Redis deben tener TTL definido y politica de invalidacion clara.