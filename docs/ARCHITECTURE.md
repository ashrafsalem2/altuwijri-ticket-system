# Architecture

TaskFlow follows a pragmatic **Clean / layered architecture**. Dependencies point inward — outer layers depend on inner ones, never the reverse.

```
┌─────────────────────────────────────────────┐
│                TaskFlow.Api                   │  Controllers, middleware, JWT setup, Swagger, DI
│  (ASP.NET Core)                               │
├─────────────────────────────────────────────┤
│            TaskFlow.Infrastructure            │  EF Core DbContext, configurations, migrations,
│  (EF Core, SQL Server, BCrypt, JWT)           │  token/password/file services, seeding
├─────────────────────────────────────────────┤
│             TaskFlow.Application              │  DTOs, service interfaces + implementations,
│  (use-cases)                                  │  mapping, validation, IApplicationDbContext
├─────────────────────────────────────────────┤
│               TaskFlow.Domain                 │  Entities, enums, base types (no dependencies)
└─────────────────────────────────────────────┘
```

## Layers

### Domain (`TaskFlow.Domain`)
Pure C# entities and enums with no framework dependencies. `AuditableEntity` adds `CreatedAt/By`, `UpdatedAt/By` and `IsDeleted` (soft delete). Core entities: `User`, `Role`, `RefreshToken`, `Project`, `WorkTask`, `Comment`, `Attachment`, `Tag`/`TaskTag`, `Notification`, `ActivityLog`.

### Application (`TaskFlow.Application`)
Use-case orchestration grouped by feature (`Features/Auth`, `Features/Tasks`, …). Each feature exposes a service interface + implementation operating against `IApplicationDbContext` (the persistence abstraction). Cross-cutting concerns:
- `Common/Models/PagedResult<T>` — pagination envelope
- `Common/Exceptions` — typed `AppException`s mapped to HTTP status codes
- `Common/Mapping` — hand-written entity→DTO projections
- `Common/Authorization/Roles` — canonical role names

### Infrastructure (`TaskFlow.Infrastructure`)
- `ApplicationDbContext` implements `IApplicationDbContext`
- `IEntityTypeConfiguration<T>` classes define schema, indexes, relationships and global query filters (soft delete)
- `Auth/` — `TokenService` (JWT), `PasswordHasher` (BCrypt), `JwtSettings`
- `Storage/LocalFileStorage` — attachment persistence
- `Persistence/DatabaseSeeder` — migrate + seed baseline & demo data

### Api (`TaskFlow.Api`)
Thin controllers delegating to application services. `ApiControllerBase` centralises `[Authorize]`, routing and current-user access. `ExceptionHandlingMiddleware` converts exceptions into a consistent JSON envelope. `CurrentUserService` reads identity from JWT claims.

## Key design decisions

| Decision | Rationale |
|----------|-----------|
| `IApplicationDbContext` abstraction | Keeps application services testable and persistence-agnostic |
| Soft delete via global query filters | Preserves audit history; deletes never lose data |
| Hand-written mapping | No reflection/config surprises; fast and explicit |
| JWT + rotating refresh tokens | Stateless API, revocable sessions |
| Activity log + notifications written in the same unit of work as the change | Audit and alerts stay consistent with data |
| Enums serialized as strings | Stable, readable API contract for the Angular client |

## Request lifecycle

1. Angular sends an HTTP request with `Authorization: Bearer <jwt>`.
2. JWT middleware validates the token and populates `HttpContext.User`.
3. Controller action calls an application service.
4. Service uses `IApplicationDbContext` (EF Core) to read/write SQL Server, records `ActivityLog`/`Notification` rows where relevant, and returns DTOs.
5. Exceptions bubble to `ExceptionHandlingMiddleware`, which emits `{ status, title, traceId }`.

## Frontend architecture
Standalone Angular components organised into `core` (services, guards, interceptors, models), `features` (login, dashboard, tasks, board, projects, users) and a `layout` shell. An HTTP interceptor attaches the JWT and transparently refreshes it on 401; a route guard protects authenticated areas and enforces role-based access.
