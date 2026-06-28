using TaskFlow.Application.Features.Dashboard;
using TaskFlow.Application.Features.Tasks;

namespace TaskFlow.Application.Features.Reports;

/// <summary>Headline numbers shared by every report.</summary>
public record ReportStats(
    int Total, int Open, int InProgress, int Completed,
    int Unassigned, double CompletionRate);

public record ReportBreakdown(
    IReadOnlyList<CountByLabel> ByStatus,
    IReadOnlyList<CountByLabel> ByPriority,
    IReadOnlyList<CountByLabel> ByType,
    IReadOnlyList<CountByLabel> ByAssignee);

/// <summary>Full, printable report for a single branch.</summary>
public record BranchReportDto(
    int BranchId, string BranchName, string BranchCode, string AreaName,
    DateTime GeneratedAt, ReportStats Stats, ReportBreakdown Breakdown,
    IReadOnlyList<TaskListItemDto> Tasks);

/// <summary>A branch summary line used inside an area report.</summary>
public record BranchSummaryDto(int BranchId, string BranchName, string BranchCode, ReportStats Stats);

/// <summary>Full, printable report for an area (one or more branches).</summary>
public record AreaReportDto(
    int AreaId, string AreaName, string AreaCode,
    DateTime GeneratedAt, ReportStats Stats, ReportBreakdown Breakdown,
    IReadOnlyList<BranchSummaryDto> Branches);

/// <summary>An area summary line used in the organization overview.</summary>
public record AreaSummaryDto(int AreaId, string AreaName, string AreaCode, int BranchCount, ReportStats Stats);

/// <summary>Organization-wide overview across all areas.</summary>
public record OverviewReportDto(
    DateTime GeneratedAt, ReportStats Stats, ReportBreakdown Breakdown,
    IReadOnlyList<AreaSummaryDto> Areas);

/// <summary>Report for an employee — their own submitted tickets, optionally filtered by date range.</summary>
public record EmployeeTicketReportDto(
    int UserId,
    string FullName,
    string? BranchName,
    DateTime GeneratedAt,
    DateTime? From,
    DateTime? To,
    ReportStats Stats,
    ReportBreakdown Breakdown,
    IReadOnlyList<TaskListItemDto> Tickets);

/// <summary>Stats for a single tag within the by-tag report.</summary>
public record TagReportRowDto(int TagId, string TagName, string TagColor, string? TagIcon, ReportStats Stats);

/// <summary>Organization-wide report showing task distribution by tag.</summary>
public record ByTagReportDto(DateTime GeneratedAt, IReadOnlyList<TagReportRowDto> Tags);

/// <summary>Stats for a single user within the by-user report.</summary>
public record UserReportRowDto(
    int UserId, string FullName, string? JobTitle, string? RoleName, ReportStats Stats,
    double? AvgResponseMinutes, double? FastestResponseMinutes, double? SlowestResponseMinutes);

/// <summary>Organization-wide report showing each user's assigned-task performance.</summary>
public record ByUserReportDto(DateTime GeneratedAt, IReadOnlyList<UserReportRowDto> Users);

/// <summary>Stats for a single category group within the by-group report.</summary>
public record GroupReportRowDto(
    int CategoryId, string CategoryName, string CategoryIcon, string CategoryColor,
    int TechnicianCount, ReportStats Stats);

/// <summary>Organization-wide report showing task distribution by ticket category/group.</summary>
public record ByGroupReportDto(DateTime GeneratedAt, IReadOnlyList<GroupReportRowDto> Groups);

/// <summary>Stats + user breakdown for a single department.</summary>
public record DepartmentReportRowDto(
    int DepartmentId, string DepartmentName, string? DepartmentCode,
    int UserCount, ReportStats Stats,
    IReadOnlyList<UserReportRowDto> Users);

/// <summary>Organization-wide report showing task distribution by department.</summary>
public record ByDepartmentReportDto(DateTime GeneratedAt, IReadOnlyList<DepartmentReportRowDto> Departments);

// ── NEW: Single-entity and analytical reports ──────────────────────────────

public record ActivityLogRowDto(
    int Id, string Action, string? Field, string? OldValue, string? NewValue,
    string? UserName, DateTime CreatedAt);

/// <summary>Full lifecycle report for one ticket/task.</summary>
public record SingleTaskReportDto(
    int TaskId, string Title, string? Description,
    string Status, string Priority, string Type,
    string? AssigneeName, string? ReporterName,
    string? ProjectName, string? BranchName,
    string? CategoryName, string? CategoryColor, string? CategoryIcon,
    DateTime CreatedAt, DateTime? StartDate, DateTime? ClaimedAt, DateTime? CompletedAt,
    double? MinutesToClaim, double? MinutesToResolve,
    int SubtaskCount, int CompletedSubtaskCount, int CommentCount, int AttachmentCount,
    string Tags,
    IReadOnlyList<TaskListItemDto> Subtasks,
    IReadOnlyList<ActivityLogRowDto> Activity);

/// <summary>Deep performance profile for one user.</summary>
public record SingleUserReportDto(
    int UserId, string FullName, string? JobTitle, string? RoleName, string? BranchName,
    DateTime GeneratedAt,
    ReportStats AssignedStats,
    ReportStats SubmittedStats,
    double? AvgResponseMinutes, double? FastestResponseMinutes, double? SlowestResponseMinutes,
    double? AvgResolutionHours,
    ReportBreakdown Breakdown,
    IReadOnlyList<CountByLabel> MonthlyTrend,
    IReadOnlyList<TaskListItemDto> RecentTasks);

/// <summary>All tickets with optional date filter.</summary>
public record AllTasksReportDto(
    DateTime GeneratedAt, DateTime? From, DateTime? To,
    ReportStats Stats,
    ReportBreakdown Breakdown,
    IReadOnlyList<CountByLabel> ByCategory,
    IReadOnlyList<CountByLabel> ByProject,
    IReadOnlyList<TaskListItemDto> Tasks);

/// <summary>One data point in a time-series trend.</summary>
public record TrendPoint(string Period, int Created, int Completed, int InProgress);

/// <summary>Ticket volume trends over the last 30 days and 12 months.</summary>
public record TrendReportDto(
    DateTime GeneratedAt,
    IReadOnlyList<TrendPoint> Last30Days,
    IReadOnlyList<TrendPoint> Last12Months);

/// <summary>A single row in the overdue/aging report.</summary>
public record OverdueTaskRow(
    int TaskId, string Title, string Status, string Priority, string Type,
    string? AssigneeName, string? CategoryName, string? BranchName,
    DateTime CreatedAt, int DaysOpen, bool IsUnassigned);

/// <summary>Open tickets bucketed by age — SLA health overview.</summary>
public record OverdueReportDto(
    DateTime GeneratedAt,
    int TotalOpen, int Over1Day, int Over3Days, int Over7Days, int Over14Days,
    IReadOnlyList<OverdueTaskRow> Tasks);
