# Deployment Guide — Local IIS

This guide publishes TaskFlow to local IIS as two sites:

| Site | Port | Physical path | App pool |
|------|------|---------------|----------|
| `TaskFlowApi` | **8081** | `deploy\api` | `TaskFlowApiPool` (No Managed Code) |
| `TaskFlowWeb` | **8080** | `frontend\dist\taskflow\browser` | `TaskFlowWebPool` (No Managed Code) |

- **Web UI:** http://localhost:8080
- **API + Swagger:** http://localhost:8081/swagger

> This exact topology is already deployed and verified on this machine. Use the steps below to rebuild/redeploy after code changes.

## Prerequisites
- **.NET 10 SDK** and the **ASP.NET Core 10 Hosting Bundle** (provides the IIS `AspNetCoreModuleV2`)
- **Node.js 20+**
- **IIS** with the **URL Rewrite** module (the deploy script installs it automatically if missing)
- **SQL Server** reachable at `.\SQL2022S` with a `TaskFlowDb` database (created automatically on first API run)

Install the hosting bundle + Node if needed:
```powershell
winget install Microsoft.DotNet.HostingBundle.10
winget install OpenJS.NodeJS.LTS
```

## 1. Build the artifacts
```powershell
# API -> deploy\api
cd backend
dotnet publish src/TaskFlow.Api/TaskFlow.Api.csproj -c Release -o ..\deploy\api

# Angular -> frontend\dist\taskflow\browser
cd ..\frontend
npm ci
npm run build           # production build (uses environment.prod.ts -> API at :8081)
```
> The Angular SPA `web.config` (deep-link rewrite) ships in `frontend/public/` and is emitted into the build output automatically.

## 2. Publish to IIS
Run the deployment script **as Administrator**:
```powershell
cd deploy
powershell -ExecutionPolicy Bypass -File .\Deploy-IIS.ps1
```
The script is **idempotent** and will:
1. Verify the ASP.NET Core Module; install **URL Rewrite** if missing.
2. Create/refresh the two app pools (No Managed Code) and sites.
3. Grant `IIS_IUSRS` read access, and write access to `api\Logs` and `api\App_Data`.
4. Create a SQL login for `IIS APPPOOL\TaskFlowApiPool` and grant it access to `TaskFlowDb` (so Windows-auth / `Trusted_Connection` works).
5. Start the sites and run a smoke test against `/health` and the web root.

Override defaults with parameters, e.g.:
```powershell
.\Deploy-IIS.ps1 -ApiPort 9001 -WebPort 9000 -SqlInstance ".\SQLEXPRESS"
```

## 3. Verify
```powershell
curl http://localhost:8081/health           # {"status":"healthy",...}
start http://localhost:8080                  # TaskFlow UI -> sign in as admin / Admin@123
```

## Configuration notes
- **API settings** are read from `deploy\api\appsettings.json` (copied from the project). Update the connection string / `Jwt:Key` there for production.
- **Database auto-migration**: `Database:AutoMigrate=true` makes the API apply migrations and seed on startup. Set to `false` once the schema is stable, and apply migrations explicitly:
  ```powershell
  dotnet ef database update --project backend/src/TaskFlow.Infrastructure --startup-project backend/src/TaskFlow.Api
  ```
- **CORS**: the API allows `http://localhost:8080` (and `:4200` for dev). Add your real host to `Cors:Origins` in `appsettings.json`.
- **Frontend API origin**: production build targets `http://localhost:8081` (`src/environments/environment.prod.ts`). Change it and rebuild if the API host/port differs.

## Troubleshooting
| Symptom | Cause / fix |
|---------|-------------|
| `HTTP 500.19` on the web site | URL Rewrite module not installed — re-run the deploy script or install it. |
| Web `/` returns 403, `/index.html` 404 | Site physical path is not the `…\browser` folder. Fix the site's physical path. |
| API `HTTP 500.30/502.5` | App pool can't start the app — check `deploy\api\Logs\*.log` and Windows Event Viewer. |
| API `Login failed for user 'IIS APPPOOL\TaskFlowApiPool'` | SQL login/permissions missing — re-run the deploy script (step 4) or grant DB access manually. |
| First request slow / times out | Cold start runs EF migrate + seed; the app pool is set to `AlwaysRunning` to mitigate. |

## Rebuild & redeploy (after code changes)

**Frontend only** — the web site serves `frontend/dist/taskflow/browser` directly, so just rebuild:
```powershell
cd frontend; npm run build
```

**API only** — because IIS locks the running DLLs, publish to a staging folder, then run the
elevated helper which stops the app pool, copies the build in (preserving `Logs`/`App_Data`) and restarts:
```powershell
dotnet publish backend/src/TaskFlow.Api/TaskFlow.Api.csproj -c Release -o deploy/api_pub
# then, as Administrator:
powershell -ExecutionPolicy Bypass -File deploy/Redeploy-Api.ps1
```

**Full redeploy** — re-run `deploy/Deploy-IIS.ps1` (idempotent) as Administrator.
