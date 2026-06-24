# Session Notes — Altuwijri Ticket System

## Project Overview
Angular 20 + ASP.NET Core 10 + SQL Server + IIS
- Frontend: `frontend/` → IIS TaskFlowWeb port 8080
- Backend API: `backend/` → IIS TaskFlowApi port 8081
- Deploy script: `deploy/Redeploy-Api.ps1` (run as Administrator)

---

## Phase 1 — Core System
- Clean layered backend: Domain / Application / Infrastructure / Api
- EF Core 10 code-first migrations, SQL Server
- JWT Bearer + rotating refresh tokens, BCrypt password hashing
- Roles: Admin, Manager, Technician, Viewer
- Angular 20 standalone components with signals API
- Features: Tasks (CRUD), Projects, Users, Kanban Board, Dashboard, Notifications

## Phase 2 — UI & Feature Enhancements
- Mobile-first responsive layout, off-canvas dismissible sidebar
- Area → Branch hierarchy (org chart)
- File and URL attachments (upload, thumbnail preview, download)
- Printable reports: Branch, Area, Technician, Date-range
- Pie charts added to dashboard and reports
- Real-time support chat (poll every 5s): Conversations + thread view

## Phase 3 — Employee Role
New role "Employee" under each branch:
- Can submit service-request tickets (auto-assigns to first active project)
- Selects technician, title, priority, description; uploads files/URLs
- Only sees their own tickets (backend: `ReporterId == userId` filter)
- Employee-specific nav: My Tickets, My Reports
- Employee reports: All Tickets | By Period | Single Ticket
- Backend: Incremental seeder adds Employee role + emp1/emp2 demo users without touching existing data
- Demo: emp1 (Emma Employee, Downtown, Emp@123), emp2 (Eddie Employee, Harbor, Emp@123)

## Phase 4 — UI Enhancements (current session)

### Ticket Lifetime Indicator
- `shared/util.ts` → `lifetime(dueDate, status, createdAt)` returns `{kind, label, pct, color}`
- `shared/ticket-lifetime.ts` — standalone component: ⚠ pulsing red for overdue, ⏱ + progress bar for future
- Used in: task-list (Due column), task-detail (meta sidebar top)

### Arabic/English i18n
- `core/models/translations.ts` — full EN + AR dictionaries (100+ keys)
- `core/services/i18n.service.ts` — signal-based service, RTL via `document.documentElement.setAttribute('dir')`
- `core/pipes/translate.pipe.ts` — impure `| t` pipe
- CSS variable `--font-body` toggled to Cairo for Arabic
- Language persisted in `localStorage['ats_lang']`
- `index.html` — title in both languages, Cairo Google Font preloaded
- `styles.scss` — RTL rules for table, flex, sidebar
- Language toggle button in shell topbar and login page

### Type Icons
- `shared/util.ts` → `TYPE_ICONS: Record<TaskType, string>` emoji map
- 📋 Task · 🐛 Bug · 🚨 Incident · 🎫 Service Request · ⭐ Feature · 🔧 Maintenance · 🔄 Change
- Used in: task-list (type column), task-detail (type badge), task-form (type selector options), dashboard type grid

### Chip-based Tag Picker
- `shared/tag-picker.ts` — standalone component: selected tags as chips, searchable dropdown, inline "create tag"
- `@HostListener('document:click')` closes dropdown on outside click
- Replaces simple button-chips in task-form

### Dashboard Clickthrough
- `features/dashboard/dashboard.ts` — all KPI cards are `<a [routerLink]>` with `[queryParams]`
- Pie charts emit `(sliceClick)` → `Router.navigate(['/tasks'], { queryParams: {status/priority/type} })`
- Bar chart rows are also `<a routerLink>` links
- Type grid cells link to `/tasks?type=X`
- `features/tasks/task-list.ts` reads `ActivatedRoute.snapshot.queryParams` on init to pre-populate filters

### Chat: Offline Indicators + WhatsApp Ticks
- `features/chat/chat.ts` — polls `technicians()` every 5s, builds `availMap: Map<userId, isAvailable>`
- `other(c)` now returns `{name, color, available}` instead of just name/color
- Conversation list: presence dot (green=online, grey=offline), grey-tinted avatar when offline, "Offline" label
- Thread header: online/offline text status indicator
- Offline banner above composer when other party is away
- Message ticks: `m.isRead` optional field on `ChatMessage`; ✓ grey=delivered, ✓✓ green=read
- `ChatMessage.isRead?: boolean` added to models.ts

### App Rebrand
- Name: "Altuwijri Ticket System" / "نظام تذاكر التويجري"
- Logo: `<img src="assets/logo.png">` with error fallback to "ATS" text
- Shell sidebar shows logo image + brand name + dept sub-label
- Login page shows logo + app name in both languages

### Login Page
- Translated with `TranslatePipe`
- Language toggle button (🌐 AR / 🌐 EN)
- Demo accounts shown as a 2-column grid with role label + username

---

## Key Files Changed (Phase 4)

```
frontend/src/index.html                                  — title, Cairo font
frontend/src/styles.scss                                 — RTL rules, --font-body
frontend/src/app/core/models/translations.ts             — full EN+AR dictionary
frontend/src/app/core/models/models.ts                   — ChatMessage.isRead added
frontend/src/app/core/services/i18n.service.ts           — signal-based i18n
frontend/src/app/core/pipes/translate.pipe.ts            — impure | t pipe
frontend/src/app/shared/util.ts                          — TYPE_ICONS, typeIcon(), lifetime()
frontend/src/app/shared/ticket-lifetime.ts               — TicketLifetime component
frontend/src/app/shared/ticket-lifetime.scss
frontend/src/app/shared/tag-picker.ts                    — chip tag picker
frontend/src/app/shared/tag-picker.scss
frontend/src/app/shared/pie-chart.ts                     — sliceClick Output added
frontend/src/app/shared/pie-chart.scss                   — .clickable styles
frontend/src/app/layout/shell.ts                         — i18n, logo, lang toggle, RTL dir
frontend/src/app/layout/shell.scss                       — RTL sidebar rules, lang-btn
frontend/src/app/features/auth/login.ts                  — i18n, logo, demo grid
frontend/src/app/features/auth/login.scss                — demo-grid, logo-img, lang-btn-login
frontend/src/app/features/dashboard/dashboard.ts         — clickable charts, pie sliceClick
frontend/src/app/features/dashboard/dashboard.scss       — type-grid, link-row, chart-hint
frontend/src/app/features/tasks/task-list.ts             — queryParam init, TicketLifetime, i18n
frontend/src/app/features/tasks/task-detail.ts           — TicketLifetime in meta, i18n
frontend/src/app/features/tasks/task-form.ts             — TagPicker, type icons, i18n
frontend/src/app/features/chat/chat.ts                   — offline indicators, message ticks
frontend/src/app/features/chat/chat.scss                 — presence-dot, ticks, offline styles
```

---

## Deployment Notes

### IIS (must run as Administrator)
```powershell
# Deploy API
powershell -ExecutionPolicy Bypass -File deploy/Redeploy-Api.ps1

# Deploy Frontend (after npm run build)
# dist output: frontend/dist/taskflow/browser/
# Copy to IIS physical path for TaskFlowWeb
```

### Frontend Build
```bash
cd frontend
npm run build
# Output: frontend/dist/taskflow/browser/
```

### Database
- SQL Server, connection string in `backend/src/TaskFlow.Api/appsettings.json`
- Seeder runs at startup (incremental — safe to re-run)
- Migrations: `cd backend && dotnet ef database update`

---

## Architecture Notes

### Backend
```
TaskFlow.Domain          — entities, enums, value objects
TaskFlow.Application     — CQRS-style services, DTOs, interfaces
TaskFlow.Infrastructure  — EF Core DbContext, repositories, seeder
TaskFlow.Api             — Controllers, JWT middleware, startup
```

### Frontend
```
core/models/            — TypeScript interfaces, enums, translations
core/services/          — HTTP services, auth, i18n
core/pipes/             — TranslatePipe (impure)
shared/                 — reusable components (PieChart, TicketLifetime, TagPicker)
features/               — lazily-loaded page components
layout/                 — Shell (sidebar + topbar)
```

---

*Last updated: 2026-06-22*
