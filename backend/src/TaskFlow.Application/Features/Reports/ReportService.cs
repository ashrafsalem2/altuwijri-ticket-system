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
                return new UserReportRowDto(u.Id, u.FullName, u.JobTitle, u.Role?.Name, BuildStats(assigned));
            })
            .OrderByDescending(r => r.Stats.Total)
            .ToList();

        return new ByUserReportDto(DateTime.UtcNow, rows);
    }

    // ----- helpers -----
    private async Task<List<WorkTask>> LoadTasks(System.Linq.Expressions.Expression<Func<WorkTask, bool>> predicate, CancellationToken ct) =>
        await db.Tasks.Where(t => !t.IsDeleted).Where(predicate)
            .Include(t => t.Project).Include(t => t.Branch).Include(t => t.Assignee)
            .Include(t => t.SubTasks).Include(t => t.Comments)
            .Include(t => t.TaskTags).ThenInclude(tt => tt.Tag)
            .AsNoTracking().ToListAsync(ct);

    private static ReportStats BuildStats(IReadOnlyCollection<WorkTask> tasks)
    {
        var now = DateTime.UtcNow;
        int total = tasks.Count;
        int completed = tasks.Count(t => t.Status == WorkTaskStatus.Done);
        bool IsOpen(WorkTask t) => t.Status != WorkTaskStatus.Done && t.Status != WorkTaskStatus.Cancelled;
        return new ReportStats(
            total,
            tasks.Count(IsOpen),
            tasks.Count(t => t.Status == WorkTaskStatus.InProgress),
            completed,
            tasks.Count(t => t.DueDate != null && t.DueDate < now && IsOpen(t)),
            tasks.Count(t => t.SlaDueDate != null && t.SlaDueDate < now && IsOpen(t)),
            tasks.Count(t => t.AssigneeId == null && IsOpen(t)),
            total == 0 ? 0 : Math.Round(completed * 100.0 / total, 1),
            total == 0 ? 0 : Math.Round(tasks.Average(t => t.Progress), 1));
    }

    private static ReportBreakdown BuildBreakdown(IReadOnlyCollection<WorkTask> tasks) => new(
        tasks.GroupBy(t => t.Status).Select(g => new CountByLabel(g.Key.ToString(), g.Count())).ToList(),
        tasks.GroupBy(t => t.Priority).Select(g => new CountByLabel(g.Key.ToString(), g.Count())).ToList(),
        tasks.GroupBy(t => t.Type).Select(g => new CountByLabel(g.Key.ToString(), g.Count())).ToList(),
        tasks.Where(t => t.Assignee != null).GroupBy(t => t.Assignee!.FullName)
            .Select(g => new CountByLabel(g.Key, g.Count())).OrderByDescending(x => x.Count).Take(10).ToList());
}
