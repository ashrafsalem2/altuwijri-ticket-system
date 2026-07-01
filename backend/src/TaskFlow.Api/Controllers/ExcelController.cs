using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskFlow.Application.Common.Authorization;
using TaskFlow.Application.Common.Interfaces;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;

namespace TaskFlow.Api.Controllers;

public record ImportResult(int Imported, int Updated, int Failed, List<string> Errors);

[Authorize]
[Route("api/excel")]
public class ExcelController(IApplicationDbContext db, IPasswordHasher hasher) : ApiControllerBase
{
    // ──────────────────── USERS ────────────────────

    [Authorize(Roles = Roles.Admin)]
    [HttpGet("users/template")]
    public async Task<IActionResult> UsersTemplate(CancellationToken ct)
    {
        var branches = await db.Branches
            .Where(b => !b.IsDeleted)
            .OrderBy(b => b.Name)
            .Select(b => b.Name)
            .ToListAsync(ct);

        var departments = await db.Departments
            .Where(d => !d.IsDeleted)
            .OrderBy(d => d.Name)
            .Select(d => d.Name)
            .ToListAsync(ct);

        using var wb = new XLWorkbook();

        // Hidden lookup sheets
        AddLookupSheet(wb, "_Roles", ["Admin", "Manager", "Technician", "Employee"]);
        AddLookupSheet(wb, "_Branches", branches);
        AddLookupSheet(wb, "_Departments", departments);

        var ws = wb.AddWorksheet("Users");

        var cols = new[]
        {
            ("FullName",       true),
            ("Email",          true),
            ("Username",       false),
            ("Password",       true),
            ("Role",           true),
            ("JobTitle",       false),
            ("BranchName",     false),
            ("DepartmentName", false),
            ("Phone",          false)
        };

        WriteHeaders(ws, cols,
            required: XLColor.FromHtml("#6b1a1a"),
            optional: XLColor.FromHtml("#374151"));

        ws.Cell(2, 1).Value = "Ahmed Al-Rashidi";
        ws.Cell(2, 2).Value = "ahmed@example.com";
        ws.Cell(2, 3).Value = "ahmed.rashidi";
        ws.Cell(2, 4).Value = "Pass@1234";
        ws.Cell(2, 5).Value = "Employee";
        ws.Cell(2, 6).Value = "IT Support";
        ws.Cell(2, 7).Value = branches.FirstOrDefault() ?? "Riyadh Branch";
        ws.Cell(2, 8).Value = departments.FirstOrDefault() ?? "IT Department";
        ws.Cell(2, 9).Value = "0501234567";
        StyleExampleRow(ws, cols.Length, "#fef9f9");

        AddDropdown(ws, "E2:E10000", "_Roles",       4);
        AddDropdown(ws, "G2:G10000", "_Branches",    branches.Count);
        AddDropdown(ws, "H2:H10000", "_Departments", departments.Count);

        ws.Column(1).Width = 26; ws.Column(2).Width = 30; ws.Column(3).Width = 20;
        ws.Column(4).Width = 20; ws.Column(5).Width = 18; ws.Column(6).Width = 22;
        ws.Column(7).Width = 26; ws.Column(8).Width = 24; ws.Column(9).Width = 18;
        ws.SheetView.FreezeRows(1);

        return ExcelFile(wb, "users-import-template.xlsx");
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpGet("users/export")]
    public async Task<IActionResult> ExportUsers(CancellationToken ct)
    {
        var branches = await db.Branches
            .Where(b => !b.IsDeleted)
            .OrderBy(b => b.Name)
            .ToListAsync(ct);

        var departments = await db.Departments
            .Where(d => !d.IsDeleted)
            .OrderBy(d => d.Name)
            .ToListAsync(ct);

        var roles = await db.Roles.ToListAsync(ct);

        var users = await db.Users
            .IgnoreQueryFilters()
            .Where(u => !u.IsDeleted)
            .OrderBy(u => u.FullName)
            .ToListAsync(ct);

        using var wb = new XLWorkbook();

        AddLookupSheet(wb, "_Roles", ["Admin", "Manager", "Technician", "Employee"]);
        AddLookupSheet(wb, "_Branches", branches.Select(b => b.Name).ToList());
        AddLookupSheet(wb, "_Departments", departments.Select(d => d.Name).ToList());
        AddLookupSheet(wb, "_Active", ["TRUE", "FALSE"]);

        var ws = wb.AddWorksheet("Users");

        // Header row
        WriteIdHeader(ws);
        var headers = new[]
        {
            ("FullName",       true),
            ("Email",          true),
            ("Username",       false),
            ("Password",       false),
            ("Role",           true),
            ("BranchName",     false),
            ("DepartmentName", false),
            ("JobTitle",       false),
            ("Phone",          false),
            ("IsActive",       false),
        };
        WriteHeaders(ws, headers,
            required: XLColor.FromHtml("#6b1a1a"),
            optional: XLColor.FromHtml("#374151"),
            colOffset: 1);

        // Modify Username and Password header labels
        ws.Cell(1, 4).Value = "Username (read-only)";
        ws.Cell(1, 5).Value = "Password (new rows only)";

        int dataRows = users.Count;
        for (int i = 0; i < users.Count; i++)
        {
            var u = users[i];
            int row = i + 2;
            ws.Cell(row, 1).Value = u.Id;
            ws.Cell(row, 2).Value = u.FullName;
            ws.Cell(row, 3).Value = u.Email;
            ws.Cell(row, 4).Value = u.UserName;
            ws.Cell(row, 5).Value = ""; // Password blank for existing
            ws.Cell(row, 6).Value = roles.FirstOrDefault(r => r.Id == u.RoleId)?.Name ?? "";
            ws.Cell(row, 7).Value = branches.FirstOrDefault(b => b.Id == u.BranchId)?.Name ?? "";
            ws.Cell(row, 8).Value = departments.FirstOrDefault(d => d.Id == u.DepartmentId)?.Name ?? "";
            ws.Cell(row, 9).Value = u.JobTitle ?? "";
            ws.Cell(row, 10).Value = u.PhoneNumber ?? "";
            ws.Cell(row, 11).Value = u.IsActive ? "TRUE" : "FALSE";
        }

        StyleIdColumn(ws, dataRows);
        StyleReadonlyCol(ws, 4, dataRows); // Username
        // Password column: light yellow for data rows
        if (dataRows > 0)
        {
            var pwdRange = ws.Range(2, 5, dataRows + 1, 5);
            pwdRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#fef9c3");
        }

        AddDropdown(ws, "F2:F10000", "_Roles", 4);
        AddDropdown(ws, "G2:G10000", "_Branches", branches.Count);
        AddDropdown(ws, "H2:H10000", "_Departments", departments.Count);
        AddDropdown(ws, "K2:K10000", "_Active", 2);

        ws.Column(1).Width = 8;  ws.Column(2).Width = 26; ws.Column(3).Width = 30;
        ws.Column(4).Width = 22; ws.Column(5).Width = 22; ws.Column(6).Width = 18;
        ws.Column(7).Width = 26; ws.Column(8).Width = 24; ws.Column(9).Width = 22;
        ws.Column(10).Width = 18; ws.Column(11).Width = 12;
        ws.SheetView.FreezeRows(1);

        return ExcelFile(wb, "users-data.xlsx");
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPost("users/import")]
    public async Task<ActionResult<ImportResult>> ImportUsers(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest("No file uploaded.");

        using var stream = file.OpenReadStream();
        using var wb = new XLWorkbook(stream);
        var ws = wb.Worksheets.First(s => !s.Name.StartsWith("_"));

        // Auto-detect format: if first header cell is "ID" → new upsert format
        bool isNewFormat = ws.Cell(1, 1).GetString().Trim().ToUpper() == "ID";
        int offset = isNewFormat ? 1 : 0;

        var roles       = await db.Roles.ToListAsync(ct);
        var branches    = await db.Branches.Where(b => !b.IsDeleted).ToListAsync(ct);
        var departments = await db.Departments.Where(d => !d.IsDeleted).ToListAsync(ct);
        var colors      = new[] { "#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#be185d" };
        var rnd         = new Random();

        int imported = 0, updated = 0;
        var errors   = new List<string>();
        var lastRow  = ws.LastRowUsed()?.RowNumber() ?? 1;

        var existingEmails    = await db.Users.Select(u => u.Email).ToHashSetAsync(ct);
        var existingUserNames = await db.Users.Select(u => u.UserName.ToLower()).ToHashSetAsync(ct);

        for (int row = 2; row <= lastRow; row++)
        {
            string Get(int col) => ws.Cell(row, col + offset).GetString().Trim();
            int GetId() => isNewFormat ? (ws.Cell(row, 1).GetValue<int?>() ?? 0) : 0;

            // New format cols (after offset): 1=FullName 2=Email 3=Username 4=Password 5=Role 6=BranchName 7=DeptName 8=JobTitle 9=Phone 10=IsActive
            // Old format cols: 1=FullName 2=Email 3=Username 4=Password 5=Role 6=JobTitle 7=BranchName 8=DeptName 9=Phone
            var id       = GetId();
            var fullName = Get(1);
            var email    = Get(2).ToLower();

            if (isNewFormat)
            {
                // new format layout
                if (string.IsNullOrEmpty(fullName) && string.IsNullOrEmpty(email) && id == 0) continue;
            }
            else
            {
                if (string.IsNullOrEmpty(fullName) && string.IsNullOrEmpty(email)) continue;
            }

            // UPDATE path
            if (id > 0)
            {
                var existing = await db.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == id, ct);
                if (existing is null) { errors.Add($"Row {row}: User ID {id} not found."); continue; }

                if (string.IsNullOrEmpty(fullName)) { errors.Add($"Row {row}: FullName is required."); continue; }

                // Check email uniqueness (excluding self)
                if (!string.IsNullOrEmpty(email) && !email.Equals(existing.Email, StringComparison.OrdinalIgnoreCase))
                {
                    if (existingEmails.Contains(email)) { errors.Add($"Row {row}: Email '{email}' already exists."); continue; }
                }

                var roleName = Get(5);
                var role = string.IsNullOrEmpty(roleName) ? null : roles.FirstOrDefault(r => r.Name.Equals(roleName, StringComparison.OrdinalIgnoreCase));
                if (!string.IsNullOrEmpty(roleName) && role is null) { errors.Add($"Row {row}: Role '{roleName}' is invalid."); continue; }

                int? branchId = existing.BranchId;
                var branchName = Get(6);
                if (!string.IsNullOrEmpty(branchName))
                {
                    var branch = branches.FirstOrDefault(b => b.Name.Equals(branchName, StringComparison.OrdinalIgnoreCase));
                    if (branch is null) { errors.Add($"Row {row}: Branch '{branchName}' not found."); continue; }
                    branchId = branch.Id;
                }

                int? deptId = existing.DepartmentId;
                var deptName = Get(7);
                if (!string.IsNullOrEmpty(deptName))
                {
                    var dept = departments.FirstOrDefault(d => d.Name.Equals(deptName, StringComparison.OrdinalIgnoreCase));
                    if (dept is null) { errors.Add($"Row {row}: Department '{deptName}' not found."); continue; }
                    deptId = dept.Id;
                }

                existing.FullName     = fullName;
                if (!string.IsNullOrEmpty(email)) existing.Email = email;
                if (role is not null) existing.RoleId = role.Id;
                existing.BranchId     = branchId;
                existing.DepartmentId = deptId;
                existing.JobTitle     = Blank(Get(8)) ?? existing.JobTitle;
                existing.PhoneNumber  = Blank(Get(9)) ?? existing.PhoneNumber;

                var isActiveStr = Get(10).ToUpper();
                if (!string.IsNullOrEmpty(isActiveStr))
                    existing.IsActive = isActiveStr is "TRUE" or "1";

                updated++;
                continue;
            }

            // CREATE path
            var userName = Blank(Get(3))?.ToLower() ?? email;
            var password = Get(4);
            var newRoleName = Get(5);

            if (string.IsNullOrEmpty(fullName)) { errors.Add($"Row {row}: FullName is required.");  continue; }
            if (string.IsNullOrEmpty(email))    { errors.Add($"Row {row}: Email is required.");     continue; }
            if (string.IsNullOrEmpty(password)) { errors.Add($"Row {row}: Password is required.");  continue; }
            if (string.IsNullOrEmpty(newRoleName)) { errors.Add($"Row {row}: Role is required.");   continue; }

            if (existingEmails.Contains(email))
            {
                errors.Add($"Row {row}: Email '{email}' already exists.");
                continue;
            }

            if (existingUserNames.Contains(userName))
            {
                errors.Add($"Row {row}: Username '{userName}' already exists.");
                continue;
            }

            var newRole = roles.FirstOrDefault(r => r.Name.Equals(newRoleName, StringComparison.OrdinalIgnoreCase));
            if (newRole is null)
            {
                errors.Add($"Row {row}: Role '{newRoleName}' is invalid. Valid values: Admin, Manager, Technician, Employee.");
                continue;
            }

            int? newBranchId = null;
            var newBranchName = isNewFormat ? Get(6) : Get(7);
            if (!string.IsNullOrEmpty(newBranchName))
            {
                var branch = branches.FirstOrDefault(b => b.Name.Equals(newBranchName, StringComparison.OrdinalIgnoreCase));
                if (branch is null) { errors.Add($"Row {row}: Branch '{newBranchName}' not found."); continue; }
                newBranchId = branch.Id;
            }

            int? newDeptId = null;
            var newDeptName = isNewFormat ? Get(7) : Get(8);
            if (!string.IsNullOrEmpty(newDeptName))
            {
                var dept = departments.FirstOrDefault(d => d.Name.Equals(newDeptName, StringComparison.OrdinalIgnoreCase));
                if (dept is null) { errors.Add($"Row {row}: Department '{newDeptName}' not found."); continue; }
                newDeptId = dept.Id;
            }

            var jobTitle   = isNewFormat ? Blank(Get(8)) : Blank(Get(6));
            var phone      = isNewFormat ? Blank(Get(9)) : Blank(Get(9));

            db.Users.Add(new User
            {
                FullName     = fullName,
                UserName     = userName,
                Email        = email,
                PasswordHash = hasher.Hash(password),
                RoleId       = newRole.Id,
                BranchId     = newBranchId,
                DepartmentId = newDeptId,
                JobTitle     = jobTitle,
                PhoneNumber  = phone,
                AvatarColor  = colors[rnd.Next(colors.Length)],
                IsActive     = true,
                IsAvailable  = false
            });

            existingEmails.Add(email);
            existingUserNames.Add(userName);
            imported++;
        }

        if (imported > 0 || updated > 0) await db.SaveChangesAsync(ct);
        return Ok(new ImportResult(imported, updated, errors.Count, errors));
    }

    // ──────────────────── BRANCHES ────────────────────

    [Authorize(Roles = Roles.Admin)]
    [HttpGet("branches/template")]
    public async Task<IActionResult> BranchesTemplate(CancellationToken ct)
    {
        var areas = await db.Areas
            .Where(a => !a.IsDeleted)
            .OrderBy(a => a.Name)
            .Select(a => a.Name)
            .ToListAsync(ct);

        using var wb = new XLWorkbook();
        AddLookupSheet(wb, "_Areas", areas);

        var ws = wb.AddWorksheet("Branches");

        var cols = new[]
        {
            ("BranchName", true),
            ("AreaName",   true),
            ("Code",       false),
            ("Email",      false),
            ("Phone",      false),
            ("Address",    false)
        };

        WriteHeaders(ws, cols,
            required: XLColor.FromHtml("#1e3a5f"),
            optional: XLColor.FromHtml("#374151"));

        ws.Cell(2, 1).Value = "Riyadh Main Branch";
        ws.Cell(2, 2).Value = areas.FirstOrDefault() ?? "Central Area";
        ws.Cell(2, 3).Value = "RYD-01";
        ws.Cell(2, 4).Value = "riyadh@company.com";
        ws.Cell(2, 5).Value = "0112345678";
        ws.Cell(2, 6).Value = "King Fahad Rd, Riyadh";
        StyleExampleRow(ws, cols.Length, "#f0f4f8");

        AddDropdown(ws, "B2:B10000", "_Areas", areas.Count);

        ws.Column(1).Width = 30; ws.Column(2).Width = 25; ws.Column(3).Width = 15;
        ws.Column(4).Width = 28; ws.Column(5).Width = 18; ws.Column(6).Width = 35;
        ws.SheetView.FreezeRows(1);

        return ExcelFile(wb, "branches-import-template.xlsx");
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpGet("branches/export")]
    public async Task<IActionResult> ExportBranches(CancellationToken ct)
    {
        var areas = await db.Areas
            .Where(a => !a.IsDeleted)
            .OrderBy(a => a.Name)
            .ToListAsync(ct);

        var branches = await db.Branches
            .Where(b => !b.IsDeleted)
            .OrderBy(b => b.Name)
            .ToListAsync(ct);

        using var wb = new XLWorkbook();
        AddLookupSheet(wb, "_Areas", areas.Select(a => a.Name).ToList());

        var ws = wb.AddWorksheet("Branches");

        WriteIdHeader(ws);
        var headers = new[]
        {
            ("BranchName", true),
            ("AreaName",   true),
            ("Code",       false),
            ("Email",      false),
            ("Phone",      false),
            ("Address",    false),
        };
        WriteHeaders(ws, headers,
            required: XLColor.FromHtml("#1e3a5f"),
            optional: XLColor.FromHtml("#374151"),
            colOffset: 1);

        int dataRows = branches.Count;
        for (int i = 0; i < branches.Count; i++)
        {
            var b = branches[i];
            int row = i + 2;
            ws.Cell(row, 1).Value = b.Id;
            ws.Cell(row, 2).Value = b.Name;
            ws.Cell(row, 3).Value = areas.FirstOrDefault(a => a.Id == b.AreaId)?.Name ?? "";
            ws.Cell(row, 4).Value = b.Code ?? "";
            ws.Cell(row, 5).Value = b.Email ?? "";
            ws.Cell(row, 6).Value = b.Phone ?? "";
            ws.Cell(row, 7).Value = b.Address ?? "";
        }

        StyleIdColumn(ws, dataRows);
        AddDropdown(ws, "C2:C10000", "_Areas", areas.Count);

        ws.Column(1).Width = 8;  ws.Column(2).Width = 30; ws.Column(3).Width = 25;
        ws.Column(4).Width = 15; ws.Column(5).Width = 28; ws.Column(6).Width = 18;
        ws.Column(7).Width = 35;
        ws.SheetView.FreezeRows(1);

        return ExcelFile(wb, "branches-data.xlsx");
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPost("branches/import")]
    public async Task<ActionResult<ImportResult>> ImportBranches(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest("No file uploaded.");

        using var stream = file.OpenReadStream();
        using var wb = new XLWorkbook(stream);
        var ws = wb.Worksheets.First(s => !s.Name.StartsWith("_"));

        bool isNewFormat = ws.Cell(1, 1).GetString().Trim().ToUpper() == "ID";
        int offset = isNewFormat ? 1 : 0;

        var existingAreas    = await db.Areas.Where(a => !a.IsDeleted).ToListAsync(ct);
        var existingBranches = await db.Branches.Where(b => !b.IsDeleted).ToListAsync(ct);

        int imported = 0, updated = 0;
        var errors  = new List<string>();
        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 1;

        for (int row = 2; row <= lastRow; row++)
        {
            string Get(int col) => ws.Cell(row, col + offset).GetString().Trim();
            int GetId() => isNewFormat ? (ws.Cell(row, 1).GetValue<int?>() ?? 0) : 0;

            var id         = GetId();
            var branchName = Get(1);
            var areaName   = Get(2);

            if (id == 0 && string.IsNullOrEmpty(branchName) && string.IsNullOrEmpty(areaName)) continue;

            // UPDATE path
            if (id > 0)
            {
                var existing = await db.Branches.IgnoreQueryFilters().FirstOrDefaultAsync(b => b.Id == id, ct);
                if (existing is null) { errors.Add($"Row {row}: Branch ID {id} not found."); continue; }

                if (!string.IsNullOrEmpty(branchName) &&
                    existingBranches.Any(b => b.Id != id && b.Name.Equals(branchName, StringComparison.OrdinalIgnoreCase)))
                { errors.Add($"Row {row}: Branch name '{branchName}' already in use by another branch."); continue; }

                int? areaId = existing.AreaId;
                if (!string.IsNullOrEmpty(areaName))
                {
                    var area = existingAreas.FirstOrDefault(a => a.Name.Equals(areaName, StringComparison.OrdinalIgnoreCase));
                    if (area is null) { errors.Add($"Row {row}: Area '{areaName}' not found."); continue; }
                    areaId = area.Id;
                }

                var newCode = Blank(Get(3));
                if (newCode is not null &&
                    existingBranches.Any(b => b.Id != id && (b.Code ?? "").Equals(newCode, StringComparison.OrdinalIgnoreCase)))
                { errors.Add($"Row {row}: Code '{newCode}' already in use."); continue; }

                if (!string.IsNullOrEmpty(branchName)) existing.Name = branchName;
                existing.AreaId  = areaId ?? existing.AreaId;
                if (newCode is not null) existing.Code = newCode;
                existing.Email   = Blank(Get(4)) ?? existing.Email;
                existing.Phone   = Blank(Get(5)) ?? existing.Phone;
                existing.Address = Blank(Get(6)) ?? existing.Address;

                updated++;
                continue;
            }

            // CREATE path
            if (string.IsNullOrEmpty(branchName)) { errors.Add($"Row {row}: BranchName is required."); continue; }
            if (string.IsNullOrEmpty(areaName))   { errors.Add($"Row {row}: AreaName is required.");   continue; }

            if (existingBranches.Any(b => b.Name.Equals(branchName, StringComparison.OrdinalIgnoreCase)))
            {
                errors.Add($"Row {row}: Branch '{branchName}' already exists.");
                continue;
            }

            var areaForCreate = existingAreas.FirstOrDefault(a => a.Name.Equals(areaName, StringComparison.OrdinalIgnoreCase));
            if (areaForCreate is null)
            {
                var code = MakeCode(areaName, existingAreas.Select(a => a.Code));
                areaForCreate = new Area { Name = areaName, Code = code };
                db.Areas.Add(areaForCreate);
                await db.SaveChangesAsync(ct);
                existingAreas.Add(areaForCreate);
            }

            var branchCode = Blank(Get(3)) ?? MakeCode(branchName, existingBranches.Select(b => b.Code));
            var branch = new Branch
            {
                Name    = branchName,
                Code    = branchCode,
                AreaId  = areaForCreate.Id,
                Email   = Blank(Get(4)),
                Phone   = Blank(Get(5)),
                Address = Blank(Get(6))
            };

            db.Branches.Add(branch);
            existingBranches.Add(branch);
            imported++;
        }

        if (imported > 0 || updated > 0) await db.SaveChangesAsync(ct);
        return Ok(new ImportResult(imported, updated, errors.Count, errors));
    }

    // ──────────────────── AREAS ────────────────────

    [Authorize(Roles = Roles.Admin)]
    [HttpGet("areas/template")]
    public IActionResult AreasTemplate()
    {
        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Areas");

        var cols = new[] { ("Name", true), ("Code", true), ("Description", false) };
        WriteHeaders(ws, cols,
            required: XLColor.FromHtml("#1e3a5f"),
            optional: XLColor.FromHtml("#374151"));

        ws.Cell(2, 1).Value = "Western Region";
        ws.Cell(2, 2).Value = "WR";
        ws.Cell(2, 3).Value = "Jeddah & Makkah branches";
        StyleExampleRow(ws, cols.Length, "#f0f4f8");

        ws.Column(1).Width = 28; ws.Column(2).Width = 15; ws.Column(3).Width = 40;
        ws.SheetView.FreezeRows(1);

        return ExcelFile(wb, "areas-import-template.xlsx");
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpGet("areas/export")]
    public async Task<IActionResult> ExportAreas(CancellationToken ct)
    {
        var areas = await db.Areas
            .Where(a => !a.IsDeleted)
            .OrderBy(a => a.Name)
            .ToListAsync(ct);

        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Areas");

        WriteIdHeader(ws);
        var headers = new[] { ("Name", true), ("Code", true), ("Description", false) };
        WriteHeaders(ws, headers,
            required: XLColor.FromHtml("#1e3a5f"),
            optional: XLColor.FromHtml("#374151"),
            colOffset: 1);

        int dataRows = areas.Count;
        for (int i = 0; i < areas.Count; i++)
        {
            var a = areas[i];
            int row = i + 2;
            ws.Cell(row, 1).Value = a.Id;
            ws.Cell(row, 2).Value = a.Name;
            ws.Cell(row, 3).Value = a.Code;
            ws.Cell(row, 4).Value = a.Description ?? "";
        }

        StyleIdColumn(ws, dataRows);

        ws.Column(1).Width = 8; ws.Column(2).Width = 28;
        ws.Column(3).Width = 15; ws.Column(4).Width = 40;
        ws.SheetView.FreezeRows(1);

        return ExcelFile(wb, "areas-data.xlsx");
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPost("areas/import")]
    public async Task<ActionResult<ImportResult>> ImportAreas(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return BadRequest("No file uploaded.");

        using var stream = file.OpenReadStream();
        using var wb = new XLWorkbook(stream);
        var ws = wb.Worksheets.First();

        bool isNewFormat = ws.Cell(1, 1).GetString().Trim().ToUpper() == "ID";
        int offset = isNewFormat ? 1 : 0;

        var existing = await db.Areas.Where(a => !a.IsDeleted).ToListAsync(ct);
        int imported = 0, updated = 0;
        var errors = new List<string>();
        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 1;

        for (int row = 2; row <= lastRow; row++)
        {
            string Get(int col) => ws.Cell(row, col + offset).GetString().Trim();
            int GetId() => isNewFormat ? (ws.Cell(row, 1).GetValue<int?>() ?? 0) : 0;

            var id   = GetId();
            var name = Get(1);
            var code = Get(2);

            if (id == 0 && string.IsNullOrEmpty(name) && string.IsNullOrEmpty(code)) continue;

            // UPDATE path
            if (id > 0)
            {
                var existingArea = existing.FirstOrDefault(a => a.Id == id);
                if (existingArea is null) { errors.Add($"Row {row}: Area ID {id} not found."); continue; }

                if (!string.IsNullOrEmpty(name) && existing.Any(a => a.Id != id && a.Name.Equals(name, StringComparison.OrdinalIgnoreCase)))
                { errors.Add($"Row {row}: Area name '{name}' already in use."); continue; }
                if (!string.IsNullOrEmpty(code) && existing.Any(a => a.Id != id && a.Code.Equals(code, StringComparison.OrdinalIgnoreCase)))
                { errors.Add($"Row {row}: Code '{code}' already in use."); continue; }

                if (!string.IsNullOrEmpty(name)) existingArea.Name = name;
                if (!string.IsNullOrEmpty(code)) existingArea.Code = code.ToUpper();
                existingArea.Description = Blank(Get(3)) ?? existingArea.Description;

                updated++;
                continue;
            }

            // CREATE path
            if (string.IsNullOrEmpty(name)) { errors.Add($"Row {row}: Name is required."); continue; }
            if (string.IsNullOrEmpty(code)) { errors.Add($"Row {row}: Code is required."); continue; }

            if (existing.Any(a => a.Name.Equals(name, StringComparison.OrdinalIgnoreCase)))
            { errors.Add($"Row {row}: Area '{name}' already exists."); continue; }
            if (existing.Any(a => a.Code.Equals(code, StringComparison.OrdinalIgnoreCase)))
            { errors.Add($"Row {row}: Code '{code}' already in use."); continue; }

            var area = new Area { Name = name, Code = code.ToUpper(), Description = Blank(Get(3)) };
            db.Areas.Add(area);
            existing.Add(area);
            imported++;
        }

        if (imported > 0 || updated > 0) await db.SaveChangesAsync(ct);
        return Ok(new ImportResult(imported, updated, errors.Count, errors));
    }

    // ──────────────────── PROJECTS ────────────────────

    [Authorize(Roles = Roles.Admin)]
    [HttpGet("projects/template")]
    public async Task<IActionResult> ProjectsTemplate(CancellationToken ct)
    {
        var users = await db.Users
            .Where(u => u.IsActive && !u.IsDeleted)
            .OrderBy(u => u.FullName)
            .Select(u => new { u.Email, u.FullName })
            .ToListAsync(ct);

        using var wb = new XLWorkbook();

        AddLookupSheet(wb, "_Statuses", ["Planning", "Active", "OnHold", "Completed", "Archived"]);

        var wsU = wb.AddWorksheet("_Users");
        wsU.Visibility = XLWorksheetVisibility.Hidden;
        for (int i = 0; i < users.Count; i++)
        {
            wsU.Cell(i + 1, 1).Value = users[i].Email;
            wsU.Cell(i + 1, 2).Value = users[i].FullName;
        }

        var ws = wb.AddWorksheet("Projects");

        var cols = new[]
        {
            ("Name",        true),
            ("Code",        true),
            ("Status",      false),
            ("Color",       false),
            ("Description", false),
            ("LeadEmail",   false),
            ("StartDate",   false),
            ("EndDate",     false)
        };

        WriteHeaders(ws, cols,
            required: XLColor.FromHtml("#1a4731"),
            optional: XLColor.FromHtml("#374151"));

        ws.Cell(2, 1).Value = "IT Infrastructure 2025";
        ws.Cell(2, 2).Value = "INFRA25";
        ws.Cell(2, 3).Value = "Active";
        ws.Cell(2, 4).Value = "#3b82f6";
        ws.Cell(2, 5).Value = "Network and server upgrades";
        ws.Cell(2, 6).Value = users.FirstOrDefault()?.Email ?? "admin@itdept.local";
        ws.Cell(2, 7).Value = "2025-01-01";
        ws.Cell(2, 8).Value = "2025-12-31";
        StyleExampleRow(ws, cols.Length, "#f0fdf4");

        AddDropdown(ws, "C2:C10000", "_Statuses", 5);
        AddDropdown(ws, "F2:F10000", "_Users",    users.Count);

        ws.Column(1).Width = 28; ws.Column(2).Width = 15; ws.Column(3).Width = 16;
        ws.Column(4).Width = 14; ws.Column(5).Width = 36; ws.Column(6).Width = 28;
        ws.Column(7).Width = 15; ws.Column(8).Width = 15;
        ws.SheetView.FreezeRows(1);

        return ExcelFile(wb, "projects-import-template.xlsx");
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpGet("projects/export")]
    public async Task<IActionResult> ExportProjects(CancellationToken ct)
    {
        var allUsers = await db.Users
            .Where(u => u.IsActive && !u.IsDeleted)
            .OrderBy(u => u.FullName)
            .ToListAsync(ct);

        var projects = await db.Projects
            .Where(p => !p.IsDeleted)
            .OrderBy(p => p.Name)
            .ToListAsync(ct);

        using var wb = new XLWorkbook();

        AddLookupSheet(wb, "_Statuses", ["Planning", "Active", "OnHold", "Completed", "Archived"]);

        var wsU = wb.AddWorksheet("_Users");
        wsU.Visibility = XLWorksheetVisibility.Hidden;
        for (int i = 0; i < allUsers.Count; i++)
        {
            wsU.Cell(i + 1, 1).Value = allUsers[i].Email;
            wsU.Cell(i + 1, 2).Value = allUsers[i].FullName;
        }

        var ws = wb.AddWorksheet("Projects");

        WriteIdHeader(ws);
        var headers = new[]
        {
            ("Name",        true),
            ("Code",        true),
            ("Status",      false),
            ("Color",       false),
            ("Description", false),
            ("LeadEmail",   false),
            ("StartDate",   false),
            ("EndDate",     false),
        };
        WriteHeaders(ws, headers,
            required: XLColor.FromHtml("#1a4731"),
            optional: XLColor.FromHtml("#374151"),
            colOffset: 1);

        int dataRows = projects.Count;
        for (int i = 0; i < projects.Count; i++)
        {
            var p = projects[i];
            int row = i + 2;
            ws.Cell(row, 1).Value = p.Id;
            ws.Cell(row, 2).Value = p.Name;
            ws.Cell(row, 3).Value = p.Code;
            ws.Cell(row, 4).Value = p.Status.ToString();
            ws.Cell(row, 5).Value = p.Color ?? "#3b82f6";
            ws.Cell(row, 6).Value = p.Description ?? "";
            ws.Cell(row, 7).Value = allUsers.FirstOrDefault(u => u.Id == p.LeadId)?.Email ?? "";
            ws.Cell(row, 8).Value = p.StartDate?.ToString("yyyy-MM-dd") ?? "";
            ws.Cell(row, 9).Value = p.EndDate?.ToString("yyyy-MM-dd") ?? "";
        }

        StyleIdColumn(ws, dataRows);

        AddDropdown(ws, "D2:D10000", "_Statuses", 5);
        AddDropdown(ws, "G2:G10000", "_Users", allUsers.Count);

        ws.Column(1).Width = 8;  ws.Column(2).Width = 28; ws.Column(3).Width = 15;
        ws.Column(4).Width = 16; ws.Column(5).Width = 14; ws.Column(6).Width = 36;
        ws.Column(7).Width = 28; ws.Column(8).Width = 15; ws.Column(9).Width = 15;
        ws.SheetView.FreezeRows(1);

        return ExcelFile(wb, "projects-data.xlsx");
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPost("projects/import")]
    public async Task<ActionResult<ImportResult>> ImportProjects(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return BadRequest("No file uploaded.");

        using var stream = file.OpenReadStream();
        using var wb = new XLWorkbook(stream);
        var ws = wb.Worksheets.First(s => !s.Name.StartsWith("_"));

        bool isNewFormat = ws.Cell(1, 1).GetString().Trim().ToUpper() == "ID";
        int offset = isNewFormat ? 1 : 0;

        var existingProjects = await db.Projects.Where(p => !p.IsDeleted).ToListAsync(ct);
        var users = await db.Users.Where(u => u.IsActive && !u.IsDeleted).ToListAsync(ct);

        int imported = 0, updated = 0;
        var errors = new List<string>();
        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 1;
        var validStatuses = new HashSet<string>(["Planning", "Active", "OnHold", "Completed", "Archived"], StringComparer.OrdinalIgnoreCase);

        for (int row = 2; row <= lastRow; row++)
        {
            string Get(int col) => ws.Cell(row, col + offset).GetString().Trim();
            int GetId() => isNewFormat ? (ws.Cell(row, 1).GetValue<int?>() ?? 0) : 0;

            var id   = GetId();
            var name = Get(1);
            var code = Get(2);

            if (id == 0 && string.IsNullOrEmpty(name) && string.IsNullOrEmpty(code)) continue;

            DateTime? ParseDate(string s) => DateTime.TryParse(s, out var d) ? d : null;

            // UPDATE path
            if (id > 0)
            {
                var existing = existingProjects.FirstOrDefault(p => p.Id == id);
                if (existing is null) { errors.Add($"Row {row}: Project ID {id} not found."); continue; }

                var newCode = Blank(Get(2));
                if (newCode is not null &&
                    existingProjects.Any(p => p.Id != id && p.Code.Equals(newCode, StringComparison.OrdinalIgnoreCase)))
                { errors.Add($"Row {row}: Code '{newCode}' already in use."); continue; }

                var statusStr = Get(3);
                if (!string.IsNullOrEmpty(statusStr) && !validStatuses.Contains(statusStr))
                { errors.Add($"Row {row}: Status '{statusStr}' is invalid."); continue; }

                int? leadId = existing.LeadId;
                var leadEmail = Get(6).ToLower();
                if (!string.IsNullOrEmpty(leadEmail))
                {
                    var lead = users.FirstOrDefault(u => u.Email.Equals(leadEmail, StringComparison.OrdinalIgnoreCase));
                    if (lead is null) { errors.Add($"Row {row}: Lead email '{leadEmail}' not found."); continue; }
                    leadId = lead.Id;
                }

                if (!string.IsNullOrEmpty(name)) existing.Name = name;
                if (newCode is not null) existing.Code = newCode.ToUpper();
                if (!string.IsNullOrEmpty(statusStr))
                    existing.Status = Enum.Parse<ProjectStatus>(statusStr, ignoreCase: true);
                existing.Color       = Blank(Get(4)) ?? existing.Color;
                existing.Description = Blank(Get(5)) ?? existing.Description;
                existing.LeadId      = leadId;
                if (ParseDate(Get(7)) is { } sd) existing.StartDate = sd;
                if (ParseDate(Get(8)) is { } ed) existing.EndDate   = ed;

                updated++;
                continue;
            }

            // CREATE path
            if (string.IsNullOrEmpty(name)) { errors.Add($"Row {row}: Name is required."); continue; }
            if (string.IsNullOrEmpty(code)) { errors.Add($"Row {row}: Code is required."); continue; }

            if (existingProjects.Any(p => p.Code.Equals(code, StringComparison.OrdinalIgnoreCase)))
            { errors.Add($"Row {row}: Code '{code}' already exists."); continue; }

            var statusStrCreate = Get(3);
            if (!string.IsNullOrEmpty(statusStrCreate) && !validStatuses.Contains(statusStrCreate))
            { errors.Add($"Row {row}: Status '{statusStrCreate}' is invalid. Valid: Planning, Active, OnHold, Completed, Archived."); continue; }

            var status = string.IsNullOrEmpty(statusStrCreate)
                ? ProjectStatus.Active
                : Enum.Parse<ProjectStatus>(statusStrCreate, ignoreCase: true);

            int? newLeadId = null;
            var newLeadEmail = Get(6).ToLower();
            if (!string.IsNullOrEmpty(newLeadEmail))
            {
                var lead = users.FirstOrDefault(u => u.Email.Equals(newLeadEmail, StringComparison.OrdinalIgnoreCase));
                if (lead is null) { errors.Add($"Row {row}: Lead email '{newLeadEmail}' not found."); continue; }
                newLeadId = lead.Id;
            }

            var newProject = new Project
            {
                Name        = name,
                Code        = code.ToUpper(),
                Status      = status,
                Color       = Blank(Get(4)) ?? "#3b82f6",
                Description = Blank(Get(5)),
                LeadId      = newLeadId,
                StartDate   = ParseDate(Get(7)),
                EndDate     = ParseDate(Get(8))
            };

            db.Projects.Add(newProject);
            existingProjects.Add(newProject);
            imported++;
        }

        if (imported > 0 || updated > 0) await db.SaveChangesAsync(ct);
        return Ok(new ImportResult(imported, updated, errors.Count, errors));
    }

    // ──────────────────── DEPARTMENTS ────────────────────

    [Authorize(Roles = Roles.Admin)]
    [HttpGet("departments/template")]
    public IActionResult DepartmentsTemplate()
    {
        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Departments");

        var cols = new[]
        {
            ("Name",        true),
            ("Code",        false),
            ("Description", false)
        };

        WriteHeaders(ws, cols,
            required: XLColor.FromHtml("#164e63"),
            optional: XLColor.FromHtml("#374151"));

        ws.Cell(2, 1).Value = "IT Department";
        ws.Cell(2, 2).Value = "IT";
        ws.Cell(2, 3).Value = "Information Technology division";
        StyleExampleRow(ws, cols.Length, "#ecfeff");

        ws.Column(1).Width = 30; ws.Column(2).Width = 15; ws.Column(3).Width = 50;
        ws.SheetView.FreezeRows(1);

        return ExcelFile(wb, "departments-import-template.xlsx");
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpGet("departments/export")]
    public async Task<IActionResult> ExportDepartments(CancellationToken ct)
    {
        var departments = await db.Departments
            .Where(d => !d.IsDeleted)
            .OrderBy(d => d.Name)
            .ToListAsync(ct);

        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Departments");

        WriteIdHeader(ws);
        var headers = new[]
        {
            ("Name",        true),
            ("Code",        false),
            ("Description", false),
        };
        WriteHeaders(ws, headers,
            required: XLColor.FromHtml("#164e63"),
            optional: XLColor.FromHtml("#374151"),
            colOffset: 1);

        int dataRows = departments.Count;
        for (int i = 0; i < departments.Count; i++)
        {
            var d = departments[i];
            int row = i + 2;
            ws.Cell(row, 1).Value = d.Id;
            ws.Cell(row, 2).Value = d.Name;
            ws.Cell(row, 3).Value = d.Code ?? "";
            ws.Cell(row, 4).Value = d.Description ?? "";
        }

        StyleIdColumn(ws, dataRows);

        ws.Column(1).Width = 8; ws.Column(2).Width = 30;
        ws.Column(3).Width = 15; ws.Column(4).Width = 50;
        ws.SheetView.FreezeRows(1);

        return ExcelFile(wb, "departments-data.xlsx");
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPost("departments/import")]
    public async Task<ActionResult<ImportResult>> ImportDepartments(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return BadRequest("No file uploaded.");

        using var stream = file.OpenReadStream();
        using var wb = new XLWorkbook(stream);
        var ws = wb.Worksheets.First(s => !s.Name.StartsWith("_"));

        bool isNewFormat = ws.Cell(1, 1).GetString().Trim().ToUpper() == "ID";
        int offset = isNewFormat ? 1 : 0;

        var existingDepts = await db.Departments
            .Where(d => !d.IsDeleted)
            .ToListAsync(ct);

        int imported = 0, updated = 0;
        var errors = new List<string>();
        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 1;

        for (int row = 2; row <= lastRow; row++)
        {
            string Get(int col) => ws.Cell(row, col + offset).GetString().Trim();
            int GetId() => isNewFormat ? (ws.Cell(row, 1).GetValue<int?>() ?? 0) : 0;

            var id   = GetId();
            var name = Get(1);

            if (id == 0 && string.IsNullOrEmpty(name)) continue;

            // UPDATE path
            if (id > 0)
            {
                var existing = existingDepts.FirstOrDefault(d => d.Id == id);
                if (existing is null) { errors.Add($"Row {row}: Department ID {id} not found."); continue; }

                if (!string.IsNullOrEmpty(name) &&
                    existingDepts.Any(d => d.Id != id && d.Name.Equals(name, StringComparison.OrdinalIgnoreCase)))
                { errors.Add($"Row {row}: Department name '{name}' already in use."); continue; }

                if (!string.IsNullOrEmpty(name)) existing.Name = name;
                existing.Code        = Blank(Get(2))?.ToUpper() ?? existing.Code;
                existing.Description = Blank(Get(3)) ?? existing.Description;

                updated++;
                continue;
            }

            // CREATE path
            if (string.IsNullOrEmpty(name)) continue;

            if (existingDepts.Any(d => d.Name.Equals(name, StringComparison.OrdinalIgnoreCase)))
            { errors.Add($"Row {row}: Department '{name}' already exists."); continue; }

            var code = Blank(Get(2))?.ToUpper();
            var dept = new Department
            {
                Name        = name,
                Code        = code,
                Description = Blank(Get(3))
            };

            db.Departments.Add(dept);
            existingDepts.Add(dept);
            imported++;
        }

        if (imported > 0 || updated > 0) await db.SaveChangesAsync(ct);
        return Ok(new ImportResult(imported, updated, errors.Count, errors));
    }

    // ──────────────────── TICKET CATEGORIES ────────────────────

    [Authorize(Roles = Roles.Admin)]
    [HttpGet("ticket-categories/template")]
    public IActionResult TicketCategoriesTemplate()
    {
        using var wb = new XLWorkbook();
        AddLookupSheet(wb, "_Active", ["TRUE", "FALSE"]);

        var ws = wb.AddWorksheet("TicketCategories");

        var cols = new[]
        {
            ("Name",         true),
            ("Icon",         false),
            ("Color",        false),
            ("NameAr",       false),
            ("Description",  false),
            ("DisplayOrder", false),
            ("IsActive",     false)
        };

        WriteHeaders(ws, cols,
            required: XLColor.FromHtml("#4c1d95"),
            optional: XLColor.FromHtml("#374151"));

        ws.Cell(2, 1).Value = "Network Issues";
        ws.Cell(2, 2).Value = "🌐";
        ws.Cell(2, 3).Value = "#06b6d4";
        ws.Cell(2, 4).Value = "مشاكل الشبكة";
        ws.Cell(2, 5).Value = "VPN, DNS, connectivity issues";
        ws.Cell(2, 6).Value = 1;
        ws.Cell(2, 7).Value = "TRUE";
        StyleExampleRow(ws, cols.Length, "#faf5ff");

        AddDropdown(ws, "G2:G10000", "_Active", 2);

        ws.Column(1).Width = 26; ws.Column(2).Width = 10; ws.Column(3).Width = 14;
        ws.Column(4).Width = 24; ws.Column(5).Width = 36; ws.Column(6).Width = 15; ws.Column(7).Width = 12;
        ws.SheetView.FreezeRows(1);

        return ExcelFile(wb, "ticket-categories-import-template.xlsx");
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpGet("ticket-categories/export")]
    public async Task<IActionResult> ExportTicketCategories(CancellationToken ct)
    {
        var categories = await db.TicketCategories
            .Where(c => !c.IsDeleted)
            .OrderBy(c => c.DisplayOrder)
            .ToListAsync(ct);

        using var wb = new XLWorkbook();
        AddLookupSheet(wb, "_Active", ["TRUE", "FALSE"]);

        var ws = wb.AddWorksheet("TicketCategories");

        WriteIdHeader(ws);
        var headers = new[]
        {
            ("Name",         true),
            ("Icon",         false),
            ("Color",        false),
            ("NameAr",       false),
            ("Description",  false),
            ("DisplayOrder", false),
            ("IsActive",     false),
        };
        WriteHeaders(ws, headers,
            required: XLColor.FromHtml("#4c1d95"),
            optional: XLColor.FromHtml("#374151"),
            colOffset: 1);

        int dataRows = categories.Count;
        for (int i = 0; i < categories.Count; i++)
        {
            var c = categories[i];
            int row = i + 2;
            ws.Cell(row, 1).Value = c.Id;
            ws.Cell(row, 2).Value = c.Name;
            ws.Cell(row, 3).Value = c.Icon;
            ws.Cell(row, 4).Value = c.Color;
            ws.Cell(row, 5).Value = c.NameAr ?? "";
            ws.Cell(row, 6).Value = c.Description ?? "";
            ws.Cell(row, 7).Value = c.DisplayOrder;
            ws.Cell(row, 8).Value = c.IsActive ? "TRUE" : "FALSE";
        }

        StyleIdColumn(ws, dataRows);
        AddDropdown(ws, "H2:H10000", "_Active", 2);

        ws.Column(1).Width = 8;  ws.Column(2).Width = 26; ws.Column(3).Width = 10;
        ws.Column(4).Width = 14; ws.Column(5).Width = 24; ws.Column(6).Width = 36;
        ws.Column(7).Width = 15; ws.Column(8).Width = 12;
        ws.SheetView.FreezeRows(1);

        return ExcelFile(wb, "ticket-categories-data.xlsx");
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPost("ticket-categories/import")]
    public async Task<ActionResult<ImportResult>> ImportTicketCategories(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return BadRequest("No file uploaded.");

        using var stream = file.OpenReadStream();
        using var wb = new XLWorkbook(stream);
        var ws = wb.Worksheets.First(s => !s.Name.StartsWith("_"));

        bool isNewFormat = ws.Cell(1, 1).GetString().Trim().ToUpper() == "ID";
        int offset = isNewFormat ? 1 : 0;

        var existingCategories = await db.TicketCategories
            .Where(c => !c.IsDeleted)
            .ToListAsync(ct);
        var nextOrder = (await db.TicketCategories.Where(c => !c.IsDeleted).MaxAsync(c => (int?)c.DisplayOrder, ct) ?? 0) + 1;

        int imported = 0, updated = 0;
        var errors = new List<string>();
        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 1;

        for (int row = 2; row <= lastRow; row++)
        {
            string Get(int col) => ws.Cell(row, col + offset).GetString().Trim();
            int GetId() => isNewFormat ? (ws.Cell(row, 1).GetValue<int?>() ?? 0) : 0;

            var id   = GetId();
            var name = Get(1);

            if (id == 0 && string.IsNullOrEmpty(name)) continue;

            // UPDATE path
            if (id > 0)
            {
                var existing = existingCategories.FirstOrDefault(c => c.Id == id);
                if (existing is null) { errors.Add($"Row {row}: Category ID {id} not found."); continue; }

                if (!string.IsNullOrEmpty(name) &&
                    existingCategories.Any(c => c.Id != id && c.Name.Equals(name, StringComparison.OrdinalIgnoreCase)))
                { errors.Add($"Row {row}: Category name '{name}' already in use."); continue; }

                if (!string.IsNullOrEmpty(name)) existing.Name = name;
                existing.Icon        = Blank(Get(2)) ?? existing.Icon;
                existing.Color       = Blank(Get(3)) ?? existing.Color;
                existing.NameAr      = Blank(Get(4)) ?? existing.NameAr;
                existing.Description = Blank(Get(5)) ?? existing.Description;

                var orderStr = Get(6);
                if (int.TryParse(orderStr, out var order)) existing.DisplayOrder = order;

                var isActiveStr = Get(7).ToUpper();
                if (!string.IsNullOrEmpty(isActiveStr))
                    existing.IsActive = isActiveStr is "TRUE" or "1";

                updated++;
                continue;
            }

            // CREATE path
            if (string.IsNullOrEmpty(name)) continue;

            if (existingCategories.Any(c => c.Name.Equals(name, StringComparison.OrdinalIgnoreCase)))
            { errors.Add($"Row {row}: Category '{name}' already exists."); continue; }

            var newOrderStr = Get(6);
            int newOrder = int.TryParse(newOrderStr, out var o) ? o : nextOrder;
            var newIsActiveStr = Get(7).ToUpper();
            bool isActive = newIsActiveStr != "FALSE";

            var cat = new TicketCategory
            {
                Name         = name,
                Icon         = Blank(Get(2)) ?? "🎫",
                Color        = Blank(Get(3)) ?? "#3b82f6",
                NameAr       = Blank(Get(4)),
                Description  = Blank(Get(5)),
                DisplayOrder = newOrder,
                IsActive     = isActive
            };

            db.TicketCategories.Add(cat);
            existingCategories.Add(cat);
            nextOrder++;
            imported++;
        }

        if (imported > 0 || updated > 0) await db.SaveChangesAsync(ct);
        return Ok(new ImportResult(imported, updated, errors.Count, errors));
    }

    // ──────────────────── Shared helpers ────────────────────

    static string? Blank(string s) => string.IsNullOrWhiteSpace(s) ? null : s;

    static string MakeCode(string name, IEnumerable<string?> existing)
    {
        var base_ = new string(name.Where(char.IsLetterOrDigit).Take(4).ToArray()).ToUpper();
        if (base_.Length == 0) base_ = "X";
        var code = base_;
        int n = 1;
        var set = existing.Where(x => x is not null).Select(x => x!).ToHashSet(StringComparer.OrdinalIgnoreCase);
        while (set.Contains(code)) code = base_ + (++n);
        return code;
    }

    // Writes styled header row. Required cols get 'required' colour, optional get 'optional'.
    // colOffset: how many columns to skip from the left (0 = no skip, 1 = skip col 1 for ID).
    static void WriteHeaders(IXLWorksheet ws, (string Label, bool Required)[] cols, XLColor required, XLColor optional, int colOffset = 0)
    {
        for (int i = 0; i < cols.Length; i++)
        {
            var (label, req) = cols[i];
            var cell = ws.Cell(1, i + 1 + colOffset);
            cell.Value = label + (req ? " *" : "");
            cell.Style.Font.Bold = true;
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Fill.BackgroundColor = req ? required : optional;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            cell.Style.Border.BottomBorder = XLBorderStyleValues.Thin;
            cell.Style.Border.BottomBorderColor = XLColor.White;
        }
    }

    // Style the ID header cell (gray)
    static void WriteIdHeader(IXLWorksheet ws)
    {
        var cell = ws.Cell(1, 1);
        cell.Value = "ID";
        cell.Style.Font.Bold = true;
        cell.Style.Font.FontColor = XLColor.White;
        cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#6b7280");
        cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        ws.Column(1).Width = 8;
    }

    // Style ID data cells gray
    static void StyleIdColumn(IXLWorksheet ws, int dataRows)
    {
        if (dataRows < 1) return;
        var range = ws.Range(2, 1, dataRows + 1, 1);
        range.Style.Fill.BackgroundColor = XLColor.FromHtml("#f3f4f6");
        range.Style.Font.FontColor = XLColor.FromHtml("#6b7280");
        range.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
    }

    // Style a column as read-only hint (light gray)
    static void StyleReadonlyCol(IXLWorksheet ws, int col, int dataRows, string? headerHint = null)
    {
        if (headerHint != null)
        {
            var hCell = ws.Cell(1, col);
            hCell.Value = hCell.GetString() + (headerHint.Length > 0 ? $" ({headerHint})" : "");
        }
        if (dataRows < 1) return;
        var range = ws.Range(2, col, dataRows + 1, col);
        range.Style.Fill.BackgroundColor = XLColor.FromHtml("#f9fafb");
        range.Style.Font.FontColor = XLColor.FromHtml("#9ca3af");
    }

    // Fills example row background colour.
    static void StyleExampleRow(IXLWorksheet ws, int colCount, string hexColor)
    {
        for (int i = 1; i <= colCount; i++)
            ws.Cell(2, i).Style.Fill.BackgroundColor = XLColor.FromHtml(hexColor);
    }

    // Adds a hidden sheet containing lookup values in column A.
    static void AddLookupSheet(XLWorkbook wb, string name, IEnumerable<string> values)
    {
        var ws = wb.AddWorksheet(name);
        ws.Visibility = XLWorksheetVisibility.Hidden;
        int row = 1;
        foreach (var v in values)
            ws.Cell(row++, 1).Value = v;
    }

    // Adds a sheet-reference dropdown to a column range. No-op when count == 0.
    static void AddDropdown(IXLWorksheet ws, string colRange, string lookupSheet, int count)
    {
        if (count == 0) return;
        var dv = ws.Range(colRange).CreateDataValidation();
        dv.List($"'{lookupSheet}'!$A$1:$A${count}");
        dv.ShowErrorMessage = true;
        dv.ErrorTitle = "Invalid selection";
        dv.ErrorMessage = "Please choose a value from the dropdown list.";
    }

    // Serialises workbook to bytes and returns a file result.
    IActionResult ExcelFile(XLWorkbook wb, string fileName)
    {
        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return File(ms.ToArray(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            fileName);
    }
}
