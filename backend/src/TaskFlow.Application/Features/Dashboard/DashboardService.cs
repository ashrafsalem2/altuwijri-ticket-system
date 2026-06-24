using Microsoft.EntityFrameworkCore;
using TaskFlow.Application.Common.Interfaces;
using TaskFlow.Domain.Enums;

namespace TaskFlow.Application.Features.Dashboard;

public interface IDashboardService
{
    Task<DashboardStatsDto> GetStatsAsync(int? currentUserId, CancellationToken ct = default);
    Task<DashboardChartsDto> GetChartsAsync(CancellationToken ct = default);
    Task<IReadOnlyList<ActivityFeedItemDto>> GetRecentActivityAsync(int take, CancellationToken ct = default);
}

public class DashboardService(IApplicationDbContext db) : IDashboardService
{
    public async Task<DashboardStatsDto> GetStatsAsync(int? currentUserId, CancellationToken ct = default)
    {
        var tasks = db.Tasks.Where(t => !t.IsDeleted);
        var now = DateTime.UtcNow;

        var total = await tasks.CountAsync(ct);
        var open = await tasks.CountAsync(t => t.Status != WorkTaskStatus.Done && t.Status != WorkTaskStatus.Cancelled, ct);
        var inProgress = await tasks.CountAsync(t => t.Status == WorkTaskStatus.InProgress, ct);
        var completed = await tasks.CountAsync(t => t.Status == WorkTaskStatus.Done, ct);
        var overdue = await tasks.CountAsync(t => t.DueDate != null && t.DueDate < now &&
            t.Status != WorkTaskStatus.Done && t.Status != WorkTaskStatus.Cancelled, ct);
        var sla = await tasks.CountAsync(t => t.SlaDueDate != null && t.SlaDueDate < now &&
            t.Status != WorkTaskStatus.Done && t.Status != WorkTaskStatus.Cancelled, ct);
        var unassigned = await tasks.CountAsync(t => t.AssigneeId == null &&
            t.Status != WorkTaskStatus.Done && t.Status != WorkTaskStatus.Cancelled, ct);
        var mine = currentUserId is null ? 0 : await tasks.CountAsync(t => t.AssigneeId == currentUserId &&
            t.Status != WorkTaskStatus.Done && t.Status != WorkTaskStatus.Cancelled, ct);
        var activeProjects = await db.Projects.CountAsync(p => !p.IsDeleted && p.Status == ProjectStatus.Active, ct);
        var completionRate = total == 0 ? 0 : Math.Round(completed * 100.0 / total, 1);

        return new DashboardStatsDto(total, open, inProgress, completed, overdue, sla, unassigned, mine, activeProjects, completionRate);
    }

    public async Task<DashboardChartsDto> GetChartsAsync(CancellationToken ct = default)
    {
        var tasks = db.Tasks.Where(t => !t.IsDeleted);

        var byStatus = (await tasks.GroupBy(t => t.Status)
            .Select(g => new { g.Key, Count = g.Count() }).ToListAsync(ct))
            .Select(x => new CountByLabel(x.Key.ToString(), x.Count)).ToList();

        var byPriority = (await tasks.GroupBy(t => t.Priority)
            .Select(g => new { g.Key, Count = g.Count() }).ToListAsync(ct))
            .Select(x => new CountByLabel(x.Key.ToString(), x.Count)).ToList();

        var byType = (await tasks.GroupBy(t => t.Type)
            .Select(g => new { g.Key, Count = g.Count() }).ToListAsync(ct))
            .Select(x => new CountByLabel(x.Key.ToString(), x.Count)).ToList();

        var byProject = (await tasks.Where(t => t.Status != WorkTaskStatus.Done)
            .GroupBy(t => t.Project.Name).Select(g => new { g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count).Take(8).ToListAsync(ct))
            .Select(x => new CountByLabel(x.Key, x.Count)).ToList();

        var since = DateTime.UtcNow.Date.AddDays(-6);
        var completedRaw = await tasks
            .Where(t => t.CompletedAt != null && t.CompletedAt >= since)
            .Select(t => t.CompletedAt!.Value.Date)
            .ToListAsync(ct);
        var completedLast7 = Enumerable.Range(0, 7)
            .Select(i => since.AddDays(i))
            .Select(d => new CountByLabel(d.ToString("ddd"), completedRaw.Count(x => x == d)))
            .ToList();

        return new DashboardChartsDto(byStatus, byPriority, byType, byProject, completedLast7);
    }

    public async Task<IReadOnlyList<ActivityFeedItemDto>> GetRecentActivityAsync(int take, CancellationToken ct = default)
    {
        var items = await db.ActivityLogs
            .Include(a => a.Task)
            .Include(a => a.User)
            .AsNoTracking()
            .OrderByDescending(a => a.CreatedAt)
            .Take(Math.Clamp(take, 1, 100))
            .ToListAsync(ct);

        return items.Select(a => new ActivityFeedItemDto(
            a.Id, a.TaskId, a.Task.Title, a.Action, a.Field, a.OldValue, a.NewValue,
            a.UserId, a.User?.FullName, a.CreatedAt)).ToList();
    }
}
