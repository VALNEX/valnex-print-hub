# Guía del Agente Copilot para la Estructura del Proyecto

Este proyecto usa NestJS + Prisma con una estructura modular para imports cortos y mantenibles.

## 1) Estructura base

- `src/main.ts`: bootstrap de NestJS.
- `src/app.module.ts`: módulo raíz de la aplicación.
- `src/common/`: utilidades y piezas compartidas transversales.
- `src/config/`: configuración centralizada del proyecto.
- `src/infra/`: infraestructura técnica e integraciones de bajo nivel.
- `src/modules/`: módulos funcionales de negocio y módulos técnicos encapsulados.
- `src/modules/prisma/prisma.service.ts`: cliente Prisma reutilizable (`PrismaService`).
- `src/modules/prisma/prisma.module.ts`: módulo global que expone Prisma.
- `src/modules/prisma/index.ts`: barrel para imports cortos.
- `generated/prisma/`: cliente Prisma generado por `prisma generate` (gitignored, no editar).
- `prisma/schema.prisma`: esquema de base de datos.
- `prisma/migrations/`: migraciones de Prisma.
- `prisma.config.ts`: configuración del CLI de Prisma (url, schema path, migrations path).

## 2) Cómo se integra Prisma en Nest

**Prisma 7 usa el nuevo cliente TypeScript-nativo (`prisma-client` generator).**
A diferencia de versiones anteriores, el constructor requiere un driver adapter (no usa
`DATABASE_URL` env var automáticamente en runtime).

1. `PrismaService` crea un `PrismaPg` adapter con la URL del env.
2. `PrismaService` instancia `PrismaClient({ adapter })` y lo expone como `readonly client`.
3. Se conecta en `onModuleInit()` y desconecta en `onModuleDestroy()`.
4. `PrismaModule` marca `@Global()` y exporta `PrismaService`.
5. `AppModule` importa `PrismaModule` una sola vez.

Con esto, cualquier módulo/servicio puede inyectar `PrismaService` sin reconfigurar nada.

## 3) Reglas de import recomendadas

Usar siempre el barrel local para mantener imports limpios:

- En `AppModule`: `import { PrismaModule } from './modules/prisma';`
- En módulos dentro de `src/modules/<modulo>/`: `import { PrismaService } from '../prisma';`

**Nunca** importar directamente desde `generated/prisma/` en código de negocio.

## 4) Dónde va cada cosa nueva

- Nuevas entidades Prisma: en `prisma/schema.prisma`.
- Componentes reutilizables transversales: en `src/common/`.
- Configuración de módulos, env y proveedores: en `src/config/`.
- Adaptadores, clientes externos e infraestructura técnica: en `src/infra/`.
- Lógica de acceso a datos de negocio: en servicios de cada módulo (`src/modules/<modulo>/<modulo>.service.ts`) inyectando `PrismaService`.
- Configuración de conexión: variable de entorno `DATABASE_URL` en `.env`.
- Configuración del CLI de Prisma (migraciones, ruta del schema): en `prisma.config.ts`.
- Tras añadir modelos y ejecutar `prisma migrate dev`, regenerar el cliente con `prisma generate`.

## 5) Patrón para nuevos módulos de negocio

Para cada módulo nuevo (por ejemplo `orders`):

1. Crear `src/modules/orders/orders.module.ts`.
2. Crear `src/modules/orders/orders.service.ts`.
3. Crear `src/modules/orders/index.ts` (barrel).
4. Inyectar `PrismaService` en el servicio:
	```typescript
	constructor(private readonly prisma: PrismaService) {}
	// Uso:
	const orders = await this.prisma.client.order.findMany();
	```
5. Importar `OrdersModule` en `AppModule`.

## 6) Convenciones del proyecto

- Respetar la separación por capas: `common`, `config`, `infra`, `modules`.
- Todos los módulos van dentro de `src/modules/<nombre>/`.
- Mantener Prisma encapsulado en `src/modules/prisma`.
- No duplicar instancias de `PrismaClient` fuera de `PrismaService`.
- Mantener imports cortos mediante `index.ts` (barrel) por carpeta.
- El cliente Prisma se accede siempre como `prismaService.client.<modelo>.<operación>()`.
- `generated/` está gitignored; se regenera con `prisma generate` en cada entorno.
