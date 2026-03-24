# Ficha Tecnica

## Indice

1. [01-arquitectura.md](01-arquitectura.md)
2. [02-flujo-end-to-end.md](02-flujo-end-to-end.md)
3. [03-contratos-http.md](03-contratos-http.md)
4. [04-contratos-websocket.md](04-contratos-websocket.md)
5. [05-modelo-datos.md](05-modelo-datos.md)
6. [06-seguridad.md](06-seguridad.md)
7. [07-operacion-observabilidad.md](07-operacion-observabilidad.md)
8. [08-pruebas-checklist.md](08-pruebas-checklist.md)
9. [09-integracion-cliente-wpf.md](09-integracion-cliente-wpf.md)
10. [10-instructivo-emisor-impresion.md](10-instructivo-emisor-impresion.md)
11. [11-presentacion-y-resolucion-de-nombre.md](11-presentacion-y-resolucion-de-nombre.md)
12. [12-integracion-cliente-android-http.md](12-integracion-cliente-android-http.md)

## Cambios Relevantes de esta Version

1. Flujo de cliente impresora migrado a `device provisioning` con activacion one-time.
2. Eliminado login heredado por `tenant apiKey` para clientes de impresora.
3. Redis integrado para cache publico y seguridad distribuida.
4. Presencia WS controla estado online/offline de dispositivos.