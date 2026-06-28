namespace TaskFlow.Application.Features.Dashboard;

public record DashboardStatsDto(
    int TotalTasks,
    int OpenTasks,
    int InProgressTasks,
    int CompletedTasks,
    int UnassignedTasks,
    int MyOpenTasks,
    int ActiveProjects,
    double CompletionRate);

public record CountByLabel(string Label, int Count);

public record DashboardChartsDto(
    IReadOnlyList<CountByLabel> ByStatus,
    IReadOnlyList<CountByLabel> ByPriority,
    IReadOnlyList<CountByLabel> ByType,
    IReadOnlyList<CountByLabel> ByProject,
    IReadOnlyList<CountByLabel> CompletedLast7Days);

public record ActivityFeedItemDto(
    int Id,
    int TaskId,
    string TaskTitle,
    string Action,
    string? Field,
    string? OldValue,
    string? NewValue,
    int? UserId,
    string? UserName,
    DateTime CreatedAt);
