# API Reference

Base URL (dev): `http://localhost:5080`  ·  Base URL (IIS): `http://localhost:8081`
Interactive docs: `/swagger`

All endpoints except `POST /api/auth/login`, `POST /api/auth/refresh` and `/health` require a
`Authorization: Bearer <accessToken>` header. Enums are serialized as **strings**.

## Error format
Errors return a consistent JSON envelope:
```json
{ "status": 404, "title": "Task with key '99' was not found.", "traceId": "0HN..." }
```

## Roles
`Admin` · `Manager` · `Technician` · `Viewer`. Authorization is enforced per endpoint (see "Roles" column).

---

## Auth — `/api/auth`
| Method | Route | Body | Auth | Notes |
|--------|-------|------|------|-------|
| POST | `/login` | `{ userNameOrEmail, password }` | anon | Returns `{ accessToken, refreshToken, expiresAt, user }` |
| POST | `/refresh` | `{ accessToken, refreshToken }` | anon | Rotates the refresh token |
| POST | `/logout` | `{ refreshToken }` | any | Revokes the refresh token |
| GET | `/me` | — | any | Current user profile |
| POST | `/change-password` | `{ currentPassword, newPassword }` | any | |

## Tasks — `/api/tasks`
| Method | Route | Auth (roles) | Notes |
|--------|-------|--------------|-------|
| GET | `/` | any | Query: `search, status, priority, type, projectId, assigneeId, overdue, sortBy, sortDescending, page, pageSize`. Returns `PagedResult<TaskListItem>` |
| GET | `/board?projectId=` | any | Top-level tasks for the Kanban board |
| GET | `/{id}` | any | Task detail (subtasks, tags) |
| POST | `/` | Admin, Manager, Technician | Create |
| PUT | `/{id}` | Admin, Manager, Technician | Update |
| PATCH | `/{id}/move` | Admin, Manager, Technician | `{ status, boardOrder }` — drag/drop |
| DELETE | `/{id}` | Admin, Manager | Soft delete |
| GET | `/{id}/comments` | any | |
| POST | `/{id}/comments` | Admin, Manager, Technician | `{ content }` |
| DELETE | `/comments/{commentId}` | author / Admin / Manager | |

## Projects — `/api/projects`
| Method | Route | Auth |
|--------|-------|------|
| GET | `/` , `/{id}` | any |
| POST | `/` | Admin, Manager |
| PUT | `/{id}` | Admin, Manager |
| DELETE | `/{id}` | Admin |

## Users — `/api/users`
| Method | Route | Auth |
|--------|-------|------|
| GET | `/?includeInactive=` , `/{id}` , `/roles` | any (authenticated) |
| POST | `/` | Admin |
| PUT | `/{id}` | Admin |
| DELETE | `/{id}` (deactivate) | Admin |
| POST | `/{id}/reset-password` | Admin |

> The `/users` UI route is restricted to Admin & Manager.

## Tags — `/api/tags`
`GET /` (any) · `POST /` (Admin, Manager) · `DELETE /{id}` (Admin, Manager)

## Notifications — `/api/notifications`
`GET /?unreadOnly=` · `GET /unread-count` · `POST /{id}/read` · `POST /read-all` (all: current user)

## Dashboard — `/api/dashboard`
`GET /stats` · `GET /charts` · `GET /activity?take=` (all authenticated)

## Health
`GET /health` (anon) → `{ "status": "healthy", "time": "..." }`

---

### Example: login + create a task
```bash
# 1. login
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userNameOrEmail":"admin","password":"Admin@123"}'

# 2. create a task (use the accessToken from step 1)
curl -X POST http://localhost:8081/api/tasks \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"title":"Reset VPN cert","status":"ToDo","priority":"High","type":"Incident","projectId":1}'
```
