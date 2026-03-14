# Swagger - Tenants

## Base path

- /tenants

## Endpoints

- POST /tenants: create
- POST /tenants/{id}/rotate-api-key: rotate apiKey (one-time reveal)
- GET /tenants: list with filters
- GET /tenants/{id}: detail
- PATCH /tenants/{id}: update
- DELETE /tenants/{id}: remove

## DTOs

- CreateTenantDto
- UpdateTenantDto
- TenantDto
- FilterTenantDto

## Query params sugeridos

- page
- pageSize
- q
- tenantId
- status