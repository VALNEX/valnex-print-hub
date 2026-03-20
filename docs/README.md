# Documentacion del Proyecto

Este directorio concentra la documentacion tecnica y operativa de Valnex Print Hub.

## Estructura

- `ficha-tecnica/`: arquitectura, contratos, seguridad, operacion e integraciones.
- `database/`: referencia de modelo, tablas y lineamientos de evolucion.

## Puntos Clave Actuales

1. El flujo de autenticacion para clientes de impresora fue reemplazado por `device provisioning` con activacion de un solo uso.
2. Redis se usa para cache de lectura publica y para seguridad/sesion distribuida.
3. La presencia WS define disponibilidad online/offline en dispositivos de impresion.

## Indice Principal

- Ver `ficha-tecnica/README.md`
- Ver `database/prisma-reference.md`