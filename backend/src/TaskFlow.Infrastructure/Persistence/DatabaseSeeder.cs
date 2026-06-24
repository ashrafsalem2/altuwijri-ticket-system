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
        await SeedAreasAndBranchesAsync(db);
        await SeedUsersAsync(db, hasher);
        await SeedTagsAsync(db);
        await SeedProjectsAndTasksAsync(db);

        logger.LogInformation("Database seeding complete.");
    }

    private static async Task SeedRolesAsync(ApplicationDbContext db)
    {
        // Incremental: only add roles that don't already exist
        var existing = await db.Roles.Select(r => r.Name).ToHashSetAsync();
        var toAdd = new[]
        {
            new Role { Name = Roles.Admin,       Description = "Full system administration." },
            new Role { Name = Roles.Manager,     Description = "Manage projects, tasks and people." },
            new Role { Name = Roles.Technician,  Description = "Work on and update assigned tasks." },
            new Role { Name = Roles.Viewer,      Description = "Read-only access." },
            new Role { Name = Roles.Employee,    Description = "Branch employee — submit and track support tickets." }
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
        if (existingUserNames.Count > 0 && existingUserNames.IsSupersetOf(new[] { "emp1", "emp2" })) return;
        if (!await db.Users.IgnoreQueryFilters().AnyAsync())
            existingUserNames = new HashSet<string>();

        var roles = await db.Roles.ToDictionaryAsync(r => r.Name, r => r.Id);
        var branches = await db.Branches.ToDictionaryAsync(br => br.Code, br => br.Id);
        var users = new[]
        {
            new User { UserName = "admin", Email = "admin@itdept.local", FullName = "System Administrator",
                RoleId = roles[Roles.Admin], JobTitle = "IT Director", Department = "IT", AvatarColor = "#3b82f6",
                BranchId = branches["HQ"], PasswordHash = hasher.Hash("Admin@123") },
            new User { UserName = "mmanager", Email = "manager@itdept.local", FullName = "Maya Manager",
                RoleId = roles[Roles.Manager], JobTitle = "IT Operations Manager", Department = "IT", AvatarColor = "#8b5cf6",
                BranchId = branches["HQ"], PasswordHash = hasher.Hash("Manager@123") },
            new User { UserName = "ttech", Email = "tech@itdept.local", FullName = "Tariq Technician",
                RoleId = roles[Roles.Technician], JobTitle = "Systems Engineer", Department = "Infrastructure", AvatarColor = "#22c55e",
                BranchId = branches["HQ"], IsAvailable = true, PasswordHash = hasher.Hash("Tech@123") },
            new User { UserName = "sara", Email = "sara@itdept.local", FullName = "Sara Helpdesk",
                RoleId = roles[Roles.Technician], JobTitle = "Helpdesk Analyst", Department = "Support", AvatarColor = "#f97316",
                BranchId = branches["DT"], IsAvailable = true, PasswordHash = hasher.Hash("Tech@123") },
            new User { UserName = "omar", Email = "omar@itdept.local", FullName = "Omar Field",
                RoleId = roles[Roles.Technician], JobTitle = "Field Engineer", Department = "Infrastructure", AvatarColor = "#0ea5e9",
                BranchId = branches["HB"], IsAvailable = false, PasswordHash = hasher.Hash("Tech@123") },
            new User { UserName = "lara", Email = "lara@itdept.local", FullName = "Lara Requester",
                RoleId = roles[Roles.Viewer], JobTitle = "Branch Coordinator", Department = "Operations", AvatarColor = "#ec4899",
                BranchId = branches["AP"], PasswordHash = hasher.Hash("Viewer@123") },
            new User { UserName = "viewer", Email = "viewer@itdept.local", FullName = "Victor Viewer",
                RoleId = roles[Roles.Viewer], JobTitle = "Auditor", Department = "Compliance", AvatarColor = "#64748b",
                BranchId = branches["DT"], PasswordHash = hasher.Hash("Viewer@123") },
            new User { UserName = "emp1", Email = "emp1@itdept.local", FullName = "Emma Employee",
                RoleId = roles[Roles.Employee], JobTitle = "Branch Coordinator", Department = "Operations", AvatarColor = "#06b6d4",
                BranchId = branches["DT"], PasswordHash = hasher.Hash("Emp@123") },
            new User { UserName = "emp2", Email = "emp2@itdept.local", FullName = "Eddie Employee",
                RoleId = roles[Roles.Employee], JobTitle = "Finance Officer", Department = "Finance", AvatarColor = "#84cc16",
                BranchId = branches["HB"], PasswordHash = hasher.Hash("Emp@123") }
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
                LeadId = U("mmanager"), StartDate = DateTime.UtcNow.AddDays(-30) },
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
                DueDate = DateTime.UtcNow.AddDays(s.DueOffset),
                SlaDueDate = s.Type is TaskType.Incident ? DateTime.UtcNow.AddDays(s.DueOffset) : null,
                EstimatedHours = rnd.Next(2, 16),
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
