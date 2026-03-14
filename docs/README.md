# Documentacion de Base de Datos

Esta carpeta contiene la documentacion funcional y operativa de la base de datos del sistema de impresion multi-tenant.

## Estructura

- [Diccionario de tablas](database/table-dictionary.md)
- [Flujo operativo del sistema](database/operational-flow.md)
- [Referencia tecnica de Prisma](database/prisma-reference.md)
- [Recomendaciones de evolucion](database/future-recommendations.md)

## Contexto

El sistema esta orientado a un modelo multi-tenant para gestionar solicitudes de impresion provenientes de varios modulos (yard, billing, maintenance, bascula, inventario), con enrutamiento dinamico por reglas y trazabilidad completa por job.
