using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskFlow.Application.Common.Authorization;
using TaskFlow.Application.Common.Interfaces;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;

namespace TaskFlow.Api.Controllers;

public record ImportResult(int Imported, int Failed, List<string> Errors);

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
        ws.Cell(2, 3).Value = "Pass@1234";
        ws.Cell(2, 4).Value = "Employee";
        ws.Cell(2, 5).Value = "IT Support";
        ws.Cell(2, 6).Value = branches.FirstOrDefault() ?? "Riyadh Branch";
        ws.Cell(2, 7).Value = departments.FirstOrDefault() ?? "IT Department";
        ws.Cell(2, 8).Value = "0501234567";
        StyleExampleRow(ws, cols.Length, "#fef9f9");

        AddDropdown(ws, "D2:D10000", "_Roles",       4);
        AddDropdown(ws, "F2:F10000", "_Branches",    branches.Count);
        AddDropdown(ws, "G2:G10000", "_Departments", departments.Count);

        ws.Column(1).Width = 26; ws.Column(2).Width = 30; ws.Column(3).Width = 20;
        ws.Column(4).Width = 18; ws.Column(5).Width = 22; ws.Column(6).Width = 26;
        ws.Column(7).Width = 24; ws.Column(8).Width = 18;
        ws.SheetView.FreezeRows(1);

        return ExcelFile(wb, "users-import-template.xlsx");
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

        var roles       = await db.Roles.ToListAsync(ct);
        var branches    = await db.Branches.Where(b => !b.IsDeleted).ToListAsync(ct);
        var departments = await db.Departments.Where(d => !d.IsDeleted).ToListAsync(ct);
        var colors      = new[] { "#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#be185d" };
        var rnd         = new Random();

        int imported = 0;
        var errors   = new List<string>();
        var lastRow  = ws.LastRowUsed()?.RowNumber() ?? 1;

        var existingEmails = await db.Users.Select(u => u.Email).ToHashSetAsync(ct);

        for (int row = 2; row <= lastRow; row++)
        {
            string Get(int col) => ws.Cell(row, col).GetString().Trim();

            // Cols: 1=FullName 2=Email 3=Password 4=Role 5=JobTitle 6=BranchName 7=DepartmentName 8=Phone
            var fullName = Get(1);
            var email    = Get(2).ToLower();
            var password = Get(3);
            var roleName = Get(4);

            if (string.IsNullOrEmpty(fullName) && string.IsNullOrEmpty(email)) continue;

            if (string.IsNullOrEmpty(fullName)) { errors.Add($"Row {row}: FullName is required.");  continue; }
            if (string.IsNullOrEmpty(email))    { errors.Add($"Row {row}: Email is required.");     continue; }
            if (string.IsNullOrEmpty(password)) { errors.Add($"Row {row}: Password is required.");  continue; }
            if (string.IsNullOrEmpty(roleName)) { errors.Add($"Row {row}: Role is required.");      continue; }

            if (existingEmails.Contains(email))
            {
                errors.Add($"Row {row}: Email '{email}' already exists.");
                continue;
            }

            var role = roles.FirstOrDefault(r => r.Name.Equals(roleName, StringComparison.OrdinalIgnoreCase));
            if (role is null)
            {
                errors.Add($"Row {row}: Role '{roleName}' is invalid. Valid values: Admin, Manager, Technician, Employee.");
                continue;
            }

            int? branchId = null;
            var branchName = Get(6);
            if (!string.IsNullOrEmpty(branchName))
            {
                var branch = branches.FirstOrDefault(b => b.Name.Equals(branchName, StringComparison.OrdinalIgnoreCase));
                if (branch is null)
                {
                    errors.Add($"Row {row}: Branch '{branchName}' not found.");
                    continue;
                }
                branchId = branch.Id;
            }

            int? departmentId = null;
            var deptName = Get(7);
            if (!string.IsNullOrEmpty(deptName))
            {
                var dept = departments.FirstOrDefault(d => d.Name.Equals(deptName, StringComparison.OrdinalIgnoreCase));
                if (dept is null)
                {
                    errors.Add($"Row {row}: Department '{deptName}' not found.");
                    continue;
                }
                departmentId = dept.Id;
            }

            db.Users.Add(new User
            {
                FullName     = fullName,
                UserName     = email,
                Email        = email,
                PasswordHash = hasher.Hash(password),
                RoleId       = role.Id,
                BranchId     = branchId,
                DepartmentId = departmentId,
                JobTitle     = Blank(Get(5)),
                PhoneNumber  = Blank(Get(8)),
                AvatarColor  = colors[rnd.Next(colors.Length)],
                IsActive     = true,
                IsAvailable  = false
            });

            existingEmails.Add(email);
            imported++;
        }

        if (imported > 0) await db.SaveChangesAsync(ct);
        return Ok(new ImportResult(imported, errors.Count, errors));
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
    [HttpPost("branches/import")]
    public async Task<ActionResult<ImportResult>> ImportBranches(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest("No file uploaded.");

        using var stream = file.OpenReadStream();
        using var wb = new XLWorkbook(stream);
        var ws = wb.Worksheets.First();

        var existingAreas    = await db.Areas.Where(a => !a.IsDeleted).ToListAsync(ct);
        var existingBranches = await db.Branches.Where(b => !b.IsDeleted).ToListAsync(ct);

        int imported = 0;
        var errors  = new List<string>();
        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 1;

        for (int row = 2; row <= lastRow; row++)
        {
            string Get(int col) => ws.Cell(row, col).GetString().Trim();

            var branchName = Get(1);
            var areaName   = Get(2);

            if (string.IsNullOrEmpty(branchName) && string.IsNullOrEmpty(areaName)) continue;

            if (string.IsNullOrEmpty(branchName)) { errors.Add($"Row {row}: BranchName is required."); continue; }
            if (string.IsNullOrEmpty(areaName))   { errors.Add($"Row {row}: AreaName is required.");   continue; }

            if (existingBranches.Any(b => b.Name.Equals(branchName, StringComparison.OrdinalIgnoreCase)))
            {
                errors.Add($"Row {row}: Branch '{branchName}' already exists.");
                continue;
            }

            // Resolve area — auto-create if missing
            var area = existingAreas.FirstOrDefault(a => a.Name.Equals(areaName, StringComparison.OrdinalIgnoreCase));
            if (area is null)
            {
                var code = MakeCode(areaName, existingAreas.Select(a => a.Code));
                area = new Area { Name = areaName, Code = code };
                db.Areas.Add(area);
                await db.SaveChangesAsync(ct); // flush to get Id
                existingAreas.Add(area);
            }

            // Auto-generate branch code if not provided
            var branchCode = Blank(Get(3))
                ?? MakeCode(branchName, existingBranches.Select(b => b.Code));

            var branch = new Branch
            {
                Name    = branchName,
                Code    = branchCode,
                AreaId  = area.Id,
                Email   = Blank(Get(4)),
                Phone   = Blank(Get(5)),
                Address = Blank(Get(6))
            };

            db.Branches.Add(branch);
            existingBranches.Add(branch);
            imported++;
        }

        if (imported > 0) await db.SaveChangesAsync(ct);
        return Ok(new ImportResult(imported, errors.Count, errors));
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
    [HttpPost("areas/import")]
    public async Task<ActionResult<ImportResult>> ImportAreas(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return BadRequest("No file uploaded.");

        using var stream = file.OpenReadStream();
        using var wb = new XLWorkbook(stream);
        var ws = wb.Worksheets.First();

        var existing = await db.Areas.Where(a => !a.IsDeleted).ToListAsync(ct);
        int imported = 0;
        var errors = new List<string>();
        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 1;

        for (int row = 2; row <= lastRow; row++)
        {
            string Get(int col) => ws.Cell(row, col).GetString().Trim();
            var name = Get(1); var code = Get(2);
            if (string.IsNullOrEmpty(name) && string.IsNullOrEmpty(code)) continue;
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

        if (imported > 0) await db.SaveChangesAsync(ct);
        return Ok(new ImportResult(imported, errors.Count, errors));
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

        // _Statuses hidden lookup
        AddLookupSheet(wb, "_Statuses", ["Planning", "Active", "OnHold", "Completed", "Archived"]);

        // _Users: email in col A, full name in col B (read-only hint for the user)
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
    [HttpPost("projects/import")]
    public async Task<ActionResult<ImportResult>> ImportProjects(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return BadRequest("No file uploaded.");

        using var stream = file.OpenReadStream();
        using var wb = new XLWorkbook(stream);
        var ws = wb.Worksheets.First();

        var existingCodes = await db.Projects.Select(p => p.Code).ToHashSetAsync(ct);
        var users = await db.Users.Where(u => u.IsActive && !u.IsDeleted).ToListAsync(ct);

        int imported = 0;
        var errors = new List<string>();
        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 1;
        var validStatuses = new HashSet<string>(["Planning", "Active", "OnHold", "Completed", "Archived"], StringComparer.OrdinalIgnoreCase);

        for (int row = 2; row <= lastRow; row++)
        {
            string Get(int col) => ws.Cell(row, col).GetString().Trim();
            var name = Get(1); var code = Get(2);
            if (string.IsNullOrEmpty(name) && string.IsNullOrEmpty(code)) continue;
            if (string.IsNullOrEmpty(name)) { errors.Add($"Row {row}: Name is required."); continue; }
            if (string.IsNullOrEmpty(code)) { errors.Add($"Row {row}: Code is required."); continue; }

            if (existingCodes.Contains(code))
            { errors.Add($"Row {row}: Code '{code}' already exists."); continue; }

            var statusStr = Get(3);
            if (!string.IsNullOrEmpty(statusStr) && !validStatuses.Contains(statusStr))
            { errors.Add($"Row {row}: Status '{statusStr}' is invalid. Valid: Planning, Active, OnHold, Completed, Archived."); continue; }

            var status = string.IsNullOrEmpty(statusStr)
                ? ProjectStatus.Active
                : Enum.Parse<ProjectStatus>(statusStr, ignoreCase: true);

            int? leadId = null;
            var leadEmail = Get(6).ToLower();
            if (!string.IsNullOrEmpty(leadEmail))
            {
                var lead = users.FirstOrDefault(u => u.Email.Equals(leadEmail, StringComparison.OrdinalIgnoreCase));
                if (lead is null) { errors.Add($"Row {row}: Lead email '{leadEmail}' not found."); continue; }
                leadId = lead.Id;
            }

            DateTime? ParseDate(string s) => DateTime.TryParse(s, out var d) ? d : null;

            db.Projects.Add(new Project
            {
                Name        = name,
                Code        = code.ToUpper(),
                Status      = status,
                Color       = Blank(Get(4)) ?? "#3b82f6",
                Description = Blank(Get(5)),
                LeadId      = leadId,
                StartDate   = ParseDate(Get(7)),
                EndDate     = ParseDate(Get(8))
            });

            existingCodes.Add(code);
            imported++;
        }

        if (imported > 0) await db.SaveChangesAsync(ct);
        return Ok(new ImportResult(imported, errors.Count, errors));
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
    [HttpPost("departments/import")]
    public async Task<ActionResult<ImportResult>> ImportDepartments(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return BadRequest("No file uploaded.");

        using var stream = file.OpenReadStream();
        using var wb = new XLWorkbook(stream);
        var ws = wb.Worksheets.First(s => !s.Name.StartsWith("_"));

        var existingNames = await db.Departments
            .Where(d => !d.IsDeleted)
            .Select(d => d.Name.ToLower())
            .ToHashSetAsync(ct);

        int imported = 0;
        var errors = new List<string>();
        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 1;

        for (int row = 2; row <= lastRow; row++)
        {
            string Get(int col) => ws.Cell(row, col).GetString().Trim();
            var name = Get(1);
            if (string.IsNullOrEmpty(name)) continue;

            if (existingNames.Contains(name.ToLower()))
            { errors.Add($"Row {row}: Department '{name}' already exists."); continue; }

            var code = Blank(Get(2))?.ToUpper();
            db.Departments.Add(new Department
            {
                Name        = name,
                Code        = code,
                Description = Blank(Get(3))
            });

            existingNames.Add(name.ToLower());
            imported++;
        }

        if (imported > 0) await db.SaveChangesAsync(ct);
        return Ok(new ImportResult(imported, errors.Count, errors));
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
    [HttpPost("ticket-categories/import")]
    public async Task<ActionResult<ImportResult>> ImportTicketCategories(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return BadRequest("No file uploaded.");

        using var stream = file.OpenReadStream();
        using var wb = new XLWorkbook(stream);
        var ws = wb.Worksheets.First();

        var existingNames = await db.TicketCategories
            .Where(c => !c.IsDeleted)
            .Select(c => c.Name)
            .ToHashSetAsync(ct);
        var nextOrder = (await db.TicketCategories.Where(c => !c.IsDeleted).MaxAsync(c => (int?)c.DisplayOrder, ct) ?? 0) + 1;

        int imported = 0;
        var errors = new List<string>();
        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 1;

        for (int row = 2; row <= lastRow; row++)
        {
            string Get(int col) => ws.Cell(row, col).GetString().Trim();
            var name = Get(1);
            if (string.IsNullOrEmpty(name)) continue;

            if (existingNames.Contains(name))
            { errors.Add($"Row {row}: Category '{name}' already exists."); continue; }

            var orderStr = Get(6);
            int order = int.TryParse(orderStr, out var o) ? o : nextOrder;
            var isActiveStr = Get(7).ToUpper();
            bool isActive = isActiveStr != "FALSE";

            db.TicketCategories.Add(new TicketCategory
            {
                Name         = name,
                Icon         = Blank(Get(2)) ?? "🎫",
                Color        = Blank(Get(3)) ?? "#3b82f6",
                NameAr       = Blank(Get(4)),
                Description  = Blank(Get(5)),
                DisplayOrder = order,
                IsActive     = isActive
            });

            existingNames.Add(name);
            nextOrder++;
            imported++;
        }

        if (imported > 0) await db.SaveChangesAsync(ct);
        return Ok(new ImportResult(imported, errors.Count, errors));
    }

    // ──────────────────── Shared helpers ────────────────────

    static string? Blank(string s) => string.IsNullOrWhiteSpace(s) ? null : s;

    static string MakeCode(string name, IEnumerable<string> existing)
    {
        var base_ = new string(name.Where(char.IsLetterOrDigit).Take(4).ToArray()).ToUpper();
        if (base_.Length == 0) base_ = "X";
        var code = base_;
        int n = 1;
        var set = existing.ToHashSet(StringComparer.OrdinalIgnoreCase);
        while (set.Contains(code)) code = base_ + (++n);
        return code;
    }

    // Writes styled header row. Required cols get 'required' colour, optional get 'optional'.
    static void WriteHeaders(IXLWorksheet ws, (string Label, bool Required)[] cols, XLColor required, XLColor optional)
    {
        for (int i = 0; i < cols.Length; i++)
        {
            var (label, req) = cols[i];
            var cell = ws.Cell(1, i + 1);
            cell.Value = label + (req ? " *" : "");
            cell.Style.Font.Bold = true;
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Fill.BackgroundColor = req ? required : optional;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            cell.Style.Border.BottomBorder = XLBorderStyleValues.Thin;
            cell.Style.Border.BottomBorderColor = XLColor.White;
        }
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
