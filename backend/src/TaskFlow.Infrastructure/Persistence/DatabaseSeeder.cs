using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using TaskFlow.Application.Common.Authorization;
using TaskFlow.Application.Common.Interfaces;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;

namespace TaskFlow.Infrastructure.Persistence;

/// <summary>Applies migrations and seeds baseline + demo data on startup.</summary>
public static class DatabaseSeeder
{
    public static async Task MigrateAndSeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var sp = scope.ServiceProvider;
        var db = sp.GetRequiredService<ApplicationDbContext>();
        var hasher = sp.GetRequiredService<IPasswordHasher>();
        var logger = sp.GetRequiredService<ILogger<ApplicationDbContext>>();

        logger.LogInformation("Applying database migrations...");
        await db.Database.MigrateAsync();

        await SeedRolesAsync(db);
        await MigrateOldRolesAsync(db);   // one-time: move old roles to new equivalents
        await SeedAreasAndBranchesAsync(db);
        await SeedDepartmentsAsync(db);
        await SeedTicketCategoriesAsync(db);
        await MigrateTicketCategoryDefaultTypesAsync(db);
        await SeedUsersAsync(db, hasher);
        await SeedTagsAsync(db);
        await SeedProjectsAndTasksAsync(db);

        logger.LogInformation("Database seeding complete.");
    }

    /// <summary>
    /// One-time migration: reassign users that still carry the removed Manager / Viewer / Employee roles
    /// to their closest new equivalents. Idempotent — does nothing once every user has a current role.
    /// </summary>
    private static async Task MigrateOldRolesAsync(ApplicationDbContext db)
    {
        var allRoles = await db.Roles.ToDictionaryAsync(r => r.Name, r => r.Id);

        // Map old role names → new role names
        var mapping = new Dictionary<string, string>
        {
            ["Employee"] = Roles.BranchEmployee,   // Employee → Branch-Employee
            ["Viewer"]   = Roles.BranchEmployee,   // Viewer   → Branch-Employee (read-only removed)
            ["Manager"]  = Roles.HoEmployee,       // Manager  → HO-Employee (no branch panel, similar access)
        };

        foreach (var (oldName, newName) in mapping)
        {
            if (!allRoles.TryGetValue(oldName, out var oldId)) continue;
            if (!allRoles.TryGetValue(newName, out var newId)) continue;

            var staleUsers = await db.Users.IgnoreQueryFilters()
                .Where(u => u.RoleId == oldId).ToListAsync();
            foreach (var u in staleUsers) u.RoleId = newId;
        }

        await db.SaveChangesAsync();
    }

    private static async Task SeedDepartmentsAsync(ApplicationDbContext db)
    {
        if (await db.Departments.AnyAsync()) return;
        db.Departments.AddRange(
            new Department { Name = "IT",             Code = "IT",     Description = "Information Technology" },
            new Department { Name = "Infrastructure", Code = "INFRA",  Description = "Network and infrastructure" },
            new Department { Name = "Support",        Code = "SUP",    Description = "Help desk and support" },
            new Department { Name = "Operations",     Code = "OPS",    Description = "Branch operations" },
            new Department { Name = "Finance",        Code = "FIN",    Description = "Finance and accounting" },
            new Department { Name = "Compliance",     Code = "COMP",   Description = "Compliance and audit" }
        );
        await db.SaveChangesAsync();
    }

    private static async Task SeedTicketCategoriesAsync(ApplicationDbContext db)
    {
        if (await db.TicketCategories.AnyAsync()) return;
        var categories = new[]
        {
            new TicketCategory { Name = "Technical Support",          Description = "Hardware, software, and general IT issues.",         Icon = "🔧", Color = "#3b82f6", DisplayOrder = 1, IsActive = true, DefaultType = TaskType.Incident        },
            new TicketCategory { Name = "Network & Connectivity",     Description = "Internet, VPN, and network access problems.",        Icon = "🌐", Color = "#06b6d4", DisplayOrder = 2, IsActive = true, DefaultType = TaskType.Incident        },
            new TicketCategory { Name = "Software & Applications",    Description = "Application crashes, installation, and licensing.",  Icon = "💻", Color = "#8b5cf6", DisplayOrder = 3, IsActive = true, DefaultType = TaskType.Bug             },
            new TicketCategory { Name = "Account & Access",           Description = "Password resets, permissions, and user accounts.",   Icon = "🔐", Color = "#f59e0b", DisplayOrder = 4, IsActive = true, DefaultType = TaskType.ServiceRequest  },
            new TicketCategory { Name = "Preventive Maintenance",     Description = "Scheduled maintenance and hardware inspections.",    Icon = "🛡", Color = "#22c55e", DisplayOrder = 5, IsActive = true, DefaultType = TaskType.Maintenance     },
            new TicketCategory { Name = "Report a Problem",           Description = "General issues or bugs to investigate.",            Icon = "🐛", Color = "#ef4444", DisplayOrder = 6, IsActive = true, DefaultType = TaskType.Bug             },
            new TicketCategory { Name = "Request a New Feature",      Description = "Suggest enhancements or new functionality.",        Icon = "✨", Color = "#ec4899", DisplayOrder = 7, IsActive = true, DefaultType = TaskType.Feature         },
            new TicketCategory { Name = "Integration & Development",  Description = "API integrations, custom development, and R&D.",    Icon = "⚙️", Color = "#64748b", DisplayOrder = 8, IsActive = true, DefaultType = TaskType.Change          },
        };
        db.TicketCategories.AddRange(categories);
        await db.SaveChangesAsync();
    }

    /// <summary>Back-fills DefaultType on categories that were seeded before this field existed.</summary>
    private static async Task MigrateTicketCategoryDefaultTypesAsync(ApplicationDbContext db)
    {
        var mapping = new Dictionary<string, TaskType>
        {
            ["Technical Support"]         = TaskType.Incident,
            ["Network & Connectivity"]    = TaskType.Incident,
            ["Software & Applications"]   = TaskType.Bug,
            ["Account & Access"]          = TaskType.ServiceRequest,
            ["Preventive Maintenance"]    = TaskType.Maintenance,
            ["Report a Problem"]          = TaskType.Bug,
            ["Request a New Feature"]     = TaskType.Feature,
            ["Integration & Development"] = TaskType.Change,
        };

        var needsUpdate = await db.TicketCategories
            .Where(c => c.DefaultType == null)
            .ToListAsync();

        foreach (var cat in needsUpdate)
            if (mapping.TryGetValue(cat.Name, out var type))
                cat.DefaultType = type;

        if (needsUpdate.Any(c => c.DefaultType != null))
            await db.SaveChangesAsync();
    }

    private static async Task SeedRolesAsync(ApplicationDbContext db)
    {
        // Incremental: only add roles that don't already exist
        var existing = await db.Roles.Select(r => r.Name).ToHashSetAsync();
        var toAdd = new[]
        {
            new Role { Name = Roles.Admin,          Description = "Full system administration." },
            new Role { Name = Roles.Technician,     Description = "Work on and update assigned tasks." },
            new Role { Name = Roles.BranchEmployee, Description = "Branch employee — submit and track tickets, sees branch card." },
            new Role { Name = Roles.HoEmployee,     Description = "Head-office employee — same as Branch-Employee but no branch panel." },
            new Role { Name = Roles.CamEmployee,    Description = "Camera/multi-site employee — belongs to multiple branches, no branch panel." },
        }.Where(r => !existing.Contains(r.Name)).ToList();
        if (toAdd.Count == 0) return;
        db.Roles.AddRange(toAdd);
        await db.SaveChangesAsync();
    }

    private static async Task SeedAreasAndBranchesAsync(ApplicationDbContext db)
    {
        if (await db.Areas.AnyAsync()) return;

        var central = new Area { Name = "Central Region", Code = "CENTRAL", Description = "Head office and central branches." };
        var western = new Area { Name = "Western Region", Code = "WEST", Description = "Western coastal branches." };
        db.Areas.AddRange(central, western);
        await db.SaveChangesAsync();

        db.Branches.AddRange(
            new Branch { Name = "Head Office", Code = "HQ", AreaId = central.Id, Address = "1 Main St", Phone = "+100000001" },
            new Branch { Name = "Downtown Branch", Code = "DT", AreaId = central.Id, Address = "22 Market Ave", Phone = "+100000002" },
            new Branch { Name = "Harbor Branch", Code = "HB", AreaId = western.Id, Address = "9 Port Rd", Phone = "+100000003" },
            new Branch { Name = "Airport Branch", Code = "AP", AreaId = western.Id, Address = "Terminal 2", Phone = "+100000004" });
        await db.SaveChangesAsync();
    }

    private static async Task SeedUsersAsync(ApplicationDbContext db, IPasswordHasher hasher)
    {
        // Always ensure employee demo accounts exist, even on an already-seeded database
        var existingUserNames = await db.Users.IgnoreQueryFilters().Select(u => u.UserName).ToHashSetAsync();
        if (existingUserNames.Count > 0 && existingUserNames.IsSupersetOf(new[] { "emp1", "emp2", "emp3" })) return;
        if (!await db.Users.IgnoreQueryFilters().AnyAsync())
            existingUserNames = new HashSet<string>();

        var roles    = await db.Roles.ToDictionaryAsync(r => r.Name, r => r.Id);
        var branches = await db.Branches.ToDictionaryAsync(br => br.Code, br => br.Id);
        var depts    = await db.Departments.ToDictionaryAsync(d => d.Name, d => d.Id);
        int? D(string name) => depts.TryGetValue(name, out var id) ? id : null;
        int? B(string code) => branches.TryGetValue(code, out var id) ? id : null;

        var users = new[]
        {
            new User { UserName = "admin", Email = "admin@itdept.local", FullName = "System Administrator",
                RoleId = roles[Roles.Admin], JobTitle = "IT Director", DepartmentId = D("IT"), AvatarColor = "#3b82f6",
                BranchId = B("HQ"), PasswordHash = hasher.Hash("Admin@123") },
            new User { UserName = "ttech", Email = "tech@itdept.local", FullName = "Tariq Technician",
                RoleId = roles[Roles.Technician], JobTitle = "Systems Engineer", DepartmentId = D("Infrastructure"), AvatarColor = "#22c55e",
                BranchId = B("HQ"), IsAvailable = true, PasswordHash = hasher.Hash("Tech@123") },
            new User { UserName = "sara", Email = "sara@itdept.local", FullName = "Sara Helpdesk",
                RoleId = roles[Roles.Technician], JobTitle = "Helpdesk Analyst", DepartmentId = D("Support"), AvatarColor = "#f97316",
                BranchId = B("DT"), IsAvailable = true, PasswordHash = hasher.Hash("Tech@123") },
            new User { UserName = "omar", Email = "omar@itdept.local", FullName = "Omar Field",
                RoleId = roles[Roles.Technician], JobTitle = "Field Engineer", DepartmentId = D("Infrastructure"), AvatarColor = "#0ea5e9",
                BranchId = B("HB"), IsAvailable = false, PasswordHash = hasher.Hash("Tech@123") },
            new User { UserName = "emp1", Email = "emp1@itdept.local", FullName = "Emma Branch",
                RoleId = roles[Roles.BranchEmployee], JobTitle = "Branch Coordinator", DepartmentId = D("Operations"), AvatarColor = "#06b6d4",
                BranchId = B("DT"), PasswordHash = hasher.Hash("Emp@123") },
            new User { UserName = "emp2", Email = "emp2@itdept.local", FullName = "Hassan HO",
                RoleId = roles[Roles.HoEmployee], JobTitle = "Finance Officer", DepartmentId = D("Finance"), AvatarColor = "#84cc16",
                PasswordHash = hasher.Hash("Emp@123") },
            new User { UserName = "emp3", Email = "emp3@itdept.local", FullName = "Cam User",
                RoleId = roles[Roles.CamEmployee], JobTitle = "Multi-Site Coordinator", DepartmentId = D("Operations"), AvatarColor = "#a855f7",
                PasswordHash = hasher.Hash("Emp@123") },
        };
        var toAdd = users.Where(u => !existingUserNames.Contains(u.UserName)).ToList();
        if (toAdd.Count > 0) { db.Users.AddRange(toAdd); await db.SaveChangesAsync(); }
    }

    private static async Task SeedTagsAsync(ApplicationDbContext db)
    {
        if (await db.Tags.AnyAsync()) return;
        db.Tags.AddRange(
            new Tag { Name = "network", Color = "#0ea5e9" },
            new Tag { Name = "security", Color = "#ef4444" },
            new Tag { Name = "hardware", Color = "#f59e0b" },
            new Tag { Name = "software", Color = "#8b5cf6" },
            new Tag { Name = "urgent", Color = "#dc2626" },
            new Tag { Name = "database", Color = "#10b981" });
        await db.SaveChangesAsync();
    }

    private static async Task SeedProjectsAndTasksAsync(ApplicationDbContext db)
    {
        if (await db.Projects.AnyAsync()) return;

        var users = await db.Users.ToListAsync();
        int U(string un) => users.First(u => u.UserName == un).Id;
        int? BranchOf(string un) => users.First(u => u.UserName == un).BranchId;

        var projects = new[]
        {
            new Project { Name = "Infrastructure Upgrade 2026", Code = "INFRA", Color = "#3b82f6",
                Description = "Datacenter and network modernization program.", Status = ProjectStatus.Active,
                LeadId = U("admin"), StartDate = DateTime.UtcNow.AddDays(-30) },
            new Project { Name = "Helpdesk & Support", Code = "SUP", Color = "#f97316",
                Description = "Day-to-day incident and service-request handling.", Status = ProjectStatus.Active,
                LeadId = U("sara") },
            new Project { Name = "Security & Compliance", Code = "SEC", Color = "#ef4444",
                Description = "Hardening, audits and compliance initiatives.", Status = ProjectStatus.Active,
                LeadId = U("admin") }
        };
        db.Projects.AddRange(projects);
        await db.SaveChangesAsync();

        var tags = await db.Tags.ToListAsync();
        int T(string n) => tags.First(t => t.Name == n).Id;
        var rnd = new Random(42);

        var samples = new (string Title, string Proj, WorkTaskStatus Status, TaskPriority Prio, TaskType Type, string Assignee, int DueOffset, string[] Tags)[]
        {
            ("Replace core switches in Rack B", "INFRA", WorkTaskStatus.InProgress, TaskPriority.High, TaskType.Maintenance, "ttech", 5, ["network","hardware"]),
            ("Migrate file server to new SAN", "INFRA", WorkTaskStatus.ToDo, TaskPriority.Medium, TaskType.Change, "ttech", 14, ["hardware"]),
            ("VPN intermittently dropping", "SUP", WorkTaskStatus.InProgress, TaskPriority.Critical, TaskType.Incident, "ttech", 1, ["network","urgent"]),
            ("New laptop setup for finance hire", "SUP", WorkTaskStatus.ToDo, TaskPriority.Low, TaskType.ServiceRequest, "sara", 3, ["hardware"]),
            ("Outlook not syncing for 3 users", "SUP", WorkTaskStatus.Backlog, TaskPriority.Medium, TaskType.Incident, "sara", 2, ["software"]),
            ("Patch all servers - June rollup", "SEC", WorkTaskStatus.InReview, TaskPriority.High, TaskType.Maintenance, "ttech", -1, ["security","urgent"]),
            ("Quarterly access review", "SEC", WorkTaskStatus.ToDo, TaskPriority.Medium, TaskType.Task, "admin", 10, ["security"]),
            ("Investigate phishing report", "SEC", WorkTaskStatus.Done, TaskPriority.High, TaskType.Incident, "admin", -3, ["security"]),
            ("Upgrade database to SQL 2022", "INFRA", WorkTaskStatus.Backlog, TaskPriority.Medium, TaskType.Change, "ttech", 21, ["database"]),
            ("Printer offline - 4th floor", "SUP", WorkTaskStatus.Done, TaskPriority.Low, TaskType.Incident, "sara", -2, ["hardware"]),
            ("Document DR runbook", "SEC", WorkTaskStatus.ToDo, TaskPriority.Low, TaskType.Task, "mmanager", 30, []),
            ("Wi-Fi dead zone in warehouse", "INFRA", WorkTaskStatus.Blocked, TaskPriority.Medium, TaskType.Incident, "ttech", 7, ["network"]),
        };

        var projByCode = projects.ToDictionary(p => p.Code, p => p.Id);
        var order = 0;
        foreach (var s in samples)
        {
            var task = new WorkTask
            {
                Title = s.Title,
                Description = $"Auto-seeded sample task: {s.Title}.",
                Status = s.Status,
                Priority = s.Prio,
                Type = s.Type,
                ProjectId = projByCode[s.Proj],
                BranchId = BranchOf(s.Assignee),
                AssigneeId = U(s.Assignee),
                ReporterId = U("mmanager"),
                StartDate = s.Status == WorkTaskStatus.InProgress || s.Status == WorkTaskStatus.Done ? DateTime.UtcNow.AddDays(s.DueOffset - 5) : null,
                Progress = s.Status == WorkTaskStatus.Done ? 100 : s.Status == WorkTaskStatus.InProgress ? rnd.Next(20, 80) : 0,
                CompletedAt = s.Status == WorkTaskStatus.Done ? DateTime.UtcNow.AddDays(s.DueOffset) : null,
                BoardOrder = order++
            };
            foreach (var tn in s.Tags) task.TaskTags.Add(new TaskTag { TagId = T(tn) });
            db.Tasks.Add(task);
        }
        await db.SaveChangesAsync();
    }
}
