using TaskFlow.Application.Features.Dashboard;
using TaskFlow.Application.Features.Tasks;

namespace TaskFlow.Application.Features.Reports;

/// <summary>Headline numbers shared by every report.</summary>
public record ReportStats(
    int Total, int Open, int InProgress, int Completed, int Overdue, int SlaBreaches,
    int Unassigned, double CompletionRate, double AvgProgress);

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
public record UserReportRowDto(int UserId, string FullName, string? JobTitle, string? RoleName, ReportStats Stats);

/// <summary>Organization-wide report showing each user's assigned-task performance.</summary>
public record ByUserReportDto(DateTime GeneratedAt, IReadOnlyList<UserReportRowDto> Users);
