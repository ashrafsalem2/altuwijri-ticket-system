using Microsoft.EntityFrameworkCore;
using TaskFlow.Application.Common.Exceptions;
using TaskFlow.Application.Common.Interfaces;
using TaskFlow.Application.Common.Mapping;
using TaskFlow.Application.Features.Dashboard;
using TaskFlow.Application.Features.Tasks;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;

namespace TaskFlow.Application.Features.Reports;

public interface IReportService
{
    Task<BranchReportDto> GetBranchReportAsync(int branchId, CancellationToken ct = default);
    Task<AreaReportDto> GetAreaReportAsync(int areaId, CancellationToken ct = default);
    Task<OverviewReportDto> GetOverviewAsync(CancellationToken ct = default);
    Task<EmployeeTicketReportDto> GetMyTicketsReportAsync(int userId, DateTime? from, DateTime? to, CancellationToken ct = default);
    Task<ByTagReportDto> GetByTagAsync(CancellationToken ct = default);
    Task<ByUserReportDto> GetByUserAsync(CancellationToken ct = default);
    Task<ByGroupReportDto> GetByGroupAsync(CancellationToken ct = default);
    Task<ByDepartmentReportDto> GetByDepartmentAsync(CancellationToken ct = default);
    Task<SingleUserReportDto> GetSingleUserAsync(int userId, DateTime? from, DateTime? to, CancellationToken ct = default);
    Task<SingleTaskReportDto> GetSingleTaskAsync(int taskId, CancellationToken ct = default);
    Task<AllTasksReportDto> GetAllTasksAsync(DateTime? from, DateTime? to, CancellationToken ct = default);
    Task<TrendReportDto> GetTrendAsync(CancellationToken ct = default);
    Task<OverdueReportDto> GetOverdueAsync(CancellationToken ct = default);
}

public class ReportService(IApplicationDbContext db) : IReportService
{
    public async Task<BranchReportDto> GetBranchReportAsync(int branchId, CancellationToken ct = default)
    {
        var branch = await db.Branches.Include(b => b.Area).AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == branchId, ct) ?? throw new NotFoundException("Branch", branchId);

        var tasks = await LoadTasks(t => t.BranchId == branchId, ct);
        return new BranchReportDto(
            branch.Id, branch.Name, branch.Code, branch.Area.Name,
            DateTime.UtcNow, BuildStats(tasks), BuildBreakdown(tasks),
            tasks.OrderByDescending(t => t.CreatedAt).Take(200).Select(t => t.ToListItem()).ToList());
    }

    public async Task<AreaReportDto> GetAreaReportAsync(int areaId, CancellationToken ct = default)
    {
        var area = await db.Areas.AsNoTracking().FirstOrDefaultAsync(a => a.Id == areaId, ct)
            ?? throw new NotFoundException("Area", areaId);
        var branches = await db.Branches.AsNoTracking().Where(b => b.AreaId == areaId).ToListAsync(ct);
        var branchIds = branches.Select(b => b.Id).ToList();

        var tasks = await LoadTasks(t => t.BranchId != null && branchIds.Contains(t.BranchId.Value), ct);

        var perBranch = branches
            .Select(b => new BranchSummaryDto(b.Id, b.Name, b.Code,
                BuildStats(tasks.Where(t => t.BranchId == b.Id).ToList())))
            .OrderByDescending(s => s.Stats.Total)
            .ToList();

        return new AreaReportDto(area.Id, area.Name, area.Code,
            DateTime.UtcNow, BuildStats(tasks), BuildBreakdown(tasks), perBranch);
    }

    public async Task<OverviewReportDto> GetOverviewAsync(CancellationToken ct = default)
    {
        var areas = await db.Areas.Include(a => a.Branches).AsNoTracking().ToListAsync(ct);
        var tasks = await LoadTasks(_ => true, ct);

        var branchToArea = areas.SelectMany(a => a.Branches.Select(b => new { b.Id, AreaId = a.Id }))
            .ToDictionary(x => x.Id, x => x.AreaId);

        var areaRows = areas.Select(a =>
        {
            var areaTasks = tasks.Where(t => t.BranchId != null && branchToArea.TryGetValue(t.BranchId.Value, out var aid) && aid == a.Id).ToList();
            return new AreaSummaryDto(a.Id, a.Name, a.Code, a.Branches.Count(b => !b.IsDeleted), BuildStats(areaTasks));
        }).OrderByDescending(r => r.Stats.Total).ToList();

        return new OverviewReportDto(DateTime.UtcNow, BuildStats(tasks), BuildBreakdown(tasks), areaRows);
    }

    public async Task<EmployeeTicketReportDto> GetMyTicketsReportAsync(int userId, DateTime? from, DateTime? to, CancellationToken ct = default)
    {
        var user = await db.Users.Include(u => u.Branch).AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted, ct)
            ?? throw new NotFoundException("User", userId);

        var allTasks = await LoadTasks(t => t.ReporterId == userId, ct);
        var filtered = allTasks.AsEnumerable();
        if (from.HasValue) filtered = filtered.Where(t => t.CreatedAt >= from.Value);
        if (to.HasValue) filtered = filtered.Where(t => t.CreatedAt < to.Value.AddDays(1));
        var tasks = filtered.ToList();

        return new EmployeeTicketReportDto(
            user.Id, user.FullName, user.Branch?.Name,
            DateTime.UtcNow, from, to,
            BuildStats(tasks), BuildBreakdown(tasks),
            tasks.OrderByDescending(t => t.CreatedAt).Select(t => t.ToListItem()).ToList());
    }

    public async Task<ByTagReportDto> GetByTagAsync(CancellationToken ct = default)
    {
        var tags = await db.Tags.AsNoTracking().ToListAsync(ct);
        var allTasks = await LoadTasks(_ => true, ct);

        var rows = tags
            .Select(tag =>
            {
                var tagged = allTasks.Where(t => t.TaskTags.Any(tt => tt.TagId == tag.Id)).ToList();
                return new TagReportRowDto(tag.Id, tag.Name, tag.Color, tag.Icon, BuildStats(tagged));
            })
            .Where(r => r.Stats.Total > 0)
            .OrderByDescending(r => r.Stats.Total)
            .ToList();

        return new ByTagReportDto(DateTime.UtcNow, rows);
    }

    public async Task<ByUserReportDto> GetByUserAsync(CancellationToken ct = default)
    {
        var users = await db.Users.AsNoTracking()
            .Where(u => !u.IsDeleted && u.IsActive)
            .Include(u => u.Role)
            .ToListAsync(ct);

        var allTasks = await LoadTasks(_ => true, ct);

        var rows = users
            .Select(u =>
            {
                var assigned = allTasks.Where(t => t.AssigneeId == u.Id).ToList();
                var claimed = assigned.Where(t => t.ClaimedAt.HasValue).ToList();
                double? avg = null, fast = null, slow = null;
                if (claimed.Count > 0)
                {
                    var mins = claimed.Select(t => (t.ClaimedAt!.Value - t.CreatedAt).TotalMinutes).ToList();
                    avg  = Math.Round(mins.Average(), 1);
                    fast = Math.Round(mins.Min(), 1);
                    slow = Math.Round(mins.Max(), 1);
                }
                return new UserReportRowDto(u.Id, u.FullName, u.JobTitle, u.Role?.Name, BuildStats(assigned), avg, fast, slow);
            })
            .OrderByDescending(r => r.Stats.Total)
            .ToList();

        return new ByUserReportDto(DateTime.UtcNow, rows);
    }

    public async Task<ByGroupReportDto> GetByGroupAsync(CancellationToken ct = default)
    {
        var categories = await db.TicketCategories.AsNoTracking().OrderBy(c => c.DisplayOrder).ToListAsync(ct);
        var allTasks = await LoadTasks(_ => true, ct);

        var techCounts = await db.UserCategories.AsNoTracking()
            .GroupBy(uc => uc.CategoryId)
            .Select(g => new { CategoryId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.CategoryId, x => x.Count, ct);

        var rows = categories
            .Select(c =>
            {
                var grouped = allTasks.Where(t => t.CategoryId == c.Id).ToList();
                return new GroupReportRowDto(
                    c.Id, c.Name, c.Icon, c.Color ?? "#3b82f6",
                    techCounts.GetValueOrDefault(c.Id),
                    BuildStats(grouped));
            })
            .OrderByDescending(r => r.Stats.Total)
            .ToList();

        return new ByGroupReportDto(DateTime.UtcNow, rows);
    }

    public async Task<ByDepartmentReportDto> GetByDepartmentAsync(CancellationToken ct = default)
    {
        var departments = await db.Departments
            .Where(d => !d.IsDeleted)
            .Include(d => d.Users.Where(u => !u.IsDeleted && u.IsActive))
            .ThenInclude(u => u.Role)
            .AsNoTracking()
            .ToListAsync(ct);

        var allTasks = await LoadTasks(_ => true, ct);

        var rows = departments
            .Select(dept =>
            {
                var userIds = dept.Users.Select(u => u.Id).ToHashSet();
                var deptTasks = allTasks.Where(t => t.AssigneeId.HasValue && userIds.Contains(t.AssigneeId.Value)).ToList();

                var userRows = dept.Users
                    .Select(u =>
                    {
                        var assigned = allTasks.Where(t => t.AssigneeId == u.Id).ToList();
                        return new UserReportRowDto(u.Id, u.FullName, u.JobTitle, u.Role?.Name, BuildStats(assigned), null, null, null);
                    })
                    .OrderByDescending(r => r.Stats.Total)
                    .ToList();

                return new DepartmentReportRowDto(
                    dept.Id, dept.Name, dept.Code,
                    dept.Users.Count,
                    BuildStats(deptTasks),
                    userRows);
            })
            .OrderByDescending(r => r.Stats.Total)
            .ToList();

        return new ByDepartmentReportDto(DateTime.UtcNow, rows);
    }

    public async Task<SingleUserReportDto> GetSingleUserAsync(int userId, DateTime? from, DateTime? to, CancellationToken ct = default)
    {
        var user = await db.Users.Include(u => u.Branch).Include(u => u.Role)
            .AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted, ct)
            ?? throw new NotFoundException("User", userId);

        var allAssigned = await LoadTasks(t => t.AssigneeId == userId, ct);
        var allSubmitted = await LoadTasks(t => t.ReporterId == userId, ct);

        var filtered = allAssigned.AsEnumerable();
        if (from.HasValue) filtered = filtered.Where(t => t.CreatedAt >= from.Value);
        if (to.HasValue) filtered = filtered.Where(t => t.CreatedAt < to.Value.AddDays(1));
        var assigned = filtered.ToList();

        var claimed = assigned.Where(t => t.ClaimedAt.HasValue).ToList();
        double? avgResp = null, fastResp = null, slowResp = null, avgResolutionHours = null;
        if (claimed.Count > 0)
        {
            var respMins = claimed.Select(t => (t.ClaimedAt!.Value - t.CreatedAt).TotalMinutes).ToList();
            avgResp  = Math.Round(respMins.Average(), 1);
            fastResp = Math.Round(respMins.Min(), 1);
            slowResp = Math.Round(respMins.Max(), 1);
        }
        var resolved = assigned.Where(t => t.CompletedAt.HasValue).ToList();
        if (resolved.Count > 0)
            avgResolutionHours = Math.Round(resolved.Average(t => (t.CompletedAt!.Value - t.CreatedAt).TotalHours), 1);

        // Monthly trend: tickets assigned in the last 12 months
        var monthlyTrend = Enumerable.Range(0, 12)
            .Select(i => DateTime.UtcNow.AddMonths(-11 + i))
            .Select(m =>
            {
                var cnt = allAssigned.Count(t => t.CreatedAt.Year == m.Year && t.CreatedAt.Month == m.Month);
                return new CountByLabel(m.ToString("MMM yyyy"), cnt);
            }).ToList();

        return new SingleUserReportDto(
            user.Id, user.FullName, user.JobTitle, user.Role?.Name, user.Branch?.Name,
            DateTime.UtcNow,
            BuildStats(assigned),
            BuildStats(allSubmitted.AsQueryable()
                .Where(t => (!from.HasValue || t.CreatedAt >= from.Value) && (!to.HasValue || t.CreatedAt < to.Value.AddDays(1)))
                .ToList()),
            avgResp, fastResp, slowResp, avgResolutionHours,
            BuildBreakdown(assigned),
            monthlyTrend,
            assigned.OrderByDescending(t => t.CreatedAt).Take(50).Select(t => t.ToListItem()).ToList());
    }

    public async Task<SingleTaskReportDto> GetSingleTaskAsync(int taskId, CancellationToken ct = default)
    {
        var task = await db.Tasks
            .Where(t => t.Id == taskId && !t.IsDeleted)
            .Include(t => t.Project).Include(t => t.Branch).Include(t => t.Category)
            .Include(t => t.Assignee).Include(t => t.Reporter)
            .Include(t => t.SubTasks).ThenInclude(s => s.Assignee)
            .Include(t => t.SubTasks).ThenInclude(s => s.TaskTags).ThenInclude(tt => tt.Tag)
            .Include(t => t.Comments)
            .Include(t => t.Attachments)
            .Include(t => t.TaskTags).ThenInclude(tt => tt.Tag)
            .Include(t => t.Activities).ThenInclude(a => a.User)
            .AsNoTracking()
            .FirstOrDefaultAsync(ct) ?? throw new NotFoundException("Task", taskId);

        double? minsToClaim = task.ClaimedAt.HasValue
            ? Math.Round((task.ClaimedAt.Value - task.CreatedAt).TotalMinutes, 1) : null;
        double? minsToResolve = task.CompletedAt.HasValue
            ? Math.Round((task.CompletedAt.Value - task.CreatedAt).TotalMinutes, 1) : null;

        var activity = task.Activities
            .OrderBy(a => a.CreatedAt)
            .Select(a => new ActivityLogRowDto(a.Id, a.Action, a.Field, a.OldValue, a.NewValue, a.User?.FullName, a.CreatedAt))
            .ToList();

        var subtasks = task.SubTasks.Where(s => !s.IsDeleted).ToList();
        var tags = string.Join(", ", task.TaskTags.Select(tt => tt.Tag.Name));

        return new SingleTaskReportDto(
            task.Id, task.Title, task.Description,
            task.Status.ToString(), task.Priority.ToString(), task.Type.ToString(),
            task.Assignee?.FullName, task.Reporter?.FullName,
            task.Project?.Name, task.Branch?.Name,
            task.Category?.Name, task.Category?.Color, task.Category?.Icon,
            task.CreatedAt, task.StartDate, task.ClaimedAt, task.CompletedAt,
            minsToClaim, minsToResolve,
            subtasks.Count,
            subtasks.Count(s => s.Status == WorkTaskStatus.Done),
            task.Comments.Count,
            task.Attachments.Count,
            tags,
            subtasks.Select(s => s.ToListItem()).ToList(),
            activity);
    }

    public async Task<AllTasksReportDto> GetAllTasksAsync(DateTime? from, DateTime? to, CancellationToken ct = default)
    {
        var tasks = await LoadTasks(_ => true, ct);
        var filtered = tasks.AsEnumerable();
        if (from.HasValue) filtered = filtered.Where(t => t.CreatedAt >= from.Value);
        if (to.HasValue) filtered = filtered.Where(t => t.CreatedAt < to.Value.AddDays(1));
        var list = filtered.OrderByDescending(t => t.CreatedAt).ToList();

        var byCategory = list
            .Where(t => t.Category != null)
            .GroupBy(t => t.Category!.Name)
            .Select(g => new CountByLabel(g.Key, g.Count()))
            .OrderByDescending(x => x.Count).ToList();

        var byProject = list
            .Where(t => t.Project != null)
            .GroupBy(t => t.Project!.Name)
            .Select(g => new CountByLabel(g.Key, g.Count()))
            .OrderByDescending(x => x.Count).ToList();

        return new AllTasksReportDto(
            DateTime.UtcNow, from, to,
            BuildStats(list), BuildBreakdown(list),
            byCategory, byProject,
            list.Take(500).Select(t => t.ToListItem()).ToList());
    }

    public async Task<TrendReportDto> GetTrendAsync(CancellationToken ct = default)
    {
        var cutoff30 = DateTime.UtcNow.Date.AddDays(-29);
        var cutoff12m = DateTime.UtcNow.Date.AddMonths(-11).AddDays(-(DateTime.UtcNow.Day - 1));
        var tasks = await db.Tasks.Where(t => !t.IsDeleted && t.CreatedAt >= cutoff12m)
            .AsNoTracking().ToListAsync(ct);

        var last30 = Enumerable.Range(0, 30)
            .Select(i => DateTime.UtcNow.Date.AddDays(i - 29))
            .Select(d => new TrendPoint(
                d.ToString("MMM d"),
                tasks.Count(t => t.CreatedAt.Date == d),
                tasks.Count(t => t.CompletedAt.HasValue && t.CompletedAt.Value.Date == d),
                tasks.Count(t => t.Status == WorkTaskStatus.InProgress && t.CreatedAt.Date == d)))
            .ToList();

        var last12m = Enumerable.Range(0, 12)
            .Select(i => DateTime.UtcNow.AddMonths(-11 + i))
            .Select(m => new TrendPoint(
                m.ToString("MMM yyyy"),
                tasks.Count(t => t.CreatedAt.Year == m.Year && t.CreatedAt.Month == m.Month),
                tasks.Count(t => t.CompletedAt.HasValue && t.CompletedAt.Value.Year == m.Year && t.CompletedAt.Value.Month == m.Month),
                tasks.Count(t => t.Status == WorkTaskStatus.InProgress && t.CreatedAt.Year == m.Year && t.CreatedAt.Month == m.Month)))
            .ToList();

        return new TrendReportDto(DateTime.UtcNow, last30, last12m);
    }

    public async Task<OverdueReportDto> GetOverdueAsync(CancellationToken ct = default)
    {
        var openStatuses = new[] { WorkTaskStatus.Backlog, WorkTaskStatus.ToDo, WorkTaskStatus.InProgress, WorkTaskStatus.InReview, WorkTaskStatus.Blocked };
        var tasks = await db.Tasks
            .Where(t => !t.IsDeleted && openStatuses.Contains(t.Status))
            .Include(t => t.Assignee).Include(t => t.Category).Include(t => t.Branch)
            .AsNoTracking().ToListAsync(ct);

        var now = DateTime.UtcNow;
        var rows = tasks
            .Select(t => new OverdueTaskRow(
                t.Id, t.Title, t.Status.ToString(), t.Priority.ToString(), t.Type.ToString(),
                t.Assignee?.FullName, t.Category?.Name, t.Branch?.Name,
                t.CreatedAt, (int)(now - t.CreatedAt).TotalDays, t.AssigneeId == null))
            .OrderByDescending(r => r.DaysOpen)
            .ToList();

        return new OverdueReportDto(
            now,
            rows.Count,
            rows.Count(r => r.DaysOpen >= 1),
            rows.Count(r => r.DaysOpen >= 3),
            rows.Count(r => r.DaysOpen >= 7),
            rows.Count(r => r.DaysOpen >= 14),
            rows);
    }

    // ----- helpers -----
    private async Task<List<WorkTask>> LoadTasks(System.Linq.Expressions.Expression<Func<WorkTask, bool>> predicate, CancellationToken ct) =>
        await db.Tasks.Where(t => !t.IsDeleted).Where(predicate)
            .Include(t => t.Project).Include(t => t.Branch).Include(t => t.Category)
            .Include(t => t.Assignee).Include(t => t.SubTasks).Include(t => t.Comments)
            .Include(t => t.TaskTags).ThenInclude(tt => tt.Tag)
            .AsNoTracking().ToListAsync(ct);

    private static ReportStats BuildStats(IReadOnlyCollection<WorkTask> tasks)
    {
        int total = tasks.Count;
        int completed = tasks.Count(t => t.Status == WorkTaskStatus.Done);
        bool IsOpen(WorkTask t) => t.Status != WorkTaskStatus.Done && t.Status != WorkTaskStatus.Cancelled;
        return new ReportStats(
            total,
            tasks.Count(IsOpen),
            tasks.Count(t => t.Status == WorkTaskStatus.InProgress),
            completed,
            tasks.Count(t => t.AssigneeId == null && IsOpen(t)),
            total == 0 ? 0 : Math.Round(completed * 100.0 / total, 1));
    }

    private static ReportBreakdown BuildBreakdown(IReadOnlyCollection<WorkTask> tasks) => new(
        tasks.GroupBy(t => t.Status).Select(g => new CountByLabel(g.Key.ToString(), g.Count())).ToList(),
        tasks.GroupBy(t => t.Priority).Select(g => new CountByLabel(g.Key.ToString(), g.Count())).ToList(),
        tasks.GroupBy(t => t.Type).Select(g => new CountByLabel(g.Key.ToString(), g.Count())).ToList(),
        tasks.Where(t => t.Assignee != null).GroupBy(t => t.Assignee!.FullName)
            .Select(g => new CountByLabel(g.Key, g.Count())).OrderByDescending(x => x.Count).Take(10).ToList());
}
