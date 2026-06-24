# Altuwijri Ticket System (ATS)
### نظام تذاكر التويجري

> **Last updated:** 2026-06-24  
> Full-stack IT task management system built for the Altuwijri IT Department.  
> Supports ticket lifecycle management, role-based workflows, SLA tracking, bilingual UI (Arabic / English), and automatic notifications via Email and WhatsApp.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 20 — standalone components, signals, lazy routes, SCSS |
| Backend | ASP.NET Core 10 Web API — Clean Architecture (Domain / Application / Infrastructure / API) |
| Database | SQL Server 2022 — EF Core 10, code-first migrations, auto-seeded |
| Auth | JWT access tokens + rotating refresh tokens, BCrypt password hashing |
| Hosting | IIS on Windows — Frontend: port **8080** · API: port **8081** |
| Email | Gmail SMTP with App Password |
| WhatsApp | Twilio WhatsApp API (sandbox) |

---

## User Roles

| Role | Capabilities |
|---|---|
| **Admin** | Full access — manage users, projects, org structure, all tickets |
| **Manager** | Create/assign tickets, set due dates, approve Done / Cancelled |
| **Technician** | View assigned tickets only; accept, update progress, submit for review |
| **Employee** | Submit service requests; view only their own tickets and reports |
| **Viewer** | Read-only access to tasks and reports |

> Technicians **cannot** close tickets. They submit for review and a Manager/Admin marks it Done.

---

## Features

### Ticket Lifecycle

| Status | Description |
|---|---|
| Backlog | Newly created, not yet scheduled |
| To Do | Assigned and ready to start |
| In Progress | Technician actively working |
| In Review | Work complete, awaiting manager approval |
| Blocked | Waiting on external dependency |
| Done | Closed by manager |
| Cancelled | Abandoned |

**Ticket attributes:** Type · Priority · Project · Branch · Assignee · Due Date · SLA Date · Estimated Hours · Actual Hours · Progress % · Tags · Subtasks · Attachments · Comments

**Types:** Task · Bug · Incident · Service Request · Feature · Maintenance · Change

**Priorities:** Low · Medium · High · Critical

### SLA & Working Hours

- Countdown uses **working hours only: 9:00 AM – 6:00 PM, every day**
- Due date time anchored at **18:00** (end of working day)
- Progress bar reference = ticket acceptance timestamp or start-work timestamp
- **Validation:** due date ≥ creation date; SLA date ≥ due date

| Lifetime bar color | Condition |
|---|---|
| 🟢 Green | > 3 working days remaining |
| 🟡 Yellow | < 3 working days |
| 🟠 Amber | < 1 working day |
| 🔴 Red | < 1 working hour, or overdue |

### Technician Workflow

1. Manager/Admin creates and assigns ticket → Technician sees it in their panel
2. Technician clicks **Accept Ticket** → modal: enter estimated hours, confirm/set due date and SLA date; status moves to *In Progress*; start timestamp captured
3. Technician updates **Progress %** and **Actual Hours** during work
4. Technician clicks **Submit for Review** → status = *In Review*, progress ≥ 90%
5. Manager/Admin reviews and marks **Done**

### Notifications

On every ticket assignment (create or reassign):

1. **In-app** — bell icon with unread badge; clicking a notification navigates to the ticket
2. **Email** — HTML email via Gmail SMTP to the technician's registered email
3. **WhatsApp** — Twilio message to the technician's phone number; falls back to `FallbackPhone` if no phone stored

### Handler Workflow (Admin / Manager)

1. Admin/Manager clicks **Accept & Assign** on a new ticket
2. Modal: select assignee, set status, due date, SLA date, estimated hours
3. Ticket moves to *To Do* and notifications fire

### Other Features

- **Bilingual UI** — Arabic (RTL, Cairo font) and English, switchable at runtime per session
- **`dir="auto"`** on ticket titles — English text left-aligned even in RTL mode
- **Kanban board** — drag-and-drop between status columns; project filter
- **List view** — search, multi-filter (status, priority, type, project, branch, assignee, overdue), sortable columns, pagination
- **Dashboard** — KPI cards, pie/donut charts (by status / priority / type), bar charts, 7-day sparkline; role-scoped data
- **Organization hierarchy** — Areas → Branches; tickets scoped to branch; branch defaults from reporter
- **Reports** — per-branch, per-area, organization-wide, technician productivity, date-range; printable
- **Live chat** — ticket issuers chat with available technician; availability toggled from topbar
- **Activity log** — per-ticket audit trail
- **Responsive** — off-canvas sidebar drawer on mobile

---

## Repository Layout

```
Cloude/
├─ backend/
│  └─ src/
│     ├─ TaskFlow.Domain/          # Entities, enums — zero dependencies
│     ├─ TaskFlow.Application/     # Use cases, interfaces, DTOs, validators
│     ├─ TaskFlow.Infrastructure/  # EF Core, Email, WhatsApp, Auth, Storage
│     └─ TaskFlow.Api/             # Controllers, middleware, Program.cs, appsettings.json
├─ frontend/
│  └─ src/app/
│     ├─ core/                     # Auth service, HTTP interceptor, models, translations
│     ├─ features/                 # tasks, users, projects, dashboard, chat, reports, org
│     ├─ layout/                   # Shell (topbar, sidebar, notification dropdown)
│     └─ shared/                   # TicketLifetime component, util.ts, pipes
└─ deploy/
   ├─ web/                         # IIS site root — Frontend (port 8080)
   ├─ api/                         # IIS site root — API (port 8081)
   └─ api_pub/                     # Mirror of api/ (kept in sync)
```

---

## Quick Start (Development)

**Prerequisites:** .NET 10 SDK · Node.js 20+ · SQL Server instance `.\SQL2022S`

### Backend
```powershell
cd backend/src/TaskFlow.Api
dotnet run
# API → http://localhost:5080
# Swagger → http://localhost:5080/swagger
# Database auto-created, migrations applied, demo data seeded on first run
```

### Frontend
```powershell
cd frontend
npm install
npm start
# App → http://localhost:4200  (dev proxy forwards /api/* to backend)
```

### Demo Accounts

| Username | Password | Role |
|---|---|---|
| `admin` | `Admin@123` | Admin |
| `mmanager` | `Manager@123` | Manager |
| `ttech` | `Tech@123` | Technician |
| `viewer` | `Viewer@123` | Viewer |
| `emp1` | `Emp@123` | Employee — Downtown branch |
| `emp2` | `Emp@123` | Employee — Harbor branch |

---

## Configuration

All settings live in `backend/src/TaskFlow.Api/appsettings.json` (and mirrored to `deploy/api/appsettings.json` for production).

### Database
```json
"ConnectionStrings": {
  "DefaultConnection": "Server=.\\SQL2022S;Database=TaskFlowDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=True"
},
"Database": { "AutoMigrate": true }
```

### JWT
```json
"Jwt": {
  "Key": "CHANGE-THIS-TaskFlow-Super-Secret-Key-Min-32-Chars-1234567890",
  "Issuer": "TaskFlow",
  "Audience": "TaskFlowClient",
  "AccessTokenMinutes": 60
}
```
> **Important:** Replace `Jwt:Key` with a strong random secret before any shared deployment.

### Email (Gmail SMTP)
```json
"Smtp": {
  "Host": "smtp.gmail.com",
  "Port": "587",
  "EnableSsl": "true",
  "Username": "your-email@gmail.com",
  "FromAddress": "your-email@gmail.com",
  "FromName": "Altuwijri Ticket System",
  "Password": "<gmail-app-password>",
  "AppBaseUrl": "http://127.0.0.1:8080"
}
```
Generate a Gmail App Password: **Google Account → Security → 2-Step Verification → App Passwords**

### WhatsApp (Twilio)
```json
"WhatsApp": {
  "Enabled": "true",
  "AccountSid": "<twilio-account-sid>",
  "AuthToken": "<twilio-auth-token>",
  "FromNumber": "whatsapp:+14155238886",
  "FallbackPhone": "+966XXXXXXXXX",
  "AppBaseUrl": "http://127.0.0.1:8080"
}
```

**Twilio Sandbox — one-time opt-in per recipient:**
1. Sign up at [twilio.com](https://twilio.com)
2. Go to Console → Messaging → Try it out → Send a WhatsApp message
3. Each recipient sends `join <sandbox-word>` to **+1 (415) 523-8886** on WhatsApp once
4. Confirmation message received — all future notifications arrive automatically

> For production (no opt-in): upgrade to a Twilio WhatsApp Business number (requires Meta approval).

### CORS
```json
"Cors": {
  "Origins": [
    "http://localhost:4200",
    "http://localhost:8080",
    "http://<server-ip>:8080"
  ]
}
```
Add the server's LAN IP to `Origins` when enabling network access.

---

## Build & Deploy (Production — IIS)

### 1. Build Frontend
```powershell
cd frontend
npm run build -- --configuration production
# Output: frontend/dist/taskflow/browser/
```

### 2. Deploy Frontend (port 8080)
```powershell
robocopy "frontend\dist\taskflow\browser" "deploy\web" /MIR /NFL /NDL
# Exit codes 1–3 = success. Exit code >= 8 = error.
```

### 3. Build Backend
```powershell
cd backend
dotnet publish src/TaskFlow.Api/TaskFlow.Api.csproj -c Release -o publish/api
```

### 4. Deploy API (port 8081)
Use `app_offline.htm` to release IIS file locks before copying:
```powershell
# Take site offline (IIS unloads the app, releases DLL locks)
"<h1>Updating...</h1>" | Out-File "deploy\api\app_offline.htm"
Start-Sleep -Seconds 3

# Copy new build
robocopy "backend\publish\api" "deploy\api" /E /IS /IT /NFL /NDL

# Copy also to api_pub mirror
robocopy "backend\publish\api" "deploy\api_pub" /E /IS /IT /NFL /NDL

# Bring site back online
Remove-Item "deploy\api\app_offline.htm"
```

### 5. Sync config (if changed)
```powershell
Copy-Item "deploy\api\appsettings.json" "deploy\api_pub\appsettings.json" -Force
```

### 6. Verify
```powershell
Invoke-WebRequest "http://127.0.0.1:8081/health" -UseBasicParsing
# Expected: {"status":"healthy","time":"...Z"}
```

---

## LAN Access (Network Users)

To allow other PCs on the same network to use the application:

### 1. Find server IP
```powershell
ipconfig
# Look for "Ethernet adapter" → IPv4 Address
```

### 2. Update frontend environment
Edit `frontend/src/environments/environment.prod.ts`:
```typescript
export const environment = {
  production: true,
  apiBaseUrl: 'http://<server-ip>:8081'
};
```
Then rebuild and redeploy the frontend.

### 3. Update CORS
Add `http://<server-ip>:8080` to `Cors.Origins` in `deploy/api/appsettings.json`, then recycle the API.

### 4. Open Windows Firewall
Run as Administrator:
```powershell
New-NetFirewallRule -DisplayName "ATS Frontend (8080)" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow -Profile Any -Enabled True
New-NetFirewallRule -DisplayName "ATS API (8081)"      -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow -Profile Any -Enabled True
```

### 5. ESET / Third-party Antivirus Firewall
If ESET (or any third-party AV) is installed, add inbound rules there as well:  
**ESET → Setup → Network Protection → Firewall → Rules → Add**
- Rule 1: Direction = In, Protocol = TCP, Local port = 8080, Action = Allow
- Rule 2: Direction = In, Protocol = TCP, Local port = 8081, Action = Allow

> Windows Firewall rules alone are **not sufficient** when a third-party firewall is active.

### Access URL for LAN users
```
http://<server-ip>:8080
```

---

## Logs

Serilog writes structured logs daily:
```
deploy\api\logs\taskflow-YYYYMMDD.log
```

| Log entry | Meaning |
|---|---|
| `WhatsApp sent to {Phone} for task #{Id}` | Twilio accepted the message |
| `WhatsApp send failed` | Wrong credentials, or recipient not opted in (sandbox) |
| `Email sent to {Email} for task #{Id}` | Gmail SMTP delivered successfully |
| `SMTP send failed` | Gmail App Password issue |

---

## Security Notes

- JWT key and demo passwords in this repo are for **local/demo use only** — rotate before any shared or production deployment
- Gmail App Password grants SMTP send access only — the account password is not exposed
- Twilio Auth Token grants full API access — store it in environment variables or a secrets manager in production, not in source control
- The Twilio sandbox `AccountSid` and `AuthToken` currently in `appsettings.json` are active — remove or replace before committing to a public repository

---

## Known Setup Notes

- **`npm` not in PATH** in PowerShell 7 by default — prefix with `$env:Path += ";C:\Program Files\nodejs"` or use a pre-configured terminal
- **IIS admin operations** (binding changes, app pool recycles via module) require elevation — run scripts with `Start-Process powershell -Verb RunAs`
- **Robocopy exit code 3** = success (files copied + extra old files cleaned up) — do not treat as error
- **Twilio sandbox messages** are queued instantly on the Twilio side but only delivered if the recipient has opted in; check logs to distinguish "sent" vs "not received"
